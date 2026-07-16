import { useMemo, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Scissors,
  Settings,
  Sparkles,
  Star,
  Store,
  Target,
  TrendingUp,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';
import BeautifulSelect from './BeautifulSelect';

interface TenantAdminPortalProps {
  account: DemoAccount;
  onLogout: () => void;
}

const appointments = [
  { id: 'APT-1042', time: '08:30', customer: 'Nguyễn Minh Anh', service: 'Nhuộm Balayage', stylist: 'Thảo Nguyễn', duration: '120 phút', status: 'Đã xác nhận', tone: 'emerald' },
  { id: 'APT-1043', time: '10:15', customer: 'Trần Thu Hà', service: 'Cắt & tạo kiểu', stylist: 'Minh Khang', duration: '60 phút', status: 'Đang phục vụ', tone: 'violet' },
  { id: 'APT-1044', time: '11:30', customer: 'Lê Ngọc Mai', service: 'Phục hồi Keratin', stylist: 'Thảo Nguyễn', duration: '90 phút', status: 'Đã xác nhận', tone: 'emerald' },
  { id: 'APT-1045', time: '13:45', customer: 'Phạm Hoài Nam', service: 'Cắt tóc nam', stylist: 'Quốc Bảo', duration: '45 phút', status: 'Chờ xác nhận', tone: 'amber' },
  { id: 'APT-1046', time: '15:00', customer: 'Vũ Khánh Linh', service: 'Uốn setting', stylist: 'Minh Khang', duration: '150 phút', status: 'Đã xác nhận', tone: 'emerald' }
];

const navItems = [
  { label: 'Tổng quan', icon: LayoutDashboard, active: true },
  { label: 'Lịch hẹn', icon: CalendarDays },
  { label: 'Khách hàng', icon: UsersRound },
  { label: 'Nhân sự', icon: UserRound },
  { label: 'Dịch vụ & giá', icon: Sparkles },
  { label: 'Thu chi', icon: WalletCards },
  { label: 'Cài đặt salon', icon: Settings }
];

const statusClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200'
};

type DashboardRange = 'TODAY' | 'WEEK' | 'MONTH';

const rangeData: Record<DashboardRange, {
  label: string;
  comparison: string;
  revenue: number;
  appointments: number;
  completed: number;
  newCustomers: number;
  chartLabels: string[];
  chartValues: number[];
}> = {
  TODAY: { label: 'hôm nay', comparison: 'so với hôm qua', revenue: 12.84, appointments: 28, completed: 19, newCustomers: 9, chartLabels: ['08h', '10h', '12h', '14h', '16h', '18h', '20h'], chartValues: [1.1, 2.3, 1.7, 2.9, 3.8, 4.6, 3.4] },
  WEEK: { label: '7 ngày qua', comparison: 'so với tuần trước', revenue: 78.6, appointments: 164, completed: 148, newCustomers: 43, chartLabels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], chartValues: [8.4, 9.8, 10.5, 12.8, 13.7, 15.9, 14.2] },
  MONTH: { label: 'tháng 07/2026', comparison: 'so với tháng trước', revenue: 186.4, appointments: 398, completed: 365, newCustomers: 104, chartLabels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], chartValues: [38.6, 45.2, 51.8, 50.8] }
};

const branchFactors: Record<string, number> = { ALL: 1.72, Q3: 1, Q1: 0.72 };

const topServices = [
  { name: 'Nhuộm Balayage', bookings: 42, revenue: '48,6 triệu', growth: '+18%', color: 'bg-violet-500', width: '92%' },
  { name: 'Uốn setting', bookings: 37, revenue: '35,2 triệu', growth: '+11%', color: 'bg-indigo-500', width: '78%' },
  { name: 'Phục hồi Keratin', bookings: 31, revenue: '24,8 triệu', growth: '+9%', color: 'bg-cyan-500', width: '66%' },
  { name: 'Cắt & tạo kiểu', bookings: 68, revenue: '20,4 triệu', growth: '+6%', color: 'bg-emerald-500', width: '55%' }
];

