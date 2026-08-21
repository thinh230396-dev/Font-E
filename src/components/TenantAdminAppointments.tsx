import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Filter,
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
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { formatMoney as formatCurrency } from '../utils/money';
import { Button, DataTable, Field, Modal, StatusBadge, getStatusDefinition, PageHeader } from './ui';
import type { DataTableColumn } from './ui';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';
type BranchCode = 'Q1' | 'Q3';
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
  createdAt: string;
}

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
  } | null;
  onBookingRequestHandled?: () => void;
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

const appointmentSeed: TenantAppointment[] = [
  { id: 'APT-1040', customer: 'Đặng Hải Yến', phone: '0903 114 668', date: '2026-07-16', start: '08:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'COMPLETED', price: 380_000, deposit: 0, note: 'Da tay nhạy cảm, ưu tiên sản phẩm không mùi.', station: 'Bàn M-04', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt: '15/07/2026 · 18:42' },
  { id: 'APT-1041', customer: 'Nguyễn Lan Anh', phone: '0988 226 510', date: '2026-07-16', start: '08:15', duration: 90, service: 'Pedicure spa chuyên sâu', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'RECEPTION', status: 'COMPLETED', price: 650_000, deposit: 200_000, note: 'Không dùng sản phẩm tẩy tế bào chết có bạc hà.', station: 'Ghế P-02', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt: '14/07/2026 · 10:20' },
  { id: 'APT-1042', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: '2026-07-16', start: '10:00', duration: 120, service: 'Nail Art Premium', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'IN_SERVICE', price: 1_200_000, deposit: 500_000, note: 'Mẫu chrome bạc, khách đã gửi ảnh tham khảo qua Zalo.', station: 'Bàn VIP-01', reminderSent: true, createdBy: 'Website booking', createdAt: '13/07/2026 · 21:05' },
  { id: 'APT-1043', customer: 'Trần Thu Hà', phone: '0908 337 912', date: '2026-07-16', start: '10:15', duration: 75, service: 'Combo manicure & sơn gel', staff: 'Minh Khang', branch: 'Q3', source: 'ZALO', status: 'CHECKED_IN', price: 480_000, deposit: 100_000, note: 'Giữ form móng oval ngắn, tông nude công sở.', station: 'Bàn M-02', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt: '15/07/2026 · 09:12' },
  { id: 'APT-1044', customer: 'Lê Ngọc Mai', phone: '0936 221 557', date: '2026-07-16', start: '11:30', duration: 90, service: 'Pedicure spa chuyên sâu', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 650_000, deposit: 200_000, note: 'Khách lần đầu, cần tư vấn tình trạng móng trước khi làm.', station: 'Ghế P-03', reminderSent: true, createdBy: 'Website booking', firstVisit: true, createdAt: '15/07/2026 · 22:18' },
  { id: 'APT-1045', customer: 'Phạm Hoài Nam', phone: '0977 660 341', date: '2026-07-16', start: '13:45', duration: 45, service: 'Tháo gel & dưỡng móng', staff: 'Quốc Bảo', branch: 'Q3', source: 'PHONE', status: 'PENDING', price: 220_000, deposit: 0, note: 'Gọi lại xác nhận trước 12:00.', station: 'Ghế P-01', reminderSent: false, createdBy: 'Owner', firstVisit: true, createdAt: '16/07/2026 · 08:04' },
  { id: 'APT-1046', customer: 'Vũ Khánh Linh', phone: '0909 552 770', date: '2026-07-16', start: '15:00', duration: 150, service: 'Đắp gel nối móng', staff: 'Minh Khang', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_350_000, deposit: 500_000, note: 'Form almond dài vừa, phối french ombre.', station: 'Bàn VIP-02', reminderSent: true, createdBy: 'Website booking', createdAt: '15/07/2026 · 15:36' },
  { id: 'APT-1047', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', date: '2026-07-16', start: '16:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'ZALO', status: 'PENDING', price: 380_000, deposit: 0, note: 'Khách dùng voucher sinh nhật.', station: 'Bàn M-04', reminderSent: false, createdBy: 'Lễ tân Mai', createdAt: '16/07/2026 · 09:31' },
  { id: 'APT-1048', customer: 'Đỗ Tuấn Kiệt', phone: '0918 734 662', date: '2026-07-16', start: '16:30', duration: 45, service: 'Tháo gel & dưỡng móng', staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'CONFIRMED', price: 220_000, deposit: 0, note: '', station: 'Ghế P-01', reminderSent: true, createdBy: 'Lễ tân Mai', createdAt: '16/07/2026 · 10:02' },
  { id: 'APT-1049', customer: 'Trương Bảo Ngọc', phone: '0902 778 219', date: '2026-07-16', start: '09:00', duration: 60, service: 'Dặm gel & sửa form', staff: 'Hà My', branch: 'Q1', source: 'PHONE', status: 'COMPLETED', price: 450_000, deposit: 200_000, note: 'Mã màu cũ đã lưu trong hồ sơ khách.', station: 'Bàn M-01', reminderSent: true, createdBy: 'Quản lý Q1', createdAt: '14/07/2026 · 13:16' },
  { id: 'APT-1050', customer: 'Ngô Minh Châu', phone: '0966 124 700', date: '2026-07-16', start: '13:00', duration: 120, service: 'Nail Art Premium', staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'CONFIRMED', price: 1_200_000, deposit: 500_000, note: 'Khách mới, kiểm tra tiền sử dị ứng gel và keo.', station: 'Bàn VIP-01', reminderSent: true, createdBy: 'Website booking', firstVisit: true, createdAt: '15/07/2026 · 20:11' },
  { id: 'APT-1051', customer: 'Mai Đức Anh', phone: '0901 533 008', date: '2026-07-16', start: '15:30', duration: 75, service: 'Combo manicure & sơn gel', staff: 'Gia Huy', branch: 'Q1', source: 'ZALO', status: 'PENDING', price: 480_000, deposit: 0, note: '', station: 'Bàn M-03', reminderSent: false, createdBy: 'Quản lý Q1', createdAt: '16/07/2026 · 07:55' },
  { id: 'APT-1052', customer: 'Tạ Mỹ Duyên', phone: '0933 112 800', date: '2026-07-15', start: '14:00', duration: 150, service: 'Đắp gel nối móng', staff: 'Minh Khang', branch: 'Q3', source: 'ONLINE', status: 'COMPLETED', price: 1_350_000, deposit: 500_000, note: '', station: 'Bàn VIP-02', reminderSent: true, createdBy: 'Website booking', createdAt: '13/07/2026 · 11:42' },
  { id: 'APT-1053', customer: 'Huỳnh Phương Thảo', phone: '0905 811 229', date: '2026-07-17', start: '09:30', duration: 120, service: 'Nail Art Premium', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_200_000, deposit: 500_000, note: 'Khách cần hoàn tất trước 12:00.', station: 'Bàn VIP-01', reminderSent: true, createdBy: 'Website booking', createdAt: '15/07/2026 · 16:30' },
  { id: 'APT-1054', customer: 'Phan Gia Hân', phone: '0974 360 118', date: '2026-07-17', start: '13:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'PENDING', price: 380_000, deposit: 0, note: '', station: 'Bàn M-04', reminderSent: false, createdBy: 'Owner', createdAt: '16/07/2026 · 10:18' }
];

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
  start: '09:00',
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
  onBookingRequestHandled
}: TenantAdminAppointmentsProps) {
  const storageKey = `tenant-admin-appointments-v2:${tenantName}`;
  const todayDate = toIsoDate(new Date());
  const [appointments, setAppointments] = useState<TenantAppointment[]>(() => {
    if (typeof window === 'undefined') return getTenantAdminInitialData(null, appointmentSeed);
    try {
      const stored = window.localStorage.getItem(storageKey);
      return getTenantAdminInitialData(stored ? JSON.parse(stored) as TenantAppointment[] : null, appointmentSeed);
    } catch {
      return getTenantAdminInitialData(null, appointmentSeed);
    }
  });
  const initialDate = getInitialScheduleDate(appointments, selectedBranch, todayDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
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
  const [form, setForm] = useState<AppointmentFormState>(() => emptyForm(initialDate, selectedBranch));
  const [formError, setFormError] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationNote, setCancellationNote] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const canManage = accessMode === 'full' && !readOnlyReason;
  const isReceptionist = roleLabel.toLowerCase().startsWith('receptionist');
  const now = new Date();
  const currentTimeLabel = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const currentMinuteOfDay = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(appointments));
  }, [appointments, storageKey]);

  useEffect(() => {
    if (!bookingRequest) return;
    const preferredStaff = staffDirectory.find((staff) => staff.branch === bookingRequest.branch && staff.name === bookingRequest.favoriteTechnician)?.name;
    const safetyNotes = [
      bookingRequest.note,
      bookingRequest.allergies && bookingRequest.allergies !== 'Không ghi nhận' ? `Dị ứng: ${bookingRequest.allergies}` : '',
      bookingRequest.nailCondition ? `Tình trạng móng: ${bookingRequest.nailCondition}` : ''
    ].filter(Boolean).join('\n');
    const nextForm = emptyForm(selectedDate, bookingRequest.branch);
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
    appointment.date === selectedDate && (selectedBranch === 'ALL' || appointment.branch === selectedBranch)
  )), [appointments, selectedBranch, selectedDate]);

  useEffect(() => {
    if (didAutoLocateSchedule) return;
    if (scopedAppointments.length) {
      setDidAutoLocateSchedule(true);
      return;
    }
    const nearestDate = getInitialScheduleDate(appointments, selectedBranch, selectedDate);
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
    const directoryStaff = staffDirectory.filter((staff) => selectedBranch === 'ALL' || staff.branch === selectedBranch);
    const knownNames = new Set(directoryStaff.map((staff) => staff.name));
    const appointmentStaff = scopedAppointments.reduce<typeof staffDirectory>((result, appointment) => {
      if (knownNames.has(appointment.staff) || result.some((staff) => staff.name === appointment.staff)) return result;
      const initials = appointment.staff.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join('');
      result.push({ name: appointment.staff, branch: appointment.branch, initials: initials || 'NV', role: 'Kỹ thuật viên', shift: '08:00–20:00' });
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
      .filter((staff) => !query || `${staff.name} ${staff.role} ${branchLabels[staff.branch]}`.toLowerCase().includes(query));
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
  const availableStaffCount = staffDirectory.filter((staff) => selectedBranch === 'ALL' || staff.branch === selectedBranch).length;
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
    (['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const)
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
    .map((name) => services.find((service) => service.name === name))
    .filter((service): service is (typeof services)[number] => Boolean(service));
  const selectedServiceDuration = selectedServiceDetails.reduce((sum, service) => sum + service.duration, 0);
  const selectedServicePrice = selectedServiceDetails.reduce((sum, service) => sum + service.price, 0);
  const selectedServiceEnd = isValid24HourTime(form.start) && selectedServiceDuration ? getEndTime(form.start, selectedServiceDuration) : '--:--';
  const canEditSelectedAppointment = Boolean(selectedAppointment) && canManage && (
    !isReceptionist || ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(selectedAppointment!.status)
  );

  const updateAppointment = (id: string, patch: Partial<TenantAppointment>) => {
    if (!requireManageAccess()) return;
    setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, ...patch } : appointment));
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
    setForm(emptyForm(selectedDate, selectedBranch));
    setFormError('');
    setFormMode('CREATE');
  };

  const openEditForm = (appointment: TenantAppointment) => {
    if (!requireManageAccess()) return;
    if (isReceptionist && !['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(appointment.status)) {
      onNotify?.('Receptionist chỉ được sửa lịch trước khi dịch vụ bắt đầu.');
      return;
    }
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
      station: appointment.station || stationDirectory[appointment.branch][0],
      note: appointment.note
    });
    setFormError('');
    setFormMode('EDIT');
  };

  const openCancelForm = () => {
    if (!selectedAppointment || !requireManageAccess()) return;
    setCancellationReason('');
    setCancellationNote('');
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

    const cancelledAt = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    updateAppointment(selectedAppointment.id, {
      status: 'CANCELLED',
      cancellationReason,
      cancellationNote: cancellationNote.trim(),
      cancelledAt,
      cancelledBy: roleLabel
    });
    setShowCancelForm(false);
    onNotify?.(`Đã hủy lịch ${selectedAppointment.id} và lưu lý do vào lịch sử.`);
  };

  const submitAppointment = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManageAccess()) return;
    if (!form.customer.trim() || !form.phone.trim() || !form.date || !form.start || !form.services.length || !form.staff) {
      setFormError('Vui lòng nhập đầy đủ khách hàng, số điện thoại, ít nhất một dịch vụ, nhân viên và thời gian.');
      return;
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(form.phone.trim()) || phoneDigits.length < 9) {
      setFormError('Số điện thoại chưa đúng định dạng Việt Nam.');
      return;
    }
    if (!isValid24HourTime(form.start)) {
      setFormError('Giờ bắt đầu phải theo định dạng 24 giờ HH:mm, ví dụ 00:00 hoặc 14:30.');
      return;
    }

    const chosenServices = form.services
      .map((name) => services.find((service) => service.name === name))
      .filter((service): service is (typeof services)[number] => Boolean(service));
    if (!chosenServices.length || chosenServices.length !== form.services.length) {
      setFormError('Danh sách dịch vụ có mục không còn trong bảng giá. Vui lòng chọn lại dịch vụ.');
      return;
    }
    const totalDuration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
    const totalPrice = chosenServices.reduce((sum, service) => sum + service.price, 0);
    const existingId = formMode === 'EDIT' ? selectedAppointment?.id : undefined;
    const startMinute = minutesFromStart(form.start);
    const endMinute = startMinute + totalDuration;
    if (startMinute < 8 * 60 || endMinute > 20 * 60) {
      setFormError('Lịch hẹn phải nằm trong giờ hoạt động 08:00–20:00, bao gồm toàn bộ thời lượng dịch vụ.');
      return;
    }
    const assignedStaff = staffDirectory.find((staff) => staff.name === form.staff && staff.branch === form.branch);
    if (!assignedStaff) {
      setFormError('Kỹ thuật viên không thuộc chi nhánh đã chọn.');
      return;
    }
    if (!stationDirectory[form.branch].includes(form.station)) {
      setFormError('Ghế hoặc phòng không thuộc chi nhánh đã chọn.');
      return;
    }
    const duplicateCustomerAppointment = appointments.find((appointment) => (
      appointment.id !== existingId
      && appointment.date === form.date
      && appointment.branch === form.branch
      && appointment.phone.replace(/\D/g, '') === phoneDigits
      && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(appointment.status)
    ));
    if (duplicateCustomerAppointment) {
      setFormError(`Số điện thoại này đã có lịch ${duplicateCustomerAppointment.id} lúc ${duplicateCustomerAppointment.start}. Vui lòng kiểm tra trước khi tạo lịch mới.`);
      return;
    }
    const conflictingAppointment = appointments.find((appointment) => {
      if (appointment.id === existingId || appointment.date !== form.date || appointment.branch !== form.branch || ['CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
      const existingStart = minutesFromStart(appointment.start);
      const overlaps = startMinute < existingStart + appointment.duration && endMinute > existingStart;
      return overlaps && (appointment.staff === form.staff || Boolean(form.station && appointment.station === form.station));
    });
    if (conflictingAppointment) {
      setFormError(`${conflictingAppointment.staff === form.staff ? 'Kỹ thuật viên' : 'Bàn/ghế'} đang bận với lịch ${conflictingAppointment.id} từ ${conflictingAppointment.start} đến ${getEndTime(conflictingAppointment.start, conflictingAppointment.duration)}.`);
      return;
    }
    const depositValue = Number(form.deposit);
    if (!Number.isFinite(depositValue) || depositValue < 0) {
      setFormError('Tiền đặt cọc không hợp lệ.');
      return;
    }
    if (depositValue > totalPrice) {
      setFormError('Tiền đặt cọc không được lớn hơn tổng giá dịch vụ dự kiến.');
      return;
    }
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

    if (formMode === 'EDIT') {
      setAppointments((current) => current.map((appointment) => appointment.id === payload.id ? payload : appointment));
    } else {
      setAppointments((current) => [...current, payload]);
      setSelectedDate(payload.date);
    }
    setSelectedAppointment(payload);
    setFormMode(null);
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
          <p className="mt-0.5 text-caption text-brand-text-muted">{branchLabels[appointment.branch]}</p>
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
      {/* Đây là màn hình duy nhất của Tenant Admin không có <h1>, nên trình đọc
          màn hình không đọc được tên trang và nó cũng là trang duy nhất lệch
          khuôn đầu trang. Ở shell Lễ tân thì không thêm: tên trang đã nằm trên
          topbar của shell đó, và bàn lễ tân cần trọn chiều cao cho lịch. */}
      {!isReceptionist && (
        <PageHeader
          title="Lịch hẹn"
        />
      )}
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
            <BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} disabled={branchLocked} aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'} className={`${controlClass} w-auto sm:w-44`}>
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
              appointment.date === date && (selectedBranch === 'ALL' || appointment.branch === selectedBranch)
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
                          {selectedBranch === 'ALL' && (
                            <span className="shrink-0 rounded-pill bg-brand-surface-high px-1.5 text-caption text-brand-text-muted">{staff.branch}</span>
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
            <span className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{selectedBranch === 'ALL' ? '2 chi nhánh' : branchLabels[selectedBranch as BranchCode]}</span>
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
            {!['COMPLETED', 'CANCELLED', 'NO_SHOW', ...(isReceptionist ? ['IN_SERVICE' as AppointmentStatus] : [])].includes(selectedAppointment.status) && (
              <Button variant="ghost" onClick={openCancelForm} disabled={!canManage} className="mr-auto">
                Hủy lịch hẹn
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
                      {selectedAppointment.duration} phút · {branchLabels[selectedAppointment.branch]}
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
                    <p className="truncate text-card-title text-brand-text">{selectedAppointment.customer}</p>
                    <p className="mt-0.5 text-body text-brand-text-muted">
                      {selectedAppointment.firstVisit ? 'Khách lần đầu sử dụng dịch vụ' : 'Khách đã có hồ sơ tại salon'}
                    </p>
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
                    {staffDirectory.find((staff) => staff.name === selectedAppointment.staff)?.role || 'Kỹ thuật viên'}
                  </p>
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
                    {selectedAppointment.cancelledAt && (
                      <span className="text-caption tabular-nums text-brand-text-muted">{selectedAppointment.cancelledAt}</span>
                    )}
                  </div>
                  <p className="mt-2 text-body font-semibold text-brand-text">
                    {selectedAppointment.cancellationReason || 'Chưa ghi nhận lý do'}
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

              <section className="rounded-card border border-brand-outline p-4">
                <h3 className="text-body font-semibold text-brand-text">Tiến trình phục vụ</h3>
                <ol className="mt-3 flex gap-2">
                  {(['CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'] as AppointmentStatus[]).map((status, index) => {
                    const order: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'];
                    const isReached = order.indexOf(selectedAppointment.status) >= order.indexOf(status);
                    return (
                      <li key={status} className="min-w-0 flex-1">
                        <div aria-hidden="true" className={`h-2 rounded-pill ${isReached ? 'bg-[var(--accent)]' : 'bg-brand-surface-high'}`} />
                        <p className={`mt-2 truncate text-center text-caption font-semibold ${isReached ? 'text-[color:var(--accent-strong)]' : 'text-brand-text-muted'}`}>
                          {index === 0 ? 'Xác nhận' : index === 1 ? 'Đã đến' : index === 2 ? 'Phục vụ' : 'Hoàn thành'}
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

      {/* Hủy lịch hẹn */}
      <Modal
        open={showCancelForm && Boolean(selectedAppointment)}
        onClose={() => setShowCancelForm(false)}
        size="medium"
        closeOnBackdrop={false}
        icon={<CircleAlert aria-hidden="true" />}
        title="Hủy lịch hẹn"
        description="Lý do và ghi chú sẽ được lưu trong lịch sử lịch hẹn."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowCancelForm(false)}>Quay lại</Button>
            <Button
              variant="danger"
              type="submit"
              form="tenant-appointment-cancel-form"
              disabled={!cancellationReason}
              iconLeading={<X />}
            >
              Xác nhận hủy lịch
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
            <legend className="mb-3 flex items-center gap-2 text-card-title text-brand-text">
              <UserRound aria-hidden="true" className="h-5 w-5 text-brand-text-muted" />Thông tin khách hàng
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng" required>
                <input
                  type="text"
                  value={form.customer}
                  onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                />
              </Field>
              <Field label="Số điện thoại" required helper="Định dạng Việt Nam, ví dụ 0912 884 206.">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="09xx xxx xxx"
                />
              </Field>
            </div>
            {form.customerId && (
              <p className="mt-3 flex items-center gap-2 p-3 text-body text-brand-text ui-tone ui-tone--info">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                Đã liên kết hồ sơ khách hàng <strong>{form.customerId}</strong>
              </p>
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

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {services.map((service) => {
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
                    setForm((current) => ({ ...current, branch, staff: branch === 'Q1' ? 'Hà My' : 'Thảo Nguyễn', station: stationDirectory[branch][0] }));
                  }}
                  className="w-full"
                >
                  <option value="Q3">Chi nhánh Quận 3</option>
                  <option value="Q1">Chi nhánh Quận 1</option>
                </BeautifulSelect>
              </Field>

              <Field label="Kỹ thuật viên phụ trách" required>
                <BeautifulSelect
                  value={form.staff}
                  onChange={(event) => setForm((current) => ({ ...current, staff: event.target.value }))}
                  className="w-full"
                >
                  {staffDirectory.filter((staff) => staff.branch === form.branch).map((staff) => (
                    <option key={staff.name} value={staff.name}>{staff.name} · {staff.role}</option>
                  ))}
                </BeautifulSelect>
              </Field>

              <Field label="Ghế / phòng phục vụ" required>
                <BeautifulSelect
                  value={form.station}
                  onChange={(event) => setForm((current) => ({ ...current, station: event.target.value }))}
                  className="w-full"
                >
                  {stationDirectory[form.branch].map((station) => <option key={station} value={station}>{station}</option>)}
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
              <Field label="Ngày" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
              </Field>

              <Field label="Giờ bắt đầu" required helper="Định dạng 24 giờ, ví dụ 00:00 hoặc 14:30.">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                  placeholder="HH:mm"
                  value={form.start}
                  onChange={(event) => setForm((current) => ({ ...current, start: format24HourInput(event.target.value) }))}
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
              <Field label="Tiền đặt cọc" helper="Không được lớn hơn tổng giá dịch vụ dự kiến.">
                <input
                  type="number"
                  min="0"
                  max={selectedServicePrice || undefined}
                  step="10000"
                  value={form.deposit}
                  onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))}
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
    </div>
  );
}
