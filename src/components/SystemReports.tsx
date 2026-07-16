import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Printer,
  ReceiptText,
  Search,
  Users
} from 'lucide-react';
import { Invoice, SubscriptionPackage, Tenant, TenantStatus } from '../types';
import { convertMoney, formatMoney } from '../utils/money';

interface SystemReportsProps {
  tenants: Tenant[];
  invoices: Invoice[];
  packages: SubscriptionPackage[];
}

const ALL = 'ALL';
type ReportScope = 'ADMIN' | 'TENANT';
type InvoiceStatusFilter = typeof ALL | Invoice['status'];
type TenantSort = 'REVENUE_DESC' | 'REVENUE_ASC' | 'NAME_ASC' | 'STAFF_DESC';

const tenantStatusMeta: Record<TenantStatus, { label: string; color: string; badge: string }> = {
  ACTIVE: { label: 'Đang hoạt động', color: '#4fdbc8', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  TRIAL: { label: 'Dùng thử', color: '#8b5cf6', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/25' },
  EXPIRING: { label: 'Sắp hết hạn', color: '#f59e0b', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  OVERDUE: { label: 'Quá hạn', color: '#ef4444', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25' },
  SUSPENDED: { label: 'Tạm ngưng', color: '#94a3b8', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25' }
};

const invoiceStatusMeta: Record<Invoice['status'], { label: string; badge: string }> = {
  PAID: { label: 'Đã thanh toán', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  PENDING: { label: 'Đang chờ', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  OVERDUE: { label: 'Quá hạn', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25' }
};

const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('vi-VN') : '—';
};

const toVnd = (amount: number, currency?: string) => convertMoney(Number(amount || 0), currency, 'VND');

export default function SystemReports({ tenants, invoices, packages }: SystemReportsProps) {
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    invoices.forEach((invoice) => {
      const date = parseDate(invoice.createdAt);
      if (date) years.add(date.getFullYear());
    });
    tenants.forEach((tenant) => {
      const date = parseDate(tenant.createdAt);
      if (date) years.add(date.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [currentYear, invoices, tenants]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [reportScope, setReportScope] = useState<ReportScope>('ADMIN');
  const [packageFilter, setPackageFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>(ALL);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantSort, setTenantSort] = useState<TenantSort>('REVENUE_DESC');
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantPageSize, setTenantPageSize] = useState(10);

  const tenantById = useMemo(() => new Map(tenants.map((tenant) => [tenant.id, tenant])), [tenants]);

  const filteredTenants = useMemo(() => tenants.filter((tenant) => (
    (packageFilter === ALL || tenant.packageName === packageFilter)
    && (statusFilter === ALL || tenant.status === statusFilter)
  )), [packageFilter, statusFilter, tenants]);

  const filteredTenantIds = useMemo(() => new Set(filteredTenants.map((tenant) => tenant.id)), [filteredTenants]);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const createdAt = parseDate(invoice.createdAt);
    if (!createdAt || createdAt.getFullYear() !== selectedYear) return false;

    const tenant = tenantById.get(invoice.tenantId);
    if (tenant) return filteredTenantIds.has(tenant.id);

    const matchesPackage = packageFilter === ALL || invoice.planName === packageFilter;
    return matchesPackage && statusFilter === ALL;
  }), [filteredTenantIds, invoices, packageFilter, selectedYear, statusFilter, tenantById]);

  const totalTenantRevenueVnd = filteredTenants.reduce((sum, tenant) => (
    sum + toVnd(tenant.monthlyRevenue, tenant.currency)
  ), 0);
  const totalStaff = filteredTenants.reduce((sum, tenant) => sum + Number(tenant.staffCount || 0), 0);
  const totalBranches = filteredTenants.reduce((sum, tenant) => sum + Math.max(tenant.branches?.length || 0, 1), 0);
  const activeTenants = filteredTenants.filter((tenant) => tenant.status === 'ACTIVE').length;
  const tenantBranchStats = filteredTenants.reduce((summary, tenant) => {
    if (!tenant.branches?.length) return { total: summary.total + 1, active: summary.active + 1, inactive: summary.inactive };
    return tenant.branches.reduce((branchSummary, branch) => ({
      total: branchSummary.total + 1,
      active: branchSummary.active + (branch.status === 'ACTIVE' ? 1 : 0),
      inactive: branchSummary.inactive + (branch.status === 'INACTIVE' ? 1 : 0)
    }), summary);
  }, { total: 0, active: 0, inactive: 0 });
  const averageStaffPerTenant = filteredTenants.length ? Math.round(totalStaff / filteredTenants.length) : 0;
  const averageTenantRevenueVnd = filteredTenants.length ? Math.round(totalTenantRevenueVnd / filteredTenants.length) : 0;
  const revenuePerBranchVnd = totalBranches ? Math.round(totalTenantRevenueVnd / totalBranches) : 0;
  const tenantsWithOnlineBooking = filteredTenants.filter((tenant) => tenant.allowOnlineBooking).length;
  const tenantsWithPaymentGateway = filteredTenants.filter((tenant) => tenant.paymentGatewayConfigured).length;
  const usedPackageCount = new Set(filteredTenants.map((tenant) => tenant.packageName)).size;
  const verifiedAdminEmailTenants = filteredTenants.filter((tenant) => tenant.adminEmailVerified).length;
  const tenantsExpiringSoon = filteredTenants.filter((tenant) => (
    tenant.status === 'EXPIRING'
    || (typeof tenant.daysRemaining === 'number' && tenant.daysRemaining >= 0 && tenant.daysRemaining <= 30)
  ));
  const tenantsWithPaymentIssues = filteredTenants.filter((tenant) => (
    tenant.status === 'OVERDUE'
    || ['WARNING', 'OVERDUE', 'SUSPENDED', 'UNPAID', 'PENDING'].includes(tenant.paymentStatus || '')
  ));
  const newTenantsInYear = filteredTenants.filter((tenant) => parseDate(tenant.createdAt)?.getFullYear() === selectedYear).length;
  const tenantsNeedingAttention = filteredTenants.filter((tenant) => ['EXPIRING', 'OVERDUE', 'SUSPENDED'].includes(tenant.status));
  const activePackageCount = packages.filter((pkg) => !pkg.status || pkg.status === 'ACTIVE').length;
  const collectedRevenueVnd = filteredInvoices
    .filter((invoice) => invoice.status === 'PAID')
    .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0);
  const billedRevenueVnd = filteredInvoices
    .filter((invoice) => invoice.status !== 'CANCELLED')
    .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0);
  const receivableVnd = filteredInvoices
    .filter((invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE')
    .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0);
  const overdueInvoices = filteredInvoices.filter((invoice) => invoice.status === 'OVERDUE');
  const collectionRate = billedRevenueVnd > 0 ? Math.round((collectedRevenueVnd / billedRevenueVnd) * 100) : 0;
  const billedInvoiceCount = filteredInvoices.filter((invoice) => invoice.status !== 'CANCELLED').length;
  const averageInvoiceVnd = billedInvoiceCount > 0 ? Math.round(billedRevenueVnd / billedInvoiceCount) : 0;
  const invoiceStatusSummary = (Object.keys(invoiceStatusMeta) as Invoice['status'][]).map((status) => {
    const statusInvoices = filteredInvoices.filter((invoice) => invoice.status === status);
    return {
      status,
      count: statusInvoices.length,
      amountVnd: statusInvoices.reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0)
    };
  });

  const monthlyReport = useMemo(() => monthLabels.map((label, monthIndex) => {
    const monthInvoices = filteredInvoices.filter((invoice) => parseDate(invoice.createdAt)?.getMonth() === monthIndex);
    const monthTenants = filteredTenants.filter((tenant) => {
      const createdAt = parseDate(tenant.createdAt);
      return createdAt?.getFullYear() === selectedYear && createdAt.getMonth() === monthIndex;
    });
    return {
      label,
      invoiceCount: monthInvoices.length,
      billedVnd: monthInvoices
        .filter((invoice) => invoice.status !== 'CANCELLED')
        .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0),
      collectedVnd: monthInvoices
        .filter((invoice) => invoice.status === 'PAID')
        .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0),
      newTenants: monthTenants.length
    };
  }), [filteredInvoices, filteredTenants, selectedYear]);

  const chartMaximum = Math.max(1, ...monthlyReport.flatMap((month) => [month.billedVnd, month.collectedVnd]));

  const packageBreakdown = useMemo(() => {
    const packageNames = new Set([...packages.map((pkg) => pkg.name), ...filteredTenants.map((tenant) => tenant.packageName)]);
    return [...packageNames]
      .map((name) => ({
        name,
        count: filteredTenants.filter((tenant) => tenant.packageName === name).length,
        color: packages.find((pkg) => pkg.name === name)?.color || '#8b5cf6'
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredTenants, packages]);

  const statusBreakdown = (Object.keys(tenantStatusMeta) as TenantStatus[])
    .map((status) => ({
      status,
      count: filteredTenants.filter((tenant) => tenant.status === status).length,
      percent: filteredTenants.length ? Math.round((filteredTenants.filter((tenant) => tenant.status === status).length / filteredTenants.length) * 100) : 0
    }))
    .filter((item) => item.count > 0);

  const topTenants = [...filteredTenants]
    .sort((a, b) => toVnd(b.monthlyRevenue, b.currency) - toVnd(a.monthlyRevenue, a.currency))
    .slice(0, 5);

  const tenantRevenueRanking = [...filteredTenants]
    .sort((a, b) => toVnd(b.monthlyRevenue, b.currency) - toVnd(a.monthlyRevenue, a.currency))
    .slice(0, 10);
  const maximumTenantRevenue = Math.max(1, ...tenantRevenueRanking.map((tenant) => toVnd(tenant.monthlyRevenue, tenant.currency)));

  const adminPackagePerformance = useMemo(() => {
    const packageNames = new Set([
      ...packages.map((pkg) => pkg.name),
      ...filteredTenants.map((tenant) => tenant.packageName),
      ...filteredInvoices.map((invoice) => invoice.planName || tenantById.get(invoice.tenantId)?.packageName || 'Chưa gắn gói')
    ]);
    return [...packageNames].map((name) => {
      const packageInvoices = filteredInvoices.filter((invoice) => (
        invoice.planName || tenantById.get(invoice.tenantId)?.packageName || 'Chưa gắn gói'
      ) === name);
      const billedVnd = packageInvoices
        .filter((invoice) => invoice.status !== 'CANCELLED')
        .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0);
      const collectedVnd = packageInvoices
        .filter((invoice) => invoice.status === 'PAID')
        .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0);
      const debtVnd = packageInvoices
        .filter((invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE')
        .reduce((sum, invoice) => sum + toVnd(invoice.amount, invoice.currency), 0);
      return {
        name,
        color: packages.find((pkg) => pkg.name === name)?.color || '#8b5cf6',
        tenantCount: filteredTenants.filter((tenant) => tenant.packageName === name).length,
        invoiceCount: packageInvoices.length,
        billedVnd,
        collectedVnd,
        debtVnd,
        collectionRate: billedVnd > 0 ? Math.round((collectedVnd / billedVnd) * 100) : 0
      };
    }).filter((item) => item.tenantCount > 0 || item.invoiceCount > 0);
  }, [filteredInvoices, filteredTenants, packages, tenantById]);

  const invoiceTableRows = useMemo(() => {
    const normalizedSearch = invoiceSearch.trim().toLocaleLowerCase('vi-VN');
    return [...filteredInvoices]
      .filter((invoice) => {
        if (invoiceStatusFilter !== ALL && invoice.status !== invoiceStatusFilter) return false;
        if (!normalizedSearch) return true;
        const searchableText = [
          invoice.invoiceCode,
          invoice.id,
          invoice.tenantName,
          invoice.planName,
          tenantById.get(invoice.tenantId)?.packageName
        ].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');
        return searchableText.includes(normalizedSearch);
      })
      .sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0));
  }, [filteredInvoices, invoiceSearch, invoiceStatusFilter, tenantById]);
  const invoicePageCount = Math.max(1, Math.ceil(invoiceTableRows.length / invoicePageSize));
  const currentInvoicePage = Math.min(invoicePage, invoicePageCount);
  const invoicePageStart = (currentInvoicePage - 1) * invoicePageSize;
  const paginatedInvoices = invoiceTableRows.slice(invoicePageStart, invoicePageStart + invoicePageSize);
  const tenantTableRows = useMemo(() => {
    const normalizedSearch = tenantSearch.trim().toLocaleLowerCase('vi-VN');
    const rows = filteredTenants.filter((tenant) => {
      if (!normalizedSearch) return true;
      const searchableText = [tenant.name, tenant.id, tenant.packageName]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi-VN');
      return searchableText.includes(normalizedSearch);
    });

    return rows.sort((a, b) => {
      if (tenantSort === 'NAME_ASC') return a.name.localeCompare(b.name, 'vi');
      if (tenantSort === 'STAFF_DESC') return Number(b.staffCount || 0) - Number(a.staffCount || 0);
      const revenueDifference = toVnd(b.monthlyRevenue, b.currency) - toVnd(a.monthlyRevenue, a.currency);
      return tenantSort === 'REVENUE_ASC' ? -revenueDifference : revenueDifference;
    });
  }, [filteredTenants, tenantSearch, tenantSort]);
  const tenantPageCount = Math.max(1, Math.ceil(tenantTableRows.length / tenantPageSize));
  const currentTenantPage = Math.min(tenantPage, tenantPageCount);
  const tenantPageStart = (currentTenantPage - 1) * tenantPageSize;
  const paginatedTenants = tenantTableRows.slice(tenantPageStart, tenantPageStart + tenantPageSize);

  const handleExportCsv = () => {
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const commonRows: Array<Array<string | number>> = [
      [reportScope === 'ADMIN' ? 'BÁO CÁO SUPERADMIN SALONSYS' : 'BÁO CÁO VẬN HÀNH TENANT'],
      ['Phạm vi', reportScope === 'ADMIN' ? 'Superadmin / Nền tảng' : 'Tenant / Vận hành'],
      ['Gói dịch vụ', packageFilter === ALL ? 'Tất cả' : packageFilter],
      ['Trạng thái tenant', statusFilter === ALL ? 'Tất cả' : tenantStatusMeta[statusFilter as TenantStatus].label],
    ];
    const adminRows: Array<Array<string | number>> = [
      ['Năm báo cáo', selectedYear], [], ['TỔNG QUAN SUPERADMIN'],
      ['Doanh thu hóa đơn đã thu (VND)', collectedRevenueVnd],
      ['Công nợ phải thu (VND)', receivableVnd],
      ['Tỷ lệ thu tiền', `${collectionRate}%`],
      ['Tổng hóa đơn', filteredInvoices.length],
      [], ['HÓA ĐƠN GÓI DỊCH VỤ'],
      ['Mã hóa đơn', 'Ngày tạo', 'Tenant', 'Gói', 'Trạng thái', 'Số tiền', 'Tiền tệ', 'Quy đổi VND'],
      ...filteredInvoices.map((invoice) => [
        invoice.invoiceCode || invoice.id, formatDate(invoice.createdAt), invoice.tenantName,
        invoice.planName || tenantById.get(invoice.tenantId)?.packageName || '—',
        invoiceStatusMeta[invoice.status].label, invoice.amount, invoice.currency || 'VND', toVnd(invoice.amount, invoice.currency)
      ])
    ];
    const tenantRows: Array<Array<string | number>> = [
      [], ['TỔNG QUAN TENANT'],
      ['Tenant theo bộ lọc', filteredTenants.length],
      ['Tenant đang hoạt động', activeTenants],
      ['Tổng chi nhánh', totalBranches],
      ['Chi nhánh đang hoạt động', tenantBranchStats.active],
      ['Chi nhánh ngừng hoạt động', tenantBranchStats.inactive],
      ['Tổng nhân sự', totalStaff],
      ['Doanh thu vận hành/tháng (VND)', totalTenantRevenueVnd],
      ['Doanh thu trung bình/tenant (VND)', averageTenantRevenueVnd],
      ['Doanh thu trung bình/chi nhánh (VND)', revenuePerBranchVnd],
      ['Tenant đã bật đặt lịch online', tenantsWithOnlineBooking],
      ['Tenant đã cấu hình thanh toán', tenantsWithPaymentGateway],
      ['Tenant sắp hết hạn trong 30 ngày', tenantsExpiringSoon.length],
      ['Tenant có vấn đề thanh toán', tenantsWithPaymentIssues.length],
      [], ['CHI TIẾT TENANT'],
      ['Mã tenant', 'Tên tenant', 'Gói', 'Trạng thái', 'Chi nhánh', 'Nhân sự', 'Doanh thu tháng', 'Tiền tệ'],
      ...filteredTenants.map((tenant) => [
        tenant.id, tenant.name, tenant.packageName, tenantStatusMeta[tenant.status].label,
        Math.max(tenant.branches?.length || 0, 1), tenant.staffCount, tenant.monthlyRevenue, tenant.currency || 'VND'
      ])
    ];
    const rows = [...commonRows, ...(reportScope === 'ADMIN' ? adminRows : tenantRows)];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `salonsys-${reportScope === 'ADMIN' ? 'admin' : 'tenant'}-report-${reportScope === 'ADMIN' ? selectedYear : 'current'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSelectedYear(availableYears[0] || currentYear);
    setPackageFilter(ALL);
    setStatusFilter(ALL);
    setInvoiceSearch('');
    setInvoiceStatusFilter(ALL);
    setInvoicePage(1);
    setTenantSearch('');
    setTenantSort('REVENUE_DESC');
    setTenantPage(1);
  };

  return (
    <div className="space-y-5 print:bg-white print:text-black">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-primary" />
            <span>Báo cáo & Phân tích hệ thống</span>
          </h1>
          <p className="text-xs text-brand-text-muted mt-1">
            {reportScope === 'ADMIN'
              ? `Doanh thu nền tảng, hóa đơn gói dịch vụ và công nợ trong năm ${selectedYear}.`
              : 'Doanh thu vận hành, quy mô nhân sự và hiệu suất hiện tại của các tenant.'}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            className="shrink-0 bg-brand-surface-high hover:bg-brand-surface-highest text-brand-text border border-brand-outline/35 text-xs font-semibold px-3.5 py-2 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="shrink-0 bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary text-xs font-bold px-4 py-2 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>In / Lưu PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-end gap-3 print:hidden">
        <label className="flex-1 min-w-[190px]">
          <span className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Phạm vi báo cáo</span>
          <select value={reportScope} onChange={(event) => { setReportScope(event.target.value as ReportScope); setHoveredMonth(null); setInvoicePage(1); setTenantPage(1); }} className="form-control">
            <option value="ADMIN">Superadmin / Nền tảng</option>
            <option value="TENANT">Tenant / Vận hành</option>
          </select>
        </label>
        {reportScope === 'ADMIN' && (
        <label className="flex-1 min-w-[140px]">
          <span className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Năm báo cáo</span>
          <select value={selectedYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setInvoicePage(1); }} className="form-control">
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        )}
        <label className="flex-1 min-w-[170px]">
          <span className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Gói dịch vụ</span>
          <select value={packageFilter} onChange={(event) => { setPackageFilter(event.target.value); setInvoicePage(1); setTenantPage(1); }} className="form-control">
            <option value={ALL}>Tất cả gói</option>
            {packages.map((pkg) => <option key={pkg.id} value={pkg.name}>{pkg.name}</option>)}
          </select>
        </label>
        <label className="flex-1 min-w-[180px]">
          <span className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Trạng thái tenant</span>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setInvoicePage(1); setTenantPage(1); }} className="form-control">
            <option value={ALL}>Tất cả trạng thái</option>
            {(Object.keys(tenantStatusMeta) as TenantStatus[]).map((status) => (
              <option key={status} value={status}>{tenantStatusMeta[status].label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={resetFilters} className="px-4 py-2 rounded-lg border border-brand-outline/40 text-xs font-semibold text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high cursor-pointer">
          Đặt lại bộ lọc
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {reportScope === 'ADMIN' ? (
          <>
            <ReportCard icon={<CircleDollarSign className="w-5 h-5" />} iconClass="bg-emerald-500/10 text-emerald-400" label="Đã thu từ gói dịch vụ" value={formatMoney(collectedRevenueVnd, 'VND')} note={`${collectionRate}% trên tổng giá trị đã lập năm ${selectedYear}`} />
            <ReportCard icon={<AlertTriangle className="w-5 h-5" />} iconClass="bg-amber-500/10 text-amber-400" label="Công nợ nền tảng" value={formatMoney(receivableVnd, 'VND')} note={`${overdueInvoices.length} hóa đơn đang quá hạn`} />
            <ReportCard icon={<ReceiptText className="w-5 h-5" />} iconClass="bg-violet-500/10 text-violet-400" label="Hóa đơn gói dịch vụ" value={filteredInvoices.length.toLocaleString('vi-VN')} note={`${filteredInvoices.filter((invoice) => invoice.status === 'PAID').length} hóa đơn đã thanh toán`} />
            <ReportCard icon={<Building2 className="w-5 h-5" />} iconClass="bg-sky-500/10 text-sky-400" label="Tenant nền tảng" value={filteredTenants.length.toLocaleString('vi-VN')} note={`${activeTenants} tenant đang hoạt động`} />
          </>
        ) : (
          <>
            <ReportCard icon={<CircleDollarSign className="w-5 h-5" />} iconClass="bg-emerald-500/10 text-emerald-400" label="Doanh thu tenant/tháng" value={formatMoney(totalTenantRevenueVnd, 'VND')} note="Tổng doanh thu vận hành, không phải phí gói dịch vụ" />
            <ReportCard icon={<Users className="w-5 h-5" />} iconClass="bg-sky-500/10 text-sky-400" label="Tổng nhân sự" value={totalStaff.toLocaleString('vi-VN')} note={`Trên ${filteredTenants.length} tenant theo bộ lọc`} />
            <ReportCard icon={<Building2 className="w-5 h-5" />} iconClass="bg-violet-500/10 text-violet-400" label="Tổng chi nhánh" value={totalBranches.toLocaleString('vi-VN')} note="Tính theo quy mô hiện tại của tenant" />
            <ReportCard icon={<Building2 className="w-5 h-5" />} iconClass="bg-amber-500/10 text-amber-400" label="Tenant hoạt động" value={activeTenants.toLocaleString('vi-VN')} note={`${filteredTenants.length - activeTenants} tenant ở trạng thái khác`} />
          </>
        )}
      </div>

      {reportScope === 'ADMIN' && (
        <section className="bg-brand-surface border border-brand-outline/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-sm text-brand-text">Chi tiết vận hành Superadmin</h2>
              <p className="text-[10px] text-brand-text-muted mt-1">Toàn bộ số liệu dưới đây thuộc nền tảng SalonSys và phí gói dịch vụ trong năm {selectedYear}.</p>
            </div>
            <span className="inline-flex self-start rounded-full border border-brand-primary/25 bg-brand-primary/10 px-2.5 py-1 text-[10px] font-bold text-brand-primary">Phạm vi toàn hệ thống</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            <ReportDetailPanel title="Phạm vi quản trị" icon={<Building2 className="w-4 h-4" />}>
              <ReportDetailRow label="Tenant đang quản lý" value={filteredTenants.length.toLocaleString('vi-VN')} />
              <ReportDetailRow label={`Tenant tạo mới năm ${selectedYear}`} value={newTenantsInYear.toLocaleString('vi-VN')} />
              <ReportDetailRow label="Gói đang kinh doanh" value={`${activePackageCount}/${packages.length}`} />
              <ReportDetailRow label="Tổng hóa đơn trong kỳ" value={filteredInvoices.length.toLocaleString('vi-VN')} />
            </ReportDetailPanel>

            <ReportDetailPanel title="Hiệu suất thu phí" icon={<CircleDollarSign className="w-4 h-4" />}>
              <ReportDetailRow label="Tổng giá trị đã lập" value={formatMoney(billedRevenueVnd, 'VND')} />
              <ReportDetailRow label="Số tiền đã thu" value={formatMoney(collectedRevenueVnd, 'VND')} tone="success" />
              <ReportDetailRow label="Giá trị hóa đơn trung bình" value={formatMoney(averageInvoiceVnd, 'VND')} />
              <ReportDetailRow label="Tỷ lệ thu tiền" value={`${collectionRate}%`} tone={collectionRate >= 80 ? 'success' : collectionRate >= 50 ? 'warning' : 'danger'} />
            </ReportDetailPanel>

            <ReportDetailPanel title="Cần Superadmin xử lý" icon={<AlertTriangle className="w-4 h-4" />}>
              <ReportDetailRow label="Hóa đơn quá hạn" value={overdueInvoices.length.toLocaleString('vi-VN')} tone={overdueInvoices.length > 0 ? 'danger' : 'success'} />
              <ReportDetailRow label="Công nợ chưa thu" value={formatMoney(receivableVnd, 'VND')} tone={receivableVnd > 0 ? 'warning' : 'success'} />
              <ReportDetailRow label="Tenant cần chú ý" value={tenantsNeedingAttention.length.toLocaleString('vi-VN')} tone={tenantsNeedingAttention.length > 0 ? 'warning' : 'success'} />
              <ReportDetailRow label="Tenant đang hoạt động" value={activeTenants.toLocaleString('vi-VN')} tone="success" />
            </ReportDetailPanel>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-outline/25">
            <p className="text-[10px] uppercase tracking-wide font-bold text-brand-text-muted mb-3">Trạng thái hóa đơn nền tảng</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {invoiceStatusSummary.map((item) => (
                <div key={item.status} className="rounded-lg border border-brand-outline/25 bg-brand-surface-high/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${invoiceStatusMeta[item.status].badge}`}>{invoiceStatusMeta[item.status].label}</span>
                    <span className="text-lg font-black text-brand-text">{item.count}</span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-2">Tổng giá trị</p>
                  <p className="text-[11px] font-bold font-mono text-brand-text mt-0.5">{formatMoney(item.amountVnd, 'VND')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {reportScope === 'TENANT' && (
        <section className="bg-brand-surface border border-brand-outline/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-sm text-brand-text">Chi tiết quản lý Tenant</h2>
              <p className="text-[10px] text-brand-text-muted mt-1">Thông tin quy mô, hiệu suất vận hành và các vấn đề cần quản trị theo bộ lọc hiện tại.</p>
            </div>
            <span className="inline-flex self-start rounded-full border border-brand-secondary/25 bg-brand-secondary/10 px-2.5 py-1 text-[10px] font-bold text-brand-secondary">
              {filteredTenants.length.toLocaleString('vi-VN')} tenant trong phạm vi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <ReportDetailPanel title="Quy mô đang quản lý" icon={<Building2 className="w-4 h-4" />}>
              <ReportDetailRow label="Tổng tenant" value={filteredTenants.length.toLocaleString('vi-VN')} />
              <ReportDetailRow label="Tenant đang hoạt động" value={activeTenants.toLocaleString('vi-VN')} tone="success" />
              <ReportDetailRow label="Chi nhánh hoạt động" value={`${tenantBranchStats.active.toLocaleString('vi-VN')}/${tenantBranchStats.total.toLocaleString('vi-VN')}`} />
              <ReportDetailRow label="Tổng nhân sự" value={totalStaff.toLocaleString('vi-VN')} />
            </ReportDetailPanel>

            <ReportDetailPanel title="Hiệu suất vận hành" icon={<CircleDollarSign className="w-4 h-4" />}>
              <ReportDetailRow label="Doanh thu tháng" value={formatMoney(totalTenantRevenueVnd, 'VND')} tone="success" />
              <ReportDetailRow label="Trung bình / tenant" value={formatMoney(averageTenantRevenueVnd, 'VND')} />
              <ReportDetailRow label="Trung bình / chi nhánh" value={formatMoney(revenuePerBranchVnd, 'VND')} />
              <ReportDetailRow label="Nhân sự trung bình" value={`${averageStaffPerTenant.toLocaleString('vi-VN')} / tenant`} />
            </ReportDetailPanel>

            <ReportDetailPanel title="Cấu hình vận hành" icon={<BarChart3 className="w-4 h-4" />}>
              <ReportDetailRow label="Gói đang được sử dụng" value={usedPackageCount.toLocaleString('vi-VN')} />
              <ReportDetailRow label="Đã bật đặt lịch online" value={`${tenantsWithOnlineBooking.toLocaleString('vi-VN')}/${filteredTenants.length.toLocaleString('vi-VN')}`} />
              <ReportDetailRow label="Đã cấu hình thanh toán" value={`${tenantsWithPaymentGateway.toLocaleString('vi-VN')}/${filteredTenants.length.toLocaleString('vi-VN')}`} />
              <ReportDetailRow label="Email admin đã xác thực" value={`${verifiedAdminEmailTenants.toLocaleString('vi-VN')}/${filteredTenants.length.toLocaleString('vi-VN')}`} />
            </ReportDetailPanel>

            <ReportDetailPanel title="Cần quản trị xử lý" icon={<AlertTriangle className="w-4 h-4" />}>
              <ReportDetailRow label="Tenant cần chú ý" value={tenantsNeedingAttention.length.toLocaleString('vi-VN')} tone={tenantsNeedingAttention.length ? 'warning' : 'success'} />
              <ReportDetailRow label="Sắp hết hạn trong 30 ngày" value={tenantsExpiringSoon.length.toLocaleString('vi-VN')} tone={tenantsExpiringSoon.length ? 'warning' : 'success'} />
              <ReportDetailRow label="Có vấn đề thanh toán" value={tenantsWithPaymentIssues.length.toLocaleString('vi-VN')} tone={tenantsWithPaymentIssues.length ? 'danger' : 'success'} />
              <ReportDetailRow label="Chi nhánh ngừng hoạt động" value={tenantBranchStats.inactive.toLocaleString('vi-VN')} tone={tenantBranchStats.inactive ? 'warning' : 'success'} />
            </ReportDetailPanel>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-outline/25">
            <p className="text-[10px] uppercase tracking-wide font-bold text-brand-text-muted mb-3">Tình trạng tenant trong phạm vi quản lý</p>
            {statusBreakdown.length === 0 ? <EmptyInline text="Chưa có tenant phù hợp với bộ lọc." /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {statusBreakdown.map(({ status, count, percent }) => (
                  <div key={status} className="rounded-lg border border-brand-outline/25 bg-brand-surface-high/25 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${tenantStatusMeta[status].badge}`}>{tenantStatusMeta[status].label}</span>
                      <span className="text-lg font-black text-brand-text">{count.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-brand-surface-highest overflow-hidden mt-3">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tenantStatusMeta[status].color }} />
                    </div>
                    <p className="text-[9px] text-brand-text-muted mt-1.5">Chiếm {percent}% tenant theo bộ lọc</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {reportScope === 'ADMIN' ? (
        <section className="xl:col-span-2 bg-brand-surface border border-brand-outline/40 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-5">
            <div>
              <h2 className="font-bold text-sm text-brand-text">Doanh thu hóa đơn theo tháng</h2>
              <p className="text-[10px] text-brand-text-muted mt-1">So sánh giá trị đã lập và số tiền đã thu, quy đổi về VND.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-brand-text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-outline/50" />Đã lập</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-primary" />Đã thu</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px] h-[270px] flex items-end gap-2 border-b border-brand-outline/30 px-1 pt-10">
              {monthlyReport.map((month, index) => {
                const billedHeight = (month.billedVnd / chartMaximum) * 100;
                const collectedHeight = (month.collectedVnd / chartMaximum) * 100;
                return (
                  <div
                    key={month.label}
                    className="relative flex-1 h-full flex flex-col justify-end group"
                    onMouseEnter={() => setHoveredMonth(index)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {hoveredMonth === index && (
                      <div className="absolute z-20 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-44 rounded-lg border border-brand-outline bg-brand-surface-high p-2.5 shadow-xl text-[10px] space-y-1">
                        <p className="font-bold text-brand-text">Tháng {index + 1}/{selectedYear}</p>
                        <p className="flex justify-between gap-2"><span className="text-brand-text-muted">Đã lập</span><span className="font-mono">{formatMoney(month.billedVnd, 'VND')}</span></p>
                        <p className="flex justify-between gap-2"><span className="text-brand-text-muted">Đã thu</span><span className="font-mono text-brand-primary">{formatMoney(month.collectedVnd, 'VND')}</span></p>
                        <p className="flex justify-between gap-2"><span className="text-brand-text-muted">Hóa đơn</span><span>{month.invoiceCount}</span></p>
                        <p className="flex justify-between gap-2"><span className="text-brand-text-muted">Tenant mới</span><span>{month.newTenants}</span></p>
                      </div>
                    )}
                    <div className="flex-1 flex items-end justify-center gap-1 px-1 min-h-0">
                      <div title={`Đã lập: ${formatMoney(month.billedVnd, 'VND')}`} className="w-[38%] max-w-5 rounded-t bg-brand-outline/40 group-hover:bg-brand-outline/60 transition-all" style={{ height: month.billedVnd > 0 ? `${Math.max(3, billedHeight)}%` : '2px' }} />
                      <div title={`Đã thu: ${formatMoney(month.collectedVnd, 'VND')}`} className="w-[38%] max-w-5 rounded-t bg-brand-primary group-hover:bg-brand-primary/80 transition-all" style={{ height: month.collectedVnd > 0 ? `${Math.max(3, collectedHeight)}%` : '2px' }} />
                    </div>
                    <div className="h-7 flex items-end justify-center text-[10px] font-bold text-brand-text-muted">{month.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {filteredInvoices.length === 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-brand-outline/40 bg-brand-surface-high/25 p-3 text-center text-[11px] text-brand-text-muted">
              Chưa có hóa đơn phù hợp với bộ lọc trong năm {selectedYear}.
            </div>
          )}
        </section>
        ) : (
          <section className="xl:col-span-2 bg-brand-surface border border-brand-outline/40 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
            <div className="mb-5">
              <h2 className="font-bold text-sm text-brand-text">Doanh thu vận hành theo tenant</h2>
              <p className="text-[10px] text-brand-text-muted mt-1">Ảnh chụp doanh thu tháng hiện tại; không sử dụng dữ liệu hóa đơn gói dịch vụ.</p>
            </div>
            {tenantRevenueRanking.length === 0 ? <EmptyInline text="Chưa có dữ liệu doanh thu tenant phù hợp." /> : (
              <div className="space-y-3.5">
                {tenantRevenueRanking.map((tenant, index) => {
                  const revenueVnd = toVnd(tenant.monthlyRevenue, tenant.currency);
                  const percent = Math.max(revenueVnd > 0 ? 2 : 0, (revenueVnd / maximumTenantRevenue) * 100);
                  return (
                    <div key={tenant.id} className="grid grid-cols-[minmax(120px,180px)_1fr_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-brand-text truncate" title={tenant.name}>{index + 1}. {tenant.name}</p>
                        <p className="text-[9px] text-brand-text-muted mt-0.5">{tenant.packageName}</p>
                      </div>
                      <div className="h-2 rounded-full bg-brand-surface-highest overflow-hidden">
                        <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-brand-secondary whitespace-nowrap">{formatMoney(tenant.monthlyRevenue, tenant.currency)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="bg-brand-surface border border-brand-outline/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <h2 className="font-bold text-sm text-brand-text">Phân bổ tenant</h2>
          <p className="text-[10px] text-brand-text-muted mt-1">Theo gói dịch vụ và trạng thái hiện tại.</p>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-brand-text-muted mb-3">Theo gói dịch vụ</p>
            {packageBreakdown.length === 0 ? (
              <EmptyInline text="Chưa có tenant phù hợp." />
            ) : (
              <div className="space-y-3">
                {packageBreakdown.map((item) => {
                  const percent = filteredTenants.length ? Math.round((item.count / filteredTenants.length) * 100) : 0;
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-brand-text inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                        <span className="text-brand-text-muted">{item.count} · {percent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-brand-surface-highest overflow-hidden"><div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-brand-outline/25">
            <p className="text-[10px] uppercase tracking-wide font-bold text-brand-text-muted mb-3">Theo trạng thái</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              {statusBreakdown.length === 0 ? <EmptyInline text="Chưa có trạng thái để tổng hợp." /> : statusBreakdown.map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between rounded-lg bg-brand-surface-high/35 px-3 py-2">
                  <span className="text-[11px] text-brand-text inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: tenantStatusMeta[status].color }} />{tenantStatusMeta[status].label}</span>
                  <span className="text-xs font-bold text-brand-text">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="bg-brand-surface border border-brand-outline/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            {reportScope === 'ADMIN' ? <ReceiptText className="w-4 h-4 text-brand-primary" /> : <Award className="w-4 h-4 text-amber-400" />}
            <div>
              <h2 className="font-bold text-sm text-brand-text">{reportScope === 'ADMIN' ? 'Doanh thu đã thu theo gói' : 'Top tenant theo doanh thu'}</h2>
              <p className="text-[10px] text-brand-text-muted mt-0.5">{reportScope === 'ADMIN' ? `Phí gói dịch vụ đã thanh toán trong năm ${selectedYear}.` : 'Doanh thu vận hành tháng hiện tại.'}</p>
            </div>
          </div>
          {reportScope === 'ADMIN' ? (
            adminPackagePerformance.length === 0 ? <EmptyInline text="Chưa có dữ liệu hiệu suất gói dịch vụ." /> : (
              <div className="space-y-3">
                {adminPackagePerformance.map((item) => {
                  return (
                    <div key={item.name} className="rounded-lg border border-brand-outline/20 bg-brand-surface-high/25 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-brand-text inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                        <span className="text-[9px] text-brand-text-muted">{item.tenantCount} tenant · {item.invoiceCount} HĐ</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2.5 text-[9px]">
                        <div><p className="text-brand-text-muted">Đã thu</p><p className="font-bold font-mono text-emerald-400 mt-0.5">{formatMoney(item.collectedVnd, 'VND')}</p></div>
                        <div className="text-right"><p className="text-brand-text-muted">Công nợ</p><p className="font-bold font-mono text-amber-400 mt-0.5">{formatMoney(item.debtVnd, 'VND')}</p></div>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="h-1.5 flex-1 rounded-full bg-brand-surface-highest overflow-hidden"><div className="h-full rounded-full" style={{ width: `${item.collectionRate}%`, backgroundColor: item.color }} /></div>
                        <span className="text-[9px] font-bold text-brand-text-muted">{item.collectionRate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : topTenants.length === 0 ? <EmptyInline text="Chưa có dữ liệu tenant." /> : (
            <div className="space-y-2.5">
              {topTenants.map((tenant, index) => (
                <div key={tenant.id} className="flex items-center gap-3 rounded-lg border border-brand-outline/20 bg-brand-surface-high/25 p-3">
                  <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-brand-surface-high text-brand-text-muted'}`}>{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-brand-text truncate" title={tenant.name}>{tenant.name}</p>
                    <p className="text-[9px] text-brand-text-muted mt-0.5">{tenant.packageName} · {tenant.staffCount} nhân sự</p>
                  </div>
                  <p className="text-[11px] font-bold font-mono text-brand-secondary whitespace-nowrap">{formatMoney(tenant.monthlyRevenue, tenant.currency)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="xl:col-span-2 bg-brand-surface border border-brand-outline/40 rounded-xl shadow-sm overflow-hidden min-w-0">
          <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-brand-outline/25">
            <div>
              <h2 className="font-bold text-sm text-brand-text flex items-center gap-2">
                {reportScope === 'ADMIN' ? <ReceiptText className="w-4 h-4 text-brand-primary" /> : <Building2 className="w-4 h-4 text-brand-secondary" />}
                {reportScope === 'ADMIN' ? 'Danh sách hóa đơn gói dịch vụ' : 'Chi tiết vận hành tenant'}
              </h2>
              <p className="text-[10px] text-brand-text-muted mt-1">{reportScope === 'ADMIN' ? `Tra cứu và phân trang toàn bộ hóa đơn nền tảng trong năm ${selectedYear}.` : 'Tra cứu, sắp xếp và phân trang toàn bộ tenant đang quản lý.'}</p>
            </div>
            <span className="text-[10px] font-bold text-brand-text-muted bg-brand-surface-high rounded-full px-2.5 py-1 whitespace-nowrap">
              {reportScope === 'ADMIN'
                ? `${invoiceTableRows.length.toLocaleString('vi-VN')} / ${filteredInvoices.length.toLocaleString('vi-VN')} hóa đơn`
                : `${tenantTableRows.length.toLocaleString('vi-VN')} / ${filteredTenants.length.toLocaleString('vi-VN')} tenant`}
            </span>
          </div>
          {reportScope === 'ADMIN' ? (
            <div className="p-3 sm:p-4 border-b border-brand-outline/25 bg-brand-surface-high/10 flex flex-col sm:flex-row gap-2.5">
              <label className="relative flex-1 min-w-0">
                <span className="sr-only">Tìm kiếm hóa đơn</span>
                <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={invoiceSearch}
                  onChange={(event) => { setInvoiceSearch(event.target.value); setInvoicePage(1); }}
                  placeholder="Tìm mã hóa đơn, tenant hoặc gói..."
                  className="form-control pl-9"
                />
              </label>
              <label className="sm:w-44 shrink-0">
                <span className="sr-only">Lọc trạng thái hóa đơn</span>
                <select
                  value={invoiceStatusFilter}
                  onChange={(event) => { setInvoiceStatusFilter(event.target.value as InvoiceStatusFilter); setInvoicePage(1); }}
                  className="form-control"
                >
                  <option value={ALL}>Tất cả trạng thái</option>
                  {(Object.keys(invoiceStatusMeta) as Invoice['status'][]).map((status) => (
                    <option key={status} value={status}>{invoiceStatusMeta[status].label}</option>
                  ))}
                </select>
              </label>
              <label className="sm:w-32 shrink-0">
                <span className="sr-only">Số hóa đơn mỗi trang</span>
                <select
                  value={invoicePageSize}
                  onChange={(event) => { setInvoicePageSize(Number(event.target.value)); setInvoicePage(1); }}
                  className="form-control"
                >
                  {[10, 25, 50].map((size) => <option key={size} value={size}>{size} / trang</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="p-3 sm:p-4 border-b border-brand-outline/25 bg-brand-surface-high/10 flex flex-col sm:flex-row gap-2.5 print:hidden">
              <label className="relative flex-1 min-w-0">
                <span className="sr-only">Tìm kiếm tenant</span>
                <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={tenantSearch}
                  onChange={(event) => { setTenantSearch(event.target.value); setTenantPage(1); }}
                  placeholder="Tìm tên, mã tenant hoặc gói dịch vụ..."
                  className="form-control pl-9"
                />
              </label>
              <label className="sm:w-48 shrink-0">
                <span className="sr-only">Sắp xếp tenant</span>
                <select
                  value={tenantSort}
                  onChange={(event) => { setTenantSort(event.target.value as TenantSort); setTenantPage(1); }}
                  className="form-control"
                >
                  <option value="REVENUE_DESC">Doanh thu: Cao đến thấp</option>
                  <option value="REVENUE_ASC">Doanh thu: Thấp đến cao</option>
                  <option value="NAME_ASC">Tên tenant: A–Z</option>
                  <option value="STAFF_DESC">Nhân sự: Nhiều nhất</option>
                </select>
              </label>
              <label className="sm:w-32 shrink-0">
                <span className="sr-only">Số tenant mỗi trang</span>
                <select
                  value={tenantPageSize}
                  onChange={(event) => { setTenantPageSize(Number(event.target.value)); setTenantPage(1); }}
                  className="form-control"
                >
                  {[10, 25, 50].map((size) => <option key={size} value={size}>{size} / trang</option>)}
                </select>
              </label>
            </div>
          )}
          <div className={reportScope === 'TENANT' ? 'max-h-[520px] overflow-auto overscroll-contain' : 'overflow-x-auto'}>
            {reportScope === 'ADMIN' ? (
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-brand-surface-high/35 text-[9px] uppercase tracking-wide text-brand-text-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">Hóa đơn</th>
                  <th className="px-4 py-3 font-bold">Tenant</th>
                  <th className="px-4 py-3 font-bold">Ngày tạo</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-4 py-3 font-bold text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-outline/20">
                {paginatedInvoices.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-brand-text-muted">Chưa có dữ liệu hóa đơn phù hợp.</td></tr>
                ) : paginatedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-brand-surface-high/20 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-bold font-mono text-brand-text">{invoice.invoiceCode || invoice.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-semibold text-brand-text max-w-[180px] truncate" title={invoice.tenantName}>{invoice.tenantName}</p>
                      <p className="text-[9px] text-brand-text-muted mt-0.5">{invoice.planName || tenantById.get(invoice.tenantId)?.packageName || 'Chưa gắn gói'}</p>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-brand-text-muted"><span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(invoice.createdAt)}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${invoiceStatusMeta[invoice.status].badge}`}>{invoiceStatusMeta[invoice.status].label}</span></td>
                    <td className="px-4 py-3 text-right text-[11px] font-bold font-mono text-brand-text whitespace-nowrap">{formatMoney(invoice.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            ) : (
              <table className="w-full min-w-[760px] text-left">
                <thead className="sticky top-0 z-10 bg-brand-surface-high text-[9px] uppercase tracking-wide text-brand-text-muted shadow-[0_1px_0_rgba(148,163,184,0.12)]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Tenant</th>
                    <th className="px-4 py-3 font-bold">Gói</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold text-center">Chi nhánh</th>
                    <th className="px-4 py-3 font-bold text-center">Nhân sự</th>
                    <th className="px-4 py-3 font-bold text-right">Doanh thu tháng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline/20">
                  {paginatedTenants.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-brand-text-muted">Chưa có dữ liệu tenant phù hợp.</td></tr>
                  ) : paginatedTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-brand-surface-high/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-bold text-brand-text max-w-[190px] truncate" title={tenant.name}>{tenant.name}</p>
                        <p className="text-[9px] text-brand-text-muted font-mono mt-0.5">{tenant.id}</p>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-semibold text-brand-text">{tenant.packageName}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${tenantStatusMeta[tenant.status].badge}`}>{tenantStatusMeta[tenant.status].label}</span></td>
                      <td className="px-4 py-3 text-center text-[11px] text-brand-text">{Math.max(tenant.branches?.length || 0, 1)}</td>
                      <td className="px-4 py-3 text-center text-[11px] text-brand-text">{tenant.staffCount}</td>
                      <td className="px-4 py-3 text-right text-[11px] font-bold font-mono text-brand-secondary whitespace-nowrap">{formatMoney(tenant.monthlyRevenue, tenant.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {reportScope === 'ADMIN' && invoiceTableRows.length > 0 && (
            <div className="p-3 sm:px-4 border-t border-brand-outline/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <p className="text-[10px] text-brand-text-muted">
                Hiển thị <span className="font-bold text-brand-text">{(invoicePageStart + 1).toLocaleString('vi-VN')}–{Math.min(invoicePageStart + invoicePageSize, invoiceTableRows.length).toLocaleString('vi-VN')}</span>
                {' '}trên <span className="font-bold text-brand-text">{invoiceTableRows.length.toLocaleString('vi-VN')}</span> hóa đơn
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInvoicePage(Math.max(1, currentInvoicePage - 1))}
                  disabled={currentInvoicePage === 1}
                  className="w-8 h-8 rounded-lg border border-brand-outline/40 text-brand-text inline-flex items-center justify-center hover:bg-brand-surface-high disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Trang hóa đơn trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="min-w-20 text-center text-[10px] font-bold text-brand-text">
                  Trang {currentInvoicePage.toLocaleString('vi-VN')} / {invoicePageCount.toLocaleString('vi-VN')}
                </span>
                <button
                  type="button"
                  onClick={() => setInvoicePage(Math.min(invoicePageCount, currentInvoicePage + 1))}
                  disabled={currentInvoicePage === invoicePageCount}
                  className="w-8 h-8 rounded-lg border border-brand-outline/40 text-brand-text inline-flex items-center justify-center hover:bg-brand-surface-high disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Trang hóa đơn tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {reportScope === 'TENANT' && tenantTableRows.length > 0 && (
            <div className="p-3 sm:px-4 border-t border-brand-outline/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <p className="text-[10px] text-brand-text-muted">
                Hiển thị <span className="font-bold text-brand-text">{(tenantPageStart + 1).toLocaleString('vi-VN')}–{Math.min(tenantPageStart + tenantPageSize, tenantTableRows.length).toLocaleString('vi-VN')}</span>
                {' '}trên <span className="font-bold text-brand-text">{tenantTableRows.length.toLocaleString('vi-VN')}</span> tenant
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTenantPage(Math.max(1, currentTenantPage - 1))}
                  disabled={currentTenantPage === 1}
                  className="w-8 h-8 rounded-lg border border-brand-outline/40 text-brand-text inline-flex items-center justify-center hover:bg-brand-surface-high disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Trang tenant trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="min-w-20 text-center text-[10px] font-bold text-brand-text">
                  Trang {currentTenantPage.toLocaleString('vi-VN')} / {tenantPageCount.toLocaleString('vi-VN')}
                </span>
                <button
                  type="button"
                  onClick={() => setTenantPage(Math.min(tenantPageCount, currentTenantPage + 1))}
                  disabled={currentTenantPage === tenantPageCount}
                  className="w-8 h-8 rounded-lg border border-brand-outline/40 text-brand-text inline-flex items-center justify-center hover:bg-brand-surface-high disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Trang tenant tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReportDetailPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-outline/30 bg-brand-surface-high/20 p-4 min-w-0">
      <div className="flex items-center gap-2 pb-3 mb-1 border-b border-brand-outline/20 text-brand-primary">
        {icon}
        <h3 className="text-xs font-bold text-brand-text">{title}</h3>
      </div>
      <div className="divide-y divide-brand-outline/15">{children}</div>
    </div>
  );
}

function ReportDetailRow({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const valueClass = tone === 'success' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-400' : tone === 'danger' ? 'text-rose-400' : 'text-brand-text';
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[11px]">
      <span className="text-brand-text-muted">{label}</span>
      <span className={`font-bold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function ReportCard({ icon, iconClass, label, value, note }: { icon: React.ReactNode; iconClass: string; label: string; value: string; note: string }) {
  return (
    <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4 shadow-sm min-w-0">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${iconClass}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-wide font-bold text-brand-text-muted">{label}</p>
          <p className="text-lg sm:text-xl font-black text-brand-text mt-1 truncate" title={value}>{value}</p>
        </div>
      </div>
      <p className="text-[10px] text-brand-text-muted mt-3 pt-2.5 border-t border-brand-outline/20 truncate" title={note}>{note}</p>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-brand-outline/35 p-5 text-center text-[11px] text-brand-text-muted">{text}</div>;
}
