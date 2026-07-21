import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
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

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';
type BranchCode = 'Q1' | 'Q3';
type ViewMode = 'SCHEDULE' | 'LIST';

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

const statusMeta: Record<AppointmentStatus, { label: string; shortLabel: string; symbol: string; badge: string; card: string; dot: string }> = {
  PENDING: { label: 'Chờ xác nhận', shortLabel: 'Chờ', symbol: '!', badge: 'bg-amber-50 text-amber-700 ring-amber-200', card: 'border-amber-300 bg-amber-50/95 text-amber-950', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Đã xác nhận', shortLabel: 'Xác nhận', symbol: '✓', badge: 'bg-blue-50 text-blue-700 ring-blue-200', card: 'border-blue-300 bg-blue-50/95 text-blue-950', dot: 'bg-blue-500' },
  CHECKED_IN: { label: 'Đã đến', shortLabel: 'Đã đến', symbol: '↳', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', card: 'border-cyan-300 bg-cyan-50/95 text-cyan-950', dot: 'bg-cyan-500' },
  IN_SERVICE: { label: 'Đang phục vụ', shortLabel: 'Phục vụ', symbol: '●', badge: 'bg-violet-50 text-violet-700 ring-violet-200', card: 'border-violet-300 bg-violet-50/95 text-violet-950', dot: 'bg-violet-500' },
  COMPLETED: { label: 'Hoàn thành', shortLabel: 'Xong', symbol: '✓', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', card: 'border-emerald-300 bg-emerald-50/95 text-emerald-950', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Đã hủy', shortLabel: 'Đã hủy', symbol: '×', badge: 'bg-rose-50 text-rose-700 ring-rose-200', card: 'border-rose-300 bg-rose-50/90 text-rose-950', dot: 'bg-rose-500' },
  NO_SHOW: { label: 'Không đến', shortLabel: 'Vắng', symbol: '—', badge: 'bg-slate-100 text-slate-600 ring-slate-200', card: 'border-slate-300 bg-slate-100/95 text-slate-700', dot: 'bg-slate-500' }
};

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
  { name: 'Combo manicure & sơn gel', duration: 75, price: 480_000 },
  { name: 'Pedicure spa chuyên sâu', duration: 90, price: 650_000 },
  { name: 'Nail Art Premium', duration: 120, price: 1_200_000 },
  { name: 'Tháo gel & dưỡng móng', duration: 45, price: 220_000 },
  { name: 'Đắp gel nối móng', duration: 150, price: 1_350_000 },
  { name: 'Sơn gel Hàn Quốc', duration: 60, price: 380_000 },
  { name: 'Dặm gel & sửa form', duration: 60, price: 450_000 }
];

const staffDirectory = [
  { name: 'Thảo Nguyễn', branch: 'Q3' as BranchCode, initials: 'TN', role: 'Nail Artist Senior', shift: '08:00–18:00' },
  { name: 'Minh Khang', branch: 'Q3' as BranchCode, initials: 'MK', role: 'Nail Technician', shift: '09:00–20:00' },
  { name: 'Quốc Bảo', branch: 'Q3' as BranchCode, initials: 'QB', role: 'Pedicure Specialist', shift: '08:00–17:00' },
  { name: 'Thuỳ Dương', branch: 'Q3' as BranchCode, initials: 'TD', role: 'Nail Technician', shift: '10:00–20:00' },
  { name: 'Hà My', branch: 'Q1' as BranchCode, initials: 'HM', role: 'Nail Artist Senior', shift: '08:00–18:00' },
  { name: 'Gia Huy', branch: 'Q1' as BranchCode, initials: 'GH', role: 'Nail Technician', shift: '09:00–20:00' }
];

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

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
// Keep the full 08:00–20:00 operating day visible without a nested vertical scroll.
// Appointment details remain available in the detail dialog after selecting a card.
const SCHEDULE_HOUR_HEIGHT = 44;
const SCHEDULE_BOTTOM_GUTTER = 22;
const STAFF_COLUMNS_PER_PAGE = 6;

const toDate = (date: string) => new Date(`${date}T00:00:00`);

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const formatSelectedDate = (date: string) => toDate(date).toLocaleDateString('vi-VN', {
  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
});

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
  station: branch === 'Q1' ? 'Bàn M-01' : 'Bàn M-02',
  note: ''
});

