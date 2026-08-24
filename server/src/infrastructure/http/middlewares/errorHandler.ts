import type { ErrorRequestHandler, RequestHandler } from 'express';

import { HttpErrorPresenter } from '../../../adapters/presenters/HttpErrorPresenter.js';
import { ErrorCode } from '../../../shared/errors/ErrorCode.js';
import { isAppError } from '../../../shared/errors/AppError.js';
import { applyHttpResponse } from '../expressAdapter.js';

/** Đường dẫn không khớp route nào. Trả đúng contract lỗi, không trả HTML mặc định của Express. */
export const notFoundHandler = (secureCookies: boolean): RequestHandler => (request, response) => {
  applyHttpResponse(
    response,
    HttpErrorPresenter.fromCode(
      ErrorCode.NOT_FOUND,
      `Không có endpoint ${request.method} ${request.path}.`
    ),
    secureCookies
  );
};

/**
 * Điểm xử lý lỗi duy nhất của tầng HTTP.
 *
 * Lỗi nghiệp vụ (`AppError`) được trình bày theo contract. Lỗi ngoài dự kiến thì
 * ghi đầy đủ vào log máy chủ nhưng chỉ trả ra ngoài một câu chung — stack trace
 * lộ ra ngoài vừa vô dụng với người dùng vừa giúp ích cho người dò lỗ hổng.
 */
export const errorHandler = (secureCookies: boolean): ErrorRequestHandler => (
  error,
  request,
  response,
  _next
) => {
  if (!isAppError(error)) {
    console.error(`[api] Lỗi không lường trước tại ${request.method} ${request.path}`, error);
  }

  applyHttpResponse(response, HttpErrorPresenter.present(error), secureCookies);
};
