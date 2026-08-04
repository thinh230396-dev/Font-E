import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Check,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  LockKeyhole,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import Modal from './Modal';
import { getTenantAdminInitialData } from '../utils/mockDataReset';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'POSTED' | 'PENDING' | 'DRAFT' | 'VOID';
export type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'EWALLET';

export interface AuditTrailItem {
  time: string;
  action: string;
  actor: string;
}

export interface FinanceTransaction {
  id: string;
  date: string; // DD/MM/YYYY
  time: string; // HH:mm
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  branch: 'Q3' | 'Q1';
  method: PaymentMethod;
  counterparty: string;
  relatedStaff?: string;
  relatedCustomer?: string;
  status: TransactionStatus;
  createdBy: string;
  approvedBy?: string;
  note?: string;
  documentName?: string;
  auditTrail: AuditTrailItem[];
}

export interface TenantAdminFinanceProps {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
}

export const INCOME_CATEGORIES = [
  'Thu dịch vụ',
  'Thu bán sản phẩm',
  'Tiền cọc',
  'Thu hồi công nợ',
  'Thu hội viên',
  'Thu khác',
] as const;

export const EXPENSE_CATEGORIES = [
  'Lương, phụ cấp & hoa hồng',
  'Nhập vật tư',
  'Thuê mặt bằng',
  'Điện nước',
  'Marketing',
  'Hoàn tiền khách',
  'Chi khác',
] as const;

export const STAFF_LIST = [
  { id: 'NV-01', name: 'Thảo Nguyễn', role: 'Senior Nail Artist', branch: 'Q3' as const },
  { id: 'NV-02', name: 'Hà My', role: 'Nail Artist', branch: 'Q3' as const },
  { id: 'NV-03', name: 'Minh Châu', role: 'Senior Technician', branch: 'Q3' as const },
  { id: 'NV-04', name: 'Thu Hà', role: 'Quản lý chi nhánh', branch: 'Q1' as const },
  { id: 'NV-05', name: 'Bảo Ngọc', role: 'Pedicure Specialist', branch: 'Q1' as const },
  { id: 'NV-06', name: 'Kim Anh', role: 'Nail Technician', branch: 'Q1' as const },
  { id: 'NV-07', name: 'Thuỳ Dương', role: 'Nail Technician', branch: 'Q3' as const },
  { id: 'NV-08', name: 'Trâm Anh', role: 'Thu ngân', branch: 'Q1' as const },
];

export const CUSTOMER_LIST = [
  { id: 'KH-01', name: 'Nguyễn Minh Anh', phone: '0908 123 456', rank: 'Khách VIP' },
  { id: 'KH-02', name: 'Trần Thu Hà', phone: '0912 345 678', rank: 'Thân thiết' },
  { id: 'KH-03', name: 'Lê Ngọc Mai', phone: '0988 777 666', rank: 'Tiêu chuẩn' },
  { id: 'KH-04', name: 'Phạm Hoài Nam', phone: '0933 111 222', rank: 'Tiêu chuẩn' },
  { id: 'KH-05', name: 'Vũ Khánh Linh', phone: '0903 888 999', rank: 'Khách VIP' },
  { id: 'KH-06', name: 'Lê Mộc Trà', phone: '0977 444 555', rank: 'Tiêu chuẩn' },
];

