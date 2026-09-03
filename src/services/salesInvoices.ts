/**
 * Tầng gọi API hóa đơn bán hàng — bảy endpoint viết ở ngày 12 và 13.
 *
 * ⚠️ Đây là hóa đơn **khách trả cho tiệm**. BR-INV-001 mở đầu bằng cảnh báo rằng hệ thống có
 * hai bảng hóa đơn tách hoàn toàn, và bảng kia — hóa đơn tiệm trả cho SalonSys — thuộc quyền
 * Superadmin. Đường dẫn là `/api/sales-invoices` chứ không phải `/api/invoices` đúng vì lẽ đó,
 * và tệp này giữ nguyên cách gọi tên ấy.
 *
 * Điểm khác mọi tầng service trước: **giao diện không được tự cộng tiền**. Bốn con số
 * `subtotal`, `total`, `collected`, `remaining` đều do máy chủ tính theo BR-INV-020 và gửi
 * kèm. Cộng lại ở trình duyệt là dựng ra một phép tính thứ hai, và ngày nó lệch với phép tính
 * của máy chủ thì người ở quầy là người phát hiện — ngay trước mặt khách.
 */

import { apiGet, apiPatch, apiPost, apiPut, type ApiResult } from './apiClient';

/** BR-INV-013 — năm trạng thái. Đã bỏ `FAILED`: không có cổng thanh toán thật nên không có giao dịch hỏng. */
export type SalesInvoiceApiStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED';

/** BR-PAY-005 — năm phương thức, đều chỉ là nhãn ghi nhận thủ công. */
export type PaymentApiMethod = 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';

/** BR-PAY-002 — ba loại dòng tiền. `REFUND` mang số âm. */
export type PaymentApiType = 'DEPOSIT' | 'PAYMENT' | 'REFUND';

