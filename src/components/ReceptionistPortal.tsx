import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  Armchair,
  ArrowUpRight,
  Banknote,
  Bell,
  BadgeCheck,
  CalendarCheck2,
  CalendarClock,
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
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Phone,
  PackageSearch,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  TimerReset,
  Trash2,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';
import { resetTenantMockStorage } from '../utils/mockDataReset';

const TenantAdminAppointments = lazy(() => import('./TenantAdminAppointments'));
const TenantAdminCustomers = lazy(() => import('./TenantAdminCustomers'));
const TenantAdminPayments = lazy(() => import('./TenantAdminPayments'));
const ReceptionistProducts = lazy(() => import('./ReceptionistProducts'));
const ReceptionistStations = lazy(() => import('./ReceptionistStations'));
const ReceptionistTechnicians = lazy(() => import('./ReceptionistTechnicians'));

type ReceptionPage = 'desk' | 'appointments' | 'customers' | 'products' | 'stations' | 'technicians' | 'payments';
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type AppointmentSource = 'ONLINE' | 'RECEPTION' | 'PHONE' | 'ZALO';
type BranchCode = 'Q1' | 'Q3';
type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';
type InvoiceLineType = 'SERVICE' | 'PRODUCT';
type TechnicianStatus = 'PRESENT' | 'NOT_CHECKED_IN' | 'SERVING' | 'BREAK' | 'SICK_REPORTED' | 'ON_LEAVE' | 'LATE';
type TechnicianShift = 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
type DeskQueueFilter = 'ACTION' | 'UPCOMING' | 'WAITING' | 'IN_SERVICE';

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

interface ReceptionTechnician {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  skills: string[];
  shift: TechnicianShift;
  shiftLabel: string;
  status: TechnicianStatus;
  branch: BranchCode;
  checkIn?: string;
  checkOut?: string;
  leaveNote?: string;
  avatarTone: string;
}

interface TechnicianEditForm {
  status: TechnicianStatus;
  shift: TechnicianShift;
  checkIn: string;
  checkOut: string;
  leaveNote: string;
}

interface AppointmentEditForm {
  customer: string;
  phone: string;
  service: string;
  staff: string;
  station: string;
  start: string;
  duration: string;
  price: string;
  note: string;
}

