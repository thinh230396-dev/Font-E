import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  Activity, Armchair, CalendarClock, Check, ChevronRight, CircleAlert,
  Grid3X3, LayoutList, MapPin, Pencil, Plus, Search, ShieldCheck, Sparkles,
  SprayCan, UserRound, Wrench, X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { Button, DataTable, Field, Modal, StatusBadge, getStatusDefinition, PageHeader } from './ui';

type StationArea = string;
type StationStatus = 'READY' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
type BranchCode = 'Q1' | 'Q3';

interface StationAppointment {
  id: string;
  customer: string;
  service: string;
  technician: string;
  start: string;
  end: string;
}

interface TenantStation {
  id: string;
  name: string;
  area: StationArea;
  branch: BranchCode;
  status: StationStatus;
  location: string;
  equipment: string[];
  current?: StationAppointment;
  next?: StationAppointment;
  utilization: number;
  bookingsToday: number;
  sanitizedAt?: string;
  checklist: string;
  lastMaintenance: string;
  nextMaintenance: string;
  issue?: string;
  note?: string;
}

interface StationAction {
  label: string;
  target: StationStatus;
}

interface TenantArea {
  id: StationArea;
  label: string;
  branch: BranchCode;
}

interface TenantAdminStationsProps {
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
}

/** Nhãn mặc định của các khu vực dựng sẵn. Màu sắc do design token đảm nhiệm. */
const areaMeta: Record<string, { label: string; short: string }> = {
  MANICURE: { label: 'Khu Manicure', short: 'M' },
  PEDICURE: { label: 'Khu Pedicure', short: 'P' },
  VIP: { label: 'Khu VIP', short: 'V' }
};

const defaultAreas: TenantArea[] = (['Q3', 'Q1'] as BranchCode[]).flatMap((branch) => [
  { id: 'MANICURE', label: 'Khu Manicure', branch },
  { id: 'PEDICURE', label: 'Khu Pedicure', branch },
  { id: 'VIP', label: 'Khu VIP', branch }
]);

/**
 * Nhãn và tông của trạng thái ghế do StatusBadge quản lý (một nơi duy nhất).
 * Ở đây chỉ giữ nhãn rút gọn dùng cho chú giải sơ đồ — thứ StatusBadge không có.
 */
const statusShortLabel: Record<StationStatus, string> = {
  READY: 'Trống',
  OCCUPIED: 'Đang làm',
  RESERVED: 'Đã giữ',
  CLEANING: 'Vệ sinh',
  MAINTENANCE: 'Bảo trì',
  OUT_OF_SERVICE: 'Đã khóa'
};

