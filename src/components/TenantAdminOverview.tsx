import { useState } from 'react';
import {
  BadgePercent,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Plus,
  ReceiptText,
  UsersRound
} from 'lucide-react';
import type { Tenant } from '../types';
import type { NailPageId } from './nailAdminData';
import { formatTenantQuota, isUnlimitedTenantLimit } from '../utils/tenantAdminEntitlements';

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
  onNavigate: (page: NailPageId) => void;
  onQuickCreate: (page: Exclude<NailPageId, 'overview' | 'subscription'>) => void;
}

const formatMoney = (value: number, currency = 'VND') => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency,
  maximumFractionDigits: currency === 'VND' ? 0 : 2
}).format(value);

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
  { name: 'Sơn gel', percent: 45.2, value: '58,1M', color: '#f43f78' },
  { name: 'Nail art', percent: 23.6, value: '30,3M', color: '#c85acb' },
  { name: 'Đắp bột', percent: 15.8, value: '20,3M', color: '#f08aa4' },
  { name: 'Chăm sóc móng', percent: 9.7, value: '12,5M', color: '#ffb27b' },
  { name: 'Khác', percent: 5.7, value: '7,3M', color: '#d58ce0' }
];

const topStaff = [
  { name: 'Kim Ngân', initials: 'KN', revenue: '32.450.000đ', rank: 1 },
  { name: 'Bảo Trân', initials: 'BT', revenue: '28.100.000đ', rank: 2 },
  { name: 'Minh Thư', initials: 'MT', revenue: '24.780.000đ', rank: 3 },
  { name: 'Thanh Vy', initials: 'TV', revenue: '22.350.000đ', rank: 4 },
  { name: 'Gia Hân', initials: 'GH', revenue: '18.900.000đ', rank: 5 }
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
  onNavigate,
  onQuickCreate
}: TenantAdminOverviewProps) {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const points = (demoMode ? revenueSeries : Array<number>(30).fill(0)).slice(-range);
  const chartPoints = range === 30
    ? points.filter((_value, index) => index % 4 === 0 || index === points.length - 1)
    : range === 14
      ? points.filter((_value, index) => index % 2 === 0 || index === points.length - 1)
      : points;
  const chartMax = Math.max(1, ...chartPoints);
  const branchQuota = formatTenantQuota(branchCount, branchLimit, 'branches');
  const staffQuota = formatTenantQuota(staffCount, staffLimit, 'staff');
  const branchAtLimit = !isUnlimitedTenantLimit(branchLimit, 'branches') && branchCount >= branchLimit;
  const staffAtLimit = !isUnlimitedTenantLimit(staffLimit, 'staff') && staffCount >= staffLimit;
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());
  const dashboardRevenue = demoMode ? 128_450_000 : tenant.monthlyRevenue || 0;
  const dashboardStats = [
    { label: 'Doanh thu', value: formatMoney(dashboardRevenue, tenant.currency || 'VND'), detail: demoMode ? '↑ 18,6% so với tuần trước' : 'Tổng hợp doanh thu hiện tại', icon: CircleDollarSign, tone: 'tenant-stat--pink' },
    { label: 'Lượt khách', value: demoMode ? '326' : '0', detail: demoMode ? '↑ 12,4% so với tuần trước' : 'Chưa ghi nhận lượt khách', icon: UsersRound, tone: 'tenant-stat--purple' },
    { label: 'Lịch hẹn', value: demoMode ? '156' : '0', detail: demoMode ? '↑ 9,7% so với tuần trước' : 'Chưa có lịch hẹn hôm nay', icon: CalendarDays, tone: 'tenant-stat--orange' },
    { label: 'Hóa đơn', value: String(invoiceCount), detail: invoiceCount ? `${invoiceCount} hóa đơn trong hệ thống` : 'Chưa có hóa đơn', icon: ReceiptText, tone: 'tenant-stat--blue' }
  ];

  return (
    <div className="tenant-overview space-y-5">
      <section className="tenant-overview-heading flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-500">Chào mừng trở lại,</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black uppercase tracking-[-0.035em] text-slate-950 sm:text-3xl">{tenantName}</h1>
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-50 text-pink-500">♡</span>
          </div>
          <p className="mt-2 text-[10px] capitalize text-slate-400">{today} · {branchName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onNavigate('subscription')} className="tenant-soft-button flex h-11 items-center justify-center gap-2 border border-pink-100 bg-white px-4 text-[9px] font-bold text-pink-600 shadow-sm"><BadgePercent className="h-4 w-4" />Gói {planName}</button>
          <button type="button" onClick={() => onQuickCreate('appointments')} className="tenant-primary-button flex h-11 items-center justify-center gap-2 border border-pink-500 bg-pink-500 px-4 text-[10px] font-black text-white shadow-lg shadow-pink-200"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="tenant-overview-stat flex items-center gap-4 rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.06)]">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-7 w-7" /></span>
            <div className="min-w-0"><p className="text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">{value}</p><p className={`mt-1 truncate text-[7px] font-semibold ${demoMode ? 'text-emerald-600' : 'text-slate-400'}`}>{detail}</p></div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]">
        <article className="tenant-dashboard-card overflow-hidden rounded-2xl border border-pink-50 bg-white shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex flex-col gap-4 border-b border-pink-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="text-sm font-black text-slate-900">Doanh thu</h2><p className="mt-1 text-[8px] text-slate-400">Doanh thu thực nhận · {branchName}</p></div>
            <div className="flex rounded-xl border border-pink-100 bg-pink-50/50 p-1" aria-label="Khoảng thời gian doanh thu">
              {([7, 14, 30] as const).map((value) => <button key={value} type="button" onClick={() => setRange(value)} aria-pressed={range === value} className={`h-8 min-h-0 border-0 px-3 text-[8px] font-black shadow-none ${range === value ? 'bg-white text-pink-600 shadow-sm' : 'bg-transparent text-slate-400'}`}>{value} ngày</button>)}
            </div>
          </div>
          <div className="tenant-revenue-chart relative grid min-h-[285px] items-end gap-3 px-5 pb-5 pt-12 sm:px-7" style={{ gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))` }}>
            {chartPoints.map((value, index) => {
              const height = Math.max(24, Math.round(value / chartMax * 100));
              return (
                <div key={`${index}-${value}`} className="group flex h-full flex-col items-center justify-end">
                  <span className="mb-2 text-[7px] font-black text-slate-600 opacity-0 transition group-hover:opacity-100">{value.toLocaleString('vi-VN')}M</span>
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div className="tenant-revenue-area relative w-full rounded-t-xl bg-gradient-to-t from-pink-50 via-pink-100/80 to-pink-200/70" style={{ height: `${demoMode ? height : 2}%` }}>
                      <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-[3px] border-white bg-pink-500 shadow-[0_0_0_2px_rgba(244,63,120,0.15)]" />
                    </div>
                  </div>
                  <span className="mt-3 text-[7px] font-semibold text-slate-400">{20 + index}/05</span>
                </div>
              );
            })}
            {!demoMode && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="rounded-xl border border-pink-100 bg-white/90 px-4 py-3 text-center shadow-sm backdrop-blur"><p className="text-[9px] font-black text-slate-600">Chưa có doanh thu theo ngày</p><p className="mt-1 text-[7px] text-slate-400">Biểu đồ sẽ hiển thị khi có giao dịch thực tế.</p></div></div>}
          </div>
        </article>

        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-900">Dịch vụ được yêu thích</h2><p className="mt-1 text-[8px] text-slate-400">Xếp theo lượt sử dụng</p></div><button type="button" onClick={() => onNavigate('services')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-[8px] font-black text-pink-500 shadow-none">Xem tất cả</button></div>
          {demoMode ? <div className="mt-5 space-y-4">
            {popularServices.map((service, index) => (
              <button key={service.name} type="button" onClick={() => onNavigate('services')} className="grid h-auto w-full grid-cols-[28px_1fr_auto] items-center gap-3 border-0 bg-transparent p-0 text-left shadow-none">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[8px] font-black ${index === 0 ? 'bg-orange-100 text-orange-600' : index === 1 ? 'bg-pink-100 text-pink-600' : 'bg-slate-50 text-slate-500'}`}>{index + 1}</span>
                <span className="min-w-0"><span className="block text-[8px] font-bold text-slate-700">{service.name}</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-pink-50"><span className="block h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${demoMode ? service.percent : 4}%` }} /></span></span>
                <span className="whitespace-nowrap text-[8px] font-semibold text-slate-500">{demoMode ? service.count : 0} lượt</span>
              </button>
            ))}
          </div> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><UsersRound className="h-8 w-8 text-pink-200" /><p className="mt-3 text-[9px] font-bold text-slate-500">Chưa có xếp hạng dịch vụ</p><p className="mt-1 text-[7px] text-slate-400">Dữ liệu sẽ xuất hiện sau khi có giao dịch.</p></div>}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div><h2 className="text-sm font-black text-slate-900">Doanh thu theo dịch vụ</h2><p className="mt-1 text-[8px] text-slate-400">Tỷ trọng trong tháng hiện tại</p></div>
          {demoMode ? <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <div className="tenant-service-donut relative h-36 w-36 shrink-0 rounded-full"><div className="absolute inset-[24px] flex items-center justify-center rounded-full bg-white text-center"><div><p className="text-lg font-black text-slate-900">{demoMode ? '100%' : '0%'}</p><p className="text-[7px] text-slate-400">dịch vụ</p></div></div></div>
            <div className="w-full space-y-2.5">{serviceRevenue.map((service) => <div key={service.name} className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2 text-[7px]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: service.color }} /><span className="font-semibold text-slate-600">{service.name}</span><span className="font-black text-slate-800">{demoMode ? service.percent : 0}%</span><span className="text-slate-400">{demoMode ? service.value : '0đ'}</span></div>)}</div>
          </div> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><CircleDollarSign className="h-8 w-8 text-pink-200" /><p className="mt-3 text-[9px] font-bold text-slate-500">Chưa có cơ cấu doanh thu</p><p className="mt-1 text-[7px] text-slate-400">Không sử dụng số liệu mẫu trong chế độ thực tế.</p></div>}
        </article>

        <article className="tenant-dashboard-card overflow-hidden rounded-2xl border border-pink-50 bg-white shadow-[0_12px_36px_rgba(226,68,120,0.05)]">
          <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">Lịch hẹn hôm nay</h2><p className="mt-1 text-[8px] text-slate-400">{demoMode ? '5 lịch hẹn gần nhất' : 'Chưa có dữ liệu hôm nay'}</p></div><button type="button" onClick={() => onNavigate('appointments')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-[8px] font-black text-pink-500 shadow-none">Xem tất cả</button></div>
          <div className="divide-y divide-pink-50">
            {(demoMode ? appointments : []).map((appointment) => <button key={`${appointment.time}-${appointment.customer}`} type="button" onClick={() => onNavigate('appointments')} className="grid h-auto w-full grid-cols-[42px_28px_1fr_auto] items-center gap-2 rounded-none border-0 bg-white px-5 py-3 text-left shadow-none hover:bg-pink-50/40"><span className="text-[8px] font-black text-slate-700">{appointment.time}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-50 text-[7px] font-black text-pink-600">{appointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}</span><span className="min-w-0"><span className="block truncate text-[8px] font-bold text-slate-700">{appointment.customer}</span><span className="block truncate text-[7px] text-slate-400">{appointment.service}</span></span><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${appointment.tone === 'arriving' ? 'bg-orange-50 text-orange-600' : appointment.tone === 'waiting' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{appointment.status}</span></button>)}
            {!demoMode && <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><CalendarClock className="h-8 w-8 text-pink-200" /><p className="mt-3 text-[9px] font-bold text-slate-500">Chưa có lịch hẹn hôm nay</p><button type="button" onClick={() => onQuickCreate('appointments')} className="tenant-primary-button mt-4 h-9 border-0 bg-pink-500 px-4 text-[8px] font-black text-white">Tạo lịch hẹn</button></div>}
          </div>
        </article>

        <article className="tenant-dashboard-card rounded-2xl border border-pink-50 bg-white p-5 shadow-[0_12px_36px_rgba(226,68,120,0.05)] lg:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Nhân viên xuất sắc</h2><p className="mt-1 text-[8px] text-slate-400">Xếp theo doanh thu tháng</p></div><button type="button" onClick={() => onNavigate('staff')} className="tenant-link-button h-8 border-0 bg-pink-50 px-3 text-[8px] font-black text-pink-500 shadow-none">Xem tất cả</button></div>
          {demoMode ? <><div className="mt-5 grid grid-cols-3 gap-3 border-b border-pink-50 pb-5">{topStaff.slice(0, 3).map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="flex h-auto flex-col items-center border-0 bg-transparent p-0 text-center shadow-none"><span className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-gradient-to-br from-pink-50 to-orange-50 text-[9px] font-black text-pink-600 ${member.rank === 1 ? 'border-amber-300' : 'border-pink-100'}`}>{member.initials}{member.rank === 1 && <span className="absolute -top-4 text-base">♛</span>}</span><span className="mt-2 text-[8px] font-black text-slate-700">{member.name}</span><span className="mt-1 text-[7px] text-slate-500">{member.revenue}</span></button>)}</div>
          <div className="divide-y divide-pink-50">{topStaff.slice(3).map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="grid h-auto w-full grid-cols-[24px_32px_1fr_auto] items-center gap-2 rounded-none border-0 bg-transparent py-3 text-left shadow-none"><span className="text-[8px] font-black text-slate-500">{member.rank}</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-[7px] font-black text-pink-600">{member.initials}</span><span className="text-[8px] font-bold text-slate-700">{member.name}</span><span className="text-[8px] font-black text-slate-700">{member.revenue}</span></button>)}</div></> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><UsersRound className="h-8 w-8 text-pink-200" /><p className="mt-3 text-[9px] font-bold text-slate-500">Chưa có bảng xếp hạng nhân sự</p><p className="mt-1 text-[7px] text-slate-400">Dữ liệu sẽ được tổng hợp từ doanh thu thực tế.</p></div>}
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-orange-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pink-500 shadow-sm"><BadgePercent className="h-5 w-5" /></span><div><p className="text-[9px] font-black text-slate-800">Gói {planName} · Đang hoạt động</p><p className="mt-1 text-[7px] text-slate-500">Chi nhánh {branchQuota} · Nhân sự {staffQuota}</p></div></div>
        <div className="flex flex-wrap gap-2"><span className={`rounded-xl border px-3 py-2 text-[8px] font-black ${branchAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-pink-100 bg-white text-slate-600'}`}>Chi nhánh {branchQuota}</span><span className={`rounded-xl border px-3 py-2 text-[8px] font-black ${staffAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-pink-100 bg-white text-slate-600'}`}>Nhân sự {staffQuota}</span></div>
      </section>
    </div>
  );
}
