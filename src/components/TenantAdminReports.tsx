import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import useRevenueReport from '../hooks/useRevenueReport';
import type { RevenueReportDto } from '../services/reports';
import type { ApiError } from '../services/apiClient';

import { getTenantAdminInitialData, isTenantAdminLiveDataMode } from '../utils/mockDataReset';
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  Check,
  CircleDollarSign,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileBarChart,
  LockKeyhole,
  Mail,
  Maximize2,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Star,
  Store,
  UserPlus,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { formatMoney as money } from '../utils/money';
import { Button, DataTable, Field, MockDataNotice, Modal, StatusBadge, PageHeader } from './ui';
import type { DataTableColumn } from './ui';
import { tenantStorageKey } from '../utils/tenantStorage';

type BranchCode = 'Q1' | 'Q3';
type ReportTab = 'REVENUE' | 'OPERATIONS' | 'CUSTOMERS' | 'STAFF' | 'EXPORTS';
type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type ComparisonFilter = 'NONE' | 'PREVIOUS_PERIOD' | 'SAME_PERIOD_LAST_YEAR' | 'TARGET';
/**
 * @param activeTenantId Tiệm đang làm việc. Rỗng thì tab doanh thu không gọi API — chế độ trình
 *   diễn dữ liệu mẫu không có tiệm thật nào để báo cáo.
 * @param activeBranchId Bộ lọc chi nhánh gửi lên API — **mã định danh thật**, hoặc rỗng để lấy
 *   cả tiệm. Cố ý là một prop riêng thay vì dùng lại `selectedBranch`: ô chọn trên màn hình có
 *   thể còn giữ một mã hiển thị kiểu `'Q3'` từ thời dữ liệu mẫu, và gửi mã ấy lên API sẽ trả về
 *   rỗng — báo cáo trống trơn trông y hệt "kỳ này không thu được đồng nào".
 */
interface TenantAdminReportsProps { searchQuery: string; onSearchQueryChange: (value: string) => void; selectedBranch: string; onSelectedBranchChange: (value: string) => void; branches?: Array<{ code: string; name: string }>; tenantName?: string; roleLabel?: string; accessMode?: 'full' | 'limited' | 'locked'; readOnlyReason?: string; onNotify?: (message: string) => void; activeTenantId?: string | null; activeBranchId?: string | null; }
interface ReportTemplate { id: string; name: string; group: string; description: string; updatedAt: string; format: string; access: string; favorite: boolean; }
interface ReportSchedule { id: string; name: string; frequency: ScheduleFrequency; time: string; recipients: string[]; format: string; branch: BranchCode | 'ALL'; nextRun: string; active: boolean; }

const templates: ReportTemplate[] = [
  { id: 'RPT-EXEC-01', name: 'Tổng quan điều hành', group: 'Điều hành', description: 'Doanh thu, lợi nhuận, công suất, khách hàng và hiệu suất chi nhánh.', updatedAt: '20/07/2026 · 16:30', format: 'PDF · Excel', access: 'Owner · Tenant Admin', favorite: true },
  { id: 'RPT-REV-02', name: 'Doanh thu theo dịch vụ', group: 'Tài chính', description: 'Phân tích doanh thu, lượt sử dụng, giá trị trung bình và tăng trưởng từng dịch vụ.', updatedAt: '20/07/2026 · 16:15', format: 'Excel · CSV', access: 'Tenant Admin · Finance', favorite: true },
  { id: 'RPT-BRANCH-03', name: 'So sánh hiệu suất chi nhánh', group: 'Vận hành', description: 'So sánh doanh thu, công suất ghế, tỷ lệ quay lại và chi phí vận hành.', updatedAt: '20/07/2026 · 16:00', format: 'PDF · Excel', access: 'Owner · Tenant Admin', favorite: false },
  { id: 'RPT-CUS-04', name: 'Phân khúc & giữ chân khách', group: 'Khách hàng', description: 'Khách mới, quay lại, rời bỏ, LTV và hiệu quả chương trình thành viên.', updatedAt: '20/07/2026 · 15:45', format: 'Excel · CSV', access: 'Tenant Admin · CRM', favorite: true },
  { id: 'RPT-STAFF-05', name: 'Hiệu suất & hoa hồng nhân sự', group: 'Nhân sự', description: 'Doanh thu, năng suất, đánh giá, tỷ lệ lấp lịch và hoa hồng kỹ thuật viên.', updatedAt: '20/07/2026 · 15:30', format: 'PDF · Excel', access: 'Owner · Tenant Admin', favorite: false },
  { id: 'RPT-INV-06', name: 'Tồn kho & tiêu hao vật tư', group: 'Kho', description: 'Giá trị tồn, vòng quay, tiêu hao theo dịch vụ và cảnh báo thiếu hàng.', updatedAt: '20/07/2026 · 15:10', format: 'Excel · CSV', access: 'Tenant Admin · Inventory', favorite: false }
];
const scheduleSeed: ReportSchedule[] = [
  { id: 'SCH-01', name: 'Báo cáo điều hành đầu tuần', frequency: 'WEEKLY', time: '08:00 · Thứ Hai', recipients: ['owner@lumiere.vn', 'finance@lumiere.vn'], format: 'PDF', branch: 'ALL', nextRun: '27/07/2026 · 08:00', active: true },
  { id: 'SCH-02', name: 'Doanh thu cuối ngày', frequency: 'DAILY', time: '21:30', recipients: ['owner@lumiere.vn'], format: 'Excel', branch: 'ALL', nextRun: '20/07/2026 · 21:30', active: true },
  { id: 'SCH-03', name: 'Hiệu suất chi nhánh Quận 3', frequency: 'WEEKLY', time: '09:00 · Thứ Ba', recipients: ['manager.q3@lumiere.vn'], format: 'PDF', branch: 'Q3', nextRun: '21/07/2026 · 09:00', active: true },
  { id: 'SCH-04', name: 'Tổng hợp hoa hồng tháng', frequency: 'MONTHLY', time: '08:00 · Ngày 01', recipients: ['hr@lumiere.vn', 'owner@lumiere.vn'], format: 'Excel', branch: 'ALL', nextRun: '01/08/2026 · 08:00', active: false }
];
// `EXPORTS` từng có trong kiểu ReportTab nhưng thiếu ở đây, khiến toàn bộ thư
// viện báo cáo và lịch gửi tự động không truy cập được. Đã bổ sung lại.
/* Không còn tab "Tổng quan": phần tóm tắt nay luôn hiển thị ở đầu trang thay vì
   là một tab ngang hàng với các nhóm chi tiết. */
const tabs: Array<{ id: ReportTab; label: string }> = [{ id: 'REVENUE', label: 'Doanh thu' }, { id: 'OPERATIONS', label: 'Vận hành' }, { id: 'CUSTOMERS', label: 'Khách hàng' }, { id: 'STAFF', label: 'Nhân sự' }, { id: 'EXPORTS', label: 'Xuất & lịch gửi' }];
const comparisonLabels: Record<ComparisonFilter, string> = { NONE: 'Không so sánh', PREVIOUS_PERIOD: 'Kỳ liền trước', SAME_PERIOD_LAST_YEAR: 'Cùng kỳ năm trước', TARGET: 'Mục tiêu KPI' };
/** Card của trang — đúng bộ class card đang dùng ở Lịch hẹn, Ghế/Bàn và Dịch vụ. */
const cardClass = 'rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card';
/** Control đứng một mình. Control trong biểu mẫu dùng `Field`, đã có sẵn hình thức. */
const controlClass = 'h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface px-3 text-body text-brand-text outline-none';
/** Chuỗi dữ liệu trong biểu đồ nhiều chuỗi — thang phân loại dẫn xuất từ accent. */
const chartSeries = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
/* Tiền luôn hiện đủ chữ số. Trước đây trang này trộn "1,1 tỷ ₫", "1.141tr",
   "168,4 triệu ₫" và "780.000 ₫" trên cùng một màn hình, nên muốn so hai con số
   là phải quy đổi trong đầu. Giữ tên `shortMoney` để không phải sửa ~30 chỗ gọi. */
const shortMoney = (value: number) => money(value);
const branchName = (branch: BranchCode | 'ALL') => branch === 'ALL' ? 'Tất cả chi nhánh' : branch === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3';
const formatReportDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};
const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Khoảng ngày mặc định: **30 ngày gần nhất tính đến hôm nay**.
 *
 * Trước đó là hai hằng số `2026-07-01` – `2026-07-20`, viết ra khi trang còn chạy bằng dữ
 * liệu mẫu nằm trọn trong tháng 7. Từ ngày 16 tab Doanh thu đọc tiền thật, mà tiền thật thì
 * luôn nằm ở những ngày gần nhất — nên mở trang lên là báo cáo trống, kèm đúng câu
 * "Chưa có khoản thu nào trong kỳ này". Một kỳ báo cáo cố định trong quá khứ không nói dối
 * về con số, nhưng nó nói dối về việc **tiệm có thu được tiền hay không**.
 *
 * Chọn 30 ngày để khớp thẻ "Doanh thu 30 ngày qua" ở màn Tổng quan: hai màn cùng trả lời một
 * câu hỏi thì phải mở ra cùng một kỳ, nếu không người đọc sẽ thấy hai con số khác nhau và
 * không có gì trên màn hình giải thích vì sao.
 */
const defaultReportRange = (() => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);

  return { start: toIsoDate(start), end: toIsoDate(end) };
})();

/**
 * Khối nội dung của trang báo cáo.
 *
 * Chỉ gói lại đúng bộ class card đang dùng ở các màn hình khác — không phải một
 * component thư viện mới. Tiêu đề luôn là `h2` để mọi khối cùng một bậc dưới `h1`.
 */
function ReportCard({ title, description, action, className = '', bodyClassName = '', children }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  return <section className={`min-w-0 ${cardClass} ${className}`}>
    {(title || action) && <div className="flex flex-wrap items-start justify-between gap-3">
      {title && <div className="min-w-0">
        <h2 className="text-card-title text-brand-text">{title}</h2>
        {description && <p className="mt-0.5 text-body text-brand-text-muted">{description}</p>}
      </div>}
      {action}
    </div>}
    {children && <div className={`min-w-0 ${title || action ? 'mt-4' : ''} ${bodyClassName}`}>{children}</div>}
  </section>;
}

