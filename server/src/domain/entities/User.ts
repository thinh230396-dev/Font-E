import { AuthPolicy } from '../policies/AuthPolicy.js';
import type { AccountScope } from '../value-objects/AccountScope.js';
import type { Email } from '../value-objects/Email.js';

/** BR-AUTH-001 — hệ thống có đúng 3 vai trò đăng nhập. */
export const UserRole = {
  SUPERADMIN: 'SUPERADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  RECEPTIONIST: 'RECEPTIONIST'
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** BR-AUTH-020 — tài khoản có 3 trạng thái. `INACTIVE` là kết quả của thao tác "xóa". */
export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE'
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export interface UserProps {
  id: string;
  email: Email;
  username: string | null;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  displayName: string;
  status: AccountStatus;
  failedAttempts: number;
  lockedUntil: Date | null;
  /**
   * BR-AUTH-013/014 — chỉ tài khoản RECEPTIONIST mới trỏ tới một hồ sơ nhân viên.
   * SUPERADMIN và TENANT_ADMIN luôn null, do đó không thuộc chi nhánh nào.
   */
  staffId: string | null;
  /** ⚠️ Tạm thời — xem ghi chú ở `AccountScope`, ngày 3 sẽ thay bằng `user_tenants`. */
  scope: AccountScope;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tài khoản đăng nhập. Entity này giữ các quy tắc luôn đúng về một tài khoản,
 * bất kể ai đang gọi tới: khi nào thì đăng nhập được, khi nào thì bị khóa.
 */
export class User {
  private constructor(private props: UserProps) {}

  static fromPersistence(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get username(): string | null {
    return this.props.username;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get displayName(): string {
    return this.props.displayName;
  }
  get status(): AccountStatus {
    return this.props.status;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get passwordSalt(): string {
    return this.props.passwordSalt;
  }
  get failedAttempts(): number {
    return this.props.failedAttempts;
  }
  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }
  get staffId(): string | null {
    return this.props.staffId;
  }
  get scope(): AccountScope {
    return this.props.scope;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * BR-AUTH-021 — chỉ tài khoản ACTIVE mới đăng nhập được.
   * BR-AUTH-022 — phép kiểm tra này còn được gọi lại ở MỖI lần đọc phiên, không
   * chỉ lúc đăng nhập, nên tài khoản bị khóa mất quyền ngay ở request kế tiếp.
   */
  isActive(): boolean {
    return this.props.status === AccountStatus.ACTIVE;
  }

  /** Đang trong thời gian khóa tạm vì nhập sai quá nhiều lần. */
  isLockedAt(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil.getTime() > now.getTime();
  }

  /**
   * Ghi nhận một lần nhập sai. Chạm ngưỡng thì khóa tạm và đặt lại bộ đếm về 0,
   * để sau khi hết hạn khóa người dùng lại có đủ số lần thử.
   */
  registerFailedAttempt(now: Date): void {
    const attempts = this.props.failedAttempts + 1;
    const reachedLimit = attempts >= AuthPolicy.maxFailedAttempts;

    this.props.failedAttempts = reachedLimit ? 0 : attempts;
    this.props.lockedUntil = reachedLimit
      ? new Date(now.getTime() + AuthPolicy.lockMinutes * 60_000)
      : null;
    this.props.updatedAt = now;
  }

  /** Đăng nhập thành công thì xóa sạch dấu vết của các lần sai trước đó. */
  registerSuccessfulLogin(now: Date): void {
    this.props.failedAttempts = 0;
    this.props.lockedUntil = null;
    this.props.updatedAt = now;
  }
}
