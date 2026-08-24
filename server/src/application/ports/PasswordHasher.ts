import type { RawPassword } from '../../domain/value-objects/RawPassword.js';

export interface HashedPassword {
  hash: string;
  salt: string;
}

/**
 * Cổng băm mật khẩu.
 *
 * Là cổng của tầng application chứ không phải domain, vì "băm bằng thuật toán nào"
 * là quyết định kỹ thuật, không phải quy tắc nghiệp vụ. Đổi thuật toán chỉ cần
 * thay bản cài đặt ở tầng infrastructure, không đụng tới use case.
 */
export interface PasswordHasher {
  hash(password: RawPassword): Promise<HashedPassword>;

  /** So sánh phải chống được tấn công đo thời gian. */
  verify(password: string, hashed: HashedPassword): Promise<boolean>;
}
