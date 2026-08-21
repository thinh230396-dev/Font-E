import type { ReactNode } from 'react';

/**
 * PageHeader — đầu trang chuẩn của cổng Tenant Admin (README §8.2).
 *
 * Một card duy nhất chứa tên trang bên trái và nhóm nút thao tác bên phải, căn
 * giữa theo chiều dọc. Không có dòng mô tả và không có eyebrow: cả hai đều lặp
 * lại thứ mà thanh điều hướng bên trái đã nói, mà lại chiếm chiều cao ở mọi
 * trang.
 *
 * Trước component này, 16 trang dựng đầu trang theo 6 kiểu tiêu đề và 7 kiểu
 * eyebrow khác nhau. Các class cỡ chữ viết tay (`text-2xl font-black
 * sm:text-3xl`) chưa bao giờ có hiệu lực vì luật `.role-shell--tenant
 * .tenant-admin-main h1` trong index.css nằm ngoài `@layer` nên đè mọi utility.
 */
export interface PageHeaderProps {
  /** Tên trang. Là `h1` duy nhất của trang. */
  title: ReactNode;
  /** Nút hành động của trang, xếp về mép phải (README §8.3). */
  actions?: ReactNode;
  /**
   * Badge đứng ngay cạnh tiêu đề, ví dụ vai trò đang đăng nhập.
   *
   * Chỉ dùng khi trang thật sự cần; không thêm badge chỉ để trang trí.
   */
  titleAside?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  actions,
  titleAside,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`flex min-w-0 flex-col gap-4 rounded-card border border-brand-outline bg-brand-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="ta-page-title">{title}</h1>
        {titleAside}
      </div>
      {/* Trên điện thoại nhóm nút xuống hàng và chiếm trọn bề ngang card, nên
          vùng bấm vẫn đủ rộng thay vì bị bóp lại ở mép phải. */}
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      )}
    </header>
  );
}
