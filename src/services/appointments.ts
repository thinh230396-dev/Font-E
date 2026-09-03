/**
 * Tầng gọi API lịch hẹn — sáu endpoint viết ở ngày 11.
 *
 * Khác mọi tầng service trước ở **hai điểm**, và cả hai đều đến từ nghiệp vụ chứ
 * không phải từ kiểu dữ liệu:
 *
 * 1. **Có khoảng ngày.** Lịch hẹn cộng dồn mãi theo thời gian, trong khi bảng
 *    lịch chỉ bao giờ hiện một ngày hoặc một tuần. Bốn module trước trả trọn
 *    danh sách vì chúng có trần tự nhiên; module này thì không.
 * 2. **Có `warnings` bên cạnh `error`.** BR-APT-005 và BR-APT-013 — đặt trong
 *    quá khứ và đặt ngoài ca của kỹ thuật viên là những điều đáng nói nhưng
 *    **không chặn**, nên chúng đi kèm một phản hồi thành công. Gộp chúng vào
 *    nhánh lỗi là biến một lời nhắc thành một lần từ chối.
 *
 * Không hàm nào nhận mã chi nhánh: BR-APT-002 cho lễ tân thao tác đúng chi nhánh
 * mình, và máy chủ đọc chi nhánh đó từ phiên đăng nhập. Nhận từ chuỗi truy vấn
 * là để lễ tân tự khai mình thuộc chi nhánh nào.
 */

import { apiGet, apiPatch, apiPost, apiPut, type ApiResult } from './apiClient';

/** BR-APT-020 — bảy trạng thái. Đã bỏ `REFUNDED`: hoàn tiền là chuyện của hóa đơn. */
export type AppointmentApiStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

/** BR-APT-007 — bốn nguồn. `ONLINE` do lễ tân chọn tay, không có ai tự đặt (BR-AUTH-003). */
export type AppointmentApiSource = 'RECEPTION' | 'PHONE' | 'ZALO' | 'ONLINE';

/**
 * Một dịch vụ trong lịch hẹn.
 *
 * Mang cả `durationMinutes` lẫn `bufferMinutes` vì BR-APT-010 tính thời lượng
 * bằng tổng của cả hai. Giao diện không cần tự cộng — `totalMinutes` của lịch
 * hẹn đã là kết quả — nhưng ngăn chi tiết thì hiện được từng dòng.
 */
export interface AppointmentServiceLineDto {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  bufferMinutes: number;
}

/**
 * Một lịch hẹn như máy chủ lưu.
 *
 * `endAt` và `totalMinutes` **chỉ đọc**: chúng suy ra từ danh sách dịch vụ theo
 * BR-APT-010, và chính chúng là thứ phép chống trùng lịch ở BR-APT-011 tính
 * trên. Gửi ngược lên là để trình duyệt tự quyết định một buổi hẹn chiếm bao
 * nhiêu chỗ.
 *
 * `branchId` cũng chỉ đọc: chi nhánh của lịch hẹn là chi nhánh của kỹ thuật viên
 * phụ trách (BR-EMP-003), không phải một ô người dùng chọn.
 */
