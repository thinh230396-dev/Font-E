import type { ComponentType, ReactNode } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CalendarOff,
  CheckCircle2,
  Clock,
  CircleDashed,
  CircleSlash,
  Coffee,
  DoorOpen,
  FileText,
  Hourglass,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  Send,
  SprayCan,
  Thermometer,
  ThumbsUp,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';

/**
 * StatusBadge — README §15.
 *
 * Đây là NƠI DUY NHẤT ánh xạ trạng thái nghiệp vụ sang nhãn, tông màu và icon
 * (§15.2). Trạng thái không bao giờ chỉ được truyền đạt bằng màu: mỗi badge
 * luôn có cả nhãn chữ lẫn icon (§5.2, §15.1, §19.3).
 */

/** Tông ngữ nghĩa theo §5.1. Không phải màu thô. */
export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export type StatusKey =
  // Tenant, tài khoản
  | 'ACTIVE'
  | 'INACTIVE'
  | 'TRIAL'
  | 'EXPIRING'
  | 'OVERDUE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  // Gói dịch vụ
  | 'DRAFT'
  | 'DEPRECATED'
  | 'ARCHIVED'
  // Thanh toán
  | 'PAID'
  | 'UNPAID'
  | 'WARNING'
  | 'FAILED'
  | 'CANCELLED'
  // Quy trình duyệt, phiếu hỗ trợ, lịch hẹn
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'NO_SHOW'
  // Ghế & khu vực
  | 'READY'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  // Kỹ thuật viên trong ngày
  | 'PRESENT'
  | 'NOT_CHECKED_IN'
  | 'SERVING'
  | 'BREAK'
  | 'SICK_REPORTED'
  | 'ON_LEAVE'
  | 'LATE'
  // Yêu cầu vật tư
  | 'SENT'
  | 'FULFILLED';

interface StatusDefinition {
  label: string;
  tone: StatusTone;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

/**
 * Ánh xạ trạng thái → nhãn / tông / icon.
 * Nhãn dùng đúng từ vựng nghiệp vụ tiếng Việt đang có trong sản phẩm (§2.6).
 */
export const STATUS_MAP: Record<StatusKey, StatusDefinition> = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'success', icon: CheckCircle2 },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral', icon: CircleDashed },
  TRIAL: { label: 'Dùng thử', tone: 'info', icon: Clock },
  EXPIRING: { label: 'Sắp đến hạn', tone: 'warning', icon: AlertTriangle },
  OVERDUE: { label: 'Quá hạn', tone: 'danger', icon: AlertTriangle },
  SUSPENDED: { label: 'Tạm ngưng', tone: 'danger', icon: PauseCircle },
  PENDING_VERIFICATION: { label: 'Chờ xác minh', tone: 'warning', icon: Hourglass },

  DRAFT: { label: 'Bản nháp', tone: 'neutral', icon: FileText },
  DEPRECATED: { label: 'Ngừng bán', tone: 'warning', icon: CircleSlash },
  ARCHIVED: { label: 'Đã lưu trữ', tone: 'neutral', icon: CircleDashed },

  PAID: { label: 'Đã thanh toán', tone: 'success', icon: CheckCircle2 },
  UNPAID: { label: 'Chưa thanh toán', tone: 'warning', icon: Hourglass },
  WARNING: { label: 'Cần chú ý', tone: 'warning', icon: AlertTriangle },
  FAILED: { label: 'Thất bại', tone: 'danger', icon: XCircle },
  CANCELLED: { label: 'Đã hủy', tone: 'danger', icon: Ban },

  PENDING: { label: 'Chờ xử lý', tone: 'warning', icon: Hourglass },
  APPROVED: { label: 'Đã duyệt', tone: 'success', icon: ThumbsUp },
  REJECTED: { label: 'Đã từ chối', tone: 'danger', icon: XCircle },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'info', icon: CheckCircle2 },
  CHECKED_IN: { label: 'Đã đến', tone: 'info', icon: DoorOpen },
  IN_SERVICE: { label: 'Đang phục vụ', tone: 'info', icon: PlayCircle },
  COMPLETED: { label: 'Hoàn thành', tone: 'success', icon: CheckCircle2 },
  RESOLVED: { label: 'Đã xử lý', tone: 'success', icon: CheckCircle2 },
  CLOSED: { label: 'Đã đóng', tone: 'neutral', icon: CircleDashed },
  NO_SHOW: { label: 'Khách không đến', tone: 'danger', icon: CircleSlash },

  // Ghế & khu vực. Tông theo README §5.3; icon và nhãn mang phần phân biệt
  // còn lại để trạng thái không chỉ dựa vào màu (§5.2).
  READY: { label: 'Sẵn sàng', tone: 'success', icon: CheckCircle2 },
  OCCUPIED: { label: 'Đang sử dụng', tone: 'info', icon: PlayCircle },
  RESERVED: { label: 'Đã giữ chỗ', tone: 'info', icon: CalendarClock },
  CLEANING: { label: 'Đang vệ sinh', tone: 'info', icon: SprayCan },
  MAINTENANCE: { label: 'Đang bảo trì', tone: 'warning', icon: Wrench },
  OUT_OF_SERVICE: { label: 'Ngừng sử dụng', tone: 'danger', icon: Ban },

  // Kỹ thuật viên trong ngày.
  PRESENT: { label: 'Có mặt', tone: 'success', icon: UserCheck },
  NOT_CHECKED_IN: { label: 'Chưa check-in', tone: 'neutral', icon: CircleDashed },
  SERVING: { label: 'Đang phục vụ khách', tone: 'info', icon: PlayCircle },
  BREAK: { label: 'Đang nghỉ giải lao', tone: 'warning', icon: Coffee },
  SICK_REPORTED: { label: 'Báo ốm', tone: 'danger', icon: Thermometer },
  ON_LEAVE: { label: 'Nghỉ phép', tone: 'neutral', icon: CalendarOff },
  LATE: { label: 'Đi muộn', tone: 'warning', icon: Clock },

  // Yêu cầu vật tư.
  SENT: { label: 'Đã gửi', tone: 'info', icon: Send },
  FULFILLED: { label: 'Đã cấp hàng', tone: 'success', icon: PackageCheck },
};

export interface StatusBadgeProps {
  status: StatusKey | (string & {});
  /** Ghi đè nhãn khi màn hình cần cách gọi riêng. Tông và icon giữ nguyên. */
  label?: ReactNode;
  size?: 'small' | 'medium';
  className?: string;
}

const FALLBACK: StatusDefinition = { label: '—', tone: 'neutral', icon: CircleDashed };

/** Tra cứu định nghĩa trạng thái. Dùng khi cần tông/nhãn mà không cần render badge. */
export const getStatusDefinition = (status: string): StatusDefinition =>
  STATUS_MAP[status as StatusKey] ?? { ...FALLBACK, label: status || '—' };

export default function StatusBadge({
  status,
  label,
  size = 'medium',
  className = '',
}: StatusBadgeProps) {
  const definition = getStatusDefinition(String(status));
  const Icon = definition.icon;

  return (
    <span className={`ui-badge ui-badge--${definition.tone} ui-badge--${size} ${className}`.trim()}>
      <Icon className="ui-badge-icon" aria-hidden="true" />
      <span>{label ?? definition.label}</span>
    </span>
  );
}
