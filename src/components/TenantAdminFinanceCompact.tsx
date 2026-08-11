import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Landmark,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  WalletCards,
  X,
  XCircle,
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

// Small status dot color used for the compact table row indicator (presentation only, mirrors statusMeta).
const statusDot: Record<TransactionStatus, string> = {
  POSTED: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  DRAFT: 'bg-slate-400',
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

const STATUS_CHIPS: { value: 'ALL' | TransactionStatus; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'POSTED', label: 'Hoàn thành' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'VOID', label: 'Đã hủy' },
];

const CASH_METHOD_ROWS: { key: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { key: 'CASH', label: 'Tiền mặt', icon: Banknote },
  { key: 'BANK', label: 'Chuyển khoản', icon: Landmark },
  { key: 'CARD', label: 'Thẻ POS', icon: CreditCard },
  { key: 'EWALLET', label: 'Ví điện tử', icon: Wallet },
];

// Parses a DD/MM/YYYY string into a Date for range comparisons only; the stored field stays a plain string.
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

// Stat tile using this app's dominant typography convention: tiny bold uppercase label, big font-black number.
function FinanceKpiTile({
  icon: Icon,
  label,
  value,
  valueClassName = 'text-slate-900',
  iconClassName = 'text-slate-300',
  footer,
  footerClassName = 'text-slate-400',
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  iconClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon && <Icon className={`h-4 w-4 ${iconClassName}`} strokeWidth={2} />}
      </div>
      <p className={`mt-2.5 text-2xl font-black leading-tight tracking-tight tabular-nums ${valueClassName}`}>
        {value}
      </p>
      {footer && <p className={`mt-2 text-[10px] font-bold ${footerClassName}`}>{footer}</p>}
    </article>
  );
}

