import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  id?: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  totalUnfiltered?: number;
  className?: string;
  variant?: 'default' | 'brand' | 'violet' | 'pink';
}

export default function Pagination({
  id = 'pagination-controls',
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'mục',
  totalUnfiltered,
  className = '',
  variant = 'default',
}: PaginationProps) {
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = (): (number | 'ellipsis-left' | 'ellipsis-right')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis-left', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, 'ellipsis-right', totalPages];
  };

  const pages = getPageNumbers();

  const activeBtnClass =
    variant === 'violet'
      ? 'bg-violet-600 text-white shadow-sm border border-violet-600'
      : variant === 'pink'
      ? 'bg-pink-600 text-white shadow-sm border border-pink-600'
      : 'bg-brand-primary text-brand-on-primary shadow-sm border border-brand-primary';

  return (
    <nav
      id={id}
      aria-label="Phân trang"
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 pb-1 text-xs text-slate-500 ${className}`.trim()}
    >
      {/* Thông tin số lượng bản ghi & chọn kích thước trang */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">
          {totalItems === 0 ? (
            'Không có kết quả'
          ) : (
            <>
              Hiển thị <strong className="font-bold text-slate-800">{startItem}–{endItem}</strong> trên <strong className="font-bold text-slate-800">{totalItems}</strong> {itemLabel}
              {totalUnfiltered !== undefined && totalUnfiltered > totalItems && (
                <span className="text-slate-400"> (lọc từ {totalUnfiltered})</span>
              )}
            </>
          )}
        </span>

        {onPageSizeChange && pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <label htmlFor={`${id}-page-size`} className="text-caption text-slate-500 select-none">
              Hiển thị:
            </label>
            <select
              id={`${id}-page-size`}
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium outline-none focus:border-violet-500 cursor-pointer hover:border-slate-300 transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Điều khiển chuyển trang */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          {/* Đầu trang */}
          <button
            type="button"
            id={`${id}-first-btn`}
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Về trang đầu"
            title="Trang đầu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white cursor-pointer"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>

          {/* Trang trước */}
          <button
            type="button"
            id={`${id}-prev-btn`}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Trang trước"
            title="Trang trước"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Các nút số trang */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-6 items-center justify-center text-caption text-slate-400 select-none"
                    aria-hidden="true"
                  >
                    …
                  </span>
                );
              }

              const isActive = p === safeCurrentPage;
              return (
                <button
                  key={p}
                  type="button"
                  id={`${id}-page-${p}-btn`}
                  onClick={() => onPageChange(p)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Trang ${p}`}
                  className={`flex h-8 min-w-[32px] px-1.5 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? activeBtnClass
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Trang sau */}
          <button
            type="button"
            id={`${id}-next-btn`}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Trang sau"
            title="Trang sau"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Cuối trang */}
          <button
            type="button"
            id={`${id}-last-btn`}
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Đến trang cuối"
            title="Trang cuối"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white cursor-pointer"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </nav>
  );
}
