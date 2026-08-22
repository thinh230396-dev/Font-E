import BeautifulSelect from './BeautifulSelect';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Mail,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  WalletCards,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import type { CurrencyCode, Invoice, InvoiceActivity, PackageUpgradeRequest, Tenant } from '../types';
import { Modal, useToast } from './ui';
import PackageUpgradeRequests from './PackageUpgradeRequests';
import { convertMoney, formatMoney } from '../utils/money';
import {
  getPaymentMethodLabel,
  getTransactionDisplay,
  inferPaymentGateway,
  PAYMENT_GATEWAY_LABELS as GATEWAY_LABELS,
  paymentGatewayRequiresTransactionCode,
  type InvoicePaymentGateway
} from '../utils/invoicePayments';

interface BillingAndInvoicesProps {
  invoices: Invoice[];
  /* Danh sách tenant để form tạo hóa đơn chọn từ đó. Trước đây mã tenant, tên
     tenant và email nhận hóa đơn đều phải gõ tay, sai một ký tự là hóa đơn
     không gắn được vào tenant nào. */
  tenants: Tenant[];
  upgradeRequests?: PackageUpgradeRequest[];
  onReviewUpgradeRequest?: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string,
    effectiveDate: 'immediate' | 'next_cycle'
  ) => Promise<boolean>;
  onUpdateInvoiceStatus: (id: string, newStatus: Invoice['status'], paymentDetails?: Partial<Invoice>) => void;
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => void;
  onCreateInvoice: (invoice: Invoice) => boolean;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  reportCurrency: CurrencyCode;
}

type PageTab = 'overview' | 'invoices' | 'upgrades';
type DetailTab = 'details' | 'payments' | 'history';
type DateRange = '7D' | '30D' | '90D' | 'ALL';

