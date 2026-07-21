import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Armchair,
  Banknote,
  Bell,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';

const TenantAdminAppointments = lazy(() => import('./TenantAdminAppointments'));
const TenantAdminCustomers = lazy(() => import('./TenantAdminCustomers'));
const TenantAdminPayments = lazy(() => import('./TenantAdminPayments'));
const TenantAdminStations = lazy(() => import('./TenantAdminStations'));

type ReceptionPage = 'desk' | 'appointments' | 'customers' | 'stations' | 'payments';
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';
type BranchCode = 'Q1' | 'Q3';
type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';

interface ReceptionAppointment {
  id: string;
  customerId?: string;
  customer: string;
  phone: string;
  date: string;
  start: string;
  duration: number;
  service: string;
  services?: string[];
  staff: string;
  branch: BranchCode;
  source: AppointmentSource;
  status: AppointmentStatus;
  price: number;
  deposit: number;
  note: string;
  station?: string;
  reminderSent?: boolean;
  createdBy?: string;
  firstVisit?: boolean;
  createdAt: string;
}

interface ReceptionPayment {
  id: string;
  appointmentId?: string;
  customer: string;
  phone: string;
  branch: BranchCode;
  createdAt: string;
  total: number;
  subtotal: number;
  discount: number;
  tip: number;
  deposit: number;
  paid: number;
  refunded: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED' | 'FAILED';
  method?: PaymentMethod;
  reference?: string;
  cashier: string;
  source: string;
  items: Array<{ name: string; quantity: number; amount: number; staff: string }>;
  note?: string;
  audit: string[];
}

interface ShiftState {
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  openingCash: number;
  closedAt?: string;
  closingCash?: number;
}

