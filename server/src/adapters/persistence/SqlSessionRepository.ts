import type { DatabaseClient, DatabaseRow } from '../../application/ports/DatabaseClient.js';
import { Session } from '../../domain/entities/Session.js';
import type { SessionRepository } from '../../domain/repositories/SessionRepository.js';

interface SessionRow extends DatabaseRow {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active: string;
  revoked_at: string | null;
  ip: string | null;
  user_agent: string | null;
  active_tenant_id: string | null;
}

const toDomain = (row: SessionRow): Session =>
  Session.fromPersistence({
    id: row.id,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    lastActive: new Date(row.last_active),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    ip: row.ip,
    userAgent: row.user_agent,
    activeTenantId: row.active_tenant_id
  });

export class SqlSessionRepository implements SessionRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(session: Session): Promise<void> {
    await this.db.execute(
      `INSERT INTO app_sessions (
         id, user_id, created_at, expires_at, last_active, revoked_at,
         ip, user_agent, active_tenant_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.userId,
        session.createdAt.toISOString(),
        session.expiresAt.toISOString(),
        session.lastActive.toISOString(),
        session.revokedAt ? session.revokedAt.toISOString() : null,
        session.ip,
        session.userAgent,
        session.activeTenantId
      ]
    );
  }

  async findById(id: string): Promise<Session | null> {
    const row = await this.db.queryOne<SessionRow>(
      `SELECT id, user_id, created_at, expires_at, last_active, revoked_at,
              ip, user_agent, active_tenant_id
       FROM app_sessions WHERE id = ?`,
      [id]
    );
    return row ? toDomain(row) : null;
  }

  async save(session: Session): Promise<void> {
    await this.db.execute(
      `UPDATE app_sessions
       SET expires_at = ?, last_active = ?, revoked_at = ?, active_tenant_id = ?
       WHERE id = ?`,
      [
        session.expiresAt.toISOString(),
        session.lastActive.toISOString(),
        session.revokedAt ? session.revokedAt.toISOString() : null,
        session.activeTenantId,
        session.id
      ]
    );
  }
}
