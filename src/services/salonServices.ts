/**
 * Tầng gọi API bảng giá dịch vụ — bốn endpoint viết ở ngày 7.
 *
 * Tên tệp là `salonServices` chứ không phải `services`, để không có một tệp tên
 * `services/services.ts` mà người đọc phải đoán nghĩa của chữ "service" nào.
 *
 * BR-SVC-001 — dịch vụ thuộc tiệm và dùng chung cho mọi chi nhánh, nên không
 * endpoint nào nhận mã chi nhánh.
 */

import { apiGet, apiPatch, apiPost, apiPut, type ApiResult } from './apiClient';

/** BR-SVC-004 — dịch vụ chỉ có hai trạng thái. Không có `DRAFT`, không có `HIDDEN`. */
export type ServiceApiStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Một dịch vụ như máy chủ lưu.
 *
 * Không có giá thành viên (BR-SVC-002), không có thuế theo dịch vụ (BR-SVC-009),
 * không có giá vốn, tiền cọc, hoa hồng riêng hay danh sách chi nhánh áp dụng.
 * Những ô đó có trong màn hình cũ dựng bằng dữ liệu mẫu nhưng không có trong
 * lược đồ và không có rule nào định nghĩa chúng.
 */
export interface ServiceDto {
  id: string;
  tenantId: string;
  name: string;
  /** Nhóm dịch vụ là chuỗi tự do do tiệm tự đặt, không phải danh mục cố định. */
  category?: string;
  price: number;
  durationMinutes: number;
  /** BR-SVC-003 — thời gian dọn dẹp sau khi làm xong; nó chiếm chỗ trên lịch nhưng không tính tiền. */
  bufferMinutes: number;
  description?: string;
  status: ServiceApiStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaveServiceInput {
  name: string;
  category?: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  description?: string;
}

export const listServices = async (): Promise<ApiResult<ServiceDto[]>> => {
  const result = await apiGet<{ services: ServiceDto[] }>('/api/services');

  return result.status === 'ok' ? { status: 'ok', data: result.data.services } : result;
};

const unwrap = (result: ApiResult<{ service: ServiceDto }>): ApiResult<ServiceDto> => (
  result.status === 'ok' ? { status: 'ok', data: result.data.service } : result
);

export const createService = async (input: SaveServiceInput) =>
  unwrap(await apiPost<{ service: ServiceDto }>('/api/services', input));

/**
 * BR-SVC-006 — đổi giá ở đây **không** ảnh hưởng hóa đơn đã lập: dòng hóa đơn
 * giữ đơn giá của chính nó tại thời điểm lập. Vì vậy không có bảng lịch sử giá
 * và cũng không cần lý do đổi giá.
 */
export const updateService = async (id: string, input: SaveServiceInput) =>
  unwrap(await apiPut<{ service: ServiceDto }>(`/api/services/${id}`, input));

/** BR-SVC-005 — "ngừng dịch vụ"; lịch hẹn và hóa đơn cũ giữ nguyên (BR-DEL-001). */
export const changeServiceStatus = async (id: string, status: ServiceApiStatus) =>
  unwrap(await apiPatch<{ service: ServiceDto }>(`/api/services/${id}/status`, { status }));
