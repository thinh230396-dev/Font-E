import {
  CurrencyCode,
  SubscriptionCapability,
  SubscriptionLimits,
  SubscriptionPackage,
  SubscriptionPackageName,
  Tenant
} from '../types';

const LEGACY_PACKAGE_DEFAULTS: Record<string, Pick<SubscriptionPackage, 'price' | 'currency' | 'billingCycle' | 'maxStaff' | 'maxSalons'>> = {
  Basic: { price: 49, currency: 'USD', billingCycle: 'monthly', maxStaff: 5, maxSalons: 1 },
  Premium: { price: 99, currency: 'USD', billingCycle: 'monthly', maxStaff: 15, maxSalons: 3 },
  Enterprise: { price: 249, currency: 'USD', billingCycle: 'monthly', maxStaff: 999, maxSalons: 99 }
};

export const SUBSCRIPTION_CAPABILITY_CATALOG: Array<{ key: string; label: string }> = [
  { key: 'appointments', label: 'Quản lý lịch hẹn' },
  { key: 'online_booking', label: 'Trang đặt lịch trực tuyến' },
  { key: 'customers', label: 'Quản lý khách hàng' },
  { key: 'advanced_reports', label: 'Báo cáo nâng cao' },
  { key: 'loyalty', label: 'Loyalty & khách hàng thân thiết' },
  { key: 'automation', label: 'SMS & Email tự động' },
  { key: 'inventory', label: 'Kế toán & quản lý kho' },
  { key: 'finance', label: 'Sổ thu & chi' },
  { key: 'nail_gallery', label: 'Thư viện màu & mẫu Nail' },
  { key: 'sanitation', label: 'Vệ sinh & an toàn' },
  { key: 'api', label: 'API tích hợp' },
  { key: 'custom_domain', label: 'Custom domain' },
  { key: 'sso', label: 'SSO & bảo mật nâng cao' },
  { key: 'priority_support', label: 'Hỗ trợ ưu tiên 24/7' },
  { key: 'account_manager', label: 'Dedicated Account Manager' }
];

export const DEFAULT_SUBSCRIPTION_LIMITS: SubscriptionLimits = {
  appointmentsPerMonth: 500,
  storageGb: 5,
  messagesPerMonth: 100,
  adminUsers: 1,
  apiCallsPerMonth: 0,
  customDomains: 0,
  dataRetentionDays: 365
};

/**
 * Quyền tính năng mà MỖI BẬC gói chuẩn mở thêm so với bậc dưới. Bậc 1 là Basic,
 * bậc 2 là Premium, bậc 3 là Enterprise; các bậc cộng dồn.
 *
 * Đây là NGUỒN DUY NHẤT cho việc gói nào mở tính năng nào. `PACKAGE_PROFILES`
 * bên dưới và `getEnabledTenantCapabilities` trong `tenantAdminEntitlements.ts`
 * đều đọc từ đây — trước kia mỗi file giữ một bản chép tay riêng nên sửa bảng
 * giá ở một nơi là hai nơi lệch nhau mà không có gì báo.
 */
export const STANDARD_PLAN_CAPABILITY_TIERS: Record<number, string[]> = {
  1: ['appointments', 'online_booking', 'customers'],
  2: ['advanced_reports', 'loyalty', 'automation', 'finance', 'nail_gallery', 'api', 'priority_support'],
  3: ['inventory', 'sanitation', 'custom_domain', 'sso', 'account_manager']
};

/** Quyền của một bậc gói chuẩn, đã cộng dồn từ bậc 1 lên. */
export const getCumulativePlanCapabilityKeys = (rank: number) => Object.entries(STANDARD_PLAN_CAPABILITY_TIERS)
  .filter(([tier]) => Number(tier) <= rank)
  .flatMap(([, keys]) => keys);

