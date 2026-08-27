/**
 * Tầng gọi API hồ sơ nhân viên — năm endpoint viết ở ngày 7.
 *
 * BR-EMP-004 — chi nhánh chỉ nằm trên hồ sơ nhân viên. Không endpoint nào nhận
 * mã tiệm, và cũng không nhận mã chi nhánh để lọc: chi nhánh của lễ tân đến từ
 * phiên đăng nhập, nên gửi nó từ trình duyệt là để người dùng tự khai mình
 * thuộc chi nhánh nào.
 */

import { apiGet, apiPatch, apiPost, apiPut, type ApiResult } from './apiClient';

/** BR-EMP-002 — hồ sơ nhân viên chỉ có hai vai trò nghiệp vụ. */
export type StaffApiRole = 'TECHNICIAN' | 'RECEPTIONIST';

/** BR-EMP-005 — "nghỉ việc" chính là `INACTIVE`, và nó vô hiệu hóa luôn tài khoản đăng nhập. */
export type StaffApiStatus = 'WORKING' | 'OFF_SHIFT' | 'LEAVE' | 'INACTIVE';

/**
 * Tài khoản đăng nhập gắn với một hồ sơ nhân viên — BR-AUTH-013.
 *
 * Rỗng nghĩa là hồ sơ chưa được cấp quyền đăng nhập, và đó chính là thứ màn
 * quản lý nhân viên dùng để quyết định nút "Cấp tài khoản đăng nhập" hiện ở
 * dòng nào.
 */
export interface StaffAccountDto {
  id: string;
  email: string;
  username?: string;
  status: string;
}

/**
 * Một hồ sơ nhân viên như máy chủ lưu.
 *
 * Không có chấm công, nghỉ phép, doanh số, đánh giá hay lịch tuần: BR-EMP-009
 * chỉ giữ **một ca cố định**, phần còn lại thuộc module nhân sự đã bị loại khỏi
 * MVP. Những ô đó có trong màn hình cũ dựng bằng dữ liệu mẫu nhưng không có cột
 * nào ở database.
 *
 * Trả `branchId` chứ không trả tên chi nhánh — màn hình nào cần tên thì ghép từ
 * `GET /api/branches`, để một lần đổi tên chi nhánh không để lại hai câu trả lời.
 */
export interface StaffDto {
  id: string;
  tenantId: string;
  branchId: string;
  fullName: string;
  phone?: string;
  email?: string;
  role: StaffApiRole;
  status: StaffApiStatus;
  /** Dạng `HH:mm`. */
  shiftStart: string;
  shiftEnd: string;
  /** BR-EMP-011 — tỷ lệ dạng 0–1 (0,15 là 15%). Tiền hoa hồng nhân ra lúc đọc báo cáo. */
  commissionRate: number;
  /** BR-EMP-010 — kỹ năng chỉ để hiển thị; hệ thống không cưỡng chế khi phân công. */
  skills: string[];
  account?: StaffAccountDto;
  createdAt: string;
  updatedAt: string;
}

/**
 * Thân request của cả `POST` lẫn `PUT`.
 *
 * `PUT /api/staff/{id}` là phép **thay trọn hồ sơ**: bỏ trống `email` là xóa
 * email trên hồ sơ. Biểu mẫu sửa vì vậy phải gửi đủ mọi trường, kể cả những
 * trường người dùng không đụng tới.
 */
export interface SaveStaffInput {
  branchId: string;
  fullName: string;
  phone?: string;
  email?: string;
  role: StaffApiRole;
  shiftStart: string;
  shiftEnd: string;
  commissionRate: number;
  skills: string[];
}

/**
 * Cấp tài khoản đăng nhập cho một hồ sơ lễ tân đã tồn tại.
 *
 * Không có ô vai trò: vai trò đăng nhập luôn là `RECEPTIONIST` và suy ra từ
 * chính hồ sơ. Bỏ trống `password` thì máy chủ sinh và trả về đúng một lần.
 */
export interface GrantStaffAccountInput {
  email?: string;
  username?: string;
  displayName?: string;
  password?: string;
}

export interface GrantStaffAccountResult {
  staff: StaffDto;
  /** Chỉ có khi máy chủ vừa tự sinh mật khẩu. Đây là lần duy nhất chuỗi ấy rời khỏi máy chủ. */
  generatedPassword?: string;
}

export const listStaff = async (): Promise<ApiResult<StaffDto[]>> => {
  const result = await apiGet<{ staff: StaffDto[] }>('/api/staff');

  return result.status === 'ok' ? { status: 'ok', data: result.data.staff } : result;
};

const unwrap = (result: ApiResult<{ staff: StaffDto }>): ApiResult<StaffDto> => (
  result.status === 'ok' ? { status: 'ok', data: result.data.staff } : result
);

/** BR-EMP-008 — vượt `max_staff` thì máy chủ trả `409 LIMIT_EXCEEDED`. */
export const createStaff = async (input: SaveStaffInput) =>
  unwrap(await apiPost<{ staff: StaffDto }>('/api/staff', input));

/** Gồm cả chuyển chi nhánh (BR-EMP-003). Đổi vai trò bị từ chối khi hồ sơ đã có tài khoản. */
export const updateStaff = async (id: string, input: SaveStaffInput) =>
  unwrap(await apiPut<{ staff: StaffDto }>(`/api/staff/${id}`, input));

/**
 * BR-EMP-005/006 — đây là thứ giao diện gọi là "cho nghỉ việc".
 *
 * Không có động từ `DELETE`: hồ sơ nhân viên không xóa được (BR-DEL-001) vì tên
 * của họ còn phải hiện đúng trong lịch hẹn và hóa đơn cũ. Chuyển sang `INACTIVE`
 * kéo theo vô hiệu hóa tài khoản đăng nhập; chiều ngược lại cố ý không đối xứng.
 */
export const changeStaffStatus = async (id: string, status: StaffApiStatus) =>
  unwrap(await apiPatch<{ staff: StaffDto }>(`/api/staff/${id}/status`, { status }));

export const grantStaffAccount = async (
  id: string,
  input: GrantStaffAccountInput
): Promise<ApiResult<GrantStaffAccountResult>> => {
  const result = await apiPost<{ staff: StaffDto; generatedPassword?: string }>(
    `/api/staff/${id}/account`,
    input
  );

  return result.status === 'ok'
    ? { status: 'ok', data: { staff: result.data.staff, generatedPassword: result.data.generatedPassword } }
    : result;
};
