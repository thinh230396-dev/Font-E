import type { SessionRepository } from '../../../domain/repositories/SessionRepository.js';
import type { UserRepository } from '../../../domain/repositories/UserRepository.js';
import type {
  GetCurrentAccountInputDTO,
  GetCurrentAccountOutputDTO
} from '../../dto/auth/SessionDTO.js';
import { UnauthenticatedError } from '../../errors/ApplicationError.js';
import { AccountMapper } from '../../mappers/AccountMapper.js';
import type { Clock } from '../../ports/Clock.js';

/**
 * Đọc tài khoản của phiên hiện tại.
 *
 * **BR-AUTH-022 nằm ở đây.** Trạng thái tài khoản được kiểm tra lại ở mỗi lần đọc
 * phiên, không chỉ lúc đăng nhập. Nhờ vậy tài khoản vừa bị chuyển sang `SUSPENDED`
 * mất quyền ngay ở request kế tiếp, thay vì dùng tiếp tới khi phiên hết hạn.
 *
 * Từ ngày 3, middleware xác thực sẽ gọi chính use case này, nên đừng nhân bản
 * phép kiểm tra ở chỗ khác.
 */
export class GetCurrentAccountUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock
  ) {}

  async execute(input: GetCurrentAccountInputDTO): Promise<GetCurrentAccountOutputDTO> {
    if (!input.sessionId) throw new UnauthenticatedError();

    const now = this.clock.now();
    const session = await this.sessions.findById(input.sessionId);
    if (!session || !session.isValidAt(now)) throw new UnauthenticatedError();

    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthenticatedError();

    // BR-AUTH-021 + BR-AUTH-022 — tài khoản không còn ACTIVE thì phiên hết giá trị.
    if (!user.isActive()) {
      throw new UnauthenticatedError('Tài khoản đã bị khóa hoặc vô hiệu hóa.');
    }

    session.touch(now);
    await this.sessions.save(session);

    return {
      account: AccountMapper.toDTO(user),
      activeTenantId: session.activeTenantId
    };
  }
}
