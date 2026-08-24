import { AppError, isAppError } from '../../shared/errors/AppError.js';
import { ErrorCode } from '../../shared/errors/ErrorCode.js';
import type { HttpResponse } from '../http/HttpTypes.js';

/** Thân lỗi trả về, đúng contract đã chốt ở README-BACKEND-ROADMAP.md §0 mục 4. */
export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    fields: { field: string; message: string }[];
  };
}

/**
 * Ánh xạ mã lỗi sang HTTP status.
 *
 * **Đây là nơi duy nhất trong hệ thống biết tới HTTP status.** Tầng domain và
 * application chỉ ném ra mã lỗi nghiệp vụ; chúng không cần biết HTTP tồn tại.
 *
 * Ghi chú về 401: `INVALID_CREDENTIALS` và `UNAUTHENTICATED` cùng trả 401 nhưng
 * mang mã khác nhau, vì frontend xử lý hai việc khác nhau — sai mật khẩu thì hiện
 * lỗi ngay tại form, còn phiên hết hạn thì đưa về màn đăng nhập
 * (README-MIGRATION.md §12.4).
 */
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_FAILED]: 422,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.ACCOUNT_LOCKED]: 423,
  [ErrorCode.ACCOUNT_NOT_ACTIVE]: 403,
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.TENANT_READONLY]: 403,
  [ErrorCode.LIMIT_EXCEEDED]: 409,
  [ErrorCode.SLOT_CONFLICT]: 409,
  [ErrorCode.INTERNAL]: 500
};

export const HttpErrorPresenter = {
  present(error: unknown): HttpResponse<ErrorResponseBody> {
    if (isAppError(error)) {
      return {
        status: STATUS_BY_CODE[error.code] ?? 500,
        body: {
          error: {
            code: error.code,
            message: error.message,
            fields: error.fields.map((item) => ({ ...item }))
          }
        }
      };
    }

    // Lỗi ngoài dự kiến: không bao giờ để lộ thông điệp gốc hay stack trace ra
    // ngoài. Chi tiết chỉ ghi vào log của máy chủ.
    return {
      status: 500,
      body: {
        error: {
          code: ErrorCode.INTERNAL,
          message: 'Máy chủ gặp sự cố. Vui lòng thử lại.',
          fields: []
        }
      }
    };
  },

  /** Dùng khi cần dựng lỗi thẳng từ mã, không qua exception. */
  fromCode(code: ErrorCode, message: string): HttpResponse<ErrorResponseBody> {
    return HttpErrorPresenter.present(new AppError(code, message));
  }
};
