import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from './ui';
import { useLanguage, useT } from '../i18n';
import {
  BadgePercent,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Plus,
  ReceiptText,
  UsersRound
} from 'lucide-react';
import type { Tenant } from '../types';
import type { NailPageId } from './nailAdminData';
import { formatTenantQuota, isUnlimitedTenantLimit } from '../utils/tenantAdminEntitlements';
import { formatCompactMoney, formatMoney } from '../utils/money';
import { tenantStorageKey } from '../utils/tenantStorage';
import useRevenueReport from '../hooks/useRevenueReport';
import useAppointments from '../hooks/useAppointments';

interface TenantAdminOverviewProps {
  branchName: string;
  tenantName: string;
  tenant: Tenant;
  demoMode?: boolean;
  invoiceCount: number;
  planName: string;
  branchCount: number;
  branchLimit: number;
  staffCount: number;
  staffLimit: number;
  onToggleDemo?: () => void;
  onNavigate: (page: NailPageId) => void;
  onQuickCreate: (page: Exclude<NailPageId, 'overview' | 'subscription' | 'support'>) => void;
}

const revenueSeries = [
  12.5, 18.6, 16.4, 24.8, 28.7, 14.6, 13.8,
  17.2, 19.4, 22.1, 20.8, 26.3, 29.5, 24.2,
  23.7, 27.4, 31.2, 29.8, 34.1, 32.6, 36.4,
  30.8, 33.5, 35.2, 38.1, 36.7, 40.2, 42.5, 39.4, 44.1
];

/**
 * Nhãn tiếng Việt cho bảy trạng thái lịch hẹn của BR-APT-020.
 *
 * Chỉ có ở đây vì màn này chỉ hiện năm lịch gần nhất; nơi thật sự quản vòng đời lịch hẹn là
 * cổng lễ tân, và nó đọc `nextStatuses` từ máy chủ chứ không chép sơ đồ ra client.
 */
const appointmentStatusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã đến',
  IN_SERVICE: 'Đang phục vụ',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến'
};

/** ⚠️ Chỉ dùng cho chế độ trình diễn. Dữ liệu thật đến từ `useAppointments` trong component. */
const demoAppointments = [
  { time: '09:00', customer: 'Trần Thu Hà', service: 'Sơn gel', status: 'Đã xác nhận', tone: 'confirmed' },
  { time: '10:00', customer: 'Lê Phương Anh', service: 'Nail art', status: 'Đã xác nhận', tone: 'confirmed' },
  { time: '11:30', customer: 'Nguyễn Hoài An', service: 'Đắp bột', status: 'Đang đến', tone: 'arriving' },
  { time: '14:00', customer: 'Phạm Quỳnh Như', service: 'Sơn gel', status: 'Đã xác nhận', tone: 'confirmed' },
  { time: '15:30', customer: 'Vũ Minh Châu', service: 'Chăm sóc móng', status: 'Chờ xác nhận', tone: 'waiting' }
];

const popularServices = [
  { name: 'Sơn gel', count: 211, percent: 100 },
  { name: 'Nail art', count: 156, percent: 74 },
  { name: 'Đắp bột', count: 128, percent: 61 },
  { name: 'Chăm sóc móng', count: 97, percent: 46 },
  { name: 'Gỡ gel', count: 74, percent: 35 }
];

const serviceRevenue = [
  { name: 'Sơn gel', percent: 45.2, value: 58_100_000, color: '#f43f78' },
  { name: 'Nail art', percent: 23.6, value: 30_300_000, color: '#c85acb' },
  { name: 'Đắp bột', percent: 15.8, value: 20_300_000, color: '#f08aa4' },
  { name: 'Chăm sóc móng', percent: 9.7, value: 12_500_000, color: '#ffb27b' },
  { name: 'Khác', percent: 5.7, value: 7_300_000, color: '#d58ce0' }
];

/** ⚠️ Chỉ dùng cho chế độ trình diễn. Dữ liệu thật đến từ `byStaff` của báo cáo doanh thu. */
const demoTopStaff = [
  { name: 'Kim Ngân', initials: 'KN', revenue: 32_450_000, rank: 1 },
  { name: 'Bảo Trân', initials: 'BT', revenue: 28_100_000, rank: 2 },
  { name: 'Minh Thư', initials: 'MT', revenue: 24_780_000, rank: 3 },
  { name: 'Thanh Vy', initials: 'TV', revenue: 22_350_000, rank: 4 },
  { name: 'Gia Hân', initials: 'GH', revenue: 18_900_000, rank: 5 }
];

