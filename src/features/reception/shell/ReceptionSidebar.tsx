/**
 * Thanh bên của cổng lễ tân — điều hướng, danh thiếp người trực, và lớp phủ khi mở trên mobile.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27, là mảnh cuối của bước 3. Thân JSX giữ nguyên từng
 * dòng, kể cả thụt lề, để `git diff -M` còn nhận ra đây là một lần **dời chỗ** chứ không phải
 * một lần viết lại.
 *
 * ## Vì sao lớp phủ mobile nằm chung file này
 *
 * Vì nó không phải một thành phần riêng mà là **nửa còn lại của cùng một cử chỉ**: trên màn hẹp,
 * thanh bên trượt vào và nền tối hiện ra cùng lúc, và bấm nền tối là cách duy nhất đóng nó lại.
 * Để hai thứ ấy ở hai nơi là mở đường cho một bản sửa đổi chỉ chạm một nửa — thanh bên trượt ra
 * mà nền tối ở lại, che kín màn hình và không còn gì bấm được.
 *
 * ## Ba thứ nó KHÔNG tự quyết
 *
 * `sidebarOpen` (mobile), `sidebarCollapsed` (desktop) và trang đang xem đều do cổng giữ, vì cả
 * ba còn có người đọc khác: phím tắt Ctrl+B, phím Escape, và vùng đệm trái của khung nội dung.
 */

import type { Dispatch, SetStateAction } from 'react';
import { LogOut, PanelLeftClose, PanelLeftOpen, Store } from 'lucide-react';
import type { DemoAccount } from '../../../auth/demoAccounts';
import { navItems } from '../constants';
import type { ReceptionPage } from '../types';

export interface ReceptionSidebarProps {
  /** Tên tiệm đang làm việc, in ở đầu thanh bên. */
  tenantName: string;

  /** Người đang trực quầy — thanh bên chỉ đọc `displayName` để dựng chữ viết tắt và tên. */
  account: DemoAccount;

  /** Nhãn chi nhánh đã sẵn sàng để in, đã lùi về `Chi nhánh {mã}` khi tài khoản không có tên. */
  branchLabel: string;

  /* ── Trang đang xem ──────────────────────────────────────────────────────────────── */
  page: ReceptionPage;
  navigate: (nextPage: ReceptionPage) => void;

  /* ── Hai trạng thái đóng/mở, mỗi cái cho một cỡ màn hình ─────────────────────────── */
  /** Ngăn kéo trên màn hẹp. */
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  /** Thu hẹp còn dải icon trên màn rộng. Người dùng bật/tắt bằng Ctrl+B, và nó được nhớ lại. */
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  onLogout: () => void;
}

export default function ReceptionSidebar({
  tenantName,
  account,
  branchLabel,
  page,
  navigate,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  toggleSidebarCollapsed,
  onLogout
}: ReceptionSidebarProps) {
  return (
    <>
      <aside className={`role-sidebar reception-sidebar fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex w-[260px] flex-col bg-[#111625] text-white shadow-2xl transition-[width,transform] duration-300 lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex h-[var(--size-topbar)] shrink-0 items-center gap-3 border-b border-white/10 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'px-4'}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white font-black shadow-md shadow-brand-secondary/20"><Store className="h-5 w-5" /></span>
          <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-body font-bold text-white">{tenantName}</p>
            <p className="mt-0.5 text-caption font-semibold uppercase tracking-wider text-slate-400">Không gian lễ tân</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng Receptionist">
          <p className={`mb-2 px-3 text-caption font-bold uppercase tracking-[0.16em] text-slate-500 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Vận hành tại quầy</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? 'page' : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group flex h-10 w-full items-center gap-3 rounded-xl transition-all cursor-pointer ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'px-3'
                } ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    active ? 'text-emerald-400 scale-105' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={`text-xs truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
                {active && !sidebarCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-2.5 space-y-2">
          <div className={`flex items-center gap-2.5 rounded-xl bg-white/5 p-2 ${sidebarCollapsed ? 'lg:justify-center lg:p-1.5' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
              {account.displayName.split(' ').slice(-2).map((part) => part[0]).join('')}
            </span>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-xs font-bold text-white">{account.displayName}</p>
              <p className="truncate text-[10px] text-slate-400 font-medium">Lễ tân · {branchLabel}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer ${sidebarCollapsed ? 'lg:hidden' : ''}`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="hidden lg:flex h-8 w-full items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}

          <div className="hidden lg:block">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
              aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
              className={`flex h-8 w-full items-center rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer ${
                sidebarCollapsed ? 'justify-center p-0' : 'justify-between px-2.5'
              }`}
            >
              <span className={sidebarCollapsed ? 'hidden' : 'truncate flex items-center gap-1.5'}>
                <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
                <span>Thu hẹp</span>
              </span>
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">Ctrl+B</kbd>
              )}
            </button>
          </div>
        </div>
      </aside>
      {/* Lớp phủ khi mở menu trên mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden cursor-pointer"
        />
      )}
    </>
  );
}