export const INITIAL_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'PT-2026-084',
    date: '20/07/2026',
    time: '16:42',
    type: 'INCOME',
    category: 'Thu dịch vụ',
    description: 'Thanh toán trọn gói Nail Art & Sơn gel cao cấp',
    amount: 18640000,
    branch: 'Q3',
    method: 'CARD',
    counterparty: 'Khách lẻ tại quầy',
    relatedStaff: 'Thảo Nguyễn',
    relatedCustomer: 'Nguyễn Minh Anh',
    status: 'POSTED',
    createdBy: 'Trâm Anh (Thu ngân)',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Đã hoàn tất thanh toán qua máy quẹt thẻ POS VCB',
    documentName: 'hoa_don_pos_0726_084.pdf',
    auditTrail: [
      { time: '20/07/2026 16:42', action: 'Tạo phiếu thu dịch vụ từ POS', actor: 'Trâm Anh' },
      { time: '20/07/2026 16:45', action: 'Chốt sổ & ghi nhận thu ngân', actor: 'Nguyễn Trường Thịnh' },
    ],
  },
  {
    id: 'PC-2026-063',
    date: '20/07/2026',
    time: '15:18',
    type: 'EXPENSE',
    category: 'Nhập vật tư',
    description: 'Thanh toán đợt 1 phiếu nhập sơn gel DND & OPI',
    amount: 12850000,
    branch: 'Q3',
    method: 'BANK',
    counterparty: 'NailPro Supply Sài Gòn',
    relatedStaff: 'Minh Châu',
    status: 'PENDING',
    createdBy: 'Minh Châu',
    note: 'Chờ bộ phận Kế toán kiểm tra hóa đơn VAT gốc',
    documentName: 'phieu_nhap_kho_0726.pdf',
    auditTrail: [
      { time: '20/07/2026 15:18', action: 'Tạo đề xuất chi nhập vật tư', actor: 'Minh Châu' },
    ],
  },
  {
    id: 'PT-2026-083',
    date: '20/07/2026',
    time: '14:55',
    type: 'INCOME',
    category: 'Tiền cọc',
    description: 'Nhận cọc giữ lịch hẹn dịch vụ uốn & nhuộm Balayage',
    amount: 4850000,
    branch: 'Q1',
    method: 'EWALLET',
    counterparty: 'Khách đặt online qua Zalo Mini App',
    relatedCustomer: 'Trần Thu Hà',
    status: 'POSTED',
    createdBy: 'Hệ thống Đặt Lịch',
    approvedBy: 'Tự động đối soát',
    note: 'Khách cọc qua VNPay QR thành công',
    documentName: 'bien_nhan_vnpay_2007.pdf',
    auditTrail: [
      { time: '20/07/2026 14:55', action: 'Ghi nhận tiền cọc tự động qua Cổng VNPay', actor: 'Hệ thống' },
    ],
  },
  {
    id: 'PC-2026-062',
    date: '20/07/2026',
    time: '13:20',
    type: 'EXPENSE',
    category: 'Lương, phụ cấp & hoa hồng',
    description: 'Chi trả phụ cấp & hoa hồng dịch vụ Tuần 29',
    amount: 15200000,
    branch: 'Q1',
    method: 'BANK',
    counterparty: 'Thu Hà (Quản lý)',
    relatedStaff: 'Thu Hà',
    status: 'POSTED',
    createdBy: 'Nguyễn Trường Thịnh',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Đã chuyển khoản theo bảng chốt hoa hồng nhân sự',
    documentName: 'bang_luong_t29_q1.xlsx',
    auditTrail: [
      { time: '20/07/2026 13:20', action: 'Tạo phiếu chi lương & hoa hồng nhân sự', actor: 'Nguyễn Trường Thịnh' },
      { time: '20/07/2026 13:25', action: 'Duyệt thanh toán qua Internet Banking', actor: 'Nguyễn Trường Thịnh' },
    ],
  },
  {
    id: 'PT-2026-082',
    date: '19/07/2026',
    time: '17:05',
    type: 'INCOME',
    category: 'Thu bán sản phẩm',
    description: 'Thu tiền bán lẻ tinh dầu dưỡng móng & kem dưỡng tay',
    amount: 3280000,
    branch: 'Q1',
    method: 'CASH',
    counterparty: 'Khách mua lẻ',
    relatedStaff: 'Kim Anh',
    relatedCustomer: 'Vũ Khánh Linh',
    status: 'POSTED',
    createdBy: 'Kim Anh',
    approvedBy: 'Thu Hà',
    note: 'Khách thanh toán tiền mặt tại quầy',
    auditTrail: [
      { time: '19/07/2026 17:05', action: 'Tạo phiếu thu bán sản phẩm', actor: 'Kim Anh' },
    ],
  },
  {
    id: 'PC-2026-061',
    date: '19/07/2026',
    time: '10:00',
    type: 'EXPENSE',
    category: 'Thuê mặt bằng',
    description: 'Thanh toán tiền thuê mặt bằng Tháng 07/2026 · Q3',
    amount: 35000000,
    branch: 'Q3',
    method: 'BANK',
    counterparty: 'Bà Nguyễn Thị Minh (Chủ nhà Q3)',
    status: 'POSTED',
    createdBy: 'Nguyễn Trường Thịnh',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Chuyển khoản định kỳ theo hợp đồng thuê mặt bằng',
    documentName: 'hop_dong_thue_mb_q3.pdf',
    auditTrail: [
      { time: '19/07/2026 10:00', action: 'Thanh toán tiền thuê mặt bằng', actor: 'Nguyễn Trường Thịnh' },
    ],
  },
  {
    id: 'PC-2026-060',
    date: '19/07/2026',
    time: '09:15',
    type: 'EXPENSE',
    category: 'Điện nước',
    description: 'Thanh toán hóa đơn tiền điện sinh hoạt & máy lạnh T7/2026',
    amount: 6840000,
    branch: 'Q3',
    method: 'BANK',
    counterparty: 'Tổng Công ty Điện lực TP.HCM (EVN)',
    status: 'POSTED',
    createdBy: 'Minh Châu',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Thanh toán tự động qua trích nợ VCB',
    documentName: 'hoa_don_dien_evn_0726.pdf',
    auditTrail: [
      { time: '19/07/2026 09:15', action: 'Ghi nhận hóa đơn điện nước', actor: 'Minh Châu' },
    ],
  },
  {
    id: 'PC-2026-059',
    date: '18/07/2026',
    time: '16:30',
    type: 'EXPENSE',
    category: 'Marketing',
    description: 'Ngân sách chạy quảng cáo Meta Ads & TikTok Summer Nail',
    amount: 4200000,
    branch: 'Q1',
    method: 'CARD',
    counterparty: 'Meta Platforms & TikTok Ads',
    relatedStaff: 'Bảo Ngọc',
    status: 'POSTED',
    createdBy: 'Bảo Ngọc',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Thanh toán trực tiếp bằng thẻ Visa doanh nghiệp',
    auditTrail: [
      { time: '18/07/2026 16:30', action: 'Tạo phiếu chi marketing', actor: 'Bảo Ngọc' },
    ],
  },
  {
    id: 'PT-2026-081',
    date: '18/07/2026',
    time: '14:20',
    type: 'INCOME',
    category: 'Thu hồi công nợ',
    description: 'Thu tiền công nợ gói làm đẹp cô dâu đợt trước',
    amount: 8500000,
    branch: 'Q1',
    method: 'BANK',
    counterparty: 'Lumière Boutique Hotel & Wedding',
    status: 'POSTED',
    createdBy: 'Thu Hà',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Đã nhận chuyển khoản đối soát công nợ B2B',
    auditTrail: [
      { time: '18/07/2026 14:20', action: 'Ghi nhận thu hồi công nợ', actor: 'Thu Hà' },
    ],
  },
  {
    id: 'PT-2026-080',
    date: '17/07/2026',
    time: '11:10',
    type: 'INCOME',
    category: 'Thu hội viên',
    description: 'Nạp tiền gói hội viên VIP Silver 12 triệu tặng 2 triệu',
    amount: 12000000,
    branch: 'Q3',
    method: 'BANK',
    counterparty: 'Trần Thu Hà',
    relatedCustomer: 'Trần Thu Hà',
    status: 'POSTED',
    createdBy: 'Trâm Anh',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Đã cộng hạn mức tài khoản hội viên trên ứng dụng',
    auditTrail: [
      { time: '17/07/2026 11:10', action: 'Ghi nhận nạp thẻ hội viên', actor: 'Trâm Anh' },
    ],
  },
  {
    id: 'PC-2026-058',
    date: '16/07/2026',
    time: '15:40',
    type: 'EXPENSE',
    category: 'Hoàn tiền khách',
    description: 'Hoàn tiền cọc do khách hủy lịch trước 24 giờ',
    amount: 850000,
    branch: 'Q3',
    method: 'BANK',
    counterparty: 'Lê Mộc Trà',
    relatedCustomer: 'Lê Mộc Trà',
    status: 'POSTED',
    createdBy: 'Thu Hà',
    approvedBy: 'Nguyễn Trường Thịnh',
    note: 'Hoàn tiền chuyển khoản qua ngân hàng Vietcombank',
    auditTrail: [
      { time: '16/07/2026 15:40', action: 'Tạo phiếu hoàn tiền khách hàng', actor: 'Thu Hà' },
    ],
  },
  {
    id: 'PC-2026-057',
    date: '15/07/2026',
    time: '10:20',
    type: 'EXPENSE',
    category: 'Chi khác',
    description: 'Mua nước uống, trà bánh chiều phục vụ khách hàng tại quầy',
    amount: 420000,
    branch: 'Q1',
    method: 'CASH',
    counterparty: 'Tiệm trà bánh Tràng An',
    status: 'POSTED',
    createdBy: 'Kim Anh',
    approvedBy: 'Thu Hà',
    note: 'Thanh toán tiền mặt kèm hóa đơn bán lẻ',
    auditTrail: [
      { time: '15/07/2026 10:20', action: 'Chi tiền phục vụ khách hàng', actor: 'Kim Anh' },
    ],
  },
  {
    id: 'PC-2026-056',
    date: '20/07/2026',
    time: '17:00',
    type: 'EXPENSE',
    category: 'Lương, phụ cấp & hoa hồng',
    description: 'Dự thảo chi hoa hồng kỹ thuật viên Thảo Nguyễn',
    amount: 18500000,
    branch: 'Q3',
    method: 'BANK',
    counterparty: 'Thảo Nguyễn (Senior Artist)',
    relatedStaff: 'Thảo Nguyễn',
    status: 'DRAFT',
    createdBy: 'Minh Châu',
    note: 'Phiếu nháp chờ chốt số lịch dịch vụ cuối tháng',
    auditTrail: [
      { time: '20/07/2026 17:00', action: 'Tạo phiếu nháp hoa hồng', actor: 'Minh Châu' },
    ],
  },
];

