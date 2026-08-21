import { useMemo, useState } from 'react';
import { PageHeader } from './ui';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Building2, CalendarClock, Check,
  CheckCircle2, ChevronRight, CircleDollarSign, Clock3, CreditCard, Download, Eye, FileText, Gauge,
  Headphones, History, Info, Landmark, LockKeyhole, Mail, MessageSquareText, MoreHorizontal,
  PackageCheck, ReceiptText, Search, ShieldCheck, Sparkles, Store, UsersRound, WalletCards, X, Zap
} from 'lucide-react';
import type { Invoice, PackageUpgradeRequest, SubscriptionPackage, Tenant } from '../types';
import BeautifulSelect from './BeautifulSelect';
import { formatMoney as money } from '../utils/money';
import {
  formatSubscriptionLimit, getTenantLockedSubscriptionPrice, getYearlyPackagePrice,
  normalizeSubscriptionPackage, SUBSCRIPTION_CAPABILITY_CATALOG
} from '../utils/subscriptions';
import {
  formatTenantQuota, getEnabledTenantCapabilities, getTenantUsagePercent,
  isTenantPackageUpgradeCandidate, isUnlimitedTenantLimit
} from '../utils/tenantAdminEntitlements';

type SubscriptionTab = 'overview' | 'plans' | 'usage' | 'billing' | 'history';

interface TenantAdminSubscriptionProps {
  tenantName: string;
  tenant?: Tenant;
  subscriptionPackage: SubscriptionPackage;
  availablePackages: SubscriptionPackage[];
  invoices: Invoice[];
  branchCount: number;
  staffCount: number;
  roleLabel: string;
  readOnlyReason?: string;
  onNotify: (message: string) => void;
  onUpdateTenant?: (id: string, updated: Partial<Tenant>) => void;
  pendingRequest?: PackageUpgradeRequest;
  onRequestUpgrade: (
    plan: SubscriptionPackage,
    billingCycle: 'monthly' | 'yearly',
    effectiveDate: 'immediate' | 'next_cycle'
  ) => void;
}

const tabs: Array<{ id: SubscriptionTab; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: 'Tổng quan', icon: Gauge },
  { id: 'plans', label: 'So sánh gói', icon: PackageCheck },
  { id: 'usage', label: 'Mức sử dụng', icon: BarChart3 },
  { id: 'billing', label: 'Thanh toán & hóa đơn', icon: WalletCards },
  { id: 'history', label: 'Lịch sử thay đổi', icon: History }
];

