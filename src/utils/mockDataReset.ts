const SYSTEM_MOCK_STORAGE_KEYS = [
  'salonsys_tenants',
  'salonsys_tenants_mock_seed_v1',
  'salonsys_packages',
  'salonsys_alerts',
  'salonsys_alerts_mock_seed_v2',
  'salonsys_invoices',
  'salonsys_invoices_v2',
  'salonsys_tenant_admins',
  'salonsys_support_tickets',
  'salonsys_backups_v2',
  'salonsys_backup_policy_v2',
  'salonsys_restore_jobs_v2',
  'salonsys_admin_sessions',
  'salonsys_audit_logs',
  'salonsys_system_settings',
];

let tenantAdminDataMode: 'demo' | 'live' = 'demo';

export const setTenantAdminDataMode = (mode: 'demo' | 'live') => {
  tenantAdminDataMode = mode;
};

export const isTenantAdminLiveDataMode = () => tenantAdminDataMode === 'live';

const getRecordIdentity = (value: unknown) => {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return String(record.id || record.code || record.key || record.slug || '');
};

export const getTenantAdminInitialData = <T>(
  stored: T[] | null | undefined,
  mockSeed: T[]
): T[] => {
  if (!stored?.length) return mockSeed;
  const storedIdentities = new Set(stored.map(getRecordIdentity).filter(Boolean));
  return [
    ...mockSeed.filter((item) => {
      const identity = getRecordIdentity(item);
      return !identity || !storedIdentities.has(identity);
    }),
    ...stored
  ];
};

export const getTenantMockStorageKeys = (tenantScope: string) => {
  const tenantBaseKeys = [
    `tenant-admin-appointments-v2:${tenantScope}`,
    `tenant-admin-payments-v1:${tenantScope}`,
    `tenant-admin-customers-v1:${tenantScope}`,
    `tenant-admin-stations-v2:${tenantScope}`,
    `tenant-admin-staff-v3:${tenantScope}`,
    `receptionist-technicians-v1:${tenantScope}`,
    `receptionist-products-v1:${tenantScope}`,
    `receptionist-product-reports-v1:${tenantScope}`,
    `receptionist-stations-v1:${tenantScope}`,
    `tenant-admin-services-v2:${tenantScope}`,
    `tenant-admin-inventory-v1:${tenantScope}`,
    `tenant-admin-loyalty-v1:${tenantScope}`,
    `tenant-admin-customer-care-v1:${tenantScope}`,
    `tenant-admin-finance-v1:${tenantScope}:transactions`,
    `tenant-admin-finance-v1:${tenantScope}:cashbooks`,
    `tenant-admin-finance-v1:${tenantScope}:debts`,
    `tenant-admin-finance-v1:${tenantScope}:budgets`,
    `tenant-admin-online-booking-v1:${tenantScope}:channels`,
    `tenant-admin-online-booking-v1:${tenantScope}:services`,
    `tenant-admin-sanitation-v1:${tenantScope}:checklists`,
    `tenant-admin-sanitation-v1:${tenantScope}:batches`,
    `tenant-admin-sanitation-v1:${tenantScope}:incidents`,
    `tenant-admin-sanitation-v1:${tenantScope}:certificates`,
    `tenant-admin-nail-designs-v1:${tenantScope}`,
    `tenant-admin-nail-colors-v1:${tenantScope}`,
  ];

  return tenantBaseKeys;
};

export const resetTenantMockStorage = (tenantScope: string) => {
  if (typeof window === 'undefined') return 0;
  const keys = getTenantMockStorageKeys(tenantScope);
  keys.forEach((key) => window.localStorage.removeItem(key));
  return keys.length;
};

export const resetSystemMockStorage = () => {
  if (typeof window === 'undefined') return 0;
  SYSTEM_MOCK_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  return SYSTEM_MOCK_STORAGE_KEYS.length;
};

export const resetAllMockStorage = (tenantScope: string) => (
  resetSystemMockStorage() + resetTenantMockStorage(tenantScope)
);
