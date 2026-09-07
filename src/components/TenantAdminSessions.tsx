/**
 * Phiên đăng nhập của tiệm — BR-AUTH-032, BR-AUTH-033.
 *
 * Cùng hai endpoint mà màn Bảo mật của Superadmin đang dùng, không thêm gì ở máy chủ: bộ lọc
 * theo tiệm nằm sẵn trong `ListSessionsUseCase`, nên chủ tiệm gọi đúng đường dẫn ấy và nhận về
 * đúng những người thuộc tiệm mình. Trước màn này, ô quyền `Feature.Sessions` đã được cấp cho
 * `TENANT_ADMIN` và đã có phép thử che, nhưng không giao diện nào gọi tới — một quyền được cấp
 * mà không có lối vào.
 *
 * Phạm vi đi theo **chủ tài khoản** chứ không theo phiên: một người quản nhiều tiệm (BR-AUTH-023)
 * có thể đang mở phiên trỏ sang tiệm khác, nhưng họ vẫn là người của tiệm này nên vẫn hiện ra.
 * Vì vậy cột "Tiệm đang mở" có thể ghi tên một tiệm khác, và đó không phải lỗi — xem chú thích
 * ngay tại cột ấy.
 */

import { useMemo, useState } from 'react';
import { Ban, RefreshCw } from 'lucide-react';
import useSessions from '../hooks/useSessions';
import type { SessionDto } from '../services/sessions';
import {
  Button,
  DataTable,
  PageHeader,
  Modal,
  StatusBadge,
  useToast,
  type DataTableColumn
} from './ui';

interface TenantAdminSessionsProps {
  /** Tiệm đang làm việc. Rỗng thì màn đứng im thay vì hỏi một câu chắc chắn nhận 403. */
  activeTenantId?: string | null;
  tenantName: string;
}

const ROLE_LABELS: Record<SessionDto['userRole'], string> = {
  SUPERADMIN: 'Quản trị hệ thống',
  TENANT_ADMIN: 'Chủ tiệm',
  RECEPTIONIST: 'Lễ tân'
};

/**
 * Khoảng cách tới lần hoạt động cuối, viết như người nói.
 *
 * Giờ tuyệt đối trả lời câu "lúc đó là mấy giờ", nhưng câu mà người mở màn này đang hỏi là
 * "ai còn đang ngồi trước máy lúc này" — và với câu ấy thì "3 phút trước" đọc nhanh hơn
 * "14:32". Giờ tuyệt đối vẫn còn, nằm ở thuộc tính `title` của ô.
 */
const describeSince = (iso: string): string => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;

  return `${Math.floor(minutes / 1440)} ngày trước`;
};

const formatMoment = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

