import type { SessionRepository } from '../../../domain/repositories/SessionRepository.js';
import type { LogoutInputDTO } from '../../dto/auth/SessionDTO.js';
import type { Clock } from '../../ports/Clock.js';

/**
 * Đăng xuất — thu hồi phiên bằng `revokedAt`, không xóa bản ghi (BR-DEL-001).
 *
 * Cố ý không báo lỗi khi phiên không tồn tại hoặc đã hết hạn: người dùng bấm đăng
 * xuất thì kết quả họ mong đợi là "đã đăng xuất", và đó cũng là kết quả thật.
 */
export class LogoutUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock
  ) {}

  async execute(input: LogoutInputDTO): Promise<void> {
    if (!input.sessionId) return;

    const session = await this.sessions.findById(input.sessionId);
    if (!session || session.revokedAt !== null) return;

    session.revoke(this.clock.now());
    await this.sessions.save(session);
  }
}