const PAGE_SIZE = 7;
const STATUS_CONFIG: Record<Invoice['status'], { label: string; className: string }> = {
  PAID: { label: 'Đã thanh toán', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  PENDING: { label: 'Đang chờ', className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  OVERDUE: { label: 'Quá hạn', className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' },
  CANCELLED: { label: 'Đã hủy', className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted' }
};

const TYPE_LABELS: Record<NonNullable<Invoice['type']>, string> = {
  RENEWAL: 'Gia hạn',
  PLAN_CHANGE: 'Đổi gói',
  MONTHLY_SUBSCRIPTION: 'Thuê bao định kỳ',
  MANUAL_ADJUSTMENT: 'Điều chỉnh thủ công'
};

const COLLECTION_LABELS: Record<NonNullable<Invoice['collectionStage']>, string> = {
  NONE: 'Chưa thu hồi nợ',
  REMINDER_1: 'Nhắc nợ lần 1',
  REMINDER_2: 'Nhắc nợ lần 2',
  FINAL_NOTICE: 'Thông báo cuối',
  SUSPENSION_REVIEW: 'Xem xét tạm ngưng'
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  const timePart = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${datePart} · ${timePart}`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatRelativeTime = (value?: string) => {
  if (!value) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return `${Math.floor(minutes / 1440)} ngày trước`;
};

const daysPastDue = (invoice: Invoice) => {
  if (invoice.status !== 'OVERDUE') return 0;
  return Math.max(1, Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000));
};

const toReportCurrency = (amount: number, currency: string | undefined, reportCurrency: CurrencyCode) => (
  convertMoney(Number(amount || 0), currency, reportCurrency)
);
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold ${className}`}>{children}</span>;
}

function MetricCard({ icon, label, value, detail, tone = 'primary' }: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    primary: 'bg-brand-primary/10 text-brand-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400'
  };
  return (
    <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">{label}</span>
      </div>
      <p className="mt-3 text-xl font-extrabold tracking-tight text-brand-text xl:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{detail}</p>
    </div>
  );
}

export default function BillingAndInvoices({
  invoices,
  tenants,
  upgradeRequests = [],
  onReviewUpgradeRequest,
  onUpdateInvoiceStatus,
  onUpdateInvoice,
  onCreateInvoice,
  showConfirm,
  reportCurrency
}: BillingAndInvoicesProps) {
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState<PageTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Invoice['status']>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | NonNullable<Invoice['type']>>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('30D');
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('details');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentCapture, setPaymentCapture] = useState<{ invoiceId: string; gateway: InvoicePaymentGateway; transactionCode: string } | null>(null);
  const [refundInvoiceId, setRefundInvoiceId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [createForm, setCreateForm] = useState({
    tenantId: '', tenantName: '', billingEmail: '', planName: 'Premium', type: 'MANUAL_ADJUSTMENT' as NonNullable<Invoice['type']>,
    billingCycle: 'monthly' as NonNullable<Invoice['billingCycle']>, amount: '', currency: reportCurrency,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), description: '', note: ''
  });

  const pendingUpgradeCount = useMemo(() => upgradeRequests.filter((r) => r.status === 'PENDING').length, [upgradeRequests]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) || null;
  const refundInvoice = invoices.find((invoice) => invoice.id === refundInvoiceId) || null;
  const isModalOpen = Boolean(selectedInvoice || showCreateModal || paymentCapture || refundInvoice);

  useEffect(() => {
    if (!isModalOpen) return;

    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousBodyPaddingRight = body.style.paddingRight;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    if (scrollbarWidth > 0) {
      const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      body.style.paddingRight = previousBodyPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [isModalOpen]);

  const selectedInvoiceLineItems = useMemo(() => {
    if (!selectedInvoice) return [];
    if (selectedInvoice.lineItems?.length) return selectedInvoice.lineItems;

    const fallbackAmount = selectedInvoice.subtotal ?? selectedInvoice.amount;
    const fallbackDescription = selectedInvoice.servicePeriod
      || selectedInvoice.billingPeriod
      || `${TYPE_LABELS[selectedInvoice.type || 'MONTHLY_SUBSCRIPTION']}${selectedInvoice.planName ? ` · ${selectedInvoice.planName}` : ''}`;

    return [{
      id: `LI-FALLBACK-${selectedInvoice.id}`,
      description: fallbackDescription,
      quantity: 1,
      unitPrice: fallbackAmount,
      amount: fallbackAmount,
      taxRate: 0
    }];
  }, [selectedInvoice]);

  const rangeInvoices = useMemo(() => {
    const dateThreshold = dateRange === 'ALL' ? 0 : Date.now() - Number(dateRange.replace('D', '')) * 86400000;
    return invoices.filter((invoice) => !dateThreshold || new Date(invoice.createdAt).getTime() >= dateThreshold);
  }, [dateRange, invoices]);

  const summary = useMemo(() => {
    const paid = rangeInvoices.filter((invoice) => invoice.status === 'PAID');
    const grossCollected = paid.reduce((sum, invoice) => sum + toReportCurrency(invoice.amount, invoice.currency, reportCurrency), 0);
    const refunded = paid.reduce((sum, invoice) => sum + toReportCurrency(invoice.refundedAmount || 0, invoice.currency, reportCurrency), 0);
    const collected = grossCollected - refunded;
    const pendingInvoices = rangeInvoices.filter((invoice) => invoice.status === 'PENDING');
    const overdueInvoices = rangeInvoices.filter((invoice) => invoice.status === 'OVERDUE');
    const pending = pendingInvoices.reduce((sum, invoice) => sum + toReportCurrency(invoice.amount, invoice.currency, reportCurrency), 0);
    const overdue = overdueInvoices.reduce((sum, invoice) => sum + toReportCurrency(invoice.amount, invoice.currency, reportCurrency), 0);
    const collectible = collected + pending + overdue;
    const fees = paid.reduce((sum, invoice) => sum + toReportCurrency(invoice.processingFee || 0, invoice.currency, reportCurrency), 0);
    return {
      grossCollected,
      collected,
      refunded,
      netCollected: Math.max(0, collected - fees),
      pending,
      overdue,
      fees,
      collectible,
      collectionRate: collectible ? Math.round((collected / collectible) * 100) : 100,
      paidCount: paid.length,
      pendingCount: pendingInvoices.length,
      overdueCount: overdueInvoices.length,
      cancelledCount: rangeInvoices.filter((invoice) => invoice.status === 'CANCELLED').length,
      mismatchCount: rangeInvoices.filter((invoice) => invoice.reconciliationStatus === 'MISMATCHED').length,
      missingTransactionCount: paid.filter((invoice) => paymentGatewayRequiresTransactionCode(invoice.paymentGateway || inferPaymentGateway(invoice.paymentMethod)) && !invoice.transactionCode?.trim()).length
    };
  }, [rangeInvoices, reportCurrency]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...rangeInvoices]
      .filter((invoice) => {
        const searchable = [invoice.id, invoice.invoiceCode, invoice.tenantName, invoice.tenantId, invoice.billingEmail, invoice.transactionCode, invoice.billingPeriod].join(' ').toLowerCase();
        return (!query || searchable.includes(query))
          && (statusFilter === 'ALL' || invoice.status === statusFilter)
          && (typeFilter === 'ALL' || invoice.type === typeFilter);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rangeInvoices, searchQuery, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const visibleInvoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [dateRange, searchQuery, statusFilter, typeFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const agingBuckets = useMemo(() => {
    const overdue = rangeInvoices.filter((invoice) => invoice.status === 'OVERDUE');
    const build = (min: number, max: number) => {
      const items = overdue.filter((invoice) => daysPastDue(invoice) >= min && daysPastDue(invoice) <= max);
      return { count: items.length, amount: items.reduce((sum, invoice) => sum + toReportCurrency(invoice.amount, invoice.currency, reportCurrency), 0) };
    };
    return [
      { label: '1–7 ngày', ...build(1, 7), color: 'bg-amber-400' },
      { label: '8–30 ngày', ...build(8, 30), color: 'bg-orange-500' },
      { label: 'Trên 30 ngày', ...build(31, Number.MAX_SAFE_INTEGER), color: 'bg-red-500' }
    ];
  }, [rangeInvoices, reportCurrency]);

  const gatewaySummary = useMemo(() => {
    const paid = rangeInvoices.filter((invoice) => invoice.status === 'PAID');
    return (['BANK_TRANSFER', 'MOMO', 'VNPAY', 'STRIPE', 'MANUAL'] as const).map((gateway) => {
      const items = paid.filter((invoice) => (invoice.paymentGateway || inferPaymentGateway(invoice.paymentMethod)) === gateway);
      return { gateway, count: items.length, amount: items.reduce((sum, invoice) => sum + toReportCurrency((invoice.amount - (invoice.refundedAmount || 0)), invoice.currency, reportCurrency), 0) };
    }).filter((item) => item.count > 0).sort((a, b) => b.amount - a.amount);
  }, [rangeInvoices, reportCurrency]);

  const attentionInvoices = useMemo(() => invoices
    .filter((invoice) => invoice.status === 'OVERDUE' || invoice.reconciliationStatus === 'MISMATCHED' || (invoice.status === 'PAID' && getTransactionDisplay(invoice) === 'Thiếu mã giao dịch'))
    .sort((a, b) => {
      const priority = (invoice: Invoice) => invoice.status === 'OVERDUE' ? 3 : invoice.reconciliationStatus === 'MISMATCHED' ? 2 : 1;
      return priority(b) - priority(a) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5), [invoices]);

  const recentInvoices = useMemo(() => [...rangeInvoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6), [rangeInvoices]);

  const handleStatusChange = (invoice: Invoice, status: Invoice['status']) => {
    if (invoice.status === status) return;
    if (status === 'PAID') {
      setPaymentCapture({
        invoiceId: invoice.id,
        gateway: invoice.paymentGateway || inferPaymentGateway(invoice.paymentMethod) || 'MANUAL',
        transactionCode: invoice.transactionCode || ''
      });
      return;
    }
    if (status === 'CANCELLED') {
      showConfirm('Xác nhận hủy hóa đơn', `Hủy ${invoice.invoiceCode || invoice.id}? Hóa đơn sẽ không còn được tính vào công nợ và thao tác được ghi vào audit log.`, () => onUpdateInvoiceStatus(invoice.id, status));
      return;
    }
    onUpdateInvoiceStatus(invoice.id, status);
  };

  const confirmPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!paymentCapture) return;
    const invoice = invoices.find((item) => item.id === paymentCapture.invoiceId);
    if (!invoice) return;
    const transactionCode = paymentCapture.transactionCode.trim();
    if (paymentGatewayRequiresTransactionCode(paymentCapture.gateway) && !transactionCode) return;

    const now = new Date().toISOString();
    const paymentMethod = GATEWAY_LABELS[paymentCapture.gateway];
    onUpdateInvoiceStatus(invoice.id, 'PAID', {
      paymentGateway: paymentCapture.gateway,
      paymentMethod,
      transactionCode: transactionCode || undefined,
      processingFee: invoice.processingFee || 0,
      netReceived: Math.max(0, invoice.amount - (invoice.processingFee || 0) - (invoice.refundedAmount || 0)),
      paymentAttempts: [
        ...(invoice.paymentAttempts || []),
        {
          id: createId('PAY'),
          attemptedAt: now,
          status: 'SUCCESS',
          gateway: paymentCapture.gateway,
          amount: invoice.amount,
          transactionCode: transactionCode || undefined
        }
      ],
      activities: [
        ...(invoice.activities || []),
        {
          id: createId('ACT'),
          action: 'Ghi nhận thanh toán',
          description: `Đã thu ${formatMoney(invoice.amount, invoice.currency)} qua ${paymentMethod}${transactionCode ? ` · Mã giao dịch ${transactionCode}` : ' · không yêu cầu mã giao dịch'}.`,
          actor: 'superadmin@salonsys.vn',
          createdAt: now
        }
      ]
    });
    setPaymentCapture(null);
  };

  const handleSendReminder = (invoice: Invoice) => {
    const reminderCount = (invoice.reminderCount || 0) + 1;
    const recipient = invoice.billingEmail || 'email thanh toán của tenant';
    showConfirm(
      'Xác nhận gửi nhắc nợ',
      `Gửi nhắc thanh toán lần ${reminderCount} cho ${invoice.tenantName} đến ${recipient}? Bạn có thể chọn Hủy để dừng thao tác.`,
      () => {
        const nextStage: NonNullable<Invoice['collectionStage']> = reminderCount === 1 ? 'REMINDER_1' : reminderCount === 2 ? 'REMINDER_2' : reminderCount === 3 ? 'FINAL_NOTICE' : 'SUSPENSION_REVIEW';
        const now = new Date().toISOString();
        const activity: InvoiceActivity = {
          id: createId('ACT'), action: `Gửi nhắc nợ lần ${reminderCount}`,
          description: `Đã gửi email đến ${recipient} và thông báo trong ứng dụng.`,
          actor: 'superadmin@salonsys.vn', createdAt: now
        };
        onUpdateInvoice(invoice.id, { reminderCount, lastReminderAt: now, collectionStage: nextStage, activities: [...(invoice.activities || []), activity] });
        showToast(`Đã ghi nhận gửi nhắc thanh toán lần ${reminderCount} cho ${invoice.tenantName}.`);
      }
    );
  };

  /* Chọn tenant sẽ điền luôn tên, email nhận hóa đơn, gói và tiền tệ theo hồ sơ
     tenant, để hóa đơn thủ công không bao giờ lệch khỏi dữ liệu tenant. */
  const selectTenantForInvoice = (tenantId: string) => {
    const tenant = tenants.find((item) => item.id === tenantId);
    setCreateForm((current) => ({
      ...current,
      tenantId,
      tenantName: tenant?.name || '',
      billingEmail: tenant?.billingEmail || tenant?.contactEmail || tenant?.adminEmail || '',
      planName: tenant?.packageName || current.planName,
      currency: tenant?.currency || current.currency,
    }));
  };

  /* Bản in chỉ lấy phần thân hộp thoại (xem `@media print` trong index.css).
     Chuyển về tab Chi tiết trước khi in, vì hai tab kia là dữ liệu nội bộ chứ
     không phải thứ gửi cho tenant. */
  const printInvoice = () => {
    setDetailTab('details');
    requestAnimationFrame(() => window.print());
  };
  const invoiceDetailActions = selectedInvoice ? (
<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="w-full sm:w-52"><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Trạng thái hóa đơn</label><BeautifulSelect value={selectedInvoice.status} onChange={(event) => handleStatusChange(selectedInvoice, event.target.value as Invoice['status'])} className="form-control w-full">{Object.entries(STATUS_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</BeautifulSelect></div><div className="flex flex-wrap gap-2 sm:justify-end"><button onClick={printInvoice} className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap border border-brand-outline bg-brand-surface px-4 py-2.5 text-xs font-bold text-brand-text sm:flex-none"><Printer className="h-4 w-4" /><span>In hóa đơn</span></button>{['PENDING', 'OVERDUE'].includes(selectedInvoice.status) && <button onClick={() => handleSendReminder(selectedInvoice)} className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-400 sm:flex-none"><Send className="h-4 w-4" /><span>Gửi nhắc nợ</span></button>}{selectedInvoice.status === 'PAID' && (selectedInvoice.refundedAmount || 0) < selectedInvoice.amount && <button onClick={() => openRefund(selectedInvoice)} className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 sm:flex-none"><RotateCcw className="h-4 w-4" /><span>Hoàn tiền</span></button>}</div></div>
  ) : null;

  const openRefund = (invoice: Invoice) => {
    setRefundInvoiceId(invoice.id);
    setRefundAmount('');
    setRefundReason('');
    setSelectedInvoiceId(null);
  };

  const submitRefund = (event: FormEvent) => {
    event.preventDefault();
    if (!refundInvoice) return;
    const amount = Number(refundAmount);
    const available = refundInvoice.amount - (refundInvoice.refundedAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > available || !refundReason.trim()) return;
    showConfirm('Xác nhận hoàn tiền', `Hoàn ${formatMoney(amount, refundInvoice.currency)} cho ${refundInvoice.tenantName}? Thao tác tài chính này sẽ được ghi vào nhật ký kiểm toán.`, () => {
      const now = new Date().toISOString();
      const totalRefunded = (refundInvoice.refundedAmount || 0) + amount;
      onUpdateInvoice(refundInvoice.id, {
        refundStatus: totalRefunded >= refundInvoice.amount ? 'FULL' : 'PARTIAL', refundedAmount: totalRefunded,
        refundedAt: now, refundReason: refundReason.trim(),
        netReceived: Math.max(0, (refundInvoice.netReceived ?? refundInvoice.amount) - amount),
        activities: [...(refundInvoice.activities || []), {
          id: createId('ACT'), action: totalRefunded >= refundInvoice.amount ? 'Hoàn tiền toàn phần' : 'Hoàn tiền một phần',
          description: `Hoàn ${formatMoney(amount, refundInvoice.currency)}. Lý do: ${refundReason.trim()}`,
          actor: 'superadmin@salonsys.vn', createdAt: now
        }]
      });
      setRefundInvoiceId(null);
    });
  };

  const createInvoice = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(createForm.amount);
    if (!createForm.tenantId.trim() || !createForm.tenantName.trim() || !createForm.billingEmail.trim() || !createForm.description.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const id = createId('INV');
    const now = new Date().toISOString();
    const invoice: Invoice = {
      /* Mã tenant lấy nguyên từ bản ghi tenant đã chọn — trước đây bị viết hoa
         toàn bộ vì người dùng gõ tay, nay viết hoa sẽ làm sai mã thật. */
      id, invoiceCode: `SS-${id}`, tenantId: createForm.tenantId, tenantName: createForm.tenantName.trim(),
      type: createForm.type, planName: createForm.planName.trim(), billingCycle: createForm.billingCycle,
      servicePeriod: createForm.description.trim(), billingPeriod: createForm.description.trim(), createdAt: now, updatedAt: now,
      dueDate: new Date(`${createForm.dueDate}T23:59:59`).toISOString(), subtotal: amount, discountAmount: 0, taxAmount: 0,
      amount, currency: createForm.currency, status: 'PENDING', billingEmail: createForm.billingEmail.trim(),
      reconciliationStatus: 'PENDING', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE',
      issuedBy: 'superadmin@salonsys.vn', note: createForm.note.trim(), paymentAttempts: [],
      lineItems: [{ id: `${id}-LI-1`, description: createForm.description.trim(), quantity: 1, unitPrice: amount, amount, taxRate: 0 }],
      activities: [{ id: createId('ACT'), action: 'Tạo hóa đơn thủ công', description: createForm.note.trim() || 'Superadmin phát hành hóa đơn thủ công.', actor: 'superadmin@salonsys.vn', createdAt: now }]
    };
    if (!onCreateInvoice(invoice)) return;
    setShowCreateModal(false);
    setActiveTab('invoices');
    setCreateForm({ tenantId: '', tenantName: '', billingEmail: '', planName: 'Premium', type: 'MANUAL_ADJUSTMENT', billingCycle: 'monthly', amount: '', currency: reportCurrency, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), description: '', note: '' });
  };

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredInvoices.map((invoice) => [
      invoice.invoiceCode || invoice.id, invoice.tenantId, invoice.tenantName, invoice.billingEmail, TYPE_LABELS[invoice.type || 'MONTHLY_SUBSCRIPTION'],
      invoice.billingPeriod, formatDate(invoice.createdAt), formatDate(invoice.dueDate), invoice.amount, invoice.currency || 'VND', STATUS_CONFIG[invoice.status].label,
      getPaymentMethodLabel(invoice), getTransactionDisplay(invoice), invoice.refundedAmount || 0
    ]);
    const header = ['Mã hóa đơn', 'Mã tenant', 'Tenant', 'Email thanh toán', 'Loại', 'Kỳ thanh toán', 'Ngày phát hành', 'Hạn thanh toán', 'Số tiền', 'Tiền tệ', 'Trạng thái', 'Kênh thanh toán', 'Mã giao dịch', 'Đã hoàn'];
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchQuery(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setDateRange('30D');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary"><CreditCard className="h-5 w-5" /></div><div><h1 className="text-xl font-extrabold tracking-tight text-brand-text sm:text-2xl">Thanh toán & hóa đơn</h1><p className="mt-1 text-xs text-brand-text-muted">Theo dõi doanh thu, công nợ và toàn bộ hóa đơn trên hệ thống.</p></div></div>
        <div className="flex flex-col gap-2 sm:flex-row"><button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 whitespace-nowrap border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text"><Download className="h-4 w-4" /><span>Xuất CSV</span></button><button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-brand-primary px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" /><span>Tạo hóa đơn</span></button></div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-brand-outline/40">
        {([
          ['overview', 'Tổng quan', BarChart3, 0],
          ['invoices', 'Danh sách hóa đơn', Receipt, 0],
          ['upgrades', 'Yêu cầu nâng cấp gói', Zap, pendingUpgradeCount]
        ] as const).map(([tab, label, Icon, count]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex shrink-0 items-center gap-2 rounded-b-none border-0 bg-transparent px-4 py-2.5 text-xs font-bold shadow-none ${activeTab === tab ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-text-muted'}`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {Boolean(count) && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'upgrades' && (
        <PackageUpgradeRequests
          requests={upgradeRequests}
          onReview={onReviewUpgradeRequest || (async () => false)}
        />
      )}

      {activeTab === 'overview' && <section className="rounded-2xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-extrabold text-brand-text">Toàn cảnh tài chính</h2><p className="mt-1 text-[10px] text-brand-text-muted">Tổng hợp {rangeInvoices.length} hóa đơn trong khoảng thời gian đã chọn, quy đổi về {reportCurrency}.</p></div><BeautifulSelect value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} className="form-control w-full sm:w-44"><option value="7D">7 ngày qua</option><option value="30D">30 ngày qua</option><option value="90D">90 ngày qua</option><option value="ALL">Toàn bộ thời gian</option></BeautifulSelect></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={<WalletCards className="h-4 w-4" />} label="Thực thu ròng" value={formatMoney(summary.netCollected, reportCurrency)} detail={`${summary.paidCount} hóa đơn đã thu · phí cổng ${formatMoney(summary.fees, reportCurrency)}`} tone="success" /><MetricCard icon={<CalendarClock className="h-4 w-4" />} label="Đang chờ thu" value={formatMoney(summary.pending, reportCurrency)} detail={`${summary.pendingCount} hóa đơn còn trong hạn`} tone="warning" /><MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Công nợ quá hạn" value={formatMoney(summary.overdue, reportCurrency)} detail={`${summary.overdueCount} hóa đơn cần xử lý`} tone={summary.overdueCount ? 'danger' : 'success'} /><MetricCard icon={<Percent className="h-4 w-4" />} label="Tỷ lệ thu tiền" value={`${summary.collectionRate}%`} detail={`${summary.paidCount}/${summary.paidCount + summary.pendingCount + summary.overdueCount} hóa đơn có thể thu đã thanh toán`} tone={summary.collectionRate >= 90 ? 'success' : 'warning'} /></div></section>}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <section className="overflow-hidden rounded-2xl border border-brand-outline/40 bg-brand-surface shadow-sm"><div className="flex flex-col gap-3 border-b border-brand-outline/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-extrabold text-brand-text">Dòng tiền theo trạng thái</h2><p className="mt-1 text-[10px] text-brand-text-muted">Giá trị đã thu, đang chờ và quá hạn trong kỳ báo cáo.</p></div><Badge className={summary.collectionRate >= 90 ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'}>{summary.collectionRate >= 90 ? 'Dòng tiền ổn định' : 'Cần theo dõi'}</Badge></div><div className="p-5"><div className="flex h-3 overflow-hidden rounded-full bg-brand-surface-highest">{summary.collectible > 0 && <><div title="Đã thu" style={{ width: `${summary.collected / summary.collectible * 100}%` }} className="h-full bg-emerald-500" /><div title="Đang chờ" style={{ width: `${summary.pending / summary.collectible * 100}%` }} className="h-full bg-amber-400" /><div title="Quá hạn" style={{ width: `${summary.overdue / summary.collectible * 100}%` }} className="h-full bg-red-500" /></>}</div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đã thu</div><p className="mt-2 tabular-nums text-sm font-extrabold text-brand-text">{formatMoney(summary.collected, reportCurrency)}</p><p className="mt-1 text-[9px] text-brand-text-muted">{summary.paidCount} hóa đơn</p></div><div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 dark:text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-400" />Đang chờ</div><p className="mt-2 tabular-nums text-sm font-extrabold text-brand-text">{formatMoney(summary.pending, reportCurrency)}</p><p className="mt-1 text-[9px] text-brand-text-muted">{summary.pendingCount} hóa đơn</p></div><div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400"><span className="h-2 w-2 rounded-full bg-red-500" />Quá hạn</div><p className="mt-2 tabular-nums text-sm font-extrabold text-brand-text">{formatMoney(summary.overdue, reportCurrency)}</p><p className="mt-1 text-[9px] text-brand-text-muted">{summary.overdueCount} hóa đơn</p></div></div></div></section>
            <section className="overflow-hidden rounded-2xl border border-brand-outline/40 bg-brand-surface shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-brand-outline/35 px-5 py-4"><div><h2 className="text-sm font-extrabold text-brand-text">Hóa đơn cần xử lý</h2><p className="mt-1 text-[10px] text-brand-text-muted">Ưu tiên công nợ quá hạn và dữ liệu thanh toán còn thiếu.</p></div><button onClick={() => setActiveTab('invoices')} className="border-0 bg-transparent px-2 py-1 text-[10px] font-bold text-brand-primary shadow-none">Mở danh sách</button></div><div className="divide-y divide-brand-outline/25">{attentionInvoices.length === 0 ? <div className="px-5 py-10 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-emerald-500" /><p className="mt-2 text-xs font-bold text-brand-text">Không có hóa đơn cần xử lý</p><p className="mt-1 text-[10px] text-brand-text-muted">Các giao dịch hiện tại đều ổn định.</p></div> : attentionInvoices.map((invoice) => <button key={invoice.id} onClick={() => { setSelectedInvoiceId(invoice.id); setDetailTab('details'); }} className="flex h-auto w-full items-center justify-between gap-4 rounded-none border-0 bg-transparent px-5 py-3.5 text-left shadow-none transition-colors hover:bg-brand-surface-high/40"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${invoice.status === 'OVERDUE' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{invoice.status === 'OVERDUE' ? <AlertTriangle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold text-brand-text">{invoice.tenantName}</p><p className="mt-1 truncate text-[9px] text-brand-text-muted"><span className="font-mono">{invoice.invoiceCode || invoice.id}</span> · {invoice.status === 'OVERDUE' ? `Quá ${daysPastDue(invoice)} ngày` : getTransactionDisplay(invoice) === 'Thiếu mã giao dịch' ? 'Thiếu mã giao dịch' : 'Hệ thống phát hiện chênh lệch'}</p></div></div><div className="shrink-0 text-right"><p className="tabular-nums text-xs font-extrabold text-brand-text">{formatMoney(invoice.amount, invoice.currency)}</p><p className="mt-1 text-[9px] text-brand-text-muted">{invoice.status === 'OVERDUE' ? COLLECTION_LABELS[invoice.collectionStage || 'NONE'] : 'Cần kiểm tra'}</p></div></button>)}</div></section>

            <section className="overflow-hidden rounded-2xl border border-brand-outline/40 bg-brand-surface shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-brand-outline/35 px-5 py-4"><div><h2 className="text-sm font-extrabold text-brand-text">Hóa đơn gần đây</h2><p className="mt-1 text-[10px] text-brand-text-muted">Các hóa đơn mới nhất trong kỳ đang xem.</p></div><button onClick={() => setActiveTab('invoices')} className="border-0 bg-transparent px-2 py-1 text-[10px] font-bold text-brand-primary shadow-none">Xem tất cả</button></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-[10px]"><thead className="bg-brand-surface-lowest/60 text-[9px] font-bold uppercase tracking-wide text-brand-text-muted"><tr><th className="px-5 py-3">Hóa đơn / Tenant</th><th className="px-3 py-3">Phát hành</th><th className="px-3 py-3 text-right">Số tiền</th><th className="px-5 py-3 text-right">Trạng thái</th></tr></thead><tbody className="divide-y divide-brand-outline/25">{recentInvoices.map((invoice) => <tr key={invoice.id} onClick={() => { setSelectedInvoiceId(invoice.id); setDetailTab('details'); }} className="cursor-pointer transition-colors hover:bg-brand-surface-high/40"><td className="px-5 py-3"><p className="font-mono text-[9px] font-bold text-brand-primary">{invoice.invoiceCode || invoice.id}</p><p className="mt-1 max-w-[220px] truncate font-bold text-brand-text">{invoice.tenantName}</p></td><td className="px-3 py-3 text-brand-text-muted">{formatDate(invoice.createdAt)}</td><td className="px-3 py-3 text-right tabular-nums font-extrabold text-brand-text">{formatMoney(invoice.amount, invoice.currency)}</td><td className="px-5 py-3 text-right"><Badge className={STATUS_CONFIG[invoice.status].className}>{STATUS_CONFIG[invoice.status].label}</Badge></td></tr>)}</tbody></table></div></section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-brand-primary" /><div><h2 className="text-sm font-extrabold text-brand-text">Kênh thanh toán</h2><p className="mt-1 text-[10px] text-brand-text-muted">Giá trị đã thu sau hoàn tiền.</p></div></div><div className="mt-5 space-y-4">{gatewaySummary.length === 0 ? <p className="py-6 text-center text-[10px] text-brand-text-muted">Chưa có giao dịch thành công trong kỳ.</p> : gatewaySummary.map((item) => { const percent = summary.collected ? Math.round(item.amount / summary.collected * 100) : 0; return <div key={item.gateway}><div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]"><span className="font-bold text-brand-text">{GATEWAY_LABELS[item.gateway]} <span className="font-normal text-brand-text-muted">· {item.count}</span></span><strong className="tabular-nums text-brand-text">{percent}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-brand-surface-highest"><div style={{ width: `${Math.min(100, percent)}%` }} className="h-full rounded-full bg-brand-primary" /></div><p className="mt-1.5 text-right tabular-nums text-[9px] text-brand-text-muted">{formatMoney(item.amount, reportCurrency)}</p></div>; })}</div></section>
            <section className="rounded-2xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-primary" /><div><h2 className="text-sm font-extrabold text-brand-text">Tuổi nợ phải thu</h2><p className="mt-1 text-[10px] text-brand-text-muted">Phân nhóm công nợ theo số ngày quá hạn.</p></div></div><div className="mt-4 space-y-4">{agingBuckets.map((bucket) => { const percent = summary.overdue ? Math.round(bucket.amount / summary.overdue * 100) : 0; return <div key={bucket.label}><div className="mb-1 flex justify-between gap-3 text-[10px]"><span className="font-bold text-brand-text">{bucket.label}</span><span className="text-right text-brand-text-muted">{bucket.count} HĐ · {formatMoney(bucket.amount, reportCurrency)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-brand-surface-highest"><div style={{ width: `${percent}%` }} className={`h-full rounded-full ${bucket.color}`} /></div></div>; })}</div></section>
            <section className="rounded-2xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-primary" /><div><h2 className="text-sm font-extrabold text-brand-text">Sức khỏe thanh toán</h2><p className="mt-1 text-[10px] text-brand-text-muted">Kiểm tra tự động các dữ liệu tài chính quan trọng.</p></div></div><div className="mt-4 space-y-2.5"><div className="flex items-center justify-between rounded-xl bg-brand-surface-lowest/60 px-3 py-2.5"><span className="text-[10px] text-brand-text-muted">Thiếu mã giao dịch</span><Badge className={summary.missingTransactionCount ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}>{summary.missingTransactionCount}</Badge></div><div className="flex items-center justify-between rounded-xl bg-brand-surface-lowest/60 px-3 py-2.5"><span className="text-[10px] text-brand-text-muted">Chênh lệch tự động phát hiện</span><Badge className={summary.mismatchCount ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}>{summary.mismatchCount}</Badge></div><div className="flex items-center justify-between rounded-xl bg-brand-surface-lowest/60 px-3 py-2.5"><span className="text-[10px] text-brand-text-muted">Hóa đơn đã hủy</span><Badge className="border-brand-outline bg-brand-surface-high text-brand-text-muted">{summary.cancelledCount}</Badge></div><div className="flex items-center justify-between rounded-xl bg-brand-surface-lowest/60 px-3 py-2.5"><span className="text-[10px] text-brand-text-muted">Hoàn tiền trong kỳ</span><strong className="tabular-nums text-[10px] text-brand-text">{formatMoney(summary.refunded, reportCurrency)}</strong></div></div><button onClick={() => setActiveTab('invoices')} className="mt-4 w-full border border-brand-outline bg-brand-surface-high px-3 py-2.5 text-xs font-bold text-brand-text">Quản lý hóa đơn</button></section>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <section className="rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
          <div className="border-b border-brand-outline/35 p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm hóa đơn, tenant, email hoặc mã giao dịch..." className="form-control pl-9" /></div><BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | Invoice['status'])} className="form-control"><option value="ALL">Mọi trạng thái</option>{Object.entries(STATUS_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</BeautifulSelect><BeautifulSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="form-control"><option value="ALL">Mọi loại hóa đơn</option>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect><BeautifulSelect value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} className="form-control"><option value="7D">7 ngày qua</option><option value="30D">30 ngày qua</option><option value="90D">90 ngày qua</option><option value="ALL">Toàn bộ thời gian</option></BeautifulSelect></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-brand-text-muted">Hiển thị <strong className="text-brand-text">{filteredInvoices.length}</strong> / {invoices.length} hóa đơn</p><button onClick={resetFilters} className="min-h-0 border-0 bg-transparent px-2 py-1 text-[10px] font-bold text-brand-primary shadow-none">Đặt lại bộ lọc</button></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/60 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
                  <th className="px-4 py-3">Hóa đơn / Tenant</th>
                  <th className="px-4 py-3">Loại / Kỳ cước</th>
                  <th className="px-4 py-3">Phát hành / Hạn</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3">Thanh toán</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-outline/25 text-xs">
                {visibleInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Receipt className="mx-auto h-8 w-8 text-brand-text-muted/50" />
                      <p className="mt-3 font-bold text-brand-text">Không tìm thấy hóa đơn</p>
                      <p className="mt-1 text-[10px] text-brand-text-muted">Thử thay đổi từ khóa hoặc bộ lọc.</p>
                    </td>
                  </tr>
                ) : visibleInvoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-brand-surface-high/40">
                    <td className="px-4 py-3.5">
                      <button onClick={() => { setSelectedInvoiceId(invoice.id); setDetailTab('details'); }} className="min-h-0 border-0 bg-transparent p-0 text-left shadow-none">
                        <p className="font-mono text-[10px] font-bold text-brand-primary">{invoice.invoiceCode || invoice.id}</p>
                        <p className="mt-1 max-w-[190px] truncate font-bold text-brand-text">{invoice.tenantName}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-brand-text-muted">{invoice.tenantId}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-brand-text">{TYPE_LABELS[invoice.type || 'MONTHLY_SUBSCRIPTION']}</p>
                      <p className="mt-1 max-w-[190px] truncate text-[10px] text-brand-text-muted">{invoice.billingPeriod}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-brand-text">{formatDate(invoice.createdAt)}</p>
                      <p className={`mt-1 text-[10px] ${invoice.status === 'OVERDUE' ? 'font-bold text-red-600 dark:text-red-400' : 'text-brand-text-muted'}`}>Hạn {formatDate(invoice.dueDate)}{invoice.status === 'OVERDUE' ? ` · quá ${daysPastDue(invoice)} ngày` : ''}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="tabular-nums text-sm font-extrabold text-brand-text">{formatMoney(invoice.amount, invoice.currency)}</p>
                      {Boolean(invoice.refundedAmount) && <p className="mt-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">Đã hoàn {formatMoney(invoice.refundedAmount || 0, invoice.currency)}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-brand-text">{getPaymentMethodLabel(invoice)}</p>
                      <p className={`mt-1 max-w-[180px] truncate text-[9px] ${invoice.transactionCode?.trim() ? 'font-mono ' : ''}${invoice.status === 'PAID' && getTransactionDisplay(invoice) === 'Thiếu mã giao dịch' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-brand-text-muted'}`}>{getTransactionDisplay(invoice)}</p>
                    </td>
                    <td className="px-4 py-3.5"><Badge className={STATUS_CONFIG[invoice.status].className}>{STATUS_CONFIG[invoice.status].label}</Badge></td>
                    <td className="px-4 py-3.5 text-right"><button onClick={() => { setSelectedInvoiceId(invoice.id); setDetailTab('details'); }} className="whitespace-nowrap border border-brand-outline bg-brand-surface-high px-3 py-1.5 text-[10px] font-bold text-brand-text">Chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-brand-outline/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-brand-text-muted">Trang {page} / {pageCount} · {filteredInvoices.length} kết quả</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang hóa đơn trước"><ChevronLeft className="h-4 w-4" /></button><button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Trang hóa đơn sau"><ChevronRight className="h-4 w-4" /></button></div></div>
        </section>
      )}

      {selectedInvoice && (
        <Modal
          open
          onClose={() => setSelectedInvoiceId(null)}
          eyebrow={selectedInvoice.invoiceCode || selectedInvoice.id}
          title={selectedInvoice.tenantName}
          description={<>Phát hành {formatDateTime(selectedInvoice.createdAt)} <span className="px-1 text-brand-outline">•</span> {TYPE_LABELS[selectedInvoice.type || 'MONTHLY_SUBSCRIPTION']}</>}
          headerAside={<span className="flex flex-wrap items-center gap-2"><Badge className={STATUS_CONFIG[selectedInvoice.status].className}>{STATUS_CONFIG[selectedInvoice.status].label}</Badge>{selectedInvoice.refundStatus && selectedInvoice.refundStatus !== 'NONE' && <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">{selectedInvoice.refundStatus === 'FULL' ? 'Đã hoàn toàn bộ' : 'Hoàn một phần'}</Badge>}</span>}
          size="fullscreen"
          bodyClassName="!p-0"
          /* `ui-print-region` là móc để bảng kiểu in thu bản in về đúng hộp thoại này. */
          className="ui-print-region"
          footer={<div data-print-hide className="w-full">{invoiceDetailActions}</div>}
        >
            <div className="grid shrink-0 grid-cols-1 gap-3 border-b border-brand-outline/35 bg-brand-surface-lowest/40 p-4 sm:grid-cols-3 sm:px-6">
              <div className="rounded-xl border border-brand-outline/35 bg-brand-surface px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Tổng hóa đơn</p><p className="mt-1.5 tabular-nums text-base font-extrabold text-brand-text">{formatMoney(selectedInvoice.amount, selectedInvoice.currency)}</p></div>
              <div className="rounded-xl border border-brand-outline/35 bg-brand-surface px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Thực nhận</p><p className="mt-1.5 tabular-nums text-base font-extrabold text-emerald-600 dark:text-emerald-400">{selectedInvoice.status === 'PAID' ? formatMoney(selectedInvoice.netReceived ?? selectedInvoice.amount, selectedInvoice.currency) : 'Chưa thu'}</p></div>
              <div className="rounded-xl border border-brand-outline/35 bg-brand-surface px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Hạn thanh toán</p><p className={`mt-1.5 text-sm font-extrabold ${selectedInvoice.status === 'OVERDUE' ? 'text-red-600 dark:text-red-400' : 'text-brand-text'}`}>{formatDate(selectedInvoice.dueDate)}</p></div>
            </div>
            <div data-print-hide className="flex shrink-0 gap-1 overflow-x-auto border-b border-brand-outline/35 bg-brand-surface px-4 pt-2 sm:px-6">{([['details', 'Chi tiết', FileText], ['payments', 'Thanh toán', CreditCard], ['history', 'Lịch sử', Clock3]] as const).map(([tab, label, Icon]) => <button key={tab} onClick={() => setDetailTab(tab)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-b-none border-0 bg-transparent px-3 py-2 text-xs font-bold shadow-none ${detailTab === tab ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}><Icon className="h-3.5 w-3.5" /><span>{label}</span></button>)}</div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-brand-surface-lowest/20 p-4 sm:p-6">
              {detailTab === 'details' && <div className="space-y-4"><section className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10"><Receipt className="h-4 w-4 text-brand-primary" /></div><div><h3 className="text-xs font-extrabold text-brand-text">Nội dung hóa đơn</h3><p className="mt-0.5 text-[9px] text-brand-text-muted">Chi tiết các khoản phí được phát hành</p></div></div><div className="overflow-x-auto rounded-xl border border-brand-outline/30"><table className="w-full min-w-[520px] text-left text-[10px]"><thead className="bg-brand-surface-lowest/70"><tr className="border-b border-brand-outline/35 text-[9px] font-bold uppercase tracking-wide text-brand-text-muted"><th className="px-4 py-3">Mô tả</th><th className="px-3 py-3 text-center">SL</th><th className="px-3 py-3 text-right">Đơn giá</th><th className="px-4 py-3 text-right">Thành tiền</th></tr></thead><tbody>{selectedInvoiceLineItems.map((item) => <tr key={item.id} className="border-b border-brand-outline/20 last:border-0"><td className="px-4 py-3.5 font-bold text-brand-text">{item.description}<p className="mt-1 text-[9px] font-normal text-brand-text-muted">Thuế suất {item.taxRate}%</p></td><td className="px-3 py-3.5 text-center text-brand-text">{item.quantity}</td><td className="px-3 py-3.5 text-right tabular-nums text-brand-text">{formatMoney(item.unitPrice, selectedInvoice.currency)}</td><td className="px-4 py-3.5 text-right tabular-nums font-extrabold text-brand-text">{formatMoney(item.amount, selectedInvoice.currency)}</td></tr>)}</tbody></table></div><dl className="ml-auto mt-4 max-w-sm space-y-2 rounded-xl bg-brand-surface-lowest/60 p-4 text-[10px]"><div className="flex justify-between gap-4"><dt className="text-brand-text-muted">Tạm tính</dt><dd className="tabular-nums font-bold text-brand-text">{formatMoney(selectedInvoice.subtotal ?? selectedInvoice.amount, selectedInvoice.currency)}</dd></div><div className="flex justify-between gap-4"><dt className="text-brand-text-muted">Chiết khấu</dt><dd className="tabular-nums font-bold text-brand-text">− {formatMoney(selectedInvoice.discountAmount || 0, selectedInvoice.currency)}</dd></div><div className="flex justify-between gap-4"><dt className="text-brand-text-muted">Thuế</dt><dd className="tabular-nums font-bold text-brand-text">{formatMoney(selectedInvoice.taxAmount || 0, selectedInvoice.currency)}</dd></div><div className="flex justify-between gap-4 border-t border-brand-outline/35 pt-3 text-xs"><dt className="font-extrabold text-brand-text">Tổng cộng</dt><dd className="tabular-nums font-extrabold text-brand-primary">{formatMoney(selectedInvoice.amount, selectedInvoice.currency)}</dd></div></dl></section><section className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10"><Building2 className="h-4 w-4 text-brand-primary" /></div><div><h3 className="text-xs font-extrabold text-brand-text">Thông tin xuất hóa đơn</h3><p className="mt-0.5 text-[9px] text-brand-text-muted">Thông tin pháp lý và địa chỉ nhận hóa đơn</p></div></div><dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-[10px] sm:grid-cols-2"><div><dt className="text-brand-text-muted">Đơn vị / Tenant</dt><dd className="mt-1 font-bold text-brand-text">{selectedInvoice.billingCompany || selectedInvoice.tenantName}</dd></div><div><dt className="text-brand-text-muted">Email nhận hóa đơn</dt><dd className="mt-1 break-all font-bold text-brand-text">{selectedInvoice.billingEmail || 'Chưa cung cấp'}</dd></div><div><dt className="text-brand-text-muted">Mã số thuế</dt><dd className="mt-1 font-bold text-brand-text">{selectedInvoice.taxCode || 'Không áp dụng'}</dd></div><div><dt className="text-brand-text-muted">Mã tenant</dt><dd className="mt-1 font-mono font-bold text-brand-text">{selectedInvoice.tenantId}</dd></div><div className="sm:col-span-2"><dt className="text-brand-text-muted">Địa chỉ thanh toán</dt><dd className="mt-1 font-bold leading-relaxed text-brand-text">{selectedInvoice.billingAddress || 'Chưa cung cấp'}</dd></div></dl></section><section className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10"><CalendarClock className="h-4 w-4 text-brand-primary" /></div><div><h3 className="text-xs font-extrabold text-brand-text">Thông tin dịch vụ</h3><p className="mt-0.5 text-[9px] text-brand-text-muted">Gói cước, kỳ sử dụng và thông tin nội bộ</p></div></div><div className="grid grid-cols-1 gap-x-6 gap-y-4 text-[10px] sm:grid-cols-2"><div><p className="text-brand-text-muted">Gói / chu kỳ</p><p className="mt-1 font-bold text-brand-text">{selectedInvoice.planName || 'Không áp dụng'} · {selectedInvoice.billingCycle === 'yearly' ? 'Năm' : 'Tháng'}</p></div><div><p className="text-brand-text-muted">Kỳ dịch vụ</p><p className="mt-1 font-bold leading-relaxed text-brand-text">{selectedInvoice.servicePeriod || selectedInvoice.billingPeriod}</p></div><div><p className="text-brand-text-muted">Phát hành bởi</p><p className="mt-1 break-all font-bold text-brand-text">{selectedInvoice.issuedBy || 'Hệ thống Billing'}</p></div><div><p className="text-brand-text-muted">Ghi chú</p><p className="mt-1 font-bold leading-relaxed text-brand-text">{selectedInvoice.note || 'Không có ghi chú'}</p></div></div></section></div>}
              {detailTab === 'payments' && <div className="space-y-4">
                {Boolean(selectedInvoice.paymentProofSubmittedAt || selectedInvoice.paymentProofNote || selectedInvoice.paymentProofUrl) && (
                  <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-extrabold text-brand-text">Bằng chứng thanh toán từ Tenant</h3>
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                        Nộp lúc {formatDateTime(selectedInvoice.paymentProofSubmittedAt)}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-[10px] sm:grid-cols-2">
                      <div>
                        <dt className="text-brand-text-muted">Mã tham chiếu / Giao dịch</dt>
                        <dd className="mt-1 font-mono font-bold text-brand-text">{selectedInvoice.transactionCode || 'Chưa cung cấp'}</dd>
                      </div>
                      <div>
                        <dt className="text-brand-text-muted">Ghi chú chuyển khoản</dt>
                        <dd className="mt-1 font-bold text-brand-text">{selectedInvoice.paymentProofNote || 'Không có ghi chú'}</dd>
                      </div>
                      {selectedInvoice.paymentProofUrl && (
                        <div className="sm:col-span-2">
                          <dt className="text-brand-text-muted">Hình ảnh / Chứng từ đính kèm</dt>
                          <dd className="mt-2">
                            <a
                              href={selectedInvoice.paymentProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block overflow-hidden rounded-lg border border-brand-outline/40 hover:opacity-90"
                            >
                              <img
                                src={selectedInvoice.paymentProofUrl}
                                alt="Chứng từ thanh toán"
                                className="max-h-48 object-contain"
                              />
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                    {selectedInvoice.status !== 'PAID' && (
                      <div className="mt-3 flex justify-end border-t border-blue-500/20 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentCapture({
                              invoiceId: selectedInvoice.id,
                              gateway: inferPaymentGateway(selectedInvoice.paymentMethod) || 'BANK_TRANSFER',
                              transactionCode: selectedInvoice.transactionCode || ''
                            });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Đối soát khớp & Duyệt thanh toán</span>
                        </button>
                      </div>
                    )}
                  </section>
                )}
                <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2"><Landmark className="h-4 w-4 text-brand-primary" /><h3 className="text-xs font-extrabold text-brand-text">Thông tin thực nhận</h3></div><dl className="grid grid-cols-1 gap-3 text-[10px] sm:grid-cols-2"><div><dt className="text-brand-text-muted">Phương thức</dt><dd className="mt-1 font-bold text-brand-text">{getPaymentMethodLabel(selectedInvoice)}</dd></div><div><dt className="text-brand-text-muted">Mã giao dịch</dt><dd className={`mt-1 font-bold ${selectedInvoice.transactionCode?.trim() ? 'font-mono ' : ''}${getTransactionDisplay(selectedInvoice) === 'Thiếu mã giao dịch' ? 'text-amber-600 dark:text-amber-400' : 'text-brand-text'}`}>{getTransactionDisplay(selectedInvoice)}</dd></div><div><dt className="text-brand-text-muted">Phí cổng thanh toán</dt><dd className="mt-1 tabular-nums font-bold text-brand-text">{formatMoney(selectedInvoice.processingFee || 0, selectedInvoice.currency)}</dd></div><div><dt className="text-brand-text-muted">Thực nhận sau phí/hoàn</dt><dd className="mt-1 tabular-nums font-bold text-brand-text">{formatMoney(selectedInvoice.netReceived || 0, selectedInvoice.currency)}</dd></div></dl></section>{selectedInvoice.refundStatus && selectedInvoice.refundStatus !== 'NONE' && <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" /><h3 className="text-xs font-extrabold text-brand-text">Thông tin hoàn tiền</h3></div><dl className="mt-3 grid grid-cols-1 gap-3 text-[10px] sm:grid-cols-2"><div><dt className="text-brand-text-muted">Đã hoàn</dt><dd className="mt-1 tabular-nums font-extrabold text-brand-text">{formatMoney(selectedInvoice.refundedAmount || 0, selectedInvoice.currency)}</dd></div><div><dt className="text-brand-text-muted">Thời gian</dt><dd className="mt-1 font-bold text-brand-text">{formatDateTime(selectedInvoice.refundedAt)}</dd></div><div className="sm:col-span-2"><dt className="text-brand-text-muted">Lý do</dt><dd className="mt-1 font-bold text-brand-text">{selectedInvoice.refundReason}</dd></div></dl></section>}<section className="rounded-xl border border-brand-outline/35 p-4"><h3 className="text-xs font-extrabold text-brand-text">Các lần thanh toán</h3><div className="mt-3 divide-y divide-brand-outline/25">{(selectedInvoice.paymentAttempts || []).length === 0 ? <p className="py-5 text-center text-[10px] text-brand-text-muted">{selectedInvoice.status === 'PAID' ? 'Thanh toán được ghi nhận từ dữ liệu cũ, chưa có lịch sử lần thanh toán.' : 'Chưa phát sinh lần thanh toán nào.'}</p> : (selectedInvoice.paymentAttempts || []).map((attempt) => <div key={attempt.id} className="flex items-start justify-between gap-3 py-3"><div><div className="flex items-center gap-2"><Badge className={attempt.status === 'SUCCESS' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : attempt.status === 'FAILED' ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'}>{attempt.status === 'SUCCESS' ? 'Thành công' : attempt.status === 'FAILED' ? 'Thất bại' : 'Đang chờ'}</Badge><span className="text-[10px] font-bold text-brand-text">{GATEWAY_LABELS[attempt.gateway]}</span></div><p className="mt-1.5 text-[9px] text-brand-text-muted">{formatDateTime(attempt.attemptedAt)} · {attempt.transactionCode || attempt.failureReason || (attempt.gateway === 'MANUAL' ? 'Không yêu cầu mã giao dịch' : 'Thiếu mã giao dịch')}</p></div><p className="tabular-nums text-xs font-extrabold text-brand-text">{formatMoney(attempt.amount, selectedInvoice.currency)}</p></div>)}</div></section></div>}
              {detailTab === 'history' && <div className="space-y-0">{[...(selectedInvoice.activities || [])].reverse().map((activity, index) => <div key={activity.id} className="relative flex gap-3 pb-5">{index < (selectedInvoice.activities || []).length - 1 && <div className="absolute left-[7px] top-4 h-full w-px bg-brand-outline" />}<div className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-brand-surface bg-brand-primary" /><div><p className="text-xs font-extrabold text-brand-text">{activity.action}</p><p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{activity.description}</p><p className="mt-1 text-[9px] text-brand-text-muted">{activity.actor} · {formatDateTime(activity.createdAt)}</p></div></div>)}</div>}
            </div>
        </Modal>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo hóa đơn thủ công" description="Dùng cho phí điều chỉnh, bổ sung hoặc hóa đơn đặc biệt." size="medium" closeOnBackdrop={false} footer={<><button type="button" onClick={() => setShowCreateModal(false)} className="border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text">Hủy</button><button type="submit" form="create-invoice-form" disabled={!createForm.tenantId.trim() || !createForm.tenantName.trim() || !createForm.billingEmail.trim() || !createForm.description.trim() || Number(createForm.amount) <= 0} className="inline-flex items-center gap-2 whitespace-nowrap bg-brand-primary px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" /><span>Phát hành hóa đơn</span></button></>}><form id="create-invoice-form" onSubmit={createInvoice}><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Tenant *</label><BeautifulSelect value={createForm.tenantId} onChange={(event) => selectTenantForInvoice(event.target.value)} className="form-control" required><option value="">— Chọn tenant —</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.id}</option>)}</BeautifulSelect>{tenants.length === 0 && <p className="mt-1.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">Chưa có tenant nào trong hệ thống. Tạo tenant trước khi phát hành hóa đơn.</p>}</div><div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Email nhận hóa đơn *</label><input type="email" value={createForm.billingEmail} onChange={(event) => setCreateForm({ ...createForm, billingEmail: event.target.value })} placeholder="billing@example.vn" className="form-control" required />{createForm.tenantId && <p className="mt-1.5 text-[9px] text-brand-text-muted">Lấy theo hồ sơ tenant. Sửa lại nếu kỳ này cần gửi tới địa chỉ khác.</p>}</div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Loại hóa đơn</label><BeautifulSelect value={createForm.type} onChange={(event) => setCreateForm({ ...createForm, type: event.target.value as NonNullable<Invoice['type']> })} className="form-control">{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Gói dịch vụ</label><input value={createForm.planName} onChange={(event) => setCreateForm({ ...createForm, planName: event.target.value })} className="form-control" /></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Số tiền *</label><input type="number" min="0" step={createForm.currency === 'VND' ? '1000' : '0.01'} value={createForm.amount} onChange={(event) => setCreateForm({ ...createForm, amount: event.target.value })} placeholder="0" className="form-control" required /></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Tiền tệ</label><BeautifulSelect value={createForm.currency} onChange={(event) => setCreateForm({ ...createForm, currency: event.target.value as CurrencyCode })} className="form-control"><option value="VND">VND</option><option value="USD">USD</option></BeautifulSelect></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Chu kỳ</label><BeautifulSelect value={createForm.billingCycle} onChange={(event) => setCreateForm({ ...createForm, billingCycle: event.target.value as NonNullable<Invoice['billingCycle']> })} className="form-control"><option value="monthly">Tháng</option><option value="yearly">Năm</option></BeautifulSelect></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Hạn thanh toán *</label><input type="date" value={createForm.dueDate} onChange={(event) => setCreateForm({ ...createForm, dueDate: event.target.value })} className="form-control" required /></div><div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Nội dung dòng phí *</label><input value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} placeholder="Ví dụ: Phí bổ sung 5.000 SMS Brandname" className="form-control" required /></div><div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Ghi chú nội bộ</label><textarea rows={3} value={createForm.note} onChange={(event) => setCreateForm({ ...createForm, note: event.target.value })} className="form-control resize-none" /></div></div></form></Modal>

      {paymentCapture && <Modal open onClose={() => setPaymentCapture(null)} title="Ghi nhận thanh toán" description="Bổ sung thông tin thu tiền trước khi chuyển hóa đơn sang Đã thanh toán." size="small" closeOnBackdrop={false} footer={<><button type="button" onClick={() => setPaymentCapture(null)} className="border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text">Hủy</button><button type="submit" form="capture-payment-form" disabled={paymentGatewayRequiresTransactionCode(paymentCapture.gateway) && !paymentCapture.transactionCode.trim()} className="inline-flex items-center gap-2 whitespace-nowrap bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><CircleDollarSign className="h-4 w-4" /><span>Xác nhận đã thanh toán</span></button></>}><form id="capture-payment-form" onSubmit={confirmPayment}><div className="space-y-4"><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Phương thức thanh toán *</label><BeautifulSelect value={paymentCapture.gateway} onChange={(event) => setPaymentCapture({ ...paymentCapture, gateway: event.target.value as InvoicePaymentGateway, transactionCode: event.target.value === 'MANUAL' ? '' : paymentCapture.transactionCode })} className="form-control" required>{(Object.entries(GATEWAY_LABELS) as [InvoicePaymentGateway, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Mã giao dịch {paymentGatewayRequiresTransactionCode(paymentCapture.gateway) ? '*' : '(không bắt buộc)'}</label><input value={paymentCapture.transactionCode} onChange={(event) => setPaymentCapture({ ...paymentCapture, transactionCode: event.target.value })} placeholder={paymentCapture.gateway === 'MANUAL' ? 'Không yêu cầu với tiền mặt/ghi nhận thủ công' : 'Nhập mã từ ngân hàng hoặc cổng thanh toán'} className="form-control font-mono" required={paymentGatewayRequiresTransactionCode(paymentCapture.gateway)} disabled={paymentCapture.gateway === 'MANUAL'} />{paymentGatewayRequiresTransactionCode(paymentCapture.gateway) && !paymentCapture.transactionCode.trim() && <p className="mt-1.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">Kênh điện tử bắt buộc phải có mã giao dịch.</p>}</div></div></form></Modal>}

      {refundInvoice && <Modal open onClose={() => setRefundInvoiceId(null)} title="Hoàn tiền hóa đơn" description={refundInvoice.invoiceCode || refundInvoice.id} size="small" closeOnBackdrop={false} footer={<><button type="button" onClick={() => setRefundInvoiceId(null)} className="border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text">Hủy</button><button type="submit" form="refund-invoice-form" disabled={!refundReason.trim() || Number(refundAmount) <= 0 || Number(refundAmount) > refundInvoice.amount - (refundInvoice.refundedAmount || 0)} className="inline-flex items-center gap-2 whitespace-nowrap bg-amber-500 px-4 py-2 text-xs font-bold text-white"><RotateCcw className="h-4 w-4" /><span>Xác nhận hoàn tiền</span></button></>}><form id="refund-invoice-form" onSubmit={submitRefund}><div className="space-y-4"><div className="rounded-xl border border-brand-outline/35 bg-brand-surface-high/35 p-4"><div className="flex justify-between text-[10px]"><span className="text-brand-text-muted">Đã thanh toán</span><strong className="tabular-nums text-brand-text">{formatMoney(refundInvoice.amount, refundInvoice.currency)}</strong></div><div className="mt-2 flex justify-between text-[10px]"><span className="text-brand-text-muted">Đã hoàn trước đó</span><strong className="tabular-nums text-brand-text">{formatMoney(refundInvoice.refundedAmount || 0, refundInvoice.currency)}</strong></div><div className="mt-2 flex justify-between border-t border-brand-outline/35 pt-2 text-xs"><span className="font-bold text-brand-text">Có thể hoàn</span><strong className="tabular-nums text-brand-text">{formatMoney(refundInvoice.amount - (refundInvoice.refundedAmount || 0), refundInvoice.currency)}</strong></div></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Số tiền hoàn *</label><input type="number" min="0" max={refundInvoice.amount - (refundInvoice.refundedAmount || 0)} step={refundInvoice.currency === 'USD' ? '0.01' : '1000'} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} className="form-control" required /></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Lý do hoàn tiền *</label><textarea rows={3} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Mô tả lý do và ticket liên quan..." className="form-control resize-none" required /></div></div></form></Modal>}
    </div>
  );
}
