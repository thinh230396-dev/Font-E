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
import { normalizeBranch } from '../utils/branches';
import TenantDetailModal from './TenantDetailModal';
import PackageUpgradeRequests from './PackageUpgradeRequests';
import { convertMoney, formatMoney } from '../utils/money';
import { Button, DataTable, Field, Modal, StatusBadge, Switch, useToast } from './ui';
import {
  getSellablePackages,
  getSubscriptionBranchLimit,
  getSubscriptionStaffLimit,
  hasSubscriptionCapability,
  isUnlimitedBranches,
  isUnlimitedStaff
} from '../utils/subscriptions';
import {
  getSuggestedTrialEndDate,
  getTenantDeletionEligibility,
  isTenantAdminSuspended,
  redistributeBranchStaff,
  validateTenantDraft,
  type TenantDeletionEligibility,
  type TenantFieldErrors
} from '../utils/tenantValidation';



const TENANT_PAGE_SIZE = 10;

type TenantSortColumn = 'name' | 'revenue' | 'date' | 'branches' | 'staff';

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
  onAddTenant: (tenant: Omit<Tenant, 'createdAt' | 'lastLogin'>) => void;
  onUpdateTenant: (id: string, updated: Partial<Tenant>) => void;
  onDeleteTenant: (id: string) => void;
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
  /* Tiền tệ báo cáo của hệ thống. Doanh thu từng tenant được lưu theo tiền tệ
     riêng của tenant, nên cột doanh thu phải quy đổi về một đơn vị thì mới so
     sánh, cộng và sắp xếp đúng — giống màn Tổng quan và Báo cáo hệ thống. */
  reportCurrency: CurrencyCode;
}

