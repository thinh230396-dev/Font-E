import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileBarChart,
  History,
  MapPin,
  PackageCheck,
  PackageOpen,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type BranchCode = 'Q1' | 'Q3';
type ProductCategory = 'POLISH' | 'CHEMICAL' | 'CARE' | 'DISPOSABLE' | 'ACCESSORY';
type StockHealth = 'ALL' | 'OUT' | 'LOW' | 'EXPIRING' | 'OK';
type ReportStatus = 'SENT' | 'APPROVED' | 'FULFILLED';
type ReportUrgency = 'NORMAL' | 'HIGH' | 'URGENT';

interface StockMovement {
  id: string;
  time: string;
  type: 'COUNT' | 'USE' | 'RECEIVE';
  quantity: number;
  actor: string;
  note: string;
}

interface ReceptionProduct {
  id: string;
  sku: string;
  name: string;
  variant: string;
  category: ProductCategory;
  unit: string;
  branch: BranchCode;
  location: string;
  stock: number;
  reserved: number;
  minimum: number;
  target: number;
  monthlyUse: number;
  lot: string;
  expiry: string;
  lastCounted: string;
  movements: StockMovement[];
}

interface RestockReportItem {
  productId: string;
  name: string;
  stock: number;
  minimum: number;
  requested: number;
  unit: string;
}

interface RestockReport {
  id: string;
  createdAt: string;
  createdBy: string;
  branch: BranchCode;
  urgency: ReportUrgency;
  status: ReportStatus;
  note: string;
  items: RestockReportItem[];
}

interface ReceptionistProductsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  branchLocked?: boolean;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
}

