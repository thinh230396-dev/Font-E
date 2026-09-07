/**
 * Tầng gọi API nhật ký kiểm toán — BR-AUD-001…005.
 *
 * Vì sao tồn tại: `src/utils/auditLogs.ts` ghi nhật ký **ở trình duyệt**, với tên người thao
 * tác và địa chỉ IP do chính trình duyệt điền vào. Đó là bản ghi giả mạo — bất kỳ ai mở công
 * cụ nhà phát triển cũng sửa được — và BR-AUD-001 nói rõ nhật ký phải ghi ở **máy chủ**.
 *
 * Chỉ có phép đọc. BR-AUD-004: bản ghi nhật ký **không sửa được, không xóa được**, nên một
 * hàm ghi ở đây sẽ là một hàm không bao giờ có endpoint tương ứng.
 */

import { apiGet, type ApiResult } from './apiClient';

/**
 * BR-AUD-002 — hệ thống chỉ ghi đúng mười loại sự kiện này, không ghi mọi thao tác.
 *
 * Đây là **chuỗi máy chủ gửi trên dây**, chép từ `AuditLogMapper.ToWireFormat`. Bản trước
 * viết theo tên enum của C# (`Login`, `TenantCreated`) — trông rất giống nhưng không khớp
 * chữ nào, và `event` khai kiểu `string` nên `tsc` không có gì để bắt. Hậu quả nằm ở
 * `useAuditLogs`: bảng tra cứu khóa theo tên enum trượt toàn bộ, mọi bản ghi rơi về nhánh
 * dự phòng, và màn Bảo mật báo "0 yêu cầu xác thực thất bại" trong khi máy chủ đang giữ hai
 * dòng `LOGIN_FAILED`. *(bắt được ở buổi tổng duyệt kỹ ngày 19)*
 */
export type AuditEventCode =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_DELETED'
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_LOCKED'
  | 'PAYMENT_RECEIVED'
  | 'REFUND_ISSUED'
  | 'PACKAGE_CHANGED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_RESTORED';

export interface AuditLogDto {
  id: string;
  event: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  tenantId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  createdAt: string;
  /** Chi tiết riêng của từng loại sự kiện — mỗi loại một bộ trường khác nhau. */
  metadata: Record<string, string>;
}

/**
 * BR-AUD-005 — Superadmin xem toàn bộ; chủ tiệm chỉ xem nhật ký thuộc tiệm mình. Phép thu hẹp
 * ấy nằm ở máy chủ, đọc từ phiên đăng nhập, nên hàm này không có tham số tiệm.
 *
 * @param take Số bản ghi mới nhất cần lấy. Máy chủ mặc định 100 và chặn trần ở 300 — nhật ký
 *   cộng dồn mãi và không ai đọc hết một nghìn dòng, nên trả trọn là tự dựng một trang chậm.
 */
export const listAuditLogs = async (take = 300): Promise<ApiResult<AuditLogDto[]>> => {
  const result = await apiGet<{ entries: AuditLogDto[] }>(`/api/audit-logs?take=${take}`);

  return result.status === 'ok' ? { status: 'ok', data: result.data.entries } : result;
};
