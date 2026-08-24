import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type {
  CookieInstruction,
  HttpRequest,
  HttpResponse
} from '../../adapters/http/HttpTypes.js';

/**
 * Đọc cookie từ header.
 *
 * Tự viết thay vì dùng gói `cookie-parser`: cả nhu cầu chỉ gói gọn trong mười dòng,
 * và mỗi dependency thêm vào là một thứ nữa phải giải thích khi bảo vệ.
 */
export const parseCookies = (header: string | undefined): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!header) return result;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name.length === 0) continue;

    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }

  return result;
};

const serializeCookie = (cookie: CookieInstruction, secure: boolean): string => {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Path=${cookie.path}`,
    `SameSite=${cookie.sameSite}`,
    `Max-Age=${cookie.maxAgeSeconds}`
  ];
  if (cookie.httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
};

const asStringRecord = (source: unknown): Record<string, string> => {
  const result: Record<string, string> = {};
  if (typeof source !== 'object' || source === null) return result;

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
};

export const toHttpRequest = <T>(request: Request): HttpRequest<T> => ({
  body: request.body as T,
  params: asStringRecord(request.params),
  query: asStringRecord(request.query),
  cookies: parseCookies(request.headers.cookie),
  headers: request.headers as Record<string, string | undefined>,
  ip: request.ip ?? null
});

export const applyHttpResponse = (
  response: Response,
  result: HttpResponse<unknown>,
  secureCookies: boolean
): void => {
  for (const cookie of result.cookies ?? []) {
    response.append('Set-Cookie', serializeCookie(cookie, secureCookies));
  }

  response.setHeader('Cache-Control', 'no-store');

  if (result.status === 204 || result.body === null) {
    response.status(result.status).end();
    return;
  }

  response.status(result.status).json(result.body);
};

/**
 * Bọc một phương thức của controller thành `RequestHandler` của Express.
 *
 * Đây là toàn bộ chỗ tiếp xúc giữa Express và phần còn lại của hệ thống. Lỗi được
 * đẩy sang `next` để `errorHandler` xử lý tập trung, thay vì mỗi route tự bắt.
 */
export const adapt =
  <T>(
    handler: (request: HttpRequest<T>) => Promise<HttpResponse<unknown>>,
    secureCookies: boolean
  ): RequestHandler =>
  (request: Request, response: Response, next: NextFunction) => {
    handler(toHttpRequest<T>(request))
      .then((result) => applyHttpResponse(response, result, secureCookies))
      .catch(next);
  };
