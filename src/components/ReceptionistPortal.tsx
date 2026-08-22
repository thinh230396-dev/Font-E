import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
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
  Clock,
  Clock3,
  CreditCard,
  DoorOpen,
  Edit3,
  Flame,
  HelpCircle,
  Hourglass,
  Image,
  Info,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Merge,
  MessageCircle,
  Minus,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  PackageSearch,
  Plus,
  ReceiptText,
  Scissors,
  Search,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Split,
  Store,
  Sun,
  Tag,
  TimerReset,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';
import { resetTenantMockStorage } from '../utils/mockDataReset';
import { validateAndCalculatePromotion, type LoyaltyProgram } from '../utils/promotionUtils';
import { serviceSeed, type SalonService } from './TenantAdminServices';
import { designSeed, colorSeed, type NailDesign, type PolishColor } from './TenantAdminNailGallery';
import { Button, Field, Modal, StatusBadge } from './ui';

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

export interface ArtDifficultyPreset {
  level: number;
  label: string;
  shortLabel: string;
  surcharge: number;
  badge: string;
  description: string;
}

export const ART_DIFFICULTY_PRESETS: ArtDifficultyPreset[] = [
  { level: 0, label: 'Sơn trơn / Không kèm vẽ mẫu (+0đ)', shortLabel: 'Sơn trơn (+0đ)', surcharge: 0, badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', description: 'Chỉ sơn màu trơn cơ bản, không có vẽ mẫu hoặc họa tiết' },
  { level: 1, label: 'Độ khó 1 · Cơ bản (+50.000đ)', shortLabel: 'Cơ bản (+50k)', surcharge: 50000, badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800', description: 'Vẽ line đơn giản, chấm bi, french đầu móng, dán sticker 2-4 ngón' },
  { level: 2, label: 'Độ khó 2 · Tiêu chuẩn (+100.000đ)', shortLabel: 'Tiêu chuẩn (+100k)', surcharge: 100000, badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800', description: 'Ombre chuyển màu, vân đá Marble, mắt mèo Cat Eye, vẽ hoa nổi 4-6 ngón' },
  { level: 3, label: 'Độ khó 3 · Nâng cao / Chi tiết (+200.000đ)', shortLabel: 'Nâng cao (+200k)', surcharge: 200000, badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800', description: 'Vẽ hoạt hình Anime, vẽ hoa tả thực nhiều tầng, họa tiết phức tạp 10 ngón' },
  { level: 4, label: 'Độ khó 4 · Masterpiece / 3D (+350.000đ)', shortLabel: '3D/Full set (+350k)', surcharge: 350000, badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800', description: 'Vẽ tranh phong cảnh nghệ thuật, đắp nổi 3D, đính đá & charm pha lê full set' },
  { level: 99, label: 'Tùy chỉnh giá theo mẫu riêng của khách', shortLabel: 'Tùy chỉnh giá', surcharge: 0, badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800', description: 'Lễ tân tự nhập mức phụ thu / giá thỏa thuận riêng dựa trên mẫu khách gửi' },
];

export interface NailArtTemplate {
  id: string;
  name: string;
  defaultLevel: number;
  category: string;
  surcharge: number;
  description: string;
  popularTone?: string;
  tags: string[];
  duration: number;
  baseServiceId?: string;
  imageUrl?: string;
  preview?: number;
  colors?: Array<{ name: string; hex: string; code: string }>;
  materials?: string[];
}

export const NAIL_ART_TEMPLATES: NailArtTemplate[] = [
  { id: 'ART-01', name: 'Vẽ hoa nổi 3D (3D Floral Art)', defaultLevel: 2, category: 'Vẽ hoa & Đắp nổi', surcharge: 100000, description: 'Đắp cánh hoa nổi 3D mềm mại, đính nhụy ngọc trai nhỏ xinh', tags: ['hoa 3D', 'ngọc trai', 'nữ tính'], duration: 30 },
  { id: 'ART-02', name: 'Vẽ hoạt hình Anime / Nhân vật', defaultLevel: 3, category: 'Nhân vật hoạt hình', surcharge: 200000, description: 'Vẽ cọ nét nhân vật hoạt hình Anime, chi tiết mắt và biểu cảm tinh xảo', tags: ['anime', 'hoạt hình', 'chi tiết'], duration: 45 },
  { id: 'ART-03', name: 'Vẽ tranh phong cảnh / Nghệ thuật trừu tượng', defaultLevel: 4, category: 'Tranh nghệ thuật', surcharge: 350000, description: 'Vẽ tranh nghệ thuật phong cảnh/sơn dầu đa tầng theo yêu cầu riêng', tags: ['phong cảnh', 'sơn dầu', 'masterpiece'], duration: 60 },
  { id: 'ART-04', name: 'Vân đá cẩm thạch Marble Art', defaultLevel: 2, category: 'Hiệu ứng đá', surcharge: 100000, description: 'Vân đá loang cẩm thạch tự nhiên viền nhũ vàng sang trọng', tags: ['marble', 'vân đá', 'sang trọng'], duration: 25 },
  { id: 'ART-05', name: 'Ombre chuyển sắc Hàn Quốc', defaultLevel: 1, category: 'Ombre & Gradient', surcharge: 50000, description: 'Chuyển sắc mượt mà phong cách Hàn Quốc dịu dàng', tags: ['ombre', 'gradient', 'hàn quốc'], duration: 20 },
  { id: 'ART-06', name: 'Mắt mèo kim cương Cat Eye', defaultLevel: 2, category: 'Hiệu ứng lấp lánh', surcharge: 100000, description: 'Hút mắt mèo vệt sáng kim cương chuyển động theo góc nhìn', tags: ['cat eye', 'mắt mèo', 'lấp lánh'], duration: 20 },
  { id: 'ART-07', name: 'Tráng gương Chrome Aurora', defaultLevel: 2, category: 'Tráng gương Chrome', surcharge: 100000, description: 'Hiệu ứng tráng gương ánh xà cừ / bạc bóng gương siêu sáng', tags: ['chrome', 'tráng gương', 'aurora'], duration: 20 },
  { id: 'ART-08', name: 'Đính đá Swarovski & Charm nơ 3D', defaultLevel: 3, category: 'Đính đá & Charm', surcharge: 200000, description: 'Đính pha lê Swarovski sáng lấp lánh kết hợp charm nơ 3D', tags: ['đính đá', 'swarovski', 'charm 3d'], duration: 35 },
  { id: 'ART-09', name: 'French nghệ thuật cách điệu', defaultLevel: 1, category: 'French Art', surcharge: 50000, description: 'Vẽ french đầu móng đường lượn sóng hoặc viền đôi cá tính', tags: ['french', 'đầu móng', 'tối giản'], duration: 20 },
  { id: 'ART-10', name: 'Mẫu vẽ tùy chọn theo ảnh khách gửi', defaultLevel: 99, category: 'Mẫu tự chọn', surcharge: 150000, description: 'Khách gửi ảnh mẫu trên điện thoại, KTV và quầy định giá linh hoạt', tags: ['tự chọn', 'theo mẫu', 'linh hoạt'], duration: 40 },
];

export interface PolishColorOption {
  id: string;
  name: string;
  brand: string;
  code: string;
  hex: string;
  finish: string;
}

export const POLISH_COLOR_OPTIONS: PolishColorOption[] = [
  { id: 'CLR-01', name: 'Bubble Bath (Nude hồng sheer)', brand: 'OPI', code: 'NL S86', hex: '#e9c9c2', finish: 'Sheer Nude' },
  { id: 'CLR-02', name: 'Merlot Ruby (Đỏ rượu sang chảnh)', brand: 'DND', code: '751', hex: '#681c2c', finish: 'Cream Đỏ rượu' },
  { id: 'CLR-03', name: 'Milky White (Trắng sữa tự nhiên)', brand: 'DND', code: 'MW-01', hex: '#f5eee8', finish: 'Milky Pastel' },
  { id: 'CLR-04', name: 'Aurora Pearl (Ánh ngọc trai tím)', brand: 'AP', code: 'AP-03', hex: '#d9d4ea', finish: 'Pearl Shimmer' },
  { id: 'CLR-05', name: 'Glass Ocean Blue (Thạch pha lê)', brand: 'GB', code: 'GB-02', hex: '#7bc5d9', finish: 'Jelly Blue' },
  { id: 'CLR-06', name: 'Liquid Gold (Nhũ vàng ánh kim)', brand: 'LG', code: 'LG-08', hex: '#c99b42', finish: 'Metallic Gold' },
  { id: 'CLR-07', name: 'Blush Petal (Hồng cánh hoa)', brand: 'BP', code: 'BP-08', hex: '#efb7c0', finish: 'Soft Blush' },
  { id: 'CLR-08', name: 'Cat Eye Magnet Silver (Mắt mèo xám)', brand: 'CE', code: 'CE-05', hex: '#949bb0', finish: 'Magnetic Silver' },
];

export interface AttachedAccessoryOption {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const ATTACHED_ACCESSORY_OPTIONS: AttachedAccessoryOption[] = [
  { id: 'ACC-01', name: 'Không kèm phụ kiện thêm', price: 0, category: 'Mặc định' },
  { id: 'ACC-02', name: 'Charm nơ 3D ngọc trai (2 ngón)', price: 40000, category: 'Charm 3D' },
  { id: 'ACC-03', name: 'Set đá pha lê Swarovski mini (4 ngón)', price: 60000, category: 'Đá pha lê' },
  { id: 'ACC-04', name: 'Foil ánh kim & Xà cừ đại dương', price: 50000, category: 'Hiệu ứng' },
  { id: 'ACC-05', name: 'Dầu dưỡng viền móng Keratin (tại chỗ)', price: 30000, category: 'Dưỡng móng' },
  { id: 'ACC-06', name: 'Top coat tráng gương bóng siêu bền', price: 35000, category: 'Sơn phủ' },
];

export interface AllergyOrSpecialNoteOption {
  id: string;
  label: string;
  shortLabel: string;
  type: 'ALLERGY' | 'SENSITIVITY' | 'PREFERENCE' | 'VIP';
  icon: string;
  tone: string;
}

export const COMMON_ALLERGY_SPECIAL_NOTES: AllergyOrSpecialNoteOption[] = [
  { id: 'AL-01', label: 'Dị ứng Axeton / Cồn / Hóa chất', shortLabel: 'Dị ứng axeton/cồn', type: 'ALLERGY', icon: '⚠️', tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' },
  { id: 'AL-02', label: 'Da mỏng / Dễ rát / Chảy máu', shortLabel: 'Da tay mỏng dễ rát', type: 'SENSITIVITY', icon: '⚠️', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30' },
  { id: 'AL-03', label: 'Móng yếu / Mỏng / Dễ gãy nứt', shortLabel: 'Móng mỏng yếu', type: 'SENSITIVITY', icon: '💅', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30' },
  { id: 'AL-04', label: 'Không dùng tinh dầu / Bạc hà', shortLabel: 'Tránh bạc hà', type: 'ALLERGY', icon: '🌿', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' },
  { id: 'AL-05', label: 'Yêu cầu thợ làm nhẹ tay, sợ đau', shortLabel: 'Làm nhẹ tay', type: 'PREFERENCE', icon: '✨', tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30' },
  { id: 'AL-06', label: 'Khách VIP / Tiêu chuẩn khắt khe', shortLabel: 'Khách VIP', type: 'VIP', icon: '⭐', tone: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30' },
  { id: 'AL-07', label: 'Khách đang vội / Cần làm nhanh', shortLabel: 'Cần làm gấp', type: 'PREFERENCE', icon: '⚡', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' },
];

export const extractCustomerAlerts = (appointment: ReceptionAppointment) => {
  const alerts: Array<{ label: string; shortLabel: string; tone: string; icon: string }> = [];
  const noteText = `${appointment.note || ''}`.toLowerCase();

  // If explicit allergies / tags
  (appointment.allergies || []).forEach((a) => {
    const found = COMMON_ALLERGY_SPECIAL_NOTES.find((item) => item.label.toLowerCase() === a.toLowerCase() || item.shortLabel.toLowerCase() === a.toLowerCase() || a.toLowerCase().includes(item.shortLabel.toLowerCase()));
    if (found) {
      if (!alerts.some((al) => al.shortLabel === found.shortLabel)) {
        alerts.push({ label: found.label, shortLabel: found.shortLabel, tone: found.tone, icon: found.icon });
      }
    } else {
      alerts.push({ label: a, shortLabel: a, tone: 'bg-rose-500/10 text-rose-600 border border-rose-500/30', icon: '⚠️' });
    }
  });

  (appointment.specialTags || []).forEach((t) => {
    if (!alerts.some((al) => al.label.toLowerCase() === t.toLowerCase())) {
      const found = COMMON_ALLERGY_SPECIAL_NOTES.find((item) => item.label.toLowerCase() === t.toLowerCase() || item.shortLabel.toLowerCase() === t.toLowerCase());
      if (found) {
        alerts.push({ label: found.label, shortLabel: found.shortLabel, tone: found.tone, icon: found.icon });
      } else {
        alerts.push({ label: t, shortLabel: t, tone: 'bg-purple-500/10 text-purple-600 border border-purple-500/30', icon: '⭐' });
      }
    }
  });

  // Keyword extraction fallback from note
  if (noteText.includes('axeton') || noteText.includes('cồn') || (noteText.includes('dị ứng') && !alerts.some((a) => a.shortLabel.includes('axeton') || a.shortLabel.includes('Dị ứng')))) {
    if (!alerts.some((a) => a.shortLabel.includes('axeton') || a.shortLabel.includes('dị ứng'))) {
      alerts.push({ label: 'Dị ứng Axeton / Cồn / Hóa chất', shortLabel: 'Dị ứng axeton/cồn', tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30', icon: '⚠️' });
    }
  }
  if (noteText.includes('da mỏng') || noteText.includes('da tay mỏng') || noteText.includes('nhạy cảm') || noteText.includes('dễ rát')) {
    if (!alerts.some((a) => a.shortLabel.includes('Da tay mỏng') || a.shortLabel.includes('mỏng') || a.shortLabel.includes('nhạy cảm'))) {
      alerts.push({ label: 'Da tay mỏng / nhạy cảm', shortLabel: 'Da mỏng nhạy cảm', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30', icon: '⚠️' });
    }
  }
  if (noteText.includes('móng yếu') || noteText.includes('móng mỏng') || noteText.includes('dễ gãy')) {
    if (!alerts.some((a) => a.shortLabel.includes('mỏng') || a.shortLabel.includes('Móng'))) {
      alerts.push({ label: 'Móng yếu / mỏng', shortLabel: 'Móng mỏng yếu', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30', icon: '💅' });
    }
  }
  if (noteText.includes('bạc hà') || noteText.includes('tinh dầu')) {
    if (!alerts.some((a) => a.shortLabel.includes('bạc hà'))) {
      alerts.push({ label: 'Không dùng tinh dầu / Bạc hà', shortLabel: 'Tránh bạc hà', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30', icon: '🌿' });
    }
  }
  if (noteText.includes('nhẹ tay') || noteText.includes('sợ đau')) {
    if (!alerts.some((a) => a.shortLabel.includes('nhẹ tay'))) {
      alerts.push({ label: 'Yêu cầu làm nhẹ tay', shortLabel: 'Làm nhẹ tay', tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30', icon: '✨' });
    }
  }
  if (noteText.includes('vip') || noteText.includes('thành viên') || noteText.includes('khó tính')) {
    if (!alerts.some((a) => a.shortLabel.includes('VIP'))) {
      alerts.push({ label: 'Khách VIP / Tiêu chuẩn khắt khe', shortLabel: 'Khách VIP', tone: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30', icon: '⭐' });
    }
  }

  return alerts;
};

interface InvoiceLineDraft {
  id: string;
  type: InvoiceLineType;
  name: string;
  quantity: number;
  unitPrice: number;
  staff: string;
  basePrice?: number;
  fromCustomerName?: string;
  fromAppointmentId?: string;
  // Accompanied Art / Drawing / Design & Difficulty
  designId?: string;
  designName?: string;
  designLevel?: number;
  difficultyLabel?: string;
  designSurcharge?: number;
  customArtNote?: string;
  // Accompanied Product / Polish Color / Material
  attachedColorId?: string;
  attachedColorName?: string;
  attachedColorHex?: string;
  attachedProductId?: string;
  attachedProductName?: string;
  attachedProductPrice?: number;
}

interface CatalogItem {
  name: string;
  price: number;
  category: string;
  duration?: number;
  stock?: number;
}

export interface SplitPaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
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
  allergies?: string[];
  specialTags?: string[];
  serviceStartedAt?: string;
  serviceExtendedMinutes?: number;
  mergedWithAppointmentIds?: string[];
  station?: string;
  reminderSent?: boolean;
  createdBy?: string;
  firstVisit?: boolean;
  createdAt: string;
}

interface ReceptionPayment {
  id: string;
  appointmentId?: string;
  mergedAppointmentIds?: string[];
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
  splitPayments?: Array<{ method: PaymentMethod; amount: number; reference?: string }>;
  cashier: string;
  source: string;
  items: Array<{
    name: string;
    quantity: number;
    amount: number;
    staff: string;
    basePrice?: number;
    designName?: string;
    designLevel?: number;
    difficultyLabel?: string;
    designSurcharge?: number;
    attachedColorName?: string;
    attachedProductName?: string;
    customArtNote?: string;
  }>;
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
  allergies?: string[];
  specialTags?: string[];
  designName?: string;
  designLevel?: number;
  designSurcharge?: number;
}

interface ReceptionistPortalProps {
  account: DemoAccount;
  themeMode: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

export const SALON_OPEN_MINUTES = 8 * 60; // 08:00 (480 min)
export const SALON_CLOSE_MINUTES = 20 * 60 + 30; // 20:30 (1230 min)
export const SALON_LAST_BOOKING_MINUTES = 20 * 60; // 20:00 (1200 min)

export const formatMinutes = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getOperationalDefaultTime = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes >= SALON_OPEN_MINUTES && currentMinutes <= SALON_LAST_BOOKING_MINUTES) {
    const rounded = Math.ceil(currentMinutes / 5) * 5;
    return formatMinutes(Math.min(rounded, SALON_LAST_BOOKING_MINUTES));
  }
  return '08:00';
};

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const nowTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const getServiceTimerStatus = (appointment: ReceptionAppointment, nowTimeString?: string) => {
  if (appointment.status !== 'IN_SERVICE') return null;

  const currentNow = nowTimeString || nowTime();
  const [nowH, nowM] = currentNow.split(':').map(Number);
  const nowMinutes = (nowH * 60) + nowM;

  let startMinutes = 0;
  if (appointment.serviceStartedAt) {
    try {
      const d = new Date(appointment.serviceStartedAt);
      if (!isNaN(d.getTime())) {
        startMinutes = d.getHours() * 60 + d.getMinutes();
      } else {
        const [h, m] = appointment.start.split(':').map(Number);
        startMinutes = h * 60 + m;
      }
    } catch {
      const [h, m] = appointment.start.split(':').map(Number);
      startMinutes = h * 60 + m;
    }
  } else {
    const [h, m] = appointment.start.split(':').map(Number);
    startMinutes = h * 60 + m;
  }

  let elapsedMinutes = nowMinutes - startMinutes;
  if (elapsedMinutes < 0) elapsedMinutes = Math.max(10, 60 - Math.abs(elapsedMinutes)); // Wrap-around safeguard
  if (elapsedMinutes > 300) elapsedMinutes = Math.min(elapsedMinutes, (appointment.duration || 60) + 25);

  const duration = (appointment.duration || 60) + (appointment.serviceExtendedMinutes || 0);
  const isOverrun = elapsedMinutes > duration;
  const overrunMinutes = Math.max(0, elapsedMinutes - duration);
  const remainingMinutes = Math.max(0, duration - elapsedMinutes);
  const percent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / duration) * 100)));

  return {
    elapsedMinutes,
    duration,
    isOverrun,
    overrunMinutes,
    remainingMinutes,
    percent,
  };
};

const seedAppointments = (): ReceptionAppointment[] => {
  const now = new Date();
  const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const prevDateObj = new Date(now.getTime() - 86_400_000);
  const previousDate = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}-${String(prevDateObj.getDate()).padStart(2, '0')}`;
  const nextDateObj = new Date(now.getTime() + 86_400_000);
  const nextDate = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;
  const createdAt = new Date().toISOString();

  // Create an active in-service appointment with an overrun service time for demonstration
  const hourNow = now.getHours();
  const minNow = now.getMinutes();
  const serviceOverrunStartH = Math.max(8, hourNow - 1);
  const serviceOverrunStart = `${String(serviceOverrunStartH).padStart(2, '0')}:${String(Math.max(0, minNow - 25)).padStart(2, '0')}`;
  const serviceStartedOverrun = new Date(now.getTime() - 85 * 60000).toISOString();

  return [
    { id: 'APT-2101', customerId: 'CUS-1842', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: currentDate, start: '08:15', duration: 90, service: 'Gel Manicure + Nail Art cơ bản', services: ['Gel Manicure', 'Nail Art cơ bản'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ONLINE', status: 'COMPLETED', price: 850000, deposit: 300000, note: 'Khách VIP, đã dùng ưu đãi thành viên 50.000đ.', allergies: ['Khách VIP'], station: 'M-01', reminderSent: true, createdBy: 'Website', createdAt },
    { id: 'APT-2102', customerId: 'CUS-1796', customer: 'Trần Thu Hà', phone: '0908 337 912', date: currentDate, start: '09:30', duration: 75, service: 'Pedicure Spa + Sơn gel Hàn Quốc', services: ['Pedicure Spa', 'Sơn gel Hàn Quốc'], staff: 'Minh Châu', branch: 'Q3', source: 'PHONE', status: 'CHECKED_IN', price: 1170000, deposit: 200000, note: 'Không dùng tinh dầu bạc hà. Đi cùng bạn Mai Đức Anh.', allergies: ['Không dùng tinh dầu / Bạc hà'], station: 'P-02', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2103', customer: 'Lê Phương Anh', phone: '0901 486 320', date: currentDate, start: serviceOverrunStart, duration: 60, service: 'Nail Art Premium', services: ['Nail Art Premium'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ZALO', status: 'IN_SERVICE', price: 980000, deposit: 0, note: 'Mẫu chrome bạc, khách đã gửi ảnh tham khảo. Dị ứng axeton nhẹ.', allergies: ['Dị ứng Axeton / Cồn / Hóa chất'], serviceStartedAt: serviceStartedOverrun, station: 'M-04', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2104', customer: 'Mai Đức Anh', phone: '0939 772 618', date: currentDate, start: '11:45', duration: 60, service: 'Combo Manicure', services: ['Combo Manicure'], staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'PENDING', price: 620000, deposit: 0, note: 'Khách vãng lai, cần xác nhận dịch vụ trước khi làm.', createdBy: 'Lê Hoàng Nam', firstVisit: true, createdAt },
    { id: 'APT-2105', customer: 'Phạm Hoài Nam', phone: '0977 660 341', date: currentDate, start: '13:00', duration: 40, service: 'Tháo gel & phục hồi móng', services: ['Tháo gel & phục hồi móng'], staff: 'Thuỳ Dương', branch: 'Q3', source: 'PHONE', status: 'CONFIRMED', price: 280000, deposit: 0, note: 'Da tay nhạy cảm, dùng sản phẩm không mùi.', allergies: ['Da mỏng / Dễ rát / Chảy máu', 'Yêu cầu thợ làm nhẹ tay, sợ đau'], station: 'M-03', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2106', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', date: currentDate, start: '14:00', duration: 90, service: 'Nối móng Tips + Đính đá nghệ thuật', services: ['Nối móng Tips', 'Đính đá nghệ thuật'], staff: 'Minh Châu', branch: 'Q3', source: 'ONLINE', status: 'CONFIRMED', price: 1000000, deposit: 300000, note: 'Chuẩn bị mẫu đính đá tone champagne. Móng mỏng yếu.', allergies: ['Móng yếu / Mỏng / Dễ gãy nứt'], station: 'VIP-02', reminderSent: true, createdBy: 'Website', createdAt },
    { id: 'APT-2107', customer: 'Đỗ Tuấn Kiệt', phone: '0918 734 662', date: currentDate, start: '15:30', duration: 30, service: 'Waxing tay', services: ['Waxing tay'], staff: 'Quốc Bảo', branch: 'Q3', source: 'RECEPTION', status: 'CANCELLED', price: 320000, deposit: 0, note: 'Khách đổi sang ngày mai.', createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2108', customer: 'Tạ Mỹ Duyên', phone: '0933 112 800', date: currentDate, start: '16:15', duration: 90, service: 'Đắp bột', services: ['Đắp bột'], staff: 'Thảo Nguyễn', branch: 'Q3', source: 'ZALO', status: 'NO_SHOW', price: 850000, deposit: 0, note: 'Đã gọi 2 lần chưa nghe máy.', reminderSent: true, createdBy: 'Lê Hoàng Nam', createdAt },
    { id: 'APT-2111', customerId: 'CUS-2050', customer: 'Đinh Gia Hân', phone: '0902 826 114', date: currentDate, start: '09:00', duration: 120, service: 'Combo VIP', services: ['Combo VIP'], staff: 'Hà My', branch: 'Q1', source: 'ONLINE', status: 'CONFIRMED', price: 1650000, deposit: 500000, note: 'Chuẩn bị phòng VIP.', allergies: ['Khách VIP'], station: 'V-11', reminderSent: true, createdBy: 'Website', createdAt },
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

/**
 * Tông màu và icon của trạng thái do STATUS_MAP dùng chung quản lý.
 * Ở đây chỉ giữ cách gọi riêng tại quầy lễ tân (§2.6 — giữ từ vựng nghiệp vụ),
 * truyền vào StatusBadge qua prop `label`.
 */
const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đang chờ',
  IN_SERVICE: 'Đang phục vụ',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến',
};

const methodMeta: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  CASH: { label: 'Tiền mặt', icon: Banknote },
  BANK: { label: 'Chuyển khoản', icon: WalletCards },
  CARD: { label: 'Thẻ', icon: CreditCard },
  MOMO: { label: 'MoMo', icon: Smartphone },
  ZALOPAY: { label: 'ZaloPay', icon: Smartphone },
};

const defaultServiceCatalog: CatalogItem[] = [
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

const technicianStatusMeta: Record<TechnicianStatus, { label: string; helper: string }> = {
  PRESENT: { label: 'Có mặt', helper: 'Sẵn sàng nhận khách' },
  NOT_CHECKED_IN: { label: 'Chưa check-in', helper: 'Chưa vào ca' },
  SERVING: { label: 'Đang phục vụ', helper: 'Đang có khách' },
  BREAK: { label: 'Đang nghỉ giữa ca', helper: 'Tạm ngưng nhận khách' },
  SICK_REPORTED: { label: 'Báo nghỉ', helper: 'Đã báo nghỉ hôm nay' },
  ON_LEAVE: { label: 'Nghỉ phép', helper: 'Nghỉ theo lịch phép' },
  LATE: { label: 'Đi trễ', helper: 'Check-in trễ ca' },
};

const technicianShiftMeta: Record<TechnicianShift, string> = {
  MORNING: 'Ca sáng · 08:00–16:00',
  AFTERNOON: 'Ca chiều · 12:00–20:00',
  FULL_DAY: 'Ca nguyên ngày · 08:00–20:00',
};

const technicianSeed: ReceptionTechnician[] = [
  { id: 'TECH-001', name: 'Thảo Nguyễn', initials: 'TN', specialty: 'Nail Art Premium', skills: ['Nail Art Premium', 'Nail Art cơ bản', 'Gel Manicure', 'Đính đá nghệ thuật', 'Combo VIP'], shift: 'FULL_DAY', shiftLabel: technicianShiftMeta.FULL_DAY, status: 'SERVING', branch: 'Q3', checkIn: '07:52', avatarTone: 'from-brand-primary to-brand-primary' },
  { id: 'TECH-002', name: 'Minh Châu', initials: 'MC', specialty: 'Pedicure Spa', skills: ['Pedicure Spa', 'Gel Manicure', 'Sơn gel Hàn Quốc', 'Combo Manicure'], shift: 'MORNING', shiftLabel: technicianShiftMeta.MORNING, status: 'PRESENT', branch: 'Q3', checkIn: '08:05', avatarTone: 'from-brand-primary to-brand-secondary' },
  { id: 'TECH-003', name: 'Quốc Bảo', initials: 'QB', specialty: 'Manicure & Waxing', skills: ['Gel Manicure', 'Combo Manicure', 'Tháo gel & phục hồi móng', 'Waxing tay'], shift: 'MORNING', shiftLabel: technicianShiftMeta.MORNING, status: 'LATE', branch: 'Q3', checkIn: '08:34', avatarTone: 'from-brand-tertiary to-brand-tertiary' },
  { id: 'TECH-004', name: 'Thuỳ Dương', initials: 'TD', specialty: 'Sơn gel Hàn Quốc', skills: ['Sơn gel Hàn Quốc', 'Gel Manicure', 'Tháo gel & phục hồi móng'], shift: 'AFTERNOON', shiftLabel: technicianShiftMeta.AFTERNOON, status: 'NOT_CHECKED_IN', branch: 'Q3', avatarTone: 'from-brand-secondary to-brand-secondary' },
  { id: 'TECH-005', name: 'An Nhiên', initials: 'AN', specialty: 'Đính đá nghệ thuật', skills: ['Đính đá nghệ thuật', 'Nail Art cơ bản', 'Nail Art Premium', 'Nối móng Tips'], shift: 'AFTERNOON', shiftLabel: technicianShiftMeta.AFTERNOON, status: 'BREAK', branch: 'Q3', checkIn: '11:58', avatarTone: 'from-brand-primary to-brand-error' },
  { id: 'TECH-006', name: 'Khánh Vy', initials: 'KV', specialty: 'Đắp bột', skills: ['Đắp bột', 'Nối móng Tips', 'Combo VIP'], shift: 'FULL_DAY', shiftLabel: technicianShiftMeta.FULL_DAY, status: 'SICK_REPORTED', branch: 'Q3', leaveNote: 'Báo sốt lúc 07:10, quản lý đã xác nhận.', avatarTone: 'from-brand-secondary to-brand-secondary' },
  { id: 'TECH-011', name: 'Hà My', initials: 'HM', specialty: 'Combo VIP', skills: ['Combo VIP', 'Nail Art Premium', 'Gel Manicure', 'Đính đá nghệ thuật'], shift: 'FULL_DAY', shiftLabel: technicianShiftMeta.FULL_DAY, status: 'PRESENT', branch: 'Q1', checkIn: '07:56', avatarTone: 'from-brand-primary to-brand-primary' },
  { id: 'TECH-012', name: 'Gia Huy', initials: 'GH', specialty: 'Manicure', skills: ['Gel Manicure', 'Combo Manicure', 'Tháo gel & phục hồi móng'], shift: 'MORNING', shiftLabel: technicianShiftMeta.MORNING, status: 'ON_LEAVE', branch: 'Q1', leaveNote: 'Nghỉ phép năm đã duyệt.', avatarTone: 'from-brand-secondary to-brand-primary' },
];

const normalizeTechnicians = (items: ReceptionTechnician[]) => items.map((technician) => {
  const seed = technicianSeed.find((item) => item.id === technician.id || item.name === technician.name);
  return {
    ...technician,
    skills: seed?.skills?.length ? seed.skills : technician.skills?.length ? technician.skills : [technician.specialty],
    avatarTone: technician.avatarTone || seed?.avatarTone || 'from-brand-secondary to-brand-secondary',
    specialty: technician.specialty || seed?.specialty || 'Nail Technician',
    shiftLabel: technicianShiftMeta[technician.shift] || technician.shiftLabel || seed?.shiftLabel || '',
  };
});

const navItems: Array<{ id: ReceptionPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'desk', label: 'Bàn lễ tân', icon: LayoutDashboard },
  { id: 'appointments', label: 'Lịch hẹn', icon: CalendarDays },
  { id: 'customers', label: 'Khách hàng', icon: UsersRound },
  { id: 'products', label: 'Sản phẩm quầy', icon: PackageSearch },
  { id: 'stations', label: 'Ghế & phòng', icon: Armchair },
  { id: 'technicians', label: 'Kỹ thuật viên', icon: UserCheck },
  { id: 'payments', label: 'Thanh toán & POS', icon: ReceiptText },
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

function MetricCard({ icon: Icon, label, value, note, tone }: { icon: typeof CalendarDays; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-extrabold uppercase tracking-[0.1em] text-brand-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-brand-text">{value}</p>
          <p className="mt-1 text-body text-brand-text-muted">{note}</p>
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
  const servicesStorageKey = `tenant-admin-services-v2:${tenantName}`;
  const designsStorageKey = `tenant-admin-nail-designs-v1:${tenantName}`;
  const colorsStorageKey = `tenant-admin-nail-colors-v1:${tenantName}`;

  // Đọc đồng bộ dữ liệu dịch vụ, mẫu vẽ, màu sơn từ Tenant Admin
  const [servicesData, setServicesData] = useState<SalonService[]>(() => {
    const v2 = readStorage<SalonService[] | null>(servicesStorageKey, null);
    if (v2 && Array.isArray(v2) && v2.length > 0) return v2;
    const v1 = readStorage<SalonService[] | null>(`tenant-admin-services-v1:${tenantName}`, null);
    if (v1 && Array.isArray(v1) && v1.length > 0) return v1;
    return serviceSeed;
  });

  const [designsData, setDesignsData] = useState<NailDesign[]>(() => {
    const saved = readStorage<NailDesign[] | null>(designsStorageKey, null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return designSeed;
  });

  const [colorsData, setColorsData] = useState<PolishColor[]>(() => {
    const saved = readStorage<PolishColor[] | null>(colorsStorageKey, null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return colorSeed;
  });

  // Lắng nghe thay đổi dữ liệu từ Tenant Admin theo thời gian thực
  useEffect(() => {
    const handleServicesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; services?: SalonService[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.services) {
          setServicesData(customEvent.detail.services);
        } else {
          setServicesData(readStorage(servicesStorageKey, serviceSeed));
        }
      }
    };

    const handleDesignsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; designs?: NailDesign[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.designs) {
          setDesignsData(customEvent.detail.designs);
        } else {
          setDesignsData(readStorage(designsStorageKey, designSeed));
        }
      }
    };

    const handleColorsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; colors?: PolishColor[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.colors) {
          setColorsData(customEvent.detail.colors);
        } else {
          setColorsData(readStorage(colorsStorageKey, colorSeed));
        }
      }
    };

    const handleAppointmentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; appointments?: ReceptionAppointment[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.appointments) {
          setAppointments(customEvent.detail.appointments);
        } else {
          setAppointments(readStorage(appointmentStorageKey, seedAppointments()));
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === servicesStorageKey) {
        setServicesData(readStorage(servicesStorageKey, serviceSeed));
      }
      if (e.key === designsStorageKey) {
        setDesignsData(readStorage(designsStorageKey, designSeed));
      }
      if (e.key === colorsStorageKey) {
        setColorsData(readStorage(colorsStorageKey, colorSeed));
      }
      if (e.key === appointmentStorageKey && e.newValue) {
        try {
          setAppointments(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('salonsys_services_updated', handleServicesUpdated);
    window.addEventListener('salonsys_designs_updated', handleDesignsUpdated);
    window.addEventListener('salonsys_colors_updated', handleColorsUpdated);
    window.addEventListener('salonsys_appointments_updated', handleAppointmentsUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('salonsys_services_updated', handleServicesUpdated);
      window.removeEventListener('salonsys_designs_updated', handleDesignsUpdated);
      window.removeEventListener('salonsys_colors_updated', handleColorsUpdated);
      window.removeEventListener('salonsys_appointments_updated', handleAppointmentsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [servicesStorageKey, designsStorageKey, colorsStorageKey, appointmentStorageKey, tenantName]);

  // Catalog dịch vụ đồng bộ từ Tenant Admin theo chi nhánh hiện tại
  const serviceCatalog: CatalogItem[] = useMemo(() => {
    const available = servicesData.filter((s) => {
      if (s.status === 'HIDDEN') return false;
      if (s.branches && s.branches.length > 0 && !s.branches.includes(branchCode)) return false;
      return true;
    });
    if (available.length === 0) return defaultServiceCatalog;
    return available.map((s) => {
      let catName: string = s.category;
      if (s.category === 'MANICURE') catName = 'Sơn móng & Manicure';
      else if (s.category === 'PEDICURE') catName = 'Chăm sóc móng & Pedicure';
      else if (s.category === 'GEL') catName = 'Sơn & Đắp Gel';
      else if (s.category === 'ACRYLIC') catName = 'Đắp bột & Nối móng';
      else if (s.category === 'NAIL_ART') catName = 'Vẽ nghệ thuật & Art';
      else if (s.category === 'SPA') catName = 'Spa & Chăm sóc móng';
      else if (s.category === 'COMBO') catName = 'Combo trọn gói';

      return {
        id: s.id,
        name: s.name,
        price: s.price, // FIXED BASE PRICE từ Tenant Admin
        category: catName,
        duration: s.duration,
        addOns: s.addOns,
        description: s.description,
        requiredSkill: s.requiredSkill,
      };
    });
  }, [servicesData, branchCode]);

  // Catalog mẫu vẽ nail art đồng bộ từ Tenant Admin Gallery
  const nailArtTemplates: NailArtTemplate[] = useMemo(() => {
    const available = designsData.filter((d) => {
      if (d.status === 'HIDDEN') return false;
      if (d.branches && d.branches.length > 0 && !d.branches.includes(branchCode)) return false;
      return true;
    });
    if (available.length === 0) return NAIL_ART_TEMPLATES;
    return available.map((d) => ({
      id: d.id,
      name: d.name,
      defaultLevel: d.level || 2,
      category: d.collection || 'Bộ sưu tập',
      surcharge: d.surcharge || 0,
      description: d.notes || `Phong cách: ${d.styles?.join(', ') || 'Đặc biệt'} · Phụ liệu: ${d.materials?.join(', ') || 'Gel nghệ thuật'}`,
      tags: d.styles || [],
      duration: d.duration || 30,
      baseServiceId: d.baseServiceId,
      imageUrl: d.imageUrl,
      preview: d.preview,
      colors: d.colors,
      materials: d.materials,
    }));
  }, [designsData, branchCode]);

  // Catalog màu sơn đồng bộ từ Tenant Admin Gallery
  const polishColorOptions: PolishColorOption[] = useMemo(() => {
    const available = colorsData.filter((c) => {
      if (c.status === 'OUT') return false;
      if (c.branches && c.branches.length > 0 && !c.branches.includes(branchCode)) return false;
      return true;
    });
    if (available.length === 0) return POLISH_COLOR_OPTIONS;
    return available.map((c) => ({
      id: c.id,
      name: `${c.name} (${c.finish})`,
      brand: c.brand,
      code: c.code,
      hex: c.hex,
      finish: c.finish,
    }));
  }, [colorsData, branchCode]);

  const [page, setPage] = useState<ReceptionPage>('desk');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('receptionist_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('receptionist_sidebar_collapsed', String(next));
      } catch {
        // Preference optional
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Menu mobile đóng được bằng Escape như mọi lớp phủ khác.
  useEffect(() => {
    if (!sidebarOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [sidebarOpen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>(() => readStorage(appointmentStorageKey, seedAppointments()));
  const [payments, setPayments] = useState<ReceptionPayment[]>(() => readStorage(paymentStorageKey, seedPayments()));
  const [technicians, setTechnicians] = useState<ReceptionTechnician[]>(() => normalizeTechnicians(readStorage(technicianStorageKey, technicianSeed)));
  const [shift, setShift] = useState<ShiftState>(() => readStorage(shiftStorageKey, { status: 'OPEN', openedAt: new Date().toISOString(), openingCash: 1000000 }));
  const [clockTick, setClockTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const [walkInOpen, setWalkInOpen] = useState(false);
  const [quickWalkInOpen, setQuickWalkInOpen] = useState(false);
  const [quickWalkInForm, setQuickWalkInForm] = useState({
    customer: '',
    phone: '',
    service: 'Gel Manicure',
    staff: '',
    station: '',
    duration: '60',
    price: '450000',
    allergies: [] as string[],
    note: '',
    quickAction: 'START_NOW' as 'START_NOW' | 'CHECK_IN_QUEUE',
  });

  const [paymentAppointment, setPaymentAppointment] = useState<ReceptionAppointment | null>(null);
  const [mergedAppointmentIds, setMergedAppointmentIds] = useState<string[]>([]);
  const [showMergeSelector, setShowMergeSelector] = useState(false);
  const [splitPaymentMode, setSplitPaymentMode] = useState(false);
  const [splitPaymentsList, setSplitPaymentsList] = useState<SplitPaymentEntry[]>([
    { id: 'SP-1', method: 'CASH', amount: 0, reference: '' },
  ]);
  const [splitEquallyCount, setSplitEquallyCount] = useState(2);
  const [showSplitCalc, setShowSplitCalc] = useState(false);

  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ReceptionAppointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<ReceptionAppointment | null>(null);
  const [shiftModal, setShiftModal] = useState<'OPEN' | 'CLOSE' | null>(null);
  const [toast, setToast] = useState('');
  const loyaltyStorageKey = `tenant-admin-loyalty-v1:${tenantName}`;
  const invoiceDraftsStorageKey = `receptionist-invoice-drafts-v1:${tenantName}:${branchCode}`;
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>(() => readStorage(loyaltyStorageKey, []));
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [promoFeedback, setPromoFeedback] = useState<{ isError: boolean; text: string } | null>(null);

  const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, { lines: InvoiceLineDraft[]; form: { method: PaymentMethod; discount: string; tip: string; reference: string; note: string }; promoId?: string; mergedIds?: string[]; splitPayments?: SplitPaymentEntry[] }>>(() => readStorage(invoiceDraftsStorageKey, {}));

  const [formError, setFormError] = useState('');
  const [walkInErrors, setWalkInErrors] = useState<Record<string, string>>({});
  const [appointmentEditErrors, setAppointmentEditErrors] = useState<Record<string, string>>({});
  const [walkIn, setWalkIn] = useState({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: getOperationalDefaultTime(), duration: '60', price: '450000', note: '', allergies: [] as string[], specialTags: [] as string[], designName: '', designLevel: 0, designSurcharge: 0 });
  const [paymentForm, setPaymentForm] = useState({ method: 'CASH' as PaymentMethod, discount: '0', tip: '0', reference: '', note: '' });
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineDraft[]>([]);
  const [invoiceCatalogTab, setInvoiceCatalogTab] = useState<'SERVICE' | 'ART' | 'PRODUCT'>('SERVICE');
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
  const [appointmentEditForm, setAppointmentEditForm] = useState<AppointmentEditForm>({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: getOperationalDefaultTime(), duration: '60', price: '450000', note: '', allergies: [] as string[], specialTags: [] as string[], designName: '', designLevel: 0, designSurcharge: 0 });

  // Modal tùy chỉnh mẫu vẽ & sản phẩm đi kèm cho 1 dòng dịch vụ
  const [customizingLine, setCustomizingLine] = useState<InvoiceLineDraft | null>(null);
  const [customizerForm, setCustomizerForm] = useState<{
    basePrice: string;
    designName: string;
    designLevel: number;
    difficultyLabel: string;
    designSurcharge: string;
    attachedColorCode: string;
    attachedColorName: string;
    attachedColorHex: string;
    attachedProductName: string;
    attachedProductPrice: number;
    staff: string;
    customArtNote: string;
  }>({
    basePrice: '0',
    designName: '',
    designLevel: 0,
    difficultyLabel: '',
    designSurcharge: '0',
    attachedColorCode: '',
    attachedColorName: '',
    attachedColorHex: '',
    attachedProductName: '',
    attachedProductPrice: 0,
    staff: 'Chưa phân công',
    customArtNote: '',
  });

  useEffect(() => {
    if (selectedPromoId && paymentAppointment) {
      const program = loyaltyPrograms.find((p) => p.id === selectedPromoId);
      if (program) {
        const result = validateAndCalculatePromotion({
          program,
          items: invoiceLines,
          customerUsageCount: 0,
        });
        if (!result.isValid) {
          setPromoFeedback({ isError: true, text: result.reason || 'Hóa đơn chưa đủ điều kiện áp dụng ưu đãi này.' });
          setPaymentForm((prev) => ({ ...prev, discount: '0' }));
        } else {
          setPromoFeedback({ isError: false, text: `Áp dụng thành công: ${program.name} (Giảm ${money(result.discountAmount)})` });
          setPaymentForm((prev) => ({ ...prev, discount: String(result.discountAmount) }));
        }
      }
    }
  }, [invoiceLines]);
  useEffect(() => {
    if (!paymentAppointment) return;
    if (!invoiceLines.length) return;
    setInvoiceDrafts((current) => {
      const updated = {
        ...current,
        [paymentAppointment.id]: {
          lines: invoiceLines,
          form: paymentForm,
          promoId: selectedPromoId,
        },
      };
      try {
        localStorage.setItem(invoiceDraftsStorageKey, JSON.stringify(updated));
      } catch {
        // quota ignore
      }
      return updated;
    });
  }, [paymentAppointment, invoiceLines, paymentForm, selectedPromoId, invoiceDraftsStorageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments));
      window.dispatchEvent(new CustomEvent('salonsys_appointments_updated', { detail: { tenantName, appointments } }));
    } catch {
      // Local storage optional
    }
  }, [appointmentStorageKey, appointments, tenantName]);
  useEffect(() => localStorage.setItem(invoiceDraftsStorageKey, JSON.stringify(invoiceDrafts)), [invoiceDraftsStorageKey, invoiceDrafts]);
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
  const invoiceCategories = invoiceCatalogTab === 'ART'
    ? ['Tất cả', ...Array.from(new Set(nailArtTemplates.map((item) => item.category)))]
    : ['Tất cả', ...Array.from(new Set(activeCatalog.map((item) => item.category)))];
  const filteredCatalog = activeCatalog.filter((item) => (
    (invoiceCategory === 'Tất cả' || item.category === invoiceCategory)
    && item.name.toLowerCase().includes(invoiceCatalogQuery.trim().toLowerCase())
  ));
  const filteredArtTemplates = nailArtTemplates.filter((item) => (
    (invoiceCategory === 'Tất cả' || item.category === invoiceCategory)
    && `${item.name} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(invoiceCatalogQuery.trim().toLowerCase())
  ));

  const requireOpenShift = () => {
    if (shift.status === 'OPEN') return true;
    setToast('Vui lòng mở ca trước khi thực hiện nghiệp vụ tại quầy.');
    return false;
  };

  const canTechnicianDoService = (technician: ReceptionTechnician, serviceName: string) => {
    const normalizedService = serviceName.trim().toLowerCase();
    if (!normalizedService) return true;
    if (technician.skills.some((skill) => skill.toLowerCase() === normalizedService || normalizedService.includes(skill.toLowerCase()) || skill.toLowerCase().includes(normalizedService))) return true;
    if (technician.specialty && (technician.specialty.toLowerCase().includes(normalizedService) || normalizedService.includes(technician.specialty.toLowerCase()))) return true;
    const foundService = servicesData.find(s => s.name.toLowerCase() === normalizedService);
    if (foundService?.requiredSkill && technician.skills.some(sk => sk.toLowerCase().includes(foundService.requiredSkill.toLowerCase()))) return true;
    return true;
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

  const validateAppointmentDraft = (draft: AppointmentEditForm, editingId?: string): Record<string, string> => {
    const errors: Record<string, string> = {};
    const phoneDigits = draft.phone.replace(/\D/g, '');
    const cleanPhone = draft.phone.replace(/[\s.-]/g, '');
    const duration = Number(draft.duration);
    const price = Number(draft.price);

    // 1. Kiểm tra thông tin khách hàng
    if (!draft.customer.trim()) {
      errors.customer = 'Vui lòng nhập tên khách hàng.';
    } else if (draft.customer.trim().length < 2) {
      errors.customer = 'Vui lòng nhập tên khách hàng tối thiểu 2 ký tự.';
    }

    if (!draft.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại khách hàng.';
    } else if (!/^(?:0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone) && !/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(draft.phone.trim())) {
      errors.phone = 'Số điện thoại chưa đúng định dạng di động Việt Nam (gồm 10 số, ví dụ 0903123456).';
    } else {
      const duplicatedPhone = branchTodayAppointments.find((appointment) => (
        appointment.id !== editingId
        && appointment.phone.replace(/\D/g, '') === phoneDigits
        && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)
      ));
      if (duplicatedPhone) {
        errors.phone = `Khách hàng ${duplicatedPhone.customer} (${draft.phone}) đang có lịch ${duplicatedPhone.start} (${duplicatedPhone.service}).`;
      }
    }

    // 2. Kiểm tra dịch vụ
    if (!draft.service.trim()) {
      errors.service = 'Vui lòng chọn dịch vụ trước khi tiếp nhận khách.';
    }

    // 3. Phân công kỹ thuật viên
    const technician = branchTechnicians.find((item) => item.name === draft.staff);
    if (!draft.staff || draft.staff === 'Chưa phân công') {
      errors.staff = 'Vui lòng phân công kỹ thuật viên trước khi tạo hoặc bắt đầu dịch vụ.';
    } else if (!technician) {
      errors.staff = 'Kỹ thuật viên không thuộc chi nhánh hiện tại.';
    } else if (['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE', 'BREAK'].includes(technician.status)) {
      errors.staff = `${technician.name} hiện ${technicianStatusMeta[technician.status]?.label.toLowerCase() || 'vắng mặt'}, chưa thể nhận khách.`;
    } else if (!canTechnicianDoService(technician, draft.service)) {
      errors.staff = `${technician.name} không có khả năng làm dịch vụ ${draft.service}. Vui lòng chọn kỹ thuật viên khác.`;
    }

    // 4. Kiểm tra định dạng thời gian
    if (!draft.start || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start)) {
      errors.start = 'Vui lòng chọn giờ bắt đầu hợp lệ (định dạng HH:mm).';
    } else {
      const startMinutes = minutesOf(draft.start);
      const endMinutes = startMinutes + (Number.isFinite(duration) && duration > 0 ? duration : 60);

      // 5. KIỂM TRA NGHIÊM NGẶT GIỜ MỞ CỬA CỦA SALON (08:00 – 20:30)
      if (startMinutes < SALON_OPEN_MINUTES) {
        errors.start = `Salon chỉ mở cửa từ 08:00. Khung giờ ${draft.start} nằm ngoài giờ hoạt động.`;
      } else if (startMinutes > SALON_LAST_BOOKING_MINUTES) {
        errors.start = `Salon ngưng nhận khách mới sau 20:00 (đóng cửa lúc 20:30). Khung giờ ${draft.start} quá trễ.`;
      } else if (endMinutes > SALON_CLOSE_MINUTES) {
        errors.start = `Dịch vụ kéo dài ${duration} phút sẽ kết thúc lúc ${formatMinutes(endMinutes)} (sau giờ đóng cửa 20:30).`;
      } else if (technician) {
        // 6. KIỂM TRA KHỚP CA LÀM VIỆC CỦA KỸ THUẬT VIÊN
        if (technician.shift === 'MORNING' && endMinutes > 16 * 60) {
          errors.staff = `${technician.name} làm ca sáng (08:00–16:00). Dịch vụ kéo dài đến ${formatMinutes(endMinutes)}.`;
        } else if (technician.shift === 'AFTERNOON' && startMinutes < 12 * 60) {
          errors.staff = `${technician.name} làm ca chiều (12:00–20:30). Không thể nhận lịch lúc ${draft.start}.`;
        } else if (technician.checkIn && startMinutes < minutesOf(technician.checkIn)) {
          errors.staff = `${technician.name} hôm nay check-in lúc ${technician.checkIn}, chưa sẵn sàng lúc ${draft.start}.`;
        } else if (technician.checkOut && endMinutes > minutesOf(technician.checkOut)) {
          errors.staff = `${technician.name} hôm nay kết thúc ca lúc ${technician.checkOut}, không kịp hoàn thành.`;
        }
      }

      // Xung đột lịch Kỹ thuật viên
      if (!errors.staff && draft.staff && draft.staff !== 'Chưa phân công') {
        const conflictingAppointment = branchTodayAppointments.find((appointment) => {
          if (appointment.id === editingId || appointment.staff !== draft.staff || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
          const appointmentStart = minutesOf(appointment.start);
          const appointmentEnd = appointmentStart + appointment.duration;
          return startMinutes < appointmentEnd && endMinutes > appointmentStart;
        });
        if (conflictingAppointment) {
          const conflictEnd = formatMinutes(minutesOf(conflictingAppointment.start) + conflictingAppointment.duration);
          errors.staff = `${draft.staff} đang bận phục vụ ${conflictingAppointment.customer} từ ${conflictingAppointment.start} đến ${conflictEnd}.`;
        }
      }

      // Xung đột Ghế / Bàn
      if (draft.station) {
        const conflictingStation = branchTodayAppointments.find((appointment) => {
          if (appointment.id === editingId || appointment.station !== draft.station || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
          const appointmentStart = minutesOf(appointment.start);
          const appointmentEnd = appointmentStart + appointment.duration;
          return startMinutes < appointmentEnd && endMinutes > appointmentStart;
        });
        if (conflictingStation) {
          const stationEnd = formatMinutes(minutesOf(conflictingStation.start) + conflictingStation.duration);
          errors.station = `${draft.station} đang được dùng từ ${conflictingStation.start} đến ${stationEnd} bởi ${conflictingStation.customer}.`;
        }
      }
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      errors.duration = 'Thời lượng dịch vụ phải lớn hơn 0 phút.';
    } else if (duration > 240) {
      errors.duration = 'Thời lượng dịch vụ tối đa là 240 phút (4 giờ).';
    }

    if (!Number.isFinite(price) || price <= 0) {
      errors.price = 'Giá dự kiến phải lớn hơn 0đ.';
    }

    if (draft.station && !stationCatalog[branchCode].includes(draft.station)) {
      errors.station = 'Ghế hoặc phòng không thuộc chi nhánh hiện tại.';
    }

    return errors;
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
      setToast(`Không thể chuyển từ “${appointmentStatusLabel[appointment.status]}” sang “${appointmentStatusLabel[status]}”.`);
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
    const errors = validateAppointmentDraft(walkIn);
    if (Object.keys(errors).length > 0) {
      setWalkInErrors(errors);
      setFormError(Object.values(errors)[0] || 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return;
    }
    setWalkInErrors({});
    const appointment: ReceptionAppointment = {
      id: makeId('APT'), customer: walkIn.customer.trim(), phone: walkIn.phone.trim(), date: today(), start: walkIn.start,
      duration: Number(walkIn.duration), service: walkIn.service, staff: walkIn.staff, branch: branchCode,
      source: 'RECEPTION', status: 'CHECKED_IN', price: Number(walkIn.price), deposit: 0, note: walkIn.note.trim(),
      station: walkIn.station || undefined, createdBy: account.displayName, firstVisit: true, createdAt: new Date().toISOString(),
    };
    setAppointments((current) => [appointment, ...current]);
    setWalkInOpen(false);
    setWalkIn({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: getOperationalDefaultTime(), duration: '60', price: '450000', note: '', designName: '', designLevel: 0, designSurcharge: 0 });
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
    setAppointmentEditErrors({});
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
    const errors = validateAppointmentDraft(appointmentEditForm, editingAppointment.id);
    if (Object.keys(errors).length > 0) {
      setAppointmentEditErrors(errors);
      setFormError(Object.values(errors)[0] || 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return;
    }
    setAppointmentEditErrors({});
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

  const handleSelectPromo = (promoId: string, lines = invoiceLines) => {
    setSelectedPromoId(promoId);
    if (!promoId) {
      setPromoFeedback(null);
      setPaymentForm((prev) => ({ ...prev, discount: '0' }));
      return;
    }
    const program = loyaltyPrograms.find((p) => p.id === promoId);
    if (!program) {
      setPromoFeedback({ isError: true, text: 'Chương trình ưu đãi không tồn tại' });
      return;
    }
    const result = validateAndCalculatePromotion({
      program,
      items: lines,
      customerUsageCount: 0,
    });
    if (!result.isValid) {
      setPromoFeedback({ isError: true, text: result.reason || 'Hóa đơn chưa đủ điều kiện áp dụng ưu đãi này.' });
      setPaymentForm((prev) => ({ ...prev, discount: '0' }));
    } else {
      setPromoFeedback({ isError: false, text: `Áp dụng thành công: ${program.name} (Giảm ${money(result.discountAmount)})` });
      setPaymentForm((prev) => ({ ...prev, discount: String(result.discountAmount) }));
    }
  };

  const openPayment = (appointment: ReceptionAppointment) => {
    if (!requireOpenShift()) return;
    if (!['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status)) {
      setToast('Chỉ có thể tạo hóa đơn thanh toán cho khách đã check-in hoặc đang làm dịch vụ.');
      return;
    }
    if (completedIds.has(appointment.id)) {
      setToast('Lịch hẹn này đã có hóa đơn thanh toán hoàn tất.');
      return;
    }
    const loadedPromos = readStorage<LoyaltyProgram[]>(loyaltyStorageKey, []);
    setLoyaltyPrograms(loadedPromos);
    setSelectedPromoId('');
    setPromoFeedback(null);
    setShowPaymentConfirm(false);
    setCustomizingLine(null);

    setPaymentAppointment(appointment);
    const existingDraft = invoiceDrafts[appointment.id];
    if (existingDraft && existingDraft.lines?.length) {
      setInvoiceLines(existingDraft.lines);
      setPaymentForm(existingDraft.form || { method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
      setSelectedPromoId(existingDraft.promoId || '');
    } else {
      const selectedServices = appointment.services?.length ? appointment.services : [appointment.service];
      const splitPrice = Math.floor(appointment.price / selectedServices.length);
      setInvoiceLines(selectedServices.map((name, index) => {
        const catalogMatch = serviceCatalog.find(s => s.name === name);
        const originalBasePrice = catalogMatch ? catalogMatch.price : (index === selectedServices.length - 1 ? appointment.price - splitPrice * index : splitPrice);
        
        return {
          id: `${makeId('LINE')}-${index}`,
          type: 'SERVICE',
          name,
          quantity: 1,
          basePrice: originalBasePrice,
          unitPrice: originalBasePrice, // Giữ y nguyên giá gốc của dịch vụ
          staff: appointment.staff,
          designName: undefined,
          designLevel: 0,
          difficultyLabel: undefined,
          designSurcharge: 0,
        };
      }));
      setPaymentForm({ method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
    }
    setInvoiceCatalogTab('SERVICE');
    setInvoiceCatalogQuery('');
    setInvoiceCategory('Tất cả');
    setFormError('');
  };

  const openLineCustomizer = (line: InvoiceLineDraft) => {
    setCustomizingLine(line);
    const initialLevel = line.designLevel ?? (line.designSurcharge ? (line.designSurcharge >= 350000 ? 4 : line.designSurcharge >= 200000 ? 3 : line.designSurcharge >= 100000 ? 2 : 1) : 0);
    const diffPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === initialLevel);
    setCustomizerForm({
      basePrice: String(line.basePrice ?? line.unitPrice ?? 0),
      designName: line.designName || '',
      designLevel: initialLevel,
      difficultyLabel: line.difficultyLabel || diffPreset?.label || '',
      designSurcharge: String(line.designSurcharge ?? (diffPreset?.surcharge || 0)),
      attachedColorCode: line.attachedColorId || '',
      attachedColorName: line.attachedColorName || '',
      attachedColorHex: line.attachedColorHex || '',
      attachedProductName: line.attachedProductName || '',
      attachedProductPrice: line.attachedProductPrice || 0,
      staff: line.staff,
      customArtNote: line.customArtNote || '',
    });
  };

  const handleSelectArtTemplateInCustomizer = (template: NailArtTemplate) => {
    const levelPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === template.defaultLevel) || ART_DIFFICULTY_PRESETS[2];
    const surcharge = template.surcharge || levelPreset.surcharge;
    setCustomizerForm(prev => ({
      ...prev,
      designName: template.name,
      designLevel: template.defaultLevel,
      difficultyLabel: levelPreset.label,
      designSurcharge: String(surcharge),
    }));
  };

  const handleSelectDifficultyInCustomizer = (preset: ArtDifficultyPreset) => {
    setCustomizerForm(prev => ({
      ...prev,
      designLevel: preset.level,
      difficultyLabel: preset.label,
      designSurcharge: preset.level === 99 ? prev.designSurcharge : String(preset.surcharge),
    }));
  };

  const saveLineCustomizer = () => {
    if (!customizingLine) return;
    const rawSurcharge = String(customizerForm.designSurcharge || '0').replace(/[^0-9]/g, '');
    const rawBase = String(customizerForm.basePrice || '0').replace(/[^0-9]/g, '');
    const surcharge = Math.max(0, parseInt(rawSurcharge || '0', 10));
    const base = Math.max(0, parseInt(rawBase || '0', 10));
    const accPrice = Math.max(0, Number(customizerForm.attachedProductPrice) || 0);
    const diffPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === customizerForm.designLevel);
    
    const unitPrice = base + surcharge + accPrice;

    setInvoiceLines(current => current.map(line => {
      if (line.id !== customizingLine.id) return line;
      return {
        ...line,
        basePrice: base,
        unitPrice,
        staff: customizerForm.staff,
        designId: customizerForm.designName ? `ART-${Date.now().toString(36)}` : undefined,
        designName: customizerForm.designName.trim() || undefined,
        designLevel: customizerForm.designLevel,
        difficultyLabel: customizerForm.difficultyLabel || diffPreset?.label,
        designSurcharge: surcharge,
        customArtNote: customizerForm.customArtNote.trim() || undefined,
        attachedColorId: customizerForm.attachedColorCode || undefined,
        attachedColorName: customizerForm.attachedColorName || undefined,
        attachedColorHex: customizerForm.attachedColorHex || undefined,
        attachedProductId: customizerForm.attachedProductName ? `ACC-${customizerForm.attachedProductName}` : undefined,
        attachedProductName: customizerForm.attachedProductName || undefined,
        attachedProductPrice: accPrice,
      };
    }));

    setCustomizingLine(null);
    setToast(`Đã cập nhật mẫu vẽ, độ khó và giá cho "${customizingLine.name}".`);
  };

  const addArtServiceItem = (template: NailArtTemplate, targetDifficultyLevel?: number) => {
    const level = targetDifficultyLevel !== undefined ? targetDifficultyLevel : template.defaultLevel;
    const levelPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === level) || ART_DIFFICULTY_PRESETS[1];
    const surcharge = template.surcharge || levelPreset.surcharge;
    
    // Tìm giá dịch vụ gốc tương ứng từ danh sách dịch vụ đã đồng bộ
    const matchedService = template.baseServiceId 
      ? servicesData.find(s => s.id === template.baseServiceId)
      : null;
    const baseServicePrice = matchedService?.price || 450000;
    const baseServiceName = matchedService?.name || 'Sơn gel';
    const unitPrice = baseServicePrice + surcharge;

    const newLine: InvoiceLineDraft = {
      id: makeId('LINE'),
      type: 'SERVICE',
      name: `${baseServiceName} + ${template.name}`,
      basePrice: baseServicePrice,
      quantity: 1,
      unitPrice,
      staff: paymentAppointment?.staff || 'Chưa phân công',
      designId: template.id,
      designName: template.name,
      designLevel: level,
      difficultyLabel: levelPreset.label,
      designSurcharge: surcharge,
    };

    setInvoiceLines(current => [...current, newLine]);
    setToast(`Đã thêm dịch vụ kèm mẫu "${template.name}" (${levelPreset.shortLabel}).`);
  };

  const addCatalogItem = (type: InvoiceLineType, item: CatalogItem) => {
    setInvoiceLines((current) => {
      const existing = current.find((line) => line.type === type && line.name === item.name && (type === 'PRODUCT' || line.staff === paymentAppointment?.staff));
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, {
        id: makeId('LINE'),
        type,
        name: item.name,
        basePrice: item.price,
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

    if (selectedPromoId) {
      const program = loyaltyPrograms.find((p) => p.id === selectedPromoId);
      if (program) {
        const result = validateAndCalculatePromotion({
          program,
          items: invoiceLines,
          customerUsageCount: 0,
        });
        if (!result.isValid) {
          return setFormError(`Không đủ điều kiện áp dụng ưu đãi "${program.name}": ${result.reason}`);
        }
      }
    }

    const tip = Math.max(0, Number(paymentForm.tip) || 0);
    if (discount > subtotal) return setFormError('Giảm giá không được lớn hơn tổng tiền hàng.');
    const grandTotal = Math.max(0, subtotal - discount + tip);
    if (grandTotal < paymentAppointment.deposit) return setFormError('Tổng hóa đơn sau giảm giá không được thấp hơn số tiền khách đã đặt cọc.');
    if (paymentForm.method !== 'CASH' && !paymentForm.reference.trim()) return setFormError('Vui lòng nhập mã giao dịch để đối soát.');
    if (paymentForm.method !== 'CASH' && payments.some((payment) => payment.reference?.trim().toLowerCase() === paymentForm.reference.trim().toLowerCase() && payment.appointmentId !== paymentAppointment.id)) return setFormError('Mã giao dịch đã được sử dụng. Vui lòng kiểm tra lại để tránh ghi nhận trùng.');
    
    setFormError('');
    setShowPaymentConfirm(true);
  };

  const executeFinalPayment = () => {
    if (!paymentAppointment) return;
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discount = Math.max(0, Number(paymentForm.discount) || 0);
    const tip = Math.max(0, Number(paymentForm.tip) || 0);
    const grandTotal = Math.max(0, subtotal - discount + tip);
    const amountDue = Math.max(0, grandTotal - paymentAppointment.deposit);
    const timestamp = new Date();
    const existingInvoice = payments.find((payment) => payment.appointmentId === paymentAppointment.id && ['PARTIAL', 'PENDING'].includes(payment.status));
    
    const payment: ReceptionPayment = {
      id: existingInvoice?.id || makeId('INV'),
      appointmentId: paymentAppointment.id,
      customer: paymentAppointment.customer,
      phone: paymentAppointment.phone,
      branch: paymentAppointment.branch,
      createdAt: `${timestamp.toLocaleDateString('vi-VN')} · ${nowTime()}`,
      subtotal,
      discount,
      tip,
      deposit: paymentAppointment.deposit,
      total: grandTotal,
      paid: grandTotal,
      refunded: 0,
      status: 'PAID',
      method: paymentForm.method,
      reference: paymentForm.reference.trim() || undefined,
      cashier: account.displayName,
      source: 'POS tại quầy',
      items: invoiceLines.map((line) => {
        let displayName = line.name.trim();
        if (line.designName) {
          const diffText = line.difficultyLabel || (line.designLevel ? `Độ khó mức ${line.designLevel}` : '');
          displayName += ` + Mẫu: ${line.designName}${diffText ? ` (${diffText})` : ''}${line.designSurcharge ? ` [+${money(line.designSurcharge)}]` : ''}`;
        }
        if (line.attachedColorName) {
          displayName += ` · Màu: ${line.attachedColorName}`;
        }
        if (line.attachedProductName) {
          displayName += ` · Kèm: ${line.attachedProductName}${line.attachedProductPrice ? ` [+${money(line.attachedProductPrice)}]` : ''}`;
        }
        return {
          name: displayName,
          quantity: line.quantity,
          amount: line.quantity * line.unitPrice,
          staff: line.staff,
          basePrice: line.basePrice,
          designName: line.designName,
          designLevel: line.designLevel,
          difficultyLabel: line.difficultyLabel,
          designSurcharge: line.designSurcharge,
          attachedColorName: line.attachedColorName,
          attachedProductName: line.attachedProductName,
          customArtNote: line.customArtNote,
        };
      }),
      note: paymentForm.note.trim() || undefined,
      audit: [
        ...(existingInvoice?.audit || []),
        `${nowTime()} · ${account.displayName} xác nhận ${invoiceLines.length} dịch vụ/sản phẩm (gồm chi tiết mẫu vẽ & phụ thu độ khó) và thanh toán qua ${methodMeta[paymentForm.method].label}`,
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
    setInvoiceDrafts((current) => {
      const next = { ...current };
      delete next[paymentAppointment.id];
      try {
        localStorage.setItem(invoiceDraftsStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setShowPaymentConfirm(false);
    setPaymentAppointment(null);
    setToast(`Đã thu ${money(amountDue)} từ khách hàng ${payment.customer}.`);
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
      {/* Đầu trang: tên màn hình + hành động chính, không dùng khối trang trí. */}
      <section className="rounded-card border border-brand-outline bg-brand-surface p-5 shadow-card sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-brand-secondary">
                <Activity className="h-3.5 w-3.5" /> Trung tâm vận hành
              </span>
              <StatusBadge
                status={shift.status === 'OPEN' ? 'ACTIVE' : 'INACTIVE'}
                label={shift.status === 'OPEN'
                  ? `Ca đang mở · ${new Date(shift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Ca đã đóng'}
                size="small"
              />
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-black tracking-[-0.03em] text-brand-text sm:text-3xl">
              Chào {account.displayName.split(' ').slice(-2).join(' ')}, bàn lễ tân đã sẵn sàng.
            </h1>
            <p className="mt-2 max-w-2xl text-body leading-6 text-brand-text-muted">
              Theo dõi luồng khách, phân công nguồn lực và hoàn tất thanh toán trong một màn hình.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption font-bold text-brand-text-muted">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-secondary" />{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-secondary" />{branchName}</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-secondary" />Phạm vi Receptionist</span>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-3">
            <Button variant="primary" iconLeading={<Plus />} onClick={() => { if (requireOpenShift()) setWalkInOpen(true); }}>
              Tiếp nhận khách
            </Button>
            <Button variant="secondary" iconLeading={<CalendarClock />} onClick={() => navigate('appointments')}>
              Tạo lịch hẹn
            </Button>
            <Button variant="secondary" iconLeading={<DoorOpen />} onClick={() => openShiftDialog(shift.status === 'OPEN' ? 'CLOSE' : 'OPEN')}>
              {shift.status === 'OPEN' ? 'Chốt ca' : 'Mở ca'}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: 'Lịch hôm nay', value: String(todayAppointments.length), note: `${completedToday} đã hoàn tất`, icon: CalendarCheck2, tone: 'bg-brand-primary/10 text-brand-primary ring-brand-primary/18' },
          { label: 'Cần xử lý', value: String(actionableAppointments.length), note: `${unassignedAppointments.length} chưa phân công`, icon: AlertCircle, tone: 'bg-brand-tertiary/10 text-brand-tertiary ring-brand-tertiary/18' },
          { label: 'Khách tại salon', value: String(activeAppointments.length), note: `${activeAppointments.filter((item) => item.status === 'CHECKED_IN').length} đang chờ`, icon: UsersRound, tone: 'bg-brand-secondary/10 text-brand-secondary ring-brand-secondary/18' },
          { label: 'Đang phục vụ', value: String(activeAppointments.filter((item) => item.status === 'IN_SERVICE').length), note: `${occupiedStations} ghế đang dùng`, icon: Armchair, tone: 'bg-brand-primary/10 text-brand-primary ring-brand-primary/18' },
          { label: 'Doanh thu đã thu', value: money(todayRevenue), note: `${paidToday.length} giao dịch`, icon: CircleDollarSign, tone: 'bg-brand-secondary/10 text-brand-secondary ring-brand-secondary/18' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm ${index === 4 ? 'col-span-2 xl:col-span-1' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-caption font-black uppercase tracking-[0.1em] text-brand-text-muted">{item.label}</p>
                  <p className="mt-2 truncate text-xl font-black tracking-tight text-brand-text">{item.value}</p>
                  <p className="mt-1 text-body font-semibold text-brand-text-muted">{item.note}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${item.tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.65fr)]">
        <div className="overflow-hidden rounded-[24px] border border-brand-outline bg-brand-surface shadow-sm">
          <div className="border-b border-brand-outline p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-secondary"><TimerReset className="h-4 w-4" /><p className="text-body font-black uppercase tracking-[0.12em]">Hàng đợi thao tác</p></div>
                <h2 className="mt-1 text-lg font-black tracking-tight text-brand-text">Ưu tiên cần xử lý tại quầy</h2>
                <p className="mt-1 text-body font-medium text-brand-text-muted">Khách đã đến được đưa lên trước, sau đó là lịch chờ xác nhận.</p>
              </div>
              <button type="button" onClick={() => navigate('appointments')} className="flex w-fit items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface-high px-3 py-2 text-body font-black text-brand-text hover:border-brand-secondary hover:text-brand-secondary">
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
                  <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setDeskQueueFilter(item.id)} className={`shrink-0 rounded-full border px-3 py-2 text-body font-black ${active ? 'border-brand-secondary bg-brand-secondary text-white shadow-sm' : 'border-brand-outline bg-brand-surface-high text-brand-text-muted hover:text-brand-text'}`}>
                    {item.label} <span className={`ml-1 rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-brand-surface'}`}>{item.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-brand-outline">
            {deskQueueAppointments.length === 0 && (
              <div className="p-10 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-brand-secondary" />
                <p className="mt-3 text-sm font-black text-brand-text">Không còn việc trong nhóm này</p>
                <p className="mt-1 text-xs text-brand-text-muted">Hàng đợi đã được xử lý xong.</p>
              </div>
            )}
            {deskQueueAppointments.slice(0, 7).map((appointment) => {
              const isUnassigned = appointment.staff === 'Chưa phân công';
              const isWaiting = appointment.status === 'CHECKED_IN';
              return (
                <article key={appointment.id} className={`group p-4 transition hover:bg-brand-surface-high/40 sm:p-5 ${isWaiting ? 'bg-brand-secondary/30' : ''}`}>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[70px_minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex items-center gap-3 lg:block">
                      <div className="rounded-2xl border border-brand-outline bg-brand-surface px-3 py-2 text-center shadow-sm">
                        <p className="text-base font-black tabular-nums text-brand-text">{appointment.start}</p>
                        <p className="mt-0.5 text-caption font-black uppercase tracking-wider text-brand-text-muted">{appointment.duration} phút</p>
                      </div>
                      <div className="lg:hidden">
                        <StatusBadge status={appointment.status} label={appointmentStatusLabel[appointment.status]} size="small" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-brand-text">{appointment.customer}</p>
                        <span className="hidden lg:inline-flex"><StatusBadge status={appointment.status} label={appointmentStatusLabel[appointment.status]} size="small" /></span>
                        {appointment.firstVisit && <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-caption font-black text-brand-primary ring-1 ring-brand-primary/18">Khách mới</span>}
                        {isUnassigned && <span className="inline-flex items-center gap-1 rounded-full bg-brand-tertiary/10 px-2 py-1 text-caption font-black text-brand-tertiary ring-1 ring-brand-tertiary"><AlertCircle className="h-3 w-3" /> Chưa phân công</span>}
                      </div>
                      <p className="mt-1.5 truncate text-xs font-bold text-brand-text">{appointment.service}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body font-semibold text-brand-text-muted">
                        <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />{appointment.staff}</span>
                        {appointment.station && <span className="inline-flex items-center gap-1.5"><Armchair className="h-3.5 w-3.5" />{appointment.station}</span>}
                        <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{appointment.phone}</span>
                        {appointment.deposit > 0 && <span className="font-black text-brand-secondary">Cọc {money(appointment.deposit)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                      <a href={`tel:${appointment.phone.replace(/\s/g, '')}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted hover:text-brand-secondary" aria-label={`Gọi ${appointment.customer}`}><Phone className="h-3.5 w-3.5" /></a>
                      {appointment.status !== 'IN_SERVICE' && (
                        <button type="button" onClick={() => openAppointmentEdit(appointment)} className="rounded-xl border border-brand-outline bg-brand-surface px-3 py-2 text-body font-black text-brand-text hover:bg-brand-surface-high">
                          {isUnassigned ? 'Phân công' : 'Chỉnh lịch'}
                        </button>
                      )}
                      {['PENDING', 'CONFIRMED'].includes(appointment.status) && <button type="button" onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-secondary px-3 py-2 text-body font-black text-white hover:bg-brand-secondary cursor-pointer"><Check className="h-3.5 w-3.5" /> Check-in</button>}
                      {appointment.status === 'CHECKED_IN' && (
                        <>
                          <button type="button" onClick={() => updateAppointmentStatus(appointment, 'IN_SERVICE')} className={`rounded-xl px-3 py-2 text-body font-black text-white cursor-pointer ${isUnassigned ? 'bg-brand-tertiary hover:bg-brand-tertiary' : 'bg-brand-primary hover:bg-brand-primary'}`}>Bắt đầu dịch vụ</button>
                          <button type="button" onClick={() => openPayment(appointment)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 px-3 py-2 text-body font-black cursor-pointer">
                            <ReceiptText className="h-3.5 w-3.5" /> {invoiceDrafts[appointment.id]?.lines?.length ? `Hóa đơn (${invoiceDrafts[appointment.id].lines.length})` : 'Tạo hóa đơn'}
                          </button>
                        </>
                      )}
                      {appointment.status === 'IN_SERVICE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openPayment(appointment)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 px-3 py-2 text-body font-black cursor-pointer"
                            title="Thêm món, dịch vụ hoặc sản phẩm phụ phát sinh trong khi đang làm dịch vụ"
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                            {invoiceDrafts[appointment.id]?.lines?.length ? `Sửa hóa đơn (${invoiceDrafts[appointment.id].lines.length})` : 'Tạo / Thêm dịch vụ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openPayment(appointment)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-body font-black text-white shadow-sm cursor-pointer"
                          >
                            <ReceiptText className="h-3.5 w-3.5" /> Thu tiền & hoàn tất
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {appointment.note && <p className="mt-3 rounded-xl bg-brand-surface-high/60 px-3 py-2 text-caption font-semibold leading-4 text-brand-text-muted"><span className="font-black text-brand-text">Lưu ý:</span> {appointment.note}</p>}
                </article>
              );
            })}
          </div>
          {deskQueueAppointments.length > 7 && <button type="button" onClick={() => navigate('appointments')} className="flex w-full items-center justify-center gap-2 border-t border-brand-outline py-3 text-body font-black text-brand-secondary hover:bg-brand-secondary/10">Xem thêm {deskQueueAppointments.length - 7} lịch <ChevronRight className="h-3.5 w-3.5" /></button>}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-black uppercase tracking-[0.12em] text-brand-tertiary">Sắp đến</p>
                <h2 className="mt-1 text-base font-black text-brand-text">Lịch kế tiếp</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tertiary/10 text-brand-tertiary ring-1 ring-brand-tertiary/18"><Clock3 className="h-5 w-5" /></span>
            </div>
            <div className="mt-4 space-y-2">
              {upcomingAppointments.slice(0, 3).map((appointment, index) => (
                <article key={appointment.id} className={`rounded-2xl border p-3 ${index === 0 ? 'border-brand-tertiary bg-brand-tertiary/60' : 'border-brand-outline bg-brand-surface-high/35'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-black tabular-nums ${index === 0 ? 'bg-brand-tertiary text-white' : 'bg-brand-surface text-brand-text ring-1 ring-brand-outline'}`}>{appointment.start}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black text-brand-text">{appointment.customer}</p>
                        {index === 0 && <span className="shrink-0 text-caption font-black uppercase text-brand-tertiary">Kế tiếp</span>}
                      </div>
                      <p className="mt-1 truncate text-caption font-semibold text-brand-text-muted">{appointment.service}</p>
                      <p className="mt-1 truncate text-caption text-brand-text-muted">{appointment.staff}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                    <button type="button" onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')} className="flex items-center justify-center gap-1 rounded-xl bg-brand-secondary px-2 py-2 text-caption font-black text-white"><Check className="h-3 w-3" /> Check-in</button>
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
                <p className="text-body font-black uppercase tracking-[0.12em] text-brand-primary">Nguồn lực</p>
                <h2 className="mt-1 text-base font-black text-brand-text">Sẵn sàng phục vụ</h2>
              </div>
              <button type="button" onClick={() => navigate('technicians')} className="text-caption font-black text-brand-secondary hover:underline">Chi tiết</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Sẵn sàng', value: availableTechnicians.length, color: 'text-brand-secondary' },
                { label: 'Đang làm', value: servingTechnicians.length, color: 'text-brand-primary' },
                { label: 'Ghế dùng', value: occupiedStations, color: 'text-brand-secondary' },
              ].map((item) => <div key={item.label} className="rounded-xl bg-brand-surface-high/55 p-2.5 text-center"><p className={`text-lg font-black ${item.color}`}>{item.value}</p><p className="mt-1 text-caption font-black uppercase tracking-wide text-brand-text-muted">{item.label}</p></div>)}
            </div>
            <div className="mt-3 space-y-2">
              {branchTechnicians.filter((technician) => ['PRESENT', 'SERVING', 'BREAK'].includes(technician.status)).slice(0, 4).map((technician) => (
                <div key={technician.id} className="flex items-center gap-3 rounded-xl border border-brand-outline px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-secondary/15 text-caption font-black text-brand-secondary">{technician.initials}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-body font-black text-brand-text">{technician.name}</p><p className="truncate text-caption font-semibold text-brand-text-muted">{technician.specialty}</p></div>
                  <StatusBadge status={technician.status} label={technicianStatusMeta[technician.status].label} size="small" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <article className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-brand-secondary" /><p className="text-body font-black uppercase tracking-[0.12em] text-brand-secondary">Đối soát ca</p></div>
              <h2 className="mt-1 text-base font-black text-brand-text">Quỹ và giao dịch trong ngày</h2>
            </div>
            <button type="button" onClick={() => navigate('payments')} className="flex items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface-high px-3 py-2 text-body font-black text-brand-text">Xem thanh toán <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-brand-surface-high/55 p-4"><p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">Quỹ đầu ca</p><p className="mt-2 text-base font-black text-brand-text">{money(shift.openingCash)}</p></div>
            <div className="rounded-2xl bg-brand-secondary/10 p-4 ring-1 ring-brand-secondary/18"><p className="text-caption font-black uppercase tracking-wide text-brand-secondary">Tổng đã thu</p><p className="mt-2 text-base font-black text-brand-secondary">{money(todayRevenue)}</p></div>
            <div className="rounded-2xl bg-brand-surface-high/55 p-4"><p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">Số giao dịch</p><p className="mt-2 text-base font-black text-brand-text">{paidToday.length} giao dịch</p></div>
          </div>
        </article>

        <article className="rounded-[24px] border border-brand-outline bg-brand-surface p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-secondary/10 text-brand-secondary ring-1 ring-brand-secondary/18"><BadgeCheck className="h-5 w-5" /></span>
            <div>
              <p className="text-body font-black uppercase tracking-[0.12em] text-brand-text-muted">Vai trò đang đăng nhập</p>
              <h2 className="mt-1 text-base font-black text-brand-text">Receptionist · {account.displayName}</h2>
              <p className="mt-1 text-body font-semibold text-brand-text-muted">{account.email}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              'Tiếp nhận & check-in khách',
              'Tạo, chỉnh và điều phối lịch',
              'Phân công kỹ thuật viên',
              'Thu tiền & in hóa đơn',
            ].map((permission) => <div key={permission} className="flex items-center gap-2 rounded-xl bg-brand-surface-high/50 px-3 py-2 text-caption font-bold text-brand-text"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-secondary" />{permission}</div>)}
          </div>
          <p className="mt-3 flex items-start gap-2 text-caption font-semibold leading-4 text-brand-text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-secondary" />Dữ liệu và thao tác được giới hạn tại {branchName}.</p>
        </article>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={loadMockReceptionData} className="flex items-center gap-2 rounded-xl border border-brand-outline bg-brand-surface px-3 py-2 text-caption font-black text-brand-text-muted hover:text-brand-secondary">
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
            <span className="inline-flex items-center gap-2 rounded-lg bg-brand-primary/10 px-2.5 py-1.5 text-body font-black uppercase tracking-[0.08em] text-brand-primary ring-1 ring-brand-primary/18">
              <UserCheck className="h-3.5 w-3.5" /> Nhân sự hôm nay
            </span>
            <h1 className="mt-3 text-xl font-black tracking-tight text-brand-text sm:text-2xl">Theo dõi kỹ thuật viên trong ngày</h1>
            <p className="mt-1 text-body leading-5 text-brand-text-muted">Kiểm tra ca làm, trạng thái check-in, nghỉ phép và khách đang được phân công tại {branchName}.</p>
          </div>
          <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/60 px-4 py-3 text-body font-bold text-brand-text-muted">
            <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-secondary" /> Cập nhật {nowTime()}</p>
            <p className="mt-1 text-caption">Dữ liệu mock để lễ tân test điều phối trong ngày.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Tổng kỹ thuật viên', value: technicianStats.total, icon: UsersRound, tone: 'bg-brand-primary/10 text-brand-primary' },
            { label: 'Có mặt', value: technicianStats.present, icon: CheckCircle2, tone: 'bg-brand-secondary/10 text-brand-secondary' },
            { label: 'Đang phục vụ', value: technicianStats.serving, icon: Armchair, tone: 'bg-brand-primary/10 text-brand-primary' },
            { label: 'Chưa đến', value: technicianStats.notArrived, icon: Clock3, tone: 'bg-brand-tertiary/10 text-brand-tertiary' },
            { label: 'Báo nghỉ', value: technicianStats.reportedOff, icon: Bell, tone: 'bg-brand-error/10 text-brand-error' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-brand-outline bg-brand-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-caption font-black uppercase tracking-[0.08em] text-brand-text-muted">{label}</p>
                  <p className="mt-2 text-2xl font-black text-brand-text">{value}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <input
              value={technicianQuery}
              onChange={(event) => setTechnicianQuery(event.target.value)}
              placeholder="Tìm tên kỹ thuật viên hoặc chuyên môn..."
              className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 pl-10 pr-3 text-xs font-semibold text-brand-text outline-none transition focus:border-brand-secondary focus:bg-brand-surface focus:ring-4 focus:ring-brand-secondary/10 placeholder:text-brand-text-muted/60"
            />
          </label>
          <select value={technicianStatusFilter} onChange={(event) => setTechnicianStatusFilter(event.target.value as 'ALL' | TechnicianStatus)} className="h-11 rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
            <option value="ALL">Mọi trạng thái</option>
            {Object.entries(technicianStatusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <select value={technicianShiftFilter} onChange={(event) => setTechnicianShiftFilter(event.target.value as 'ALL' | TechnicianShift)} className="h-11 rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
            <option value="ALL">Mọi ca làm</option>
            {Object.entries(technicianShiftMeta).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={technicianSpecialtyFilter} onChange={(event) => setTechnicianSpecialtyFilter(event.target.value)} className="h-11 rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
            {technicianSpecialties.map((specialty) => <option key={specialty} value={specialty}>{specialty === 'ALL' ? 'Mọi chuyên môn' : specialty}</option>)}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-brand-secondary/15 text-body font-black text-brand-secondary">
                    {technician.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-brand-text">{technician.name}</h2>
                      <StatusBadge status={technician.status} label={meta.label} size="small" />
                    </div>
                    <p className="mt-1 text-body font-bold text-brand-text-muted">{technician.specialty}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-semibold text-brand-text-muted">
                      <span>{technician.shiftLabel}</span>
                      <span className="hidden text-brand-outline sm:inline">•</span>
                      <span>{meta.helper}</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[220px]">
                  <div className="rounded-xl bg-brand-surface-high/45 p-2">
                    <p className="text-caption font-bold uppercase tracking-wide text-brand-text-muted">Check-in</p>
                    <p className="mt-1 text-xs font-black text-brand-text">{technician.checkIn || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-brand-surface-high/45 p-2">
                    <p className="text-caption font-bold uppercase tracking-wide text-brand-text-muted">Check-out</p>
                    <p className="mt-1 text-xs font-black text-brand-text">{technician.checkOut || '—'}</p>
                  </div>
                  <button type="button" onClick={() => openTechnicianEdit(technician)} className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-xl border border-brand-secondary/25 bg-brand-secondary/10 text-caption font-black text-brand-secondary hover:bg-brand-secondary/15">
                    <UserCheck className="h-3.5 w-3.5" /> Chỉnh trạng thái & giờ
                  </button>
                </div>
              </div>

              <div className="border-t border-brand-outline bg-brand-surface-high/25 p-4">
                {technician.leaveNote && (
                  <div className="mb-3 rounded-xl border border-brand-error/20 bg-brand-error/10 px-3 py-2 text-body font-bold text-brand-error">
                    Ghi chú nghỉ: {technician.leaveNote}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-caption font-black uppercase tracking-[0.08em] text-brand-text-muted">Lịch hẹn / khách phân công</p>
                    <p className="mt-1 text-caption text-brand-text-muted">{assignedAppointments.length ? `${assignedAppointments.length} lịch trong ngày` : 'Chưa có khách được phân công'}</p>
                  </div>
                  <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                    {technician.branch}
                  </span>
                </div>
                {currentAppointment ? (
                  <div className="mt-3 rounded-xl border border-brand-outline bg-brand-surface p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-brand-text">{currentAppointment.customer}</p>
                        <p className="mt-1 text-caption font-semibold text-brand-text-muted">{currentAppointment.start} · {currentAppointment.service}</p>
                      </div>
                      <StatusBadge status={currentAppointment.status} label={appointmentStatusLabel[currentAppointment.status]} size="small" />
                    </div>
                    {assignedAppointments.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {assignedAppointments.slice(0, 4).map((appointment) => (
                          <span key={appointment.id} className="rounded-lg bg-brand-surface-high px-2 py-1 text-caption font-bold text-brand-text-muted">
                            {appointment.start} · {appointment.customer}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-brand-outline bg-brand-surface p-4 text-center text-body font-bold text-brand-text-muted">
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
      <aside className={`role-sidebar reception-sidebar fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex flex-col bg-[#0f172a] text-white border-r border-white/10 shadow-2xl transition-[width,transform] duration-300 lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[var(--size-sidebar)]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className={`flex h-16 shrink-0 items-center border-b border-white/10 px-3.5 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-xs">
              <Store className="h-4 w-4" />
            </span>
            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-xs font-black text-white tracking-tight">{tenantName}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Lễ tân · {branchCode === 'Q1' ? 'CN Quận 1' : 'CN Quận 3'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
            className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ${
              sidebarCollapsed ? 'hidden' : ''
            }`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5" aria-label="Điều hướng Receptionist">
          <p className={`px-2.5 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            Vận hành tại quầy
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? 'page' : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl transition-all cursor-pointer ${
                  sidebarCollapsed ? 'lg:justify-center lg:h-10 lg:px-0' : 'h-10 px-3'
                } ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    active ? 'text-emerald-400 scale-105' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={`text-xs truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
                {active && !sidebarCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-2.5 space-y-2">
          <div className={`flex items-center gap-2.5 rounded-xl bg-white/5 p-2 ${sidebarCollapsed ? 'lg:justify-center lg:p-1.5' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
              {account.displayName.split(' ').slice(-2).map((part) => part[0]).join('')}
            </span>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-xs font-bold text-white">{account.displayName}</p>
              <p className="truncate text-[10px] text-slate-400 font-medium">Lễ tân · {branchCode === 'Q1' ? 'Quận 1' : 'Quận 3'}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer ${sidebarCollapsed ? 'lg:hidden' : ''}`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="hidden lg:flex h-8 w-full items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}

          <div className="hidden lg:block">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
              aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
              className={`flex h-8 w-full items-center rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer ${
                sidebarCollapsed ? 'justify-center p-0' : 'justify-between px-2.5'
              }`}
            >
              <span className={sidebarCollapsed ? 'hidden' : 'truncate flex items-center gap-1.5'}>
                <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
                <span>Thu hẹp</span>
              </span>
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">Ctrl+B</kbd>
              )}
            </button>
          </div>
        </div>
      </aside>
      {/* Lớp phủ khi mở menu trên mobile: không phải nút bấm nên không lọt vào
          thứ tự Tab. Menu đã có nút Đóng riêng và đóng được bằng Escape. */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-[var(--backdrop-color)] lg:hidden"
        />
      )}

      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[var(--size-sidebar)]'}`}>
        <header className="role-topbar sticky top-0 z-[var(--z-sticky)] flex h-[var(--size-topbar)] items-center gap-3 border-b border-brand-outline px-4 sm:px-6">
          <Button variant="secondary" size="small" iconOnly aria-label="Mở menu" onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu /></Button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
            className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text-muted hover:bg-brand-surface-high hover:text-brand-text transition cursor-pointer"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <div className="hidden min-w-0 sm:block"><p className="text-caption font-bold uppercase tracking-wider text-brand-text-muted">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</p><p className="mt-0.5 text-body font-bold text-brand-text">{navItems.find((item) => item.id === page)?.label}</p></div>
          <div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={page === 'products' ? 'Tìm tên, SKU, lô sản phẩm...' : page === 'stations' ? 'Tìm mã ghế, khách, kỹ thuật viên...' : 'Tìm tên, số điện thoại, dịch vụ...'} className="h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface-lowest pl-10 pr-4 text-body outline-none focus:border-brand-secondary" /></div>
          <span className="hidden sm:flex" title="Tài khoản chỉ được điều phối chi nhánh này"><StatusBadge status="ACTIVE" label={branchCode === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3'} /></span>
          <button
            type="button"
            onClick={() => onThemeChange(nextThemeMode)}
            className="ui-btn ui-btn--secondary ui-btn--small"
            aria-label={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            aria-pressed={themeMode === 'dark'}
            title={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {themeMode === 'dark' ? <Sun className="h-4 w-4 text-brand-tertiary" /> : <Moon className="h-4 w-4 text-brand-text-muted" />}
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
              {deskAlerts.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-error ring-2 ring-brand-surface" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-brand-outline bg-brand-surface p-3 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-xs font-black">Thông báo tại quầy</p>
                  <span className="text-caption font-bold text-brand-error">{deskAlerts.length} cần chú ý</span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {deskAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => { setShowNotifications(false); setPage('desk'); }}
                      className={`w-full rounded-xl p-3 text-left ${alert.tone === 'cyan' ? 'bg-brand-secondary/10 text-brand-secondary' : alert.tone === 'amber' ? 'bg-brand-tertiary/10 text-brand-tertiary' : 'bg-brand-primary/10 text-brand-primary'}`}
                    >
                      <p className="text-body font-black">{alert.title}</p>
                      <p className="mt-1 text-caption opacity-75">{alert.detail}</p>
                    </button>
                  ))}
                  {deskAlerts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-brand-outline p-6 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-brand-secondary" />
                      <p className="mt-2 text-body font-black text-brand-text">Quầy đang vận hành ổn định</p>
                      <p className="mt-1 text-caption text-brand-text-muted">Không có mục cần xử lý ngay.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="role-main mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"><Suspense fallback={<div className="py-24 text-center text-xs font-bold text-brand-text-muted">Đang tải không gian lễ tân...</div>}>{renderPage()}</Suspense></main>
      </div>

      {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-brand-secondary bg-brand-secondary px-4 py-3 text-xs font-bold text-white shadow-2xl"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand-secondary" />{toast}</div>}

      {deletingAppointment && (
        <Modal
          open
          size="medium"
          icon={<Trash2 />}
          title="Xác nhận hủy lịch tạo nhầm"
          description="Lịch không bị xóa mất dấu vết. Hệ thống sẽ chuyển sang trạng thái Đã hủy và lưu lý do để đối soát."
          onClose={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}>
                Giữ lại lịch
              </Button>
              <Button type="submit" form="reception-delete-appointment" variant="danger" iconLeading={<Trash2 />}>
                Xác nhận hủy
              </Button>
            </>
          }
        >
          <form id="reception-delete-appointment" onSubmit={submitDeleteAppointment} noValidate className="space-y-4">
            <div className="p-4 ui-tone ui-tone--danger">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand-error">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-brand-text">{deletingAppointment.customer}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-text-muted">
                    {deletingAppointment.start} · {deletingAppointment.service} · {deletingAppointment.phone}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={deletingAppointment.status} label={appointmentStatusLabel[deletingAppointment.status]} size="small" />
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {deletingAppointment.staff}
                    </span>
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {money(deletingAppointment.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-3 text-body font-bold leading-5 text-brand-text-muted sm:grid-cols-2">
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Chỉ cho hủy lịch chưa bắt đầu dịch vụ</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã thanh toán</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã có cọc</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Lưu người thao tác và thời gian</p>
            </div>

            <Field
              label="Lý do hủy/xóa khỏi quầy"
              required
              error={formError || undefined}
              helper="Lý do được lưu kèm người thao tác để đối soát."
            >
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                className="min-h-24 resize-none py-3"
                placeholder="Ví dụ: Tạo nhầm lịch, khách đặt trùng, nhập sai số điện thoại..."
              />
            </Field>
          </form>
        </Modal>
      )}

      {walkInOpen && (
        <Modal
          open
          size="large"
          icon={<UserCheck />}
          title="Tiếp nhận khách vãng lai"
          description="Tạo lượt phục vụ tại quầy và đưa khách vào hàng chờ ngay lập tức."
          onClose={() => { setWalkInOpen(false); setFormError(''); setWalkInErrors({}); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setWalkInOpen(false); setFormError(''); setWalkInErrors({}); }}>Hủy</Button>
              <Button type="submit" form="reception-walkin" variant="primary" iconLeading={<UserCheck />}>Tạo &amp; check-in</Button>
            </>
          }
        >
          <form id="reception-walkin" onSubmit={submitWalkIn} noValidate className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-tertiary/25 bg-brand-tertiary/10 p-3 text-body font-bold leading-5 text-brand-tertiary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Giờ mở cửa salon: 08:00 – 20:30 (Khung giờ tiếp nhận khách: 08:00 – 20:00). Hệ thống kiểm tra trùng KTV, ca làm việc, giờ đóng cửa và ghế phục vụ.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *" error={walkInErrors.customer}>
                <input
                  value={walkIn.customer}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, customer: event.target.value });
                    if (walkInErrors.customer) setWalkInErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  className="reception-input"
                  placeholder="Nguyễn Minh Anh"
                  autoFocus
                />
              </Field>
              <Field label="Số điện thoại *" helper="10 số di động VN (09xx, 08xx, 03xx, 07xx, 05xx)" error={walkInErrors.phone}>
                <input
                  type="tel"
                  value={walkIn.phone}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, phone: event.target.value });
                    if (walkInErrors.phone) setWalkInErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className="reception-input"
                  placeholder="0903123456"
                />
              </Field>
              <Field label="Dịch vụ *" error={walkInErrors.service}>
                <select
                  value={walkIn.service}
                  onChange={(event) => {
                    handleWalkInServiceChange(event.target.value);
                    if (walkInErrors.service) setWalkInErrors((prev) => ({ ...prev, service: '' }));
                  }}
                  className="reception-input"
                >
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *" error={walkInErrors.staff}>
                <select
                  value={walkIn.staff}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, staff: event.target.value });
                    if (walkInErrors.staff) setWalkInErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="reception-input"
                >
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng" error={walkInErrors.station}>
                <select
                  value={walkIn.station}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, station: event.target.value });
                    if (walkInErrors.station) setWalkInErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="reception-input"
                >
                  <option value="">Xếp sau khi check-in</option>
                  {stationCatalog[branchCode].map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *" helper="Salon mở cửa từ 08:00 đến 20:30" error={walkInErrors.start}>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={walkIn.start}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, start: event.target.value });
                    if (walkInErrors.start) setWalkInErrors((prev) => ({ ...prev, start: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Thời lượng *" error={walkInErrors.duration}>
                <select
                  value={walkIn.duration}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, duration: event.target.value });
                    if (walkInErrors.duration) setWalkInErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="reception-input"
                >
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *" error={walkInErrors.price}>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={walkIn.price}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, price: event.target.value });
                    if (walkInErrors.price) setWalkInErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={walkIn.note} onChange={(event) => setWalkIn({ ...walkIn, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Dị ứng, sở thích hoặc yêu cầu đặc biệt..." />
            </Field>
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
      )}

      {editingAppointment && (
        <Modal
          open
          size="large"
          icon={<CalendarClock />}
          headerAside={<StatusBadge status={editingAppointment.status} label={appointmentStatusLabel[editingAppointment.status]} size="small" />}
          title={`Điều phối lịch ${editingAppointment.start}`}
          description={`${editingAppointment.customer} · ${branchName}`}
          onClose={() => { setEditingAppointment(null); setFormError(''); setAppointmentEditErrors({}); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setEditingAppointment(null); setFormError(''); setAppointmentEditErrors({}); }}>Hủy</Button>
              <Button type="submit" form="reception-edit-appointment" variant="primary" iconLeading={<Check />}>Lưu điều phối</Button>
            </>
          }
        >
          <form id="reception-edit-appointment" onSubmit={submitAppointmentEdit} noValidate className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-secondary/25 bg-brand-secondary/10 p-3 text-body font-bold leading-5 text-brand-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Giờ mở cửa salon: 08:00 – 20:30. Chỉ kỹ thuật viên đang làm việc, trong ca trực và có đúng chuyên môn mới được phân công.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *" error={appointmentEditErrors.customer}>
                <input
                  value={appointmentEditForm.customer}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, customer: event.target.value });
                    if (appointmentEditErrors.customer) setAppointmentEditErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  className="reception-input"
                  autoFocus
                />
              </Field>
              <Field label="Số điện thoại *" helper="10 số di động VN (09xx, 08xx, 03xx, 07xx, 05xx)" error={appointmentEditErrors.phone}>
                <input
                  type="tel"
                  value={appointmentEditForm.phone}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, phone: event.target.value });
                    if (appointmentEditErrors.phone) setAppointmentEditErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Dịch vụ *" error={appointmentEditErrors.service}>
                <select
                  value={appointmentEditForm.service}
                  onChange={(event) => {
                    handleAppointmentEditServiceChange(event.target.value);
                    if (appointmentEditErrors.service) setAppointmentEditErrors((prev) => ({ ...prev, service: '' }));
                  }}
                  className="reception-input"
                >
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *" error={appointmentEditErrors.staff}>
                <select
                  value={appointmentEditForm.staff}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, staff: event.target.value });
                    if (appointmentEditErrors.staff) setAppointmentEditErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="reception-input"
                >
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng" error={appointmentEditErrors.station}>
                <select
                  value={appointmentEditForm.station}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, station: event.target.value });
                    if (appointmentEditErrors.station) setAppointmentEditErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="reception-input"
                >
                  <option value="">Chưa xếp ghế</option>
                  {stationCatalog[branchCode].map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *" helper="Salon mở cửa từ 08:00 đến 20:30" error={appointmentEditErrors.start}>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={appointmentEditForm.start}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, start: event.target.value });
                    if (appointmentEditErrors.start) setAppointmentEditErrors((prev) => ({ ...prev, start: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Thời lượng *" error={appointmentEditErrors.duration}>
                <select
                  value={appointmentEditForm.duration}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, duration: event.target.value });
                    if (appointmentEditErrors.duration) setAppointmentEditErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="reception-input"
                >
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *" error={appointmentEditErrors.price}>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={appointmentEditForm.price}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, price: event.target.value });
                    if (appointmentEditErrors.price) setAppointmentEditErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={appointmentEditForm.note} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Yêu cầu của khách, dị ứng, mẫu tham khảo..." />
            </Field>
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
      )}

      {paymentAppointment && (
        <Modal
          open
          size="fullscreen"
          icon={<ReceiptText />}
          title="Tạo hóa đơn & thanh toán"
          description={`${paymentAppointment.customer} · ${paymentAppointment.phone} · ${branchName}`}
          onClose={() => setPaymentAppointment(null)}
          footer={
            <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-brand-text-muted">Tổng thực thu:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{money(invoiceTotal)}</span>
                {paymentAppointment.deposit > 0 && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Đã trừ cọc {money(paymentAppointment.deposit)}
                  </span>
                )}
                {invoiceDiscount > 0 && (
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Giảm {money(invoiceDiscount)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button variant="secondary" onClick={() => setPaymentAppointment(null)}>
                  Đóng
                </Button>
                <button
                  type="submit"
                  form="reception-invoice-form"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Xác nhận thanh toán {money(invoiceTotal)}
                </button>
              </div>
            </div>
          }
        >
          {/* Nút thanh toán nằm cạnh khối tổng tiền trong cột phải, không tách ra
              chân hộp thoại — người thu ngân cần thấy số tiền ngay khi bấm. */}
          <form id="reception-invoice-form" onSubmit={submitPayment} className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:overflow-hidden">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface-high/25 lg:flex lg:min-h-0 lg:flex-col">
              <div className="shrink-0 border-b border-brand-outline p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-brand-text">Chọn dịch vụ, mẫu vẽ hoặc sản phẩm</h3>
                    <p className="mt-1 text-body text-brand-text-muted">Chọn dịch vụ, gắn mẫu vẽ theo độ khó hoặc thêm sản phẩm đi kèm.</p>
                  </div>
                  <div className="flex rounded-xl border border-brand-outline bg-brand-surface p-1">
                    <button type="button" onClick={() => { setInvoiceCatalogTab('SERVICE'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>Dịch vụ</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('ART'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'ART' ? 'bg-amber-600 text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>🎨 Mẫu vẽ & Độ khó</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('PRODUCT'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'PRODUCT' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>Sản phẩm</button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                  <input
                    value={invoiceCatalogQuery}
                    onChange={(event) => setInvoiceCatalogQuery(event.target.value)}
                    className="reception-input pl-10"
                    placeholder={
                      invoiceCatalogTab === 'SERVICE'
                        ? 'Tìm tên dịch vụ...'
                        : invoiceCatalogTab === 'ART'
                          ? 'Tìm mẫu nail art, phong cách vẽ tranh...'
                          : 'Tìm tên sản phẩm...'
                    }
                  />
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {invoiceCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setInvoiceCategory(category)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-bold ${
                        invoiceCategory === category
                          ? invoiceCatalogTab === 'SERVICE'
                            ? 'border-brand-secondary bg-brand-secondary text-white'
                            : invoiceCatalogTab === 'ART'
                              ? 'border-amber-600 bg-amber-600 text-white'
                              : 'border-brand-primary bg-brand-primary text-white'
                          : 'border-brand-outline bg-brand-surface text-brand-text-muted'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh sách dịch vụ / Mẫu vẽ / Sản phẩm */}
              {invoiceCatalogTab === 'ART' ? (
                <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-2">
                  {filteredArtTemplates.map((template) => {
                    const preset = ART_DIFFICULTY_PRESETS.find(p => p.level === template.defaultLevel);
                    return (
                      <div
                        key={template.id}
                        className="group relative flex flex-col rounded-2xl border border-amber-500/30 bg-brand-surface p-4 shadow-sm transition-all duration-300 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-caption font-bold text-amber-700 dark:text-amber-300">
                              {template.category}
                            </span>
                            <h4 className="mt-1 text-xs font-black text-brand-text">{template.name}</h4>
                          </div>
                          <span className="shrink-0 rounded-lg bg-brand-surface-high border border-amber-500/30 px-2 py-1 text-right">
                            <span className="block text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">{preset?.shortLabel}</span>
                            <span className="block text-caption font-black text-brand-text">+{money(template.surcharge)}</span>
                          </span>
                        </div>

                        <p className="mt-2 text-caption text-brand-text-muted line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.tags.map(t => (
                            <span key={t} className="rounded bg-brand-surface-high/60 px-1.5 py-0.5 text-[10px] text-brand-text-muted">
                              #{t}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-brand-outline/40">
                          <span className="text-caption text-brand-text-muted font-bold">
                            Thời gian: ~{template.duration}p
                          </span>
                          <button
                            type="button"
                            onClick={() => addArtServiceItem(template)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3 py-1.5 text-caption font-black shadow-sm transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm dịch vụ sơn + vẽ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!filteredArtTemplates.length && (
                    <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">
                      Không tìm thấy mẫu vẽ phù hợp.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-3">
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
                        className="group relative flex min-h-[170px] flex-col rounded-2xl border border-brand-outline bg-brand-surface p-4 text-left shadow-sm transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-brand-secondary hover:shadow-lg hover:shadow-card focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                      >
                        {count > 0 && <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-secondary px-1.5 text-caption font-black text-white">{count}</span>}
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? ' text-brand-secondary' : ' text-brand-primary'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <span className="mt-3 line-clamp-2 text-xs font-black leading-5 text-brand-text">{item.name}</span>
                        <span className="mt-1 text-caption font-semibold text-brand-text-muted">{item.category}</span>
                        <span className="mt-auto flex items-end justify-between gap-3 pt-3">
                          <span>
                            <span className={`block text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? 'text-brand-secondary' : 'text-brand-primary'}`}>{money(item.price)}</span>
                            <span className="mt-0.5 block text-caption text-brand-text-muted">{invoiceCatalogTab === 'SERVICE' ? `${item.duration} phút` : `Còn ${item.stock} sản phẩm`}</span>
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
                              <span className="text-body font-black w-5 text-center text-brand-text">{count}</span>
                              <button
                                type="button"
                                onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary hover:bg-brand-secondary' : 'bg-brand-primary hover:bg-brand-primary'}`}
                                aria-label="Tăng số lượng"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ) : (
                            <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 group-hover:scale-105 shrink-0 ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary' : 'bg-brand-primary'}`}>
                              <Plus className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {!filteredCatalog.length && <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">Không tìm thấy mục phù hợp.</div>}
                </div>
              )}
            </section>

            <aside className="min-w-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 scrollbar-thin scrollbar-thumb-brand-outline/60">
              {/* Thẻ 1: Khách hàng & Bảng danh sách dịch vụ đã chọn */}
              <div className="selected-services rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-sm flex flex-col w-full min-w-0 lg:flex-1 lg:min-h-[360px] min-h-[320px] overflow-hidden overflow-x-hidden">
                <div className="flex items-center gap-3 border-b border-brand-outline pb-3 shrink-0 w-full min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white font-black text-sm shadow-sm">
                    {paymentAppointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-black text-brand-text">{paymentAppointment.customer}</p>
                      <span className="shrink-0 rounded-md bg-brand-secondary/10 px-1.5 py-0.5 text-caption font-bold text-brand-secondary">Đã check-in</span>
                    </div>
                    <p className="mt-0.5 truncate text-caption text-brand-text-muted">{paymentAppointment.phone} · ID: {paymentAppointment.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-1 text-caption font-black text-brand-primary">{branchCode}</span>
                </div>

                <div className="mt-3 flex flex-col gap-2 shrink-0 pb-2 w-full min-w-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ReceiptText className="h-3.5 w-3.5 text-brand-secondary shrink-0" />
                    <h3 className="text-xs font-black text-brand-text truncate">Chi tiết dịch vụ, giá tiền & ưu đãi</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-caption font-bold">
                    <span className="rounded-full bg-brand-surface-high px-2 py-0.5 text-brand-text-muted shrink-0">{invoiceLines.length} dòng</span>
                    <span className="rounded-full bg-brand-secondary/10 px-2 py-0.5 text-brand-secondary shrink-0">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                    {invoiceDiscount > 0 && <span className="rounded-full bg-brand-error/10 px-2 py-0.5 text-brand-error shrink-0">Ưu đãi -{money(invoiceDiscount)}</span>}
                  </div>
                </div>

                {/* Khung Bảng dịch vụ */}
                <div className="service-list-container mt-1 flex-1 flex flex-col min-h-[240px] w-full min-w-0 overflow-hidden overflow-x-hidden rounded-xl border border-brand-outline/60 bg-brand-surface-high/20">
                  {/* Hàng tiêu đề Bảng */}
                  <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-center gap-1 px-2 py-2 text-caption font-extrabold uppercase tracking-wider text-brand-text-muted border-b border-brand-outline bg-brand-surface-high/50 shrink-0 w-full min-w-0">
                    <span className="text-center min-w-0">STT</span>
                    <span className="min-w-0">Dịch vụ & Mẫu vẽ đi kèm</span>
                    <span className="text-right min-w-0">Đơn giá</span>
                    <span className="min-w-0">Kỹ thuật viên</span>
                    <span className="text-center min-w-0">Số lượng</span>
                    <span className="text-right min-w-0">Thành tiền</span>
                    <span className="text-center min-w-0">Xóa</span>
                  </div>

                  {/* Vùng cuộn các dòng Bảng */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 divide-y divide-brand-outline/40 scrollbar-thin scrollbar-thumb-brand-outline/60 py-0.5">
                    {invoiceLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="w-full min-w-0 text-xs transition-colors hover:bg-brand-surface-high/40 shrink-0"
                      >
                        {/* 1-Row Grid Layout chuẩn xác trên xl: */}
                        <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-start gap-1 w-full min-w-0 px-2 py-2.5">
                          {/* STT */}
                          <div className="flex justify-center items-center min-w-0 pt-1">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-caption font-black border ${line.type === 'SERVICE' ? 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary' : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Tên dịch vụ & Mẫu vẽ + Độ khó + Phụ kiện đi kèm */}
                          <div className="min-w-0 pr-1">
                            <p className="font-bold text-brand-text text-body leading-snug min-w-0">
                              {line.name}
                            </p>
                            
                            {/* Chi tiết mẫu vẽ, màu sơn, phụ kiện nếu có */}
                            <div className="mt-1 space-y-1">
                              {line.designName && (
                                <div className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  <span>🎨 Mẫu: {line.designName}</span>
                                  {line.difficultyLabel && (
                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-black">
                                      {line.difficultyLabel}
                                    </span>
                                  )}
                                  {line.designSurcharge ? (
                                    <span className="text-amber-800 dark:text-amber-200 font-extrabold">
                                      (+{money(line.designSurcharge)})
                                    </span>
                                  ) : null}
                                </div>
                              )}

                              {line.attachedColorName && (
                                <div className="flex items-center gap-1 text-[11px] text-brand-text-muted">
                                  {line.attachedColorHex && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-black/20"
                                      style={{ backgroundColor: line.attachedColorHex }}
                                    />
                                  )}
                                  <span>Màu: <strong className="text-brand-text">{line.attachedColorName}</strong></span>
                                </div>
                              )}

                              {line.attachedProductName && (
                                <div className="text-[11px] text-brand-text-muted">
                                  <span>💎 Kèm: <strong className="text-brand-text">{line.attachedProductName}</strong> {line.attachedProductPrice ? `(+${money(line.attachedProductPrice)})` : ''}</span>
                                </div>
                              )}

                              {line.customArtNote && (
                                <div className="text-[11px] italic text-brand-text-muted line-clamp-1">
                                  📝 {line.customArtNote}
                                </div>
                              )}
                            </div>

                            {/* Nút tùy chỉnh mẫu vẽ & độ khó dành cho dịch vụ */}
                            {line.type === 'SERVICE' && (
                              <button
                                type="button"
                                onClick={() => openLineCustomizer(line)}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-brand-secondary/40 bg-brand-secondary/10 px-2 py-0.5 text-[11px] font-bold text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all cursor-pointer shadow-xs"
                              >
                                <Palette className="h-3 w-3" />
                                {line.designName ? 'Sửa mẫu vẽ & độ khó' : '+ Kèm mẫu vẽ/độ khó/phụ kiện'}
                              </button>
                            )}

                            <p className="mt-0.5 truncate text-caption font-semibold text-brand-text-muted">
                              {line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · {line.staff}
                            </p>
                          </div>

                          {/* Đơn giá */}
                          <div className="min-w-0 w-full text-right pt-1">
                            <span className="block truncate text-caption font-bold text-brand-text-muted">x {money(line.unitPrice)}</span>
                          </div>

                          {/* Kỹ thuật viên */}
                          <div className="min-w-0 w-full pt-0.5">
                            {line.type === 'SERVICE' ? (
                              <select
                                value={line.staff}
                                onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                className={`h-8 w-full min-w-0 rounded-lg border px-1 text-caption font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                  line.staff === 'Chưa phân công'
                                    ? 'border-brand-tertiary/60 bg-brand-tertiary/10 text-brand-tertiary focus:border-brand-tertiary focus:ring-2 focus:ring-brand-tertiary/20'
                                    : 'border-brand-outline bg-brand-surface-high/80 focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20'
                                }`}
                                aria-label={`Kỹ thuật viên cho ${line.name}`}
                              >
                                {invoiceStaff.map((staff) => (
                                  <option key={staff} value={staff}>{staff}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="h-8 w-full min-w-0 flex items-center justify-center rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-caption font-semibold">
                                Sản phẩm
                              </div>
                            )}
                          </div>

                          {/* Số lượng */}
                          <div className="min-w-0 w-full flex justify-center pt-0.5">
                            <div className="flex h-8 w-full min-w-0 items-center justify-between rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-colors"
                                aria-label={`Giảm số lượng ${line.name}`}
                              >
                                −
                              </button>
                              <span className="text-body font-black text-brand-text flex-1 text-center min-w-0">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-colors"
                                aria-label={`Tăng số lượng ${line.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Thành tiền */}
                          <div className="min-w-0 w-full text-right pt-1">
                            <strong className="block text-body font-black text-brand-text tracking-tight min-w-0 truncate">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>

                          {/* Xóa */}
                          <div className="min-w-0 w-[22px] flex justify-center pt-1">
                            <button
                              type="button"
                              onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                              className="flex h-7 w-6 items-center justify-center rounded-lg text-brand-error hover:text-brand-error hover:bg-brand-error/15 focus:outline-none focus:ring-2 focus:ring-brand-error/40 transition-all cursor-pointer"
                              title="Xóa dịch vụ"
                              aria-label={`Xóa ${line.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Responsive 2-Row Layout Fallback khi khung hẹp (< xl) */}
                        <div className="xl:hidden flex flex-col gap-2 w-full min-w-0 p-3">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-body font-black border ${line.type === 'SERVICE' ? 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary' : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'}`}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span className="min-w-0 flex-1">
                                <p className="font-bold text-brand-text text-xs leading-snug min-w-0" title={line.name}>
                                  {line.name}
                                </p>
                                
                                {line.designName && (
                                  <div className="mt-1 inline-flex flex-wrap items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                    <span>🎨 {line.designName}</span>
                                    {line.difficultyLabel && <span>({line.difficultyLabel})</span>}
                                    {line.designSurcharge ? <span>+{money(line.designSurcharge)}</span> : null}
                                  </div>
                                )}

                                {line.attachedColorName && (
                                  <p className="mt-0.5 text-[11px] text-brand-text-muted">
                                    💅 Màu: {line.attachedColorName}
                                  </p>
                                )}

                                {line.attachedProductName && (
                                  <p className="mt-0.5 text-[11px] text-brand-text-muted">
                                    💎 Kèm: {line.attachedProductName} (+{money(line.attachedProductPrice || 0)})
                                  </p>
                                )}

                                {line.type === 'SERVICE' && (
                                  <button
                                    type="button"
                                    onClick={() => openLineCustomizer(line)}
                                    className="mt-1.5 flex items-center gap-1 rounded border border-brand-secondary/40 bg-brand-secondary/10 px-2 py-0.5 text-[11px] font-bold text-brand-secondary cursor-pointer"
                                  >
                                    <Palette className="h-3 w-3" /> Tùy chỉnh mẫu vẽ & giá
                                  </button>
                                )}

                                <p className="mt-0.5 text-caption font-semibold text-brand-text-muted">{line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · Đơn giá {money(line.unitPrice)}</p>
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
                                  className={`h-8 w-full min-w-0 rounded-lg border px-2 text-body font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                    line.staff === 'Chưa phân công'
                                      ? 'border-brand-tertiary/60 bg-brand-tertiary/10 text-brand-tertiary'
                                      : 'border-brand-outline bg-brand-surface-high/80'
                                  }`}
                                >
                                  {invoiceStaff.map((staff) => (
                                    <option key={staff} value={staff}>{staff}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-body font-semibold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-1 rounded-md">Sản phẩm</span>
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-error hover:text-brand-error hover:bg-brand-error/15"
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
              <div className="rounded-2xl border border-brand-secondary/25 bg-brand-surface p-4 shadow-sm text-body lg:shrink-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-[0.08em] text-brand-secondary">Đối soát hóa đơn</p>
                    <p className="mt-1 text-caption text-brand-text-muted">Giá dịch vụ, cọc, ưu đãi, tip, thuế/phụ phí và tổng cuối.</p>
                  </div>
                  <span className="rounded-full bg-brand-secondary/10 px-2.5 py-1 text-caption font-black text-brand-secondary">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                </div>

                <div className="rounded-xl border border-brand-outline/70 bg-brand-surface-high/25 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-caption font-bold uppercase tracking-wider text-brand-text-muted">Tạm tính</span>
                      <strong className="mt-1 block text-sm font-black text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-caption font-bold uppercase tracking-wider text-brand-text-muted">Ưu đãi</span>
                      <strong className="mt-1 block text-sm font-black text-brand-error">-{money(invoiceDiscount)}</strong>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-brand-outline/40 pt-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><ReceiptText className="h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><span className="truncate">Tổng tiền dịch vụ</span></span>
                      <strong className="text-right text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-secondary" /><span className="truncate">Tiền cọc</span></span>
                      <strong className="text-right text-brand-secondary">- {money(paymentAppointment.deposit)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-error" /><span className="truncate">Giảm giá / Ưu đãi</span></span>
                      <strong className="text-right text-brand-error">- {money(invoiceDiscount)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><WalletCards className="h-3.5 w-3.5 shrink-0 text-brand-secondary" /><span className="truncate">Tip kỹ thuật viên</span></span>
                      <strong className="text-right text-brand-secondary">+ {money(invoiceTip)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0 text-brand-tertiary" /><span className="truncate">Thuế / Phụ phí nếu có</span></span>
                      <strong className="text-right text-brand-tertiary">+ {money(invoiceTaxAndFees)}</strong>
                    </div>
                  </div>
                </div>

                {/* Chọn chương trình ưu đãi Loyalty */}
                <div className="mt-3 rounded-xl border border-brand-primary/25 bg-brand-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-brand-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Áp dụng chương trình ưu đãi
                    </span>
                  </div>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => handleSelectPromo(e.target.value)}
                    className="mt-2 h-9 w-full rounded-lg border border-brand-primary/20 bg-brand-surface px-2.5 text-body font-bold text-brand-text outline-none focus:border-brand-primary"
                  >
                    <option value="">-- Chọn ưu đãi hoặc nhập giảm giá bên dưới --</option>
                    {loyaltyPrograms.filter((p) => p.status === 'ACTIVE').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.benefit})
                      </option>
                    ))}
                  </select>

                  {promoFeedback && (
                    <div className={`mt-2 rounded-lg p-2.5 text-caption font-bold leading-4 ${promoFeedback.isError ? 'bg-brand-error/10 text-brand-error border border-brand-error' : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary'}`}>
                      {promoFeedback.text}
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-error/20 bg-brand-error/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-brand-error">Giảm giá</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-error">-</span>
                        <input type="number" min="0" step="1000" value={paymentForm.discount} onChange={(event) => { setSelectedPromoId(''); setPromoFeedback(null); setPaymentForm({ ...paymentForm, discount: event.target.value }); }} className="w-[86px] rounded-lg border border-brand-error/20 bg-brand-surface py-1.5 px-2 text-right text-body font-black text-brand-text outline-none focus:border-brand-error focus:ring-2 focus:ring-brand-error/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => { setSelectedPromoId(''); setPromoFeedback(null); setPaymentForm({ ...paymentForm, discount: String(val) }); }} className={`rounded-lg px-1.5 py-1.5 text-caption font-black transition ${Number(paymentForm.discount) === val ? 'bg-brand-error text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `-${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-secondary/20 bg-brand-secondary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-brand-secondary">Tip KTV</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-secondary">+</span>
                        <input type="number" min="0" step="1000" value={paymentForm.tip} onChange={(event) => setPaymentForm({ ...paymentForm, tip: event.target.value })} className="w-[86px] rounded-lg border border-brand-secondary/20 bg-brand-surface py-1.5 px-2 text-right text-body font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, tip: String(val) })} className={`rounded-lg px-1.5 py-1.5 text-caption font-black transition ${Number(paymentForm.tip) === val ? 'bg-brand-secondary text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `+${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-brand-secondary/40 p-3.5 shadow-inner">
                  <div className="min-w-0">
                    <span className="block text-caption font-extrabold uppercase tracking-wider text-brand-secondary">Tổng thanh toán cuối cùng</span>
                    <span className="mt-0.5 block truncate text-caption text-brand-text-muted">Sau cọc, ưu đãi, tip và thuế/phụ phí</span>
                  </div>
                  <strong className="text-right text-2xl font-black tracking-tight text-brand-secondary sm:text-3xl">{money(invoiceTotal)}</strong>
                </div>
              </div>

              {/* Thẻ 3: Phương thức & Xác nhận thanh toán */}
              <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm space-y-3 lg:shrink-0">
                <p className="text-caption font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">Phương thức thanh toán</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(methodMeta).map(([value, meta]) => {
                    const Icon = meta.icon;
                    const selected = paymentForm.method === value;
                    return (
                      <button key={value} type="button" onClick={() => setPaymentForm({ ...paymentForm, method: value as PaymentMethod })} className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-caption font-bold transition-all ${selected ? 'border-brand-secondary bg-brand-secondary/15 text-brand-secondary shadow-sm' : 'border-brand-outline text-brand-text-muted hover:bg-brand-surface-high'}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                {paymentForm.method !== 'CASH' && (
                  <input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} className="reception-input h-8 text-body" placeholder="Mã giao dịch chuyển khoản / thẻ *" />
                )}
                <textarea value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} className="reception-input min-h-[50px] text-body resize-none" placeholder="Ghi chú hóa đơn (không bắt buộc)..." />
                {formError && <p role="alert" className="rounded-xl bg-brand-error/10 p-2.5 text-caption font-bold leading-4 text-brand-error">{formError}</p>}
              </div>
            </aside>
          </form>
        </Modal>
      )}

      {/* Hộp thoại tùy chỉnh chi tiết Mẫu vẽ & Độ khó & Sản phẩm đi kèm cho Dịch vụ */}
      {customizingLine && (
        <Modal
          open
          size="large"
          icon={<Palette className="text-amber-500" />}
          title="Tùy chỉnh mẫu vẽ, độ khó & dịch vụ bổ sung"
          description={`Cấu hình cho dịch vụ: ${customizingLine.name}`}
          onClose={() => setCustomizingLine(null)}
          footer={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-text-muted">
                  <span>Công thức:</span>
                  <span>{money(Math.max(0, parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0))} (Gốc)</span>
                  <span>+</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">+{money(Math.max(0, parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0))} (Art)</span>
                  <span>+</span>
                  <span className="text-brand-secondary font-black">+{money(Number(customizerForm.attachedProductPrice) || 0)} (Kèm)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-brand-text">Tổng đơn giá:</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {money(
                      Math.max(0, parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0) +
                      Math.max(0, parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0) +
                      (Number(customizerForm.attachedProductPrice) || 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setCustomizingLine(null)}>
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={saveLineCustomizer}
                  iconLeading={<Check className="h-4 w-4" />}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black cursor-pointer shadow-md shadow-amber-600/20"
                >
                  Lưu & Áp dụng
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {/* Khối 0: Giá dịch vụ gốc & Thanh công thức cộng dồn */}
            <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/30 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-md bg-brand-secondary/15 px-2 py-0.5 text-caption font-black text-brand-secondary">
                      Dịch vụ chính
                    </span>
                    <span className="text-body font-black text-brand-text">{customizingLine.name}</span>
                  </div>
                  <p className="mt-1 text-caption text-brand-text-muted">
                    Giá dịch vụ gốc được giữ nguyên. Chỉ khi chọn thêm mẫu vẽ, mức độ khó hoặc phụ kiện thì hệ thống mới cộng thêm vào giá này.
                  </p>
                </div>
                <div className="shrink-0 text-right sm:border-l sm:border-brand-outline/60 sm:pl-4">
                  <span className="block text-caption font-bold text-brand-text-muted">Giá dịch vụ gốc</span>
                  <span className="text-base font-black text-brand-text">
                    {money(parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0)}
                  </span>
                </div>
              </div>

              {/* Bảng minh họa công thức tính giá cộng dồn */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-brand-surface p-2.5 border border-brand-outline text-center">
                <div className="p-1">
                  <span className="block text-[10px] font-bold text-brand-text-muted uppercase">1. Giá gốc dịch vụ</span>
                  <span className="text-xs font-black text-brand-text">
                    {money(parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0)}
                  </span>
                </div>
                <div className="p-1 border-x border-brand-outline/60">
                  <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">2. + Phụ thu vẽ Art</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    +{money(parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0)}
                  </span>
                </div>
                <div className="p-1">
                  <span className="block text-[10px] font-bold text-brand-secondary uppercase">3. + Phụ kiện/Màu</span>
                  <span className="text-xs font-black text-brand-secondary">
                    +{money(Number(customizerForm.attachedProductPrice) || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Khối 1: Chọn mẫu vẽ nail art từ thư viện hoặc tự nhập */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-xs font-black text-brand-text">1. Mẫu vẽ Nail Art & Họa tiết kèm theo</h4>
                </div>
                {customizerForm.designName && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomizerForm({
                        ...customizerForm,
                        designName: '',
                        designLevel: 0,
                        difficultyLabel: '',
                        designSurcharge: '0',
                      });
                    }}
                    className="text-caption font-bold text-brand-error hover:underline"
                  >
                    Bỏ chọn mẫu
                  </button>
                )}
              </div>

              {/* Danh sách mẫu gợi ý nhanh */}
              <div>
                <span className="block text-caption font-bold text-brand-text-muted mb-1.5">
                  Chọn mẫu vẽ có sẵn trong Catalog:
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {nailArtTemplates.map((tmpl) => {
                    const isSelected = customizerForm.designName === tmpl.name;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectArtTemplateInCustomizer(tmpl)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30'
                            : 'border-brand-outline bg-brand-surface hover:border-amber-500/50 hover:bg-brand-surface-high'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-[11px] font-black text-brand-text truncate">{tmpl.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        </div>
                        <span className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          Mức {tmpl.defaultLevel} · +{money(tmpl.surcharge)}
                        </span>
                        <span className="mt-0.5 text-[10px] text-brand-text-muted line-clamp-1">
                          {tmpl.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hoặc tự nhập tên mẫu */}
              <div>
                <label className="block text-caption font-bold text-brand-text-muted mb-1">
                  Hoặc tên mẫu vẽ tùy chỉnh theo yêu cầu khách:
                </label>
                <input
                  type="text"
                  value={customizerForm.designName}
                  onChange={(e) => setCustomizerForm({ ...customizerForm, designName: e.target.value })}
                  placeholder="Ví dụ: Vẽ hoa cúc 3D ngón cái, Vẽ hoạt hình Stitch, Đính đá ombre..."
                  className="reception-input text-body"
                />
              </div>
            </div>

            {/* Khối 2: Độ khó và Phụ thu tiền vẽ */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-black text-brand-text">2. Phân loại độ khó & Phụ thu tiền công vẽ</h4>
              </div>

              <div>
                <span className="block text-caption font-bold text-brand-text-muted mb-1.5">
                  Mức độ khó của mẫu vẽ:
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ART_DIFFICULTY_PRESETS.map((preset) => {
                    const isSelected = customizerForm.designLevel === preset.level;
                    return (
                      <button
                        key={preset.level}
                        type="button"
                        onClick={() => handleSelectDifficultyInCustomizer(preset)}
                        className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/40 text-brand-text'
                            : 'border-brand-outline bg-brand-surface text-brand-text-muted hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-brand-text">{preset.label}</span>
                          {isSelected && <Check className="h-3 w-3 text-amber-600" />}
                        </div>
                        <span className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          {preset.surcharge > 0 ? `+${money(preset.surcharge)}` : '0đ (Không phụ thu)'}
                        </span>
                        <span className="mt-0.5 text-[10px] text-brand-text-muted">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhập số tiền phụ thu vẽ art */}
              <div className="rounded-xl bg-brand-surface p-3 border border-brand-outline">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-black text-brand-text">Tiền phụ thu vẽ Art (VNĐ)</span>
                    <span className="text-caption text-brand-text-muted">
                      Hiển thị: <strong className="text-amber-600 dark:text-amber-400 font-bold">{money(parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0)}</strong>
                    </span>
                  </div>
                  <div className="w-40">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customizerForm.designSurcharge}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setCustomizerForm({ ...customizerForm, designSurcharge: val });
                      }}
                      placeholder="0"
                      className="reception-input text-right text-body font-black text-amber-600 dark:text-amber-400"
                    />
                  </div>
                </div>

                {/* Quick add surcharge pills */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-brand-text-muted">Chọn nhanh:</span>
                  {[0, 30000, 50000, 80000, 100000, 150000, 200000, 350000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomizerForm({ ...customizerForm, designSurcharge: String(val) })}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                        String(customizerForm.designSurcharge) === String(val)
                          ? 'bg-amber-600 text-white'
                          : 'bg-brand-surface-high border border-brand-outline text-brand-text hover:border-amber-500'
                      }`}
                    >
                      {val === 0 ? '0đ' : `+${val / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Khối 3: Màu sơn & Sản phẩm/Phụ kiện đi kèm */}
            <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-secondary" />
                <h4 className="text-xs font-black text-brand-text">3. Màu sơn & Sản phẩm chăm sóc đi kèm</h4>
              </div>

              {/* Bảng màu sơn */}
              <div>
                <span className="block text-caption font-bold text-brand-text-muted mb-1.5">
                  Màu sơn móng đi kèm: {customizerForm.attachedColorName ? <strong className="text-brand-text font-black">{customizerForm.attachedColorName} ({customizerForm.attachedColorCode})</strong> : <span className="italic">Chưa chọn</span>}
                </span>
                <div className="flex flex-wrap gap-2">
                  {polishColorOptions.map((c) => {
                    const isSelected = customizerForm.attachedColorCode === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCustomizerForm({ ...customizerForm, attachedColorCode: '', attachedColorName: '', attachedColorHex: '' });
                          } else {
                            setCustomizerForm({ ...customizerForm, attachedColorCode: c.code, attachedColorName: c.name, attachedColorHex: c.hex });
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-caption font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-secondary bg-brand-secondary/15 ring-2 ring-brand-secondary/30 text-brand-text font-black'
                            : 'border-brand-outline bg-brand-surface-high/60 text-brand-text-muted hover:text-brand-text'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.code} - {c.name}</span>
                        {isSelected && <Check className="h-3 w-3 text-brand-secondary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sản phẩm / Phụ kiện đính kèm */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-brand-outline/60">
                <div>
                  <label className="block text-caption font-bold text-brand-text-muted mb-1">
                    Sản phẩm phụ kiện / đính đá kèm theo:
                  </label>
                  <select
                    value={customizerForm.attachedProductName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const found = ATTACHED_ACCESSORY_OPTIONS.find(opt => opt.name === selectedName);
                      if (found) {
                        setCustomizerForm({
                          ...customizerForm,
                          attachedProductName: found.name,
                          attachedProductPrice: found.price,
                        });
                      } else {
                        setCustomizerForm({
                          ...customizerForm,
                          attachedProductName: '',
                          attachedProductPrice: 0,
                        });
                      }
                    }}
                    className="reception-input text-body"
                  >
                    <option value="">-- Không kèm sản phẩm phụ kiện --</option>
                    {ATTACHED_ACCESSORY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name} {opt.price > 0 ? `(+${money(opt.price)})` : '(Miễn phí)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-caption font-bold text-brand-text-muted mb-1">
                    Kỹ thuật viên thực hiện dịch vụ này:
                  </label>
                  <select
                    value={customizerForm.staff}
                    onChange={(e) => setCustomizerForm({ ...customizerForm, staff: e.target.value })}
                    className="reception-input text-body font-bold"
                  >
                    {invoiceStaff.map((staff) => (
                      <option key={staff} value={staff}>{staff}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú vẽ riêng */}
              <div>
                <label className="block text-caption font-bold text-brand-text-muted mb-1">
                  Ghi chú chi tiết cho thợ vẽ (ngón nào, yêu cầu đặc biệt...):
                </label>
                <input
                  type="text"
                  value={customizerForm.customArtNote}
                  onChange={(e) => setCustomizerForm({ ...customizerForm, customArtNote: e.target.value })}
                  placeholder="Ví dụ: Vẽ ngón trỏ và áp út 2 tay, màu nền nude nhạt..."
                  className="reception-input text-body"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Hộp thoại xác nhận hoặc hủy chỉnh sửa trước khi hoàn tất thu tiền */}
      {showPaymentConfirm && paymentAppointment && (
        <Modal
          open
          size="medium"
          icon={<ShieldCheck />}
          title="Xác nhận thanh toán hóa đơn"
          description="Vui lòng kiểm tra lại thông tin thu tiền và chi phí trước khi lưu giao dịch."
          onClose={() => setShowPaymentConfirm(false)}
          footer={
            <div className="flex w-full flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setShowPaymentConfirm(false)}
                className="w-full sm:w-auto"
              >
                Hủy / Quay lại chỉnh sửa
              </Button>
              <Button
                variant="primary"
                onClick={executeFinalPayment}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/25 cursor-pointer"
                iconLeading={<ShieldCheck className="h-4 w-4" />}
              >
                Xác nhận & Hoàn tất {money(invoiceTotal)}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-outline/60 pb-3">
                <div className="min-w-0">
                  <p className="text-body font-black text-brand-text truncate">{paymentAppointment.customer}</p>
                  <p className="text-caption text-brand-text-muted">{paymentAppointment.phone} · {branchName}</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {methodMeta[paymentForm.method].label}
                  </span>
                  {paymentForm.reference && (
                    <p className="text-caption font-mono text-brand-text-muted truncate">Mã GD: {paymentForm.reference}</p>
                  )}
                </div>
              </div>

              {/* Danh sách các dịch vụ & mẫu vẽ đi kèm trong hóa đơn */}
              <div className="mt-3 divide-y divide-brand-outline/40 max-h-48 overflow-y-auto pr-1">
                {invoiceLines.map((line, idx) => (
                  <div key={line.id} className="py-2 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-brand-text">{idx + 1}. {line.name}</span>
                        <span className="text-brand-text-muted font-bold">x{line.quantity}</span>
                      </div>
                      {line.designName && (
                        <p className="text-caption text-amber-700 dark:text-amber-300 font-semibold">
                          🎨 {line.designName} {line.difficultyLabel ? `(${line.difficultyLabel})` : ''} {line.designSurcharge ? `(+${money(line.designSurcharge)})` : ''}
                        </p>
                      )}
                      {line.attachedProductName && (
                        <p className="text-caption text-brand-text-muted">
                          💎 {line.attachedProductName}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-brand-text shrink-0">
                      {money(line.quantity * line.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-2 text-body border-t border-brand-outline/60 pt-3">
                <div className="flex justify-between text-brand-text-muted">
                  <span>Tổng tiền dịch vụ & sản phẩm ({invoiceLines.length} dòng / {invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục)</span>
                  <span className="font-bold text-brand-text">{money(invoiceSubtotal)}</span>
                </div>
                {paymentAppointment.deposit > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Đã trừ tiền đặt cọc trước</span>
                    <span className="font-bold">- {money(paymentAppointment.deposit)}</span>
                  </div>
                )}
                {invoiceDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Ưu đãi / Giảm giá</span>
                    <span className="font-bold">- {money(invoiceDiscount)}</span>
                  </div>
                )}
                {invoiceTip > 0 && (
                  <div className="flex justify-between text-brand-secondary">
                    <span>Tip kỹ thuật viên</span>
                    <span className="font-bold">+ {money(invoiceTip)}</span>
                  </div>
                )}
                {invoiceTaxAndFees > 0 && (
                  <div className="flex justify-between text-brand-tertiary">
                    <span>Thuế / Phụ phí</span>
                    <span className="font-bold">+ {money(invoiceTaxAndFees)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div>
                  <p className="text-caption font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Tổng thực thu tại quầy</p>
                  <p className="text-caption text-brand-text-muted">Thu ngân: {account.displayName}</p>
                </div>
                <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {money(invoiceTotal)}
                </strong>
              </div>

              {paymentForm.note && (
                <div className="mt-3 rounded-lg bg-brand-surface p-2.5 text-caption text-brand-text-muted border border-brand-outline/60">
                  <span className="font-bold text-brand-text">Ghi chú:</span> {paymentForm.note}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {editingTechnician && <Modal
        open
        size="medium"
        icon={<UserCheck />}
        headerAside={<StatusBadge status={editingTechnician.status} label={technicianStatusMeta[editingTechnician.status].label} size="small" />}
        title={`Cập nhật ${editingTechnician.name}`}
        description="Chỉnh trạng thái hôm nay, ca làm, giờ đi làm, giờ nghỉ và ghi chú nghỉ nếu có."
        onClose={() => { setEditingTechnician(null); setFormError(''); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditingTechnician(null); setFormError(''); }}>Hủy</Button>
            <Button type="submit" form="reception-technician-edit" variant="primary" iconLeading={<Check />}>Lưu cập nhật</Button>
          </>
        }
      >
        <form id="reception-technician-edit" onSubmit={submitTechnicianEdit} noValidate className="space-y-4">
          {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-card bg-brand-secondary/15 text-body font-black text-brand-secondary">{editingTechnician.initials}</span>
              <div>
                <p className="text-sm font-black text-brand-text">{editingTechnician.name}</p>
                <p className="mt-1 text-body font-bold text-brand-text-muted">{editingTechnician.specialty} · {editingTechnician.branch}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Trạng thái hôm nay</span>
              <select value={technicianEditForm.status} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, status: event.target.value as TechnicianStatus }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
                {Object.entries(technicianStatusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Ca làm việc</span>
              <select value={technicianEditForm.shift} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, shift: event.target.value as TechnicianShift }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
                {Object.entries(technicianShiftMeta).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Giờ đi làm / check-in</span>
              <input type="time" value={technicianEditForm.checkIn} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, checkIn: event.target.value }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10" />
            </label>
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Giờ nghỉ / check-out</span>
              <input type="time" value={technicianEditForm.checkOut} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, checkOut: event.target.value }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10" />
            </label>
          </div>

          <Field label="Ghi chú nghỉ / đi trễ / bàn giao ca" helper="Không bắt buộc.">
            <textarea value={technicianEditForm.leaveNote} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, leaveNote: event.target.value }))} placeholder="Ví dụ: báo nghỉ ốm lúc 07:10, nghỉ phép đã duyệt, vào trễ do kẹt xe..." className="min-h-24 resize-y py-3" />
          </Field>
        </form>
      </Modal>}

      {shiftModal && (
        <Modal
          open
          size="medium"
          icon={<WalletCards />}
          title={shiftModal === 'OPEN' ? 'Mở ca lễ tân' : 'Đối soát & chốt ca'}
          description={shiftModal === 'OPEN' ? 'Ghi nhận quỹ tiền mặt trước khi bắt đầu vận hành.' : 'Kiểm tra khách đang phục vụ, doanh thu tiền mặt và số quỹ thực tế.'}
          onClose={() => { setShiftModal(null); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShiftModal(null); setFormError(''); }}>Hủy</Button>
              <Button
                type="submit"
                form="reception-shift"
                variant="primary"
                disabled={shiftModal === 'CLOSE' && activeAppointments.length > 0}
              >
                {shiftModal === 'OPEN' ? 'Xác nhận mở ca' : 'Xác nhận chốt ca'}
              </Button>
            </>
          }
        >
          <form id="reception-shift" onSubmit={submitShift} noValidate className="space-y-4">
            {shiftModal === 'CLOSE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-brand-surface-high/60 p-3">
                    <p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">Quỹ đầu ca</p>
                    <p className="mt-2 text-sm font-black text-brand-text">{money(shift.openingCash)}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-secondary/10 p-3 ring-1 ring-brand-secondary/18">
                    <p className="text-caption font-black uppercase tracking-wide text-brand-secondary">Thu tiền mặt</p>
                    <p className="mt-2 text-sm font-black text-brand-secondary">+ {money(cashCollectedToday)}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-2xl bg-brand-text p-4 text-white">
                    <span className="text-body font-bold text-brand-text-muted">Quỹ hệ thống dự kiến</span>
                    <strong className="text-lg font-black">{money(expectedClosingCash)}</strong>
                  </div>
                </div>
                {activeAppointments.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-brand-error bg-brand-error/10 p-3 text-body font-bold leading-5 text-brand-error">
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
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-body font-black ${closingCashDifference === 0 ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-brand-tertiary/10 text-brand-tertiary'}`}>
                <span>Chênh lệch quỹ</span>
                <strong>{closingCashDifference === 0 ? 'Khớp hệ thống' : `${closingCashDifference > 0 ? 'Thừa' : 'Thiếu'} ${money(Math.abs(closingCashDifference))}`}</strong>
              </div>
            )}
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
}

