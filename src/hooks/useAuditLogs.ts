/**
 * Nhật ký kiểm toán ghi ở máy chủ — BR-AUD-001…005.
 *
 * Trả về đúng hình dạng `SystemLog` mà màn "Bảo mật & nhật ký" đang dùng, thay vì DTO thô:
 * màn ấy có bộ lọc theo mức độ, theo nhóm và theo trạng thái, cùng một bảng chi tiết đọc
 * hàng chục trường. Đổi hình dạng là sửa từng chỗ, và không mua lại gì cho người dùng.
 *
 * Là hook chỉ đọc — BR-AUD-004 nói bản ghi nhật ký không sửa được và không xóa được.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SystemLog } from '../types';
import type { ApiError } from '../services/apiClient';
import { listAuditLogs, type AuditEventCode, type AuditLogDto } from '../services/auditLogs';

/**
 * Mười loại sự kiện của BR-AUD-002, dịch sang từ vựng mà giao diện đã có sẵn.
 *
 * Ba cột `severity`, `status` và `category` là khái niệm **của riêng giao diện** — lược đồ máy
 * chủ không có chúng, vì BR-AUD-002 chốt danh sách sự kiện chứ không phân loại chúng. Bảng
 * dưới đây là chỗ duy nhất dịch giữa hai thế giới, thay vì rải phép đoán ra khắp màn hình.
 */
const EVENT_META: Record<AuditEventCode, {
  label: string;
  category: SystemLog['category'];
  severity: SystemLog['severity'];
  status: SystemLog['status'];
}> = {
  LOGIN: { label: 'Đăng nhập thành công', category: 'AUTH', severity: 'low', status: 'success' },
  LOGIN_FAILED: { label: 'Đăng nhập thất bại', category: 'AUTH', severity: 'medium', status: 'failed' },
  TENANT_CREATED: { label: 'Tạo tiệm mới', category: 'TENANT', severity: 'medium', status: 'success' },
  TENANT_UPDATED: { label: 'Cập nhật hồ sơ tiệm', category: 'TENANT', severity: 'low', status: 'success' },
  TENANT_DELETED: { label: 'Xóa mềm tiệm', category: 'TENANT', severity: 'high', status: 'success' },
  ACCOUNT_CREATED: { label: 'Cấp tài khoản', category: 'USER', severity: 'medium', status: 'success' },
  ACCOUNT_LOCKED: { label: 'Khóa tài khoản', category: 'SECURITY', severity: 'high', status: 'success' },
  PAYMENT_RECEIVED: { label: 'Ghi nhận thu tiền', category: 'BILLING', severity: 'low', status: 'success' },
  REFUND_ISSUED: { label: 'Hoàn tiền cho khách', category: 'BILLING', severity: 'high', status: 'success' },
  PACKAGE_CHANGED: { label: 'Đổi gói dịch vụ', category: 'PACKAGE', severity: 'medium', status: 'success' }
};

const ROLE_MAP: Record<string, SystemLog['actorRole']> = {
  SUPERADMIN: 'SUPERADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  RECEPTIONIST: 'SUPPORT'
};

/**
 * Dựng câu mô tả từ phần dữ liệu kèm theo.
 *
 * Máy chủ lưu chi tiết dưới dạng cặp khóa–giá trị chứ không lưu một câu tiếng Việt, và đó là
 * lựa chọn đúng: mỗi loại sự kiện cần một bộ trường khác nhau, còn câu chữ thì đổi được bất cứ
 * lúc nào mà không ai coi là thay đổi dữ liệu.
 */
const describe = (dto: AuditLogDto): string => {
  const parts = Object.entries(dto.metadata || {}).map(([key, value]) => `${key}: ${value}`);

  if (parts.length > 0) return parts.join(' · ');

  return dto.targetId ? `${dto.targetType || 'Bản ghi'} ${dto.targetId}` : 'Không có chi tiết kèm theo.';
};

const toSystemLog = (dto: AuditLogDto): SystemLog => {
  /*
    Nhánh dự phòng chỉ dành cho một loại sự kiện máy chủ thêm về sau mà giao diện chưa biết.
    Nó KHÔNG được là chỗ mọi bản ghi rơi vào: xếp tất cả vào "low / success / SYSTEM" thì một
    lần đăng nhập thất bại hiện ra như một sự kiện hệ thống bình thường, ô "rủi ro 24 giờ" đếm
    ra 0, và ba bộ lọc theo nhóm / mức độ / trạng thái không lọc được gì. Đó đúng là chuyện đã
    xảy ra suốt từ ngày 17 tới khi buổi tổng duyệt kỹ ngày 19 đối chiếu con số trên màn hình
    với con số trong database.
  */
  const meta = EVENT_META[dto.event as AuditEventCode] || {
    label: dto.event,
    category: 'SYSTEM' as const,
    severity: 'low' as const,
    status: 'success' as const
  };

  return {
    id: dto.id,
    timestamp: dto.createdAt,
    eventCode: dto.event,
    event: meta.label,
    description: describe(dto),
    // Máy chủ lưu mã tài khoản, không lưu tên hiển thị — và đó là điều đúng cho một chứng từ:
    // tên người đổi được, mã thì không.
    user: dto.actorUserId || 'Hệ thống',
    actorRole: ROLE_MAP[dto.actorRole || ''] || 'SYSTEM',
    ip: dto.ip || '—',
    severity: meta.severity,
    status: meta.status,
    category: meta.category,
    resource: dto.targetType || '—',
    resourceId: dto.targetId || undefined,
    metadata: dto.metadata
  };
};

export interface AuditLogFeed {
  logs: SystemLog[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export default function useAuditLogs(enabled: boolean): AuditLogFeed {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLogs([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listAuditLogs()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setLogs([]);
          return;
        }

        setError(null);
        setLogs(result.data.map(toSystemLog));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, reloadToken]);

  return { logs, loading, error, reload };
}
