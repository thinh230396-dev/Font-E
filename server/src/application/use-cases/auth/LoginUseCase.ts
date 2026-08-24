import { Session } from '../../../domain/entities/Session.js';
import { sessionLifetimeSeconds } from '../../../domain/policies/AuthPolicy.js';
import type { SessionRepository } from '../../../domain/repositories/SessionRepository.js';
import type { UserRepository } from '../../../domain/repositories/UserRepository.js';
import { DomainError } from '../../../domain/errors/DomainError.js';
import type { LoginInputDTO, LoginOutputDTO } from '../../dto/auth/LoginDTO.js';
import {
  AccountLockedError,
  AccountNotActiveError,
  InvalidCredentialsError
} from '../../errors/ApplicationError.js';
import { AccountMapper } from '../../mappers/AccountMapper.js';
import type { Clock } from '../../ports/Clock.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { PasswordHasher } from '../../ports/PasswordHasher.js';

/**
 * Đăng nhập bằng email hoặc username.
 *
 * Thứ tự kiểm tra không được đảo:
 *   1. Tìm được tài khoản không?
 *   2. Có đang bị khóa tạm không?          → khóa tạm thắng cả mật khẩu đúng
 *   3. Tài khoản có ACTIVE không?          → BR-AUTH-021
 *   4. Mật khẩu có đúng không?             → sai thì cộng dồn số lần sai
 *
 * Bước 2 phải đứng trước bước 4, nếu không thì việc khóa tạm trở nên vô nghĩa:
 * người tấn công cứ thử tiếp và vẫn biết được lúc nào đoán trúng.
 */
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(input: LoginInputDTO): Promise<LoginOutputDTO> {
    const identifier = input.identifier.trim().toLowerCase();

    const missing: { field: string; message: string }[] = [];
    if (identifier.length === 0) {
      missing.push({ field: 'identifier', message: 'Nhập email hoặc tên đăng nhập.' });
    }
    if (input.password.length === 0) {
      missing.push({ field: 'password', message: 'Nhập mật khẩu.' });
    }
    if (missing.length > 0) {
      throw new DomainError('Thiếu thông tin đăng nhập.', missing);
    }

    const now = this.clock.now();
    const user = await this.users.findByIdentifier(identifier);

    // Không phân biệt "không có tài khoản" với "sai mật khẩu" — nói rõ là để lộ
    // email nào có thật trong hệ thống.
    if (!user) throw new InvalidCredentialsError();

    if (user.isLockedAt(now)) {
      throw new AccountLockedError(user.lockedUntil as Date);
    }

    if (!user.isActive()) throw new AccountNotActiveError();

    const matches = await this.hasher.verify(input.password, {
      hash: user.passwordHash,
      salt: user.passwordSalt
    });

    if (!matches) {
      user.registerFailedAttempt(now);
      await this.users.save(user);
      throw new InvalidCredentialsError();
    }

    user.registerSuccessfulLogin(now);
    await this.users.save(user);

    const lifetimeSeconds = sessionLifetimeSeconds(input.remember);
    const session = Session.issue({
      id: this.ids.generate(),
      userId: user.id,
      now,
      lifetimeSeconds,
      ip: input.ip,
      userAgent: input.userAgent
    });
    await this.sessions.create(session);

    return {
      account: AccountMapper.toDTO(user),
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        maxAgeSeconds: lifetimeSeconds
      }
    };
  }
}