const categoryMeta: Record<ProductCategory, { label: string; badge: string }> = {
  POLISH: { label: 'Sơn gel', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  CHEMICAL: { label: 'Hóa chất', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  CARE: { label: 'Chăm sóc', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  DISPOSABLE: { label: 'Tiêu hao', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  ACCESSORY: { label: 'Phụ kiện', badge: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
};

const healthMeta: Record<Exclude<StockHealth, 'ALL'>, { label: string; badge: string; dot: string }> = {
  OUT: {
    label: 'Đã hết',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
  LOW: {
    label: 'Sắp hết',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  EXPIRING: {
    label: 'Sắp hết hạn',
    badge: 'bg-orange-50 text-orange-700 ring-orange-200',
    dot: 'bg-orange-500',
  },
  OK: {
    label: 'Ổn định',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
};

const reportStatusMeta: Record<ReportStatus, { label: string; badge: string }> = {
  SENT: { label: 'Đã gửi', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  APPROVED: { label: 'Đã duyệt', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  FULFILLED: { label: 'Đã bổ sung', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const urgencyMeta: Record<ReportUrgency, { label: string; badge: string }> = {
  NORMAL: { label: 'Bình thường', badge: 'bg-slate-100 text-slate-700 ring-slate-200' },
  HIGH: { label: 'Ưu tiên cao', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  URGENT: { label: 'Khẩn cấp', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

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

const dateOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const displayDate = (value: string) => {
  if (!value) return 'Không có';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const displayDateTime = () =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

const daysUntil = (value: string) =>
  value
    ? Math.ceil((Date.parse(value) - Date.parse(localDateKey())) / 86_400_000)
    : 9999;

const getHealth = (product: ReceptionProduct): Exclude<StockHealth, 'ALL'> => {
  if (product.stock <= 0) return 'OUT';
  if (daysUntil(product.expiry) <= 45) return 'EXPIRING';
  if (product.stock <= product.minimum) return 'LOW';
  return 'OK';
};

const availableStock = (product: ReceptionProduct) => Math.max(0, product.stock - product.reserved);
const daysCover = (product: ReceptionProduct) =>
  product.monthlyUse > 0 ? Math.max(0, Math.round((availableStock(product) / product.monthlyUse) * 30)) : 999;
const suggestedOrder = (product: ReceptionProduct) => Math.max(0, product.target - product.stock);
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

const movement = (
  id: string,
  time: string,
  type: StockMovement['type'],
  quantity: number,
  actor: string,
  note: string,
): StockMovement => ({ id, time, type, quantity, actor, note });

const productSeed = (): ReceptionProduct[] => [
  {
    id: 'PRD-001',
    sku: 'GEL-NUDE-014',
    name: 'Sơn gel HEMA Free',
    variant: 'Nude Rose 14',
    category: 'POLISH',
    unit: 'chai',
    branch: 'Q3',
    location: 'Tủ màu A · Kệ 02',
    stock: 0,
    reserved: 0,
    minimum: 3,
    target: 10,
    monthlyUse: 8,
    lot: 'LOT-G2406',
    expiry: dateOffset(280),
    lastCounted: `${displayDate(localDateKey())} · 08:20`,
    movements: [
      movement('MOV-101', 'Hôm nay · 08:20', 'COUNT', -1, 'Lê Hoàng Nam', 'Kiểm kê đầu ca, xác nhận hết hàng'),
      movement('MOV-099', 'Hôm qua · 16:35', 'USE', -1, 'Thảo Nguyễn', 'Sử dụng cho lịch APT-2098'),
    ],
  },
  {
    id: 'PRD-002',
    sku: 'CHEM-ACE-500',
    name: 'Acetone chuyên dụng',
    variant: 'Can 500ml',
    category: 'CHEMICAL',
    unit: 'can',
    branch: 'Q3',
    location: 'Kho hóa chất · Kệ B1',
    stock: 2,
    reserved: 1,
    minimum: 4,
    target: 12,
    monthlyUse: 10,
    lot: 'ACE-2605',
    expiry: dateOffset(190),
    lastCounted: `${displayDate(localDateKey())} · 08:25`,
    movements: [
      movement('MOV-102', 'Hôm nay · 08:25', 'COUNT', 0, 'Lê Hoàng Nam', 'Khớp số lượng hệ thống'),
      movement('MOV-095', '21/07 · 17:20', 'USE', -1, 'Minh Châu', 'Bổ sung khu pedicure'),
    ],
  },
  {
    id: 'PRD-003',
    sku: 'CARE-OIL-030',
    name: 'Dầu dưỡng biểu bì',
    variant: 'Hương hoa hồng · 30ml',
    category: 'CARE',
    unit: 'chai',
    branch: 'Q3',
    location: 'Quầy dịch vụ · Ngăn 03',
    stock: 4,
    reserved: 2,
    minimum: 5,
    target: 16,
    monthlyUse: 14,
    lot: 'OIL-2604',
    expiry: dateOffset(320),
    lastCounted: '22/07/2026 · 18:05',
    movements: [movement('MOV-103', '22/07 · 18:05', 'COUNT', 0, 'Lê Hoàng Nam', 'Kiểm kê cuối ca')],
  },
  {
    id: 'PRD-004',
    sku: 'DIS-GLOVE-M',
    name: 'Găng tay Nitrile',
    variant: 'Size M · Hộp 100 chiếc',
    category: 'DISPOSABLE',
    unit: 'hộp',
    branch: 'Q3',
    location: 'Kho tiêu hao · Kệ C2',
    stock: 1,
    reserved: 0,
    minimum: 3,
    target: 10,
    monthlyUse: 9,
    lot: 'NIT-2607',
    expiry: dateOffset(760),
    lastCounted: '22/07/2026 · 18:08',
    movements: [movement('MOV-104', '22/07 · 18:08', 'USE', -1, 'Thuỳ Dương', 'Mở hộp mới cho ca chiều')],
  },
  {
    id: 'PRD-005',
    sku: 'ACC-STONE-S',
    name: 'Đá đính Nail Crystal',
    variant: 'Mix size · Silver',
    category: 'ACCESSORY',
    unit: 'hộp',
    branch: 'Q3',
    location: 'Tủ phụ kiện · Khay 06',
    stock: 7,
    reserved: 2,
    minimum: 3,
    target: 12,
    monthlyUse: 5,
    lot: 'CRY-2601',
    expiry: '',
    lastCounted: '20/07/2026 · 18:12',
    movements: [movement('MOV-105', '20/07 · 18:12', 'COUNT', 1, 'Lê Hoàng Nam', 'Điều chỉnh sau kiểm đếm')],
  },
  {
    id: 'PRD-006',
    sku: 'CHEM-PRIMER-015',
    name: 'Primer không acid',
    variant: '15ml',
    category: 'CHEMICAL',
    unit: 'chai',
    branch: 'Q3',
    location: 'Kho hóa chất · Kệ B2',
    stock: 6,
    reserved: 0,
    minimum: 2,
    target: 8,
    monthlyUse: 4,
    lot: 'PRI-2510',
    expiry: dateOffset(18),
    lastCounted: '21/07/2026 · 18:03',
    movements: [movement('MOV-106', '21/07 · 18:03', 'COUNT', 0, 'Lê Hoàng Nam', 'Phát hiện lô sắp hết hạn')],
  },
  {
    id: 'PRD-007',
    sku: 'GEL-TOP-015',
    name: 'Top Coat No Wipe',
    variant: 'Bóng cao · 15ml',
    category: 'POLISH',
    unit: 'chai',
    branch: 'Q3',
    location: 'Tủ kỹ thuật · Kệ A1',
    stock: 12,
    reserved: 2,
    minimum: 4,
    target: 14,
    monthlyUse: 8,
    lot: 'TOP-2603',
    expiry: dateOffset(250),
    lastCounted: '22/07/2026 · 18:15',
    movements: [movement('MOV-107', '22/07 · 18:15', 'COUNT', 0, 'Lê Hoàng Nam', 'Tồn kho ổn định')],
  },
  {
    id: 'PRD-008',
    sku: 'DIS-FILE-180',
    name: 'Dũa móng dùng một lần',
    variant: '180/240 grit',
    category: 'DISPOSABLE',
    unit: 'gói',
    branch: 'Q3',
    location: 'Kho tiêu hao · Kệ C1',
    stock: 18,
    reserved: 4,
    minimum: 8,
    target: 30,
    monthlyUse: 20,
    lot: 'FILE-2607',
    expiry: '',
    lastCounted: '22/07/2026 · 18:18',
    movements: [movement('MOV-108', '22/07 · 18:18', 'COUNT', 0, 'Lê Hoàng Nam', 'Khớp hệ thống')],
  },
  {
    id: 'PRD-011',
    sku: 'GEL-RED-021',
    name: 'Sơn gel Hàn Quốc',
    variant: 'Wine Red 21',
    category: 'POLISH',
    unit: 'chai',
    branch: 'Q1',
    location: 'Tủ màu A · Kệ 01',
    stock: 2,
    reserved: 0,
    minimum: 3,
    target: 10,
    monthlyUse: 7,
    lot: 'KR-2604',
    expiry: dateOffset(210),
    lastCounted: '22/07/2026 · 18:20',
    movements: [movement('MOV-111', '22/07 · 18:20', 'COUNT', 0, 'Mai Lan', 'Sắp chạm mức tối thiểu')],
  },
  {
    id: 'PRD-012',
    sku: 'CARE-CREAM-100',
    name: 'Kem dưỡng tay',
    variant: 'Không hương liệu · 100ml',
    category: 'CARE',
    unit: 'tuýp',
    branch: 'Q1',
    location: 'Quầy dịch vụ · Ngăn 02',
    stock: 0,
    reserved: 0,
    minimum: 2,
    target: 8,
    monthlyUse: 6,
    lot: 'CRM-2602',
    expiry: dateOffset(180),
    lastCounted: '22/07/2026 · 18:25',
    movements: [movement('MOV-112', '22/07 · 18:25', 'COUNT', -1, 'Mai Lan', 'Xác nhận hết hàng')],
  },
];

const reportSeed = (): RestockReport[] => [
  {
    id: 'RPT-260722-01',
    createdAt: '22/07/2026 · 18:30',
    createdBy: 'Lê Hoàng Nam',
    branch: 'Q3',
    urgency: 'HIGH',
    status: 'APPROVED',
    note: 'Ưu tiên bổ sung trước ca chiều ngày mai.',
    items: [
      { productId: 'PRD-002', name: 'Acetone chuyên dụng', stock: 2, minimum: 4, requested: 10, unit: 'can' },
      { productId: 'PRD-004', name: 'Găng tay Nitrile', stock: 1, minimum: 3, requested: 9, unit: 'hộp' },
    ],
  },
];

export default function ReceptionistProducts({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  branchLocked = true,
  tenantName = 'Nailé Studio',
  roleLabel = 'Receptionist',
  accessMode = 'full',
  readOnlyReason = '',
  onNotify,
}: ReceptionistProductsProps) {
  const productStorageKey = `receptionist-products-v1:${tenantName}`;
  const reportStorageKey = `receptionist-product-reports-v1:${tenantName}`;
  const assignedBranch: BranchCode = selectedBranch === 'Q1' ? 'Q1' : 'Q3';
  const canManage = accessMode === 'full' && !readOnlyReason;
  const [products, setProducts] = useState<ReceptionProduct[]>(() => {
    try {
      const stored = localStorage.getItem(productStorageKey);
      return stored ? (JSON.parse(stored) as ReceptionProduct[]) : productSeed();
    } catch {
      return productSeed();
    }
  });
  const [reports, setReports] = useState<RestockReport[]>(() => {
    try {
      const stored = localStorage.getItem(reportStorageKey);
      return stored ? (JSON.parse(stored) as RestockReport[]) : reportSeed();
    } catch {
      return reportSeed();
    }
  });
  const [healthFilter, setHealthFilter] = useState<StockHealth>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ProductCategory>('ALL');
  const [selected, setSelected] = useState<ReceptionProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState<{ urgency: ReportUrgency; note: string }>({
    urgency: 'HIGH',
    note: '',
  });
  const [countProduct, setCountProduct] = useState<ReceptionProduct | null>(null);
  const [countForm, setCountForm] = useState({ actual: '', reason: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    localStorage.setItem(productStorageKey, JSON.stringify(products));
  }, [productStorageKey, products]);

  useEffect(() => {
    localStorage.setItem(reportStorageKey, JSON.stringify(reports));
  }, [reportStorageKey, reports]);

  useEffect(() => {
    if (!selected && !reportOpen && !countProduct) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setReportOpen(false);
        setCountProduct(null);
      }
    };
    addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', close);
    };
  }, [countProduct, reportOpen, selected]);

  const scoped = useMemo(
    () => products.filter((product) => product.branch === assignedBranch),
    [assignedBranch, products],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scoped
      .filter((product) => healthFilter === 'ALL' || getHealth(product) === healthFilter)
      .filter((product) => categoryFilter === 'ALL' || product.category === categoryFilter)
      .filter(
        (product) =>
          !query ||
          `${product.name} ${product.variant} ${product.sku} ${product.location} ${product.lot}`
            .toLowerCase()
            .includes(query),
      )
      .sort((a, b) => {
        const priority: Record<Exclude<StockHealth, 'ALL'>, number> = {
          OUT: 0,
          EXPIRING: 1,
          LOW: 2,
          OK: 3,
        };
        return priority[getHealth(a)] - priority[getHealth(b)] || a.name.localeCompare(b.name, 'vi');
      });
  }, [categoryFilter, healthFilter, scoped, searchQuery]);

  const branchReports = reports.filter((report) => report.branch === assignedBranch);
  const outProducts = scoped.filter((product) => product.stock <= 0);
  const lowProducts = scoped.filter((product) => product.stock > 0 && product.stock <= product.minimum);
  const expiringProducts = scoped.filter(
    (product) => product.stock > 0 && daysUntil(product.expiry) <= 45,
  );
  const urgentIds = scoped
    .filter((product) => ['OUT', 'LOW', 'EXPIRING'].includes(getHealth(product)))
    .map((product) => product.id);

  const toggleSelected = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((item) => item !== productId)
        : [...current, productId],
    );
  };

  const openReport = (ids = selectedIds) => {
    if (!canManage) {
      onNotify?.(readOnlyReason || 'Bạn chỉ được xem tồn kho.');
      return;
    }
    const usableIds = ids.filter((id) => scoped.some((product) => product.id === id));
    if (!usableIds.length) {
      onNotify?.('Hãy chọn ít nhất một sản phẩm cần báo cáo.');
      return;
    }
    setSelectedIds(usableIds);
    setReportForm({
      urgency: usableIds.some((id) => scoped.find((product) => product.id === id)?.stock === 0)
        ? 'URGENT'
        : 'HIGH',
      note: '',
    });
    setFormError('');
    setReportOpen(true);
  };

  const submitReport = (event: FormEvent) => {
    event.preventDefault();
    const items = scoped
      .filter((product) => selectedIds.includes(product.id))
      .map((product) => ({
        productId: product.id,
        name: product.name,
        stock: product.stock,
        minimum: product.minimum,
        requested: suggestedOrder(product),
        unit: product.unit,
      }))
      .filter((item) => item.requested > 0 || item.stock <= item.minimum);
    if (!items.length) {
      setFormError('Các sản phẩm đã chọn chưa cần bổ sung.');
      return;
    }
    const report: RestockReport = {
      id: makeId('RPT'),
      createdAt: displayDateTime(),
      createdBy: roleLabel.split('·')[1]?.trim() || 'Lễ tân',
      branch: assignedBranch,
      urgency: reportForm.urgency,
      status: 'SENT',
      note: reportForm.note.trim() || 'Đề nghị kiểm tra và bổ sung theo mức tồn mục tiêu.',
      items,
    };
    setReports((current) => [report, ...current]);
    setSelectedIds([]);
    setReportOpen(false);
    onNotify?.(`Đã gửi báo cáo ${report.id} gồm ${items.length} sản phẩm.`);
  };

  const openCount = (product: ReceptionProduct) => {
    if (!canManage) {
      onNotify?.(readOnlyReason || 'Bạn chỉ được xem tồn kho.');
      return;
    }
    setCountProduct(product);
    setCountForm({ actual: String(product.stock), reason: '' });
    setFormError('');
    setSelected(null);
  };

  const submitCount = (event: FormEvent) => {
    event.preventDefault();
    if (!countProduct) return;
    const actual = Number(countForm.actual);
    if (!Number.isInteger(actual) || actual < 0) {
      setFormError('Số lượng thực tế phải là số nguyên từ 0 trở lên.');
      return;
    }
    if (actual !== countProduct.stock && !countForm.reason.trim()) {
      setFormError('Vui lòng nhập lý do khi số lượng kiểm kê có chênh lệch.');
      return;
    }
    const difference = actual - countProduct.stock;
    setProducts((current) =>
      current.map((product) =>
        product.id === countProduct.id && product.branch === countProduct.branch
          ? {
              ...product,
              stock: actual,
              lastCounted: `${displayDate(localDateKey())} · ${new Intl.DateTimeFormat('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date())}`,
              movements: [
                {
                  id: makeId('MOV'),
                  time: `Hôm nay · ${new Intl.DateTimeFormat('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(new Date())}`,
                  type: 'COUNT',
                  quantity: difference,
                  actor: roleLabel.split('·')[1]?.trim() || 'Lễ tân',
                  note:
                    countForm.reason.trim() ||
                    (difference === 0 ? 'Kiểm kê khớp hệ thống' : 'Điều chỉnh sau kiểm kê'),
                },
                ...product.movements,
              ],
            }
          : product,
      ),
    );
    setCountProduct(null);
    onNotify?.(
      difference === 0
        ? `Đã xác nhận tồn kho ${countProduct.name} khớp hệ thống.`
        : `Đã cập nhật ${countProduct.name}: ${difference > 0 ? '+' : ''}${difference} ${countProduct.unit}.`,
    );
  };

  const updateReportStatus = (report: RestockReport, status: ReportStatus) => {
    setReports((current) =>
      current.map((item) => (item.id === report.id ? { ...item, status } : item)),
    );
    onNotify?.(
      status === 'FULFILLED'
        ? `Đã xác nhận báo cáo ${report.id} được bổ sung.`
        : `Đã cập nhật trạng thái báo cáo ${report.id}.`,
    );
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#172554] via-[#1e3a8a] to-[#075985] p-5 text-white shadow-[0_20px_55px_rgba(30,58,138,0.24)] sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-72 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-blue-100">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_0_5px_rgba(103,232,249,0.12)]" />
              Kiểm soát tại quầy · Chi nhánh {assignedBranch === 'Q3' ? 'Quận 3' : 'Quận 1'}
              <span className="text-white/30">•</span>
              <span className="normal-case tracking-normal text-white/65">{tenantName}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              Sản phẩm & cảnh báo tồn kho
            </h1>
            <p className="mt-2 max-w-2xl text-[10px] leading-5 text-blue-50/75">
              Phát hiện sản phẩm sắp hết, đã hết hoặc gần hết hạn; kiểm kê tại quầy và gửi báo cáo
              bổ sung cho quản lý.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(urgentIds)}
              className="flex h-11 items-center gap-2 border border-white/20 bg-white/10 px-4 text-[9px] font-black text-white shadow-sm backdrop-blur"
            >
              <CheckCircle2 className="h-4 w-4" />
              Chọn tất cả cảnh báo
            </button>
            <button
              type="button"
              onClick={() => openReport(selectedIds.length ? selectedIds : urgentIds)}
              disabled={!canManage || (!selectedIds.length && !urgentIds.length)}
              className="flex h-11 items-center gap-2 border border-white bg-white px-4 text-[9px] font-black text-blue-900 shadow-lg disabled:opacity-50"
            >
              <FileBarChart className="h-4 w-4" />
              Tạo báo cáo bổ sung
            </button>
          </div>
        </div>
        <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
          {[
            { icon: AlertTriangle, label: 'Cảnh báo theo mức tồn', text: 'So với ngưỡng tối thiểu' },
            { icon: ClipboardCheck, label: 'Kiểm kê có nhật ký', text: 'Lưu chênh lệch và người thao tác' },
            { icon: Send, label: 'Báo cáo cho quản lý', text: 'Gợi ý số lượng cần bổ sung' },
          ].map(({ icon: Icon, label, text }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-100">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[8px] font-black text-white">{label}</p>
                <p className="mt-1 text-[7px] text-blue-50/60">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-slate-800">Quyền thao tác: {roleLabel}</p>
            <p className="mt-1 text-[8px] leading-4 text-slate-500">
              Lễ tân được xem tồn kho, ghi nhận kiểm kê và gửi báo cáo bổ sung tại chi nhánh được
              phân công; không được sửa mức tồn, giá vốn, nhà cung cấp hoặc tự nhập hàng.
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[8px] font-black text-blue-700 ring-1 ring-blue-200">
          <Store className="mr-1 inline h-3 w-3" />
          {branchLocked ? 'Chi nhánh đã khóa' : 'Theo chi nhánh'}
        </span>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Đã hết hàng',
            value: outProducts.length,
            detail: 'Cần báo cáo ngay để tránh gián đoạn',
            icon: PackageOpen,
            tone: 'bg-rose-50 text-rose-600',
          },
          {
            label: 'Sắp hết',
            value: lowProducts.length,
            detail: 'Tồn kho bằng hoặc dưới mức tối thiểu',
            icon: ShoppingCart,
            tone: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Sắp hết hạn',
            value: expiringProducts.length,
            detail: 'Còn không quá 45 ngày sử dụng',
            icon: CalendarClock,
            tone: 'bg-orange-50 text-orange-700',
          },
          {
            label: 'Báo cáo đang mở',
            value: branchReports.filter((report) => report.status !== 'FULFILLED').length,
            detail: `${branchReports.filter((report) => report.status === 'APPROVED').length} báo cáo đã được duyệt`,
            icon: FileBarChart,
            tone: 'bg-blue-50 text-blue-600',
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-[430px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Tìm tên, SKU, lô hàng hoặc vị trí..."
              aria-label="Tìm kiếm sản phẩm"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-[10px] font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as 'ALL' | ProductCategory)
              }
              className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              aria-label="Lọc nhóm sản phẩm"
            >
              <option value="ALL">Tất cả nhóm sản phẩm</option>
              {Object.entries(categoryMeta).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </BeautifulSelect>
            <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[8px] font-black text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              Chi nhánh {assignedBranch === 'Q3' ? 'Quận 3' : 'Quận 1'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          {(['ALL', 'OUT', 'LOW', 'EXPIRING', 'OK'] as const).map((value) => {
            const count =
              value === 'ALL' ? scoped.length : scoped.filter((item) => getHealth(item) === value).length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setHealthFilter(value)}
                className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${
                  healthFilter === value
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {value === 'ALL' ? 'Tất cả sản phẩm' : healthMeta[value].label}
                <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wide text-slate-400">
                <th className="w-12 px-5 py-3">
                  <span className="sr-only">Chọn</span>
                </th>
                <th className="px-3 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Tồn khả dụng</th>
                <th className="px-4 py-3">Mức kiểm soát</th>
                <th className="px-4 py-3">Lô & hạn dùng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const health = getHealth(product);
                const checked = selectedIds.includes(product.id);
                return (
                  <tr
                    key={`${product.id}-${product.branch}`}
                    className="cursor-pointer text-[9px] text-slate-600 hover:bg-blue-50/30"
                    onClick={() => setSelected(product)}
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`Chọn ${product.name} để báo cáo`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelected(product.id);
                        }}
                        className={`flex h-5 min-h-5 w-5 items-center justify-center rounded-md border p-0 shadow-none ${
                          checked
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            health === 'OUT'
                              ? 'bg-rose-50 text-rose-600'
                              : health === 'LOW'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <Boxes className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900">{product.name}</p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {product.variant} · {product.sku}
                          </p>
                          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${categoryMeta[product.category].badge}`}>
                            {categoryMeta[product.category].label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p
                        className={`text-[13px] font-black ${
                          health === 'OUT'
                            ? 'text-rose-600'
                            : health === 'LOW'
                              ? 'text-amber-600'
                              : 'text-slate-900'
                        }`}
                      >
                        {availableStock(product)} {product.unit}
                      </p>
                      <p className="mt-1 text-[8px] text-slate-400">
                        Thực tế {product.stock}
                        {product.reserved ? ` · Giữ trước ${product.reserved}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-800">
                        Tối thiểu {product.minimum} · Mục tiêu {product.target}
                      </p>
                      <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            health === 'OUT'
                              ? 'bg-rose-500'
                              : health === 'LOW'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (product.stock / product.target) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[7px] text-slate-400">
                        Ước tính dùng {daysCover(product) >= 999 ? 'không xác định' : `${daysCover(product)} ngày`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-700">{product.lot || 'Không quản lý lô'}</p>
                      <p
                        className={`mt-1 text-[8px] ${
                          health === 'EXPIRING' ? 'font-black text-orange-700' : 'text-slate-400'
                        }`}
                      >
                        {product.expiry
                          ? `HSD ${displayDate(product.expiry)}`
                          : 'Không có hạn sử dụng'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${healthMeta[health].badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${healthMeta[health].dot}`} />
                        {healthMeta[health].label}
                      </span>
                      <p className="mt-2 text-[7px] text-slate-400">{product.location}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCount(product);
                          }}
                          disabled={!canManage}
                          className="flex h-9 items-center gap-1.5 border border-blue-200 bg-blue-50 px-3 text-[8px] font-black text-blue-700 shadow-sm disabled:opacity-50"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Kiểm kê
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(product);
                          }}
                          className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                          aria-label={`Xem ${product.name}`}
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
          {filtered.map((product) => {
            const health = getHealth(product);
            const checked = selectedIds.includes(product.id);
            return (
              <article key={`${product.id}-${product.branch}`} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleSelected(product.id)}
                    className={`mt-1 flex h-6 min-h-6 w-6 shrink-0 items-center justify-center rounded-md border p-0 ${
                      checked
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                    aria-label={`Chọn ${product.name}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(product)}
                    className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-left shadow-none"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-black text-slate-900">
                          {product.name}
                        </span>
                        <span className="mt-1 block truncate text-[8px] text-slate-400">
                          {product.variant} · {product.sku}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${healthMeta[health].badge}`}>
                        {healthMeta[health].label}
                      </span>
                      <span
                        className={`text-[10px] font-black ${
                          health === 'OUT'
                            ? 'text-rose-600'
                            : health === 'LOW'
                              ? 'text-amber-600'
                              : 'text-slate-800'
                        }`}
                      >
                        {availableStock(product)} {product.unit}
                      </span>
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="py-16 text-center">
            <PackageCheck className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-[10px] font-black text-slate-600">Không có sản phẩm phù hợp</p>
            <p className="mt-1 text-[8px] text-slate-400">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[8px] text-slate-400">
            Hiển thị <strong className="text-slate-600">{filtered.length}</strong> sản phẩm · Đã chọn{' '}
            <strong className="text-blue-600">{selectedIds.length}</strong>
          </p>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => openReport()}
              className="flex w-fit items-center gap-2 border border-blue-600 bg-blue-600 px-3 text-[8px] font-black text-white shadow-sm"
            >
              <FileBarChart className="h-3.5 w-3.5" />
              Báo cáo {selectedIds.length} sản phẩm
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <BarChart3 className="h-4 w-4" />
              <p className="text-[9px] font-black uppercase tracking-[0.12em]">Theo dõi báo cáo</p>
            </div>
            <h2 className="mt-1 text-base font-black text-slate-900">Yêu cầu bổ sung gần đây</h2>
            <p className="mt-1 text-[8px] text-slate-400">
              Trạng thái báo cáo được theo dõi đến khi sản phẩm đã về chi nhánh.
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-[8px] font-black text-slate-600">
            {branchReports.length} báo cáo
          </span>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {branchReports.slice(0, 4).map((report) => (
            <article key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black text-slate-900">{report.id}</span>
                    <span className={`rounded-full px-2 py-1 text-[7px] font-black ring-1 ${urgencyMeta[report.urgency].badge}`}>
                      {urgencyMeta[report.urgency].label}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[7px] font-black ring-1 ${reportStatusMeta[report.status].badge}`}>
                      {reportStatusMeta[report.status].label}
                    </span>
                  </div>
                  <p className="mt-2 text-[8px] text-slate-400">
                    {report.createdAt} · {report.createdBy}
                  </p>
                </div>
                <FileBarChart className="h-4 w-4 shrink-0 text-blue-500" />
              </div>
              <div className="mt-3 space-y-2">
                {report.items.slice(0, 3).map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <p className="truncate text-[8px] font-bold text-slate-700">{item.name}</p>
                    <p className="shrink-0 text-[8px] font-black text-blue-700">
                      +{item.requested} {item.unit}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[8px] leading-4 text-slate-500">{report.note}</p>
              {report.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => updateReportStatus(report, 'FULFILLED')}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 text-[8px] font-black text-emerald-700 shadow-sm"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Xác nhận đã nhận đủ hàng
                </button>
              )}
            </article>
          ))}
          {!branchReports.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center xl:col-span-2">
              <FileBarChart className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-[9px] font-black text-slate-600">Chưa có báo cáo bổ sung</p>
            </div>
          )}
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng chi tiết sản phẩm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <Boxes className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-wide text-blue-600">
                        {selected.sku}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[7px] font-black ring-1 ${healthMeta[getHealth(selected)].badge}`}>
                        {healthMeta[getHealth(selected)].label}
                      </span>
                    </div>
                    <h2 id="product-detail-title" className="mt-2 text-lg font-black text-slate-950">
                      {selected.name}
                    </h2>
                    <p className="mt-1 text-[9px] text-slate-500">{selected.variant}</p>
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
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Tồn thực tế', value: `${selected.stock} ${selected.unit}` },
                  { label: 'Đã giữ trước', value: `${selected.reserved} ${selected.unit}` },
                  { label: 'Tối thiểu', value: `${selected.minimum} ${selected.unit}` },
                  { label: 'Cần bổ sung', value: `${suggestedOrder(selected)} ${selected.unit}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[7px] font-bold text-slate-400">{item.label}</p>
                    <p className="mt-1.5 text-[10px] font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </section>

              {getHealth(selected) !== 'OK' && (
                <section className={`rounded-2xl border p-4 ${getHealth(selected) === 'OUT' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${getHealth(selected) === 'OUT' ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div>
                      <p className="text-[9px] font-black text-slate-800">
                        {getHealth(selected) === 'OUT'
                          ? 'Sản phẩm đã hết – cần xử lý ngay'
                          : getHealth(selected) === 'EXPIRING'
                            ? `Lô hàng còn ${Math.max(0, daysUntil(selected.expiry))} ngày sử dụng`
                            : `Tồn kho chỉ đủ khoảng ${daysCover(selected)} ngày`}
                      </p>
                      <p className="mt-1 text-[8px] leading-4 text-slate-500">
                        Đề xuất bổ sung {suggestedOrder(selected)} {selected.unit} để đạt mức mục tiêu.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[9px] font-black text-slate-800">Thông tin kiểm soát</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { label: 'Nhóm sản phẩm', value: categoryMeta[selected.category].label },
                    { label: 'Vị trí lưu', value: selected.location },
                    { label: 'Mã lô', value: selected.lot || 'Không quản lý' },
                    {
                      label: 'Hạn sử dụng',
                      value: selected.expiry ? displayDate(selected.expiry) : 'Không áp dụng',
                    },
                    { label: 'Dùng trung bình', value: `${selected.monthlyUse} ${selected.unit}/tháng` },
                    { label: 'Kiểm kê gần nhất', value: selected.lastCounted },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[7px] text-slate-400">{item.label}</p>
                      <p className="mt-1 text-[8px] font-black text-slate-700">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-[9px] font-black text-slate-800">Nhật ký tồn kho</p>
                    <p className="mt-1 text-[8px] text-slate-400">Theo dõi sử dụng và kiểm kê gần nhất</p>
                  </div>
                  <History className="h-4 w-4 text-blue-500" />
                </div>
                <div className="divide-y divide-slate-100">
                  {selected.movements.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.type === 'COUNT' ? 'bg-blue-500' : item.type === 'RECEIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[8px] font-black text-slate-700">
                            {item.type === 'COUNT' ? 'Kiểm kê' : item.type === 'RECEIVE' ? 'Nhập hàng' : 'Sử dụng'}
                            {item.quantity !== 0 ? ` · ${item.quantity > 0 ? '+' : ''}${item.quantity}` : ''}
                          </p>
                          <p className="text-[7px] text-slate-400">{item.time}</p>
                        </div>
                        <p className="mt-1 text-[8px] leading-4 text-slate-500">{item.note}</p>
                        <p className="mt-1 text-[7px] font-bold text-slate-400">{item.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="flex items-center gap-1.5 text-[8px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Lễ tân không thể sửa mức tồn mục tiêu
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openCount(selected)}
                  className="flex h-10 items-center gap-2 border border-blue-200 bg-blue-50 px-4 text-[8px] font-black text-blue-700 shadow-sm"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Kiểm kê
                </button>
                {getHealth(selected) !== 'OK' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      openReport([selected.id]);
                    }}
                    className="flex h-10 items-center gap-2 border border-blue-700 bg-blue-600 px-4 text-[8px] font-black text-white shadow-sm"
                  >
                    <FileBarChart className="h-3.5 w-3.5" />
                    Tạo báo cáo
                  </button>
                )}
              </div>
            </footer>
          </aside>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setReportOpen(false)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng báo cáo"
          />
          <form onSubmit={submitReport} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-blue-600">Báo cáo bổ sung</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Gửi yêu cầu cho quản lý</h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Hệ thống tự tính số lượng cần bổ sung đến mức tồn mục tiêu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-4 p-5 sm:p-6">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-[9px] font-black text-slate-800">Danh sách đề nghị</p>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[7px] font-black text-blue-700">
                    {selectedIds.length} sản phẩm
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {scoped
                    .filter((product) => selectedIds.includes(product.id))
                    .map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-[9px] font-black text-slate-700">{product.name}</p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            Tồn {product.stock} · Tối thiểu {product.minimum} · Mục tiêu {product.target}
                          </p>
                        </div>
                        <p className="shrink-0 text-[9px] font-black text-blue-700">
                          +{suggestedOrder(product)} {product.unit}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mức độ ưu tiên</span>
                <BeautifulSelect
                  value={reportForm.urgency}
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      urgency: event.target.value as ReportUrgency,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                  aria-label="Mức độ ưu tiên báo cáo"
                >
                  <option value="NORMAL">Bình thường</option>
                  <option value="HIGH">Ưu tiên cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ghi chú cho quản lý</span>
                <textarea
                  value={reportForm.note}
                  onChange={(event) =>
                    setReportForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Ví dụ: cần trước ca chiều, sản phẩm thay thế tạm thời..."
                  className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
            <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-blue-700 bg-blue-600 px-5 text-[9px] font-black text-white shadow-lg shadow-blue-200"
              >
                <Send className="h-4 w-4" />
                Gửi báo cáo
              </button>
            </footer>
          </form>
        </div>
      )}

      {countProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setCountProduct(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-label="Đóng kiểm kê"
          />
          <form onSubmit={submitCount} className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-blue-600">Kiểm kê tại quầy</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">{countProduct.name}</h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Hệ thống đang ghi nhận {countProduct.stock} {countProduct.unit}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCountProduct(null)}
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Số lượng thực tế ({countProduct.unit}) *
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={countForm.actual}
                  onChange={(event) =>
                    setCountForm((current) => ({ ...current, actual: event.target.value }))
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-black outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Lý do chênh lệch
                </span>
                <textarea
                  value={countForm.reason}
                  onChange={(event) =>
                    setCountForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Bắt buộc khi số thực tế khác hệ thống..."
                  className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-[8px] leading-4 text-blue-700">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Thao tác chỉ điều chỉnh số lượng thực tế và được lưu trong nhật ký. Lễ tân không
                thể thay đổi mức tồn tối thiểu hoặc mục tiêu.
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setCountProduct(null)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-blue-700 bg-blue-600 px-5 text-[9px] font-black text-white shadow-sm"
              >
                <ClipboardCheck className="h-4 w-4" />
                Lưu kiểm kê
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