const statusOrder: StationStatus[] = ['READY', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'];

const statusLabel = (status: StationStatus) => getStatusDefinition(status).label;
const statusTone = (status: StationStatus) => getStatusDefinition(status).tone;

const stationActions: Record<StationStatus, StationAction[]> = {
  READY: [
    { label: 'Đặt lịch', target: 'RESERVED' },
    { label: 'Bắt đầu phục vụ', target: 'OCCUPIED' },
    { label: 'Bắt đầu vệ sinh', target: 'CLEANING' },
    { label: 'Đưa vào bảo trì', target: 'MAINTENANCE' },
    { label: 'Ngừng sử dụng', target: 'OUT_OF_SERVICE' }
  ],
  OCCUPIED: [
    { label: 'Kết thúc & vệ sinh', target: 'CLEANING' },
    { label: 'Đưa vào bảo trì', target: 'MAINTENANCE' },
    { label: 'Ngừng sử dụng', target: 'OUT_OF_SERVICE' }
  ],
  RESERVED: [
    { label: 'Bắt đầu phục vụ', target: 'OCCUPIED' },
    { label: 'Hủy giữ chỗ', target: 'READY' },
    { label: 'Đưa vào bảo trì', target: 'MAINTENANCE' },
    { label: 'Ngừng sử dụng', target: 'OUT_OF_SERVICE' }
  ],
  CLEANING: [
    { label: 'Xác nhận đã vệ sinh', target: 'READY' },
    { label: 'Đưa vào bảo trì', target: 'MAINTENANCE' },
    { label: 'Ngừng sử dụng', target: 'OUT_OF_SERVICE' }
  ],
  MAINTENANCE: [
    { label: 'Mở lại vị trí', target: 'READY' },
    { label: 'Ngừng sử dụng', target: 'OUT_OF_SERVICE' }
  ],
  OUT_OF_SERVICE: [
    { label: 'Mở lại vị trí', target: 'READY' },
    { label: 'Chuyển sang bảo trì', target: 'MAINTENANCE' }
  ]
};

const appointment = (id: string, customer: string, service: string, technician: string, start: string, end: string): StationAppointment => ({ id, customer, service, technician, start, end });
const checklistTotal = (area: StationArea) => area === 'PEDICURE' ? 10 : area === 'VIP' ? 12 : 8;
const defaultAppointmentTimes = () => {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const time = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return { start: time(now), end: time(later) };
};

const stationSeed: TenantStation[] = [
  { id: 'M-01', name: 'Bàn Manicure 01', area: 'MANICURE', branch: 'Q3', status: 'OCCUPIED', location: 'Khu A · Gần lễ tân', equipment: ['Đèn UV', 'Máy mài', 'Máy hút bụi'], current: appointment('APT-1043', 'Trần Thu Hà', 'Combo manicure & sơn gel', 'Minh Khang', '10:15', '11:30'), next: appointment('APT-1047', 'Bùi Thanh Trúc', 'Sơn gel Hàn Quốc', 'Thuỳ Dương', '16:00', '17:00'), utilization: 82, bookingsToday: 5, sanitizedAt: '09:58', checklist: '8/8', lastMaintenance: '01/07/2026', nextMaintenance: '01/08/2026' },
  { id: 'M-02', name: 'Bàn Manicure 02', area: 'MANICURE', branch: 'Q3', status: 'CLEANING', location: 'Khu A · Bàn đôi', equipment: ['Đèn UV', 'Máy mài', 'Hút bụi âm bàn'], utilization: 74, bookingsToday: 4, sanitizedAt: 'Đang thực hiện', checklist: '6/8', lastMaintenance: '28/06/2026', nextMaintenance: '28/07/2026', note: 'Hoàn tất khử khuẩn trước 14:50.' },
  { id: 'M-03', name: 'Bàn Manicure 03', area: 'MANICURE', branch: 'Q3', status: 'READY', location: 'Khu A · Cạnh tủ màu', equipment: ['Đèn UV', 'Máy mài'], next: appointment('APT-1056', 'Nguyễn Hải Yến', 'Sơn gel Hàn Quốc', 'Thảo Nguyễn', '15:30', '16:30'), utilization: 58, bookingsToday: 3, sanitizedAt: '14:12', checklist: '8/8', lastMaintenance: '03/07/2026', nextMaintenance: '03/08/2026' },
  { id: 'M-04', name: 'Bàn Manicure 04', area: 'MANICURE', branch: 'Q3', status: 'RESERVED', location: 'Khu A · Gần cửa sổ', equipment: ['Đèn UV', 'Máy mài', 'Đèn chụp ảnh'], next: appointment('APT-1057', 'Lê Phương Anh', 'Nail Art Premium', 'Thảo Nguyễn', '14:45', '16:45'), utilization: 91, bookingsToday: 6, sanitizedAt: '14:20', checklist: '8/8', lastMaintenance: '02/07/2026', nextMaintenance: '02/08/2026' },
  { id: 'M-05', name: 'Bàn Manicure 05', area: 'MANICURE', branch: 'Q3', status: 'READY', location: 'Khu A · Cuối phòng', equipment: ['Đèn UV', 'Máy mài'], utilization: 46, bookingsToday: 2, sanitizedAt: '13:48', checklist: '8/8', lastMaintenance: '05/07/2026', nextMaintenance: '05/08/2026' },
  { id: 'P-01', name: 'Ghế Pedicure 01', area: 'PEDICURE', branch: 'Q3', status: 'OCCUPIED', location: 'Khu B · Bồn massage', equipment: ['Ghế điện', 'Bồn ngâm', 'Đèn UV'], current: appointment('APT-1045', 'Phạm Hoài Nam', 'Pedicure spa chuyên sâu', 'Quốc Bảo', '13:45', '15:15'), utilization: 79, bookingsToday: 4, sanitizedAt: '13:26', checklist: '10/10', lastMaintenance: '05/07/2026', nextMaintenance: '25/07/2026' },
  { id: 'P-02', name: 'Ghế Pedicure 02', area: 'PEDICURE', branch: 'Q3', status: 'READY', location: 'Khu B · Bồn massage', equipment: ['Ghế điện', 'Bồn ngâm', 'Máy sấy'], next: appointment('APT-1058', 'Bảo Ngọc', 'Pedicure spa chuyên sâu', 'Quốc Bảo', '15:30', '17:00'), utilization: 68, bookingsToday: 3, sanitizedAt: '14:05', checklist: '10/10', lastMaintenance: '06/07/2026', nextMaintenance: '26/07/2026' },
  { id: 'P-03', name: 'Ghế Pedicure 03', area: 'PEDICURE', branch: 'Q3', status: 'MAINTENANCE', location: 'Khu B · Gần cửa sổ', equipment: ['Ghế điện', 'Bồn ngâm'], utilization: 0, bookingsToday: 0, checklist: '4/10', lastMaintenance: '16/07/2026', nextMaintenance: '17/07/2026', issue: 'Áp lực nước bồn ngâm yếu', note: 'NailPro Equipment xử lý trước 17:00.' },
  { id: 'V-01', name: 'Phòng VIP 01', area: 'VIP', branch: 'Q3', status: 'OCCUPIED', location: 'Tầng lửng · Phòng riêng', equipment: ['Bàn manicure', 'Ghế pedicure', 'TV', 'Tủ lạnh mini'], current: appointment('APT-1042', 'Nguyễn Minh Anh', 'Nail Art Premium', 'Thảo Nguyễn', '10:00', '12:00'), utilization: 76, bookingsToday: 3, sanitizedAt: '09:32', checklist: '12/12', lastMaintenance: '30/06/2026', nextMaintenance: '30/07/2026' },
  { id: 'M-11', name: 'Bàn Manicure 01', area: 'MANICURE', branch: 'Q1', status: 'OCCUPIED', location: 'Khu A · Quận 1', equipment: ['Đèn UV', 'Máy mài'], current: appointment('APT-1049', 'Trương Bảo Ngọc', 'Dặm gel & sửa form', 'Hà My', '09:00', '10:00'), utilization: 72, bookingsToday: 4, sanitizedAt: '08:42', checklist: '8/8', lastMaintenance: '04/07/2026', nextMaintenance: '04/08/2026' },
  { id: 'M-12', name: 'Bàn Manicure 02', area: 'MANICURE', branch: 'Q1', status: 'READY', location: 'Khu A · Quận 1', equipment: ['Đèn UV', 'Máy mài'], utilization: 52, bookingsToday: 3, sanitizedAt: '14:18', checklist: '8/8', lastMaintenance: '07/07/2026', nextMaintenance: '07/08/2026' },
  { id: 'P-11', name: 'Ghế Pedicure 01', area: 'PEDICURE', branch: 'Q1', status: 'CLEANING', location: 'Khu B · Quận 1', equipment: ['Ghế điện', 'Bồn ngâm'], utilization: 64, bookingsToday: 3, sanitizedAt: 'Đang thực hiện', checklist: '7/10', lastMaintenance: '08/07/2026', nextMaintenance: '28/07/2026' },
  { id: 'V-11', name: 'Phòng VIP 01', area: 'VIP', branch: 'Q1', status: 'RESERVED', location: 'Tầng 2 · Phòng riêng', equipment: ['Bàn manicure', 'Ghế pedicure', 'TV'], next: appointment('APT-1060', 'Đinh Gia Hân', 'Combo VIP', 'Hà My', '16:00', '18:00'), utilization: 61, bookingsToday: 2, sanitizedAt: '14:00', checklist: '12/12', lastMaintenance: '02/07/2026', nextMaintenance: '02/08/2026' },
  { id: 'M-13', name: 'Bàn Manicure 03', area: 'MANICURE', branch: 'Q1', status: 'OUT_OF_SERVICE', location: 'Khu A · Quận 1', equipment: ['Đèn UV'], utilization: 0, bookingsToday: 0, checklist: '0/8', lastMaintenance: '15/07/2026', nextMaintenance: '18/07/2026', issue: 'Chờ thay ổ cắm điện', note: 'Đã khóa nhận lịch đến khi nghiệm thu an toàn.' }
];

const formatPercent = (value: number) => `${Math.min(100, Math.max(0, value))}%`;

export default function TenantAdminStations({
  searchQuery, onSearchQueryChange, selectedBranch, onSelectedBranchChange, branchLocked = false,
  tenantName = 'Nailé Studio', roleLabel = 'Owner · Tenant Admin', accessMode = 'full', readOnlyReason = '', onNotify
}: TenantAdminStationsProps) {
  const storageKey = `tenant-admin-stations-v2:${tenantName}`;
  const areaStorageKey = `tenant-admin-station-areas-v1:${tenantName}`;
  const [stations, setStations] = useState<TenantStation[]>(() => {
    if (typeof window === 'undefined') return getTenantAdminInitialData(null, stationSeed);
    try { const stored = window.localStorage.getItem(storageKey); return getTenantAdminInitialData(stored ? JSON.parse(stored) as TenantStation[] : null, stationSeed); } catch { return getTenantAdminInitialData(null, stationSeed); }
  });
  const [areas, setAreas] = useState<TenantArea[]>(() => {
    if (typeof window === 'undefined') return defaultAreas;
    try {
      const stored = window.localStorage.getItem(areaStorageKey);
      return stored ? JSON.parse(stored) as TenantArea[] : defaultAreas;
    } catch {
      return defaultAreas;
    }
  });
  const [areaFilter, setAreaFilter] = useState<'ALL' | StationArea>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StationStatus>('ALL');
  const [viewMode, setViewMode] = useState<'FLOOR' | 'LIST'>('FLOOR');
  const [selectedStation, setSelectedStation] = useState<TenantStation | null>(null);
  const [stationAction, setStationAction] = useState<StationStatus | ''>('');
  const [appointmentAction, setAppointmentAction] = useState<'RESERVED' | 'OCCUPIED' | null>(null);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentForm, setAppointmentForm] = useState({ customer: '', service: '', technician: '', start: '', end: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [areaManagerOpen, setAreaManagerOpen] = useState(false);
  const [areaManagerBranch, setAreaManagerBranch] = useState<BranchCode>('Q3');
  const [areaManagerError, setAreaManagerError] = useState('');
  const [areaManagerName, setAreaManagerName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<StationArea | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');
  const [deleteConfirmAreaId, setDeleteConfirmAreaId] = useState<StationArea | null>(null);
  const [form, setForm] = useState({ id: '', name: '', area: 'MANICURE' as StationArea, branch: 'Q3' as BranchCode, location: '', equipment: '' });
  const canManage = accessMode === 'full' && !readOnlyReason;

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(stations)); }, [stations, storageKey]);
  useEffect(() => { window.localStorage.setItem(areaStorageKey, JSON.stringify(areas)); }, [areaStorageKey, areas]);
  useEffect(() => { setStationAction(''); }, [selectedStation?.id, selectedStation?.status]);
  // Escape và khoá cuộn nền do <Modal> đảm nhiệm, không cần xử lý thủ công ở đây.

  const requireManage = () => {
    if (canManage) return true;
    onNotify?.(readOnlyReason || 'Bạn chỉ có quyền xem sơ đồ ghế trong gói hiện tại.');
    return false;
  };

  const filteredStations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stations.filter((station) => selectedBranch === 'ALL' || station.branch === selectedBranch)
      .filter((station) => areaFilter === 'ALL' || station.area === areaFilter)
      .filter((station) => statusFilter === 'ALL' || station.status === statusFilter)
      .filter((station) => !query || `${station.id} ${station.name} ${station.location} ${station.current?.customer || ''} ${station.current?.technician || ''}`.toLowerCase().includes(query));
  }, [areaFilter, searchQuery, selectedBranch, stations, statusFilter]);

  const scopedStations = stations.filter((station) => selectedBranch === 'ALL' || station.branch === selectedBranch);
  const occupiedCount = scopedStations.filter((station) => station.status === 'OCCUPIED').length;
  const readyCount = scopedStations.filter((station) => station.status === 'READY').length;
  const attentionCount = scopedStations.filter((station) => ['MAINTENANCE', 'OUT_OF_SERVICE'].includes(station.status)).length;
  const averageUtilization = scopedStations.length ? Math.round(scopedStations.reduce((sum, station) => sum + station.utilization, 0) / scopedStations.length) : 0;
  const visibleAreas = useMemo(() => {
    const configured = areas.filter((area) => selectedBranch === 'ALL' || area.branch === selectedBranch);
    const used = stations
      .filter((station) => selectedBranch === 'ALL' || station.branch === selectedBranch)
      .map((station) => ({ id: station.area, label: areaMeta[station.area]?.label || station.area, branch: station.branch }));
    return [...configured, ...used].filter((area, index, items) => items.findIndex((item) => item.id === area.id) === index);
  }, [areas, selectedBranch, stations]);
  const formAreas = areas.filter((area) => area.branch === form.branch);
  const getAreaPresentation = (areaId: StationArea, branch?: BranchCode) => {
    const scopedBranch = branch || (selectedBranch === 'Q1' || selectedBranch === 'Q3' ? selectedBranch : undefined);
    const configured = areas.find((area) => area.id === areaId && (!scopedBranch || area.branch === scopedBranch));
    if (configured) {
      const fallback = areaMeta[areaId];
      return {
        label: configured.label,
        short: fallback?.short || configured.label.trim().charAt(0).toUpperCase()
      };
    }
    return areaMeta[areaId] || { label: areaId, short: areaId.trim().charAt(0).toUpperCase() };
  };

  const getActionBlockReason = (station: TenantStation, action: StationAction) => {
    if (['MAINTENANCE', 'OUT_OF_SERVICE'].includes(action.target) && (station.status === 'OCCUPIED' || station.current)) return 'Vị trí đang phục vụ khách. Hãy kết thúc dịch vụ và vệ sinh trước.';
    return '';
  };

  const updateStatus = (station: TenantStation, status: StationStatus) => {
    if (!requireManage()) return;
    const action = stationActions[station.status].find((item) => item.target === status);
    if (!action) {
      onNotify?.('Thao tác này không phù hợp với trạng thái hiện tại của vị trí.');
      return;
    }
    const blockReason = getActionBlockReason(station, action);
    if (blockReason) {
      onNotify?.(blockReason);
      return;
    }

    const patch: Partial<TenantStation> = { status };
    const totalChecklist = checklistTotal(station.area);

    if (status === 'OCCUPIED' && !station.current && station.next) {
      patch.current = station.next;
      patch.next = undefined;
    }
    if (status === 'RESERVED') {
      patch.current = undefined;
      if (station.next) patch.next = station.next;
    }
    if (status === 'CLEANING') {
      patch.current = undefined;
      patch.sanitizedAt = 'Đang thực hiện';
      patch.checklist = `0/${totalChecklist}`;
    }
    if (status === 'READY') {
      patch.current = undefined;
      patch.issue = undefined;
      if (station.status === 'CLEANING') {
        patch.sanitizedAt = `Vừa xong · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        patch.checklist = `${totalChecklist}/${totalChecklist}`;
      }
      if (station.status === 'RESERVED') patch.next = undefined;
    }
    if (status === 'MAINTENANCE') {
      patch.current = undefined;
      patch.issue = station.issue || 'Chờ cập nhật nội dung bảo trì.';
    }
    if (status === 'OUT_OF_SERVICE') {
      patch.current = undefined;
      patch.issue = station.issue || 'Vị trí đang tạm ngừng sử dụng.';
    }

    setStations((current) => current.map((item) => item.id === station.id ? { ...item, ...patch } : item));
    setSelectedStation((current) => current?.id === station.id ? { ...current, ...patch } : current);
    onNotify?.(`Đã thực hiện “${action.label}” cho ${station.id}.`);
  };

  const applyStationAction = () => {
    if (!selectedStation || !stationAction) {
      onNotify?.('Vui lòng chọn thao tác cho vị trí.');
      return;
    }
    if (['RESERVED', 'OCCUPIED'].includes(stationAction) && !selectedStation.current && !selectedStation.next) {
      const times = defaultAppointmentTimes();
      setAppointmentForm({ customer: '', service: '', technician: '', ...times });
      setAppointmentError('');
      setAppointmentAction(stationAction as 'RESERVED' | 'OCCUPIED');
      return;
    }
    updateStatus(selectedStation, stationAction);
  };

  const submitAppointmentAction = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStation || !appointmentAction) return;
    const { customer, service, technician, start, end } = appointmentForm;
    if (!customer.trim() || !service.trim() || !technician.trim() || !start || !end) {
      setAppointmentError('Vui lòng nhập đầy đủ khách hàng, dịch vụ, kỹ thuật viên và thời gian.');
      return;
    }
    if (end <= start) {
      setAppointmentError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    const newAppointment = appointment(
      `APT-${Date.now().toString().slice(-6)}`,
      customer.trim(),
      service.trim(),
      technician.trim(),
      start,
      end
    );
    updateStatus({ ...selectedStation, next: newAppointment }, appointmentAction);
    setAppointmentAction(null);
    setAppointmentError('');
  };

  const openCreate = () => {
    if (!requireManage()) return;
    const branch = selectedBranch === 'Q1' ? 'Q1' : 'Q3';
    setForm({ id: '', name: '', area: 'MANICURE', branch, location: '', equipment: '' });
    setAddingArea(false);
    setNewAreaName('');
    setFormError('');
    setCreateOpen(true);
  };

  const addArea = () => {
    const label = newAreaName.trim();
    if (!label) {
      setFormError('Vui lòng nhập tên khu vực mới.');
      return;
    }
    if (areas.some((area) => area.branch === form.branch && area.label.toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi'))) {
      setFormError('Khu vực này đã tồn tại trong chi nhánh.');
      return;
    }
    const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase() || 'KHU_VUC';
    const id = `${form.branch}_${slug}_${Date.now().toString().slice(-5)}`;
    const area: TenantArea = { id, label, branch: form.branch };
    setAreas((current) => [...current, area]);
    setForm((current) => ({ ...current, area: id }));
    setAddingArea(false);
    setNewAreaName('');
    setFormError('');
    onNotify?.(`Đã thêm “${label}” vào chi nhánh ${form.branch === 'Q3' ? 'Quận 3' : 'Quận 1'}.`);
  };

  const openAreaManager = () => {
    if (!requireManage()) return;
    setAreaManagerBranch(selectedBranch === 'Q1' ? 'Q1' : 'Q3');
    setAreaManagerName('');
    setAreaManagerError('');
    setEditingAreaId(null);
    setDeleteConfirmAreaId(null);
    setAreaManagerOpen(true);
  };

  const addManagedArea = () => {
    const label = areaManagerName.trim();
    if (!label) {
      setAreaManagerError('Vui lòng nhập tên khu vực mới.');
      return;
    }
    if (areas.some((area) => area.branch === areaManagerBranch && area.label.toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi'))) {
      setAreaManagerError('Khu vực này đã tồn tại trong chi nhánh.');
      return;
    }
    const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase() || 'KHU_VUC';
    const area: TenantArea = { id: `${areaManagerBranch}_${slug}_${Date.now().toString().slice(-5)}`, label, branch: areaManagerBranch };
    setAreas((current) => [...current, area]);
    setAreaManagerName('');
    setAreaManagerError('');
    onNotify?.(`Đã thêm khu vực “${label}”.`);
  };

  const saveAreaName = (area: TenantArea) => {
    const label = editingAreaName.trim();
    if (!label) {
      setAreaManagerError('Tên khu vực không được để trống.');
      return;
    }
    if (areas.some((item) => item.branch === area.branch && item.id !== area.id && item.label.toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi'))) {
      setAreaManagerError('Tên khu vực này đã tồn tại trong chi nhánh.');
      return;
    }
    setAreas((current) => current.map((item) => item.id === area.id && item.branch === area.branch ? { ...item, label } : item));
    setEditingAreaId(null);
    setEditingAreaName('');
    setAreaManagerError('');
    onNotify?.(`Đã đổi tên khu vực thành “${label}”.`);
  };

  const deleteArea = (area: TenantArea) => {
    const usedCount = stations.filter((station) => station.branch === area.branch && station.area === area.id).length;
    if (usedCount) {
      setAreaManagerError(`Không thể xóa vì khu vực này còn ${usedCount} vị trí. Hãy chuyển hoặc xóa các vị trí trước.`);
      setDeleteConfirmAreaId(null);
      return;
    }
    if (areas.filter((item) => item.branch === area.branch).length <= 1) {
      setAreaManagerError('Mỗi chi nhánh phải có ít nhất một khu vực.');
      setDeleteConfirmAreaId(null);
      return;
    }
    setAreas((current) => current.filter((item) => !(item.id === area.id && item.branch === area.branch)));
    if (areaFilter === area.id) setAreaFilter('ALL');
    setDeleteConfirmAreaId(null);
    setAreaManagerError('');
    onNotify?.(`Đã xóa khu vực “${area.label}”.`);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!form.id.trim() || !form.name.trim() || !form.location.trim() || !form.equipment.trim()) { setFormError('Vui lòng nhập mã, tên, vị trí và thiết bị đi kèm.'); return; }
    if (stations.some((station) => station.id.toLowerCase() === form.id.trim().toLowerCase())) { setFormError('Mã vị trí đã tồn tại trong tenant.'); return; }
    const totalChecklist = checklistTotal(form.area);
    const station: TenantStation = { id: form.id.trim().toUpperCase(), name: form.name.trim(), area: form.area, branch: form.branch, status: 'READY', location: form.location.trim(), equipment: form.equipment.split(',').map((item) => item.trim()).filter(Boolean), utilization: 0, bookingsToday: 0, sanitizedAt: 'Vừa xong', checklist: `${totalChecklist}/${totalChecklist}`, lastMaintenance: 'Chưa có', nextMaintenance: 'Sau 30 ngày', note: `Tạo bởi ${roleLabel}` };
    setStations((current) => [...current, station]); setSelectedStation(station); setCreateOpen(false); onNotify?.(`Đã thêm ${station.name}.`);
  };

  const branchName = (branch: BranchCode) => branch === 'Q3' ? 'Quận 3' : 'Quận 1';

  return (
    <div className="space-y-5">
      {/* Đầu trang: tiêu đề, phạm vi chi nhánh và hành động chính (README §8.2, §8.3) */}
      <PageHeader
        title="Ghế & khu vực"
        actions={(
          <>
          <BeautifulSelect
            value={selectedBranch}
            onChange={(event) => onSelectedBranchChange(event.target.value)}
            disabled={branchLocked}
            aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'}
            className="w-full sm:w-48"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            <option value="Q3">Chi nhánh Quận 3</option>
            <option value="Q1">Chi nhánh Quận 1</option>
          </BeautifulSelect>
          <Button variant="secondary" onClick={openAreaManager} disabled={!canManage} iconLeading={<Pencil />}>
            Quản lý khu vực
          </Button>
          <Button
            variant="primary"
            onClick={openCreate}
            disabled={!canManage || branchLocked}
            title={branchLocked ? 'Receptionist không có quyền thay đổi cấu hình ghế/phòng' : undefined}
            iconLeading={<Plus />}
          >
            Thêm vị trí
          </Button>
          </>
        )}
      />


      {/* Chỉ số tổng quan */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tổng vị trí', value: scopedStations.length, detail: `${scopedStations.filter((item) => item.area === 'MANICURE').length} Manicure · ${scopedStations.filter((item) => item.area === 'PEDICURE').length} Pedicure · ${scopedStations.filter((item) => item.area === 'VIP').length} VIP`, icon: Armchair },
          { label: 'Đang sử dụng', value: occupiedCount, detail: `${Math.round(occupiedCount / Math.max(1, scopedStations.length) * 100)}% công suất tức thời`, icon: Activity },
          { label: 'Sẵn sàng', value: readyCount, detail: 'Đã hoàn tất vệ sinh & checklist', icon: Sparkles },
          { label: 'Cần xử lý', value: attentionCount, detail: `${averageUtilization}% công suất trung bình ngày`, icon: Wrench }
        ].map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption font-bold text-brand-text-muted">{label}</p>
                <p className="ta-metric-value mt-1.5 text-brand-text">{value}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-primary/10 text-brand-primary">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-2 text-caption text-brand-text-muted">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-card border border-brand-outline bg-brand-surface shadow-card">
        {/* Thanh công cụ: tìm kiếm, lọc trạng thái, đổi cách xem */}
        <div className="flex flex-col gap-3 border-b border-brand-outline p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Tìm mã ghế, khu vực, khách..."
              aria-label="Tìm vị trí"
              className="h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface-lowest pl-9 pr-9 text-body outline-none focus:border-brand-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-brand-text-muted shadow-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BeautifulSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | StationStatus)}
              aria-label="Lọc theo trạng thái"
              className="w-44"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {statusOrder.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
            </BeautifulSelect>
            <div className="flex items-center gap-1 rounded-control border border-brand-outline p-1">
              <Button
                size="small"
                variant={viewMode === 'FLOOR' ? 'primary' : 'ghost'}
                iconOnly
                aria-label="Xem sơ đồ"
                aria-pressed={viewMode === 'FLOOR'}
                onClick={() => setViewMode('FLOOR')}
              >
                <Grid3X3 />
              </Button>
              <Button
                size="small"
                variant={viewMode === 'LIST' ? 'primary' : 'ghost'}
                iconOnly
                aria-label="Xem danh sách"
                aria-pressed={viewMode === 'LIST'}
                onClick={() => setViewMode('LIST')}
              >
                <LayoutList />
              </Button>
            </div>
          </div>
        </div>

        {/* Lọc theo khu vực + chú giải trạng thái */}
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-outline bg-brand-surface-high px-4 py-3">
          {(['ALL', ...visibleAreas.map((area) => area.id)] as StationArea[]).map((area) => {
            const count = area === 'ALL' ? scopedStations.length : scopedStations.filter((station) => station.area === area).length;
            return (
              <Button
                key={area}
                size="small"
                variant={areaFilter === area ? 'primary' : 'secondary'}
                aria-pressed={areaFilter === area}
                onClick={() => setAreaFilter(area)}
              >
                {area === 'ALL' ? 'Tất cả khu vực' : getAreaPresentation(area).label}
                <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
              </Button>
            );
          })}
          <span className="ml-auto hidden flex-wrap items-center gap-3 text-caption text-brand-text-muted lg:flex">
            {statusOrder.slice(0, 5).map((status) => (
              <StatusBadge key={status} status={status} label={statusShortLabel[status]} size="small" />
            ))}
          </span>
        </div>

        {viewMode === 'FLOOR' ? (
          <div className="space-y-5 p-4 sm:p-5">
            {visibleAreas.map((item) => item.id).map((area) => {
              const areaPresentation = getAreaPresentation(area);
              const areaStations = filteredStations.filter((station) => station.area === area);
              if (!areaStations.length) return null;
              return (
                <section key={area}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-primary/10 text-caption font-black text-brand-primary">
                        {areaPresentation.short}
                      </span>
                      <div>
                        <h2 className="text-body font-bold text-brand-text">{areaPresentation.label}</h2>
                        <p className="mt-0.5 text-caption text-brand-text-muted">
                          {areaStations.length} vị trí · {areaStations.filter((station) => station.status === 'READY').length} sẵn sàng
                        </p>
                      </div>
                    </div>
                    <span className="text-caption font-bold tabular-nums text-brand-text-muted">
                      Công suất {formatPercent(Math.round(areaStations.reduce((sum, station) => sum + station.utilization, 0) / areaStations.length))}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {areaStations.map((station) => (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setSelectedStation(station)}
                        aria-label={`${station.id} ${station.name} — ${statusLabel(station.status)}`}
                        className={`group h-auto min-h-48 p-4 text-left shadow-card ui-tone ui-tone--${statusTone(station.status)}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="text-caption font-black uppercase tracking-wide text-brand-text-muted">{station.id}</span>
                            <span className="mt-1 block text-body font-bold text-brand-text">{station.name}</span>
                            <span className="mt-1 flex items-center gap-1 text-caption text-brand-text-muted">
                              <MapPin className="h-3 w-3" />{station.location}
                            </span>
                          </span>
                          <StatusBadge status={station.status} label={statusShortLabel[station.status]} size="small" />
                        </span>
                        {station.current ? (
                          <span className="mt-4 block rounded-control bg-brand-surface p-3">
                            <span className="flex items-center justify-between text-caption">
                              <span className="font-black tabular-nums text-brand-primary">{station.current.start}–{station.current.end}</span>
                              <span className="font-bold text-brand-text-muted">Đang phục vụ</span>
                            </span>
                            <span className="mt-1.5 block truncate text-body font-bold text-brand-text">{station.current.customer}</span>
                            <span className="mt-1 block truncate text-caption text-brand-text-muted">{station.current.service} · {station.current.technician}</span>
                          </span>
                        ) : (
                          <span className="mt-4 flex min-h-16 items-center justify-center rounded-control border border-dashed border-brand-outline bg-brand-surface/60 text-caption font-bold text-brand-text-muted">
                            {station.status === 'READY' ? 'Sẵn sàng nhận khách' : station.issue || statusLabel(station.status)}
                          </span>
                        )}
                        <span className="mt-3 flex items-center justify-between">
                          <span className="text-caption text-brand-text-muted">{station.next ? `Tiếp theo ${station.next.start}` : 'Không còn lịch'}</span>
                          <span className="flex items-center gap-1 text-caption font-bold tabular-nums text-brand-text">
                            {station.bookingsToday} lượt<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
            {!filteredStations.length && (
              <div className="py-16 text-center">
                <Armchair className="mx-auto h-8 w-8 text-brand-text-muted" />
                <p className="mt-3 text-body font-bold text-brand-text">Không tìm thấy vị trí phù hợp</p>
                <p className="mt-1 text-caption text-brand-text-muted">Thử bỏ bớt bộ lọc khu vực hoặc trạng thái.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <DataTable<TenantStation>
              rows={filteredStations}
              rowKey={(station) => station.id}
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
                  )
                },
                { key: 'area', header: 'Khu vực', hideBelow: 'md', cell: (station) => getAreaPresentation(station.area).label },
                {
                  key: 'current',
                  header: 'Lịch hiện tại',
                  cell: (station) => station.current ? (
                    <>
                      <p className="font-bold text-brand-text">{station.current.customer}</p>
                      <p className="mt-1 text-caption tabular-nums text-brand-text-muted">{station.current.start}–{station.current.end} · {station.current.technician}</p>
                    </>
                  ) : null
                },
                { key: 'next', header: 'Lịch tiếp theo', hideBelow: 'lg', cell: (station) => station.next ? `${station.next.start} · ${station.next.customer}` : null },
                {
                  key: 'utilization',
                  header: 'Công suất',
                  numeric: true,
                  cell: (station) => (
                    <>
                      <p className="font-bold text-brand-text">{formatPercent(station.utilization)}</p>
                      <div className="mt-1.5 ml-auto h-1.5 w-20 overflow-hidden rounded-pill bg-brand-surface-highest">
                        <div className="h-full rounded-pill bg-brand-primary" style={{ width: formatPercent(station.utilization) }} />
                      </div>
                    </>
                  )
                },
                {
                  key: 'sanitized',
                  header: 'Vệ sinh',
                  hideBelow: 'lg',
                  cell: (station) => (
                    <>
                      {station.sanitizedAt || 'Chưa ghi nhận'}
                      <p className="mt-1 text-caption text-brand-text-muted">Checklist {station.checklist}</p>
                    </>
                  )
                },
                { key: 'status', header: 'Trạng thái', actions: true, cell: (station) => <StatusBadge status={station.status} size="small" /> }
              ]}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-brand-outline bg-brand-surface-high px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-brand-text-muted">
            Hiển thị <strong className="tabular-nums text-brand-text">{filteredStations.length}</strong> trên {scopedStations.length} vị trí thuộc phạm vi đang chọn
          </p>
          <p className="flex items-center gap-1.5 text-caption text-brand-text-muted">
            <ShieldCheck className="h-3.5 w-3.5" />Dữ liệu vận hành được lưu theo tenant
          </p>
        </div>
      </section>

      {/* Hộp thoại 1 — Chi tiết vị trí */}
      <Modal
        open={Boolean(selectedStation)}
        onClose={() => setSelectedStation(null)}
        size="large"
        eyebrow={selectedStation?.id}
        title={selectedStation?.name ?? ''}
        description={selectedStation ? `${selectedStation.location} · Chi nhánh ${branchName(selectedStation.branch)}` : undefined}
        headerAside={selectedStation ? <StatusBadge status={selectedStation.status} size="small" /> : undefined}
        icon={selectedStation?.status === 'MAINTENANCE' ? <Wrench /> : <Armchair />}
        footer={selectedStation ? (
          <>
            <p className="mr-auto text-caption text-brand-text-muted">Thao tác được ghi nhận dưới quyền {roleLabel}</p>
            <BeautifulSelect
              value={stationAction}
              onChange={(event) => setStationAction(event.target.value as StationStatus | '')}
              disabled={!canManage}
              aria-label="Chọn thao tác cho vị trí"
              className="w-full sm:w-52"
            >
              <option value="">Chọn thao tác</option>
              {stationActions[selectedStation.status].map((action) => {
                const blockReason = getActionBlockReason(selectedStation, action);
                return (
                  <option key={`${action.target}-${action.label}`} value={action.target} disabled={Boolean(blockReason)}>
                    {action.label}{blockReason ? ' · Chưa khả dụng' : ''}
                  </option>
                );
              })}
            </BeautifulSelect>
            <Button variant="primary" onClick={applyStationAction} disabled={!canManage || !stationAction} iconLeading={<Check />}>
              Áp dụng
            </Button>
          </>
        ) : undefined}
      >
        {selectedStation && (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className={`p-5 ui-tone ui-tone--${statusTone(selectedStation.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">Trạng thái trực tiếp</p>
                    <p className="mt-2 text-2xl font-black text-brand-text">{statusLabel(selectedStation.status)}</p>
                    <p className="mt-2 text-body text-brand-text-muted">
                      {selectedStation.current ? `Đang phục vụ ${selectedStation.current.customer}` : selectedStation.issue || 'Vị trí không có khách hiện tại'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-control bg-brand-surface p-3">
                    <p className="text-caption text-brand-text-muted">Công suất</p>
                    <p className="mt-1 text-body font-bold tabular-nums text-brand-text">{formatPercent(selectedStation.utilization)}</p>
                  </div>
                  <div className="rounded-control bg-brand-surface p-3">
                    <p className="text-caption text-brand-text-muted">Lượt hôm nay</p>
                    <p className="mt-1 text-body font-bold tabular-nums text-brand-text">{selectedStation.bookingsToday}</p>
                  </div>
                  <div className="rounded-control bg-brand-surface p-3">
                    <p className="text-caption text-brand-text-muted">Checklist</p>
                    <p className="mt-1 text-body font-bold tabular-nums text-brand-text">{selectedStation.checklist}</p>
                  </div>
                </div>
              </div>

              {selectedStation.current && (
                <div className="rounded-card border border-brand-outline p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-caption font-black uppercase text-brand-primary">Lịch đang phục vụ</p>
                      <p className="mt-2 text-body font-bold text-brand-text">{selectedStation.current.customer}</p>
                      <p className="mt-1 text-body text-brand-text-muted">{selectedStation.current.service}</p>
                    </div>
                    <span className="rounded-control bg-brand-primary/10 px-3 py-2 text-body font-bold tabular-nums text-brand-primary">
                      {selectedStation.current.start}–{selectedStation.current.end}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-control bg-brand-surface-high p-3 text-body font-bold text-brand-text">
                    <UserRound className="h-4 w-4 text-brand-primary" />{selectedStation.current.technician}
                    <span className="ml-auto text-caption font-normal text-brand-text-muted">{selectedStation.current.id}</span>
                  </div>
                </div>
              )}

              {selectedStation.next && (
                <div className="p-4 ui-tone ui-tone--info">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-brand-primary" />
                    <div>
                      <p className="text-caption font-black uppercase text-brand-primary">Lịch tiếp theo · {selectedStation.next.start}</p>
                      <p className="mt-1.5 text-body font-bold text-brand-text">{selectedStation.next.customer}</p>
                      <p className="mt-1 text-caption text-brand-text-muted">{selectedStation.next.service} · {selectedStation.next.technician}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-card border border-brand-outline p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption font-black uppercase text-brand-text-muted">Vệ sinh &amp; khử khuẩn</p>
                    <p className="mt-2 text-body font-bold text-brand-text">{selectedStation.sanitizedAt || 'Chưa ghi nhận'}</p>
                    <p className="mt-1 text-caption text-brand-text-muted">Checklist hiện tại {selectedStation.checklist}</p>
                  </div>
                  <SprayCan className="h-5 w-5 text-brand-secondary" />
                </div>
              </div>

              <div className="rounded-card border border-brand-outline p-4">
                <p className="text-caption font-black uppercase text-brand-text-muted">Thiết bị đi kèm</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedStation.equipment.map((item) => (
                    <span key={item} className="rounded-control bg-brand-surface-high px-2.5 py-1.5 text-caption font-bold text-brand-text">{item}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-card border border-brand-outline p-4">
                <div className="flex items-start gap-3">
                  <Wrench className="mt-0.5 h-4 w-4 text-brand-tertiary" />
                  <div>
                    <p className="text-body font-bold text-brand-text">Bảo trì thiết bị</p>
                    <p className="mt-1 text-caption text-brand-text-muted">Gần nhất: {selectedStation.lastMaintenance}</p>
                    <p className="mt-1 text-caption text-brand-text-muted">Kế tiếp: {selectedStation.nextMaintenance}</p>
                    {selectedStation.issue && (
                      <p className="mt-3 p-3 text-caption font-bold leading-5 text-brand-text ui-tone ui-tone--warning">{selectedStation.issue}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedStation.note && (
                <div className="p-4 ui-tone ui-tone--info">
                  <p className="text-caption font-black uppercase text-brand-primary">Ghi chú vận hành</p>
                  <p className="mt-2 text-body leading-6 text-brand-text">{selectedStation.note}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Hộp thoại 2 — Quản lý khu vực */}
      <Modal
        open={areaManagerOpen}
        onClose={() => setAreaManagerOpen(false)}
        size="medium"
        eyebrow="Thiết lập không gian"
        title="Quản lý khu vực"
        description="Thêm, đổi tên hoặc xóa khu vực riêng cho từng chi nhánh."
        icon={<Pencil />}
        footer={<Button variant="primary" onClick={() => setAreaManagerOpen(false)}>Hoàn tất</Button>}
      >
        <div className="space-y-4">
          <Field label="Chi nhánh quản lý">
            <BeautifulSelect
              value={areaManagerBranch}
              onChange={(event) => {
                setAreaManagerBranch(event.target.value as BranchCode);
                setEditingAreaId(null);
                setDeleteConfirmAreaId(null);
                setAreaManagerError('');
              }}
            >
              <option value="Q3">Chi nhánh Quận 3</option>
              <option value="Q1">Chi nhánh Quận 1</option>
            </BeautifulSelect>
          </Field>

          <div className="rounded-card border border-brand-outline bg-brand-surface-high p-4">
            <p className="text-body font-bold text-brand-text">Thêm khu vực mới</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="Tên khu vực mới" labelHidden className="min-w-0 flex-1">
                <input
                  value={areaManagerName}
                  onChange={(event) => setAreaManagerName(event.target.value)}
                  placeholder="Ví dụ: Khu nối mi"
                />
              </Field>
              <Button variant="primary" onClick={addManagedArea} iconLeading={<Plus />}>Thêm khu vực</Button>
            </div>
          </div>

          {areaManagerError && (
            <p role="alert" className="flex items-start gap-2 p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">
              <CircleAlert className="h-4 w-4 shrink-0" />{areaManagerError}
            </p>
          )}

          <div className="space-y-2">
            {areas.filter((area) => area.branch === areaManagerBranch).map((area) => {
              const usedCount = stations.filter((station) => station.branch === area.branch && station.area === area.id).length;
              const isEditing = editingAreaId === area.id;
              const isConfirmingDelete = deleteConfirmAreaId === area.id;
              return (
                <article key={`${area.branch}-${area.id}`} className="rounded-card border border-brand-outline bg-brand-surface p-3">
                  {isEditing ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Field label={`Đổi tên ${area.label}`} labelHidden className="min-w-0 flex-1">
                        <input
                          autoFocus
                          value={editingAreaName}
                          onChange={(event) => setEditingAreaName(event.target.value)}
                        />
                      </Field>
                      <Button variant="primary" onClick={() => saveAreaName(area)} iconLeading={<Check />}>Lưu</Button>
                      <Button variant="secondary" onClick={() => setEditingAreaId(null)}>Hủy</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-bold text-brand-text">{area.label}</p>
                          <p className="mt-1 text-caption tabular-nums text-brand-text-muted">{usedCount} vị trí đang sử dụng khu vực này</p>
                        </div>
                        <Button
                          size="small"
                          variant="secondary"
                          iconLeading={<Pencil />}
                          onClick={() => {
                            setEditingAreaId(area.id);
                            setEditingAreaName(area.label);
                            setDeleteConfirmAreaId(null);
                            setAreaManagerError('');
                          }}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="small"
                          variant="danger"
                          iconLeading={<X />}
                          onClick={() => {
                            setDeleteConfirmAreaId(area.id);
                            setEditingAreaId(null);
                            setAreaManagerError('');
                          }}
                        >
                          Xóa
                        </Button>
                      </div>
                      {isConfirmingDelete && (
                        <div className="mt-3 flex flex-col gap-2 p-3 sm:flex-row sm:items-center ui-tone ui-tone--danger">
                          <p className="flex-1 text-caption font-bold text-brand-text">
                            {usedCount ? `Khu vực còn ${usedCount} vị trí nên chưa thể xóa.` : 'Xác nhận xóa khu vực này?'}
                          </p>
                          {!usedCount && (
                            <Button size="small" variant="danger" onClick={() => deleteArea(area)}>Xác nhận xóa</Button>
                          )}
                          <Button size="small" variant="secondary" onClick={() => setDeleteConfirmAreaId(null)}>Hủy</Button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Hộp thoại 3 — Biểu mẫu lịch hẹn (mở chồng lên chi tiết vị trí) */}
      <Modal
        open={Boolean(appointmentAction && selectedStation)}
        onClose={() => setAppointmentAction(null)}
        size="medium"
        eyebrow={selectedStation ? `${selectedStation.id} · ${selectedStation.name}` : undefined}
        title={appointmentAction === 'RESERVED' ? 'Đặt lịch cho ghế' : 'Bắt đầu phục vụ'}
        description="Nhập thông tin khách và dịch vụ để cập nhật trạng thái ghế."
        icon={<CalendarClock />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAppointmentAction(null)}>Hủy</Button>
            <Button type="submit" form="station-appointment-form" variant="primary" iconLeading={<Check />}>
              {appointmentAction === 'RESERVED' ? 'Lưu lịch hẹn' : 'Bắt đầu phục vụ'}
            </Button>
          </>
        }
      >
        <form id="station-appointment-form" onSubmit={submitAppointmentAction} noValidate className="grid gap-4 sm:grid-cols-2">
          {appointmentError && (
            <p role="alert" className="flex items-start gap-2 p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger sm:col-span-2">
              <CircleAlert className="h-4 w-4 shrink-0" />{appointmentError}
            </p>
          )}
          <Field label="Tên khách hàng" required className="sm:col-span-2">
            <input
              autoFocus
              value={appointmentForm.customer}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, customer: event.target.value }))}
              placeholder="Nhập tên khách hàng"
            />
          </Field>
          <Field label="Dịch vụ" required className="sm:col-span-2">
            <input
              value={appointmentForm.service}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, service: event.target.value }))}
              placeholder="Ví dụ: Sơn gel Hàn Quốc"
            />
          </Field>
          <Field label="Kỹ thuật viên" required className="sm:col-span-2">
            <input
              value={appointmentForm.technician}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, technician: event.target.value }))}
              placeholder="Nhập tên kỹ thuật viên"
            />
          </Field>
          <Field label="Bắt đầu" required>
            <input
              type="time"
              value={appointmentForm.start}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, start: event.target.value }))}
            />
          </Field>
          <Field label="Kết thúc" required helper="Giờ kết thúc phải sau giờ bắt đầu.">
            <input
              type="time"
              value={appointmentForm.end}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, end: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>

      {/* Hộp thoại 4 — Thêm vị trí phục vụ */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="medium"
        eyebrow="Thiết lập không gian"
        title="Thêm vị trí phục vụ"
        description="Vị trí mới mặc định ở trạng thái sẵn sàng sau khi lưu."
        icon={<Plus />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="submit" form="station-create-form" variant="primary" iconLeading={<Check />}>Lưu vị trí</Button>
          </>
        }
      >
        <form id="station-create-form" onSubmit={submitCreate} noValidate className="grid gap-4 sm:grid-cols-2">
          {formError && (
            <p role="alert" className="flex items-start gap-2 p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger sm:col-span-2">
              <CircleAlert className="h-4 w-4 shrink-0" />{formError}
            </p>
          )}
          <Field label="Mã vị trí" required helper="Mã phải là duy nhất trong tenant.">
            <input
              value={form.id}
              onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
              placeholder="Ví dụ: M-07"
            />
          </Field>
          <Field label="Tên vị trí" required>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Bàn Manicure 07"
            />
          </Field>
          <div>
            <Field label="Khu vực" required>
              <BeautifulSelect
                value={form.area}
                onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
              >
                {formAreas.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
              </BeautifulSelect>
            </Field>
            <Button
              variant="link"
              size="small"
              className="mt-2"
              onClick={() => { setAddingArea((current) => !current); setNewAreaName(''); setFormError(''); }}
            >
              {addingArea ? 'Đóng thêm khu vực' : '+ Thêm khu vực mới'}
            </Button>
            {addingArea && (
              <div className="mt-2 flex gap-2 sm:items-end">
                <Field label="Tên khu vực mới" labelHidden className="min-w-0 flex-1">
                  <input
                    value={newAreaName}
                    onChange={(event) => setNewAreaName(event.target.value)}
                    placeholder="Tên khu vực mới"
                  />
                </Field>
                <Button variant="primary" size="small" onClick={addArea}>Thêm</Button>
              </div>
            )}
          </div>
          <Field label="Chi nhánh" required>
            <BeautifulSelect
              value={form.branch}
              onChange={(event) => {
                const branch = event.target.value as BranchCode;
                setForm((current) => ({ ...current, branch, area: areas.find((area) => area.branch === branch)?.id || 'MANICURE' }));
                setAddingArea(false);
                setNewAreaName('');
              }}
            >
              <option value="Q3">Chi nhánh Quận 3</option>
              <option value="Q1">Chi nhánh Quận 1</option>
            </BeautifulSelect>
          </Field>
          <Field label="Vị trí trong mặt bằng" required className="sm:col-span-2">
            <input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Ví dụ: Khu A · Gần cửa sổ"
            />
          </Field>
          <Field label="Thiết bị đi kèm" required helper="Ngăn cách bằng dấu phẩy." className="sm:col-span-2">
            <textarea
              value={form.equipment}
              onChange={(event) => setForm((current) => ({ ...current, equipment: event.target.value }))}
              placeholder="Đèn UV, máy mài, máy hút bụi..."
              className="min-h-24 resize-y py-3"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
