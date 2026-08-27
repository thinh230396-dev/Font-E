/**
 * Tầng gọi API danh bạ khách hàng — năm endpoint viết ở ngày 10.
 *
 * BR-CUS-001 — khách thuộc tiệm và dùng chung cho mọi chi nhánh, nên không
 * endpoint nào nhận mã chi nhánh. Đây là điểm khác `staff.ts`: ở đó máy chủ tự
 * thu hẹp danh sách về chi nhánh của lễ tân, còn ở đây lễ tân thấy toàn bộ khách
 * của tiệm (BR-ISO-004). Khách đã đến chi nhánh Quận 1 hôm qua vẫn phải tra được
 * ở Quận 3 hôm nay.
 */

import { apiGet, apiPatch, apiPost, apiPut, type ApiResult } from './apiClient';

/** BR-CUS-005 — khách chỉ có hai trạng thái. Đã bỏ `CARE` của bản giao diện cũ. */
export type CustomerApiStatus = 'ACTIVE' | 'INACTIVE';

/** BR-CUS-007 — bốn hạng, tất cả đều suy ra từ tổng chi tiêu. */
export type CustomerApiTier = 'NEW' | 'STANDARD' | 'LOYAL' | 'VIP';

/**
 * Một hồ sơ khách như máy chủ lưu, kèm ba con số tính lúc đọc.
 *
 * Không có điểm thưởng (BR-CUS-008), nguồn khách, kỹ thuật viên yêu thích, sở
 * thích, dị ứng, tình trạng móng, kênh đồng ý liên hệ, nhãn phân loại hay chi
 * nhánh. Những ô đó có trong màn hình cũ dựng bằng dữ liệu mẫu nhưng không có
 * cột nào trong lược đồ; thứ cần ghi nhớ về một khách nay nằm gọn ở `note`.
 *
 * `tier`, `visits` và `totalSpent` **chỉ đọc**: máy chủ suy chúng ra từ hóa đơn
 * đã trả đủ ở mỗi lần đọc (BR-CUS-007/009), nên gửi ngược lên là gửi một thứ sẽ
 * bị bỏ qua.
 */
export interface CustomerDto {
  id: string;
  tenantId: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  /** Dạng `yyyy-MM-dd`. Rỗng là khách không khai — BR-CUS-003 chỉ bắt buộc số điện thoại. */
  birthDate?: string | null;
  note?: string | null;
  status: CustomerApiStatus;
  tier: CustomerApiTier;
  /** Số hóa đơn đã trả đủ. Một lần ghé có trả tiền là một lượt. */
  visits: number;
  totalSpent: number;
  /** Ngày lập hóa đơn gần nhất; rỗng nếu khách chưa từng trả tiền lần nào. */
  lastVisitAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Một lần khách ghé tiệm và trả tiền, đọc từ hóa đơn đã thanh toán.
 *
 * Mang thẳng tên chi nhánh và tên kỹ thuật viên chứ không mang mã: đây là bản
 * đọc lịch sử, và bắt ngăn chi tiết nạp thêm hai danh sách chỉ để dịch vài dòng
 * là ba lời gọi mạng cho một việc mà máy chủ đã nối sẵn.
 */
export interface CustomerVisitDto {
  invoiceId: string;
  invoiceCode: string;
  issuedAt: string;
  branchName: string;
  staffName?: string | null;
  total: number;
  serviceNames: string[];
}

export interface CustomerDetail {
  customer: CustomerDto;
  visits: CustomerVisitDto[];
}

/**
 * Thân request của cả `POST` lẫn `PUT`.
 *
 * `PUT /api/customers/{id}` là phép **thay trọn hồ sơ** giống `PUT /api/staff/{id}`:
 * bỏ trống `email` là xóa email trên hồ sơ. Biểu mẫu sửa vì vậy phải gửi đủ mọi
 * trường, kể cả những trường người dùng không đụng tới.
 */
export interface SaveCustomerInput {
  phone: string;
  fullName?: string;
  email?: string;
  /** Dạng `yyyy-MM-dd`, hoặc chuỗi rỗng nếu khách không khai. */
  birthDate?: string;
  note?: string;
}

export const listCustomers = async (): Promise<ApiResult<CustomerDto[]>> => {
  const result = await apiGet<{ customers: CustomerDto[] }>('/api/customers');

  return result.status === 'ok' ? { status: 'ok', data: result.data.customers } : result;
};

/** Hồ sơ kèm tối đa mười lần ghé gần nhất — thứ ngăn chi tiết cần. */
export const getCustomer = async (id: string) =>
  apiGet<CustomerDetail>(`/api/customers/${id}`);

const unwrap = (result: ApiResult<{ customer: CustomerDto }>): ApiResult<CustomerDto> => (
  result.status === 'ok' ? { status: 'ok', data: result.data.customer } : result
);

/** BR-CUS-002 — trùng số điện thoại trong cùng một tiệm thì máy chủ trả `422` gắn vào ô `phone`. */
export const createCustomer = async (input: SaveCustomerInput) =>
  unwrap(await apiPost<{ customer: CustomerDto }>('/api/customers', input));

export const updateCustomer = async (id: string, input: SaveCustomerInput) =>
  unwrap(await apiPut<{ customer: CustomerDto }>(`/api/customers/${id}`, input));

/**
 * BR-CUS-006 — đây là thứ giao diện gọi là "xóa khách hàng".
 *
 * Không có động từ `DELETE`: hồ sơ khách không xóa được (BR-DEL-001) vì tên của
 * họ còn phải hiện đúng trên hóa đơn cũ. Chuyển sang `INACTIVE` cũng không làm
 * mất lịch sử chi tiêu — bật lại là thấy nguyên tổng chi tiêu và hạng khách cũ.
 */
export const changeCustomerStatus = async (id: string, status: CustomerApiStatus) =>
  unwrap(await apiPatch<{ customer: CustomerDto }>(`/api/customers/${id}/status`, { status }));
