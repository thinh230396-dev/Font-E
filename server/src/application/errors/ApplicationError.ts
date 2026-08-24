import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCode } from '../../shared/errors/ErrorCode.js';

/**
 * Lỗi phát sinh từ một tình huống sử dụng cụ thể, khác với `DomainError` vốn nói
 * rằng bản thân dữ liệu đã sai.
 */
export class ApplicationError extends AppError {}

/**
 * Sai tài khoản hoặc mật khẩu.
 *
 * Thông điệp cố ý không nói rõ sai ở đâu — nói "email không tồn tại" là để lộ
 * tài khoản nào có thật trong hệ thống.
 */
export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, 'Tài khoản hoặc mật khẩu không đúng.');
  }
}

/** Khóa tạm sau khi nhập sai quá số lần cho phép. */
export class AccountLockedError extends ApplicationError {
  constructor(readonly lockedUntil: Date) {
    super(
      ErrorCode.ACCOUNT_LOCKED,
      'Tài khoản đang tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.'
    );
  }
}

/** BR-AUTH-021 — tài khoản SUSPENDED hoặc INACTIVE không đăng nhập được. */
export class AccountNotActiveError extends ApplicationError {
  constructor() {
    super(
      ErrorCode.ACCOUNT_NOT_ACTIVE,
      'Tài khoản chưa được kích hoạt hoặc đang bị khóa. Liên hệ quản trị viên để được mở lại.'
    );
  }
}

/** Chưa đăng nhập, phiên hết hạn, hoặc phiên đã bị thu hồi. */
export class UnauthenticatedError extends ApplicationError {
  constructor(message = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.') {
    super(ErrorCode.UNAUTHENTICATED, message);
  }
}

/** Đã đăng nhập nhưng không đủ quyền cho thao tác này. */
export class ForbiddenError extends ApplicationError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super(ErrorCode.FORBIDDEN, message);
  }
}