const staffPerformance = [
  { name: 'Thảo Nguyễn', role: 'Senior Stylist', bookings: 38, revenue: '42,8 triệu', rating: '4.9', utilization: 92, initials: 'TN', tone: 'bg-violet-100 text-violet-700' },
  { name: 'Minh Khang', role: 'Hair Stylist', bookings: 34, revenue: '36,5 triệu', rating: '4.8', utilization: 87, initials: 'MK', tone: 'bg-blue-100 text-blue-700' },
  { name: 'Quốc Bảo', role: 'Barber', bookings: 41, revenue: '28,7 triệu', rating: '4.8', utilization: 84, initials: 'QB', tone: 'bg-emerald-100 text-emerald-700' },
  { name: 'Thuỳ Dương', role: 'Hair Assistant', bookings: 29, revenue: '18,2 triệu', rating: '4.7', utilization: 79, initials: 'TD', tone: 'bg-amber-100 text-amber-700' }
];

const recentActivities = [
  { title: 'Thanh toán hóa đơn APT-1041', detail: 'Nguyễn Lan Anh · MoMo · 1.250.000đ', time: '5 phút trước', icon: CreditCard, tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'Lịch hẹn mới được tạo', detail: 'Vũ Khánh Linh · Uốn setting · 15:00', time: '12 phút trước', icon: CalendarCheck2, tone: 'bg-violet-50 text-violet-600' },
  { title: 'Khách hàng mới', detail: 'Phạm Hoài Nam đã hoàn tất hồ sơ', time: '28 phút trước', icon: UserPlus, tone: 'bg-blue-50 text-blue-600' },
  { title: 'Điều chỉnh tồn kho', detail: 'Màu nhuộm L’Oréal 6.1 · -2 sản phẩm', time: '45 phút trước', icon: Boxes, tone: 'bg-amber-50 text-amber-600' }
];

