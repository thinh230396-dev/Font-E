import type { SystemLog } from '../types';

export const AUDIT_LOGS_STORAGE_KEY = 'salonsys_audit_logs';
export const AUDIT_LOGS_UPDATED_EVENT = 'salonsys:audit-logs-updated';

const LEGACY_MOCK_LOG_IDS = new Set([
  'AUD-20260715-001',
  'AUD-20260715-002',
  'AUD-20260715-003',
  'AUD-20260715-004',
  'AUD-20260715-005',
  'AUD-20260715-006',
  'AUD-20260715-007',
  'AUD-20260715-008',
  'AUD-20260715-009'
]);

export const loadAuditLogs = (): SystemLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SystemLog[];
    if (!Array.isArray(parsed)) return [];

    const logs = parsed.filter((log) => !LEGACY_MOCK_LOG_IDS.has(log.id));
    if (logs.length !== parsed.length) {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
    }
    return logs;
  } catch {
    return [];
  }
};

export const saveAuditLogs = (logs: SystemLog[]) => {
  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
  window.dispatchEvent(new CustomEvent<SystemLog[]>(AUDIT_LOGS_UPDATED_EVENT, { detail: logs }));
};

export type NewAuditLog = Pick<SystemLog, 'eventCode' | 'event' | 'description' | 'severity' | 'status' | 'category' | 'resource'>
  & Partial<Omit<SystemLog, 'id' | 'timestamp' | 'eventCode' | 'event' | 'description' | 'severity' | 'status' | 'category' | 'resource'>>;

export const recordAuditLog = (entry: NewAuditLog): SystemLog => {
  const now = new Date();
  const randomToken = Math.random().toString(36).slice(2, 10).toUpperCase();
  const log: SystemLog = {
    id: `AUD-${now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${randomToken.slice(0, 4)}`,
    timestamp: now.toISOString(),
    user: 'superadmin@salonsys.vn',
    actorRole: 'SUPERADMIN',
    ip: '127.0.0.1',
    location: 'Trình duyệt hiện tại',
    device: navigator.userAgent,
    requestId: `REQ-${randomToken}`,
    ...entry
  };
  const nextLogs = [log, ...loadAuditLogs()].slice(0, 2000);
  saveAuditLogs(nextLogs);
  return log;
};
