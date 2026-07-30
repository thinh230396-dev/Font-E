import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileText,
  Landmark,
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
  status: 'OPEN' | 'OVERDUE' | 'PARTIAL';
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
  { id: 'CB-CARD', name: 'Đối soát thẻ', type: 'CARD', branch: 'ALL', opening: 0, income: 84600000, expense: 0, pending: 6280000, lastReconciled: '20/07/2026 · 15:45', account: 'Visa · Mastercard · Napas' },
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
  const [cashbooks] = useState<Cashbook[]>(() => getTenantAdminInitialData(null, cashbookSeed));
  const [debts, setDebts] = useState<DebtItem[]>(() => getTenantAdminInitialData(null, debtSeed));
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
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransaction | null>(null);
  const [selectedCashbook, setSelectedCashbook] = useState<Cashbook | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
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

  const canManage = accessMode === 'full';

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:transactions`, JSON.stringify(transactions));
    } catch {
      // Local persistence is optional.
    }
  }, [storageKey, transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:budgets`, JSON.stringify(budgets));
    } catch {
      // Local persistence is optional.
    }
  }, [budgets, storageKey]);

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

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return scopedTransactions
      .filter((item) => typeFilter === 'ALL' || item.type === typeFilter)
      .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
      .filter(
        (item) =>
          !query ||
          `${item.id} ${item.category} ${item.description} ${item.counterparty} ${item.reference}`
            .toLocaleLowerCase('vi')
            .includes(query)
      );
  }, [scopedTransactions, searchQuery, statusFilter, typeFilter]);

  const income = scopedTransactions
    .filter((item) => item.type === 'INCOME' && item.status === 'POSTED')
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = scopedTransactions
    .filter((item) => item.type === 'EXPENSE' && item.status === 'POSTED')
    .reduce((sum, item) => sum + item.amount, 0);
  const ledgerBalance = scopedCashbooks.reduce(
    (sum, item) => sum + item.opening + item.income - item.expense,
    0
  );
  const pendingTransactions = scopedTransactions.filter((item) => item.status === 'PENDING');
  const pendingAmount = pendingTransactions.reduce((sum, item) => sum + item.amount, 0);
  const pendingReconciliation = scopedCashbooks.reduce((sum, item) => sum + item.pending, 0);
  const availableBalance = ledgerBalance - pendingReconciliation;
  const overdueDebts = scopedDebts.filter((item) => item.status === 'OVERDUE');
  const receivable = scopedDebts
    .filter((item) => item.type === 'RECEIVABLE')
    .reduce((sum, item) => sum + item.total - item.paid, 0);
  const payable = scopedDebts
    .filter((item) => item.type === 'PAYABLE')
    .reduce((sum, item) => sum + item.total - item.paid, 0);
  const budgetAlerts = scopedBudgets.filter((item) => item.forecast > item.budget);

  const switchTab = (nextTab: FinanceTab) => {
    setTab(nextTab);
    onSearchQueryChange('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const openTransactionForm = (type: TransactionType) => {
    if (!requireManage()) return;
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

  const submitTransaction = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    if (!form.description.trim() || Number(form.amount) <= 0 || !form.counterparty.trim()) {
      setFormError('Vui lòng nhập nội dung, số tiền và đối tượng giao dịch.');
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

  const approveTransaction = (transaction: FinanceTransaction) => {
    if (!requireManage()) return;
    const updated = {
      ...transaction,
      status: 'POSTED' as TransactionStatus,
      approvedBy: 'Nguyễn Trường Thịnh',
    };
    setTransactions((current) =>
      current.map((item) => (item.id === transaction.id ? updated : item))
    );
    setSelectedTransaction(updated);
    setNotice(`Đã duyệt và ghi sổ ${transaction.id}.`);
  };

  const settleDebt = (debt: DebtItem) => {
    if (!requireManage()) return;
    const updated = { ...debt, paid: debt.total, status: 'OPEN' as const };
    setDebts((current) => current.map((item) => (item.id === debt.id ? updated : item)));
    setSelectedDebt(updated);
    setNotice(`Đã ghi nhận thanh toán đủ cho ${debt.name}.`);
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
            Sổ thu chi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Theo dõi tiền vào, tiền ra và các khoản cần xử lý trong một màn hình.
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
            onChange={(event) => setPeriod(event.target.value)}
            className="h-11 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
          >
            <option value="TODAY">Hôm nay</option>
            <option value="WEEK">Tuần này</option>
            <option value="MONTH">Tháng 07/2026</option>
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
            detail: `${scopedTransactions.filter((item) => item.type === 'INCOME').length} giao dịch`,
            icon: ArrowDownLeft,
            tone: 'bg-emerald-50 text-emerald-600',
            valueTone: 'text-emerald-700',
          },
          {
            label: 'Tổng chi',
            value: expense,
            detail: `${scopedTransactions.filter((item) => item.type === 'EXPENSE').length} giao dịch`,
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
                  {scopedTransactions.slice(0, 6).map((transaction) => (
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
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Sổ giao dịch</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {filteredTransactions.length} giao dịch trong phạm vi đang chọn
                  </p>
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-[1fr_160px_150px_auto_auto]">
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
                <button
                  type="button"
                  onClick={() => setReconcileOpen(true)}
                  disabled={!canManage}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Đối soát cuối ngày
                </button>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <div className="min-w-[1120px]">
                  <div className="grid grid-cols-[1.55fr_115px_120px_120px_130px_120px_135px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span>Sổ tiền & tài khoản</span>
                    <span>Đầu ngày</span>
                    <span>Thu trong ngày</span>
                    <span>Chi trong ngày</span>
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
              </div>
            </div>
          )}

          {tab === 'DEBTS' && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Công nợ</h2>
                  <p className="mt-1 text-xs text-slate-400">Ưu tiên khoản quá hạn và sắp đến hạn</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                    Phải thu {shortMoney(receivable)}
                  </span>
                  <span className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                    Phải trả {shortMoney(payable)}
                  </span>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="hidden grid-cols-[1.3fr_1fr_115px_115px_115px_110px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400 lg:grid">
                  <span>Đối tác</span>
                  <span>Danh mục</span>
                  <span>Tổng giá trị</span>
                  <span>Đã trả</span>
                  <span>Còn lại</span>
                  <span>Hạn / trạng thái</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[...scopedDebts]
                    .sort((a, b) => Number(b.status === 'OVERDUE') - Number(a.status === 'OVERDUE'))
                    .map((debt) => (
                      <button
                        key={debt.id}
                        type="button"
                        onClick={() => setSelectedDebt(debt)}
                        className="grid h-auto w-full gap-3 rounded-none border-0 bg-white px-4 py-4 text-left shadow-none hover:bg-slate-50 lg:grid-cols-[1.3fr_1fr_115px_115px_115px_110px] lg:items-center"
                      >
                        <span>
                          <span className="block text-xs font-black text-slate-800">{debt.name}</span>
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {debt.id} · {branchName(debt.branch)} · {debt.owner}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-slate-600">{debt.category}</span>
                        <span className="text-xs font-black text-slate-700">{money(debt.total)}</span>
                        <span className="text-xs font-black text-emerald-700">{money(debt.paid)}</span>
                        <span className="text-xs font-black text-rose-700">
                          {money(debt.total - debt.paid)}
                        </span>
                        <span>
                          <span className="block text-[10px] font-bold text-slate-500">{debt.dueDate}</span>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${debtStatusMeta[debt.status].badge}`}
                          >
                            {debtStatusMeta[debt.status].label}
                          </span>
                        </span>
                      </button>
                    ))}
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
                <button
                  type="button"
                  onClick={openBudgetForm}
                  disabled={!canManage}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                >
                  <Target className="h-4 w-4" />
                  Điều chỉnh ngân sách
                </button>
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
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Đóng
              </button>
              {selectedTransaction.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => approveTransaction(selectedTransaction)}
                  disabled={!canManage}
                  className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                >
                  <Check className="h-4 w-4" />
                  Duyệt & ghi sổ
                </button>
              )}
            </div>
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
          maxWidth="lg"
          title={selectedCashbook.name}
          subtitle={`${selectedCashbook.id} · ${selectedCashbook.account}`}
          footer={
            <button
              type="button"
              onClick={() => setSelectedCashbook(null)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
            >
              Đóng
            </button>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] text-slate-500">Đầu ngày</p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {money(selectedCashbook.opening)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-[10px] text-emerald-600">Thu trong ngày</p>
                <p className="mt-1 text-sm font-black text-emerald-800">+{money(selectedCashbook.income)}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-[10px] text-rose-600">Chi trong ngày</p>
                <p className="mt-1 text-sm font-black text-rose-800">−{money(selectedCashbook.expense)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-[10px] text-blue-600">Số dư ghi sổ</p>
                <p className="mt-1 text-sm font-black text-blue-800">
                  {money(selectedCashbook.opening + selectedCashbook.income - selectedCashbook.expense)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[10px] text-amber-600">Đang chờ</p>
                <p className="mt-1 text-sm font-black text-amber-800">{money(selectedCashbook.pending)}</p>
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
                onClick={() => setSelectedDebt(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => settleDebt(selectedDebt)}
                disabled={!canManage || selectedDebt.paid >= selectedDebt.total}
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Ghi nhận thanh toán đủ
              </button>
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
                {selectedDebt.type === 'RECEIVABLE' ? 'Còn phải thu' : 'Còn phải trả'}
              </p>
              <p className="mt-2 text-3xl font-black">{money(selectedDebt.total - selectedDebt.paid)}</p>
              <p className="mt-2 text-xs text-slate-300">
                Tổng {money(selectedDebt.total)} · Đã thanh toán {money(selectedDebt.paid)}
              </p>
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
          </div>
        </Modal>
      )}

      {transactionFormOpen && (
        <Modal
          isOpen
          onClose={() => setTransactionFormOpen(false)}
          maxWidth="2xl"
          title={
            form.type === 'INCOME'
              ? 'Tạo phiếu thu'
              : form.type === 'EXPENSE'
                ? 'Tạo phiếu chi'
                : 'Tạo phiếu chuyển quỹ'
          }
          subtitle="Nhập thông tin ngắn gọn để ghi nhận giao dịch."
          footer={
            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransactionFormOpen(false)}
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
                Tạo giao dịch
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
                    'Doanh thu khác',
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
