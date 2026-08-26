export type PortalRole = 'SUPERADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST';

export interface DemoAccount {
  email: string;
  role: PortalRole;
  displayName: string;
  tenantId?: string;
  tenantName?: string;
  /**
   * Mã chi nhánh mà tài khoản lễ tân làm việc, đọc từ hồ sơ nhân viên (BR-EMP-004).
   *
   * Là `string` chứ không phải hai giá trị `'Q1' | 'Q3'` như trước: mã chi nhánh do Superadmin
   * và chủ tiệm tự đặt lúc lập chi nhánh, nên tập giá trị của nó là mở. Bộ nạp dữ liệu mẫu
   * vẫn dùng đúng hai mã ấy cho Nailé Studio, và các màn hình mức C vẫn dựa vào chúng — xem
   * việc còn treo số 2 sau ngày 6.
   */
  branchCode?: string;
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
