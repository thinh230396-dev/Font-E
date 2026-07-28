import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  Activity, AlertTriangle, Armchair, CalendarClock, Check, ChevronRight, CircleAlert,
  Clock3, Grid3X3, LayoutList, MapPin, Pencil, Plus, Search, ShieldCheck, Sparkles,
  SprayCan, UserRound, Wrench, X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type StationArea = 'MANICURE' | 'PEDICURE' | 'VIP';
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
  requiresNextAppointment?: boolean;
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

const areaMeta: Record<StationArea, { label: string; short: string; className: string }> = {
  MANICURE: { label: 'Khu Manicure', short: 'M', className: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
  PEDICURE: { label: 'Khu Pedicure', short: 'P', className: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  VIP: { label: 'Khu VIP', short: 'V', className: 'bg-violet-50 text-violet-700 ring-violet-200' }
};

const statusMeta: Record<StationStatus, { label: string; short: string; card: string; badge: string; dot: string }> = {
  READY: { label: 'Sẵn sàng', short: 'Trống', card: 'border-emerald-200 bg-emerald-50/45', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  OCCUPIED: { label: 'Đang sử dụng', short: 'Đang làm', card: 'border-violet-200 bg-violet-50/55', badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  RESERVED: { label: 'Đã giữ chỗ', short: 'Đã giữ', card: 'border-blue-200 bg-blue-50/55', badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  CLEANING: { label: 'Đang vệ sinh', short: 'Vệ sinh', card: 'border-cyan-200 bg-cyan-50/55', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', dot: 'bg-cyan-500' },
  MAINTENANCE: { label: 'Đang bảo trì', short: 'Bảo trì', card: 'border-amber-200 bg-amber-50/60', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  OUT_OF_SERVICE: { label: 'Ngừng sử dụng', short: 'Đã khóa', card: 'border-rose-200 bg-rose-50/55', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' }
};

const stationActions: Record<StationStatus, StationAction[]> = {
  READY: [
    { label: 'Giữ chỗ cho lịch tiếp theo', target: 'RESERVED', requiresNextAppointment: true },
    { label: 'Bắt đầu phục vụ', target: 'OCCUPIED', requiresNextAppointment: true },
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
    { label: 'Bắt đầu phục vụ', target: 'OCCUPIED', requiresNextAppointment: true },
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
  const [stations, setStations] = useState<TenantStation[]>(() => {
    if (typeof window === 'undefined') return getTenantAdminInitialData(null, stationSeed);
    try { const stored = window.localStorage.getItem(storageKey); return getTenantAdminInitialData(stored ? JSON.parse(stored) as TenantStation[] : null, stationSeed); } catch { return getTenantAdminInitialData(null, stationSeed); }
  });
  const [areaFilter, setAreaFilter] = useState<'ALL' | StationArea>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StationStatus>('ALL');
  const [viewMode, setViewMode] = useState<'FLOOR' | 'LIST'>('FLOOR');
  const [selectedStation, setSelectedStation] = useState<TenantStation | null>(null);
  const [stationAction, setStationAction] = useState<StationStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ id: '', name: '', area: 'MANICURE' as StationArea, branch: 'Q3' as BranchCode, location: '', equipment: '' });
  const canManage = accessMode === 'full' && !readOnlyReason;

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(stations)); }, [stations, storageKey]);
  useEffect(() => { setStationAction(''); }, [selectedStation?.id, selectedStation?.status]);
  useEffect(() => {
    if (!selectedStation && !createOpen) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (createOpen) setCreateOpen(false); else setSelectedStation(null); } };
    window.addEventListener('keydown', close); return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [createOpen, selectedStation]);

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

  const getActionBlockReason = (station: TenantStation, action: StationAction) => {
    if (action.requiresNextAppointment && !station.current && !station.next) return 'Vị trí chưa có lịch hẹn để thực hiện thao tác này.';
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
    if (status === 'RESERVED') patch.current = undefined;
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
    updateStatus(selectedStation, stationAction);
  };

  const openCreate = () => {
    if (!requireManage()) return;
    const branch = selectedBranch === 'Q1' ? 'Q1' : 'Q3';
    setForm({ id: '', name: '', area: 'MANICURE', branch, location: '', equipment: '' }); setFormError(''); setCreateOpen(true);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!form.id.trim() || !form.name.trim() || !form.location.trim() || !form.equipment.trim()) { setFormError('Vui lòng nhập mã, tên, vị trí và thiết bị đi kèm.'); return; }
    if (stations.some((station) => station.id.toLowerCase() === form.id.trim().toLowerCase())) { setFormError('Mã vị trí đã tồn tại trong tenant.'); return; }
    const station: TenantStation = { id: form.id.trim().toUpperCase(), name: form.name.trim(), area: form.area, branch: form.branch, status: 'READY', location: form.location.trim(), equipment: form.equipment.split(',').map((item) => item.trim()).filter(Boolean), utilization: 0, bookingsToday: 0, sanitizedAt: 'Vừa xong', checklist: form.area === 'PEDICURE' ? '10/10' : form.area === 'VIP' ? '12/12' : '8/8', lastMaintenance: 'Chưa có', nextMaintenance: 'Sau 30 ngày', note: `Tạo bởi ${roleLabel}` };
    setStations((current) => [...current, station]); setSelectedStation(station); setCreateOpen(false); onNotify?.(`Đã thêm ${station.name}.`);
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Trạng thái không gian · Cập nhật 14:32<span className="text-slate-300">•</span><span className="text-slate-500">{tenantName}</span></div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Ghế & khu vực</h1><p className="mt-2 text-[11px] text-slate-500">Điều phối vị trí phục vụ, vệ sinh, khử khuẩn, lịch sử dụng và bảo trì thiết bị.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} disabled={branchLocked} aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold shadow-sm sm:w-48"><option value="ALL">Tất cả chi nhánh</option><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect><button type="button" onClick={openCreate} disabled={!canManage || branchLocked} title={branchLocked ? 'Receptionist không có quyền thay đổi cấu hình ghế/phòng' : undefined} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Plus className="h-4 w-4" />Thêm vị trí</button></div>
      </section>

      <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? 'border-violet-100 bg-gradient-to-r from-violet-50 to-white' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4.5 w-4.5" /></span><div><p className="text-[10px] font-black text-slate-800">Phạm vi quyền: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{canManage ? 'Được thêm vị trí, đổi trạng thái vận hành, xác nhận vệ sinh và đóng/mở bảo trì trong tenant.' : readOnlyReason || 'Chỉ được xem sơ đồ và tình trạng thiết bị.'}</p></div></div><span className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{canManage ? 'Toàn quyền vận hành' : 'Chỉ xem'}</span></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'Tổng vị trí', value: scopedStations.length, detail: `${scopedStations.filter((item) => item.area === 'MANICURE').length} Manicure · ${scopedStations.filter((item) => item.area === 'PEDICURE').length} Pedicure · ${scopedStations.filter((item) => item.area === 'VIP').length} VIP`, icon: Armchair, tone: 'bg-blue-50 text-blue-600' },
        { label: 'Đang sử dụng', value: occupiedCount, detail: `${Math.round(occupiedCount / Math.max(1, scopedStations.length) * 100)}% công suất tức thời`, icon: Activity, tone: 'bg-violet-50 text-violet-600' },
        { label: 'Sẵn sàng', value: readyCount, detail: 'Đã hoàn tất vệ sinh & checklist', icon: Sparkles, tone: 'bg-emerald-50 text-emerald-600' },
        { label: 'Cần xử lý', value: attentionCount, detail: `${averageUtilization}% công suất trung bình ngày`, icon: Wrench, tone: 'bg-amber-50 text-amber-600' }
      ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-xl font-black text-slate-950">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p></article>)}</section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="relative w-full xl:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm mã ghế, khu vực, khách..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap items-center gap-2"><BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | StationStatus)} className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect><div className="flex items-center rounded-xl border border-slate-200 p-1"><button type="button" onClick={() => setViewMode('FLOOR')} aria-label="Xem sơ đồ" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'FLOOR' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><Grid3X3 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setViewMode('LIST')} aria-label="Xem danh sách" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'LIST' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutList className="h-3.5 w-3.5" /></button></div></div></div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">{(['ALL', 'MANICURE', 'PEDICURE', 'VIP'] as const).map((area) => { const count = area === 'ALL' ? scopedStations.length : scopedStations.filter((station) => station.area === area).length; return <button key={area} type="button" onClick={() => setAreaFilter(area)} className={`flex h-8 items-center gap-2 border px-3 text-[8px] font-black shadow-sm ${areaFilter === area ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>{area === 'ALL' ? 'Tất cả khu vực' : areaMeta[area].label}<span className="rounded-full bg-white px-1.5 py-0.5 text-[7px]">{count}</span></button>; })}<span className="ml-auto hidden items-center gap-3 text-[7px] font-bold text-slate-400 lg:flex">{(['READY', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'] as StationStatus[]).map((status) => <span key={status} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${statusMeta[status].dot}`} />{statusMeta[status].short}</span>)}</span></div>

        {viewMode === 'FLOOR' ? <div className="space-y-5 p-4 sm:p-5">{(['MANICURE', 'PEDICURE', 'VIP'] as StationArea[]).map((area) => { const areaStations = filteredStations.filter((station) => station.area === area); if (!areaStations.length) return null; return <section key={area}><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[9px] font-black ring-1 ${areaMeta[area].className}`}>{areaMeta[area].short}</span><div><h2 className="text-[11px] font-black text-slate-800">{areaMeta[area].label}</h2><p className="mt-0.5 text-[8px] text-slate-400">{areaStations.length} vị trí · {areaStations.filter((station) => station.status === 'READY').length} sẵn sàng</p></div></div><span className="text-[8px] font-black text-slate-400">Công suất {formatPercent(Math.round(areaStations.reduce((sum, station) => sum + station.utilization, 0) / areaStations.length))}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{areaStations.map((station) => { const meta = statusMeta[station.status]; return <button key={station.id} type="button" onClick={() => setSelectedStation(station)} className={`group h-auto min-h-48 border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${meta.card}`}><span className="flex items-start justify-between gap-3"><span><span className="text-[8px] font-black uppercase tracking-wide text-slate-400">{station.id}</span><span className="mt-1 block text-[11px] font-black text-slate-900">{station.name}</span><span className="mt-1 flex items-center gap-1 text-[8px] text-slate-400"><MapPin className="h-3 w-3" />{station.location}</span></span><span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[7px] font-bold ring-1 ${meta.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.short}</span></span>{station.current ? <span className="mt-4 block rounded-xl bg-white/80 p-3 ring-1 ring-black/5"><span className="flex items-center justify-between text-[8px]"><span className="font-black text-violet-600">{station.current.start}–{station.current.end}</span><span className="font-bold text-slate-400">Đang phục vụ</span></span><span className="mt-1.5 block truncate text-[10px] font-black text-slate-800">{station.current.customer}</span><span className="mt-1 block truncate text-[8px] text-slate-500">{station.current.service} · {station.current.technician}</span></span> : <span className="mt-4 flex min-h-16 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-[8px] font-bold text-slate-400">{station.status === 'READY' ? 'Sẵn sàng nhận khách' : station.issue || meta.label}</span>}<span className="mt-3 flex items-center justify-between"><span className="text-[8px] text-slate-400">{station.next ? `Tiếp theo ${station.next.start}` : 'Không còn lịch'}</span><span className="flex items-center gap-1 text-[8px] font-black text-slate-600">{station.bookingsToday} lượt<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></span></button>; })}</div></section>; })}{!filteredStations.length && <div className="py-16 text-center"><Armchair className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không tìm thấy vị trí phù hợp</p></div>}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50 text-[8px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Vị trí</th><th className="px-4 py-3">Khu vực</th><th className="px-4 py-3">Lịch hiện tại</th><th className="px-4 py-3">Lịch tiếp theo</th><th className="px-4 py-3">Công suất</th><th className="px-4 py-3">Vệ sinh</th><th className="px-5 py-3 text-right">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredStations.map((station) => <tr key={station.id} onClick={() => setSelectedStation(station)} className="cursor-pointer text-[9px] text-slate-600 hover:bg-slate-50"><td className="px-5 py-4"><p className="font-black text-slate-900">{station.id} · {station.name}</p><p className="mt-1 text-[8px] text-slate-400">{station.location}</p></td><td className="px-4 py-4">{areaMeta[station.area].label}</td><td className="px-4 py-4">{station.current ? <><p className="font-black text-slate-800">{station.current.customer}</p><p className="mt-1 text-[8px] text-slate-400">{station.current.start}–{station.current.end} · {station.current.technician}</p></> : '—'}</td><td className="px-4 py-4">{station.next ? `${station.next.start} · ${station.next.customer}` : '—'}</td><td className="px-4 py-4"><p className="font-black text-slate-800">{formatPercent(station.utilization)}</p><div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: formatPercent(station.utilization) }} /></div></td><td className="px-4 py-4">{station.sanitizedAt || 'Chưa ghi nhận'}<p className="mt-1 text-[8px] text-slate-400">Checklist {station.checklist}</p></td><td className="px-5 py-4 text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[station.status].badge}`}>{statusMeta[station.status].label}</span></td></tr>)}</tbody></table></div>}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[8px] text-slate-400">Hiển thị <strong className="text-slate-600">{filteredStations.length}</strong> trên {scopedStations.length} vị trí thuộc phạm vi đang chọn</p><p className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />Dữ liệu vận hành được lưu theo tenant</p></div>
      </section>

      {selectedStation && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><button type="button" aria-label="Đóng chi tiết vị trí" onClick={() => setSelectedStation(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><section role="dialog" aria-modal="true" aria-labelledby="station-detail-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wide text-violet-600">{selectedStation.id}</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selectedStation.status].badge}`}>{statusMeta[selectedStation.status].label}</span></div><h2 id="station-detail-title" className="mt-2 text-xl font-black text-slate-950">{selectedStation.name}</h2><p className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400"><MapPin className="h-3.5 w-3.5" />{selectedStation.location} · Chi nhánh {selectedStation.branch === 'Q3' ? 'Quận 3' : 'Quận 1'}</p></div><button type="button" onClick={() => setSelectedStation(null)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"><div className="space-y-4"><div className={`rounded-2xl border p-5 ${statusMeta[selectedStation.status].card}`}><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Trạng thái trực tiếp</p><p className="mt-2 text-2xl font-black text-slate-950">{statusMeta[selectedStation.status].label}</p><p className="mt-2 text-[9px] text-slate-500">{selectedStation.current ? `Đang phục vụ ${selectedStation.current.customer}` : selectedStation.issue || 'Vị trí không có khách hiện tại'}</p></div><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selectedStation.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 'bg-white text-violet-600'}`}>{selectedStation.status === 'MAINTENANCE' ? <Wrench className="h-5 w-5" /> : <Armchair className="h-5 w-5" />}</span></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/75 p-3"><p className="text-[7px] text-slate-400">Công suất</p><p className="mt-1 text-[12px] font-black text-slate-800">{formatPercent(selectedStation.utilization)}</p></div><div className="rounded-xl bg-white/75 p-3"><p className="text-[7px] text-slate-400">Lượt hôm nay</p><p className="mt-1 text-[12px] font-black text-slate-800">{selectedStation.bookingsToday}</p></div><div className="rounded-xl bg-white/75 p-3"><p className="text-[7px] text-slate-400">Checklist</p><p className="mt-1 text-[12px] font-black text-slate-800">{selectedStation.checklist}</p></div></div></div>{selectedStation.current && <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase text-violet-500">Lịch đang phục vụ</p><p className="mt-2 text-sm font-black text-slate-900">{selectedStation.current.customer}</p><p className="mt-1 text-[9px] text-slate-500">{selectedStation.current.service}</p></div><span className="rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700">{selectedStation.current.start}–{selectedStation.current.end}</span></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-[9px] font-bold text-slate-600"><UserRound className="h-4 w-4 text-violet-500" />{selectedStation.current.technician}<span className="ml-auto text-[8px] text-slate-400">{selectedStation.current.id}</span></div></div>}{selectedStation.next && <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-4 w-4 text-blue-600" /><div><p className="text-[8px] font-black uppercase text-blue-500">Lịch tiếp theo · {selectedStation.next.start}</p><p className="mt-1.5 text-[10px] font-black text-slate-800">{selectedStation.next.customer}</p><p className="mt-1 text-[8px] text-slate-500">{selectedStation.next.service} · {selectedStation.next.technician}</p></div></div></div>}</div><div className="space-y-4"><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase text-slate-400">Vệ sinh & khử khuẩn</p><p className="mt-2 text-[12px] font-black text-slate-800">{selectedStation.sanitizedAt || 'Chưa ghi nhận'}</p><p className="mt-1 text-[8px] text-slate-400">Checklist hiện tại {selectedStation.checklist}</p></div><SprayCan className="h-5 w-5 text-cyan-500" /></div></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase text-slate-400">Thiết bị đi kèm</p><div className="mt-3 flex flex-wrap gap-2">{selectedStation.equipment.map((item) => <span key={item} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[8px] font-bold text-slate-600">{item}</span>)}</div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><Wrench className="mt-0.5 h-4 w-4 text-amber-500" /><div><p className="text-[9px] font-black text-slate-700">Bảo trì thiết bị</p><p className="mt-1 text-[8px] text-slate-400">Gần nhất: {selectedStation.lastMaintenance}</p><p className="mt-1 text-[8px] text-slate-400">Kế tiếp: {selectedStation.nextMaintenance}</p>{selectedStation.issue && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[8px] font-bold leading-4 text-amber-800">{selectedStation.issue}</p>}</div></div></div>{selectedStation.note && <div className="rounded-2xl bg-violet-50 p-4"><p className="text-[8px] font-black uppercase text-violet-500">Ghi chú vận hành</p><p className="mt-2 text-[9px] leading-5 text-violet-700">{selectedStation.note}</p></div>}</div></div></div><footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-[8px] font-semibold text-slate-400">Thao tác được ghi nhận dưới quyền {roleLabel}</p><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><BeautifulSelect value={stationAction} onChange={(event) => setStationAction(event.target.value as StationStatus | '')} disabled={!canManage} aria-label="Chọn thao tác cho vị trí" className="h-10 w-full rounded-xl border border-pink-200 bg-white px-3 text-[9px] font-bold text-slate-700 shadow-sm sm:w-52"><option value="">Chọn thao tác</option>{stationActions[selectedStation.status].map((action) => { const blockReason = getActionBlockReason(selectedStation, action); return <option key={`${action.target}-${action.label}`} value={action.target} disabled={Boolean(blockReason)}>{action.label}{blockReason ? ' · Chưa khả dụng' : ''}</option>; })}</BeautifulSelect><button type="button" onClick={applyStationAction} disabled={!canManage || !stationAction} className="flex h-10 items-center justify-center gap-2 border border-pink-600 bg-pink-600 px-4 text-[9px] font-black text-white shadow-sm shadow-pink-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Check className="h-3.5 w-3.5" />Áp dụng</button></div></footer></section></div>}

      {createOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCreate} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Thiết lập không gian</p><h2 className="mt-1 text-lg font-black text-slate-900">Thêm vị trí phục vụ</h2><p className="mt-1 text-[9px] text-slate-500">Vị trí mới mặc định ở trạng thái sẵn sàng sau khi lưu.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{formError && <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700 sm:col-span-2"><CircleAlert className="h-4 w-4 shrink-0" />{formError}</div>}<label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã vị trí *</span><input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="Ví dụ: M-07" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tên vị trí *</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Bàn Manicure 07" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Khu vực *</span><BeautifulSelect value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value as StationArea }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"><option value="MANICURE">Khu Manicure</option><option value="PEDICURE">Khu Pedicure</option><option value="VIP">Khu VIP</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh *</span><BeautifulSelect value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value as BranchCode }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Vị trí trong mặt bằng *</span><input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Ví dụ: Khu A · Gần cửa sổ" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Thiết bị đi kèm *</span><textarea value={form.equipment} onChange={(event) => setForm((current) => ({ ...current, equipment: event.target.value }))} placeholder="Đèn UV, máy mài, máy hút bụi..." className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Check className="h-4 w-4" />Lưu vị trí</button></footer></form></div>}
    </div>
  );
}
