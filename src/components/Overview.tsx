import { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info,
  FileText, 
  Users, 
  Calendar,
  Eye,
  Lock,
  Unlock,
  BellRing,
  ExternalLink,
  Filter,
  TrendingUp,
  XCircle,
  X,
} from 'lucide-react';
import { Invoice, Tenant, SystemAlert, TenantStatus } from '../types';
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
}

export default function Overview({ 
  tenants, 
  invoices,
  alerts, 
  onMarkAlertAsRead, 
  onClearAllAlerts,
  onToggleTenantStatus,
  onViewTenant,
  searchQuery
}: OverviewProps) {
  
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<TenantStatus | 'ALL'>('ALL');
  const [timePeriod, setTimePeriod] = useState('30 ngày qua');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Filter tenants based on search query AND active donut-click filter
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedStatusFilter === 'ALL') {
      return matchesSearch;
    }
    return matchesSearch && t.status === selectedStatusFilter;
  });

  // Calculate high-fidelity stats dynamically based on the full tenant array
  const totalTenantsCount = tenants.length;
  const activeCount = tenants.filter(t => t.status === 'ACTIVE').length;
  const trialCount = tenants.filter(t => t.status === 'TRIAL').length;
  const suspendedCount = tenants.filter(t => t.status === 'SUSPENDED').length;
  const expiringCount = tenants.filter(t => t.status === 'EXPIRING').length;
  const overdueCount = tenants.filter(t => t.status === 'OVERDUE').length;
  const totalMonthlyRev = tenants.reduce((acc, curr) => (
    acc + (curr.status === 'ACTIVE' || curr.status === 'TRIAL' || curr.status === 'EXPIRING' ? convertMoney(curr.monthlyRevenue, curr.currency, 'VND') : 0)
  ), 0);
  const unpaidInvoices = invoices.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE');
  const totalOutstanding = unpaidInvoices.reduce((sum, invoice) => (
    sum + convertMoney(invoice.amount, invoice.currency, 'VND')
  ), 0);

  const statusSegments = [
    { status: 'ACTIVE' as const, label: 'Đang hoạt động', count: activeCount, color: '#4fdbc8', className: 'bg-brand-secondary', activeClass: 'bg-brand-secondary/10 border-brand-secondary' },
    { status: 'TRIAL' as const, label: 'Dùng thử', count: trialCount, color: '#7c3aed', className: 'bg-brand-primary', activeClass: 'bg-brand-primary/10 border-brand-primary' },
    { status: 'EXPIRING' as const, label: 'Sắp hết hạn', count: expiringCount, color: '#ffb786', className: 'bg-brand-tertiary', activeClass: 'bg-brand-tertiary/10 border-brand-tertiary' },
    { status: 'OVERDUE' as const, label: 'Quá hạn', count: overdueCount, color: '#ffb4ab', className: 'bg-brand-error', activeClass: 'bg-brand-error/10 border-brand-error' },
    { status: 'SUSPENDED' as const, label: 'Tạm ngưng', count: suspendedCount, color: '#8c909f', className: 'bg-brand-outline', activeClass: 'bg-brand-outline/20 border-brand-outline' }
  ];
  let statusOffset = 0;
  const statusChartSegments = statusSegments.map((segment) => {
    const percentage = totalTenantsCount > 0 ? (segment.count / totalTenantsCount) * 100 : 0;
    const chartSegment = { ...segment, percentage, offset: statusOffset };
    statusOffset += percentage;
    return chartSegment;
  });

  // Revenue chart data
  const revenueChartData = [
    { month: 'Tháng 3', amount: 18, label: 'T3' },
    { month: 'Tháng 4', amount: 25, label: 'T4' },
    { month: 'Tháng 5', amount: 32, label: 'T5' },
    { month: 'Tháng 6', amount: 40, label: 'T6' },
    { month: 'Tháng 7', amount: 52, label: 'T7' }
  ];

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20">Hoạt động</span>;
      case 'TRIAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">Dùng thử</span>;
      case 'EXPIRING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20">Sắp hết hạn</span>;
      case 'OVERDUE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-error/10 text-brand-error border border-brand-error/20">Quá hạn</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-outline/20 text-brand-text-muted border border-brand-outline/30">Tạm ngưng</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-xs text-brand-text-muted mt-1">Quản lý hiệu suất và trạng thái hoạt động của mạng lưới tiệm Nail.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Filter className="w-3.5 h-3.5 text-brand-text-muted" />
          <select 
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="bg-brand-surface border border-brand-outline/40 rounded-lg px-3 py-1.5 text-xs text-brand-text font-medium focus:border-brand-primary focus:outline-none cursor-pointer"
          >
            <option>30 ngày qua</option>
            <option>Tháng này</option>
            <option>Quý này</option>
            <option>Năm nay</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Doanh thu */}
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-brand-text-muted">Doanh thu</span>
            <h3 className="text-xl font-extrabold text-brand-text tracking-tight mt-1">{formatMoney(totalMonthlyRev, 'VND')}</h3>
            <div className="text-[11px] font-semibold text-brand-secondary flex items-center mt-1">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              <span>{activeCount + trialCount + expiringCount} <span className="font-normal text-brand-text-muted">tenant đang tạo doanh thu</span></span>
            </div>
          </div>
        </div>

        {/* Card 2: Tenant hoạt động */}
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-brand-text-muted">Tenant hoạt động</span>
            <h3 className="text-xl font-extrabold text-brand-text tracking-tight mt-1">{activeCount}</h3>
            <div className="text-[11px] font-semibold text-brand-secondary flex items-center mt-1">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              <span>{activeCount}/{totalTenantsCount} <span className="font-normal text-brand-text-muted">tenant hiện hoạt động</span></span>
            </div>
          </div>
        </div>

        {/* Card 3: Lịch hẹn hôm nay */}
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-brand-text-muted">Lịch hẹn hôm nay</span>
            <h3 className="text-xl font-extrabold text-brand-text tracking-tight mt-1">—</h3>
            <div className="text-[11px] font-medium text-brand-text-muted flex items-center mt-1">
              <Info className="w-3.5 h-3.5 mr-1" />
              <span>Chưa kết nối dữ liệu lịch hẹn</span>
            </div>
          </div>
        </div>

        {/* Card 4: Nợ thanh toán */}
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-brand-text-muted">Nợ thanh toán</span>
            <h3 className="text-xl font-extrabold text-brand-text tracking-tight mt-1">{formatMoney(totalOutstanding, 'VND')}</h3>
            <div className="text-[11px] font-semibold text-brand-error flex items-center mt-1">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              <span>{unpaidInvoices.length} <span className="font-normal text-brand-text-muted">hóa đơn chưa thanh toán</span></span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Row: Tenants List & Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tenants Gần Đây (Wide Table) */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-outline/40 rounded-xl flex flex-col overflow-hidden shadow-md">
          <div className="px-5 py-4 border-b border-brand-outline/35 flex justify-between items-center bg-brand-surface/40">
            <div>
              <h2 className="font-semibold text-sm text-brand-text flex items-center gap-2">
                <span>Tenants Gần Đây</span>
                {selectedStatusFilter !== 'ALL' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center gap-1 animate-fadeIn">
                    <span>Lọc: {selectedStatusFilter}</span>
                    <button onClick={() => setSelectedStatusFilter('ALL')} className="hover:text-brand-error font-bold">×</button>
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-brand-text-muted mt-0.5">Danh sách {filteredTenants.length} / {tenants.length} tenants dựa trên bộ lọc.</p>
            </div>
            <button 
              onClick={() => setSelectedStatusFilter('ALL')}
              className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/40 text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                  <th className="py-3 px-5">Tên Tiệm</th>
                  <th className="py-3 px-5">Admin Email</th>
                  <th className="py-3 px-5">Gói dịch vụ</th>
                  <th className="py-3 px-5">Trạng Thái</th>
                  <th className="py-3 px-5 text-right">Doanh Thu (Tháng)</th>
                  <th className="py-3 px-5 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-brand-outline/25">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-brand-text-muted">
                      Không tìm thấy tenant nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredTenants.slice(0, 5).map((tenant) => (
                    <tr 
                      key={tenant.id}
                      className="hover:bg-brand-surface-high/35 transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-semibold text-brand-text">
                        <div className="flex flex-col">
                          <span>{tenant.name}</span>
                          <span className="text-[9px] text-brand-text-muted/60 font-mono mt-0.5">{tenant.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-brand-text-muted font-medium">
                        {tenant.adminEmail}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`text-[10px] font-bold ${
                          tenant.packageName === 'Enterprise' 
                            ? 'text-brand-tertiary' 
                            : tenant.packageName === 'Premium' 
                            ? 'text-brand-secondary' 
                            : 'text-brand-primary'
                        }`}>
                          {tenant.packageName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {getStatusBadge(tenant.status)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-medium text-brand-text">
                        {formatMoney(tenant.monthlyRevenue, tenant.currency)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onViewTenant(tenant)}
                            title="Xem chi tiết"
                            className="p-1 rounded text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface-high transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {tenant.status === 'SUSPENDED' ? (
                            <button 
                              onClick={() => onToggleTenantStatus(tenant.id, 'ACTIVE')}
                              title="Kích hoạt dịch vụ"
                              className="p-1 rounded text-brand-text-muted hover:text-brand-secondary hover:bg-brand-surface-high transition-colors cursor-pointer"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => onToggleTenantStatus(tenant.id, 'SUSPENDED')}
                              title="Tạm ngừng dịch vụ"
                              className="p-1 rounded text-brand-text-muted hover:text-brand-error hover:bg-brand-surface-high transition-colors cursor-pointer"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Doanh thu phần mềm (SaaS Revenue Chart) */}
        <div className="bg-brand-surface border border-brand-outline/40 rounded-xl p-5 flex flex-col shadow-md">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-semibold text-sm text-brand-text">Doanh thu phần mềm</h2>
              <p className="text-[10px] text-brand-text-muted mt-0.5">Biểu đồ xu hướng minh họa; chưa có nguồn lịch sử doanh thu</p>
            </div>
            <span className="p-1 rounded-lg bg-brand-primary/10 text-brand-primary">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          {/* Custom SVG/HTML Bar Chart with Animations and Tooltips */}
          <div className="flex-1 flex items-end justify-between h-48 mt-2 relative border-b border-brand-outline/30 pb-1">
            
            {revenueChartData.map((bar, idx) => {
              const maxVal = 60; // scale limit
              const heightPercent = `${(bar.amount / maxVal) * 100}%`;
              const isHovered = hoveredBar === idx;

              return (
                <div 
                  key={idx}
                  className="w-[15%] flex flex-col items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-12 z-20 bg-brand-surface-highest border border-brand-outline px-2.5 py-1.5 rounded-lg text-center shadow-lg animate-fadeIn text-[10px]">
                      <p className="font-bold text-brand-text">{formatMoney(bar.amount * 1000000, 'VND')}</p>
                      <p className="text-[8px] text-brand-text-muted">Doanh thu tháng</p>
                    </div>
                  )}

                  {/* Visual Column bar */}
                  <div 
                    style={{ height: heightPercent }}
                    className={`
                      w-full rounded-t-lg transition-all duration-500 relative overflow-hidden
                      ${isHovered 
                        ? 'bg-brand-primary shadow-lg shadow-brand-primary/20 scale-x-105' 
                        : idx === revenueChartData.length - 1 
                        ? 'bg-brand-primary/90' 
                        : 'bg-brand-primary/45 hover:bg-brand-primary/75'
                      }
                    `}
                  >
                    {/* Glass sheen inside the bar */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent pointer-events-none" />
                  </div>

                  {/* Horizontal Labels */}
                  <span className="text-[10px] text-brand-text-muted font-semibold mt-2.5">
                    {bar.label}
                  </span>
                </div>
              );
            })}

            {/* Simulated background reference lines */}
            <div className="absolute inset-x-0 top-1/4 border-t border-brand-outline/10 border-dashed pointer-events-none" />
            <div className="absolute inset-x-0 top-2/4 border-t border-brand-outline/10 border-dashed pointer-events-none" />
            <div className="absolute inset-x-0 top-3/4 border-t border-brand-outline/10 border-dashed pointer-events-none" />
          </div>

          <div className="flex items-center justify-between mt-4 text-[10px] text-brand-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-brand-primary/45" />
              <span>Tháng trước</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-brand-primary" />
              <span>Tháng hiện tại (Đạt đỉnh)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Status Pie/Donut Chart & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Phân bổ trạng thái Tenant (Donut Chart) */}
        <div className="bg-brand-surface border border-brand-outline/40 rounded-xl p-5 flex flex-col shadow-md">
          <div className="mb-4">
            <h2 className="font-semibold text-sm text-brand-text">Phân bổ trạng thái Tenant</h2>
            <p className="text-[10px] text-brand-text-muted mt-0.5">Click vào trạng thái để lọc nhanh danh sách Tenant ở trên!</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4 flex-1">
            
            {/* Donut rendering */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--color-brand-surface-highest)" strokeWidth="3" />
                {statusChartSegments.map((segment) => (
                  <circle
                    key={segment.status}
                    cx="18"
                    cy="18"
                    r="15.915"
                    pathLength="100"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="3.2"
                    strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                    strokeDashoffset={-segment.offset}
                    className="transition-all duration-500 cursor-pointer hover:opacity-80"
                    onClick={() => setSelectedStatusFilter(segment.status)}
                  />
                ))}
              </svg>

              {/* Total indicator inside donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-brand-text leading-none">{totalTenantsCount}</span>
                <span className="text-[9px] text-brand-text-muted mt-1 uppercase font-semibold">Tổng số</span>
              </div>
            </div>

            {/* Interactive Legend with dynamic styling and indicators */}
            <div className="flex-1 space-y-2 max-w-xs w-full">
              {statusChartSegments.map((segment) => (
                <button
                  key={segment.status}
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === segment.status ? 'ALL' : segment.status)}
                  className={`w-full flex items-center justify-between text-xs px-2 py-1 rounded transition-colors text-left border-l-4 ${
                    selectedStatusFilter === segment.status ? segment.activeClass : 'border-transparent hover:bg-brand-surface-high/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${segment.className} inline-block shrink-0`} />
                    <span className="text-brand-text">{segment.label}</span>
                  </div>
                  <span className="font-mono text-brand-text-muted font-bold text-[10px]">
                    {segment.count} ({Math.round(segment.percentage)}%)
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cảnh báo hệ thống (Alert Feed) */}
        <div className="bg-brand-surface border border-brand-outline/40 rounded-xl p-5 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm text-brand-text flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-error opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-error" />
              </span>
              <span>Cảnh báo hệ thống</span>
            </h2>
            <button 
              onClick={onClearAllAlerts}
              className="text-xs text-brand-primary hover:underline cursor-pointer"
            >
              Đánh dấu đã đọc tất cả
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[190px] pr-1.5 flex-1">
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-brand-text-muted">
                Tuyệt vời! Không có cảnh báo hệ thống chưa xử lý.
              </div>
            ) : (
              alerts.map((alert) => {
                const isError = alert.type === 'error';
                const isWarning = alert.type === 'warning';
                
                return (
                  <div 
                    key={alert.id}
                    className={`
                      p-3 rounded-xl border transition-all duration-300 relative group
                      ${isError 
                        ? 'bg-brand-error/5 border-brand-error/20 hover:bg-brand-error/10' 
                        : isWarning 
                        ? 'bg-brand-warning/5 border-brand-warning/20 hover:bg-brand-warning/10' 
                        : 'bg-brand-surface-high/30 border-brand-outline/25 hover:bg-brand-surface-high/50'
                      }
                      ${alert.isRead ? 'opacity-60 hover:opacity-90' : ''}
                    `}
                  >
                    <div className="flex gap-3 items-start pr-6">
                      <div className={`
                        p-1 rounded-md mt-0.5
                        ${isError ? 'text-brand-error' : isWarning ? 'text-brand-tertiary' : 'text-brand-primary'}
                      `}>
                        {isError ? (
                          <XCircle className="w-4 h-4" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <BellRing className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold text-brand-text ${!alert.isRead ? 'font-bold' : ''}`}>
                          {alert.title}
                        </p>
                        <p className="text-[10px] text-brand-text-muted mt-1 font-medium leading-relaxed">
                          {alert.description}
                        </p>
                        <span className="text-[8px] text-brand-text-muted/60 mt-1.5 block font-mono">
                          {alert.createdAt}
                        </span>
                      </div>
                    </div>

                    {/* Quick clear button */}
                    {!alert.isRead && (
                      <button 
                        onClick={() => onMarkAlertAsRead(alert.id)}
                        title="Đánh dấu đã đọc"
                        className="absolute top-3 right-3 p-1 rounded text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
