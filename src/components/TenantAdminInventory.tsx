import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRightLeft,
  Barcode,
  Boxes,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  Filter,
  FlaskConical,
  History,
  LayoutGrid,
  LayoutList,
  MapPin,
  PackageCheck,
  PackageOpen,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Truck,
  Warehouse,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type BranchCode = 'Q1' | 'Q3';
type InventoryCategory = 'GEL_POLISH' | 'BUILDER' | 'CHEMICAL' | 'ACCESSORY' | 'DISPOSABLE' | 'SANITATION';
type ItemState = 'ACTIVE' | 'QUARANTINE' | 'DISCONTINUED';
type StockHealth = 'OK' | 'LOW' | 'OUT' | 'EXPIRING' | 'QUARANTINE';
type ViewMode = 'TABLE' | 'CARDS';
type StockAction = 'RECEIVE' | 'COUNT' | 'TRANSFER';

interface Movement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  quantity: number;
  occurredAt: string;
  actor: string;
  reference: string;
  note: string;
}

interface InventoryItem {
  id: string;
  name: string;
  variant: string;
  category: InventoryCategory;
  unit: string;
  branch: BranchCode;
  location: string;
  supplier: string;
  supplierPhone: string;
  stock: number;
  reserved: number;
  minimum: number;
  maximum: number;
  unitCost: number;
  averageCost: number;
  monthlyUse: number;
  lot: string;
  expiry: string;
  barcode: string;
  lastCounted: string;
  reorderLeadDays: number;
  state: ItemState;
  note: string;
  movements: Movement[];
}

