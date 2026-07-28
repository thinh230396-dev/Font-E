import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  Cake,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Gift,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type CustomerTier = 'VIP' | 'LOYAL' | 'STANDARD' | 'NEW';
type CustomerStatus = 'ACTIVE' | 'CARE' | 'INACTIVE';
type BranchCode = 'Q1' | 'Q3';

interface ServiceVisit {
  date: string;
  service: string;
  technician: string;
  amount: number;
  rating?: number;
}

interface TenantCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  branch: BranchCode;
  tier: CustomerTier;
  status: CustomerStatus;
  source: string;
  visits: number;
  totalSpent: number;
  points: number;
  lastVisit: string;
  nextAppointment?: string;
  favoriteTechnician: string;
  preferences: string[];
  allergies: string;
  nailCondition: string;
  note: string;
  consent: string[];
  tags: string[];
  history: ServiceVisit[];
  activity: string[];
}

interface LinkedAppointment {
  id: string;
  customerId?: string;
  customer: string;
  phone: string;
  date: string;
  start: string;
  duration: number;
  service: string;
  staff: string;
  branch: BranchCode;
  status: string;
  price: number;
  deposit: number;
  note: string;
  station?: string;
}

interface TenantAdminCustomersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
  branchLocked?: boolean;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
  onBookCustomer?: (
    customer: Pick<
      TenantCustomer,
      'id' | 'name' | 'phone' | 'branch' | 'note' | 'allergies' | 'nailCondition' | 'favoriteTechnician'
    >,
  ) => void;
}

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  branch: BranchCode;
  tier: CustomerTier;
  source: string;
  preferences: string;
  allergies: string;
  nailCondition: string;
  note: string;
  consent: string[];
}

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const phoneDigits = (value: string) => value.replace(/\D/g, '');
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const localDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const activityTime = () =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

const branchName = (branch: BranchCode | string) =>
  branch === 'Q3' ? 'Quận 3' : branch === 'Q1' ? 'Quận 1' : 'Tất cả chi nhánh';

const tierMeta: Record<CustomerTier, { label: string; badge: string; avatar: string }> = {
  VIP: {
    label: 'VIP Diamond',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    avatar: 'from-violet-500 to-fuchsia-500',
  },
  LOYAL: {
    label: 'Thân thiết',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    avatar: 'from-blue-500 to-cyan-500',
  },
  STANDARD: {
    label: 'Tiêu chuẩn',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    avatar: 'from-slate-500 to-slate-700',
  },
  NEW: {
    label: 'Khách mới',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    avatar: 'from-emerald-500 to-teal-500',
  },
};

