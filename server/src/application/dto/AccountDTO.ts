import type { UserRole } from '../../domain/entities/User.js';

/**
 * Hình dạng tài khoản mà frontend nhận được.
 *
 * Khớp đúng `DemoAccount` ở `src/auth/demoAccounts.ts` để việc chuyển backend từ
 * Cloudflare Worker sang Express không làm vỡ giao diện đang chạy.
 *
 * DTO cố ý **không** phải entity `User`: entity có `passwordHash`, `passwordSalt`,
 * `failedAttempts` — những thứ không bao giờ được ra khỏi máy chủ. Tách DTO là hàng
 * rào ngăn chuyện đó xảy ra do vô ý.
 */
export interface AccountDTO {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  tenantId?: string;
  tenantName?: string;
  branchCode?: string;
  branchName?: string;
}
