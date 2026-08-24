import type { GetCurrentAccountUseCase } from '../../application/use-cases/auth/GetCurrentAccountUseCase.js';
import type { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase.js';
import type { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase.js';
import {
  noContent,
  ok,
  type CookieInstruction,
  type HttpRequest,
  type HttpResponse
} from '../http/HttpTypes.js';

export const SESSION_COOKIE = 'salonsys_session';

const sessionCookie = (value: string, maxAgeSeconds: number): CookieInstruction => ({
  name: SESSION_COOKIE,
  value,
  maxAgeSeconds,
  httpOnly: true,
  sameSite: 'Strict',
  path: '/'
});

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Đọc một trường ra khỏi thân request.
 *
 * Thân request được coi là `unknown` chứ không phải một kiểu đã tin tưởng: nó đến
 * từ bên ngoài, nên mọi giả định về hình dạng của nó phải được kiểm tra chứ không
 * được khai báo.
 */
const field = (body: unknown, name: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[name] : undefined;

/**
 * Chuyển request HTTP thành lệnh gọi use case, rồi chuyển kết quả thành response.
 *
 * Controller cố ý mỏng: nó chỉ đọc dữ liệu ra khỏi hình dạng HTTP và quyết định
 * cookie. Không có quy tắc nghiệp vụ nào ở đây — toàn bộ nằm trong use case.
 * Lỗi thì để ném lên cho `errorHandler` xử lý, không bắt tại chỗ.
 */
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentAccountUseCase: GetCurrentAccountUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  async login(request: HttpRequest): Promise<HttpResponse<unknown>> {
    const { body } = request;

    const result = await this.loginUseCase.execute({
      identifier: asString(field(body, 'identifier')),
      password: asString(field(body, 'password')),
      remember: field(body, 'remember') === true,
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null
    });

    return ok({ account: result.account }, [
      sessionCookie(result.session.id, result.session.maxAgeSeconds)
    ]);
  }

  async session(request: HttpRequest): Promise<HttpResponse<unknown>> {
    const result = await this.getCurrentAccountUseCase.execute({
      sessionId: request.cookies[SESSION_COOKIE] ?? null
    });

    return ok({ account: result.account, activeTenantId: result.activeTenantId });
  }

  async logout(request: HttpRequest): Promise<HttpResponse<unknown>> {
    await this.logoutUseCase.execute({
      sessionId: request.cookies[SESSION_COOKIE] ?? null
    });

    // Max-Age = 0 để trình duyệt xóa cookie ngay.
    return noContent([sessionCookie('', 0)]);
  }
}
