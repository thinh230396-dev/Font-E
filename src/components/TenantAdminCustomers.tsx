import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Cake,
  CalendarCheck2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Crown,
  Download,
  Filter,
  Gift,
  HeartHandshake,
  LayoutGrid,
  LayoutList,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  Tags,
  TrendingUp,
  UserPlus,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type CustomerTier = 'VIP' | 'LOYAL' | 'REGULAR' | 'NEW';
type CustomerStatus = 'ACTIVE' | 'AT_RISK' | 'INACTIVE';
type CustomerSource = 'ONLINE' | 'REFERRAL' | 'WALK_IN' | 'SOCIAL' | 'OTHER';
type BranchCode = 'Q1' | 'Q3';
type CustomerView = 'TABLE' | 'CARDS';

interface CustomerVisit {
  id: string;
  date: string;
  service: string;
  staff: string;
  branch: BranchCode;
  amount: number;
  rating?: number;
}

interface TenantCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  gender: 'FEMALE' | 'MALE' | 'OTHER';
  branch: BranchCode;
  tier: CustomerTier;
  status: CustomerStatus;
  visits: number;
  totalSpend: number;
  lastVisit: string;
  nextAppointment?: string;
  points: number;
  source: CustomerSource;
  favoriteService: string;
  favoriteStaff: string;
  tags: string[];
  notes: string;
  joinedAt: string;
  consentSms: boolean;
  consentEmail: boolean;
  history: CustomerVisit[];
}

interface TenantAdminCustomersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
}

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  gender: TenantCustomer['gender'];
  branch: BranchCode;
  tier: CustomerTier;
  status: CustomerStatus;
  source: CustomerSource;
  notes: string;
  consentSms: boolean;
  consentEmail: boolean;
}

const branchLabels: Record<BranchCode, string> = { Q1: 'Chi nhánh Quận 1', Q3: 'Chi nhánh Quận 3' };

const tierMeta: Record<CustomerTier, { label: string; badge: string; avatar: string; icon: typeof Crown }> = {
  VIP: { label: 'VIP', badge: 'bg-violet-50 text-violet-700 ring-violet-200', avatar: 'bg-violet-100 text-violet-700', icon: Crown },
  LOYAL: { label: 'Thân thiết', badge: 'bg-blue-50 text-blue-700 ring-blue-200', avatar: 'bg-blue-100 text-blue-700', icon: Award },
  REGULAR: { label: 'Tiêu chuẩn', badge: 'bg-slate-100 text-slate-600 ring-slate-200', avatar: 'bg-slate-100 text-slate-700', icon: UserRound },
  NEW: { label: 'Khách mới', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', avatar: 'bg-emerald-100 text-emerald-700', icon: Sparkles }
};

const statusMeta: Record<CustomerStatus, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Đang hoạt động', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  AT_RISK: { label: 'Cần chăm sóc', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  INACTIVE: { label: 'Ngừng hoạt động', badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' }
};

const sourceLabels: Record<CustomerSource, string> = {
  ONLINE: 'Đặt lịch online',
  REFERRAL: 'Khách giới thiệu',
  WALK_IN: 'Khách vãng lai',
  SOCIAL: 'Mạng xã hội',
  OTHER: 'Nguồn khác'
};

