import BeautifulSelect from './BeautifulSelect';
import React, { useState, useEffect } from 'react';
import { 
  Store, 
  X, 
  Plus,
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Users,
  Layers, 
  CreditCard,
  AlertTriangle,
  Globe,
  Clock,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  FileText,
  Key,
  ChevronRight,
  ShieldAlert,
  AlertOctagon,
  ArrowUpRight,
  Sliders,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Save
} from 'lucide-react';
import { Branch, SubscriptionPackage, Tenant, SubscriptionPackageName, TenantStatus } from '../types';
import { BRANCH_MODEL_OPTIONS, getBranchModelLabel, getBranchStatusLabel, normalizeBranch, normalizeTenantBranches } from '../utils/branches';
import { convertMoney, formatMoney, normalizeCurrency } from '../utils/money';
import { inferPaymentGateway } from '../utils/invoicePayments';
import {
  getSellablePackages,
  getSubscriptionBranchLimit,
  getSubscriptionPackage,
  getSubscriptionStaffLimit,
  getSubscriptionPrice,
  getYearlyPackagePrice,
  hasSubscriptionCapability,
  isUnlimitedBranches,
  isUnlimitedStaff
} from '../utils/subscriptions';

interface TenantDetailModalProps {
  tenant: Tenant;
  packages: SubscriptionPackage[];
  onClose: () => void;
  onUpdateTenant: (id: string, updated: Partial<Tenant>) => void;
  onEditClick: () => void;
  initialTab?: 'overview' | 'billing' | 'branches' | 'activities' | 'config';
  initialViewMode?: 'quick' | 'full';
}

interface TenantExtraDetails {
  daysRemaining: number;
  paymentStatus: 'PAID' | 'WARNING' | 'OVERDUE' | 'SUSPENDED' | 'UNPAID' | 'PENDING';
  healthStatus: 'STABLE' | 'WARNING' | 'CRITICAL';
  lastSync: string;
  rating: number;
  bookingChange: number;
  revenueChange: number;
  cancellationRate: number;
  timezone: string;
  country: string;
  currency: 'USD' | 'VND';
  defaultLanguage: 'Vietnamese' | 'English';
  allowOnlineBooking: boolean;
  paymentGatewayConfigured: boolean;
  internalNotes: string;
  branches: Branch[];
  staffList: { id: string; name: string; role: string; bookingsThisMonth: number; status: 'ACTIVE' | 'LEAVE' }[];
  activities: { date: string; user: string; type: string; description: string }[];
  alerts: { id: string; severity: 'info' | 'warning' | 'critical'; message: string; action?: string }[];
}

const getCountryLabel = (country?: string) => {
  switch (country) {
    case 'Vietnam':
      return 'Việt Nam';
    case 'United States':
      return 'Hoa Kỳ';
    case 'Canada':
      return 'Canada';
    case 'Australia':
      return 'Úc';
    case 'Japan':
      return 'Nhật Bản';
    case 'Korea':
      return 'Hàn Quốc';
    default:
      return country || 'Việt Nam';
  }
};

const inferCountryFromTenant = (tenant: Tenant) => {
  if (tenant.country) return tenant.country;
  if (tenant.timezone?.startsWith('Asia/Ho_Chi_Minh') || tenant.currency === 'VND') return 'Vietnam';
  if (tenant.timezone?.startsWith('Australia')) return 'Australia';
  if (tenant.timezone?.startsWith('Asia/Tokyo')) return 'Japan';
  if (tenant.timezone?.startsWith('Asia/Seoul')) return 'Korea';
  if (tenant.timezone?.includes('Toronto')) return 'Canada';
  if (tenant.timezone?.startsWith('America')) return 'United States';
  return 'Vietnam';
};

const getRelativeSyncText = (lastSync?: string) => {
  if (!lastSync) return 'Chưa đồng bộ';

  const syncTime = new Date(lastSync).getTime();
  if (Number.isNaN(syncTime)) return lastSync;

  const diffMs = Date.now() - syncTime;
  if (diffMs < 60 * 1000) return 'Vừa xong';

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;

  return new Date(lastSync).toISOString().slice(0, 10);
};

const getTenantExtraDetails = (tenant: Tenant, packages: SubscriptionPackage[]): TenantExtraDetails => {
  const staffLimit = getSubscriptionStaffLimit(packages, tenant.packageName);
  const inferredCountry = inferCountryFromTenant(tenant);
  const defaultTimezone = inferredCountry === 'Vietnam' ? 'Asia/Ho_Chi_Minh' : 'America/New_York';

  const initialBranches = normalizeTenantBranches(tenant).map((branch) => ({
    ...branch,
    staffLimit: branch.staffLimit || staffLimit
  }));
  
  // Base structures based on standard cases
  const defaults: TenantExtraDetails = {
    daysRemaining: tenant.daysRemaining !== undefined ? tenant.daysRemaining : 18,
    paymentStatus: tenant.paymentStatus !== undefined ? tenant.paymentStatus : 'PAID',
    healthStatus: 'STABLE',
    lastSync: getRelativeSyncText(tenant.lastSync || tenant.createdAt),
    rating: 4.8,
    bookingChange: 12,
    revenueChange: -4,
    cancellationRate: 2.4,
    timezone: tenant.timezone || defaultTimezone,
    country: inferredCountry,
    currency: tenant.currency || (inferredCountry === 'Vietnam' ? 'VND' : 'USD'),
    defaultLanguage: tenant.defaultLanguage || (inferredCountry === 'Vietnam' ? 'Vietnamese' : 'English'),
    allowOnlineBooking: tenant.allowOnlineBooking !== undefined ? tenant.allowOnlineBooking : true,
    paymentGatewayConfigured: tenant.paymentGatewayConfigured !== undefined ? tenant.paymentGatewayConfigured : true,
    internalNotes: tenant.internalNotes || '',
    branches: initialBranches,
    staffList: [
      { id: 'ST-1', name: tenant.adminName, role: 'Chủ tiệm / Quản lý', bookingsThisMonth: 45, status: 'ACTIVE' }
    ],
    activities: [
      ...(tenant.customActivities || []),
      { date: '2026-07-10 09:05', user: tenant.adminName, type: 'login', description: `${tenant.adminName} đăng nhập hệ thống` },
      { date: '2026-07-09 14:20', user: 'Hệ thống', type: 'payment', description: `Gia hạn tự động gói ${tenant.packageName} thành công` }
    ],
    alerts: []
  };

  // Adjustments based on current status & package
  let daysRemaining = tenant.daysRemaining !== undefined ? tenant.daysRemaining : defaults.daysRemaining;
  let paymentStatus = tenant.paymentStatus !== undefined ? tenant.paymentStatus : defaults.paymentStatus;
  let healthStatus = defaults.healthStatus;
  let alertsList: TenantExtraDetails['alerts'] = [];
  
  if (tenant.status === 'ACTIVE') {
    if (tenant.daysRemaining === undefined) {
      daysRemaining = tenant.id === 'T-106' ? 18 : tenant.id === 'T-101' ? 25 : tenant.id === 'T-105' ? 12 : 30;
    }
    if (tenant.paymentStatus === undefined) {
      paymentStatus = 'PAID';
    }
    healthStatus = 'STABLE';
    if (daysRemaining < 20) {
      alertsList.push({ id: 'AL-DYNAMIC-EXP', severity: 'warning', message: `Gói ${tenant.packageName} sắp hết hạn sau ${daysRemaining} ngày.`, action: 'Gia hạn ngay' });
    }
  } else if (tenant.status === 'TRIAL') {
    if (tenant.paymentStatus === undefined) {
      paymentStatus = 'PENDING';
    }
    healthStatus = daysRemaining <= 3 ? 'WARNING' : 'STABLE';
    if (daysRemaining <= 3) {
      alertsList.push({ id: 'AL-DYNAMIC-TRIAL', severity: 'warning', message: `Thời gian dùng thử còn ${Math.max(0, daysRemaining)} ngày.`, action: 'Chọn gói dịch vụ' });
    }
  } else if (tenant.status === 'EXPIRING') {
    if (tenant.daysRemaining === undefined) {
      daysRemaining = 2;
    }
    if (tenant.paymentStatus === undefined) {
      paymentStatus = 'WARNING';
    }
    healthStatus = 'WARNING';
    alertsList.push({ id: 'AL-DYNAMIC-EXP', severity: 'warning', message: `Gói ${tenant.packageName} sắp hết hạn sau ${daysRemaining} ngày.`, action: 'Gia hạn ngay' });
  } else if (tenant.status === 'OVERDUE') {
    if (tenant.daysRemaining === undefined) {
      daysRemaining = -5;
    }
    if (tenant.paymentStatus === undefined) {
      paymentStatus = 'OVERDUE';
    }
    healthStatus = 'CRITICAL';
    alertsList.push({ id: 'AL-DYNAMIC-OVER', severity: 'critical', message: `Hóa đơn gói ${tenant.packageName} quá hạn ${Math.abs(daysRemaining)} ngày.`, action: 'Gửi nhắc nhở khẩn' });
  } else if (tenant.status === 'SUSPENDED') {
    if (tenant.daysRemaining === undefined) {
      daysRemaining = 0;
    }
    if (tenant.paymentStatus === undefined) {
      paymentStatus = 'SUSPENDED';
    }
    healthStatus = 'CRITICAL';
    alertsList.push({ id: 'AL-DYNAMIC-SUSP', severity: 'critical', message: 'Tài khoản đang bị tạm ngưng do khóa hệ thống.', action: 'Mở khóa dịch vụ' });
  }

  if (tenant.id === 'T-101') {
    return {
      ...defaults,
      daysRemaining,
      paymentStatus,
      healthStatus,
      rating: 4.9,
      bookingChange: 15,
      revenueChange: 8,
      cancellationRate: 1.8,
      internalNotes: tenant.internalNotes || 'Tenant vận hành tốt tại khu vực New York.',
      staffList: [
        { id: 'ST-1', name: 'John Doe', role: 'Chủ tiệm', bookingsThisMonth: 95, status: 'ACTIVE' },
        { id: 'ST-2', name: 'Mary Jane', role: 'Kỹ thuật viên chính', bookingsThisMonth: 120, status: 'ACTIVE' },
        { id: 'ST-3', name: 'Linda Carter', role: 'Thợ phụ', bookingsThisMonth: 85, status: 'ACTIVE' }
      ],
      alerts: alertsList
    };
  }

  if (tenant.id === 'T-102') {
    const customAlerts: { id: string; severity: 'info' | 'warning' | 'critical'; message: string; action?: string }[] = [
      ...alertsList,
      { id: 'AL-102-BR', severity: 'warning', message: 'Chi nhánh Santa Monica chưa hoàn tất thiết lập vận hành.', action: 'Liên hệ hỗ trợ' }
    ];
    if (tenant.paymentGatewayConfigured === false || (tenant.paymentGatewayConfigured === undefined && !defaults.paymentGatewayConfigured)) {
      customAlerts.push({ id: 'AL-102-PAY', severity: 'critical', message: 'Tenant chưa cấu hình cổng thanh toán trực tuyến.', action: 'Cấu hình ngay' });
    }
    return {
      ...defaults,
      daysRemaining,
      paymentStatus,
      healthStatus,
      rating: 4.2,
      bookingChange: -5,
      revenueChange: -12,
      cancellationRate: 5.6,
      paymentGatewayConfigured: tenant.paymentGatewayConfigured !== undefined ? tenant.paymentGatewayConfigured : false,
      internalNotes: tenant.internalNotes || 'Tiệm quy mô vừa, chủ tiệm phản hồi đang gặp khó khăn tuyển dụng thợ.',
      staffList: [
        { id: 'ST-1', name: 'Sarah Smith', role: 'Chủ tiệm', bookingsThisMonth: 40, status: 'ACTIVE' }
      ],
      alerts: customAlerts
    };
  }

  if (tenant.id === 'T-103') {
    return {
      ...defaults,
      daysRemaining,
      paymentStatus,
      healthStatus,
      rating: 4.7,
      bookingChange: 18,
      revenueChange: 20,
      cancellationRate: 3.1,
      internalNotes: tenant.internalNotes || 'Lượng booking tăng trưởng mạnh nhưng hóa đơn thanh toán đang bị quá hạn 5 ngày. Cần liên hệ thúc giục.',
      alerts: alertsList
    };
  }

  if (tenant.id === 'T-104') {
    return {
      ...defaults,
      daysRemaining,
      paymentStatus,
      healthStatus,
      rating: 4.0,
      bookingChange: 0,
      revenueChange: 0,
      cancellationRate: 0,
      allowOnlineBooking: tenant.allowOnlineBooking !== undefined ? tenant.allowOnlineBooking : false,
      paymentGatewayConfigured: tenant.paymentGatewayConfigured !== undefined ? tenant.paymentGatewayConfigured : false,
      internalNotes: tenant.internalNotes || 'Hệ thống đã khóa do tạm ngưng hoạt động / chưa gia hạn cước trong thời gian dài.',
      staffList: [],
      alerts: alertsList
    };
  }

  if (tenant.id === 'T-106') {
    return {
      ...defaults,
      daysRemaining,
      paymentStatus,
      healthStatus,
      rating: 4.8,
      bookingChange: 12,
      revenueChange: -4,
      cancellationRate: 2.4,
      internalNotes: tenant.internalNotes || 'Tiệm vận hành ổn định, lượng khách đều. Đang chạy chiến dịch khuyến mãi hè.',
      staffList: [
        { id: 'ST-1', name: 'David Bell', role: 'Quản lý / Kỹ thuật viên chính', bookingsThisMonth: 82, status: 'ACTIVE' },
        { id: 'ST-2', name: 'Anna Nguyễn', role: 'Kỹ thuật viên cao cấp', bookingsThisMonth: 75, status: 'ACTIVE' },
        { id: 'ST-3', name: 'Lisa Trần', role: 'Kỹ thuật viên', bookingsThisMonth: 64, status: 'ACTIVE' },
        { id: 'ST-4', name: 'Kevin Lê', role: 'Thợ phụ', bookingsThisMonth: 45, status: 'ACTIVE' }
      ],
      activities: [
        { date: '2026-07-10 09:05', user: 'David Bell', type: 'login', description: 'David Bell (Admin) đăng nhập vào hệ thống từ thiết bị mới' },
        { date: '2026-07-09 14:20', user: 'Hệ thống', type: 'payment', description: 'Đã thanh toán tự động hóa đơn Premium tháng 7' },
        { date: '2026-07-06 16:15', user: 'David Bell', type: 'config', description: 'Cập nhật cấu hình cổng thanh toán trực tuyến' },
        { date: '2026-07-05 10:00', user: 'Superadmin', type: 'config', description: 'Superadmin cập nhật cấu hình ngôn ngữ của tenant' }
      ],
      alerts: alertsList
    };
  }

  // Fallback
  return {
    ...defaults,
    daysRemaining,
    paymentStatus,
    healthStatus,
    alerts: alertsList
  };
};

