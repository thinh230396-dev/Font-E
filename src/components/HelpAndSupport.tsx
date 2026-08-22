import BeautifulSelect from './BeautifulSelect';
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  Image as ImageIcon,
  Inbox,
  Mail,
  Maximize2,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Tag,
  Ticket as TicketIcon,
  Timer,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import type { Ticket, TicketHistoryEntry, TicketMessage } from '../types';
import { recordAuditLog } from '../utils/auditLogs';
import { Button, Modal } from './ui';

interface HelpAndSupportProps {
  tickets: Ticket[];
  onTicketsChange: (tickets: Ticket[]) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type SlaFilter = 'ALL' | 'BREACHED' | 'DUE_SOON' | 'ON_TRACK';
type SortMode = 'UPDATED_DESC' | 'CREATED_DESC' | 'PRIORITY_DESC' | 'SLA_ASC';
type DetailTab = 'conversation' | 'history' | 'details';

const PAGE_SIZE = 7;
export const ACTIVE_STATUSES: Ticket['status'][] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'ESCALATED'];

export const SUPPORT_AGENTS = [
  { id: 'SUPERADMIN', name: 'Superadmin', email: 'superadmin@salonsys.vn', team: 'SECURITY' as const }
];

export const STATUS_CONFIG: Record<Ticket['status'], { label: string; className: string }> = {
  OPEN: { label: 'Mới', className: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  ASSIGNED: { label: 'Đã phân công', className: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  IN_PROGRESS: { label: 'Đang xử lý', className: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  PENDING_CUSTOMER: { label: 'Chờ khách hàng', className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ESCALATED: { label: 'Đã leo thang', className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' },
  RESOLVED: { label: 'Đã giải quyết', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  CLOSED: { label: 'Đã đóng', className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted' }
};

export const PRIORITY_CONFIG: Record<Ticket['priority'], { label: string; weight: number; className: string }> = {
  URGENT: { label: 'Khẩn cấp', weight: 4, className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' },
  HIGH: { label: 'Cao', weight: 3, className: 'border-orange-500/25 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  MEDIUM: { label: 'Trung bình', weight: 2, className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  LOW: { label: 'Thấp', weight: 1, className: 'border-brand-outline bg-brand-surface-high text-brand-text-muted' }
};

export const TEAM_LABELS: Record<Ticket['team'], string> = {
  L1_SUPPORT: 'Hỗ trợ tuyến 1',
  TECHNICAL: 'Kỹ thuật',
  BILLING: 'Thanh toán',
  SECURITY: 'Bảo mật'
};

export const CHANNEL_CONFIG: Record<Ticket['channel'], { label: string; icon: ReactNode }> = {
  EMAIL: { label: 'Email', icon: <Mail className="h-3 w-3" /> },
  CHAT: { label: 'Chat', icon: <MessageSquare className="h-3 w-3" /> },
  PHONE: { label: 'Điện thoại', icon: <Phone className="h-3 w-3" /> },
  SYSTEM: { label: 'Tự động', icon: <Zap className="h-3 w-3" /> }
};

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
  const timePart = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
  return `${datePart} · ${timePart}`;
};

export const formatRelativeTime = (value: string) => {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return `${Math.floor(minutes / 1440)} ngày trước`;
};

export const formatDuration = (minutes: number) => {
  const absolute = Math.abs(Math.round(minutes));
  if (absolute < 60) return `${absolute} phút`;
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  if (hours < 24) return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`;
};

export const isActive = (ticket: Ticket) => ACTIVE_STATUSES.includes(ticket.status);

export const getSlaState = (ticket: Ticket) => {
  if (!isActive(ticket)) {
    return { key: 'ON_TRACK' as const, label: 'Đã hoàn tất', detail: 'SLA đã kết thúc', className: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' };
  }

  const now = Date.now();
  const firstResponseTarget = !ticket.firstRespondedAt ? new Date(ticket.firstResponseDueAt).getTime() : Number.POSITIVE_INFINITY;
  const resolutionTarget = new Date(ticket.resolutionDueAt).getTime();
  const target = Math.min(firstResponseTarget, resolutionTarget);
  const remainingMinutes = (target - now) / 60000;
  const targetName = target === firstResponseTarget ? 'phản hồi đầu tiên' : 'xử lý';

  if (remainingMinutes < 0) {
    return {
      key: 'BREACHED' as const,
      label: 'Quá hạn SLA',
      detail: `Quá ${formatDuration(remainingMinutes)} · ${targetName}`,
      className: 'text-red-600 dark:text-red-400',
      bar: 'bg-red-500'
    };
  }
  if (remainingMinutes <= 120) {
    return {
      key: 'DUE_SOON' as const,
      label: 'Sắp đến hạn',
      detail: `Còn ${formatDuration(remainingMinutes)} · ${targetName}`,
      className: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-amber-500'
    };
  }
  return {
    key: 'ON_TRACK' as const,
    label: 'Đúng SLA',
    detail: `Còn ${formatDuration(remainingMinutes)} · ${targetName}`,
    className: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500'
  };
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold ${className}`}>{children}</span>;
}

function ConversationMessage({
  message,
  requesterName,
  tenantName,
  onImageClick
}: {
  message: TicketMessage;
  requesterName: string;
  tenantName: string;
  onImageClick?: (att: { id: string; name: string; size?: string; url?: string; type?: string }) => void;
}) {
  const isInternal = message.type === 'INTERNAL_NOTE';
  const isSystem = message.type === 'SYSTEM_EVENT' || message.authorRole === 'SYSTEM';
  const isCustomer = message.authorRole === 'TENANT_ADMIN';
  const isSupport = message.authorRole === 'SUPERADMIN' || message.authorRole === 'SUPPORT';
  const initials = message.authorName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (isSystem) {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-brand-outline/35" />
        <div className="max-w-xl rounded-full border border-brand-outline/40 bg-brand-surface-high px-4 py-2 text-center">
          <p className="text-[10px] font-semibold text-brand-text">{message.body}</p>
          <p className="mt-0.5 text-[9px] text-brand-text-muted">Hệ thống · {formatDateTime(message.createdAt)}</p>
        </div>
        <span className="h-px flex-1 bg-brand-outline/35" />
      </div>
    );
  }

  if (isInternal) {
    return (
      <article className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">{initials || 'NV'}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-extrabold text-brand-text">{message.authorName}</p>
                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">Ghi chú nội bộ</Badge>
              </div>
              <p className="mt-0.5 text-[9px] text-brand-text-muted">{message.authorEmail} · Chỉ đội ngũ vận hành nhìn thấy</p>
            </div>
          </div>
          <time className="text-[9px] text-brand-text-muted">{formatDateTime(message.createdAt)}</time>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-brand-text">{message.body}</p>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {/* Image Grid */}
            {message.attachments.some((att) => att.type?.startsWith('image/') || att.url?.startsWith('data:image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name)) && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {message.attachments
                  .filter((att) => att.type?.startsWith('image/') || att.url?.startsWith('data:image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name))
                  .map((att) => (
                    <div
                      key={att.id}
                      onClick={() => onImageClick?.(att)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-amber-500/30 bg-black/5 dark:bg-black/20"
                    >
                      {att.url ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="h-28 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center bg-amber-100 text-amber-600">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white">
                          <Maximize2 className="h-3 w-3" /> Phóng to
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 truncate bg-black/60 px-2 py-0.5 text-[9px] text-white">
                        {att.name}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {/* Non-image attachments */}
            {message.attachments.some((att) => !(att.type?.startsWith('image/') || att.url?.startsWith('data:image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name))) && (
              <div className="flex flex-wrap gap-2">
                {message.attachments
                  .filter((att) => !(att.type?.startsWith('image/') || att.url?.startsWith('data:image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name)))
                  .map((attachment) => (
                    <div key={attachment.id} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-800 dark:text-amber-200">
                      <Paperclip className="h-3.5 w-3.5 text-amber-600" />
                      <span className="font-bold">{attachment.name}</span>
                      <span className="opacity-75">{attachment.size}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </article>
    );
  }

  const imageAttachments = (message.attachments || []).filter((att) => att.type?.startsWith('image/') || att.url?.startsWith('data:image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name));
  const fileAttachments = (message.attachments || []).filter((att) => !(att.type?.startsWith('image/') || att.url?.startsWith('data:image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name)));

  return (
    <article className={`flex items-end gap-2.5 ${isSupport ? 'justify-end' : 'justify-start'}`}>
      {isCustomer && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-extrabold text-sky-600 dark:text-sky-400">{initials || 'KH'}</div>}
      <div className={`w-fit max-w-[86%] rounded-2xl border p-4 sm:max-w-[78%] ${isSupport ? 'rounded-br-md border-brand-primary/25 bg-brand-primary/[0.07]' : 'rounded-bl-md border-sky-500/25 bg-sky-500/[0.05]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-extrabold text-brand-text">{message.authorName}</p>
              <Badge className={isCustomer ? 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary'}>{isCustomer ? 'Tin nhắn khách hàng' : 'Phản hồi công khai'}</Badge>
            </div>
            <p className="mt-1 text-[9px] font-semibold text-brand-text-muted">{isCustomer ? tenantName : 'Đội ngũ hỗ trợ · Superadmin'}</p>
          </div>
          <time className="text-[9px] text-brand-text-muted">{formatDateTime(message.createdAt)}</time>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-brand-text">{message.body}</p>

        {/* Render Image Grid */}
        {imageAttachments.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {imageAttachments.map((att) => (
              <div
                key={att.id}
                onClick={() => onImageClick?.(att)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-brand-outline/40 bg-black/5 dark:bg-black/20"
              >
                {att.url ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-28 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center bg-brand-surface-high text-brand-text-muted">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white">
                    <Maximize2 className="h-3 w-3" /> Phóng to
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 truncate bg-black/60 px-2 py-0.5 text-[9px] text-white">
                  {att.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Render Non-image attachments */}
        {fileAttachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {fileAttachments.map((attachment) => (
              <div key={attachment.id} className="inline-flex items-center gap-2 rounded-lg border border-brand-outline/40 bg-brand-surface px-3 py-2 text-[10px] text-brand-text">
                <Paperclip className="h-3.5 w-3.5 text-brand-primary" />
                <span className="font-bold">{attachment.name}</span>
                <span className="text-brand-text-muted">{attachment.size}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-brand-outline/25 pt-2 text-[9px] text-brand-text-muted">
          <span>{message.authorEmail}</span>
          <span className="inline-flex items-center gap-1.5">{isCustomer ? <><Inbox className="h-3 w-3" /> Tin nhắn đến từ {requesterName}</> : <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Đã gửi tới khách hàng</>}</span>
        </div>
      </div>
      {isSupport && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-[11px] font-extrabold text-brand-primary">{initials || 'SA'}</div>}
    </article>
  );
}

function MetricCard({ icon, label, value, detail, tone = 'primary' }: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: 'primary' | 'warning' | 'danger' | 'success';
}) {
  const toneClass = {
    primary: 'bg-brand-primary/10 text-brand-primary',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  }[tone];
  return (
    <div className="rounded-xl border border-brand-outline/40 bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-brand-text">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{detail}</p>
    </div>
  );
}

export default function HelpAndSupport({ tickets, onTicketsChange, showConfirm }: HelpAndSupportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Ticket['status']>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Ticket['priority']>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<'ALL' | 'UNASSIGNED' | string>('ALL');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('UPDATED_DESC');
  const [page, setPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('conversation');
  const [replyType, setReplyType] = useState<'PUBLIC_REPLY' | 'INTERNAL_NOTE'>('PUBLIC_REPLY');
  const [replyText, setReplyText] = useState('');
  const [replyAttachedFiles, setReplyAttachedFiles] = useState<Array<{ id: string; name: string; size: string; url?: string; type?: string }>>([]);
  const [previewImage, setPreviewImage] = useState<{ id?: string; name: string; size?: string; url?: string } | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to process files into data URLs
  const processFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    list.forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };

      if (isImg) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setReplyAttachedFiles((prev) => [
            ...prev,
            {
              id: 'ATT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
              name: file.name,
              size: formatSize(file.size),
              url: dataUrl,
              type: file.type
            }
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setReplyAttachedFiles((prev) => [
          ...prev,
          {
            id: 'ATT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
            name: file.name,
            size: formatSize(file.size),
            type: file.type
          }
        ]);
      }
    });
  };

  const handlePasteReply = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      const imageFiles = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        processFiles(imageFiles);
      }
    }
  };

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTenantName, setCreateTenantName] = useState('');
  const [createRequesterName, setCreateRequesterName] = useState('');
  const [createRequesterEmail, setCreateRequesterEmail] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createCategory, setCreateCategory] = useState('Kỹ thuật');
  const [createPriority, setCreatePriority] = useState<Ticket['priority']>('MEDIUM');
  const [createDescription, setCreateDescription] = useState('');

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || null;
  const categories = useMemo(() => Array.from(new Set(tickets.map((ticket) => ticket.category))).sort(), [tickets]);

  /* Khóa cuộn nền trước đây tự xử lý ở đây; nay `ui/Modal` lo, cùng với Escape,
     bẫy focus và trả focus về nút đã mở hộp thoại. */

  const metrics = useMemo(() => {
    const activeTickets = tickets.filter(isActive);
    const breached = activeTickets.filter((ticket) => getSlaState(ticket).key === 'BREACHED').length;
    const unassigned = activeTickets.filter((ticket) => !ticket.assignedTo).length;
    const responded = tickets.filter((ticket) => ticket.firstRespondedAt);
    const responseWithinSla = responded.filter((ticket) => new Date(ticket.firstRespondedAt!).getTime() <= new Date(ticket.firstResponseDueAt).getTime()).length;
    return {
      active: activeTickets.length,
      breached,
      unassigned,
      responseRate: responded.length ? Math.round((responseWithinSla / responded.length) * 100) : 100
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...tickets]
      .filter((ticket) => {
        const searchable = [ticket.id, ticket.tenantName, ticket.subject, ticket.requesterName, ticket.requesterEmail, ...(ticket.tags || [])].join(' ').toLowerCase();
        return (!query || searchable.includes(query))
          && (statusFilter === 'ALL' || ticket.status === statusFilter)
          && (priorityFilter === 'ALL' || ticket.priority === priorityFilter)
          && (categoryFilter === 'ALL' || ticket.category === categoryFilter)
          && (assigneeFilter === 'ALL' || (assigneeFilter === 'UNASSIGNED' ? !ticket.assignedTo : ticket.assignedTo?.id === assigneeFilter))
          && (slaFilter === 'ALL' || getSlaState(ticket).key === slaFilter);
      })
      .sort((a, b) => {
        if (sortMode === 'PRIORITY_DESC') return PRIORITY_CONFIG[b.priority].weight - PRIORITY_CONFIG[a.priority].weight;
        if (sortMode === 'SLA_ASC') return new Date(a.resolutionDueAt).getTime() - new Date(b.resolutionDueAt).getTime();
        if (sortMode === 'CREATED_DESC') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [assigneeFilter, categoryFilter, priorityFilter, searchQuery, slaFilter, sortMode, statusFilter, tickets]);

  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const visibleTickets = filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [assigneeFilter, categoryFilter, priorityFilter, searchQuery, slaFilter, sortMode, statusFilter]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const updateTicket = (id: string, updater: (ticket: Ticket) => Ticket) => {
    onTicketsChange(tickets.map((ticket) => ticket.id === id ? updater(ticket) : ticket));
  };

  const addHistory = (ticket: Ticket, action: string, detail: string): TicketHistoryEntry[] => [
    ...(ticket.history || []),
    { id: createId('HIS'), action, detail, actor: 'Superadmin', createdAt: new Date().toISOString() }
  ];

  const handleAssignment = (ticket: Ticket, agentId: string) => {
    const previous = ticket.assignedTo?.name || 'Chưa phân công';
    const agent = SUPPORT_AGENTS.find((item) => item.id === agentId);
    const nextStatus = !isActive(ticket) ? ticket.status : agent && ticket.status === 'OPEN' ? 'ASSIGNED' : ticket.status;
    updateTicket(ticket.id, (current) => ({
      ...current,
      assignedTo: agent ? { id: agent.id, name: agent.name, email: agent.email } : undefined,
      team: agent?.team || current.team,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      history: addHistory(current, agent ? 'Phân công ticket' : 'Bỏ phân công', `${previous} → ${agent?.name || 'Chưa phân công'}`)
    }));
    recordAuditLog({
      eventCode: 'SUPPORT.TICKET.ASSIGNED', event: 'Cập nhật người xử lý ticket',
      description: `${ticket.id}: ${previous} → ${agent?.name || 'Chưa phân công'}.`, severity: 'medium', status: 'success', category: 'SUPPORT',
      resource: `Ticket ${ticket.id}`, resourceId: ticket.id, method: `CLIENT /support/tickets/${ticket.id}/assignment`,
      changes: [{ field: 'assignedTo', before: previous, after: agent?.name || 'Chưa phân công' }]
    });
  };

  const handleStatusChange = (ticket: Ticket, status: Ticket['status']) => {
    if (ticket.status === status) return;
    const now = new Date().toISOString();
    updateTicket(ticket.id, (current) => ({
      ...current,
      status,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? current.resolvedAt || now : undefined,
      updatedAt: now,
      history: addHistory(current, 'Đổi trạng thái', `${STATUS_CONFIG[current.status].label} → ${STATUS_CONFIG[status].label}`)
    }));
    recordAuditLog({
      eventCode: 'SUPPORT.TICKET.STATUS.UPDATED', event: 'Cập nhật trạng thái ticket',
      description: `${ticket.id}: ${STATUS_CONFIG[ticket.status].label} → ${STATUS_CONFIG[status].label}.`, severity: status === 'ESCALATED' ? 'high' : 'medium', status: 'success', category: 'SUPPORT',
      resource: `Ticket ${ticket.id}`, resourceId: ticket.id, method: `CLIENT /support/tickets/${ticket.id}`,
      changes: [{ field: 'status', before: ticket.status, after: status }]
    });
  };

  const handlePriorityChange = (ticket: Ticket, priority: Ticket['priority']) => {
    if (ticket.priority === priority) return;
    updateTicket(ticket.id, (current) => ({
      ...current,
      priority,
      updatedAt: new Date().toISOString(),
      history: addHistory(current, 'Đổi độ ưu tiên', `${PRIORITY_CONFIG[current.priority].label} → ${PRIORITY_CONFIG[priority].label}`)
    }));
    recordAuditLog({
      eventCode: 'SUPPORT.TICKET.PRIORITY.UPDATED', event: 'Cập nhật ưu tiên ticket',
      description: `${ticket.id}: ${PRIORITY_CONFIG[ticket.priority].label} → ${PRIORITY_CONFIG[priority].label}.`, severity: priority === 'URGENT' ? 'high' : 'medium', status: 'success', category: 'SUPPORT',
      resource: `Ticket ${ticket.id}`, resourceId: ticket.id, method: `CLIENT /support/tickets/${ticket.id}`,
      changes: [{ field: 'priority', before: ticket.priority, after: priority }]
    });
  };

  const handleSendReply = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || (!replyText.trim() && replyAttachedFiles.length === 0)) return;
    const now = new Date().toISOString();
    const message: TicketMessage = {
      id: createId('MSG'),
      authorName: 'Superadmin',
      authorEmail: 'superadmin@salonsys.vn',
      authorRole: 'SUPERADMIN',
      type: replyType,
      body: replyText.trim() || (replyAttachedFiles.length > 0 ? 'Đã đính kèm tệp / hình ảnh' : ''),
      createdAt: now,
      attachments: replyAttachedFiles.length > 0 ? [...replyAttachedFiles] : undefined
    };
    updateTicket(selectedTicket.id, (current) => ({
      ...current,
      messages: [...(current.messages || []), message],
      firstRespondedAt: replyType === 'PUBLIC_REPLY' ? current.firstRespondedAt || now : current.firstRespondedAt,
      status: replyType === 'PUBLIC_REPLY' && ['OPEN', 'ASSIGNED'].includes(current.status) ? 'IN_PROGRESS' : current.status,
      updatedAt: now,
      history: addHistory(current, replyType === 'PUBLIC_REPLY' ? 'Gửi phản hồi' : 'Thêm ghi chú nội bộ', replyType === 'PUBLIC_REPLY' ? 'Đã gửi phản hồi đến khách hàng.' : 'Đã thêm ghi chú chỉ đội ngũ nội bộ có thể xem.')
    }));
    recordAuditLog({
      eventCode: replyType === 'PUBLIC_REPLY' ? 'SUPPORT.TICKET.REPLIED' : 'SUPPORT.TICKET.NOTE.ADDED',
      event: replyType === 'PUBLIC_REPLY' ? 'Phản hồi ticket hỗ trợ' : 'Thêm ghi chú nội bộ',
      description: `${selectedTicket.id}: ${replyType === 'PUBLIC_REPLY' ? 'đã gửi phản hồi công khai' : 'đã thêm ghi chú nội bộ'}.`,
      severity: 'low', status: 'success', category: 'SUPPORT', resource: `Ticket ${selectedTicket.id}`, resourceId: selectedTicket.id,
      method: `CLIENT /support/tickets/${selectedTicket.id}/messages`, metadata: { messageType: replyType }
    });
    setReplyText('');
    setReplyAttachedFiles([]);
  };

  const handleResolve = (ticket: Ticket) => {
    showConfirm(
      'Xác nhận giải quyết ticket',
      `Đánh dấu ${ticket.id} là đã giải quyết? Thao tác sẽ kết thúc bộ đếm SLA nhưng ticket vẫn có thể được mở lại.`,
      () => handleStatusChange(ticket, 'RESOLVED')
    );
  };

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredTickets.map((ticket) => [
      ticket.id, ticket.tenantId, ticket.tenantName, ticket.requesterName, ticket.requesterEmail, ticket.subject,
      ticket.category, CHANNEL_CONFIG[ticket.channel].label, PRIORITY_CONFIG[ticket.priority].label,
      STATUS_CONFIG[ticket.status].label, ticket.assignedTo?.name || 'Chưa phân công', TEAM_LABELS[ticket.team],
      getSlaState(ticket).label, formatDateTime(ticket.createdAt), formatDateTime(ticket.updatedAt)
    ]);
    const header = ['Mã ticket', 'Mã tenant', 'Tenant', 'Người yêu cầu', 'Email', 'Chủ đề', 'Danh mục', 'Kênh', 'Ưu tiên', 'Trạng thái', 'Người xử lý', 'Nhóm', 'SLA', 'Tạo lúc', 'Cập nhật lúc'];
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    recordAuditLog({
      eventCode: 'SUPPORT.TICKETS.EXPORTED', event: 'Xuất danh sách ticket hỗ trợ',
      description: `Superadmin đã xuất ${filteredTickets.length} ticket theo bộ lọc hiện tại.`, severity: 'medium', status: 'success', category: 'SUPPORT',
      resource: 'Hàng chờ hỗ trợ', method: 'CLIENT /support/tickets/export', metadata: { ticketCount: filteredTickets.length, format: 'csv' }
    });
  };

  const handleCreateTicketSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!createSubject.trim() || !createDescription.trim()) return;

    const now = new Date();
    const isUrgent = createPriority === 'URGENT';
    const isHigh = createPriority === 'HIGH';
    
    // SLA calculation: response time & resolution time
    const responseMinutes = isUrgent ? 15 : isHigh ? 60 : 240;
    const resolutionHours = isUrgent ? 4 : isHigh ? 24 : 72;

    const firstResponseDueAt = new Date(now.getTime() + responseMinutes * 60000).toISOString();
    const resolutionDueAt = new Date(now.getTime() + resolutionHours * 3600000).toISOString();

    const newTicket: Ticket = {
      id: createId('TCK'),
      tenantId: 'TEN-MANUAL',
      tenantName: createTenantName.trim() || 'Hệ thống / Chung',
      requesterName: createRequesterName.trim() || 'Superadmin Support Desk',
      requesterEmail: createRequesterEmail.trim() || 'superadmin@salonsys.vn',
      plan: 'Enterprise',
      subject: createSubject.trim(),
      description: createDescription.trim(),
      category: createCategory,
      priority: createPriority,
      status: 'OPEN',
      channel: 'SYSTEM',
      team: 'TECHNICAL',
      firstResponseDueAt,
      resolutionDueAt,
      tags: ['superadmin-created', createCategory.toLowerCase()],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: [
        {
          id: createId('MSG'),
          authorName: createRequesterName.trim() || 'Superadmin Support Desk',
          authorEmail: createRequesterEmail.trim() || 'superadmin@salonsys.vn',
          authorRole: 'SUPERADMIN',
          body: createDescription.trim(),
          createdAt: now.toISOString(),
          type: 'PUBLIC_REPLY'
        }
      ],
      history: [
        {
          id: createId('HIS'),
          action: 'Tạo ticket mới',
          detail: 'Ticket được khởi tạo bởi Superadmin qua Trung tâm hỗ trợ.',
          actor: 'Superadmin',
          createdAt: now.toISOString()
        }
      ]
    };

    onTicketsChange([newTicket, ...tickets]);
    recordAuditLog({
      eventCode: 'SUPPORT.TICKETS.CREATED',
      event: 'Khởi tạo ticket hỗ trợ',
      description: `Superadmin đã tạo ticket ${newTicket.id} cho ${newTicket.tenantName}.`,
      severity: 'low',
      status: 'success',
      category: 'SUPPORT',
      resource: `Ticket ${newTicket.id}`,
      resourceId: newTicket.id,
      method: 'CLIENT /support/tickets/create'
    });

    // Reset and close
    setCreateTenantName('');
    setCreateRequesterName('');
    setCreateRequesterEmail('');
    setCreateSubject('');
    setCreateDescription('');
    setShowCreateModal(false);
    setSelectedTicketId(newTicket.id);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setAssigneeFilter('ALL');
    setSlaFilter('ALL');
    setSortMode('UPDATED_DESC');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-brand-text sm:text-2xl">Trung tâm hỗ trợ</h1>
              <p className="mt-0.5 text-xs text-brand-text-muted">Điều phối ticket, kiểm soát SLA và giám sát chất lượng hỗ trợ toàn hệ thống.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={exportCsv}
            className="text-xs font-bold"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Xuất CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="text-xs font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo ticket mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Inbox className="h-4 w-4" />} label="Đang chờ xử lý" value={metrics.active} detail={`${tickets.filter((ticket) => ticket.status === 'OPEN').length} ticket mới chưa tiếp nhận`} />
        <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Vi phạm SLA" value={metrics.breached} detail="Cần can thiệp hoặc điều phối ngay" tone={metrics.breached ? 'danger' : 'success'} />
        <MetricCard icon={<UserCheck className="h-4 w-4" />} label="Chưa phân công" value={metrics.unassigned} detail="Ticket chưa có người chịu trách nhiệm" tone={metrics.unassigned ? 'warning' : 'success'} />
        <MetricCard icon={<BarChart3 className="h-4 w-4" />} label="Phản hồi đúng SLA" value={`${metrics.responseRate}%`} detail="Tỷ lệ phản hồi đầu tiên đúng hạn" tone={metrics.responseRate >= 90 ? 'success' : 'warning'} />
      </div>

      {metrics.breached > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400"><Timer className="h-4 w-4" /></div>
            <div>
              <p className="text-xs font-extrabold text-brand-text">Có {metrics.breached} ticket đã vi phạm cam kết SLA</p>
              <p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">Ưu tiên phản hồi ticket chưa có phản hồi đầu tiên, sau đó điều phối các ticket đã quá hạn xử lý.</p>
            </div>
          </div>
          <button onClick={() => setSlaFilter('BREACHED')} className="whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white">Xem ticket quá hạn</button>
        </div>
      )}

      <div className="rounded-xl border border-brand-outline/40 bg-brand-surface shadow-sm">
        <div className="border-b border-brand-outline/35 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm mã ticket, tenant, người gửi, chủ đề hoặc tag..." className="form-control pl-9" />
            </div>
            <BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | Ticket['status'])} className="form-control">
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
            </BeautifulSelect>
            <BeautifulSelect value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'ALL' | Ticket['priority'])} className="form-control">
              <option value="ALL">Tất cả độ ưu tiên</option>
              {Object.entries(PRIORITY_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
            </BeautifulSelect>
            <BeautifulSelect value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-control">
              <option value="ALL">Tất cả danh mục</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </BeautifulSelect>
            <BeautifulSelect value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="form-control">
              <option value="ALL">Tất cả người xử lý</option>
              <option value="UNASSIGNED">Chưa phân công</option>
              {SUPPORT_AGENTS.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </BeautifulSelect>
            <BeautifulSelect value={slaFilter} onChange={(event) => setSlaFilter(event.target.value as SlaFilter)} className="form-control">
              <option value="ALL">Tất cả trạng thái SLA</option>
              <option value="BREACHED">Quá hạn SLA</option>
              <option value="DUE_SOON">Sắp đến hạn</option>
              <option value="ON_TRACK">Đúng SLA</option>
            </BeautifulSelect>
            <BeautifulSelect value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="form-control">
              <option value="UPDATED_DESC">Cập nhật gần nhất</option>
              <option value="CREATED_DESC">Mới tạo gần nhất</option>
              <option value="PRIORITY_DESC">Ưu tiên cao trước</option>
              <option value="SLA_ASC">SLA gần nhất</option>
            </BeautifulSelect>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-brand-text-muted">Hiển thị <strong className="text-brand-text">{filteredTickets.length}</strong> / {tickets.length} ticket</p>
            <button onClick={resetFilters} className="min-h-0 border-0 bg-transparent px-2 py-1 text-[10px] font-bold text-brand-primary shadow-none">Đặt lại bộ lọc</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/60 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
                <th className="px-4 py-3">Ticket / Tenant</th>
                <th className="px-4 py-3">Yêu cầu</th>
                <th className="px-4 py-3">Ưu tiên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Người xử lý</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3 text-right">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-outline/25 text-xs">
              {visibleTickets.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center"><Inbox className="mx-auto h-8 w-8 text-brand-text-muted/50" /><p className="mt-3 font-bold text-brand-text">Không tìm thấy ticket</p><p className="mt-1 text-[10px] text-brand-text-muted">Thử thay đổi từ khóa hoặc bộ lọc.</p></td></tr>
              ) : visibleTickets.map((ticket) => {
                const sla = getSlaState(ticket);
                return (
                  <tr key={ticket.id} onClick={() => { setSelectedTicketId(ticket.id); setDetailTab('conversation'); }} className="cursor-pointer transition-colors hover:bg-brand-surface-high/45">
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-[10px] font-bold text-brand-primary">{ticket.id}</p>
                      <p className="mt-1 max-w-[180px] truncate font-bold text-brand-text">{ticket.tenantName}</p>
                      <p className="mt-0.5 text-[10px] text-brand-text-muted">{ticket.plan}</p>
                    </td>
                    <td className="max-w-[320px] px-4 py-3.5">
                      <p className="truncate font-bold text-brand-text">{ticket.subject}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-brand-text-muted"><span className="inline-flex items-center gap-1">{CHANNEL_CONFIG[ticket.channel].icon}{CHANNEL_CONFIG[ticket.channel].label}</span><span>•</span><span className="truncate">{ticket.category}</span></div>
                    </td>
                    <td className="px-4 py-3.5"><Badge className={PRIORITY_CONFIG[ticket.priority].className}>{PRIORITY_CONFIG[ticket.priority].label}</Badge></td>
                    <td className="px-4 py-3.5"><Badge className={STATUS_CONFIG[ticket.status].className}>{STATUS_CONFIG[ticket.status].label}</Badge></td>
                    <td className="px-4 py-3.5">
                      {ticket.assignedTo ? <><p className="font-bold text-brand-text">{ticket.assignedTo.name}</p><p className="mt-0.5 text-[10px] text-brand-text-muted">{TEAM_LABELS[ticket.team]}</p></> : <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Chưa phân công</span>}
                    </td>
                    <td className="px-4 py-3.5"><p className={`font-bold ${sla.className}`}>{sla.label}</p><p className="mt-0.5 text-[10px] text-brand-text-muted">{sla.detail}</p></td>
                    <td className="px-4 py-3.5 text-right"><p className="font-medium text-brand-text">{formatRelativeTime(ticket.updatedAt)}</p><p className="mt-0.5 text-[10px] text-brand-text-muted">{formatDateTime(ticket.updatedAt)}</p></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-brand-outline/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-brand-text-muted">Trang {page} / {pageCount} · {filteredTickets.length} kết quả</p>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {selectedTicket && (
        <Modal
          open
          onClose={() => setSelectedTicketId(null)}
          title={selectedTicket.subject}
          size="fullscreen"
          /* Ô trả lời có thể đang soạn dở, nên bấm ra nền không được đóng. */
          closeOnBackdrop={false}
          bodyClassName="!p-0"
          eyebrow={selectedTicket.id}
          headerAside={
            <span className="flex flex-wrap items-center gap-2"><Badge className={PRIORITY_CONFIG[selectedTicket.priority].className}>{PRIORITY_CONFIG[selectedTicket.priority].label}</Badge><Badge className={STATUS_CONFIG[selectedTicket.status].className}>{STATUS_CONFIG[selectedTicket.status].label}</Badge></span>
          }
          description={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-brand-text">{selectedTicket.tenantName}</span>
              <span aria-hidden="true">•</span>
              <span>{selectedTicket.requesterName}</span>
              <span aria-hidden="true">•</span>
              <span>Tạo {formatDateTime(selectedTicket.createdAt)}</span>
              <span aria-hidden="true">•</span>
              <span>Cập nhật {formatRelativeTime(selectedTicket.updatedAt)}</span>
            </span>
          }
        >

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:overflow-hidden">
            <div className="order-first shrink-0 border-b border-brand-outline/35 bg-brand-surface-lowest/35 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-l">
              <section className="border-b border-brand-outline/35 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-extrabold text-brand-text"><UserCheck className="h-4 w-4 text-brand-primary" /> Thiết lập xử lý</h3>
                    <p className="mt-1 text-[9px] text-brand-text-muted">Phân công người phụ trách, độ ưu tiên và bước xử lý hiện tại.</p>
                  </div>
                  {isActive(selectedTicket) && (
                    <button type="button" onClick={() => handleResolve(selectedTicket)} className="support-resolve-button inline-flex min-h-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đánh dấu đã giải quyết
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Người xử lý</label><BeautifulSelect value={selectedTicket.assignedTo?.id || ''} onChange={(event) => handleAssignment(selectedTicket, event.target.value)} className="form-control h-10"><option value="">Chưa phân công</option>{SUPPORT_AGENTS.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</BeautifulSelect></div>
                  <div><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Độ ưu tiên</label><BeautifulSelect value={selectedTicket.priority} onChange={(event) => handlePriorityChange(selectedTicket, event.target.value as Ticket['priority'])} className="form-control h-10">{Object.entries(PRIORITY_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</BeautifulSelect></div>
                  <div><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Trạng thái</label><BeautifulSelect value={selectedTicket.status} onChange={(event) => handleStatusChange(selectedTicket, event.target.value as Ticket['status'])} className="form-control h-10">{Object.entries(STATUS_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</BeautifulSelect></div>
                </div>
              </section>
              <section className="p-4">
                <div className="mb-3">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold text-brand-text"><Timer className="h-4 w-4 text-brand-primary" /> Theo dõi SLA</h3>
                  <p className="mt-1 text-[9px] text-brand-text-muted">Ưu tiên xử lý theo mốc thời gian gần nhất.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    const responseDiff = (new Date(selectedTicket.firstResponseDueAt).getTime() - Date.now()) / 60000;
                    const resolutionDiff = (new Date(selectedTicket.resolutionDueAt).getTime() - Date.now()) / 60000;
                    return <>
                      <div className="rounded-lg border border-brand-outline/35 bg-brand-surface p-3"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-brand-text-muted"><Clock3 className="h-3.5 w-3.5" /> Phản hồi đầu tiên</div><p className={`mt-1.5 text-[11px] font-extrabold ${selectedTicket.firstRespondedAt ? 'text-emerald-600 dark:text-emerald-400' : responseDiff < 0 ? 'text-red-600 dark:text-red-400' : 'text-brand-text'}`}>{selectedTicket.firstRespondedAt ? 'Đã phản hồi' : responseDiff < 0 ? `Quá ${formatDuration(responseDiff)}` : `Còn ${formatDuration(responseDiff)}`}</p><p className="mt-1 text-[9px] text-brand-text-muted">{selectedTicket.firstRespondedAt ? formatDateTime(selectedTicket.firstRespondedAt) : `Hạn ${formatDateTime(selectedTicket.firstResponseDueAt)}`}</p></div>
                      <div className="rounded-lg border border-brand-outline/35 bg-brand-surface p-3"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-brand-text-muted"><Timer className="h-3.5 w-3.5" /> Hoàn tất xử lý</div><p className={`mt-1.5 text-[11px] font-extrabold ${selectedTicket.resolvedAt ? 'text-emerald-600 dark:text-emerald-400' : resolutionDiff < 0 ? 'text-red-600 dark:text-red-400' : resolutionDiff <= 120 ? 'text-amber-600 dark:text-amber-400' : 'text-brand-text'}`}>{selectedTicket.resolvedAt ? 'Đã hoàn tất' : resolutionDiff < 0 ? `Quá ${formatDuration(resolutionDiff)}` : `Còn ${formatDuration(resolutionDiff)}`}</p><p className="mt-1 text-[9px] text-brand-text-muted">{selectedTicket.resolvedAt ? formatDateTime(selectedTicket.resolvedAt) : `Hạn ${formatDateTime(selectedTicket.resolutionDueAt)}`}</p></div>
                    </>;
                  })()}
                </div>
              </section>
            </div>

            <div className="flex shrink-0 items-end justify-between gap-3 border-b border-brand-outline/35 px-4 pt-2 sm:px-5 lg:col-start-1 lg:row-start-1">
              {([
                ['conversation', 'Trao đổi', MessageSquare],
                ['history', 'Lịch sử', Clock3],
                ['details', 'Thông tin', FileText]
              ] as const).map(([tab, label, Icon]) => <button key={tab} onClick={() => setDetailTab(tab)} className={`flex items-center gap-1.5 rounded-b-none border-0 bg-transparent px-3 py-2.5 text-xs font-bold shadow-none transition-colors ${detailTab === tab ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}><Icon className="h-3.5 w-3.5" /><span>{label}</span></button>)}
            </div>

            <div className="min-h-80 flex-none overflow-y-auto overscroll-contain p-4 sm:p-5 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:flex-1">
              {detailTab === 'conversation' && (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-brand-outline/40 bg-brand-surface-high/25 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-outline/30 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-brand-primary" />
                          <h3 className="text-sm font-extrabold text-brand-text">Phiên trò chuyện hỗ trợ</h3>
                        </div>
                        <p className="mt-1 text-[9px] text-brand-text-muted">Mã phiên {selectedTicket.id} · Hiển thị theo thứ tự từ cũ đến mới</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={STATUS_CONFIG[selectedTicket.status].className}>{STATUS_CONFIG[selectedTicket.status].label}</Badge>
                        <Badge className="gap-1.5 border-brand-outline bg-brand-surface text-brand-text-muted">{CHANNEL_CONFIG[selectedTicket.channel].icon}{CHANNEL_CONFIG[selectedTicket.channel].label}</Badge>
                        <Badge className="border-brand-outline bg-brand-surface text-brand-text-muted">{(selectedTicket.messages || []).length} tin nhắn</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-3 sm:grid-cols-3">
                      <div className="flex items-center gap-2.5 rounded-xl bg-brand-surface px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-extrabold text-sky-600 dark:text-sky-400">{selectedTicket.requesterName.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase()}</div>
                        <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Khách hàng</p><p className="mt-0.5 truncate text-[11px] font-extrabold text-brand-text">{selectedTicket.requesterName}</p><p className="truncate text-[9px] text-brand-text-muted">{selectedTicket.tenantName}</p></div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-xl bg-brand-surface px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary"><Headphones className="h-3.5 w-3.5" /></div>
                        <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Người xử lý</p><p className="mt-0.5 truncate text-[11px] font-extrabold text-brand-text">{selectedTicket.assignedTo?.name || 'Chưa phân công'}</p><p className="truncate text-[9px] text-brand-text-muted">{TEAM_LABELS[selectedTicket.team]}</p></div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-xl bg-brand-surface px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">{CHANNEL_CONFIG[selectedTicket.channel].icon}</div>
                        <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">Kênh trao đổi</p><p className="mt-0.5 truncate text-[11px] font-extrabold text-brand-text">{CHANNEL_CONFIG[selectedTicket.channel].label}</p><p className="truncate text-[9px] text-brand-text-muted">Cập nhật {formatRelativeTime(selectedTicket.updatedAt)}</p></div>
                      </div>
                    </div>
                  </section>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-brand-outline/30" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">Bắt đầu phiên · {formatDateTime(selectedTicket.createdAt)}</span>
                    <span className="h-px flex-1 bg-brand-outline/30" />
                  </div>

                  <article className="rounded-2xl border border-brand-primary/25 bg-brand-primary/[0.06] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary"><TicketIcon className="h-4 w-4" /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-extrabold text-brand-text">{selectedTicket.requesterName}</p>
                            <Badge className="border-brand-primary/25 bg-brand-primary/10 text-brand-primary">Yêu cầu ban đầu</Badge>
                          </div>
                          <p className="mt-0.5 text-[9px] text-brand-text-muted">{selectedTicket.requesterEmail} · {selectedTicket.tenantName}</p>
                        </div>
                      </div>
                      <time className="text-[9px] text-brand-text-muted">{formatDateTime(selectedTicket.createdAt)}</time>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-brand-text">{selectedTicket.description}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-brand-primary/15 pt-2 text-[9px] text-brand-text-muted">
                      <span>Danh mục: <strong className="text-brand-text">{selectedTicket.category}</strong></span>
                      <span>Ưu tiên: <strong className="text-brand-text">{PRIORITY_CONFIG[selectedTicket.priority].label}</strong></span>
                      <span>Kênh: <strong className="text-brand-text">{CHANNEL_CONFIG[selectedTicket.channel].label}</strong></span>
                    </div>
                  </article>

                  {(selectedTicket.messages || []).map((message) => (
                    <ConversationMessage
                      key={message.id}
                      message={message}
                      requesterName={selectedTicket.requesterName}
                      tenantName={selectedTicket.tenantName}
                      onImageClick={(att) => setPreviewImage(att)}
                    />
                  ))}
                </div>
              )}

              {detailTab === 'history' && (
                <div className="space-y-0">
                  {[...(selectedTicket.history || [])].reverse().map((item, index) => <div key={item.id} className="relative flex gap-3 pb-5">{index < selectedTicket.history.length - 1 && <div className="absolute left-[7px] top-4 h-full w-px bg-brand-outline" />}<div className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-brand-surface bg-brand-primary" /><div><p className="text-xs font-extrabold text-brand-text">{item.action}</p><p className="mt-1 text-[10px] leading-relaxed text-brand-text-muted">{item.detail}</p><p className="mt-1 text-[9px] text-brand-text-muted">{item.actor} · {formatDateTime(item.createdAt)}</p></div></div>)}
                </div>
              )}

              {detailTab === 'details' && (
                <div className="space-y-4">
                  <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-brand-text"><Users className="h-4 w-4 text-brand-primary" /> Người yêu cầu & tenant</div><dl className="grid grid-cols-1 gap-3 text-[10px] sm:grid-cols-2"><div><dt className="text-brand-text-muted">Người liên hệ</dt><dd className="mt-1 font-bold text-brand-text">{selectedTicket.requesterName}</dd></div><div><dt className="text-brand-text-muted">Tenant</dt><dd className="mt-1 font-bold text-brand-text">{selectedTicket.tenantName} · {selectedTicket.plan}</dd></div><div><dt className="text-brand-text-muted">Email</dt><dd className="mt-1 font-bold text-brand-text">{selectedTicket.requesterEmail}</dd></div><div><dt className="text-brand-text-muted">Điện thoại</dt><dd className="mt-1 font-bold text-brand-text">{selectedTicket.requesterPhone || 'Chưa cung cấp'}</dd></div></dl></section>
                  <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-brand-text"><ShieldCheck className="h-4 w-4 text-brand-primary" /> Phân loại vận hành</div><dl className="grid grid-cols-1 gap-3 text-[10px] sm:grid-cols-2"><div><dt className="text-brand-text-muted">Danh mục</dt><dd className="mt-1 font-bold text-brand-text">{selectedTicket.category}</dd></div><div><dt className="text-brand-text-muted">Kênh tiếp nhận</dt><dd className="mt-1 inline-flex items-center gap-1 font-bold text-brand-text">{CHANNEL_CONFIG[selectedTicket.channel].icon}{CHANNEL_CONFIG[selectedTicket.channel].label}</dd></div><div><dt className="text-brand-text-muted">Nhóm phụ trách</dt><dd className="mt-1 font-bold text-brand-text">{TEAM_LABELS[selectedTicket.team]}</dd></div><div><dt className="text-brand-text-muted">Đánh giá CSAT</dt><dd className="mt-1 flex items-center gap-1 font-bold text-brand-text">{selectedTicket.satisfaction ? <>{selectedTicket.satisfaction}/5 <Star className="h-3 w-3 fill-amber-400 text-amber-400" /></> : 'Chưa có'}</dd></div></dl></section>
                  <section className="rounded-xl border border-brand-outline/35 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-brand-text"><Tag className="h-4 w-4 text-brand-primary" /> Tag & liên kết</div><div className="flex flex-wrap gap-2">{(selectedTicket.tags || []).map((tag) => <Badge key={tag} className="border-brand-outline bg-brand-surface-high text-brand-text-muted">#{tag}</Badge>)}</div>{selectedTicket.relatedResource && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-brand-surface-high p-3"><div><p className="text-[9px] uppercase text-brand-text-muted">{selectedTicket.relatedResource.type}</p><p className="mt-1 text-xs font-bold text-brand-text">{selectedTicket.relatedResource.label}</p><p className="mt-0.5 font-mono text-[9px] text-brand-text-muted">{selectedTicket.relatedResource.id}</p></div><ExternalLink className="h-4 w-4 text-brand-primary" /></div>}</section>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-brand-outline/40 bg-brand-surface-lowest/60 p-3 sm:p-4 lg:col-start-1 lg:row-start-3">
              {detailTab === 'conversation' && isActive(selectedTicket) ? (
                <form onSubmit={handleSendReply}>
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        processFiles(e.target.files);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />

                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-brand-text">{replyType === 'PUBLIC_REPLY' ? 'Soạn phản hồi khách hàng' : 'Thêm ghi chú nội bộ'}</p>
                      <p className="mt-1 text-[9px] text-brand-text-muted">{replyType === 'PUBLIC_REPLY' ? `Nội dung sẽ được gửi qua ${CHANNEL_CONFIG[selectedTicket.channel].label}` : 'Nội dung chỉ hiển thị cho đội ngũ vận hành'}</p>
                    </div>
                    <div className="flex rounded-xl border border-brand-outline bg-brand-surface p-1">
                      <button type="button" onClick={() => setReplyType('PUBLIC_REPLY')} className={`min-h-0 rounded-lg border-0 px-3 py-1.5 text-[10px] font-bold shadow-none ${replyType === 'PUBLIC_REPLY' ? 'bg-brand-primary text-white' : 'bg-transparent text-brand-text-muted'}`}>Phản hồi</button>
                      <button type="button" onClick={() => setReplyType('INTERNAL_NOTE')} className={`min-h-0 rounded-lg border-0 px-3 py-1.5 text-[10px] font-bold shadow-none ${replyType === 'INTERNAL_NOTE' ? 'bg-amber-500 text-white' : 'bg-transparent text-brand-text-muted'}`}>Ghi chú nội bộ</button>
                    </div>
                  </div>

                  {replyAttachedFiles.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-brand-outline/40 bg-brand-surface p-2">
                      {replyAttachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 rounded-lg border border-brand-outline/40 bg-brand-surface-high p-1 pr-2 text-xs"
                        >
                          {file.url ? (
                            <img src={file.url} alt={file.name} className="h-7 w-7 rounded object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-brand-primary" />
                          )}
                          <div className="max-w-[120px] truncate text-[10px]">
                            <p className="truncate font-bold text-brand-text">{file.name}</p>
                            <p className="text-brand-text-muted">{file.size}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                            className="rounded p-0.5 text-brand-text-muted hover:text-rose-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="relative flex-1">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        onPaste={handlePasteReply}
                        placeholder={replyType === 'PUBLIC_REPLY' ? `Nhập nội dung trả lời ${selectedTicket.requesterName} (dán hoặc đính kèm ảnh)...` : 'Nhập ghi chú dành cho đội ngũ nội bộ...'}
                        className={`min-h-16 w-full resize-none rounded-xl border px-3 py-2.5 pr-10 text-xs leading-relaxed text-brand-text outline-none placeholder:text-brand-text-muted/60 ${replyType === 'INTERNAL_NOTE' ? 'border-amber-500/35 bg-amber-500/5' : 'border-brand-outline/50 bg-brand-surface'}`}
                      />
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        title="Đính kèm hình ảnh / ảnh chụp màn hình"
                        className="absolute bottom-2.5 right-2.5 rounded-lg p-1.5 text-brand-text-muted hover:bg-brand-surface-high hover:text-brand-primary"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <button type="submit" disabled={!replyText.trim() && replyAttachedFiles.length === 0} className={`inline-flex min-w-36 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2 text-xs font-bold text-white ${replyType === 'PUBLIC_REPLY' ? 'bg-brand-primary' : 'bg-amber-500'}`}><Send className="h-3.5 w-3.5" /><span>{replyType === 'PUBLIC_REPLY' ? 'Gửi phản hồi' : 'Lưu ghi chú'}</span></button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  {isActive(selectedTicket) ? <button onClick={() => handleResolve(selectedTicket)} className="support-resolve-button inline-flex items-center gap-2 whitespace-nowrap border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold"><CheckCircle2 className="h-4 w-4" /><span>Đánh dấu đã giải quyết</span></button> : <button onClick={() => handleStatusChange(selectedTicket, 'OPEN')} className="inline-flex items-center gap-2 whitespace-nowrap border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text"><TicketIcon className="h-4 w-4" /><span>Mở lại ticket</span></button>}
                </div>
              )}
            </div>
            </div>
        </Modal>
      )}

      {/* MODAL: IMAGE LIGHTBOX PREVIEW */}
      {previewImage && (
        <Modal
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={previewImage.name || 'Ảnh đính kèm'}
          size="large"
        >
          <div className="space-y-4">
            <div className="flex max-h-[70vh] min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-black/90 p-2 shadow-inner">
              {previewImage.url ? (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <ImageIcon className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-2 text-xs">Không có dữ liệu hiển thị ảnh xem trước.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-outline/30 pt-3">
              <div className="text-xs text-brand-text-muted">
                <span className="font-bold text-brand-text">{previewImage.name}</span>
                {previewImage.size && <span className="ml-2">({previewImage.size})</span>}
              </div>

              <div className="flex items-center gap-2">
                {previewImage.url && (
                  <a
                    href={previewImage.url}
                    download={previewImage.name || 'anh-dinh-kem.png'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-primary/90"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải xuống</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-xl border border-brand-outline bg-brand-surface px-4 py-2 text-xs font-bold text-brand-text hover:bg-brand-surface-high"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <Modal
          open
          onClose={() => setShowCreateModal(false)}
          title="Tạo ticket hỗ trợ mới"
          eyebrow="Superadmin Support Desk"
          icon={<Plus className="h-5 w-5 text-brand-primary" />}
          size="medium"
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={!createSubject.trim() || !createDescription.trim()}
                onClick={handleCreateTicketSubmit}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Khởi tạo Ticket
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-caption font-bold text-brand-text mb-1">
                Chủ đề / Yêu cầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                placeholder="VD: Sự cố đồng bộ lịch hẹn, Yêu cầu nâng cấp gói..."
                className="w-full rounded-control border border-brand-outline bg-brand-surface px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-caption font-bold text-brand-text mb-1">
                  Tenant / Salon
                </label>
                <input
                  type="text"
                  value={createTenantName}
                  onChange={(e) => setCreateTenantName(e.target.value)}
                  placeholder="VD: Lumière Hair Studio"
                  className="w-full rounded-control border border-brand-outline bg-brand-surface px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-caption font-bold text-brand-text mb-1">
                  Danh mục
                </label>
                <BeautifulSelect
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full"
                >
                  <option value="Kỹ thuật">Kỹ thuật & Hệ thống</option>
                  <option value="Thanh toán & Gói">Thanh toán & Gói cước</option>
                  <option value="Chi nhánh & Nhân sự">Chi nhánh & Nhân sự</option>
                  <option value="Tài khoản & Quyền">Tài khoản & Phân quyền</option>
                  <option value="Khác">Khác / Hỗ trợ chung</option>
                </BeautifulSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-caption font-bold text-brand-text mb-1">
                  Người yêu cầu / Đại diện
                </label>
                <input
                  type="text"
                  value={createRequesterName}
                  onChange={(e) => setCreateRequesterName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Boss"
                  className="w-full rounded-control border border-brand-outline bg-brand-surface px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-caption font-bold text-brand-text mb-1">
                  Email liên hệ
                </label>
                <input
                  type="email"
                  value={createRequesterEmail}
                  onChange={(e) => setCreateRequesterEmail(e.target.value)}
                  placeholder="VD: tenantadmin@lumierehair.vn"
                  className="w-full rounded-control border border-brand-outline bg-brand-surface px-3 py-2 text-xs text-brand-text focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-brand-text mb-1">
                Mức độ ưu tiên
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Ticket['priority'][]).map((pri) => (
                  <button
                    key={pri}
                    type="button"
                    onClick={() => setCreatePriority(pri)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                      createPriority === pri
                        ? pri === 'URGENT'
                          ? 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400'
                          : pri === 'HIGH'
                            ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            : 'border-brand-primary bg-brand-primary/15 text-brand-primary'
                        : 'border-brand-outline bg-brand-surface text-brand-text-muted hover:border-brand-outline-strong'
                    }`}
                  >
                    {PRIORITY_CONFIG[pri].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-brand-text mb-1">
                Nội dung chi tiết yêu cầu <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Mô tả chi tiết vấn đề, triệu chứng, mã lỗi hoặc yêu cầu cụ thể..."
                className="w-full rounded-control border border-brand-outline bg-brand-surface px-3 py-2 text-xs leading-relaxed text-brand-text focus:border-brand-primary focus:outline-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
