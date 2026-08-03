import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileText,
  Landmark,
  Pencil,
  Plus,
  Search,
  Target,
  WalletCards,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import Modal from './Modal';
import { getTenantAdminInitialData } from '../utils/mockDataReset';

type BranchCode = 'Q1' | 'Q3';
type FinanceTab = 'OVERVIEW' | 'TRANSACTIONS' | 'CASHBOOKS' | 'DEBTS' | 'BUDGETS';
type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
type TransactionStatus = 'POSTED' | 'PENDING' | 'VOID';
type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'EWALLET';

interface FinanceTransaction {
  id: string;
  date: string;
  time: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  branch: BranchCode;
  method: PaymentMethod;
  cashbook: string;
  reference: string;
  counterparty: string;
  status: TransactionStatus;
  createdBy: string;
  approvedBy: string;
  note: string;
}

interface Cashbook {
  id: string;
  name: string;
  type: PaymentMethod;
  branch: BranchCode | 'ALL';
  opening: number;
  income: number;
  expense: number;
  pending: number;
  lastReconciled: string;
  account: string;
}

interface DebtItem {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  name: string;
  category: string;
  branch: BranchCode;
  total: number;
  paid: number;
  dueDate: string;
  status: 'OPEN' | 'OVERDUE' | 'PARTIAL' | 'PAID';
  reference: string;
  owner: string;
}

interface BudgetItem {
  id: string;
  category: string;
  branch: BranchCode | 'ALL';
  budget: number;
  actual: number;
  forecast: number;
  owner: string;
}

