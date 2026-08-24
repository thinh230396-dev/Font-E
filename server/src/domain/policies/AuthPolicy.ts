/**
 * Chính sách đăng nhập. Đây là quy tắc nghiệp vụ nên nằm ở tầng domain, không phải
 * biến môi trường — thay đổi những con số này là thay đổi cách hệ thống hành xử,
 * không phải cách nó được triển khai.
 *
 * Giá trị lấy nguyên từ backend hiện có (`scripts/sites-worker.js`) để hành vi
 * không đổi khi chuyển sang Express.
 */
export const AuthPolicy = {
  /** Số lần nhập sai liên tiếp trước khi khóa tạm. */
  maxFailedAttempts: 5,

  /** Thời gian khóa tạm sau khi vượt số lần cho phép. */
  lockMinutes: 15,

  /** Thời hạn phiên thường. */
  sessionHours: 8,

  /** Thời hạn phiên khi người dùng chọn "ghi nhớ đăng nhập". */
  rememberDays: 30
} as const;

export const sessionLifetimeSeconds = (remember: boolean): number =>
  remember ? AuthPolicy.rememberDays * 86_400 : AuthPolicy.sessionHours * 3_600;
