/**
 * Hình dạng request/response độc lập với framework.
 *
 * Nhờ lớp này mà controller ở `adapters/controllers/` không import Express. Muốn
 * đổi sang Fastify hay muốn gọi thẳng controller trong test thì chỉ cần dựng một
 * đối tượng thuần, không cần dựng máy chủ HTTP.
 */
export interface HttpRequest<TBody = unknown> {
  body: TBody;
  params: Record<string, string>;
  query: Record<string, string>;
  cookies: Record<string, string>;
  headers: Record<string, string | undefined>;
  ip: string | null;
}

/** Lệnh đặt hoặc xóa cookie, để tầng ngoài dịch sang header `Set-Cookie`. */
export interface CookieInstruction {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
  path: string;
}

export interface HttpResponse<TBody = unknown> {
  status: number;
  body: TBody;
  cookies?: CookieInstruction[];
}

export const ok = <T>(body: T, cookies?: CookieInstruction[]): HttpResponse<T> => ({
  status: 200,
  body,
  ...(cookies ? { cookies } : {})
});

export const noContent = (cookies?: CookieInstruction[]): HttpResponse<null> => ({
  status: 204,
  body: null,
  ...(cookies ? { cookies } : {})
});