const PACKAGE_PROFILES: Record<string, {
  description: string;
  trialDays: number;
  capabilityKeys: string[];
  limits: Partial<SubscriptionLimits>;
}> = {
  Basic: {
    description: 'Gói cơ bản cho salon mới bắt đầu và mô hình một chi nhánh.',
    trialDays: 14,
    capabilityKeys: getCumulativePlanCapabilityKeys(1),
    limits: { appointmentsPerMonth: 500, storageGb: 5, messagesPerMonth: 100, adminUsers: 1, apiCallsPerMonth: 0, customDomains: 0, dataRetentionDays: 365 }
  },
  Premium: {
    description: 'Gói vận hành chuyên nghiệp với tự động hóa, loyalty và báo cáo nâng cao.',
    trialDays: 21,
    capabilityKeys: getCumulativePlanCapabilityKeys(2),
    limits: { appointmentsPerMonth: null, storageGb: 50, messagesPerMonth: 2000, adminUsers: 5, apiCallsPerMonth: 10000, customDomains: 1, dataRetentionDays: 730 }
  },
  Enterprise: {
    description: 'Gói dành cho chuỗi salon, yêu cầu bảo mật, tích hợp và SLA cao.',
    trialDays: 30,
    capabilityKeys: SUBSCRIPTION_CAPABILITY_CATALOG.map((capability) => capability.key),
    limits: { appointmentsPerMonth: null, storageGb: 500, messagesPerMonth: null, adminUsers: null, apiCallsPerMonth: null, customDomains: null, dataRetentionDays: null }
  }
};

const inferCapabilities = (features: string[]): SubscriptionCapability[] => {
  const source = features.join(' ').toLowerCase();
  return SUBSCRIPTION_CAPABILITY_CATALOG.map((capability, index) => {
    const words = capability.label.toLowerCase().split(/\s+|&/).filter((word) => word.length > 3);
    const inferred = words.some((word) => source.includes(word));
    return { ...capability, enabled: inferred || index < Math.min(3, features.length) };
  });
};

export const normalizeSubscriptionPackage = (pkg: SubscriptionPackage): SubscriptionPackage => {
  const currency = pkg.currency || 'USD';
  const discount = pkg.yearlyDiscountPercent ?? 20;
  const yearlyPrice = pkg.yearlyPrice ?? Number((pkg.price * 12 * (1 - discount / 100)).toFixed(2));
  const profile = PACKAGE_PROFILES[pkg.name];
  const profileCapabilities = profile
    ? SUBSCRIPTION_CAPABILITY_CATALOG.map((capability) => ({ ...capability, enabled: profile.capabilityKeys.includes(capability.key) }))
    : inferCapabilities(pkg.features);

  /* Bản ghi gói đã lưu từ trước giữ nguyên danh mục quyền tại thời điểm nó được
     tạo. Khi danh mục có thêm quyền mới, phải chiếu lại bản ghi cũ theo danh mục
     hiện tại — giữ nguyên lựa chọn bật/tắt đã có, thêm quyền mới ở trạng thái
     tắt, và bỏ quyền không còn trong danh mục. Thiếu bước này thì màn hình sửa
     gói của Superadmin không hiện quyền mới, và gói đặt tên tuỳ ý sẽ vĩnh viễn
     không bật được quyền mới vì nó không khớp bậc gói chuẩn nào. */
  const reconcileCapabilities = (stored: SubscriptionCapability[]) => SUBSCRIPTION_CAPABILITY_CATALOG.map((capability) => {
    const existing = stored.find((item) => item.key === capability.key);
    /* Quyền đã có trong bản ghi thì giữ nguyên lựa chọn của Superadmin. Quyền
       chưa từng có mặt là quyền chưa ai quyết định, nên lấy mặc định của bậc gói
       chuẩn — nếu để tắt cứng, thẻ gói bên Superadmin sẽ báo Premium có 8 tính
       năng trong khi tenant Premium thực nhận 10 theo bậc gói. */
    return { ...capability, enabled: existing?.enabled ?? Boolean(profile?.capabilityKeys.includes(capability.key)) };
  });

  return {
    ...pkg,
    description: pkg.description || profile?.description || `Gói dịch vụ ${pkg.name} dành cho nhu cầu vận hành salon.`,
    currency,
    status: pkg.status || 'ACTIVE',
    yearlyPrice,
    yearlyDiscountPercent: discount,
    setupFee: pkg.setupFee ?? 0,
    trialDays: pkg.trialDays ?? profile?.trialDays ?? 14,
    isPopular: pkg.isPopular ?? pkg.name === 'Premium',
    capabilities: pkg.capabilities?.length ? reconcileCapabilities(pkg.capabilities) : profileCapabilities,
    limits: { ...DEFAULT_SUBSCRIPTION_LIMITS, ...(profile?.limits || {}), ...(pkg.limits || {}) },
    version: pkg.version || 1,
    priceHistory: pkg.priceHistory || [],
    createdAt: pkg.createdAt || new Date().toISOString(),
    updatedAt: pkg.updatedAt || new Date().toISOString()
  };
};

