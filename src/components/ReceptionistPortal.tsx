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
  Minus,
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
type InvoiceLineType = 'SERVICE' | 'PRODUCT';

interface InvoiceLineDraft {
  id: string;
  type: InvoiceLineType;
  name: string;
  quantity: number;
  unitPrice: number;
  staff: string;
}

interface CatalogItem {
  name: string;
  price: number;
  category: string;
  duration?: number;
  stock?: number;
}

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
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

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

const serviceCatalog: CatalogItem[] = [
  { name: 'Gel Manicure', price: 450000, category: 'Sơn móng', duration: 60 },
  { name: 'Pedicure Spa', price: 550000, category: 'Chăm sóc móng', duration: 75 },
  { name: 'Sơn gel Hàn Quốc', price: 620000, category: 'Sơn móng', duration: 60 },
  { name: 'Nail Art cơ bản', price: 400000, category: 'Vẽ nghệ thuật', duration: 45 },
  { name: 'Nail Art Premium', price: 980000, category: 'Vẽ nghệ thuật', duration: 120 },
  { name: 'Combo Manicure', price: 620000, category: 'Combo', duration: 75 },
  { name: 'Combo VIP', price: 1650000, category: 'Combo', duration: 120 },
  { name: 'Tháo gel & phục hồi móng', price: 280000, category: 'Chăm sóc móng', duration: 40 },
  { name: 'Đắp bột', price: 850000, category: 'Đắp bột', duration: 90 },
  { name: 'Nối móng Tips', price: 750000, category: 'Nối móng', duration: 90 },
  { name: 'Đính đá nghệ thuật', price: 250000, category: 'Đính đá', duration: 30 },
  { name: 'Waxing tay', price: 320000, category: 'Waxing', duration: 30 },
];

const productCatalog: CatalogItem[] = [
  { name: 'Dầu dưỡng móng', price: 170000, category: 'Dưỡng móng', stock: 24 },
  { name: 'Kem dưỡng tay', price: 220000, category: 'Chăm sóc tay', stock: 18 },
  { name: 'Serum phục hồi móng', price: 290000, category: 'Dưỡng móng', stock: 12 },
  { name: 'Sơn dưỡng tại nhà', price: 260000, category: 'Sơn bán lẻ', stock: 16 },
  { name: 'Bộ chăm sóc móng mini', price: 390000, category: 'Bộ sản phẩm', stock: 8 },
  { name: 'Nước rửa tay dưỡng ẩm', price: 145000, category: 'Chăm sóc tay', stock: 22 },
  { name: 'Dũa móng cao cấp', price: 85000, category: 'Phụ kiện', stock: 35 },
  { name: 'Sticker Nail Art', price: 95000, category: 'Phụ kiện', stock: 28 },
];

const invoiceStaff = ['Thảo Nguyễn', 'Minh Châu', 'Hà My', 'Quốc Bảo', 'Thuỳ Dương', 'Chưa phân công'];

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

