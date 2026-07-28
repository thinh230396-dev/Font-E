import BeautifulSelect from './BeautifulSelect';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Download,
  Eye,
  FileClock,
  Filter,
  Fingerprint,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  MapPin,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  UserCog,
  X,
  XCircle
} from 'lucide-react';
import type { AdminSession, SystemLog } from '../types';
import {
  AUDIT_LOGS_STORAGE_KEY,
  AUDIT_LOGS_UPDATED_EVENT,
  loadAuditLogs,
  recordAuditLog,
  saveAuditLogs
} from '../utils/auditLogs';
import {
  loadSystemSettings,
  SYSTEM_SETTINGS_STORAGE_KEY,
  SYSTEM_SETTINGS_UPDATED_EVENT,
  type SystemSettingsModel
} from '../utils/systemSettings';

interface SecurityAndLogsProps {
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onOpenSecuritySettings?: () => void;
}

type PageTab = 'overview' | 'audit' | 'sessions';
type DateRange = '24h' | '7d' | '30d' | 'all';
type CategoryFilter = 'ALL' | SystemLog['category'];
type StatusFilter = 'ALL' | SystemLog['status'];
type SeverityFilter = 'ALL' | SystemLog['severity'];

const SESSIONS_STORAGE_KEY = 'salonsys_admin_sessions';
const PAGE_SIZE = 8;
const LEGACY_MOCK_SESSION_IDS = new Set(['SES-CURRENT-001', 'SES-REMOTE-002', 'SES-REMOTE-003']);

const CATEGORY_LABELS: Record<SystemLog['category'], string> = {
  AUTH: 'Xác thực',
  TENANT: 'Tenant',
  USER: 'Người dùng',
  BILLING: 'Thanh toán',
  PACKAGE: 'Gói dịch vụ',
  SECURITY: 'Bảo mật',
  SYSTEM: 'Hệ thống',
  DATA: 'Dữ liệu',
  SUPPORT: 'Hỗ trợ'
};

const ROLE_LABELS: Record<SystemLog['actorRole'], string> = {
  SUPERADMIN: 'Superadmin',
  TENANT_ADMIN: 'Tenant Admin',
  SYSTEM: 'Hệ thống',
  SUPPORT: 'Hỗ trợ'
};

const STATUS_CONFIG: Record<SystemLog['status'], { label: string; className: string }> = {
  success: { label: 'Thành công', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' },
  failed: { label: 'Thất bại', className: 'border-red-500/25 bg-red-500/10 text-red-500' },
  blocked: { label: 'Đã chặn', className: 'border-amber-500/25 bg-amber-500/10 text-amber-500' }
};

const SEVERITY_CONFIG: Record<SystemLog['severity'], { label: string; dot: string; className: string }> = {
  high: { label: 'Nghiêm trọng', dot: 'bg-red-500', className: 'border-red-500/25 bg-red-500/10 text-red-500' },
  medium: { label: 'Cảnh báo', dot: 'bg-amber-500', className: 'border-amber-500/25 bg-amber-500/10 text-amber-500' },
  low: { label: 'Thông tin', dot: 'bg-sky-500', className: 'border-sky-500/25 bg-sky-500/10 text-sky-500' }
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
  const timePart = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  return `${datePart} · ${timePart}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
};

const formatRelativeTime = (value: string) => {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

const loadSessions = (): AdminSession[] => {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminSession[];
    if (!Array.isArray(parsed)) return [];

    const sessions = parsed.filter((session) => !LEGACY_MOCK_SESSION_IDS.has(session.id));
    if (sessions.length !== parsed.length) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }
    return sessions;
  } catch {
    return [];
  }
};

const saveSessions = (sessions: AdminSession[]) => {
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
};

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

function StatusBadge({ status }: { status: SystemLog['status'] }) {
  const config = STATUS_CONFIG[status];
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold whitespace-nowrap ${config.className}`}>{config.label}</span>;
}

