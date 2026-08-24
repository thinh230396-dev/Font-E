/**
 * Mã lỗi máy đọc được, dùng chung cho toàn hệ thống.
 *
 * Đây là phần `code` trong contract lỗi đã chốt ở README-BACKEND-ROADMAP.md §0 mục 4:
 *
 *     { error: { code, message, fields } }
 *
 * Frontend dựa vào `code` để quyết định cách hiển thị, không dựa vào `message`
 * (README-MIGRATION.md §12.4 yêu cầu phân biệt được 6 trường hợp lỗi).
 *
 * Lưu ý: mã ở đây KHÔNG mang thông tin HTTP. Việc ánh xạ mã sang HTTP status là
 * việc của tầng adapters (HttpErrorPresenter) — tầng trong không được biết gì về HTTP.
 */
export const ErrorCode = {
  /** Dữ liệu đầu vào sai. Kèm `fields` để frontend gắn thông báo vào đúng ô nhập. */
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  /**
   * Sai tài khoản hoặc mật khẩu — tách riêng khỏi UNAUTHENTICATED.
   * Nếu dùng chung một mã, frontend sẽ hiểu nhầm là phiên hết hạn và đá người dùng
   * về màn đăng nhập ngay giữa lúc họ đang đăng nhập.
   */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  /** Tài khoản đang bị khóa tạm do đăng nhập sai nhiều lần. */
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  /** Tài khoản SUSPENDED hoặc INACTIVE — BR-AUTH-021. */
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',

  /** Chưa đăng nhập, hoặc phiên đã hết hạn / bị thu hồi. Frontend đưa về màn đăng nhập. */
  UNAUTHENTICATED: 'UNAUTHENTICATED',

  /** Đã đăng nhập nhưng không đủ quyền. Frontend KHÔNG được đưa về màn đăng nhập. */
  FORBIDDEN: 'FORBIDDEN',

  /** Không tìm thấy, hoặc bản ghi không thuộc tenant đang làm việc — BR-TENANT-013 bước 4. */
  NOT_FOUND: 'NOT_FOUND',

  /** Tenant hết hạn hoặc bị khóa, mọi thao tác ghi bị chặn — BR-TENANT-010. */
  TENANT_READONLY: 'TENANT_READONLY',

  /** Vượt hạn mức gói: max_salons hoặc max_staff — BR-BRANCH-005, BR-EMP-008. */
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',

  /** Kỹ thuật viên đã có lịch hẹn chồng giờ — BR-APT-011. */
  SLOT_CONFLICT: 'SLOT_CONFLICT',

  /** Lỗi không lường trước. Không bao giờ lộ chi tiết kỹ thuật ra ngoài. */
  INTERNAL: 'INTERNAL'
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
