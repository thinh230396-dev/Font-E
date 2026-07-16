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
} from 'lucide-react';
import { Tenant, TenantStatus, SubscriptionPackage, SubscriptionPackageName, TenantAdminAccount } from '../types';
import TenantDetailModal from './TenantDetailModal';
import { formatMoney } from '../utils/money';
import {
  getSellablePackages,
  getSubscriptionBranchLimit,
  getSubscriptionStaffLimit,
  hasSubscriptionCapability,
  isUnlimitedBranches,
  isUnlimitedStaff
} from '../utils/subscriptions';



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
  showConfirm
}: TenantManagementProps) {

  const selectablePackages = getSellablePackages(packages);
  const defaultPackageName = selectablePackages[0]?.name || packages[0]?.name || 'Basic';
  const packageFilterOptions = Array.from(new Set([
    ...packages.filter((pkg) => (pkg.status || 'ACTIVE') !== 'ARCHIVED').map((pkg) => pkg.name),
    ...tenants.map((tenant) => tenant.packageName)
  ]));

  const uniqueAdmins = tenants.reduce((acc: { id: string; name: string; email: string; username: string; phone: string; tenantCount: number; tenantName: string }[], tenant) => {
    const existing = acc.find(a => a.email.toLowerCase() === tenant.adminEmail.toLowerCase());
    if (existing) {
      existing.tenantCount += 1;
      existing.tenantName = `${existing.tenantName}, ${tenant.name}`;
    } else {
      const fallbackUsername = tenant.adminEmail.split('@')[0] || tenant.adminEmail;
      acc.push({
        id: tenant.tenantAdminId || `ADM-${tenant.id.replace('T-', '')}`,
        name: tenant.adminName,
        email: tenant.adminEmail,
        username: tenant.adminUsername || fallbackUsername,
        phone: tenant.adminPhone || tenant.phone,
        tenantCount: 1,
        tenantName: tenant.name
      });
    }
    return acc;
  }, []);

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
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'date'>('name');

  // Modal / Drawer state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(selectedTenantFromOverview || null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'overview' | 'billing' | 'branches' | 'activities' | 'config'>('overview');
  const [detailInitialViewMode, setDetailInitialViewMode] = useState<'quick' | 'full'>('quick');
  const [showAddForm, setShowAddForm] = useState(false);

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
    packageName: SubscriptionPackageName
  ) => {
    const safeBranchCount = Math.max(1, branchCount);
    const baseStaff = Math.floor(staffCount / safeBranchCount);
    const extraStaff = staffCount % safeBranchCount;

    return Array.from({ length: safeBranchCount }, (_, idx) => {
      const branchNumber = idx + 1;
      const staffForThisBranch = safeBranchCount === 1
        ? staffCount
        : baseStaff + (idx < extraStaff ? 1 : 0);

      return {
        id: `BR-${branchNumber}`,
        name: `${tenantName} - Chi nhánh ${branchNumber === 1 ? 'chính' : branchNumber}`,
        address: branchNumber === 1 ? (mainAddress || 'Chưa cập nhật') : `Chưa cập nhật địa chỉ chi nhánh ${branchNumber}`,
        staffUsed: staffForThisBranch,
        staffLimit: getPackageStaffLimitPerBranch(packageName),
        status: 'ACTIVE' as const,
        staffCount: staffForThisBranch
      };
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

  // Combine parent search query and internal local search
  const effectiveSearch = (searchQuery || internalSearch).toLowerCase();

  // Filter & Sort
  const filtered = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(effectiveSearch) ||
      t.adminEmail.toLowerCase().includes(effectiveSearch) ||
      t.adminName.toLowerCase().includes(effectiveSearch);
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPackage = packageFilter === 'ALL' || t.packageName === packageFilter;

    return matchesSearch && matchesStatus && matchesPackage;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'revenue') return b.monthlyRevenue - a.monthlyRevenue;
    if (sortBy === 'date') return b.createdAt.localeCompare(a.createdAt);
    return 0;
  });

  const totalBranchCount = tenants.reduce((sum, tenant) => sum + getTenantBranchCount(tenant), 0);
  const totalStaffCount = tenants.reduce((sum, tenant) => sum + Number(tenant.staffCount || 0), 0);

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
    if (!formName.trim() || !formTenantCode.trim() || !formAddress.trim() || !formTimezone.trim()) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc (Tên tenant, Mã Tenant, Địa chỉ đại diện, Múi giờ)!');
      return;
    }

    const normalizedTenantCode = formTenantCode.trim().toUpperCase();
    if (tenants.some((tenant) => tenant.id.trim().toLowerCase() === normalizedTenantCode.toLowerCase())) {
      alert(`Mã tenant "${normalizedTenantCode}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    const branchLimit = getPackageBranchLimit(formPackage);
    if (formBranchCount > branchLimit) {
      alert(`Gói ${formPackage} chỉ hỗ trợ tối đa ${getTenantBranchLimitLabel(formPackage)}. Vui lòng giảm số chi nhánh hoặc chọn gói cao hơn.`);
      return;
    }

    const createStaffLimit = getCreateStaffLimit(formPackage, formBranchCount);
    if (!isUnlimitedStaff(createStaffLimit) && Number(formStaff) > createStaffLimit) {
      alert(`Gói ${formPackage} chỉ hỗ trợ tối đa ${createStaffLimit} nhân sự toàn tenant. Vui lòng giảm số lượng nhân sự hoặc chọn gói cao hơn.`);
      return;
    }

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

    if (adminCreationMode === 'existing' && !selectedExistingAdmin) {
      alert('Vui lòng chọn Tenant Admin có sẵn hoặc chuyển sang tạo Tenant Admin mới.');
      return;
    }

    if (!finalAdminName || !finalAdminEmail || !finalAdminPhone || !finalAdminUsername) {
      alert('Vui lòng điền đầy đủ thông tin Tenant Admin chính (Tên, Gmail, SĐT, Username đăng nhập)!');
      return;
    }
    if (finalAdminUsername.includes('@')) {
      alert('Username đăng nhập không dùng định dạng Gmail. Vui lòng nhập username riêng, ví dụ: nguyenvanbay.');
      return;
    }
    const emailExists = uniqueAdmins.some(a => a.email.toLowerCase() === finalAdminEmail.toLowerCase());
    if (emailExists) {
      alert('Gmail của Tenant Admin này đã tồn tại trên hệ thống. Theo logic hiện tại, mỗi Tenant Admin chỉ quản lý 1 tenant.');
      return;
    }
    finalAdminCode = finalAdminCode || generateAdminCode();
    const adminCodeExists = uniqueAdmins.some(a => a.id.toLowerCase() === finalAdminCode.toLowerCase());
    if (adminCreationMode === 'new' && adminCodeExists) {
      alert('Mã Tenant Admin đã tồn tại trên hệ thống!');
      return;
    }
    finalAdminUsername = finalAdminUsername || finalAdminEmail;
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
          formPackage
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
      alert('Email Tenant Admin này đang được dùng ở tenant khác. Theo logic hiện tại, mỗi Tenant Admin chỉ quản lý 1 tenant.');
      return;
    }

    if (editingTenant.packageName !== lockedPackageName) {
      alert('Không thể đổi gói trực tiếp trong form cập nhật thông tin Tenant. Vui lòng dùng chức năng "Nâng/Đổi gói" trong tab Gói & thanh toán để hệ thống kiểm tra điều kiện và tạo hóa đơn.');
      setEditingTenant({ ...editingTenant, packageName: lockedPackageName });
      return;
    }

    const packageLimitIssue = getPackageLimitIssue(editingTenant, lockedPackageName);
    if (packageLimitIssue) {
      alert(`${packageLimitIssue} Vui lòng điều chỉnh số chi nhánh/nhân viên hoặc đổi sang gói phù hợp trước khi lưu.`);
      return;
    }

    const updatedStaffLimit = getPackageStaffLimitPerBranch(lockedPackageName);
    const currentBranches = editingTenant.branches || [];
    const updatedBranches = currentBranches.length > 0 ? currentBranches.map((b, idx) => {
      const staffForThisBranch = idx === currentBranches.length - 1 
        ? Math.max(0, Number(editingTenant.staffCount) - (currentBranches.slice(0, -1).reduce((acc, curr) => acc + (curr.staffUsed || curr.staffCount || 0), 0)))
        : Math.min(updatedStaffLimit, Math.floor(Number(editingTenant.staffCount) / currentBranches.length));
        
      return {
        ...b,
        staffLimit: updatedStaffLimit,
        staffUsed: staffForThisBranch,
        staffCount: staffForThisBranch // maintain backward compatibility
      };
    }) : [
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4">
          <p className="text-[10px] uppercase font-bold text-brand-text-muted">Tổng tenant</p>
          <p className="text-xl font-black text-brand-text mt-1">{tenants.length}</p>
        </div>
        <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4">
          <p className="text-[10px] uppercase font-bold text-brand-text-muted">Tổng chi nhánh</p>
          <p className="text-xl font-black text-brand-text mt-1">{totalBranchCount}</p>
        </div>
        <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4">
          <p className="text-[10px] uppercase font-bold text-brand-text-muted">Tổng nhân sự</p>
          <p className="text-xl font-black text-brand-text mt-1">{totalStaffCount}</p>
        </div>
      </div>

      {duplicateTenantAdminGroups > 0 && (
        <div className="bg-brand-tertiary/10 border border-brand-tertiary/30 rounded-xl px-4 py-3 text-xs text-brand-text flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-brand-tertiary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-brand-text">Có Tenant Admin đang được gắn cho nhiều tenant.</p>
            <p className="text-brand-text-muted mt-0.5">Theo logic hiện tại, mỗi Tenant Admin chỉ nên quản lý 1 tenant. Các dòng bị trùng sẽ được đánh dấu trong bảng để bạn xử lý dữ liệu cũ.</p>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Tìm tenant, Tenant Admin..."
            value={searchQuery ? '' : internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            disabled={!!searchQuery}
            className="w-full bg-brand-surface-lowest border border-brand-outline/45 rounded-lg pl-9 pr-4 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary placeholder:text-brand-text-muted/60 disabled:opacity-50"
          />
          {searchQuery && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-brand-primary bg-brand-primary/10 px-1 py-0.5 rounded">
              Lọc theo Header
            </span>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-brand-text-muted hidden sm:inline">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenantStatus | 'ALL')}
              className="bg-brand-surface-lowest border border-brand-outline/45 rounded-lg px-2.5 py-1 text-[11px] font-medium text-brand-text cursor-pointer focus:outline-none focus:border-brand-primary"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="TRIAL">Dùng thử</option>
              <option value="EXPIRING">Sắp hết hạn</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="SUSPENDED">Tạm ngưng</option>
            </select>
          </div>

          {/* Package Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-brand-text-muted hidden sm:inline">Gói cước:</span>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value as SubscriptionPackageName | 'ALL')}
              className="bg-brand-surface-lowest border border-brand-outline/45 rounded-lg px-2.5 py-1 text-[11px] font-medium text-brand-text cursor-pointer focus:outline-none focus:border-brand-primary"
            >
              <option value="ALL">Tất cả gói</option>
              {packageFilterOptions.map((packageName) => (
                <option key={packageName} value={packageName}>{packageName}</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-brand-text-muted hidden sm:inline">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue' | 'date')}
              className="bg-brand-surface-lowest border border-brand-outline/45 rounded-lg px-2.5 py-1 text-[11px] font-medium text-brand-text cursor-pointer focus:outline-none focus:border-brand-primary"
            >
              <option value="name">Tên tenant</option>
              <option value="revenue">Doanh thu tenant</option>
              <option value="date">Ngày tạo</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Table View */}
      <div className="bg-brand-surface border border-brand-outline/40 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/40 text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                <th className="py-3 px-5">Tenant / Chuỗi tiệm</th>
                <th className="py-3 px-5">Tenant Admin chính</th>
                <th className="py-3 px-5">Gói dịch vụ</th>
                <th className="py-3 px-5">Trạng thái tenant</th>
                <th className="py-3 px-5 text-right">Số chi nhánh</th>
                <th className="py-3 px-5 text-right">Tổng nhân sự</th>
                <th className="py-3 px-5 text-right">Doanh thu toàn tenant</th>
                <th className="py-3 px-5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-brand-outline/25">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-brand-text-muted">
                    Không tìm thấy dữ liệu nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filtered.map((tenant) => {
                  const branchCount = getTenantBranchCount(tenant);
                  const adminTenantCount = tenantAdminUsageByEmail[tenant.adminEmail.trim().toLowerCase()] || 0;

                  return (
                    <tr key={tenant.id} className="hover:bg-brand-surface-high/25 transition-colors group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3 min-w-[230px]">
                          {renderTenantAvatar(tenant)}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-brand-text text-xs truncate">{tenant.name}</span>
                            <span className="text-[9px] text-brand-text-muted/70 font-mono mt-0.5">{tenant.id} • tạo ngày {tenant.createdAt}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col min-w-[180px]">
                          <span className="font-medium text-brand-text">{tenant.adminName}</span>
                          <span className="text-[10px] text-brand-text-muted break-all">{tenant.adminEmail}</span>
                          {adminTenantCount > 1 && (
                            <span
                              title="Tenant Admin này đang được gắn cho nhiều tenant, chưa đúng logic 1 Tenant Admin quản lý 1 tenant."
                              className="mt-1 w-fit rounded-full border border-brand-tertiary/30 bg-brand-tertiary/10 px-2 py-0.5 text-[9px] font-bold text-brand-tertiary"
                            >
                              Trùng admin trên {adminTenantCount} tenant
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md bg-brand-surface-highest border ${
                          tenant.packageName === 'Enterprise' 
                            ? 'border-brand-tertiary/30 text-brand-tertiary' 
                            : tenant.packageName === 'Premium' 
                            ? 'border-brand-secondary/30 text-brand-secondary' 
                            : 'border-brand-primary/30 text-brand-primary'
                        }`}>
                          {tenant.packageName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {getStatusBadge(tenant.status)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-brand-text text-xs">
                        {branchCount} chi nhánh
                      </td>
                      <td className="py-3.5 px-5 text-right font-medium text-brand-text-muted">
                        {tenant.staffCount} nhân sự
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-brand-text text-xs">
                        {formatMoney(tenant.monthlyRevenue, tenant.currency)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openTenantDetail(tenant, 'overview', 'quick')}
                            title="Xem tổng quan tenant"
                            aria-label={`Xem tổng quan tenant ${tenant.name}`}
                            className="w-8 h-8 rounded-lg border border-brand-outline/35 text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface-high transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingTenant(tenant)}
                            title="Sửa hồ sơ tenant và Tenant Admin chính"
                            aria-label={`Sửa hồ sơ tenant ${tenant.name}`}
                            className="w-8 h-8 rounded-lg border border-brand-outline/35 text-brand-text-muted hover:text-brand-secondary hover:bg-brand-surface-high transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {tenant.status === 'SUSPENDED' ? (
                            <button 
                              onClick={() => {
                                showConfirm(
                                  "Mở khóa Tenant",
                                  `Bạn chắc chắn muốn mở khóa Tenant "${tenant.name}"? Tenant Admin và toàn bộ chi nhánh sẽ được truy cập lại hệ thống.`,
                                  () => onUpdateTenant(tenant.id, { status: 'ACTIVE' })
                                );
                              }}
                              title="Mở khóa toàn bộ tenant"
                              aria-label={`Mở khóa tenant ${tenant.name}`}
                              className="w-8 h-8 rounded-lg border border-brand-outline/35 text-brand-text-muted hover:text-emerald-400 hover:bg-brand-surface-high transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                showConfirm(
                                  "Khóa tạm thời Tenant",
                                  `Bạn chắc chắn muốn khóa tạm thời Tenant "${tenant.name}"? Tenant Admin và nhân sự của tất cả chi nhánh sẽ bị chặn truy cập.`,
                                  () => onUpdateTenant(tenant.id, { status: 'SUSPENDED' })
                                );
                              }}
                              title="Khóa tạm thời toàn bộ tenant"
                              aria-label={`Khóa tạm thời tenant ${tenant.name}`}
                              className="w-8 h-8 rounded-lg border border-brand-outline/35 text-brand-text-muted hover:text-brand-error hover:bg-brand-surface-high transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              showConfirm(
                                "Xác nhận xóa Tenant",
                                `Bạn chắc chắn muốn xóa vĩnh viễn Tenant "${tenant.name}"? Toàn bộ chi nhánh, cấu hình, lịch sử thanh toán và tài khoản Tenant Admin của tenant này sẽ bị xóa. Thao tác này KHÔNG THỂ KHÔI PHỤC.`,
                                () => onDeleteTenant(tenant.id)
                              );
                            }}
                            title="Xóa tenant và dữ liệu trực thuộc"
                            aria-label={`Xóa tenant ${tenant.name}`}
                            className="w-8 h-8 rounded-lg border border-brand-outline/35 text-brand-text-muted hover:text-brand-error hover:bg-brand-surface-high transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <form onSubmit={handleEditSubmit} className="bg-brand-surface border border-brand-outline rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/45 flex justify-between items-center">
              <span className="text-sm font-bold text-brand-text">Cập Nhật Thông Tin Tenant</span>
              <button type="button" onClick={() => setEditingTenant(null)} className="text-brand-text-muted hover:text-brand-text p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
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
                  <select 
                    value={editingTenant.status}
                    onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value as TenantStatus })}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="TRIAL">Dùng thử (TRIAL)</option>
                    <option value="EXPIRING">Sắp hết hạn (EXPIRING)</option>
                    <option value="OVERDUE">Quá hạn thanh toán (OVERDUE)</option>
                    <option value="SUSPENDED">Khóa / Tạm ngưng (SUSPENDED)</option>
                  </select>
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
                  <select
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
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Múi giờ</label>
                  <select
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
                  </select>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 bg-brand-surface-high border-t border-brand-outline/40 flex justify-end gap-2">
              <button 
                type="submit" 
                className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cập nhật</span>
              </button>
              <button 
                type="button" 
                onClick={() => setEditingTenant(null)}
                className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text-muted px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <form 
            onSubmit={handleAddSubmit} 
            noValidate
            className="bg-brand-surface border border-brand-outline rounded-2xl w-full max-w-[850px] flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-scaleUp"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/45 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-brand-primary" />
                <span className="text-sm font-bold text-brand-text">Tạo Mới Tenant Hệ Thống</span>
              </div>
              <button 
                type="button" 
                onClick={handleCancelCreate} 
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-highest/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* SECTION 1: THÔNG TIN TENANT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-outline/30">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-[11px]">1</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary">Thông tin tenant / chuỗi tiệm</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên tiệm Nail */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Tên tenant / chuỗi tiệm Nail <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: Blossom Nail & Spa"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>

                  {/* Mã Tenant */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Mã Tenant <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ví dụ: BL-STUDIO-001"
                        value={formTenantCode}
                        onChange={(e) => {
                          setFormTenantCode(e.target.value);
                          setIsCodeManuallyEdited(true);
                        }}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary uppercase"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormTenantCode(generateCodeFromName(formName));
                          setIsCodeManuallyEdited(false);
                        }}
                        title="Tự động tạo mã"
                        className="px-3 py-2 bg-brand-surface-highest hover:bg-brand-surface-highest/80 border border-brand-outline/40 rounded-lg text-xs font-medium text-brand-text-muted hover:text-brand-text transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logo tenant */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Logo tenant</label>
                  <div 
                    onDragOver={handleLogoDragOver}
                    onDrop={handleLogoDrop}
                    className="border-2 border-dashed border-brand-outline/40 hover:border-brand-primary/60 rounded-xl p-4 transition-colors flex flex-col items-center justify-center bg-brand-surface-lowest/50 group cursor-pointer relative"
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {formLogo ? (
                      <div className="flex items-center gap-3 z-10">
                        <img src={formLogo} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border border-brand-outline/45 shadow-sm" referrerPolicy="no-referrer" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-brand-text truncate max-w-[200px]">{formLogoName || 'logo.png'}</p>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormLogo('');
                              setFormLogoName('');
                            }}
                            className="text-[10px] text-brand-primary hover:underline font-medium mt-0.5 cursor-pointer"
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <Upload className="w-6 h-6 text-brand-text-muted/60 group-hover:text-brand-primary transition-colors mx-auto" />
                        <p className="text-xs text-brand-text">Kéo thả logo vào đây hoặc <span className="text-brand-primary font-semibold">chọn từ thiết bị</span></p>
                        <p className="text-[10px] text-brand-text-muted/50">Định dạng hỗ trợ: PNG, JPG, JPEG (Tối đa 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Địa chỉ đại diện */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                    Địa chỉ đại diện / chi nhánh chính <span className="text-brand-primary font-bold">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                    <input 
                      type="text" 
                      placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Số điện thoại tenant */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Số điện thoại tenant</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                      <input 
                        type="text" 
                        placeholder="Ví dụ: +84 28 1234 5678"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  {/* Email liên hệ tenant */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Email liên hệ tenant</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                      <input 
                        type="email" 
                        placeholder="contact@tiemnail.com"
                        value={formSalonEmail}
                        onChange={(e) => setFormSalonEmail(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quốc gia */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Quốc gia</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <select 
                        value={formCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                      >
                        <option value="Vietnam">Vietnam</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                        <option value="Japan">Japan</option>
                        <option value="Korea">Korea</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Múi giờ */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Múi giờ <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <select 
                        value={formTimezone}
                        onChange={(e) => setFormTimezone(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                        required
                      >
                        <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                        <option value="America/Toronto">America/Toronto (GMT-5)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                        <option value="Europe/London">Europe/London (GMT+0)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                        <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
                        <option value="Australia/Sydney">Australia/Sydney (GMT+11)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: OWNER CỦA TENANT */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-outline/30">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-[11px]">2</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary">Tenant Admin chính</h3>
                </div>

                <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/10 p-3 text-xs text-brand-text">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Chọn Tenant Admin chính cho tenant.</p>
                      <p className="text-brand-text-muted mt-0.5">
                        Có thể tạo Tenant Admin mới hoặc gán một Tenant Admin đã tạo trước đó nhưng chưa quản lý tenant nào.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAdminCreationModeChange('new')}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      adminCreationMode === 'new'
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-text ring-1 ring-brand-primary/20'
                        : 'bg-brand-surface-lowest border-brand-outline/35 text-brand-text-muted hover:bg-brand-surface'
                    }`}
                  >
                    <p className="text-xs font-black">Tạo Tenant Admin mới</p>
                    <p className="text-[10px] mt-1">Nhập thông tin admin mới và gửi email kích hoạt.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminCreationModeChange('existing')}
                    disabled={availableTenantAdmins.length === 0}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      availableTenantAdmins.length === 0
                        ? 'bg-brand-surface-lowest border-brand-outline/25 text-brand-text-muted/50 cursor-not-allowed'
                        : adminCreationMode === 'existing'
                        ? 'bg-brand-secondary/10 border-brand-secondary/50 text-brand-text ring-1 ring-brand-secondary/20 cursor-pointer'
                        : 'bg-brand-surface-lowest border-brand-outline/35 text-brand-text-muted hover:bg-brand-surface cursor-pointer'
                    }`}
                  >
                    <p className="text-xs font-black">Dùng Tenant Admin có sẵn</p>
                    <p className="text-[10px] mt-1">
                      {availableTenantAdmins.length > 0
                        ? `${availableTenantAdmins.length} admin chưa gán tenant`
                        : 'Chưa có admin trống để gán'}
                    </p>
                  </button>
                </div>

                {adminCreationMode === 'existing' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Chọn Tenant Admin có sẵn <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <select
                      value={selectedTenantAdminId}
                      onChange={(e) => selectExistingTenantAdmin(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value="">Chọn Tenant Admin chưa gán tenant</option>
                      {availableTenantAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {(admin.adminCode || admin.id)} - {admin.name} - {admin.email}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-brand-text-muted mt-1">
                      Chỉ hiển thị Tenant Admin đã tạo trước đó và chưa quản lý tenant nào.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Mã Tenant Admin
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Shield className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                        <input
                          type="text"
                          placeholder="TA-0000"
                          value={formAdminCode}
                          onChange={(e) => setFormAdminCode(e.target.value)}
                          readOnly={adminCreationMode === 'existing'}
                          className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none ${
                            adminCreationMode === 'existing'
                              ? 'bg-brand-surface border-brand-outline/20 opacity-75'
                              : 'bg-brand-surface-lowest border-brand-outline/40 focus:border-brand-primary'
                          }`}
                        />
                      </div>
                      {adminCreationMode === 'new' && (
                        <button
                          type="button"
                          onClick={() => setFormAdminCode(generateAdminCode())}
                          className="px-3 py-2 bg-brand-surface-highest hover:bg-brand-surface-highest/80 border border-brand-outline/40 rounded-lg text-xs font-semibold text-brand-primary transition-colors shrink-0 cursor-pointer"
                        >
                          Tạo
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Vai trò</label>
                    <div className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs font-bold text-brand-text">
                      Tenant Admin chính
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên admin */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Tên Tenant Admin chính <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                      <input 
                        type="text" 
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={formAdminName}
                        onChange={(e) => setFormAdminName(e.target.value)}
                        className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none ${
                          adminCreationMode === 'existing' 
                            ? 'bg-brand-surface border-brand-outline/20 opacity-75' 
                            : 'bg-brand-surface-lowest border-brand-outline/40 focus:border-brand-primary'
                        }`}
                        required
                        readOnly={adminCreationMode === 'existing'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Gmail Tenant Admin <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                      <input
                        type="email"
                        placeholder="owner@gmail.com"
                        value={formAdminEmail}
                        onChange={(e) => setFormAdminEmail(e.target.value)}
                        readOnly={adminCreationMode === 'existing'}
                        className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none ${
                          adminCreationMode === 'existing'
                            ? 'bg-brand-surface border-brand-outline/20 opacity-75'
                            : 'bg-brand-surface-lowest border-brand-outline/40 focus:border-brand-primary'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Số điện thoại Tenant Admin */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Số điện thoại Tenant Admin <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                      <input 
                        type="text" 
                        placeholder="Ví dụ: 0901 234 567"
                        value={formAdminPhone}
                        onChange={(e) => setFormAdminPhone(e.target.value)}
                        className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none ${
                          adminCreationMode === 'existing' 
                            ? 'bg-brand-surface border-brand-outline/20 opacity-75' 
                            : 'bg-brand-surface-lowest border-brand-outline/40 focus:border-brand-primary'
                        }`}
                        required
                        readOnly={adminCreationMode === 'existing'}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Username đăng nhập */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Username đăng nhập <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                      <input
                        type="text"
                        placeholder="Ví dụ: nguyenvanbay"
                        value={formAdminUsername}
                        onChange={(e) => setFormAdminUsername(e.target.value)}
                        className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none ${
                          adminCreationMode === 'existing'
                            ? 'bg-brand-surface border-brand-outline/20 opacity-75'
                            : 'bg-brand-surface-lowest border-brand-outline/40 focus:border-brand-primary'
                        }`}
                        required
                        readOnly={adminCreationMode === 'existing'}
                      />
                    </div>
                    <span className="text-[10px] text-brand-text-muted/60 mt-1 block">Username dùng để đăng nhập quản trị tenant, không nhập dạng Gmail.</span>
                  </div>

                  {/* Mật khẩu tạm thời */}
                  {adminCreationMode === 'new' && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Mật khẩu tạm thời</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Lock className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                          <input 
                            type="text" 
                            placeholder="Bỏ trống để tự tạo"
                            value={formTempPassword}
                            onChange={(e) => setFormTempPassword(e.target.value)}
                            className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="px-3 py-2 bg-brand-surface-highest hover:bg-brand-surface-highest/80 border border-brand-outline/40 rounded-lg text-xs font-semibold text-brand-primary transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          Tạo ngẫu nhiên
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gửi email kích hoạt */}
                {adminCreationMode === 'new' && (
                  <div className="flex items-center gap-3 bg-brand-surface-lowest/40 border border-brand-outline/30 p-3 rounded-xl">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={formSendActivationEmail}
                        onChange={(e) => setFormSendActivationEmail(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-brand-surface-highest border border-brand-outline/40 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-text-muted peer-checked:after:bg-brand-on-primary after:border-brand-outline/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary" />
                      <span className="ml-3 text-xs font-medium text-brand-text">Gửi email kích hoạt</span>
                    </label>
                    <span className="text-[10px] text-brand-text-muted/60 italic ml-auto hidden sm:inline">Mặc định gửi email hướng dẫn tạo mật khẩu sau khi lưu</span>
                  </div>
                )}
              </div>

              {/* SECTION 3: GÓI ĐĂNG KÝ */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-outline/30">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-[11px]">3</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary">Gói đăng ký</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gói đăng ký ban đầu */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Gói đăng ký ban đầu <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <select 
                        value={formPackage}
                        onChange={(e) => {
                          const nextPackage = e.target.value as SubscriptionPackageName;
                          handleCreatePackageChange(nextPackage);
                        }}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                        required
                      >
                        {selectablePackages.map((pkg) => (
                          <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Chu kỳ thanh toán */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Chu kỳ thanh toán <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <select 
                        value={formBillingCycle}
                        onChange={(e) => setFormBillingCycle(e.target.value as 'Monthly' | 'Yearly')}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                        required
                      >
                        <option value="Monthly">Monthly (Từng tháng)</option>
                        <option value="Yearly">Yearly (Hằng năm - Tiết kiệm 20%)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ngày bắt đầu */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Ngày bắt đầu</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <input 
                        type="date" 
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Ngày hết hạn trial */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Ngày hết hạn trial (Không bắt buộc)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <input 
                        type="date" 
                        value={formTrialEndDate}
                        onChange={(e) => setFormTrialEndDate(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Trạng thái ban đầu */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                    Trạng thái ban đầu <span className="text-brand-primary font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as TenantStatus | 'TRIAL')}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                      required
                    >
                      <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                      <option value="TRIAL">Dùng thử (TRIAL)</option>
                      <option value="SUSPENDED">Khóa / Tạm ngưng (SUSPENDED)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: QUY MÔ & CẤU HÌNH */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-outline/30">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-[11px]">4</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary">Quy mô & cấu hình</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Số chi nhánh ban đầu */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Số chi nhánh ban đầu</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <input 
                        type="number" 
                        min="1"
                        max={getPackageBranchLimit(formPackage)}
                        value={formBranchCount}
                        onChange={(e) => handleCreateBranchCountChange(Number(e.target.value))}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-brand-text-muted/70 mt-1">
                      Gói {formPackage} hỗ trợ tối đa {getTenantBranchLimitLabel(formPackage)}.
                    </p>
                  </div>

                  {/* Số lượng nhân viên */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Tổng nhân sự / thợ toàn tenant</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <input 
                        type="number" 
                        min="0"
                        max={isUnlimitedStaff(getCreateStaffLimit(formPackage, formBranchCount)) ? undefined : getCreateStaffLimit(formPackage, formBranchCount)}
                        value={formStaff}
                        onChange={(e) => {
                          const nextStaff = Math.max(0, Number(e.target.value));
                          const limit = getCreateStaffLimit(formPackage, formBranchCount);
                          setFormStaff(isUnlimitedStaff(limit) ? nextStaff : Math.min(nextStaff, limit));
                        }}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-brand-text-muted/70 mt-1">
                      Gói {formPackage} hỗ trợ tối đa {getCreateStaffLimitLabel(formPackage, formBranchCount)} toàn tenant và {getTenantBranchLimitLabel(formPackage)}.
                    </p>
                  </div>

                  {/* Ước tính doanh thu tháng */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Ước tính doanh thu tháng toàn tenant</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <input 
                        type="number" 
                        min="0"
                        value={formRevenue}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setFormRevenue(nextValue === '' ? '' : Math.max(0, Number(nextValue)));
                        }}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-14 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-[10px] font-bold text-brand-text-muted/60">{formCurrency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Đơn vị tiền tệ */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Đơn vị tiền tệ <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Settings className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <select 
                        value={formCurrency}
                        onChange={(e) => setFormCurrency(e.target.value as 'USD' | 'VND')}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-8 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                        required
                      >
                        <option value="VND">VND (Việt Nam Đồng)</option>
                        <option value="USD">USD (Đô la Mỹ)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Ngôn ngữ mặc định */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                      Ngôn ngữ mặc định <span className="text-brand-primary font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50 pointer-events-none" />
                      <select 
                        value={formDefaultLanguage}
                        onChange={(e) => setFormDefaultLanguage(e.target.value as 'Vietnamese' | 'English')}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-8 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer appearance-none"
                        required
                      >
                        <option value="Vietnamese">Vietnamese (Tiếng Việt)</option>
                        <option value="English">English (Tiếng Anh)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.950l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cho phép booking online */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Booking Online</label>
                  <label className={`flex items-center justify-between gap-4 bg-brand-surface-lowest border border-brand-outline/40 px-4 py-3 rounded-xl select-none ${hasSubscriptionCapability(packages, { packageName: formPackage }, 'online_booking') ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                    <span className="text-xs font-semibold text-brand-text">
                      {hasSubscriptionCapability(packages, { packageName: formPackage }, 'online_booking') ? 'Cho phép Booking Online' : `Gói ${formPackage} chưa có quyền Booking Online`}
                    </span>
                    <span className="relative inline-flex items-center shrink-0">
                      <input 
                        type="checkbox" 
                        checked={formAllowOnlineBooking}
                        onChange={(e) => setFormAllowOnlineBooking(e.target.checked)}
                        disabled={!hasSubscriptionCapability(packages, { packageName: formPackage }, 'online_booking')}
                        className="sr-only peer"
                      />
                      <span className="relative w-10 h-5 bg-brand-surface-highest border border-brand-outline/40 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-text-muted peer-checked:after:bg-brand-on-primary after:border-brand-outline/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary" />
                    </span>
                  </label>
                </div>

                {/* Ghi chú nội bộ */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">Ghi chú nội bộ</label>
                  <textarea 
                    rows={3}
                    placeholder="Nhập ghi chú nội bộ về tenant, chi nhánh, gói dịch vụ hoặc yêu cầu vận hành..."
                    value={formInternalNotes}
                    onChange={(e) => setFormInternalNotes(e.target.value)}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary resize-none"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer (Sticky) */}
            <div className="px-6 py-4 bg-brand-surface-high border-t border-brand-outline/40 flex justify-end gap-2.5 shrink-0">
              <button 
                type="button" 
                onClick={handleCancelCreate}
                className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Tạo tenant</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
