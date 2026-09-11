/**
 * Từ vựng kiểu dữ liệu của quầy lễ tân.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Đây là các hình dạng mà **cây render hiện có đang
 * đọc** — không phải DTO của máy chủ. Hai thứ đó cố ý khác nhau: lát cắt ngày 14 nối cổng lễ tân
 * vào API mà không viết lại giao diện, bằng cách cho một lớp adapter mặc DTO lại thành đúng những
 * hình dạng dưới đây. Đổi kiểu ở đây là đổi hợp đồng với vài nghìn dòng JSX, nên đừng sửa chúng
 * cho "giống DTO hơn" — sửa adapter thì đúng chỗ hơn.
 */

import type { DemoAccount } from '../../auth/demoAccounts';

export type ReceptionPage = 'desk' | 'appointments' | 'customers' | 'products' | 'stations' | 'technicians' | 'payments';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'REFUNDED';
export type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';
/**
 * Mã chi nhánh, do chủ tiệm tự đặt lúc lập chi nhánh nên tập giá trị của nó là MỞ.
 *
 * Trước ngày 14 chỗ này là `'Q1' | 'Q3'` — hai mã của bộ dữ liệu mẫu, bị đóng cứng thành
 * kiểu. Một tiệm thật đặt chi nhánh tên `HN-01` sẽ không lọt qua nổi phép kiểm kiểu, và
 * mọi bản ghi của họ bị lọc rớt trong im lặng vì `appointment.branch === branchCode` không
 * bao giờ đúng.
 */
export type BranchCode = string;
export type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';
export type InvoiceLineType = 'SERVICE' | 'PRODUCT';
export type TechnicianStatus = 'PRESENT' | 'NOT_CHECKED_IN' | 'SERVING' | 'BREAK' | 'SICK_REPORTED' | 'ON_LEAVE' | 'LATE';
export type TechnicianShift = 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
export type DeskQueueFilter = 'ACTION' | 'UPCOMING' | 'WAITING' | 'IN_SERVICE';

export interface InvoiceLineDraft {
  id: string;
  type: InvoiceLineType;
  name: string;
  quantity: number;
  unitPrice: number;
  staff: string;
  basePrice?: number;
  fromCustomerName?: string;
  fromAppointmentId?: string;
  // Accompanied Art / Drawing / Design & Difficulty
  designId?: string;
  designName?: string;
  designLevel?: number;
  difficultyLabel?: string;
  designSurcharge?: number;
  customArtNote?: string;
  // Accompanied Product / Polish Color / Material
  attachedColorId?: string;
  attachedColorName?: string;
  attachedColorHex?: string;
  attachedProductId?: string;
  attachedProductName?: string;
  attachedProductPrice?: number;
}

export interface CatalogItem {
  /**
   * Mã dịch vụ của máy chủ. Để trống được vì kiểu này dùng chung cho cả `productCatalog` —
   * hàng bán lẻ ở quầy vốn không có mã dịch vụ nào. Riêng bảng giá dịch vụ thì luôn có mã, vì
   * từ ngày 25 nó chỉ nhận dữ liệu thật; API cũng chỉ nhận mã dịch vụ có thật.
   */
  id?: string;
  name: string;
  price: number;
  category: string;
  duration?: number;
  stock?: number;
}

export interface SplitPaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  payerName?: string;
}

export interface ReceptionAppointment {
  id: string;
  customerId?: string;
  customer: string;
  phone: string;
  date: string;
  start: string;
  duration: number;
  service: string;
  services?: string[];
  staff: string;
  branch: BranchCode;
  source: AppointmentSource;
  status: AppointmentStatus;
  price: number;
  deposit: number;
  note: string;
  allergies?: string[];
  specialTags?: string[];
  serviceStartedAt?: string;
  serviceExtendedMinutes?: number;
  mergedWithAppointmentIds?: string[];
  station?: string;
  reminderSent?: boolean;
  createdBy?: string;
  firstVisit?: boolean;
  createdAt: string;
}

export interface ReceptionPayment {
  id: string;
  appointmentId?: string;
  mergedAppointmentIds?: string[];
  customer: string;
  phone: string;
  branch: BranchCode;
  createdAt: string;
  total: number;
  subtotal: number;
  discount: number;
  tip: number;
  deposit: number;
  paid: number;
  refunded: number;
  /**
   * BR-INV-013 — năm trạng thái của máy chủ. `FAILED` giữ lại cho các bản ghi mẫu cũ nhưng
   * không bao giờ được sinh ra nữa: không có cổng thanh toán thật nên không có giao dịch hỏng.
   */
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED' | 'CANCELLED' | 'FAILED';
  method?: PaymentMethod;
  reference?: string;
  splitPayments?: Array<{ method: PaymentMethod; amount: number; reference?: string }>;
  cashier: string;
  source: string;
  items: Array<{
    name: string;
    quantity: number;
    amount: number;
    staff: string;
    basePrice?: number;
    designName?: string;
    designLevel?: number;
    difficultyLabel?: string;
    designSurcharge?: number;
    attachedColorName?: string;
    attachedProductName?: string;
    customArtNote?: string;
  }>;
  note?: string;
  audit: string[];
}

