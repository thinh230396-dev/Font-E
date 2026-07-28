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

let tenantAdminDataMode: 'demo' | 'live' = 'live';

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
  if (tenantAdminDataMode === 'demo') {
    if (!stored?.length) return mockSeed;
    const storedIdentities = new Set(stored.map(getRecordIdentity).filter(Boolean));
    return [
      ...mockSeed.filter((item) => {
        const identity = getRecordIdentity(item);
        return !identity || !storedIdentities.has(identity);
      }),
      ...stored
    ];
  }
  if (!stored) return [];

  const mockIdentities = new Set(mockSeed.map(getRecordIdentity).filter(Boolean));
  if (mockIdentities.size === 0) return stored;
  return stored.filter((item) => !mockIdentities.has(getRecordIdentity(item)));
};

export const getTenantMockStorageKeys = (tenantName: string) => {
  const tenantBaseKeys = [
    `tenant-admin-appointments-v2:${tenantName}`,
    `tenant-admin-payments-v1:${tenantName}`,
    `tenant-admin-customers-v1:${tenantName}`,
    `tenant-admin-stations-v2:${tenantName}`,
    `tenant-admin-staff-v2:${tenantName}`,
    `receptionist-technicians-v1:${tenantName}`,
    `receptionist-products-v1:${tenantName}`,
    `receptionist-product-reports-v1:${tenantName}`,
    `receptionist-stations-v1:${tenantName}`,
    `tenant-admin-services-v2:${tenantName}`,
    `tenant-admin-inventory-v1:${tenantName}`,
    `tenant-admin-loyalty-v1:${tenantName}`,
    `tenant-admin-customer-care-v1:${tenantName}`,
    `tenant-admin-finance-v1:${tenantName}:transactions`,
    `tenant-admin-finance-v1:${tenantName}:budgets`,
    `tenant-admin-online-booking-v1:${tenantName}:channels`,
    `tenant-admin-online-booking-v1:${tenantName}:services`,
    `tenant-admin-sanitation-v1:${tenantName}:checklists`,
    `tenant-admin-sanitation-v1:${tenantName}:batches`,
    `tenant-admin-sanitation-v1:${tenantName}:incidents`,
    `tenant-admin-sanitation-v1:${tenantName}:certificates`,
    `tenant-admin-nail-designs-v1:${tenantName}`,
    `tenant-admin-nail-colors-v1:${tenantName}`,
  ];

  return tenantBaseKeys;
};

export const resetTenantMockStorage = (tenantName: string) => {
  if (typeof window === 'undefined') return 0;
  const keys = getTenantMockStorageKeys(tenantName);
  keys.forEach((key) => window.localStorage.removeItem(key));
  return keys.length;
};

export const resetSystemMockStorage = () => {
  if (typeof window === 'undefined') return 0;
  SYSTEM_MOCK_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  return SYSTEM_MOCK_STORAGE_KEYS.length;
};

export const resetAllMockStorage = (tenantName: string) => (
  resetSystemMockStorage() + resetTenantMockStorage(tenantName)
);
