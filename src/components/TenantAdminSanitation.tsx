import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeader } from './ui';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  FlaskConical,
  Gauge,
  History,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Thermometer,
  Trash2,
  UserRoundCheck,
  UsersRound,
  Wrench,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type BranchCode = 'Q1' | 'Q3';
type SafetyTab = 'OVERVIEW' | 'CHECKLISTS' | 'INCIDENTS' | 'COMPLIANCE';
type ChecklistStatus = 'DONE' | 'IN_PROGRESS' | 'OVERDUE';
type BatchStatus = 'PASSED' | 'RUNNING' | 'FAILED' | 'QUARANTINE';
type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

interface ChecklistItem { id: string; title: string; area: string; branch: BranchCode; shift: string; due: string; completed: number; total: number; status: ChecklistStatus; assignee: string; tasks: Array<{ label: string; done: boolean; evidence: string; previousEvidence?: string }>; note: string; archived?: boolean; }
interface SterilizationBatch { id: string; branch: BranchCode; machine: string; cycle: string; start: string; end: string; temperature: number; pressure: string; items: number; indicator: string; status: BatchStatus; operator: string; releasedBy: string; note: string; archived?: boolean; }
interface SafetyIncident { id: string; title: string; category: string; branch: BranchCode; area: string; occurredAt: string; severity: IncidentSeverity; status: IncidentStatus; reporter: string; owner: string; description: string; immediateAction: string; rootCause: string; correctiveAction: string; dueDate: string; archived?: boolean; }
interface Certificate { id: string; name: string; type: string; branch: BranchCode | 'ALL'; issued: string; expires: string; status: 'VALID' | 'EXPIRING' | 'EXPIRED'; owner: string; document: string; archived?: boolean; }
type ManagedRecordKind = 'CHECKLIST' | 'BATCH' | 'INCIDENT' | 'CERTIFICATE';
interface ManagedRecordTarget { kind: ManagedRecordKind; id: string; label: string; archived: boolean; }

interface TenantAdminSanitationProps { searchQuery: string; onSearchQueryChange: (value: string) => void; selectedBranch: string; onSelectedBranchChange: (value: string) => void; tenantName?: string; roleLabel?: string; accessMode?: 'full' | 'limited' | 'locked'; readOnlyReason?: string; onNotify?: (message: string) => void; }

const checklistSeed: ChecklistItem[] = [
  { id: 'CHK-Q3-OPEN-2007', title: 'Checklist mở ca · Quận 3', area: 'Toàn chi nhánh', branch: 'Q3', shift: 'Mở ca', due: '08:30 hôm nay', completed: 3, total: 5, status: 'IN_PROGRESS', assignee: 'Minh Châu', tasks: [{ label: 'Khử khuẩn mặt bàn và tay nắm cửa', done: true, evidence: '2 ảnh · 08:02' }, { label: 'Kiểm tra dung dịch sát khuẩn tay', done: true, evidence: 'Đã ghi nhận · 08:06' }, { label: 'Đo nhiệt độ tủ UV và autoclave', done: true, evidence: '35°C · 08:10' }, { label: 'Kiểm tra hạn dùng dụng cụ đóng túi', done: false, evidence: 'Chưa cập nhật' }, { label: 'Xác nhận bồn pedicure đã xả và khử khuẩn', done: false, evidence: 'Chưa cập nhật' }], note: 'Cần hoàn tất trước khi tiếp nhận khách đầu tiên lúc 09:00.' },
  { id: 'CHK-Q1-MID-2007', title: 'Vệ sinh giữa ca · Quận 1', area: 'Khu manicure & lễ tân', branch: 'Q1', shift: 'Giữa ca', due: '14:00 hôm nay', completed: 3, total: 3, status: 'DONE', assignee: 'Thu Hà', tasks: [{ label: 'Khử khuẩn 6 bàn manicure', done: true, evidence: '6 ảnh · 13:38' }, { label: 'Thay khăn sạch và túi rác', done: true, evidence: 'Đã xác nhận · 13:42' }, { label: 'Bổ sung PPE tại các trạm', done: true, evidence: 'Đã xác nhận · 13:48' }], note: 'Hoàn tất đúng quy trình, không có bất thường.' },
  { id: 'CHK-Q3-PEDI-2007', title: 'Khử khuẩn bồn pedicure', area: 'Khu pedicure P-01 → P-06', branch: 'Q3', shift: 'Sau mỗi khách', due: 'Liên tục', completed: 2, total: 3, status: 'IN_PROGRESS', assignee: 'Bảo Ngọc', tasks: [{ label: 'Xả và chà bồn bằng dung dịch chuyên dụng', done: true, evidence: 'Nhật ký tự động' }, { label: 'Chạy chu trình khử khuẩn 10 phút', done: true, evidence: '10:42–10:52' }, { label: 'Gắn trạng thái sẵn sàng cho ghế', done: false, evidence: 'P-04 đang bảo trì' }], note: 'Ghế P-04 đang tạm khóa, không tính vào công suất khả dụng.' },
  { id: 'CHK-Q1-CLOSE-1907', title: 'Checklist đóng ca · Quận 1', area: 'Toàn chi nhánh', branch: 'Q1', shift: 'Đóng ca', due: '20:30 hôm qua', completed: 2, total: 3, status: 'OVERDUE', assignee: 'Kim Anh', tasks: [{ label: 'Thu gom vật sắc nhọn đúng hộp', done: true, evidence: 'Đã xác nhận · 20:12' }, { label: 'Niêm phong dụng cụ chờ tiệt khuẩn', done: true, evidence: '24 túi · 20:18' }, { label: 'Ký xác nhận cuối ca', done: false, evidence: 'Thiếu chữ ký quản lý' }], note: 'Thiếu chữ ký quản lý ca; cần bổ sung để khóa checklist.' }
];

const batchSeed: SterilizationBatch[] = [
  { id: 'ST-Q3-0720-08', branch: 'Q3', machine: 'Autoclave MELAG 31B+', cycle: 'B · 134°C · 5 phút', start: '15:20', end: '15:48', temperature: 134, pressure: '2,1 bar', items: 24, indicator: 'Đạt · Class 5', status: 'PASSED', operator: 'Hà My', releasedBy: 'Minh Châu', note: 'Túi khô hoàn toàn, chỉ thị hóa học chuyển màu đồng nhất.' },
  { id: 'ST-Q1-0720-06', branch: 'Q1', machine: 'Autoclave Euronda E9', cycle: 'B · 134°C · 5 phút', start: '14:40', end: '15:08', temperature: 134, pressure: '2,0 bar', items: 18, indicator: 'Đạt · Class 5', status: 'PASSED', operator: 'Thu Hà', releasedBy: 'Kim Anh', note: 'Đã dán mã lô lên 18 túi dụng cụ.' },
  { id: 'ST-Q3-0720-09', branch: 'Q3', machine: 'Autoclave MELAG 31B+', cycle: 'B · 134°C · 5 phút', start: '16:35', end: 'Dự kiến 17:03', temperature: 128, pressure: '1,8 bar', items: 20, indicator: 'Đang xử lý', status: 'RUNNING', operator: 'Bảo Ngọc', releasedBy: 'Chưa duyệt', note: 'Không mở máy khi chu trình chưa hoàn tất.' },
  { id: 'ST-Q1-0719-05', branch: 'Q1', machine: 'Autoclave Euronda E9', cycle: 'B · 134°C · 5 phút', start: '18:10', end: '18:39', temperature: 132, pressure: '1,7 bar', items: 16, indicator: 'Không đạt · Class 5', status: 'QUARANTINE', operator: 'Kim Anh', releasedBy: 'Không phát hành', note: 'Lô đã cách ly do không đạt nhiệt độ. Dụng cụ được chạy lại trong lô ST-Q1-0719-06.' }
];

const incidentSeed: SafetyIncident[] = [
  { id: 'INC-260720-004', title: 'Ghế pedicure P-04 rò đường nước', category: 'Thiết bị & cơ sở vật chất', branch: 'Q3', area: 'Khu pedicure', occurredAt: '20/07/2026 · 11:18', severity: 'MEDIUM', status: 'INVESTIGATING', reporter: 'Bảo Ngọc', owner: 'Minh Châu', description: 'Phát hiện nước rỉ nhẹ dưới chân ghế trong bước xả bồn sau khách.', immediateAction: 'Ngưng sử dụng ghế, khóa nguồn nước, đặt biển cảnh báo và khử khuẩn khu vực.', rootCause: 'Đang kiểm tra ron và khớp nối đầu cấp.', correctiveAction: 'Kỹ thuật viên bảo trì đến lúc 17:30; chỉ mở lại sau kiểm tra kín nước.', dueDate: '20/07/2026 · 19:00' },
  { id: 'INC-260719-003', title: 'Lô tiệt khuẩn không đạt chỉ thị', category: 'Tiệt khuẩn dụng cụ', branch: 'Q1', area: 'Phòng tiệt khuẩn', occurredAt: '19/07/2026 · 18:42', severity: 'HIGH', status: 'RESOLVED', reporter: 'Kim Anh', owner: 'Thu Hà', description: 'Chỉ thị hóa học Class 5 không đạt màu chuẩn sau chu trình.', immediateAction: 'Cách ly toàn bộ 16 túi, dán nhãn không sử dụng và chạy lại bằng chu trình mới.', rootCause: 'Gioăng cửa máy chưa được vệ sinh đúng định kỳ.', correctiveAction: 'Vệ sinh gioăng, chạy Bowie-Dick và xác nhận lô chạy lại đạt chuẩn.', dueDate: 'Đã hoàn tất · 19/07/2026' },
  { id: 'INC-260717-002', title: 'Thiếu găng nitrile size S tại trạm M-02', category: 'PPE & vật tư an toàn', branch: 'Q3', area: 'Manicure M-02', occurredAt: '17/07/2026 · 09:12', severity: 'LOW', status: 'RESOLVED', reporter: 'Hà My', owner: 'Minh Châu', description: 'Tồn tại trạm thấp hơn định mức đầu ca.', immediateAction: 'Bổ sung từ kho trung tâm và kiểm tra toàn bộ trạm.', rootCause: 'Thiếu xác nhận sau ca tối hôm trước.', correctiveAction: 'Bổ sung kiểm tra PPE vào checklist đóng ca.', dueDate: 'Đã hoàn tất · 17/07/2026' }
];

