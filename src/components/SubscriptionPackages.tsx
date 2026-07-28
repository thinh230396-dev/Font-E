import BeautifulSelect from './BeautifulSelect';
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Copy,
  Edit3,
  History,
  Info,
  Layers,
  MoreVertical,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X
} from 'lucide-react';
import type {
  CurrencyCode,
  Invoice,
  SubscriptionLimits,
  SubscriptionPackage,
  SubscriptionPackageStatus,
  Tenant
} from '../types';
import { convertMoney, formatMoney } from '../utils/money';
import {
  DEFAULT_SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_CAPABILITY_CATALOG,
  formatSubscriptionLimit,
  getSubscriptionPrice,
  getYearlyPackagePrice,
  normalizeSubscriptionPackage
} from '../utils/subscriptions';

interface SubscriptionPackagesProps {
  packages: SubscriptionPackage[];
  tenants: Tenant[];
  invoices: Invoice[];
  reportCurrency: CurrencyCode;
  onAddPackage: (pkg: Omit<SubscriptionPackage, 'id' | 'activeTenants'>) => void;
  onUpdatePackage: (id: string, updated: Partial<SubscriptionPackage>) => void;
  onDeprecatePackage: (id: string) => void;
  onSchedulePackageRetirement: (id: string, replacementPackageName: string) => void;
  onCancelPackageRetirement: (id: string) => void;
  onReactivatePackage: (id: string) => void;
  onDeletePackage: (id: string) => void;
}

type StatusFilter = 'ALL' | SubscriptionPackageStatus;
type BillingView = 'monthly' | 'yearly';
type EditorState = { mode: 'add' | 'edit'; pkg: SubscriptionPackage };

