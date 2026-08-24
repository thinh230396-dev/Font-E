import { ErrorCode } from './ErrorCode.js';

/** Một ô nhập bị sai, để frontend gắn thông báo vào đúng chỗ. */
export interface FieldError {
  /** Tên trường đúng như frontend đặt, ví dụ `identifier`, `startAt`, `phone`. */
  field: string;
  message: string;
}

/**
 * Lỗi nghiệp vụ có chủ đích — phân biệt với lỗi lập trình (bug).
 *
 * Cố ý KHÔNG có `httpStatus`: tầng domain và application không được biết gì về HTTP.
 * Việc ánh xạ `code` sang HTTP status nằm ở `adapters/presenters/HttpErrorPresenter.ts`.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields: readonly FieldError[];

  constructor(code: ErrorCode, message: string, fields: readonly FieldError[] = []) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
