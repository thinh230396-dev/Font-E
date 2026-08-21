import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

/**
 * DataTable — README §12 và §20.
 *
 * Chuẩn hoá header, thân bảng, và ba trạng thái loading / empty / error ngay
 * trong vùng bảng (§12.2). Cột số căn phải và dùng tabular numbers (§12.1, §4.3).
 */
export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Nội dung ô. Trả về `null`/`undefined` sẽ được hiển thị là `—` (§12.3). */
  cell: (row: T, index: number) => ReactNode;
  /** Căn phải và bật tabular numbers cho tiền, số lượng, phần trăm. */
  numeric?: boolean;
  /** Cột thao tác — luôn nằm bên phải (§8.3, §12.1). */
  actions?: boolean;
  width?: string;
  /** Ẩn cột ở màn hình hẹp thay vì cuộn ngang vô hạn (§17.2). */
  hideBelow?: 'sm' | 'md' | 'lg';
  headerSrOnly?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  /** Nội dung khi không có bản ghi. Trạng thái rỗng là lời mời hành động (§20.2). */
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string | undefined;
  className?: string;
  /** Chú thích dưới bảng: phạm vi đang xem, tổng số bản ghi (§12.2). */
  footer?: ReactNode;
}

const hideClass = (hideBelow?: DataTableColumn<unknown>['hideBelow']) =>
  hideBelow ? `ui-table-col-hide-${hideBelow}` : '';

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription,
  emptyAction,
  onRowClick,
  rowClassName,
  className = '',
  footer,
}: DataTableProps<T>) {
  const colSpan = columns.length;

  const renderState = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={colSpan} className="ui-table-state">
            <div className="ui-table-state-inner" role="status" aria-live="polite">
              <Loader2 className="ui-table-state-spinner" aria-hidden="true" />
              <p className="ui-table-state-title">Đang tải dữ liệu</p>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={colSpan} className="ui-table-state">
            <div className="ui-table-state-inner ui-table-state--error" role="alert">
              <AlertTriangle className="ui-table-state-icon" aria-hidden="true" />
              <p className="ui-table-state-title">Không tải được dữ liệu</p>
              <p className="ui-table-state-text">{error}</p>
              {onRetry && (
                <button type="button" onClick={onRetry} className="ui-table-state-action">
                  Thử lại
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td colSpan={colSpan} className="ui-table-state">
          <div className="ui-table-state-inner">
            <Inbox className="ui-table-state-icon" aria-hidden="true" />
            <p className="ui-table-state-title">{emptyTitle}</p>
            {emptyDescription && <p className="ui-table-state-text">{emptyDescription}</p>}
            {emptyAction}
          </div>
        </td>
      </tr>
    );
  };

  const hasRows = !loading && !error && rows.length > 0;

  return (
    <div className={`ui-table-wrap ${className}`.trim()}>
      <div className="ui-table-scroll">
        <table className="ui-table">
          {caption && <caption className="ui-table-caption">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={[
                    column.numeric ? 'ui-table-numeric' : '',
                    column.actions ? 'ui-table-actions' : '',
                    hideClass(column.hideBelow),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.headerSrOnly ? <span className="sr-only">{column.header}</span> : column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasRows
              ? rows.map((row, index) => (
                  <tr
                    key={rowKey(row, index)}
                    onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                    className={[
                      onRowClick ? 'is-clickable' : '',
                      rowClassName ? rowClassName(row, index) : ''
                    ].filter(Boolean).join(' ') || undefined}
                  >
                    {columns.map((column) => {
                      const content = column.cell(row, index);
                      return (
                        <td
                          key={column.key}
                          className={[
                            column.numeric ? 'ui-table-numeric' : '',
                            column.actions ? 'ui-table-actions' : '',
                            hideClass(column.hideBelow),
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {content === null || content === undefined || content === '' ? '—' : content}
                        </td>
                      );
                    })}
                  </tr>
                ))
              : renderState()}
          </tbody>
        </table>
      </div>
      {footer && <div className="ui-table-footer">{footer}</div>}
    </div>
  );
}
