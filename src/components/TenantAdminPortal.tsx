import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';

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

export default function TenantAdminPortal({ account, onLogout }: TenantAdminPortalProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((appointment) =>
      `${appointment.customer} ${appointment.service} ${appointment.stylist}`.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
          <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Chi nhánh Quận 3 đang hoạt động</div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Chào buổi chiều, anh Nam</h1><p className="mt-2 text-[11px] text-slate-500">Thứ Năm, 16 tháng 07 · Tổng quan vận hành hôm nay</p></div>
            <button type="button" onClick={() => setShowCreateAppointment(true)} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[11px] font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Doanh thu hôm nay', value: '12,84 triệu', detail: '+18,6% so với hôm qua', icon: CircleDollarSign, tone: 'violet' },
              { label: 'Lịch hẹn', value: '28', detail: '5 lịch đang chờ', icon: CalendarCheck2, tone: 'blue' },
              { label: 'Khách hàng mới', value: '9', detail: 'Tỷ lệ quay lại 72%', icon: UsersRound, tone: 'emerald' },
              { label: 'Nhân sự hôm nay', value: '8/10', detail: '2 nhân viên nghỉ phép', icon: UserRound, tone: 'amber' }
            ].map(({ label, value, detail, icon: Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'violet' ? 'bg-violet-50 text-violet-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><Icon className="h-5 w-5" /></span></div>
                <p className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">{tone === 'violet' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.8fr]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">Lịch hẹn sắp tới</h2><p className="mt-1 text-[9px] text-slate-500">Theo dõi luồng phục vụ tại chi nhánh Quận 3</p></div><span className="rounded-lg bg-violet-50 px-3 py-1.5 text-[9px] font-bold text-violet-700">{filteredAppointments.length} kết quả</span></div>
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