export interface ShiftState {
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  openingCash: number;
  closedAt?: string;
  closingCash?: number;
}

export interface ReceptionTechnician {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  skills: string[];
  shift: TechnicianShift;
  shiftLabel: string;
  status: TechnicianStatus;
  branch: BranchCode;
  checkIn?: string;
  checkOut?: string;
  leaveNote?: string;
  avatarTone: string;
}

export interface TechnicianEditForm {
  status: TechnicianStatus;
  shift: TechnicianShift;
  checkIn: string;
  checkOut: string;
  leaveNote: string;
}

export interface AppointmentEditForm {
  customer: string;
  phone: string;
  service: string;
  staff: string;
  station: string;
  start: string;
  duration: string;
  price: string;
  note: string;
  allergies?: string[];
  specialTags?: string[];
  designName?: string;
  designLevel?: number;
  designSurcharge?: number;
}

export interface ReceptionistPortalProps {
  account: DemoAccount;
  themeMode: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

/**
 * Những gì cổng lễ tân hiển thị mà **máy chủ không có chỗ để lưu**.
 *
 * Tám trường này không phải sơ suất của lược đồ: dị ứng, nhãn phân loại và nhắc lịch nằm ở
 * mức D của §9.4 — bỏ hẳn khỏi MVP — còn giờ bắt đầu thật, số phút gia hạn và danh sách hóa
 * đơn gộp là khái niệm chỉ sống trong một ca làm việc ở quầy. Giữ chúng trong một bản đồ
 * riêng theo mã lịch hẹn, thay vì nhét vào `note` của máy chủ: nhét vào đó là biến một ô ghi
 * chú cho người đọc thành một định dạng dữ liệu mà không ai khai báo ở đâu cả.
 */
export interface AppointmentExtras {
  serviceStartedAt?: string;
  serviceExtendedMinutes?: number;
  mergedWithAppointmentIds?: string[];
  allergies?: string[];
  specialTags?: string[];
  reminderSent?: boolean;
  firstVisit?: boolean;
  createdBy?: string;
}

/**
 * Biểu mẫu "Walk-in cấp tốc" — khách vào không hẹn, người ở quầy điền năm ô rồi bấm một nút.
 *
 * Khai thành kiểu riêng từ ngày 27, khi bàn lễ tân tách thành component: hàm cập nhật biểu mẫu
 * này được truyền xuống làm prop, mà một prop thì phải có kiểu gọi được tên.
 */
export interface QuickWalkInForm {
  customer: string;
  phone: string;
  service: string;
  staff: string;
  station: string;
  duration: string;
  price: string;
  allergies: string[];
  note: string;
  quickAction: 'START_NOW' | 'CHECK_IN_QUEUE';
}

/**
 * Phần hóa đơn nháp mà **bàn lễ tân** cần biết: chỉ số dòng đã chọn, để hiện "Hóa đơn (3)" hay
 * "Tạo HĐ" trên thẻ khách.
 *
 * Hẹp hơn hẳn bản nháp thật đang nằm trong màn hình — và cố ý hẹp: bàn lễ tân không có việc gì
 * với phương thức thanh toán hay tiền giảm giá, nên đừng cho nó thấy.
 */
export interface InvoiceDraftSummary {
  lines: InvoiceLineDraft[];
}

/**
 * Biểu mẫu tùy chỉnh một dòng dịch vụ trên hóa đơn: mẫu vẽ, độ khó, màu sơn và sản phẩm đi kèm.
 *
 * Mọi ô tiền đều là **chuỗi** chứ không phải số, và đó là cố ý: người ở quầy gõ dở chừng thì ô
 * đang rỗng hoặc đang là "12" trên đường tới "120000" — ép sang số ngay lúc gõ sẽ nhảy con trỏ
 * và chặn cả việc xóa hết để nhập lại. Phép đổi sang số nằm ở lúc lưu.
 */
export interface ArtCustomizerForm {
  basePrice: string;
  designName: string;
  designLevel: number;
  difficultyLabel: string;
  designSurcharge: string;
  attachedColorCode: string;
  attachedColorName: string;
  attachedColorHex: string;
  attachedProductName: string;
  attachedProductPrice: number;
  staff: string;
  customArtNote: string;
}

/**
 * Biểu mẫu thu tiền ở quầy: phương thức, giảm giá, tiền tip, mã tham chiếu và ghi chú.
 *
 * Ba ô tiền là chuỗi vì cùng lý do đã ghi ở `ArtCustomizerForm` — người ta gõ dở chừng.
 */
export interface PaymentForm {
  method: PaymentMethod;
  discount: string;
  tip: string;
  reference: string;
  note: string;
}