const money = (val: number) => `${val.toLocaleString('vi-VN')}đ`;
const shortMoney = (val: number) =>
  `${(val / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;

const methodLabels: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Chuyển khoản',
  CARD: 'Thẻ',
  EWALLET: 'Ví điện tử',
};

const statusMeta: Record<TransactionStatus, { label: string; tone: string }> = {
  POSTED: { label: 'Hoàn thành', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PENDING: { label: 'Đang chờ', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  DRAFT: { label: 'Nháp', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  VOID: { label: 'Đã hủy', tone: 'bg-rose-50 text-rose-600 ring-rose-200' },
};

export default function TenantAdminFinanceCompact({
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Lumière Nail Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason,
  onNotify,
}: TenantAdminFinanceProps) {
  const storageKey = `tenant-admin-finance-v1:${tenantName}:transactions`;

  // Local storage state
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return getTenantAdminInitialData(stored ? JSON.parse(stored) : null, INITIAL_TRANSACTIONS);
    } catch {
      return getTenantAdminInitialData(null, INITIAL_TRANSACTIONS);
    }
  });

  // Save to localStorage & notify system
  const saveTransactions = (next: FinanceTransaction[]) => {
    setTransactions(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('salonsys_finance_updated'));
    } catch {
      // ignore
    }
  };

  // Filters state
  const [search, setSearch] = useState('');
  const activeSearch = externalSearchQuery !== undefined ? externalSearchQuery : search;
  const handleSearchChange = (val: string) => {
    setSearch(val);
    onSearchQueryChange?.(val);
  };

  const [datePeriod, setDatePeriod] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<FinanceTransaction | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<FinanceTransaction | null>(null);

  // Form inputs
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  const [formCategory, setFormCategory] = useState<string>('Thu dịch vụ');
  const [formCode, setFormCode] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formTime, setFormTime] = useState<string>('');
  const [formBranch, setFormBranch] = useState<'Q3' | 'Q1'>('Q3');
  const [formCounterparty, setFormCounterparty] = useState<string>('');
  const [formStaff, setFormStaff] = useState<string>('');
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('BANK');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDocument, setFormDocument] = useState<string>('');
  const [formStatus, setFormStatus] = useState<TransactionStatus>('POSTED');
  const [formError, setFormError] = useState<string>('');

  // Auto-generate code when form type changes
  const generateNewCode = (type: TransactionType) => {
    const prefix = type === 'INCOME' ? 'PT-2026' : 'PC-2026';
    const existingNum = transactions
      .filter((t) => t.id.startsWith(prefix))
      .map((t) => parseInt(t.id.split('-')[2] || '0', 10))
      .filter((n) => !isNaN(n));
    const nextNum = existingNum.length ? Math.max(...existingNum) + 1 : 85;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  };

  // Open Create Form
  const openCreateModal = () => {
    if (readOnlyReason) {
      onNotify?.(readOnlyReason);
      return;
    }
    const today = new Date();
    const isoDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const isoTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    setEditingTransaction(null);
    setFormType('INCOME');
    setFormCategory('Thu dịch vụ');
    setFormCode(generateNewCode('INCOME'));
    setFormDate(isoDate);
    setFormTime(isoTime);
    setFormBranch(selectedBranch === 'Q1' ? 'Q1' : 'Q3');
    setFormCounterparty('');
    setFormStaff('');
    setFormCustomer('');
    setFormDescription('');
    setFormMethod('BANK');
    setFormAmount('');
    setFormDocument('');
    setFormStatus('POSTED');
    setFormError('');
    setFormOpen(true);
  };

  // Open Edit Form
  const openEditModal = (tx: FinanceTransaction) => {
    if (tx.status === 'POSTED') {
      onNotify?.('Giao dịch đã hoàn thành chỉ được xem, không thể chỉnh sửa.');
      setDetailTransaction(tx);
      return;
    }
    setEditingTransaction(tx);
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormCode(tx.id);
    setFormDate(tx.date);
    setFormTime(tx.time);
    setFormBranch(tx.branch);
    setFormCounterparty(tx.counterparty);
    setFormStaff(tx.relatedStaff || '');
    setFormCustomer(tx.relatedCustomer || '');
    setFormDescription(tx.description);
    setFormMethod(tx.method);
    setFormAmount(String(tx.amount));
    setFormDocument(tx.documentName || '');
    setFormStatus(tx.status);
    setFormError('');
    setFormOpen(true);
  };

  // Handle Form Type Change
  const handleTypeChange = (newType: TransactionType) => {
    setFormType(newType);
    if (!editingTransaction) {
      setFormCode(generateNewCode(newType));
    }
    const defaultCat = newType === 'INCOME' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
    setFormCategory(defaultCat);
  };

  // Handle Category Change (Staff selection logic)
  const handleCategoryChange = (cat: string) => {
    setFormCategory(cat);
    if (cat === 'Lương, phụ cấp & hoa hồng' && STAFF_LIST.length > 0) {
      if (!formStaff) {
        const firstStaff = STAFF_LIST[0];
        setFormStaff(firstStaff.name);
        setFormCounterparty(`${firstStaff.name} (${firstStaff.role})`);
        setFormBranch(firstStaff.branch);
      }
    }
  };

  // Handle Staff selection
  const handleStaffSelect = (staffName: string) => {
    setFormStaff(staffName);
    const found = STAFF_LIST.find((s) => s.name === staffName);
    if (found) {
      setFormCounterparty(`${found.name} (${found.role})`);
      setFormBranch(found.branch);
    }
  };

  // Save Transaction
  const handleSaveTransaction = (e: FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Vui lòng nhập số tiền hợp lệ (> 0đ).');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Vui lòng nhập nội dung / mô tả giao dịch.');
      return;
    }

    const nowStr = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const actorName = tenantName.includes('Admin') ? 'Tenant Admin' : 'Nguyễn Trường Thịnh';

    if (editingTransaction) {
      const updatedList = transactions.map((t) => {
        if (t.id === editingTransaction.id) {
          const newAudit: AuditTrailItem = {
            time: nowStr,
            action: `Cập nhật thông tin phiếu (${formStatus === 'POSTED' ? 'Chốt sổ' : 'Chỉnh sửa'})`,
            actor: actorName,
          };
          return {
            ...t,
            type: formType,
            category: formCategory,
            description: formDescription.trim(),
            amount: numericAmount,
            branch: formBranch,
            method: formMethod,
            counterparty: formCounterparty.trim() || 'Đối tác / Khách',
            relatedStaff: formStaff || undefined,
            relatedCustomer: formCustomer || undefined,
            status: formStatus,
            documentName: formDocument || undefined,
            auditTrail: [newAudit, ...(t.auditTrail || [])],
          };
        }
        return t;
      });
      saveTransactions(updatedList);
      onNotify?.(`Đã cập nhật giao dịch ${formCode} thành công.`);
    } else {
      const newTx: FinanceTransaction = {
        id: formCode,
        date: formDate,
        time: formTime,
        type: formType,
        category: formCategory,
        description: formDescription.trim(),
        amount: numericAmount,
        branch: formBranch,
        method: formMethod,
        counterparty: formCounterparty.trim() || (formType === 'INCOME' ? 'Khách hàng' : 'Đối tác'),
        relatedStaff: formStaff || undefined,
        relatedCustomer: formCustomer || undefined,
        status: formStatus,
        createdBy: actorName,
        approvedBy: formStatus === 'POSTED' ? actorName : undefined,
        documentName: formDocument || undefined,
        auditTrail: [
          {
            time: `${formDate} ${formTime}`,
            action: `Tạo mới phiếu ${formType === 'INCOME' ? 'thu' : 'chi'} (${statusMeta[formStatus].label})`,
            actor: actorName,
          },
        ],
      };
      saveTransactions([newTx, ...transactions]);
      onNotify?.(`Đã tạo mới giao dịch ${formCode} thành công.`);
    }

    setFormOpen(false);
  };

  // Delete Transaction
  const handleDeleteTransaction = (tx: FinanceTransaction) => {
    if (tx.status === 'POSTED') {
      onNotify?.('Giao dịch đã hoàn thành không được phép xóa.');
      return;
    }
    const nextList = transactions.filter((t) => t.id !== tx.id);
    saveTransactions(nextList);
    setDeleteConfirmTx(null);
    onNotify?.(`Đã xóa giao dịch ${tx.id}.`);
  };

  // Approve Transaction (Direct posted)
  const handleApproveTransaction = (tx: FinanceTransaction) => {
    const updated = transactions.map((t) => {
      if (t.id === tx.id) {
        const nowStr = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        return {
          ...t,
          status: 'POSTED' as TransactionStatus,
          approvedBy: 'Nguyễn Trường Thịnh',
          auditTrail: [
            { time: nowStr, action: 'Duyệt phiếu & chốt sổ ghi nhận', actor: 'Tenant Admin' },
            ...(t.auditTrail || []),
          ],
        };
      }
      return t;
    });
    saveTransactions(updated);
    onNotify?.(`Đã duyệt & chốt sổ thành công phiếu ${tx.id}.`);
    if (detailTransaction?.id === tx.id) {
      setDetailTransaction(updated.find((u) => u.id === tx.id) || null);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Branch filter
      if (selectedBranch !== 'ALL' && tx.branch !== selectedBranch) return false;

      // Type filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;

      // Search query
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase().trim();
        const matchCode = tx.id.toLowerCase().includes(q);
        const matchCounterparty = tx.counterparty.toLowerCase().includes(q);
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchStaff = (tx.relatedStaff || '').toLowerCase().includes(q);
        const matchCust = (tx.relatedCustomer || '').toLowerCase().includes(q);
        if (!matchCode && !matchCounterparty && !matchDesc && !matchStaff && !matchCust) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedBranch, typeFilter, categoryFilter, statusFilter, activeSearch]);

  // Top KPIs calculations
  const kpiData = useMemo(() => {
    const branchTxList = transactions.filter(
      (t) => selectedBranch === 'ALL' || t.branch === selectedBranch
    );

    // Posted Income
    const totalIncome = branchTxList
      .filter((t) => t.type === 'INCOME' && t.status === 'POSTED')
      .reduce((sum, t) => sum + t.amount, 0);

    // Posted Expense
    const totalExpense = branchTxList
      .filter((t) => t.type === 'EXPENSE' && t.status === 'POSTED')
      .reduce((sum, t) => sum + t.amount, 0);

    // Net Cash Flow
    const netCashFlow = totalIncome - totalExpense;

    // Pending / Draft
    const pendingList = branchTxList.filter(
      (t) => t.status === 'PENDING' || t.status === 'DRAFT'
    );
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      pendingCount,
      pendingAmount,
    };
  }, [transactions, selectedBranch]);

  // Export functions
  const exportExcel = () => {
    const headers = [
      'Mã phiếu',
      'Ngày',
      'Giờ',
      'Loại',
      'Danh mục',
      'Chi nhánh',
      'Người nhận/nộp',
      'NV liên quan',
      'KH liên quan',
      'Phương thức',
      'Số tiền',
      'Trạng thái',
      'Người tạo',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.time,
      t.type === 'INCOME' ? 'Thu' : 'Chi',
      t.category,
      t.branch === 'Q3' ? 'Quận 3' : 'Quận 1',
      `"${t.counterparty}"`,
      `"${t.relatedStaff || ''}"`,
      `"${t.relatedCustomer || ''}"`,
      methodLabels[t.method],
      t.amount,
      statusMeta[t.status].label,
      `"${t.createdBy}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `so_thu_chi_${tenantName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify?.('Đã xuất tập tin sổ giao dịch CSV thành công.');
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <section className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
              <WalletCards className="h-4 w-4" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
              Hệ thống Quản lý Giao dịch Tài chính (Nghiệp vụ POS / ERP)
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Sổ Nhật Ký Thu & Chi
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Nguồn dữ liệu giao dịch duy nhất. Mọi khoản thu, chi phát sinh tại salon được ghi sổ
            và tự động tổng hợp sang module Báo Báo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportExcel}
            className="flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-xs font-bold text-slate-200 shadow-sm transition hover:bg-slate-800 hover:text-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Xuất Excel/CSV
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-xs font-bold text-slate-200 shadow-sm transition hover:bg-slate-800 hover:text-white"
          >
            <Printer className="h-4 w-4 text-violet-400" />
            In sổ / PDF
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 items-center gap-2 rounded-2xl border border-violet-600 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Tạo giao dịch mới
          </button>
        </div>
      </section>

      {/* TOP KPIS SECTION */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Income */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tổng Thu (Đã ghi sổ)
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-700">
                {money(kpiData.totalIncome)}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" /> Doanh thu thực nhận từ dịch vụ, cọc & bán lẻ
          </p>
        </article>

        {/* Total Expense */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tổng Chi (Đã ghi sổ)
              </p>
              <p className="mt-2 text-2xl font-black text-rose-700">
                {money(kpiData.totalExpense)}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-rose-600">
            <TrendingDown className="h-3.5 w-3.5" /> Chi phí lương, vật tư, thuê nhà & vận hành
          </p>
        </article>

        {/* Net Cashflow */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Dòng Tiền Thuần
              </p>
              <p
                className={`mt-2 text-2xl font-black ${
                  kpiData.netCashFlow >= 0 ? 'text-violet-700' : 'text-rose-700'
                }`}
              >
                {money(kpiData.netCashFlow)}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CircleDollarSign className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-[10px] font-bold text-slate-500">
            Cân đối thu trừ chi thực tế trong kỳ
          </p>
        </article>

        {/* Pending Transactions */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Giao Dịch Đang Chờ Xử Lý
              </p>
              <p className="mt-2 text-2xl font-black text-amber-600">
                {kpiData.pendingCount} <span className="text-sm font-bold text-slate-500">phiếu</span>
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-[10px] font-bold text-amber-700">
            Tổng giá trị chờ duyệt: {shortMoney(kpiData.pendingAmount)}
          </p>
        </article>
      </section>

      {/* FILTER BAR SECTION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo mã phiếu, người nộp/nhận, khách hàng, nội dung..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </div>

          {/* Branch filter */}
          <div>
            <BeautifulSelect
              value={selectedBranch}
              onChange={(e) => onSelectedBranchChange(e.target.value)}
              aria-label="Chi nhánh"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              <option value="Q3">Chi nhánh Quận 3</option>
              <option value="Q1">Chi nhánh Quận 1</option>
            </BeautifulSelect>
          </div>

          {/* Type filter */}
          <div>
            <BeautifulSelect
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCategoryFilter('ALL');
              }}
              aria-label="Loại giao dịch"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả loại (Thu & Chi)</option>
              <option value="INCOME">Chỉ khoản THU (+)</option>
              <option value="EXPENSE">Chỉ khoản CHI (−)</option>
            </BeautifulSelect>
          </div>

          {/* Category filter */}
          <div>
            <BeautifulSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Danh mục"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả danh mục</option>
              {typeFilter !== 'EXPENSE' && (
                <optgroup label="Danh mục Thu">
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
              {typeFilter !== 'INCOME' && (
                <optgroup label="Danh mục Chi">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
            </BeautifulSelect>
          </div>

          {/* Status filter */}
          <div>
            <BeautifulSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Trạng thái"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="POSTED">Hoàn thành (Đã ghi sổ)</option>
              <option value="PENDING">Đang chờ xử lý</option>
              <option value="DRAFT">Phiếu nháp</option>
              <option value="VOID">Đã hủy</option>
            </BeautifulSelect>
          </div>
        </div>
      </section>

      {/* TRANSACTIONS TABLE */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Danh Sách Phiếu Giao Dịch</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Hiển thị {filteredTransactions.length} trên tổng số {transactions.length} giao dịch
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-50 px-3 py-1 text-[9px] font-bold text-violet-700">
              Chi nhánh: {selectedBranch === 'ALL' ? 'Toàn hệ thống' : selectedBranch}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3.5">Mã phiếu & Ngày</th>
                <th className="px-3 py-3.5">Loại & Danh mục</th>
                <th className="px-3 py-3.5">Chi nhánh</th>
                <th className="px-3 py-3.5">Người nhận / Nộp</th>
                <th className="px-3 py-3.5">Liên quan (NV / KH)</th>
                <th className="px-3 py-3.5">Thanh toán</th>
                <th className="px-3 py-3.5 text-right">Số tiền</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="px-3 py-3.5">Người tạo</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const isInc = tx.type === 'INCOME';
                  const st = statusMeta[tx.status];

                  return (
                    <tr key={tx.id} className="transition hover:bg-slate-50/80">
                      {/* Code & Date */}
                      <td className="px-4 py-3.5">
                        <p className="font-black text-slate-900">{tx.id}</p>
                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          {tx.date} · {tx.time}
                        </p>
                      </td>

                      {/* Type & Category */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[8px] font-black uppercase ${
                            isInc ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isInc ? 'THU (+)' : 'CHI (−)'}
                        </span>
                        <p className="mt-1 font-bold text-slate-800">{tx.category}</p>
                      </td>

                      {/* Branch */}
                      <td className="px-3 py-3.5 font-bold text-slate-700">
                        {tx.branch === 'Q3' ? 'Quận 3' : 'Quận 1'}
                      </td>

                      {/* Counterparty */}
                      <td className="px-3 py-3.5">
                        <p className="font-bold text-slate-800">{tx.counterparty}</p>
                        <p className="mt-0.5 max-w-[180px] truncate text-[9px] text-slate-400">
                          {tx.description}
                        </p>
                      </td>

                      {/* Related Staff / Customer */}
                      <td className="px-3 py-3.5">
                        {tx.relatedStaff && (
                          <span className="block text-[10px] font-bold text-violet-700">
                            NV: {tx.relatedStaff}
                          </span>
                        )}
                        {tx.relatedCustomer && (
                          <span className="block text-[10px] font-medium text-slate-600">
                            KH: {tx.relatedCustomer}
                          </span>
                        )}
                        {!tx.relatedStaff && !tx.relatedCustomer && (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="px-3 py-3.5 font-semibold text-slate-600">
                        {methodLabels[tx.method]}
                      </td>

                      {/* Amount */}
                      <td
                        className={`px-3 py-3.5 text-right text-xs font-black ${
                          isInc ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isInc ? '+' : '−'}
                        {money(tx.amount)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[8px] font-black ${st.tone}`}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Created By */}
                      <td className="px-3 py-3.5 text-slate-500">{tx.createdBy}</td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => setDetailTransaction(tx)}
                            title="Xem chi tiết phiếu"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Button (Disabled for POSTED) */}
                          {tx.status !== 'POSTED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(tx)}
                                title="Chỉnh sửa phiếu"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-violet-600 shadow-sm transition hover:bg-violet-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApproveTransaction(tx)}
                                title="Chốt sổ / Duyệt ngay"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteConfirmTx(tx)}
                                title="Xóa phiếu"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 shadow-sm transition hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs font-semibold text-slate-400">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-black text-slate-900">
                  <td colSpan={6} className="px-4 py-3.5 text-xs">
                    Tổng cộng ({filteredTransactions.length} giao dịch)
                  </td>
                  <td className="px-3 py-3.5 text-right text-xs text-violet-700">
                    {money(
                      filteredTransactions.reduce(
                        (sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount),
                        0
                      )
                    )}
                  </td>
                  <td colSpan={3} className="px-4 py-3.5 text-right text-[10px] text-slate-500">
                    Đã chọn bộ lọc
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTransaction ? `Chỉnh Sửa Giao Dịch ${formCode}` : 'Tạo Giao Dịch Mới'}
        subtitle="Phiếu giao dịch sẽ được ghi nhận trực tiếp vào sổ nhật ký tài chính của salon"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {formError}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => handleTypeChange('INCOME')}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-black transition ${
                formType === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              PHIẾU THU (+ Khoản Thu)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('EXPENSE')}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-black transition ${
                formType === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              PHIẾU CHI (− Khoản Chi)
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Code (Auto-generated) */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Mã phiếu <span className="text-slate-400">(Tự động)</span>
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                readOnly={Boolean(editingTransaction)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-black text-slate-800 outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Danh mục {formType === 'INCOME' ? 'Thu' : 'Chi'} <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Danh mục"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none"
              >
                {(formType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </BeautifulSelect>
            </div>

            {/* Date & Time */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Ngày giao dịch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Giờ giao dịch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                placeholder="HH:mm"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Chi nhánh phát sinh <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value as any)}
                aria-label="Chi nhánh"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="Q3">Chi nhánh Quận 3</option>
                <option value="Q1">Chi nhánh Quận 1</option>
              </BeautifulSelect>
            </div>

            {/* Payment Method */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Phương thức thanh toán <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as any)}
                aria-label="Phương thức thanh toán"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="BANK">Chuyển khoản Ngân hàng</option>
                <option value="CASH">Tiền mặt tại quầy</option>
                <option value="CARD">Quẹt thẻ POS</option>
                <option value="EWALLET">Ví điện tử / Online</option>
              </BeautifulSelect>
            </div>

            {/* Counterparty */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                {formType === 'INCOME' ? 'Người nộp tiền' : 'Người nhận tiền'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formCounterparty}
                onChange={(e) => setFormCounterparty(e.target.value)}
                placeholder={
                  formType === 'INCOME' ? 'Nhập tên khách / đơn vị nộp' : 'Nhập tên nhà cung cấp / người nhận'
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Số tiền (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-900 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Business Logic: Staff integration for Payroll category */}
          {formCategory === 'Lương, phụ cấp & hoa hồng' && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-800">
                ⚡ Nghiệp vụ chi lương & hoa hồng nhân viên
              </p>
              <p className="mt-0.5 text-[10px] text-violet-600">
                Danh sách nhân viên được đồng bộ trực tiếp từ Module Nhân Sự
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-700">
                    Chọn nhân viên hưởng lương
                  </label>
                  <BeautifulSelect
                    value={formStaff}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                    aria-label="Nhân viên"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {STAFF_LIST.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.role} - {s.branch})
                      </option>
                    ))}
                  </BeautifulSelect>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-700">
                    Chi nhánh nhân viên
                  </label>
                  <input
                    type="text"
                    value={formBranch === 'Q3' ? 'Chi nhánh Quận 3' : 'Chi nhánh Quận 1'}
                    readOnly
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Related Customer & Staff (for non-payroll) */}
          {formCategory !== 'Lương, phụ cấp & hoa hồng' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Khách hàng liên quan <span className="text-slate-400">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  placeholder="Chọn hoặc nhập tên khách hàng..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Nhân viên liên quan <span className="text-slate-400">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={formStaff}
                  onChange={(e) => setFormStaff(e.target.value)}
                  placeholder="Nhập tên nhân viên liên quan..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-700">
              Nội dung / Mô tả lý do giao dịch <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Nhập chi tiết diễn giải phiếu giao dịch..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
            />
          </div>

          {/* Document Attachment & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Đính kèm chứng từ / Hóa đơn VAT <span className="text-slate-400">(Tùy chọn)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formDocument}
                  onChange={(e) => setFormDocument(e.target.value)}
                  placeholder="Tên chứng từ (VD: hoa_don_vat.pdf)..."
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-violet-400 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setFormDocument(`bien_nhan_${Date.now().toString().slice(-4)}.pdf`)}
                  className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Thêm file
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">
                Trạng thái ghi sổ <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                aria-label="Trạng thái"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="POSTED">Hoàn thành (Ghi sổ ngay)</option>
                <option value="PENDING">Đang chờ phê duyệt</option>
                <option value="DRAFT">Lưu phiếu nháp</option>
              </BeautifulSelect>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl border border-violet-600 bg-violet-600 px-6 text-xs font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
            >
              {editingTransaction ? 'Cập Nhật Giao Dịch' : 'Lưu & Ghi Sổ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* TRANSACTION DETAIL MODAL */}
      {detailTransaction && (
        <Modal
          isOpen={Boolean(detailTransaction)}
          onClose={() => setDetailTransaction(null)}
          title={`Chi Tiết Phiếu Giao Dịch ${detailTransaction.id}`}
          subtitle="Chứng từ kế toán chính thức thuộc sổ nhật ký tài chính Lumière Studio"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Stamp & Banner */}
            <div
              className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md ${
                detailTransaction.type === 'INCOME'
                  ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
                  : 'bg-gradient-to-r from-slate-900 to-rose-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                    {detailTransaction.type === 'INCOME' ? 'PHIẾU THU THUẦN' : 'PHIẾU CHI THỰC TẾ'}
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-300">
                    Mã chứng từ: <span className="font-mono font-bold text-white">{detailTransaction.id}</span>
                  </p>
                  <p className="mt-1 text-3xl font-black">
                    {money(detailTransaction.amount)}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      statusMeta[detailTransaction.status].tone
                    }`}
                  >
                    {statusMeta[detailTransaction.status].label}
                  </span>
                  <p className="mt-2 text-[10px] font-bold text-slate-300">
                    {detailTransaction.date} · {detailTransaction.time}
                  </p>
                </div>
              </div>

              {/* Watermark stamp for POSTED */}
              {detailTransaction.status === 'POSTED' && (
                <div className="absolute -bottom-4 -right-4 rotate-[-12deg] rounded-2xl border-4 border-emerald-400/40 px-4 py-2 text-xl font-black uppercase tracking-widest text-emerald-300/30">
                  ĐÃ CHỐT SỔ
                </div>
              )}
            </div>

            {/* Attributes Grid */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Danh mục tài chính</p>
                <p className="mt-1 font-black text-slate-800">{detailTransaction.category}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Chi nhánh hạch toán</p>
                <p className="mt-1 font-black text-slate-800">
                  {detailTransaction.branch === 'Q3' ? 'Chi nhánh Quận 3' : 'Chi nhánh Quận 1'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">
                  {detailTransaction.type === 'INCOME' ? 'Người nộp tiền' : 'Người nhận tiền'}
                </p>
                <p className="mt-1 font-black text-slate-800">{detailTransaction.counterparty}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Phương thức thanh toán</p>
                <p className="mt-1 font-black text-slate-800">
                  {methodLabels[detailTransaction.method]}
                </p>
              </div>

              {detailTransaction.relatedStaff && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                  <p className="text-[10px] font-bold text-violet-600">Nhân viên liên quan</p>
                  <p className="mt-1 font-black text-violet-900">{detailTransaction.relatedStaff}</p>
                </div>
              )}

              {detailTransaction.relatedCustomer && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-[10px] font-bold text-blue-600">Khách hàng liên quan</p>
                  <p className="mt-1 font-black text-blue-900">{detailTransaction.relatedCustomer}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Người lập phiếu</p>
                <p className="mt-1 font-bold text-slate-700">{detailTransaction.createdBy}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Người phê duyệt / Chốt sổ</p>
                <p className="mt-1 font-bold text-slate-700">
                  {detailTransaction.approvedBy || 'Chưa duyệt'}
                </p>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nội dung diễn giải
              </p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-800">
                {detailTransaction.description}
              </p>
              {detailTransaction.note && (
                <p className="mt-2 border-t border-slate-200/60 pt-2 text-[10px] text-slate-500">
                  Ghi chú: {detailTransaction.note}
                </p>
              )}
            </div>

            {/* Document attachment */}
            {detailTransaction.documentName && (
              <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-violet-600" />
                  <span className="font-bold text-violet-900">{detailTransaction.documentName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNotify?.(`Đang tải tập tin ${detailTransaction.documentName}...`)}
                  className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-violet-700 shadow-sm"
                >
                  Xem chứng từ
                </button>
              </div>
            )}

            {/* Audit Trail Timeline */}
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Lịch sử cập nhật phiếu (Audit Trail)
              </p>
              <div className="mt-3 space-y-2.5">
                {detailTransaction.auditTrail && detailTransaction.auditTrail.length > 0 ? (
                  detailTransaction.auditTrail.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-[10px]">
                      <span className="mt-1 h-2 w-2 rounded-full bg-violet-500" />
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{item.action}</p>
                        <p className="mt-0.5 text-slate-400">
                          {item.time} · Thực hiện bởi: <span className="font-bold">{item.actor}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400">Chưa có lịch sử thay đổi thêm.</p>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {detailTransaction.status !== 'POSTED' ? (
                <button
                  type="button"
                  onClick={() => handleApproveTransaction(detailTransaction)}
                  className="flex h-11 items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-5 text-xs font-black text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Duyệt & Chốt Sổ Ngay
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Đã chốt sổ (Chỉ được xem)
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  In chứng từ
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTransaction(null)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-900 px-5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmTx && (
        <Modal
          isOpen={Boolean(deleteConfirmTx)}
          onClose={() => setDeleteConfirmTx(null)}
          title="Xác Nhận Xóa Phiếu Giao Dịch"
          subtitle="Thao tác này chỉ áp dụng với phiếu nháp hoặc phiếu đang chờ xử lý"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="font-semibold text-slate-700">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu <span className="font-black text-rose-600">{deleteConfirmTx.id}</span> ({deleteConfirmTx.category} - {money(deleteConfirmTx.amount)}) không?
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTransaction(deleteConfirmTx)}
                className="h-10 rounded-xl bg-rose-600 px-5 font-black text-white shadow-md hover:bg-rose-700"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
