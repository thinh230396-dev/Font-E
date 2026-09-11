import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import { useAppointmentRange } from '../hooks/useAppointments';
import useCustomers from '../hooks/useCustomers';
import useSalonServices from '../hooks/useSalonServices';
import useStaff from '../hooks/useStaff';
import type {
  AppointmentApiStatus,
  AppointmentDto,
  AppointmentWarning,
  SaveAppointmentInput
} from '../services/appointments';
import {
  Award,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Crown,
  Filter,
  Gift,
  History,
  LayoutGrid,
  LayoutList,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { formatMoney as formatCurrency } from '../utils/money';
import { Button, DataTable, Field, Modal, StatusBadge, getStatusDefinition, PageHeader } from './ui';
import type { DataTableColumn } from './ui';
import { getTenantCustomers, type TenantCustomer, tierMeta } from '../utils/tenantCustomers';
import { normalizePhone } from '../utils/phone';
import { tenantStorageKey } from '../utils/tenantStorage';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'REFUNDED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';
/** Mã chi nhánh do chủ tiệm tự đặt nên tập giá trị là mở — mở kiểu ở ngày 14, cùng lúc với cổng lễ tân. */
type BranchCode = string;
type ViewMode = 'SCHEDULE' | 'LIST';
type OperationalFilter = 'ALL' | 'ACTION' | 'IN_SALON' | 'CONFIRMED';

interface TenantAppointment {
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
  station?: string;
  reminderSent?: boolean;
  createdBy?: string;
  firstVisit?: boolean;
  cancellationReason?: string;
  cancellationNote?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  refundAmount?: number;
  refundReason?: string;
  refundMethod?: 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';
  refundNote?: string;
  refundedAt?: string;
  refundedBy?: string;
  createdAt: string;
}

/**
 * Phần của một lịch hẹn mà **máy chủ cố ý không có cột để lưu**.
 *
 * Ba nhóm, ba lý do khác nhau — và không nhóm nào là sơ suất của lược đồ:
 *
 * 1. `reminderSent`, `firstVisit`, `createdBy` — nhắc lịch nằm ở mức D của §9.4,
 *    bỏ hẳn khỏi MVP. Hai trường còn lại là nhãn hiển thị, suy được từ hồ sơ
 *    khách chứ không phải thuộc tính của buổi hẹn.
 * 2. Bốn trường `cancellation*` — `PATCH /status` chỉ nhận trạng thái, không
 *    nhận lý do. BR-APT-024 định nghĩa việc hủy, không định nghĩa việc khai báo
 *    vì sao hủy.
 * 3. Chín trường `refund*` cùng cờ `refunded` — đây là nhóm đáng nói nhất.
 *    `services/appointments.ts` ghi rõ: **hoàn tiền là chuyện của hóa đơn**, nên
 *    `REFUNDED` đã bị gỡ khỏi bảy trạng thái của lịch hẹn và đường hoàn tiền
 *    thật nằm ở `IssueRefundUseCase` của hóa đơn bán hàng. Màn này giữ lại khối
 *    hoàn tiền đã dựng, nhưng nó **chỉ sống trên máy này** — và khối ấy mang một
 *    câu nói rõ điều đó, thay vì để người dùng tưởng số tiền đã vào sổ.
 *
 * Giữ chúng trong một bản đồ riêng theo mã lịch hẹn, thay vì nhét vào `note` của
 * máy chủ: nhét vào đó là biến một ô ghi chú cho người đọc thành một định dạng
 * dữ liệu mà không ai khai báo ở đâu cả. Cùng cách cổng lễ tân đã làm ở ngày 14.
 */
interface TenantAppointmentExtras {
  reminderSent?: boolean;
  firstVisit?: boolean;
  createdBy?: string;
  cancellationReason?: string;
  cancellationNote?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  /** Cờ dựng lại trạng thái `REFUNDED` — máy chủ không có trạng thái ấy. */
  refunded?: boolean;
  refundAmount?: number;
  refundReason?: string;
  refundMethod?: 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';
  refundNote?: string;
  refundedAt?: string;
  refundedBy?: string;
}

/**
 * Một lịch hẹn của máy chủ, mặc lại hình dạng mà cây render đang dùng.
 *
 * Cùng lý do và cùng khuôn với `toReceptionAppointment` ở cổng lễ tân: file này
 * hơn ba nghìn dòng và đọc `appointment.start`, `appointment.duration`,
 * `appointment.staff` ở hàng trăm chỗ. Đổi hình dạng nghĩa là sửa từng chỗ ấy —
 * dài, rủi ro, và không mua lại được gì cho người dùng.
 *
 * @param price Tổng giá lấy từ danh mục dịch vụ. Lịch hẹn ở máy chủ **không lưu
 *   giá**: BR-SVC-009 chốt giá tại thời điểm lập hóa đơn, nên con số ở đây là
 *   giá dự kiến theo bảng giá hiện hành, không phải số tiền đã thu.
 */
const toTenantAppointment = (
  dto: AppointmentDto,
  price: number,
  extras: TenantAppointmentExtras
): TenantAppointment => {
  const start = new Date(dto.startAt);
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    id: dto.id,
    customerId: dto.customerId,
    customer: dto.customerName || dto.customerPhone,
    phone: dto.customerPhone,
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    duration: dto.totalMinutes,
    service: dto.services[0]?.serviceName || 'Dịch vụ',
    services: dto.services.map((line) => line.serviceName),
    staff: dto.staffName,
    branch: dto.branchId,
    source: dto.source,
    // Cờ `refunded` phải phủ sau cùng: nó là trạng thái duy nhất của màn này mà
    // máy chủ không biết tới, nên nó chỉ tồn tại bằng cách đè lên trạng thái thật.
    status: extras.refunded ? 'REFUNDED' : dto.status,
    price,
    deposit: dto.deposit,
    note: dto.note || '',
    station: dto.station || undefined,
    // Cây render in thẳng `createdAt` ra màn hình, và bộ mẫu vốn chứa sẵn chuỗi
    // đã định dạng. Đưa nguyên chuỗi ISO của máy chủ vào thì dòng "Tạo lúc" hiện
    // `2026-09-03T07:22:43.933369+00:00` — đúng dữ liệu, sai chỗ đọc.
    createdAt: new Date(dto.createdAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    ...extras
  };
};

interface TenantAdminAppointmentsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
  branchLocked?: boolean;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
  bookingRequest?: {
    requestId: number;
    customerId: string;
    name: string;
    phone: string;
    branch: BranchCode;
    note: string;
    allergies: string;
    nailCondition: string;
    favoriteTechnician: string;
    tier?: string;
    points?: number;
    totalSpent?: number;
    visits?: number;
  } | null;
  onBookingRequestHandled?: () => void;
  /**
   * Tiệm đang làm việc. Rỗng thì màn chạy bằng dữ liệu mẫu — chế độ trình bày
   * và chế độ chưa chọn tiệm dùng chung một đường này, giống `TenantAdminReports`.
   */
  activeTenantId?: string | null;
  /** Chi nhánh thật của tiệm, để đổi mã bản ghi thành tên đọc được. */
  branches?: Array<{ id: string; name: string; code?: string }>;
}

interface AppointmentFormState {
  customerId: string;
  customer: string;
  phone: string;
  date: string;
  start: string;
  services: string[];
  staff: string;
  branch: BranchCode;
  source: AppointmentSource;
  status: AppointmentStatus;
  deposit: string;
  station: string;
  note: string;
}

/**
 * Từ vựng nghiệp vụ riêng của màn hình Lịch hẹn.
 *
 * Bảng này chỉ chứa CHỮ. Tông màu và icon của trạng thái luôn lấy từ
 * `STATUS_MAP` qua `getStatusDefinition`, nên đây không phải bảng ánh xạ trạng
 * thái thứ hai (README §15.2). `short` dùng cho cột lịch hẹp, nơi nhãn đầy đủ
 * bị cắt mất nghĩa.
 */
const appointmentStatusText: Record<AppointmentStatus, { label: string; short: string }> = {
  PENDING: { label: 'Chờ xác nhận', short: 'Chờ' },
  CONFIRMED: { label: 'Đã xác nhận', short: 'Xác nhận' },
  CHECKED_IN: { label: 'Đã đến', short: 'Đã đến' },
  IN_SERVICE: { label: 'Đang phục vụ', short: 'Phục vụ' },
  REFUNDED: { label: 'Đã hoàn tiền', short: 'Hoàn tiền' },
  COMPLETED: { label: 'Hoàn thành', short: 'Xong' },
  CANCELLED: { label: 'Đã hủy', short: 'Đã hủy' },
  NO_SHOW: { label: 'Không đến', short: 'Vắng' }
};

/** Tông ngữ nghĩa của một trạng thái. Nguồn duy nhất là `STATUS_MAP`. */
const statusTone = (status: AppointmentStatus) => getStatusDefinition(status).tone;

/**
 * Icon của trạng thái, cũng lấy từ `STATUS_MAP`. Thẻ lịch quá thấp không đủ
 * chỗ cho badge đầy đủ, nhưng vẫn phải có tín hiệu ngoài màu sắc (§5.2).
 */
function StatusGlyph({ status, className = '' }: { status: AppointmentStatus; className?: string }) {
  const Icon = getStatusDefinition(status).icon;
  return <Icon className={className} aria-hidden="true" />;
}

const sourceLabels: Record<AppointmentSource, string> = {
  ONLINE: 'Đặt lịch online',
  RECEPTION: 'Tại quầy',
  PHONE: 'Điện thoại',
  ZALO: 'Zalo'
};

const branchLabels: Record<BranchCode, string> = {
  Q1: 'Chi nhánh Quận 1',
  Q3: 'Chi nhánh Quận 3'
};

const cancellationReasons = [
  'Khách thay đổi kế hoạch',
  'Khách không phản hồi',
  'Khách yêu cầu đổi ngày',
  'Salon không đủ nguồn lực',
  'Trùng lịch hoặc sai thông tin',
  'Khác'
];

const refundReasons = [
  'Khách không hài lòng chất lượng dịch vụ',
  'KTV thao tác sai / làm đau / tổn thương móng',
  'Sản phẩm gây dị ứng / kích ứng da hoặc móng',
  'Sự cố kỹ thuật (hỏng máy, mất điện, hết vật tư)',
  'Khách có việc gấp phải dừng dịch vụ giữa chừng',
  'Khác'
];

const services = [
  { name: 'Gel Manicure', duration: 60, price: 450_000 },
  { name: 'Pedicure Spa', duration: 75, price: 550_000 },
  { name: 'Sơn gel Hàn Quốc', duration: 60, price: 620_000 },
  { name: 'Nail Art cơ bản', duration: 45, price: 400_000 },
  { name: 'Nail Art Premium', duration: 120, price: 980_000 },
  { name: 'Combo Manicure', duration: 75, price: 620_000 },
  { name: 'Combo VIP', duration: 120, price: 1_650_000 },
  { name: 'Tháo gel & phục hồi móng', duration: 40, price: 280_000 },
  { name: 'Đắp bột', duration: 90, price: 850_000 },
  { name: 'Nối móng Tips', duration: 90, price: 750_000 },
  { name: 'Đính đá nghệ thuật', duration: 30, price: 250_000 },
  { name: 'Waxing tay', duration: 30, price: 320_000 }
];

const staffDirectory = [
  { name: 'Thảo Nguyễn', branch: 'Q3' as BranchCode, initials: 'TN', role: 'Nail Artist Senior', shift: '08:00–18:00' },
  { name: 'Minh Châu', branch: 'Q3' as BranchCode, initials: 'MC', role: 'Pedicure Specialist', shift: '08:00–16:00' },
  { name: 'Quốc Bảo', branch: 'Q3' as BranchCode, initials: 'QB', role: 'Pedicure Specialist', shift: '08:00–17:00' },
  { name: 'Thuỳ Dương', branch: 'Q3' as BranchCode, initials: 'TD', role: 'Gel Nail Technician', shift: '12:00–20:00' },
  { name: 'An Nhiên', branch: 'Q3' as BranchCode, initials: 'AN', role: 'Nail Art Technician', shift: '12:00–20:00' },
  { name: 'Khánh Vy', branch: 'Q3' as BranchCode, initials: 'KV', role: 'Extension Specialist', shift: '08:00–20:00' },
  { name: 'Hà My', branch: 'Q1' as BranchCode, initials: 'HM', role: 'Nail Artist Senior', shift: '08:00–18:00' },
  { name: 'Gia Huy', branch: 'Q1' as BranchCode, initials: 'GH', role: 'Nail Technician', shift: '09:00–20:00' }
];

const stationDirectory: Record<BranchCode, string[]> = {
  Q3: ['M-01', 'M-02', 'M-03', 'M-04', 'P-01', 'P-02', 'VIP-01', 'VIP-02'],
  Q1: ['M-11', 'M-12', 'M-13', 'P-11', 'P-12', 'V-11', 'V-12']
};

