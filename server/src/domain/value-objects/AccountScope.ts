/**
 * Tiệm và chi nhánh mà một tài khoản gắn vào.
 *
 * ⚠️ **Cấu trúc tạm, sẽ bị thay ở ngày 3.** Nó tồn tại để tầng xác thực chuyển từ
 * Cloudflare Worker sang Express mà không làm vỡ frontend đang chạy — frontend hiện
 * đọc bốn trường này từ `GET /api/auth/session` (`src/auth/demoAccounts.ts`).
 *
 * Ngày 3 sẽ thay bằng:
 * - bảng nối `user_tenants` — một tài khoản quản nhiều tiệm (BR-AUTH-023);
 * - `activeTenantId` trong phiên — tiệm đang làm việc (BR-AUTH-024);
 * - `staffId` trên tài khoản — chi nhánh đọc qua hồ sơ nhân viên, không lưu bản sao
 *   (BR-EMP-004).
 *
 * Khi ngày 3 xong thì xóa hẳn tệp này cùng bốn cột tương ứng trong `app_users`.
 */
export interface AccountScope {
  tenantId: string | null;
  tenantName: string | null;
  branchCode: string | null;
  branchName: string | null;
}

export const emptyAccountScope = (): AccountScope => ({
  tenantId: null,
  tenantName: null,
  branchCode: null,
  branchName: null
});
