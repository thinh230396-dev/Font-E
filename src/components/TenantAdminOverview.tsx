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

interface TenantAdminOverviewProps {
  branchName: string;
  tenantName: string;
  tenant: Tenant;
  demoMode: boolean;
  invoiceCount: number;
  planName: string;
  branchCount: number;
  branchLimit: number;
  staffCount: number;
  staffLimit: number;
  onToggleDemo: () => void;
  onNavigate: (page: NailPageId) => void;
  onQuickCreate: (page: Exclude<NailPageId, 'overview' | 'subscription' | 'support'>) => void;
}

const revenueSeries = [
  12.5, 18.6, 16.4, 24.8, 28.7, 14.6, 13.8,
  17.2, 19.4, 22.1, 20.8, 26.3, 29.5, 24.2,
  23.7, 27.4, 31.2, 29.8, 34.1, 32.6, 36.4,
  30.8, 33.5, 35.2, 38.1, 36.7, 40.2, 42.5, 39.4, 44.1
];

const appointments = [
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

const topStaff = [
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

  const chartPoints = useMemo(() => {
    const now = new Date();
    const demoPoints = revenueSeries.slice(-range);

    let realTxMap: Record<string, number> = {};
    if (!demoMode && tenantName) {
      try {
        const raw = localStorage.getItem(`tenant-admin-finance-v1:${tenantName}:transactions`);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.forEach((tx: any) => {
            if ((tx.status === 'POSTED' || tx.status === 'Hoàn thành') && tx.type === 'INCOME') {
              let dateKey = tx.date;
              if (dateKey) {
                if (dateKey.includes('-')) {
                  const [y, m, d] = dateKey.split('-');
                  dateKey = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
                }
                realTxMap[dateKey] = (realTxMap[dateKey] || 0) + (tx.amount || 0) / 1_000_000;
              }
            }
          });
        }
      } catch {
        // ignore
      }
    }

    return Array.from({ length: range }, (_, index) => {
      const daysAgo = range - 1 - index;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr = d.getFullYear();
      const dateKey = `${dayStr}/${monthStr}/${yearStr}`;
      const label = `${dayStr}/${monthStr}`;

      const value = demoMode ? (demoPoints[index] ?? 0) : (realTxMap[dateKey] || 0);

      return {
        id: `${dateKey}-${index}`,
        label,
        // Ngày đầy đủ dùng cho tooltip và nhãn trợ năng; trục ngang chỉ hiện dd/MM.
        fullDate: dateKey,
        value,
        dateKey
      };
    });
  }, [demoMode, range, tenantName]);

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
  const dashboardRevenue = demoMode ? 128_450_000 : tenant.monthlyRevenue || 0;
  const dashboardStats = [
    { label: t('Doanh thu'), value: formatMoney(dashboardRevenue, tenant.currency || 'VND'), detail: demoMode ? `↑ 18,6% ${t('so với tuần trước')}` : t('Tổng hợp doanh thu hiện tại'), icon: CircleDollarSign, tone: 'tenant-stat--pink' },
    { label: t('Lượt khách'), value: demoMode ? '326' : '0', detail: demoMode ? `↑ 12,4% ${t('so với tuần trước')}` : t('Chưa ghi nhận lượt khách'), icon: UsersRound, tone: 'tenant-stat--purple' },
    { label: t('Lịch hẹn'), value: demoMode ? '156' : '0', detail: demoMode ? `↑ 9,7% ${t('so với tuần trước')}` : t('Chưa có lịch hẹn hôm nay'), icon: CalendarDays, tone: 'tenant-stat--orange' },
    { label: t('Hóa đơn'), value: String(invoiceCount), detail: invoiceCount ? t('{count} hóa đơn trong hệ thống', { count: invoiceCount }) : t('Chưa có hóa đơn'), icon: ReceiptText, tone: 'tenant-stat--blue' }
  ];

  return (
    <div className="tenant-overview space-y-5">
      <PageHeader
        className="tenant-overview-heading"
        title={tenantName}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onToggleDemo} className="tenant-soft-button flex h-11 items-center justify-center border border-pink-100 bg-white px-4 text-caption font-bold text-pink-600 shadow-sm">{demoMode ? t('Tắt dữ liệu mẫu') : t('Xem dữ liệu mẫu')}</button>
          <button type="button" onClick={() => onNavigate('subscription')} className="tenant-soft-button flex h-11 items-center justify-center gap-2 border border-pink-100 bg-white px-4 text-caption font-bold text-pink-600 shadow-sm"><BadgePercent className="h-4 w-4" />{t('Gói {plan}', { plan: planName })}</button>
          <button type="button" onClick={() => onQuickCreate('appointments')} className="tenant-primary-button flex h-11 items-center justify-center gap-2 border border-pink-500 bg-pink-500 px-4 text-caption font-black text-white shadow-lg shadow-pink-200"><Plus className="h-4 w-4" />{t('Tạo lịch hẹn')}</button>
          </div>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {dashboardStats.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="tenant-overview-stat min-w-0 rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.06)]">
            <div className="flex items-start justify-between gap-3"><p className="ta-kpi-label uppercase tracking-[0.08em]">{label}</p><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div>
            <p className="ta-metric-value mt-3 text-slate-950">{value}</p><p className={`ta-supporting-text mt-1 font-semibold ${demoMode ? 'text-emerald-600' : 'text-slate-400'}`}>{detail}</p>
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
          {demoMode ? <div className="mt-5 space-y-4">
            {popularServices.map((service, index) => (
              <button key={service.name} type="button" onClick={() => onNavigate('services')} className="grid h-auto w-full grid-cols-[28px_1fr_auto] items-center gap-3 border-0 bg-transparent p-0 text-left shadow-none">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-caption font-black ${index === 0 ? 'bg-orange-100 text-orange-600' : index === 1 ? 'bg-pink-100 text-pink-600' : 'bg-slate-50 text-slate-500'}`}>{index + 1}</span>
                <span className="min-w-0"><span className="block text-caption font-bold text-slate-700">{service.name}</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-pink-50"><span className="block h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${demoMode ? service.percent : 4}%` }} /></span></span>
                <span className="whitespace-nowrap text-caption font-semibold text-slate-500">{t('{count} lượt', { count: demoMode ? service.count : 0 })}</span>
              </button>
            ))}
          </div> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><UsersRound className="h-8 w-8 text-pink-200" /><p className="mt-3 text-caption font-bold text-slate-500">{t('Chưa có xếp hạng dịch vụ')}</p><p className="mt-1 text-caption text-slate-400">{t('Dữ liệu sẽ xuất hiện sau khi có giao dịch.')}</p></div>}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div><h2 className="text-sm font-black text-slate-900">{t('Doanh thu theo dịch vụ')}</h2><p className="mt-1 text-caption text-slate-400">{t('Tỷ trọng trong tháng hiện tại')}</p></div>
          {demoMode ? <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <div className="tenant-service-donut relative h-36 w-36 shrink-0 rounded-full"><div className="absolute inset-[24px] flex items-center justify-center rounded-full bg-white text-center"><div><p className="text-lg font-black text-slate-900">{demoMode ? '100%' : '0%'}</p><p className="text-caption text-slate-400">{t('dịch vụ')}</p></div></div></div>
            <div className="w-full space-y-2.5">{serviceRevenue.map((service) => <div key={service.name} className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2 text-caption"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: service.color }} /><span className="font-semibold text-slate-600">{service.name === 'Khác' ? t('Khác') : service.name}</span><span className="font-black text-slate-800">{demoMode ? service.percent : 0}%</span><span className="ta-money text-right text-slate-500">{demoMode ? formatCompactMoney(service.value) : formatMoney(0)}</span></div>)}</div>
          </div> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><CircleDollarSign className="h-8 w-8 text-pink-200" /><p className="mt-3 text-caption font-bold text-slate-500">{t('Chưa có cơ cấu doanh thu')}</p><p className="mt-1 text-caption text-slate-400">{t('Không sử dụng số liệu mẫu trong chế độ thực tế.')}</p></div>}
        </article>

        <article className="tenant-dashboard-card overflow-hidden rounded-2xl border border-pink-50 bg-white shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">{t('Lịch hẹn hôm nay')}</h2><p className="mt-1 text-caption text-slate-400">{demoMode ? t('5 lịch hẹn gần nhất') : t('Chưa có dữ liệu hôm nay')}</p></div><button type="button" onClick={() => onNavigate('appointments')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-caption font-black text-pink-500 shadow-none">{t('Xem tất cả')}</button></div>
          <div className="divide-y divide-pink-50">
            {(demoMode ? appointments : []).map((appointment) => <button key={`${appointment.time}-${appointment.customer}`} type="button" onClick={() => onNavigate('appointments')} className="grid h-auto w-full grid-cols-[42px_28px_1fr_auto] items-center gap-2 rounded-none border-0 bg-white px-5 py-3 text-left shadow-none hover:bg-pink-50/40"><span className="text-caption font-black text-slate-700">{appointment.time}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-50 text-caption font-black text-pink-600">{appointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}</span><span className="min-w-0"><span className="block truncate text-caption font-bold text-slate-700">{appointment.customer}</span><span className="block truncate text-caption text-slate-400">{appointment.service}</span></span><span className={`rounded-full px-2 py-1 text-caption font-bold ${appointment.tone === 'arriving' ? 'bg-orange-50 text-orange-600' : appointment.tone === 'waiting' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{t(appointment.status)}</span></button>)}
            {!demoMode && <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><CalendarClock className="h-8 w-8 text-pink-200" /><p className="mt-3 text-caption font-bold text-slate-500">{t('Chưa có lịch hẹn hôm nay')}</p><button type="button" onClick={() => onQuickCreate('appointments')} className="tenant-primary-button mt-4 h-9 border-0 bg-pink-500 px-4 text-caption font-black text-white">{t('Tạo lịch hẹn')}</button></div>}
          </div>
        </article>

        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)] lg:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">{t('Nhân viên xuất sắc')}</h2><p className="mt-1 text-caption text-slate-400">{t('Xếp theo doanh thu tháng')}</p></div><button type="button" onClick={() => onNavigate('staff')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-caption font-black text-pink-500 shadow-none">{t('Xem tất cả')}</button></div>
          {demoMode ? <><div className="mt-5 grid grid-cols-3 gap-3 border-b border-pink-50 pb-5">{topStaff.slice(0, 3).map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="flex h-auto flex-col items-center border-0 bg-transparent p-0 text-center shadow-none"><span className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-gradient-to-br from-pink-50 to-orange-50 text-caption font-black text-pink-600 ${member.rank === 1 ? 'border-amber-300' : 'border-pink-100'}`}>{member.initials}{member.rank === 1 && <span className="absolute -top-4 text-base">♛</span>}</span><span className="mt-2 text-caption font-black text-slate-700">{member.name}</span><span className="ta-money mt-1 text-caption text-slate-500">{formatMoney(member.revenue)}</span></button>)}</div>
          <div className="divide-y divide-pink-50">{topStaff.slice(3).map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="grid h-auto w-full grid-cols-[24px_32px_1fr_auto] items-center gap-2 rounded-none border-0 bg-transparent py-3 text-left shadow-none"><span className="text-caption font-black text-slate-500">{member.rank}</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-caption font-black text-pink-600">{member.initials}</span><span className="text-caption font-bold text-slate-700">{member.name}</span><span className="ta-money text-right text-caption font-black text-slate-700">{formatMoney(member.revenue)}</span></button>)}</div></> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><UsersRound className="h-8 w-8 text-pink-200" /><p className="mt-3 text-caption font-bold text-slate-500">{t('Chưa có bảng xếp hạng nhân sự')}</p><p className="mt-1 text-caption text-slate-400">{t('Dữ liệu sẽ được tổng hợp từ doanh thu thực tế.')}</p></div>}
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-orange-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pink-500 shadow-sm"><BadgePercent className="h-5 w-5" /></span><div><p className="text-caption font-black text-slate-800">{t('Gói {plan}', { plan: planName })} · {t('Đang hoạt động')}</p><p className="mt-1 text-caption text-slate-500">{t('Chi nhánh')} {branchQuota} · {t('Nhân sự')} {staffQuota}</p></div></div>
        <div className="flex flex-wrap gap-2"><span className={`rounded-xl border px-3 py-2 text-caption font-black ${branchAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-pink-100 bg-white text-slate-600'}`}>{t('Chi nhánh')} {branchQuota}</span><span className={`rounded-xl border px-3 py-2 text-caption font-black ${staffAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-pink-100 bg-white text-slate-600'}`}>{t('Nhân sự')} {staffQuota}</span></div>
      </section>
    </div>
  );
}
