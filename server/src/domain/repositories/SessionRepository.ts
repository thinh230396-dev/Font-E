import type { Session } from '../entities/Session.js';

/**
 * Cổng (port) ra kho dữ liệu phiên đăng nhập.
 *
 * Cố ý không có hàm xóa: đăng xuất là **thu hồi** phiên (`revokedAt`), không phải
 * xóa bản ghi. Điều này nhất quán với BR-DEL-001 — không có gì bị xóa cứng khỏi
 * database — và giữ lại được lịch sử phiên cho màn hình thu hồi phiên về sau.
 */
export interface SessionRepository {
  create(session: Session): Promise<void>;

  findById(id: string): Promise<Session | null>;

  save(session: Session): Promise<void>;
}
