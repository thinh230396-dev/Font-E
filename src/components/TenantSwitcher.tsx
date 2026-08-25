import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Store } from 'lucide-react';
import { StatusBadge } from './ui';
import type { TenantSummary } from '../services/auth';

/**
 * Bộ đổi tiệm trên thanh trên cùng — BR-AUTH-025.
 *
 * Chỉ hiện khi tài khoản quản lý từ hai tiệm trở lên (BR-AUTH-023). Một tiệm thì
 * nút này không có việc gì để làm, và một nút không làm gì chỉ tổ chiếm chỗ.
 *
 * Về trình bày: nút bấm để trống nền và chỉ dùng chữ, vì ngay bên cạnh đã có bộ
 * đổi chi nhánh mang nền màu. Hai khối màu cạnh nhau thì mắt không biết nhìn cái
 * nào trước, mà tiệm đang làm việc thì cần đọc được chứ không cần nổi bật.
 */

interface TenantSwitcherProps {
  currentTenantId: string;
  currentTenantName: string;
  tenants: TenantSummary[];
  /** Mã tiệm đang chờ máy chủ xác nhận, để khóa tương tác trong lúc đổi. */
  pendingTenantId?: string | null;
  onSelect: (tenantId: string) => void;
}

export default function TenantSwitcher({
  currentTenantId,
  currentTenantName,
  tenants,
  pendingTenantId,
  onSelect
}: TenantSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (tenants.length < 2) return null;

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Bấm để đổi tiệm đang làm việc"
        className="flex h-10 items-center gap-2 border-0 bg-transparent px-2.5 text-caption font-bold text-slate-700 shadow-none transition hover:bg-slate-50"
      >
        <Store className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="font-medium text-slate-500">Tiệm:</span>
        <span className="max-w-[180px] truncate font-extrabold text-slate-900">{currentTenantName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Chọn tiệm đang làm việc"
          className="absolute right-0 top-full z-50 mt-1 w-80 border border-slate-200 bg-white py-1 shadow-lg"
        >
          {tenants.map((tenant) => {
            const isCurrent = tenant.id === currentTenantId;

            return (
              <button
                key={tenant.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                disabled={Boolean(pendingTenantId) || isCurrent}
                onClick={() => {
                  setOpen(false);
                  onSelect(tenant.id);
                }}
                className="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-3 py-2.5 text-left shadow-none transition hover:bg-slate-50 disabled:cursor-default"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden="true" />}
                    <span className="truncate text-caption font-bold text-slate-900">{tenant.name}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">{tenant.code}</span>
                </span>

                <StatusBadge status={tenant.displayStatus} size="small" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
