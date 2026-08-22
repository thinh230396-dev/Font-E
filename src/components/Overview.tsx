import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  Headphones,
  Inbox,
  Lock,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Unlock,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import type { CurrencyCode, Invoice, SystemAlert, Tenant, TenantStatus, Ticket } from '../types';
import { formatAlertTimestamp } from '../utils/alerts';
import { convertMoney, formatMoney } from '../utils/money';
import { getSlaState, isActive, PRIORITY_CONFIG, STATUS_CONFIG } from './HelpAndSupport';

interface OverviewProps {
  tenants: Tenant[];
  invoices: Invoice[];
  alerts: SystemAlert[];
  tickets?: Ticket[];
  onMarkAlertAsRead: (id: string) => void;
  onClearAllAlerts: () => void;
  onToggleTenantStatus: (id: string, newStatus: TenantStatus) => void;
  onViewTenant: (tenant: Tenant) => void;
  onNavigateToTab?: (tab: string) => void;
  searchQuery: string;
  reportCurrency: CurrencyCode;
}

const STATUS_META: Record<TenantStatus, { label: string; color: string; className: string }> = {
  ACTIVE: {
    label: 'Hoạt động',
    color: '#17b890',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  },
  TRIAL: {
    label: 'Dùng thử',
    color: '#7667e8',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
  },
  EXPIRING: {
    label: 'Sắp hết hạn',
    color: '#f4a340',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  },
  OVERDUE: {
    label: 'Quá hạn',
    color: '#ef6576',
    className: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
  },
  SUSPENDED: {
    label: 'Tạm ngưng',
    color: '#94a3b8',
    className: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300',
  },
};

const PERIOD_OPTIONS = ['30 ngày qua', 'Tháng này', 'Quý này', 'Năm nay'];

interface RevenueBucket {
  label: string;
  start: Date;
  end: Date;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * Các mốc thời gian của biểu đồ doanh thu, tùy theo khoảng thời gian đang chọn.
 * Khoảng ngắn thì chia theo ngày hoặc tuần, khoảng dài thì chia theo tháng —
 * để mỗi cột luôn là một quãng có thật chứ không phải một nhãn trang trí.
 */
const buildRevenueBuckets = (period: string, now: Date): RevenueBucket[] => {
  if (period === 'Tháng này') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const buckets: RevenueBucket[] = [];
    for (let weekStart = monthStart; weekStart <= now; weekStart = addDays(weekStart, 7)) {
      const weekEnd = addDays(weekStart, 7);
      buckets.push({ label: `Tuần ${buckets.length + 1}`, start: weekStart, end: weekEnd });
    }
    return buckets;
  }

  if (period === 'Quý này' || period === 'Năm nay') {
    const firstMonth = period === 'Quý này' ? Math.floor(now.getMonth() / 3) * 3 : 0;
    const buckets: RevenueBucket[] = [];
    for (let month = firstMonth; month <= now.getMonth(); month += 1) {
      buckets.push({
        label: `T${month + 1}`,
        start: new Date(now.getFullYear(), month, 1),
        end: new Date(now.getFullYear(), month + 1, 1),
      });
    }
    return buckets;
  }