interface TenantAdminFinanceProps {
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

const transactionSeed: FinanceTransaction[] = [
  { id: 'PT-260720-084', date: '20/07/2026', time: '16:42', type: 'INCOME', category: 'Doanh thu dịch vụ', description: 'Kết ca POS buổi chiều · Quận 3', amount: 18640000, branch: 'Q3', method: 'CARD', cashbook: 'Đối soát thẻ', reference: 'SHIFT-Q3-2007-PM', counterparty: 'Khách lẻ tại quầy', status: 'POSTED', createdBy: 'Hệ thống POS', approvedBy: 'Nguyễn Trường Thịnh', note: 'Đã khớp 24 hóa đơn và 3 giao dịch tiền cọc online.' },
  { id: 'PC-260720-063', date: '20/07/2026', time: '15:18', type: 'EXPENSE', category: 'Nhập vật tư', description: 'Nhập sơn gel DND và OPI', amount: 12850000, branch: 'Q3', method: 'BANK', cashbook: 'VCB vận hành', reference: 'PO-0726-118', counterparty: 'NailPro Supply', status: 'PENDING', createdBy: 'Minh Châu', approvedBy: 'Chờ Tenant Admin', note: 'Chờ đối chiếu hóa đơn VAT.' },
  { id: 'PT-260720-083', date: '20/07/2026', time: '14:55', type: 'INCOME', category: 'Tiền cọc online', description: 'Cọc lịch online qua VNPay', amount: 4850000, branch: 'Q1', method: 'EWALLET', cashbook: 'Cọc online', reference: 'VNP-BATCH-200726', counterparty: '18 khách đặt lịch', status: 'POSTED', createdBy: 'Cổng thanh toán', approvedBy: 'Tự động', note: 'Đối soát tự động thành công 18/18 giao dịch.' },
  { id: 'PC-260720-062', date: '20/07/2026', time: '13:20', type: 'EXPENSE', category: 'Lương & hoa hồng', description: 'Tạm ứng hoa hồng tuần 29', amount: 9200000, branch: 'Q1', method: 'BANK', cashbook: 'VCB vận hành', reference: 'PAY-W29-Q1', counterparty: 'Nhân sự chi nhánh Q1', status: 'POSTED', createdBy: 'Thu Hà', approvedBy: 'Nguyễn Trường Thịnh', note: 'Chi theo bảng hoa hồng đã chốt.' },
  { id: 'CK-260720-011', date: '20/07/2026', time: '11:45', type: 'TRANSFER', category: 'Chuyển quỹ nội bộ', description: 'Nộp tiền mặt doanh thu về ngân hàng', amount: 25000000, branch: 'Q3', method: 'BANK', cashbook: 'Tiền mặt Q3 → VCB', reference: 'TRF-Q3-2007', counterparty: 'Nội bộ tenant', status: 'POSTED', createdBy: 'Hà My', approvedBy: 'Nguyễn Trường Thịnh', note: 'Đã có biên nhận nộp tiền.' },
  { id: 'PC-260719-061', date: '19/07/2026', time: '18:12', type: 'EXPENSE', category: 'Điện nước & mặt bằng', description: 'Thanh toán điện tháng 07 · Q3', amount: 6840000, branch: 'Q3', method: 'BANK', cashbook: 'VCB vận hành', reference: 'EVN-Q3-0726', counterparty: 'EVN HCMC', status: 'POSTED', createdBy: 'Minh Châu', approvedBy: 'Nguyễn Trường Thịnh', note: 'Mức tiêu thụ tăng 8,4%.' },
  { id: 'PT-260719-081', date: '19/07/2026', time: '17:05', type: 'INCOME', category: 'Bán sản phẩm', description: 'Bán lẻ dưỡng móng & hand cream', amount: 3280000, branch: 'Q1', method: 'CASH', cashbook: 'Tiền mặt Quận 1', reference: 'RETAIL-Q1-1907', counterparty: 'Khách lẻ tại quầy', status: 'POSTED', createdBy: 'Kim Anh', approvedBy: 'Thu Hà', note: 'Khớp 8 hóa đơn bán lẻ.' },
  { id: 'PC-260719-060', date: '19/07/2026', time: '10:30', type: 'EXPENSE', category: 'Marketing', description: 'Ngân sách quảng cáo Instagram tháng 7', amount: 4200000, branch: 'Q1', method: 'CARD', cashbook: 'Thẻ marketing', reference: 'META-ADS-0726', counterparty: 'Meta Platforms', status: 'POSTED', createdBy: 'Bảo Ngọc', approvedBy: 'Nguyễn Trường Thịnh', note: 'Chiến dịch Summer Nail Collection.' },
];

const cashbookSeed: Cashbook[] = [
  { id: 'CB-CASH-Q1', name: 'Tiền mặt Quận 1', type: 'CASH', branch: 'Q1', opening: 18200000, income: 28450000, expense: 9200000, pending: 0, lastReconciled: '20/07/2026 · 17:00', account: 'Két quầy thu ngân Q1' },
  { id: 'CB-CASH-Q3', name: 'Tiền mặt Quận 3', type: 'CASH', branch: 'Q3', opening: 24600000, income: 36280000, expense: 25000000, pending: 0, lastReconciled: '20/07/2026 · 17:05', account: 'Két quầy thu ngân Q3' },
  { id: 'CB-VCB-OPS', name: 'VCB vận hành', type: 'BANK', branch: 'ALL', opening: 486500000, income: 128600000, expense: 84200000, pending: 12850000, lastReconciled: '20/07/2026 · 16:30', account: 'VCB · 1029 886 168' },
  { id: 'CB-CARD', name: 'Đối soát thẻ', type: 'CARD', branch: 'ALL', opening: 0, income: 84600000, expense: 78320000, pending: 6280000, lastReconciled: '20/07/2026 · 15:45', account: 'Visa · Mastercard · Napas' },
  { id: 'CB-DEPOSIT', name: 'Cọc online', type: 'EWALLET', branch: 'ALL', opening: 32400000, income: 4850000, expense: 800000, pending: 0, lastReconciled: '20/07/2026 · 15:00', account: 'VNPay · MoMo · Chuyển khoản' },
];

const debtSeed: DebtItem[] = [
  { id: 'CN-P-018', type: 'PAYABLE', name: 'NailPro Supply', category: 'Vật tư & sơn gel', branch: 'Q3', total: 28600000, paid: 15750000, dueDate: '25/07/2026', status: 'PARTIAL', reference: 'PO-0726-118', owner: 'Minh Châu' },
  { id: 'CN-P-017', type: 'PAYABLE', name: 'Lumière Property', category: 'Tiền thuê mặt bằng', branch: 'Q1', total: 68000000, paid: 0, dueDate: '22/07/2026', status: 'OPEN', reference: 'LEASE-Q1-0726', owner: 'Nguyễn Trường Thịnh' },
  { id: 'CN-R-011', type: 'RECEIVABLE', name: 'Lumière Boutique Hotel', category: 'Đối tác doanh nghiệp', branch: 'Q1', total: 18600000, paid: 7200000, dueDate: '18/07/2026', status: 'OVERDUE', reference: 'B2B-HOTEL-0626', owner: 'Bảo Ngọc' },
  { id: 'CN-R-010', type: 'RECEIVABLE', name: 'Aurora Wedding Studio', category: 'Gói cô dâu', branch: 'Q3', total: 12400000, paid: 6000000, dueDate: '28/07/2026', status: 'PARTIAL', reference: 'B2B-WED-0726', owner: 'Hà My' },
];

const budgetSeed: BudgetItem[] = [
  { id: 'BDG-01', category: 'Vật tư tiêu hao', branch: 'ALL', budget: 85000000, actual: 62400000, forecast: 88800000, owner: 'Minh Châu' },
  { id: 'BDG-02', category: 'Lương & hoa hồng', branch: 'ALL', budget: 268000000, actual: 186500000, forecast: 259000000, owner: 'Nguyễn Trường Thịnh' },
  { id: 'BDG-03', category: 'Marketing', branch: 'ALL', budget: 42000000, actual: 31800000, forecast: 45600000, owner: 'Bảo Ngọc' },
  { id: 'BDG-04', category: 'Điện nước & vận hành', branch: 'Q3', budget: 28000000, actual: 21400000, forecast: 29600000, owner: 'Minh Châu' },
  { id: 'BDG-05', category: 'Bảo trì thiết bị', branch: 'Q1', budget: 18000000, actual: 8200000, forecast: 13400000, owner: 'Thu Hà' },
];

const transactionStatusMeta: Record<TransactionStatus, { label: string; badge: string }> = {
  POSTED: { label: 'Đã ghi sổ', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PENDING: { label: 'Chờ duyệt', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  VOID: { label: 'Đã hủy', badge: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const debtStatusMeta = {
  OPEN: { label: 'Chưa thanh toán', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  PARTIAL: { label: 'Thanh toán một phần', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  OVERDUE: { label: 'Quá hạn', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
  PAID: { label: 'Đã tất toán', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const methodLabel: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Chuyển khoản',
  CARD: 'Thẻ',
  EWALLET: 'Ví điện tử',
};

const tabs: Array<{ id: FinanceTab; label: string }> = [
  { id: 'OVERVIEW', label: 'Tổng quan' },
  { id: 'TRANSACTIONS', label: 'Giao dịch' },
  { id: 'CASHBOOKS', label: 'Sổ tiền' },
  { id: 'DEBTS', label: 'Công nợ' },
  { id: 'BUDGETS', label: 'Ngân sách' },
];

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const shortMoney = (value: number) =>
  `${(value / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
const branchName = (branch: BranchCode | 'ALL') =>
  branch === 'ALL' ? 'Toàn hệ thống' : branch === 'Q1' ? 'Chi nhánh Quận 1' : 'Chi nhánh Quận 3';
const dateToTimestamp = (value: string) => {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day).getTime();
};
const inputDateToTimestamp = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};
const formatInputDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
};
const debtReferenceDate = dateToTimestamp('20/07/2026');
const dueSoonLimit = debtReferenceDate + 7 * 24 * 60 * 60 * 1000;
const normalizeDebts = (items: DebtItem[]) =>
  items.map((item) =>
    item.paid >= item.total ? { ...item, paid: item.total, status: 'PAID' as const } : item
  );

export default function TenantAdminFinanceCompact({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Lumière Nail Studio',
  accessMode = 'full',
  readOnlyReason,
  onNotify,
}: TenantAdminFinanceProps) {
  const storageKey = `tenant-admin-finance-v1:${tenantName}`;
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:transactions`);
      return getTenantAdminInitialData(stored ? JSON.parse(stored) : null, transactionSeed);
    } catch {
      return getTenantAdminInitialData(null, transactionSeed);
    }
  });
  const [cashbooks, setCashbooks] = useState<Cashbook[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:cashbooks`);
      return getTenantAdminInitialData(stored ? JSON.parse(stored) : null, cashbookSeed);
    } catch {
      return getTenantAdminInitialData(null, cashbookSeed);
    }
  });
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:debts`);
      return normalizeDebts(
        getTenantAdminInitialData(stored ? JSON.parse(stored) : null, debtSeed)
      );
    } catch {
      return getTenantAdminInitialData(null, debtSeed);
    }
  });
  const [budgets, setBudgets] = useState<BudgetItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:budgets`);
      return getTenantAdminInitialData(stored ? JSON.parse(stored) : null, budgetSeed);
    } catch {
      return getTenantAdminInitialData(null, budgetSeed);
    }
  });

  const [tab, setTab] = useState<FinanceTab>('OVERVIEW');
  const [period, setPeriod] = useState('MONTH');
  const [customDateRange, setCustomDateRange] = useState({
    from: '2026-07-01',
    to: '2026-07-20',
  });
  const [customDateDraft, setCustomDateDraft] = useState({
    from: '2026-07-01',
    to: '2026-07-20',
  });
  const [dateRangeError, setDateRangeError] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransaction | null>(null);
  const [transactionStatusDraft, setTransactionStatusDraft] =
    useState<TransactionStatus>('PENDING');
  const [selectedCashbook, setSelectedCashbook] = useState<Cashbook | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [debtSearch, setDebtSearch] = useState('');
  const [debtTypeFilter, setDebtTypeFilter] = useState('ALL');
  const [debtStatusFilter, setDebtStatusFilter] = useState('ALL');
  const [debtPaymentAmount, setDebtPaymentAmount] = useState('');
  const [debtPaymentNote, setDebtPaymentNote] = useState('');
  const [debtPaymentError, setDebtPaymentError] = useState('');
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [cashbookFormOpen, setCashbookFormOpen] = useState(false);
  const [editingCashbook, setEditingCashbook] = useState<Cashbook | null>(null);
  const [cashbookFormError, setCashbookFormError] = useState('');
  const [debtFormOpen, setDebtFormOpen] = useState(false);
  const [debtFormError, setDebtFormError] = useState('');
  const [budgetCreateFormOpen, setBudgetCreateFormOpen] = useState(false);
  const [budgetCreateFormError, setBudgetCreateFormError] = useState('');
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [budgetDrafts, setBudgetDrafts] = useState<BudgetItem[]>([]);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    type: 'EXPENSE' as TransactionType,
    category: 'Nhập vật tư',
    description: '',
    amount: '',
    branch: 'Q3' as BranchCode,
    method: 'BANK' as PaymentMethod,
    cashbook: 'VCB vận hành',
    counterparty: '',
    reference: '',
    note: '',
  });
  const [cashbookForm, setCashbookForm] = useState({
    name: '',
    type: 'CASH' as PaymentMethod,
    branch: (selectedBranch === 'Q1' || selectedBranch === 'Q3' ? selectedBranch : 'ALL') as
      | BranchCode
      | 'ALL',
    account: '',
    opening: '',
  });
  const [debtForm, setDebtForm] = useState({
    type: 'RECEIVABLE' as DebtItem['type'],
    name: '',
    category: '',
    branch: (selectedBranch === 'Q1' ? 'Q1' : 'Q3') as BranchCode,
    total: '',
    paid: '',
    dueDate: '2026-07-31',
    reference: '',
    owner: '',
  });
  const [budgetCreateForm, setBudgetCreateForm] = useState({
    category: '',
    branch: (selectedBranch === 'Q1' || selectedBranch === 'Q3' ? selectedBranch : 'ALL') as
      | BranchCode
      | 'ALL',
    budget: '',
    forecast: '',
    owner: '',
  });

  const canManage = accessMode === 'full';

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:transactions`, JSON.stringify(transactions));
    } catch {
      // Local persistence is optional.
    }
  }, [storageKey, transactions]);

  useEffect(() => {
    if (selectedTransaction) {
      setTransactionStatusDraft(selectedTransaction.status);
    }
  }, [selectedTransaction]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:cashbooks`, JSON.stringify(cashbooks));
    } catch {
      // Local persistence is optional.
    }
  }, [cashbooks, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:budgets`, JSON.stringify(budgets));
    } catch {
      // Local persistence is optional.
    }
  }, [budgets, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:debts`, JSON.stringify(debts));
    } catch {
      // Local persistence is optional.
    }
  }, [debts, storageKey]);

  const requireManage = () => {
    if (canManage) return true;
    const message = readOnlyReason || 'Quyền hiện tại chỉ cho phép xem dữ liệu thu chi.';
    setNotice(message);
    onNotify?.(message);
    return false;
  };

  const scopedTransactions = useMemo(
    () => transactions.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch),
    [selectedBranch, transactions]
  );
  const scopedCashbooks = useMemo(
    () =>
      cashbooks.filter(
        (item) => selectedBranch === 'ALL' || item.branch === 'ALL' || item.branch === selectedBranch
      ),
    [cashbooks, selectedBranch]
  );
  const scopedDebts = useMemo(
    () => debts.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch),
    [debts, selectedBranch]
  );
  const scopedBudgets = useMemo(
    () =>
      budgets.filter(
        (item) => selectedBranch === 'ALL' || item.branch === 'ALL' || item.branch === selectedBranch
      ),
    [budgets, selectedBranch]
  );

  const periodRange = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    switch (period) {
      case 'TODAY':
        return { from: debtReferenceDate, to: debtReferenceDate };
      case 'YESTERDAY':
        return { from: debtReferenceDate - day, to: debtReferenceDate - day };
      case 'LAST_7_DAYS':
        return { from: debtReferenceDate - 6 * day, to: debtReferenceDate };
      case 'WEEK':
        return { from: dateToTimestamp('20/07/2026'), to: dateToTimestamp('26/07/2026') };
      case 'LAST_WEEK':
        return { from: dateToTimestamp('13/07/2026'), to: dateToTimestamp('19/07/2026') };
      case 'LAST_MONTH':
        return { from: dateToTimestamp('01/06/2026'), to: dateToTimestamp('30/06/2026') };
      case 'QUARTER':
        return { from: dateToTimestamp('01/07/2026'), to: dateToTimestamp('30/09/2026') };
      case 'CUSTOM':
        return {
          from: inputDateToTimestamp(customDateRange.from),
          to: inputDateToTimestamp(customDateRange.to),
        };
      case 'MONTH':
      default:
        return { from: dateToTimestamp('01/07/2026'), to: dateToTimestamp('31/07/2026') };
    }
  }, [customDateRange, period]);

  const periodTransactions = useMemo(
    () =>
      scopedTransactions.filter((item) => {
        const transactionAt = dateToTimestamp(item.date);
        return transactionAt >= periodRange.from && transactionAt <= periodRange.to;
      }),
    [periodRange, scopedTransactions]
  );

  const filteredDebts = useMemo(() => {
    const query = debtSearch.trim().toLocaleLowerCase('vi');
    const priority = { OVERDUE: 0, OPEN: 1, PARTIAL: 1, PAID: 2 };
    return scopedDebts
      .filter((item) => debtTypeFilter === 'ALL' || item.type === debtTypeFilter)
      .filter((item) => debtStatusFilter === 'ALL' || item.status === debtStatusFilter)
      .filter(
        (item) =>
          !query ||
          `${item.id} ${item.name} ${item.category} ${item.reference} ${item.owner}`
            .toLocaleLowerCase('vi')
            .includes(query)
      )
      .sort(
        (a, b) =>
          priority[a.status] - priority[b.status] ||
          dateToTimestamp(a.dueDate) - dateToTimestamp(b.dueDate)
      );
  }, [debtSearch, debtStatusFilter, debtTypeFilter, scopedDebts]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return periodTransactions
      .filter((item) => typeFilter === 'ALL' || item.type === typeFilter)
      .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
      .filter(
        (item) =>
          !query ||
          `${item.id} ${item.category} ${item.description} ${item.counterparty} ${item.reference}`
            .toLocaleLowerCase('vi')
            .includes(query)
      );
  }, [periodTransactions, searchQuery, statusFilter, typeFilter]);

  const income = periodTransactions
    .filter((item) => item.type === 'INCOME' && item.status === 'POSTED')
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = periodTransactions
    .filter((item) => item.type === 'EXPENSE' && item.status === 'POSTED')
    .reduce((sum, item) => sum + item.amount, 0);
  const ledgerBalance = scopedCashbooks.reduce(
    (sum, item) => sum + item.opening + item.income - item.expense,
    0
  );
  const pendingTransactions = periodTransactions.filter((item) => item.status === 'PENDING');
  const pendingAmount = pendingTransactions.reduce((sum, item) => sum + item.amount, 0);
  const pendingReconciliation = scopedCashbooks.reduce((sum, item) => sum + item.pending, 0);
  const availableBalance = ledgerBalance - pendingReconciliation;
  const overdueDebts = scopedDebts.filter((item) => item.status === 'OVERDUE');
  const overdueAmount = overdueDebts.reduce((sum, item) => sum + item.total - item.paid, 0);
  const dueSoonDebts = scopedDebts.filter((item) => {
    const dueAt = dateToTimestamp(item.dueDate);
    return (
      item.status !== 'PAID' &&
      item.status !== 'OVERDUE' &&
      dueAt > debtReferenceDate &&
      dueAt <= dueSoonLimit
    );
  });
  const dueSoonAmount = dueSoonDebts.reduce((sum, item) => sum + item.total - item.paid, 0);
  const receivable = scopedDebts
    .filter((item) => item.type === 'RECEIVABLE')
    .reduce((sum, item) => sum + item.total - item.paid, 0);
  const payable = scopedDebts
    .filter((item) => item.type === 'PAYABLE')
    .reduce((sum, item) => sum + item.total - item.paid, 0);
  const budgetAlerts = scopedBudgets.filter((item) => item.forecast > item.budget);
  const postedTransactions = periodTransactions.filter((item) => item.status === 'POSTED');
  const summarizeCategories = (type: Extract<TransactionType, 'INCOME' | 'EXPENSE'>) =>
    Object.entries(
      postedTransactions
        .filter((item) => item.type === type)
        .reduce<Record<string, { value: number; count: number }>>((result, item) => {
          const current = result[item.category] || { value: 0, count: 0 };
          result[item.category] = { value: current.value + item.amount, count: current.count + 1 };
          return result;
        }, {})
    )
      .map(([label, summary]) => ({ label, ...summary }))
      .sort((a, b) => b.value - a.value);
  const incomeCategories = summarizeCategories('INCOME');
  const expenseCategories = summarizeCategories('EXPENSE');
  const largestIncomeCategory = Math.max(1, ...incomeCategories.map((item) => item.value));
  const largestExpenseCategory = Math.max(1, ...expenseCategories.map((item) => item.value));
  const branchCashFlow = (['Q1', 'Q3'] as const)
    .filter((branch) => selectedBranch === 'ALL' || selectedBranch === branch)
    .map((branch) => {
      const items = postedTransactions.filter((item) => item.branch === branch);
      const branchIncome = items
        .filter((item) => item.type === 'INCOME')
        .reduce((sum, item) => sum + item.amount, 0);
      const branchExpense = items
        .filter((item) => item.type === 'EXPENSE')
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        branch,
        income: branchIncome,
        expense: branchExpense,
        net: branchIncome - branchExpense,
        transactions: items.length,
      };
    });
  const paymentBreakdown = (Object.keys(methodLabel) as PaymentMethod[])
    .map((method) => {
      const items = postedTransactions.filter(
        (item) => item.method === method && item.type !== 'TRANSFER'
      );
      const methodIncome = items
        .filter((item) => item.type === 'INCOME')
        .reduce((sum, item) => sum + item.amount, 0);
      const methodExpense = items
        .filter((item) => item.type === 'EXPENSE')
        .reduce((sum, item) => sum + item.amount, 0);
      return { method, income: methodIncome, expense: methodExpense, total: methodIncome + methodExpense };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
  const totalPostedFlow = income + expense;
  const postedTransfer = postedTransactions
    .filter((item) => item.type === 'TRANSFER')
    .reduce((sum, item) => sum + item.amount, 0);

  const switchTab = (nextTab: FinanceTab) => {
    setTab(nextTab);
    onSearchQueryChange('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const applyCustomDateRange = () => {
    if (!customDateDraft.from || !customDateDraft.to) {
      setDateRangeError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (inputDateToTimestamp(customDateDraft.from) > inputDateToTimestamp(customDateDraft.to)) {
      setDateRangeError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setCustomDateRange(customDateDraft);
    setDateRangeError('');
    setNotice(
      `Đang xem dữ liệu từ ${formatInputDate(customDateDraft.from)} đến ${formatInputDate(
        customDateDraft.to
      )}.`
    );
  };

  const openTransactionForm = (type: TransactionType) => {
    if (!requireManage()) return;
    setEditingTransaction(null);
    setForm({
      type,
      category:
        type === 'INCOME'
          ? 'Doanh thu khác'
          : type === 'TRANSFER'
            ? 'Chuyển quỹ nội bộ'
            : 'Nhập vật tư',
      description: '',
      amount: '',
      branch: selectedBranch === 'Q1' ? 'Q1' : 'Q3',
      method: 'BANK',
      cashbook: 'VCB vận hành',
      counterparty: '',
      reference: '',
      note: '',
    });
    setFormError('');
    setTransactionFormOpen(true);
  };

  const openTransactionEdit = (transaction: FinanceTransaction) => {
    if (!requireManage()) return;
    setForm({
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: String(transaction.amount),
      branch: transaction.branch,
      method: transaction.method,
      cashbook: transaction.cashbook,
      counterparty: transaction.counterparty,
      reference: transaction.reference === 'Chưa có chứng từ' ? '' : transaction.reference,
      note: transaction.note,
    });
    setFormError('');
    setEditingTransaction(transaction);
    setSelectedTransaction(null);
    setTransactionFormOpen(true);
  };

  const closeTransactionForm = () => {
    setTransactionFormOpen(false);
    if (editingTransaction) {
      setSelectedTransaction(editingTransaction);
      setEditingTransaction(null);
    }
    setFormError('');
  };

  const openCashbookForm = () => {
    if (!requireManage()) return;
    setEditingCashbook(null);
    setCashbookForm({
      name: '',
      type: 'CASH',
      branch: selectedBranch === 'Q1' || selectedBranch === 'Q3' ? selectedBranch : 'ALL',
      account: '',
      opening: '',
    });
    setCashbookFormError('');
    setCashbookFormOpen(true);
  };

  const openCashbookEdit = (cashbook: Cashbook) => {
    if (!requireManage()) return;
    setCashbookForm({
      name: cashbook.name,
      type: cashbook.type,
      branch: cashbook.branch,
      account: cashbook.account,
      opening: String(cashbook.opening),
    });
    setCashbookFormError('');
    setEditingCashbook(cashbook);
    setSelectedCashbook(null);
    setCashbookFormOpen(true);
  };

  const closeCashbookForm = () => {
    setCashbookFormOpen(false);
    setCashbookFormError('');
    if (editingCashbook) {
      setSelectedCashbook(editingCashbook);
      setEditingCashbook(null);
    }
  };

  const submitCashbook = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    const opening = Number(cashbookForm.opening || 0);
    if (
      !cashbookForm.name.trim()
      || !cashbookForm.account.trim()
      || !Number.isFinite(opening)
      || opening < 0
    ) {
      setCashbookFormError('Vui lòng nhập tên sổ, thông tin tài khoản và số dư đầu kỳ hợp lệ.');
      return;
    }

    if (
      cashbooks.some(
        (cashbook) =>
          cashbook.id !== editingCashbook?.id
          && cashbook.name.trim().toLocaleLowerCase('vi')
            === cashbookForm.name.trim().toLocaleLowerCase('vi')
      )
    ) {
      setCashbookFormError('Tên sổ tiền đã tồn tại. Vui lòng chọn một tên khác.');
      return;
    }

    if (editingCashbook) {
      const updated: Cashbook = {
        ...editingCashbook,
        name: cashbookForm.name.trim(),
        type: cashbookForm.type,
        branch: cashbookForm.branch,
        account: cashbookForm.account.trim(),
        opening,
      };
      setCashbooks((current) =>
        current.map((cashbook) => (cashbook.id === editingCashbook.id ? updated : cashbook))
      );
      if (updated.name !== editingCashbook.name) {
        setTransactions((current) =>
          current.map((transaction) =>
            transaction.cashbook === editingCashbook.name
              ? { ...transaction, cashbook: updated.name }
              : transaction
          )
        );
      }
      setCashbookFormOpen(false);
      setCashbookFormError('');
      setEditingCashbook(null);
      setSelectedCashbook(updated);
      setNotice(`Đã cập nhật sổ tiền “${updated.name}”.`);
      return;
    }

    const typeCode: Record<PaymentMethod, string> = {
      CASH: 'CASH',
      BANK: 'BANK',
      CARD: 'CARD',
      EWALLET: 'WALLET',
    };
    const branchCode = cashbookForm.branch === 'ALL' ? 'ALL' : cashbookForm.branch;
    const baseId = `CB-${typeCode[cashbookForm.type]}-${branchCode}`;
    let sequence = 1;
    let id = baseId;
    while (cashbooks.some((cashbook) => cashbook.id === id)) {
      sequence += 1;
      id = `${baseId}-${sequence}`;
    }

    const created: Cashbook = {
      id,
      name: cashbookForm.name.trim(),
      type: cashbookForm.type,
      branch: cashbookForm.branch,
      opening,
      income: 0,
      expense: 0,
      pending: 0,
      lastReconciled: 'Chưa đối soát',
      account: cashbookForm.account.trim(),
    };
    setCashbooks((current) => [...current, created]);
    setCashbookFormOpen(false);
    setCashbookFormError('');
    setNotice(`Đã thêm sổ tiền “${created.name}”.`);
  };

  const submitTransaction = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    if (!form.description.trim() || Number(form.amount) <= 0 || !form.counterparty.trim()) {
      setFormError('Vui lòng nhập nội dung, số tiền và đối tượng giao dịch.');
      return;
    }

    if (editingTransaction) {
      const updated: FinanceTransaction = {
        ...editingTransaction,
        type: form.type,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        branch: form.branch,
        method: form.method,
        cashbook: form.cashbook,
        reference: form.reference.trim() || 'Chưa có chứng từ',
        counterparty: form.counterparty.trim(),
        note: form.note.trim(),
      };
      setTransactions((current) =>
        current.map((item) => (item.id === editingTransaction.id ? updated : item))
      );
      setTransactionFormOpen(false);
      setEditingTransaction(null);
      setSelectedTransaction(updated);
      setFormError('');
      setNotice(`Đã cập nhật giao dịch ${updated.id}.`);
      return;
    }

    const prefix = form.type === 'INCOME' ? 'PT' : form.type === 'EXPENSE' ? 'PC' : 'CK';
    const created: FinanceTransaction = {
      id: `${prefix}-260720-${String(transactions.length + 85).padStart(3, '0')}`,
      date: '20/07/2026',
      time: 'vừa xong',
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      branch: form.branch,
      method: form.method,
      cashbook: form.cashbook,
      reference: form.reference.trim() || 'Chưa có chứng từ',
      counterparty: form.counterparty.trim(),
      status: form.type === 'INCOME' ? 'POSTED' : 'PENDING',
      createdBy: 'Nguyễn Trường Thịnh',
      approvedBy: form.type === 'INCOME' ? 'Tự ghi sổ' : 'Chờ Tenant Admin',
      note: form.note.trim(),
    };
    setTransactions((current) => [created, ...current]);
    setTransactionFormOpen(false);
    setSelectedTransaction(created);
    setNotice(`Đã tạo ${form.type === 'INCOME' ? 'phiếu thu' : form.type === 'EXPENSE' ? 'phiếu chi' : 'phiếu chuyển quỹ'} ${created.id}.`);
  };

  const updateTransactionStatus = () => {
    if (!requireManage() || !selectedTransaction) return;
    if (transactionStatusDraft === selectedTransaction.status) return;

    const updated: FinanceTransaction = {
      ...selectedTransaction,
      status: transactionStatusDraft,
      approvedBy:
        transactionStatusDraft === 'POSTED'
          ? 'Nguyễn Trường Thịnh'
          : transactionStatusDraft === 'PENDING'
            ? 'Chờ Tenant Admin'
            : 'Nguyễn Trường Thịnh · đã hủy',
    };

    setTransactions((current) =>
      current.map((item) => (item.id === selectedTransaction.id ? updated : item))
    );
    setSelectedTransaction(updated);
    setNotice(
      `Đã chuyển ${selectedTransaction.id} sang trạng thái “${transactionStatusMeta[transactionStatusDraft].label}”.`
    );
  };

  const openDebtDetails = (debt: DebtItem) => {
    setSelectedDebt(debt);
    setDebtPaymentAmount(String(Math.max(0, debt.total - debt.paid)));
    setDebtPaymentNote('');
    setDebtPaymentError('');
  };

  const recordDebtPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    if (!selectedDebt) return;
    const remaining = selectedDebt.total - selectedDebt.paid;
    const amount = Number(debtPaymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDebtPaymentError('Vui lòng nhập số tiền lớn hơn 0đ.');
      return;
    }
    if (amount > remaining) {
      setDebtPaymentError(`Số tiền không được vượt quá khoản còn lại ${money(remaining)}.`);
      return;
    }
    const paid = Math.min(selectedDebt.total, selectedDebt.paid + amount);
    const updated: DebtItem = {
      ...selectedDebt,
      paid,
      status: paid >= selectedDebt.total ? 'PAID' : 'PARTIAL',
    };
    setDebts((current) =>
      current.map((item) => (item.id === selectedDebt.id ? updated : item))
    );
    setSelectedDebt(updated);
    setDebtPaymentAmount(String(Math.max(0, updated.total - updated.paid)));
    setDebtPaymentNote('');
    setDebtPaymentError('');
    const action = selectedDebt.type === 'RECEIVABLE' ? 'thu' : 'trả';
    setNotice(
      `Đã ghi nhận ${action} ${money(amount)} cho ${selectedDebt.name}${
        debtPaymentNote.trim() ? ` · ${debtPaymentNote.trim()}` : ''
      }.`
    );
  };

  const openDebtForm = () => {
    if (!requireManage()) return;
    setDebtForm({
      type: debtTypeFilter === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE',
      name: '',
      category: '',
      branch: selectedBranch === 'Q1' ? 'Q1' : 'Q3',
      total: '',
      paid: '',
      dueDate: '2026-07-31',
      reference: '',
      owner: '',
    });
    setDebtFormError('');
    setDebtFormOpen(true);
  };

  const submitDebt = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    const total = Number(debtForm.total);
    const paid = Number(debtForm.paid || 0);
    if (
      !debtForm.name.trim()
      || !debtForm.category.trim()
      || !debtForm.owner.trim()
      || !debtForm.dueDate
      || !Number.isFinite(total)
      || total <= 0
      || !Number.isFinite(paid)
      || paid < 0
      || paid > total
    ) {
      setDebtFormError('Vui lòng nhập đầy đủ thông tin và kiểm tra số tiền công nợ.');
      return;
    }

    const prefix = debtForm.type === 'RECEIVABLE' ? 'CN-R' : 'CN-P';
    let sequence = debts.filter((item) => item.type === debtForm.type).length + 1;
    let id = `${prefix}-${String(sequence).padStart(3, '0')}`;
    while (debts.some((item) => item.id === id)) {
      sequence += 1;
      id = `${prefix}-${String(sequence).padStart(3, '0')}`;
    }
    const dueDate = formatInputDate(debtForm.dueDate);
    const status: DebtItem['status'] =
      paid >= total
        ? 'PAID'
        : paid > 0
          ? 'PARTIAL'
          : inputDateToTimestamp(debtForm.dueDate) < debtReferenceDate
            ? 'OVERDUE'
            : 'OPEN';
    const created: DebtItem = {
      id,
      type: debtForm.type,
      name: debtForm.name.trim(),
      category: debtForm.category.trim(),
      branch: debtForm.branch,
      total,
      paid,
      dueDate,
      status,
      reference: debtForm.reference.trim() || 'Chưa có chứng từ',
      owner: debtForm.owner.trim(),
    };
    setDebts((current) => [created, ...current]);
    setDebtFormOpen(false);
    setDebtFormError('');
    openDebtDetails(created);
    setNotice(`Đã thêm khoản ${created.type === 'RECEIVABLE' ? 'phải thu' : 'phải trả'} “${created.name}”.`);
  };

  const openBudgetCreateForm = () => {
    if (!requireManage()) return;
    setBudgetCreateForm({
      category: '',
      branch: selectedBranch === 'Q1' || selectedBranch === 'Q3' ? selectedBranch : 'ALL',
      budget: '',
      forecast: '',
      owner: '',
    });
    setBudgetCreateFormError('');
    setBudgetCreateFormOpen(true);
  };

  const submitBudgetCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    const budget = Number(budgetCreateForm.budget);
    const forecast = Number(budgetCreateForm.forecast || budget);
    if (
      !budgetCreateForm.category.trim()
      || !budgetCreateForm.owner.trim()
      || !Number.isFinite(budget)
      || budget <= 0
      || !Number.isFinite(forecast)
      || forecast < 0
    ) {
      setBudgetCreateFormError('Vui lòng nhập danh mục, ngân sách và người phụ trách hợp lệ.');
      return;
    }
    let sequence = budgets.length + 1;
    let id = `BDG-${String(sequence).padStart(2, '0')}`;
    while (budgets.some((item) => item.id === id)) {
      sequence += 1;
      id = `BDG-${String(sequence).padStart(2, '0')}`;
    }
    const created: BudgetItem = {
      id,
      category: budgetCreateForm.category.trim(),
      branch: budgetCreateForm.branch,
      budget,
      actual: 0,
      forecast,
      owner: budgetCreateForm.owner.trim(),
    };
    setBudgets((current) => [...current, created]);
    setBudgetCreateFormOpen(false);
    setBudgetCreateFormError('');
    setNotice(`Đã thêm ngân sách “${created.category}”.`);
  };

  const openBudgetForm = () => {
    if (!requireManage()) return;
    setBudgetDrafts(scopedBudgets.map((item) => ({ ...item })));
    setFormError('');
    setBudgetFormOpen(true);
  };

  const submitBudgets = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    if (
      !budgetDrafts.length ||
      budgetDrafts.some((item) => item.budget <= 0 || item.forecast < 0 || !item.owner.trim())
    ) {
      setFormError('Vui lòng kiểm tra ngân sách, dự báo và người phụ trách.');
      return;
    }
    const updates = new Map(budgetDrafts.map((item) => [item.id, item]));
    setBudgets((current) => current.map((item) => updates.get(item.id) || item));
    setBudgetFormOpen(false);
    setNotice('Đã cập nhật kế hoạch ngân sách tháng 07/2026.');
  };

  const exportTransactions = () => {
    const rows = filteredTransactions.map((item) => [
      item.id,
      item.date,
      item.type,
      item.category,
      item.description,
      item.amount,
      branchName(item.branch),
      methodLabel[item.method],
      transactionStatusMeta[item.status].label,
    ]);
    const csv = [
      ['Mã', 'Ngày', 'Loại', 'Danh mục', 'Nội dung', 'Số tiền', 'Chi nhánh', 'Phương thức', 'Trạng thái'],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'so-thu-chi.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('Đã xuất sổ giao dịch theo bộ lọc hiện tại.');
  };

  const transactionIcon = (type: TransactionType) =>
    type === 'INCOME' ? (
      <ArrowDownLeft className="h-4 w-4" />
    ) : type === 'EXPENSE' ? (
      <ArrowUpRight className="h-4 w-4" />
    ) : (
      <ArrowRightLeft className="h-4 w-4" />
    );

  const transactionAmountClass = (type: TransactionType) =>
    type === 'INCOME'
      ? 'text-emerald-700'
      : type === 'EXPENSE'
        ? 'text-rose-700'
        : 'text-blue-700';

  return (
    <div className="space-y-4">
      {(notice || accessMode !== 'full') && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-800">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black">Sổ thu chi</p>
              <p className="mt-0.5 text-xs leading-5">
                {notice || readOnlyReason || 'Bạn đang xem dữ liệu ở chế độ chỉ đọc.'}
              </p>
            </div>
          </div>
          {notice && (
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
              className="flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-violet-500 shadow-none"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <section className="tenant-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="tenant-page-kicker mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-violet-600">
            <WalletCards className="h-4 w-4" />
            Quản lý dòng tiền
          </div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Thu & Chi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Theo dõi chi tiết nguồn tiền vào, khoản tiền ra, dòng tiền theo chi nhánh và các nghĩa vụ cần xử lý.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex">
          <BeautifulSelect
            value={selectedBranch}
            onChange={(event) => onSelectedBranchChange(event.target.value)}
            className="h-11 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            <option value="Q1">Chi nhánh Quận 1</option>
            <option value="Q3">Chi nhánh Quận 3</option>
          </BeautifulSelect>
          <BeautifulSelect
            value={period}
            onChange={(event) => {
              const nextPeriod = event.target.value;
              setPeriod(nextPeriod);
              setDateRangeError('');
              if (nextPeriod === 'CUSTOM') setCustomDateDraft(customDateRange);
            }}
            aria-label="Chọn thời gian thu chi"
            className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
          >
            <optgroup label="Theo ngày">
              <option value="TODAY">Hôm nay · 20/07/2026</option>
              <option value="YESTERDAY">Hôm qua · 19/07/2026</option>
              <option value="LAST_7_DAYS">7 ngày gần nhất</option>
            </optgroup>
            <optgroup label="Theo tuần">
              <option value="WEEK">Tuần này · 20–26/07</option>
              <option value="LAST_WEEK">Tuần trước · 13–19/07</option>
            </optgroup>
            <optgroup label="Theo tháng và quý">
              <option value="MONTH">Tháng 07/2026</option>
              <option value="LAST_MONTH">Tháng 06/2026</option>
              <option value="QUARTER">Quý 3/2026</option>
            </optgroup>
            <optgroup label="Khoảng thời gian riêng">
              <option value="CUSTOM">
                {`Từ ${formatInputDate(customDateRange.from)} đến ${formatInputDate(
                  customDateRange.to
                )}`}
              </option>
            </optgroup>
          </BeautifulSelect>
          <button
            type="button"
            onClick={() => openTransactionForm('INCOME')}
            disabled={!canManage}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700 disabled:opacity-50"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Phiếu thu
          </button>
          <button
            type="button"
            onClick={() => openTransactionForm('EXPENSE')}
            disabled={!canManage}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Phiếu chi
          </button>
        </div>
      </section>

      {period === 'CUSTOM' && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-black text-slate-800">Chọn khoảng thời gian muốn xem</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  Dữ liệu phiếu thu, phiếu chi và tổng tiền sẽ cập nhật theo khoảng ngày này.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
              <label>
                <span className="mb-1.5 block text-[10px] font-bold text-slate-500">Từ ngày</span>
                <input
                  type="date"
                  value={customDateDraft.from}
                  onChange={(event) => {
                    setCustomDateDraft((current) => ({ ...current, from: event.target.value }));
                    setDateRangeError('');
                  }}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-bold text-slate-500">Đến ngày</span>
                <input
                  type="date"
                  value={customDateDraft.to}
                  onChange={(event) => {
                    setCustomDateDraft((current) => ({ ...current, to: event.target.value }));
                    setDateRangeError('');
                  }}
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={applyCustomDateRange}
                className="mt-auto h-11 rounded-xl bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"
              >
                Áp dụng
              </button>
            </div>
          </div>
          {dateRangeError && (
            <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-rose-600 xl:justify-end">
              <AlertTriangle className="h-4 w-4" />
              {dateRangeError}
            </p>
          )}
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <article className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">Số dư khả dụng</p>
              <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                {shortMoney(availableBalance)}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-violet-300">
              <Landmark className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-400">
            {scopedCashbooks.length} sổ tiền · {shortMoney(pendingReconciliation)} chờ về
          </p>
        </article>

        {[
          {
            label: 'Tổng thu',
            value: income,
            detail: `${periodTransactions.filter((item) => item.type === 'INCOME').length} giao dịch`,
            icon: ArrowDownLeft,
            tone: 'bg-emerald-50 text-emerald-600',
            valueTone: 'text-emerald-700',
          },
          {
            label: 'Tổng chi',
            value: expense,
            detail: `${periodTransactions.filter((item) => item.type === 'EXPENSE').length} giao dịch`,
            icon: ArrowUpRight,
            tone: 'bg-rose-50 text-rose-600',
            valueTone: 'text-rose-700',
          },
          {
            label: 'Thuần',
            value: income - expense,
            detail: income >= expense ? 'Dòng tiền đang dương' : 'Cần kiểm soát chi',
            icon: CircleDollarSign,
            tone: 'bg-violet-50 text-violet-600',
            valueTone: income >= expense ? 'text-violet-700' : 'text-rose-700',
          },
        ].map(({ label, value, detail, icon: Icon, tone, valueTone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className={`mt-2 text-xl font-black ${valueTone}`}>{shortMoney(value)}</p>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Phiếu chờ duyệt',
              value: `${pendingTransactions.length} phiếu · ${shortMoney(pendingAmount)}`,
              tone: 'bg-amber-50 text-amber-800',
              action: () => {
                setTab('TRANSACTIONS');
                setStatusFilter('PENDING');
              },
            },
            {
              label: 'Chờ đối soát',
              value: shortMoney(pendingReconciliation),
              tone: 'bg-blue-50 text-blue-800',
              action: () => setTab('CASHBOOKS'),
            },
            {
              label: 'Công nợ quá hạn',
              value: `${overdueDebts.length} khoản · ${shortMoney(overdueDebts.reduce((sum, item) => sum + item.total - item.paid, 0))}`,
              tone: 'bg-rose-50 text-rose-800',
              action: () => setTab('DEBTS'),
            },
            {
              label: 'Ngân sách cảnh báo',
              value: `${budgetAlerts.length} danh mục có thể vượt`,
              tone: 'bg-violet-50 text-violet-800',
              action: () => setTab('BUDGETS'),
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={`flex h-auto items-center gap-3 rounded-xl border-0 p-3 text-left shadow-none ${item.tone}`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-wide opacity-70">
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-xs font-black">{item.value}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-950 p-5 text-white xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Phân tích dòng tiền</p>
            <h2 className="mt-1 text-lg font-black">Chi tiết Thu & Chi trong kỳ</h2>
            <p className="mt-1 text-[11px] text-slate-400">Chỉ tính giao dịch đã ghi sổ · loại trừ phiếu chờ duyệt và phiếu đã hủy</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[520px]">
            <div className="rounded-xl bg-white/5 px-3 py-2.5"><p className="text-[9px] font-bold text-slate-400">Tiền vào</p><p className="mt-1 text-sm font-black text-emerald-300">+{shortMoney(income)}</p></div>
            <div className="rounded-xl bg-white/5 px-3 py-2.5"><p className="text-[9px] font-bold text-slate-400">Tiền ra</p><p className="mt-1 text-sm font-black text-rose-300">−{shortMoney(expense)}</p></div>
            <div className="rounded-xl bg-white/5 px-3 py-2.5"><p className="text-[9px] font-bold text-slate-400">Chênh lệch</p><p className={`mt-1 text-sm font-black ${income - expense >= 0 ? 'text-violet-300' : 'text-rose-300'}`}>{income - expense >= 0 ? '+' : '−'}{shortMoney(Math.abs(income - expense))}</p></div>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Nguồn thu</h3><p className="mt-1 text-[10px] text-slate-500">{incomeCategories.reduce((sum, item) => sum + item.count, 0)} phiếu đã ghi sổ · tổng {shortMoney(income)}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><ArrowDownLeft className="h-4 w-4" /></span></div>
            <div className="mt-4 space-y-3">{incomeCategories.length ? incomeCategories.map((item) => <div key={item.label} className="rounded-xl bg-white p-3 ring-1 ring-emerald-100"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black text-slate-700">{item.label}</p><p className="mt-1 text-[9px] text-slate-400">{item.count} phiếu · {income ? (item.value / income * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0}% tổng thu</p></div><strong className="text-xs text-emerald-700">+{money(item.value)}</strong></div><div className="mt-2 h-2 rounded-full bg-emerald-50"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.max(8, item.value / largestIncomeCategory * 100)}%` }} /></div></div>) : <p className="rounded-xl bg-white p-5 text-center text-[11px] font-semibold text-slate-400">Chưa có khoản thu đã ghi sổ trong kỳ này.</p>}</div>
          </article>

          <article className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Khoản chi</h3><p className="mt-1 text-[10px] text-slate-500">{expenseCategories.reduce((sum, item) => sum + item.count, 0)} phiếu đã ghi sổ · tổng {shortMoney(expense)}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm"><ArrowUpRight className="h-4 w-4" /></span></div>
            <div className="mt-4 space-y-3">{expenseCategories.length ? expenseCategories.map((item) => <div key={item.label} className="rounded-xl bg-white p-3 ring-1 ring-rose-100"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black text-slate-700">{item.label}</p><p className="mt-1 text-[9px] text-slate-400">{item.count} phiếu · {expense ? (item.value / expense * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0}% tổng chi</p></div><strong className="text-xs text-rose-700">−{money(item.value)}</strong></div><div className="mt-2 h-2 rounded-full bg-rose-50"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${Math.max(8, item.value / largestExpenseCategory * 100)}%` }} /></div></div>) : <p className="rounded-xl bg-white p-5 text-center text-[11px] font-semibold text-slate-400">Chưa có khoản chi đã ghi sổ trong kỳ này.</p>}</div>
          </article>
        </div>

        <div className="grid gap-5 border-t border-slate-100 p-4 sm:p-5 xl:grid-cols-[1.2fr_.8fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3"><div><h3 className="text-sm font-black text-slate-900">Dòng tiền theo chi nhánh</h3><p className="mt-1 text-[10px] text-slate-400">So sánh tiền vào, tiền ra và chênh lệch đã ghi sổ</p></div><Landmark className="h-4 w-4 text-violet-500" /></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse"><thead><tr className="text-left text-[9px] font-black uppercase tracking-wide text-slate-400"><th className="px-4 py-3">Chi nhánh</th><th className="px-3 py-3 text-right">Số phiếu</th><th className="px-3 py-3 text-right text-emerald-600">Thu</th><th className="px-3 py-3 text-right text-rose-600">Chi</th><th className="px-4 py-3 text-right">Thuần</th></tr></thead><tbody>{branchCashFlow.map((item) => <tr key={item.branch} className="border-t border-slate-100 text-[11px]"><td className="px-4 py-4 font-black text-slate-700">{branchName(item.branch)}</td><td className="px-3 py-4 text-right font-bold text-slate-500">{item.transactions}</td><td className="px-3 py-4 text-right font-black text-emerald-700">+{money(item.income)}</td><td className="px-3 py-4 text-right font-black text-rose-700">−{money(item.expense)}</td><td className={`px-4 py-4 text-right font-black ${item.net >= 0 ? 'text-violet-700' : 'text-rose-700'}`}>{item.net >= 0 ? '+' : '−'}{money(Math.abs(item.net))}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-slate-200 bg-slate-50 text-[11px]"><td className="px-4 py-4 font-black text-slate-900">Tổng phạm vi</td><td className="px-3 py-4 text-right font-black text-slate-600">{postedTransactions.filter((item) => item.type !== 'TRANSFER').length}</td><td className="px-3 py-4 text-right font-black text-emerald-700">+{money(income)}</td><td className="px-3 py-4 text-right font-black text-rose-700">−{money(expense)}</td><td className={`px-4 py-4 text-right font-black ${income - expense >= 0 ? 'text-violet-800' : 'text-rose-700'}`}>{income - expense >= 0 ? '+' : '−'}{money(Math.abs(income - expense))}</td></tr></tfoot></table></div>
          </article>

          <article className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Theo phương thức thanh toán</h3><p className="mt-1 text-[10px] text-slate-400">Giá trị thu và chi đã ghi sổ</p></div><WalletCards className="h-4 w-4 text-blue-500" /></div>
            <div className="mt-4 space-y-2">{paymentBreakdown.map((item) => <div key={item.method} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black text-slate-700">{methodLabel[item.method]}</p><p className="mt-1 text-[9px] text-slate-400">{totalPostedFlow ? (item.total / totalPostedFlow * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0}% tổng luân chuyển</p></div><div className="text-right"><p className="text-[10px] font-black text-emerald-700">+{shortMoney(item.income)}</p><p className="mt-1 text-[10px] font-black text-rose-700">−{shortMoney(item.expense)}</p></div></div><div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white"><span className="bg-emerald-500" style={{ width: `${item.total ? item.income / item.total * 100 : 0}%` }} /><span className="bg-rose-500" style={{ width: `${item.total ? item.expense / item.total * 100 : 0}%` }} /></div></div>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-blue-50 p-3"><p className="text-[9px] font-bold text-blue-600">Chuyển quỹ nội bộ</p><p className="mt-1 text-xs font-black text-blue-800">{shortMoney(postedTransfer)}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-bold text-amber-600">Chờ ghi sổ</p><p className="mt-1 text-xs font-black text-amber-800">{shortMoney(pendingAmount)}</p></div></div>
          </article>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={`h-9 shrink-0 rounded-xl border-0 px-4 text-xs font-black shadow-none ${
                tab === item.id
                  ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200'
                  : 'bg-transparent text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'OVERVIEW' && (
            <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
              <article className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Giao dịch gần đây</h2>
                    <p className="mt-1 text-[11px] text-slate-400">Tiền vào và ra mới nhất</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('TRANSACTIONS')}
                    className="flex h-9 items-center gap-1 border-0 bg-violet-50 px-3 text-xs font-black text-violet-700 shadow-none"
                  >
                    Xem sổ
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {periodTransactions.slice(0, 6).map((transaction) => (
                    <button
                      key={transaction.id}
                      type="button"
                      onClick={() => setSelectedTransaction(transaction)}
                      className="grid h-auto w-full gap-3 rounded-none border-0 bg-white px-4 py-3 text-left shadow-none hover:bg-slate-50 sm:grid-cols-[36px_1fr_130px_110px] sm:items-center"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          transaction.type === 'INCOME'
                            ? 'bg-emerald-50 text-emerald-600'
                            : transaction.type === 'EXPENSE'
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {transactionIcon(transaction.type)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-slate-800">
                          {transaction.description}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {transaction.id} · {transaction.category} · {branchName(transaction.branch)}
                        </span>
                      </span>
                      <span className={`text-xs font-black ${transactionAmountClass(transaction.type)}`}>
                        {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '−' : ''}
                        {money(transaction.amount)}
                      </span>
                      <span
                        className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${transactionStatusMeta[transaction.status].badge}`}
                      >
                        {transactionStatusMeta[transaction.status].label}
                      </span>
                    </button>
                  ))}
                </div>
              </article>

              <aside className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Khả dụng từng sổ</h2>
                    <p className="mt-1 text-[11px] text-slate-400">Đã trừ các khoản đang chờ đối soát</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('CASHBOOKS')}
                    className="flex h-8 w-8 items-center justify-center border-0 bg-slate-100 p-0 text-slate-500 shadow-none"
                    aria-label="Mở sổ tiền"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {scopedCashbooks.map((cashbook) => {
                    const ledger = cashbook.opening + cashbook.income - cashbook.expense;
                    const available = ledger - cashbook.pending;
                    return (
                      <button
                        key={cashbook.id}
                        type="button"
                        onClick={() => setSelectedCashbook(cashbook)}
                        className="flex h-auto w-full items-center gap-3 rounded-none border-0 bg-white py-3 text-left shadow-none"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          {cashbook.type === 'CASH' ? (
                            <Banknote className="h-4 w-4" />
                          ) : (
                            <Landmark className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-black text-slate-700">
                            {cashbook.name}
                          </span>
                          <span className="mt-1 block text-[10px] text-slate-400">
                            Ghi sổ {shortMoney(ledger)}
                            {cashbook.pending > 0 ? ` · ${shortMoney(cashbook.pending)} chờ` : ' · Đã khớp'}
                          </span>
                        </span>
                        <span className="text-xs font-black text-violet-700">{shortMoney(available)}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
          )}

          {tab === 'TRANSACTIONS' && (
            <div>
              <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Sổ giao dịch</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {filteredTransactions.length} giao dịch trong phạm vi đang chọn
                  </p>
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:max-w-[1120px] 2xl:grid-cols-[minmax(260px,1fr)_150px_145px_auto_auto_auto]">
                  <label className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchQuery}
                      onChange={(event) => onSearchQueryChange(event.target.value)}
                      className={`${inputClass} pl-10`}
                      placeholder="Tìm mã, nội dung, đối tượng..."
                    />
                  </label>
                  <BeautifulSelect
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="ALL">Tất cả loại</option>
                    <option value="INCOME">Phiếu thu</option>
                    <option value="EXPENSE">Phiếu chi</option>
                    <option value="TRANSFER">Chuyển quỹ</option>
                  </BeautifulSelect>
                  <BeautifulSelect
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ duyệt</option>
                    <option value="POSTED">Đã ghi sổ</option>
                    <option value="VOID">Đã hủy</option>
                  </BeautifulSelect>
                  <button
                    type="button"
                    onClick={() => openTransactionForm('EXPENSE')}
                    disabled={!canManage}
                    className="group flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-600 bg-rose-600 px-4 text-xs font-black text-white shadow-[0_6px_16px_rgba(225,29,98,0.18)] hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_8px_20px_rgba(225,29,98,0.24)]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/20">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                    Thêm giao dịch
                  </button>
                  <button
                    type="button"
                    onClick={() => openTransactionForm('TRANSFER')}
                    disabled={!canManage}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Chuyển quỹ
                  </button>
                  <button
                    type="button"
                    onClick={exportTransactions}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"
                  >
                    <Download className="h-4 w-4" />
                    Xuất sổ
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="hidden grid-cols-[130px_1.4fr_1fr_115px_115px_105px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400 lg:grid">
                  <span>Ngày & mã</span>
                  <span>Nội dung</span>
                  <span>Sổ / đối tượng</span>
                  <span>Phương thức</span>
                  <span>Số tiền</span>
                  <span>Trạng thái</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => (
                    <button
                      key={transaction.id}
                      type="button"
                      onClick={() => setSelectedTransaction(transaction)}
                      className="grid h-auto w-full gap-3 rounded-none border-0 bg-white px-4 py-4 text-left shadow-none hover:bg-slate-50 lg:grid-cols-[130px_1.4fr_1fr_115px_115px_105px] lg:items-center"
                    >
                      <span>
                        <span className="block text-xs font-black text-slate-800">{transaction.id}</span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {transaction.date} · {transaction.time}
                        </span>
                      </span>
                      <span>
                        <span className="block text-xs font-black text-slate-700">
                          {transaction.description}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {transaction.category} · {branchName(transaction.branch)}
                        </span>
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-slate-600">{transaction.cashbook}</span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {transaction.counterparty}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {methodLabel[transaction.method]}
                      </span>
                      <span className={`text-xs font-black ${transactionAmountClass(transaction.type)}`}>
                        {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '−' : ''}
                        {money(transaction.amount)}
                      </span>
                      <span
                        className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${transactionStatusMeta[transaction.status].badge}`}
                      >
                        {transactionStatusMeta[transaction.status].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'CASHBOOKS' && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Sổ tiền</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Tách rõ số đầu ngày, số ghi sổ, tiền đang chờ và tiền thực có thể dùng
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openCashbookForm}
                    disabled={!canManage}
                    className="group flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-600 bg-rose-600 px-4 text-xs font-black text-white shadow-[0_6px_16px_rgba(225,29,98,0.18)] hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_8px_20px_rgba(225,29,98,0.24)]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/20">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                    Thêm sổ tiền
                  </button>
                  <button
                    type="button"
                    onClick={() => setReconcileOpen(true)}
                    disabled={!canManage}
                    className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-4 text-xs font-black text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-50"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Đối soát cuối ngày
                  </button>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <div className="min-w-[1120px]">
                  <div className="grid grid-cols-[1.55fr_115px_120px_120px_130px_120px_135px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span>Sổ tiền & tài khoản</span>
                    <span>Đầu ngày</span>
                    <span>Thu trong ngày</span>
                    <span>Chi / chuyển ra</span>
                    <span>Số dư ghi sổ</span>
                    <span>Đang chờ</span>
                    <span>Khả dụng</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {scopedCashbooks.map((cashbook) => {
                      const ledger = cashbook.opening + cashbook.income - cashbook.expense;
                      const available = ledger - cashbook.pending;
                      return (
                        <button
                          key={cashbook.id}
                          type="button"
                          onClick={() => setSelectedCashbook(cashbook)}
                          className="grid h-auto w-full grid-cols-[1.55fr_115px_120px_120px_130px_120px_135px] items-center gap-3 rounded-none border-0 bg-white px-4 py-4 text-left shadow-none hover:bg-slate-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black text-slate-800">
                              {cashbook.name}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-semibold text-slate-500">
                              {cashbook.account}
                            </span>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              {cashbook.id} · {branchName(cashbook.branch)}
                            </span>
                          </span>
                          <span className="text-xs font-black text-slate-700">
                            {money(cashbook.opening)}
                          </span>
                          <span className="text-xs font-black text-emerald-700">
                            +{money(cashbook.income)}
                          </span>
                          <span className="text-xs font-black text-rose-700">
                            −{money(cashbook.expense)}
                          </span>
                          <span className="text-xs font-black text-slate-950">{money(ledger)}</span>
                          <span
                            className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ${
                              cashbook.pending > 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {cashbook.pending > 0 ? money(cashbook.pending) : 'Đã khớp'}
                          </span>
                          <span className="text-sm font-black text-violet-700">
                            {money(available)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-start gap-3 border-t border-blue-100 bg-blue-50 px-4 py-3 text-blue-800">
                  <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p className="text-[11px] leading-5">
                    Với sổ đối soát thẻ, tiền đã chuyển về ngân hàng được ghi ở cột
                    <strong> Chi / chuyển ra</strong>. Phần còn lại là tiền đang chờ đối tác thanh toán,
                    nên chưa được tính là khả dụng và không bị cộng trùng với tài khoản VCB.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'DEBTS' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Kiểm soát công nợ</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Theo dõi tiền cần thu, cần trả và các khoản đến hạn
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openDebtForm}
                    disabled={!canManage}
                    className="group flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-600 bg-rose-600 px-4 text-xs font-black text-white shadow-[0_6px_16px_rgba(225,29,98,0.18)] hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_8px_20px_rgba(225,29,98,0.24)]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/20">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                    Thêm công nợ
                  </button>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500">
                    Cập nhật đến 20/07/2026
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'Phải thu',
                    hint: 'Họ đang nợ mình',
                    value: receivable,
                    icon: <ArrowDownLeft className="h-4 w-4" />,
                    tone: 'border-blue-100 bg-blue-50 text-blue-800',
                  },
                  {
                    label: 'Phải trả',
                    hint: 'Mình đang nợ họ',
                    value: payable,
                    icon: <ArrowUpRight className="h-4 w-4" />,
                    tone: 'border-rose-100 bg-rose-50 text-rose-800',
                  },
                  {
                    label: 'Quá hạn',
                    hint: `${overdueDebts.length} khoản cần xử lý ngay`,
                    value: overdueAmount,
                    icon: <AlertTriangle className="h-4 w-4" />,
                    tone: 'border-amber-100 bg-amber-50 text-amber-800',
                  },
                  {
                    label: 'Sắp đến hạn',
                    hint: `${dueSoonDebts.length} khoản trong 7 ngày`,
                    value: dueSoonAmount,
                    icon: <ClipboardCheck className="h-4 w-4" />,
                    tone: 'border-violet-100 bg-violet-50 text-violet-800',
                  },
                ].map((card) => (
                  <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black">{card.label}</p>
                      {card.icon}
                    </div>
                    <p className="mt-3 text-xl font-black">{money(card.value)}</p>
                    <p className="mt-1 text-[10px] font-semibold opacity-70">{card.hint}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      value: 'ALL',
                      label: 'Tổng hợp',
                      hint: `${scopedDebts.length} khoản công nợ`,
                      active: 'border-slate-800 bg-slate-900 text-white',
                    },
                    {
                      value: 'RECEIVABLE',
                      label: 'Mình thu',
                      hint: `${
                        scopedDebts.filter((item) => item.type === 'RECEIVABLE').length
                      } khoản · Họ nợ mình`,
                      active: 'border-blue-600 bg-blue-600 text-white',
                    },
                    {
                      value: 'PAYABLE',
                      label: 'Mình trả',
                      hint: `${
                        scopedDebts.filter((item) => item.type === 'PAYABLE').length
                      } khoản · Mình nợ họ`,
                      active: 'border-rose-600 bg-rose-600 text-white',
                    },
                  ].map((item) => {
                    const selected = debtTypeFilter === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setDebtTypeFilter(item.value)}
                        className={`flex min-h-16 items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          selected
                            ? item.active
                            : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-black">{item.label}</span>
                          <span
                            className={`mt-1 block text-[10px] font-semibold ${
                              selected ? 'text-white/75' : 'text-slate-400'
                            }`}
                          >
                            {item.hint}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  debtTypeFilter === 'RECEIVABLE'
                    ? 'border-blue-100 bg-blue-50 text-blue-800'
                    : debtTypeFilter === 'PAYABLE'
                      ? 'border-rose-100 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {debtTypeFilter === 'RECEIVABLE' ? (
                  <ArrowDownLeft className="mt-0.5 h-5 w-5 shrink-0" />
                ) : debtTypeFilter === 'PAYABLE' ? (
                  <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-black">
                    {debtTypeFilter === 'RECEIVABLE'
                      ? `Mình cần thu về ${money(receivable)}`
                      : debtTypeFilter === 'PAYABLE'
                        ? `Mình cần thanh toán ${money(payable)}`
                        : 'Đang xem toàn bộ công nợ'}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold opacity-70">
                    {debtTypeFilter === 'RECEIVABLE'
                      ? 'Các khoản khách hàng hoặc đối tác còn nợ salon.'
                      : debtTypeFilter === 'PAYABLE'
                        ? 'Các khoản salon còn phải trả nhà cung cấp hoặc đối tác.'
                        : 'Chọn Mình thu hoặc Mình trả để quản lý riêng từng dòng tiền.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    value={debtSearch}
                    onChange={(event) => setDebtSearch(event.target.value)}
                    placeholder="Tìm đối tác, mã công nợ, chứng từ..."
                    className={`${inputClass} bg-white pl-10`}
                  />
                </label>
                <select
                  value={debtStatusFilter}
                  onChange={(event) => setDebtStatusFilter(event.target.value)}
                  className={`${inputClass} bg-white lg:w-52`}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="OVERDUE">Quá hạn</option>
                  <option value="OPEN">Chưa thanh toán</option>
                  <option value="PARTIAL">Thanh toán một phần</option>
                  <option value="PAID">Đã tất toán</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <div className="min-w-[1080px]">
                  <div className="grid grid-cols-[150px_1.45fr_115px_115px_115px_150px_105px_130px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span>Loại công nợ</span>
                    <span>Đối tác / phụ trách</span>
                    <span>Tổng giá trị</span>
                    <span>Đã thanh toán</span>
                    <span>Còn lại</span>
                    <span>Tiến độ</span>
                    <span>Hạn</span>
                    <span>Trạng thái</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredDebts.map((debt) => {
                      const remaining = Math.max(0, debt.total - debt.paid);
                      const progress = debt.total ? Math.min(100, (debt.paid / debt.total) * 100) : 0;
                      return (
                        <button
                          key={debt.id}
                          type="button"
                          onClick={() => openDebtDetails(debt)}
                          className="grid w-full grid-cols-[150px_1.45fr_115px_115px_115px_150px_105px_130px] items-center gap-3 rounded-none border-0 bg-white px-4 py-4 text-left shadow-none transition hover:bg-violet-50/40"
                        >
                          <span
                            className={`w-fit rounded-lg px-2 py-1.5 text-[9px] font-black uppercase leading-4 ${
                              debt.type === 'RECEIVABLE'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {debt.type === 'RECEIVABLE' ? (
                              <>
                                Phải thu
                                <span className="block opacity-70">Họ nợ mình</span>
                              </>
                            ) : (
                              <>
                                Phải trả
                                <span className="block opacity-70">Mình nợ họ</span>
                              </>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black text-slate-800">
                              {debt.name}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-semibold text-slate-500">
                              {debt.category} · {debt.owner}
                            </span>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              {debt.id} · {branchName(debt.branch)}
                            </span>
                          </span>
                          <span className="text-xs font-black text-slate-700">{money(debt.total)}</span>
                          <span className="text-xs font-black text-emerald-700">{money(debt.paid)}</span>
                          <span
                            className={`text-xs font-black ${
                              remaining ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {money(remaining)}
                          </span>
                          <span>
                            <span className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-500">
                              <span>Đã thanh toán</span>
                              <span>{Math.round(progress)}%</span>
                            </span>
                            <span className="block h-2 overflow-hidden rounded-full bg-slate-100">
                              <span
                                className={`block h-full rounded-full ${
                                  progress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-600">{debt.dueDate}</span>
                          <span
                            className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${debtStatusMeta[debt.status].badge}`}
                          >
                            {debtStatusMeta[debt.status].label}
                          </span>
                        </button>
                      );
                    })}
                    {!filteredDebts.length && (
                      <div className="px-4 py-12 text-center">
                        <p className="text-sm font-black text-slate-700">Không có công nợ phù hợp</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Hãy thử đổi từ khóa hoặc bộ lọc.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'BUDGETS' && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Ngân sách tháng 07/2026</h2>
                  <p className="mt-1 text-xs text-slate-400">So sánh kế hoạch, thực chi và dự báo</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openBudgetCreateForm}
                    disabled={!canManage}
                    className="group flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-600 bg-rose-600 px-4 text-xs font-black text-white shadow-[0_6px_16px_rgba(225,29,98,0.18)] hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_8px_20px_rgba(225,29,98,0.24)]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/20">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                    Thêm ngân sách
                  </button>
                  <button
                    type="button"
                    onClick={openBudgetForm}
                    disabled={!canManage}
                    className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-4 text-xs font-black text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-50"
                  >
                    <Target className="h-4 w-4" />
                    Điều chỉnh ngân sách
                  </button>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="hidden grid-cols-[1.25fr_120px_120px_120px_1fr_105px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400 lg:grid">
                  <span>Danh mục</span>
                  <span>Ngân sách</span>
                  <span>Thực chi</span>
                  <span>Dự báo</span>
                  <span>Mức sử dụng</span>
                  <span>Cảnh báo</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {scopedBudgets.map((budget) => {
                    const percent = budget.budget ? (budget.actual / budget.budget) * 100 : 0;
                    const forecastOver = budget.forecast > budget.budget;
                    return (
                      <div
                        key={budget.id}
                        className="grid gap-3 px-4 py-4 lg:grid-cols-[1.25fr_120px_120px_120px_1fr_105px] lg:items-center"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-800">{budget.category}</p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {branchName(budget.branch)} · {budget.owner}
                          </p>
                        </div>
                        <p className="text-xs font-black text-slate-700">{shortMoney(budget.budget)}</p>
                        <p className="text-xs font-black text-slate-700">{shortMoney(budget.actual)}</p>
                        <p className={`text-xs font-black ${forecastOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {shortMoney(budget.forecast)}
                        </p>
                        <div>
                          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
                            <span>Đã dùng</span>
                            <span>{percent.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                percent > 85
                                  ? 'bg-rose-500'
                                  : percent > 70
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ${
                            forecastOver
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {forecastOver ? 'Có thể vượt' : 'Trong kế hoạch'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedTransaction && (
        <Modal
          isOpen
          onClose={() => setSelectedTransaction(null)}
          maxWidth="2xl"
          title={selectedTransaction.id}
          subtitle={`${selectedTransaction.date} · ${selectedTransaction.time} · ${branchName(selectedTransaction.branch)}`}
          headerBadge={
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${transactionStatusMeta[selectedTransaction.status].badge}`}
            >
              {transactionStatusMeta[selectedTransaction.status].label}
            </span>
          }
          footer={
            <button
              type="button"
              onClick={() => setSelectedTransaction(null)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
            >
              Đóng
            </button>
          }
        >
          <div className="space-y-4">
            <section
              className={`rounded-2xl p-5 text-white ${
                selectedTransaction.type === 'INCOME'
                  ? 'bg-emerald-950'
                  : selectedTransaction.type === 'EXPENSE'
                    ? 'bg-slate-950'
                    : 'bg-blue-950'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Giá trị giao dịch
              </p>
              <p className="mt-2 text-3xl font-black">
                {selectedTransaction.type === 'INCOME'
                  ? '+'
                  : selectedTransaction.type === 'EXPENSE'
                    ? '−'
                    : ''}
                {money(selectedTransaction.amount)}
              </p>
              <p className="mt-2 text-xs text-slate-300">{selectedTransaction.description}</p>
            </section>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Danh mục', selectedTransaction.category],
                ['Đối tượng', selectedTransaction.counterparty],
                ['Sổ tiền', selectedTransaction.cashbook],
                ['Phương thức', methodLabel[selectedTransaction.method]],
                ['Chứng từ', selectedTransaction.reference],
                ['Người duyệt', selectedTransaction.approvedBy],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-black text-slate-700">{value}</p>
                </div>
              ))}
            </div>
            <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800">Trạng thái & thao tác</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Cập nhật trạng thái giao dịch hoặc mở biểu mẫu để chỉnh sửa thông tin.
                  </p>
                  <div className="mt-3 max-w-xs">
                    <BeautifulSelect
                      aria-label="Trạng thái giao dịch"
                      value={transactionStatusDraft}
                      onChange={(event) =>
                        setTransactionStatusDraft(event.target.value as TransactionStatus)
                      }
                      disabled={!canManage}
                      className={inputClass}
                    >
                      {Object.entries(transactionStatusMeta).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </BeautifulSelect>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:min-w-44">
                  <button
                    type="button"
                    onClick={updateTransactionStatus}
                    disabled={!canManage || transactionStatusDraft === selectedTransaction.status}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-violet-200"
                  >
                    <Check className="h-4 w-4" />
                    Lưu trạng thái
                  </button>
                  <button
                    type="button"
                    onClick={() => openTransactionEdit(selectedTransaction)}
                    disabled={!canManage}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-xs font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa thông tin
                  </button>
                </div>
              </div>
              {!canManage && readOnlyReason && (
                <p className="mt-3 text-[10px] font-semibold text-amber-700">{readOnlyReason}</p>
              )}
            </section>
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Ghi chú</p>
              <p className="mt-2 text-xs leading-5 text-violet-800">
                {selectedTransaction.note || 'Không có ghi chú bổ sung.'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {selectedCashbook && (
        <Modal
          isOpen
          onClose={() => setSelectedCashbook(null)}
          maxWidth="3xl"
          title={selectedCashbook.name}
          subtitle={`${selectedCashbook.id} · ${selectedCashbook.account}`}
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCashbook(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => openCashbookEdit(selectedCashbook)}
                disabled={!canManage}
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa sổ tiền
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <section className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Số dư khả dụng
              </p>
              <p className="mt-2 text-3xl font-black">
                {money(
                  selectedCashbook.opening
                  + selectedCashbook.income
                  - selectedCashbook.expense
                  - selectedCashbook.pending
                )}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Số dư ghi sổ{' '}
                {money(selectedCashbook.opening + selectedCashbook.income - selectedCashbook.expense)}
                {' '}− đang chờ {money(selectedCashbook.pending)}
              </p>
            </section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] text-slate-500">Đầu ngày</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-800">
                  {money(selectedCashbook.opening)}
                </p>
              </div>
              <div className="min-w-0 rounded-xl bg-emerald-50 p-3">
                <p className="text-[10px] text-emerald-600">Thu trong ngày</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-emerald-800">+{money(selectedCashbook.income)}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-rose-50 p-3">
                <p className="text-[10px] text-rose-600">Chi / chuyển ra</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-rose-800">−{money(selectedCashbook.expense)}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-blue-50 p-3">
                <p className="text-[10px] text-blue-600">Số dư ghi sổ</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-blue-800">
                  {money(selectedCashbook.opening + selectedCashbook.income - selectedCashbook.expense)}
                </p>
              </div>
              <div className="min-w-0 rounded-xl bg-amber-50 p-3">
                <p className="text-[10px] text-amber-600">Đang chờ</p>
                <p className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-amber-800">{money(selectedCashbook.pending)}</p>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">
              Đối soát gần nhất {selectedCashbook.lastReconciled}
            </p>
          </div>
        </Modal>
      )}

      {selectedDebt && (
        <Modal
          isOpen
          onClose={() => setSelectedDebt(null)}
          maxWidth="lg"
          title={selectedDebt.name}
          subtitle={`${selectedDebt.id} · ${selectedDebt.reference}`}
          headerBadge={
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${debtStatusMeta[selectedDebt.status].badge}`}
            >
              {debtStatusMeta[selectedDebt.status].label}
            </span>
          }
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDebt(null);
                  setDebtPaymentError('');
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Đóng
              </button>
              {selectedDebt.status !== 'PAID' && (
                <button
                  type="button"
                  onClick={() =>
                    (
                      document.getElementById('compact-debt-payment-form') as HTMLFormElement | null
                    )?.requestSubmit()
                  }
                  disabled={!canManage}
                  className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {selectedDebt.type === 'RECEIVABLE' ? 'Ghi nhận đã thu' : 'Ghi nhận đã trả'}
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <section
              className={`rounded-2xl p-5 text-white ${
                selectedDebt.type === 'RECEIVABLE' ? 'bg-blue-950' : 'bg-rose-950'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                {selectedDebt.type === 'RECEIVABLE'
                  ? 'Phải thu · Họ đang nợ mình'
                  : 'Phải trả · Mình đang nợ họ'}
              </p>
              <p className="mt-2 text-3xl font-black">
                {money(Math.max(0, selectedDebt.total - selectedDebt.paid))}
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Tổng {money(selectedDebt.total)} · Đã thanh toán {money(selectedDebt.paid)}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${
                      selectedDebt.total
                        ? Math.min(100, (selectedDebt.paid / selectedDebt.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </section>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Danh mục', selectedDebt.category],
                ['Chi nhánh', branchName(selectedDebt.branch)],
                ['Hạn thanh toán', selectedDebt.dueDate],
                ['Người phụ trách', selectedDebt.owner],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-black text-slate-700">{value}</p>
                </div>
              ))}
            </div>
            {selectedDebt.status === 'PAID' ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-black">Khoản công nợ đã được tất toán</p>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Số tiền còn lại là 0đ. Không cần thực hiện thêm thanh toán.
                  </p>
                </div>
              </div>
            ) : (
              <form
                id="compact-debt-payment-form"
                onSubmit={recordDebtPayment}
                className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"
              >
                <div>
                  <p className="text-xs font-black text-slate-800">Ghi nhận thanh toán</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Có thể nhập một phần hoặc thanh toán toàn bộ số tiền còn lại.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label>
                    <span className="mb-1.5 block text-[10px] font-bold text-slate-500">
                      Số tiền thanh toán
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(0, selectedDebt.total - selectedDebt.paid)}
                      value={debtPaymentAmount}
                      onChange={(event) => {
                        setDebtPaymentAmount(event.target.value);
                        setDebtPaymentError('');
                      }}
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDebtPaymentAmount(String(selectedDebt.total - selectedDebt.paid));
                      setDebtPaymentError('');
                    }}
                    className="mt-auto h-11 rounded-xl border border-violet-200 bg-white px-4 text-xs font-black text-violet-700"
                  >
                    Điền toàn bộ
                  </button>
                </div>
                <label>
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-500">
                    Ghi chú (không bắt buộc)
                  </span>
                  <input
                    value={debtPaymentNote}
                    onChange={(event) => setDebtPaymentNote(event.target.value)}
                    placeholder="Ví dụ: Chuyển khoản đợt 2"
                    className={inputClass}
                  />
                </label>
                {debtPaymentError && (
                  <p className="flex items-center gap-2 text-[11px] font-bold text-rose-600">
                    <AlertTriangle className="h-4 w-4" />
                    {debtPaymentError}
                  </p>
                )}
              </form>
            )}
          </div>
        </Modal>
      )}

      {transactionFormOpen && (
        <Modal
          isOpen
          onClose={closeTransactionForm}
          maxWidth="2xl"
          title={
            editingTransaction
              ? `Chỉnh sửa ${editingTransaction.id}`
              : form.type === 'INCOME'
              ? 'Tạo phiếu thu'
              : form.type === 'EXPENSE'
                ? 'Tạo phiếu chi'
                : 'Tạo phiếu chuyển quỹ'
          }
          subtitle={
            editingTransaction
              ? 'Cập nhật thông tin giao dịch; mã được giữ nguyên. Trạng thái chỉnh tại màn xem chi tiết.'
              : 'Nhập thông tin ngắn gọn để ghi nhận giao dịch.'
          }
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={closeTransactionForm}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  (document.getElementById('compact-finance-form') as HTMLFormElement | null)?.requestSubmit()
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-black text-white"
              >
                <Check className="h-4 w-4" />
                {editingTransaction ? 'Lưu thay đổi' : 'Tạo giao dịch'}
              </button>
            </div>
          }
        >
          <form id="compact-finance-form" onSubmit={submitTransaction} className="space-y-4">
            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Loại giao dịch</span>
                <BeautifulSelect
                  value={form.type}
                  disabled={Boolean(editingTransaction)}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value as TransactionType }))
                  }
                  className={inputClass}
                >
                  <option value="INCOME">Phiếu thu</option>
                  <option value="EXPENSE">Phiếu chi</option>
                  <option value="TRANSFER">Chuyển quỹ nội bộ</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Danh mục</span>
                <BeautifulSelect
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className={inputClass}
                >
                  {[
                    'Doanh thu dịch vụ',
                    'Doanh thu khác',
                    'Tiền cọc online',
                    'Bán sản phẩm',
                    'Nhập vật tư',
                    'Lương & hoa hồng',
                    'Điện nước & mặt bằng',
                    'Marketing',
                    'Bảo trì thiết bị',
                    'Chuyển quỹ nội bộ',
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </BeautifulSelect>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Nội dung *</span>
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Mô tả ngắn gọn mục đích thu hoặc chi"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Số tiền *</span>
                <input
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Chi nhánh</span>
                <BeautifulSelect
                  value={form.branch}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, branch: event.target.value as BranchCode }))
                  }
                  className={inputClass}
                >
                  <option value="Q1">Chi nhánh Quận 1</option>
                  <option value="Q3">Chi nhánh Quận 3</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Sổ tiền</span>
                <BeautifulSelect
                  value={form.cashbook}
                  onChange={(event) => setForm((current) => ({ ...current, cashbook: event.target.value }))}
                  className={inputClass}
                >
                  {cashbooks.map((cashbook) => (
                    <option key={cashbook.id}>{cashbook.name}</option>
                  ))}
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Phương thức</span>
                <BeautifulSelect
                  value={form.method}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))
                  }
                  className={inputClass}
                >
                  {Object.entries(methodLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Đối tượng *</span>
                <input
                  value={form.counterparty}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, counterparty: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Nhà cung cấp, nhân viên, khách hàng..."
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Mã chứng từ</span>
                <input
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reference: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="PO-0726-xxx"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Ghi chú</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>
          </form>
        </Modal>
      )}

      {debtFormOpen && (
        <Modal
          isOpen
          onClose={() => setDebtFormOpen(false)}
          maxWidth="2xl"
          title="Thêm công nợ"
          subtitle="Ghi nhận khoản phải thu hoặc phải trả mới."
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setDebtFormOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  (document.getElementById('compact-debt-form') as HTMLFormElement | null)?.requestSubmit()
                }
                disabled={!canManage}
                className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-black text-white shadow-lg shadow-rose-200"
              >
                <Plus className="h-4 w-4" />
                Thêm công nợ
              </button>
            </div>
          }
        >
          <form id="compact-debt-form" onSubmit={submitDebt} className="space-y-4">
            {debtFormError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {debtFormError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Loại công nợ</span>
                <BeautifulSelect
                  value={debtForm.type}
                  onChange={(event) =>
                    setDebtForm((current) => ({
                      ...current,
                      type: event.target.value as DebtItem['type'],
                    }))
                  }
                  className={inputClass}
                >
                  <option value="RECEIVABLE">Phải thu · Họ nợ mình</option>
                  <option value="PAYABLE">Phải trả · Mình nợ họ</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Chi nhánh</span>
                <BeautifulSelect
                  value={debtForm.branch}
                  onChange={(event) =>
                    setDebtForm((current) => ({
                      ...current,
                      branch: event.target.value as BranchCode,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="Q1">Chi nhánh Quận 1</option>
                  <option value="Q3">Chi nhánh Quận 3</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Đối tác hoặc khách hàng *
                </span>
                <input
                  value={debtForm.name}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Tên khách hàng, đối tác hoặc nhà cung cấp"
                  autoFocus
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Danh mục *</span>
                <input
                  value={debtForm.category}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, category: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Ví dụ: Vật tư & sơn gel"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Tổng giá trị *
                </span>
                <input
                  type="number"
                  min="1"
                  value={debtForm.total}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, total: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Đã thanh toán
                </span>
                <input
                  type="number"
                  min="0"
                  value={debtForm.paid}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, paid: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Hạn thanh toán *
                </span>
                <input
                  type="date"
                  value={debtForm.dueDate}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Người phụ trách *
                </span>
                <input
                  value={debtForm.owner}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, owner: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Nhân sự theo dõi khoản công nợ"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Mã chứng từ</span>
                <input
                  value={debtForm.reference}
                  onChange={(event) =>
                    setDebtForm((current) => ({ ...current, reference: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Hợp đồng, hóa đơn hoặc mã đơn hàng"
                />
              </label>
            </div>
          </form>
        </Modal>
      )}

      {budgetCreateFormOpen && (
        <Modal
          isOpen
          onClose={() => setBudgetCreateFormOpen(false)}
          maxWidth="lg"
          title="Thêm ngân sách"
          subtitle="Tạo hạn mức mới cho một danh mục chi phí."
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setBudgetCreateFormOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  (document.getElementById('compact-budget-create-form') as HTMLFormElement | null)?.requestSubmit()
                }
                disabled={!canManage}
                className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-black text-white shadow-lg shadow-rose-200"
              >
                <Plus className="h-4 w-4" />
                Thêm ngân sách
              </button>
            </div>
          }
        >
          <form id="compact-budget-create-form" onSubmit={submitBudgetCreate} className="space-y-4">
            {budgetCreateFormError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {budgetCreateFormError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Danh mục *</span>
                <input
                  value={budgetCreateForm.category}
                  onChange={(event) =>
                    setBudgetCreateForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Ví dụ: Đào tạo nhân sự"
                  autoFocus
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Phạm vi</span>
                <BeautifulSelect
                  value={budgetCreateForm.branch}
                  onChange={(event) =>
                    setBudgetCreateForm((current) => ({
                      ...current,
                      branch: event.target.value as BranchCode | 'ALL',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="ALL">Toàn hệ thống</option>
                  <option value="Q1">Chi nhánh Quận 1</option>
                  <option value="Q3">Chi nhánh Quận 3</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Người phụ trách *
                </span>
                <input
                  value={budgetCreateForm.owner}
                  onChange={(event) =>
                    setBudgetCreateForm((current) => ({ ...current, owner: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Người quản lý ngân sách"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Ngân sách *
                </span>
                <input
                  type="number"
                  min="1"
                  value={budgetCreateForm.budget}
                  onChange={(event) =>
                    setBudgetCreateForm((current) => ({ ...current, budget: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Dự báo chi
                </span>
                <input
                  type="number"
                  min="0"
                  value={budgetCreateForm.forecast}
                  onChange={(event) =>
                    setBudgetCreateForm((current) => ({
                      ...current,
                      forecast: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Mặc định bằng ngân sách"
                />
              </label>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3 text-violet-800">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <p className="text-[11px] leading-5">
                Thực chi ban đầu bằng 0 và sẽ được cập nhật từ các giao dịch đã ghi sổ.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {budgetFormOpen && (
        <Modal
          isOpen
          onClose={() => setBudgetFormOpen(false)}
          maxWidth="4xl"
          title="Điều chỉnh ngân sách"
          subtitle="Cập nhật kế hoạch, dự báo và người phụ trách."
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setBudgetFormOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  (document.getElementById('compact-budget-form') as HTMLFormElement | null)?.requestSubmit()
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-black text-white"
              >
                <Check className="h-4 w-4" />
                Lưu điều chỉnh
              </button>
            </div>
          }
        >
          <form id="compact-budget-form" onSubmit={submitBudgets} className="space-y-3">
            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>
            )}
            {budgetDrafts.map((item) => (
              <section key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{item.category}</h3>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {item.id} · {branchName(item.branch)} · Đã chi {shortMoney(item.actual)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Ngân sách</span>
                    <input
                      type="number"
                      min="1"
                      value={item.budget}
                      onChange={(event) =>
                        setBudgetDrafts((current) =>
                          current.map((budget) =>
                            budget.id === item.id
                              ? { ...budget, budget: Number(event.target.value) }
                              : budget
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Dự báo</span>
                    <input
                      type="number"
                      min="0"
                      value={item.forecast}
                      onChange={(event) =>
                        setBudgetDrafts((current) =>
                          current.map((budget) =>
                            budget.id === item.id
                              ? { ...budget, forecast: Number(event.target.value) }
                              : budget
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Người phụ trách</span>
                    <input
                      value={item.owner}
                      onChange={(event) =>
                        setBudgetDrafts((current) =>
                          current.map((budget) =>
                            budget.id === item.id ? { ...budget, owner: event.target.value } : budget
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>
            ))}
          </form>
        </Modal>
      )}

      {cashbookFormOpen && (
        <Modal
          isOpen
          onClose={closeCashbookForm}
          maxWidth="lg"
          title={editingCashbook ? `Chỉnh sửa ${editingCashbook.name}` : 'Thêm sổ tiền'}
          subtitle={
            editingCashbook
              ? 'Cập nhật thông tin sổ tiền; mã sổ và số liệu phát sinh được giữ nguyên.'
              : 'Tạo sổ quỹ hoặc tài khoản để theo dõi dòng tiền riêng.'
          }
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={closeCashbookForm}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  (document.getElementById('compact-cashbook-form') as HTMLFormElement | null)?.requestSubmit()
                }
                disabled={!canManage}
                className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-black text-white shadow-lg shadow-rose-200"
              >
                {editingCashbook ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingCashbook ? 'Lưu thay đổi' : 'Thêm sổ tiền'}
              </button>
            </div>
          }
        >
          <form id="compact-cashbook-form" onSubmit={submitCashbook} className="space-y-4">
            {cashbookFormError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {cashbookFormError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Tên sổ tiền *</span>
                <input
                  value={cashbookForm.name}
                  onChange={(event) =>
                    setCashbookForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Ví dụ: Tiền mặt lễ tân Quận 1"
                  autoFocus
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Loại sổ</span>
                <BeautifulSelect
                  value={cashbookForm.type}
                  onChange={(event) =>
                    setCashbookForm((current) => ({
                      ...current,
                      type: event.target.value as PaymentMethod,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Tài khoản ngân hàng</option>
                  <option value="CARD">Đối soát thẻ</option>
                  <option value="EWALLET">Ví điện tử</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Phạm vi áp dụng</span>
                <BeautifulSelect
                  value={cashbookForm.branch}
                  onChange={(event) =>
                    setCashbookForm((current) => ({
                      ...current,
                      branch: event.target.value as BranchCode | 'ALL',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="ALL">Toàn hệ thống</option>
                  <option value="Q1">Chi nhánh Quận 1</option>
                  <option value="Q3">Chi nhánh Quận 3</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Số dư đầu kỳ</span>
                <input
                  type="number"
                  min="0"
                  value={cashbookForm.opening}
                  onChange={(event) =>
                    setCashbookForm((current) => ({ ...current, opening: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">
                  Thông tin tài khoản *
                </span>
                <input
                  value={cashbookForm.account}
                  onChange={(event) =>
                    setCashbookForm((current) => ({ ...current, account: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Két tiền, ngân hàng hoặc số tài khoản"
                />
              </label>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-800">
              <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-[11px] leading-5">
                Mỗi sổ tiền nên đại diện cho một nguồn tiền thực tế để số dư và đối soát không bị
                trùng lặp.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {reconcileOpen && (
        <Modal
          isOpen
          onClose={() => setReconcileOpen(false)}
          maxWidth="md"
          title="Xác nhận đối soát cuối ngày"
          subtitle="20/07/2026"
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setReconcileOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!requireManage()) return;
                  setReconcileOpen(false);
                  setNotice('Đã hoàn tất đối soát sổ tiền ngày 20/07/2026.');
                }}
                disabled={!canManage}
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-black text-white"
              >
                <ClipboardCheck className="h-4 w-4" />
                Xác nhận đối soát
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-[10px] text-emerald-600">Sổ đã khớp</p>
                <p className="mt-1 text-xl font-black text-emerald-800">
                  {scopedCashbooks.filter((item) => item.pending === 0).length}/{scopedCashbooks.length}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-[10px] text-amber-600">Tiền đang chờ về</p>
                <p className="mt-1 text-xl font-black text-amber-800">
                  {shortMoney(pendingReconciliation)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-slate-700">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-xs leading-5">
                Sau khi xác nhận, hệ thống lưu thời điểm đối soát để thuận tiện kiểm tra cuối ngày.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
