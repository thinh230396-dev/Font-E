import BeautifulSelect from './BeautifulSelect';
import React, { useState } from 'react';
import { 
  Store, 
  Search, 
  Plus, 
  Eye, 
  Lock, 
  Unlock, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Users,
  Layers, 
  Save, 
  X,
  CreditCard,
  AlertTriangle,
  Upload,
  Globe,
  Clock,
  Settings,
  RefreshCw,
  Shield,
  Sliders,
  PackageCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { CurrencyCode, PackageUpgradeRequest, Tenant, TenantStatus, SubscriptionPackage, SubscriptionPackageName, TenantAdminAccount } from '../types';
import TenantDetailModal from './TenantDetailModal';
import PackageUpgradeRequests from './PackageUpgradeRequests';
import { formatMoney } from '../utils/money';
import { getPlatformRevenueByTenant } from '../utils/platformRevenue';
import { Button, DataTable, Field, Modal, Pagination, StatusBadge, useToast } from './ui';
import {
  describeApiError,
  fieldErrorMap,
  type ApiError,
  type ApiResult
} from '../services/apiClient';
import type { CreateTenantInput, UpdateTenantInput } from '../services/tenants';
import {
  getSellablePackages,
  getSubscriptionBranchLimit,
  getSubscriptionStaffLimit,
  isUnlimitedBranches,
  isUnlimitedStaff
} from '../utils/subscriptions';
import {
  getTenantDeletionEligibility,
  isTenantAdminSuspended,
  validateTenantDraft,
  type TenantDeletionEligibility,
  type TenantFieldErrors
} from '../utils/tenantValidation';



const TENANT_PAGE_SIZE = 10;

type TenantSortColumn = 'name' | 'remaining' | 'date' | 'branches' | 'staff';

/** Tiêu đề cột bấm được để sắp xếp, kèm chỉ báo chiều đang áp dụng. */
function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort
}: {
  label: string;
  column: TenantSortColumn;
  activeColumn: TenantSortColumn;
  direction: 'asc' | 'desc';
  onSort: (column: TenantSortColumn) => void;
}) {
  const isActive = activeColumn === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      // aria-sort thuộc về <th>, nhưng DataTable dựng <th> nên nút tự mô tả bằng nhãn.
      aria-label={`Sắp xếp theo ${label}${isActive ? (direction === 'asc' ? ', đang tăng dần' : ', đang giảm dần') : ''}`}
      className="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-inherit text-inherit shadow-none hover:text-brand-text"
    >
      <span>{label}</span>
      {isActive
        ? (direction === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)
        : <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />}
    </button>
  );
}

/** Ô số liệu tổng ở đầu trang. */
function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-brand-outline bg-brand-surface p-4">
      <p className="font-bold uppercase tracking-wide text-brand-text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-brand-text">{value}</p>
      {hint && <p className="mt-0.5 text-caption text-brand-text-muted">{hint}</p>}
    </div>
  );
}

const COUNTRY_OPTIONS = ['Vietnam', 'United States', 'Canada', 'Australia', 'Japan', 'Korea'];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (GMT+7)' },
  { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
  { value: 'America/Toronto', label: 'America/Toronto (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+11)' }
];

function FormSectionHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-brand-outline pb-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-caption font-bold text-brand-primary">
        {step}
      </span>
      <h3 className="font-bold uppercase tracking-wider text-brand-primary">{title}</h3>
    </div>
  );
}

/**
 * Một ô của biểu mẫu tenant. `data-tenant-field` là móc để `handleAddSubmit`
 * cuộn tới đúng ô sai đầu tiên sau khi bấm Lưu.
 *
 * Khai báo ở cấp module chứ không lồng trong component cha: component định
 * nghĩa lại mỗi lần render sẽ bị React coi là kiểu mới và gắn lại từ đầu, làm
 * ô nhập mất focus ngay khi vừa gõ một ký tự.
 */
function TenantFormField({
  fieldKey,
  label,
  children,
  error,
  helper,
  required = false
}: {
  fieldKey: string;
  label: React.ReactNode;
  children: React.ReactElement;
  error?: string;
  helper?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div data-tenant-field={fieldKey}>
      <Field label={label} error={error} helper={helper} required={required}>
        {children}
      </Field>
    </div>
  );
}

interface TenantManagementProps {
  tenants: Tenant[];
  packages: SubscriptionPackage[];
  tenantAdmins?: TenantAdminAccount[];
  /** Đang tải danh sách tiệm từ máy chủ. */
  loading?: boolean;
  /** Lỗi của lần tải gần nhất; khác `null` thì bảng nhường chỗ cho khối lỗi kèm nút thử lại. */
  loadError?: ApiError | null;
  onReload?: () => void;
  onAddTenant: (input: CreateTenantInput) => Promise<ApiResult<{ tenant: Tenant; generatedPassword?: string }>>;
  onUpdateTenant: (id: string, input: UpdateTenantInput) => Promise<ApiResult<Tenant>>;
  onRenewTenant: (id: string, expiresAt: string) => Promise<ApiResult<Tenant>>;
  onChangeTenantStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<ApiResult<Tenant>>;
  onDeleteTenant: (id: string) => Promise<ApiResult<void>>;
  selectedTenantFromOverview?: Tenant | null;
  clearSelectedTenant?: () => void;
  searchQuery: string;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  upgradeRequests: PackageUpgradeRequest[];
  onReviewUpgradeRequest: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string,
    effectiveDate: 'immediate' | 'next_cycle'
  ) => Promise<boolean>;
  /** Đơn vị tiền của báo cáo hệ thống, dùng cho cột "Đã thu từ tiệm". */
  reportCurrency: CurrencyCode;
}

