import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cloud,
  Copy,
  Database,
  Download,
  FileCheck2,
  FileJson,
  Filter,
  Gauge,
  Globe2,
  HardDrive,
  History,
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
  ShieldCheck,
  Trash2,
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

interface DataBackupProps {
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type PageTab = 'overview' | 'snapshots' | 'restores' | 'policy';
type SnapshotStatusFilter = 'ALL' | BackupSnapshot['status'];
type SnapshotTypeFilter = 'ALL' | BackupSnapshot['type'];
type IntegrityFilter = 'ALL' | BackupSnapshot['integrityStatus'];

const PAGE_SIZE = 6;
const BACKUPS_KEY = 'backups_v2';
const BACKUP_POLICY_KEY = 'backup_policy_v2';
const RESTORE_JOBS_KEY = 'restore_jobs_v2';

const STATUS_CONFIG: Record<BackupSnapshot['status'], { label: string; className: string; icon: ReactNode }> = {
  SUCCESS: { label: 'Thành công', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  FAILED: { label: 'Thất bại', className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400', icon: <XCircle className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { label: 'Đang chạy', className: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> }
};

const INTEGRITY_CONFIG: Record<BackupSnapshot['integrityStatus'], { label: string; className: string }> = {
  VERIFIED: { label: 'Đã xác minh', className: 'text-emerald-600 dark:text-emerald-400' },
  PENDING: { label: 'Chờ xác minh', className: 'text-amber-600 dark:text-amber-400' },
  FAILED: { label: 'Không hợp lệ', className: 'text-red-600 dark:text-red-400' }
};

const TYPE_LABELS: Record<BackupSnapshot['type'], string> = {
  AUTO: 'Tự động',
  MANUAL: 'Thủ công',
  PRE_RESTORE: 'Trước phục hồi'
};

const SCOPE_LABELS: Record<BackupSnapshot['scope'], string> = {
  FULL: 'Toàn hệ thống',
  DATABASE: 'Cơ sở dữ liệu',
  CONFIGURATION: 'Cấu hình'
};

const RETENTION_LABELS: Record<BackupSnapshot['retentionClass'], string> = {
  DAILY: 'Hằng ngày',
  WEEKLY: 'Hằng tuần',
  MONTHLY: 'Hằng tháng',
  MANUAL: 'Thủ công'
};

const RESTORE_STATUS_CONFIG: Record<RestoreJob['status'], { label: string; className: string }> = {
  QUEUED: { label: 'Đang chờ', className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted' },
  VALIDATING: { label: 'Đang kiểm tra', className: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  RESTORING: { label: 'Đang phục hồi', className: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  VERIFYING: { label: 'Đang xác minh', className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  SUCCESS: { label: 'Thành công', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  FAILED: { label: 'Thất bại', className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' },
  CANCELLED: { label: 'Đã hủy', className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted' }
};

const FREQUENCY_LABELS: Record<BackupPolicy['frequency'], string> = {
  EVERY_6_HOURS: 'Mỗi 6 giờ',
  DAILY: 'Hằng ngày',
  WEEKLY: 'Hằng tuần'
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

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold ${className}`}>{children}</span>;
}

function MetricCard({ icon, label, value, detail, tone = 'primary' }: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    primary: 'bg-brand-primary/10 text-brand-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400'
  };
  return (
    <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-brand-text">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{detail}</p>
    </div>
  );
}

export default function DataBackup({ showConfirm }: DataBackupProps) {
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
      detail: policy.enabled ? `${FREQUENCY_LABELS[policy.frequency]} · lần tới ${nextRun ? formatDateTime(nextRun.toISOString()) : '—'}` : 'Đang tạm dừng',
      passed: policy.enabled,
      action: () => setActiveTab('policy'),
      actionLabel: 'Mở chính sách'
    },
    {
      label: `Điểm khôi phục trong RPO ${rpoTargetHours} giờ`,
      detail: latestSuccessful ? `${latestSuccessful.id} · ${formatRelativeTime(latestSuccessful.completedAt || latestSuccessful.createdAt)}` : 'Chưa có bản sao lưu thành công',
      passed: latestBackupAgeHours <= rpoTargetHours,
      action: () => setActiveTab('snapshots'),
      actionLabel: 'Xem snapshot'
    },
    {
      label: 'Xác minh tính toàn vẹn',
      detail: successfulBackups.length ? `${verifiedRate}% snapshot thành công đã xác minh checksum` : 'Chưa có dữ liệu để xác minh',
      passed: successfulBackups.length > 0 && verifiedRate === 100,
      action: () => { setIntegrityFilter('PENDING'); setActiveTab('snapshots'); },
      actionLabel: 'Kiểm tra'
    },
    {
      label: 'Bản sao dự phòng liên vùng',
      detail: policy.crossRegionReplication ? `${policy.primaryRegion} → ${policy.replicaRegion}` : 'Chưa bật sao chép sang vùng dự phòng',
      passed: policy.crossRegionReplication,
      action: () => setActiveTab('policy'),
      actionLabel: 'Cấu hình'
    }
  ];
  const readinessScore = Math.round(readinessChecks.filter((check) => check.passed).length / readinessChecks.length * 100);
  const readinessLabel = readinessScore === 100 ? 'Sẵn sàng phục hồi' : readinessScore >= 75 ? 'Cần theo dõi' : 'Cần xử lý';

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

  const triggerManualBackup = (event: FormEvent) => {
    event.preventDefault();
    if (!manualNote.trim() || runningBackupId) return;
    const id = createId('BKP');
    const now = new Date();
    const filename = `salonsys_${manualScope.toLowerCase()}_${now.toISOString().replace(/[-:]/g, '').slice(0, 13)}.zst`;
    const components: BackupSnapshot['components'] = [
      { key: 'DATABASE', label: 'Cơ sở dữ liệu PostgreSQL', status: manualScope === 'CONFIGURATION' ? 'SKIPPED' : 'INCLUDED', size: manualScope === 'CONFIGURATION' ? '0 B' : '319.4 MB', records: manualScope === 'CONFIGURATION' ? undefined : 1848750 },
      { key: 'OBJECT_STORAGE', label: 'Tệp tenant & tài sản', status: manualScope === 'FULL' ? 'INCLUDED' : 'SKIPPED', size: manualScope === 'FULL' ? '128.4 MB' : '0 B', records: manualScope === 'FULL' ? 12908 : undefined },
      { key: 'SYSTEM_SETTINGS', label: 'Cấu hình hệ thống', status: manualScope === 'DATABASE' ? 'SKIPPED' : 'INCLUDED', size: manualScope === 'DATABASE' ? '0 B' : '1.8 MB', records: manualScope === 'DATABASE' ? undefined : 48 },
      { key: 'AUDIT_LOGS', label: 'Nhật ký kiểm toán', status: manualScope === 'FULL' ? 'INCLUDED' : 'SKIPPED', size: manualScope === 'FULL' ? '34.5 MB' : '0 B', records: manualScope === 'FULL' ? 289110 : undefined }
    ];
    const newSnapshot: BackupSnapshot = {
      id, filename, size: 'Đang tính', sizeBytes: 0, createdAt: now.toISOString(), status: 'IN_PROGRESS', type: 'MANUAL', scope: manualScope,
      storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: policy.primaryRegion,
      replicaRegion: manualReplicate ? policy.replicaRegion : undefined, encryption: 'AES-256-GCM', kmsKeyId: policy.kmsKeyId,
      checksum: 'Đang tạo', integrityStatus: 'PENDING', initiatedBy: 'superadmin@salonsys.vn', retentionClass: 'MANUAL',
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(), immutableUntil: new Date(Date.now() + policy.immutableDays * 86400000).toISOString(),
      note: manualNote.trim(), components
    };
    setBackups((current) => [newSnapshot, ...current]);
    setRunningBackupId(id);
    setBackupProgress(8);
    setShowBackupModal(false);
    setActiveTab('snapshots');
    recordAuditLog({
      eventCode: 'DATA.BACKUP.STARTED', event: 'Khởi chạy sao lưu thủ công',
      description: `Superadmin bắt đầu snapshot ${id} với phạm vi ${SCOPE_LABELS[manualScope]}.`, severity: 'medium', status: 'success', category: 'DATA',
      resource: `Snapshot ${id}`, resourceId: id, method: 'CLIENT /backups', metadata: { scope: manualScope, crossRegionReplication: manualReplicate, reason: manualNote.trim() }
    });

    let progress = 8;
    const interval = window.setInterval(() => {
      progress = Math.min(100, progress + 13);
      setBackupProgress(progress);
      if (progress >= 100) {
        window.clearInterval(interval);
        const completedAt = new Date().toISOString();
        const estimatedBytes = manualScope === 'FULL' ? 507301888 : manualScope === 'DATABASE' ? 334915174 : 1887437;
        setBackups((current) => current.map((snapshot) => snapshot.id === id ? {
          ...snapshot, status: 'SUCCESS', completedAt, sizeBytes: estimatedBytes,
          size: manualScope === 'FULL' ? '483.8 MB' : manualScope === 'DATABASE' ? '319.4 MB' : '1.8 MB',
          checksum: generateChecksum(), integrityStatus: policy.automaticVerification ? 'VERIFIED' : 'PENDING',
          verifiedAt: policy.automaticVerification ? completedAt : undefined, durationSeconds: 96
        } : snapshot));
        setRunningBackupId(null);
        setBackupProgress(0);
        setManualNote('');
        recordAuditLog({
          eventCode: 'DATA.BACKUP.COMPLETED', event: 'Hoàn tất sao lưu thủ công',
          description: `Snapshot ${id} đã hoàn tất và được lưu tại ${policy.primaryRegion}.`, severity: 'low', status: 'success', category: 'DATA',
          resource: `Snapshot ${id}`, resourceId: id, method: `CLIENT /backups/${id}`, metadata: { integrityVerified: policy.automaticVerification }
        });
      }
    }, 180);
  };

  const verifySnapshot = (snapshot: BackupSnapshot) => {
    if (snapshot.status !== 'SUCCESS' || snapshot.integrityStatus === 'PENDING') return;
    setBackups((current) => current.map((item) => item.id === snapshot.id ? { ...item, integrityStatus: 'PENDING' } : item));
    window.setTimeout(() => {
      const verifiedAt = new Date().toISOString();
      setBackups((current) => current.map((item) => item.id === snapshot.id ? { ...item, integrityStatus: 'VERIFIED', verifiedAt } : item));
      recordAuditLog({
        eventCode: 'DATA.BACKUP.VERIFIED', event: 'Xác minh tính toàn vẹn snapshot',
        description: `Checksum và manifest của ${snapshot.id} đã được xác minh.`, severity: 'low', status: 'success', category: 'DATA',
        resource: `Snapshot ${snapshot.id}`, resourceId: snapshot.id, method: `CLIENT /backups/${snapshot.id}/verify`
      });
    }, 900);
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
    recordAuditLog({
      eventCode: 'DATA.BACKUP.MANIFEST.DOWNLOADED', event: 'Tải manifest sao lưu',
      description: `Superadmin tải manifest của ${snapshot.id}.`, severity: 'medium', status: 'success', category: 'DATA',
      resource: `Snapshot ${snapshot.id}`, resourceId: snapshot.id, method: `CLIENT /backups/${snapshot.id}/manifest`
    });
  };

  const deleteSnapshot = (snapshot: BackupSnapshot) => {
    if (isImmutable(snapshot)) return;
    showConfirm('Xóa snapshot khỏi kho lưu trữ', `Xóa vĩnh viễn ${snapshot.id}? Manifest và bản sao liên vùng của snapshot cũng sẽ bị xóa. Thao tác này không thể hoàn tác.`, () => {
      setBackups((current) => current.filter((item) => item.id !== snapshot.id));
      if (selectedSnapshotId === snapshot.id) setSelectedSnapshotId(null);
      recordAuditLog({
        eventCode: 'DATA.BACKUP.DELETED', event: 'Xóa snapshot sao lưu',
        description: `Superadmin xóa snapshot ${snapshot.id} không còn trong thời gian khóa bất biến.`, severity: 'high', status: 'success', category: 'DATA',
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
        status: 'VALIDATING', requestedAt: now, startedAt: now, requestedBy: 'superadmin@salonsys.vn', progress: 10,
        maintenanceMode: restoreTarget === 'PRODUCTION' ? restoreMaintenance : false,
        preRestoreSnapshot: restoreTarget === 'PRODUCTION' ? restorePreSnapshot : false,
        validationPassed: false, note: restoreNote.trim()
      };
      setRestoreJobs((current) => [job, ...current]);
      setRestoreSnapshotId(null);
      setActiveTab('restores');
      recordAuditLog({
        eventCode: 'DATA.RESTORE.REQUESTED', event: 'Yêu cầu phục hồi dữ liệu',
        description: `Superadmin yêu cầu phục hồi ${restoreSnapshot.id} vào ${restoreTarget === 'PRODUCTION' ? 'Production' : 'DR Sandbox'}.`,
        severity: restoreTarget === 'PRODUCTION' ? 'high' : 'medium', status: 'success', category: 'DATA', resource: `Restore job ${job.id}`, resourceId: job.id,
        method: 'CLIENT /restore-jobs', metadata: { snapshotId: restoreSnapshot.id, target: restoreTarget, maintenanceMode: job.maintenanceMode, preRestoreSnapshot: job.preRestoreSnapshot }
      });

      window.setTimeout(() => setRestoreJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'RESTORING', validationPassed: true, progress: 42 } : item)), 500);
      window.setTimeout(() => setRestoreJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'VERIFYING', progress: 82 } : item)), 1050);
      window.setTimeout(() => {
        const completedAt = new Date().toISOString();
        setRestoreJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'SUCCESS', progress: 100, completedAt } : item));
        recordAuditLog({
          eventCode: 'DATA.RESTORE.COMPLETED', event: 'Hoàn tất phục hồi dữ liệu',
          description: `Restore job ${job.id} đã hoàn tất trong môi trường ${restoreTarget}.`, severity: 'medium', status: 'success', category: 'DATA',
          resource: `Restore job ${job.id}`, resourceId: job.id, method: `CLIENT /restore-jobs/${job.id}`
        });
      }, 1650);
    };

    showConfirm(
      restoreTarget === 'PRODUCTION' ? 'Xác nhận phục hồi Production' : 'Xác nhận diễn tập phục hồi',
      restoreTarget === 'PRODUCTION'
        ? `Dữ liệu Production sẽ được thay thế bằng ${restoreSnapshot.id}. Hệ thống sẽ bật bảo trì và tạo snapshot trước phục hồi theo lựa chọn của bạn.`
        : `Khởi tạo môi trường DR Sandbox từ ${restoreSnapshot.id}? Dữ liệu Production không bị thay đổi.`,
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
      description: `Superadmin cập nhật ${changes.length} trường trong chính sách backup.`, severity: 'high', status: 'success', category: 'DATA',
      resource: 'Chính sách sao lưu hệ thống', resourceId: 'BACKUP-POLICY', method: 'CLIENT /backup-policy', changes
    });
    alert('Đã cập nhật chính sách sao lưu và ghi nhận vào nhật ký kiểm toán.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary"><Database className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-extrabold tracking-tight text-brand-text sm:text-2xl">Sao lưu & phục hồi dữ liệu</h1><p className="mt-1 max-w-3xl text-xs leading-relaxed text-brand-text-muted">Bảo vệ cơ sở dữ liệu, tệp tenant, cấu hình và nhật ký bằng các điểm khôi phục có mã hóa. Đây là khu vực phục hồi hệ thống khi có sự cố, không phải chức năng xuất báo cáo Excel/CSV.</p></div>
        </div>
        <button onClick={() => setShowBackupModal(true)} disabled={Boolean(runningBackupId)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-brand-primary px-4 py-2 text-xs font-bold text-white"><Play className="h-4 w-4" /><span>{runningBackupId ? `Đang sao lưu ${backupProgress}%` : 'Tạo bản sao lưu'}</span></button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-brand-outline/40">
        {([
          ['overview', 'Tổng quan', Gauge],
          ['snapshots', 'Điểm khôi phục', Archive],
          ['restores', 'Lịch sử phục hồi', History],
          ['policy', 'Chính sách', Settings2]
        ] as const).map(([tab, label, Icon]) => <button key={tab} onClick={() => setActiveTab(tab)} className={`flex shrink-0 items-center gap-2 rounded-b-none border-0 bg-transparent px-4 py-2.5 text-xs font-bold shadow-none ${activeTab === tab ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-text-muted'}`}><Icon className="h-4 w-4" /><span>{label}</span></button>)}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Backup gần nhất" value={latestSuccessful ? formatRelativeTime(latestSuccessful.completedAt) : 'Chưa có'} detail={latestSuccessful ? `${latestSuccessful.id} · ${latestSuccessful.size}` : 'Chưa có điểm khôi phục thành công'} tone={latestSuccessful ? 'success' : 'danger'} />
            <MetricCard icon={<CalendarClock className="h-4 w-4" />} label="Lần chạy kế tiếp" value={nextRun ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(nextRun) : 'Đã tắt'} detail={nextRun ? `${formatDate(nextRun.toISOString())} · ${FREQUENCY_LABELS[policy.frequency]}` : 'Lịch tự động đang tạm dừng'} tone={nextRun ? 'primary' : 'warning'} />
            <MetricCard icon={<FileCheck2 className="h-4 w-4" />} label="Tính toàn vẹn" value={`${verifiedRate}%`} detail={`${successfulBackups.filter((item) => item.integrityStatus === 'VERIFIED').length}/${successfulBackups.length} snapshot đã xác minh`} tone={verifiedRate === 100 ? 'success' : 'warning'} />
            <MetricCard icon={<HardDrive className="h-4 w-4" />} label="Dung lượng lưu trữ" value={`${storageUsedGb.toFixed(1)} GB`} detail="Hạn mức 50 GB · bao gồm bản sao chính" tone={storageUsedGb < 40 ? 'primary' : 'warning'} />
          </div>

          <section className="overflow-hidden rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="border-b border-brand-outline/35 p-5 xl:border-b-0 xl:border-r">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${readinessScore === 100 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : readinessScore >= 75 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}><ShieldCheck className="h-5 w-5" /></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">Mức độ sẵn sàng</p><h2 className="mt-1 text-base font-extrabold text-brand-text">{readinessLabel}</h2></div>
                  </div>
                  <div className="sm:text-right"><p className={`text-3xl font-black tracking-tight ${readinessScore === 100 ? 'text-emerald-600 dark:text-emerald-400' : readinessScore >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{readinessScore}%</p><p className="text-[10px] text-brand-text-muted">{readinessChecks.filter((check) => check.passed).length}/{readinessChecks.length} điều kiện đạt</p></div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {readinessChecks.map((check) => (
                    <button key={check.label} onClick={check.action} className="flex h-auto items-start gap-3 border border-brand-outline/35 bg-brand-surface-high/45 p-3 text-left shadow-none">
                      {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />}
                      <span className="min-w-0 flex-1"><span className="block text-[11px] font-extrabold text-brand-text">{check.label}</span><span className="mt-1 block text-[9px] leading-relaxed text-brand-text-muted">{check.detail}</span></span>
                      <span className="shrink-0 text-[9px] font-bold text-brand-primary">{check.actionLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <div><h2 className="text-sm font-extrabold text-brand-text">Quy trình bảo vệ dữ liệu</h2><p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">Bốn lớp kiểm soát giúp bản sao có thể dùng được khi sự cố thực sự xảy ra.</p></div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { step: '01', title: 'Sao lưu', detail: 'Tạo snapshot tự động hoặc thủ công.', icon: <Database className="h-4 w-4" />, action: () => setShowBackupModal(true) },
                    { step: '02', title: 'Xác minh', detail: 'Đối chiếu checksum và manifest dữ liệu.', icon: <FileCheck2 className="h-4 w-4" />, action: () => setActiveTab('snapshots') },
                    { step: '03', title: 'Lưu giữ an toàn', detail: 'Mã hóa, WORM và sao chép liên vùng.', icon: <LockKeyhole className="h-4 w-4" />, action: () => setActiveTab('policy') },
                    { step: '04', title: 'Phục hồi & diễn tập', detail: 'Khôi phục Sandbox trước khi Production.', icon: <RotateCcw className="h-4 w-4" />, action: () => setActiveTab('restores') }
                  ].map((item) => (
                    <button key={item.step} onClick={item.action} className="group flex h-auto items-start gap-3 border border-brand-outline/35 bg-transparent p-3 text-left shadow-none hover:bg-brand-surface-high/50">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">{item.icon}</span>
                      <span><span className="block text-[9px] font-bold uppercase tracking-wider text-brand-primary">Bước {item.step}</span><span className="mt-0.5 block text-[11px] font-extrabold text-brand-text">{item.title}</span><span className="mt-1 block text-[9px] leading-relaxed text-brand-text-muted">{item.detail}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {latestFailure && new Date(latestFailure.createdAt).getTime() > Date.now() - 7 * 86400000 && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-4 w-4" /></div><div><p className="text-xs font-extrabold text-brand-text">Có lần sao lưu thất bại trong 7 ngày qua</p><p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{latestFailure.id}: {latestFailure.failureReason}</p></div></div>
              <button onClick={() => { setStatusFilter('FAILED'); setActiveTab('snapshots'); }} className="whitespace-nowrap border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-400">Xem chi tiết</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-brand-outline/35 px-5 py-4"><div><h2 className="text-sm font-extrabold text-brand-text">Hoạt động gần đây</h2><p className="mt-0.5 text-[10px] text-brand-text-muted">Trạng thái các điểm khôi phục mới nhất</p></div><button onClick={() => setActiveTab('snapshots')} className="border-0 bg-transparent px-2 py-1 text-[10px] font-bold text-brand-primary shadow-none">Xem tất cả</button></div>
              <div className="divide-y divide-brand-outline/25">
                {[...backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((snapshot) => (
                  <button key={snapshot.id} onClick={() => setSelectedSnapshotId(snapshot.id)} className="flex h-auto w-full items-center justify-between gap-4 rounded-none border-0 bg-transparent px-5 py-3.5 text-left shadow-none">
                    <div className="flex min-w-0 items-center gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${snapshot.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : snapshot.status === 'FAILED' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>{snapshot.status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4" /> : snapshot.status === 'FAILED' ? <XCircle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4 animate-spin" />}</div><div className="min-w-0"><p className="truncate font-mono text-[10px] font-bold text-brand-text">{snapshot.id}</p><p className="mt-1 truncate text-[10px] text-brand-text-muted">{TYPE_LABELS[snapshot.type]} · {SCOPE_LABELS[snapshot.scope]} · {snapshot.size}</p></div></div>
                    <div className="shrink-0 text-right"><p className="text-[10px] font-bold text-brand-text">{formatRelativeTime(snapshot.createdAt)}</p><p className={`mt-1 text-[9px] font-bold ${INTEGRITY_CONFIG[snapshot.integrityStatus].className}`}>{INTEGRITY_CONFIG[snapshot.integrityStatus].label}</p></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-primary" /><h2 className="text-sm font-extrabold text-brand-text">Tư thế phục hồi DR</h2></div><div className="mt-4 space-y-3 text-[10px]"><div className="flex items-center justify-between"><span className="text-brand-text-muted">RPO mục tiêu</span><strong className="text-brand-text">{rpoTargetHours} giờ</strong></div><div className="flex items-center justify-between"><span className="text-brand-text-muted">RTO diễn tập gần nhất</span><strong className="text-brand-text">52 phút</strong></div><div className="flex items-center justify-between"><span className="text-brand-text-muted">Bản sao liên vùng</span><strong className={policy.crossRegionReplication ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{policy.crossRegionReplication ? 'Hoạt động' : 'Đã tắt'}</strong></div><div className="flex items-center justify-between"><span className="text-brand-text-muted">Diễn tập gần nhất</span><strong className="text-brand-text">10/07/2026</strong></div></div><button onClick={() => setActiveTab('restores')} className="mt-4 w-full border border-brand-outline bg-brand-surface-high px-3 py-2 text-xs font-bold text-brand-text">Xem lịch sử diễn tập</button></div>
              <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-brand-primary" /><h2 className="text-sm font-extrabold text-brand-text">Bảo vệ dữ liệu</h2></div><div className="mt-4 space-y-3 text-[10px]"><div><p className="text-brand-text-muted">Mã hóa</p><p className="mt-1 font-bold text-brand-text">AES-256-GCM · Cloud KMS</p></div><div><p className="text-brand-text-muted">Khóa bất biến mặc định</p><p className="mt-1 font-bold text-brand-text">{policy.immutableDays} ngày (WORM)</p></div><div><p className="text-brand-text-muted">Vùng chính → dự phòng</p><p className="mt-1 font-bold text-brand-text">{policy.primaryRegion} → {policy.replicaRegion}</p></div></div></div>
            </section>
          </div>
        </>
      )}

      {activeTab === 'snapshots' && (
        <section className="rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
          <div className="border-b border-brand-outline/35 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-extrabold text-brand-text">Danh sách điểm khôi phục</h2><p className="mt-1 text-[10px] text-brand-text-muted">Theo dõi trạng thái, checksum, retention và vị trí lưu trữ của từng snapshot.</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm snapshot..." className="form-control pl-9" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SnapshotStatusFilter)} className="form-control"><option value="ALL">Mọi trạng thái</option><option value="SUCCESS">Thành công</option><option value="FAILED">Thất bại</option><option value="IN_PROGRESS">Đang chạy</option></select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as SnapshotTypeFilter)} className="form-control"><option value="ALL">Mọi loại backup</option><option value="AUTO">Tự động</option><option value="MANUAL">Thủ công</option><option value="PRE_RESTORE">Trước phục hồi</option></select><select value={integrityFilter} onChange={(event) => setIntegrityFilter(event.target.value as IntegrityFilter)} className="form-control"><option value="ALL">Mọi trạng thái toàn vẹn</option><option value="VERIFIED">Đã xác minh</option><option value="PENDING">Chờ xác minh</option><option value="FAILED">Không hợp lệ</option></select></div></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead><tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/60 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted"><th className="px-4 py-3">Snapshot</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Phạm vi</th><th className="px-4 py-3">Dung lượng</th><th className="px-4 py-3">Toàn vẹn</th><th className="px-4 py-3">Retention</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Tác vụ</th></tr></thead>
              <tbody className="divide-y divide-brand-outline/25 text-xs">
                {visibleBackups.length === 0 ? <tr><td colSpan={8} className="px-4 py-16 text-center"><Archive className="mx-auto h-8 w-8 text-brand-text-muted/50" /><p className="mt-3 font-bold text-brand-text">Không tìm thấy snapshot</p><p className="mt-1 text-[10px] text-brand-text-muted">Thử thay đổi từ khóa hoặc bộ lọc.</p></td></tr> : visibleBackups.map((snapshot) => (
                  <tr key={snapshot.id} className="transition-colors hover:bg-brand-surface-high/40"><td className="px-4 py-3.5"><button onClick={() => setSelectedSnapshotId(snapshot.id)} className="min-h-0 border-0 bg-transparent p-0 text-left shadow-none"><p className="font-mono text-[10px] font-bold text-brand-primary">{snapshot.id}</p><p className="mt-1 max-w-[230px] truncate text-[10px] text-brand-text-muted">{snapshot.filename}</p></button></td><td className="px-4 py-3.5"><p className="font-bold text-brand-text">{formatDateTime(snapshot.createdAt)}</p><p className="mt-1 text-[10px] text-brand-text-muted">{formatRelativeTime(snapshot.createdAt)}</p></td><td className="px-4 py-3.5"><p className="font-bold text-brand-text">{SCOPE_LABELS[snapshot.scope]}</p><p className="mt-1 text-[10px] text-brand-text-muted">{TYPE_LABELS[snapshot.type]}</p></td><td className="px-4 py-3.5 font-bold text-brand-text">{snapshot.size}</td><td className="px-4 py-3.5"><p className={`font-bold ${INTEGRITY_CONFIG[snapshot.integrityStatus].className}`}>{INTEGRITY_CONFIG[snapshot.integrityStatus].label}</p>{snapshot.verifiedAt && <p className="mt-1 text-[9px] text-brand-text-muted">{formatDate(snapshot.verifiedAt)}</p>}</td><td className="px-4 py-3.5"><p className="font-bold text-brand-text">{RETENTION_LABELS[snapshot.retentionClass]}</p><p className="mt-1 text-[9px] text-brand-text-muted">Hết hạn {formatDate(snapshot.expiresAt)}</p></td><td className="px-4 py-3.5"><Badge className={STATUS_CONFIG[snapshot.status].className}>{STATUS_CONFIG[snapshot.status].icon}{STATUS_CONFIG[snapshot.status].label}</Badge></td><td className="px-4 py-3.5 text-right"><button onClick={() => setSelectedSnapshotId(snapshot.id)} className="whitespace-nowrap border border-brand-outline bg-brand-surface-high px-3 py-1.5 text-[10px] font-bold text-brand-text">Chi tiết</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-brand-outline/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-brand-text-muted">Trang {page} / {pageCount} · {filteredBackups.length} snapshot</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang snapshot trước"><ChevronLeft className="h-4 w-4" /></button><button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Trang snapshot sau"><ChevronRight className="h-4 w-4" /></button></div></div>
        </section>
      )}

      {activeTab === 'restores' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" /><div><p className="text-xs font-extrabold text-brand-text">Quy trình phục hồi có kiểm soát</p><p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">Mọi restore đều xác minh checksum trước khi chạy. Production yêu cầu chế độ bảo trì, điểm sao lưu trước phục hồi và xác nhận mã snapshot.</p></div></div></div>
          <section className="rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm"><div className="border-b border-brand-outline/35 px-5 py-4"><h2 className="text-sm font-extrabold text-brand-text">Lịch sử phục hồi & diễn tập DR</h2><p className="mt-1 text-[10px] text-brand-text-muted">Theo dõi tiến độ, môi trường đích và kết quả xác minh sau phục hồi.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-left"><thead><tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/60 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted"><th className="px-5 py-3">Restore job</th><th className="px-5 py-3">Snapshot nguồn</th><th className="px-5 py-3">Môi trường đích</th><th className="px-5 py-3">Tiến độ</th><th className="px-5 py-3">Yêu cầu bởi</th><th className="px-5 py-3">Kết quả</th></tr></thead><tbody className="divide-y divide-brand-outline/25 text-xs">{restoreJobs.map((job) => <tr key={job.id}><td className="px-5 py-4"><p className="font-mono text-[10px] font-bold text-brand-primary">{job.id}</p><p className="mt-1 text-[9px] text-brand-text-muted">{formatDateTime(job.requestedAt)}</p></td><td className="px-5 py-4"><p className="font-mono text-[10px] font-bold text-brand-text">{job.snapshotId}</p><p className="mt-1 max-w-[220px] truncate text-[9px] text-brand-text-muted">{job.snapshotFilename}</p></td><td className="px-5 py-4"><Badge className={job.target === 'PRODUCTION' ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' : 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400'}>{job.target === 'PRODUCTION' ? 'Production' : 'DR Sandbox'}</Badge><p className="mt-1.5 text-[9px] text-brand-text-muted">{job.maintenanceMode ? 'Có bảo trì' : 'Không ảnh hưởng Production'}</p></td><td className="px-5 py-4"><div className="w-28"><div className="mb-1 flex justify-between text-[9px] font-bold text-brand-text"><span>{job.progress}%</span><span>{job.validationPassed ? 'Đã kiểm tra' : 'Đang kiểm tra'}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-brand-surface-highest"><div style={{ width: `${job.progress}%` }} className={`h-full ${job.status === 'FAILED' ? 'bg-red-500' : 'bg-brand-primary'}`} /></div></div></td><td className="px-5 py-4"><p className="font-bold text-brand-text">{job.requestedBy}</p><p className="mt-1 text-[9px] text-brand-text-muted">{job.note}</p></td><td className="px-5 py-4"><Badge className={RESTORE_STATUS_CONFIG[job.status].className}>{RESTORE_STATUS_CONFIG[job.status].label}</Badge>{job.failureReason && <p className="mt-2 max-w-[230px] text-[9px] leading-relaxed text-red-600 dark:text-red-400">{job.failureReason}</p>}</td></tr>)}</tbody></table></div></section>
        </div>
      )}

      {activeTab === 'policy' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <section className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-brand-outline/30 pb-4"><div><h2 className="text-sm font-extrabold text-brand-text">Lịch sao lưu tự động</h2><p className="mt-1 text-[10px] text-brand-text-muted">Thiết lập tần suất và múi giờ cho toàn hệ thống.</p></div><label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-brand-text"><input type="checkbox" checked={draftPolicy.enabled} onChange={(event) => setDraftPolicy({ ...draftPolicy, enabled: event.target.checked })} className="h-4 w-4 accent-brand-primary" /> Đang bật</label></div><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Tần suất</label><select value={draftPolicy.frequency} onChange={(event) => setDraftPolicy({ ...draftPolicy, frequency: event.target.value as BackupPolicy['frequency'] })} className="form-control"><option value="EVERY_6_HOURS">Mỗi 6 giờ</option><option value="DAILY">Hằng ngày</option><option value="WEEKLY">Hằng tuần</option></select></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Giờ chạy</label><input type="time" value={draftPolicy.time} onChange={(event) => setDraftPolicy({ ...draftPolicy, time: event.target.value })} disabled={draftPolicy.frequency === 'EVERY_6_HOURS'} className="form-control" /></div>{draftPolicy.frequency === 'WEEKLY' && <div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Ngày chạy</label><select value={draftPolicy.weekday} onChange={(event) => setDraftPolicy({ ...draftPolicy, weekday: event.target.value as BackupPolicy['weekday'] })} className="form-control">{Object.entries(WEEKDAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}<div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Múi giờ</label><select value={draftPolicy.timezone} onChange={(event) => setDraftPolicy({ ...draftPolicy, timezone: event.target.value })} className="form-control"><option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option><option value="UTC">UTC</option><option value="Asia/Singapore">Asia/Singapore (UTC+8)</option></select></div></div></section>

            <section className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="border-b border-brand-outline/30 pb-4"><h2 className="text-sm font-extrabold text-brand-text">Retention & khóa bất biến</h2><p className="mt-1 text-[10px] text-brand-text-muted">Chính sách GFS bảo vệ các điểm khôi phục theo ngày, tuần và tháng.</p></div><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Bản hằng ngày</label><input type="number" min="1" max="31" value={draftPolicy.dailyRetention} onChange={(event) => setDraftPolicy({ ...draftPolicy, dailyRetention: Number(event.target.value) })} className="form-control" /><p className="field-hint">Số ngày lưu giữ</p></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Bản hằng tuần</label><input type="number" min="1" max="12" value={draftPolicy.weeklyRetention} onChange={(event) => setDraftPolicy({ ...draftPolicy, weeklyRetention: Number(event.target.value) })} className="form-control" /><p className="field-hint">Số tuần lưu giữ</p></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Bản hằng tháng</label><input type="number" min="1" max="60" value={draftPolicy.monthlyRetention} onChange={(event) => setDraftPolicy({ ...draftPolicy, monthlyRetention: Number(event.target.value) })} className="form-control" /><p className="field-hint">Số tháng lưu giữ</p></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Khóa WORM</label><input type="number" min="1" max="90" value={draftPolicy.immutableDays} onChange={(event) => setDraftPolicy({ ...draftPolicy, immutableDays: Number(event.target.value) })} className="form-control" /><p className="field-hint">Không thể xóa trong N ngày</p></div></div></section>

            <section className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><div className="border-b border-brand-outline/30 pb-4"><h2 className="text-sm font-extrabold text-brand-text">Kho lưu trữ & bảo mật</h2><p className="mt-1 text-[10px] text-brand-text-muted">Mã hóa, nén và nhân bản snapshot sang vùng độc lập.</p></div><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Vùng chính</label><select value={draftPolicy.primaryRegion} onChange={(event) => setDraftPolicy({ ...draftPolicy, primaryRegion: event.target.value })} className="form-control"><option value="asia-southeast1">Singapore · asia-southeast1</option><option value="asia-east1">Taiwan · asia-east1</option><option value="asia-northeast1">Tokyo · asia-northeast1</option></select></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Vùng dự phòng</label><select value={draftPolicy.replicaRegion} onChange={(event) => setDraftPolicy({ ...draftPolicy, replicaRegion: event.target.value })} className="form-control"><option value="asia-east1">Taiwan · asia-east1</option><option value="asia-northeast1">Tokyo · asia-northeast1</option><option value="asia-southeast1">Singapore · asia-southeast1</option></select></div><div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Cloud KMS key</label><input value={draftPolicy.kmsKeyId} onChange={(event) => setDraftPolicy({ ...draftPolicy, kmsKeyId: event.target.value })} className="form-control font-mono" /></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Nén dữ liệu</label><select value={draftPolicy.compression} onChange={(event) => setDraftPolicy({ ...draftPolicy, compression: event.target.value as BackupPolicy['compression'] })} className="form-control"><option value="ZSTD">Zstandard (khuyến nghị)</option><option value="GZIP">GZIP</option></select></div><div className="space-y-2 rounded-lg border border-brand-outline/35 bg-brand-surface-high/35 p-3"><label className="flex cursor-pointer items-center justify-between gap-3 text-[10px] font-bold text-brand-text"><span>Sao chép liên vùng</span><input type="checkbox" checked={draftPolicy.crossRegionReplication} onChange={(event) => setDraftPolicy({ ...draftPolicy, crossRegionReplication: event.target.checked })} className="h-4 w-4 accent-brand-primary" /></label><label className="flex cursor-pointer items-center justify-between gap-3 text-[10px] font-bold text-brand-text"><span>Xác minh tự động</span><input type="checkbox" checked={draftPolicy.automaticVerification} onChange={(event) => setDraftPolicy({ ...draftPolicy, automaticVerification: event.target.checked })} className="h-4 w-4 accent-brand-primary" /></label><label className="flex cursor-pointer items-center justify-between gap-3 text-[10px] font-bold text-brand-text"><span>Bao gồm Object Storage</span><input type="checkbox" checked={draftPolicy.includeObjectStorage} onChange={(event) => setDraftPolicy({ ...draftPolicy, includeObjectStorage: event.target.checked })} className="h-4 w-4 accent-brand-primary" /></label><label className="flex cursor-pointer items-center justify-between gap-3 text-[10px] font-bold text-brand-text"><span>Bao gồm audit log</span><input type="checkbox" checked={draftPolicy.includeAuditLogs} onChange={(event) => setDraftPolicy({ ...draftPolicy, includeAuditLogs: event.target.checked })} className="h-4 w-4 accent-brand-primary" /></label></div></div></section>
          </div>

          <aside className="space-y-4"><div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm"><h2 className="text-sm font-extrabold text-brand-text">Tóm tắt chính sách</h2><div className="mt-4 space-y-3 text-[10px]"><div className="flex justify-between gap-3"><span className="text-brand-text-muted">Lịch chạy</span><strong className="text-right text-brand-text">{FREQUENCY_LABELS[draftPolicy.frequency]} {draftPolicy.frequency !== 'EVERY_6_HOURS' && `· ${draftPolicy.time}`}</strong></div><div className="flex justify-between gap-3"><span className="text-brand-text-muted">Retention GFS</span><strong className="text-right text-brand-text">{draftPolicy.dailyRetention} ngày · {draftPolicy.weeklyRetention} tuần · {draftPolicy.monthlyRetention} tháng</strong></div><div className="flex justify-between gap-3"><span className="text-brand-text-muted">Mã hóa</span><strong className="text-right text-emerald-600 dark:text-emerald-400">AES-256-GCM</strong></div><div className="flex justify-between gap-3"><span className="text-brand-text-muted">Lần cập nhật</span><strong className="text-right text-brand-text">{formatDateTime(policy.updatedAt)}</strong></div><div className="flex justify-between gap-3"><span className="text-brand-text-muted">Cập nhật bởi</span><strong className="text-right text-brand-text">{policy.updatedBy}</strong></div></div><button onClick={savePolicy} disabled={!draftPolicy.encryptionEnabled || !draftPolicy.kmsKeyId.trim()} className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-brand-primary px-4 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" /><span>Lưu chính sách</span></button></div><div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 className="text-sm font-extrabold text-brand-text">Kiểm soát an toàn</h2></div><ul className="mt-4 space-y-2 text-[10px] leading-relaxed text-brand-text-muted"><li>• Không cho phép tắt mã hóa snapshot.</li><li>• Production restore cần xác nhận ID chính xác.</li><li>• Snapshot trong thời gian WORM không thể xóa.</li><li>• Mọi thay đổi chính sách đều vào audit log.</li></ul></div></aside>
        </div>
      )}

      {selectedSnapshot && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-bg/80 p-0 backdrop-blur-sm sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSnapshotId(null); }}>
          <aside role="dialog" aria-modal="true" aria-labelledby="snapshot-detail-title" className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden border-brand-outline bg-brand-surface shadow-2xl sm:h-[min(92dvh,900px)] sm:max-w-3xl sm:rounded-2xl sm:border xl:max-w-4xl">
            <header className="shrink-0 border-b border-brand-outline/40 bg-brand-surface px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-brand-primary">{selectedSnapshot.id}</span><Badge className={STATUS_CONFIG[selectedSnapshot.status].className}>{STATUS_CONFIG[selectedSnapshot.status].icon}{STATUS_CONFIG[selectedSnapshot.status].label}</Badge>{isImmutable(selectedSnapshot) && <Badge className="border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400"><LockKeyhole className="h-3 w-3" />Bất biến</Badge>}</div>
                  <h2 id="snapshot-detail-title" className="mt-2 break-words text-base font-extrabold leading-snug text-brand-text sm:text-lg">{selectedSnapshot.filename}</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{TYPE_LABELS[selectedSnapshot.type]} · {SCOPE_LABELS[selectedSnapshot.scope]} · Tạo {formatDateTime(selectedSnapshot.createdAt)}</p>
                </div>
                <button onClick={() => setSelectedSnapshotId(null)} aria-label="Đóng chi tiết snapshot" className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand-outline bg-brand-surface-high p-0 text-brand-text"><X className="h-4 w-4" /></button>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {selectedSnapshot.status === 'FAILED' && <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4"><div className="flex items-start gap-3"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" /><div><p className="text-xs font-extrabold text-brand-text">Snapshot không hoàn tất</p><p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{selectedSnapshot.failureReason}</p></div></div></div>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-brand-outline/35 bg-brand-surface-high/35 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Dung lượng</p><p className="mt-2 text-lg font-extrabold text-brand-text">{selectedSnapshot.size}</p><p className="mt-1 text-[9px] text-brand-text-muted">Nén {policy.compression}</p></div><div className="rounded-xl border border-brand-outline/35 bg-brand-surface-high/35 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Thời gian chạy</p><p className="mt-2 text-lg font-extrabold text-brand-text">{formatDuration(selectedSnapshot.durationSeconds)}</p><p className="mt-1 text-[9px] text-brand-text-muted">Hoàn tất {formatDateTime(selectedSnapshot.completedAt)}</p></div><div className="rounded-xl border border-brand-outline/35 bg-brand-surface-high/35 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Tính toàn vẹn</p><p className={`mt-2 text-sm font-extrabold ${INTEGRITY_CONFIG[selectedSnapshot.integrityStatus].className}`}>{INTEGRITY_CONFIG[selectedSnapshot.integrityStatus].label}</p><p className="mt-1 text-[9px] text-brand-text-muted">{selectedSnapshot.verifiedAt ? formatDateTime(selectedSnapshot.verifiedAt) : 'Chưa có thời gian xác minh'}</p></div></div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2"><Layers3 className="h-4 w-4 text-brand-primary" /><h3 className="text-xs font-extrabold text-brand-text">Thành phần snapshot</h3></div><div className="divide-y divide-brand-outline/25">{selectedSnapshot.components.map((component) => <div key={component.key} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="text-[10px] font-bold text-brand-text">{component.label}</p><p className="mt-0.5 text-[9px] text-brand-text-muted">{component.records !== undefined ? `${component.records.toLocaleString('vi-VN')} bản ghi` : component.status === 'SKIPPED' ? 'Không thuộc phạm vi backup' : 'Không thể hoàn tất'}</p></div><div className="shrink-0 text-right"><p className={`text-[10px] font-bold ${component.status === 'INCLUDED' ? 'text-emerald-600 dark:text-emerald-400' : component.status === 'FAILED' ? 'text-red-600 dark:text-red-400' : 'text-brand-text-muted'}`}>{component.status === 'INCLUDED' ? 'Đã bao gồm' : component.status === 'FAILED' ? 'Thất bại' : 'Bỏ qua'}</p><p className="mt-0.5 text-[9px] text-brand-text-muted">{component.size}</p></div></div>)}</div></section>
                <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand-primary" /><h3 className="text-xs font-extrabold text-brand-text">Tính toàn vẹn & mã hóa</h3></div><dl className="space-y-3 text-[10px]"><div><dt className="text-brand-text-muted">Checksum SHA-256</dt><dd className="mt-1 rounded-lg bg-brand-surface-high/50 p-2 font-mono text-[9px] font-bold leading-relaxed text-brand-text [overflow-wrap:anywhere]">{selectedSnapshot.checksum}</dd></div><div><dt className="text-brand-text-muted">Khóa mã hóa Cloud KMS</dt><dd className="mt-1 rounded-lg bg-brand-surface-high/50 p-2 font-mono text-[9px] font-bold leading-relaxed text-brand-text [overflow-wrap:anywhere]">{selectedSnapshot.kmsKeyId}</dd></div><div><dt className="text-brand-text-muted">Thuật toán</dt><dd className="mt-1 font-bold text-brand-text">{selectedSnapshot.encryption}</dd></div></dl></section>
                <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2"><Cloud className="h-4 w-4 text-brand-primary" /><h3 className="text-xs font-extrabold text-brand-text">Lưu trữ & retention</h3></div><dl className="grid grid-cols-1 gap-3 text-[10px] sm:grid-cols-2"><div><dt className="text-brand-text-muted">Bucket chính</dt><dd className="mt-1 font-bold text-brand-text [overflow-wrap:anywhere]">gs://{selectedSnapshot.bucket}</dd></div><div><dt className="text-brand-text-muted">Vùng chính</dt><dd className="mt-1 font-bold text-brand-text">{selectedSnapshot.region}</dd></div><div><dt className="text-brand-text-muted">Bản sao dự phòng</dt><dd className="mt-1 font-bold text-brand-text">{selectedSnapshot.replicaRegion || 'Không tạo'}</dd></div><div><dt className="text-brand-text-muted">Retention class</dt><dd className="mt-1 font-bold text-brand-text">{RETENTION_LABELS[selectedSnapshot.retentionClass]}</dd></div><div><dt className="text-brand-text-muted">Hết hạn</dt><dd className="mt-1 font-bold text-brand-text">{formatDateTime(selectedSnapshot.expiresAt)}</dd></div><div><dt className="text-brand-text-muted">Bất biến đến</dt><dd className="mt-1 font-bold text-brand-text">{formatDateTime(selectedSnapshot.immutableUntil)}</dd></div></dl></section>
                <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-brand-primary" /><h3 className="text-xs font-extrabold text-brand-text">Nguồn tạo & ghi chú</h3></div><p className="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Khởi tạo bởi</p><p className="mt-1 break-words text-xs font-bold text-brand-text">{selectedSnapshot.initiatedBy}</p><p className="mt-4 text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Lý do / ghi chú</p><p className="mt-1 text-[10px] leading-relaxed text-brand-text">{selectedSnapshot.note || 'Không có ghi chú.'}</p></section>
              </div>
            </div>
            <footer className="shrink-0 border-t border-brand-outline/40 bg-brand-surface-lowest/80 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
                <button onClick={() => deleteSnapshot(selectedSnapshot)} disabled={isImmutable(selectedSnapshot) || selectedSnapshot.status === 'IN_PROGRESS'} title={isImmutable(selectedSnapshot) ? `Đã khóa đến ${formatDateTime(selectedSnapshot.immutableUntil)}` : 'Xóa snapshot'} className="inline-flex min-w-0 items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 dark:text-red-400 sm:mr-auto"><Trash2 className="h-4 w-4 shrink-0" /><span>Xóa</span></button>
                <button onClick={() => downloadManifest(selectedSnapshot)} className="inline-flex min-w-0 items-center justify-center gap-2 border border-brand-outline bg-brand-surface px-3 py-2 text-xs font-bold text-brand-text"><FileJson className="h-4 w-4 shrink-0" /><span>Manifest</span></button>
                {selectedSnapshot.status === 'SUCCESS' && <button onClick={() => verifySnapshot(selectedSnapshot)} disabled={selectedSnapshot.integrityStatus === 'PENDING'} className="inline-flex min-w-0 items-center justify-center gap-2 border border-brand-outline bg-brand-surface px-3 py-2 text-xs font-bold text-brand-text"><RefreshCw className={`h-4 w-4 shrink-0 ${selectedSnapshot.integrityStatus === 'PENDING' ? 'animate-spin' : ''}`} /><span>Xác minh lại</span></button>}
                {selectedSnapshot.status === 'SUCCESS' && selectedSnapshot.integrityStatus === 'VERIFIED' && <button onClick={() => openRestore(selectedSnapshot)} className="col-span-2 inline-flex min-w-0 items-center justify-center gap-2 bg-brand-primary px-4 py-2 text-xs font-bold text-white sm:col-auto"><RotateCcw className="h-4 w-4 shrink-0" /><span>Khởi tạo phục hồi</span></button>}
              </div>
            </footer>
          </aside>
        </div>
      )}

      {showBackupModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-bg/75 p-4 backdrop-blur-sm">
          <form onSubmit={triggerManualBackup} className="w-full max-w-lg overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-brand-outline/40 px-5 py-4"><div><h2 className="text-base font-extrabold text-brand-text">Tạo bản sao lưu thủ công</h2><p className="mt-1 text-[10px] text-brand-text-muted">Snapshot được mã hóa, khóa bất biến và ghi nhận trong audit log.</p></div><button type="button" onClick={() => setShowBackupModal(false)} aria-label="Đóng tạo bản sao lưu"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Phạm vi backup</label><select value={manualScope} onChange={(event) => setManualScope(event.target.value as BackupSnapshot['scope'])} className="form-control"><option value="FULL">Toàn hệ thống · Database, files, cấu hình, audit</option><option value="DATABASE">Chỉ cơ sở dữ liệu PostgreSQL</option><option value="CONFIGURATION">Cấu hình hệ thống</option></select></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Lý do tạo snapshot <span className="text-red-500">*</span></label><textarea rows={3} value={manualNote} onChange={(event) => setManualNote(event.target.value)} placeholder="Ví dụ: Tạo trước khi triển khai phiên bản 2.9.0..." className="form-control resize-none" required /></div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-outline/35 bg-brand-surface-high/35 p-3"><input type="checkbox" checked={manualReplicate} onChange={(event) => setManualReplicate(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-primary" /><span><strong className="block text-xs text-brand-text">Sao chép sang vùng dự phòng</strong><span className="mt-1 block text-[10px] text-brand-text-muted">{policy.primaryRegion} → {policy.replicaRegion}. Tăng khả năng phục hồi khi vùng chính gặp sự cố.</span></span></label><div className="grid grid-cols-2 gap-3 rounded-xl border border-brand-outline/35 p-3 text-[10px]"><div><p className="text-brand-text-muted">Mã hóa</p><p className="mt-1 font-bold text-brand-text">AES-256-GCM</p></div><div><p className="text-brand-text-muted">Khóa bất biến</p><p className="mt-1 font-bold text-brand-text">{policy.immutableDays} ngày</p></div><div><p className="text-brand-text-muted">Retention</p><p className="mt-1 font-bold text-brand-text">90 ngày</p></div><div><p className="text-brand-text-muted">Xác minh</p><p className="mt-1 font-bold text-brand-text">{policy.automaticVerification ? 'Tự động' : 'Thủ công'}</p></div></div></div><div className="flex justify-end gap-2 border-t border-brand-outline/40 bg-brand-surface-lowest/60 px-5 py-4"><button type="button" onClick={() => setShowBackupModal(false)} className="border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text">Hủy</button><button type="submit" disabled={!manualNote.trim()} className="inline-flex items-center gap-2 whitespace-nowrap bg-brand-primary px-4 py-2 text-xs font-bold text-white"><Database className="h-4 w-4" /><span>Khởi chạy backup</span></button></div></form>
        </div>
      )}

      {restoreSnapshot && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-bg/80 p-4 backdrop-blur-sm">
          <form onSubmit={requestRestore} className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-brand-outline bg-brand-surface shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-brand-outline/40 px-5 py-4"><div><h2 className="text-base font-extrabold text-brand-text">Khởi tạo phục hồi dữ liệu</h2><p className="mt-1 font-mono text-[10px] font-bold text-brand-primary">{restoreSnapshot.id}</p></div><button type="button" onClick={() => setRestoreSnapshotId(null)} aria-label="Đóng phục hồi dữ liệu"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><p className="text-xs font-extrabold text-brand-text">Snapshot đã vượt kiểm tra toàn vẹn</p></div><p className="mt-1.5 text-[10px] text-brand-text-muted">Checksum {restoreSnapshot.checksum.slice(0, 24)}… · {restoreSnapshot.size}</p></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Môi trường đích</label><div className="grid grid-cols-2 gap-3"><label className={`cursor-pointer rounded-xl border p-3 ${restoreTarget === 'DR_SANDBOX' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-outline/40'}`}><input type="radio" name="restoreTarget" value="DR_SANDBOX" checked={restoreTarget === 'DR_SANDBOX'} onChange={() => setRestoreTarget('DR_SANDBOX')} className="accent-brand-primary" /><strong className="ml-2 text-xs text-brand-text">DR Sandbox</strong><p className="mt-2 text-[9px] leading-relaxed text-brand-text-muted">Diễn tập cô lập, không ảnh hưởng tenant đang hoạt động.</p></label><label className={`cursor-pointer rounded-xl border p-3 ${restoreTarget === 'PRODUCTION' ? 'border-red-500 bg-red-500/5' : 'border-brand-outline/40'}`}><input type="radio" name="restoreTarget" value="PRODUCTION" checked={restoreTarget === 'PRODUCTION'} onChange={() => setRestoreTarget('PRODUCTION')} className="accent-red-500" /><strong className="ml-2 text-xs text-brand-text">Production</strong><p className="mt-2 text-[9px] leading-relaxed text-brand-text-muted">Ghi đè dữ liệu hiện tại; có thể gây gián đoạn dịch vụ.</p></label></div></div>{restoreTarget === 'PRODUCTION' && <div className="space-y-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3"><label className="flex cursor-pointer items-center justify-between gap-3 text-[10px] font-bold text-brand-text"><span>Bật chế độ bảo trì trước khi restore</span><input type="checkbox" checked={restoreMaintenance} onChange={(event) => setRestoreMaintenance(event.target.checked)} className="h-4 w-4 accent-red-500" /></label><label className="flex cursor-pointer items-center justify-between gap-3 text-[10px] font-bold text-brand-text"><span>Tạo snapshot Production hiện tại</span><input type="checkbox" checked={restorePreSnapshot} onChange={(event) => setRestorePreSnapshot(event.target.checked)} className="h-4 w-4 accent-red-500" /></label></div>}<div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Mục đích phục hồi <span className="text-red-500">*</span></label><textarea rows={3} value={restoreNote} onChange={(event) => setRestoreNote(event.target.value)} placeholder="Mô tả sự cố, ticket liên quan hoặc mục tiêu diễn tập..." className="form-control resize-none" required /></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase text-brand-text-muted">Nhập chính xác <span className="font-mono text-brand-primary">{restoreSnapshot.id}</span> để xác nhận</label><input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} placeholder={restoreSnapshot.id} className="form-control font-mono" /></div></div><div className="flex justify-end gap-2 border-t border-brand-outline/40 bg-brand-surface-lowest/60 px-5 py-4"><button type="button" onClick={() => setRestoreSnapshotId(null)} className="border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text">Hủy</button><button type="submit" disabled={!restoreNote.trim() || restoreConfirmation !== restoreSnapshot.id || (restoreTarget === 'PRODUCTION' && (!restoreMaintenance || !restorePreSnapshot))} className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-xs font-bold text-white ${restoreTarget === 'PRODUCTION' ? 'bg-red-600' : 'bg-brand-primary'}`}><RotateCcw className="h-4 w-4" /><span>{restoreTarget === 'PRODUCTION' ? 'Phục hồi Production' : 'Bắt đầu diễn tập'}</span></button></div></form>
        </div>
      )}
    </div>
  );
}
