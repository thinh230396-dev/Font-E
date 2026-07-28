import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  Lock,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import type { CurrencyCode, Invoice, SystemAlert, Tenant, TenantStatus } from '../types';
import { formatAlertTimestamp } from '../utils/alerts';
import { convertMoney, formatMoney } from '../utils/money';

interface OverviewProps {
  tenants: Tenant[];
  invoices: Invoice[];
  alerts: SystemAlert[];
  onMarkAlertAsRead: (id: string) => void;
  onClearAllAlerts: () => void;
  onToggleTenantStatus: (id: string, newStatus: TenantStatus) => void;
  onViewTenant: (tenant: Tenant) => void;
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

export default function Overview({
  tenants,
  invoices,
  alerts,
  onMarkAlertAsRead,
  onClearAllAlerts,
  onToggleTenantStatus,
  onViewTenant,
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

  const revenueChartData = useMemo(() => {
    const current = Math.max(totalMonthlyRevenue, 1);
    return [
      { label: 'T3', amount: current * 0.58 },
      { label: 'T4', amount: current * 0.66 },
      { label: 'T5', amount: current * 0.75 },
      { label: 'T6', amount: current * 0.86 },
      { label: 'T7', amount: current },
    ];
  }, [totalMonthlyRevenue]);
  const maxRevenue = Math.max(...revenueChartData.map((item) => item.amount));

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
                <h2>Xu hướng doanh thu</h2>
                <span className="sa-soft-badge">Ước tính</span>
              </div>
              <p>Doanh thu định kỳ quy đổi theo tháng · {reportCurrency}</p>
            </div>
            <div className="sa-chart-summary">
              <span>Tăng trưởng</span>
              <strong><ArrowUpRight className="h-4 w-4" /> 16,3%</strong>
            </div>
          </div>

          <div className="sa-chart">
            <div className="sa-chart-grid" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
            <div className="sa-chart-bars" aria-label="Biểu đồ xu hướng doanh thu 5 tháng">
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
                    aria-label={`${item.label}: ${formatMoney(item.amount, reportCurrency)}`}
                  >
                    <span className="sa-chart-tooltip">{formatMoney(item.amount, reportCurrency)}</span>
                    <span
                      className="sa-chart-bar"
                      style={{ height: `${Math.max(18, (item.amount / maxRevenue) * 100)}%` }}
                    />
                    <span className="sa-chart-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
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
                ) : filteredTenants.slice(0, 6).map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <button type="button" className="sa-tenant-name" onClick={() => onViewTenant(tenant)}>
                        <span className="sa-tenant-avatar">{tenant.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong>{tenant.name}</strong>
                          <small>{tenant.adminEmail}</small>
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
                ))}
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
    </div>
  );
}
