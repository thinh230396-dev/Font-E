import BeautifulSelect from './BeautifulSelect';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileJson,
  Filter,
  Flame,
  Gauge,
  Globe2,
  HardDrive,
  History,
  Info,
  KeyRound,
  Layers3,
  LockKeyhole,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
  X,
  XCircle
} from 'lucide-react';
import {
  INITIAL_BACKUPS,
  INITIAL_BACKUP_POLICY,
  INITIAL_RESTORE_JOBS,
  loadLocalStorageData,
  saveLocalStorageData
} from '../data';
import type { BackupPolicy, BackupSnapshot, RestoreJob } from '../types';
import { recordAuditLog } from '../utils/auditLogs';
import { Modal, useToast } from './ui';

interface DataBackupProps {
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type PageTab = 'overview' | 'snapshots' | 'restores' | 'policy';
type SnapshotStatusFilter = 'ALL' | BackupSnapshot['status'];
type SnapshotTypeFilter = 'ALL' | BackupSnapshot['type'];
type IntegrityFilter = 'ALL' | BackupSnapshot['integrityStatus'];

const PAGE_SIZE = 7;
const BACKUPS_KEY = 'backups_v2';
const BACKUP_POLICY_KEY = 'backup_policy_v2';
const RESTORE_JOBS_KEY = 'restore_jobs_v2';

const STATUS_CONFIG: Record<BackupSnapshot['status'], { label: string; className: string; icon: ReactNode }> = {
  SUCCESS: { label: 'Thành công', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  FAILED: { label: 'Thất bại', className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400', icon: <XCircle className="h-3 w-3" /> },
  IN_PROGRESS: { label: 'Đang sao lưu...', className: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: <RefreshCw className="h-3 w-3 animate-spin" /> }
};

const INTEGRITY_CONFIG: Record<BackupSnapshot['integrityStatus'], { label: string; badgeClass: string; icon: ReactNode }> = {
  VERIFIED: { label: 'Đã xác minh SHA-256', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: <FileCheck2 className="h-3 w-3" /> },
  PENDING: { label: 'Chờ xác minh', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: <Clock className="h-3 w-3" /> },
  FAILED: { label: 'Lỗi checksum', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <AlertCircle className="h-3 w-3" /> }
};

const TYPE_CONFIG: Record<BackupSnapshot['type'], { label: string; badgeClass: string }> = {
  AUTO: { label: 'Tự động (Lịch)', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  MANUAL: { label: 'Thủ công (Admin)', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  PRE_RESTORE: { label: 'Trước phục hồi', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
};

const SCOPE_CONFIG: Record<BackupSnapshot['scope'], { label: string; desc: string }> = {
  FULL: { label: 'Toàn hệ thống', desc: 'CSDL + Tệp tải lên + Cấu hình + Audit Log' },
  DATABASE: { label: 'Cơ sở dữ liệu', desc: 'Bảng CSDL PostgreSQL, Khách hàng, Hóa đơn' },
  CONFIGURATION: { label: 'Cấu hình hệ thống', desc: 'Thiết lập tham số, phân quyền & bảo mật' }
};

const RETENTION_LABELS: Record<BackupSnapshot['retentionClass'], string> = {
  DAILY: 'Bản ngày (Daily)',
  WEEKLY: 'Bản tuần (Weekly)',
  MONTHLY: 'Bản tháng (Monthly)',
  MANUAL: 'Lưu thủ công (90 ngày)'
};

const RESTORE_STATUS_CONFIG: Record<RestoreJob['status'], { label: string; className: string; icon: ReactNode }> = {
  QUEUED: { label: 'Đang xếp hàng', className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted', icon: <Clock className="h-3 w-3" /> },
  VALIDATING: { label: 'Đang kiểm tra CSDL', className: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  RESTORING: { label: 'Đang nạp dữ liệu...', className: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  VERIFYING: { label: 'Đang xác minh toàn vẹn', className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  SUCCESS: { label: 'Hoàn tất thành công', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  FAILED: { label: 'Phục hồi thất bại', className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400', icon: <XCircle className="h-3 w-3" /> },
  CANCELLED: { label: 'Đã hủy', className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted', icon: <X className="h-3 w-3" /> }
};

const FREQUENCY_LABELS: Record<BackupPolicy['frequency'], string> = {
  EVERY_6_HOURS: 'Mỗi 6 giờ (4 lần/ngày)',
  DAILY: 'Hằng ngày (1 lần/ngày)',
  WEEKLY: 'Hằng tuần (1 lần/tuần)'
};

const WEEKDAY_LABELS: Record<BackupPolicy['weekday'], string> = {
  MONDAY: 'Thứ Hai', TUESDAY: 'Thứ Ba', WEDNESDAY: 'Thứ Tư', THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu', SATURDAY: 'Thứ Bảy', SUNDAY: 'Chủ Nhật'
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  const timePart = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
  return `${datePart} · ${timePart}`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatRelativeTime = (value?: string) => {
  if (!value) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return `${Math.floor(minutes / 1440)} ngày trước`;
};

const formatDuration = (seconds?: number) => {
  if (seconds === undefined) return '—';
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
};

const isImmutable = (snapshot: BackupSnapshot) => Boolean(snapshot.immutableUntil && new Date(snapshot.immutableUntil).getTime() > Date.now());

const getNextRun = (policy: BackupPolicy) => {
  if (!policy.enabled) return null;
  const now = new Date();
  if (policy.frequency === 'EVERY_6_HOURS') return new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const [hours, minutes] = policy.time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (policy.frequency === 'DAILY') {
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }
  const weekdays: BackupPolicy['weekday'][] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const targetDay = weekdays.indexOf(policy.weekday);
  let dayDiff = (targetDay - now.getDay() + 7) % 7;
  if (dayDiff === 0 && target <= now) dayDiff = 7;
  target.setDate(target.getDate() + dayDiff);
  return target;
};

const createId = (prefix: string) => `${prefix}-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const generateChecksum = () => `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

export default function DataBackup({ showConfirm }: DataBackupProps) {
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState<PageTab>('overview');
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => loadLocalStorageData(BACKUPS_KEY, INITIAL_BACKUPS));
  const [policy, setPolicy] = useState<BackupPolicy>(() => loadLocalStorageData(BACKUP_POLICY_KEY, INITIAL_BACKUP_POLICY));
  const [draftPolicy, setDraftPolicy] = useState<BackupPolicy>(policy);
  const [restoreJobs, setRestoreJobs] = useState<RestoreJob[]>(() => loadLocalStorageData(RESTORE_JOBS_KEY, INITIAL_RESTORE_JOBS));
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SnapshotStatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<SnapshotTypeFilter>('ALL');
  const [integrityFilter, setIntegrityFilter] = useState<IntegrityFilter>('ALL');
  const [page, setPage] = useState(1);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [manualScope, setManualScope] = useState<BackupSnapshot['scope']>('FULL');
  const [manualNote, setManualNote] = useState('');
  const [manualReplicate, setManualReplicate] = useState(true);
  const [runningBackupId, setRunningBackupId] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<RestoreJob['target']>('DR_SANDBOX');
  const [restoreMaintenance, setRestoreMaintenance] = useState(true);
  const [restorePreSnapshot, setRestorePreSnapshot] = useState(true);
  const [restoreNote, setRestoreNote] = useState('');
  const [restoreConfirmation, setRestoreConfirmation] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => saveLocalStorageData(BACKUPS_KEY, backups), [backups]);
  useEffect(() => saveLocalStorageData(BACKUP_POLICY_KEY, policy), [policy]);
  useEffect(() => saveLocalStorageData(RESTORE_JOBS_KEY, restoreJobs), [restoreJobs]);

  const selectedSnapshot = backups.find((snapshot) => snapshot.id === selectedSnapshotId) || null;
  const restoreSnapshot = backups.find((snapshot) => snapshot.id === restoreSnapshotId) || null;
  const successfulBackups = backups.filter((snapshot) => snapshot.status === 'SUCCESS');
  const latestSuccessful = [...successfulBackups].sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())[0];
  const latestFailure = [...backups].filter((snapshot) => snapshot.status === 'FAILED').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const nextRun = getNextRun(policy);
  const totalStorageBytes = successfulBackups.reduce((total, snapshot) => total + snapshot.sizeBytes, 0);
  const storageUsedGb = totalStorageBytes / (1024 ** 3);
  const verifiedRate = successfulBackups.length ? Math.round(successfulBackups.filter((snapshot) => snapshot.integrityStatus === 'VERIFIED').length / successfulBackups.length * 100) : 0;
  const rpoTargetHours = policy.frequency === 'EVERY_6_HOURS' ? 6 : policy.frequency === 'DAILY' ? 24 : 168;
  const latestBackupAgeHours = latestSuccessful
    ? Math.max(0, (Date.now() - new Date(latestSuccessful.completedAt || latestSuccessful.createdAt).getTime()) / 3600000)
    : Number.POSITIVE_INFINITY;

  const readinessChecks = [
    {
      label: 'Lịch sao lưu tự động',
      detail: policy.enabled ? `${FREQUENCY_LABELS[policy.frequency]} · kế tiếp ${nextRun ? formatDateTime(nextRun.toISOString()) : '—'}` : 'Đang tạm dừng',
      passed: policy.enabled,
      action: () => setActiveTab('policy'),
      actionLabel: 'Cấu hình lịch'
    },
    {
      label: `Điểm khôi phục trong RPO (${rpoTargetHours}h)`,
      detail: latestSuccessful ? `${latestSuccessful.id} · ${formatRelativeTime(latestSuccessful.completedAt || latestSuccessful.createdAt)}` : 'Chưa có bản sao lưu hoàn tất',
      passed: latestBackupAgeHours <= rpoTargetHours,
      action: () => setActiveTab('snapshots'),
      actionLabel: 'Xem snapshot'
    },
    {
      label: 'Xác minh toàn vẹn Checksum',
      detail: successfulBackups.length ? `${verifiedRate}% snapshot đã kiểm tra SHA-256` : 'Chưa có dữ liệu',
      passed: successfulBackups.length > 0 && verifiedRate === 100,
      action: () => { setIntegrityFilter('PENDING'); setActiveTab('snapshots'); },
      actionLabel: 'Kiểm tra ngay'
    },
    {
      label: 'Nhân bản đa vùng (Cross-Region)',
      detail: policy.crossRegionReplication ? `${policy.primaryRegion} → ${policy.replicaRegion}` : 'Chưa kích hoạt sao chép vùng dự phòng',
      passed: policy.crossRegionReplication,
      action: () => setActiveTab('policy'),
      actionLabel: 'Thiết lập vùng'
    }
  ];
  const readinessScore = Math.round(readinessChecks.filter((check) => check.passed).length / readinessChecks.length * 100);
  const readinessLabel = readinessScore === 100 ? 'Hệ thống an toàn & sẵn sàng phục hồi' : readinessScore >= 75 ? 'Khá an toàn · Cần lưu ý một số mục' : 'Nguy cơ · Cần hoàn thiện sao lưu';

  const filteredBackups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...backups]
      .filter((snapshot) => {
        const searchable = [snapshot.id, snapshot.filename, snapshot.initiatedBy, snapshot.note, snapshot.region].join(' ').toLowerCase();
        return (!query || searchable.includes(query))
          && (statusFilter === 'ALL' || snapshot.status === statusFilter)
          && (typeFilter === 'ALL' || snapshot.type === typeFilter)
          && (integrityFilter === 'ALL' || snapshot.integrityStatus === integrityFilter);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [backups, integrityFilter, searchQuery, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredBackups.length / PAGE_SIZE));
  const visibleBackups = filteredBackups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [integrityFilter, searchQuery, statusFilter, typeFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const copyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast(`Đã sao chép: ${text.slice(0, 20)}...`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const triggerManualBackup = (event: FormEvent) => {
    event.preventDefault();
    if (!manualNote.trim() || runningBackupId) return;
    const id = createId('BKP');
    const now = new Date();
    const filename = `salonsys_${manualScope.toLowerCase()}_${now.toISOString().replace(/[-:]/g, '').slice(0, 13)}.zst`;
    const components: BackupSnapshot['components'] = [
      { key: 'DATABASE', label: 'Cơ sở dữ liệu PostgreSQL đa tenant', status: manualScope === 'CONFIGURATION' ? 'SKIPPED' : 'INCLUDED', size: manualScope === 'CONFIGURATION' ? '0 B' : '319.4 MB', records: manualScope === 'CONFIGURATION' ? undefined : 1848750 },
      { key: 'OBJECT_STORAGE', label: 'Tệp hình ảnh & chứng từ tenant', status: manualScope === 'FULL' ? 'INCLUDED' : 'SKIPPED', size: manualScope === 'FULL' ? '128.4 MB' : '0 B', records: manualScope === 'FULL' ? 12908 : undefined },
      { key: 'SYSTEM_SETTINGS', label: 'Cấu hình hệ thống & gói cước', status: manualScope === 'DATABASE' ? 'SKIPPED' : 'INCLUDED', size: manualScope === 'DATABASE' ? '0 B' : '1.8 MB', records: manualScope === 'DATABASE' ? undefined : 48 },
      { key: 'AUDIT_LOGS', label: 'Nhật ký bảo mật & kiểm toán', status: manualScope === 'FULL' ? 'INCLUDED' : 'SKIPPED', size: manualScope === 'FULL' ? '34.5 MB' : '0 B', records: manualScope === 'FULL' ? 289110 : undefined }
    ];
    const newSnapshot: BackupSnapshot = {
      id, filename, size: 'Đang xử lý...', sizeBytes: 0, createdAt: now.toISOString(), status: 'IN_PROGRESS', type: 'MANUAL', scope: manualScope,
      storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: policy.primaryRegion,
      replicaRegion: manualReplicate ? policy.replicaRegion : undefined, encryption: 'AES-256-GCM', kmsKeyId: policy.kmsKeyId,
      checksum: 'Đang tính toán...', integrityStatus: 'PENDING', initiatedBy: 'superadmin@salonsys.vn', retentionClass: 'MANUAL',
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(), immutableUntil: new Date(Date.now() + policy.immutableDays * 86400000).toISOString(),
      note: manualNote.trim(), components
    };
    setBackups((current) => [newSnapshot, ...current]);
    setRunningBackupId(id);
    setBackupProgress(12);
    setShowBackupModal(false);
    setActiveTab('snapshots');
    recordAuditLog({
      eventCode: 'DATA.BACKUP.STARTED', event: 'Khởi chạy sao lưu thủ công',
      description: `Superadmin bắt đầu snapshot ${id} với phạm vi ${SCOPE_CONFIG[manualScope].label}.`, severity: 'medium', status: 'success', category: 'DATA',
      resource: `Snapshot ${id}`, resourceId: id, method: 'CLIENT /backups', metadata: { scope: manualScope, crossRegionReplication: manualReplicate, reason: manualNote.trim() }
    });

    let progress = 12;
    const interval = window.setInterval(() => {
      progress = Math.min(100, progress + 14);
      setBackupProgress(progress);
      if (progress >= 100) {
        window.clearInterval(interval);
        const completedAt = new Date().toISOString();
        const estimatedBytes = manualScope === 'FULL' ? 507301888 : manualScope === 'DATABASE' ? 334915174 : 1887437;
        setBackups((current) => current.map((snapshot) => snapshot.id === id ? {
          ...snapshot, status: 'SUCCESS', completedAt, sizeBytes: estimatedBytes,
          size: manualScope === 'FULL' ? '483.8 MB' : manualScope === 'DATABASE' ? '319.4 MB' : '1.8 MB',
          checksum: generateChecksum(), integrityStatus: policy.automaticVerification ? 'VERIFIED' : 'PENDING',
          verifiedAt: policy.automaticVerification ? completedAt : undefined, durationSeconds: 84
        } : snapshot));
        setRunningBackupId(null);
        setBackupProgress(0);
        setManualNote('');
        showToast(`Tạo thành công bản sao lưu ${id} (${manualScope === 'FULL' ? '483.8 MB' : '319.4 MB'})`);
        recordAuditLog({
          eventCode: 'DATA.BACKUP.COMPLETED', event: 'Hoàn tất sao lưu thủ công',
          description: `Snapshot ${id} đã hoàn tất và được lưu an toàn tại ${policy.primaryRegion}.`, severity: 'low', status: 'success', category: 'DATA',
          resource: `Snapshot ${id}`, resourceId: id, method: `CLIENT /backups/${id}`, metadata: { integrityVerified: policy.automaticVerification }
        });
      }
    }, 180);
  };

  const verifySnapshot = (snapshot: BackupSnapshot) => {
    if (snapshot.status !== 'SUCCESS' || snapshot.integrityStatus === 'PENDING') return;
    setBackups((current) => current.map((item) => item.id === snapshot.id ? { ...item, integrityStatus: 'PENDING' } : item));
    showToast(`Đang xác minh checksum SHA-256 cho ${snapshot.id}...`);
    window.setTimeout(() => {
      const verifiedAt = new Date().toISOString();
      setBackups((current) => current.map((item) => item.id === snapshot.id ? { ...item, integrityStatus: 'VERIFIED', verifiedAt } : item));
      showToast(`Đã xác minh tính toàn vẹn: ${snapshot.id} hợp lệ 100%.`);
      recordAuditLog({
        eventCode: 'DATA.BACKUP.VERIFIED', event: 'Xác minh tính toàn vẹn snapshot',
        description: `Checksum và manifest của ${snapshot.id} đã được xác minh thành công.`, severity: 'low', status: 'success', category: 'DATA',
        resource: `Snapshot ${snapshot.id}`, resourceId: snapshot.id, method: `CLIENT /backups/${snapshot.id}/verify`
      });
    }, 850);
  };

  const downloadManifest = (snapshot: BackupSnapshot) => {
    const manifest = JSON.stringify({
      id: snapshot.id, filename: snapshot.filename, createdAt: snapshot.createdAt, completedAt: snapshot.completedAt,
      scope: snapshot.scope, sizeBytes: snapshot.sizeBytes, checksum: snapshot.checksum, encryption: snapshot.encryption,
      kmsKeyId: snapshot.kmsKeyId, bucket: snapshot.bucket, region: snapshot.region, replicaRegion: snapshot.replicaRegion,
      integrityStatus: snapshot.integrityStatus, components: snapshot.components
    }, null, 2);
    const url = URL.createObjectURL(new Blob([manifest], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${snapshot.id}-manifest.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(`Đã tải xuống manifest của ${snapshot.id}`);
    recordAuditLog({
      eventCode: 'DATA.BACKUP.MANIFEST.DOWNLOADED', event: 'Tải manifest sao lưu',
      description: `Superadmin tải manifest của ${snapshot.id}.`, severity: 'medium', status: 'success', category: 'DATA',
      resource: `Snapshot ${snapshot.id}`, resourceId: snapshot.id, method: `CLIENT /backups/${snapshot.id}/manifest`
    });
  };

  const deleteSnapshot = (snapshot: BackupSnapshot) => {
    if (isImmutable(snapshot)) {
      showToast(`Không thể xóa: Bản sao lưu đang được khóa bất biến WORM chống ghi đè.`);
      return;
    }
    showConfirm('Xác nhận xóa bản sao lưu', `Bạn có chắc chắn muốn xóa vĩnh viễn ${snapshot.id}? Tất cả dữ liệu và bản sao liên vùng của snapshot này sẽ bị hủy bỏ.`, () => {
      setBackups((current) => current.filter((item) => item.id !== snapshot.id));
      if (selectedSnapshotId === snapshot.id) setSelectedSnapshotId(null);
      showToast(`Đã xóa snapshot ${snapshot.id}`);
      recordAuditLog({
        eventCode: 'DATA.BACKUP.DELETED', event: 'Xóa snapshot sao lưu',
        description: `Superadmin xóa snapshot ${snapshot.id}.`, severity: 'high', status: 'success', category: 'DATA',
        resource: `Snapshot ${snapshot.id}`, resourceId: snapshot.id, method: `CLIENT /backups/${snapshot.id}`
      });
    });
  };

  const openRestore = (snapshot: BackupSnapshot) => {
    setRestoreSnapshotId(snapshot.id);
    setRestoreTarget('DR_SANDBOX');
    setRestoreMaintenance(true);
    setRestorePreSnapshot(true);
    setRestoreNote('');
    setRestoreConfirmation('');
    setSelectedSnapshotId(null);
  };

  const requestRestore = (event: FormEvent) => {
    event.preventDefault();
    if (!restoreSnapshot || restoreConfirmation !== restoreSnapshot.id || !restoreNote.trim()) return;
    const execute = () => {
      const now = new Date().toISOString();
      const job: RestoreJob = {
        id: createId('RST'), snapshotId: restoreSnapshot.id, snapshotFilename: restoreSnapshot.filename, target: restoreTarget,
        status: 'VALIDATING', requestedAt: now, startedAt: now, requestedBy: 'superadmin@salonsys.vn', progress: 15,
        maintenanceMode: restoreTarget === 'PRODUCTION' ? restoreMaintenance : false,
        preRestoreSnapshot: restoreTarget === 'PRODUCTION' ? restorePreSnapshot : false,
        validationPassed: false, note: restoreNote.trim()
      };
      setRestoreJobs((current) => [job, ...current]);
      setRestoreSnapshotId(null);
      setActiveTab('restores');
      showToast(`Đang khởi tạo tiến trình phục hồi ${job.id}...`);
      recordAuditLog({
        eventCode: 'DATA.RESTORE.REQUESTED', event: 'Yêu cầu phục hồi dữ liệu',
        description: `Superadmin yêu cầu phục hồi ${restoreSnapshot.id} vào ${restoreTarget === 'PRODUCTION' ? 'Production' : 'DR Sandbox'}.`,
        severity: restoreTarget === 'PRODUCTION' ? 'high' : 'medium', status: 'success', category: 'DATA', resource: `Restore job ${job.id}`, resourceId: job.id,
        method: 'CLIENT /restore-jobs', metadata: { snapshotId: restoreSnapshot.id, target: restoreTarget, maintenanceMode: job.maintenanceMode, preRestoreSnapshot: job.preRestoreSnapshot }
      });

      window.setTimeout(() => setRestoreJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'RESTORING', validationPassed: true, progress: 48 } : item)), 600);
      window.setTimeout(() => setRestoreJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'VERIFYING', progress: 85 } : item)), 1200);
      window.setTimeout(() => {
        const completedAt = new Date().toISOString();
        setRestoreJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'SUCCESS', progress: 100, completedAt } : item));
        showToast(`Phục hồi ${job.id} vào ${restoreTarget === 'PRODUCTION' ? 'Production' : 'DR Sandbox'} thành công 100%!`);
        recordAuditLog({
          eventCode: 'DATA.RESTORE.COMPLETED', event: 'Hoàn tất phục hồi dữ liệu',
          description: `Restore job ${job.id} đã hoàn tất trong môi trường ${restoreTarget}.`, severity: 'medium', status: 'success', category: 'DATA',
          resource: `Restore job ${job.id}`, resourceId: job.id, method: `CLIENT /restore-jobs/${job.id}`
        });
      }, 1800);
    };

    showConfirm(
      restoreTarget === 'PRODUCTION' ? '⚠️ XÁC NHẬN PHỤC HỒI PRODUCTION' : 'Xác nhận diễn tập khôi phục Sandbox',
      restoreTarget === 'PRODUCTION'
        ? `CẢNH BÁO: Dữ liệu hiện tại trên Production sẽ được thay thế bằng bản snapshot ${restoreSnapshot.id}. Hệ thống sẽ kích hoạt bảo trì tạm thời.`
        : `Môi trường DR Sandbox độc lập sẽ được khởi tạo từ bản sao lưu ${restoreSnapshot.id}. Dữ liệu các tiệm đang chạy không bị ảnh hưởng.`,
      execute
    );
  };

  const savePolicy = () => {
    if (!draftPolicy.encryptionEnabled || !draftPolicy.kmsKeyId.trim()) return;
    const nextPolicy: BackupPolicy = { ...draftPolicy, updatedAt: new Date().toISOString(), updatedBy: 'superadmin@salonsys.vn' };
    const changes = Object.entries(nextPolicy)
      .filter(([key, value]) => value !== policy[key as keyof BackupPolicy] && !['updatedAt', 'updatedBy'].includes(key))
      .slice(0, 12)
      .map(([field, value]) => ({ field, before: String(policy[field as keyof BackupPolicy]), after: String(value) }));
    setPolicy(nextPolicy);
    setDraftPolicy(nextPolicy);
    recordAuditLog({
      eventCode: 'DATA.BACKUP.POLICY.UPDATED', event: 'Cập nhật chính sách sao lưu',
      description: `Superadmin cập nhật ${changes.length} thiết lập trong chính sách backup.`, severity: 'high', status: 'success', category: 'DATA',
      resource: 'Chính sách sao lưu hệ thống', resourceId: 'BACKUP-POLICY', method: 'CLIENT /backup-policy', changes
    });
    showToast('Đã lưu thành công chính sách sao lưu và cập nhật lịch tự động.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-inner">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-brand-text">Sao lưu & Phục hồi dữ liệu</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Bảo vệ tự động 24/7
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-brand-text-muted leading-relaxed max-w-3xl">
              Quản lý các điểm khôi phục (Snapshots), bảo vệ CSDL đa chi nhánh, thiết lập lịch tự động và diễn tập phục hồi sự cố không làm gián đoạn dịch vụ.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              if (latestSuccessful) openRestore(latestSuccessful);
              else showToast('Chưa có bản sao lưu nào để diễn tập');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high px-4 py-2.5 text-xs font-bold text-brand-text hover:bg-brand-surface-highest transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-brand-primary" />
            <span>Diễn tập phục hồi</span>
          </button>
          <button
            onClick={() => setShowBackupModal(true)}
            disabled={Boolean(runningBackupId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-primary/90 transition-all disabled:opacity-60"
          >
            {runningBackupId ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Đang sao lưu {backupProgress}%</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Tạo bản sao lưu ngay</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-brand-outline/30">
        {[
          { id: 'overview', label: 'Tổng quan & Sẵn sàng DR', icon: Gauge, count: `${readinessScore}%` },
          { id: 'snapshots', label: 'Kho bản sao lưu', icon: Archive, count: backups.length },
          { id: 'restores', label: 'Lịch sử phục hồi', icon: History, count: restoreJobs.length },
          { id: 'policy', label: 'Chính sách & Lịch tự động', icon: Settings2, count: policy.enabled ? 'Đang bật' : 'Tắt' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PageTab)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-brand-surface text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high border border-brand-outline/30'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-brand-surface-high text-brand-text-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">Bản mới nhất</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xl sm:text-2xl font-black text-brand-text">
                {latestSuccessful ? formatRelativeTime(latestSuccessful.completedAt) : 'Chưa có'}
              </p>
              <p className="mt-1 text-xs text-brand-text-muted truncate" title={latestSuccessful?.id}>
                {latestSuccessful ? `${latestSuccessful.id} · ${latestSuccessful.size}` : 'Chưa ghi nhận bản hoàn tất'}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">Lịch sao lưu kế</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <CalendarClock className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xl sm:text-2xl font-black text-brand-text">
                {nextRun ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(nextRun) : 'Đang tắt'}
              </p>
              <p className="mt-1 text-xs text-brand-text-muted">
                {nextRun ? `${formatDate(nextRun.toISOString())} · ${FREQUENCY_LABELS[policy.frequency]}` : 'Lịch tự động tạm ngưng'}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">Tính toàn vẹn (SHA-256)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileCheck2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xl sm:text-2xl font-black text-brand-text">
                {verifiedRate}%
              </p>
              <p className="mt-1 text-xs text-brand-text-muted">
                {successfulBackups.filter(s => s.integrityStatus === 'VERIFIED').length}/{successfulBackups.length} snapshot đã xác minh
              </p>
            </div>

            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">Dung lượng lưu trữ</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xl sm:text-2xl font-black text-brand-text">
                {storageUsedGb.toFixed(1)} GB
              </p>
              <p className="mt-1 text-xs text-brand-text-muted">
                Kho Google Cloud Storage ({policy.primaryRegion})
              </p>
            </div>
          </div>

          {/* Readiness Assessment & Action Center */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Health Checklist */}
            <div className="lg:col-span-2 rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brand-outline/25 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    readinessScore === 100 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-brand-text">Đánh giá khả năng sẵn sàng phục hồi</h2>
                    <p className="text-xs text-brand-text-muted">{readinessLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-brand-primary">{readinessScore}%</span>
                  <span className="text-xs text-brand-text-muted">({readinessChecks.filter(c => c.passed).length}/4 tiêu chuẩn)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {readinessChecks.map((check) => (
                  <div
                    key={check.label}
                    onClick={check.action}
                    className="group cursor-pointer rounded-xl border border-brand-outline/30 bg-brand-surface-high/30 p-3.5 hover:bg-brand-surface-high/70 transition-all flex items-start gap-3"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-brand-text">{check.label}</p>
                        <span className="text-[10px] font-semibold text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          {check.actionLabel} →
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-brand-text-muted leading-relaxed">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 4 Steps Visual Flow */}
              <div className="pt-2 border-t border-brand-outline/20">
                <p className="text-xs font-bold text-brand-text uppercase tracking-wider text-brand-text-muted mb-3">
                  Quy trình bảo vệ & phục hồi chuẩn quốc tế
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { step: '1', title: 'Tạo Snapshot', desc: 'Mã hóa AES-256', icon: Database },
                    { step: '2', title: 'Xác minh Checksum', desc: 'Đối chiếu SHA-256', icon: FileCheck2 },
                    { step: '3', title: 'Lưu trữ WORM', desc: 'Khóa chống Ransomware', icon: LockKeyhole },
                    { step: '4', title: 'Diễn tập DR', desc: 'Sandbox an toàn', icon: RotateCcw }
                  ].map((s) => {
                    const StepIcon = s.icon;
                    return (
                      <div key={s.step} className="rounded-xl border border-brand-outline/25 bg-brand-surface-lowest/40 p-3 text-center">
                        <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary mb-2">
                          <StepIcon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-xs font-bold text-brand-text">{s.step}. {s.title}</p>
                        <p className="text-[10px] text-brand-text-muted mt-0.5">{s.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Security Status Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <LockKeyhole className="h-4 w-4 text-brand-primary" />
                  <h3 className="text-sm font-extrabold text-brand-text">Tham số RPO & RTO mục tiêu</h3>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-brand-outline/20">
                    <span className="text-brand-text-muted">RPO (Mất dữ liệu tối đa)</span>
                    <strong className="text-brand-text font-mono">{rpoTargetHours} giờ</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-outline/20">
                    <span className="text-brand-text-muted">RTO (Thời gian phục hồi)</span>
                    <strong className="text-brand-text font-mono">&lt; 60 phút</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-outline/20">
                    <span className="text-brand-text-muted">Mã hóa dữ liệu</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">AES-256-GCM (KMS)</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-outline/20">
                    <span className="text-brand-text-muted">Khóa WORM (Bất biến)</span>
                    <strong className="text-brand-text">{policy.immutableDays} ngày</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-brand-text-muted">Vùng sao lưu</span>
                    <strong className="text-brand-text">{policy.primaryRegion}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('policy')}
                  className="w-full rounded-xl border border-brand-outline/40 bg-brand-surface-high px-3 py-2 text-xs font-bold text-brand-text hover:bg-brand-surface-highest transition-colors"
                >
                  Điều chỉnh chính sách bảo vệ
                </button>
              </div>

              {latestFailure && (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold">Bản sao lưu gặp sự cố</span>
                  </div>
                  <p className="text-xs text-brand-text-muted">{latestFailure.id}: {latestFailure.failureReason}</p>
                  <button
                    onClick={() => { setStatusFilter('FAILED'); setActiveTab('snapshots'); }}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Xem chi tiết sự cố →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Backups Table snippet */}
          <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-brand-text">Các điểm khôi phục gần nhất</h3>
                <p className="text-xs text-brand-text-muted">Snapshot mới nhất sẵn sàng cho việc phục hồi hoặc tải về</p>
              </div>
              <button
                onClick={() => setActiveTab('snapshots')}
                className="text-xs font-bold text-brand-primary hover:underline"
              >
                Xem tất cả ({backups.length}) →
              </button>
            </div>

            <div className="divide-y divide-brand-outline/20">
              {backups.slice(0, 4).map((snapshot) => (
                <div
                  key={snapshot.id}
                  onClick={() => setSelectedSnapshotId(snapshot.id)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-brand-surface-high/30 px-3 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      snapshot.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {snapshot.status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-text">{snapshot.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${TYPE_CONFIG[snapshot.type].badgeClass}`}>
                          {TYPE_CONFIG[snapshot.type].label}
                        </span>
                      </div>
                      <p className="text-xs text-brand-text-muted truncate mt-0.5">{snapshot.filename} · {snapshot.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-brand-text-muted">{formatDateTime(snapshot.createdAt)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedSnapshotId(snapshot.id); }}
                      className="px-2.5 py-1 rounded-lg border border-brand-outline/40 bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-surface-high"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SNAPSHOTS (KHO BẢN SAO LƯU) */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm mã snapshot, tên file, ghi chú..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <BeautifulSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as SnapshotStatusFilter)}
                  className="text-xs"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="SUCCESS">Thành công</option>
                  <option value="FAILED">Thất bại</option>
                  <option value="IN_PROGRESS">Đang chạy</option>
                </BeautifulSelect>

                <BeautifulSelect
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as SnapshotTypeFilter)}
                  className="text-xs"
                >
                  <option value="ALL">Mọi loại sao lưu</option>
                  <option value="AUTO">Tự động (Lịch)</option>
                  <option value="MANUAL">Thủ công</option>
                  <option value="PRE_RESTORE">Trước phục hồi</option>
                </BeautifulSelect>

                <BeautifulSelect
                  value={integrityFilter}
                  onChange={(e) => setIntegrityFilter(e.target.value as IntegrityFilter)}
                  className="text-xs"
                >
                  <option value="ALL">Mọi kiểm tra toàn vẹn</option>
                  <option value="VERIFIED">Đã xác minh SHA-256</option>
                  <option value="PENDING">Chờ xác minh</option>
                  <option value="FAILED">Lỗi Checksum</option>
                </BeautifulSelect>
              </div>
            </div>

            {/* Quick Filter Tags */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-brand-text-muted text-[11px] font-semibold mr-1">Lọc nhanh:</span>
              <button
                onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setIntegrityFilter('ALL'); setSearchQuery(''); }}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  statusFilter === 'ALL' && typeFilter === 'ALL' && integrityFilter === 'ALL' && !searchQuery
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-brand-surface-high text-brand-text-muted border-brand-outline/30 hover:text-brand-text'
                }`}
              >
                Tất cả ({backups.length})
              </button>
              <button
                onClick={() => setTypeFilter('AUTO')}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  typeFilter === 'AUTO' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-high text-brand-text-muted border-brand-outline/30 hover:text-brand-text'
                }`}
              >
                Tự động ({backups.filter(b => b.type === 'AUTO').length})
              </button>
              <button
                onClick={() => setTypeFilter('MANUAL')}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  typeFilter === 'MANUAL' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface-high text-brand-text-muted border-brand-outline/30 hover:text-brand-text'
                }`}
              >
                Thủ công ({backups.filter(b => b.type === 'MANUAL').length})
              </button>
              <button
                onClick={() => setIntegrityFilter('PENDING')}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  integrityFilter === 'PENDING' ? 'bg-amber-500 text-white border-amber-500' : 'bg-brand-surface-high text-brand-text-muted border-brand-outline/30 hover:text-brand-text'
                }`}
              >
                Cần xác minh ({backups.filter(b => b.integrityStatus === 'PENDING').length})
              </button>
            </div>
          </div>

          {/* Snapshots Table */}
          <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-outline/30 bg-brand-surface-lowest/60 text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">
                    <th className="py-3 px-4">Mã & Tên Snapshot</th>
                    <th className="py-3 px-4">Thời gian tạo</th>
                    <th className="py-3 px-4">Phạm vi</th>
                    <th className="py-3 px-4">Dung lượng</th>
                    <th className="py-3 px-4">Toàn vẹn SHA-256</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-center w-36 min-w-[130px] whitespace-nowrap">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline/20">
                  {visibleBackups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-text-muted">
                        <Archive className="mx-auto h-8 w-8 text-brand-text-muted/40 mb-2" />
                        <p className="font-bold text-brand-text">Không tìm thấy bản sao lưu nào</p>
                        <p className="text-[11px] mt-1">Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc</p>
                      </td>
                    </tr>
                  ) : (
                    visibleBackups.map((snapshot) => {
                      const isLocked = isImmutable(snapshot);
                      return (
                        <tr
                          key={snapshot.id}
                          className="hover:bg-brand-surface-high/30 transition-colors cursor-pointer group"
                          onClick={() => setSelectedSnapshotId(snapshot.id)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-brand-primary group-hover:underline">
                                    {snapshot.id}
                                  </span>
                                  {isLocked && (
                                    <span title={`Khóa bất biến WORM đến ${formatDateTime(snapshot.immutableUntil)}`}>
                                      <LockKeyhole className="h-3 w-3 text-violet-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-brand-text-muted truncate max-w-[200px]" title={snapshot.filename}>
                                  {snapshot.filename}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-brand-text">{formatDateTime(snapshot.createdAt)}</p>
                            <p className="text-[10px] text-brand-text-muted">{formatRelativeTime(snapshot.createdAt)}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-brand-text">{SCOPE_CONFIG[snapshot.scope].label}</span>
                            <span className={`block mt-0.5 text-[10px] font-medium w-fit px-1.5 py-0.2 rounded border ${TYPE_CONFIG[snapshot.type].badgeClass}`}>
                              {TYPE_CONFIG[snapshot.type].label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-text">
                            {snapshot.size}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${INTEGRITY_CONFIG[snapshot.integrityStatus].badgeClass}`}>
                                {INTEGRITY_CONFIG[snapshot.integrityStatus].icon}
                                {INTEGRITY_CONFIG[snapshot.integrityStatus].label}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[snapshot.status].className}`}>
                              {STATUS_CONFIG[snapshot.status].icon}
                              {STATUS_CONFIG[snapshot.status].label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center w-36 min-w-[130px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap whitespace-nowrap">
                              <button
                                onClick={() => setSelectedSnapshotId(snapshot.id)}
                                title="Xem chi tiết & thành phần"
                                className="h-7 w-7 rounded-lg border border-brand-outline/35 bg-brand-surface-high hover:bg-brand-surface-highest text-brand-text flex items-center justify-center transition-colors shrink-0"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => downloadManifest(snapshot)}
                                title="Tải file Manifest JSON"
                                className="h-7 w-7 rounded-lg border border-brand-outline/35 bg-brand-surface-high hover:bg-brand-surface-highest text-brand-text flex items-center justify-center transition-colors shrink-0"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {snapshot.status === 'SUCCESS' ? (
                                <button
                                  onClick={() => openRestore(snapshot)}
                                  title="Khởi tạo phục hồi / Diễn tập"
                                  className="h-7 w-7 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm flex items-center justify-center transition-colors shrink-0"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <div className="h-7 w-7 shrink-0" aria-hidden="true" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-brand-outline/25 bg-brand-surface-lowest/30">
              <span className="text-xs text-brand-text-muted">
                Hiển thị trang <strong>{page}</strong> trên <strong>{pageCount}</strong> (Tổng cộng {filteredBackups.length} snapshot)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-brand-outline/35 bg-brand-surface text-brand-text disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-xs font-mono font-bold text-brand-text">
                  {page} / {pageCount}
                </span>
                <button
                  disabled={page === pageCount}
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  className="p-1.5 rounded-lg border border-brand-outline/35 bg-brand-surface text-brand-text disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESTORES & DR DRILLS (PHỤC HỒI & DIỄN TẬP) */}
      {activeTab === 'restores' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-sm font-extrabold">Diễn tập DR Sandbox (Khuyến nghị định kỳ)</h3>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Tạo một môi trường CSDL cô lập từ Snapshot để kiểm tra tính toàn vẹn và đo lường thời gian khôi phục (RTO). Hoàn toàn <strong>không ảnh hưởng đến tiệm đang hoạt động</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-extrabold">Phục hồi Production (Khi có sự cố thực tế)</h3>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Ghi đè CSDL hệ thống về thời điểm của Snapshot. Yêu cầu bật chế độ bảo trì, tạo snapshot an toàn ngay trước khi chạy và nhập mã xác nhận chính xác.
              </p>
            </div>
          </div>

          {/* Restore Jobs Table */}
          <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface shadow-sm overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-brand-text">Nhật ký tiến trình phục hồi & diễn tập</h2>
                <p className="text-xs text-brand-text-muted">Theo dõi thời gian, tiến độ và kết quả của từng đợt khôi phục dữ liệu</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-outline/30 bg-brand-surface-lowest/60 text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">
                    <th className="py-3 px-4">Mã Restore Job</th>
                    <th className="py-3 px-4">Snapshot nguồn</th>
                    <th className="py-3 px-4">Môi trường đích</th>
                    <th className="py-3 px-4">Tiến độ thực hiện</th>
                    <th className="py-3 px-4">Người yêu cầu & Ghi chú</th>
                    <th className="py-3 px-4">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline/20">
                  {restoreJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-brand-surface-high/20">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-brand-primary">{job.id}</span>
                        <p className="text-[10px] text-brand-text-muted">{formatDateTime(job.requestedAt)}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-brand-text">{job.snapshotId}</span>
                        <p className="text-[10px] text-brand-text-muted truncate max-w-[180px]">{job.snapshotFilename}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          job.target === 'PRODUCTION'
                            ? 'bg-red-500/10 text-red-600 border-red-500/25'
                            : 'bg-sky-500/10 text-sky-600 border-sky-500/25'
                        }`}>
                          {job.target === 'PRODUCTION' ? 'Production' : 'DR Sandbox'}
                        </span>
                        <p className="text-[10px] text-brand-text-muted mt-0.5">
                          {job.maintenanceMode ? 'Có bảo trì' : 'Không downtime'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-36">
                          <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span>{job.progress}%</span>
                            <span className="text-brand-text-muted">{job.validationPassed ? 'Đã kiểm tra' : 'Đang xử lý'}</span>
                          </div>
                          <div className="h-2 rounded-full bg-brand-surface-highest overflow-hidden">
                            <div
                              style={{ width: `${job.progress}%` }}
                              className={`h-full transition-all duration-300 ${
                                job.status === 'FAILED' ? 'bg-red-500' : 'bg-brand-primary'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-brand-text">{job.requestedBy}</p>
                        <p className="text-[10px] text-brand-text-muted italic truncate max-w-[200px]">{job.note}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${RESTORE_STATUS_CONFIG[job.status].className}`}>
                          {RESTORE_STATUS_CONFIG[job.status].icon}
                          {RESTORE_STATUS_CONFIG[job.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: POLICY & SETTINGS (CHÍNH SÁCH SAO LƯU & TỰ ĐỘNG HÓA) */}
      {activeTab === 'policy' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Automated Schedule Card */}
            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-brand-outline/25 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">Lịch sao lưu tự động hệ thống</h3>
                  <p className="text-xs text-brand-text-muted">Thiết lập tần suất và thời gian thực hiện tự động của Cron Job</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-text bg-brand-surface-high px-3 py-1.5 rounded-xl border border-brand-outline/30">
                  <input
                    type="checkbox"
                    checked={draftPolicy.enabled}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, enabled: e.target.checked })}
                    className="h-4 w-4 accent-brand-primary rounded"
                  />
                  <span>{draftPolicy.enabled ? 'Đang kích hoạt' : 'Đã tạm dừng'}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Tần suất sao lưu</label>
                  <BeautifulSelect
                    value={draftPolicy.frequency}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, frequency: e.target.value as BackupPolicy['frequency'] })}
                    className="w-full text-xs"
                  >
                    <option value="EVERY_6_HOURS">Mỗi 6 giờ (4 lần/ngày - RPO 6h)</option>
                    <option value="DAILY">Hằng ngày (1 lần/ngày lúc đêm)</option>
                    <option value="WEEKLY">Hằng tuần (Vào cuối tuần)</option>
                  </BeautifulSelect>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Thời gian thực hiện (UTC+7)</label>
                  <input
                    type="time"
                    value={draftPolicy.time}
                    disabled={draftPolicy.frequency === 'EVERY_6_HOURS'}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high text-xs text-brand-text focus:outline-none focus:border-brand-primary disabled:opacity-50"
                  />
                </div>

                {draftPolicy.frequency === 'WEEKLY' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Ngày chạy trong tuần</label>
                    <BeautifulSelect
                      value={draftPolicy.weekday}
                      onChange={(e) => setDraftPolicy({ ...draftPolicy, weekday: e.target.value as BackupPolicy['weekday'] })}
                      className="w-full text-xs"
                    >
                      {Object.entries(WEEKDAY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </BeautifulSelect>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Múi giờ hệ thống</label>
                  <BeautifulSelect
                    value={draftPolicy.timezone}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, timezone: e.target.value })}
                    className="w-full text-xs"
                  >
                    <option value="Asia/Ho_Chi_Minh">Việt Nam · Asia/Ho_Chi_Minh (UTC+7)</option>
                    <option value="UTC">Giờ Quốc tế · UTC (GMT+0)</option>
                    <option value="Asia/Singapore">Singapore · Asia/Singapore (UTC+8)</option>
                  </BeautifulSelect>
                </div>
              </div>
            </div>

            {/* Retention & WORM Policy */}
            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-brand-outline/25 pb-4">
                <h3 className="text-base font-extrabold text-brand-text">Chính sách lưu giữ GFS & Khóa bất biến WORM</h3>
                <p className="text-xs text-brand-text-muted">Quản lý vòng đời snapshot (Grandfather-Father-Son) và bảo vệ chống Ransomware</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1">Bản ngày (Daily)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={draftPolicy.dailyRetention}
                      onChange={(e) => setDraftPolicy({ ...draftPolicy, dailyRetention: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded-lg border border-brand-outline/40 bg-brand-surface font-mono font-bold text-sm text-brand-text"
                    />
                    <span className="text-xs text-brand-text-muted">ngày</span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-1.5">Lưu 7 ngày gần nhất</p>
                </div>

                <div className="p-3.5 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1">Bản tuần (Weekly)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={draftPolicy.weeklyRetention}
                      onChange={(e) => setDraftPolicy({ ...draftPolicy, weeklyRetention: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded-lg border border-brand-outline/40 bg-brand-surface font-mono font-bold text-sm text-brand-text"
                    />
                    <span className="text-xs text-brand-text-muted">tuần</span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-1.5">Lưu 4 tuần trong tháng</p>
                </div>

                <div className="p-3.5 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1">Bản tháng (Monthly)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={draftPolicy.monthlyRetention}
                      onChange={(e) => setDraftPolicy({ ...draftPolicy, monthlyRetention: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded-lg border border-brand-outline/40 bg-brand-surface font-mono font-bold text-sm text-brand-text"
                    />
                    <span className="text-xs text-brand-text-muted">tháng</span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-1.5">Lưu 12 tháng gần nhất</p>
                </div>

                <div className="p-3.5 rounded-xl border border-violet-500/25 bg-violet-500/5">
                  <label className="block text-[11px] font-bold uppercase text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1">
                    <LockKeyhole className="h-3 w-3" /> Khóa WORM
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={draftPolicy.immutableDays}
                      onChange={(e) => setDraftPolicy({ ...draftPolicy, immutableDays: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded-lg border border-violet-500/40 bg-brand-surface font-mono font-bold text-sm text-brand-text"
                    />
                    <span className="text-xs text-brand-text-muted">ngày</span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-1.5">Không thể xóa trong N ngày</p>
                </div>
              </div>
            </div>

            {/* Cloud Storage & Multi-Region */}
            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-brand-outline/25 pb-4">
                <h3 className="text-base font-extrabold text-brand-text">Hạ tầng đám mây & Bảo mật KMS</h3>
                <p className="text-xs text-brand-text-muted">Mã hóa đối xứng AES-256 và nhân bản sang vùng thảm họa dự phòng</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Vùng lưu trữ chính</label>
                  <BeautifulSelect
                    value={draftPolicy.primaryRegion}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, primaryRegion: e.target.value })}
                    className="w-full text-xs"
                  >
                    <option value="asia-southeast1">Singapore · asia-southeast1 (Chính)</option>
                    <option value="asia-east1">Taiwan · asia-east1</option>
                    <option value="asia-northeast1">Tokyo · asia-northeast1</option>
                  </BeautifulSelect>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Vùng dự phòng thảm họa (Replica)</label>
                  <BeautifulSelect
                    value={draftPolicy.replicaRegion}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, replicaRegion: e.target.value })}
                    className="w-full text-xs"
                  >
                    <option value="asia-east1">Taiwan · asia-east1 (Khuyến nghị)</option>
                    <option value="asia-northeast1">Tokyo · asia-northeast1</option>
                    <option value="asia-southeast1">Singapore · asia-southeast1</option>
                  </BeautifulSelect>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Khóa Cloud KMS Key ARN</label>
                  <input
                    type="text"
                    value={draftPolicy.kmsKeyId}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, kmsKeyId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high font-mono text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-brand-text">Sao chép liên vùng tự động</p>
                    <p className="text-[10px] text-brand-text-muted">Nhân bản snapshot sang vùng dự phòng</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftPolicy.crossRegionReplication}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, crossRegionReplication: e.target.checked })}
                    className="h-4 w-4 accent-brand-primary rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-brand-text">Tự động xác minh Checksum</p>
                    <p className="text-[10px] text-brand-text-muted">Kiểm tra SHA-256 ngay khi tạo xong</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftPolicy.automaticVerification}
                    onChange={(e) => setDraftPolicy({ ...draftPolicy, automaticVerification: e.target.checked })}
                    className="h-4 w-4 accent-brand-primary rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Policy Summary Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-brand-text flex items-center gap-2">
                <Save className="h-4 w-4 text-brand-primary" />
                Tóm tắt cấu hình đang áp dụng
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-brand-outline/20">
                  <span className="text-brand-text-muted">Lịch định kỳ</span>
                  <span className="font-semibold text-brand-text text-right">{FREQUENCY_LABELS[draftPolicy.frequency]}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-outline/20">
                  <span className="text-brand-text-muted">Chu kỳ GFS</span>
                  <span className="font-semibold text-brand-text text-right">{draftPolicy.dailyRetention}N / {draftPolicy.weeklyRetention}T / {draftPolicy.monthlyRetention}Th</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-outline/20">
                  <span className="text-brand-text-muted">Khóa WORM</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-400">{draftPolicy.immutableDays} ngày</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-outline/20">
                  <span className="text-brand-text-muted">Sao chép liên vùng</span>
                  <span className="font-semibold text-emerald-600">{draftPolicy.crossRegionReplication ? 'Đang bật' : 'Tắt'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-brand-text-muted">Lần cập nhật cuối</span>
                  <span className="text-brand-text text-right text-[11px]">{formatDateTime(policy.updatedAt)}</span>
                </div>
              </div>

              <button
                onClick={savePolicy}
                disabled={!draftPolicy.encryptionEnabled || !draftPolicy.kmsKeyId.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-brand-primary/90 transition-all"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thay đổi chính sách</span>
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Tiêu chuẩn bảo mật tuân thủ</span>
              </div>
              <ul className="space-y-1.5 text-brand-text-muted text-[11px] leading-relaxed list-disc list-inside">
                <li>Bảo mật CSDL đa tenant theo tiêu chuẩn ISO 27001</li>
                <li>Tất cả bản snapshot đều được mã hóa trước khi tải lên Cloud</li>
                <li>Ghi lại mọi thay đổi cấu hình vào Nhật ký kiểm toán (Audit Logs)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CHI TIẾT SNAPSHOT */}
      {selectedSnapshot && (
        <Modal
          open
          onClose={() => setSelectedSnapshotId(null)}
          title={`Chi tiết Snapshot: ${selectedSnapshot.id}`}
          description={`${SCOPE_CONFIG[selectedSnapshot.scope].label} · Tạo ngày ${formatDateTime(selectedSnapshot.createdAt)}`}
          size="large"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <button
                onClick={() => deleteSnapshot(selectedSnapshot)}
                disabled={isImmutable(selectedSnapshot) || selectedSnapshot.status === 'IN_PROGRESS'}
                title={isImmutable(selectedSnapshot) ? 'Không thể xóa vì đang khóa WORM' : 'Xóa vĩnh viễn'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-600 hover:bg-red-500/20 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                <span>Xóa snapshot</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadManifest(selectedSnapshot)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-surface-high"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải Manifest JSON</span>
                </button>
                {selectedSnapshot.status === 'SUCCESS' && (
                  <button
                    onClick={() => verifySnapshot(selectedSnapshot)}
                    disabled={selectedSnapshot.integrityStatus === 'PENDING'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-surface-high"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>Xác minh lại SHA-256</span>
                  </button>
                )}
                {selectedSnapshot.status === 'SUCCESS' && (
                  <button
                    onClick={() => openRestore(selectedSnapshot)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-xs font-bold text-white hover:bg-brand-primary/90 shadow-md"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Phục hồi dữ liệu</span>
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Top Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                <span className="text-[10px] uppercase font-bold text-brand-text-muted">Dung lượng file</span>
                <p className="mt-1 font-mono font-bold text-sm text-brand-text">{selectedSnapshot.size}</p>
              </div>
              <div className="p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                <span className="text-[10px] uppercase font-bold text-brand-text-muted">Thời gian chạy</span>
                <p className="mt-1 font-bold text-sm text-brand-text">{formatDuration(selectedSnapshot.durationSeconds)}</p>
              </div>
              <div className="p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                <span className="text-[10px] uppercase font-bold text-brand-text-muted">Khóa bất biến</span>
                <p className="mt-1 font-bold text-sm text-violet-600 dark:text-violet-400">
                  {isImmutable(selectedSnapshot) ? 'Đang khóa WORM' : 'Đã mở khóa'}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30">
                <span className="text-[10px] uppercase font-bold text-brand-text-muted">Vùng lưu trữ</span>
                <p className="mt-1 font-bold text-sm text-brand-text">{selectedSnapshot.region}</p>
              </div>
            </div>

            {/* Components list */}
            <div className="rounded-xl border border-brand-outline/30 p-4 space-y-3">
              <h4 className="font-extrabold text-brand-text flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-brand-primary" />
                Các thành phần đóng gói trong bản sao lưu
              </h4>
              <div className="divide-y divide-brand-outline/20">
                {selectedSnapshot.components.map((c) => (
                  <div key={c.key} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-brand-text">{c.label}</p>
                      <p className="text-[10px] text-brand-text-muted">
                        {c.records ? `${c.records.toLocaleString('vi-VN')} bản ghi dữ liệu` : c.status === 'SKIPPED' ? 'Không thuộc phạm vi chọn' : 'Hoàn tất'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        c.status === 'INCLUDED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-brand-surface-high text-brand-text-muted border-brand-outline/30'
                      }`}>
                        {c.status === 'INCLUDED' ? 'Đã bao gồm' : 'Bỏ qua'}
                      </span>
                      <p className="text-[10px] text-brand-text-muted mt-0.5 font-mono">{c.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checksum & Cloud KMS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-brand-outline/30 bg-brand-surface-high/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-text flex items-center gap-1.5">
                    <FileCheck2 className="h-3.5 w-3.5 text-brand-primary" />
                    Mã băm SHA-256 Checksum
                  </span>
                  <button
                    onClick={() => copyText(selectedSnapshot.checksum, 'checksum')}
                    className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'checksum' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Sao chép
                  </button>
                </div>
                <p className="font-mono text-[10px] bg-brand-surface p-2 rounded-lg break-all text-brand-text-muted border border-brand-outline/25">
                  {selectedSnapshot.checksum}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-brand-outline/30 bg-brand-surface-high/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-text flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-brand-primary" />
                    Khóa KMS mã hóa
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">AES-256-GCM</span>
                </div>
                <p className="font-mono text-[10px] bg-brand-surface p-2 rounded-lg break-all text-brand-text-muted border border-brand-outline/25">
                  {selectedSnapshot.kmsKeyId}
                </p>
              </div>
            </div>

            {/* Note & initiator */}
            <div className="p-3 rounded-xl border border-brand-outline/25 bg-brand-surface-high/20 text-xs">
              <span className="font-bold text-brand-text">Người khởi tạo:</span> {selectedSnapshot.initiatedBy} · <span className="font-bold text-brand-text">Ghi chú:</span> {selectedSnapshot.note || 'Không có ghi chú.'}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: TẠO BẢN SAO LƯU THỦ CÔNG */}
      {showBackupModal && (
        <Modal
          open
          onClose={() => setShowBackupModal(false)}
          title="Tạo bản sao lưu dữ liệu thủ công"
          description="Snapshot sẽ được nén Zstandard, mã hóa AES-256 và khóa WORM chống xóa."
          size="medium"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-surface-high"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="manual-backup-form"
                disabled={!manualNote.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-primary text-xs font-bold text-white hover:bg-brand-primary/90 shadow-md disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                <span>Bắt đầu sao lưu</span>
              </button>
            </div>
          }
        >
          <form id="manual-backup-form" onSubmit={triggerManualBackup} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Phạm vi đóng gói dữ liệu</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'FULL', title: 'Toàn hệ thống (Khuyến nghị)', desc: 'Cơ sở dữ liệu PostgreSQL, file hình ảnh, cấu hình & audit log' },
                  { key: 'DATABASE', title: 'Chỉ Cơ sở dữ liệu', desc: 'Bảng khách hàng, hóa đơn, dịch vụ và nhân viên salon' },
                  { key: 'CONFIGURATION', title: 'Chỉ Cấu hình & Gói cước', desc: 'Thiết lập hệ thống, phân quyền và các mẫu thiết lập' }
                ].map((s) => (
                  <label
                    key={s.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      manualScope === s.key ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-outline/30 bg-brand-surface hover:bg-brand-surface-high/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="manualScope"
                      checked={manualScope === s.key}
                      onChange={() => setManualScope(s.key as BackupSnapshot['scope'])}
                      className="mt-0.5 accent-brand-primary"
                    />
                    <div>
                      <p className="font-bold text-brand-text">{s.title}</p>
                      <p className="text-[10px] text-brand-text-muted mt-0.5">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">
                Lý do tạo snapshot <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Ví dụ: Sao lưu trước khi nâng cấp hệ thống phiên bản v2.9..."
                className="w-full px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high text-xs text-brand-text focus:outline-none focus:border-brand-primary resize-none"
                required
              />
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-brand-outline/30 bg-brand-surface-high/30 cursor-pointer">
              <input
                type="checkbox"
                checked={manualReplicate}
                onChange={(e) => setManualReplicate(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-primary rounded"
              />
              <div>
                <p className="font-bold text-brand-text">Tự động sao chép sang vùng dự phòng ({policy.replicaRegion})</p>
                <p className="text-[10px] text-brand-text-muted mt-0.5">Đảm bảo an toàn tuyệt đối khi vùng chính gặp sự cố thiên tai / mất điện mạng</p>
              </div>
            </label>
          </form>
        </Modal>
      )}

      {/* MODAL 3: PHỤC HỒI DỮ LIỆU */}
      {restoreSnapshot && (
        <Modal
          open
          onClose={() => setRestoreSnapshotId(null)}
          title="Khởi tạo tiến trình phục hồi dữ liệu"
          description={`Từ bản sao lưu: ${restoreSnapshot.id} (${restoreSnapshot.filename})`}
          size="medium"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setRestoreSnapshotId(null)}
                className="px-4 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-surface-high"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="restore-request-form"
                disabled={
                  !restoreNote.trim() ||
                  restoreConfirmation !== restoreSnapshot.id ||
                  (restoreTarget === 'PRODUCTION' && (!restoreMaintenance || !restorePreSnapshot))
                }
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-50 ${
                  restoreTarget === 'PRODUCTION' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-primary/90'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>{restoreTarget === 'PRODUCTION' ? 'Tiến hành phục hồi Production' : 'Khởi chạy DR Sandbox'}</span>
              </button>
            </div>
          }
        >
          <form id="restore-request-form" onSubmit={requestRestore} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Snapshot đã sẵn sàng và hợp lệ</p>
                <p className="text-[10px] text-brand-text-muted">Checksum SHA-256 đã được kiểm chứng an toàn</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">Chọn môi trường đích</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  restoreTarget === 'DR_SANDBOX' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-outline/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restoreTarget"
                      value="DR_SANDBOX"
                      checked={restoreTarget === 'DR_SANDBOX'}
                      onChange={() => setRestoreTarget('DR_SANDBOX')}
                      className="accent-brand-primary"
                    />
                    <strong className="text-brand-text">DR Sandbox</strong>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-1.5">Diễn tập cô lập, không ảnh hưởng tiệm thật</p>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  restoreTarget === 'PRODUCTION' ? 'border-red-500 bg-red-500/5' : 'border-brand-outline/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restoreTarget"
                      value="PRODUCTION"
                      checked={restoreTarget === 'PRODUCTION'}
                      onChange={() => setRestoreTarget('PRODUCTION')}
                      className="accent-red-500"
                    />
                    <strong className="text-red-600 dark:text-red-400">Production (Thực tế)</strong>
                  </div>
                  <p className="text-[10px] text-brand-text-muted mt-1.5">Ghi đè CSDL thật, có bảo trì tạm thời</p>
                </label>
              </div>
            </div>

            {restoreTarget === 'PRODUCTION' && (
              <div className="p-3 rounded-xl border border-red-500/25 bg-red-500/5 space-y-2">
                <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-brand-text">
                  <span>Bật chế độ bảo trì hệ thống trước khi restore</span>
                  <input
                    type="checkbox"
                    checked={restoreMaintenance}
                    onChange={(e) => setRestoreMaintenance(e.target.checked)}
                    className="h-4 w-4 accent-red-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-brand-text">
                  <span>Tự động tạo snapshot bản hiện tại trước khi ghi đè</span>
                  <input
                    type="checkbox"
                    checked={restorePreSnapshot}
                    onChange={(e) => setRestorePreSnapshot(e.target.checked)}
                    className="h-4 w-4 accent-red-600 rounded"
                  />
                </label>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">
                Mục đích / Mã ticket phục hồi <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={restoreNote}
                onChange={(e) => setRestoreNote(e.target.value)}
                placeholder="Ví dụ: Diễn tập DR quý 3 / Xử lý sự cố theo ticket #8492..."
                className="w-full px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high text-xs text-brand-text focus:outline-none focus:border-brand-primary resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-brand-text-muted mb-1.5">
                Xác nhận: Nhập chính xác mã <span className="font-mono text-brand-primary">{restoreSnapshot.id}</span>
              </label>
              <input
                type="text"
                value={restoreConfirmation}
                onChange={(e) => setRestoreConfirmation(e.target.value)}
                placeholder={restoreSnapshot.id}
                className="w-full px-3 py-2 rounded-xl border border-brand-outline/40 bg-brand-surface-high font-mono text-xs text-brand-text focus:outline-none focus:border-brand-primary"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}