export default function TenantAdminOverview({
  branchName,
  tenantName,
  tenant,
  demoMode,
  invoiceCount,
  planName,
  branchCount,
  branchLimit,
  staffCount,
  staffLimit,
  onToggleDemo,
  onNavigate,
  onQuickCreate
}: TenantAdminOverviewProps) {
  const t = useT();
  const { language } = useLanguage();
  const [range, setRange] = useState<7 | 14 | 30>(7);

  const isoOf = (value: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  };
  const todayIso = isoOf(new Date());
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 29);

  /*
    MỘT lời gọi cho cả trang: bốn thẻ chỉ số, biểu đồ 7/14/30 ngày, bảng xếp hạng nhân viên và
    hai khối dịch vụ đều đọc từ nó. Bộ chọn 7/14/30 ngày cắt bớt `byDay` tại chỗ thay vì gọi
    lại — đổi khoảng nhìn không phải là một câu hỏi mới cho máy chủ.
  */
  const monthReport = useRevenueReport(!demoMode, tenant.id || null, isoOf(windowStart), todayIso, null);
  const todayBoard = useAppointments(!demoMode, tenant.id || null, todayIso);

  const chartPoints = useMemo(() => {
    const now = new Date();
    const demoPoints = revenueSeries.slice(-range);

    /*
      Ở chế độ dữ liệu thật, biểu đồ đọc `byDay` của báo cáo doanh thu — cùng một con số mà
      màn Báo cáo hiển thị, tính bằng cùng công thức ở máy chủ.

      Trước ngày 17 chỗ này đọc sổ Thu–Chi trong `localStorage`. Đó là nguồn sai theo hai
      cách: BR-REV-007 nói rõ sổ Thu–Chi nằm ngoài phạm vi backend và **hệ thống không tính
      lợi nhuận**, còn con số nó cho ra thì không liên quan gì tới tiền khách đã trả. Hai màn
      trong cùng một cổng vì vậy vẽ hai đường doanh thu khác nhau.
    */
    const liveByDay: Record<string, number> = {};

    if (!demoMode) {
      (monthReport.report?.byDay || []).forEach((row) => {
        // `key` là `yyyy-MM-dd` theo giờ tiệm; biểu đồ tra bằng `dd/MM/yyyy`.
        const [y, m, d] = row.key.split('-');
        liveByDay[`${d}/${m}/${y}`] = row.revenue / 1_000_000;
      });
    }

    return Array.from({ length: range }, (_, index) => {
      const daysAgo = range - 1 - index;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr = d.getFullYear();
      const dateKey = `${dayStr}/${monthStr}/${yearStr}`;
      const label = `${dayStr}/${monthStr}`;

      // Ngày không có khoản thu nào là số 0 thật, không phải thiếu dữ liệu — nên nó vẽ đúng
      // một cột rỗng chứ không mượn con số của bộ dữ liệu mẫu.
      const value = demoMode ? (demoPoints[index] ?? 0) : (liveByDay[dateKey] || 0);

      return {
        id: `${dateKey}-${index}`,
        label,
        // Ngày đầy đủ dùng cho tooltip và nhãn trợ năng; trục ngang chỉ hiện dd/MM.
        fullDate: dateKey,
        value,
        dateKey
      };
    });
  }, [demoMode, range, monthReport.report]);

  const chartMax = Math.max(1, ...chartPoints.map((item) => item.value));

  /**
   * Cột đang được trỏ tới. Dùng chung cho chuột, bàn phím và chạm: mỗi cột là
   * một button nên thiết bị cảm ứng nhận được tooltip qua sự kiện click, còn
   * người dùng bàn phím nhận được qua focus.
   */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  /**
   * Giãn nhãn trục ngang theo bề ngang thật của vùng vẽ, không theo breakpoint.
   *
   * Trước đây cả 30 cột đều in nhãn "21/07": ở mốc 30 ngày mỗi cột chỉ rộng
   * khoảng 21px trong khi nhãn cần chừng 38px, nên chữ đè lên nhau rồi bị lớp
   * truncate cắt cụt. Đo bề ngang thật cho phép cùng một công thức xử lý được
   * cả ba mốc 7/14/30 ngày lẫn mọi kích thước màn hình.
   */
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    const element = plotRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      setPlotWidth(entries[0].contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /** Bề ngang tối thiểu một nhãn "21/07" cần, gồm cả khoảng thở hai bên. */
  const MIN_LABEL_WIDTH = 46;

  const labelStep = useMemo(() => {
    // Trước lần đo đầu tiên thì dùng bước an toàn theo số cột.
    if (!plotWidth) return range === 7 ? 1 : range === 14 ? 2 : 5;
    const columnWidth = plotWidth / chartPoints.length;
    return Math.max(1, Math.ceil(MIN_LABEL_WIDTH / columnWidth));
  }, [chartPoints.length, plotWidth, range]);

  const currencyCode = tenant.currency || "VND";
  // Chuỗi số liệu tính bằng triệu đồng; đổi về đồng trước khi định dạng.
  const toDong = (value: number) => value * 1_000_000;
  const branchQuota = formatTenantQuota(branchCount, branchLimit, 'branches');
  const staffQuota = formatTenantQuota(staffCount, staffLimit, 'staff');
  const branchAtLimit = !isUnlimitedTenantLimit(branchLimit, 'branches') && branchCount >= branchLimit;
  const staffAtLimit = !isUnlimitedTenantLimit(staffLimit, 'staff') && staffCount >= staffLimit;
  const today = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());
  /*
    ── Bốn thẻ chỉ số: dữ liệu THẬT từ ngày 17 ──────────────────────────────────────────
    Trước đây cả bốn là hằng số: doanh thu 128.450.000₫, lượt khách 326, lịch hẹn 156, kèm ba
    tỉ lệ "↑ 18,6% so với tuần trước" không đến từ đâu cả. Con số doanh thu ấy còn **mâu thuẫn
    thẳng** với màn Báo cáo cùng cổng, vốn đọc dữ liệu thật từ ngày 16.

    Ba tỉ lệ so sánh đã bỏ hẳn, không thay bằng tỉ lệ thật: so với kỳ trước cần một lời gọi
    thứ hai cho một khoảng ngày khác, và một mũi tên xanh không có gì phía sau còn tệ hơn là
    không có mũi tên nào.
  */
  const liveRevenue = monthReport.report?.revenue ?? 0;
  const liveInvoiceCount = monthReport.report?.invoiceCount ?? 0;
  const liveAppointments = todayBoard.appointments;
  const liveGuestCount = new Set(liveAppointments.map((item) => item.customerId)).size;

  const dashboardStats = demoMode
    ? [
      { label: t('Doanh thu'), value: formatMoney(128_450_000, tenant.currency || 'VND'), detail: `↑ 18,6% ${t('so với tuần trước')}`, icon: CircleDollarSign, tone: 'tenant-stat--pink' },
      { label: t('Lượt khách'), value: '326', detail: `↑ 12,4% ${t('so với tuần trước')}`, icon: UsersRound, tone: 'tenant-stat--purple' },
      { label: t('Lịch hẹn'), value: '156', detail: `↑ 9,7% ${t('so với tuần trước')}`, icon: CalendarDays, tone: 'tenant-stat--orange' },
      { label: t('Hóa đơn'), value: String(invoiceCount || 48), detail: t('{count} hóa đơn trong hệ thống', { count: invoiceCount || 48 }), icon: ReceiptText, tone: 'tenant-stat--blue' }
    ]
    : [
      { label: 'Doanh thu 30 ngày qua', value: formatMoney(liveRevenue, 'VND'), detail: 'Theo tiền thực thu, đã trừ hoàn tiền', icon: CircleDollarSign, tone: 'tenant-stat--pink' },
      { label: 'Khách hôm nay', value: String(liveGuestCount), detail: `${liveAppointments.length} lịch hẹn trong ngày`, icon: UsersRound, tone: 'tenant-stat--purple' },
      { label: 'Lịch hẹn hôm nay', value: String(liveAppointments.length), detail: `${liveAppointments.filter((item) => item.status === 'COMPLETED').length} đã hoàn tất`, icon: CalendarDays, tone: 'tenant-stat--orange' },
      { label: 'Hóa đơn có thu', value: String(liveInvoiceCount), detail: 'Trong 30 ngày qua', icon: ReceiptText, tone: 'tenant-stat--blue' }
    ];

  /*
    Lịch hẹn hôm nay và bảng xếp hạng nhân viên — dữ liệu thật.

    Bảng xếp hạng lấy thẳng từ `byStaff` của báo cáo doanh thu, không tự cộng lại ở đây: đó là
    cùng một con số mà màn Báo cáo hiển thị, tính bằng cùng một công thức ở máy chủ. Cộng lại
    ở trình duyệt là dựng ra một phép tính thứ hai cho một con số đã có sẵn.
  */
  const appointments = demoMode
    ? demoAppointments
    : liveAppointments
      .slice()
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
      .slice(0, 5)
      .map((item) => {
        const at = new Date(item.startAt);
        const pad = (n: number) => String(n).padStart(2, '0');

        return {
          time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
          customer: item.customerName || item.customerPhone,
          service: item.services[0]?.serviceName || 'Dịch vụ',
          status: appointmentStatusLabel[item.status] || item.status,
          tone: item.status === 'CHECKED_IN' || item.status === 'IN_SERVICE'
            ? 'arriving'
            : item.status === 'PENDING' ? 'waiting' : 'confirmed'
        };
      });

  /*
    Hai khối dịch vụ — "được yêu thích" và "cơ cấu doanh thu" — nay cũng đọc `byService`.

    Trước đây chúng hiện một khung trống kèm câu "Không sử dụng số liệu mẫu trong chế độ thực
    tế". Câu ấy đúng lúc chưa có endpoint nào, nhưng từ ngày 16 thì nó đang giấu đi dữ liệu đã
    có sẵn. `byService` mang cả doanh thu lẫn số hóa đơn cho mỗi dịch vụ, đủ cho cả hai khối.
  */
  const liveServices = (monthReport.report?.byService || []).slice(0, 5);
  const liveServiceTotal = liveServices.reduce((sum, row) => sum + row.revenue, 0);
  const liveServicePeak = liveServices.reduce((max, row) => Math.max(max, row.invoiceCount), 0);

  const servicePalette = ['#f43f78', '#c85acb', '#f08aa4', '#ffb27b', '#d58ce0'];

  /*
    Khối này xếp theo **lượt sử dụng** đúng như nhãn của nó, nên phải sắp lại: `byService` của
    máy chủ trả về đã xếp theo doanh thu, và bê nguyên thứ tự ấy sang đây khiến một danh sách
    ghi "xếp theo lượt sử dụng" hiện ra 23 · 21 · 29 · 27 — sai với chính câu mô tả của nó.
  */
  const popularList = demoMode
    ? popularServices
    : liveServices
      .slice()
      .sort((left, right) => right.invoiceCount - left.invoiceCount)
      .map((row) => ({
        name: row.label,
        count: row.invoiceCount,
        percent: liveServicePeak > 0 ? Math.round(row.invoiceCount / liveServicePeak * 100) : 0
      }));

  const serviceMix = demoMode
    ? serviceRevenue
    : liveServices.map((row, index) => ({
      name: row.label,
      percent: liveServiceTotal > 0 ? Math.round(row.revenue / liveServiceTotal * 1000) / 10 : 0,
      value: row.revenue,
      color: servicePalette[index % servicePalette.length]
    }));

  const topStaff = demoMode
    ? demoTopStaff
    : (monthReport.report?.byStaff || [])
      .filter((row) => row.key)
      .slice(0, 5)
      .map((row, index) => ({
        name: row.label,
        initials: row.label.split(' ').slice(-2).map((part) => part[0] || '').join('').toUpperCase(),
        revenue: row.revenue,
        rank: index + 1
      }));

  return (
    <div className="tenant-overview space-y-5">
      <PageHeader
        className="tenant-overview-heading"
        title={tenantName}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => onNavigate('subscription')} className="tenant-soft-button flex h-11 items-center justify-center gap-2 border border-pink-100 bg-white px-4 text-caption font-bold text-pink-600 shadow-sm"><BadgePercent className="h-4 w-4" />{t('Gói {plan}', { plan: planName })}</button>
            <button type="button" onClick={() => onQuickCreate('appointments')} className="tenant-primary-button flex h-11 items-center justify-center gap-2 border border-pink-500 bg-pink-500 px-4 text-caption font-black text-white shadow-lg shadow-pink-200"><Plus className="h-4 w-4" />{t('Tạo lịch hẹn')}</button>
          </div>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {dashboardStats.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="tenant-overview-stat min-w-0 rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.06)]">
            <div className="flex items-start justify-between gap-3"><p className="ta-kpi-label uppercase tracking-[0.08em]">{label}</p><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div>
            <p className="ta-metric-value mt-3 text-slate-950">{value}</p><p className="ta-supporting-text mt-1 font-semibold text-emerald-600">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]">
        <article className="tenant-dashboard-card overflow-hidden rounded-2xl border border-pink-50 bg-white shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex flex-col gap-4 border-b border-pink-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="text-sm font-black text-slate-900">{t('Doanh thu')}</h2><p className="mt-1 text-caption text-slate-400">{t('Doanh thu thực nhận')} · {branchName}</p></div>
            <div className="flex rounded-xl border border-pink-100 bg-pink-50/50 p-1" aria-label={t('Khoảng thời gian doanh thu')}>
              {([7, 14, 30] as const).map((value) => <button key={value} type="button" onClick={() => setRange(value)} aria-pressed={range === value} className={`h-8 min-h-0 border-0 px-3 text-caption font-black shadow-none ${range === value ? 'bg-white text-pink-600 shadow-sm' : 'bg-transparent text-slate-400'}`}>{t('{count} ngày', { count: value })}</button>)}
            </div>
          </div>
          <div
            ref={plotRef}
            className="tenant-revenue-chart relative grid min-h-[285px] items-end px-5 pb-5 pt-12 sm:px-6"
            style={{
              gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))`,
              gap: range === 30 ? "2px" : range === 14 ? "6px" : "12px"
            }}
            onPointerLeave={() => setActiveIndex(null)}
          >
            {chartPoints.map((item, index) => {
              const height = item.value > 0 ? Math.max(8, Math.round((item.value / chartMax) * 100)) : 2;
              const isActive = activeIndex === index;
              // Bước nhãn được neo từ điểm CUỐI chứ không từ điểm đầu, nên ngày mới
              // nhất luôn có nhãn và mọi khoảng cách đều bằng nhau. Neo từ đầu thì
              // khoảng cuối bị hụt (ví dụ 30 ngày: 10/08 rồi nhảy thẳng tới 19/08).
              const showLabel = (chartPoints.length - 1 - index) % labelStep === 0;
              // Tooltip ở hai mép được neo vào cạnh thay vì căn giữa, nếu không nó
              // tràn ra ngoài card (card có overflow-hidden nên sẽ bị cắt).
              const edgeClass =
                index <= 1
                  ? "left-0"
                  : index >= chartPoints.length - 2
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2";

              return (
                <div key={item.id} className="relative flex h-full min-w-0 flex-col items-center justify-end">
                  {isActive && (
                    <div
                      role="tooltip"
                      className={`pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-control border border-pink-100 bg-white px-3 py-2 text-left shadow-[0_8px_24px_rgba(226,68,120,0.14)] ${edgeClass}`}
                    >
                      <span className="block text-caption font-semibold text-slate-500">{item.fullDate}</span>
                      <span className="ta-money mt-0.5 block text-body font-black text-slate-900">
                        {formatMoney(toDong(item.value), currencyCode)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    aria-label={`${item.fullDate}: ${formatMoney(toDong(item.value), currencyCode)}`}
                    onPointerEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                    onClick={() => setActiveIndex((current) => (current === index ? null : index))}
                    className="flex w-full flex-1 items-end justify-center border-0 bg-transparent p-0 shadow-none"
                  >
                    <span
                      className="tenant-revenue-area relative block w-full rounded-t-xl bg-gradient-to-t from-pink-50 via-pink-100/80 to-pink-200/70"
                      style={{ height: `${height}%` }}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute left-1/2 -translate-x-1/2 rounded-full border-[3px] border-white bg-pink-500 shadow-[0_0_0_2px_rgba(244,63,120,0.15)] ${isActive ? "h-3 w-3 -top-1.5" : range === 30 ? "h-2 w-2 -top-1" : range === 14 ? "h-2.5 w-2.5 -top-1" : "h-3 w-3 -top-1.5"}`}
                      />
                    </span>
                  </button>

                  {/* Ô nhãn luôn chiếm chỗ để chân các cột thẳng hàng; nhãn bị giãn
                      thì ẩn bằng visibility nên trình đọc màn hình cũng bỏ qua.

                      Nhãn luôn căn giữa dưới cột của nó. Phần nhãn biên thò ra khỏi
                      cột được lề ngang của vùng vẽ hứng lấy (xem px-4 ở container),
                      thay vì neo nhãn vào cạnh cột — cách đó kéo nhãn cuối lệch vào
                      trong tới 14px và làm nó đè lên nhãn liền trước. */}
                  <span
                    className={`mt-3 block whitespace-nowrap text-center text-caption font-semibold ${isActive ? "text-slate-700" : "text-slate-400"} ${showLabel ? "" : "invisible"}`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
            {!demoMode && chartPoints.every((item) => item.value === 0) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl border border-pink-100 bg-white/90 px-4 py-3 text-center shadow-sm backdrop-blur">
                  <p className="text-caption font-black text-slate-600">{t('Chưa có doanh thu theo ngày')}</p>
                  <p className="mt-1 text-caption text-slate-400">{t('Biểu đồ sẽ hiển thị khi có giao dịch thực tế.')}</p>
                </div>
              </div>
            )}
          </div>
        </article>

        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-900">{t('Dịch vụ được yêu thích')}</h2><p className="mt-1 text-caption text-slate-400">{t('Xếp theo lượt sử dụng')}</p></div><button type="button" onClick={() => onNavigate('services')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-caption font-black text-pink-500 shadow-none">{t('Xem tất cả')}</button></div>
          {popularList.length > 0 ? <div className="mt-5 space-y-4">
            {popularList.map((service, index) => (
              <button key={service.name} type="button" onClick={() => onNavigate('services')} className="grid h-auto w-full grid-cols-[28px_1fr_auto] items-center gap-3 border-0 bg-transparent p-0 text-left shadow-none">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-caption font-black ${index === 0 ? 'bg-orange-100 text-orange-600' : index === 1 ? 'bg-pink-100 text-pink-600' : 'bg-slate-50 text-slate-500'}`}>{index + 1}</span>
                <span className="min-w-0"><span className="block text-caption font-bold text-slate-700">{service.name}</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-pink-50"><span className="block h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${Math.max(4, service.percent)}%` }} /></span></span>
                <span className="whitespace-nowrap text-caption font-semibold text-slate-500">{t('{count} lượt', { count: service.count })}</span>
              </button>
            ))}
          </div> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><UsersRound className="h-8 w-8 text-pink-200" /><p className="mt-3 text-caption font-bold text-slate-500">{t('Chưa có xếp hạng dịch vụ')}</p><p className="mt-1 text-caption text-slate-400">{t('Dữ liệu sẽ xuất hiện sau khi có giao dịch.')}</p></div>}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div><h2 className="text-sm font-black text-slate-900">{t('Doanh thu theo dịch vụ')}</h2><p className="mt-1 text-caption text-slate-400">{demoMode ? t('Tỷ trọng trong tháng hiện tại') : 'Tỷ trọng trong 30 ngày qua'}</p></div>
          {serviceMix.length > 0 ? <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <div className="tenant-service-donut relative h-36 w-36 shrink-0 rounded-full"><div className="absolute inset-[24px] flex items-center justify-center rounded-full bg-white text-center"><div><p className="text-lg font-black text-slate-900">{demoMode ? '100%' : formatCompactMoney(liveServiceTotal)}</p><p className="text-caption text-slate-400">{t('dịch vụ')}</p></div></div></div>
            <div className="w-full space-y-2.5">{serviceMix.map((service) => <div key={service.name} className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2 text-caption"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: service.color }} /><span className="min-w-0 truncate font-semibold text-slate-600">{service.name === 'Khác' ? t('Khác') : service.name}</span><span className="font-black text-slate-800">{service.percent}%</span><span className="ta-money text-right text-slate-500">{formatCompactMoney(service.value)}</span></div>)}</div>
          </div> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><CircleDollarSign className="h-8 w-8 text-pink-200" /><p className="mt-3 text-caption font-bold text-slate-500">{t('Chưa có cơ cấu doanh thu')}</p><p className="mt-1 text-caption text-slate-400">{t('Không sử dụng số liệu mẫu trong chế độ thực tế.')}</p></div>}
        </article>

        <article className="tenant-dashboard-card overflow-hidden rounded-2xl border border-pink-50 bg-white shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">{t('Lịch hẹn hôm nay')}</h2><p className="mt-1 text-caption text-slate-400">{t('5 lịch hẹn gần nhất')}</p></div><button type="button" onClick={() => onNavigate('appointments')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-caption font-black text-pink-500 shadow-none">{t('Xem tất cả')}</button></div>
          <div className="divide-y divide-pink-50">
            {appointments.map((appointment) => <button key={`${appointment.time}-${appointment.customer}`} type="button" onClick={() => onNavigate('appointments')} className="grid h-auto w-full grid-cols-[42px_28px_1fr_auto] items-center gap-2 rounded-none border-0 bg-white px-5 py-3 text-left shadow-none hover:bg-pink-50/40"><span className="text-caption font-black text-slate-700">{appointment.time}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-50 text-caption font-black text-pink-600">{appointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}</span><span className="min-w-0"><span className="block truncate text-caption font-bold text-slate-700">{appointment.customer}</span><span className="block truncate text-caption text-slate-400">{appointment.service}</span></span><span className={`rounded-full px-2 py-1 text-caption font-bold ${appointment.tone === 'arriving' ? 'bg-orange-50 text-orange-600' : appointment.tone === 'waiting' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{t(appointment.status)}</span></button>)}
          </div>
        </article>

        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)] lg:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">{t('Nhân viên xuất sắc')}</h2><p className="mt-1 text-caption text-slate-400">{t('Xếp theo doanh thu tháng')}</p></div><button type="button" onClick={() => onNavigate('staff')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-caption font-black text-pink-500 shadow-none">{t('Xem tất cả')}</button></div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-b border-pink-50 pb-5">{topStaff.slice(0, 3).map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="flex h-auto flex-col items-center border-0 bg-transparent p-0 text-center shadow-none"><span className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-gradient-to-br from-pink-50 to-orange-50 text-caption font-black text-pink-600 ${member.rank === 1 ? 'border-amber-300' : 'border-pink-100'}`}>{member.initials}{member.rank === 1 && <span className="absolute -top-4 text-base">♛</span>}</span><span className="mt-2 text-caption font-black text-slate-700">{member.name}</span><span className="ta-money mt-1 text-caption text-slate-500">{formatMoney(member.revenue)}</span></button>)}</div>
          <div className="divide-y divide-pink-50">{topStaff.slice(3).map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="grid h-auto w-full grid-cols-[24px_32px_1fr_auto] items-center gap-2 rounded-none border-0 bg-transparent py-3 text-left shadow-none"><span className="text-caption font-black text-slate-500">{member.rank}</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-caption font-black text-pink-600">{member.initials}</span><span className="text-caption font-bold text-slate-700">{member.name}</span><span className="ta-money text-right text-caption font-black text-slate-700">{formatMoney(member.revenue)}</span></button>)}</div>
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-orange-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pink-500 shadow-sm"><BadgePercent className="h-5 w-5" /></span><div><p className="text-caption font-black text-slate-800">{t('Gói {plan}', { plan: planName })} · {t('Đang hoạt động')}</p><p className="mt-1 text-caption text-slate-500">{t('Chi nhánh')} {branchQuota} · {t('Nhân sự')} {staffQuota}</p></div></div>
        <div className="flex flex-wrap gap-2"><span className={`rounded-xl border px-3 py-2 text-caption font-black ${branchAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-pink-100 bg-white text-slate-600'}`}>{t('Chi nhánh')} {branchQuota}</span><span className={`rounded-xl border px-3 py-2 text-caption font-black ${staffAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-pink-100 bg-white text-slate-600'}`}>{t('Nhân sự')} {staffQuota}</span></div>
      </section>
    </div>
  );
}
