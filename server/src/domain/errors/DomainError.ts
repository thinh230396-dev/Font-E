import { AppError, type FieldError } from '../../shared/errors/AppError.js';
import { ErrorCode } from '../../shared/errors/ErrorCode.js';

/**
 * Vi phạm một quy tắc nghiệp vụ cốt lõi — thứ luôn đúng bất kể ứng dụng nào dùng
 * đến entity này. Ví dụ: email sai định dạng, mật khẩu ngắn hơn 8 ký tự (BR-VAL-001).
 *
 * Khác với `ApplicationError`: lỗi ở đây thuộc về bản thân dữ liệu, không phụ thuộc
 * vào tình huống sử dụng.
 */
export class DomainError extends AppError {
  constructor(message: string, fields: readonly FieldError[] = []) {
    super(ErrorCode.VALIDATION_FAILED, message, fields);
  }

  /** Lỗi gắn với đúng một ô nhập. */
  static field(field: string, message: string): DomainError {
    return new DomainError(message, [{ field, message }]);
  }
}
