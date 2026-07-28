import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Armchair,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Grid3X3,
  LayoutList,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  SprayCan,
  TimerReset,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type BranchCode = 'Q1' | 'Q3';
type StationArea = 'MANICURE' | 'PEDICURE' | 'VIP';
type StationBaseStatus = 'READY' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
type StationStatus = StationBaseStatus | 'OCCUPIED' | 'RESERVED';
type ViewMode = 'MAP' | 'LIST';

interface Station {
  id: string;
  name: string;
  branch: BranchCode;
  area: StationArea;
  baseStatus: StationBaseStatus;
  location: string;
  equipment: string[];
  sanitizedAt: string;
  checklist: string;
  issue?: string;
  issueReportedAt?: string;
  lastMaintenance: string;
  nextMaintenance: string;
  note?: string;
}

interface LinkedAppointment {
  id: string;
  customer: string;
  phone: string;
  date: string;
  start: string;
  duration: number;
  service: string;
  staff: string;
  branch: BranchCode;
  status: string;
  station?: string;
  note: string;
  deposit: number;
}

interface ReceptionistStationsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  branchLocked?: boolean;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
}

const areaMeta: Record<
  StationArea,
  { label: string; short: string; badge: string; iconTone: string; description: string }
> = {
  MANICURE: {
    label: 'Khu Manicure',
    short: 'M',
    badge: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    iconTone: 'bg-fuchsia-500',
    description: 'Bàn làm móng tay & Nail Art',
  },
  PEDICURE: {
    label: 'Khu Pedicure',
    short: 'P',
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    iconTone: 'bg-cyan-500',
    description: 'Ghế spa chân & bồn ngâm',
  },
  VIP: {
    label: 'Phòng VIP',
    short: 'V',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    iconTone: 'bg-violet-500',
    description: 'Không gian riêng tư cao cấp',
  },
};

const statusMeta: Record<
  StationStatus,
  { label: string; short: string; badge: string; card: string; dot: string; icon: typeof Armchair }
