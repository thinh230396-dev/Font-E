import { FormEvent, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  LockKeyhole,
  Gift,
  Globe2,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import type { Invoice, SubscriptionPackage, Tenant } from '../types';
import {
  formatSubscriptionLimit,
  getTenantLockedSubscriptionPrice,
  getYearlyPackagePrice,
  normalizeSubscriptionPackage,
  SUBSCRIPTION_CAPABILITY_CATALOG
} from '../utils/subscriptions';
import {
  findTenantUpgradePackage, formatTenantQuota, getEnabledTenantCapabilities, getTenantCapabilityLabel,
  getTenantPageAccess, getTenantPageCapabilityKey, getTenantUsagePercent,
  isTenantPackageUpgradeCandidate, isUnlimitedTenantLimit, type TenantPageAccess
} from '../utils/tenantAdminEntitlements';
import type { DemoAccount } from '../auth/demoAccounts';
import BeautifulSelect from './BeautifulSelect';
import { nailModuleConfigs, type NailModuleConfig, type NailPageId, type NailRow, type UiTone } from './nailAdminData';

interface NailTenantAdminPortalProps {
  account: DemoAccount;
  onLogout: () => void;
  tenant?: Tenant;
  subscriptionPackage?: SubscriptionPackage;
  availablePackages: SubscriptionPackage[];
  invoices: Invoice[];
}

interface NavItem {
  id: NailPageId;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Vận hành',
    items: [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'branches', label: 'Chi nhánh', icon: Store },
      { id: 'appointments', label: 'Lịch hẹn', icon: CalendarDays, badge: '32' },
      { id: 'stations', label: 'Ghế & khu vực', icon: Armchair, badge: '7/14' },
      { id: 'pos', label: 'POS & thanh toán', icon: CreditCard, badge: '5' }
    ]
  },
  {
    label: 'Khách hàng',
    items: [
      { id: 'customers', label: 'Hồ sơ khách hàng', icon: UsersRound },
      { id: 'loyalty', label: 'Thành viên & ưu đãi', icon: Gift },
      { id: 'care', label: 'Chăm sóc khách', icon: Megaphone, badge: '38' }
    ]
  },
  {
    label: 'Danh mục',
    items: [
      { id: 'staff', label: 'Nhân sự', icon: UserRound },
      { id: 'services', label: 'Dịch vụ & giá', icon: Sparkles },
      { id: 'inventory', label: 'Kho vật tư', icon: Boxes, badge: '18' },
      { id: 'gallery', label: 'Màu & mẫu Nail', icon: Image }
    ]
  },
  {
    label: 'Quản trị',
    items: [
      { id: 'online', label: 'Đặt lịch online', icon: Globe2 },
      { id: 'finance', label: 'Thu chi', icon: WalletCards },
      { id: 'sanitation', label: 'Vệ sinh & an toàn', icon: ShieldCheck, badge: '4' },
      { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
      { id: 'subscription', label: 'Gói đăng ký', icon: BadgePercent },
      { id: 'settings', label: 'Cài đặt tiệm', icon: Settings }
    ]
  }
];
const FALLBACK_SUBSCRIPTION_PACKAGE = normalizeSubscriptionPackage({
  id: 'PKG-DEMO-PREMIUM',
  name: 'Premium',
  description: 'Gói vận hành chuyên nghiệp cho salon nhiều chi nhánh.',
  price: 99,
  currency: 'USD',
  billingCycle: 'monthly',
  activeTenants: 1,
  features: [],
  maxStaff: 999,
  maxSalons: 3,
  color: '#7c3aed'
});

const formatPlanMoney = (value: number, currency = 'VND') => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency,
  maximumFractionDigits: currency === 'VND' ? 0 : 2
}).format(value);

