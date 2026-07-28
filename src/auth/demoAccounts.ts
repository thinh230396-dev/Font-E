export type PortalRole = 'SUPERADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST';

export interface DemoAccount {
  email: string;
  role: PortalRole;
  displayName: string;
  tenantId?: string;
  tenantName?: string;
  branchCode?: 'Q1' | 'Q3';
  branchName?: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'superadmin@salonsys.vn',
    role: 'SUPERADMIN',
    displayName: 'Superadmin'
  },
  {
    email: 'tenantadmin@lumierehair.vn',
    role: 'TENANT_ADMIN',
    displayName: 'Nguyễn Văn Boss',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio'
  },
  {
    email: 'receptionist@nailestudio.vn',
    role: 'RECEPTIONIST',
    displayName: 'Lê Hoàng Nam',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio',
    branchCode: 'Q3',
    branchName: 'Nailé Studio · Chi nhánh Quận 3'
  }
];

export const getDemoAccountByRole = (role: PortalRole): DemoAccount => {
  return DEMO_ACCOUNTS.find((account) => account.role === role) || DEMO_ACCOUNTS[0];
};