export default function TenantManagement({ 
  tenants, 
  packages,
  tenantAdmins = [],
  onAddTenant, 
  onUpdateTenant, 
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
  const defaultPackageName = selectablePackages[0]?.name || packages[0]?.name || 'Basic';
  const packageFilterOptions = Array.from(new Set([
    ...packages.filter((pkg) => (pkg.status || 'ACTIVE') !== 'ARCHIVED').map((pkg) => pkg.name),
    ...tenants.map((tenant) => tenant.packageName)
  ]));

  const tenantAdminUsageByEmail = tenants.reduce<Record<string, number>>((acc, tenant) => {
    const email = tenant.adminEmail.trim().toLowerCase();
    if (!email) return acc;
    acc[email] = (acc[email] || 0) + 1;
    return acc;
  }, {});

  const duplicateTenantAdminGroups = Object.values(tenantAdminUsageByEmail).filter(count => count > 1).length;
  const assignedTenantAdminEmails = new Set(tenants.map((tenant) => tenant.adminEmail.trim().toLowerCase()).filter(Boolean));
  const availableTenantAdmins = tenantAdmins.filter((admin) => (
    admin.source === 'INVITED' &&
    admin.status !== 'SUSPENDED' &&
    admin.tenantIds.length === 0 &&
    !assignedTenantAdminEmails.has(admin.email.trim().toLowerCase())
  ));

  // Table filtering & searching states
  const [internalSearch, setInternalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'ALL'>('ALL');
  const [packageFilter, setPackageFilter] = useState<SubscriptionPackageName | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<TenantSortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
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

  // Form states
  const [formName, setFormName] = useState('');
  const [formTenantCode, setFormTenantCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [formLogo, setFormLogo] = useState('');
  const [formLogoName, setFormLogoName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSalonEmail, setFormSalonEmail] = useState('');
  const [formCountry, setFormCountry] = useState('Vietnam');
  const [formTimezone, setFormTimezone] = useState('Asia/Ho_Chi_Minh');

  const [formAdminName, setFormAdminName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminPhone, setFormAdminPhone] = useState('');
  const [formAdminCode, setFormAdminCode] = useState('');
  const [formAdminUsername, setFormAdminUsername] = useState('');
  const [formTempPassword, setFormTempPassword] = useState('');
  const [formSendActivationEmail, setFormSendActivationEmail] = useState(true);
  const [adminCreationMode, setAdminCreationMode] = useState<'existing' | 'new'>('new');
  const [selectedTenantAdminId, setSelectedTenantAdminId] = useState('');

  const [formPackage, setFormPackage] = useState<SubscriptionPackageName>(defaultPackageName);
  const [formBillingCycle, setFormBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTrialEndDate, setFormTrialEndDate] = useState('');
  const [formStatus, setFormStatus] = useState<TenantStatus | 'TRIAL'>('ACTIVE');

  const [formStaff, setFormStaff] = useState(() => Math.min(5, getSubscriptionStaffLimit(packages, defaultPackageName)));
  const [formBranchCount, setFormBranchCount] = useState(1);
  const [formRevenue, setFormRevenue] = useState<number | ''>(0);
  const [formCurrency, setFormCurrency] = useState<'USD' | 'VND'>('VND');
  const [formDefaultLanguage, setFormDefaultLanguage] = useState<'Vietnamese' | 'English'>('Vietnamese');
  const [formAllowOnlineBooking, setFormAllowOnlineBooking] = useState(true);
  const [formInternalNotes, setFormInternalNotes] = useState('');
  /* Chỉ hiện lỗi sau lần bấm Lưu đầu tiên. Đánh dấu đỏ ngay khi form vừa mở thì
     mọi trường bắt buộc đều đỏ trong lúc người dùng còn chưa gõ gì. */
  const [addFormSubmitted, setAddFormSubmitted] = useState(false);

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

  const getDefaultTimezoneForCountry = (country: string) => {
    switch (country) {
      case 'Vietnam':
        return 'Asia/Ho_Chi_Minh';
      case 'United States':
        return 'America/New_York';
      case 'Canada':
        return 'America/Toronto';
      case 'Australia':
        return 'Australia/Sydney';
      case 'Japan':
        return 'Asia/Tokyo';
      case 'Korea':
        return 'Asia/Seoul';
      default:
        return 'Asia/Ho_Chi_Minh';
    }
  };

  const handleCountryChange = (country: string) => {
    setFormCountry(country);
    setFormTimezone(getDefaultTimezoneForCountry(country));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormLogoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFormLogoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTenant) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingTenant({ ...editingTenant, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const createRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const generateRandomPassword = () => {
    const pass = createRandomPassword();
    setFormTempPassword(pass);
  };

  const clearTenantAdminForm = () => {
    setSelectedTenantAdminId('');
    setFormAdminName('');
    setFormAdminEmail('');
    setFormAdminPhone('');
    setFormAdminCode('');
    setFormAdminUsername('');
    setFormTempPassword('');
    setFormSendActivationEmail(true);
  };

  const selectExistingTenantAdmin = (adminId: string) => {
    setSelectedTenantAdminId(adminId);
    const admin = availableTenantAdmins.find((item) => item.id === adminId);
    if (!admin) return;

    setFormAdminCode(admin.adminCode || admin.id);
    setFormAdminName(admin.name);
    setFormAdminEmail(admin.email);
    setFormAdminPhone(admin.phone);
    setFormAdminUsername(admin.username || admin.email.split('@')[0] || admin.email);
    setFormTempPassword(admin.tempPassword || '');
    setFormSendActivationEmail(admin.sendActivationEmail === true);
  };

  const handleAdminCreationModeChange = (mode: 'existing' | 'new') => {
    setAdminCreationMode(mode);
    clearTenantAdminForm();
    if (mode === 'new') {
      setFormAdminCode(generateAdminCode());
      return;
    }

    const firstAvailableAdmin = availableTenantAdmins[0];
    if (firstAvailableAdmin) {
      selectExistingTenantAdmin(firstAvailableAdmin.id);
    }
  };

  const getPackageBranchLimit = (packageName: SubscriptionPackageName) => {
    return getSubscriptionBranchLimit(packages, packageName);
  };

  const getPackageStaffLimitPerBranch = (packageName: SubscriptionPackageName) => {
    return getSubscriptionStaffLimit(packages, packageName);
  };

  const getTenantBranchCount = (tenant: Tenant) => Math.max(1, tenant.branches?.length || 1);

  const getTenantBranchLimitLabel = (packageName: SubscriptionPackageName) => {
    const limit = getPackageBranchLimit(packageName);
    return isUnlimitedBranches(limit) ? 'Không giới hạn' : `${limit} chi nhánh`;
  };

  const getTenantStaffLimit = (packageName: SubscriptionPackageName, _branchCount?: number) => {
    return getPackageStaffLimitPerBranch(packageName);
  };

  const getCreateStaffLimit = (packageName: SubscriptionPackageName, branchCount = formBranchCount) => {
    return getTenantStaffLimit(packageName, branchCount);
  };

  const getCreateStaffLimitLabel = (packageName: SubscriptionPackageName, branchCount = formBranchCount) => {
    const limit = getCreateStaffLimit(packageName, branchCount);
    return isUnlimitedStaff(limit) ? 'Không giới hạn' : `${limit} nhân sự`;
  };

  const handleCreatePackageChange = (nextPackage: SubscriptionPackageName) => {
    const nextBranchLimit = getPackageBranchLimit(nextPackage);
    const nextBranchCount = Math.min(formBranchCount, nextBranchLimit);
    const nextLimit = getCreateStaffLimit(nextPackage, nextBranchCount);
    setFormPackage(nextPackage);
    if (!hasSubscriptionCapability(packages, { packageName: nextPackage }, 'online_booking')) {
      setFormAllowOnlineBooking(false);
    }
    setFormBranchCount(nextBranchCount);
    setFormStaff((current) => Math.min(Number(current || 0), nextLimit));
  };

  /**
   * Đổi trạng thái ban đầu. Chọn "Dùng thử" thì tự điền mốc kết thúc theo số
   * ngày trial của chính gói đang chọn — trường này nay là bắt buộc, và gợi ý
   * sẵn thì nhanh hơn bắt người dùng tự tính. Rời khỏi TRIAL thì xóa đi để
   * tenant không mang theo một mốc dùng thử vô nghĩa.
   */
  const handleCreateStatusChange = (nextStatus: TenantStatus) => {
    setFormStatus(nextStatus);
    if (nextStatus === 'TRIAL') {
      setFormTrialEndDate((current) => current || getSuggestedTrialEndDate(packages, formPackage));
    } else {
      setFormTrialEndDate('');
    }
  };

  const handleCreateBranchCountChange = (value: number) => {
    const branchLimit = getPackageBranchLimit(formPackage);
    const nextBranchCount = Math.max(1, Math.min(Number(value) || 1, branchLimit));
    const nextStaffLimit = getCreateStaffLimit(formPackage, nextBranchCount);

    setFormBranchCount(nextBranchCount);
    setFormStaff((current) => (
      isUnlimitedStaff(nextStaffLimit)
        ? Number(current || 0)
        : Math.min(Number(current || 0), nextStaffLimit)
    ));
  };

  const getPackageLimitIssue = (tenant: Tenant, packageName: SubscriptionPackageName) => {
    const branchCount = tenant.branches?.length || 1;
    const branchLimit = getPackageBranchLimit(packageName);
    if (branchCount > branchLimit) {
      return `Gói ${packageName} chỉ hỗ trợ tối đa ${branchLimit === 99 ? 'không giới hạn' : branchLimit} chi nhánh, tenant hiện có ${branchCount} chi nhánh.`;
    }

    const maxStaff = getPackageStaffLimitPerBranch(packageName);
    if (!isUnlimitedStaff(maxStaff) && Number(tenant.staffCount) > maxStaff) {
      return `Gói ${packageName} chỉ hỗ trợ tối đa ${maxStaff} nhân viên toàn tenant, tenant hiện có ${tenant.staffCount} nhân viên.`;
    }

    return null;
  };

  const createInitialBranches = (
    tenantName: string,
    mainAddress: string,
    branchCount: number,
    staffCount: number,
    packageName: SubscriptionPackageName,
    managerName: string,
    phone: string,
    email: string,
    timezone: string,
    monthlyRevenue: number
  ) => {
    const safeBranchCount = Math.max(1, branchCount);
    const baseStaff = Math.floor(staffCount / safeBranchCount);
    const extraStaff = staffCount % safeBranchCount;

    return Array.from({ length: safeBranchCount }, (_, idx) => {
      const branchNumber = idx + 1;
      const staffForThisBranch = safeBranchCount === 1
        ? staffCount
        : baseStaff + (idx < extraStaff ? 1 : 0);

      return normalizeBranch({
        id: `BR-${branchNumber}`,
        code: `BR-${branchNumber}`,
        name: `${tenantName} - Chi nhánh ${branchNumber === 1 ? 'chính' : branchNumber}`,
        address: branchNumber === 1 ? (mainAddress || 'Chưa cập nhật') : `Chưa cập nhật địa chỉ chi nhánh ${branchNumber}`,
        model: branchNumber === 1 ? 'FULL_SERVICE' : 'NAIL_STUDIO',
        isPrimary: branchNumber === 1,
        managerName: branchNumber === 1 ? managerName : 'Chưa phân công',
        phone: branchNumber === 1 ? phone : 'Chưa cập nhật',
        email: branchNumber === 1 ? email : '',
        timezone,
        openingHours: '08:00–21:00',
        stationCount: Math.max(4, staffForThisBranch + 2),
        staffCapacity: Math.max(4, staffForThisBranch),
        monthlyRevenue: Math.round(monthlyRevenue / safeBranchCount),
        capacityPercent: 0,
        staffUsed: staffForThisBranch,
        staffLimit: getPackageStaffLimitPerBranch(packageName),
        status: 'ACTIVE' as const,
        staffCount: staffForThisBranch
      }, undefined, idx);
    });
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

  React.useEffect(() => {
    if (showAddForm && adminCreationMode === 'new' && !formAdminCode) {
      setFormAdminCode(generateAdminCode());
    }
  }, [showAddForm, formAdminCode, adminCreationMode]);

  React.useEffect(() => {
    if (showAddForm && !selectablePackages.some((pkg) => pkg.name === formPackage)) {
      setFormPackage(defaultPackageName);
      setFormBranchCount(1);
      setFormStaff(Math.min(5, getSubscriptionStaffLimit(packages, defaultPackageName)));
    }
  }, [showAddForm, selectablePackages, formPackage, defaultPackageName, packages]);

  /* Doanh thu của mỗi tenant lưu theo tiền tệ riêng của tenant đó. Muốn cộng,
     so sánh hay sắp xếp thì phải quy về cùng một đơn vị trước. */
  const getReportRevenue = (tenant: Tenant) => convertMoney(
    Number(tenant.monthlyRevenue || 0),
    tenant.currency,
    reportCurrency
  );

  // Ô tìm ở Header và ô tìm trong trang dùng chung một từ khoá.
  const effectiveSearch = (searchQuery || internalSearch).trim().toLowerCase();
  const hasActiveFilters = Boolean(effectiveSearch) || statusFilter !== 'ALL' || packageFilter !== 'ALL';

  const filtered = tenants.filter((tenant) => {
    const matchesSearch = !effectiveSearch
      || tenant.name.toLowerCase().includes(effectiveSearch)
      || tenant.id.toLowerCase().includes(effectiveSearch)
      || tenant.adminEmail.toLowerCase().includes(effectiveSearch)
      || tenant.adminName.toLowerCase().includes(effectiveSearch);

    const matchesStatus = statusFilter === 'ALL' || tenant.status === statusFilter;
    const matchesPackage = packageFilter === 'ALL' || tenant.packageName === packageFilter;

    return matchesSearch && matchesStatus && matchesPackage;
  }).sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    if (sortBy === 'revenue') return (getReportRevenue(a) - getReportRevenue(b)) * direction;
    if (sortBy === 'date') return a.createdAt.localeCompare(b.createdAt) * direction;
    if (sortBy === 'branches') return (getTenantBranchCount(a) - getTenantBranchCount(b)) * direction;
    if (sortBy === 'staff') return (Number(a.staffCount || 0) - Number(b.staffCount || 0)) * direction;
    return a.name.localeCompare(b.name, 'vi') * direction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / TENANT_PAGE_SIZE));
  // Bộ lọc đổi làm số trang co lại; kẹp về trang cuối thay vì hiện bảng rỗng.
  const currentPage = Math.min(page, totalPages);
  const pagedTenants = filtered.slice((currentPage - 1) * TENANT_PAGE_SIZE, currentPage * TENANT_PAGE_SIZE);

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
  const totalReportRevenue = tenants.reduce((sum, tenant) => sum + getReportRevenue(tenant), 0);

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
      adminMode: adminCreationMode,
      selectedAdminId: selectedTenantAdminId,
      adminCode: formAdminCode,
      adminName: formAdminName,
      adminEmail: formAdminEmail,
      adminPhone: formAdminPhone,
      adminUsername: formAdminUsername,
      packageName: formPackage,
      branchCount: formBranchCount,
      staffCount: Number(formStaff || 0),
      status: formStatus,
      trialEndDate: formTrialEndDate
    },
    {
      tenants,
      packages,
      tenantAdmins,
      availableAdminIds: availableTenantAdmins.map((admin) => admin.id)
    }
  );
  /* Lỗi chỉ hiện sau lần bấm Lưu đầu tiên; xem `addFormSubmitted`. */
  const addFormErrors: TenantFieldErrors = addFormSubmitted ? addFormValidation.errors : {};
  const canUseOnlineBooking = hasSubscriptionCapability(packages, { packageName: formPackage }, 'online_booking');

  const openTenantDetail = (
    tenant: Tenant,
    tab: 'overview' | 'billing' | 'branches' | 'activities' | 'config' = 'overview',
    mode: 'quick' | 'full' = tab === 'overview' ? 'quick' : 'full'
  ) => {
    setDetailInitialTab(tab);
    setDetailInitialViewMode(mode);
    setViewingTenant(tenant);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormSubmitted(true);

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

    const normalizedTenantCode = formTenantCode.trim().toUpperCase();
    const finalStatus: TenantStatus = formStatus;
    const trialDaysRemaining = formTrialEndDate
      ? Math.max(0, Math.ceil((new Date(formTrialEndDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : undefined;

    const finalAdminName = formAdminName.trim();
    const finalAdminEmail = formAdminEmail.trim();
    const finalAdminPhone = formAdminPhone.trim();
    let finalAdminCode = formAdminCode.trim();
    let finalAdminUsername = formAdminUsername.trim();
    let finalAdminTempPassword = formTempPassword.trim();
    const selectedExistingAdmin = adminCreationMode === 'existing'
      ? availableTenantAdmins.find((admin) => admin.id === selectedTenantAdminId)
      : null;

    finalAdminCode = finalAdminCode || generateAdminCode();
    finalAdminTempPassword = adminCreationMode === 'new'
      ? (finalAdminTempPassword || createRandomPassword())
      : (selectedExistingAdmin?.tempPassword || '');
    const finalTenantAdminId = finalAdminCode;

    // Validation passed! Now show confirmation modal
    showConfirm(
      "Xác nhận tạo Tenant",
      `Bạn có chắc chắn muốn tạo Tenant mới "${formName}" với ${formBranchCount} chi nhánh ban đầu và ${adminCreationMode === 'existing' ? 'gán Tenant Admin có sẵn' : 'tạo Tenant Admin mới'} là ${finalAdminEmail} không?`,
      () => {
        const initialBranches = createInitialBranches(
          formName,
          formAddress,
          formBranchCount,
          Number(formStaff),
          formPackage,
          finalAdminName,
          formPhone || finalAdminPhone,
          formSalonEmail,
          formTimezone,
          Number(formRevenue || 0)
        );

        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const logDescription = `${adminCreationMode === 'existing' ? 'Gán Tenant Admin có sẵn' : 'Tạo Tenant Admin chính'} ${finalAdminEmail} cho tenant`;

        const initialActivities = [
          {
            date: timestamp,
            user: 'Superadmin',
            type: 'config',
            description: logDescription
          }
        ];

        onAddTenant({
          id: normalizedTenantCode,
          name: formName,
          adminName: finalAdminName,
          adminEmail: finalAdminEmail,
          packageName: formPackage,
          status: finalStatus,
          monthlyRevenue: Number(formRevenue || 0),
          contactEmail: formSalonEmail.trim() || undefined,
          logoUrl: formLogo || undefined,
          country: formCountry,
          timezone: formTimezone,
          currency: formCurrency,
          defaultLanguage: formDefaultLanguage,
          allowOnlineBooking: hasSubscriptionCapability(packages, { packageName: formPackage }, 'online_booking')
            ? formAllowOnlineBooking
            : false,
          internalNotes: formInternalNotes.trim() || undefined,
          staffCount: Number(formStaff),
          address: formAddress || 'Chưa cập nhật',
          phone: formPhone || finalAdminPhone || 'Chưa cập nhật',
          branches: initialBranches,
          tenantAdminId: finalTenantAdminId,
          adminCreationMode,
          isNewAdminCreated: adminCreationMode === 'new',
          adminUsername: finalAdminUsername,
          adminPhone: finalAdminPhone,
          adminTempPassword: finalAdminTempPassword || undefined,
          adminSendActivationEmail: adminCreationMode === 'new' ? formSendActivationEmail : selectedExistingAdmin?.sendActivationEmail,
          adminEmailVerified: adminCreationMode === 'existing' ? selectedExistingAdmin?.emailVerified : false,
          adminPhoneVerified: adminCreationMode === 'existing' ? selectedExistingAdmin?.phoneVerified : false,
          adminCountry: formCountry,
          adminTimezone: formTimezone,
          adminAddress: formAddress || 'Chưa cập nhật',
          billingCycle: formBillingCycle === 'Yearly' ? 'yearly' : 'monthly',
          planStartDate: formStartDate,
          trialEndDate: formTrialEndDate || undefined,
          daysRemaining: finalStatus === 'TRIAL' ? trialDaysRemaining : undefined,
          paymentStatus: finalStatus === 'TRIAL' ? 'PENDING' : undefined,
          plan: formPackage,
          subscriptionPlan: formPackage,
          customActivities: initialActivities
        });

        // Reset Form
        setFormName('');
        setFormTenantCode('');
        setIsCodeManuallyEdited(false);
        setFormLogo('');
        setFormLogoName('');
        setFormAddress('');
        setFormPhone('');
        setFormSalonEmail('');
        setFormCountry('Vietnam');
        setFormTimezone('Asia/Ho_Chi_Minh');
        setFormAdminName('');
        setFormAdminEmail('');
        setFormAdminPhone('');
        setFormAdminCode('');
        setFormAdminUsername('');
        setFormTempPassword('');
        setFormSendActivationEmail(true);
        setAdminCreationMode('new');
        setSelectedTenantAdminId('');
        setFormPackage(defaultPackageName);
        setFormBillingCycle('Monthly');
        setFormStartDate(new Date().toISOString().split('T')[0]);
        setFormTrialEndDate('');
        setFormStatus('ACTIVE');
        setFormStaff(Math.min(5, getSubscriptionStaffLimit(packages, defaultPackageName)));
        setFormBranchCount(1);
        setFormRevenue(0);
        setFormCurrency('VND');
        setFormDefaultLanguage('Vietnamese');
        setFormAllowOnlineBooking(true);
        setFormInternalNotes('');
        setAddFormSubmitted(false);

        setShowAddForm(false);
      }
    );
  };

  const handleCancelCreate = () => {
    // Show confirmation modal for canceling
    showConfirm(
      "Hủy tạo Tenant",
      "Bạn có chắc chắn muốn hủy bỏ việc tạo mới? Các thông tin đã nhập sẽ bị mất.",
      () => {
        // Reset Form
        setFormName('');
        setFormTenantCode('');
        setIsCodeManuallyEdited(false);
        setFormLogo('');
        setFormLogoName('');
        setFormAddress('');
        setFormPhone('');
        setFormSalonEmail('');
        setFormCountry('Vietnam');
        setFormTimezone('Asia/Ho_Chi_Minh');
        setFormAdminName('');
        setFormAdminEmail('');
        setFormAdminPhone('');
        setFormAdminCode('');
        setFormAdminUsername('');
        setFormTempPassword('');
        setFormSendActivationEmail(true);
        setAdminCreationMode('new');
        setSelectedTenantAdminId('');
        setFormPackage(defaultPackageName);
        setFormBillingCycle('Monthly');
        setFormStartDate(new Date().toISOString().split('T')[0]);
        setFormTrialEndDate('');
        setFormStatus('ACTIVE');
        setFormStaff(Math.min(5, getSubscriptionStaffLimit(packages, defaultPackageName)));
        setFormBranchCount(1);
        setFormRevenue(0);
        setFormCurrency('VND');
        setFormDefaultLanguage('Vietnamese');
        setFormAllowOnlineBooking(true);
        setFormInternalNotes('');
        setAddFormSubmitted(false);

        setShowAddForm(false);
      }
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const originalTenant = tenants.find(t => t.id === editingTenant.id);
    const lockedPackageName = originalTenant?.packageName || editingTenant.packageName;
    const normalizedAdminEmail = editingTenant.adminEmail.trim().toLowerCase();
    const adminEmailUsedByAnotherTenant = tenants.some(t => (
      t.id !== editingTenant.id && t.adminEmail.trim().toLowerCase() === normalizedAdminEmail
    ));

    if (adminEmailUsedByAnotherTenant) {
      showToast('Email Tenant Admin này đang được dùng ở tenant khác. Theo logic hiện tại, mỗi Tenant Admin chỉ quản lý 1 tenant.', 'error');
      return;
    }

    if (editingTenant.packageName !== lockedPackageName) {
      showToast('Không thể đổi gói trực tiếp trong form cập nhật thông tin Tenant. Vui lòng dùng chức năng "Nâng/Đổi gói" trong tab Gói & thanh toán để hệ thống kiểm tra điều kiện và tạo hóa đơn.', 'warning');
      setEditingTenant({ ...editingTenant, packageName: lockedPackageName });
      return;
    }

    const packageLimitIssue = getPackageLimitIssue(editingTenant, lockedPackageName);
    if (packageLimitIssue) {
      showToast(`${packageLimitIssue} Vui lòng điều chỉnh số chi nhánh/nhân viên hoặc đổi sang gói phù hợp trước khi lưu.`, 'error');
      return;
    }

    const updatedStaffLimit = getPackageStaffLimitPerBranch(lockedPackageName);
    const currentBranches = editingTenant.branches || [];
    const updatedBranches = currentBranches.length > 0 ? redistributeBranchStaff(
      currentBranches,
      Number(editingTenant.staffCount)
    ).map((branch) => ({ ...branch, staffLimit: updatedStaffLimit })) : [
      {
        id: 'BR-1',
        name: `${editingTenant.name} - Chi nhánh chính`,
        address: editingTenant.address || 'Chưa cập nhật',
        staffUsed: Number(editingTenant.staffCount),
        staffLimit: updatedStaffLimit,
        status: 'ACTIVE' as const,
        staffCount: Number(editingTenant.staffCount)
      }
    ];

    onUpdateTenant(editingTenant.id, {
      name: editingTenant.name,
      adminName: editingTenant.adminName.trim(),
      adminEmail: editingTenant.adminEmail.trim(),
      packageName: lockedPackageName,
      status: editingTenant.status,
      monthlyRevenue: Number(editingTenant.monthlyRevenue),
      logoUrl: editingTenant.logoUrl,
      country: editingTenant.country,
      timezone: editingTenant.timezone,
      staffCount: Number(editingTenant.staffCount),
      address: editingTenant.address,
      phone: editingTenant.phone,
      branches: updatedBranches
    });
    setEditingTenant(null);
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
            Mỗi dòng là 1 tenant do Superadmin quản lý. Mỗi tenant có 1 Tenant Admin chính và có thể có nhiều chi nhánh.
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
          label="Doanh thu tháng"
          value={formatMoney(totalReportRevenue, reportCurrency)}
          hint={`Quy đổi về ${reportCurrency}`}
        />
      </div>

      {duplicateTenantAdminGroups > 0 && (
        <div className="flex items-start gap-2 rounded-card border border-brand-tertiary/30 bg-brand-tertiary/10 px-4 py-3 text-brand-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-tertiary" aria-hidden="true" />
          <div>
            <p className="font-bold">Có Tenant Admin đang được gắn cho nhiều tenant.</p>
            <p className="mt-0.5 text-brand-text-muted">Theo logic hiện tại, mỗi Tenant Admin chỉ nên quản lý 1 tenant. Các dòng bị trùng được đánh dấu trong bảng.</p>
          </div>
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
              <option value="EXPIRING">Sắp đến hạn</option>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-brand-text-muted">
              {filtered.length === 0
                ? 'Không có kết quả'
                : `Hiển thị ${(currentPage - 1) * TENANT_PAGE_SIZE + 1}–${(currentPage - 1) * TENANT_PAGE_SIZE + pagedTenants.length} trên ${filtered.length} tenant`}
              {filtered.length !== tenants.length && ` (lọc từ ${tenants.length})`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Trước
                </Button>
                <span className="text-brand-text-muted">Trang {currentPage}/{totalPages}</span>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        }
        columns={[
          {
            key: 'tenant',
            header: <SortableHeader label="Tenant / chuỗi tiệm" column="name" activeColumn={sortBy} direction={sortDirection} onSort={toggleSort} />,
            cell: (tenant) => {
              const adminLocked = isTenantAdminSuspended(tenant, tenantAdmins);
              return (
<<<<<<< HEAD
                <div className="flex min-w-[220px] items-center gap-3">
                  {renderTenantAvatar(tenant)}
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate font-bold text-brand-text">{tenant.name}</span>
                      {adminLocked && (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0"
                          title="Tài khoản Tenant Admin của tiệm này đang bị khóa tạm thời"
                        >
                          <Lock className="w-2.5 h-2.5 text-amber-500" /> Admin bị khóa
                        </span>
                      )}
                    </div>
                    <span className="text-caption text-brand-text-muted">{tenant.id} · tạo ngày {tenant.createdAt}</span>
=======
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
                    <span className="truncate text-xs text-brand-text-muted block">
                      {tenant.id}
                    </span>
>>>>>>> 086b7e1 (commit deeeeeee)
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
              const adminTenantCount = tenantAdminUsageByEmail[tenant.adminEmail.trim().toLowerCase()] || 0;
              const adminLocked = isTenantAdminSuspended(tenant, tenantAdmins);
<<<<<<< HEAD
              return (
                <div className="flex min-w-[180px] flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium text-brand-text ${adminLocked ? 'line-through opacity-80' : ''}`}>{tenant.adminName}</span>
                    {adminLocked && (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[9px] border border-rose-500/25">
                        <Lock className="w-2.5 h-2.5" /> Bị khóa
                      </span>
                    )}
                  </div>
                  <span className="break-all text-caption text-brand-text-muted">{tenant.adminEmail}</span>
                  {adminLocked ? (
                    <span className="mt-0.5 text-[10px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                      Quyền quản trị bị đình chỉ
                    </span>
                  ) : adminTenantCount > 1 ? (
                    <span
                      title="Tenant Admin này đang được gắn cho nhiều tenant, chưa đúng logic 1 Tenant Admin quản lý 1 tenant."
                      className="mt-1 w-fit rounded-full border border-brand-tertiary/30 bg-brand-tertiary/10 px-2 py-0.5 text-caption font-bold text-brand-tertiary"
=======
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
                      {!adminLocked && adminTenantCount > 1 && (
                        <span
                          title={`Tenant Admin này đang được gắn cho ${adminTenantCount} tenant`}
                          className="rounded px-1 py-0.5 text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0"
                        >
                          {adminTenantCount} tiệm
                        </span>
                      )}
                    </div>
                    <span 
                      className="truncate text-xs text-brand-text-muted block max-w-[130px]" 
                      title={tenant.adminEmail}
>>>>>>> 086b7e1 (commit deeeeeee)
                    >
                      {tenant.adminEmail}
                    </span>
<<<<<<< HEAD
                  ) : null}
=======
                  </div>
>>>>>>> 086b7e1 (commit deeeeeee)
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
            key: 'revenue',
            header: <SortableHeader label={`Doanh thu (${reportCurrency})`} column="revenue" activeColumn={sortBy} direction={sortDirection} onSort={toggleSort} />,
            numeric: true,
            hideBelow: 'lg',
            cell: (tenant) => (
              <span
                className="whitespace-nowrap font-medium text-xs sm:text-sm"
                title={tenant.currency && tenant.currency !== reportCurrency
                  ? `Nguyên tệ: ${formatMoney(Number(tenant.monthlyRevenue || 0), tenant.currency)}`
                  : undefined}
              >
                {formatMoney(getReportRevenue(tenant), reportCurrency)}
              </span>
            )
          },
          {
            key: 'actions',
            header: 'Hành động',
            actions: true,
<<<<<<< HEAD
            width: '180px',
=======
            width: '135px',
>>>>>>> 086b7e1 (commit deeeeeee)
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
                {tenant.status === 'SUSPENDED' ? (
                  <Button
                    variant="ghost"
                    size="small"
                    iconOnly
                    aria-label={`Mở khóa tenant ${tenant.name}`}
                    title="Mở khóa toàn bộ tenant"
                    onClick={() => showConfirm(
                      'Mở khóa Tenant',
                      `Bạn chắc chắn muốn mở khóa Tenant "${tenant.name}"? Tenant Admin và toàn bộ chi nhánh sẽ được truy cập lại hệ thống.`,
                      () => onUpdateTenant(tenant.id, { status: 'ACTIVE' })
                    )}
                  >
                    <Unlock />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="small"
                    iconOnly
                    aria-label={`Khóa tạm thời tenant ${tenant.name}`}
                    title="Khóa tạm thời toàn bộ tenant"
                    onClick={() => showConfirm(
                      'Khóa tạm thời Tenant',
                      `Bạn chắc chắn muốn khóa tạm thời Tenant "${tenant.name}"? Tenant Admin và nhân sự của tất cả chi nhánh sẽ bị chặn truy cập.`,
                      () => onUpdateTenant(tenant.id, { status: 'SUSPENDED' })
                    )}
                  >
                    <Lock />
                  </Button>
                )}
                {/* Xóa là hành động nguy hiểm: kiểm tra ràng buộc logic trước,
                    nếu thỏa mãn thì mới mở bước xác nhận an toàn. */}
                {(() => {
                  const eligibility = getTenantDeletionEligibility(tenant, { upgradeRequests });
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
          onUpdateTenant={(id, updated) => {
            onUpdateTenant(id, updated);
            // Update viewingTenant state dynamically so the detail modal instantly reacts
            setViewingTenant((prev) => prev && prev.id === id ? { ...prev, ...updated, lastSync: new Date().toISOString() } : prev);
          }}
          onEditClick={() => setEditingTenant(viewingTenant)}
          initialTab={detailInitialTab}
          initialViewMode={detailInitialViewMode}
        />
      )}

      {/* EDIT MODAL */}
      {editingTenant && (
        <Modal
          open
          onClose={() => setEditingTenant(null)}
          title="Cập Nhật Thông Tin Tenant"
          size="medium"
          closeOnBackdrop={false}
          footer={
            <>
              <button type="button" onClick={() => setEditingTenant(null)} className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text-muted px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Hủy</button>
              <button type="submit" form="edit-tenant-form" className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"><Save className="w-3.5 h-3.5" /><span>Lưu cập nhật</span></button>
            </>
          }
        >
          <form id="edit-tenant-form" onSubmit={handleEditSubmit}>
            <div className="space-y-4">
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Tên tenant / chuỗi tiệm *</label>
                <input 
                  type="text" 
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Ảnh đại diện Tenant</label>
                <div className="flex items-center gap-4 rounded-xl border border-brand-outline/40 bg-brand-surface-lowest p-3">
                  {renderTenantAvatar(editingTenant, 'w-14 h-14')}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-text truncate">
                      {editingTenant.logoUrl ? 'Đã có ảnh đại diện' : 'Chưa có ảnh đại diện'}
                    </p>
                    <p className="text-[10px] text-brand-text-muted mt-0.5">PNG, JPG hoặc JPEG.</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-bold cursor-pointer hover:bg-brand-primary/15">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditLogoChange}
                          className="hidden"
                        />
                      </label>
                      {editingTenant.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingTenant({ ...editingTenant, logoUrl: undefined })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface-high text-brand-text-muted border border-brand-outline/35 text-[10px] font-bold cursor-pointer hover:text-brand-error"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Xóa ảnh</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Tên Tenant Admin chính *</label>
                  <input 
                    type="text" 
                    value={editingTenant.adminName}
                    onChange={(e) => setEditingTenant({ ...editingTenant, adminName: e.target.value })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Email Tenant Admin *</label>
                  <input 
                    type="email" 
                    value={editingTenant.adminEmail}
                    onChange={(e) => setEditingTenant({ ...editingTenant, adminEmail: e.target.value })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Gói Dịch Vụ</label>
                  <div className="bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text flex items-center justify-between gap-2">
                    <span className="font-bold">Gói {editingTenant.packageName}</span>
                    <Lock className="w-3.5 h-3.5 text-brand-text-muted shrink-0" />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-brand-text-muted">
                    Đổi gói cần kiểm tra giới hạn chi nhánh/nhân viên và phát hành hóa đơn, nên phải thực hiện trong luồng Gói & thanh toán.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setViewingTenant(tenants.find(t => t.id === editingTenant.id) || editingTenant);
                      setEditingTenant(null);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Mở luồng Nâng/Đổi gói</span>
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Trạng Thái</label>
                  <BeautifulSelect
                    value={editingTenant.status}
                    onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value as TenantStatus })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="TRIAL">Dùng thử (TRIAL)</option>
                    <option value="EXPIRING">Sắp hết hạn (EXPIRING)</option>
                    <option value="OVERDUE">Quá hạn thanh toán (OVERDUE)</option>
                    <option value="SUSPENDED">Khóa / Tạm ngưng (SUSPENDED)</option>
                  </BeautifulSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Doanh thu tháng toàn tenant</label>
                  <input 
                    type="number" 
                    value={editingTenant.monthlyRevenue}
                    onChange={(e) => setEditingTenant({ ...editingTenant, monthlyRevenue: Number(e.target.value) })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Tổng nhân sự toàn tenant</label>
                  <input 
                    type="number" 
                    value={editingTenant.staffCount}
                    onChange={(e) => setEditingTenant({ ...editingTenant, staffCount: Number(e.target.value) })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Số chi nhánh</label>
                  <div className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs font-bold text-brand-text">
                    {getTenantBranchCount(editingTenant)} chi nhánh
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Giới hạn theo gói</label>
                  <div className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs font-bold text-brand-text">
                    {getTenantBranchLimitLabel(editingTenant.packageName)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Địa chỉ đại diện / chi nhánh chính</label>
                <input 
                  type="text" 
                  value={editingTenant.address}
                  onChange={(e) => setEditingTenant({ ...editingTenant, address: e.target.value })}
                  className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Điện thoại tenant</label>
                <input 
                  type="text" 
                  value={editingTenant.phone}
                  onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                  className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Quốc gia</label>
                  <BeautifulSelect
                    value={editingTenant.country || 'Vietnam'}
                    onChange={(e) => {
                      const nextCountry = e.target.value;
                      setEditingTenant({
                        ...editingTenant,
                        country: nextCountry,
                        timezone: getDefaultTimezoneForCountry(nextCountry)
                      });
                    }}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="Vietnam">Vietnam</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Japan">Japan</option>
                    <option value="Korea">Korea</option>
                  </BeautifulSelect>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Múi giờ</label>
                  <BeautifulSelect
                    value={editingTenant.timezone || getDefaultTimezoneForCountry(editingTenant.country || 'Vietnam')}
                    onChange={(e) => setEditingTenant({ ...editingTenant, timezone: e.target.value })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                    <option value="America/Toronto">America/Toronto (GMT-5)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                    <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
                    <option value="Australia/Sydney">Australia/Sydney (GMT+11)</option>
                  </BeautifulSelect>
                </div>
              </div>

            </div>
          </form>
        </Modal>
      )}

      {/* ADD MODAL */}
      {showAddForm && (
        <Modal
          open
          onClose={handleCancelCreate}
          icon={<Store className="w-5 h-5" />}
          title="Tạo Mới Tenant Hệ Thống"
          size="fullscreen"
          closeOnBackdrop={false}
          bodyClassName="!p-0"
          footer={
            <>
              <button type="button" onClick={handleCancelCreate} className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Hủy</button>
              <button type="submit" form="add-tenant-form" className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"><Plus className="w-3.5 h-3.5 stroke-[3]" /><span>Tạo tenant</span></button>
            </>
          }
        >
          <form id="add-tenant-form" onSubmit={handleAddSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-7">

              {/* SECTION 1: THÔNG TIN TENANT */}
              <section className="space-y-4">
                <FormSectionHeading step={1} title="Thông tin tenant / chuỗi tiệm" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField
                    fieldKey="name"
                    label="Tên tenant / chuỗi tiệm Nail"
                    required
                    error={addFormErrors.name}
                  >
                    <input
                      type="text"
                      placeholder="Ví dụ: Blossom Nail & Spa"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </TenantFormField>

                  <div data-tenant-field="code" className="space-y-1.5">
                    <Field
                      label="Mã tenant"
                      required
                      error={addFormErrors.code}
                      helper={!addFormErrors.code ? 'Tự sinh từ tên tenant; có thể sửa tay.' : undefined}
                    >
                      <input
                        type="text"
                        placeholder="Ví dụ: BL-STUDIO-001"
                        value={formTenantCode}
                        onChange={(e) => {
                          setFormTenantCode(e.target.value);
                          setIsCodeManuallyEdited(true);
                        }}
                        className="uppercase"
                      />
                    </Field>
                    <Button
                      variant="link"
                      size="small"
                      iconLeading={<RefreshCw />}
                      onClick={() => {
                        setFormTenantCode(generateCodeFromName(formName));
                        setIsCodeManuallyEdited(false);
                      }}
                    >
                      Tạo lại mã từ tên
                    </Button>
                  </div>
                </div>

                {/* Logo tenant */}
                <div className="ui-field">
                  <span className="ui-field-label">Logo tenant</span>
                  <div
                    onDragOver={handleLogoDragOver}
                    onDrop={handleLogoDrop}
                    className="relative flex flex-col items-center justify-center rounded-control border-2 border-dashed border-brand-outline p-4 transition-colors hover:border-brand-primary/60"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Chọn logo tenant"
                      onChange={handleLogoChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    {formLogo ? (
                      <div className="z-10 flex items-center gap-3">
                        <img src={formLogo} alt="Xem trước logo" className="h-12 w-12 rounded-control border border-brand-outline object-cover" referrerPolicy="no-referrer" />
                        <div className="text-left">
                          <p className="max-w-[200px] truncate font-semibold text-brand-text">{formLogoName || 'logo.png'}</p>
                          <Button
                            variant="link"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormLogo('');
                              setFormLogoName('');
                            }}
                          >
                            Xóa ảnh
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-6 w-6 text-brand-text-muted" aria-hidden="true" />
                        <p className="text-brand-text">Kéo thả logo vào đây hoặc <span className="font-semibold text-brand-primary">chọn từ thiết bị</span></p>
                        <p className="text-caption text-brand-text-muted">PNG, JPG hoặc JPEG, tối đa 5MB.</p>
                      </div>
                    )}
                  </div>
                </div>

                <TenantFormField
                  fieldKey="address"
                  label="Địa chỉ đại diện / chi nhánh chính"
                  required
                  error={addFormErrors.address}
                >
                  <input
                    type="text"
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </TenantFormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField
                    fieldKey="phone"
                    label="Số điện thoại tenant"
                    error={addFormErrors.phone}
                    helper={!addFormErrors.phone ? 'Không bắt buộc. Ví dụ: 0901234567.' : undefined}
                  >
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </TenantFormField>

                  <TenantFormField
                    fieldKey="contactEmail"
                    label="Email liên hệ tenant"
                    error={addFormErrors.contactEmail}
                    helper={!addFormErrors.contactEmail ? 'Không bắt buộc. Dùng cho liên hệ vận hành.' : undefined}
                  >
                    <input
                      type="email"
                      placeholder="contact@tiemnail.com"
                      value={formSalonEmail}
                      onChange={(e) => setFormSalonEmail(e.target.value)}
                    />
                  </TenantFormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField fieldKey="country" label="Quốc gia">
                    <BeautifulSelect value={formCountry} onChange={(e) => handleCountryChange(e.target.value)}>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </BeautifulSelect>
                  </TenantFormField>

                  <TenantFormField
                    fieldKey="timezone"
                    label="Múi giờ"
                    required
                    error={addFormErrors.timezone}
                  >
                    <BeautifulSelect value={formTimezone} onChange={(e) => setFormTimezone(e.target.value)}>
                      {TIMEZONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </BeautifulSelect>
                  </TenantFormField>
                </div>
              </section>

              {/* SECTION 2: TENANT ADMIN CHÍNH */}
              <section className="space-y-4">
                <FormSectionHeading step={2} title="Tenant Admin chính" />

                <p className="flex items-start gap-2 rounded-control border border-brand-primary/20 bg-brand-primary/10 p-3 text-brand-text">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>
                    <strong className="font-bold">Mỗi tenant có đúng một Tenant Admin chính.</strong>{' '}
                    <span className="text-brand-text-muted">Có thể tạo tài khoản mới hoặc gán một Tenant Admin đã tạo trước đó nhưng chưa quản lý tenant nào.</span>
                  </span>
                </p>

                <div data-tenant-field="adminSelection" className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleAdminCreationModeChange('new')}
                      aria-pressed={adminCreationMode === 'new'}
                      className={`rounded-control border p-3 text-left ${
                        adminCreationMode === 'new'
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-text ring-1 ring-brand-primary/20'
                          : 'border-brand-outline bg-brand-surface-lowest text-brand-text-muted hover:bg-brand-surface'
                      }`}
                    >
                      <span className="block font-bold text-brand-text">Tạo Tenant Admin mới</span>
                      <span className="mt-1 block text-caption">Nhập thông tin admin mới và gửi email kích hoạt.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminCreationModeChange('existing')}
                      disabled={availableTenantAdmins.length === 0}
                      aria-pressed={adminCreationMode === 'existing'}
                      className={`rounded-control border p-3 text-left ${
                        availableTenantAdmins.length === 0
                          ? 'cursor-not-allowed border-brand-outline bg-brand-surface-lowest text-brand-text-muted opacity-60'
                          : adminCreationMode === 'existing'
                            ? 'border-brand-secondary bg-brand-secondary/10 text-brand-text ring-1 ring-brand-secondary/20'
                            : 'border-brand-outline bg-brand-surface-lowest text-brand-text-muted hover:bg-brand-surface'
                      }`}
                    >
                      <span className="block font-bold text-brand-text">Dùng Tenant Admin có sẵn</span>
                      <span className="mt-1 block text-caption">
                        {availableTenantAdmins.length > 0
                          ? `${availableTenantAdmins.length} admin chưa gán tenant`
                          : 'Chưa có admin trống để gán'}
                      </span>
                    </button>
                  </div>

                  {adminCreationMode === 'existing' && (
                    <Field
                      label="Chọn Tenant Admin có sẵn"
                      required
                      error={addFormErrors.adminSelection}
                      helper={!addFormErrors.adminSelection ? 'Chỉ hiển thị Tenant Admin chưa quản lý tenant nào.' : undefined}
                    >
                      <BeautifulSelect
                        value={selectedTenantAdminId}
                        onChange={(e) => selectExistingTenantAdmin(e.target.value)}
                      >
                        <option value="">Chọn Tenant Admin chưa gán tenant</option>
                        {availableTenantAdmins.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {(admin.adminCode || admin.id)} — {admin.name} — {admin.email}
                          </option>
                        ))}
                      </BeautifulSelect>
                    </Field>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div data-tenant-field="adminCode" className="space-y-1.5">
                    <Field label="Mã Tenant Admin" error={addFormErrors.adminCode}>
                      <input
                        type="text"
                        placeholder="TA-0000"
                        value={formAdminCode}
                        onChange={(e) => setFormAdminCode(e.target.value)}
                        readOnly={adminCreationMode === 'existing'}
                      />
                    </Field>
                    {adminCreationMode === 'new' && (
                      <Button variant="link" size="small" onClick={() => setFormAdminCode(generateAdminCode())}>
                        Tạo mã khác
                      </Button>
                    )}
                  </div>

                  <Field label="Vai trò" helper="Không đổi được — mỗi tenant có một Tenant Admin chính.">
                    <input type="text" value="Tenant Admin chính" readOnly />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField
                    fieldKey="adminName"
                    label="Tên Tenant Admin chính"
                    required
                    error={addFormErrors.adminName}
                  >
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={formAdminName}
                      onChange={(e) => setFormAdminName(e.target.value)}
                      readOnly={adminCreationMode === 'existing'}
                    />
                  </TenantFormField>

                  <TenantFormField
                    fieldKey="adminEmail"
                    label="Email Tenant Admin"
                    required
                    error={addFormErrors.adminEmail}
                    helper={!addFormErrors.adminEmail ? 'Đây là tài khoản đăng nhập của tenant.' : undefined}
                  >
                    <input
                      type="email"
                      placeholder="owner@gmail.com"
                      value={formAdminEmail}
                      onChange={(e) => setFormAdminEmail(e.target.value)}
                      readOnly={adminCreationMode === 'existing'}
                    />
                  </TenantFormField>

                  <TenantFormField
                    fieldKey="adminPhone"
                    label="Số điện thoại Tenant Admin"
                    required
                    error={addFormErrors.adminPhone}
                  >
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={formAdminPhone}
                      onChange={(e) => setFormAdminPhone(e.target.value)}
                      readOnly={adminCreationMode === 'existing'}
                    />
                  </TenantFormField>

                  <TenantFormField
                    fieldKey="adminUsername"
                    label="Username đăng nhập"
                    required
                    error={addFormErrors.adminUsername}
                    helper={!addFormErrors.adminUsername ? 'Dùng để đăng nhập quản trị tenant, không nhập dạng email.' : undefined}
                  >
                    <input
                      type="text"
                      placeholder="Ví dụ: nguyenvanbay"
                      value={formAdminUsername}
                      onChange={(e) => setFormAdminUsername(e.target.value)}
                      readOnly={adminCreationMode === 'existing'}
                    />
                  </TenantFormField>
                </div>

                {adminCreationMode === 'new' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Field label="Mật khẩu tạm thời" helper="Bỏ trống để hệ thống tự tạo khi lưu.">
                        <input
                          type="text"
                          placeholder="Bỏ trống để tự tạo"
                          value={formTempPassword}
                          onChange={(e) => setFormTempPassword(e.target.value)}
                        />
                      </Field>
                      <Button variant="link" size="small" onClick={generateRandomPassword}>
                        Tạo mật khẩu ngẫu nhiên
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-brand-outline bg-brand-surface-lowest p-3">
                      <Switch
                        checked={formSendActivationEmail}
                        onChange={setFormSendActivationEmail}
                        label="Gửi email kích hoạt"
                      />
                      <span className="text-caption text-brand-text-muted">Email hướng dẫn tạo mật khẩu được gửi sau khi lưu.</span>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 3: GÓI ĐĂNG KÝ */}
              <section className="space-y-4">
                <FormSectionHeading step={3} title="Gói đăng ký" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField fieldKey="packageName" label="Gói đăng ký ban đầu" required>
                    <BeautifulSelect
                      value={formPackage}
                      onChange={(e) => handleCreatePackageChange(e.target.value as SubscriptionPackageName)}
                    >
                      {selectablePackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                      ))}
                    </BeautifulSelect>
                  </TenantFormField>

                  <TenantFormField fieldKey="billingCycle" label="Chu kỳ thanh toán" required>
                    <BeautifulSelect
                      value={formBillingCycle}
                      onChange={(e) => setFormBillingCycle(e.target.value as 'Monthly' | 'Yearly')}
                    >
                      <option value="Monthly">Hằng tháng</option>
                      <option value="Yearly">Hằng năm (tiết kiệm 20%)</option>
                    </BeautifulSelect>
                  </TenantFormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField fieldKey="status" label="Trạng thái ban đầu" required>
                    <BeautifulSelect value={formStatus} onChange={(e) => handleCreateStatusChange(e.target.value as TenantStatus)}>
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="TRIAL">Dùng thử</option>
                      <option value="SUSPENDED">Tạm ngưng</option>
                    </BeautifulSelect>
                  </TenantFormField>

                  <TenantFormField fieldKey="startDate" label="Ngày bắt đầu">
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                    />
                  </TenantFormField>
                </div>

                <TenantFormField
                  fieldKey="trialEndDate"
                  label="Ngày kết thúc dùng thử"
                  required={formStatus === 'TRIAL'}
                  error={addFormErrors.trialEndDate}
                  helper={!addFormErrors.trialEndDate
                    ? (formStatus === 'TRIAL'
                        ? 'Bắt buộc với tenant dùng thử — đây là mốc hệ thống tự chuyển tenant sang hết hạn.'
                        : 'Chỉ dùng khi trạng thái ban đầu là Dùng thử.')
                    : undefined}
                >
                  <input
                    type="date"
                    value={formTrialEndDate}
                    min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                    onChange={(e) => setFormTrialEndDate(e.target.value)}
                    disabled={formStatus !== 'TRIAL'}
                  />
                </TenantFormField>
              </section>

              {/* SECTION 4: QUY MÔ & CẤU HÌNH */}
              <section className="space-y-4">
                <FormSectionHeading step={4} title="Quy mô & cấu hình" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField
                    fieldKey="branchCount"
                    label="Số chi nhánh ban đầu"
                    required
                    error={addFormErrors.branchCount}
                    helper={!addFormErrors.branchCount ? `Gói ${formPackage} hỗ trợ tối đa ${getTenantBranchLimitLabel(formPackage)}.` : undefined}
                  >
                    <input
                      type="number"
                      min={1}
                      max={getPackageBranchLimit(formPackage)}
                      value={formBranchCount}
                      onChange={(e) => handleCreateBranchCountChange(Number(e.target.value))}
                    />
                  </TenantFormField>

                  <TenantFormField
                    fieldKey="staffCount"
                    label="Tổng nhân sự toàn tenant"
                    required
                    error={addFormErrors.staffCount}
                    helper={!addFormErrors.staffCount ? `Gói ${formPackage} hỗ trợ tối đa ${getCreateStaffLimitLabel(formPackage, formBranchCount)}.` : undefined}
                  >
                    <input
                      type="number"
                      min={0}
                      max={isUnlimitedStaff(getCreateStaffLimit(formPackage, formBranchCount)) ? undefined : getCreateStaffLimit(formPackage, formBranchCount)}
                      value={formStaff}
                      onChange={(e) => {
                        const nextStaff = Math.max(0, Number(e.target.value));
                        const limit = getCreateStaffLimit(formPackage, formBranchCount);
                        setFormStaff(isUnlimitedStaff(limit) ? nextStaff : Math.min(nextStaff, limit));
                      }}
                    />
                  </TenantFormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TenantFormField
                    fieldKey="revenue"
                    label={`Ước tính doanh thu tháng (${formCurrency})`}
                  >
                    <input
                      type="number"
                      min={0}
                      value={formRevenue}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormRevenue(nextValue === '' ? '' : Math.max(0, Number(nextValue)));
                      }}
                    />
                  </TenantFormField>

                  <TenantFormField fieldKey="currency" label="Đơn vị tiền tệ" required>
                    <BeautifulSelect value={formCurrency} onChange={(e) => setFormCurrency(e.target.value as 'USD' | 'VND')}>
                      <option value="VND">VND (Việt Nam Đồng)</option>
                      <option value="USD">USD (Đô la Mỹ)</option>
                    </BeautifulSelect>
                  </TenantFormField>
                </div>

                <TenantFormField fieldKey="language" label="Ngôn ngữ mặc định" required>
                  <BeautifulSelect
                    value={formDefaultLanguage}
                    onChange={(e) => setFormDefaultLanguage(e.target.value as 'Vietnamese' | 'English')}
                  >
                    <option value="Vietnamese">Tiếng Việt</option>
                    <option value="English">English</option>
                  </BeautifulSelect>
                </TenantFormField>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-brand-outline bg-brand-surface-lowest p-3">
                  <Switch
                    checked={formAllowOnlineBooking}
                    onChange={setFormAllowOnlineBooking}
                    disabled={!canUseOnlineBooking}
                    label="Cho phép đặt lịch online"
                  />
                  <span className="text-caption text-brand-text-muted">
                    {canUseOnlineBooking
                      ? 'Bật trang đặt lịch trực tuyến cho tenant.'
                      : `Gói ${formPackage} chưa có quyền đặt lịch online.`}
                  </span>
                </div>

                <Field label="Ghi chú nội bộ" helper="Chỉ Superadmin đọc được.">
                  <textarea
                    rows={3}
                    placeholder="Ghi chú về tenant, chi nhánh, gói dịch vụ hoặc yêu cầu vận hành..."
                    value={formInternalNotes}
                    onChange={(e) => setFormInternalNotes(e.target.value)}
                    className="resize-y py-2"
                  />
                </Field>
              </section>
            </div>

            {/* Bảng điều kiện: nói rõ còn thiếu gì, thay vì để người dùng bấm Lưu rồi tự dò. */}
            <div
              role="status"
              className={`shrink-0 border-t p-4 sm:px-6 ${
                addFormValidation.isValid
                  ? 'border-brand-secondary/25 bg-brand-secondary/10'
                  : 'border-brand-tertiary/25 bg-brand-tertiary/10'
              }`}
            >
              <p className={`font-bold ${addFormValidation.isValid ? 'text-brand-secondary' : 'text-brand-tertiary'}`}>
                {addFormValidation.isValid
                  ? 'Đã đủ điều kiện tạo tenant'
                  : `Còn ${Object.keys(addFormValidation.errors).length} điều kiện chưa đạt`}
              </p>
              {!addFormValidation.isValid && addFormSubmitted && (
                <ul className="mt-2 grid gap-1 text-caption leading-5 text-brand-text-muted sm:grid-cols-2">
                  {Object.values(addFormValidation.errors).map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
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
                    onUpdateTenant(blockedDeleteTarget.tenant.id, { status: 'SUSPENDED' });
                    setBlockedDeleteTarget(null);
                    showToast(`Đã chuyển tenant ${blockedDeleteTarget.tenant.name} sang trạng thái SUSPENDED.`, 'info');
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
              <p className="font-semibold text-brand-text mb-1">💡 Quy trình an toàn để xóa một tenant:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Đóng/chuyển giao và xóa toàn bộ các chi nhánh trực thuộc tenant.</li>
                <li>Giải phóng hoặc điều chuyển toàn bộ nhân sự (số lượng nhân sự về 0).</li>
                <li>Chuyển trạng thái tenant từ <strong>ACTIVE</strong> sang <strong>SUSPENDED</strong> (Khóa tạm thời).</li>
                <li>Xử lý hoàn tất mọi yêu cầu nâng cấp gói dịch vụ liên quan.</li>
              </ol>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL XÁC NHẬN XÓA TENANT VĨNH VIỄN (KHI ĐÃ THỎA MÃN ĐIỀU KIỆN LOGIC) */}
      {confirmDeleteTarget && (
        <Modal
          open
          onClose={() => setConfirmDeleteTarget(null)}
          title="Xác nhận xóa vĩnh viễn Tenant"
          eyebrow="Hành động nguy hiểm — Không thể hoàn tác"
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
                  onDeleteTenant(target.id);
                  setConfirmDeleteTarget(null);
                  showToast(`Tenant ${target.name} (${target.id}) đã được xóa vĩnh viễn khỏi hệ thống.`, 'success');
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Xác nhận xóa vĩnh viễn
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-rose-500/25 bg-rose-50/60 p-3.5 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="font-bold text-rose-800 dark:text-rose-300">⚠️ CẢNH BÁO NGUY HIỂM</p>
              <p className="mt-1 leading-relaxed text-caption">
                Tenant này đã thỏa mãn điều kiện logic để xóa (0 chi nhánh, 0 nhân viên, trạng thái không hoạt động). Tuy nhiên, thao tác xóa sẽ loại bỏ hoàn toàn hồ sơ, tài khoản Tenant Admin và toàn bộ lịch sử thanh toán, audit log liên quan. Thao tác này <strong>KHÔNG THỂ KHÔI PHỤC</strong>.
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
                Tôi hiểu rằng toàn bộ dữ liệu của tenant này sẽ bị xóa sạch và không thể khôi phục.
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