export const getSubscriptionPackage = (
  packages: SubscriptionPackage[],
  packageName: SubscriptionPackageName
) => packages.find((pkg) => pkg.name === packageName);

export const getSubscriptionPackageForTenant = (
  packages: SubscriptionPackage[],
  tenant: Pick<Tenant, 'subscriptionPackageId' | 'packageName'>
) => packages.find((pkg) => pkg.id === tenant.subscriptionPackageId)
  || getSubscriptionPackage(packages, tenant.packageName);

export const getSubscriptionBranchLimit = (
  packages: SubscriptionPackage[],
  packageName: SubscriptionPackageName
) => getSubscriptionPackage(packages, packageName)?.maxSalons
  ?? LEGACY_PACKAGE_DEFAULTS[packageName]?.maxSalons
  ?? 1;

export const getSubscriptionStaffLimit = (
  packages: SubscriptionPackage[],
  packageName: SubscriptionPackageName
) => getSubscriptionPackage(packages, packageName)?.maxStaff
  ?? LEGACY_PACKAGE_DEFAULTS[packageName]?.maxStaff
  ?? 0;

export const getYearlyPackagePrice = (pkg: SubscriptionPackage) => (
  pkg.yearlyPrice ?? Number((pkg.price * 12 * (1 - (pkg.yearlyDiscountPercent ?? 0) / 100)).toFixed(2))
);

export const getSubscriptionPrice = (
  packages: SubscriptionPackage[],
  packageName: SubscriptionPackageName,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): { price: number; currency: CurrencyCode } => {
  const selectedPackage = getSubscriptionPackage(packages, packageName);
  const fallback = LEGACY_PACKAGE_DEFAULTS[packageName];

  return {
    price: selectedPackage
      ? (billingCycle === 'yearly' ? getYearlyPackagePrice(selectedPackage) : selectedPackage.price)
      : (fallback?.price ?? 0) * (billingCycle === 'yearly' ? 12 : 1),
    currency: selectedPackage?.currency ?? fallback?.currency ?? 'USD'
  };
};

export const getTenantLockedSubscriptionPrice = (
  packages: SubscriptionPackage[],
  tenant: Tenant,
  billingCycle: 'monthly' | 'yearly' = tenant.billingCycle || 'monthly'
) => {
  if (tenant.subscriptionPrice !== undefined && tenant.subscriptionCurrency) {
    const currentCycle = tenant.billingCycle || 'monthly';
    if (currentCycle === billingCycle) {
      return { price: tenant.subscriptionPrice, currency: tenant.subscriptionCurrency };
    }
  }

  return getSubscriptionPrice(packages, tenant.packageName, billingCycle);
};

export const getSellablePackages = (
  packages: SubscriptionPackage[],
  currentPackageName?: SubscriptionPackageName
) => packages.filter((pkg) => (
  (pkg.status || 'ACTIVE') === 'ACTIVE' || pkg.name === currentPackageName
));

export const hasSubscriptionCapability = (
  packages: SubscriptionPackage[],
  tenant: Pick<Tenant, 'subscriptionPackageId' | 'packageName'>,
  capabilityKey: string
) => getSubscriptionPackageForTenant(packages, tenant)
  ?.capabilities?.some((capability) => capability.key === capabilityKey && capability.enabled) === true;

export const isUnlimitedStaff = (limit: number) => limit >= 999;
export const isUnlimitedBranches = (limit: number) => limit >= 99;

export const formatSubscriptionLimit = (value: number | null | undefined, suffix = '') => {
  if (value === null) return 'Không giới hạn';
  if (!value) return 'Không hỗ trợ';
  return `${value.toLocaleString('vi-VN')}${suffix ? ` ${suffix}` : ''}`;
};