> = {
  READY: {
    label: 'Sẵn sàng',
    short: 'Trống',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    card: 'border-emerald-200 bg-emerald-50/30',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  OCCUPIED: {
    label: 'Đang phục vụ',
    short: 'Đang làm',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    card: 'border-violet-200 bg-violet-50/55',
    dot: 'bg-violet-500',
    icon: Activity,
  },
  RESERVED: {
    label: 'Đã xếp khách',
    short: 'Đã giữ',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    card: 'border-blue-200 bg-blue-50/50',
    dot: 'bg-blue-500',
    icon: CalendarClock,
  },
  CLEANING: {
    label: 'Chờ vệ sinh',
    short: 'Vệ sinh',
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    card: 'border-cyan-200 bg-cyan-50/55',
    dot: 'bg-cyan-500',
    icon: SprayCan,
  },
  MAINTENANCE: {
    label: 'Đang bảo trì',
    short: 'Bảo trì',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    card: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
    icon: Wrench,
  },
  OUT_OF_SERVICE: {
    label: 'Ngừng sử dụng',
    short: 'Đã khóa',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    card: 'border-rose-200 bg-rose-50/55',
    dot: 'bg-rose-500',
    icon: CircleAlert,
  },
};

const localDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const nowTime = () =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const endTime = (appointment: LinkedAppointment) => {
  const end = timeToMinutes(appointment.start) + appointment.duration;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
};

const branchName = (branch: BranchCode) => (branch === 'Q3' ? 'Quận 3' : 'Quận 1');

const stationSeed: Station[] = [
  {
    id: 'M-01',
    name: 'Bàn Manicure 01',
    branch: 'Q3',
    area: 'MANICURE',
    baseStatus: 'CLEANING',
    location: 'Khu A · Gần lễ tân',
    equipment: ['Đèn UV', 'Máy mài', 'Máy hút bụi'],
    sanitizedAt: '08:02',
    checklist: '2/4',
    lastMaintenance: '01/07/2026',
    nextMaintenance: '01/08/2026',
    note: 'Vừa kết thúc dịch vụ, cần khử khuẩn bề mặt.',
  },
  {
    id: 'M-02',
    name: 'Bàn Manicure 02',
    branch: 'Q3',
    area: 'MANICURE',
    baseStatus: 'READY',
    location: 'Khu A · Bàn đôi',
    equipment: ['Đèn UV', 'Máy mài', 'Hút bụi âm bàn'],
    sanitizedAt: '08:12',
    checklist: '4/4',
    lastMaintenance: '28/06/2026',
    nextMaintenance: '28/07/2026',
  },
  {
    id: 'M-03',
    name: 'Bàn Manicure 03',
    branch: 'Q3',
    area: 'MANICURE',
    baseStatus: 'READY',
    location: 'Khu A · Cạnh tủ màu',
    equipment: ['Đèn UV', 'Máy mài'],
    sanitizedAt: '08:18',
    checklist: '4/4',
    lastMaintenance: '03/07/2026',
    nextMaintenance: '03/08/2026',
  },
  {
    id: 'M-04',
    name: 'Bàn Manicure 04',
    branch: 'Q3',
    area: 'MANICURE',
    baseStatus: 'READY',
    location: 'Khu A · Gần cửa sổ',
    equipment: ['Đèn UV', 'Máy mài', 'Đèn chụp ảnh'],
    sanitizedAt: '09:55',
    checklist: '4/4',
    lastMaintenance: '02/07/2026',
    nextMaintenance: '02/08/2026',
  },
  {
    id: 'M-05',
    name: 'Bàn Manicure 05',
    branch: 'Q3',
    area: 'MANICURE',
    baseStatus: 'READY',
    location: 'Khu A · Cuối phòng',
    equipment: ['Đèn UV', 'Máy mài'],
    sanitizedAt: '08:21',
    checklist: '4/4',
    lastMaintenance: '05/07/2026',
    nextMaintenance: '05/08/2026',
  },
  {
    id: 'M-06',
    name: 'Bàn Manicure 06',
    branch: 'Q3',
    area: 'MANICURE',
    baseStatus: 'READY',
    location: 'Khu A · Dãy giữa',
    equipment: ['Đèn UV', 'Máy mài'],
    sanitizedAt: '08:24',
    checklist: '4/4',
    lastMaintenance: '08/07/2026',
    nextMaintenance: '08/08/2026',
  },
  {
    id: 'P-01',
    name: 'Ghế Pedicure 01',
    branch: 'Q3',
    area: 'PEDICURE',
    baseStatus: 'READY',
    location: 'Khu B · Bồn massage',
    equipment: ['Ghế điện', 'Bồn ngâm', 'Đèn UV'],
    sanitizedAt: '08:05',
    checklist: '5/5',
    lastMaintenance: '05/07/2026',
    nextMaintenance: '25/07/2026',
  },
  {
    id: 'P-02',
    name: 'Ghế Pedicure 02',
    branch: 'Q3',
    area: 'PEDICURE',
    baseStatus: 'READY',
    location: 'Khu B · Bồn massage',
    equipment: ['Ghế điện', 'Bồn ngâm', 'Máy sấy'],
    sanitizedAt: '08:08',
    checklist: '5/5',
    lastMaintenance: '06/07/2026',
    nextMaintenance: '26/07/2026',
  },
  {
    id: 'P-03',
    name: 'Ghế Pedicure 03',
    branch: 'Q3',
    area: 'PEDICURE',
    baseStatus: 'MAINTENANCE',
    location: 'Khu B · Gần cửa sổ',
    equipment: ['Ghế điện', 'Bồn ngâm'],
    sanitizedAt: 'Hôm qua · 18:05',
    checklist: '5/5',
    issue: 'Áp lực nước bồn ngâm yếu',
    issueReportedAt: 'Hôm nay · 07:45',
    lastMaintenance: '16/07/2026',
    nextMaintenance: '23/07/2026',
    note: 'Đã báo NailPro Equipment, dự kiến xử lý trước 17:00.',
  },
  {
    id: 'P-04',
    name: 'Ghế Pedicure 04',
    branch: 'Q3',
    area: 'PEDICURE',
    baseStatus: 'READY',
    location: 'Khu B · Gần tủ khăn',
    equipment: ['Ghế điện', 'Bồn ngâm'],
    sanitizedAt: '08:10',
    checklist: '5/5',
    lastMaintenance: '10/07/2026',
    nextMaintenance: '10/08/2026',
  },
  {
    id: 'VIP-01',
    name: 'Phòng VIP 01',
    branch: 'Q3',
    area: 'VIP',
    baseStatus: 'READY',
    location: 'Tầng lửng · Phòng riêng',
    equipment: ['Bàn manicure', 'Ghế pedicure', 'TV', 'Tủ lạnh mini'],
    sanitizedAt: '08:15',
    checklist: '6/6',
    lastMaintenance: '30/06/2026',
    nextMaintenance: '30/07/2026',
  },
  {
    id: 'VIP-02',
    name: 'Phòng VIP 02',
    branch: 'Q3',
    area: 'VIP',
    baseStatus: 'READY',
    location: 'Tầng lửng · Cuối hành lang',
    equipment: ['Bàn manicure', 'Ghế pedicure', 'TV'],
    sanitizedAt: '08:17',
    checklist: '6/6',
    lastMaintenance: '03/07/2026',
    nextMaintenance: '03/08/2026',
  },
  {
    id: 'M-11',
    name: 'Bàn Manicure 01',
    branch: 'Q1',
    area: 'MANICURE',
    baseStatus: 'READY',
    location: 'Khu A · Quận 1',
    equipment: ['Đèn UV', 'Máy mài'],
    sanitizedAt: '08:06',
    checklist: '4/4',
    lastMaintenance: '04/07/2026',
    nextMaintenance: '04/08/2026',
  },
  {
    id: 'M-12',
    name: 'Bàn Manicure 02',
    branch: 'Q1',
    area: 'MANICURE',
    baseStatus: 'CLEANING',
    location: 'Khu A · Quận 1',
    equipment: ['Đèn UV', 'Máy mài'],
    sanitizedAt: 'Đang thực hiện',
    checklist: '1/4',
    lastMaintenance: '07/07/2026',
    nextMaintenance: '07/08/2026',
  },
  {
    id: 'P-11',
    name: 'Ghế Pedicure 01',
    branch: 'Q1',
    area: 'PEDICURE',
    baseStatus: 'READY',
    location: 'Khu B · Quận 1',
    equipment: ['Ghế điện', 'Bồn ngâm'],
    sanitizedAt: '08:14',
    checklist: '5/5',
    lastMaintenance: '08/07/2026',
    nextMaintenance: '28/07/2026',
  },
  {
    id: 'V-11',
    name: 'Phòng VIP 01',
    branch: 'Q1',
    area: 'VIP',
    baseStatus: 'READY',
    location: 'Tầng 2 · Phòng riêng',
    equipment: ['Bàn manicure', 'Ghế pedicure', 'TV'],
    sanitizedAt: '08:20',
    checklist: '6/6',
    lastMaintenance: '02/07/2026',
    nextMaintenance: '02/08/2026',
  },
  {
    id: 'M-13',
    name: 'Bàn Manicure 03',
    branch: 'Q1',
    area: 'MANICURE',
    baseStatus: 'OUT_OF_SERVICE',
    location: 'Khu A · Quận 1',
    equipment: ['Đèn UV'],
    sanitizedAt: '21/07/2026 · 18:10',
    checklist: '0/4',
    issue: 'Chờ thay ổ cắm điện',
    issueReportedAt: '21/07/2026 · 17:35',
    lastMaintenance: '15/07/2026',
    nextMaintenance: 'Chờ nghiệm thu',
    note: 'Đã khóa nhận lịch đến khi quản lý nghiệm thu an toàn.',
  },
];

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export default function ReceptionistStations({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  branchLocked = true,
  tenantName = 'Nailé Studio',
  roleLabel = 'Receptionist',
  accessMode = 'full',
  readOnlyReason = '',
  onNotify,
}: ReceptionistStationsProps) {
  const branch: BranchCode = selectedBranch === 'Q1' ? 'Q1' : 'Q3';
  const stationStorageKey = `receptionist-stations-v1:${tenantName}`;
  const appointmentStorageKey = `tenant-admin-appointments-v2:${tenantName}`;
  const today = localDateKey();
  const canManage = accessMode === 'full' && !readOnlyReason;
  const [stations, setStations] = useState<Station[]>(() =>
    readStorage(stationStorageKey, stationSeed),
  );
  const [appointments, setAppointments] = useState<LinkedAppointment[]>(() =>
    readStorage(appointmentStorageKey, []),
  );
  const [areaFilter, setAreaFilter] = useState<'ALL' | StationArea>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StationStatus>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('MAP');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [assignAppointment, setAssignAppointment] = useState<LinkedAppointment | null>(null);
  const [assignStationId, setAssignStationId] = useState('');
  const [cleaningStation, setCleaningStation] = useState<Station | null>(null);
  const [cleaningChecks, setCleaningChecks] = useState<string[]>([]);
  const [issueStation, setIssueStation] = useState<Station | null>(null);
  const [issueForm, setIssueForm] = useState({ issue: '', severity: 'MAINTENANCE' as 'MAINTENANCE' | 'OUT_OF_SERVICE', note: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    localStorage.setItem(stationStorageKey, JSON.stringify(stations));
  }, [stationStorageKey, stations]);

  useEffect(() => {
    localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments));
  }, [appointmentStorageKey, appointments]);

  useEffect(() => {
    const syncAppointments = () =>
      setAppointments(readStorage<LinkedAppointment[]>(appointmentStorageKey, []));
    window.addEventListener('focus', syncAppointments);
    window.addEventListener('storage', syncAppointments);
    return () => {
      window.removeEventListener('focus', syncAppointments);
      window.removeEventListener('storage', syncAppointments);
    };
  }, [appointmentStorageKey]);

  useEffect(() => {
    if (!selectedStation && !assignAppointment && !cleaningStation && !issueStation) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedStation(null);
        setAssignAppointment(null);
        setCleaningStation(null);
        setIssueStation(null);
      }
    };
    addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', close);
    };
  }, [assignAppointment, cleaningStation, issueStation, selectedStation]);

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.branch === branch &&
          appointment.date === today &&
          !['CANCELLED', 'NO_SHOW'].includes(appointment.status),
      ),
    [appointments, branch, today],
  );

  const stationAppointments = (station: Station) =>
    dayAppointments
      .filter((appointment) => appointment.station === station.id)
      .sort((a, b) => a.start.localeCompare(b.start));

  const currentAppointment = (station: Station) =>
    stationAppointments(station).find((appointment) =>
      ['IN_SERVICE', 'CHECKED_IN'].includes(appointment.status),
    );

  const nextAppointment = (station: Station) =>
    stationAppointments(station).find((appointment) =>
      ['PENDING', 'CONFIRMED'].includes(appointment.status),
    );

  const effectiveStatus = (station: Station): StationStatus => {
    if (['MAINTENANCE', 'OUT_OF_SERVICE', 'CLEANING'].includes(station.baseStatus)) {
      return station.baseStatus;
    }
    const current = currentAppointment(station);
    if (current?.status === 'IN_SERVICE') return 'OCCUPIED';
    if (current?.status === 'CHECKED_IN' || nextAppointment(station)) return 'RESERVED';
    return 'READY';
  };

  const utilization = (station: Station) => {
    const minutes = stationAppointments(station)
      .filter((appointment) => appointment.status !== 'CANCELLED')
      .reduce((sum, appointment) => sum + appointment.duration, 0);
    return Math.min(100, Math.round((minutes / 600) * 100));
  };

  const scopedStations = useMemo(
    () => stations.filter((station) => station.branch === branch),
    [branch, stations],
  );

  const filteredStations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedStations
      .filter((station) => areaFilter === 'ALL' || station.area === areaFilter)
      .filter((station) => statusFilter === 'ALL' || effectiveStatus(station) === statusFilter)
      .filter((station) => {
        const current = currentAppointment(station);
        const next = nextAppointment(station);
        return (
          !query ||
          `${station.id} ${station.name} ${station.location} ${current?.customer || ''} ${current?.staff || ''} ${next?.customer || ''}`
            .toLowerCase()
            .includes(query)
        );
      });
  }, [areaFilter, scopedStations, searchQuery, statusFilter, dayAppointments]);

  const waitingAppointments = dayAppointments
    .filter((appointment) => appointment.status === 'CHECKED_IN' && !appointment.station)
    .sort((a, b) => a.start.localeCompare(b.start));
  const readyStations = scopedStations.filter((station) => effectiveStatus(station) === 'READY');
  const occupiedStations = scopedStations.filter(
    (station) => effectiveStatus(station) === 'OCCUPIED',
  );
  const cleaningStations = scopedStations.filter(
    (station) => effectiveStatus(station) === 'CLEANING',
  );
  const attentionStations = scopedStations.filter((station) =>
    ['MAINTENANCE', 'OUT_OF_SERVICE'].includes(effectiveStatus(station)),
  );

  const stationMatchesService = (station: Station, appointment: LinkedAppointment) => {
    const service = appointment.service.toLowerCase();
    if (service.includes('pedicure')) return ['PEDICURE', 'VIP'].includes(station.area);
    if (service.includes('combo vip')) return station.area === 'VIP';
    return ['MANICURE', 'VIP'].includes(station.area);
  };

  const suitableStations = assignAppointment
    ? readyStations.filter((station) => stationMatchesService(station, assignAppointment))
    : [];

  const openAssign = (appointment: LinkedAppointment, preferredStationId = '') => {
    if (!canManage) {
      onNotify?.(readOnlyReason || 'Bạn chỉ được xem sơ đồ ghế.');
      return;
    }
    setAssignAppointment(appointment);
    const preferred = readyStations.find(
      (station) =>
        station.id === preferredStationId && stationMatchesService(station, appointment),
    );
    setAssignStationId(preferred?.id || '');
    setFormError('');
    setSelectedStation(null);
  };

  const submitAssign = (event: FormEvent) => {
    event.preventDefault();
    if (!assignAppointment || !assignStationId) {
      setFormError('Vui lòng chọn một ghế hoặc phòng phù hợp.');
      return;
    }
    const station = readyStations.find((item) => item.id === assignStationId);
    if (!station || !stationMatchesService(station, assignAppointment)) {
      setFormError('Vị trí này không còn sẵn sàng hoặc không phù hợp với dịch vụ.');
      return;
    }
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === assignAppointment.id
          ? { ...appointment, station: assignStationId }
          : appointment,
      ),
    );
    setAssignAppointment(null);
    onNotify?.(`Đã xếp ${assignAppointment.customer} vào ${station.name}.`);
  };

  const openCleaning = (station: Station) => {
    if (!canManage) {
      onNotify?.(readOnlyReason || 'Bạn chỉ được xem sơ đồ ghế.');
      return;
    }
    setCleaningStation(station);
    setCleaningChecks([]);
    setFormError('');
    setSelectedStation(null);
  };

  const toggleCleaningCheck = (item: string) => {
    setCleaningChecks((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  };

  const completeCleaning = (event: FormEvent) => {
    event.preventDefault();
    if (!cleaningStation) return;
    const required = cleaningStation.area === 'PEDICURE' ? 5 : cleaningStation.area === 'VIP' ? 6 : 4;
    if (cleaningChecks.length !== required) {
      setFormError(`Vui lòng hoàn thành đủ ${required} bước vệ sinh bắt buộc.`);
      return;
    }
    const patch = {
      baseStatus: 'READY' as const,
      sanitizedAt: `Hôm nay · ${nowTime()}`,
      checklist: `${required}/${required}`,
      note: `Vệ sinh hoàn tất bởi ${roleLabel.split('·')[1]?.trim() || 'Lễ tân'}.`,
    };
    setStations((current) =>
      current.map((station) => (station.id === cleaningStation.id ? { ...station, ...patch } : station)),
    );
    setCleaningStation(null);
    onNotify?.(`${cleaningStation.name} đã sạch và sẵn sàng nhận khách.`);
  };

  const openIssue = (station: Station) => {
    if (!canManage) {
      onNotify?.(readOnlyReason || 'Bạn chỉ được xem sơ đồ ghế.');
      return;
    }
    setIssueStation(station);
    setIssueForm({ issue: '', severity: 'MAINTENANCE', note: '' });
    setFormError('');
    setSelectedStation(null);
  };

  const submitIssue = (event: FormEvent) => {
    event.preventDefault();
    if (!issueStation || issueForm.issue.trim().length < 5) {
      setFormError('Vui lòng mô tả sự cố rõ ràng, ít nhất 5 ký tự.');
      return;
    }
    const patch = {
      baseStatus: issueForm.severity,
      issue: issueForm.issue.trim(),
      issueReportedAt: `Hôm nay · ${nowTime()}`,
      note:
        issueForm.note.trim() ||
        `Sự cố được báo bởi ${roleLabel.split('·')[1]?.trim() || 'Lễ tân'}; chờ quản lý xử lý.`,
    };
    setStations((current) =>
      current.map((station) => (station.id === issueStation.id ? { ...station, ...patch } : station)),
    );
    setIssueStation(null);
    onNotify?.(`Đã khóa ${issueStation.name} và gửi cảnh báo sự cố.`);
  };

  const cleaningItems = cleaningStation
    ? [
        'Thu gom và thay vật tư dùng một lần',
        'Khử khuẩn bề mặt tiếp xúc',
        'Khử khuẩn dụng cụ và thiết bị',
        'Bổ sung vật tư cho lượt tiếp theo',
        ...(cleaningStation.area === 'PEDICURE' ? ['Xả và khử khuẩn bồn ngâm'] : []),
        ...(cleaningStation.area === 'VIP'
          ? ['Kiểm tra tiện ích trong phòng', 'Xác nhận không còn đồ khách để quên']
          : []),
      ]
    : [];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#052e2b] via-[#075e54] to-[#0f766e] p-5 text-white shadow-[0_20px_55px_rgba(6,78,70,0.24)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.12)]" />
              Sơ đồ vận hành trực tiếp · Chi nhánh {branchName(branch)}
              <span className="text-white/30">•</span>
              <span className="normal-case tracking-normal text-white/65">Cập nhật {nowTime()}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              Ghế & phòng phục vụ
            </h1>
            <p className="mt-2 max-w-2xl text-[10px] leading-5 text-emerald-50/75">
              Theo dõi ghế trống, khách đang làm, thời gian dự kiến, vệ sinh và sự cố để điều phối
              tại quầy nhanh, chính xác.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setAreaFilter('ALL');
                setStatusFilter('READY');
                setViewMode('MAP');
              }}
              className="flex h-11 items-center gap-2 border border-white/20 bg-white/10 px-4 text-[9px] font-black text-white shadow-sm backdrop-blur"
            >
              <Sparkles className="h-4 w-4" />
              Tìm ghế trống
            </button>
            {waitingAppointments[0] ? (
              <button
                type="button"
                onClick={() => openAssign(waitingAppointments[0])}
                className="flex h-11 items-center gap-2 border border-white bg-white px-4 text-[9px] font-black text-emerald-900 shadow-lg"
              >
                <UserRound className="h-4 w-4" />
                Xếp khách đang chờ
              </button>
            ) : (
              <span className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[9px] font-black text-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Không có khách chờ ghế
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-slate-800">Quyền thao tác: {roleLabel}</p>
            <p className="mt-1 text-[8px] leading-4 text-slate-500">
              Được xếp khách vào ghế trống, xác nhận vệ sinh và báo sự cố tại chi nhánh được phân
              công. Không được thêm/xóa vị trí, thay cấu hình hoặc tự mở lại ghế đang khóa.
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[8px] font-black text-emerald-700 ring-1 ring-emerald-200">
          <MapPin className="mr-1 inline h-3 w-3" />
          {branchLocked ? 'Chi nhánh đã khóa' : branchName(branch)}
        </span>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: 'Tổng vị trí',
            value: scopedStations.length,
            detail: `${scopedStations.filter((item) => item.area === 'MANICURE').length} bàn · ${scopedStations.filter((item) => item.area === 'PEDICURE').length} ghế · ${scopedStations.filter((item) => item.area === 'VIP').length} phòng`,
            icon: Armchair,
            tone: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Sẵn sàng',
            value: readyStations.length,
            detail: 'Đã vệ sinh, có thể xếp khách',
            icon: Sparkles,
            tone: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Đang phục vụ',
            value: occupiedStations.length,
            detail: `${dayAppointments.filter((item) => item.status === 'IN_SERVICE').length} dịch vụ đang diễn ra`,
            icon: Activity,
            tone: 'bg-violet-50 text-violet-600',
          },
          {
            label: 'Chờ vệ sinh',
            value: cleaningStations.length,
            detail: 'Cần hoàn tất checklist',
            icon: SprayCan,
            tone: 'bg-cyan-50 text-cyan-600',
          },
          {
            label: 'Cần xử lý',
            value: attentionStations.length,
            detail: `${waitingAppointments.length} khách đang chờ xếp ghế`,
            icon: AlertTriangle,
            tone: 'bg-amber-50 text-amber-600',
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold text-slate-500">{label}</p>
                <p className="mt-1.5 text-xl font-black text-slate-950">{value}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Tìm mã ghế, khách hoặc kỹ thuật viên..."
                aria-label="Tìm kiếm ghế và phòng"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-[10px] font-semibold outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | StationStatus)}
                className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
                aria-label="Lọc trạng thái ghế"
              >
                <option value="ALL">Mọi trạng thái</option>
                {Object.entries(statusMeta).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </BeautifulSelect>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('MAP')}
                  aria-label="Xem sơ đồ"
                  aria-pressed={viewMode === 'MAP'}
                  className={`flex h-8 min-h-8 items-center gap-1.5 border-0 px-2.5 text-[8px] font-black shadow-none ${
                    viewMode === 'MAP' ? 'bg-white text-emerald-700 shadow-sm' : 'bg-transparent text-slate-400'
                  }`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  Sơ đồ
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  aria-label="Xem danh sách"
                  aria-pressed={viewMode === 'LIST'}
                  className={`flex h-8 min-h-8 items-center gap-1.5 border-0 px-2.5 text-[8px] font-black shadow-none ${
                    viewMode === 'LIST' ? 'bg-white text-emerald-700 shadow-sm' : 'bg-transparent text-slate-400'
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Danh sách
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            {(['ALL', 'MANICURE', 'PEDICURE', 'VIP'] as const).map((area) => {
              const count =
                area === 'ALL'
                  ? scopedStations.length
                  : scopedStations.filter((station) => station.area === area).length;
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => setAreaFilter(area)}
                  className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${
                    areaFilter === area
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {area === 'ALL' ? 'Tổng quan mặt bằng' : areaMeta[area].label}
                  <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">{count}</span>
                </button>
              );
            })}
          </div>

          {viewMode === 'MAP' ? (
            <div className="space-y-6 p-4 sm:p-5">
              {(['MANICURE', 'PEDICURE', 'VIP'] as StationArea[]).map((area) => {
                const areaStations = filteredStations.filter((station) => station.area === area);
                if (!areaStations.length) return null;
                const areaReady = areaStations.filter(
                  (station) => effectiveStatus(station) === 'READY',
                ).length;
                return (
                  <section key={area}>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black text-white ${areaMeta[area].iconTone}`}>
                          {areaMeta[area].short}
                        </span>
                        <div>
                          <h2 className="text-[11px] font-black text-slate-800">
                            {areaMeta[area].label}
                          </h2>
                          <p className="mt-0.5 text-[8px] text-slate-400">
                            {areaMeta[area].description} · {areaReady}/{areaStations.length} sẵn sàng
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[7px] font-bold text-slate-400">
                        {(['READY', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'] as StationStatus[]).map(
                          (status) => (
                            <span key={status} className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${statusMeta[status].dot}`} />
                              {statusMeta[status].short}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {areaStations.map((station) => {
                        const status = effectiveStatus(station);
                        const meta = statusMeta[status];
                        const current = currentAppointment(station);
                        const next = nextAppointment(station);
                        const StatusIcon = meta.icon;
                        return (
                          <button
                            key={station.id}
                            type="button"
                            onClick={() => setSelectedStation(station)}
                            className={`group relative h-auto min-h-[176px] overflow-hidden border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${meta.card} ${
                              area === 'PEDICURE' ? 'rounded-[24px]' : area === 'VIP' ? 'rounded-xl' : 'rounded-2xl'
                            }`}
                          >
                            <span className={`absolute left-0 top-0 h-full w-1 ${meta.dot}`} />
                            <span className="flex items-start justify-between gap-2">
                              <span>
                                <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                                  {station.id}
                                </span>
                                <span className="mt-1 block text-[10px] font-black text-slate-900">
                                  {station.name}
                                </span>
                              </span>
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.badge}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                              </span>
                            </span>
                            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[7px] font-black ring-1 ${meta.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                            {current ? (
                              <span className="mt-3 block rounded-xl bg-white/60 p-2.5 ring-1 ring-black/5">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-[9px] font-black text-slate-800">
                                    {current.customer}
                                  </span>
                                  <span className="shrink-0 text-[7px] font-black text-violet-600">
                                    {current.start}–{endTime(current)}
                                  </span>
                                </span>
                                <span className="mt-1 block truncate text-[7px] text-slate-500">
                                  {current.staff} · {current.service}
                                </span>
                              </span>
                            ) : (
                              <span className="mt-3 flex min-h-11 items-center rounded-xl border border-dashed border-slate-200 bg-white/40 px-2.5 text-[7px] font-bold text-slate-500">
                                {status === 'READY'
                                  ? next
                                    ? `Lịch kế tiếp ${next.start} · ${next.customer}`
                                    : 'Sẵn sàng nhận khách'
                                  : station.issue || station.note || meta.label}
                              </span>
                            )}
                            <span className="mt-3 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-[7px] text-slate-400">
                                <SprayCan className="h-3 w-3" />
                                {station.sanitizedAt}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {!filteredStations.length && (
                <div className="py-16 text-center">
                  <Armchair className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-[10px] font-black text-slate-600">
                    Không tìm thấy vị trí phù hợp
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[8px] font-black uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Vị trí</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Khách hiện tại</th>
                    <th className="px-4 py-3">Lịch kế tiếp</th>
                    <th className="px-4 py-3">Vệ sinh</th>
                    <th className="px-5 py-3 text-right">Công suất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStations.map((station) => {
                    const status = effectiveStatus(station);
                    const current = currentAppointment(station);
                    const next = nextAppointment(station);
                    return (
                      <tr
                        key={station.id}
                        onClick={() => setSelectedStation(station)}
                        className="cursor-pointer text-[9px] text-slate-600 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900">
                            {station.id} · {station.name}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400">{station.location}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[status].badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />
                            {statusMeta[status].label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {current ? (
                            <>
                              <p className="font-black text-slate-800">{current.customer}</p>
                              <p className="mt-1 text-[8px] text-slate-400">
                                {current.start}–{endTime(current)} · {current.staff}
                              </p>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {next ? `${next.start} · ${next.customer}` : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-700">{station.sanitizedAt}</p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            Checklist {station.checklist}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="font-black text-slate-800">{utilization(station)}%</p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {stationAppointments(station).length} lịch hôm nay
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[8px] text-slate-400">
              Hiển thị <strong className="text-slate-600">{filteredStations.length}</strong> trên{' '}
              {scopedStations.length} vị trí
            </p>
            <p className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Đồng bộ lịch hẹn trong ngày
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-amber-600">
                  Ưu tiên tại quầy
                </p>
                <h2 className="mt-1 text-sm font-black text-slate-900">Khách đang chờ ghế</h2>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <TimerReset className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {waitingAppointments.map((appointment) => (
                <article key={appointment.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-black text-slate-900">
                        {appointment.customer}
                      </p>
                      <p className="mt-1 truncate text-[8px] text-slate-500">
                        {appointment.start} · {appointment.service}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[7px] font-black text-amber-700">
                      Đã đến
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAssign(appointment)}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-amber-300 bg-white text-[8px] font-black text-amber-700 shadow-sm"
                  >
                    <Armchair className="h-3.5 w-3.5" />
                    Xếp ghế phù hợp
                  </button>
                </article>
              ))}
              {!waitingAppointments.length && (
                <div className="rounded-xl border border-dashed border-slate-200 py-7 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
                  <p className="mt-2 text-[8px] font-black text-slate-600">
                    Không có khách chờ ghế
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-600">
                  Việc cần xử lý
                </p>
                <h2 className="mt-1 text-sm font-black text-slate-900">Vệ sinh & sự cố</h2>
              </div>
              <SprayCan className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="mt-4 space-y-2">
              {cleaningStations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => openCleaning(station)}
                  className="flex h-auto w-full items-center gap-3 border border-cyan-200 bg-cyan-50/55 p-3 text-left shadow-none"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-600">
                    <SprayCan className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-black text-slate-800">{station.id}</span>
                    <span className="mt-1 block truncate text-[7px] text-slate-500">
                      Checklist {station.checklist} · Cần xác nhận sạch
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-cyan-500" />
                </button>
              ))}
              {attentionStations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setSelectedStation(station)}
                  className="flex h-auto w-full items-center gap-3 border border-amber-200 bg-amber-50/60 p-3 text-left shadow-none"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-black text-slate-800">{station.id}</span>
                    <span className="mt-1 block truncate text-[7px] text-slate-500">
                      {station.issue || 'Đang chờ xử lý'}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-amber-500" />
                </button>
              ))}
              {!cleaningStations.length && !attentionStations.length && (
                <p className="rounded-xl bg-emerald-50 px-3 py-4 text-center text-[8px] font-bold text-emerald-700">
                  Tất cả vị trí đang đạt điều kiện vận hành.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {selectedStation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            onClick={() => setSelectedStation(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng chi tiết vị trí"
          />
          {(() => {
            const status = effectiveStatus(selectedStation);
            const meta = statusMeta[status];
            const current = currentAppointment(selectedStation);
            const next = nextAppointment(selectedStation);
            const StatusIcon = meta.icon;
            return (
              <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="station-detail-title"
                className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
              >
                <header className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl ${meta.badge}`}>
                        <StatusIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
                            {selectedStation.id}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[8px] font-black ring-1 ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>
                        <h2 id="station-detail-title" className="mt-2 text-xl font-black text-slate-950">
                          {selectedStation.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {selectedStation.location}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStation(null)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                      aria-label="Đóng"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
                  <section className={`rounded-2xl border p-4 ${meta.card}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                          Trạng thái trực tiếp
                        </p>
                        <p className="mt-2 text-xl font-black text-slate-950">{meta.label}</p>
                        <p className="mt-1 text-[8px] text-slate-500">
                          {current
                            ? `Đang phục vụ ${current.customer}`
                            : selectedStation.issue || 'Không có khách tại vị trí'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-right">
                        <div className="rounded-xl bg-white/60 px-3 py-2">
                          <p className="text-[7px] text-slate-400">Công suất</p>
                          <p className="mt-1 text-[10px] font-black text-slate-800">
                            {utilization(selectedStation)}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/60 px-3 py-2">
                          <p className="text-[7px] text-slate-400">Lịch hôm nay</p>
                          <p className="mt-1 text-[10px] font-black text-slate-800">
                            {stationAppointments(selectedStation).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {current && (
                    <section className="rounded-2xl border border-violet-200 bg-violet-50/55 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-wide text-violet-600">
                            {current.status === 'IN_SERVICE' ? 'Đang phục vụ' : 'Khách đã đến'}
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-900">{current.customer}</p>
                          <p className="mt-1 text-[9px] text-slate-500">{current.service}</p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[8px] font-bold text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5 text-violet-500" />
                              {current.start}–{endTime(current)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <UserRound className="h-3.5 w-3.5 text-violet-500" />
                              {current.staff}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${current.phone.replace(/\D/g, '')}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600"
                            aria-label={`Gọi ${current.customer}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`sms:${current.phone.replace(/\D/g, '')}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600"
                            aria-label={`Nhắn ${current.customer}`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                      {current.note && (
                        <p className="mt-3 rounded-xl bg-white/60 p-3 text-[8px] leading-4 text-slate-600">
                          <strong>Lưu ý:</strong> {current.note}
                        </p>
                      )}
                    </section>
                  )}

                  {next && (
                    <section className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[8px] font-black uppercase text-blue-600">
                          Lịch kế tiếp · {next.start}
                        </p>
                        <p className="mt-1.5 text-[10px] font-black text-slate-800">{next.customer}</p>
                        <p className="mt-1 text-[8px] text-slate-500">
                          {next.service} · {next.staff}
                        </p>
                      </div>
                    </section>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400">
                            Vệ sinh & khử khuẩn
                          </p>
                          <p className="mt-2 text-[11px] font-black text-slate-800">
                            {selectedStation.sanitizedAt}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            Checklist {selectedStation.checklist}
                          </p>
                        </div>
                        <SprayCan className="h-5 w-5 text-cyan-500" />
                      </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400">
                            Bảo trì thiết bị
                          </p>
                          <p className="mt-2 text-[9px] font-black text-slate-700">
                            Tiếp theo {selectedStation.nextMaintenance}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            Gần nhất {selectedStation.lastMaintenance}
                          </p>
                        </div>
                        <Wrench className="h-5 w-5 text-amber-500" />
                      </div>
                    </section>
                  </div>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[8px] font-black uppercase text-slate-400">Thiết bị đi kèm</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedStation.equipment.map((item) => (
                        <span key={item} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[8px] font-bold text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>

                  {selectedStation.issue && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-[9px] font-black text-slate-800">
                            {selectedStation.issue}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-500">
                            Báo lúc {selectedStation.issueReportedAt || 'Chưa rõ'}
                          </p>
                          {selectedStation.note && (
                            <p className="mt-2 text-[8px] leading-4 text-slate-600">
                              {selectedStation.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <p className="flex items-center gap-1.5 text-[8px] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Mọi thao tác được lưu theo tài khoản lễ tân
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    {status === 'READY' && waitingAppointments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openAssign(waitingAppointments[0], selectedStation.id)}
                        className="flex h-10 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[8px] font-black text-white shadow-sm"
                      >
                        <UserRound className="h-3.5 w-3.5" />
                        Xếp khách vào đây
                      </button>
                    )}
                    {status === 'CLEANING' && (
                      <button
                        type="button"
                        onClick={() => openCleaning(selectedStation)}
                        className="flex h-10 items-center gap-2 border border-cyan-200 bg-cyan-50 px-4 text-[8px] font-black text-cyan-700 shadow-sm"
                      >
                        <SprayCan className="h-3.5 w-3.5" />
                        Hoàn tất vệ sinh
                      </button>
                    )}
                    {!['MAINTENANCE', 'OUT_OF_SERVICE'].includes(status) && (
                      <button
                        type="button"
                        onClick={() => openIssue(selectedStation)}
                        className="flex h-10 items-center gap-2 border border-amber-200 bg-amber-50 px-4 text-[8px] font-black text-amber-700 shadow-sm"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Báo sự cố
                      </button>
                    )}
                  </div>
                </footer>
              </aside>
            );
          })()}
        </div>
      )}

      {assignAppointment && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setAssignAppointment(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng xếp ghế"
          />
          <form onSubmit={submitAssign} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">
                  Điều phối khách tại quầy
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Xếp ghế phù hợp</h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  {assignAppointment.customer} · {assignAppointment.service}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignAppointment(null)}
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
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
                  { label: 'Giờ hẹn', value: assignAppointment.start },
                  { label: 'Thời lượng', value: `${assignAppointment.duration} phút` },
                  { label: 'Kỹ thuật viên', value: assignAppointment.staff },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[7px] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-[9px] font-black text-slate-700">{item.value}</p>
                  </div>
                ))}
              </div>
              <fieldset>
                <legend className="text-[9px] font-black text-slate-700">
                  Vị trí đang sẵn sàng ({suitableStations.length})
                </legend>
                <p className="mt-1 text-[8px] text-slate-400">
                  Chỉ hiển thị ghế/phòng phù hợp với loại dịch vụ.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {suitableStations.map((station) => {
                    const active = assignStationId === station.id;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setAssignStationId(station.id)}
                        aria-pressed={active}
                        className={`h-auto min-h-24 border p-3 text-left shadow-sm ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span>
                            <span className="block text-[9px] font-black text-slate-900">
                              {station.id}
                            </span>
                            <span className="mt-1 block text-[7px] text-slate-400">
                              {areaMeta[station.area].label}
                            </span>
                          </span>
                          {active && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-[7px] font-bold text-emerald-600">
                          <Sparkles className="h-3 w-3" />
                          Đã vệ sinh {station.sanitizedAt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!suitableStations.length && (
                  <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 py-8 text-center">
                    <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
                    <p className="mt-2 text-[8px] font-black text-amber-700">
                      Chưa có vị trí phù hợp đang sẵn sàng
                    </p>
                  </div>
                )}
              </fieldset>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setAssignAppointment(null)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!assignStationId}
                className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-sm disabled:opacity-50"
              >
                <Armchair className="h-4 w-4" />
                Xác nhận xếp ghế
              </button>
            </footer>
          </form>
        </div>
      )}

      {cleaningStation && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setCleaningStation(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng checklist vệ sinh"
          />
          <form onSubmit={completeCleaning} className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-cyan-600">
                  Checklist vệ sinh
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">{cleaningStation.name}</h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Hoàn thành đầy đủ trước khi chuyển sang sẵn sàng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCleaningStation(null)}
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-3 p-5">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              {cleaningItems.map((item, index) => {
                const checked = cleaningChecks.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleCleaningCheck(item)}
                    aria-pressed={checked}
                    className={`flex h-auto w-full items-center gap-3 border p-3 text-left shadow-none ${
                      checked
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[8px] font-black ${
                        checked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {checked ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className={`text-[9px] font-bold ${checked ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-[8px] font-bold text-slate-400">
                {cleaningChecks.length}/{cleaningItems.length} hoàn thành
              </p>
              <button
                type="submit"
                disabled={cleaningChecks.length !== cleaningItems.length}
                className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận sạch
              </button>
            </footer>
          </form>
        </div>
      )}

      {issueStation && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIssueStation(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng báo sự cố"
          />
          <form onSubmit={submitIssue} className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-amber-600">
                  Báo sự cố vị trí
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">{issueStation.name}</h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Vị trí sẽ ngừng nhận khách ngay sau khi gửi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIssueStation(null)}
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
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
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Mức độ khóa vị trí
                </span>
                <BeautifulSelect
                  value={issueForm.severity}
                  onChange={(event) =>
                    setIssueForm((current) => ({
                      ...current,
                      severity: event.target.value as 'MAINTENANCE' | 'OUT_OF_SERVICE',
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                  aria-label="Mức độ sự cố"
                >
                  <option value="MAINTENANCE">Bảo trì tạm thời</option>
                  <option value="OUT_OF_SERVICE">Ngừng sử dụng vì an toàn</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Mô tả sự cố *
                </span>
                <textarea
                  value={issueForm.issue}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, issue: event.target.value }))
                  }
                  placeholder="Ví dụ: đèn UV không hoạt động, bồn ngâm rò nước..."
                  className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Ghi chú xử lý ban đầu
                </span>
                <textarea
                  value={issueForm.note}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Đã ngắt điện, đặt biển cảnh báo, liên hệ kỹ thuật..."
                  className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-[8px] leading-4 text-amber-700">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Receptionist có thể khóa vị trí và báo sự cố; chỉ quản lý mới được xác nhận sửa xong
                và mở lại.
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setIssueStation(null)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-amber-700 bg-amber-600 px-5 text-[9px] font-black text-white shadow-sm"
              >
                <Wrench className="h-4 w-4" />
                Khóa & gửi cảnh báo
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
