/**
 * Thanh trên của cổng lễ tân — ngày hôm nay, ô tìm kiếm, nhãn chi nhánh, nút đổi nền và chuông.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27, cùng lượt với thanh bên. Thân JSX giữ nguyên từng
 * dòng.
 *
 * ## Ô tìm kiếm là của thanh trên, nhưng chuỗi tìm là của cổng
 *
 * Mỗi màn đọc `searchQuery` theo cách riêng — Sản phẩm tra SKU, Ghế tra mã ghế, còn lại tra tên
 * và số điện thoại — nên chuỗi ấy phải sống ở cổng chứ không ở đây. Thanh trên chỉ đổi **gợi ý
 * trong ô** theo trang đang xem, để người ở quầy biết mình đang tìm trong cái gì.
 *
 * ## Chuông không tự tính ra việc cần làm
 *
 * `deskAlerts` được dựng ở cổng từ chính ba lát cắt lịch hẹn mà bàn tiếp tân đang bày. Tính lại
 * ở đây là dựng phép đếm thứ hai cho cùng một con số, và ngày nó lệch thì chuông báo một đằng
 * còn bàn tiếp tân bày một nẻo.
 */

import type { Dispatch, SetStateAction } from 'react';
import { Bell, CheckCircle2, Menu, Moon, Search, Sun } from 'lucide-react';
import { StatusBadge } from '../../../components/ui';
import { navItems } from '../constants';
import type { DeskAlert, ReceptionPage } from '../types';

export interface ReceptionTopbarProps {
  /* ── Trang đang xem ──────────────────────────────────────────────────────────────── */
  page: ReceptionPage;
  /**
   * Chuông nhảy thẳng về bàn tiếp tân bằng `setPage` chứ không qua `navigate`: người dùng vừa
   * đọc một việc cần làm, nên xóa chuỗi tìm kiếm và nạp lại cả ba bảng ngay lúc ấy là thừa.
   */
  setPage: Dispatch<SetStateAction<ReceptionPage>>;

  /** Ngăn kéo trên màn hẹp — thanh trên chỉ có quyền mở, đóng là việc của thanh bên. */
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;

  /* ── Ô tìm kiếm dùng chung cho mọi màn ───────────────────────────────────────────── */
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;

  /** Nhãn chi nhánh — tài khoản lễ tân chỉ điều phối đúng một chi nhánh (BR-APT-002). */
  branchLabel: string;

  /* ── Nền sáng/tối ────────────────────────────────────────────────────────────────── */
  themeMode: 'light' | 'dark';
  nextThemeMode: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;

  /* ── Chuông việc cần làm ─────────────────────────────────────────────────────────── */
  showNotifications: boolean;
  setShowNotifications: Dispatch<SetStateAction<boolean>>;
  deskAlerts: DeskAlert[];
}

export default function ReceptionTopbar({
  page,
  setPage,
  setSidebarOpen,
  searchQuery,
  setSearchQuery,
  branchLabel,
  themeMode,
  nextThemeMode,
  onThemeChange,
  showNotifications,
  setShowNotifications,
  deskAlerts
}: ReceptionTopbarProps) {
  return (
        <header className="role-topbar sticky top-0 z-[var(--z-sticky)] flex h-[var(--size-topbar)] items-center gap-3 border-b border-brand-outline bg-brand-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface p-0 text-brand-text shadow-xs hover:bg-brand-surface-high transition lg:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 sm:block"><p className="text-caption font-bold uppercase tracking-wider text-brand-text-muted">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</p><p className="mt-0.5 text-body font-bold text-brand-text">{navItems.find((item) => item.id === page)?.label}</p></div>
          <div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={page === 'products' ? 'Tìm tên, SKU, lô sản phẩm...' : page === 'stations' ? 'Tìm mã ghế, khách, kỹ thuật viên...' : 'Tìm tên, số điện thoại, dịch vụ...'} className="h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface-lowest pl-10 pr-4 text-body outline-none focus:border-brand-secondary" /></div>
          <span className="hidden sm:flex" title="Tài khoản chỉ được điều phối chi nhánh này"><StatusBadge status="ACTIVE" label={branchLabel} /></span>
          <button
            type="button"
            onClick={() => onThemeChange(nextThemeMode)}
            className="ui-btn ui-btn--secondary ui-btn--small"
            aria-label={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            aria-pressed={themeMode === 'dark'}
            title={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {themeMode === 'dark' ? <Sun className="h-4 w-4 text-brand-tertiary" /> : <Moon className="h-4 w-4 text-brand-text-muted" />}
            <span className="hidden sm:inline">{themeMode === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative rounded-xl border border-brand-outline p-2.5 text-brand-text-muted hover:bg-brand-surface-high"
              aria-label={`Thông báo tại quầy, ${deskAlerts.length} mục cần chú ý`}
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" />
              {deskAlerts.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-error ring-2 ring-brand-surface" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-brand-outline bg-brand-surface p-3 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-xs font-black">Thông báo tại quầy</p>
                  <span className="text-caption font-bold text-brand-error">{deskAlerts.length} cần chú ý</span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {deskAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => { setShowNotifications(false); setPage('desk'); }}
                      className={`w-full rounded-xl p-3 text-left ${alert.tone === 'cyan' ? 'bg-brand-secondary/10 text-brand-secondary' : alert.tone === 'amber' ? 'bg-brand-tertiary/10 text-brand-tertiary' : 'bg-brand-primary/10 text-brand-primary'}`}
                    >
                      <p className="text-body font-black">{alert.title}</p>
                      <p className="mt-1 text-caption opacity-75">{alert.detail}</p>
                    </button>
                  ))}
                  {deskAlerts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-brand-outline p-6 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-brand-secondary" />
                      <p className="mt-2 text-body font-black text-brand-text">Quầy đang vận hành ổn định</p>
                      <p className="mt-1 text-caption text-brand-text-muted">Không có mục cần xử lý ngay.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
  );
}