const getRenewPrice = (
  packages: SubscriptionPackage[],
  tenant: Tenant,
  duration: '1_month' | '3_months' | '6_months' | '1_year',
  targetCurrency: 'USD' | 'VND'
) => {
  const pkg = getSubscriptionPackage(packages, tenant.packageName);
  const sourceCurrency = tenant.subscriptionCurrency || pkg?.currency || 'USD';
  const lockedPrice = tenant.subscriptionPrice;
  const monthlyBase = lockedPrice !== undefined
    ? (tenant.billingCycle === 'yearly' ? lockedPrice / 12 : lockedPrice)
    : (pkg?.price ?? 0);
  const amount = duration === '1_year'
    ? (lockedPrice !== undefined && tenant.billingCycle === 'yearly'
        ? lockedPrice
        : (pkg ? getYearlyPackagePrice(pkg) : monthlyBase * 12))
    : monthlyBase * (duration === '3_months' ? 3 : duration === '6_months' ? 6 : 1);
  return convertMoney(amount, sourceCurrency, targetCurrency);
};

const getPackageChangeBlockReason = (
  tenant: Tenant,
  packageName: SubscriptionPackageName,
  packages: SubscriptionPackage[]
) => {
  const branchCount = tenant.branches?.length || 1;
  const branchLimit = getSubscriptionBranchLimit(packages, packageName);
  if (branchCount > branchLimit) {
    return `Gói ${packageName} chỉ hỗ trợ tối đa ${branchLimit === 99 ? 'không giới hạn' : branchLimit} chi nhánh, tenant hiện có ${branchCount} chi nhánh.`;
  }

  const maxStaff = getSubscriptionStaffLimit(packages, packageName);
  if (!isUnlimitedStaff(maxStaff) && Number(tenant.staffCount) > maxStaff) {
    return `Gói ${packageName} chỉ hỗ trợ tối đa ${maxStaff} nhân viên toàn tenant, tenant hiện có ${tenant.staffCount} nhân viên.`;
  }

  return null;
};

const getExpirationDateStr = (days: number) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10).split('-').reverse().join('/'); // Format: DD/MM/YYYY
};

const getExpirationDateIso = (days: number) => {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const getTenantInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TN';
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};

const isCollectedPaymentStatus = (status: string) => status === 'paid' || status === 'auto';
const isManualPaymentMethod = (method: string) => method === 'cash' || method === 'other';
const isPaymentEntryValid = (status: string, method: string, transactionCode: string) => (
  !isCollectedPaymentStatus(status) || isManualPaymentMethod(method) || Boolean(transactionCode.trim())
);

