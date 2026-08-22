import { FormEvent, Fragment, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Activity,
  Armchair,
  ArrowRight,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck2,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Database,
  Download,
  LockKeyhole,
  Gift,
  Globe2,
  Headphones,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MapPin,
  Mail,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Moon,
  Sparkles,
  Star,
  Store,
  Sun,
  Target,
  TrendingUp,
  Trash2,
  UserRound,
  UserCheck,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import type { Branch, Invoice, PackageUpgradeRequest, SubscriptionPackage, SystemAnnouncement, Tenant, Ticket } from '../types';
import { BRANCH_MODEL_OPTIONS, generateBranchCode, getBranchModelLabel, getBranchStatusLabel, normalizeBranch, normalizeTenantBranches, validateBranchDraft } from '../utils/branches';
import {
  formatSubscriptionLimit,
  getTenantLockedSubscriptionPrice,
  getYearlyPackagePrice,
  normalizeSubscriptionPackage,
  SUBSCRIPTION_CAPABILITY_CATALOG
} from '../utils/subscriptions';
import {
  findTenantUpgradePackage, formatTenantQuota, getEnabledTenantCapabilities, getTenantCapabilityLabel,
  getTenantPageAccess, getTenantPageCapabilityKey, getTenantUsagePercent,
  isTenantPackageUpgradeCandidate, isUnlimitedTenantLimit, type TenantPageAccess
} from '../utils/tenantAdminEntitlements';
import { setTenantAdminDataMode } from '../utils/mockDataReset';
import {
  dismissBannerForTenant,
  filterAnnouncementsForTenant,
  getAnnouncementsForTenant,
  isAnnouncementReadByTenant,
  isBannerDismissedByTenant,
  loadSystemAnnouncements,
  markAllAnnouncementsRead,
  markAnnouncementRead
} from '../utils/systemAnnouncements';
import type { DemoAccount } from '../auth/demoAccounts';
import BeautifulSelect from './BeautifulSelect';
import { formatCompactMoney, formatMoney as formatPlanMoney } from '../utils/money';
import BranchCallDialog from './BranchCallDialog';
import TenantAdminOverview from './TenantAdminOverview';
import { nailModuleConfigs, type BrandInfo, type NailFormField, type NailModuleConfig, type NailPageId, type NailRow, type PaymentSettings, type UiTone } from './nailAdminData';
import { Button, PageHeader } from './ui';
import type { InterfaceLanguage } from './AccountPreferences';
import { useT } from '../i18n';

const TenantAdminAppointments = lazy(() => import('./TenantAdminAppointments'));
const TenantAdminStations = lazy(() => import('./TenantAdminStations'));
const TenantAdminPayments = lazy(() => import('./TenantAdminPayments'));
const TenantAdminCustomers = lazy(() => import('./TenantAdminCustomers'));
const TenantAdminLoyalty = lazy(() => import('./TenantAdminLoyalty'));
const TenantAdminStaff = lazy(() => import('./TenantAdminStaff'));
const TenantAdminServices = lazy(() => import('./TenantAdminServices'));
const TenantAdminInventory = lazy(() => import('./TenantAdminInventory'));
const TenantAdminNailGallery = lazy(() => import('./TenantAdminNailGallery'));
const TenantAdminOnlineBooking = lazy(() => import('./TenantAdminOnlineBooking'));
const TenantAdminFinance = lazy(() => import('./TenantAdminFinanceCompact'));
const TenantAdminSanitation = lazy(() => import('./TenantAdminSanitation'));
const TenantAdminReports = lazy(() => import('./TenantAdminReports'));
const TenantAdminSubscription = lazy(() => import('./TenantAdminSubscription'));
const TenantAdminAnnouncements = lazy(() => import('./TenantAdminAnnouncements'));
const TenantAdminHelpAndSupport = lazy(() => import('./TenantAdminHelpAndSupport'));
const TenantAdminSettings = lazy(() => import('./TenantAdminSettings'));

interface NailTenantAdminPortalProps {
  account: DemoAccount;
  onLogout: () => void;
  onUpdateTenant?: (id: string, updated: Partial<Tenant>) => void;
  tenant?: Tenant;
  subscriptionPackage?: SubscriptionPackage;
  availablePackages: SubscriptionPackage[];
  invoices: Invoice[];
  upgradeRequests: PackageUpgradeRequest[];
  onRequestUpgrade: (
    plan: SubscriptionPackage,
    billingCycle: 'monthly' | 'yearly',
    effectiveDate: 'immediate' | 'next_cycle'
  ) => void;
  onCancelUpgradeRequest?: (requestId: string) => void;
  onSubmitInvoicePaymentProof?: (
    invoiceId: string,
    proof: { transactionCode?: string; paymentProofNote?: string; paymentProofUrl?: string }
  ) => void;
  /* Tuỳ chọn giao diện do App.tsx sở hữu (đã gắn vào <html data-theme>/<html lang>
     và lưu localStorage). Portal chỉ hiển thị và gọi ngược lên, không tự lưu —
     nếu không, đổi ở đây và đổi ở màn Superadmin sẽ lệch nhau. */
  themeMode?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  interfaceLanguage?: InterfaceLanguage;
  onLanguageChange?: (language: InterfaceLanguage) => void;
  tickets?: Ticket[];
  onTicketsChange?: (tickets: Ticket[]) => void;
  announcements?: SystemAnnouncement[];
  onUpdateAnnouncements?: (announcements: SystemAnnouncement[] | ((prev: SystemAnnouncement[]) => SystemAnnouncement[])) => void;
}

interface NavItem {
  id: NailPageId;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

/* Nhãn tiếng Việt ở đây CHÍNH LÀ khoá từ điển (xem `src/i18n/translations.ts`):
   render thì bọc qua `t(...)`, còn những chỗ đọc navGroups ngoài React vẫn dùng
   được nhãn gốc mà không cần bảng ánh xạ thứ hai. */
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Vận hành',
    items: [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'branches', label: 'Chi nhánh', icon: Store },
      { id: 'appointments', label: 'Lịch hẹn', icon: CalendarDays, badge: '32' },
      { id: 'stations', label: 'Ghế & khu vực', icon: Armchair, badge: '7/14' },
      { id: 'pos', label: 'POS & thanh toán', icon: CreditCard, badge: '5' }
    ]
  },
  {
    label: 'Khách hàng',
    items: [
      { id: 'customers', label: 'Hồ sơ khách hàng', icon: UsersRound },
      { id: 'loyalty', label: 'Thành viên & ưu đãi', icon: Gift }
    ]
  },
  {
    label: 'Danh mục',
    items: [
      { id: 'staff', label: 'Nhân sự', icon: UserRound },
      { id: 'services', label: 'Dịch vụ & giá', icon: Sparkles },
      { id: 'inventory', label: 'Kho vật tư', icon: Boxes, badge: '18' },
      { id: 'gallery', label: 'Màu & mẫu Nail', icon: Image }
    ]
  },
  {
    label: 'Quản trị',
    items: [
      { id: 'announcements', label: 'Bản tin hệ thống', icon: Megaphone },
      { id: 'online', label: 'Đặt lịch online', icon: Globe2 },
      { id: 'finance', label: 'Thu & Chi', icon: WalletCards },
      { id: 'sanitation', label: 'Vệ sinh & an toàn', icon: ShieldCheck, badge: '4' },
      { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
      { id: 'subscription', label: 'Gói đăng ký', icon: BadgePercent },
      { id: 'support', label: 'Trung tâm trợ giúp', icon: Headphones },
      { id: 'settings', label: 'Cài đặt tiệm', icon: Settings }
    ]
  }
];
const FALLBACK_SUBSCRIPTION_PACKAGE = normalizeSubscriptionPackage({
  id: 'PKG-DEMO-PREMIUM',
  name: 'Premium',
  description: 'Gói vận hành chuyên nghiệp cho salon nhiều chi nhánh.',
  price: 99,
  currency: 'USD',
  billingCycle: 'monthly',
  activeTenants: 1,
  features: [],
  maxStaff: 999,
  maxSalons: 3,
  color: '#7c3aed'
});

const createDemoInvoices = (tenantName: string, tenantId: string): Invoice[] => [
  {
    id: 'DEMO-INV-PAID-001',
    invoiceCode: 'DEMO-INV-2026-071',
    tenantId,
    tenantName,
    type: 'MONTHLY_SUBSCRIPTION',
    planName: 'Premium',
    billingCycle: 'monthly',
    servicePeriod: '01/07/2026 - 31/07/2026',
    dueDate: '2026-07-05',
    amount: 3000000,
    currency: 'VND',
    status: 'PAID',
    paymentMethod: 'Thẻ doanh nghiệp •••• 4242',
    transactionCode: 'DEMO-TXN-PAID-071',
    createdAt: '2026-07-01T08:00:00+07:00',
    paidAt: '2026-07-02T10:15:00+07:00',
    billingPeriod: 'Tháng 7/2026',
    billingEmail: 'billing.demo@salonsys.vn',
    billingCompany: tenantName,
    billingAddress: '123 Nguyễn Huệ, Phường Sài Gòn, TP.HCM',
    taxCode: 'DEMO-0312345678',
    lineItems: [{ id: 'DEMO-LINE-001', description: 'Gói Premium · Tháng 7/2026', quantity: 1, unitPrice: 3000000, amount: 3000000, taxRate: 0 }]
  },
  {
    id: 'DEMO-INV-PENDING-001',
    invoiceCode: 'DEMO-INV-2026-081',
    tenantId,
    tenantName,
    type: 'MONTHLY_SUBSCRIPTION',
    planName: 'Premium',
    billingCycle: 'monthly',
    servicePeriod: '01/08/2026 - 31/08/2026',
    dueDate: '2026-08-05',
    amount: 3000000,
    currency: 'VND',
    status: 'PENDING',
    paymentMethod: 'Thẻ doanh nghiệp •••• 4242',
    createdAt: '2026-07-28T08:00:00+07:00',
    billingPeriod: 'Tháng 8/2026',
    billingEmail: 'billing.demo@salonsys.vn',
    billingCompany: tenantName,
    billingAddress: '123 Nguyễn Huệ, Phường Sài Gòn, TP.HCM',
    taxCode: 'DEMO-0312345678',
    lineItems: [{ id: 'DEMO-LINE-002', description: 'Gói Premium · Tháng 8/2026', quantity: 1, unitPrice: 3000000, amount: 3000000, taxRate: 0 }]
  },
  {
    id: 'DEMO-INV-OVERDUE-001',
    invoiceCode: 'DEMO-INV-2026-062',
    tenantId,
    tenantName,
    type: 'MANUAL_ADJUSTMENT',
    planName: 'Phí bổ sung',
    dueDate: '2026-06-25',
    amount: 650000,
    currency: 'VND',
    status: 'OVERDUE',
    paymentMethod: 'Chuyển khoản ngân hàng',
    createdAt: '2026-06-18T09:30:00+07:00',
    billingPeriod: 'Điều chỉnh tháng 6/2026',
    billingEmail: 'billing.demo@salonsys.vn',
    billingCompany: tenantName,
    taxCode: 'DEMO-0312345678',
    lineItems: [{ id: 'DEMO-LINE-003', description: 'Bổ sung 5.000 tin nhắn chăm sóc khách hàng', quantity: 1, unitPrice: 650000, amount: 650000, taxRate: 0 }]
  },
  {
    id: 'DEMO-INV-CANCELLED-001',
    invoiceCode: 'DEMO-INV-2026-051',
    tenantId,
    tenantName,
    type: 'PLAN_CHANGE',
    planName: 'Enterprise',
    dueDate: '2026-05-20',
    amount: 5000000,
    currency: 'VND',
    status: 'CANCELLED',
    createdAt: '2026-05-15T14:00:00+07:00',
    billingPeriod: 'Yêu cầu đổi gói tháng 5/2026',
    billingEmail: 'billing.demo@salonsys.vn',
    billingCompany: tenantName,
    taxCode: 'DEMO-0312345678'
  }
];

