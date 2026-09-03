/**
 * Tầng gọi API quản trị phiên đăng nhập — BR-AUTH-032, BR-AUTH-033.
 *
 * Khác `services/auth.ts` ở chỗ căn bản: bên đó nói về phiên **của chính người
 * gọi** — đăng nhập, đọc phiên mình, đăng xuất. Ở đây là phiên **của người
 * khác**, và nó đứng sau ô quyền `Sessions` mà lễ tân không có.
 *
 * Máy chủ tự quyết định người gọi thấy được những phiên nào: Superadmin thấy
 * tất cả, chủ tiệm chỉ thấy người thuộc tiệm mình. Vì vậy hai hàm dưới đây
 * **không có tham số phạm vi nào cả** — thêm một tham số như thế là mời trình
 * duyệt tự khai mình được xem gì.
 */

import { apiGet, apiPost, type ApiResult } from './apiClient';

/** Tính lúc đọc, không phải cột được lưu — xem chú thích ở `SessionDto` phía máy chủ. */
export type SessionApiStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export type SessionApiRole = 'SUPERADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST';

export interface SessionDto {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userRole: SessionApiRole;
  /** Tiệm phiên đang làm việc. Rỗng khi tài khoản chưa chọn tiệm nào. */
  activeTenantId?: string | null;
  ip?: string | null;
  /** Chuỗi gốc, giữ lại để đối chiếu khi `device` rút gọn chưa đủ nhận ra máy. */
  userAgent?: string | null;
  device: string;
  browser?: string | null;
  os?: string | null;
  createdAt: string;
  lastActive: string;
  expiresAt: string;
  revokedAt?: string | null;
  status: SessionApiStatus;
  /** Đúng khi đây chính là phiên trình duyệt này đang dùng. */
  isCurrent: boolean;
}

export const listSessions = async (take?: number): Promise<ApiResult<SessionDto[]>> => {
  const query = take ? `?take=${take}` : '';
  const result = await apiGet<{ sessions: SessionDto[] }>(`/api/sessions${query}`);

  return result.status === 'ok' ? { status: 'ok', data: result.data.sessions } : result;
};

/**
 * BR-AUTH-033 — thu hồi một phiên.
 *
 * Không thu hồi được phiên của chính mình: máy chủ trả `403`, và đó là cố ý —
 * kết thúc phiên mình là việc của nút Đăng xuất, đường đó còn dọn cookie tử tế.
 */
export const revokeSession = async (id: string): Promise<ApiResult<SessionDto>> => {
  const result = await apiPost<{ session: SessionDto }>(`/api/sessions/${id}/revoke`, {});

  return result.status === 'ok' ? { status: 'ok', data: result.data.session } : result;
};