export default function TenantAdminSessions({
  activeTenantId,
  tenantName
}: TenantAdminSessionsProps) {
  const showToast = useToast();
  const live = Boolean(activeTenantId);
  const directory = useSessions(live, activeTenantId || null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * Phiên đang chờ xác nhận thu hồi.
   *
   * Hộp thoại dựng ngay trong màn này bằng `Modal` dùng chung, chứ không nhận một hàm
   * `showConfirm` qua prop như cổng Superadmin làm: cổng chủ tiệm không có sẵn cơ chế ấy, và
   * thêm một cơ chế toàn cổng chỉ để phục vụ một nút là mở rộng phạm vi quá xa so với việc cần
   * làm. Giữ trong màn thì hộp thoại cũng nói được đúng tên người và đúng thiết bị.
   */
  const [pending, setPending] = useState<SessionDto | null>(null);

  /**
   * Phiên còn hiệu lực lên trước — máy chủ đã sắp sẵn theo đúng thứ tự ấy, nên ở đây chỉ đếm.
   * Đếm ở trình duyệt chứ không hỏi thêm một endpoint đếm: con số phải khớp đúng bảng đang
   * hiện, và hai nguồn cho cùng một con số là hai nguồn sẽ lệch nhau.
   */
  const activeCount = useMemo(
    () => directory.sessions.filter((session) => session.status === 'ACTIVE').length,
    [directory.sessions]
  );

  const confirmRevoke = (session: SessionDto) => {
    setPending(null);
    setBusyId(session.id);

    void directory.revokeSession(session.id)
      .then((result) => {
        showToast(result.status === 'ok'
          ? `Đã thu hồi phiên của ${session.userDisplayName}.`
          : result.error.message);
      })
      .finally(() => setBusyId(null));
  };

  const columns: DataTableColumn<SessionDto>[] = [
    {
      key: 'user',
      header: 'Người dùng',
      cell: (session) => (
        <div className="min-w-0">
          <p className="truncate font-bold text-brand-text">
            {session.userDisplayName}
            {session.isCurrent && (
              <span className="ml-2 text-caption font-bold text-brand-text-muted">· phiên này</span>
            )}
          </p>
          <p className="truncate text-caption text-brand-text-muted">
            {ROLE_LABELS[session.userRole]} · {session.userEmail}
          </p>
        </div>
      )
    },
    {
      key: 'device',
      header: 'Thiết bị',
      hideBelow: 'md',
      cell: (session) => (
        <div className="min-w-0">
          {/* Chuỗi User-Agent gốc nằm ở `title`: bản rút gọn đủ để nhận ra máy trong đa số
              trường hợp, còn khi hai máy trùng tên thì chuỗi gốc là thứ phân biệt được. */}
          <p className="truncate text-brand-text" title={session.userAgent || undefined}>
            {session.device}
          </p>
          <p className="truncate text-caption text-brand-text-muted">IP {session.ip || '—'}</p>
        </div>
      )
    },
    {
      key: 'tenant',
      header: 'Tiệm đang mở',
      hideBelow: 'lg',
      cell: (session) => (
        // Có thể là một tiệm KHÁC tiệm đang xem, và đó là đúng: danh sách lọc theo người thuộc
        // tiệm này, không lọc theo tiệm mà phiên đang trỏ tới (BR-AUTH-032). Lọc theo phiên sẽ
        // giấu mất đúng những phiên đáng lo nhất.
        <span className="text-caption text-brand-text-muted">
          {session.activeTenantId === activeTenantId
            ? tenantName
            : session.activeTenantId || 'Chưa chọn tiệm'}
        </span>
      )
    },
    {
      key: 'lastActive',
      header: 'Hoạt động cuối',
      cell: (session) => (
        <span className="text-brand-text" title={formatMoment(session.lastActive)}>
          {describeSince(session.lastActive)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (session) => <StatusBadge status={session.status} size="small" />
    },
    {
      key: 'actions',
      header: 'Thao tác',
      actions: true,
      headerSrOnly: true,
      cell: (session) => {
        // Nút chỉ hiện với phiên còn hiệu lực và không phải phiên của chính mình. Phiên đã đóng
        // thì không còn gì để đóng; phiên của chính mình thì máy chủ trả 403 (BR-AUTH-033) vì
        // kết thúc phiên mình là việc của nút Đăng xuất, đường đó còn dọn cookie tử tế.
        if (session.status !== 'ACTIVE' || session.isCurrent) return null;

        // Nền trong suốt, phân biệt bằng MÀU CỦA BIỂU TƯỢNG chứ không bằng một khối đỏ đặc lặp
        // lại ở từng dòng — khối đặc kéo mắt khỏi nội dung và làm cả cột mất cân.
        return (
          <Button
            variant="ghost"
            size="small"
            iconLeading={<Ban aria-hidden className="h-4 w-4 text-red-500" />}
            disabled={busyId === session.id}
            onClick={() => setPending(session)}
          >
            Thu hồi
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Phiên đăng nhập"
        actions={
          <Button
            variant="secondary"
            size="small"
            iconLeading={<RefreshCw aria-hidden className="h-4 w-4" />}
            onClick={directory.reload}
          >
            Tải lại
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={directory.sessions}
        rowKey={(session) => session.id}
        loading={directory.loading}
        error={directory.error ? directory.error.message : undefined}
        onRetry={directory.reload}
        emptyTitle={live ? 'Chưa có ai đăng nhập' : 'Chưa chọn tiệm'}
        emptyDescription={
          live
            ? 'Danh sách hiện mọi phiên của tài khoản thuộc tiệm này. Khi có người đăng nhập, phiên của họ xuất hiện ở đây.'
            : 'Chọn một tiệm để xem những ai đang đăng nhập.'
        }
        footer={
          directory.sessions.length > 0
            ? `${activeCount} phiên còn hiệu lực trên tổng số ${directory.sessions.length}. Thu hồi một phiên là vô hiệu nó ngay ở thao tác kế tiếp.`
            : undefined
        }
      />

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Thu hồi phiên đăng nhập?"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>Hủy</Button>
            {/* Nút chính của hộp thoại thì GIỮ nền đặc: ở đây nó là hành động được nhấn mạnh
                chứ không phải một nút lặp lại ở từng dòng bảng. */}
            <Button variant="danger" onClick={() => pending && confirmRevoke(pending)}>
              Thu hồi phiên
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-body text-brand-text">
            <p>
              Phiên của <strong className="font-bold">{pending.userDisplayName}</strong> trên{' '}
              {pending.device} (IP {pending.ip || 'không rõ'}) sẽ mất hiệu lực{' '}
              <strong className="font-bold">ngay ở thao tác kế tiếp</strong>.
            </p>
            <p className="text-caption text-brand-text-muted">
              Người đó đăng nhập lại được ngay sau đó — thu hồi phiên chỉ đóng một thiết bị, không
              khóa tài khoản.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
