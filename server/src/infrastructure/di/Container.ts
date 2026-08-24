import { AuthController } from '../../adapters/controllers/AuthController.js';
import { SqlSessionRepository } from '../../adapters/persistence/SqlSessionRepository.js';
import { SqlUserRepository } from '../../adapters/persistence/SqlUserRepository.js';
import type { Clock } from '../../application/ports/Clock.js';
import type { IdGenerator } from '../../application/ports/IdGenerator.js';
import type { PasswordHasher } from '../../application/ports/PasswordHasher.js';
import { GetCurrentAccountUseCase } from '../../application/use-cases/auth/GetCurrentAccountUseCase.js';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase.js';
import { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase.js';
import type { SessionRepository } from '../../domain/repositories/SessionRepository.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { NodeSqliteClient } from '../database/NodeSqliteClient.js';
import { ScryptPasswordHasher } from '../security/ScryptPasswordHasher.js';
import { CryptoIdGenerator } from '../system/CryptoIdGenerator.js';
import { SystemClock } from '../system/SystemClock.js';

export interface Container {
  db: NodeSqliteClient;
  clock: Clock;
  ids: IdGenerator;
  hasher: PasswordHasher;
  users: UserRepository;
  sessions: SessionRepository;
  authController: AuthController;
}

/**
 * Điểm ráp nối duy nhất của hệ thống (composition root).
 *
 * **Chỉ tệp này biết bản cài đặt cụ thể nào được cắm vào cổng nào.** Mọi tệp khác
 * chỉ khai báo mình cần cổng gì. Muốn test thì gọi hàm này với một `NodeSqliteClient`
 * trỏ vào `:memory:`, hoặc dựng container riêng với đồng hồ giả.
 *
 * Cố ý không dùng thư viện DI: với chín module thì viết tay vẫn đọc được, mà lại
 * không thêm một lớp trừu tượng nữa phải giải thích.
 */
export const createContainer = (db: NodeSqliteClient): Container => {
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const hasher = new ScryptPasswordHasher();

  const users = new SqlUserRepository(db);
  const sessions = new SqlSessionRepository(db);

  const authController = new AuthController(
    new LoginUseCase(users, sessions, hasher, clock, ids),
    new GetCurrentAccountUseCase(users, sessions, clock),
    new LogoutUseCase(sessions, clock)
  );

  return { db, clock, ids, hasher, users, sessions, authController };
};
