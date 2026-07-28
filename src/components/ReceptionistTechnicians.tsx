import { useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  Filter,
  Gauge,
  Grid3X3,
  LayoutList,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type BranchCode = 'Q1' | 'Q3';
type TechnicianStatus =
  | 'PRESENT'
  | 'NOT_CHECKED_IN'
  | 'SERVING'
  | 'BREAK'
  | 'SICK_REPORTED'
  | 'ON_LEAVE'
  | 'LATE';
type TechnicianShift = 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
type ViewMode = 'CARDS' | 'TIMELINE';
type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';

interface Technician {
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

interface Appointment {
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
  station?: string;
  note: string;
  reminderSent?: boolean;
  createdBy?: string;
  firstVisit?: boolean;
  createdAt: string;
}

interface ReceptionistTechniciansProps {
  technicians: Technician[];
  appointments: Appointment[];
  selectedBranch: BranchCode;
  branchName: string;
  roleLabel?: string;
  onTechniciansChange: (items: Technician[]) => void;
  onAppointmentsChange: (items: Appointment[]) => void;
  onNotify?: (message: string) => void;
  onOpenAppointments?: (query?: string) => void;
}

interface ProfileMeta {
  phone: string;
  employeeCode: string;
  rating: number;
  reviews: number;
  experience: string;
  preferredArea: string;
  color: string;
}

const profiles: Record<string, ProfileMeta> = {
  'Thảo Nguyễn': {
    phone: '0903 218 607',
    employeeCode: 'NV-001',
    rating: 4.9,
    reviews: 186,
    experience: '5 năm',
    preferredArea: 'Manicure · VIP',
    color: 'from-violet-500 to-fuchsia-500',
  },
  'Minh Châu': {
    phone: '0938 421 506',
    employeeCode: 'NV-002',
    rating: 4.8,
    reviews: 142,
    experience: '4 năm',
    preferredArea: 'Pedicure',
    color: 'from-cyan-500 to-blue-500',
  },
  'Quốc Bảo': {
    phone: '0918 337 220',
    employeeCode: 'NV-003',
    rating: 4.7,
    reviews: 98,
    experience: '3 năm',
    preferredArea: 'Manicure',
    color: 'from-amber-500 to-orange-500',
  },
  'Thuỳ Dương': {
    phone: '0908 114 906',
    employeeCode: 'NV-004',
    rating: 4.8,
    reviews: 121,
    experience: '3 năm',
    preferredArea: 'Manicure',
    color: 'from-emerald-500 to-teal-500',
  },
  'An Nhiên': {
    phone: '0977 305 812',
    employeeCode: 'NV-005',
    rating: 4.9,
    reviews: 154,
    experience: '4 năm',
    preferredArea: 'Nail Art · VIP',
    color: 'from-pink-500 to-rose-500',
  },
  'Khánh Vy': {
    phone: '0902 619 550',
    employeeCode: 'NV-006',
    rating: 4.7,
    reviews: 110,
    experience: '4 năm',
    preferredArea: 'VIP',
    color: 'from-slate-500 to-slate-700',
  },
  'Hà My': {
    phone: '0934 586 219',
    employeeCode: 'NV-011',
    rating: 4.9,
    reviews: 203,
    experience: '6 năm',
    preferredArea: 'VIP',
    color: 'from-violet-500 to-indigo-500',
  },
  'Gia Huy': {
    phone: '0912 790 314',
    employeeCode: 'NV-012',
    rating: 4.7,
    reviews: 89,
    experience: '2 năm',
    preferredArea: 'Manicure',
    color: 'from-cyan-500 to-blue-500',
  },
};

const fallbackProfile: ProfileMeta = {
  phone: 'Chưa cập nhật',
  employeeCode: 'NV—',
  rating: 4.8,
  reviews: 0,
  experience: 'Đang cập nhật',
  preferredArea: 'Theo phân công',
  color: 'from-emerald-500 to-teal-500',
};

const statusMeta: Record<
  TechnicianStatus,
  {
    label: string;
    short: string;
    badge: string;
    dot: string;
    card: string;
    description: string;
  }
> = {
  PRESENT: {
    label: 'Sẵn sàng nhận khách',
    short: 'Sẵn sàng',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    card: 'border-emerald-200',
    description: 'Đã check-in và chưa có khách',
  },
  SERVING: {
    label: 'Đang phục vụ',
    short: 'Đang làm',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    dot: 'bg-violet-500',
    card: 'border-violet-200',
    description: 'Đang thực hiện dịch vụ',
  },
  BREAK: {
    label: 'Đang nghỉ giữa ca',
    short: 'Đang nghỉ',
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    dot: 'bg-cyan-500',
    card: 'border-cyan-200',
    description: 'Tạm dừng nhận khách mới',
  },
  LATE: {
    label: 'Check-in trễ',
    short: 'Đi trễ',
    badge: 'bg-orange-50 text-orange-700 ring-orange-200',
    dot: 'bg-orange-500',
    card: 'border-orange-200',
    description: 'Có mặt nhưng vào ca trễ',
  },
  NOT_CHECKED_IN: {
    label: 'Chưa check-in',
    short: 'Chưa đến',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
    card: 'border-slate-200',
    description: 'Chưa ghi nhận vào ca',
  },
  SICK_REPORTED: {
    label: 'Đã báo nghỉ',
    short: 'Báo nghỉ',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
    card: 'border-rose-200',
    description: 'Báo nghỉ đột xuất trong ngày',
  },
  ON_LEAVE: {
    label: 'Nghỉ phép',
    short: 'Nghỉ phép',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    card: 'border-amber-200',
    description: 'Nghỉ theo lịch đã được duyệt',
  },
};

const shiftMeta: Record<TechnicianShift, { label: string; start: string; end: string }> = {
  MORNING: { label: 'Ca sáng', start: '08:00', end: '16:00' },
  AFTERNOON: { label: 'Ca chiều', start: '12:00', end: '20:00' },
  FULL_DAY: { label: 'Cả ngày', start: '08:00', end: '20:00' },
};

const appointmentStatusMeta: Record<string, { label: string; badge: string }> = {
  PENDING: { label: 'Chờ xác nhận', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  CONFIRMED: { label: 'Đã xác nhận', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  CHECKED_IN: { label: 'Khách đang chờ', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  IN_SERVICE: { label: 'Đang phục vụ', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  COMPLETED: { label: 'Hoàn tất', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const getToday = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const nowLabel = () =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

const minutesFromTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const endTime = (appointment: Appointment) => {
  const total = minutesFromTime(appointment.start) + appointment.duration;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const serviceParts = (appointment: Appointment) =>
  appointment.services?.length
    ? appointment.services
    : appointment.service
        .split('+')
        .map((item) => item.trim())
        .filter(Boolean);

const canPerform = (technician: Technician, appointment: Appointment) => {
  const skills = technician.skills.map((skill) => skill.toLocaleLowerCase('vi'));
  return serviceParts(appointment).every((service) => {
    const target = service.toLocaleLowerCase('vi');
    return skills.some((skill) => skill === target || target.includes(skill) || skill.includes(target));
  });
};

const overlaps = (first: Appointment, second: Appointment) => {
  const firstStart = minutesFromTime(first.start);
  const firstEnd = firstStart + first.duration;
  const secondStart = minutesFromTime(second.start);
  const secondEnd = secondStart + second.duration;
  return firstStart < secondEnd && secondStart < firstEnd;
};

const profileFor = (technician: Technician) => profiles[technician.name] || {
  ...fallbackProfile,
  employeeCode: technician.id,
  color: technician.avatarTone || fallbackProfile.color,
};

export default function ReceptionistTechnicians({
  technicians,
  appointments,
  selectedBranch,
  branchName,
  roleLabel = 'Receptionist',
  onTechniciansChange,
  onAppointmentsChange,
  onNotify,
  onOpenAppointments,
}: ReceptionistTechniciansProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TechnicianStatus>('ALL');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | TechnicianShift>('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('CARDS');
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [assigningAppointment, setAssigningAppointment] = useState<Appointment | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [formError, setFormError] = useState('');
  const [statusForm, setStatusForm] = useState<{
    status: TechnicianStatus;
    checkIn: string;
    checkOut: string;
    note: string;
  }>({ status: 'PRESENT', checkIn: '', checkOut: '', note: '' });

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.branch === selectedBranch)
        .filter((appointment) => appointment.date === getToday())
        .filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status))
        .sort((first, second) => first.start.localeCompare(second.start)),
    [appointments, selectedBranch],
  );

  const branchTechnicians = useMemo(
    () => technicians.filter((technician) => technician.branch === selectedBranch),
    [selectedBranch, technicians],
  );

  const skills = useMemo(
    () => ['ALL', ...Array.from(new Set(branchTechnicians.flatMap((technician) => technician.skills))).sort()],
    [branchTechnicians],
  );

  const technicianAppointments = (name: string) =>
    todayAppointments.filter((appointment) => appointment.staff === name);

  const workload = (technician: Technician) => {
    const items = technicianAppointments(technician.name);
    const bookedMinutes = items.reduce((sum, appointment) => sum + appointment.duration, 0);
    const completed = items.filter((appointment) => appointment.status === 'COMPLETED').length;
    const active = items.find((appointment) => appointment.status === 'IN_SERVICE');
    const waiting = items.find((appointment) => appointment.status === 'CHECKED_IN');
    const next = items.find((appointment) => ['PENDING', 'CONFIRMED'].includes(appointment.status));
    const capacityMinutes = technician.shift === 'FULL_DAY' ? 600 : 420;
    const percent = Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100));
    return { items, bookedMinutes, completed, active, waiting, next, percent };
  };

  const filteredTechnicians = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return branchTechnicians
      .filter((technician) => statusFilter === 'ALL' || technician.status === statusFilter)
      .filter((technician) => shiftFilter === 'ALL' || technician.shift === shiftFilter)
      .filter((technician) => skillFilter === 'ALL' || technician.skills.includes(skillFilter))
      .filter(
        (technician) =>
          !normalizedQuery ||
          `${technician.name} ${technician.specialty} ${technician.id} ${technician.skills.join(' ')}`
            .toLocaleLowerCase('vi')
            .includes(normalizedQuery),
      );
  }, [branchTechnicians, query, shiftFilter, skillFilter, statusFilter]);

  const unassignedAppointments = todayAppointments.filter(
    (appointment) =>
      appointment.staff === 'Chưa phân công' &&
      ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(appointment.status),
  );
  const readyCount = branchTechnicians.filter((technician) => technician.status === 'PRESENT').length;
  const servingCount = branchTechnicians.filter((technician) => technician.status === 'SERVING').length;
  const attendanceExceptions = branchTechnicians.filter((technician) =>
    ['NOT_CHECKED_IN', 'LATE', 'SICK_REPORTED', 'ON_LEAVE'].includes(technician.status),
  );
  const bookedMinutes = branchTechnicians.reduce(
    (sum, technician) => sum + workload(technician).bookedMinutes,
    0,
  );
  const averageLoad = branchTechnicians.length
    ? Math.round(
        branchTechnicians.reduce((sum, technician) => sum + workload(technician).percent, 0) /
          branchTechnicians.length,
      )
    : 0;

  const assignableTechnicians = useMemo(() => {
    if (!assigningAppointment) return [];
    return branchTechnicians
      .filter((technician) => ['PRESENT', 'SERVING', 'LATE'].includes(technician.status))
      .filter((technician) => canPerform(technician, assigningAppointment))
      .map((technician) => {
        const existing = technicianAppointments(technician.name);
        const conflict = existing.find((appointment) => overlaps(appointment, assigningAppointment));
        return { technician, conflict, load: workload(technician) };
      })
      .sort((first, second) => {
        if (Boolean(first.conflict) !== Boolean(second.conflict)) return first.conflict ? 1 : -1;
        return first.load.bookedMinutes - second.load.bookedMinutes;
      });
  }, [assigningAppointment, branchTechnicians, todayAppointments]);

  const selectedAssignment = assignableTechnicians.find(
    (item) => item.technician.id === selectedTechnicianId,
  );

  const openStatusEditor = (technician: Technician) => {
    setEditingTechnician(technician);
    setStatusForm({
      status: technician.status,
      checkIn: technician.checkIn || '',
      checkOut: technician.checkOut || '',
      note: technician.leaveNote || '',
    });
    setFormError('');
  };

  const saveStatus = (event: FormEvent) => {
    event.preventDefault();
    if (!editingTechnician) return;
    const active = technicianAppointments(editingTechnician.name).find(
      (appointment) => appointment.status === 'IN_SERVICE',
    );
    if (
      active &&
      (['BREAK', 'NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE'].includes(statusForm.status) ||
        statusForm.checkOut)
    ) {
      setFormError(
        `${editingTechnician.name} đang phục vụ ${active.customer}. Cần hoàn tất hoặc bàn giao khách trước.`,
      );
      return;
    }
    if (
      ['SICK_REPORTED', 'ON_LEAVE'].includes(statusForm.status) &&
      statusForm.note.trim().length < 8
    ) {
      setFormError('Vui lòng ghi rõ lý do hoặc thông tin xác nhận nghỉ.');
      return;
    }
    if (statusForm.checkIn && statusForm.checkOut && statusForm.checkOut < statusForm.checkIn) {
      setFormError('Giờ check-out phải sau giờ check-in.');
      return;
    }

    onTechniciansChange(
      technicians.map((technician) =>
        technician.id === editingTechnician.id
          ? {
              ...technician,
              status: statusForm.status,
              checkIn: statusForm.checkIn || undefined,
              checkOut: statusForm.checkOut || undefined,
              leaveNote: statusForm.note.trim() || undefined,
            }
          : technician,
      ),
    );
    setSelectedTechnician((current) =>
      current?.id === editingTechnician.id
        ? {
            ...current,
            status: statusForm.status,
            checkIn: statusForm.checkIn || undefined,
            checkOut: statusForm.checkOut || undefined,
            leaveNote: statusForm.note.trim() || undefined,
          }
        : current,
    );
    onNotify?.(`Đã cập nhật trạng thái của ${editingTechnician.name}.`);
    setEditingTechnician(null);
  };

  const openAssignment = (appointment: Appointment) => {
    setAssigningAppointment(appointment);
    setSelectedTechnicianId('');
    setFormError('');
  };

  const submitAssignment = (event: FormEvent) => {
    event.preventDefault();
    if (!assigningAppointment || !selectedAssignment) {
      setFormError('Vui lòng chọn kỹ thuật viên phù hợp.');
      return;
    }
    if (selectedAssignment.conflict) {
      setFormError(
        `${selectedAssignment.technician.name} đã có lịch ${selectedAssignment.conflict.start} với ${selectedAssignment.conflict.customer}.`,
      );
      return;
    }

    onAppointmentsChange(
      appointments.map((appointment) =>
        appointment.id === assigningAppointment.id
          ? { ...appointment, staff: selectedAssignment.technician.name }
          : appointment,
      ),
    );
    onNotify?.(
      `Đã phân công ${selectedAssignment.technician.name} cho ${assigningAppointment.customer}.`,
    );
    setAssigningAppointment(null);
  };

  const timelineHours = Array.from({ length: 13 }, (_, index) => 8 + index);
  const timelineStart = 8 * 60;
  const timelineDuration = 12 * 60;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#063b32] via-[#075e4e] to-[#0e7662] p-5 text-white shadow-xl shadow-emerald-950/10 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-100">
              <UsersRound className="h-3.5 w-3.5" />
              Điều phối kỹ thuật viên
            </span>
            <h1 className="mt-4 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">
              Đúng người, đúng kỹ năng, đúng khung giờ
            </h1>
            <p className="mt-2 max-w-2xl text-[11px] font-semibold leading-5 text-emerald-50/75 sm:text-xs">
              Theo dõi nhân sự theo thời gian thực, cân bằng tải và phân công khách nhanh tại {branchName}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-xl bg-white/10 px-3 py-2 text-[9px] font-bold text-emerald-50">
                {readyCount} người sẵn sàng
              </span>
              <span className="rounded-xl bg-white/10 px-3 py-2 text-[9px] font-bold text-emerald-50">
                {unassignedAppointments.length} khách cần phân công
              </span>
              <span className="rounded-xl bg-white/10 px-3 py-2 text-[9px] font-bold text-emerald-50">
                Tải trung bình {averageLoad}%
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/10 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100">
                  Quyền {roleLabel.split('·')[0].trim()}
                </p>
                <p className="mt-1 text-[9px] leading-4 text-emerald-50/70">
                  Được xem lịch, cập nhật trạng thái vận hành và phân công khách. Hồ sơ nghề nghiệp,
                  bảng lương, hoa hồng và phê duyệt nghỉ thuộc quyền quản lý.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: 'Nhân sự trong ca',
            value: branchTechnicians.length,
            note: `${branchTechnicians.filter((item) => item.checkIn).length} đã check-in`,
            icon: UsersRound,
            tone: 'bg-blue-50 text-blue-700',
          },
          {
            label: 'Sẵn sàng',
            value: readyCount,
            note: 'Có thể nhận khách ngay',
            icon: CheckCircle2,
            tone: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Đang phục vụ',
            value: servingCount,
            note: `${todayAppointments.filter((item) => item.status === 'IN_SERVICE').length} dịch vụ đang làm`,
            icon: Activity,
            tone: 'bg-violet-50 text-violet-700',
          },
          {
            label: 'Phút đã đặt',
            value: bookedMinutes,
            note: `Tải trung bình ${averageLoad}%`,
            icon: Gauge,
            tone: 'bg-cyan-50 text-cyan-700',
          },
          {
            label: 'Cần chú ý',
            value: attendanceExceptions.length + unassignedAppointments.length,
            note: `${attendanceExceptions.length} biến động ca · ${unassignedAppointments.length} chưa phân công`,
            icon: AlertTriangle,
            tone: 'bg-amber-50 text-amber-700',
          },
        ].map(({ label, value, note, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.09em] text-brand-text-muted">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-brand-text">{value}</p>
                <p className="mt-1 text-[9px] font-semibold text-brand-text-muted">{note}</p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-brand-outline bg-brand-surface p-3 shadow-sm sm:p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_160px_160px_210px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tên, mã nhân viên, kỹ năng..."
                  className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 pl-10 pr-3 text-xs font-semibold text-brand-text outline-none transition focus:border-emerald-500 focus:bg-brand-surface focus:ring-4 focus:ring-emerald-500/10"
                  aria-label="Tìm kỹ thuật viên"
                />
              </label>
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TechnicianStatus)}
                className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-[10px] font-bold text-brand-text"
                aria-label="Lọc trạng thái"
              >
                <option value="ALL">Mọi trạng thái</option>
                {Object.entries(statusMeta).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.short}
                  </option>
                ))}
              </BeautifulSelect>
              <BeautifulSelect
                value={shiftFilter}
                onChange={(event) => setShiftFilter(event.target.value as 'ALL' | TechnicianShift)}
                className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-[10px] font-bold text-brand-text"
                aria-label="Lọc ca làm"
              >
                <option value="ALL">Mọi ca làm</option>
                {Object.entries(shiftMeta).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </BeautifulSelect>
              <BeautifulSelect
                value={skillFilter}
                onChange={(event) => setSkillFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-[10px] font-bold text-brand-text"
                aria-label="Lọc kỹ năng"
              >
                {skills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill === 'ALL' ? 'Mọi kỹ năng' : skill}
                  </option>
                ))}
              </BeautifulSelect>
              <div className="flex rounded-xl border border-brand-outline bg-brand-surface-high/50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('CARDS')}
                  className={`flex h-9 w-10 items-center justify-center rounded-lg border-0 p-0 shadow-none ${
                    viewMode === 'CARDS'
                      ? 'bg-brand-surface text-emerald-600 shadow-sm'
                      : 'bg-transparent text-brand-text-muted'
                  }`}
                  aria-label="Xem dạng thẻ"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TIMELINE')}
                  className={`flex h-9 w-10 items-center justify-center rounded-lg border-0 p-0 shadow-none ${
                    viewMode === 'TIMELINE'
                      ? 'bg-brand-surface text-emerald-600 shadow-sm'
                      : 'bg-transparent text-brand-text-muted'
                  }`}
                  aria-label="Xem lịch tải"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-brand-outline pt-3">
              <p className="flex items-center gap-2 text-[9px] font-bold text-brand-text-muted">
                <Filter className="h-3.5 w-3.5" />
                Hiển thị {filteredTechnicians.length}/{branchTechnicians.length} kỹ thuật viên
              </p>
              {(query || statusFilter !== 'ALL' || shiftFilter !== 'ALL' || skillFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('ALL');
                    setShiftFilter('ALL');
                    setSkillFilter('ALL');
                  }}
                  className="h-auto border-0 bg-transparent p-0 text-[9px] font-black text-emerald-600 shadow-none"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </section>

          {viewMode === 'CARDS' ? (
            <section className="grid gap-3 xl:grid-cols-2">
              {filteredTechnicians.map((technician) => {
                const meta = statusMeta[technician.status];
                const profile = profileFor(technician);
                const load = workload(technician);
                const focusAppointment = load.active || load.waiting || load.next;
                return (
                  <article
                    key={technician.id}
                    className={`group overflow-hidden rounded-2xl border bg-brand-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.card}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTechnician(technician)}
                      className="block h-auto w-full rounded-none border-0 bg-transparent p-0 text-left shadow-none"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-black text-white shadow-sm ${profile.color}`}>
                            {technician.initials}
                            <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-brand-surface ${meta.dot}`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-sm font-black text-brand-text">
                                {technician.name}
                              </h2>
                              <span className={`rounded-full px-2.5 py-1 text-[8px] font-black ring-1 ${meta.badge}`}>
                                {meta.short}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[10px] font-bold text-brand-text-muted">
                              {profile.employeeCode} · {technician.specialty}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] font-bold text-brand-text-muted">
                              <span className="flex items-center gap-1 text-amber-600">
                                <Star className="h-3 w-3 fill-amber-400" />
                                {profile.rating} ({profile.reviews})
                              </span>
                              <span>•</span>
                              <span>{shiftMeta[technician.shift].label}</span>
                              <span>•</span>
                              <span>{profile.preferredArea}</span>
                            </div>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-brand-text-muted transition group-hover:translate-x-0.5" />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-brand-surface-high/55 p-2.5">
                            <p className="text-[7px] font-bold uppercase text-brand-text-muted">Lịch hôm nay</p>
                            <p className="mt-1 text-xs font-black text-brand-text">{load.items.length}</p>
                          </div>
                          <div className="rounded-xl bg-brand-surface-high/55 p-2.5">
                            <p className="text-[7px] font-bold uppercase text-brand-text-muted">Đã xong</p>
                            <p className="mt-1 text-xs font-black text-brand-text">{load.completed}</p>
                          </div>
                          <div className="rounded-xl bg-brand-surface-high/55 p-2.5">
                            <p className="text-[7px] font-bold uppercase text-brand-text-muted">Đã đặt</p>
                            <p className="mt-1 text-xs font-black text-brand-text">{load.bookedMinutes}′</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[8px] font-bold">
                            <span className="text-brand-text-muted">Công suất ca</span>
                            <span className={load.percent >= 85 ? 'text-amber-600' : 'text-emerald-600'}>
                              {load.percent}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-surface-high">
                            <div
                              className={`h-full rounded-full ${
                                load.percent >= 85
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${load.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-brand-outline bg-brand-surface-high/25 px-4 py-3">
                        {focusAppointment ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-wide text-brand-text-muted">
                                {load.active
                                  ? 'Đang phục vụ'
                                  : load.waiting
                                    ? 'Khách đang chờ'
                                    : 'Lịch kế tiếp'}
                              </p>
                              <p className="mt-1 truncate text-[10px] font-black text-brand-text">
                                {focusAppointment.start} · {focusAppointment.customer}
                              </p>
                              <p className="mt-0.5 truncate text-[8px] font-semibold text-brand-text-muted">
                                {focusAppointment.service}
                                {focusAppointment.station ? ` · ${focusAppointment.station}` : ''}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-black ring-1 ${
                              appointmentStatusMeta[focusAppointment.status]?.badge ||
                              'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}>
                              {appointmentStatusMeta[focusAppointment.status]?.label || focusAppointment.status}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[9px] font-bold text-brand-text-muted">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                            Chưa có lịch tiếp theo
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="flex gap-2 border-t border-brand-outline px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openStatusEditor(technician)}
                        className="flex h-9 flex-1 items-center justify-center gap-2 border border-brand-outline bg-brand-surface text-[8px] font-black text-brand-text shadow-sm"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Cập nhật trạng thái
                      </button>
                      {profile.phone !== 'Chưa cập nhật' && (
                        <a
                          href={`tel:${profile.phone.replace(/\s/g, '')}`}
                          className="flex h-9 w-10 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted"
                          aria-label={`Gọi ${technician.name}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-sm">
              <div className="border-b border-brand-outline p-4">
                <h2 className="text-sm font-black text-brand-text">Lịch tải kỹ thuật viên hôm nay</h2>
                <p className="mt-1 text-[9px] font-semibold text-brand-text-muted">
                  Quan sát khoảng trống và phát hiện trùng lịch từ 08:00–20:00.
                </p>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[1040px]">
                  <div className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-brand-outline bg-brand-surface-high/40">
                    <div className="border-r border-brand-outline px-4 py-3 text-[8px] font-black uppercase text-brand-text-muted">
                      Kỹ thuật viên
                    </div>
                    <div className="relative h-10">
                      {timelineHours.map((hour, index) => (
                        <span
                          key={hour}
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-bold text-brand-text-muted"
                          style={{ left: `${(index / 12) * 100}%` }}
                        >
                          {String(hour).padStart(2, '0')}:00
                        </span>
                      ))}
                    </div>
                  </div>
                  {filteredTechnicians.map((technician) => {
                    const meta = statusMeta[technician.status];
                    const profile = profileFor(technician);
                    const items = technicianAppointments(technician.name);
                    return (
                      <div
                        key={technician.id}
                        className="grid min-h-20 grid-cols-[190px_minmax(0,1fr)] border-b border-brand-outline last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedTechnician(technician)}
                          className="flex h-auto items-center gap-3 rounded-none border-0 border-r border-brand-outline bg-transparent px-4 py-3 text-left shadow-none"
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[9px] font-black text-white ${profile.color}`}>
                            {technician.initials}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[9px] font-black text-brand-text">
                              {technician.name}
                            </span>
                            <span className="mt-1 flex items-center gap-1 text-[7px] font-bold text-brand-text-muted">
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.short}
                            </span>
                          </span>
                        </button>
                        <div className="relative my-2 overflow-hidden rounded-lg bg-brand-surface-high/35">
                          {timelineHours.map((hour) => (
                            <span
                              key={hour}
                              className="absolute inset-y-0 border-l border-brand-outline/70"
                              style={{ left: `${((hour * 60 - timelineStart) / timelineDuration) * 100}%` }}
                            />
                          ))}
                          {items.map((appointment) => {
                            const start = Math.max(0, minutesFromTime(appointment.start) - timelineStart);
                            const width = Math.min(
                              timelineDuration - start,
                              Math.max(20, appointment.duration),
                            );
                            const active = appointment.status === 'IN_SERVICE';
                            return (
                              <button
                                key={appointment.id}
                                type="button"
                                onClick={() => onOpenAppointments?.(appointment.customer)}
                                className={`absolute top-2 h-12 overflow-hidden rounded-lg border px-2 text-left shadow-sm ${
                                  active
                                    ? 'border-violet-300 bg-violet-500 text-white'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                }`}
                                style={{
                                  left: `${(start / timelineDuration) * 100}%`,
                                  width: `${(width / timelineDuration) * 100}%`,
                                  minWidth: '72px',
                                }}
                                title={`${appointment.start}–${endTime(appointment)} · ${appointment.customer}`}
                              >
                                <span className="block truncate text-[7px] font-black">
                                  {appointment.start} · {appointment.customer}
                                </span>
                                <span className={`mt-1 block truncate text-[6px] font-semibold ${active ? 'text-violet-100' : 'text-emerald-600'}`}>
                                  {appointment.service}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {!filteredTechnicians.length && (
            <section className="rounded-2xl border border-dashed border-brand-outline bg-brand-surface p-12 text-center">
              <UsersRound className="mx-auto h-9 w-9 text-brand-text-muted" />
              <p className="mt-3 text-sm font-black text-brand-text">Không tìm thấy kỹ thuật viên</p>
              <p className="mt-1 text-[10px] font-semibold text-brand-text-muted">
                Hãy thay đổi từ khóa hoặc bộ lọc đang áp dụng.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-brand-outline px-4 py-3.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-brand-text-muted">
                  Cần phân công
                </p>
                <p className="mt-1 text-[9px] font-semibold text-brand-text-muted">
                  Ưu tiên khách đã check-in
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                unassignedAppointments.length
                  ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              }`}>
                {unassignedAppointments.length}
              </span>
            </div>
            <div className="divide-y divide-brand-outline">
              {unassignedAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black text-brand-text">
                        {appointment.customer}
                      </p>
                      <p className="mt-1 text-[8px] font-semibold text-brand-text-muted">
                        {appointment.start} · {appointment.duration} phút
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-black ring-1 ${
                      appointmentStatusMeta[appointment.status]?.badge ||
                      'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}>
                      {appointmentStatusMeta[appointment.status]?.label || appointment.status}
                    </span>
                  </div>
                  <p className="mt-2 text-[8px] font-bold leading-4 text-brand-text-muted">
                    {appointment.service}
                  </p>
                  <button
                    type="button"
                    onClick={() => openAssignment(appointment)}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-emerald-700 bg-emerald-600 text-[8px] font-black text-white shadow-sm"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Chọn kỹ thuật viên
                  </button>
                </div>
              ))}
              {!unassignedAppointments.length && (
                <div className="p-6 text-center">
                  <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                  <p className="mt-2 text-[9px] font-black text-brand-text">Đã phân công đầy đủ</p>
                  <p className="mt-1 text-[8px] text-brand-text-muted">Không còn khách chờ xử lý.</p>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-sm">
            <div className="border-b border-brand-outline px-4 py-3.5">
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-brand-text-muted">
                Biến động ca hôm nay
              </p>
            </div>
            <div className="divide-y divide-brand-outline">
              {attendanceExceptions.map((technician) => {
                const meta = statusMeta[technician.status];
                return (
                  <button
                    key={technician.id}
                    type="button"
                    onClick={() => openStatusEditor(technician)}
                    className="flex h-auto w-full items-start gap-3 rounded-none border-0 bg-transparent p-4 text-left shadow-none"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9px] font-black text-brand-text">{technician.name}</span>
                      <span className="mt-1 block text-[8px] font-semibold text-brand-text-muted">
                        {meta.label}
                        {technician.checkIn ? ` · ${technician.checkIn}` : ''}
                      </span>
                      {technician.leaveNote && (
                        <span className="mt-1 block text-[8px] leading-4 text-brand-text-muted">
                          {technician.leaveNote}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-text-muted" />
                  </button>
                );
              })}
              {!attendanceExceptions.length && (
                <div className="p-6 text-center text-[9px] font-bold text-brand-text-muted">
                  Ca làm đang ổn định.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-[9px] font-black text-brand-text">Nguyên tắc phân công</p>
                <ul className="mt-2 space-y-2 text-[8px] font-semibold leading-4 text-brand-text-muted">
                  <li>• Khớp toàn bộ kỹ năng của dịch vụ.</li>
                  <li>• Không trùng thời gian với lịch đã có.</li>
                  <li>• Ưu tiên người có tải thấp hơn.</li>
                  <li>• Không phân công người chưa vào ca hoặc đang nghỉ.</li>
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </section>

      {selectedTechnician && (() => {
        const technician = technicians.find((item) => item.id === selectedTechnician.id) || selectedTechnician;
        const meta = statusMeta[technician.status];
        const profile = profileFor(technician);
        const load = workload(technician);
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
            <button
              type="button"
              className="absolute inset-0 min-h-0 rounded-none border-0 bg-slate-950/60 p-0 shadow-none backdrop-blur-sm"
              onClick={() => setSelectedTechnician(null)}
              aria-label="Đóng chi tiết kỹ thuật viên"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="technician-detail-title"
              className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-brand-surface shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
            >
              <header className="relative overflow-hidden bg-gradient-to-br from-[#073d34] to-[#0b6a57] px-5 py-5 text-white sm:px-7">
                <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-black text-white shadow-lg ${profile.color}`}>
                      {technician.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-emerald-200">
                        {profile.employeeCode} · {technician.branch}
                      </p>
                      <h2 id="technician-detail-title" className="mt-1 truncate text-xl font-black">{technician.name}</h2>
                      <p className="mt-1 text-[10px] font-semibold text-emerald-50/70">
                        {technician.specialty}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTechnician(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 bg-white/10 p-0 text-white shadow-none"
                    aria-label="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[8px] font-black ring-1 ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-bold text-emerald-50">
                    {shiftMeta[technician.shift].label} · {shiftMeta[technician.shift].start}–{shiftMeta[technician.shift].end}
                  </span>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
                <section className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Lịch hôm nay', value: load.items.length },
                    { label: 'Hoàn tất', value: load.completed },
                    { label: 'Phút đã đặt', value: `${load.bookedMinutes}′` },
                    { label: 'Công suất', value: `${load.percent}%` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-brand-surface-high/55 p-3">
                      <p className="text-[7px] font-black uppercase text-brand-text-muted">{item.label}</p>
                      <p className="mt-2 text-base font-black text-brand-text">{item.value}</p>
                    </div>
                  ))}
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-brand-outline p-4">
                    <p className="text-[8px] font-black uppercase tracking-wide text-brand-text-muted">
                      Thông tin liên hệ
                    </p>
                    <div className="mt-3 space-y-2 text-[9px] font-bold text-brand-text">
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-emerald-500" /> {profile.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-amber-500" /> {profile.rating}/5 · {profile.reviews} đánh giá
                      </p>
                      <p className="flex items-center gap-2">
                        <BadgeCheck className="h-3.5 w-3.5 text-blue-500" /> Kinh nghiệm {profile.experience}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-brand-outline p-4">
                    <p className="text-[8px] font-black uppercase tracking-wide text-brand-text-muted">
                      Chấm công hôm nay
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-brand-surface-high/55 p-3">
                        <p className="text-[7px] text-brand-text-muted">Check-in</p>
                        <p className="mt-1 text-xs font-black text-brand-text">{technician.checkIn || '—'}</p>
                      </div>
                      <div className="rounded-xl bg-brand-surface-high/55 p-3">
                        <p className="text-[7px] text-brand-text-muted">Check-out</p>
                        <p className="mt-1 text-xs font-black text-brand-text">{technician.checkOut || '—'}</p>
                      </div>
                    </div>
                    {technician.leaveNote && (
                      <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[8px] font-semibold leading-4 text-amber-700">
                        {technician.leaveNote}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-brand-outline p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-brand-text-muted">
                        Kỹ năng được xác nhận
                      </p>
                      <p className="mt-1 text-[8px] text-brand-text-muted">
                        Chỉ quản lý được cập nhật danh sách này.
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {technician.skills.map((skill) => (
                      <span key={skill} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[8px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-brand-outline">
                  <div className="flex items-center justify-between border-b border-brand-outline bg-brand-surface-high/35 px-4 py-3">
                    <div>
                      <p className="text-[9px] font-black text-brand-text">Lịch làm việc trong ngày</p>
                      <p className="mt-1 text-[8px] text-brand-text-muted">{load.items.length} lịch được phân công</p>
                    </div>
                    <CalendarClock className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="divide-y divide-brand-outline">
                    {load.items.map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => onOpenAppointments?.(appointment.customer)}
                        className="flex h-auto w-full items-start gap-3 rounded-none border-0 bg-transparent p-4 text-left shadow-none"
                      >
                        <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-surface-high text-[9px] font-black text-brand-text">
                          {appointment.start}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[9px] font-black text-brand-text">
                            {appointment.customer}
                          </span>
                          <span className="mt-1 block truncate text-[8px] font-semibold text-brand-text-muted">
                            {appointment.service} · {appointment.duration} phút
                            {appointment.station ? ` · ${appointment.station}` : ''}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-black ring-1 ${
                          appointmentStatusMeta[appointment.status]?.badge ||
                          'bg-slate-100 text-slate-600 ring-slate-200'
                        }`}>
                          {appointmentStatusMeta[appointment.status]?.label || appointment.status}
                        </span>
                      </button>
                    ))}
                    {!load.items.length && (
                      <div className="p-8 text-center text-[9px] font-bold text-brand-text-muted">
                        Chưa có lịch được phân công hôm nay.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <footer className="flex flex-col-reverse gap-2 border-t border-brand-outline bg-brand-surface-high/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="flex items-center gap-2 text-[8px] font-semibold text-brand-text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Thao tác được ghi nhận theo tài khoản lễ tân
                </p>
                <div className="flex gap-2">
                  {profile.phone !== 'Chưa cập nhật' && (
                    <>
                      <a
                        href={`sms:${profile.phone.replace(/\s/g, '')}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted"
                        aria-label={`Nhắn tin ${technician.name}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                      <a
                        href={`tel:${profile.phone.replace(/\s/g, '')}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted"
                        aria-label={`Gọi ${technician.name}`}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => openStatusEditor(technician)}
                    className="flex h-10 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[8px] font-black text-white shadow-sm"
                  >
                    <UserCheck className="h-4 w-4" />
                    Cập nhật trạng thái
                  </button>
                </div>
              </footer>
            </aside>
          </div>
        );
      })()}

      {editingTechnician && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setEditingTechnician(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng cập nhật trạng thái"
          />
          <form onSubmit={saveStatus} className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-brand-surface shadow-2xl">
            <header className="flex items-start justify-between border-b border-brand-outline px-5 py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">
                  Trạng thái vận hành
                </p>
                <h2 className="mt-1 text-lg font-black text-brand-text">
                  Cập nhật {editingTechnician.name}
                </h2>
                <p className="mt-1 text-[9px] text-brand-text-muted">
                  Lễ tân chỉ cập nhật tình trạng trong ngày, không thay đổi hồ sơ nhân sự.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTechnician(null)}
                className="flex h-9 w-9 items-center justify-center border border-brand-outline bg-brand-surface p-0 text-brand-text-muted shadow-sm"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-brand-text-muted">
                  Trạng thái hôm nay
                </span>
                <BeautifulSelect
                  value={statusForm.status}
                  onChange={(event) =>
                    setStatusForm((current) => ({
                      ...current,
                      status: event.target.value as TechnicianStatus,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-[10px] font-bold text-brand-text"
                  aria-label="Trạng thái kỹ thuật viên"
                >
                  {Object.entries(statusMeta).map(([value, item]) => (
                    <option key={value} value={value}>
                      {item.label}
                    </option>
                  ))}
                </BeautifulSelect>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[9px] font-bold text-brand-text-muted">
                    Giờ check-in
                  </span>
                  <input
                    type="time"
                    value={statusForm.checkIn}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, checkIn: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-[9px] font-bold text-brand-text-muted">
                    Giờ check-out
                  </span>
                  <input
                    type="time"
                    value={statusForm.checkOut}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, checkOut: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>
              </div>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-brand-text-muted">
                  Ghi chú biến động ca
                </span>
                <textarea
                  value={statusForm.note}
                  onChange={(event) =>
                    setStatusForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Lý do đi trễ, nghỉ đột xuất hoặc thông tin bàn giao..."
                  className="min-h-24 w-full resize-y rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 py-3 text-[10px] leading-5 text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>
              <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-[8px] leading-4 text-amber-700">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Lễ tân ghi nhận trạng thái; yêu cầu nghỉ phép và chỉnh sửa chấm công chính thức vẫn cần
                quản lý phê duyệt.
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-brand-outline bg-brand-surface-high/35 px-5 py-4">
              <button
                type="button"
                onClick={() => setEditingTechnician(null)}
                className="border border-brand-outline bg-brand-surface px-4 text-[9px] font-bold text-brand-text-muted shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-sm"
              >
                <Check className="h-4 w-4" />
                Lưu trạng thái
              </button>
            </footer>
          </form>
        </div>
      )}

      {assigningAppointment && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setAssigningAppointment(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng phân công"
          />
          <form onSubmit={submitAssignment} className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-brand-surface shadow-2xl">
            <header className="flex items-start justify-between border-b border-brand-outline px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">
                  Phân công thông minh
                </p>
                <h2 className="mt-1 text-lg font-black text-brand-text">
                  Chọn kỹ thuật viên cho {assigningAppointment.customer}
                </h2>
                <p className="mt-1 text-[9px] text-brand-text-muted">
                  {assigningAppointment.start}–{endTime(assigningAppointment)} · {assigningAppointment.service}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningAppointment(null)}
                className="flex h-9 w-9 items-center justify-center border border-brand-outline bg-brand-surface p-0 text-brand-text-muted shadow-sm"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-4 p-5 sm:p-6">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Khách hàng', value: assigningAppointment.customer },
                  { label: 'Thời lượng', value: `${assigningAppointment.duration} phút` },
                  { label: 'Vị trí', value: assigningAppointment.station || 'Chưa xếp ghế' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-brand-surface-high/55 p-3">
                    <p className="text-[7px] font-bold text-brand-text-muted">{item.label}</p>
                    <p className="mt-1 text-[9px] font-black text-brand-text">{item.value}</p>
                  </div>
                ))}
              </div>
              <fieldset>
                <legend className="text-[9px] font-black text-brand-text">
                  Kỹ thuật viên phù hợp ({assignableTechnicians.filter((item) => !item.conflict).length})
                </legend>
                <p className="mt-1 text-[8px] text-brand-text-muted">
                  Đã lọc theo kỹ năng, trạng thái ca và kiểm tra trùng lịch.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {assignableTechnicians.map(({ technician, conflict, load }) => {
                    const profile = profileFor(technician);
                    const active = selectedTechnicianId === technician.id;
                    return (
                      <button
                        key={technician.id}
                        type="button"
                        disabled={Boolean(conflict)}
                        onClick={() => setSelectedTechnicianId(technician.id)}
                        aria-pressed={active}
                        className={`h-auto border p-4 text-left shadow-sm ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                            : conflict
                              ? 'border-brand-outline bg-brand-surface-high/45 opacity-60'
                              : 'border-brand-outline bg-brand-surface'
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[9px] font-black text-white ${profile.color}`}>
                            {technician.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[10px] font-black text-brand-text">
                                {technician.name}
                              </span>
                              {active && (
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block truncate text-[8px] font-bold text-brand-text-muted">
                              {technician.specialty}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-2 text-[7px] font-bold text-brand-text-muted">
                              <span>Tải {load.percent}%</span>
                              <span>•</span>
                              <span>{load.items.length} lịch</span>
                              <span>•</span>
                              <span>{profile.rating} ★</span>
                            </span>
                            {conflict ? (
                              <span className="mt-2 block rounded-lg bg-rose-50 px-2 py-1.5 text-[7px] font-bold text-rose-700">
                                Trùng {conflict.start} · {conflict.customer}
                              </span>
                            ) : (
                              <span className="mt-2 block text-[7px] font-black text-emerald-600">
                                Phù hợp toàn bộ kỹ năng · Không trùng lịch
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!assignableTechnicians.length && (
                  <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center">
                    <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
                    <p className="mt-2 text-[9px] font-black text-amber-700">
                      Chưa có kỹ thuật viên đủ kỹ năng và đang trong ca
                    </p>
                    <p className="mt-1 text-[8px] text-amber-600">
                      Vui lòng báo quản lý hoặc điều chỉnh thời gian hẹn.
                    </p>
                  </div>
                )}
              </fieldset>
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-brand-outline bg-brand-surface-high/35 px-5 py-4 sm:px-6">
              <p className="hidden items-center gap-2 text-[8px] font-semibold text-brand-text-muted sm:flex">
                <TimerReset className="h-3.5 w-3.5 text-emerald-500" />
                Ưu tiên người có tải thấp hơn
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningAppointment(null)}
                  className="border border-brand-outline bg-brand-surface px-4 text-[9px] font-bold text-brand-text-muted shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!selectedTechnicianId || Boolean(selectedAssignment?.conflict)}
                  className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-sm disabled:opacity-50"
                >
                  <UserCheck className="h-4 w-4" />
                  Xác nhận phân công
                </button>
              </div>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