interface TenantAdminInventoryProps {
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

interface StockForm {
  action: StockAction;
  itemKey: string;
  receiveLines: ReceiveLine[];
  addItemKey: string;
  quantity: string;
  targetBranch: BranchCode;
  unitCost: string;
  lot: string;
  expiry: string;
  reference: string;
  reason: string;
}

interface ReceiveLine {
  itemKey: string;
  quantity: string;
  unitCost: string;
  lot: string;
  expiry: string;
  locked: boolean;
}

interface ItemForm {
  id: string;
  name: string;
  variant: string;
  category: InventoryCategory;
  unit: string;
  branch: BranchCode;
  location: string;
  supplier: string;
  supplierPhone: string;
  stock: string;
  minimum: string;
  maximum: string;
  unitCost: string;
  lot: string;
  expiry: string;
  barcode: string;
  reorderLeadDays: string;
  note: string;
}

const TODAY = '2026-07-20';
const branchLabels: Record<BranchCode, string> = { Q1: 'Quận 1', Q3: 'Quận 3' };
const categoryMeta: Record<InventoryCategory, { label: string; badge: string }> = {
  GEL_POLISH: { label: 'Sơn gel', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  BUILDER: { label: 'Bột & gel đắp', badge: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
  CHEMICAL: { label: 'Hóa chất', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ACCESSORY: { label: 'Phụ kiện', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
  DISPOSABLE: { label: 'Tiêu hao', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  SANITATION: { label: 'Vệ sinh & an toàn', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
};
const healthMeta: Record<StockHealth, { label: string; badge: string; dot: string }> = {
  OK: { label: 'Ổn định', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  LOW: { label: 'Sắp hết', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  OUT: { label: 'Hết hàng', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  EXPIRING: { label: 'Sắp hết hạn', badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  QUARANTINE: { label: 'Cách ly', badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-500' }
};

const itemKey = (item: Pick<InventoryItem, 'id' | 'branch'>) => `${item.id}::${item.branch}`;
const money = (value: number) => `${Math.round(value).toLocaleString('vi-VN')}đ`;
const daysUntil = (date: string) => date ? Math.ceil((Date.parse(date) - Date.parse(TODAY)) / 86_400_000) : 9999;
const getHealth = (item: InventoryItem): StockHealth => {
  if (item.state === 'QUARANTINE') return 'QUARANTINE';
  if (item.stock <= 0) return 'OUT';
  if (daysUntil(item.expiry) <= 60) return 'EXPIRING';
  if (item.stock <= item.minimum) return 'LOW';
  return 'OK';
};
const daysCover = (item: InventoryItem) => item.monthlyUse > 0 ? Math.round(item.stock / item.monthlyUse * 30) : 999;
const movementSeed = (id: string, quantity: number, reference: string, note: string): Movement[] => [
  { id: `${id}-M1`, type: 'OUT', quantity: -Math.max(1, Math.round(quantity / 8)), occurredAt: '20/07/2026 · 09:18', actor: 'Hà My', reference: 'PX-260720-08', note: 'Xuất dùng cho ca sáng.' },
  { id: `${id}-M2`, type: 'IN', quantity, occurredAt: '16/07/2026 · 14:32', actor: 'Minh Châu', reference, note }
];

const inventorySeed: InventoryItem[] = [
  { id: 'SKU-DND-751', name: 'DND Gel 751 – Merlot', variant: 'Đỏ rượu · 18ml', category: 'GEL_POLISH', unit: 'chai', branch: 'Q3', location: 'Kệ G-02', supplier: 'DND Việt Nam', supplierPhone: '028 7300 7510', stock: 3, reserved: 1, minimum: 12, maximum: 30, unitCost: 275_000, averageCost: 268_000, monthlyUse: 8, lot: 'LOT-D751-0626', expiry: '2028-06-30', barcode: '8936123457518', lastCounted: '18/07/2026 · Khớp', reorderLeadDays: 4, state: 'ACTIVE', note: 'Màu bán chạy; ưu tiên bổ sung trước cuối tuần.', movements: movementSeed('DND751', 12, 'PN-260716-14', 'Nhập từ đơn PO-0626-118.') },
  { id: 'SKU-OPI-BB', name: 'OPI Bubble Bath', variant: 'Nude hồng · 15ml', category: 'GEL_POLISH', unit: 'chai', branch: 'Q1', location: 'Kệ G-01', supplier: 'OPI Việt Nam', supplierPhone: '028 3822 1188', stock: 5, reserved: 2, minimum: 15, maximum: 36, unitCost: 390_000, averageCost: 382_000, monthlyUse: 12, lot: 'LOT-OPI-0526', expiry: '2028-05-31', barcode: '619828092056', lastCounted: '18/07/2026 · Lệch -1', reorderLeadDays: 5, state: 'ACTIVE', note: 'Đã tạo đề xuất nhập bổ sung 15 chai.', movements: movementSeed('OPIBB', 15, 'PN-260714-09', 'Nhập hàng định kỳ tháng 7.') },
  { id: 'SKU-APEX-CLEAR', name: 'Apex Gel Clear 50ml', variant: 'Gel đắp trong', category: 'BUILDER', unit: 'hũ', branch: 'Q3', location: 'Kệ A-03', supplier: 'NailPro Supply', supplierPhone: '0908 778 215', stock: 8, reserved: 1, minimum: 6, maximum: 18, unitCost: 520_000, averageCost: 510_000, monthlyUse: 5, lot: 'APX-0626', expiry: '2027-06-30', barcode: '8936100550082', lastCounted: '19/07/2026 · Khớp', reorderLeadDays: 7, state: 'ACTIVE', note: 'Bảo quản dưới 30°C, tránh ánh sáng trực tiếp.', movements: movementSeed('APEX', 6, 'PN-260712-04', 'Nhập bổ sung theo định mức.') },
  { id: 'SKU-ACETONE-5L', name: 'Acetone tinh khiết 5L', variant: 'Can 5 lít', category: 'CHEMICAL', unit: 'can', branch: 'Q3', location: 'Tủ HC-01', supplier: 'VietChem', supplierPhone: '028 3765 8820', stock: 2, reserved: 0, minimum: 4, maximum: 10, unitCost: 620_000, averageCost: 610_000, monthlyUse: 4, lot: 'ACT-0526', expiry: '2029-05-31', barcode: '8936021550500', lastCounted: '19/07/2026 · Khớp', reorderLeadDays: 3, state: 'ACTIVE', note: 'Hóa chất dễ cháy; lưu trong tủ chuyên dụng có khóa.', movements: movementSeed('ACT', 4, 'PN-260710-02', 'Nhập theo định mức an toàn.') },
  { id: 'SKU-CHARM-CRY', name: 'Charm Crystal Mix', variant: 'Luxury Collection 2026', category: 'ACCESSORY', unit: 'viên', branch: 'Q1', location: 'Hộp C-12', supplier: 'Crystal Nail', supplierPhone: '0932 114 668', stock: 148, reserved: 24, minimum: 80, maximum: 300, unitCost: 20_000, averageCost: 19_200, monthlyUse: 62, lot: 'CRY-0426', expiry: '', barcode: '8936882140124', lastCounted: '17/07/2026 · Lệch -2', reorderLeadDays: 10, state: 'ACTIVE', note: 'Kiểm kê theo khay; ghi nhận hao hụt theo từng mẫu.', movements: movementSeed('CHARM', 100, 'PN-260708-11', 'Nhập bộ sưu tập Luxury 2026.') },
  { id: 'SKU-GLOVE-M', name: 'Găng tay nitrile size M', variant: 'Hộp 100 chiếc', category: 'DISPOSABLE', unit: 'hộp', branch: 'Q1', location: 'Kho T-04', supplier: 'MedCare Supply', supplierPhone: '028 3999 2077', stock: 0, reserved: 0, minimum: 8, maximum: 24, unitCost: 165_000, averageCost: 158_000, monthlyUse: 10, lot: 'GLV-0726', expiry: '2029-07-31', barcode: '8936033000105', lastCounted: '20/07/2026 · Khớp', reorderLeadDays: 2, state: 'ACTIVE', note: 'Đơn bổ sung PO-0720-03 đang chờ giao trước 17:00.', movements: movementSeed('GLOVE', 8, 'PN-260705-03', 'Nhập vật tư tiêu hao đầu tháng.') },
  { id: 'SKU-DISINF-1L', name: 'Dung dịch khử khuẩn dụng cụ', variant: 'Chai 1 lít', category: 'SANITATION', unit: 'chai', branch: 'Q3', location: 'Tủ VS-02', supplier: 'CleanPro', supplierPhone: '0903 660 281', stock: 6, reserved: 0, minimum: 5, maximum: 16, unitCost: 210_000, averageCost: 205_000, monthlyUse: 5, lot: 'DSP-1125', expiry: '2026-08-28', barcode: '8936114200109', lastCounted: '19/07/2026 · Khớp', reorderLeadDays: 4, state: 'ACTIVE', note: 'Lô sắp hết hạn; ưu tiên sử dụng trước theo FEFO.', movements: movementSeed('DISINF', 8, 'PN-260701-02', 'Nhập vật tư vệ sinh tháng 7.') },
  { id: 'SKU-PRIMER-15', name: 'Acid-free Primer 15ml', variant: 'Lớp liên kết không acid', category: 'BUILDER', unit: 'chai', branch: 'Q1', location: 'Kệ A-02', supplier: 'NailPro Supply', supplierPhone: '0908 778 215', stock: 9, reserved: 1, minimum: 5, maximum: 18, unitCost: 285_000, averageCost: 278_000, monthlyUse: 4, lot: 'PRI-0326', expiry: '2026-09-05', barcode: '8936100150152', lastCounted: '18/07/2026 · Khớp', reorderLeadDays: 7, state: 'QUARANTINE', note: 'Cách ly để kiểm tra độ kết dính của lô PRI-0326.', movements: movementSeed('PRIMER', 6, 'PN-260630-06', 'Nhập theo yêu cầu kỹ thuật.') }
];

const receiveLineFromItem = (item: InventoryItem, locked = false): ReceiveLine => ({ itemKey: itemKey(item), quantity: '', unitCost: String(item.unitCost), lot: item.lot, expiry: item.expiry, locked });
const emptyStockForm = (key = ''): StockForm => ({ action: 'RECEIVE', itemKey: key, receiveLines: [], addItemKey: '', quantity: '', targetBranch: 'Q1', unitCost: '', lot: '', expiry: '', reference: '', reason: '' });
const emptyItemForm = (branch: string): ItemForm => ({ id: '', name: '', variant: '', category: 'GEL_POLISH', unit: 'chai', branch: branch === 'Q1' ? 'Q1' : 'Q3', location: '', supplier: '', supplierPhone: '', stock: '0', minimum: '1', maximum: '10', unitCost: '', lot: '', expiry: '', barcode: '', reorderLeadDays: '5', note: '' });
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';

export default function TenantAdminInventory({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Nailé Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason,
  onNotify
}: TenantAdminInventoryProps) {
  const storageKey = `tenant-admin-inventory-v1:${tenantName}`;
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return Array.isArray(parsed) && parsed.length ? parsed : inventorySeed;
    } catch {
      return inventorySeed;
    }
  });
  const [category, setCategory] = useState<'ALL' | InventoryCategory>('ALL');
  const [health, setHealth] = useState<'ALL' | StockHealth>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [stockForm, setStockForm] = useState<StockForm | null>(null);
  const [receiveForm, setReceiveForm] = useState<StockForm | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* Storage is optional. */ }
  }, [items, storageKey]);

  const canManage = accessMode === 'full';
  const requireManage = () => {
    if (canManage) return true;
    const message = readOnlyReason || 'Tài khoản hiện chỉ có quyền xem dữ liệu kho.';
    setNotice(message);
    onNotify?.(message);
    return false;
  };
  const scopedItems = useMemo(() => items.filter((item) => selectedBranch === 'ALL' || item.branch === selectedBranch), [items, selectedBranch]);
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedItems
      .filter((item) => category === 'ALL' || item.category === category)
      .filter((item) => health === 'ALL' || getHealth(item) === health)
      .filter((item) => !query || `${item.id} ${item.name} ${item.variant} ${item.supplier} ${item.location} ${item.lot}`.toLowerCase().includes(query))
      .sort((a, b) => {
        const order: Record<StockHealth, number> = { OUT: 0, QUARANTINE: 1, EXPIRING: 2, LOW: 3, OK: 4 };
        return order[getHealth(a)] - order[getHealth(b)] || a.name.localeCompare(b.name, 'vi');
      });
  }, [category, health, scopedItems, searchQuery]);
  const selectedItem = selectedKey ? items.find((item) => itemKey(item) === selectedKey) || null : null;
  const inventoryValue = scopedItems.reduce((sum, item) => sum + item.stock * item.averageCost, 0);
  const lowCount = scopedItems.filter((item) => ['LOW', 'OUT'].includes(getHealth(item))).length;
  const expiringCount = scopedItems.filter((item) => getHealth(item) === 'EXPIRING').length;
  const varianceCount = scopedItems.filter((item) => item.lastCounted.includes('Lệch')).length;

  const openStockAction = (action: StockAction, item?: InventoryItem) => {
    if (!requireManage()) return;
    const initial = emptyStockForm(item ? itemKey(item) : '');
    initial.action = action;
    initial.targetBranch = item?.branch === 'Q1' ? 'Q3' : 'Q1';
    initial.unitCost = item ? String(item.unitCost) : '';
    initial.lot = item?.lot || '';
    initial.expiry = item?.expiry || '';
    initial.receiveLines = action === 'RECEIVE' && item ? [receiveLineFromItem(item, true)] : [];
    if (action === 'RECEIVE') {
      setReceiveForm(initial);
      setStockForm(null);
      setFormError('');
      return;
    }
    setStockForm(initial);
    setFormError('');
  };

  const submitStockAction = (event: FormEvent) => {
    event.preventDefault();
    if (!stockForm || !requireManage()) return;
    if (stockForm.action === 'RECEIVE') {
      if (!stockForm.receiveLines.length) { setFormError('Vui lòng thêm ít nhất một vật tư vào phiếu nhập.'); return; }
      const invalidLine = stockForm.receiveLines.find((line) => !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0);
      if (invalidLine) { setFormError('Số lượng nhập của mỗi vật tư phải lớn hơn 0.'); return; }
      const now = '20/07/2026 · 15:08';
      const reference = stockForm.reference.trim() || `PN-260720-${String(Date.now()).slice(-3)}`;
      setItems((current) => current.map((item) => {
        const line = stockForm.receiveLines.find((candidate) => candidate.itemKey === itemKey(item));
        if (!line) return item;
        const quantity = Number(line.quantity);
        const movement: Movement = { id: `${reference}-${item.id}-${item.movements.length + 1}`, type: 'IN', quantity, occurredAt: now, actor: roleLabel, reference, note: stockForm.reason.trim() || 'Nhập nhiều vật tư từ trung tâm kho.' };
        return { ...item, stock: item.stock + quantity, unitCost: Number(line.unitCost) || item.unitCost, averageCost: Number(line.unitCost) || item.averageCost, lot: line.lot.trim() || item.lot, expiry: line.expiry || item.expiry, movements: [movement, ...item.movements] };
      }));
      const totalQuantity = stockForm.receiveLines.reduce((sum, line) => sum + Number(line.quantity), 0);
      const success = `Đã nhập ${stockForm.receiveLines.length} vật tư, tổng ${totalQuantity} đơn vị.`;
      setNotice(success);
      onNotify?.(success);
      setStockForm(null);
      return;
    }
    const source = items.find((item) => itemKey(item) === stockForm.itemKey);
    const quantity = Number(stockForm.quantity);
    if (!source) { setFormError('Vui lòng chọn một mã vật tư.'); return; }
    if (!Number.isFinite(quantity) || quantity < 0 || (stockForm.action !== 'COUNT' && quantity <= 0)) { setFormError('Số lượng không hợp lệ.'); return; }
    if (stockForm.action === 'TRANSFER' && stockForm.targetBranch === source.branch) { setFormError('Chi nhánh nhận phải khác chi nhánh đang giữ hàng.'); return; }
    if (stockForm.action === 'TRANSFER' && quantity > source.stock) { setFormError(`Chỉ có thể điều chuyển tối đa ${source.stock} ${source.unit}.`); return; }
    const now = '20/07/2026 · 15:08';
    const reference = stockForm.reference.trim() || `${stockForm.action === 'TRANSFER' ? 'DC' : 'KK'}-260720-${String(Date.now()).slice(-3)}`;
    setItems((current) => {
      let next = current.map((item) => {
        if (itemKey(item) !== stockForm.itemKey) return item;
        const delta = stockForm.action === 'COUNT' ? quantity - item.stock : stockForm.action === 'TRANSFER' ? -quantity : quantity;
        const movement: Movement = { id: `${reference}-${item.movements.length + 1}`, type: stockForm.action === 'RECEIVE' ? 'IN' : stockForm.action === 'TRANSFER' ? 'TRANSFER' : 'ADJUST', quantity: delta, occurredAt: now, actor: roleLabel, reference, note: stockForm.reason.trim() || 'Cập nhật từ trung tâm kho.' };
        return { ...item, stock: Math.max(0, item.stock + delta), unitCost: stockForm.action === 'RECEIVE' ? Number(stockForm.unitCost) || item.unitCost : item.unitCost, averageCost: stockForm.action === 'RECEIVE' ? Number(stockForm.unitCost) || item.averageCost : item.averageCost, lot: stockForm.action === 'RECEIVE' ? stockForm.lot.trim() || item.lot : item.lot, expiry: stockForm.action === 'RECEIVE' ? stockForm.expiry || item.expiry : item.expiry, lastCounted: stockForm.action === 'COUNT' ? `${now} · ${delta === 0 ? 'Khớp' : `Lệch ${delta > 0 ? '+' : ''}${delta}`}` : item.lastCounted, movements: [movement, ...item.movements] };
      });
      if (stockForm.action === 'TRANSFER') {
        const targetIndex = next.findIndex((item) => item.id === source.id && item.branch === stockForm.targetBranch);
        const movement: Movement = { id: `${reference}-IN`, type: 'TRANSFER', quantity, occurredAt: now, actor: roleLabel, reference, note: `Nhận điều chuyển từ ${branchLabels[source.branch]}.` };
        if (targetIndex >= 0) next[targetIndex] = { ...next[targetIndex], stock: next[targetIndex].stock + quantity, movements: [movement, ...next[targetIndex].movements] };
        else next = [{ ...source, branch: stockForm.targetBranch, stock: quantity, reserved: 0, location: 'Chờ xếp vị trí', movements: [movement] }, ...next];
      }
      return next;
    });
    const success = stockForm.action === 'TRANSFER' ? `Đã điều chuyển ${quantity} ${source.unit} sang ${branchLabels[stockForm.targetBranch]}.` : `Đã chốt tồn thực tế ${quantity} ${source.unit}.`;
    setNotice(success);
    onNotify?.(success);
    setStockForm(null);
  };

  const submitReceiveForm = (event: FormEvent) => {
    event.preventDefault();
    if (!receiveForm || !requireManage()) return;
    if (!receiveForm.receiveLines.length) { setFormError('Vui lòng thêm ít nhất một vật tư vào phiếu nhập.'); return; }
    if (receiveForm.receiveLines.some((line) => !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) { setFormError('Số lượng nhập của mỗi vật tư phải lớn hơn 0.'); return; }
    const now = '20/07/2026 · 15:08';
    const reference = receiveForm.reference.trim() || `PN-260720-${String(Date.now()).slice(-3)}`;
    setItems((current) => current.map((item) => {
      const line = receiveForm.receiveLines.find((candidate) => candidate.itemKey === itemKey(item));
      if (!line) return item;
      const quantity = Number(line.quantity);
      const movement: Movement = { id: `${reference}-${item.id}-${item.movements.length + 1}`, type: 'IN', quantity, occurredAt: now, actor: roleLabel, reference, note: receiveForm.reason.trim() || 'Nhập nhiều vật tư từ trung tâm kho.' };
      return { ...item, stock: item.stock + quantity, unitCost: Number(line.unitCost) || item.unitCost, averageCost: Number(line.unitCost) || item.averageCost, lot: line.lot.trim() || item.lot, expiry: line.expiry || item.expiry, movements: [movement, ...item.movements] };
    }));
    const totalQuantity = receiveForm.receiveLines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const success = `Đã nhập ${receiveForm.receiveLines.length} vật tư, tổng ${totalQuantity} đơn vị.`;
    setNotice(success);
    onNotify?.(success);
    setReceiveForm(null);
  };

  const submitNewItem = (event: FormEvent) => {
    event.preventDefault();
    if (!itemForm || !requireManage()) return;
    if (!itemForm.id.trim() || !itemForm.name.trim() || !itemForm.location.trim() || !itemForm.supplier.trim()) { setFormError('Vui lòng nhập SKU, tên vật tư, vị trí lưu và nhà cung cấp.'); return; }
    const id = itemForm.id.trim().toUpperCase();
    if (items.some((item) => item.id === id && item.branch === itemForm.branch)) { setFormError(`SKU ${id} đã tồn tại tại ${branchLabels[itemForm.branch]}.`); return; }
    if (Number(itemForm.maximum) < Number(itemForm.minimum)) { setFormError('Định mức tối đa phải lớn hơn hoặc bằng định mức tối thiểu.'); return; }
    const stock = Math.max(0, Number(itemForm.stock) || 0);
    const unitCost = Math.max(0, Number(itemForm.unitCost) || 0);
    const created: InventoryItem = { id, name: itemForm.name.trim(), variant: itemForm.variant.trim(), category: itemForm.category, unit: itemForm.unit.trim() || 'đơn vị', branch: itemForm.branch, location: itemForm.location.trim(), supplier: itemForm.supplier.trim(), supplierPhone: itemForm.supplierPhone.trim(), stock, reserved: 0, minimum: Math.max(0, Number(itemForm.minimum) || 0), maximum: Math.max(1, Number(itemForm.maximum) || 1), unitCost, averageCost: unitCost, monthlyUse: 0, lot: itemForm.lot.trim(), expiry: itemForm.expiry, barcode: itemForm.barcode.trim(), lastCounted: 'Chưa kiểm kê', reorderLeadDays: Math.max(0, Number(itemForm.reorderLeadDays) || 0), state: 'ACTIVE', note: itemForm.note.trim(), movements: stock ? [{ id: `OPEN-${id}`, type: 'IN', quantity: stock, occurredAt: '20/07/2026 · 15:08', actor: roleLabel, reference: 'OPENING-STOCK', note: 'Tồn đầu khi tạo mã vật tư.' }] : [] };
    setItems((current) => [created, ...current]);
    setSelectedKey(itemKey(created));
    setItemForm(null);
    setNotice(`Đã tạo mã vật tư ${id}.`);
  };

  const exportInventory = () => {
    if (!requireManage()) return;
    const rows = filteredItems.map((item) => [item.id, item.name, branchLabels[item.branch], categoryMeta[item.category].label, item.stock, item.reserved, item.unit, item.minimum, item.maximum, item.averageCost, item.stock * item.averageCost, item.lot, item.expiry, healthMeta[getHealth(item)].label].join(','));
    const blob = new Blob([`SKU,Tên,Chi nhánh,Nhóm,Tồn,Đã giữ,Đơn vị,Tối thiểu,Tối đa,Giá vốn,Giá trị,Lô,Hạn dùng,Trạng thái\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bao-cao-kho-vat-tu.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const resetFilters = () => { setCategory('ALL'); setHealth('ALL'); onSearchQueryChange(''); };

  return (
    <div className="space-y-5">
      {notice && <div className="fixed right-4 top-24 z-[90] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><p className="text-[9px] font-bold text-slate-700">{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo" className="ml-2 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button></div>}

      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Dữ liệu kho {tenantName} cập nhật lúc 15:08</div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Kho vật tư</h1><p className="mt-2 text-[11px] text-slate-500">Kiểm soát tồn kho, lô–hạn dùng, nhập xuất, điều chuyển và kiểm kê vật tư nail.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} aria-label="Chọn chi nhánh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-48"><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option><option value="ALL">Tất cả chi nhánh</option></BeautifulSelect><button type="button" onClick={exportInventory} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Xuất báo cáo</button><button type="button" onClick={() => { if (!requireManage()) return; setItemForm(emptyItemForm(selectedBranch)); setFormError(''); }} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-700 shadow-sm disabled:opacity-50"><Plus className="h-4 w-4" />Thêm mã</button><button type="button" onClick={() => openStockAction('RECEIVE')} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><ArrowDownToLine className="h-4 w-4" />Nhập kho</button></div>
      </section>

      <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? 'border-violet-200 bg-violet-50/70' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4.5 w-4.5" /></span><div><p className="text-[9px] font-black text-slate-800">Phạm vi quyền: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{canManage ? 'Có quyền tạo SKU, nhập kho, kiểm kê, điều chuyển và xuất báo cáo trong phạm vi tenant.' : readOnlyReason || 'Bạn được xem tồn kho và lịch sử nhưng không thể tạo giao dịch.'}</p></div></div><span className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? 'bg-white text-violet-700 ring-violet-200' : 'bg-white text-amber-700 ring-amber-200'}`}>{canManage ? 'Toàn quyền kho' : 'Chỉ xem'}</span></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'Giá trị tồn kho', value: `${(inventoryValue / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`, detail: `${scopedItems.length} mã tại phạm vi đã chọn`, icon: Warehouse, tone: 'bg-blue-50 text-blue-600' },
        { label: 'Cần bổ sung', value: String(lowCount), detail: `${scopedItems.filter((item) => getHealth(item) === 'OUT').length} mã đã hết hàng`, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
        { label: 'Lô cần xử lý', value: String(expiringCount), detail: 'Hết hạn trong vòng 60 ngày', icon: CalendarClock, tone: 'bg-rose-50 text-rose-600' },
        { label: 'Lệch kiểm kê', value: String(varianceCount), detail: 'Cần xác nhận nguyên nhân', icon: ClipboardCheck, tone: 'bg-violet-50 text-violet-600' }
      ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p></article>)}</section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Cảnh báo cần ưu tiên</h2><p className="mt-1 text-[8px] text-slate-400">Sắp xếp theo mức ảnh hưởng vận hành</p></div><AlertTriangle className="h-4.5 w-4.5 text-amber-500" /></div><div className="mt-4 grid gap-3 md:grid-cols-3">{[
          { title: 'Hết hàng', value: scopedItems.filter((item) => getHealth(item) === 'OUT').length, detail: 'Có thể chặn lịch hẹn', tone: 'border-rose-200 bg-rose-50 text-rose-700', action: 'OUT' as StockHealth },
          { title: 'Dưới định mức', value: scopedItems.filter((item) => getHealth(item) === 'LOW').length, detail: 'Nên tạo đề xuất nhập', tone: 'border-amber-200 bg-amber-50 text-amber-700', action: 'LOW' as StockHealth },
          { title: 'Sắp hết hạn', value: expiringCount, detail: 'Ưu tiên xuất theo FEFO', tone: 'border-orange-200 bg-orange-50 text-orange-700', action: 'EXPIRING' as StockHealth }
        ].map((item) => <button key={item.title} type="button" onClick={() => { setHealth(item.action); setShowFilters(true); }} className={`h-auto min-h-24 border p-4 text-left shadow-none ${item.tone}`}><p className="text-[8px] font-black uppercase tracking-wide">{item.title}</p><p className="mt-2 text-2xl font-black">{item.value}</p><p className="mt-1 text-[8px] opacity-75">{item.detail}</p></button>)}</div></article>
        <article className="rounded-2xl bg-gradient-to-br from-[#19152e] to-[#292148] p-5 text-white shadow-xl shadow-violet-950/10"><div className="flex items-start justify-between"><div><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-violet-300">Sức khỏe kho</p><p className="mt-2 text-xl font-black">92,4% giao dịch khớp</p></div><PackageCheck className="h-5 w-5 text-violet-300" /></div><div className="mt-4 space-y-3 text-[8px]"><div className="flex justify-between"><span className="text-slate-400">Vòng quay tồn kho</span><strong>4,2 lần/năm</strong></div><div className="flex justify-between"><span className="text-slate-400">Tỷ lệ hao hụt</span><strong>0,8%</strong></div><div className="flex justify-between"><span className="text-slate-400">Đơn nhập đang chờ</span><strong>4 đơn · 18,6 triệu</strong></div></div><button type="button" onClick={() => openStockAction('COUNT')} disabled={!canManage} className="mt-5 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/10 text-[8px] font-black text-white shadow-none disabled:opacity-50"><ClipboardCheck className="h-3.5 w-3.5" />Bắt đầu kiểm kê</button></article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm SKU, tên, lô, nhà cung cấp hoặc vị trí..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowFilters((value) => !value)} className={`flex h-10 items-center gap-2 border px-3 text-[8px] font-bold shadow-sm ${showFilters || category !== 'ALL' || health !== 'ALL' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}><Filter className="h-3.5 w-3.5" />Bộ lọc</button><div className="flex items-center rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setViewMode('TABLE')} aria-label="Xem bảng" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'TABLE' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutList className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setViewMode('CARDS')} aria-label="Xem thẻ" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'CARDS' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /></button></div></div></div>
        {showFilters && <div className="grid gap-3 border-b border-slate-100 bg-violet-50/40 p-4 sm:grid-cols-[1fr_1fr_auto]"><label><span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">Nhóm vật tư</span><BeautifulSelect value={category} onChange={(event) => setCategory(event.target.value as 'ALL' | InventoryCategory)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả nhóm</option>{Object.entries(categoryMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">Tình trạng kho</span><BeautifulSelect value={health} onChange={(event) => setHealth(event.target.value as 'ALL' | StockHealth)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả trạng thái</option>{Object.entries(healthMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><button type="button" onClick={resetFilters} className="self-end border border-slate-200 bg-white px-4 text-[8px] font-bold text-slate-600 shadow-sm">Đặt lại</button></div>}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">{(['ALL', 'LOW', 'OUT', 'EXPIRING', 'QUARANTINE'] as const).map((value) => <button key={value} type="button" onClick={() => setHealth(value)} className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-2 text-[8px] font-bold shadow-none ${health === value ? 'text-violet-700' : 'text-slate-500'}`}>{value === 'ALL' ? 'Tất cả' : healthMeta[value].label}<span className={`rounded-full px-1.5 py-0.5 ${health === value ? 'bg-violet-100' : 'bg-slate-100'}`}>{value === 'ALL' ? scopedItems.length : scopedItems.filter((item) => getHealth(item) === value).length}</span></button>)}<span className="ml-auto text-[8px] text-slate-400">{filteredItems.length} mã phù hợp</span></div>

        {viewMode === 'TABLE' ? <div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[8px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Vật tư</th><th className="px-4 py-3">Nhóm & nhà cung cấp</th><th className="px-4 py-3">Tồn khả dụng</th><th className="px-4 py-3">Định mức</th><th className="px-4 py-3">Lô & hạn dùng</th><th className="px-4 py-3">Giá trị</th><th className="px-4 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredItems.map((item) => { const currentHealth = getHealth(item); const percent = Math.min(100, item.maximum ? item.stock / item.maximum * 100 : 0); return <tr key={itemKey(item)} className="text-[9px] text-slate-600 hover:bg-slate-50/70"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${categoryMeta[item.category].badge}`}><PackageOpen className="h-4 w-4" /></span><div className="min-w-0"><p className="font-black text-slate-800">{item.name}</p><p className="mt-1 max-w-60 truncate text-[8px] text-slate-400">{item.id} · {item.variant} · {item.location}</p></div></div></td><td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${categoryMeta[item.category].badge}`}>{categoryMeta[item.category].label}</span><p className="mt-1.5 text-[8px] text-slate-400">{item.supplier}</p></td><td className="px-4 py-3.5"><p className="font-black text-slate-800">{Math.max(0, item.stock - item.reserved)} / {item.stock} {item.unit}</p><p className="mt-1 text-[8px] text-slate-400">Đã giữ {item.reserved} · đủ {daysCover(item)} ngày</p></td><td className="px-4 py-3.5"><p className="font-black text-slate-800">Min {item.minimum} · Max {item.maximum}</p><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${currentHealth === 'OK' ? 'bg-emerald-500' : currentHealth === 'LOW' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${percent}%` }} /></div></td><td className="px-4 py-3.5"><p className="font-black text-slate-800">{item.lot || 'Không theo lô'}</p><p className={`mt-1 text-[8px] ${daysUntil(item.expiry) <= 60 ? 'font-bold text-orange-600' : 'text-slate-400'}`}>{item.expiry ? `HSD ${new Date(item.expiry).toLocaleDateString('vi-VN')}` : 'Không có hạn dùng'}</p></td><td className="px-4 py-3.5"><p className="font-black text-slate-800">{money(item.stock * item.averageCost)}</p><p className="mt-1 text-[8px] text-slate-400">{money(item.averageCost)}/{item.unit}</p></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${healthMeta[currentHealth].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${healthMeta[currentHealth].dot}`} />{healthMeta[currentHealth].label}</span><p className="mt-1.5 text-[7px] text-slate-400">{branchLabels[item.branch]}</p></td><td className="px-5 py-3.5 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedKey(itemKey(item))} className="border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm">Chi tiết</button><button type="button" onClick={() => openStockAction('RECEIVE', item)} disabled={!canManage} aria-label={`Nhập thêm ${item.name}`} className="flex h-9 w-9 items-center justify-center border border-violet-200 bg-violet-50 p-0 text-violet-700 shadow-sm disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button></div></td></tr>; })}</tbody></table>{!filteredItems.length && <div className="px-6 py-14 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không tìm thấy vật tư phù hợp</p><button type="button" onClick={resetFilters} className="mt-2 border-0 bg-transparent px-2 text-[9px] font-bold text-violet-600 shadow-none">Xóa tìm kiếm và bộ lọc</button></div>}</div> : <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{filteredItems.map((item) => { const currentHealth = getHealth(item); return <button key={itemKey(item)} type="button" onClick={() => setSelectedKey(itemKey(item))} className="h-auto min-h-60 border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-200 hover:shadow-md"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryMeta[item.category].badge}`}><PackageOpen className="h-4.5 w-4.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black text-slate-800">{item.name}</p><p className="mt-1 text-[8px] text-slate-400">{item.id} · {branchLabels[item.branch]}</p></div><span className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${healthMeta[currentHealth].badge}`}>{healthMeta[currentHealth].label}</span></div><p className="mt-4 line-clamp-2 text-[8px] leading-4 text-slate-500">{item.variant} · {item.supplier} · {item.location}</p><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3"><div><p className="text-[7px] text-slate-400">Tồn kho</p><p className="mt-1 text-[10px] font-black text-slate-800">{item.stock} {item.unit}</p></div><div><p className="text-[7px] text-slate-400">Khả dụng</p><p className="mt-1 text-[10px] font-black text-violet-700">{Math.max(0, item.stock - item.reserved)}</p></div><div><p className="text-[7px] text-slate-400">Giá trị</p><p className="mt-1 truncate text-[9px] font-black text-emerald-700">{money(item.stock * item.averageCost)}</p></div></div><div className="mt-4 flex items-center justify-between text-[8px] text-slate-400"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span><span>{daysCover(item)} ngày sử dụng</span></div></button>; })}</div>}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[8px] text-slate-400">Hiển thị <strong className="text-slate-600">{filteredItems.length}</strong> mã · Tồn kho tính theo giá vốn bình quân</p><p className="flex items-center gap-1.5 text-[8px] text-slate-400"><Store className="h-3.5 w-3.5" />{selectedBranch === 'ALL' ? 'Tất cả chi nhánh' : `Chi nhánh ${branchLabels[selectedBranch as BranchCode]}`}</p></div>
      </section>

      {selectedItem && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"><button type="button" aria-label="Đóng chi tiết vật tư" onClick={() => setSelectedKey(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><aside className="relative flex h-full w-full max-w-[540px] flex-col overflow-hidden bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${categoryMeta[selectedItem.category].badge}`}><Boxes className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black text-slate-900">{selectedItem.name}</h2><span className={`rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${healthMeta[getHealth(selectedItem)].badge}`}>{healthMeta[getHealth(selectedItem)].label}</span></div><p className="mt-1 text-[8px] text-slate-400">{selectedItem.id} · {selectedItem.variant}</p></div></div><button type="button" onClick={() => setSelectedKey(null)} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"><div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-300">Tồn kho tại {branchLabels[selectedItem.branch]}</p><p className="mt-2 text-3xl font-black">{selectedItem.stock} <span className="text-sm text-slate-400">{selectedItem.unit}</span></p><p className="mt-2 text-[8px] text-slate-400">Khả dụng {Math.max(0, selectedItem.stock - selectedItem.reserved)} · Đã giữ {selectedItem.reserved} · Đủ khoảng {daysCover(selectedItem)} ngày</p></div><Warehouse className="h-6 w-6 text-violet-300" /></div><div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-[7px] text-slate-500">Giá vốn TB</p><p className="mt-1 text-[10px] font-black">{money(selectedItem.averageCost)}</p></div><div><p className="text-[7px] text-slate-500">Giá trị tồn</p><p className="mt-1 text-[10px] font-black text-emerald-300">{money(selectedItem.stock * selectedItem.averageCost)}</p></div><div><p className="text-[7px] text-slate-500">Dùng 30 ngày</p><p className="mt-1 text-[10px] font-black">{selectedItem.monthlyUse} {selectedItem.unit}</p></div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase text-slate-400">Vị trí & định mức</p><div className="mt-3 space-y-2 text-[8px]"><div className="flex justify-between"><span className="text-slate-400">Vị trí</span><strong>{selectedItem.location}</strong></div><div className="flex justify-between"><span className="text-slate-400">Tối thiểu / tối đa</span><strong>{selectedItem.minimum} / {selectedItem.maximum}</strong></div><div className="flex justify-between"><span className="text-slate-400">Lead time nhập</span><strong>{selectedItem.reorderLeadDays} ngày</strong></div><div className="flex justify-between"><span className="text-slate-400">Kiểm kê gần nhất</span><strong>{selectedItem.lastCounted}</strong></div></div></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase text-slate-400">Lô & truy xuất</p><div className="mt-3 space-y-2 text-[8px]"><div className="flex justify-between"><span className="text-slate-400">Mã lô</span><strong>{selectedItem.lot || 'Không theo lô'}</strong></div><div className="flex justify-between"><span className="text-slate-400">Hạn dùng</span><strong>{selectedItem.expiry ? new Date(selectedItem.expiry).toLocaleDateString('vi-VN') : 'Không áp dụng'}</strong></div><div className="flex justify-between"><span className="text-slate-400">Barcode</span><strong>{selectedItem.barcode || 'Chưa có'}</strong></div><div className="flex justify-between"><span className="text-slate-400">Nguyên tắc xuất</span><strong>{selectedItem.expiry ? 'FEFO' : 'FIFO'}</strong></div></div></div></div><div className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 text-violet-500" /><div><p className="text-[9px] font-black text-slate-800">{selectedItem.supplier}</p><p className="mt-1 text-[8px] text-slate-400">{selectedItem.supplierPhone || 'Chưa có số liên hệ'} · Giá nhập gần nhất {money(selectedItem.unitCost)}/{selectedItem.unit}</p></div></div></div><div className={`mt-5 rounded-2xl p-4 ${getHealth(selectedItem) === 'EXPIRING' ? 'bg-orange-50' : getHealth(selectedItem) === 'QUARANTINE' ? 'bg-slate-100' : 'bg-violet-50'}`}><p className="text-[8px] font-black uppercase tracking-wide text-slate-500">Lưu ý kiểm soát</p><p className="mt-2 text-[9px] leading-5 text-slate-700">{selectedItem.note || 'Chưa có lưu ý cho mã vật tư này.'}</p></div><div className="mt-5"><div className="flex items-center justify-between"><div><h3 className="text-[10px] font-black text-slate-800">Lịch sử giao dịch</h3><p className="mt-1 text-[8px] text-slate-400">Nhập, xuất, điều chuyển và điều chỉnh gần nhất</p></div><History className="h-4 w-4 text-violet-500" /></div><div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">{selectedItem.movements.length ? selectedItem.movements.slice(0, 8).map((movement) => <div key={movement.id} className="flex items-start gap-3 p-3.5"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${movement.quantity >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{movement.type === 'TRANSFER' ? <ArrowRightLeft className="h-3.5 w-3.5" /> : movement.quantity >= 0 ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <RefreshCcw className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="text-[9px] font-black text-slate-700">{movement.quantity > 0 ? '+' : ''}{movement.quantity} {selectedItem.unit}</p><span className="shrink-0 text-[7px] text-slate-400">{movement.occurredAt}</span></div><p className="mt-1 text-[8px] text-slate-500">{movement.reference} · {movement.actor}</p><p className="mt-1 text-[7px] leading-4 text-slate-400">{movement.note}</p></div></div>) : <div className="p-6 text-center text-[8px] text-slate-400">Chưa có giao dịch.</div>}</div></div></div><footer className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6"><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => openStockAction('RECEIVE', selectedItem)} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-3 text-[8px] font-black text-emerald-700 shadow-sm disabled:opacity-50"><ArrowDownToLine className="h-3.5 w-3.5" />Nhập</button><button type="button" onClick={() => openStockAction('COUNT', selectedItem)} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-[8px] font-black text-slate-700 shadow-sm disabled:opacity-50"><ClipboardCheck className="h-3.5 w-3.5" />Kiểm kê</button><button type="button" onClick={() => openStockAction('TRANSFER', selectedItem)} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-3 text-[8px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><ArrowRightLeft className="h-3.5 w-3.5" />Điều chuyển</button></div></footer></aside></div>}

      {stockForm && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu giao dịch kho" onClick={() => setStockForm(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitStockAction} className="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Giao dịch kho</p><h2 className="mt-1 text-lg font-black text-slate-900">{stockForm.action === 'RECEIVE' ? 'Tạo phiếu nhập kho' : stockForm.action === 'TRANSFER' ? 'Điều chuyển vật tư' : 'Chốt kiểm kê thực tế'}</h2><p className="mt-1 text-[9px] text-slate-500">Mọi thay đổi được lưu người thao tác, thời gian và chứng từ.</p></div><button type="button" onClick={() => setStockForm(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="space-y-4 p-5 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700">{formError}</div>}<label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã vật tư *</span><BeautifulSelect value={stockForm.itemKey} onChange={(event) => { const item = items.find((candidate) => itemKey(candidate) === event.target.value); setStockForm((current) => current ? { ...current, itemKey: event.target.value, unitCost: item ? String(item.unitCost) : '', lot: item?.lot || '', expiry: item?.expiry || '', targetBranch: item?.branch === 'Q1' ? 'Q3' : 'Q1' } : current); }} className={inputClass}><option value="">Chọn SKU</option>{scopedItems.map((item) => <option key={itemKey(item)} value={itemKey(item)}>{item.id} · {item.name} · {branchLabels[item.branch]}</option>)}</BeautifulSelect></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">{stockForm.action === 'COUNT' ? 'Tồn thực tế *' : 'Số lượng *'}</span><input type="number" min="0" step="1" value={stockForm.quantity} onChange={(event) => setStockForm((current) => current ? { ...current, quantity: event.target.value } : current)} className={inputClass} /></label>{stockForm.action === 'TRANSFER' ? <label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh nhận *</span><BeautifulSelect value={stockForm.targetBranch} onChange={(event) => setStockForm((current) => current ? { ...current, targetBranch: event.target.value as BranchCode } : current)} className={inputClass}><option value="Q1">Chi nhánh Quận 1</option><option value="Q3">Chi nhánh Quận 3</option></BeautifulSelect></label> : <label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã chứng từ</span><input value={stockForm.reference} onChange={(event) => setStockForm((current) => current ? { ...current, reference: event.target.value } : current)} className={inputClass} placeholder="Tự tạo nếu để trống" /></label>}</div>{stockForm.action === 'RECEIVE' && <div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Đơn giá nhập</span><input type="number" min="0" value={stockForm.unitCost} onChange={(event) => setStockForm((current) => current ? { ...current, unitCost: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã lô</span><input value={stockForm.lot} onChange={(event) => setStockForm((current) => current ? { ...current, lot: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Hạn dùng</span><input type="date" value={stockForm.expiry} onChange={(event) => setStockForm((current) => current ? { ...current, expiry: event.target.value } : current)} className={inputClass} /></label></div>}<label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Lý do / ghi chú</span><textarea value={stockForm.reason} onChange={(event) => setStockForm((current) => current ? { ...current, reason: event.target.value } : current)} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Số PO, kết quả kiểm đếm hoặc lý do điều chuyển..." /></label><div className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-[8px] leading-4 text-violet-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Giao dịch được ghi vào lịch sử kho và gắn với quyền {roleLabel}.</div></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setStockForm(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><CheckCircle2 className="h-4 w-4" />Xác nhận giao dịch</button></footer></form></div>}

      {itemForm && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu mã vật tư" onClick={() => setItemForm(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitNewItem} className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Danh mục vật tư</p><h2 className="mt-1 text-lg font-black text-slate-900">Thêm mã vật tư mới</h2><p className="mt-1 text-[9px] text-slate-500">Thiết lập nhận diện, định mức, nhà cung cấp và truy xuất lô.</p></div><button type="button" onClick={() => setItemForm(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="space-y-5 p-5 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700">{formError}</div>}<fieldset><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><Barcode className="h-4 w-4 text-violet-600" />Nhận diện vật tư</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">SKU *</span><input value={itemForm.id} onChange={(event) => setItemForm((current) => current ? { ...current, id: event.target.value } : current)} className={inputClass} placeholder="SKU-GEL-001" /></label><label className="lg:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tên vật tư *</span><input value={itemForm.name} onChange={(event) => setItemForm((current) => current ? { ...current, name: event.target.value } : current)} className={inputClass} placeholder="Tên sản phẩm hoặc vật tư" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nhóm</span><BeautifulSelect value={itemForm.category} onChange={(event) => setItemForm((current) => current ? { ...current, category: event.target.value as InventoryCategory } : current)} className={inputClass}>{Object.entries(categoryMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Biến thể / quy cách</span><input value={itemForm.variant} onChange={(event) => setItemForm((current) => current ? { ...current, variant: event.target.value } : current)} className={inputClass} placeholder="Màu, dung tích, quy cách" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Barcode</span><input value={itemForm.barcode} onChange={(event) => setItemForm((current) => current ? { ...current, barcode: event.target.value } : current)} className={inputClass} /></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><Warehouse className="h-4 w-4 text-emerald-600" />Tồn kho & định mức</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Chi nhánh</span><BeautifulSelect value={itemForm.branch} onChange={(event) => setItemForm((current) => current ? { ...current, branch: event.target.value as BranchCode } : current)} className={inputClass}><option value="Q1">Quận 1</option><option value="Q3">Quận 3</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Vị trí lưu *</span><input value={itemForm.location} onChange={(event) => setItemForm((current) => current ? { ...current, location: event.target.value } : current)} className={inputClass} placeholder="Kệ / tủ / ngăn" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Đơn vị</span><input value={itemForm.unit} onChange={(event) => setItemForm((current) => current ? { ...current, unit: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tồn đầu</span><input type="number" min="0" value={itemForm.stock} onChange={(event) => setItemForm((current) => current ? { ...current, stock: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tối thiểu</span><input type="number" min="0" value={itemForm.minimum} onChange={(event) => setItemForm((current) => current ? { ...current, minimum: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tối đa</span><input type="number" min="1" value={itemForm.maximum} onChange={(event) => setItemForm((current) => current ? { ...current, maximum: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Giá nhập</span><input type="number" min="0" value={itemForm.unitCost} onChange={(event) => setItemForm((current) => current ? { ...current, unitCost: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Lead time (ngày)</span><input type="number" min="0" value={itemForm.reorderLeadDays} onChange={(event) => setItemForm((current) => current ? { ...current, reorderLeadDays: event.target.value } : current)} className={inputClass} /></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800"><Truck className="h-4 w-4 text-blue-600" />Nhà cung cấp & lô</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Nhà cung cấp *</span><input value={itemForm.supplier} onChange={(event) => setItemForm((current) => current ? { ...current, supplier: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Điện thoại</span><input value={itemForm.supplierPhone} onChange={(event) => setItemForm((current) => current ? { ...current, supplierPhone: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã lô</span><input value={itemForm.lot} onChange={(event) => setItemForm((current) => current ? { ...current, lot: event.target.value } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Hạn dùng</span><input type="date" value={itemForm.expiry} onChange={(event) => setItemForm((current) => current ? { ...current, expiry: event.target.value } : current)} className={inputClass} /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ghi chú kiểm soát</span><textarea value={itemForm.note} onChange={(event) => setItemForm((current) => current ? { ...current, note: event.target.value } : current)} className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label></div></fieldset></div><footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setItemForm(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Plus className="h-4 w-4" />Tạo mã vật tư</button></footer></form></div>}
      {receiveForm && <div className="fixed inset-0 z-[88] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
        <button type="button" aria-label="Đóng phiếu nhập kho" onClick={() => setReceiveForm(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
        <form onSubmit={submitReceiveForm} className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
          <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Phiếu nhập kho nhiều vật tư</p><h2 className="mt-1 text-lg font-black text-slate-900">Thêm vật tư vào kho</h2><p className="mt-1 text-[9px] text-slate-500">Vật tư đã chọn được giữ cố định; bạn có thể bổ sung thêm mã khác vào cùng phiếu.</p></div>
            <button type="button" onClick={() => setReceiveForm(null)} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {formError && <div className="rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700">{formError}</div>}
            <section>
              <div className="mb-3 flex items-center justify-between"><div><h3 className="text-[10px] font-black text-slate-800">Vật tư trong phiếu</h3><p className="mt-1 text-[8px] text-slate-400">{receiveForm.receiveLines.length} vật tư đã được thêm</p></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[8px] font-black text-violet-700">Không đổi sai vật tư</span></div>
              <div className="space-y-3">
                {receiveForm.receiveLines.map((line, index) => {
                  const item = items.find((candidate) => itemKey(candidate) === line.itemKey);
                  if (!item) return null;
                  return <article key={line.itemKey} className={`rounded-2xl border p-4 ${line.locked ? 'border-violet-200 bg-violet-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryMeta[item.category].badge}`}><PackageOpen className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-800">{item.name}</p>{line.locked && <span className="rounded-full bg-violet-100 px-2 py-1 text-[7px] font-black text-violet-700">Vật tư đã chọn</span>}</div><p className="mt-1 text-[8px] text-slate-400">{item.id} · {item.variant} · {branchLabels[item.branch]}</p></div></div>{!line.locked && <button type="button" onClick={() => setReceiveForm((current) => current ? { ...current, receiveLines: current.receiveLines.filter((candidate) => candidate.itemKey !== line.itemKey) } : current)} aria-label={`Xóa ${item.name} khỏi phiếu`} className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-400 shadow-sm"><X className="h-3.5 w-3.5" /></button>}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-4"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số lượng ({item.unit}) *</span><input type="number" min="1" step="1" autoFocus={index === 0} value={line.quantity} onChange={(event) => setReceiveForm((current) => current ? { ...current, receiveLines: current.receiveLines.map((candidate) => candidate.itemKey === line.itemKey ? { ...candidate, quantity: event.target.value } : candidate) } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đơn giá nhập</span><input type="number" min="0" value={line.unitCost} onChange={(event) => setReceiveForm((current) => current ? { ...current, receiveLines: current.receiveLines.map((candidate) => candidate.itemKey === line.itemKey ? { ...candidate, unitCost: event.target.value } : candidate) } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã lô</span><input value={line.lot} onChange={(event) => setReceiveForm((current) => current ? { ...current, receiveLines: current.receiveLines.map((candidate) => candidate.itemKey === line.itemKey ? { ...candidate, lot: event.target.value } : candidate) } : current)} className={inputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Hạn dùng</span><input type="date" value={line.expiry} onChange={(event) => setReceiveForm((current) => current ? { ...current, receiveLines: current.receiveLines.map((candidate) => candidate.itemKey === line.itemKey ? { ...candidate, expiry: event.target.value } : candidate) } : current)} className={inputClass} /></label></div>
                  </article>;
                })}
                {!receiveForm.receiveLines.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-[9px] font-bold text-slate-500">Chọn một vật tư bên dưới để bắt đầu phiếu nhập.</div>}
              </div>
            </section>
            <section className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-4"><p className="text-[9px] font-black text-slate-800">Thêm vật tư khác</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><BeautifulSelect value={receiveForm.addItemKey} onChange={(event) => setReceiveForm((current) => current ? { ...current, addItemKey: event.target.value } : current)} className={inputClass}><option value="">Chọn vật tư cần thêm</option>{scopedItems.filter((item) => !receiveForm.receiveLines.some((line) => line.itemKey === itemKey(item))).map((item) => <option key={itemKey(item)} value={itemKey(item)}>{item.id} · {item.name} · {branchLabels[item.branch]}</option>)}</BeautifulSelect><button type="button" disabled={!receiveForm.addItemKey} onClick={() => { const item = items.find((candidate) => itemKey(candidate) === receiveForm.addItemKey); if (!item) return; setReceiveForm((current) => current ? { ...current, addItemKey: '', receiveLines: [...current.receiveLines, receiveLineFromItem(item)] } : current); setFormError(''); }} className="flex h-11 shrink-0 items-center justify-center gap-2 border border-violet-200 bg-white px-4 text-[9px] font-black text-violet-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />Thêm vào phiếu</button></div></section>
            <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã chứng từ</span><input value={receiveForm.reference} onChange={(event) => setReceiveForm((current) => current ? { ...current, reference: event.target.value } : current)} className={inputClass} placeholder="Tự tạo nếu để trống" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ghi chú chung</span><input value={receiveForm.reason} onChange={(event) => setReceiveForm((current) => current ? { ...current, reason: event.target.value } : current)} className={inputClass} placeholder="Số PO hoặc ghi chú nhận hàng" /></label></div>
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><p className="hidden text-[8px] font-bold text-slate-500 sm:block">{receiveForm.receiveLines.length} vật tư · {receiveForm.receiveLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)} đơn vị</p><div className="ml-auto flex gap-2"><button type="button" onClick={() => setReceiveForm(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><CheckCircle2 className="h-4 w-4" />Xác nhận nhập kho</button></div></footer>
        </form>
      </div>}
    </div>
  );
}