export default function TenantAdminAppointments({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Nailé Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason = '',
  onNotify,
  bookingRequest,
  onBookingRequestHandled
}: TenantAdminAppointmentsProps) {
  const storageKey = `tenant-admin-appointments-v2:${tenantName}`;
  const [appointments, setAppointments] = useState<TenantAppointment[]>(() => {
    if (typeof window === 'undefined') return appointmentSeed;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) as TenantAppointment[] : appointmentSeed;
    } catch {
      return appointmentSeed;
    }
  });
  const [selectedDate, setSelectedDate] = useState('2026-07-16');
  const [viewMode, setViewMode] = useState<ViewMode>('SCHEDULE');
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffPage, setStaffPage] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | AppointmentSource>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<TenantAppointment | null>(null);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => emptyForm('2026-07-16', selectedBranch));
  const [formError, setFormError] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationNote, setCancellationNote] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const canManage = accessMode === 'full' && !readOnlyReason;

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

  useEffect(() => {
    if (!selectedAppointment && !formMode && !isScheduleExpanded && !showCancelForm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showCancelForm) setShowCancelForm(false);
      else if (formMode) setFormMode(null);
      else if (selectedAppointment) setSelectedAppointment(null);
      else setIsScheduleExpanded(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [formMode, isScheduleExpanded, selectedAppointment, showCancelForm]);

  const requireManageAccess = () => {
    if (canManage) return true;
    onNotify?.(readOnlyReason || 'Gói hiện tại chỉ cho phép xem lịch hẹn. Vui lòng nâng cấp để thay đổi dữ liệu.');
    return false;
  };

  const scopedAppointments = useMemo(() => appointments.filter((appointment) => (
    appointment.date === selectedDate && (selectedBranch === 'ALL' || appointment.branch === selectedBranch)
  )), [appointments, selectedBranch, selectedDate]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedAppointments
      .filter((appointment) => statusFilter === 'ALL' || appointment.status === statusFilter)
      .filter((appointment) => staffFilter === 'ALL' || appointment.staff === staffFilter)
      .filter((appointment) => sourceFilter === 'ALL' || appointment.source === sourceFilter)
      .filter((appointment) => !query || `${appointment.id} ${appointment.customer} ${appointment.phone} ${appointment.service} ${appointment.staff}`.toLowerCase().includes(query))
      .sort((first, second) => first.start.localeCompare(second.start));
  }, [scopedAppointments, searchQuery, sourceFilter, staffFilter, statusFilter]);

  const scheduleStaff = useMemo(() => staffDirectory.filter((staff) => (
    (selectedBranch === 'ALL' || staff.branch === selectedBranch) &&
    (staffFilter === 'ALL' || staff.name === staffFilter)
  )), [selectedBranch, staffFilter]);

  const filteredScheduleStaff = useMemo(() => {
    const query = staffSearchQuery.trim().toLowerCase();
    if (!query) return scheduleStaff;
    return scheduleStaff.filter((staff) => `${staff.name} ${staff.role} ${branchLabels[staff.branch]}`.toLowerCase().includes(query));
  }, [scheduleStaff, staffSearchQuery]);

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
  const totalRevenue = scopedAppointments
    .filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status))
    .reduce((sum, appointment) => sum + appointment.price, 0);
  const completedCount = scopedAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
  const pendingCount = scopedAppointments.filter((appointment) => appointment.status === 'PENDING').length;
  const servingCount = scopedAppointments.filter((appointment) => ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status)).length;
  const activeFilterCount = [statusFilter !== 'ALL', staffFilter !== 'ALL', sourceFilter !== 'ALL'].filter(Boolean).length;
  const scheduleHourHeight = isScheduleExpanded && typeof window !== 'undefined'
    ? Math.max(42, Math.floor((window.innerHeight - 260) / 12))
    : SCHEDULE_HOUR_HEIGHT;
  const selectedServiceDetails = form.services
    .map((name) => services.find((service) => service.name === name))
    .filter((service): service is (typeof services)[number] => Boolean(service));
  const selectedServiceDuration = selectedServiceDetails.reduce((sum, service) => sum + service.duration, 0);
  const selectedServicePrice = selectedServiceDetails.reduce((sum, service) => sum + service.price, 0);
  const selectedServiceEnd = form.start && selectedServiceDuration ? getEndTime(form.start, selectedServiceDuration) : '--:--';

  const updateAppointment = (id: string, patch: Partial<TenantAppointment>) => {
    if (!requireManageAccess()) return;
    setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, ...patch } : appointment));
    setSelectedAppointment((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const openCreateForm = () => {
    if (!requireManageAccess()) return;
    setForm(emptyForm(selectedDate, selectedBranch));
    setFormError('');
    setFormMode('CREATE');
  };

  const openEditForm = (appointment: TenantAppointment) => {
    if (!requireManageAccess()) return;
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
      station: appointment.station || 'Bàn M-01',
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

    const chosenServices = form.services
      .map((name) => services.find((service) => service.name === name))
      .filter((service): service is (typeof services)[number] => Boolean(service));
    const totalDuration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
    const totalPrice = chosenServices.reduce((sum, service) => sum + service.price, 0);
    const existingId = formMode === 'EDIT' ? selectedAppointment?.id : undefined;
    const startMinute = minutesFromStart(form.start);
    const endMinute = startMinute + totalDuration;
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
    if ((Number(form.deposit) || 0) > totalPrice) {
      setFormError('Tiền đặt cọc không được lớn hơn tổng giá dịch vụ dự kiến.');
      return;
    }
    const nextId = existingId || `APT-${Math.max(...appointments.map((appointment) => Number(appointment.id.replace('APT-', '')))) + 1}`;
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
      deposit: Math.max(0, Number(form.deposit) || 0),
      station: form.station,
      reminderSent: form.status !== 'PENDING',
      createdBy: formMode === 'EDIT' && selectedAppointment ? selectedAppointment.createdBy : roleLabel,
      note: form.note.trim(),
      createdAt: formMode === 'EDIT' && selectedAppointment ? selectedAppointment.createdAt : '16/07/2026 · vừa xong'
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
    setStatusFilter('ALL');
    setStaffFilter('ALL');
    setStaffSearchQuery('');
    setSourceFilter('ALL');
    onSearchQueryChange('');
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đồng bộ lúc 14:32 · Dữ liệu theo thời gian thực<span className="text-slate-300">•</span><span className="text-slate-500">{tenantName}</span></div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Lịch hẹn</h1>
          <p className="mt-2 text-[11px] text-slate-500">Điều phối khách, kỹ thuật viên, bàn nail và toàn bộ hành trình phục vụ theo thời gian thực.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} aria-label="Chọn chi nhánh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-48">
            <option value="Q3">Chi nhánh Quận 3</option>
            <option value="Q1">Chi nhánh Quận 1</option>
            <option value="ALL">Tất cả chi nhánh</option>
          </BeautifulSelect>
          <button type="button" onClick={openCreateForm} disabled={!canManage} title={!canManage ? readOnlyReason || 'Bạn chỉ có quyền xem' : undefined} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[11px] font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
        </div>
      </section>

      <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? 'border-violet-100 bg-gradient-to-r from-violet-50 to-white' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4.5 w-4.5" /></span><div><p className="text-[10px] font-black text-slate-800">Phạm vi quyền: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{canManage ? 'Toàn quyền tạo, phân công, đổi trạng thái, thu cọc và hủy lịch trong tenant. Mọi thay đổi được lưu theo tenant.' : readOnlyReason || 'Chỉ được xem dữ liệu lịch hẹn theo quyền của gói hiện tại.'}</p></div></div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{canManage ? 'Có quyền chỉnh sửa' : 'Chỉ xem'}</span>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tổng lịch hẹn', value: scopedAppointments.length, detail: `${completedCount} đã hoàn thành`, icon: CalendarCheck2, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Chờ xác nhận', value: pendingCount, detail: pendingCount ? 'Cần liên hệ trong 15 phút' : 'Đã xử lý hết', icon: CircleAlert, tone: 'bg-amber-50 text-amber-600' },
          { label: 'Đang tại salon', value: servingCount, detail: `${scopedAppointments.filter((item) => item.status === 'IN_SERVICE').length} khách đang làm dịch vụ`, icon: UsersRound, tone: 'bg-violet-50 text-violet-600' },
          { label: 'Doanh thu dự kiến', value: formatCurrency(totalRevenue), detail: `${formatCurrency(scopedAppointments.reduce((sum, item) => sum + item.deposit, 0))} đã đặt cọc`, icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-600' }
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div>
            <p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className={`isolate overflow-hidden border border-slate-200 bg-white ${isScheduleExpanded ? 'fixed inset-3 z-[60] flex flex-col rounded-3xl shadow-2xl' : 'rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.04)]'}`}>
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -1))} aria-label="Ngày trước" className="flex h-9 w-9 items-center justify-center border-0 bg-transparent p-0 text-slate-500 shadow-none hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setSelectedDate('2026-07-16')} className="h-9 border-0 bg-white px-3 text-[9px] font-black text-slate-700 shadow-sm">Hôm nay</button>
            <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Ngày sau" className="flex h-9 w-9 items-center justify-center border-0 bg-transparent p-0 text-slate-500 shadow-none hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
            <span className="ml-2 hidden text-[10px] font-black capitalize text-slate-800 sm:block">{formatSelectedDate(selectedDate)}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm mã lịch, khách, SĐT, dịch vụ..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
              {searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <button type="button" onClick={() => setShowFilters((value) => !value)} className={`flex h-10 items-center justify-center gap-2 border px-3 text-[9px] font-bold shadow-sm ${showFilters || activeFilterCount ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}><Filter className="h-3.5 w-3.5" />Bộ lọc{activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[8px] text-white">{activeFilterCount}</span>}</button>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
              <button type="button" onClick={() => setViewMode('SCHEDULE')} aria-label="Xem lịch ngày" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'SCHEDULE' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setViewMode('LIST')} aria-label="Xem danh sách" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'LIST' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutList className="h-3.5 w-3.5" /></button>
            </div>
            {viewMode === 'SCHEDULE' && <button type="button" onClick={() => { setIsScheduleExpanded((value) => !value); setShowFilters(false); }} className={`flex h-10 items-center justify-center gap-2 border px-3 text-[9px] font-black shadow-sm ${isScheduleExpanded ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}>{isScheduleExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}{isScheduleExpanded ? 'Thu nhỏ' : 'Vừa màn hình'}</button>}
          </div>
        </div>

        <div className={`${isScheduleExpanded ? 'hidden' : 'grid'} grid-cols-7 border-b border-slate-100 bg-slate-50/70 px-2 sm:px-4`}>
          {weekDates.map((date) => {
            const dayAppointments = appointments.filter((appointment) => appointment.date === date && (selectedBranch === 'ALL' || appointment.branch === selectedBranch));
            const isSelected = date === selectedDate;
            const isToday = date === '2026-07-16';
            return (
              <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`relative flex h-auto min-h-16 flex-col items-center justify-center rounded-none border-0 bg-transparent px-1 py-2 shadow-none ${isSelected ? 'text-violet-700' : 'text-slate-500 hover:bg-white'}`}>
                <span className="text-[8px] font-bold uppercase">{toDate(date).toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                <span className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${isSelected ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-transparent text-slate-700'}`}>{toDate(date).getDate()}</span>
                <span className="mt-1 text-[7px] font-semibold text-slate-400">{dayAppointments.length} lịch</span>
                {isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-violet-500" />}
              </button>
            );
          })}
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-slate-100 bg-violet-50/40 p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <label><span className="mb-1.5 block text-[8px] font-black uppercase tracking-wide text-slate-500">Trạng thái</span><BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | AppointmentStatus)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label>
            <label><span className="mb-1.5 block text-[8px] font-black uppercase tracking-wide text-slate-500">Nhân viên</span><BeautifulSelect value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả nhân viên</option>{staffDirectory.filter((staff) => selectedBranch === 'ALL' || staff.branch === selectedBranch).map((staff) => <option key={staff.name} value={staff.name}>{staff.name}</option>)}</BeautifulSelect></label>
            <label><span className="mb-1.5 block text-[8px] font-black uppercase tracking-wide text-slate-500">Nguồn đặt lịch</span><BeautifulSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'ALL' | AppointmentSource)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả nguồn</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></label>
            <button type="button" onClick={resetFilters} className="self-end border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-600 shadow-sm">Đặt lại</button>
          </div>
        )}

        <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 ${isScheduleExpanded ? 'py-2' : 'py-3'}`}>
          <span className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-wide text-slate-400"><SlidersHorizontal className="h-3.5 w-3.5" />Màu = trạng thái</span>
          <span className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400"><Clock3 className="h-3 w-3" />Chiều cao = thời lượng</span>
          {(['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const).map((status) => {
            const count = status === 'ALL' ? scopedAppointments.length : scopedAppointments.filter((appointment) => appointment.status === status).length;
            return <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-0 text-[8px] font-bold shadow-none ${statusFilter === status ? 'text-violet-700' : 'text-slate-500'}`}>{status !== 'ALL' && <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded text-[7px] font-black text-white ${statusMeta[status].dot}`}>{statusMeta[status].symbol}</span>}{status === 'ALL' ? 'Tất cả' : statusMeta[status].label}<span className={`rounded-full px-1.5 py-0.5 ${statusFilter === status ? 'bg-violet-100' : 'bg-slate-100'}`}>{count}</span></button>;
          })}
        </div>

        {viewMode === 'SCHEDULE' ? (
          <>
            <div className={`flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${isScheduleExpanded ? 'shrink-0' : ''}`}>
              <div className="relative w-full sm:max-w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input value={staffSearchQuery} onChange={(event) => setStaffSearchQuery(event.target.value)} aria-label="Tìm nhân viên trên lịch" placeholder="Tìm tên, vai trò, chi nhánh..." className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-[9px] font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                {staffSearchQuery && <button type="button" onClick={() => setStaffSearchQuery('')} aria-label="Xóa tìm kiếm nhân viên" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[8px] font-semibold text-slate-500">Đang xem <strong className="text-slate-800">{visibleStaffStart}–{visibleStaffEnd}</strong> / {filteredScheduleStaff.length} nhân viên</span>
                {staffPageCount > 1 && <BeautifulSelect value={String(staffPage)} onChange={(event) => setStaffPage(Number(event.target.value))} aria-label="Chọn nhóm nhân viên" className="h-8 min-w-28 rounded-lg border border-slate-200 bg-white px-2 text-[8px] font-bold text-slate-700">{Array.from({ length: staffPageCount }, (_, index) => { const start = index * STAFF_COLUMNS_PER_PAGE + 1; const end = Math.min((index + 1) * STAFF_COLUMNS_PER_PAGE, filteredScheduleStaff.length); return <option key={index} value={index}>Nhóm {index + 1} · {start}–{end}</option>; })}</BeautifulSelect>}
                <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <button type="button" onClick={() => setStaffPage((current) => Math.max(0, current - 1))} disabled={staffPage === 0} aria-label="Nhóm nhân viên trước" className="flex h-8 w-8 items-center justify-center rounded-none border-0 border-r border-slate-200 bg-white p-0 text-slate-600 shadow-none disabled:cursor-not-allowed disabled:text-slate-300"><ChevronLeft className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setStaffPage((current) => Math.min(staffPageCount - 1, current + 1))} disabled={staffPage >= staffPageCount - 1} aria-label="Nhóm nhân viên tiếp theo" className="flex h-8 w-8 items-center justify-center rounded-none border-0 bg-white p-0 text-slate-600 shadow-none disabled:cursor-not-allowed disabled:text-slate-300"><ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
            <div className={`relative bg-white ${isScheduleExpanded ? 'min-h-0 flex-1 overflow-hidden' : 'overflow-x-auto overflow-y-hidden'}`}>
            {visibleScheduleStaff.length ? <div className="h-full" style={{ minWidth: isScheduleExpanded ? '100%' : `${Math.max(980, 72 + visibleScheduleStaff.length * 230)}px` }}>
              <div className="sticky top-0 z-20 grid border-b border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.05)]" style={{ gridTemplateColumns: isScheduleExpanded ? `64px repeat(${visibleScheduleStaff.length}, minmax(0, 1fr))` : `72px repeat(${visibleScheduleStaff.length}, minmax(220px, 1fr))` }}>
                <div className="flex items-center justify-center border-r border-slate-100 text-[9px] font-black text-slate-400">GMT+7</div>
                {visibleScheduleStaff.map((staff) => {
                  const staffAppointments = scopedAppointments.filter((appointment) => appointment.staff === staff.name && !['CANCELLED', 'NO_SHOW'].includes(appointment.status));
                  const bookedMinutes = staffAppointments.reduce((sum, appointment) => sum + appointment.duration, 0);
                  const utilization = Math.min(100, Math.round(bookedMinutes / 600 * 100));
                  return <div key={staff.name} className={`flex items-center border-r border-slate-100 last:border-r-0 ${isScheduleExpanded ? 'min-h-14 gap-2 px-2 py-2' : 'min-h-16 gap-2.5 px-3.5 py-3'}`}><span className={`flex shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700 ${isScheduleExpanded ? 'h-8 w-8 text-[8px]' : 'h-9 w-9 text-[9px]'}`}>{staff.initials}</span><div className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[10px] font-black text-slate-800">{staff.name}</span>{selectedBranch === 'ALL' && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[7px] font-black text-slate-500">{staff.branch}</span>}</span><p className="mt-0.5 truncate text-[8px] text-slate-400">{staff.role}</p>{!isScheduleExpanded && <p className="mt-0.5 text-[7px] font-semibold text-slate-400">{staff.shift}</p>}</div><span className={`rounded-lg bg-violet-50 font-black text-violet-600 ${isScheduleExpanded ? 'px-1.5 py-1 text-[8px]' : 'px-2 py-1 text-[9px]'}`}>{utilization}%</span></div>;
                })}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: isScheduleExpanded ? `64px repeat(${visibleScheduleStaff.length}, minmax(0, 1fr))` : `72px repeat(${visibleScheduleStaff.length}, minmax(220px, 1fr))`, height: scheduleHourHeight * 12 + SCHEDULE_BOTTOM_GUTTER }}>
                <div className="relative border-r border-slate-200 bg-slate-50/70">
                  {Array.from({ length: 13 }, (_, index) => 8 + index).map((hour) => <span key={hour} className={`absolute right-2 text-[9px] font-bold text-slate-400 ${hour === 8 ? '' : '-translate-y-1/2'}`} style={{ top: hour === 8 ? 8 : (hour - 8) * scheduleHourHeight }}>{String(hour).padStart(2, '0')}:00</span>)}
                </div>
                {visibleScheduleStaff.map((staff) => (
                  <div key={staff.name} className="relative border-r border-slate-100 last:border-r-0" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${scheduleHourHeight - 1}px, #e8edf5 ${scheduleHourHeight}px)` }}>
                    {filteredAppointments.filter((appointment) => appointment.staff === staff.name).map((appointment) => {
                      const top = Math.max(0, (minutesFromStart(appointment.start) - 480) / 60 * scheduleHourHeight);
                      const height = Math.max(34, appointment.duration / 60 * scheduleHourHeight - 4);
                      const meta = statusMeta[appointment.status];
                      const isCompact = height < 72;
                      const showService = height >= 88;
                      const showOperationalMeta = height >= 118;
                      const appointmentStart = minutesFromStart(appointment.start);
                      const hasConflict = scopedAppointments.some((other) => {
                        if (other.id === appointment.id || ['CANCELLED', 'NO_SHOW'].includes(other.status)) return false;
                        const otherStart = minutesFromStart(other.start);
                        const overlaps = appointmentStart < otherStart + other.duration && appointmentStart + appointment.duration > otherStart;
                        return overlaps && (other.staff === appointment.staff || Boolean(appointment.station && appointment.station === other.station));
                      });
                      const fullSummary = `${appointment.start}–${getEndTime(appointment.start, appointment.duration)} · ${appointment.customer} · ${appointment.service} · ${meta.label}${appointment.station ? ` · ${appointment.station}` : ''}${hasConflict ? ' · Có xung đột nguồn lực' : ''}`;
                      return (
                        <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} aria-label={`Xem lịch: ${fullSummary}`} title={fullSummary} className={`group absolute left-1.5 right-1.5 z-10 h-auto overflow-hidden rounded-lg border border-l-[3px] px-2 text-left shadow-sm transition-all hover:z-20 hover:-translate-y-0.5 hover:shadow-lg focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${isCompact ? 'py-1' : 'py-1.5'} ${['CANCELLED', 'NO_SHOW'].includes(appointment.status) ? 'opacity-70' : ''} ${meta.card}`} style={{ top: top + 2, height }}>
                          {isCompact ? (
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 text-[8px] font-black tracking-tight tabular-nums">{appointment.start}–{getEndTime(appointment.start, appointment.duration)}</span>
                              <span className={`min-w-0 flex-1 truncate text-[9px] font-black ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}>{appointment.customer}</span>
                              {hasConflict && <CircleAlert aria-label="Có xung đột nguồn lực" className="h-3.5 w-3.5 shrink-0 text-rose-600" />}
                              <span aria-label={meta.label} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[7px] font-black text-white ${meta.dot}`}>{meta.symbol}</span>
                            </span>
                          ) : (
                            <>
                              <span className="flex items-center justify-between gap-2"><span className="text-[9px] font-black tracking-tight tabular-nums">{appointment.start}–{getEndTime(appointment.start, appointment.duration)}</span><span className="flex items-center gap-1.5">{hasConflict && <CircleAlert aria-label="Có xung đột nguồn lực" className="h-3.5 w-3.5 text-rose-600" />}<span aria-label={meta.label} className={`flex h-4 w-4 items-center justify-center rounded text-[7px] font-black text-white ${meta.dot}`}>{meta.symbol}</span></span></span>
                              <span className={`mt-1 block truncate text-[10px] font-black leading-4 ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}>{appointment.customer}</span>
                              {showService && <span className="block truncate text-[8px] font-medium leading-4 opacity-70">{appointment.service}</span>}
                              {showOperationalMeta && <span className="mt-1.5 flex items-center justify-between gap-2"><span className="inline-flex min-w-0 truncate rounded-md bg-white/75 px-1.5 py-0.5 text-[7px] font-bold ring-1 ring-black/5">{meta.shortLabel}</span><span className="shrink-0 truncate text-[7px] font-bold opacity-60">{appointment.station || 'Chưa xếp bàn'}</span></span>}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {selectedDate === '2026-07-16' && <div className="pointer-events-none absolute left-0 right-0 z-[5] border-t border-rose-400" style={{ top: (14 * 60 + 32 - 480) / 60 * scheduleHourHeight }}><span className="absolute -left-0.5 -top-2.5 z-20 rounded-r-md bg-rose-500 px-2 py-0.5 text-[8px] font-black text-white shadow-sm">14:32</span></div>}
              </div>
            </div> : <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><UsersRound className="h-8 w-8 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-700">Không tìm thấy nhân viên</p><p className="mt-1 text-[8px] text-slate-400">Thử tên khác hoặc xóa tìm kiếm để xem toàn bộ lịch.</p><button type="button" onClick={() => setStaffSearchQuery('')} className="mt-3 border border-slate-200 bg-white px-3 text-[8px] font-bold text-violet-600 shadow-sm">Xóa tìm kiếm</button></div>}
            {!filteredAppointments.length && <div className="absolute inset-x-0 top-80 text-center"><CalendarDays className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-[10px] font-bold text-slate-500">Không có lịch phù hợp với bộ lọc</p></div>}
          </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[8px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Dịch vụ</th><th className="px-4 py-3">Nhân viên</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Giá trị</th><th className="px-4 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="text-[9px] text-slate-600 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3.5"><p className="font-black text-slate-900">{appointment.start}–{getEndTime(appointment.start, appointment.duration)}</p><p className="mt-1 text-[8px] text-slate-400">{appointment.id} · {appointment.duration} phút</p></td>
                    <td className="px-4 py-3.5"><p className="font-black text-slate-800">{appointment.customer}{appointment.firstVisit && <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[7px] text-violet-600">Khách mới</span>}</p><p className="mt-1 text-[8px] text-slate-400">{appointment.phone}</p></td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{appointment.service}</td>
                    <td className="px-4 py-3.5"><p className="font-bold text-slate-700">{appointment.staff}</p><p className="mt-1 text-[8px] text-slate-400">{branchLabels[appointment.branch]}</p></td>
                    <td className="px-4 py-3.5">{sourceLabels[appointment.source]}</td>
                    <td className="whitespace-nowrap px-4 py-3.5"><p className="font-black text-slate-800">{formatCurrency(appointment.price)}</p><p className="mt-1 text-[8px] text-slate-400">Cọc {formatCurrency(appointment.deposit)}</p></td>
                    <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[appointment.status].badge}`}>{statusMeta[appointment.status].label}</span></td>
                    <td className="px-5 py-3.5 text-right"><button type="button" onClick={() => setSelectedAppointment(appointment)} className="border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm">Chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredAppointments.length && <div className="px-6 py-14 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không tìm thấy lịch hẹn phù hợp</p><button type="button" onClick={resetFilters} className="mt-2 border-0 bg-transparent px-2 text-[9px] font-bold text-violet-600 shadow-none">Xóa tìm kiếm và bộ lọc</button></div>}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[8px] font-medium text-slate-400">Hiển thị <span className="font-black text-slate-600">{filteredAppointments.length}</span> trên {scopedAppointments.length} lịch trong ngày</p>
          <div className="flex items-center gap-4 text-[8px] text-slate-400"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Giờ mở cửa 08:00–20:00</span><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selectedBranch === 'ALL' ? '2 chi nhánh' : branchLabels[selectedBranch as BranchCode]}</span></div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Cần xử lý</h2><p className="mt-1 text-[8px] text-slate-400">Lịch chờ xác nhận trong ngày</p></div><span className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-amber-50 px-2 text-[9px] font-black text-amber-700">{pendingCount}</span></div>
          <div className="mt-3 divide-y divide-slate-100">{scopedAppointments.filter((appointment) => appointment.status === 'PENDING').slice(0, 3).map((appointment) => <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="flex h-auto w-full items-center gap-3 rounded-none border-0 bg-transparent px-0 py-3 text-left shadow-none"><span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[9px] font-black text-amber-700">{appointment.start}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-black text-slate-700">{appointment.customer}</span><span className="mt-1 block truncate text-[8px] text-slate-400">{appointment.service} · {appointment.phone}</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300" /></button>)}</div>
          {!pendingCount && <div className="py-7 text-center"><Check className="mx-auto h-6 w-6 text-emerald-500" /><p className="mt-2 text-[9px] font-bold text-slate-500">Không còn lịch cần xác nhận</p></div>}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Nguồn đặt lịch</h2><p className="mt-1 text-[8px] text-slate-400">Phân bổ theo kênh trong ngày</p></div><CalendarDays className="h-4.5 w-4.5 text-violet-500" /></div>
          <div className="mt-4 space-y-3">{(Object.keys(sourceLabels) as AppointmentSource[]).map((source) => {
            const count = scopedAppointments.filter((appointment) => appointment.source === source).length;
            const percent = scopedAppointments.length ? Math.round(count / scopedAppointments.length * 100) : 0;
            return <div key={source}><div className="mb-1.5 flex items-center justify-between text-[8px]"><span className="font-bold text-slate-600">{sourceLabels[source]}</span><span className="font-black text-slate-700">{count} · {percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${percent}%` }} /></div></div>;
          })}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Chất lượng vận hành</h2><p className="mt-1 text-[8px] text-slate-400">Chỉ số lịch hẹn tháng 07/2026</p></div><Sparkles className="h-4.5 w-4.5 text-emerald-500" /></div>
          <div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-[8px] text-slate-400">Đúng giờ</p><p className="mt-1 text-lg font-black text-slate-900">91%</p></div><div><p className="text-[8px] text-slate-400">Hủy lịch</p><p className="mt-1 text-lg font-black text-slate-900">3,2%</p></div><div><p className="text-[8px] text-slate-400">Lấp đầy</p><p className="mt-1 text-lg font-black text-emerald-600">86%</p></div></div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-3"><p className="flex items-center gap-2 text-[8px] font-black text-emerald-800"><ClipboardCheck className="h-3.5 w-3.5" />Gợi ý tối ưu lịch</p><p className="mt-1.5 text-[8px] leading-4 text-emerald-700">Khung 12:00–13:30 còn trống 35%. Có thể mở ưu đãi đặt nhanh cho dịch vụ dưới 60 phút.</p></div>
        </article>
      </section>

      {selectedAppointment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button type="button" aria-label="Đóng chi tiết lịch hẹn" onClick={() => setSelectedAppointment(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <section role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title" className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-600">{selectedAppointment.id}</span>{selectedAppointment.firstVisit && <span className="rounded-md bg-violet-50 px-2 py-1 text-[8px] font-bold text-violet-600">Khách mới</span>}<span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selectedAppointment.status].badge}`}>{statusMeta[selectedAppointment.status].label}</span></div><h2 id="appointment-detail-title" className="mt-2 text-xl font-black tracking-tight text-slate-950">Chi tiết lịch hẹn</h2><p className="mt-1 text-[9px] text-slate-400">Tạo lúc {selectedAppointment.createdAt} · {selectedAppointment.createdBy || roleLabel}</p></div><button type="button" onClick={() => setSelectedAppointment(null)} aria-label="Đóng chi tiết lịch hẹn" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm hover:bg-slate-50"><X className="h-4 w-4" /></button></header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 p-5 text-white shadow-lg shadow-slate-200 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold capitalize text-slate-400">{toDate(selectedAppointment.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p><p className="mt-2 text-3xl font-black tracking-tight">{selectedAppointment.start}–{getEndTime(selectedAppointment.start, selectedAppointment.duration)}</p><p className="mt-2 text-[10px] text-slate-400">{selectedAppointment.duration} phút · {branchLabels[selectedAppointment.branch]}</p></div><div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/10"><p className="text-[8px] font-bold uppercase text-slate-400">Bàn / ghế</p><p className="mt-1 text-[11px] font-black">{selectedAppointment.station || 'Chưa xếp bàn'}</p></div></div></div>

                  <div className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-[11px] font-black text-violet-700">{selectedAppointment.customer.split(' ').slice(-2).map((word) => word[0]).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{selectedAppointment.customer}</p><p className="mt-1 text-[9px] text-slate-400">{selectedAppointment.firstVisit ? 'Khách lần đầu sử dụng dịch vụ' : 'Khách đã có hồ sơ tại salon'}</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><a href={`tel:${selectedAppointment.phone.replace(/\s/g, '')}`} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 text-[9px] font-bold text-slate-700 no-underline"><Phone className="h-4 w-4" />{selectedAppointment.phone}</a><button type="button" onClick={() => onNotify?.(`Đã mở nội dung nhắn tin cho ${selectedAppointment.customer}.`)} className="flex h-10 items-center justify-center gap-2 border-0 bg-violet-50 text-[9px] font-bold text-violet-700 shadow-none"><MessageCircle className="h-4 w-4" />Gửi tin nhắn</button></div></div>

                  <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-fuchsia-600 shadow-sm"><Sparkles className="h-4 w-4" /></span><div className="mt-3 flex items-center justify-between gap-2"><p className="text-[8px] font-bold uppercase text-fuchsia-500">Dịch vụ</p><span className="rounded-full bg-white px-2 py-1 text-[7px] font-black text-fuchsia-600 shadow-sm">{selectedAppointment.services?.length || 1} dịch vụ</span></div><div className="mt-2 space-y-1.5">{(selectedAppointment.services?.length ? selectedAppointment.services : [selectedAppointment.service]).map((service, index) => <div key={`${service}-${index}`} className="flex items-start gap-2"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white text-[7px] font-black text-fuchsia-600 shadow-sm">{index + 1}</span><p className="text-[9px] font-bold leading-4 text-slate-800">{service}</p></div>)}</div><p className="mt-2 border-t border-fuchsia-100 pt-2 text-[9px] font-semibold text-slate-500">Tổng {selectedAppointment.duration} phút · {formatCurrency(selectedAppointment.price)}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><UserRound className="h-4 w-4" /></span><p className="mt-3 text-[8px] font-bold uppercase text-blue-500">Kỹ thuật viên</p><p className="mt-1 text-[11px] font-black text-slate-900">{selectedAppointment.staff}</p><p className="mt-1 text-[9px] text-slate-500">{staffDirectory.find((staff) => staff.name === selectedAppointment.staff)?.role}</p></div></div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Thanh toán</p><p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(selectedAppointment.price)}</p><p className="mt-1 text-[9px] text-slate-400">{sourceLabels[selectedAppointment.source]}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ReceiptText className="h-4 w-4" /></span></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[8px] font-bold text-emerald-600">Đã đặt cọc</p><p className="mt-1 text-[11px] font-black text-emerald-800">{formatCurrency(selectedAppointment.deposit)}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[8px] font-bold text-amber-600">Còn phải thu</p><p className="mt-1 text-[11px] font-black text-amber-800">{formatCurrency(Math.max(0, selectedAppointment.price - selectedAppointment.deposit))}</p></div></div></div>

                  <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Ghi chú phục vụ</p><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${selectedAppointment.reminderSent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{selectedAppointment.reminderSent ? 'Đã nhắc lịch' : 'Chưa nhắc lịch'}</span></div><p className="mt-3 text-[10px] leading-5 text-slate-600">{selectedAppointment.note || 'Chưa có ghi chú cho lịch hẹn này.'}</p></div>

                  {selectedAppointment.status === 'CANCELLED' && <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm"><X className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[8px] font-black uppercase tracking-wide text-rose-600">Thông tin hủy lịch</p>{selectedAppointment.cancelledAt && <span className="text-[7px] font-semibold text-rose-400">{selectedAppointment.cancelledAt}</span>}</div><p className="mt-2 text-[10px] font-black text-rose-900">{selectedAppointment.cancellationReason || 'Chưa ghi nhận lý do'}</p><div className="mt-2 rounded-xl bg-white/80 px-3 py-2.5"><p className="text-[7px] font-bold uppercase text-slate-400">Ghi chú hủy</p><p className="mt-1 text-[9px] leading-4 text-slate-600">{selectedAppointment.cancellationNote || 'Không có ghi chú bổ sung.'}</p></div><p className="mt-2 text-[7px] font-semibold text-rose-500">Thực hiện bởi {selectedAppointment.cancelledBy || roleLabel}</p></div></div></div>}

                  <div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Tiến trình phục vụ</p><div className="mt-4 flex gap-2">{(['CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'] as AppointmentStatus[]).map((status, index) => { const order: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED']; const isReached = order.indexOf(selectedAppointment.status) >= order.indexOf(status); return <div key={status} className="min-w-0 flex-1"><div className={`h-2 rounded-full ${isReached ? 'bg-violet-500' : 'bg-slate-100'}`} /><p className={`mt-2 truncate text-center text-[7px] font-bold ${isReached ? 'text-violet-600' : 'text-slate-400'}`}>{index === 0 ? 'Xác nhận' : index === 1 ? 'Đã đến' : index === 2 ? 'Phục vụ' : 'Hoàn thành'}</p></div>; })}</div></div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><div><p className="text-[9px] font-black text-violet-800">Quyền thao tác: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-violet-600">{canManage ? 'Bạn có thể chỉnh sửa thông tin và cập nhật trạng thái lịch hẹn này.' : readOnlyReason || 'Bạn đang ở chế độ chỉ xem.'}</p></div></div></div>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div>{!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selectedAppointment.status) && <button type="button" onClick={openCancelForm} disabled={!canManage} className="h-10 border-0 bg-transparent px-3 text-[9px] font-bold text-rose-600 shadow-none disabled:text-slate-400">Hủy lịch hẹn</button>}</div><div className="flex gap-2"><button type="button" onClick={() => openEditForm(selectedAppointment)} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"><Pencil className="h-3.5 w-3.5" />Chỉnh sửa</button>{nextStatus[selectedAppointment.status] && <button type="button" onClick={() => updateAppointment(selectedAppointment.id, { status: nextStatus[selectedAppointment.status]! })} disabled={!canManage} className="flex h-11 flex-1 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none sm:flex-none"><Check className="h-4 w-4" />{nextStatusLabel[selectedAppointment.status]}</button>}</div></footer>
          </section>
        </div>
      )}

      {showCancelForm && selectedAppointment && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Đóng xác nhận hủy lịch" onClick={() => setShowCancelForm(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <form onSubmit={submitCancellation} role="dialog" aria-modal="true" aria-labelledby="cancel-appointment-title" className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><CircleAlert className="h-5 w-5" /></span><div><h2 id="cancel-appointment-title" className="text-base font-black text-slate-900">Hủy lịch hẹn</h2><p className="mt-1 text-[9px] leading-4 text-slate-500">Lý do và ghi chú sẽ được lưu trong lịch sử lịch hẹn.</p></div></div><button type="button" onClick={() => setShowCancelForm(false)} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-white"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[9px] font-black">{selectedAppointment.customer.split(' ').slice(-2).map((word) => word[0]).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black">{selectedAppointment.customer}</p><p className="mt-1 truncate text-[8px] text-slate-400">{selectedAppointment.id} · {selectedAppointment.start}–{getEndTime(selectedAppointment.start, selectedAppointment.duration)} · {selectedAppointment.service}</p></div></div>
              {cancellationError && <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{cancellationError}</div>}
              <fieldset><legend className="mb-2 text-[9px] font-black text-slate-700">Lý do hủy *</legend><div className="grid gap-2 sm:grid-cols-2">{cancellationReasons.map((reason) => { const isSelected = cancellationReason === reason; return <button key={reason} type="button" aria-pressed={isSelected} onClick={() => { setCancellationReason(reason); setCancellationError(''); }} className={`flex h-auto min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[8px] font-bold shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${isSelected ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-100' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/40'}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'}`}>{isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>{reason}</button>; })}</div></fieldset>
              <label className="block"><span className="flex items-center justify-between gap-3"><span className="text-[9px] font-black text-slate-700">Ghi chú hủy {cancellationReason === 'Khác' ? '*' : '(không bắt buộc)'}</span><span className="text-[7px] font-semibold text-slate-400">{cancellationNote.length}/500</span></span><textarea value={cancellationNote} maxLength={500} onChange={(event) => { setCancellationNote(event.target.value); setCancellationError(''); }} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100" placeholder="Ví dụ: Khách báo bận công tác và sẽ đặt lại vào tuần sau..." /></label>
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[8px] leading-4 text-amber-700"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Hệ thống sẽ ghi nhận người hủy là <strong>{roleLabel}</strong> cùng thời điểm thao tác.</span></div>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setShowCancelForm(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Quay lại</button><button type="submit" disabled={!cancellationReason} className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><X className="h-4 w-4" />Xác nhận hủy lịch</button></footer>
          </form>
        </div>
      )}

      {formMode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Đóng biểu mẫu" onClick={() => setFormMode(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <form onSubmit={submitAppointment} className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><h2 className="text-base font-black text-slate-900">{formMode === 'CREATE' ? 'Tạo lịch hẹn mới' : `Chỉnh sửa ${selectedAppointment?.id}`}</h2><p className="mt-1 text-[9px] text-slate-500">Chọn một hoặc nhiều dịch vụ cho khách trong cùng lịch hẹn.</p></div><button type="button" onClick={() => setFormMode(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div>
            <div className="space-y-5 p-5 sm:p-6">
              {formError && <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{formError}</div>}
              <fieldset><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><UserRound className="h-3.5 w-3.5" /></span>Thông tin khách hàng</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tên khách hàng *</span><input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} className={inputClass} placeholder="Ví dụ: Nguyễn Minh Anh" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số điện thoại *</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="09xx xxx xxx" /></label></div>{form.customerId && <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-[8px] font-bold text-violet-700"><Check className="h-3.5 w-3.5" />Đã liên kết hồ sơ khách hàng <span className="font-black">{form.customerId}</span></div>}</fieldset>
              <fieldset className="border-t border-slate-100 pt-5">
                <legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600"><Sparkles className="h-3.5 w-3.5" /></span>Dịch vụ & phân công</legend>
                <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold text-slate-700">Chọn dịch vụ *</p><p className="mt-0.5 text-[8px] text-slate-400">Có thể chọn nhiều dịch vụ cho cùng một khách</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[8px] font-black text-violet-700">{form.services.length} đã chọn</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {services.map((service) => {
                    const isSelected = form.services.includes(service.name);
                    return <button key={service.name} type="button" aria-pressed={isSelected} onClick={() => { setForm((current) => ({ ...current, services: isSelected ? current.services.filter((name) => name !== service.name) : [...current.services, service.name] })); setFormError(''); }} className={`flex h-auto items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 ${isSelected ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-white ${isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-200 bg-white'}`}>{isSelected && <Check className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-black text-slate-800">{service.name}</span><span className="mt-1 block text-[8px] font-semibold text-slate-400">{service.duration} phút · {formatCurrency(service.price)}</span></span></button>;
                  })}
                </div>
                {selectedServiceDetails.length ? <div className="mt-3 overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/40"><div className="flex items-center justify-between border-b border-violet-100 px-4 py-2.5"><p className="text-[8px] font-black uppercase tracking-wide text-violet-700">Danh sách dịch vụ</p><p className="text-[8px] font-bold text-violet-600">{selectedServiceDuration} phút</p></div><div className="divide-y divide-violet-100/80">{selectedServiceDetails.map((service, index) => <div key={service.name} className="flex items-center gap-3 px-4 py-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[8px] font-black text-violet-600 shadow-sm">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-bold text-slate-700">{service.name}</span><span className="text-[7px] text-slate-400">{service.duration} phút</span></span><span className="shrink-0 text-[8px] font-black text-slate-700">{formatCurrency(service.price)}</span><button type="button" onClick={() => setForm((current) => ({ ...current, services: current.services.filter((name) => name !== service.name) }))} aria-label={`Bỏ dịch vụ ${service.name}`} className="flex h-7 w-7 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-rose-600"><X className="h-3.5 w-3.5" /></button></div>)}</div><div className="grid grid-cols-3 gap-px bg-violet-100"><div className="bg-white px-3 py-2.5"><p className="text-[7px] font-bold text-slate-400">Tổng dịch vụ</p><p className="mt-1 text-[10px] font-black text-slate-800">{selectedServiceDetails.length}</p></div><div className="bg-white px-3 py-2.5"><p className="text-[7px] font-bold text-slate-400">Thời lượng</p><p className="mt-1 text-[10px] font-black text-slate-800">{selectedServiceDuration} phút</p></div><div className="bg-white px-3 py-2.5"><p className="text-[7px] font-bold text-slate-400">Tạm tính</p><p className="mt-1 text-[10px] font-black text-violet-700">{formatCurrency(selectedServicePrice)}</p></div></div></div> : <div className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-[8px] font-bold text-amber-700">Chọn ít nhất một dịch vụ để tiếp tục.</div>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh *</span><BeautifulSelect value={form.branch} onChange={(event) => { const branch = event.target.value as BranchCode; setForm((current) => ({ ...current, branch, staff: branch === 'Q1' ? 'Hà My' : 'Thảo Nguyễn', station: branch === 'Q1' ? 'Bàn M-01' : 'Bàn M-02' })); }} className={inputClass}><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Kỹ thuật viên phụ trách *</span><BeautifulSelect value={form.staff} onChange={(event) => setForm((current) => ({ ...current, staff: event.target.value }))} className={inputClass}>{staffDirectory.filter((staff) => staff.branch === form.branch).map((staff) => <option key={staff.name} value={staff.name}>{staff.name} · {staff.role}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Bàn / ghế phục vụ</span><BeautifulSelect value={form.station} onChange={(event) => setForm((current) => ({ ...current, station: event.target.value }))} className={inputClass}>{['Bàn M-01', 'Bàn M-02', 'Bàn M-03', 'Bàn M-04', 'Ghế P-01', 'Ghế P-02', 'Ghế P-03', 'Bàn VIP-01', 'Bàn VIP-02'].map((station) => <option key={station} value={station}>{station}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nguồn đặt lịch</span><BeautifulSelect value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as AppointmentSource }))} className={inputClass}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></label></div>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[8px] leading-4 text-slate-500"><UsersRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />Nhân viên và bàn/ghế đã chọn được áp dụng cho toàn bộ dịch vụ trong lịch hẹn này.</p>
              </fieldset>
              <fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Clock3 className="h-3.5 w-3.5" /></span>Thời gian & trạng thái</legend><div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ngày *</span><input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Giờ bắt đầu *</span><input type="time" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Trạng thái</span><BeautifulSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))} className={inputClass}>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label></div></fieldset>
              <fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CircleDollarSign className="h-3.5 w-3.5" /></span>Thanh toán & ghi chú</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tiền đặt cọc</span><input type="number" min="0" max={selectedServicePrice || undefined} step="10000" value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} className={inputClass} /></label><div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-100 bg-slate-50"><div className="px-4 py-3"><p className="text-[8px] font-bold text-slate-400">Tổng dự kiến</p><p className="mt-1 text-[12px] font-black text-slate-800">{formatCurrency(selectedServicePrice)}</p></div><div className="border-l border-slate-200 px-4 py-3"><p className="text-[8px] font-bold text-slate-400">Kết thúc</p><p className="mt-1 text-[12px] font-black text-violet-700">{selectedServiceEnd}</p></div></div></div><label className="mt-3 block"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ghi chú phục vụ</span><textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Mẫu nail, màu sắc, tình trạng móng, dị ứng hoặc yêu cầu riêng..." /></label></fieldset>
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setFormMode(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" disabled={!form.services.length} className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><CalendarCheck2 className="h-4 w-4" />{formMode === 'CREATE' ? `Lưu ${form.services.length} dịch vụ` : 'Lưu thay đổi'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
