import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Armchair,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
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
import { Button, DataTable, Field, Modal, StatusBadge, getStatusDefinition } from './ui';

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

const areaMeta: Record<StationArea, { label: string; short: string; description: string }> = {
  MANICURE: { label: 'Khu Manicure', short: 'M', description: 'Bàn làm móng tay & Nail Art' },
  PEDICURE: { label: 'Khu Pedicure', short: 'P', description: 'Ghế spa chân & bồn ngâm' },
  VIP: { label: 'Phòng VIP', short: 'V', description: 'Không gian riêng tư cao cấp' },
};

/**
 * Tông màu và icon của trạng thái lấy từ STATUS_MAP dùng chung (một nguồn duy nhất).
 * Ở đây chỉ giữ hai bảng nhãn theo ngữ cảnh quầy lễ tân — thứ STATUS_MAP không có:
 * cách gọi tại quầy ("Đang phục vụ") và nhãn rút gọn cho chú giải sơ đồ.
 */
const receptionStatusLabel: Record<StationStatus, string> = {
  READY: 'Sẵn sàng',
  OCCUPIED: 'Đang phục vụ',
  RESERVED: 'Đã xếp khách',
  CLEANING: 'Chờ vệ sinh',
  MAINTENANCE: 'Đang bảo trì',
  OUT_OF_SERVICE: 'Ngừng sử dụng',
};

const statusShortLabel: Record<StationStatus, string> = {
  READY: 'Trống',
  OCCUPIED: 'Đang làm',
  RESERVED: 'Đã giữ',
  CLEANING: 'Vệ sinh',
  MAINTENANCE: 'Bảo trì',
  OUT_OF_SERVICE: 'Đã khóa',
};

const statusOrder: StationStatus[] = [
  'READY',
  'OCCUPIED',
  'RESERVED',
  'CLEANING',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
];