interface ReceptionistPortalProps {
  account: DemoAccount;
  onLogout: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

const seedAppointments = (): ReceptionAppointment[] => [
  { id: 'APT-2107', customerId: 'CUS-1842', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: today(), start: '09:00', duration: 90, service: 'Gel Manicure + Nail Art', services: ['Gel Manicure', 'Nail Art'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'IN_SERVICE', price: 850000, deposit: 300000, note: 'Khách VIP, ưu tiên phòng yên tĩnh.', station: 'M-01', reminderSent: true, createdBy: 'Website', createdAt: new Date().toISOString() },
  { id: 'APT-2108', customerId: 'CUS-1796', customer: 'Trần Thu Hà', phone: '0908 337 912', date: today(), start: '10:30', duration: 75, service: 'Pedicure Spa + Sơn gel', staff: 'Minh Châu', branch: 'Q3', source: 'PHONE', status: 'CHECKED_IN', price: 780000, deposit: 200000, note: 'Không dùng tinh dầu bạc hà.', station: 'P-02', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt: new Date().toISOString() },
  { id: 'APT-2109', customer: 'Lê Phương Anh', phone: '0901 486 320', date: today(), start: '11:00', duration: 120, service: 'Nail Art Premium', staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ZALO', status: 'CONFIRMED', price: 980000, deposit: 0, note: '', station: 'M-04', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt: new Date().toISOString() },
  { id: 'APT-2110', customer: 'Mai Đức Anh', phone: '0939 772 618', date: today(), start: '13:30', duration: 60, service: 'Combo Manicure', staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'PENDING', price: 620000, deposit: 0, note: 'Khách vãng lai.', createdBy: 'Lê Hoàng Nam', firstVisit: true, createdAt: new Date().toISOString() },
  { id: 'APT-2111', customerId: 'CUS-2050', customer: 'Đinh Gia Hân', phone: '0902 826 114', date: today(), start: '15:00', duration: 120, service: 'Combo VIP', staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'CONFIRMED', price: 1650000, deposit: 500000, note: 'Chuẩn bị phòng VIP.', station: 'V-11', reminderSent: true, createdBy: 'Website', createdAt: new Date().toISOString() },
  { id: 'APT-2112', customer: 'Vũ Ngọc Linh', phone: '0934 128 906', date: today(), start: '16:30', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Thuỳ Dương', branch: 'Q1', source: 'PHONE', status: 'CONFIRMED', price: 620000, deposit: 0, note: '', createdBy: 'Lê Hoàng Nam', createdAt: new Date().toISOString() },
];

const statusMeta: Record<AppointmentStatus, { label: string; badge: string; dot: string }> = {
  PENDING: { label: 'Chờ xác nhận', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Đã xác nhận', badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  CHECKED_IN: { label: 'Đang chờ', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', dot: 'bg-cyan-500' },
  IN_SERVICE: { label: 'Đang phục vụ', badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  COMPLETED: { label: 'Hoàn tất', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  NO_SHOW: { label: 'Không đến', badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-500' },
};

const methodMeta: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  CASH: { label: 'Tiền mặt', icon: Banknote },
  BANK: { label: 'Chuyển khoản', icon: WalletCards },
  CARD: { label: 'Thẻ', icon: CreditCard },
  MOMO: { label: 'MoMo', icon: Smartphone },
  ZALOPAY: { label: 'ZaloPay', icon: Smartphone },
};

const navItems: Array<{ id: ReceptionPage; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: 'desk', label: 'Bàn lễ tân', description: 'Điều phối hôm nay', icon: LayoutDashboard },
  { id: 'appointments', label: 'Lịch hẹn', description: 'Đặt và chỉnh lịch', icon: CalendarDays },
  { id: 'customers', label: 'Khách hàng', description: 'Hồ sơ và lịch sử', icon: UsersRound },
  { id: 'stations', label: 'Ghế & phòng', description: 'Tình trạng phục vụ', icon: Armchair },
  { id: 'payments', label: 'Thanh toán', description: 'Thu tiền và hóa đơn', icon: ReceiptText },
];

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[26px] border border-brand-outline bg-brand-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-brand-text">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-brand-text-muted">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-brand-outline p-2 text-brand-text-muted hover:bg-brand-surface-high" aria-label="Đóng hộp thoại"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, tone }: { icon: typeof CalendarDays; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-brand-text">{value}</p>
          <p className="mt-1 text-[11px] text-brand-text-muted">{note}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

export default function ReceptionistPortal({ account, onLogout }: ReceptionistPortalProps) {
  const tenantName = account.tenantName || 'Nailé Studio';
  const branchCode: BranchCode = account.branchCode || 'Q3';
  const branchName = account.branchName || `${tenantName} · Chi nhánh ${branchCode === 'Q1' ? 'Quận 1' : 'Quận 3'}`;
  const appointmentStorageKey = `tenant-admin-appointments-v2:${tenantName}`;
  const paymentStorageKey = `tenant-admin-payments-v1:${tenantName}`;
  const shiftStorageKey = `receptionist-shift-v1:${account.email}`;
  const [page, setPage] = useState<ReceptionPage>('desk');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>(() => readStorage(appointmentStorageKey, seedAppointments()));
  const [payments, setPayments] = useState<ReceptionPayment[]>(() => readStorage(paymentStorageKey, []));
  const [shift, setShift] = useState<ShiftState>(() => readStorage(shiftStorageKey, { status: 'OPEN', openedAt: new Date().toISOString(), openingCash: 1000000 }));
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState<ReceptionAppointment | null>(null);
  const [shiftModal, setShiftModal] = useState<'OPEN' | 'CLOSE' | null>(null);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [walkIn, setWalkIn] = useState({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', start: nowTime(), duration: '60', price: '450000', note: '' });
  const [paymentForm, setPaymentForm] = useState({ method: 'CASH' as PaymentMethod, discount: '0', tip: '0', reference: '' });
  const [cashAmount, setCashAmount] = useState('1000000');

  useEffect(() => localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments)), [appointmentStorageKey, appointments]);
  useEffect(() => localStorage.setItem(paymentStorageKey, JSON.stringify(payments)), [paymentStorageKey, payments]);
  useEffect(() => localStorage.setItem(shiftStorageKey, JSON.stringify(shift)), [shift, shiftStorageKey]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.date === today())
    .filter((appointment) => appointment.branch === branchCode)
    .filter((appointment) => `${appointment.customer} ${appointment.phone} ${appointment.service}`.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.start.localeCompare(b.start)), [appointments, branchCode, searchQuery]);
  const activeAppointments = todayAppointments.filter((appointment) => ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status));
  const upcomingAppointments = todayAppointments.filter((appointment) => ['PENDING', 'CONFIRMED'].includes(appointment.status));
  const completedIds = new Set(payments.filter((payment) => payment.status === 'PAID').map((payment) => payment.appointmentId));
  const paidToday = payments.filter((payment) => payment.status === 'PAID' && payment.createdAt.includes(new Date().toLocaleDateString('vi-VN')));
  const todayRevenue = paidToday.reduce((sum, payment) => sum + payment.paid, 0);

  const requireOpenShift = () => {
    if (shift.status === 'OPEN') return true;
    setToast('Vui lòng mở ca trước khi thực hiện nghiệp vụ tại quầy.');
    return false;
  };

  const updateAppointmentStatus = (appointment: ReceptionAppointment, status: AppointmentStatus) => {
    if (!requireOpenShift()) return;
    setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status } : item));
    const messages: Partial<Record<AppointmentStatus, string>> = {
      CHECKED_IN: `${appointment.customer} đã check-in.`,
      IN_SERVICE: `${appointment.customer} đã bắt đầu dịch vụ.`,
      COMPLETED: `${appointment.customer} đã hoàn tất dịch vụ.`,
    };
    setToast(messages[status] || 'Đã cập nhật lịch hẹn.');
  };

