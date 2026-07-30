import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Banknote, Check, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, Download, FileText, Landmark, LockKeyhole,
  MoreHorizontal, Palette, Plus, ReceiptText, RefreshCcw, Search, ShieldCheck, Smartphone,
  Sparkles, UserRound, WalletCards, X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { NailDesign, PolishColor, colorSeed, designSeed } from './TenantAdminNailGallery';
import { SalonService, serviceSeed } from './TenantAdminServices';
import { inventorySeed } from './TenantAdminInventory';
import { loadInventoryItems, syncColorsWithInventory, updateInventoryForColorUsage } from '../utils/inventorySync';
import {
  defaultLoyaltyPrograms,
  evaluateDiscountCode,
  InvoiceItemForDiscount,
  LoyaltyProgram,
} from '../utils/promotionUtils';

type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED' | 'FAILED';
type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';
type BranchCode = 'Q1' | 'Q3';
type ServiceCategory = 'ALL' | 'NAIL_ART' | 'MANICURE' | 'PEDICURE' | 'GEL' | 'ACRYLIC' | 'SPA';
type PaymentDatePreset = 'ALL' | 'TODAY' | '7D' | '30D' | 'CUSTOM';

interface PaymentItem {
  name: string;
  quantity: number;
  amount: number;
  staff: string;
  basePrice?: number;
  designName?: string;
  designCode?: string;
  designSurcharge?: number;
  polishColorId?: string;
  polishColorName?: string;
}

interface PaymentRecord {
  id: string; appointmentId?: string; customer: string; phone: string; branch: BranchCode;
  createdAt: string; total: number; subtotal: number; discount: number; tip: number; deposit: number;
  tax?: number; discountCode?: string;
  paid: number; refunded: number; status: PaymentStatus; method?: PaymentMethod; reference?: string;
  cashier: string; source: string; items: PaymentItem[]; note?: string; audit: string[];
}

interface InvoiceServiceLine {
  id: string;
  name: string;
  category: Exclude<ServiceCategory, 'ALL'>;
  price: number;
  quantity: number;
  selectedDesignId?: string;
  selectedDesignCode?: string;
  selectedDesignName?: string;
  selectedDesignSurcharge?: number;
  selectedColorId?: string;
  selectedColorCode?: string;
  selectedColorName?: string;
}

