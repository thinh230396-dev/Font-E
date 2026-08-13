import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  Lock,
  MapPin,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  RefreshCcw,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import Modal from './Modal';
import BeautifulSelect from './BeautifulSelect';
import { getTenantAdminInitialData } from '../utils/mockDataReset';

export type BranchCode = 'Q1' | 'Q3';

export type OnlineBookingStatus =
  | 'PENDING'
  | 'NEEDS_ADJUSTMENT'
  | 'CONFIRMED'
  | 'DEPOSITED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface DepositHistoryLog {
  id: string;
  timestamp: string;
  staffName?: string;
  action: 'CREATE' | 'VERIFY_REQUEST' | 'CONFIRM' | 'ADJUST' | 'REFUND';
  actionLabel: string;
  amount: number;
  method?: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH';
  note?: string;
  transactionId?: string;
}

export interface MobileAppBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  branch: BranchCode;
  date: string;
  time: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  
  nailDesignName?: string;
  nailDesignExtraFee: number;
  nailColor?: string;
  
  totalEstimatedPrice: number;
  
  depositAmount: number;
  depositStatus: 'PAID' | 'UNPAID' | 'PENDING_VERIFICATION';
  depositMethod?: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH';
  depositTransactionId?: string;
  depositPaidAt?: string;
  depositHistory?: DepositHistoryLog[];
  
  requestedTechnicianId?: string;
  requestedTechnicianName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedStation?: string;
  
  source: 'Customer Mobile App';
  status: OnlineBookingStatus;
  
  customerNotes?: string;
  receptionistNotes?: string;
  rejectionReason?: string;
  proposedTime?: string;
  proposedDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianAvailability {
  id: string;
  name: string;
  branch: BranchCode;
  specialty: string;
  status: 'WORKING' | 'BUSY' | 'OFF';
  busySlots: string[];
  offReason?: string;
}

type BookingActionConfirmation = 'CONFIRM' | 'PROPOSE_TIME' | 'CANCEL';

interface TenantAdminOnlineBookingProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
}

const bookingStatusMeta: Record<
  OnlineBookingStatus,
  { label: string; badge: string; dot: string; color: string; desc: string }
> = {
  PENDING: {
    label: 'Chờ xác nhận',
    badge: 'bg-amber-50 text-amber-800 border border-amber-200/80 font-bold',
    dot: 'bg-amber-500',
    color: 'amber',
    desc: 'Mới gửi từ Mobile App, cần kiểm tra & xác nhận',
  },
  NEEDS_ADJUSTMENT: {
    label: 'Cần điều chỉnh',
    badge: 'bg-orange-50 text-orange-800 border border-orange-200/80 font-bold',
    dot: 'bg-orange-500',
    color: 'orange',
    desc: 'Đã đề xuất đổi giờ/KTV, chờ khách phản hồi',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    badge: 'bg-blue-50 text-blue-800 border border-blue-200/80 font-bold',
    dot: 'bg-blue-500',
    color: 'blue',
    desc: 'Đã duyệt giờ & KTV, lịch hẹn được giữ chỗ',
  },
  DEPOSITED: {
    label: 'Đã đặt cọc',
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold',
    dot: 'bg-emerald-500',
    color: 'emerald',
    desc: 'Đã cọc thành công qua Mobile App',
  },
  ARRIVED: {
    label: 'Khách đã đến',
    badge: 'bg-indigo-50 text-indigo-800 border border-indigo-200/80 font-bold',
    dot: 'bg-indigo-500',
    color: 'indigo',
    desc: 'Khách hàng đã có mặt tại chi nhánh',
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    badge: 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold',
    dot: 'bg-purple-500',
    color: 'purple',
    desc: 'Kỹ thuật viên đang phục vụ dịch vụ',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    badge: 'bg-teal-50 text-teal-800 border border-teal-200/80 font-bold',
    dot: 'bg-teal-500',
    color: 'teal',
    desc: 'Dịch vụ hoàn tất, đã thanh toán đủ',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badge: 'bg-rose-50 text-rose-800 border border-rose-200/80 font-bold',
    dot: 'bg-rose-500',
    color: 'rose',
    desc: 'Lịch hẹn đã bị từ chối hoặc khách hủy',
  },
  NO_SHOW: {
    label: 'Khách không đến',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200/80 font-bold',
    dot: 'bg-slate-400',
    color: 'slate',
    desc: 'Khách không có mặt đúng giờ hẹn',
  },
};

const TODAY_DATE = '11/08/2026';
const TOMORROW_DATE = '12/08/2026';

const initialMobileBookingsSeed: MobileAppBooking[] = [
  {
    id: 'BK-260729-089',
    customerName: 'Trần Bích Ngọc',
    customerPhone: '0909 521 889',
    branch: 'Q1',
    date: '11/08/2026',
    time: '14:30',
    serviceId: 'SVC-001',
    serviceName: 'Nail Art Premium & Đắp Gel',
    servicePrice: 950000,
    serviceDuration: 120,
    nailDesignName: 'Mẫu Ombre Hàn Quốc Mắt Mèo',
    nailDesignExtraFee: 250000,
    nailColor: 'Hồng Nude Thạch',
    totalEstimatedPrice: 1200000,
    depositAmount: 300000,
    depositStatus: 'PENDING_VERIFICATION',
    depositMethod: 'MOMO',
    depositTransactionId: 'MM-551029',
    depositPaidAt: '11/08/2026 · 12:30',
    requestedTechnicianId: 'TECH-02',
    requestedTechnicianName: 'Trần Thu Trang',
    assignedTechnicianId: 'TECH-02',
    assignedTechnicianName: 'Trần Thu Trang',
    source: 'Customer Mobile App',
    status: 'PENDING',
    customerNotes: 'Khách thông báo đã chuyển cọc 300k qua MoMo lúc 12:30, nhờ salon đối soát giúp.',
    createdAt: '11/08/2026 · 12:30',
    updatedAt: '11/08/2026 · 12:30',
    depositHistory: [
      {
        id: 'LOG-SEED-089',
        timestamp: '11/08/2026 · 12:30',
        staffName: 'Khách hàng (Mobile App)',
        action: 'VERIFY_REQUEST',
        actionLabel: 'Khách báo đã chuyển cọc',
        amount: 300000,
        method: 'MOMO',
        transactionId: 'MM-551029',
        note: 'Gửi thông báo chuyển khoản thành công 300.000đ qua ví MoMo',
      },
    ],
  },
  {
    id: 'BK-260729-088',
    customerName: 'Nguyễn Minh Anh',
    customerPhone: '0903 812 682',
    branch: 'Q3',
    date: '11/08/2026',
    time: '10:30',
    serviceId: 'SVC-001',
    serviceName: 'Nail Art Premium',
    servicePrice: 950000,
    serviceDuration: 120,
    nailDesignName: 'Mẫu Ombre Mắt Mèo Charm Nơ',
    nailDesignExtraFee: 150000,
    nailColor: 'Sơn Gel Thạch Hồng Nude',
    totalEstimatedPrice: 1100000,
    depositAmount: 300000,
    depositStatus: 'PAID',
    depositMethod: 'MOMO',
    depositTransactionId: 'MM-921820',
    depositPaidAt: '11/08/2026 · 08:15',
    requestedTechnicianId: 'TECH-01',
    requestedTechnicianName: 'Nguyễn Thị Hoa',
    assignedTechnicianId: 'TECH-01',
    assignedTechnicianName: 'Nguyễn Thị Hoa',
    assignedStation: 'Ghế Nail Spa #02',
    source: 'Customer Mobile App',
    status: 'DEPOSITED',
    customerNotes: 'Khách muốn tư vấn màu hợp tông da ngăm và xin đến sớm 10 phút.',
    createdAt: '11/08/2026 · 08:15',
    updatedAt: '11/08/2026 · 08:20',
    depositHistory: [
      {
        id: 'LOG-SEED-088',
        timestamp: '11/08/2026 · 08:20',
        staffName: 'Lễ tân Nguyễn Thị Hoa',
        action: 'CONFIRM',
        actionLabel: 'Xác nhận đã nhận cọc',
        amount: 300000,
        method: 'MOMO',
        transactionId: 'MM-921820',
        note: 'Đã nhận đủ tiền cọc 300.000đ qua MoMo QR',
      },
    ],
  },
  {
    id: 'BK-260729-087',
    customerName: 'Trần Thu Hà',
    customerPhone: '0986 422 190',
    branch: 'Q1',
    date: '11/08/2026',
    time: '11:00',
    serviceId: 'SVC-003',
    serviceName: 'Pedicure Spa Chuyên Sâu',
    servicePrice: 650000,
    serviceDuration: 90,
    nailDesignName: 'Vẽ Hoa Bỉ Ngạn Tinh Tế',
    nailDesignExtraFee: 80000,
    nailColor: 'Đỏ Rượu Dâu',
    totalEstimatedPrice: 730000,
    depositAmount: 150000,
    depositStatus: 'PAID',
    depositMethod: 'VNPAY',
    depositTransactionId: 'VN-302911',
    depositPaidAt: '11/08/2026 · 08:40',
    requestedTechnicianId: 'TECH-04',
    requestedTechnicianName: 'Vũ Kim Anh',
    assignedTechnicianId: 'TECH-04',
    assignedTechnicianName: 'Vũ Kim Anh',
    assignedStation: 'Ghế Foot Spa #01',
    source: 'Customer Mobile App',
    status: 'CONFIRMED',
    customerNotes: 'Móng chân nhạy cảm, nhờ KTV nhặt da nhẹ nhàng.',
    createdAt: '11/08/2026 · 08:40',
    updatedAt: '11/08/2026 · 08:45',
  },
  {
    id: 'BK-260729-086',
    customerName: 'Lê Ngọc Mai',
    customerPhone: '0918 630 447',
    branch: 'Q3',
    date: '11/08/2026',
    time: '13:30',
    serviceId: 'SVC-004',
    serviceName: 'Đắp Gel Nối Móng',
    servicePrice: 890000,
    serviceDuration: 150,
    nailDesignName: 'Mẫu Hàn Quốc French Tráng Gương',
    nailDesignExtraFee: 200000,
    nailColor: 'Trắng Sữa Chrome Gold',
    totalEstimatedPrice: 1090000,
    depositAmount: 0,
    depositStatus: 'UNPAID',
    requestedTechnicianId: 'TECH-03',
    requestedTechnicianName: 'Lê Hoàng Mai',
    assignedTechnicianId: 'TECH-03',
    assignedTechnicianName: 'Lê Hoàng Mai',
    source: 'Customer Mobile App',
    status: 'PENDING',
    customerNotes: 'Đặt lịch chuẩn bị đi đám cưới, cần xong trước 16:30.',
    createdAt: '11/08/2026 · 09:10',
    updatedAt: '11/08/2026 · 09:10',
  },
  {
    id: 'BK-260729-085',
    customerName: 'Vũ Khánh Linh',
    customerPhone: '0932 155 860',
    branch: 'Q3',
    date: '12/08/2026',
    time: '15:00',
    serviceId: 'SVC-005',
    serviceName: 'Acrylic Full Set',
    servicePrice: 1350000,
    serviceDuration: 150,
    nailDesignName: 'Đính Đá Swarovski Sang Trọng',
    nailDesignExtraFee: 350000,
    nailColor: 'Nude Kim Tuyến Gold',
    totalEstimatedPrice: 1700000,
    depositAmount: 500000,
    depositStatus: 'PAID',
    depositMethod: 'BANK_TRANSFER',
    depositTransactionId: 'MB-881920',
    depositPaidAt: '12/08/2026 · 09:30',
    requestedTechnicianId: 'TECH-05',
    requestedTechnicianName: 'Phạm Yến Nhi',
    assignedTechnicianId: 'TECH-05',
    assignedTechnicianName: 'Phạm Yến Nhi',
    source: 'Customer Mobile App',
    status: 'NEEDS_ADJUSTMENT',
    proposedTime: '15:30',
    proposedDate: '12/08/2026',
    customerNotes: 'Khách đính đá full 10 ngón.',
    receptionistNotes: 'KTV bận ca trước đến 15:15, đã đề xuất lùi lại 30 phút.',
    createdAt: '12/08/2026 · 09:30',
    updatedAt: '12/08/2026 · 10:00',
  },
  {
    id: 'BK-260729-084',
    customerName: 'Phạm Gia Hân',
    customerPhone: '0908 731 266',
    branch: 'Q1',
    date: '12/08/2026',
    time: '09:30',
    serviceId: 'SVC-002',
    serviceName: 'Combo Manicure & Sơn Gel',
    servicePrice: 450000,
    serviceDuration: 75,
    nailDesignName: 'Không chọn mẫu',
    nailDesignExtraFee: 0,
    nailColor: 'Hồng Baby Nude',
    totalEstimatedPrice: 450000,
    depositAmount: 100000,
    depositStatus: 'PAID',
    depositMethod: 'MOMO',
    depositTransactionId: 'MM-772101',
    depositPaidAt: '11/08/2026 · 20:10',
    requestedTechnicianId: 'TECH-02',
    requestedTechnicianName: 'Trần Thu Trang',
    assignedTechnicianId: 'TECH-02',
    assignedTechnicianName: 'Trần Thu Trang',
    assignedStation: 'Bàn Nail #01',
    source: 'Customer Mobile App',
    status: 'ARRIVED',
    customerNotes: 'Khách đến đúng giờ.',
    createdAt: '11/08/2026 · 20:10',
    updatedAt: '12/08/2026 · 09:25',
  },
  {
    id: 'BK-260729-083',
    customerName: 'Hoàng Yến Nhi',
    customerPhone: '0977 123 456',
    branch: 'Q1',
    date: '12/08/2026',
    time: '14:00',
    serviceId: 'SVC-001',
    serviceName: 'Nail Art Premium',
    servicePrice: 950000,
    serviceDuration: 120,
    nailDesignName: 'Hoa Nổi 3D Gel Polymer',
    nailDesignExtraFee: 250000,
    nailColor: 'Tím Pastel OPI',
    totalEstimatedPrice: 1200000,
    depositAmount: 300000,
    depositStatus: 'PAID',
    depositMethod: 'VNPAY',
    depositTransactionId: 'VN-110293',
    depositPaidAt: '11/08/2026 · 18:30',
    requestedTechnicianId: 'ANY',
    requestedTechnicianName: 'Bất kỳ / Tự động gán',
    assignedTechnicianId: 'TECH-02',
    assignedTechnicianName: 'Trần Thu Trang',
    assignedStation: 'Bàn Nail #03',
    source: 'Customer Mobile App',
    status: 'IN_PROGRESS',
    createdAt: '11/08/2026 · 18:30',
    updatedAt: '12/08/2026 · 14:05',
  },
  {
    id: 'BK-260729-082',
    customerName: 'Đỗ Thanh Vân',
    customerPhone: '0912 345 678',
    branch: 'Q3',
    date: '13/08/2026',
    time: '09:00',
    serviceId: 'SVC-003',
    serviceName: 'Pedicure Spa Chuyên Sâu',
    servicePrice: 650000,
    serviceDuration: 90,
    nailDesignName: 'Không chọn mẫu',
    nailDesignExtraFee: 0,
    nailColor: 'Sơn Gel Nude Đất',
    totalEstimatedPrice: 650000,
    depositAmount: 150000,
    depositStatus: 'PAID',
    depositMethod: 'MOMO',
    depositTransactionId: 'MM-882109',
    depositPaidAt: '12/08/2026 · 15:40',
    assignedTechnicianId: 'TECH-06',
    assignedTechnicianName: 'Ngô Thùy Dương',
    assignedStation: 'Ghế Foot Spa #02',
    source: 'Customer Mobile App',
    status: 'COMPLETED',
    createdAt: '12/08/2026 · 15:40',
    updatedAt: '13/08/2026 · 10:30',
  },
  {
    id: 'BK-260729-081',
    customerName: 'Nguyễn Bích Trâm',
    customerPhone: '0938 990 112',
    branch: 'Q1',
    date: '13/08/2026',
    time: '16:30',
    serviceId: 'SVC-002',
    serviceName: 'Combo Manicure & Sơn Gel',
    servicePrice: 450000,
    serviceDuration: 75,
    nailDesignName: 'Không chọn mẫu',
    nailDesignExtraFee: 0,
    totalEstimatedPrice: 450000,
    depositAmount: 0,
    depositStatus: 'UNPAID',
    source: 'Customer Mobile App',
    status: 'CANCELLED',
    rejectionReason: 'Khách bận đột xuất nên tự hủy hẹn trên Customer Mobile App.',
    createdAt: '12/08/2026 · 11:20',
    updatedAt: '12/08/2026 · 16:00',
  },
];

