import type { SubscriptionPackage } from '../types';
import type { NailPageId } from '../components/nailAdminData';

export type TenantPageAccess = 'full' | 'limited' | 'locked';

interface TenantPagePolicy {
  capabilityKey: string;
  fallback: Exclude<TenantPageAccess, 'full'>;
}

export const TENANT_PAGE_POLICIES: Partial<Record<NailPageId, TenantPagePolicy>> = {
  appointments: { capabilityKey: 'appointments', fallback: 'locked' },
  stations: { capabilityKey: 'appointments', fallback: 'locked' },
  customers: { capabilityKey: 'customers', fallback: 'locked' },
  loyalty: { capabilityKey: 'loyalty', fallback: 'locked' },
  care: { capabilityKey: 'automation', fallback: 'locked' },
  inventory: { capabilityKey: 'inventory', fallback: 'locked' },
  online: { capabilityKey: 'online_booking', fallback: 'locked' },
  finance: { capabilityKey: 'inventory', fallback: 'locked' },
  reports: { capabilityKey: 'advanced_reports', fallback: 'limited' }
};

export const getEnabledTenantCapabilities = (subscriptionPackage: SubscriptionPackage) => (
  new Set((subscriptionPackage.capabilities || [])
    .filter((capability) => capability.enabled)
    .map((capability) => capability.key))
);

export const getTenantPageAccess = (
  subscriptionPackage: SubscriptionPackage,
  page: NailPageId
): TenantPageAccess => {
  const policy = TENANT_PAGE_POLICIES[page];
  if (!policy) return 'full';
  return getEnabledTenantCapabilities(subscriptionPackage).has(policy.capabilityKey)
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
  if (!capabilityKey) return 'T?nh n?ng n?y';
  return subscriptionPackage.capabilities?.find((capability) => capability.key === capabilityKey)?.label
    || capabilityKey.replaceAll('_', ' ');
};

export const findTenantUpgradePackage = (
  availablePackages: SubscriptionPackage[],
  currentPackage: SubscriptionPackage,
  capabilityKey?: string
) => {
  if (!capabilityKey) return undefined;
  return availablePackages
    .filter((candidate) => (candidate.status || 'ACTIVE') === 'ACTIVE')
    .filter((candidate) => candidate.id !== currentPackage.id)
    .filter((candidate) => candidate.capabilities?.some((capability) => (
      capability.key === capabilityKey && capability.enabled
    )))
    .sort((a, b) => a.price - b.price)[0];
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
  ? `${used.toLocaleString('vi-VN')} / Kh?ng gi?i h?n`
  : `${used.toLocaleString('vi-VN')} / ${(limit || 0).toLocaleString('vi-VN')}`;

export const getTenantUsagePercent = (
  used: number,
  limit: number | null | undefined,
  kind?: 'branches' | 'staff'
) => isUnlimitedTenantLimit(limit, kind) || !limit
  ? 0
  : Math.min(100, Math.round((used / limit) * 100));