const formatPlanDate = (value?: string) => {
  if (!value) return 'Chưa thiết lập';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const toneClasses: Record<UiTone, { icon: string; badge: string; dot: string; bar: string }> = {
  violet: { icon: 'bg-violet-50 text-violet-600', badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  blue: { icon: 'bg-blue-50 text-blue-600', badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  rose: { icon: 'bg-rose-50 text-rose-600', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', dot: 'bg-cyan-500', bar: 'bg-cyan-500' },
  slate: { icon: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', bar: 'bg-slate-400' }
};

const statIcons: LucideIcon[] = [CalendarCheck2, CircleDollarSign, TrendingUp, PackageCheck];

const overviewAppointments = [
  { time: '09:00', customer: 'Nguyễn Minh Anh', service: 'Gel Manicure + French Chrome', tech: 'Thảo Nguyễn', station: 'M-03', amount: '920.000đ', status: 'Đang phục vụ', tone: 'violet' as UiTone },
  { time: '10:00', customer: 'Trần Thu Hà', service: 'Pedicure Spa + Sơn gel', tech: 'Minh Châu', station: 'P-02', amount: '780.000đ', status: 'Đã xác nhận', tone: 'blue' as UiTone },
  { time: '11:30', customer: 'Lê Ngọc Mai', service: 'Đắp gel + Ombre', tech: 'Hà My', station: 'M-05', amount: '1.250.000đ', status: 'Chờ xác nhận', tone: 'amber' as UiTone },
  { time: '13:30', customer: 'Phạm Gia Hân', service: 'Tháo gel + Manicure', tech: 'Thuỳ Dương', station: 'M-01', amount: '480.000đ', status: 'Đã xác nhận', tone: 'blue' as UiTone },
  { time: '15:00', customer: 'Vũ Khánh Linh', service: 'Acrylic Full Set + Đính đá', tech: 'Thảo Nguyễn', station: 'M-04', amount: '1.680.000đ', status: 'Đã xác nhận', tone: 'blue' as UiTone }
];

const overviewStations = [
  { code: 'M-01', label: 'Manicure', tech: 'Thuỳ Dương', until: '14:30', status: 'Đang dùng', tone: 'violet' as UiTone },
  { code: 'M-03', label: 'Manicure', tech: 'Thảo Nguyễn', until: '10:30', status: 'Đang dùng', tone: 'violet' as UiTone },
  { code: 'P-02', label: 'Pedicure', tech: 'Minh Châu', until: '11:20', status: 'Đang dùng', tone: 'violet' as UiTone },
  { code: 'M-06', label: 'Manicure', tech: 'Chưa phân', until: '15:30', status: 'Sẵn sàng', tone: 'emerald' as UiTone },
  { code: 'P-04', label: 'Pedicure', tech: 'Bảo trì', until: '17/07', status: 'Tạm ngưng', tone: 'amber' as UiTone },
  { code: 'VIP-02', label: 'Phòng VIP', tech: 'Chưa phân', until: '16:00', status: 'Sẵn sàng', tone: 'emerald' as UiTone }
];

const formatModuleLabel = (id: NailPageId) => navGroups.flatMap((group) => group.items).find((item) => item.id === id)?.label || 'Tổng quan';

function StatCard({ stat, index }: { stat: NailModuleConfig['stats'][number]; index: number }) {
  const Icon = statIcons[index % statIcons.length];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[9px] font-bold text-slate-500">{stat.label}</p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{stat.value}</p></div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[stat.tone].icon}`}><Icon className="h-4.5 w-4.5" /></span>
      </div>
      <p className="mt-2 text-[8px] font-semibold text-slate-400">{stat.detail}</p>
    </article>
  );
}

interface OverviewPageProps {
  branch: string;
  ownerName: string;
  tenantName: string;
  planName: string;
  branchCount: number;
  branchLimit: number;
  staffCount: number;
  staffLimit: number;
  onNavigate: (page: NailPageId) => void;
  onQuickCreate: (page: Exclude<NailPageId, 'overview' | 'subscription'>) => void;
}
function OverviewPage({ branch, ownerName, tenantName, planName, branchCount, branchLimit, staffCount, staffLimit, onNavigate, onQuickCreate }: OverviewPageProps) {
  const branchName = branch === 'ALL' ? 'Tất cả chi nhánh' : branch === 'Q1' ? 'Chi nhánh Quận 1' : branch === 'Q3' ? 'Chi nhánh Quận 3' : `Chi nhánh ${branch}`;
  const ownerShortName = ownerName.trim().split(/\s+/).pop() || ownerName;
  const branchQuota = formatTenantQuota(branchCount, branchLimit, 'branches');
  const staffQuota = formatTenantQuota(staffCount, staffLimit, 'staff');
  const branchAtLimit = !isUnlimitedTenantLimit(branchLimit, 'branches') && branchCount >= branchLimit;
  const staffAtLimit = !isUnlimitedTenantLimit(staffLimit, 'staff') && staffCount >= staffLimit;
  const overviewStats: NailModuleConfig['stats'] = [
    { label: 'Doanh thu hôm nay', value: branch === 'ALL' ? '31,8 triệu' : '18,6 triệu', detail: '+16,8% so với thứ Năm trước', tone: 'emerald' },
    { label: 'Lịch hẹn hôm nay', value: branch === 'ALL' ? '54' : '32', detail: '28 xác nhận · 4 chờ xử lý', tone: 'blue' },
    { label: 'Công suất ghế', value: '86%', detail: '7 đang dùng · 5 sẵn sàng', tone: 'violet' },
    { label: 'Khách hàng mới', value: '6', detail: 'Tỷ lệ quay lại trong ngày 74%', tone: 'amber' }
  ];

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />{branchName} đang hoạt động ổn định</div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Chào buổi chiều, anh {ownerShortName}</h1>
          <p className="mt-2 text-[11px] text-slate-500">Thứ Năm, 16 tháng 07 · Tổng quan vận hành {tenantName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onNavigate('reports')} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất báo cáo</button>
          <button type="button" onClick={() => onQuickCreate('appointments')} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200"><Plus className="h-4 w-4" />Tạo lịch hẹn</button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><BadgePercent className="h-5 w-5" /></span>
          <div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black text-slate-900">Quyền đang áp dụng theo gói {planName}</p><span className="rounded-full bg-emerald-100 px-2 py-1 text-[7px] font-black text-emerald-700">Đang hoạt động</span></div><p className="mt-1 text-[8px] leading-5 text-slate-500">Mọi chức năng, giới hạn và thao tác tạo mới được kiểm soát theo gói đăng ký hiện tại.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className={`rounded-xl border px-3 py-2 text-[8px] font-black ${branchAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>Chi nhánh {branchQuota}</span>
          <span className={`rounded-xl border px-3 py-2 text-[8px] font-black ${staffAtLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>Nhân sự {staffQuota}</span>
          <button type="button" onClick={() => onNavigate('subscription')} className="flex h-9 items-center gap-1.5 border border-violet-200 bg-white px-3 text-[8px] font-black text-violet-700 shadow-sm">Xem quyền gói<ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{overviewStats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.8fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="text-sm font-black text-slate-900">Lịch hẹn đang diễn ra</h2><p className="mt-1 text-[9px] text-slate-500">Luồng phục vụ tại {branchName.toLocaleLowerCase('vi')}</p></div><button type="button" onClick={() => onNavigate('appointments')} className="flex h-8 items-center gap-1 border-0 bg-transparent px-2 text-[8px] font-black text-violet-600 shadow-none">Xem lịch đầy đủ<ArrowRight className="h-3.5 w-3.5" /></button></div>
          <div className="divide-y divide-slate-100">{overviewAppointments.map((appointment) => <button key={`${appointment.time}-${appointment.customer}`} type="button" onClick={() => onNavigate('appointments')} className="grid h-auto w-full gap-3 rounded-none border-0 bg-white px-5 py-3.5 text-left shadow-none hover:bg-slate-50 sm:grid-cols-[54px_1.2fr_1fr_55px_90px] sm:items-center sm:px-6"><div><p className="text-[11px] font-black text-slate-900">{appointment.time}</p><p className="mt-1 text-[7px] text-slate-400">{appointment.station}</p></div><div className="min-w-0"><p className="truncate text-[10px] font-black text-slate-800">{appointment.customer}</p><p className="mt-1 truncate text-[8px] text-slate-400">{appointment.service}</p></div><div><p className="text-[8px] text-slate-400">Kỹ thuật viên</p><p className="mt-1 text-[9px] font-bold text-slate-700">{appointment.tech}</p></div><p className="text-[9px] font-black text-slate-800">{appointment.amount}</p><span className={`w-fit rounded-full px-2.5 py-1 text-[7px] font-bold ring-1 ${toneClasses[appointment.tone].badge}`}>{appointment.status}</span></button>)}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-black text-slate-900">Tình trạng ghế</h2><p className="mt-1 text-[9px] text-slate-500">Cập nhật theo thời gian thực</p></div><Armchair className="h-5 w-5 text-violet-500" /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">{overviewStations.map((station) => <button key={station.code} type="button" onClick={() => onNavigate('stations')} className="h-auto min-h-24 border border-slate-100 bg-slate-50 p-3 text-left shadow-none hover:border-violet-200"><div className="flex items-center justify-between"><span className="text-[9px] font-black text-slate-800">{station.code}</span><span className={`h-2 w-2 rounded-full ${toneClasses[station.tone].dot}`} /></div><p className="mt-1 text-[7px] text-slate-400">{station.label}</p><p className="mt-2 truncate text-[8px] font-bold text-slate-600">{station.tech}</p><p className="mt-1 text-[7px] text-slate-400">Đến {station.until}</p></button>)}</div>
          <button type="button" onClick={() => onNavigate('stations')} className="mt-4 flex h-9 w-full items-center justify-center gap-1 border-0 bg-violet-50 text-[8px] font-black text-violet-700 shadow-none">Mở sơ đồ khu vực<ArrowRight className="h-3.5 w-3.5" /></button>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Doanh thu theo dịch vụ</h2><p className="mt-1 text-[8px] text-slate-400">Tháng 07/2026</p></div><BarChart3 className="h-4.5 w-4.5 text-violet-500" /></div>
          <div className="mt-4 space-y-3">{[
            { label: 'Gel Manicure', value: '48,2tr', percent: 92, tone: 'bg-violet-500' },
            { label: 'Nail Art', value: '36,8tr', percent: 76, tone: 'bg-fuchsia-500' },
            { label: 'Pedicure Spa', value: '31,4tr', percent: 65, tone: 'bg-blue-500' },
            { label: 'Acrylic & Gel X', value: '28,6tr', percent: 59, tone: 'bg-emerald-500' }
          ].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-[8px]"><span className="font-bold text-slate-600">{item.label}</span><span className="font-black text-slate-800">{item.value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} /></div></div>)}</div>
          <button type="button" onClick={() => onNavigate('services')} className="mt-4 flex h-8 items-center gap-1 border-0 bg-transparent px-0 text-[8px] font-black text-violet-600 shadow-none">Phân tích dịch vụ<ArrowRight className="h-3.5 w-3.5" /></button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Hiệu suất kỹ thuật viên</h2><p className="mt-1 text-[8px] text-slate-400">Xếp theo doanh thu tháng</p></div><UsersRound className="h-4.5 w-4.5 text-blue-500" /></div>
          <div className="mt-3 space-y-1">{[
            { name: 'Thảo Nguyễn', initials: 'TN', role: 'Senior Nail Artist', revenue: '42,8tr', rating: '4.9', tone: 'bg-violet-100 text-violet-700' },
            { name: 'Hà My', initials: 'HM', role: 'Senior Nail Artist', revenue: '39,4tr', rating: '4.9', tone: 'bg-fuchsia-100 text-fuchsia-700' },
            { name: 'Minh Châu', initials: 'MC', role: 'Nail Technician', revenue: '36,5tr', rating: '4.8', tone: 'bg-blue-100 text-blue-700' },
            { name: 'Thuỳ Dương', initials: 'TD', role: 'Junior Technician', revenue: '18,2tr', rating: '4.7', tone: 'bg-emerald-100 text-emerald-700' }
          ].map((member) => <button key={member.name} type="button" onClick={() => onNavigate('staff')} className="flex h-auto w-full items-center gap-3 border-0 bg-transparent px-0 py-2 text-left shadow-none"><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[7px] font-black ${member.tone}`}>{member.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-[8px] font-black text-slate-700">{member.name}</span><span className="mt-1 block text-[7px] text-slate-400">{member.role}</span></span><span className="text-right"><span className="block text-[8px] font-black text-slate-800">{member.revenue}</span><span className="mt-1 flex items-center justify-end gap-1 text-[7px] text-amber-600"><Star className="h-2.5 w-2.5 fill-amber-400" />{member.rating}</span></span></button>)}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Kho cần chú ý</h2><p className="mt-1 text-[8px] text-slate-400">18 mặt hàng dưới định mức</p></div><AlertTriangle className="h-4.5 w-4.5 text-amber-500" /></div>
          <div className="mt-3 divide-y divide-slate-100">{[
            { name: 'DND Gel 751 – Merlot', stock: '3/12', days: 'Đủ khoảng 6 ngày', tone: 'bg-rose-500', width: 25 },
            { name: 'OPI Bubble Bath', stock: '5/15', days: 'Đủ khoảng 9 ngày', tone: 'bg-amber-500', width: 33 },
            { name: 'Acetone tinh khiết 5L', stock: '2/4', days: 'Đủ khoảng 14 ngày', tone: 'bg-amber-400', width: 50 }
          ].map((item) => <button key={item.name} type="button" onClick={() => onNavigate('inventory')} className="block h-auto w-full rounded-none border-0 bg-transparent px-0 py-3 text-left shadow-none"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[8px] font-black text-slate-700">{item.name}</p><p className="mt-1 text-[7px] text-slate-400">{item.days}</p></div><span className="rounded-md bg-amber-50 px-2 py-1 text-[7px] font-black text-amber-700">{item.stock}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} /></div></button>)}</div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-black text-slate-900">Truy cập nhanh</h2><p className="mt-1 text-[8px] text-slate-400">Các tác vụ thường dùng trong ca vận hành</p></div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">{[
            { label: 'Tạo lịch hẹn', detail: 'Khách, dịch vụ, ghế', icon: CalendarCheck2, page: 'appointments' as const },
            { label: 'Tạo hóa đơn', detail: 'Dịch vụ và sản phẩm', icon: CreditCard, page: 'pos' as const },
            { label: 'Thêm khách hàng', detail: 'Hồ sơ và sở thích', icon: UsersRound, page: 'customers' as const },
            { label: 'Nhập kho', detail: 'Vật tư và mã màu', icon: Boxes, page: 'inventory' as const },
            { label: 'Thêm mẫu Nail', detail: 'Bộ sưu tập mới', icon: Image, page: 'gallery' as const },
            { label: 'Ghi nhận vệ sinh', detail: 'Dụng cụ và ghế', icon: ShieldCheck, page: 'sanitation' as const }
          ].map(({ label, detail, icon: Icon, page }) => <button key={label} type="button" onClick={() => onQuickCreate(page)} className="flex h-auto min-h-20 items-center gap-3 rounded-none border-0 bg-white px-4 py-3 text-left shadow-none hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[8px] font-black text-slate-700">{label}</span><span className="mt-1 block text-[7px] text-slate-400">{detail}</span></span><ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>)}</div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Vệ sinh & an toàn</h2><p className="mt-1 text-[8px] text-slate-400">Checklist hôm nay đạt 94%</p></div><ShieldCheck className="h-4.5 w-4.5 text-emerald-500" /></div>
          <div className="mt-4 space-y-2">{[
            { label: 'Khử khuẩn dụng cụ ca sáng', done: true },
            { label: 'Vệ sinh bồn Pedicure', done: true },
            { label: 'Bổ sung khăn sạch khu VIP', done: false },
            { label: 'Đóng checklist mở ca', done: false }
          ].map((item) => <div key={item.label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{item.done ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}</span><span className="text-[8px] font-bold text-slate-600">{item.label}</span></div>)}</div>
          <button type="button" onClick={() => onNavigate('sanitation')} className="mt-4 flex h-9 w-full items-center justify-center gap-1 border-0 bg-emerald-50 text-[8px] font-black text-emerald-700 shadow-none">Mở checklist đầy đủ<ArrowRight className="h-3.5 w-3.5" /></button>
        </article>
      </section>
    </div>
  );
}

interface ModulePageProps {
  config: NailModuleConfig;
  rows: NailRow[];
  searchQuery: string;
  activeTab: string;
  onSearch: (value: string) => void;
  onTab: (value: string) => void;
  onSelectRow: (row: NailRow) => void;
  onCreate: () => void;
  onExport: () => void;
  scopeLabel: string;
  planName: string;
  accessMode: TenantPageAccess;
  branchCount: number;
  branchLimit: number;
  staffCount: number;
  staffLimit: number;
  onUpgrade: () => void;
}

function ModulePage({ config, rows, searchQuery, activeTab, onSearch, onTab, onSelectRow, onCreate, onExport, scopeLabel, planName, accessMode, branchCount, branchLimit, staffCount, staffLimit, onUpgrade }: ModulePageProps) {
  const availableTabs = accessMode === 'limited' && config.id === 'reports' ? config.tabs.slice(0, 2) : config.tabs;
  const effectiveActiveTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];
  const normalizedTab = effectiveActiveTab.toLocaleLowerCase('vi');
  const quotaDetail = (used: number, limit: number, kind: 'branches' | 'staff', noun: string) => {
    if (isUnlimitedTenantLimit(limit, kind)) return `Không giới hạn ${noun} trong gói ${planName}`;
    const remaining = Math.max(0, limit - used);
    return remaining === 0
      ? `Đã dùng hết hạn mức gói ${planName}`
      : `Còn ${remaining.toLocaleString('vi-VN')} ${noun} trong gói ${planName}`;
  };
  const planStats = config.id === 'branches'
    ? config.stats.map((stat, index) => index === 0
      ? { ...stat, value: formatTenantQuota(branchCount, branchLimit, 'branches'), detail: quotaDetail(branchCount, branchLimit, 'branches', 'chi nhánh') }
      : index === 1 ? { ...stat, value: String(rows.filter((row) => row.badge === 'Đang hoạt động').length) } : stat)
    : config.id === 'staff'
      ? config.stats.map((stat, index) => index === 0
        ? { ...stat, value: formatTenantQuota(staffCount, staffLimit, 'staff'), detail: quotaDetail(staffCount, staffLimit, 'staff', 'nhân sự') }
        : stat)
      : config.stats;
  const displayedStats = accessMode === 'limited' ? planStats.slice(0, 2) : planStats;
  const visibleRows = accessMode === 'limited' ? rows.slice(0, 1) : rows;
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    const statusTabs = ['chờ xác nhận', 'đã xác nhận', 'đang phục vụ', 'hoàn thành', 'đã hủy', 'đã thanh toán', 'chờ thanh toán', 'hoàn tiền', 'đặt cọc', 'đang trong ca', 'chưa vào ca', 'nghỉ phép', 'đang kinh doanh', 'đang ẩn', 'bản nháp', 'sắp hết'];
    return visibleRows.filter((row) => {
      const haystack = `${row.id} ${row.title} ${row.subtitle} ${row.cells.join(' ')} ${row.badge} ${row.details.map((item) => `${item.label} ${item.value}`).join(' ')}`.toLocaleLowerCase('vi');
      const matchesQuery = !query || haystack.includes(query);
      const matchesTab = effectiveActiveTab === availableTabs[0] || effectiveActiveTab === 'Tất cả' || effectiveActiveTab === 'Tổng quan' || (!statusTabs.includes(normalizedTab) ? haystack.includes(normalizedTab) || true : haystack.includes(normalizedTab));
      return matchesQuery && matchesTab;
    });
  }, [accessMode, effectiveActiveTab, normalizedTab, rows, searchQuery]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />{config.eyebrow}<span className="rounded-full bg-violet-50 px-2.5 py-1 text-[7px] font-black text-violet-700 ring-1 ring-violet-200">{scopeLabel}</span></div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">{config.title}</h1><p className="mt-2 max-w-2xl text-[11px] text-slate-500">{config.description}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onExport} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />{config.secondaryAction}</button>
          <button type="button" onClick={accessMode === 'limited' ? onUpgrade : onCreate} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200">{accessMode === 'limited' ? <LockKeyhole className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{accessMode === 'limited' ? 'Mở báo cáo nâng cao' : config.primaryAction}</button>
        </div>
      </section>
      {accessMode === 'limited' && <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><LockKeyhole className="h-5 w-5" /></span><div className="flex-1"><p className="text-[10px] font-black text-amber-900">Đang dùng chế độ báo cáo cơ bản của gói {planName}</p><p className="mt-1 text-[8px] leading-5 text-amber-700">Bạn vẫn xem được tổng quan và doanh thu ngày. Báo cáo tùy chỉnh, lịch gửi và phân tích chuyên sâu cần gói có quyền Báo cáo nâng cao.</p></div><button type="button" onClick={onUpgrade} className="h-9 border border-amber-300 bg-white px-3 text-[8px] font-black text-amber-800 shadow-sm">Xem gói phù hợp</button></section>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{displayedStats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{availableTabs.map((tab) => <button key={tab} type="button" onClick={() => onTab(tab)} className={`h-8 shrink-0 border-0 px-3 text-[8px] font-bold shadow-none ${effectiveActiveTab === tab ? 'bg-white text-violet-700 shadow-sm' : 'bg-transparent text-slate-500'}`}>{tab}</button>)}</div>
          <div className="relative min-w-0 lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder={`Tìm trong ${config.title.toLocaleLowerCase('vi')}...`} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[9px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearch('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div>
        </div>

        <div className="grid xl:grid-cols-[1fr_286px]">
          <div className="min-w-0 overflow-x-auto border-r border-slate-100">
            <table className="w-full min-w-[940px] border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[7px] font-black uppercase tracking-wide text-slate-400">{config.columns.map((column) => <th key={column} className="px-4 py-3 first:pl-5 last:pr-5">{column}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredRows.map((row) => <tr key={row.id} onClick={() => onSelectRow(row)} className="cursor-pointer text-[8px] text-slate-600 transition hover:bg-slate-50/80"><td className="px-5 py-3.5"><div><p className="text-[9px] font-black text-slate-800">{row.title}</p><p className="mt-1 max-w-56 truncate text-[7px] text-slate-400">{row.id} · {row.subtitle}</p></div></td>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className="max-w-56 px-4 py-3.5"><p className="line-clamp-2 font-semibold leading-4 text-slate-600">{cell}</p></td>)}<td className="px-4 py-3.5 last:pr-5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[7px] font-bold ring-1 ${toneClasses[row.badgeTone].badge}`}>{row.badge}</span></td></tr>)}</tbody>
            </table>
            {!filteredRows.length && <div className="px-6 py-14 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-[9px] font-black text-slate-600">Không tìm thấy dữ liệu phù hợp</p><button type="button" onClick={() => { onSearch(''); onTab(availableTabs[0]); }} className="mt-2 border-0 bg-transparent px-2 text-[8px] font-bold text-violet-600 shadow-none">Xóa tìm kiếm và bộ lọc</button></div>}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3"><p className="text-[7px] text-slate-400">Hiển thị <span className="font-black text-slate-600">{filteredRows.length}</span> bản ghi mẫu</p><p className="text-[7px] text-slate-400">Cập nhật lúc 14:32 · 16/07/2026</p></div>
          </div>

          <aside className="bg-slate-50/40 p-4">
            {accessMode === 'limited' ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-5 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm"><LockKeyhole className="h-5 w-5" /></span><p className="mt-4 text-[10px] font-black text-amber-900">Phân tích nâng cao đã khóa</p><p className="mt-2 text-[8px] leading-5 text-amber-700">Nâng cấp gói để mở insight thời gian thực, báo cáo tự động và checklist điều hành.</p><button type="button" onClick={onUpgrade} className="mt-4 h-9 border border-amber-300 bg-white px-3 text-[8px] font-black text-amber-800 shadow-sm">Yêu cầu nâng cấp</button></div>
            ) : (
              <>
            <div><h2 className="text-[10px] font-black text-slate-800">{config.insightTitle}</h2><p className="mt-1 text-[7px] text-slate-400">Dữ liệu tổng hợp theo thời gian thực</p></div>
            <div className="mt-4 space-y-3">{config.insights.map((insight, index) => <div key={insight.label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><span className="text-[8px] font-bold text-slate-500">{insight.label}</span><span className={`text-[10px] font-black ${insight.tone === 'emerald' ? 'text-emerald-600' : insight.tone === 'amber' ? 'text-amber-600' : insight.tone === 'blue' ? 'text-blue-600' : 'text-violet-600'}`}>{insight.value}</span></div><p className="mt-1.5 text-[7px] text-slate-400">{insight.detail}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${toneClasses[insight.tone].bar}`} style={{ width: `${Math.max(38, 86 - index * 17)}%` }} /></div></div>)}</div>
            <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-[9px] font-black text-slate-700">{config.checklistTitle}</h3><div className="mt-3 space-y-2">{config.checklist.map((item, index) => <div key={item} className="flex items-start gap-2 rounded-xl bg-white p-2.5 shadow-sm"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}>{index === 0 ? <Clock3 className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}</span><p className="text-[7px] font-semibold leading-4 text-slate-600">{item}</p></div>)}</div></div>
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

interface SubscriptionPageProps {
  tenantName: string;
  tenant?: Tenant;
  subscriptionPackage: SubscriptionPackage;
  availablePackages: SubscriptionPackage[];
  invoices: Invoice[];
  branchCount: number;
  staffCount: number;
  onNotify: (message: string) => void;
}

function SubscriptionPage({ tenantName, tenant, subscriptionPackage, availablePackages, invoices, branchCount, staffCount, onNotify }: SubscriptionPageProps) {
  const branchLimit = subscriptionPackage.maxSalons;
  const staffLimit = subscriptionPackage.maxStaff;
  const limits = subscriptionPackage.limits;
  const billingCycle = tenant?.billingCycle || subscriptionPackage.billingCycle || 'monthly';
  const pricing = tenant
    ? getTenantLockedSubscriptionPrice([subscriptionPackage], tenant, billingCycle)
    : {
        price: billingCycle === 'yearly' ? getYearlyPackagePrice(subscriptionPackage) : subscriptionPackage.price,
        currency: subscriptionPackage.currency || 'USD'
      };
  const enabledCapabilityKeys = getEnabledTenantCapabilities(subscriptionPackage, availablePackages);
  const lockedCapabilities = SUBSCRIPTION_CAPABILITY_CATALOG.filter((item) => !enabledCapabilityKeys.has(item.key));
  const upgradePackage = availablePackages
    .filter((item) => isTenantPackageUpgradeCandidate(subscriptionPackage, item))
    .sort((a, b) => a.price - b.price)[0];
  const renewalDate = tenant?.subscriptionRenewsAt || tenant?.trialEndDate;
  const statusLabel = tenant?.status === 'TRIAL' ? 'Đang dùng thử'
    : tenant?.status === 'EXPIRING' ? 'Sắp hết hạn'
      : tenant?.status === 'OVERDUE' ? 'Quá hạn thanh toán'
        : tenant?.status === 'SUSPENDED' ? 'Đã tạm ngưng'
          : 'Đang hoạt động';
  const statusTone = tenant?.status === 'SUSPENDED' || tenant?.status === 'OVERDUE'
    ? 'bg-rose-400/15 text-rose-300 ring-rose-300/20'
    : tenant?.status === 'EXPIRING'
      ? 'bg-amber-400/15 text-amber-300 ring-amber-300/20'
      : 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/20';
  const branchRemaining = isUnlimitedTenantLimit(branchLimit, 'branches') ? null : Math.max(0, branchLimit - branchCount);
  const staffRemaining = isUnlimitedTenantLimit(staffLimit, 'staff') ? null : Math.max(0, staffLimit - staffCount);
  const usageItems = [
    {
      label: 'Nhân sự đang hoạt động',
      value: formatTenantQuota(staffCount, staffLimit, 'staff'),
      percent: getTenantUsagePercent(staffCount, staffLimit, 'staff'),
      detail: staffRemaining === null ? 'Không giới hạn tài khoản nhân sự' : staffRemaining > 0 ? 'Còn ' + staffRemaining + ' tài khoản nhân sự' : 'Đã đạt hạn mức nhân sự',
      icon: UsersRound,
      tone: 'violet' as UiTone
    },
    {
      label: 'Chi nhánh',
      value: formatTenantQuota(branchCount, branchLimit, 'branches'),
      percent: getTenantUsagePercent(branchCount, branchLimit, 'branches'),
      detail: branchRemaining === null ? 'Không giới hạn chi nhánh' : branchRemaining > 0 ? 'Còn ' + branchRemaining + ' chi nhánh' : 'Đã đạt hạn mức chi nhánh',
      icon: Store,
      tone: 'blue' as UiTone
    },
    {
      label: 'Lịch hẹn mỗi tháng',
      value: formatSubscriptionLimit(limits?.appointmentsPerMonth, 'lịch'),
      percent: 0,
      detail: 'Hạn mức của gói · chưa có dữ liệu sử dụng',
      icon: CalendarCheck2,
      tone: 'emerald' as UiTone
    },
    {
      label: 'Tin nhắn chăm sóc',
      value: formatSubscriptionLimit(limits?.messagesPerMonth, 'tin'),
      percent: 0,
      detail: 'Hạn mức SMS/Email · chưa có dữ liệu sử dụng',
      icon: Megaphone,
      tone: 'amber' as UiTone
    },
    {
      label: 'Dung lượng lưu trữ',
      value: formatSubscriptionLimit(limits?.storageGb, 'GB'),
      percent: 0,
      detail: 'Ảnh mẫu và hồ sơ khách hàng',
      icon: Boxes,
      tone: 'cyan' as UiTone
    }
  ];
  const capabilityGroups = [
    { title: 'Vận hành & khách hàng', keys: ['appointments', 'online_booking', 'customers', 'loyalty'] },
    { title: 'Tự động hóa & dữ liệu', keys: ['automation', 'advanced_reports', 'inventory', 'api'] },
    { title: 'Quản trị doanh nghiệp', keys: ['custom_domain', 'sso', 'priority_support', 'account_manager'] }
  ];
  const invoiceStatusMeta: Record<Invoice['status'], { label: string; className: string }> = {
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    PENDING: { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
    OVERDUE: { label: 'Quá hạn', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đăng ký & thanh toán</div><h1 className="font-black tracking-[-0.035em] text-slate-950">Gói đăng ký</h1><p className="mt-2 max-w-2xl text-[11px] text-slate-500">Quyền truy cập, hạn mức và nghiệp vụ của {tenantName} được áp dụng trực tiếp từ gói này.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onNotify('Đã mở yêu cầu hỗ trợ gói đăng ký.')} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><ShieldCheck className="h-4 w-4" />Liên hệ hỗ trợ</button>{upgradePackage && <button type="button" onClick={() => onNotify('Đã gửi yêu cầu nâng cấp lên gói ' + upgradePackage.name + '.')} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[10px] font-black text-white shadow-lg shadow-violet-200"><TrendingUp className="h-4 w-4" />Nâng lên {upgradePackage.name}</button>}</div>
      </section>

      <section className="grid overflow-hidden rounded-3xl bg-gradient-to-br from-[#171328] via-[#21183c] to-[#34215a] text-white shadow-xl lg:grid-cols-[1.45fr_0.75fr]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-400/15 px-3 py-1 text-[8px] font-black uppercase tracking-wide text-violet-200 ring-1 ring-violet-300/25">Gói hiện tại</span><span className={'rounded-full px-3 py-1 text-[8px] font-bold ring-1 ' + statusTone}>{statusLabel}</span><span className="rounded-full bg-white/8 px-3 py-1 text-[8px] font-bold text-slate-300">{billingCycle === 'yearly' ? 'Thanh toán hằng năm' : 'Thanh toán hằng tháng'}</span></div>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-3xl font-black tracking-tight sm:text-4xl">{subscriptionPackage.name}</p><p className="mt-2 max-w-xl text-[10px] leading-5 text-slate-300">{subscriptionPackage.description}</p></div><div className="shrink-0 sm:text-right"><p className="text-2xl font-black">{formatPlanMoney(pricing.price, pricing.currency)}<span className="text-[9px] font-semibold text-slate-400"> / {billingCycle === 'yearly' ? 'năm' : 'tháng'}</span></p><p className="mt-1 text-[8px] text-slate-400">Giá đã khóa cho tenant · phiên bản gói {tenant?.subscriptionPackageVersion || subscriptionPackage.version || 1}</p></div></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">Bắt đầu</p><p className="mt-2 text-[9px] font-black">{formatPlanDate(tenant?.subscriptionStartedAt || tenant?.planStartDate)}</p></div><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">Gia hạn tiếp theo</p><p className="mt-2 text-[9px] font-black">{formatPlanDate(renewalDate)}</p></div><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">Quyền đang mở</p><p className="mt-2 text-[9px] font-black">{enabledCapabilityKeys.size} / {SUBSCRIPTION_CAPABILITY_CATALOG.length} feature flags</p></div></div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.05] p-6 sm:p-8 lg:border-l lg:border-t-0"><p className="text-[8px] font-black uppercase tracking-wide text-violet-200">Kiểm soát theo gói</p><div className="mt-4 space-y-3"><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center gap-3"><Store className="h-5 w-5 text-violet-200" /><div><p className="text-[9px] font-black">Chi nhánh</p><p className="mt-1 text-[8px] text-slate-400">{formatTenantQuota(branchCount, branchLimit, 'branches')}</p></div></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-violet-200" /><div><p className="text-[9px] font-black">Nhân sự</p><p className="mt-1 text-[8px] text-slate-400">{formatTenantQuota(staffCount, staffLimit, 'staff')}</p></div></div></div></div><button type="button" onClick={() => onNotify('Đã mở thông tin thanh toán của tenant.')} className="mt-4 flex h-10 w-full items-center justify-center border border-white/15 bg-white/10 text-[8px] font-black text-white shadow-none hover:bg-white/15">Quản lý thanh toán</button></div>
      </section>

      <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-black text-slate-900">Hạn mức đang áp dụng</h2><p className="mt-1 text-[8px] text-slate-500">Số chi nhánh và nhân sự lấy từ tenant; các quota khác lấy từ cấu hình gói.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-[8px] font-bold text-violet-700">Gói {subscriptionPackage.name}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{usageItems.map(({ label, value, percent, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={'flex h-9 w-9 items-center justify-center rounded-xl ' + toneClasses[tone].icon}><Icon className="h-4 w-4" /></span>{percent > 0 && <span className="text-[8px] font-black text-slate-400">{percent}%</span>}</div><p className="mt-4 text-[8px] font-bold text-slate-500">{label}</p><p className="mt-1 text-base font-black text-slate-900">{value}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + toneClasses[tone].bar} style={{ width: percent > 0 ? percent + '%' : '12%' }} /></div><p className="mt-2 text-[7px] leading-4 text-slate-400">{detail}</p></article>)}</div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black text-slate-900">Quyền chức năng của gói {subscriptionPackage.name}</h2><p className="mt-1 text-[8px] text-slate-500">Dấu tích là chức năng được mở; biểu tượng khóa yêu cầu nâng cấp hoặc đổi gói.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BadgePercent className="h-5 w-5" /></span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">{capabilityGroups.map((group) => <div key={group.title} className="rounded-2xl bg-slate-50 p-4"><p className="text-[9px] font-black text-slate-800">{group.title}</p><div className="mt-3 space-y-2.5">{group.keys.map((key) => { const capability = SUBSCRIPTION_CAPABILITY_CATALOG.find((item) => item.key === key); const enabled = enabledCapabilityKeys.has(key); return <div key={key} className={'flex items-start gap-2 rounded-xl p-2.5 ' + (enabled ? 'bg-white' : 'border border-dashed border-slate-200 bg-slate-100/70')}><span className={'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ' + (enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500')}>{enabled ? <Check className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}</span><div><p className={'text-[8px] font-bold ' + (enabled ? 'text-slate-700' : 'text-slate-400')}>{capability?.label || key}</p><p className="mt-1 text-[7px] text-slate-400">{enabled ? 'Được sử dụng' : 'Chưa có trong gói'}</p></div></div>; })}</div></div>)}</div>
        {lockedCapabilities.length > 0 && <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><LockKeyhole className="h-4 w-4" /></span><div className="flex-1"><p className="text-[9px] font-black text-amber-900">{lockedCapabilities.length} quyền chưa nằm trong gói hiện tại</p><p className="mt-1 text-[8px] text-amber-700">Menu vẫn hiển thị để bạn biết tính năng, nhưng hệ thống sẽ chặn truy cập và đề xuất gói phù hợp.</p></div>{upgradePackage && <button type="button" onClick={() => onNotify('Đã gửi yêu cầu tư vấn gói ' + upgradePackage.name + '.')} className="h-9 border border-amber-300 bg-white px-3 text-[8px] font-black text-amber-800 shadow-sm">Tư vấn {upgradePackage.name}</button>}</div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Lịch sử hóa đơn</h2><p className="mt-1 text-[8px] text-slate-500">Hóa đơn được lọc theo đúng tenant {tenantName}.</p></div><button type="button" onClick={() => onNotify(invoices.length ? 'Đã chuẩn bị danh sách hóa đơn để xuất.' : 'Tenant chưa có hóa đơn để xuất.')} className="flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất danh sách</button></div>{invoices.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50 text-[7px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Mã hóa đơn</th><th className="px-4 py-3">Chu kỳ</th><th className="px-4 py-3">Ngày phát hành</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Tệp</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.slice(0, 6).map((invoice) => { const status = invoiceStatusMeta[invoice.status]; return <tr key={invoice.id} className="text-[8px] text-slate-600"><td className="px-5 py-4 font-black text-slate-800">{invoice.invoiceCode || invoice.id}</td><td className="px-4 py-4">{invoice.billingPeriod}</td><td className="px-4 py-4">{formatPlanDate(invoice.createdAt)}</td><td className="px-4 py-4 font-black text-slate-800">{formatPlanMoney(invoice.amount, invoice.currency || 'VND')}</td><td className="px-4 py-4"><span className={'rounded-full px-2.5 py-1 text-[7px] font-bold ring-1 ' + status.className}>{status.label}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => onNotify('Đang chuẩn bị hóa đơn ' + (invoice.invoiceCode || invoice.id) + '.')} className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm"><ReceiptText className="h-3.5 w-3.5" />Tải PDF</button></td></tr>; })}</tbody></table></div> : <div className="px-6 py-12 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-700">Chưa có hóa đơn cho tenant này</p><p className="mt-1 text-[8px] text-slate-400">Hóa đơn mới sẽ xuất hiện sau khi Super Admin phát hành hoặc gia hạn gói.</p></div>}</section>
    </div>
  );
}
export default function NailTenantAdminPortal({ account, tenant, subscriptionPackage, availablePackages, invoices, onLogout }: NailTenantAdminPortalProps) {
  const currentPackage = useMemo(
    () => normalizeSubscriptionPackage(subscriptionPackage || FALLBACK_SUBSCRIPTION_PACKAGE),
    [subscriptionPackage]
  );
  const normalizedAvailablePackages = useMemo(
    () => availablePackages.map(normalizeSubscriptionPackage),
    [availablePackages]
  );
  const [activePage, setActivePage] = useState<NailPageId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [branch, setBranch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [selectedRow, setSelectedRow] = useState<NailRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [lockedPage, setLockedPage] = useState<NailPageId | null>(null);
  const [staffUsage, setStaffUsage] = useState(tenant?.staffCount ?? nailModuleConfigs.staff.rows.length);
  const [rowsByPage, setRowsByPage] = useState<Partial<Record<NailPageId, NailRow[]>>>(() => {
    const initialRows = Object.fromEntries(Object.entries(nailModuleConfigs).map(([id, config]) => [
      id,
      config.rows.map((row, index) => ({ ...row, branchCode: row.branchCode || (index % 2 === 0 ? 'Q3' : 'Q1') }))
    ])) as Partial<Record<NailPageId, NailRow[]>>;
    if (tenant) {
      initialRows.branches = (tenant.branches || []).map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.address,
        cells: ['Theo cấu hình', 'Chưa phân công', (item.staffCount ?? item.staffUsed) + ' người', 'Chưa có dữ liệu'],
        badge: item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng',
        badgeTone: item.status === 'ACTIVE' ? 'emerald' : 'slate',
        branchCode: item.id.replace(/^BR-/, ''),
        details: [
          { label: 'Địa chỉ', value: item.address },
          { label: 'Nhân sự', value: String(item.staffCount ?? item.staffUsed) },
          { label: 'Trạng thái', value: item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng' }
        ]
      }));
    }
    return initialRows;
  });
  const tenantName = tenant?.name || account.tenantName || 'Nailé Studio';
  const accountInitials = account.displayName.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join('') || 'NB';
  const branchLimit = currentPackage.maxSalons;
  const staffLimit = currentPackage.maxStaff;
  const branchRows = rowsByPage.branches || nailModuleConfigs.branches.rows;
  const currentConfig = activePage === 'overview' || activePage === 'subscription' ? null : nailModuleConfigs[activePage];
  const currentRows = activePage === 'overview' || activePage === 'subscription' ? [] : rowsByPage[activePage] || currentConfig?.rows || [];
  const scopedRows = activePage === 'branches' || branch === 'ALL' ? currentRows : currentRows.filter((row) => row.branchCode === branch);
  const branchScopeLabel = activePage === 'branches' || branch === 'ALL' ? 'Toàn tenant' : branchRows.find((row) => row.branchCode === branch)?.title || 'Chi nhánh ' + branch;
  const currentAccessMode = getTenantPageAccess(currentPackage, activePage, normalizedAvailablePackages);
  const readOnlyReason = tenant?.status === 'SUSPENDED'
    ? 'Tenant đang tạm ngưng. Bạn chỉ có thể xem dữ liệu và quản lý thanh toán.'
    : tenant?.status === 'OVERDUE'
      ? 'Gói đang quá hạn thanh toán. Các thao tác thay đổi dữ liệu tạm thời bị khóa.'
      : '';
  const lockedCapabilityKey = lockedPage ? getTenantPageCapabilityKey(lockedPage) : undefined;
  const lockedCapabilityLabel = getTenantCapabilityLabel(currentPackage, lockedCapabilityKey);
  const suggestedPackage = lockedPage
    ? findTenantUpgradePackage(normalizedAvailablePackages, currentPackage, lockedCapabilityKey)
    : undefined;
  const finiteUsage = [
    getTenantUsagePercent(branchRows.length, branchLimit, 'branches'),
    getTenantUsagePercent(staffUsage, staffLimit, 'staff')
  ].filter((value) => value > 0);
  const planUsagePercent = finiteUsage.length
    ? Math.min(100, Math.round(finiteUsage.reduce((sum, value) => sum + value, 0) / finiteUsage.length))
    : 0;
  const subscriptionStatusLabel = tenant?.status === 'SUSPENDED' ? 'Tạm ngưng'
    : tenant?.status === 'OVERDUE' ? 'Quá hạn'
      : tenant?.status === 'EXPIRING' ? 'Sắp hết hạn'
        : tenant?.status === 'TRIAL' ? 'Dùng thử'
          : 'Đang hoạt động';
  const subscriptionStatusTone = tenant?.status === 'SUSPENDED' || tenant?.status === 'OVERDUE'
    ? 'bg-rose-400/10 text-rose-300'
    : tenant?.status === 'EXPIRING'
      ? 'bg-amber-400/10 text-amber-300'
      : 'bg-emerald-400/10 text-emerald-300';
  const renewalLabel = formatPlanDate(tenant?.subscriptionRenewsAt || tenant?.trialEndDate);
  const branchScopedCreatePages = new Set<NailPageId>(['appointments', 'stations', 'pos', 'staff', 'inventory', 'finance', 'sanitation']);

  const showPageGate = (page: NailPageId) => {
    setLockedPage(page);
    setSidebarOpen(false);
    setCreateOpen(false);
  };

  const navigate = (page: NailPageId) => {
    if (getTenantPageAccess(currentPackage, page, normalizedAvailablePackages) === 'locked') {
      showPageGate(page);
      return false;
    }
    setActivePage(page);
    setSearchQuery('');
    setSelectedRow(null);
    setCreateOpen(false);
    setActiveTab(page === 'overview' || page === 'subscription' ? '' : nailModuleConfigs[page].tabs[0]);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const openCreate = (page?: Exclude<NailPageId, 'overview' | 'subscription'>) => {
    const targetPage = (page || activePage) as NailPageId;
    const access = getTenantPageAccess(currentPackage, targetPage, normalizedAvailablePackages);
    if (access !== 'full') {
      showPageGate(targetPage);
      return;
    }
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (targetPage === 'branches' && !isUnlimitedTenantLimit(branchLimit, 'branches') && branchRows.length >= branchLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + branchLimit + ' chi nhánh. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    if (targetPage === 'staff' && !isUnlimitedTenantLimit(staffLimit, 'staff') && staffUsage >= staffLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + staffLimit + ' nhân sự. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    if (targetPage !== 'branches' && branchScopedCreatePages.has(targetPage) && branch === 'ALL') {
      setToast('Vui lòng chọn một chi nhánh cụ thể trước khi tạo dữ liệu vận hành.');
      return;
    }
    if (page && page !== activePage && !navigate(page)) return;
    setFormValues({});
    setCreateOpen(true);
  };

  const exportRows = () => {
    if (!currentConfig) return;
    if (getTenantPageAccess(currentPackage, currentConfig.id, normalizedAvailablePackages) === 'locked') {
      showPageGate(currentConfig.id);
      return;
    }
    const header = currentConfig.columns.join(',');
    const body = scopedRows.map((row) => [row.title, ...row.cells, row.badge].join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = currentConfig.id + '-naile-studio.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setToast('Đã xuất dữ liệu ' + currentConfig.title + '.');
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!currentConfig) return;
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (getTenantPageAccess(currentPackage, currentConfig.id, normalizedAvailablePackages) !== 'full') {
      showPageGate(currentConfig.id);
      return;
    }
    if (currentConfig.id === 'branches' && !isUnlimitedTenantLimit(branchLimit, 'branches') && branchRows.length >= branchLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + branchLimit + ' chi nhánh. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    if (currentConfig.id === 'staff' && !isUnlimitedTenantLimit(staffLimit, 'staff') && staffUsage >= staffLimit) {
      setToast('Gói ' + currentPackage.name + ' đã đạt giới hạn ' + staffLimit + ' nhân sự. Vui lòng nâng cấp gói để mở thêm.');
      return;
    }
    const fields = currentConfig.formFields;
    const title = formValues[fields[0]?.key] || currentConfig.primaryAction + ' mới';
    const values = fields.slice(1).map((field) => formValues[field.key]).filter(Boolean);
    const cellCount = Math.max(1, currentConfig.columns.length - 2);
    const newRow: NailRow = {
      id: 'NEW-' + Date.now().toString().slice(-6),
      title,
      subtitle: 'Vừa tạo · Chờ hoàn thiện thông tin',
      cells: Array.from({ length: cellCount }, (_, index) => values[index] || '—'),
      badge: 'Mới tạo',
      badgeTone: 'blue',
      details: fields.map((field) => ({ label: field.label, value: formValues[field.key] || '—' })),
      note: formValues.note || formValues.description || '',
      branchCode: currentConfig.id === 'branches' ? (formValues.code || 'NEW').trim().toUpperCase() : branch
    };
    setRowsByPage((current) => ({ ...current, [activePage]: [newRow, ...(current[activePage] || currentRows)] }));
    if (currentConfig.id === 'staff') setStaffUsage((value) => value + 1);
    setCreateOpen(false);
    setFormValues({});
    setToast('Đã tạo “' + title + '” trong ' + currentConfig.title + '.');
  };

  const openEdit = () => {
    if (!selectedRow || !currentConfig) return;
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    if (getTenantPageAccess(currentPackage, currentConfig.id, normalizedAvailablePackages) !== 'full') {
      showPageGate(currentConfig.id);
      return;
    }
    const nextValues: Record<string, string> = {};
    currentConfig.formFields.forEach((field, index) => { nextValues[field.key] = index === 0 ? selectedRow.title : selectedRow.details[index]?.value || ''; });
    setFormValues(nextValues);
    setSelectedRow(null);
    setCreateOpen(true);
  };

  const updateSelectedRowStatus = () => {
    if (!selectedRow) return;
    if (readOnlyReason) {
      setToast(readOnlyReason);
      return;
    }
    setToast('Đã cập nhật trạng thái “' + selectedRow.title + '”.');
    setSelectedRow(null);
  };
  return (
    <div className="nail-admin min-h-screen bg-[#f5f7fb] text-slate-950">
      {toast && <div className="fixed right-4 top-24 z-[90] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><p className="text-[9px] font-bold text-slate-700">{toast}</p><button type="button" onClick={() => setToast('')} aria-label="Đóng thông báo" className="ml-2 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button></div>}
      {sidebarOpen && <button type="button" aria-label="Đóng lớp phủ menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 min-h-0 rounded-none border-0 bg-slate-950/45 p-0 shadow-none lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col bg-[#111625] text-white shadow-2xl transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[80px] shrink-0 items-center gap-3 border-b border-white/8 px-5">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-600 shadow-lg shadow-violet-950/30"><Sparkles className="h-5 w-5" /><span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-pink-200/80" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-black tracking-tight">{tenantName}</p><p className="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nail · Beauty · Care</p></div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" className="ml-auto flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none lg:hidden"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex ? 'mt-5' : ''}>
              <p className="mb-2 px-3 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600">{group.label}</p>
              <nav className="space-y-1">{group.items.map(({ id, label, icon: Icon, badge }) => {
                const active = activePage === id;
                const access = getTenantPageAccess(currentPackage, id, normalizedAvailablePackages);
                const locked = access === 'locked';
                const limitBadge = id === 'branches'
                  ? branchRows.length + '/' + (isUnlimitedTenantLimit(branchLimit, 'branches') ? '∞' : branchLimit)
                  : id === 'staff'
                    ? staffUsage + '/' + (isUnlimitedTenantLimit(staffLimit, 'staff') ? '∞' : staffLimit)
                    : badge;
                return (
                  <button key={id} type="button" onClick={() => navigate(id)} aria-current={active ? 'page' : undefined} aria-disabled={locked} title={locked ? 'Chưa có trong gói ' + currentPackage.name : undefined} className={'flex h-10 w-full items-center gap-3 border-0 px-3 text-left text-[9px] font-bold shadow-none ' + (active ? 'bg-violet-500/18 text-violet-200 ring-1 ring-violet-400/20' : locked ? 'bg-transparent text-slate-600 hover:bg-white/5 hover:text-slate-300' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white')}>
                    <Icon className={'h-4 w-4 ' + (active ? 'text-violet-400' : locked ? 'text-slate-600' : '')} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {locked ? <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[7px] text-amber-300"><LockKeyhole className="h-2.5 w-2.5" />Khóa</span> : limitBadge && <span className={'rounded-full px-2 py-0.5 text-[7px] ' + (active ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-500')}>{limitBadge}</span>}
                  </button>
                );
              })}</nav>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => navigate('subscription')} aria-current={activePage === 'subscription' ? 'page' : undefined} className={'m-3 shrink-0 rounded-2xl border p-4 text-left shadow-none ' + (activePage === 'subscription' ? 'border-violet-400/50 bg-violet-500/15 ring-1 ring-violet-400/20' : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.07]')}>
          <div className="mb-3 flex items-center justify-between gap-2"><span className="truncate text-[9px] font-bold text-slate-300">Gói {currentPackage.name}</span><span className={'shrink-0 rounded-full px-2 py-1 text-[7px] font-bold ' + subscriptionStatusTone}>{subscriptionStatusLabel}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: Math.max(8, planUsagePercent) + '%' }} /></div>
          <div className="mt-2 flex items-center justify-between gap-2"><p className="text-[7px] leading-4 text-slate-500">{planUsagePercent > 0 ? planUsagePercent + '% hạn mức' : 'Hạn mức linh hoạt'} · Gia hạn {renewalLabel}</p><ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300" /></div>
        </button>
      </aside>

      <div className="min-h-screen lg:pl-[284px]">
        <header className="sticky top-0 z-30 flex h-[80px] items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={`Tìm trong ${formatModuleLabel(activePage).toLocaleLowerCase('vi')}...`} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-[10px] font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></div>
          <div className="hidden sm:block"><BeautifulSelect value={branch} onChange={(event) => { setBranch(event.target.value); setSearchQuery(''); setSelectedRow(null); }} aria-label="Chọn phạm vi chi nhánh" className="h-10 w-52 rounded-xl border border-slate-200 bg-white px-3 text-[8px] font-bold"><option value="ALL">Tất cả chi nhánh</option>{branchRows.map((row) => <option key={row.id} value={row.branchCode}>{row.title}</option>)}</BeautifulSelect></div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative"><button type="button" onClick={() => { setShowNotifications((value) => !value); setShowProfile(false); }} aria-label="Thông báo" className="relative flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[7px] font-black text-white">6</span></button>{showNotifications && <div className="absolute right-0 mt-2 w-[min(350px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="border-b border-slate-100 px-4 py-3"><p className="text-[10px] font-black text-slate-800">Thông báo {tenantName}</p><p className="mt-1 text-[8px] text-slate-400">6 việc cần bạn xem</p></div><div className="divide-y divide-slate-100">{[
              { title: '4 lịch mới đang chờ xác nhận', detail: 'Lịch sớm nhất lúc 11:30', tone: 'bg-amber-500' },
              { title: '18 mặt hàng dưới định mức', detail: '6 mặt hàng cần nhập gấp', tone: 'bg-rose-500' },
              { title: 'Ghế P-04 đang chờ duyệt bảo trì', detail: 'Chi phí dự kiến 850.000đ', tone: 'bg-violet-500' },
              { title: 'Checklist mở ca còn thiếu 2 mục', detail: 'Chi nhánh Quận 3', tone: 'bg-blue-500' }
            ].map((item) => <div key={item.title} className="flex gap-3 px-4 py-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone}`} /><div><p className="text-[8px] font-bold text-slate-700">{item.title}</p><p className="mt-1 text-[7px] text-slate-400">{item.detail}</p></div></div>)}</div></div>}</div>
            <div className="relative"><button type="button" onClick={() => { setShowProfile((value) => !value); setShowNotifications(false); }} className="flex h-11 items-center gap-2 border-0 bg-transparent px-1.5 text-left shadow-none"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-black text-white">{accountInitials}</span><span className="hidden md:block"><span className="block text-[9px] font-black text-slate-800">{account.displayName}</span><span className="mt-0.5 block text-[7px] font-semibold text-slate-400">Owner · Tenant Admin</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" /></button>{showProfile && <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"><div className="border-b border-slate-100 px-3 py-3"><p className="text-[10px] font-black text-slate-800">{account.displayName}</p><p className="mt-1 text-[8px] text-slate-500">{account.email}</p><p className="mt-2 rounded-lg bg-violet-50 px-2 py-1.5 text-[7px] font-bold text-violet-700">{tenantName} · Quản trị theo gói {currentPackage.name}</p></div><button type="button" onClick={() => navigate('settings')} className="mt-1 flex h-9 w-full items-center gap-2.5 border-0 bg-transparent px-3 text-[8px] font-bold text-slate-600 shadow-none hover:bg-slate-50"><Settings className="h-3.5 w-3.5" />Cài đặt tài khoản</button><button type="button" onClick={onLogout} className="flex h-9 w-full items-center gap-2.5 border-0 bg-transparent px-3 text-[8px] font-bold text-rose-600 shadow-none hover:bg-rose-50"><LogOut className="h-3.5 w-3.5" />Đăng xuất</button></div>}</div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {readOnlyReason && <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100"><LockKeyhole className="h-4 w-4" /></span><div><p className="text-[9px] font-black">Chế độ chỉ đọc đang được áp dụng</p><p className="mt-1 text-[8px] leading-5">{readOnlyReason}</p></div></div>}
          <div className="mb-4 sm:hidden"><BeautifulSelect value={branch} onChange={(event) => { setBranch(event.target.value); setSearchQuery(''); setSelectedRow(null); }} aria-label="Chọn phạm vi chi nhánh trên di động" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả chi nhánh</option>{branchRows.map((row) => <option key={row.id} value={row.branchCode}>{row.title}</option>)}</BeautifulSelect></div>
          {activePage === 'overview' ? (
            <OverviewPage branch={branch} ownerName={account.displayName} tenantName={tenantName} planName={currentPackage.name} branchCount={branchRows.length} branchLimit={branchLimit} staffCount={staffUsage} staffLimit={staffLimit} onNavigate={navigate} onQuickCreate={openCreate} />
          ) : activePage === 'subscription' ? (
            <SubscriptionPage tenantName={tenantName} tenant={tenant} subscriptionPackage={currentPackage} availablePackages={normalizedAvailablePackages} invoices={invoices} branchCount={branchRows.length} staffCount={staffUsage} onNotify={setToast} />
          ) : currentConfig && (
            <ModulePage config={currentConfig} rows={scopedRows} searchQuery={searchQuery} activeTab={activeTab || currentConfig.tabs[0]} onSearch={setSearchQuery} onTab={setActiveTab} onSelectRow={setSelectedRow} onCreate={() => openCreate()} onExport={exportRows} scopeLabel={branchScopeLabel} planName={currentPackage.name} accessMode={currentAccessMode} branchCount={branchRows.length} branchLimit={branchLimit} staffCount={staffUsage} staffLimit={staffLimit} onUpgrade={() => showPageGate(currentConfig.id)} />
          )}
        </main>
      </div>

      {lockedPage && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <button type="button" aria-label="Đóng thông báo giới hạn gói" onClick={() => setLockedPage(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
        <section className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-[#171328] via-[#21183c] to-[#34215a] p-6 text-white sm:p-7">
            <div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/20"><LockKeyhole className="h-5 w-5" /></span><button type="button" onClick={() => setLockedPage(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 p-0 text-slate-300 shadow-none"><X className="h-4 w-4" /></button></div>
            <p className="mt-5 text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">Giới hạn gói {currentPackage.name}</p>
            <h2 className="mt-2 text-xl font-black">{formatModuleLabel(lockedPage)} chưa có trong gói hiện tại</h2>
            <p className="mt-2 text-[9px] leading-5 text-slate-300">Chức năng này cần quyền <strong className="text-white">{lockedCapabilityLabel}</strong>. Dữ liệu cũ vẫn được giữ nguyên, nhưng bạn chưa thể truy cập hoặc thay đổi cho đến khi đổi gói.</p>
          </div>
          <div className="p-6 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[7px] font-bold uppercase text-slate-400">Gói đang dùng</p><p className="mt-2 text-[9px] font-black text-slate-800">{currentPackage.name}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[7px] font-bold uppercase text-slate-400">Quyền yêu cầu</p><p className="mt-2 text-[9px] font-black text-slate-800">{lockedCapabilityLabel}</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-[7px] font-bold uppercase text-violet-400">Gói phù hợp</p><p className="mt-2 text-[9px] font-black text-violet-800">{suggestedPackage?.name || 'Liên hệ tư vấn'}</p></div></div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setLockedPage(null); navigate('subscription'); }} className="h-11 border border-slate-200 bg-white px-4 text-[8px] font-black text-slate-600 shadow-sm">Xem quyền gói</button><button type="button" onClick={() => { setToast(suggestedPackage ? 'Đã gửi yêu cầu nâng cấp lên gói ' + suggestedPackage.name + '.' : 'Đã gửi yêu cầu tư vấn gói phù hợp.'); setLockedPage(null); }} className="h-11 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200">{suggestedPackage ? 'Yêu cầu nâng lên ' + suggestedPackage.name : 'Liên hệ tư vấn'}</button></div>
          </div>
        </section>
      </div>}
      {selectedRow && currentConfig && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"><button type="button" aria-label="Đóng chi tiết" onClick={() => setSelectedRow(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><aside className="relative flex h-full w-full max-w-[500px] flex-col overflow-hidden bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase tracking-wide text-violet-600">{selectedRow.id}</span><span className={`rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${toneClasses[selectedRow.badgeTone].badge}`}>{selectedRow.badge}</span></div><h2 className="mt-2 text-lg font-black text-slate-900">{selectedRow.title}</h2><p className="mt-1 text-[8px] text-slate-400">{selectedRow.subtitle}</p></div><button type="button" onClick={() => setSelectedRow(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-5 sm:p-6"><div className="rounded-2xl bg-gradient-to-br from-[#19152e] to-[#292148] p-5 text-white"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-violet-300">{currentConfig.title}</p><p className="mt-2 text-xl font-black">{selectedRow.title}</p><p className="mt-2 text-[8px] leading-4 text-slate-400">{selectedRow.subtitle}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{selectedRow.details.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><p className="text-[7px] font-bold text-slate-400">{item.label}</p><p className="mt-1.5 text-[9px] font-black leading-4 text-slate-700">{item.value}</p></div>)}</div>{selectedRow.note && <div className="mt-5 rounded-2xl bg-violet-50 p-4"><p className="text-[8px] font-black uppercase tracking-wide text-violet-500">Ghi chú vận hành</p><p className="mt-2 text-[9px] leading-5 text-violet-700">{selectedRow.note}</p></div>}<div className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><ReceiptText className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-[9px] font-black text-slate-700">Lịch sử hoạt động</p><p className="mt-1 text-[8px] leading-4 text-slate-400">Cập nhật gần nhất lúc 14:32 bởi hệ thống {tenantName}. Mọi thay đổi quản trị được ghi lại trong nhật ký.</p></div></div></div></div><div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><div className="flex gap-2"><button type="button" onClick={openEdit} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-bold text-slate-600 shadow-sm"><Settings className="h-3.5 w-3.5" />Chỉnh sửa</button><button type="button" onClick={updateSelectedRowStatus} className="flex h-11 flex-1 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Check className="h-4 w-4" />Xác nhận & cập nhật</button></div></div></aside></div>}

      {createOpen && currentConfig && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCreate} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><p className="text-[8px] font-black uppercase tracking-wide text-violet-600">{currentConfig.title}</p><h2 className="mt-1 text-base font-black text-slate-900">{currentConfig.formTitle}</h2><p className="mt-1 text-[8px] text-slate-500">Nhập thông tin cần thiết; bạn có thể bổ sung chi tiết sau khi lưu.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{currentConfig.formFields.map((field) => <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[8px] font-bold text-slate-600">{field.label}</span>{field.type === 'select' ? <BeautifulSelect value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[9px] font-medium"><option value="">Chọn {field.label.toLocaleLowerCase('vi')}</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</BeautifulSelect> : field.type === 'textarea' ? <textarea value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[9px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /> : <input type={field.type} value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} required={field === currentConfig.formFields[0]} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[9px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />}</label>)}</div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-[8px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Plus className="h-4 w-4" />Lưu thông tin</button></div></form></div>}
    </div>
  );
}
