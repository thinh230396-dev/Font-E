import { User, type AccountStatus, type UserRole } from '../../../domain/entities/User.js';
import { Email } from '../../../domain/value-objects/Email.js';
import type { DatabaseRow } from '../../../application/ports/DatabaseClient.js';

export interface UserRow extends DatabaseRow {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  password_salt: string;
  role: string;
  display_name: string;
  status: string;
  failed_attempts: number;
  locked_until: string | null;
  staff_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  branch_code: string | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
}

const toDate = (value: string | null): Date | null => (value ? new Date(value) : null);

/** Dịch giữa dòng SQL và entity. Đây là ranh giới giữa hình dạng bảng và hình dạng nghiệp vụ. */
export const UserRowMapper = {
  toDomain(row: UserRow): User {
    return User.fromPersistence({
      id: row.id,
      email: Email.fromPersistence(row.email),
      username: row.username,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      role: row.role as UserRole,
      displayName: row.display_name,
      status: row.status as AccountStatus,
      failedAttempts: Number(row.failed_attempts ?? 0),
      lockedUntil: toDate(row.locked_until),
      staffId: row.staff_id,
      scope: {
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        branchCode: row.branch_code,
        branchName: row.branch_name
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
};
