import { User, type AccountStatus, type UserRole } from '../../domain/entities/User.js';
import { Email } from '../../domain/value-objects/Email.js';
import { RawPassword } from '../../domain/value-objects/RawPassword.js';
import type { Container } from '../di/Container.js';

interface DemoAccountSeed {
  id: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  tenantId: string | null;
  tenantName: string | null;
  branchCode: string | null;
  branchName: string | null;
}

/**
 * Ba tài khoản demo, giữ nguyên email và mật khẩu của backend cũ
 * (`scripts/vite-local-auth.ts`) để không phải sửa gì ở màn hình đăng nhập.
 */
const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  {
    id: 'USR-SUPERADMIN',
    email: 'superadmin@salonsys.vn',
    username: 'superadmin',
    password: 'Super@2026',
    role: 'SUPERADMIN',
    displayName: 'Superadmin',
    tenantId: null,
    tenantName: null,
    branchCode: null,
    branchName: null
  },
  {
    id: 'USR-TENANT-LUMIERE',
    email: 'tenantadmin@lumierehair.vn',
    username: 'nguyenvanboss',
    password: 'Lumiere@2026',
    role: 'TENANT_ADMIN',
    displayName: 'Nguyễn Văn Boss',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio',
    branchCode: null,
    branchName: null
  },
  {
    id: 'USR-RECEPTION-NAILE',
    email: 'receptionist@nailestudio.vn',
    username: 'receptionist',
    password: 'Reception@2026',
    role: 'RECEPTIONIST',
    displayName: 'Lê Hoàng Nam',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio',
    branchCode: 'Q3',
    branchName: 'Nailé Studio · Chi nhánh Quận 3'
  }
];

/**
 * Nạp tài khoản demo, chỉ khi bảng còn trống.
 *
 * Điều kiện "chỉ khi trống" là cố ý: chạy lại máy chủ không được ghi đè mật khẩu
 * mà người dùng đã đổi, và cũng không được mở lại tài khoản đã bị khóa.
 */
export const seedDemoAccounts = async (container: Container): Promise<number> => {
  const existing = await container.users.countAll();
  if (existing > 0) return 0;

  const now = container.clock.now();

  for (const seed of DEMO_ACCOUNTS) {
    const hashed = await container.hasher.hash(RawPassword.create(seed.password));

    const user = User.fromPersistence({
      id: seed.id,
      email: Email.create(seed.email),
      username: seed.username,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      role: seed.role,
      displayName: seed.displayName,
      status: 'ACTIVE' as AccountStatus,
      failedAttempts: 0,
      lockedUntil: null,
      staffId: null,
      scope: {
        tenantId: seed.tenantId,
        tenantName: seed.tenantName,
        branchCode: seed.branchCode,
        branchName: seed.branchName
      },
      createdAt: now,
      updatedAt: now
    });

    await container.users.save(user);
  }

  return DEMO_ACCOUNTS.length;
};