const initialTechniciansSeed: TechnicianAvailability[] = [
  {
    id: 'TECH-01',
    name: 'Nguyễn Thị Hoa',
    branch: 'Q3',
    specialty: 'Nail Art & Mắt mèo',
    status: 'WORKING',
    busySlots: ['10:30-12:30'],
  },
  {
    id: 'TECH-02',
    name: 'Trần Thu Trang',
    branch: 'Q1',
    specialty: 'Combo Manicure & Gel',
    status: 'WORKING',
    busySlots: ['09:30-10:45', '14:00-16:00'],
  },
  {
    id: 'TECH-03',
    name: 'Lê Hoàng Mai',
    branch: 'Q3',
    specialty: 'Đắp Gel & Nối móng',
    status: 'OFF',
    busySlots: [],
    offReason: 'Nghỉ phép cá nhân',
  },
  {
    id: 'TECH-04',
    name: 'Vũ Kim Anh',
    branch: 'Q1',
    specialty: 'Pedicure Spa & Art',
    status: 'WORKING',
    busySlots: ['11:00-12:30'],
  },
  {
    id: 'TECH-05',
    name: 'Phạm Yến Nhi',
    branch: 'Q3',
    specialty: 'Acrylic Full Set',
    status: 'WORKING',
    busySlots: ['15:00-17:30'],
  },
  {
    id: 'TECH-06',
    name: 'Ngô Thùy Dương',
    branch: 'Q3',
    specialty: 'Pedicure & Sơn gel',
    status: 'WORKING',
    busySlots: ['09:00-10:30'],
  },
  {
    id: 'TECH-07',
    name: 'Đặng Phương Thảo',
    branch: 'Q1',
    specialty: 'Đắp bột & Nail Art',
    status: 'WORKING',
    busySlots: [],
  },
  {
    id: 'TECH-08',
    name: 'Bùi Thanh Hằng',
    branch: 'Q3',
    specialty: 'Combo Manicure & Sơn gel',
    status: 'WORKING',
    busySlots: ['13:00-14:30'],
  },
];

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const depositMethodLabel = (method?: string) => {
  if (!method) return 'MoMo';
  switch (method) {
    case 'MOMO':
      return 'MoMo';
    case 'VNPAY':
      return 'VNPay';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'CASH':
      return 'Tiền mặt';
    default:
      return method;
  }
};
const branchName = (branch: BranchCode | 'ALL') =>
  branch === 'ALL'
    ? 'Tất cả chi nhánh'
    : branch === 'Q1'
    ? 'Chi nhánh Quận 1'
    : 'Chi nhánh Quận 3';
const technicianHasTimeConflict = (technician: TechnicianAvailability, bookingTime: string) =>
  technician.busySlots.some((slot) => {
    const [start, end] = slot.split('-');
    return bookingTime >= start && bookingTime < end;
  });
const technicianIsAvailable = (technician: TechnicianAvailability, booking: MobileAppBooking) =>
  technician.status === 'WORKING'
  && technician.branch === booking.branch
  && !technicianHasTimeConflict(technician, booking.time);
const enforceDepositRule = (items: MobileAppBooking[]) =>
  items.map((booking) => {
    if (
      booking.depositStatus === 'UNPAID'
      && (booking.status === 'CONFIRMED' || booking.status === 'DEPOSITED')
    ) {
      return {
        ...booking,
        status: 'PENDING' as OnlineBookingStatus,
        updatedAt: 'Đang chờ khách thanh toán tiền cọc',
      };
    }
    return booking;
  });

