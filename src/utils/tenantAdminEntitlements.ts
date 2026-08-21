import type { SubscriptionPackage } from '../types';
import type { NailPageId } from '../components/nailAdminData';
import { STANDARD_PLAN_CAPABILITY_TIERS, SUBSCRIPTION_CAPABILITY_CATALOG } from './subscriptions';

export type TenantPageAccess = 'full' | 'limited' | 'locked';

interface TenantPagePolicy {
  capabilityKey: string;
  fallback: Exclude<TenantPageAccess, 'full'>;
}

/**
 * Màn hình nào bị khóa theo quyền của gói. Trang không có mục ở đây thì luôn mở.
 *
 * Năm trang cố ý để mở cho mọi gói vì thiếu chúng thì tiệm không vận hành nổi
 * và gói rẻ nhất sẽ không dùng được: `overview`, `branches`, `pos`, `staff`,
 * `services` và `settings`. Riêng `branches` và `staff` vẫn bị chặn theo hạn
 * mức số lượng của gói chứ không phải theo quyền — xem `getTenantUsagePercent`.
 * `subscription` phải luôn mở, nếu không thì tenant bị khóa sẽ không còn đường
 * vào trang nâng cấp để tự mở khóa.
 */
export const TENANT_PAGE_POLICIES: Partial<Record<NailPageId, TenantPagePolicy>> = {
  appointments: { capabilityKey: 'appointments', fallback: 'locked' },
  stations: { capabilityKey: 'appointments', fallback: 'locked' },
  customers: { capabilityKey: 'customers', fallback: 'locked' },
  loyalty: { capabilityKey: 'loyalty', fallback: 'locked' },
  inventory: { capabilityKey: 'inventory', fallback: 'locked' },
  online: { capabilityKey: 'online_booking', fallback: 'locked' },
  gallery: { capabilityKey: 'nail_gallery', fallback: 'locked' },
  sanitation: { capabilityKey: 'sanitation', fallback: 'locked' },
  /* Trước đây Thu & Chi dùng chung khoá 'inventory' với Kho vật tư, nên bán một
     module là mở luôn module kia. Giờ mỗi trang có khoá riêng. */
  finance: { capabilityKey: 'finance', fallback: 'locked' },
  reports: { capabilityKey: 'advanced_reports', fallback: 'limited' }
};

const STANDARD_PLAN_RANKS: Record<string, number> = {
  basic: 1,
  premium: 2,
  enterprise: 3
};

export const getStandardTenantPlanRank = (subscriptionPackage?: SubscriptionPackage) => (
  subscriptionPackage ? STANDARD_PLAN_RANKS[subscriptionPackage.name.trim().toLowerCase()] || 0 : 0
);

/**
 * Standard plans are cumulative: Enterprise includes Premium and Basic, while
 * Premium includes Basic. Custom plans continue to use their own feature flags.
 */
export const getEnabledTenantCapabilities = (
  subscriptionPackage: SubscriptionPackage,
  availablePackages: SubscriptionPackage[] = []
) => {
  const enabled = new Set((subscriptionPackage.capabilities || [])
    .filter((capability) => capability.enabled)
    .map((capability) => capability.key));
  const currentRank = getStandardTenantPlanRank(subscriptionPackage);

  if (!currentRank) return enabled;

  Object.entries(STANDARD_PLAN_CAPABILITY_TIERS).forEach(([rank, capabilityKeys]) => {
    if (Number(rank) <= currentRank) capabilityKeys.forEach((key) => enabled.add(key));
  });

  availablePackages.forEach((candidate) => {
    const candidateRank = getStandardTenantPlanRank(candidate);
    if (candidateRank > 0 && candidateRank <= currentRank) {
      candidate.capabilities?.forEach((capability) => {
        if (capability.enabled) enabled.add(capability.key);
      });
    }
  });

  // Enterprise is the top standard tier and must expose the complete catalog.
  if (currentRank === STANDARD_PLAN_RANKS.enterprise) {
    SUBSCRIPTION_CAPABILITY_CATALOG.forEach((capability) => enabled.add(capability.key));
  }

  return enabled;
};

export const getTenantPageAccess = (
  subscriptionPackage: SubscriptionPackage,
  page: NailPageId,
  availablePackages: SubscriptionPackage[] = []
): TenantPageAccess => {
  const policy = TENANT_PAGE_POLICIES[page];
  if (!policy) return 'full';
  return getEnabledTenantCapabilities(subscriptionPackage, availablePackages).has(policy.capabilityKey)
    ? 'full'
    : policy.fallback;
};

export const getTenantPageCapabilityKey = (page: NailPageId) => (
  TENANT_PAGE_POLICIES[page]?.capabilityKey
);

export const getTenantCapabilityLabel = (
  subscriptionPackage: SubscriptionPackage,
  capabilityKey?: string
) => {
  if (!capabilityKey) return 'Tính năng này';
  return subscriptionPackage.capabilities?.find((capability) => capability.key === capabilityKey)?.label
    || SUBSCRIPTION_CAPABILITY_CATALOG.find((capability) => capability.key === capabilityKey)?.label
    || capabilityKey.replaceAll('_', ' ');
};

export const isTenantPackageUpgradeCandidate = (
  currentPackage: SubscriptionPackage,
  candidate: SubscriptionPackage
) => {
  if (candidate.id === currentPackage.id || (candidate.status || 'ACTIVE') !== 'ACTIVE') return false;
  const currentRank = getStandardTenantPlanRank(currentPackage);
  const candidateRank = getStandardTenantPlanRank(candidate);

  if (currentRank && candidateRank) return candidateRank > currentRank;
  return candidate.price > currentPackage.price;
};

export const findTenantUpgradePackage = (
  availablePackages: SubscriptionPackage[],
  currentPackage: SubscriptionPackage,
  capabilityKey?: string
) => {
  if (!capabilityKey) return undefined;
  return availablePackages
    .filter((candidate) => isTenantPackageUpgradeCandidate(currentPackage, candidate))
    .filter((candidate) => getEnabledTenantCapabilities(candidate, availablePackages).has(capabilityKey))
    .sort((a, b) => {
      const rankDifference = getStandardTenantPlanRank(a) - getStandardTenantPlanRank(b);
      return rankDifference || a.price - b.price;
    })[0];
};

export const isUnlimitedTenantLimit = (value: number | null | undefined, kind?: 'branches' | 'staff') => {
  if (value === null) return true;
  if (value === undefined) return false;
  return kind === 'branches' ? value >= 99 : kind === 'staff' ? value >= 999 : false;
};

export const formatTenantQuota = (
  used: number,
  limit: number | null | undefined,
  kind?: 'branches' | 'staff'
) => isUnlimitedTenantLimit(limit, kind)
  ? `${used.toLocaleString('vi-VN')} / Không giới hạn`
  : `${used.toLocaleString('vi-VN')} / ${(limit || 0).toLocaleString('vi-VN')}`;

export const getTenantUsagePercent = (
  used: number,
  limit: number | null | undefined,
  kind?: 'branches' | 'staff'
) => isUnlimitedTenantLimit(limit, kind) || !limit
  ? 0
  : Math.min(100, Math.round((used / limit) * 100));
