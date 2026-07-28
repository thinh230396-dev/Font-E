const SYSTEM_MOCK_STORAGE_KEYS = [
  'salonsys_tenants',
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
    `tenant-admin-online-booking-v1:${tenantName}:channels`,
    `tenant-admin-online-booking-v1:${tenantName}:services`,
    `tenant-admin-sanitation-v1:${tenantName}:checklists`,
    `tenant-admin-sanitation-v1:${tenantName}:batches`,
    `tenant-admin-sanitation-v1:${tenantName}:incidents`,
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
