import { DomainError } from '../errors/DomainError.js';

/** BR-VAL-001 — mật khẩu tối thiểu 8 ký tự, giá trị cố định, không cấu hình được. */
const MIN_LENGTH = 8;
const MAX_LENGTH = 200;

/**
 * Mật khẩu dạng chữ, chưa băm. Chỉ tồn tại trong bộ nhớ đúng lúc đặt hoặc đổi
 * mật khẩu — không bao giờ được ghi xuống database hay ghi ra log.
 *
 * Việc băm nằm ở cổng `PasswordHasher` (tầng application), vì thuật toán băm là
 * lựa chọn kỹ thuật, không phải quy tắc nghiệp vụ.
 */
export class RawPassword {
  private constructor(private readonly value: string) {}

  static create(raw: string, field = 'password'): RawPassword {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw DomainError.field(field, 'Mật khẩu không được để trống.');
    }
    if (raw.length < MIN_LENGTH) {
      throw DomainError.field(field, `Mật khẩu phải có ít nhất ${MIN_LENGTH} ký tự.`);
    }
    if (raw.length > MAX_LENGTH) {
      throw DomainError.field(field, `Mật khẩu không được dài quá ${MAX_LENGTH} ký tự.`);
    }
    return new RawPassword(raw);
  }

  toString(): string {
    return this.value;
  }

  /** Chặn mật khẩu lọt vào log hay JSON.stringify một cách vô ý. */
  toJSON(): string {
    return '[RawPassword]';
  }
}
