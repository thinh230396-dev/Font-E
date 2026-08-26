/**
 * Tầng gọi API chi nhánh — bốn endpoint viết ở ngày 5.
 *
 * Cùng nguyên tắc với `src/services/tenants.ts`: không hàm nào nuốt lỗi, và các
 * kiểu dưới đây chép đúng hình dạng DTO của máy chủ chứ không dùng lại kiểu
 * `Branch` của frontend. Kiểu `Branch` mang mười một trường từ thời dữ liệu mẫu
 * mà database không có — mô hình chi nhánh, quản lý phụ trách, giờ mở cửa, số
 * ghế, công suất — nên trộn hai thứ vào một sẽ khiến người đọc không phân biệt
 * được trường nào thật sự tồn tại ở máy chủ.
 *
 * Không endpoint nào nhận mã tiệm: tiệm đến từ phiên đăng nhập (BR-AUTH-024).
 */

import { apiGet, apiPatch, apiPost, apiPut, type ApiResult } from './apiClient';

/** BR-BRANCH-003 — chi nhánh chỉ có hai trạng thái. Không có `PLANNING`. */
export type BranchApiStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Một chi nhánh như máy chủ lưu.
 *
 * Chi nhánh đã ngừng hoạt động vẫn nằm trong danh sách — BR-DEL-003 yêu cầu tên
 * của nó tiếp tục hiện đúng trong lịch hẹn và hóa đơn cũ, và màn quản lý cần
 * thấy nó thì mới có đường bật lại.
 */
export interface BranchDto {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  /** BR-BRANCH-001 — mỗi tiệm có đúng một, sinh ra cùng tiệm và không xóa được. */
  isPrimary: boolean;
  status: BranchApiStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bốn ô máy chủ nhận khi tạo hoặc sửa chi nhánh.
 *
 * Không có `isPrimary`: BR-BRANCH-001 quy định chi nhánh chính sinh ra cùng tiệm.
 * Không có `status`: đổi trạng thái đi qua đường riêng, để việc ngừng một chi
 * nhánh không bao giờ xảy ra như tác dụng phụ của một lần sửa tên.
 */
export interface SaveBranchInput {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
}

export const listBranches = async (): Promise<ApiResult<BranchDto[]>> => {
  const result = await apiGet<{ branches: BranchDto[] }>('/api/branches');

  return result.status === 'ok' ? { status: 'ok', data: result.data.branches } : result;
};

const unwrap = (result: ApiResult<{ branch: BranchDto }>): ApiResult<BranchDto> => (
  result.status === 'ok' ? { status: 'ok', data: result.data.branch } : result
);

/** BR-BRANCH-005 — vượt `max_salons` thì máy chủ trả `LIMIT_EXCEEDED`. */
export const createBranch = async (input: SaveBranchInput) =>
  unwrap(await apiPost<{ branch: BranchDto }>('/api/branches', input));

export const updateBranch = async (id: string, input: SaveBranchInput) =>
  unwrap(await apiPut<{ branch: BranchDto }>(`/api/branches/${id}`, input));

/**
 * BR-BRANCH-004 — đây là thứ mà giao diện gọi là "xóa chi nhánh".
 *
 * Cố ý không có hàm `deleteBranch`: hệ thống không có lệnh xóa cứng nào
 * (BR-DEL-001), và chi nhánh chính thì đến ngừng hoạt động cũng không được
 * (BR-BRANCH-002) — máy chủ sẽ từ chối.
 */
export const changeBranchStatus = async (id: string, status: BranchApiStatus) =>
  unwrap(await apiPatch<{ branch: BranchDto }>(`/api/branches/${id}/status`, { status }));