const certificateSeed: Certificate[] = [
  { id: 'CERT-HSE-001', name: 'Giấy chứng nhận cơ sở đủ điều kiện vệ sinh', type: 'Cơ sở', branch: 'Q3', issued: '12/01/2026', expires: '12/01/2027', status: 'VALID', owner: 'Nguyễn Trường Thịnh', document: 'GCN-VSAT-Q3-2026.pdf' },
  { id: 'CERT-FIRE-002', name: 'Biên bản kiểm tra PCCC định kỳ', type: 'PCCC', branch: 'Q1', issued: '05/08/2025', expires: '05/08/2026', status: 'EXPIRING', owner: 'Thu Hà', document: 'PCCC-Q1-0825.pdf' },
  { id: 'CERT-BIO-003', name: 'Hợp đồng xử lý chất thải nguy hại', type: 'Chất thải', branch: 'ALL', issued: '01/03/2026', expires: '01/03/2027', status: 'VALID', owner: 'Minh Châu', document: 'HD-CTR-0326.pdf' },
  { id: 'CERT-TRAIN-004', name: 'Đào tạo kiểm soát nhiễm khuẩn', type: 'Đào tạo', branch: 'ALL', issued: '18/02/2026', expires: '18/02/2027', status: 'VALID', owner: 'Nguyễn Trường Thịnh', document: 'DS-TRAIN-0226.pdf' }
];