const customersSeed: TenantCustomer[] = [
  { id: 'CUS-01842', name: 'Nguyễn Minh Anh', phone: '0912 884 206', email: 'minhanh.nguyen@gmail.com', birthday: '1994-08-12', gender: 'FEMALE', branch: 'Q3', tier: 'VIP', status: 'ACTIVE', visits: 18, totalSpend: 24_850_000, lastVisit: '2026-07-16', nextAppointment: '2026-08-02 · 09:30', points: 2485, source: 'REFERRAL', favoriteService: 'Nhuộm Balayage', favoriteStaff: 'Thảo Nguyễn', tags: ['Tóc tẩy', 'Ưa tông lạnh', 'Đặt lịch online'], notes: 'Ưu tiên sản phẩm không sulfate. Khách thường đặt lịch sáng cuối tuần.', joinedAt: '12/03/2024', consentSms: true, consentEmail: true, history: [
    { id: 'APT-1042', date: '16/07/2026 · 10:00', service: 'Nhuộm Balayage', staff: 'Thảo Nguyễn', branch: 'Q3', amount: 1_850_000 },
    { id: 'APT-0928', date: '21/05/2026 · 09:30', service: 'Phục hồi Keratin', staff: 'Thảo Nguyễn', branch: 'Q3', amount: 1_250_000, rating: 5 },
    { id: 'APT-0814', date: '06/03/2026 · 14:00', service: 'Nhuộm chân tóc', staff: 'Minh Khang', branch: 'Q3', amount: 850_000, rating: 5 }
  ] },
  { id: 'CUS-01796', name: 'Trần Thu Hà', phone: '0908 337 912', email: 'thuha.tran@outlook.com', birthday: '1991-07-28', gender: 'FEMALE', branch: 'Q3', tier: 'LOYAL', status: 'ACTIVE', visits: 11, totalSpend: 12_480_000, lastVisit: '2026-07-16', nextAppointment: '2026-08-15 · 10:00', points: 1248, source: 'SOCIAL', favoriteService: 'Cắt & tạo kiểu', favoriteStaff: 'Minh Khang', tags: ['Tóc ngắn', 'Sinh nhật tháng 7'], notes: 'Thích kiểu tóc dễ chăm sóc tại nhà.', joinedAt: '08/08/2024', consentSms: true, consentEmail: false, history: [
    { id: 'APT-1043', date: '16/07/2026 · 10:15', service: 'Cắt & tạo kiểu', staff: 'Minh Khang', branch: 'Q3', amount: 450_000 },
    { id: 'APT-0976', date: '18/06/2026 · 15:00', service: 'Uốn phồng chân tóc', staff: 'Minh Khang', branch: 'Q3', amount: 980_000, rating: 5 },
    { id: 'APT-0891', date: '24/04/2026 · 13:30', service: 'Cắt & tạo kiểu', staff: 'Minh Khang', branch: 'Q3', amount: 450_000, rating: 4 }
  ] },
  { id: 'CUS-02011', name: 'Lê Ngọc Mai', phone: '0936 221 557', email: 'ngocmai.le@gmail.com', birthday: '1997-11-06', gender: 'FEMALE', branch: 'Q3', tier: 'NEW', status: 'ACTIVE', visits: 1, totalSpend: 1_250_000, lastVisit: '2026-07-16', points: 125, source: 'ONLINE', favoriteService: 'Phục hồi Keratin', favoriteStaff: 'Thảo Nguyễn', tags: ['Khách mới', 'Tóc hư tổn'], notes: 'Cần tư vấn kỹ tình trạng tóc trước khi dùng hóa chất.', joinedAt: '15/07/2026', consentSms: true, consentEmail: true, history: [
    { id: 'APT-1044', date: '16/07/2026 · 11:30', service: 'Phục hồi Keratin', staff: 'Thảo Nguyễn', branch: 'Q3', amount: 1_250_000 }
  ] },
  { id: 'CUS-01888', name: 'Phạm Hoài Nam', phone: '0977 660 341', email: 'hoainam.pham@gmail.com', birthday: '1989-02-14', gender: 'MALE', branch: 'Q3', tier: 'REGULAR', status: 'ACTIVE', visits: 4, totalSpend: 1_120_000, lastVisit: '2026-06-11', nextAppointment: '2026-07-16 · 13:45', points: 112, source: 'WALK_IN', favoriteService: 'Cắt tóc nam', favoriteStaff: 'Quốc Bảo', tags: ['Cắt định kỳ 4 tuần'], notes: '', joinedAt: '20/02/2026', consentSms: true, consentEmail: false, history: [
    { id: 'APT-0994', date: '11/06/2026 · 17:00', service: 'Cắt tóc nam', staff: 'Quốc Bảo', branch: 'Q3', amount: 280_000, rating: 5 },
    { id: 'APT-0942', date: '14/05/2026 · 17:30', service: 'Cắt tóc nam', staff: 'Quốc Bảo', branch: 'Q3', amount: 280_000 }
  ] },
  { id: 'CUS-01452', name: 'Vũ Khánh Linh', phone: '0909 552 770', email: 'khanhlinh.vu@gmail.com', birthday: '1993-12-21', gender: 'FEMALE', branch: 'Q3', tier: 'VIP', status: 'ACTIVE', visits: 22, totalSpend: 31_640_000, lastVisit: '2026-05-02', nextAppointment: '2026-07-16 · 15:00', points: 3164, source: 'REFERRAL', favoriteService: 'Uốn setting', favoriteStaff: 'Minh Khang', tags: ['VIP', 'Uốn định kỳ', 'Giới thiệu 4 khách'], notes: 'Không dùng nhiệt độ quá cao. Ưu tiên sóng lớn tự nhiên.', joinedAt: '05/09/2023', consentSms: true, consentEmail: true, history: [
    { id: 'APT-0884', date: '02/05/2026 · 09:00', service: 'Phục hồi Olaplex', staff: 'Minh Khang', branch: 'Q3', amount: 1_450_000, rating: 5 },
    { id: 'APT-0721', date: '08/01/2026 · 13:00', service: 'Uốn setting', staff: 'Minh Khang', branch: 'Q3', amount: 1_650_000, rating: 5 }
  ] },
  { id: 'CUS-01224', name: 'Bùi Thanh Trúc', phone: '0938 400 176', email: 'thanhtruc.bui@yahoo.com', birthday: '1988-07-19', gender: 'FEMALE', branch: 'Q3', tier: 'LOYAL', status: 'AT_RISK', visits: 13, totalSpend: 9_860_000, lastVisit: '2026-05-28', points: 986, source: 'ONLINE', favoriteService: 'Gội dưỡng sinh', favoriteStaff: 'Thuỳ Dương', tags: ['Sinh nhật tháng 7', 'Voucher chưa dùng'], notes: 'Đã 49 ngày chưa quay lại, ưu tiên gửi ưu đãi sinh nhật.', joinedAt: '19/04/2023', consentSms: true, consentEmail: true, history: [
    { id: 'APT-0930', date: '28/05/2026 · 16:00', service: 'Gội dưỡng sinh', staff: 'Thuỳ Dương', branch: 'Q3', amount: 390_000, rating: 4 },
    { id: 'APT-0822', date: '12/03/2026 · 18:00', service: 'Phục hồi Keratin', staff: 'Thảo Nguyễn', branch: 'Q3', amount: 1_250_000 }
  ] },
  { id: 'CUS-00917', name: 'Đỗ Tuấn Kiệt', phone: '0918 734 662', email: 'tuankiet.do@gmail.com', birthday: '1985-09-09', gender: 'MALE', branch: 'Q3', tier: 'REGULAR', status: 'AT_RISK', visits: 7, totalSpend: 2_340_000, lastVisit: '2026-04-10', nextAppointment: '2026-07-16 · 16:30', points: 234, source: 'WALK_IN', favoriteService: 'Cắt tóc nam', favoriteStaff: 'Quốc Bảo', tags: ['Quay lại sau 90 ngày'], notes: 'Khách đặt lại sau thời gian dài không quay lại.', joinedAt: '10/11/2022', consentSms: true, consentEmail: false, history: [
    { id: 'APT-0840', date: '10/04/2026 · 16:30', service: 'Cắt tóc nam', staff: 'Quốc Bảo', branch: 'Q3', amount: 280_000, rating: 5 }
  ] },
  { id: 'CUS-01631', name: 'Trương Bảo Ngọc', phone: '0902 778 219', email: 'baongoc.truong@gmail.com', birthday: '1978-10-31', gender: 'FEMALE', branch: 'Q1', tier: 'LOYAL', status: 'ACTIVE', visits: 15, totalSpend: 14_720_000, lastVisit: '2026-07-16', points: 1472, source: 'REFERRAL', favoriteService: 'Nhuộm phủ bạc', favoriteStaff: 'Hà My', tags: ['Công thức màu đã lưu', 'Khách giới thiệu'], notes: 'Công thức màu 6.0 + 6.1, tỷ lệ 2:1.', joinedAt: '02/06/2024', consentSms: true, consentEmail: true, history: [
    { id: 'APT-1049', date: '16/07/2026 · 09:00', service: 'Nhuộm phủ bạc', staff: 'Hà My', branch: 'Q1', amount: 850_000 },
    { id: 'APT-0966', date: '12/06/2026 · 09:30', service: 'Nhuộm phủ bạc', staff: 'Hà My', branch: 'Q1', amount: 850_000, rating: 5 }
  ] },
  { id: 'CUS-01994', name: 'Ngô Minh Châu', phone: '0966 124 700', email: 'minhchau.ngo@gmail.com', birthday: '1996-04-18', gender: 'FEMALE', branch: 'Q1', tier: 'NEW', status: 'ACTIVE', visits: 2, totalSpend: 2_300_000, lastVisit: '2026-06-01', nextAppointment: '2026-07-16 · 13:00', points: 230, source: 'SOCIAL', favoriteService: 'Nhuộm Balayage', favoriteStaff: 'Hà My', tags: ['Khách mới', 'Instagram'], notes: 'Kiểm tra tiền sử dị ứng thuốc nhuộm.', joinedAt: '01/06/2026', consentSms: true, consentEmail: true, history: [
    { id: 'APT-0948', date: '01/06/2026 · 10:00', service: 'Cắt & tạo kiểu', staff: 'Hà My', branch: 'Q1', amount: 450_000, rating: 5 }
  ] },
  { id: 'CUS-00740', name: 'Hoàng Mỹ Hạnh', phone: '0907 311 840', email: 'myhanh.hoang@gmail.com', birthday: '1986-01-25', gender: 'FEMALE', branch: 'Q1', tier: 'REGULAR', status: 'INACTIVE', visits: 5, totalSpend: 3_650_000, lastVisit: '2025-11-18', points: 365, source: 'WALK_IN', favoriteService: 'Phục hồi Keratin', favoriteStaff: 'Hà My', tags: ['Không tương tác 8 tháng'], notes: 'Không gửi quảng cáo dày; chỉ liên hệ khi có ưu đãi phù hợp.', joinedAt: '16/08/2022', consentSms: false, consentEmail: true, history: [
    { id: 'APT-0582', date: '18/11/2025 · 14:00', service: 'Phục hồi Keratin', staff: 'Hà My', branch: 'Q1', amount: 1_250_000, rating: 4 }
  ] }
];

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN');
const initials = (name: string) => name.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase();