const date = (value?: string) => {
  if (!value) return 'Chưa thiết lập';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(parsed);
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadFile = (filename: string, content: string, type = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const invoiceMeta: Record<Invoice['status'], { label: string; tone: string }> = {
  PAID: { label: 'Đã thanh toán', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PENDING: { label: 'Chờ thanh toán', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  OVERDUE: { label: 'Quá hạn', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  CANCELLED: { label: 'Đã hủy', tone: 'bg-slate-100 text-slate-600 ring-slate-200' }
};

const capabilityGroups = [
  { title: 'Vận hành salon', keys: ['appointments', 'online_booking', 'customers', 'inventory'] },
  { title: 'Tăng trưởng & dữ liệu', keys: ['loyalty', 'automation', 'advanced_reports', 'api'] },
  { title: 'Quản trị doanh nghiệp', keys: ['custom_domain', 'sso', 'priority_support', 'account_manager'] }
];

export default function TenantAdminSubscription({
  tenantName, tenant, subscriptionPackage, availablePackages, invoices, branchCount, staffCount,
  roleLabel, readOnlyReason, onNotify, onUpdateTenant, pendingRequest, onRequestUpgrade
}: TenantAdminSubscriptionProps) {
  const [activeTab, setActiveTab] = useState<SubscriptionTab>('overview');
  const [billingView, setBillingView] = useState<'monthly' | 'yearly'>(tenant?.billingCycle || 'monthly');
  const [invoiceStatus, setInvoiceStatus] = useState<'ALL' | Invoice['status']>('ALL');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPackage | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<'immediate' | 'next_cycle'>('next_cycle');
  const [showPayment, setShowPayment] = useState(false);
  const [showBillingProfile, setShowBillingProfile] = useState(false);
  const [showInvoiceMenu, setShowInvoiceMenu] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [billingDraft, setBillingDraft] = useState({ company: '', taxCode: '', email: '', address: '' });
  const [billingError, setBillingError] = useState('');

  const current = normalizeSubscriptionPackage(subscriptionPackage);
  const plans = useMemo(() => {
    const normalized = availablePackages.map(normalizeSubscriptionPackage)
      .filter((plan) => (plan.status || 'ACTIVE') === 'ACTIVE' || plan.id === current.id);
    return normalized.some((plan) => plan.id === current.id) ? normalized : [current, ...normalized];
  }, [availablePackages, current.id]);
  const enabledCapabilities = getEnabledTenantCapabilities(current, plans);
  const lockedCount = SUBSCRIPTION_CAPABILITY_CATALOG.length - enabledCapabilities.size;
  const cycle = tenant?.billingCycle || current.billingCycle || 'monthly';
  const lockedPricing = tenant
    ? getTenantLockedSubscriptionPrice([current], tenant, cycle)
    : { price: cycle === 'yearly' ? getYearlyPackagePrice(current) : current.price, currency: current.currency || 'USD' };
  const upgrade = plans.filter((plan) => isTenantPackageUpgradeCandidate(current, plan)).sort((a, b) => a.price - b.price)[0];
  const renewalDate = tenant?.subscriptionRenewsAt || tenant?.trialEndDate;
  const canChangePlan = !readOnlyReason || tenant?.status === 'OVERDUE';
  const status = tenant?.status === 'SUSPENDED'
    ? { label: 'Tạm ngưng', tone: 'bg-rose-400/15 text-rose-200 ring-rose-300/20' }
    : tenant?.status === 'OVERDUE'
      ? { label: 'Quá hạn thanh toán', tone: 'bg-rose-400/15 text-rose-200 ring-rose-300/20' }
      : tenant?.status === 'EXPIRING'
        ? { label: 'Sắp hết hạn', tone: 'bg-amber-400/15 text-amber-200 ring-amber-300/20' }
        : tenant?.status === 'TRIAL'
          ? { label: 'Đang dùng thử', tone: 'bg-blue-400/15 text-blue-200 ring-blue-300/20' }
          : { label: 'Đang hoạt động', tone: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20' };

  const branchPercent = getTenantUsagePercent(branchCount, current.maxSalons, 'branches');
  const staffPercent = getTenantUsagePercent(staffCount, current.maxStaff, 'staff');
  const usage = [
    { label: 'Chi nhánh', value: formatTenantQuota(branchCount, current.maxSalons, 'branches'), used: branchCount, limit: current.maxSalons, percent: branchPercent, icon: Store, tone: 'violet', hint: isUnlimitedTenantLimit(current.maxSalons, 'branches') ? 'Không giới hạn' : `Còn ${Math.max(0, current.maxSalons - branchCount)} chi nhánh` },
    { label: 'Nhân sự', value: formatTenantQuota(staffCount, current.maxStaff, 'staff'), used: staffCount, limit: current.maxStaff, percent: staffPercent, icon: UsersRound, tone: 'blue', hint: isUnlimitedTenantLimit(current.maxStaff, 'staff') ? 'Không giới hạn' : `Còn ${Math.max(0, current.maxStaff - staffCount)} tài khoản` },
    { label: 'Lịch hẹn tháng này', value: `1.268 / ${formatSubscriptionLimit(current.limits?.appointmentsPerMonth)}`, used: 1268, limit: current.limits?.appointmentsPerMonth, percent: current.limits?.appointmentsPerMonth ? Math.min(100, Math.round(1268 / current.limits.appointmentsPerMonth * 100)) : 0, icon: CalendarClock, tone: 'emerald', hint: 'Làm mới vào ngày 01/08/2026' },
    { label: 'Tin nhắn tự động', value: `842 / ${formatSubscriptionLimit(current.limits?.messagesPerMonth)}`, used: 842, limit: current.limits?.messagesPerMonth, percent: current.limits?.messagesPerMonth ? Math.min(100, Math.round(842 / current.limits.messagesPerMonth * 100)) : 0, icon: MessageSquareText, tone: 'amber', hint: 'SMS, email và ZNS' },
    { label: 'Dung lượng dữ liệu', value: `18,4 / ${formatSubscriptionLimit(current.limits?.storageGb, 'GB')}`, used: 18.4, limit: current.limits?.storageGb, percent: current.limits?.storageGb ? Math.min(100, Math.round(18.4 / current.limits.storageGb * 100)) : 0, icon: Gauge, tone: 'cyan', hint: 'Ảnh mẫu, chứng từ và hồ sơ' }
  ];
  const tone: Record<string, { icon: string; bar: string }> = {
    violet: { icon: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500' }, blue: { icon: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' }, amber: { icon: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
    cyan: { icon: 'bg-cyan-50 text-cyan-600', bar: 'bg-cyan-500' }
  };
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = invoiceStatus === 'ALL' || invoice.status === invoiceStatus;
    const source = [invoice.id, invoice.invoiceCode, invoice.billingPeriod, invoice.transactionCode].join(' ').toLowerCase();
    return matchesStatus && source.includes(invoiceQuery.trim().toLowerCase());
  });
  const billingCurrency = invoices.find((invoice) => invoice.currency)?.currency || lockedPricing.currency;
  const invoicesInBillingCurrency = invoices.filter((invoice) => (invoice.currency || billingCurrency) === billingCurrency);
  const paidInvoices = invoicesInBillingCurrency.filter((invoice) => invoice.status === 'PAID');
  const payableInvoices = invoicesInBillingCurrency.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE');
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const payableTotal = payableInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueCount = invoices.filter((invoice) => invoice.status === 'OVERDUE').length;
  const nextPayableInvoice = [...payableInvoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const paymentSourceInvoice = invoices.find((invoice) => invoice.paymentMethod);
  const defaultPaymentMethod = paymentSourceInvoice?.paymentMethod || '';
  const billingProfileInvoice = invoices.find((invoice) => invoice.billingCompany || invoice.billingEmail || invoice.taxCode || invoice.billingAddress);
  const billingCompany = tenant?.billingCompany || billingProfileInvoice?.billingCompany || tenantName;
  const billingEmail = tenant?.billingEmail || billingProfileInvoice?.billingEmail || tenant?.contactEmail || tenant?.adminEmail || '';
  const billingTaxCode = tenant?.billingTaxCode || billingProfileInvoice?.taxCode || '';
  const billingAddress = tenant?.billingAddress || billingProfileInvoice?.billingAddress || tenant?.address || '';

  const openBillingProfile = () => {
    setBillingDraft({ company: billingCompany, taxCode: billingTaxCode, email: billingEmail, address: billingAddress });
    setBillingError('');
    setShowBillingProfile(true);
  };

  const saveBillingProfile = () => {
    const company = billingDraft.company.trim();
    const email = billingDraft.email.trim();
    const address = billingDraft.address.trim();
    if (!company || !email || !address) {
      setBillingError('Vui lòng nhập tên đơn vị, email và địa chỉ xuất hóa đơn.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setBillingError('Email nhận hóa đơn chưa đúng định dạng.');
      return;
    }
    if (!tenant || !onUpdateTenant) {
      setBillingError('Không thể cập nhật hồ sơ thanh toán ở chế độ hiện tại.');
      return;
    }
    onUpdateTenant(tenant.id, {
      billingCompany: company,
      billingTaxCode: billingDraft.taxCode.trim(),
      billingEmail: email,
      billingAddress: address
    });
    setShowBillingProfile(false);
    onNotify('Đã cập nhật thông tin xuất hóa đơn.');
  };

  const exportInvoices = () => {
    if (!filteredInvoices.length) {
      onNotify('Không có hóa đơn phù hợp để xuất.');
      return;
    }
    const header = ['Mã hóa đơn', 'Gói', 'Kỳ thanh toán', 'Ngày phát hành', 'Hạn thanh toán', 'Số tiền', 'Tiền tệ', 'Trạng thái', 'Mã giao dịch'];
    const rows = filteredInvoices.map((invoice) => [
      invoice.invoiceCode || invoice.id,
      invoice.planName || current.name,
      invoice.billingPeriod,
      invoice.createdAt,
      invoice.dueDate,
      invoice.amount,
      invoice.currency || billingCurrency,
      invoiceMeta[invoice.status].label,
      invoice.transactionCode || ''
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    downloadFile(`hoa-don-${tenantName}-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`);
    onNotify(`Đã xuất ${rows.length} hóa đơn theo bộ lọc hiện tại.`);
  };

  const exportPaymentReport = () => {
    const rows = invoices.map((invoice) => [
      invoice.invoiceCode || invoice.id,
      invoice.status,
      invoice.amount,
      invoice.currency || billingCurrency,
      invoice.paymentMethod || '',
      invoice.transactionCode || ''
    ]);
    const csv = [
      ['Mã hóa đơn', 'Trạng thái', 'Số tiền', 'Tiền tệ', 'Phương thức', 'Mã giao dịch'],
      ...rows
    ].map((row) => row.map(escapeCsv).join(',')).join('\n');
    downloadFile(`bao-cao-thanh-toan-${tenantName}.csv`, `\uFEFF${csv}`);
    onNotify('Đã tải báo cáo thanh toán.');
  };

  const exportAuditHistory = () => {
    const rows = [
      [tenant?.subscriptionStartedAt || tenant?.planStartDate || '', `Kích hoạt gói ${current.name}`, 'Super Admin'],
      [tenant?.pendingSubscriptionChange?.requestedAt || '', tenant?.pendingSubscriptionChange ? `Lên lịch chuyển sang ${tenant.pendingSubscriptionChange.packageName}` : '', roleLabel]
    ].filter((row) => row[1]);
    const csv = [['Thời gian', 'Sự kiện', 'Thực hiện bởi'], ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');
    downloadFile(`nhat-ky-goi-${tenantName}.csv`, `\uFEFF${csv}`);
    onNotify('Đã tải nhật ký đăng ký và thanh toán.');
  };

  const printInvoice = (invoice: Invoice) => {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=720');
    if (!popup) {
      onNotify('Trình duyệt đang chặn cửa sổ bản in. Vui lòng cho phép pop-up và thử lại.');
      return;
    }
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceCode || invoice.id)}</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:40px;line-height:1.5}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}td{border-bottom:1px solid #ddd;padding:10px 0}td:last-child{text-align:right;font-weight:700}.total{font-size:20px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">In hoặc lưu PDF</button><h1>Hóa đơn ${escapeHtml(invoice.invoiceCode || invoice.id)}</h1><p>${escapeHtml(invoice.tenantName)} · ${escapeHtml(invoice.planName || current.name)}</p><table><tr><td>Kỳ thanh toán</td><td>${escapeHtml(invoice.billingPeriod)}</td></tr><tr><td>Ngày phát hành</td><td>${escapeHtml(date(invoice.createdAt))}</td></tr><tr><td>Hạn thanh toán</td><td>${escapeHtml(date(invoice.dueDate))}</td></tr><tr><td>Trạng thái</td><td>${escapeHtml(invoiceMeta[invoice.status].label)}</td></tr><tr class="total"><td>Tổng tiền</td><td>${escapeHtml(money(invoice.amount, invoice.currency || billingCurrency))}</td></tr></table></body></html>`);
    popup.document.close();
    popup.focus();
  };

  const composeInvoiceEmail = (invoice: Invoice) => {
    const recipient = invoice.billingEmail || billingEmail;
    const subject = encodeURIComponent(`Hóa đơn ${invoice.invoiceCode || invoice.id} · ${tenantName}`);
    const body = encodeURIComponent(`Xin chào,\n\nVui lòng kiểm tra hóa đơn ${invoice.invoiceCode || invoice.id} với tổng giá trị ${money(invoice.amount, invoice.currency || billingCurrency)}.\n\nTrân trọng.`);
    window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`;
  };

  const contactSupport = () => {
    const subject = encodeURIComponent(`Hỗ trợ gói đăng ký · ${tenantName}`);
    window.location.href = `mailto:support@salonsys.com?subject=${subject}`;
  };

  const requestPlan = () => {
    if (!selectedPlan) return;
    if (pendingRequest) {
      onNotify(`Yêu cầu nâng cấp lên gói ${pendingRequest.requestedPackageName} đang chờ Super Admin duyệt.`);
      setSelectedPlan(null);
      return;
    }
    onRequestUpgrade(selectedPlan, billingView, effectiveDate);
    onNotify(`Đã gửi yêu cầu chuyển sang gói ${selectedPlan.name}. Super Admin sẽ xem tại Quản lý Tenant → Yêu cầu nâng cấp.`);
    setSelectedPlan(null);
  };

  return <div className="space-y-5">
    <PageHeader
        title="Gói đăng ký"
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={contactSupport} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm"><Headphones className="h-4 w-4" />Liên hệ hỗ trợ</button>
          {upgrade && <button type="button" disabled={!canChangePlan || Boolean(pendingRequest)} onClick={() => setSelectedPlan(upgrade)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-caption font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-50"><Zap className="h-4 w-4" />{pendingRequest ? 'Đang chờ duyệt' : `Nâng lên ${upgrade.name}`}</button>}
          </div>
        )}
      />
    {pendingRequest && <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CalendarClock className="h-5 w-5" /></span><div className="flex-1"><p className="text-caption font-black text-amber-900">Yêu cầu nâng cấp đang chờ Super Admin duyệt</p><p className="mt-1 text-caption leading-5 text-amber-700">{current.name} → {pendingRequest.requestedPackageName} · {pendingRequest.billingCycle === 'yearly' ? 'Hằng năm' : 'Hằng tháng'} · {pendingRequest.effectiveDate === 'immediate' ? 'Áp dụng ngay' : 'Chu kỳ tiếp theo'}</p></div><span className="rounded-full bg-white px-3 py-1.5 text-caption font-black text-amber-700 ring-1 ring-amber-200">Chờ duyệt</span></section>}

    <section className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <div className="flex-1"><p className="text-caption font-black text-blue-900">Quyền truy cập: {roleLabel}</p><p className="mt-1 text-caption leading-4 text-blue-700">Owner có thể xem hóa đơn, cập nhật hồ sơ thanh toán và gửi yêu cầu thay đổi gói. Thay đổi giá hoặc cấu hình hệ thống cần Super Admin phê duyệt.</p></div>
      <span className="hidden rounded-full bg-white px-3 py-1 text-caption font-black text-blue-700 ring-1 ring-blue-200 sm:inline-flex">TOÀN TENANT</span>
    </section>

    <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Điều hướng gói đăng ký">
      <div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-caption font-black transition ${activeTab === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
    </nav>

    {activeTab === 'overview' && <div className="space-y-5">
      <section className="grid overflow-hidden rounded-3xl bg-gradient-to-br from-[#151126] via-[#241742] to-[#43256e] text-white shadow-xl lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-300/15 px-3 py-1 text-caption font-black uppercase tracking-wide text-violet-100 ring-1 ring-violet-200/20">Gói hiện tại</span><span className={`rounded-full px-3 py-1 text-caption font-bold ring-1 ${status.tone}`}>{status.label}</span><span className="rounded-full bg-white/10 px-3 py-1 text-caption font-bold text-slate-300">{cycle === 'yearly' ? 'Thanh toán hằng năm' : 'Thanh toán hằng tháng'}</span></div>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-4xl font-black tracking-tight">{current.name}</p><p className="mt-3 max-w-xl text-caption leading-5 text-slate-300">{current.description}</p></div><div className="shrink-0 sm:text-right"><p className="text-2xl font-black">{money(lockedPricing.price, lockedPricing.currency)}<span className="text-caption font-semibold text-slate-400"> / {cycle === 'yearly' ? 'năm' : 'tháng'}</span></p><p className="mt-1 text-caption text-slate-400">Giá đã khóa · phiên bản gói {tenant?.subscriptionPackageVersion || current.version || 1}</p></div></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">{[
            ['Ngày bắt đầu', date(tenant?.subscriptionStartedAt || tenant?.planStartDate)],
            ['Gia hạn tiếp theo', date(renewalDate)],
            ['Quyền đang mở', `${enabledCapabilities.size} / ${SUBSCRIPTION_CAPABILITY_CATALOG.length} tính năng`]
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-caption font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-caption font-black">{value}</p></div>)}</div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.05] p-6 lg:border-l lg:border-t-0">
          <p className="text-caption font-black uppercase tracking-[0.15em] text-violet-200">Kỳ thanh toán kế tiếp</p><p className="mt-4 text-2xl font-black">{money(lockedPricing.price, lockedPricing.currency)}</p><p className="mt-1 text-caption text-slate-400">Dự kiến thu vào {date(renewalDate)}</p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><CreditCard className="h-5 w-5 text-violet-200" /></span><div><p className="text-caption font-black">{defaultPaymentMethod || 'Chưa thiết lập thanh toán'}</p><p className="mt-1 text-caption text-slate-400">{defaultPaymentMethod ? 'Phương thức thanh toán chính' : 'Cần thêm trước kỳ gia hạn'}</p></div></div></div>
          <button type="button" onClick={() => setShowPayment(true)} className="mt-4 flex h-10 w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 text-caption font-black text-white hover:bg-white/15">Quản lý thanh toán</button>
        </div>
      </section>

      {(tenant?.status === 'OVERDUE' || tenant?.status === 'EXPIRING') && <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /><div className="flex-1"><p className="text-caption font-black text-amber-900">{tenant.status === 'OVERDUE' ? 'Cần thanh toán để khôi phục toàn bộ chức năng' : 'Gói sắp đến ngày gia hạn'}</p><p className="mt-1 text-caption text-amber-700">Kiểm tra phương thức thanh toán và thông tin xuất hóa đơn trước ngày {date(renewalDate)}.</p></div><button type="button" onClick={() => setActiveTab('billing')} className="h-9 rounded-xl border border-amber-300 bg-white px-4 text-caption font-black text-amber-800">Xử lý ngay</button></section>}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Mức sử dụng nổi bật</h2><p className="mt-1 text-caption text-slate-500">Theo chu kỳ hiện tại của toàn tenant.</p></div><button type="button" onClick={() => setActiveTab('usage')} className="flex items-center gap-1 text-caption font-black text-violet-600">Xem chi tiết<ChevronRight className="h-3.5 w-3.5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{usage.slice(0, 4).map((item) => <div key={item.label} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="text-caption font-bold text-slate-500">{item.label}</p><span className="text-caption font-black text-slate-700">{item.percent ? `${item.percent}%` : '∞'}</span></div><p className="mt-2 text-sm font-black text-slate-900">{item.value}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${tone[item.tone].bar}`} style={{ width: `${item.percent || 12}%` }} /></div></div>)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Tình trạng quyền gói</h2><p className="mt-1 text-caption text-slate-500">Kiểm soát tự động theo feature flags.</p></div><BadgeCheck className="h-5 w-5 text-violet-600" /></div><div className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3"><span className="text-caption font-bold text-emerald-800">Đã kích hoạt</span><span className="text-sm font-black text-emerald-700">{enabledCapabilities.size}</span></div><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-caption font-bold text-slate-600">Chưa nằm trong gói</span><span className="text-sm font-black text-slate-700">{lockedCount}</span></div></div>{upgrade && <button type="button" onClick={() => setActiveTab('plans')} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-50 text-caption font-black text-violet-700">So sánh với {upgrade.name}<ArrowRight className="h-3.5 w-3.5" /></button>}</div>
      </section>
    </div>}

    {activeTab === 'plans' && <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Chọn gói phù hợp với quy mô vận hành</h2><p className="mt-1 text-caption text-slate-500">Giá hiển thị để tham khảo; yêu cầu thay đổi cần được xác nhận trước khi áp dụng.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{(['monthly', 'yearly'] as const).map((item) => <button key={item} type="button" onClick={() => setBillingView(item)} className={`h-9 rounded-lg px-4 text-caption font-black ${billingView === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item === 'monthly' ? 'Hằng tháng' : `Hằng năm · tiết kiệm ${current.yearlyDiscountPercent || 0}%`}</button>)}</div></div>
      <div className="grid gap-4 xl:grid-cols-3">{plans.map((plan) => {
        const isCurrent = plan.id === current.id || plan.name === current.name;
        const planCapabilities = getEnabledTenantCapabilities(plan, plans);
        const displayPrice = billingView === 'yearly' ? getYearlyPackagePrice(plan) : plan.price;
        return <article key={plan.id} className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm ${isCurrent ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
          {isCurrent && <div className="bg-violet-600 px-5 py-2 text-center text-caption font-black uppercase tracking-[0.15em] text-white">Gói đang sử dụng</div>}
          <div className="flex flex-1 flex-col p-6"><div className="flex items-start justify-between"><div><p className="text-xl font-black text-slate-900">{plan.name}</p><p className="mt-2 min-h-10 text-caption leading-5 text-slate-500">{plan.description}</p></div>{plan.isPopular && !isCurrent && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-caption font-black text-amber-700">PHỔ BIẾN</span>}</div>
          <p className="mt-5 text-2xl font-black text-slate-900">{money(displayPrice, plan.currency || 'USD')}<span className="text-caption font-semibold text-slate-400"> / {billingView === 'yearly' ? 'năm' : 'tháng'}</span></p>
          <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-caption font-bold text-slate-400">CHI NHÁNH</p><p className="mt-1 text-caption font-black text-slate-700">{isUnlimitedTenantLimit(plan.maxSalons, 'branches') ? 'Không giới hạn' : plan.maxSalons}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-caption font-bold text-slate-400">NHÂN SỰ</p><p className="mt-1 text-caption font-black text-slate-700">{isUnlimitedTenantLimit(plan.maxStaff, 'staff') ? 'Không giới hạn' : plan.maxStaff}</p></div></div>
          <div className="mt-5 flex-1 space-y-2.5">{SUBSCRIPTION_CAPABILITY_CATALOG.slice(0, 8).map((capability) => { const enabled = planCapabilities.has(capability.key); return <div key={capability.key} className="flex items-start gap-2"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>{enabled ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}</span><span className={`text-caption font-semibold ${enabled ? 'text-slate-600' : 'text-slate-400'}`}>{capability.label}</span></div>; })}</div>
          <button type="button" disabled={isCurrent || !canChangePlan} onClick={() => setSelectedPlan(plan)} className={`mt-6 h-11 rounded-xl text-caption font-black ${isCurrent ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-violet-600'} disabled:cursor-not-allowed`}>{isCurrent ? 'Đang sử dụng' : 'Yêu cầu chuyển gói'}</button></div>
        </article>;
      })}</div>
    </section>}

    {activeTab === 'usage' && <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{usage.map((item) => { const Icon = item.icon; const nearLimit = item.percent >= 80; return <article key={item.label} className={`rounded-2xl border bg-white p-5 shadow-sm ${nearLimit ? 'border-amber-300' : 'border-slate-200'}`}><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone[item.tone].icon}`}><Icon className="h-4 w-4" /></span><span className={`text-caption font-black ${nearLimit ? 'text-amber-600' : 'text-slate-500'}`}>{item.percent ? `${item.percent}%` : '∞'}</span></div><p className="mt-4 text-caption font-bold text-slate-500">{item.label}</p><p className="mt-1 text-sm font-black text-slate-900">{item.value}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${nearLimit ? 'bg-amber-500' : tone[item.tone].bar}`} style={{ width: `${item.percent || 10}%` }} /></div><p className="mt-2 text-caption leading-4 text-slate-400">{item.hint}</p></article>; })}</div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Chi tiết quyền chức năng</h2><p className="mt-1 text-caption text-slate-500">Quyền được áp dụng đồng nhất trên tất cả chi nhánh.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{capabilityGroups.map((group) => <div key={group.title} className="rounded-2xl bg-slate-50 p-4"><p className="text-caption font-black text-slate-800">{group.title}</p><div className="mt-3 space-y-2.5">{group.keys.map((key) => { const capability = SUBSCRIPTION_CAPABILITY_CATALOG.find((item) => item.key === key); const enabled = enabledCapabilities.has(key); return <div key={key} className="flex items-center gap-2"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{enabled ? <Check className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}</span><span className={`text-caption font-bold ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>{capability?.label || key}</span></div>; })}</div></div>)}</div></div>
      <aside className="rounded-2xl bg-slate-900 p-5 text-white"><Sparkles className="h-6 w-6 text-violet-300" /><h2 className="mt-4 text-base font-black">Gợi ý tối ưu chi phí</h2><p className="mt-2 text-caption leading-5 text-slate-300">Chuyển sang thanh toán hằng năm giúp tiết kiệm {current.yearlyDiscountPercent || 0}% và giữ nguyên toàn bộ quyền của gói {current.name}.</p><div className="mt-5 rounded-2xl bg-white/[0.07] p-4"><p className="text-caption text-slate-400">Ước tính tiết kiệm mỗi năm</p><p className="mt-1 text-xl font-black">{money(current.price * 12 - getYearlyPackagePrice(current), current.currency || 'USD')}</p></div><button type="button" onClick={() => { setBillingView('yearly'); setActiveTab('plans'); }} className="mt-4 h-10 w-full rounded-xl bg-white text-caption font-black text-slate-900">Xem giá hằng năm</button></aside></div>
    </section>}

    {activeTab === 'billing' && <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/60 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-caption font-black uppercase tracking-[0.16em] text-violet-600"><ShieldCheck className="h-4 w-4" />Trung tâm thanh toán bảo mật</div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Thanh toán & hóa đơn</h2>
            <p className="mt-1 text-caption leading-5 text-slate-500">Theo dõi công nợ, phương thức thanh toán và chứng từ của {tenantName} tại một nơi.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setShowBillingProfile(true)} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-caption font-black text-slate-600 shadow-sm"><Building2 className="h-4 w-4" />Hồ sơ xuất hóa đơn</button>
            <button type="button" onClick={() => setShowPayment(true)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-caption font-black text-white shadow-sm"><CreditCard className="h-4 w-4" />Quản lý thanh toán</button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1.25fr_0.75fr]">
          <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171328] via-[#261743] to-[#5b2b91] p-5 text-white shadow-lg sm:p-6">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-400/20 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><WalletCards className="h-5 w-5 text-violet-100" /></span>
                <span className={`rounded-full px-3 py-1 text-caption font-black ring-1 ${defaultPaymentMethod ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20' : 'bg-amber-400/15 text-amber-200 ring-amber-300/20'}`}>{defaultPaymentMethod ? 'ĐÃ THIẾT LẬP' : 'CẦN THIẾT LẬP'}</span>
              </div>
              <div>
                <p className="text-caption font-bold uppercase tracking-[0.12em] text-violet-200">Phương thức thanh toán chính</p>
                <p className="mt-2 text-lg font-black">{defaultPaymentMethod || 'Chưa có phương thức thanh toán'}</p>
                <p className="mt-2 text-caption leading-4 text-slate-300">{defaultPaymentMethod ? 'Được dùng cho gia hạn và các hóa đơn đăng ký tiếp theo.' : 'Thêm phương thức để tránh gián đoạn dịch vụ khi đến kỳ gia hạn.'}</p>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Kỳ thanh toán tiếp theo</p><p className="mt-1 text-caption font-black">{nextPayableInvoice ? `${money(nextPayableInvoice.amount, nextPayableInvoice.currency || billingCurrency)} · ${date(nextPayableInvoice.dueDate)}` : `Gia hạn ${date(renewalDate)}`}</p></div>
                <button type="button" onClick={() => setShowPayment(true)} className="flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-4 text-caption font-black text-slate-900">Cập nhật<ArrowUpRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <article className={`rounded-2xl border p-5 ${overdueCount ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${overdueCount ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}><Clock3 className="h-5 w-5" /></span><span className={`text-caption font-black ${overdueCount ? 'text-rose-600' : 'text-amber-700'}`}>{payableInvoices.length} HÓA ĐƠN</span></div>
              <p className="mt-4 text-caption font-bold text-slate-500">Cần thanh toán</p>
              <p className="mt-1 text-xl font-black text-slate-950">{money(payableTotal, billingCurrency)}</p>
              <p className={`mt-2 text-caption font-bold ${overdueCount ? 'text-rose-600' : 'text-amber-700'}`}>{overdueCount ? `${overdueCount} hóa đơn đã quá hạn` : payableInvoices.length ? 'Tất cả vẫn còn trong hạn' : 'Không có công nợ cần xử lý'}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span><span className="text-caption font-black text-emerald-700">{paidInvoices.length} THÀNH CÔNG</span></div>
              <p className="mt-4 text-caption font-bold text-slate-500">Tổng đã thanh toán</p>
              <p className="mt-1 text-xl font-black text-slate-950">{money(paidTotal, billingCurrency)}</p>
              <button type="button" onClick={exportPaymentReport} className="mt-2 flex items-center gap-1 text-caption font-black text-emerald-700">Xuất báo cáo<ChevronRight className="h-3 w-3" /></button>
            </article>
          </div>
        </div>

        <div className="mx-5 mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:mx-6 sm:mb-6 lg:flex-row lg:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Building2 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Thông tin xuất hóa đơn</p><p className="mt-1 truncate text-caption font-black text-slate-800">{billingCompany}</p><p className="mt-1 truncate text-caption text-slate-500">{billingEmail || 'Chưa cập nhật email'}{billingTaxCode ? ` · MST ${billingTaxCode}` : ' · Chưa cập nhật mã số thuế'}</p></div>
          <button type="button" onClick={openBillingProfile} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-caption font-black text-slate-600 shadow-sm">Chỉnh sửa hồ sơ</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-violet-600" /><h2 className="text-base font-black text-slate-900">Danh sách hóa đơn</h2></div><p className="mt-1 text-caption text-slate-500">Hiển thị {filteredInvoices.length} / {invoices.length} chứng từ thanh toán.</p></div>
            <div className="grid gap-2 sm:grid-cols-[minmax(210px,1fr)_180px_auto]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={invoiceQuery} onChange={(event) => setInvoiceQuery(event.target.value)} aria-label="Tìm hóa đơn" placeholder="Mã hóa đơn, giao dịch..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-caption outline-none focus:border-violet-400 focus:bg-white" /></div>
              <BeautifulSelect value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value as typeof invoiceStatus)} aria-label="Lọc trạng thái hóa đơn" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold text-slate-600"><option value="ALL">Tất cả trạng thái</option><option value="PAID">Đã thanh toán</option><option value="PENDING">Chờ thanh toán</option><option value="OVERDUE">Quá hạn</option><option value="CANCELLED">Đã hủy</option></BeautifulSelect>
              <button type="button" onClick={exportInvoices} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-caption font-black text-slate-600"><Download className="h-3.5 w-3.5" />Xuất file</button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{([
            ['ALL', 'Tất cả', invoices.length],
            ['PENDING', 'Chờ thanh toán', invoices.filter((invoice) => invoice.status === 'PENDING').length],
            ['OVERDUE', 'Quá hạn', overdueCount],
            ['PAID', 'Đã thanh toán', invoices.filter((invoice) => invoice.status === 'PAID').length]
          ] as Array<[typeof invoiceStatus, string, number]>).map(([value, label, count]) => <button key={value} type="button" onClick={() => setInvoiceStatus(value)} className={`shrink-0 rounded-full px-3 py-1.5 text-caption font-black transition ${invoiceStatus === value ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label} · {count}</button>)}</div>
        </div>

        {filteredInvoices.length ? <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left">
              <thead><tr className="bg-slate-50 text-caption font-black uppercase tracking-[0.08em] text-slate-400"><th className="px-5 py-3.5">Hóa đơn</th><th className="px-4 py-3.5">Chu kỳ</th><th className="px-4 py-3.5">Phát hành / đến hạn</th><th className="px-4 py-3.5">Phương thức</th><th className="px-4 py-3.5">Tổng tiền</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredInvoices.map((invoice) => <tr key={invoice.id} className="group text-caption text-slate-600 transition hover:bg-violet-50/30">
                <td className="px-5 py-4"><button type="button" onClick={() => setSelectedInvoice(invoice)} className="text-left"><p className="font-black text-slate-900 group-hover:text-violet-700">{invoice.invoiceCode || invoice.id}</p><p className="mt-1 text-caption text-slate-400">{invoice.planName || current.name} · {invoice.type === 'PLAN_CHANGE' ? 'Thay đổi gói' : invoice.type === 'MANUAL_ADJUSTMENT' ? 'Điều chỉnh' : 'Đăng ký'}</p></button></td>
                <td className="px-4 py-4"><p className="font-bold text-slate-700">{invoice.billingPeriod || invoice.servicePeriod || '—'}</p><p className="mt-1 text-caption text-slate-400">{invoice.billingCycle === 'yearly' ? 'Hằng năm' : invoice.billingCycle === 'monthly' ? 'Hằng tháng' : ''}</p></td>
                <td className="px-4 py-4"><p>{date(invoice.createdAt)}</p><p className={`mt-1 text-caption font-bold ${invoice.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-400'}`}>Hạn {date(invoice.dueDate)}</p></td>
                <td className="px-4 py-4"><p className="font-bold text-slate-700">{invoice.paymentMethod || 'Chưa thiết lập'}</p>{invoice.transactionCode && <p className="mt-1 max-w-28 truncate font-mono text-caption text-slate-400">{invoice.transactionCode}</p>}</td>
                <td className="px-4 py-4 font-black text-slate-900">{money(invoice.amount, invoice.currency || billingCurrency)}</td>
                <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${invoiceMeta[invoice.status].tone}`}>{invoiceMeta[invoice.status].label}</span></td>
                <td className="relative px-5 py-4 text-right"><button type="button" onClick={() => setShowInvoiceMenu(showInvoiceMenu === invoice.id ? null : invoice.id)} aria-label={`Thao tác hóa đơn ${invoice.invoiceCode || invoice.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"><MoreHorizontal className="h-4 w-4" /></button>{showInvoiceMenu === invoice.id && <div className="absolute right-5 top-12 z-10 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl"><button type="button" onClick={() => { setSelectedInvoice(invoice); setShowInvoiceMenu(null); }} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-caption font-bold text-slate-600 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" />Xem chi tiết</button><button type="button" onClick={() => { printInvoice(invoice); setShowInvoiceMenu(null); }} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-caption font-bold text-slate-600 hover:bg-slate-50"><Download className="h-3.5 w-3.5" />In / lưu PDF</button><button type="button" onClick={() => { composeInvoiceEmail(invoice); setShowInvoiceMenu(null); }} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-caption font-bold text-slate-600 hover:bg-slate-50"><Mail className="h-3.5 w-3.5" />Soạn email</button></div>}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">{filteredInvoices.map((invoice) => <button key={invoice.id} type="button" onClick={() => setSelectedInvoice(invoice)} className="block w-full p-5 text-left hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-caption font-black text-slate-900">{invoice.invoiceCode || invoice.id}</p><p className="mt-1 truncate text-caption text-slate-400">{invoice.planName || current.name} · {invoice.billingPeriod}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${invoiceMeta[invoice.status].tone}`}>{invoiceMeta[invoice.status].label}</span></div><div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-caption uppercase tracking-wide text-slate-400">Đến hạn</p><p className={`mt-1 text-caption font-bold ${invoice.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-600'}`}>{date(invoice.dueDate)}</p></div><p className="text-sm font-black text-slate-900">{money(invoice.amount, invoice.currency || billingCurrency)}</p></div></button>)}</div>
        </> : <div className="py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100"><ReceiptText className="h-6 w-6 text-slate-400" /></span><p className="mt-4 text-caption font-black text-slate-700">Không tìm thấy hóa đơn phù hợp</p><p className="mt-1 text-caption text-slate-400">Thử thay đổi từ khóa hoặc trạng thái.</p>{(invoiceQuery || invoiceStatus !== 'ALL') && <button type="button" onClick={() => { setInvoiceQuery(''); setInvoiceStatus('ALL'); }} className="mt-4 rounded-xl bg-violet-50 px-4 py-2 text-caption font-black text-violet-700">Xóa bộ lọc</button>}</div>}
      </div>
    </section>}

    {activeTab === 'history' && <section className="grid gap-5 xl:grid-cols-[1fr_0.55fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Lịch sử đăng ký</h2><p className="mt-1 text-caption text-slate-500">Nhật ký chỉ đọc, hiển thị các thay đổi ảnh hưởng đến tenant.</p><div className="mt-6 space-y-0">{[
      { date: '15/07/2026 · 09:20', title: `Gia hạn gói ${current.name}`, detail: `Chu kỳ ${cycle === 'yearly' ? 'hằng năm' : 'hằng tháng'} được gia hạn thành công`, actor: 'Hệ thống thanh toán', icon: BadgeCheck, tone: 'bg-emerald-100 text-emerald-600' },
      { date: '01/07/2026 · 08:00', title: 'Làm mới hạn mức sử dụng', detail: 'Lịch hẹn, tin nhắn và API đã được đặt lại theo chu kỳ', actor: 'Subscription service', icon: Gauge, tone: 'bg-blue-100 text-blue-600' },
      { date: '15/06/2026 · 14:32', title: 'Cập nhật phương thức thanh toán', detail: 'Visa •••• 4242 được đặt làm phương thức mặc định', actor: roleLabel, icon: CreditCard, tone: 'bg-violet-100 text-violet-600' },
      { date: date(tenant?.subscriptionStartedAt || tenant?.planStartDate), title: `Kích hoạt gói ${current.name}`, detail: `Áp dụng phiên bản gói ${tenant?.subscriptionPackageVersion || current.version || 1} và giá khóa cho tenant`, actor: 'Super Admin', icon: PackageCheck, tone: 'bg-slate-100 text-slate-600' }
    ].map((item, index, all) => { const Icon = item.icon; return <div key={item.title} className="flex gap-4"><div className="flex flex-col items-center"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon className="h-4 w-4" /></span>{index < all.length - 1 && <span className="h-16 w-px bg-slate-200" />}</div><div className="pb-6"><p className="text-caption font-bold text-slate-400">{item.date}</p><p className="mt-1 text-caption font-black text-slate-800">{item.title}</p><p className="mt-1 text-caption leading-4 text-slate-500">{item.detail}</p><p className="mt-2 text-caption font-bold text-violet-600">Bởi {item.actor}</p></div></div>; })}</div></div>
    <aside className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h3 className="mt-4 text-sm font-black text-slate-900">Kiểm soát thay đổi</h3><ul className="mt-4 space-y-3 text-caption leading-4 text-slate-500"><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />Owner gửi yêu cầu thay đổi gói hoặc chu kỳ.</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />Super Admin xác nhận giá, thời điểm và quyền mới.</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />Mọi thay đổi đều được ghi lại trong nhật ký.</li></ul></div><button type="button" onClick={exportAuditHistory} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-caption font-black text-slate-600 shadow-sm"><FileText className="h-4 w-4" />Xuất nhật ký kiểm toán</button></aside></section>}

    {selectedInvoice && <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Chi tiết hóa đơn ${selectedInvoice.invoiceCode || selectedInvoice.id}`}>
      <button type="button" aria-label="Đóng chi tiết hóa đơn" onClick={() => setSelectedInvoice(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
      <section className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-caption font-black uppercase tracking-[0.14em] text-violet-600">Chi tiết hóa đơn</p><h2 className="mt-2 text-xl font-black text-slate-950">{selectedInvoice.invoiceCode || selectedInvoice.id}</h2><p className="mt-1 text-caption text-slate-500">{selectedInvoice.planName || current.name} · {selectedInvoice.billingPeriod}</p></div>
            <button type="button" onClick={() => setSelectedInvoice(null)} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl bg-slate-950 p-5 text-white">
            <div><p className="text-caption text-slate-400">Tổng thanh toán</p><p className="mt-1 text-2xl font-black">{money(selectedInvoice.amount, selectedInvoice.currency || billingCurrency)}</p></div>
            <span className={`rounded-full px-3 py-1.5 text-caption font-black ring-1 ${invoiceMeta[selectedInvoice.status].tone}`}>{invoiceMeta[selectedInvoice.status].label}</span>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">{[
            ['Ngày phát hành', date(selectedInvoice.createdAt)],
            ['Hạn thanh toán', date(selectedInvoice.dueDate)],
            ['Chu kỳ', selectedInvoice.billingCycle === 'yearly' ? 'Hằng năm' : selectedInvoice.billingCycle === 'monthly' ? 'Hằng tháng' : selectedInvoice.billingPeriod],
            ['Phương thức', selectedInvoice.paymentMethod || 'Chưa thiết lập']
          ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-caption font-black text-slate-800">{value}</p></div>)}</div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /><h3 className="text-caption font-black text-slate-800">Thông tin nhận hóa đơn</h3></div>
            <div className="mt-4 space-y-2 text-caption text-slate-500"><p><strong className="text-slate-700">{selectedInvoice.billingCompany || billingCompany}</strong></p><p>{selectedInvoice.billingEmail || billingEmail || 'Chưa cập nhật email nhận hóa đơn'}</p><p>{selectedInvoice.taxCode ? `MST ${selectedInvoice.taxCode}` : billingTaxCode ? `MST ${billingTaxCode}` : 'Chưa cập nhật mã số thuế'}</p><p>{selectedInvoice.billingAddress || billingAddress || 'Chưa cập nhật địa chỉ xuất hóa đơn'}</p></div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-caption font-black text-slate-800">Chi tiết khoản phí</h3>
            <div className="mt-4 space-y-3">{selectedInvoice.lineItems?.length ? selectedInvoice.lineItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div><p className="text-caption font-bold text-slate-700">{item.description}</p><p className="mt-1 text-caption text-slate-400">{item.quantity} × {money(item.unitPrice, selectedInvoice.currency || billingCurrency)}</p></div><p className="text-caption font-black text-slate-800">{money(item.amount, selectedInvoice.currency || billingCurrency)}</p></div>) : <div className="flex items-center justify-between"><div><p className="text-caption font-bold text-slate-700">{selectedInvoice.planName || current.name}</p><p className="mt-1 text-caption text-slate-400">{selectedInvoice.servicePeriod || selectedInvoice.billingPeriod}</p></div><p className="text-caption font-black text-slate-800">{money(selectedInvoice.amount, selectedInvoice.currency || billingCurrency)}</p></div>}</div>
          </div>

          {(selectedInvoice.transactionCode || selectedInvoice.paymentGateway) && <div className="rounded-2xl bg-emerald-50 p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="text-caption font-black text-emerald-800">Thông tin giao dịch</p></div><p className="mt-2 text-caption text-emerald-700">{selectedInvoice.paymentGateway || selectedInvoice.paymentMethod}{selectedInvoice.transactionCode ? ` · ${selectedInvoice.transactionCode}` : ''}{selectedInvoice.paidAt ? ` · ${date(selectedInvoice.paidAt)}` : ''}</p></div>}
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={() => composeInvoiceEmail(selectedInvoice)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-caption font-black text-slate-600"><Mail className="h-4 w-4" />Soạn email</button>
          <button type="button" onClick={() => printInvoice(selectedInvoice)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-caption font-black text-white"><Download className="h-4 w-4" />In / lưu PDF</button>
        </div>
      </section>
    </div>}

    {selectedPlan && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Xác nhận thay đổi gói"><section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="bg-gradient-to-br from-[#171328] to-[#43256e] p-6 text-white"><div className="flex items-start justify-between"><div><p className="text-caption font-black uppercase tracking-[0.15em] text-violet-200">Yêu cầu thay đổi gói</p><h2 className="mt-2 text-xl font-black">{current.name} <ArrowRight className="mx-2 inline h-4 w-4" /> {selectedPlan.name}</h2></div><button type="button" onClick={() => setSelectedPlan(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><X className="h-4 w-4" /></button></div></div><div className="space-y-4 p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-caption text-slate-400">Giá dự kiến</p><p className="mt-1 text-sm font-black text-slate-900">{money(billingView === 'yearly' ? getYearlyPackagePrice(selectedPlan) : selectedPlan.price, selectedPlan.currency || 'USD')}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-caption text-slate-400">Chu kỳ</p><p className="mt-1 text-sm font-black text-slate-900">{billingView === 'yearly' ? 'Hằng năm' : 'Hằng tháng'}</p></div></div><fieldset><legend className="text-caption font-black text-slate-700">Thời điểm áp dụng</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{(['next_cycle', 'immediate'] as const).map((value) => <label key={value} className={`cursor-pointer rounded-2xl border p-4 ${effectiveDate === value ? 'border-violet-400 bg-violet-50' : 'border-slate-200'}`}><input type="radio" className="sr-only" checked={effectiveDate === value} onChange={() => setEffectiveDate(value)} /><p className="text-caption font-black text-slate-800">{value === 'next_cycle' ? 'Chu kỳ tiếp theo' : 'Áp dụng ngay'}</p><p className="mt-1 text-caption leading-4 text-slate-500">{value === 'next_cycle' ? `Từ ${date(renewalDate)}` : 'Có thể phát sinh tiền chênh lệch'}</p></label>)}</div></fieldset><div className="flex gap-2 rounded-xl bg-blue-50 p-3 text-caption leading-4 text-blue-700"><Info className="h-4 w-4 shrink-0" />Đây là yêu cầu phê duyệt. Super Admin sẽ xác nhận giá cuối cùng trước khi gói được thay đổi.</div></div><div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedPlan(null)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600">Hủy</button><button type="button" onClick={requestPlan} className="h-11 rounded-xl bg-violet-600 px-5 text-caption font-black text-white">Gửi yêu cầu thay đổi</button></div></section></div>}

    {showPayment && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Phương thức thanh toán">
        <section className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-6">
            <div><p className="text-caption font-black uppercase tracking-[0.14em] text-violet-600">Thanh toán bảo mật</p><h2 className="mt-2 text-lg font-black text-slate-900">Phương thức thanh toán</h2><p className="mt-1 text-caption text-slate-500">Xem phương thức dùng cho gia hạn tự động.</p></div>
            <button type="button" onClick={() => setShowPayment(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-6">
            {defaultPaymentMethod ? <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-violet-900 p-5 text-white"><div className="flex items-center justify-between"><Landmark className="h-5 w-5 text-violet-200" /><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-caption font-black text-emerald-200">MẶC ĐỊNH</span></div><p className="mt-8 text-base font-black">{defaultPaymentMethod}</p><div className="mt-5 flex justify-between text-caption text-slate-300"><span>{tenantName}</span><span>Thanh toán tự động</span></div></div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><CreditCard className="h-6 w-6" /></span><p className="mt-4 text-caption font-black text-slate-700">Chưa có phương thức thanh toán</p><p className="mt-1 text-caption leading-4 text-slate-400">Phương thức thanh toán cần được cấu hình qua cổng thanh toán của hệ thống.</p></div>}
            <label className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 p-4"><span><span className="block text-caption font-black text-slate-800">Thanh toán tự động</span><span className="mt-1 block text-caption text-slate-400">Tự động gia hạn khi đến chu kỳ</span></span><input type="checkbox" checked={Boolean(defaultPaymentMethod)} readOnly disabled className="h-4 w-4 accent-violet-600 disabled:opacity-40" /></label>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-caption font-bold leading-4 text-amber-700">Liên hệ quản trị hệ thống để thêm hoặc thay đổi phương thức thanh toán.</p>
            <button type="button" onClick={() => setShowPayment(false)} className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-caption font-black text-white">Đóng</button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-caption text-slate-400"><ShieldCheck className="h-3 w-3" />SalonSys không lưu trực tiếp thông tin thẻ thanh toán.</p>
          </div>
        </section>
      </div>
    )}

    {showBillingProfile && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Thông tin xuất hóa đơn">
        <section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-6">
            <div><p className="text-caption font-black uppercase tracking-[0.14em] text-blue-600">Hồ sơ thanh toán</p><h2 className="mt-2 text-lg font-black text-slate-900">Thông tin xuất hóa đơn</h2><p className="mt-1 text-caption text-slate-500">Thông tin này sẽ áp dụng cho các hóa đơn tiếp theo.</p></div>
            <button type="button" onClick={() => setShowBillingProfile(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="text-caption font-black text-slate-600">Tên doanh nghiệp / hộ kinh doanh</span><input value={billingDraft.company} onChange={(event) => setBillingDraft((currentDraft) => ({ ...currentDraft, company: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-caption outline-none focus:border-violet-400 focus:bg-white" /></label>
            <label><span className="text-caption font-black text-slate-600">Mã số thuế</span><input value={billingDraft.taxCode} onChange={(event) => setBillingDraft((currentDraft) => ({ ...currentDraft, taxCode: event.target.value }))} placeholder="Nhập mã số thuế" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-caption outline-none focus:border-violet-400 focus:bg-white" /></label>
            <label><span className="text-caption font-black text-slate-600">Email nhận hóa đơn</span><input type="email" value={billingDraft.email} onChange={(event) => setBillingDraft((currentDraft) => ({ ...currentDraft, email: event.target.value }))} placeholder="billing@doanhnghiep.vn" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-caption outline-none focus:border-violet-400 focus:bg-white" /></label>
            <label className="sm:col-span-2"><span className="text-caption font-black text-slate-600">Địa chỉ xuất hóa đơn</span><input value={billingDraft.address} onChange={(event) => setBillingDraft((currentDraft) => ({ ...currentDraft, address: event.target.value }))} placeholder="Nhập địa chỉ đầy đủ" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-caption outline-none focus:border-violet-400 focus:bg-white" /></label>
            {billingError && <p className="rounded-xl bg-rose-50 p-3 text-caption font-bold text-rose-700 sm:col-span-2">{billingError}</p>}
            <div className="flex gap-2 rounded-xl bg-blue-50 p-3 text-caption leading-4 text-blue-700 sm:col-span-2"><Info className="h-4 w-4 shrink-0" />Hóa đơn đã phát hành sẽ giữ nguyên thông tin tại thời điểm phát hành.</div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowBillingProfile(false)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600">Hủy</button>
            <button type="button" onClick={saveBillingProfile} className="h-11 rounded-xl bg-violet-600 px-5 text-caption font-black text-white">Lưu thông tin</button>
          </div>
        </section>
      </div>
    )}
  </div>;
}