function FinanceCashByMethodTile({ cashByMethod }: { cashByMethod: Record<PaymentMethod, number> }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tồn quỹ theo phương thức</p>
      <div className="mt-3 space-y-2">
        {CASH_METHOD_ROWS.map((row) => {
          const val = cashByMethod[row.key] ?? 0;
          return (
            <div key={row.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <row.icon className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
                {row.label}
              </span>
              <span className={`text-[11px] font-black tabular-nums ${val < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {val < 0 ? '−' : ''}
                {money(Math.abs(val))}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

// Segmented control (compact track) for mutually-exclusive filter groups.
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
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-black transition ${
            value === opt.value
              ? opt.activeClassName || 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Quiet ghost chip used for filter groups with more options than a segmented track comfortably fits (e.g. Status).
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
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-black transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
      {typeof count === 'number' && (
        <span className={active ? 'text-white/70' : 'text-slate-400'}>{count}</span>
      )}
    </button>
  );
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

  return (
    <tr className={`group transition-colors ${selected ? 'bg-violet-50/60' : 'hover:bg-slate-50'}`}>
      {/* Select */}
      <td className="py-3 pl-5 pr-2">
        <button
          type="button"
          onClick={onToggleSelect}
          disabled={!selectable}
          aria-label={selected ? 'Bỏ chọn dòng' : 'Chọn dòng'}
          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
            !selectable
              ? 'cursor-not-allowed border-slate-100 bg-slate-50'
              : selected
              ? 'border-slate-900 bg-slate-900'
              : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </button>
      </td>

      {/* Code & Date */}
      <td className="px-3 py-3">
        <p className="text-xs font-black text-slate-900">{tx.id}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
          {tx.date} · {tx.time}
        </p>
      </td>

      {/* Type & Category */}
      <td className="px-3 py-3">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${isInc ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {isInc ? 'Thu' : 'Chi'}
        </span>
        <p className="mt-1 text-xs font-bold text-slate-800">{tx.category}</p>
      </td>

      {/* Branch */}
      <td className="px-3 py-3 text-xs font-bold text-slate-600">{tx.branch === 'Q3' ? 'Quận 3' : 'Quận 1'}</td>

      {/* Counterparty */}
      <td className="px-3 py-3">
        <p className="text-xs font-bold text-slate-800">{tx.counterparty}</p>
        <p className="mt-0.5 max-w-[190px] truncate text-[10px] text-slate-400">{tx.description}</p>
      </td>

      {/* Related Staff / Customer */}
      <td className="px-3 py-3 text-[10px]">
        {tx.relatedStaff && <span className="block font-bold text-violet-600">{tx.relatedStaff}</span>}
        {tx.relatedCustomer && <span className="block font-semibold text-slate-500">{tx.relatedCustomer}</span>}
        {!tx.relatedStaff && !tx.relatedCustomer && <span className="text-slate-300">—</span>}
      </td>

      {/* Payment Method */}
      <td className="px-3 py-3 text-xs font-bold text-slate-600">{methodLabels[tx.method]}</td>

      {/* Amount */}
      <td className={`px-3 py-3 text-right text-xs font-black tabular-nums ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isInc ? '+' : '−'}
        {money(tx.amount)}
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <span className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[tx.status]}`} />
          {st.label}
        </span>
      </td>

      {/* Created By */}
      <td className="px-3 py-3 text-[10px] font-semibold text-slate-400">{tx.createdBy}</td>

      {/* Actions */}
      <td className="py-3 pl-2 pr-5">
        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onView}
            title="Xem chi tiết phiếu"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {tx.status !== 'POSTED' && (
            <>
              <button
                type="button"
                onClick={onEdit}
                title="Chỉnh sửa phiếu"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onApprove}
                title="Chốt sổ / Duyệt ngay"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
              >
                <Check className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onDelete}
                title="Xóa phiếu"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
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
    <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-5 py-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-[10px] font-black text-slate-500">
        Trang {page}/{totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// Tiny inline "label: control" wrapper used to keep the filter bar on one compact row instead of stacked label/control blocks.
function FinanceFilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </div>
  );
}

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

  const [dateChip, setDateChip] = useState<DateChipValue>('ALL');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');

  // Bulk selection & pagination (UI-only, resets on filter change)
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

  // Approve multiple selected transactions in one batch (same rule as handleApproveTransaction)
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

  // Date range currently in effect (branch + period scope shared by KPIs and the table)
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

  // Filtered transactions for the table: date/branch scope + the rest of the drill-down filters
  const filteredTransactions = useMemo(() => {
    return dateScopedList.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
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

  // KPIs reflect the current Branch + Period scope (matches the period being viewed, not the row-level drill-down filters)
  const kpiData = useMemo(() => {
    const totalIncome = dateScopedList
      .filter((t) => t.type === 'INCOME' && t.status === 'POSTED')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = dateScopedList
      .filter((t) => t.type === 'EXPENSE' && t.status === 'POSTED')
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = totalIncome - totalExpense;

    const pendingList = dateScopedList.filter((t) => t.status === 'PENDING' || t.status === 'DRAFT');
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((sum, t) => sum + t.amount, 0);

    return { totalIncome, totalExpense, netCashFlow, pendingCount, pendingAmount };
  }, [dateScopedList]);

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

  // Reset to page 1 whenever the active scope/filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, categoryFilter, statusFilter, methodFilter, activeSearch, dateChip, customFrom, customTo, selectedBranch]);

  // Clear row selection whenever the visible scope or the page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [typeFilter, categoryFilter, statusFilter, methodFilter, activeSearch, dateChip, customFrom, customTo, selectedBranch, page]);

  const toggleSelectAll = () => {
    const allSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(pageSelectableIds));
  };

  const hasActiveFilters =
    typeFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    methodFilter !== 'ALL' ||
    dateChip !== 'ALL' ||
    activeSearch.trim() !== '';

  const clearFilters = () => {
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setDateChip('ALL');
    handleSearchChange('');
  };

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
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Sổ Nhật Ký Thu & Chi</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Theo dõi dòng tiền, tìm kiếm & tạo giao dịch nhanh cho {roleLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            title="Xuất Excel/CSV"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={exportPDF}
            title="In sổ / PDF"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tạo giao dịch mới
          </button>
        </div>
      </header>

      {/* KPI ROW */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <FinanceKpiTile
          icon={ArrowDownLeft}
          label="Tổng Thu"
          value={money(kpiData.totalIncome)}
          valueClassName="text-slate-900"
          iconClassName="text-emerald-400"
          footer="Doanh thu thực nhận, kỳ đang xem"
        />
        <FinanceKpiTile
          icon={ArrowUpRight}
          label="Tổng Chi"
          value={money(kpiData.totalExpense)}
          valueClassName="text-slate-900"
          iconClassName="text-rose-400"
          footer="Chi phí vận hành, kỳ đang xem"
        />
        <FinanceKpiTile
          icon={CircleDollarSign}
          label="Dòng Tiền Thuần"
          value={money(kpiData.netCashFlow)}
          valueClassName={kpiData.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          iconClassName="text-violet-400"
          footer="Thu trừ chi trong kỳ đang xem"
        />
        <FinanceKpiTile
          icon={Clock3}
          label="Đang Chờ Xử Lý"
          value={
            <>
              {kpiData.pendingCount}
              <span className="ml-1 text-xs font-bold text-slate-400">phiếu</span>
            </>
          }
          iconClassName="text-amber-400"
          footer={`Giá trị chờ duyệt: ${shortMoney(kpiData.pendingAmount)}`}
          footerClassName="text-amber-600"
        />
        <FinanceCashByMethodTile cashByMethod={cashByMethod} />
      </section>

      {/* TOOLBAR: search, date range, and drill-down filters in one panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm mã phiếu, khách hàng, nội dung..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-bold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
            />
            {activeSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <FinanceSegmented<DateChipValue> value={dateChip} onChange={setDateChip} options={DATE_CHIPS} />
          </div>
        </div>

        {dateChip === 'CUSTOM' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              placeholder="Từ DD/MM/YYYY"
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 outline-none focus:border-violet-500"
            />
            <span className="text-[10px] font-bold text-slate-400">đến</span>
            <input
              type="text"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder="Đến DD/MM/YYYY"
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 outline-none focus:border-violet-500"
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-slate-100 pt-4">
          <FinanceFilterGroup label="Chi nhánh">
            <FinanceSegmented
              value={selectedBranch}
              onChange={onSelectedBranchChange}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'Q3', label: 'Quận 3' },
                { value: 'Q1', label: 'Quận 1' },
              ]}
            />
          </FinanceFilterGroup>

          <FinanceFilterGroup label="Loại">
            <FinanceSegmented<'ALL' | 'INCOME' | 'EXPENSE'>
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                setCategoryFilter('ALL');
              }}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                {
                  value: 'INCOME',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      Thu <span className="text-slate-400">{typeCounts.INCOME}</span>
                    </span>
                  ),
                  activeClassName: 'bg-white text-emerald-700 shadow-sm',
                },
                {
                  value: 'EXPENSE',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      Chi <span className="text-slate-400">{typeCounts.EXPENSE}</span>
                    </span>
                  ),
                  activeClassName: 'bg-white text-rose-700 shadow-sm',
                },
              ]}
            />
          </FinanceFilterGroup>

          <FinanceFilterGroup label="Trạng thái">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_CHIPS.map((s) => (
                <FinanceFilterChip
                  key={s.value}
                  active={statusFilter === s.value}
                  onClick={() => setStatusFilter(s.value)}
                  count={s.value === 'ALL' ? undefined : statusCounts[s.value as TransactionStatus]}
                >
                  {s.label}
                </FinanceFilterChip>
              ))}
            </div>
          </FinanceFilterGroup>

          <FinanceFilterGroup label="Danh mục">
            <BeautifulSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Danh mục"
              className="h-8 w-40 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 outline-none"
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
          </FinanceFilterGroup>

          <FinanceFilterGroup label="Phương thức">
            <BeautifulSelect
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as 'ALL' | PaymentMethod)}
              aria-label="Phương thức thanh toán"
              className="h-8 w-36 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả</option>
              <option value="CASH">Tiền mặt</option>
              <option value="BANK">Chuyển khoản</option>
              <option value="CARD">Thẻ POS</option>
              <option value="EWALLET">Ví điện tử</option>
            </BeautifulSelect>
          </FinanceFilterGroup>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-[10px] font-black text-violet-600 hover:text-violet-800"
            >
              <XCircle className="h-3.5 w-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      {/* TRANSACTIONS TABLE */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Danh sách phiếu giao dịch</h2>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
              {pagedTransactions.length} / {filteredTransactions.length} giao dịch phù hợp
              {selectedBranch !== 'ALL' && ` · Chi nhánh ${selectedBranch}`}
            </p>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5">
              <span className="text-[10px] font-black text-white">{selectedIds.size} phiếu đã chọn</span>
              <button
                type="button"
                onClick={handleApproveSelected}
                className="flex h-7 items-center gap-1.5 rounded-md bg-white px-2.5 text-[10px] font-black text-slate-900 transition hover:bg-slate-100"
              >
                <Check className="h-3.5 w-3.5" /> Duyệt & chốt sổ
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                aria-label="Bỏ chọn tất cả"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="w-10 py-3 pl-5 pr-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label="Chọn tất cả trong trang"
                    className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                      pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id))
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id)) && (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Mã phiếu & ngày</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Loại & danh mục</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Chi nhánh</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Người nhận / nộp</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Liên quan</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Thanh toán</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Số tiền</th>
                <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">Trạng thái</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Người tạo</th>
                <th className="py-3 pl-2 pr-5 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  <td colSpan={11} className="py-14 text-center text-xs font-bold text-slate-400">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-[10px] font-bold text-slate-500">Tổng ròng ({filteredTransactions.length} giao dịch)</p>
            <p className={`text-xs font-black tabular-nums ${netFilteredAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {money(netFilteredAmount)}
            </p>
          </div>
        )}

        <FinanceTablePager page={currentPage} totalPages={totalPages} onChange={setPage} />
      </section>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTransaction ? `Chỉnh sửa giao dịch ${formCode}` : 'Tạo giao dịch mới'}
        subtitle="Phiếu giao dịch sẽ được ghi nhận trực tiếp vào sổ nhật ký tài chính của salon"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {formError}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleTypeChange('INCOME')}
              className={`flex h-9 items-center justify-center gap-2 rounded-md text-xs font-black transition ${
                formType === 'INCOME' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Phiếu thu (+ khoản thu)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('EXPENSE')}
              className={`flex h-9 items-center justify-center gap-2 rounded-md text-xs font-black transition ${
                formType === 'EXPENSE' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Phiếu chi (− khoản chi)
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Code (Auto-generated) */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Mã phiếu <span className="text-slate-400">(tự động)</span>
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                readOnly={Boolean(editingTransaction)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-800 outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Danh mục {formType === 'INCOME' ? 'thu' : 'chi'} <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Danh mục"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none"
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
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Ngày giao dịch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Giờ giao dịch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                placeholder="HH:mm"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Chi nhánh phát sinh <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value as 'Q3' | 'Q1')}
                aria-label="Chi nhánh"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="Q3">Chi nhánh Quận 3</option>
                <option value="Q1">Chi nhánh Quận 1</option>
              </BeautifulSelect>
            </div>

            {/* Payment Method */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Phương thức thanh toán <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                aria-label="Phương thức thanh toán"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="BANK">Chuyển khoản ngân hàng</option>
                <option value="CASH">Tiền mặt tại quầy</option>
                <option value="CARD">Quẹt thẻ POS</option>
                <option value="EWALLET">Ví điện tử / online</option>
              </BeautifulSelect>
            </div>

            {/* Counterparty */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
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
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Số tiền (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>
          </div>

          {/* Business Logic: Staff integration for Payroll category */}
          {formCategory === 'Lương, phụ cấp & hoa hồng' && (
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-800">
                Nghiệp vụ chi lương & hoa hồng nhân viên
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-violet-600">
                Danh sách nhân viên được đồng bộ trực tiếp từ Module Nhân Sự
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                    Chọn nhân viên hưởng lương
                  </label>
                  <BeautifulSelect
                    value={formStaff}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                    aria-label="Nhân viên"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none"
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
                  <label className="mb-1.5 block text-[10px] font-bold text-slate-700">Chi nhánh nhân viên</label>
                  <input
                    type="text"
                    value={formBranch === 'Q3' ? 'Chi nhánh Quận 3' : 'Chi nhánh Quận 1'}
                    readOnly
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Related Customer & Staff (for non-payroll) */}
          {formCategory !== 'Lương, phụ cấp & hoa hồng' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                  Khách hàng liên quan <span className="text-slate-400">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  placeholder="Chọn hoặc nhập tên khách hàng..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                  Nhân viên liên quan <span className="text-slate-400">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={formStaff}
                  onChange={(e) => setFormStaff(e.target.value)}
                  placeholder="Nhập tên nhân viên liên quan..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
              Nội dung / mô tả lý do giao dịch <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Nhập chi tiết diễn giải phiếu giao dịch..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
            />
          </div>

          {/* Document Attachment & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Đính kèm chứng từ / hóa đơn VAT <span className="text-slate-400">(tùy chọn)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formDocument}
                  onChange={(e) => setFormDocument(e.target.value)}
                  placeholder="Tên chứng từ (VD: hoa_don_vat.pdf)..."
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                />
                <button
                  type="button"
                  onClick={() => setFormDocument(`bien_nhan_${Date.now().toString().slice(-4)}.pdf`)}
                  className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Thêm file
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Trạng thái ghi sổ <span className="text-rose-500">*</span>
              </label>
              <BeautifulSelect
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as TransactionStatus)}
                aria-label="Trạng thái"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="POSTED">Hoàn thành (ghi sổ ngay)</option>
                <option value="PENDING">Đang chờ phê duyệt</option>
                <option value="DRAFT">Lưu phiếu nháp</option>
              </BeautifulSelect>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-violet-600 px-5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700"
            >
              {editingTransaction ? 'Cập nhật giao dịch' : 'Lưu & ghi sổ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* TRANSACTION DETAIL MODAL */}
      {detailTransaction && (
        <Modal
          isOpen={Boolean(detailTransaction)}
          onClose={() => setDetailTransaction(null)}
          title={`Chi tiết phiếu giao dịch ${detailTransaction.id}`}
          subtitle="Chứng từ kế toán chính thức thuộc sổ nhật ký tài chính"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Stamp & Banner */}
            <div
              className={`relative overflow-hidden rounded-lg p-5 text-white ${
                detailTransaction.type === 'INCOME' ? 'bg-emerald-700' : 'bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-white/70">
                    {detailTransaction.type === 'INCOME' ? 'Phiếu thu thuần' : 'Phiếu chi thực tế'}
                  </span>
                  <p className="mt-2 text-[10px] font-semibold text-white/70">
                    Mã chứng từ: <span className="font-black text-white">{detailTransaction.id}</span>
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight">
                    {money(detailTransaction.amount)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot[detailTransaction.status]}`} />
                    {statusMeta[detailTransaction.status].label}
                  </span>
                  <p className="mt-2 text-[10px] font-semibold text-white/60">
                    {detailTransaction.date} · {detailTransaction.time}
                  </p>
                </div>
              </div>

              {detailTransaction.status === 'POSTED' && (
                <div className="absolute -bottom-3 -right-3 rotate-[-10deg] rounded-lg border-2 border-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white/15">
                  Đã chốt sổ
                </div>
              )}
            </div>

            {/* Attributes Grid */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Danh mục tài chính</p>
                <p className="mt-1 text-xs font-black text-slate-800">{detailTransaction.category}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Chi nhánh hạch toán</p>
                <p className="mt-1 text-xs font-black text-slate-800">
                  {detailTransaction.branch === 'Q3' ? 'Chi nhánh Quận 3' : 'Chi nhánh Quận 1'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">
                  {detailTransaction.type === 'INCOME' ? 'Người nộp tiền' : 'Người nhận tiền'}
                </p>
                <p className="mt-1 text-xs font-black text-slate-800">{detailTransaction.counterparty}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Phương thức thanh toán</p>
                <p className="mt-1 text-xs font-black text-slate-800">{methodLabels[detailTransaction.method]}</p>
              </div>

              {detailTransaction.relatedStaff && (
                <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
                  <p className="text-[10px] font-bold text-violet-500">Nhân viên liên quan</p>
                  <p className="mt-1 text-xs font-black text-violet-900">{detailTransaction.relatedStaff}</p>
                </div>
              )}

              {detailTransaction.relatedCustomer && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-[10px] font-bold text-blue-500">Khách hàng liên quan</p>
                  <p className="mt-1 text-xs font-black text-blue-900">{detailTransaction.relatedCustomer}</p>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Người lập phiếu</p>
                <p className="mt-1 text-xs font-bold text-slate-700">{detailTransaction.createdBy}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold text-slate-400">Người phê duyệt / chốt sổ</p>
                <p className="mt-1 text-xs font-bold text-slate-700">
                  {detailTransaction.approvedBy || 'Chưa duyệt'}
                </p>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-bold text-slate-400">Nội dung diễn giải</p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-800">{detailTransaction.description}</p>
              {detailTransaction.note && (
                <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] font-semibold text-slate-500">
                  Ghi chú: {detailTransaction.note}
                </p>
              )}
            </div>

            {/* Document attachment */}
            {detailTransaction.documentName && (
              <div className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50/50 p-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-bold text-violet-900">{detailTransaction.documentName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNotify?.(`Đang tải tập tin ${detailTransaction.documentName}...`)}
                  className="rounded-md bg-white px-2.5 py-1 text-[10px] font-bold text-violet-700 shadow-sm"
                >
                  Xem chứng từ
                </button>
              </div>
            )}

            {/* Audit Trail Timeline */}
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-[10px] font-bold text-slate-400">Lịch sử cập nhật phiếu</p>
              <div className="mt-3 space-y-2.5">
                {detailTransaction.auditTrail && detailTransaction.auditTrail.length > 0 ? (
                  detailTransaction.auditTrail.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-[10px]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{item.action}</p>
                        <p className="mt-0.5 font-semibold text-slate-400">
                          {item.time} · Thực hiện bởi: <span className="font-bold text-slate-600">{item.actor}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] font-semibold text-slate-400">Chưa có lịch sử thay đổi thêm.</p>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {detailTransaction.status !== 'POSTED' ? (
                <button
                  type="button"
                  onClick={() => handleApproveTransaction(detailTransaction)}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Duyệt & chốt sổ ngay
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                  <ShieldCheck className="h-4 w-4" /> Đã chốt sổ (chỉ được xem)
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  In chứng từ
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTransaction(null)}
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800"
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
          title="Xác nhận xóa phiếu giao dịch"
          subtitle="Thao tác này chỉ áp dụng với phiếu nháp hoặc phiếu đang chờ xử lý"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-700">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu{' '}
              <span className="font-black text-rose-600">{deleteConfirmTx.id}</span> (
              {deleteConfirmTx.category} - {money(deleteConfirmTx.amount)}) không?
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTransaction(deleteConfirmTx)}
                className="h-9 rounded-lg bg-rose-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-rose-700"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