const emptyForm = (branch: string): CustomerFormState => ({
  name: '', phone: '', email: '', birthday: '', gender: 'FEMALE',
  branch: branch === 'Q1' ? 'Q1' : 'Q3', tier: 'NEW', status: 'ACTIVE',
  source: 'WALK_IN', notes: '', consentSms: true, consentEmail: false
});

export default function TenantAdminCustomers({ searchQuery, onSearchQueryChange, selectedBranch, onSelectedBranchChange }: TenantAdminCustomersProps) {
  const [customers, setCustomers] = useState<TenantCustomer[]>(customersSeed);
  const [tierFilter, setTierFilter] = useState<'ALL' | CustomerTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerStatus>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | CustomerSource>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'SPEND' | 'VISITS' | 'NAME'>('RECENT');
  const [viewMode, setViewMode] = useState<CustomerView>('TABLE');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<TenantCustomer | null>(null);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [form, setForm] = useState<CustomerFormState>(() => emptyForm(selectedBranch));
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const branchCustomers = useMemo(() => customers.filter((customer) => selectedBranch === 'ALL' || customer.branch === selectedBranch), [customers, selectedBranch]);
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return branchCustomers
      .filter((customer) => tierFilter === 'ALL' || customer.tier === tierFilter)
      .filter((customer) => statusFilter === 'ALL' || customer.status === statusFilter)
      .filter((customer) => sourceFilter === 'ALL' || customer.source === sourceFilter)
      .filter((customer) => !query || `${customer.id} ${customer.name} ${customer.phone} ${customer.email} ${customer.tags.join(' ')}`.toLowerCase().includes(query))
      .sort((a, b) => sortBy === 'SPEND' ? b.totalSpend - a.totalSpend : sortBy === 'VISITS' ? b.visits - a.visits : sortBy === 'NAME' ? a.name.localeCompare(b.name, 'vi') : b.lastVisit.localeCompare(a.lastVisit));
  }, [branchCustomers, searchQuery, sortBy, sourceFilter, statusFilter, tierFilter]);

  const activeFilterCount = [tierFilter !== 'ALL', statusFilter !== 'ALL', sourceFilter !== 'ALL'].filter(Boolean).length;
  const atRiskCustomers = branchCustomers.filter((customer) => customer.status === 'AT_RISK');
  const totalSeedSpend = branchCustomers.reduce((sum, customer) => sum + customer.totalSpend, 0);

  const openCreate = () => {
    setForm(emptyForm(selectedBranch));
    setFormError('');
    setFormMode('CREATE');
  };

  const openEdit = (customer: TenantCustomer) => {
    setForm({ name: customer.name, phone: customer.phone, email: customer.email, birthday: customer.birthday, gender: customer.gender, branch: customer.branch, tier: customer.tier, status: customer.status, source: customer.source, notes: customer.notes, consentSms: customer.consentSms, consentEmail: customer.consentEmail });
    setFormError('');
    setFormMode('EDIT');
  };

  const submitCustomer = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Vui lòng nhập tên và số điện thoại của khách hàng.');
      return;
    }
    const duplicate = customers.find((customer) => customer.phone.replace(/\s/g, '') === form.phone.replace(/\s/g, '') && customer.id !== selectedCustomer?.id);
    if (duplicate) {
      setFormError(`Số điện thoại đã thuộc hồ sơ ${duplicate.name} (${duplicate.id}).`);
      return;
    }
    const id = formMode === 'EDIT' && selectedCustomer ? selectedCustomer.id : `CUS-${String(Math.max(...customers.map((customer) => Number(customer.id.replace('CUS-', '')))) + 1).padStart(5, '0')}`;
    const existing = formMode === 'EDIT' ? selectedCustomer : null;
    const payload: TenantCustomer = {
      id, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), birthday: form.birthday, gender: form.gender,
      branch: form.branch, tier: form.tier, status: form.status, source: form.source, notes: form.notes.trim(), consentSms: form.consentSms, consentEmail: form.consentEmail,
      visits: existing?.visits || 0, totalSpend: existing?.totalSpend || 0, lastVisit: existing?.lastVisit || '2026-07-16', points: existing?.points || 0,
      favoriteService: existing?.favoriteService || 'Chưa xác định', favoriteStaff: existing?.favoriteStaff || 'Chưa phân công', tags: existing?.tags || ['Khách mới'],
      joinedAt: existing?.joinedAt || '16/07/2026', history: existing?.history || [], nextAppointment: existing?.nextAppointment
    };
    setCustomers((current) => formMode === 'EDIT' ? current.map((customer) => customer.id === id ? payload : customer) : [payload, ...current]);
    setSelectedCustomer(payload);
    if (selectedBranch !== 'ALL') onSelectedBranchChange(payload.branch);
    setFormMode(null);
    setNotice(formMode === 'CREATE' ? `Đã tạo hồ sơ ${payload.name}.` : `Đã cập nhật hồ sơ ${payload.name}.`);
  };

  const updateCustomer = (id: string, patch: Partial<TenantCustomer>) => {
    setCustomers((current) => current.map((customer) => customer.id === id ? { ...customer, ...patch } : customer));
    setSelectedCustomer((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const resetFilters = () => {
    setTierFilter('ALL'); setStatusFilter('ALL'); setSourceFilter('ALL'); onSearchQueryChange('');
  };

  const exportCustomers = () => {
    const rows = filteredCustomers.map((customer) => [customer.id, customer.name, customer.phone, customer.email, tierMeta[customer.tier].label, customer.visits, customer.totalSpend, customer.lastVisit].join(','));
    const blob = new Blob([`Mã khách,Tên,Số điện thoại,Email,Phân hạng,Số lần đến,Tổng chi tiêu,Lần gần nhất\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'danh-sach-khach-hang.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      {notice && <div className="fixed right-4 top-24 z-[80] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><p className="text-[9px] font-bold text-slate-700">{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo" className="ml-2 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button></div>}

      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Hồ sơ khách hàng được đồng bộ giữa các chi nhánh</div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Khách hàng</h1><p className="mt-2 text-[11px] text-slate-500">Quản lý hồ sơ, hành vi, giá trị vòng đời và cơ hội chăm sóc lại.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} aria-label="Chọn chi nhánh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-48"><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option><option value="ALL">Tất cả chi nhánh</option></BeautifulSelect><button type="button" onClick={exportCustomers} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất danh sách</button><button type="button" onClick={openCreate} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200"><UserPlus className="h-4 w-4" />Thêm khách hàng</button></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tổng khách hàng', value: selectedBranch === 'ALL' ? '1.284' : selectedBranch === 'Q1' ? '486' : '798', detail: '+104 khách trong tháng 7', icon: UsersRound, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Tỷ lệ quay lại', value: '72%', detail: '+4,8% so với tháng trước', icon: HeartHandshake, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Giá trị vòng đời TB', value: '4,82 triệu', detail: `Mẫu đang hiển thị ${formatCurrency(totalSeedSpend)}`, icon: CircleDollarSign, tone: 'bg-violet-50 text-violet-600' },
          { label: 'Cần chăm sóc lại', value: selectedBranch === 'ALL' ? '38' : selectedBranch === 'Q1' ? '14' : '24', detail: 'Chưa quay lại từ 45 ngày', icon: Gift, tone: 'bg-amber-50 text-amber-600' }
        ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 flex items-center gap-1.5 text-[8px] font-semibold text-slate-400"><TrendingUp className="h-3 w-3 text-emerald-500" />{detail}</p></article>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Phân khúc khách hàng</h2><p className="mt-1 text-[8px] text-slate-400">Theo hạng thành viên và giá trị tích lũy</p></div><Tags className="h-4.5 w-4.5 text-violet-500" /></div><div className="mt-5 grid gap-3 sm:grid-cols-4">{[
          { tier: 'VIP' as CustomerTier, count: 86, percent: 7, spend: '18,2 triệu' },
          { tier: 'LOYAL' as CustomerTier, count: 312, percent: 24, spend: '7,4 triệu' },
          { tier: 'REGULAR' as CustomerTier, count: 782, percent: 61, spend: '2,1 triệu' },
          { tier: 'NEW' as CustomerTier, count: 104, percent: 8, spend: '0,9 triệu' }
        ].map((segment) => { const Icon = tierMeta[segment.tier].icon; return <button key={segment.tier} type="button" onClick={() => setTierFilter(segment.tier)} className={`h-auto min-h-28 border p-3 text-left shadow-none ${tierFilter === segment.tier ? 'border-violet-300 bg-violet-50/60' : 'border-slate-100 bg-slate-50/70'}`}><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tierMeta[segment.tier].avatar}`}><Icon className="h-4 w-4" /></span><span className="text-[8px] font-black text-slate-400">{segment.percent}%</span></div><p className="mt-3 text-[9px] font-black text-slate-700">{tierMeta[segment.tier].label} · {segment.count}</p><p className="mt-1 text-[8px] text-slate-400">Chi tiêu TB {segment.spend}</p></button>; })}</div></article>
        <article className="rounded-2xl bg-gradient-to-br from-[#19152e] to-[#292148] p-5 text-white shadow-xl shadow-violet-950/10"><div className="flex items-start justify-between"><div><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-violet-300">Cơ hội trong 7 ngày</p><p className="mt-2 text-xl font-black">12 sinh nhật sắp tới</p></div><Cake className="h-5 w-5 text-violet-300" /></div><p className="mt-3 text-[8px] leading-4 text-slate-400">Gửi ưu đãi cá nhân hóa có thể tạo thêm 5–7 lịch hẹn và tăng tỷ lệ quay lại.</p><button type="button" onClick={() => { setSourceFilter('ALL'); setStatusFilter('AT_RISK'); setShowFilters(true); }} className="mt-5 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/10 text-[8px] font-black text-white shadow-none hover:bg-white/15"><Gift className="h-3.5 w-3.5" />Xem nhóm cần chăm sóc</button></article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm tên, mã khách, số điện thoại, email hoặc thẻ..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowFilters((value) => !value)} className={`flex h-10 items-center gap-2 border px-3 text-[8px] font-bold shadow-sm ${showFilters || activeFilterCount ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}><Filter className="h-3.5 w-3.5" />Bộ lọc{activeFilterCount > 0 && <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] text-white">{activeFilterCount}</span>}</button><BeautifulSelect value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} aria-label="Sắp xếp khách hàng" className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[8px] font-bold"><option value="RECENT">Mới ghé gần đây</option><option value="SPEND">Chi tiêu cao nhất</option><option value="VISITS">Ghé nhiều nhất</option><option value="NAME">Tên A–Z</option></BeautifulSelect><div className="flex items-center rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setViewMode('TABLE')} aria-label="Xem bảng" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'TABLE' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutList className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setViewMode('CARDS')} aria-label="Xem thẻ" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'CARDS' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /></button></div></div></div>

        {showFilters && <div className="grid gap-3 border-b border-slate-100 bg-violet-50/40 p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]"><label><span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">Hạng thành viên</span><BeautifulSelect value={tierFilter} onChange={(event) => setTierFilter(event.target.value as 'ALL' | CustomerTier)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả phân hạng</option>{Object.entries(tierMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">Tình trạng</span><BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | CustomerStatus)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả tình trạng</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">Nguồn khách hàng</span><BeautifulSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'ALL' | CustomerSource)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả nguồn</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></label><button type="button" onClick={resetFilters} className="self-end border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm">Đặt lại</button></div>}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3">{(['ALL', 'VIP', 'LOYAL', 'REGULAR', 'NEW'] as const).map((tier) => { const count = tier === 'ALL' ? branchCustomers.length : branchCustomers.filter((customer) => customer.tier === tier).length; return <button key={tier} type="button" onClick={() => setTierFilter(tier)} className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-0 text-[8px] font-bold shadow-none ${tierFilter === tier ? 'text-violet-700' : 'text-slate-500'}`}>{tier === 'ALL' ? 'Tất cả khách hàng' : tierMeta[tier].label}<span className={`rounded-full px-1.5 py-0.5 ${tierFilter === tier ? 'bg-violet-100' : 'bg-slate-100'}`}>{count}</span></button>; })}<span className="ml-auto text-[8px] font-medium text-slate-400">{filteredCustomers.length} hồ sơ mẫu phù hợp</span></div>

        {viewMode === 'TABLE' ? <div className="overflow-x-auto"><table className="w-full min-w-[1120px] border-collapse text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[8px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Khách hàng</th><th className="px-4 py-3">Phân hạng</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Lượt ghé</th><th className="px-4 py-3">Tổng chi tiêu</th><th className="px-4 py-3">Lần gần nhất</th><th className="px-4 py-3">Tình trạng</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredCustomers.map((customer) => <tr key={customer.id} className="text-[9px] text-slate-600 hover:bg-slate-50/70"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[8px] font-black ${tierMeta[customer.tier].avatar}`}>{initials(customer.name)}</span><div className="min-w-0"><p className="font-black text-slate-800">{customer.name}</p><p className="mt-1 text-[8px] text-slate-400">{customer.id} · {branchLabels[customer.branch]}</p></div></div></td><td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${tierMeta[customer.tier].badge}`}>{tierMeta[customer.tier].label}</span></td><td className="px-4 py-3.5"><p className="font-bold text-slate-700">{customer.phone}</p><p className="mt-1 max-w-44 truncate text-[8px] text-slate-400">{customer.email || 'Chưa có email'}</p></td><td className="px-4 py-3.5"><p className="font-black text-slate-800">{customer.visits} lần</p><p className="mt-1 text-[8px] text-slate-400">{customer.points.toLocaleString('vi-VN')} điểm</p></td><td className="px-4 py-3.5"><p className="font-black text-slate-800">{formatCurrency(customer.totalSpend)}</p><p className="mt-1 text-[8px] text-slate-400">TB {formatCurrency(customer.visits ? Math.round(customer.totalSpend / customer.visits) : 0)}</p></td><td className="px-4 py-3.5"><p className="font-bold text-slate-700">{formatDate(customer.lastVisit)}</p><p className="mt-1 max-w-40 truncate text-[8px] text-slate-400">{customer.nextAppointment ? `Lịch tới ${customer.nextAppointment}` : 'Chưa có lịch tiếp theo'}</p></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[customer.status].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusMeta[customer.status].dot}`} />{statusMeta[customer.status].label}</span></td><td className="px-5 py-3.5 text-right"><button type="button" onClick={() => setSelectedCustomer(customer)} className="border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm">Xem hồ sơ</button></td></tr>)}</tbody></table>{!filteredCustomers.length && <div className="px-6 py-14 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không tìm thấy khách hàng phù hợp</p><button type="button" onClick={resetFilters} className="mt-2 border-0 bg-transparent px-2 text-[9px] font-bold text-violet-600 shadow-none">Xóa tìm kiếm và bộ lọc</button></div>}</div> : <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{filteredCustomers.map((customer) => <button key={customer.id} type="button" onClick={() => setSelectedCustomer(customer)} className="h-auto min-h-56 border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-200 hover:shadow-md"><div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[9px] font-black ${tierMeta[customer.tier].avatar}`}>{initials(customer.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black text-slate-800">{customer.name}</p><p className="mt-1 text-[8px] text-slate-400">{customer.id} · {customer.phone}</p></div><span className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${tierMeta[customer.tier].badge}`}>{tierMeta[customer.tier].label}</span></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3"><div><p className="text-[7px] text-slate-400">Lượt ghé</p><p className="mt-1 text-[10px] font-black text-slate-800">{customer.visits}</p></div><div><p className="text-[7px] text-slate-400">Chi tiêu</p><p className="mt-1 truncate text-[10px] font-black text-slate-800">{(customer.totalSpend / 1_000_000).toLocaleString('vi-VN')}tr</p></div><div><p className="text-[7px] text-slate-400">Điểm</p><p className="mt-1 text-[10px] font-black text-violet-600">{customer.points}</p></div></div><div className="mt-4 flex items-center justify-between"><span className="text-[8px] text-slate-400">Ghé gần nhất {formatDate(customer.lastVisit)}</span><span className={`flex items-center gap-1.5 text-[8px] font-bold ${customer.status === 'AT_RISK' ? 'text-amber-600' : customer.status === 'INACTIVE' ? 'text-slate-400' : 'text-emerald-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${statusMeta[customer.status].dot}`} />{statusMeta[customer.status].label}</span></div><div className="mt-4 flex flex-wrap gap-1.5">{customer.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-md bg-violet-50 px-2 py-1 text-[7px] font-bold text-violet-600">{tag}</span>)}</div></button>)}</div>}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[8px] text-slate-400">Hiển thị <span className="font-black text-slate-600">{filteredCustomers.length}</span> hồ sơ mẫu · Dữ liệu cập nhật lúc 14:32</p><p className="flex items-center gap-1.5 text-[8px] text-slate-400"><MapPin className="h-3.5 w-3.5" />{selectedBranch === 'ALL' ? 'Tất cả chi nhánh' : branchLabels[selectedBranch as BranchCode]}</p></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Khách cần chăm sóc</h2><p className="mt-1 text-[8px] text-slate-400">Ưu tiên theo giá trị và thời gian vắng mặt</p></div><HeartHandshake className="h-4.5 w-4.5 text-amber-500" /></div><div className="mt-3 divide-y divide-slate-100">{atRiskCustomers.slice(0, 3).map((customer) => <button key={customer.id} type="button" onClick={() => setSelectedCustomer(customer)} className="flex h-auto w-full items-center gap-3 rounded-none border-0 bg-transparent px-0 py-3 text-left shadow-none"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[8px] font-black ${tierMeta[customer.tier].avatar}`}>{initials(customer.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-black text-slate-700">{customer.name}</span><span className="mt-1 block text-[8px] text-slate-400">Lần cuối {formatDate(customer.lastVisit)} · {formatCurrency(customer.totalSpend)}</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300" /></button>)}</div></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Chất lượng dữ liệu</h2><p className="mt-1 text-[8px] text-slate-400">Mức độ hoàn thiện hồ sơ</p></div><Check className="h-4.5 w-4.5 text-emerald-500" /></div><div className="mt-4 space-y-3">{[{ label: 'Có số điện thoại', value: 99, tone: 'bg-emerald-500' }, { label: 'Có email', value: 82, tone: 'bg-blue-500' }, { label: 'Có ngày sinh', value: 76, tone: 'bg-violet-500' }, { label: 'Đồng ý nhận ưu đãi', value: 68, tone: 'bg-amber-500' }].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-[8px]"><span className="font-bold text-slate-600">{item.label}</span><span className="font-black text-slate-700">{item.value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} /></div></div>)}</div></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Hiệu quả thành viên</h2><p className="mt-1 text-[8px] text-slate-400">Điểm và ưu đãi tháng 07/2026</p></div><Award className="h-4.5 w-4.5 text-violet-500" /></div><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-[8px] text-slate-400">Điểm cấp</p><p className="mt-1 text-base font-black text-slate-900">48,2K</p></div><div><p className="text-[8px] text-slate-400">Đã đổi</p><p className="mt-1 text-base font-black text-slate-900">31%</p></div><div><p className="text-[8px] text-slate-400">Doanh thu</p><p className="mt-1 text-base font-black text-emerald-600">+12%</p></div></div><div className="mt-4 rounded-xl bg-violet-50 p-3"><p className="text-[8px] font-black text-violet-800">Cơ hội nâng hạng</p><p className="mt-1 text-[8px] leading-4 text-violet-600">26 khách còn dưới 500.000đ để đạt hạng Thân thiết.</p></div></article></section>

      {selectedCustomer && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"><button type="button" aria-label="Đóng hồ sơ" onClick={() => setSelectedCustomer(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><aside className="relative flex h-full w-full max-w-[500px] flex-col overflow-hidden bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[11px] font-black ${tierMeta[selectedCustomer.tier].avatar}`}>{initials(selectedCustomer.name)}</span><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-base font-black text-slate-900">{selectedCustomer.name}</h2><span className={`shrink-0 rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${tierMeta[selectedCustomer.tier].badge}`}>{tierMeta[selectedCustomer.tier].label}</span></div><p className="mt-1 text-[8px] text-slate-400">{selectedCustomer.id} · Thành viên từ {selectedCustomer.joinedAt}</p></div></div><button type="button" onClick={() => setSelectedCustomer(null)} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-5 sm:p-6"><div className="grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Lượt ghé</p><p className="mt-1 text-lg font-black text-slate-900">{selectedCustomer.visits}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Tổng chi tiêu</p><p className="mt-1 truncate text-[12px] font-black text-slate-900">{formatCurrency(selectedCustomer.totalSpend)}</p></div><div className="rounded-xl bg-violet-50 p-3"><p className="text-[7px] text-violet-400">Điểm thành viên</p><p className="mt-1 text-lg font-black text-violet-700">{selectedCustomer.points.toLocaleString('vi-VN')}</p></div></div><div className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Thông tin liên hệ</p><span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selectedCustomer.status].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusMeta[selectedCustomer.status].dot}`} />{statusMeta[selectedCustomer.status].label}</span></div><div className="flex gap-2"><a href={`tel:${selectedCustomer.phone.replace(/\s/g, '')}`} aria-label="Gọi khách hàng" className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Phone className="h-4 w-4" /></a><button type="button" aria-label="Nhắn tin" className="flex h-9 w-9 items-center justify-center border-0 bg-violet-50 p-0 text-violet-600 shadow-none"><MessageCircle className="h-4 w-4" /></button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="flex gap-2"><Phone className="mt-0.5 h-3.5 w-3.5 text-slate-400" /><div><p className="text-[7px] text-slate-400">Số điện thoại</p><p className="mt-1 text-[9px] font-bold text-slate-700">{selectedCustomer.phone}</p></div></div><div className="flex gap-2"><Mail className="mt-0.5 h-3.5 w-3.5 text-slate-400" /><div className="min-w-0"><p className="text-[7px] text-slate-400">Email</p><p className="mt-1 truncate text-[9px] font-bold text-slate-700">{selectedCustomer.email || 'Chưa cung cấp'}</p></div></div><div className="flex gap-2"><Cake className="mt-0.5 h-3.5 w-3.5 text-slate-400" /><div><p className="text-[7px] text-slate-400">Ngày sinh</p><p className="mt-1 text-[9px] font-bold text-slate-700">{selectedCustomer.birthday ? formatDate(selectedCustomer.birthday) : 'Chưa cung cấp'}</p></div></div><div className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 text-slate-400" /><div><p className="text-[7px] text-slate-400">Chi nhánh chính</p><p className="mt-1 text-[9px] font-bold text-slate-700">{branchLabels[selectedCustomer.branch]}</p></div></div></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-fuchsia-50 p-3"><p className="text-[7px] font-bold text-fuchsia-500">Dịch vụ yêu thích</p><p className="mt-1 text-[9px] font-black text-fuchsia-800">{selectedCustomer.favoriteService}</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-[7px] font-bold text-blue-500">Nhân viên yêu thích</p><p className="mt-1 text-[9px] font-black text-blue-800">{selectedCustomer.favoriteStaff}</p></div></div><div className="mt-5"><div className="flex items-center justify-between"><div><h3 className="text-[10px] font-black text-slate-800">Lịch sử dịch vụ</h3><p className="mt-1 text-[8px] text-slate-400">Các lần ghé gần nhất</p></div><CalendarDays className="h-4 w-4 text-violet-500" /></div><div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">{selectedCustomer.history.length ? selectedCustomer.history.map((visit) => <div key={visit.id} className="p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black text-slate-700">{visit.service}</p><p className="mt-1 text-[8px] text-slate-400">{visit.date} · {visit.staff}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-800">{formatCurrency(visit.amount)}</p>{visit.rating && <p className="mt-1 flex items-center justify-end gap-1 text-[8px] font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400" />{visit.rating}.0</p>}</div></div></div>) : <div className="p-6 text-center text-[9px] text-slate-400">Khách hàng chưa sử dụng dịch vụ.</div>}</div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Ghi chú chăm sóc</p><p className="mt-2 text-[9px] leading-5 text-slate-600">{selectedCustomer.notes || 'Chưa có ghi chú cho khách hàng này.'}</p><div className="mt-3 flex flex-wrap gap-1.5">{selectedCustomer.tags.map((tag) => <span key={tag} className="rounded-md bg-white px-2 py-1 text-[7px] font-bold text-violet-600 ring-1 ring-slate-200">{tag}</span>)}</div></div><div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black text-violet-800">Quyền nhận thông tin</p><p className="mt-1 text-[8px] text-violet-600">SMS: {selectedCustomer.consentSms ? 'Đồng ý' : 'Không'} · Email: {selectedCustomer.consentEmail ? 'Đồng ý' : 'Không'}</p></div><button type="button" onClick={() => { updateCustomer(selectedCustomer.id, { points: selectedCustomer.points + 100 }); setNotice(`Đã cộng 100 điểm cho ${selectedCustomer.name}.`); }} className="flex h-9 items-center gap-1.5 border border-violet-200 bg-white px-3 text-[8px] font-black text-violet-700 shadow-sm"><Plus className="h-3.5 w-3.5" />100 điểm</button></div></div></div><div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><div className="flex gap-2"><button type="button" onClick={() => openEdit(selectedCustomer)} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-bold text-slate-600 shadow-sm"><Pencil className="h-3.5 w-3.5" />Chỉnh sửa</button><button type="button" onClick={() => setNotice(`Đã mở luồng tạo lịch cho ${selectedCustomer.name}.`)} className="flex h-11 flex-1 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200"><CalendarCheck2 className="h-4 w-4" />Tạo lịch hẹn</button></div></div></aside></div>}

      {formMode && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setFormMode(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCustomer} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><h2 className="text-base font-black text-slate-900">{formMode === 'CREATE' ? 'Thêm khách hàng mới' : `Chỉnh sửa ${selectedCustomer?.id}`}</h2><p className="mt-1 text-[9px] text-slate-500">Thông tin được sử dụng cho đặt lịch và chăm sóc khách hàng.</p></div><button type="button" onClick={() => setFormMode(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700">{formError}</div>}<fieldset><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><UserRound className="h-3.5 w-3.5" /></span>Thông tin cơ bản</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Họ và tên *</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="Nguyễn Minh Anh" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số điện thoại *</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="09xx xxx xxx" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Email</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} placeholder="email@example.com" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ngày sinh</span><input type="date" value={form.birthday} onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Giới tính</span><BeautifulSelect value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as TenantCustomer['gender'] }))} className={inputClass}><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác / Không cung cấp</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh chính</span><BeautifulSelect value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value as BranchCode }))} className={inputClass}><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Award className="h-3.5 w-3.5" /></span>Phân loại & nguồn khách</legend><div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Hạng thành viên</span><BeautifulSelect value={form.tier} onChange={(event) => setForm((current) => ({ ...current, tier: event.target.value as CustomerTier }))} className={inputClass}>{Object.entries(tierMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tình trạng</span><BeautifulSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CustomerStatus }))} className={inputClass}>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nguồn khách</span><BeautifulSelect value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as CustomerSource }))} className={inputClass}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</BeautifulSelect></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MessageCircle className="h-3.5 w-3.5" /></span>Chăm sóc khách hàng</legend><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ghi chú nội bộ</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Sở thích, lưu ý dị ứng, nhu cầu chăm sóc..." /></label><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={form.consentSms} onChange={(event) => setForm((current) => ({ ...current, consentSms: event.target.checked }))} className="h-4 w-4 accent-violet-600" /><span><span className="block text-[9px] font-bold text-slate-700">Nhận SMS/Zalo</span><span className="mt-1 block text-[7px] text-slate-400">Nhắc lịch và ưu đãi</span></span></label><label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={form.consentEmail} onChange={(event) => setForm((current) => ({ ...current, consentEmail: event.target.checked }))} className="h-4 w-4 accent-violet-600" /><span><span className="block text-[9px] font-bold text-slate-700">Nhận email</span><span className="mt-1 block text-[7px] text-slate-400">Tin tức và ưu đãi</span></span></label></div></fieldset></div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setFormMode(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><UserPlus className="h-4 w-4" />{formMode === 'CREATE' ? 'Tạo hồ sơ' : 'Lưu thay đổi'}</button></div></form></div>}
    </div>
  );
}