export default function TenantManagement({
  tenants,
  packages,
  tenantAdmins = [],
  loading = false,
  loadError = null,
  onReload,
  onAddTenant,
  onUpdateTenant,
  onRenewTenant,
  onChangeTenantStatus,
  onDeleteTenant,
  selectedTenantFromOverview,
  clearSelectedTenant,
  searchQuery,
  showConfirm,
  upgradeRequests,
  onReviewUpgradeRequest,
  reportCurrency
}: TenantManagementProps) {
  const showToast = useToast();

  const selectablePackages = getSellablePackages(packages);
  const defaultPackageName = selectablePackages[0]?.name || packages[0]?.name || '';
  const packageFilterOptions = Array.from(new Set([
    ...packages.filter((pkg) => (pkg.status || 'ACTIVE') !== 'ARCHIVED').map((pkg) => pkg.name),
    ...tenants.map((tenant) => tenant.packageName)
  ]));

  /**
   * Chủ tiệm có thể được giao thêm tiệm mới.
   *
   * Bản cũ chỉ nhận tài khoản CHƯA giữ tiệm nào, vì mô hình khi đó là một chủ tiệm quản đúng
   * một tiệm. BR-AUTH-023 nói ngược lại: một tài khoản quản được nhiều tiệm, và dữ liệu mẫu
   * đã dựng sẵn một người giữ hai tiệm để demo điều đó. Nên điều kiện duy nhất còn lại là
   * tài khoản phải đang hoạt động — giao tiệm cho một tài khoản bị khóa là giao cho người
   * không đăng nhập được.
   */
  const availableTenantAdmins = tenantAdmins.filter((admin) => admin.status === 'ACTIVE');

  // Table filtering & searching states
  const [internalSearch, setInternalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'ALL'>('ALL');
  const [packageFilter, setPackageFilter] = useState<SubscriptionPackageName | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<TenantSortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [managementView, setManagementView] = useState<'tenants' | 'upgrade_requests'>('tenants');

  // Modal / Drawer state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(selectedTenantFromOverview || null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'overview' | 'billing' | 'branches' | 'activities' | 'config'>('overview');
  const [detailInitialViewMode, setDetailInitialViewMode] = useState<'quick' | 'full'>('quick');
  const [showAddForm, setShowAddForm] = useState(false);
  const [blockedDeleteTarget, setBlockedDeleteTarget] = useState<{ tenant: Tenant; eligibility: TenantDeletionEligibility } | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Tenant | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [confirmDeleteAgreement, setConfirmDeleteAgreement] = useState(false);
  const [renewTarget, setRenewTarget] = useState<Tenant | null>(null);
  const [renewDate, setRenewDate] = useState('');
  /** Một lệnh ghi đang chạy — khóa nút để không gửi hai lần. */
  const [submitting, setSubmitting] = useState(false);
  /** Lỗi máy chủ gắn theo tên ô nhập, hiện ngay tại ô đó thay vì ở góc màn hình. */
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  /**
   * Mật khẩu tạm mà máy chủ vừa sinh cho chủ tiệm mới.
   *
   * Chuỗi này rời khỏi máy chủ đúng một lần. Hệ thống không gửi email và không có đường đọc
   * lại, nên nếu màn hình không giữ nó thì tài khoản vừa tạo không ai đăng nhập được.
   */
  const [createdCredentials, setCreatedCredentials] = useState<{
    tenantName: string;
    email: string;
    password: string;
  } | null>(null);

  // Form states — chỉ còn những ô mà máy chủ thật sự lưu.
  const [formName, setFormName] = useState('');
  const [formTenantCode, setFormTenantCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSalonEmail, setFormSalonEmail] = useState('');
  const [formTimezone, setFormTimezone] = useState('Asia/Ho_Chi_Minh');
  const [formPrimaryBranchName, setFormPrimaryBranchName] = useState('');
  /**
   * Mã chi nhánh chính — mã ngắn do tiệm tự đặt, ví dụ `Q3`.
   *
   * `CreateTenantInput.primaryBranchCode` nhận trường này từ đầu nhưng biểu mẫu chưa bao giờ
   * có ô nhập, nên **mọi tiệm lập qua giao diện đều có chi nhánh không mã** và huy hiệu ở màn
   * chi nhánh đọc "CHƯA ĐẶT". Mã ấy không phải thứ trang trí: màn Lịch hẹn của chủ tiệm dùng
   * nó làm nhãn ngắn cho con chip ở đầu cột kỹ thuật viên, và khi thiếu thì chip rơi về mã bản
   * ghi kiểu `BRN-LUMIERE-Q3` — đúng lỗi đã phải sửa ở ngày 21.
   */
  const [formPrimaryBranchCode, setFormPrimaryBranchCode] = useState('');

  const [formAdminName, setFormAdminName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminUsername, setFormAdminUsername] = useState('');
  const [formTempPassword, setFormTempPassword] = useState('');
  const [adminCreationMode, setAdminCreationMode] = useState<'existing' | 'new'>('new');
  const [selectedTenantAdminId, setSelectedTenantAdminId] = useState('');

  const [formPackage, setFormPackage] = useState<SubscriptionPackageName>(defaultPackageName);
  const [formBillingCycle, setFormBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  /** Hạn dùng — BR-TENANT-006. Máy chủ từ chối ngày trong quá khứ. */
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formIsTrial, setFormIsTrial] = useState(false);
  /* Chỉ hiện lỗi sau lần bấm Lưu đầu tiên. Đánh dấu đỏ ngay khi form vừa mở thì
     mọi trường bắt buộc đều đỏ trong lúc người dùng còn chưa gõ gì. */
  const [addFormSubmitted, setAddFormSubmitted] = useState(false);

  /** Đưa biểu mẫu về trạng thái ban đầu. Một chỗ duy nhất, để không sót ô nào. */
  const resetCreateForm = () => {
    setFormName('');
    setFormTenantCode('');
    setIsCodeManuallyEdited(false);
    setFormAddress('');
    setFormPhone('');
    setFormSalonEmail('');
    setFormTimezone('Asia/Ho_Chi_Minh');
    setFormPrimaryBranchName('');
    setFormPrimaryBranchCode('');
    setFormAdminName('');
    setFormAdminEmail('');
    setFormAdminUsername('');
    setFormTempPassword('');
    setAdminCreationMode('new');
    setSelectedTenantAdminId('');
    setFormPackage(defaultPackageName);
    setFormBillingCycle('Monthly');
    setFormExpiresAt('');
    setFormIsTrial(false);
    setAddFormSubmitted(false);
    setServerFieldErrors({});
  };


  const generateCodeFromName = (name: string) => {
    if (!name) return '';
    const cleanStr = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese accents
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // remove special characters
      .trim();
    const words = cleanStr.split(/\s+/);
    let code = '';
    if (words.length >= 2) {
      code = words.map(w => w[0]).join('');
    } else {
      code = cleanStr.slice(0, 4);
    }
    return `${code}-${Math.floor(100 + Math.random() * 900)}`;
  };

  const generateAdminCode = () => `TA-${Math.floor(1000 + Math.random() * 9000)}`;

  const getTenantInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'TN';
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  };

  const renderTenantAvatar = (tenant: Tenant, sizeClass = 'w-10 h-10') => {
    if (tenant.logoUrl) {
      return (
        <img
          src={tenant.logoUrl}
          alt={`Ảnh đại diện ${tenant.name}`}
          className={`${sizeClass} rounded-xl object-cover border border-brand-outline/45 bg-brand-surface-high shadow-sm shrink-0`}
        />
      );
    }

    return (
      <div className={`${sizeClass} rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/25 flex items-center justify-center text-xs font-black shrink-0`}>
        {getTenantInitials(tenant.name)}
      </div>
    );
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!isCodeManuallyEdited) {
      setFormTenantCode(generateCodeFromName(val));
    }
  };

  const clearTenantAdminForm = () => {
    setSelectedTenantAdminId('');
    setFormAdminName('');
    setFormAdminEmail('');
    setFormAdminUsername('');
    setFormTempPassword('');
  };

  const selectExistingTenantAdmin = (adminId: string) => {
    setSelectedTenantAdminId(adminId);
    const admin = availableTenantAdmins.find((item) => item.id === adminId);
    if (!admin) return;

    // Chỉ để Superadmin đối chiếu bằng mắt. Khi gửi đi, chế độ "chủ tiệm đã có" chỉ mang theo
    // mã tài khoản — máy chủ tự đọc phần còn lại, và nó mới là bên nắm sự thật.
    setFormAdminName(admin.name);
    setFormAdminEmail(admin.email);
    setFormAdminUsername(admin.username || '');
    setFormTempPassword('');
  };

  const handleAdminCreationModeChange = (mode: 'existing' | 'new') => {
    setAdminCreationMode(mode);
    clearTenantAdminForm();
    if (mode === 'new') return;

    const firstAvailableAdmin = availableTenantAdmins[0];
    if (firstAvailableAdmin) selectExistingTenantAdmin(firstAvailableAdmin.id);
  };

  const getPackageBranchLimit = (packageName: SubscriptionPackageName) => (
    getSubscriptionBranchLimit(packages, packageName)
  );

  const getPackageStaffLimit = (packageName: SubscriptionPackageName) => (
    getSubscriptionStaffLimit(packages, packageName)
  );

  /**
   * Số chi nhánh đang hoạt động, do máy chủ đếm.
   *
   * Bản cũ đọc `tenant.branches?.length` rồi ép tối thiểu bằng 1. Cả hai đều là di sản của dữ
   * liệu mẫu: danh sách chi nhánh không còn đi kèm bản ghi tiệm, và một tiệm hoàn toàn có thể
   * đang ở mức 0 chi nhánh hoạt động nếu chi nhánh phụ bị ngừng hết — hiển thị 1 khi đó là
   * nói sai về chính hạn mức mà màn hình này có nhiệm vụ theo dõi.
   */
  const getTenantBranchCount = (tenant: Tenant) => Number(tenant.branchCount || 0);

  const getTenantBranchLimitLabel = (packageName: SubscriptionPackageName) => {
    const limit = getPackageBranchLimit(packageName);
    return isUnlimitedBranches(limit) ? 'Không giới hạn' : `${limit} chi nhánh`;
  };

  const getTenantStaffLimitLabel = (packageName: SubscriptionPackageName) => {
    const limit = getPackageStaffLimit(packageName);
    return isUnlimitedStaff(limit) ? 'Không giới hạn' : `${limit} nhân sự`;
  };

  // Synchronize view state if overview selected changes
  React.useEffect(() => {
    if (selectedTenantFromOverview) {
      setDetailInitialTab('overview');
      setDetailInitialViewMode('quick');
      setViewingTenant(selectedTenantFromOverview);
      if (clearSelectedTenant) clearSelectedTenant();
    }
  }, [selectedTenantFromOverview]);

  /* Bảng giá tới sau khi biểu mẫu đã mở thì chọn sẵn gói đầu tiên, để ô gói không rỗng. */
  React.useEffect(() => {
    if (showAddForm && !selectablePackages.some((pkg) => pkg.name === formPackage)) {
      setFormPackage(defaultPackageName);
    }
  }, [showAddForm, selectablePackages, formPackage, defaultPackageName]);

  // Ô tìm ở Header và ô tìm trong trang dùng chung một từ khoá.
  const effectiveSearch = (searchQuery || internalSearch).trim().toLowerCase();
  const hasActiveFilters = Boolean(effectiveSearch) || statusFilter !== 'ALL' || packageFilter !== 'ALL';

  const filtered = tenants.filter((tenant) => {
    /* Tìm được bằng CẢ mã ngắn lẫn mã định danh: mã ngắn là thứ tiệm tự đặt và là thứ hiện
       trên màn hình, còn mã định danh là thứ xuất hiện trong URL, log và thông báo lỗi. */
    const matchesSearch = !effectiveSearch
      || tenant.name.toLowerCase().includes(effectiveSearch)
      || tenant.code.toLowerCase().includes(effectiveSearch)
      || tenant.id.toLowerCase().includes(effectiveSearch)
      || tenant.adminEmail.toLowerCase().includes(effectiveSearch)
      || tenant.adminName.toLowerCase().includes(effectiveSearch);

    const matchesStatus = statusFilter === 'ALL' || tenant.status === statusFilter;
    const matchesPackage = packageFilter === 'ALL' || tenant.packageName === packageFilter;

    return matchesSearch && matchesStatus && matchesPackage;
  }).sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    // Cột doanh thu đã được thay bằng "còn lại": doanh thu của tiệm không tới được màn hình
    // này nữa (BR-AUTH-030), còn số ngày còn hạn thì là thứ người bán gói thật sự theo dõi.
    if (sortBy === 'remaining') {
      return ((a.daysRemaining ?? 0) - (b.daysRemaining ?? 0)) * direction;
    }
    if (sortBy === 'date') return a.createdAt.localeCompare(b.createdAt) * direction;
    if (sortBy === 'branches') return (getTenantBranchCount(a) - getTenantBranchCount(b)) * direction;
    if (sortBy === 'staff') return (Number(a.staffCount || 0) - Number(b.staffCount || 0)) * direction;
    return a.name.localeCompare(b.name, 'vi') * direction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Bộ lọc đổi làm số trang co lại; kẹp về trang cuối thay vì hiện bảng rỗng.
  const currentPage = Math.min(page, totalPages);
  const pagedTenants = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setInternalSearch('');
    setStatusFilter('ALL');
    setPackageFilter('ALL');
    setPage(1);
  };

  /** Bấm lại đúng cột đang sắp xếp thì đảo chiều. */
  const toggleSort = (column: TenantSortColumn) => {
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    // Cột số bắt đầu từ lớn xuống nhỏ, cột chữ từ A đến Z.
    setSortDirection(column === 'name' ? 'asc' : 'desc');
  };

  const totalBranchCount = tenants.reduce((sum, tenant) => sum + getTenantBranchCount(tenant), 0);
  const totalStaffCount = tenants.reduce((sum, tenant) => sum + Number(tenant.staffCount || 0), 0);
  const expiringSoonCount = tenants.filter((tenant) => (
    tenant.daysRemaining !== undefined && tenant.daysRemaining >= 0 && tenant.daysRemaining <= 7
  )).length;

  const selectedPackageForForm = packages.find((pkg) => pkg.name === formPackage);

  /* Chạy lại theo từng lần gõ, nên panel điều kiện và dấu lỗi trên từng ô luôn
     phản ánh trạng thái hiện tại của biểu mẫu. */
  const addFormValidation = validateTenantDraft(
    {
      name: formName,
      code: formTenantCode,
      address: formAddress,
      timezone: formTimezone,
      contactEmail: formSalonEmail,
      phone: formPhone,
      packageId: selectedPackageForForm ? selectedPackageForForm.id : '',
      expiresAt: formExpiresAt,
      primaryBranchName: formPrimaryBranchName,
      primaryBranchCode: formPrimaryBranchCode,
      adminMode: adminCreationMode,
      selectedAdminId: selectedTenantAdminId,
      adminName: formAdminName,
      adminEmail: formAdminEmail,
      adminUsername: formAdminUsername,
      adminPassword: formTempPassword
    },
    {
      tenants,
      packages,
      tenantAdmins,
      availableAdminIds: availableTenantAdmins.map((admin) => admin.id)
    }
  );
  /**
   * Lỗi hiện trên biểu mẫu.
   *
   * Lỗi của máy chủ luôn thắng lỗi kiểm tại chỗ: cùng một ô có thể qua được phép kiểm ở trình
   * duyệt rồi vẫn bị máy chủ từ chối — mã tiệm do người khác vừa chiếm chẳng hạn — và khi đó
   * câu trả lời đúng là câu của máy chủ.
   */
  const addFormErrors: TenantFieldErrors = {
    ...(addFormSubmitted ? addFormValidation.errors : {}),
    ...(serverFieldErrors as TenantFieldErrors)
  };

  const openTenantDetail = (
    tenant: Tenant,
    tab: 'overview' | 'billing' | 'branches' | 'activities' | 'config' = 'overview',
    mode: 'quick' | 'full' = tab === 'overview' ? 'quick' : 'full'
  ) => {
    setDetailInitialTab(tab);
    setDetailInitialViewMode(mode);
    setViewingTenant(tenant);
  };

  /**
   * Gửi biểu mẫu tạo tiệm — BR-TENANT-004/005.
   *
   * Từ ngày 6, hàm này không còn dựng sẵn một đối tượng tiệm rồi đẩy vào state. Nó gói dữ
   * liệu đúng theo hợp đồng của `POST /api/tenants` và để máy chủ làm cả năm bước trong một
   * giao dịch: tiệm, chi nhánh chính, tài khoản chủ tiệm, dòng liên kết, và hóa đơn đăng ký.
   *
   * Lỗi trả về được gắn vào đúng ô nhập qua `serverFieldErrors`. Đó là lý do tầng gọi API
   * mang theo danh sách `fields`: một mã tiệm trùng phải đỏ lên ngay tại ô mã tiệm, chứ
   * không phải hiện một dòng chữ ở góc màn hình rồi để người dùng tự dò.
   */
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormSubmitted(true);
    setServerFieldErrors({});

    if (!addFormValidation.isValid) {
      const [firstErrorKey] = Object.keys(addFormValidation.errors);
      showToast(
        `Còn ${Object.keys(addFormValidation.errors).length} trường chưa hợp lệ`,
        'error',
        { description: 'Các trường chưa đạt đã được đánh dấu trong biểu mẫu.' }
      );
      // Đưa người dùng tới đúng ô sai thay vì bắt họ tự dò qua bốn nhóm.
      const target = document.querySelector<HTMLElement>(`[data-tenant-field="${firstErrorKey}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
      return;
    }

    const selectedPackage = packages.find((pkg) => pkg.name === formPackage);
    if (!selectedPackage) {
      showToast('Không đọc được gói dịch vụ từ máy chủ. Hãy tải lại trang rồi thử lại.', 'error');
      return;
    }

    const selectedExistingAdmin = adminCreationMode === 'existing'
      ? availableTenantAdmins.find((admin) => admin.id === selectedTenantAdminId)
      : null;

    showConfirm(
      'Xác nhận tạo tiệm',
      `Tạo tiệm "${formName}" theo gói ${formPackage}, ${adminCreationMode === 'existing'
        ? `giao cho chủ tiệm đã có ${selectedExistingAdmin ? selectedExistingAdmin.email : ''}`
        : `kèm tài khoản chủ tiệm mới ${formAdminEmail.trim()}`}. Tiệm và chi nhánh chính được lập cùng lúc.`,
      () => {
        setSubmitting(true);

        void onAddTenant({
          code: formTenantCode.trim().toUpperCase(),
          name: formName.trim(),
          packageId: selectedPackage.id,
          // Ô nhập là một ngày, còn hợp đồng API là một mốc thời gian. Lấy cuối ngày để
          // "hết hạn 31/12" nghĩa là còn dùng được trọn ngày 31, không phải mất từ 0 giờ.
          expiresAt: new Date(`${formExpiresAt}T23:59:59`).toISOString(),
          isTrial: formIsTrial,
          billingCycle: formBillingCycle === 'Yearly' ? 'yearly' : 'monthly',
          address: formAddress.trim() || undefined,
          phone: formPhone.trim() || undefined,
          contactEmail: formSalonEmail.trim() || undefined,
          timezone: formTimezone,
          primaryBranchName: formPrimaryBranchName.trim() || undefined,
          primaryBranchCode: formPrimaryBranchCode.trim().toUpperCase() || undefined,
          owner: adminCreationMode === 'existing'
            ? { mode: 'existing', existingUserId: selectedTenantAdminId }
            : {
              mode: 'new',
              email: formAdminEmail.trim(),
              username: formAdminUsername.trim() || undefined,
              displayName: formAdminName.trim(),
              // Bỏ trống thì máy chủ tự sinh và trả về đúng một lần.
              password: formTempPassword.trim() || undefined
            }
        }).then((result) => {
          setSubmitting(false);

          if (result.status === 'error') {
            const fields = fieldErrorMap(result.error);
            setServerFieldErrors(fields);

            if (Object.keys(fields).length === 0) {
              const { message, tone } = describeApiError(result.error);
              showToast(message, tone);
            } else {
              showToast('Máy chủ từ chối dữ liệu nhập', 'warning', {
                description: 'Các ô bị từ chối đã được đánh dấu trong biểu mẫu.'
              });
            }
            return;
          }

          // Mật khẩu chỉ tồn tại ở dạng đọc được đúng lần này. Hiện ra và giữ trên màn hình
          // cho tới khi Superadmin tự đóng — hệ thống không gửi email và không có đường đọc
          // lại, nên đóng hộp thoại quá sớm là mất tài khoản vừa tạo.
          if (result.data.generatedPassword) {
            setCreatedCredentials({
              tenantName: result.data.tenant.name,
              email: formAdminEmail.trim(),
              password: result.data.generatedPassword
            });
          }

          resetCreateForm();
          setShowAddForm(false);
        });
      }
    );
  };
  const handleCancelCreate = () => {
    showConfirm(
      'Hủy tạo tiệm',
      'Bạn có chắc chắn muốn hủy bỏ việc tạo mới? Các thông tin đã nhập sẽ bị mất.',
      () => {
        resetCreateForm();
        setShowAddForm(false);
      }
    );
  };

  /**
   * Sửa hồ sơ tiệm — bốn trường mà `PUT /api/tenants/{id}` nhận.
   *
   * Bản cũ gửi kèm gói, trạng thái, số nhân viên, doanh thu và cả mảng chi nhánh. Không
   * trường nào trong số đó thuộc về lệnh sửa hồ sơ ở máy chủ, và đó là chủ ý chứ không phải
   * thiếu sót: đổi gói là một quyết định thương mại, khóa tiệm là một hành động riêng
   * (BR-TENANT-002), còn số nhân viên và chi nhánh là kết quả ĐẾM từ dữ liệu thật chứ không
   * phải con số ai đó gõ vào (BR-SUB-005).
   */
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || submitting) return;

    setSubmitting(true);
    setServerFieldErrors({});

    void onUpdateTenant(editingTenant.id, {
      name: editingTenant.name.trim(),
      address: editingTenant.address.trim() || undefined,
      phone: editingTenant.phone.trim() || undefined,
      contactEmail: editingTenant.contactEmail ? editingTenant.contactEmail.trim() : undefined
    }).then((result) => {
      setSubmitting(false);

      if (result.status === 'error') {
        const fields = fieldErrorMap(result.error);
        setServerFieldErrors(fields);

        if (Object.keys(fields).length === 0) {
          const { message, tone } = describeApiError(result.error);
          showToast(message, tone);
        }
        return;
      }

      setEditingTenant(null);
    });
  };

  /** Gia hạn — BR-TENANT-006, Superadmin nhập tay hạn dùng mới. */
  const handleRenewSubmit = () => {
    if (!renewTarget || !renewDate || submitting) return;

    setSubmitting(true);
    setServerFieldErrors({});

    void onRenewTenant(renewTarget.id, new Date(`${renewDate}T23:59:59`).toISOString()).then((result) => {
      setSubmitting(false);

      if (result.status === 'error') {
        const fields = fieldErrorMap(result.error);
        setServerFieldErrors(fields);

        if (Object.keys(fields).length === 0) {
          const { message, tone } = describeApiError(result.error);
          showToast(message, tone);
        }
        return;
      }

      setRenewTarget(null);
    });
  };

  /**
   * Khóa hoặc mở khóa tiệm — BR-TENANT-002.
   *
   * Tiệm quá hạn KHÔNG mở khóa được bằng nút này: `OVERDUE` là kết quả tính từ hạn dùng, và
   * thứ chữa nó là gia hạn. Máy chủ cũng chỉ nhận đúng hai giá trị `ACTIVE` và `SUSPENDED`.
   */
  const handleToggleStatus = (tenant: Tenant) => {
    const nextStatus = tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    showConfirm(
      nextStatus === 'SUSPENDED' ? `Khóa tiệm ${tenant.name}?` : `Mở khóa tiệm ${tenant.name}?`,
      nextStatus === 'SUSPENDED'
        ? 'Tiệm sẽ chuyển sang chế độ chỉ đọc: xem được dữ liệu nhưng không ghi được gì. Tài khoản chủ tiệm vẫn đăng nhập bình thường.'
        : 'Tiệm hoạt động trở lại và ghi được dữ liệu ngay.',
      () => {
        void onChangeTenantStatus(tenant.id, nextStatus).then((result) => {
          if (result.status === 'error') {
            const { message, tone } = describeApiError(result.error);
            showToast(message, tone);
          }
        });
      }
    );
  };

  const pendingUpgradeCount = upgradeRequests.filter((request) => request.status === 'PENDING').length;
  const managementTabs = (
    <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-brand-outline/35 bg-brand-surface p-1 shadow-sm sm:w-fit">
      <button type="button" onClick={() => setManagementView('tenants')} className={`flex h-10 items-center gap-2 rounded-lg border-0 px-4 text-xs font-black shadow-none ${managementView === 'tenants' ? 'bg-brand-primary text-brand-on-primary' : 'bg-transparent text-brand-text-muted hover:text-brand-text'}`}><Store className="h-4 w-4" />Danh sách Tenant</button>
      <button type="button" onClick={() => setManagementView('upgrade_requests')} className={`flex h-10 items-center gap-2 rounded-lg border-0 px-4 text-xs font-black shadow-none ${managementView === 'upgrade_requests' ? 'bg-brand-primary text-brand-on-primary' : 'bg-transparent text-brand-text-muted hover:text-brand-text'}`}><PackageCheck className="h-4 w-4" />Yêu cầu nâng cấp{pendingUpgradeCount > 0 && <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] ${managementView === 'upgrade_requests' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{pendingUpgradeCount}</span>}</button>
    </div>
  );

  if (managementView === 'upgrade_requests') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand-text sm:text-2xl"><Store className="h-6 w-6 text-brand-primary" />Quản lý Tenant / Chuỗi tiệm Nail</h1><p className="mt-1 text-xs text-brand-text-muted">Tiếp nhận và xử lý các yêu cầu nâng cấp gói do Tenant Admin gửi.</p></div>
          {managementTabs}
        </div>
        <PackageUpgradeRequests requests={upgradeRequests} onReview={onReviewUpgradeRequest} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-brand-primary" />
            <span>Quản lý Tenant / Chuỗi tiệm Nail</span>
          </h1>
          <p className="text-xs text-brand-text-muted mt-1">
            Danh sách đọc trực tiếp từ máy chủ. Một tài khoản chủ tiệm quản được nhiều tiệm, và mỗi tiệm có một chi nhánh chính sinh ra cùng lúc với tiệm.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          title="Thêm tenant mới"
          className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Thêm tenant mới</span>
        </button>
      </div>

      {managementTabs}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Tổng tenant" value={tenants.length.toLocaleString('vi-VN')} />
        <SummaryTile label="Tổng chi nhánh" value={totalBranchCount.toLocaleString('vi-VN')} />
        <SummaryTile label="Tổng nhân sự" value={totalStaffCount.toLocaleString('vi-VN')} />
        <SummaryTile
          label="Sắp hết hạn"
          value={expiringSoonCount.toLocaleString('vi-VN')}
          hint="Còn 7 ngày hoặc ít hơn"
        />
      </div>

      {/*
        Ở đây từng có cảnh báo "một Tenant Admin đang được gắn cho nhiều tenant". Cảnh báo ấy
        đã được gỡ vì BR-AUTH-023 nói ngược lại: một tài khoản chủ tiệm quản nhiều tiệm là
        chuyện bình thường, và dữ liệu mẫu dựng sẵn một người giữ hai tiệm để demo điều đó.
      */}

      {loadError && (
        <div className="flex flex-col gap-3 rounded-card border border-brand-error/30 bg-brand-error/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-error" aria-hidden="true" />
            <div>
              <p className="font-bold text-brand-text">Không tải được danh sách tiệm.</p>
              <p className="mt-0.5 text-brand-text-muted">{loadError.message}</p>
            </div>
          </div>
          {onReload && (
            <Button type="button" variant="secondary" onClick={onReload} className="shrink-0">
              Thử lại
            </Button>
          )}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 rounded-card border border-brand-outline bg-brand-surface p-4 md:flex-row md:items-end md:justify-between">
        <Field label="Tìm tenant" labelHidden className="w-full md:max-w-xs">
          <input
            type="search"
            placeholder="Tìm theo tên, mã tenant hoặc Tenant Admin..."
            value={internalSearch}
            onChange={(e) => {
              setInternalSearch(e.target.value);
              setPage(1);
            }}
          />
        </Field>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Trạng thái" className="min-w-[150px]">
            <BeautifulSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TenantStatus | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="TRIAL">Dùng thử</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="SUSPENDED">Tạm ngưng</option>
            </BeautifulSelect>
          </Field>

          <Field label="Gói dịch vụ" className="min-w-[150px]">
            <BeautifulSelect
              value={packageFilter}
              onChange={(e) => {
                setPackageFilter(e.target.value as SubscriptionPackageName | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả gói</option>
              {packageFilterOptions.map((packageName) => (
                <option key={packageName} value={packageName}>{packageName}</option>
              ))}
            </BeautifulSelect>
          </Field>

          {hasActiveFilters && (
            <Button variant="ghost" size="small" iconLeading={<X />} onClick={resetFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>

      {searchQuery && (
        <p role="status" className="text-brand-text-muted">
          Đang lọc theo từ khóa <strong className="text-brand-text">“{searchQuery}”</strong> từ ô tìm kiếm trên thanh tiêu đề.
        </p>
      )}

      <DataTable
        caption={`Danh sách tenant, đang xem ${pagedTenants.length} trên tổng ${filtered.length} kết quả`}
        rows={pagedTenants}
        rowKey={(tenant) => tenant.id}
        rowClassName={(tenant) =>
          isTenantAdminSuspended(tenant, tenantAdmins)
            ? 'opacity-75 bg-amber-500/[0.04] dark:bg-amber-950/[0.15] hover:opacity-100 transition-opacity border-l-2 border-l-amber-500'
            : undefined
        }
        emptyTitle={hasActiveFilters ? 'Không có tenant nào khớp bộ lọc' : 'Chưa có tenant nào'}
        emptyDescription={hasActiveFilters
          ? 'Thử nới bộ lọc hoặc xóa từ khóa tìm kiếm.'
          : 'Tạo tenant đầu tiên để bắt đầu quản lý chuỗi tiệm.'}
        emptyAction={hasActiveFilters
          ? <Button variant="secondary" size="small" onClick={resetFilters}>Xóa bộ lọc</Button>
          : <Button variant="primary" size="small" iconLeading={<Plus />} onClick={() => setShowAddForm(true)}>Thêm tenant mới</Button>}
        footer={
          <Pagination
            id="tenant-management-pagination"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            totalUnfiltered={tenants.length}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="tenant"
          />
        }
        columns={[
          {
            key: 'tenant',
            header: <SortableHeader label="Tenant / chuỗi tiệm" column="name" activeColumn={sortBy} direction={sortDirection} onSort={toggleSort} />,
            cell: (tenant) => {
              const adminLocked = isTenantAdminSuspended(tenant, tenantAdmins);
              return (
                <div className="flex min-w-[150px] max-w-[210px] items-center gap-2.5">
                  {renderTenantAvatar(tenant, 'w-8 h-8 text-xs shrink-0')}
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="truncate font-bold text-sm text-brand-text" title={tenant.name}>
                        {tenant.name}
                      </span>
                      {adminLocked && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 shrink-0"
                          title="Tài khoản Tenant Admin của tiệm này đang bị khóa tạm thời"
                        >
                          <Lock className="w-2.5 h-2.5 text-amber-500" /> Khóa
                        </span>
                      )}
                    </div>
                    {/* Mã ngắn do tiệm tự đặt, không phải mã định danh bản ghi — cùng thứ mà
                        hộp chọn tiệm và bộ đổi tiệm đang hiện. Trước đây chỗ này in `tenant.id`,
                        nên một tiệm lập qua giao diện đọc ra `TEN-RS552840` trong khi chính chủ
                        tiệm đã gõ mã `RS552840` ở biểu mẫu lập tiệm. */}
                    <span className="truncate text-xs text-brand-text-muted block">
                      {tenant.code}
                    </span>
                  </div>
                </div>
              );
            }
          },
          {
            key: 'admin',
            header: 'Tenant Admin chính',
            hideBelow: 'md',
            cell: (tenant) => {
              const adminLocked = isTenantAdminSuspended(tenant, tenantAdmins);
              const initials = tenant.adminName
                ? tenant.adminName.trim().split(/\s+/).filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()
                : 'AD';
              return (
                <div className="flex min-w-[140px] max-w-[190px] items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                    adminLocked 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' 
                      : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                  }`}>
                    {initials}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div className="flex items-center gap-1 min-w-0">
                      <span 
                        className={`truncate font-semibold text-xs sm:text-sm text-brand-text ${adminLocked ? 'opacity-80' : ''}`}
                        title={tenant.adminName}
                      >
                        {tenant.adminName}
                      </span>
                      {adminLocked && (
                        <span 
                          className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[9px] border border-rose-500/25 shrink-0"
                          title="Tài khoản Tenant Admin bị khóa"
                        >
                          <Lock className="w-2.5 h-2.5" /> Khóa
                        </span>
                      )}
                    </div>
                    <span 
                      className="truncate text-xs text-brand-text-muted block max-w-[130px]" 
                      title={tenant.adminEmail}
                    >
                      {tenant.adminEmail}
                    </span>
                  </div>
                </div>
              );
            }
          },
          {
            key: 'package',
            header: 'Gói dịch vụ',
            hideBelow: 'sm',
            cell: (tenant) => <span className="font-semibold text-xs sm:text-sm text-brand-text whitespace-nowrap">{tenant.packageName}</span>
          },
          {
            key: 'status',
            header: 'Trạng thái',
            cell: (tenant) => <StatusBadge status={tenant.status} size="small" />
          },
          {
            key: 'branches',
            header: <SortableHeader label="Chi nhánh" column="branches" activeColumn={sortBy} direction={sortDirection} onSort={toggleSort} />,
            numeric: true,
            hideBelow: 'xl',
            cell: (tenant) => getTenantBranchCount(tenant).toLocaleString('vi-VN')
          },
          {
            key: 'staff',
            header: <SortableHeader label="Nhân sự" column="staff" activeColumn={sortBy} direction={sortDirection} onSort={toggleSort} />,
            numeric: true,
            hideBelow: 'xl',
            cell: (tenant) => Number(tenant.staffCount || 0).toLocaleString('vi-VN')
          },
          {
            key: 'remaining',
            header: <SortableHeader label="Còn lại" column="remaining" activeColumn={sortBy} direction={sortDirection} onSort={toggleSort} />,
            numeric: true,
            hideBelow: 'lg',
            // Số ngày còn hạn do máy chủ tính lúc đọc (BR-TENANT-002) và mang giá trị âm khi
            // tiệm đã quá hạn — hiển thị đúng như vậy thay vì kẹp về 0.
            cell: (tenant) => {
              const days = tenant.daysRemaining;
              if (days === undefined) return <span className="text-brand-text-muted">—</span>;
              return (
                <span
                  className={`whitespace-nowrap font-medium text-xs sm:text-sm ${
                    days < 0 ? 'text-brand-error' : days <= 7 ? 'text-brand-tertiary' : ''
                  }`}
                >
                  {days < 0 ? `Quá ${Math.abs(days)} ngày` : `${days} ngày`}
                </span>
              );
            }
          },
          {
            key: 'actions',
            header: 'Hành động',
            actions: true,
            width: '135px',
            cell: (tenant) => (
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="small"
                  iconOnly
                  aria-label={`Xem tổng quan tenant ${tenant.name}`}
                  title="Xem tổng quan tenant"
                  onClick={() => openTenantDetail(tenant, 'overview', 'quick')}
                >
                  <Eye />
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  iconOnly
                  aria-label={`Sửa hồ sơ tenant ${tenant.name}`}
                  title="Sửa hồ sơ tenant và Tenant Admin chính"
                  onClick={() => setEditingTenant(tenant)}
                >
                  <Edit />
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  iconOnly
                  aria-label={`Gia hạn tiệm ${tenant.name}`}
                  title="Gia hạn hạn dùng"
                  onClick={() => {
                    setRenewTarget(tenant);
                    // Gợi ý mốc mới là hạn hiện tại cộng một tháng; Superadmin sửa lại được.
                    const base = tenant.subscriptionRenewsAt ? new Date(tenant.subscriptionRenewsAt) : new Date();
                    const suggested = new Date(Math.max(base.getTime(), Date.now()));
                    suggested.setMonth(suggested.getMonth() + 1);
                    setRenewDate(suggested.toISOString().slice(0, 10));
                    setServerFieldErrors({});
                  }}
                >
                  <RefreshCw />
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  iconOnly
                  aria-label={tenant.status === 'SUSPENDED' ? `Mở khóa tiệm ${tenant.name}` : `Khóa tiệm ${tenant.name}`}
                  title={tenant.status === 'SUSPENDED' ? 'Mở khóa tiệm' : 'Khóa tiệm về chế độ chỉ đọc'}
                  onClick={() => handleToggleStatus(tenant)}
                >
                  {tenant.status === 'SUSPENDED' ? <Unlock /> : <Lock />}
                </Button>
                {/* Xóa là hành động nguy hiểm: kiểm tra ràng buộc logic trước,
                    nếu thỏa mãn thì mới mở bước xác nhận an toàn. */}
                {(() => {
                  const eligibility = getTenantDeletionEligibility(tenant);
                  return (
                    <Button
                      variant="danger"
                      size="small"
                      iconOnly
                      aria-label={`Xóa tenant ${tenant.name}`}
                      title={
                        eligibility.canDelete
                          ? `Xóa vĩnh viễn tenant ${tenant.name} (Đủ điều kiện)`
                          : `Không thể xóa: ${eligibility.blockReasons.join('; ')}`
                      }
                      onClick={() => {
                        if (!eligibility.canDelete) {
                          setBlockedDeleteTarget({ tenant, eligibility });
                        } else {
                          setConfirmDeleteTarget(tenant);
                          setConfirmDeleteInput('');
                          setConfirmDeleteAgreement(false);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  );
                })()}
              </div>
            )
          }
        ]}
      />

      {/* VIEW DETAILS MODAL */}
      {viewingTenant && (
        <TenantDetailModal
          tenant={viewingTenant}
          packages={packages}
          onClose={() => setViewingTenant(null)}
          onEditClick={() => setEditingTenant(viewingTenant)}
          initialTab={detailInitialTab}
          initialViewMode={detailInitialViewMode}
        />
      )}

      {/*
        HỘP THOẠI SỬA HỒ SƠ TIỆM

        Chỉ còn bốn ô, đúng bằng những gì `PUT /api/tenants/{id}` nhận. Gói, trạng thái, số
        chi nhánh và số nhân sự đã rời khỏi đây: hai cái đầu có đường đi riêng, hai cái sau là
        kết quả đếm từ dữ liệu thật chứ không phải con số ai đó gõ vào (BR-SUB-005).
      */}
      {editingTenant && (
        <Modal
          open
          onClose={() => setEditingTenant(null)}
          title={`Sửa hồ sơ tiệm ${editingTenant.name}`}
          size="medium"
          closeOnBackdrop={false}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setEditingTenant(null)}>Hủy</Button>
              <Button type="submit" form="edit-tenant-form" disabled={submitting}>
                <Save className="h-3.5 w-3.5" />
                <span>{submitting ? 'Đang lưu…' : 'Lưu cập nhật'}</span>
              </Button>
            </>
          }
        >
          <form id="edit-tenant-form" onSubmit={handleEditSubmit} noValidate className="space-y-4">
            <div className="rounded-control border border-brand-outline/45 bg-brand-surface-lowest px-3 py-2 text-caption text-brand-text-muted">
              Mã tiệm <strong className="text-brand-text">{editingTenant.code || editingTenant.id}</strong> và
              gói <strong className="text-brand-text">{editingTenant.packageName}</strong> được chốt lúc lập tiệm
              và không sửa ở đây.
            </div>

            <Field label="Tên tiệm" required error={serverFieldErrors.name}>
              <input
                type="text"
                value={editingTenant.name}
                onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                className="form-control"
              />
            </Field>

            <Field label="Địa chỉ" error={serverFieldErrors.address}>
              <input
                type="text"
                value={editingTenant.address}
                onChange={(e) => setEditingTenant({ ...editingTenant, address: e.target.value })}
                className="form-control"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Số điện thoại" error={serverFieldErrors.phone}>
                <input
                  type="tel"
                  value={editingTenant.phone}
                  onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                  className="form-control"
                />
              </Field>

              <Field label="Email liên hệ" error={serverFieldErrors.contactEmail}>
                <input
                  type="email"
                  value={editingTenant.contactEmail || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, contactEmail: e.target.value })}
                  className="form-control"
                />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {/* HỘP THOẠI GIA HẠN — BR-TENANT-006 */}
      {renewTarget && (
        <Modal
          open
          onClose={() => setRenewTarget(null)}
          title={`Gia hạn tiệm ${renewTarget.name}`}
          size="small"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setRenewTarget(null)}>Hủy</Button>
              <Button type="button" onClick={handleRenewSubmit} disabled={submitting || !renewDate}>
                {submitting ? 'Đang lưu…' : 'Gia hạn'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-caption text-brand-text-muted">
              Hạn dùng hiện tại:{' '}
              <strong className="text-brand-text">
                {renewTarget.subscriptionRenewsAt
                  ? new Date(renewTarget.subscriptionRenewsAt).toLocaleDateString('vi-VN')
                  : 'Chưa rõ'}
              </strong>
              {renewTarget.daysRemaining !== undefined && (
                <> · {renewTarget.daysRemaining < 0
                  ? `đã quá hạn ${Math.abs(renewTarget.daysRemaining)} ngày`
                  : `còn ${renewTarget.daysRemaining} ngày`}</>
              )}
            </p>

            <Field
              label="Hạn dùng mới"
              required
              error={serverFieldErrors.expiresAt}
              helper="Máy chủ từ chối ngày nằm trong quá khứ."
            >
              <input
                type="date"
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                className="form-control"
              />
            </Field>

            {renewTarget.isTrial && (
              <p className="text-caption text-brand-text-muted">
                Tiệm đang ở chế độ dùng thử. Gia hạn sẽ tắt cờ dùng thử và chuyển tiệm sang trạng thái
                đang hoạt động.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/*
        HỘP THOẠI MẬT KHẨU TẠM

        Chuỗi này rời khỏi máy chủ đúng một lần. Hệ thống không gửi email và không có đường
        đọc lại, nên hộp thoại không tự đóng — Superadmin phải chủ động xác nhận đã lưu.
      */}
      {createdCredentials && (
        <Modal
          open
          onClose={() => setCreatedCredentials(null)}
          title="Mật khẩu tạm của chủ tiệm mới"
          size="small"
          closeOnBackdrop={false}
          footer={
            <Button type="button" onClick={() => setCreatedCredentials(null)}>Tôi đã lưu lại</Button>
          }
        >
          <div className="space-y-4">
            <p className="text-caption text-brand-text-muted">
              Đã lập tiệm <strong className="text-brand-text">{createdCredentials.tenantName}</strong>.
              Máy chủ vừa sinh mật khẩu dưới đây và <strong className="text-brand-text">chỉ hiển thị một lần</strong> —
              hệ thống không gửi email, cũng không có cách xem lại.
            </p>

            <div className="space-y-1 rounded-control border border-brand-outline bg-brand-surface-lowest px-3 py-2.5">
              <p className="text-caption text-brand-text-muted">Đăng nhập bằng</p>
              <p className="font-mono text-sm font-bold text-brand-text">{createdCredentials.email}</p>
              <p className="mt-2 text-caption text-brand-text-muted">Mật khẩu tạm</p>
              <p className="font-mono text-lg font-black tracking-wide text-brand-text">{createdCredentials.password}</p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(createdCredentials.password)
                  .then(() => showToast('Đã sao chép mật khẩu tạm.', 'success'))
                  .catch(() => showToast('Trình duyệt không cho sao chép. Hãy chọn và chép tay.', 'warning'));
              }}
            >
              Sao chép mật khẩu
            </Button>
          </div>
        </Modal>
      )}

      {/* BIỂU MẪU TẠO TIỆM — BR-TENANT-004/005 */}
      {showAddForm && (
        <Modal
          open
          onClose={handleCancelCreate}
          icon={<Store className="w-5 h-5" />}
          title="Lập tiệm mới"
          size="large"
          closeOnBackdrop={false}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={handleCancelCreate}>Hủy</Button>
              <Button type="submit" form="add-tenant-form" disabled={submitting}>
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span>{submitting ? 'Đang lập tiệm…' : 'Lập tiệm'}</span>
              </Button>
            </>
          }
        >
          <form id="add-tenant-form" onSubmit={handleAddSubmit} noValidate className="space-y-8">

            <section className="space-y-4">
              <FormSectionHeading step={1} title="Hồ sơ tiệm" />

              <div className="grid gap-4 md:grid-cols-2">
                <div data-tenant-field="name">
                  <Field label="Tên tiệm" required error={addFormErrors.name}>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Nailé Studio"
                      className="form-control"
                    />
                  </Field>
                </div>

                <div data-tenant-field="code">
                  <Field
                    label="Mã tiệm"
                    required
                    error={addFormErrors.code}
                    helper="Gợi ý tự động từ tên; sửa được. Mã tiệm không đổi lại sau khi lập."
                  >
                    <input
                      type="text"
                      value={formTenantCode}
                      onChange={(e) => {
                        setIsCodeManuallyEdited(true);
                        setFormTenantCode(e.target.value.toUpperCase());
                      }}
                      placeholder="NS-123"
                      className="form-control font-mono"
                    />
                  </Field>
                </div>
              </div>

              <div data-tenant-field="address">
                <Field label="Địa chỉ" required error={addFormErrors.address}>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="95 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh"
                    className="form-control"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div data-tenant-field="phone">
                  <Field label="Số điện thoại" error={addFormErrors.phone}>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0283930001"
                      className="form-control"
                    />
                  </Field>
                </div>

                <div data-tenant-field="contactEmail">
                  <Field label="Email liên hệ" error={addFormErrors.contactEmail}>
                    <input
                      type="email"
                      value={formSalonEmail}
                      onChange={(e) => setFormSalonEmail(e.target.value)}
                      placeholder="lienhe@tiemnail.vn"
                      className="form-control"
                    />
                  </Field>
                </div>

                <div data-tenant-field="timezone">
                  <Field label="Múi giờ" required error={addFormErrors.timezone}>
                    <BeautifulSelect
                      value={formTimezone}
                      onChange={(e) => setFormTimezone(e.target.value)}
                      className="form-control"
                    >
                      {TIMEZONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </BeautifulSelect>
                  </Field>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
                <div data-tenant-field="primaryBranchName">
                  <Field
                    label="Tên chi nhánh chính"
                    error={addFormErrors.primaryBranchName}
                    helper="Bỏ trống thì máy chủ đặt là “Chi nhánh chính”. Mỗi tiệm có đúng một chi nhánh chính và nó sinh ra cùng tiệm (BR-BRANCH-001)."
                  >
                    <input
                      type="text"
                      value={formPrimaryBranchName}
                      onChange={(e) => setFormPrimaryBranchName(e.target.value)}
                      placeholder="Chi nhánh Quận 3"
                      className="form-control"
                    />
                  </Field>
                </div>

                <div data-tenant-field="primaryBranchCode">
                  <Field
                    label="Mã chi nhánh"
                    error={addFormErrors.primaryBranchCode}
                    helper="Mã ngắn tiệm tự đặt, dùng làm nhãn ở bảng lịch. Bỏ trống thì huy hiệu chi nhánh đọc “CHƯA ĐẶT”."
                  >
                    <input
                      type="text"
                      value={formPrimaryBranchCode}
                      // Viết hoa ngay lúc gõ chứ không đợi lúc gửi: ô này hiện ra ở nhiều chỗ
                      // dưới dạng nhãn ngắn, và "q3" lẫn "Q3" trong cùng một bảng thì lệch mắt.
                      onChange={(e) => setFormPrimaryBranchCode(e.target.value.toUpperCase())}
                      placeholder="Q3"
                      maxLength={16}
                      className="form-control"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <FormSectionHeading step={2} title="Gói đăng ký" />

              <div className="grid gap-4 md:grid-cols-2">
                <div data-tenant-field="packageId">
                  <Field
                    label="Gói dịch vụ"
                    required
                    error={addFormErrors.packageId}
                    helper={selectedPackageForForm
                      ? `${getTenantBranchLimitLabel(formPackage)} · ${getTenantStaffLimitLabel(formPackage)} · ${formatMoney(selectedPackageForForm.price, reportCurrency)}/tháng`
                      : 'Đang đọc bảng giá từ máy chủ…'}
                  >
                    <BeautifulSelect
                      value={formPackage}
                      onChange={(e) => setFormPackage(e.target.value)}
                      className="form-control"
                    >
                      {selectablePackages.length === 0 && <option value="">Chưa đọc được bảng giá</option>}
                      {selectablePackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                      ))}
                    </BeautifulSelect>
                  </Field>
                </div>

                <Field label="Chu kỳ thanh toán">
                  <BeautifulSelect
                    value={formBillingCycle}
                    onChange={(e) => setFormBillingCycle(e.target.value as 'Monthly' | 'Yearly')}
                    className="form-control"
                  >
                    <option value="Monthly">Theo tháng</option>
                    <option value="Yearly">Theo năm</option>
                  </BeautifulSelect>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div data-tenant-field="expiresAt">
                  <Field
                    label="Hạn dùng"
                    required
                    error={addFormErrors.expiresAt}
                    helper="Ngày tiệm hết quyền ghi dữ liệu nếu không gia hạn."
                  >
                    <input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="form-control"
                    />
                  </Field>
                </div>

                <Field
                  label="Loại đăng ký"
                  helper="Tiệm dùng thử hiện trạng thái “Dùng thử” cho tới khi được gia hạn."
                >
                  <BeautifulSelect
                    value={formIsTrial ? 'trial' : 'paid'}
                    onChange={(e) => setFormIsTrial(e.target.value === 'trial')}
                    className="form-control"
                  >
                    <option value="paid">Đăng ký trả phí</option>
                    <option value="trial">Dùng thử</option>
                  </BeautifulSelect>
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <FormSectionHeading step={3} title="Chủ tiệm" />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={adminCreationMode === 'new' ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => handleAdminCreationModeChange('new')}
                >
                  Lập tài khoản mới
                </Button>
                <Button
                  type="button"
                  variant={adminCreationMode === 'existing' ? 'primary' : 'secondary'}
                  size="small"
                  disabled={availableTenantAdmins.length === 0}
                  title={availableTenantAdmins.length === 0 ? 'Chưa có tài khoản chủ tiệm nào đang hoạt động.' : undefined}
                  onClick={() => handleAdminCreationModeChange('existing')}
                >
                  Giao cho chủ tiệm đã có
                </Button>
              </div>

              {adminCreationMode === 'existing' ? (
                <div data-tenant-field="adminSelection">
                  <Field
                    label="Chọn chủ tiệm"
                    required
                    error={addFormErrors.adminSelection}
                    helper="Một tài khoản chủ tiệm quản được nhiều tiệm; sau khi đăng nhập họ chọn tiệm muốn làm việc (BR-AUTH-023)."
                  >
                    <BeautifulSelect
                      value={selectedTenantAdminId}
                      onChange={(e) => selectExistingTenantAdmin(e.target.value)}
                      className="form-control"
                    >
                      <option value="">Chọn tài khoản</option>
                      {availableTenantAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name} · {admin.email} · {admin.tenantCount} tiệm
                        </option>
                      ))}
                    </BeautifulSelect>
                  </Field>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div data-tenant-field="adminName">
                      <Field label="Tên chủ tiệm" required error={addFormErrors.adminName}>
                        <input
                          type="text"
                          value={formAdminName}
                          onChange={(e) => setFormAdminName(e.target.value)}
                          placeholder="Nguyễn Văn Bảy"
                          className="form-control"
                        />
                      </Field>
                    </div>

                    <div data-tenant-field="adminEmail">
                      <Field label="Email đăng nhập" required error={addFormErrors.adminEmail}>
                        <input
                          type="email"
                          value={formAdminEmail}
                          onChange={(e) => setFormAdminEmail(e.target.value)}
                          placeholder="chutiem@tiemnail.vn"
                          className="form-control"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div data-tenant-field="adminUsername">
                      <Field
                        label="Username"
                        error={addFormErrors.adminUsername}
                        helper="Không bắt buộc. Có username thì đăng nhập được bằng cả username lẫn email."
                      >
                        <input
                          type="text"
                          value={formAdminUsername}
                          onChange={(e) => setFormAdminUsername(e.target.value)}
                          placeholder="nguyenvanbay"
                          className="form-control"
                        />
                      </Field>
                    </div>

                    <div data-tenant-field="adminPassword">
                      <Field
                        label="Mật khẩu tạm"
                        error={addFormErrors.adminPassword}
                        helper="Bỏ trống thì máy chủ tự sinh và hiện ra một lần ngay sau khi lập tiệm."
                      >
                        <input
                          type="text"
                          value={formTempPassword}
                          onChange={(e) => setFormTempPassword(e.target.value)}
                          placeholder="Để trống cho máy chủ tự sinh"
                          className="form-control font-mono"
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}
            </section>

            {addFormSubmitted && !addFormValidation.isValid && (
              <div className="rounded-card border border-brand-tertiary/30 bg-brand-tertiary/10 p-4">
                <p className="font-bold text-brand-text">
                  Còn {Object.keys(addFormValidation.errors).length} điều kiện chưa đạt
                </p>
                <ul className="mt-2 grid gap-1 text-caption leading-5 text-brand-text-muted sm:grid-cols-2">
                  {Object.values(addFormValidation.errors).map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </Modal>
      )}


      {/* MODAL THÔNG BÁO KHÔNG ĐƯỢC PHÉP XÓA DO RÀNG BUỘC LOGIC */}
      {blockedDeleteTarget && (
        <Modal
          open
          onClose={() => setBlockedDeleteTarget(null)}
          title={`Không thể xóa Tenant "${blockedDeleteTarget.tenant.name}"`}
          eyebrow="Ràng buộc dữ liệu & logic hệ thống"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          size="medium"
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              {blockedDeleteTarget.tenant.status === 'ACTIVE' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const target = blockedDeleteTarget.tenant;
                    setBlockedDeleteTarget(null);
                    void onChangeTenantStatus(target.id, 'SUSPENDED').then((result) => {
                      if (result.status === 'error') {
                        const { message, tone } = describeApiError(result.error);
                        showToast(message, tone);
                      }
                    });
                  }}
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Tạm khóa Tenant ngay
                </Button>
              ) : <div />}
              <Button variant="primary" onClick={() => setBlockedDeleteTarget(null)}>
                Đã hiểu
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-brand-text">
              Hệ thống từ chối yêu cầu xóa đối với tenant <strong>{blockedDeleteTarget.tenant.name}</strong> (<code className="rounded bg-brand-surface-highest px-1.5 py-0.5 text-caption font-mono font-bold text-brand-primary">{blockedDeleteTarget.tenant.id}</code>) vì không thỏa mãn các điều kiện an toàn dữ liệu:
            </p>

            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
              <p className="font-bold text-amber-900 dark:text-amber-200">Các vấn đề logic đang ngăn cản thao tác xóa:</p>
              <ul className="space-y-2 pt-1">
                {blockedDeleteTarget.eligibility.blockReasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-amber-950 dark:text-amber-100">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-black text-amber-900 dark:bg-amber-800 dark:text-amber-100">!</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-brand-outline/40 bg-brand-surface-lowest p-3 text-caption text-brand-text-muted">
              <p className="mb-1 font-semibold text-brand-text">Cách đi tiếp:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Bấm nút khóa ở ngay cạnh nút xóa để đưa tiệm về chế độ chỉ đọc.</li>
                <li>Kiểm tra lại rằng không còn ai đang làm việc trên tiệm đó.</li>
                <li>Quay lại và bấm xóa.</li>
              </ol>
              <p className="mt-2">
                Chi nhánh và nhân sự của tiệm <strong>không</strong> cần dọn trước: xóa tiệm là xóa
                mềm, dữ liệu bên trong ở lại nguyên vẹn trong database.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL XÁC NHẬN XÓA TENANT VĨNH VIỄN (KHI ĐÃ THỎA MÃN ĐIỀU KIỆN LOGIC) */}
      {confirmDeleteTarget && (
        <Modal
          open
          onClose={() => setConfirmDeleteTarget(null)}
          title="Xác nhận xóa tiệm"
          eyebrow="Tiệm biến khỏi hệ thống và không tự khôi phục được"
          icon={<Trash2 className="h-5 w-5 text-rose-500" />}
          size="medium"
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDeleteTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                disabled={!confirmDeleteAgreement || confirmDeleteInput.trim().toUpperCase() !== confirmDeleteTarget.id.toUpperCase()}
                onClick={() => {
                  const target = confirmDeleteTarget;
                  setConfirmDeleteTarget(null);
                  void onDeleteTenant(target.id).then((result) => {
                    if (result.status === 'error') {
                      const { message, tone } = describeApiError(result.error);
                      showToast(message, tone);
                    }
                  });
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Xóa tiệm
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-rose-500/25 bg-rose-50/60 p-3.5 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="font-bold text-rose-800 dark:text-rose-300">Việc này không tự hoàn tác được</p>
              <p className="mt-1 leading-relaxed text-caption">
                Tiệm sẽ biến khỏi mọi danh sách và chủ tiệm mất quyền với nó ngay lập tức. Ba điều
                cần biết trước khi bấm: <strong>mã tiệm vẫn bị giữ chỗ</strong> nên không lập lại
                một tiệm khác cùng mã được; <strong>tài khoản chủ tiệm không bị xóa theo</strong> và
                vẫn đăng nhập được với những tiệm khác họ đang giữ; và <strong>dữ liệu bên trong
                tiệm không bị xóa khỏi database</strong> — nó chỉ không còn đường nào đọc tới.
              </p>
            </div>

            <div className="rounded-xl border border-brand-outline/40 bg-brand-surface-lowest p-3.5 space-y-2">
              <div className="flex justify-between items-center text-caption">
                <span className="text-brand-text-muted">Tên Tenant:</span>
                <span className="font-bold text-brand-text">{confirmDeleteTarget.name}</span>
              </div>
              <div className="flex justify-between items-center text-caption">
                <span className="text-brand-text-muted">Mã định danh (ID):</span>
                <code className="font-mono font-bold text-brand-primary">{confirmDeleteTarget.id}</code>
              </div>
              <div className="flex justify-between items-center text-caption">
                <span className="text-brand-text-muted">Gói dịch vụ:</span>
                <span className="font-semibold text-brand-text">{confirmDeleteTarget.packageName}</span>
              </div>
              <div className="flex justify-between items-center text-caption">
                <span className="text-brand-text-muted">Tenant Admin:</span>
                <span className="text-brand-text">{confirmDeleteTarget.adminName} ({confirmDeleteTarget.adminEmail})</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-brand-outline/35 bg-brand-surface p-3 select-none">
              <input
                type="checkbox"
                checked={confirmDeleteAgreement}
                onChange={(e) => setConfirmDeleteAgreement(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-brand-outline text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-caption font-semibold text-brand-text">
                Tôi hiểu rằng tiệm này sẽ biến khỏi hệ thống và mã tiệm không dùng lại được.
              </span>
            </label>

            <div>
              <label className="block text-caption font-bold text-brand-text mb-1.5">
                Nhập chính xác mã Tenant <span className="font-mono text-rose-600 dark:text-rose-400 font-black">{confirmDeleteTarget.id}</span> để kích hoạt nút xóa:
              </label>
              <input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder={confirmDeleteTarget.id}
                className="w-full rounded-control border border-brand-outline bg-brand-surface px-3 py-2 text-xs font-mono font-bold text-brand-text focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