const statusTone = (status: StationStatus) => getStatusDefinition(status).tone;

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    localStorage.setItem(stationStorageKey, JSON.stringify(stations));
  }, [stationStorageKey, stations]);

  useEffect(() => {
    localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments));
  }, [appointmentStorageKey, appointments]);

  useEffect(() => {
    const syncAppointments = () => {
      setIsSyncing(true);
      setAppointments(readStorage<LinkedAppointment[]>(appointmentStorageKey, []));
      setIsSyncing(false);
    };
    window.addEventListener('focus', syncAppointments);
    window.addEventListener('storage', syncAppointments);
    return () => {
      window.removeEventListener('focus', syncAppointments);
      window.removeEventListener('storage', syncAppointments);
    };
  }, [appointmentStorageKey]);

  // Phát hiện dữ liệu hỏng để báo cho người dùng. Không đổi hành vi đọc:
  // readStorage vẫn trả về giá trị mặc định như trước.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(appointmentStorageKey);
      if (raw) JSON.parse(raw);
      setDataError('');
    } catch {
      setDataError('Dữ liệu lịch hẹn trong máy bị lỗi nên chưa hiển thị được. Hãy tải lại trang.');
    }
  }, [appointmentStorageKey]);

  // Escape và khoá cuộn nền do <Modal> đảm nhiệm.

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

  const detailStatus = selectedStation ? effectiveStatus(selectedStation) : null;
  const detailCurrent = selectedStation ? currentAppointment(selectedStation) : undefined;
  const detailNext = selectedStation ? nextAppointment(selectedStation) : undefined;
  const cleaningRequired = cleaningStation
    ? cleaningStation.area === 'PEDICURE' ? 5 : cleaningStation.area === 'VIP' ? 6 : 4
    : 0;

  return (
    <div className="space-y-5">
      {/* Đầu trang theo README §8.2: tên màn hình, mô tả, hành động chính bên phải. */}
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-caption font-bold text-brand-secondary">
            <span className="h-2 w-2 rounded-pill bg-brand-secondary" />
            Sơ đồ vận hành trực tiếp · Chi nhánh {branchName(branch)}
            <span className="text-brand-text-muted">•</span>
            <span className="font-normal text-brand-text-muted">Cập nhật {nowTime()}</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-brand-text sm:text-3xl">
            Ghế &amp; phòng phục vụ
          </h1>
          <p className="mt-2 max-w-2xl text-body text-brand-text-muted">
            Theo dõi ghế trống, khách đang làm, thời gian dự kiến, vệ sinh và sự cố để điều phối tại
            quầy nhanh, chính xác.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            iconLeading={<Sparkles />}
            onClick={() => {
              setAreaFilter('ALL');
              setStatusFilter('READY');
              setViewMode('MAP');
            }}
          >
            Tìm ghế trống
          </Button>
          {waitingAppointments[0] ? (
            <Button variant="primary" iconLeading={<UserRound />} onClick={() => openAssign(waitingAppointments[0])}>
              Xếp khách đang chờ
            </Button>
          ) : (
            <StatusBadge status="READY" label="Không có khách chờ ghế" />
          )}
        </div>
      </section>

      {/* Phạm vi quyền */}
      <section className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ui-tone ui-tone--success">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-secondary text-brand-on-primary">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-body font-bold text-brand-text">Quyền thao tác: {roleLabel}</p>
            <p className="mt-1 text-caption leading-5 text-brand-text-muted">
              Được xếp khách vào ghế trống, xác nhận vệ sinh và báo sự cố tại chi nhánh được phân
              công. Không được thêm/xóa vị trí, thay cấu hình hoặc tự mở lại ghế đang khóa.
            </p>
          </div>
        </div>
        <span className="flex w-fit items-center gap-1.5 rounded-pill border border-brand-outline bg-brand-surface px-3 py-1.5 text-caption font-bold text-brand-text">
          <MapPin className="h-3.5 w-3.5" />
          {branchLocked ? 'Chi nhánh đã khóa' : branchName(branch)}
        </span>
      </section>

      {/* Chỉ số tổng quan */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: 'Tổng vị trí',
            value: scopedStations.length,
            detail: `${scopedStations.filter((item) => item.area === 'MANICURE').length} bàn · ${scopedStations.filter((item) => item.area === 'PEDICURE').length} ghế · ${scopedStations.filter((item) => item.area === 'VIP').length} phòng`,
            icon: Armchair,
          },
          {
            label: 'Sẵn sàng',
            value: readyStations.length,
            detail: 'Đã vệ sinh, có thể xếp khách',
            icon: Sparkles,
          },
          {
            label: 'Đang phục vụ',
            value: occupiedStations.length,
            detail: `${dayAppointments.filter((item) => item.status === 'IN_SERVICE').length} dịch vụ đang diễn ra`,
            icon: Activity,
          },
          {
            label: 'Chờ vệ sinh',
            value: cleaningStations.length,
            detail: 'Cần hoàn tất checklist',
            icon: SprayCan,
          },
          {
            label: 'Cần xử lý',
            value: attentionStations.length,
            detail: `${waitingAppointments.length} khách đang chờ xếp ghế`,
            icon: AlertTriangle,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-caption font-bold text-brand-text-muted">{label}</p>
                <p className="mt-1.5 text-2xl font-black tabular-nums text-brand-text">{value}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-secondary/12 text-brand-secondary">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-2 text-caption text-brand-text-muted">{detail}</p>
          </article>
        ))}
      </section>

      {/* grid-cols-1 ở mobile để track là 1fr; nếu không, cột ngầm co giãn theo
          nội dung và làm cả trang tràn ngang. */}
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-card border border-brand-outline bg-brand-surface shadow-card">
          {/* Thanh công cụ */}
          <div className="flex flex-col gap-3 border-b border-brand-outline p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Tìm mã ghế, khách hoặc kỹ thuật viên..."
                aria-label="Tìm kiếm ghế và phòng"
                className="h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface-lowest pl-10 pr-10 text-body outline-none focus:border-brand-secondary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-brand-text-muted shadow-none"
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
                className="w-44"
                aria-label="Lọc trạng thái ghế"
              >
                <option value="ALL">Mọi trạng thái</option>
                {statusOrder.map((key) => (
                  <option key={key} value={key}>
                    {receptionStatusLabel[key]}
                  </option>
                ))}
              </BeautifulSelect>
              <div className="flex gap-1 rounded-control border border-brand-outline p-1">
                <Button
                  size="small"
                  variant={viewMode === 'MAP' ? 'primary' : 'ghost'}
                  iconLeading={<Grid3X3 />}
                  aria-pressed={viewMode === 'MAP'}
                  onClick={() => setViewMode('MAP')}
                >
                  Sơ đồ
                </Button>
                <Button
                  size="small"
                  variant={viewMode === 'LIST' ? 'primary' : 'ghost'}
                  iconLeading={<LayoutList />}
                  aria-pressed={viewMode === 'LIST'}
                  onClick={() => setViewMode('LIST')}
                >
                  Danh sách
                </Button>
              </div>
            </div>
          </div>

          {/* Lọc theo khu vực */}
          <div className="flex gap-2 overflow-x-auto border-b border-brand-outline bg-brand-surface-high px-4 py-3">
            {(['ALL', 'MANICURE', 'PEDICURE', 'VIP'] as const).map((area) => {
              const count =
                area === 'ALL'
                  ? scopedStations.length
                  : scopedStations.filter((station) => station.area === area).length;
              return (
                <Button
                  key={area}
                  size="small"
                  variant={areaFilter === area ? 'primary' : 'secondary'}
                  aria-pressed={areaFilter === area}
                  onClick={() => setAreaFilter(area)}
                  className="shrink-0"
                >
                  {area === 'ALL' ? 'Tổng quan mặt bằng' : areaMeta[area].label}
                  <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>

          {dataError && (
            <p role="alert" className="m-4 flex items-start gap-2 p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {dataError}
            </p>
          )}

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
                        <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-secondary/12 text-body font-black text-brand-secondary">
                          {areaMeta[area].short}
                        </span>
                        <div>
                          <h2 className="text-body font-bold text-brand-text">{areaMeta[area].label}</h2>
                          <p className="mt-0.5 text-caption text-brand-text-muted">
                            {areaMeta[area].description} · {areaReady}/{areaStations.length} sẵn sàng
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {statusOrder.slice(0, 5).map((status) => (
                          <StatusBadge
                            key={status}
                            status={status}
                            label={statusShortLabel[status]}
                            size="small"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {areaStations.map((station) => {
                        const status = effectiveStatus(station);
                        const current = currentAppointment(station);
                        const next = nextAppointment(station);
                        return (
                          <button
                            key={station.id}
                            type="button"
                            onClick={() => setSelectedStation(station)}
                            aria-label={`${station.id} ${station.name} — ${receptionStatusLabel[status]}`}
                            className={`group h-auto min-h-[176px] p-4 text-left shadow-card ui-tone ui-tone--${statusTone(status)}`}
                          >
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block text-caption font-black uppercase tracking-wide text-brand-text-muted">
                                  {station.id}
                                </span>
                                <span className="mt-1 block truncate text-body font-bold text-brand-text">
                                  {station.name}
                                </span>
                              </span>
                              <StatusBadge status={status} label={statusShortLabel[status]} size="small" />
                            </span>
                            {current ? (
                              <span className="mt-3 block rounded-control bg-brand-surface p-3">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-body font-bold text-brand-text">
                                    {current.customer}
                                  </span>
                                  <span className="shrink-0 text-caption font-black tabular-nums text-brand-secondary">
                                    {current.start}–{endTime(current)}
                                  </span>
                                </span>
                                <span className="mt-1 block truncate text-caption text-brand-text-muted">
                                  {current.staff} · {current.service}
                                </span>
                              </span>
                            ) : (
                              <span className="mt-3 flex min-h-12 items-center rounded-control border border-dashed border-brand-outline bg-brand-surface/60 px-3 text-caption font-bold text-brand-text-muted">
                                {status === 'READY'
                                  ? next
                                    ? `Lịch kế tiếp ${next.start} · ${next.customer}`
                                    : 'Sẵn sàng nhận khách'
                                  : station.issue || station.note || receptionStatusLabel[status]}
                              </span>
                            )}
                            <span className="mt-3 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-caption text-brand-text-muted">
                                <SprayCan className="h-3.5 w-3.5" />
                                {station.sanitizedAt}
                              </span>
                              <ChevronRight className="h-4 w-4 text-brand-text-muted transition group-hover:translate-x-0.5" />
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
                  <Armchair className="mx-auto h-8 w-8 text-brand-text-muted" />
                  <p className="mt-3 text-body font-bold text-brand-text">Không tìm thấy vị trí phù hợp</p>
                  <p className="mt-1 text-caption text-brand-text-muted">
                    Thử bỏ bớt bộ lọc khu vực hoặc trạng thái.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <DataTable<Station>
                rows={filteredStations}
                rowKey={(station) => station.id}
                loading={isSyncing}
                error={dataError || undefined}
                onRowClick={(station) => setSelectedStation(station)}
                emptyTitle="Không tìm thấy vị trí phù hợp"
                emptyDescription="Thử bỏ bớt bộ lọc khu vực hoặc trạng thái."
                columns={[
                  {
                    key: 'station',
                    header: 'Vị trí',
                    cell: (station) => (
                      <>
                        <p className="font-bold text-brand-text">{station.id} · {station.name}</p>
                        <p className="mt-1 text-caption text-brand-text-muted">{station.location}</p>
                      </>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Trạng thái',
                    cell: (station) => {
                      const status = effectiveStatus(station);
                      return <StatusBadge status={status} label={receptionStatusLabel[status]} size="small" />;
                    },
                  },
                  {
                    key: 'current',
                    header: 'Khách hiện tại',
                    cell: (station) => {
                      const current = currentAppointment(station);
                      if (!current) return null;
                      return (
                        <>
                          <p className="font-bold text-brand-text">{current.customer}</p>
                          <p className="mt-1 text-caption tabular-nums text-brand-text-muted">
                            {current.start}–{endTime(current)} · {current.staff}
                          </p>
                        </>
                      );
                    },
                  },
                  {
                    key: 'next',
                    header: 'Lịch kế tiếp',
                    hideBelow: 'lg',
                    cell: (station) => {
                      const next = nextAppointment(station);
                      return next ? `${next.start} · ${next.customer}` : null;
                    },
                  },
                  {
                    key: 'sanitized',
                    header: 'Vệ sinh',
                    hideBelow: 'md',
                    cell: (station) => (
                      <>
                        <p className="font-bold text-brand-text">{station.sanitizedAt}</p>
                        <p className="mt-1 text-caption text-brand-text-muted">Checklist {station.checklist}</p>
                      </>
                    ),
                  },
                  {
                    key: 'utilization',
                    header: 'Công suất',
                    numeric: true,
                    hideBelow: 'md',
                    cell: (station) => (
                      <>
                        <p className="font-bold text-brand-text">{utilization(station)}%</p>
                        <p className="mt-1 text-caption text-brand-text-muted">
                          {stationAppointments(station).length} lịch hôm nay
                        </p>
                      </>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Thao tác',
                    actions: true,
                    headerSrOnly: true,
                    cell: (station) => {
                      const status = effectiveStatus(station);
                      if (status === 'CLEANING') {
                        return (
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={(event) => { event.stopPropagation(); openCleaning(station); }}
                          >
                            Hoàn tất vệ sinh
                          </Button>
                        );
                      }
                      if (status === 'READY' && waitingAppointments.length > 0) {
                        return (
                          <Button
                            size="small"
                            variant="primary"
                            onClick={(event) => { event.stopPropagation(); openAssign(waitingAppointments[0], station.id); }}
                          >
                            Xếp khách
                          </Button>
                        );
                      }
                      return (
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={(event) => { event.stopPropagation(); setSelectedStation(station); }}
                        >
                          Xem
                        </Button>
                      );
                    },
                  },
                ]}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-brand-outline bg-brand-surface-high px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-brand-text-muted">
              Hiển thị <strong className="tabular-nums text-brand-text">{filteredStations.length}</strong> trên{' '}
              {scopedStations.length} vị trí
            </p>
            <p className="flex items-center gap-1.5 text-caption text-brand-text-muted">
              <ShieldCheck className="h-3.5 w-3.5" />
              Đồng bộ lịch hẹn trong ngày
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-caption font-black uppercase tracking-wide text-brand-tertiary">
                  Ưu tiên tại quầy
                </p>
                <h2 className="mt-1 text-card-title font-bold text-brand-text">Khách đang chờ ghế</h2>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-tertiary/15 text-brand-tertiary">
                <TimerReset className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4 space-y-2" aria-live="polite">
              {waitingAppointments.map((appointment) => (
                <article key={appointment.id} className="p-3 ui-tone ui-tone--warning">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-body font-bold text-brand-text">{appointment.customer}</p>
                      <p className="mt-1 truncate text-caption text-brand-text-muted">
                        {appointment.start} · {appointment.service}
                      </p>
                    </div>
                    <StatusBadge status="CONFIRMED" label="Đã đến" size="small" />
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    block
                    className="mt-3"
                    iconLeading={<Armchair />}
                    onClick={() => openAssign(appointment)}
                  >
                    Xếp ghế phù hợp
                  </Button>
                </article>
              ))}
              {!waitingAppointments.length && (
                <div className="rounded-card border border-dashed border-brand-outline py-7 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-brand-secondary" />
                  <p className="mt-2 text-body font-bold text-brand-text">Không có khách chờ ghế</p>
                  <p className="mt-1 text-caption text-brand-text-muted">Mọi khách đã đến đều có chỗ.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">
                  Việc cần xử lý
                </p>
                <h2 className="mt-1 text-card-title font-bold text-brand-text">Vệ sinh &amp; sự cố</h2>
              </div>
              <SprayCan className="h-4 w-4 text-brand-text-muted" />
            </div>
            <div className="mt-4 space-y-2">
              {cleaningStations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => openCleaning(station)}
                  aria-label={`Hoàn tất vệ sinh ${station.id}`}
                  className="flex h-auto w-full items-center gap-3 p-3 text-left shadow-none ui-tone ui-tone--info"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand-secondary">
                    <SprayCan className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-bold text-brand-text">{station.id}</span>
                    <span className="mt-1 block truncate text-caption text-brand-text-muted">
                      Checklist {station.checklist} · Cần xác nhận sạch
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand-text-muted" />
                </button>
              ))}
              {attentionStations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setSelectedStation(station)}
                  aria-label={`Xem sự cố ${station.id}`}
                  className="flex h-auto w-full items-center gap-3 p-3 text-left shadow-none ui-tone ui-tone--warning"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand-tertiary">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-bold text-brand-text">{station.id}</span>
                    <span className="mt-1 block truncate text-caption text-brand-text-muted">
                      {station.issue || 'Đang chờ xử lý'}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand-text-muted" />
                </button>
              ))}
              {!cleaningStations.length && !attentionStations.length && (
                <div className="rounded-card border border-dashed border-brand-outline py-7 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-brand-secondary" />
                  <p className="mt-2 text-body font-bold text-brand-text">
                    Tất cả vị trí đạt điều kiện vận hành
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Hộp thoại 1 — Chi tiết ghế */}
      <Modal
        open={Boolean(selectedStation)}
        onClose={() => setSelectedStation(null)}
        size="large"
        eyebrow={selectedStation?.id}
        title={selectedStation?.name ?? ''}
        description={selectedStation?.location}
        headerAside={
          detailStatus ? (
            <StatusBadge status={detailStatus} label={receptionStatusLabel[detailStatus]} size="small" />
          ) : undefined
        }
        icon={<Armchair />}
        footer={
          selectedStation && detailStatus ? (
            <>
              <p className="mr-auto flex items-center gap-1.5 text-caption text-brand-text-muted">
                <ShieldCheck className="h-3.5 w-3.5" />
                Mọi thao tác được lưu theo tài khoản lễ tân
              </p>
              {detailStatus === 'READY' && waitingAppointments.length > 0 && (
                <Button
                  variant="primary"
                  iconLeading={<UserRound />}
                  onClick={() => openAssign(waitingAppointments[0], selectedStation.id)}
                >
                  Xếp khách vào đây
                </Button>
              )}
              {detailStatus === 'CLEANING' && (
                <Button variant="primary" iconLeading={<SprayCan />} onClick={() => openCleaning(selectedStation)}>
                  Hoàn tất vệ sinh
                </Button>
              )}
              {!['MAINTENANCE', 'OUT_OF_SERVICE'].includes(detailStatus) && (
                <Button variant="secondary" iconLeading={<Wrench />} onClick={() => openIssue(selectedStation)}>
                  Báo sự cố
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selectedStation && detailStatus && (
          <div className="space-y-4">
            <section className={`p-4 ui-tone ui-tone--${statusTone(detailStatus)}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">
                    Trạng thái trực tiếp
                  </p>
                  <p className="mt-2 text-2xl font-black text-brand-text">
                    {receptionStatusLabel[detailStatus]}
                  </p>
                  <p className="mt-1 text-body text-brand-text-muted">
                    {detailCurrent
                      ? `Đang phục vụ ${detailCurrent.customer}`
                      : selectedStation.issue || 'Không có khách tại vị trí'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-control bg-brand-surface px-3 py-2">
                    <p className="text-caption text-brand-text-muted">Công suất</p>
                    <p className="mt-1 text-body font-bold tabular-nums text-brand-text">
                      {utilization(selectedStation)}%
                    </p>
                  </div>
                  <div className="rounded-control bg-brand-surface px-3 py-2">
                    <p className="text-caption text-brand-text-muted">Lịch hôm nay</p>
                    <p className="mt-1 text-body font-bold tabular-nums text-brand-text">
                      {stationAppointments(selectedStation).length}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {detailCurrent && (
              <section className="p-4 ui-tone ui-tone--info">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-caption font-black uppercase tracking-wide text-brand-secondary">
                      {detailCurrent.status === 'IN_SERVICE' ? 'Đang phục vụ' : 'Khách đã đến'}
                    </p>
                    <p className="mt-2 text-card-title font-bold text-brand-text">{detailCurrent.customer}</p>
                    <p className="mt-1 text-body text-brand-text-muted">{detailCurrent.service}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-body font-bold text-brand-text">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-4 w-4 text-brand-secondary" />
                        <span className="tabular-nums">{detailCurrent.start}–{endTime(detailCurrent)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <UserRound className="h-4 w-4 text-brand-secondary" />
                        {detailCurrent.staff}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${detailCurrent.phone.replace(/\D/g, '')}`}
                      className="flex h-[var(--size-control-sm)] w-[var(--size-control-sm)] items-center justify-center rounded-control border border-brand-outline bg-brand-surface text-brand-secondary"
                      aria-label={`Gọi ${detailCurrent.customer}`}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={`sms:${detailCurrent.phone.replace(/\D/g, '')}`}
                      className="flex h-[var(--size-control-sm)] w-[var(--size-control-sm)] items-center justify-center rounded-control border border-brand-outline bg-brand-surface text-brand-secondary"
                      aria-label={`Nhắn ${detailCurrent.customer}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                {detailCurrent.note && (
                  <p className="mt-3 rounded-control bg-brand-surface p-3 text-body leading-5 text-brand-text">
                    <strong>Lưu ý:</strong> {detailCurrent.note}
                  </p>
                )}
              </section>
            )}

            {detailNext && (
              <section className="flex items-start gap-3 p-4 ui-tone ui-tone--info">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand-secondary">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-caption font-black uppercase text-brand-secondary">
                    Lịch kế tiếp · {detailNext.start}
                  </p>
                  <p className="mt-1.5 text-body font-bold text-brand-text">{detailNext.customer}</p>
                  <p className="mt-1 text-caption text-brand-text-muted">
                    {detailNext.service} · {detailNext.staff}
                  </p>
                </div>
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-card border border-brand-outline p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption font-black uppercase text-brand-text-muted">
                      Vệ sinh &amp; khử khuẩn
                    </p>
                    <p className="mt-2 text-body font-bold text-brand-text">{selectedStation.sanitizedAt}</p>
                    <p className="mt-1 text-caption text-brand-text-muted">
                      Checklist {selectedStation.checklist}
                    </p>
                  </div>
                  <SprayCan className="h-5 w-5 text-brand-secondary" />
                </div>
              </section>
              <section className="rounded-card border border-brand-outline p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption font-black uppercase text-brand-text-muted">Bảo trì thiết bị</p>
                    <p className="mt-2 text-body font-bold text-brand-text">
                      Tiếp theo {selectedStation.nextMaintenance}
                    </p>
                    <p className="mt-1 text-caption text-brand-text-muted">
                      Gần nhất {selectedStation.lastMaintenance}
                    </p>
                  </div>
                  <Wrench className="h-5 w-5 text-brand-tertiary" />
                </div>
              </section>
            </div>

            <section className="rounded-card border border-brand-outline p-4">
              <p className="text-caption font-black uppercase text-brand-text-muted">Thiết bị đi kèm</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedStation.equipment.map((item) => (
                  <span
                    key={item}
                    className="rounded-control bg-brand-surface-high px-2.5 py-1.5 text-caption font-bold text-brand-text"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>

            {selectedStation.issue && (
              <section className="p-4 ui-tone ui-tone--warning">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-tertiary" />
                  <div>
                    <p className="text-body font-bold text-brand-text">{selectedStation.issue}</p>
                    <p className="mt-1 text-caption text-brand-text-muted">
                      Báo lúc {selectedStation.issueReportedAt || 'Chưa rõ'}
                    </p>
                    {selectedStation.note && (
                      <p className="mt-2 text-caption leading-5 text-brand-text-muted">
                        {selectedStation.note}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* Hộp thoại 2 — Xếp khách vào ghế */}
      <Modal
        open={Boolean(assignAppointment)}
        onClose={() => setAssignAppointment(null)}
        size="medium"
        eyebrow="Điều phối khách tại quầy"
        title="Xếp ghế phù hợp"
        description={
          assignAppointment ? `${assignAppointment.customer} · ${assignAppointment.service}` : undefined
        }
        icon={<Armchair />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignAppointment(null)}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="reception-assign-form"
              variant="primary"
              disabled={!assignStationId}
              iconLeading={<Armchair />}
            >
              Xác nhận xếp ghế
            </Button>
          </>
        }
      >
        {assignAppointment && (
          <form id="reception-assign-form" onSubmit={submitAssign} noValidate className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Giờ hẹn', value: assignAppointment.start },
                { label: 'Thời lượng', value: `${assignAppointment.duration} phút` },
                { label: 'Kỹ thuật viên', value: assignAppointment.staff },
              ].map((item) => (
                <div key={item.label} className="rounded-control bg-brand-surface-high p-3">
                  <p className="text-caption text-brand-text-muted">{item.label}</p>
                  <p className="mt-1 text-body font-bold text-brand-text">{item.value}</p>
                </div>
              ))}
            </div>

            <fieldset
              aria-describedby={formError ? 'assign-error' : 'assign-hint'}
              aria-invalid={formError ? true : undefined}
            >
              <legend className="text-body font-bold text-brand-text">
                Vị trí đang sẵn sàng ({suitableStations.length})
              </legend>
              <p id="assign-hint" className="mt-1 text-caption text-brand-text-muted">
                Chỉ hiển thị ghế/phòng phù hợp với loại dịch vụ.
              </p>

              {formError && (
                <p
                  id="assign-error"
                  role="alert"
                  className="mt-3 flex items-start gap-2 p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </p>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {suitableStations.map((station) => {
                  const active = assignStationId === station.id;
                  return (
                    <label
                      key={station.id}
                      className={`flex cursor-pointer flex-col gap-2 p-3 ui-tone ${active ? 'ui-tone--success' : ''}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-body font-bold text-brand-text">{station.id}</span>
                          <span className="mt-1 block truncate text-caption text-brand-text-muted">
                            {areaMeta[station.area].label}
                          </span>
                        </span>
                        <input
                          type="radio"
                          name="assign-station"
                          value={station.id}
                          checked={active}
                          onChange={() => setAssignStationId(station.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                        />
                      </span>
                      <span className="flex items-center gap-1 text-caption font-bold text-brand-secondary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Đã vệ sinh {station.sanitizedAt}
                      </span>
                    </label>
                  );
                })}
              </div>

              {!suitableStations.length && (
                <div className="mt-3 border border-dashed p-6 text-center ui-tone ui-tone--warning">
                  <AlertTriangle className="mx-auto h-6 w-6 text-brand-tertiary" />
                  <p className="mt-2 text-body font-bold text-brand-text">
                    Chưa có vị trí phù hợp đang sẵn sàng
                  </p>
                  <p className="mt-1 text-caption text-brand-text-muted">
                    Hoàn tất vệ sinh một ghế hoặc chờ khách hiện tại xong.
                  </p>
                </div>
              )}
            </fieldset>
          </form>
        )}
      </Modal>

      {/* Hộp thoại 3 — Checklist vệ sinh */}
      <Modal
        open={Boolean(cleaningStation)}
        onClose={() => setCleaningStation(null)}
        size="medium"
        eyebrow="Checklist vệ sinh"
        title={cleaningStation?.name ?? ''}
        description="Hoàn thành đầy đủ trước khi chuyển sang sẵn sàng."
        icon={<SprayCan />}
        footer={
          <>
            <p className="mr-auto text-caption font-bold tabular-nums text-brand-text-muted">
              {cleaningChecks.length}/{cleaningItems.length} hoàn thành
            </p>
            <Button variant="secondary" onClick={() => setCleaningStation(null)}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="reception-cleaning-form"
              variant="primary"
              disabled={cleaningChecks.length !== cleaningItems.length}
              iconLeading={<CheckCircle2 />}
            >
              Xác nhận sạch
            </Button>
          </>
        }
      >
        {cleaningStation && (
          <form id="reception-cleaning-form" onSubmit={completeCleaning} noValidate>
            {formError && (
              <p
                role="alert"
                className="mb-4 flex items-start gap-2 p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </p>
            )}
            <fieldset>
              <legend className="sr-only">Các bước vệ sinh bắt buộc</legend>
              <div className="space-y-2">
                {cleaningItems.map((item, index) => {
                  const checked = cleaningChecks.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex cursor-pointer items-center gap-3 p-3 ui-tone ${checked ? 'ui-tone--success' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCleaningCheck(item)}
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-caption font-black text-brand-text-muted">
                        {index + 1}
                      </span>
                      <span className="text-body font-bold text-brand-text">{item}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="mt-4 text-caption text-brand-text-muted">
              Cần đủ {cleaningRequired} bước để chuyển vị trí sang trạng thái sẵn sàng.
            </p>
          </form>
        )}
      </Modal>

      {/* Hộp thoại 4 — Báo sự cố */}
      <Modal
        open={Boolean(issueStation)}
        onClose={() => setIssueStation(null)}
        size="medium"
        eyebrow="Báo sự cố vị trí"
        title={issueStation?.name ?? ''}
        description="Vị trí sẽ ngừng nhận khách ngay sau khi gửi."
        icon={<Wrench />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssueStation(null)}>
              Hủy
            </Button>
            <Button type="submit" form="reception-issue-form" variant="danger" iconLeading={<Wrench />}>
              Khóa &amp; gửi cảnh báo
            </Button>
          </>
        }
      >
        {issueStation && (
          <form id="reception-issue-form" onSubmit={submitIssue} noValidate className="space-y-4">
            <Field label="Mức độ khóa vị trí" required>
              <BeautifulSelect
                value={issueForm.severity}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    severity: event.target.value as 'MAINTENANCE' | 'OUT_OF_SERVICE',
                  }))
                }
              >
                <option value="MAINTENANCE">Bảo trì tạm thời</option>
                <option value="OUT_OF_SERVICE">Ngừng sử dụng vì an toàn</option>
              </BeautifulSelect>
            </Field>

            <Field
              label="Mô tả sự cố"
              required
              error={formError || undefined}
              helper="Mô tả rõ để kỹ thuật xử lý đúng, ít nhất 5 ký tự."
            >
              <textarea
                value={issueForm.issue}
                onChange={(event) => setIssueForm((current) => ({ ...current, issue: event.target.value }))}
                placeholder="Ví dụ: đèn UV không hoạt động, bồn ngâm rò nước..."
                className="min-h-20 resize-y py-3"
              />
            </Field>

            <Field label="Ghi chú xử lý ban đầu" helper="Không bắt buộc.">
              <textarea
                value={issueForm.note}
                onChange={(event) => setIssueForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Đã ngắt điện, đặt biển cảnh báo, liên hệ kỹ thuật..."
                className="min-h-20 resize-y py-3"
              />
            </Field>

            <p className="flex gap-2 p-3 text-caption leading-5 text-brand-text ui-tone ui-tone--warning">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Receptionist có thể khóa vị trí và báo sự cố; chỉ quản lý mới được xác nhận sửa xong và
              mở lại.
            </p>
          </form>
        )}
      </Modal>
    </div>
  );
}