function ReportRangeCalendar({ value, onChange }: { value: { start: string; end: string }; onChange: (next: { start: string; end: string }) => void }) {
  const initialDate = value.start ? fromIsoDate(value.start) : new Date();
  const [viewDate, setViewDate] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const chooseDay = (day: number) => {
    const selected = toIsoDate(new Date(year, month, day));
    if (!value.start || value.end || selected < value.start) onChange({ start: selected, end: '' });
    else onChange({ start: value.start, end: selected });
  };
  return <div className="mt-4 rounded-card border border-brand-outline bg-brand-surface-lowest p-3">
    <div className="flex items-center justify-between">
      <Button size="small" variant="ghost" iconOnly aria-label="Tháng trước" onClick={() => setViewDate(new Date(year, month - 1, 1))}><ChevronLeft /></Button>
      <p className="text-body font-semibold text-brand-text">Tháng {month + 1}/{year}</p>
      <Button size="small" variant="ghost" iconOnly aria-label="Tháng sau" onClick={() => setViewDate(new Date(year, month + 1, 1))}><ChevronRight /></Button>
    </div>
    <div className="mt-3 grid grid-cols-7 gap-1 text-center">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <span key={label} className="py-1 text-caption font-semibold text-brand-text-muted">{label}</span>)}{cells.map((day, index) => {
      if (!day) return <span key={`empty-${index}`} />;
      const iso = toIsoDate(new Date(year, month, day));
      const isEndpoint = iso === value.start || iso === value.end;
      const isInRange = Boolean(value.start && value.end && iso > value.start && iso < value.end);
      return <button key={iso} type="button" onClick={() => chooseDay(day)} aria-label={formatReportDate(iso)} aria-pressed={isEndpoint} className={`flex h-9 min-h-0 items-center justify-center rounded-control border-0 p-0 text-body tabular-nums shadow-none ${isEndpoint ? 'bg-[var(--accent)] font-bold text-[color:var(--color-brand-on-primary)]' : isInRange ? 'bg-[var(--accent-soft)] font-semibold text-[color:var(--accent-strong)]' : 'bg-transparent text-brand-text'}`}>{day}</button>;
    })}</div>
  </div>;
}

