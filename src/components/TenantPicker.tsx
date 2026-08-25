import { Building2, LogOut, RefreshCw } from 'lucide-react';
import { Button, StatusBadge } from './ui';
import type { TenantSummary } from '../services/auth';

/**
 * Màn chọn tiệm — BR-AUTH-025.
 *
 * Chủ tiệm luôn đi qua đây sau khi đăng nhập, kể cả khi chỉ quản lý một tiệm.
 * Lý do là chỗ đổi tiệm phải luôn nằm ở cùng một nơi, và người dùng phải luôn
 * biết mình đang làm việc cho tiệm nào — một tài khoản quản nhiều tiệm mà nhầm
 * tiệm thì hậu quả là sửa dữ liệu của khách hàng doanh nghiệp khác.
 *
 * Về trình bày: danh sách dùng đường kẻ mảnh ngăn dòng và khoảng trắng để tạo
 * phân cấp, không bọc mỗi tiệm vào một thẻ riêng. Màu chỉ xuất hiện ở nhãn
 * trạng thái — thứ duy nhất trên màn hình này cần được nhìn thấy trước.
 */

interface TenantPickerProps {
  accountName: string;
  accountEmail: string;
  tenants: TenantSummary[];
  loading: boolean;
  /** Thông báo lỗi khi tải danh sách thất bại. Rỗng nghĩa là không có lỗi. */
  error?: string | null;
  /** Mã tiệm đang được chọn, để khóa tương tác trong lúc chờ máy chủ. */
  pendingTenantId?: string | null;
  onSelect: (tenantId: string) => void;
  onRetry: () => void;
  onLogout: () => void;
}

const formatDate = (iso: string) => {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(value);
};

export default function TenantPicker({
  accountName,
  accountEmail,
  tenants,
  loading,
  error,
  pendingTenantId,
  onSelect,
  onRetry,
  onLogout
}: TenantPickerProps) {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
        <p className="text-caption font-semibold text-brand-text-muted">
          Đăng nhập với tư cách {accountName} · {accountEmail}
        </p>

        <h1 className="mt-3 text-2xl font-black tracking-tight">Chọn tiệm để làm việc</h1>

        <p className="mt-2 max-w-lg text-sm text-brand-text-muted">
          Mọi dữ liệu bạn xem và chỉnh sửa sau đây đều thuộc về tiệm được chọn. Bạn đổi tiệm
          bất cứ lúc nào ở thanh trên cùng.
        </p>

        <section className="mt-10" aria-live="polite">
          {loading && (
            <p className="py-6 text-sm text-brand-text-muted">Đang tải danh sách tiệm…</p>
          )}

          {!loading && error && (
            <div className="py-6">
              <p className="text-sm font-semibold text-brand-error">{error}</p>
              <Button
                className="mt-4"
                variant="secondary"
                size="small"
                iconLeading={<RefreshCw />}
                onClick={onRetry}
              >
                Thử lại
              </Button>
            </div>
          )}

          {/* Trạng thái trống là sự thật cần nói thẳng: tài khoản chưa được giao tiệm nào
              thì không có gì để vào, và người dùng cần biết phải hỏi ai. */}
          {!loading && !error && tenants.length === 0 && (
            <div className="py-6">
              <Building2 className="h-6 w-6 text-brand-text-muted" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Tài khoản chưa được giao tiệm nào</p>
              <p className="mt-1 text-sm text-brand-text-muted">
                Liên hệ quản trị viên hệ thống để được gán vào tiệm cần quản lý.
              </p>
            </div>
          )}

          {!loading && !error && tenants.length > 0 && (
            <ul className="divide-y divide-brand-outline border-y border-brand-outline">
              {tenants.map((tenant) => {
                const pending = pendingTenantId === tenant.id;

                return (
                  <li key={tenant.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(tenant.id)}
                      disabled={Boolean(pendingTenantId)}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:bg-brand-surface-high disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-bold">{tenant.name}</span>
                        <span className="mt-1 block text-caption text-brand-text-muted">
                          {tenant.code} · Hạn dùng đến {formatDate(tenant.expiresAt)}
                          {tenant.isReadOnly && ' · chỉ xem được, cần gia hạn để chỉnh sửa'}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={tenant.displayStatus} size="small" />
                        {pending && (
                          <span className="text-caption text-brand-text-muted">Đang mở…</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-10">
          <Button variant="ghost" size="small" iconLeading={<LogOut />} onClick={onLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>
    </main>
  );
}