export default function TenantAdminOnlineBooking({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Lumière Nail Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason,
  onNotify,
}: TenantAdminOnlineBookingProps) {
  const storageKey = `mobile-app-bookings-v2:${tenantName}`;

  const [bookings, setBookings] = useState<MobileAppBooking[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : initialMobileBookingsSeed;
      return enforceDepositRule(Array.isArray(parsed) ? parsed : initialMobileBookingsSeed);
    } catch {
      return initialMobileBookingsSeed;
    }
  });

  const [technicians] = useState<TechnicianAvailability[]>(initialTechniciansSeed);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [depositFilter, setDepositFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // View mode state (cards: Thẻ lịch hẹn, timeline: Theo giờ, compact: Danh sách)
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'compact'>('cards');

  // Selected Booking Modal state
  const [selectedBooking, setSelectedBooking] = useState<MobileAppBooking | null>(null);

  // Re-assign Tech choice inside modal
  const [chosenTechId, setChosenTechId] = useState<string>('');

  // Propose Time Sub-form inside modal
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeDate, setProposeDate] = useState('29/07/2026');
  const [proposeTime, setProposeTime] = useState('14:30');
  const [proposeNote, setProposeNote] = useState('');

  // Reject/Cancel Sub-form inside modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('KTV bận ca / không đủ thời gian');
  const [customCancelNote, setCustomCancelNote] = useState('');

  // Call simulation state
  const [callingBooking, setCallingBooking] = useState<MobileAppBooking | null>(null);
  const [callNote, setCallNote] = useState('');

  // Deposit Update & Audit History State
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositInputStatus, setDepositInputStatus] = useState<'UNPAID' | 'PENDING_VERIFICATION' | 'PAID'>('PAID');
  const [depositInputAmount, setDepositInputAmount] = useState<number>(300000);
  const [depositInputMethod, setDepositInputMethod] = useState<'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH'>('MOMO');
  const [depositInputPaidAt, setDepositInputPaidAt] = useState<string>('');
  const [depositInputNote, setDepositInputNote] = useState<string>('');
  const [depositInputTxId, setDepositInputTxId] = useState<string>('');

  // Double Check Confirmation Modal State
  const [confirmStepOpen, setConfirmStepOpen] = useState(false);

  // Deposit Adjustment / Refund Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'ADJUST' | 'REFUND'>('REFUND');
  const [adjustAmount, setAdjustAmount] = useState<number>(100000);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Helper to create immutable history log
  const createLog = (
    action: 'CREATE' | 'VERIFY_REQUEST' | 'CONFIRM' | 'ADJUST' | 'REFUND',
    actionLabel: string,
    amount: number,
    method?: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH',
    note?: string,
    transactionId?: string
  ): DepositHistoryLog => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${dd}/${mm}/${yyyy} · ${hh}:${min}`;

    return {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      staffName: roleLabel || 'Lễ tân Salon',
      action,
      actionLabel,
      amount,
      method,
      note,
      transactionId,
    };
  };

  const handleOpenDepositModal = () => {
    if (!requireManage() || !selectedBooking) return;

    const defaultAmount =
      selectedBooking.depositAmount > 0
        ? selectedBooking.depositAmount
        : Math.round((selectedBooking.totalEstimatedPrice * 0.3) / 10000) * 10000 || 300000;

    setDepositInputStatus(selectedBooking.depositStatus || 'PAID');
    setDepositInputAmount(defaultAmount);
    setDepositInputMethod(selectedBooking.depositMethod || 'MOMO');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const currentPaidAt = selectedBooking.depositPaidAt || `${dd}/${mm}/${yyyy} · ${hh}:${min}`;

    setDepositInputPaidAt(currentPaidAt);
    setDepositInputTxId(selectedBooking.depositTransactionId || `MM-${Math.floor(100000 + Math.random() * 900000)}`);
    setDepositInputNote('');
    setDepositModalOpen(true);
  };

  // Switch to Pending Verification state
  const handleMarkPendingVerification = () => {
    if (!requireManage() || !selectedBooking) return;

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const paidAtTime = `${dd}/${mm}/${yyyy} · ${hh}:${min}`;

    const defaultAmount =
      selectedBooking.depositAmount > 0
        ? selectedBooking.depositAmount
        : Math.round((selectedBooking.totalEstimatedPrice * 0.3) / 10000) * 10000 || 300000;

    const newLog = createLog(
      'VERIFY_REQUEST',
      'Chuyển sang Chờ xác minh',
      defaultAmount,
      selectedBooking.depositMethod || 'MOMO',
      'Khách báo đã chuyển khoản, chờ lễ tân đối soát',
      selectedBooking.depositTransactionId
    );

    const updatedBooking: MobileAppBooking = {
      ...selectedBooking,
      depositStatus: 'PENDING_VERIFICATION',
      depositAmount: defaultAmount,
      depositPaidAt: paidAtTime,
      depositHistory: [newLog, ...(selectedBooking.depositHistory || [])],
      updatedAt: paidAtTime,
    };

    setSelectedBooking(updatedBooking);
    setBookings((prev) =>
      prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item))
    );

    const msg = `Đã chuyển lịch #${updatedBooking.id} sang trạng thái "Chờ xác minh" tiền cọc.`;
    setNotice(msg);
    onNotify?.(msg);
  };

  // Open double-check verification modal
  const handleOpenConfirmStepModal = () => {
    if (!requireManage() || !selectedBooking) return;
    setConfirmStepOpen(true);
  };

  // Final Confirmation of Deposit
  const handleConfirmDepositFinal = () => {
    if (!selectedBooking) return;

    if (!canManage) {
      requireManage();
      return;
    }

    const amount = Number(depositInputAmount) || 0;
    const paidAtTime = depositInputPaidAt.trim() || `${TODAY_DATE} · 19:44`;
    const txId = depositInputTxId.trim() || `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    const newLog = createLog(
      'CONFIRM',
      'Xác nhận đã nhận cọc',
      amount,
      depositInputMethod,
      depositInputNote || 'Lễ tân đã đối soát tài khoản & xác nhận tiền cọc thành công',
      txId
    );

    const updatedBooking: MobileAppBooking = {
      ...selectedBooking,
      depositStatus: 'PAID',
      depositAmount: amount,
      depositMethod: depositInputMethod,
      depositPaidAt: paidAtTime,
      depositTransactionId: txId,
      status: selectedBooking.status === 'PENDING' ? 'DEPOSITED' : selectedBooking.status,
      depositHistory: [newLog, ...(selectedBooking.depositHistory || [])],
      updatedAt: paidAtTime,
    };

    setSelectedBooking(updatedBooking);
    setBookings((prev) =>
      prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item))
    );

    setConfirmStepOpen(false);
    setDepositModalOpen(false);
    setValidationError('');
    const successMsg = `Đã xác nhận tiền cọc ${money(amount)} (${depositMethodLabel(depositInputMethod)}) cho lịch #${updatedBooking.id}.`;
    setNotice(successMsg);
    onNotify?.(successMsg);
  };

  // Open adjustment / refund modal
  const handleOpenAdjustModal = () => {
    if (!requireManage() || !selectedBooking) return;
    setAdjustType('REFUND');
    setAdjustAmount(selectedBooking.depositAmount || 100000);
    setAdjustReason('');
    setAdjustModalOpen(true);
  };

  // Confirm adjustment / refund action
  const handleConfirmAdjustment = () => {
    if (!selectedBooking) return;

    if (!canManage) {
      requireManage();
      return;
    }

    if (!adjustReason.trim()) {
      setValidationError('Vui lòng nhập lý do điều chỉnh / hoàn cọc.');
      return;
    }

    const amountVal = Number(adjustAmount) || 0;
    let newDepositAmount = selectedBooking.depositAmount;
    let newDepositStatus: 'PAID' | 'UNPAID' | 'PENDING_VERIFICATION' = selectedBooking.depositStatus;
    let actionLabel = '';

    if (adjustType === 'REFUND') {
      newDepositAmount = Math.max(0, selectedBooking.depositAmount - amountVal);
      actionLabel = `Hoàn cọc ${money(amountVal)}`;
      if (newDepositAmount === 0) {
        newDepositStatus = 'UNPAID';
      }
    } else {
      newDepositAmount = amountVal;
      actionLabel = `Điều chỉnh cọc sang ${money(amountVal)}`;
      if (newDepositAmount === 0) {
        newDepositStatus = 'UNPAID';
      } else {
        newDepositStatus = 'PAID';
      }
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const paidAtTime = `${dd}/${mm}/${yyyy} · ${hh}:${min}`;

    const newLog = createLog(
      adjustType,
      actionLabel,
      adjustType === 'REFUND' ? -amountVal : amountVal,
      selectedBooking.depositMethod,
      adjustReason.trim(),
      selectedBooking.depositTransactionId
    );

    const updatedBooking: MobileAppBooking = {
      ...selectedBooking,
      depositStatus: newDepositStatus,
      depositAmount: newDepositAmount,
      depositHistory: [newLog, ...(selectedBooking.depositHistory || [])],
      updatedAt: paidAtTime,
    };

    setSelectedBooking(updatedBooking);
    setBookings((prev) =>
      prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item))
    );

    setAdjustModalOpen(false);
    setValidationError('');
    const successMsg = `Đã ghi nhận ${actionLabel.toLowerCase()} cho lịch #${updatedBooking.id}.`;
    setNotice(successMsg);
    onNotify?.(successMsg);
  };

  // Submit handler from Mini Modal
  const handleDepositModalSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBooking) return;

    if (depositInputStatus === 'PAID') {
      // If setting to PAID, open double check step!
      setConfirmStepOpen(true);
    } else if (depositInputStatus === 'PENDING_VERIFICATION') {
      handleMarkPendingVerification();
      setDepositModalOpen(false);
    } else {
      // Set to UNPAID
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const paidAtTime = `${dd}/${mm}/${yyyy} · ${hh}:${min}`;

      const newLog = createLog(
        'ADJUST',
        'Cập nhật sang Chưa cọc',
        0,
        depositInputMethod,
        depositInputNote || 'Lễ tân đã đặt lại trạng thái chưa cọc',
        depositInputTxId
      );

      const updatedBooking: MobileAppBooking = {
        ...selectedBooking,
        depositStatus: 'UNPAID',
        depositAmount: 0,
        depositHistory: [newLog, ...(selectedBooking.depositHistory || [])],
        updatedAt: paidAtTime,
      };

      setSelectedBooking(updatedBooking);
      setBookings((prev) =>
        prev.map((item) => (item.id === updatedBooking.id ? updatedBooking : item))
      );

      setDepositModalOpen(false);
      setNotice(`Đã chuyển lịch #${updatedBooking.id} sang Chưa cọc.`);
    }
  };

  // Config Modal
  const [configOpen, setConfigOpen] = useState(false);
  const [configSettings, setConfigSettings] = useState({
    autoConfirmEligible: true,
    depositRequirement: 'Mandatory',
    minAdvanceNoticeHours: '2',
    maxAdvanceNoticeDays: '30',
  });

  // UI Toast Notice & Validation error
  const [notice, setNotice] = useState('');
  const [validationError, setValidationError] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const [pendingAction, setPendingAction] = useState<BookingActionConfirmation | null>(null);

  const canManage = accessMode === 'full';

  // Save to localStorage when bookings update
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(bookings));
    } catch (err) {
      console.error('Failed to save bookings to localStorage', err);
    }
  }, [bookings, storageKey]);

  // Sync selected booking when editing technician choice
  useEffect(() => {
    if (selectedBooking) {
      const preferredTechId = selectedBooking.assignedTechnicianId || selectedBooking.requestedTechnicianId;
      const preferredTech = technicians.find((technician) => technician.id === preferredTechId);

      if (preferredTech && !technicianIsAvailable(preferredTech, selectedBooking)) {
        const fallbackTech = technicians.find((technician) => technicianIsAvailable(technician, selectedBooking));
        setChosenTechId(fallbackTech?.id || 'ANY');
        setAssignmentNotice(
          fallbackTech
            ? `${preferredTech.name} hiện không sẵn sàng. Hệ thống đã chọn ${fallbackTech.name} thay thế; bạn có thể đổi lại trước khi xác nhận.`
            : `${preferredTech.name} hiện không sẵn sàng. Lịch sẽ được xác nhận ở chế độ tự động phân bổ KTV.`
        );
      } else {
        setChosenTechId(preferredTechId || 'ANY');
        setAssignmentNotice('');
      }

      setValidationError('');
      setProposeOpen(false);
      setCancelOpen(false);
      setPendingAction(null);
    }
  }, [selectedBooking, technicians]);

  const requireManage = () => {
    if (canManage) return true;
    const msg = readOnlyReason || 'Quyền hạn hiện tại chỉ cho phép xem thông tin đặt lịch online.';
    setNotice(msg);
    onNotify?.(msg);
    return false;
  };

  // Filtered Bookings Logic
  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');

    return bookings.filter((item) => {
      // Branch filter
      if (selectedBranch !== 'ALL' && item.branch !== selectedBranch) return false;

      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Deposit filter
      if (depositFilter === 'PAID' && item.depositStatus !== 'PAID') return false;
      if (depositFilter === 'UNPAID' && item.depositStatus !== 'UNPAID') return false;

      // Service filter
      if (serviceFilter !== 'ALL' && item.serviceId !== serviceFilter) return false;

      // Tech filter
      if (techFilter !== 'ALL') {
        if (techFilter === 'ANY' && item.requestedTechnicianId && item.requestedTechnicianId !== 'ANY') return false;
        if (techFilter !== 'ANY' && item.requestedTechnicianId !== techFilter && item.assignedTechnicianId !== techFilter) return false;
      }

      // Date filter
      if (dateFilter === 'TODAY' && item.date !== TODAY_DATE) return false;
      if (dateFilter === 'TOMORROW' && item.date !== TOMORROW_DATE) return false;

      // Search Query
      if (query) {
        const fullStr = `${item.id} ${item.customerName} ${item.customerPhone} ${item.serviceName} ${item.nailDesignName || ''}`.toLocaleLowerCase('vi');
        if (!fullStr.includes(query)) return false;
      }

      return true;
    });
  }, [bookings, selectedBranch, statusFilter, depositFilter, serviceFilter, techFilter, dateFilter, searchQuery]);

  // Group filtered bookings by date for main view grouping
  const groupedByDate = useMemo(() => {
    const groups: Record<string, MobileAppBooking[]> = {};
    filteredBookings.forEach((b) => {
      const d = b.date || 'Khác';
      if (!groups[d]) groups[d] = [];
      groups[d].push(b);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === TODAY_DATE) return -1;
      if (b === TODAY_DATE) return 1;
      if (a === TOMORROW_DATE && b !== TODAY_DATE) return -1;
      if (b === TOMORROW_DATE && a !== TODAY_DATE) return 1;
      return a.localeCompare(b);
    });

    return sortedDates.map((dateStr) => {
      let headerLabel = dateStr;
      let isToday = false;
      let isTomorrow = false;

      if (dateStr === TODAY_DATE) {
        headerLabel = `HÔM NAY · ${dateStr}`;
        isToday = true;
      } else if (dateStr === TOMORROW_DATE) {
        headerLabel = `NGÀY MAI · ${dateStr}`;
        isTomorrow = true;
      }

      return {
        dateStr,
        headerLabel,
        isToday,
        isTomorrow,
        items: groups[dateStr],
      };
    });
  }, [filteredBookings]);

  // Group filtered bookings by time slot for timeline view
  const groupedByTime = useMemo(() => {
    const groups: Record<string, MobileAppBooking[]> = {};
    filteredBookings.forEach((b) => {
      const timeKey = b.time || 'Chưa xếp giờ';
      if (!groups[timeKey]) groups[timeKey] = [];
      groups[timeKey].push(b);
    });
    return Object.keys(groups)
      .sort()
      .map((timeKey) => ({
        time: timeKey,
        items: groups[timeKey],
      }));
  }, [filteredBookings]);

  // Stats calculation
  const stats = useMemo(() => {
    const scoped = bookings.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch);

    return {
      pending: scoped.filter((b) => b.status === 'PENDING').length,
      confirmed: scoped.filter((b) => b.status === 'CONFIRMED').length,
      deposited: scoped.filter((b) => b.status === 'DEPOSITED').length,
      needsAdjustment: scoped.filter((b) => b.status === 'NEEDS_ADJUSTMENT').length,
      cancelled: scoped.filter((b) => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length,
      todayCount: scoped.filter((b) => b.date === TODAY_DATE).length,
      depositedAmount: scoped
        .filter((b) => b.depositStatus === 'PAID')
        .reduce((sum, b) => sum + b.depositAmount, 0),
    };
  }, [bookings, selectedBranch]);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const scoped = bookings.filter((item) => {
      if (selectedBranch !== 'ALL' && item.branch !== selectedBranch) return false;
      if (dateFilter === 'TODAY' && item.date !== TODAY_DATE) return false;
      if (dateFilter === 'TOMORROW' && item.date !== TOMORROW_DATE) return false;
      if (techFilter !== 'ALL') {
        if (techFilter === 'ANY' && item.requestedTechnicianId && item.requestedTechnicianId !== 'ANY') return false;
        if (techFilter !== 'ANY' && item.requestedTechnicianId !== techFilter && item.assignedTechnicianId !== techFilter) return false;
      }
      return true;
    });

    return {
      ALL: scoped.length,
      PENDING: scoped.filter((b) => b.status === 'PENDING').length,
      NEEDS_ADJUSTMENT: scoped.filter((b) => b.status === 'NEEDS_ADJUSTMENT').length,
      CONFIRMED: scoped.filter((b) => b.status === 'CONFIRMED' || b.status === 'DEPOSITED').length,
      ARRIVED: scoped.filter((b) => b.status === 'ARRIVED').length,
      COMPLETED: scoped.filter((b) => b.status === 'COMPLETED').length,
    };
  }, [bookings, selectedBranch, dateFilter, techFilter]);

  // Helper to determine why a booking needs action/attention
  const getBookingActionNeededReasons = (item: MobileAppBooking) => {
    const reasons: { id: string; label: string; badgeClass: string; dotColor: string }[] = [];

    if (item.status === 'PENDING') {
      reasons.push({
        id: 'pending',
        label: 'Chờ xác nhận',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        dotColor: 'bg-amber-500',
      });
    }
    if (item.status === 'NEEDS_ADJUSTMENT') {
      reasons.push({
        id: 'adjustment',
        label: 'Cần đổi giờ',
        badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
        dotColor: 'bg-orange-500',
      });
    }
    if (item.depositStatus === 'PENDING_VERIFICATION' && item.status !== 'CANCELLED' && item.status !== 'COMPLETED') {
      reasons.push({
        id: 'pending_verification',
        label: 'Chờ xác minh cọc',
        badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
        dotColor: 'bg-amber-500',
      });
    } else if (item.depositStatus === 'UNPAID' && item.status !== 'CANCELLED' && item.status !== 'COMPLETED') {
      reasons.push({
        id: 'unpaid',
        label: 'Chưa cọc',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        dotColor: 'bg-rose-500',
      });
    }
    const isTechAssigned = Boolean(
      item.assignedTechnicianId ||
      (item.requestedTechnicianId && item.requestedTechnicianId !== 'ANY' && item.requestedTechnicianName && item.requestedTechnicianName !== 'Bất kỳ / Tự động gán')
    );
    if (!isTechAssigned && item.status !== 'CANCELLED' && item.status !== 'COMPLETED') {
      reasons.push({
        id: 'no_tech',
        label: 'Chưa gán KTV',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
        dotColor: 'bg-purple-500',
      });
    }

    return reasons;
  };

  // Filter bookings requiring immediate action
  const actionNeededBookings = useMemo(() => {
    return filteredBookings.filter((item) => getBookingActionNeededReasons(item).length > 0);
  }, [filteredBookings]);

  // Handle Technician Availability Check for selected booking
  const checkTechnicianAvailability = (techId: string, booking: MobileAppBooking) => {
    if (techId === 'ANY' || !techId) {
      return { ok: true, message: 'Tự động gán KTV rảnh khi khách đến' };
    }

    const tech = technicians.find((t) => t.id === techId);
    if (!tech) return { ok: true, message: 'KTV hợp lệ' };

    if (tech.status === 'OFF') {
      return {
        ok: false,
        message: `KTV ${tech.name} đang nghỉ làm (${tech.offReason || 'Nghỉ phép'})!`,
      };
    }

    // Check busy slots collision
    const bookingTime = booking.time;
    const hasConflict = technicianHasTimeConflict(tech, bookingTime);

    if (hasConflict) {
      return {
        ok: false,
        message: `KTV ${tech.name} đang bận ca phục vụ trùng giờ (${tech.busySlots.join(', ')})!`,
      };
    }

    return { ok: true, message: `KTV ${tech.name} sẵn sàng` };
  };

  // Seat / Station check
  const checkStationAvailability = (booking: MobileAppBooking) => {
    const branchActiveCount = bookings.filter(
      (b) =>
        b.branch === booking.branch &&
        b.date === booking.date &&
        b.time === booking.time &&
        (b.status === 'CONFIRMED' || b.status === 'DEPOSITED' || b.status === 'IN_PROGRESS')
    ).length;

    const maxStations = booking.branch === 'Q1' ? 6 : 8;
    if (branchActiveCount >= maxStations) {
      return {
        ok: false,
        message: `Chi nhánh ${booking.branch} đã đầy ${maxStations}/${maxStations} ghế vào khung giờ ${booking.time}!`,
      };
    }

    return {
      ok: true,
      message: `Còn ${maxStations - branchActiveCount} ghế làm trống`,
    };
  };

  // Action: Confirm Booking with strict validation
  const requestConfirmBooking = (booking: MobileAppBooking) => {
    if (!requireManage()) return;

    if (booking.depositStatus !== 'PAID') {
      setValidationError(
        `Lịch ${booking.id} chưa nhận được tiền cọc. Vui lòng chờ khách thanh toán trước khi xác nhận.`
      );
      return;
    }

    setValidationError('');
    setPendingAction('CONFIRM');
  };

  const handleConfirmBooking = (booking: MobileAppBooking) => {
    if (!requireManage()) return;

    if (booking.depositStatus !== 'PAID') {
      setPendingAction(null);
      setValidationError(
        `Lịch ${booking.id} chưa nhận được tiền cọc. Không thể xác nhận lịch khi tiền cọc chưa được thanh toán.`
      );
      return;
    }

    // Resolve an unavailable requested technician before confirming.
    let resolvedTechId = chosenTechId || 'ANY';
    const techCheck = checkTechnicianAvailability(resolvedTechId, booking);
    if (!techCheck.ok) {
      const fallbackTech = technicians.find((technician) => technicianIsAvailable(technician, booking));
      resolvedTechId = fallbackTech?.id || 'ANY';
      setChosenTechId(resolvedTechId);
    }

    // Validate Station
    const stationCheck = checkStationAvailability(booking);
    if (!stationCheck.ok) {
      setValidationError(stationCheck.message);
      return;
    }

    // Success confirmation
    const newStatus: OnlineBookingStatus = 'CONFIRMED';
    const assignedTechObj = technicians.find((t) => t.id === resolvedTechId);

    const updatedBooking: MobileAppBooking = {
      ...booking,
      status: newStatus,
      assignedTechnicianId: resolvedTechId === 'ANY' ? undefined : resolvedTechId,
      assignedTechnicianName: assignedTechObj ? assignedTechObj.name : 'Tự động phân bổ',
      assignedStation: booking.assignedStation || (booking.branch === 'Q1' ? 'Bàn Nail #02' : 'Ghế Spa #03'),
      updatedAt: `29/07/2026 · vừa xong`,
    };

    setBookings((prev) => prev.map((item) => (item.id === booking.id ? updatedBooking : item)));
    setSelectedBooking(null);
    setNotice(
      `Đã xác nhận lịch hẹn ${booking.id} cho ${booking.customerName}`
      + `${assignedTechObj ? ` và phân công ${assignedTechObj.name}` : ' ở chế độ tự động phân bổ KTV'}.`
    );
    setValidationError('');
    setAssignmentNotice('');
  };

  // Action: Propose Alternative Time
  const requestProposeTime = (e: FormEvent) => {
    e.preventDefault();
    if (!requireManage()) return;

    if (!proposeTime || !proposeDate) {
      setValidationError('Vui lòng chọn ngày và giờ đề xuất mới.');
      return;
    }

    setValidationError('');
    setPendingAction('PROPOSE_TIME');
  };

  const handleProposeTime = (booking: MobileAppBooking) => {
    const updatedBooking: MobileAppBooking = {
      ...booking,
      status: 'NEEDS_ADJUSTMENT',
      proposedDate: proposeDate,
      proposedTime: proposeTime,
      receptionistNotes: proposeNote || `Đề xuất đổi sang ${proposeTime} ngày ${proposeDate}.`,
      updatedAt: '29/07/2026 · vừa xong',
    };

    setBookings((prev) => prev.map((item) => (item.id === booking.id ? updatedBooking : item)));
    setSelectedBooking(updatedBooking);
    setProposeOpen(false);
    setNotice(`Đã gửi đề xuất giờ mới (${proposeTime} - ${proposeDate}) tới ứng dụng của ${booking.customerName}.`);
  };

  // Action: Cancel Booking
  const requestCancelBooking = (e: FormEvent) => {
    e.preventDefault();
    if (!requireManage()) return;

    setPendingAction('CANCEL');
  };

  const handleCancelBooking = (booking: MobileAppBooking) => {
    const fullReason = customCancelNote ? `${cancelReason}: ${customCancelNote}` : cancelReason;

    const updatedBooking: MobileAppBooking = {
      ...booking,
      status: 'CANCELLED',
      rejectionReason: fullReason,
      updatedAt: '29/07/2026 · vừa xong',
    };

    setBookings((prev) => prev.map((item) => (item.id === booking.id ? updatedBooking : item)));
    setSelectedBooking(updatedBooking);
    setCancelOpen(false);
    setNotice(`Đã từ chối/hủy lịch hẹn ${booking.id}. Lý do: ${fullReason}`);
  };

  const handleConfirmedAction = () => {
    if (!selectedBooking || !pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    if (action === 'CONFIRM') {
      handleConfirmBooking(selectedBooking);
      return;
    }
    if (action === 'PROPOSE_TIME') {
      handleProposeTime(selectedBooking);
      return;
    }
    handleCancelBooking(selectedBooking);
  };

  // Action: Quick Status Update
  const handleQuickStatusUpdate = (booking: MobileAppBooking, newStatus: OnlineBookingStatus) => {
    if (!requireManage()) return;

    const updatedBooking: MobileAppBooking = {
      ...booking,
      status: newStatus,
      updatedAt: '29/07/2026 · vừa xong',
    };

    setBookings((prev) => prev.map((item) => (item.id === booking.id ? updatedBooking : item)));
    if (selectedBooking?.id === booking.id) {
      setSelectedBooking(updatedBooking);
    }
    setNotice(`Đã chuyển lịch ${booking.id} sang trạng thái: ${bookingStatusMeta[newStatus].label}.`);
  };

  // Action: Call simulation completion
  const handleCompleteCall = () => {
    if (!callingBooking) return;
    if (callNote.trim()) {
      const updatedBooking: MobileAppBooking = {
        ...callingBooking,
        receptionistNotes: callNote.trim(),
        updatedAt: '29/07/2026 · vừa xong',
      };
      setBookings((prev) => prev.map((item) => (item.id === callingBooking.id ? updatedBooking : item)));
    }
    setNotice(`Đã kết thúc cuộc gọi với ${callingBooking.customerName}. Ghi chú cuộc gọi đã lưu.`);
    setCallingBooking(null);
    setCallNote('');
  };

  return (
    <div className="space-y-6">
      {/* Read-Only or Success Notification Banner */}
      {(notice || accessMode !== 'full') && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/90 p-4 text-violet-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-xs">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black">Trung tâm tiếp nhận đặt lịch Mobile App</p>
              <p className="mt-0.5 text-xs leading-5 text-violet-700">
                {notice || readOnlyReason || 'Bạn đang xem trang ở chế độ chỉ đọc.'}
              </p>
            </div>
          </div>
          {notice && (
            <button
              type="button"
              onClick={() => setNotice('')}
              className="flex h-8 w-8 items-center justify-center text-violet-400 hover:text-violet-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <section className="relative overflow-hidden rounded-3xl border border-pink-100/90 bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-pink-50/30 p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between relative z-10">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-pink-100/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-pink-700 border border-pink-200/80">
              <Smartphone className="h-3.5 w-3.5" />
              Customer Mobile App Receiver
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Quản lý Lịch hẹn Online
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm font-medium">
              Hệ thống điều phối lịch hẹn tự động từ Mobile App. Xử lý đặt chỗ, phân bổ kỹ thuật viên, theo dõi tiền cọc & duyệt lịch thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('https://app.salonsys.vn/customer-booking');
                setNotice('Đã sao chép đường dẫn kết nối Customer Mobile App.');
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-pink-200/80 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-pink-50/50 hover:border-pink-300 transition-all"
            >
              <Copy className="h-4 w-4 text-pink-500" />
              Link Mobile App
            </button>
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              disabled={!canManage}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 text-xs font-black text-white shadow-xs hover:bg-pink-700 transition-all"
            >
              <Settings2 className="h-4 w-4" />
              Quy tắc duyệt
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 1: 4 Summary Cards */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng lịch hôm nay */}
        <button
          type="button"
          onClick={() => setDateFilter(dateFilter === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`group flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 ${
            dateFilter === 'TODAY'
              ? 'border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/30 shadow-xs'
              : 'border-pink-100/90 bg-white hover:border-pink-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-pink-700">
              Tổng lịch hôm nay
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100/90 text-pink-600 shadow-2xs group-hover:scale-105 transition-transform">
              <CalendarCheck2 className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.todayCount}</p>
            <span className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
              29/07/2026
            </span>
          </div>
        </button>

        {/* Card 2: Chờ xác nhận */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`group flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-xs'
              : 'border-pink-100/90 bg-white hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
              Chờ xác nhận
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Clock3 className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.pending}</p>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80">
              Cần duyệt ngay
            </span>
          </div>
        </button>

        {/* Card 3: Cần xử lý */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'NEEDS_ADJUSTMENT' ? 'ALL' : 'NEEDS_ADJUSTMENT')}
          className={`group flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 ${
            statusFilter === 'NEEDS_ADJUSTMENT'
              ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-xs'
              : 'border-pink-100/90 bg-white hover:border-orange-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-800">
              Cần xử lý
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100/90 text-orange-700 shadow-2xs group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.needsAdjustment}</p>
            <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/80">
              Đổi giờ / Phản hồi
            </span>
          </div>
        </button>

        {/* Card 4: Đã xác nhận */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
          className={`group flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 ${
            statusFilter === 'CONFIRMED'
              ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30 shadow-xs'
              : 'border-pink-100/90 bg-white hover:border-sky-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-800">
              Đã xác nhận
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100/90 text-sky-700 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.confirmed + stats.deposited}
            </p>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/80">
              Sẵn sàng phục vụ
            </span>
          </div>
        </button>
      </section>

      {/* SECTION 2: Filter & Control Workspace */}
      <section className="rounded-3xl border border-pink-100/90 bg-white p-4.5 sm:p-5 shadow-xs space-y-3.5">
        {/* Filter Controls Bar: Search + Date + Branch + Tech + View Mode */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search khách hàng / mã booking..."
              className={`${inputClass} pl-10 pr-9 font-medium text-slate-900 border-pink-100/90 focus:border-pink-400 focus:ring-pink-100 text-xs py-2`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Select Controls Group */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center lg:gap-2">
            {/* Date Select */}
            <div className="min-w-[130px]">
              <BeautifulSelect
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`${inputClass} border-pink-100/90 font-medium text-slate-800 text-xs py-2`}
              >
                <option value="ALL">Tất cả ngày</option>
                <option value="TODAY">Hôm nay (11/08)</option>
                <option value="TOMORROW">Ngày mai (12/08)</option>
              </BeautifulSelect>
            </div>

            {/* Branch Select */}
            <div className="min-w-[140px]">
              <BeautifulSelect
                value={selectedBranch}
                onChange={(e) => onSelectedBranchChange(e.target.value)}
                className={`${inputClass} border-pink-100/90 font-medium text-slate-800 text-xs py-2`}
              >
                <option value="ALL">Tất cả chi nhánh</option>
                <option value="Q1">Chi nhánh Quận 1</option>
                <option value="Q3">Chi nhánh Quận 3</option>
              </BeautifulSelect>
            </div>

            {/* Technician Select */}
            <div className="col-span-2 sm:col-span-1 min-w-[150px]">
              <BeautifulSelect
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className={`${inputClass} border-pink-100/90 font-medium text-slate-800 text-xs py-2`}
              >
                <option value="ALL">Tất cả KTV</option>
                <option value="ANY">Tự động phân bổ</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.branch})
                  </option>
                ))}
              </BeautifulSelect>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 shrink-0 self-start lg:self-auto rounded-xl bg-pink-50/80 p-1 border border-pink-100">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-pink-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Thẻ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-pink-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Theo giờ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'compact'
                  ? 'bg-white text-pink-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Danh sách
            </button>
          </div>
        </div>

        {/* Status Chips Row */}
        <div className="pt-2 border-t border-pink-50/80 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none pb-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'ALL', label: 'Tất cả', count: statusCounts.ALL },
              { id: 'PENDING', label: 'Chờ xác nhận', count: statusCounts.PENDING },
              { id: 'NEEDS_ADJUSTMENT', label: 'Cần xử lý', count: statusCounts.NEEDS_ADJUSTMENT },
              { id: 'CONFIRMED', label: 'Đã xác nhận', count: statusCounts.CONFIRMED },
              { id: 'ARRIVED', label: 'Đã đến', count: statusCounts.ARRIVED },
              { id: 'COMPLETED', label: 'Hoàn thành', count: statusCounts.COMPLETED },
            ].map((chip) => {
              const active = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                    active
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-pink-50/60 text-slate-700 hover:bg-pink-100/70 border border-pink-100/80'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`ml-0.5 rounded-full px-2 py-0.2 text-[10px] font-black ${
                      active ? 'bg-white/25 text-white' : 'bg-pink-100 text-pink-800'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {(statusFilter !== 'ALL' || depositFilter !== 'ALL' || serviceFilter !== 'ALL' || techFilter !== 'ALL' || dateFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setDepositFilter('ALL');
                setServiceFilter('ALL');
                setTechFilter('ALL');
                setDateFilter('ALL');
                onSearchQueryChange('');
              }}
              className="text-[11px] font-bold text-pink-600 hover:text-pink-800 hover:underline flex items-center gap-1 shrink-0 ml-auto"
            >
              <RefreshCcw className="h-3 w-3" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      {/* SECTION 3: Main Appointment Display Workspace */}
      {/* SPOTLIGHT AREA: URGENT ACTION NEEDED BOOKINGS */}
      {actionNeededBookings.length > 0 && (
        <section className="rounded-3xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white p-4.5 sm:p-5 shadow-xs space-y-3.5 transition-all mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                  Cần xử lý ngay
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-black text-white shadow-2xs">
                    {actionNeededBookings.length}
                  </span>
                </h3>
                <p className="text-[11px] font-semibold text-amber-800/90">
                  Các lịch hẹn mới, chưa cọc, chưa xếp KTV hoặc yêu cầu điều chỉnh từ khách
                </p>
              </div>
            </div>
          </div>

          {/* Quick Cards Grid for Urgent Action Bookings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-0.5">
            {actionNeededBookings.map((booking) => {
              const reasons = getBookingActionNeededReasons(booking);
              return (
                <div
                  key={`urgent-${booking.id}`}
                  onClick={() => setSelectedBooking(booking)}
                  className="group relative flex flex-col justify-between rounded-2xl border-l-4 border-l-amber-500 border border-amber-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="space-y-2">
                    {/* Reason Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {reasons.map((r) => (
                        <span
                          key={r.id}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black border ${r.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${r.dotColor}`} />
                          {r.label}
                        </span>
                      ))}
                      <span className="font-mono text-[9px] font-bold text-slate-400 ml-auto">
                        #{booking.id.replace('BOOKING-', 'BK-')}
                      </span>
                    </div>

                    {/* Customer & Time Info */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate group-hover:text-amber-700 transition-colors">
                          {booking.customerName}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          {booking.customerPhone}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900 text-xs">{booking.time}</span>
                        <p className="text-[10px] font-bold text-amber-700">{booking.date}</p>
                      </div>
                    </div>

                    {/* Service */}
                    <p className="text-[11px] font-black text-slate-800 line-clamp-1 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100">
                      {booking.serviceName}
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-amber-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setCallingBooking(booking)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100 transition-all shrink-0"
                      title={`Gọi điện cho ${booking.customerName}`}
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(booking)}
                      className="flex-1 flex h-8 items-center justify-center gap-1 rounded-xl bg-amber-600 text-[11px] font-black text-white hover:bg-amber-700 transition-all shadow-2xs"
                    >
                      Xử lý ngay
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-pink-100/80 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
            <CalendarCheck2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-900">Không tìm thấy lịch hẹn phù hợp</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Không có kết quả nào khớp với bộ lọc hoặc từ khóa tìm kiếm. Vui lòng thử xóa bớt bộ lọc.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setDepositFilter('ALL');
              setServiceFilter('ALL');
              setTechFilter('ALL');
              setDateFilter('ALL');
              onSearchQueryChange('');
            }}
            className="mt-4 rounded-xl bg-pink-600 px-4 py-2 text-xs font-black text-white hover:bg-pink-700 shadow-xs"
          >
            Xem tất cả lịch hẹn
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* MODE 1: APPOINTMENT CARDS GRID GROUPED BY DATE */
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.dateStr} className="space-y-3.5">
              {/* Date Group Header */}
              <div className="flex items-center justify-between rounded-2xl border border-pink-100/90 bg-gradient-to-r from-pink-50/90 via-rose-50/50 to-pink-50/90 px-4 py-2.5 shadow-2xs backdrop-blur-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-2xs shrink-0 ${
                    group.isToday ? 'bg-pink-600 text-white' : group.isTomorrow ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white'
                  }`}>
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 truncate">
                    {group.headerLabel}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-0.5 text-xs font-extrabold text-pink-700 border border-pink-200/80 shadow-2xs">
                  {group.items.length} lịch hẹn
                </span>
              </div>

              {/* Cards Grid for Date Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {group.items.map((booking) => {
                  const statusMeta = bookingStatusMeta[booking.status];
                  const techName = booking.requestedTechnicianName || booking.assignedTechnicianName || 'Tự động phân bổ';
                  const isRequestedTech = Boolean(booking.requestedTechnicianName && booking.requestedTechnicianName !== 'Bất kỳ / Tự động gán');
                  const isAssignedTech = Boolean(booking.assignedTechnicianName && booking.assignedTechnicianName !== 'Tự động phân bổ');
                  const actionReasons = getBookingActionNeededReasons(booking);
                  const needsAction = actionReasons.length > 0;

                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`group relative flex flex-col justify-between rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer ${
                        needsAction
                          ? 'border-l-4 border-l-amber-500 border border-amber-200/90 bg-gradient-to-br from-amber-50/20 via-white to-white hover:border-amber-400'
                          : 'border border-pink-100/80 bg-white hover:border-pink-300'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Action Reason Banner if required */}
                        {needsAction && (
                          <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-amber-100">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" /> Cần xử lý:
                            </span>
                            {actionReasons.map((r) => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.2 text-[10px] font-black border ${r.badgeClass}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${r.dotColor}`} />
                                {r.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 1. KHÁCH HÀNG & STATUS CHÍNH */}
                        <div className="flex items-start justify-between gap-2 border-b border-pink-50 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-white text-sm shadow-xs ${
                              needsAction ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400' : 'bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-400'
                            }`}>
                              {booking.customerName.charAt(booking.customerName.lastIndexOf(' ') + 1) || booking.customerName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-black text-slate-900 text-sm truncate group-hover:text-pink-600 transition-colors">
                                  {booking.customerName}
                                </p>
                                <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60 shrink-0">
                                  #{booking.id.replace('BOOKING-', 'BK-')}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {booking.customerPhone}
                              </p>
                            </div>
                          </div>

                          {/* Status chính của booking */}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black shrink-0 ${statusMeta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        </div>

                        {/* 2. THỜI GIAN & CHI NHÁNH */}
                        <div className="rounded-xl bg-gradient-to-r from-pink-50/90 via-white to-pink-50/30 p-3 border border-pink-100/80 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-pink-100 text-pink-700 shadow-2xs">
                              <Clock3 className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-black text-slate-900 text-sm">{booking.time}</span>
                                <span className="text-[10px] font-bold text-pink-600">({booking.serviceDuration || 45} phút)</span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-500">{booking.date}</p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-pink-100 shadow-2xs">
                            <MapPin className="h-3 w-3 text-pink-500" />
                            {branchName(booking.branch)}
                          </span>
                        </div>

                        {/* 3. DỊCH VỤ + YÊU CẦU/MẪU + GIÁ */}
                        <div className="rounded-xl bg-slate-50/60 p-3 border border-slate-100 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-black text-slate-900 line-clamp-1">{booking.serviceName}</p>
                            <span className="font-black text-pink-600 text-sm shrink-0">{money(booking.totalEstimatedPrice)}</span>
                          </div>

                          {booking.nailDesignName && booking.nailDesignName !== 'Không chọn mẫu' ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-700 bg-pink-50 rounded-lg px-2 py-0.5 border border-pink-100/90">
                              <Sparkles className="h-3 w-3 shrink-0 text-pink-500" />
                              <span className="truncate max-w-[210px]">{booking.nailDesignName}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Khách chưa chọn mẫu trước</p>
                          )}
                        </div>

                        {/* 4. KTV & PHÂN CÔNG + 5. CỌC THANH TOÁN (DẠNG NHỎ) */}
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <UsersRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-900 truncate">{techName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              !isAssignedTech && !isRequestedTech ? 'text-amber-800 bg-amber-100 border border-amber-200' : 'text-slate-500 bg-slate-100'
                            }`}>
                              {isAssignedTech ? 'Đã phân công' : isRequestedTech ? 'Khách yêu cầu' : 'Chưa xếp KTV'}
                            </span>
                          </div>

                          {/* Trạng thái thanh toán dạng nhỏ */}
                          {booking.depositStatus === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                              <Check className="h-3 w-3 text-emerald-600" /> Cọc {money(booking.depositAmount)}
                            </span>
                          ) : booking.depositStatus === 'PENDING_VERIFICATION' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                              <Clock className="h-3 w-3 text-amber-600 animate-pulse" /> Chờ xác minh
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                              Chưa cọc
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 6. ACTION BUTTONS */}
                      <div className="mt-4 pt-3 border-t border-pink-50 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setCallingBooking(booking)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50/60 text-pink-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-2xs"
                          title={`Gọi điện cho ${booking.customerName}`}
                        >
                          <PhoneCall className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className={`flex-1 flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black text-white transition-all shadow-xs ${
                            needsAction ? 'bg-amber-600 hover:bg-amber-700' : 'bg-pink-600 hover:bg-pink-700'
                          }`}
                        >
                          {needsAction ? 'Xử lý ngay' : 'Xem chi tiết'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'timeline' ? (
        /* MODE 2: TIMELINE VIEW GROUPED BY TIME */
        <div className="space-y-5">
          {groupedByTime.map((group) => (
            <div key={group.time} className="rounded-3xl border border-pink-100/80 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-4 border-b border-pink-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-100 text-pink-700 font-black text-xs shadow-2xs">
                  <Clock3 className="h-4 w-4" />
                </span>
                <h3 className="font-black text-slate-900 text-base">Khung giờ {group.time}</h3>
                <span className="ml-auto text-xs font-bold text-slate-500 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                  {group.items.length} lịch hẹn
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((booking) => {
                  const statusMeta = bookingStatusMeta[booking.status];
                  const techName = booking.requestedTechnicianName || booking.assignedTechnicianName || 'Tự động phân bổ';

                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 hover:bg-white hover:border-pink-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Top Info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-black text-slate-900 text-sm group-hover:text-pink-600 transition-colors">
                              {booking.customerName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {booking.customerPhone}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </span>
                        </div>

                        {/* Service & Price */}
                        <div className="space-y-1 my-2">
                          <p className="text-xs font-black text-slate-900">{booking.serviceName}</p>
                          <p className="text-[11px] text-slate-500">
                            KTV: <span className="font-bold text-slate-800">{techName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-black" onClick={(e) => e.stopPropagation()}>
                        <span className="text-pink-600">{money(booking.totalEstimatedPrice)}</span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCallingBooking(booking)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            title="Gọi điện"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="text-xs text-pink-600 font-black hover:underline flex items-center gap-0.5"
                          >
                            Xem chi tiết <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* MODE 3: APPOINTMENT ROW CARDS GROUPED BY DATE (DESKTOP HORIZONTAL, TABLET/MOBILE VERTICAL) */
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.dateStr} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center justify-between rounded-2xl border border-pink-100/90 bg-gradient-to-r from-pink-50/90 via-rose-50/50 to-pink-50/90 px-4 py-2.5 shadow-2xs backdrop-blur-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-2xs shrink-0 ${
                    group.isToday ? 'bg-pink-600 text-white' : group.isTomorrow ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white'
                  }`}>
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 truncate">
                    {group.headerLabel}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-0.5 text-xs font-extrabold text-pink-700 border border-pink-200/80 shadow-2xs">
                  {group.items.length} lịch hẹn
                </span>
              </div>

              {/* Rows List for Date Group */}
              <div className="space-y-3">
                {group.items.map((booking) => {
                  const statusMeta = bookingStatusMeta[booking.status];
                  const techName = booking.requestedTechnicianName || booking.assignedTechnicianName || 'Tự động phân bổ';
                  const isRequestedTech = Boolean(booking.requestedTechnicianName && booking.requestedTechnicianName !== 'Bất kỳ / Tự động gán');
                  const isAssignedTech = Boolean(booking.assignedTechnicianName && booking.assignedTechnicianName !== 'Tự động phân bổ');
                  const actionReasons = getBookingActionNeededReasons(booking);
                  const needsAction = actionReasons.length > 0;

                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`group relative flex flex-col lg:flex-row lg:items-center justify-between rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 gap-3.5 sm:gap-4 cursor-pointer overflow-hidden min-w-0 w-full max-w-full ${
                        needsAction
                          ? 'border-l-4 border-l-amber-500 border border-amber-200/90 bg-gradient-to-r from-amber-50/20 via-white to-white hover:border-amber-400'
                          : 'border border-pink-100/90 bg-white hover:border-pink-300'
                      }`}
                    >
                      {/* Section 1: KHÁCH HÀNG (Avatar + Tên + SĐT + Mã booking + Badges) */}
                      <div className="flex items-center gap-3.5 min-w-0 lg:min-w-[210px] shrink-0">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-white text-sm shadow-xs ${
                          needsAction ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400' : 'bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-400'
                        }`}>
                          {booking.customerName.charAt(booking.customerName.lastIndexOf(' ') + 1) || booking.customerName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-black text-slate-900 text-sm truncate group-hover:text-pink-600 transition-colors">
                              {booking.customerName}
                            </p>
                            <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60 shrink-0">
                              #{booking.id.replace('BOOKING-', 'BK-')}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            {booking.customerPhone}
                          </p>

                          {/* Action Reasons Pills under customer name if needs action */}
                          {needsAction && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {actionReasons.map((r) => (
                                <span
                                  key={r.id}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-black border ${r.badgeClass}`}
                                >
                                  <span className={`h-1 w-1 rounded-full ${r.dotColor}`} />
                                  {r.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: THỜI GIAN (Giờ + Ngày + Chi nhánh) */}
                      <div className="flex items-center justify-between lg:justify-start gap-3 min-w-0 lg:min-w-[170px] shrink-0 bg-pink-50/50 lg:bg-transparent p-2.5 lg:p-0 rounded-xl border border-pink-100/70 lg:border-none">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-100 text-pink-700 shrink-0">
                            <Clock3 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-slate-900 text-sm">{booking.time}</span>
                              <span className="text-[10px] font-bold text-pink-600">({booking.serviceDuration || 45}m)</span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 truncate">{booking.date} · <span className="text-pink-700 font-bold">{branchName(booking.branch)}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: DỊCH VỤ (Tên + Yêu cầu/mẫu + Giá) */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 lg:block">
                          <p className="text-xs font-black text-slate-900 truncate">{booking.serviceName}</p>
                          <span className="font-black text-pink-600 text-xs lg:text-sm lg:mt-0.5 block shrink-0">{money(booking.totalEstimatedPrice)}</span>
                        </div>
                        {booking.nailDesignName && booking.nailDesignName !== 'Không chọn mẫu' ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-700 bg-pink-50 rounded px-1.5 py-0.2 border border-pink-100/80 mt-1 max-w-full">
                            <Sparkles className="h-3 w-3 shrink-0 text-pink-500" />
                            <span className="truncate max-w-[180px] sm:max-w-[260px]">{booking.nailDesignName}</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">Khách chưa chọn mẫu</p>
                        )}
                      </div>

                      {/* Section 4: KTV & PHÂN CÔNG */}
                      <div className="min-w-0 lg:min-w-[150px] shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kỹ thuật viên</p>
                        <p className="text-xs font-black text-slate-800 truncate mt-0.5">{techName}</p>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${
                          !isAssignedTech && !isRequestedTech ? 'text-amber-800 bg-amber-100 border-amber-200' : 'text-slate-500 bg-slate-100 border-slate-200/50'
                        }`}>
                          {isAssignedTech ? 'Đã phân công' : isRequestedTech ? 'Khách yêu cầu' : 'Chưa xếp KTV'}
                        </span>
                      </div>

                      {/* Section 5: STATUS CHÍNH & THANH TOÁN (DẠNG NHỎ) */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-1.5 shrink-0 min-w-0 lg:min-w-[130px]">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${statusMeta.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>

                        {/* Trạng thái thanh toán dạng nhỏ */}
                        {booking.depositStatus === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/80">
                            <Check className="h-2.5 w-2.5 text-emerald-600" /> Cọc {money(booking.depositAmount)}
                          </span>
                        ) : booking.depositStatus === 'PENDING_VERIFICATION' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100/80 px-2 py-0.2 rounded-full border border-amber-300">
                            <Clock className="h-2.5 w-2.5 text-amber-600 animate-pulse" /> Chờ xác minh
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.2 rounded-full border border-rose-200">
                            Chưa cọc
                          </span>
                        )}
                      </div>

                      {/* Section 6: ACTION BUTTONS */}
                      <div className="flex items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-pink-50 min-w-0 w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setCallingBooking(booking)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-pink-100 bg-pink-50/70 text-pink-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-2xs shrink-0"
                          title={`Gọi điện cho ${booking.customerName}`}
                        >
                          <PhoneCall className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className={`flex h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-black text-white transition-all shadow-xs flex-1 lg:flex-initial ${
                            needsAction ? 'bg-amber-600 hover:bg-amber-700' : 'bg-pink-600 hover:bg-pink-700'
                          }`}
                        >
                          {needsAction ? 'Xử lý ngay' : 'Xem chi tiết'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* SECTION 4: Processing & Detail Modal */}
      {selectedBooking && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBooking(null)}
          maxWidth="3xl"
          className="border border-pink-100 shadow-2xl bg-white"
          headerClassName="border-b border-pink-100/80 bg-white"
          footerClassName="border-t border-pink-100/80 bg-pink-50/20"
          title={
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-pink-600">{selectedBooking.id}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${
                  bookingStatusMeta[selectedBooking.status].badge
                }`}
              >
                {bookingStatusMeta[selectedBooking.status].label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-100 px-2.5 py-0.5 text-[10px] font-extrabold text-pink-700">
                <Smartphone className="h-3 w-3 text-pink-500" /> Mobile App
              </span>
            </div>
          }
          subtitle={`Yêu cầu từ khách hàng: ${selectedBooking.customerName} (${selectedBooking.customerPhone})`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCallingBooking(selectedBooking)}
                  className="flex h-10 items-center gap-2 rounded-xl border border-pink-100 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-pink-50/50 hover:text-pink-600 transition-colors"
                >
                  <PhoneCall className="h-4 w-4 text-emerald-600" /> Gọi cho khách
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedBooking.status !== 'CANCELLED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelOpen(true);
                        setProposeOpen(false);
                      }}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/60 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100/80 transition-colors"
                    >
                      <XCircle className="h-4 w-4 text-rose-500" /> Từ chối / Hủy lịch
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProposeOpen(true);
                        setCancelOpen(false);
                      }}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3.5 text-xs font-bold text-amber-800 hover:bg-amber-100/80 transition-colors"
                    >
                      <CalendarClock className="h-4 w-4 text-amber-600" /> Đề xuất giờ khác
                    </button>

                    {['PENDING', 'NEEDS_ADJUSTMENT', 'DEPOSITED'].includes(selectedBooking.status) ? (
                      selectedBooking.depositStatus === 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => requestConfirmBooking(selectedBooking)}
                          disabled={!canManage}
                          className="flex h-10 items-center gap-1.5 rounded-xl bg-pink-600 px-5 text-xs font-black text-white shadow-2xs hover:bg-pink-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="h-4 w-4" /> Xác nhận lịch hẹn
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-800"
                          title="Khách cần thanh toán tiền cọc trước khi salon xác nhận lịch"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-600" /> Chờ khách đặt cọc
                        </button>
                      )
                    ) : (
                      <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 text-xs font-black text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Lịch đã được xác nhận
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Validation Error Banner */}
            {validationError && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4 text-rose-800 animate-fadeIn">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-extrabold text-sm text-rose-900">Không thể xác nhận lịch hẹn</p>
                  <p className="mt-1 leading-5 text-rose-800">{validationError}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Switch to ANY or first available tech
                        const availTech = technicians.find((technician) =>
                          technicianIsAvailable(technician, selectedBooking)
                        );
                        setChosenTechId(availTech ? availTech.id : 'ANY');
                        setValidationError('');
                      }}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-800 shadow-2xs hover:bg-rose-50"
                    >
                      Đổi sang KTV rảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProposeOpen(true);
                        setValidationError('');
                      }}
                      className="rounded-lg bg-rose-100/80 px-3 py-1.5 text-[11px] font-bold text-rose-900 hover:bg-rose-200/80"
                    >
                      Đề xuất giờ khác cho khách
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Top Grid: Service & Customer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Dịch vụ & Mẫu Nail */}
              <div className="rounded-2xl border border-pink-100 bg-pink-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-pink-100/80 pb-2">
                  <span className="font-black text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" /> Dịch vụ do khách chọn
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{selectedBooking.serviceId}</span>
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">{selectedBooking.serviceName}</p>
                  <p className="text-slate-500 font-semibold mt-0.5">
                    Giá dịch vụ nền: {money(selectedBooking.servicePrice)} · Thời lượng {selectedBooking.serviceDuration} phút
                  </p>
                </div>

                {selectedBooking.nailDesignName && (
                  <div className="rounded-xl border border-pink-200/80 bg-pink-50/60 p-3">
                    <p className="font-extrabold text-pink-950 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                      Mẫu Nail: {selectedBooking.nailDesignName}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-slate-600 font-semibold text-[11px]">
                      <span>Phụ thu thiết kế / đính đá:</span>
                      <span className="font-black text-pink-600">+{money(selectedBooking.nailDesignExtraFee)}</span>
                    </div>
                    {selectedBooking.nailColor && (
                      <p className="mt-1 text-[11px] text-pink-700 font-medium">
                        Màu sơn yêu cầu: <strong>{selectedBooking.nailColor}</strong>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-pink-100/80 pt-2 font-bold text-slate-900">
                  <span>Tổng tiền dự kiến:</span>
                  <span className="text-base font-black text-pink-600">{money(selectedBooking.totalEstimatedPrice)}</span>
                </div>
              </div>

              {/* Box 2: Tiền cọc & Chi nhánh */}
              <div className="rounded-2xl border border-pink-100 bg-pink-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-pink-100/80 pb-2">
                  <span className="font-black text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-pink-600" /> Tiền cọc & Địa điểm
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-bold text-slate-700 border border-pink-100">
                    {branchName(selectedBooking.branch)}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Status Banner */}
                  {selectedBooking.depositStatus === 'PAID' ? (
                    <div className="rounded-xl bg-emerald-50/90 border border-emerald-200/90 p-3.5 text-xs space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-900 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> ✓ Đã đặt cọc
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenAdjustModal}
                          disabled={!canManage}
                          className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 transition-colors bg-white px-2 py-1 rounded-lg border border-emerald-200/80 shadow-2xs"
                        >
                          <RefreshCw className="h-3 w-3 text-emerald-600" /> Điều chỉnh / Hoàn cọc
                        </button>
                      </div>

                      <p className="font-black text-base text-slate-900 pt-0.5">
                        {money(selectedBooking.depositAmount)}{' '}
                        <span className="font-semibold text-slate-600 text-xs">· {depositMethodLabel(selectedBooking.depositMethod)}</span>
                      </p>

                      {(selectedBooking.depositTransactionId || selectedBooking.depositPaidAt) && (
                        <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 space-y-0.5">
                          {selectedBooking.depositTransactionId && (
                            <p className="font-mono">Mã GD: #{selectedBooking.depositTransactionId}</p>
                          )}
                          {selectedBooking.depositPaidAt && (
                            <p className="text-emerald-700">Thanh toán lúc: {selectedBooking.depositPaidAt}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : selectedBooking.depositStatus === 'PENDING_VERIFICATION' ? (
                    <div className="rounded-xl bg-amber-50/95 border-2 border-amber-300 p-3.5 text-xs space-y-3 shadow-2xs">
                      <div className="flex items-start gap-2 text-amber-950">
                        <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-black text-xs uppercase tracking-wide text-amber-900">
                              Chờ xác minh tiền cọc
                            </p>
                            <span className="rounded-md bg-amber-200/70 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                              Khách báo đã chuyển
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-amber-900/90 mt-1 leading-4">
                            Khách thông báo đã chuyển khoản. Nhân viên vui lòng đối soát ngân hàng/ví trước khi xác nhận.
                          </p>

                          <div className="mt-2 rounded-lg bg-white/80 p-2 border border-amber-200 text-[11px] space-y-1">
                            <div className="flex justify-between font-bold text-slate-900">
                              <span>Số tiền báo cọc:</span>
                              <span className="text-pink-600 font-black">{money(selectedBooking.depositAmount || 300000)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Phương thức:</span>
                              <span className="font-semibold">{depositMethodLabel(selectedBooking.depositMethod)}</span>
                            </div>
                            {selectedBooking.depositTransactionId && (
                              <div className="flex justify-between font-mono text-[10px] text-slate-500">
                                <span>Mã GD khách gửi:</span>
                                <span>#{selectedBooking.depositTransactionId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/80">
                        <button
                          type="button"
                          onClick={handleOpenConfirmStepModal}
                          disabled={!canManage}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Xác nhận đã nhận cọc
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenDepositModal}
                          disabled={!canManage}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-colors shadow-2xs"
                        >
                          <Pencil className="h-3.5 w-3.5 text-amber-700" /> Chỉnh sửa thông tin
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-rose-50/90 border border-rose-200/90 p-3.5 text-xs space-y-3 shadow-2xs">
                      <div className="flex items-start gap-2 text-rose-950">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black text-xs text-rose-900 uppercase tracking-wide">
                            Chưa thanh toán tiền cọc
                          </p>
                          <p className="text-[11px] font-medium text-rose-800/90 mt-0.5 leading-4">
                            Khách chưa cọc trên ứng dụng. Cập nhật ngay khi khách chuyển khoản hoặc thu tiền cọc tại quầy.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleOpenDepositModal}
                          disabled={!canManage}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-3 py-2 text-xs font-black text-white hover:bg-pink-700 transition-colors shadow-2xs"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Cập nhật tiền cọc
                        </button>
                        <button
                          type="button"
                          onClick={handleMarkPendingVerification}
                          disabled={!canManage}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                        >
                          <Clock className="h-3.5 w-3.5 text-amber-600" /> Chờ xác minh
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remaining Balance */}
                  <div className="flex items-center justify-between pt-2 border-t border-pink-100/80 text-xs">
                    <span className="text-slate-600 font-bold">Còn lại thanh toán tại quầy:</span>
                    <span className="font-black text-pink-600 text-sm bg-white px-2.5 py-1 rounded-lg border border-pink-100 shadow-2xs">
                      {money(
                        Math.max(
                          0,
                          selectedBooking.totalEstimatedPrice -
                            (selectedBooking.depositStatus === 'PAID' ? selectedBooking.depositAmount : 0)
                        )
                      )}
                    </span>
                  </div>

                  {/* Deposit Audit History Log */}
                  <div className="pt-2 border-t border-pink-100/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <History className="h-3.5 w-3.5 text-pink-600" /> Lịch sử tiền cọc
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Lưu vết minh bạch
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {(!selectedBooking.depositHistory || selectedBooking.depositHistory.length === 0) ? (
                        <p className="text-[11px] text-slate-400 italic bg-white/60 p-2 rounded-lg border border-pink-50 text-center">
                          Chưa có lịch sử thay đổi tiền cọc.
                        </p>
                      ) : (
                        selectedBooking.depositHistory.map((log) => (
                          <div key={log.id} className="rounded-xl bg-white p-2.5 border border-pink-100/80 text-[11px] space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-black text-slate-800 text-[10px] uppercase tracking-wide">
                                {log.actionLabel || log.action}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>{log.staffName || 'Nhân viên'}</span>
                              <span className={`font-black ${log.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {log.amount > 0 ? `+${money(log.amount)}` : log.amount < 0 ? money(log.amount) : '0đ'}
                              </span>
                            </div>
                            {(log.method || log.transactionId || log.note) && (
                              <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                                {log.method && <span>Cổng: {depositMethodLabel(log.method)} {log.transactionId ? `(#${log.transactionId})` : ''}</span>}
                                {log.note && <p className="italic text-slate-600">Ghi chú: {log.note}</p>}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Availability Verification Panel */}
            <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3">
              <h3 className="font-black text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-pink-600" /> Kiểm tra điều kiện giữ chỗ & kỹ thuật viên
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Check 1: Khung giờ */}
                <div className="rounded-xl bg-pink-50/30 border border-pink-100 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Clock3 className="h-3 w-3 text-pink-500" /> Khung giờ hẹn
                  </p>
                  <p className="font-black text-slate-900 text-sm">{selectedBooking.time} · {selectedBooking.date}</p>
                  <p className="text-[10px] font-semibold text-emerald-600">Trong giờ mở cửa salon</p>
                </div>

                {/* Check 2: Ghế làm */}
                <div className="rounded-xl bg-pink-50/30 border border-pink-100 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Layers className="h-3 w-3 text-pink-500" /> Ghế / Khu vực làm
                  </p>
                  <p className="font-black text-slate-900 text-sm">
                    {selectedBooking.assignedStation || (selectedBooking.branch === 'Q1' ? 'Bàn Nail #02' : 'Ghế Spa #03')}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600">
                    {checkStationAvailability(selectedBooking).message}
                  </p>
                </div>

                {/* Check 3: KTV Yêu cầu vs Phân bổ */}
                <div className="rounded-xl bg-pink-50/30 border border-pink-100 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <UsersRound className="h-3 w-3 text-pink-500" /> KTV do khách chọn
                  </p>
                  <p className="font-black text-slate-900 text-sm">
                    {selectedBooking.requestedTechnicianName || 'Tự động gán'}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    Yêu cầu ban đầu từ Mobile App
                  </p>
                </div>
              </div>

              {/* Technician Cards Selector */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    Gán hoặc Đổi Kỹ thuật viên phụ trách:
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {branchName(selectedBooking.branch)}
                  </span>
                </div>

                {/* Cards List Container - Scrollable */}
                <div className="max-h-[310px] overflow-y-auto rounded-2xl border border-pink-100 bg-pink-50/20 p-2.5 space-y-2.5">
                  {/* Option Card 1: Tự động phân bổ KTV */}
                  <div
                    onClick={() => {
                      setChosenTechId('ANY');
                      setValidationError('');
                      setAssignmentNotice('');
                    }}
                    className={`group relative flex cursor-pointer items-start justify-between rounded-xl border p-3 transition-all ${
                      chosenTechId === 'ANY'
                        ? 'border-2 border-pink-600 bg-pink-50/90 ring-2 ring-pink-500/20'
                        : 'border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 pr-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-400 text-white shadow-2xs">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-xs">Tự động phân bổ KTV</p>
                          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[9px] font-extrabold text-pink-700">
                            Hệ thống
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-medium leading-4 text-slate-600">
                          Hệ thống tự chọn KTV phù hợp dựa trên chuyên môn và thời gian rảnh.
                        </p>
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-pink-700">
                          <UserCheck className="h-3 w-3 text-pink-500" /> Tự động chọn người rảnh nhất khi xác nhận
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {chosenTechId === 'ANY' ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-white shadow-2xs">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-pink-200 group-hover:border-pink-400" />
                      )}
                    </div>
                  </div>

                  {/* Individual Technician Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {technicians
                      .filter((tech) => tech.branch === selectedBooking.branch)
                      .map((tech) => {
                        const check = checkTechnicianAvailability(tech.id, selectedBooking);
                        const isAvailable = check.ok;
                        const isSelected = chosenTechId === tech.id;
                        const isOff = tech.status === 'OFF';

                        let earliestText = `Sớm nhất: Nhận ngay ${selectedBooking.time}`;
                        let reasonText = '';

                        if (isOff) {
                          earliestText = 'Không nhận ca hôm nay';
                          reasonText = tech.offReason || 'Đang nghỉ phép';
                        } else if (!isAvailable) {
                          const conflictSlot = tech.busySlots.find((slot) => {
                            const [start, end] = slot.split('-');
                            return selectedBooking.time >= start && selectedBooking.time < end;
                          });
                          const endSlot = conflictSlot ? conflictSlot.split('-')[1] : null;
                          earliestText = endSlot ? `Dự kiến rảnh từ ${endSlot}` : 'Đang bận ca này';
                          reasonText = `Trùng ca (${tech.busySlots.join(', ')})`;
                        }

                        return (
                          <div
                            key={tech.id}
                            onClick={() => {
                              if (!isAvailable) {
                                setAssignmentNotice(
                                  `${tech.name} hiện không sẵn sàng (${reasonText || 'bận ca'}).`
                                );
                                return;
                              }
                              setChosenTechId(tech.id);
                              setValidationError('');
                              setAssignmentNotice('');
                            }}
                            className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all ${
                              isSelected
                                ? 'border-2 border-pink-600 bg-pink-50/90 ring-2 ring-pink-500/20'
                                : isAvailable
                                ? 'border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50/40 cursor-pointer'
                                : 'border-slate-200/80 bg-slate-50/80 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs border ${
                                      isSelected
                                        ? 'bg-pink-600 text-white border-pink-600'
                                        : isAvailable
                                        ? 'bg-pink-100 text-pink-700 border-pink-200/80'
                                        : 'bg-slate-200 text-slate-500 border-slate-300'
                                    }`}
                                  >
                                    {tech.name.charAt(tech.name.lastIndexOf(' ') + 1) || tech.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-black text-slate-900 text-xs truncate">{tech.name}</p>
                                    <p className="text-[10px] font-medium text-slate-500 truncate">{tech.specialty}</p>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isSelected ? (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-white shadow-2xs">
                                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                  ) : isAvailable ? (
                                    <div className="h-5 w-5 rounded-full border-2 border-pink-200 group-hover:border-pink-400" />
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-slate-200 bg-slate-200" />
                                  )}
                                </div>
                              </div>

                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 ring-1 ring-emerald-200/80">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Sẵn sàng
                                  </span>
                                ) : isOff ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-rose-700 ring-1 ring-rose-200/80">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Nghỉ làm
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 ring-1 ring-amber-200/80">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Không sẵn sàng
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-2.5 border-t border-pink-50 pt-2 text-[10px]">
                              <p className={`font-semibold flex items-center gap-1 ${isAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>
                                <Clock3 className="h-3 w-3 shrink-0" />
                                {earliestText}
                              </p>
                              {!isAvailable && reasonText && (
                                <p className="mt-0.5 text-rose-600 font-semibold truncate" title={reasonText}>
                                  Lý do: {reasonText}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Auto Assignment Result Box if 'ANY' selected */}
                {chosenTechId === 'ANY' && (
                  <div className="rounded-xl border border-pink-200 bg-pink-50/80 p-3 text-xs animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white shadow-2xs">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-pink-700">
                          Kết quả tự động chọn từ hệ thống
                        </p>
                        {(() => {
                          const bestTech = technicians.find(
                            (tech) => tech.branch === selectedBooking.branch && technicianIsAvailable(tech, selectedBooking)
                          );
                          if (bestTech) {
                            return (
                              <p className="font-bold text-slate-900 mt-0.5 text-xs">
                                Đề xuất KTV tốt nhất: <span className="text-pink-900 font-black">{bestTech.name}</span> ({bestTech.specialty}) · <span className="text-emerald-700 font-extrabold">Sẵn sàng lúc {selectedBooking.time}</span>
                              </p>
                            );
                          }
                          return (
                            <p className="font-bold text-rose-700 mt-0.5 text-xs">
                              ⚠️ Tất cả KTV ở {branchName(selectedBooking.branch)} hiện đang bận hoặc nghỉ làm vào khung giờ {selectedBooking.time}. Vui lòng đề xuất giờ khác.
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {assignmentNotice && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[11px] font-semibold leading-5 text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>{assignmentNotice}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes from customer */}
            {selectedBooking.customerNotes && (
              <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3.5 text-slate-800">
                <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-pink-700">
                  <Sparkles className="h-3.5 w-3.5 text-pink-500" /> Ghi chú từ khách hàng (Mobile App)
                </p>
                <p className="mt-1 leading-5 text-slate-700 font-medium">{selectedBooking.customerNotes}</p>
              </div>
            )}

            {/* Rejection or Proposed Time Notes */}
            {selectedBooking.receptionistNotes && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-amber-900">
                <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-amber-800">
                  <Info className="h-3.5 w-3.5 text-amber-600" /> Ghi chú điều chỉnh từ salon
                </p>
                <p className="mt-1 leading-5 font-semibold">{selectedBooking.receptionistNotes}</p>
              </div>
            )}

            {selectedBooking.rejectionReason && (
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-3.5 text-rose-900">
                <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-rose-800">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" /> Lý do từ chối / Hủy lịch
                </p>
                <p className="mt-1 leading-5 font-semibold">{selectedBooking.rejectionReason}</p>
              </div>
            )}

            {/* Sub-form: Propose Alternative Time */}
            {proposeOpen && (
              <form
                onSubmit={requestProposeTime}
                className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <h4 className="font-black text-amber-900 text-sm flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-amber-600" /> Đề xuất ngày/giờ mới cho khách
                  </h4>
                  <button
                    type="button"
                    onClick={() => setProposeOpen(false)}
                    className="text-amber-700 hover:text-amber-950 font-bold text-xs"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Ngày đề xuất</label>
                    <input
                      type="text"
                      value={proposeDate}
                      onChange={(e) => setProposeDate(e.target.value)}
                      placeholder="11/08/2026"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Giờ đề xuất</label>
                    <input
                      type="text"
                      value={proposeTime}
                      onChange={(e) => setProposeTime(e.target.value)}
                      placeholder="14:30"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lời nhắn / Lời giải thích gửi đến Customer App
                  </label>
                  <textarea
                    value={proposeNote}
                    onChange={(e) => setProposeNote(e.target.value)}
                    placeholder="Ví dụ: KTV do chị yêu cầu bận ca 13:30, salon trân trọng đề xuất lùi lại 14:30 để KTV sẵn sàng phục vụ tốt nhất..."
                    className="w-full rounded-xl border border-pink-100 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 min-h-[70px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setProposeOpen(false)}
                    className="rounded-xl border border-pink-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white shadow-2xs hover:bg-amber-700 flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Gửi đề xuất tới Mobile App
                  </button>
                </div>
              </form>
            )}

            {/* Sub-form: Reject / Cancel Booking */}
            {cancelOpen && (
              <form
                onSubmit={requestCancelBooking}
                className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-rose-200/70 pb-2">
                  <h4 className="font-black text-rose-900 text-sm flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-rose-600" /> Từ chối / Hủy lịch hẹn kèm lý do
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCancelOpen(false)}
                    className="text-rose-700 hover:text-rose-950 font-bold text-xs"
                  >
                    Đóng
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Lý do từ chối chính:</label>
                  <BeautifulSelect
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className={inputClass}
                  >
                    <option value="KTV bận ca / không đủ thời gian">KTV bận ca / không đủ thời gian</option>
                    <option value="Hết ghế làm trống vào khung giờ này">Hết ghế làm trống vào khung giờ này</option>
                    <option value="Không liên lạc được với khách hàng">Không liên lạc được với khách hàng</option>
                    <option value="Khách yêu cầu hủy qua điện thoại">Khách yêu cầu hủy qua điện thoại</option>
                    <option value="Chưa nhận được tiền cọc xác nhận">Chưa nhận được tiền cọc xác nhận</option>
                    <option value="Lý do khác">Lý do khác...</option>
                  </BeautifulSelect>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ghi chú chi tiết (nếu có):
                  </label>
                  <textarea
                    value={customCancelNote}
                    onChange={(e) => setCustomCancelNote(e.target.value)}
                    placeholder="Ghi rõ lý do chi tiết để lưu lịch sử hệ thống..."
                    className="w-full rounded-xl border border-pink-100 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 min-h-[60px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCancelOpen(false)}
                    className="rounded-xl border border-pink-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-2xs hover:bg-rose-700 flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Xác nhận Hủy/Từ chối
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* Final confirmation before applying a booking action */}
      {selectedBooking && pendingAction && (
        <Modal
          isOpen={true}
          onClose={() => setPendingAction(null)}
          maxWidth="md"
          zIndex="z-[130]"
          closeOnOverlayClick={false}
          className="border border-pink-100 bg-white shadow-2xl"
          headerClassName="border-b border-pink-100/80 bg-white"
          footerClassName="border-t border-pink-100/80 bg-pink-50/20"
          title={
            pendingAction === 'CONFIRM'
              ? 'Xác nhận lịch hẹn?'
              : pendingAction === 'PROPOSE_TIME'
              ? 'Gửi đề xuất đổi giờ?'
              : 'Xác nhận hủy lịch?'
          }
          subtitle={`${selectedBooking.id} · ${selectedBooking.customerName}`}
          headerIcon={
            pendingAction === 'CONFIRM' ? (
              <CheckCircle2 className="h-5 w-5 text-pink-600" />
            ) : pendingAction === 'PROPOSE_TIME' ? (
              <CalendarClock className="h-5 w-5 text-amber-600" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600" />
            )
          }
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="rounded-xl border border-pink-100 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy thao tác
              </button>
              <button
                type="button"
                onClick={handleConfirmedAction}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-2xs ${
                  pendingAction === 'CANCEL'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : pendingAction === 'PROPOSE_TIME'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-pink-600 hover:bg-pink-700'
                }`}
              >
                {pendingAction === 'CONFIRM' ? (
                  <><Check className="h-4 w-4" /> Xác nhận lịch hẹn</>
                ) : pendingAction === 'PROPOSE_TIME' ? (
                  <><Send className="h-4 w-4" /> Xác nhận gửi</>
                ) : (
                  <><XCircle className="h-4 w-4" /> Xác nhận hủy</>
                )}
              </button>
            </div>
          }
        >
          <div
            className={`rounded-2xl border p-4 text-sm leading-6 ${
              pendingAction === 'CANCEL'
                ? 'border-rose-200/80 bg-rose-50/60 text-rose-900'
                : pendingAction === 'PROPOSE_TIME'
                ? 'border-amber-200/80 bg-amber-50/60 text-amber-900'
                : 'border-pink-200/80 bg-pink-50/60 text-pink-950'
            }`}
          >
            {pendingAction === 'CONFIRM' && (
              <p>
                Xác nhận giữ chỗ lúc <strong>{selectedBooking.time} · {selectedBooking.date}</strong>.
                Hệ thống đã ghi nhận tiền cọc <strong>{money(selectedBooking.depositAmount)}</strong>.
              </p>
            )}
            {pendingAction === 'PROPOSE_TIME' && (
              <p>
                Gửi giờ mới <strong>{proposeTime} · {proposeDate}</strong> tới ứng dụng của khách hàng.
                Lịch sẽ chuyển sang trạng thái chờ khách phản hồi.
              </p>
            )}
            {pendingAction === 'CANCEL' && (
              <p>
                Lịch hẹn sẽ bị hủy với lý do: <strong>{cancelReason}</strong>
                {customCancelNote ? ` — ${customCancelNote}` : ''}. Thao tác này sẽ được lưu vào lịch sử.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Simulated Phone Call Dialog */}
      {callingBooking && (
        <Modal
          isOpen={true}
          onClose={() => setCallingBooking(null)}
          maxWidth="md"
          className="border border-pink-100 bg-white shadow-2xl"
          headerClassName="border-b border-pink-100/80 bg-white"
          footerClassName="border-t border-pink-100/80 bg-pink-50/20"
          title="Cuộc gọi trao đổi với khách hàng"
          subtitle={`Đang kết nối tới: ${callingBooking.customerName} (${callingBooking.customerPhone})`}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setCallingBooking(null)}
                className="rounded-xl border border-pink-100 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy cuộc gọi
              </button>
              <button
                type="button"
                onClick={handleCompleteCall}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-2xs hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Hoàn tất cuộc gọi & Lưu
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-2xs animate-pulse">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black text-emerald-950 text-sm">{callingBooking.customerName}</p>
                <p className="font-mono text-emerald-700 font-bold">{callingBooking.customerPhone}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Mã booking: {callingBooking.id}</p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Ghi chú kết quả cuộc gọi:</label>
              <textarea
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder="Ví dụ: Đã gọi xác nhận khách đồng ý giữ lịch 10:30, khách yêu cầu thêm màu sơn mắt mèo..."
                className="w-full rounded-xl border border-pink-100 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 min-h-[90px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => setCallNote('Khách đồng ý xác nhận lịch hẹn đúng giờ.')}
                className="rounded-lg bg-pink-50 border border-pink-100 px-2.5 py-1 text-[11px] font-bold text-pink-700 hover:bg-pink-100/70"
              >
                + Khách chốt lịch
              </button>
              <button
                type="button"
                onClick={() => setCallNote('Khách xin đổi giờ sang ca chiều.')}
                className="rounded-lg bg-pink-50 border border-pink-100 px-2.5 py-1 text-[11px] font-bold text-pink-700 hover:bg-pink-100/70"
              >
                + Khách muốn đổi giờ
              </button>
              <button
                type="button"
                onClick={() => setCallNote('Không nhấc máy lần 1.')}
                className="rounded-lg bg-pink-50 border border-pink-100 px-2.5 py-1 text-[11px] font-bold text-pink-700 hover:bg-pink-100/70"
              >
                + Không nghe máy
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rules & Configuration Modal */}
      {configOpen && (
        <Modal
          isOpen={true}
          onClose={() => setConfigOpen(false)}
          maxWidth="lg"
          className="border border-pink-100 bg-white shadow-2xl"
          headerClassName="border-b border-pink-100/80 bg-white"
          footerClassName="border-t border-pink-100/80 bg-pink-50/20"
          title="Cấu hình quy tắc duyệt đặt lịch Mobile App"
          subtitle="Thiết lập điều kiện tự động và chính sách tiền cọc"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setConfigOpen(false)}
                className="rounded-xl border border-pink-100 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfigOpen(false);
                  setNotice('Đã lưu quy tắc duyệt đặt lịch Mobile App.');
                }}
                className="rounded-xl bg-pink-600 px-5 py-2 text-xs font-black text-white shadow-2xs hover:bg-pink-700 transition-colors"
              >
                Lưu quy tắc
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100">
              <div>
                <p className="font-extrabold text-slate-900">Tự động duyệt khi đủ điều kiện</p>
                <p className="text-[11px] text-slate-500">Tự động chuyển 'Đã xác nhận' nếu còn ghế & KTV rảnh</p>
              </div>
              <input
                type="checkbox"
                checked={configSettings.autoConfirmEligible}
                onChange={(e) =>
                  setConfigSettings((prev) => ({ ...prev, autoConfirmEligible: e.target.checked }))
                }
                className="h-5 w-5 rounded-md border-pink-300 text-pink-600 focus:ring-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Yêu cầu tiền cọc qua Mobile App:</label>
              <BeautifulSelect
                value={configSettings.depositRequirement}
                onChange={(e) =>
                  setConfigSettings((prev) => ({ ...prev, depositRequirement: e.target.value }))
                }
                className={inputClass}
              >
                <option value="Mandatory">Bắt buộc cọc cho tất cả dịch vụ online</option>
                <option value="HighValueOnly">Chỉ bắt buộc cọc cho hóa đơn trên 500.000đ</option>
                <option value="Optional">Tùy chọn (Khách có thể bỏ qua cọc)</option>
              </BeautifulSelect>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thời gian đặt trước tối thiểu (giờ)</label>
                <input
                  type="number"
                  value={configSettings.minAdvanceNoticeHours}
                  onChange={(e) =>
                    setConfigSettings((prev) => ({ ...prev, minAdvanceNoticeHours: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mở lịch trước tối đa (ngày)</label>
                <input
                  type="number"
                  value={configSettings.maxAdvanceNoticeDays}
                  onChange={(e) =>
                    setConfigSettings((prev) => ({ ...prev, maxAdvanceNoticeDays: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Deposit Update Mini Modal */}
      {depositModalOpen && selectedBooking && (
        <Modal
          isOpen={true}
          onClose={() => setDepositModalOpen(false)}
          maxWidth="md"
          zIndex="z-[140]"
          closeOnOverlayClick={false}
          className="border border-pink-100 bg-white shadow-2xl"
          headerClassName="border-b border-pink-100/80 bg-white"
          footerClassName="border-t border-pink-100/80 bg-pink-50/20"
          title="Cập nhật thông tin tiền cọc"
          subtitle={`Mã lịch: #${selectedBooking.id} · Khách hàng: ${selectedBooking.customerName}`}
          headerIcon={<CreditCard className="h-5 w-5 text-pink-600" />}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setDepositModalOpen(false)}
                className="rounded-xl border border-pink-100 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDepositModalSubmit}
                className="rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-black text-white shadow-2xs hover:bg-pink-700 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Tiếp tục / Lưu thông tin
              </button>
            </div>
          }
        >
          <form onSubmit={handleDepositModalSubmit} className="space-y-4 text-xs">
            {/* Status Selection */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">Trạng thái cọc mong muốn</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'UNPAID', label: 'Chưa cọc', badge: 'border-rose-200 bg-rose-50 text-rose-800' },
                  { key: 'PENDING_VERIFICATION', label: 'Chờ xác minh', badge: 'border-amber-300 bg-amber-50 text-amber-900' },
                  { key: 'PAID', label: 'Đã đặt cọc', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setDepositInputStatus(st.key as any)}
                    className={`rounded-xl border p-2.5 text-center text-xs font-black transition-all ${
                      depositInputStatus === st.key
                        ? `border-2 ring-2 ring-pink-500/20 ${st.badge} shadow-2xs`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 1: Số tiền cọc */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                Số tiền cọc <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={depositInputAmount}
                  onChange={(e) => setDepositInputAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-pink-100 bg-white p-2.5 pr-12 text-sm font-black text-slate-900 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                  required
                />
                <span className="absolute right-3 top-2.5 font-bold text-xs text-slate-400 pointer-events-none">
                  VNĐ
                </span>
              </div>

              {/* Quick Amount Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400">Gợi ý nhanh:</span>
                {[100000, 200000, 300000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositInputAmount(amt)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                      depositInputAmount === amt
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-pink-50/50'
                    }`}
                  >
                    {money(amt)}
                  </button>
                ))}
                {selectedBooking.totalEstimatedPrice > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDepositInputAmount(
                        Math.round((selectedBooking.totalEstimatedPrice * 0.3) / 10000) * 10000 || 300000
                      )
                    }
                    className="rounded-lg border border-pink-200 bg-pink-50/80 px-2.5 py-1 text-[11px] font-bold text-pink-700 hover:bg-pink-100"
                  >
                    30% Tổng đơn
                  </button>
                )}
              </div>
            </div>

            {/* Field 2: Phương thức thanh toán */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                Phương thức thanh toán <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { key: 'MOMO', label: 'MoMo', sub: 'Ví MoMo' },
                  { key: 'VNPAY', label: 'VNPay', sub: 'Cổng VNPay' },
                  { key: 'BANK_TRANSFER', label: 'Bank Transfer', sub: 'Chuyển khoản' },
                  { key: 'CASH', label: 'Tiền mặt', sub: 'Tại quầy' },
                ].map((m) => {
                  const isSelected = depositInputMethod === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setDepositInputMethod(m.key as any)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                        isSelected
                          ? 'border-2 border-pink-600 bg-pink-50/90 ring-2 ring-pink-500/20 font-black text-pink-950 shadow-2xs'
                          : 'border-pink-100 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50/30'
                      }`}
                    >
                      <span className="text-xs font-black">{m.label}</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">{m.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 3: Thời gian thanh toán */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">Thời gian thanh toán</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={depositInputPaidAt}
                  onChange={(e) => setDepositInputPaidAt(e.target.value)}
                  placeholder="11/08/2026 · 19:44"
                  className="w-full rounded-xl border border-pink-100 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const dd = String(now.getDate()).padStart(2, '0');
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const yyyy = now.getFullYear();
                    const hh = String(now.getHours()).padStart(2, '0');
                    const min = String(now.getMinutes()).padStart(2, '0');
                    setDepositInputPaidAt(`${dd}/${mm}/${yyyy} · ${hh}:${min}`);
                  }}
                  className="shrink-0 rounded-xl border border-pink-100 bg-pink-50 px-3 py-2 text-[11px] font-bold text-pink-700 hover:bg-pink-100 transition-colors"
                >
                  Hiện tại
                </button>
              </div>
            </div>

            {/* Field 4: Mã giao dịch & Ghi chú (optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">Mã giao dịch (Nếu có)</label>
                <input
                  type="text"
                  value={depositInputTxId}
                  onChange={(e) => setDepositInputTxId(e.target.value)}
                  placeholder="MM-921820"
                  className="w-full rounded-xl border border-pink-100 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  value={depositInputNote}
                  onChange={(e) => setDepositInputNote(e.target.value)}
                  placeholder="Ví dụ: Đã thu tiền cọc tại quầy..."
                  className="w-full rounded-xl border border-pink-100 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Double-Check Confirmation Modal for Final Deposit Verification */}
      {confirmStepOpen && selectedBooking && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmStepOpen(false)}
          maxWidth="md"
          zIndex="z-[150]"
          closeOnOverlayClick={false}
          className="border border-emerald-200 bg-white shadow-2xl"
          headerClassName="border-b border-emerald-100 bg-emerald-50/50"
          footerClassName="border-t border-emerald-100 bg-emerald-50/30"
          title="Xác nhận đã nhận tiền cọc"
          subtitle="Vui lòng kiểm tra kỹ thông tin đối soát trước khi xác nhận."
          headerIcon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setConfirmStepOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy / Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={handleConfirmDepositFinal}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-2xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Xác nhận chính xác
              </button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Chi tiết tiền cọc xác nhận
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500">Khách hàng:</span>
                  <p className="font-extrabold text-slate-900">{selectedBooking.customerName}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Mã đặt lịch:</span>
                  <p className="font-mono font-bold text-pink-600">#{selectedBooking.id}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Số tiền cọc:</span>
                  <p className="text-base font-black text-emerald-700">{money(depositInputAmount)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Phương thức:</span>
                  <p className="font-extrabold text-slate-800">{depositMethodLabel(depositInputMethod)}</p>
                </div>
              </div>

              {depositInputTxId && (
                <div className="pt-2 border-t border-emerald-200/80 text-[11px] font-mono text-emerald-900">
                  Mã giao dịch: <strong>#{depositInputTxId}</strong>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 border border-amber-200/80 text-amber-900">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-4 font-medium">
                Thao tác này sẽ chuyển lịch sang <strong>✓ Đã đặt cọc</strong> và tự động ghi log minh bạch vào lịch sử giao dịch.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjustment / Refund Mini Modal */}
      {adjustModalOpen && selectedBooking && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustModalOpen(false)}
          maxWidth="md"
          zIndex="z-[140]"
          closeOnOverlayClick={false}
          className="border border-pink-100 bg-white shadow-2xl"
          headerClassName="border-b border-pink-100/80 bg-white"
          footerClassName="border-t border-pink-100/80 bg-pink-50/20"
          title="Điều chỉnh hoặc Hoàn tiền cọc"
          subtitle={`Xử lý điều chỉnh tiền cọc cho lịch #${selectedBooking.id} (${selectedBooking.customerName})`}
          headerIcon={<RefreshCw className="h-5 w-5 text-pink-600" />}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-xl border border-pink-100 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                className="rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-black text-white shadow-2xs hover:bg-pink-700 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Lưu điều chỉnh & Ghi log
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Toggle Type */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">Loại thao tác</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('REFUND')}
                  className={`rounded-xl border p-3 text-center text-xs font-black transition-all ${
                    adjustType === 'REFUND'
                      ? 'border-2 border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Hoàn tiền cọc (Refund)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('ADJUST')}
                  className={`rounded-xl border p-3 text-center text-xs font-black transition-all ${
                    adjustType === 'ADJUST'
                      ? 'border-2 border-pink-500 bg-pink-50 text-pink-900 ring-2 ring-pink-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Điều chỉnh số tiền cọc
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                {adjustType === 'REFUND' ? 'Số tiền hoàn cho khách' : 'Số tiền cọc mới'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-pink-100 bg-white p-2.5 pr-12 text-sm font-black text-slate-900 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                />
                <span className="absolute right-3 top-2.5 font-bold text-xs text-slate-400 pointer-events-none">
                  VNĐ
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                Lý do điều chỉnh / hoàn cọc <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ví dụ: Khách đổi sang dịch vụ ít tiền hơn, hoặc hoàn cọc do báo hủy trước 24h..."
                className="w-full rounded-xl border border-pink-100 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 min-h-[70px]"
                required
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
