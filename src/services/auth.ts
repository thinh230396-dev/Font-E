/**
 * Tầng gọi API xác thực — thay cho `src/utils/authApi.ts`.
 *
 * Khác biệt cốt lõi so với bản cũ: **không hàm nào nuốt lỗi**. Bản cũ `catch`
 * rồi trả `null`, nên "chưa đăng nhập" và "máy chủ chết" ra cùng một kết quả,
 * và giao diện không có cách nào phân biệt để xử lý cho đúng (§12.4).
 */

import type { PortalRole } from '../auth/demoAccounts';
import { apiGet, apiPost, type ApiResult } from './apiClient';

export interface SessionAccount {
  id: string;
  email: string;
  role: PortalRole;
  displayName: string;
}

/**
 * Tiệm đang làm việc của phiên — BR-AUTH-024.
 *
 * `displayStatus` và `isReadOnly` do máy chủ TÍNH lúc đọc từ hạn dùng
 * (BR-TENANT-002), không phải cột trong database, nên chúng luôn đúng tại thời
 * điểm gọi mà hệ thống không cần tiến trình chạy nền nào.
 */
export interface TenantScope {
  id: string;
  code: string;
  name: string;
  displayStatus: 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'SUSPENDED';
  isReadOnly: boolean;
  packageId: string;
  packageName: string;
  /** Quyền tính năng mà gói của tiệm mở (BR-SUB-007). */
  capabilities: string[];
}

/** Chi nhánh của tài khoản lễ tân, máy chủ đọc qua hồ sơ nhân viên (BR-EMP-004). */
export interface BranchScope {
  id: string;
  code?: string;
  name: string;
}

export interface TenantSummary {
  id: string;
  code: string;
  name: string;
  displayStatus: TenantScope['displayStatus'];
  isReadOnly: boolean;
  expiresAt: string;
}

export interface SessionState {
  account: SessionAccount;
  activeTenantId: string | null;
  tenant: TenantScope | null;
  branch: BranchScope | null;
  /**
   * BR-AUTH-025 — chủ tiệm luôn phải qua màn chọn tiệm, kể cả khi chỉ quản lý
   * một tiệm. Lễ tân thì không: máy chủ đặt sẵn tiệm ngay lúc đăng nhập vì hồ sơ
   * nhân viên của họ chỉ thuộc đúng một tiệm.
   */
  mustSelectTenant: boolean;
}

export interface LoginOutcome {
  account: SessionAccount;
  mustSelectTenant: boolean;
}

/**
 * Đọc phiên hiện tại.
 *
 * Trả về thất bại `unauthenticated` khi chưa đăng nhập — đó là trạng thái bình
 * thường, không phải sự cố. Nơi gọi phân biệt bằng `error.kind` thay vì nhận
 * `null` rồi phải tự đoán vì sao.
 */
export const getSession = () => apiGet<SessionState>('/api/auth/session');

export const login = (identifier: string, password: string, remember: boolean) =>
  apiPost<LoginOutcome>('/api/auth/login', { identifier, password, remember });

export const logout = () => apiPost<void>('/api/auth/logout');

/** Danh sách tiệm tài khoản được giao quản lý — nguồn dữ liệu của màn chọn tiệm (BR-AUTH-023). */
export const listMyTenants = async (): Promise<ApiResult<TenantSummary[]>> => {
  const result = await apiGet<{ tenants: TenantSummary[] }>('/api/auth/my-tenants');

  return result.status === 'ok' ? { status: 'ok', data: result.data.tenants } : result;
};

/**
 * Đổi tiệm đang làm việc — BR-AUTH-025.
 *
 * Máy chủ ghi lựa chọn vào PHIÊN chứ không trả về một mã để frontend tự giữ:
 * nếu tiệm đang làm việc do trình duyệt khai báo ở mỗi request thì ai cũng sửa
 * được, và toàn bộ hàng rào cách ly dữ liệu phía sau mất ý nghĩa.
 */
export const selectTenant = async (tenantId: string): Promise<ApiResult<TenantScope>> => {
  const result = await apiPost<{ tenant: TenantScope }>('/api/auth/session/tenant', { tenantId });

  return result.status === 'ok' ? { status: 'ok', data: result.data.tenant } : result;
};