const STATUS_META: Record<SubscriptionPackageStatus, { label: string; classes: string }> = {
  DRAFT: { label: 'Bản nháp', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/25' },
  ACTIVE: { label: 'Đang hoạt động', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  DEPRECATED: { label: 'Ngừng đăng ký mới', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  ARCHIVED: { label: 'Đã lưu trữ', classes: 'bg-brand-outline/20 text-brand-text-muted border-brand-outline/30' }
};

const LIMIT_FIELDS: Array<{ key: keyof SubscriptionLimits; label: string; suffix: string }> = [
  { key: 'appointmentsPerMonth', label: 'Lịch hẹn/tháng', suffix: 'lượt' },
  { key: 'storageGb', label: 'Dung lượng', suffix: 'GB' },
  { key: 'messagesPerMonth', label: 'SMS & Email/tháng', suffix: 'tin' },
  { key: 'adminUsers', label: 'Tài khoản quản trị', suffix: 'tài khoản' },
  { key: 'apiCallsPerMonth', label: 'API calls/tháng', suffix: 'lượt' },
  { key: 'customDomains', label: 'Custom domain', suffix: 'domain' },
  { key: 'dataRetentionDays', label: 'Lưu dữ liệu', suffix: 'ngày' }
];

const createCapabilityKey = (label: string) => label
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const createPackageDraft = (reportCurrency: CurrencyCode): SubscriptionPackage => normalizeSubscriptionPackage({
  id: 'NEW-PACKAGE',
  name: '',
  description: '',
  price: 0,
  yearlyPrice: 0,
  yearlyDiscountPercent: 20,
  setupFee: 0,
  trialDays: 14,
  currency: reportCurrency,
  billingCycle: 'monthly',
  activeTenants: 0,
  status: 'DRAFT',
  isPopular: false,
  features: [],
  capabilities: SUBSCRIPTION_CAPABILITY_CATALOG.map((item) => ({ ...item, enabled: false })),
  limits: { ...DEFAULT_SUBSCRIPTION_LIMITS },
  maxStaff: 5,
  maxSalons: 1,
  color: '#7c3aed',
  version: 1,
  priceHistory: []
});

const tenantUsesPackage = (tenant: Tenant, pkg: SubscriptionPackage) => (
  tenant.subscriptionPackageId === pkg.id || tenant.packageName === pkg.name
);

const getPackageStatus = (pkg: SubscriptionPackage): SubscriptionPackageStatus => pkg.status || 'ACTIVE';

const getMonthlyRecurringValue = (tenant: Tenant, pkg: SubscriptionPackage, reportCurrency: CurrencyCode) => {
  const currency = tenant.subscriptionCurrency || pkg.currency || 'USD';
  const lockedPrice = tenant.subscriptionPrice;
  const price = lockedPrice ?? getSubscriptionPrice([pkg], pkg.name, tenant.billingCycle || 'monthly').price;
  const monthlyPrice = tenant.billingCycle === 'yearly' ? price / 12 : price;
  return convertMoney(monthlyPrice, currency, reportCurrency);
};

export default function SubscriptionPackages({
  packages,
  tenants,
  invoices,
  reportCurrency,
  onAddPackage,
  onUpdatePackage,
  onDeprecatePackage,
  onSchedulePackageRetirement,
  onCancelPackageRetirement,
  onReactivatePackage,
  onDeletePackage
}: SubscriptionPackagesProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [billingView, setBillingView] = useState<BillingView>('monthly');
  const [showArchived, setShowArchived] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [expandedFeaturePackageIds, setExpandedFeaturePackageIds] = useState<Set<string>>(() => new Set());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [menuPackageId, setMenuPackageId] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<SubscriptionPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPackage | null>(null);
  const [retirementTarget, setRetirementTarget] = useState<SubscriptionPackage | null>(null);
  const [replacementPackageName, setReplacementPackageName] = useState('');

  const togglePackageFeatures = (packageId: string) => {
    setExpandedFeaturePackageIds((current) => {
      const next = new Set(current);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };

  const tenantsByPackage = useMemo(() => new Map(packages.map((pkg) => [
    pkg.id,
    tenants.filter((tenant) => tenantUsesPackage(tenant, pkg))
  ])), [packages, tenants]);

  const visiblePackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return packages.filter((pkg) => {
      const status = getPackageStatus(pkg);
      if (!showArchived && status === 'ARCHIVED') return false;
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return pkg.name.toLowerCase().includes(normalizedQuery)
        || (pkg.description || '').toLowerCase().includes(normalizedQuery)
        || pkg.features.some((feature) => feature.toLowerCase().includes(normalizedQuery));
    });
  }, [packages, query, showArchived, statusFilter]);

  const totalActiveTenants = tenants.filter((tenant) => tenant.status !== 'SUSPENDED').length;
  const totalMrr = packages.reduce((sum, pkg) => sum + (tenantsByPackage.get(pkg.id) || [])
    .filter((tenant) => tenant.status !== 'SUSPENDED' && tenant.status !== 'TRIAL')
    .reduce((packageSum, tenant) => packageSum + getMonthlyRecurringValue(tenant, pkg, reportCurrency), 0), 0);
  const collectedRevenue = invoices
    .filter((invoice) => invoice.status === 'PAID')
    .reduce((sum, invoice) => sum + convertMoney(invoice.amount, invoice.currency, reportCurrency), 0);

  const getCompatibleReplacementPackages = (sourcePackage: SubscriptionPackage) => {
    const sourceTenants = tenantsByPackage.get(sourcePackage.id) || [];
    return packages.filter((candidate) => (
      candidate.id !== sourcePackage.id
      && getPackageStatus(candidate) === 'ACTIVE'
      && sourceTenants.every((tenant) => (
        (tenant.branches?.length || 1) <= candidate.maxSalons
        && Number(tenant.staffCount || 0) <= candidate.maxStaff
      ))
    ));
  };

  const openRetirementRequest = (pkg: SubscriptionPackage) => {
    const packageTenants = tenantsByPackage.get(pkg.id) || [];
    if (packageTenants.length === 0) {
      onDeprecatePackage(pkg.id);
      setMenuPackageId(null);
      return;
    }

    const replacement = getCompatibleReplacementPackages(pkg)[0];
    setRetirementTarget(pkg);
    setReplacementPackageName(replacement?.name || '');
    setMenuPackageId(null);
  };

  const duplicatePackage = (pkg: SubscriptionPackage) => {
    setEditor({
      mode: 'add',
      pkg: normalizeSubscriptionPackage({
        ...pkg,
        id: 'NEW-PACKAGE',
        name: `${pkg.name} - Bản sao`,
        status: 'DRAFT',
        isPopular: false,
        activeTenants: 0,
        version: 1,
        priceHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
    setMenuPackageId(null);
  };

  const confirmRetirementRequest = () => {
    if (!retirementTarget || !replacementPackageName) return;
    onSchedulePackageRetirement(retirementTarget.id, replacementPackageName);
    setRetirementTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-primary" />
            <span>Quản lý Gói dịch vụ</span>
          </h1>
          <p className="text-xs text-brand-text-muted mt-1">
            Giá, tính năng và hạn mức được liên kết trực tiếp tới tenant và hóa đơn bằng mã gói ổn định.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowComparison(true)} className="px-4 py-2.5 rounded-lg border border-brand-outline/45 bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-surface-high transition-colors flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
            <BarChart3 className="w-4 h-4 text-brand-secondary" /> <span>So sánh gói</span>
          </button>
          <button onClick={() => setEditor({ mode: 'add', pkg: createPackageDraft(reportCurrency) })} className="px-5 py-2.5 rounded-lg bg-brand-primary text-brand-on-primary text-sm font-bold hover:bg-brand-primary/90 transition-colors flex items-center gap-2 cursor-pointer shadow-md shrink-0 whitespace-nowrap">
            <Plus className="w-4 h-4 stroke-[3]" /> Thêm gói dịch vụ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard icon={<PackagePlus className="w-5 h-5" />} label="Gói đang bán" value={String(packages.filter((pkg) => getPackageStatus(pkg) === 'ACTIVE').length)} />
        <SummaryCard icon={<Users className="w-5 h-5" />} label="Tenant đang phục vụ" value={String(totalActiveTenants)} />
        <SummaryCard icon={<CircleDollarSign className="w-5 h-5" />} label={`MRR quy đổi · ${reportCurrency}`} value={formatMoney(totalMrr, reportCurrency)} />
        <SummaryCard icon={<BarChart3 className="w-5 h-5" />} label={`Đã thu · ${reportCurrency}`} value={formatMoney(collectedRevenue, reportCurrency)} />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-[11px] leading-relaxed text-brand-text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
        <p>
          Các chỉ số tổng hợp được quy đổi về <strong className="text-brand-text">{reportCurrency}</strong> theo cấu hình hệ thống.
          Giá hiển thị trên từng thẻ gói vẫn là giá niêm yết gốc và không bị thay đổi.
        </p>
      </div>

      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, mô tả hoặc tính năng..." className="form-control pl-9 py-2.5" />
          </div>
          <BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="form-control sm:w-auto py-2.5">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="DEPRECATED">Ngừng đăng ký mới</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </BeautifulSelect>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-outline/35 text-xs text-brand-text-muted cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Hiện gói lưu trữ
          </label>
        </div>
        <div className="grid grid-cols-2 bg-brand-surface-lowest border border-brand-outline/35 p-1 rounded-lg min-w-56">
          {(['monthly', 'yearly'] as BillingView[]).map((cycle) => (
            <button key={cycle} onClick={() => setBillingView(cycle)} className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${billingView === cycle ? 'bg-brand-primary text-brand-on-primary' : 'text-brand-text-muted hover:text-brand-text'}`}>
              {cycle === 'monthly' ? 'Theo tháng' : 'Theo năm'}
            </button>
          ))}
        </div>
      </div>

      {visiblePackages.length === 0 ? (
        <div className="bg-brand-surface border border-dashed border-brand-outline rounded-2xl p-12 text-center">
          <Archive className="w-9 h-9 text-brand-text-muted mx-auto mb-3" />
          <p className="text-sm font-bold text-brand-text">Không tìm thấy gói phù hợp</p>
          <p className="text-xs text-brand-text-muted mt-1">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 items-stretch">
          {visiblePackages.map((pkg) => {
            const status = getPackageStatus(pkg);
            const packageTenants = tenantsByPackage.get(pkg.id) || [];
            const activeCount = packageTenants.filter((tenant) => tenant.status !== 'SUSPENDED').length;
            const trialCount = packageTenants.filter((tenant) => tenant.status === 'TRIAL').length;
            const packageMrr = packageTenants.filter((tenant) => tenant.status !== 'SUSPENDED' && tenant.status !== 'TRIAL').reduce((sum, tenant) => sum + getMonthlyRecurringValue(tenant, pkg, reportCurrency), 0);
            const displayPrice = billingView === 'yearly' ? getYearlyPackagePrice(pkg) : pkg.price;
            const enabledCapabilities = pkg.capabilities?.filter((capability) => capability.enabled) || [];
            const featuresExpanded = expandedFeaturePackageIds.has(pkg.id);
            const displayedCapabilities = featuresExpanded ? enabledCapabilities : enabledCapabilities.slice(0, 5);
            const hasRetirementRequest = Boolean(pkg.retirementRequest);

            return (
              <article key={pkg.id} className={`bg-brand-surface border rounded-2xl overflow-visible shadow-lg relative h-full flex flex-col ${pkg.isPopular && status === 'ACTIVE' ? 'border-brand-secondary/50 ring-1 ring-brand-secondary/20' : 'border-brand-outline/35'} ${status === 'ARCHIVED' ? 'opacity-70' : ''}`}>
                <div className="p-5 border-b border-brand-outline/25 min-h-[238px] flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pkg.color }} />
                        <h2 className="text-lg font-black text-brand-text truncate">{pkg.name}</h2>
                        {pkg.isPopular && status === 'ACTIVE' && <span className="text-[8px] uppercase tracking-wider font-black px-2 py-1 rounded-full bg-brand-secondary text-brand-on-primary">Phổ biến</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex border rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_META[status].classes}`}>{STATUS_META[status].label}</span>
                        <span className="text-[9px] text-brand-text-muted font-mono">{pkg.id} · v{pkg.version || 1}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setMenuPackageId(menuPackageId === pkg.id ? null : pkg.id)} className="p-2 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high cursor-pointer" aria-label={`Mở thao tác cho gói ${pkg.name}`}><MoreVertical className="w-4 h-4" /></button>
                      {menuPackageId === pkg.id && (
                        <div className="absolute z-20 right-0 top-10 w-48 bg-brand-surface border border-brand-outline/50 rounded-lg shadow-xl p-1 text-[11px]">
                          <MenuButton icon={<Copy />} label="Sao chép gói" onClick={() => duplicatePackage(pkg)} />
                          <MenuButton icon={<History />} label="Xem lịch sử giá" onClick={() => { setHistoryTarget(pkg); setMenuPackageId(null); }} />
                          <div className="h-px bg-brand-outline/35 my-1" />
                          {status === 'ACTIVE' && !hasRetirementRequest && <MenuButton icon={<Clock3 />} label="Ngừng đăng ký" onClick={() => openRetirementRequest(pkg)} />}
                          {hasRetirementRequest && <MenuButton icon={<RotateCcw />} label="Mở lại đăng ký" onClick={() => { onCancelPackageRetirement(pkg.id); setMenuPackageId(null); }} />}
                          {!hasRetirementRequest && (status === 'DEPRECATED' || status === 'ARCHIVED' || status === 'DRAFT') && <MenuButton icon={<Sparkles />} label="Mở bán gói" onClick={() => { onReactivatePackage(pkg.id); setMenuPackageId(null); }} />}
                          <MenuButton
                            icon={<Archive />}
                            label="Lưu trữ"
                            disabled={hasRetirementRequest || status === 'ARCHIVED' || packageTenants.length > 0}
                            title={packageTenants.length > 0 ? 'Gói đang có tenant; hãy dùng Ngừng đăng ký.' : undefined}
                            onClick={() => { onUpdatePackage(pkg.id, { status: 'ARCHIVED' }); setMenuPackageId(null); }}
                          />
                          <MenuButton
                            icon={<Trash2 />}
                            label="Xóa gói"
                            disabled={packageTenants.length > 0}
                            title={packageTenants.length > 0 ? 'Không thể xóa gói đang có tenant sử dụng.' : undefined}
                            onClick={() => { setDeleteTarget(pkg); setMenuPackageId(null); }}
                            danger
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div><p className="text-3xl font-black text-brand-text">{formatMoney(displayPrice, pkg.currency)}</p><p className="text-[10px] text-brand-text-muted mt-1">/ {billingView === 'monthly' ? 'tháng' : `năm · tiết kiệm ${pkg.yearlyDiscountPercent || 0}%`}</p></div>
                    {Number(pkg.setupFee || 0) > 0 && <div className="text-right text-[9px] text-brand-text-muted">Phí khởi tạo<br /><strong className="text-brand-text">{formatMoney(pkg.setupFee || 0, pkg.currency)}</strong></div>}
                  </div>
                  <p className="text-xs text-brand-text-muted mt-3 min-h-10 leading-relaxed line-clamp-2">{pkg.description}</p>
                </div>

                <div className="p-5 flex flex-col flex-1 gap-5">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniMetric icon={<Users />} label="Nhân sự" value={pkg.maxStaff >= 999 ? 'Vô hạn' : String(pkg.maxStaff)} />
                    <MiniMetric icon={<Building2 />} label="Chi nhánh" value={pkg.maxSalons >= 99 ? 'Vô hạn' : String(pkg.maxSalons)} />
                    <MiniMetric icon={<Clock3 />} label="Dùng thử" value={`${pkg.trialDays || 0} ngày`} />
                  </div>
                  <div className="flex-1 min-h-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-brand-text-muted mb-2.5">Tính năng được cấp quyền</p>
                    <div className="h-36 flex flex-col min-w-0">
                      <div className={`space-y-2 flex-1 min-h-0 pr-1 ${featuresExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                        {displayedCapabilities.map((capability) => <div key={capability.key} className="flex items-center gap-2 text-xs text-brand-text min-w-0"><Check className="w-3.5 h-3.5 text-brand-secondary shrink-0" /><span className="truncate" title={capability.label}>{capability.label}</span></div>)}
                        {enabledCapabilities.length === 0 && <p className="text-xs italic text-brand-text-muted">Chưa bật feature flag nào.</p>}
                      </div>
                      {enabledCapabilities.length > 5 && (
                        <button
                          type="button"
                          onClick={() => togglePackageFeatures(pkg.id)}
                          className="subscription-feature-toggle"
                          aria-expanded={featuresExpanded}
                          aria-label={`${featuresExpanded ? 'Thu gọn' : 'Xem thêm'} tính năng của gói ${pkg.name}`}
                        >
                          <span>{featuresExpanded ? 'Thu gọn' : `+${enabledCapabilities.length - 5} tính năng khác`}</span>
                          {featuresExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-y border-brand-outline/25 py-3">
                    <div><p className="text-[9px] text-brand-text-muted">TENANT</p><p className="text-sm font-black text-brand-text">{activeCount}</p></div>
                    <div><p className="text-[9px] text-brand-text-muted">DÙNG THỬ</p><p className="text-sm font-black text-brand-text">{trialCount}</p></div>
                    <div><p className="text-[9px] text-brand-text-muted">MRR · {reportCurrency}</p><p className="text-xs font-black text-brand-secondary truncate" title={formatMoney(packageMrr, reportCurrency)}>{formatMoney(packageMrr, reportCurrency)}</p></div>
                  </div>
                  {pkg.retirementRequest && (
                    <div className="rounded-lg border border-brand-warning/25 bg-brand-warning/10 p-3">
                      <p className="text-[10px] font-bold text-brand-warning">Đang chờ {packageTenants.length} tenant hết hạn</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-[10px] text-brand-text-muted truncate">Sau đó chuyển sang {pkg.retirementRequest.replacementPackageName}</p>
                        <button onClick={() => onCancelPackageRetirement(pkg.id)} className="shrink-0 text-[10px] font-bold text-brand-text hover:text-brand-primary cursor-pointer">Mở lại đăng ký</button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setEditor({ mode: 'edit', pkg: normalizeSubscriptionPackage(pkg) })} className="mt-auto w-full bg-brand-surface-high hover:bg-brand-surface-highest border border-brand-outline/40 text-brand-text rounded-lg px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"><Edit3 className="w-4 h-4" /> <span>Cấu hình gói</span></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editor && <PackageEditor editor={editor} reportCurrency={reportCurrency} onClose={() => setEditor(null)} onSave={(pkg) => { if (editor.mode === 'add') { const { id, activeTenants, ...newPackage } = pkg; void id; void activeTenants; onAddPackage(newPackage); } else { onUpdatePackage(pkg.id, pkg); } setEditor(null); }} />}
      {showComparison && <ComparisonModal packages={packages.filter((pkg) => getPackageStatus(pkg) !== 'ARCHIVED')} onClose={() => setShowComparison(false)} />}
      {historyTarget && <HistoryModal pkg={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {deleteTarget && <ConfirmModal title={`Xóa gói ${deleteTarget.name}?`} description="Gói chưa có tenant sử dụng và sẽ bị xóa vĩnh viễn. Hành động này không ảnh hưởng các hóa đơn lịch sử." confirmLabel="Xóa vĩnh viễn" onClose={() => setDeleteTarget(null)} onConfirm={() => { onDeletePackage(deleteTarget.id); setDeleteTarget(null); }} />}

      {retirementTarget && (
        <div className="sa-modal-backdrop fixed inset-0 z-50 bg-brand-bg/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-brand-surface border border-brand-outline rounded-2xl shadow-2xl overflow-hidden">
            <ModalHeader title={`Ngừng đăng ký gói ${retirementTarget.name}`} onClose={() => setRetirementTarget(null)} />
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-brand-warning/10 border border-brand-warning/25 p-4 text-xs text-brand-text leading-relaxed space-y-2">
                <p>Gói sẽ <strong>ngừng nhận tenant mới ngay lập tức</strong>.</p>
                <p><strong>{(tenantsByPackage.get(retirementTarget.id) || []).length} tenant hiện tại</strong> vẫn sử dụng bình thường đến ngày hết hạn riêng của từng tenant.</p>
                <p>Khi hết hạn, hệ thống tự chuyển tenant sang gói thay thế và tạo hóa đơn mới.</p>
              </div>
              <Field label="Gói thay thế sau khi hết hạn">
                <BeautifulSelect value={replacementPackageName} onChange={(event) => setReplacementPackageName(event.target.value)} className="form-control">
                  <option value="">Chọn gói đủ hạn mức</option>
                  {getCompatibleReplacementPackages(retirementTarget).map((pkg) => <option key={pkg.id} value={pkg.name}>{pkg.name}</option>)}
                </BeautifulSelect>
              </Field>
              {getCompatibleReplacementPackages(retirementTarget).length === 0 && (
                <p className="text-[10px] text-brand-error">Chưa có gói đang hoạt động nào đủ hạn mức cho tất cả tenant. Hãy tạo hoặc nâng hạn mức một gói thay thế trước.</p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setRetirementTarget(null)} className="btn-secondary">Đóng</button>
              <button disabled={!replacementPackageName} onClick={confirmRetirementRequest} className="bg-brand-warning text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Xác nhận ngừng đăng ký</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4 flex items-center gap-3 min-w-0"><div className="p-2.5 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">{icon}</div><div className="min-w-0"><p className="text-[9px] uppercase font-bold text-brand-text-muted tracking-wider">{label}</p><p className="text-base font-black text-brand-text truncate" title={value}>{value}</p></div></div>;
}

function MiniMetric({ icon, label, value }: { icon: React.ReactElement<{ className?: string }>; label: string; value: string }) {
  return <div className="rounded-lg bg-brand-surface-lowest border border-brand-outline/25 p-2.5 min-w-0"><div className="text-brand-text-muted [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</div><p className="text-[8px] uppercase text-brand-text-muted mt-1.5 truncate">{label}</p><p className="text-[11px] font-black text-brand-text truncate">{value}</p></div>;
}

function MenuButton({ icon, label, onClick, danger = false, disabled = false, title }: { icon: React.ReactElement<{ className?: string }>; label: string; onClick: () => void; danger?: boolean; disabled?: boolean; title?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={title} className={`subscription-menu-item ${danger ? 'subscription-menu-item--danger' : ''}`}>{React.cloneElement(icon, { className: 'w-3.5 h-3.5 shrink-0' })}<span className="truncate">{label}</span></button>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/40 flex items-center justify-between"><h3 className="text-sm font-black text-brand-text">{title}</h3><button type="button" aria-label="Đóng" onClick={onClose} className="p-1 text-brand-text-muted hover:text-brand-text cursor-pointer"><X className="w-5 h-5" /></button></div>;
}

function PackageEditor({ editor, reportCurrency, onClose, onSave }: { editor: EditorState; reportCurrency: CurrencyCode; onClose: () => void; onSave: (pkg: SubscriptionPackage) => void }) {
  const [draft, setDraft] = useState(() => normalizeSubscriptionPackage(editor.pkg));
  const [section, setSection] = useState<'general' | 'features' | 'limits'>('general');
  const [showCapabilityForm, setShowCapabilityForm] = useState(false);
  const [newCapabilityLabel, setNewCapabilityLabel] = useState('');
  const [newCapabilityKey, setNewCapabilityKey] = useState('');
  const updateDiscount = (discount: number) => setDraft((current) => ({ ...current, yearlyDiscountPercent: discount, yearlyPrice: Number((current.price * 12 * (1 - discount / 100)).toFixed(2)) }));
  const updateMonthlyPrice = (price: number) => setDraft((current) => ({ ...current, price, yearlyPrice: Number((price * 12 * (1 - (current.yearlyDiscountPercent || 0) / 100)).toFixed(2)) }));
  const updateLimit = (key: keyof SubscriptionLimits, rawValue: string) => setDraft((current) => ({ ...current, limits: { ...(current.limits || DEFAULT_SUBSCRIPTION_LIMITS), [key]: rawValue === '' ? null : Math.max(0, Number(rawValue)) } }));
  const addCapability = () => {
    const label = newCapabilityLabel.trim();
    const key = createCapabilityKey(newCapabilityKey || label);
    if (!label) {
      alert('Vui lòng nhập tên tính năng.');
      return;
    }
    if (!key) {
      alert('Mã tính năng không hợp lệ.');
      return;
    }
    if ((draft.capabilities || []).some((capability) => capability.key === key)) {
      alert(`Mã tính năng "${key}" đã tồn tại.`);
      return;
    }
    setDraft((current) => ({
      ...current,
      capabilities: [...(current.capabilities || []), { key, label, enabled: true }]
    }));
    setNewCapabilityLabel('');
    setNewCapabilityKey('');
    setShowCapabilityForm(false);
  };
  const closeCapabilityForm = () => {
    setShowCapabilityForm(false);
    setNewCapabilityLabel('');
    setNewCapabilityKey('');
  };
  const removeCapability = (key: string) => setDraft((current) => ({
    ...current,
    capabilities: (current.capabilities || []).filter((capability) => capability.key !== key)
  }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!draft.name.trim()) { alert('Vui lòng nhập tên gói dịch vụ.'); return; } if (draft.price < 0 || getYearlyPackagePrice(draft) < 0) { alert('Giá gói dịch vụ không được nhỏ hơn 0.'); return; } const enabledCapabilities = (draft.capabilities || []).filter((capability) => capability.enabled); onSave({ ...draft, name: draft.name.trim(), description: draft.description?.trim(), features: enabledCapabilities.map((capability) => capability.label) }); };

  return (
    <div className="sa-modal-backdrop fixed inset-0 z-50 bg-brand-bg/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-5xl max-h-[94vh] bg-brand-surface border border-brand-outline rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <ModalHeader title={editor.mode === 'add' ? 'Tạo gói dịch vụ' : `Cấu hình gói ${editor.pkg.name}`} onClose={onClose} />
        <div className="px-5 pt-4 flex gap-2 overflow-x-auto border-b border-brand-outline/25">{([['general', 'Thông tin & giá'], ['features', 'Feature flags'], ['limits', 'Hạn mức']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setSection(key)} className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer ${section === key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-muted hover:text-brand-text'}`}>{label}</button>)}</div>
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {section === 'general' && <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Field label="Tên gói *" className="md:col-span-2"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="form-control" placeholder="Ví dụ: Premium Plus" /></Field><Field label="Trạng thái"><BeautifulSelect value={getPackageStatus(draft)} onChange={(event) => setDraft({ ...draft, status: event.target.value as SubscriptionPackageStatus })} className="form-control"><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đang hoạt động</option><option value="DEPRECATED">Ngừng đăng ký mới</option><option value="ARCHIVED">Đã lưu trữ</option></BeautifulSelect></Field><Field label="Màu nhận diện"><input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} className="form-control h-9 p-1" /></Field></div>
            <Field label="Mô tả gói"><textarea rows={3} value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="form-control resize-none" placeholder="Mô tả đối tượng và giá trị của gói..." /></Field>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Field label="Giá theo tháng"><input type="number" min="0" value={draft.price} onChange={(event) => updateMonthlyPrice(Number(event.target.value))} className="form-control" /></Field><Field label="Giảm giá năm (%)"><input type="number" min="0" max="100" value={draft.yearlyDiscountPercent || 0} onChange={(event) => updateDiscount(Math.min(100, Math.max(0, Number(event.target.value))))} className="form-control" /></Field><Field label="Giá theo năm"><input type="number" min="0" value={getYearlyPackagePrice(draft)} onChange={(event) => setDraft({ ...draft, yearlyPrice: Number(event.target.value) })} className="form-control" /></Field><Field label="Tiền tệ niêm yết"><BeautifulSelect value={draft.currency || reportCurrency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as CurrencyCode })} className="form-control"><option value="VND">VND — Việt Nam Đồng</option><option value="USD">USD — US Dollar</option></BeautifulSelect></Field></div>
            <div className="flex items-start gap-2 rounded-xl border border-brand-outline/35 bg-brand-surface-lowest p-3 text-[10px] leading-relaxed text-brand-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary" />
              <p>
                Đây là đồng tiền dùng để bán gói. Thay đổi lựa chọn này <strong className="text-brand-text">không tự quy đổi các con số giá đang nhập</strong>.
                Báo cáo quản trị vẫn tổng hợp về {reportCurrency}.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Field label="Phí khởi tạo"><input type="number" min="0" value={draft.setupFee || 0} onChange={(event) => setDraft({ ...draft, setupFee: Number(event.target.value) })} className="form-control" /></Field><Field label="Số ngày dùng thử"><input type="number" min="0" value={draft.trialDays || 0} onChange={(event) => setDraft({ ...draft, trialDays: Number(event.target.value) })} className="form-control" /></Field><Field label="Nhân sự tối đa"><input type="number" min="1" value={draft.maxStaff} onChange={(event) => setDraft({ ...draft, maxStaff: Number(event.target.value) })} className="form-control" /><p className="field-hint">Nhập 999 để không giới hạn</p></Field><Field label="Chi nhánh tối đa"><input type="number" min="1" value={draft.maxSalons} onChange={(event) => setDraft({ ...draft, maxSalons: Number(event.target.value) })} className="form-control" /><p className="field-hint">Nhập 99 để không giới hạn</p></Field></div>
            <label className="flex items-center gap-3 rounded-xl border border-brand-outline/35 bg-brand-surface-lowest p-4 cursor-pointer"><input type="checkbox" checked={draft.isPopular || false} onChange={(event) => setDraft({ ...draft, isPopular: event.target.checked })} /><div><p className="text-xs font-bold text-brand-text">Đánh dấu là gói phổ biến</p><p className="text-[10px] text-brand-text-muted">Hiển thị nhãn nổi bật trên thẻ gói.</p></div></label>
          </div>}
          {section === 'features' && <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-brand-text-muted">Feature flag là quyền thực tế mà ứng dụng có thể kiểm tra để bật hoặc khóa chức năng cho tenant.</p>
                <p className="text-[10px] text-brand-text-muted mt-1">Tính năng tùy chỉnh được lưu cùng gói; mã key dùng để tích hợp với ứng dụng tenant.</p>
              </div>
              {!showCapabilityForm && (
                <button type="button" onClick={() => setShowCapabilityForm(true)} className="shrink-0 min-w-max px-4 py-2.5 rounded-lg bg-brand-primary text-brand-on-primary text-xs font-bold hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> Thêm tính năng
                </button>
              )}
            </div>
            {showCapabilityForm && (
              <div className="rounded-xl border border-brand-primary/25 bg-brand-primary/5 p-4">
                <p className="text-xs font-bold text-brand-text mb-3">Thêm feature flag mới</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Tên tính năng *">
                <input
                  value={newCapabilityLabel}
                  onChange={(event) => {
                    const label = event.target.value;
                    setNewCapabilityLabel(label);
                    setNewCapabilityKey(createCapabilityKey(label));
                  }}
                  className="form-control"
                  placeholder="Tên tính năng"
                  aria-label="Tên tính năng mới"
                />
                  </Field>
                  <Field label="Mã tính năng *">
                <input
                  value={newCapabilityKey}
                  onChange={(event) => setNewCapabilityKey(createCapabilityKey(event.target.value))}
                  className="form-control font-mono"
                  placeholder="feature_key"
                  aria-label="Mã tính năng mới"
                />
                  </Field>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={closeCapabilityForm} className="btn-secondary">Hủy</button>
                  <button type="button" onClick={addCapability} className="px-4 py-2.5 rounded-lg bg-brand-primary text-brand-on-primary text-xs font-bold hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                    <Plus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(draft.capabilities || []).map((capability) => {
                const isCustom = !SUBSCRIPTION_CAPABILITY_CATALOG.some((item) => item.key === capability.key);
                return (
                  <div key={capability.key} className={`rounded-xl border p-4 transition-colors ${capability.enabled ? 'border-brand-secondary/40 bg-brand-secondary/5' : 'border-brand-outline/30 bg-brand-surface-lowest'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex-1 min-w-0 cursor-pointer">
                        <p className="text-xs font-bold text-brand-text truncate">{capability.label}</p>
                        <p className="text-[9px] font-mono text-brand-text-muted mt-1 truncate">{capability.key}</p>
                      </label>
                      <div className="flex items-center gap-2">
                        {isCustom && (
                          <button type="button" onClick={() => removeCapability(capability.key)} aria-label={`Xóa ${capability.label}`} title="Xóa tính năng tùy chỉnh" className="p-1.5 rounded-md text-brand-error hover:bg-brand-error/10 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <input type="checkbox" checked={capability.enabled} onChange={(event) => setDraft({ ...draft, capabilities: (draft.capabilities || []).map((item) => item.key === capability.key ? { ...item, enabled: event.target.checked } : item) })} aria-label={`Bật hoặc tắt ${capability.label}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}
          {section === 'limits' && <div><div className="rounded-xl bg-brand-primary/5 border border-brand-primary/20 p-4 text-xs text-brand-text-muted mb-5">Để trống một hạn mức để biểu thị <strong className="text-brand-text">không giới hạn</strong>; nhập 0 để biểu thị <strong className="text-brand-text">không hỗ trợ</strong>.</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{LIMIT_FIELDS.map((field) => { const value = draft.limits?.[field.key]; return <Field key={field.key} label={field.label}><input type="number" min="0" value={value === null ? '' : value ?? 0} placeholder="Không giới hạn" onChange={(event) => updateLimit(field.key, event.target.value)} className="form-control" /><p className="field-hint">Hiện tại: {formatSubscriptionLimit(value, field.suffix)}</p></Field>; })}</div></div>}
        </div>
        <div className="modal-footer"><button type="button" onClick={onClose} className="btn-secondary">Hủy</button><button type="submit" className="bg-brand-primary text-brand-on-primary px-5 py-2.5 rounded-lg text-xs font-black hover:bg-brand-primary/90 cursor-pointer">{editor.mode === 'add' ? 'Tạo gói' : 'Lưu phiên bản mới'}</button></div>
      </form>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) { return <div className={className}><label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">{label}</label>{children}</div>; }

function ComparisonModal({ packages, onClose }: { packages: SubscriptionPackage[]; onClose: () => void }) {
  return <div className="sa-modal-backdrop fixed inset-0 z-50 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"><div className="w-full max-w-7xl max-h-[94vh] bg-brand-surface border border-brand-outline rounded-2xl shadow-2xl overflow-hidden flex flex-col"><ModalHeader title="So sánh quyền lợi và hạn mức" onClose={onClose} /><div className="overflow-auto flex-1"><table className="w-full min-w-[850px] text-xs"><thead className="sticky top-0 z-10 bg-brand-surface-highest"><tr><th className="text-left p-4 w-64 text-brand-text-muted">Tiêu chí</th>{packages.map((pkg) => <th key={pkg.id} className="p-4 text-center text-brand-text"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pkg.color }} />{pkg.name}</th>)}</tr></thead><tbody className="divide-y divide-brand-outline/20"><ComparisonRow label="Trạng thái" values={packages.map((pkg) => STATUS_META[getPackageStatus(pkg)].label)} /><ComparisonRow label="Giá tháng" values={packages.map((pkg) => formatMoney(pkg.price, pkg.currency))} /><ComparisonRow label="Giá năm" values={packages.map((pkg) => formatMoney(getYearlyPackagePrice(pkg), pkg.currency))} /><ComparisonRow label="Nhân sự" values={packages.map((pkg) => pkg.maxStaff >= 999 ? 'Không giới hạn' : String(pkg.maxStaff))} /><ComparisonRow label="Chi nhánh" values={packages.map((pkg) => pkg.maxSalons >= 99 ? 'Không giới hạn' : String(pkg.maxSalons))} />{LIMIT_FIELDS.map((field) => <ComparisonRow key={field.key} label={field.label} values={packages.map((pkg) => formatSubscriptionLimit(pkg.limits?.[field.key], field.suffix))} />)}{SUBSCRIPTION_CAPABILITY_CATALOG.map((capability) => <tr key={capability.key}><td className="p-4 text-brand-text">{capability.label}<p className="text-[8px] font-mono text-brand-text-muted">{capability.key}</p></td>{packages.map((pkg) => { const enabled = pkg.capabilities?.some((item) => item.key === capability.key && item.enabled); return <td key={pkg.id} className="p-4 text-center">{enabled ? <Check className="w-4 h-4 text-brand-secondary mx-auto" /> : <span className="text-brand-text-muted">—</span>}</td>; })}</tr>)}</tbody></table></div></div></div>;
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) { return <tr><td className="p-4 font-semibold text-brand-text">{label}</td>{values.map((value, index) => <td key={`${label}-${index}`} className="p-4 text-center text-brand-text-muted">{value}</td>)}</tr>; }

function HistoryModal({ pkg, onClose }: { pkg: SubscriptionPackage; onClose: () => void }) {
  return <div className="sa-modal-backdrop fixed inset-0 z-50 bg-brand-bg/85 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-2xl max-h-[88vh] bg-brand-surface border border-brand-outline rounded-2xl shadow-2xl overflow-hidden flex flex-col"><ModalHeader title={`Lịch sử giá · ${pkg.name}`} onClose={onClose} /><div className="p-6 overflow-y-auto space-y-3"><div className="rounded-xl border border-brand-secondary/25 bg-brand-secondary/5 p-4 flex items-center justify-between gap-3"><div><p className="text-[10px] text-brand-text-muted">GIÁ HIỆN TẠI · PHIÊN BẢN {pkg.version || 1}</p><p className="text-lg font-black text-brand-text">{formatMoney(pkg.price, pkg.currency)} / tháng</p></div><p className="text-xs font-bold text-brand-secondary">{formatMoney(getYearlyPackagePrice(pkg), pkg.currency)} / năm</p></div>{(pkg.priceHistory || []).length === 0 ? <p className="text-xs text-brand-text-muted text-center py-8">Chưa có lần thay đổi giá nào được ghi nhận.</p> : (pkg.priceHistory || []).map((entry) => <div key={entry.id} className="rounded-xl border border-brand-outline/30 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-brand-text">{formatMoney(entry.monthlyPrice, entry.currency)} / tháng</p><p className="text-[10px] text-brand-text-muted">Hiệu lực {entry.effectiveFrom}</p></div><p className="text-[10px] text-brand-text-muted mt-2">{formatMoney(entry.yearlyPrice, entry.currency)} / năm · {entry.note}</p></div>)}</div></div></div>;
}

function ConfirmModal({ title, description, confirmLabel, onClose, onConfirm }: { title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  return <div className="sa-modal-backdrop fixed inset-0 z-50 bg-brand-bg/85 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-md bg-brand-surface border border-brand-outline rounded-2xl shadow-2xl overflow-hidden"><ModalHeader title={title} onClose={onClose} /><div className="p-6 flex gap-3"><AlertTriangle className="w-5 h-5 text-brand-warning shrink-0" /><p className="text-xs text-brand-text-muted leading-relaxed">{description}</p></div><div className="modal-footer"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={onConfirm} className="btn-danger">{confirmLabel}</button></div></div></div>;
}
