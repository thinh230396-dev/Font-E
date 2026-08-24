import type { DatabaseClient } from '../../application/ports/DatabaseClient.js';
import type { User } from '../../domain/entities/User.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { UserRowMapper, type UserRow } from './mappers/UserRowMapper.js';

const COLUMNS = `
  id, email, username, password_hash, password_salt, role, display_name,
  status, failed_attempts, locked_until, staff_id,
  tenant_id, tenant_name, branch_code, branch_name,
  created_at, updated_at
`;

/**
 * Bản cài đặt `UserRepository` bằng SQL.
 *
 * Không import `node:sqlite`: nó chỉ nói chuyện qua cổng `DatabaseClient`. Nhờ vậy
 * test có thể bơm vào một client chạy SQLite trong bộ nhớ mà không đổi một dòng nào
 * ở đây.
 */
export class SqlUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByIdentifier(identifier: string): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();
    const row = await this.db.queryOne<UserRow>(
      `SELECT ${COLUMNS} FROM app_users
       WHERE lower(email) = ? OR lower(username) = ?`,
      [normalized, normalized]
    );
    return row ? UserRowMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.queryOne<UserRow>(
      `SELECT ${COLUMNS} FROM app_users WHERE id = ?`,
      [id]
    );
    return row ? UserRowMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db.execute(
      `INSERT INTO app_users (
         id, email, username, password_hash, password_salt, role, display_name,
         status, failed_attempts, locked_until, staff_id,
         tenant_id, tenant_name, branch_code, branch_name,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         username = excluded.username,
         password_hash = excluded.password_hash,
         password_salt = excluded.password_salt,
         role = excluded.role,
         display_name = excluded.display_name,
         status = excluded.status,
         failed_attempts = excluded.failed_attempts,
         locked_until = excluded.locked_until,
         staff_id = excluded.staff_id,
         tenant_id = excluded.tenant_id,
         tenant_name = excluded.tenant_name,
         branch_code = excluded.branch_code,
         branch_name = excluded.branch_name,
         updated_at = excluded.updated_at`,
      [
        user.id,
        user.email.toString(),
        user.username,
        user.passwordHash,
        user.passwordSalt,
        user.role,
        user.displayName,
        user.status,
        user.failedAttempts,
        user.lockedUntil ? user.lockedUntil.toISOString() : null,
        user.staffId,
        user.scope.tenantId,
        user.scope.tenantName,
        user.scope.branchCode,
        user.scope.branchName,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString()
      ]
    );
  }

  async countAll(): Promise<number> {
    const row = await this.db.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM app_users');
    return Number(row?.total ?? 0);
  }
}