interface TenantAdminPaymentsProps {
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
}

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const parsePaymentDate = (createdAt: string) => {
  const [day, month, year] = createdAt.split(' · ')[0].split('/').map(Number);
  return day && month && year ? new Date(year, month - 1, day) : null;
};
const matchesPaymentDate = (record: PaymentRecord, preset: PaymentDatePreset, dateFrom: string, dateTo: string) => {
  if (preset === 'ALL') return true;
  const recordDate = parsePaymentDate(record.createdAt);
  if (!recordDate) return false;
  recordDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === 'TODAY') return recordDate.getTime() === today.getTime();
  if (preset === '7D' || preset === '30D') {
    const start = new Date(today);
    start.setDate(start.getDate() - (preset === '7D' ? 6 : 29));
    return recordDate >= start && recordDate <= today;
  }
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
  return (!from || recordDate >= from) && (!to || recordDate <= to);
};
const methodMeta: Record<PaymentMethod, { label: string; icon: typeof Banknote; className: string }> = {
  CASH: { label: 'Tiền mặt', icon: Banknote, className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  BANK: { label: 'Chuyển khoản', icon: Landmark, className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  CARD: { label: 'Thẻ', icon: CreditCard, className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  MOMO: { label: 'MoMo', icon: Smartphone, className: 'bg-pink-50 text-pink-700 ring-pink-200' },
  ZALOPAY: { label: 'ZaloPay', icon: WalletCards, className: 'bg-cyan-50 text-cyan-700 ring-cyan-200' }
};
const statusMeta: Record<PaymentStatus, { label: string; badge: string; dot: string }> = {
  PAID: { label: 'Đã thanh toán', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  PARTIAL: { label: 'Thanh toán một phần', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  PENDING: { label: 'Chờ thanh toán', badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  REFUNDED: { label: 'Đã hoàn tiền', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  FAILED: { label: 'Giao dịch lỗi', badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-500' }
};

const serviceCategoryLabels: Record<Exclude<ServiceCategory, 'ALL'>, string> = {
  NAIL_ART: 'Nail Art',
  MANICURE: 'Manicure',
  PEDICURE: 'Pedicure',
  GEL: 'Gel & Sơn gel',
  ACRYLIC: 'Acrylic',
  SPA: 'Spa & Phục hồi'
};

const discountCodes: Record<string, { label: string; rate: number }> = {
  MEMBER5: { label: 'Thành viên', rate: 5 },
  SALON10: { label: 'Ưu đãi salon', rate: 10 },
  VIP15: { label: 'Khách VIP', rate: 15 }
};

const invoiceServiceCatalog = [
  { id: 'SVC-001', name: 'Nail Art Premium', category: 'NAIL_ART' as const, price: 950_000, branches: ['Q1', 'Q3'] as BranchCode[] },
  { id: 'SVC-002', name: 'Combo manicure & sơn gel', category: 'MANICURE' as const, price: 450_000, branches: ['Q1', 'Q3'] as BranchCode[] },
  { id: 'SVC-003', name: 'Pedicure spa chuyên sâu', category: 'PEDICURE' as const, price: 650_000, branches: ['Q1', 'Q3'] as BranchCode[] },
  { id: 'SVC-004', name: 'Đắp gel nối móng', category: 'GEL' as const, price: 890_000, branches: ['Q1', 'Q3'] as BranchCode[] },
  { id: 'SVC-005', name: 'Acrylic Full Set', category: 'ACRYLIC' as const, price: 1_350_000, branches: ['Q3'] as BranchCode[] },
  { id: 'SVC-006', name: 'Sơn gel Hàn Quốc', category: 'GEL' as const, price: 420_000, branches: ['Q1', 'Q3'] as BranchCode[] },
  { id: 'SVC-007', name: 'Chăm sóc gót chân', category: 'SPA' as const, price: 320_000, branches: ['Q1', 'Q3'] as BranchCode[] },
  { id: 'SVC-008', name: 'Nail Art cô dâu', category: 'NAIL_ART' as const, price: 1_650_000, branches: ['Q1'] as BranchCode[] }
];

const invoiceStaffDirectory = [
  { name: 'Thảo Nguyễn', branch: 'Q3' as const, role: 'Nail Artist Senior' },
  { name: 'Minh Châu', branch: 'Q3' as const, role: 'Pedicure Specialist' },
  { name: 'Quốc Bảo', branch: 'Q3' as const, role: 'Pedicure Specialist' },
  { name: 'Thuỳ Dương', branch: 'Q3' as const, role: 'Gel Nail Technician' },
  { name: 'An Nhiên', branch: 'Q3' as const, role: 'Nail Art Technician' },
  { name: 'Khánh Vy', branch: 'Q3' as const, role: 'Extension Specialist' },
  { name: 'Hà My', branch: 'Q1' as const, role: 'Nail Artist Senior' },
  { name: 'Gia Huy', branch: 'Q1' as const, role: 'Nail Technician' }
];

const seed: PaymentRecord[] = [
  { id: 'INV-7821', appointmentId: 'APT-1072', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', branch: 'Q3', createdAt: '19/07/2026 · 14:28', subtotal: 1020000, discount: 50000, tip: 100000, deposit: 300000, total: 1070000, paid: 1070000, refunded: 0, status: 'PAID', method: 'MOMO', reference: 'MOMO-190726-8421', cashier: 'Lê Hoàng Nam', source: 'POS tại quầy', items: [{ name: 'Gel Manicure + Nail Art', quantity: 1, amount: 850000, staff: 'Thảo Nguyễn' }, { name: 'Dầu dưỡng móng', quantity: 1, amount: 170000, staff: 'Quầy bán lẻ' }], audit: ['14:28 · Lê Hoàng Nam xác nhận thanh toán MoMo', '14:25 · Đã áp dụng ưu đãi thành viên 50.000đ', '10:02 · Ghi nhận đặt cọc 300.000đ'] },
  { id: 'INV-7822', appointmentId: 'APT-1074', customer: 'Trần Thu Hà', phone: '0908 337 912', branch: 'Q3', createdAt: '19/07/2026 · 14:16', subtotal: 780000, discount: 0, tip: 0, deposit: 200000, total: 780000, paid: 200000, refunded: 0, status: 'PARTIAL', method: 'BANK', reference: 'DEP-7822', cashier: 'Minh Châu', source: 'Lịch hẹn tại quầy', items: [{ name: 'Pedicure Spa + Sơn gel', quantity: 1, amount: 780000, staff: 'Minh Châu' }], note: 'Khách thanh toán phần còn lại sau khi hoàn tất dịch vụ.', audit: ['14:16 · Hóa đơn được tạo từ lịch hẹn APT-1074', '12:08 · Đã đối soát tiền cọc 200.000đ'] },
  { id: 'INV-7819', appointmentId: 'APT-1068', customer: 'Đặng Hải Yến', phone: '0933 420 184', branch: 'Q1', createdAt: '19/07/2026 · 13:42', subtotal: 740000, discount: 50000, tip: 50000, deposit: 0, total: 740000, paid: 740000, refunded: 0, status: 'PAID', method: 'CARD', reference: 'VISA-4821-9210', cashier: 'Thuỳ Dương', source: 'POS tại quầy', items: [{ name: 'Combo Manicure', quantity: 1, amount: 520000, staff: 'Thuỳ Dương' }, { name: 'Kem dưỡng tay', quantity: 1, amount: 220000, staff: 'Quầy bán lẻ' }], audit: ['13:42 · Máy POS báo giao dịch thành công', '13:41 · Thêm tiền tip 50.000đ'] },
  { id: 'INV-7817', appointmentId: 'APT-1065', customer: 'Hoàng Bảo Ngọc', phone: '0907 211 842', branch: 'Q1', createdAt: '19/07/2026 · 12:52', subtotal: 460000, discount: 0, tip: 80000, deposit: 0, total: 540000, paid: 540000, refunded: 0, status: 'PAID', method: 'CASH', cashier: 'Hà My', source: 'POS tại quầy', items: [{ name: 'Tháo bột + Phục hồi móng', quantity: 1, amount: 460000, staff: 'Hà My' }], audit: ['12:52 · Hà My ghi nhận tiền mặt 540.000đ', '12:51 · Khách thêm tip 80.000đ'] },
  { id: 'INV-7814', appointmentId: 'APT-1059', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', branch: 'Q3', createdAt: '18/07/2026 · 16:20', subtotal: 1350000, discount: 0, tip: 0, deposit: 0, total: 1350000, paid: 1350000, refunded: 300000, status: 'REFUNDED', method: 'BANK', reference: 'RF-28419', cashier: 'Lê Hoàng Nam', source: 'POS tại quầy', items: [{ name: 'Acrylic Full Set', quantity: 1, amount: 1350000, staff: 'Thảo Nguyễn' }], note: 'Hoàn một phần do điều chỉnh dịch vụ.', audit: ['19/07 · 08:15 · Lê Hoàng Nam duyệt hoàn 300.000đ', '18/07 · 16:20 · Đã thanh toán qua chuyển khoản'] },
  { id: 'INV-7824', customer: 'Mai Đức Anh', phone: '0939 772 618', branch: 'Q3', createdAt: '19/07/2026 · 14:31', subtotal: 620000, discount: 0, tip: 0, deposit: 0, total: 620000, paid: 0, refunded: 0, status: 'FAILED', method: 'ZALOPAY', reference: 'ZLP-FAILED-219', cashier: 'Quốc Bảo', source: 'QR tại quầy', items: [{ name: 'Combo manicure & sơn gel', quantity: 1, amount: 620000, staff: 'Quốc Bảo' }], note: 'Cổng thanh toán chưa nhận được xác nhận.', audit: ['14:31 · ZaloPay trả về lỗi timeout', '14:30 · Khởi tạo yêu cầu thanh toán QR'] },
  { id: 'INV-7825', customer: 'Lê Phương Anh', phone: '0901 486 320', branch: 'Q1', createdAt: '19/07/2026 · 14:34', subtotal: 980000, discount: 80000, tip: 0, deposit: 0, total: 900000, paid: 0, refunded: 0, status: 'PENDING', cashier: 'Thảo Nguyễn', source: 'Lịch hẹn trực tuyến', items: [{ name: 'Nail Art Premium', quantity: 1, amount: 980000, staff: 'Thảo Nguyễn' }], audit: ['14:34 · Tạo hóa đơn từ lịch hẹn trực tuyến', '14:34 · Áp dụng voucher 80.000đ'] }
];

export default function TenantAdminPayments({ searchQuery, onSearchQueryChange, selectedBranch, onSelectedBranchChange, branchLocked = false, tenantName = 'Nailé Studio', roleLabel = 'Owner · Tenant Admin', accessMode = 'full', readOnlyReason = '', onNotify }: TenantAdminPaymentsProps) {
  const storageKey = `tenant-admin-payments-v1:${tenantName}`;
  const loyaltyStorageKey = `tenant-admin-loyalty-v1:${tenantName}`;
  const [records, setRecords] = useState<PaymentRecord[]>(() => { if (typeof window === 'undefined') return getTenantAdminInitialData(null, seed); try { const stored = localStorage.getItem(storageKey); return getTenantAdminInitialData(stored ? JSON.parse(stored) as PaymentRecord[] : null, seed); } catch { return getTenantAdminInitialData(null, seed); } });
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>(() => {
    if (typeof window === 'undefined') return defaultLoyaltyPrograms;
    try {
      const stored = localStorage.getItem(loyaltyStorageKey);
      return stored ? (JSON.parse(stored) as LoyaltyProgram[]) : defaultLoyaltyPrograms;
    } catch {
      return defaultLoyaltyPrograms;
    }
  });
  const [tab, setTab] = useState<'ALL' | PaymentStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [datePreset, setDatePreset] = useState<PaymentDatePreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [catalogCreateOpen, setCatalogCreateOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('2000000');
  const [shiftNote, setShiftNote] = useState('');
  const [formError, setFormError] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceServiceLine[]>([]);
  const [invoice, setInvoice] = useState({
    customer: '', phone: '', branch: (selectedBranch === 'Q1' ? 'Q1' : 'Q3') as BranchCode,
    appointmentId: '', category: 'ALL' as ServiceCategory, itemName: '', quantity: '1', unitPrice: '', staff: '',
    discount: '0', discountCode: '', taxRate: '0', tip: '0', deposit: '0', method: 'CASH' as PaymentMethod,
    invoiceStatus: 'PENDING' as Extract<PaymentStatus, 'PENDING' | 'PARTIAL' | 'PAID'>, reference: '', note: ''
  });
  const [capture, setCapture] = useState({ invoiceId: 'INV-7822', method: 'BANK' as PaymentMethod, amount: '580000', reference: '' });
  const [refund, setRefund] = useState({ amount: '', reason: '' });
  const canManage = accessMode === 'full' && !readOnlyReason;

  const designStorageKey = `tenant-admin-nail-designs-v1:${tenantName}`;
  const serviceStorageKey = `tenant-admin-services-v1:${tenantName}`;

  const [salonServices, setSalonServices] = useState<SalonService[]>(() => {
    if (typeof window === 'undefined') return serviceSeed;
    try {
      const value = localStorage.getItem(serviceStorageKey);
      return value ? getTenantAdminInitialData(JSON.parse(value), serviceSeed) : serviceSeed;
    } catch (e) {
      console.error('Failed to parse stored services in payments', e);
      return serviceSeed;
    }
  });

  const [nailDesigns, setNailDesigns] = useState<NailDesign[]>(() => {
    if (typeof window === 'undefined') return designSeed;
    try {
      const value = localStorage.getItem(designStorageKey);
      return getTenantAdminInitialData(value ? JSON.parse(value) : null, designSeed);
    } catch (e) {
      console.error('Failed to parse stored nail designs in payments', e);
      return designSeed;
    }
  });

  const colorStorageKey = `${tenantName}_nail_colors`;

  const [nailColors, setNailColors] = useState<PolishColor[]>(() => {
    if (typeof window === 'undefined') return colorSeed;
    try {
      const value = localStorage.getItem(colorStorageKey);
      const raw = getTenantAdminInitialData(value ? JSON.parse(value) : null, colorSeed);
      const inv = loadInventoryItems(tenantName, inventorySeed);
      return syncColorsWithInventory(raw, inv);
    } catch (e) {
      console.error('Failed to parse stored nail colors in payments', e);
      return colorSeed;
    }
  });

  useEffect(() => {
    if (catalogCreateOpen || createOpen) {
      try {
        const sVal = localStorage.getItem(serviceStorageKey);
        if (sVal) {
          const parsed = JSON.parse(sVal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSalonServices(getTenantAdminInitialData(parsed, serviceSeed));
          }
        }
        const dVal = localStorage.getItem(designStorageKey);
        if (dVal) {
          const parsed = JSON.parse(dVal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNailDesigns(getTenantAdminInitialData(parsed, designSeed));
          }
        }
        const cVal = localStorage.getItem(colorStorageKey);
        const rawColors = getTenantAdminInitialData(cVal ? JSON.parse(cVal) : null, colorSeed);
        const inv = loadInventoryItems(tenantName, inventorySeed);
        setNailColors(syncColorsWithInventory(rawColors, inv));
      } catch (e) {
        console.error('Failed to reload services, designs and colors on create open', e);
      }
    }
  }, [catalogCreateOpen, createOpen, designStorageKey, serviceStorageKey, colorStorageKey, tenantName]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const cVal = localStorage.getItem(colorStorageKey);
        const rawColors = getTenantAdminInitialData(cVal ? JSON.parse(cVal) : null, colorSeed);
        const inv = loadInventoryItems(tenantName, inventorySeed);
        setNailColors(syncColorsWithInventory(rawColors, inv));
      } catch (e) {
        console.error('Sync error in payments', e);
      }
    };
    window.addEventListener('salonsys_inventory_updated', handleSync);
    return () => window.removeEventListener('salonsys_inventory_updated', handleSync);
  }, [tenantName, colorStorageKey]);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(records)); }, [records, storageKey]);
  useEffect(() => { if (!selected && !createOpen && !catalogCreateOpen && !captureOpen && !refundOpen && !shiftModalOpen) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setCreateOpen(false); setCatalogCreateOpen(false); setCaptureOpen(false); setRefundOpen(false); setShiftModalOpen(false); } }; addEventListener('keydown', close); return () => { document.body.style.overflow = previous; removeEventListener('keydown', close); }; }, [captureOpen, catalogCreateOpen, createOpen, refundOpen, selected, shiftModalOpen]);

  const requireManage = () => { if (canManage) return true; onNotify?.(readOnlyReason || 'Gói hiện tại chỉ cho phép xem dữ liệu thanh toán.'); return false; };
  const scoped = useMemo(() => records.filter((record) => selectedBranch === 'ALL' || record.branch === selectedBranch), [records, selectedBranch]);
  const periodScoped = useMemo(() => scoped.filter((record) => matchesPaymentDate(record, datePreset, dateFrom, dateTo)), [dateFrom, datePreset, dateTo, scoped]);
  const filtered = useMemo(() => { const query = searchQuery.trim().toLowerCase(); return periodScoped.filter((record) => tab === 'ALL' || record.status === tab).filter((record) => methodFilter === 'ALL' || record.method === methodFilter).filter((record) => !query || `${record.id} ${record.appointmentId || ''} ${record.customer} ${record.phone} ${record.reference || ''}`.toLowerCase().includes(query)); }, [methodFilter, periodScoped, searchQuery, tab]);
  const collected = periodScoped.reduce((sum, record) => sum + record.paid, 0);
  const outstanding = periodScoped.reduce((sum, record) => sum + Math.max(0, record.total - record.paid), 0);
  const refunded = periodScoped.reduce((sum, record) => sum + record.refunded, 0);
  const netRevenue = collected - refunded;

  const availableInvoiceServices = salonServices.filter((service) => {
    if (service.status === 'HIDDEN') return false;
    const query = serviceSearch.trim().toLowerCase();
    const matchesBranch = (invoice.branch as string) === 'ALL' || service.branches.includes(invoice.branch);
    const matchesCategory = invoice.category === 'ALL' || service.category === invoice.category;
    const matchesQuery = !query || `${service.id} ${service.name} ${serviceCategoryLabels[service.category]}`.toLowerCase().includes(query);
    return matchesBranch && matchesCategory && matchesQuery;
  });

  const availableInvoiceStaff = invoiceStaffDirectory.filter((staff) => {
    const query = staffSearch.trim().toLowerCase();
    return staff.branch === invoice.branch
      && (!query || `${staff.name} ${staff.role}`.toLowerCase().includes(query));
  });

  const getMatchingDesignsForService = (
    serviceIdOrCode: string,
    designs: NailDesign[]
  ): NailDesign[] => {
    if (!serviceIdOrCode) return [];
    const target = String(serviceIdOrCode).trim().toLowerCase();

    return designs.filter((d) => {
      if (d.status === 'HIDDEN') return false;
      const linked = String(
        d.baseServiceId || (d as any).serviceId || (d as any).appliedServiceId || (d as any).serviceCode || ''
      ).trim().toLowerCase();
      return linked === target;
    });
  };

  const updateInvoiceServiceDesign = (serviceId: string, designId: string) => {
    setInvoiceItems((current) =>
      current.map((item) => {
        if (item.id !== serviceId) return item;
        if (!designId || designId === 'NONE') {
          return {
            ...item,
            selectedDesignId: undefined,
            selectedDesignCode: undefined,
            selectedDesignName: undefined,
            selectedDesignSurcharge: undefined,
          };
        }
        const matching = getMatchingDesignsForService(item.id, nailDesigns);
        const chosen = matching.find((d) => d.id === designId);
        if (!chosen) {
          return {
            ...item,
            selectedDesignId: undefined,
            selectedDesignCode: undefined,
            selectedDesignName: undefined,
            selectedDesignSurcharge: undefined,
          };
        }
        return {
          ...item,
          selectedDesignId: chosen.id,
          selectedDesignCode: chosen.id,
          selectedDesignName: chosen.name,
          selectedDesignSurcharge: chosen.surcharge,
        };
      })
    );
  };

  const updateInvoiceServiceColor = (serviceId: string, colorId: string) => {
    setInvoiceItems((current) =>
      current.map((item) => {
        if (item.id !== serviceId) return item;
        if (!colorId || colorId === 'NONE') {
          return {
            ...item,
            selectedColorId: undefined,
            selectedColorCode: undefined,
            selectedColorName: undefined,
          };
        }
        const foundColor = nailColors.find((c) => c.id === colorId);
        if (!foundColor) return item;

        if (foundColor.status === 'OUT' || foundColor.stock <= 0) {
          onNotify?.(`Màu sơn ${foundColor.name} đã HẾT HÀNG trong kho.`);
          return item;
        }

        if (foundColor.status === 'LOW' || foundColor.stock <= foundColor.minimumStock) {
          onNotify?.(`Cảnh báo: Màu sơn ${foundColor.name} sắp hết hàng (còn ${foundColor.stock} chai).`);
        }

        return {
          ...item,
          selectedColorId: foundColor.id,
          selectedColorCode: foundColor.code,
          selectedColorName: `${foundColor.brand} ${foundColor.name}`,
        };
      })
    );
  };

  const mappedInvoiceItems: InvoiceItemForDiscount[] = useMemo(() => {
    return invoiceItems.map((item) => ({
      name: item.name,
      type: 'SERVICE' as const,
      quantity: item.quantity,
      unitPrice: item.price + (item.selectedDesignSurcharge || 0),
    }));
  }, [invoiceItems]);

  const promoEvaluation = useMemo(() => {
    if (!invoice.discountCode.trim()) {
      return { appliedProgram: null, discountAmount: 0, feedback: null };
    }
    return evaluateDiscountCode({
      rawCode: invoice.discountCode,
      programs: loyaltyPrograms,
      items: mappedInvoiceItems,
      branch: invoice.branch,
    });
  }, [invoice.discountCode, loyaltyPrograms, mappedInvoiceItems, invoice.branch]);

  const invoiceBaseServicesSubtotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [invoiceItems]);

  const invoiceNailSurchargeSubtotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + (item.selectedDesignSurcharge || 0) * item.quantity, 0);
  }, [invoiceItems]);

  const invoiceSubtotal = invoiceBaseServicesSubtotal + invoiceNailSurchargeSubtotal;
  const invoiceDiscount = promoEvaluation.discountAmount;
  const invoiceTax = Math.round(Math.max(0, invoiceSubtotal - invoiceDiscount) * Math.max(0, Number(invoice.taxRate) || 0) / 100);
  const invoiceTotal = Math.max(0, invoiceSubtotal - invoiceDiscount + invoiceTax + Math.max(0, Number(invoice.tip) || 0));

  const openCreate = () => {
    if (!requireManage()) return;
    setInvoice({
      customer: '', phone: '', branch: (selectedBranch === 'Q1' ? 'Q1' : 'Q3') as BranchCode,
      appointmentId: '', category: 'ALL', itemName: '', quantity: '1', unitPrice: '', staff: '',
      discount: '0', discountCode: '', taxRate: '0', tip: '0', deposit: '0', method: 'CASH',
      invoiceStatus: 'PENDING', reference: '', note: ''
    });
    setInvoiceItems([]);
    setServiceSearch('');
    setStaffSearch('');
    setSelected(null);
    setFormError('');
    setCatalogCreateOpen(true);
  };
  const toggleInvoiceService = (service: SalonService) => {
    setInvoiceItems((current) => current.some((item) => item.id === service.id)
      ? current.filter((item) => item.id !== service.id)
      : [...current, { id: service.id, name: service.name, category: service.category, price: service.price, quantity: 1 }]);
  };
  const updateInvoiceServiceQuantity = (service: SalonService, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      setInvoiceItems((current) => current.filter((item) => item.id !== service.id));
      return;
    }
    setInvoiceItems((current) => current.some((item) => item.id === service.id)
      ? current.map((item) => item.id === service.id ? { ...item, quantity } : item)
      : [...current, { id: service.id, name: service.name, category: service.category, price: service.price, quantity }]);
  };
  const submitInvoice = (event: FormEvent) => {
    event.preventDefault();
    const tip = Number(invoice.tip);
    const deposit = Number(invoice.deposit);
    const taxRate = Number(invoice.taxRate);
    const phoneDigits = invoice.phone.replace(/\D/g, '');
    if (!invoice.customer.trim() || !invoice.phone.trim() || !invoiceItems.length || !invoice.staff.trim()) {
      setFormError('Vui lòng nhập đầy đủ khách hàng, số điện thoại, chọn ít nhất một dịch vụ và nhân viên phụ trách.');
      return;
    }
    if (!/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(invoice.phone.trim()) || phoneDigits.length < 9) {
      setFormError('Số điện thoại chưa đúng định dạng Việt Nam.');
      return;
    }
    if (invoiceItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1) || tip < 0 || deposit < 0 || taxRate < 0 || taxRate > 100) {
      setFormError('Số lượng dịch vụ, thuế và các giá trị tiền phải hợp lệ.');
      return;
    }
    if (invoice.discountCode.trim()) {
      if (!promoEvaluation.feedback || promoEvaluation.feedback.isError) {
        setFormError(promoEvaluation.feedback?.text || 'Mã giảm giá không hợp lệ.');
        return;
      }
    }
    const subtotal = invoiceSubtotal + invoiceTax;
    const discount = invoiceDiscount;
    const tax = invoiceTax;
    const total = invoiceTotal;
    const paidAmount = invoice.invoiceStatus === 'PAID' ? total : invoice.invoiceStatus === 'PENDING' ? 0 : deposit;
    if (total <= 0) {
      setFormError('Tổng hóa đơn phải lớn hơn 0đ.');
      return;
    }
    if (invoice.invoiceStatus === 'PARTIAL' && (deposit <= 0 || deposit >= total)) {
      setFormError(`Hóa đơn thanh toán một phần phải có số tiền đã thu lớn hơn 0đ và nhỏ hơn ${money(total)}.`);
      return;
    }
    if (paidAmount > 0 && invoice.method !== 'CASH' && !invoice.reference.trim()) {
      setFormError('Khoản thu điện tử bắt buộc có mã giao dịch để đối soát.');
      return;
    }
    const nextNumber = Math.max(...records.map((record) => Number(record.id.replace(/\D/g, '')) || 0), 0) + 1;
    const now = new Date();
    const createdAt = `${now.toLocaleDateString('vi-VN')} · ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    const newRecord: PaymentRecord = {
      id: `INV-${nextNumber}`,
      appointmentId: invoice.appointmentId.trim() || undefined,
      customer: invoice.customer.trim(),
      phone: invoice.phone.trim(),
      branch: invoice.branch,
      createdAt,
      subtotal,
      discount,
      discountCode: invoice.discountCode.trim() ? invoice.discountCode.trim().toUpperCase() : undefined,
      tax,
      tip,
      deposit: paidAmount,
      total,
      paid: paidAmount,
      refunded: 0,
      status: invoice.invoiceStatus,
      method: paidAmount > 0 ? invoice.method : undefined,
      reference: paidAmount > 0 ? invoice.reference.trim() || `CASH-${Date.now().toString().slice(-6)}` : undefined,
      cashier: roleLabel,
      source: 'Tạo thủ công bởi Tenant Admin',
      items: [
        ...invoiceItems.map((item) => {
          const surcharge = item.selectedDesignSurcharge || 0;
          const unitPrice = item.price + surcharge;
          const hasDesign = Boolean(item.selectedDesignName);
          const colorName = item.selectedColorName;
          return {
            name: hasDesign
              ? `${item.name} + Mẫu ${item.selectedDesignName} (${item.selectedDesignCode})${colorName ? ` · Màu: ${colorName}` : ''}`
              : colorName
              ? `${item.name} · Màu: ${colorName}`
              : item.name,
            quantity: item.quantity,
            amount: unitPrice * item.quantity,
            staff: invoice.staff.trim(),
            basePrice: item.price,
            designName: item.selectedDesignName,
            designCode: item.selectedDesignCode,
            designSurcharge: surcharge,
            polishColorId: item.selectedColorId,
            polishColorName: item.selectedColorName,
          };
        }),
        ...(tax > 0 ? [{ name: `Thuế VAT ${taxRate}%`, quantity: 1, amount: tax, staff: 'Hệ thống' }] : [])
      ],
      note: invoice.note.trim() || undefined,
      audit: [
        `${createdAt} · ${roleLabel} tạo hóa đơn gồm ${invoiceItems.length} dịch vụ${
          invoiceItems.some((i) => i.selectedDesignName)
            ? ` (kèm mẫu nail: ${invoiceItems
                .filter((i) => i.selectedDesignName)
                .map((i) => `${i.selectedDesignName} +${money(i.selectedDesignSurcharge || 0)}`)
                .join(', ')})`
            : ''
        } ở trạng thái ${statusMeta[invoice.invoiceStatus].label}${paidAmount > 0 ? ` và ghi nhận đã thu ${money(paidAmount)}` : ''}`,
        ...(promoEvaluation.appliedProgram ? [`${createdAt} · Áp dụng ưu đãi "${promoEvaluation.appliedProgram.name}" (-${money(discount)})`] : []),
        ...(tax > 0 ? [`${createdAt} · Tính thuế VAT ${taxRate}% tương đương ${money(tax)}`] : [])
      ]
    };
    setRecords((current) => [newRecord, ...current]);

    // Trừ kho vật tư cho màu sơn nếu hóa đơn ở trạng thái Đã thanh toán (PAID)
    if (newRecord.status === 'PAID') {
      invoiceItems.forEach((item) => {
        if (item.selectedColorId) {
          updateInventoryForColorUsage({
            tenantName,
            colorId: item.selectedColorId,
            serviceQuantity: item.quantity,
            action: 'DEDUCT',
            inventorySeed,
            colorSeed,
            invoiceId: newRecord.id,
            actorName: roleLabel,
          });
        }
      });
    }

    if (promoEvaluation.appliedProgram) {
      const updatedPrograms = loyaltyPrograms.map((p) =>
        p.id === promoEvaluation.appliedProgram!.id
          ? {
              ...p,
              redeemed: p.redeemed + 1,
              revenue: p.revenue + total,
              cost: p.cost + discount,
            }
          : p
      );
      setLoyaltyPrograms(updatedPrograms);
      try {
        localStorage.setItem(loyaltyStorageKey, JSON.stringify(updatedPrograms));
      } catch (e) {
        console.error('Failed to update loyalty storage', e);
      }
    }
    setCreateOpen(false);
    setCatalogCreateOpen(false);
    setSelected(newRecord);
    setTab('ALL');
    onNotify?.(`Đã tạo hóa đơn ${newRecord.id} cho ${newRecord.customer}.`);
  };

  const openCapture = (record?: PaymentRecord) => { if (!requireManage()) return; const target = record || scoped.find((item) => item.status !== 'REFUNDED' && item.paid < item.total); if (!target || target.status === 'REFUNDED') { onNotify?.(target ? `Hóa đơn ${target.id} đã hoàn tiền nên không thể thu thêm.` : 'Không có hóa đơn cần thu trong phạm vi đang chọn.'); return; } setCapture({ invoiceId: target.id, method: target.method || 'BANK', amount: String(Math.max(0, target.total - target.paid)), reference: '' }); setFormError(''); setCaptureOpen(true); };

  const submitCapture = (event: FormEvent) => {
    event.preventDefault();
    const target = records.find((item) => item.id === capture.invoiceId);
    const amount = Number(capture.amount);
    if (target?.status === 'REFUNDED') { setFormError('Hóa đơn đã hoàn tiền nên không thể ghi nhận thu thêm.'); return; }
    if (!target || !amount || amount <= 0 || amount > target.total - target.paid) { setFormError('Số tiền thu phải lớn hơn 0 và không vượt quá công nợ còn lại.'); return; }
    if (capture.method !== 'CASH' && !capture.reference.trim()) { setFormError('Thanh toán điện tử bắt buộc có mã giao dịch để đối soát.'); return; }
    const nextPaid = target.paid + amount;
    const isNowPaid = nextPaid >= target.total;
    const patch: Partial<PaymentRecord> = { paid: nextPaid, method: capture.method, reference: capture.reference.trim() || `CASH-${Date.now().toString().slice(-6)}`, status: isNowPaid ? 'PAID' : 'PARTIAL', audit: [`14:42 · ${roleLabel} ghi nhận ${money(amount)} qua ${methodMeta[capture.method].label}`, ...target.audit] };

    // Khi thanh toán hoàn tất (PAID), trừ kho lượng màu sơn đã chọn
    if (isNowPaid && target.status !== 'PAID') {
      target.items?.forEach((item) => {
        if (item.polishColorId) {
          updateInventoryForColorUsage({
            tenantName,
            colorId: item.polishColorId,
            serviceQuantity: item.quantity || 1,
            action: 'DEDUCT',
            inventorySeed,
            colorSeed,
            invoiceId: target.id,
            actorName: roleLabel,
          });
        }
      });
    }

    setRecords((current) => current.map((item) => item.id === target.id ? { ...item, ...patch } : item));
    setSelected((current) => current?.id === target.id ? { ...current, ...patch } as PaymentRecord : current);
    setCaptureOpen(false);
    onNotify?.(`Đã ghi nhận ${money(amount)} cho ${target.id}.`);
  };

  const openRefund = (record: PaymentRecord) => { if (!requireManage()) return; if (record.status === 'REFUNDED') { onNotify?.(`Hóa đơn ${record.id} đã được hoàn tiền và không thể hoàn thêm.`); return; } setRefund({ amount: '', reason: '' }); setFormError(''); setSelected(record); setRefundOpen(true); };

  const submitRefund = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (selected.status === 'REFUNDED') { setFormError('Hóa đơn này đã được hoàn tiền. Không thể thực hiện hoàn tiền lần nữa.'); return; }
    const amount = Number(refund.amount);
    const refundable = selected.paid - selected.refunded;
    if (!amount || amount <= 0 || amount > refundable) { setFormError(`Số tiền hoàn phải lớn hơn 0đ và không vượt quá ${money(refundable)}.`); return; }
    if (refund.reason.trim().length < 8) { setFormError('Vui lòng nhập lý do hoàn tiền tối thiểu 8 ký tự.'); return; }
    const patch: Partial<PaymentRecord> = { refunded: selected.refunded + amount, status: 'REFUNDED', note: refund.reason.trim(), audit: [`14:45 · ${roleLabel} duyệt hoàn ${money(amount)} · ${refund.reason.trim()}`, ...selected.audit] };

    // Hoàn lại tồn kho cho màu sơn nếu hóa đơn bị hủy/hoàn tiền
    selected.items?.forEach((item) => {
      if (item.polishColorId) {
        updateInventoryForColorUsage({
          tenantName,
          colorId: item.polishColorId,
          serviceQuantity: item.quantity || 1,
          action: 'RESTORE',
          inventorySeed,
          colorSeed,
          invoiceId: selected.id,
          actorName: roleLabel,
        });
      }
    });

    setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
    setSelected((current) => current ? { ...current, ...patch } as PaymentRecord : current);
    setRefundOpen(false);
    onNotify?.(`Đã ghi nhận yêu cầu hoàn ${money(amount)} cho ${selected.id}.`);
  };
  const exportReport = () => { const header = 'Hoa don,Khach hang,Chi nhanh,Tong tien,Da thu,Hoan tien,Phuong thuc,Trang thai'; const body = filtered.map((record) => [record.id, record.customer, record.branch, record.total, record.paid, record.refunded, record.method ? methodMeta[record.method].label : 'Chua chon', statusMeta[record.status].label].join(',')).join('\n'); const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'doi-soat-thanh-toan.csv'; link.click(); URL.revokeObjectURL(link.href); onNotify?.('Đã xuất báo cáo đối soát theo bộ lọc hiện tại.'); };

  const MethodBadge = ({ method }: { method?: PaymentMethod }) => { if (!method) return <span className="text-[8px] font-bold text-slate-400">Chưa chọn</span>; const meta = methodMeta[method]; const Icon = meta.icon; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span>; };
  const invoiceInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-semibold text-slate-800 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';

  return <div className="space-y-5">
    <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đối soát trực tiếp · Cập nhật 14:42<span className="text-slate-300">•</span><span className="text-slate-500">{tenantName}</span></div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Thanh toán & đối soát</h1><p className="mt-2 text-[11px] text-slate-500">Theo dõi dòng tiền, công nợ, tiền cọc, hoàn tiền và lịch sử thao tác trên toàn tenant.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportReport} className="flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất đối soát</button><button type="button" onClick={openCreate} disabled={!canManage} className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Plus className="h-4 w-4" />Tạo hóa đơn</button><button type="button" onClick={() => openCapture()} disabled={!canManage} className="flex h-11 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[9px] font-black text-white shadow-lg shadow-emerald-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><CircleDollarSign className="h-4 w-4" />Ghi nhận thanh toán</button></div></section>

    <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? 'border-violet-100 bg-gradient-to-r from-violet-50 to-white' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4.5 w-4.5" /></span><div><p className="text-[10px] font-black text-slate-800">Phạm vi quyền: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{canManage ? 'Được xem mọi chi nhánh, ghi nhận tiền thu, xuất đối soát, xử lý hoàn tiền và xem nhật ký trong tenant; không truy cập dữ liệu tenant khác.' : readOnlyReason || 'Chỉ được xem giao dịch và báo cáo doanh thu.'}</p></div></div><span className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{canManage ? 'Toàn quyền tài chính tenant' : 'Chỉ xem'}</span></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Doanh thu thuần', value: money(netRevenue), detail: `${periodScoped.length} hóa đơn trong kỳ`, icon: ArrowUpRight, tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Đã thu', value: money(collected), detail: `${periodScoped.filter((item) => item.paid > 0).length} hóa đơn có phát sinh`, icon: CircleDollarSign, tone: 'bg-violet-50 text-violet-600' },
      { label: 'Còn phải thu', value: money(outstanding), detail: `${periodScoped.filter((item) => item.paid < item.total).length} hóa đơn cần xử lý`, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
      { label: 'Đã hoàn tiền', value: money(refunded), detail: `${periodScoped.filter((item) => item.refunded > 0).length} giao dịch trong kỳ`, icon: ArrowDownRight, tone: 'bg-rose-50 text-rose-600' }
    ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-lg font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p></article>)}</section>

    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="flex min-w-fit items-center gap-2 px-1 pb-0.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Clock3 className="h-4 w-4" /></span>
          <div><p className="text-[9px] font-black text-slate-800">Lọc theo thời gian</p><p className="mt-0.5 text-[7px] text-slate-400">Áp dụng cho số liệu và giao dịch</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ['ALL', 'Tất cả'],
            ['TODAY', 'Hôm nay'],
            ['7D', '7 ngày'],
            ['30D', '30 ngày'],
            ['CUSTOM', 'Khoảng ngày']
          ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setDatePreset(value)} className={`h-9 border px-3 text-[8px] font-black shadow-sm ${datePreset === value ? 'border-violet-200 bg-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'}`}>{label}</button>)}
        </div>
        {datePreset === 'CUSTOM' && <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block"><span className="mb-1 block text-[7px] font-bold text-slate-500">Từ ngày</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[8px] font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:w-36" /></label>
          <span className="hidden pb-2 text-[8px] text-slate-300 sm:block">—</span>
          <label className="block"><span className="mb-1 block text-[7px] font-bold text-slate-500">Đến ngày</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[8px] font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:w-36" /></label>
        </div>}
        <div className="flex items-center gap-2 xl:ml-auto">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[8px] font-bold text-slate-500"><strong className="text-slate-800">{periodScoped.length}</strong> hóa đơn trong kỳ</span>
          {datePreset !== 'ALL' && <button type="button" onClick={() => { setDatePreset('ALL'); setDateFrom(''); setDateTo(''); }} className="h-8 border-0 bg-transparent px-2 text-[8px] font-bold text-violet-600 shadow-none">Xóa lọc</button>}
        </div>
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="relative w-full xl:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm hóa đơn, khách, mã giao dịch..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap gap-2"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} disabled={branchLocked} aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'} className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả chi nhánh</option><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect><BeautifulSelect value={methodFilter} onChange={(event) => setMethodFilter(event.target.value as 'ALL' | PaymentMethod)} className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Mọi phương thức</option>{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></div></div><div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">{(['ALL', 'PAID', 'PARTIAL', 'PENDING', 'REFUNDED', 'FAILED'] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${tab === value ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>{value === 'ALL' ? 'Tất cả giao dịch' : statusMeta[value].label}<span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">{value === 'ALL' ? periodScoped.length : periodScoped.filter((item) => item.status === value).length}</span></button>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[930px] text-left"><thead><tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Hóa đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Đã thu / còn lại</th><th className="px-4 py-3">Phương thức</th><th className="px-5 py-3 text-right">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((record) => <tr key={record.id} onClick={() => setSelected(record)} className="cursor-pointer text-[9px] text-slate-600 hover:bg-slate-50"><td className="px-5 py-4"><p className="font-black text-slate-900">{record.id}</p><p className="mt-1 text-[8px] text-slate-400">{record.createdAt}</p></td><td className="px-4 py-4"><p className="font-black text-slate-800">{record.customer}</p><p className="mt-1 text-[8px] text-slate-400">{record.phone} · {record.branch}</p></td><td className="px-4 py-4 font-black text-slate-900">{money(record.total)}{record.refunded > 0 && <p className="mt-1 text-[8px] font-bold text-rose-500">Đã hoàn {money(record.refunded)}</p>}</td><td className="px-4 py-4"><p className="font-black text-emerald-700">{money(record.paid)}</p><p className="mt-1 text-[8px] text-slate-400">Còn {money(Math.max(0, record.total - record.paid))}</p></td><td className="px-4 py-4"><MethodBadge method={record.method} /></td><td className="px-5 py-4 text-right"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[record.status].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusMeta[record.status].dot}`} />{statusMeta[record.status].label}</span></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{filtered.map((record) => <button key={record.id} type="button" onClick={() => setSelected(record)} className="block h-auto w-full rounded-none border-0 bg-white p-4 text-left shadow-none"><span className="flex items-start justify-between gap-3"><span><span className="text-[9px] font-black text-slate-900">{record.id}</span><span className="mt-1 block text-[8px] text-slate-400">{record.customer} · {record.branch}</span></span><span className="text-[11px] font-black text-slate-900">{money(record.total)}</span></span><span className="mt-3 flex items-center justify-between"><MethodBadge method={record.method} /><span className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${statusMeta[record.status].badge}`}>{statusMeta[record.status].label}</span></span></button>)}</div>{!filtered.length && <div className="py-16 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không có giao dịch phù hợp</p></div>}<div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3"><p className="text-[8px] text-slate-400">Hiển thị <strong className="text-slate-600">{filtered.length}</strong> giao dịch</p><p className="text-[8px] font-semibold text-slate-400">Tổng theo bộ lọc: {money(filtered.reduce((sum, item) => sum + item.total, 0))}</p></div></div>
      <aside className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">Ca hiện tại</p>
              <p className="mt-2 text-lg font-black">08:00–20:30</p>
              <p className="mt-1 text-[8px] text-slate-400">Quản lý ca · Lê Hoàng Nam</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20">
              <RefreshCcw className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/7 p-3">
              <p className="text-[7px] text-slate-400">Tiền mặt</p>
              <p className="mt-1 text-[11px] font-black">
                {money(scoped.filter((item) => item.method === 'CASH').reduce((sum, item) => sum + item.paid, 0))}
              </p>
            </div>
            <div className="rounded-xl bg-white/7 p-3">
              <p className="text-[7px] text-slate-400">Điện tử</p>
              <p className="mt-1 text-[11px] font-black">
                {money(scoped.filter((item) => item.method && item.method !== 'CASH').reduce((sum, item) => sum + item.paid, 0))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!requireManage()) return;
              const expected = 2000000 + scoped.filter((item) => item.method === 'CASH').reduce((sum, item) => sum + item.paid, 0);
              setActualCashInput(String(expected));
              setShiftModalOpen(true);
            }}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/8 text-[8px] font-black text-white shadow-none hover:bg-white/15"
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            Kiểm đếm & đóng ca
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-800">Việc cần xử lý</p>
              <p className="mt-1 text-[8px] text-slate-400">Ưu tiên theo rủi ro tài chính</p>
            </div>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 space-y-2">
            {[
              { label: 'Hóa đơn còn công nợ', value: scoped.filter((item) => item.paid < item.total).length, tone: 'text-amber-600 bg-amber-50' },
              { label: 'Giao dịch lỗi cần kiểm tra', value: scoped.filter((item) => item.status === 'FAILED').length, tone: 'text-rose-600 bg-rose-50' },
              { label: 'Hoàn tiền chờ đối soát', value: scoped.filter((item) => item.refunded > 0).length, tone: 'text-violet-600 bg-violet-50' }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-[8px] font-bold text-slate-600">{item.label}</span>
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[8px] font-black ${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>

    {shiftModalOpen && (() => {
      const cashRevenue = scoped.filter((item) => item.method === 'CASH').reduce((sum, item) => sum + item.paid, 0);
      const nonCashRevenue = scoped.filter((item) => item.method && item.method !== 'CASH').reduce((sum, item) => sum + item.paid, 0);
      const expectedCash = 2000000 + cashRevenue;
      const actualCashNum = Number(actualCashInput) || 0;
      const cashDiff = actualCashNum - expectedCash;

      return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Đóng biểu mẫu kiểm đếm ca"
            onClick={() => setShiftModalOpen(false)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-modal-title"
            className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Quy trình đóng ca & kiểm kê két</p>
                </div>
                <h2 id="shift-modal-title" className="mt-1 text-xl font-black text-slate-950">
                  Kiểm đếm tiền & Đóng ca làm việc
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Ca 08:00–20:30 · Quản lý ca: Lê Hoàng Nam · Chi nhánh {selectedBranch === 'ALL' ? 'Quận 3' : selectedBranch}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShiftModalOpen(false)}
                aria-label="Đóng"
                className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
              <div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[9px] font-bold text-violet-300">Chi tiết doanh thu ca làm việc</span>
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[8px] font-black text-emerald-300 ring-1 ring-emerald-400/20">
                    Đang hoạt động
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/7 p-3">
                    <p className="text-[7px] text-slate-400">Tiền mặt đầu ca</p>
                    <p className="mt-1 text-[11px] font-black text-white">{money(2000000)}</p>
                  </div>
                  <div className="rounded-xl bg-white/7 p-3">
                    <p className="text-[7px] text-slate-400">Thu tiền mặt trong ca</p>
                    <p className="mt-1 text-[11px] font-black text-emerald-400">+{money(cashRevenue)}</p>
                  </div>
                  <div className="rounded-xl bg-white/7 p-3 sm:col-span-1">
                    <p className="text-[7px] text-slate-400">Thu điện tử / ngân hàng</p>
                    <p className="mt-1 text-[11px] font-black text-violet-300">+{money(nonCashRevenue)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/10 p-3">
                  <span className="text-[8px] font-bold text-slate-300">Tổng tiền mặt lý thuyết trong két</span>
                  <span className="text-sm font-black text-emerald-300">{money(expectedCash)}</span>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-[9px] font-black text-slate-800">Kiểm kê thực tế tại két tiền</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số tiền mặt kiểm đếm thực tế (VNĐ) *</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={actualCashInput}
                      onChange={(e) => setActualCashInput(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-900 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                </div>

                <div className={`flex items-center justify-between rounded-xl p-3 text-[8px] font-bold ${
                  cashDiff === 0 ? 'bg-emerald-50 text-emerald-800' : cashDiff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  <span>Chênh lệch kiểm kê:</span>
                  <span className="text-[10px] font-black">
                    {cashDiff === 0 ? '✓ Khớp hoàn toàn' : cashDiff > 0 ? `Thừa +${money(cashDiff)}` : `Thiếu -${money(Math.abs(cashDiff))}`}
                  </span>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[8px] font-bold text-slate-600">Ghi chú bàn giao & niêm phong két</span>
                  <textarea
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    placeholder="Ghi chú tiền lẻ còn lại, hóa đơn nghi vấn hoặc bàn giao ca tiếp theo..."
                    className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </label>
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
              <p className="hidden text-[8px] font-semibold text-slate-400 sm:block">
                Biên bản kiểm kê két sẽ được lưu vào nhật ký đối soát tenant.
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShiftModalOpen(false);
                    onNotify?.('Đã hoàn tất kiểm đếm và đóng ca làm việc thành công.');
                  }}
                  className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Xác nhận đóng ca
                </button>
              </div>
            </footer>
          </div>
        </div>
      );
    })()}

    {createOpen && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"><button type="button" aria-label="Đóng biểu mẫu tạo hóa đơn" onClick={() => setCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitInvoice} role="dialog" aria-modal="true" aria-labelledby="create-invoice-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Hóa đơn thủ công</p><h2 id="create-invoice-title" className="mt-1 text-xl font-black text-slate-950">Tạo hóa đơn mới</h2><p className="mt-1 text-[9px] text-slate-500">Tạo hóa đơn dịch vụ hoặc bán lẻ trong phạm vi tenant.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">{formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}<fieldset><legend className="mb-3 text-[9px] font-black text-slate-800">Khách hàng & nguồn hóa đơn</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tên khách hàng *</span><input value={invoice.customer} onChange={(event) => setInvoice((current) => ({ ...current, customer: event.target.value }))} placeholder="Nguyễn Minh Anh" className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số điện thoại *</span><input inputMode="tel" value={invoice.phone} onChange={(event) => setInvoice((current) => ({ ...current, phone: event.target.value }))} placeholder="0912 345 678" className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Chi nhánh *</span><BeautifulSelect value={invoice.branch} disabled={branchLocked} onChange={(event) => setInvoice((current) => ({ ...current, branch: event.target.value as BranchCode }))} className={invoiceInputClass}><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã lịch hẹn (không bắt buộc)</span><input value={invoice.appointmentId} onChange={(event) => setInvoice((current) => ({ ...current, appointmentId: event.target.value }))} placeholder="APT-..." className={invoiceInputClass} /></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 text-[9px] font-black text-slate-800">Dịch vụ & thành tiền</legend><div className="grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tên dịch vụ / sản phẩm *</span><input value={invoice.itemName} onChange={(event) => setInvoice((current) => ({ ...current, itemName: event.target.value }))} placeholder="Ví dụ: Gel Manicure + Nail Art" className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Nhân viên phụ trách *</span><input value={invoice.staff} onChange={(event) => setInvoice((current) => ({ ...current, staff: event.target.value }))} placeholder="Tên kỹ thuật viên" className={invoiceInputClass} /></label><div className="grid grid-cols-[100px_1fr] gap-3"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số lượng *</span><input type="number" min="1" step="1" value={invoice.quantity} onChange={(event) => setInvoice((current) => ({ ...current, quantity: event.target.value }))} className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đơn giá *</span><input type="number" min="1" step="1000" value={invoice.unitPrice} onChange={(event) => setInvoice((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="0" className={invoiceInputClass} /></label></div><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Giảm giá</span><input type="number" min="0" step="1000" value={invoice.discount} onChange={(event) => setInvoice((current) => ({ ...current, discount: event.target.value }))} className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tiền tip</span><input type="number" min="0" step="1000" value={invoice.tip} onChange={(event) => setInvoice((current) => ({ ...current, tip: event.target.value }))} className={invoiceInputClass} /></label></div><div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] text-white"><div className="p-4"><p className="text-[8px] font-bold text-slate-400">Tạm tính</p><p className="mt-1 text-base font-black">{money(invoiceSubtotal)}</p></div><div className="border-l border-white/10 p-4"><p className="text-[8px] font-bold text-violet-300">Tổng hóa đơn</p><p className="mt-1 text-base font-black">{money(invoiceTotal)}</p></div></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 text-[9px] font-black text-slate-800">Thanh toán ban đầu</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đã thu / tiền cọc</span><input type="number" min="0" max={invoiceTotal || undefined} step="1000" value={invoice.deposit} onChange={(event) => setInvoice((current) => ({ ...current, deposit: event.target.value }))} className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Phương thức</span><BeautifulSelect value={invoice.method} onChange={(event) => setInvoice((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className={invoiceInputClass}>{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label>{Number(invoice.deposit) > 0 && invoice.method !== 'CASH' && <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã giao dịch *</span><input value={invoice.reference} onChange={(event) => setInvoice((current) => ({ ...current, reference: event.target.value }))} placeholder="Mã ngân hàng hoặc cổng thanh toán" className={invoiceInputClass} /></label>}<label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Ghi chú</span><textarea value={invoice.note} onChange={(event) => setInvoice((current) => ({ ...current, note: event.target.value }))} placeholder="Thông tin cần lưu cùng hóa đơn..." className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label></div></fieldset></div><footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7"><p className="hidden text-[8px] font-semibold text-slate-400 sm:block">Hóa đơn được lưu vào nhật ký kiểm soát tenant.</p><div className="ml-auto flex gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><ReceiptText className="h-4 w-4" />Tạo hóa đơn</button></div></footer></form></div>}

    {selected && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><button type="button" aria-label="Đóng chi tiết hóa đơn" onClick={() => setSelected(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><section role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wide text-violet-600">{selected.id}</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selected.status].badge}`}>{statusMeta[selected.status].label}</span></div><h2 id="payment-detail-title" className="mt-2 text-xl font-black text-slate-950">Chi tiết thanh toán</h2><p className="mt-1 text-[9px] text-slate-400">{selected.createdAt} · Chi nhánh {selected.branch === 'Q3' ? 'Quận 3' : 'Quận 1'}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"><div className="space-y-4"><div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-300">Tổng thanh toán</p><p className="mt-2 text-3xl font-black tracking-tight">{money(selected.total)}</p><p className="mt-2 text-[9px] text-slate-400">Đã thu {money(selected.paid)} · Còn {money(Math.max(0, selected.total - selected.paid))}</p></div><ReceiptText className="h-6 w-6 text-violet-300" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${Math.min(100, selected.total ? selected.paid / selected.total * 100 : 0)}%` }} /></div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><UserRound className="h-4 w-4" /></span><div><p className="text-[11px] font-black text-slate-900">{selected.customer}</p><p className="mt-1 text-[8px] text-slate-400">{selected.phone} · {selected.appointmentId || 'Khách vãng lai'}</p><p className="mt-2 text-[8px] font-semibold text-slate-500">Thu ngân: {selected.cashier} · {selected.source}</p></div></div></div><div className="rounded-2xl border border-slate-200"><div className="border-b border-slate-100 px-4 py-3"><p className="text-[9px] font-black text-slate-800">Dịch vụ & sản phẩm</p></div><div className="divide-y divide-slate-100">{selected.items.map((item) => <div key={item.name} className="flex items-start justify-between gap-3 px-4 py-3"><div><p className="text-[9px] font-black text-slate-700">{item.name} × {item.quantity}</p><p className="mt-1 text-[8px] text-slate-400">Phụ trách: {item.staff}</p></div><p className="text-[9px] font-black text-slate-800">{money(item.amount)}</p></div>)}</div><div className="space-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[8px]"><div className="flex justify-between text-slate-500"><span>Tạm tính</span><strong>{money(selected.subtotal)}</strong></div><div className="flex justify-between text-slate-500"><span>Giảm giá</span><strong>-{money(selected.discount)}</strong></div><div className="flex justify-between text-slate-500"><span>Tiền tip</span><strong>+{money(selected.tip)}</strong></div><div className="flex justify-between border-t border-slate-200 pt-2 text-[10px] font-black text-slate-900"><span>Tổng cộng</span><span>{money(selected.total)}</span></div></div></div></div><div className="space-y-4"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase text-slate-400">Phương thức & đối soát</p><div className="mt-3"><MethodBadge method={selected.method} /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Mã giao dịch</p><p className="mt-1 truncate text-[8px] font-black text-slate-700">{selected.reference || 'Chưa có'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Tiền đặt cọc</p><p className="mt-1 text-[8px] font-black text-slate-700">{money(selected.deposit)}</p></div></div>{selected.refunded > 0 && <div className="mt-3 rounded-xl bg-rose-50 p-3"><p className="text-[8px] font-black text-rose-700">Đã hoàn {money(selected.refunded)}</p><p className="mt-1 text-[7px] text-rose-500">Giá trị thuần còn lại {money(selected.paid - selected.refunded)}</p></div>}</div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[9px] font-black text-slate-800">Nhật ký kiểm soát</p><div className="mt-3 space-y-3">{selected.audit.map((item, index) => <div key={`${item}-${index}`} className="flex gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-violet-500' : 'bg-slate-300'}`} /><p className="text-[8px] leading-4 text-slate-500">{item}</p></div>)}</div></div>{selected.note && <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[8px] font-black uppercase text-amber-600">Ghi chú tài chính</p><p className="mt-2 text-[8px] leading-5 text-amber-800">{selected.note}</p></div>}<div className="flex items-start gap-2 rounded-2xl bg-violet-50 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><p className="text-[8px] leading-4 text-violet-700">Mọi cập nhật đều gắn với tài khoản, thời gian và phạm vi tenant để phục vụ kiểm toán nội bộ.</p></div></div></div></div><footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-[8px] font-semibold text-slate-400">Thao tác dưới quyền {roleLabel}</p><div className="flex flex-wrap justify-end gap-2">{selected.status !== 'REFUNDED' && selected.paid < selected.total && <button type="button" onClick={() => openCapture(selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[8px] font-black text-white shadow-sm disabled:opacity-50"><CircleDollarSign className="h-3.5 w-3.5" />Thu phần còn lại</button>}{selected.status !== 'REFUNDED' && selected.paid - selected.refunded > 0 && <button type="button" onClick={() => openRefund(selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-rose-200 bg-rose-50 px-4 text-[8px] font-black text-rose-700 shadow-sm disabled:opacity-50"><ArrowDownRight className="h-3.5 w-3.5" />Hoàn tiền</button>}<button type="button" onClick={() => onNotify?.(`Đã chuẩn bị bản in ${selected.id}.`)} className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-black text-slate-600 shadow-sm"><FileText className="h-3.5 w-3.5" />In hóa đơn</button></div></footer></section></div>}

    {captureOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setCaptureOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCapture} className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5"><div><p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Thu tiền tại quầy</p><h2 className="mt-1 text-lg font-black text-slate-900">Ghi nhận thanh toán</h2><p className="mt-1 text-[9px] text-slate-500">Kiểm tra đúng số tiền và mã giao dịch trước khi xác nhận.</p></div><button type="button" onClick={() => setCaptureOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="grid gap-4 p-5 sm:grid-cols-2">{formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700 sm:col-span-2"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}<label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Hóa đơn cần thu *</span><BeautifulSelect value={capture.invoiceId} onChange={(event) => { const target = records.find((item) => item.id === event.target.value); setCapture((current) => ({ ...current, invoiceId: event.target.value, amount: String(target ? target.total - target.paid : 0) })); }} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]">{scoped.filter((item) => item.status !== 'REFUNDED' && item.paid < item.total).map((item) => <option key={item.id} value={item.id}>{item.id} · {item.customer} · Còn {money(item.total - item.paid)}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số tiền thu *</span><input type="number" min="0" step="1" value={capture.amount} onChange={(event) => setCapture((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Phương thức *</span><BeautifulSelect value={capture.method} onChange={(event) => setCapture((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]">{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã giao dịch {capture.method === 'CASH' ? '(không bắt buộc)' : '*'}</span><input value={capture.reference} onChange={(event) => setCapture((current) => ({ ...current, reference: event.target.value }))} placeholder={capture.method === 'CASH' ? 'Tự động tạo mã phiếu thu' : 'Nhập mã từ ngân hàng hoặc cổng thanh toán'} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-[10px] outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setCaptureOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-lg shadow-emerald-200"><Check className="h-4 w-4" />Xác nhận đã thu</button></footer></form></div>}

    {refundOpen && selected && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu hoàn tiền" onClick={() => setRefundOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitRefund} className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5"><div><p className="text-[9px] font-black uppercase tracking-wide text-rose-600">Kiểm soát hoàn tiền</p><h2 className="mt-1 text-lg font-black text-slate-900">Hoàn tiền {selected.id}</h2><p className="mt-1 text-[9px] text-slate-500">Có thể hoàn tối đa {money(selected.paid - selected.refunded)}.</p></div><button type="button" onClick={() => setRefundOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="space-y-4 p-5">{formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}<label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số tiền hoàn *</span><input type="number" min="0" step="1" value={refund.amount} onChange={(event) => setRefund((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Lý do hoàn tiền *</span><textarea value={refund.reason} onChange={(event) => setRefund((current) => ({ ...current, reason: event.target.value }))} placeholder="Mô tả lý do, phạm vi dịch vụ và người đã xác nhận..." className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100" /></label><div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-[8px] leading-4 text-amber-800"><ShieldCheck className="h-4 w-4 shrink-0" />Thao tác hoàn tiền được lưu vào nhật ký kiểm soát và cần được đối soát lại với cổng thanh toán.</div></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setRefundOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-200"><ArrowDownRight className="h-4 w-4" />Xác nhận hoàn tiền</button></footer></form></div>}
    {catalogCreateOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6">
        <button type="button" aria-label="Đóng biểu mẫu tạo hóa đơn" onClick={() => setCatalogCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
        <form onSubmit={submitInvoice} role="dialog" aria-modal="true" aria-labelledby="catalog-create-invoice-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Tenant Admin · Hóa đơn thủ công</p>
              <h2 id="catalog-create-invoice-title" className="mt-1 text-xl font-black text-slate-950">Tạo hóa đơn mới</h2>
              <p className="mt-1 text-[9px] text-slate-500">Chọn dịch vụ và nhân viên trực tiếp từ danh mục của salon.</p>
            </div>
            <button type="button" onClick={() => setCatalogCreateOpen(false)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
            {formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}
            <fieldset>
              <legend className="mb-3 text-[9px] font-black text-slate-800">Khách hàng & nguồn hóa đơn</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tên khách hàng *</span><input value={invoice.customer} onChange={(event) => setInvoice((current) => ({ ...current, customer: event.target.value }))} placeholder="Nguyễn Minh Anh" className={invoiceInputClass} /></label>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số điện thoại *</span><input inputMode="tel" value={invoice.phone} onChange={(event) => setInvoice((current) => ({ ...current, phone: event.target.value }))} placeholder="0912 345 678" className={invoiceInputClass} /></label>
                <label>
                  <span className="mb-1.5 block text-[8px] font-bold text-slate-600">Chi nhánh *</span>
                  <BeautifulSelect value={invoice.branch} disabled={branchLocked} onChange={(event) => { setInvoice((current) => ({ ...current, branch: event.target.value as BranchCode, category: 'ALL', itemName: '', unitPrice: '', quantity: '1', staff: '' })); setInvoiceItems([]); }} className={invoiceInputClass}>
                    <option value="Q3">Chi nhánh Quận 3</option>
                    <option value="Q1">Chi nhánh Quận 1</option>
                  </BeautifulSelect>
                </label>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã lịch hẹn (không bắt buộc)</span><input value={invoice.appointmentId} onChange={(event) => setInvoice((current) => ({ ...current, appointmentId: event.target.value }))} placeholder="APT-..." className={invoiceInputClass} /></label>
              </div>
            </fieldset>
            <fieldset className="border-t border-slate-100 pt-5">
              <legend className="mb-3 text-[9px] font-black text-slate-800">Chọn dịch vụ & nhân viên</legend>
              <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><p className="text-[9px] font-black text-slate-800">Bảng dịch vụ</p><p className="mt-0.5 text-[7px] text-slate-400">{availableInvoiceServices.length} dịch vụ phù hợp · có thể chọn nhiều dòng</p></div>
                      {invoiceItems.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[7px] font-black text-violet-700"><Check className="h-3 w-3" />Đã chọn {invoiceItems.length} dịch vụ</span>}
                    </div>
                    <div className="relative mt-3">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Tìm mã, tên hoặc danh mục dịch vụ..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[9px] font-semibold outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
                    </div>
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                      <button type="button" onClick={() => setInvoice((current) => ({ ...current, category: 'ALL' }))} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[7px] font-black ${invoice.category === 'ALL' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>Tất cả</button>
                      {Object.entries(serviceCategoryLabels).map(([value, label]) => <button key={value} type="button" onClick={() => setInvoice((current) => ({ ...current, category: value as ServiceCategory }))} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[7px] font-black ${invoice.category === value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{label}</button>)}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full min-w-[650px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[7px] font-black uppercase text-slate-400"><tr><th className="w-10 px-3 py-2.5">Chọn</th><th className="px-3 py-2.5">Dịch vụ</th><th className="w-24 px-3 py-2.5 text-center">Số lượng</th><th className="px-3 py-2.5">Danh mục</th><th className="px-3 py-2.5 text-right">Đơn giá</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableInvoiceServices.map((service) => {
                          const selectedItem = invoiceItems.find((item) => item.id === service.id);
                          const active = Boolean(selectedItem);
                          return <tr key={service.id} onClick={() => toggleInvoiceService(service)} className={`cursor-pointer transition-colors ${active ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-3"><button type="button" aria-label={`${active ? 'Bỏ chọn' : 'Chọn'} dịch vụ ${service.name}`} aria-pressed={active} onClick={(event) => { event.stopPropagation(); toggleInvoiceService(service); }} className={`flex h-5 w-5 items-center justify-center rounded-md border p-0 ${active ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check className="h-3 w-3" /></button></td>
                            <td className="px-3 py-3"><p className="text-[9px] font-black text-slate-800">{service.name}</p><p className="mt-0.5 text-[7px] font-semibold text-slate-400">{service.id}</p></td>
                            <td className="px-3 py-3"><input type="number" min="0" step="1" aria-label={`Số lượng ${service.name}`} value={selectedItem?.quantity || 0} onClick={(event) => event.stopPropagation()} onChange={(event) => updateInvoiceServiceQuantity(service, Number(event.target.value))} className={`h-8 w-16 rounded-lg border px-2 text-center text-[9px] font-black outline-none focus:ring-4 ${active ? 'border-violet-300 bg-white text-violet-700 focus:border-violet-500 focus:ring-violet-100' : 'border-slate-200 bg-slate-50 text-slate-500 focus:border-violet-400 focus:ring-violet-100'}`} /></td>
                            <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[7px] font-bold text-slate-600">{serviceCategoryLabels[service.category]}</span></td>
                            <td className="px-3 py-3 text-right text-[9px] font-black text-slate-800">{money(service.price)}</td>
                          </tr>;
                        })}
                        {!availableInvoiceServices.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-[8px] font-semibold text-slate-400">Không tìm thấy dịch vụ phù hợp.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2"><div><p className="text-[9px] font-black text-slate-800">Bảng nhân viên</p><p className="mt-0.5 text-[7px] text-slate-400">{availableInvoiceStaff.length} nhân viên tại chi nhánh</p></div>{invoice.staff && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[7px] font-black text-emerald-700"><Check className="h-3 w-3" />Đã chọn</span>}</div>
                    <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} placeholder="Tìm tên hoặc vai trò nhân viên..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[9px] font-semibold outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></div>
                  </div>
                  <div className="max-h-[313px] overflow-auto">
                    <table className="w-full min-w-[360px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[7px] font-black uppercase text-slate-400"><tr><th className="w-10 px-3 py-2.5">Chọn</th><th className="px-3 py-2.5">Nhân viên</th><th className="px-3 py-2.5">Vai trò</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableInvoiceStaff.map((staff) => {
                          const active = invoice.staff === staff.name;
                          return <tr key={staff.name} onClick={() => setInvoice((current) => ({ ...current, staff: staff.name }))} className={`cursor-pointer transition-colors ${active ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-3"><button type="button" aria-label={`Chọn nhân viên ${staff.name}`} aria-pressed={active} onClick={(event) => { event.stopPropagation(); setInvoice((current) => ({ ...current, staff: staff.name })); }} className={`flex h-5 w-5 items-center justify-center rounded-full border p-0 ${active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check className="h-3 w-3" /></button></td>
                            <td className="px-3 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[8px] font-black text-slate-700">{staff.name.split(' ').map((part) => part[0]).slice(-2).join('')}</span><div><p className="text-[9px] font-black text-slate-800">{staff.name}</p><p className="mt-0.5 text-[7px] text-slate-400">Chi nhánh {staff.branch}</p></div></div></td>
                            <td className="px-3 py-3 text-[8px] font-semibold text-slate-500">{staff.role}</td>
                          </tr>;
                        })}
                        {!availableInvoiceStaff.length && <tr><td colSpan={3} className="px-4 py-10 text-center text-[8px] font-semibold text-slate-400">Không tìm thấy nhân viên phù hợp.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* Phần chọn Mẫu Nail áp dụng theo Dịch vụ */}
              {invoiceItems.length > 0 && (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      <p className="text-[10px] font-black text-slate-800">
                        Chọn Mẫu Nail tương ứng cho dịch vụ
                      </p>
                    </div>
                    <span className="text-[8px] font-bold text-violet-700 bg-white px-2 py-0.5 rounded-full border border-violet-200">
                      Hiển thị các mẫu phù hợp theo liên kết ở trang Màu & mẫu Nail
                    </span>
                  </div>

                  <div className="space-y-3">
                    {invoiceItems.map((item) => {
                      const matchingDesigns = getMatchingDesignsForService(item.id, nailDesigns);
                      const hasDesigns = matchingDesigns.length > 0;
                      const currentDesign = matchingDesigns.find(
                        (d) => d.id === item.selectedDesignId
                      );

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black text-slate-900">
                                {item.name}
                              </span>
                              <span className="ml-2 text-[8px] font-bold text-slate-400">
                                [{item.id}]
                              </span>
                              <p className="text-[8px] text-slate-500 mt-0.5">
                                Giá dịch vụ nền:{' '}
                                <strong className="text-slate-800">{money(item.price)}</strong> / lượt
                              </p>
                            </div>

                            {hasDesigns ? (
                              <div className="w-full sm:w-80">
                                <BeautifulSelect
                                  value={item.selectedDesignId || 'NONE'}
                                  onChange={(e) => updateInvoiceServiceDesign(item.id, e.target.value)}
                                  className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/70 px-3 text-[9px] font-bold text-violet-950 focus:bg-white"
                                >
                                  <option value="NONE">
                                    -- Không chọn mẫu nail (Dùng giá dịch vụ nền) --
                                  </option>
                                  {matchingDesigns.map((design) => (
                                    <option key={design.id} value={design.id}>
                                      [{design.id}] {design.name} (+{money(design.surcharge)})
                                    </option>
                                  ))}
                                </BeautifulSelect>
                              </div>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[8px] font-semibold text-slate-500">
                                Chưa có mẫu nail liên kết với dịch vụ này
                              </span>
                            )}
                          </div>

                          {currentDesign && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-3.5 py-2 text-[8.5px]">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-bold text-amber-950">
                                  Mẫu đã chọn: <strong className="font-black text-amber-900">{currentDesign.name}</strong>
                                </span>
                                <span className="rounded bg-amber-200/80 px-2 py-0.5 font-mono text-[8px] font-black text-amber-900">
                                  Mã: {currentDesign.id}
                                </span>
                                <span className="font-black text-amber-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-300">
                                  Phụ thu mẫu: +{money(currentDesign.surcharge)}
                                </span>
                              </div>
                              <div className="font-black text-slate-800">
                                Tổng dòng: {money(item.price)} + {money(currentDesign.surcharge)} ={' '}
                                <span className="text-violet-700 font-black text-[9.5px]">
                                  {money((item.price + currentDesign.surcharge) * item.quantity)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Chọn Màu sơn sử dụng liên kết Kho vật tư */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <Palette className="h-3.5 w-3.5 text-violet-600" />
                              <span className="text-[9px] font-bold text-slate-700">Màu sơn sử dụng (Kho vật tư):</span>
                            </div>
                            <div className="w-full sm:w-80">
                              <BeautifulSelect
                                value={item.selectedColorId || 'NONE'}
                                onChange={(e) => updateInvoiceServiceColor(item.id, e.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[9px] font-bold text-slate-800 focus:bg-white"
                              >
                                <option value="NONE">-- Chọn màu sơn (Từ kho vật tư) --</option>
                                {nailColors.map((color) => {
                                  const isOut = color.status === 'OUT' || color.stock <= 0;
                                  const isLow = color.status === 'LOW' || color.stock <= color.minimumStock;
                                  return (
                                    <option key={color.id} value={color.id} disabled={isOut}>
                                      [{color.brand} {color.code}] {color.name} — {isOut ? '❌ HẾT HÀNG' : isLow ? `⚠️ Tồn thấp (${color.stock} chai)` : `Còn: ${color.stock} chai`}
                                    </option>
                                  );
                                })}
                              </BeautifulSelect>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã giảm giá</span><input value={invoice.discountCode} onChange={(event) => setInvoice((current) => ({ ...current, discountCode: event.target.value }))} placeholder="MEMBER5, SALON10, VIP15, LOY-003..." className={invoiceInputClass} />{promoEvaluation.feedback && <span className={`mt-1 block text-[7.5px] font-bold leading-tight ${promoEvaluation.feedback.isError ? 'text-rose-600' : 'text-emerald-600'}`}>{promoEvaluation.feedback.text}</span>}</label>
                <div><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Thuế VAT</span><div className="grid h-11 grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{['0', '5', '8', '10'].map((rate) => <button key={rate} type="button" onClick={() => setInvoice((current) => ({ ...current, taxRate: rate }))} className={`min-h-0 rounded-none border-0 border-r border-slate-200 px-1 text-[8px] font-black shadow-none last:border-r-0 ${invoice.taxRate === rate ? 'bg-violet-600 text-white' : 'bg-transparent text-slate-500'}`}>{rate}%</button>)}</div><span className="mt-1 block text-[7px] font-semibold text-slate-400">Tiền thuế: {money(invoiceTax)}</span></div>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tiền tip</span><input type="number" min="0" step="1000" value={invoice.tip} onChange={(event) => setInvoice((current) => ({ ...current, tip: event.target.value }))} className={invoiceInputClass} /></label>
              </div>

              {/* Tóm tắt hóa đơn tách rõ dịch vụ nền & phụ thu mẫu nail */}
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 text-white p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-violet-300">
                    Tóm tắt hóa đơn dịch vụ
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">
                    {invoiceItems.reduce((s, i) => s + i.quantity, 0)} lượt dịch vụ
                  </span>
                </div>

                <div className="space-y-2 text-[8.5px]">
                  {/* Dịch vụ nền */}
                  <div className="flex justify-between text-slate-300">
                    <span>Dịch vụ nền:</span>
                    <span className="font-bold">{money(invoiceBaseServicesSubtotal)}</span>
                  </div>

                  {/* Chi tiết từng mẫu nail */}
                  {invoiceItems.some((i) => i.selectedDesignName) ? (
                    invoiceItems
                      .filter((i) => i.selectedDesignName)
                      .map((i) => (
                        <div key={`summary-${i.id}`} className="flex justify-between text-amber-300 pl-3">
                          <span>
                            ↳ Mẫu nail đã chọn: <strong>{i.selectedDesignName}</strong> [{i.selectedDesignCode}]:
                          </span>
                          <span className="font-bold">+{money((i.selectedDesignSurcharge || 0) * i.quantity)}</span>
                        </div>
                      ))
                  ) : (
                    <div className="flex justify-between text-slate-400 pl-3 italic">
                      <span>↳ Mẫu nail đã chọn:</span>
                      <span>Chưa chọn mẫu (dùng giá dịch vụ nền)</span>
                    </div>
                  )}

                  {/* Phụ thu mẫu nail tổng */}
                  <div className="flex justify-between text-amber-400 pt-1 border-t border-white/5">
                    <span>Phụ thu mẫu nail:</span>
                    <span className="font-bold">+{money(invoiceNailSurchargeSubtotal)}</span>
                  </div>

                  {/* Tạm tính */}
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                    <span>Tạm tính (Dịch vụ nền + Phụ thu mẫu):</span>
                    <span>{money(invoiceSubtotal)}</span>
                  </div>

                  {/* Giảm giá */}
                  {invoiceDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Giảm giá ({promoEvaluation.appliedProgram?.name || invoice.discountCode}):</span>
                      <span className="font-bold">-{money(invoiceDiscount)}</span>
                    </div>
                  )}

                  {/* Thuế + Tip */}
                  {(invoiceTax > 0 || Number(invoice.tip) > 0) && (
                    <div className="flex justify-between text-slate-300">
                      <span>Thuế VAT ({invoice.taxRate}%) + Tip:</span>
                      <span className="font-bold">+{money(invoiceTax + Math.max(0, Number(invoice.tip) || 0))}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 font-black text-white">
                  <span className="text-violet-300 text-xs">TỔNG HÓA ĐƠN</span>
                  <span className="text-emerald-400 text-lg">{money(invoiceTotal)}</span>
                </div>
              </div>
            </fieldset>
            <fieldset className="border-t border-slate-100 pt-5">
              <legend className="mb-3 text-[9px] font-black text-slate-800">Trạng thái & thanh toán ban đầu</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Trạng thái hóa đơn *</span><div className="grid gap-2 sm:grid-cols-3">{(['PENDING', 'PARTIAL', 'PAID'] as const).map((status) => <button key={status} type="button" onClick={() => setInvoice((current) => ({ ...current, invoiceStatus: status, deposit: status === 'PENDING' ? '0' : current.deposit, reference: status === 'PENDING' ? '' : current.reference }))} className={`flex min-h-14 items-center justify-between rounded-xl border px-3 text-left shadow-none ${invoice.invoiceStatus === status ? status === 'PAID' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100' : status === 'PARTIAL' ? 'border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100' : 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100' : 'border-slate-200 bg-white text-slate-500'}`}><span><span className="block text-[9px] font-black">{statusMeta[status].label}</span><span className="mt-1 block text-[7px] font-semibold opacity-70">{status === 'PENDING' ? 'Chưa ghi nhận thu tiền' : status === 'PARTIAL' ? 'Đã thu một phần hóa đơn' : 'Đã thu đủ tổng hóa đơn'}</span></span><span className={`h-2.5 w-2.5 rounded-full ${statusMeta[status].dot}`} /></button>)}</div></div>
                {invoice.invoiceStatus === 'PENDING' ? <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-[8px] font-semibold text-blue-700 sm:col-span-2"><Clock3 className="h-4 w-4 shrink-0" />Hóa đơn được tạo với công nợ {money(invoiceTotal)} và chưa ghi nhận phương thức thanh toán.</div> : <>
                  {invoice.invoiceStatus === 'PARTIAL' ? <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số tiền đã thu *</span><input type="number" min="0" max={Math.max(0, invoiceTotal - 1)} step="1" value={invoice.deposit} onChange={(event) => setInvoice((current) => ({ ...current, deposit: event.target.value }))} className={invoiceInputClass} /></label> : <div><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số tiền đã thu</span><div className="flex h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700">{money(invoiceTotal)}</div></div>}
                  <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Phương thức *</span><BeautifulSelect value={invoice.method} onChange={(event) => setInvoice((current) => ({ ...current, method: event.target.value as PaymentMethod, reference: event.target.value === 'CASH' ? '' : current.reference }))} className={invoiceInputClass}>{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label>
                  {invoice.method !== 'CASH' && <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã giao dịch *</span><input value={invoice.reference} onChange={(event) => setInvoice((current) => ({ ...current, reference: event.target.value }))} placeholder="Mã ngân hàng hoặc cổng thanh toán" className={invoiceInputClass} /></label>}
                </>}
                <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Ghi chú</span><textarea value={invoice.note} onChange={(event) => setInvoice((current) => ({ ...current, note: event.target.value }))} placeholder="Thông tin cần lưu cùng hóa đơn..." className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
              </div>
            </fieldset>
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
            <p className="hidden text-[8px] font-semibold text-slate-400 sm:block">Giá lấy từ bảng dịch vụ; giảm giá, thuế và tip được lưu trong chi tiết hóa đơn.</p>
            <div className="ml-auto flex gap-2"><button type="button" onClick={() => setCatalogCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><ReceiptText className="h-4 w-4" />Tạo hóa đơn</button></div>
          </footer>
        </form>
      </div>
    )}
  </div>;
}
