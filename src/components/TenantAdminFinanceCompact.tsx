import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { PageHeader } from './ui';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Landmark,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import BeautifulSelect from './BeautifulSelect';
import { formatCompactMoney, formatMoney as money } from '../utils/money';
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
  /** Vẫn nhận để đồng bộ với các màn hình khác, nhưng màn này không hiển thị vai trò. */
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
  {
    id: 'PC-2026-055',
    date: '14/07/2026',
    time: '18:10',
    type: 'EXPENSE',
    category: 'Chi khác',
    description: 'Thanh toán phí vận chuyển vật tư - Phát hiện sai lệch số tiền',
    amount: 1250000,
    branch: 'Q3',
    method: 'CASH',
    counterparty: 'Giao Hàng Nhanh (GHN)',
    relatedStaff: 'Minh Châu',
    status: 'VOID',
    createdBy: 'Minh Châu',
    note: 'Phiếu tạm khóa do phát hiện trùng lắp - Cần đối soát lại với nhà vận chuyển',
    auditTrail: [
      { time: '14/07/2026 18:10', action: 'Tạo phiếu chi giao hàng', actor: 'Minh Châu' },
      { time: '14/07/2026 18:25', action: 'Cảnh báo sai lệch & đánh dấu có vấn đề', actor: 'Thủ quỹ' },
    ],
  },
];

const shortMoney = (val: number) => formatCompactMoney(val);

const methodLabels: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Chuyển khoản',
  CARD: 'Thẻ POS',
  EWALLET: 'Ví điện tử',
};

const statusMeta: Record<TransactionStatus, { label: string; tone: string; badgeBg: string }> = {
  POSTED: {
    label: 'Hoàn thành',
    tone: 'text-slate-600 bg-slate-100/90 border-slate-200/80 font-semibold',
    badgeBg: 'bg-slate-400',
  },
  PENDING: {
    label: 'Cần xử lý',
    tone: 'text-amber-800 bg-amber-50 border-amber-200/90 font-bold',
    badgeBg: 'bg-amber-500',
  },
  DRAFT: {
    label: 'Cần xử lý',
    tone: 'text-amber-800 bg-amber-50 border-amber-200/90 font-bold',
    badgeBg: 'bg-amber-500',
  },
  VOID: {
    label: 'Cần xử lý',
    tone: 'text-amber-800 bg-amber-50 border-amber-200/90 font-bold',
    badgeBg: 'bg-amber-500',
  },
};

const statusDot: Record<TransactionStatus, string> = {
  POSTED: 'bg-slate-400',
  PENDING: 'bg-amber-500',
  DRAFT: 'bg-sky-500',
  VOID: 'bg-rose-500',
};

const FINANCE_PAGE_SIZE = 20;

type DateChipValue = 'ALL' | 'TODAY' | 'YESTERDAY' | '7D' | 'MONTH' | 'CUSTOM';

const DATE_CHIPS: { value: DateChipValue; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'YESTERDAY', label: 'Hôm qua' },
  { value: '7D', label: '7 ngày' },
  { value: 'MONTH', label: 'Tháng này' },
  { value: 'CUSTOM', label: 'Tùy chỉnh' },
];

const STATUS_CHIPS: { value: 'ALL' | 'ACTION_REQUIRED' | TransactionStatus; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTION_REQUIRED', label: 'Cần xử lý' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'DRAFT', label: 'Cần xác nhận' },
  { value: 'VOID', label: 'Có vấn đề' },
  { value: 'POSTED', label: 'Hoàn thành' },
];

const CASH_METHOD_ROWS: { key: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { key: 'CASH', label: 'Tiền mặt', icon: Banknote },
  { key: 'BANK', label: 'Chuyển khoản', icon: Landmark },
  { key: 'CARD', label: 'Thẻ POS', icon: CreditCard },
  { key: 'EWALLET', label: 'Ví điện tử', icon: Wallet },
];

const parseVNDate = (value: string): Date | null => {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const getDateRangeForChip = (
  chip: DateChipValue,
  customFrom: string,
  customTo: string
): { from: Date | null; to: Date | null } => {
  const now = new Date();
  switch (chip) {
    case 'TODAY':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'YESTERDAY': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7D': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'MONTH':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case 'CUSTOM': {
      const from = parseVNDate(customFrom);
      const to = parseVNDate(customTo);
      return { from: from ? startOfDay(from) : null, to: to ? endOfDay(to) : null };
    }
    default:
      return { from: null, to: null };
  }
};

// Segmented control styled with project design system (white + pastel pink accents)
function FinanceSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode; activeClassName?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-pink-50/70 p-1 border border-pink-100/80">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
            value === opt.value
              ? opt.activeClassName || 'bg-white text-slate-900 shadow-2xs border border-pink-100/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Clean filter chip button
function FinanceFilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-body font-black transition-all ${
        active
          ? 'border-pink-500 bg-pink-600 text-white shadow-2xs'
          : 'border-pink-100/90 bg-white text-slate-700 hover:border-pink-200 hover:bg-pink-50/40'
      }`}
    >
      {children}
      {typeof count === 'number' && (
        <span className={`rounded-md px-1.5 py-0.2 text-caption ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Custom Tooltip for Recharts Cash Flow chart
function CustomCashFlowTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const thuVal = payload.find((p: any) => p.dataKey === 'thu')?.value || 0;
    const chiVal = payload.find((p: any) => p.dataKey === 'chi')?.value || 0;
    const netVal = thuVal - chiVal;

    return (
      <div className="rounded-2xl border border-pink-100 bg-white p-3.5 shadow-xl text-xs space-y-2 font-sans min-w-[200px]">
        <div className="border-b border-pink-100/80 pb-1.5 flex items-center justify-between">
          <span className="font-black text-slate-900">{label}</span>
          <span className="text-caption font-bold text-slate-400">Dòng tiền</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-emerald-700 font-extrabold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Tổng Thu:
            </span>
            <span className="tabular-nums">+{money(thuVal)}</span>
          </div>
          <div className="flex items-center justify-between text-rose-600 font-extrabold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Tổng Chi:
            </span>
            <span className="tabular-nums">−{money(chiVal)}</span>
          </div>
          <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between font-black text-slate-900">
            <span>Thu − Chi:</span>
            <span className={netVal >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
              {netVal >= 0 ? '+' : ''}{money(netVal)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function FinanceTransactionRow({
  tx,
  selected,
  onToggleSelect,
  onView,
  onEdit,
  onApprove,
  onDelete,
}: {
  tx: FinanceTransaction;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const isInc = tx.type === 'INCOME';
  const st = statusMeta[tx.status];
  const selectable = tx.status !== 'POSTED';

  // Accent left border for action required (Orange for non-posted)
  let accentBorder = 'border-l-4 border-l-transparent';
  if (tx.status !== 'POSTED') {
    accentBorder = 'border-l-4 border-l-amber-500';
  }

  return (
    <tr
      onClick={onView}
      className={`group cursor-pointer transition-colors ${
        selected ? 'bg-pink-50/70' : 'hover:bg-pink-50/20'
      }`}
    >
      {/* 1. Select Checkbox */}
      <td
        className={`py-3.5 pl-3 pr-2 align-middle ${accentBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleSelect}
          disabled={!selectable}
          aria-label={selected ? 'Bỏ chọn dòng' : 'Chọn dòng'}
          className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
            !selectable
              ? 'cursor-not-allowed border-slate-100 bg-slate-50'
              : selected
              ? 'border-pink-600 bg-pink-600 text-white'
              : 'border-pink-200 bg-white hover:border-pink-400'
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </button>
      </td>

      {/* 2. Mã phiếu + Ngày giờ */}
      <td className="px-3 py-3.5 align-middle whitespace-nowrap min-w-[130px]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
            #{tx.id}
          </span>
          {tx.documentName && (
            <span title={tx.documentName}>
              <Paperclip className="h-3.5 w-3.5 text-pink-500 shrink-0" />
            </span>
          )}
        </div>
        <p className="mt-1 text-body font-semibold text-slate-500">
          {tx.date} <span className="text-slate-400">({tx.time})</span>
        </p>
      </td>

      {/* 3. Badge THU / CHI */}
      <td className="px-3 py-3.5 align-middle whitespace-nowrap min-w-[90px]">
        <span
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-body font-black uppercase tracking-wider ${
            isInc
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              : 'bg-rose-50 text-rose-700 border border-rose-200/80'
          }`}
        >
          {isInc ? <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" /> : <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
          {isInc ? 'THU' : 'CHI'}
        </span>
      </td>

      {/* 4. Danh mục */}
      <td className="px-3 py-3.5 align-middle whitespace-nowrap min-w-[120px]">
        <span className="font-extrabold text-slate-800 text-xs">{tx.category}</span>
      </td>

      {/* 5. Nội dung giao dịch ngắn gọn */}
      <td className="px-3 py-3.5 align-middle max-w-[280px] lg:max-w-[360px]">
        <p className="text-xs font-semibold text-slate-700 truncate" title={tx.description}>
          {tx.description}
        </p>
      </td>

      {/* 6. Số tiền */}
      <td className="px-3 py-3.5 align-middle text-right whitespace-nowrap min-w-[130px]">
        <p
          className={`text-sm sm:text-base font-black tabular-nums tracking-tight ${
            isInc ? 'text-emerald-700' : 'text-rose-600'
          }`}
        >
          {isInc ? '+' : '−'}
          {money(tx.amount)}
        </p>
      </td>

      {/* 7. Trạng thái */}
      <td className="px-3 py-3.5 align-middle text-center whitespace-nowrap min-w-[110px]">
        <span
          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-body border ${st.tone}`}
        >
          {st.label}
        </span>
      </td>

      {/* 8. Nút Xem chi tiết */}
      <td
        className="py-3.5 pl-2 pr-4 align-middle text-right whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pink-200/80 bg-white px-3 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-50 hover:border-pink-300 transition-colors shadow-2xs cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-pink-600 shrink-0" />
            Xem chi tiết
          </button>
        </div>
      </td>
    </tr>
  );
}

function FinanceTablePager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-pink-100/80 px-5 py-3 bg-white">
      <span className="text-xs font-bold text-slate-500">
        Hiển thị trang <strong className="text-slate-900">{page}</strong> trên <strong className="text-slate-900">{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="flex h-8 items-center gap-1 rounded-xl border border-pink-100 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-pink-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Trang trước
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="flex h-8 items-center gap-1 rounded-xl border border-pink-100 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-pink-50 disabled:pointer-events-none disabled:opacity-40"
        >
          Trang sau <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function TenantAdminFinanceCompact({
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Lumière Nail Studio',
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

  const [dateChip, setDateChip] = useState<DateChipValue>('ALL');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [chartViewMode, setChartViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Bulk selection & pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

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
      setFormError(`Vui lòng nhập số tiền hợp lệ (> ${money(0)}).`);
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

  // Void / Cancel transaction
  const handleVoidTransaction = (tx: FinanceTransaction) => {
    const nowStr = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const updated = transactions.map((t) => {
      if (t.id === tx.id) {
        return {
          ...t,
          status: 'VOID' as TransactionStatus,
          auditTrail: [
            { time: nowStr, action: 'Đánh dấu có vấn đề / Tạm hủy phiếu giao dịch', actor: 'Tenant Admin' },
            ...(t.auditTrail || []),
          ],
        };
      }
      return t;
    });
    saveTransactions(updated);
    onNotify?.(`Đã đánh dấu có vấn đề / tạm hủy phiếu ${tx.id}.`);
    if (detailTransaction?.id === tx.id) {
      setDetailTransaction(updated.find((u) => u.id === tx.id) || null);
    }
  };

  // Reconcile transaction
  const handleReconcileTransaction = (tx: FinanceTransaction) => {
    const nowStr = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const updated = transactions.map((t) => {
      if (t.id === tx.id) {
        return {
          ...t,
          auditTrail: [
            { time: nowStr, action: 'Thực hiện đối soát chứng từ khớp với sổ ngân hàng / sao kê', actor: 'Tenant Admin' },
            ...(t.auditTrail || []),
          ],
        };
      }
      return t;
    });
    saveTransactions(updated);
    onNotify?.(`Đã xác nhận đối soát chứng từ cho phiếu ${tx.id}.`);
    if (detailTransaction?.id === tx.id) {
      setDetailTransaction(updated.find((u) => u.id === tx.id) || null);
    }
  };

  // Approve multiple selected transactions
  const handleApproveSelected = () => {
    if (selectedIds.size === 0) return;
    const nowStr = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    let approvedCount = 0;
    const updated = transactions.map((t) => {
      if (selectedIds.has(t.id) && t.status !== 'POSTED') {
        approvedCount += 1;
        return {
          ...t,
          status: 'POSTED' as TransactionStatus,
          approvedBy: 'Nguyễn Trường Thịnh',
          auditTrail: [
            { time: nowStr, action: 'Duyệt hàng loạt & chốt sổ ghi nhận', actor: 'Tenant Admin' },
            ...(t.auditTrail || []),
          ],
        };
      }
      return t;
    });
    if (approvedCount === 0) return;
    saveTransactions(updated);
    onNotify?.(`Đã duyệt & chốt sổ thành công ${approvedCount} phiếu giao dịch.`);
    setSelectedIds(new Set());
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Date range currently in effect
  const dateRange = useMemo(
    () => getDateRangeForChip(dateChip, customFrom, customTo),
    [dateChip, customFrom, customTo]
  );

  const dateScopedList = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedBranch !== 'ALL' && tx.branch !== selectedBranch) return false;
      if (dateRange.from || dateRange.to) {
        const txDate = parseVNDate(tx.date);
        if (txDate) {
          if (dateRange.from && txDate < dateRange.from) return false;
          if (dateRange.to && txDate > dateRange.to) return false;
        }
      }
      return true;
    });
  }, [transactions, selectedBranch, dateRange]);

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return dateScopedList.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
      if (statusFilter === 'ACTION_REQUIRED') {
        if (tx.status === 'POSTED') return false;
      } else if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        return false;
      }
      if (methodFilter !== 'ALL' && tx.method !== methodFilter) return false;

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
  }, [dateScopedList, typeFilter, categoryFilter, statusFilter, methodFilter, activeSearch]);

  // KPIs reflect the current Branch + Period scope
  const kpiData = useMemo(() => {
    const totalIncome = dateScopedList
      .filter((t) => t.type === 'INCOME' && t.status === 'POSTED')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = dateScopedList
      .filter((t) => t.type === 'EXPENSE' && t.status === 'POSTED')
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = totalIncome - totalExpense;

    const pendingList = dateScopedList.filter((t) => t.status !== 'POSTED');
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((sum, t) => sum + t.amount, 0);

    return { totalIncome, totalExpense, netCashFlow, pendingCount, pendingAmount };
  }, [dateScopedList]);

  // Chart Data: Thu vs Chi over time
  const chartData = useMemo(() => {
    const map: Record<string, { label: string; dateObj: Date; thu: number; chi: number; net: number }> = {};

    dateScopedList.forEach((tx) => {
      if (tx.status !== 'POSTED') return;
      const d = parseVNDate(tx.date);
      if (!d) return;

      let key = '';
      let label = '';
      if (chartViewMode === 'MONTHLY') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!map[key]) {
        map[key] = { label, dateObj: d, thu: 0, chi: 0, net: 0 };
      }

      if (tx.type === 'INCOME') {
        map[key].thu += tx.amount;
      } else {
        map[key].chi += tx.amount;
      }
      map[key].net = map[key].thu - map[key].chi;
    });

    const sorted = Object.values(map).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (sorted.length === 0) {
      return [
        { label: '15/07', thu: 0, chi: 420000, net: -420000 },
        { label: '16/07', thu: 0, chi: 850000, net: -850000 },
        { label: '17/07', thu: 12000000, chi: 0, net: 12000000 },
        { label: '18/07', thu: 8500000, chi: 4200000, net: 4300000 },
        { label: '19/07', thu: 3280000, chi: 41840000, net: -38560000 },
        { label: '20/07', thu: 23490000, chi: 28050000, net: -4560000 },
      ];
    }

    return sorted;
  }, [dateScopedList, chartViewMode]);

  const cashByMethod = useMemo(() => {
    const base: Record<PaymentMethod, number> = { CASH: 0, BANK: 0, CARD: 0, EWALLET: 0 };
    dateScopedList.forEach((t) => {
      if (t.status !== 'POSTED') return;
      base[t.method] += t.type === 'INCOME' ? t.amount : -t.amount;
    });
    return base;
  }, [dateScopedList]);

  const typeCounts = useMemo(
    () => ({
      INCOME: dateScopedList.filter((t) => t.type === 'INCOME').length,
      EXPENSE: dateScopedList.filter((t) => t.type === 'EXPENSE').length,
    }),
    [dateScopedList]
  );

  const statusCounts = useMemo(() => {
    const base: Record<TransactionStatus, number> = { POSTED: 0, PENDING: 0, DRAFT: 0, VOID: 0 };
    dateScopedList.forEach((t) => {
      base[t.status] += 1;
    });
    return base;
  }, [dateScopedList]);

  const netFilteredAmount = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0),
    [filteredTransactions]
  );

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / FINANCE_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pagedTransactions = useMemo(
    () => filteredTransactions.slice((currentPage - 1) * FINANCE_PAGE_SIZE, currentPage * FINANCE_PAGE_SIZE),
    [filteredTransactions, currentPage]
  );
  const pageSelectableIds = useMemo(
    () => pagedTransactions.filter((t) => t.status !== 'POSTED').map((t) => t.id),
    [pagedTransactions]
  );

  useEffect(() => {
    setPage(1);
  }, [typeFilter, categoryFilter, statusFilter, methodFilter, activeSearch, dateChip, customFrom, customTo, selectedBranch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [typeFilter, categoryFilter, statusFilter, methodFilter, activeSearch, dateChip, customFrom, customTo, selectedBranch, page]);

  const toggleSelectAll = () => {
    const allSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(pageSelectableIds));
  };

  const actionRequiredCount = useMemo(
    () => dateScopedList.filter((t) => t.status !== 'POSTED').length,
    [dateScopedList]
  );

  const mainQuickTab = useMemo(() => {
    if (
      statusFilter === 'ACTION_REQUIRED' ||
      statusFilter === 'PENDING' ||
      statusFilter === 'DRAFT' ||
      statusFilter === 'VOID'
    )
      return 'ACTION_REQUIRED';
    if (typeFilter === 'INCOME') return 'INCOME';
    if (typeFilter === 'EXPENSE') return 'EXPENSE';
    return 'ALL';
  }, [typeFilter, statusFilter]);

  const secondaryActiveCount = useMemo(() => {
    let count = 0;
    if (selectedBranch !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    if (methodFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL' && statusFilter !== 'ACTION_REQUIRED') count++;
    return count;
  }, [selectedBranch, categoryFilter, methodFilter, statusFilter]);

  const hasActiveFilters =
    typeFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    methodFilter !== 'ALL' ||
    dateChip !== 'ALL' ||
    selectedBranch !== 'ALL' ||
    activeSearch.trim() !== '';

  const clearFilters = () => {
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setDateChip('ALL');
    handleSearchChange('');
  };

  // Export CSV function
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
      'data:text/csv;charset=utf-8,﻿' +
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
    <div className="space-y-5 p-1 sm:p-2 font-sans text-slate-900">
      {/* HEADER BANNER */}
      <PageHeader
        title="Thu & Chi"
        actions={(
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            title="Xuất Excel/CSV"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-pink-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-pink-50 hover:border-pink-300 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Xuất Excel
          </button>
          <button
            type="button"
            onClick={exportPDF}
            title="In sổ / PDF"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-pink-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-pink-50 hover:border-pink-300 transition-all"
          >
            <Printer className="h-4 w-4 text-slate-600" /> In PDF
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-pink-600 px-4 text-xs font-black text-white shadow-2xs hover:bg-pink-700 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Tạo phiếu thu / chi
          </button>
          </div>
        )}
      />

      {/* CASH FLOW DASHBOARD KPI GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: TỔNG THU */}
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-body font-black uppercase tracking-wider text-emerald-900">Tổng thu</span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="ta-metric-value text-emerald-950">
              {money(kpiData.totalIncome)}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700/90">
              Doanh thu thực nhận
            </p>
          </div>
        </div>

        {/* KPI 2: TỔNG CHI */}
        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/60 to-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-body font-black uppercase tracking-wider text-rose-900">Tổng chi</span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="ta-metric-value text-rose-950">
              {money(kpiData.totalExpense)}
            </p>
            <p className="mt-1 text-xs font-semibold text-rose-700/90">
              Chi phí vận hành & lương
            </p>
          </div>
        </div>

        {/* KPI 3: THU - CHI */}
        <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-white via-pink-50/40 to-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-body font-black uppercase tracking-wider text-slate-800">Thu - Chi</span>
            <div className="rounded-xl bg-pink-100 p-2 text-pink-600">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`ta-metric-value ${kpiData.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {kpiData.netCashFlow >= 0 ? '+' : ''}{money(kpiData.netCashFlow)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {kpiData.netCashFlow >= 0 ? 'Thặng dư dòng tiền' : 'Thâm hụt dòng tiền'}
            </p>
          </div>
        </div>

        {/* KPI 4: GIAO DỊCH CẦN XỬ LÝ */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-body font-black uppercase tracking-wider text-amber-950">Giao dịch cần xử lý</span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="ta-metric-value text-amber-950">
              {money(kpiData.pendingAmount)}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-800">
              {kpiData.pendingCount} phiếu cần xác nhận / chốt
            </p>
          </div>
        </div>
      </section>

      {/* CASH FLOW CHART SECTION: THU VS CHI THEO THỜI GIAN */}
      <section className="rounded-2xl border border-pink-100/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-pink-100/60 pb-3">
          <div>
            <h2 className="ta-card-title flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-pink-600" /> Biểu đồ thu và chi theo thời gian
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              So sánh biến động doanh thu (Thu) và chi phí (Chi) giúp theo dõi nhanh tình hình dòng tiền
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-pink-50/70 p-1 border border-pink-100/80">
              <button
                type="button"
                onClick={() => setChartViewMode('DAILY')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  chartViewMode === 'DAILY'
                    ? 'bg-white text-slate-900 shadow-2xs border border-pink-100/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo ngày
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('MONTHLY')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  chartViewMode === 'MONTHLY'
                    ? 'bg-white text-slate-900 shadow-2xs border border-pink-100/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo tháng
              </button>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#f1f5f9' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(v) => `${(v / 1000000).toLocaleString('vi-VN')} tr`}
              />
              <Tooltip content={<CustomCashFlowTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                formatter={(value) => <span className="text-slate-700 font-extrabold ml-1">{value}</span>}
              />
              <Bar dataKey="thu" name="Tổng Thu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="chi" name="Tổng Chi" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* CASH BREAKDOWN PANEL BY PAYMENT METHOD */}
      <section className="rounded-2xl border border-pink-100/80 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-pink-100/60 pb-3 mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-pink-600" /> Tồn quỹ theo phương thức thanh toán
          </p>
          <span className="text-body font-bold text-slate-500">Chỉ tính giao dịch đã hoàn thành</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CASH_METHOD_ROWS.map((row) => {
            const val = cashByMethod[row.key] ?? 0;
            const RowIcon = row.icon;
            return (
              <div key={row.key} className="rounded-xl border border-pink-100/80 bg-pink-50/20 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white p-1.5 border border-pink-100 shadow-2xs text-pink-600">
                    <RowIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-body font-bold text-slate-600 block">{row.label}</span>
                    <span className={`text-xs font-black tabular-nums ${val < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {val < 0 ? '−' : ''}{money(Math.abs(val))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FILTERS & SEARCH CONTROL BAR */}
      <section className="rounded-2xl border border-pink-100/80 bg-white p-4 shadow-2xs space-y-4">
        {/* ROW 1: PRIMARY MAIN CHIPS (Tất cả | Thu | Chi | Chờ xử lý) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Tất cả */}
          <button
            type="button"
            onClick={() => {
              setTypeFilter('ALL');
              setStatusFilter('ALL');
            }}
            className={`rounded-xl p-3 border text-left transition-all flex items-center justify-between ${
              mainQuickTab === 'ALL'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-slate-900/20'
                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${mainQuickTab === 'ALL' ? 'bg-pink-400' : 'bg-slate-400'}`} />
              <span className="text-xs font-black">Tất cả</span>
            </div>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                mainQuickTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {dateScopedList.length}
            </span>
          </button>

          {/* Card 2: Thu */}
          <button
            type="button"
            onClick={() => {
              setTypeFilter('INCOME');
              if (statusFilter === 'PENDING') setStatusFilter('ALL');
            }}
            className={`rounded-xl p-3 border text-left transition-all flex items-center justify-between ${
              mainQuickTab === 'INCOME'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                : 'bg-emerald-50/50 border-emerald-200/70 text-emerald-900 hover:bg-emerald-100/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowDownLeft className={`h-4 w-4 ${mainQuickTab === 'INCOME' ? 'text-white' : 'text-emerald-600'}`} />
              <span className="text-xs font-black">Thu</span>
            </div>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                mainQuickTab === 'INCOME' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {typeCounts.INCOME}
            </span>
          </button>

          {/* Card 3: Chi */}
          <button
            type="button"
            onClick={() => {
              setTypeFilter('EXPENSE');
              if (statusFilter === 'PENDING') setStatusFilter('ALL');
            }}
            className={`rounded-xl p-3 border text-left transition-all flex items-center justify-between ${
              mainQuickTab === 'EXPENSE'
                ? 'bg-rose-600 border-rose-600 text-white shadow-md ring-2 ring-rose-300'
                : 'bg-rose-50/50 border-rose-200/70 text-rose-900 hover:bg-rose-100/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowUpRight className={`h-4 w-4 ${mainQuickTab === 'EXPENSE' ? 'text-white' : 'text-rose-600'}`} />
              <span className="text-xs font-black">Chi</span>
            </div>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                mainQuickTab === 'EXPENSE' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {typeCounts.EXPENSE}
            </span>
          </button>

          {/* Card 4: Cần xử lý */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ACTION_REQUIRED');
              setTypeFilter('ALL');
            }}
            className={`rounded-xl p-3 border text-left transition-all flex items-center justify-between ${
              mainQuickTab === 'ACTION_REQUIRED'
                ? 'bg-amber-600 border-amber-600 text-white shadow-md ring-2 ring-amber-300'
                : 'bg-amber-50/50 border-amber-200/70 text-amber-900 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-4 w-4 ${mainQuickTab === 'ACTION_REQUIRED' ? 'text-white' : 'text-amber-600'}`} />
              <span className="text-xs font-black">Cần xử lý</span>
            </div>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                mainQuickTab === 'ACTION_REQUIRED' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {actionRequiredCount}
            </span>
          </button>
        </div>

        {/* ROW 2: SEARCH INPUT + KHOẢNG THỜI GIAN + NÚT BỘ LỌC NÂNG CAO */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-t border-pink-100/60 pt-3.5">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search mã phiếu / người liên quan / nội dung..."
              className="h-9 w-full rounded-xl border border-pink-100 bg-slate-50/50 pl-9 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-100 transition-all"
            />
            {activeSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Khoảng thời gian chips */}
            <div className="overflow-x-auto">
              <FinanceSegmented<DateChipValue> value={dateChip} onChange={setDateChip} options={DATE_CHIPS} />
            </div>

            {/* Toggle Bộ lọc nâng cao */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`h-9 px-3 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${
                showAdvancedFilters || secondaryActiveCount > 0
                  ? 'bg-pink-50 border-pink-200 text-pink-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-pink-600" />
              <span>Bộ lọc nâng cao</span>
              {secondaryActiveCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-pink-600 text-white text-caption font-black flex items-center justify-center">
                  {secondaryActiveCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateChip === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-pink-200/80 bg-pink-50/50 p-2.5 text-xs">
            <CalendarDays className="h-4 w-4 text-pink-600 shrink-0" />
            <span className="font-bold text-slate-700">Thời gian tùy chỉnh:</span>
            <input
              type="text"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              placeholder="Từ DD/MM/YYYY"
              className="h-8 w-32 rounded-lg border border-pink-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500"
            />
            <span className="font-bold text-slate-500">đến</span>
            <input
              type="text"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder="Đến DD/MM/YYYY"
              className="h-8 w-32 rounded-lg border border-pink-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500"
            />
          </div>
        )}

        {/* ROW 3: BỘ LỌC NÂNG CAO (EXPANDABLE) */}
        {showAdvancedFilters && (
          <div className="rounded-xl border border-pink-100 bg-pink-50/30 p-3.5 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
              <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-pink-600" /> Bộ lọc chi tiết
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-extrabold text-pink-600 hover:text-pink-800 hover:underline"
                >
                  <XCircle className="h-3.5 w-3.5" /> Xóa tất cả bộ lọc
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Chi nhánh */}
              <div>
                <label className="block text-body font-bold text-slate-600 mb-1">Chi nhánh</label>
                <FinanceSegmented
                  value={selectedBranch}
                  onChange={onSelectedBranchChange}
                  options={[
                    { value: 'ALL', label: 'Tất cả' },
                    { value: 'Q3', label: 'Quận 3' },
                    { value: 'Q1', label: 'Quận 1' },
                  ]}
                />
              </div>

              {/* Danh mục */}
              <div>
                <label className="block text-body font-bold text-slate-600 mb-1">Danh mục</label>
                <BeautifulSelect
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Danh mục"
                  className="h-8 w-full rounded-xl border border-pink-100 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500"
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

              {/* Phương thức thanh toán */}
              <div>
                <label className="block text-body font-bold text-slate-600 mb-1">Phương thức thanh toán</label>
                <BeautifulSelect
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value as 'ALL' | PaymentMethod)}
                  aria-label="Phương thức thanh toán"
                  className="h-8 w-full rounded-xl border border-pink-100 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-pink-500"
                >
                  <option value="ALL">Tất cả phương thức</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Chuyển khoản</option>
                  <option value="CARD">Thẻ POS</option>
                  <option value="EWALLET">Ví điện tử</option>
                </BeautifulSelect>
              </div>

              {/* Trạng thái chi tiết */}
              <div>
                <label className="block text-body font-bold text-slate-600 mb-1">Trạng thái phiếu</label>
                <div className="flex flex-wrap gap-1">
                  {STATUS_CHIPS.map((s) => (
                    <FinanceFilterChip
                      key={s.value}
                      active={statusFilter === s.value}
                      onClick={() => setStatusFilter(s.value)}
                      count={
                        s.value === 'ALL'
                          ? undefined
                          : s.value === 'ACTION_REQUIRED'
                          ? actionRequiredCount
                          : statusCounts[s.value as TransactionStatus]
                      }
                    >
                      {s.label}
                    </FinanceFilterChip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Clear Filter Link if not expanded */}
        {!showAdvancedFilters && hasActiveFilters && (
          <div className="flex items-center justify-between border-t border-pink-100/60 pt-2 text-xs">
            <span className="text-body font-semibold text-slate-500">
              Đang áp dụng bộ lọc tùy chỉnh
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-800 hover:underline"
            >
              <XCircle className="h-3.5 w-3.5" /> Xóa bộ lọc
            </button>
          </div>
        )}
      </section>

      {/* TRANSACTIONS TABLE SECTION */}
      <section className="rounded-2xl border border-pink-100/80 bg-white shadow-2xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="flex flex-col gap-2 border-b border-pink-100/80 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="ta-card-title flex items-center gap-2">
              Danh sách phiếu giao dịch
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-body font-extrabold text-pink-800">
                {filteredTransactions.length} phiếu
              </span>
            </h2>
            <p className="mt-0.5 text-body font-medium text-slate-500">
              Sổ nhật ký giao dịch tài chính ghi nhận tự động và thủ công
            </p>
          </div>

          {/* Selected Batch Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 shadow-sm">
              <span className="text-xs font-bold text-white">{selectedIds.size} phiếu đã chọn</span>
              <button
                type="button"
                onClick={handleApproveSelected}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <Check className="h-3.5 w-3.5" /> Duyệt & chốt sổ ngay
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Bỏ chọn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[765px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-pink-100/80 bg-pink-50/40 text-caption font-black uppercase tracking-wider text-slate-600">
                <th className="w-10 py-3.5 pl-4 pr-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label="Chọn tất cả trong trang"
                    className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
                      pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id))
                        ? 'border-pink-600 bg-pink-600 text-white'
                        : 'border-pink-200 bg-white hover:border-pink-400'
                    }`}
                  >
                    {pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id)) && (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3.5">Mã phiếu & Ngày giờ</th>
                <th className="px-3 py-3.5">Loại</th>
                <th className="px-3 py-3.5">Danh mục</th>
                <th className="px-3 py-3.5">Nội dung</th>
                <th className="px-3 py-3.5 text-right">Số tiền</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="py-3.5 pl-2 pr-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100/60">
              {pagedTransactions.length > 0 ? (
                pagedTransactions.map((tx) => (
                  <FinanceTransactionRow
                    key={tx.id}
                    tx={tx}
                    selected={selectedIds.has(tx.id)}
                    onToggleSelect={() => toggleSelectOne(tx.id)}
                    onView={() => setDetailTransaction(tx)}
                    onEdit={() => openEditModal(tx)}
                    onApprove={() => handleApproveTransaction(tx)}
                    onDelete={() => setDeleteConfirmTx(tx)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs font-semibold text-slate-400 bg-white">
                    <p className="font-bold text-slate-600">Không tìm thấy giao dịch nào phù hợp</p>
                    <p className="text-body text-slate-400 mt-1">Thử điều chỉnh lại bộ lọc tìm kiếm hoặc chọn khoảng thời gian khác.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Row */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-pink-100 bg-pink-50/20 px-5 py-3 text-xs font-bold text-slate-700">
            <span>Tổng dòng tiền ròng ({filteredTransactions.length} phiếu hiển thị):</span>
            <span className={`text-sm font-black tabular-nums ${netFilteredAmount >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netFilteredAmount >= 0 ? '+' : ''}{money(netFilteredAmount)}
            </span>
          </div>
        )}

        {/* Table Pagination */}
        <FinanceTablePager page={currentPage} totalPages={totalPages} onChange={setPage} />
      </section>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      {formOpen && (
        <Modal
          isOpen={true}
          onClose={() => setFormOpen(false)}
          title={editingTransaction ? `Chỉnh sửa phiếu ${formCode}` : 'Tạo phiếu thu / chi mới'}
          subtitle="Phiếu giao dịch sẽ được ghi nhận trực tiếp vào sổ nhật ký tài chính của Salon"
          maxWidth="5xl"
          zIndex="z-[140]"
          closeOnOverlayClick={false}
          className="border border-pink-100 bg-white shadow-2xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
          headerClassName="border-b border-pink-100/80 bg-white/95 backdrop-blur-xs px-6 py-4"
          bodyClassName="p-6 sm:p-8 overflow-y-auto max-h-[calc(85vh-135px)]"
          footerClassName="border-t border-pink-100/80 bg-slate-50/90 px-6 py-4"
          headerIcon={<Plus className="h-5 w-5 text-pink-600" />}
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveTransaction}
                className="rounded-xl bg-pink-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-pink-700 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="h-4 w-4" /> {editingTransaction ? 'Cập nhật giao dịch' : 'Lưu & ghi sổ'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveTransaction} className="space-y-6 text-xs">
            {formError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 font-bold text-rose-800 flex items-center gap-2.5 text-xs shadow-2xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /> {formError}
              </div>
            )}

            {/* TOP BAR: Type Selector + Mã phiếu + Danh mục */}
            <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                {/* 1. Toggle Thu / Chi */}
                <div className="md:col-span-1">
                  <label className="mb-1 block font-bold text-slate-700 text-body uppercase tracking-wider">
                    Loại chứng từ <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-white p-1 border border-pink-100 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('INCOME')}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-black text-xs transition-all cursor-pointer ${
                        formType === 'INCOME'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5" /> Phiếu thu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('EXPENSE')}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-black text-xs transition-all cursor-pointer ${
                        formType === 'EXPENSE'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" /> Phiếu chi
                    </button>
                  </div>
                </div>

                {/* 2. Mã phiếu */}
                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-body uppercase tracking-wider">
                    Mã phiếu <span className="text-slate-400 font-normal lowercase">(tự động)</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    readOnly={Boolean(editingTransaction)}
                    className="w-full rounded-xl border border-pink-100 bg-white p-2.5 font-mono font-bold text-slate-900 outline-none shadow-2xs"
                  />
                </div>

                {/* 3. Danh mục */}
                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-body uppercase tracking-wider">
                    Danh mục {formType === 'INCOME' ? 'thu' : 'chi'} <span className="text-rose-500">*</span>
                  </label>
                  <BeautifulSelect
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    aria-label="Danh mục"
                    className="w-full rounded-xl border border-pink-100 bg-white p-2.5 font-bold text-slate-900 outline-none focus:border-pink-500 shadow-2xs"
                  >
                    {(formType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </BeautifulSelect>
                </div>
              </div>
            </div>

            {/* FORM BODY: 2 BALANCED COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT TRÁI */}
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs">
                <p className="text-body font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                  Thông tin hành chính & địa điểm
                </p>

                {/* Ngày giao dịch */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    Ngày giao dịch <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pl-9 font-semibold text-slate-900 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all"
                    />
                    <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Chi nhánh */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    Chi nhánh <span className="text-rose-500">*</span>
                  </label>
                  <BeautifulSelect
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value as 'Q3' | 'Q1')}
                    aria-label="Chi nhánh"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 outline-none focus:border-pink-500"
                  >
                    <option value="Q3">Chi nhánh Quận 3 (Trụ sở chính)</option>
                    <option value="Q1">Chi nhánh Quận 1 (Chợ Bến Thành)</option>
                  </BeautifulSelect>
                </div>

                {/* Người nộp / nhận */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    {formType === 'INCOME' ? 'Người nộp tiền' : 'Người nhận tiền'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCounterparty}
                    onChange={(e) => setFormCounterparty(e.target.value)}
                    placeholder={
                      formType === 'INCOME'
                        ? 'Nhập tên khách hàng / đơn vị nộp...'
                        : 'Nhập tên nhà cung cấp / đối tác nhận...'
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all"
                  />
                </div>

                {/* Khách hàng liên quan */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    Khách hàng liên quan <span className="text-slate-400 font-normal lowercase">(tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    placeholder="Nhập tên hoặc SĐT khách hàng..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-medium text-slate-900 outline-none focus:border-pink-500 transition-all"
                  />
                </div>
              </div>

              {/* CỘT PHẢI */}
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs">
                <p className="text-body font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                  Thông tin tài chính & nhân sự
                </p>

                {/* Thời gian */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    Thời gian hạch toán <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      placeholder="HH:mm"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pl-9 font-semibold text-slate-900 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all"
                    />
                    <Clock3 className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Phương thức thanh toán */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    Phương thức thanh toán <span className="text-rose-500">*</span>
                  </label>
                  <BeautifulSelect
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    aria-label="Phương thức"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 outline-none focus:border-pink-500"
                  >
                    <option value="BANK">Chuyển khoản ngân hàng</option>
                    <option value="CASH">Tiền mặt tại quầy</option>
                    <option value="CARD">Quẹt thẻ POS</option>
                    <option value="EWALLET">Ví điện tử / Online</option>
                  </BeautifulSelect>
                </div>

                {/* SỐ TIỀN - FIELD NỔI BẬT NHẤT TRONG FORM */}
                <div>
                  <label className="mb-1.5 block font-black text-pink-700 text-xs uppercase tracking-wide">
                    Số tiền giao dịch (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <div className="rounded-2xl border-2 border-pink-300/90 bg-gradient-to-r from-pink-50/80 via-white to-pink-50/30 p-3 shadow-2xs focus-within:border-pink-600 focus-within:ring-4 focus-within:ring-pink-100 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-2xl font-black ${
                          formType === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formType === 'INCOME' ? '+' : '−'}
                      </span>
                      <input
                        type="text"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="0"
                        className="w-full text-right text-2xl font-black text-slate-900 bg-transparent outline-none tracking-tight tabular-nums"
                      />
                      <span className="text-xs font-black text-slate-400 shrink-0">VNĐ</span>
                    </div>
                  </div>
                </div>

                {/* Nhân viên liên quan */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">
                    Nhân viên phụ trách <span className="text-slate-400 font-normal lowercase">(tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={formStaff}
                    onChange={(e) => setFormStaff(e.target.value)}
                    placeholder="Nhập tên nhân viên..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-medium text-slate-900 outline-none focus:border-pink-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* PAYROLL INTEGRATION SPECIAL SECTION */}
            {formCategory === 'Lương, phụ cấp & hoa hồng' && (
              <div className="rounded-2xl border border-pink-200 bg-pink-50/70 p-4 space-y-3">
                <p className="font-extrabold text-pink-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                  <Info className="h-4 w-4 text-pink-600" /> Đồng bộ nhân sự & bảng lương
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-800">Chọn nhân viên hưởng lương</label>
                    <BeautifulSelect
                      value={formStaff}
                      onChange={(e) => handleStaffSelect(e.target.value)}
                      aria-label="Nhân viên"
                      className="w-full rounded-xl border border-pink-200 bg-white p-2.5 font-bold text-slate-800 outline-none"
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
                    <label className="mb-1 block font-bold text-slate-800">Chi nhánh hạch toán lương</label>
                    <input
                      type="text"
                      value={formBranch === 'Q3' ? 'Chi nhánh Quận 3' : 'Chi nhánh Quận 1'}
                      readOnly
                      className="w-full rounded-xl border border-pink-200 bg-slate-100 p-2.5 font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* FULL WIDTH: NỘI DUNG / DIỄN GIẢI */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-2 shadow-2xs">
              <label className="block font-bold text-slate-800">
                Nội dung / diễn giải giao dịch <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mô tả chi tiết lý do thu/chi, thông tin hóa đơn hoặc thỏa thuận đi kèm..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 font-medium text-slate-900 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all"
              />
            </div>

            {/* FULL WIDTH / SEPARATE AREA: CHỨNG TỪ & TRẠNG THÁI */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Chứng từ đính kèm */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">Chứng từ đính kèm</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formDocument}
                      onChange={(e) => setFormDocument(e.target.value)}
                      placeholder="Tên file_vat.pdf..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 outline-none focus:border-pink-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormDocument(`bien_nhan_${Date.now().toString().slice(-4)}.pdf`)}
                      className="shrink-0 rounded-xl border border-pink-200 bg-pink-50 px-3.5 py-2.5 font-bold text-pink-700 hover:bg-pink-100 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Paperclip className="h-4 w-4" /> Đính kèm
                    </button>
                  </div>
                </div>

                {/* Trạng thái ghi sổ */}
                <div>
                  <label className="mb-1.5 block font-bold text-slate-800">Trạng thái ghi sổ</label>
                  <BeautifulSelect
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TransactionStatus)}
                    aria-label="Trạng thái"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 outline-none focus:border-pink-500"
                  >
                    <option value="POSTED">Hoàn thành (Ghi sổ chính thức ngay)</option>
                    <option value="PENDING">Cần xử lý (Đang chờ kiểm tra/phê duyệt)</option>
                    <option value="DRAFT">Phiếu nháp (Cần xác nhận lại)</option>
                  </BeautifulSelect>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* TRANSACTION DETAIL MODAL */}
      {detailTransaction && (
        <Modal
          isOpen={true}
          onClose={() => setDetailTransaction(null)}
          title="Chi tiết phiếu giao dịch"
          subtitle={`Chứng từ kế toán chính thức #${detailTransaction.id}`}
          maxWidth="5xl"
          zIndex="z-[140]"
          closeOnOverlayClick={false}
          className="border border-pink-100 bg-white shadow-2xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
          headerClassName="border-b border-pink-100/80 bg-white/95 backdrop-blur-xs px-6 py-4"
          bodyClassName="p-6 sm:p-8 overflow-y-auto max-h-[calc(85vh-135px)]"
          footerClassName="border-t border-pink-100/80 bg-slate-50/90 px-6 py-4"
          headerIcon={<Receipt className="h-5 w-5 text-pink-600" />}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              {/* Left Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {detailTransaction.status !== 'POSTED' ? (
                  <button
                    type="button"
                    onClick={() => handleApproveTransaction(detailTransaction)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Xác nhận & Chốt sổ
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Đã chốt sổ
                  </span>
                )}

                {detailTransaction.status !== 'POSTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tx = detailTransaction;
                      setDetailTransaction(null);
                      openEditModal(tx);
                    }}
                    className="rounded-xl border border-pink-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-pink-50 hover:border-pink-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5 text-pink-600" /> Chỉnh sửa
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleReconcileTransaction(detailTransaction)}
                  className="rounded-xl border border-pink-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-pink-50 hover:border-pink-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Scale className="h-3.5 w-3.5 text-purple-600" /> Đối soát
                </button>

                {detailTransaction.status !== 'VOID' && detailTransaction.status !== 'POSTED' && (
                  <button
                    type="button"
                    onClick={() => handleVoidTransaction(detailTransaction)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5 text-rose-600" /> Hủy giao dịch
                  </button>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" /> In chứng từ
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTransaction(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6 text-xs">
            {/* HERO SECTION: HERO SUMMARY WITH SỐ TIỀN THẬT LỚN */}
            <div
              className={`rounded-3xl p-6 sm:p-7 border shadow-sm ${
                detailTransaction.type === 'INCOME'
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 border-emerald-200/90'
                  : 'bg-gradient-to-br from-rose-50/90 via-white to-rose-50/30 border-rose-200/90'
              }`}
            >
              {/* Header Badges Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${
                      detailTransaction.type === 'INCOME'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-rose-600 text-white shadow-2xs'
                    }`}
                  >
                    {detailTransaction.type === 'INCOME' ? (
                      <>
                        <ArrowDownLeft className="h-4 w-4" /> PHIẾU THU
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4" /> PHIẾU CHI
                      </>
                    )}
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    #{detailTransaction.id}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black border ${
                    statusMeta[detailTransaction.status].tone
                  }`}
                >
                  {statusMeta[detailTransaction.status].label}
                </span>
              </div>

              {/* Số tiền thật lớn & Ngày giờ */}
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-body font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Ngày hạch toán chứng từ
                  </span>
                  <p className="font-extrabold text-slate-900 flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-pink-600 shrink-0" />
                    {detailTransaction.date}{' '}
                    <span className="text-slate-500 font-semibold">lúc {detailTransaction.time}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-body font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Số tiền giao dịch chính thức
                  </span>
                  <p
                    className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${
                      detailTransaction.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {detailTransaction.type === 'INCOME' ? '+' : '−'}
                    {money(detailTransaction.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* 2 BALANCED COLUMNS FOR INFORMATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT 1: THÔNG TIN GIAO DỊCH */}
              <div className="rounded-2xl border border-pink-100 bg-white p-5 space-y-4 shadow-2xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-pink-100 pb-2.5">
                  <FileText className="h-4 w-4 text-pink-600 shrink-0" /> Thông tin giao dịch
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Danh mục kế toán</span>
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                      {detailTransaction.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Chi nhánh hạch toán</span>
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                      {detailTransaction.branch === 'Q3' ? 'Chi nhánh Quận 3' : 'Chi nhánh Quận 1'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">
                      {detailTransaction.type === 'INCOME' ? 'Người nộp tiền' : 'Người nhận tiền'}
                    </span>
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                      {detailTransaction.counterparty}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Phương thức thanh toán</span>
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                      {methodLabels[detailTransaction.method]}
                    </span>
                  </div>
                </div>
              </div>

              {/* CỘT 2: THÔNG TIN LIÊN QUAN */}
              <div className="rounded-2xl border border-pink-100 bg-white p-5 space-y-4 shadow-2xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-pink-100 pb-2.5">
                  <Info className="h-4 w-4 text-pink-600 shrink-0" /> Thông tin liên quan
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Khách hàng</span>
                    <span className="font-black text-slate-900">
                      {detailTransaction.relatedCustomer || '— Không đính kèm'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Nhân viên phụ trách</span>
                    <span className="font-black text-slate-900">
                      {detailTransaction.relatedStaff || '— Không đính kèm'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Booking / Lịch hẹn</span>
                    <span className="font-mono font-black text-slate-900">
                      {detailTransaction.relatedCustomer
                        ? `#BK-2026-${detailTransaction.id.replace(/[^0-9]/g, '')}`
                        : '— Không gắn booking'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-pink-50/30 p-3 border border-pink-100/60">
                    <span className="text-slate-500 font-medium">Chứng từ đính kèm</span>
                    {detailTransaction.documentName ? (
                      <span className="font-bold text-pink-700 flex items-center gap-1 hover:underline cursor-pointer">
                        <Paperclip className="h-3.5 w-3.5 text-pink-600" />
                        {detailTransaction.documentName}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">— Chưa đính kèm</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FULL WIDTH: NỘI DUNG DIỄN GIẢI GIAO DỊCH */}
            <div className="rounded-2xl border border-pink-100 bg-white p-5 space-y-2 shadow-2xs">
              <span className="text-body font-black uppercase tracking-wider text-slate-400 block">
                Diễn giải nội dung chi tiết
              </span>
              <p className="font-bold text-slate-900 text-sm leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                {detailTransaction.description}
              </p>
            </div>

            {/* FULL WIDTH: LỊCH SỬ THAO TÁC & THÔNG TIN HỆ THỐNG */}
            <div className="rounded-2xl border border-pink-100 bg-white p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-pink-100 pb-2.5">
                <ShieldCheck className="h-4 w-4 text-pink-600 shrink-0" /> Lịch sử thao tác & Nhật ký hệ thống
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Người khởi tạo */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
                  <span className="text-caption font-bold uppercase text-slate-400 block">Người khởi tạo</span>
                  <p className="font-bold text-slate-900 mt-0.5">{detailTransaction.createdBy}</p>
                </div>

                {/* Thời gian tạo */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
                  <span className="text-caption font-bold uppercase text-slate-400 block">Thời gian tạo phiếu</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {detailTransaction.date} lúc {detailTransaction.time}
                  </p>
                </div>

                {/* Người duyệt / đối soát */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
                  <span className="text-caption font-bold uppercase text-slate-400 block">Người duyệt / chốt sổ</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {detailTransaction.approvedBy || '— Chờ phê duyệt'}
                  </p>
                </div>
              </div>

              {/* System Note */}
              {detailTransaction.note && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs">
                  <span className="text-caption font-bold uppercase text-amber-900 block mb-0.5">
                    Ghi chú hệ thống
                  </span>
                  <p className="font-semibold text-amber-950 italic">{detailTransaction.note}</p>
                </div>
              )}

              {/* Audit Trail List */}
              <div className="space-y-2 pt-1">
                <span className="text-body font-black uppercase tracking-wider text-slate-500 block">
                  Nhật ký thao tác chi tiết (Audit Trail)
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {detailTransaction.auditTrail && detailTransaction.auditTrail.length > 0 ? (
                    detailTransaction.auditTrail.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/70 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{item.action}</p>
                          <span className="text-caption text-slate-400">{item.time}</span>
                        </div>
                        <span className="font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-body">
                          {item.actor}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chưa có nhật ký thay đổi.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmTx && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmTx(null)}
          title="Xác nhận xóa phiếu giao dịch"
          subtitle="Thao tác này chỉ áp dụng với phiếu nháp hoặc phiếu đang chờ xử lý"
          maxWidth="md"
          zIndex="z-[150]"
          closeOnOverlayClick={false}
          className="border border-rose-200 bg-white shadow-2xl"
          headerClassName="border-b border-rose-100 bg-rose-50/50"
          footerClassName="border-t border-rose-100 bg-rose-50/20"
          headerIcon={<Trash2 className="h-5 w-5 text-rose-600" />}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTransaction(deleteConfirmTx)}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white shadow-2xs hover:bg-rose-700 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-800">
            <p className="font-semibold leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu{' '}
              <strong className="font-mono font-black text-rose-600">#{deleteConfirmTx.id}</strong> (
              {deleteConfirmTx.category} - {money(deleteConfirmTx.amount)}) không?
            </p>
            <div className="rounded-xl bg-rose-50 p-3 border border-rose-200 text-rose-900 text-body font-medium">
              Lưu ý: Thao tác này sẽ gỡ phiếu khỏi sổ thu chi và không thể hoàn tác.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