const formatMillion = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} triệu`;

export default function TenantAdminPortal({ account, onLogout }: TenantAdminPortalProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('TODAY');
  const [selectedBranch, setSelectedBranch] = useState('Q3');

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((appointment) =>
      `${appointment.customer} ${appointment.service} ${appointment.stylist}`.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const currentRange = rangeData[dashboardRange];
  const branchFactor = branchFactors[selectedBranch];
  const branchName = selectedBranch === 'ALL' ? 'Tất cả chi nhánh' : selectedBranch === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3';
  const revenue = currentRange.revenue * branchFactor;
  const appointmentCount = Math.round(currentRange.appointments * branchFactor);
  const completedCount = Math.round(currentRange.completed * branchFactor);
  const newCustomerCount = Math.round(currentRange.newCustomers * branchFactor);
  const chartMax = Math.max(...currentRange.chartValues) * branchFactor;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      {sidebarOpen && <button type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 min-h-0 rounded-none border-0 bg-slate-950/45 p-0 shadow-none lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-[#121827] text-white shadow-2xl transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-white/8 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/30"><Store className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-black tracking-tight">Lumière</p><p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Hair Studio</p></div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" className="ml-auto flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none lg:hidden"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-4 py-5">
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Không gian quản lý</p>
          <nav className="space-y-1">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button key={label} type="button" className={`flex h-10 w-full items-center gap-3 border-0 px-3 text-left text-[11px] font-bold shadow-none ${active ? 'bg-violet-500/18 text-violet-200 ring-1 ring-violet-400/20' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Icon className={`h-4 w-4 ${active ? 'text-violet-400' : ''}`} />
                <span>{label}</span>
                {label === 'Lịch hẹn' && <span className="ml-auto rounded-full bg-violet-500/20 px-2 py-0.5 text-[8px] text-violet-300">28</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="mx-4 mt-auto mb-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold text-slate-300">Gói Premium</span><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[8px] font-bold text-emerald-300">Đang hoạt động</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[64%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div>
          <p className="mt-2 text-[9px] leading-4 text-slate-500">64% dung lượng tháng · Gia hạn 01/08/2026</p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm khách hàng, dịch vụ, nhân viên..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-[11px] font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => { setShowNotifications((value) => !value); setShowProfile(false); }} aria-label="Thông báo" className="relative flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm"><Bell className="h-4.5 w-4.5" /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white">3</span></button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 px-4 py-3"><p className="text-xs font-black">Thông báo salon</p><p className="mt-1 text-[9px] text-slate-500">3 thông báo cần bạn xem</p></div>
                  <div className="divide-y divide-slate-100">
                    {['Khách hàng vừa đặt lịch lúc 16:30', 'Kho màu nhuộm còn dưới định mức', 'Báo cáo cuối ngày đã sẵn sàng'].map((item, index) => <div key={item} className="flex gap-3 px-4 py-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 1 ? 'bg-amber-400' : 'bg-violet-500'}`} /><div><p className="text-[10px] font-bold text-slate-800">{item}</p><p className="mt-1 text-[9px] text-slate-400">{index * 8 + 2} phút trước</p></div></div>)}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => { setShowProfile((value) => !value); setShowNotifications(false); }} className="flex h-11 items-center gap-2 border-0 bg-transparent px-1.5 text-left shadow-none sm:px-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-black text-white">LN</span>
                <span className="hidden sm:block"><span className="block text-[10px] font-black text-slate-800">{account.displayName}</span><span className="mt-0.5 block text-[8px] font-semibold text-slate-400">Tenant Admin</span></span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
              </button>
              {showProfile && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="border-b border-slate-100 px-3 py-3"><p className="text-[11px] font-black text-slate-800">{account.displayName}</p><p className="mt-1 text-[9px] text-slate-500">{account.email}</p></div>
                  <button type="button" onClick={onLogout} className="mt-1 flex h-10 w-full items-center gap-2.5 border-0 bg-transparent px-3 text-[10px] font-bold text-rose-600 shadow-none hover:bg-rose-50"><LogOut className="h-4 w-4" />Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <section className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />{branchName} đang hoạt động</div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Chào buổi chiều, anh Nam</h1><p className="mt-2 text-[11px] text-slate-500">Thứ Năm, 16 tháng 07 · Báo cáo tổng quan {currentRange.label}</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <BeautifulSelect value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)} aria-label="Chọn chi nhánh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-48"><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option><option value="ALL">Tất cả chi nhánh</option></BeautifulSelect>
              <BeautifulSelect value={dashboardRange} onChange={(event) => setDashboardRange(event.target.value as DashboardRange)} aria-label="Chọn khoảng thời gian" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-40"><option value="TODAY">Hôm nay</option><option value="WEEK">7 ngày qua</option><option value="MONTH">Tháng này</option></BeautifulSelect>
              <button type="button" onClick={() => window.print()} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[10px] font-bold text-slate-700 shadow-sm"><Download className="h-4 w-4" />Xuất báo cáo</button>
              <button type="button" onClick={() => setShowCreateAppointment(true)} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[11px] font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: `Doanh thu ${currentRange.label}`, value: formatMillion(revenue), detail: `+18,6% ${currentRange.comparison}`, subdetail: 'Mục tiêu đạt 74,5%', icon: CircleDollarSign, tone: 'violet' },
              { label: 'Tổng lịch hẹn', value: appointmentCount.toLocaleString('vi-VN'), detail: `${completedCount} lịch đã hoàn thành`, subdetail: `${Math.max(0, appointmentCount - completedCount)} lịch đang xử lý`, icon: CalendarCheck2, tone: 'blue' },
              { label: 'Khách hàng mới', value: newCustomerCount.toLocaleString('vi-VN'), detail: '+12,4% so với kỳ trước', subdetail: 'Tỷ lệ quay lại 72%', icon: UsersRound, tone: 'emerald' },
              { label: 'Hiệu suất nhân sự', value: selectedBranch === 'ALL' ? '15/18' : selectedBranch === 'Q1' ? '7/8' : '8/10', detail: 'Công suất trung bình 86%', subdetail: '2 nhân viên nghỉ phép', icon: UserRound, tone: 'amber' }
            ].map(({ label, value, detail, subdetail, icon: Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'violet' ? 'bg-violet-50 text-violet-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><Icon className="h-5 w-5" /></span></div>
                <p className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" />{detail}</p>
                <p className="mt-1.5 text-[8px] font-medium text-slate-400">{subdetail}</p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><BarChart3 className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-900">Xu hướng doanh thu</h2><p className="mt-1 text-[9px] text-slate-500">Doanh thu thực nhận · {branchName}</p></div></div></div>
                <div className="text-left sm:text-right"><p className="text-xl font-black text-slate-950">{formatMillion(revenue)}</p><p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-600 sm:justify-end"><ArrowUpRight className="h-3.5 w-3.5" />18,6% {currentRange.comparison}</p></div>
              </div>
              <div className="mt-6 grid h-56 grid-cols-[32px_1fr] gap-3">
                <div className="flex flex-col justify-between pb-7 text-right text-[8px] font-medium text-slate-400"><span>{formatMillion(chartMax)}</span><span>{formatMillion(chartMax * 0.66)}</span><span>{formatMillion(chartMax * 0.33)}</span><span>0</span></div>
                <div className="relative flex items-end justify-between gap-2 border-b border-slate-200 bg-[linear-gradient(to_bottom,transparent_24%,#f1f5f9_25%,transparent_26%,transparent_49%,#f1f5f9_50%,transparent_51%,transparent_74%,#f1f5f9_75%,transparent_76%)] px-2 pb-7">
                  {currentRange.chartValues.map((value, index) => {
                    const scaledValue = value * branchFactor;
                    return <div key={`${currentRange.chartLabels[index]}-${value}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center"><div className="relative w-full max-w-12 rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400 shadow-[0_6px_14px_rgba(124,58,237,0.18)] transition-all group-hover:from-violet-700 group-hover:to-violet-500" style={{ height: `${Math.max(9, (scaledValue / chartMax) * 100)}%` }}><span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[8px] font-bold text-white shadow-lg group-hover:block">{formatMillion(scaledValue)}</span></div><span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold text-slate-400">{currentRange.chartLabels[index]}</span></div>;
                  })}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Cơ cấu doanh thu</h2><p className="mt-1 text-[9px] text-slate-500">Theo phương thức thanh toán</p></div><CircleDollarSign className="h-5 w-5 text-violet-500" /></div>
              <div className="mt-5 flex items-center gap-5"><div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#7c3aed 0 46%, #2563eb 46% 74%, #10b981 74% 91%, #f59e0b 91% 100%)' }}><div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-white"><span className="text-[8px] font-semibold text-slate-400">Tổng thu</span><span className="mt-1 text-[11px] font-black text-slate-900">100%</span></div></div><div className="min-w-0 flex-1 space-y-3">{[
                { label: 'Chuyển khoản', percent: 46, value: revenue * 0.46, color: 'bg-violet-600' },
                { label: 'Ví điện tử', percent: 28, value: revenue * 0.28, color: 'bg-blue-600' },
                { label: 'Tiền mặt', percent: 17, value: revenue * 0.17, color: 'bg-emerald-500' },
                { label: 'Thẻ', percent: 9, value: revenue * 0.09, color: 'bg-amber-500' }
              ].map((item) => <div key={item.label} className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} /><span className="min-w-0 flex-1 truncate text-[8px] font-semibold text-slate-500">{item.label}</span><span className="text-[8px] font-black text-slate-700">{item.percent}%</span></div>)}</div></div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4"><div><p className="text-[8px] text-slate-400">Giá trị đơn TB</p><p className="mt-1 text-[11px] font-black text-slate-800">682.000đ</p></div><div><p className="text-[8px] text-slate-400">Hoàn tiền</p><p className="mt-1 text-[11px] font-black text-slate-800">0,8%</p></div></div>
            </article>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.8fr]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">Lịch hẹn sắp tới</h2><p className="mt-1 text-[9px] text-slate-500">Theo dõi luồng phục vụ tại {branchName.toLocaleLowerCase('vi')}</p></div><span className="rounded-lg bg-violet-50 px-3 py-1.5 text-[9px] font-bold text-violet-700">{filteredAppointments.length} kết quả</span></div>
              <div className="divide-y divide-slate-100">
                {filteredAppointments.length ? filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[58px_1fr_auto] sm:items-center">
                    <div><p className="text-[12px] font-black text-slate-900">{appointment.time}</p><p className="mt-1 flex items-center gap-1 text-[8px] text-slate-400"><Clock3 className="h-3 w-3" />{appointment.duration}</p></div>
                    <div className="min-w-0"><p className="truncate text-[11px] font-black text-slate-800">{appointment.customer}</p><p className="mt-1 truncate text-[9px] text-slate-500">{appointment.service} · {appointment.stylist}</p></div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusClasses[appointment.tone]}`}>{appointment.status}</span>
                  </div>
                )) : <div className="px-5 py-12 text-center"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-[11px] font-bold text-slate-600">Không tìm thấy lịch hẹn phù hợp</p><button type="button" onClick={() => setSearchQuery('')} className="mt-2 border-0 bg-transparent px-2 text-[9px] font-bold text-violet-600 shadow-none">Xóa từ khóa</button></div>}
              </div>
            </article>

            <div className="space-y-5">
              <article className="rounded-2xl bg-gradient-to-br from-[#1a1630] to-[#252044] p-5 text-white shadow-xl shadow-violet-950/10">
                <div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-300">Mục tiêu tháng 7</p><p className="mt-2 text-2xl font-black">186,4 triệu</p></div><WalletCards className="h-5 w-5 text-violet-300" /></div>
                <div className="mt-5 flex items-center justify-between text-[9px] text-slate-300"><span>Đã đạt 74,5%</span><span>250 triệu</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[74.5%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" /></div>
                <p className="mt-4 text-[9px] leading-4 text-slate-400">Cần thêm 63,6 triệu trong 15 ngày để hoàn thành mục tiêu.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xs font-black text-slate-900">Tình trạng vận hành</h2><p className="mt-1 text-[9px] text-slate-500">Cập nhật theo thời gian thực</p></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.1)]" /></div>{['Lịch hẹn trực tuyến', 'Thanh toán tại quầy', 'SMS nhắc lịch', 'Đồng bộ dữ liệu'].map((item) => <div key={item} className="flex items-center justify-between border-t border-slate-100 py-2.5"><span className="text-[9px] font-semibold text-slate-600">{item}</span><span className="flex items-center gap-1 text-[8px] font-bold text-emerald-600"><Check className="h-3 w-3" />Ổn định</span></div>)}</article>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="mb-5 flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600"><Scissors className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-900">Hiệu suất dịch vụ</h2><p className="mt-1 text-[9px] text-slate-500">Top dịch vụ theo doanh thu tháng</p></div></div><button type="button" className="flex h-8 items-center gap-1 border-0 bg-transparent px-2 text-[9px] font-bold text-violet-600 shadow-none">Xem chi tiết<ArrowRight className="h-3.5 w-3.5" /></button></div>
              <div className="space-y-4">{topServices.map((service, index) => <div key={service.name}><div className="mb-2 flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-black text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-[10px] font-black text-slate-800">{service.name}</p><p className="shrink-0 text-[10px] font-black text-slate-900">{service.revenue}</p></div><div className="mt-1 flex items-center justify-between text-[8px] text-slate-400"><span>{service.bookings} lượt đặt</span><span className="font-bold text-emerald-600">{service.growth}</span></div></div></div><div className="ml-10 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${service.color}`} style={{ width: service.width }} /></div></div>)}</div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4"><div><p className="text-[8px] text-slate-400">Tỷ lệ bán thêm</p><p className="mt-1 text-xs font-black text-slate-800">24,8%</p></div><div><p className="text-[8px] text-slate-400">Thời gian TB</p><p className="mt-1 text-xs font-black text-slate-800">82 phút</p></div><div><p className="text-[8px] text-slate-400">Lấp đầy lịch</p><p className="mt-1 text-xs font-black text-slate-800">86%</p></div></div>
            </article>

            <article id="staff-performance" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UsersRound className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-900">Hiệu suất nhân viên</h2><p className="mt-1 text-[9px] text-slate-500">Doanh thu, đánh giá và công suất</p></div></div><span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[8px] font-bold text-blue-700">8 đang làm việc</span></div>
              <div className="divide-y divide-slate-100">{staffPerformance.map((staff) => <div key={staff.name} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[1.3fr_0.7fr_0.55fr] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[9px] font-black ${staff.tone}`}>{staff.initials}</span><div className="min-w-0"><p className="truncate text-[10px] font-black text-slate-800">{staff.name}</p><p className="mt-1 text-[8px] text-slate-400">{staff.role} · {staff.bookings} lịch</p></div></div><div><p className="text-[8px] text-slate-400">Doanh thu</p><p className="mt-1 text-[10px] font-black text-slate-800">{staff.revenue}</p></div><div className="flex items-center justify-between gap-3 sm:block"><span className="flex items-center gap-1 text-[9px] font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400" />{staff.rating}</span><div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${staff.utilization}%` }} /></div></div></div>)}</div>
            </article>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Khách hàng & thành viên</h2><p className="mt-1 text-[9px] text-slate-500">Chất lượng tệp khách hàng</p></div><Gift className="h-5 w-5 text-violet-500" /></div>
              <div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-[8px] text-slate-400">Tổng khách</p><p className="mt-1 text-lg font-black text-slate-900">1.284</p></div><div><p className="text-[8px] text-slate-400">Quay lại</p><p className="mt-1 text-lg font-black text-emerald-600">72%</p></div><div><p className="text-[8px] text-slate-400">CSAT</p><p className="mt-1 flex items-center gap-1 text-lg font-black text-amber-600"><Star className="h-4 w-4 fill-amber-400" />4.8</p></div></div>
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">{[
                { label: 'VIP', count: 86, percent: 18, color: 'bg-violet-500' },
                { label: 'Thân thiết', count: 312, percent: 42, color: 'bg-blue-500' },
                { label: 'Tiêu chuẩn', count: 886, percent: 68, color: 'bg-slate-400' }
              ].map((segment) => <div key={segment.label}><div className="mb-1.5 flex justify-between text-[8px]"><span className="font-bold text-slate-600">{segment.label}</span><span className="text-slate-400">{segment.count} khách</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${segment.color}`} style={{ width: `${segment.percent}%` }} /></div></div>)}</div>
              <div className="mt-5 rounded-xl bg-violet-50 p-3"><p className="text-[9px] font-black text-violet-800">Cơ hội chăm sóc lại</p><p className="mt-1 text-[8px] leading-4 text-violet-600">38 khách chưa quay lại trong 45 ngày. Gửi ưu đãi có thể tăng 8–12 lịch hẹn.</p></div>
            </article>

            <article data-inventory-card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Tồn kho cần chú ý</h2><p className="mt-1 text-[9px] text-slate-500">3 mặt hàng dưới định mức</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle className="h-4 w-4" /></span></div>
              <div className="mt-4 divide-y divide-slate-100">{[
                { name: 'Màu nhuộm L’Oréal 6.1', stock: '3/12', detail: 'Đủ dùng khoảng 2 ngày', level: 25, tone: 'bg-rose-500' },
                { name: 'Olaplex No.3 100ml', stock: '5/15', detail: 'Đủ dùng khoảng 4 ngày', level: 34, tone: 'bg-amber-500' },
                { name: 'Dầu gội Kerastase', stock: '7/18', detail: 'Đủ dùng khoảng 6 ngày', level: 39, tone: 'bg-amber-400' }
              ].map((item) => <div key={item.name} className="py-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[9px] font-black text-slate-700">{item.name}</p><p className="mt-1 text-[8px] text-slate-400">{item.detail}</p></div><span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-700">{item.stock}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.level}%` }} /></div></div>)}</div>
              <button type="button" className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-amber-200 bg-amber-50 text-[9px] font-black text-amber-700 shadow-none"><Boxes className="h-4 w-4" />Tạo đề xuất nhập hàng</button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:col-span-2 xl:col-span-1">
              <div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Hoạt động gần đây</h2><p className="mt-1 text-[9px] text-slate-500">Luồng vận hành mới nhất</p></div><Clock3 className="h-5 w-5 text-slate-400" /></div>
              <div className="mt-4 space-y-1">{recentActivities.map(({ title, detail, time, icon: Icon, tone }) => <div key={title} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black text-slate-700">{title}</p><p className="mt-1 truncate text-[8px] text-slate-400">{detail}</p></div><span className="shrink-0 text-[7px] font-medium text-slate-400">{time}</span></div>)}</div>
              <button type="button" className="mt-3 flex h-9 w-full items-center justify-center gap-1 border-0 bg-slate-50 text-[9px] font-bold text-slate-600 shadow-none">Xem toàn bộ hoạt động<ArrowRight className="h-3.5 w-3.5" /></button>
            </article>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><h2 className="text-sm font-black text-slate-900">Truy cập nhanh</h2><p className="mt-1 text-[9px] text-slate-500">Các tác vụ thường dùng trong ca vận hành</p></div>
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-5">{[
              { label: 'Tạo lịch hẹn', detail: 'Thêm lịch cho khách', icon: CalendarCheck2, action: () => setShowCreateAppointment(true), tone: 'bg-violet-50 text-violet-600' },
              { label: 'Thêm khách hàng', detail: 'Tạo hồ sơ mới', icon: UserPlus, action: () => document.querySelector<HTMLInputElement>('header input')?.focus(), tone: 'bg-blue-50 text-blue-600' },
              { label: 'Xem lịch làm việc', detail: 'Phân ca nhân viên', icon: CalendarRange, action: () => document.getElementById('staff-performance')?.scrollIntoView({ behavior: 'smooth' }), tone: 'bg-emerald-50 text-emerald-600' },
              { label: 'Kiểm tra tồn kho', detail: 'Theo dõi định mức', icon: Boxes, action: () => document.querySelector<HTMLElement>('[data-inventory-card]')?.scrollIntoView({ behavior: 'smooth' }), tone: 'bg-amber-50 text-amber-600' },
              { label: 'Mục tiêu doanh thu', detail: 'Theo dõi tiến độ', icon: Target, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }), tone: 'bg-fuchsia-50 text-fuchsia-600' }
            ].map(({ label, detail, icon: Icon, action, tone }) => <button key={label} type="button" onClick={action} className="flex h-auto min-h-24 items-center gap-3 rounded-none border-0 bg-white px-5 py-4 text-left shadow-none hover:bg-slate-50"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span><span className="min-w-0"><span className="block text-[10px] font-black text-slate-800">{label}</span><span className="mt-1 block text-[8px] text-slate-400">{detail}</span></span><ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>)}</div>
          </section>
        </main>
      </div>

      {showCreateAppointment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-base font-black text-slate-900">Tạo lịch hẹn nhanh</h2><p className="mt-1 text-[9px] text-slate-500">Thêm lịch mới cho chi nhánh Quận 3</p></div><button type="button" onClick={() => setShowCreateAppointment(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div>
            <div className="space-y-4 p-6">{['Tên khách hàng', 'Số điện thoại', 'Dịch vụ'].map((label) => <label key={label} className="block"><span className="mb-2 block text-[10px] font-bold text-slate-700">{label}</span><input className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder={`Nhập ${label.toLowerCase()}`} /></label>)}<div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-[10px] font-bold text-slate-700">Ngày</span><input type="date" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none" /></label><label><span className="mb-2 block text-[10px] font-bold text-slate-700">Giờ</span><input type="time" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none" /></label></div></div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setShowCreateAppointment(false)} className="border border-slate-200 bg-white px-4 text-[10px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="button" onClick={() => setShowCreateAppointment(false)} className="border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200">Lưu lịch hẹn</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