function BranchComparisonTable({ branches }: { branches: Array<{ code: string; name: string }> }) {
  const [expanded, setExpanded] = useState(false);
  const comparisonBranches = branches.map((branch, index) => {
    if (branch.code === 'Q3') return { ...branch, capacity: 86.4, bookings: 42, revenue: 5.8, noShow: 4.2, rating: 4.9 };
    if (branch.code === 'Q1') return { ...branch, capacity: 77.8, bookings: 31, revenue: 5.2, noShow: 5.6, rating: 4.8 };
    const seed = [...branch.code].reduce((sum, character) => sum + character.charCodeAt(0), index * 7);
    return { ...branch, capacity: 72 + seed % 18, bookings: 26 + seed % 18, revenue: 4.4 + (seed % 16) / 10, noShow: 3.8 + (seed % 20) / 10, rating: 4.5 + (seed % 5) / 10 };
  });
  const rows = [
    { label: 'Công suất', value: (branch: typeof comparisonBranches[number]) => `${branch.capacity.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` },
    { label: 'Lịch/ngày', value: (branch: typeof comparisonBranches[number]) => branch.bookings.toLocaleString('vi-VN') },
    { label: 'Doanh thu/ghế', value: (branch: typeof comparisonBranches[number]) => money(branch.revenue * 1_000_000) },
    { label: 'Hủy/no-show', value: (branch: typeof comparisonBranches[number]) => `${branch.noShow.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` },
    { label: 'Đánh giá', value: (branch: typeof comparisonBranches[number]) => branch.rating.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }
  ];
  const previewBranches = comparisonBranches.slice(0, 2);

  // Chỉ số là hàng, chi nhánh là cột — dạng này so sánh nhanh hơn thẻ rời.
  const buildColumns = (list: typeof comparisonBranches): DataTableColumn<(typeof rows)[number]>[] => [
    { key: 'metric', header: 'Chỉ số', width: '34%', cell: (row) => <span className="font-semibold text-brand-text">{row.label}</span> },
    ...list.map((branch, index) => ({
      key: branch.code,
      numeric: true,
      header: (
        <span className="block">
          <span className="block truncate text-brand-text">{branch.name.replace(/^Chi nhánh\s+/i, '')}</span>
          <span className="block font-normal text-brand-text-muted">{branch.code}</span>
        </span>
      ),
      cell: (row: (typeof rows)[number]) => (
        <span className={index === 0 ? 'font-bold text-[color:var(--accent-strong)]' : 'text-brand-text'}>{row.value(branch)}</span>
      )
    }))
  ];

  return <section className={`min-w-0 ${cardClass}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-card-title text-brand-text">So sánh chi nhánh</h2>
        <p className="mt-0.5 text-body text-brand-text-muted">Xem nhanh {previewBranches.length}/{comparisonBranches.length} chi nhánh</p>
      </div>
      <Button size="small" variant="secondary" iconLeading={<Maximize2 />} onClick={() => setExpanded(true)}>Xem tất cả</Button>
    </div>

    <DataTable
      className="mt-4"
      columns={buildColumns(previewBranches)}
      rows={rows}
      rowKey={(row) => row.label}
      caption={`Chỉ số vận hành của ${previewBranches.length} chi nhánh nổi bật`}
    />

    <Modal
      open={expanded}
      onClose={() => setExpanded(false)}
      size="large"
      eyebrow="Báo cáo vận hành"
      title="So sánh toàn bộ chi nhánh"
      description={`${comparisonBranches.length} chi nhánh trong cùng kỳ báo cáo`}
      footer={<Button variant="secondary" onClick={() => setExpanded(false)}>Đóng</Button>}
    >
      <DataTable
        columns={buildColumns(comparisonBranches)}
        rows={rows}
        rowKey={(row) => row.label}
        caption={`Chỉ số vận hành của ${comparisonBranches.length} chi nhánh`}
      />
    </Modal>
  </section>;
}

/**
 * Bảng phân rã dùng chung cho cả bốn chiều của BR-REV-004.
 *
 * Một component cho cả bốn vì chúng chỉ khác nhau ở nhãn cột đầu. Dựng bốn khối gần giống hệt
 * nhau là bốn chỗ để sửa mỗi lần đổi cách trình bày một con số tiền.
 *
 * Thanh tỉ trọng vẽ theo dòng lớn nhất chứ không theo tổng: mắt cần so các dòng với nhau, và
 * chia theo tổng thì một danh sách dài toàn thanh ngắn tí, không đọc được gì.
 */
function RevenueBreakdown({ title, hint, rows, empty }: {
  title: string;
  hint: string;
  rows: Array<{ key: string; label: string; revenue: number; invoiceCount: number; extra?: ReactNode }>;
  empty: string;
}) {
  const peak = rows.reduce((max, row) => Math.max(max, row.revenue), 0);

  return <section className={cardClass}>
    <p className="text-body font-semibold text-brand-text">{title}</p>
    <p className="mt-1 text-caption text-brand-text-muted">{hint}</p>

    {rows.length === 0
      ? <p className="mt-4 text-body text-brand-text-muted">{empty}</p>
      : <ul className="mt-4 flex flex-col divide-y divide-brand-outline">
        {rows.map((row) => <li key={row.key || row.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-body text-brand-text">{row.label}</span>
            <strong className="shrink-0 tabular-nums text-body font-semibold text-brand-text">{money(row.revenue)}</strong>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-pill bg-brand-surface-high">
            <div
              className="h-full rounded-pill bg-[var(--accent)]"
              style={{ width: `${peak > 0 ? Math.max(2, row.revenue / peak * 100) : 0}%` }}
            />
          </div>
          <p className="text-caption text-brand-text-muted">
            {row.invoiceCount.toLocaleString('vi-VN')} hóa đơn{row.extra ? <> · {row.extra}</> : null}
          </p>
        </li>)}
      </ul>}
  </section>;
}

/**
 * Tab "Doanh thu" — dữ liệu THẬT từ ngày 16.
 *
 * Bản trước dựng toàn bộ con số từ hằng số nhân với nhau: doanh thu gộp là `revenue / 0.967`,
 * hoàn tiền là phần dư của một phép trừ, tỉ trọng phương thức thanh toán là bốn số cố định
 * 42/28/18/12. Không con số nào đến từ dữ liệu, và chúng vẫn đổi theo bộ lọc chi nhánh nên
 * trông rất giống thật. Đã bỏ hết — cùng với các khối không có nguồn dữ liệu nào phía sau:
 * mục tiêu kỳ, tỉ lệ tăng trưởng, kênh bán, và tỉ trọng phương thức thanh toán.
 *
 * BR-REV-006 nói API chỉ cung cấp endpoint tổng hợp; những khối ấy cần dữ liệu mà hệ thống cố
 * ý không thu thập, nên giữ chúng lại chỉ để đẹp trang là để lại số bịa cạnh số thật.
 */
function RevenueReportTab({ report, loading, error, periodLabel, onRetry }: {
  report: RevenueReportDto | null;
  loading: boolean;
  error: ApiError | null;
  periodLabel: string;
  onRetry: () => void;
}) {
  if (loading && !report) {
    return <section className={cardClass}>
      <p className="text-body text-brand-text-muted">Đang tải báo cáo doanh thu…</p>
    </section>;
  }

  if (error) {
    return <section className={cardClass}>
      <p className="text-body font-semibold text-brand-text">Không tải được báo cáo doanh thu</p>
      <p className="mt-1 text-body text-brand-text-muted">{error.message}</p>
      <button type="button" onClick={onRetry} className="mt-3 text-body font-semibold text-[var(--accent)] underline">
        Thử lại
      </button>
    </section>;
  }

  if (!report || report.invoiceCount === 0) {
    return <section className={cardClass}>
      <p className="text-body font-semibold text-brand-text">Chưa có khoản thu nào trong kỳ này</p>
      <p className="mt-1 text-body text-brand-text-muted">
        Doanh thu ghi nhận theo tiền thực thu, nên một kỳ chưa ai trả tiền sẽ trống — kể cả khi
        đã có lịch hẹn. Chọn khoảng ngày khác để xem.
      </p>
    </section>;
  }

  return <div className="flex flex-col gap-4">
    {/* Tóm tắt kỳ — số lớn dẫn dắt, ba con số phụ chia bằng đường kẻ chứ không đóng khung riêng */}
    <section className={`flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between ${cardClass}`}>
      <div className="min-w-0">
        <p className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">
          Doanh thu tiệm · {periodLabel}
        </p>
        <p className="mt-2 text-display font-bold tabular-nums text-brand-text">{money(report.revenue)}</p>
        <p className="mt-2 text-body text-brand-text-muted">
          Theo tiền thực thu, đã trừ hoàn tiền và không tính tip ·{' '}
          {report.invoiceCount.toLocaleString('vi-VN')} hóa đơn có phát sinh thu
        </p>
      </div>
      <dl className="flex flex-col gap-3 sm:flex-row sm:gap-8 lg:flex-col lg:gap-3">
        {[
          { label: 'Tiền qua két', value: report.collected, hint: 'Gồm cả tip khách đưa' },
          { label: 'Tip cho kỹ thuật viên', value: report.tips, hint: 'Tiệm giữ hộ, không tính doanh thu' },
          { label: 'Đã hoàn cho khách', value: report.refunds, hint: 'Trừ vào ngày hoàn, không sửa ngày cũ' }
        ].map((item) => <div key={item.label} className="flex items-baseline justify-between gap-6">
          <dt className="text-body text-brand-text-muted">{item.label}</dt>
          <dd className="text-right">
            <strong className="tabular-nums text-body font-semibold text-brand-text">{money(item.value)}</strong>
            <p className="text-caption text-brand-text-muted">{item.hint}</p>
          </dd>
        </div>)}
      </dl>
    </section>

    {/* Bốn chiều của BR-REV-004. Cộng bảng nào lại cũng ra đúng con số tổng phía trên. */}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RevenueBreakdown
        title="Theo ngày"
        hint="Ngày ghi nhận là ngày khách trả tiền, không phải ngày lập hóa đơn."
        rows={report.byDay}
        empty="Chưa có ngày nào phát sinh thu."
      />
      <RevenueBreakdown
        title="Theo chi nhánh"
        hint="Chi nhánh của hóa đơn, tức nơi khách được phục vụ."
        rows={report.byBranch}
        empty="Chưa có chi nhánh nào phát sinh thu."
      />
      <RevenueBreakdown
        title="Theo nhân viên"
        hint="Nguồn tính hoa hồng. Tỉ lệ đọc từ hồ sơ nhân viên tại thời điểm xem báo cáo."
        rows={report.byStaff.map((row) => ({
          ...row,
          extra: row.commissionRate > 0
            ? <>hoa hồng {(row.commissionRate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% ={' '}
              <strong className="tabular-nums text-brand-text">{money(row.commission)}</strong></>
            : 'chưa đặt tỉ lệ hoa hồng'
        }))}
        empty="Chưa có hóa đơn nào được ghi công."
      />
      <RevenueBreakdown
        title="Theo dịch vụ"
        hint="Doanh thu của hóa đơn chia cho từng dòng hàng theo tỉ lệ giá trị."
        rows={report.byService}
        empty="Chưa có dịch vụ nào phát sinh thu."
      />
    </div>

    <p className="text-caption text-brand-text-muted">
      Bốn bảng trên cộng lại đều ra đúng {money(report.revenue)} — mỗi bảng là một cách nhìn khác
      nhau của cùng một số tiền, không phải bốn phép tính riêng.
    </p>
  </div>;
}

export default function TenantAdminReports({ searchQuery, onSearchQueryChange, selectedBranch, branches = [{ code: 'Q3', name: 'Chi nhánh Quận 3' }, { code: 'Q1', name: 'Chi nhánh Quận 1' }], tenantName = 'Lumière Nail Studio', roleLabel = 'Owner · Tenant Admin', accessMode = 'full', readOnlyReason, onNotify, activeTenantId, activeBranchId }: TenantAdminReportsProps) {
  const [tab, setTab] = useState<ReportTab>('REVENUE');
  /* Phân tích chi tiết thu gọn mặc định. Để mở sẵn thì trang dài hơn 4.000px và
     phần tóm tắt lại chìm nghỉm giữa các biểu đồ — đúng thứ vừa đi sửa. */
  const [detailOpen, setDetailOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [dateRange, setDateRange] = useState(defaultReportRange);
  const [draftDateRange, setDraftDateRange] = useState(defaultReportRange);
  const [dateRangeError, setDateRangeError] = useState('');
  const [compare, setCompare] = useState<ComparisonFilter>('PREVIOUS_PERIOD');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => getTenantAdminInitialData(null, scheduleSeed));
  const [builderOpen, setBuilderOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [builder, setBuilder] = useState({ name: '', group: 'Điều hành', metrics: ['Doanh thu'] as string[], dimension: 'Theo ngày', format: 'Excel', includeComparison: true });
  const [scheduleForm, setScheduleForm] = useState({ name: '', frequency: 'WEEKLY' as ScheduleFrequency, time: '08:00', recipients: '', format: 'PDF', branch: 'ALL' as BranchCode | 'ALL' });
  const canManage = accessMode === 'full';
  const requireManage = () => { if (canManage) return true; const message = readOnlyReason || 'Gói hiện tại chỉ cho phép xem báo cáo cơ bản.'; setNotice(message); onNotify?.(message); return false; };
  const filteredTemplates = useMemo(() => { const query = searchQuery.trim().toLocaleLowerCase('vi'); return getTenantAdminInitialData(null, templates).filter((item) => groupFilter === 'ALL' || item.group === groupFilter).filter((item) => !favoriteOnly || item.favorite).filter((item) => !query || `${item.id} ${item.name} ${item.group} ${item.description}`.toLocaleLowerCase('vi').includes(query)); }, [favoriteOnly, groupFilter, searchQuery]);
  const storageKey = `${tenantStorageKey('tenant-admin-finance-v1')}:transactions`;
  const [completedTx, setCompletedTx] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.filter((t: any) => t.status === 'POSTED' || t.status === 'Hoàn thành');
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    const syncFinance = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setCompletedTx(parsed.filter((t: any) => t.status === 'POSTED' || t.status === 'Hoàn thành'));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('salonsys_finance_updated', syncFinance);
    window.addEventListener('storage', syncFinance);
    return () => {
      window.removeEventListener('salonsys_finance_updated', syncFinance);
      window.removeEventListener('storage', syncFinance);
    };
  }, [storageKey]);

  const scopedTx = useMemo(() => {
    return completedTx.filter(
      (t) => selectedBranch === 'ALL' || t.branch === selectedBranch
    );
  }, [completedTx, selectedBranch]);

  const realRevenueSum = useMemo(() => {
    return scopedTx
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [scopedTx]);

  const revenue =
    realRevenueSum > 0
      ? realRevenueSum
      : selectedBranch === 'Q1'
      ? 468600000
      : selectedBranch === 'Q3'
      ? 672400000
      : 1141000000;

  const bookings =
    selectedBranch === 'Q1'
      ? 612
      : selectedBranch === 'Q3'
      ? 846
      : 1458;
  const averageTicket = Math.round(revenue / (bookings || 1) / 10000) * 10000;
  const newCustomers =
    selectedBranch === 'Q1'
      ? 126
      : selectedBranch === 'Q3'
      ? 168
      : 294;
  /* Mục tiêu kỳ — trước đây nằm rải: hai chỉ số đầu lặp lại số của thẻ KPI phía
     trên (doanh thu ghi "1.141tr / 1.280tr" trong khi thẻ KPI ghi "1,1 tỷ ₫"),
     hai chỉ số sau thì không có thẻ KPI nào tương ứng. Gom về một nguồn: chỉ số
     nào có thẻ KPI thì tiến độ hiện luôn trong thẻ, số còn lại nằm ở mục "Đang
     chậm ở đâu". */
  const revenueTarget = 1_280_000_000;
  const newCustomerTarget = 350;
  const otherGoals = [
    { label: 'Tỷ lệ quay lại', actual: 74.2, target: 78, unit: '%' },
    { label: 'Công suất ghế', actual: 82.6, target: 85, unit: '%' },
  ];
  const goalPercent = (actual: number, target: number) => (target ? (actual / target) * 100 : 0);
  const revenueProgress = goalPercent(revenue, revenueTarget);
  const customerProgress = goalPercent(newCustomers, newCustomerTarget);
  /** Dưới 90% mục tiêu là mức cần chú ý — dùng chung cho mọi thanh tiến độ. */
  const BEHIND_THRESHOLD = 90;
  const behindGoals = [
    { label: 'doanh thu', percent: revenueProgress },
    { label: 'khách hàng mới', percent: customerProgress },
    ...otherGoals.map((item) => ({ label: item.label.toLocaleLowerCase('vi'), percent: goalPercent(item.actual, item.target) })),
  ].filter((item) => item.percent < BEHIND_THRESHOLD);

  const exportReport = (name = 'Báo cáo điều hành') => { const rows = [['Chỉ số', 'Giá trị', 'So sánh'], ['Doanh thu', revenue, '+16,8%'], ['Lịch hoàn tất', bookings, '+12,4%'], ['Giá trị trung bình', averageTicket, '+3,9%'], ['Khách mới', newCustomers, '+18,2%']]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); link.download = `${name.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}.csv`; link.click(); URL.revokeObjectURL(link.href); setNotice(`Đã xuất ${name}.`); };
  const submitBuilder = (event: FormEvent) => { event.preventDefault(); if (!requireManage()) return; if (!builder.name.trim() || builder.metrics.length === 0) { setFormError('Vui lòng nhập tên và chọn ít nhất một chỉ số.'); return; } setBuilderOpen(false); setNotice(`Đã tạo báo cáo tùy chỉnh “${builder.name}”.`); };
  const submitSchedule = (event: FormEvent) => { event.preventDefault(); if (!requireManage()) return; const recipients = scheduleForm.recipients.split(',').map((item) => item.trim()).filter(Boolean); if (!scheduleForm.name.trim() || recipients.length === 0) { setFormError('Vui lòng nhập tên lịch gửi và ít nhất một email nhận báo cáo.'); return; } const created: ReportSchedule = { id: `SCH-${String(schedules.length + 1).padStart(2, '0')}`, name: scheduleForm.name.trim(), frequency: scheduleForm.frequency, time: scheduleForm.time, recipients, format: scheduleForm.format, branch: scheduleForm.branch, nextRun: scheduleForm.frequency === 'DAILY' ? `21/07/2026 · ${scheduleForm.time}` : scheduleForm.frequency === 'WEEKLY' ? `27/07/2026 · ${scheduleForm.time}` : `01/08/2026 · ${scheduleForm.time}`, active: true }; setSchedules((current) => [created, ...current]); setScheduleOpen(false); setNotice(`Đã tạo lịch gửi “${created.name}”.`); };
  const toggleSchedule = (schedule: ReportSchedule) => { if (!requireManage()) return; setSchedules((current) => current.map((item) => item.id === schedule.id ? { ...item, active: !item.active } : item)); setNotice(schedule.active ? `Đã tạm dừng ${schedule.name}.` : `Đã kích hoạt ${schedule.name}.`); };
  const switchTab = (next: ReportTab) => { setTab(next); onSearchQueryChange(''); };
  const lineValues = [42, 50, 47, 58, 55, 66, 61, 74, 68, 82, 77, 91, 84, 96];
  const previousValues = [39, 43, 45, 49, 51, 55, 58, 62, 64, 68, 71, 74, 76, 80];
  const periodLabel = `${formatReportDate(dateRange.start)} – ${formatReportDate(dateRange.end)}`;

  /*
    Báo cáo doanh thu — dữ liệu thật từ ngày 16.

    Chỉ tab "Doanh thu" đọc nó. Bốn tab còn lại (Vận hành, Khách hàng, Nhân sự, Xuất & lịch
    gửi) vẫn ở dữ liệu mẫu và sẽ ở đó suốt MVP: BR-REV-006 nói API chỉ cung cấp endpoint tổng
    hợp doanh thu, còn template báo cáo và lịch gửi định kỳ nằm ngoài phạm vi.
  */
  const revenueReport = useRevenueReport(
    Boolean(activeTenantId),
    activeTenantId || null,
    dateRange.start,
    dateRange.end,
    activeBranchId
  );
  const comparisonLabel = comparisonLabels[compare];
  const comparisonSuffix = compare === 'NONE' ? '' : `so với ${comparisonLabel.toLocaleLowerCase('vi')}`;
  const applyDateRange = () => {
    if (!draftDateRange.start || !draftDateRange.end) {
      setDateRangeError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (draftDateRange.start > draftDateRange.end) {
      setDateRangeError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
      return;
    }
    setDateRange(draftDateRange);
    setDateRangeError('');
    setDateRangeOpen(false);
  };

  /*
    Trước ngày 16, chế độ dữ liệu thật chặn TOÀN BỘ màn báo cáo bằng một khung trống — đúng
    lúc đó, vì mọi con số trên trang đều dựng từ hằng số nhân với nhau.

    Nay tab "Doanh thu" chạy dữ liệu thật nên khung ấy đã sai: nó giấu đi thứ duy nhất trên
    trang có thật. Bốn tab còn lại vẫn là dữ liệu mẫu và mang dải nhãn nói rõ điều đó — theo
    đúng quy ước §9.2 của lộ trình, và theo BR-REV-006 vốn đóng cửa vĩnh viễn cho template báo
    cáo, lịch gửi định kỳ và xuất file trong phạm vi MVP.
  */
  const liveDataMode = isTenantAdminLiveDataMode();

  /*
    Chế độ dữ liệu thật có một trang RIÊNG, không dùng chung cây render bên dưới.

    Lý do không phải để tiện: phần đầu trang cũ — tóm tắt kỳ, bốn thẻ KPI, biểu đồ xu hướng,
    top dịch vụ, cơ cấu chi nhánh, "việc cần làm" — dựng toàn bộ từ hằng số nhân với nhau.
    Mục tiêu kỳ, tỉ lệ tăng trưởng, công suất ghế và dự báo chi phí vật tư đều cần dữ liệu mà
    hệ thống **cố ý không thu thập**: BR-REV-006 giới hạn API ở đúng một endpoint tổng hợp
    doanh thu, và BR-REV-007 bỏ hẳn module chi phí.

    Trộn chúng vào cùng trang với con số thật là điều tệ nhất có thể làm ở đây — người đọc
    không có cách nào phân biệt, và một con số bịa nằm cạnh một con số thật thì cả hai cùng
    mất giá trị. Bản trình diễn giữ nguyên trang cũ, nơi đã nói rõ là dữ liệu mẫu.
  */
  if (liveDataMode) {
    return <div className="flex flex-col gap-6">
      <PageHeader title="Báo cáo doanh thu" />

      <section className={`flex flex-wrap items-end gap-4 ${cardClass}`}>
        <Field label="Từ ngày">
          <input
            type="date"
            value={dateRange.start}
            max={dateRange.end}
            onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))}
            className="h-10 rounded-md border border-brand-outline bg-brand-surface px-3 text-body text-brand-text outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="Đến ngày">
          <input
            type="date"
            value={dateRange.end}
            min={dateRange.start}
            onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))}
            className="h-10 rounded-md border border-brand-outline bg-brand-surface px-3 text-body text-brand-text outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <p className="ml-auto max-w-md text-caption text-brand-text-muted">
          Doanh thu ghi nhận theo <strong className="text-brand-text">tiền thực thu</strong>, không
          theo lịch hẹn hoàn tất. Một buổi làm xong mà khách chưa trả tiền thì chưa vào báo cáo.
        </p>
      </section>

      <RevenueReportTab
        report={revenueReport.report}
        loading={revenueReport.loading}
        error={revenueReport.error}
        periodLabel={periodLabel}
        onRetry={revenueReport.reload}
      />

      <MockDataNotice
        title="Phạm vi trang này."
        reason="Số liệu doanh thu đọc thật từ máy chủ theo tiền thực thu. Template báo cáo, lịch gửi định kỳ và xuất file nằm ngoài phạm vi MVP theo BR-REV-006, nên trang chỉ có báo cáo doanh thu."
      />
    </div>;
  }

  return <div className="flex flex-col gap-6">
    {(notice || accessMode !== 'full') && (
      <div role="status" className="flex items-start justify-between gap-3 p-4 ui-tone ui-tone--info">
        <div className="flex min-w-0 items-start gap-3">
          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-text-muted" />
          <div className="min-w-0">
            <p className="text-body font-semibold text-brand-text">Trung tâm báo cáo</p>
            <p className="mt-0.5 text-body leading-5 text-brand-text-muted">
              {notice || readOnlyReason || 'Bạn đang xem báo cáo ở chế độ giới hạn theo quyền của gói.'}
            </p>
          </div>
        </div>
        {notice && <Button size="small" variant="ghost" iconOnly aria-label="Đóng thông báo" onClick={() => setNotice('')}><X /></Button>}
      </div>
    )}

    {/* Đầu trang (README §8.2) */}
    <PageHeader
      title="Báo cáo"
      actions={(
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" iconLeading={<Download />} onClick={() => exportReport()}>Xuất báo cáo</Button>
          <Button
            variant="primary"
            iconLeading={<Plus />}
            disabled={!canManage}
            onClick={() => { if (!requireManage()) return; setFormError(''); setBuilderOpen(true); }}
          >
            Tạo báo cáo
          </Button>
        </div>
      )}
    />

    {/* Cụm điều khiển: phạm vi dữ liệu và nhóm báo cáo nằm chung một card như thanh công cụ ở các màn khác */}
    <section className="rounded-card border border-brand-outline bg-brand-surface shadow-card">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              aria-label="Chọn khoảng ngày báo cáo"
              aria-expanded={dateRangeOpen}
              onClick={() => { setDraftDateRange(dateRange); setDateRangeError(''); setDateRangeOpen((open) => !open); }}
              className={`flex h-[var(--size-control)] min-w-64 items-center justify-between gap-3 rounded-control border bg-brand-surface px-3 text-body font-semibold shadow-none ${dateRangeOpen ? 'border-[color:var(--accent)] text-[color:var(--accent-strong)]' : 'border-brand-outline text-brand-text'}`}
            >
              <span className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-text-muted" />
                <span className="tabular-nums">{periodLabel}</span>
              </span>
              <ChevronDown aria-hidden="true" className={`h-4 w-4 text-brand-text-muted ${dateRangeOpen ? 'rotate-180' : ''}`} />
            </button>
            {dateRangeOpen && (
              <div
                role="dialog"
                aria-label="Chọn khoảng ngày báo cáo"
                className="absolute left-0 top-full mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-card border border-brand-outline bg-brand-surface p-4 shadow-floating"
                style={{ zIndex: 'var(--z-dropdown)' }}
              >
                <p className="text-body font-semibold text-brand-text">Khoảng thời gian báo cáo</p>
                <p className="mt-0.5 text-caption leading-4 text-brand-text-muted">Chọn ngày bắt đầu và ngày kết thúc cần tổng hợp.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-control border border-brand-outline p-3">
                    <p className="text-caption uppercase tracking-wide text-brand-text-muted">Từ ngày</p>
                    <p className="mt-1 text-body font-semibold tabular-nums text-brand-text">{draftDateRange.start ? formatReportDate(draftDateRange.start) : 'Chưa chọn'}</p>
                  </div>
                  <div className="rounded-control border border-brand-outline p-3">
                    <p className="text-caption uppercase tracking-wide text-brand-text-muted">Đến ngày</p>
                    <p className="mt-1 text-body font-semibold tabular-nums text-brand-text">{draftDateRange.end ? formatReportDate(draftDateRange.end) : 'Chọn ngày kết thúc'}</p>
                  </div>
                </div>
                <ReportRangeCalendar value={draftDateRange} onChange={(next) => { setDraftDateRange(next); setDateRangeError(''); }} />
                {dateRangeError && <p role="alert" className="mt-3 p-3 text-body font-semibold text-brand-text ui-tone ui-tone--danger">{dateRangeError}</p>}
                <div className="mt-4 flex justify-end gap-2 border-t border-brand-outline pt-3">
                  <Button size="small" variant="secondary" onClick={() => setDateRangeOpen(false)}>Hủy</Button>
                  <Button size="small" variant="primary" onClick={applyDateRange}>Áp dụng</Button>
                </div>
              </div>
            )}
          </div>

          <BeautifulSelect
            aria-label="Chọn mốc đối chiếu báo cáo"
            value={compare}
            onChange={(event) => setCompare(event.target.value as ComparisonFilter)}
            className={`${controlClass} w-52`}
          >
            <option value="NONE">Không so sánh</option>
            <option value="PREVIOUS_PERIOD">Kỳ liền trước</option>
            <option value="SAME_PERIOD_LAST_YEAR">Cùng kỳ năm trước</option>
            <option value="TARGET">Mục tiêu KPI</option>
          </BeautifulSelect>

          {/* Chi nhánh do topbar điều khiển (BeautifulSelect tự ẩn mọi bộ lọc chi
              nhánh cấp trang). Hiện lại ở đây để phạm vi dữ liệu nằm gọn một chỗ. */}
          <span
            title="Phạm vi chi nhánh được chọn ở thanh trên cùng"
            className="flex h-[var(--size-control)] items-center gap-1.5 rounded-control border border-brand-outline bg-brand-surface-lowest px-3 text-body text-brand-text-muted"
          >
            <Store aria-hidden="true" className="h-4 w-4" />
            <span className="text-brand-text-muted">Chi nhánh:</span>
            <strong className="font-semibold text-brand-text">{selectedBranch === 'ALL' ? 'Toàn tenant' : branchName(selectedBranch as BranchCode)}</strong>
          </span>
        </div>

        <p className="flex items-center gap-2 text-caption text-brand-text-muted">
          <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          Dữ liệu cập nhật lúc <strong className="tabular-nums text-brand-text">16:45 · 20/07/2026</strong>
        </p>
      </div>

    </section>

    {/* ===== 1. KỲ NÀY RA SAO =====================================
        Một câu kết luận trước, con số sau. Trước đây trang mở ra bằng 70 con số
        cùng cỡ chữ và không câu nào nói cho chủ tiệm biết nên nhìn cái gì. */}
    <section aria-label="Tóm tắt kỳ báo cáo" className={cardClass}>
      <p className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">
        Kỳ này ra sao · {periodLabel}
      </p>
      <p className="mt-2 text-card-title font-bold leading-6 text-brand-text">
        {behindGoals.length === 0
          ? 'Toàn bộ mục tiêu trong kỳ đều đang đạt tiến độ.'
          : `Đang chậm mục tiêu ${behindGoals.map((item) => item.label).join(', ')}. Các chỉ số còn lại đạt tiến độ.`}
      </p>
      <p className="mt-1.5 text-body text-brand-text-muted">
        Doanh thu thuần {shortMoney(revenue)} trên mục tiêu {shortMoney(revenueTarget)}
        {' · '}còn thiếu {shortMoney(Math.max(0, revenueTarget - revenue))} để về đích.
      </p>
    </section>

    {/* Bốn KPI dẫn dắt — thẻ trắng, mở chi tiết khi bấm.
        Chỉ số nào có mục tiêu thì thanh tiến độ nằm ngay trong thẻ, nhờ đó bỏ
        được hẳn thẻ "Mục tiêu tháng" vốn lặp lại chính những con số này. */}
    <section aria-label="Chỉ số điều hành" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Doanh thu thuần', value: shortMoney(revenue), detail: compare === 'NONE' ? `Trong ${periodLabel.toLocaleLowerCase('vi')}` : `+16,8% ${comparisonSuffix}`, key: 'revenue', icon: CircleDollarSign, percent: revenueProgress, goal: shortMoney(revenueTarget) },
        { label: 'Lịch hoàn tất', value: bookings.toLocaleString('vi-VN'), detail: '92,6% lịch đã xác nhận', key: 'bookings', icon: CalendarCheck2, percent: null, goal: '' },
        { label: 'Giá trị trung bình', value: money(averageTicket), detail: '+3,9% trên mỗi hóa đơn', key: 'ticket', icon: ReceiptText, percent: null, goal: '' },
        { label: 'Khách hàng mới', value: newCustomers.toLocaleString('vi-VN'), detail: 'Tỷ lệ quay lại 74,2%', key: 'customers', icon: UserPlus, percent: customerProgress, goal: `${newCustomerTarget.toLocaleString('vi-VN')} khách` }
      ].map(({ label, value, detail, key, icon: Icon, percent, goal }) => {
        const isGrowth = detail.trim().startsWith('+');
        const behind = percent !== null && percent < BEHIND_THRESHOLD;
        return (
          <article key={key} className={cardClass}>
            <button
              type="button"
              onClick={() => setMetricOpen(key)}
              aria-label={`Xem chi tiết ${label}: ${value}`}
              className="flex h-auto w-full flex-col items-start gap-1 border-0 bg-transparent p-0 text-left shadow-none"
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span className="text-caption text-brand-text-muted">{label}</span>
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-[var(--accent-soft)] text-[color:var(--accent-strong)]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              </span>
              <span className="ta-metric-value text-brand-text">{value}</span>
              <span className={`flex items-center gap-1 text-caption ${isGrowth ? 'font-semibold text-brand-secondary' : 'text-brand-text-muted'}`}>
                {isGrowth && <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />}{detail}
              </span>
              {percent !== null && (
                <span className="mt-2 block w-full">
                  <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-pill bg-brand-surface-high">
                    <span className="block h-full rounded-pill" style={{ width: `${Math.min(100, percent)}%`, background: behind ? 'var(--color-brand-tertiary)' : 'var(--accent)' }} />
                  </span>
                  <span className={`mt-1 block text-caption tabular-nums ${behind ? 'text-brand-tertiary' : 'text-brand-text-muted'}`}>
                    Đạt {percent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% mục tiêu {goal}
                  </span>
                </span>
              )}
            </button>
          </article>
        );
      })}
    </section>

    <div className="min-w-0">
      {/* ===== 2. ĐANG CHẬM Ở ĐÂU ================================== */}
      <div className="flex flex-col gap-4">
        <h2 className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">Đang chậm ở đâu</h2>
        {/* Biểu đồ dẫn dắt: xu hướng bên trái, hai mục tiêu không có thẻ KPI bên phải */}
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <ReportCard title="Xu hướng doanh thu" description="Doanh thu theo ngày và đường so sánh kỳ trước">
            <div
              role="img"
              aria-label={`Biểu đồ doanh thu theo ngày trong ${periodLabel}, kèm điểm dữ liệu của kỳ trước để đối chiếu.`}
              className="relative ml-11 mt-2 h-48 border-b border-l border-brand-outline"
            >
              <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
                {[100, 75, 50, 25, 0].map((value) => <div key={value} className="border-t border-dashed border-brand-outline"><span className="-ml-11 -translate-y-2 block w-9 text-right text-caption tabular-nums text-brand-text-muted">{value}%</span></div>)}
              </div>
              <div aria-hidden="true" className="absolute inset-0 flex items-end gap-1.5 px-2">
                {lineValues.map((value, index) => <div key={index} className="relative flex h-full flex-1 items-end">
                  <span className="absolute bottom-0 w-full rounded-t-control" style={{ height: `${value}%`, background: 'var(--accent-soft)' }} />
                  <span className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-pill" style={{ bottom: `calc(${value}% - 5px)`, background: 'var(--accent)' }} />
                  <span className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-pill bg-brand-text-muted" style={{ bottom: `calc(${previousValues[index]}% - 4px)` }} />
                </div>)}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-5 text-caption text-brand-text-muted">
              <span className="flex items-center gap-1.5"><i aria-hidden="true" className="h-2.5 w-2.5 rounded-pill" style={{ background: 'var(--accent)' }} />Kỳ hiện tại</span>
              <span className="flex items-center gap-1.5"><i aria-hidden="true" className="h-2.5 w-2.5 rounded-pill bg-brand-text-muted" />Kỳ trước</span>
            </div>
          </ReportCard>

          <ReportCard title="Mục tiêu khác trong kỳ" description="Hai chỉ số không có thẻ riêng ở trên">
            <dl className="flex flex-col gap-4">
              {otherGoals.map((item) => {
                const percent = goalPercent(item.actual, item.target);
                const behind = percent < BEHIND_THRESHOLD;
                return <div key={item.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-body">
                    <dt className="text-brand-text">{item.label}</dt>
                    <dd className="font-semibold tabular-nums text-brand-text">
                      {item.actual.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}{item.unit} / {item.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}{item.unit}
                    </dd>
                  </div>
                  <div aria-hidden="true" className="h-2 overflow-hidden rounded-pill bg-brand-surface-high">
                    <div className="h-full rounded-pill" style={{ width: `${Math.min(100, percent)}%`, background: behind ? 'var(--color-brand-tertiary)' : 'var(--accent)' }} />
                  </div>
                  <p className={`mt-1 text-caption tabular-nums ${behind ? 'text-brand-tertiary' : 'text-brand-text-muted'}`}>
                    Đạt {percent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% mục tiêu{behind ? ' · chậm tiến độ' : ''}
                  </p>
                </div>;
              })}
            </dl>
          </ReportCard>
        </div>

      </div>

      {/* ===== TIỀN ĐẾN TỪ ĐÂU ======================================
          Hai khối này trả lời câu khác với "đang chậm ở đâu" nên tách tiêu đề
          riêng thay vì nhét chung. */}
      <div className="mt-4 flex flex-col gap-4">
        <h2 className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">Tiền đến từ đâu</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <ReportCard title="Top dịch vụ theo doanh thu" description="Bốn dịch vụ đóng góp nhiều nhất trong kỳ">
            <ol className="flex flex-col">
              {[{ name: 'Nail Art Premium', value: 168_400_000, share: '14,8%' }, { name: 'Acrylic Full Set', value: 142_800_000, share: '12,5%' }, { name: 'Pedicure Spa', value: 136_200_000, share: '11,9%' }, { name: 'Gel Manicure', value: 128_600_000, share: '11,3%' }].map((item, index) => <li key={item.name} className="flex items-center gap-3 border-t border-brand-outline py-3 first:border-t-0 first:pt-0">
                <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-caption font-bold ${index === 0 ? 'bg-[var(--accent)] text-[color:var(--color-brand-on-primary)]' : 'bg-brand-surface-high text-brand-text-muted'}`}>{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-brand-text">{item.name}</span>
                  <span className="block text-caption tabular-nums text-brand-text-muted">{item.share} tổng doanh thu</span>
                </span>
                <span className="ta-money shrink-0 text-right text-body font-bold text-brand-text">{money(item.value)}</span>
              </li>)}
            </ol>
          </ReportCard>

          <ReportCard title="Cơ cấu doanh thu" description={`Theo chi nhánh · ${periodLabel}`}>
            <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[9.5rem_1fr]">
              <div className="flex justify-center">
                <div aria-hidden="true" className="relative flex h-36 w-36 items-center justify-center rounded-pill" style={{ background: `conic-gradient(${chartSeries[0]} 0 59%, ${chartSeries[2]} 59% 100%)` }}>
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-pill bg-brand-surface text-center">
                    <p className="text-caption text-brand-text-muted">Tổng</p>
                    <p className="mt-0.5 text-body font-bold tabular-nums text-brand-text">{shortMoney(revenue)}</p>
                  </div>
                </div>
              </div>
              <dl className="flex min-w-0 flex-col">
                {[{ name: 'Quận 3', value: 672.4, share: 59, growth: '+18,2%', tone: chartSeries[0] }, { name: 'Quận 1', value: 468.6, share: 41, growth: '+14,9%', tone: chartSeries[2] }].map((item) => <div key={item.name} className="border-t border-brand-outline py-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="flex min-w-0 items-center gap-2 text-body font-semibold text-brand-text">
                      <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: item.tone }} />
                      <span className="truncate">Chi nhánh {item.name}</span>
                    </dt>
                    <dd className="ta-money shrink-0 text-right text-body font-bold text-brand-text">{money(item.value * 1_000_000)}</dd>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-caption text-brand-text-muted">
                    <span className="flex items-center gap-1 font-semibold text-brand-secondary">
                      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />{item.growth}
                    </span>
                    <span className="tabular-nums">{item.share.toLocaleString('vi-VN')}% tổng doanh thu</span>
                  </p>
                </div>)}
              </dl>
            </div>
          </ReportCard>
        </div>

      </div>

      {/* ===== 3. NÊN LÀM GÌ ========================================
          Trước đây đây là hai thẻ tách rời: "Điểm cần chú ý" liệt kê 3 vấn đề,
          "Gợi ý phân tích" liệt kê 3 việc, không thẻ nào nói việc nào giải
          quyết vấn đề nào — người đọc phải tự ghép. Nay mỗi dòng là một đơn vị
          hoàn chỉnh: vấn đề → con số chứng minh → việc nên làm. */}
      <div className="mt-4 flex flex-col gap-4">
        <h2 className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">Nên làm gì</h2>
        <ReportCard title="Việc cần làm" description="Tự động từ dữ liệu trong kỳ · xếp theo mức ảnh hưởng">
          <ol className="flex flex-col">
            {[
              { problem: 'Công suất chiều thứ Bảy đã kịch 96%', evidence: 'Khung 14:00–18:00 thứ Bảy gần như kín, có nguy cơ phải từ chối khách.', action: 'Mở thêm một ca kỹ thuật viên chiều thứ Bảy', tone: 'danger' },
              { problem: 'Chi phí vật tư dự báo vượt ngân sách 4,5%', evidence: 'Nhóm Nail Art tiêu hao nhanh hơn định mức từ đầu tháng.', action: 'Rà lại định mức và giá nhập vật tư Nail Art', tone: 'warning' },
              { problem: 'Khách mới chưa quay lại đủ nhanh', evidence: `Mới đạt ${customerProgress.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% mục tiêu khách mới, tỷ lệ quay lại 74,2% so với mục tiêu 78%.`, action: 'Gửi ưu đãi tái đặt lịch cho khách mới trong 30 ngày', tone: 'warning' }
            ].map((item, index) => (
              <li key={item.problem} className="flex gap-3 border-t border-brand-outline py-3 first:border-t-0 first:pt-0">
                <span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-caption font-bold ui-tone ui-tone--${item.tone}`}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-brand-text">{item.problem}</p>
                  <p className="mt-0.5 text-caption leading-4 text-brand-text-muted">{item.evidence}</p>
                  <button
                    type="button"
                    onClick={() => setNotice(`Đã ghi nhận việc cần làm “${item.action}”.`)}
                    className="mt-1.5 flex h-auto items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-left text-body font-semibold shadow-none"
                    style={{ color: 'var(--accent-strong)' }}
                  >
                    {item.action}
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </ReportCard>
      </div>

      {/* ===== 4. PHÂN TÍCH CHI TIẾT ================================
          Năm nhóm báo cáo cũ vẫn còn nguyên, chỉ thôi tranh chỗ với phần tóm
          tắt: chúng nằm dưới đáy trang, sau khi người đọc đã biết kỳ này ra sao
          và cần làm gì. */}
      <section className="mt-8 border-t border-brand-outline pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">Phân tích chi tiết</h2>
            <p className="mt-1 text-body text-brand-text-muted">
              Năm nhóm báo cáo đầy đủ: doanh thu, vận hành, khách hàng, nhân sự, xuất &amp; lịch gửi.
            </p>
          </div>
          <Button
            variant="secondary"
            aria-expanded={detailOpen}
            iconLeading={<ChevronDown className={detailOpen ? 'rotate-180' : ''} />}
            onClick={() => setDetailOpen((open) => !open)}
          >
            {detailOpen ? 'Thu gọn' : 'Mở phân tích chi tiết'}
          </Button>
        </div>

        {detailOpen && (
          <nav aria-label="Nhóm báo cáo chi tiết" className="mt-3 flex gap-1 overflow-x-auto rounded-card border border-brand-outline bg-brand-surface-lowest p-2">
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`shrink-0 rounded-control border-0 px-3 text-body shadow-none ${active ? 'bg-[var(--accent-soft)] font-bold text-[color:var(--accent-strong)]' : 'bg-transparent font-medium text-brand-text-muted hover:bg-brand-surface-high hover:text-brand-text'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </section>

      <div className={detailOpen ? 'mt-4' : 'hidden'}>
      {/* Nhánh này chỉ chạy ở chế độ trình diễn; dữ liệu thật có trang riêng phía trên. */}
      {tab === 'REVENUE' && <RevenueReportTab report={revenueReport.report} loading={revenueReport.loading} error={revenueReport.error} periodLabel={periodLabel} onRetry={revenueReport.reload} />}

      {tab === 'OPERATIONS' && <div className="flex flex-col gap-4">
        <section aria-label="Chỉ số vận hành" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ label: 'Công suất ghế', value: '82,6%', detail: '+5,2 điểm' }, { label: 'Thời gian phục vụ TB', value: '86 phút', detail: '−4 phút' }, { label: 'Tỷ lệ hủy/no-show', value: '4,8%', detail: '−1,2 điểm' }, { label: 'Lịch đúng giờ', value: '91,4%', detail: '+2,8 điểm' }].map((item) => <article key={item.label} className="flex flex-col gap-1 rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <p className="text-caption text-brand-text-muted">{item.label}</p>
            <p className="ta-metric-value text-brand-text">{item.value}</p>
            <p className="text-caption font-semibold text-brand-secondary">{item.detail} so với kỳ trước</p>
          </article>)}
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportCard title="Công suất theo khung giờ" description="Từ 09:00 đến 19:00, theo ngày trong tuần">
            <div className="grid grid-cols-7 gap-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, dayIndex) => <div key={day}>
                <p className="mb-2 text-center text-caption font-semibold text-brand-text-muted">{day}</p>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 6 }, (_, index) => {
                    const value = 45 + ((dayIndex * 17 + index * 13) % 54);
                    const level = value > 88 ? 4 : value > 72 ? 3 : value > 55 ? 2 : 1;
                    return <div
                      key={index}
                      title={`${day} · ${9 + index * 2}:00 · công suất ${value}%`}
                      className="h-8 rounded-control"
                      style={{ background: level === 4 ? 'var(--color-brand-error)' : level === 3 ? 'var(--chart-1)' : level === 2 ? 'var(--chart-3)' : 'var(--color-brand-surface-high)' }}
                    />;
                  })}
                </div>
              </div>)}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-caption text-brand-text-muted">
              <span>Thấp</span>
              <i aria-hidden="true" className="h-3 w-3 rounded-sm bg-brand-surface-high" />
              <i aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: 'var(--chart-3)' }} />
              <i aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: 'var(--chart-1)' }} />
              <i aria-hidden="true" className="h-3 w-3 rounded-sm bg-brand-error" />
              <span>Cao · trên 88% có nguy cơ từ chối lịch</span>
            </div>
          </ReportCard>

          <BranchComparisonTable branches={branches} />
        </div>
      </div>}

      {tab === 'CUSTOMERS' && <div className="flex flex-col gap-4">
        <section aria-label="Chỉ số khách hàng" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ label: 'Tổng khách hoạt động', value: '4.826', detail: '+8,4%' }, { label: 'Khách mới', value: '294', detail: '+18,2%' }, { label: 'Tỷ lệ quay lại', value: '74,2%', detail: '+3,1 điểm' }, { label: 'LTV trung bình', value: money(8_600_000), detail: '+12,8%' }].map((item) => <article key={item.label} className="flex flex-col gap-1 rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <p className="text-caption text-brand-text-muted">{item.label}</p>
            <p className="ta-metric-value text-brand-text">{item.value}</p>
            <p className="text-caption font-semibold text-brand-secondary">{item.detail}</p>
          </article>)}
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <ReportCard title="Phân khúc khách hàng" description="Tỷ trọng trên tổng khách hoạt động">
            <div className="flex justify-center">
              <div aria-hidden="true" className="relative flex h-44 w-44 items-center justify-center rounded-pill" style={{ background: `conic-gradient(${chartSeries[0]} 0 18%, ${chartSeries[1]} 18% 42%, ${chartSeries[2]} 42% 74%, ${chartSeries[4]} 74% 100%)` }}>
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-pill bg-brand-surface text-center">
                  <p className="text-caption text-brand-text-muted">Khách hoạt động</p>
                  <p className="mt-1 text-card-title font-bold tabular-nums text-brand-text">4.826</p>
                </div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-5">
              {[{ label: 'VIP', value: '18%', tone: chartSeries[0] }, { label: 'Thành viên', value: '24%', tone: chartSeries[1] }, { label: 'Thường xuyên', value: '32%', tone: chartSeries[2] }, { label: 'Mới/không thường xuyên', value: '26%', tone: chartSeries[4] }].map((item) => <div key={item.label} className="flex items-center justify-between gap-2 border-t border-brand-outline py-2.5 text-body">
                <dt className="flex min-w-0 items-center gap-2 text-brand-text">
                  <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: item.tone }} />
                  <span className="truncate">{item.label}</span>
                </dt>
                <dd className="shrink-0 font-semibold tabular-nums text-brand-text">{item.value}</dd>
              </div>)}
            </dl>
          </ReportCard>

          <ReportCard title="Cohort quay lại theo tháng đầu" description="Tỷ lệ khách quay lại sau mỗi tháng">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-center">
                <caption className="sr-only">Tỷ lệ quay lại theo cohort tháng đầu, từ tháng M0 đến M5</caption>
                <thead>
                  <tr>
                    <th scope="col" className="pb-2 text-left text-caption font-semibold text-brand-text-muted">Cohort</th>
                    {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map((item) => <th key={item} scope="col" className="pb-2 text-caption font-semibold text-brand-text-muted">{item}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026'].map((month, row) => <tr key={month}>
                    <th scope="row" className="py-0.5 pr-2 text-left text-caption font-semibold tabular-nums text-brand-text-muted">{month}</th>
                    {Array.from({ length: 6 }, (_, col) => {
                      const active = col <= 5 - row + 2;
                      const value = Math.max(0, 100 - col * 12 - row * 2);
                      return <td key={col} className="p-0.5">
                        <div
                          className="flex h-9 items-center justify-center rounded-control text-caption font-semibold tabular-nums"
                          // Chữ luôn là màu văn bản thường: nền đậm nhất cũng chỉ
                          // pha 85% accent, vẫn đủ tương phản cho chữ tối (§19.2).
                          style={active
                            ? { background: `color-mix(in srgb, var(--accent) ${Math.max(12, Math.round(value * 0.85))}%, var(--color-brand-surface))`, color: 'var(--color-brand-text)' }
                            : { background: 'var(--color-brand-surface-high)', color: 'var(--color-brand-text-muted)' }}
                        >
                          {active ? `${value}%` : '—'}
                        </div>
                      </td>;
                    })}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </ReportCard>
        </div>
      </div>}

      {tab === 'STAFF' && <div className="flex flex-col gap-4">
        <section aria-label="Chỉ số nhân sự" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ label: 'Doanh thu/giờ làm', value: money(286_000), detail: '+8,6%' }, { label: 'Tỷ lệ lấp lịch', value: '84,8%', detail: '+4,2 điểm' }, { label: 'Đánh giá trung bình', value: '4,86/5', detail: '+0,08 điểm' }, { label: 'Hoa hồng kỳ này', value: money(186_500_000), detail: '16,3% doanh thu' }].map((item) => <article key={item.label} className="flex flex-col gap-1 rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
            <p className="text-caption text-brand-text-muted">{item.label}</p>
            <p className="ta-metric-value text-brand-text">{item.value}</p>
            <p className="text-caption font-semibold text-brand-secondary">{item.detail}</p>
          </article>)}
        </section>

        <section className="min-w-0">
          <h2 className="text-card-title text-brand-text">Hiệu suất kỹ thuật viên</h2>
          <p className="mt-0.5 text-body text-brand-text-muted">Doanh thu, số lịch, tỷ lệ lấp lịch, đánh giá và hoa hồng</p>
          <DataTable<{ name: string; role: string; revenue: number; bookings: number; occupancy: string; rating: string; commission: number }>
            className="mt-4"
            rowKey={(item) => item.name}
            caption="Hiệu suất kỹ thuật viên trong kỳ báo cáo"
            rows={[
              { name: 'Thảo Nguyễn', role: 'Senior Nail Artist', revenue: 148_600_000, bookings: 126, occupancy: '92%', rating: '4,96', commission: 26_800_000 },
              { name: 'Hà My', role: 'Nail Artist', revenue: 126_400_000, bookings: 138, occupancy: '88%', rating: '4,91', commission: 21_500_000 },
              { name: 'Minh Châu', role: 'Senior Technician', revenue: 118_200_000, bookings: 142, occupancy: '86%', rating: '4,88', commission: 20_100_000 },
              { name: 'Thuỳ Dương', role: 'Nail Technician', revenue: 96_800_000, bookings: 132, occupancy: '82%', rating: '4,82', commission: 15_500_000 },
              { name: 'Bảo Ngọc', role: 'Pedicure Specialist', revenue: 88_400_000, bookings: 118, occupancy: '78%', rating: '4,78', commission: 14_200_000 }
            ]}
            columns={[
              {
                key: 'name',
                header: 'Kỹ thuật viên',
                width: '30%',
                cell: (item, index) => (
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-caption font-bold ${index === 0 ? 'bg-[var(--accent)] text-[color:var(--color-brand-on-primary)]' : 'bg-brand-surface-high text-brand-text-muted'}`}>
                      {item.name.split(' ').map((word) => word[0]).slice(-2).join('')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-brand-text">{item.name}</span>
                      <span className="block truncate text-caption text-brand-text-muted">{item.role}</span>
                    </span>
                  </span>
                )
              },
              { key: 'revenue', header: 'Doanh thu', numeric: true, cell: (item) => <span className="ta-money font-semibold text-brand-text">{money(item.revenue)}</span> },
              { key: 'bookings', header: 'Lịch', numeric: true, hideBelow: 'md', cell: (item) => item.bookings.toLocaleString('vi-VN') },
              { key: 'occupancy', header: 'Lấp lịch', numeric: true, hideBelow: 'lg', cell: (item) => item.occupancy },
              {
                key: 'rating',
                header: 'Đánh giá',
                numeric: true,
                hideBelow: 'lg',
                cell: (item) => <span className="inline-flex items-center justify-end gap-1 tabular-nums text-brand-text"><Star aria-hidden="true" className="h-3.5 w-3.5 text-brand-tertiary" />{item.rating}</span>
              },
              { key: 'commission', header: 'Hoa hồng', numeric: true, cell: (item) => <span className="ta-money font-semibold text-brand-text">{money(item.commission)}</span> }
            ]}
          />
        </section>
      </div>}

      {tab === 'EXPORTS' && <div className="flex flex-col gap-4">
        <section className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-card-title text-brand-text">Thư viện báo cáo</h2>
              <p className="mt-0.5 text-body text-brand-text-muted">Mẫu báo cáo chuẩn theo vai trò và nghiệp vụ</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-64">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  aria-label="Tìm mẫu báo cáo"
                  placeholder="Tìm báo cáo..."
                  className={`${controlClass} pl-9`}
                />
              </div>
              <BeautifulSelect
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                aria-label="Lọc theo nhóm báo cáo"
                className={`${controlClass} sm:w-40`}
              >
                <option value="ALL">Tất cả nhóm</option>
                {Array.from(new Set(templates.map((item) => item.group))).map((group) => <option key={group}>{group}</option>)}
              </BeautifulSelect>
              <Button
                variant={favoriteOnly ? 'primary' : 'secondary'}
                aria-pressed={favoriteOnly}
                iconLeading={<Star />}
                onClick={() => setFavoriteOnly((value) => !value)}
              >
                Yêu thích
              </Button>
            </div>
          </div>

          {filteredTemplates.length ? (
            <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((report) => <li key={report.id} className="flex flex-col rounded-card border border-brand-outline bg-brand-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">{report.id} · {report.group}</p>
                  {/* Đây là cờ đánh dấu, không phải trạng thái bản ghi — nên không dùng StatusBadge. */}
                  {report.favorite && (
                    <span className="flex shrink-0 items-center gap-1 rounded-pill bg-[var(--accent-soft)] px-2 py-0.5 text-caption font-semibold text-[color:var(--accent-strong)]">
                      <Star aria-hidden="true" className="h-3.5 w-3.5" />Yêu thích
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-card-title text-brand-text">{report.name}</h3>
                <p className="mt-1 min-h-10 text-body leading-5 text-brand-text-muted">{report.description}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-brand-outline pt-3">
                  <div>
                    <dt className="text-caption text-brand-text-muted">Định dạng</dt>
                    <dd className="mt-0.5 text-body text-brand-text">{report.format}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-brand-text-muted">Quyền xem</dt>
                    <dd className="mt-0.5 text-body text-brand-text">{report.access}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button size="small" variant="secondary" block iconLeading={<Eye />} onClick={() => setNotice(`Đã mở bản xem trước ${report.name}.`)}>Xem</Button>
                  <Button size="small" variant="primary" block iconLeading={<Download />} onClick={() => exportReport(report.name)}>Xuất</Button>
                </div>
              </li>)}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-2 rounded-card border border-dashed border-brand-outline px-6 py-12 text-center">
              <FileBarChart aria-hidden="true" className="h-8 w-8 text-brand-text-muted" />
              <p className="text-card-title text-brand-text">Không tìm thấy mẫu báo cáo phù hợp</p>
              <p className="text-body text-brand-text-muted">Thử từ khóa khác hoặc bỏ bớt bộ lọc đang áp dụng.</p>
              <Button size="small" variant="secondary" onClick={() => { onSearchQueryChange(''); setGroupFilter('ALL'); setFavoriteOnly(false); }}>
                Xóa tìm kiếm và bộ lọc
              </Button>
            </div>
          )}
        </section>

        <section className="min-w-0 border-t border-brand-outline pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-card-title text-brand-text">Lịch gửi tự động</h2>
              <p className="mt-0.5 text-body text-brand-text-muted">Gửi báo cáo định kỳ tới người phụ trách</p>
            </div>
            <Button
              variant="primary"
              iconLeading={<Plus />}
              disabled={!canManage}
              onClick={() => { if (!requireManage()) return; setFormError(''); setScheduleOpen(true); }}
            >
              Tạo lịch gửi
            </Button>
          </div>

          <DataTable<ReportSchedule>
            className="mt-4"
            rows={schedules}
            rowKey={(item) => item.id}
            caption="Các lịch gửi báo cáo tự động đang cấu hình"
            emptyTitle="Chưa có lịch gửi nào"
            emptyDescription="Tạo lịch gửi để hệ thống tự gửi báo cáo định kỳ tới người phụ trách."
            columns={[
              {
                key: 'name',
                header: 'Lịch báo cáo',
                width: '28%',
                cell: (item) => (
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-brand-text">{item.name}</span>
                    <span className="block truncate text-caption text-brand-text-muted">{item.id} · {branchName(item.branch)} · {item.format}</span>
                  </span>
                )
              },
              {
                key: 'frequency',
                header: 'Tần suất',
                cell: (item) => (
                  <span>
                    <span className="block text-brand-text">{item.frequency === 'DAILY' ? 'Hàng ngày' : item.frequency === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'}</span>
                    <span className="block text-caption text-brand-text-muted">{item.time}</span>
                  </span>
                )
              },
              { key: 'recipients', header: 'Người nhận', hideBelow: 'lg', cell: (item) => <span className="block truncate text-brand-text-muted">{item.recipients.join(', ')}</span> },
              { key: 'nextRun', header: 'Tiếp theo', hideBelow: 'md', cell: (item) => <span className="tabular-nums text-brand-text-muted">{item.nextRun}</span> },
              { key: 'status', header: 'Trạng thái', cell: (item) => <StatusBadge status={item.active ? 'ACTIVE' : 'INACTIVE'} label={item.active ? 'Đang bật' : 'Tạm dừng'} size="small" /> },
              {
                key: 'actions',
                header: 'Thao tác',
                headerSrOnly: true,
                actions: true,
                cell: (item) => (
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={!canManage}
                    aria-label={item.active ? `Tạm dừng ${item.name}` : `Kích hoạt ${item.name}`}
                    onClick={() => toggleSchedule(item)}
                  >
                    {item.active ? 'Tạm dừng' : 'Kích hoạt'}
                  </Button>
                )
              }
            ]}
          />
        </section>
      </div>}
      </div>
    </div>

    {/* Metadata nguồn và quyền — một dòng chân trang thay cho ba thẻ chiếm chỗ */}
    <footer className="flex flex-col gap-2 border-t border-brand-outline pt-4 text-caption text-brand-text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        Độ đầy đủ dữ liệu: <strong className="tabular-nums text-brand-text">POS 100%</strong> ·{' '}
        <strong className="tabular-nums text-brand-text">Lịch hẹn 99,8%</strong> ·{' '}
        <strong className="tabular-nums text-brand-text">Khách hàng 98,6%</strong>
      </p>
      <p className="flex items-center gap-1.5">
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
        Xem dữ liệu toàn tenant, xuất và tạo báo cáo tùy chỉnh theo quyền gói · {roleLabel}
      </p>
    </footer>

    {/* Chi tiết một KPI */}
    <Modal
      open={Boolean(metricOpen)}
      onClose={() => setMetricOpen(null)}
      size="medium"
      eyebrow="KPI điều hành"
      title={metricOpen === 'revenue' ? 'Doanh thu thuần' : metricOpen === 'bookings' ? 'Lịch hoàn tất' : metricOpen === 'ticket' ? 'Giá trị trung bình' : 'Khách hàng mới'}
      description={`Tháng 07/2026 · ${selectedBranch === 'ALL' ? 'Toàn tenant' : branchName(selectedBranch as BranchCode)}`}
      footer={(
        <>
          <Button variant="secondary" onClick={() => setMetricOpen(null)}>Đóng</Button>
          <Button variant="primary" iconLeading={<Download />} onClick={() => exportReport('Chi tiết KPI')}>Xuất dữ liệu chi tiết</Button>
        </>
      )}
    >
      {metricOpen && <div className="flex flex-col gap-5">
        <section className="border-b border-brand-outline pb-4">
          <p className="text-caption uppercase tracking-wide text-brand-text-muted">Giá trị hiện tại</p>
          <p className="mt-1 text-display font-bold tabular-nums text-brand-text">
            {metricOpen === 'revenue' ? shortMoney(revenue) : metricOpen === 'bookings' ? bookings.toLocaleString('vi-VN') : metricOpen === 'ticket' ? money(averageTicket) : newCustomers.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 flex items-center gap-1 text-body font-semibold text-brand-secondary">
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />Tăng 16,8% so với kỳ trước
          </p>
        </section>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Chi nhánh Quận 3', value: metricOpen === 'revenue' ? money(672_400_000) : metricOpen === 'bookings' ? '846' : metricOpen === 'ticket' ? money(795_000) : '168' },
            { label: 'Chi nhánh Quận 1', value: metricOpen === 'revenue' ? money(468_600_000) : metricOpen === 'bookings' ? '612' : metricOpen === 'ticket' ? money(766_000) : '126' },
            { label: 'Mục tiêu tháng', value: metricOpen === 'revenue' ? money(1_280_000_000) : metricOpen === 'bookings' ? '1.600' : metricOpen === 'ticket' ? money(800_000) : '350' },
            { label: 'Dự báo cuối kỳ', value: metricOpen === 'revenue' ? money(1_220_000_000) : metricOpen === 'bookings' ? '1.538' : metricOpen === 'ticket' ? money(790_000) : '326' }
          ].map((item) => <div key={item.label} className="rounded-card border border-brand-outline px-3 py-2.5">
            <dt className="text-caption text-brand-text-muted">{item.label}</dt>
            <dd className="ta-money mt-0.5 text-right text-body font-semibold text-brand-text">{item.value}</dd>
          </div>)}
        </dl>

        <section className="p-4 ui-tone ui-tone--info">
          <p className="text-body font-semibold text-brand-text">Cách tính &amp; nguồn dữ liệu</p>
          <p className="mt-1 text-body leading-5 text-brand-text-muted">
            Chỉ số được tổng hợp từ POS, lịch hẹn đã hoàn tất và dữ liệu thanh toán đã đối soát. Giao dịch hủy hoặc hoàn tiền được loại trừ.
          </p>
        </section>

        <p className="text-caption text-brand-text-muted">Dữ liệu cập nhật lúc 16:45 · Quyền xem: {roleLabel}</p>
      </div>}
    </Modal>

    {/* Trình tạo báo cáo tùy chỉnh */}
    <Modal
      open={builderOpen}
      onClose={() => setBuilderOpen(false)}
      size="large"
      closeOnBackdrop={false}
      eyebrow="Report Builder"
      title="Tạo báo cáo tùy chỉnh"
      description="Chọn chỉ số, chiều phân tích và định dạng xuất."
      footer={(
        <>
          <Button variant="secondary" onClick={() => setBuilderOpen(false)}>Hủy</Button>
          <Button variant="primary" type="submit" form="tenant-report-builder" iconLeading={<FileBarChart />}>Tạo báo cáo</Button>
        </>
      )}
    >
      <form id="tenant-report-builder" onSubmit={submitBuilder} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="p-3 text-body font-semibold text-brand-text ui-tone ui-tone--danger">{formError}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tên báo cáo" required>
            <input
              type="text"
              value={builder.name}
              onChange={(event) => setBuilder((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: Hiệu quả Nail Art theo chi nhánh"
            />
          </Field>
          <Field label="Nhóm báo cáo">
            <BeautifulSelect
              value={builder.group}
              onChange={(event) => setBuilder((current) => ({ ...current, group: event.target.value }))}
              className="w-full"
            >
              {['Điều hành', 'Tài chính', 'Vận hành', 'Khách hàng', 'Nhân sự', 'Kho'].map((item) => <option key={item}>{item}</option>)}
            </BeautifulSelect>
          </Field>
        </div>

        <fieldset className="border-0 p-0">
          <legend className="mb-3 text-body font-semibold text-brand-text">
            Chỉ số cần phân tích <span className="text-brand-error" title="Bắt buộc"><span aria-hidden="true">*</span><span className="sr-only">Bắt buộc</span></span>
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {['Doanh thu', 'Lượt đặt', 'Giá trị trung bình', 'Công suất ghế', 'Khách hàng mới', 'Tỷ lệ quay lại', 'Chi phí vật tư', 'Hoa hồng', 'Đánh giá'].map((metric) => {
              const checked = builder.metrics.includes(metric);
              return (
                <label key={metric} className={`flex cursor-pointer items-center gap-3 p-3 text-body text-brand-text ui-tone ${checked ? 'ui-tone--info' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => setBuilder((current) => ({ ...current, metrics: event.target.checked ? [...current.metrics, metric] : current.metrics.filter((item) => item !== metric) }))}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  {metric}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Chiều phân tích">
            <BeautifulSelect
              value={builder.dimension}
              onChange={(event) => setBuilder((current) => ({ ...current, dimension: event.target.value }))}
              className="w-full"
            >
              {['Theo ngày', 'Theo tuần', 'Theo chi nhánh', 'Theo dịch vụ', 'Theo kỹ thuật viên', 'Theo phân khúc khách'].map((item) => <option key={item}>{item}</option>)}
            </BeautifulSelect>
          </Field>
          <Field label="Định dạng mặc định">
            <BeautifulSelect
              value={builder.format}
              onChange={(event) => setBuilder((current) => ({ ...current, format: event.target.value }))}
              className="w-full"
            >
              <option>Excel</option>
              <option>PDF</option>
              <option>CSV</option>
            </BeautifulSelect>
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-3 p-4 ui-tone">
          <input
            type="checkbox"
            checked={builder.includeComparison}
            onChange={(event) => setBuilder((current) => ({ ...current, includeComparison: event.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-body font-semibold text-brand-text">Bao gồm so sánh kỳ trước</span>
            <span className="mt-0.5 block text-caption text-brand-text-muted">Thêm chênh lệch tuyệt đối và phần trăm tăng trưởng.</span>
          </span>
        </label>
      </form>
    </Modal>

    {/* Lập lịch gửi tự động */}
    <Modal
      open={scheduleOpen}
      onClose={() => setScheduleOpen(false)}
      size="medium"
      closeOnBackdrop={false}
      eyebrow="Phân phối báo cáo"
      title="Lập lịch gửi tự động"
      description="Cấu hình tần suất, người nhận và phạm vi dữ liệu."
      footer={(
        <>
          <Button variant="secondary" onClick={() => setScheduleOpen(false)}>Hủy</Button>
          <Button variant="primary" type="submit" form="tenant-report-schedule" iconLeading={<Mail />}>Tạo lịch gửi</Button>
        </>
      )}
    >
      <form id="tenant-report-schedule" onSubmit={submitSchedule} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {formError && (
          <p role="alert" className="p-3 text-body font-semibold text-brand-text ui-tone ui-tone--danger sm:col-span-2">{formError}</p>
        )}

        <Field label="Tên lịch gửi" required className="sm:col-span-2">
          <input
            type="text"
            value={scheduleForm.name}
            onChange={(event) => setScheduleForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ví dụ: Báo cáo điều hành đầu tuần"
          />
        </Field>

        <Field label="Tần suất">
          <BeautifulSelect
            value={scheduleForm.frequency}
            onChange={(event) => setScheduleForm((current) => ({ ...current, frequency: event.target.value as ScheduleFrequency }))}
            className="w-full"
          >
            <option value="DAILY">Hàng ngày</option>
            <option value="WEEKLY">Hàng tuần</option>
            <option value="MONTHLY">Hàng tháng</option>
          </BeautifulSelect>
        </Field>

        <Field label="Thời gian gửi">
          <input
            type="time"
            value={scheduleForm.time}
            onChange={(event) => setScheduleForm((current) => ({ ...current, time: event.target.value }))}
          />
        </Field>

        <Field label="Phạm vi">
          <BeautifulSelect
            value={scheduleForm.branch}
            onChange={(event) => setScheduleForm((current) => ({ ...current, branch: event.target.value as BranchCode | 'ALL' }))}
            className="w-full"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            <option value="Q1">Chi nhánh Quận 1</option>
            <option value="Q3">Chi nhánh Quận 3</option>
          </BeautifulSelect>
        </Field>

        <Field label="Định dạng">
          <BeautifulSelect
            value={scheduleForm.format}
            onChange={(event) => setScheduleForm((current) => ({ ...current, format: event.target.value }))}
            className="w-full"
          >
            <option>PDF</option>
            <option>Excel</option>
            <option>CSV</option>
          </BeautifulSelect>
        </Field>

        <Field
          label="Email người nhận"
          required
          className="sm:col-span-2"
          helper="Phân cách nhiều email bằng dấu phẩy."
        >
          <input
            type="text"
            value={scheduleForm.recipients}
            onChange={(event) => setScheduleForm((current) => ({ ...current, recipients: event.target.value }))}
            placeholder="owner@salon.vn, finance@salon.vn"
          />
        </Field>

        <p className="flex items-start gap-2 p-3 text-body leading-5 text-brand-text-muted ui-tone ui-tone--info sm:col-span-2">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Người nhận chỉ nhận tệp xuất; liên kết chi tiết vẫn yêu cầu đăng nhập và quyền phù hợp.
        </p>
      </form>
    </Modal>
  </div>;
}
