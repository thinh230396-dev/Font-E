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
  Clock3,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Info,
  Layers,
  MapPin,
  Phone,
  PhoneCall,
  Plus,
  RefreshCcw,
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
  depositStatus: 'PAID' | 'UNPAID';
  depositMethod?: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER';
  depositTransactionId?: string;
  depositPaidAt?: string;
  
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

const initialMobileBookingsSeed: MobileAppBooking[] = [
  {
    id: 'BK-260729-088',
    customerName: 'Nguyễn Minh Anh',
    customerPhone: '0903 812 682',
    branch: 'Q3',
    date: '29/07/2026',
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
    depositPaidAt: '29/07/2026 · 08:15',
    requestedTechnicianId: 'TECH-01',
    requestedTechnicianName: 'Nguyễn Thị Hoa',
    assignedTechnicianId: 'TECH-01',
    assignedTechnicianName: 'Nguyễn Thị Hoa',
    assignedStation: 'Ghế Nail Spa #02',
    source: 'Customer Mobile App',
    status: 'DEPOSITED',
    customerNotes: 'Khách muốn tư vấn màu hợp tông da ngăm và xin đến sớm 10 phút.',
    createdAt: '29/07/2026 · 08:15',
    updatedAt: '29/07/2026 · 08:20',
  },
  {
    id: 'BK-260729-087',
    customerName: 'Trần Thu Hà',
    customerPhone: '0986 422 190',
    branch: 'Q1',
    date: '29/07/2026',
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
    depositPaidAt: '29/07/2026 · 08:40',
    requestedTechnicianId: 'TECH-04',
    requestedTechnicianName: 'Vũ Kim Anh',
    assignedTechnicianId: 'TECH-04',
    assignedTechnicianName: 'Vũ Kim Anh',
    assignedStation: 'Ghế Foot Spa #01',
    source: 'Customer Mobile App',
    status: 'CONFIRMED',
    customerNotes: 'Móng chân nhạy cảm, nhờ KTV nhặt da nhẹ nhàng.',
    createdAt: '29/07/2026 · 08:40',
    updatedAt: '29/07/2026 · 08:45',
  },
  {
    id: 'BK-260729-086',
    customerName: 'Lê Ngọc Mai',
    customerPhone: '0918 630 447',
    branch: 'Q3',
    date: '29/07/2026',
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
    createdAt: '29/07/2026 · 09:10',
    updatedAt: '29/07/2026 · 09:10',
  },
  {
    id: 'BK-260729-085',
    customerName: 'Vũ Khánh Linh',
    customerPhone: '0932 155 860',
    branch: 'Q3',
    date: '29/07/2026',
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
    depositPaidAt: '29/07/2026 · 09:30',
    requestedTechnicianId: 'TECH-05',
    requestedTechnicianName: 'Phạm Yến Nhi',
    assignedTechnicianId: 'TECH-05',
    assignedTechnicianName: 'Phạm Yến Nhi',
    source: 'Customer Mobile App',
    status: 'NEEDS_ADJUSTMENT',
    proposedTime: '15:30',
    proposedDate: '29/07/2026',
    customerNotes: 'Khách đính đá full 10 ngón.',
    receptionistNotes: 'KTV bận ca trước đến 15:15, đã đề xuất lùi lại 30 phút.',
    createdAt: '29/07/2026 · 09:30',
    updatedAt: '29/07/2026 · 10:00',
  },
  {
    id: 'BK-260729-084',
    customerName: 'Phạm Gia Hân',
    customerPhone: '0908 731 266',
    branch: 'Q1',
    date: '29/07/2026',
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
    depositPaidAt: '28/07/2026 · 20:10',
    requestedTechnicianId: 'TECH-02',
    requestedTechnicianName: 'Trần Thu Trang',
    assignedTechnicianId: 'TECH-02',
    assignedTechnicianName: 'Trần Thu Trang',
    assignedStation: 'Bàn Nail #01',
    source: 'Customer Mobile App',
    status: 'ARRIVED',
    customerNotes: 'Khách đến đúng giờ.',
    createdAt: '28/07/2026 · 20:10',
    updatedAt: '29/07/2026 · 09:25',
  },
  {
    id: 'BK-260729-083',
    customerName: 'Hoàng Yến Nhi',
    customerPhone: '0977 123 456',
    branch: 'Q1',
    date: '29/07/2026',
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
    depositPaidAt: '28/07/2026 · 18:30',
    requestedTechnicianId: 'ANY',
    requestedTechnicianName: 'Bất kỳ / Tự động gán',
    assignedTechnicianId: 'TECH-02',
    assignedTechnicianName: 'Trần Thu Trang',
    assignedStation: 'Bàn Nail #03',
    source: 'Customer Mobile App',
    status: 'IN_PROGRESS',
    createdAt: '28/07/2026 · 18:30',
    updatedAt: '29/07/2026 · 14:05',
  },
  {
    id: 'BK-260729-082',
    customerName: 'Đỗ Thanh Vân',
    customerPhone: '0912 345 678',
    branch: 'Q3',
    date: '29/07/2026',
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
    depositPaidAt: '28/07/2026 · 15:40',
    assignedTechnicianId: 'TECH-06',
    assignedTechnicianName: 'Ngô Thùy Dương',
    assignedStation: 'Ghế Foot Spa #02',
    source: 'Customer Mobile App',
    status: 'COMPLETED',
    createdAt: '28/07/2026 · 15:40',
    updatedAt: '29/07/2026 · 10:30',
  },
  {
    id: 'BK-260729-081',
    customerName: 'Nguyễn Bích Trâm',
    customerPhone: '0938 990 112',
    branch: 'Q1',
    date: '29/07/2026',
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
    createdAt: '28/07/2026 · 11:20',
    updatedAt: '28/07/2026 · 16:00',
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
];

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const branchName = (branch: BranchCode | 'ALL') =>
  branch === 'ALL'
    ? 'Tất cả chi nhánh'
    : branch === 'Q1'
    ? 'Chi nhánh Quận 1'
    : 'Chi nhánh Quận 3';

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
      return stored ? JSON.parse(stored) : initialMobileBookingsSeed;
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
      setChosenTechId(selectedBooking.assignedTechnicianId || selectedBooking.requestedTechnicianId || 'ANY');
      setValidationError('');
      setProposeOpen(false);
      setCancelOpen(false);
    }
  }, [selectedBooking]);

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
      if (dateFilter === 'TODAY' && item.date !== '29/07/2026') return false;

      // Search Query
      if (query) {
        const fullStr = `${item.id} ${item.customerName} ${item.customerPhone} ${item.serviceName} ${item.nailDesignName || ''}`.toLocaleLowerCase('vi');
        if (!fullStr.includes(query)) return false;
      }

      return true;
    });
  }, [bookings, selectedBranch, statusFilter, depositFilter, serviceFilter, techFilter, dateFilter, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const scoped = bookings.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch);

    return {
      pending: scoped.filter((b) => b.status === 'PENDING').length,
      confirmed: scoped.filter((b) => b.status === 'CONFIRMED').length,
      deposited: scoped.filter((b) => b.status === 'DEPOSITED').length,
      needsAdjustment: scoped.filter((b) => b.status === 'NEEDS_ADJUSTMENT').length,
      cancelled: scoped.filter((b) => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length,
      todayCount: scoped.filter((b) => b.date === '29/07/2026').length,
      depositedAmount: scoped
        .filter((b) => b.depositStatus === 'PAID')
        .reduce((sum, b) => sum + b.depositAmount, 0),
    };
  }, [bookings, selectedBranch]);

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
    const hasConflict = tech.busySlots.some((slot) => {
      const [start, end] = slot.split('-');
      return bookingTime >= start && bookingTime <= end;
    });

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
  const handleConfirmBooking = (booking: MobileAppBooking) => {
    if (!requireManage()) return;

    // Validate Tech
    const techCheck = checkTechnicianAvailability(chosenTechId, booking);
    if (!techCheck.ok) {
      setValidationError(techCheck.message);
      return;
    }

    // Validate Station
    const stationCheck = checkStationAvailability(booking);
    if (!stationCheck.ok) {
      setValidationError(stationCheck.message);
      return;
    }

    // Success confirmation
    const newStatus: OnlineBookingStatus = booking.depositStatus === 'PAID' ? 'DEPOSITED' : 'CONFIRMED';
    const assignedTechObj = technicians.find((t) => t.id === chosenTechId);

    const updatedBooking: MobileAppBooking = {
      ...booking,
      status: newStatus,
      assignedTechnicianId: chosenTechId,
      assignedTechnicianName: assignedTechObj ? assignedTechObj.name : 'Tự động phân bổ',
      assignedStation: booking.assignedStation || (booking.branch === 'Q1' ? 'Bàn Nail #02' : 'Ghế Spa #03'),
      updatedAt: `29/07/2026 · vừa xong`,
    };

    setBookings((prev) => prev.map((item) => (item.id === booking.id ? updatedBooking : item)));
    setSelectedBooking(updatedBooking);
    setNotice(`Đã xác nhận thành công lịch hẹn ${booking.id} cho ${booking.customerName}.`);
    setValidationError('');
  };

  // Action: Propose Alternative Time
  const handleProposeTime = (e: FormEvent, booking: MobileAppBooking) => {
    e.preventDefault();
    if (!requireManage()) return;

    if (!proposeTime || !proposeDate) {
      setValidationError('Vui lòng chọn ngày và giờ đề xuất mới.');
      return;
    }

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
  const handleCancelBooking = (e: FormEvent, booking: MobileAppBooking) => {
    e.preventDefault();
    if (!requireManage()) return;

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
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-violet-600">
            <Smartphone className="h-4 w-4" />
            Customer Mobile App Receiver
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Tiếp nhận & Quản lý Đặt lịch Mobile App
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">
            Kênh tiếp nhận dành riêng cho Lễ tân và Tenant Admin để duyệt, phân bổ kỹ thuật viên, kiểm tra ghế trống & xử lý các lịch hẹn khách đặt từ ứng dụng Mobile.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText('https://app.salonsys.vn/customer-booking');
              setNotice('Đã sao chép đường dẫn kết nối Customer Mobile App.');
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Copy className="h-4 w-4 text-slate-400" />
            Liên kết Mobile App
          </button>
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            disabled={!canManage}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-4 text-xs font-black text-violet-700 shadow-xs hover:bg-violet-100"
          >
            <Settings2 className="h-4 w-4" />
            Quy tắc duyệt
          </button>
        </div>
      </section>

      {/* SECTION 1: Quick Statistics (Thống kê nhanh) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {/* Card 1: Chờ xác nhận */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === 'PENDING'
              ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/30'
              : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700">
              Chờ xác nhận
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock3 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
            <p className="mt-1 text-[10px] font-semibold text-amber-600">Cần duyệt ngay</p>
          </div>
        </button>

        {/* Card 2: Đã xác nhận */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === 'CONFIRMED'
              ? 'border-blue-400 bg-blue-500/10 ring-2 ring-blue-400/30'
              : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">
              Đã xác nhận
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{stats.confirmed}</p>
            <p className="mt-1 text-[10px] font-semibold text-blue-600">Đã giữ chỗ làm</p>
          </div>
        </button>

        {/* Card 3: Đã đặt cọc */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'DEPOSITED' ? 'ALL' : 'DEPOSITED')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === 'DEPOSITED'
              ? 'border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400/30'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
              Đã đặt cọc
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{stats.deposited}</p>
            <p className="mt-1 text-[10px] font-semibold text-emerald-600">
              {money(stats.depositedAmount)} đã nhận
            </p>
          </div>
        </button>

        {/* Card 4: Cần xử lý / điều chỉnh */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'NEEDS_ADJUSTMENT' ? 'ALL' : 'NEEDS_ADJUSTMENT')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === 'NEEDS_ADJUSTMENT'
              ? 'border-orange-400 bg-orange-500/10 ring-2 ring-orange-400/30'
              : 'border-slate-200 bg-white hover:border-orange-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-orange-700">
              Cần xử lý
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{stats.needsAdjustment}</p>
            <p className="mt-1 text-[10px] font-semibold text-orange-600">Chờ khách phản hồi</p>
          </div>
        </button>

        {/* Card 5: Đã hủy */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'CANCELLED' ? 'ALL' : 'CANCELLED')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === 'CANCELLED'
              ? 'border-rose-400 bg-rose-500/10 ring-2 ring-rose-400/30'
              : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-rose-700">
              Đã hủy
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{stats.cancelled}</p>
            <p className="mt-1 text-[10px] font-semibold text-rose-600">Hủy hoặc No-show</p>
          </div>
        </button>

        {/* Card 6: Lịch hẹn hôm nay */}
        <button
          type="button"
          onClick={() => setDateFilter(dateFilter === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            dateFilter === 'TODAY'
              ? 'border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-400/30'
              : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-700">
              Lịch hôm nay
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{stats.todayCount}</p>
            <p className="mt-1 text-[10px] font-semibold text-indigo-600">Ngày 29/07/2026</p>
          </div>
        </button>
      </section>

      {/* SECTION 2 & 3: Filter Bar & Table View */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-xs">
        {/* SECTION 3: Filter controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Tìm theo tên khách hàng, số điện thoại, mã booking..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Bộ lọc:
              </span>
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
                className="text-xs font-extrabold text-violet-600 hover:underline px-2"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3 2xl:grid-cols-6">
            {/* Status Filter */}
            <BeautifulSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(bookingStatusMeta).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </BeautifulSelect>

            {/* Deposit Filter */}
            <BeautifulSelect
              value={depositFilter}
              onChange={(e) => setDepositFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">Tất cả tiền cọc</option>
              <option value="PAID">Đã cọc</option>
              <option value="UNPAID">Chưa cọc</option>
            </BeautifulSelect>

            {/* Branch Filter */}
            <BeautifulSelect
              value={selectedBranch}
              onChange={(e) => onSelectedBranchChange(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              <option value="Q1">Chi nhánh Quận 1</option>
              <option value="Q3">Chi nhánh Quận 3</option>
            </BeautifulSelect>

            {/* Service Filter */}
            <BeautifulSelect
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">Tất cả dịch vụ</option>
              <option value="SVC-001">Nail Art Premium</option>
              <option value="SVC-002">Combo Manicure & Sơn Gel</option>
              <option value="SVC-003">Pedicure Spa Chuyên Sâu</option>
              <option value="SVC-004">Đắp Gel Nối Móng</option>
              <option value="SVC-005">Acrylic Full Set</option>
            </BeautifulSelect>

            {/* Technician Filter */}
            <BeautifulSelect
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">Tất cả KTV</option>
              <option value="ANY">Tự động / Khách không chọn KTV</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} ({tech.branch})
                </option>
              ))}
            </BeautifulSelect>

            {/* Date Filter */}
            <BeautifulSelect
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">Tất cả ngày</option>
              <option value="TODAY">Hôm nay (29/07/2026)</option>
            </BeautifulSelect>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold text-slate-500">
              Hiển thị <span className="font-black text-slate-900">{filteredBookings.length}</span> / {bookings.length} lịch hẹn
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {filteredBookings.some((booking) => booking.status === 'PENDING') && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {filteredBookings.filter((booking) => booking.status === 'PENDING').length} lịch chờ xác nhận
                </span>
              )}
              {filteredBookings.some((booking) => booking.status === 'NEEDS_ADJUSTMENT') && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {filteredBookings.filter((booking) => booking.status === 'NEEDS_ADJUSTMENT').length} lịch cần điều chỉnh
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: List of Mobile App Bookings */}
        {/* Desktop & Tablet Table View */}
        <div className="hidden 2xl:block overflow-x-auto bg-white">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[23%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-3 pl-5 pr-3">Khách hàng</th>
                <th className="px-3 py-3">Lịch hẹn</th>
                <th className="px-3 py-3">Dịch vụ</th>
                <th className="px-3 py-3">Kỹ thuật viên</th>
                <th className="px-3 py-3">Thanh toán</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="py-3 pl-2 pr-4 text-right">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBookings.map((booking) => {
                const statusInfo = bookingStatusMeta[booking.status];
                const isUrgentPending = booking.status === 'PENDING';
                const isUrgentAdjustment = booking.status === 'NEEDS_ADJUSTMENT';

                let rowBorderClass = 'border-l-[3px] border-l-transparent hover:bg-slate-50/80';
                if (isUrgentPending) {
                  rowBorderClass = 'border-l-[3px] border-l-amber-500 bg-amber-50/20 hover:bg-amber-50/45';
                } else if (isUrgentAdjustment) {
                  rowBorderClass = 'border-l-[3px] border-l-orange-500 bg-orange-50/20 hover:bg-orange-50/45';
                }

                return (
                  <tr
                    key={booking.id}
                    className={`group cursor-pointer align-middle transition-colors ${rowBorderClass}`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <td className="py-3.5 pl-5 pr-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200/70 bg-violet-100 text-xs font-black text-violet-700">
                          {booking.customerName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xs font-black leading-4 text-slate-900">
                            {booking.customerName}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            {booking.customerPhone}
                          </p>
                          <span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-500">
                            {booking.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 align-middle">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                          <Clock3 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900">{booking.time}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">{booking.date}</p>
                        </div>
                      </div>
                      <p className="mt-2 flex items-start gap-1 text-[10px] font-semibold leading-4 text-slate-600">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                        <span>{branchName(booking.branch)}</span>
                      </p>
                    </td>

                    <td className="px-3 py-3.5 align-middle">
                      <div className="min-w-0">
                        <p className="text-xs font-black leading-4 text-slate-900">
                          {booking.serviceName}
                        </p>
                        {booking.nailDesignName && booking.nailDesignName !== 'Không chọn mẫu' ? (
                          <p className="mt-1 flex items-start gap-1 text-[10px] font-semibold leading-4 text-violet-700">
                            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
                            <span className="line-clamp-2">{booking.nailDesignName}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] font-medium italic text-slate-400">Không chọn mẫu trước</p>
                        )}
                        <p className="mt-2 text-[10px] font-medium text-slate-500">
                          Dự kiến <span className="ml-1 font-black text-slate-900">{money(booking.totalEstimatedPrice)}</span>
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 align-middle">
                      {booking.requestedTechnicianName && booking.requestedTechnicianName !== 'Bất kỳ / Tự động gán' ? (
                        <div className="flex items-start gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <UsersRound className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-xs font-bold leading-4 text-slate-800">{booking.requestedTechnicianName}</p>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Khách yêu cầu</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <UsersRound className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-600">Tự động phân bổ</p>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Không yêu cầu KTV</p>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3.5 align-middle">
                      {booking.depositStatus === 'PAID' ? (
                        <div>
                          <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Check className="h-3 w-3 shrink-0" />
                            Đã đặt cọc
                          </p>
                          <p className="mt-0.5 text-xs font-black text-slate-900">{money(booking.depositAmount)}</p>
                          <p className="mt-1 text-[9px] font-semibold text-slate-400">
                            {booking.depositMethod || 'Mobile App'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                            Chưa cọc
                          </span>
                          <p className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                            <Smartphone className="h-3 w-3" />
                            Mobile App
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3.5 align-middle">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold leading-4 ${statusInfo.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </td>

                    <td className="py-3.5 pl-2 pr-4 text-right align-middle">
                      <div
                        className="flex flex-col items-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setCallingBooking(booking)}
                          aria-label={`Gọi cho ${booking.customerName}`}
                          title={`Gọi cho ${booking.customerName}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          aria-label={`Xử lý lịch ${booking.id}`}
                          title="Xử lý chi tiết"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs transition hover:bg-violet-700"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredBookings.length && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-slate-600">Không tìm thấy lịch hẹn online phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Small Screen Responsive Card View */}
        <div className="block space-y-3 p-4 2xl:hidden">
          {filteredBookings.map((booking) => {
            const statusInfo = bookingStatusMeta[booking.status];
            const needsUrgentAction = booking.status === 'PENDING' || booking.status === 'NEEDS_ADJUSTMENT';

            return (
              <div
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className={`rounded-2xl border p-4 shadow-2xs hover:border-violet-300 transition space-y-3 cursor-pointer ${
                  needsUrgentAction
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header: Customer Name (Bold) + Phone, Code, Status */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xs font-black text-violet-700 border border-violet-200/50">
                      {booking.customerName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-slate-900 text-sm truncate">{booking.customerName}</p>
                        <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/70 shrink-0">
                          {booking.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        {booking.customerPhone}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black shrink-0 ${statusInfo.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                </div>

                {/* Date & Time + Branch + Requested Tech */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thời gian & Chi nhánh</p>
                    <p className="font-black text-slate-900 text-sm mt-0.5 flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5 text-violet-600" />
                      {booking.time} <span className="text-xs font-normal text-slate-500">({booking.date})</span>
                    </p>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">{branchName(booking.branch)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KTV yêu cầu</p>
                    <p className="font-bold text-slate-800 mt-0.5 truncate">
                      {booking.requestedTechnicianName && booking.requestedTechnicianName !== 'Bất kỳ / Tự động gán'
                        ? booking.requestedTechnicianName
                        : 'Không yêu cầu'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-700 font-semibold mt-0.5">
                      <Smartphone className="h-3 w-3" /> Mobile App
                    </span>
                  </div>
                </div>

                {/* Service & Deposit details */}
                <div className="rounded-xl bg-white p-3 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{booking.serviceName}</p>
                      {booking.nailDesignName && booking.nailDesignName !== 'Không chọn mẫu' ? (
                        <p className="text-[11px] text-violet-700 font-medium truncate max-w-[200px] mt-0.5">
                          💅 {booking.nailDesignName}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic mt-0.5">Không chọn mẫu trước</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-slate-500 font-medium">Dự kiến</p>
                      <p className="font-black text-violet-700 text-xs">{money(booking.totalEstimatedPrice)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-medium">Trạng thái cọc:</span>
                    {booking.depositStatus === 'PAID' ? (
                      <span className="font-black text-emerald-700 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Đã cọc {money(booking.depositAmount)} ({booking.depositMethod || 'App'})
                      </span>
                    ) : (
                      <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Chưa cọc
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setCallingBooking(booking)}
                    className="flex-1 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-2xs"
                  >
                    <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                    Gọi điện
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="flex-1 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-xs font-black text-white shadow-xs hover:bg-violet-700"
                  >
                    Xử lý chi tiết
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {!filteredBookings.length && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-bold text-slate-600">Không tìm thấy lịch hẹn online phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: Processing & Detail Modal */}
      {selectedBooking && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBooking(null)}
          maxWidth="3xl"
          title={
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-violet-700">{selectedBooking.id}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-black ring-1 ${
                  bookingStatusMeta[selectedBooking.status].badge
                }`}
              >
                {bookingStatusMeta[selectedBooking.status].label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700">
                <Smartphone className="h-3 w-3" /> Mobile App
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
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
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
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle className="h-4 w-4" /> Từ chối / Hủy lịch
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProposeOpen(true);
                        setCancelOpen(false);
                      }}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 text-xs font-bold text-orange-700 hover:bg-orange-100"
                    >
                      <CalendarClock className="h-4 w-4" /> Đề xuất giờ khác
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConfirmBooking(selectedBooking)}
                      disabled={!canManage}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Xác nhận lịch hẹn
                    </button>
                  </>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Validation Error Banner */}
            {validationError && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 animate-fadeIn">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-extrabold text-sm text-rose-900">Không thể xác nhận lịch hẹn</p>
                  <p className="mt-1 leading-5">{validationError}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Switch to ANY or first available tech
                        const availTech = technicians.find((t) => t.status === 'WORKING' && t.branch === selectedBooking.branch);
                        setChosenTechId(availTech ? availTech.id : 'ANY');
                        setValidationError('');
                      }}
                      className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-rose-800 shadow-xs hover:bg-rose-100"
                    >
                      Đổi sang KTV rảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProposeOpen(true);
                        setValidationError('');
                      }}
                      className="rounded-lg bg-rose-200/70 px-3 py-1.5 text-[11px] font-bold text-rose-900 hover:bg-rose-200"
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-black text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" /> Dịch vụ do khách chọn
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{selectedBooking.serviceId}</span>
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">{selectedBooking.serviceName}</p>
                  <p className="text-slate-500 font-semibold mt-0.5">
                    Giá dịch vụ nền: {money(selectedBooking.servicePrice)} · Thời lượng {selectedBooking.serviceDuration} phút
                  </p>
                </div>

                {selectedBooking.nailDesignName && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3">
                    <p className="font-extrabold text-violet-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                      Mẫu Nail: {selectedBooking.nailDesignName}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-slate-600 font-semibold text-[11px]">
                      <span>Phụ thu thiết kế / đính đá:</span>
                      <span className="font-black text-violet-700">+{money(selectedBooking.nailDesignExtraFee)}</span>
                    </div>
                    {selectedBooking.nailColor && (
                      <p className="mt-1 text-[11px] text-violet-700 font-medium">
                        Màu sơn yêu cầu: <strong>{selectedBooking.nailColor}</strong>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 font-bold text-slate-900">
                  <span>Tổng tiền dự kiến:</span>
                  <span className="text-base font-black text-violet-700">{money(selectedBooking.totalEstimatedPrice)}</span>
                </div>
              </div>

              {/* Box 2: Tiền cọc & Chi nhánh */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-black text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Tiền cọc & Địa điểm
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-bold text-slate-700 border border-slate-200">
                    {branchName(selectedBooking.branch)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Trạng thái cọc:</span>
                    {selectedBooking.depositStatus === 'PAID' ? (
                      <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Đã cọc {money(selectedBooking.depositAmount)}
                      </span>
                    ) : (
                      <span className="font-extrabold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> Chưa thanh toán tiền cọc
                      </span>
                    )}
                  </div>

                  {selectedBooking.depositStatus === 'PAID' && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] space-y-1 text-emerald-900">
                      <p className="font-bold">Cổng thanh toán: {selectedBooking.depositMethod || 'MoMo QR'}</p>
                      <p className="font-mono text-[10px] text-emerald-700">Mã GD: #{selectedBooking.depositTransactionId}</p>
                      <p className="text-[10px] text-emerald-600">Thanh toán lúc {selectedBooking.depositPaidAt}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-600 font-medium">Còn lại thanh toán tại quầy:</span>
                    <span className="font-black text-slate-900 text-sm">
                      {money(selectedBooking.totalEstimatedPrice - selectedBooking.depositAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Availability Verification Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <h3 className="font-black text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-violet-600" /> Kiểm tra điều kiện giữ chỗ & kỹ thuật viên
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Check 1: Khung giờ */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Clock3 className="h-3 w-3 text-blue-500" /> Khung giờ hẹn
                  </p>
                  <p className="font-black text-slate-900 text-sm">{selectedBooking.time} · {selectedBooking.date}</p>
                  <p className="text-[10px] font-semibold text-emerald-600">Trong giờ mở cửa salon</p>
                </div>

                {/* Check 2: Ghế làm */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Layers className="h-3 w-3 text-violet-500" /> Ghế / Khu vực làm
                  </p>
                  <p className="font-black text-slate-900 text-sm">
                    {selectedBooking.assignedStation || (selectedBooking.branch === 'Q1' ? 'Bàn Nail #02' : 'Ghế Spa #03')}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600">
                    {checkStationAvailability(selectedBooking).message}
                  </p>
                </div>

                {/* Check 3: KTV Yêu cầu vs Phân bổ */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <UsersRound className="h-3 w-3 text-fuchsia-500" /> KTV do khách chọn
                  </p>
                  <p className="font-black text-slate-900 text-sm">
                    {selectedBooking.requestedTechnicianName || 'Tự động gán'}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-600">
                    Yêu cầu ban đầu từ Mobile App
                  </p>
                </div>
              </div>

              {/* Technician Selector with Live Working Status */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Gán hoặc Đổi Kỹ thuật viên phụ trách:
                </label>
                <BeautifulSelect
                  value={chosenTechId}
                  onChange={(e) => {
                    setChosenTechId(e.target.value);
                    setValidationError('');
                  }}
                  className={inputClass}
                >
                  <option value="ANY">-- Tự động phân bổ KTV rảnh --</option>
                  {technicians
                    .filter((t) => t.branch === selectedBooking.branch)
                    .map((tech) => {
                      const avail = checkTechnicianAvailability(tech.id, selectedBooking);
                      const statusTag = !avail.ok
                        ? `[🔴 ${avail.message}]`
                        : tech.status === 'WORKING'
                        ? '[🟢 Sẵn sàng]'
                        : '[🟡 Khác]';

                      return (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} · {tech.specialty} {statusTag}
                        </option>
                      );
                    })}
                </BeautifulSelect>
              </div>
            </div>

            {/* Notes from customer */}
            {selectedBooking.customerNotes && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3.5 text-violet-900">
                <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-violet-800">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" /> Ghi chú từ khách hàng (Mobile App)
                </p>
                <p className="mt-1 leading-5 text-slate-700 font-medium">{selectedBooking.customerNotes}</p>
              </div>
            )}

            {/* Rejection or Proposed Time Notes */}
            {selectedBooking.receptionistNotes && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-900">
                <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-amber-800">
                  <Info className="h-3.5 w-3.5 text-amber-600" /> Ghi chú điều chỉnh từ salon
                </p>
                <p className="mt-1 leading-5 font-semibold">{selectedBooking.receptionistNotes}</p>
              </div>
            )}

            {selectedBooking.rejectionReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-rose-900">
                <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-rose-800">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" /> Lý do từ chối / Hủy lịch
                </p>
                <p className="mt-1 leading-5 font-semibold">{selectedBooking.rejectionReason}</p>
              </div>
            )}

            {/* Sub-form: Propose Alternative Time */}
            {proposeOpen && (
              <form
                onSubmit={(e) => handleProposeTime(e, selectedBooking)}
                className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                  <h4 className="font-black text-orange-900 text-sm flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-orange-600" /> Đề xuất ngày/giờ mới cho khách
                  </h4>
                  <button
                    type="button"
                    onClick={() => setProposeOpen(false)}
                    className="text-orange-700 hover:text-orange-950 font-bold text-xs"
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
                      placeholder="29/07/2026"
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
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 min-h-[70px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setProposeOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-orange-700 flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Gửi đề xuất tới Mobile App
                  </button>
                </div>
              </form>
            )}

            {/* Sub-form: Reject / Cancel Booking */}
            {cancelOpen && (
              <form
                onSubmit={(e) => handleCancelBooking(e, selectedBooking)}
                className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
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
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 min-h-[60px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCancelOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-rose-700 flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Xác nhận Hủy/Từ chối
                  </button>
                </div>
              </form>
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
          title="Cuộc gọi trao đổi với khách hàng"
          subtitle={`Đang kết nối tới: ${callingBooking.customerName} (${callingBooking.customerPhone})`}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setCallingBooking(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
              >
                Hủy cuộc gọi
              </button>
              <button
                type="button"
                onClick={handleCompleteCall}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Hoàn tất cuộc gọi & Lưu
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md animate-pulse">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 min-h-[90px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => setCallNote('Khách đồng ý xác nhận lịch hẹn đúng giờ.')}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
              >
                + Khách chốt lịch
              </button>
              <button
                type="button"
                onClick={() => setCallNote('Khách xin đổi giờ sang ca chiều.')}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
              >
                + Khách muốn đổi giờ
              </button>
              <button
                type="button"
                onClick={() => setCallNote('Không nhấc máy lần 1.')}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
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
          title="Cấu hình quy tắc duyệt đặt lịch Mobile App"
          subtitle="Thiết lập điều kiện tự động và chính sách tiền cọc"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setConfigOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfigOpen(false);
                  setNotice('Đã lưu quy tắc duyệt đặt lịch Mobile App.');
                }}
                className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-violet-700"
              >
                Lưu quy tắc
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
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
                className="h-5 w-5 rounded-md border-slate-300 text-violet-600 focus:ring-violet-500"
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
    </div>
  );
}