  // 30 ngày qua: 5 cột, mỗi cột 6 ngày.
  const today = startOfDay(now);
  return Array.from({ length: 5 }, (_, index) => {
    const start = addDays(today, -29 + index * 6);
    const end = addDays(start, 6);
    return {
      label: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`,
      start,
      end,
    };
  });
};

export default function Overview({
  tenants,
  invoices,
  alerts,
  tickets = [],
  onMarkAlertAsRead,
  onClearAllAlerts,
  onToggleTenantStatus,
  onViewTenant,
  onNavigateToTab,
  searchQuery,
  reportCurrency,
}: OverviewProps) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<TenantStatus | 'ALL'>('ALL');
  const [timePeriod, setTimePeriod] = useState(PERIOD_OPTIONS[0]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const totalTenants = tenants.length;
  const activeCount = tenants.filter((tenant) => tenant.status === 'ACTIVE').length;
  const trialCount = tenants.filter((tenant) => tenant.status === 'TRIAL').length;
  const expiringCount = tenants.filter((tenant) => tenant.status === 'EXPIRING').length;
  const overdueCount = tenants.filter((tenant) => tenant.status === 'OVERDUE').length;
  const suspendedCount = tenants.filter((tenant) => tenant.status === 'SUSPENDED').length;
  const healthyTenantCount = activeCount + trialCount + expiringCount;
  const activeRate = totalTenants ? Math.round((activeCount / totalTenants) * 100) : 0;
  const unreadAlerts = alerts.filter((alert) => !alert.isRead);
  
  // Support tickets overview calculations
  const activeTickets = tickets.filter(isActive);
  const breachedTickets = activeTickets.filter((ticket) => getSlaState(ticket).key === 'BREACHED');
  const openTicketsCount = tickets.filter((ticket) => ticket.status === 'OPEN').length;
  const totalMonthlyRevenue = tenants.reduce(
    (total, tenant) =>
      total +
      (tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' || tenant.status === 'EXPIRING'
        ? convertMoney(tenant.monthlyRevenue, tenant.currency, reportCurrency)
        : 0),
    0,
  );
  const unpaidInvoices = invoices.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE');
  const totalOutstanding = unpaidInvoices.reduce(
    (total, invoice) => total + convertMoney(invoice.amount, invoice.currency, reportCurrency),
    0,
  );

  const filteredTenants = tenants.filter((tenant) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !normalizedQuery ||
      tenant.name.toLowerCase().includes(normalizedQuery) ||
      tenant.adminEmail.toLowerCase().includes(normalizedQuery) ||
      tenant.packageName.toLowerCase().includes(normalizedQuery) ||
      tenant.status.toLowerCase().includes(normalizedQuery);
    return matchesSearch && (selectedStatusFilter === 'ALL' || tenant.status === selectedStatusFilter);
  });

  const statusSegments = [
    { status: 'ACTIVE' as const, count: activeCount },
    { status: 'TRIAL' as const, count: trialCount },
    { status: 'EXPIRING' as const, count: expiringCount },
    { status: 'OVERDUE' as const, count: overdueCount },
    { status: 'SUSPENDED' as const, count: suspendedCount },
  ].map((segment) => ({
    ...segment,
    ...STATUS_META[segment.status],
    percentage: totalTenants ? Math.round((segment.count / totalTenants) * 100) : 0,
  }));

  const donutBackground = useMemo(() => {
    if (!totalTenants) return 'conic-gradient(#e2e8f0 0 100%)';
    let offset = 0;
    const stops = statusSegments.map((segment) => {
      const start = offset;
      offset += (segment.count / totalTenants) * 100;
      return `${segment.color} ${start}% ${offset}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [statusSegments, totalTenants]);

  /* Biểu đồ dựng từ hóa đơn đã thu thật, trừ đi phần đã hoàn, quy đổi về tiền tệ
     báo cáo. Mốc thời gian lấy theo ngày thu tiền; hóa đơn cũ chưa có `paidAt`
     thì lùi về ngày tạo. */
  const revenueChartData = useMemo(() => {
    const buckets = buildRevenueBuckets(timePeriod, new Date());
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'PAID');

    return buckets.map((bucket) => ({
      label: bucket.label,
      amount: paidInvoices.reduce((total, invoice) => {
        const paidAt = new Date(invoice.paidAt || invoice.createdAt);
        if (Number.isNaN(paidAt.getTime()) || paidAt < bucket.start || paidAt >= bucket.end) return total;
        const net = invoice.amount - (invoice.refundedAmount || 0);
        return total + convertMoney(net, invoice.currency, reportCurrency);
      }, 0),
    }));
  }, [invoices, reportCurrency, timePeriod]);

  const periodRevenue = revenueChartData.reduce((total, item) => total + item.amount, 0);
  const maxRevenue = Math.max(...revenueChartData.map((item) => item.amount), 0);
  const hasPeriodRevenue = periodRevenue > 0;

  /* Tăng trưởng so với mốc liền trước. Không có mốc trước hoặc mốc trước bằng 0
     thì không có gì để so, nên ẩn hẳn thay vì hiện một con số vô nghĩa. */
  const growthPercent = useMemo(() => {
    if (revenueChartData.length < 2) return null;
    const previous = revenueChartData[revenueChartData.length - 2].amount;
    const latest = revenueChartData[revenueChartData.length - 1].amount;
    if (previous <= 0) return null;
    return Math.round(((latest - previous) / previous) * 1000) / 10;
  }, [revenueChartData]);

  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const getStatusBadge = (status: TenantStatus) => (
    <span className={`sa-status-badge ${STATUS_META[status].className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_META[status].label}
    </span>
  );

  return (
    <div className="sa-dashboard space-y-6">
      <section className="sa-welcome-panel">
        <div className="sa-welcome-glow" aria-hidden="true" />
        <div className="relative z-10 min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="sa-eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Trung tâm điều hành
            </span>
            <span className="sa-live-pill">
              <span className="sa-live-dot" />
              Hệ thống ổn định
            </span>
          </div>
          <h1>Chào buổi làm việc, Superadmin</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Theo dõi doanh thu, tenant và các vấn đề cần ưu tiên trong một không gian quản trị rõ ràng.
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <p className="text-xs font-medium capitalize text-white/60">{todayLabel}</p>
          <BeautifulSelect
            value={timePeriod}
            onChange={(event) => setTimePeriod(event.target.value)}
            aria-label="Chọn khoảng thời gian báo cáo"
            className="sa-period-select"
          >
            {PERIOD_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </BeautifulSelect>
        </div>
      </section>

      <section aria-label="Chỉ số chính" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="sa-metric-card sa-metric-card--violet">
          <div className="sa-metric-icon"><CircleDollarSign /></div>
          <div className="min-w-0">
            <p className="sa-metric-label">Doanh thu định kỳ</p>
            <p className="sa-metric-value">{formatMoney(totalMonthlyRevenue, reportCurrency)}</p>
            <p className="sa-metric-note sa-positive">
              <TrendingUp className="h-3.5 w-3.5" />
              {healthyTenantCount} tenant tạo doanh thu
            </p>
          </div>
        </article>

        <article className="sa-metric-card sa-metric-card--emerald">
          <div className="sa-metric-icon"><Building2 /></div>
          <div className="min-w-0">
            <p className="sa-metric-label">Tenant hoạt động</p>
            <p className="sa-metric-value">{activeCount}<span> / {totalTenants}</span></p>
            <p className="sa-metric-note sa-positive">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tỷ lệ hoạt động {activeRate}%
            </p>
          </div>
        </article>

        <article className="sa-metric-card sa-metric-card--amber">
          <div className="sa-metric-icon"><ReceiptText /></div>
          <div className="min-w-0">
            <p className="sa-metric-label">Công nợ cần thu</p>
            <p className="sa-metric-value">{formatMoney(totalOutstanding, reportCurrency)}</p>
            <p className={`sa-metric-note ${unpaidInvoices.length ? 'sa-warning' : 'sa-positive'}`}>
              <Clock3 className="h-3.5 w-3.5" />
              {unpaidInvoices.length} hóa đơn đang chờ
            </p>
          </div>
        </article>

        <article className="sa-metric-card sa-metric-card--rose">
          <div className="sa-metric-icon"><ShieldCheck /></div>
          <div className="min-w-0">
            <p className="sa-metric-label">Cảnh báo chưa đọc</p>
            <p className="sa-metric-value">{unreadAlerts.length}</p>
            <p className={`sa-metric-note ${unreadAlerts.length ? 'sa-danger' : 'sa-positive'}`}>
              {unreadAlerts.length ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              {unreadAlerts.length ? 'Cần kiểm tra trong hôm nay' : 'Không có vấn đề mới'}
            </p>
          </div>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <section className="sa-panel sa-chart-panel">
          <div className="sa-panel-heading">
            <div>
              <div className="flex items-center gap-2">
                <h2>Doanh thu đã thu</h2>
                <span className="sa-soft-badge">{timePeriod}</span>
              </div>
              <p>Hóa đơn đã thanh toán, trừ phần đã hoàn · {reportCurrency}</p>
            </div>
            {hasPeriodRevenue && (
              <div className="sa-chart-summary">
                <span>{growthPercent === null ? 'Tổng đã thu' : 'So với kỳ liền trước'}</span>
                <strong>
                  {growthPercent === null
                    ? formatMoney(periodRevenue, reportCurrency)
                    : <>{growthPercent >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} {Math.abs(growthPercent).toLocaleString('vi-VN')}%</>}
                </strong>
              </div>
            )}
          </div>

          {!hasPeriodRevenue ? (
            <div className="sa-chart-empty">
              <p>Chưa có hóa đơn nào được thu trong {timePeriod.toLocaleLowerCase('vi')}.</p>
              <p>Biểu đồ sẽ hiện khi có hóa đơn chuyển sang trạng thái đã thanh toán.</p>
            </div>
          ) : (
          <div className="sa-chart">
            <div className="sa-chart-grid" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
            <div className="sa-chart-bars" aria-label={`Doanh thu đã thu theo từng mốc · ${timePeriod}`}>
              {revenueChartData.map((item, index) => {
                const isActive = hoveredBar === index || index === revenueChartData.length - 1;
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`sa-chart-column ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onFocus={() => setHoveredBar(index)}
                    onBlur={() => setHoveredBar(null)}
                    aria-pressed={isActive}
                    onClick={() => setHoveredBar((current) => (current === index ? null : index))}
                    aria-label={`${item.label}: ${formatMoney(item.amount, reportCurrency)}`}
                  >
                    <span className="sa-chart-tooltip">{formatMoney(item.amount, reportCurrency)}</span>
                    <span
                      className="sa-chart-bar"
                      style={{ height: `${maxRevenue > 0 ? Math.max(4, (item.amount / maxRevenue) * 100) : 4}%` }}
                    />
                    <span className="sa-chart-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </section>

        <section className="sa-panel">
          <div className="sa-panel-heading">
            <div>
              <h2>Sức khỏe tenant</h2>
              <p>Phân bổ trạng thái hiện tại</p>
            </div>
            <span className="sa-icon-chip"><UsersRound className="h-4 w-4" /></span>
          </div>

          <div className="sa-health-layout">
            <div className="sa-donut" style={{ background: donutBackground }} aria-label={`${totalTenants} tenant`}>
              <div className="sa-donut-center">
                <strong>{totalTenants}</strong>
                <span>Tổng tenant</span>
              </div>
            </div>

            <div className="sa-status-list">
              {statusSegments.map((segment) => (
                <button
                  key={segment.status}
                  type="button"
                  className={`sa-status-row ${selectedStatusFilter === segment.status ? 'is-active' : ''}`}
                  onClick={() => setSelectedStatusFilter(
                    selectedStatusFilter === segment.status ? 'ALL' : segment.status,
                  )}
                >
                  <span className="sa-status-name">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                    {segment.label}
                  </span>
                  <span><strong>{segment.count}</strong> {segment.percentage}%</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <section className="sa-panel overflow-hidden">
          <div className="sa-panel-heading border-b border-brand-outline/60">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2>Tenant gần đây</h2>
                {selectedStatusFilter !== 'ALL' && (
                  <button type="button" className="sa-filter-pill" onClick={() => setSelectedStatusFilter('ALL')}>
                    {STATUS_META[selectedStatusFilter].label}
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p>Hiển thị {Math.min(filteredTenants.length, 6)} trên {filteredTenants.length} kết quả phù hợp</p>
            </div>
            <button type="button" className="sa-text-button" onClick={() => setSelectedStatusFilter('ALL')}>
              Xóa bộ lọc <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="sa-tenant-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Gói dịch vụ</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Doanh thu/tháng</th>
                  <th><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="sa-empty-state">
                        <Building2 className="h-5 w-5" />
                        <p>Không tìm thấy tenant phù hợp</p>
                        <button type="button" onClick={() => setSelectedStatusFilter('ALL')}>Đặt lại bộ lọc</button>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.slice(0, 6).map((tenant) => {
                  const isAdminSuspended = tenant.adminStatus === 'SUSPENDED';
                  return (
                  <tr
                    key={tenant.id}
                    className={isAdminSuspended ? 'opacity-75 bg-amber-500/[0.04] dark:bg-amber-950/[0.15] border-l-2 border-l-amber-500' : undefined}
                  >
                    <td>
                      <button type="button" className="sa-tenant-name" onClick={() => onViewTenant(tenant)}>
                        <span className="sa-tenant-avatar">{tenant.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong className="flex items-center gap-1.5">
                            {tenant.name}
                            {isAdminSuspended && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                                title="Tenant Admin của tiệm này đang bị khóa tạm thời"
                              >
                                <Lock className="w-2.5 h-2.5 text-amber-500" /> Admin bị khóa
                              </span>
                            )}
                          </strong>
                          <small className={isAdminSuspended ? 'text-amber-700 dark:text-amber-400 font-medium' : undefined}>
                            {tenant.adminEmail}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td><span className="sa-package-pill">{tenant.packageName}</span></td>
                    <td>{getStatusBadge(tenant.status)}</td>
                    <td className="text-right font-semibold text-brand-text">
                      {formatMoney(tenant.monthlyRevenue, tenant.currency)}
                    </td>
                    <td>
                      <div className="sa-row-actions">
                        <button type="button" onClick={() => onViewTenant(tenant)} aria-label={`Xem ${tenant.name}`} title="Xem chi tiết">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleTenantStatus(tenant.id, tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED')}
                          aria-label={tenant.status === 'SUSPENDED' ? `Kích hoạt ${tenant.name}` : `Tạm ngưng ${tenant.name}`}
                          title={tenant.status === 'SUSPENDED' ? 'Kích hoạt dịch vụ' : 'Tạm ngưng dịch vụ'}
                        >
                          {tenant.status === 'SUSPENDED' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sa-panel sa-alert-panel">
          <div className="sa-panel-heading">
            <div>
              <div className="flex items-center gap-2">
                <h2>Cần chú ý</h2>
                {unreadAlerts.length > 0 && <span className="sa-alert-count">{unreadAlerts.length}</span>}
              </div>
              <p>Cảnh báo và sự kiện mới nhất</p>
            </div>
            <button
              type="button"
              className="sa-icon-button"
              onClick={onClearAllAlerts}
              aria-label="Đánh dấu tất cả đã đọc"
              title="Đánh dấu tất cả đã đọc"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>

          <div className="sa-alert-list">
            {alerts.length === 0 ? (
              <div className="sa-empty-alerts">
                <CheckCircle2 className="h-6 w-6" />
                <strong>Mọi thứ đều ổn</strong>
                <p>Không có cảnh báo hệ thống mới.</p>
              </div>
            ) : alerts.slice(0, 5).map((alert) => {
              const Icon = alert.type === 'error' ? XCircle : alert.type === 'warning' ? AlertTriangle : BellRing;
              return (
                <article key={alert.id} className={`sa-alert-item sa-alert-item--${alert.type} ${alert.isRead ? 'is-read' : ''}`}>
                  <span className="sa-alert-icon"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <strong>{alert.title}</strong>
                      {!alert.isRead && (
                        <button
                          type="button"
                          onClick={() => onMarkAlertAsRead(alert.id)}
                          aria-label={`Đánh dấu đã đọc: ${alert.title}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p>{alert.description}</p>
                    <time>{formatAlertTimestamp(alert.createdAt)}</time>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* SUPPORT & SLA TICKETS HUB */}
      <section className="sa-panel overflow-hidden">
        <div className="sa-panel-heading border-b border-brand-outline/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Headphones className="h-4 w-4" />
              </span>
              <h2>Yêu cầu hỗ trợ & Ticket từ Salon</h2>
              {activeTickets.length > 0 && (
                <span className="sa-status-badge bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400">
                  {activeTickets.length} đang chờ xử lý
                </span>
              )}
              {breachedTickets.length > 0 && (
                <span className="sa-status-badge bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {breachedTickets.length} vi phạm SLA
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-brand-text-muted">
              Giám sát các yêu cầu hỗ trợ kỹ thuật, gói cước và sự cố từ các chủ salon trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            className="sa-text-button inline-flex items-center gap-1.5 font-bold text-brand-primary hover:underline cursor-pointer"
            onClick={() => onNavigateToTab?.('support')}
          >
            Đến Trung tâm hỗ trợ <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {activeTickets.length === 0 ? (
          <div className="sa-empty-state py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <strong className="text-sm font-bold text-brand-text">Tất cả ticket đều đã được giải quyết</strong>
            <p className="text-xs text-brand-text-muted mt-1 max-w-md mx-auto">
              Không có yêu cầu hỗ trợ nào đang tồn đọng. Hệ thống vận hành trơn tru!
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab?.('support')}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-outline bg-brand-surface text-xs font-bold text-brand-text"
            >
              Xem lịch sử ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sa-tenant-table">
              <thead>
                <tr>
                  <th>Mã & Chủ đề</th>
                  <th>Salon / Tenant</th>
                  <th>Danh mục</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>SLA</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {activeTickets.slice(0, 5).map((ticket) => {
                  const sla = getSlaState(ticket);
                  return (
                    <tr key={ticket.id}>
                      <td>
                        <div className="min-w-0 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-brand-primary">
                              {ticket.id}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-brand-text truncate mt-0.5">
                            {ticket.subject}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong className="text-xs font-semibold text-brand-text block">
                            {ticket.tenantName}
                          </strong>
                          <span className="text-[10px] text-brand-text-muted">
                            {ticket.requesterName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="inline-block rounded-md bg-brand-surface-high px-2 py-0.5 text-[11px] font-medium text-brand-text">
                          {ticket.category}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${PRIORITY_CONFIG[ticket.priority].className}`}>
                          {PRIORITY_CONFIG[ticket.priority].label}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_CONFIG[ticket.status].className}`}>
                          {STATUS_CONFIG[ticket.status].label}
                        </span>
                      </td>
                      <td>
                        <div className="text-[10px]">
                          <span className={`font-bold flex items-center gap-1 ${sla.className}`}>
                            <Timer className="h-3 w-3" />
                            {sla.label}
                          </span>
                          <span className="text-brand-text-muted block text-[9px] mt-0.5">
                            {sla.detail}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => onNavigateToTab?.('support')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-primary/30 bg-brand-primary/10 text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-colors cursor-pointer"
                        >
                          Xử lý <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