const formatPlanDate = (value?: string) => {
  if (!value) return 'Chưa thiết lập';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const toneClasses: Record<UiTone, { icon: string; badge: string; dot: string; bar: string }> = {
  violet: { icon: 'bg-violet-50 text-violet-600', badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  blue: { icon: 'bg-blue-50 text-blue-600', badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  rose: { icon: 'bg-rose-50 text-rose-600', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', dot: 'bg-cyan-500', bar: 'bg-cyan-500' },
  slate: { icon: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', bar: 'bg-slate-400' }
};

const statIcons: LucideIcon[] = [CalendarCheck2, CircleDollarSign, TrendingUp, PackageCheck];

const overviewAppointments = [
  { time: '09:00', customer: 'Nguyễn Minh Anh', service: 'Gel Manicure + French Chrome', tech: 'Thảo Nguyễn', station: 'M-03', amount: 920_000, status: 'Đang phục vụ', tone: 'violet' as UiTone },
  { time: '10:00', customer: 'Trần Thu Hà', service: 'Pedicure Spa + Sơn gel', tech: 'Minh Châu', station: 'P-02', amount: 780_000, status: 'Đã xác nhận', tone: 'blue' as UiTone },
  { time: '11:30', customer: 'Lê Ngọc Mai', service: 'Đắp gel + Ombre', tech: 'Hà My', station: 'M-05', amount: 1_250_000, status: 'Chờ xác nhận', tone: 'amber' as UiTone },
  { time: '13:30', customer: 'Phạm Gia Hân', service: 'Tháo gel + Manicure', tech: 'Thuỳ Dương', station: 'M-01', amount: 480_000, status: 'Đã xác nhận', tone: 'blue' as UiTone },
  { time: '15:00', customer: 'Vũ Khánh Linh', service: 'Acrylic Full Set + Đính đá', tech: 'Thảo Nguyễn', station: 'M-04', amount: 1_680_000, status: 'Đã xác nhận', tone: 'blue' as UiTone }
];

type OverviewRevenueRange = 7 | 14 | 30;

const overviewDailyRevenue = [
  12.4, 14.8, 13.6, 16.9, 18.2, 20.4, 17.8, 15.6, 16.4, 18.9,
  21.2, 19.8, 22.6, 24.1, 20.7, 18.4, 19.6, 23.2, 25.8, 24.6,
  27.4, 29.1, 26.8, 24.9, 28.6, 31.2, 30.4, 33.8, 29.7, 31.8
];

const overviewRevenueRangeOptions: Array<{ value: OverviewRevenueRange; label: string }> = [
  { value: 7, label: '7 ngày' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' }
];

const overviewStations = [
  { code: 'M-01', label: 'Manicure', tech: 'Thuỳ Dương', until: '14:30', status: 'Đang dùng', tone: 'violet' as UiTone },
  { code: 'M-03', label: 'Manicure', tech: 'Thảo Nguyễn', until: '10:30', status: 'Đang dùng', tone: 'violet' as UiTone },
  { code: 'P-02', label: 'Pedicure', tech: 'Minh Châu', until: '11:20', status: 'Đang dùng', tone: 'violet' as UiTone },
  { code: 'M-06', label: 'Manicure', tech: 'Chưa phân', until: '15:30', status: 'Sẵn sàng', tone: 'emerald' as UiTone },
  { code: 'P-04', label: 'Pedicure', tech: 'Bảo trì', until: '17/07', status: 'Tạm ngưng', tone: 'amber' as UiTone },
  { code: 'VIP-02', label: 'Phòng VIP', tech: 'Chưa phân', until: '16:00', status: 'Sẵn sàng', tone: 'emerald' as UiTone }
];

const formatModuleLabel = (id: NailPageId) => navGroups.flatMap((group) => group.items).find((item) => item.id === id)?.label || 'Tổng quan';

function StatCard({ stat, index }: { stat: NailModuleConfig['stats'][number]; index: number }) {
  const Icon = statIcons[index % statIcons.length];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="ta-kpi-label">{stat.label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[stat.tone].icon}`}><Icon className="h-4.5 w-4.5" /></span>
      </div>
      <p className="ta-metric-value mt-3 text-slate-950">{stat.value}</p>
      <p className="mt-2 text-caption font-semibold text-slate-400">{stat.detail}</p>
    </article>
  );
}

interface OverviewPageProps {
  branch: string;
  ownerName: string;
  tenantName: string;
  tenant?: Tenant;
  demoMode: boolean;
  invoiceCount: number;
  onToggleDemo: () => void;
  planName: string;
  branchCount: number;
  branchLimit: number;
  staffCount: number;
  staffLimit: number;
  onNavigate: (page: NailPageId) => void;
  onQuickCreate: (page: Exclude<NailPageId, 'overview' | 'subscription' | 'support'>) => void;
}
function OverviewPage({ branch, ownerName, tenantName, tenant, demoMode, invoiceCount, onToggleDemo, planName, branchCount, branchLimit, staffCount, staffLimit, onNavigate, onQuickCreate }: OverviewPageProps) {
  const t = useT();
  const [revenueRange, setRevenueRange] = useState<OverviewRevenueRange>(7);
  const branchName = branch === 'ALL' ? t('Tất cả chi nhánh') : branch === 'Q1' ? t('Chi nhánh Quận 1') : branch === 'Q3' ? t('Chi nhánh Quận 3') : `${t('Chi nhánh')} ${branch}`;
  const ownerShortName = ownerName.trim().split(/\s+/).pop() || ownerName;
  const branchQuota = formatTenantQuota(branchCount, branchLimit, 'branches');
  const staffQuota = formatTenantQuota(staffCount, staffLimit, 'staff');
  const branchAtLimit = !isUnlimitedTenantLimit(branchLimit, 'branches') && branchCount >= branchLimit;
  const staffAtLimit = !isUnlimitedTenantLimit(staffLimit, 'staff') && staffCount >= staffLimit;

  if (tenant) {
    return (
      <TenantAdminOverview
        branchName={branchName}
        tenantName={tenantName}
        tenant={tenant}
        demoMode={demoMode}
        invoiceCount={invoiceCount}
        planName={planName}
        branchCount={branchCount}
        branchLimit={branchLimit}
        staffCount={staffCount}
        staffLimit={staffLimit}
        onToggleDemo={onToggleDemo}
        onNavigate={onNavigate}
        onQuickCreate={onQuickCreate}
      />
    );
  }

  const revenueBranchFactor = branch === 'ALL' ? 1.72 : branch === 'Q1' ? 0.72 : 1;
  const visibleRevenue = overviewDailyRevenue.slice(-revenueRange).map((value, index) => ({
    day: 31 - revenueRange + index,
    value: value * revenueBranchFactor
  }));
  const revenueChartMax = Math.ceil(Math.max(...visibleRevenue.map((item) => item.value)) / 10) * 10;
  const revenueTotal = visibleRevenue.reduce((sum, item) => sum + item.value, 0);
  const revenueAverage = revenueTotal / visibleRevenue.length;
  const revenuePeak = visibleRevenue.reduce((peak, item) => item.value > peak.value ? item : peak, visibleRevenue[0]);
  const revenueGrowth = revenueRange === 7 ? 16.8 : revenueRange === 14 ? 14.2 : 18.6;
  const formatRevenue = (value: number) => formatCompactMoney(value * 1_000_000);
  const overviewStats: NailModuleConfig['stats'] = [
    { label: 'Doanh thu hôm nay', value: formatCompactMoney((branch === 'ALL' ? 31.8 : 18.6) * 1_000_000), detail: '+16,8% so với thứ Năm trước', tone: 'emerald' },
    { label: 'Lịch hẹn hôm nay', value: branch === 'ALL' ? '54' : '32', detail: '28 xác nhận · 4 chờ xử lý', tone: 'blue' },
    { label: 'Công suất ghế', value: '86%', detail: '7 đang dùng · 5 sẵn sàng', tone: 'violet' },
    { label: 'Khách hàng mới', value: '6', detail: 'Tỷ lệ quay lại trong ngày 74%', tone: 'amber' }
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Chào buổi chiều, anh ${ownerShortName}`}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onNavigate('reports')} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất báo cáo</button>
          <button type="button" onClick={() => onQuickCreate('appointments')} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-caption font-black text-white shadow-lg shadow-violet-200"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
          </div>
        )}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><BadgePercent className="h-5 w-5" /></span>
          <div><div className="flex flex-wrap items-center gap-2"><p className="text-caption font-black text-slate-900">Quyền đang áp dụng theo gói {planName}</p><span className="rounded-full bg-emerald-100 px-2 py-1 text-caption font-black text-emerald-700">Đang hoạt động</span></div><p className="mt-1 text-caption leading-5 text-slate-500">Mọi chức năng, giới hạn và thao tác tạo mới được kiểm soát theo gói đăng ký hiện tại.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className={`rounded-xl border px-3 py-2 text-caption font-black ${branchAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>Chi nhánh {branchQuota}</span>
          <span className={`rounded-xl border px-3 py-2 text-caption font-black ${staffAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>Nhân sự {staffQuota}</span>
          <button type="button" onClick={() => onNavigate('subscription')} className="flex h-9 items-center gap-1.5 border border-violet-200 bg-white px-3 text-caption font-black text-violet-700 shadow-sm">Xem quyền gói<ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{overviewStats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BarChart3 className="h-5 w-5" /></span>
              <div><h2 className="text-sm font-black text-slate-900">Doanh số theo ngày</h2><p className="mt-1 text-caption text-slate-500">Doanh thu thực nhận · {branchName}</p></div>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Lọc khoảng thời gian doanh số">
              {overviewRevenueRangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRevenueRange(option.value)}
                  aria-pressed={revenueRange === option.value}
                  className={`h-8 min-h-0 border-0 px-3 text-caption font-black shadow-none ${revenueRange === option.value ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 px-5 pt-5 sm:grid-cols-3 sm:px-6">
            <div><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Tổng doanh số</p><p className="mt-1.5 text-lg font-black text-slate-950">{formatRevenue(revenueTotal)}</p></div>
            <div><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Trung bình/ngày</p><p className="mt-1.5 text-lg font-black text-slate-950">{formatRevenue(revenueAverage)}</p></div>
            <div><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Cao nhất</p><p className="mt-1.5 text-lg font-black text-slate-950">{formatRevenue(revenuePeak.value)}</p><p className="mt-1 text-caption font-bold text-slate-400">Ngày {revenuePeak.day.toString().padStart(2, '0')}/07</p></div>
          </div>

          <div className="mt-5 overflow-x-auto px-3 pb-5 sm:px-5">
            <div className="grid h-56 min-w-[680px] grid-cols-[40px_1fr] gap-3">
              <div className="flex flex-col justify-between pb-7 text-right text-caption font-semibold text-slate-400">
                <span>{formatRevenue(revenueChartMax)}</span>
                <span>{formatRevenue(revenueChartMax * 0.66)}</span>
                <span>{formatRevenue(revenueChartMax * 0.33)}</span>
                <span>0</span>
              </div>
              <div className="relative flex items-end gap-1.5 border-b border-slate-200 bg-[linear-gradient(to_bottom,transparent_24%,#f1f5f9_25%,transparent_26%,transparent_49%,#f1f5f9_50%,transparent_51%,transparent_74%,#f1f5f9_75%,transparent_76%)] px-1 pb-7">
                {visibleRevenue.map((item, index) => {
                  const shouldShowLabel = revenueRange === 7 || index === 0 || index === visibleRevenue.length - 1 || (revenueRange === 14 ? index % 2 === 0 : index % 5 === 0);
                  return (
                    <div key={`${item.day}-${item.value}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                      <div
                        className="relative w-full min-w-2 max-w-9 rounded-t-md bg-gradient-to-t from-violet-600 via-violet-500 to-fuchsia-400 shadow-[0_6px_14px_rgba(124,58,237,0.16)] transition-all duration-200 group-hover:from-violet-700 group-hover:to-fuchsia-500"
                        style={{ height: `${Math.max(8, (item.value / revenueChartMax) * 100)}%` }}
                      >
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-caption font-bold text-white shadow-lg group-hover:block">{formatRevenue(item.value)}</span>
                      </div>
                      {shouldShowLabel && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-caption font-semibold text-slate-400">{item.day.toString().padStart(2, '0')}/07</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-caption sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="flex items-center gap-1.5 font-bold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" />Tăng {revenueGrowth.toLocaleString('vi-VN')}% so với kỳ trước</span>
            <span className="font-semibold text-slate-400">Đơn vị hiển thị: triệu đồng</span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Tình trạng ghế</h2><p className="mt-1 text-caption text-slate-500">Cập nhật theo thời gian thực</p></div><Armchair className="h-5 w-5 text-violet-500" /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">{overviewStations.map((station) => <button key={station.code} type="button" onClick={() => onNavigate('stations')} className="h-auto min-h-24 border border-slate-100 bg-slate-50 p-3 text-left shadow-none hover:border-violet-200"><div className="flex items-center justify-between"><span className="text-caption font-black text-slate-800">{station.code}</span><span className={`h-2 w-2 rounded-full ${toneClasses[station.tone].dot}`} /></div><p className="mt-1 text-caption text-slate-400">{station.label}</p><p className="mt-2 truncate text-caption font-bold text-slate-600">{station.tech}</p><p className="mt-1 text-caption text-slate-400">Đến {station.until}</p></button>)}</div>
          <button type="button" onClick={() => onNavigate('stations')} className="mt-4 flex h-9 w-full items-center justify-center gap-1 border-0 bg-violet-50 text-caption font-black text-violet-700 shadow-none">Mở sơ đồ khu vực<ArrowRight className="h-3.5 w-3.5" /></button>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="text-sm font-black text-slate-900">Lịch hẹn đang diễn ra</h2><p className="mt-1 text-caption text-slate-500">Luồng phục vụ tại {branchName.toLocaleLowerCase('vi')}</p></div>
          <button type="button" onClick={() => onNavigate('appointments')} className="flex h-8 w-fit items-center gap-1 border-0 bg-transparent px-0 text-caption font-black text-violet-600 shadow-none sm:px-2">Xem lịch đầy đủ<ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        <div className="divide-y divide-slate-100">
          {overviewAppointments.map((appointment) => (
            <button
              key={`${appointment.time}-${appointment.customer}`}
              type="button"
              onClick={() => onNavigate('appointments')}
              className="grid h-auto w-full gap-3 rounded-none border-0 bg-white px-5 py-4 text-left shadow-none hover:bg-slate-50 sm:grid-cols-[72px_minmax(0,1.35fr)_minmax(130px,0.8fr)] sm:items-center sm:px-6 lg:grid-cols-[72px_minmax(220px,1.4fr)_minmax(150px,0.8fr)_110px_128px]"
            >
              <div><p className="text-body font-black text-slate-900">{appointment.time}</p><p className="mt-1 text-caption font-bold text-slate-400">{appointment.station}</p></div>
              <div className="min-w-0"><p className="truncate text-caption font-black text-slate-800">{appointment.customer}</p><p className="mt-1 truncate text-caption text-slate-400">{appointment.service}</p></div>
              <div><p className="text-caption text-slate-400">Kỹ thuật viên</p><p className="mt-1 truncate text-caption font-bold text-slate-700">{appointment.tech}</p></div>
              <p className="ta-money whitespace-nowrap text-right text-caption font-black text-slate-900 sm:col-start-2 lg:col-start-auto">{formatPlanMoney(appointment.amount)}</p>
              <span className={`w-fit max-w-full rounded-full px-3 py-1.5 text-caption font-bold leading-4 ring-1 sm:justify-self-end ${toneClasses[appointment.tone].badge}`}>{appointment.status}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Doanh thu theo dịch vụ</h2><p className="mt-1 text-caption text-slate-400">Tháng 07/2026</p></div><BarChart3 className="h-4.5 w-4.5 text-violet-500" /></div>
          <div className="mt-4 space-y-3">{[
            { label: 'Gel Manicure', value: 48_200_000, percent: 92, tone: 'bg-violet-500' },
            { label: 'Nail Art', value: 36_800_000, percent: 76, tone: 'bg-fuchsia-500' },
            { label: 'Pedicure Spa', value: 31_400_000, percent: 65, tone: 'bg-blue-500' },
            { label: 'Acrylic & Gel X', value: 28_600_000, percent: 59, tone: 'bg-emerald-500' }
          ].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-caption"><span className="font-bold text-slate-600">{item.label}</span><span className="ta-money text-right font-black text-slate-800">{formatCompactMoney(item.value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} /></div></div>)}</div>
          <button type="button" onClick={() => onNavigate('services')} className="mt-4 flex h-8 items-center gap-1 border-0 bg-transparent px-0 text-caption font-black text-violet-600 shadow-none">Phân tích dịch vụ<ArrowRight className="h-3.5 w-3.5" /></button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Hiệu suất kỹ thuật viên</h2><p className="mt-1 text-caption text-slate-400">Xếp theo doanh thu tháng</p></div><UsersRound className="h-4.5 w-4.5 text-blue-500" /></div>
          <div className="mt-3 space-y-1">{[
            { name: 'Thảo Nguyễn', initials: 'TN', role: 'Senior Nail Artist', revenue: 42_800_000, rating: '4.9', tone: 'bg-violet-100 text-violet-700' },
            { name: 'Hà My', initials: 'HM', role: 'Senior Nail Artist', revenue: 39_400_000, rating: '4.9', tone: 'bg-fuchsia-100 text-fuchsia-700' },
            { name: 'Minh Châu', initials: 'MC', role: 'Nail Technician', revenue: 36_500_000, rating: '4.8', tone: 'bg-blue-100 text-blue-700' },
            { name: 'Thuỳ Dương', initials: 'TD', role: 'Junior Technician', revenue: 18_200_000, rating: '4.7', tone: 'bg-emerald-100 text-emerald-700' }
          ].map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="flex h-auto w-full items-center gap-3 border-0 bg-transparent px-0 py-2 text-left shadow-none"><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-caption font-black ${member.tone}`}>{member.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-caption font-black text-slate-700">{member.name}</span><span className="mt-1 block text-caption text-slate-400">{member.role}</span></span><span className="text-right"><span className="ta-money block text-caption font-black text-slate-800">{formatCompactMoney(member.revenue)}</span><span className="mt-1 flex items-center justify-end gap-1 text-caption text-amber-600"><Star className="h-2.5 w-2.5 fill-amber-400" />{member.rating}</span></span></button>)}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Kho cần chú ý</h2><p className="mt-1 text-caption text-slate-400">18 mặt hàng dưới định mức</p></div><AlertTriangle className="h-4.5 w-4.5 text-amber-500" /></div>
          <div className="mt-3 divide-y divide-slate-100">{[
            { name: 'DND Gel 751 – Merlot', stock: '3/12', days: 'Đủ khoảng 6 ngày', tone: 'bg-rose-500', width: 25 },
            { name: 'OPI Bubble Bath', stock: '5/15', days: 'Đủ khoảng 9 ngày', tone: 'bg-amber-500', width: 33 },
            { name: 'Acetone tinh khiết 5L', stock: '2/4', days: 'Đủ khoảng 14 ngày', tone: 'bg-amber-400', width: 50 }
          ].map((item) => <button key={item.name} type="button" onClick={() => onNavigate('inventory')} className="block h-auto w-full rounded-none border-0 bg-transparent px-0 py-3 text-left shadow-none"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-caption font-black text-slate-700">{item.name}</p><p className="mt-1 text-caption text-slate-400">{item.days}</p></div><span className="rounded-md bg-amber-50 px-2 py-1 text-caption font-black text-amber-700">{item.stock}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} /></div></button>)}</div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-black text-slate-900">Truy cập nhanh</h2><p className="mt-1 text-caption text-slate-400">Các tác vụ thường dùng trong ca vận hành</p></div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">{[
            { label: 'Tạo lịch hẹn', detail: 'Khách, dịch vụ, ghế', icon: CalendarCheck2, page: 'appointments' as const },
            { label: 'Tạo hóa đơn', detail: 'Dịch vụ và sản phẩm', icon: CreditCard, page: 'pos' as const },
            { label: 'Thêm khách hàng', detail: 'Hồ sơ và sở thích', icon: UsersRound, page: 'customers' as const },
            { label: 'Nhập kho', detail: 'Vật tư và mã màu', icon: Boxes, page: 'inventory' as const },
            { label: 'Thêm mẫu Nail', detail: 'Bộ sưu tập mới', icon: Image, page: 'gallery' as const },
            { label: 'Ghi nhận vệ sinh', detail: 'Dụng cụ và ghế', icon: ShieldCheck, page: 'sanitation' as const }
          ].map(({ label, detail, icon: Icon, page }) => <button key={label} type="button" onClick={() => onQuickCreate(page)} className="flex h-auto min-h-20 items-center gap-3 rounded-none border-0 bg-white px-4 py-3 text-left shadow-none hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-caption font-black text-slate-700">{label}</span><span className="mt-1 block text-caption text-slate-400">{detail}</span></span><ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>)}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Vệ sinh & an toàn</h2><p className="mt-1 text-caption text-slate-400">Checklist hôm nay đạt 94%</p></div><ShieldCheck className="h-4.5 w-4.5 text-emerald-500" /></div>
          <div className="mt-4 space-y-2">{[
            { label: 'Khử khuẩn dụng cụ ca sáng', done: true },
            { label: 'Vệ sinh bồn Pedicure', done: true },
            { label: 'Bổ sung khăn sạch khu VIP', done: false },
            { label: 'Đóng checklist mở ca', done: false }
          ].map((item) => <div key={item.label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{item.done ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}</span><span className="text-caption font-bold text-slate-600">{item.label}</span></div>)}</div>
          <button type="button" onClick={() => onNavigate('sanitation')} className="mt-4 flex h-9 w-full items-center justify-center gap-1 border-0 bg-emerald-50 text-caption font-black text-emerald-700 shadow-none">Mở checklist đầy đủ<ArrowRight className="h-3.5 w-3.5" /></button>
        </article>
      </section>
    </div>
  );
}

interface BranchesPageProps {
  rows: NailRow[];
  searchQuery: string;
  activeTab: string;
  onSearch: (value: string) => void;
  onTab: (value: string) => void;
  onSelectRow: (row: NailRow) => void;
  onCreate: () => void;
  onExport: () => void;
  planName: string;
  branchLimit: number;
}

const getBranchField = (row: NailRow, label: string, fallback: string) => (
  row.details.find((item) => item.label.toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi'))?.value || fallback
);

const getBranchStaffCount = (row: NailRow) => {
  const value = getBranchField(row, 'Nhân sự', row.cells[2] || '0');
  return Number(value.match(/\d+/)?.[0] || 0);
};

const formatBranchRevenue = (value?: number) => value && value > 0
  ? formatCompactMoney(value)
  : 'Chưa có dữ liệu';

const getRequiredBranchSelectionErrors = (values: Record<string, string>): Record<string, string> => ({
  ...(!values.branchRole?.trim() ? { branchRole: 'Vui lòng chọn vai trò trong tenant.' } : {}),
  ...(!values.branchModel?.trim() ? { branchModel: 'Vui lòng chọn mô hình kinh doanh.' } : {}),
  ...(!values.status?.trim() ? { status: 'Vui lòng chọn trạng thái chi nhánh.' } : {})
});

interface BranchActionsMenuProps {
  row: NailRow;
  onView: (row: NailRow) => void;
}

function BranchActionsMenu({ row, onView }: BranchActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const phone = getBranchField(row, 'Điện thoại', 'Chưa cập nhật');
  const branchCode = getBranchField(row, 'Mã chi nhánh', row.id);

  const copyBranchCode = async () => {
    await navigator.clipboard?.writeText(branchCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Mở menu thao tác của ${row.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center border p-0 shadow-sm ${open ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Đóng menu thao tác" onClick={() => setOpen(false)} className="fixed inset-0 z-20 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <div role="menu" className="absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_55px_rgba(15,23,42,0.18)]">
            <div className="px-3 pb-2 pt-1">
              <p className="text-caption font-black uppercase tracking-wide text-slate-400">Thao tác nhanh</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-700">{row.title}</p>
            </div>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onView(row); }} className="flex h-10 w-full items-center gap-3 border-0 bg-transparent px-3 text-left text-xs font-bold text-slate-700 shadow-none hover:bg-violet-50 hover:text-violet-700"><ArrowRight className="h-4 w-4" />Xem và chỉnh sửa hồ sơ</button>
            {phone !== 'Chưa cập nhật' && <button type="button" role="menuitem" onClick={() => { setOpen(false); setCallDialogOpen(true); }} className="flex h-10 w-full items-center gap-3 border-0 bg-transparent px-3 text-left text-xs font-bold text-slate-700 shadow-none hover:bg-emerald-50 hover:text-emerald-700"><Phone className="h-4 w-4" />Gọi chi nhánh</button>}
            <button type="button" role="menuitem" onClick={() => void copyBranchCode()} className="flex h-10 w-full items-center gap-3 border-0 bg-transparent px-3 text-left text-xs font-bold text-slate-700 shadow-none hover:bg-slate-50"><Copy className="h-4 w-4" />{copied ? 'Đã sao chép mã' : 'Sao chép mã chi nhánh'}{copied && <Check className="ml-auto h-4 w-4 text-emerald-600" />}</button>
          </div>
        </>
      )}
      {callDialogOpen && <BranchCallDialog branchName={row.title} phone={phone} onClose={() => setCallDialogOpen(false)} />}
    </div>
  );
}

const branchToNailRow = (branch: Branch): NailRow => ({
  id: branch.id,
  title: branch.name,
  subtitle: `${branch.isPrimary ? 'Chi nhánh chính' : getBranchModelLabel(branch.model)} · ${branch.address}`,
  cells: [branch.openingHours || '08:00–21:00', branch.managerName || 'Chưa phân công', `${branch.staffUsed || 0} người`, formatBranchRevenue(branch.monthlyRevenue)],
  badge: getBranchStatusLabel(branch.status),
  badgeTone: branch.status === 'ACTIVE' ? 'emerald' : branch.status === 'PLANNING' ? 'blue' : 'slate',
  branchCode: branch.code || branch.id.replace(/^BR-/, ''),
  details: [
    { label: 'Mã chi nhánh', value: branch.code || branch.id },
    { label: 'Mô hình kinh doanh', value: getBranchModelLabel(branch.model) },
    { label: 'Vai trò', value: branch.isPrimary ? 'Chi nhánh chính' : 'Chi nhánh thành viên' },
    { label: 'Địa chỉ', value: branch.address },
    { label: 'Tỉnh / Thành phố', value: branch.province || 'Chưa cập nhật' },
    { label: 'Quản lý', value: branch.managerName || 'Chưa phân công' },
    { label: 'Điện thoại', value: branch.phone || 'Chưa cập nhật' },
    { label: 'Email', value: branch.email || 'Chưa cập nhật' },
    { label: 'Múi giờ', value: branch.timezone || 'Asia/Ho_Chi_Minh' },
    { label: 'Giờ hoạt động', value: branch.openingHours || '08:00–21:00' },
    { label: 'Ngày mở cửa', value: branch.openingDate || 'Chưa cập nhật' },
    { label: 'Số ghế', value: `${branch.stationCount || 0} vị trí` },
    { label: 'Nhân sự', value: `${branch.staffUsed || 0} người` },
    { label: 'Sức chứa nhân sự', value: `${branch.staffCapacity || 0} người` },
    { label: 'Doanh thu tháng', value: formatBranchRevenue(branch.monthlyRevenue) },
    { label: 'Công suất', value: `${branch.capacityPercent || 0}%` },
    { label: 'Mã số thuế', value: branch.taxCode || 'Theo tenant' },
    { label: 'Dịch vụ', value: branch.services?.join(', ') || 'Chưa cấu hình' }
  ],
  note: branch.note || ''
});

function BranchesPage({ rows, searchQuery, activeTab, onSearch, onTab, onSelectRow, onCreate, onExport, planName, branchLimit }: BranchesPageProps) {
  const activeCount = rows.filter((row) => row.badge === 'Đang hoạt động').length;
  const totalStaff = rows.reduce((sum, row) => sum + getBranchStaffCount(row), 0);
  const unlimited = isUnlimitedTenantLimit(branchLimit, 'branches');
  const remaining = unlimited ? null : Math.max(0, branchLimit - rows.length);
  const tabs = ['Tất cả', 'Đang hoạt động', 'Tạm ngưng', 'Chuẩn bị mở'];
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return rows.filter((row) => {
      const searchable = `${row.id} ${row.title} ${row.subtitle} ${row.cells.join(' ')} ${row.badge} ${row.details.map((item) => `${item.label} ${item.value}`).join(' ')}`.toLocaleLowerCase('vi');
      return (!query || searchable.includes(query)) && (activeTab === 'Tất cả' || row.badge === activeTab);
    });
  }, [activeTab, rows, searchQuery]);
  const revenue = rows.reduce((sum, _row, index) => sum + Math.max(72.4, 186.4 - index * 60), 0);
  const quotaPercent = unlimited || !branchLimit ? 22 : Math.min(100, Math.round((rows.length / branchLimit) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chi nhánh"
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onExport} className="flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-none"><Download className="h-4 w-4" />Xuất danh sách</button>
          <button type="button" onClick={onCreate} className="flex h-10 items-center justify-center gap-2 border border-pink-600 bg-pink-600 px-5 text-xs font-black text-white shadow-none"><Plus className="h-4 w-4" />Thêm chi nhánh</button>
          </div>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: 'Tổng chi nhánh', value: String(rows.length), detail: unlimited ? 'Không giới hạn theo gói' : `${remaining} vị trí còn lại`, icon: Store }, { label: 'Đang hoạt động', value: String(activeCount), detail: `${Math.max(0, rows.length - activeCount)} chi nhánh chưa hoạt động`, icon: Activity }, { label: 'Tổng nhân sự', value: String(totalStaff), detail: 'Phân bổ trên toàn hệ thống', icon: UsersRound }, { label: 'Doanh thu tháng', value: formatCompactMoney(revenue * 1_000_000), detail: '+15,6% so với tháng trước', icon: TrendingUp }].map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_8px_24px_rgba(190,24,93,0.04)]"><div className="flex items-start justify-between gap-3"><div><p className="text-body font-bold text-slate-500">{label}</p><p className="ta-metric-value mt-2 text-slate-950">{value}</p><p className="mt-2 text-body text-slate-400">{detail}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><Icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{tabs.map((tab) => <button key={tab} type="button" onClick={() => onTab(tab)} className={`h-9 shrink-0 border-0 px-4 text-xs font-bold shadow-none ${activeTab === tab ? 'bg-white text-violet-700 shadow-sm' : 'bg-transparent text-slate-500'}`}>{tab}</button>)}</div><div className="relative min-w-0 lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Tìm tên, mã, địa chỉ, quản lý..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearch('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-4 w-4" /></button>}</div></div>
          </div>

          {filteredRows.map((row, index) => {
            const address = getBranchField(row, 'Địa chỉ', row.subtitle.includes('·') ? row.subtitle.split('·').slice(1).join('·').trim() : row.subtitle);
            const manager = getBranchField(row, 'Quản lý', row.cells[1] || 'Chưa phân công');
            const phone = getBranchField(row, 'Điện thoại', index ? '028 3822 6688' : '028 3930 8899');
            const hours = getBranchField(row, 'Giờ hoạt động', row.cells[0] || '08:00–21:00');
            const stations = getBranchField(row, 'Số ghế', `${Math.max(8, 14 - index * 4)} vị trí`);
            const capacity = getBranchField(row, 'Công suất', `${Math.max(68, 86 - index * 10)}%`);
            const monthlyRevenue = row.cells[3] && !row.cells[3].includes('Chưa') ? row.cells[3] : formatCompactMoney(Math.max(72.4, 186.4 - index * 60) * 1_000_000);
            const staff = getBranchStaffCount(row);
            const isPrimary = getBranchField(row, 'Vai trò', '') === 'Chi nhánh chính';
            return <article key={row.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_18px_45px_rgba(76,29,149,0.08)]">
              <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Store className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase tracking-wide text-violet-600">{row.id}</span><span className={`rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${toneClasses[row.badgeTone].badge}`}>{row.badge}</span>{isPrimary && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-caption font-bold text-white">Chi nhánh chính</span>}<span className="rounded-full bg-violet-50 px-2.5 py-1 text-caption font-bold text-violet-700">{getBranchField(row, 'Mô hình kinh doanh', 'Salon đầy đủ dịch vụ')}</span></div><h2 className="mt-2 text-lg font-black text-slate-900">{row.title}</h2><p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{address}</p></div><BranchActionsMenu row={row} onView={onSelectRow} /></div></div>
              <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><div className="p-4 sm:p-5"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Quản lý phụ trách</p><div className="mt-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600"><UserCheck className="h-3.5 w-3.5" /></span><p className="text-xs font-black text-slate-700">{manager}</p></div></div><div className="p-4 sm:p-5"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Nguồn lực</p><p className="mt-3 text-sm font-black text-slate-800">{staff} nhân sự · {stations}</p></div><div className="p-4 sm:p-5"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Doanh thu tháng</p><p className="mt-3 text-sm font-black text-emerald-600">{monthlyRevenue}</p></div><div className="p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Công suất</p><span className="text-xs font-black text-violet-700">{capacity}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: capacity }} /></div></div></div>
              <div className="flex flex-col gap-3 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center"><div className="flex flex-1 flex-wrap gap-x-5 gap-y-2 text-body font-semibold text-slate-500"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{hours}</span><span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{phone}</span><span className="flex items-center gap-1.5"><CalendarCheck2 className="h-3.5 w-3.5" />{Math.max(18, 32 - index * 7)} lịch hôm nay</span></div><button type="button" onClick={() => onSelectRow(row)} className="flex h-9 items-center justify-center gap-2 border border-violet-200 bg-white px-4 text-xs font-black text-violet-700 shadow-sm">Xem hồ sơ chi tiết<ArrowRight className="h-3.5 w-3.5" /></button></div>
            </article>;
          })}
          {!filteredRows.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">Không tìm thấy chi nhánh phù hợp</p><button type="button" onClick={() => { onSearch(''); onTab('Tất cả'); }} className="mt-2 border-0 bg-transparent text-xs font-bold text-violet-600 shadow-none">Xóa bộ lọc</button></div>}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-black text-slate-900">Hạn mức gói</p><p className="mt-1 text-body text-slate-500">Số địa điểm được phép quản lý</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Target className="h-4 w-4" /></span></div><div className="mt-5 flex items-end justify-between"><div><span className="text-3xl font-black text-slate-900">{rows.length}</span><span className="ml-1 text-sm font-bold text-slate-400">/ {unlimited ? '∞' : branchLimit}</span></div><span className="text-xs font-black text-violet-600">{quotaPercent}%</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${quotaPercent}%` }} /></div><p className="mt-3 text-body leading-5 text-slate-500">{unlimited ? `Gói ${planName} không giới hạn chi nhánh.` : remaining ? `Bạn có thể mở thêm ${remaining} chi nhánh trong gói ${planName}.` : `Bạn đã dùng hết hạn mức chi nhánh của gói ${planName}.`}</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-sm font-black text-slate-900">Sức khỏe hệ thống</p><p className="mt-1 text-body text-slate-500">Cập nhật theo dữ liệu vận hành hôm nay</p></div><div className="mt-4 space-y-4">{[{ label: 'Công suất phục vụ', value: '82%', tone: 'bg-violet-500', width: 82 }, { label: 'Đúng giờ mở ca', value: '100%', tone: 'bg-emerald-500', width: 100 }, { label: 'Hoàn tất checklist', value: '94%', tone: 'bg-blue-500', width: 94 }, { label: 'CSAT trung bình', value: '4,8/5', tone: 'bg-amber-500', width: 96 }].map((item) => <div key={item.label}><div className="flex justify-between text-body"><span className="font-semibold text-slate-500">{item.label}</span><span className="font-black text-slate-800">{item.value}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} /></div></div>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-black text-slate-900">Cần xử lý</p><span className="rounded-full bg-amber-50 px-2 py-1 text-caption font-black text-amber-700">4 việc</span></div><div className="mt-4 space-y-2.5">{['Duyệt lịch vận hành cuối tuần', 'Đối soát doanh thu chi nhánh chính', 'Điều chuyển 12 mã sơn Gel', 'Rà soát quyền của quản lý chi nhánh'].map((item, index) => <div key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>{index === 0 ? <Clock3 className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span><p className="text-body font-semibold leading-5 text-slate-600">{item}</p></div>)}</div></section>
        </aside>
      </section>
    </div>
  );
}

interface BranchDetailDrawerProps {
  row: NailRow;
  tenantName: string;
  onClose: () => void;
  onEdit: () => void;
  onUpdate: () => void;
}

function BranchDetailDrawer({ row, tenantName, onClose, onEdit }: BranchDetailDrawerProps) {
  const address = getBranchField(row, 'Địa chỉ', row.subtitle.includes('·') ? row.subtitle.split('·').slice(1).join('·').trim() : row.subtitle);
  const phone = getBranchField(row, 'Điện thoại', 'Chưa cập nhật');
  const email = getBranchField(row, 'Email', 'Chưa cập nhật');
  const manager = getBranchField(row, 'Quản lý', row.cells[1] || 'Chưa phân công');
  const hours = getBranchField(row, 'Giờ hoạt động', row.cells[0] || '08:00–21:00');
  const stations = getBranchField(row, 'Số ghế', '0 vị trí');
  const staff = getBranchStaffCount(row);
  const capacity = getBranchField(row, 'Công suất', '0%');
  const capacityValue = Math.max(0, Math.min(100, Number(capacity.replace(/[^\d.]/g, '')) || 0));
  const branchModel = getBranchField(row, 'Mô hình kinh doanh', 'Chưa cấu hình');
  const branchRole = getBranchField(row, 'Vai trò', 'Chi nhánh thành viên');
  const services = getBranchField(row, 'Dịch vụ', 'Chưa cấu hình').split(',').map((item) => item.trim()).filter(Boolean);
  const isOperating = row.badge === 'Đang hoạt động';

  return (
    <div className="ui-modal-layer fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[3px] sm:p-6">
      <button type="button" aria-label="Đóng hồ sơ chi nhánh" onClick={onClose} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
      <aside role="dialog" aria-modal="true" aria-labelledby="branch-detail-title" className="relative flex h-[calc(100dvh-1rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-[#f6f7fb] shadow-[0_30px_100px_rgba(15,23,42,0.4)] sm:h-[calc(100dvh-3rem)] sm:max-h-[860px] sm:rounded-[30px]">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 sm:h-12 sm:w-12"><Store className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-violet-600">{getBranchField(row, 'Mã chi nhánh', row.id)}</span>
                <span className={`rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${toneClasses[row.badgeTone].badge}`}>{row.badge}</span>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-caption font-bold text-white">{branchRole}</span>
              </div>
              <h2 id="branch-detail-title" className="mt-2 text-lg font-black leading-tight text-slate-950 sm:text-xl">{row.title}</h2>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{address}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm hover:bg-slate-50"><X className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-4 [scrollbar-gutter:stable] sm:p-6">
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#18142e] via-[#251a49] to-[#432777] p-5 text-white shadow-[0_18px_45px_rgba(42,27,83,0.2)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-caption font-black uppercase tracking-[0.16em] text-violet-300">Vận hành hôm nay</p>
                <h3 className="mt-2 text-xl font-black">Tổng quan chi nhánh</h3>
                <p className="mt-2 text-xs text-slate-300">Đồng bộ từ lịch hẹn, ca làm việc và vị trí phục vụ · {tenantName}</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1.5 text-caption font-black ring-1 ${isOperating ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/20' : 'bg-white/10 text-slate-300 ring-white/15'}`}>{isOperating ? 'Đang vận hành' : row.badge}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Lịch hôm nay', value: isOperating ? '32' : '—', icon: CalendarCheck2 },
                { label: 'Doanh thu tháng', value: row.cells[3] || 'Chưa có', icon: TrendingUp },
                { label: 'Nhân sự', value: `${staff} người`, icon: UsersRound },
                { label: 'Vị trí phục vụ', value: stations, icon: Armchair }
              ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-3.5"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-caption text-slate-400">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>)}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-900">Công suất phục vụ hôm nay</p><p className="mt-1 text-body text-slate-500">Tự động tính từ thời lượng lịch hẹn trên năng lực khả dụng.</p></div><span className="text-2xl font-black text-violet-700">{isOperating ? capacity : '—'}</span></div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: isOperating ? `${capacityValue}%` : '0%' }} /></div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-caption font-semibold text-slate-500"><span>{hours} giờ hoạt động</span><span>{staff} nhân sự</span><span>{stations}</span></div>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-black text-slate-900">Liên hệ & phụ trách</h3></div>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Quản lý phụ trách', value: manager, icon: UserCheck },
                  { label: 'Số điện thoại', value: phone, icon: Phone },
                  { label: 'Email chi nhánh', value: email, icon: Mail },
                  { label: 'Địa chỉ đầy đủ', value: address, icon: MapPin }
                ].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="text-caption font-bold text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-bold leading-5 text-slate-700">{value}</p></div></div>)}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-black text-slate-900">Cấu hình vận hành</h3></div>
              <dl className="mt-4 divide-y divide-slate-100">
                {[
                  { label: 'Mô hình kinh doanh', value: branchModel, icon: Store },
                  { label: 'Giờ hoạt động', value: hours, icon: Clock3 },
                  { label: 'Múi giờ', value: getBranchField(row, 'Múi giờ', 'Asia/Ho_Chi_Minh'), icon: Globe2 },
                  { label: 'Ngày khai trương', value: getBranchField(row, 'Ngày mở cửa', 'Chưa cập nhật'), icon: CalendarClock },
                  { label: 'Mã số thuế', value: getBranchField(row, 'Mã số thuế', 'Theo tenant'), icon: ReceiptText }
                ].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><Icon className="h-4 w-4 shrink-0 text-slate-400" /><dt className="flex-1 text-body font-semibold text-slate-500">{label}</dt><dd className="max-w-[55%] text-right text-xs font-black leading-5 text-slate-700">{value}</dd></div>)}
              </dl>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Dịch vụ đang cung cấp</h3><p className="mt-1 text-body text-slate-500">Danh mục áp dụng riêng tại chi nhánh này.</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-caption font-black text-violet-700">{services[0] === 'Chưa cấu hình' ? 0 : services.length} dịch vụ</span></div>
            <div className="mt-4 flex flex-wrap gap-2">{services.map((service) => <span key={service} className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-body font-bold text-violet-700">{service}</span>)}</div>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div><h3 className="text-sm font-black text-slate-900">Nhật ký & đồng bộ dữ liệu</h3><p className="mt-2 text-xs leading-5 text-slate-500">Hồ sơ được đồng bộ giữa Tenant Admin và Super Admin. Cập nhật quản trị gần nhất lúc 14:32 và được lưu trong nhật ký hệ thống.</p></div></div>
            {row.note && <div className="mt-4 rounded-xl bg-amber-50 p-3"><p className="text-caption font-black uppercase tracking-wide text-amber-700">Ghi chú quản lý</p><p className="mt-1.5 text-xs leading-5 text-amber-800">{row.note}</p></div>}
          </section>
        </main>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)] sm:px-7">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 shadow-sm">Đóng</button>
            <button type="button" onClick={onEdit} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"><Settings className="h-4 w-4" />Chỉnh sửa chi nhánh<ArrowRight className="h-4 w-4" /></button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

interface SubscriptionPageProps {
  tenantName: string;
  tenant?: Tenant;
  subscriptionPackage: SubscriptionPackage;
  availablePackages: SubscriptionPackage[];
  invoices: Invoice[];
  branchCount: number;
  staffCount: number;
  onNotify: (message: string) => void;
}

function SubscriptionPage({ tenantName, tenant, subscriptionPackage, availablePackages, invoices, branchCount, staffCount, onNotify }: SubscriptionPageProps) {
  const branchLimit = subscriptionPackage.maxSalons;
  const staffLimit = subscriptionPackage.maxStaff;
  const limits = subscriptionPackage.limits;
  const billingCycle = tenant?.billingCycle || subscriptionPackage.billingCycle || 'monthly';
  const pricing = tenant
    ? getTenantLockedSubscriptionPrice([subscriptionPackage], tenant, billingCycle)
    : {
        price: billingCycle === 'yearly' ? getYearlyPackagePrice(subscriptionPackage) : subscriptionPackage.price,
        currency: subscriptionPackage.currency || 'USD'
      };
  const enabledCapabilityKeys = getEnabledTenantCapabilities(subscriptionPackage, availablePackages);
  const lockedCapabilities = SUBSCRIPTION_CAPABILITY_CATALOG.filter((item) => !enabledCapabilityKeys.has(item.key));
  const upgradePackage = availablePackages
    .filter((item) => isTenantPackageUpgradeCandidate(subscriptionPackage, item))
    .sort((a, b) => a.price - b.price)[0];
  const renewalDate = tenant?.subscriptionRenewsAt || tenant?.trialEndDate;
  const statusLabel = tenant?.status === 'TRIAL' ? 'Đang dùng thử'
    : tenant?.status === 'EXPIRING' ? 'Sắp hết hạn'
      : tenant?.status === 'OVERDUE' ? 'Quá hạn thanh toán'
        : tenant?.status === 'SUSPENDED' ? 'Đã tạm ngưng'
          : 'Đang hoạt động';
  const statusTone = tenant?.status === 'SUSPENDED' || tenant?.status === 'OVERDUE'
    ? 'bg-rose-400/15 text-rose-300 ring-rose-300/20'
    : tenant?.status === 'EXPIRING'
      ? 'bg-amber-400/15 text-amber-300 ring-amber-300/20'
      : 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/20';
  const branchRemaining = isUnlimitedTenantLimit(branchLimit, 'branches') ? null : Math.max(0, branchLimit - branchCount);
  const staffRemaining = isUnlimitedTenantLimit(staffLimit, 'staff') ? null : Math.max(0, staffLimit - staffCount);
  const usageItems = [
    {
      label: 'Nhân sự đang hoạt động',
      value: formatTenantQuota(staffCount, staffLimit, 'staff'),
      percent: getTenantUsagePercent(staffCount, staffLimit, 'staff'),
      detail: staffRemaining === null ? 'Không giới hạn tài khoản nhân sự' : staffRemaining > 0 ? 'Còn ' + staffRemaining + ' tài khoản nhân sự' : 'Đã đạt hạn mức nhân sự',
      icon: UsersRound,
      tone: 'violet' as UiTone
    },
    {
      label: 'Chi nhánh',
      value: formatTenantQuota(branchCount, branchLimit, 'branches'),
      percent: getTenantUsagePercent(branchCount, branchLimit, 'branches'),
      detail: branchRemaining === null ? 'Không giới hạn chi nhánh' : branchRemaining > 0 ? 'Còn ' + branchRemaining + ' chi nhánh' : 'Đã đạt hạn mức chi nhánh',
      icon: Store,
      tone: 'blue' as UiTone
    },
    {
      label: 'Lịch hẹn mỗi tháng',
      value: formatSubscriptionLimit(limits?.appointmentsPerMonth, 'lịch'),
      percent: 0,
      detail: 'Hạn mức của gói · chưa có dữ liệu sử dụng',
      icon: CalendarCheck2,
      tone: 'emerald' as UiTone
    },
    {
      label: 'Tin nhắn chăm sóc',
      value: formatSubscriptionLimit(limits?.messagesPerMonth, 'tin'),
      percent: 0,
      detail: 'Hạn mức SMS/Email · chưa có dữ liệu sử dụng',
      icon: Megaphone,
      tone: 'amber' as UiTone
    },
    {
      label: 'Dung lượng lưu trữ',
      value: formatSubscriptionLimit(limits?.storageGb, 'GB'),
      percent: 0,
      detail: 'Ảnh mẫu và hồ sơ khách hàng',
      icon: Boxes,
      tone: 'cyan' as UiTone
    }
  ];
  const capabilityGroups = [
    { title: 'Vận hành & khách hàng', keys: ['appointments', 'online_booking', 'customers', 'loyalty', 'nail_gallery'] },
    { title: 'Tự động hóa & dữ liệu', keys: ['automation', 'advanced_reports', 'inventory', 'finance', 'api'] },
    { title: 'Quản trị doanh nghiệp', keys: ['sanitation', 'custom_domain', 'sso', 'priority_support', 'account_manager'] }
  ];
  const invoiceStatusMeta: Record<Invoice['status'], { label: string; className: string }> = {
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    PENDING: { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
    OVERDUE: { label: 'Quá hạn', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gói đăng ký"
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onNotify('Đã mở yêu cầu hỗ trợ gói đăng ký.')} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm"><ShieldCheck className="h-4 w-4" />Liên hệ hỗ trợ</button>{upgradePackage && <button type="button" onClick={() => onNotify('Đã gửi yêu cầu nâng cấp lên gói ' + upgradePackage.name + '.')} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-5 text-caption font-black text-white shadow-lg shadow-violet-200"><TrendingUp className="h-4 w-4" />Nâng lên {upgradePackage.name}</button>}</div>
        )}
      />

      <section className="grid overflow-hidden rounded-3xl bg-gradient-to-br from-[#171328] via-[#21183c] to-[#34215a] text-white shadow-xl lg:grid-cols-[1.45fr_0.75fr]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-400/15 px-3 py-1 text-caption font-black uppercase tracking-wide text-violet-200 ring-1 ring-violet-300/25">Gói hiện tại</span><span className={'rounded-full px-3 py-1 text-caption font-bold ring-1 ' + statusTone}>{statusLabel}</span><span className="rounded-full bg-white/8 px-3 py-1 text-caption font-bold text-slate-300">{billingCycle === 'yearly' ? 'Thanh toán hằng năm' : 'Thanh toán hằng tháng'}</span></div>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-3xl font-black tracking-tight sm:text-4xl">{subscriptionPackage.name}</p><p className="mt-2 max-w-xl text-caption leading-5 text-slate-300">{subscriptionPackage.description}</p></div><div className="shrink-0 sm:text-right"><p className="text-2xl font-black">{formatPlanMoney(pricing.price, pricing.currency)}<span className="text-caption font-semibold text-slate-400"> / {billingCycle === 'yearly' ? 'năm' : 'tháng'}</span></p><p className="mt-1 text-caption text-slate-400">Giá đã khóa cho tenant · phiên bản gói {tenant?.subscriptionPackageVersion || subscriptionPackage.version || 1}</p></div></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Bắt đầu</p><p className="mt-2 text-caption font-black">{formatPlanDate(tenant?.subscriptionStartedAt || tenant?.planStartDate)}</p></div><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Gia hạn tiếp theo</p><p className="mt-2 text-caption font-black">{formatPlanDate(renewalDate)}</p></div><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-caption font-bold uppercase tracking-wide text-slate-400">Quyền đang mở</p><p className="mt-2 text-caption font-black">{enabledCapabilityKeys.size} / {SUBSCRIPTION_CAPABILITY_CATALOG.length} feature flags</p></div></div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.05] p-6 sm:p-8 lg:border-l lg:border-t-0"><p className="text-caption font-black uppercase tracking-wide text-violet-200">Kiểm soát theo gói</p><div className="mt-4 space-y-3"><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center gap-3"><Store className="h-5 w-5 text-violet-200" /><div><p className="text-caption font-black">Chi nhánh</p><p className="mt-1 text-caption text-slate-400">{formatTenantQuota(branchCount, branchLimit, 'branches')}</p></div></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-violet-200" /><div><p className="text-caption font-black">Nhân sự</p><p className="mt-1 text-caption text-slate-400">{formatTenantQuota(staffCount, staffLimit, 'staff')}</p></div></div></div></div><button type="button" onClick={() => onNotify('Đã mở thông tin thanh toán của tenant.')} className="mt-4 flex h-10 w-full items-center justify-center border border-white/15 bg-white/10 text-caption font-black text-white shadow-none hover:bg-white/15">Quản lý thanh toán</button></div>
      </section>

      <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-black text-slate-900">Hạn mức đang áp dụng</h2><p className="mt-1 text-caption text-slate-500">Số chi nhánh và nhân sự lấy từ tenant; các quota khác lấy từ cấu hình gói.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-caption font-bold text-violet-700">Gói {subscriptionPackage.name}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{usageItems.map(({ label, value, percent, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={'flex h-9 w-9 items-center justify-center rounded-xl ' + toneClasses[tone].icon}><Icon className="h-4 w-4" /></span>{percent > 0 && <span className="text-caption font-black text-slate-400">{percent}%</span>}</div><p className="mt-4 text-caption font-bold text-slate-500">{label}</p><p className="mt-1 text-base font-black text-slate-900">{value}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + toneClasses[tone].bar} style={{ width: percent > 0 ? percent + '%' : '12%' }} /></div><p className="mt-2 text-caption leading-4 text-slate-400">{detail}</p></article>)}</div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black text-slate-900">Quyền chức năng của gói {subscriptionPackage.name}</h2><p className="mt-1 text-caption text-slate-500">Dấu tích là chức năng được mở; biểu tượng khóa yêu cầu nâng cấp hoặc đổi gói.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BadgePercent className="h-5 w-5" /></span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">{capabilityGroups.map((group) => <div key={group.title} className="rounded-2xl bg-slate-50 p-4"><p className="text-caption font-black text-slate-800">{group.title}</p><div className="mt-3 space-y-2.5">{group.keys.map((key) => { const capability = SUBSCRIPTION_CAPABILITY_CATALOG.find((item) => item.key === key); const enabled = enabledCapabilityKeys.has(key); return <div key={key} className={'flex items-start gap-2 rounded-xl p-2.5 ' + (enabled ? 'bg-white' : 'border border-dashed border-slate-200 bg-slate-100/70')}><span className={'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ' + (enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500')}>{enabled ? <Check className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}</span><div><p className={'text-caption font-bold ' + (enabled ? 'text-slate-700' : 'text-slate-400')}>{capability?.label || key}</p><p className="mt-1 text-caption text-slate-400">{enabled ? 'Được sử dụng' : 'Chưa có trong gói'}</p></div></div>; })}</div></div>)}</div>
        {lockedCapabilities.length > 0 && <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><LockKeyhole className="h-4 w-4" /></span><div className="flex-1"><p className="text-caption font-black text-amber-900">{lockedCapabilities.length} quyền chưa nằm trong gói hiện tại</p><p className="mt-1 text-caption text-amber-700">Menu vẫn hiển thị để bạn biết tính năng, nhưng hệ thống sẽ chặn truy cập và đề xuất gói phù hợp.</p></div>{upgradePackage && <button type="button" onClick={() => onNotify('Đã gửi yêu cầu tư vấn gói ' + upgradePackage.name + '.')} className="h-9 border border-amber-300 bg-white px-3 text-caption font-black text-amber-800 shadow-sm">Tư vấn {upgradePackage.name}</button>}</div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Lịch sử hóa đơn</h2><p className="mt-1 text-caption text-slate-500">Hóa đơn được lọc theo đúng tenant {tenantName}.</p></div><button type="button" onClick={() => onNotify(invoices.length ? 'Đã chuẩn bị danh sách hóa đơn để xuất.' : 'Tenant chưa có hóa đơn để xuất.')} className="flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất danh sách</button></div>{invoices.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50 text-caption font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Mã hóa đơn</th><th className="px-4 py-3">Chu kỳ</th><th className="px-4 py-3">Ngày phát hành</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Tệp</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.slice(0, 6).map((invoice) => { const status = invoiceStatusMeta[invoice.status]; return <tr key={invoice.id} className="text-caption text-slate-600"><td className="px-5 py-4 font-black text-slate-800">{invoice.invoiceCode || invoice.id}</td><td className="px-4 py-4">{invoice.billingPeriod}</td><td className="px-4 py-4">{formatPlanDate(invoice.createdAt)}</td><td className="px-4 py-4 font-black text-slate-800">{formatPlanMoney(invoice.amount, invoice.currency || 'VND')}</td><td className="px-4 py-4"><span className={'rounded-full px-2.5 py-1 text-caption font-bold ring-1 ' + status.className}>{status.label}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => onNotify('Đang chuẩn bị hóa đơn ' + (invoice.invoiceCode || invoice.id) + '.')} className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-caption font-bold text-slate-600 shadow-sm"><ReceiptText className="h-3.5 w-3.5" />Tải PDF</button></td></tr>; })}</tbody></table></div> : <div className="px-6 py-12 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-caption font-black text-slate-700">Chưa có hóa đơn cho tenant này</p><p className="mt-1 text-caption text-slate-400">Hóa đơn mới sẽ xuất hiện sau khi Super Admin phát hành hoặc gia hạn gói.</p></div>}</section>
    </div>
  );
}
export default function NailTenantAdminPortal({
  account,
  tenant,
  subscriptionPackage,
  availablePackages,
  invoices,
  upgradeRequests,
  onRequestUpgrade,
  onCancelUpgradeRequest,
  onSubmitInvoicePaymentProof,
  onUpdateTenant,
  onLogout,
  themeMode = 'light',
  onThemeChange,
  interfaceLanguage = 'vi',
  onLanguageChange,
  tickets = [],
  onTicketsChange = () => {},
  announcements,
  onUpdateAnnouncements
}: NailTenantAdminPortalProps) {
  const t = useT();
  const tenantName = tenant?.name || account.tenantName || 'Nailé Studio';
  const demoStorageKey = `tenant-admin-demo-mode:${tenantName}`;
  const [demoMode, setDemoMode] = useState(() => {
    if (typeof window === 'undefined' || !tenant) return true;
    const stored = window.localStorage.getItem(demoStorageKey);
    return stored === 'true';
  });
  const [dataModeReady, setDataModeReady] = useState(false);
  const [demoRevision, setDemoRevision] = useState(0);
  const pendingUpgradeRequest = tenant
    ? (upgradeRequests.find((request) => (request.tenantId === tenant.id || request.tenantName === tenantName) && request.status === 'PENDING')
      || (tenant.pendingSubscriptionChange ? {
          id: tenant.pendingSubscriptionChange.requestId || `UPG-${tenant.id}-PENDING`,
          tenantId: tenant.id,
          tenantName: tenantName,
          requestedByName: account.displayName,
          requestedByEmail: account.email,
          currentPackageId: subscriptionPackage?.id,
          currentPackageName: tenant.packageName,
          requestedPackageId: tenant.pendingSubscriptionChange.packageId || '',
          requestedPackageName: tenant.pendingSubscriptionChange.packageName,
          billingCycle: tenant.pendingSubscriptionChange.billingCycle || 'monthly',
          effectiveDate: (tenant.effectiveDate || 'immediate') as 'immediate' | 'next_cycle',
          quotedAmount: tenant.pendingSubscriptionChange.price || 0,
          currency: tenant.pendingSubscriptionChange.currency || 'VND',
          status: 'PENDING' as const,
          requestedAt: tenant.pendingSubscriptionChange.requestedAt || new Date().toISOString()
        } : undefined))
    : undefined;
  useLayoutEffect(() => {
    setTenantAdminDataMode(demoMode || !tenant ? 'demo' : 'live');
    setDataModeReady(true);
  }, [demoMode, tenant]);
  const currentPackage = useMemo(
    () => normalizeSubscriptionPackage(subscriptionPackage || FALLBACK_SUBSCRIPTION_PACKAGE),
    [subscriptionPackage]
  );
  const normalizedAvailablePackages = useMemo(
    () => availablePackages.map(normalizeSubscriptionPackage),
    [availablePackages]
  );
  const [activePage, setActivePage] = useState<NailPageId>('overview');
  const [appointmentBookingRequest, setAppointmentBookingRequest] = useState<{
    requestId: number;
    customerId: string;
    name: string;
    phone: string;
    branch: 'Q1' | 'Q3';
    note: string;
    allergies: string;
    nailCondition: string;
    favoriteTechnician: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('tenant-admin-sidebar-collapsed') === 'true'
  ));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [branch, setBranch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [selectedRow, setSelectedRow] = useState<NailRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingBranchChange, setPendingBranchChange] = useState<{
    branch: Branch;
    updatedBranches: Branch[];
    isEditing: boolean;
    requiredSelections: { branchRole: string; branchModel: string; status: string };
  } | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [lockedPage, setLockedPage] = useState<NailPageId | null>(null);

  const allAnnouncements = useMemo(
    () => announcements || loadSystemAnnouncements(),
    [announcements]
  );
  const currentTenantId = tenant?.id || 'TENANT-DEFAULT';
  const tenantAnnouncements = useMemo(
    () => getAnnouncementsForTenant(allAnnouncements, {
      id: currentTenantId,
      name: tenantName,
      packageName: currentPackage.name,
      ...tenant
    }),
    [allAnnouncements, currentTenantId, tenantName, currentPackage.name, tenant]
  );

  const unreadAnnouncements = useMemo(
    () => tenantAnnouncements.filter((a) => !isAnnouncementReadByTenant(a, currentTenantId)),
    [tenantAnnouncements, currentTenantId]
  );
  const unreadAnnouncementsCount = unreadAnnouncements.length;
  
  const emergencyBannerAnnouncement = useMemo(() => {
    return tenantAnnouncements.find((a) => a.bannerEnabled && !isBannerDismissedByTenant(a.id, currentTenantId));
  }, [tenantAnnouncements, currentTenantId]);

  const [notificationTab, setNotificationTab] = useState<'announcements' | 'tasks'>('announcements');
  const [dismissedTaskKeys, setDismissedTaskKeys] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(`dismissed_tasks_${currentTenantId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const operationalTasks = useMemo(() => {
    const defaultTasks = [
      { id: 'TASK_1', title: '4 lịch mới đang chờ xác nhận', detail: 'Lịch sớm nhất lúc 11:30', tone: 'bg-amber-500' },
      { id: 'TASK_2', title: '18 mặt hàng dưới định mức', detail: '6 mặt hàng cần nhập gấp', tone: 'bg-rose-500' },
      { id: 'TASK_3', title: 'Ghế P-04 đang chờ duyệt bảo trì', detail: `Chi phí dự kiến ${formatPlanMoney(850_000)}`, tone: 'bg-violet-500' },
      { id: 'TASK_4', title: 'Checklist mở ca còn thiếu 2 mục', detail: 'Chi nhánh Quận 3', tone: 'bg-blue-500' }
    ];
    return defaultTasks.filter((task) => !dismissedTaskKeys.includes(task.id));
  }, [dismissedTaskKeys]);

  const handleDismissTask = (taskId: string) => {
    const updated = [...dismissedTaskKeys, taskId];
    setDismissedTaskKeys(updated);
    try {
      window.localStorage.setItem(`dismissed_tasks_${currentTenantId}`, JSON.stringify(updated));
    } catch {}
    setToast('Đã đánh dấu hoàn thành tác vụ');
  };

  const handleClearAllTasks = () => {
    const allTaskIds = ['TASK_1', 'TASK_2', 'TASK_3', 'TASK_4'];
    setDismissedTaskKeys(allTaskIds);
    try {
      window.localStorage.setItem(`dismissed_tasks_${currentTenantId}`, JSON.stringify(allTaskIds));
    } catch {}
    setToast('Đã dọn dẹp tất cả việc cần xử lý');
  };

  const handleUpdateAnnouncements = (updaterOrList: SystemAnnouncement[] | ((prev: SystemAnnouncement[]) => SystemAnnouncement[])) => {
    if (onUpdateAnnouncements) {
      onUpdateAnnouncements(updaterOrList);
    }
  };

  const handleDismissEmergencyBanner = (announcementId: string) => {
    const updated = dismissBannerForTenant(announcementId, currentTenantId, allAnnouncements);
    handleUpdateAnnouncements(updated);
    setToast('Đã đóng thanh thông báo khẩn');
  };

  const [staffUsage, setStaffUsage] = useState(tenant?.staffCount ?? nailModuleConfigs.staff.rows.length);
  const [rowsByPage, setRowsByPage] = useState<Partial<Record<NailPageId, NailRow[]>>>(() => {
    const initialRows = Object.fromEntries(Object.entries(nailModuleConfigs).map(([id, config]) => [
      id,
      demoMode || !tenant
        ? config.rows.map((row, index) => ({ ...row, branchCode: row.branchCode || (index % 2 === 0 ? 'Q3' : 'Q1') }))
        : []
    ])) as Partial<Record<NailPageId, NailRow[]>>;
    if (tenant && !demoMode) {
      initialRows.branches = normalizeTenantBranches(tenant).map(branchToNailRow);
    }
    return initialRows;
  });
  const [brandInfo, setBrandInfo] = useState<BrandInfo>(() => ({
    ...nailModuleConfigs.settings.brandInfo!,
    displayName: tenantName || nailModuleConfigs.settings.brandInfo!.displayName,
    logoUrl: tenant?.logoUrl || nailModuleConfigs.settings.brandInfo!.logoUrl,
    hotline: tenant?.phone || nailModuleConfigs.settings.brandInfo!.hotline,
    email: tenant?.contactEmail || tenant?.adminEmail || nailModuleConfigs.settings.brandInfo!.email,
    address: tenant?.address || nailModuleConfigs.settings.brandInfo!.address,
    timezone: tenant?.timezone || nailModuleConfigs.settings.brandInfo!.timezone,
    currency: tenant?.currency || nailModuleConfigs.settings.brandInfo!.currency,
    language: tenant?.defaultLanguage === 'English' ? 'English' : nailModuleConfigs.settings.brandInfo!.language
  }));
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => ({
    ...nailModuleConfigs.settings.paymentSettings!,
    methods: nailModuleConfigs.settings.paymentSettings!.methods.map((method) => ({ ...method }))
  }));
  const accountInitials = account.displayName.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join('') || 'NB';
  const branchLimit = currentPackage.maxSalons;
  const staffLimit = currentPackage.maxStaff;
  const branchRows = rowsByPage.branches || (tenant ? [] : nailModuleConfigs.branches.rows);
  const currentConfig = activePage === 'overview' || activePage === 'subscription' || activePage === 'support' ? null : (nailModuleConfigs[activePage] || null);
  const currentRows = activePage === 'overview' || activePage === 'subscription' || activePage === 'support'
    ? []
    : rowsByPage[activePage] || (demoMode || !tenant ? currentConfig?.rows : []) || [];
  const demoInvoices = useMemo(
    () => createDemoInvoices(tenantName, tenant?.id || 'DEMO-TENANT'),
    [tenant?.id, tenantName]
  );
  const visibleInvoices = useMemo(() => {
    if (!demoMode) return invoices;
    const demoIds = new Set(demoInvoices.map((invoice) => invoice.id));
    return [...demoInvoices, ...invoices.filter((invoice) => !demoIds.has(invoice.id))];
  }, [demoInvoices, demoMode, invoices]);
  /**
   * Biểu mẫu SỬA một hạng mục cấu hình được dựng từ chính bản ghi đang sửa: mỗi
   * cặp chi tiết là một ô mang đúng nhãn của nó. Khi thêm mới thì vẫn dùng khuôn
   * `formFields` chung của module.
   */
  const settingsEditingRow = activePage === 'settings' && editingRowId
    ? currentRows.find((row) => row.id === editingRowId)
    : undefined;
  const settingsFormFields: NailFormField[] | undefined = settingsEditingRow ? [
    { key: '__title', label: 'Tên hạng mục', type: 'text' },
    { key: '__subtitle', label: 'Mô tả ngắn', type: 'text' },
    { key: '__value', label: 'Cấu hình hiện tại', type: 'text' },
    { key: '__scope', label: 'Phạm vi áp dụng', type: 'select' },
    ...settingsEditingRow.details.map((detail, index) => ({
      key: '__detail_' + index,
      label: detail.label,
      type: 'text' as const
    })),
    { key: '__reason', label: 'Lý do thay đổi', type: 'textarea', placeholder: 'Ghi lại lý do để đối chiếu trong nhật ký cấu hình' }
  ] : undefined;
  const scopedRows = activePage === 'branches' || branch === 'ALL' ? currentRows : currentRows.filter((row) => row.branchCode === branch);
  const branchScopeLabel = activePage === 'branches' || branch === 'ALL' ? 'Toàn tenant' : branchRows.find((row) => row.branchCode === branch)?.title || 'Chi nhánh ' + branch;
  const resolvePageAccess = (page: NailPageId) => demoMode
    ? 'full' as TenantPageAccess
    : getTenantPageAccess(currentPackage, page, normalizedAvailablePackages);
  const currentAccessMode = resolvePageAccess(activePage);
  const readOnlyReason = demoMode ? '' : tenant?.status === 'SUSPENDED'
    ? 'Tenant đang tạm ngưng. Bạn chỉ có thể xem dữ liệu và quản lý thanh toán.'
    : tenant?.status === 'OVERDUE'
      ? 'Gói đang quá hạn thanh toán. Các thao tác thay đổi dữ liệu tạm thời bị khóa.'
      : '';
  const lockedCapabilityKey = lockedPage ? getTenantPageCapabilityKey(lockedPage) : undefined;
  const lockedCapabilityLabel = getTenantCapabilityLabel(currentPackage, lockedCapabilityKey);
  const suggestedPackage = lockedPage
    ? findTenantUpgradePackage(normalizedAvailablePackages, currentPackage, lockedCapabilityKey)
    : undefined;
  const finiteUsage = [
    getTenantUsagePercent(branchRows.length, branchLimit, 'branches'),
    getTenantUsagePercent(staffUsage, staffLimit, 'staff')
  ].filter((value) => value > 0);
  const planUsagePercent = finiteUsage.length
    ? Math.min(100, Math.round(finiteUsage.reduce((sum, value) => sum + value, 0) / finiteUsage.length))
    : 0;
  const subscriptionStatusLabel = tenant?.status === 'SUSPENDED' ? t('Tạm ngưng')
    : tenant?.status === 'OVERDUE' ? t('Quá hạn')
      : tenant?.status === 'EXPIRING' ? t('Sắp hết hạn')
        : tenant?.status === 'TRIAL' ? t('Dùng thử')
          : t('Đang hoạt động');
  const subscriptionStatusTone = tenant?.status === 'SUSPENDED' || tenant?.status === 'OVERDUE'
    ? 'bg-rose-400/10 text-rose-300'
    : tenant?.status === 'EXPIRING'
      ? 'bg-amber-400/10 text-amber-300'
      : 'bg-emerald-400/10 text-emerald-300';
  const renewalLabel = formatPlanDate(tenant?.subscriptionRenewsAt || tenant?.trialEndDate);
  const branchScopedCreatePages = new Set<NailPageId>(['appointments', 'stations', 'pos', 'staff', 'inventory', 'finance', 'sanitation']);

  const showPageGate = (page: NailPageId) => {
    setLockedPage(page);
    setSidebarOpen(false);
    setCreateOpen(false);
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('tenant-admin-sidebar-collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = (page: NailPageId) => {
    if (resolvePageAccess(page) === 'locked') {
      showPageGate(page);
      return false;
    }
    setActivePage(page);
    setSearchQuery('');
    setSelectedRow(null);
    setCreateOpen(false);
    setActiveTab(page === 'overview' || page === 'subscription' || page === 'support' ? '' : (nailModuleConfigs[page]?.tabs?.[0] || ''));
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const bookCustomerFromProfile = (customer: {
    id: string;
    name: string;
    phone: string;
    branch: 'Q1' | 'Q3';
    note: string;
    allergies: string;
    nailCondition: string;
    favoriteTechnician: string;
  }) => {
    const appointmentAccess = resolvePageAccess('appointments');
    if (appointmentAccess !== 'full') {
      showPageGate('appointments');
      return;
    }
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (!navigate('appointments')) return;
    setBranch(customer.branch);
    setAppointmentBookingRequest({
      requestId: Date.now(),
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      branch: customer.branch,
      note: customer.note,
      allergies: customer.allergies,
      nailCondition: customer.nailCondition,
      favoriteTechnician: customer.favoriteTechnician
    });
  };

  const openCreate = (page?: Exclude<NailPageId, 'overview' | 'subscription' | 'support'>) => {
    const targetPage = (page || activePage) as NailPageId;
    const access = resolvePageAccess(targetPage);
    if (access !== 'full') {
      showPageGate(targetPage);
      return;
    }
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (!demoMode && targetPage === 'branches' && !isUnlimitedTenantLimit(branchLimit, 'branches') && branchRows.length >= branchLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + branchLimit + ' chi nhánh. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    if (!demoMode && targetPage === 'staff' && !isUnlimitedTenantLimit(staffLimit, 'staff') && staffUsage >= staffLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + staffLimit + ' nhân sự. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    if (targetPage !== 'branches' && branchScopedCreatePages.has(targetPage) && branch === 'ALL') {
      setToast('Vui lòng chọn một chi nhánh cụ thể trước khi tạo dữ liệu vận hành.');
      return;
    }
    if (page && page !== activePage && !navigate(page)) return;
    setEditingRowId(null);
    if (targetPage === 'branches') {
      const existingBranches = tenant ? normalizeTenantBranches(tenant) : [];
      const defaultName = `${tenantName} - Chi nhánh ${existingBranches.length + 1}`;
      setFormValues({ name: defaultName, code: generateBranchCode(defaultName, tenantName, existingBranches), branchRole: '', branchModel: '', status: '', openingHours: '08:00–21:00', stations: '8', staffCount: '0', staffCapacity: '8', monthlyRevenue: '0', capacityPercent: '0', services: 'Manicure, Pedicure, Sơn Gel, Nail Art' });
    } else setFormValues({});
    setCreateOpen(true);
  };

  const exportRows = () => {
    if (!currentConfig) return;
    if (resolvePageAccess(currentConfig.id) === 'locked') {
      showPageGate(currentConfig.id);
      return;
    }
    const header = currentConfig.columns.join(',');
    const body = scopedRows.map((row) => [row.title, ...row.cells, row.badge].join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = currentConfig.id + '-naile-studio.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setToast('Đã xuất dữ liệu ' + currentConfig.title + '.');
  };

  const buildDemoRows = () => Object.fromEntries(Object.entries(nailModuleConfigs).map(([id, config]) => [
    id,
    config.rows.map((row, index) => ({ ...row, branchCode: row.branchCode || (index % 2 === 0 ? 'Q3' : 'Q1') }))
  ])) as Partial<Record<NailPageId, NailRow[]>>;

  const loadDemoData = () => {
    window.localStorage.setItem(demoStorageKey, 'true');
    setTenantAdminDataMode('demo');
    setDemoMode(true);
    setRowsByPage(buildDemoRows());
    setStaffUsage(nailModuleConfigs.staff.rows.length);
    setDemoRevision((current) => current + 1);
    setSelectedRow(null);
    setCreateOpen(false);
    setToast('Đã nạp lại dữ liệu demo cho toàn bộ trang Tenant Admin. Bạn có thể thử các bộ lọc, form và nút thao tác.');
  };

  const clearDemoData = () => {
    window.localStorage.setItem(demoStorageKey, 'false');
    setTenantAdminDataMode(tenant ? 'live' : 'demo');
    setDemoMode(!tenant);
    const liveRows = Object.fromEntries(Object.keys(nailModuleConfigs).map((id) => [id, []])) as Partial<Record<NailPageId, NailRow[]>>;
    if (tenant) liveRows.branches = normalizeTenantBranches(tenant).map(branchToNailRow);
    setRowsByPage(liveRows);
    setStaffUsage(tenant?.staffCount || 0);
    setDemoRevision((current) => current + 1);
    setSelectedRow(null);
    setCreateOpen(false);
    setToast(tenant ? 'Đã tắt chế độ kiểm thử và loại dữ liệu demo khỏi các trang.' : 'Tài khoản demo luôn cần dữ liệu mẫu để hoạt động.');
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!currentConfig) return;
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (resolvePageAccess(currentConfig.id) !== 'full') {
      showPageGate(currentConfig.id);
      return;
    }
    if (!demoMode && currentConfig.id === 'branches' && !editingRowId && !isUnlimitedTenantLimit(branchLimit, 'branches') && branchRows.length >= branchLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + branchLimit + ' chi nhánh. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    if (!demoMode && currentConfig.id === 'staff' && !isUnlimitedTenantLimit(staffLimit, 'staff') && staffUsage >= staffLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + staffLimit + ' nhân sự. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    const fields = currentConfig.formFields;
    if (currentConfig.id === 'branches' && tenant && !demoMode) {
      const requiredSelectionErrors = getRequiredBranchSelectionErrors(formValues);
      if (Object.keys(requiredSelectionErrors).length > 0) {
        setToast('Vui lòng chọn đủ vai trò trong tenant, mô hình kinh doanh và trạng thái chi nhánh.');
        return;
      }
      const rawCode = (formValues.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const branchId = editingRowId || (rawCode.startsWith('BR-') ? rawCode : `BR-${rawCode || Date.now().toString().slice(-6)}`);
      const currentBranches = normalizeTenantBranches(tenant);
      if (!editingRowId && currentBranches.some((item) => item.id === branchId || item.code === branchId)) {
        setToast('Mã chi nhánh ' + branchId + ' đã tồn tại. Vui lòng dùng mã khác.');
        return;
      }
      const existingBranch = currentBranches.find((item) => item.id === editingRowId);
      const isPrimary = formValues.branchRole === 'Chi nhánh chính';
      if (existingBranch?.isPrimary && !isPrimary && !currentBranches.some((item) => item.id !== existingBranch.id && item.isPrimary)) {
        setToast('Tenant phải có một chi nhánh chính. Hãy đặt chi nhánh khác làm chi nhánh chính trước.');
        return;
      }
      const model = BRANCH_MODEL_OPTIONS.find((option) => option.label === formValues.branchModel)?.value || 'FULL_SERVICE';
      const status: Branch['status'] = formValues.status === 'Chuẩn bị mở' ? 'PLANNING' : formValues.status === 'Tạm ngưng' ? 'INACTIVE' : 'ACTIVE';
      const staffCount = Math.max(0, Number(formValues.staffCount || existingBranch?.staffUsed || 0));
      const stationCount = Math.max(1, Number(formValues.stations || existingBranch?.stationCount || 1));
      const services = formValues.services?.split(',').map((item) => item.trim()).filter(Boolean) || [];
      const otherStaffCount = currentBranches.filter((item) => item.id !== editingRowId).reduce((sum, item) => sum + item.staffUsed, 0);
      const maxAdditionalStaff = isUnlimitedTenantLimit(staffLimit, 'staff') ? null : Math.max(0, staffLimit - otherStaffCount);
      const validation = validateBranchDraft({
        id: branchId,
        name: formValues.name || '',
        address: formValues.address || '',
        model,
        status,
        managerName: formValues.manager || '',
        phone: formValues.phone || '',
        email: formValues.email || '',
        openingHours: formValues.openingHours || '',
        openingDate: formValues.openingDate || undefined,
        stationCount,
        staffUsed: staffCount,
        staffCapacity: Number(formValues.staffCapacity || stationCount),
        monthlyRevenue: Number(formValues.monthlyRevenue || 0),
        capacityPercent: Number(formValues.capacityPercent || 0),
        services
      }, currentBranches, { editingId: editingRowId, maxAdditionalStaff });
      if (!validation.isValid) {
        setToast('Thông tin chi nhánh chưa hợp lệ. Vui lòng kiểm tra các điều kiện trong biểu mẫu.');
        return;
      }
      const nextBranch = normalizeBranch({
        ...(existingBranch || {} as Branch),
        id: branchId,
        code: rawCode || existingBranch?.code || branchId,
        name: formValues.name?.trim() || 'Chi nhánh mới',
        address: formValues.address?.trim() || 'Chưa cập nhật',
        model,
        isPrimary,
        managerName: formValues.manager?.trim() || 'Chưa phân công',
        phone: formValues.phone?.trim() || 'Chưa cập nhật',
        email: formValues.email?.trim() || '',
        province: formValues.province || 'Chưa cập nhật',
        timezone: tenant.timezone || 'Asia/Ho_Chi_Minh',
        openingHours: formValues.openingHours?.trim() || '08:00–21:00',
        openingDate: formValues.openingDate || undefined,
        stationCount,
        staffCapacity: Math.max(staffCount, Number(formValues.staffCapacity || stationCount)),
        staffUsed: staffCount,
        staffCount,
        staffLimit,
        taxCode: formValues.taxCode?.trim() || '',
        services,
        monthlyRevenue: Math.max(0, Number(formValues.monthlyRevenue || 0)),
        capacityPercent: Math.max(0, Math.min(100, Number(formValues.capacityPercent || 0))),
        status,
        note: formValues.note?.trim() || '',
        updatedAt: new Date().toISOString()
      }, tenant, existingBranch ? currentBranches.indexOf(existingBranch) : currentBranches.length);
      const normalizedCurrent = isPrimary ? currentBranches.map((item) => ({ ...item, isPrimary: false })) : currentBranches;
      const updatedBranches = editingRowId
        ? normalizedCurrent.map((item) => item.id === editingRowId ? nextBranch : item)
        : [...normalizedCurrent, nextBranch];
      setCreateOpen(false);
      setPendingBranchChange({
        branch: nextBranch,
        updatedBranches,
        isEditing: Boolean(existingBranch),
        requiredSelections: {
          branchRole: formValues.branchRole,
          branchModel: formValues.branchModel,
          status: formValues.status
        }
      });
      return;
    }
    // Sửa một hạng mục cấu hình: cập nhật ĐÚNG bản ghi đang mở, giữ nguyên mã,
    // trạng thái và nhãn của từng cặp chi tiết. Nhánh chung bên dưới luôn thêm
    // bản ghi mới, nên trước đây bấm "Chỉnh sửa" rồi lưu lại sinh ra bản trùng.
    if (currentConfig.id === 'settings' && editingRowId) {
      const target = currentRows.find((row) => row.id === editingRowId);
      if (target) {
        const now = new Date();
        const stamp = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0')
          + ' · ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const updatedRow: NailRow = {
          ...target,
          title: formValues.__title?.trim() || target.title,
          subtitle: formValues.__subtitle?.trim() || target.subtitle,
          cells: [
            formValues.__value?.trim() || target.cells[0] || '—',
            formValues.__scope?.trim() || target.cells[1] || '—',
            account.displayName,
            stamp
          ],
          details: target.details.map((detail, index) => ({
            label: detail.label,
            value: formValues['__detail_' + index]?.trim() || detail.value
          })),
          note: formValues.__note?.trim() || target.note
        };
        setRowsByPage((current) => ({
          ...current,
          settings: (current.settings || currentRows).map((row) => (row.id === editingRowId ? updatedRow : row))
        }));
        setEditingRowId(null);
        setCreateOpen(false);
        setFormValues({});
        setToast('Đã cập nhật “' + updatedRow.title + '”.');
        return;
      }
    }
    const title = formValues[fields[0]?.key] || currentConfig.primaryAction + ' mới';
    const values = fields.slice(1).map((field) => formValues[field.key]).filter(Boolean);
    const cellCount = Math.max(1, currentConfig.columns.length - 2);
    const newRow: NailRow = {
      id: 'NEW-' + Date.now().toString().slice(-6),
      title,
      subtitle: 'Vừa tạo · Chờ hoàn thiện thông tin',
      cells: Array.from({ length: cellCount }, (_, index) => values[index] || '—'),
      badge: 'Mới tạo',
      badgeTone: 'blue',
      details: fields.map((field) => ({ label: field.label, value: formValues[field.key] || '—' })),
      note: formValues.note || formValues.description || '',
      branchCode: currentConfig.id === 'branches' ? (formValues.code || 'NEW').trim().toUpperCase() : branch
    };
    setRowsByPage((current) => ({ ...current, [activePage]: [newRow, ...(current[activePage] || currentRows)] }));
    if (currentConfig.id === 'staff') setStaffUsage((value) => value + 1);
    setCreateOpen(false);
    setFormValues({});
    setToast('Đã tạo “' + title + '” trong ' + currentConfig.title + '.');
  };

  const confirmTenantBranchChange = () => {
    if (!pendingBranchChange || !tenant) return;
    if (Object.keys(getRequiredBranchSelectionErrors(pendingBranchChange.requiredSelections)).length > 0) {
      setToast('Không thể lưu: vui lòng chọn đủ vai trò, mô hình kinh doanh và trạng thái chi nhánh.');
      setPendingBranchChange(null);
      setCreateOpen(true);
      return;
    }
    const updatedStaffCount = pendingBranchChange.updatedBranches.reduce((sum, item) => sum + item.staffUsed, 0);
    const activity = {
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user: account.displayName,
      type: 'branch',
      description: `${pendingBranchChange.isEditing ? 'Cập nhật' : 'Thêm'} chi nhánh "${pendingBranchChange.branch.name}" từ Tenant Admin.`
    };
    onUpdateTenant?.(tenant.id, { branches: pendingBranchChange.updatedBranches, staffCount: updatedStaffCount, customActivities: [activity, ...(tenant.customActivities || [])] });
    setRowsByPage((current) => ({ ...current, branches: pendingBranchChange.updatedBranches.map(branchToNailRow) }));
    setToast(`Đã ${pendingBranchChange.isEditing ? 'cập nhật' : 'thêm'} chi nhánh “${pendingBranchChange.branch.name}”. Dữ liệu đã đồng bộ với Super Admin.`);
    setPendingBranchChange(null);
    setEditingRowId(null);
    setFormValues({});
  };

  const openEdit = () => {
    if (!selectedRow || !currentConfig) return;
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (resolvePageAccess(currentConfig.id) !== 'full') {
      showPageGate(currentConfig.id);
      return;
    }
    if (currentConfig.id === 'branches' && tenant && !demoMode) {
      const branchRecord = normalizeTenantBranches(tenant).find((item) => item.id === selectedRow.id);
      if (branchRecord) {
        setEditingRowId(branchRecord.id);
        setFormValues({
          name: branchRecord.name,
          code: branchRecord.code || branchRecord.id,
          branchRole: branchRecord.isPrimary ? 'Chi nhánh chính' : 'Chi nhánh thành viên',
          branchModel: getBranchModelLabel(branchRecord.model),
          status: getBranchStatusLabel(branchRecord.status),
          province: branchRecord.province || '',
          address: branchRecord.address,
          manager: branchRecord.managerName || '',
          phone: branchRecord.phone || '',
          email: branchRecord.email || '',
          openingHours: branchRecord.openingHours || '',
          openingDate: branchRecord.openingDate || '',
          stations: String(branchRecord.stationCount || 0),
          staffCount: String(branchRecord.staffUsed || 0),
          staffCapacity: String(branchRecord.staffCapacity || 0),
          taxCode: branchRecord.taxCode || '',
          monthlyRevenue: String(branchRecord.monthlyRevenue || 0),
          capacityPercent: String(branchRecord.capacityPercent || 0),
          services: branchRecord.services?.join(', ') || '',
          note: branchRecord.note || ''
        });
        setSelectedRow(null);
        setCreateOpen(true);
        return;
      }
    }
    // Hạng mục của trang Cài đặt được sửa tại chỗ bằng biểu mẫu dựng từ chính
    // bản ghi, nên mọi cặp chi tiết đều có ô riêng và giữ đúng nhãn của nó.
    // Khuôn `formFields` chung chỉ có 5 ô cố định và trước đây được điền theo
    // VỊ TRÍ (`details[index]`), khiến "Tên hạng mục" nhận giá trị của chi tiết
    // thứ hai còn hai ô select nhận giá trị không nằm trong danh sách nên hiện
    // trống.
    if (currentConfig.id === 'settings') {
      const nextValues: Record<string, string> = {
        __title: selectedRow.title,
        __subtitle: selectedRow.subtitle,
        __value: selectedRow.cells[0] || '',
        __scope: selectedRow.cells[1] || '',
        __note: selectedRow.note || '',
        __reason: ''
      };
      selectedRow.details.forEach((detail, index) => { nextValues['__detail_' + index] = detail.value; });
      setEditingRowId(selectedRow.id);
      setFormValues(nextValues);
      setSelectedRow(null);
      setCreateOpen(true);
      return;
    }
    const nextValues: Record<string, string> = {};
    currentConfig.formFields.forEach((field, index) => { nextValues[field.key] = index === 0 ? selectedRow.title : selectedRow.details[index]?.value || ''; });
    setFormValues(nextValues);
    setSelectedRow(null);
    setCreateOpen(true);
  };

  const updateSelectedRowStatus = () => {
    if (!selectedRow) return;
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    setToast('Đã cập nhật trạng thái “' + selectedRow.title + '”.');
    setSelectedRow(null);
  };

  const handleBrandInfoChange = (key: keyof BrandInfo, value: string) => {
    setBrandInfo((current) => ({ ...current, [key]: value }));
  };

  const handleBrandInfoSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    setToast('Đã lưu thông tin thương hiệu của ' + tenantName + '.');
  };

  // Công tắc phương thức thanh toán có hiệu lực ngay (README §11.3), nên mỗi
  // thay đổi tự xác nhận bằng toast thay vì chờ một nút Lưu chung.
  const handlePaymentMethodToggle = (key: string, enabled: boolean) => {
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    const method = paymentSettings.methods.find((item) => item.key === key);
    if (!method) return;
    setPaymentSettings((current) => ({
      ...current,
      methods: current.methods.map((item) => (item.key === key ? { ...item, enabled } : item))
    }));
    setToast('Đã ' + (enabled ? 'bật' : 'tắt') + ' thanh toán qua ' + method.label + '.');
  };

  const handleRefundApprovalChange = (value: string) => {
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    setPaymentSettings((current) => ({ ...current, refundApproval: value }));
    setToast('Đã đổi cấp duyệt hoàn tiền thành “' + value + '”.');
  };
  const liveTenantBranchValidation = (() => {
    if (currentConfig?.id !== 'branches' || !tenant) return { errors: {} as Record<string, string>, isValid: true };
    const existingBranches = normalizeTenantBranches(tenant);
    const existingBranch = existingBranches.find((item) => item.id === editingRowId);
    const model = BRANCH_MODEL_OPTIONS.find((option) => option.label === formValues.branchModel)?.value || 'FULL_SERVICE';
    const status: Branch['status'] = formValues.status === 'Chuẩn bị mở' ? 'PLANNING' : formValues.status === 'Tạm ngưng' ? 'INACTIVE' : 'ACTIVE';
    const otherStaffCount = existingBranches.filter((item) => item.id !== editingRowId).reduce((sum, item) => sum + item.staffUsed, 0);
    const branchValidation = validateBranchDraft({
      id: editingRowId || formValues.code,
      name: formValues.name || '',
      address: formValues.address || '',
      model,
      status,
      managerName: formValues.manager || '',
      phone: formValues.phone || '',
      email: formValues.email || '',
      openingHours: formValues.openingHours || '',
      openingDate: formValues.openingDate || undefined,
      stationCount: Number(formValues.stations || 0),
      staffUsed: Number(formValues.staffCount || existingBranch?.staffUsed || 0),
      staffCapacity: Number(formValues.staffCapacity || 0),
      monthlyRevenue: Number(formValues.monthlyRevenue || 0),
      capacityPercent: Number(formValues.capacityPercent || 0),
      services: formValues.services?.split(',').map((item) => item.trim()).filter(Boolean) || []
    }, existingBranches, { editingId: editingRowId, maxAdditionalStaff: isUnlimitedTenantLimit(staffLimit, 'staff') ? null : Math.max(0, staffLimit - otherStaffCount) });
    const errors = { ...getRequiredBranchSelectionErrors(formValues), ...branchValidation.errors };
    return { errors, isValid: Object.keys(errors).length === 0 };
  })();
  if (!dataModeReady) {
    return (
      <div className="role-shell role-shell--tenant flex min-h-screen items-center justify-center bg-[#f5f7fb] text-sm font-bold text-slate-500">
        Đang chuẩn bị dữ liệu tenant...
      </div>
    );
  }
  return (
    <div className="role-shell role-shell--tenant nail-admin min-h-screen bg-[#f5f7fb] text-slate-950">
      <a href="#tenant-admin-main" className="tenant-admin-skip-link">
        Bỏ qua điều hướng
      </a>
      {toast && <div className="fixed right-4 top-24 z-[90] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><p className="text-caption font-bold text-slate-700">{toast}</p><button type="button" onClick={() => setToast('')} aria-label="Đóng thông báo" className="ml-2 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button></div>}
      {sidebarOpen && <button type="button" aria-label="Đóng lớp phủ menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 min-h-0 rounded-none border-0 bg-slate-950/45 p-0 shadow-none lg:hidden" />}
      {pendingBranchChange && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><section className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="bg-gradient-to-br from-[#19152f] to-[#35245e] p-6 text-white"><p className="text-caption font-black uppercase tracking-[0.16em] text-violet-300">Bước xác nhận cuối</p><h2 className="mt-2 text-xl font-black">{pendingBranchChange.isEditing ? 'Xác nhận cập nhật chi nhánh' : 'Xác nhận thêm chi nhánh'}</h2><p className="mt-2 text-xs leading-5 text-slate-300">Dữ liệu sau khi xác nhận sẽ được đồng bộ cho cả Tenant Admin và Super Admin.</p></div><div className="space-y-4 p-6"><div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-violet-700">{pendingBranchChange.branch.code}</span><span className="rounded-full bg-white px-2 py-1 text-caption font-bold text-violet-700">{getBranchModelLabel(pendingBranchChange.branch.model)}</span>{pendingBranchChange.branch.isPrimary && <span className="rounded-full bg-slate-900 px-2 py-1 text-caption font-bold text-white">Chi nhánh chính</span>}</div><p className="mt-2 text-base font-black text-slate-900">{pendingBranchChange.branch.name}</p><p className="mt-1 text-xs text-slate-500">{pendingBranchChange.branch.address}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-caption font-bold text-slate-400">Quản lý</p><p className="mt-1 text-xs font-black text-slate-700">{pendingBranchChange.branch.managerName}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-caption font-bold text-slate-400">Trạng thái</p><p className="mt-1 text-xs font-black text-slate-700">{getBranchStatusLabel(pendingBranchChange.branch.status)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-caption font-bold text-slate-400">Nguồn lực</p><p className="mt-1 text-xs font-black text-slate-700">{pendingBranchChange.branch.staffUsed} nhân sự · {pendingBranchChange.branch.stationCount} vị trí</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-caption font-bold text-slate-400">Hạn mức sau lưu</p><p className="mt-1 text-xs font-black text-slate-700">{pendingBranchChange.updatedBranches.length} / {isUnlimitedTenantLimit(branchLimit, 'branches') ? 'Không giới hạn' : branchLimit + ' chi nhánh'}</p></div></div></div><div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setPendingBranchChange(null); setCreateOpen(true); }} className="h-11 border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm">Quay lại chỉnh sửa</button><button type="button" onClick={confirmTenantBranchChange} className="h-11 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200">{pendingBranchChange.isEditing ? 'Xác nhận cập nhật' : 'Xác nhận thêm chi nhánh'}</button></div></section></div>}

      <aside className={`role-sidebar fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#111625] text-white shadow-2xl transition-[width,transform] duration-300 lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex h-[68px] shrink-0 items-center gap-3 border-b border-white/8 px-4 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="tenant-brand-mark relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600 text-white shadow-lg shadow-pink-200/60"><Sparkles className="h-5 w-5" /><span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-white/80" /></div>
            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}><p className="truncate text-sm font-black tracking-tight">{tenantName}</p><p className="mt-0.5 truncate text-caption font-semibold uppercase tracking-[0.18em] text-slate-400">Nail · Beauty · Care</p></div>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" className="ml-auto flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none lg:hidden"><X className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
            className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ${
              sidebarCollapsed ? 'hidden' : ''
            }`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex ? 'mt-5' : ''}>
              <p className={`mb-2 px-3 text-caption font-bold uppercase tracking-[0.16em] text-slate-600 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{t(group.label)}</p>
              <nav className="space-y-1">{group.items.map(({ id, label, icon: Icon, badge }) => {
                const active = activePage === id;
                const access = resolvePageAccess(id);
                const locked = access === 'locked';
                const limitBadge = id === 'branches'
                  ? branchRows.length + '/' + (isUnlimitedTenantLimit(branchLimit, 'branches') ? '∞' : branchLimit)
                  : id === 'staff'
                    ? staffUsage + '/' + (isUnlimitedTenantLimit(staffLimit, 'staff') ? '∞' : staffLimit)
                    : id === 'announcements' && unreadAnnouncementsCount > 0
                      ? String(unreadAnnouncementsCount)
                      : badge;
                return (
                  <button key={id} type="button" onClick={() => navigate(id)} aria-current={active ? 'page' : undefined} aria-disabled={locked} title={(sidebarCollapsed ? t(label) : '') + (locked ? (sidebarCollapsed ? ' · ' : '') + 'Chưa có trong gói ' + currentPackage.name : '') || undefined} className={'flex h-10 w-full items-center gap-3 border-0 px-3 text-left text-caption font-bold shadow-none ' + (sidebarCollapsed ? 'lg:justify-center lg:px-0 ' : '') + (active ? 'bg-violet-500/18 text-violet-200 ring-1 ring-violet-400/20' : locked ? 'bg-transparent text-slate-600 hover:bg-white/5 hover:text-slate-300' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white')}>
                    <Icon className={'h-4 w-4 ' + (active ? 'text-violet-400' : locked ? 'text-slate-600' : '')} />
                    <span className={`min-w-0 flex-1 truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{t(label)}</span>
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{locked ? <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-caption text-amber-300"><LockKeyhole className="h-2.5 w-2.5" />{t('Khóa')}</span> : limitBadge && <span className={'rounded-full px-2 py-0.5 text-caption ' + (active ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-500')}>{limitBadge}</span>}</span>
                  </button>
                );
              })}</nav>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => navigate('subscription')} aria-current={activePage === 'subscription' ? 'page' : undefined} title={sidebarCollapsed ? t('Gói {plan}', { plan: currentPackage.name }) : undefined} className={'m-3 shrink-0 rounded-2xl border text-left shadow-none ' + (sidebarCollapsed ? 'lg:flex lg:h-12 lg:items-center lg:justify-center lg:p-0' : 'p-4 ') + (activePage === 'subscription' ? 'border-violet-400/50 bg-violet-500/15 ring-1 ring-violet-400/20' : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.07]')}>
          {sidebarCollapsed && <PackageCheck className="hidden h-5 w-5 text-violet-300 lg:block" />}
          <div className={sidebarCollapsed ? 'lg:hidden' : ''}><div className="mb-3 flex items-center justify-between gap-2"><span className="truncate text-caption font-bold text-slate-300">{t('Gói {plan}', { plan: currentPackage.name })}</span><span className={'shrink-0 rounded-full px-2 py-1 text-caption font-bold ' + subscriptionStatusTone}>{subscriptionStatusLabel}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-pink-100"><div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500" style={{ width: Math.max(8, planUsagePercent) + '%' }} /></div>
          <div className="mt-2 flex items-center justify-between gap-2"><p className="text-caption leading-4 text-slate-500">{planUsagePercent > 0 ? t('{percent}% hạn mức', { percent: planUsagePercent }) : t('Hạn mức linh hoạt')} · {t('Gia hạn')} {renewalLabel}</p><ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300" /></div></div>
        </button>
        <div className="hidden shrink-0 border-t border-white/8 p-3 lg:block">
          <button type="button" onClick={toggleSidebarCollapsed} aria-label={sidebarCollapsed ? t('Mở rộng thanh điều hướng') : t('Thu gọn thanh điều hướng')} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? t('Mở rộng thanh điều hướng') : undefined} className={`tenant-sidebar-toggle flex h-10 w-full items-center border p-0 ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3 px-3'}`}>
            {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" className="h-4 w-4" /> : <PanelLeftClose aria-hidden="true" className="h-4 w-4" />}
            <span className={sidebarCollapsed ? 'hidden' : 'text-caption font-bold'}>{t('Thu gọn thanh bên')}</span>
          </button>
        </div>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[272px]'}`}>
        <header className="role-topbar sticky top-0 z-40 flex h-[68px] items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm lg:hidden"><Menu className="h-5 w-5" /></button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
            className="hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 text-slate-600 shadow-sm hover:bg-slate-50 transition cursor-pointer"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={`Tìm trong ${formatModuleLabel(activePage).toLocaleLowerCase('vi')}...`} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-caption font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></div>
          <div className="hidden sm:block"><BeautifulSelect value={branch} onChange={(event) => { setBranch(event.target.value); setSearchQuery(''); setSelectedRow(null); }} aria-label={t('Chọn phạm vi chi nhánh')} className="h-10 w-52 rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"><option value="ALL">{t('Tất cả chi nhánh')}</option>{branchRows.map((row) => <option key={row.id} value={row.branchCode}>{row.title}</option>)}</BeautifulSelect></div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowNotifications((value) => !value); setShowProfile(false); }}
                aria-label="Thông báo"
                className="relative flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm rounded-xl cursor-pointer hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                {unreadAnnouncementsCount + 4 > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                    {unreadAnnouncementsCount + 4}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">
                  <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <p className="text-caption font-black text-slate-800">Trung tâm thông báo</p>
                      <span className="text-[10px] font-bold text-slate-400">
                        {unreadAnnouncementsCount} tin mới
                      </span>
                    </div>
                    <div className="mt-2.5 flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setNotificationTab('announcements')}
                        className={`flex-1 py-1 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          notificationTab === 'announcements'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>Bản tin hệ thống</span>
                        {unreadAnnouncementsCount > 0 && (
                          <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">
                            {unreadAnnouncementsCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationTab('tasks')}
                        className={`flex-1 py-1 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          notificationTab === 'tasks'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>Việc cần xử lý</span>
                        <span className="bg-slate-400 text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">4</span>
                      </button>
                    </div>
                  </div>

                  {notificationTab === 'announcements' ? (
                    <div>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-[11px] font-bold text-slate-500">
                          {tenantAnnouncements.length} thông báo hiện hành
                        </span>
                        {unreadAnnouncementsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = markAllAnnouncementsRead(currentTenantId, allAnnouncements);
                              handleUpdateAnnouncements(updated);
                              setToast('Đã đánh dấu tất cả đã đọc');
                            }}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-800 cursor-pointer"
                          >
                            Đọc tất cả ({unreadAnnouncementsCount})
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {tenantAnnouncements.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            Hiện không có thông báo nào từ Superadmin.
                          </div>
                        ) : (
                          tenantAnnouncements.slice(0, 6).map((ann) => {
                            const isRead = isAnnouncementReadByTenant(ann, currentTenantId);
                            return (
                              <div
                                key={ann.id}
                                className={`w-full flex items-start justify-between gap-2 px-3.5 py-2.5 hover:bg-slate-50 transition ${
                                  !isRead ? 'bg-violet-50/40' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = markAnnouncementRead(ann.id, currentTenantId, allAnnouncements);
                                    handleUpdateAnnouncements(updated);
                                    setShowNotifications(false);
                                    navigate('announcements');
                                  }}
                                  className="min-w-0 flex-1 text-left flex items-start gap-2.5 cursor-pointer"
                                >
                                  <span
                                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                      ann.priority === 'URGENT'
                                        ? 'bg-rose-500'
                                        : ann.priority === 'HIGH'
                                        ? 'bg-amber-500'
                                        : 'bg-violet-500'
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs truncate ${!isRead ? 'text-slate-900 font-extrabold' : 'text-slate-700 font-bold'}`}>
                                      {ann.title}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{ann.summary}</p>
                                    <span className="mt-0.5 inline-block text-[10px] text-slate-400">
                                      {new Date(ann.publishedAt).toLocaleDateString('vi-VN')} · {ann.authorName}
                                    </span>
                                  </div>
                                </button>
                                {!isRead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = markAnnouncementRead(ann.id, currentTenantId, allAnnouncements);
                                      handleUpdateAnnouncements(updated);
                                      setToast('Đã đánh dấu đã đọc');
                                    }}
                                    title="Đánh dấu đã đọc"
                                    className="shrink-0 p-1 text-[10px] font-bold text-violet-600 hover:text-violet-800 hover:bg-violet-100 rounded transition cursor-pointer"
                                  >
                                    Đã đọc
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            navigate('announcements');
                          }}
                          className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
                        >
                          Xem tất cả bản tin ({tenantAnnouncements.length}) →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-[11px] font-bold text-slate-500">
                          {operationalTasks.length} việc cần xử lý
                        </span>
                        {operationalTasks.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllTasks}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Dọn tất cả
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {operationalTasks.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            Không có công việc nào cần xử lý. Rất gọn gàng!
                          </div>
                        ) : (
                          operationalTasks.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-caption font-bold text-slate-700">{item.title}</p>
                                  <p className="mt-0.5 text-caption text-slate-400">{item.detail}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDismissTask(item.id)}
                                title="Đánh dấu đã hoàn thành / Ẩn việc này"
                                className="shrink-0 p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative"><button type="button" onClick={() => { setShowProfile((value) => !value); setShowNotifications(false); }} className="flex h-11 items-center gap-2 border-0 bg-transparent px-1.5 text-left shadow-none"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-caption font-black text-white shadow-sm shadow-pink-100">{accountInitials}</span><span className="hidden md:block"><span className="block text-caption font-black text-slate-800">{account.displayName}</span><span className="mt-0.5 block text-caption font-semibold text-slate-400">{t('Owner · Tenant Admin')}</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" /></button>{showProfile && <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"><div className="border-b border-slate-100 px-3 py-3"><p className="text-caption font-black text-slate-800">{account.displayName}</p><p className="mt-1 text-caption text-slate-500">{account.email}</p><p className="mt-2 rounded-lg bg-violet-50 px-2 py-1.5 text-caption font-bold text-violet-700">{tenantName} · {t('Quản trị theo gói')} {currentPackage.name}</p></div>{/* Tuỳ chỉnh giao diện — đặt ngay trong menu tài khoản vì đây là thao
                    tác đổi qua đổi lại trong ngày (sáng/tối theo ánh sáng phòng),
                    không đáng phải rời trang. */}
                <div className="mt-1 border-b border-slate-100 px-3 py-2.5">
                  <p className="text-caption font-bold uppercase tracking-wide text-slate-400">{t('Giao diện')}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label={t('Giao diện')}>
                    {([['light', Sun, t('Sáng')], ['dark', Moon, t('Tối')]] as const).map(([mode, Icon, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onThemeChange?.(mode)}
                        aria-pressed={themeMode === mode}
                        disabled={!onThemeChange}
                        className={`flex h-8 min-h-0 items-center justify-center gap-1.5 rounded-lg border-0 text-caption font-bold shadow-none ${themeMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-caption font-bold uppercase tracking-wide text-slate-400">{t('Ngôn ngữ')}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label={t('Ngôn ngữ')}>
                    {([['vi', 'Tiếng Việt'], ['en', 'English']] as const).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => onLanguageChange?.(code)}
                        aria-pressed={interfaceLanguage === code}
                        disabled={!onLanguageChange}
                        className={`flex h-8 min-h-0 items-center justify-center gap-1.5 rounded-lg border-0 text-caption font-bold shadow-none ${interfaceLanguage === code ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                        <span className="rounded bg-slate-200 px-1 text-caption font-black uppercase text-slate-600">{code}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => navigate('settings')} className="mt-1 flex h-9 w-full items-center gap-2.5 border-0 bg-transparent px-3 text-caption font-bold text-slate-600 shadow-none hover:bg-slate-50"><Settings className="h-3.5 w-3.5" />{t('Cài đặt tài khoản')}</button><button type="button" onClick={onLogout} className="flex h-9 w-full items-center gap-2.5 border-0 bg-transparent px-3 text-caption font-bold text-rose-600 shadow-none hover:bg-rose-50"><LogOut className="h-3.5 w-3.5" />{t('Đăng xuất')}</button></div>}</div>
          </div>
        </header>

        <main key={`${demoMode ? 'demo' : 'live'}-${demoRevision}`} id="tenant-admin-main" data-page={activePage} data-compact-access={['stations', 'pos', 'customers', 'loyalty', 'staff', 'services', 'inventory'].includes(activePage) ? 'true' : undefined} tabIndex={-1} className="role-main tenant-admin-main mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {emergencyBannerAnnouncement && (
            <div className={`mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-all ${
              emergencyBannerAnnouncement.priority === 'URGENT'
                ? 'border-rose-300 bg-rose-50/90 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200'
                : 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200'
            }`}>
              <div className="flex items-start gap-3 min-w-0">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${
                  emergencyBannerAnnouncement.priority === 'URGENT' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/40 border border-current/20 shadow-xs">
                      {emergencyBannerAnnouncement.priority === 'URGENT' ? 'Phát sóng khẩn cấp từ Superadmin' : 'Thông báo hệ thống'}
                    </span>
                    <span className="text-xs font-black truncate">{emergencyBannerAnnouncement.title}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-90 line-clamp-2 leading-relaxed">{emergencyBannerAnnouncement.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => {
                    navigate('announcements');
                  }}
                >
                  Xem chi tiết
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => handleDismissEmergencyBanner(emergencyBannerAnnouncement.id)}
                >
                  Đã hiểu & Ẩn
                </Button>
              </div>
            </div>
          )}
          {/* Trạng thái nguồn dữ liệu: một dải gọn, rộng theo nội dung để không
              cạnh tranh với tiêu đề trang. Hành động phá hủy đứng sau và nhẹ hơn. */}
          {activePage !== 'overview' && demoMode && <section role="status" className="tenant-demo-strip mb-4 flex w-full flex-col gap-2 rounded-control border sm:w-fit sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 text-body font-semibold text-brand-text">
              <Database aria-hidden="true" className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
              Đang hiển thị dữ liệu mẫu
            </span>
            <span aria-hidden="true" className="hidden h-4 w-px bg-brand-outline sm:block" />
            <div className="flex gap-1">
              <Button size="small" variant="secondary" onClick={loadDemoData} iconLeading={<RotateCcw />}>Nạp lại</Button>
              {tenant && <Button size="small" variant="ghost" onClick={clearDemoData} iconLeading={<Trash2 />}>Tắt dữ liệu mẫu</Button>}
            </div>
          </section>}
          {readOnlyReason && <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100"><LockKeyhole className="h-4 w-4" /></span><div><p className="text-caption font-black">Chế độ chỉ đọc đang được áp dụng</p><p className="mt-1 text-caption leading-5">{readOnlyReason}</p></div></div>}
          <div className="mb-4 sm:hidden"><BeautifulSelect value={branch} onChange={(event) => { setBranch(event.target.value); setSearchQuery(''); setSelectedRow(null); }} aria-label="Chọn phạm vi chi nhánh trên di động" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"><option value="ALL">{t('Tất cả chi nhánh')}</option>{branchRows.map((row) => <option key={row.id} value={row.branchCode}>{row.title}</option>)}</BeautifulSelect></div>
          {activePage === 'overview' ? (
            <OverviewPage branch={branch} ownerName={account.displayName} tenantName={tenantName} tenant={tenant} demoMode={demoMode} invoiceCount={visibleInvoices.length} onToggleDemo={demoMode ? clearDemoData : loadDemoData} planName={currentPackage.name} branchCount={branchRows.length} branchLimit={branchLimit} staffCount={staffUsage} staffLimit={staffLimit} onNavigate={navigate} onQuickCreate={openCreate} />
          ) : activePage === 'subscription' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm gói đăng ký...</div>}>
              <TenantAdminSubscription
                tenantName={tenantName}
                tenant={tenant}
                subscriptionPackage={currentPackage}
                availablePackages={normalizedAvailablePackages}
                invoices={visibleInvoices}
                branchCount={branchRows.length}
                staffCount={staffUsage}
                roleLabel="Owner · Tenant Admin"
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
                onUpdateTenant={onUpdateTenant}
                pendingRequest={pendingUpgradeRequest}
                onRequestUpgrade={onRequestUpgrade}
                onCancelUpgradeRequest={onCancelUpgradeRequest}
                onSubmitPaymentProof={onSubmitInvoicePaymentProof}
              />
            </Suspense>
          ) : activePage === 'branches' ? (
            <BranchesPage rows={scopedRows} searchQuery={searchQuery} activeTab={activeTab || 'Tất cả'} onSearch={setSearchQuery} onTab={setActiveTab} onSelectRow={setSelectedRow} onCreate={() => openCreate('branches')} onExport={exportRows} planName={currentPackage.name} branchLimit={branchLimit} />
          ) : activePage === 'appointments' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải lịch hẹn...</div>}>
              <TenantAdminAppointments
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                 selectedBranch={branch}
                 onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                 tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
                bookingRequest={appointmentBookingRequest}
                onBookingRequestHandled={() => setAppointmentBookingRequest(null)}
              />
            </Suspense>
          ) : activePage === 'stations' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải sơ đồ ghế & khu vực...</div>}>
              <TenantAdminStations
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'pos' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải thanh toán & đối soát...</div>}>
              <TenantAdminPayments
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'customers' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải hồ sơ khách hàng...</div>}>
              <TenantAdminCustomers
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
                onBookCustomer={bookCustomerFromProfile}
              />
            </Suspense>
          ) : activePage === 'loyalty' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải thành viên & ưu đãi...</div>}>
              <TenantAdminLoyalty
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'staff' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm nhân sự...</div>}>
              <TenantAdminStaff
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'services' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải danh mục dịch vụ & bảng giá...</div>}>
              <TenantAdminServices
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'inventory' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm kho vật tư...</div>}>
              <TenantAdminInventory
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'gallery' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải thư viện màu & mẫu Nail...</div>}>
              <TenantAdminNailGallery
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'online' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm đặt lịch online...</div>}>
              <TenantAdminOnlineBooking
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'finance' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm thu chi...</div>}>
              <TenantAdminFinance
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'sanitation' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm vệ sinh & an toàn...</div>}>
              <TenantAdminSanitation
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'reports' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm báo cáo...</div>}>
              <TenantAdminReports
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedBranch={branch}
                onSelectedBranchChange={(value) => { setBranch(value); setSelectedRow(null); }}
                branches={branchRows.map((item) => ({ code: item.branchCode || item.id.replace(/^BR-/, ''), name: item.title }))}
                tenantName={tenantName}
                roleLabel="Owner · Tenant Admin"
                accessMode={currentAccessMode}
                readOnlyReason={readOnlyReason}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'announcements' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải bản tin hệ thống...</div>}>
              <TenantAdminAnnouncements
                tenantName={tenantName}
                tenant={tenant}
                announcements={tenantAnnouncements}
                onUpdateAnnouncements={handleUpdateAnnouncements}
                onNavigatePage={navigate}
                onNotify={setToast}
              />
            </Suspense>
          ) : activePage === 'support' ? (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm trợ giúp...</div>}>
              <TenantAdminHelpAndSupport
                tenantName={tenantName}
                tenant={tenant}
                account={account}
                subscriptionPackage={currentPackage}
                tickets={tickets}
                onTicketsChange={onTicketsChange}
                onNotify={setToast}
              />
            </Suspense>
          ) : currentConfig && (
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-caption font-bold text-slate-400">Đang tải trung tâm cài đặt...</div>}>
              <TenantAdminSettings
                config={currentConfig}
                rows={scopedRows}
                searchQuery={searchQuery}
                activeTab={activeTab || currentConfig.tabs[0]}
                onSearch={setSearchQuery}
                onTab={setActiveTab}
                scopeLabel={branchScopeLabel}
                tenantName={tenantName}
                onCreate={() => openCreate()}
                onExport={exportRows}
                selectedRow={selectedRow}
                onSelectRow={setSelectedRow}
                onEditSelected={openEdit}
                onConfirmSelected={updateSelectedRowStatus}
                formOpen={createOpen}
                formValues={formValues}
                onFormChange={(key, value) => setFormValues((current) => ({ ...current, [key]: value }))}
                onFormClose={() => setCreateOpen(false)}
                onFormSubmit={submitCreate}
                brandInfo={brandInfo}
                onBrandInfoChange={handleBrandInfoChange}
                onBrandInfoSubmit={handleBrandInfoSubmit}
                paymentSettings={paymentSettings}
                onPaymentMethodToggle={handlePaymentMethodToggle}
                onRefundApprovalChange={handleRefundApprovalChange}
                branchRows={branchRows}
                onNavigateToBranches={() => navigate('branches')}
                readOnlyReason={readOnlyReason}
                demoMode={demoMode}
                sessionAccount={{ displayName: account.displayName, email: account.email }}
                onLogout={onLogout}
                formFields={settingsFormFields}
                formTitle={settingsEditingRow ? 'Sửa hạng mục cấu hình' : undefined}
              />
            </Suspense>
          )}
        </main>
      </div>

      {lockedPage && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <button type="button" aria-label="Đóng thông báo giới hạn gói" onClick={() => setLockedPage(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
        <section className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-[#171328] via-[#21183c] to-[#34215a] p-6 text-white sm:p-7">
            <div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/20"><LockKeyhole className="h-5 w-5" /></span><button type="button" onClick={() => setLockedPage(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 p-0 text-slate-300 shadow-none"><X className="h-4 w-4" /></button></div>
            <p className="mt-5 text-caption font-black uppercase tracking-[0.16em] text-violet-300">Giới hạn gói {currentPackage.name}</p>
            <h2 className="mt-2 text-xl font-black">{formatModuleLabel(lockedPage)} chưa có trong gói hiện tại</h2>
            <p className="mt-2 text-caption leading-5 text-slate-300">Chức năng này cần quyền <strong className="text-white">{lockedCapabilityLabel}</strong>. Dữ liệu cũ vẫn được giữ nguyên, nhưng bạn chưa thể truy cập hoặc thay đổi cho đến khi đổi gói.</p>
          </div>
          <div className="p-6 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-caption font-bold uppercase text-slate-400">Gói đang dùng</p><p className="mt-2 text-caption font-black text-slate-800">{currentPackage.name}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-caption font-bold uppercase text-slate-400">Quyền yêu cầu</p><p className="mt-2 text-caption font-black text-slate-800">{lockedCapabilityLabel}</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-caption font-bold uppercase text-violet-400">Gói phù hợp</p><p className="mt-2 text-caption font-black text-violet-800">{suggestedPackage?.name || 'Liên hệ tư vấn'}</p></div></div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setLockedPage(null); navigate('subscription'); }} className="h-11 border border-slate-200 bg-white px-4 text-caption font-black text-slate-600 shadow-sm">
                Xem quyền gói
              </button>
              <button
                type="button"
                onClick={() => {
                  if (suggestedPackage) {
                    onRequestUpgrade?.(suggestedPackage, tenant?.billingCycle || 'monthly', 'immediate');
                    setToast(`Đã gửi yêu cầu nâng cấp lên gói ${suggestedPackage.name}. Super Admin sẽ phê duyệt và gửi hóa đơn.`);
                  } else {
                    setToast('Đã gửi yêu cầu tư vấn gói phù hợp.');
                  }
                  setLockedPage(null);
                }}
                className="h-11 border border-violet-700 bg-violet-600 px-5 text-caption font-black text-white shadow-lg shadow-violet-200"
              >
                {suggestedPackage ? `Yêu cầu nâng lên ${suggestedPackage.name}` : 'Liên hệ tư vấn'}
              </button>
            </div>
          </div>
        </section>
      </div>}
      {selectedRow && currentConfig?.id === 'branches' && <BranchDetailDrawer row={selectedRow} tenantName={tenantName} onClose={() => setSelectedRow(null)} onEdit={openEdit} onUpdate={updateSelectedRowStatus} />}

      {createOpen && currentConfig && currentConfig.id !== 'settings' && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCreate} className={`relative max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${currentConfig.id === 'branches' ? 'max-w-4xl' : 'max-w-2xl'}`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><p className="text-caption font-black uppercase tracking-wide text-violet-600">{currentConfig.title}</p><h2 className="mt-1 text-lg font-black text-slate-900">{editingRowId && currentConfig.id === 'branches' ? 'Chỉnh sửa hồ sơ chi nhánh' : currentConfig.formTitle}</h2><p className="mt-1 text-xs text-slate-500">{currentConfig.id === 'branches' ? 'Hoàn thiện thông tin theo từng nhóm. Mã chi nhánh được tạo tự động và dữ liệu chỉ được lưu sau bước xác nhận.' : 'Nhập thông tin cần thiết; bạn có thể bổ sung chi tiết sau khi lưu.'}</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div>{currentConfig.id === 'branches' && <div className="mx-5 mt-5 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:mx-6 sm:grid-cols-3"><div className="rounded-xl bg-white p-3"><p className="text-caption font-black text-violet-600">1 · Nhận diện</p><p className="mt-1 text-caption text-slate-500">Tên, vai trò và mô hình</p></div><div className="rounded-xl bg-white p-3"><p className="text-caption font-black text-violet-600">2 · Vận hành</p><p className="mt-1 text-caption text-slate-500">Địa điểm, quản lý, nguồn lực</p></div><div className="rounded-xl bg-white p-3"><p className="text-caption font-black text-violet-600">3 · Xác nhận</p><p className="mt-1 text-caption text-slate-500">Kiểm tra hạn mức và đồng bộ</p></div></div>}<div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{currentConfig.formFields.map((field) => <Fragment key={field.key}>{currentConfig.id === 'branches' && field.key === 'name' && <div className="sm:col-span-2"><p className="text-xs font-black text-slate-900">Thông tin nhận diện</p><p className="mt-1 text-caption text-slate-500">Mã chi nhánh được sinh tự động từ tên và không trùng trong tenant.</p></div>}{currentConfig.id === 'branches' && field.key === 'province' && <div className="mt-2 border-t border-slate-200 pt-5 sm:col-span-2"><p className="text-xs font-black text-slate-900">Địa điểm & người phụ trách</p></div>}{currentConfig.id === 'branches' && field.key === 'openingHours' && <div className="mt-2 border-t border-slate-200 pt-5 sm:col-span-2"><p className="text-xs font-black text-slate-900">Vận hành & nguồn lực</p></div>}{currentConfig.id === 'branches' && field.key === 'monthlyRevenue' && <div className="mt-2 border-t border-slate-200 pt-5 sm:col-span-2"><p className="text-xs font-black text-slate-900">Chỉ số ban đầu & dịch vụ</p></div>}<label className={field.type === 'textarea' ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-caption font-bold text-slate-600">{field.label}{currentConfig.id === 'branches' && ['name', 'address', 'manager', 'openingHours', 'stations', 'services'].includes(field.key) && <span className="text-rose-500"> *</span>}</span>{field.type === 'select' ? <BeautifulSelect value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium"><option value="">Chọn {field.label.toLocaleLowerCase('vi')}</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</BeautifulSelect> : field.type === 'textarea' ? <textarea value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /> : <input type={field.type} value={formValues[field.key] || ''} readOnly={currentConfig.id === 'branches' && field.key === 'code'} aria-readonly={currentConfig.id === 'branches' && field.key === 'code'} onChange={(event) => { const value = event.target.value; setFormValues((current) => ({ ...current, [field.key]: value, ...(currentConfig.id === 'branches' && field.key === 'name' && !editingRowId ? { code: generateBranchCode(value, tenantName, tenant ? normalizeTenantBranches(tenant) : []) } : {}) })); }} placeholder={field.placeholder} required={field === currentConfig.formFields[0]} className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none ${currentConfig.id === 'branches' && field.key === 'code' ? 'cursor-not-allowed border-violet-200 bg-violet-50 font-black text-violet-700' : 'border-slate-200 bg-slate-50 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100'}`} />}{currentConfig.id === 'branches' && liveTenantBranchValidation.errors[field.key] && <span className="mt-1.5 block text-caption font-semibold text-rose-600">{liveTenantBranchValidation.errors[field.key]}</span>}{currentConfig.id === 'branches' && field.key === 'code' && <span className="mt-1.5 block text-caption text-slate-400">Tự động tạo; không thể chỉnh sửa thủ công.</span>}</label></Fragment>)}</div>{currentConfig.id === 'branches' && <div className={`mx-5 mb-5 rounded-2xl border p-4 sm:mx-6 ${liveTenantBranchValidation.isValid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className={`text-xs font-black ${liveTenantBranchValidation.isValid ? 'text-emerald-700' : 'text-amber-800'}`}>{liveTenantBranchValidation.isValid ? 'Đã đáp ứng đầy đủ điều kiện thêm chi nhánh' : `Cần hoàn thiện ${Object.keys(liveTenantBranchValidation.errors).length} điều kiện trước khi xác nhận`}</p>{!liveTenantBranchValidation.isValid && <ul className="mt-2 grid gap-1 text-caption leading-5 text-amber-800 sm:grid-cols-2">{Object.values(liveTenantBranchValidation.errors).map((error) => <li key={error}>• {error}</li>)}</ul>}</div>}<div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" disabled={currentConfig.id === 'branches' && !liveTenantBranchValidation.isValid} className={`flex items-center gap-2 px-5 text-xs font-black text-white shadow-lg ${currentConfig.id === 'branches' && !liveTenantBranchValidation.isValid ? 'cursor-not-allowed border border-slate-300 bg-slate-300 shadow-none' : 'border border-violet-700 bg-violet-600 shadow-violet-200'}`}><Check className="h-4 w-4" />{currentConfig.id === 'branches' ? 'Kiểm tra & xác nhận' : 'Lưu thông tin'}</button></div></form></div>}
    </div>
  );
}