export interface SalesInvoiceLineDto {
  id: string;
  /** Rỗng nghĩa là mục nhập tay tự do — BR-INV-012, bán được thứ chưa có trong danh mục. */
  serviceId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface InvoicePaymentDto {
  id: string;
  type: PaymentApiType;
  method: PaymentApiMethod;
  /** VND. Dòng hoàn tiền mang giá trị **âm** (BR-PAY-006). */
  amount: number;
  paidAt: string;
  reference?: string | null;
  reason?: string | null;
}

export interface SalesInvoiceDto {
  id: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  customerId: string;
  customerName?: string | null;
  customerPhone: string;
  /** Rỗng nghĩa là khách mua lẻ, không đi từ lịch hẹn nào — BR-INV-011. */
  appointmentId?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  /** BR-INV-016 — dạng `HD-yyyyMMdd-nnn`, đánh theo từng tiệm và reset mỗi ngày. */
  code: string;
  /**
   * BR-PAY-003 — `PENDING`, `PARTIAL` và `PAID` **suy ra từ tổng thu**, không đặt tay. Chỉ
   * `CANCELLED` và `REFUNDED` là do người dùng chủ động chọn.
   */
  status: SalesInvoiceApiStatus;
  subtotal: number;
  discount: number;
  discountReason?: string | null;
  tip: number;
  total: number;
  /** Tổng đã thu, **gồm cả tiền cọc** đã chuyển thành dòng `DEPOSIT` (BR-APT-031). */
  collected: number;
  remaining: number;
  note?: string | null;
  lines: SalesInvoiceLineDto[];
  payments: InvoicePaymentDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Một dòng gửi lên khi lập hoặc sửa hóa đơn — **hai cách dùng loại trừ nhau**.
 *
 * Gửi `serviceId` thì máy chủ tự đọc tên và giá hiện tại từ bảng dịch vụ (BR-SVC-007); gửi
 * `name` và `unitPrice` thì đó là mục nhập tay (BR-INV-012). Giá của một dịch vụ có trong danh
 * mục **không** nhận từ client kể cả khi client gửi kèm — nhận nó là để trình duyệt tự quyết
 * định một buổi làm gel giá mười nghìn.
 */
export interface SalesInvoiceLineInput {
  serviceId?: string;
  name?: string;
  unitPrice?: number;
  quantity: number;
}

export interface CreateSalesInvoiceInput {
  /**
   * Có thì đây là lệnh "Thanh toán" trên một lịch hẹn (BR-INV-010): các dòng lấy từ dịch vụ
   * của lịch và `lines` bị bỏ qua, còn tiền cọc trở thành một dòng thu loại `DEPOSIT`.
   * Rỗng thì đây là hóa đơn bán lẻ và `lines` là bắt buộc.
   */
  appointmentId?: string;
  customerId?: string;
  staffId?: string;
  /** Chỉ dùng cho hóa đơn bán lẻ do **chủ tiệm** lập; lễ tân gửi lên cũng bị bỏ qua. */
  branchId?: string;
  lines?: SalesInvoiceLineInput[];
  discount?: number;
  discountReason?: string;
  tip?: number;
  note?: string;
}

/** Sửa trọn một hóa đơn chưa thu đủ — BR-INV-015. Không đổi được khách, lịch hẹn hay chi nhánh. */
export interface UpdateSalesInvoiceInput {
  staffId?: string;
  lines: SalesInvoiceLineInput[];
  discount?: number;
  discountReason?: string;
  tip?: number;
  note?: string;
}

export interface RecordPaymentInput {
  method: PaymentApiMethod;
  amount: number;
  /** Mã giao dịch ngân hàng hoặc ví, lễ tân nhập tay (BR-PAY-005). */
  reference?: string;
}

/** Ngày làm việc theo giờ tiệm thành khoảng ISO mà API nhận. */
export const dayRange = (isoDate: string): { from: string; to: string } => ({
  from: `${isoDate}T00:00:00+07:00`,
  to: `${isoDate}T23:59:59+07:00`
});

/**
 * Sổ hóa đơn trong một khoảng ngày.
 *
 * Lọc theo **giờ lập**, không theo giờ thu: một hóa đơn thu làm nhiều lần (BR-PAY-004) có
 * nhiều mốc thu, nên "hóa đơn của ngày nào" chỉ có một câu trả lời duy nhất là ngày quầy lập
 * nó. Báo cáo doanh thu ở BR-REV-001 thì ngược lại — nó đếm theo tiền thực thu.
 */
export const listSalesInvoices = async (
  from: string,
  to: string
): Promise<ApiResult<SalesInvoiceDto[]>> => {
  const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const result = await apiGet<{ invoices: SalesInvoiceDto[] }>(`/api/sales-invoices${query}`);

  return result.status === 'ok' ? { status: 'ok', data: result.data.invoices } : result;
};

const unwrap = (
  result: ApiResult<{ invoice: SalesInvoiceDto }>
): ApiResult<SalesInvoiceDto> => (
  result.status === 'ok' ? { status: 'ok', data: result.data.invoice } : result
);

export const getSalesInvoice = async (id: string) =>
  unwrap(await apiGet<{ invoice: SalesInvoiceDto }>(`/api/sales-invoices/${id}`));

/**
 * Lập hóa đơn.
 *
 * Bấm hai lần cho cùng một lịch hẹn sẽ nhận `422` nói rõ **số hóa đơn đã có** — máy chủ chặn
 * đúng chỗ này để khách không bị tính tiền hai lần khi màn hình chậm.
 */
export const createSalesInvoice = async (input: CreateSalesInvoiceInput) =>
  unwrap(await apiPost<{ invoice: SalesInvoiceDto }>('/api/sales-invoices', input));

export const updateSalesInvoice = async (id: string, input: UpdateSalesInvoiceInput) =>
  unwrap(await apiPut<{ invoice: SalesInvoiceDto }>(`/api/sales-invoices/${id}`, input));

/**
 * BR-INV-015 — hủy hóa đơn, và là chuyển trạng thái **duy nhất** đặt được bằng tay.
 *
 * Ba trạng thái `PENDING`, `PARTIAL`, `PAID` là kết quả của tổng thu nên không nhận; `REFUNDED`
 * đi đường riêng vì nó cần số tiền và lý do.
 */
export const cancelSalesInvoice = async (id: string) =>
  unwrap(await apiPatch<{ invoice: SalesInvoiceDto }>(
    `/api/sales-invoices/${id}/status`,
    { status: 'CANCELLED' }
  ));

/**
 * Ghi nhận một lần khách trả tiền — BR-PAY-001, và là lệnh kéo theo nhiều hệ quả nhất.
 *
 * Một lời gọi làm ba việc trong một giao dịch ở máy chủ: thêm dòng thu, hóa đơn tự tính lại
 * trạng thái từ tổng thu (BR-PAY-003), và nếu vừa thu đủ thì **lịch hẹn gắn với nó tự hoàn
 * tất** (BR-APT-026). Phản hồi là hóa đơn sau khi đã cộng xong.
 *
 * BR-PAY-004 — khách trả nửa tiền mặt nửa chuyển khoản thì gọi hai lần, mỗi lần một phương
 * thức. Mỗi phương thức vốn đã là một dòng riêng nên không cần dạng danh sách.
 */
export const recordPayment = async (id: string, input: RecordPaymentInput) =>
  unwrap(await apiPost<{ invoice: SalesInvoiceDto }>(
    `/api/sales-invoices/${id}/payments`,
    input
  ));

/**
 * Hoàn tiền — BR-PAY-006, một dòng thu mang số **âm** kèm lý do bắt buộc.
 *
 * BR-PAY-007 — **chỉ chủ tiệm**. Lễ tân gọi tới đây sẽ nhận `403`, và đó là endpoint duy nhất
 * trên tài nguyên này mà họ bị từ chối. Cổng lễ tân vì vậy cố ý không có nút nào gọi hàm này.
 */
export const issueRefund = async (
  id: string,
  input: { method: PaymentApiMethod; amount: number; reason: string }
) => unwrap(await apiPost<{ invoice: SalesInvoiceDto }>(`/api/sales-invoices/${id}/refunds`, input));