function Modal({ title, description, onClose, children, wide = false, workspace = false }: { title: string; description: string; onClose: () => void; children: ReactNode; wide?: boolean; workspace?: boolean }) {
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${workspace ? 'p-2 sm:p-4' : 'p-4'}`} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm" />
      <div className={`relative w-full border border-brand-outline bg-brand-surface shadow-2xl ${workspace ? 'flex h-[calc(100dvh-1rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl p-3 sm:h-[calc(100dvh-2rem)] sm:p-5' : `max-h-[92vh] overflow-y-auto rounded-[26px] p-4 sm:p-6 ${wide ? 'max-w-[1500px]' : 'max-w-lg'}`}`}>
        <div className={`${workspace ? 'mb-3 shrink-0 sm:mb-4' : 'mb-5'} flex items-start justify-between gap-4`}>
          <div>
            <h2 className="text-lg font-black tracking-tight text-brand-text">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-brand-text-muted">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-brand-outline p-2 text-brand-text-muted hover:bg-brand-surface-high" aria-label="Đóng hộp thoại"><X className="h-4 w-4" /></button>
        </div>
        <div className={workspace ? 'min-h-0 flex-1' : undefined}>{children}</div>
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
  const [paymentForm, setPaymentForm] = useState({ method: 'CASH' as PaymentMethod, discount: '0', tip: '0', reference: '', note: '' });
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineDraft[]>([]);
  const [invoiceCatalogTab, setInvoiceCatalogTab] = useState<InvoiceLineType>('SERVICE');
  const [invoiceCatalogQuery, setInvoiceCatalogQuery] = useState('');
  const [invoiceCategory, setInvoiceCategory] = useState('Tất cả');
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
  const invoiceSubtotal = invoiceLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const invoiceDiscount = Math.max(0, Number(paymentForm.discount) || 0);
  const invoiceTip = Math.max(0, Number(paymentForm.tip) || 0);
  const invoiceTotal = Math.max(0, invoiceSubtotal - (paymentAppointment?.deposit || 0) - invoiceDiscount + invoiceTip);
  const activeCatalog = invoiceCatalogTab === 'SERVICE' ? serviceCatalog : productCatalog;
  const invoiceCategories = ['Tất cả', ...Array.from(new Set(activeCatalog.map((item) => item.category)))];
  const filteredCatalog = activeCatalog.filter((item) => (
    (invoiceCategory === 'Tất cả' || item.category === invoiceCategory)
    && item.name.toLowerCase().includes(invoiceCatalogQuery.trim().toLowerCase())
  ));

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
    const selectedServices = appointment.services?.length ? appointment.services : [appointment.service];
    const splitPrice = Math.floor(appointment.price / selectedServices.length);
    setInvoiceLines(selectedServices.map((name, index) => ({
      id: `${makeId('LINE')}-${index}`,
      type: 'SERVICE',
      name,
      quantity: 1,
      unitPrice: index === selectedServices.length - 1 ? appointment.price - splitPrice * index : splitPrice,
      staff: appointment.staff,
    })));
    setPaymentForm({ method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
    setInvoiceCatalogTab('SERVICE');
    setInvoiceCatalogQuery('');
    setInvoiceCategory('Tất cả');
    setFormError('');
  };

  const addCatalogItem = (type: InvoiceLineType, item: CatalogItem) => {
    setInvoiceLines((current) => {
      const existing = current.find((line) => line.type === type && line.name === item.name && (type === 'PRODUCT' || line.staff === paymentAppointment?.staff));
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, {
        id: makeId('LINE'),
        type,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        staff: type === 'SERVICE' ? paymentAppointment?.staff || 'Chưa phân công' : 'Quầy bán lẻ',
      }];
    });
    setFormError('');
  };

  const removeCatalogItem = (type: InvoiceLineType, item: CatalogItem) => {
    setInvoiceLines((current) => {
      const existing = current.find((line) => line.type === type && line.name === item.name && (type === 'PRODUCT' || line.staff === paymentAppointment?.staff));
      if (!existing) return current;
      if (existing.quantity <= 1) {
        return current.filter((line) => line.id !== existing.id);
      }
      return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity - 1 } : line);
    });
    setFormError('');
  };

  const updateInvoiceLine = (id: string, patch: Partial<InvoiceLineDraft>) => {
    setInvoiceLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  };

  const submitPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!paymentAppointment) return;
    if (!invoiceLines.length) return setFormError('Hóa đơn phải có ít nhất một dịch vụ hoặc sản phẩm.');
    if (invoiceLines.some((line) => !line.name.trim() || !Number.isInteger(line.quantity) || line.quantity < 1 || line.unitPrice < 0)) return setFormError('Vui lòng kiểm tra tên, số lượng và đơn giá của từng dòng.');
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discount = Math.max(0, Number(paymentForm.discount) || 0);
    const tip = Math.max(0, Number(paymentForm.tip) || 0);
    if (discount > subtotal) return setFormError('Giảm giá không được lớn hơn tổng tiền hàng.');
    const grandTotal = Math.max(0, subtotal - discount + tip);
    const amountDue = Math.max(0, grandTotal - paymentAppointment.deposit);
    if (paymentForm.method !== 'CASH' && !paymentForm.reference.trim()) return setFormError('Vui lòng nhập mã giao dịch để đối soát.');
    const timestamp = new Date();
    const payment: ReceptionPayment = {
      id: makeId('INV'), appointmentId: paymentAppointment.id, customer: paymentAppointment.customer, phone: paymentAppointment.phone,
      branch: paymentAppointment.branch, createdAt: `${timestamp.toLocaleDateString('vi-VN')} · ${nowTime()}`,
      subtotal, discount, tip, deposit: paymentAppointment.deposit, total: grandTotal, paid: grandTotal,
      refunded: 0, status: 'PAID', method: paymentForm.method, reference: paymentForm.reference.trim() || undefined,
      cashier: account.displayName, source: 'POS tại quầy',
      items: invoiceLines.map((line) => ({ name: line.name.trim(), quantity: line.quantity, amount: line.quantity * line.unitPrice, staff: line.staff })),
      note: paymentForm.note.trim() || undefined,
      audit: [`${nowTime()} · ${account.displayName} xác nhận ${invoiceLines.length} dòng hàng và thanh toán ${methodMeta[paymentForm.method].label}`],
    };
    setPayments((current) => [payment, ...current]);
    const serviceNames = invoiceLines.filter((line) => line.type === 'SERVICE').map((line) => line.name.trim());
    setAppointments((current) => current.map((item) => item.id === paymentAppointment.id ? {
      ...item,
      status: 'COMPLETED',
      service: serviceNames.join(' + ') || item.service,
      services: serviceNames.length ? serviceNames : item.services,
      price: subtotal,
    } : item));
    setPaymentAppointment(null);
    setToast(`Đã thu ${money(amountDue)} từ ${payment.customer}.`);
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

      {paymentAppointment && (
        <Modal
          wide
          workspace
          title="Tạo hóa đơn & thanh toán"
          description={`${paymentAppointment.customer} · ${paymentAppointment.phone} · ${branchName}`}
          onClose={() => setPaymentAppointment(null)}
        >
          <form onSubmit={submitPayment} className="grid h-full min-h-0 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:overflow-hidden">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface-high/25 lg:flex lg:min-h-0 lg:flex-col">
              <div className="shrink-0 border-b border-brand-outline p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-brand-text">Chọn dịch vụ hoặc sản phẩm</h3>
                    <p className="mt-1 text-[10px] text-brand-text-muted">Nhấn vào một mục để thêm nhanh vào hóa đơn.</p>
                  </div>
                  <div className="flex rounded-xl border border-brand-outline bg-brand-surface p-1">
                    <button type="button" onClick={() => { setInvoiceCatalogTab('SERVICE'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-4 py-2 text-[10px] font-black transition ${invoiceCatalogTab === 'SERVICE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-brand-text-muted'}`}>Dịch vụ</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('PRODUCT'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-4 py-2 text-[10px] font-black transition ${invoiceCatalogTab === 'PRODUCT' ? 'bg-blue-600 text-white shadow-sm' : 'text-brand-text-muted'}`}>Sản phẩm</button>
                  </div>
                </div>
                <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={invoiceCatalogQuery} onChange={(event) => setInvoiceCatalogQuery(event.target.value)} className="reception-input pl-10" placeholder={invoiceCatalogTab === 'SERVICE' ? 'Tìm tên dịch vụ...' : 'Tìm tên sản phẩm...'} /></div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {invoiceCategories.map((category) => <button key={category} type="button" onClick={() => setInvoiceCategory(category)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-bold ${invoiceCategory === category ? (invoiceCatalogTab === 'SERVICE' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-blue-600 bg-blue-600 text-white') : 'border-brand-outline bg-brand-surface text-brand-text-muted'}`}>{category}</button>)}
                </div>
              </div>

              <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-3">
                {filteredCatalog.map((item, index) => {
                  const count = invoiceLines.filter((line) => line.type === invoiceCatalogTab && line.name === item.name).reduce((sum, line) => sum + line.quantity, 0);
                  return (
                    <div
                      key={item.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          addCatalogItem(invoiceCatalogTab, item);
                        }
                      }}
                      className="group relative flex min-h-[170px] flex-col rounded-2xl border border-brand-outline bg-brand-surface p-4 text-left shadow-sm transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {count > 0 && <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[9px] font-black text-white">{count}</span>}
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? 'bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-800' : 'bg-gradient-to-br from-blue-100 to-violet-100 text-blue-800'}`}>{String(index + 1).padStart(2, '0')}</span>
                      <span className="mt-3 line-clamp-2 text-xs font-black leading-5 text-brand-text">{item.name}</span>
                      <span className="mt-1 text-[9px] font-semibold text-brand-text-muted">{item.category}</span>
                      <span className="mt-auto flex items-end justify-between gap-3 pt-3">
                        <span>
                          <span className={`block text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? 'text-emerald-700' : 'text-blue-700'}`}>{money(item.price)}</span>
                          <span className="mt-0.5 block text-[8px] text-brand-text-muted">{invoiceCatalogTab === 'SERVICE' ? `${item.duration} phút` : `Còn ${item.stock} sản phẩm`}</span>
                        </span>
                        {count > 0 ? (
                          <span className="flex items-center gap-1.5 shrink-0 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => removeCatalogItem(invoiceCatalogTab, item)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text hover:bg-brand-surface-high transition-all duration-200 cursor-pointer shadow-sm"
                              aria-label="Giảm số lượng"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[11px] font-black w-5 text-center text-brand-text">{count}</span>
                            <button
                              type="button"
                              onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                              className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm ${invoiceCatalogTab === 'SERVICE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                              aria-label="Tăng số lượng"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 group-hover:scale-105 shrink-0 ${invoiceCatalogTab === 'SERVICE' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                            <Plus className="h-4 w-4" />
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
                {!filteredCatalog.length && <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">Không tìm thấy mục phù hợp.</div>}
              </div>
            </section>

            <aside className="min-w-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
              {/* Thẻ 1: Khách hàng & Bảng danh sách dịch vụ đã chọn (Vừa khít chiều rộng, không cuộn ngang) */}
              <div className="selected-services rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-sm flex flex-col w-full min-w-0 lg:flex-1 lg:min-h-[280px] min-h-[280px] overflow-hidden overflow-x-hidden">
                <div className="flex items-center gap-3 border-b border-brand-outline pb-3 shrink-0 w-full min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-sm shadow-sm">
                    {paymentAppointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-black text-brand-text">{paymentAppointment.customer}</p>
                      <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">Đã check-in</span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-brand-text-muted">{paymentAppointment.phone} · ID: {paymentAppointment.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[8px] font-black text-violet-700">{branchCode}</span>
                </div>

                <div className="mt-3 flex items-center justify-between shrink-0 pb-2 w-full min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ReceiptText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <h3 className="text-xs font-black text-brand-text truncate">Danh sách dịch vụ đã chọn</h3>
                  </div>
                  <span className="rounded-full bg-brand-surface-high px-2 py-0.5 text-[9px] font-bold text-brand-text-muted shrink-0">{invoiceLines.length} mục</span>
                </div>

                {/* Khung Bảng dịch vụ (overflow-x-hidden) */}
                <div className="service-list-container mt-1 flex-1 flex flex-col min-h-[200px] w-full min-w-0 overflow-hidden overflow-x-hidden rounded-xl border border-brand-outline/60 bg-brand-surface-high/20">
                  {/* Hàng tiêu đề Bảng (Hiện trên xl:) */}
                  <div className="hidden xl:grid grid-cols-[44px_minmax(120px,1fr)_minmax(130px,160px)_120px_minmax(100px,120px)_32px] items-center gap-2.5 px-3 py-2 text-[9px] font-extrabold uppercase tracking-wider text-brand-text-muted border-b border-brand-outline bg-brand-surface-high/50 shrink-0 w-full min-w-0">
                    <span className="text-center min-w-0">STT</span>
                    <span className="min-w-0">Tên dịch vụ</span>
                    <span className="min-w-0">Kỹ thuật viên</span>
                    <span className="text-center min-w-0">Số lượng</span>
                    <span className="text-right min-w-0">Thành tiền</span>
                    <span className="text-center min-w-0">Xóa</span>
                  </div>

                  {/* Vùng cuộn các dòng Bảng (Chỉ cuộn dọc, cấm cuộn ngang) */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 divide-y divide-brand-outline/40 scrollbar-thin scrollbar-thumb-brand-outline/60 px-1 py-0.5">
                    {invoiceLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="w-full min-w-0 text-xs transition-colors hover:bg-brand-surface-high/40 p-2.5 sm:px-3 sm:py-3 shrink-0"
                      >
                        {/* 1-Row Grid Layout chuẩn xác trên xl: */}
                        <div className="hidden xl:grid grid-cols-[44px_minmax(120px,1fr)_minmax(130px,160px)_120px_minmax(100px,120px)_32px] items-center gap-2.5 w-full min-w-0">
                          {/* STT: 44px */}
                          <div className="flex justify-center items-center min-w-0">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black border ${line.type === 'SERVICE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Tên dịch vụ: minmax(120px, 1fr) */}
                          <div className="min-w-0 pr-1" title={line.name}>
                            <p className="font-bold text-brand-text text-xs leading-snug line-clamp-2 min-w-0">
                              {line.name}
                            </p>
                          </div>

                          {/* Kỹ thuật viên: minmax(130px, 160px) */}
                          <div className="min-w-0 w-full">
                            {line.type === 'SERVICE' ? (
                              <select
                                value={line.staff}
                                onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                className={`h-9 w-full min-w-0 rounded-xl border px-2 text-xs font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                  line.staff === 'Chưa phân công'
                                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                                    : 'border-brand-outline bg-brand-surface-high/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                }`}
                                aria-label={`Kỹ thuật viên cho ${line.name}`}
                              >
                                {invoiceStaff.map((staff) => (
                                  <option key={staff} value={staff}>{staff}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="h-9 w-full min-w-0 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                                Sản phẩm
                              </div>
                            )}
                          </div>

                          {/* Số lượng: 120px */}
                          <div className="min-w-0 w-full flex justify-center">
                            <div className="flex h-8 w-full min-w-0 items-center justify-between rounded-xl border border-brand-outline bg-brand-surface-high/60 p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                                aria-label={`Giảm số lượng ${line.name}`}
                              >
                                −
                              </button>
                              <span className="text-xs font-black text-brand-text flex-1 text-center min-w-0">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                                aria-label={`Tăng số lượng ${line.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Thành tiền: minmax(100px, 120px) */}
                          <div className="min-w-0 w-full text-right">
                            <strong className="block text-xs font-bold text-brand-text tracking-tight min-w-0 truncate">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>

                          {/* Xóa: 32px */}
                          <div className="min-w-0 w-[32px] flex justify-center">
                            <button
                              type="button"
                              onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500/15 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition-all"
                              title="Xóa dịch vụ"
                              aria-label={`Xóa ${line.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Responsive 2-Row Layout Fallback khi khung hẹp (< xl) */}
                        <div className="xl:hidden flex flex-col gap-2 w-full min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black border ${line.type === 'SERVICE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <p className="font-bold text-brand-text text-xs leading-snug line-clamp-2 min-w-0" title={line.name}>
                                {line.name}
                              </p>
                            </div>
                            <strong className="text-xs font-bold text-brand-text shrink-0 text-right">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-outline/20 min-w-0">
                            <div className="min-w-0 flex-1 max-w-[160px]">
                              {line.type === 'SERVICE' ? (
                                <select
                                  value={line.staff}
                                  onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                  className={`h-8 w-full min-w-0 rounded-lg border px-2 text-[11px] font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                    line.staff === 'Chưa phân công'
                                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                                      : 'border-brand-outline bg-brand-surface-high/80'
                                  }`}
                                >
                                  {invoiceStaff.map((staff) => (
                                    <option key={staff} value={staff}>{staff}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">Sản phẩm</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex h-7 items-center rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5">
                                <button type="button" onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })} className="h-6 w-6 text-xs font-black text-brand-text-muted hover:text-brand-text flex items-center justify-center">−</button>
                                <span className="w-5 text-center text-xs font-black text-brand-text">{line.quantity}</span>
                                <button type="button" onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })} className="h-6 w-6 text-xs font-black text-brand-text-muted hover:text-brand-text flex items-center justify-center">+</button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500/15"
                                title="Xóa dịch vụ"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!invoiceLines.length && (
                      <div className="py-12 text-center text-xs text-brand-text-muted">
                        Chưa chọn dịch vụ hoặc sản phẩm nào.<br />Nhấn vào danh mục bên trái để thêm vào hóa đơn.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Đối soát tổng quan chi phí & Giảm giá / Tip */}
              <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm space-y-2.5 text-[10px] lg:shrink-0">
                <div className="flex items-center justify-between text-brand-text-muted">
                  <span>Tạm tính ({invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục)</span>
                  <strong className="text-brand-text text-[10px]">{money(invoiceSubtotal)}</strong>
                </div>

                {paymentAppointment.deposit > 0 && (
                  <div className="flex items-center justify-between text-brand-text-muted">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tiền cọc đã trả</span>
                    <strong className="text-emerald-600 font-bold text-[10px]">- {money(paymentAppointment.deposit)}</strong>
                  </div>
                )}

                <div className="space-y-1 pt-1 border-t border-brand-outline/40">
                  <div className="flex justify-between items-center text-brand-text-muted">
                    <span className="font-medium">Giảm giá / Ưu đãi</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-rose-500">-</span>
                      <input type="number" min="0" step="1000" value={paymentForm.discount} onChange={(event) => setPaymentForm({ ...paymentForm, discount: event.target.value })} className="w-[80px] rounded-lg border border-brand-outline bg-brand-surface-high/50 py-1 px-2 text-right text-[10px] font-black text-brand-text outline-none focus:border-emerald-500 focus:bg-brand-surface focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-brand-text-muted/50" placeholder="0" />
                      <span className="font-bold text-brand-text">đ</span>
                    </div>
                  </div>
                  <div className="flex gap-1 justify-end">
                    {[0, 20000, 50000, 100000].map((val) => (
                      <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, discount: String(val) })} className={`rounded px-1.5 py-0.5 text-[8px] font-bold transition ${Number(paymentForm.discount) === val ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30' : 'bg-brand-surface-high text-brand-text-muted hover:text-brand-text'}`}>
                        {val === 0 ? 'K.Giảm' : `-${val / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-brand-text-muted">
                    <span className="font-medium">Tiền tip KTV</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-emerald-500">+</span>
                      <input type="number" min="0" step="1000" value={paymentForm.tip} onChange={(event) => setPaymentForm({ ...paymentForm, tip: event.target.value })} className="w-[80px] rounded-lg border border-brand-outline bg-brand-surface-high/50 py-1 px-2 text-right text-[10px] font-black text-brand-text outline-none focus:border-emerald-500 focus:bg-brand-surface focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-brand-text-muted/50" placeholder="0" />
                      <span className="font-bold text-brand-text">đ</span>
                    </div>
                  </div>
                  <div className="flex gap-1 justify-end">
                    {[0, 20000, 50000, 100000].map((val) => (
                      <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, tip: String(val) })} className={`rounded px-1.5 py-0.5 text-[8px] font-bold transition ${Number(paymentForm.tip) === val ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-brand-surface-high text-brand-text-muted hover:text-brand-text'}`}>
                        {val === 0 ? 'K.Tip' : `+${val / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-teal-950/40 border border-emerald-500/30 p-3 mt-2 shadow-inner">
                  <div>
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">Tổng cần thanh toán</span>
                    <span className="text-[8px] text-brand-text-muted">Đã đối soát cọc & ưu đãi</span>
                  </div>
                  <strong className="text-2xl font-black tracking-tight text-emerald-400">{money(invoiceTotal)}</strong>
                </div>
              </div>

              {/* Thẻ 3: Phương thức & Xác nhận thanh toán */}
              <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm space-y-3 lg:shrink-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">Phương thức thanh toán</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(methodMeta).map(([value, meta]) => {
                    const Icon = meta.icon;
                    const selected = paymentForm.method === value;
                    return (
                      <button key={value} type="button" onClick={() => setPaymentForm({ ...paymentForm, method: value as PaymentMethod })} className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-[8px] font-bold transition-all ${selected ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm' : 'border-brand-outline text-brand-text-muted hover:bg-brand-surface-high'}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                {paymentForm.method !== 'CASH' && (
                  <input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} className="reception-input h-8 text-[10px]" placeholder="Mã giao dịch chuyển khoản / thẻ *" />
                )}
                <textarea value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} className="reception-input min-h-[50px] text-[10px] resize-none" placeholder="Ghi chú hóa đơn (không bắt buộc)..." />
                {formError && <p role="alert" className="rounded-xl bg-rose-50 p-2.5 text-[9px] font-bold leading-4 text-rose-700">{formError}</p>}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-[0.99]">
                  <ShieldCheck className="h-4 w-4" /> Thanh toán {money(invoiceTotal)}
                </button>
              </div>
            </aside>
          </form>
        </Modal>
      )}

      {shiftModal && <Modal title={shiftModal === 'OPEN' ? 'Mở ca lễ tân' : 'Chốt ca lễ tân'} description={shiftModal === 'OPEN' ? 'Ghi nhận số tiền mặt đầu ca.' : 'Đếm quỹ tiền mặt trước khi kết thúc ca.'} onClose={() => setShiftModal(null)}><form onSubmit={submitShift} className="space-y-4"><Field label={shiftModal === 'OPEN' ? 'Tiền quỹ đầu ca' : 'Tiền mặt thực tế cuối ca'}><input type="number" min="0" step="1000" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className="reception-input" autoFocus /></Field>{shiftModal === 'CLOSE' && <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">Hệ thống sẽ lưu thời điểm chốt ca và số tiền thực tế để quản lý đối soát.</div>}{formError && <p className="text-xs font-bold text-rose-600">{formError}</p>}<button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white">{shiftModal === 'OPEN' ? 'Xác nhận mở ca' : 'Xác nhận chốt ca'}</button></form></Modal>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">{label}</span>{children}</label>;
}