function SeverityBadge({ severity }: { severity: SystemLog['severity'] }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold whitespace-nowrap ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function MetricCard({ icon, label, value, detail, tone = 'primary' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    primary: 'bg-brand-primary/10 text-brand-primary',
    success: 'bg-emerald-500/10 text-emerald-500',
    warning: 'bg-amber-500/10 text-amber-500',
    danger: 'bg-red-500/10 text-red-500'
  };
  return (
    <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">{label}</span>
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-brand-text">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{detail}</p>
    </div>
  );
}

export default function SecurityAndLogs({ showConfirm, onOpenSecuritySettings }: SecurityAndLogsProps) {
  const [activeTab, setActiveTab] = useState<PageTab>('overview');
  const [logs, setLogs] = useState<SystemLog[]>(loadAuditLogs);
  const [sessions, setSessions] = useState<AdminSession[]>(loadSessions);
  const [settings, setSettings] = useState<SystemSettingsModel>(loadSystemSettings);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handleAuditUpdate = (event: Event) => {
      const next = (event as CustomEvent<SystemLog[]>).detail;
      setLogs(next || loadAuditLogs());
    };
    const handleSettingsUpdate = (event: Event) => {
      const next = (event as CustomEvent<SystemSettingsModel>).detail;
      setSettings(next || loadSystemSettings());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUDIT_LOGS_STORAGE_KEY) setLogs(loadAuditLogs());
      if (event.key === SYSTEM_SETTINGS_STORAGE_KEY) setSettings(loadSystemSettings());
      if (event.key === SESSIONS_STORAGE_KEY) setSessions(loadSessions());
    };

    window.addEventListener(AUDIT_LOGS_UPDATED_EVENT, handleAuditUpdate);
    window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(AUDIT_LOGS_UPDATED_EVENT, handleAuditUpdate);
      window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => setPage(1), [searchQuery, categoryFilter, statusFilter, severityFilter, dateRange]);

  useEffect(() => {
    if (!selectedLog) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedLog(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLog]);

  const activeSessions = sessions.filter((session) => session.status === 'active');
  const now = Date.now();
  const riskyLogs24h = logs.filter((log) => (
    now - new Date(log.timestamp).getTime() <= 24 * 60 * 60 * 1000
    && log.severity === 'high'
    && log.status !== 'success'
  ));
  const failedAuth24h = logs.filter((log) => (
    now - new Date(log.timestamp).getTime() <= 24 * 60 * 60 * 1000
    && (log.category === 'AUTH' || log.category === 'SECURITY')
    && log.status !== 'success'
  )).length;

  const securityChecks = [
    { label: 'MFA bắt buộc cho Superadmin', passed: settings.security.requireMfaForSuperadmin, weight: 30 },
    { label: 'Mật khẩu tối thiểu từ 12 ký tự', passed: settings.security.passwordMinLength >= 12, weight: 20 },
    { label: 'Phiên hết hạn trong tối đa 60 phút', passed: settings.security.sessionTimeout <= 60, weight: 20 },
    { label: 'Khóa sau tối đa 5 lần đăng nhập sai', passed: settings.security.maxLoginAttempts <= 5, weight: 15 },
    { label: 'Lưu audit log tối thiểu 180 ngày', passed: settings.security.auditRetentionDays >= 180, weight: 15 }
  ];
  const securityScore = securityChecks.reduce((score, check) => score + (check.passed ? check.weight : 0), 0);
  const passedChecks = securityChecks.filter((check) => check.passed).length;

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rangeHours: Record<Exclude<DateRange, 'all'>, number> = { '24h': 24, '7d': 168, '30d': 720 };
    const cutoff = dateRange === 'all' ? 0 : Date.now() - rangeHours[dateRange] * 60 * 60 * 1000;

    return logs.filter((log) => {
      const searchable = [
        log.id,
        log.eventCode,
        log.event,
        log.description,
        log.user,
        log.ip,
        log.resource,
        log.resourceId,
        log.requestId,
        log.location
      ].filter(Boolean).join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (categoryFilter === 'ALL' || log.category === categoryFilter)
        && (statusFilter === 'ALL' || log.status === statusFilter)
        && (severityFilter === 'ALL' || log.severity === severityFilter)
        && (!cutoff || new Date(log.timestamp).getTime() >= cutoff);
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, searchQuery, categoryFilter, statusFilter, severityFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const retentionCutoff = Date.now() - settings.security.auditRetentionDays * 24 * 60 * 60 * 1000;
  const expiredLogCount = logs.filter((log) => new Date(log.timestamp).getTime() < retentionCutoff).length;

  const handleExport = () => {
    const headers = ['Thời gian', 'Mã sự kiện', 'Sự kiện', 'Tác nhân', 'Vai trò', 'IP', 'Vị trí', 'Danh mục', 'Tài nguyên', 'Kết quả', 'Mức độ', 'Request ID', 'Mô tả'];
    const rows = filteredLogs.map((log) => [
      formatDateTime(log.timestamp),
      log.eventCode,
      log.event,
      log.user,
      ROLE_LABELS[log.actorRole],
      log.ip,
      log.location,
      CATEGORY_LABELS[log.category],
      log.resource,
      STATUS_CONFIG[log.status].label,
      SEVERITY_CONFIG[log.severity].label,
      log.requestId,
      log.description
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `salonsys-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    recordAuditLog({
      eventCode: 'DATA.AUDIT_LOG.EXPORTED',
      event: 'Xuất nhật ký kiểm toán',
      description: `Đã xuất ${filteredLogs.length} bản ghi theo bộ lọc hiện tại.`,
      severity: 'medium',
      status: 'success',
      category: 'DATA',
      resource: 'Nhật ký kiểm toán',
      method: 'CLIENT /audit-logs/export',
      metadata: { exportedRows: filteredLogs.length, format: 'csv' }
    });
  };

  const handlePurgeExpiredLogs = () => {
    if (expiredLogCount === 0) return;
    showConfirm(
      'Dọn nhật ký hết thời hạn?',
      `${expiredLogCount} bản ghi đã quá chính sách lưu ${settings.security.auditRetentionDays} ngày. Bản ghi còn thời hạn sẽ được giữ nguyên; thao tác dọn sẽ được ghi lại vào audit trail.`,
      () => {
        const retainedLogs = loadAuditLogs().filter((log) => new Date(log.timestamp).getTime() >= retentionCutoff);
        saveAuditLogs(retainedLogs);
        recordAuditLog({
          eventCode: 'DATA.AUDIT_LOG.RETENTION_PURGE',
          event: 'Dọn nhật ký hết thời hạn',
          description: `Đã dọn ${expiredLogCount} bản ghi quá thời hạn lưu ${settings.security.auditRetentionDays} ngày.`,
          severity: 'medium',
          status: 'success',
          category: 'DATA',
          resource: 'Nhật ký kiểm toán',
          method: 'CLIENT /audit-logs/retention-purge',
          metadata: { deletedRows: expiredLogCount, retentionDays: settings.security.auditRetentionDays }
        });
        alert('Đã dọn các nhật ký hết thời hạn lưu.');
      }
    );
  };

  const revokeSession = (session: AdminSession) => {
    if (session.isCurrent || session.status === 'revoked') return;
    showConfirm(
      'Thu hồi phiên đăng nhập?',
      `Phiên trên ${session.device} tại ${session.location} sẽ bị vô hiệu ngay. Người dùng phải xác thực lại để tiếp tục truy cập.`,
      () => {
        const next = sessions.map((item) => item.id === session.id ? { ...item, status: 'revoked' as const } : item);
        setSessions(next);
        saveSessions(next);
        recordAuditLog({
          eventCode: 'SECURITY.SESSION.REVOKED',
          event: 'Thu hồi phiên đăng nhập',
          description: `Đã thu hồi phiên ${session.id} trên ${session.device}.`,
          severity: session.suspicious ? 'high' : 'medium',
          status: 'success',
          category: 'SECURITY',
          resource: 'Phiên quản trị',
          resourceId: session.id,
          metadata: { targetIp: session.ip, suspicious: session.suspicious }
        });
        alert('Đã thu hồi phiên đăng nhập.');
      }
    );
  };

  const revokeOtherSessions = () => {
    const revocable = activeSessions.filter((session) => !session.isCurrent);
    if (revocable.length === 0) return;
    showConfirm(
      'Đăng xuất khỏi các thiết bị khác?',
      `${revocable.length} phiên khác sẽ bị thu hồi. Phiên hiện tại trên thiết bị này vẫn được giữ lại.`,
      () => {
        const next = sessions.map((session) => session.isCurrent ? session : { ...session, status: 'revoked' as const });
        setSessions(next);
        saveSessions(next);
        recordAuditLog({
          eventCode: 'SECURITY.SESSIONS.REVOKED_ALL',
          event: 'Thu hồi tất cả phiên khác',
          description: `Đã thu hồi ${revocable.length} phiên quản trị ngoài phiên hiện tại.`,
          severity: 'high',
          status: 'success',
          category: 'SECURITY',
          resource: 'Phiên quản trị',
          metadata: { revokedSessions: revocable.length }
        });
        alert('Đã đăng xuất khỏi tất cả thiết bị khác.');
      }
    );
  };

  const tabs: Array<{ id: PageTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'overview', label: 'Tổng quan bảo mật', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'audit', label: 'Nhật ký kiểm toán', icon: <FileClock className="h-4 w-4" />, count: logs.length },
    { id: 'sessions', label: 'Phiên đăng nhập', icon: <MonitorSmartphone className="h-4 w-4" />, count: activeSessions.length }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand-text sm:text-2xl">
              <ShieldCheck className="h-6 w-6 text-brand-primary" />
              Bảo mật & nhật ký
            </h1>
            <span className="rounded-full border border-brand-primary/25 bg-brand-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-primary">Superadmin</span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-brand-text-muted">
            Giám sát truy cập đặc quyền, phiên quản trị và toàn bộ thay đổi nhạy cảm trên hệ thống SalonSys.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveTab('audit')} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-outline/50 bg-brand-surface-high px-3.5 py-2 text-xs font-bold text-brand-text cursor-pointer whitespace-nowrap">
            <Eye className="h-4 w-4" /> Xem audit trail
          </button>
          <button type="button" onClick={handleExport} disabled={filteredLogs.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-bold text-brand-on-primary cursor-pointer disabled:cursor-not-allowed whitespace-nowrap">
            <Download className="h-4 w-4" /> Xuất CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border-b border-brand-outline/40">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative inline-flex items-center gap-2 border-0 bg-transparent px-4 py-3 text-xs font-bold cursor-pointer ${activeTab === tab.id ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count !== undefined && <span className="rounded-full bg-brand-surface-highest px-1.5 py-0.5 text-[9px] text-brand-text-muted">{tab.count}</span>}
              {activeTab === tab.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-primary" />}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {riskyLogs24h.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-bold text-brand-text">Phát hiện {riskyLogs24h.length} sự kiện rủi ro cao trong 24 giờ</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">Ưu tiên kiểm tra các lần đăng nhập thất bại, truy cập lạ hoặc hành động đã bị chặn.</p>
                </div>
              </div>
              <button type="button" onClick={() => { setSeverityFilter('high'); setStatusFilter('ALL'); setDateRange('24h'); setActiveTab('audit'); }} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500 cursor-pointer whitespace-nowrap">
                Điều tra ngay <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Điểm bảo mật" value={`${securityScore}/100`} detail={`${passedChecks}/${securityChecks.length} kiểm soát đạt yêu cầu`} tone={securityScore >= 80 ? 'success' : securityScore >= 60 ? 'warning' : 'danger'} />
            <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Rủi ro 24 giờ" value={riskyLogs24h.length} detail={`${failedAuth24h} yêu cầu xác thực thất bại/đã chặn`} tone={riskyLogs24h.length ? 'danger' : 'success'} />
            <MetricCard icon={<MonitorSmartphone className="h-5 w-5" />} label="Phiên đang hoạt động" value={activeSessions.length} detail={`${activeSessions.filter((session) => session.suspicious).length} phiên cần kiểm tra`} tone={activeSessions.some((session) => session.suspicious) ? 'warning' : 'primary'} />
            <MetricCard icon={<Database className="h-5 w-5" />} label="Thời gian lưu log" value={`${settings.security.auditRetentionDays} ngày`} detail={`${logs.length} bản ghi đang được lưu trên trình duyệt`} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="overflow-hidden rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-brand-outline/35 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-brand-text">Tình trạng chính sách bảo mật</h2>
                  <p className="mt-1 text-[10px] text-brand-text-muted">Đánh giá theo cấu hình đang áp dụng cho vai trò Superadmin.</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-extrabold ${securityScore >= 80 ? 'text-emerald-500' : securityScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{securityScore}%</span>
                  <p className="text-[9px] uppercase tracking-wider text-brand-text-muted">mức tuân thủ</p>
                </div>
              </div>
              <div className="divide-y divide-brand-outline/25">
                {securityChecks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {check.passed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      <span className="text-xs font-medium text-brand-text">{check.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>{check.passed ? 'Đạt' : 'Cần xử lý'}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-brand-outline/35 bg-brand-surface-high/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[10px] text-brand-text-muted">Mọi thay đổi chính sách đều được ghi vào nhật ký kiểm toán.</p>
                <button type="button" onClick={onOpenSecuritySettings} disabled={!onOpenSecuritySettings} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-outline/50 bg-brand-surface px-3 py-2 text-xs font-bold text-brand-text cursor-pointer disabled:cursor-not-allowed">
                  <Settings2 className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">Cấu hình chính sách</span>
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-brand-outline/35 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-brand-text">Hoạt động gần đây</h2>
                  <p className="mt-1 text-[10px] text-brand-text-muted">Các hành động quan trọng trên toàn hệ thống.</p>
                </div>
                <Activity className="h-4 w-4 text-brand-primary" />
              </div>
              <div className="divide-y divide-brand-outline/25">
                {logs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <FileClock className="mx-auto h-7 w-7 text-brand-text-muted/45" />
                    <p className="mt-3 text-xs font-semibold text-brand-text">Chưa có hoạt động thực tế</p>
                    <p className="mt-1 text-[10px] text-brand-text-muted">Các sự kiện mới của hệ thống sẽ xuất hiện tại đây.</p>
                  </div>
                ) : logs.slice(0, 5).map((log) => (
                  <button key={log.id} type="button" onClick={() => setSelectedLog(log)} className="flex w-full items-start gap-3 rounded-none border-0 bg-transparent px-5 py-3.5 text-left shadow-none cursor-pointer hover:bg-brand-surface-high/40">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_CONFIG[log.severity].dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-brand-text">{log.event}</span>
                      <span className="mt-1 block truncate text-[10px] text-brand-text-muted">{log.user} · {formatRelativeTime(log.timestamp)}</span>
                    </span>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-text-muted" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setActiveTab('audit')} className="flex w-full items-center justify-center gap-1 rounded-none border-0 border-t border-brand-outline/35 bg-brand-surface-high/30 px-4 py-3 text-xs font-bold text-brand-primary shadow-none cursor-pointer">
                <span>Xem toàn bộ nhật ký</span> <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </div>

          <section className="rounded-xl border border-brand-outline/40 bg-brand-surface p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-brand-primary" />
                  <h2 className="text-sm font-bold text-brand-text">Phạm vi quyền Superadmin</h2>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">Quyền đặc quyền cao nhất, áp dụng trên toàn bộ tenant. Không được chia sẻ tài khoản hoặc dùng cho tác vụ vận hành thường ngày.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/8 px-2.5 py-1 text-[10px] font-bold text-red-500"><LockKeyhole className="h-3 w-3" /> Đặc quyền hệ thống</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Tenant & tài khoản', 'Tạo, sửa, khóa tenant và Tenant Admin', <UserCog className="h-4 w-4" />],
                ['Gói & thanh toán', 'Quản lý giá, hóa đơn và vòng đời gói', <KeyRound className="h-4 w-4" />],
                ['Cấu hình hệ thống', 'Thay đổi chính sách bảo mật và vận hành', <Server className="h-4 w-4" />],
                ['Dữ liệu & audit', 'Xem log toàn hệ thống, sao lưu và xuất dữ liệu', <Database className="h-4 w-4" />]
              ].map(([title, description, icon]) => (
                <div key={String(title)} className="rounded-lg border border-brand-outline/35 bg-brand-surface-high/25 p-3">
                  <div className="flex items-center gap-2 text-brand-primary">{icon}<span className="text-xs font-bold text-brand-text">{title}</span></div>
                  <p className="mt-2 text-[10px] leading-relaxed text-brand-text-muted">{description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(130px,0.7fr))]">
              <label className="relative block">
                <span className="sr-only">Tìm nhật ký</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm sự kiện, email, IP, tài nguyên, request ID..." className="form-control h-10 pl-9" />
              </label>
              <label>
                <span className="sr-only">Khoảng thời gian</span>
                <BeautifulSelect value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} className="form-control h-10 cursor-pointer">
                  <option value="24h">24 giờ qua</option>
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="all">Toàn bộ</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="sr-only">Danh mục</span>
                <BeautifulSelect value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)} className="form-control h-10 cursor-pointer">
                  <option value="ALL">Tất cả danh mục</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </BeautifulSelect>
              </label>
              <label>
                <span className="sr-only">Kết quả</span>
                <BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="form-control h-10 cursor-pointer">
                  <option value="ALL">Tất cả kết quả</option>
                  <option value="success">Thành công</option>
                  <option value="failed">Thất bại</option>
                  <option value="blocked">Đã chặn</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="sr-only">Mức độ</span>
                <BeautifulSelect value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)} className="form-control h-10 cursor-pointer">
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="high">Nghiêm trọng</option>
                  <option value="medium">Cảnh báo</option>
                  <option value="low">Thông tin</option>
                </BeautifulSelect>
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-brand-outline/25 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[10px] text-brand-text-muted">
                <Filter className="h-3.5 w-3.5" />
                <span>Hiển thị <strong className="text-brand-text">{filteredLogs.length}</strong>/{logs.length} bản ghi · lưu {settings.security.auditRetentionDays} ngày</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); setSeverityFilter('ALL'); setDateRange('7d'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-outline/45 bg-brand-surface-high px-3 py-1.5 text-[10px] font-bold text-brand-text cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" /> Đặt lại bộ lọc
                </button>
                <button type="button" onClick={handlePurgeExpiredLogs} disabled={expiredLogCount === 0} title={expiredLogCount === 0 ? 'Không có bản ghi quá thời hạn lưu' : undefined} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-outline/45 bg-brand-surface-high px-3 py-1.5 text-[10px] font-bold text-brand-text cursor-pointer disabled:cursor-not-allowed">
                  <Database className="h-3.5 w-3.5" /> Dọn log hết hạn ({expiredLogCount})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-brand-outline/35 bg-brand-surface-high/25 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
                <span className="text-xs font-bold text-brand-text">Audit trail toàn hệ thống</span>
              </div>
              <span className="hidden text-[9px] font-mono text-brand-text-muted sm:inline">READ ONLY · IMMUTABLE</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/30 text-[9px] font-extrabold uppercase tracking-wider text-brand-text-muted">
                    <th className="px-5 py-3">Thời gian</th>
                    <th className="px-5 py-3">Tác nhân</th>
                    <th className="px-5 py-3">Sự kiện</th>
                    <th className="px-5 py-3">Tài nguyên</th>
                    <th className="px-5 py-3">Nguồn truy cập</th>
                    <th className="px-5 py-3">Kết quả</th>
                    <th className="px-5 py-3">Mức độ</th>
                    <th className="px-5 py-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline/25">
                  {paginatedLogs.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-16 text-center"><FileClock className="mx-auto h-8 w-8 text-brand-text-muted/50" /><p className="mt-3 text-xs font-semibold text-brand-text">{logs.length === 0 ? 'Chưa có nhật ký kiểm toán' : 'Không tìm thấy bản ghi phù hợp'}</p><p className="mt-1 text-[10px] text-brand-text-muted">{logs.length === 0 ? 'Các hoạt động thực tế của hệ thống sẽ được ghi nhận tại đây.' : 'Thử thay đổi từ khóa, khoảng thời gian hoặc bộ lọc.'}</p></td></tr>
                  ) : paginatedLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-brand-surface-high/30">
                      <td className="whitespace-nowrap px-5 py-3.5"><p className="text-[11px] font-semibold text-brand-text">{formatDate(log.timestamp)}</p><p className="mt-0.5 text-[10px] font-mono text-brand-text-muted">{formatTime(log.timestamp)}</p></td>
                      <td className="px-5 py-3.5"><p className="max-w-[180px] truncate text-[11px] font-bold text-brand-text">{log.user}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-primary">{ROLE_LABELS[log.actorRole]}</p></td>
                      <td className="px-5 py-3.5"><p className="max-w-[240px] truncate text-[11px] font-semibold text-brand-text">{log.event}</p><p className="mt-0.5 text-[9px] font-mono text-brand-text-muted">{log.eventCode}</p></td>
                      <td className="px-5 py-3.5"><p className="max-w-[180px] truncate text-[11px] text-brand-text">{log.resource}</p><p className="mt-0.5 text-[9px] font-mono text-brand-text-muted">{log.resourceId || '—'}</p></td>
                      <td className="px-5 py-3.5"><p className="text-[11px] font-mono text-brand-text">{log.ip}</p><p className="mt-0.5 max-w-[150px] truncate text-[9px] text-brand-text-muted">{log.location || 'Không xác định'}</p></td>
                      <td className="px-5 py-3.5"><StatusBadge status={log.status} /></td>
                      <td className="px-5 py-3.5"><SeverityBadge severity={log.severity} /></td>
                      <td className="px-5 py-3.5 text-right"><button type="button" onClick={() => setSelectedLog(log)} aria-label={`Xem chi tiết ${log.event}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-outline/45 bg-brand-surface text-brand-text-muted cursor-pointer hover:text-brand-primary"><Eye className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-brand-outline/35 bg-brand-surface-high/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-brand-text-muted">Trang {currentPage}/{totalPages} · {filteredLogs.length} bản ghi</p>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-lg border border-brand-outline/45 bg-brand-surface px-3 py-1.5 text-[10px] font-bold text-brand-text cursor-pointer disabled:cursor-not-allowed">Trước</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.max(3, currentPage)).map((item) => (
                  <button key={item} type="button" onClick={() => setPage(item)} className={`h-8 min-h-0 w-8 rounded-lg border text-[10px] font-bold cursor-pointer ${item === currentPage ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-brand-outline/45 bg-brand-surface text-brand-text'}`}>{item}</button>
                ))}
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-brand-outline/45 bg-brand-surface px-3 py-1.5 text-[10px] font-bold text-brand-text cursor-pointer disabled:cursor-not-allowed">Sau</button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3 text-[10px] leading-relaxed text-brand-text-muted">
            <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
            <span><strong className="text-brand-text">Tính toàn vẹn:</strong> Superadmin chỉ có thể xem và xuất log còn thời hạn. Bản ghi không được sửa/xóa riêng lẻ; tác vụ dọn chỉ áp dụng cho log quá chính sách lưu và tự tạo một sự kiện kiểm toán mới.</span>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-brand-text">Phiên đăng nhập Superadmin</h2>
              <p className="mt-1 text-[10px] text-brand-text-muted">Theo dõi thiết bị, vị trí, xác thực MFA và thu hồi phiên không còn tin cậy.</p>
            </div>
            <button type="button" onClick={revokeOtherSessions} disabled={activeSessions.filter((session) => !session.isCurrent).length === 0} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-2 text-xs font-bold text-red-500 cursor-pointer disabled:cursor-not-allowed">
              <Ban className="h-4 w-4" /> Đăng xuất thiết bị khác
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-outline/50 bg-brand-surface px-5 py-14 text-center shadow-sm">
                <MonitorSmartphone className="mx-auto h-8 w-8 text-brand-text-muted/45" />
                <p className="mt-3 text-sm font-bold text-brand-text">Chưa có dữ liệu phiên đăng nhập</p>
                <p className="mx-auto mt-1 max-w-md text-[10px] leading-relaxed text-brand-text-muted">Phiên đăng nhập thực tế sẽ xuất hiện tại đây khi hệ thống xác thực được kết nối.</p>
              </div>
            ) : sessions.map((session) => {
              const isMobile = session.os.toLowerCase().includes('android') || session.os.toLowerCase().includes('ios');
              return (
                <article key={session.id} className={`rounded-xl border bg-brand-surface p-5 shadow-sm ${session.suspicious && session.status === 'active' ? 'border-amber-500/35' : 'border-brand-outline/40'} ${session.status === 'revoked' ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${session.suspicious ? 'bg-amber-500/10 text-amber-500' : session.isCurrent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                        {isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-brand-text">{session.device}</h3>
                          {session.isCurrent && <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500">Phiên hiện tại</span>}
                          {session.suspicious && session.status === 'active' && <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-500">Cần kiểm tra</span>}
                          {session.status === 'revoked' && <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-500">Đã thu hồi</span>}
                        </div>
                        <p className="mt-1 text-[10px] text-brand-text-muted">{session.browser} · {session.os} · {session.user}</p>
                      </div>
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4">
                      <div className="flex items-start gap-2"><Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><div><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Địa chỉ IP</p><p className="mt-1 text-[11px] font-mono text-brand-text">{session.ip}</p></div></div>
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><div><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Vị trí</p><p className="mt-1 text-[11px] text-brand-text">{session.location}</p></div></div>
                      <div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><div><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Hoạt động cuối</p><p className="mt-1 text-[11px] text-brand-text">{formatRelativeTime(session.lastActive)}</p></div></div>
                      <div className="flex items-start gap-2"><Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><div><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Xác thực</p><p className={`mt-1 text-[11px] font-semibold ${session.mfaVerified ? 'text-emerald-500' : 'text-red-500'}`}>{session.mfaVerified ? 'MFA đã xác minh' : 'Chưa xác minh MFA'}</p></div></div>
                    </div>
                    <button type="button" onClick={() => revokeSession(session)} disabled={session.isCurrent || session.status === 'revoked'} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-outline/45 bg-brand-surface-high px-3 py-2 text-xs font-bold text-brand-text cursor-pointer disabled:cursor-not-allowed xl:ml-3">
                      <Ban className="h-3.5 w-3.5" /> {session.isCurrent ? 'Đang sử dụng' : session.status === 'revoked' ? 'Đã thu hồi' : 'Thu hồi phiên'}
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-brand-outline/25 pt-3 text-[9px] text-brand-text-muted">
                    <span>Mã phiên: <code className="font-mono text-brand-text">{session.id}</code></span>
                    <span>Bắt đầu: {formatDateTime(session.createdAt)}</span>
                    <span>Hết hạn dự kiến: {formatDateTime(session.expiresAt)}</span>
                    <span className={session.trusted ? 'text-emerald-500' : 'text-amber-500'}>{session.trusted ? 'Thiết bị tin cậy' : 'Thiết bị chưa tin cậy'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden p-0 sm:p-4">
          <button type="button" aria-label="Đóng chi tiết nhật ký" onClick={() => setSelectedLog(null)} className="sa-modal-backdrop absolute inset-0 h-full w-full rounded-none border-0 bg-slate-950/60 shadow-none cursor-default" />
          <aside role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="relative flex h-[100dvh] min-h-0 w-full max-w-2xl flex-col overflow-hidden border border-brand-outline/45 bg-brand-surface shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-outline/40 bg-brand-surface px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={selectedLog.severity} /><StatusBadge status={selectedLog.status} /></div>
                <h2 id="audit-detail-title" className="mt-3 text-base font-bold text-brand-text">{selectedLog.event}</h2>
                <p className="mt-1 text-[10px] font-mono text-brand-text-muted">{selectedLog.eventCode} · {selectedLog.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)} aria-label="Đóng" title="Đóng" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-outline/45 bg-brand-surface-high text-brand-text-muted transition-colors hover:border-brand-primary/40 hover:text-brand-text cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="rounded-lg border border-brand-outline/35 bg-brand-surface-high/30 p-4">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-brand-text-muted">Mô tả sự kiện</p>
                <p className="mt-2 text-xs leading-relaxed text-brand-text">{selectedLog.description}</p>
              </div>

              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-brand-text"><UserCog className="h-4 w-4 text-brand-primary" /> Tác nhân & thời gian</h3>
                <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-brand-outline/35 p-4 sm:grid-cols-2">
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Người thực hiện</dt><dd className="mt-1 break-all text-[11px] font-semibold text-brand-text">{selectedLog.user}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Vai trò</dt><dd className="mt-1 text-[11px] font-semibold text-brand-primary">{ROLE_LABELS[selectedLog.actorRole]}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Thời gian</dt><dd className="mt-1 text-[11px] text-brand-text">{formatDateTime(selectedLog.timestamp)}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Danh mục</dt><dd className="mt-1 text-[11px] text-brand-text">{CATEGORY_LABELS[selectedLog.category]}</dd></div>
                </dl>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-brand-text"><Globe2 className="h-4 w-4 text-brand-primary" /> Nguồn truy cập</h3>
                <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-brand-outline/35 p-4 sm:grid-cols-2">
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Địa chỉ IP</dt><dd className="mt-1 font-mono text-[11px] text-brand-text">{selectedLog.ip}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Vị trí</dt><dd className="mt-1 text-[11px] text-brand-text">{selectedLog.location || 'Không xác định'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Thiết bị / User agent</dt><dd className="mt-1 break-words text-[11px] leading-relaxed text-brand-text">{selectedLog.device || 'Không ghi nhận'}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Session ID</dt><dd className="mt-1 font-mono text-[10px] text-brand-text">{selectedLog.sessionId || '—'}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Request ID</dt><dd className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-brand-text">{selectedLog.requestId || '—'}{selectedLog.requestId && <button type="button" onClick={() => navigator.clipboard.writeText(selectedLog.requestId || '')} title="Sao chép Request ID" className="inline-flex h-6 min-h-0 w-6 min-w-0 items-center justify-center rounded border border-brand-outline/40 bg-brand-surface-high p-0 text-brand-text-muted cursor-pointer"><Copy className="h-3 w-3" /></button>}</dd></div>
                </dl>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-brand-text"><Server className="h-4 w-4 text-brand-primary" /> Đối tượng tác động</h3>
                <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-brand-outline/35 p-4 sm:grid-cols-2">
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Tài nguyên</dt><dd className="mt-1 text-[11px] font-semibold text-brand-text">{selectedLog.resource}</dd></div>
                  <div><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Resource ID</dt><dd className="mt-1 font-mono text-[10px] text-brand-text">{selectedLog.resourceId || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[9px] uppercase tracking-wide text-brand-text-muted">Endpoint / thao tác</dt><dd className="mt-1 font-mono text-[10px] text-brand-text">{selectedLog.method || 'Không ghi nhận'}</dd></div>
                </dl>
              </section>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-brand-text"><RefreshCw className="h-4 w-4 text-brand-primary" /> Dữ liệu thay đổi</h3>
                  <div className="mt-3 overflow-hidden rounded-lg border border-brand-outline/35">
                    <table className="w-full text-left"><thead><tr className="bg-brand-surface-high/50 text-[9px] uppercase tracking-wide text-brand-text-muted"><th className="px-3 py-2.5">Trường</th><th className="px-3 py-2.5">Trước</th><th className="px-3 py-2.5">Sau</th></tr></thead><tbody className="divide-y divide-brand-outline/25">{selectedLog.changes.map((change) => <tr key={`${change.field}-${change.before}`}><td className="px-3 py-2.5 font-mono text-[10px] font-semibold text-brand-text">{change.field}</td><td className="px-3 py-2.5 text-[10px] text-red-500 line-through">{change.before}</td><td className="px-3 py-2.5 text-[10px] font-semibold text-emerald-500">{change.after}</td></tr>)}</tbody></table>
                  </div>
                </section>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-brand-text"><Fingerprint className="h-4 w-4 text-brand-primary" /> Metadata</h3>
                  <div className="mt-3 rounded-lg border border-brand-outline/35 bg-brand-surface-lowest/40 p-4 font-mono text-[10px] leading-6 text-brand-text">
                    {Object.entries(selectedLog.metadata).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(100px,0.7fr)_1.3fr] gap-3"><span className="text-brand-text-muted">{key}</span><span className="break-all">{String(value)}</span></div>)}
                  </div>
                </section>
              )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-brand-outline/40 bg-brand-surface px-5 py-3 sm:px-6 sm:py-4">
              <button type="button" onClick={() => setSelectedLog(null)} className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-brand-on-primary shadow-sm transition-colors hover:bg-brand-primary/90 cursor-pointer sm:w-auto sm:min-w-36">Đóng chi tiết</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
