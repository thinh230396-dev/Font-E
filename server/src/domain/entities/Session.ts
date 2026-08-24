export interface SessionProps {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActive: Date;
  revokedAt: Date | null;
  ip: string | null;
  userAgent: string | null;
  /**
   * BR-AUTH-024 — tiệm đang làm việc nằm trong phiên, không đính kèm theo từng request.
   * Ngày 1 luôn null; ngày 3 mới có endpoint đặt giá trị này (BR-AUTH-025/026).
   */
  activeTenantId: string | null;
}

/**
 * Phiên đăng nhập. Cột `activeTenantId`, `ip`, `userAgent`, `lastActive`, `revokedAt`
 * theo đúng quyết định ở README-MIGRATION.md §8.5 — mở rộng `app_sessions` chứ
 * không tạo bảng phiên thứ hai.
 */
export class Session {
  private constructor(private props: SessionProps) {}

  static issue(input: {
    id: string;
    userId: string;
    now: Date;
    lifetimeSeconds: number;
    ip: string | null;
    userAgent: string | null;
  }): Session {
    return new Session({
      id: input.id,
      userId: input.userId,
      createdAt: input.now,
      expiresAt: new Date(input.now.getTime() + input.lifetimeSeconds * 1000),
      lastActive: input.now,
      revokedAt: null,
      ip: input.ip,
      userAgent: input.userAgent,
      activeTenantId: null
    });
  }

  static fromPersistence(props: SessionProps): Session {
    return new Session({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get lastActive(): Date {
    return this.props.lastActive;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
  get ip(): string | null {
    return this.props.ip;
  }
  get userAgent(): string | null {
    return this.props.userAgent;
  }
  get activeTenantId(): string | null {
    return this.props.activeTenantId;
  }

  /** Còn dùng được: chưa hết hạn và chưa bị thu hồi. */
  isValidAt(now: Date): boolean {
    if (this.props.revokedAt !== null) return false;
    return this.props.expiresAt.getTime() > now.getTime();
  }

  touch(now: Date): void {
    this.props.lastActive = now;
  }

  revoke(now: Date): void {
    this.props.revokedAt = now;
  }

  /** Số giây còn lại, để tầng ngoài đặt Max-Age cho cookie. */
  remainingSeconds(now: Date): number {
    return Math.max(0, Math.floor((this.props.expiresAt.getTime() - now.getTime()) / 1000));
  }
}