  const submitWalkIn = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!requireOpenShift()) return;
    if (walkIn.customer.trim().length < 2) return setFormError('Vui lòng nhập tên khách hàng.');
    if (!/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(walkIn.phone.trim())) return setFormError('Số điện thoại chưa đúng định dạng.');
    const appointment: ReceptionAppointment = {
      id: makeId('APT'), customer: walkIn.customer.trim(), phone: walkIn.phone.trim(), date: today(), start: walkIn.start,
      duration: Number(walkIn.duration), service: walkIn.service, staff: walkIn.staff, branch: branchCode,
      source: 'RECEPTION', status: 'CHECKED_IN', price: Number(walkIn.price), deposit: 0, note: walkIn.note.trim(),
      createdBy: account.displayName, firstVisit: true, createdAt: new Date().toISOString(),
    };
    setAppointments((current) => [appointment, ...current]);
    setWalkInOpen(false);
    setWalkIn({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', start: nowTime(), duration: '60', price: '450000', note: '' });
    setToast(`Đã tiếp nhận khách vãng lai ${appointment.customer}.`);
  };

  const openPayment = (appointment: ReceptionAppointment) => {
    if (!requireOpenShift()) return;
    setPaymentAppointment(appointment);
    setPaymentForm({ method: 'CASH', discount: '0', tip: '0', reference: '' });
    setFormError('');
  };

  const submitPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!paymentAppointment) return;
    const discount = Math.max(0, Number(paymentForm.discount) || 0);
    const tip = Math.max(0, Number(paymentForm.tip) || 0);
    const total = Math.max(0, paymentAppointment.price - paymentAppointment.deposit - discount + tip);
    if (paymentForm.method !== 'CASH' && !paymentForm.reference.trim()) return setFormError('Vui lòng nhập mã giao dịch để đối soát.');
    const timestamp = new Date();
    const payment: ReceptionPayment = {
      id: makeId('INV'), appointmentId: paymentAppointment.id, customer: paymentAppointment.customer, phone: paymentAppointment.phone,
      branch: paymentAppointment.branch, createdAt: `${timestamp.toLocaleDateString('vi-VN')} · ${nowTime()}`,
      subtotal: paymentAppointment.price, discount, tip, deposit: paymentAppointment.deposit, total, paid: total,
      refunded: 0, status: 'PAID', method: paymentForm.method, reference: paymentForm.reference.trim() || undefined,
      cashier: account.displayName, source: 'POS tại quầy',
      items: [{ name: paymentAppointment.service, quantity: 1, amount: paymentAppointment.price, staff: paymentAppointment.staff }],
      audit: [`${nowTime()} · ${account.displayName} xác nhận thanh toán ${methodMeta[paymentForm.method].label}`],
    };
    setPayments((current) => [payment, ...current]);
    setAppointments((current) => current.map((item) => item.id === paymentAppointment.id ? { ...item, status: 'COMPLETED' } : item));
    setPaymentAppointment(null);
    setToast(`Đã thu ${money(total)} từ ${payment.customer}.`);
  };

  const submitShift = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount < 0) return setFormError('Số tiền trong quỹ không hợp lệ.');
    if (shiftModal === 'OPEN') {
      setShift({ status: 'OPEN', openedAt: new Date().toISOString(), openingCash: amount });
      setToast('Đã mở ca lễ tân.');
    } else {
      setShift((current) => ({ ...current, status: 'CLOSED', closedAt: new Date().toISOString(), closingCash: amount }));
      setToast('Đã chốt ca và ghi nhận tiền quỹ.');
    }
    setShiftModal(null);
    setFormError('');
  };

  const navigate = (nextPage: ReceptionPage) => {
    setPage(nextPage);
    setSidebarOpen(false);
    setSearchQuery('');
  };

  const renderDesk = () => (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-[#08251f] p-5 text-white shadow-[0_20px_55px_rgba(6,78,59,0.18)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" /> Bàn điều phối trực tiếp
            </div>
            <h1 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">Chào buổi làm việc, {account.displayName.split(' ').slice(-2).join(' ')}</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-emerald-50/70">Theo dõi khách đến, điều phối ghế và hoàn tất thanh toán trong một luồng duy nhất.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { if (requireOpenShift()) setWalkInOpen(true); }} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-300"><Plus className="h-4 w-4" /> Tiếp nhận khách vãng lai</button>
            <button type="button" onClick={() => setShiftModal(shift.status === 'OPEN' ? 'CLOSE' : 'OPEN')} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:bg-white/15"><DoorOpen className="h-4 w-4" /> {shift.status === 'OPEN' ? 'Chốt ca' : 'Mở ca'}</button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/55">Phạm vi được phân công</p><p className="mt-1 text-sm font-bold">{branchName}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/55">Trạng thái ca</p><p className="mt-1 flex items-center gap-2 text-sm font-bold"><span className={`h-2 w-2 rounded-full ${shift.status === 'OPEN' ? 'bg-emerald-400' : 'bg-slate-400'}`} />{shift.status === 'OPEN' ? `Đang mở · ${new Date(shift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đã đóng ca'}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/55">Quỹ đầu ca</p><p className="mt-1 text-sm font-bold">{money(shift.openingCash)}</p></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CalendarCheck2} label="Lịch hôm nay" value={String(todayAppointments.length)} note={`${upcomingAppointments.length} khách sắp đến`} tone="bg-blue-50 text-blue-700" />
        <MetricCard icon={UsersRound} label="Đang tại salon" value={String(activeAppointments.length)} note={`${activeAppointments.filter((item) => item.status === 'CHECKED_IN').length} khách đang chờ`} tone="bg-cyan-50 text-cyan-700" />
        <MetricCard icon={Armchair} label="Đang phục vụ" value={String(activeAppointments.filter((item) => item.status === 'IN_SERVICE').length)} note="Cập nhật theo check-in" tone="bg-violet-50 text-violet-700" />
        <MetricCard icon={CircleDollarSign} label="Đã thu hôm nay" value={money(todayRevenue)} note={`${paidToday.length} giao dịch hoàn tất`} tone="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[24px] border border-brand-outline bg-brand-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-brand-outline p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base font-black text-brand-text">Luồng khách tại quầy</h2><p className="mt-1 text-[11px] text-brand-text-muted">Check-in, bắt đầu phục vụ và thu tiền.</p></div>
            <button type="button" onClick={() => navigate('appointments')} className="flex items-center gap-1 text-xs font-bold text-emerald-700">Xem toàn bộ lịch <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="divide-y divide-brand-outline">
            {activeAppointments.length === 0 && <div className="p-10 text-center text-xs text-brand-text-muted">Chưa có khách đang chờ hoặc đang phục vụ.</div>}
            {activeAppointments.map((appointment) => {
              const meta = statusMeta[appointment.status];
              return (
                <article key={appointment.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 font-black text-emerald-700">{appointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}</div>
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-brand-text">{appointment.customer}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ring-1 ring-inset ${meta.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></div><p className="mt-1 truncate text-[11px] text-brand-text-muted">{appointment.start} · {appointment.service} · {appointment.staff}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-brand-text-muted"><Phone className="h-3 w-3" /> {appointment.phone}{appointment.station ? ` · ${appointment.station}` : ''}</p></div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {appointment.status === 'CHECKED_IN' && <button type="button" onClick={() => updateAppointmentStatus(appointment, 'IN_SERVICE')} className="rounded-xl bg-violet-600 px-3 py-2 text-[10px] font-black text-white hover:bg-violet-700">Bắt đầu dịch vụ</button>}
                      {appointment.status === 'IN_SERVICE' && <button type="button" onClick={() => openPayment(appointment)} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-700">Thu tiền & hoàn tất</button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-brand-outline bg-brand-surface p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-base font-black text-brand-text">Khách sắp đến</h2><p className="mt-1 text-[11px] text-brand-text-muted">Ưu tiên theo giờ hẹn.</p></div><Clock3 className="h-5 w-5 text-amber-500" /></div>
          <div className="mt-4 space-y-3">
            {upcomingAppointments.slice(0, 5).map((appointment) => (
              <div key={appointment.id} className="rounded-2xl border border-brand-outline bg-brand-surface-high/45 p-3">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-brand-text">{appointment.start} · {appointment.customer}</p><p className="mt-1 text-[10px] leading-4 text-brand-text-muted">{appointment.service}<br />{appointment.staff}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-bold ring-1 ring-inset ${statusMeta[appointment.status].badge}`}>{statusMeta[appointment.status].label}</span></div>
                <div className="mt-3 flex gap-2"><button type="button" onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-[9px] font-black text-white"><Check className="h-3 w-3" /> Check-in</button><a href={`tel:${appointment.phone.replace(/\s/g, '')}`} className="flex items-center justify-center rounded-lg border border-brand-outline px-3 text-brand-text-muted" aria-label={`Gọi ${appointment.customer}`}><Phone className="h-3.5 w-3.5" /></a><a href={`sms:${appointment.phone.replace(/\s/g, '')}`} className="flex items-center justify-center rounded-lg border border-brand-outline px-3 text-brand-text-muted" aria-label={`Nhắn tin ${appointment.customer}`}><MessageCircle className="h-3.5 w-3.5" /></a></div>
              </div>
            ))}
            {upcomingAppointments.length === 0 && <p className="py-8 text-center text-xs text-brand-text-muted">Không còn khách sắp đến.</p>}
          </div>
        </div>
      </section>
    </div>
  );

  const renderPage = () => {
    if (page === 'desk') return renderDesk();
    const commonProps = { searchQuery, onSearchQueryChange: setSearchQuery, selectedBranch: branchCode, onSelectedBranchChange: () => undefined, branchLocked: true, tenantName, roleLabel: `Receptionist · ${account.displayName} · ${branchName}`, accessMode: 'full' as const, onNotify: setToast };
    if (page === 'appointments') return <TenantAdminAppointments {...commonProps} />;
    if (page === 'customers') return <TenantAdminCustomers {...commonProps} onBookCustomer={(customer) => { setSearchQuery(customer.phone); setPage('appointments'); setToast(`Đã chọn ${customer.name}. Hãy tạo lịch hẹn mới.`); }} />;
    if (page === 'stations') return <TenantAdminStations {...commonProps} />;
    return <TenantAdminPayments {...commonProps} />;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#071e1a] text-white shadow-2xl transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/30"><Store className="h-5 w-5" /></div>
          <div><p className="text-sm font-black tracking-tight">{tenantName}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/55">Reception workspace</p></div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-2 text-white/60 lg:hidden" aria-label="Đóng menu"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Điều hướng Receptionist">
          <p className="px-3 pb-2 pt-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-100/35">Vận hành tại quầy</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/20' : 'text-emerald-50/70 hover:bg-white/7 hover:text-white'}`}><Icon className="h-[18px] w-[18px] shrink-0" /><span className="min-w-0"><span className="block text-[12px] font-extrabold">{item.label}</span><span className={`mt-0.5 block text-[9px] ${active ? 'text-emerald-950/65' : 'text-emerald-100/35'}`}>{item.description}</span></span>{active && <ChevronRight className="ml-auto h-4 w-4" />}</button>;
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 font-black text-emerald-300">LN</div><div className="min-w-0"><p className="truncate text-[11px] font-bold">{account.displayName}</p><p className="truncate text-[9px] text-emerald-100/45">Receptionist · {branchCode === 'Q1' ? 'Quận 1' : 'Quận 3'}</p></div></div>
          <button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-[11px] font-bold text-emerald-50/70 hover:bg-rose-500/15 hover:text-rose-200"><LogOut className="h-4 w-4" /> Đăng xuất</button>
        </div>
      </aside>
      {sidebarOpen && <button type="button" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" aria-label="Đóng menu" />}

      <div className="min-h-screen lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-brand-outline bg-brand-surface/95 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl border border-brand-outline p-2.5 text-brand-text lg:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden min-w-0 sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text-muted">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</p><p className="mt-1 text-sm font-black text-brand-text">{navItems.find((item) => item.id === page)?.label}</p></div>
          <div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tên, số điện thoại, dịch vụ..." className="h-10 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 pl-10 pr-4 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></div>
          <div className="hidden h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-800 sm:flex" title="Tài khoản chỉ được điều phối chi nhánh này"><Store className="h-3.5 w-3.5" />{branchCode === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3'}<ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /></div>
          <div className="relative"><button type="button" onClick={() => setShowNotifications((current) => !current)} className="relative rounded-xl border border-brand-outline p-2.5 text-brand-text-muted hover:bg-brand-surface-high" aria-label="Thông báo"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-brand-surface" /></button>{showNotifications && <div className="absolute right-0 top-12 w-80 rounded-2xl border border-brand-outline bg-brand-surface p-3 shadow-2xl"><div className="flex items-center justify-between px-2 py-2"><p className="text-xs font-black">Thông báo tại quầy</p><span className="text-[9px] font-bold text-rose-600">2 mới</span></div><div className="space-y-1"><div className="rounded-xl bg-amber-50 p-3 text-amber-900"><p className="text-[10px] font-bold">Lịch 11:00 chưa check-in</p><p className="mt-1 text-[9px] text-amber-700">Lê Phương Anh · Nail Art Premium</p></div><div className="rounded-xl bg-cyan-50 p-3 text-cyan-900"><p className="text-[10px] font-bold">Khách đang chờ 8 phút</p><p className="mt-1 text-[9px] text-cyan-700">Trần Thu Hà · Ghế P-02</p></div></div></div>}</div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-7"><Suspense fallback={<div className="py-24 text-center text-xs font-bold text-brand-text-muted">Đang tải không gian lễ tân...</div>}>{renderPage()}</Suspense></main>
      </div>

      {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-950 px-4 py-3 text-xs font-bold text-white shadow-2xl"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />{toast}</div>}

      {walkInOpen && <Modal title="Tiếp nhận khách vãng lai" description="Tạo lịch tại quầy và check-in khách ngay lập tức." onClose={() => setWalkInOpen(false)}><form onSubmit={submitWalkIn} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Tên khách hàng *"><input value={walkIn.customer} onChange={(event) => setWalkIn({ ...walkIn, customer: event.target.value })} className="reception-input" placeholder="Nguyễn Minh Anh" autoFocus /></Field><Field label="Số điện thoại *"><input value={walkIn.phone} onChange={(event) => setWalkIn({ ...walkIn, phone: event.target.value })} className="reception-input" placeholder="09xx xxx xxx" /></Field><Field label="Dịch vụ"><select value={walkIn.service} onChange={(event) => setWalkIn({ ...walkIn, service: event.target.value })} className="reception-input"><option>Gel Manicure</option><option>Pedicure Spa</option><option>Nail Art Premium</option><option>Combo Manicure</option><option>Sơn gel Hàn Quốc</option></select></Field><Field label="Kỹ thuật viên"><select value={walkIn.staff} onChange={(event) => setWalkIn({ ...walkIn, staff: event.target.value })} className="reception-input"><option>Chưa phân công</option><option>Thảo Nguyễn</option><option>Minh Châu</option><option>Hà My</option><option>Quốc Bảo</option><option>Thuỳ Dương</option></select></Field><Field label="Giờ bắt đầu"><input type="time" value={walkIn.start} onChange={(event) => setWalkIn({ ...walkIn, start: event.target.value })} className="reception-input" /></Field><Field label="Thời lượng"><select value={walkIn.duration} onChange={(event) => setWalkIn({ ...walkIn, duration: event.target.value })} className="reception-input"><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option><option value="120">120 phút</option></select></Field><Field label="Giá dự kiến"><input type="number" min="0" value={walkIn.price} onChange={(event) => setWalkIn({ ...walkIn, price: event.target.value })} className="reception-input" /></Field></div><Field label="Ghi chú"><textarea value={walkIn.note} onChange={(event) => setWalkIn({ ...walkIn, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Dị ứng, sở thích hoặc yêu cầu đặc biệt..." /></Field>{formError && <p className="text-xs font-bold text-rose-600">{formError}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setWalkInOpen(false)} className="rounded-xl border border-brand-outline px-4 py-2.5 text-xs font-bold">Hủy</button><button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white">Tạo & check-in</button></div></form></Modal>}

      {paymentAppointment && <Modal title="Thu tiền tại quầy" description={`${paymentAppointment.customer} · ${paymentAppointment.service}`} onClose={() => setPaymentAppointment(null)}><form onSubmit={submitPayment} className="space-y-4"><div className="rounded-2xl bg-brand-surface-high p-4"><div className="flex justify-between text-xs text-brand-text-muted"><span>Giá dịch vụ</span><span>{money(paymentAppointment.price)}</span></div><div className="mt-2 flex justify-between text-xs text-brand-text-muted"><span>Đã đặt cọc</span><span>- {money(paymentAppointment.deposit)}</span></div><div className="mt-3 flex justify-between border-t border-brand-outline pt-3 text-sm font-black"><span>Còn lại</span><span>{money(Math.max(0, paymentAppointment.price - paymentAppointment.deposit - Number(paymentForm.discount || 0) + Number(paymentForm.tip || 0)))}</span></div></div><Field label="Phương thức thanh toán"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(methodMeta).map(([value, meta]) => { const Icon = meta.icon; return <button key={value} type="button" onClick={() => setPaymentForm({ ...paymentForm, method: value as PaymentMethod })} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold ${paymentForm.method === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-brand-outline text-brand-text-muted'}`}><Icon className="h-4 w-4" />{meta.label}</button>; })}</div></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Giảm giá"><input type="number" min="0" value={paymentForm.discount} onChange={(event) => setPaymentForm({ ...paymentForm, discount: event.target.value })} className="reception-input" /></Field><Field label="Tiền tip"><input type="number" min="0" value={paymentForm.tip} onChange={(event) => setPaymentForm({ ...paymentForm, tip: event.target.value })} className="reception-input" /></Field></div>{paymentForm.method !== 'CASH' && <Field label="Mã giao dịch *"><input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} className="reception-input" placeholder="Nhập mã từ cổng thanh toán" /></Field>}{formError && <p className="text-xs font-bold text-rose-600">{formError}</p>}<button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white"><ShieldCheck className="h-4 w-4" /> Xác nhận thanh toán & hoàn tất</button></form></Modal>}

      {shiftModal && <Modal title={shiftModal === 'OPEN' ? 'Mở ca lễ tân' : 'Chốt ca lễ tân'} description={shiftModal === 'OPEN' ? 'Ghi nhận số tiền mặt đầu ca.' : 'Đếm quỹ tiền mặt trước khi kết thúc ca.'} onClose={() => setShiftModal(null)}><form onSubmit={submitShift} className="space-y-4"><Field label={shiftModal === 'OPEN' ? 'Tiền quỹ đầu ca' : 'Tiền mặt thực tế cuối ca'}><input type="number" min="0" step="1000" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className="reception-input" autoFocus /></Field>{shiftModal === 'CLOSE' && <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">Hệ thống sẽ lưu thời điểm chốt ca và số tiền thực tế để quản lý đối soát.</div>}{formError && <p className="text-xs font-bold text-rose-600">{formError}</p>}<button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white">{shiftModal === 'OPEN' ? 'Xác nhận mở ca' : 'Xác nhận chốt ca'}</button></form></Modal>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">{label}</span>{children}</label>;
}
