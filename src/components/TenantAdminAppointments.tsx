import { FormEvent, useMemo, useState } from 'react';
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
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
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
  customer: string;
  phone: string;
  date: string;
  start: string;
  duration: number;
  service: string;
  staff: string;
  branch: BranchCode;
  source: AppointmentSource;
  status: AppointmentStatus;
  price: number;
  deposit: number;
  note: string;
  firstVisit?: boolean;
  createdAt: string;
}

interface TenantAdminAppointmentsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
}

interface AppointmentFormState {
  customer: string;
  phone: string;
  date: string;
  start: string;
  service: string;
  staff: string;
  branch: BranchCode;
  source: AppointmentSource;
  status: AppointmentStatus;
  deposit: string;
  note: string;
}

const statusMeta: Record<AppointmentStatus, { label: string; badge: string; card: string; dot: string }> = {
  PENDING: { label: 'Chờ xác nhận', badge: 'bg-amber-50 text-amber-700 ring-amber-200', card: 'border-amber-200 bg-amber-50/90 text-amber-950', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Đã xác nhận', badge: 'bg-blue-50 text-blue-700 ring-blue-200', card: 'border-blue-200 bg-blue-50/90 text-blue-950', dot: 'bg-blue-500' },
  CHECKED_IN: { label: 'Đã đến', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', card: 'border-cyan-200 bg-cyan-50/90 text-cyan-950', dot: 'bg-cyan-500' },
  IN_SERVICE: { label: 'Đang phục vụ', badge: 'bg-violet-50 text-violet-700 ring-violet-200', card: 'border-violet-200 bg-violet-50/90 text-violet-950', dot: 'bg-violet-500' },
  COMPLETED: { label: 'Hoàn thành', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', card: 'border-emerald-200 bg-emerald-50/90 text-emerald-950', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-50 text-rose-700 ring-rose-200', card: 'border-rose-200 bg-rose-50/85 text-rose-950', dot: 'bg-rose-500' },
  NO_SHOW: { label: 'Không đến', badge: 'bg-slate-100 text-slate-600 ring-slate-200', card: 'border-slate-200 bg-slate-100/90 text-slate-700', dot: 'bg-slate-500' }
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

const services = [
  { name: 'Nhuộm Balayage', duration: 120, price: 1_850_000 },
  { name: 'Cắt & tạo kiểu', duration: 60, price: 450_000 },
  { name: 'Phục hồi Keratin', duration: 90, price: 1_250_000 },
  { name: 'Cắt tóc nam', duration: 45, price: 280_000 },
  { name: 'Uốn setting', duration: 150, price: 1_650_000 },
  { name: 'Gội dưỡng sinh', duration: 60, price: 390_000 },
  { name: 'Nhuộm phủ bạc', duration: 90, price: 850_000 }
];

const staffDirectory = [
  { name: 'Thảo Nguyễn', branch: 'Q3' as BranchCode, initials: 'TN', role: 'Senior Stylist', shift: '08:00–18:00' },
  { name: 'Minh Khang', branch: 'Q3' as BranchCode, initials: 'MK', role: 'Hair Stylist', shift: '09:00–20:00' },
  { name: 'Quốc Bảo', branch: 'Q3' as BranchCode, initials: 'QB', role: 'Barber', shift: '08:00–17:00' },
  { name: 'Thuỳ Dương', branch: 'Q3' as BranchCode, initials: 'TD', role: 'Hair Assistant', shift: '10:00–20:00' },
  { name: 'Hà My', branch: 'Q1' as BranchCode, initials: 'HM', role: 'Senior Stylist', shift: '08:00–18:00' },
  { name: 'Gia Huy', branch: 'Q1' as BranchCode, initials: 'GH', role: 'Hair Stylist', shift: '09:00–20:00' }
];

const appointmentSeed: TenantAppointment[] = [
  { id: 'APT-1040', customer: 'Đặng Hải Yến', phone: '0903 114 668', date: '2026-07-16', start: '08:00', duration: 60, service: 'Gội dưỡng sinh', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'COMPLETED', price: 390_000, deposit: 0, note: 'Khách nhạy cảm với tinh dầu bạc hà.', createdAt: '15/07/2026 · 18:42' },
  { id: 'APT-1041', customer: 'Nguyễn Lan Anh', phone: '0988 226 510', date: '2026-07-16', start: '08:15', duration: 90, service: 'Phục hồi Keratin', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'RECEPTION', status: 'COMPLETED', price: 1_250_000, deposit: 300_000, note: 'Sử dụng liệu trình dành cho tóc tẩy.', createdAt: '14/07/2026 · 10:20' },
  { id: 'APT-1042', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: '2026-07-16', start: '10:00', duration: 120, service: 'Nhuộm Balayage', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'IN_SERVICE', price: 1_850_000, deposit: 500_000, note: 'Tông nâu lạnh, tránh ánh đỏ. Khách đã gửi ảnh mẫu qua Zalo.', createdAt: '13/07/2026 · 21:05' },
  { id: 'APT-1043', customer: 'Trần Thu Hà', phone: '0908 337 912', date: '2026-07-16', start: '10:15', duration: 60, service: 'Cắt & tạo kiểu', staff: 'Minh Khang', branch: 'Q3', source: 'ZALO', status: 'CHECKED_IN', price: 450_000, deposit: 100_000, note: 'Khách muốn giữ độ dài ngang vai.', createdAt: '15/07/2026 · 09:12' },
  { id: 'APT-1044', customer: 'Lê Ngọc Mai', phone: '0936 221 557', date: '2026-07-16', start: '11:30', duration: 90, service: 'Phục hồi Keratin', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_250_000, deposit: 300_000, note: 'Lần đầu đến salon, cần tư vấn tình trạng tóc trước khi làm.', firstVisit: true, createdAt: '15/07/2026 · 22:18' },
  { id: 'APT-1045', customer: 'Phạm Hoài Nam', phone: '0977 660 341', date: '2026-07-16', start: '13:45', duration: 45, service: 'Cắt tóc nam', staff: 'Quốc Bảo', branch: 'Q3', source: 'PHONE', status: 'PENDING', price: 280_000, deposit: 0, note: 'Gọi lại xác nhận trước 12:00.', firstVisit: true, createdAt: '16/07/2026 · 08:04' },
  { id: 'APT-1046', customer: 'Vũ Khánh Linh', phone: '0909 552 770', date: '2026-07-16', start: '15:00', duration: 150, service: 'Uốn setting', staff: 'Minh Khang', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_650_000, deposit: 500_000, note: 'Ưu tiên trục uốn lớn, sóng tự nhiên.', createdAt: '15/07/2026 · 15:36' },
  { id: 'APT-1047', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', date: '2026-07-16', start: '16:00', duration: 60, service: 'Gội dưỡng sinh', staff: 'Thuỳ Dương', branch: 'Q3', source: 'ZALO', status: 'PENDING', price: 390_000, deposit: 0, note: 'Khách dùng voucher sinh nhật.', createdAt: '16/07/2026 · 09:31' },
  { id: 'APT-1048', customer: 'Đỗ Tuấn Kiệt', phone: '0918 734 662', date: '2026-07-16', start: '16:30', duration: 45, service: 'Cắt tóc nam', staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'CONFIRMED', price: 280_000, deposit: 0, note: '', createdAt: '16/07/2026 · 10:02' },
  { id: 'APT-1049', customer: 'Trương Bảo Ngọc', phone: '0902 778 219', date: '2026-07-16', start: '09:00', duration: 90, service: 'Nhuộm phủ bạc', staff: 'Hà My', branch: 'Q1', source: 'PHONE', status: 'COMPLETED', price: 850_000, deposit: 200_000, note: 'Công thức màu đã lưu trong hồ sơ khách.', createdAt: '14/07/2026 · 13:16' },
  { id: 'APT-1050', customer: 'Ngô Minh Châu', phone: '0966 124 700', date: '2026-07-16', start: '13:00', duration: 120, service: 'Nhuộm Balayage', staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'CONFIRMED', price: 1_850_000, deposit: 500_000, note: 'Khách mới, kiểm tra tiền sử dị ứng thuốc nhuộm.', firstVisit: true, createdAt: '15/07/2026 · 20:11' },
  { id: 'APT-1051', customer: 'Mai Đức Anh', phone: '0901 533 008', date: '2026-07-16', start: '15:30', duration: 60, service: 'Cắt & tạo kiểu', staff: 'Gia Huy', branch: 'Q1', source: 'ZALO', status: 'PENDING', price: 450_000, deposit: 0, note: '', createdAt: '16/07/2026 · 07:55' },
  { id: 'APT-1052', customer: 'Tạ Mỹ Duyên', phone: '0933 112 800', date: '2026-07-15', start: '14:00', duration: 150, service: 'Uốn setting', staff: 'Minh Khang', branch: 'Q3', source: 'ONLINE', status: 'COMPLETED', price: 1_650_000, deposit: 500_000, note: '', createdAt: '13/07/2026 · 11:42' },
  { id: 'APT-1053', customer: 'Huỳnh Phương Thảo', phone: '0905 811 229', date: '2026-07-17', start: '09:30', duration: 120, service: 'Nhuộm Balayage', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1_850_000, deposit: 500_000, note: 'Khách cần hoàn tất trước 12:00.', createdAt: '15/07/2026 · 16:30' },
  { id: 'APT-1054', customer: 'Phan Gia Hân', phone: '0974 360 118', date: '2026-07-17', start: '13:00', duration: 60, service: 'Gội dưỡng sinh', staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'PENDING', price: 390_000, deposit: 0, note: '', createdAt: '16/07/2026 · 10:18' }
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
  customer: '',
  phone: '',
  date,
  start: '09:00',
  service: services[0].name,
  staff: branch === 'Q1' ? 'Hà My' : 'Thảo Nguyễn',
  branch: branch === 'Q1' ? 'Q1' : 'Q3',
  source: 'RECEPTION',
  status: 'PENDING',
  deposit: '0',
  note: ''
});

export default function TenantAdminAppointments({ searchQuery, onSearchQueryChange, selectedBranch, onSelectedBranchChange }: TenantAdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<TenantAppointment[]>(appointmentSeed);
  const [selectedDate, setSelectedDate] = useState('2026-07-16');
  const [viewMode, setViewMode] = useState<ViewMode>('SCHEDULE');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | AppointmentSource>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<TenantAppointment | null>(null);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => emptyForm('2026-07-16', selectedBranch));
  const [formError, setFormError] = useState('');

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

  const weekDates = getWeekDates(selectedDate);
  const totalRevenue = scopedAppointments
    .filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status))
    .reduce((sum, appointment) => sum + appointment.price, 0);
  const completedCount = scopedAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
  const pendingCount = scopedAppointments.filter((appointment) => appointment.status === 'PENDING').length;
  const servingCount = scopedAppointments.filter((appointment) => ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status)).length;
  const activeFilterCount = [statusFilter !== 'ALL', staffFilter !== 'ALL', sourceFilter !== 'ALL'].filter(Boolean).length;

  const updateAppointment = (id: string, patch: Partial<TenantAppointment>) => {
    setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, ...patch } : appointment));
    setSelectedAppointment((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const openCreateForm = () => {
    setForm(emptyForm(selectedDate, selectedBranch));
    setFormError('');
    setFormMode('CREATE');
  };

  const openEditForm = (appointment: TenantAppointment) => {
    setForm({
      customer: appointment.customer,
      phone: appointment.phone,
      date: appointment.date,
      start: appointment.start,
      service: appointment.service,
      staff: appointment.staff,
      branch: appointment.branch,
      source: appointment.source,
      status: appointment.status,
      deposit: String(appointment.deposit),
      note: appointment.note
    });
    setFormError('');
    setFormMode('EDIT');
  };

  const submitAppointment = (event: FormEvent) => {
    event.preventDefault();
    if (!form.customer.trim() || !form.phone.trim() || !form.date || !form.start || !form.service || !form.staff) {
      setFormError('Vui lòng nhập đầy đủ khách hàng, số điện thoại, dịch vụ, nhân viên và thời gian.');
      return;
    }

    const service = services.find((item) => item.name === form.service) || services[0];
    const existingId = formMode === 'EDIT' ? selectedAppointment?.id : undefined;
    const nextId = existingId || `APT-${Math.max(...appointments.map((appointment) => Number(appointment.id.replace('APT-', '')))) + 1}`;
    const payload: TenantAppointment = {
      id: nextId,
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      date: form.date,
      start: form.start,
      duration: service.duration,
      service: service.name,
      staff: form.staff,
      branch: form.branch,
      source: form.source,
      status: form.status,
      price: service.price,
      deposit: Math.max(0, Number(form.deposit) || 0),
      note: form.note.trim(),
      createdAt: formMode === 'EDIT' && selectedAppointment ? selectedAppointment.createdAt : '16/07/2026 · vừa xong'
    };

    if (formMode === 'EDIT') {
      setAppointments((current) => current.map((appointment) => appointment.id === payload.id ? payload : appointment));
    } else {
      setAppointments((current) => [...current, payload]);
      setSelectedDate(payload.date);
      if (selectedBranch !== 'ALL') onSelectedBranchChange(payload.branch);
    }
    setSelectedAppointment(payload);
    setFormMode(null);
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setStaffFilter('ALL');
    setSourceFilter('ALL');
    onSearchQueryChange('');
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đồng bộ lúc 14:32 · Dữ liệu theo thời gian thực</div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Lịch hẹn</h1>
          <p className="mt-2 text-[11px] text-slate-500">Quản lý lịch đặt, phân bổ nhân viên và theo dõi hành trình phục vụ của khách.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} aria-label="Chọn chi nhánh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-48">
            <option value="Q3">Chi nhánh Quận 3</option>
            <option value="Q1">Chi nhánh Quận 1</option>
            <option value="ALL">Tất cả chi nhánh</option>
          </BeautifulSelect>
          <button type="button" onClick={openCreateForm} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[11px] font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
        </div>
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 px-2 sm:px-4">
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3">
          <span className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-wide text-slate-400"><SlidersHorizontal className="h-3.5 w-3.5" />Trạng thái</span>
          {(['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'] as const).map((status) => {
            const count = status === 'ALL' ? scopedAppointments.length : scopedAppointments.filter((appointment) => appointment.status === status).length;
            return <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-0 text-[8px] font-bold shadow-none ${statusFilter === status ? 'text-violet-700' : 'text-slate-500'}`}>{status !== 'ALL' && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />}{status === 'ALL' ? 'Tất cả' : statusMeta[status].label}<span className={`rounded-full px-1.5 py-0.5 ${statusFilter === status ? 'bg-violet-100' : 'bg-slate-100'}`}>{count}</span></button>;
          })}
        </div>

        {viewMode === 'SCHEDULE' ? (
          <div className="relative overflow-x-auto">
            <div style={{ minWidth: `${Math.max(860, 64 + scheduleStaff.length * 205)}px` }}>
              <div className="grid border-b border-slate-200 bg-white" style={{ gridTemplateColumns: `64px repeat(${scheduleStaff.length}, minmax(190px, 1fr))` }}>
                <div className="flex items-center justify-center border-r border-slate-100 text-[8px] font-black text-slate-400">GMT+7</div>
                {scheduleStaff.map((staff) => {
                  const staffAppointments = scopedAppointments.filter((appointment) => appointment.staff === staff.name && !['CANCELLED', 'NO_SHOW'].includes(appointment.status));
                  const bookedMinutes = staffAppointments.reduce((sum, appointment) => sum + appointment.duration, 0);
                  const utilization = Math.min(100, Math.round(bookedMinutes / 600 * 100));
                  return <div key={staff.name} className="flex items-center gap-2 border-r border-slate-100 px-3 py-3 last:border-r-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[8px] font-black text-slate-700">{staff.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black text-slate-800">{staff.name}</p><p className="mt-0.5 truncate text-[7px] text-slate-400">{staff.role} · {staff.shift}</p></div><span className="text-[8px] font-black text-violet-600">{utilization}%</span></div>;
                })}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${scheduleStaff.length}, minmax(190px, 1fr))`, height: 768 }}>
                <div className="relative border-r border-slate-200 bg-slate-50/70">
                  {Array.from({ length: 13 }, (_, index) => 8 + index).map((hour) => <span key={hour} className="absolute right-3 -translate-y-1/2 text-[8px] font-semibold text-slate-400" style={{ top: (hour - 8) * 64 }}>{String(hour).padStart(2, '0')}:00</span>)}
                </div>
                {scheduleStaff.map((staff) => (
                  <div key={staff.name} className="relative border-r border-slate-100 last:border-r-0" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 63px, #eef2f7 64px)' }}>
                    {filteredAppointments.filter((appointment) => appointment.staff === staff.name).map((appointment) => {
                      const top = Math.max(0, (minutesFromStart(appointment.start) - 480) / 60 * 64);
                      const height = Math.max(44, appointment.duration / 60 * 64 - 6);
                      const meta = statusMeta[appointment.status];
                      return (
                        <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className={`absolute left-1.5 right-1.5 z-10 h-auto overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:z-20 hover:shadow-md ${meta.card}`} style={{ top: top + 3, height }}>
                          <span className="flex items-center justify-between gap-2"><span className="text-[8px] font-black">{appointment.start}–{getEndTime(appointment.start, appointment.duration)}</span><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} /></span>
                          <span className="mt-1 block truncate text-[9px] font-black">{appointment.customer}</span>
                          {height >= 56 && <span className="mt-0.5 block truncate text-[7px] opacity-70">{appointment.service}</span>}
                          {height >= 82 && <span className="mt-2 inline-flex rounded-md bg-white/60 px-1.5 py-0.5 text-[7px] font-bold">{meta.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {selectedDate === '2026-07-16' && <div className="pointer-events-none absolute left-0 right-0 z-20 border-t border-rose-500" style={{ top: (14 * 60 + 32 - 480) / 60 * 64 }}><span className="absolute -left-0.5 -top-2.5 rounded-r-md bg-rose-500 px-1.5 py-0.5 text-[7px] font-black text-white">14:32</span></div>}
              </div>
            </div>
            {!filteredAppointments.length && <div className="absolute inset-x-0 top-80 text-center"><CalendarDays className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-[10px] font-bold text-slate-500">Không có lịch phù hợp với bộ lọc</p></div>}
          </div>
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
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]">
          <button type="button" aria-label="Đóng chi tiết lịch hẹn" onClick={() => setSelectedAppointment(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <aside className="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase tracking-wide text-violet-600">{selectedAppointment.id}</span>{selectedAppointment.firstVisit && <span className="rounded bg-violet-50 px-2 py-0.5 text-[7px] font-bold text-violet-600">Khách mới</span>}</div><h2 className="mt-2 text-lg font-black text-slate-900">Chi tiết lịch hẹn</h2><p className="mt-1 text-[9px] text-slate-400">Tạo lúc {selectedAppointment.createdAt}</p></div><button type="button" onClick={() => setSelectedAppointment(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold text-slate-400">{toDate(selectedAppointment.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p><p className="mt-2 text-2xl font-black">{selectedAppointment.start}–{getEndTime(selectedAppointment.start, selectedAppointment.duration)}</p><p className="mt-1 text-[9px] text-slate-400">{selectedAppointment.duration} phút · {branchLabels[selectedAppointment.branch]}</p></div><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selectedAppointment.status].badge}`}>{statusMeta[selectedAppointment.status].label}</span></div></div>

              <div className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-[10px] font-black text-violet-700">{selectedAppointment.customer.split(' ').slice(-2).map((word) => word[0]).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-800">{selectedAppointment.customer}</p><p className="mt-1 text-[8px] text-slate-400">Khách hàng · {selectedAppointment.firstVisit ? 'Lần đầu sử dụng dịch vụ' : 'Đã có hồ sơ tại salon'}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><a href={`tel:${selectedAppointment.phone.replace(/\s/g, '')}`} className="flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-100 text-[8px] font-bold text-slate-700 no-underline"><Phone className="h-3.5 w-3.5" />{selectedAppointment.phone}</a><button type="button" className="flex h-9 items-center justify-center gap-2 border-0 bg-violet-50 text-[8px] font-bold text-violet-700 shadow-none"><MessageCircle className="h-3.5 w-3.5" />Gửi tin nhắn</button></div></div>

              <div className="mt-5 space-y-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600"><Sparkles className="h-4 w-4" /></span><div><p className="text-[8px] font-bold text-slate-400">Dịch vụ</p><p className="mt-1 text-[10px] font-black text-slate-800">{selectedAppointment.service}</p><p className="mt-1 text-[8px] text-slate-400">{selectedAppointment.duration} phút · {formatCurrency(selectedAppointment.price)}</p></div></div><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound className="h-4 w-4" /></span><div><p className="text-[8px] font-bold text-slate-400">Nhân viên phụ trách</p><p className="mt-1 text-[10px] font-black text-slate-800">{selectedAppointment.staff}</p><p className="mt-1 text-[8px] text-slate-400">{staffDirectory.find((staff) => staff.name === selectedAppointment.staff)?.role}</p></div></div><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ReceiptText className="h-4 w-4" /></span><div><p className="text-[8px] font-bold text-slate-400">Thanh toán</p><p className="mt-1 text-[10px] font-black text-slate-800">Đã cọc {formatCurrency(selectedAppointment.deposit)}</p><p className="mt-1 text-[8px] text-slate-400">Còn lại {formatCurrency(Math.max(0, selectedAppointment.price - selectedAppointment.deposit))} · {sourceLabels[selectedAppointment.source]}</p></div></div></div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Ghi chú phục vụ</p><p className="mt-2 text-[9px] leading-5 text-slate-600">{selectedAppointment.note || 'Chưa có ghi chú cho lịch hẹn này.'}</p></div>

              {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selectedAppointment.status) && <div className="mt-5"><p className="mb-2 text-[8px] font-black uppercase tracking-wide text-slate-400">Cập nhật trạng thái</p><div className="flex gap-1.5">{(['CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'] as AppointmentStatus[]).map((status, index) => {
                const order: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'];
                const isReached = order.indexOf(selectedAppointment.status) >= order.indexOf(status);
                return <div key={status} className="min-w-0 flex-1"><div className={`h-1.5 rounded-full ${isReached ? 'bg-violet-500' : 'bg-slate-100'}`} /><p className={`mt-1.5 truncate text-center text-[6px] font-bold ${isReached ? 'text-violet-600' : 'text-slate-300'}`}>{index === 0 ? 'Xác nhận' : index === 1 ? 'Đã đến' : index === 2 ? 'Phục vụ' : 'Xong'}</p></div>;
              })}</div></div>}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><div className="flex gap-2"><button type="button" onClick={() => openEditForm(selectedAppointment)} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Pencil className="h-3.5 w-3.5" />Chỉnh sửa</button>{nextStatus[selectedAppointment.status] && <button type="button" onClick={() => updateAppointment(selectedAppointment.id, { status: nextStatus[selectedAppointment.status]! })} className="flex h-11 flex-1 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Check className="h-4 w-4" />{nextStatusLabel[selectedAppointment.status]}</button>}</div>{!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selectedAppointment.status) && <button type="button" onClick={() => updateAppointment(selectedAppointment.id, { status: 'CANCELLED' })} className="mt-2 flex h-9 w-full items-center justify-center border-0 bg-transparent text-[8px] font-bold text-rose-600 shadow-none">Hủy lịch hẹn</button>}</div>
          </aside>
        </div>
      )}

      {formMode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Đóng biểu mẫu" onClick={() => setFormMode(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <form onSubmit={submitAppointment} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><h2 className="text-base font-black text-slate-900">{formMode === 'CREATE' ? 'Tạo lịch hẹn mới' : `Chỉnh sửa ${selectedAppointment?.id}`}</h2><p className="mt-1 text-[9px] text-slate-500">Điền thông tin khách, dịch vụ và thời gian phục vụ.</p></div><button type="button" onClick={() => setFormMode(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div>
            <div className="space-y-5 p-5 sm:p-6">
              {formError && <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{formError}</div>}
              <fieldset><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><UserRound className="h-3.5 w-3.5" /></span>Thông tin khách hàng</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tên khách hàng *</span><input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} className={inputClass} placeholder="Ví dụ: Nguyễn Minh Anh" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số điện thoại *</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="09xx xxx xxx" /></label></div></fieldset>
              <fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600"><Sparkles className="h-3.5 w-3.5" /></span>Dịch vụ & phân công</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Dịch vụ *</span><BeautifulSelect value={form.service} onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))} className={inputClass}>{services.map((service) => <option key={service.name} value={service.name}>{service.name} · {service.duration} phút</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh *</span><BeautifulSelect value={form.branch} onChange={(event) => { const branch = event.target.value as BranchCode; setForm((current) => ({ ...current, branch, staff: branch === 'Q1' ? 'Hà My' : 'Thảo Nguyễn' })); }} className={inputClass}><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nhân viên phụ trách *</span><BeautifulSelect value={form.staff} onChange={(event) => setForm((current) => ({ ...current, staff: event.target.value }))} className={inputClass}>{staffDirectory.filter((staff) => staff.branch === form.branch).map((staff) => <option key={staff.name} value={staff.name}>{staff.name} · {staff.role}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nguồn đặt lịch</span><BeautifulSelect value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as AppointmentSource }))} className={inputClass}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></label></div></fieldset>
              <fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Clock3 className="h-3.5 w-3.5" /></span>Thời gian & trạng thái</legend><div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ngày *</span><input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Giờ bắt đầu *</span><input type="time" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Trạng thái</span><BeautifulSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))} className={inputClass}>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label></div></fieldset>
              <fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CircleDollarSign className="h-3.5 w-3.5" /></span>Thanh toán & ghi chú</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tiền đặt cọc</span><input type="number" min="0" step="10000" value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} className={inputClass} /></label><div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-[8px] font-bold text-slate-400">Giá dịch vụ dự kiến</p><p className="mt-1 text-[12px] font-black text-slate-800">{formatCurrency(services.find((service) => service.name === form.service)?.price || 0)}</p></div></div><label className="mt-3 block"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ghi chú phục vụ</span><textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Màu tóc mong muốn, lưu ý dị ứng, yêu cầu riêng..." /></label></fieldset>
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setFormMode(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><CalendarCheck2 className="h-4 w-4" />{formMode === 'CREATE' ? 'Lưu lịch hẹn' : 'Lưu thay đổi'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
