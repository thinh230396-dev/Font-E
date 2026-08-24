import { DomainError } from '../errors/DomainError.js';

/** BR-VAL-001 — email tài khoản phải đúng định dạng và duy nhất toàn hệ thống. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LENGTH = 254;

/**
 * Email đã được kiểm tra định dạng. Đã tạo được đối tượng này thì không cần
 * kiểm tra lại ở bất kỳ đâu phía sau.
 */
export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string, field = 'email'): Email {
    const normalized = raw.trim().toLowerCase();
    if (normalized.length === 0) {
      throw DomainError.field(field, 'Email không được để trống.');
    }
    if (normalized.length > MAX_LENGTH) {
      throw DomainError.field(field, `Email không được dài quá ${MAX_LENGTH} ký tự.`);
    }
    if (!EMAIL_PATTERN.test(normalized)) {
      throw DomainError.field(field, 'Email không đúng định dạng.');
    }
    return new Email(normalized);
  }

  /** Dùng khi đọc từ database — dữ liệu đã hợp lệ lúc ghi vào. */
  static fromPersistence(value: string): Email {
    return new Email(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