export interface AppointmentDto {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  customerName?: string | null;
  customerPhone: string;
  staffId: string;
  staffName: string;
  startAt: string;
  endAt: string;
  totalMinutes: number;
  status: AppointmentApiStatus;
  source: AppointmentApiSource;
  station?: string | null;
  note?: string | null;
  deposit: number;
  /** BR-APT-027 — chủ tiệm đã đóng lịch này khi hóa đơn chưa thu đủ. */
  completedWithUnpaidBalance: boolean;
  /**
   * Lịch còn `PENDING` mà đã qua giờ hẹn. Tính **lúc đọc**, không phải một
   * trạng thái được lưu: BR-TENANT-003 nói toàn hệ thống không có job chạy nền.
   */
  isOverdue: boolean;
  services: AppointmentServiceLineDto[];
  /**
   * Những trạng thái bấm tay được từ trạng thái hiện tại, theo sơ đồ mục 16.1.
   *
   * Dùng cái này để dựng cụm nút thay vì chép lại sơ đồ ở giao diện: chép ra là
   * dựng chỗ cho hai câu trả lời khác nhau về cùng một câu hỏi, và cái ở trình
   * duyệt sẽ là cái sai trước.
   */
  nextStatuses: AppointmentApiStatus[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Một điều đáng nói nhưng **không chặn** — BR-APT-005, BR-APT-013.
 *
 * Khác hẳn `ApiFieldError`: lỗi gắn vào ô nhập và chặn việc lưu, còn cảnh báo đi
 * kèm một lần lưu **đã thành công**. Người ở quầy vẫn đặt được lịch ngoài ca cho
 * khách quen; hệ thống chỉ nói cho họ biết.
 */
export interface AppointmentWarning {
  code: string;
  message: string;
}

export interface AppointmentSaveResult {
  appointment: AppointmentDto;
  warnings: AppointmentWarning[];
}

/**
 * Thân request của cả `POST` lẫn `PUT`.
 *
 * Không có `branchId`, `endAt` hay `duration` — xem chú thích ở `AppointmentDto`.
 * `status` chỉ có nghĩa ở `POST` (BR-APT-021, hai giá trị đầu); ở `PUT` nó bị bỏ
 * qua vì đổi trạng thái đi đường riêng.
 */
export interface SaveAppointmentInput {
  customerId: string;
  staffId: string;
  /** ISO 8601 kèm phần bù múi giờ. */
  startAt: string;
  serviceIds: string[];
  status?: Extract<AppointmentApiStatus, 'PENDING' | 'CONFIRMED'>;
  source?: AppointmentApiSource;
  station?: string;
  note?: string;
  deposit?: number;
}

/** Ngày làm việc theo giờ tiệm, dạng `yyyy-MM-dd`, thành khoảng ISO mà API nhận. */
export const dayRange = (isoDate: string): { from: string; to: string } => ({
  from: `${isoDate}T00:00:00+07:00`,
  to: `${isoDate}T23:59:59+07:00`
});

export const listAppointments = async (
  from: string,
  to: string
): Promise<ApiResult<AppointmentDto[]>> => {
  const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const result = await apiGet<{ appointments: AppointmentDto[] }>(`/api/appointments${query}`);

  return result.status === 'ok' ? { status: 'ok', data: result.data.appointments } : result;
};

export const getAppointment = async (id: string): Promise<ApiResult<AppointmentDto>> => {
  const result = await apiGet<{ appointment: AppointmentDto }>(`/api/appointments/${id}`);

  return result.status === 'ok' ? { status: 'ok', data: result.data.appointment } : result;
};

/**
 * Gói phản hồi của ba đường ghi lại thành một hình dạng.
 *
 * Cả ba đều trả `{ appointment, warnings }`, và `warnings` vắng mặt phải hiểu là
 * mảng rỗng chứ không phải `undefined` — nơi gọi không nên phải tự phòng thủ cho
 * một trường mà máy chủ luôn gửi.
 */
const unwrapSave = (
  result: ApiResult<{ appointment: AppointmentDto; warnings?: AppointmentWarning[] }>
): ApiResult<AppointmentSaveResult> => (
  result.status === 'ok'
    ? {
      status: 'ok',
      data: { appointment: result.data.appointment, warnings: result.data.warnings || [] }
    }
    : result
);

/**
 * BR-APT-001 — đặt lịch.
 *
 * Trùng giờ kỹ thuật viên trả `409 SLOT_CONFLICT` kèm câu chữ nói rõ ai đang giữ
 * chỗ và giữ từ mấy giờ tới mấy giờ (BR-APT-011). Đó là lỗi chặn cứng, không
 * phải cảnh báo.
 */
export const createAppointment = async (input: SaveAppointmentInput) =>
  unwrapSave(await apiPost<{ appointment: AppointmentDto; warnings?: AppointmentWarning[] }>(
    '/api/appointments',
    toWire(input)
  ));

/** Sửa trọn lịch hẹn. Bỏ trống ghi chú là **xóa** ghi chú — cùng khuôn thay-trọn của `PUT /api/customers/{id}`. */
export const updateAppointment = async (id: string, input: SaveAppointmentInput) =>
  unwrapSave(await apiPut<{ appointment: AppointmentDto; warnings?: AppointmentWarning[] }>(
    `/api/appointments/${id}`,
    toWire(input)
  ));

/**
 * BR-APT-025 — dời lịch, giữ nguyên trạng thái và độ dài.
 *
 * Đường riêng cho thao tác kéo thả trên bảng giờ, nơi không có biểu mẫu nào để
 * đọc lại các trường còn lại trước khi gửi. Vẫn chạy lại phép chống trùng lịch.
 */
export const rescheduleAppointment = async (id: string, startAt: string) =>
  unwrapSave(await apiPatch<{ appointment: AppointmentDto; warnings?: AppointmentWarning[] }>(
    `/api/appointments/${id}/schedule`,
    { startAt }
  ));

/**
 * BR-APT-022 — đổi trạng thái theo sơ đồ mục 16.1. Đây cũng là đường **hủy lịch**
 * (BR-APT-024) và đường ghi nhận khách không đến.
 *
 * Gửi `COMPLETED` từ tài khoản lễ tân sẽ nhận `403`: lịch tự hoàn tất khi hóa đơn
 * thu đủ tiền (BR-APT-026), còn đóng tay khi chưa thu đủ là quyền của chủ tiệm
 * (BR-APT-027). Giao diện không nên hiện nút đó cho lễ tân — `nextStatuses` đã
 * nói trước điều này.
 */
export const changeAppointmentStatus = async (
  id: string,
  status: AppointmentApiStatus
): Promise<ApiResult<AppointmentDto>> => {
  const result = await apiPatch<{ appointment: AppointmentDto }>(
    `/api/appointments/${id}/status`,
    { status }
  );

  return result.status === 'ok' ? { status: 'ok', data: result.data.appointment } : result;
};

const toWire = (input: SaveAppointmentInput) => ({
  customerId: input.customerId,
  staffId: input.staffId,
  startAt: input.startAt,
  services: input.serviceIds.map((serviceId) => ({ serviceId })),
  status: input.status,
  source: input.source,
  station: input.station,
  note: input.note,
  deposit: input.deposit || 0
});
