export type PortalRole = 'SUPERADMIN' | 'TENANT_ADMIN';

export interface DemoAccount {
  email: string;
  password: string;
  role: PortalRole;
  displayName: string;
  tenantName?: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'superadmin@salonsys.vn',
    password: 'Super@2026',
    role: 'SUPERADMIN',
    displayName: 'Superadmin'
  },
  {
    email: 'tenantadmin@lumierehair.vn',
    password: 'Lumiere@2026',
    role: 'TENANT_ADMIN',
    displayName: 'Nguyễn Văn Boss',
    tenantName: 'Nailé Studio'
  }
];

export const authenticateDemoAccount = (identifier: string, password: string): DemoAccount | null => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalizedIdentifier && account.password === password) || null;
};

export const getDemoAccountByRole = (role: PortalRole): DemoAccount => {
  return DEMO_ACCOUNTS.find((account) => account.role === role) || DEMO_ACCOUNTS[0];
};