const checklistStatusMeta: Record<ChecklistStatus, { label: string; badge: string }> = { DONE: { label: 'Hoàn tất', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }, IN_PROGRESS: { label: 'Đang thực hiện', badge: 'bg-blue-50 text-blue-700 ring-blue-200' }, OVERDUE: { label: 'Quá hạn', badge: 'bg-rose-50 text-rose-700 ring-rose-200' } };
const batchStatusMeta: Record<BatchStatus, { label: string; badge: string }> = { PASSED: { label: 'Đạt & phát hành', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }, RUNNING: { label: 'Đang chạy', badge: 'bg-blue-50 text-blue-700 ring-blue-200' }, FAILED: { label: 'Không đạt', badge: 'bg-rose-50 text-rose-700 ring-rose-200' }, QUARANTINE: { label: 'Đã cách ly', badge: 'bg-amber-50 text-amber-700 ring-amber-200' } };
const incidentStatusMeta: Record<IncidentStatus, { label: string; badge: string }> = { OPEN: { label: 'Mới ghi nhận', badge: 'bg-rose-50 text-rose-700 ring-rose-200' }, INVESTIGATING: { label: 'Đang xử lý', badge: 'bg-amber-50 text-amber-700 ring-amber-200' }, RESOLVED: { label: 'Đã khắc phục', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' } };
const severityMeta: Record<IncidentSeverity, { label: string; badge: string }> = { LOW: { label: 'Thấp', badge: 'bg-blue-50 text-blue-700' }, MEDIUM: { label: 'Trung bình', badge: 'bg-amber-50 text-amber-700' }, HIGH: { label: 'Cao', badge: 'bg-rose-50 text-rose-700' } };
const certStatusMeta = { VALID: { label: 'Còn hiệu lực', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }, EXPIRING: { label: 'Sắp hết hạn', badge: 'bg-amber-50 text-amber-700 ring-amber-200' }, EXPIRED: { label: 'Hết hạn', badge: 'bg-rose-50 text-rose-700 ring-rose-200' } };
const tabs: Array<{ id: SafetyTab; label: string }> = [{ id: 'OVERVIEW', label: 'Tổng quan' }, { id: 'CHECKLISTS', label: 'Checklist vệ sinh' }, { id: 'INCIDENTS', label: 'Sự cố & khắc phục' }, { id: 'COMPLIANCE', label: 'Hồ sơ tuân thủ' }];
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const branchName = (branch: BranchCode | 'ALL') => branch === 'ALL' ? 'Toàn tenant' : branch === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3';
const normalizeChecklists = (items: ChecklistItem[]) =>
  items.map((item) => {
    const total = item.tasks.length;
    const completed = item.tasks.filter((task) => task.done).length;
    const allDone = total > 0 && completed === total;
    return {
      ...item,
      total,
      completed,
      status: allDone
        ? 'DONE' as ChecklistStatus
        : item.status === 'OVERDUE'
          ? 'OVERDUE' as ChecklistStatus
          : 'IN_PROGRESS' as ChecklistStatus,
    };
  });

export default function TenantAdminSanitation({ searchQuery, onSearchQueryChange, selectedBranch, tenantName = 'Lumière Nail Studio', roleLabel = 'Owner · Tenant Admin', accessMode = 'full', readOnlyReason, onNotify }: TenantAdminSanitationProps) {
  const storageKey = `tenant-admin-sanitation-v1:${tenantName}`;
  const [checklists, setChecklists] = useState<ChecklistItem[]>(() => { try { const value = localStorage.getItem(`${storageKey}:checklists`); return normalizeChecklists(getTenantAdminInitialData(value ? JSON.parse(value) : null, checklistSeed)); } catch { return normalizeChecklists(getTenantAdminInitialData(null, checklistSeed)); } });
  const [batches, setBatches] = useState<SterilizationBatch[]>(() => { try { const value = localStorage.getItem(`${storageKey}:batches`); return getTenantAdminInitialData(value ? JSON.parse(value) : null, batchSeed); } catch { return getTenantAdminInitialData(null, batchSeed); } });
  const [incidents, setIncidents] = useState<SafetyIncident[]>(() => { try { const value = localStorage.getItem(`${storageKey}:incidents`); return getTenantAdminInitialData(value ? JSON.parse(value) : null, incidentSeed); } catch { return getTenantAdminInitialData(null, incidentSeed); } });
  const [certificates, setCertificates] = useState<Certificate[]>(() => { try { const value = localStorage.getItem(`${storageKey}:certificates`); return getTenantAdminInitialData(value ? JSON.parse(value) : null, certificateSeed); } catch { return getTenantAdminInitialData(null, certificateSeed); } });
  const [tab, setTab] = useState<SafetyTab>('OVERVIEW');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistItem | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<SterilizationBatch | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [incidentFormOpen, setIncidentFormOpen] = useState(false);
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [checklistFormOpen, setChecklistFormOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);
  const [certificateFormOpen, setCertificateFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedRecordTarget | null>(null);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [incidentForm, setIncidentForm] = useState({ title: '', category: 'Thiết bị & cơ sở vật chất', branch: 'Q3' as BranchCode, area: '', severity: 'MEDIUM' as IncidentSeverity, description: '', immediateAction: '', owner: '' });
  const [batchForm, setBatchForm] = useState({ branch: 'Q3' as BranchCode, machine: 'Autoclave MELAG 31B+', cycle: 'B · 134°C · 5 phút', items: '20', operator: '', note: '' });
  const [checklistForm, setChecklistForm] = useState({ title: '', area: '', branch: 'Q3' as BranchCode, shift: 'Mở ca', due: '', assignee: '', tasks: '', note: '' });
  const [certificateForm, setCertificateForm] = useState({ name: '', type: 'Cơ sở', branch: 'ALL' as BranchCode | 'ALL', issued: '', expires: '', owner: '', document: '' });
  const canManage = accessMode === 'full';
  useEffect(() => { try { localStorage.setItem(`${storageKey}:checklists`, JSON.stringify(checklists)); } catch { /* optional */ } }, [checklists, storageKey]);
  useEffect(() => { try { localStorage.setItem(`${storageKey}:batches`, JSON.stringify(batches)); } catch { /* optional */ } }, [batches, storageKey]);
  useEffect(() => { try { localStorage.setItem(`${storageKey}:incidents`, JSON.stringify(incidents)); } catch { /* optional */ } }, [incidents, storageKey]);
  useEffect(() => { try { localStorage.setItem(`${storageKey}:certificates`, JSON.stringify(certificates)); } catch { /* optional */ } }, [certificates, storageKey]);
  const requireManage = () => { if (canManage) return true; const message = readOnlyReason || 'Gói hiện tại chỉ cho phép xem dữ liệu vệ sinh và an toàn.'; setNotice(message); onNotify?.(message); return false; };
  const scopedChecklists = useMemo(() => checklists.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch), [checklists, selectedBranch]);
  const scopedBatches = useMemo(() => batches.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch), [batches, selectedBranch]);
  const scopedIncidents = useMemo(() => incidents.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch), [incidents, selectedBranch]);
  const scopedCertificates = useMemo(() => certificates.filter((item) => selectedBranch === 'ALL' || item.branch === 'ALL' || item.branch === selectedBranch), [certificates, selectedBranch]);
  const filteredChecklists = useMemo(() => { const query = searchQuery.trim().toLocaleLowerCase('vi'); return scopedChecklists.filter((item) => Boolean(item.archived) === showArchived).filter((item) => statusFilter === 'ALL' || item.status === statusFilter).filter((item) => !query || `${item.id} ${item.title} ${item.area} ${item.assignee}`.toLocaleLowerCase('vi').includes(query)); }, [scopedChecklists, searchQuery, showArchived, statusFilter]);
  const filteredBatches = useMemo(() => { const query = searchQuery.trim().toLocaleLowerCase('vi'); return scopedBatches.filter((item) => Boolean(item.archived) === showArchived).filter((item) => statusFilter === 'ALL' || item.status === statusFilter).filter((item) => !query || `${item.id} ${item.machine} ${item.operator} ${item.indicator}`.toLocaleLowerCase('vi').includes(query)); }, [scopedBatches, searchQuery, showArchived, statusFilter]);
  const filteredIncidents = useMemo(() => { const query = searchQuery.trim().toLocaleLowerCase('vi'); return scopedIncidents.filter((item) => Boolean(item.archived) === showArchived).filter((item) => statusFilter === 'ALL' || item.status === statusFilter).filter((item) => !query || `${item.id} ${item.title} ${item.category} ${item.area} ${item.owner}`.toLocaleLowerCase('vi').includes(query)); }, [scopedIncidents, searchQuery, showArchived, statusFilter]);
  const filteredCertificates = useMemo(() => { const query = searchQuery.trim().toLocaleLowerCase('vi'); return scopedCertificates.filter((item) => Boolean(item.archived) === showArchived).filter((item) => !query || `${item.id} ${item.name} ${item.type} ${item.owner} ${item.document}`.toLocaleLowerCase('vi').includes(query)); }, [scopedCertificates, searchQuery, showArchived]);
  const archivedChecklistCount = scopedChecklists.filter((item) => item.archived).length;
  const archivedBatchCount = scopedBatches.filter((item) => item.archived).length;
  const archivedIncidentCount = scopedIncidents.filter((item) => item.archived).length;
  const archivedCertificateCount = scopedCertificates.filter((item) => item.archived).length;
  const activeScopedChecklists = scopedChecklists.filter((item) => !item.archived);
  const activeScopedBatches = scopedBatches.filter((item) => !item.archived);
  const activeScopedIncidents = scopedIncidents.filter((item) => !item.archived);
  const activeScopedCertificates = scopedCertificates.filter((item) => !item.archived);
  const checklistTotal = activeScopedChecklists.reduce((sum, item) => sum + item.total, 0); const checklistDone = activeScopedChecklists.reduce((sum, item) => sum + item.completed, 0); const complianceRate = checklistTotal ? checklistDone / checklistTotal * 100 : 0;
  const passedBatches = activeScopedBatches.filter((item) => item.status === 'PASSED').length; const openIncidents = activeScopedIncidents.filter((item) => item.status !== 'RESOLVED').length; const expiringDocs = activeScopedCertificates.filter((item) => item.status !== 'VALID').length;
  const toggleChecklistTask = (checklist: ChecklistItem, index: number) => {
    if (!requireManage()) return;
    const target = checklist.tasks[index];
    if (!target) return;
    const undoing = target.done;
    const tasks = checklist.tasks.map((task, taskIndex) =>
      taskIndex === index
        ? {
            ...task,
            done: !task.done,
            evidence: task.done
              ? 'Đã hoàn tác bởi Tenant Admin · vừa xong'
              : task.previousEvidence
                || (task.evidence === 'Chưa cập nhật' || task.evidence.startsWith('Đã hoàn tác')
                  ? 'Xác nhận bởi Tenant Admin · vừa xong'
                  : task.evidence),
            previousEvidence: task.done ? task.evidence : undefined,
          }
        : task
    );
    const allDone = tasks.every((task) => task.done);
    const updated: ChecklistItem = {
      ...checklist,
      tasks,
      completed: allDone
        ? checklist.total
        : undoing
          ? Math.max(0, checklist.completed - 1)
          : Math.min(checklist.total, checklist.completed + 1),
      status: allDone
        ? 'DONE'
        : checklist.status === 'OVERDUE'
          ? 'OVERDUE'
          : 'IN_PROGRESS',
    };
    setChecklists((current) =>
      current.map((item) => (item.id === checklist.id ? updated : item))
    );
    setSelectedChecklist(updated);
    setNotice(
      undoing
        ? `Đã hoàn tác mục “${target.label}”.`
        : `Đã xác nhận mục “${target.label}”.`
    );
  };

  const reopenChecklist = (checklist: ChecklistItem) => {
    if (!requireManage()) return;
    let lastCompletedIndex = -1;
    checklist.tasks.forEach((task, index) => {
      if (task.done) lastCompletedIndex = index;
    });
    if (lastCompletedIndex < 0) return;
    toggleChecklistTask(checklist, lastCompletedIndex);
    setNotice(`Đã mở lại checklist ${checklist.id} và hoàn tác mục xác nhận gần nhất.`);
  };
  const releaseBatch = (batch: SterilizationBatch) => { if (!requireManage()) return; const updated = { ...batch, status: 'PASSED' as BatchStatus, end: 'vừa xong', temperature: 134, pressure: '2,1 bar', indicator: 'Đạt · Class 5', releasedBy: 'Nguyễn Trường Thịnh' }; setBatches((current) => current.map((item) => item.id === batch.id ? updated : item)); setSelectedBatch(updated); setNotice(`Đã phát hành lô tiệt khuẩn ${batch.id}.`); };
  const resolveIncident = (incident: SafetyIncident) => { if (!requireManage()) return; const updated = { ...incident, status: 'RESOLVED' as IncidentStatus, dueDate: 'Đã hoàn tất · 20/07/2026' }; setIncidents((current) => current.map((item) => item.id === incident.id ? updated : item)); setSelectedIncident(updated); setNotice(`Đã xác nhận khắc phục sự cố ${incident.id}.`); };
  const submitIncident = (event: FormEvent) => { event.preventDefault(); if (!requireManage()) return; if (!incidentForm.title.trim() || !incidentForm.area.trim() || !incidentForm.description.trim() || !incidentForm.immediateAction.trim()) { setFormError('Vui lòng nhập tiêu đề, khu vực, mô tả và hành động tức thời.'); return; } const created: SafetyIncident = { id: `INC-260720-${String(incidents.length + 5).padStart(3, '0')}`, title: incidentForm.title.trim(), category: incidentForm.category, branch: incidentForm.branch, area: incidentForm.area.trim(), occurredAt: '20/07/2026 · vừa xong', severity: incidentForm.severity, status: 'OPEN', reporter: 'Nguyễn Trường Thịnh', owner: incidentForm.owner.trim() || 'Tenant Admin', description: incidentForm.description.trim(), immediateAction: incidentForm.immediateAction.trim(), rootCause: 'Đang điều tra nguyên nhân gốc', correctiveAction: 'Chưa thiết lập hành động khắc phục dài hạn', dueDate: '22/07/2026' }; setIncidents((current) => [created, ...current]); setSelectedIncident(created); setIncidentFormOpen(false); setNotice(`Đã ghi nhận sự cố ${created.id}.`); };
  const submitBatch = (event: FormEvent) => { event.preventDefault(); if (!requireManage()) return; if (!batchForm.operator.trim() || Number(batchForm.items) <= 0) { setFormError('Vui lòng nhập người vận hành và số dụng cụ hợp lệ.'); return; } const created: SterilizationBatch = { id: `ST-${batchForm.branch}-0720-${String(batches.length + 10).padStart(2, '0')}`, branch: batchForm.branch, machine: batchForm.machine, cycle: batchForm.cycle, start: 'vừa xong', end: 'Dự kiến sau 28 phút', temperature: 25, pressure: '0 bar', items: Number(batchForm.items), indicator: 'Đang xử lý', status: 'RUNNING', operator: batchForm.operator.trim(), releasedBy: 'Chưa duyệt', note: batchForm.note.trim() }; setBatches((current) => [created, ...current]); setSelectedBatch(created); setBatchFormOpen(false); setNotice(`Đã bắt đầu lô tiệt khuẩn ${created.id}.`); };

  const openChecklistCreate = () => {
    if (!requireManage()) return;
    setEditingChecklist(null);
    setChecklistForm({
      title: '',
      area: '',
      branch: selectedBranch === 'Q1' ? 'Q1' : 'Q3',
      shift: 'Mở ca',
      due: '',
      assignee: '',
      tasks: '',
      note: '',
    });
    setFormError('');
    setChecklistFormOpen(true);
  };

  const openChecklistEdit = (checklist: ChecklistItem) => {
    if (!requireManage()) return;
    setEditingChecklist(checklist);
    setChecklistForm({
      title: checklist.title,
      area: checklist.area,
      branch: checklist.branch,
      shift: checklist.shift,
      due: checklist.due,
      assignee: checklist.assignee,
      tasks: checklist.tasks.map((task) => task.label).join('\n'),
      note: checklist.note,
    });
    setFormError('');
    setSelectedChecklist(null);
    setChecklistFormOpen(true);
  };

  const closeChecklistForm = () => {
    setChecklistFormOpen(false);
    setFormError('');
    if (editingChecklist) {
      setSelectedChecklist(editingChecklist);
      setEditingChecklist(null);
    }
  };

  const submitChecklist = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    const taskLabels = checklistForm.tasks.split('\n').map((item) => item.trim()).filter(Boolean);
    if (!checklistForm.title.trim() || !checklistForm.area.trim() || !checklistForm.due.trim() || !checklistForm.assignee.trim() || taskLabels.length === 0) {
      setFormError('Vui lòng nhập tên checklist, khu vực, hạn hoàn tất, người phụ trách và ít nhất một nhiệm vụ.');
      return;
    }
    if (new Set(taskLabels.map((label) => label.toLocaleLowerCase('vi'))).size !== taskLabels.length) {
      setFormError('Danh sách đang có nhiệm vụ trùng tên. Vui lòng kiểm tra lại.');
      return;
    }

    if (editingChecklist) {
      const canMatchByIndex = taskLabels.length === editingChecklist.tasks.length;
      const tasks = taskLabels.map((label, index) => {
        const existingByLabel = editingChecklist.tasks.find((task) => task.label === label);
        const existing = existingByLabel
          || (canMatchByIndex ? editingChecklist.tasks[index] : undefined);
        return existing
          ? { ...existing, label }
          : { label, done: false, evidence: 'Chưa cập nhật' };
      });
      const completed = tasks.filter((task) => task.done).length;
      const updated: ChecklistItem = {
        ...editingChecklist,
        title: checklistForm.title.trim(),
        area: checklistForm.area.trim(),
        branch: checklistForm.branch,
        shift: checklistForm.shift,
        due: checklistForm.due.trim(),
        assignee: checklistForm.assignee.trim(),
        tasks,
        completed,
        total: tasks.length,
        status: completed === tasks.length
          ? 'DONE'
          : editingChecklist.status === 'OVERDUE'
            ? 'OVERDUE'
            : 'IN_PROGRESS',
        note: checklistForm.note.trim(),
      };
      setChecklists((current) =>
        current.map((item) => (item.id === editingChecklist.id ? updated : item))
      );
      setChecklistFormOpen(false);
      setEditingChecklist(null);
      setFormError('');
      setSelectedChecklist(updated);
      setNotice(`Đã cập nhật checklist ${updated.id}. Tiến độ hiện là ${completed}/${tasks.length}.`);
      return;
    }

    const created: ChecklistItem = {
      id: `CHK-${checklistForm.branch}-${Date.now().toString().slice(-6)}`,
      title: checklistForm.title.trim(),
      area: checklistForm.area.trim(),
      branch: checklistForm.branch,
      shift: checklistForm.shift,
      due: checklistForm.due.trim(),
      completed: 0,
      total: taskLabels.length,
      status: 'IN_PROGRESS',
      assignee: checklistForm.assignee.trim(),
      tasks: taskLabels.map((label) => ({ label, done: false, evidence: 'Chưa cập nhật' })),
      note: checklistForm.note.trim() || 'Checklist mới được tạo bởi Tenant Admin.'
    };
    setChecklists((current) => [created, ...current]);
    setChecklistFormOpen(false);
    setChecklistForm({ title: '', area: '', branch: checklistForm.branch, shift: 'Mở ca', due: '', assignee: '', tasks: '', note: '' });
    setFormError('');
    setSelectedChecklist(created);
    setNotice(`Đã tạo checklist ${created.id} với ${created.total} nhiệm vụ.`);
  };
  const submitCertificate = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    if (!certificateForm.name.trim() || !certificateForm.issued || !certificateForm.expires || !certificateForm.owner.trim() || !certificateForm.document.trim()) {
      setFormError('Vui lòng nhập đầy đủ tên hồ sơ, ngày cấp, ngày hết hạn, người phụ trách và tên tệp tài liệu.');
      return;
    }
    if (certificateForm.expires < certificateForm.issued) {
      setFormError('Ngày hết hạn phải sau ngày cấp.');
      return;
    }
    const formatInputDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
    const expiryTime = new Date(`${certificateForm.expires}T00:00:00`).getTime();
    const daysLeft = Math.ceil((expiryTime - Date.now()) / 86400000);
    const status: Certificate['status'] = daysLeft < 0 ? 'EXPIRED' : daysLeft <= 30 ? 'EXPIRING' : 'VALID';
    const created: Certificate = {
      id: `CERT-${Date.now().toString().slice(-7)}`,
      name: certificateForm.name.trim(),
      type: certificateForm.type,
      branch: certificateForm.branch,
      issued: formatInputDate(certificateForm.issued),
      expires: formatInputDate(certificateForm.expires),
      status,
      owner: certificateForm.owner.trim(),
      document: certificateForm.document.trim()
    };
    setCertificates((current) => [created, ...current]);
    setCertificateFormOpen(false);
    setCertificateForm({ name: '', type: 'Cơ sở', branch: 'ALL', issued: '', expires: '', owner: '', document: '' });
    setFormError('');
    setNotice(`Đã thêm hồ sơ tuân thủ ${created.id}.`);
  };
  const archiveRecord = (target: ManagedRecordTarget, archived: boolean) => {
    if (!requireManage()) return;
    if (target.kind === 'CHECKLIST') setChecklists((current) => current.map((item) => item.id === target.id ? { ...item, archived } : item));
    if (target.kind === 'BATCH') setBatches((current) => current.map((item) => item.id === target.id ? { ...item, archived } : item));
    if (target.kind === 'INCIDENT') setIncidents((current) => current.map((item) => item.id === target.id ? { ...item, archived } : item));
    if (target.kind === 'CERTIFICATE') setCertificates((current) => current.map((item) => item.id === target.id ? { ...item, archived } : item));
    if (target.kind === 'CHECKLIST' && selectedChecklist?.id === target.id) setSelectedChecklist(null);
    if (target.kind === 'BATCH' && selectedBatch?.id === target.id) setSelectedBatch(null);
    if (target.kind === 'INCIDENT' && selectedIncident?.id === target.id) setSelectedIncident(null);
    setOpenActionMenu(null);
    setNotice(archived ? `Đã lưu trữ ${target.label}. Bạn có thể khôi phục trong mục Đã lưu trữ.` : `Đã khôi phục ${target.label}.`);
  };
  const permanentlyDeleteRecord = () => {
    if (!deleteTarget || !requireManage()) return;
    if (deleteTarget.kind === 'CHECKLIST') setChecklists((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (deleteTarget.kind === 'BATCH') setBatches((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (deleteTarget.kind === 'INCIDENT') setIncidents((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (deleteTarget.kind === 'CERTIFICATE') setCertificates((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (deleteTarget.kind === 'CHECKLIST' && selectedChecklist?.id === deleteTarget.id) setSelectedChecklist(null);
    if (deleteTarget.kind === 'BATCH' && selectedBatch?.id === deleteTarget.id) setSelectedBatch(null);
    if (deleteTarget.kind === 'INCIDENT' && selectedIncident?.id === deleteTarget.id) setSelectedIncident(null);
    setNotice(`Đã xóa vĩnh viễn ${deleteTarget.label}.`);
    setDeleteTarget(null);
    setOpenActionMenu(null);
  };
  const exportLog = () => { const rows = activeScopedBatches.map((item) => [item.id, branchName(item.branch), item.machine, item.cycle, item.start, item.end, item.temperature, item.pressure, item.items, item.indicator, batchStatusMeta[item.status].label]); const csv = [['Mã lô', 'Chi nhánh', 'Máy', 'Chu trình', 'Bắt đầu', 'Kết thúc', 'Nhiệt độ', 'Áp suất', 'Số dụng cụ', 'Chỉ thị', 'Trạng thái'], ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); link.download = 'nhat-ky-tiet-khuan.csv'; link.click(); URL.revokeObjectURL(link.href); setNotice('Đã xuất nhật ký tiệt khuẩn.'); };
  const switchTab = (next: SafetyTab) => { setTab(next); setStatusFilter('ALL'); setShowArchived(false); setOpenActionMenu(null); onSearchQueryChange(''); };
  const renderArchiveToggle = (archivedCount: number) => <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
    <button type="button" onClick={() => { setShowArchived(false); setOpenActionMenu(null); }} className={`h-8 border-0 px-3 text-body font-black shadow-none ${!showArchived ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'}`}>Đang hoạt động</button>
    <button type="button" onClick={() => { setShowArchived(true); setOpenActionMenu(null); }} className={`flex h-8 items-center gap-1.5 border-0 px-3 text-body font-black shadow-none ${showArchived ? 'bg-white text-violet-700 shadow-sm' : 'bg-transparent text-slate-500'}`}><Archive className="h-3.5 w-3.5" />Đã lưu trữ ({archivedCount})</button>
  </div>;
  const renderRecordActions = (target: ManagedRecordTarget, placement = 'right-3 top-1/2 -translate-y-1/2') => {
    const menuKey = `${target.kind}:${target.id}`;
    const isOpen = openActionMenu === menuKey;
    return <div className={`absolute ${isOpen ? 'z-50' : 'z-10'} ${placement}`}>
      <button type="button" aria-label={`Thao tác ${target.label}`} aria-expanded={isOpen} onClick={() => setOpenActionMenu((current) => current === menuKey ? null : menuKey)} disabled={!canManage} className={`flex h-9 w-9 items-center justify-center rounded-xl border p-0 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-40 ${isOpen ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-700'}`}><MoreHorizontal className="h-4 w-4" /></button>
      {isOpen && <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <button type="button" onClick={() => archiveRecord(target, !target.archived)} className="flex h-9 w-full items-center gap-2 border-0 bg-white px-3 text-left text-xs font-bold text-slate-700 shadow-none hover:bg-slate-50">{target.archived ? <RotateCcw className="h-4 w-4 text-emerald-600" /> : <Archive className="h-4 w-4 text-violet-600" />}{target.archived ? 'Khôi phục' : 'Lưu trữ'}</button>
        <button type="button" onClick={() => { setDeleteTarget(target); setOpenActionMenu(null); }} className="flex h-9 w-full items-center gap-2 border-0 bg-white px-3 text-left text-xs font-bold text-rose-600 shadow-none hover:bg-rose-50"><Trash2 className="h-4 w-4" />Xóa vĩnh viễn</button>
      </div>}
    </div>;
  };

  return <div className="space-y-5">
    {(notice || accessMode !== 'full') && <div className="flex items-start justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-800"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm"><Check className="h-4 w-4" /></span><div><p className="text-xs font-black">Trung tâm vệ sinh & an toàn</p><p className="mt-1 text-xs leading-5">{notice || readOnlyReason || 'Bạn đang xem dữ liệu ở chế độ chỉ đọc theo quyền của gói.'}</p></div></div>{notice && <button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo" className="flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-violet-500 shadow-none"><X className="h-4 w-4" /></button>}</div>}
    <PageHeader
        title="Vệ sinh & an toàn"
        actions={(
          <button type="button" onClick={() => { if (!requireManage()) return; setFormError(''); setIncidentFormOpen(true); }} disabled={!canManage} className="flex h-11 w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto xl:min-w-[164px]"><Plus className="h-4 w-4 shrink-0" /><span>Ghi nhận sự cố</span></button>
        )}
      />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Tuân thủ checklist', value: `${complianceRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`, detail: `${checklistDone}/${checklistTotal} mục đã xác nhận`, icon: ClipboardCheck, tone: 'bg-violet-50 text-violet-600' }, { label: 'Lô tiệt khuẩn đạt', value: `${passedBatches}/${activeScopedBatches.length}`, detail: `${activeScopedBatches.reduce((sum, item) => sum + item.items, 0)} dụng cụ được theo dõi`, icon: FlaskConical, tone: 'bg-emerald-50 text-emerald-600' }, { label: 'Sự cố đang xử lý', value: String(openIncidents), detail: `${activeScopedIncidents.filter((item) => item.severity === 'HIGH').length} sự cố mức độ cao`, icon: ShieldAlert, tone: 'bg-amber-50 text-amber-600' }, { label: 'Hồ sơ cần gia hạn', value: String(expiringDocs), detail: 'Cảnh báo trước 30 ngày', icon: FileCheck2, tone: 'bg-blue-50 text-blue-600' }].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div><p className="mt-2 text-xs font-semibold text-slate-400">{detail}</p></article>)}</section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3 sm:px-5">{tabs.map((item) => <button key={item.id} type="button" onClick={() => switchTab(item.id)} className={`h-10 shrink-0 rounded-b-none border-x-0 border-t-0 px-3 text-xs font-black shadow-none ${tab === item.id ? 'border-b-2 border-violet-600 bg-violet-50/60 text-violet-700' : 'border-b-2 border-transparent bg-white text-slate-500'}`}>{item.label}</button>)}</div><div className="p-4 sm:p-5">
      {tab === 'OVERVIEW' && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><article className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between"><div><h2 className="text-base font-black text-slate-900">Tình trạng vệ sinh hôm nay</h2><p className="mt-1 text-xs text-slate-400">Tiến độ theo nhóm kiểm soát</p></div><Gauge className="h-5 w-5 text-violet-500" /></div><div className="mt-5 space-y-4">{[{ label: 'Mở ca & bề mặt tiếp xúc', value: 92, detail: '23/25 mục', tone: 'bg-violet-500' }, { label: 'Dụng cụ & tiệt khuẩn', value: 88, detail: '42/48 túi', tone: 'bg-emerald-500' }, { label: 'Bồn pedicure & đường nước', value: 93, detail: '28/30 lượt', tone: 'bg-blue-500' }, { label: 'PPE & vật tư an toàn', value: 100, detail: '12/12 trạm', tone: 'bg-fuchsia-500' }].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="font-bold text-slate-600">{item.label}</span><span className="font-black text-slate-800">{item.detail} · {item.value}%</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} /></div></div>)}</div></article><article className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between"><div><h2 className="text-base font-black text-slate-900">Trạng thái khu vực</h2><p className="mt-1 text-xs text-slate-400">Cập nhật theo thời gian thực</p></div><Store className="h-5 w-5 text-blue-500" /></div><div className="mt-4 grid grid-cols-2 gap-2">{[{ area: 'Manicure', code: 'M-01 → M-08', value: 'Sẵn sàng', tone: 'bg-emerald-500' }, { area: 'Pedicure', code: 'P-01 → P-06', value: '1 ghế bảo trì', tone: 'bg-amber-500' }, { area: 'Phòng VIP', code: 'VIP-01 → 02', value: 'Sẵn sàng', tone: 'bg-emerald-500' }, { area: 'Tiệt khuẩn', code: 'Phòng ST-01', value: '1 chu trình chạy', tone: 'bg-blue-500' }, { area: 'Kho hóa chất', code: 'HC-01', value: 'Đã khóa', tone: 'bg-emerald-500' }, { area: 'Khu rác thải', code: 'WT-01', value: 'Thu gom 18:00', tone: 'bg-violet-500' }].map((item) => <div key={item.area} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><p className="text-xs font-black text-slate-800">{item.area}</p><span className={`h-2 w-2 rounded-full ${item.tone}`} /></div><p className="mt-1 text-caption text-slate-400">{item.code}</p><p className="mt-2 text-caption font-bold text-slate-600">{item.value}</p></div>)}</div></article></div><div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><article className="overflow-hidden rounded-2xl border border-slate-200"><div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h3 className="text-sm font-black text-slate-900">Checklist cần theo dõi</h3><p className="mt-1 text-xs text-slate-400">Mở ca, giữa ca, sau khách và đóng ca</p></div><button type="button" onClick={() => switchTab('CHECKLISTS')} className="flex h-9 items-center gap-1 border-0 bg-violet-50 px-3 text-xs font-black text-violet-700 shadow-none">Xem tất cả<ChevronRight className="h-4 w-4" /></button></div><div className="divide-y divide-slate-100">{activeScopedChecklists.slice(0, 4).map((checklist) => { const percent = checklist.total ? checklist.completed / checklist.total * 100 : 0; return <button key={checklist.id} type="button" onClick={() => setSelectedChecklist(checklist)} className="grid h-auto w-full gap-3 rounded-none border-0 bg-white px-4 py-3.5 text-left shadow-none hover:bg-slate-50 sm:grid-cols-[1.3fr_1fr_140px_115px] sm:items-center"><div><p className="text-xs font-black text-slate-800">{checklist.title}</p><p className="mt-1 text-caption text-slate-400">{checklist.id} · {checklist.area}</p></div><div><p className="text-xs font-bold text-slate-600">{checklist.assignee}</p><p className="mt-1 text-caption text-slate-400">Hạn {checklist.due}</p></div><div><div className="mb-1 flex justify-between text-caption font-bold text-slate-500"><span>{checklist.completed}/{checklist.total}</span><span>{percent.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${checklist.status === 'OVERDUE' ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${percent}%` }} /></div></div><span className={`w-fit rounded-full px-2 py-1 text-caption font-bold ring-1 ${checklistStatusMeta[checklist.status].badge}`}>{checklistStatusMeta[checklist.status].label}</span></button>; })}</div></article><aside className="space-y-4"><article className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm"><AlertTriangle className="h-5 w-5" /></span><div><p className="text-sm font-black text-rose-800">1 sự cố cần xử lý</p><p className="mt-1 text-xs leading-5 text-rose-700">Ghế P-04 đang khóa do rò đường nước. Kỹ thuật bảo trì dự kiến đến lúc 17:30.</p><button type="button" onClick={() => { switchTab('INCIDENTS'); setSelectedIncident(activeScopedIncidents[0] || null); }} className="mt-3 flex h-9 items-center gap-1 border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 shadow-sm">Xem hồ sơ sự cố<ChevronRight className="h-4 w-4" /></button></div></div></article><article className="rounded-2xl border border-slate-200 p-5"><p className="text-sm font-black text-slate-900">Vật tư an toàn</p><div className="mt-3 space-y-2">{[{ label: 'Găng nitrile', value: '12 ngày', tone: 'text-emerald-700' }, { label: 'Dung dịch khử khuẩn', value: '8 ngày', tone: 'text-amber-700' }, { label: 'Túi tiệt khuẩn', value: '18 ngày', tone: 'text-emerald-700' }, { label: 'Hộp vật sắc nhọn', value: '6 ngày', tone: 'text-rose-700' }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-bold text-slate-600">{item.label}</span><span className={`text-xs font-black ${item.tone}`}>Đủ {item.value}</span></div>)}</div></article></aside></div></div>}
      {tab === 'CHECKLISTS' && (
        <div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Checklist vệ sinh vận hành
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Theo dõi từng nhiệm vụ, bằng chứng và người xác nhận
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {renderArchiveToggle(archivedChecklistCount)}
              <button
                type="button"
                onClick={() => setFilterOpen((value) => !value)}
                className={`flex h-10 items-center gap-2 border px-3 text-xs font-bold shadow-sm ${
                  filterOpen || statusFilter !== 'ALL'
                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                Bộ lọc
              </button>
              {!showArchived && (
                <button
                  type="button"
                  onClick={openChecklistCreate}
                  disabled={!canManage}
                  className="flex h-10 items-center gap-2 border border-violet-700 bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200"
                >
                  <Plus className="h-4 w-4" />
                  Tạo checklist
                </button>
              )}
            </div>
          </div>

          {filterOpen && (
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Tên, khu vực, người phụ trách..."
                />
              </div>
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(checklistStatusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </BeautifulSelect>
            </div>
          )}

          {filteredChecklists.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {filteredChecklists.map((checklist) => {
                const percent = checklist.total
                  ? checklist.completed / checklist.total * 100
                  : 0;
                return (
                  <div key={checklist.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedChecklist(checklist)}
                      className={`h-full w-full border border-slate-200 p-5 pr-16 text-left shadow-sm hover:border-violet-200 hover:shadow-lg ${
                        showArchived ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            checklist.status === 'DONE'
                              ? 'bg-emerald-50 text-emerald-600'
                              : checklist.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-violet-50 text-violet-600'
                          }`}
                        >
                          <ClipboardCheck className="h-5 w-5" />
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${
                            checklistStatusMeta[checklist.status].badge
                          }`}
                        >
                          {checklistStatusMeta[checklist.status].label}
                        </span>
                      </div>
                      <p className="mt-4 text-caption font-black uppercase tracking-wide text-violet-600">
                        {checklist.id} · {branchName(checklist.branch)}
                      </p>
                      <h3 className="mt-1 text-base font-black text-slate-900">
                        {checklist.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {checklist.area} · {checklist.assignee}
                      </p>
                      <div className="mt-4 h-2.5 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            checklist.status === 'OVERDUE'
                              ? 'bg-rose-500'
                              : 'bg-gradient-to-r from-violet-500 to-fuchsia-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>{checklist.completed}/{checklist.total} mục</span>
                        <span>Hạn {checklist.due}</span>
                      </div>
                    </button>
                    {renderRecordActions(
                      {
                        kind: 'CHECKLIST',
                        id: checklist.id,
                        label: `checklist ${checklist.id}`,
                        archived: Boolean(checklist.archived),
                      },
                      'right-4 top-4'
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
              <Archive className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-700">
                {showArchived
                  ? 'Chưa có checklist nào được lưu trữ'
                  : 'Không có checklist phù hợp'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {showArchived
                  ? 'Các checklist đã lưu trữ sẽ xuất hiện tại đây.'
                  : 'Thử thay đổi phạm vi hoặc bộ lọc tìm kiếm.'}
              </p>
            </div>
          )}
        </div>
      )}
      {tab === 'INCIDENTS' && <div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-base font-black text-slate-900">Sự cố & hành động khắc phục</h2><p className="mt-1 text-xs text-slate-400">Ghi nhận, đánh giá mức độ, điều tra nguyên nhân và xác nhận đóng</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {renderArchiveToggle(archivedIncidentCount)}
            {!showArchived && <button type="button" onClick={() => { if (!requireManage()) return; setFormError(''); setIncidentFormOpen(true); }} disabled={!canManage} className="flex h-10 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200"><Plus className="h-4 w-4" />Ghi nhận sự cố</button>}
          </div>
        </div>
        {filteredIncidents.length > 0 ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredIncidents.map((incident) => <div key={incident.id} className="relative">
          <button type="button" onClick={() => setSelectedIncident(incident)} className={`h-full w-full border border-slate-200 p-5 text-left shadow-sm hover:border-violet-200 hover:shadow-lg ${showArchived ? 'bg-slate-50/70' : 'bg-white'}`}><div className="flex items-start justify-between gap-2 pr-10"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${incident.severity === 'HIGH' ? 'bg-rose-50 text-rose-600' : incident.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}><ShieldAlert className="h-5 w-5" /></span><div className="flex flex-wrap justify-end gap-1"><span className={`rounded-full px-2 py-1 text-caption font-bold ${severityMeta[incident.severity].badge}`}>Mức {severityMeta[incident.severity].label}</span><span className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${incidentStatusMeta[incident.status].badge}`}>{incidentStatusMeta[incident.status].label}</span></div></div><p className="mt-4 text-caption font-black uppercase tracking-wide text-violet-600">{incident.id} · {branchName(incident.branch)}</p><h3 className="mt-1 text-base font-black text-slate-900">{incident.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{incident.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-caption font-bold text-slate-500"><span>{incident.area}</span><span>Phụ trách {incident.owner}</span></div></button>
          {renderRecordActions({ kind: 'INCIDENT', id: incident.id, label: `sự cố ${incident.id}`, archived: Boolean(incident.archived) }, 'right-4 top-4')}
        </div>)}</div> : <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center"><Archive className="h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">{showArchived ? 'Chưa có sự cố nào được lưu trữ' : 'Không có sự cố phù hợp'}</p><p className="mt-1 text-xs text-slate-400">{showArchived ? 'Các sự cố đã lưu trữ sẽ xuất hiện tại đây.' : 'Thử thay đổi phạm vi hoặc từ khóa tìm kiếm.'}</p></div>}
      </div>}
      {tab === 'COMPLIANCE' && <div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-base font-black text-slate-900">Hồ sơ tuân thủ & chứng nhận</h2><p className="mt-1 text-xs text-slate-400">Theo dõi thời hạn, tài liệu và người phụ trách gia hạn</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {renderArchiveToggle(archivedCertificateCount)}
            {!showArchived && <button type="button" onClick={() => { if (!requireManage()) return; setFormError(''); setCertificateForm((current) => ({ ...current, branch: selectedBranch === 'Q1' ? 'Q1' : selectedBranch === 'Q3' ? 'Q3' : 'ALL' })); setCertificateFormOpen(true); }} disabled={!canManage} className="flex h-10 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200"><Plus className="h-4 w-4" />Thêm hồ sơ</button>}
          </div>
        </div>
        <div className="mt-5 overflow-visible rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-[1.4fr_1fr_100px_100px_120px_40px] gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50 px-4 py-3 text-caption font-black uppercase tracking-wide text-slate-400 lg:grid"><span>Hồ sơ</span><span>Phạm vi / phụ trách</span><span>Ngày cấp</span><span>Hết hạn</span><span>Trạng thái</span><span /></div>
          <div className="divide-y divide-slate-100">{filteredCertificates.length > 0 ? filteredCertificates.map((cert) => <div key={cert.id} className="relative">
            <button type="button" onClick={() => setNotice(`Đã mở tài liệu ${cert.document}.`)} className={`grid h-auto w-full gap-3 rounded-none border-0 px-4 py-4 pr-16 text-left shadow-none hover:bg-slate-50 lg:grid-cols-[1.4fr_1fr_100px_100px_120px_40px] lg:items-center lg:pr-4 ${showArchived ? 'bg-slate-50/70' : 'bg-white'}`}><div><p className="text-xs font-black text-slate-800">{cert.name}</p><p className="mt-1 text-caption text-slate-400">{cert.id} · {cert.type} · {cert.document}</p></div><div><p className="text-xs font-bold text-slate-600">{branchName(cert.branch)}</p><p className="mt-1 text-caption text-slate-400">{cert.owner}</p></div><p className="text-xs font-bold text-slate-600">{cert.issued}</p><p className="text-xs font-bold text-slate-600">{cert.expires}</p><span className={`w-fit rounded-full px-2 py-1 text-caption font-bold ring-1 ${certStatusMeta[cert.status].badge}`}>{certStatusMeta[cert.status].label}</span><span aria-hidden="true" /></button>
            {renderRecordActions({ kind: 'CERTIFICATE', id: cert.id, label: `hồ sơ ${cert.id}`, archived: Boolean(cert.archived) })}
          </div>) : <div className="flex flex-col items-center px-5 py-12 text-center"><Archive className="h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">{showArchived ? 'Chưa có hồ sơ nào được lưu trữ' : 'Không có hồ sơ phù hợp'}</p><p className="mt-1 text-xs text-slate-400">{showArchived ? 'Các hồ sơ đã lưu trữ sẽ xuất hiện tại đây.' : 'Thử thay đổi phạm vi hoặc từ khóa tìm kiếm.'}</p></div>}</div>
        </div>
        {!showArchived && <div className="mt-5 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl bg-violet-50 p-5"><p className="text-xs font-black text-violet-800">Đào tạo nhân sự</p><p className="mt-2 text-2xl font-black text-violet-900">18/20</p><p className="mt-1 text-xs text-violet-700">nhân sự hoàn tất kiểm soát nhiễm khuẩn</p></article><article className="rounded-2xl bg-emerald-50 p-5"><p className="text-xs font-black text-emerald-800">Kiểm tra nội bộ</p><p className="mt-2 text-2xl font-black text-emerald-900">96/100</p><p className="mt-1 text-xs text-emerald-700">điểm đánh giá tháng 07/2026</p></article><article className="rounded-2xl bg-amber-50 p-5"><p className="text-xs font-black text-amber-800">Kỳ kiểm tra tiếp theo</p><p className="mt-2 text-2xl font-black text-amber-900">05/08</p><p className="mt-1 text-xs text-amber-700">rà soát PCCC chi nhánh Quận 1</p></article></div>}
      </div>}
    </div></section>
    <section className="grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Thiết bị kiểm soát</h2><p className="mt-1 text-xs text-slate-400">Tình trạng hiệu chuẩn</p></div><Wrench className="h-5 w-5 text-violet-500" /></div><div className="mt-4 space-y-2">{[{ label: 'Autoclave MELAG 31B+', value: 'Đạt · 15/07' }, { label: 'Autoclave Euronda E9', value: 'Đạt · 15/07' }, { label: 'Máy rửa siêu âm', value: 'Đạt · 12/07' }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-bold text-slate-600">{item.label}</span><span className="text-xs font-black text-emerald-700">{item.value}</span></div>)}</div></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Nhân sự đủ chứng nhận</h2><p className="mt-1 text-xs text-slate-400">Theo yêu cầu công việc</p></div><UsersRound className="h-5 w-5 text-blue-500" /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xl font-black text-emerald-700">100%</p><p className="mt-1 text-caption font-bold text-emerald-600">Tiệt khuẩn</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-xl font-black text-blue-700">90%</p><p className="mt-1 text-caption font-bold text-blue-600">PCCC</p></div><div className="rounded-xl bg-violet-50 p-3"><p className="text-xl font-black text-violet-700">95%</p><p className="mt-1 text-caption font-bold text-violet-600">Sơ cứu</p></div></div></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Việc cần xử lý</h2><p className="mt-1 text-xs text-slate-400">Ưu tiên Tenant Admin</p></div><PackageCheck className="h-5 w-5 text-amber-500" /></div><div className="mt-3 divide-y divide-slate-100">{['Duyệt khắc phục ghế P-04', 'Bổ sung chữ ký checklist đóng ca', 'Gia hạn hồ sơ PCCC Quận 1'].map((item, index) => <button key={item} type="button" className="flex h-auto w-full items-center gap-3 rounded-none border-0 bg-white py-3 text-left shadow-none"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${index === 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span><span className="flex-1 text-xs font-bold text-slate-700">{item}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>)}</div></article></section>
    {selectedChecklist && (
      <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]">
        <button
          type="button"
          aria-label="Đóng chi tiết checklist"
          onClick={() => setSelectedChecklist(null)}
          className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        />
        <aside className="relative flex h-full w-full max-w-[540px] flex-col bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-caption font-black text-violet-600">
                  {selectedChecklist.id}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${
                    checklistStatusMeta[selectedChecklist.status].badge
                  }`}
                >
                  {checklistStatusMeta[selectedChecklist.status].label}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                {selectedChecklist.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {selectedChecklist.area} · {branchName(selectedChecklist.branch)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedChecklist(null)}
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-caption text-violet-400">Tiến độ</p>
                <p className="mt-1 text-lg font-black text-violet-800">
                  {selectedChecklist.completed}/{selectedChecklist.total}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-caption text-slate-400">Phụ trách</p>
                <p className="mt-1 text-xs font-black text-slate-800">
                  {selectedChecklist.assignee}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-caption text-amber-500">Hạn hoàn tất</p>
                <p className="mt-1 text-xs font-black text-amber-800">
                  {selectedChecklist.due}
                </p>
              </div>
            </div>

            <section className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-900">Nhiệm vụ & bằng chứng</h3>
                <span className="text-caption font-semibold text-slate-400">
                  Có thể hoàn tác từng mục
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {selectedChecklist.tasks.map((task, index) => (
                  <div
                    key={task.label}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                      task.done
                        ? 'border-emerald-100 bg-emerald-50/60'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        task.done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-amber-600 ring-1 ring-amber-200'
                      }`}
                    >
                      {task.done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-700">{task.label}</p>
                      <p className="mt-1 text-caption leading-4 text-slate-500">
                        Bằng chứng: {task.evidence}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleChecklistTask(selectedChecklist, index)}
                      disabled={!canManage}
                      aria-label={
                        task.done
                          ? `Hoàn tác ${task.label}`
                          : `Xác nhận ${task.label}`
                      }
                      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-caption font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                        task.done
                          ? 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700'
                          : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      {task.done ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {task.done ? 'Hoàn tác' : 'Xác nhận'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-2xl bg-violet-50 p-4">
              <p className="text-caption font-black uppercase tracking-wide text-violet-700">
                Ghi chú vận hành
              </p>
              <p className="mt-2 text-xs leading-5 text-violet-800">
                {selectedChecklist.note}
              </p>
            </section>
            <section className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <History className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs font-black text-slate-700">Nhật ký xác nhận</p>
                  <p className="mt-1 text-caption leading-5 text-slate-400">
                    Mọi mục được lưu người thực hiện, thời gian và bằng chứng. Tenant Admin
                    có thể hoàn tác từng mục hoặc mở lại checklist đã hoàn tất.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => openChecklistEdit(selectedChecklist)}
                disabled={!canManage}
                className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa checklist
              </button>
              {selectedChecklist.status === 'DONE' ? (
              <button
                type="button"
                onClick={() => reopenChecklist(selectedChecklist)}
                disabled={!canManage}
                className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                <RotateCcw className="h-4 w-4" />
                Mở lại checklist
              </button>
            ) : (
              <div className="flex h-11 items-center justify-between gap-3 rounded-xl bg-slate-200 px-3 sm:flex-1">
                <p className="text-caption font-semibold text-slate-500">
                  Còn {Math.max(0, selectedChecklist.total - selectedChecklist.completed)} mục
                  cần hoàn tất
                </p>
                <span className="flex items-center gap-2 text-xs font-black text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  Đang thực hiện
                </span>
              </div>
            )}
            </div>
          </div>
        </aside>
      </div>
    )}
    {selectedBatch && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"><button type="button" aria-label="Đóng chi tiết lô" onClick={() => setSelectedBatch(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><aside className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><span className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${batchStatusMeta[selectedBatch.status].badge}`}>{batchStatusMeta[selectedBatch.status].label}</span><h2 className="mt-3 text-xl font-black text-slate-900">{selectedBatch.id}</h2><p className="mt-1 text-xs text-slate-400">{selectedBatch.machine} · {branchName(selectedBatch.branch)}</p></div><button type="button" onClick={() => setSelectedBatch(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-5 sm:p-6"><section className={`rounded-2xl p-5 text-white ${selectedBatch.status === 'QUARANTINE' || selectedBatch.status === 'FAILED' ? 'bg-rose-950' : 'bg-slate-950'}`}><p className="text-caption uppercase tracking-wide text-slate-400">Thông số chu trình</p><div className="mt-4 grid grid-cols-3 gap-3"><div><Thermometer className="h-4 w-4 text-rose-300" /><p className="mt-2 text-xl font-black">{selectedBatch.temperature}°C</p><p className="mt-1 text-caption text-slate-400">Nhiệt độ</p></div><div><Gauge className="h-4 w-4 text-blue-300" /><p className="mt-2 text-xl font-black">{selectedBatch.pressure}</p><p className="mt-1 text-caption text-slate-400">Áp suất</p></div><div><PackageCheck className="h-4 w-4 text-emerald-300" /><p className="mt-2 text-xl font-black">{selectedBatch.items}</p><p className="mt-1 text-caption text-slate-400">Túi dụng cụ</p></div></div></section><div className="mt-5 grid grid-cols-2 gap-3">{[{ label: 'Chu trình', value: selectedBatch.cycle }, { label: 'Thời gian', value: `${selectedBatch.start} → ${selectedBatch.end}` }, { label: 'Chỉ thị hóa học', value: selectedBatch.indicator }, { label: 'Người vận hành', value: selectedBatch.operator }, { label: 'Người phát hành', value: selectedBatch.releasedBy }, { label: 'Chi nhánh', value: branchName(selectedBatch.branch) }].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 p-3"><p className="text-caption text-slate-400">{item.label}</p><p className="mt-1 text-xs font-black leading-5 text-slate-700">{item.value}</p></div>)}</div><section className={`mt-5 rounded-2xl p-4 ${selectedBatch.status === 'QUARANTINE' ? 'bg-rose-50' : 'bg-violet-50'}`}><p className={`text-xs font-black ${selectedBatch.status === 'QUARANTINE' ? 'text-rose-800' : 'text-violet-800'}`}>Kết luận lô</p><p className={`mt-2 text-xs leading-5 ${selectedBatch.status === 'QUARANTINE' ? 'text-rose-700' : 'text-violet-700'}`}>{selectedBatch.note}</p></section></div><div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><div className="flex gap-2"><button type="button" onClick={() => setNotice(`Đã mở nhãn in cho lô ${selectedBatch.id}.`)} className="flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm"><Printer className="h-4 w-4" />In nhãn lô</button><button type="button" onClick={() => releaseBatch(selectedBatch)} disabled={!canManage || selectedBatch.status !== 'RUNNING'} className="flex h-11 flex-1 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200"><BadgeCheck className="h-4 w-4" />Duyệt & phát hành</button></div></div></aside></div>}
    {selectedIncident && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"><button type="button" aria-label="Đóng chi tiết sự cố" onClick={() => setSelectedIncident(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><aside className="relative flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-caption font-bold ${severityMeta[selectedIncident.severity].badge}`}>Mức {severityMeta[selectedIncident.severity].label}</span><span className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${incidentStatusMeta[selectedIncident.status].badge}`}>{incidentStatusMeta[selectedIncident.status].label}</span></div><h2 className="mt-3 text-xl font-black text-slate-900">{selectedIncident.title}</h2><p className="mt-1 text-xs text-slate-400">{selectedIncident.id} · {selectedIncident.occurredAt}</p></div><button type="button" onClick={() => setSelectedIncident(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-5 sm:p-6"><div className="grid grid-cols-2 gap-3">{[{ label: 'Danh mục', value: selectedIncident.category }, { label: 'Khu vực', value: `${selectedIncident.area} · ${branchName(selectedIncident.branch)}` }, { label: 'Người báo cáo', value: selectedIncident.reporter }, { label: 'Người phụ trách', value: selectedIncident.owner }].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 p-3"><p className="text-caption text-slate-400">{item.label}</p><p className="mt-1 text-xs font-black text-slate-700">{item.value}</p></div>)}</div><section className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><p className="text-caption uppercase tracking-wide text-rose-300">Mô tả sự cố</p><p className="mt-2 text-sm leading-6 text-white">{selectedIncident.description}</p></section><div className="mt-5 space-y-3">{[{ label: 'Hành động tức thời', value: selectedIncident.immediateAction, icon: ShieldAlert, tone: 'bg-amber-50 text-amber-800' }, { label: 'Nguyên nhân gốc', value: selectedIncident.rootCause, icon: Search, tone: 'bg-blue-50 text-blue-800' }, { label: 'Hành động khắc phục', value: selectedIncident.correctiveAction, icon: Wrench, tone: 'bg-emerald-50 text-emerald-800' }].map(({ label, value, icon: Icon, tone }) => <section key={label} className={`rounded-2xl p-4 ${tone}`}><div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-xs font-black">{label}</p><p className="mt-2 text-xs leading-5 opacity-90">{value}</p></div></div></section>)}</div><div className="mt-5 rounded-xl border border-slate-200 p-3"><p className="text-caption text-slate-400">Hạn hoàn tất</p><p className="mt-1 text-xs font-black text-slate-700">{selectedIncident.dueDate}</p></div></div><div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><button type="button" onClick={() => resolveIncident(selectedIncident)} disabled={!canManage || selectedIncident.status === 'RESOLVED'} className="flex h-11 w-full items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200"><Check className="h-4 w-4" />Xác nhận đã khắc phục</button></div></aside></div>}
    {deleteTarget && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Đóng xác nhận xóa" onClick={() => setDeleteTarget(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
      <section role="dialog" aria-modal="true" aria-labelledby="delete-record-title" className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 className="h-5 w-5" /></span>
        <h2 id="delete-record-title" className="mt-4 text-lg font-black text-slate-900">Xóa vĩnh viễn bản ghi?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500"><span className="font-bold text-slate-700">{deleteTarget.label}</span> sẽ bị xóa khỏi hệ thống và không thể khôi phục. Nếu chỉ muốn làm gọn danh sách, hãy chọn Lưu trữ.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDeleteTarget(null)} className="h-11 border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm">Hủy</button><button type="button" onClick={permanentlyDeleteRecord} className="flex h-11 items-center justify-center gap-2 border border-rose-700 bg-rose-600 px-4 text-xs font-black text-white shadow-lg shadow-rose-200"><Trash2 className="h-4 w-4" />Xóa vĩnh viễn</button></div>
      </section>
    </div>}
    {checklistFormOpen && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Đóng biểu mẫu checklist"
          onClick={closeChecklistForm}
          className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        />
        <form
          onSubmit={submitChecklist}
          className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-6">
            <div>
              <p className="text-caption font-black uppercase tracking-wide text-violet-600">
                Checklist vệ sinh
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                {editingChecklist ? `Chỉnh sửa ${editingChecklist.id}` : 'Tạo checklist mới'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {editingChecklist
                  ? 'Thêm, đổi tên hoặc xóa nhiệm vụ; tiến độ sẽ được tính lại tự động.'
                  : 'Phân công nhiệm vụ, thời hạn và phạm vi thực hiện.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeChecklistForm}
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 sm:col-span-2">
                {formError}
              </div>
            )}
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Tên checklist *
              </span>
              <input
                value={checklistForm.title}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, title: event.target.value }))
                }
                className={inputClass}
                placeholder="Ví dụ: Kiểm tra vệ sinh mở ca"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Chi nhánh</span>
              <BeautifulSelect
                aria-label="Chi nhánh checklist"
                value={checklistForm.branch}
                onChange={(event) =>
                  setChecklistForm((current) => ({
                    ...current,
                    branch: event.target.value as BranchCode,
                  }))
                }
                className={inputClass}
              >
                <option value="Q1">Chi nhánh Quận 1</option>
                <option value="Q3">Chi nhánh Quận 3</option>
              </BeautifulSelect>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Ca thực hiện</span>
              <BeautifulSelect
                aria-label="Ca thực hiện checklist"
                value={checklistForm.shift}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, shift: event.target.value }))
                }
                className={inputClass}
              >
                <option>Mở ca</option>
                <option>Giữa ca</option>
                <option>Sau mỗi khách</option>
                <option>Đóng ca</option>
              </BeautifulSelect>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Khu vực *</span>
              <input
                value={checklistForm.area}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, area: event.target.value }))
                }
                className={inputClass}
                placeholder="Toàn chi nhánh hoặc khu vực cụ thể"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Hạn hoàn tất *
              </span>
              <input
                value={checklistForm.due}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, due: event.target.value }))
                }
                className={inputClass}
                placeholder="08:30 hôm nay"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Người phụ trách *
              </span>
              <input
                value={checklistForm.assignee}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, assignee: event.target.value }))
                }
                className={inputClass}
                placeholder="Tên nhân sự hoặc quản lý ca"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Danh sách nhiệm vụ *{' '}
                <span className="font-medium text-slate-400">(mỗi dòng một nhiệm vụ)</span>
              </span>
              <textarea
                aria-label="Danh sách nhiệm vụ"
                value={checklistForm.tasks}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, tasks: event.target.value }))
                }
                className="min-h-36 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                placeholder={'Khử khuẩn bề mặt tiếp xúc\nKiểm tra dung dịch sát khuẩn\nXác nhận dụng cụ đã đóng túi'}
              />
            </label>
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-body leading-5 text-blue-700 sm:col-span-2">
              <Gauge className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Tiến độ được tính tự động theo số nhiệm vụ đã xác nhận trên tổng số dòng.
                Nhiệm vụ mới thêm sẽ bắt đầu ở trạng thái chưa xác nhận.
              </p>
            </div>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Ghi chú vận hành
              </span>
              <textarea
                value={checklistForm.note}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, note: event.target.value }))
                }
                className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </label>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:px-6">
            <button
              type="button"
              onClick={closeChecklistForm}
              className="border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"
            >
              {editingChecklist ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              {editingChecklist ? 'Lưu thay đổi' : 'Tạo checklist'}
            </button>
          </div>
        </form>
      </div>
    )}
    {certificateFormOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu hồ sơ" onClick={() => setCertificateFormOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCertificate} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-6"><div><p className="text-caption font-black uppercase tracking-wide text-violet-600">Hồ sơ tuân thủ</p><h2 className="mt-1 text-lg font-black text-slate-900">Thêm hồ sơ & chứng nhận</h2><p className="mt-1 text-xs text-slate-500">Theo dõi hiệu lực, phạm vi và người chịu trách nhiệm.</p></div><button type="button" onClick={() => setCertificateFormOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 sm:col-span-2">{formError}</div>}<label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Tên hồ sơ *</span><input value={certificateForm.name} onChange={(event) => setCertificateForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="Ví dụ: Biên bản kiểm tra PCCC định kỳ" /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Loại hồ sơ</span><BeautifulSelect value={certificateForm.type} onChange={(event) => setCertificateForm((current) => ({ ...current, type: event.target.value }))} className={inputClass}>{['Cơ sở', 'PCCC', 'Chất thải', 'Đào tạo', 'Thiết bị', 'Hóa chất'].map((item) => <option key={item}>{item}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Phạm vi</span><BeautifulSelect value={certificateForm.branch} onChange={(event) => setCertificateForm((current) => ({ ...current, branch: event.target.value as BranchCode | 'ALL' }))} className={inputClass}><option value="ALL">Toàn tenant</option><option value="Q1">Chi nhánh Quận 1</option><option value="Q3">Chi nhánh Quận 3</option></BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Ngày cấp *</span><input type="date" value={certificateForm.issued} onChange={(event) => setCertificateForm((current) => ({ ...current, issued: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Ngày hết hạn *</span><input type="date" value={certificateForm.expires} onChange={(event) => setCertificateForm((current) => ({ ...current, expires: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Người phụ trách *</span><input value={certificateForm.owner} onChange={(event) => setCertificateForm((current) => ({ ...current, owner: event.target.value }))} className={inputClass} placeholder="Tên quản lý phụ trách gia hạn" /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Tên tệp tài liệu *</span><input value={certificateForm.document} onChange={(event) => setCertificateForm((current) => ({ ...current, document: event.target.value }))} className={inputClass} placeholder="chung-nhan-2026.pdf" /></label><div className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700 sm:col-span-2"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />Trạng thái hiệu lực được tính tự động theo ngày hết hạn và cảnh báo trước 30 ngày.</div></div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><button type="button" onClick={() => setCertificateFormOpen(false)} className="border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"><FileCheck2 className="h-4 w-4" />Lưu hồ sơ</button></div></form></div>}
    {incidentFormOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setIncidentFormOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitIncident} className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-6"><div><p className="text-caption font-black uppercase tracking-wide text-violet-600">{tenantName} · {roleLabel}</p><h2 className="mt-1 text-lg font-black text-slate-900">Ghi nhận sự cố an toàn</h2><p className="mt-1 text-xs text-slate-500">Lưu tình huống, mức độ, hành động tức thời và người xử lý.</p></div><button type="button" onClick={() => setIncidentFormOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 sm:col-span-2">{formError}</div>}<label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Tiêu đề sự cố *</span><input value={incidentForm.title} onChange={(event) => setIncidentForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="Mô tả ngắn gọn sự cố" /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Danh mục</span><BeautifulSelect value={incidentForm.category} onChange={(event) => setIncidentForm((current) => ({ ...current, category: event.target.value }))} className={inputClass}>{['Thiết bị & cơ sở vật chất', 'Tiệt khuẩn dụng cụ', 'PPE & vật tư an toàn', 'Hóa chất', 'Khách hàng & nhân sự'].map((item) => <option key={item}>{item}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Mức độ</span><BeautifulSelect value={incidentForm.severity} onChange={(event) => setIncidentForm((current) => ({ ...current, severity: event.target.value as IncidentSeverity }))} className={inputClass}><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option></BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Chi nhánh</span><BeautifulSelect value={incidentForm.branch} onChange={(event) => setIncidentForm((current) => ({ ...current, branch: event.target.value as BranchCode }))} className={inputClass}><option value="Q1">Chi nhánh Quận 1</option><option value="Q3">Chi nhánh Quận 3</option></BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Khu vực *</span><input value={incidentForm.area} onChange={(event) => setIncidentForm((current) => ({ ...current, area: event.target.value }))} className={inputClass} placeholder="Pedicure P-04" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Mô tả chi tiết *</span><textarea value={incidentForm.description} onChange={(event) => setIncidentForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Hành động tức thời *</span><textarea value={incidentForm.immediateAction} onChange={(event) => setIncidentForm((current) => ({ ...current, immediateAction: event.target.value }))} className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Người phụ trách xử lý</span><input value={incidentForm.owner} onChange={(event) => setIncidentForm((current) => ({ ...current, owner: event.target.value }))} className={inputClass} /></label></div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><button type="button" onClick={() => setIncidentFormOpen(false)} className="border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"><ShieldAlert className="h-4 w-4" />Ghi nhận sự cố</button></div></form></div>}
    {batchFormOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setBatchFormOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitBatch} className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><p className="text-caption font-black uppercase tracking-wide text-violet-600">Tiệt khuẩn dụng cụ</p><h2 className="mt-1 text-lg font-black text-slate-900">Bắt đầu chu trình mới</h2><p className="mt-1 text-xs text-slate-500">Ghi máy, chu trình, số lượng và người vận hành.</p></div><button type="button" onClick={() => setBatchFormOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 sm:col-span-2">{formError}</div>}<label><span className="mb-1.5 block text-xs font-bold text-slate-600">Chi nhánh</span><BeautifulSelect value={batchForm.branch} onChange={(event) => setBatchForm((current) => ({ ...current, branch: event.target.value as BranchCode }))} className={inputClass}><option value="Q1">Chi nhánh Quận 1</option><option value="Q3">Chi nhánh Quận 3</option></BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Máy tiệt khuẩn</span><BeautifulSelect value={batchForm.machine} onChange={(event) => setBatchForm((current) => ({ ...current, machine: event.target.value }))} className={inputClass}><option>Autoclave MELAG 31B+</option><option>Autoclave Euronda E9</option></BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Chu trình</span><BeautifulSelect value={batchForm.cycle} onChange={(event) => setBatchForm((current) => ({ ...current, cycle: event.target.value }))} className={inputClass}><option>B · 134°C · 5 phút</option><option>B · 121°C · 20 phút</option><option>Test Bowie-Dick</option></BeautifulSelect></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Số túi dụng cụ</span><input type="number" min="1" value={batchForm.items} onChange={(event) => setBatchForm((current) => ({ ...current, items: event.target.value }))} className={inputClass} /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Người vận hành *</span><input value={batchForm.operator} onChange={(event) => setBatchForm((current) => ({ ...current, operator: event.target.value }))} className={inputClass} /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Ghi chú</span><textarea value={batchForm.note} onChange={(event) => setBatchForm((current) => ({ ...current, note: event.target.value }))} className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label></div><div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><button type="button" onClick={() => setBatchFormOpen(false)} className="border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"><RefreshCcw className="h-4 w-4" />Bắt đầu chu trình</button></div></form></div>}
  </div>;
}
