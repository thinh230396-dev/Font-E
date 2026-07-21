export type PortalRole = 'SUPERADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST';

export interface DemoAccount {
  email: string;
  password: string;
  role: PortalRole;
  displayName: string;
  tenantName?: string;
  branchCode?: 'Q1' | 'Q3';
  branchName?: string;
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
  },
  {
    email: 'receptionist@nailestudio.vn',
    password: 'Reception@2026',
    role: 'RECEPTIONIST',
    displayName: 'Lê Hoàng Nam',
    tenantName: 'Nailé Studio',
    branchCode: 'Q3',
    branchName: 'Nailé Studio · Chi nhánh Quận 3'
  }
];

export const authenticateDemoAccount = (identifier: string, password: string): DemoAccount | null => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalizedIdentifier && account.password === password) || null;
};

export const getDemoAccountByRole = (role: PortalRole): DemoAccount => {
  return DEMO_ACCOUNTS.find((account) => account.role === role) || DEMO_ACCOUNTS[0];
};