interface ReceptionistPortalProps {
  account: DemoAccount;
  themeMode: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const seedAppointments = (): ReceptionAppointment[] => {
  const currentDate = today();
  const previousDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const nextDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const createdAt = new Date().toISOString();

  return [
    { id: 'APT-2101', customerId: 'CUS-1842', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: currentDate, start: '08:15', duration: 90, service: 'Gel Manicure + Nail Art cơ bản', services: ['Gel Manicure', 'Nail Art cơ bản'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'COMPLETED', price: 850000, deposit: 300000, note: 'Khách VIP, đã dùng ưu đãi thành viên 50.000đ.', station: 'M-01', reminderSent: true, createdBy: 'Website', createdAt },
    { id: 'APT-2102', customerId: 'CUS-1796', customer: 'Trần Thu Hà', phone: '0908 337 912', date: currentDate, start: '09:30', duration: 75, service: 'Pedicure Spa + Sơn gel Hàn Quốc', services: ['Pedicure Spa', 'Sơn gel Hàn Quốc'], staff: 'Minh Châu', branch: 'Q3', source: 'PHONE', status: 'CHECKED_IN', price: 1170000, deposit: 200000, note: 'Không dùng tinh dầu bạc hà.', station: 'P-02', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2103', customer: 'Lê Phương Anh', phone: '0901 486 320', date: currentDate, start: '10:30', duration: 120, service: 'Nail Art Premium', services: ['Nail Art Premium'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ZALO', status: 'IN_SERVICE', price: 980000, deposit: 0, note: 'Mẫu chrome bạc, khách đã gửi ảnh tham khảo.', station: 'M-04', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2104', customer: 'Mai Đức Anh', phone: '0939 772 618', date: currentDate, start: '11:45', duration: 60, service: 'Combo Manicure', services: ['Combo Manicure'], staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'PENDING', price: 620000, deposit: 0, note: 'Khách vãng lai, cần xác nhận dịch vụ trước khi làm.', createdBy: 'Lê Hoàng Nam', firstVisit: true, createdAt },
    { id: 'APT-2105', customer: 'Phạm Hoài Nam', phone: '0977 660 341', date: currentDate, start: '13:00', duration: 40, service: 'Tháo gel & phục hồi móng', services: ['Tháo gel & phục hồi móng'], staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'CONFIRMED', price: 280000, deposit: 0, note: 'Da tay nhạy cảm, dùng sản phẩm không mùi.', station: 'M-03', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2106', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', date: currentDate, start: '14:00', duration: 90, service: 'Nối móng Tips + Đính đá nghệ thuật', services: ['Nối móng Tips', 'Đính đá nghệ thuật'], staff: 'Minh Châu', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1000000, deposit: 300000, note: 'Chuẩn bị mẫu đính đá tone champagne.', station: 'VIP-02', reminderSent: true, createdBy: 'Website', createdAt },
    { id: 'APT-2107', customer: 'Đỗ Tuấn Kiệt', phone: '0918 734 662', date: currentDate, start: '15:30', duration: 30, service: 'Waxing tay', services: ['Waxing tay'], staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'CANCELLED', price: 320000, deposit: 0, note: 'Khách đổi sang ngày mai.', createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2108', customer: 'Tạ Mỹ Duyên', phone: '0933 112 800', date: currentDate, start: '16:15', duration: 90, service: 'Đắp bột', services: ['Đắp bột'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ZALO', status: 'NO_SHOW', price: 850000, deposit: 0, note: 'Đã gọi 2 lần chưa nghe máy.', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2111', customerId: 'CUS-2050', customer: 'Đinh Gia Hân', phone: '0902 826 114', date: currentDate, start: '09:00', duration: 120, service: 'Combo VIP', services: ['Combo VIP'], staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'CONFIRMED', price: 1650000, deposit: 500000, note: 'Chuẩn bị phòng VIP.', station: 'V-11', reminderSent: true, createdBy: 'Website', createdAt },
    { id: 'APT-2112', customer: 'Vũ Ngọc Linh', phone: '0934 128 906', date: currentDate, start: '10:45', duration: 60, service: 'Sơn gel Hàn Quốc', services: ['Sơn gel Hàn Quốc'], staff: 'Thuỳ Dương', branch: 'Q1', source: 'PHONE', status: 'CHECKED_IN', price: 620000, deposit: 0, note: 'Khách muốn màu đỏ rượu.', createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2113', customer: 'Ngô Minh Châu', phone: '0966 124 700', date: currentDate, start: '14:30', duration: 120, service: 'Nail Art Premium', services: ['Nail Art Premium'], staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'PENDING', price: 980000, deposit: 200000, note: 'Khách mới, cần tư vấn tình trạng móng.', firstVisit: true, createdBy: 'Website', createdAt },
    { id: 'APT-2098', customer: 'Hoàng Bảo Ngọc', phone: '0907 211 842', date: previousDate, start: '17:00', duration: 75, service: 'Combo Manicure', services: ['Combo Manicure'], staff: 'Minh Châu', branch: 'Q3', source: 'RECEPTION', status: 'COMPLETED', price: 620000, deposit: 0, note: 'Đã hoàn tất hôm qua.', station: 'M-02', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2120', customer: 'Huỳnh Phương Thảo', phone: '0905 811 229', date: nextDate, start: '09:30', duration: 120, service: 'Combo VIP', services: ['Combo VIP'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1650000, deposit: 500000, note: 'Khách cần hoàn tất trước 12:00.', station: 'VIP-01', reminderSent: true, createdBy: 'Website', createdAt },
    { id: 'APT-2121', customer: 'Phan Gia Hân', phone: '0974 360 118', date: nextDate, start: '13:00', duration: 60, service: 'Gel Manicure', services: ['Gel Manicure'], staff: 'Thuỳ Dương', branch: 'Q1', source: 'PHONE', status: 'PENDING', price: 450000, deposit: 0, note: '', reminderSent: false, createdBy: 'Lê Hoàng Nam', createdAt },
  ];
};

const seedPayments = (): ReceptionPayment[] => {
  const todayLabel = new Date().toLocaleDateString('vi-VN');
  const yesterdayLabel = new Date(Date.now() - 86_400_000).toLocaleDateString('vi-VN');

  return [
    { id: 'INV-9001', appointmentId: 'APT-2101', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', branch: 'Q3', createdAt: `${todayLabel} · 09:58`, subtotal: 1020000, discount: 50000, tip: 100000, deposit: 300000, total: 1070000, paid: 1070000, refunded: 0, status: 'PAID', method: 'MOMO', reference: 'MOMO-DEMO-9001', cashier: 'Lê Hoàng Nam', source: 'POS tại quầy', items: [{ name: 'Gel Manicure', quantity: 1, amount: 450000, staff: 'Thảo Nguyễn' }, { name: 'Nail Art cơ bản', quantity: 1, amount: 400000, staff: 'Thảo Nguyễn' }, { name: 'Dầu dưỡng móng', quantity: 1, amount: 170000, staff: 'Quầy bán lẻ' }], note: 'Áp dụng ưu đãi thành viên thân thiết.', audit: ['09:58 · Thu MoMo thành công', '09:55 · Áp dụng ưu đãi 50.000đ', '08:15 · Đối soát tiền cọc 300.000đ'] },
    { id: 'INV-9002', appointmentId: 'APT-2102', customer: 'Trần Thu Hà', phone: '0908 337 912', branch: 'Q3', createdAt: `${todayLabel} · 10:08`, subtotal: 1170000, discount: 0, tip: 0, deposit: 200000, total: 1170000, paid: 200000, refunded: 0, status: 'PARTIAL', method: 'BANK', reference: 'DEP-DEMO-9002', cashier: 'Lê Hoàng Nam', source: 'Lịch hẹn tại quầy', items: [{ name: 'Pedicure Spa', quantity: 1, amount: 550000, staff: 'Minh Châu' }, { name: 'Sơn gel Hàn Quốc', quantity: 1, amount: 620000, staff: 'Minh Châu' }], note: 'Còn thu sau khi hoàn tất dịch vụ.', audit: ['10:08 · Ghi nhận tiền cọc chuyển khoản 200.000đ'] },
    { id: 'INV-9003', appointmentId: 'APT-2098', customer: 'Hoàng Bảo Ngọc', phone: '0907 211 842', branch: 'Q3', createdAt: `${yesterdayLabel} · 17:52`, subtotal: 620000, discount: 0, tip: 50000, deposit: 0, total: 670000, paid: 670000, refunded: 0, status: 'PAID', method: 'CASH', cashier: 'Lê Hoàng Nam', source: 'POS tại quầy', items: [{ name: 'Combo Manicure', quantity: 1, amount: 620000, staff: 'Minh Châu' }], audit: ['17:52 · Thu tiền mặt 670.000đ', '17:51 · Khách thêm tip 50.000đ'] },
    { id: 'INV-9004', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', branch: 'Q3', createdAt: `${todayLabel} · 14:05`, subtotal: 1000000, discount: 100000, tip: 0, deposit: 300000, total: 900000, paid: 0, refunded: 0, status: 'PENDING', cashier: 'Lê Hoàng Nam', source: 'Hóa đơn chờ thu', items: [{ name: 'Nối móng Tips', quantity: 1, amount: 750000, staff: 'Minh Châu' }, { name: 'Đính đá nghệ thuật', quantity: 1, amount: 250000, staff: 'Minh Châu' }], note: 'Voucher sinh nhật 100.000đ.', audit: ['14:05 · Tạo hóa đơn chờ thu', '14:04 · Áp dụng voucher sinh nhật'] },
    { id: 'INV-9005', customer: 'Đinh Gia Hân', phone: '0902 826 114', branch: 'Q1', createdAt: `${todayLabel} · 09:20`, subtotal: 1650000, discount: 0, tip: 0, deposit: 500000, total: 1650000, paid: 500000, refunded: 0, status: 'PARTIAL', method: 'CARD', reference: 'CARD-DEMO-9005', cashier: 'Lê Hoàng Nam', source: 'Lịch hẹn online', items: [{ name: 'Combo VIP', quantity: 1, amount: 1650000, staff: 'Hà My' }], audit: ['09:20 · Ghi nhận tiền cọc qua thẻ 500.000đ'] },
    { id: 'INV-9006', customer: 'Tạ Mỹ Duyên', phone: '0933 112 800', branch: 'Q3', createdAt: `${todayLabel} · 16:22`, subtotal: 850000, discount: 0, tip: 0, deposit: 0, total: 850000, paid: 850000, refunded: 300000, status: 'REFUNDED', method: 'BANK', reference: 'RF-DEMO-9006', cashier: 'Lê Hoàng Nam', source: 'Điều chỉnh hóa đơn', items: [{ name: 'Đắp bột', quantity: 1, amount: 850000, staff: 'Thảo Nguyễn' }], note: 'Mock hoàn tiền để test luồng refund.', audit: ['16:22 · Duyệt hoàn 300.000đ', '16:10 · Thu chuyển khoản 850.000đ'] },
  ];
};

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
const stationCatalog: Record<BranchCode, string[]> = {
  Q3: ['M-01', 'M-02', 'M-03', 'M-04', 'P-01', 'P-02', 'VIP-01', 'VIP-02'],
  Q1: ['M-11', 'M-12', 'M-13', 'P-11', 'P-12', 'V-11', 'V-12'],
};

const technicianStatusMeta: Record<TechnicianStatus, { label: string; badge: string; dot: string; helper: string }> = {
  PRESENT: { label: 'Có mặt', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', helper: 'Sẵn sàng nhận khách' },
  NOT_CHECKED_IN: { label: 'Chưa check-in', badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400', helper: 'Chưa vào ca' },
  SERVING: { label: 'Đang phục vụ', badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', helper: 'Đang có khách' },
  BREAK: { label: 'Đang nghỉ giữa ca', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', dot: 'bg-cyan-500', helper: 'Tạm ngưng nhận khách' },
  SICK_REPORTED: { label: 'Báo nghỉ', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', helper: 'Đã báo nghỉ hôm nay' },
  ON_LEAVE: { label: 'Nghỉ phép', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', helper: 'Nghỉ theo lịch phép' },
  LATE: { label: 'Đi trễ', badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500', helper: 'Check-in trễ ca' },
};

const technicianShiftMeta: Record<TechnicianShift, string> = {
  MORNING: 'Ca sáng · 08:00–16:00',
  AFTERNOON: 'Ca chiều · 12:00–20:00',
  FULL_DAY: 'Ca nguyên ngày · 08:00–20:00',
};

const technicianSeed: ReceptionTechnician[] = [
  { id: 'TECH-001', name: 'Thảo Nguyễn', initials: 'TN', specialty: 'Nail Art Premium', skills: ['Nail Art Premium', 'Nail Art cơ bản', 'Gel Manicure', 'Đính đá nghệ thuật', 'Combo VIP'], shift: 'FULL_DAY', shiftLabel: technicianShiftMeta.FULL_DAY, status: 'SERVING', branch: 'Q3', checkIn: '07:52', avatarTone: 'from-violet-500 to-fuchsia-500' },
  { id: 'TECH-002', name: 'Minh Châu', initials: 'MC', specialty: 'Pedicure Spa', skills: ['Pedicure Spa', 'Gel Manicure', 'Sơn gel Hàn Quốc', 'Combo Manicure'], shift: 'MORNING', shiftLabel: technicianShiftMeta.MORNING, status: 'PRESENT', branch: 'Q3', checkIn: '08:05', avatarTone: 'from-blue-500 to-cyan-500' },
  { id: 'TECH-003', name: 'Quốc Bảo', initials: 'QB', specialty: 'Manicure & Waxing', skills: ['Gel Manicure', 'Combo Manicure', 'Tháo gel & phục hồi móng', 'Waxing tay'], shift: 'MORNING', shiftLabel: technicianShiftMeta.MORNING, status: 'LATE', branch: 'Q3', checkIn: '08:34', avatarTone: 'from-amber-500 to-orange-500' },
  { id: 'TECH-004', name: 'Thuỳ Dương', initials: 'TD', specialty: 'Sơn gel Hàn Quốc', skills: ['Sơn gel Hàn Quốc', 'Gel Manicure', 'Tháo gel & phục hồi móng'], shift: 'AFTERNOON', shiftLabel: technicianShiftMeta.AFTERNOON, status: 'NOT_CHECKED_IN', branch: 'Q3', avatarTone: 'from-emerald-500 to-teal-500' },
  { id: 'TECH-005', name: 'An Nhiên', initials: 'AN', specialty: 'Đính đá nghệ thuật', skills: ['Đính đá nghệ thuật', 'Nail Art cơ bản', 'Nail Art Premium', 'Nối móng Tips'], shift: 'AFTERNOON', shiftLabel: technicianShiftMeta.AFTERNOON, status: 'BREAK', branch: 'Q3', checkIn: '11:58', avatarTone: 'from-pink-500 to-rose-500' },
  { id: 'TECH-006', name: 'Khánh Vy', initials: 'KV', specialty: 'Đắp bột', skills: ['Đắp bột', 'Nối móng Tips', 'Combo VIP'], shift: 'FULL_DAY', shiftLabel: technicianShiftMeta.FULL_DAY, status: 'SICK_REPORTED', branch: 'Q3', leaveNote: 'Báo sốt lúc 07:10, quản lý đã xác nhận.', avatarTone: 'from-slate-500 to-slate-700' },
  { id: 'TECH-011', name: 'Hà My', initials: 'HM', specialty: 'Combo VIP', skills: ['Combo VIP', 'Nail Art Premium', 'Gel Manicure', 'Đính đá nghệ thuật'], shift: 'FULL_DAY', shiftLabel: technicianShiftMeta.FULL_DAY, status: 'PRESENT', branch: 'Q1', checkIn: '07:56', avatarTone: 'from-violet-500 to-indigo-500' },
  { id: 'TECH-012', name: 'Gia Huy', initials: 'GH', specialty: 'Manicure', skills: ['Gel Manicure', 'Combo Manicure', 'Tháo gel & phục hồi móng'], shift: 'MORNING', shiftLabel: technicianShiftMeta.MORNING, status: 'ON_LEAVE', branch: 'Q1', leaveNote: 'Nghỉ phép năm đã duyệt.', avatarTone: 'from-cyan-500 to-blue-500' },
];

const normalizeTechnicians = (items: ReceptionTechnician[]) => items.map((technician) => {
  const seed = technicianSeed.find((item) => item.id === technician.id || item.name === technician.name);
  return {
    ...technician,
    skills: seed?.skills?.length ? seed.skills : technician.skills?.length ? technician.skills : [technician.specialty],
    avatarTone: technician.avatarTone || seed?.avatarTone || 'from-emerald-500 to-teal-500',
    specialty: technician.specialty || seed?.specialty || 'Nail Technician',
    shiftLabel: technicianShiftMeta[technician.shift] || technician.shiftLabel || seed?.shiftLabel || '',
  };
});

const navItems: Array<{ id: ReceptionPage; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: 'desk', label: 'Bàn lễ tân', description: 'Điều phối hôm nay', icon: LayoutDashboard },
  { id: 'appointments', label: 'Lịch hẹn', description: 'Đặt và chỉnh lịch', icon: CalendarDays },
  { id: 'customers', label: 'Khách hàng', description: 'Hồ sơ và lịch sử', icon: UsersRound },
  { id: 'products', label: 'Sản phẩm', description: 'Tồn kho và cảnh báo', icon: PackageSearch },
  { id: 'stations', label: 'Ghế & phòng', description: 'Tình trạng phục vụ', icon: Armchair },
  { id: 'technicians', label: 'Kỹ thuật viên', description: 'Nhân sự trong ngày', icon: UserCheck },
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
    <div className={`fixed inset-0 flex items-center justify-center ${workspace ? 'ui-fullscreen-layer z-[160] p-2 sm:p-4' : 'ui-modal-layer z-[140] p-4'}`} role="dialog" aria-modal="true" aria-label={title}>
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

export default function ReceptionistPortal({ account, themeMode, onThemeChange, onLogout }: ReceptionistPortalProps) {
  const tenantName = account.tenantName || 'Nailé Studio';
  const branchCode: BranchCode = account.branchCode || 'Q3';
  const branchName = account.branchName || `${tenantName} · Chi nhánh ${branchCode === 'Q1' ? 'Quận 1' : 'Quận 3'}`;
  const nextThemeMode = themeMode === 'dark' ? 'light' : 'dark';
  const appointmentStorageKey = `tenant-admin-appointments-v2:${tenantName}`;
  const paymentStorageKey = `tenant-admin-payments-v1:${tenantName}`;
  const technicianStorageKey = `receptionist-technicians-v1:${tenantName}`;
  const shiftStorageKey = `receptionist-shift-v1:${account.email}`;
  const [page, setPage] = useState<ReceptionPage>('desk');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>(() => readStorage(appointmentStorageKey, seedAppointments()));
  const [payments, setPayments] = useState<ReceptionPayment[]>(() => readStorage(paymentStorageKey, seedPayments()));
  const [technicians, setTechnicians] = useState<ReceptionTechnician[]>(() => normalizeTechnicians(readStorage(technicianStorageKey, technicianSeed)));
  const [shift, setShift] = useState<ShiftState>(() => readStorage(shiftStorageKey, { status: 'OPEN', openedAt: new Date().toISOString(), openingCash: 1000000 }));
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState<ReceptionAppointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<ReceptionAppointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<ReceptionAppointment | null>(null);
  const [shiftModal, setShiftModal] = useState<'OPEN' | 'CLOSE' | null>(null);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [walkIn, setWalkIn] = useState({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: nowTime(), duration: '60', price: '450000', note: '' });
  const [paymentForm, setPaymentForm] = useState({ method: 'CASH' as PaymentMethod, discount: '0', tip: '0', reference: '', note: '' });
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineDraft[]>([]);
  const [invoiceCatalogTab, setInvoiceCatalogTab] = useState<InvoiceLineType>('SERVICE');
  const [invoiceCatalogQuery, setInvoiceCatalogQuery] = useState('');
  const [invoiceCategory, setInvoiceCategory] = useState('Tất cả');
  const [cashAmount, setCashAmount] = useState('1000000');
  const [deleteReason, setDeleteReason] = useState('Tạo nhầm lịch');
  const [technicianQuery, setTechnicianQuery] = useState('');
  const [technicianStatusFilter, setTechnicianStatusFilter] = useState<'ALL' | TechnicianStatus>('ALL');
  const [technicianShiftFilter, setTechnicianShiftFilter] = useState<'ALL' | TechnicianShift>('ALL');
  const [technicianSpecialtyFilter, setTechnicianSpecialtyFilter] = useState('ALL');
  const [deskQueueFilter, setDeskQueueFilter] = useState<DeskQueueFilter>('ACTION');
  const [editingTechnician, setEditingTechnician] = useState<ReceptionTechnician | null>(null);
  const [technicianEditForm, setTechnicianEditForm] = useState<TechnicianEditForm>({ status: 'PRESENT', shift: 'FULL_DAY', checkIn: '', checkOut: '', leaveNote: '' });
  const [appointmentEditForm, setAppointmentEditForm] = useState<AppointmentEditForm>({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: nowTime(), duration: '60', price: '450000', note: '' });

  useEffect(() => localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments)), [appointmentStorageKey, appointments]);
  useEffect(() => localStorage.setItem(paymentStorageKey, JSON.stringify(payments)), [paymentStorageKey, payments]);
  useEffect(() => localStorage.setItem(technicianStorageKey, JSON.stringify(technicians)), [technicianStorageKey, technicians]);
  useEffect(() => {
    setTechnicians((current) => {
      const normalized = normalizeTechnicians(current);
      return JSON.stringify(normalized) === JSON.stringify(current) ? current : normalized;
    });
  }, []);
  useEffect(() => localStorage.setItem(shiftStorageKey, JSON.stringify(shift)), [shift, shiftStorageKey]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const branchTodayAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.date === today())
    .filter((appointment) => appointment.branch === branchCode), [appointments, branchCode]);
  const todayAppointments = useMemo(() => [...branchTodayAppointments]
    .sort((a, b) => a.start.localeCompare(b.start)), [branchTodayAppointments]);
  const activeAppointments = todayAppointments.filter((appointment) => ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status));
  const upcomingAppointments = todayAppointments.filter((appointment) => ['PENDING', 'CONFIRMED'].includes(appointment.status));
  const branchTechnicians = useMemo(() => technicians.filter((technician) => technician.branch === branchCode), [branchCode, technicians]);
  const technicianSpecialties = useMemo(() => ['ALL', ...Array.from(new Set(branchTechnicians.map((technician) => technician.specialty)))], [branchTechnicians]);
  const filteredTechnicians = useMemo(() => {
    const query = technicianQuery.trim().toLowerCase();
    return branchTechnicians
      .filter((technician) => technicianStatusFilter === 'ALL' || technician.status === technicianStatusFilter)
      .filter((technician) => technicianShiftFilter === 'ALL' || technician.shift === technicianShiftFilter)
      .filter((technician) => technicianSpecialtyFilter === 'ALL' || technician.specialty === technicianSpecialtyFilter)
      .filter((technician) => !query || `${technician.name} ${technician.specialty}`.toLowerCase().includes(query));
  }, [branchTechnicians, technicianQuery, technicianShiftFilter, technicianSpecialtyFilter, technicianStatusFilter]);
  const technicianStats = {
    total: branchTechnicians.length,
    present: branchTechnicians.filter((technician) => ['PRESENT', 'SERVING', 'BREAK', 'LATE'].includes(technician.status)).length,
    serving: branchTechnicians.filter((technician) => technician.status === 'SERVING').length,
    notArrived: branchTechnicians.filter((technician) => technician.status === 'NOT_CHECKED_IN' || technician.status === 'LATE').length,
    reportedOff: branchTechnicians.filter((technician) => technician.status === 'SICK_REPORTED' || technician.status === 'ON_LEAVE').length,
  };
  const activeAssignmentService = walkInOpen ? walkIn.service : editingAppointment ? appointmentEditForm.service : '';
  const assignableTechnicians = branchTechnicians.filter((technician) => (
    !['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE'].includes(technician.status)
    && (!activeAssignmentService || technician.skills.some((skill) => skill.toLowerCase() === activeAssignmentService.trim().toLowerCase()))
  ));
  const completedIds = new Set(payments.filter((payment) => payment.status === 'PAID').map((payment) => payment.appointmentId));
  const protectedAppointmentIds = new Set(payments.filter((payment) => ['PAID', 'PARTIAL', 'REFUNDED'].includes(payment.status)).map((payment) => payment.appointmentId).filter(Boolean));
  const paidToday = payments.filter((payment) => payment.status === 'PAID' && payment.createdAt.includes(new Date().toLocaleDateString('vi-VN')));
  const todayRevenue = paidToday.reduce((sum, payment) => sum + payment.paid, 0);
  const completedToday = todayAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
  const actionableAppointments = todayAppointments.filter((appointment) => ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'].includes(appointment.status));
  const unassignedAppointments = actionableAppointments.filter((appointment) => appointment.staff === 'Chưa phân công');
  const availableTechnicians = branchTechnicians.filter((technician) => technician.status === 'PRESENT');
  const servingTechnicians = branchTechnicians.filter((technician) => technician.status === 'SERVING');
  const occupiedStations = new Set(activeAppointments.map((appointment) => appointment.station).filter(Boolean)).size;
  const deskQueueAppointments = actionableAppointments.filter((appointment) => {
    if (deskQueueFilter === 'UPCOMING') return ['PENDING', 'CONFIRMED'].includes(appointment.status);
    if (deskQueueFilter === 'WAITING') return appointment.status === 'CHECKED_IN';
    if (deskQueueFilter === 'IN_SERVICE') return appointment.status === 'IN_SERVICE';
    return true;
  }).filter((appointment) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || `${appointment.customer} ${appointment.phone} ${appointment.service} ${appointment.staff} ${appointment.station || ''}`.toLowerCase().includes(query);
  }).sort((a, b) => {
    const priority: Record<AppointmentStatus, number> = { CHECKED_IN: 0, IN_SERVICE: 1, PENDING: 2, CONFIRMED: 3, COMPLETED: 4, CANCELLED: 5, NO_SHOW: 6 };
    return priority[a.status] - priority[b.status] || a.start.localeCompare(b.start);
  });
  const invoiceSubtotal = invoiceLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const invoiceDiscount = Math.max(0, Number(paymentForm.discount) || 0);
  const invoiceTip = Math.max(0, Number(paymentForm.tip) || 0);
  const invoiceTaxAndFees = 0;
  const invoiceTotal = Math.max(0, invoiceSubtotal - (paymentAppointment?.deposit || 0) - invoiceDiscount + invoiceTip + invoiceTaxAndFees);
  const cashCollectedToday = paidToday
    .filter((payment) => payment.method === 'CASH')
    .reduce((sum, payment) => sum + Math.max(0, payment.total - payment.deposit), 0);
  const expectedClosingCash = shift.openingCash + cashCollectedToday;
  const closingCashDifference = (Number(cashAmount) || 0) - expectedClosingCash;
  const deskAlerts = [
    ...activeAppointments
      .filter((appointment) => appointment.status === 'CHECKED_IN')
      .map((appointment) => ({ id: `waiting-${appointment.id}`, tone: 'cyan', title: `${appointment.customer} đang chờ`, detail: `${appointment.start} · ${appointment.service}${appointment.station ? ` · Ghế ${appointment.station}` : ' · Chưa xếp ghế'}` })),
    ...unassignedAppointments
      .map((appointment) => ({ id: `unassigned-${appointment.id}`, tone: 'amber', title: `${appointment.customer} chưa được phân công`, detail: `${appointment.start} · ${appointment.service}` })),
    ...upcomingAppointments
      .filter((appointment) => appointment.status === 'PENDING')
      .map((appointment) => ({ id: `pending-${appointment.id}`, tone: 'violet', title: `Lịch ${appointment.start} chờ xác nhận`, detail: `${appointment.customer} · ${appointment.phone}` })),
  ].slice(0, 5);
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

  const canTechnicianDoService = (technician: ReceptionTechnician, serviceName: string) => {
    const normalizedService = serviceName.trim().toLowerCase();
    if (!normalizedService) return true;
    return technician.skills.some((skill) => skill.toLowerCase() === normalizedService);
  };

  useEffect(() => {
    if (!walkInOpen || walkIn.staff === 'Chưa phân công') return;
    const technician = branchTechnicians.find((item) => item.name === walkIn.staff);
    if (!technician || !canTechnicianDoService(technician, walkIn.service)) {
      setWalkIn((current) => ({ ...current, staff: 'Chưa phân công' }));
    }
  }, [branchTechnicians, walkIn.service, walkIn.staff, walkInOpen]);

  useEffect(() => {
    if (!editingAppointment || appointmentEditForm.staff === 'Chưa phân công') return;
    const technician = branchTechnicians.find((item) => item.name === appointmentEditForm.staff);
    if (!technician || !canTechnicianDoService(technician, appointmentEditForm.service)) {
      setAppointmentEditForm((current) => ({ ...current, staff: 'Chưa phân công' }));
    }
  }, [appointmentEditForm.service, appointmentEditForm.staff, branchTechnicians, editingAppointment]);

  const minutesOf = (value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };

  const validateAppointmentDraft = (draft: AppointmentEditForm, editingId?: string) => {
    const phoneDigits = draft.phone.replace(/\D/g, '');
    const duration = Number(draft.duration);
    const price = Number(draft.price);
    if (draft.customer.trim().length < 2) return 'Vui lòng nhập tên khách hàng tối thiểu 2 ký tự.';
    if (!/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(draft.phone.trim()) || phoneDigits.length < 9) return 'Số điện thoại chưa đúng định dạng.';
    if (!draft.service.trim()) return 'Vui lòng chọn dịch vụ trước khi tiếp nhận khách.';
    if (!draft.staff || draft.staff === 'Chưa phân công') return 'Vui lòng phân công kỹ thuật viên trước khi tạo hoặc bắt đầu dịch vụ.';
    const technician = branchTechnicians.find((item) => item.name === draft.staff);
    if (!technician) return 'Kỹ thuật viên không thuộc chi nhánh hiện tại.';
    if (['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE'].includes(technician.status)) return `${technician.name} hiện ${technicianStatusMeta[technician.status].label.toLowerCase()}, chưa thể nhận khách.`;
    if (!canTechnicianDoService(technician, draft.service)) return `${technician.name} không có khả năng làm dịch vụ ${draft.service}. Vui lòng chọn kỹ thuật viên khác.`;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start)) return 'Vui lòng chọn giờ bắt đầu hợp lệ.';
    if (!Number.isFinite(duration) || duration <= 0) return 'Thời lượng dịch vụ phải lớn hơn 0 phút.';
    if (!Number.isFinite(price) || price <= 0) return 'Giá dự kiến phải lớn hơn 0đ.';
    if (draft.station && !stationCatalog[branchCode].includes(draft.station)) return 'Ghế hoặc phòng không thuộc chi nhánh hiện tại.';

    const duplicatedPhone = branchTodayAppointments.find((appointment) => (
      appointment.id !== editingId
      && appointment.phone.replace(/\D/g, '') === phoneDigits
      && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)
    ));
    if (duplicatedPhone) return `${duplicatedPhone.customer} đang có lịch hôm nay. Vui lòng kiểm tra trước khi tạo đơn mới.`;

    const startMinutes = minutesOf(draft.start);
    const endMinutes = startMinutes + duration;
    const conflictingAppointment = branchTodayAppointments.find((appointment) => {
      if (appointment.id === editingId || appointment.staff !== draft.staff || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
      const appointmentStart = minutesOf(appointment.start);
      const appointmentEnd = appointmentStart + appointment.duration;
      return startMinutes < appointmentEnd && endMinutes > appointmentStart;
    });
    if (conflictingAppointment) return `${draft.staff} đang có lịch ${conflictingAppointment.start} với ${conflictingAppointment.customer}. Vui lòng đổi giờ hoặc đổi kỹ thuật viên.`;
    const conflictingStation = draft.station ? branchTodayAppointments.find((appointment) => {
      if (appointment.id === editingId || appointment.station !== draft.station || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
      const appointmentStart = minutesOf(appointment.start);
      const appointmentEnd = appointmentStart + appointment.duration;
      return startMinutes < appointmentEnd && endMinutes > appointmentStart;
    }) : undefined;
    if (conflictingStation) return `${draft.station} đang được dùng lúc ${conflictingStation.start} bởi ${conflictingStation.customer}. Vui lòng chọn ghế khác.`;
    return '';
  };

  const loadMockReceptionData = () => {
    const nextAppointments = seedAppointments();
    const nextPayments = seedPayments();
    setAppointments(nextAppointments);
    setPayments(nextPayments);
    setTechnicians(technicianSeed);
    setShift({ status: 'OPEN', openedAt: new Date().toISOString(), openingCash: 1500000 });
    setPaymentAppointment(null);
    setEditingAppointment(null);
    setEditingTechnician(null);
    setInvoiceLines([]);
    setPaymentForm({ method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
    setSearchQuery('');
    setFormError('');
    resetTenantMockStorage(tenantName);
    setToast(`Đã nạp ${nextAppointments.length} lịch hẹn, ${nextPayments.length} hóa đơn và reset mock data toàn bộ chức năng tenant.`);
  };

  const openTechnicianEdit = (technician: ReceptionTechnician) => {
    setEditingTechnician(technician);
    setTechnicianEditForm({
      status: technician.status,
      shift: technician.shift,
      checkIn: technician.checkIn || '',
      checkOut: technician.checkOut || '',
      leaveNote: technician.leaveNote || '',
    });
    setFormError('');
  };

  const submitTechnicianEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingTechnician) return;
    setFormError('');
    const timePattern = /^$|^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(technicianEditForm.checkIn) || !timePattern.test(technicianEditForm.checkOut)) {
      setFormError('Giờ check-in/check-out phải theo định dạng HH:mm, ví dụ 08:30.');
      return;
    }
    if (technicianEditForm.checkIn && technicianEditForm.checkOut && technicianEditForm.checkOut < technicianEditForm.checkIn) {
      setFormError('Giờ check-out không được sớm hơn giờ check-in.');
      return;
    }
    const activeCustomer = branchTodayAppointments.find((appointment) => appointment.staff === editingTechnician.name && appointment.status === 'IN_SERVICE');
    if (activeCustomer && (['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE'].includes(technicianEditForm.status) || technicianEditForm.checkOut)) {
      setFormError(`${editingTechnician.name} đang phục vụ ${activeCustomer.customer}. Vui lòng hoàn tất hoặc bàn giao khách trước khi cho nghỉ/check-out.`);
      return;
    }

    setTechnicians((current) => current.map((technician) => technician.id === editingTechnician.id ? {
      ...technician,
      status: technicianEditForm.status,
      shift: technicianEditForm.shift,
      shiftLabel: technicianShiftMeta[technicianEditForm.shift],
      checkIn: technicianEditForm.checkIn || undefined,
      checkOut: technicianEditForm.checkOut || undefined,
      leaveNote: technicianEditForm.leaveNote.trim() || undefined,
    } : technician));
    setEditingTechnician(null);
    setToast(`Đã cập nhật trạng thái và thời gian làm việc của ${editingTechnician.name}.`);
  };

  const updateAppointmentStatus = (appointment: ReceptionAppointment, status: AppointmentStatus) => {
    if (!requireOpenShift()) return;
    const allowedTransitions: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
      PENDING: ['CHECKED_IN'],
      CONFIRMED: ['CHECKED_IN'],
      CHECKED_IN: ['IN_SERVICE'],
    };
    if (!allowedTransitions[appointment.status]?.includes(status)) {
      setToast(`Không thể chuyển từ “${statusMeta[appointment.status].label}” sang “${statusMeta[status].label}”.`);
      return;
    }
    if (status === 'IN_SERVICE' && (!appointment.staff || appointment.staff === 'Chưa phân công')) {
      openAppointmentEdit(appointment);
      setToast('Vui lòng phân công kỹ thuật viên trước khi bắt đầu dịch vụ.');
      return;
    }
    if (status === 'IN_SERVICE' && !appointment.station) {
      openAppointmentEdit(appointment);
      setToast('Vui lòng xếp ghế hoặc phòng trước khi bắt đầu dịch vụ.');
      return;
    }
    if (status === 'IN_SERVICE') {
      const technician = branchTechnicians.find((item) => item.name === appointment.staff);
      if (!technician || ['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE', 'BREAK'].includes(technician.status)) {
        setToast('Kỹ thuật viên hiện chưa sẵn sàng nhận khách. Vui lòng phân công lại.');
        return;
      }
      const otherActiveService = appointments.find((item) => item.id !== appointment.id && item.staff === appointment.staff && item.status === 'IN_SERVICE');
      if (otherActiveService) {
        setToast(`${appointment.staff} đang phục vụ ${otherActiveService.customer}. Vui lòng chờ hoặc phân công lại.`);
        return;
      }
      setTechnicians((current) => current.map((item) => item.name === appointment.staff ? { ...item, status: 'SERVING' } : item));
    }
    setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status } : item));
    const messages: Partial<Record<AppointmentStatus, string>> = {
      CHECKED_IN: `${appointment.customer} đã check-in.`,
      IN_SERVICE: `${appointment.customer} đã bắt đầu dịch vụ.`,
      COMPLETED: `${appointment.customer} đã hoàn tất dịch vụ.`,
    };
    setToast(messages[status] || 'Đã cập nhật lịch hẹn.');
  };

  const deleteAppointment = (appointment: ReceptionAppointment) => {
    if (!requireOpenShift()) return;
    if (['IN_SERVICE', 'COMPLETED'].includes(appointment.status) || protectedAppointmentIds.has(appointment.id)) {
      setToast('Không thể xóa lịch đã bắt đầu dịch vụ, đã hoàn tất hoặc đã phát sinh thanh toán. Vui lòng xử lý bằng hoàn tiền/ghi chú đối soát.');
      return;
    }
    if (appointment.deposit > 0) {
      setToast('Không thể xóa lịch đã có tiền cọc. Vui lòng xử lý hoàn cọc hoặc hủy lịch có đối soát.');
      return;
    }
    setDeletingAppointment(appointment);
    setDeleteReason('Tạo nhầm lịch');
    setFormError('');
  };

  const submitDeleteAppointment = (event: FormEvent) => {
    event.preventDefault();
    if (!deletingAppointment) return;
    const trimmedReason = deleteReason.trim();
    if (trimmedReason.length < 5) {
      setFormError('Vui lòng nhập lý do xóa/hủy rõ ràng, tối thiểu 5 ký tự.');
      return;
    }
    const auditNote = `[${new Date().toLocaleString('vi-VN')}] ${account.displayName} xóa khỏi quầy: ${trimmedReason}`;
    setAppointments((current) => current.map((item) => item.id === deletingAppointment.id ? {
      ...item,
      status: 'CANCELLED',
      note: [item.note, auditNote].filter(Boolean).join('\n'),
    } : item));
    if (editingAppointment?.id === deletingAppointment.id) setEditingAppointment(null);
    if (paymentAppointment?.id === deletingAppointment.id) setPaymentAppointment(null);
    setDeletingAppointment(null);
    setDeleteReason('Tạo nhầm lịch');
    setFormError('');
    setToast(`Đã hủy lịch tạo nhầm của ${deletingAppointment.customer} và lưu lý do đối soát.`);
  };

  const submitWalkIn = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!requireOpenShift()) return;
    const validationError = validateAppointmentDraft(walkIn);
    if (validationError) return setFormError(validationError);
    const appointment: ReceptionAppointment = {
      id: makeId('APT'), customer: walkIn.customer.trim(), phone: walkIn.phone.trim(), date: today(), start: walkIn.start,
      duration: Number(walkIn.duration), service: walkIn.service, staff: walkIn.staff, branch: branchCode,
      source: 'RECEPTION', status: 'CHECKED_IN', price: Number(walkIn.price), deposit: 0, note: walkIn.note.trim(),
      station: walkIn.station || undefined, createdBy: account.displayName, firstVisit: true, createdAt: new Date().toISOString(),
    };
    setAppointments((current) => [appointment, ...current]);
    setWalkInOpen(false);
    setWalkIn({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: nowTime(), duration: '60', price: '450000', note: '' });
    setToast(`Đã tiếp nhận khách vãng lai ${appointment.customer}.`);
  };

  const handleWalkInServiceChange = (serviceName: string) => {
    const selected = serviceCatalog.find((item) => item.name === serviceName);
    const currentTechnician = branchTechnicians.find((technician) => technician.name === walkIn.staff);
    setWalkIn({
      ...walkIn,
      service: serviceName,
      staff: currentTechnician && canTechnicianDoService(currentTechnician, serviceName) ? walkIn.staff : 'Chưa phân công',
      price: selected ? String(selected.price) : walkIn.price,
      duration: selected?.duration ? String(selected.duration) : walkIn.duration,
    });
  };

  const openAppointmentEdit = (appointment: ReceptionAppointment) => {
    if (['IN_SERVICE', 'COMPLETED'].includes(appointment.status)) {
      setToast('Không thể sửa thông tin tiếp nhận sau khi dịch vụ đã bắt đầu.');
      return;
    }
    setEditingAppointment(appointment);
    setAppointmentEditForm({
      customer: appointment.customer,
      phone: appointment.phone,
      service: appointment.service,
      staff: appointment.staff || 'Chưa phân công',
      station: appointment.station || '',
      start: appointment.start,
      duration: String(appointment.duration),
      price: String(appointment.price),
      note: appointment.note || '',
    });
    setFormError('');
  };

  const submitAppointmentEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingAppointment) return;
    setFormError('');
    const validationError = validateAppointmentDraft(appointmentEditForm, editingAppointment.id);
    if (validationError) return setFormError(validationError);
    setAppointments((current) => current.map((appointment) => appointment.id === editingAppointment.id ? {
      ...appointment,
      customer: appointmentEditForm.customer.trim(),
      phone: appointmentEditForm.phone.trim(),
      service: appointmentEditForm.service,
      services: [appointmentEditForm.service],
      staff: appointmentEditForm.staff,
      station: appointmentEditForm.station || undefined,
      start: appointmentEditForm.start,
      duration: Number(appointmentEditForm.duration),
      price: Number(appointmentEditForm.price),
      note: appointmentEditForm.note.trim(),
    } : appointment));
    setEditingAppointment(null);
    setToast(`Đã cập nhật thông tin tiếp nhận của ${appointmentEditForm.customer.trim()}.`);
  };

  const handleAppointmentEditServiceChange = (serviceName: string) => {
    const selected = serviceCatalog.find((item) => item.name === serviceName);
    const currentTechnician = branchTechnicians.find((technician) => technician.name === appointmentEditForm.staff);
    setAppointmentEditForm({
      ...appointmentEditForm,
      service: serviceName,
      staff: currentTechnician && canTechnicianDoService(currentTechnician, serviceName) ? appointmentEditForm.staff : 'Chưa phân công',
      price: selected ? String(selected.price) : appointmentEditForm.price,
      duration: selected?.duration ? String(selected.duration) : appointmentEditForm.duration,
    });
  };

  const openPayment = (appointment: ReceptionAppointment) => {
    if (!requireOpenShift()) return;
    if (appointment.status !== 'IN_SERVICE') {
      setToast('Chỉ có thể thanh toán sau khi khách đã bắt đầu dịch vụ.');
      return;
    }
    if (completedIds.has(appointment.id)) {
      setToast('Lịch hẹn này đã có hóa đơn thanh toán hoàn tất.');
      return;
    }
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
    if (grandTotal < paymentAppointment.deposit) return setFormError('Tổng hóa đơn sau giảm giá không được thấp hơn số tiền khách đã đặt cọc.');
    const amountDue = Math.max(0, grandTotal - paymentAppointment.deposit);
    if (paymentForm.method !== 'CASH' && !paymentForm.reference.trim()) return setFormError('Vui lòng nhập mã giao dịch để đối soát.');
    if (paymentForm.method !== 'CASH' && payments.some((payment) => payment.reference?.trim().toLowerCase() === paymentForm.reference.trim().toLowerCase() && payment.appointmentId !== paymentAppointment.id)) return setFormError('Mã giao dịch đã được sử dụng. Vui lòng kiểm tra lại để tránh ghi nhận trùng.');
    const timestamp = new Date();
    const existingInvoice = payments.find((payment) => payment.appointmentId === paymentAppointment.id && ['PARTIAL', 'PENDING'].includes(payment.status));
    const payment: ReceptionPayment = {
      id: existingInvoice?.id || makeId('INV'), appointmentId: paymentAppointment.id, customer: paymentAppointment.customer, phone: paymentAppointment.phone,
      branch: paymentAppointment.branch, createdAt: `${timestamp.toLocaleDateString('vi-VN')} · ${nowTime()}`,
      subtotal, discount, tip, deposit: paymentAppointment.deposit, total: grandTotal, paid: grandTotal,
      refunded: 0, status: 'PAID', method: paymentForm.method, reference: paymentForm.reference.trim() || undefined,
      cashier: account.displayName, source: 'POS tại quầy',
      items: invoiceLines.map((line) => ({ name: line.name.trim(), quantity: line.quantity, amount: line.quantity * line.unitPrice, staff: line.staff })),
      note: paymentForm.note.trim() || undefined,
      audit: [
        ...(existingInvoice?.audit || []),
        `${nowTime()} · ${account.displayName} xác nhận ${invoiceLines.length} dòng hàng và thanh toán ${methodMeta[paymentForm.method].label}`,
        `${nowTime()} · Áp dụng cọc ${money(paymentAppointment.deposit)}, thực thu tại quầy ${money(amountDue)}`,
      ],
    };
    setPayments((current) => existingInvoice
      ? current.map((item) => item.id === existingInvoice.id ? payment : item)
      : [payment, ...current]);
    const serviceNames = invoiceLines.filter((line) => line.type === 'SERVICE').map((line) => line.name.trim());
    const serviceSubtotal = invoiceLines.filter((line) => line.type === 'SERVICE').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    setAppointments((current) => current.map((item) => item.id === paymentAppointment.id ? {
      ...item,
      status: 'COMPLETED',
      service: serviceNames.join(' + ') || item.service,
      services: serviceNames.length ? serviceNames : item.services,
      price: serviceSubtotal,
    } : item));
    const hasOtherActiveService = appointments.some((item) => item.id !== paymentAppointment.id && item.staff === paymentAppointment.staff && item.status === 'IN_SERVICE');
    if (!hasOtherActiveService) {
      setTechnicians((current) => current.map((item) => item.name === paymentAppointment.staff && item.status === 'SERVING' ? { ...item, status: 'PRESENT' } : item));
    }
    setPaymentAppointment(null);
    setToast(`Đã thu ${money(amountDue)} từ ${payment.customer}.`);
  };

  const openShiftDialog = (mode: 'OPEN' | 'CLOSE') => {
    setCashAmount(String(mode === 'CLOSE' ? expectedClosingCash : 1000000));
    setFormError('');
    setShiftModal(mode);
  };

  const submitShift = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount < 0) return setFormError('Số tiền trong quỹ không hợp lệ.');
    if (shiftModal === 'OPEN') {
      setShift({ status: 'OPEN', openedAt: new Date().toISOString(), openingCash: amount });
      setToast('Đã mở ca lễ tân.');
    } else {
      if (activeAppointments.length > 0) return setFormError(`Còn ${activeAppointments.length} khách đang chờ hoặc đang phục vụ. Vui lòng hoàn tất hoặc bàn giao trước khi chốt ca.`);
      setShift((current) => ({ ...current, status: 'CLOSED', closedAt: new Date().toISOString(), closingCash: amount }));
      const difference = amount - expectedClosingCash;
      setToast(difference === 0 ? 'Đã chốt ca, tiền mặt khớp với hệ thống.' : `Đã chốt ca và ghi nhận chênh lệch ${money(Math.abs(difference))} ${difference > 0 ? 'thừa' : 'thiếu'}.`);
    }
    setShiftModal(null);
    setFormError('');
  };

  const navigate = (nextPage: ReceptionPage) => {
    if (nextPage === 'desk') {
      setAppointments(readStorage(appointmentStorageKey, seedAppointments()));
      setPayments(readStorage(paymentStorageKey, seedPayments()));
      setTechnicians(normalizeTechnicians(readStorage(technicianStorageKey, technicianSeed)));
    }
    setPage(nextPage);
    setSidebarOpen(false);
    setSearchQuery('');
  };

  const renderDesk = () => (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#063c35] via-[#075f52] to-[#0b7a6b] p-5 text-white shadow-[0_18px_50px_rgba(5,80,70,0.22)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-50 backdrop-blur">
                <Activity className="h-3.5 w-3.5 text-emerald-300" /> Trung tâm vận hành
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black ${shift.status === 'OPEN' ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-white ring-1 ring-white/20'}`}>
                <span className={`h-2 w-2 rounded-full ${shift.status === 'OPEN' ? 'bg-emerald-800' : 'bg-slate-300'}`} />
                {shift.status === 'OPEN' ? `Ca đang mở · ${new Date(shift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Ca đã đóng'}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-2xl font-black tracking-[-0.03em] sm:text-3xl">Chào {account.displayName.split(' ').slice(-2).join(' ')}, bàn lễ tân đã sẵn sàng.</h1>
            <p className="mt-2 max-w-2xl text-xs font-medium leading-6 text-emerald-50/70">Theo dõi luồng khách, phân công nguồn lực và hoàn tất thanh toán trong một màn hình.</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-emerald-50/75">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-300" />{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-300" />{branchName}</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" />Phạm vi Receptionist</span>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:min-w-[490px]">
            <button type="button" onClick={() => { if (requireOpenShift()) setWalkInOpen(true); }} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-emerald-900 shadow-lg shadow-emerald-950/15 hover:bg-emerald-50">
              <Plus className="h-4 w-4" /> Tiếp nhận khách
            </button>
            <button type="button" onClick={() => navigate('appointments')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black text-white backdrop-blur hover:bg-white/15">
              <CalendarClock className="h-4 w-4" /> Tạo lịch hẹn
            </button>
            <button type="button" onClick={() => openShiftDialog(shift.status === 'OPEN' ? 'CLOSE' : 'OPEN')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black text-white backdrop-blur hover:bg-white/15">
              <DoorOpen className="h-4 w-4" /> {shift.status === 'OPEN' ? 'Chốt ca' : 'Mở ca'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: 'Lịch hôm nay', value: String(todayAppointments.length), note: `${completedToday} đã hoàn tất`, icon: CalendarCheck2, tone: 'bg-blue-50 text-blue-700 ring-blue-100' },
          { label: 'Cần xử lý', value: String(actionableAppointments.length), note: `${unassignedAppointments.length} chưa phân công`, icon: AlertCircle, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
          { label: 'Khách tại salon', value: String(activeAppointments.length), note: `${activeAppointments.filter((item) => item.status === 'CHECKED_IN').length} đang chờ`, icon: UsersRound, tone: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
          { label: 'Đang phục vụ', value: String(activeAppointments.filter((item) => item.status === 'IN_SERVICE').length), note: `${occupiedStations} ghế đang dùng`, icon: Armchair, tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
          { label: 'Doanh thu đã thu', value: money(todayRevenue), note: `${paidToday.length} giao dịch`, icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm ${index === 4 ? 'col-span-2 xl:col-span-1' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-brand-text-muted">{item.label}</p>
                  <p className="mt-2 truncate text-xl font-black tracking-tight text-brand-text">{item.value}</p>
                  <p className="mt-1 text-[10px] font-semibold text-brand-text-muted">{item.note}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${item.tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.65fr)]">
        <div className="overflow-hidden rounded-[24px] border border-brand-outline bg-brand-surface shadow-sm">
          <div className="border-b border-brand-outline p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-600"><TimerReset className="h-4 w-4" /><p className="text-[10px] font-black uppercase tracking-[0.12em]">Hàng đợi thao tác</p></div>
                <h2 className="mt-1 text-lg font-black tracking-tight text-brand-text">Ưu tiên cần xử lý tại quầy</h2>
                <p className="mt-1 text-[10px] font-medium text-brand-text-muted">Khách đã đến được đưa lên trước, sau đó là lịch chờ xác nhận.</p>
              </div>
              <button type="button" onClick={() => navigate('appointments')} className="flex w-fit items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface-high px-3 py-2 text-[10px] font-black text-brand-text hover:border-emerald-300 hover:text-emerald-700">
                Toàn bộ lịch hẹn <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Lọc hàng đợi lễ tân">
              {[
                { id: 'ACTION' as DeskQueueFilter, label: 'Cần xử lý', value: actionableAppointments.length },
                { id: 'UPCOMING' as DeskQueueFilter, label: 'Sắp đến', value: upcomingAppointments.length },
                { id: 'WAITING' as DeskQueueFilter, label: 'Đang chờ', value: activeAppointments.filter((item) => item.status === 'CHECKED_IN').length },
                { id: 'IN_SERVICE' as DeskQueueFilter, label: 'Đang làm', value: activeAppointments.filter((item) => item.status === 'IN_SERVICE').length },
              ].map((item) => {
                const active = deskQueueFilter === item.id;
                return (
                  <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setDeskQueueFilter(item.id)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black ${active ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-brand-outline bg-brand-surface-high text-brand-text-muted hover:text-brand-text'}`}>
                    {item.label} <span className={`ml-1 rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-brand-surface'}`}>{item.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-brand-outline">
            {deskQueueAppointments.length === 0 && (
              <div className="p-10 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-3 text-sm font-black text-brand-text">Không còn việc trong nhóm này</p>
                <p className="mt-1 text-xs text-brand-text-muted">Hàng đợi đã được xử lý xong.</p>
              </div>
            )}
            {deskQueueAppointments.slice(0, 7).map((appointment) => {
              const meta = statusMeta[appointment.status];
              const isUnassigned = appointment.staff === 'Chưa phân công';
              const isWaiting = appointment.status === 'CHECKED_IN';
              return (
                <article key={appointment.id} className={`group p-4 transition hover:bg-brand-surface-high/40 sm:p-5 ${isWaiting ? 'bg-cyan-50/30' : ''}`}>
                  <div className="grid gap-4 lg:grid-cols-[70px_minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex items-center gap-3 lg:block">
                      <div className="rounded-2xl border border-brand-outline bg-brand-surface px-3 py-2 text-center shadow-sm">
                        <p className="text-base font-black tabular-nums text-brand-text">{appointment.start}</p>
                        <p className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-brand-text-muted">{appointment.duration} phút</p>
                      </div>
                      <div className="lg:hidden">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ring-inset ${meta.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-brand-text">{appointment.customer}</p>
                        <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ring-inset lg:inline-flex ${meta.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                        {appointment.firstVisit && <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[8px] font-black text-fuchsia-700 ring-1 ring-fuchsia-100">Khách mới</span>}
                        {isUnassigned && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-700 ring-1 ring-amber-200"><AlertCircle className="h-3 w-3" /> Chưa phân công</span>}
                      </div>
                      <p className="mt-1.5 truncate text-xs font-bold text-brand-text">{appointment.service}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold text-brand-text-muted">
                        <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />{appointment.staff}</span>
                        {appointment.station && <span className="inline-flex items-center gap-1.5"><Armchair className="h-3.5 w-3.5" />{appointment.station}</span>}
                        <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{appointment.phone}</span>
                        {appointment.deposit > 0 && <span className="font-black text-emerald-600">Cọc {money(appointment.deposit)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                      <a href={`tel:${appointment.phone.replace(/\s/g, '')}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted hover:text-emerald-700" aria-label={`Gọi ${appointment.customer}`}><Phone className="h-3.5 w-3.5" /></a>
                      {appointment.status !== 'IN_SERVICE' && (
                        <button type="button" onClick={() => openAppointmentEdit(appointment)} className="rounded-xl border border-brand-outline bg-brand-surface px-3 py-2 text-[10px] font-black text-brand-text hover:bg-brand-surface-high">
                          {isUnassigned ? 'Phân công' : 'Chỉnh lịch'}
                        </button>
                      )}
                      {['PENDING', 'CONFIRMED'].includes(appointment.status) && <button type="button" onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-[10px] font-black text-white hover:bg-cyan-700"><Check className="h-3.5 w-3.5" /> Check-in</button>}
                      {appointment.status === 'CHECKED_IN' && <button type="button" onClick={() => updateAppointmentStatus(appointment, 'IN_SERVICE')} className={`rounded-xl px-3 py-2 text-[10px] font-black text-white ${isUnassigned ? 'bg-amber-600 hover:bg-amber-700' : 'bg-violet-600 hover:bg-violet-700'}`}>Bắt đầu dịch vụ</button>}
                      {appointment.status === 'IN_SERVICE' && <button type="button" onClick={() => openPayment(appointment)} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-700">Thu tiền & hoàn tất</button>}
                    </div>
                  </div>
                  {appointment.note && <p className="mt-3 rounded-xl bg-brand-surface-high/60 px-3 py-2 text-[9px] font-semibold leading-4 text-brand-text-muted"><span className="font-black text-brand-text">Lưu ý:</span> {appointment.note}</p>}
                </article>
              );
            })}
          </div>
          {deskQueueAppointments.length > 7 && <button type="button" onClick={() => navigate('appointments')} className="flex w-full items-center justify-center gap-2 border-t border-brand-outline py-3 text-[10px] font-black text-emerald-700 hover:bg-emerald-50">Xem thêm {deskQueueAppointments.length - 7} lịch <ChevronRight className="h-3.5 w-3.5" /></button>}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-600">Sắp đến</p>
                <h2 className="mt-1 text-base font-black text-brand-text">Lịch kế tiếp</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><Clock3 className="h-5 w-5" /></span>
            </div>
            <div className="mt-4 space-y-2">
              {upcomingAppointments.slice(0, 3).map((appointment, index) => (
                <article key={appointment.id} className={`rounded-2xl border p-3 ${index === 0 ? 'border-amber-200 bg-amber-50/60' : 'border-brand-outline bg-brand-surface-high/35'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-black tabular-nums ${index === 0 ? 'bg-amber-500 text-white' : 'bg-brand-surface text-brand-text ring-1 ring-brand-outline'}`}>{appointment.start}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black text-brand-text">{appointment.customer}</p>
                        {index === 0 && <span className="shrink-0 text-[8px] font-black uppercase text-amber-700">Kế tiếp</span>}
                      </div>
                      <p className="mt-1 truncate text-[9px] font-semibold text-brand-text-muted">{appointment.service}</p>
                      <p className="mt-1 truncate text-[9px] text-brand-text-muted">{appointment.staff}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                    <button type="button" onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')} className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2 text-[9px] font-black text-white"><Check className="h-3 w-3" /> Check-in</button>
                    <a href={`tel:${appointment.phone.replace(/\s/g, '')}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted" aria-label={`Gọi ${appointment.customer}`}><Phone className="h-3.5 w-3.5" /></a>
                    <a href={`sms:${appointment.phone.replace(/\s/g, '')}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted" aria-label={`Nhắn ${appointment.customer}`}><MessageCircle className="h-3.5 w-3.5" /></a>
                  </div>
                </article>
              ))}
              {upcomingAppointments.length === 0 && <p className="rounded-xl border border-dashed border-brand-outline py-8 text-center text-xs font-semibold text-brand-text-muted">Không còn khách sắp đến.</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-600">Nguồn lực</p>
                <h2 className="mt-1 text-base font-black text-brand-text">Sẵn sàng phục vụ</h2>
              </div>
              <button type="button" onClick={() => navigate('technicians')} className="text-[9px] font-black text-emerald-700 hover:underline">Chi tiết</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Sẵn sàng', value: availableTechnicians.length, color: 'text-emerald-600' },
                { label: 'Đang làm', value: servingTechnicians.length, color: 'text-violet-600' },
                { label: 'Ghế dùng', value: occupiedStations, color: 'text-cyan-600' },
              ].map((item) => <div key={item.label} className="rounded-xl bg-brand-surface-high/55 p-2.5 text-center"><p className={`text-lg font-black ${item.color}`}>{item.value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-wide text-brand-text-muted">{item.label}</p></div>)}
            </div>
            <div className="mt-3 space-y-2">
              {branchTechnicians.filter((technician) => ['PRESENT', 'SERVING', 'BREAK'].includes(technician.status)).slice(0, 4).map((technician) => (
                <div key={technician.id} className="flex items-center gap-3 rounded-xl border border-brand-outline px-3 py-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[9px] font-black text-white ${technician.avatarTone}`}>{technician.initials}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black text-brand-text">{technician.name}</p><p className="truncate text-[8px] font-semibold text-brand-text-muted">{technician.specialty}</p></div>
                  <span className={`h-2 w-2 rounded-full ${technicianStatusMeta[technician.status].dot}`} title={technicianStatusMeta[technician.status].label} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <article className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-600" /><p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Đối soát ca</p></div>
              <h2 className="mt-1 text-base font-black text-brand-text">Quỹ và giao dịch trong ngày</h2>
            </div>
            <button type="button" onClick={() => navigate('payments')} className="flex items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface-high px-3 py-2 text-[10px] font-black text-brand-text">Xem thanh toán <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-brand-surface-high/55 p-4"><p className="text-[9px] font-black uppercase tracking-wide text-brand-text-muted">Quỹ đầu ca</p><p className="mt-2 text-base font-black text-brand-text">{money(shift.openingCash)}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Tổng đã thu</p><p className="mt-2 text-base font-black text-emerald-800">{money(todayRevenue)}</p></div>
            <div className="rounded-2xl bg-brand-surface-high/55 p-4"><p className="text-[9px] font-black uppercase tracking-wide text-brand-text-muted">Số giao dịch</p><p className="mt-2 text-base font-black text-brand-text">{paidToday.length} giao dịch</p></div>
          </div>
        </article>

        <article className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><BadgeCheck className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-brand-text-muted">Vai trò đang đăng nhập</p>
              <h2 className="mt-1 text-base font-black text-brand-text">Receptionist · {account.displayName}</h2>
              <p className="mt-1 text-[10px] font-semibold text-brand-text-muted">{account.email}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              'Tiếp nhận & check-in khách',
              'Tạo, chỉnh và điều phối lịch',
              'Phân công kỹ thuật viên',
              'Thu tiền & in hóa đơn',
            ].map((permission) => <div key={permission} className="flex items-center gap-2 rounded-xl bg-brand-surface-high/50 px-3 py-2 text-[9px] font-bold text-brand-text"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{permission}</div>)}
          </div>
          <p className="mt-3 flex items-start gap-2 text-[9px] font-semibold leading-4 text-brand-text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />Dữ liệu và thao tác được giới hạn tại {branchName}.</p>
        </article>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={loadMockReceptionData} className="flex items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface px-3 py-2 text-[9px] font-black text-brand-text-muted hover:text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" /> Khôi phục dữ liệu mẫu
        </button>
      </div>
    </div>
  );

  const renderTechnicians = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-violet-700 ring-1 ring-violet-100">
              <UserCheck className="h-3.5 w-3.5" /> Nhân sự hôm nay
            </span>
            <h1 className="mt-3 text-xl font-black tracking-tight text-brand-text sm:text-2xl">Theo dõi kỹ thuật viên trong ngày</h1>
            <p className="mt-1 text-[11px] leading-5 text-brand-text-muted">Kiểm tra ca làm, trạng thái check-in, nghỉ phép và khách đang được phân công tại {branchName}.</p>
          </div>
          <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/60 px-4 py-3 text-[10px] font-bold text-brand-text-muted">
            <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-500" /> Cập nhật {nowTime()}</p>
            <p className="mt-1 text-[9px]">Dữ liệu mock để lễ tân test điều phối trong ngày.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Tổng kỹ thuật viên', value: technicianStats.total, icon: UsersRound, tone: 'bg-blue-50 text-blue-700' },
            { label: 'Có mặt', value: technicianStats.present, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Đang phục vụ', value: technicianStats.serving, icon: Armchair, tone: 'bg-violet-50 text-violet-700' },
            { label: 'Chưa đến', value: technicianStats.notArrived, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
            { label: 'Báo nghỉ', value: technicianStats.reportedOff, icon: Bell, tone: 'bg-rose-50 text-rose-700' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-brand-outline bg-brand-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.08em] text-brand-text-muted">{label}</p>
                  <p className="mt-2 text-2xl font-black text-brand-text">{value}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <input
              value={technicianQuery}
              onChange={(event) => setTechnicianQuery(event.target.value)}
              placeholder="Tìm tên kỹ thuật viên hoặc chuyên môn..."
              className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 pl-10 pr-3 text-xs font-semibold text-brand-text outline-none transition focus:border-emerald-500 focus:bg-brand-surface focus:ring-4 focus:ring-emerald-500/10 placeholder:text-brand-text-muted/60"
            />
          </label>
          <select value={technicianStatusFilter} onChange={(event) => setTechnicianStatusFilter(event.target.value as 'ALL' | TechnicianStatus)} className="h-11 rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10">
            <option value="ALL">Mọi trạng thái</option>
            {Object.entries(technicianStatusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <select value={technicianShiftFilter} onChange={(event) => setTechnicianShiftFilter(event.target.value as 'ALL' | TechnicianShift)} className="h-11 rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10">
            <option value="ALL">Mọi ca làm</option>
            {Object.entries(technicianShiftMeta).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={technicianSpecialtyFilter} onChange={(event) => setTechnicianSpecialtyFilter(event.target.value)} className="h-11 rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10">
            {technicianSpecialties.map((specialty) => <option key={specialty} value={specialty}>{specialty === 'ALL' ? 'Mọi chuyên môn' : specialty}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {filteredTechnicians.map((technician) => {
          const meta = technicianStatusMeta[technician.status];
          const assignedAppointments = branchTodayAppointments
            .filter((appointment) => appointment.staff === technician.name)
            .filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status))
            .sort((a, b) => a.start.localeCompare(b.start));
          const currentAppointment = assignedAppointments.find((appointment) => appointment.status === 'IN_SERVICE')
            || assignedAppointments.find((appointment) => appointment.status === 'CHECKED_IN')
            || assignedAppointments.find((appointment) => ['PENDING', 'CONFIRMED'].includes(appointment.status));

          return (
            <article key={technician.id} className="overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-sm">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-black text-white shadow-sm ${technician.avatarTone}`}>
                    {technician.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-brand-text">{technician.name}</h2>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-black ring-1 ${meta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-brand-text-muted">{technician.specialty}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-semibold text-brand-text-muted">
                      <span>{technician.shiftLabel}</span>
                      <span className="hidden text-brand-outline sm:inline">•</span>
                      <span>{meta.helper}</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[220px]">
                  <div className="rounded-xl bg-brand-surface-high/45 p-2">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-brand-text-muted">Check-in</p>
                    <p className="mt-1 text-xs font-black text-brand-text">{technician.checkIn || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-brand-surface-high/45 p-2">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-brand-text-muted">Check-out</p>
                    <p className="mt-1 text-xs font-black text-brand-text">{technician.checkOut || '—'}</p>
                  </div>
                  <button type="button" onClick={() => openTechnicianEdit(technician)} className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-[9px] font-black text-emerald-600 hover:bg-emerald-500/15">
                    <UserCheck className="h-3.5 w-3.5" /> Chỉnh trạng thái & giờ
                  </button>
                </div>
              </div>

              <div className="border-t border-brand-outline bg-brand-surface-high/25 p-4">
                {technician.leaveNote && (
                  <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-600">
                    Ghi chú nghỉ: {technician.leaveNote}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-brand-text-muted">Lịch hẹn / khách phân công</p>
                    <p className="mt-1 text-[9px] text-brand-text-muted">{assignedAppointments.length ? `${assignedAppointments.length} lịch trong ngày` : 'Chưa có khách được phân công'}</p>
                  </div>
                  <span className="rounded-full bg-brand-surface px-2.5 py-1 text-[8px] font-black text-brand-text-muted ring-1 ring-brand-outline">
                    {technician.branch}
                  </span>
                </div>
                {currentAppointment ? (
                  <div className="mt-3 rounded-xl border border-brand-outline bg-brand-surface p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-brand-text">{currentAppointment.customer}</p>
                        <p className="mt-1 text-[9px] font-semibold text-brand-text-muted">{currentAppointment.start} · {currentAppointment.service}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-[8px] font-black ring-1 ${statusMeta[currentAppointment.status].badge}`}>
                        {statusMeta[currentAppointment.status].label}
                      </span>
                    </div>
                    {assignedAppointments.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {assignedAppointments.slice(0, 4).map((appointment) => (
                          <span key={appointment.id} className="rounded-lg bg-brand-surface-high px-2 py-1 text-[8px] font-bold text-brand-text-muted">
                            {appointment.start} · {appointment.customer}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-brand-outline bg-brand-surface p-4 text-center text-[10px] font-bold text-brand-text-muted">
                    Chưa có lịch hẹn đang hoạt động cho kỹ thuật viên này.
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!filteredTechnicians.length && (
        <section className="rounded-2xl border border-brand-outline bg-brand-surface p-12 text-center">
          <UsersRound className="mx-auto h-9 w-9 text-brand-text-muted" />
          <p className="mt-3 text-sm font-black text-brand-text">Không tìm thấy kỹ thuật viên phù hợp</p>
          <p className="mt-1 text-xs text-brand-text-muted">Thử đổi trạng thái, ca làm, chuyên môn hoặc từ khóa tìm kiếm.</p>
        </section>
      )}
    </div>
  );

  const renderPage = () => {
    if (page === 'desk') return renderDesk();
    if (page === 'technicians') return (
      <ReceptionistTechnicians
        technicians={technicians}
        appointments={appointments}
        selectedBranch={branchCode}
        branchName={branchName}
        roleLabel={`Receptionist · ${account.displayName}`}
        onTechniciansChange={setTechnicians}
        onAppointmentsChange={setAppointments}
        onNotify={setToast}
        onOpenAppointments={(query) => {
          setSearchQuery(query || '');
          setPage('appointments');
        }}
      />
    );
    const commonProps = { searchQuery, onSearchQueryChange: setSearchQuery, selectedBranch: branchCode, onSelectedBranchChange: () => undefined, branchLocked: true, tenantName, roleLabel: `Receptionist · ${account.displayName} · ${branchName}`, accessMode: 'full' as const, onNotify: setToast };
    if (page === 'appointments') return <TenantAdminAppointments {...commonProps} />;
    if (page === 'customers') return <TenantAdminCustomers {...commonProps} onBookCustomer={(customer) => { setSearchQuery(customer.phone); setPage('appointments'); setToast(`Đã chọn ${customer.name}. Hãy tạo lịch hẹn mới.`); }} />;
    if (page === 'products') return <ReceptionistProducts {...commonProps} />;
    if (page === 'stations') return <ReceptionistStations {...commonProps} />;
    return <TenantAdminPayments {...commonProps} />;
  };

  return (
    <div className="role-shell role-shell--reception reception-workspace min-h-screen bg-brand-bg text-brand-text">
      <aside className={`role-sidebar reception-sidebar fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#071e1a] text-white shadow-2xl transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
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
        <header className="role-topbar sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-brand-outline bg-brand-surface/95 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl border border-brand-outline p-2.5 text-brand-text lg:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden min-w-0 sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text-muted">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</p><p className="mt-1 text-sm font-black text-brand-text">{navItems.find((item) => item.id === page)?.label}</p></div>
          <div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={page === 'products' ? 'Tìm tên, SKU, lô sản phẩm...' : page === 'stations' ? 'Tìm mã ghế, khách, kỹ thuật viên...' : 'Tìm tên, số điện thoại, dịch vụ...'} className="h-10 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 pl-10 pr-4 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></div>
          <div className="hidden h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-800 sm:flex" title="Tài khoản chỉ được điều phối chi nhánh này"><Store className="h-3.5 w-3.5" />{branchCode === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3'}<ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /></div>
          <button
            type="button"
            onClick={() => onThemeChange(nextThemeMode)}
            className="flex h-10 items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface-high px-3 text-[10px] font-black text-brand-text-muted transition hover:bg-brand-surface-highest hover:text-brand-text"
            aria-label={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            aria-pressed={themeMode === 'dark'}
            title={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {themeMode === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            <span className="hidden sm:inline">{themeMode === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative rounded-xl border border-brand-outline p-2.5 text-brand-text-muted hover:bg-brand-surface-high"
              aria-label={`Thông báo tại quầy, ${deskAlerts.length} mục cần chú ý`}
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" />
              {deskAlerts.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-brand-surface" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-brand-outline bg-brand-surface p-3 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-xs font-black">Thông báo tại quầy</p>
                  <span className="text-[9px] font-bold text-rose-600">{deskAlerts.length} cần chú ý</span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {deskAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => { setShowNotifications(false); setPage('desk'); }}
                      className={`w-full rounded-xl p-3 text-left ${alert.tone === 'cyan' ? 'bg-cyan-50 text-cyan-900' : alert.tone === 'amber' ? 'bg-amber-50 text-amber-900' : 'bg-violet-50 text-violet-900'}`}
                    >
                      <p className="text-[10px] font-black">{alert.title}</p>
                      <p className="mt-1 text-[9px] opacity-75">{alert.detail}</p>
                    </button>
                  ))}
                  {deskAlerts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-brand-outline p-6 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
                      <p className="mt-2 text-[10px] font-black text-brand-text">Quầy đang vận hành ổn định</p>
                      <p className="mt-1 text-[9px] text-brand-text-muted">Không có mục cần xử lý ngay.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="role-main mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"><Suspense fallback={<div className="py-24 text-center text-xs font-bold text-brand-text-muted">Đang tải không gian lễ tân...</div>}>{renderPage()}</Suspense></main>
      </div>

      {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-950 px-4 py-3 text-xs font-bold text-white shadow-2xl"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />{toast}</div>}

      {deletingAppointment && (
        <Modal
          title="Xác nhận hủy lịch tạo nhầm"
          description="Lịch không bị xóa mất dấu vết. Hệ thống sẽ chuyển sang trạng thái Đã hủy và lưu lý do để đối soát."
          onClose={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}
        >
          <form onSubmit={submitDeleteAppointment} className="space-y-4">
            <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/12 to-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/25">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-brand-text">{deletingAppointment.customer}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-text-muted">
                    {deletingAppointment.start} · {deletingAppointment.service} · {deletingAppointment.phone}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ring-inset ${statusMeta[deletingAppointment.status].badge}`}>
                      {statusMeta[deletingAppointment.status].label}
                    </span>
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-[9px] font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {deletingAppointment.staff}
                    </span>
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-[9px] font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {money(deletingAppointment.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-3 text-[10px] font-bold leading-5 text-brand-text-muted sm:grid-cols-2">
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Chỉ cho hủy lịch chưa bắt đầu dịch vụ</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã thanh toán</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã có cọc</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Lưu người thao tác và thời gian</p>
            </div>

            <Field label="Lý do hủy/xóa khỏi quầy *">
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                className="reception-input min-h-24 resize-none"
                placeholder="Ví dụ: Tạo nhầm lịch, khách đặt trùng, nhập sai số điện thoại..."
                autoFocus
              />
            </Field>

            {formError && <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs font-bold text-rose-600">{formError}</p>}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}
                className="rounded-xl border border-brand-outline bg-brand-surface px-4 py-2.5 text-xs font-black text-brand-text hover:bg-brand-surface-high"
              >
                Giữ lại lịch
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" /> Xác nhận hủy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {walkInOpen && (
        <Modal
          title="Tiếp nhận khách vãng lai"
          description="Tạo lượt phục vụ tại quầy và đưa khách vào hàng chờ ngay lập tức."
          onClose={() => { setWalkInOpen(false); setFormError(''); }}
        >
          <form onSubmit={submitWalkIn} className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-[10px] font-bold leading-5 text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Hệ thống kiểm tra trùng số điện thoại, kỹ thuật viên, khung giờ và ghế/phòng trước khi tạo lượt.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *">
                <input value={walkIn.customer} onChange={(event) => setWalkIn({ ...walkIn, customer: event.target.value })} className="reception-input" placeholder="Nguyễn Minh Anh" autoFocus />
              </Field>
              <Field label="Số điện thoại *">
                <input type="tel" value={walkIn.phone} onChange={(event) => setWalkIn({ ...walkIn, phone: event.target.value })} className="reception-input" placeholder="09xx xxx xxx" />
              </Field>
              <Field label="Dịch vụ *">
                <select value={walkIn.service} onChange={(event) => handleWalkInServiceChange(event.target.value)} className="reception-input">
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *">
                <select value={walkIn.staff} onChange={(event) => setWalkIn({ ...walkIn, staff: event.target.value })} className="reception-input">
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng">
                <select value={walkIn.station} onChange={(event) => setWalkIn({ ...walkIn, station: event.target.value })} className="reception-input">
                  <option value="">Xếp sau khi check-in</option>
                  {stationCatalog[branchCode].map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *">
                <input type="time" value={walkIn.start} onChange={(event) => setWalkIn({ ...walkIn, start: event.target.value })} className="reception-input" />
              </Field>
              <Field label="Thời lượng *">
                <select value={walkIn.duration} onChange={(event) => setWalkIn({ ...walkIn, duration: event.target.value })} className="reception-input">
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *">
                <input type="number" min="1000" step="1000" value={walkIn.price} onChange={(event) => setWalkIn({ ...walkIn, price: event.target.value })} className="reception-input" />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={walkIn.note} onChange={(event) => setWalkIn({ ...walkIn, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Dị ứng, sở thích hoặc yêu cầu đặc biệt..." />
            </Field>
            {formError && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-xs font-bold text-rose-600">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setWalkInOpen(false); setFormError(''); }} className="rounded-xl border border-brand-outline px-4 py-2.5 text-xs font-bold">Hủy</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-600/20"><UserCheck className="h-4 w-4" /> Tạo & check-in</button>
            </div>
          </form>
        </Modal>
      )}

      {editingAppointment && (
        <Modal
          title={`Điều phối lịch ${editingAppointment.start}`}
          description={`${editingAppointment.customer} · ${statusMeta[editingAppointment.status].label} · ${branchName}`}
          onClose={() => { setEditingAppointment(null); setFormError(''); }}
        >
          <form onSubmit={submitAppointmentEdit} className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-[10px] font-bold leading-5 text-emerald-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Chỉ kỹ thuật viên đang làm việc và có đúng chuyên môn mới được phân công. Ghế/phòng cũng được kiểm tra trùng giờ.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *">
                <input value={appointmentEditForm.customer} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, customer: event.target.value })} className="reception-input" autoFocus />
              </Field>
              <Field label="Số điện thoại *">
                <input type="tel" value={appointmentEditForm.phone} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, phone: event.target.value })} className="reception-input" />
              </Field>
              <Field label="Dịch vụ *">
                <select value={appointmentEditForm.service} onChange={(event) => handleAppointmentEditServiceChange(event.target.value)} className="reception-input">
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *">
                <select value={appointmentEditForm.staff} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, staff: event.target.value })} className="reception-input">
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng">
                <select value={appointmentEditForm.station} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, station: event.target.value })} className="reception-input">
                  <option value="">Chưa xếp ghế</option>
                  {stationCatalog[branchCode].map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *">
                <input type="time" value={appointmentEditForm.start} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, start: event.target.value })} className="reception-input" />
              </Field>
              <Field label="Thời lượng *">
                <select value={appointmentEditForm.duration} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, duration: event.target.value })} className="reception-input">
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *">
                <input type="number" min="1000" step="1000" value={appointmentEditForm.price} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, price: event.target.value })} className="reception-input" />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={appointmentEditForm.note} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Yêu cầu của khách, dị ứng, mẫu tham khảo..." />
            </Field>
            {formError && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-xs font-bold text-rose-600">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setEditingAppointment(null); setFormError(''); }} className="rounded-xl border border-brand-outline px-4 py-2.5 text-xs font-bold">Hủy</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-600/20"><Check className="h-4 w-4" /> Lưu điều phối</button>
            </div>
          </form>
        </Modal>
      )}

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

            <aside className="min-w-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 scrollbar-thin scrollbar-thumb-brand-outline/60">
              {/* Thẻ 1: Khách hàng & Bảng danh sách dịch vụ đã chọn (Vừa khít chiều rộng, không cuộn ngang) */}
              <div className="selected-services rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-sm flex flex-col w-full min-w-0 lg:flex-1 lg:min-h-[360px] min-h-[320px] overflow-hidden overflow-x-hidden">
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

                <div className="mt-3 flex flex-col gap-2 shrink-0 pb-2 w-full min-w-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ReceiptText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <h3 className="text-xs font-black text-brand-text truncate">Chi tiết dịch vụ, giá tiền & ưu đãi</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                    <span className="rounded-full bg-brand-surface-high px-2 py-0.5 text-brand-text-muted shrink-0">{invoiceLines.length} dòng</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 shrink-0">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                    {invoiceDiscount > 0 && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-500 shrink-0">Ưu đãi -{money(invoiceDiscount)}</span>}
                  </div>
                </div>

                {/* Khung Bảng dịch vụ (overflow-x-hidden) */}
                <div className="service-list-container mt-1 flex-1 flex flex-col min-h-[240px] w-full min-w-0 overflow-hidden overflow-x-hidden rounded-xl border border-brand-outline/60 bg-brand-surface-high/20">
                  {/* Hàng tiêu đề Bảng (Hiện trên xl:) */}
                  <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-center gap-1 px-2 py-2 text-[8px] font-extrabold uppercase tracking-wider text-brand-text-muted border-b border-brand-outline bg-brand-surface-high/50 shrink-0 w-full min-w-0">
                    <span className="text-center min-w-0">STT</span>
                    <span className="min-w-0">Tên dịch vụ</span>
                    <span className="text-right min-w-0">Đơn giá</span>
                    <span className="min-w-0">Kỹ thuật viên</span>
                    <span className="text-center min-w-0">Số lượng</span>
                    <span className="text-right min-w-0">Thành tiền</span>
                    <span className="text-center min-w-0">Xóa</span>
                  </div>

                  {/* Vùng cuộn các dòng Bảng (Chỉ cuộn dọc, cấm cuộn ngang) */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 divide-y divide-brand-outline/40 scrollbar-thin scrollbar-thumb-brand-outline/60 py-0.5">
                    {invoiceLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="w-full min-w-0 text-xs transition-colors hover:bg-brand-surface-high/40 shrink-0"
                      >
                        {/* 1-Row Grid Layout chuẩn xác trên xl: */}
                        <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-center gap-1 w-full min-w-0 px-2 py-2.5">
                          {/* STT: 44px */}
                          <div className="flex justify-center items-center min-w-0">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black border ${line.type === 'SERVICE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Tên dịch vụ: minmax(120px, 1fr) */}
                          <div className="min-w-0" title={line.name}>
                            <p className="font-bold text-brand-text text-[11px] leading-snug line-clamp-2 min-w-0">
                              {line.name}
                            </p>
                            <p className="mt-0.5 truncate text-[8px] font-semibold text-brand-text-muted">{line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · {line.staff}</p>
                          </div>

                          {/* Đơn giá: minmax(115px, 130px) */}
                          <div className="min-w-0 w-full text-right">
                            <span className="block truncate text-[9px] font-bold text-brand-text-muted">x {money(line.unitPrice)}</span>
                          </div>

                          {/* Kỹ thuật viên: minmax(130px, 160px) */}
                          <div className="min-w-0 w-full">
                            {line.type === 'SERVICE' ? (
                              <select
                                value={line.staff}
                                onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                className={`h-8 w-full min-w-0 rounded-lg border px-1 text-[9px] font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
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
                              <div className="h-8 w-full min-w-0 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold">
                                Sản phẩm
                              </div>
                            )}
                          </div>

                          {/* Số lượng: 120px */}
                          <div className="min-w-0 w-full flex justify-center">
                            <div className="flex h-8 w-full min-w-0 items-center justify-between rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                                aria-label={`Giảm số lượng ${line.name}`}
                              >
                                −
                              </button>
                              <span className="text-[11px] font-black text-brand-text flex-1 text-center min-w-0">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                                aria-label={`Tăng số lượng ${line.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Thành tiền: minmax(100px, 120px) */}
                          <div className="min-w-0 w-full text-right">
                            <strong className="block text-[11px] font-black text-brand-text tracking-tight min-w-0 truncate">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>

                          {/* Xóa: 32px */}
                          <div className="min-w-0 w-[22px] flex justify-center">
                            <button
                              type="button"
                              onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                              className="flex h-7 w-6 items-center justify-center rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500/15 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition-all"
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
                              <span className="min-w-0">
                                <p className="font-bold text-brand-text text-xs leading-snug line-clamp-2 min-w-0" title={line.name}>
                                  {line.name}
                                </p>
                                <p className="mt-0.5 text-[9px] font-semibold text-brand-text-muted">{line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · Đơn giá {money(line.unitPrice)}</p>
                              </span>
                            </div>
                            <strong className="text-xs font-black text-brand-text shrink-0 text-right">
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
              <div className="rounded-2xl border border-emerald-500/25 bg-brand-surface p-4 shadow-sm text-[10px] lg:shrink-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-emerald-500">Đối soát hóa đơn</p>
                    <p className="mt-1 text-[9px] text-brand-text-muted">Giá dịch vụ, cọc, ưu đãi, tip, thuế/phụ phí và tổng cuối.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black text-emerald-600">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                </div>

                <div className="rounded-xl border border-brand-outline/70 bg-brand-surface-high/25 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-brand-text-muted">Tạm tính</span>
                      <strong className="mt-1 block text-sm font-black text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-brand-text-muted">Ưu đãi</span>
                      <strong className="mt-1 block text-sm font-black text-rose-500">-{money(invoiceDiscount)}</strong>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-brand-outline/40 pt-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><ReceiptText className="h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><span className="truncate">Tổng tiền dịch vụ</span></span>
                      <strong className="text-right text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /><span className="truncate">Tiền cọc</span></span>
                      <strong className="text-right text-emerald-600">- {money(paymentAppointment.deposit)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 shrink-0 text-rose-500" /><span className="truncate">Giảm giá / Ưu đãi</span></span>
                      <strong className="text-right text-rose-500">- {money(invoiceDiscount)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><WalletCards className="h-3.5 w-3.5 shrink-0 text-emerald-500" /><span className="truncate">Tip kỹ thuật viên</span></span>
                      <strong className="text-right text-emerald-600">+ {money(invoiceTip)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0 text-amber-500" /><span className="truncate">Thuế / Phụ phí nếu có</span></span>
                      <strong className="text-right text-amber-600">+ {money(invoiceTaxAndFees)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-rose-500">Ưu đãi</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-rose-500">-</span>
                        <input type="number" min="0" step="1000" value={paymentForm.discount} onChange={(event) => setPaymentForm({ ...paymentForm, discount: event.target.value })} className="w-[86px] rounded-lg border border-rose-500/20 bg-brand-surface py-1.5 px-2 text-right text-[10px] font-black text-brand-text outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, discount: String(val) })} className={`rounded-lg px-1.5 py-1.5 text-[8px] font-black transition ${Number(paymentForm.discount) === val ? 'bg-rose-500 text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `-${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-emerald-600">Tip KTV</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-emerald-500">+</span>
                        <input type="number" min="0" step="1000" value={paymentForm.tip} onChange={(event) => setPaymentForm({ ...paymentForm, tip: event.target.value })} className="w-[86px] rounded-lg border border-emerald-500/20 bg-brand-surface py-1.5 px-2 text-right text-[10px] font-black text-brand-text outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, tip: String(val) })} className={`rounded-lg px-1.5 py-1.5 text-[8px] font-black transition ${Number(paymentForm.tip) === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `+${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-950/45 via-emerald-900/35 to-teal-950/45 border border-emerald-500/40 p-3.5 shadow-inner">
                  <div className="min-w-0">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">Tổng thanh toán cuối cùng</span>
                    <span className="mt-0.5 block truncate text-[8px] text-brand-text-muted">Sau cọc, ưu đãi, tip và thuế/phụ phí</span>
                  </div>
                  <strong className="text-right text-2xl font-black tracking-tight text-emerald-400 sm:text-3xl">{money(invoiceTotal)}</strong>
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

      {editingTechnician && <Modal title={`Cập nhật ${editingTechnician.name}`} description="Chỉnh trạng thái hôm nay, ca làm, giờ đi làm, giờ nghỉ và ghi chú nghỉ nếu có." onClose={() => { setEditingTechnician(null); setFormError(''); }}>
        <form onSubmit={submitTechnicianEdit} className="space-y-4">
          {formError && <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-600">{formError}</div>}
          <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xs font-black text-white ${editingTechnician.avatarTone}`}>{editingTechnician.initials}</span>
              <div>
                <p className="text-sm font-black text-brand-text">{editingTechnician.name}</p>
                <p className="mt-1 text-[10px] font-bold text-brand-text-muted">{editingTechnician.specialty} · {editingTechnician.branch}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[10px] font-black text-brand-text-muted">Trạng thái hôm nay</span>
              <select value={technicianEditForm.status} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, status: event.target.value as TechnicianStatus }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10">
                {Object.entries(technicianStatusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black text-brand-text-muted">Ca làm việc</span>
              <select value={technicianEditForm.shift} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, shift: event.target.value as TechnicianShift }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10">
                {Object.entries(technicianShiftMeta).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black text-brand-text-muted">Giờ đi làm / check-in</span>
              <input type="time" value={technicianEditForm.checkIn} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, checkIn: event.target.value }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black text-brand-text-muted">Giờ nghỉ / check-out</span>
              <input type="time" value={technicianEditForm.checkOut} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, checkOut: event.target.value }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black text-brand-text-muted">Ghi chú nghỉ / đi trễ / bàn giao ca</span>
            <textarea value={technicianEditForm.leaveNote} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, leaveNote: event.target.value }))} placeholder="Ví dụ: báo nghỉ ốm lúc 07:10, nghỉ phép đã duyệt, vào trễ do kẹt xe..." className="min-h-24 w-full resize-y rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 py-3 text-xs font-semibold leading-5 text-brand-text outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 placeholder:text-brand-text-muted/60" />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setEditingTechnician(null); setFormError(''); }} className="rounded-xl border border-brand-outline bg-brand-surface px-4 py-2.5 text-xs font-bold text-brand-text-muted hover:bg-brand-surface-high">Hủy</button>
            <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">Lưu cập nhật</button>
          </div>
        </form>
      </Modal>}

      {shiftModal && (
        <Modal
          title={shiftModal === 'OPEN' ? 'Mở ca lễ tân' : 'Đối soát & chốt ca'}
          description={shiftModal === 'OPEN' ? 'Ghi nhận quỹ tiền mặt trước khi bắt đầu vận hành.' : 'Kiểm tra khách đang phục vụ, doanh thu tiền mặt và số quỹ thực tế.'}
          onClose={() => { setShiftModal(null); setFormError(''); }}
        >
          <form onSubmit={submitShift} className="space-y-4">
            {shiftModal === 'CLOSE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-brand-surface-high/60 p-3">
                    <p className="text-[9px] font-black uppercase tracking-wide text-brand-text-muted">Quỹ đầu ca</p>
                    <p className="mt-2 text-sm font-black text-brand-text">{money(shift.openingCash)}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Thu tiền mặt</p>
                    <p className="mt-2 text-sm font-black text-emerald-800">+ {money(cashCollectedToday)}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white">
                    <span className="text-[10px] font-bold text-slate-300">Quỹ hệ thống dự kiến</span>
                    <strong className="text-lg font-black">{money(expectedClosingCash)}</strong>
                  </div>
                </div>
                {activeAppointments.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10px] font-bold leading-5 text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Còn {activeAppointments.length} khách đang chờ hoặc đang phục vụ. Chưa thể chốt ca.
                  </div>
                )}
              </>
            )}
            <Field label={shiftModal === 'OPEN' ? 'Tiền quỹ đầu ca' : 'Tiền mặt đếm thực tế cuối ca'}>
              <input type="number" min="0" step="1000" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className="reception-input" autoFocus />
            </Field>
            {shiftModal === 'CLOSE' && (
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[10px] font-black ${closingCashDifference === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                <span>Chênh lệch quỹ</span>
                <strong>{closingCashDifference === 0 ? 'Khớp hệ thống' : `${closingCashDifference > 0 ? 'Thừa' : 'Thiếu'} ${money(Math.abs(closingCashDifference))}`}</strong>
              </div>
            )}
            {formError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</p>}
            <button type="submit" disabled={shiftModal === 'CLOSE' && activeAppointments.length > 0} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {shiftModal === 'OPEN' ? 'Xác nhận mở ca' : 'Xác nhận chốt ca'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">{label}</span>{children}</label>;
}