export default function TenantDetailModal({
  tenant,
  packages,
  onClose,
  onUpdateTenant,
  onEditClick,
  initialTab = 'overview',
  initialViewMode = 'quick'
}: TenantDetailModalProps) {
  const [viewMode, setViewMode] = useState<'quick' | 'full'>(initialViewMode);
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'branches' | 'activities' | 'config'>(initialTab);
  
  // Modals inside the Detail View
  const [confirmAction, setConfirmAction] = useState<{ 
    type: 'lock' | 'unlock' | 'renew' | 'change-plan' | 'branch-status' | 'delete-branch'; 
    message: string; 
    payload?: any 
  } | null>(null);
  
  const [showSendNotification, setShowSendNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  
  const [toast, setToast] = useState<string | null>(null);

  // System logs/activities localized state
  const [localActivities, setLocalActivities] = useState<any[]>([]);

  // Change/Upgrade Plan modal states
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPackageName>(tenant.packageName);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [effectiveDate, setEffectiveDate] = useState<'immediate' | 'next_cycle'>('immediate');
  const [paymentStatusOption, setPaymentStatusOption] = useState<'paid' | 'unpaid' | 'auto' | 'invoice'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('bank_transfer');
  const [transactionId, setTransactionId] = useState('');

  // Renew Plan modal states
  const [showRenewPlanModal, setShowRenewPlanModal] = useState(false);
  const [renewDuration, setRenewDuration] = useState<'1_month' | '3_months' | '6_months' | '1_year'>('1_month');
  const [renewPaymentStatus, setRenewPaymentStatus] = useState<'paid' | 'unpaid' | 'auto' | 'invoice'>('paid');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('bank_transfer');
  const [renewTransactionId, setRenewTransactionId] = useState('');
  const [renewNote, setRenewNote] = useState('');

  // Add branch modal states
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchModel, setNewBranchModel] = useState<NonNullable<Branch['model']>>('FULL_SERVICE');
  const [newBranchIsPrimary, setNewBranchIsPrimary] = useState(false);
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchOpeningHours, setNewBranchOpeningHours] = useState('08:00–21:00');
  const [newBranchStationCount, setNewBranchStationCount] = useState(8);
  const [newBranchStatus, setNewBranchStatus] = useState<Branch['status']>('ACTIVE');
  const [newBranchStaffCount, setNewBranchStaffCount] = useState(0);

  // Local configs that can be updated in real-time
  const [allowOnlineBooking, setAllowOnlineBooking] = useState(tenant.allowOnlineBooking !== undefined ? tenant.allowOnlineBooking : true);
  const [currency, setCurrency] = useState<'USD' | 'VND'>(tenant.currency || 'VND');
  const [defaultLanguage, setDefaultLanguage] = useState<'Vietnamese' | 'English'>(tenant.defaultLanguage || 'Vietnamese');
  const [internalNotes, setInternalNotes] = useState(tenant.internalNotes || '');
  const [paymentGatewayConfigured, setPaymentGatewayConfigured] = useState(tenant.paymentGatewayConfigured !== undefined ? tenant.paymentGatewayConfigured : true);

  const details = getTenantExtraDetails(tenant, packages);
  const selectablePackages = getSellablePackages(packages, tenant.packageName);
  const selectedPlanBlockReason = selectedPlan === tenant.packageName ? null : getPackageChangeBlockReason(tenant, selectedPlan, packages);
  const currentBranchLimit = getSubscriptionBranchLimit(packages, tenant.packageName);
  const currentBranchLimitLabel = isUnlimitedBranches(currentBranchLimit) ? 'Không giới hạn' : `${currentBranchLimit} chi nhánh`;
  const currentStaffLimit = getSubscriptionStaffLimit(packages, tenant.packageName);
  const currentStaffLimitLabel = isUnlimitedStaff(currentStaffLimit) ? 'Không giới hạn' : `${currentStaffLimit} thợ`;
  const canAddBranch = details.branches.length < currentBranchLimit;
  const supportsOnlineBooking = hasSubscriptionCapability(packages, tenant, 'online_booking');

  useEffect(() => {
    setViewMode(initialViewMode);
    setActiveTab(initialTab);
  }, [tenant.id, initialTab, initialViewMode]);

  // Compute staff quota from branches dynamically
  const totalStaffUsed = details.branches.reduce((acc, br) => acc + br.staffUsed, 0);
  const totalStaffLimit = currentStaffLimit;
  const totalStaffLimitDisplay = isUnlimitedStaff(totalStaffLimit) ? 'Không giới hạn' : totalStaffLimit;
  const remainingStaffCapacity = isUnlimitedStaff(currentStaffLimit) ? 999 : Math.max(0, currentStaffLimit - totalStaffUsed);

  // Sync state if tenant updates from outside or when tab changes
  useEffect(() => {
    setAllowOnlineBooking(supportsOnlineBooking && (tenant.allowOnlineBooking !== undefined ? tenant.allowOnlineBooking : true));
    setCurrency(tenant.currency || 'VND');
    setDefaultLanguage(tenant.defaultLanguage || 'Vietnamese');
    setInternalNotes(tenant.internalNotes || '');
    setPaymentGatewayConfigured(tenant.paymentGatewayConfigured !== undefined ? tenant.paymentGatewayConfigured : true);
    
    // Sync system logs
    setLocalActivities(details.activities);
    // Sync default plan choice
    setSelectedPlan(tenant.packageName);
  }, [tenant, supportsOnlineBooking]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const resetAddBranchForm = () => {
    setNewBranchCode('');
    setNewBranchName('');
    setNewBranchModel('FULL_SERVICE');
    setNewBranchIsPrimary(false);
    setNewBranchAddress('');
    setNewBranchManager('');
    setNewBranchPhone('');
    setNewBranchEmail('');
    setNewBranchOpeningHours('08:00–21:00');
    setNewBranchStationCount(8);
    setNewBranchStatus('ACTIVE');
    setNewBranchStaffCount(0);
  };

  const handleOpenAddBranchModal = () => {
    if (!canAddBranch) {
      alert(`Gói ${tenant.packageName} chỉ hỗ trợ tối đa ${currentBranchLimitLabel}. Vui lòng nâng gói trước khi thêm chi nhánh mới.`);
      return;
    }

    const nextBranchNumber = details.branches.length + 1;
    setNewBranchCode(`BR-${nextBranchNumber}`);
    setNewBranchName(`${tenant.name} - Chi nhánh ${nextBranchNumber}`);
    setNewBranchModel('FULL_SERVICE');
    setNewBranchIsPrimary(false);
    setNewBranchAddress('');
    setNewBranchManager('');
    setNewBranchPhone('');
    setNewBranchEmail('');
    setNewBranchOpeningHours('08:00–21:00');
    setNewBranchStationCount(8);
    setNewBranchStatus('ACTIVE');
    setNewBranchStaffCount(0);
    setShowAddBranchModal(true);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canAddBranch) {
      alert(`Gói ${tenant.packageName} chỉ hỗ trợ tối đa ${currentBranchLimitLabel}. Vui lòng nâng gói trước khi thêm chi nhánh mới.`);
      return;
    }

    const branchCode = newBranchCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const branchName = newBranchName.trim();
    const branchAddress = newBranchAddress.trim();
    const staffCount = Math.max(0, Number(newBranchStaffCount || 0));

    if (!branchCode || !branchName || !branchAddress) {
      alert('Vui lòng nhập đầy đủ mã, tên và địa chỉ chi nhánh.');
      return;
    }

    if (details.branches.some((branch) => branch.id.toUpperCase() === branchCode || branch.code?.toUpperCase() === branchCode)) {
      alert(`Mã chi nhánh ${branchCode} đã tồn tại trong tenant này.`);
      return;
    }

    if (currentStaffLimit < 999 && staffCount > currentStaffLimit) {
      alert(`Gói ${tenant.packageName} chỉ hỗ trợ tối đa ${currentStaffLimit} thợ toàn tenant.`);
      return;
    }

    const existingBranches = (tenant.branches && tenant.branches.length > 0 ? tenant.branches : details.branches)
      .map((branch, index) => normalizeBranch(branch, tenant, index))
      .map((branch) => newBranchIsPrimary ? { ...branch, isPrimary: false } : branch);

    const existingStaffCount = existingBranches.reduce((sum, branch) => sum + Number(branch.staffUsed || branch.staffCount || 0), 0);
    if (currentStaffLimit < 999 && existingStaffCount + staffCount > currentStaffLimit) {
      alert(`Gói ${tenant.packageName} chỉ hỗ trợ tối đa ${currentStaffLimit} thợ toàn tenant. Tenant hiện có ${existingStaffCount} thợ, chi nhánh mới chỉ có thể thêm tối đa ${Math.max(0, currentStaffLimit - existingStaffCount)} thợ.`);
      return;
    }

    const newBranch = normalizeBranch({
      id: branchCode,
      code: branchCode,
      name: branchName,
      address: branchAddress,
      model: newBranchModel,
      isPrimary: newBranchIsPrimary,
      managerName: newBranchManager.trim() || 'Chưa phân công',
      phone: newBranchPhone.trim() || 'Chưa cập nhật',
      email: newBranchEmail.trim(),
      timezone: tenant.timezone || 'Asia/Ho_Chi_Minh',
      openingHours: newBranchOpeningHours.trim() || '08:00–21:00',
      stationCount: Math.max(1, Number(newBranchStationCount || 1)),
      staffCapacity: Math.max(staffCount, Number(newBranchStationCount || 1)),
      staffUsed: staffCount,
      staffLimit: currentStaffLimit,
      status: newBranchStatus,
      staffCount,
      monthlyRevenue: 0,
      capacityPercent: 0,
      services: newBranchModel === 'EXPRESS_KIOSK'
        ? ['Sơn gel nhanh', 'Manicure cơ bản']
        : ['Manicure', 'Pedicure', 'Sơn Gel', 'Nail Art']
    }, tenant, existingBranches.length);

    const updatedBranches = [...existingBranches, newBranch];
    const updatedStaffCount = updatedBranches.reduce((sum, branch) => sum + Number(branch.staffUsed || branch.staffCount || 0), 0);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newActivity = {
      date: nowStr,
      user: 'Superadmin',
      type: 'branch',
      description: `Thêm chi nhánh "${branchName}" vào tenant ${tenant.name}. Nhân sự ban đầu: ${staffCount}.`
    };

    onUpdateTenant(tenant.id, {
      branches: updatedBranches,
      staffCount: updatedStaffCount,
      customActivities: [newActivity, ...(tenant.customActivities || [])]
    });

    setLocalActivities(prev => [newActivity, ...prev]);
    resetAddBranchForm();
    setShowAddBranchModal(false);
    triggerToast(`Đã thêm chi nhánh "${branchName}" cho tenant ${tenant.name}.`);
  };

  const handleToggleBranchStatus = (branchId: string, nextStatus: 'ACTIVE' | 'INACTIVE') => {
    const sourceBranches = (tenant.branches && tenant.branches.length > 0 ? tenant.branches : details.branches);
    const targetBranch = sourceBranches.find(branch => branch.id === branchId);

    if (!targetBranch) {
      alert('Không tìm thấy chi nhánh cần cập nhật.');
      return;
    }

    const updatedBranches = sourceBranches.map(branch => ({
      ...branch,
      status: branch.id === branchId ? nextStatus : branch.status,
      staffCount: branch.staffCount ?? branch.staffUsed
    }));

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const isLocking = nextStatus === 'INACTIVE';
    const newActivity = {
      date: nowStr,
      user: 'Superadmin',
      type: 'branch',
      description: `${isLocking ? 'Khóa tạm thời' : 'Mở lại'} chi nhánh "${targetBranch.name}" của tenant ${tenant.name}.`
    };

    onUpdateTenant(tenant.id, {
      branches: updatedBranches,
      customActivities: [newActivity, ...(tenant.customActivities || [])]
    });

    setLocalActivities(prev => [newActivity, ...prev]);
    triggerToast(`${isLocking ? 'Đã khóa tạm thời' : 'Đã mở lại'} chi nhánh "${targetBranch.name}".`);
  };

  const handleDeleteBranch = (branchId: string) => {
    const sourceBranches = (tenant.branches && tenant.branches.length > 0 ? tenant.branches : details.branches);
    const targetBranch = sourceBranches.find(branch => branch.id === branchId);

    if (!targetBranch) {
      alert('Không tìm thấy chi nhánh cần xóa.');
      return;
    }

    if (sourceBranches.length <= 1) {
      alert('Không thể xóa chi nhánh cuối cùng. Tenant cần ít nhất 1 chi nhánh đại diện.');
      return;
    }

    const updatedBranches = sourceBranches
      .filter(branch => branch.id !== branchId)
      .map(branch => ({
        ...branch,
        staffCount: branch.staffCount ?? branch.staffUsed
      }));

    const updatedStaffCount = updatedBranches.reduce((sum, branch) => sum + Number(branch.staffUsed || branch.staffCount || 0), 0);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newActivity = {
      date: nowStr,
      user: 'Superadmin',
      type: 'branch',
      description: `Xóa chi nhánh "${targetBranch.name}" khỏi tenant ${tenant.name}.`
    };

    onUpdateTenant(tenant.id, {
      branches: updatedBranches,
      staffCount: updatedStaffCount,
      customActivities: [newActivity, ...(tenant.customActivities || [])]
    });

    setLocalActivities(prev => [newActivity, ...prev]);
    triggerToast(`Đã xóa chi nhánh "${targetBranch.name}".`);
  };

  // Execute confirmation action
  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const { type, payload } = confirmAction;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    if (type === 'lock') {
      const newActivity = { date: nowStr, user: 'Superadmin', type: 'status', description: 'Superadmin đã tạm khóa hoạt động của tenant' };
      onUpdateTenant(tenant.id, {
        status: 'SUSPENDED',
        customActivities: [newActivity, ...(tenant.customActivities || [])]
      });
      setLocalActivities(prev => [
        newActivity,
        ...prev
      ]);
      triggerToast("Đã tạm khóa tenant thành công!");
    } else if (type === 'unlock') {
      const newActivity = { date: nowStr, user: 'Superadmin', type: 'status', description: 'Superadmin đã kích hoạt lại hoạt động cho tenant' };
      onUpdateTenant(tenant.id, {
        status: 'ACTIVE',
        customActivities: [newActivity, ...(tenant.customActivities || [])]
      });
      setLocalActivities(prev => [
        newActivity,
        ...prev
      ]);
      triggerToast("Đã kích hoạt hoạt động cho tenant!");
    } else if (type === 'renew') {
      if (payload) {
        const { duration, paymentStatus: rPayStatus, paymentMethod: rPayMethod, transactionId: rTxId, note: rNote } = payload;
        
        let addedDays = 30;
        let durationText = '1 tháng';
        if (duration === '3_months') { addedDays = 90; durationText = '3 tháng'; }
        else if (duration === '6_months') { addedDays = 180; durationText = '6 tháng'; }
        else if (duration === '1_year') { addedDays = 365; durationText = '1 năm'; }

        const currentDaysRemaining = tenant.daysRemaining !== undefined ? tenant.daysRemaining : details.daysRemaining;
        const newDaysRemaining = currentDaysRemaining + addedDays;

        const renewCurrency = normalizeCurrency(tenant.currency);
        const renewAmount = getRenewPrice(packages, tenant, duration, renewCurrency);

        const updatedFields: any = {
          daysRemaining: newDaysRemaining,
          subscriptionRenewsAt: getExpirationDateIso(newDaysRemaining),
        };

        let invoiceStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED' = 'PENDING';
        if (rPayStatus === 'paid' || rPayStatus === 'auto') {
          invoiceStatus = 'PAID';
          updatedFields.paymentStatus = 'PAID';
          if (tenant.status === 'OVERDUE' || tenant.status === 'EXPIRING' || tenant.status === 'SUSPENDED') {
            updatedFields.status = 'ACTIVE';
          }
        } else if (rPayStatus === 'unpaid') {
          invoiceStatus = 'OVERDUE';
          updatedFields.paymentStatus = 'OVERDUE';
          updatedFields.status = 'OVERDUE';
        } else {
          invoiceStatus = 'PENDING';
          updatedFields.paymentStatus = 'PENDING';
        }

        const invId = `INV-REN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const methodText = rPayMethod === 'bank_transfer' ? 'Chuyển khoản' : rPayMethod === 'cash' ? 'Tiền mặt' : rPayMethod === 'card' ? 'Thẻ' : 'Khác';

        const newInvoice = {
          id: invId,
          invoiceCode: invId,
          type: 'RENEWAL',
          tenantId: tenant.id,
          tenantName: tenant.name,
          planName: tenant.packageName,
          packageId: tenant.subscriptionPackageId || getSubscriptionPackage(packages, tenant.packageName)?.id,
          packageVersion: tenant.subscriptionPackageVersion || getSubscriptionPackage(packages, tenant.packageName)?.version || 1,
          billingCycle: tenant.billingCycle || 'monthly',
          servicePeriod: `Gia hạn ${durationText} (Đến ${getExpirationDateStr(newDaysRemaining)})`,
          dueDate: getExpirationDateIso(newDaysRemaining),
          amount: renewAmount,
          currency: renewCurrency,
          status: invoiceStatus === 'PAID' ? 'Đã thanh toán' : (invoiceStatus === 'OVERDUE' ? 'Quá hạn' : 'Đang chờ'),
          paymentMethod: methodText,
          paymentGateway: inferPaymentGateway(methodText),
          transactionCode: rTxId.trim() || undefined,
          processingFee: 0,
          netReceived: invoiceStatus === 'PAID' ? renewAmount : undefined,
          paymentAttempts: invoiceStatus === 'PAID' ? [{
            id: `PAY-${Date.now()}`,
            attemptedAt: new Date().toISOString(),
            status: 'SUCCESS',
            gateway: inferPaymentGateway(methodText) || 'MANUAL',
            amount: renewAmount,
            transactionCode: rTxId.trim() || undefined
          }] : [],
          note: rNote.trim() || undefined,
          createdAt: new Date().toISOString().slice(0, 10),
          paidAt: invoiceStatus === 'PAID' ? new Date().toISOString().slice(0, 10) : undefined,
          // Compatibility fields
          period: `Gia hạn ${durationText} (Đến ${getExpirationDateStr(newDaysRemaining)})`,
          packageName: tenant.packageName,
          duration: durationText,
          notes: rNote.trim() || undefined
        };

        const currentInvoices = tenant.customInvoices || [];
        updatedFields.customInvoices = [newInvoice, ...currentInvoices];

        const statusText = invoiceStatus === 'PAID' ? 'Đã thanh toán' : (invoiceStatus === 'OVERDUE' ? 'Quá hạn' : 'Đang chờ');
        const txnInfo = rTxId.trim() ? ` (Mã GD: ${rTxId.trim()})` : '';
        const noteInfo = rNote.trim() ? ` - Ghi chú: ${rNote.trim()}` : '';

        const newActivity = {
          date: nowStr,
          user: 'Superadmin',
          type: 'payment',
          description: `Gia hạn gói ${tenant.packageName} thêm ${durationText}. Trạng thái: ${statusText} qua ${methodText}${txnInfo}${noteInfo}. Hạn mới: ${getExpirationDateStr(newDaysRemaining)}.`
        };

        const currentActivities = tenant.customActivities || [];
        updatedFields.customActivities = [newActivity, ...currentActivities];

        onUpdateTenant(tenant.id, updatedFields);

        setLocalActivities(prev => [
          newActivity,
          ...prev
        ]);

        triggerToast(`Đã gia hạn thành công gói cước ${tenant.packageName} thêm ${durationText}!`);
      } else {
        setLocalActivities(prev => [
          { date: nowStr, user: 'Superadmin', type: 'payment', description: `Superadmin gia hạn thủ công gói cước ${tenant.packageName} thêm 30 ngày` },
          ...prev
        ]);
        triggerToast(`Đã gia hạn gói dịch vụ ${tenant.packageName} thêm 30 ngày thành công!`);
      }
    } else if (type === 'change-plan') {
      if (payload) {
        const packageBlockReason = getPackageChangeBlockReason(tenant, payload, packages);
        if (packageBlockReason) {
          alert(packageBlockReason);
          setConfirmAction(null);
          return;
        }

        const nextPackage = getSubscriptionPackage(packages, payload);
        const changeCurrency = normalizeCurrency(tenant.currency);
        const selectedPrice = nextPackage
          ? (billingCycle === 'yearly' ? getYearlyPackagePrice(nextPackage) : nextPackage.price)
          : getSubscriptionPrice(packages, payload, billingCycle).price;
        const changeAmount = convertMoney(
          selectedPrice,
          nextPackage?.currency || 'USD',
          changeCurrency
        );
        const invId = `INV-CHG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const durationText = billingCycle === 'yearly' ? '1 năm' : '1 tháng';
        const methodText = paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : paymentMethod === 'cash' ? 'Tiền mặt' : paymentMethod === 'card' ? 'Thẻ' : 'Khác';

        let invoiceStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED' = 'PENDING';
        if (paymentStatusOption === 'paid' || paymentStatusOption === 'auto') {
          invoiceStatus = 'PAID';
        } else {
          invoiceStatus = 'PENDING';
        }

        const remainingDays = billingCycle === 'yearly' ? 365 : 30;

        const updatedFields: any = {
          packageName: payload,
          plan: payload,
          subscriptionPlan: payload,
          billingCycle: billingCycle,
          effectiveDate: effectiveDate,
          planStartDate: new Date().toISOString().slice(0, 10),
          daysRemaining: remainingDays,
          paymentStatus: invoiceStatus,
          subscriptionPackageId: nextPackage?.id,
          subscriptionPackageVersion: nextPackage?.version || 1,
          subscriptionPrice: selectedPrice,
          subscriptionCurrency: nextPackage?.currency || 'USD',
          subscriptionStartedAt: new Date().toISOString().slice(0, 10),
          subscriptionRenewsAt: getExpirationDateIso(remainingDays),
          allowOnlineBooking: hasSubscriptionCapability(packages, { packageName: payload, subscriptionPackageId: nextPackage?.id }, 'online_booking')
            ? tenant.allowOnlineBooking
            : false,
        };

        if (invoiceStatus === 'PAID') {
          updatedFields.status = 'ACTIVE';
        }

        const newInvoice = {
          id: invId,
          invoiceCode: invId,
          tenantId: tenant.id,
          tenantName: tenant.name,
          type: 'PLAN_CHANGE',
          planName: payload,
          packageId: nextPackage?.id,
          packageVersion: nextPackage?.version || 1,
          billingCycle: billingCycle,
          servicePeriod: `Đổi gói sang ${payload} (${durationText})`,
          dueDate: getExpirationDateIso(remainingDays),
          amount: changeAmount,
          currency: changeCurrency,
          status: invoiceStatus === 'PAID' ? 'Đã thanh toán' : 'Đang chờ',
          paymentMethod: methodText,
          paymentGateway: inferPaymentGateway(methodText),
          transactionCode: transactionId.trim() || undefined,
          processingFee: 0,
          netReceived: invoiceStatus === 'PAID' ? changeAmount : undefined,
          paymentAttempts: invoiceStatus === 'PAID' ? [{
            id: `PAY-${Date.now()}`,
            attemptedAt: new Date().toISOString(),
            status: 'SUCCESS',
            gateway: inferPaymentGateway(methodText) || 'MANUAL',
            amount: changeAmount,
            transactionCode: transactionId.trim() || undefined
          }] : [],
          note: `Đổi gói dịch vụ từ ${tenant.packageName} sang ${payload}`,
          createdAt: new Date().toISOString().slice(0, 10),
          paidAt: invoiceStatus === 'PAID' ? new Date().toISOString().slice(0, 10) : undefined,
          // Compatibility fields
          period: `Đổi gói sang ${payload} (${durationText})`,
          packageName: payload,
          notes: `Đổi gói dịch vụ từ ${tenant.packageName} sang ${payload}`
        };

        const currentInvoices = tenant.customInvoices || [];
        updatedFields.customInvoices = [newInvoice, ...currentInvoices];

        const sText = invoiceStatus === 'PAID' ? 'Đã thanh toán' : 'Đang chờ thanh toán';
        const txnInfo = transactionId.trim() ? ` (Mã GD: ${transactionId.trim()})` : '';

        const newActivity = {
          date: nowStr,
          user: 'Superadmin',
          type: 'payment',
          description: `Đổi gói sang ${payload} (${durationText}). Trạng thái: ${sText} qua ${methodText}${txnInfo}.`
        };

        const currentActivities = tenant.customActivities || [];
        updatedFields.customActivities = [newActivity, ...currentActivities];

        onUpdateTenant(tenant.id, updatedFields);

        setLocalActivities(prev => [
          newActivity,
          ...prev
        ]);

        triggerToast(`Đã chuyển đổi thành công sang gói ${payload}!`);
      }
    } else if (type === 'branch-status') {
      if (payload?.branchId && payload?.nextStatus) {
        handleToggleBranchStatus(payload.branchId, payload.nextStatus);
      }
    } else if (type === 'delete-branch') {
      if (payload?.branchId) {
        handleDeleteBranch(payload.branchId);
      }
    }

    setConfirmAction(null);
  };

  // Safe helper to render statuses
  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Hoạt động</span>;
      case 'TRIAL':
        return <span className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Dùng thử</span>;
      case 'EXPIRING':
        return <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Sắp hết hạn</span>;
      case 'OVERDUE':
        return <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Quá hạn thanh toán</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Bị khóa</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-brand-outline/20 text-brand-text-muted border border-brand-outline px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const getHealthBadge = (health: 'STABLE' | 'WARNING' | 'CRITICAL') => {
    switch (health) {
      case 'STABLE':
        return <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Ổn định (Stable)</span>;
      case 'WARNING':
        return <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>Cần chú ý</span>;
      case 'CRITICAL':
        return <span className="inline-flex items-center gap-1.5 text-red-400 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Rủi ro cao (Critical)</span>;
    }
  };

  const getPaymentStatusText = (payment: any) => {
    switch (payment) {
      case 'PAID': return 'Thanh toán đúng hạn';
      case 'WARNING': return 'Sắp đến hạn thanh toán';
      case 'PENDING': return 'Đang chờ thanh toán';
      case 'UNPAID': return 'Chưa thanh toán';
      case 'OVERDUE': return 'Quá hạn thanh toán';
      case 'SUSPENDED': return 'Dịch vụ đang tạm ngưng';
      case 'CANCELLED': return 'Thanh toán đã hủy';
      default: return 'Thanh toán đúng hạn';
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    const normStatus = status?.toUpperCase();
    if (normStatus === 'PAID' || status === 'Đã thanh toán' || status === 'Đã thu tiền' || status === 'Thu tự động thành công') {
      return <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Đã thanh toán</span>;
    }
    if (normStatus === 'PENDING' || status === 'Chờ thanh toán' || status === 'Chưa thu tiền' || normStatus === 'UNPAID' || status === 'Đang chờ') {
      return <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/15 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Đang chờ</span>;
    }
    if (normStatus === 'OVERDUE' || status === 'Quá hạn' || status === 'Quá hạn thanh toán') {
      return <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Quá hạn</span>;
    }
    if (normStatus === 'CANCELLED' || status === 'Đã hủy') {
      return <span className="inline-flex items-center gap-1 bg-brand-outline/20 text-brand-text-muted border border-brand-outline/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Đã hủy</span>;
    }
    return <span className="inline-flex items-center gap-1 bg-brand-outline/20 text-brand-text-muted border border-brand-outline/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">{status}</span>;
  };

  // Simulated Save Config Handler
  const handleSaveConfig = () => {
    onUpdateTenant(tenant.id, {
      allowOnlineBooking: supportsOnlineBooking ? allowOnlineBooking : false,
      currency,
      defaultLanguage,
      internalNotes,
      paymentGatewayConfigured
    });
    triggerToast("Đã lưu cấu hình Tenant thành công!");
  };

  return (
    <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] bg-brand-surface-high border-2 border-brand-primary text-brand-text px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slideIn">
          <CheckCircle className="w-5 h-5 text-brand-primary" />
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}

      {/* Dynamic Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] bg-brand-bg/95 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-brand-surface border border-brand-outline rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-brand-surface-high border-b border-brand-outline/40 flex items-center gap-2 text-brand-warning">
              <AlertOctagon className="w-5 h-5" />
              <span className="text-sm font-bold text-brand-text">Xác nhận tác vụ hệ thống</span>
            </div>
            <div className="p-5 text-xs text-brand-text space-y-3">
              <p>{confirmAction.message}</p>
              
              {confirmAction.type === 'lock' && (
                <div className="p-2.5 bg-brand-error/10 border border-brand-error/20 rounded-lg text-brand-error text-[11px] font-medium leading-relaxed">
                  Lưu ý: Thao tác này sẽ tạm dừng mọi cổng đăng nhập của thợ, chặn đặt lịch của khách hàng và khóa toàn bộ tài nguyên lưu trữ của tenant cho đến khi được mở khóa lại.
                </div>
              )}

              {confirmAction.type === 'branch-status' && (
                <div className="p-2.5 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-brand-text text-[11px] font-medium leading-relaxed">
                  Thao tác này chỉ áp dụng cho chi nhánh được chọn. Tenant và các chi nhánh khác vẫn hoạt động bình thường.
                </div>
              )}

              {confirmAction.type === 'delete-branch' && (
                <div className="p-2.5 bg-brand-error/10 border border-brand-error/20 rounded-lg text-brand-error text-[11px] font-medium leading-relaxed">
                  Thao tác này sẽ xóa chi nhánh khỏi tenant và cập nhật lại tổng nhân sự, tổng khách hàng. Tenant vẫn được giữ lại, nhưng dữ liệu chi nhánh đã xóa sẽ không còn trong danh sách.
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 bg-brand-surface-high border-t border-brand-outline/30 flex justify-end gap-2">
              <button 
                onClick={() => setConfirmAction(null)}
                className="bg-brand-surface hover:bg-brand-surface-highest text-brand-text-muted px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmAction}
                className="bg-brand-primary hover:bg-brand-primary/95 text-brand-on-primary px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Xác nhận thực hiện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal Overlay */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-[60] bg-brand-bg/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-brand-surface border border-brand-outline rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/40 flex justify-between items-center">
              <div className="flex items-center gap-2 text-brand-primary">
                <Sliders className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-bold text-brand-text">Nâng cấp & Thay đổi gói cước</span>
              </div>
              <button 
                onClick={() => setShowChangePlanModal(false)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-high transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-brand-text">
              {/* Note / Tenant Info */}
              <div className="bg-brand-surface-high/40 border border-brand-outline/10 p-3 rounded-xl flex justify-between items-center gap-3">
                <div>
                  <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Đang thao tác cho Tenant</span>
                  <strong className="text-sm text-brand-text font-black">{tenant.name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Gói hiện tại</span>
                  <span className="inline-flex items-center gap-1.5 bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25 px-2.5 py-0.5 rounded-full font-bold uppercase mt-0.5">
                    {tenant.packageName}
                  </span>
                </div>
              </div>

              {/* Package Selection Cards */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted block">Chọn gói dịch vụ mới</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectablePackages.map((packageOption) => {
                    const pkg = packageOption.name;
                    const isSelected = selectedPlan === pkg;
                    const priceFormatted = formatMoney(
                      convertMoney(packageOption.price, packageOption.currency, tenant.currency),
                      tenant.currency
                    );
                    const blockReason = pkg === tenant.packageName ? null : getPackageChangeBlockReason(tenant, pkg, packages);
                    
                    return (
                      <button
                        key={pkg}
                        type="button"
                        disabled={!!blockReason}
                        title={blockReason || `Chọn gói ${pkg}`}
                        onClick={() => setSelectedPlan(pkg)}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between min-h-36 transition-all ${blockReason ? 'bg-brand-surface-lowest border-brand-outline/25 text-brand-text-muted opacity-60 cursor-not-allowed' : isSelected ? 'bg-brand-primary/10 border-brand-primary text-brand-text shadow-sm ring-1 ring-brand-primary/20 cursor-pointer' : 'bg-brand-surface hover:bg-brand-surface-high border-brand-outline/40 text-brand-text-muted cursor-pointer'}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className={`text-xs font-black uppercase ${isSelected ? 'text-brand-primary' : 'text-brand-text-muted'}`}>{pkg}</span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-brand-primary" />}
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-black text-brand-text">
                            {priceFormatted}<span className="text-[10px] font-medium text-brand-text-muted">/tháng</span>
                          </p>
                          <p className="text-[10px] mt-1 leading-relaxed text-brand-text-muted">
                            {isUnlimitedStaff(packageOption.maxStaff) ? 'Không giới hạn thợ' : `Tối đa ${packageOption.maxStaff} thợ`}, {' '}
                            {isUnlimitedBranches(packageOption.maxSalons) ? 'không giới hạn chi nhánh.' : `${packageOption.maxSalons} chi nhánh.`}
                          </p>
                          {blockReason && (
                            <p className="text-[9px] mt-1 leading-snug text-brand-error font-semibold">Không đủ điều kiện</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedPlanBlockReason && (
                <div className="flex items-start gap-2 rounded-xl border border-brand-error/25 bg-brand-error/10 px-3 py-2.5 text-xs text-brand-error">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{selectedPlanBlockReason}</span>
                </div>
              )}

              {/* Cycle & Effective Date Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billing Cycle */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted block">Chu kỳ thanh toán</label>
                  <div className="grid grid-cols-2 gap-2 bg-brand-surface-high p-1 rounded-xl border border-brand-outline/20">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${billingCycle === 'monthly' ? 'bg-brand-surface text-brand-text shadow-sm border border-brand-outline/30' : 'text-brand-text-muted hover:text-brand-text'}`}
                    >
                      Hàng tháng
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${billingCycle === 'yearly' ? 'bg-brand-surface text-brand-text shadow-sm border border-brand-outline/30' : 'text-brand-text-muted hover:text-brand-text'}`}
                    >
                      Hàng năm (-20%)
                    </button>
                  </div>
                </div>

                {/* Effective Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted block">Thời điểm áp dụng</label>
                  <div className="grid grid-cols-2 gap-2 bg-brand-surface-high p-1 rounded-xl border border-brand-outline/20">
                    <button
                      type="button"
                      onClick={() => setEffectiveDate('immediate')}
                      className={`py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${effectiveDate === 'immediate' ? 'bg-brand-surface text-brand-text shadow-sm border border-brand-outline/30' : 'text-brand-text-muted hover:text-brand-text'}`}
                    >
                      Áp dụng ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setEffectiveDate('next_cycle')}
                      className={`py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${effectiveDate === 'next_cycle' ? 'bg-brand-surface text-brand-text shadow-sm border border-brand-outline/30' : 'text-brand-text-muted hover:text-brand-text'}`}
                    >
                      Kỳ tiếp theo
                    </button>
                  </div>
                </div>
              </div>

              {/* Administrative Payment Details section */}
              <div className="border-t border-brand-outline/25 pt-4 space-y-4">
                <h5 className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted">Chi tiết giao dịch & kế toán (Chỉ Superadmin)</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Status Option */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-text-muted block">Trạng thái thanh toán của Tenant</label>
                    <BeautifulSelect
                      value={paymentStatusOption}
                      onChange={(e: any) => {
                        setPaymentStatusOption(e.target.value);
                        if (e.target.value === 'auto') setPaymentMethod('card');
                      }}
                      className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-brand-text cursor-pointer"
                    >
                      <option value="paid">Đã thanh toán đầy đủ</option>
                      <option value="unpaid">Chưa chi trả / Ghi nợ</option>
                      <option value="auto">Trừ thẻ tự động thành công</option>
                      <option value="invoice">Đã phát hành hóa đơn chờ</option>
                    </BeautifulSelect>
                  </div>

                  {/* Payment Method Option */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-text-muted block">Phương thức chi trả</label>
                    <BeautifulSelect
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      disabled={paymentStatusOption === 'auto'}
                      className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-brand-text cursor-pointer"
                    >
                      <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                      <option value="cash">Tiền mặt thủ công</option>
                      <option value="card">Thẻ tín dụng / Stripe</option>
                      <option value="other">Phương thức khác</option>
                    </BeautifulSelect>
                  </div>
                </div>

                {/* Transaction ID Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-text-muted block">Mã giao dịch {isCollectedPaymentStatus(paymentStatusOption) && !isManualPaymentMethod(paymentMethod) ? '*' : '(không bắt buộc)'}</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={isManualPaymentMethod(paymentMethod) ? 'Không yêu cầu với tiền mặt/ghi nhận thủ công' : 'Ví dụ: TXN-STRIPE-890472390'}
                    className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand-primary text-brand-text placeholder-brand-text-muted/60"
                  />
                  {!isPaymentEntryValid(paymentStatusOption, paymentMethod, transactionId) && <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Thanh toán điện tử bắt buộc phải có mã giao dịch.</p>}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-brand-surface-high border-t border-brand-outline/40 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowChangePlanModal(false)}
                className="bg-brand-surface hover:bg-brand-surface-highest text-brand-text-muted px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-brand-outline/35"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                disabled={selectedPlan === tenant.packageName || !!selectedPlanBlockReason || !isPaymentEntryValid(paymentStatusOption, paymentMethod, transactionId)}
                onClick={() => {
                  if (selectedPlanBlockReason) {
                    alert(selectedPlanBlockReason);
                    return;
                  }
                  if (!isPaymentEntryValid(paymentStatusOption, paymentMethod, transactionId)) {
                    alert('Vui lòng nhập mã giao dịch cho phương thức thanh toán điện tử.');
                    return;
                  }

                  setShowChangePlanModal(false);
                  
                  // Construct a descriptive system message including selected cycle/payment details
                  const cycleText = billingCycle === 'yearly' ? 'Hàng năm (Giảm 20%)' : 'Hàng tháng';
                  const dateText = effectiveDate === 'immediate' ? 'áp dụng ngay lập tức' : 'áp dụng từ chu kỳ tiếp theo';
                  const methodText = paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : paymentMethod === 'cash' ? 'Tiền mặt' : paymentMethod === 'card' ? 'Thẻ' : 'Khác';
                  const statusText = paymentStatusOption === 'paid' ? 'Đã thanh toán' : paymentStatusOption === 'unpaid' ? 'Chưa thanh toán' : paymentStatusOption === 'auto' ? 'Trừ thẻ tự động' : 'Đã ra hóa đơn chờ';
                  const txnInfo = transactionId.trim() ? ` (Mã GD: ${transactionId.trim()})` : '';

                  setConfirmAction({
                    type: 'change-plan',
                    message: `Bạn chắc chắn muốn thay đổi gói dịch vụ của Tenant "${tenant.name}" từ gói "${tenant.packageName}" sang gói "${selectedPlan}"? \n\n• Hình thức chu kỳ: ${cycleText}\n• Thời gian hiệu lực: ${dateText}\n• Trạng thái chi trả: ${statusText} qua ${methodText}${txnInfo}.`,
                    payload: selectedPlan
                  });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedPlan === tenant.packageName || selectedPlanBlockReason || !isPaymentEntryValid(paymentStatusOption, paymentMethod, transactionId) ? 'bg-brand-outline text-brand-text-muted cursor-not-allowed' : 'bg-brand-primary text-brand-on-primary hover:bg-brand-primary/95 shadow-md cursor-pointer'}`}
              >
                Áp dụng đổi gói
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Plan Modal Overlay */}
      {showRenewPlanModal && (
        <div className="fixed inset-0 z-[60] bg-brand-bg/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-brand-surface border border-brand-outline rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/40 flex justify-between items-center">
              <div className="flex items-center gap-2 text-brand-primary">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-sm font-bold text-brand-text">Gia hạn gói dịch vụ</span>
              </div>
              <button 
                onClick={() => setShowRenewPlanModal(false)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-high transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-brand-text">
              {/* Tenant and Subscription Summary */}
              <div className="bg-brand-surface-high/40 border border-brand-outline/15 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-brand-text-muted uppercase font-bold block mb-0.5">Tenant / chuỗi tiệm vận hành</span>
                  <strong className="text-sm text-brand-text font-black block">{tenant.name}</strong>
                  <span className="text-[10px] text-brand-text-muted font-mono mt-0.5 block">{tenant.id} • {tenant.adminName}</span>
                </div>
                <div className="md:border-l md:border-brand-outline/25 md:pl-4 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Gói dịch vụ:</span>
                    <span className="inline-flex items-center gap-1 bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25 px-2 py-0.5 rounded-full font-bold uppercase text-[10px]">
                      {tenant.packageName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Chu kỳ thanh toán:</span>
                    <span className="font-bold text-brand-text text-[11px]">
                      {tenant.billingCycle === 'yearly' ? 'Hàng năm (Yearly)' : 'Hàng tháng (Monthly)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Ngày hết hạn hiện tại:</span>
                    <span className="font-bold text-brand-text text-[11px]">
                      {getExpirationDateStr(tenant.daysRemaining !== undefined ? tenant.daysRemaining : details.daysRemaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duration Options Selector */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted block">Chọn thời gian gia hạn</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['1_month', '3_months', '6_months', '1_year'] as const).map((duration) => {
                    const isSelected = renewDuration === duration;
                    const targetCurrency = normalizeCurrency(tenant.currency);
                    const price = getRenewPrice(packages, tenant, duration, targetCurrency);
                    const priceFormatted = formatMoney(price, targetCurrency);
                    
                    let durationLabel = '1 tháng';
                    let bonusLabel = '';
                    let addedDaysCount = 30;
                    if (duration === '3_months') { durationLabel = '3 tháng'; addedDaysCount = 90; }
                    else if (duration === '6_months') { durationLabel = '6 tháng'; addedDaysCount = 180; }
                    else if (duration === '1_year') { durationLabel = '1 năm (12 tháng)'; bonusLabel = 'Tiết kiệm 20%'; addedDaysCount = 365; }

                    const currentDaysRemaining = tenant.daysRemaining !== undefined ? tenant.daysRemaining : details.daysRemaining;
                    const calculatedNewDate = getExpirationDateStr(currentDaysRemaining + addedDaysCount);

                    return (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => setRenewDuration(duration)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-28 cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'bg-brand-primary/10 border-brand-primary text-brand-text ring-1 ring-brand-primary/20' : 'bg-brand-surface hover:bg-brand-surface-high border-brand-outline/45 text-brand-text-muted'}`}
                      >
                        {bonusLabel && (
                          <span className="absolute top-0 right-0 bg-brand-primary text-brand-on-primary font-black text-[8px] uppercase tracking-wide px-2 py-0.5 rounded-bl-lg">
                            {bonusLabel}
                          </span>
                        )}
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[11px] font-black uppercase ${isSelected ? 'text-brand-primary' : 'text-brand-text-muted'}`}>{durationLabel}</span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-brand-primary" />}
                        </div>
                        <div className="mt-2.5">
                          <p className="text-sm font-black text-brand-text">{priceFormatted}</p>
                          <p className="text-[10px] text-brand-text-muted mt-1">Hạn mới: {calculatedNewDate}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pricing breakdown section */}
              <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center font-bold text-xs pb-2 border-b border-brand-outline/25">
                  <span className="text-brand-text-muted">Tổng cộng thanh toán:</span>
                  <span className="text-sm text-brand-primary font-black">
                    {formatMoney(
                      getRenewPrice(packages, tenant, renewDuration, normalizeCurrency(tenant.currency)),
                      normalizeCurrency(tenant.currency)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-brand-text-muted">
                  <span>Hình thức:</span>
                  <span className="font-semibold text-brand-text">Gia hạn gói cước</span>
                </div>
                <div className="flex justify-between text-[10px] text-brand-text-muted">
                  <span>Hạn sử dụng mới:</span>
                  <span className="font-semibold text-brand-text text-brand-secondary">
                    {getExpirationDateStr(
                      (tenant.daysRemaining !== undefined ? tenant.daysRemaining : details.daysRemaining) + 
                      (renewDuration === '1_month' ? 30 : renewDuration === '3_months' ? 90 : renewDuration === '6_months' ? 180 : 365)
                    )}
                  </span>
                </div>
              </div>

              {/* Administrative Payment Details section */}
              <div className="border-t border-brand-outline/25 pt-4 space-y-4">
                <h5 className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted">Chi tiết giao dịch & ghi nhận (Chỉ Superadmin)</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Status Option */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-text-muted block">Trạng thái thu tiền</label>
                    <BeautifulSelect
                      value={renewPaymentStatus}
                      onChange={(e: any) => {
                        setRenewPaymentStatus(e.target.value);
                        if (e.target.value === 'auto') setRenewPaymentMethod('card');
                      }}
                      className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-brand-text cursor-pointer"
                    >
                      <option value="paid">Đã thu tiền (Thành công)</option>
                      <option value="unpaid">Chưa thu tiền (Ghi nợ)</option>
                      <option value="auto">Thu tự động (Qua thẻ liên kết)</option>
                      <option value="invoice">Gửi invoice cho tenant thanh toán sau</option>
                    </BeautifulSelect>
                  </div>

                  {/* Payment Method Option */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-text-muted block">Phương thức thanh toán</label>
                    <BeautifulSelect
                      value={renewPaymentMethod}
                      onChange={(e: any) => setRenewPaymentMethod(e.target.value)}
                      disabled={renewPaymentStatus === 'auto'}
                      className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-brand-text cursor-pointer"
                    >
                      <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                      <option value="cash">Tiền mặt thủ công</option>
                      <option value="card">Thẻ tín dụng / Stripe</option>
                      <option value="other">Phương thức khác</option>
                    </BeautifulSelect>
                  </div>
                </div>

                {/* Transaction ID Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-text-muted block">Mã giao dịch {isCollectedPaymentStatus(renewPaymentStatus) && !isManualPaymentMethod(renewPaymentMethod) ? '*' : '(không bắt buộc)'}</label>
                  <input
                    type="text"
                    value={renewTransactionId}
                    onChange={(e) => setRenewTransactionId(e.target.value)}
                    placeholder={isManualPaymentMethod(renewPaymentMethod) ? 'Không yêu cầu với tiền mặt/ghi nhận thủ công' : 'Ví dụ: TXN-REN-BANK-890472390'}
                    className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand-primary text-brand-text placeholder-brand-text-muted/60"
                  />
                  {!isPaymentEntryValid(renewPaymentStatus, renewPaymentMethod, renewTransactionId) && <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Thanh toán điện tử bắt buộc phải có mã giao dịch.</p>}
                </div>

                {/* Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-text-muted block">Ghi chú gia hạn</label>
                  <textarea
                    value={renewNote}
                    onChange={(e) => setRenewNote(e.target.value)}
                    placeholder="Ví dụ: Thỏa thuận gia hạn, đối soát đặc biệt..."
                    rows={2}
                    className="w-full bg-brand-surface-high border border-brand-outline/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-brand-text placeholder-brand-text-muted/60 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-brand-surface-high border-t border-brand-outline/40 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowRenewPlanModal(false)}
                className="bg-brand-surface hover:bg-brand-surface-highest text-brand-text-muted px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-brand-outline/35"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                disabled={!isPaymentEntryValid(renewPaymentStatus, renewPaymentMethod, renewTransactionId)}
                onClick={() => {
                  if (!isPaymentEntryValid(renewPaymentStatus, renewPaymentMethod, renewTransactionId)) {
                    alert('Vui lòng nhập mã giao dịch cho phương thức thanh toán điện tử.');
                    return;
                  }
                  setShowRenewPlanModal(false);
                  
                  let durationText = '1 tháng';
                  let addedDays = 30;
                  if (renewDuration === '3_months') { durationText = '3 tháng'; addedDays = 90; }
                  else if (renewDuration === '6_months') { durationText = '6 tháng'; addedDays = 180; }
                  else if (renewDuration === '1_year') { durationText = '1 năm'; addedDays = 365; }

                  const currentDaysRemaining = tenant.daysRemaining !== undefined ? tenant.daysRemaining : details.daysRemaining;
                  const newDaysRemaining = currentDaysRemaining + addedDays;
                  const newExpDateStr = getExpirationDateStr(newDaysRemaining);

                  const targetCurrency = normalizeCurrency(tenant.currency);
                  const price = getRenewPrice(packages, tenant, renewDuration, targetCurrency);
                  const amountFormatted = formatMoney(price, targetCurrency);

                  const methodText = renewPaymentMethod === 'bank_transfer' ? 'Chuyển khoản' : renewPaymentMethod === 'cash' ? 'Tiền mặt' : renewPaymentMethod === 'card' ? 'Thẻ' : 'Khác';
                  const statusText = renewPaymentStatus === 'paid' ? 'Đã thu tiền' : renewPaymentStatus === 'unpaid' ? 'Chưa thu tiền' : renewPaymentStatus === 'auto' ? 'Thu tự động thành công' : 'Gia hạn & gửi invoice chờ';
                  const txnInfo = renewTransactionId.trim() ? ` (Mã GD: ${renewTransactionId.trim()})` : '';

                  setConfirmAction({
                    type: 'renew',
                    message: `Bạn chắc chắn muốn gia hạn gói dịch vụ "${tenant.packageName}" của Tenant "${tenant.name}" thêm ${durationText}?\n\n• Ngày hết hạn mới: ${newExpDateStr}\n• Số tiền cần thu: ${amountFormatted}\n• Trạng thái chi trả: ${statusText} qua ${methodText}${txnInfo}.`,
                    payload: {
                      duration: renewDuration,
                      paymentStatus: renewPaymentStatus,
                      paymentMethod: renewPaymentMethod,
                      transactionId: renewTransactionId,
                      note: renewNote
                    }
                  });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isPaymentEntryValid(renewPaymentStatus, renewPaymentMethod, renewTransactionId) ? 'bg-brand-primary text-brand-on-primary hover:bg-brand-primary/95 shadow-md cursor-pointer' : 'bg-brand-outline text-brand-text-muted cursor-not-allowed'}`}
              >
                Áp dụng gia hạn
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddBranchModal && (
        <div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleAddBranch} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-2xl">
            <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/45 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-brand-primary" />
                <span className="text-sm font-bold text-brand-text">Thêm chi nhánh cho tenant</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetAddBranchForm();
                  setShowAddBranchModal(false);
                }}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-highest/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6">
              <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/10 p-3 text-xs">
                <p className="font-bold text-brand-text">{tenant.name}</p>
                <p className="text-brand-text-muted mt-0.5">
                  Gói {tenant.packageName}: đang dùng {details.branches.length} chi nhánh, giới hạn {currentBranchLimitLabel}. Giới hạn nhân sự toàn tenant: {currentStaffLimitLabel}.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Mã chi nhánh <span className="font-bold text-brand-primary">*</span></label>
                  <input type="text" value={newBranchCode} onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())} placeholder="Ví dụ: BR-Q3" className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs uppercase text-brand-text focus:border-brand-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Mô hình kinh doanh <span className="font-bold text-brand-primary">*</span></label>
                  <BeautifulSelect value={newBranchModel} onChange={(e) => setNewBranchModel(e.target.value as NonNullable<Branch['model']>)} className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none">
                    {BRANCH_MODEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </BeautifulSelect>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-outline/35 bg-brand-surface-lowest p-3">
                  <input type="checkbox" checked={newBranchIsPrimary} onChange={(e) => setNewBranchIsPrimary(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-primary" />
                  <span><span className="block text-xs font-bold text-brand-text">Đặt làm chi nhánh chính</span><span className="mt-1 block text-[10px] leading-4 text-brand-text-muted">Chi nhánh chính là địa điểm đại diện tenant. Mỗi tenant chỉ có một chi nhánh chính.</span></span>
                </label>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Trạng thái khởi tạo</label>
                  <BeautifulSelect value={newBranchStatus} onChange={(e) => setNewBranchStatus(e.target.value as Branch['status'])} className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none">
                    <option value="ACTIVE">Đang hoạt động</option><option value="PLANNING">Chuẩn bị mở</option><option value="INACTIVE">Tạm ngưng</option>
                  </BeautifulSelect>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                  Tên chi nhánh <span className="text-brand-primary font-bold">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Ví dụ: Queen Nail - Chi nhánh Quận 7"
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Quản lý phụ trách</label><input type="text" value={newBranchManager} onChange={(e) => setNewBranchManager(e.target.value)} placeholder="Họ tên quản lý chi nhánh" className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none" /></div>
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Số điện thoại chi nhánh</label><input type="text" value={newBranchPhone} onChange={(e) => setNewBranchPhone(e.target.value)} placeholder="028 xxxx xxxx" className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none" /></div>
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Email chi nhánh</label><input type="email" value={newBranchEmail} onChange={(e) => setNewBranchEmail(e.target.value)} placeholder="branch@salon.vn" className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none" /></div>
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Giờ hoạt động</label><input type="text" value={newBranchOpeningHours} onChange={(e) => setNewBranchOpeningHours(e.target.value)} placeholder="08:00–21:00" className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none" /></div>
              </div>

              <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3 text-[10px] leading-4 text-brand-text-muted"><strong className="text-brand-text">{getBranchModelLabel(newBranchModel)}:</strong> {BRANCH_MODEL_OPTIONS.find((option) => option.value === newBranchModel)?.description}</div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Số vị trí phục vụ</label><input type="number" min="1" value={newBranchStationCount} onChange={(e) => setNewBranchStationCount(Math.max(1, Number(e.target.value)))} className="w-full rounded-lg border border-brand-outline/40 bg-brand-surface-lowest px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none" /></div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                  Địa chỉ chi nhánh <span className="text-brand-primary font-bold">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                  <input
                    type="text"
                    value={newBranchAddress}
                    onChange={(e) => setNewBranchAddress(e.target.value)}
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted mb-1.5">
                  Nhân sự / thợ ban đầu
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-muted/50" />
                  <input
                    type="number"
                    min="0"
                    max={isUnlimitedStaff(currentStaffLimit) ? undefined : remainingStaffCapacity}
                    value={newBranchStaffCount}
                    onChange={(e) => {
                      const nextStaff = Math.max(0, Number(e.target.value));
                      setNewBranchStaffCount(isUnlimitedStaff(currentStaffLimit) ? nextStaff : Math.min(nextStaff, remainingStaffCapacity));
                    }}
                    className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <p className="text-[10px] text-brand-text-muted/70 mt-1">
                  Có thể để 0 nếu chi nhánh mới chưa phân bổ nhân sự.
                </p>
              </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-brand-surface-high border-t border-brand-outline/40 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  resetAddBranchForm();
                  setShowAddBranchModal(false);
                }}
                className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Thêm chi nhánh</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Container */}
      <div className={`bg-brand-surface border border-brand-outline rounded-3xl w-full overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${viewMode === 'full' ? 'max-w-6xl h-[90vh]' : 'max-w-xl h-auto max-h-[85vh]'}`}>
        
        {/* Header (Static) */}
        <div className="px-6 py-4 bg-brand-surface-high border-b border-brand-outline/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4 items-center">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={`Ảnh đại diện ${tenant.name}`}
                className="w-12 h-12 rounded-2xl object-cover border border-brand-outline/45 bg-brand-surface shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/25 text-sm font-black">
                {getTenantInitials(tenant.name)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-brand-text tracking-tight">{tenant.name}</h3>
                <span className="text-[10px] text-brand-text-muted font-mono bg-brand-surface px-2 py-0.5 rounded border border-brand-outline/40">{tenant.id}</span>
                {getStatusBadge(tenant.status)}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-brand-text-muted flex-wrap">
                <span className="font-semibold text-brand-secondary">Gói {tenant.packageName}</span>
                <span>•</span>
                {details.daysRemaining > 0 ? (
                  <span>Còn <strong className="text-brand-text font-bold">{details.daysRemaining} ngày</strong></span>
                ) : (
                  <span className="text-brand-error font-bold">Hết hạn {Math.abs(details.daysRemaining)} ngày</span>
                )}
                <span>•</span>
                <span className="text-brand-text font-semibold">{getPaymentStatusText(details.paymentStatus)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-brand-outline/10">
            {/* View Mode Switcher */}
            <div className="bg-brand-surface p-1 rounded-xl border border-brand-outline/30 flex items-center gap-0.5 text-xs">
              <button 
                onClick={() => setViewMode('quick')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${viewMode === 'quick' ? 'bg-brand-primary/15 text-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
              >
                Xem nhanh
              </button>
              <button 
                onClick={() => setViewMode('full')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${viewMode === 'full' ? 'bg-brand-primary/15 text-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
              >
                Xem đầy đủ
              </button>
            </div>

            <button 
              onClick={onClose}
              className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-xl bg-brand-surface hover:bg-brand-surface-high border border-brand-outline/30 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Info Summary strip (Static in full mode) */}
        <div className="bg-brand-surface-high/60 border-b border-brand-outline/20 px-6 py-2 flex flex-wrap justify-between items-center gap-2 text-[11px] text-brand-text-muted">
          <div className="flex items-center gap-4">
            {getHealthBadge(details.healthStatus)}
            <span>Lần đồng bộ gần nhất: <strong className="text-brand-text font-mono">{details.lastSync}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-brand-primary/90 font-mono font-medium">
            <Globe className="w-3.5 h-3.5" />
            <span title={details.timezone}>{getCountryLabel(details.country)}</span>
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {viewMode === 'quick' ? (
              // QUICK VIEW MODE (Compact Info Card Layout)
              <div className="space-y-6">
                
                {/* Physical Contact Details */}
                <div className="bg-brand-surface-high/30 border border-brand-outline/20 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    Thông tin tenant & địa chỉ đại diện
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-brand-text-muted text-[10px]">Địa chỉ đại diện / chi nhánh chính</span>
                      <p className="text-brand-text font-semibold leading-relaxed">{tenant.address}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-brand-text-muted text-[10px]">Số điện thoại tenant</span>
                      <p className="text-brand-text font-semibold">{tenant.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-brand-text-muted text-[10px]">Email nhận hóa đơn</span>
                      <p className="text-brand-text font-semibold">{tenant.contactEmail || tenant.adminEmail}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-brand-text-muted text-[10px]">Quốc gia & Tiền tệ</span>
                      <p className="text-brand-text font-semibold">{getCountryLabel(details.country)} ({details.currency})</p>
                    </div>
                  </div>
                </div>

                {/* Tenant Admin Profile */}
                <div className="bg-brand-surface-high/30 border border-brand-outline/20 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                    <User className="w-4 h-4 text-brand-secondary" />
                    Tenant Admin chính
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-surface-highest border border-brand-outline flex items-center justify-center font-bold text-brand-text text-sm">
                      {tenant.adminName.split(' ').pop()?.charAt(0)}
                    </div>
                    <div className="text-xs">
                      <p className="text-brand-text font-bold text-sm">{tenant.adminName}</p>
                      <p className="text-brand-text-muted mt-0.5">{tenant.adminEmail}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-brand-outline/20 pt-4 text-xs">
                    <div>
                      <span className="text-brand-text-muted text-[10px]">Lần đăng nhập cuối</span>
                      <p className="text-brand-text font-semibold mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-brand-text-muted" />
                        {tenant.lastLogin}
                      </p>
                    </div>
                    <div>
                      <span className="text-brand-text-muted text-[10px]">Tổng nhân sự toàn tenant</span>
                      <p className="text-brand-text font-semibold mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-brand-text-muted" />
                        {tenant.staffCount} Thợ Nail
                      </p>
                    </div>
                    <div>
                      <span className="text-brand-text-muted text-[10px]">Số chi nhánh</span>
                      <p className="text-brand-text font-semibold mt-0.5 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-brand-text-muted" />
                        {details.branches.length} chi nhánh
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prompt to switch to full details */}
                <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-between">
                  <div className="text-xs">
                    <p className="text-brand-text font-bold">Xem thông tin chi tiết đầy đủ</p>
                    <p className="text-brand-text-muted mt-0.5">Xem doanh thu toàn tenant, Tenant Admin chính, gói cước, nhân sự và chi nhánh.</p>
                  </div>
                  <button 
                    onClick={() => { setViewMode('full'); setActiveTab('overview'); }}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Xem full
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ) : (
              // FULL VIEW MODE WITH TABS
              <div className="space-y-6">
                
                {/* Tabs Navigator */}
                <div className="border-b border-brand-outline/40 flex flex-wrap gap-1">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-4 font-bold text-xs relative transition-all cursor-pointer ${activeTab === 'overview' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
                  >
                    Tổng quan
                  </button>
                  <button 
                    onClick={() => setActiveTab('billing')}
                    className={`pb-3 px-4 font-bold text-xs relative transition-all cursor-pointer ${activeTab === 'billing' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
                  >
                    Gói & thanh toán
                  </button>
                  <button 
                    onClick={() => setActiveTab('branches')}
                    className={`pb-3 px-4 font-bold text-xs relative transition-all cursor-pointer ${activeTab === 'branches' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
                  >
                    Chi nhánh ({details.branches.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('activities')}
                    className={`pb-3 px-4 font-bold text-xs relative transition-all cursor-pointer ${activeTab === 'activities' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
                  >
                    Hoạt động gần đây
                  </button>
                  <button 
                    onClick={() => setActiveTab('config')}
                    className={`pb-3 px-4 font-bold text-xs relative transition-all cursor-pointer ${activeTab === 'config' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
                  >
                    Cấu hình
                  </button>
                </div>

                {/* TAB CONTENTS */}

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      details.healthStatus === 'CRITICAL'
                        ? 'bg-brand-error/10 border-brand-error/25'
                        : details.healthStatus === 'WARNING'
                        ? 'bg-brand-warning/10 border-brand-warning/25'
                        : 'bg-brand-secondary/10 border-brand-secondary/20'
                    }`}>
                      <div className="flex items-start gap-3">
                        <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${details.healthStatus === 'CRITICAL' ? 'text-brand-error' : details.healthStatus === 'WARNING' ? 'text-brand-warning' : 'text-brand-secondary'}`} />
                        <div>
                          <p className="text-sm font-black text-brand-text">
                            {details.alerts[0]?.message || `Tenant ${tenant.name} đang vận hành ổn định.`}
                          </p>
                          <p className="text-xs text-brand-text-muted mt-1">
                            Đồng bộ gần nhất: <strong className="text-brand-text">{details.lastSync}</strong> · {getCountryLabel(details.country)}
                          </p>
                        </div>
                      </div>
                      {details.alerts[0]?.action && (
                        <button
                          onClick={() => {
                            if (details.alerts[0].id.includes('EXP') || details.alerts[0].id.includes('OVER')) {
                              setActiveTab('billing');
                            } else if (details.alerts[0].id.includes('PAY')) {
                              setActiveTab('config');
                            } else {
                              triggerToast(`Đã điều hướng tới tác vụ: ${details.alerts[0].action}`);
                            }
                          }}
                          className="shrink-0 bg-brand-surface border border-brand-outline hover:bg-brand-surface-high text-brand-text px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer"
                        >
                          {details.alerts[0].action}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
                      <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-brand-primary" />
                            Thông tin tenant
                          </h4>
                          {getStatusBadge(tenant.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                          <div>
                            <span className="text-brand-text-muted block mb-1">Tên tenant / chuỗi tiệm</span>
                            <p className="text-brand-text font-bold">{tenant.name}</p>
                          </div>
                          <div>
                            <span className="text-brand-text-muted block mb-1">Tenant code</span>
                            <p className="text-brand-text font-mono font-bold">{tenant.id}</p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-brand-text-muted block mb-1">Địa chỉ</span>
                            <p className="text-brand-text font-semibold leading-relaxed">{tenant.address}</p>
                          </div>
                          <div>
                            <span className="text-brand-text-muted block mb-1">Tenant Admin chính</span>
                            <p className="text-brand-text font-bold">{tenant.adminName}</p>
                            <p className="text-brand-text-muted mt-0.5 break-all">{tenant.adminEmail}</p>
                          </div>
                          <div>
                            <span className="text-brand-text-muted block mb-1">Liên hệ</span>
                            <p className="text-brand-text font-semibold">{tenant.phone}</p>
                            <p className="text-brand-text-muted mt-0.5">Login cuối: {tenant.lastLogin}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-brand-primary" />
                          Gói & trạng thái
                        </h4>

                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-brand-text-muted">Gói hiện tại</span>
                            <span className="font-black text-brand-secondary">Gói {tenant.packageName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-brand-text-muted">Thanh toán</span>
                            <span className="font-bold text-brand-text">{getPaymentStatusText(details.paymentStatus)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-brand-text-muted">Ngày còn lại</span>
                            <span className={`font-mono font-black ${details.daysRemaining < 0 ? 'text-brand-error' : 'text-brand-text'}`}>
                              {details.daysRemaining < 0 ? `Quá hạn ${Math.abs(details.daysRemaining)} ngày` : `${details.daysRemaining} ngày`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-brand-text-muted">Cổng thanh toán</span>
                            <span className={`font-bold ${details.paymentGatewayConfigured ? 'text-brand-secondary' : 'text-brand-warning'}`}>
                              {details.paymentGatewayConfigured ? 'Đã liên kết' : 'Chưa cấu hình'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4">
                        <p className="text-[10px] uppercase font-bold text-brand-text-muted">Chi nhánh</p>
                        <p className="text-lg font-black text-brand-text mt-1">
                          {details.branches.length} đang dùng
                        </p>
                        <p className="text-[10px] text-brand-text-muted mt-1">Giới hạn {tenant.packageName}: {currentBranchLimitLabel}</p>
                      </div>
                      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4">
                        <p className="text-[10px] uppercase font-bold text-brand-text-muted">Tổng nhân sự</p>
                        <p className="text-lg font-black text-brand-text mt-1">
                          {totalStaffUsed} / {totalStaffLimitDisplay === 'Không giới hạn' ? 'Không giới hạn' : totalStaffLimitDisplay}
                        </p>
                      </div>
                      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4">
                        <p className="text-[10px] uppercase font-bold text-brand-text-muted">Đặt lịch online</p>
                        <p className={`text-lg font-black mt-1 ${details.allowOnlineBooking ? 'text-brand-secondary' : 'text-brand-error'}`}>
                          {supportsOnlineBooking && details.allowOnlineBooking ? 'Đang bật' : 'Đã tắt'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* BILLING TAB */}
                {activeTab === 'billing' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Plan Summary Card */}
                    <div className="bg-brand-surface-high/30 border border-brand-outline/25 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted block">Gói dịch vụ kích hoạt</span>
                        <h4 className="text-xl font-black text-brand-text flex items-center gap-2">
                          <Layers className="w-6 h-6 text-brand-secondary" />
                          Gói {tenant.packageName}
                        </h4>
                        <p className="text-xs text-brand-text-muted leading-relaxed">
                          Ngày bắt đầu: <strong className="text-brand-text font-mono">{tenant.createdAt}</strong> • Đã tích hợp thanh toán tự động qua thẻ Visa kết thúc đuôi *8024.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full sm:w-[430px] shrink-0">
                        <button 
                          onClick={() => {
                            setRenewDuration('1_month');
                            setRenewPaymentStatus('paid');
                            setRenewPaymentMethod('bank_transfer');
                            setRenewTransactionId('');
                            setRenewNote('');
                            setShowRenewPlanModal(true);
                          }}
                          className="w-full min-h-11 bg-brand-primary hover:bg-brand-primary/95 text-brand-on-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md whitespace-nowrap"
                        >
                          <RefreshCw className="w-4 h-4 shrink-0" />
                          <span>Gia hạn gói cước</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            setSelectedPlan(tenant.packageName);
                            setShowChangePlanModal(true);
                          }}
                          className="w-full min-h-11 bg-brand-surface border border-brand-outline hover:bg-brand-surface-high text-brand-text px-4 py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                          <Sliders className="w-4 h-4 shrink-0" />
                          <span>Nâng/Đổi gói</span>
                        </button>
                      </div>
                    </div>

                    {/* Invoices List */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase tracking-wider text-brand-text-muted font-bold flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Lịch sử hóa đơn thanh toán hàng tháng
                      </h4>
                      <div className="overflow-hidden border border-brand-outline/25 rounded-2xl bg-brand-surface">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-brand-surface-high border-b border-brand-outline/30 text-brand-text-muted font-bold">
                              <th className="py-2.5 px-4">Mã hóa đơn</th>
                              <th className="py-2.5 px-4">Tháng dịch vụ</th>
                              <th className="py-2.5 px-4 text-right">Số tiền</th>
                              <th className="py-2.5 px-4 text-center">Trạng thái</th>
                              <th className="py-2.5 px-4 text-right">Tác vụ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-outline/10 text-brand-text">
                            {(tenant.customInvoices || []).length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-10 px-4 text-center text-brand-text-muted">
                                  Chưa có hóa đơn thanh toán thật cho tenant này.
                                </td>
                              </tr>
                            )}
                            {(tenant.customInvoices || []).map((inv: any) => (
                              <tr key={inv.id} className="bg-brand-surface text-brand-text">
                                <td className="py-3 px-4 font-mono">{inv.id}</td>
                                <td className="py-3 px-4">{inv.period || inv.servicePeriod}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold">
                                  {formatMoney(inv.amount, inv.currency || details.currency)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {getInvoiceStatusBadge(inv.status)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button onClick={() => triggerToast(`Đang tải xuống PDF hóa đơn ${inv.id}...`)} className="min-w-[92px] justify-center text-brand-primary border border-brand-primary/25 bg-brand-primary/10 hover:bg-brand-primary/15 cursor-pointer inline-flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
                                    <span>Tải PDF</span>
                                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}



                {/* BRANCHES TAB */}
                {activeTab === 'branches' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-brand-primary" />
                          Danh sách chi nhánh thuộc tenant
                        </h4>
                        <p className="text-[10px] text-brand-text-muted mt-1">
                          Đang dùng {details.branches.length} chi nhánh. Giới hạn gói {tenant.packageName}: {currentBranchLimitLabel}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddBranchModal}
                        disabled={!canAddBranch}
                        title={canAddBranch ? 'Thêm chi nhánh cho tenant này' : `Gói ${tenant.packageName} đã đạt giới hạn ${currentBranchLimitLabel}`}
                        className={`min-h-9 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 ${
                          canAddBranch
                            ? 'bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary cursor-pointer shadow-md'
                            : 'bg-brand-surface-highest text-brand-text-muted border border-brand-outline/40 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Thêm chi nhánh</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {details.branches.map((br) => {
                        const hasZeroStaff = br.staffUsed === 0;
                        const isBranchActive = br.status === 'ACTIVE';
                        const canDeleteBranch = details.branches.length > 1;
                        return (
                          <div key={br.id} className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                            !isBranchActive
                              ? 'bg-brand-outline/10 border-brand-outline/35 opacity-90'
                              : hasZeroStaff
                              ? 'bg-brand-error/5 border-brand-error/20'
                              : 'bg-brand-surface-high/35 border-brand-outline/15'
                          }`}>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start">
                                <div><h5 className="font-bold text-brand-text text-sm flex items-center gap-1"><Store className="w-4 h-4 text-brand-primary shrink-0" />{br.name}</h5><div className="mt-1.5 flex flex-wrap gap-1.5"><span className="rounded-full border border-brand-outline/35 bg-brand-surface px-2 py-0.5 text-[9px] font-bold text-brand-text-muted">{getBranchModelLabel(br.model)}</span>{br.isPrimary && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white">Chi nhánh chính</span>}</div></div>
                                <span className="text-[10px] text-brand-text-muted font-mono">{br.code || br.id}</span>
                              </div>
                              <p className="text-xs text-brand-text-muted flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-brand-text-muted shrink-0" />
                                {br.address}
                              </p>
                            </div>

                            <div className="border-t border-brand-outline/10 pt-3 space-y-1.5 text-xs">
                              <div className="flex justify-between items-center"><span className="text-brand-text-muted">Quản lý:</span><span className="font-semibold text-brand-text">{br.managerName || 'Chưa phân công'}</span></div>
                              <div className="flex justify-between items-center"><span className="text-brand-text-muted">Liên hệ:</span><span className="font-semibold text-brand-text">{br.phone || 'Chưa cập nhật'}</span></div>
                              <div className="flex justify-between items-center"><span className="text-brand-text-muted">Mở cửa / Vị trí:</span><span className="font-semibold text-brand-text">{br.openingHours || '08:00–21:00'} · {br.stationCount || 0} vị trí</span></div>
                              <div className="flex justify-between items-center">
                                <span className="text-brand-text-muted">Nhân viên / Thợ:</span>
                                <span className={`font-bold font-mono ${hasZeroStaff ? 'text-brand-error font-extrabold' : 'text-brand-text font-semibold'}`}>
                                  {br.staffUsed} thợ
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-brand-text-muted">Trạng thái chi nhánh:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${br.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-outline/25 text-brand-text-muted border border-brand-outline/35'}`}>
                                  {getBranchStatusLabel(br.status)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2 border-t border-brand-outline/10 pt-3">
                              {isBranchActive ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmAction({
                                    type: 'branch-status',
                                    message: `Bạn chắc chắn muốn khóa tạm thời chi nhánh "${br.name}"? Lịch đặt và nhân sự của chi nhánh này sẽ bị tạm dừng, nhưng tenant vẫn hoạt động.`,
                                    payload: { branchId: br.id, nextStatus: 'INACTIVE' }
                                  })}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-error/30 bg-brand-error/10 px-3 py-1.5 text-[10px] font-bold text-brand-error hover:bg-brand-error/15 transition-colors cursor-pointer"
                                  title="Khóa tạm thời riêng chi nhánh này"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Khóa chi nhánh</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmAction({
                                    type: 'branch-status',
                                    message: `Bạn chắc chắn muốn mở lại chi nhánh "${br.name}"? Chi nhánh này sẽ hoạt động trở lại trong tenant.`,
                                    payload: { branchId: br.id, nextStatus: 'ACTIVE' }
                                  })}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                                  title="Mở lại chi nhánh này"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Mở lại</span>
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!canDeleteBranch}
                                onClick={() => {
                                  if (!canDeleteBranch) return;
                                  setConfirmAction({
                                    type: 'delete-branch',
                                    message: `Bạn chắc chắn muốn xóa chi nhánh "${br.name}" khỏi tenant "${tenant.name}"? Thao tác này sẽ xóa chi nhánh khỏi danh sách và cập nhật lại tổng nhân sự, tổng khách hàng của tenant.`,
                                    payload: { branchId: br.id }
                                  });
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                                  canDeleteBranch
                                    ? 'border-brand-error/30 bg-brand-error/10 text-brand-error hover:bg-brand-error/15 cursor-pointer'
                                    : 'border-brand-outline/35 bg-brand-surface-highest text-brand-text-muted cursor-not-allowed opacity-60'
                                }`}
                                title={canDeleteBranch ? 'Xóa chi nhánh khỏi tenant' : 'Không thể xóa chi nhánh cuối cùng của tenant'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa chi nhánh</span>
                              </button>
                            </div>

                            {hasZeroStaff && isBranchActive && (
                              <div className="bg-brand-error/10 text-brand-error p-2.5 rounded-lg text-[10px] leading-relaxed flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>Cảnh báo: Chi nhánh này hiện chưa có nhân viên được phân bổ! Cần thông báo cho Tenant Admin bổ sung.</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ACTIVITIES TAB */}
                {activeTab === 'activities' && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-brand-primary" />
                      Nhật ký vận hành & Audit Log chi tiết
                    </h4>

                    <div className="relative border-l border-brand-outline/35 ml-4 pl-6 space-y-6">
                      {localActivities.map((act, idx) => (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-9 top-1 w-6 h-6 rounded-full border-2 border-brand-surface flex items-center justify-center ${act.type === 'login' ? 'bg-brand-primary text-brand-on-primary' : act.type === 'payment' ? 'bg-brand-secondary text-brand-on-secondary' : act.type === 'staff' ? 'bg-brand-tertiary text-brand-on-tertiary' : 'bg-brand-outline text-brand-text'}`}>
                            {act.type === 'login' ? <Key className="w-3 h-3" /> : act.type === 'payment' ? <CreditCard className="w-3 h-3" /> : act.type === 'staff' ? <Users className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                          </span>
                          <div className="text-xs">
                            <span className="text-[10px] text-brand-text-muted font-mono">{act.date}</span>
                            <p className="text-brand-text font-semibold mt-0.5">{act.description}</p>
                            <span className="text-[10px] text-brand-text-muted mt-1 block">Tác nhân thực hiện: <strong>{act.user}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONFIG TAB */}
                {activeTab === 'config' && (
                  <div className="space-y-5 animate-fadeIn">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-brand-primary" />
                      Cấu hình vận hành & thông tin thanh toán (Superadmin)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Booking toggle */}
                      <div className="p-4 bg-brand-surface-high/30 border border-brand-outline/15 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-brand-text">Cho phép đặt lịch trực tuyến (Online Booking)</p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5">
                            {supportsOnlineBooking ? 'Cho phép hoặc chặn link đặt lịch công khai của tenant.' : `Feature flag online_booking chưa được cấp cho gói ${tenant.packageName}.`}
                          </p>
                        </div>
                        <button 
                          onClick={() => setAllowOnlineBooking(!allowOnlineBooking)}
                          disabled={!supportsOnlineBooking}
                          className="text-brand-primary hover:opacity-80 transition-opacity p-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {allowOnlineBooking ? <CheckSquare className="w-5 h-5 text-brand-primary" /> : <Square className="w-5 h-5 text-brand-text-muted" />}
                        </button>
                      </div>

                      {/* Payment Gateway Toggle */}
                      <div className="p-4 bg-brand-surface-high/30 border border-brand-outline/15 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-brand-text">Cổng thanh toán online (Stripe/Paypal)</p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5">Cho phép salon nhận cọc trước qua cổng online.</p>
                        </div>
                        <button 
                          onClick={() => setPaymentGatewayConfigured(!paymentGatewayConfigured)}
                          className="text-brand-primary hover:opacity-80 transition-opacity p-1 cursor-pointer"
                        >
                          {paymentGatewayConfigured ? <CheckSquare className="w-5 h-5 text-brand-primary" /> : <Square className="w-5 h-5 text-brand-text-muted" />}
                        </button>
                      </div>

                      {/* Currency selection */}
                      <div className="p-4 bg-brand-surface-high/30 border border-brand-outline/15 rounded-2xl flex flex-col gap-2 justify-between">
                        <div>
                          <p className="font-bold text-brand-text">Đơn vị tiền tệ chính</p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5">Hệ thống tính hóa đơn và thanh toán khách hàng.</p>
                        </div>
                        <BeautifulSelect
                          value={currency} 
                          onChange={(e) => setCurrency(e.target.value as 'USD' | 'VND')}
                          className="bg-brand-surface border border-brand-outline rounded-lg px-2.5 py-1.5 text-xs text-brand-text w-full cursor-pointer focus:outline-none focus:border-brand-primary"
                        >
                          <option value="VND">VND (đ) - Tiếng Việt</option>
                          <option value="USD">USD ($) - Dollar Mỹ</option>
                        </BeautifulSelect>
                      </div>

                      {/* Language Selection */}
                      <div className="p-4 bg-brand-surface-high/30 border border-brand-outline/15 rounded-2xl flex flex-col gap-2 justify-between">
                        <div>
                          <p className="font-bold text-brand-text">Ngôn ngữ mặc định của Tenant</p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5">Giao diện nội bộ & tin nhắn SMS gửi khách.</p>
                        </div>
                        <BeautifulSelect
                          value={defaultLanguage} 
                          onChange={(e) => setDefaultLanguage(e.target.value as 'Vietnamese' | 'English')}
                          className="bg-brand-surface border border-brand-outline rounded-lg px-2.5 py-1.5 text-xs text-brand-text w-full cursor-pointer focus:outline-none focus:border-brand-primary"
                        >
                          <option value="Vietnamese">Vietnamese (Tiếng Việt)</option>
                          <option value="English">English (Tiếng Anh)</option>
                        </BeautifulSelect>
                      </div>

                    </div>

                    {/* Internal Notes area */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-brand-text-muted">Ghi chú quản lý nội bộ (Internal Notes) *</label>
                      <textarea 
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Nhập ghi chú vận hành, lịch sử khiếu nại, hỗ trợ kỹ thuật..."
                        rows={3}
                        className="bg-brand-surface border border-brand-outline rounded-xl p-3 text-xs text-brand-text w-full focus:outline-none focus:border-brand-primary leading-relaxed"
                      />
                    </div>

                    {/* Saving Actions */}
                    <div className="flex justify-end gap-2 border-t border-brand-outline/10 pt-4">
                      <button 
                        onClick={handleSaveConfig}
                        className="bg-brand-primary hover:bg-brand-primary/95 text-brand-on-primary px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        Lưu cấu hình hoạt động
                      </button>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* Sidebar / Support & Control Panel (Static on Desktop, Drawer on Mobile if Fullmode) */}
          {false && viewMode === 'full' && (
            <div className="w-full lg:w-72 bg-brand-surface-high border-t lg:border-t-0 lg:border-l border-brand-outline/40 p-6 flex flex-col justify-between gap-6 overflow-y-auto">
              
              {/* Quick Support Actions */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted">Tác vụ hỗ trợ khẩn</h5>
                
                <div className="space-y-2.5 text-xs">
                  <button 
                    onClick={() => triggerToast(`Đã gửi email nhắc cước & báo cáo dịch vụ đến: ${tenant.adminEmail}`)}
                    className="w-full bg-brand-surface hover:bg-brand-surface-high text-brand-text px-3.5 py-2.5 rounded-xl font-bold border border-brand-outline/35 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-brand-secondary" />
                    <span>Gửi báo cáo Email</span>
                  </button>

                  <button 
                    onClick={() => alert(`Hotline Hệ thống NailSaaS: Đang gọi đến số di động của Tenant: ${tenant.phone}`)}
                    className="w-full bg-brand-surface hover:bg-brand-surface-high text-brand-text px-3.5 py-2.5 rounded-xl font-bold border border-brand-outline/35 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-brand-primary" />
                    <span>Gọi điện trực tiếp</span>
                  </button>

                  <button 
                    onClick={() => setShowSendNotification(true)}
                    className="w-full bg-brand-surface hover:bg-brand-surface-high text-brand-text px-3.5 py-2.5 rounded-xl font-bold border border-brand-outline/35 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4 text-brand-tertiary" />
                    <span>Gửi thông báo Toast</span>
                  </button>
                </div>
              </div>

              {/* Drawer for sending notification to tenant */}
              {showSendNotification && (
                <div className="p-4 bg-brand-surface rounded-2xl border border-brand-outline/40 space-y-3 mt-4 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-text">Gửi tin nhắn trực tiếp</span>
                    <button onClick={() => setShowSendNotification(false)} className="text-brand-text-muted hover:text-brand-text cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={notificationMsg}
                    onChange={(e) => setNotificationMsg(e.target.value)}
                    placeholder="Nội dung thông báo (Sẽ hiển thị popup phía giao diện salon)..."
                    rows={2}
                    className="w-full bg-brand-surface-high border border-brand-outline rounded-lg p-2 text-xs focus:outline-none focus:border-brand-primary text-brand-text"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => { setNotificationMsg(''); setShowSendNotification(false); }} className="bg-brand-surface-high px-2 py-1 rounded text-[10px] text-brand-text-muted cursor-pointer">Hủy</button>
                    <button onClick={() => {
                      if (!notificationMsg.trim()) return;
                      triggerToast("Đã đẩy thông báo tới Tenant thành công!");
                      setNotificationMsg('');
                      setShowSendNotification(false);
                    }} className="bg-brand-primary text-brand-on-primary px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer">Gửi đi</button>
                  </div>
                </div>
              )}

              {/* Management Zone / Danger Area */}
              <div className="space-y-4 border-t border-brand-outline/25 pt-6">
                <h5 className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted">Quản trị tối cao (Superadmin)</h5>
                
                <div className="space-y-2.5 text-xs">
                  {tenant.status === 'SUSPENDED' ? (
                    <button 
                      onClick={() => setConfirmAction({
                        type: 'unlock',
                        message: `Bạn chắc chắn muốn MỞ KHÓA dịch vụ hoạt động cho Tenant "${tenant.name}"? Hệ thống sẽ kích hoạt lại quyền truy cập.`
                      })}
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3.5 py-2.5 rounded-xl font-bold border border-emerald-500/15 transition-all flex items-center gap-2.5 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Kích hoạt hoạt động</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setConfirmAction({
                        type: 'lock',
                        message: `Bạn chắc chắn muốn KHÓA TẠM THỜI hoạt động của Tenant "${tenant.name}"? Tenant Admin và toàn bộ nhân viên sẽ bị mất quyền truy cập hệ thống ngay lập tức.`
                      })}
                      className="w-full bg-brand-error/10 hover:bg-brand-error/20 text-brand-error px-3.5 py-2.5 rounded-xl font-bold border border-brand-error/15 transition-all flex items-center gap-2.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Khóa tạm thời</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer (Static Actions Panel) */}
        <div className="px-6 py-4 bg-brand-surface-high border-t border-brand-outline/40 flex justify-between items-center gap-4">
          <div className="text-xs text-brand-text-muted">
            {viewMode === 'full' ? (
              <span>Đang xem chi tiết vận hành đầy đủ của <strong>{tenant.name}</strong></span>
            ) : (
              <span>Xem tóm tắt thông tin của <strong>{tenant.name}</strong></span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === 'full' && (
              tenant.status === 'SUSPENDED' ? (
                <button
                  onClick={() => setConfirmAction({
                    type: 'unlock',
                    message: `Bạn chắc chắn muốn MỞ KHÓA dịch vụ hoạt động cho Tenant "${tenant.name}"? Hệ thống sẽ kích hoạt lại quyền truy cập.`
                  })}
                  className="bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-brand-secondary/25"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở khóa</span>
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({
                    type: 'lock',
                    message: `Bạn chắc chắn muốn KHÓA TẠM THỜI hoạt động của Tenant "${tenant.name}"? Tenant Admin và toàn bộ nhân viên sẽ bị mất quyền truy cập hệ thống ngay lập tức.`
                  })}
                  className="bg-brand-error/10 hover:bg-brand-error/20 text-brand-error px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-brand-error/25"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa tạm thời</span>
                </button>
              )
            )}
            <button 
              onClick={() => { onEditClick(); onClose(); }}
              className="bg-brand-secondary hover:bg-brand-secondary/90 text-brand-on-secondary px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-md"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Sửa Tenant</span>
            </button>
            <button 
              onClick={onClose}
              className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-brand-outline/40"
            >
              Đóng lại
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