export const generateAppointmentSeed = (): TenantAppointment[] => {
  const now = new Date();
  const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const prevDateObj = new Date(now.getTime() - 86_400_000);
  const prevDate = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}-${String(prevDateObj.getDate()).padStart(2, '0')}`;
  const nextDateObj = new Date(now.getTime() + 86_400_000);
  const nextDate = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;
  const createdAt = new Date().toISOString();

  return [
    { id: 'APT-1040', customer: 'Đặng Hải Yến', phone: '0903 114 668', date: currentDate, start: '08:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'COMPLETED', price: 380_000, deposit: 0, note: 'Da tay nhạy cảm, ưu tiên sản phẩm không mùi.', station: 'M-04', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt },
    { id: 'APT-1041', customer: 'Nguyễn Lan Anh', phone: '0988 226 510', date: currentDate, start: '08:15', duration: 90, service: 'Pedicure spa chuyên sâu', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'RECEPTION', status: 'COMPLETED', price: 650_000, deposit: 200_000, note: 'Không dùng sản phẩm tẩy tế bào chết có bạc hà.', station: 'P-02', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt },
    { id: 'APT-1042', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: currentDate, start: '10:00', duration: 120, service: 'Nail Art Premium', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'IN_SERVICE', price: 1_200_000, deposit: 500_000, note: 'Mẫu chrome bạc, khách đã gửi ảnh tham khảo qua Zalo.', station: 'VIP-01', reminderSent: true, createdBy: 'Website booking', createdAt },
    { id: 'APT-1043', customer: 'Trần Thu Hà', phone: '0908 337 912', date: currentDate, start: '10:15', duration: 75, service: 'Combo manicure & sơn gel', staff: 'Minh Châu', branch: 'Q3', source: 'ZALO', status: 'CHECKED_IN', price: 480_000, deposit: 100_000, note: 'Giữ form móng oval ngắn, tông nude công sở.', station: 'M-02', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt },
    { id: 'APT-1044', customer: 'Lê Ngọc Mai', phone: '0936 221 557', date: currentDate, start: '11:30', duration: 90, service: 'Pedicure spa chuyên sâu', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 650_000, deposit: 200_000, note: 'Khách lần đầu, cần tư vấn tình trạng móng trước khi làm.', station: 'P-01', reminderSent: true, createdBy: 'Website booking', firstVisit: true, createdAt },
    { id: 'APT-1045', customer: 'Phạm Hoài Nam', phone: '0977 660 341', date: currentDate, start: '13:45', duration: 45, service: 'Tháo gel & dưỡng móng', staff: 'Quốc Bảo', branch: 'Q3', source: 'PHONE', status: 'PENDING', price: 220_000, deposit: 0, note: 'Gọi lại xác nhận trước 12:00.', station: 'P-01', reminderSent: false, createdBy: 'Owner', firstVisit: true, createdAt },
    { id: 'APT-1046', customer: 'Vũ Khánh Linh', phone: '0909 552 770', date: currentDate, start: '15:00', duration: 150, service: 'Đắp gel nối móng', staff: 'Minh Châu', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_350_000, deposit: 500_000, note: 'Form almond dài vừa, phối french ombre.', station: 'VIP-02', reminderSent: true, createdBy: 'Website booking', createdAt },
    { id: 'APT-1047', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', date: currentDate, start: '16:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'ZALO', status: 'PENDING', price: 380_000, deposit: 0, note: 'Khách dùng voucher sinh nhật.', station: 'M-04', reminderSent: false, createdBy: 'Lễ tân Mai', createdAt },
    { id: 'APT-1048', customer: 'Đỗ Tuấn Kiệt', phone: '0918 734 662', date: currentDate, start: '16:30', duration: 45, service: 'Tháo gel & dưỡng móng', staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'CONFIRMED', price: 220_000, deposit: 0, note: '', station: 'P-01', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt },
    { id: 'APT-1049', customer: 'Trương Bảo Ngọc', phone: '0902 778 219', date: currentDate, start: '09:00', duration: 60, service: 'Dặm gel & sửa form', staff: 'Hà My', branch: 'Q1', source: 'PHONE', status: 'COMPLETED', price: 450_000, deposit: 200_000, note: 'Mã màu cũ đã lưu trong hồ sơ khách.', station: 'M-11', reminderSent: true, createdBy: 'Quản lý Q1', createdAt },
    { id: 'APT-1050', customer: 'Ngô Minh Châu', phone: '0966 124 700', date: currentDate, start: '13:00', duration: 120, service: 'Nail Art Premium', staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'CONFIRMED', price: 1_200_000, deposit: 500_000, note: 'Khách mới, kiểm tra tiền sử dị ứng gel và keo.', station: 'V-11', reminderSent: true, createdBy: 'Website booking', firstVisit: true, createdAt },
    { id: 'APT-1051', customer: 'Mai Đức Anh', phone: '0901 533 008', date: currentDate, start: '15:30', duration: 75, service: 'Combo manicure & sơn gel', staff: 'Gia Huy', branch: 'Q1', source: 'ZALO', status: 'PENDING', price: 480_000, deposit: 0, note: '', station: 'M-12', reminderSent: false, createdBy: 'Quản lý Q1', createdAt },
    { id: 'APT-1052', customer: 'Tạ Mỹ Duyên', phone: '0933 112 800', date: prevDate, start: '14:00', duration: 150, service: 'Đắp gel nối móng', staff: 'Minh Châu', branch: 'Q3', source: 'ONLINE', status: 'COMPLETED', price: 1_350_000, deposit: 500_000, note: '', station: 'VIP-02', reminderSent: true, createdBy: 'Website booking', createdAt },
    { id: 'APT-1053', customer: 'Huỳnh Phương Thảo', phone: '0905 811 229', date: nextDate, start: '09:30', duration: 120, service: 'Nail Art Premium', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_200_000, deposit: 500_000, note: 'Khách cần hoàn tất trước 12:00.', station: 'VIP-01', reminderSent: true, createdBy: 'Website booking', createdAt },
    { id: 'APT-1054', customer: 'Phan Gia Hân', phone: '0974 360 118', date: nextDate, start: '13:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'PENDING', price: 380_000, deposit: 0, note: '', station: 'M-04', reminderSent: false, createdBy: 'Owner', createdAt },
    { id: 'APT-1055', customer: 'Lê Hoàng Nam', phone: '0919 445 882', date: currentDate, start: '17:00', duration: 45, service: 'Tháo gel & dưỡng móng', staff: 'Quốc Bảo', branch: 'Q3', source: 'PHONE', status: 'CANCELLED', price: 220_000, deposit: 0, note: 'Khách gọi báo hoãn', station: 'P-01', reminderSent: false, createdBy: 'Lễ tân Mai', cancellationReason: '', cancellationNote: '', cancelledAt: '10:30 · Hôm nay', cancelledBy: 'Lễ tân Mai', createdAt },
    { id: 'APT-1056', customer: 'Võ Mai Phương', phone: '0908 991 234', date: currentDate, start: '14:15', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'REFUNDED', price: 380_000, deposit: 100_000, note: 'Khách bị rát da tay khi hơ đèn gel, đã xử lý hoàn tiền tại chỗ và sát khuẩn.', station: 'M-03', reminderSent: true, createdBy: 'Lễ tân Mai', refundAmount: 380_000, refundReason: 'Sản phẩm gây dị ứng / kích ứng da hoặc móng', refundMethod: 'CASH', refundNote: 'Đã hoàn 380.000đ tiền mặt tại quầy, tặng voucher dưỡng móng 100k cho lần sau.', refundedAt: '15:05 · Hôm nay', refundedBy: 'Lễ tân Mai', createdAt }
  ];
};

export const appointmentSeed: TenantAppointment[] = generateAppointmentSeed();

const nextStatus: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'CHECKED_IN',
  CHECKED_IN: 'IN_SERVICE',
  IN_SERVICE: 'COMPLETED'
};

const nextStatusLabel: Partial<Record<AppointmentStatus, string>> = {
  PENDING: 'Xác nhận lịch',
  CONFIRMED: 'Khách đã đến',
  CHECKED_IN: 'Bắt đầu phục vụ',
  IN_SERVICE: 'Hoàn thành dịch vụ'
};

/**
 * Control đứng một mình trên thanh công cụ (ô tìm kiếm, chọn ngày). Control
 * nằm trong biểu mẫu dùng `Field`, được `.ui-field` tạo hình sẵn.
 */
const controlClass = 'h-[var(--size-control-sm)] w-full rounded-control border border-brand-outline bg-brand-surface px-3 text-body text-brand-text outline-none';

// Giữ trọn ngày làm việc 08:00–20:00 trong tầm nhìn, không tạo thanh cuộn dọc
// lồng nhau. Chi tiết lịch hẹn vẫn mở được ở hộp thoại sau khi chọn thẻ.
// 56px mỗi giờ là mức tối thiểu để thẻ 60 phút chứa được chữ 13–14px — sàn
// typography của README §4.3 — mà không phải cắt nội dung.
const SCHEDULE_HOUR_HEIGHT = 56;
const SCHEDULE_BOTTOM_GUTTER = 22;
/** Chiều cao tạm tính của đầu cột nhân viên, dùng trước khi đo được thật. */
const SCHEDULE_EXPANDED_STAFF_HEADER_HEIGHT = 56;
const STAFF_COLUMNS_PER_PAGE = 6;
/** Bề ngang mong muốn của một cột nhân viên khi còn dư chỗ. */
const SCHEDULE_PREFERRED_COLUMN_WIDTH = 220;
/**
 * Bề ngang tối thiểu vẫn còn đọc được tên và tỉ lệ kín lịch của một cột.
 *
 * Dưới mức này thì thu hẹp thêm cũng vô nghĩa vì tên nhân viên bị cắt gần hết,
 * nên lúc đó mới chấp nhận cho lưới cuộn ngang.
 */
const SCHEDULE_MIN_COLUMN_WIDTH = 140;
/** Thẻ ngắn nhất vẫn phải đọc được giờ và tên khách. */
const SCHEDULE_MIN_CARD_HEIGHT = 44;

const toDate = (date: string) => new Date(`${date}T00:00:00`);

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialScheduleDate = (appointments: TenantAppointment[], branch: string, referenceDate: string) => {
  const availableDates = Array.from(new Set(
    appointments
      .filter((appointment) => branch === 'ALL' || appointment.branch === branch)
      .map((appointment) => appointment.date)
  ));
  if (!availableDates.length || availableDates.includes(referenceDate)) return referenceDate;

  const referenceTime = toDate(referenceDate).getTime();
  return availableDates.sort((first, second) => {
    const firstDistance = Math.abs(toDate(first).getTime() - referenceTime);
    const secondDistance = Math.abs(toDate(second).getTime() - referenceTime);
    return firstDistance - secondDistance || second.localeCompare(first);
  })[0];
};

const addDays = (date: string, amount: number) => {
  const next = toDate(date);
  next.setDate(next.getDate() + amount);
  return toIsoDate(next);
};

const getWeekDates = (selectedDate: string) => {
  const current = toDate(selectedDate);
  const mondayOffset = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(current);
    day.setDate(current.getDate() + index);
    return toIsoDate(day);
  });
};


const formatSelectedDate = (date: string) => toDate(date).toLocaleDateString('vi-VN', {
  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
});

const isValid24HourTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

const format24HourInput = (value: string) => {
  const sanitized = value.replace(/[^\d:]/g, '').slice(0, 5);
  if (sanitized.includes(':')) return sanitized;
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

export const SALON_OPEN_MINUTES = 8 * 60; // 08:00 (480 min)
export const SALON_CLOSE_MINUTES = 20 * 60 + 30; // 20:30 (1230 min)
export const SALON_LAST_BOOKING_MINUTES = 20 * 60; // 20:00 (1200 min)

export const formatMinutesFromStart = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getOperationalDefaultTime = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes >= SALON_OPEN_MINUTES && currentMinutes <= SALON_LAST_BOOKING_MINUTES) {
    const rounded = Math.ceil(currentMinutes / 5) * 5;
    return formatMinutesFromStart(Math.min(rounded, SALON_LAST_BOOKING_MINUTES));
  }
  return '08:00';
};

const minutesFromStart = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const getEndTime = (start: string, duration: number) => {
  const end = minutesFromStart(start) + duration;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
};

const emptyForm = (date: string, branch: string): AppointmentFormState => ({
  customerId: '',
  customer: '',
  phone: '',
  date,
  start: getOperationalDefaultTime(),
  services: [services[0].name],
  staff: branch === 'Q1' ? 'Hà My' : 'Thảo Nguyễn',
  branch: branch === 'Q1' ? 'Q1' : 'Q3',
  source: 'RECEPTION',
  status: 'PENDING',
  deposit: '0',
  station: branch === 'Q1' ? 'M-11' : 'M-01',
  note: ''
});

export default function TenantAdminAppointments({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  branchLocked = false,
  tenantName = 'Nailé Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason = '',
  onNotify,
  bookingRequest,
  onBookingRequestHandled,
  activeTenantId,
  branches = []
}: TenantAdminAppointmentsProps) {
  /**
   * Mã chi nhánh dùng để LỌC, quy về `'ALL'` khi nó không phải mã của dữ liệu mẫu.
   *
   * Màn này chạy hoàn toàn bằng dữ liệu mẫu (§9.2) và mọi dòng mẫu mang mã `'Q1'` hoặc `'Q3'`.
   * Cổng chủ tiệm thì truyền xuống `branch` — từ ngày 9 là **mã định danh bản ghi**, kiểu
   * `BRN-LUMIERE-Q3`. Không mã nào khớp, nên phép lọc ở dưới loại sạch: lịch tuần hiện "0 lịch"
   * cả bảy ngày, danh sách kỹ thuật viên báo "Không tìm thấy nhân viên" dù ô tìm đang trống, và
   * dòng tóm tắt in ra `branchLabels[...]` là `undefined`.
   *
   * Dải nhãn ở đầu trang đã nói rõ đây là dữ liệu mẫu, nên vấn đề không phải nguồn dữ liệu mà là
   * **màn hình nói dối về chính bộ mẫu của nó**: bộ mẫu có lịch, trang thì bảo không có. Không
   * biết lọc theo một chi nhánh thì hiện tất cả, đừng hiện rỗng.
   */
  /** Đã chọn tiệm thì màn chạy dữ liệu thật; chưa chọn thì rơi về bộ mẫu. */
  const live = Boolean(activeTenantId);

  /**
   * Nhãn chi nhánh — thật khi đã chọn tiệm, mẫu khi chưa.
   *
   * Đây chính là chỗ chữa lỗi mà chú thích ngay trên đã tả: bộ mẫu mang mã `'Q1'`
   * và `'Q3'`, còn cổng chủ tiệm truyền xuống mã bản ghi kiểu `BRN-LUMIERE-Q3`.
   * Trước đây không mã nào khớp nên phép lọc loại sạch. Nay hai chế độ có hai
   * bảng nhãn riêng, và `branchFilter` hỏi đúng bảng của chế độ đang chạy.
   */
  const branchNames = useMemo<Record<string, string>>(() => (
    live && branches.length
      ? Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
      : branchLabels
  ), [live, branches]);

  /**
   * Nhãn **ngắn** của chi nhánh, cho những chỗ chỉ có chiều ngang của một con chip.
   *
   * Bộ mẫu vốn dùng mã hai ký tự (`Q1`, `Q3`) nên chip vừa vặn. Chi nhánh thật
   * mang mã bản ghi kiểu `BRN-LUMIERE-Q3`: đặt nguyên nó vào chip thì chip đẩy
   * hết bề ngang và **tên kỹ thuật viên bên cạnh bị cắt sạch** — đầu cột hóa ra
   * chỉ còn mã chi nhánh, đúng lỗi lộ ra lúc chạy thử. Nên ở đây ưu tiên mã do
   * tiệm tự đặt, rồi mới tới tên, và cuối cùng mới tới mã bản ghi.
   */
  const branchShortNames = useMemo<Record<string, string>>(() => (
    live && branches.length
      ? Object.fromEntries(branches.map((branch) => [branch.id, branch.code || branch.name]))
      : branchLabels
  ), [live, branches]);

  const branchFilter = selectedBranch in branchNames ? selectedBranch : 'ALL';

  const storageKey = tenantStorageKey('tenant-admin-appointments-v2');
  const extrasStorageKey = tenantStorageKey('tenant-admin-appointment-extras-v1');
  const todayDate = toIsoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayDate);

  /**
   * Nạp trọn **tuần** chứ không phải ngày đang chọn.
   *
   * Dải chọn ngày ở đầu bảng vẽ vạch mật độ cho cả bảy ngày, nên nạp một ngày
   * thì sáu ngày còn lại luôn hiện "0 lịch" — trang nói sai về chính nó. Nạp
   * theo tuần cũng làm việc bấm qua lại giữa các ngày trong cùng tuần không phải
   * gọi mạng lần nào.
   */
  const weekRange = useMemo(() => {
    const dates = getWeekDates(selectedDate);
    return { from: `${dates[0]}T00:00:00+07:00`, to: `${dates[6]}T23:59:59+07:00` };
  }, [selectedDate]);

  const board = useAppointmentRange(live, activeTenantId || null, weekRange.from, weekRange.to);
  const staffDirectoryLive = useStaff(live, activeTenantId || null);
  const serviceDirectoryLive = useSalonServices(live, activeTenantId || null);
  const customerDirectoryLive = useCustomers(live, activeTenantId || null);

  const [mockAppointments, setMockAppointments] = useState<TenantAppointment[]>(() => {
    if (typeof window === 'undefined') return generateAppointmentSeed();
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return getTenantAdminInitialData(null, generateAppointmentSeed());
    } catch {
      return generateAppointmentSeed();
    }
  });

  const [appointmentExtras, setAppointmentExtras] = useState<Record<string, TenantAppointmentExtras>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.localStorage.getItem(extrasStorageKey) || '{}');
    } catch {
      return {};
    }
  });

  /** Bảng giá hiện hành, tra theo mã dịch vụ — máy chủ không gửi giá kèm lịch hẹn. */
  const livePriceByServiceId = useMemo(() => (
    new Map(serviceDirectoryLive.services.map((service) => [service.id, service.price]))
  ), [serviceDirectoryLive.services]);

  /**
   * Ba danh mục mà biểu mẫu đọc — dịch vụ, kỹ thuật viên, khách — mỗi cái một
   * bảng cho chế độ thật và một bảng cho bộ mẫu.
   *
   * Cả ba đều mang thêm `id` bên cạnh `name`. Biểu mẫu ở màn này giữ **tên** chứ
   * không giữ mã, ở hàng chục chỗ; đổi nó thành mã là viết lại biểu mẫu. Nên
   * `id` đi kèm để lúc gửi lên máy chủ còn dịch ngược được từ tên sang mã, và
   * cây render không phải biết chuyện đó.
   *
   * Thời lượng của một dịch vụ là **thời gian làm cộng thời gian dọn dẹp**
   * (BR-SVC-003, BR-APT-010) — đúng con số mà phép chống trùng lịch ở máy chủ
   * tính trên. Lấy thiếu vế sau thì giao diện vẽ một buổi hẹn ngắn hơn chỗ nó
   * thật sự chiếm, và người xếp lịch sẽ tưởng còn trống.
   */
  const serviceCatalog = useMemo(() => (
    live
      ? serviceDirectoryLive.services
        .filter((service) => service.status === 'ACTIVE')
        .map((service) => ({
          id: service.id,
          name: service.name,
          duration: service.durationMinutes + service.bufferMinutes,
          price: service.price
        }))
      : services.map((service) => ({ id: service.name, ...service }))
  ), [live, serviceDirectoryLive.services]);

  const staffRoster = useMemo(() => (
    live
      ? staffDirectoryLive.staff
        .filter((staff) => staff.role === 'TECHNICIAN' && staff.status !== 'INACTIVE')
        .map((staff) => ({
          id: staff.id,
          name: staff.fullName,
          branch: staff.branchId as BranchCode,
          initials: staff.fullName.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join('') || 'NV',
          role: 'Kỹ thuật viên',
          shift: `${staff.shiftStart}–${staff.shiftEnd}`
        }))
      : staffDirectory.map((staff) => ({ id: staff.name, ...staff }))
  ), [live, staffDirectoryLive.staff]);

  /**
   * Ghế và khu vực nằm ở mức C của §9.3 — không có bảng, không có endpoint.
   *
   * Bộ mẫu khóa theo mã `'Q1'`/`'Q3'`, còn chi nhánh thật mang mã bản ghi, nên ở
   * chế độ thật phép tra luôn trượt. Trả mảng rỗng thay vì để `undefined` chạy
   * tiếp: chỗ gọi cũ lấy thẳng phần tử `[0]` và sẽ ném lỗi giữa lúc mở biểu mẫu.
   */
  const stationsFor = useCallback((branch: string): string[] => (
    live ? [] : stationDirectory[branch] || []
  ), [live]);

  const appointments = useMemo<TenantAppointment[]>(() => {
    if (!live) return mockAppointments;

    return board.appointments.map((dto) => toTenantAppointment(
      dto,
      dto.services.reduce((sum, line) => sum + (livePriceByServiceId.get(line.serviceId) || 0), 0),
      appointmentExtras[dto.id] || {}
    ));
  }, [live, mockAppointments, board.appointments, livePriceByServiceId, appointmentExtras]);

  const initialDate = todayDate;

  /**
   * Ngăn chi tiết luôn đọc bản mới nhất của lịch hẹn đang mở.
   *
   * Mỗi lần ghi thành công, hook nạp lại cả tuần — và `endAt`, `totalMinutes`,
   * `nextStatuses` đều do máy chủ suy ra nên bản vừa nạp mới là bản đúng. Không
   * đồng bộ lại thì ngăn chi tiết giữ ảnh chụp lúc bấm, và nếu máy chủ từ chối
   * bước chuyển trạng thái thì nó vẫn hiện trạng thái mà người dùng tưởng là đã
   * đổi được.
   */
  useEffect(() => {
    if (!live) return;

    setSelectedAppointment((current) => {
      if (!current) return current;

      const fresh = appointments.find((appointment) => appointment.id === current.id);

      return fresh || current;
    });
  }, [live, appointments]);
  const [didAutoLocateSchedule, setDidAutoLocateSchedule] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('SCHEDULE');
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const scheduleViewportRef = useRef<HTMLDivElement | null>(null);
  const [scheduleViewportHeight, setScheduleViewportHeight] = useState(0);
  const [scheduleViewportWidth, setScheduleViewportWidth] = useState(0);
  const [scheduleStaffHeaderHeight, setScheduleStaffHeaderHeight] = useState(SCHEDULE_EXPANDED_STAFF_HEADER_HEIGHT);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [operationalFilter, setOperationalFilter] = useState<OperationalFilter>('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffPage, setStaffPage] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | AppointmentSource>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<TenantAppointment | null>(null);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | null>(null);
  /**
   * Biểu mẫu trống, điền sẵn bằng danh mục **đang thật sự có**.
   *
   * `emptyForm` ở tầng module chép cứng dịch vụ, kỹ thuật viên, chi nhánh và ghế
   * của bộ mẫu. Ở chế độ dữ liệu thật không cái nào tồn tại: ô dịch vụ hiện
   * "1 đã chọn" mà không ô nào được tick, ô kỹ thuật viên rỗng, và chi nhánh trỏ
   * vào một mã không có trong danh sách. Nên ở chế độ ấy phải điền lại bằng phần
   * tử đầu của từng danh mục thật.
   */
  const makeEmptyForm = useCallback((date: string, branch: string): AppointmentFormState => {
    const base = emptyForm(date, branch);

    if (!live) return base;

    const targetBranch = branch in branchNames ? branch : Object.keys(branchNames)[0] || '';
    const firstStaff = staffRoster.find((staff) => staff.branch === targetBranch);

    return {
      ...base,
      services: serviceCatalog.length ? [serviceCatalog[0].name] : [],
      staff: firstStaff?.name || '',
      branch: targetBranch,
      station: ''
    };
  }, [live, branchNames, staffRoster, serviceCatalog]);

  const [form, setForm] = useState<AppointmentFormState>(() => emptyForm(initialDate, selectedBranch));
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationNote, setCancellationNote] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY'>('CASH');
  const [refundNote, setRefundNote] = useState('');
  const [refundError, setRefundError] = useState('');
  const canManage = accessMode === 'full' && !readOnlyReason;
  const isReceptionist = roleLabel.toLowerCase().startsWith('receptionist');
  const now = new Date();
  const currentTimeLabel = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const currentMinuteOfDay = now.getHours() * 60 + now.getMinutes();

  // Đồng bộ danh sách khách hàng từ hồ sơ Salon (Tenant Customers)
  const [mockCustomerList, setMockCustomerList] = useState<TenantCustomer[]>(() => getTenantCustomers());

  /**
   * Danh bạ khách cho ô chọn khách của biểu mẫu.
   *
   * Ở chế độ thật, bảy trường sau **để trống** chứ không bịa: `points`,
   * `favoriteTechnician`, `preferences`, `allergies`, `nailCondition`, `tags`,
   * `history`. Loyalty và hồ sơ móng nằm ở mức C/D của §9.3–9.4 — không có bảng
   * nào phía sau. Điền số 0 hay chuỗi rỗng ở đây là để cây render tự ẩn các khối
   * ấy đi bằng chính phép kiểm nó đã có, thay vì hiện "0 điểm tích luỹ" cho một
   * khách thật và làm người xem tưởng hệ thống đã tính.
   *
   * `branch` cũng để rỗng: khách ở máy chủ **không thuộc chi nhánh nào** — họ
   * thuộc tiệm. Đó là quyết định của lược đồ, không phải thiếu sót.
   */
  const customerList = useMemo<TenantCustomer[]>(() => (
    live
      ? customerDirectoryLive.customers.map((customer) => ({
        id: customer.id,
        name: customer.fullName || customer.phone,
        phone: customer.phone,
        email: customer.email || '',
        birthday: customer.birthDate || '',
        branch: '' as TenantCustomer['branch'],
        tier: customer.tier,
        status: customer.status,
        source: '',
        visits: customer.visits,
        totalSpent: customer.totalSpent,
        points: 0,
        lastVisit: customer.lastVisitAt || '',
        favoriteTechnician: '',
        preferences: [],
        allergies: '',
        nailCondition: '',
        note: customer.note || '',
        consent: [],
        tags: [],
        history: [],
        activity: []
      }))
      : mockCustomerList
  ), [live, customerDirectoryLive.customers, mockCustomerList]);

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [isCustomerUnlinked, setIsCustomerUnlinked] = useState(false);

  useEffect(() => {
    if (live) return;

    const handleCustomersUpdated = () => {
      setMockCustomerList(getTenantCustomers());
    };
    window.addEventListener('salonsys_customers_updated', handleCustomersUpdated);
    window.addEventListener('storage', handleCustomersUpdated);
    return () => {
      window.removeEventListener('salonsys_customers_updated', handleCustomersUpdated);
      window.removeEventListener('storage', handleCustomersUpdated);
    };
  }, [live, tenantName]);

  // Khách hàng đang được khớp với form hiện tại
  const cleanPhoneInput = form.phone.replace(/[\s.-]/g, '');
  const matchedCustomer = useMemo(() => {
    if (isCustomerUnlinked) return null;
    if (form.customerId) {
      const byId = customerList.find((c) => c.id === form.customerId);
      if (byId) return byId;
    }
    if (cleanPhoneInput && cleanPhoneInput.length >= 9) {
      const byPhone = customerList.find((c) => c.phone.replace(/[\s.-]/g, '') === cleanPhoneInput);
      if (byPhone) return byPhone;
    }
    return null;
  }, [customerList, form.customerId, cleanPhoneInput, isCustomerUnlinked]);

  // Khách hàng liên kết với lịch hẹn đang được xem chi tiết
  const matchedCustomerDetail = useMemo(() => {
    if (!selectedAppointment) return null;
    if (selectedAppointment.customerId) {
      const byId = customerList.find((c) => c.id === selectedAppointment.customerId);
      if (byId) return byId;
    }
    const aptPhoneDigits = selectedAppointment.phone.replace(/[\s.-]/g, '');
    if (aptPhoneDigits) {
      const byPhone = customerList.find((c) => c.phone.replace(/[\s.-]/g, '') === aptPhoneDigits);
      if (byPhone) return byPhone;
    }
    return null;
  }, [customerList, selectedAppointment]);

  const selectCustomer = (customer: TenantCustomer) => {
    setIsCustomerUnlinked(false);
    const preferredStaff = (customer.favoriteTechnician && customer.favoriteTechnician !== 'Chưa xác định')
      ? staffRoster.find((staff) => staff.branch === form.branch && staff.name === customer.favoriteTechnician)?.name
      : undefined;
    const safetyNotes = [
      customer.note,
      customer.allergies && customer.allergies !== 'Không ghi nhận' && customer.allergies !== 'Chưa khai báo' ? `Dị ứng: ${customer.allergies}` : '',
      customer.nailCondition && customer.nailCondition !== 'Chưa đánh giá' ? `Tình trạng móng: ${customer.nailCondition}` : '',
      customer.preferences?.length ? `Sở thích: ${customer.preferences.join(', ')}` : ''
    ].filter(Boolean).join('\n');

    setForm((current) => ({
      ...current,
      customerId: customer.id,
      customer: customer.name,
      phone: customer.phone,
      staff: preferredStaff || current.staff,
      note: current.note ? `${current.note}\n${safetyNotes}` : safetyNotes
    }));
    if (fieldErrors.customer) setFieldErrors((prev) => ({ ...prev, customer: '' }));
    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
    setCustomerSearchQuery('');
    setCustomerDropdownOpen(false);
    setShowCustomerPicker(false);
    onNotify?.(`Đã đồng bộ hồ sơ ${customer.name} (Tích luỹ: ${customer.points.toLocaleString('vi-VN')} điểm).`);
  };

  const clearCustomerLink = () => {
    setIsCustomerUnlinked(true);
    setForm((current) => ({
      ...current,
      customerId: ''
    }));
    onNotify?.('Đã bỏ liên kết hồ sơ khách hàng. Thông tin sẽ được lưu độc lập.');
  };

  // Gợi ý khách hàng khi nhập tên hoặc số điện thoại
  const customerSuggestions = useMemo(() => {
    if (!customerDropdownOpen && !form.customer.trim() && !form.phone.trim()) return [];
    const query = (customerSearchQuery || form.customer || form.phone).toLowerCase().trim();
    if (!query || query.length < 2) return [];
    const digits = query.replace(/\D/g, '');
    return customerList.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(query);
      const phoneMatch = Boolean(digits && c.phone.replace(/\D/g, '').includes(digits));
      const idMatch = c.id.toLowerCase().includes(query);
      return nameMatch || phoneMatch || idMatch;
    }).slice(0, 5);
  }, [customerList, customerDropdownOpen, customerSearchQuery, form.customer, form.phone]);

  /**
   * Hai hiệu ứng dưới đây chỉ chạy ở **chế độ dữ liệu mẫu**.
   *
   * Ở chế độ thật, nguồn sự thật là máy chủ: ghi lịch hẹn xuống `localStorage`
   * rồi phát sự kiện cho tab khác đọc lại là dựng một bản sao thứ hai, và bản
   * sao ấy sẽ già đi ngay khi ai đó đặt lịch ở máy khác. Việc đồng bộ giữa hai
   * máy do `board.reload()` lo — mỗi lần ghi thành công là một lần nạp lại.
   */
  useEffect(() => {
    if (live) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(mockAppointments));
      window.dispatchEvent(new CustomEvent('salonsys_appointments_updated', { detail: { tenantName, appointments: mockAppointments } }));
    } catch {
      // Local storage optional
    }
  }, [live, mockAppointments, storageKey, tenantName]);

  useEffect(() => {
    if (live) return;

    const handleAppointmentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; appointments?: TenantAppointment[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.appointments) {
          setMockAppointments(customEvent.detail.appointments);
        } else {
          try {
            const stored = window.localStorage.getItem(storageKey);
            if (stored) setMockAppointments(JSON.parse(stored));
          } catch {
            // ignore
          }
        }
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setMockAppointments(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('salonsys_appointments_updated', handleAppointmentsUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('salonsys_appointments_updated', handleAppointmentsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [live, storageKey, tenantName]);

  /** Ghi phần trang trí xuống máy này. Không phụ thuộc chế độ: bộ mẫu không dùng tới nó. */
  const patchAppointmentExtras = useCallback((id: string, patch: TenantAppointmentExtras) => {
    setAppointmentExtras((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } };

      try {
        window.localStorage.setItem(extrasStorageKey, JSON.stringify(next));
      } catch {
        // Local storage optional
      }

      return next;
    });
  }, [extrasStorageKey]);

  useEffect(() => {
    if (!bookingRequest) return;
    setIsCustomerUnlinked(false);
    const preferredStaff = (bookingRequest.favoriteTechnician && bookingRequest.favoriteTechnician !== 'Chưa xác định')
      ? staffRoster.find((staff) => staff.branch === bookingRequest.branch && staff.name === bookingRequest.favoriteTechnician)?.name
      : undefined;
    const safetyNotes = [
      bookingRequest.note,
      bookingRequest.allergies && bookingRequest.allergies !== 'Không ghi nhận' && bookingRequest.allergies !== 'Chưa khai báo' ? `Dị ứng: ${bookingRequest.allergies}` : '',
      bookingRequest.nailCondition && bookingRequest.nailCondition !== 'Chưa đánh giá' ? `Tình trạng móng: ${bookingRequest.nailCondition}` : ''
    ].filter(Boolean).join('\n');
    const nextForm = makeEmptyForm(selectedDate, bookingRequest.branch);
    setForm({
      ...nextForm,
      customerId: bookingRequest.customerId,
      customer: bookingRequest.name,
      phone: bookingRequest.phone,
      staff: preferredStaff || nextForm.staff,
      note: safetyNotes
    });
    setFormError('');
    setSelectedAppointment(null);
    setFormMode('CREATE');
    onBookingRequestHandled?.();
  }, [bookingRequest, onBookingRequestHandled, selectedDate]);

  // Ba hộp thoại của màn hình đã chuyển sang `Modal`, vốn tự lo Escape, bẫy
  // focus, trả focus và khoá cuộn nền. Chỉ còn chế độ xem lịch toàn màn hình —
  // không phải hộp thoại — cần tự xử lý, và chỉ khi không có hộp thoại nào mở.
  useEffect(() => {
    if (!isScheduleExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedAppointment || formMode || showCancelForm) return;
      setIsScheduleExpanded(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [formMode, isScheduleExpanded, selectedAppointment, showCancelForm]);

  /**
   * Đo khung lịch ở CẢ hai chế độ: chiều cao để giãn thang giờ khi mở toàn màn
   * hình, còn bề ngang để chia đều cột nhân viên cho vừa khung (xem
   * scheduleColumnWidth bên dưới).
   *
   * Gắn observer bằng callback ref chứ không bằng useEffect: khung lịch bị tháo
   * ra lắp lại khi đổi giữa chế độ thường và toàn màn hình, mà useEffect chỉ chạy
   * lại theo danh sách phụ thuộc nên observer dễ mắc kẹt ở node cũ đã rời DOM —
   * lúc đó bề ngang đo được đứng yên và lưới không co giãn theo cửa sổ nữa.
   */
  const scheduleResizeObserverRef = useRef<ResizeObserver | null>(null);
  const scheduleMeasureRef = useRef<(() => void) | null>(null);
  const attachScheduleViewport = useCallback((node: HTMLDivElement | null) => {
    scheduleViewportRef.current = node;
    scheduleResizeObserverRef.current?.disconnect();
    scheduleResizeObserverRef.current = null;
    if (!node) return;
    const measureViewport = () => {
      const box = node.getBoundingClientRect();
      setScheduleViewportHeight(Math.floor(box.height));
      setScheduleViewportWidth(Math.floor(box.width));
    };
    measureViewport();
    scheduleMeasureRef.current = measureViewport;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureViewport);
    observer.observe(node);
    scheduleResizeObserverRef.current = observer;
  }, []);

  // Dự phòng cho ResizeObserver: một số môi trường không phát callback khi trang
  // không được vẽ. Sự kiện resize của cửa sổ phủ đúng trường hợp hay gặp nhất là
  // người dùng đổi kích thước cửa sổ hoặc xoay ngang thiết bị.
  useEffect(() => {
    const handleResize = () => scheduleMeasureRef.current?.();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /**
   * Đo luôn đầu cột nhân viên vì nó dính ở đỉnh khung và ăn vào chỗ của thang
   * giờ. Chiều cao thật đổi theo nội dung — tên dài, badge chi nhánh khi xem
   * "Tất cả chi nhánh" — nên không đoán được: hằng số 56px trước đây thấp hơn
   * chiều cao thật (~70px), khiến lưới cao hơn khung và khung giờ cuối ngày bị
   * cắt mất ở chế độ toàn màn hình.
   */
  const scheduleHeaderObserverRef = useRef<ResizeObserver | null>(null);
  const attachScheduleStaffHeader = useCallback((node: HTMLDivElement | null) => {
    scheduleHeaderObserverRef.current?.disconnect();
    scheduleHeaderObserverRef.current = null;
    if (!node) {
      setScheduleStaffHeaderHeight(SCHEDULE_EXPANDED_STAFF_HEADER_HEIGHT);
      return;
    }
    const measureHeader = () => setScheduleStaffHeaderHeight(Math.ceil(node.getBoundingClientRect().height));
    measureHeader();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureHeader);
    observer.observe(node);
    scheduleHeaderObserverRef.current = observer;
  }, []);

  useEffect(() => () => {
    scheduleResizeObserverRef.current?.disconnect();
    scheduleHeaderObserverRef.current?.disconnect();
  }, []);

  const requireManageAccess = () => {
    if (canManage) return true;
    onNotify?.(readOnlyReason || 'Gói hiện tại chỉ cho phép xem lịch hẹn. Vui lòng nâng cấp để thay đổi dữ liệu.');
    return false;
  };

  const scopedAppointments = useMemo(() => appointments.filter((appointment) => (
    appointment.date === selectedDate && (branchFilter === 'ALL' || appointment.branch === branchFilter)
  )), [appointments, selectedBranch, selectedDate]);

  useEffect(() => {
    if (didAutoLocateSchedule) return;
    if (scopedAppointments.length) {
      setDidAutoLocateSchedule(true);
      return;
    }
    const nearestDate = getInitialScheduleDate(appointments, branchFilter, selectedDate);
    if (nearestDate !== selectedDate) setSelectedDate(nearestDate);
    setDidAutoLocateSchedule(true);
  }, [appointments, didAutoLocateSchedule, scopedAppointments.length, selectedBranch, selectedDate]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedAppointments
      .filter((appointment) => statusFilter === 'ALL' || appointment.status === statusFilter)
      .filter((appointment) => {
        if (operationalFilter === 'ACTION') return appointment.status === 'PENDING' || (!appointment.reminderSent && ['PENDING', 'CONFIRMED'].includes(appointment.status));
        if (operationalFilter === 'IN_SALON') return ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status);
        if (operationalFilter === 'CONFIRMED') return appointment.status === 'CONFIRMED';
        return true;
      })
      .filter((appointment) => staffFilter === 'ALL' || appointment.staff === staffFilter)
      .filter((appointment) => sourceFilter === 'ALL' || appointment.source === sourceFilter)
      .filter((appointment) => !query || `${appointment.id} ${appointment.customer} ${appointment.phone} ${appointment.service} ${appointment.staff}`.toLowerCase().includes(query))
      .sort((first, second) => first.start.localeCompare(second.start));
  }, [operationalFilter, scopedAppointments, searchQuery, sourceFilter, staffFilter, statusFilter]);

  const scheduleStaff = useMemo(() => {
    const directoryStaff = staffRoster.filter((staff) => branchFilter === 'ALL' || staff.branch === branchFilter);
    const knownNames = new Set(directoryStaff.map((staff) => staff.name));
    const appointmentStaff = scopedAppointments.reduce<typeof staffRoster>((result, appointment) => {
      if (knownNames.has(appointment.staff) || result.some((staff) => staff.name === appointment.staff)) return result;
      const initials = appointment.staff.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join('');
      result.push({ id: appointment.staff, name: appointment.staff, branch: appointment.branch, initials: initials || 'NV', role: 'Kỹ thuật viên', shift: '08:00–20:00' });
      return result;
    }, []);
    const appointmentCount = new Map<string, number>();
    scopedAppointments.forEach((appointment) => appointmentCount.set(appointment.staff, (appointmentCount.get(appointment.staff) || 0) + 1));
    return [...directoryStaff, ...appointmentStaff].sort((first, second) => (
      (appointmentCount.get(second.name) || 0) - (appointmentCount.get(first.name) || 0)
      || first.name.localeCompare(second.name, 'vi')
    ));
  }, [scopedAppointments, selectedBranch]);

  const filteredScheduleStaff = useMemo(() => {
    const query = staffSearchQuery.trim().toLowerCase();
    return scheduleStaff
      .filter((staff) => staffFilter === 'ALL' || staff.name === staffFilter)
      .filter((staff) => !query || `${staff.name} ${staff.role} ${branchNames[staff.branch] || ""}`.toLowerCase().includes(query));
  }, [scheduleStaff, staffFilter, staffSearchQuery]);

  const staffPageCount = Math.max(1, Math.ceil(filteredScheduleStaff.length / STAFF_COLUMNS_PER_PAGE));
  const visibleScheduleStaff = useMemo(() => {
    const start = staffPage * STAFF_COLUMNS_PER_PAGE;
    return filteredScheduleStaff.slice(start, start + STAFF_COLUMNS_PER_PAGE);
  }, [filteredScheduleStaff, staffPage]);
  const visibleStaffStart = filteredScheduleStaff.length ? staffPage * STAFF_COLUMNS_PER_PAGE + 1 : 0;
  const visibleStaffEnd = Math.min((staffPage + 1) * STAFF_COLUMNS_PER_PAGE, filteredScheduleStaff.length);

  useEffect(() => {
    setStaffPage(0);
  }, [selectedBranch, staffFilter, staffSearchQuery]);

  useEffect(() => {
    setStaffPage((current) => Math.min(current, staffPageCount - 1));
  }, [staffPageCount]);

  const weekDates = getWeekDates(selectedDate);
  const completedCount = scopedAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
  const pendingCount = scopedAppointments.filter((appointment) => appointment.status === 'PENDING').length;
  const servingCount = scopedAppointments.filter((appointment) => ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status)).length;
  const confirmedCount = scopedAppointments.filter((appointment) => appointment.status === 'CONFIRMED').length;
  const cancelledCount = scopedAppointments.filter((appointment) => ['CANCELLED', 'NO_SHOW'].includes(appointment.status)).length;
  const reminderPendingCount = scopedAppointments.filter((appointment) => ['PENDING', 'CONFIRMED'].includes(appointment.status) && !appointment.reminderSent).length;
  const bookedMinutes = scopedAppointments.filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status)).reduce((sum, appointment) => sum + appointment.duration, 0);
  const availableStaffCount = staffRoster.filter((staff) => branchFilter === 'ALL' || staff.branch === branchFilter).length;
  const utilizationRate = availableStaffCount ? Math.min(100, Math.round(bookedMinutes / (availableStaffCount * 720) * 100)) : 0;
  const confirmationRate = scopedAppointments.length ? Math.round((scopedAppointments.length - pendingCount) / scopedAppointments.length * 100) : 0;
  const cancellationRate = scopedAppointments.length ? Math.round(cancelledCount / scopedAppointments.length * 100) : 0;
  const activeFilterCount = [operationalFilter !== 'ALL', statusFilter !== 'ALL', staffFilter !== 'ALL', sourceFilter !== 'ALL'].filter(Boolean).length;
  const scheduleHourHeight = isScheduleExpanded && scheduleViewportHeight
    ? Math.max(24, Math.floor((scheduleViewportHeight - scheduleStaffHeaderHeight - SCHEDULE_BOTTOM_GUTTER) / 12))
    : SCHEDULE_HOUR_HEIGHT;

  /** Bề ngang cột giờ bên trái. */
  const scheduleTimeColumnWidth = isScheduleExpanded ? 64 : 72;

  /**
   * Bề ngang một cột nhân viên, tính theo chỗ thật sự còn lại trong khung.
   *
   * Trước đây cột bị ghim cứng ở 220px và khung còn bị ép `min-width` tối thiểu
   * 980px, nên đủ 6 nhân viên là lưới rộng 72 + 6×230 = 1452px trong khi khung
   * chỉ khoảng 1150px — luôn luôn phải cuộn ngang dù màn hình rộng bao nhiêu.
   *
   * Nay bề ngang cột co giãn giữa hai mốc: nới tới 220px khi còn dư chỗ, thu về
   * tối đa 160px để nhét vừa khung. Chỉ khi 160px vẫn không đủ (màn hình hẹp)
   * thì lưới mới cuộn ngang.
   */
  const scheduleColumnWidth = useMemo(() => {
    if (!visibleScheduleStaff.length) return SCHEDULE_PREFERRED_COLUMN_WIDTH;
    if (!scheduleViewportWidth) return SCHEDULE_PREFERRED_COLUMN_WIDTH;
    // Trừ 1px để phép làm tròn không đẩy lưới rộng hơn khung đúng một pixel.
    const available = scheduleViewportWidth - scheduleTimeColumnWidth - 1;
    const fairShare = Math.floor(available / visibleScheduleStaff.length);
    return Math.min(
      SCHEDULE_PREFERRED_COLUMN_WIDTH,
      Math.max(SCHEDULE_MIN_COLUMN_WIDTH, fairShare)
    );
  }, [scheduleTimeColumnWidth, scheduleViewportWidth, visibleScheduleStaff.length]);

  /**
   * Chip lọc nhanh theo trạng thái, chỉ giữ trạng thái thật sự có lịch.
   *
   * Trước đây luôn in đủ 8 chip nên một ngày vắng khách hiện 6 chip mang số 0 —
   * tốn nguyên một hàng để nói rằng không có gì. Chip đang được chọn luôn được
   * giữ lại kể cả khi về 0, nếu không nó biến mất ngay lúc bấm và người dùng
   * không còn chỗ nào để bỏ lọc.
   */
  const statusFilterChips = useMemo(() => (
    (['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'REFUNDED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const)
      .map((status) => ({
        status,
        count: status === 'ALL'
          ? scopedAppointments.length
          : scopedAppointments.filter((appointment) => appointment.status === status).length
      }))
      .filter(({ status, count }) => status === 'ALL' || count > 0 || statusFilter === status)
  ), [scopedAppointments, statusFilter]);

  const scheduleGridTemplate = isScheduleExpanded
    ? `64px repeat(${visibleScheduleStaff.length}, minmax(0, 1fr))`
    : `${scheduleTimeColumnWidth}px repeat(${visibleScheduleStaff.length}, minmax(${scheduleColumnWidth}px, 1fr))`;

  /**
   * Cột hẹp thì đầu cột phải bớt thành phần, nếu không tên nhân viên chỉ còn vài
   * ký tự: avatar nhỏ lại, bỏ dòng ca làm và gộp tỉ lệ kín lịch vào dòng vai trò
   * thay vì để nó chiếm một badge riêng bên phải.
   */
  const isCompactStaffHeader = isScheduleExpanded || scheduleColumnWidth < 180;
  const selectedServiceDetails = form.services
    .map((name) => serviceCatalog.find((service) => service.name === name))
    .filter((service): service is (typeof serviceCatalog)[number] => Boolean(service));
  const selectedServiceDuration = selectedServiceDetails.reduce((sum, service) => sum + service.duration, 0);
  const selectedServicePrice = selectedServiceDetails.reduce((sum, service) => sum + service.price, 0);
  const selectedServiceEnd = isValid24HourTime(form.start) && selectedServiceDuration ? getEndTime(form.start, selectedServiceDuration) : '--:--';
  const canEditSelectedAppointment = Boolean(selectedAppointment) && canManage && (
    !isReceptionist || ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(selectedAppointment!.status)
  );

  /**
   * Một lần sửa lịch hẹn, tách làm hai đường theo chỗ dữ liệu thật sự sống.
   *
   * Mọi lời gọi ở màn này chỉ bao giờ vá `status` cộng với vài trường của
   * `TenantAppointmentExtras` — đổi trạng thái, khai lý do hủy, ghi nhận hoàn
   * tiền, đánh dấu đã nhắc lịch. Nên phép tách chỉ cần đúng một nhát: `status`
   * đi lên máy chủ, phần còn lại nằm lại máy này.
   *
   * `REFUNDED` là ngoại lệ và phải chặn trước: máy chủ không có trạng thái ấy
   * (hoàn tiền là chuyện của hóa đơn), nên gửi lên sẽ bị từ chối. Nó được dựng
   * lại bằng cờ `refunded` trong extras, và bộ chuyển đổi đè nó lên trạng thái
   * thật lúc đọc.
   */
  const updateAppointment = (id: string, patch: Partial<TenantAppointment>) => {
    if (!requireManageAccess()) return;

    if (!live) {
      setMockAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, ...patch } : appointment));
      setSelectedAppointment((current) => current?.id === id ? { ...current, ...patch } : current);
      return;
    }

    const { status, ...extrasPatch } = patch;
    const extras: TenantAppointmentExtras = {
      ...(extrasPatch as TenantAppointmentExtras),
      ...(status === 'REFUNDED' ? { refunded: true } : {})
    };

    if (Object.keys(extras).length) patchAppointmentExtras(id, extras);

    if (status && status !== 'REFUNDED') {
      void board.changeStatus(id, status as AppointmentApiStatus).then((result) => {
        if (result.status === 'error') onNotify?.(result.error.message);
      });

      // Cố ý KHÔNG vá trạng thái vào ngăn chi tiết ngay tại đây. Vá lạc quan rồi
      // để hiệu ứng đồng bộ kéo bản cũ về trước khi lượt nạp lại kịp tới thì
      // người dùng thấy trạng thái nhảy ba lần — mới, cũ, rồi mới lại. Máy chủ
      // trả lời trong khoảng trăm mili-giây và lượt nạp lại sẽ tự đẩy bản đúng
      // vào; một lần đổi vẫn nhanh hơn ba lần nhấp nháy.
      return;
    }

    setSelectedAppointment((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const advanceAppointmentStatus = (appointment: TenantAppointment) => {
    if (!requireManageAccess()) return;
    const targetStatus = nextStatus[appointment.status];
    if (!targetStatus) return;
    if (isReceptionist && appointment.status === 'IN_SERVICE') {
      onNotify?.('Vui lòng hoàn tất thanh toán tại Bàn lễ tân trước khi kết thúc dịch vụ.');
      return;
    }
    if (targetStatus === 'IN_SERVICE' && (!appointment.staff || !appointment.station)) {
      onNotify?.('Vui lòng phân công kỹ thuật viên và ghế/phòng trước khi bắt đầu dịch vụ.');
      return;
    }
    const patch: Partial<TenantAppointment> = {
      status: targetStatus,
      reminderSent: appointment.reminderSent || targetStatus !== 'PENDING'
    };
    updateAppointment(appointment.id, patch);
    onNotify?.(`${appointment.customer}: ${nextStatusLabel[appointment.status]}.`);
  };

  const openCreateForm = () => {
    if (!requireManageAccess()) return;
    setIsCustomerUnlinked(false);
    setForm(makeEmptyForm(selectedDate, selectedBranch));
    setFormError('');
    setFieldErrors({});
    setFormMode('CREATE');
  };

  const openEditForm = (appointment: TenantAppointment) => {
    if (!requireManageAccess()) return;
    if (isReceptionist && !['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(appointment.status)) {
      onNotify?.('Receptionist chỉ được sửa lịch trước khi dịch vụ bắt đầu.');
      return;
    }
    setIsCustomerUnlinked(false);
    setForm({
      customerId: appointment.customerId || '',
      customer: appointment.customer,
      phone: appointment.phone,
      date: appointment.date,
      start: appointment.start,
      services: appointment.services?.length ? appointment.services : [appointment.service],
      staff: appointment.staff,
      branch: appointment.branch,
      source: appointment.source,
      status: appointment.status,
      deposit: String(appointment.deposit),
      station: appointment.station || stationsFor(appointment.branch)[0] || "",
      note: appointment.note
    });
    setFormError('');
    setFieldErrors({});
    setFormMode('EDIT');
  };

  const openCancelForm = () => {
    if (!selectedAppointment || !requireManageAccess()) return;
    setCancellationReason(selectedAppointment.cancellationReason || '');
    setCancellationNote(selectedAppointment.cancellationNote || '');
    setCancellationError('');
    setShowCancelForm(true);
  };

  const submitCancellation = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAppointment || !requireManageAccess()) return;
    if (!cancellationReason) {
      setCancellationError('Vui lòng chọn lý do hủy lịch.');
      return;
    }
    if (cancellationReason === 'Khác' && !cancellationNote.trim()) {
      setCancellationError('Vui lòng nhập ghi chú khi chọn lý do “Khác”.');
      return;
    }

    const isAlreadyCancelled = selectedAppointment.status === 'CANCELLED';
    const cancelledAt = selectedAppointment.cancelledAt || new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const updatedAppointment: TenantAppointment = {
      ...selectedAppointment,
      status: 'CANCELLED',
      cancellationReason,
      cancellationNote: cancellationNote.trim(),
      cancelledAt,
      cancelledBy: selectedAppointment.cancelledBy || roleLabel
    };
    updateAppointment(selectedAppointment.id, {
      status: 'CANCELLED',
      cancellationReason,
      cancellationNote: cancellationNote.trim(),
      cancelledAt,
      cancelledBy: selectedAppointment.cancelledBy || roleLabel
    });
    setSelectedAppointment(updatedAppointment);
    setShowCancelForm(false);
    onNotify?.(isAlreadyCancelled
      ? `Đã cập nhật lý do hủy cho lịch ${selectedAppointment.id}.`
      : `Đã hủy lịch ${selectedAppointment.id} và lưu lý do vào lịch sử.`
    );
  };

  const openRefundForm = () => {
    if (!selectedAppointment || !requireManageAccess()) return;
    setRefundReason(selectedAppointment.refundReason || refundReasons[0]);
    setRefundAmount(
      selectedAppointment.refundAmount !== undefined
        ? String(selectedAppointment.refundAmount)
        : String(selectedAppointment.price)
    );
    setRefundMethod(selectedAppointment.refundMethod || 'CASH');
    setRefundNote(selectedAppointment.refundNote || '');
    setRefundError('');
    setShowRefundForm(true);
  };

  const submitRefund = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAppointment || !requireManageAccess()) return;
    const parsedAmount = Number(refundAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setRefundError('Vui lòng nhập số tiền hoàn hợp lệ (lớn hơn 0đ).');
      return;
    }
    if (parsedAmount > selectedAppointment.price) {
      setRefundError(`Số tiền hoàn không được vượt quá tổng tiền dịch vụ (${formatCurrency(selectedAppointment.price)}).`);
      return;
    }
    if (!refundReason) {
      setRefundError('Vui lòng chọn lý do hoàn tiền / sự cố.');
      return;
    }
    if (refundReason === 'Khác' && !refundNote.trim()) {
      setRefundError('Vui lòng nhập ghi chú khi chọn lý do “Khác”.');
      return;
    }

    const isAlreadyRefunded = selectedAppointment.status === 'REFUNDED';
    const refundedAt = selectedAppointment.refundedAt || new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const updatedAppointment: TenantAppointment = {
      ...selectedAppointment,
      status: 'REFUNDED',
      refundAmount: parsedAmount,
      refundReason,
      refundMethod,
      refundNote: refundNote.trim(),
      refundedAt,
      refundedBy: selectedAppointment.refundedBy || roleLabel
    };
    updateAppointment(selectedAppointment.id, {
      status: 'REFUNDED',
      refundAmount: parsedAmount,
      refundReason,
      refundMethod,
      refundNote: refundNote.trim(),
      refundedAt,
      refundedBy: selectedAppointment.refundedBy || roleLabel
    });
    setSelectedAppointment(updatedAppointment);
    setShowRefundForm(false);
    onNotify?.(isAlreadyRefunded
      ? `Đã cập nhật thông tin hoàn tiền cho lịch ${selectedAppointment.id}.`
      : `Đã hoàn tiền ${formatCurrency(parsedAmount)} cho lịch ${selectedAppointment.id} (Sự cố trong khi phục vụ).`
    );
  };

  const submitAppointment = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManageAccess()) return;
    const errors: Record<string, string> = {};

    // 1. Customer
    if (!form.customer.trim()) {
      errors.customer = 'Vui lòng nhập tên khách hàng.';
    } else if (form.customer.trim().length < 2) {
      errors.customer = 'Tên khách hàng phải có tối thiểu 2 ký tự.';
    }

    // 2. Phone
    const cleanPhone = form.phone.replace(/[\s.-]/g, '');
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại khách hàng.';
    } else if (!/^(?:0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone) && !/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(form.phone.trim())) {
      errors.phone = 'Số điện thoại chưa đúng định dạng di động Việt Nam (gồm 10 số, ví dụ 0903123456).';
    }

    // 3. Services
    if (!form.services.length) {
      errors.services = 'Vui lòng chọn ít nhất một dịch vụ trong danh sách.';
    }

    const chosenServices = form.services
      .map((name) => serviceCatalog.find((service) => service.name === name))
      .filter((service): service is (typeof serviceCatalog)[number] => Boolean(service));
    if (form.services.length > 0 && (!chosenServices.length || chosenServices.length !== form.services.length)) {
      errors.services = 'Danh sách dịch vụ có mục không còn trong bảng giá. Vui lòng chọn lại dịch vụ.';
    }
    const totalDuration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
    const totalPrice = chosenServices.reduce((sum, service) => sum + service.price, 0);
    const existingId = formMode === 'EDIT' ? selectedAppointment?.id : undefined;

    // 4. Date
    if (!form.date) {
      errors.date = 'Vui lòng chọn ngày thực hiện lịch hẹn.';
    }

    // 5. Start time
    if (!form.start) {
      errors.start = 'Vui lòng nhập giờ bắt đầu.';
    } else if (!isValid24HourTime(form.start)) {
      errors.start = 'Giờ bắt đầu phải theo định dạng 24 giờ HH:mm (ví dụ 08:30 hoặc 14:30).';
    } else {
      const startMinute = minutesFromStart(form.start);
      const endMinute = startMinute + totalDuration;

      // KIỂM TRA NGHIÊM NGẶT GIỜ MỞ CỬA CỦA SALON (08:00 – 20:30)
      if (startMinute < SALON_OPEN_MINUTES) {
        errors.start = `Salon chỉ mở cửa từ 08:00 sáng. Giờ bắt đầu ${form.start} nằm ngoài giờ hoạt động.`;
      } else if (startMinute > SALON_LAST_BOOKING_MINUTES) {
        errors.start = `Salon ngưng tiếp nhận khách sau 20:00 (đóng cửa lúc 20:30). Khung giờ ${form.start} quá trễ.`;
      } else if (endMinute > SALON_CLOSE_MINUTES) {
        errors.start = `Dịch vụ kéo dài ${totalDuration} phút sẽ kết thúc lúc ${getEndTime(form.start, totalDuration)} (sau giờ đóng cửa 20:30).`;
      }
    }

    // 6. Staff
    const assignedStaff = staffRoster.find((staff) => staff.name === form.staff && staff.branch === form.branch);
    if (!form.staff) {
      errors.staff = 'Vui lòng phân công kỹ thuật viên phụ trách.';
    } else if (!assignedStaff) {
      errors.staff = 'Kỹ thuật viên không thuộc chi nhánh đã chọn.';
    } else if (assignedStaff.shift && assignedStaff.shift.includes('–') && isValid24HourTime(form.start)) {
      const [shiftStartStr, shiftEndStr] = assignedStaff.shift.split('–').map((s) => s.trim());
      const shiftStartMin = minutesFromStart(shiftStartStr);
      const shiftEndMin = minutesFromStart(shiftEndStr);
      const startMinute = minutesFromStart(form.start);
      const endMinute = startMinute + totalDuration;
      if (startMinute < shiftStartMin) {
        errors.staff = `Kỹ thuật viên ${assignedStaff.name} bắt đầu ca lúc ${shiftStartStr}. Không thể nhận lịch lúc ${form.start}.`;
      } else if (endMinute > shiftEndMin) {
        errors.staff = `Kỹ thuật viên ${assignedStaff.name} kết thúc ca lúc ${shiftEndStr}. Lịch kéo dài đến ${getEndTime(form.start, totalDuration)}.`;
      }
    }

    // 7. Station — chỉ bắt buộc khi chi nhánh thật sự có ghế để chọn.
    //
    // Sơ đồ ghế nằm ở mức C của §9.3: không bảng, không endpoint, và danh sách
    // ghế chỉ tồn tại trong bộ mẫu. Bắt buộc ở chế độ dữ liệu thật thì ô này
    // không bao giờ điền được, và **không ai đặt được lịch nào** — máy chủ thì
    // vốn nhận `station` như một trường tuỳ chọn.
    if (stationsFor(form.branch).length === 0) {
      // Không có ghế nào để chọn: bỏ qua cả hai phép kiểm.
    } else if (!form.station) {
      errors.station = 'Vui lòng chọn ghế hoặc phòng phục vụ.';
    } else if (!stationsFor(form.branch).includes(form.station)) {
      errors.station = 'Ghế hoặc phòng không thuộc chi nhánh đã chọn.';
    }

    // 8. Duplicate Phone in branch & date
    if (!errors.phone && form.phone && form.date) {
      const duplicateCustomerAppointment = appointments.find((appointment) => (
        appointment.id !== existingId
        && appointment.date === form.date
        && appointment.branch === form.branch
        && appointment.phone.replace(/\D/g, '') === phoneDigits
        && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(appointment.status)
      ));
      if (duplicateCustomerAppointment) {
        errors.phone = `Số điện thoại này đã có lịch ${duplicateCustomerAppointment.id} lúc ${duplicateCustomerAppointment.start}.`;
      }
    }

    // 9. Conflict
    if (!errors.start && !errors.staff && isValid24HourTime(form.start) && form.date) {
      const startMinute = minutesFromStart(form.start);
      const endMinute = startMinute + totalDuration;
      const conflictingAppointment = appointments.find((appointment) => {
        if (appointment.id === existingId || appointment.date !== form.date || appointment.branch !== form.branch || ['CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
        const existingStart = minutesFromStart(appointment.start);
        const overlaps = startMinute < existingStart + appointment.duration && endMinute > existingStart;
        return overlaps && (appointment.staff === form.staff || Boolean(form.station && appointment.station === form.station));
      });
      if (conflictingAppointment) {
        if (conflictingAppointment.staff === form.staff) {
          errors.staff = `Kỹ thuật viên ${conflictingAppointment.staff} đang bận lịch ${conflictingAppointment.id} (${conflictingAppointment.start}–${getEndTime(conflictingAppointment.start, conflictingAppointment.duration)}).`;
        } else {
          errors.station = `Vị trí ${form.station} đang dùng cho lịch ${conflictingAppointment.id} (${conflictingAppointment.start}–${getEndTime(conflictingAppointment.start, conflictingAppointment.duration)}).`;
        }
      }
    }

    // 10. Deposit
    const depositValue = Number(form.deposit);
    if (!Number.isFinite(depositValue) || depositValue < 0) {
      errors.deposit = 'Tiền đặt cọc không hợp lệ.';
    } else if (depositValue > totalPrice) {
      errors.deposit = 'Tiền đặt cọc không được lớn hơn tổng giá dịch vụ dự kiến.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(Object.values(errors)[0] || 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ bên dưới.');
      return;
    }

    setFieldErrors({});
    setFormError('');

    const nextId = existingId || `APT-${Date.now().toString(36).toUpperCase()}`;
    const payload: TenantAppointment = {
      id: nextId,
      customerId: form.customerId || undefined,
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      date: form.date,
      start: form.start,
      duration: totalDuration,
      service: chosenServices.map((service) => service.name).join(' + '),
      services: chosenServices.map((service) => service.name),
      staff: form.staff,
      branch: form.branch,
      source: form.source,
      status: form.status,
      price: totalPrice,
      deposit: depositValue,
      station: form.station,
      reminderSent: form.status !== 'PENDING',
      createdBy: formMode === 'EDIT' && selectedAppointment ? selectedAppointment.createdBy : roleLabel,
      note: form.note.trim(),
      createdAt: formMode === 'EDIT' && selectedAppointment
        ? selectedAppointment.createdAt
        : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    if (!live) {
      if (formMode === 'EDIT') {
        setMockAppointments((current) => current.map((appointment) => appointment.id === payload.id ? payload : appointment));
      } else {
        setMockAppointments((current) => [...current, payload]);
        setSelectedDate(payload.date);
      }
      setSelectedAppointment(payload);
      setFormMode(null);
      return;
    }

    void saveToServer(payload, existingId, chosenServices);
  };

  /**
   * Đưa một lần lưu biểu mẫu lên máy chủ.
   *
   * Ba phép dịch phải làm trước khi gửi, vì biểu mẫu giữ **tên** còn API nhận **mã**:
   * tên khách thành mã hồ sơ, tên kỹ thuật viên thành mã nhân viên, tên dịch vụ
   * thành mã dịch vụ. Tên trùng nhau thì phép dịch lấy người đầu tiên khớp —
   * chấp nhận được ở quy mô một tiệm, và là cái giá để không phải viết lại biểu mẫu.
   *
   * `warnings` hiện lên như một lời nhắc chứ không phải lỗi: BR-APT-005 và
   * BR-APT-013 cho phép đặt ngoài ca hoặc đặt lùi giờ, chỉ nói cho người đặt biết.
   */
  const saveToServer = async (
    payload: TenantAppointment,
    existingId: string | undefined,
    chosenServices: Array<{ id: string; name: string }>
  ) => {
    const customerId = await ensureCustomerId(payload.phone, payload.customer);
    if (!customerId) return;

    const staffId = staffRoster.find((staff) => staff.name === payload.staff)?.id;
    if (!staffId) {
      setFieldErrors({ staff: 'Không tìm thấy kỹ thuật viên này trong hồ sơ nhân sự.' });
      setFormError('Không tìm thấy kỹ thuật viên này trong hồ sơ nhân sự.');
      return;
    }

    const input: SaveAppointmentInput = {
      customerId,
      staffId,
      startAt: `${payload.date}T${payload.start}:00+07:00`,
      serviceIds: chosenServices.map((service) => service.id),
      source: payload.source,
      station: payload.station || undefined,
      note: payload.note || undefined,
      deposit: payload.deposit,
      // `status` chỉ có nghĩa lúc tạo mới — BR-APT-021 cho đúng hai giá trị đầu.
      ...(existingId || (payload.status !== 'PENDING' && payload.status !== 'CONFIRMED')
        ? {}
        : { status: payload.status })
    };

    const saved = existingId
      ? await board.updateAppointment(existingId, input)
      : await board.createAppointment(input);

    if (saved.status === 'error') {
      setFormError(saved.error.message);
      setFieldErrors(Object.fromEntries(
        (saved.error.fields || []).map((field) => [field.field, field.message])
      ));
      return;
    }

    reportWarnings(saved.data.warnings);

    patchAppointmentExtras(saved.data.appointment.id, {
      reminderSent: payload.reminderSent,
      createdBy: payload.createdBy
    });

    if (!existingId) setSelectedDate(payload.date);

    setSelectedAppointment(toTenantAppointment(
      saved.data.appointment,
      payload.price,
      { ...appointmentExtras[saved.data.appointment.id], reminderSent: payload.reminderSent, createdBy: payload.createdBy }
    ));
    setFormMode(null);
  };

  /**
   * Hồ sơ khách theo số điện thoại, tạo mới nếu chưa có — BR-CUS-004.
   *
   * Mọi lịch hẹn bắt buộc gắn một hồ sơ khách: BR-CUS-007 đọc ngược hạng khách và
   * tổng chi tiêu từ hóa đơn, nên một lượt khách không có hồ sơ là một lượt biến
   * mất khỏi mọi con số về sau. BR-CUS-002 làm số điện thoại thành khóa tra cứu.
   */
  const ensureCustomerId = async (phone: string, fullName: string): Promise<string | null> => {
    // Chuẩn hóa theo đúng luật máy chủ — xem `utils/phone.ts`. Bản viết tay trước đây ở đây bỏ
    // sót dấu ngoặc, nên một số nhập dạng `(028) 123...` vẫn tra trượt rồi tạo trùng.
    const wanted = normalizePhone(phone);
    const existing = customerDirectoryLive.customers.find(
      (customer) => normalizePhone(customer.phone) === wanted
    );

    if (existing) return existing.id;

    const created = await customerDirectoryLive.createCustomer({
      phone: phone.trim(),
      fullName: fullName.trim()
    });

    if (created.status === 'error') {
      setFormError(created.error.message);
      setFieldErrors(Object.fromEntries(
        (created.error.fields || []).map((field) => [field.field, field.message])
      ));
      return null;
    }

    return created.data.id;
  };

  const reportWarnings = (warnings: AppointmentWarning[]) => {
    if (warnings.length) onNotify?.(warnings.map((warning) => warning.message).join(' · '));
  };

  const resetFilters = () => {
    setOperationalFilter('ALL');
    setStatusFilter('ALL');
    setStaffFilter('ALL');
    setStaffSearchQuery('');
    setSourceFilter('ALL');
    onSearchQueryChange('');
  };

  /** Cột của chế độ xem danh sách. Cột phụ được ẩn dần ở màn hình hẹp (§17.2). */
  const appointmentColumns: DataTableColumn<TenantAppointment>[] = [
    {
      key: 'time',
      header: 'Thời gian',
      width: '15%',
      cell: (appointment) => (
        <div className="min-w-0">
          <p className="font-semibold tabular-nums text-brand-text">
            {appointment.start}–{getEndTime(appointment.start, appointment.duration)}
          </p>
          <p className="mt-0.5 text-caption text-brand-text-muted">
            <span className="font-mono tracking-tight">{appointment.id}</span>
            <span aria-hidden="true"> · </span>
            {appointment.duration} phút
          </p>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      cell: (appointment) => (
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold text-brand-text">
            {appointment.customer}
            {appointment.firstVisit && (
              <span className="rounded-pill bg-[var(--accent-soft)] px-2 text-caption font-semibold text-[color:var(--accent-strong)]">
                Khách mới
              </span>
            )}
          </p>
          <p className="mt-0.5 text-caption tabular-nums text-brand-text-muted">{appointment.phone}</p>
        </div>
      )
    },
    {
      key: 'service',
      header: 'Dịch vụ',
      cell: (appointment) => <span className="text-brand-text">{appointment.service}</span>
    },
    {
      key: 'staff',
      header: 'Nhân viên',
      hideBelow: 'lg',
      cell: (appointment) => (
        <div className="min-w-0">
          <p className="font-semibold text-brand-text">{appointment.staff}</p>
          <p className="mt-0.5 text-caption text-brand-text-muted">{branchNames[appointment.branch] || appointment.branch}</p>
        </div>
      )
    },
    {
      key: 'source',
      header: 'Nguồn',
      hideBelow: 'lg',
      cell: (appointment) => <span className="text-brand-text-muted">{sourceLabels[appointment.source]}</span>
    },
    {
      key: 'value',
      header: 'Giá trị',
      numeric: true,
      hideBelow: 'md',
      cell: (appointment) => (
        <div>
          <p className="font-semibold text-brand-text">{formatCurrency(appointment.price)}</p>
          <p className="mt-0.5 text-caption text-brand-text-muted">Cọc {formatCurrency(appointment.deposit)}</p>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (appointment) => (
        <StatusBadge status={appointment.status} label={appointmentStatusText[appointment.status].label} size="small" />
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      headerSrOnly: true,
      actions: true,
      // Dòng bảng bấm được bằng chuột, nhưng bàn phím cần nút thật (§19.1).
      cell: (appointment) => (
        <div className="flex justify-end gap-2">
          <Button
            size="small"
            variant="ghost"
            aria-label={`Xem chi tiết lịch của ${appointment.customer}`}
            onClick={(event) => { event.stopPropagation(); setSelectedAppointment(appointment); }}
          >
            Chi tiết
          </Button>
          {appointment.status === 'CANCELLED' && (
            <Button
              size="small"
              variant="secondary"
              disabled={!canManage}
              iconLeading={<Pencil className="h-3.5 w-3.5" />}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAppointment(appointment);
                setCancellationReason(appointment.cancellationReason || '');
                setCancellationNote(appointment.cancellationNote || '');
                setCancellationError('');
                setShowCancelForm(true);
              }}
            >
              {appointment.cancellationReason ? 'Sửa lý do' : 'Ghi lý do'}
            </Button>
          )}
          {appointment.status === 'REFUNDED' && (
            <Button
              size="small"
              variant="secondary"
              disabled={!canManage}
              iconLeading={<Pencil className="h-3.5 w-3.5" />}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAppointment(appointment);
                setRefundReason(appointment.refundReason || refundReasons[0]);
                setRefundAmount(
                  appointment.refundAmount !== undefined
                    ? String(appointment.refundAmount)
                    : String(appointment.price)
                );
                setRefundMethod(appointment.refundMethod || 'CASH');
                setRefundNote(appointment.refundNote || '');
                setRefundError('');
                setShowRefundForm(true);
              }}
            >
              {appointment.refundReason ? 'Sửa hoàn tiền' : 'Ghi hoàn tiền'}
            </Button>
          )}
          {appointment.status === 'IN_SERVICE' && (
            <Button
              size="small"
              variant="ghost"
              disabled={!canManage}
              iconLeading={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAppointment(appointment);
                setRefundReason(appointment.refundReason || refundReasons[0]);
                setRefundAmount(
                  appointment.refundAmount !== undefined
                    ? String(appointment.refundAmount)
                    : String(appointment.price)
                );
                setRefundMethod(appointment.refundMethod || 'CASH');
                setRefundNote(appointment.refundNote || '');
                setRefundError('');
                setShowRefundForm(true);
              }}
            >
              Hoàn tiền
            </Button>
          )}
          {nextStatus[appointment.status] && !(isReceptionist && appointment.status === 'IN_SERVICE') && (
            <Button
              size="small"
              variant="primary"
              disabled={!canManage}
              iconLeading={<Check />}
              onClick={(event) => { event.stopPropagation(); advanceAppointmentStatus(appointment); }}
            >
              {nextStatusLabel[appointment.status]}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className={`flex flex-col gap-4 ${isReceptionist ? 'appointments-receptionist' : ''}`}>
      <PageHeader
        title={isReceptionist ? 'Lịch hẹn tại quầy' : 'Lịch hẹn'}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateForm}
              disabled={!canManage}
              className="flex h-10 items-center gap-2 border border-pink-600 bg-pink-600 hover:bg-pink-700 px-4 text-caption font-black text-white shadow-none disabled:border-slate-300 disabled:bg-slate-300 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tạo lịch hẹn mới
            </button>
          </div>
        )}
      />
      {/*
        Dải nhãn "Dữ liệu mẫu" của màn này từng nằm ngay đây — kéo sớm về từ ngày 10, vì kể
        từ khi màn khách hàng nối máy chủ thì hai màn hiện hai danh sách khách khác nhau.
        Ngày 18 dời nó lên `NailTenantAdminPortal`, nơi mọi màn chưa nối cùng lấy nhãn từ một
        bảng: giữ cả hai là hiện hai dải nhãn chồng nhau trên cùng một trang. Câu chữ vẫn
        nguyên ý, xem `MOCK_DATA_REASONS.appointments`.
      */}
      <section className={`isolate border border-brand-outline bg-brand-surface ${isScheduleExpanded ? 'ui-fullscreen-layer fixed inset-0 flex flex-col rounded-none' : 'overflow-hidden rounded-card shadow-card'}`}>
        {/* Thanh điều khiển hai hàng, chia theo nhóm việc: hàng trên là "đang xem
            ngày nào", hàng dưới là "làm gì với ngày đó". Trước đây tất cả dồn vào
            một hàng nên ở bề ngang 1208px nó tự vỡ thành ba hàng lộn xộn. */}
        <div className="flex flex-col gap-2 border-b border-brand-outline px-3 py-2.5">
          {/* Hàng 1 — điều hướng ngày và tìm kiếm lịch hẹn */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-control border border-brand-outline bg-brand-surface-lowest p-1">
              <Button size="small" variant="ghost" iconOnly aria-label="Ngày trước" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft /></Button>
              <Button size="small" variant="ghost" onClick={() => setSelectedDate(initialDate)}>Hôm nay</Button>
              <Button size="small" variant="ghost" iconOnly aria-label="Ngày sau" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight /></Button>
            </div>
            <span className="text-body font-semibold capitalize text-brand-text">{formatSelectedDate(selectedDate)}</span>
            {/* Ô chọn ngày trước đây là một <input type="date"> rộng 427px, lại hiện
                ngày theo locale trình duyệt ("07/16/2026") nên chỏi với dòng chữ
                tiếng Việt ngay cạnh. Nay input trong suốt phủ đúng một nút icon:
                bấm vẫn mở đúng bộ chọn ngày của hệ điều hành, còn ngày hiển thị
                chỉ do dòng chữ bên trái quyết định. */}
            <span className="relative inline-flex">
              <span aria-hidden="true" className="flex h-[var(--size-control-sm)] w-[var(--size-control-sm)] items-center justify-center rounded-control border border-brand-outline bg-brand-surface text-brand-text-muted">
                <CalendarDays className="h-4 w-4" />
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                aria-label="Chọn ngày xem lịch"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>

            <div className="relative min-w-0 flex-1 sm:min-w-72">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
              <input type="search" value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} aria-label="Tìm lịch hẹn" placeholder="Tìm mã lịch, khách, SĐT, dịch vụ..." className={`${controlClass} pl-9 pr-10`} />
              {searchQuery && (
                <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-brand-text-muted shadow-none">
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Hàng 2 — phạm vi dữ liệu và hành động trên ngày đang xem */}
          <div className="flex flex-wrap items-center gap-2">
            <BeautifulSelect value={branchFilter} onChange={(event) => onSelectedBranchChange(event.target.value)} disabled={branchLocked} aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'} className={`${controlClass} w-auto sm:w-44`}>
              <option value="Q3">Quận 3</option>
              <option value="Q1">Quận 1</option>
              {!branchLocked && <option value="ALL">Tất cả chi nhánh</option>}
            </BeautifulSelect>

            <Button
              size="small"
              variant={showFilters || activeFilterCount ? 'primary' : 'secondary'}
              onClick={() => setShowFilters((value) => !value)}
              iconLeading={<Filter />}
              aria-expanded={showFilters}
              aria-controls="appointment-filters"
            >
              Bộ lọc{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </Button>

            <div role="group" aria-label="Chế độ hiển thị" className="flex items-center gap-1 rounded-control border border-brand-outline bg-brand-surface-lowest p-1">
              <Button size="small" variant={viewMode === 'SCHEDULE' ? 'primary' : 'ghost'} aria-pressed={viewMode === 'SCHEDULE'} onClick={() => setViewMode('SCHEDULE')} iconLeading={<LayoutGrid />}>Lịch</Button>
              <Button size="small" variant={viewMode === 'LIST' ? 'primary' : 'ghost'} aria-pressed={viewMode === 'LIST'} onClick={() => setViewMode('LIST')} iconLeading={<LayoutList />}>Danh sách</Button>
            </div>

            {viewMode === 'SCHEDULE' && (
              <Button
                size="small"
                variant={isScheduleExpanded ? 'primary' : 'secondary'}
                aria-pressed={isScheduleExpanded}
                onClick={() => { setIsScheduleExpanded((value) => !value); setShowFilters(false); }}
                iconLeading={isScheduleExpanded ? <Minimize2 /> : <Maximize2 />}
              >
                {isScheduleExpanded ? 'Thu nhỏ' : 'Vừa màn hình'}
              </Button>
            )}

            <Button
              size="small"
              variant="primary"
              className="ml-auto"
              onClick={openCreateForm}
              disabled={!canManage}
              title={!canManage ? readOnlyReason || 'Bạn chỉ có quyền xem' : undefined}
              iconLeading={<Plus />}
            >
              Tạo lịch
            </Button>
          </div>
        </div>

        {/* Dải tuần — mật độ lịch thể hiện bằng thanh thay vì chữ "12 lịch".

            Chữ khiến mỗi ô phải cao 89px và vẫn phải đọc từng ô mới biết ngày nào
            đông. Thanh cho biết ngay bằng một cái liếc; con số chính xác vẫn còn ở
            thuộc tính title và ở chuỗi dành cho trình đọc màn hình. */}
        <div className={`${isScheduleExpanded ? 'hidden' : 'grid'} grid-cols-7 border-b border-brand-outline bg-brand-surface-lowest px-2 sm:px-3`}>
          {(() => {
            const weekCounts = weekDates.map((date) => appointments.filter((appointment) => (
              appointment.date === date && (branchFilter === 'ALL' || appointment.branch === branchFilter)
            )).length);
            const busiest = Math.max(1, ...weekCounts);

            return weekDates.map((date, index) => {
              const dayCount = weekCounts[index];
              const isSelected = date === selectedDate;
              const isToday = date === initialDate;
              // Ngày có lịch luôn hiện ít nhất một vạch mỏng, để "có ít" không bị
              // nhìn nhầm thành "không có".
              const densityPercent = dayCount ? Math.max(12, Math.round((dayCount / busiest) * 100)) : 0;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-current={isSelected ? 'date' : undefined}
                  title={`${toDate(date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })} · ${dayCount} lịch`}
                  className={`relative flex h-auto min-h-14 flex-col items-center justify-center gap-1 rounded-none border-0 bg-transparent px-1 py-1.5 shadow-none ${isSelected ? 'text-[color:var(--accent-strong)]' : 'text-brand-text-muted'}`}
                >
                  <span className="text-caption font-bold uppercase">{toDate(date).toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-pill text-body font-bold tabular-nums ${isSelected ? 'bg-[var(--accent)] text-[color:var(--color-brand-on-primary)]' : 'bg-transparent text-brand-text'}`}>
                    {toDate(date).getDate()}
                  </span>
                  <span aria-hidden="true" className="flex h-1 w-8 overflow-hidden rounded-pill bg-brand-surface-high">
                    {densityPercent > 0 && (
                      <span
                        className={`h-full rounded-pill ${isSelected ? 'bg-[var(--accent)]' : 'bg-[color-mix(in_srgb,var(--accent)_55%,transparent)]'}`}
                        style={{ width: `${densityPercent}%` }}
                      />
                    )}
                  </span>
                  <span className="sr-only">{dayCount} lịch</span>
                  {isToday && (
                    <>
                      <span aria-hidden="true" className="absolute bottom-0.5 h-1 w-1 rounded-pill bg-[var(--accent)]" />
                      <span className="sr-only">Hôm nay</span>
                    </>
                  )}
                </button>
              );
            });
          })()}
        </div>

        {showFilters && (
          <div id="appointment-filters" className="grid grid-cols-1 gap-4 border-b border-brand-outline bg-brand-surface-lowest p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Field label="Trạng thái">
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) => { setOperationalFilter('ALL'); setStatusFilter(event.target.value as 'ALL' | AppointmentStatus); }}
                className="w-full"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {(Object.keys(appointmentStatusText) as AppointmentStatus[]).map((value) => (
                  <option key={value} value={value}>{appointmentStatusText[value].label}</option>
                ))}
              </BeautifulSelect>
            </Field>

            <Field label="Nhân viên">
              <BeautifulSelect value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} className="w-full">
                <option value="ALL">Tất cả nhân viên</option>
                {scheduleStaff.map((staff) => <option key={staff.name} value={staff.name}>{staff.name}</option>)}
              </BeautifulSelect>
            </Field>

            {/* Ô này trước đây đứng riêng một băng 59px phía trên lưới. Nó lọc xem
                CỘT nào hiện trên lưới, khác với ô "Nhân viên" ở trên (chọn đúng một
                người), nên vẫn giữ lại đầy đủ chứ không gộp làm một. */}
            <Field label="Tìm nhân viên trên lịch" helper="Lọc cột hiển thị theo tên, vai trò hoặc chi nhánh.">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                <input
                  type="search"
                  value={staffSearchQuery}
                  onChange={(event) => setStaffSearchQuery(event.target.value)}
                  placeholder="Tên, vai trò, chi nhánh..."
                  className={`${controlClass} w-full pl-9 pr-10`}
                />
                {staffSearchQuery && (
                  <button type="button" onClick={() => setStaffSearchQuery('')} aria-label="Xóa tìm kiếm nhân viên" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-brand-text-muted shadow-none">
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Field>

            <Field label="Nguồn đặt lịch">
              <BeautifulSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'ALL' | AppointmentSource)} className="w-full">
                <option value="ALL">Tất cả nguồn</option>
                {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </BeautifulSelect>
            </Field>

            <Button variant="secondary" onClick={resetFilters} className="self-end">Đặt lại</Button>
          </div>
        )}

        {/* Lọc nhanh theo trạng thái, kèm phạm vi nhân sự đang xem.

            Hai dòng chú giải "Màu = trạng thái" và "Chiều cao = thời lượng" đã
            chuyển xuống chân khung: đó là giải thích tĩnh, không nên đứng cùng hàng
            với những chip bấm được. Băng phân trang nhân sự riêng 59px cũng được
            gộp vào đây vì cả hai đều trả lời cùng một câu hỏi: đang xem những gì. */}
        <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-brand-outline px-3 ${isScheduleExpanded ? 'py-1.5' : 'py-2'}`}>
          {/* Hàng chip cuộn ngang thay vì xuống dòng: trên điện thoại nó vỡ ba hàng
              và đẩy lưới xuống gần 140px. Cuộn giữ băng luôn đúng một hàng ở mọi bề
              ngang, còn trên desktop thì đủ chỗ nên không xuất hiện thanh cuộn. */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusFilterChips.map(({ status, count }) => {
              const active = statusFilter === status && operationalFilter === 'ALL';
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setOperationalFilter('ALL'); setStatusFilter(status); }}
                  className={`flex h-7 min-h-0 shrink-0 items-center gap-1.5 rounded-pill border-0 px-2 text-caption font-semibold shadow-none ${active ? 'bg-[var(--accent-soft)] text-[color:var(--accent-strong)]' : 'bg-transparent text-brand-text-muted'}`}
                >
                  {status !== 'ALL' && <StatusGlyph status={status} className="h-3.5 w-3.5 shrink-0" />}
                  {status === 'ALL' ? 'Tất cả' : appointmentStatusText[status].label}
                  <span className="rounded-pill bg-brand-surface-high px-1.5 tabular-nums text-brand-text">{count}</span>
                </button>
              );
            })}
          </div>

          {viewMode === 'SCHEDULE' && filteredScheduleStaff.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span role="status" className="text-caption text-brand-text-muted">
                Đang xem <strong className="tabular-nums text-brand-text">{visibleStaffStart}–{visibleStaffEnd}</strong> / {filteredScheduleStaff.length} nhân viên
              </span>
              {staffPageCount > 1 && (
                <div className="flex items-center gap-1">
                  <Button size="small" variant="secondary" iconOnly aria-label="Nhóm nhân viên trước" disabled={staffPage === 0} onClick={() => setStaffPage((current) => Math.max(0, current - 1))}><ChevronLeft /></Button>
                  <Button size="small" variant="secondary" iconOnly aria-label="Nhóm nhân viên tiếp theo" disabled={staffPage >= staffPageCount - 1} onClick={() => setStaffPage((current) => Math.min(staffPageCount - 1, current + 1))}><ChevronRight /></Button>
                </div>
              )}
            </div>
          )}
        </div>

        {viewMode === 'SCHEDULE' ? (
          <>
            <div ref={attachScheduleViewport} className={`relative bg-brand-surface ${isScheduleExpanded ? 'min-h-0 flex-1 overflow-auto' : 'overflow-x-auto overflow-y-hidden'}`}>
            {visibleScheduleStaff.length ? <div className="h-full" style={{ minWidth: isScheduleExpanded ? '100%' : `${scheduleTimeColumnWidth + visibleScheduleStaff.length * scheduleColumnWidth}px` }}>
              <div ref={attachScheduleStaffHeader} className="sticky top-0 grid border-b border-brand-outline bg-brand-surface" style={{ zIndex: 'var(--z-sticky)', gridTemplateColumns: scheduleGridTemplate }}>
                <div className="flex items-center justify-center border-r border-brand-outline text-caption font-semibold text-brand-text-muted">GMT+7</div>
                {visibleScheduleStaff.map((staff) => {
                  const staffAppointments = scopedAppointments.filter((appointment) => appointment.staff === staff.name && !['CANCELLED', 'NO_SHOW'].includes(appointment.status));
                  const bookedMinutes = staffAppointments.reduce((sum, appointment) => sum + appointment.duration, 0);
                  const utilization = Math.min(100, Math.round(bookedMinutes / 600 * 100));
                  return (
                    <div
                      key={staff.name}
                      title={`${staff.name} · ${staff.role} · ${staff.shift} · đã đặt ${bookedMinutes}/600 phút`}
                      className={`flex items-center border-r border-brand-outline last:border-r-0 gap-2 py-2 ${isCompactStaffHeader ? 'min-h-14 px-2' : 'min-h-16 px-2.5'}`}
                    >
                      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-caption font-bold text-brand-text ${isCompactStaffHeader ? 'h-8 w-8' : 'h-9 w-9'}`}>
                        {staff.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="truncate text-body font-semibold text-brand-text">{staff.name}</span>
                          {branchFilter === 'ALL' && (
                            <span className="shrink-0 rounded-pill bg-brand-surface-high px-1.5 text-caption text-brand-text-muted">{branchShortNames[staff.branch] || staff.branch}</span>
                          )}
                        </span>
                        {/* Cột hẹp: tỉ lệ kín lịch đi kèm vai trò trên cùng một dòng,
                            nhường lại toàn bộ bề ngang của badge cho tên nhân viên. */}
                        <p className="truncate text-caption text-brand-text-muted">
                          {staff.role}
                          {isCompactStaffHeader && (
                            <>
                              {' · '}
                              <span className="font-bold tabular-nums text-[color:var(--accent-strong)]">{utilization}%</span>
                            </>
                          )}
                        </p>
                        {!isCompactStaffHeader && <p className="truncate text-caption text-brand-text-muted">{staff.shift}</p>}
                      </div>
                      {!isCompactStaffHeader && (
                        <span className="shrink-0 rounded-control bg-[var(--accent-soft)] px-1.5 py-1 text-caption font-bold tabular-nums text-[color:var(--accent-strong)]">
                          {utilization}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: scheduleGridTemplate, height: scheduleHourHeight * 12 + SCHEDULE_BOTTOM_GUTTER }}>
                <div className="relative border-r border-brand-outline bg-brand-surface-lowest">
                    {/* Ở chế độ toàn màn hình mỗi giờ có thể co xuống dưới 30px —
                        không đủ chỗ cho hai nhãn 13px liền nhau. Khi đó chỉ ghi
                        nhãn cách giờ; các đường kẻ vẫn giữ đủ mọi mốc giờ. */}
                    {Array.from({ length: 13 }, (_, index) => 8 + index)
                      .filter((hour) => scheduleHourHeight >= 32 || (hour - 8) % 2 === 0)
                      .map((hour) => (
                        <span
                          key={hour}
                          className={`absolute right-2 text-caption font-semibold tabular-nums text-brand-text-muted ${hour === 8 ? '' : '-translate-y-1/2'}`}
                          style={{ top: hour === 8 ? 8 : (hour - 8) * scheduleHourHeight }}
                        >
                          {String(hour).padStart(2, '0')}:00
                        </span>
                      ))}
                </div>
                {visibleScheduleStaff.map((staff) => (
                  <div key={staff.name} className="relative border-r border-brand-outline last:border-r-0" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${scheduleHourHeight - 1}px, var(--color-brand-outline) ${scheduleHourHeight}px)` }}>
                    {filteredAppointments.filter((appointment) => appointment.staff === staff.name).map((appointment) => {
                      const top = Math.max(0, (minutesFromStart(appointment.start) - 480) / 60 * scheduleHourHeight);
                      const height = Math.max(SCHEDULE_MIN_CARD_HEIGHT, appointment.duration / 60 * scheduleHourHeight - 4);
                      const statusText = appointmentStatusText[appointment.status];
                      // Ngưỡng tính theo chiều cao thật của thẻ: mỗi dòng chữ 13–14px
                      // chiếm ~20px, nên chỉ thêm dòng khi thẻ đủ chỗ cho trọn dòng đó.
                      const isCompact = height < 76;
                      const showService = height >= 96;
                      const showOperationalMeta = height >= 128;
                      const appointmentStart = minutesFromStart(appointment.start);
                      const hasConflict = scopedAppointments.some((other) => {
                        if (other.id === appointment.id || ['CANCELLED', 'NO_SHOW'].includes(other.status)) return false;
                        const otherStart = minutesFromStart(other.start);
                        const overlaps = appointmentStart < otherStart + other.duration && appointmentStart + appointment.duration > otherStart;
                        return overlaps && (other.staff === appointment.staff || Boolean(appointment.station && appointment.station === other.station));
                      });
                      const fullSummary = `${appointment.start}–${getEndTime(appointment.start, appointment.duration)} · ${appointment.customer} · ${appointment.service} · ${statusText.label}${appointment.station ? ` · ${appointment.station}` : ''}${hasConflict ? ' · Có xung đột nguồn lực' : ''}`;
                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => setSelectedAppointment(appointment)}
                          aria-label={`Xem lịch: ${fullSummary}`}
                          title={fullSummary}
                          className={`absolute left-1.5 right-1.5 z-10 h-auto overflow-hidden border-l-4 px-2 text-left shadow-card transition-transform hover:z-20 hover:-translate-y-0.5 focus-visible:z-20 ui-tone ui-tone--${statusTone(appointment.status)} ${isCompact ? 'py-1' : 'py-1.5'} ${['CANCELLED', 'NO_SHOW'].includes(appointment.status) ? 'opacity-70' : ''} ${selectedAppointment?.id === appointment.id ? 'z-20 ring-2 ring-[color:var(--accent-strong)] ring-offset-1' : ''}`}
                          style={{ top: top + 2, height }}
                        >
                          {isCompact ? (
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 text-caption font-bold tabular-nums text-brand-text">{appointment.start}–{getEndTime(appointment.start, appointment.duration)}</span>
                              <span className={`min-w-0 flex-1 truncate text-body font-semibold text-brand-text ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}>{appointment.customer}</span>
                              {hasConflict && <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-error" />}
                              <StatusGlyph status={appointment.status} className="h-4 w-4 shrink-0 text-brand-text-muted" />
                            </span>
                          ) : (
                            <>
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-caption font-bold tabular-nums text-brand-text">{appointment.start}–{getEndTime(appointment.start, appointment.duration)}</span>
                                <span className="flex items-center gap-1.5">
                                  {hasConflict && <CircleAlert aria-hidden="true" className="h-4 w-4 text-brand-error" />}
                                  <StatusGlyph status={appointment.status} className="h-4 w-4 text-brand-text-muted" />
                                </span>
                              </span>
                              <span className={`mt-0.5 block truncate text-body font-semibold text-brand-text ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}>{appointment.customer}</span>
                              {showService && <span className="block truncate text-caption text-brand-text-muted">{appointment.service}</span>}
                              {showOperationalMeta && (
                                <span className="mt-1 flex items-center justify-between gap-2">
                                  <StatusBadge status={appointment.status} label={statusText.short} size="small" />
                                  <span className="shrink-0 truncate text-caption text-brand-text-muted">{appointment.station || 'Chưa xếp bàn'}</span>
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {selectedDate === todayDate && currentMinuteOfDay >= 8 * 60 && currentMinuteOfDay <= 20 * 60 && (
                  <div className="pointer-events-none absolute left-0 right-0 border-t border-brand-error" style={{ zIndex: 5, top: (currentMinuteOfDay - 480) / 60 * scheduleHourHeight }}>
                    <span className="absolute -left-0.5 -top-3 z-20 rounded-r-control bg-brand-error px-2 py-0.5 text-caption font-bold tabular-nums text-[color:var(--color-brand-on-primary)]">
                      {currentTimeLabel}
                      <span className="sr-only"> — thời điểm hiện tại</span>
                    </span>
                  </div>
                )}
              </div>
            </div> : (
              <div className="flex min-h-72 flex-col items-center justify-center gap-2 px-6 text-center">
                <UsersRound aria-hidden="true" className="h-8 w-8 text-brand-text-muted" />
                <p className="text-card-title text-brand-text">Không tìm thấy nhân viên</p>
                <p className="text-body text-brand-text-muted">Thử tên khác hoặc xóa tìm kiếm để xem toàn bộ lịch.</p>
                <Button size="small" variant="secondary" onClick={() => setStaffSearchQuery('')}>Xóa tìm kiếm</Button>
              </div>
            )}
            {!filteredAppointments.length && (
              <div className="pointer-events-none absolute inset-x-0 top-80 flex flex-col items-center gap-2 text-center">
                <CalendarDays aria-hidden="true" className="h-7 w-7 text-brand-text-muted" />
                <p className="text-body font-semibold text-brand-text-muted">Không có lịch phù hợp với bộ lọc</p>
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="p-3">
            <DataTable<TenantAppointment>
              columns={appointmentColumns}
              rows={filteredAppointments}
              rowKey={(appointment) => appointment.id}
              caption={`Lịch hẹn ngày ${formatSelectedDate(selectedDate)}`}
              onRowClick={(appointment) => setSelectedAppointment(appointment)}
              emptyTitle="Không tìm thấy lịch hẹn phù hợp"
              emptyDescription="Thử từ khóa khác hoặc bỏ bớt bộ lọc đang áp dụng."
              emptyAction={<Button size="small" variant="secondary" onClick={resetFilters}>Xóa tìm kiếm và bộ lọc</Button>}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-brand-outline bg-brand-surface-lowest px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-caption text-brand-text-muted">
            Hiển thị <span className="font-bold tabular-nums text-brand-text">{filteredAppointments.length}</span> trên{' '}
            <span className="tabular-nums">{scopedAppointments.length}</span> lịch trong ngày
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-brand-text-muted">
            {/* Chú giải cách đọc lịch — giải thích tĩnh nên đặt ở chân khung, không
                đứng cùng hàng với các chip lọc bấm được. */}
            {viewMode === 'SCHEDULE' && (
              <>
                <span className="flex items-center gap-1.5"><SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />Màu = trạng thái</span>
                <span className="flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />Chiều cao = thời lượng</span>
              </>
            )}
            <span className="flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />Giờ mở cửa 08:00–20:00</span>
            <span className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{branchFilter === 'ALL' ? `${Object.keys(branchNames).length} chi nhánh` : branchNames[branchFilter] || branchFilter}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-card-title text-brand-text">Ưu tiên xử lý</h2>
              <p className="mt-0.5 text-body text-brand-text-muted">Xác nhận nhanh, không cần mở chi tiết</p>
            </div>
            <StatusBadge status="PENDING" label={`${pendingCount} chờ xác nhận`} size="small" />
          </div>

          {pendingCount ? (
            <ul className="mt-3 flex flex-col">
              {scopedAppointments.filter((appointment) => appointment.status === 'PENDING').slice(0, 3).map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3 border-t border-brand-outline py-3 first:border-t-0 first:pt-0">
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(appointment)}
                    className="flex h-auto min-w-0 flex-1 items-center gap-3 rounded-control border-0 bg-transparent px-0 py-0 text-left shadow-none"
                  >
                    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-body font-bold tabular-nums text-brand-text">
                      {appointment.start}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-brand-text">{appointment.customer}</span>
                      <span className="mt-0.5 block truncate text-caption text-brand-text-muted">{appointment.service} · {appointment.phone}</span>
                    </span>
                  </button>
                  <Button
                    size="small"
                    variant="primary"
                    disabled={!canManage}
                    aria-label={`Xác nhận lịch của ${appointment.customer}`}
                    iconLeading={<Check />}
                    onClick={() => advanceAppointmentStatus(appointment)}
                  >
                    Xác nhận
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Check aria-hidden="true" className="h-6 w-6 text-brand-secondary" />
              <p className="text-body text-brand-text-muted">Không còn lịch cần xác nhận</p>
            </div>
          )}
        </article>

        <article className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-card-title text-brand-text">Nguồn đặt lịch</h2>
              <p className="mt-0.5 text-body text-brand-text-muted">Phân bổ theo kênh trong ngày</p>
            </div>
            <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-text-muted" />
          </div>
          <dl className="mt-4 flex flex-col gap-3">
            {(Object.keys(sourceLabels) as AppointmentSource[]).map((source) => {
              const count = scopedAppointments.filter((appointment) => appointment.source === source).length;
              const percent = scopedAppointments.length ? Math.round(count / scopedAppointments.length * 100) : 0;
              return (
                <div key={source}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-body">
                    <dt className="text-brand-text">{sourceLabels[source]}</dt>
                    <dd className="font-semibold tabular-nums text-brand-text">{count} · {percent}%</dd>
                  </div>
                  {/* Thanh tỷ lệ chỉ minh hoạ cho con số đã có bằng chữ ở trên. */}
                  <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-pill bg-brand-surface-high">
                    <div className="h-full rounded-pill bg-[var(--accent)]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </dl>
        </article>

        <article className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-card-title text-brand-text">Chất lượng vận hành</h2>
              <p className="mt-0.5 text-body text-brand-text-muted">Tính theo lịch đang chọn</p>
            </div>
            <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-text-muted" />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-caption text-brand-text-muted">Đã xác nhận</dt>
              <dd className="ta-metric-value mt-1 text-brand-text">{confirmationRate}%</dd>
            </div>
            <div>
              <dt className="text-caption text-brand-text-muted">Hủy / vắng</dt>
              <dd className="ta-metric-value mt-1 text-brand-text">{cancellationRate}%</dd>
            </div>
            <div>
              <dt className="text-caption text-brand-text-muted">Lấp đầy</dt>
              <dd className="ta-metric-value mt-1 text-brand-text">{utilizationRate}%</dd>
            </div>
          </dl>
          <div className={`mt-4 p-3 ui-tone ui-tone--${pendingCount ? 'warning' : 'success'}`}>
            <p className="flex items-center gap-2 text-body font-semibold text-brand-text">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4 shrink-0" />Tình trạng điều phối
            </p>
            <p className="mt-1 text-body leading-5 text-brand-text-muted">
              {pendingCount
                ? `Còn ${pendingCount} lịch chờ xác nhận và ${reminderPendingCount} lịch chưa gửi nhắc.`
                : `Tất cả ${confirmedCount + completedCount + servingCount} lịch đang hoạt động đã qua bước xác nhận.`}
            </p>
          </div>
        </article>
      </section>

      {/* Chi tiết lịch hẹn */}
      <Modal
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        size="large"
        eyebrow={selectedAppointment?.id}
        title="Chi tiết lịch hẹn"
        description={selectedAppointment ? `Tạo lúc ${selectedAppointment.createdAt} · ${selectedAppointment.createdBy || roleLabel}` : undefined}
        headerAside={selectedAppointment && (
          <span className="flex flex-wrap items-center gap-2">
            {selectedAppointment.firstVisit && (
              <span className="rounded-pill bg-[var(--accent-soft)] px-2 py-0.5 text-caption font-semibold text-[color:var(--accent-strong)]">
                Khách mới
              </span>
            )}
            <StatusBadge
              status={selectedAppointment.status}
              label={appointmentStatusText[selectedAppointment.status].label}
              size="small"
            />
          </span>
        )}
        footer={selectedAppointment && (
          <>
            {selectedAppointment.status === 'CANCELLED' ? (
              <Button
                variant="secondary"
                onClick={openCancelForm}
                disabled={!canManage}
                iconLeading={<Pencil />}
                className="mr-auto"
              >
                {selectedAppointment.cancellationReason ? 'Chỉnh sửa lý do hủy' : 'Bổ sung lý do hủy'}
              </Button>
            ) : selectedAppointment.status === 'REFUNDED' ? (
              <Button
                variant="secondary"
                onClick={openRefundForm}
                disabled={!canManage}
                iconLeading={<Pencil />}
                className="mr-auto"
              >
                {selectedAppointment.refundReason ? 'Chỉnh sửa hoàn tiền' : 'Bổ sung lý do hoàn tiền'}
              </Button>
            ) : (
              !['COMPLETED', 'NO_SHOW', ...(isReceptionist ? ['IN_SERVICE' as AppointmentStatus] : [])].includes(selectedAppointment.status) && (
                <Button variant="ghost" onClick={openCancelForm} disabled={!canManage} className="mr-auto">
                  Hủy lịch hẹn
                </Button>
              )
            )}
            {!['CANCELLED', 'REFUNDED', 'NO_SHOW'].includes(selectedAppointment.status) && (
              <Button
                variant="secondary"
                onClick={openRefundForm}
                disabled={!canManage}
                iconLeading={<RotateCcw className="h-4 w-4 text-amber-600" />}
              >
                Hoàn tiền (Sự cố)
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => openEditForm(selectedAppointment)}
              disabled={!canEditSelectedAppointment}
              title={!canEditSelectedAppointment && isReceptionist ? 'Chỉ được sửa trước khi bắt đầu dịch vụ' : undefined}
              iconLeading={<Pencil />}
            >
              Chỉnh sửa
            </Button>
            {nextStatus[selectedAppointment.status] && !(isReceptionist && selectedAppointment.status === 'IN_SERVICE') && (
              <Button
                variant="primary"
                onClick={() => advanceAppointmentStatus(selectedAppointment)}
                disabled={!canManage}
                iconLeading={<Check />}
              >
                {nextStatusLabel[selectedAppointment.status]}
              </Button>
            )}
            {isReceptionist && selectedAppointment.status === 'IN_SERVICE' && (
              <span className="flex items-center gap-2 px-3 py-2 text-body font-semibold text-brand-text ui-tone ui-tone--info">
                <ReceiptText aria-hidden="true" className="h-4 w-4" />Hoàn tất tại Bàn lễ tân
              </span>
            )}
          </>
        )}
      >
        {selectedAppointment && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="flex flex-col gap-4">
              <section className="rounded-card border border-brand-outline bg-brand-surface-lowest p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-body capitalize text-brand-text-muted">
                      {toDate(selectedAppointment.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <p className="mt-1 text-display font-bold tabular-nums text-brand-text">
                      {selectedAppointment.start}–{getEndTime(selectedAppointment.start, selectedAppointment.duration)}
                    </p>
                    <p className="mt-1 text-body text-brand-text-muted">
                      {selectedAppointment.duration} phút · {branchNames[selectedAppointment.branch] || selectedAppointment.branch}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-control border border-brand-outline bg-brand-surface px-3 py-2">
                    <p className="text-caption uppercase tracking-wide text-brand-text-muted">Bàn / ghế</p>
                    <p className="mt-0.5 text-body font-semibold text-brand-text">{selectedAppointment.station || 'Chưa xếp bàn'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-card border border-brand-outline p-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-[var(--accent-soft)] text-body font-bold text-[color:var(--accent-strong)]">
                    {selectedAppointment.customer.split(' ').slice(-2).map((word) => word[0]).join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-card-title text-brand-text">{selectedAppointment.customer}</p>
                      {matchedCustomerDetail && (
                        <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-bold ${tierMeta[matchedCustomerDetail.tier]?.badge || 'bg-slate-100 text-slate-700'}`}>
                          {matchedCustomerDetail.tier === 'VIP' && <Crown className="h-3 w-3" />}
                          {tierMeta[matchedCustomerDetail.tier]?.label || matchedCustomerDetail.tier}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-brand-text-muted">
                      <span>{selectedAppointment.firstVisit ? 'Khách lần đầu sử dụng dịch vụ' : 'Khách đã có hồ sơ tại salon'}</span>
                      {/* Điểm tích luỹ chỉ hiện khi thật sự có. Loyalty nằm ngoài phạm vi
                          backend (§9.3), nên ở chế độ dữ liệu thật mọi khách đều 0 điểm —
                          in ra "0 điểm tích luỹ" là nói rằng hệ thống đã tính và khách
                          chưa có điểm, trong khi thật ra chưa có gì tính cả. */}
                      {matchedCustomerDetail && matchedCustomerDetail.points > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            {matchedCustomerDetail.points.toLocaleString('vi-VN')} điểm tích luỹ
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a
                    href={`tel:${selectedAppointment.phone.replace(/\s/g, '')}`}
                    className="flex h-[var(--size-control)] items-center justify-center gap-2 rounded-control border border-brand-outline bg-brand-surface-lowest text-body font-semibold text-brand-text no-underline"
                  >
                    <Phone aria-hidden="true" className="h-4 w-4" />{selectedAppointment.phone}
                  </a>
                  <a
                    href={`sms:${selectedAppointment.phone.replace(/\s/g, '')}`}
                    className="flex h-[var(--size-control)] items-center justify-center gap-2 rounded-control border border-brand-outline bg-brand-surface-lowest text-body font-semibold text-brand-text no-underline"
                  >
                    <MessageCircle aria-hidden="true" className="h-4 w-4" />Gửi tin nhắn
                  </a>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <section className="rounded-card border border-brand-outline p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-body font-semibold text-brand-text">Dịch vụ</h3>
                    <span className="rounded-pill bg-brand-surface-high px-2 text-caption tabular-nums text-brand-text-muted">
                      {selectedAppointment.services?.length || 1} dịch vụ
                    </span>
                  </div>
                  <ol className="mt-2 flex flex-col gap-1.5">
                    {(selectedAppointment.services?.length ? selectedAppointment.services : [selectedAppointment.service]).map((service, index) => (
                      <li key={`${service}-${index}`} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-caption font-bold text-brand-text">
                          {index + 1}
                        </span>
                        <p className="text-body leading-5 text-brand-text">{service}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 border-t border-brand-outline pt-2 text-caption text-brand-text-muted">
                    Tổng {selectedAppointment.duration} phút · {formatCurrency(selectedAppointment.price)}
                  </p>
                </section>

                <section className="rounded-card border border-brand-outline p-4">
                  <h3 className="text-body font-semibold text-brand-text">Kỹ thuật viên</h3>
                  <p className="mt-2 text-body font-semibold text-brand-text">{selectedAppointment.staff}</p>
                  <p className="mt-0.5 text-caption text-brand-text-muted">
                    {staffRoster.find((staff) => staff.name === selectedAppointment.staff)?.role || 'Kỹ thuật viên'}
                  </p>
                  {matchedCustomerDetail?.favoriteTechnician &&
                   matchedCustomerDetail.favoriteTechnician !== 'Chưa xác định' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 dark:bg-violet-500/25 px-2 py-1 text-[11px] font-bold text-violet-800 dark:text-violet-300 border border-violet-500/25">
                      <UserCheck className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                      <span>KTV ruột của khách: {matchedCustomerDetail.favoriteTechnician}</span>
                      {matchedCustomerDetail.favoriteTechnician === selectedAppointment.staff && (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Đang phục vụ</span>
                      )}
                    </div>
                  )}
                  <p className="mt-2 border-t border-brand-outline pt-2 text-caption text-brand-text-muted">
                    Nguồn đặt: {sourceLabels[selectedAppointment.source]}
                  </p>
                </section>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <section className="rounded-card border border-brand-outline p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption uppercase tracking-wide text-brand-text-muted">Thanh toán</p>
                    <p className="ta-metric-value mt-1 text-brand-text">{formatCurrency(selectedAppointment.price)}</p>
                  </div>
                  <ReceiptText aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-text-muted" />
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="p-3 ui-tone ui-tone--success">
                    <dt className="text-caption text-brand-text-muted">Đã đặt cọc</dt>
                    <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">{formatCurrency(selectedAppointment.deposit)}</dd>
                  </div>
                  <div className="p-3 ui-tone ui-tone--warning">
                    <dt className="text-caption text-brand-text-muted">Còn phải thu</dt>
                    <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">
                      {formatCurrency(Math.max(0, selectedAppointment.price - selectedAppointment.deposit))}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-card border border-brand-outline bg-brand-surface-lowest p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-body font-semibold text-brand-text">Ghi chú phục vụ</h3>
                  {selectedAppointment.reminderSent ? (
                    <StatusBadge status="SENT" label="Đã nhắc lịch" size="small" />
                  ) : (
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={!canManage}
                      onClick={() => {
                        updateAppointment(selectedAppointment.id, { reminderSent: true });
                        onNotify?.(`Đã ghi nhận gửi nhắc lịch cho ${selectedAppointment.customer}.`);
                      }}
                    >
                      Gửi nhắc lịch
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-body leading-5 text-brand-text-muted">
                  {selectedAppointment.note || 'Chưa có ghi chú cho lịch hẹn này.'}
                </p>
              </section>

              {selectedAppointment.status === 'CANCELLED' && (
                <section className="p-4 ui-tone ui-tone--danger">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-body font-semibold text-brand-text">Thông tin hủy lịch</h3>
                    <div className="flex items-center gap-2">
                      {selectedAppointment.cancelledAt && (
                        <span className="text-caption tabular-nums text-brand-text-muted">{selectedAppointment.cancelledAt}</span>
                      )}
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={!canManage}
                        iconLeading={<Pencil className="h-3.5 w-3.5" />}
                        onClick={openCancelForm}
                      >
                        {selectedAppointment.cancellationReason ? 'Sửa lý do hủy' : 'Ghi lý do hủy'}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-body font-semibold text-brand-text">
                    {selectedAppointment.cancellationReason || (
                      <span className="italic text-brand-text-muted">Chưa ghi nhận lý do (Nhấn "Ghi lý do hủy" để bổ sung)</span>
                    )}
                  </p>
                  <div className="mt-2 rounded-control border border-brand-outline bg-brand-surface px-3 py-2">
                    <p className="text-caption uppercase tracking-wide text-brand-text-muted">Ghi chú hủy</p>
                    <p className="mt-1 text-body leading-5 text-brand-text">
                      {selectedAppointment.cancellationNote || 'Không có ghi chú bổ sung.'}
                    </p>
                  </div>
                  <p className="mt-2 text-caption text-brand-text-muted">
                    Thực hiện bởi {selectedAppointment.cancelledBy || roleLabel}
                  </p>
                </section>
              )}

              {selectedAppointment.status === 'REFUNDED' && (
                <section className="p-4 ui-tone ui-tone--warning">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-amber-600" aria-hidden="true" />
                      <h3 className="text-body font-semibold text-brand-text">Thông tin hoàn tiền / Sự cố</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedAppointment.refundedAt && (
                        <span className="text-caption tabular-nums text-brand-text-muted">{selectedAppointment.refundedAt}</span>
                      )}
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={!canManage}
                        iconLeading={<Pencil className="h-3.5 w-3.5" />}
                        onClick={openRefundForm}
                      >
                        {selectedAppointment.refundReason ? 'Sửa thông tin' : 'Ghi thông tin'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-control border border-brand-outline bg-brand-surface px-3 py-2">
                      <p className="text-caption uppercase tracking-wide text-brand-text-muted">Số tiền đã hoàn</p>
                      <p className="mt-0.5 text-body font-bold text-amber-600">
                        {formatCurrency(selectedAppointment.refundAmount ?? selectedAppointment.price)}
                      </p>
                    </div>
                    <div className="rounded-control border border-brand-outline bg-brand-surface px-3 py-2">
                      <p className="text-caption uppercase tracking-wide text-brand-text-muted">Hình thức hoàn</p>
                      <p className="mt-0.5 text-body font-semibold text-brand-text">
                        {selectedAppointment.refundMethod === 'BANK' ? 'Chuyển khoản' :
                         selectedAppointment.refundMethod === 'CARD' ? 'Thẻ POS' :
                         selectedAppointment.refundMethod === 'MOMO' ? 'Ví MoMo' :
                         selectedAppointment.refundMethod === 'ZALOPAY' ? 'Ví ZaloPay' : 'Tiền mặt tại quầy'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-body font-semibold text-brand-text">
                    Lý do sự cố: {selectedAppointment.refundReason || (
                      <span className="italic text-brand-text-muted">Chưa ghi nhận lý do (Nhấn "Ghi thông tin" để bổ sung)</span>
                    )}
                  </p>
                  <div className="mt-2 rounded-control border border-brand-outline bg-brand-surface px-3 py-2">
                    <p className="text-caption uppercase tracking-wide text-brand-text-muted">Ghi chú sự cố &amp; xử lý</p>
                    <p className="mt-1 text-body leading-5 text-brand-text">
                      {selectedAppointment.refundNote || 'Không có ghi chú bổ sung.'}
                    </p>
                  </div>
                  <p className="mt-2 text-caption text-brand-text-muted">
                    Thực hiện bởi {selectedAppointment.refundedBy || roleLabel}
                  </p>
                </section>
              )}

              <section className="rounded-card border border-brand-outline p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-body font-semibold text-brand-text">Tiến trình phục vụ</h3>
                  {selectedAppointment.status === 'REFUNDED' && (
                    <span className="rounded-pill bg-amber-50 px-2.5 py-0.5 text-caption font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Đã xử lý hoàn tiền
                    </span>
                  )}
                </div>
                <ol className="mt-3 flex gap-2">
                  {(['CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', selectedAppointment.status === 'REFUNDED' ? 'REFUNDED' : 'COMPLETED'] as AppointmentStatus[]).map((status, index) => {
                    const order: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', selectedAppointment.status === 'REFUNDED' ? 'REFUNDED' : 'COMPLETED'];
                    const isReached = order.indexOf(selectedAppointment.status) >= order.indexOf(status);
                    const isRefundStep = status === 'REFUNDED';
                    return (
                      <li key={status} className="min-w-0 flex-1">
                        <div
                          aria-hidden="true"
                          className={`h-2 rounded-pill ${
                            isRefundStep && isReached
                              ? 'bg-amber-500'
                              : isReached
                              ? 'bg-[var(--accent)]'
                              : 'bg-brand-surface-high'
                          }`}
                        />
                        <p className={`mt-2 truncate text-center text-caption font-semibold ${
                          isRefundStep && isReached
                            ? 'font-bold text-amber-600 dark:text-amber-400'
                            : isReached
                            ? 'text-[color:var(--accent-strong)]'
                            : 'text-brand-text-muted'
                        }`}>
                          {index === 0 ? 'Xác nhận' : index === 1 ? 'Đã đến' : index === 2 ? 'Phục vụ' : isRefundStep ? 'Hoàn tiền' : 'Hoàn thành'}
                          {isReached && <span className="sr-only"> (đã qua)</span>}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="flex items-start gap-3 p-4 ui-tone ui-tone--info">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-text-muted" />
                <div className="min-w-0">
                  <p className="text-body font-semibold text-brand-text">Quyền thao tác: {roleLabel}</p>
                  <p className="mt-1 text-body leading-5 text-brand-text-muted">
                    {canManage
                      ? 'Bạn có thể chỉnh sửa thông tin và cập nhật trạng thái lịch hẹn này.'
                      : readOnlyReason || 'Bạn đang ở chế độ chỉ xem.'}
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>

      {/* Hủy / Cập nhật lý do hủy lịch hẹn */}
      <Modal
        open={showCancelForm && Boolean(selectedAppointment)}
        onClose={() => setShowCancelForm(false)}
        size="medium"
        closeOnBackdrop={false}
        icon={<CircleAlert aria-hidden="true" />}
        title={selectedAppointment?.status === 'CANCELLED'
          ? (selectedAppointment.cancellationReason ? 'Chỉnh sửa lý do hủy' : 'Bổ sung lý do hủy lịch')
          : 'Hủy lịch hẹn'}
        description={selectedAppointment?.status === 'CANCELLED'
          ? 'Cập nhật lý do và ghi chú hủy để đối soát và lưu trữ hồ sơ lịch hẹn.'
          : 'Lý do và ghi chú sẽ được lưu trong lịch sử lịch hẹn.'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowCancelForm(false)}>Quay lại</Button>
            <Button
              variant={selectedAppointment?.status === 'CANCELLED' ? 'primary' : 'danger'}
              type="submit"
              form="tenant-appointment-cancel-form"
              disabled={!cancellationReason}
              iconLeading={selectedAppointment?.status === 'CANCELLED' ? <Check /> : <X />}
            >
              {selectedAppointment?.status === 'CANCELLED' ? 'Lưu thông tin hủy' : 'Xác nhận hủy lịch'}
            </Button>
          </>
        )}
      >
        {selectedAppointment && (
          <form id="tenant-appointment-cancel-form" onSubmit={submitCancellation} noValidate className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-card border border-brand-outline bg-brand-surface-lowest p-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-caption font-bold text-brand-text">
                {selectedAppointment.customer.split(' ').slice(-2).map((word) => word[0]).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-brand-text">{selectedAppointment.customer}</p>
                <p className="mt-0.5 truncate text-caption text-brand-text-muted">
                  {selectedAppointment.id} · {selectedAppointment.start}–{getEndTime(selectedAppointment.start, selectedAppointment.duration)} · {selectedAppointment.service}
                </p>
              </div>
            </div>

            {selectedAppointment.deposit > 0 && (
              <p className="flex items-start gap-2 p-3 text-body leading-5 text-brand-text ui-tone ui-tone--warning">
                <CircleDollarSign aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                Lịch đã nhận cọc {formatCurrency(selectedAppointment.deposit)}. Sau khi hủy, cần xử lý hoàn cọc hoặc ghi chú đối soát tại màn hình Thanh toán.
              </p>
            )}

            {cancellationError && (
              <p role="alert" className="flex items-start gap-2 p-3 text-body font-semibold text-brand-text ui-tone ui-tone--danger">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{cancellationError}
              </p>
            )}

            <fieldset className="border-0 p-0">
              <legend className="mb-2 text-body font-semibold text-brand-text">
                Lý do hủy <span className="text-brand-error" title="Bắt buộc"><span aria-hidden="true">*</span><span className="sr-only">Bắt buộc</span></span>
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cancellationReasons.map((reason) => {
                  const isSelected = cancellationReason === reason;
                  return (
                    <label
                      key={reason}
                      className={`flex min-h-11 cursor-pointer items-center gap-2.5 p-3 text-body text-brand-text ui-tone ${isSelected ? 'ui-tone--danger' : ''}`}
                    >
                      <input
                        type="radio"
                        name="cancellation-reason"
                        value={reason}
                        checked={isSelected}
                        onChange={() => { setCancellationReason(reason); setCancellationError(''); }}
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand-error)]"
                      />
                      {reason}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label="Ghi chú hủy"
              required={cancellationReason === 'Khác'}
              helper={`${cancellationNote.length}/500 ký tự${cancellationReason === 'Khác' ? '' : ' · không bắt buộc'}`}
            >
              <textarea
                value={cancellationNote}
                maxLength={500}
                rows={3}
                onChange={(event) => { setCancellationNote(event.target.value); setCancellationError(''); }}
                placeholder="Ví dụ: Khách báo bận công tác và sẽ đặt lại vào tuần sau..."
                className="w-full resize-y py-2.5 leading-5"
              />
            </Field>

            <p className="flex items-start gap-2 p-3 text-body leading-5 text-brand-text-muted ui-tone">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Hệ thống sẽ ghi nhận người hủy là <strong className="text-brand-text">{roleLabel}</strong> cùng thời điểm thao tác.</span>
            </p>
          </form>
        )}
      </Modal>

      {/* Hoàn tiền / Xử lý sự cố trong khi làm */}
      <Modal
        open={showRefundForm && Boolean(selectedAppointment)}
        onClose={() => setShowRefundForm(false)}
        size="medium"
        closeOnBackdrop={false}
        icon={<RotateCcw aria-hidden="true" className="text-amber-600" />}
        title={selectedAppointment?.status === 'REFUNDED'
          ? (selectedAppointment.refundReason ? 'Chỉnh sửa thông tin hoàn tiền' : 'Bổ sung thông tin hoàn tiền')
          : 'Hoàn tiền / Sự cố trong dịch vụ'}
        description={selectedAppointment?.status === 'REFUNDED'
          ? 'Cập nhật số tiền hoàn, lý do sự cố và giải pháp đã thực hiện cho khách.'
          : 'Chuyển sang trạng thái hoàn tiền khi xảy ra sự cố trong quá trình thực hiện dịch vụ.'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowRefundForm(false)}>Quay lại</Button>
            <Button
              variant="primary"
              type="submit"
              form="tenant-appointment-refund-form"
              iconLeading={<Check />}
            >
              {selectedAppointment?.status === 'REFUNDED' ? 'Lưu thông tin hoàn tiền' : 'Xác nhận hoàn tiền'}
            </Button>
          </>
        )}
      >
        {selectedAppointment && (
          <form id="tenant-appointment-refund-form" onSubmit={submitRefund} noValidate className="flex flex-col gap-4">
            {/* Câu phạm vi — chỉ ở chế độ dữ liệu thật, vì chỉ khi ấy nó mới đúng và
                mới cần. Ở chế độ trình bày thì cả trang đã đeo nhãn dữ liệu mẫu. */}
            {live && (
              <p className="rounded-card border border-amber-300 bg-amber-50 px-3 py-2 text-caption text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <strong className="font-bold">Phạm vi của khối này.</strong>{' '}
                Máy chủ ghi nhận hoàn tiền ở <strong>hóa đơn</strong> chứ không ở lịch hẹn, nên
                thông tin nhập tại đây chỉ lưu trên máy này và <strong>không vào báo cáo doanh
                thu</strong>. Muốn hoàn tiền có sổ sách, làm ở màn Thanh toán trên hóa đơn của
                lượt khách này.
              </p>
            )}
            <div className="flex items-center gap-3 rounded-card border border-brand-outline bg-brand-surface-lowest p-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-amber-100 text-caption font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {selectedAppointment.customer.split(' ').slice(-2).map((word) => word[0]).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-brand-text">{selectedAppointment.customer}</p>
                <p className="mt-0.5 truncate text-caption text-brand-text-muted">
                  {selectedAppointment.id} · KTV: {selectedAppointment.staff} · Tổng tiền: {formatCurrency(selectedAppointment.price)} (Đã cọc: {formatCurrency(selectedAppointment.deposit)})
                </p>
              </div>
            </div>

            <div className="p-3 text-body leading-5 text-brand-text ui-tone ui-tone--warning">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Quy trình xử lý sự cố trong khi phục vụ
              </p>
              <p className="mt-1 text-caption text-brand-text-muted">
                Trạng thái sẽ được chuyển sang <strong>Đã hoàn tiền</strong>. Số tiền hoàn và lý do sẽ được lưu vào lịch sử đối soát của chi nhánh.
              </p>
            </div>

            {refundError && (
              <p role="alert" className="flex items-start gap-2 p-3 text-body font-semibold text-brand-text ui-tone ui-tone--danger">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{refundError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Số tiền hoàn lại cho khách" required helper={`Tối đa ${formatCurrency(selectedAppointment.price)}`}>
                <input
                  type="number"
                  min="0"
                  max={selectedAppointment.price}
                  step="10000"
                  value={refundAmount}
                  onChange={(event) => { setRefundAmount(event.target.value); setRefundError(''); }}
                  placeholder="Ví dụ: 350000"
                />
              </Field>

              <Field label="Phương thức hoàn tiền" required>
                <BeautifulSelect
                  value={refundMethod}
                  onChange={(event) => setRefundMethod(event.target.value as typeof refundMethod)}
                  className="w-full"
                >
                  <option value="CASH">Tiền mặt tại quầy</option>
                  <option value="BANK">Chuyển khoản ngân hàng</option>
                  <option value="MOMO">Ví MoMo</option>
                  <option value="ZALOPAY">Ví ZaloPay</option>
                  <option value="CARD">Hoàn thẻ</option>
                </BeautifulSelect>
              </Field>
            </div>

            <fieldset className="border-0 p-0">
              <legend className="mb-2 text-body font-semibold text-brand-text">
                Lý do sự cố / hoàn tiền <span className="text-brand-error" title="Bắt buộc"><span aria-hidden="true">*</span><span className="sr-only">Bắt buộc</span></span>
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {refundReasons.map((reason) => {
                  const isSelected = refundReason === reason;
                  return (
                    <label
                      key={reason}
                      className={`flex min-h-11 cursor-pointer items-center gap-2.5 p-3 text-body text-brand-text ui-tone ${isSelected ? 'ui-tone--warning' : ''}`}
                    >
                      <input
                        type="radio"
                        name="refund-reason"
                        value={reason}
                        checked={isSelected}
                        onChange={() => { setRefundReason(reason); setRefundError(''); }}
                        className="h-4 w-4 shrink-0 accent-amber-600"
                      />
                      {reason}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label="Ghi chú sự cố &amp; giải pháp xử lý"
              required={refundReason === 'Khác'}
              helper={`${refundNote.length}/500 ký tự${refundReason === 'Khác' ? '' : ' · không bắt buộc'}`}
            >
              <textarea
                value={refundNote}
                maxLength={500}
                rows={3}
                onChange={(event) => { setRefundNote(event.target.value); setRefundError(''); }}
                placeholder="Ví dụ: Khách bị rát da tay khi hơ đèn gel, đã xử lý sát khuẩn và hoàn tiền tại chỗ, tặng voucher 100k cho lần sau..."
                className="w-full resize-y py-2.5 leading-5"
              />
            </Field>

            <p className="flex items-start gap-2 p-3 text-body leading-5 text-brand-text-muted ui-tone">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Hệ thống sẽ ghi nhận nhân viên thực hiện hoàn tiền là <strong className="text-brand-text">{roleLabel}</strong>.</span>
            </p>
          </form>
        )}
      </Modal>

      {/* Tạo và chỉnh sửa lịch hẹn */}
      <Modal
        open={Boolean(formMode)}
        onClose={() => setFormMode(null)}
        size="large"
        closeOnBackdrop={false}
        title={formMode === 'CREATE' ? 'Tạo lịch hẹn mới' : `Chỉnh sửa ${selectedAppointment?.id ?? ''}`}
        description="Chọn một hoặc nhiều dịch vụ cho khách trong cùng lịch hẹn."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setFormMode(null)}>Hủy</Button>
            <Button
              variant="primary"
              type="submit"
              form="tenant-appointment-form"
              disabled={!form.services.length}
              iconLeading={<CalendarCheck2 />}
            >
              {formMode === 'CREATE' ? `Lưu ${form.services.length} dịch vụ` : 'Lưu thay đổi'}
            </Button>
          </>
        )}
      >
        <form id="tenant-appointment-form" onSubmit={submitAppointment} noValidate className="flex flex-col gap-5">
          {formError && (
            <p role="alert" className="flex items-start gap-2 p-3 text-body font-semibold text-brand-text ui-tone ui-tone--danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{formError}
            </p>
          )}

          <fieldset className="border-0 p-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <legend className="flex items-center gap-2 text-card-title text-brand-text">
                <UserRound aria-hidden="true" className="h-5 w-5 text-brand-text-muted" />Thông tin khách hàng
              </legend>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setShowCustomerPicker(true)}
                iconLeading={<Search className="h-3.5 w-3.5" />}
              >
                {matchedCustomer ? 'Chọn khách khác' : 'Chọn từ hồ sơ'}
              </Button>
            </div>

            {matchedCustomer ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 transition-all">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tierMeta[matchedCustomer.tier]?.avatar || 'from-emerald-500 to-teal-600'} text-white font-black text-sm shadow-xs`}
                    >
                      {matchedCustomer.name.split(' ').slice(-2).map((w) => w[0]).join('')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-brand-text">{matchedCustomer.name}</h4>
                        <span className="rounded-md bg-brand-surface px-1.5 py-0.5 text-[11px] font-bold text-brand-text-muted border border-brand-outline">
                          {matchedCustomer.id}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tierMeta[matchedCustomer.tier]?.badge || 'bg-slate-100 text-slate-700'}`}>
                          {matchedCustomer.tier === 'VIP' && <Crown className="h-3 w-3" />}
                          {tierMeta[matchedCustomer.tier]?.label || matchedCustomer.tier}
                        </span>
                      </div>

                      {/* Điểm tích luỹ đồng bộ */}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/25 px-2.5 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                          <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Điểm tích luỹ: {matchedCustomer.points.toLocaleString('vi-VN')} điểm</span>
                        </div>
                        <span className="text-caption text-brand-text-muted">
                          {matchedCustomer.visits} lượt ghé · Đã chi: {formatCurrency(matchedCustomer.totalSpent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearCustomerLink}
                    className="shrink-0 text-caption font-semibold text-brand-text-muted hover:text-brand-error underline"
                  >
                    Bỏ liên kết
                  </button>
                </div>

                {/* Gợi ý KTV ruột và cảnh báo an toàn móng */}
                <div className="mt-3 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center gap-2">
                  {matchedCustomer.favoriteTechnician &&
                   matchedCustomer.favoriteTechnician !== 'Chưa xác định' &&
                   matchedCustomer.favoriteTechnician !== 'Chưa chọn' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((curr) => ({ ...curr, staff: matchedCustomer.favoriteTechnician }));
                        onNotify?.(`Đã gán KTV ruột: ${matchedCustomer.favoriteTechnician}`);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        form.staff === matchedCustomer.favoriteTechnician
                          ? 'bg-brand-primary text-white shadow-xs'
                          : 'bg-brand-surface text-brand-text border border-brand-outline hover:border-brand-primary'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      KTV ruột: {matchedCustomer.favoriteTechnician}
                      {form.staff === matchedCustomer.favoriteTechnician && ' (Đã chọn)'}
                    </button>
                  )}
                  {matchedCustomer.allergies && matchedCustomer.allergies !== 'Không ghi nhận' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-500/25">
                      ⚠️ Dị ứng: {matchedCustomer.allergies}
                    </span>
                  )}
                  {matchedCustomer.nailCondition && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2 py-1 text-[11px] font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-500/25">
                      💅 Tình trạng: {matchedCustomer.nailCondition}
                    </span>
                  )}
                </div>

                {/* Input số điện thoại & tên hiển thị ẩn/gọn */}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-emerald-500/15">
                  <Field label="Tên khách hàng" required error={fieldErrors.customer}>
                    <input
                      type="text"
                      value={form.customer}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, customer: event.target.value }));
                        if (fieldErrors.customer) setFieldErrors((prev) => ({ ...prev, customer: '' }));
                      }}
                      placeholder="Tên khách"
                    />
                  </Field>
                  <Field label="Số điện thoại" required error={fieldErrors.phone}>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, phone: event.target.value }));
                        if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="09xx xxx xxx"
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <Field label="Tên khách hàng" required error={fieldErrors.customer}>
                      <input
                        type="text"
                        value={form.customer}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, customer: event.target.value }));
                          setCustomerSearchQuery(event.target.value);
                          setCustomerDropdownOpen(true);
                          if (fieldErrors.customer) setFieldErrors((prev) => ({ ...prev, customer: '' }));
                        }}
                        placeholder="Nhập tên khách hoặc tìm hồ sơ..."
                      />
                    </Field>
                  </div>
                  <div className="relative">
                    <Field label="Số điện thoại" required helper="Định dạng Việt Nam, ví dụ 0912 884 206." error={fieldErrors.phone}>
                      <input
                        type="tel"
                        value={form.phone}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, phone: event.target.value }));
                          setCustomerSearchQuery(event.target.value);
                          setCustomerDropdownOpen(true);
                          if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        placeholder="09xx xxx xxx"
                      />
                    </Field>
                  </div>
                </div>

                {isCustomerUnlinked && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    <span>Đang ở chế độ nhập tự do (đã bỏ liên kết hồ sơ).</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomerUnlinked(false)}
                      className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                    >
                      Khớp lại hồ sơ
                    </button>
                  </div>
                )}

                {/* Autocomplete gợi ý khách hàng từ hồ sơ Salon */}
                {customerDropdownOpen && customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-2xl">
                    <div className="flex items-center justify-between border-b border-brand-outline bg-brand-surface-high/50 px-3 py-2 text-caption font-bold text-brand-text-muted">
                      <span className="flex items-center gap-1.5">
                        <UsersRound className="h-3.5 w-3.5 text-brand-primary" />
                        Tìm thấy {customerSuggestions.length} khách có hồ sơ trong tiệm:
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomerDropdownOpen(false)}
                        className="text-brand-text-muted hover:text-brand-text"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ul className="max-h-60 overflow-y-auto divide-y divide-brand-outline/60">
                      {customerSuggestions.map((cust) => (
                        <li key={cust.id}>
                          <button
                            type="button"
                            onClick={() => selectCustomer(cust)}
                            className="w-full text-left p-3 hover:bg-brand-surface-high flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tierMeta[cust.tier]?.avatar || 'from-emerald-500 to-teal-600'} text-white font-bold text-xs`}>
                                {cust.name.split(' ').slice(-2).map((w) => w[0]).join('')}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-xs font-bold text-brand-text">{cust.name}</p>
                                  <span className="rounded bg-brand-surface-high px-1 py-0.2 text-[10px] font-semibold text-brand-text-muted">
                                    {cust.id}
                                  </span>
                                  <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${tierMeta[cust.tier]?.badge || 'bg-slate-100'}`}>
                                    {tierMeta[cust.tier]?.label || cust.tier}
                                  </span>
                                </div>
                                <p className="text-[11px] text-brand-text-muted mt-0.5">{cust.phone}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                                <Gift className="h-3 w-3" />
                                {cust.points.toLocaleString('vi-VN')} điểm
                              </span>
                              <p className="text-[10px] text-brand-text-muted mt-0.5">Click để chọn</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="border-0 border-t border-brand-outline p-0 pt-5">
            <legend className="mb-3 flex items-center gap-2 text-card-title text-brand-text">
              <Sparkles aria-hidden="true" className="h-5 w-5 text-brand-text-muted" />Dịch vụ &amp; phân công
            </legend>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-body font-semibold text-brand-text">
                  Chọn dịch vụ <span className="text-brand-error" title="Bắt buộc"><span aria-hidden="true">*</span><span className="sr-only">Bắt buộc</span></span>
                </p>
                <p className="mt-0.5 text-caption text-brand-text-muted">Có thể chọn nhiều dịch vụ cho cùng một khách</p>
              </div>
              <span role="status" className="rounded-pill bg-[var(--accent-soft)] px-2.5 py-0.5 text-caption font-semibold tabular-nums text-[color:var(--accent-strong)]">
                {form.services.length} đã chọn
              </span>
            </div>

            {fieldErrors.services && (
              <p role="alert" className="mt-2 text-body font-medium text-[color:var(--color-brand-error)]">
                {fieldErrors.services}
              </p>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {serviceCatalog.map((service) => {
                const isSelected = form.services.includes(service.name);
                return (
                  <label
                    key={service.name}
                    className={`flex cursor-pointer items-center gap-3 p-3 ui-tone ${isSelected ? 'ui-tone--info' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setForm((current) => ({
                          ...current,
                          services: isSelected
                            ? current.services.filter((name) => name !== service.name)
                            : [...current.services, service.name]
                        }));
                        setFormError('');
                        if (fieldErrors.services) setFieldErrors((prev) => ({ ...prev, services: '' }));
                      }}
                      className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-brand-text">{service.name}</span>
                      <span className="mt-0.5 block text-caption tabular-nums text-brand-text-muted">
                        {service.duration} phút · {formatCurrency(service.price)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedServiceDetails.length ? (
              <div className="mt-3 overflow-hidden rounded-card border border-brand-outline">
                <div className="flex items-center justify-between border-b border-brand-outline bg-brand-surface-lowest px-4 py-2.5">
                  <p className="text-body font-semibold text-brand-text">Danh sách dịch vụ</p>
                  <p className="text-caption tabular-nums text-brand-text-muted">{selectedServiceDuration} phút</p>
                </div>
                <ol>
                  {selectedServiceDetails.map((service, index) => (
                    <li key={service.name} className="flex items-center gap-3 border-b border-brand-outline px-4 py-2.5">
                      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-caption font-bold text-brand-text">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-brand-text">{service.name}</span>
                        <span className="text-caption tabular-nums text-brand-text-muted">{service.duration} phút</span>
                      </span>
                      <span className="shrink-0 text-body font-semibold tabular-nums text-brand-text">{formatCurrency(service.price)}</span>
                      <Button
                        size="small"
                        variant="ghost"
                        iconOnly
                        aria-label={`Bỏ dịch vụ ${service.name}`}
                        onClick={() => setForm((current) => ({ ...current, services: current.services.filter((name) => name !== service.name) }))}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ol>
                <dl className="grid grid-cols-3 gap-px bg-brand-outline">
                  <div className="bg-brand-surface px-3 py-2.5">
                    <dt className="text-caption text-brand-text-muted">Tổng dịch vụ</dt>
                    <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">{selectedServiceDetails.length}</dd>
                  </div>
                  <div className="bg-brand-surface px-3 py-2.5">
                    <dt className="text-caption text-brand-text-muted">Thời lượng</dt>
                    <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">{selectedServiceDuration} phút</dd>
                  </div>
                  <div className="bg-brand-surface px-3 py-2.5">
                    <dt className="text-caption text-brand-text-muted">Tạm tính</dt>
                    <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">{formatCurrency(selectedServicePrice)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-3 border-dashed p-3 text-body font-semibold text-brand-text ui-tone ui-tone--warning">
                Chọn ít nhất một dịch vụ để tiếp tục.
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Chi nhánh" required disabled={branchLocked}>
                <BeautifulSelect
                  value={form.branch}
                  aria-label={branchLocked ? 'Chi nhánh được phân công' : undefined}
                  onChange={(event) => {
                    const branch = event.target.value as BranchCode;
                    // Đổi chi nhánh là đổi luôn kỹ thuật viên: BR-EMP-003 buộc nhân
                    // viên thuộc đúng một chi nhánh, nên người đang chọn có thể
                    // không còn hợp lệ. Lấy người đầu tiên của chi nhánh mới thay vì
                    // chép cứng hai cái tên của bộ mẫu.
                    const firstStaff = staffRoster.find((staff) => staff.branch === branch);
                    setForm((current) => ({
                      ...current,
                      branch,
                      staff: firstStaff?.name || '',
                      station: stationsFor(branch)[0] || ''
                    }));
                  }}
                  className="w-full"
                >
                  {Object.entries(branchNames).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </BeautifulSelect>
              </Field>

              <Field label="Kỹ thuật viên phụ trách" required error={fieldErrors.staff}>
                <BeautifulSelect
                  value={form.staff}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, staff: event.target.value }));
                    if (fieldErrors.staff) setFieldErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="w-full"
                >
                  {staffRoster.filter((staff) => staff.branch === form.branch).map((staff) => (
                    <option key={staff.name} value={staff.name}>{staff.name} · {staff.role}</option>
                  ))}
                </BeautifulSelect>
              </Field>

              {/* Dấu bắt buộc đi theo việc có ghế để chọn hay không — xem phép kiểm 7. */}
              <Field
                label="Ghế / phòng phục vụ"
                required={stationsFor(form.branch).length > 0}
                helper={stationsFor(form.branch).length === 0 ? 'Sơ đồ ghế & khu vực chưa nối máy chủ nên chưa có ghế để chọn.' : undefined}
                error={fieldErrors.station}
              >
                <BeautifulSelect
                  value={form.station}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, station: event.target.value }));
                    if (fieldErrors.station) setFieldErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="w-full"
                >
                  {stationsFor(form.branch).map((station) => <option key={station} value={station}>{station}</option>)}
                </BeautifulSelect>
              </Field>

              <Field label="Nguồn đặt lịch">
                <BeautifulSelect
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as AppointmentSource }))}
                  className="w-full"
                >
                  {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </BeautifulSelect>
              </Field>
            </div>

            <p className="mt-3 flex items-start gap-2 p-3 text-body leading-5 text-brand-text-muted ui-tone">
              <UsersRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              Nhân viên và bàn/ghế đã chọn được áp dụng cho toàn bộ dịch vụ trong lịch hẹn này.
            </p>
          </fieldset>

          <fieldset className="border-0 border-t border-brand-outline p-0 pt-5">
            <legend className="mb-3 flex items-center gap-2 text-card-title text-brand-text">
              <Clock3 aria-hidden="true" className="h-5 w-5 text-brand-text-muted" />Thời gian &amp; trạng thái
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Ngày" required error={fieldErrors.date}>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, date: event.target.value }));
                    if (fieldErrors.date) setFieldErrors((prev) => ({ ...prev, date: '' }));
                  }}
                />
              </Field>

              <Field label="Giờ bắt đầu" required helper="Giờ mở cửa: 08:00 – 20:30 (Định dạng HH:mm, ví dụ 08:30 hoặc 14:30)." error={fieldErrors.start}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                  placeholder="HH:mm"
                  value={form.start}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, start: format24HourInput(event.target.value) }));
                    if (fieldErrors.start) setFieldErrors((prev) => ({ ...prev, start: '' }));
                  }}
                />
              </Field>

              <Field
                label="Trạng thái"
                disabled={isReceptionist}
                helper={isReceptionist ? 'Đổi trạng thái theo nút nghiệp vụ trong chi tiết lịch.' : undefined}
              >
                <BeautifulSelect
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))}
                  className="w-full"
                >
                  {(Object.keys(appointmentStatusText) as AppointmentStatus[]).map((value) => (
                    <option key={value} value={value}>{appointmentStatusText[value].label}</option>
                  ))}
                </BeautifulSelect>
              </Field>
            </div>
          </fieldset>

          <fieldset className="border-0 border-t border-brand-outline p-0 pt-5">
            <legend className="mb-3 flex items-center gap-2 text-card-title text-brand-text">
              <CircleDollarSign aria-hidden="true" className="h-5 w-5 text-brand-text-muted" />Thanh toán &amp; ghi chú
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tiền đặt cọc" helper="Không được lớn hơn tổng giá dịch vụ dự kiến." error={fieldErrors.deposit}>
                <input
                  type="number"
                  min="0"
                  max={selectedServicePrice || undefined}
                  step="10000"
                  value={form.deposit}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, deposit: event.target.value }));
                    if (fieldErrors.deposit) setFieldErrors((prev) => ({ ...prev, deposit: '' }));
                  }}
                />
              </Field>

              <dl className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-control border border-brand-outline bg-brand-outline">
                <div className="bg-brand-surface-lowest px-4 py-3">
                  <dt className="text-caption text-brand-text-muted">Tổng dự kiến</dt>
                  <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">{formatCurrency(selectedServicePrice)}</dd>
                </div>
                <div className="bg-brand-surface-lowest px-4 py-3">
                  <dt className="text-caption text-brand-text-muted">Kết thúc</dt>
                  <dd className="mt-1 text-body font-bold tabular-nums text-brand-text">{selectedServiceEnd}</dd>
                </div>
              </dl>
            </div>

            <Field label="Ghi chú phục vụ" className="mt-4">
              <textarea
                value={form.note}
                rows={3}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Mẫu nail, màu sắc, tình trạng móng, dị ứng hoặc yêu cầu riêng..."
                className="w-full resize-y py-2.5 leading-5"
              />
            </Field>
          </fieldset>
        </form>
      </Modal>

      {/* Hộp thoại chọn khách hàng từ hồ sơ Salon */}
      <Modal
        open={showCustomerPicker}
        onClose={() => setShowCustomerPicker(false)}
        size="medium"
        title="Chọn khách hàng từ hồ sơ tiệm"
        description="Dữ liệu khách hàng, hạng thành viên và điểm tích luỹ sẽ tự động đồng bộ vào lịch hẹn."
        footer={(
          <Button variant="secondary" onClick={() => setShowCustomerPicker(false)}>Đóng</Button>
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              placeholder="Tìm theo tên khách, số điện thoại, mã CUS..."
              className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/40 pl-9 pr-3 text-xs font-semibold text-brand-text outline-none focus:border-brand-primary focus:bg-brand-surface"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-brand-outline rounded-xl border border-brand-outline bg-brand-surface">
            {customerList
              .filter((c) => {
                if (!customerSearchQuery.trim()) return true;
                const q = customerSearchQuery.toLowerCase();
                const digits = q.replace(/\D/g, '');
                return (
                  c.name.toLowerCase().includes(q) ||
                  c.id.toLowerCase().includes(q) ||
                  (digits && c.phone.replace(/\D/g, '').includes(digits))
                );
              })
              .map((c) => (
                <div
                  key={c.id}
                  className="p-3 hover:bg-brand-surface-high/60 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tierMeta[c.tier]?.avatar || 'from-emerald-500 to-teal-600'} text-white font-bold text-xs shadow-2xs`}>
                      {c.name.split(' ').slice(-2).map((w) => w[0]).join('')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-brand-text">{c.name}</p>
                        <span className="rounded bg-brand-surface-high px-1.5 py-0.5 text-[10px] font-semibold text-brand-text-muted">
                          {c.id}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tierMeta[c.tier]?.badge || 'bg-slate-100'}`}>
                          {tierMeta[c.tier]?.label || c.tier}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-brand-text-muted">
                        <span>{c.phone}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Gift className="h-3 w-3" />
                          {c.points.toLocaleString('vi-VN')} điểm tích luỹ
                        </span>
                        <span>•</span>
                        <span>{c.visits} lần ghé</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    onClick={() => selectCustomer(c)}
                  >
                    Chọn
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