const statusMeta: Record<CustomerStatus, { label: string; badge: string; dot: string }> = {
  ACTIVE: {
    label: 'Đang hoạt động',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  CARE: {
    label: 'Cần chăm sóc',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  INACTIVE: {
    label: 'Không hoạt động',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
};

const appointmentStatus: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  CONFIRMED: { label: 'Đã xác nhận', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  CHECKED_IN: { label: 'Đã đến', className: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  IN_SERVICE: { label: 'Đang phục vụ', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  COMPLETED: { label: 'Hoàn tất', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  NO_SHOW: { label: 'Không đến', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const visit = (
  date: string,
  service: string,
  technician: string,
  amount: number,
  rating?: number,
): ServiceVisit => ({ date, service, technician, amount, rating });

const seed: TenantCustomer[] = [
  {
    id: 'CUS-1842',
    name: 'Nguyễn Minh Anh',
    phone: '0912 884 206',
    email: 'minhanh@gmail.com',
    birthday: '12/08/1994',
    branch: 'Q3',
    tier: 'VIP',
    status: 'ACTIVE',
    source: 'Khách giới thiệu',
    visits: 18,
    totalSpent: 24850000,
    points: 2485,
    lastVisit: '16/07/2026',
    nextAppointment: '23/07 · 08:15',
    favoriteTechnician: 'Thảo Nguyễn',
    preferences: ['French', 'Tông nude', 'Form Almond', 'Sơn không HEMA'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Móng ngón trỏ yếu, cần hạn chế mài sâu',
    note: 'Ưu tiên lịch sáng cuối tuần và phòng VIP khi có thể.',
    consent: ['Zalo', 'SMS', 'Email'],
    tags: ['Chi tiêu cao', 'Hay đặt cuối tuần'],
    history: [
      visit('16/07/2026', 'Nail Art Premium', 'Thảo Nguyễn', 1250000, 5),
      visit('28/06/2026', 'Gel Manicure', 'Thảo Nguyễn', 680000, 5),
      visit('06/06/2026', 'Combo VIP', 'Hà My', 1650000, 5),
    ],
    activity: [
      '16/07 · Hoàn thành APT-1041 và cộng 125 điểm',
      '09/07 · Đã gửi voucher sinh nhật',
      '28/06 · Đánh giá dịch vụ 5 sao',
    ],
  },
  {
    id: 'CUS-1796',
    name: 'Trần Thu Hà',
    phone: '0908 337 912',
    email: 'thuha91@gmail.com',
    birthday: '28/07/1991',
    branch: 'Q3',
    tier: 'LOYAL',
    status: 'ACTIVE',
    source: 'Google',
    visits: 11,
    totalSpent: 12480000,
    points: 1248,
    lastVisit: '16/07/2026',
    nextAppointment: '23/07 · 09:30',
    favoriteTechnician: 'Minh Châu',
    preferences: ['Pedicure', 'Đỏ rượu', 'Móng vuông ngắn'],
    allergies: 'Tinh dầu bạc hà',
    nailCondition: 'Bình thường',
    note: 'Không dùng tinh dầu bạc hà trong bước ngâm chân.',
    consent: ['Zalo', 'Email'],
    tags: ['Sắp sinh nhật', 'Cần lưu ý dị ứng'],
    history: [
      visit('16/07/2026', 'Pedicure Spa + Sơn gel', 'Minh Châu', 780000, 5),
      visit('25/06/2026', 'Pedicure chuyên sâu', 'Minh Châu', 920000, 4),
    ],
    activity: ['16/07 · Tái đặt lịch sau 7 ngày', '12/07 · Mở tin nhắn ưu đãi sinh nhật'],
  },
  {
    id: 'CUS-2011',
    name: 'Lê Ngọc Mai',
    phone: '0936 221 557',
    email: 'ngocmai97@gmail.com',
    birthday: '06/11/1997',
    branch: 'Q1',
    tier: 'NEW',
    status: 'ACTIVE',
    source: 'Instagram',
    visits: 1,
    totalSpent: 1250000,
    points: 125,
    lastVisit: '16/07/2026',
    favoriteTechnician: 'Chưa xác định',
    preferences: ['Ombre', 'Đính đá nhỏ', 'Form Coffin'],
    allergies: 'Chưa khai báo',
    nailCondition: 'Móng mỏng',
    note: 'Cần hỏi lại dị ứng trước lần phục vụ tiếp theo.',
    consent: ['Instagram', 'Email'],
    tags: ['Hồ sơ thiếu dị ứng'],
    history: [visit('16/07/2026', 'Ombre Premium', 'Thảo Nguyễn', 1250000, 5)],
    activity: ['16/07 · Tạo hồ sơ từ POS', '16/07 · Hoàn thành lần ghé đầu tiên'],
  },
  {
    id: 'CUS-1224',
    name: 'Bùi Thanh Trúc',
    phone: '0938 400 176',
    email: 'thanhtruc@gmail.com',
    birthday: '19/07/1988',
    branch: 'Q3',
    tier: 'LOYAL',
    status: 'CARE',
    source: 'Khách giới thiệu',
    visits: 13,
    totalSpent: 9860000,
    points: 986,
    lastVisit: '28/05/2026',
    nextAppointment: '23/07 · 14:00',
    favoriteTechnician: 'Thuỳ Dương',
    preferences: ['Gel đơn sắc', 'Móng ngắn', 'Tông lạnh'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Khô nhẹ quanh viền móng',
    note: 'Đã vắng trên 45 ngày; ưu tiên gửi ưu đãi quay lại.',
    consent: ['SMS', 'Email'],
    tags: ['Vắng 52 ngày', 'Sinh nhật trong tháng'],
    history: [
      visit('28/05/2026', 'Sơn gel Hàn Quốc', 'Thuỳ Dương', 620000, 4),
      visit('05/05/2026', 'Manicure cơ bản', 'Thuỳ Dương', 420000, 5),
    ],
    activity: ['19/07 · Đã gửi lời chúc sinh nhật', '12/07 · Thêm vào nhóm khách cần chăm sóc'],
  },
  {
    id: 'CUS-0740',
    name: 'Hoàng Mỹ Hạnh',
    phone: '0907 311 840',
    email: 'myhanh86@gmail.com',
    birthday: '25/01/1986',
    branch: 'Q1',
    tier: 'STANDARD',
    status: 'INACTIVE',
    source: 'Khách vãng lai',
    visits: 5,
    totalSpent: 3650000,
    points: 365,
    lastVisit: '18/11/2025',
    favoriteTechnician: 'Hà My',
    preferences: ['Manicure cơ bản', 'Màu pastel'],
    allergies: 'Acetone nồng độ cao',
    nailCondition: 'Móng giòn',
    note: 'Chỉ nhận email; không gọi điện chăm sóc.',
    consent: ['Email'],
    tags: ['Không SMS', 'Vắng trên 6 tháng'],
    history: [visit('18/11/2025', 'Manicure cơ bản', 'Hà My', 450000, 4)],
    activity: ['02/07 · Email quay lại chưa mở', '18/11 · Hoàn thành dịch vụ gần nhất'],
  },
  {
    id: 'CUS-2050',
    name: 'Đinh Gia Hân',
    phone: '0902 826 114',
    email: 'giahan@gmail.com',
    birthday: '03/03/1995',
    branch: 'Q1',
    tier: 'LOYAL',
    status: 'ACTIVE',
    source: 'TikTok',
    visits: 9,
    totalSpent: 8720000,
    points: 872,
    lastVisit: '12/07/2026',
    nextAppointment: '23/07 · 09:00',
    favoriteTechnician: 'Hà My',
    preferences: ['Chrome', 'Form Oval', 'Khu VIP'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Bình thường',
    note: 'Thường đi cùng bạn; thích phòng yên tĩnh.',
    consent: ['Zalo', 'SMS'],
    tags: ['Sắp nâng hạng'],
    history: [visit('12/07/2026', 'Summer Chrome', 'Hà My', 1180000, 5)],
    activity: ['18/07 · Xác nhận lịch qua Zalo', '12/07 · Cộng 118 điểm'],
  },
];

const emptyForm = (branch: BranchCode): CustomerForm => ({
  name: '',
  phone: '',
  email: '',
  birthday: '',
  branch,
  tier: 'NEW',
  source: 'Khách vãng lai',
  preferences: '',
  allergies: '',
  nailCondition: '',
  note: '',
  consent: ['SMS'],
});

export default function TenantAdminCustomers({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  branchLocked = false,
  tenantName = 'Nailé Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason = '',
  onNotify,
  onBookCustomer,
}: TenantAdminCustomersProps) {
  const storageKey = `tenant-admin-customers-v1:${tenantName}`;
  const appointmentStorageKey = `tenant-admin-appointments-v2:${tenantName}`;
  const isReceptionist = roleLabel.toLowerCase().startsWith('receptionist');
  const assignedBranch = selectedBranch === 'Q1' ? 'Q1' : 'Q3';
  const [customers, setCustomers] = useState<TenantCustomer[]>(() => {
    if (typeof window === 'undefined') return getTenantAdminInitialData(null, seed);
    try {
      const stored = localStorage.getItem(storageKey);
      return getTenantAdminInitialData(stored ? (JSON.parse(stored) as TenantCustomer[]) : null, seed);
    } catch {
      return getTenantAdminInitialData(null, seed);
    }
  });
  const [appointments, setAppointments] = useState<LinkedAppointment[]>([]);
  const [tierFilter, setTierFilter] = useState<'ALL' | CustomerTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerStatus>('ALL');
  const [selected, setSelected] = useState<TenantCustomer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<CustomerForm>(() => emptyForm(assignedBranch));
  const canManage = accessMode === 'full' && !readOnlyReason;
  const canExport = canManage && !isReceptionist;
  const today = localDateKey();

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(customers));
  }, [customers, storageKey]);

  useEffect(() => {
    const syncAppointments = () => {
      try {
        const stored = localStorage.getItem(appointmentStorageKey);
        setAppointments(stored ? (JSON.parse(stored) as LinkedAppointment[]) : []);
      } catch {
        setAppointments([]);
      }
    };
    syncAppointments();
    window.addEventListener('focus', syncAppointments);
    window.addEventListener('storage', syncAppointments);
    return () => {
      window.removeEventListener('focus', syncAppointments);
      window.removeEventListener('storage', syncAppointments);
    };
  }, [appointmentStorageKey]);

  useEffect(() => {
    if (!selected && !formOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setFormOpen(false);
      }
    };
    addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', close);
    };
  }, [formOpen, selected]);

  const requireManage = () => {
    if (canManage) return true;
    onNotify?.(readOnlyReason || 'Bạn chỉ được xem hồ sơ khách hàng.');
    return false;
  };

  const scoped = useMemo(
    () => customers.filter((customer) => selectedBranch === 'ALL' || customer.branch === selectedBranch),
    [customers, selectedBranch],
  );

  const scopedAppointments = useMemo(
    () => appointments.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch),
    [appointments, selectedBranch],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedQuery = phoneDigits(query);
    return scoped
      .filter((customer) => tierFilter === 'ALL' || customer.tier === tierFilter)
      .filter((customer) => statusFilter === 'ALL' || customer.status === statusFilter)
      .filter((customer) => {
        if (!query) return true;
        const searchable = `${customer.id} ${customer.name} ${customer.phone} ${customer.email} ${customer.tags.join(' ')}`.toLowerCase();
        return searchable.includes(query) || (!!normalizedQuery && phoneDigits(customer.phone).includes(normalizedQuery));
      });
  }, [scoped, searchQuery, statusFilter, tierFilter]);

  const todayAppointments = scopedAppointments.filter(
    (item) => item.date === today && !['CANCELLED', 'NO_SHOW'].includes(item.status),
  );
  const todayCustomerCount = new Set(todayAppointments.map((item) => phoneDigits(item.phone))).size;
  const safetyAlerts = scoped.filter(
    (customer) =>
      !['', 'Không ghi nhận'].includes(customer.allergies) ||
      /mỏng|yếu|giòn|tổn thương|khô/i.test(customer.nailCondition),
  ).length;
  const careCustomers = scoped.filter((customer) => customer.status === 'CARE').length;

  const selectedAppointments = useMemo(() => {
    if (!selected) return [];
    const selectedPhone = phoneDigits(selected.phone);
    return scopedAppointments
      .filter(
        (item) =>
          item.customerId === selected.id || (!!selectedPhone && phoneDigits(item.phone) === selectedPhone),
      )
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  }, [scopedAppointments, selected]);

  const selectedTodayAppointment = selectedAppointments.find(
    (item) => item.date === today && !['CANCELLED', 'NO_SHOW'].includes(item.status),
  );
  const selectedNextAppointment = selectedAppointments.find(
    (item) => `${item.date} ${item.start}` >= `${today} 00:00` && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(item.status),
  );
  const selectedOutstanding = selectedTodayAppointment
    ? Math.max(0, selectedTodayAppointment.price - selectedTodayAppointment.deposit)
    : 0;

  const openCreate = () => {
    if (!requireManage()) return;
    setEditingId(null);
    setForm(emptyForm(assignedBranch));
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (customer: TenantCustomer) => {
    if (!requireManage()) return;
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      birthday: customer.birthday,
      branch: customer.branch,
      tier: customer.tier,
      source: customer.source,
      preferences: customer.preferences.join(', '),
      allergies: customer.allergies,
      nailCondition: customer.nailCondition,
      note: customer.note,
      consent: customer.consent,
    });
    setSelected(null);
    setFormError('');
    setFormOpen(true);
  };

  const toggleConsent = (channel: string) => {
    setForm((current) => ({
      ...current,
      consent: current.consent.includes(channel)
        ? current.consent.filter((item) => item !== channel)
        : [...current.consent, channel],
    }));
  };

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    const normalizedPhone = phoneDigits(form.phone);
    if (!form.name.trim() || normalizedPhone.length < 9 || normalizedPhone.length > 11) {
      setFormError('Vui lòng nhập họ tên và số điện thoại từ 9–11 chữ số.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('Email chưa đúng định dạng.');
      return;
    }
    if (form.birthday && !/^\d{2}\/\d{2}\/\d{4}$/.test(form.birthday)) {
      setFormError('Ngày sinh cần đúng định dạng DD/MM/YYYY.');
      return;
    }
    if (
      customers.some(
        (customer) => customer.id !== editingId && phoneDigits(customer.phone) === normalizedPhone,
      )
    ) {
      setFormError('Số điện thoại đã tồn tại. Hãy mở hồ sơ hiện có thay vì tạo trùng.');
      return;
    }

    const preferences = form.preferences
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const safeTier = isReceptionist && editingId
      ? customers.find((customer) => customer.id === editingId)?.tier ?? 'NEW'
      : form.tier;

    if (editingId) {
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === editingId
            ? {
                ...customer,
                ...form,
                tier: safeTier,
                preferences,
                allergies: form.allergies.trim() || 'Chưa khai báo',
                nailCondition: form.nailCondition.trim() || 'Chưa đánh giá',
                activity: [
                  `${activityTime()} · ${isReceptionist ? 'Lễ tân' : roleLabel} cập nhật hồ sơ`,
                  ...customer.activity,
                ],
              }
            : customer,
        ),
      );
      onNotify?.('Đã cập nhật hồ sơ và lưu nhật ký thao tác.');
    } else {
      const customer: TenantCustomer = {
        id: `CUS-${Date.now().toString().slice(-4)}`,
        ...form,
        tier: 'NEW',
        preferences,
        allergies: form.allergies.trim() || 'Chưa khai báo',
        nailCondition: form.nailCondition.trim() || 'Chưa đánh giá',
        status: 'ACTIVE',
        visits: 0,
        totalSpent: 0,
        points: 0,
        lastVisit: 'Chưa phát sinh',
        favoriteTechnician: 'Chưa xác định',
        tags: ['Khách mới tại quầy'],
        history: [],
        activity: [`${activityTime()} · Tạo hồ sơ bởi ${isReceptionist ? 'Lễ tân' : roleLabel}`],
      };
      setCustomers((current) => [customer, ...current]);
      setSelected(customer);
      onNotify?.(`Đã tạo hồ sơ ${customer.name}. Có thể đặt lịch ngay.`);
    }
    setFormOpen(false);
  };

  const exportCustomers = () => {
    if (!canExport) {
      onNotify?.('Lễ tân không có quyền xuất dữ liệu khách hàng hàng loạt.');
      return;
    }
    const header = 'Ma,Ho ten,So dien thoai,Email,Hang,Luot ghe,Tong chi tieu,Trang thai';
    const body = filtered
      .map((customer) =>
        [
          customer.id,
          customer.name,
          customer.phone,
          customer.email,
          tierMeta[customer.tier].label,
          customer.visits,
          customer.totalSpent,
          statusMeta[customer.status].label,
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'danh-sach-khach-hang.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    onNotify?.('Đã xuất danh sách theo bộ lọc hiện tại.');
  };

  const bookCustomer = (customer: TenantCustomer) => {
    if (!requireManage()) return;
    onBookCustomer?.(customer);
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <section className="tenant-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1>
              {isReceptionist ? 'Khách hàng tại quầy' : 'Khách hàng'}
            </h1>
            <p>
              {isReceptionist
                ? `Tra cứu và cập nhật hồ sơ khách tại ${branchName(selectedBranch)}.`
                : 'Quản lý hồ sơ, lịch sử dịch vụ và hạng thành viên.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isReceptionist && (
              <button
                type="button"
                onClick={exportCustomers}
                disabled={!canExport}
                className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-none disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Xuất danh sách
              </button>
            )}
            <button
              type="button"
              onClick={openCreate}
              disabled={!canManage}
              className="flex h-10 items-center gap-2 border border-pink-600 bg-pink-600 px-4 text-[9px] font-black text-white shadow-none disabled:border-slate-300 disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" />
              Thêm khách mới
            </button>
          </div>
      </section>

      <section
        className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          canManage ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              canManage ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-slate-800">Quyền truy cập: {roleLabel}</p>
            <p className="mt-1 text-[8px] leading-4 text-slate-500">
              {canManage
                ? isReceptionist
                  ? 'Được tạo và cập nhật thông tin phục vụ trong chi nhánh được phân công. Không được xuất dữ liệu hàng loạt, xóa hồ sơ, sửa điểm hoặc tự đổi hạng thành viên.'
                  : 'Được quản lý hồ sơ, phân hạng và xuất dữ liệu trong tenant.'
                : readOnlyReason || 'Chỉ được xem hồ sơ khách hàng.'}
            </p>
          </div>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${
            canManage
              ? 'bg-white text-emerald-700 ring-emerald-200'
              : 'bg-amber-100 text-amber-800 ring-amber-200'
          }`}
        >
          {canManage ? (isReceptionist ? 'Theo chi nhánh' : 'Toàn quyền dữ liệu') : 'Chỉ xem'}
        </span>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: isReceptionist ? 'Khách có lịch hôm nay' : 'Khách trong phạm vi',
            value: isReceptionist ? todayCustomerCount : scoped.length,
            detail: isReceptionist
              ? `${todayAppointments.length} lịch đang hiệu lực`
              : `${scoped.filter((item) => item.status === 'ACTIVE').length} đang hoạt động`,
            icon: UsersRound,
            tone: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Hồ sơ cần lưu ý',
            value: safetyAlerts,
            detail: 'Dị ứng hoặc tình trạng móng đặc biệt',
            icon: AlertTriangle,
            tone: safetyAlerts ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Khách thân thiết & VIP',
            value: scoped.filter((item) => ['VIP', 'LOYAL'].includes(item.tier)).length,
            detail: 'Nhận diện quyền lợi trước khi phục vụ',
            icon: Star,
            tone: 'bg-violet-50 text-violet-600',
          },
          {
            label: 'Cần chăm sóc lại',
            value: careCustomers,
            detail: 'Vắng lâu, sinh nhật hoặc cần theo dõi',
            icon: HeartHandshake,
            tone: 'bg-amber-50 text-amber-600',
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold text-slate-500">{label}</p>
                <p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{value}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-[430px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={isReceptionist ? 'Nhập tên, số điện thoại hoặc mã khách...' : 'Tìm tên, SĐT, email, nhãn...'}
              autoComplete="off"
              inputMode="search"
              aria-label="Tìm kiếm khách hàng"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-[10px] font-semibold outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <BeautifulSelect
              value={selectedBranch}
              onChange={(event) => onSelectedBranchChange(event.target.value)}
              disabled={branchLocked}
              aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'}
              className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              <option value="Q3">Chi nhánh Quận 3</option>
              <option value="Q1">Chi nhánh Quận 1</option>
            </BeautifulSelect>
            <BeautifulSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | CustomerStatus)}
              className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              aria-label="Lọc trạng thái khách hàng"
            >
              <option value="ALL">Mọi trạng thái</option>
              {Object.entries(statusMeta).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </BeautifulSelect>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          {(['ALL', 'VIP', 'LOYAL', 'STANDARD', 'NEW'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTierFilter(value)}
              className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${
                tierFilter === value
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {value === 'ALL' ? 'Tất cả khách hàng' : tierMeta[value].label}
              <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">
                {value === 'ALL' ? scoped.length : scoped.filter((item) => item.tier === value).length}
              </span>
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Khách hàng</th>
                <th className="px-4 py-3">Hạng & điểm</th>
                <th className="px-4 py-3">Lần ghé / lịch hẹn</th>
                <th className="px-4 py-3">Sở thích & an toàn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Tác vụ tại quầy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((customer) => {
                const customerPhone = phoneDigits(customer.phone);
                const liveAppointment = scopedAppointments.find(
                  (item) =>
                    item.date === today &&
                    (item.customerId === customer.id || phoneDigits(item.phone) === customerPhone) &&
                    !['CANCELLED', 'NO_SHOW'].includes(item.status),
                );
                const hasSafetyAlert =
                  !['', 'Không ghi nhận'].includes(customer.allergies) ||
                  /mỏng|yếu|giòn|tổn thương|khô/i.test(customer.nailCondition);
                return (
                  <tr
                    key={customer.id}
                    onClick={() => setSelected(customer)}
                    className="cursor-pointer text-[9px] text-slate-600 transition hover:bg-emerald-50/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[9px] font-black text-white ${tierMeta[customer.tier].avatar}`}
                        >
                          {initials(customer.name)}
                        </span>
                        <div>
                          <p className="font-black text-slate-900">{customer.name}</p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {customer.id} · {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${tierMeta[customer.tier].badge}`}>
                        {tierMeta[customer.tier].label}
                      </span>
                      <p className="mt-2 text-[8px] text-slate-400">
                        {customer.points.toLocaleString('vi-VN')} điểm
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {liveAppointment ? (
                        <>
                          <p className="flex items-center gap-1.5 font-black text-emerald-700">
                            <Clock3 className="h-3.5 w-3.5" />
                            Hôm nay · {liveAppointment.start}
                          </p>
                          <p className="mt-1 max-w-44 truncate text-[8px] text-slate-400">
                            {liveAppointment.service}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-black text-slate-800">{customer.visits} lượt ghé</p>
                          <p className="mt-1 text-[8px] text-slate-400">Gần nhất {customer.lastVisit}</p>
                        </>
                      )}
                    </td>
                    <td className="max-w-[250px] px-4 py-4">
                      <p className="truncate font-bold text-slate-700">
                        {customer.preferences.slice(0, 3).join(' · ') || 'Chưa ghi nhận sở thích'}
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-1 truncate text-[8px] ${
                          hasSafetyAlert ? 'font-black text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {hasSafetyAlert ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <CheckCircle2 className="h-3 w-3 shrink-0" />}
                        {customer.allergies || 'Chưa khai báo'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[customer.status].badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[customer.status].dot}`} />
                        {statusMeta[customer.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <a
                          href={`tel:${phoneDigits(customer.phone)}`}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Gọi ${customer.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            bookCustomer(customer);
                          }}
                          disabled={!canManage}
                          className="flex h-9 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 text-[8px] font-black text-emerald-700 shadow-sm disabled:opacity-50"
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          Đặt lịch
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(customer);
                          }}
                          className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                          aria-label={`Xem hồ sơ ${customer.name}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => setSelected(customer)}
              className="block h-auto w-full rounded-none border-0 bg-white p-4 text-left shadow-none"
            >
              <span className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[9px] font-black text-white ${tierMeta[customer.tier].avatar}`}
                >
                  {initials(customer.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block truncate text-[10px] font-black text-slate-900">
                        {customer.name}
                      </span>
                      <span className="mt-1 block text-[8px] text-slate-400">
                        {customer.phone} · {branchName(customer.branch)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${tierMeta[customer.tier].badge}`}>
                      {tierMeta[customer.tier].label}
                    </span>
                    <span className="truncate text-[8px] font-bold text-slate-600">
                      {customer.preferences.slice(0, 2).join(' · ') || 'Chưa có sở thích'}
                    </span>
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>

        {!filtered.length && (
          <div className="py-16 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-[10px] font-black text-slate-600">Không tìm thấy hồ sơ phù hợp</p>
            <p className="mt-1 text-[8px] text-slate-400">
              Kiểm tra lại số điện thoại hoặc tạo khách mới nếu chưa có hồ sơ.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 border border-emerald-200 bg-emerald-50 px-4 text-[8px] font-black text-emerald-700 shadow-sm"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                Tạo hồ sơ mới
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          <p className="text-[8px] text-slate-400">
            Hiển thị <strong className="text-slate-600">{filtered.length}</strong> hồ sơ
          </p>
          <p className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Dữ liệu riêng tư · {tenantName}
          </p>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Đóng chi tiết khách hàng"
            onClick={() => setSelected(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-detail-title"
            className="reception-customer-detail relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="customer-detail-header border-b border-slate-100 bg-[linear-gradient(125deg,#ecfdf5_0%,#ffffff_65%)] px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-[13px] font-black text-white ${tierMeta[selected.tier].avatar}`}
                  >
                    {initials(selected.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
                        {selected.id}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${tierMeta[selected.tier].badge}`}>
                        {tierMeta[selected.tier].label}
                      </span>
                    </div>
                    <h2 id="customer-detail-title" className="mt-2 truncate text-xl font-black text-slate-950">
                      {selected.name}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500">
                      <span>{selected.phone}</span>
                      <span className="text-slate-300">•</span>
                      <span>{selected.email || 'Chưa có email'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Đóng"
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <a
                  href={`tel:${phoneDigits(selected.phone)}`}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[8px] font-black text-white shadow-sm"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Gọi khách
                </a>
                <a
                  href={selected.consent.includes('SMS') ? `sms:${phoneDigits(selected.phone)}` : undefined}
                  aria-disabled={!selected.consent.includes('SMS')}
                  onClick={(event) => {
                    if (!selected.consent.includes('SMS')) {
                      event.preventDefault();
                      onNotify?.('Khách chưa đồng ý nhận SMS.');
                    }
                  }}
                  className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[8px] font-black ${
                    selected.consent.includes('SMS')
                      ? 'border border-blue-200 bg-blue-50 text-blue-700'
                      : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Nhắn SMS
                </a>
                <button
                  type="button"
                  onClick={() => bookCustomer(selected)}
                  disabled={!canManage}
                  className="flex h-10 items-center justify-center gap-2 border border-violet-200 bg-violet-50 px-2 text-[8px] font-black text-violet-700 shadow-sm disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Đặt lịch
                </button>
              </div>
            </header>

            <div className="customer-detail-body min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="space-y-5">
                {selectedTodayAppointment ? (
                  <section className="customer-detail-highlight rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="customer-detail-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                          <CalendarClock className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
                              Lịch hẹn hôm nay · {selectedTodayAppointment.start}
                            </p>
                            <span
                              className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${
                                appointmentStatus[selectedTodayAppointment.status]?.className ||
                                'bg-slate-100 text-slate-600 ring-slate-200'
                              }`}
                            >
                              {appointmentStatus[selectedTodayAppointment.status]?.label ||
                                selectedTodayAppointment.status}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] font-black text-slate-900">
                            {selectedTodayAppointment.service}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-500">
                            {selectedTodayAppointment.staff}
                            {selectedTodayAppointment.station
                              ? ` · Ghế ${selectedTodayAppointment.station}`
                              : ' · Chưa xếp ghế'}
                            {' · '}
                            {selectedTodayAppointment.duration} phút
                          </p>
                        </div>
                      </div>
                      <div className="customer-detail-amount rounded-xl bg-white px-3 py-2 text-right shadow-sm">
                        <p className="text-[7px] font-bold text-slate-400">Còn dự kiến thu</p>
                        <p className="mt-1 text-[10px] font-black text-slate-900">
                          {money(selectedOutstanding)}
                        </p>
                        <p className="mt-1 text-[7px] text-emerald-600">
                          Đã cọc {money(selectedTodayAppointment.deposit)}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : selectedNextAppointment ? (
                  <section className="customer-detail-highlight flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <span className="customer-detail-icon flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[8px] font-black uppercase text-blue-600">Lịch hẹn sắp tới</p>
                      <p className="mt-1.5 text-[11px] font-black text-slate-900">
                        {selectedNextAppointment.date} · {selectedNextAppointment.start}
                      </p>
                      <p className="mt-1 text-[8px] text-slate-500">{selectedNextAppointment.service}</p>
                    </div>
                  </section>
                ) : (
                  <section className="customer-detail-empty flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-700">Chưa có lịch hẹn sắp tới</p>
                      <p className="mt-1 text-[8px] text-slate-400">Có thể tạo lịch trực tiếp từ hồ sơ này.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => bookCustomer(selected)}
                      disabled={!canManage}
                      className="shrink-0 border border-emerald-200 bg-emerald-50 px-3 text-[8px] font-black text-emerald-700 shadow-sm disabled:opacity-50"
                    >
                      Đặt lịch
                    </button>
                  </section>
                )}

                <section
                  className={`customer-detail-safety rounded-2xl border p-4 ${
                    !['', 'Không ghi nhận'].includes(selected.allergies)
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`customer-detail-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ${
                        !['', 'Không ghi nhận'].includes(selected.allergies)
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[9px] font-black text-slate-800">Kiểm tra an toàn trước phục vụ</p>
                        <span className="customer-detail-chip rounded-full bg-white px-2.5 py-1 text-[7px] font-black text-slate-600 ring-1 ring-slate-200">
                          Bắt buộc đọc
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="customer-detail-subcard rounded-xl bg-white/75 p-3">
                          <p className="text-[7px] font-bold uppercase text-slate-400">Dị ứng / cần tránh</p>
                          <p className="mt-1.5 text-[9px] font-black text-slate-800">{selected.allergies}</p>
                        </div>
                        <div className="customer-detail-subcard rounded-xl bg-white/75 p-3">
                          <p className="text-[7px] font-bold uppercase text-slate-400">Tình trạng móng</p>
                          <p className="mt-1.5 text-[9px] font-black text-slate-800">
                            {selected.nailCondition}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Tổng chi tiêu', value: money(selected.totalSpent), icon: TrendingUp },
                    { label: 'Lượt ghé', value: selected.visits, icon: UsersRound },
                    { label: 'Điểm hiện có', value: selected.points.toLocaleString('vi-VN'), icon: Gift },
                    {
                      label: 'Chi tiêu TB',
                      value: money(Math.round(selected.totalSpent / Math.max(1, selected.visits))),
                      icon: WalletCards,
                    },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="customer-detail-stat rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="mt-2 text-[7px] font-bold text-slate-400">{label}</p>
                      <p className="mt-1.5 text-[10px] font-black text-slate-900">{value}</p>
                    </div>
                  ))}
                </section>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="customer-detail-card rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-800">Sở thích phục vụ</p>
                        <p className="mt-1 text-[8px] text-slate-400">Giúp cá nhân hóa trải nghiệm tại quầy</p>
                      </div>
                      <Sparkles className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.preferences.length ? (
                        selected.preferences.map((item) => (
                          <span key={item} className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[8px] font-bold text-violet-700">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-[8px] text-slate-400">Chưa ghi nhận</span>
                      )}
                    </div>
                    <div className="customer-detail-subcard mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-[7px] font-bold uppercase text-slate-400">Ghi chú cho nhân viên</p>
                      <p className="mt-1.5 text-[8px] leading-4 text-slate-600">
                        {selected.note || 'Chưa có ghi chú phục vụ.'}
                      </p>
                    </div>
                  </section>

                  <section className="customer-detail-card rounded-2xl border border-slate-200 p-4">
                    <p className="text-[9px] font-black text-slate-800">Thông tin & đồng ý liên hệ</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="customer-detail-subcard rounded-xl bg-slate-50 p-3">
                        <Cake className="h-3.5 w-3.5 text-pink-500" />
                        <p className="mt-2 text-[7px] text-slate-400">Ngày sinh</p>
                        <p className="mt-1 font-black text-slate-700">{selected.birthday || 'Chưa có'}</p>
                      </div>
                      <div className="customer-detail-subcard rounded-xl bg-slate-50 p-3">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <p className="mt-2 text-[7px] text-slate-400">Chi nhánh chính</p>
                        <p className="mt-1 font-black text-slate-700">{branchName(selected.branch)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.consent.length ? (
                        selected.consent.map((item) => (
                          <span key={item} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[7px] font-bold text-emerald-700">
                            <Check className="h-3 w-3" />
                            Cho phép {item}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-lg bg-rose-50 px-2 py-1.5 text-[7px] font-bold text-rose-700">
                          Không đồng ý nhận tin
                        </span>
                      )}
                    </div>
                  </section>
                </div>

                <section className="customer-detail-card overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-[9px] font-black text-slate-800">Lịch sử dịch vụ</p>
                      <p className="mt-1 text-[8px] text-slate-400">
                        {selected.visits} lượt ghé · Gần nhất {selected.lastVisit}
                      </p>
                    </div>
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selected.history.length ? (
                      selected.history.map((item) => (
                        <div key={`${item.date}-${item.service}`} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-[9px] font-black text-slate-700">{item.service}</p>
                            <p className="mt-1 text-[8px] text-slate-400">
                              {item.date} · {item.technician}
                            </p>
                            {item.rating && (
                              <p className="mt-1 flex items-center gap-1 text-[7px] font-bold text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                {item.rating}/5
                              </p>
                            )}
                          </div>
                          <p className="text-[9px] font-black text-slate-800">{money(item.amount)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-8 text-center text-[8px] text-slate-400">Chưa phát sinh dịch vụ</p>
                    )}
                  </div>
                </section>

                <section className="customer-detail-card rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-800">Nhật ký hồ sơ</p>
                    <BadgeCheck className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-3 space-y-3">
                    {selected.activity.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex gap-3">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <p className="text-[8px] leading-4 text-slate-500">{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <footer className="customer-detail-footer flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Chỉ sử dụng dữ liệu cho nghiệp vụ phục vụ khách
              </p>
              <button
                type="button"
                onClick={() => openEdit(selected)}
                disabled={!canManage}
                className="flex h-10 items-center justify-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[8px] font-black text-white shadow-sm disabled:opacity-50"
              >
                <UserRound className="h-3.5 w-3.5" />
                Cập nhật hồ sơ
              </button>
            </footer>
          </aside>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng biểu mẫu khách hàng"
            onClick={() => setFormOpen(false)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <form
            onSubmit={submitForm}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
                  {isReceptionist ? 'Hồ sơ tại quầy' : 'Hồ sơ khách hàng'}
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  {editingId ? 'Cập nhật thông tin phục vụ' : 'Thêm khách hàng mới'}
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Số điện thoại là định danh duy nhất. Tránh tạo hồ sơ trùng lặp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700 sm:col-span-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {[
                { key: 'name', label: 'Họ và tên *', placeholder: 'Nguyễn Văn A', type: 'text' },
                { key: 'phone', label: 'Số điện thoại *', placeholder: '0901 234 567', type: 'tel' },
                { key: 'email', label: 'Email', placeholder: 'customer@email.com', type: 'email' },
                { key: 'birthday', label: 'Ngày sinh', placeholder: 'DD/MM/YYYY', type: 'text' },
              ].map((field) => (
                <label key={field.key}>
                  <span className="mb-1.5 block text-[9px] font-bold text-slate-600">{field.label}</span>
                  <input
                    type={field.type}
                    value={form[field.key as keyof Pick<CustomerForm, 'name' | 'phone' | 'email' | 'birthday'>]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    autoComplete={field.key === 'name' ? 'name' : field.key === 'phone' ? 'tel' : field.key}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              ))}

              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh chính</span>
                <BeautifulSelect
                  value={form.branch}
                  disabled={branchLocked}
                  aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, branch: event.target.value as BranchCode }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                >
                  <option value="Q3">Chi nhánh Quận 3</option>
                  <option value="Q1">Chi nhánh Quận 1</option>
                </BeautifulSelect>
              </label>

              <label>
                <span className="mb-1.5 flex items-center justify-between gap-2 text-[9px] font-bold text-slate-600">
                  Phân hạng
                  {isReceptionist && (
                    <span className="text-[7px] font-black text-amber-600">Tự động · Không được sửa</span>
                  )}
                </span>
                <BeautifulSelect
                  value={form.tier}
                  disabled={isReceptionist}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tier: event.target.value as CustomerTier }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                  aria-label="Phân hạng khách hàng"
                >
                  {Object.entries(tierMeta).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </BeautifulSelect>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nguồn khách</span>
                <BeautifulSelect
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                  aria-label="Nguồn khách hàng"
                >
                  <option>Khách giới thiệu</option>
                  <option>Google</option>
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>Khách vãng lai</option>
                </BeautifulSelect>
              </label>

              <fieldset className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <legend className="px-2 text-[9px] font-black text-slate-700">Đồng ý nhận thông tin</legend>
                <p className="mb-3 text-[8px] text-slate-400">Chỉ chọn kênh khách đã đồng ý. Có thể bỏ chọn toàn bộ.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { channel: 'SMS', icon: MessageCircle },
                    { channel: 'Zalo', icon: BellRing },
                    { channel: 'Email', icon: Mail },
                  ].map(({ channel, icon: Icon }) => {
                    const active = form.consent.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleConsent(channel)}
                        aria-pressed={active}
                        className={`flex h-10 items-center justify-center gap-2 border px-2 text-[8px] font-black shadow-sm ${
                          active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {[
                {
                  key: 'preferences',
                  label: 'Sở thích Nail',
                  placeholder: 'Màu nude, form Almond, French... (ngăn cách bằng dấu phẩy)',
                },
                {
                  key: 'allergies',
                  label: 'Dị ứng / thành phần cần tránh',
                  placeholder: 'Ghi “Không ghi nhận” nếu đã hỏi và xác minh',
                },
                {
                  key: 'nailCondition',
                  label: 'Tình trạng móng',
                  placeholder: 'Móng mỏng, giòn, tổn thương...',
                },
                {
                  key: 'note',
                  label: 'Ghi chú phục vụ',
                  placeholder: 'Thói quen đặt lịch, yêu cầu riêng, cách xưng hô...',
                },
              ].map((field) => (
                <label key={field.key} className="sm:col-span-2">
                  <span className="mb-1.5 block text-[9px] font-bold text-slate-600">{field.label}</span>
                  <textarea
                    value={form[field.key as keyof Pick<CustomerForm, 'preferences' | 'allergies' | 'nailCondition' | 'note'>]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              ))}
            </div>

            <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="flex items-center gap-1.5 text-[8px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Mọi cập nhật đều được ghi vào nhật ký hồ sơ
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-lg shadow-emerald-200"
                >
                  <Check className="h-4 w-4" />
                  {editingId ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
                </button>
              </div>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
