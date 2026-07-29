import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Banknote, Check, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, Download, FileText, Landmark, LockKeyhole,
  MoreHorizontal, Plus, ReceiptText, RefreshCcw, Search, ShieldCheck, Smartphone,
  UserRound, WalletCards, X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';

type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED' | 'FAILED';
type PaymentMethod = 'CASH' | 'BANK' | 'CARD' | 'MOMO' | 'ZALOPAY';
type BranchCode = 'Q1' | 'Q3';
type ServiceCategory = 'ALL' | 'NAIL_ART' | 'MANICURE' | 'PEDICURE' | 'GEL' | 'ACRYLIC' | 'SPA';

interface PaymentItem { name: string; quantity: number; amount: number; staff: string; }
interface PaymentRecord {
  id: string; appointmentId?: string; customer: string; phone: string; branch: BranchCode;
  createdAt: string; total: number; subtotal: number; discount: number; tip: number; deposit: number;
  paid: number; refunded: number; status: PaymentStatus; method?: PaymentMethod; reference?: string;
  cashier: string; source: string; items: PaymentItem[]; note?: string; audit: string[];
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
  const [records, setRecords] = useState<PaymentRecord[]>(() => { if (typeof window === 'undefined') return getTenantAdminInitialData(null, seed); try { const stored = localStorage.getItem(storageKey); return getTenantAdminInitialData(stored ? JSON.parse(stored) as PaymentRecord[] : null, seed); } catch { return getTenantAdminInitialData(null, seed); } });
  const [tab, setTab] = useState<'ALL' | PaymentStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [catalogCreateOpen, setCatalogCreateOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [invoice, setInvoice] = useState({
    customer: '', phone: '', branch: (selectedBranch === 'Q1' ? 'Q1' : 'Q3') as BranchCode,
    appointmentId: '', category: 'ALL' as ServiceCategory, itemName: '', quantity: '1', unitPrice: '', staff: '',
    discount: '0', tip: '0', deposit: '0', method: 'CASH' as PaymentMethod,
    reference: '', note: ''
  });
  const [capture, setCapture] = useState({ invoiceId: 'INV-7822', method: 'BANK' as PaymentMethod, amount: '580000', reference: '' });
  const [refund, setRefund] = useState({ amount: '', reason: '' });
  const canManage = accessMode === 'full' && !readOnlyReason;

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(records)); }, [records, storageKey]);
  useEffect(() => { if (!selected && !createOpen && !catalogCreateOpen && !captureOpen && !refundOpen) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setCreateOpen(false); setCatalogCreateOpen(false); setCaptureOpen(false); setRefundOpen(false); } }; addEventListener('keydown', close); return () => { document.body.style.overflow = previous; removeEventListener('keydown', close); }; }, [captureOpen, catalogCreateOpen, createOpen, refundOpen, selected]);

  const requireManage = () => { if (canManage) return true; onNotify?.(readOnlyReason || 'Gói hiện tại chỉ cho phép xem dữ liệu thanh toán.'); return false; };
  const scoped = records.filter((record) => selectedBranch === 'ALL' || record.branch === selectedBranch);
  const filtered = useMemo(() => { const query = searchQuery.trim().toLowerCase(); return records.filter((record) => selectedBranch === 'ALL' || record.branch === selectedBranch).filter((record) => tab === 'ALL' || record.status === tab).filter((record) => methodFilter === 'ALL' || record.method === methodFilter).filter((record) => !query || `${record.id} ${record.appointmentId || ''} ${record.customer} ${record.phone} ${record.reference || ''}`.toLowerCase().includes(query)); }, [methodFilter, records, searchQuery, selectedBranch, tab]);
  const collected = scoped.reduce((sum, record) => sum + record.paid, 0);
  const outstanding = scoped.reduce((sum, record) => sum + Math.max(0, record.total - record.paid), 0);
  const refunded = scoped.reduce((sum, record) => sum + record.refunded, 0);
  const netRevenue = collected - refunded;
  const availableInvoiceServices = invoiceServiceCatalog.filter((service) =>
    service.branches.includes(invoice.branch) && (invoice.category === 'ALL' || service.category === invoice.category)
  );
  const availableInvoiceStaff = invoiceStaffDirectory.filter((staff) => staff.branch === invoice.branch);
  const invoiceSubtotal = Math.max(0, Number(invoice.quantity) || 0) * Math.max(0, Number(invoice.unitPrice) || 0);
  const invoiceTotal = Math.max(0, invoiceSubtotal - Math.max(0, Number(invoice.discount) || 0) + Math.max(0, Number(invoice.tip) || 0));

  const openCreate = () => {
    if (!requireManage()) return;
    setInvoice({
      customer: '', phone: '', branch: (selectedBranch === 'Q1' ? 'Q1' : 'Q3') as BranchCode,
      appointmentId: '', category: 'ALL', itemName: '', quantity: '1', unitPrice: '', staff: '',
      discount: '0', tip: '0', deposit: '0', method: 'CASH', reference: '', note: ''
    });
    setSelected(null);
    setFormError('');
    setCatalogCreateOpen(true);
  };
  const submitInvoice = (event: FormEvent) => {
    event.preventDefault();
    const quantity = Number(invoice.quantity);
    const unitPrice = Number(invoice.unitPrice);
    const discount = Number(invoice.discount);
    const tip = Number(invoice.tip);
    const deposit = Number(invoice.deposit);
    const phoneDigits = invoice.phone.replace(/\D/g, '');
    if (!invoice.customer.trim() || !invoice.phone.trim() || !invoice.itemName.trim() || !invoice.staff.trim()) {
      setFormError('Vui lòng nhập đầy đủ khách hàng, số điện thoại, dịch vụ và nhân viên phụ trách.');
      return;
    }
    if (!/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(invoice.phone.trim()) || phoneDigits.length < 9) {
      setFormError('Số điện thoại chưa đúng định dạng Việt Nam.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || unitPrice <= 0 || discount < 0 || tip < 0 || deposit < 0) {
      setFormError('Số lượng và các giá trị tiền phải hợp lệ, không được là số âm.');
      return;
    }
    const subtotal = quantity * unitPrice;
    const total = Math.max(0, subtotal - discount + tip);
    if (discount > subtotal) {
      setFormError('Giảm giá không được lớn hơn tạm tính của hóa đơn.');
      return;
    }
    if (total <= 0) {
      setFormError('Tổng hóa đơn phải lớn hơn 0đ.');
      return;
    }
    if (deposit > total) {
      setFormError(`Số tiền đã thu không được vượt quá tổng hóa đơn ${money(total)}.`);
      return;
    }
    if (deposit > 0 && invoice.method !== 'CASH' && !invoice.reference.trim()) {
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
      tip,
      deposit,
      total,
      paid: deposit,
      refunded: 0,
      status: deposit >= total ? 'PAID' : deposit > 0 ? 'PARTIAL' : 'PENDING',
      method: deposit > 0 ? invoice.method : undefined,
      reference: deposit > 0 ? invoice.reference.trim() || `CASH-${Date.now().toString().slice(-6)}` : undefined,
      cashier: roleLabel,
      source: 'Tạo thủ công bởi Tenant Admin',
      items: [{ name: invoice.itemName.trim(), quantity, amount: subtotal, staff: invoice.staff.trim() }],
      note: invoice.note.trim() || undefined,
      audit: [`${createdAt} · ${roleLabel} tạo hóa đơn${deposit > 0 ? ` và ghi nhận đã thu ${money(deposit)}` : ''}`]
    };
    setRecords((current) => [newRecord, ...current]);
    setCreateOpen(false);
    setCatalogCreateOpen(false);
    setSelected(newRecord);
    setTab('ALL');
    onNotify?.(`Đã tạo hóa đơn ${newRecord.id} cho ${newRecord.customer}.`);
  };
  const openCapture = (record?: PaymentRecord) => { if (!requireManage()) return; const target = record || scoped.find((item) => item.paid < item.total); if (!target) { onNotify?.('Không có hóa đơn cần thu trong phạm vi đang chọn.'); return; } setCapture({ invoiceId: target.id, method: target.method || 'BANK', amount: String(Math.max(0, target.total - target.paid)), reference: '' }); setFormError(''); setCaptureOpen(true); };
  const submitCapture = (event: FormEvent) => { event.preventDefault(); const target = records.find((item) => item.id === capture.invoiceId); const amount = Number(capture.amount); if (!target || !amount || amount <= 0 || amount > target.total - target.paid) { setFormError('Số tiền thu phải lớn hơn 0 và không vượt quá công nợ còn lại.'); return; } if (capture.method !== 'CASH' && !capture.reference.trim()) { setFormError('Thanh toán điện tử bắt buộc có mã giao dịch để đối soát.'); return; } const nextPaid = target.paid + amount; const patch: Partial<PaymentRecord> = { paid: nextPaid, method: capture.method, reference: capture.reference.trim() || `CASH-${Date.now().toString().slice(-6)}`, status: nextPaid >= target.total ? 'PAID' : 'PARTIAL', audit: [`14:42 · ${roleLabel} ghi nhận ${money(amount)} qua ${methodMeta[capture.method].label}`, ...target.audit] }; setRecords((current) => current.map((item) => item.id === target.id ? { ...item, ...patch } : item)); setSelected((current) => current?.id === target.id ? { ...current, ...patch } as PaymentRecord : current); setCaptureOpen(false); onNotify?.(`Đã ghi nhận ${money(amount)} cho ${target.id}.`); };
  const openRefund = (record: PaymentRecord) => { if (!requireManage()) return; setRefund({ amount: '', reason: '' }); setFormError(''); setSelected(record); setRefundOpen(true); };
  const submitRefund = (event: FormEvent) => { event.preventDefault(); if (!selected) return; const amount = Number(refund.amount); const refundable = selected.paid - selected.refunded; if (!amount || amount <= 0 || amount > refundable) { setFormError(`Số tiền hoàn phải từ 1đ đến ${money(refundable)}.`); return; } if (refund.reason.trim().length < 8) { setFormError('Vui lòng nhập lý do hoàn tiền tối thiểu 8 ký tự.'); return; } const patch: Partial<PaymentRecord> = { refunded: selected.refunded + amount, status: 'REFUNDED', note: refund.reason.trim(), audit: [`14:45 · ${roleLabel} duyệt hoàn ${money(amount)} · ${refund.reason.trim()}`, ...selected.audit] }; setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, ...patch } : item)); setSelected((current) => current ? { ...current, ...patch } as PaymentRecord : current); setRefundOpen(false); onNotify?.(`Đã ghi nhận yêu cầu hoàn ${money(amount)} cho ${selected.id}.`); };
  const exportReport = () => { const header = 'Hoa don,Khach hang,Chi nhanh,Tong tien,Da thu,Hoan tien,Phuong thuc,Trang thai'; const body = filtered.map((record) => [record.id, record.customer, record.branch, record.total, record.paid, record.refunded, record.method ? methodMeta[record.method].label : 'Chua chon', statusMeta[record.status].label].join(',')).join('\n'); const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'doi-soat-thanh-toan.csv'; link.click(); URL.revokeObjectURL(link.href); onNotify?.('Đã xuất báo cáo đối soát theo bộ lọc hiện tại.'); };

  const MethodBadge = ({ method }: { method?: PaymentMethod }) => { if (!method) return <span className="text-[8px] font-bold text-slate-400">Chưa chọn</span>; const meta = methodMeta[method]; const Icon = meta.icon; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span>; };
  const invoiceInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-semibold text-slate-800 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';

  return <div className="space-y-5">
    <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đối soát trực tiếp · Cập nhật 14:42<span className="text-slate-300">•</span><span className="text-slate-500">{tenantName}</span></div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Thanh toán & đối soát</h1><p className="mt-2 text-[11px] text-slate-500">Theo dõi dòng tiền, công nợ, tiền cọc, hoàn tiền và lịch sử thao tác trên toàn tenant.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportReport} className="flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất đối soát</button><button type="button" onClick={openCreate} disabled={!canManage} className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Plus className="h-4 w-4" />Tạo hóa đơn</button><button type="button" onClick={() => openCapture()} disabled={!canManage} className="flex h-11 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[9px] font-black text-white shadow-lg shadow-emerald-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><CircleDollarSign className="h-4 w-4" />Ghi nhận thanh toán</button></div></section>

    <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? 'border-violet-100 bg-gradient-to-r from-violet-50 to-white' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4.5 w-4.5" /></span><div><p className="text-[10px] font-black text-slate-800">Phạm vi quyền: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{canManage ? 'Được xem mọi chi nhánh, ghi nhận tiền thu, xuất đối soát, xử lý hoàn tiền và xem nhật ký trong tenant; không truy cập dữ liệu tenant khác.' : readOnlyReason || 'Chỉ được xem giao dịch và báo cáo doanh thu.'}</p></div></div><span className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{canManage ? 'Toàn quyền tài chính tenant' : 'Chỉ xem'}</span></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Doanh thu thuần', value: money(netRevenue), detail: '+12,4% so với cùng kỳ', icon: ArrowUpRight, tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Đã thu', value: money(collected), detail: `${scoped.filter((item) => item.paid > 0).length} hóa đơn có phát sinh`, icon: CircleDollarSign, tone: 'bg-violet-50 text-violet-600' },
      { label: 'Còn phải thu', value: money(outstanding), detail: `${scoped.filter((item) => item.paid < item.total).length} hóa đơn cần xử lý`, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
      { label: 'Đã hoàn tiền', value: money(refunded), detail: `${scoped.filter((item) => item.refunded > 0).length} giao dịch trong kỳ`, icon: ArrowDownRight, tone: 'bg-rose-50 text-rose-600' }
    ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-lg font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p></article>)}</section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="relative w-full xl:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm hóa đơn, khách, mã giao dịch..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap gap-2"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} disabled={branchLocked} aria-label={branchLocked ? 'Chi nhánh được phân công' : 'Chọn chi nhánh'} className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả chi nhánh</option><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect><BeautifulSelect value={methodFilter} onChange={(event) => setMethodFilter(event.target.value as 'ALL' | PaymentMethod)} className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Mọi phương thức</option>{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></div></div><div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">{(['ALL', 'PAID', 'PARTIAL', 'PENDING', 'REFUNDED', 'FAILED'] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${tab === value ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>{value === 'ALL' ? 'Tất cả giao dịch' : statusMeta[value].label}<span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">{value === 'ALL' ? scoped.length : scoped.filter((item) => item.status === value).length}</span></button>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[930px] text-left"><thead><tr className="border-b border-slate-100 text-[8px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Hóa đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Đã thu / còn lại</th><th className="px-4 py-3">Phương thức</th><th className="px-5 py-3 text-right">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((record) => <tr key={record.id} onClick={() => setSelected(record)} className="cursor-pointer text-[9px] text-slate-600 hover:bg-slate-50"><td className="px-5 py-4"><p className="font-black text-slate-900">{record.id}</p><p className="mt-1 text-[8px] text-slate-400">{record.createdAt}</p></td><td className="px-4 py-4"><p className="font-black text-slate-800">{record.customer}</p><p className="mt-1 text-[8px] text-slate-400">{record.phone} · {record.branch}</p></td><td className="px-4 py-4 font-black text-slate-900">{money(record.total)}{record.refunded > 0 && <p className="mt-1 text-[8px] font-bold text-rose-500">Đã hoàn {money(record.refunded)}</p>}</td><td className="px-4 py-4"><p className="font-black text-emerald-700">{money(record.paid)}</p><p className="mt-1 text-[8px] text-slate-400">Còn {money(Math.max(0, record.total - record.paid))}</p></td><td className="px-4 py-4"><MethodBadge method={record.method} /></td><td className="px-5 py-4 text-right"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[record.status].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusMeta[record.status].dot}`} />{statusMeta[record.status].label}</span></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{filtered.map((record) => <button key={record.id} type="button" onClick={() => setSelected(record)} className="block h-auto w-full rounded-none border-0 bg-white p-4 text-left shadow-none"><span className="flex items-start justify-between gap-3"><span><span className="text-[9px] font-black text-slate-900">{record.id}</span><span className="mt-1 block text-[8px] text-slate-400">{record.customer} · {record.branch}</span></span><span className="text-[11px] font-black text-slate-900">{money(record.total)}</span></span><span className="mt-3 flex items-center justify-between"><MethodBadge method={record.method} /><span className={`rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${statusMeta[record.status].badge}`}>{statusMeta[record.status].label}</span></span></button>)}</div>{!filtered.length && <div className="py-16 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không có giao dịch phù hợp</p></div>}<div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3"><p className="text-[8px] text-slate-400">Hiển thị <strong className="text-slate-600">{filtered.length}</strong> giao dịch</p><p className="text-[8px] font-semibold text-slate-400">Tổng theo bộ lọc: {money(filtered.reduce((sum, item) => sum + item.total, 0))}</p></div></div>
      <aside className="space-y-4"><div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white shadow-lg"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">Ca hiện tại</p><p className="mt-2 text-lg font-black">08:00–20:30</p><p className="mt-1 text-[8px] text-slate-400">Quản lý ca · Lê Hoàng Nam</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20"><RefreshCcw className="h-4 w-4" /></span></div><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/7 p-3"><p className="text-[7px] text-slate-400">Tiền mặt</p><p className="mt-1 text-[11px] font-black">{money(scoped.filter((item) => item.method === 'CASH').reduce((sum, item) => sum + item.paid, 0))}</p></div><div className="rounded-xl bg-white/7 p-3"><p className="text-[7px] text-slate-400">Điện tử</p><p className="mt-1 text-[11px] font-black">{money(scoped.filter((item) => item.method && item.method !== 'CASH').reduce((sum, item) => sum + item.paid, 0))}</p></div></div><button type="button" onClick={() => canManage ? onNotify?.('Đã mở quy trình kiểm đếm và đóng ca.') : requireManage()} className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/8 text-[8px] font-black text-white shadow-none"><LockKeyhole className="h-3.5 w-3.5" />Kiểm đếm & đóng ca</button></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black text-slate-800">Việc cần xử lý</p><p className="mt-1 text-[8px] text-slate-400">Ưu tiên theo rủi ro tài chính</p></div><AlertCircle className="h-4 w-4 text-amber-500" /></div><div className="mt-3 space-y-2">{[{ label: 'Hóa đơn còn công nợ', value: scoped.filter((item) => item.paid < item.total).length, tone: 'text-amber-600 bg-amber-50' }, { label: 'Giao dịch lỗi cần kiểm tra', value: scoped.filter((item) => item.status === 'FAILED').length, tone: 'text-rose-600 bg-rose-50' }, { label: 'Hoàn tiền chờ đối soát', value: scoped.filter((item) => item.refunded > 0).length, tone: 'text-violet-600 bg-violet-50' }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-[8px] font-bold text-slate-600">{item.label}</span><span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[8px] font-black ${item.tone}`}>{item.value}</span></div>)}</div></div></aside></section>

    {createOpen && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"><button type="button" aria-label="Đóng biểu mẫu tạo hóa đơn" onClick={() => setCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitInvoice} role="dialog" aria-modal="true" aria-labelledby="create-invoice-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Hóa đơn thủ công</p><h2 id="create-invoice-title" className="mt-1 text-xl font-black text-slate-950">Tạo hóa đơn mới</h2><p className="mt-1 text-[9px] text-slate-500">Tạo hóa đơn dịch vụ hoặc bán lẻ trong phạm vi tenant.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">{formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}<fieldset><legend className="mb-3 text-[9px] font-black text-slate-800">Khách hàng & nguồn hóa đơn</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tên khách hàng *</span><input value={invoice.customer} onChange={(event) => setInvoice((current) => ({ ...current, customer: event.target.value }))} placeholder="Nguyễn Minh Anh" className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số điện thoại *</span><input inputMode="tel" value={invoice.phone} onChange={(event) => setInvoice((current) => ({ ...current, phone: event.target.value }))} placeholder="0912 345 678" className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Chi nhánh *</span><BeautifulSelect value={invoice.branch} disabled={branchLocked} onChange={(event) => setInvoice((current) => ({ ...current, branch: event.target.value as BranchCode }))} className={invoiceInputClass}><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã lịch hẹn (không bắt buộc)</span><input value={invoice.appointmentId} onChange={(event) => setInvoice((current) => ({ ...current, appointmentId: event.target.value }))} placeholder="APT-..." className={invoiceInputClass} /></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 text-[9px] font-black text-slate-800">Dịch vụ & thành tiền</legend><div className="grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tên dịch vụ / sản phẩm *</span><input value={invoice.itemName} onChange={(event) => setInvoice((current) => ({ ...current, itemName: event.target.value }))} placeholder="Ví dụ: Gel Manicure + Nail Art" className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Nhân viên phụ trách *</span><input value={invoice.staff} onChange={(event) => setInvoice((current) => ({ ...current, staff: event.target.value }))} placeholder="Tên kỹ thuật viên" className={invoiceInputClass} /></label><div className="grid grid-cols-[100px_1fr] gap-3"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số lượng *</span><input type="number" min="1" step="1" value={invoice.quantity} onChange={(event) => setInvoice((current) => ({ ...current, quantity: event.target.value }))} className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đơn giá *</span><input type="number" min="1" step="1000" value={invoice.unitPrice} onChange={(event) => setInvoice((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="0" className={invoiceInputClass} /></label></div><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Giảm giá</span><input type="number" min="0" step="1000" value={invoice.discount} onChange={(event) => setInvoice((current) => ({ ...current, discount: event.target.value }))} className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tiền tip</span><input type="number" min="0" step="1000" value={invoice.tip} onChange={(event) => setInvoice((current) => ({ ...current, tip: event.target.value }))} className={invoiceInputClass} /></label></div><div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] text-white"><div className="p-4"><p className="text-[8px] font-bold text-slate-400">Tạm tính</p><p className="mt-1 text-base font-black">{money(invoiceSubtotal)}</p></div><div className="border-l border-white/10 p-4"><p className="text-[8px] font-bold text-violet-300">Tổng hóa đơn</p><p className="mt-1 text-base font-black">{money(invoiceTotal)}</p></div></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 text-[9px] font-black text-slate-800">Thanh toán ban đầu</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đã thu / tiền cọc</span><input type="number" min="0" max={invoiceTotal || undefined} step="1000" value={invoice.deposit} onChange={(event) => setInvoice((current) => ({ ...current, deposit: event.target.value }))} className={invoiceInputClass} /></label><label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Phương thức</span><BeautifulSelect value={invoice.method} onChange={(event) => setInvoice((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className={invoiceInputClass}>{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label>{Number(invoice.deposit) > 0 && invoice.method !== 'CASH' && <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã giao dịch *</span><input value={invoice.reference} onChange={(event) => setInvoice((current) => ({ ...current, reference: event.target.value }))} placeholder="Mã ngân hàng hoặc cổng thanh toán" className={invoiceInputClass} /></label>}<label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Ghi chú</span><textarea value={invoice.note} onChange={(event) => setInvoice((current) => ({ ...current, note: event.target.value }))} placeholder="Thông tin cần lưu cùng hóa đơn..." className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label></div></fieldset></div><footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7"><p className="hidden text-[8px] font-semibold text-slate-400 sm:block">Hóa đơn được lưu vào nhật ký kiểm soát tenant.</p><div className="ml-auto flex gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><ReceiptText className="h-4 w-4" />Tạo hóa đơn</button></div></footer></form></div>}

    {selected && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><button type="button" aria-label="Đóng chi tiết hóa đơn" onClick={() => setSelected(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><section role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wide text-violet-600">{selected.id}</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selected.status].badge}`}>{statusMeta[selected.status].label}</span></div><h2 id="payment-detail-title" className="mt-2 text-xl font-black text-slate-950">Chi tiết thanh toán</h2><p className="mt-1 text-[9px] text-slate-400">{selected.createdAt} · Chi nhánh {selected.branch === 'Q3' ? 'Quận 3' : 'Quận 1'}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"><div className="space-y-4"><div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-300">Tổng thanh toán</p><p className="mt-2 text-3xl font-black tracking-tight">{money(selected.total)}</p><p className="mt-2 text-[9px] text-slate-400">Đã thu {money(selected.paid)} · Còn {money(Math.max(0, selected.total - selected.paid))}</p></div><ReceiptText className="h-6 w-6 text-violet-300" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${Math.min(100, selected.total ? selected.paid / selected.total * 100 : 0)}%` }} /></div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><UserRound className="h-4 w-4" /></span><div><p className="text-[11px] font-black text-slate-900">{selected.customer}</p><p className="mt-1 text-[8px] text-slate-400">{selected.phone} · {selected.appointmentId || 'Khách vãng lai'}</p><p className="mt-2 text-[8px] font-semibold text-slate-500">Thu ngân: {selected.cashier} · {selected.source}</p></div></div></div><div className="rounded-2xl border border-slate-200"><div className="border-b border-slate-100 px-4 py-3"><p className="text-[9px] font-black text-slate-800">Dịch vụ & sản phẩm</p></div><div className="divide-y divide-slate-100">{selected.items.map((item) => <div key={item.name} className="flex items-start justify-between gap-3 px-4 py-3"><div><p className="text-[9px] font-black text-slate-700">{item.name} × {item.quantity}</p><p className="mt-1 text-[8px] text-slate-400">Phụ trách: {item.staff}</p></div><p className="text-[9px] font-black text-slate-800">{money(item.amount)}</p></div>)}</div><div className="space-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[8px]"><div className="flex justify-between text-slate-500"><span>Tạm tính</span><strong>{money(selected.subtotal)}</strong></div><div className="flex justify-between text-slate-500"><span>Giảm giá</span><strong>-{money(selected.discount)}</strong></div><div className="flex justify-between text-slate-500"><span>Tiền tip</span><strong>+{money(selected.tip)}</strong></div><div className="flex justify-between border-t border-slate-200 pt-2 text-[10px] font-black text-slate-900"><span>Tổng cộng</span><span>{money(selected.total)}</span></div></div></div></div><div className="space-y-4"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase text-slate-400">Phương thức & đối soát</p><div className="mt-3"><MethodBadge method={selected.method} /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Mã giao dịch</p><p className="mt-1 truncate text-[8px] font-black text-slate-700">{selected.reference || 'Chưa có'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Tiền đặt cọc</p><p className="mt-1 text-[8px] font-black text-slate-700">{money(selected.deposit)}</p></div></div>{selected.refunded > 0 && <div className="mt-3 rounded-xl bg-rose-50 p-3"><p className="text-[8px] font-black text-rose-700">Đã hoàn {money(selected.refunded)}</p><p className="mt-1 text-[7px] text-rose-500">Giá trị thuần còn lại {money(selected.paid - selected.refunded)}</p></div>}</div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[9px] font-black text-slate-800">Nhật ký kiểm soát</p><div className="mt-3 space-y-3">{selected.audit.map((item, index) => <div key={`${item}-${index}`} className="flex gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-violet-500' : 'bg-slate-300'}`} /><p className="text-[8px] leading-4 text-slate-500">{item}</p></div>)}</div></div>{selected.note && <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[8px] font-black uppercase text-amber-600">Ghi chú tài chính</p><p className="mt-2 text-[8px] leading-5 text-amber-800">{selected.note}</p></div>}<div className="flex items-start gap-2 rounded-2xl bg-violet-50 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><p className="text-[8px] leading-4 text-violet-700">Mọi cập nhật đều gắn với tài khoản, thời gian và phạm vi tenant để phục vụ kiểm toán nội bộ.</p></div></div></div></div><footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-[8px] font-semibold text-slate-400">Thao tác dưới quyền {roleLabel}</p><div className="flex flex-wrap justify-end gap-2">{selected.paid < selected.total && <button type="button" onClick={() => openCapture(selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[8px] font-black text-white shadow-sm disabled:opacity-50"><CircleDollarSign className="h-3.5 w-3.5" />Thu phần còn lại</button>}{selected.paid - selected.refunded > 0 && <button type="button" onClick={() => openRefund(selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-rose-200 bg-rose-50 px-4 text-[8px] font-black text-rose-700 shadow-sm disabled:opacity-50"><ArrowDownRight className="h-3.5 w-3.5" />Hoàn tiền</button>}<button type="button" onClick={() => onNotify?.(`Đã chuẩn bị bản in ${selected.id}.`)} className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-black text-slate-600 shadow-sm"><FileText className="h-3.5 w-3.5" />In hóa đơn</button></div></footer></section></div>}

    {captureOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setCaptureOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitCapture} className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5"><div><p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Thu tiền tại quầy</p><h2 className="mt-1 text-lg font-black text-slate-900">Ghi nhận thanh toán</h2><p className="mt-1 text-[9px] text-slate-500">Kiểm tra đúng số tiền và mã giao dịch trước khi xác nhận.</p></div><button type="button" onClick={() => setCaptureOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="grid gap-4 p-5 sm:grid-cols-2">{formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700 sm:col-span-2"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}<label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Hóa đơn cần thu *</span><BeautifulSelect value={capture.invoiceId} onChange={(event) => { const target = records.find((item) => item.id === event.target.value); setCapture((current) => ({ ...current, invoiceId: event.target.value, amount: String(target ? target.total - target.paid : 0) })); }} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]">{scoped.filter((item) => item.paid < item.total).map((item) => <option key={item.id} value={item.id}>{item.id} · {item.customer} · Còn {money(item.total - item.paid)}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số tiền thu *</span><input type="number" min="1" step="1000" value={capture.amount} onChange={(event) => setCapture((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Phương thức *</span><BeautifulSelect value={capture.method} onChange={(event) => setCapture((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]">{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Mã giao dịch {capture.method === 'CASH' ? '(không bắt buộc)' : '*'}</span><input value={capture.reference} onChange={(event) => setCapture((current) => ({ ...current, reference: event.target.value }))} placeholder={capture.method === 'CASH' ? 'Tự động tạo mã phiếu thu' : 'Nhập mã từ ngân hàng hoặc cổng thanh toán'} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-[10px] outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setCaptureOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[9px] font-black text-white shadow-lg shadow-emerald-200"><Check className="h-4 w-4" />Xác nhận đã thu</button></footer></form></div>}

    {refundOpen && selected && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu hoàn tiền" onClick={() => setRefundOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitRefund} className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5"><div><p className="text-[9px] font-black uppercase tracking-wide text-rose-600">Kiểm soát hoàn tiền</p><h2 className="mt-1 text-lg font-black text-slate-900">Hoàn tiền {selected.id}</h2><p className="mt-1 text-[9px] text-slate-500">Có thể hoàn tối đa {money(selected.paid - selected.refunded)}.</p></div><button type="button" onClick={() => setRefundOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="space-y-4 p-5">{formError && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}<label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Số tiền hoàn *</span><input type="number" min="1" step="1000" value={refund.amount} onChange={(event) => setRefund((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100" /></label><label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Lý do hoàn tiền *</span><textarea value={refund.reason} onChange={(event) => setRefund((current) => ({ ...current, reason: event.target.value }))} placeholder="Mô tả lý do, phạm vi dịch vụ và người đã xác nhận..." className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100" /></label><div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-[8px] leading-4 text-amber-800"><ShieldCheck className="h-4 w-4 shrink-0" />Thao tác hoàn tiền được lưu vào nhật ký kiểm soát và cần được đối soát lại với cổng thanh toán.</div></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setRefundOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-200"><ArrowDownRight className="h-4 w-4" />Xác nhận hoàn tiền</button></footer></form></div>}
    {catalogCreateOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6">
        <button type="button" aria-label="Đóng biểu mẫu tạo hóa đơn" onClick={() => setCatalogCreateOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
        <form onSubmit={submitInvoice} role="dialog" aria-modal="true" aria-labelledby="catalog-create-invoice-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
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
                  <BeautifulSelect value={invoice.branch} disabled={branchLocked} onChange={(event) => setInvoice((current) => ({ ...current, branch: event.target.value as BranchCode, category: 'ALL', itemName: '', unitPrice: '', staff: '' }))} className={invoiceInputClass}>
                    <option value="Q3">Chi nhánh Quận 3</option>
                    <option value="Q1">Chi nhánh Quận 1</option>
                  </BeautifulSelect>
                </label>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã lịch hẹn (không bắt buộc)</span><input value={invoice.appointmentId} onChange={(event) => setInvoice((current) => ({ ...current, appointmentId: event.target.value }))} placeholder="APT-..." className={invoiceInputClass} /></label>
              </div>
            </fieldset>
            <fieldset className="border-t border-slate-100 pt-5">
              <legend className="mb-3 text-[9px] font-black text-slate-800">Danh mục, dịch vụ & nhân viên</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[8px] font-bold text-slate-600">Danh mục dịch vụ</span>
                  <BeautifulSelect value={invoice.category} onChange={(event) => setInvoice((current) => ({ ...current, category: event.target.value as ServiceCategory, itemName: '', unitPrice: '' }))} className={invoiceInputClass}>
                    <option value="ALL">Tất cả danh mục</option>
                    {Object.entries(serviceCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </BeautifulSelect>
                </label>
                <label>
                  <span className="mb-1.5 block text-[8px] font-bold text-slate-600">Dịch vụ *</span>
                  <BeautifulSelect value={invoice.itemName} onChange={(event) => {
                    const service = invoiceServiceCatalog.find((item) => item.name === event.target.value);
                    setInvoice((current) => ({ ...current, itemName: event.target.value, unitPrice: service ? String(service.price) : '' }));
                  }} className={invoiceInputClass}>
                    <option value="">Chọn dịch vụ</option>
                    {availableInvoiceServices.map((service) => <option key={service.id} value={service.name}>{serviceCategoryLabels[service.category]} · {service.name} · {money(service.price)}</option>)}
                  </BeautifulSelect>
                </label>
                <label>
                  <span className="mb-1.5 block text-[8px] font-bold text-slate-600">Nhân viên phụ trách *</span>
                  <BeautifulSelect value={invoice.staff} onChange={(event) => setInvoice((current) => ({ ...current, staff: event.target.value }))} className={invoiceInputClass}>
                    <option value="">Chọn nhân viên</option>
                    {availableInvoiceStaff.map((staff) => <option key={staff.name} value={staff.name}>{staff.name} · {staff.role}</option>)}
                  </BeautifulSelect>
                </label>
                <div className="grid grid-cols-[100px_1fr] gap-3">
                  <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Số lượng *</span><input type="number" min="1" step="1" value={invoice.quantity} onChange={(event) => setInvoice((current) => ({ ...current, quantity: event.target.value }))} className={invoiceInputClass} /></label>
                  <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đơn giá *</span><input type="number" min="1" step="1000" value={invoice.unitPrice} onChange={(event) => setInvoice((current) => ({ ...current, unitPrice: event.target.value }))} className={invoiceInputClass} /></label>
                </div>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Giảm giá</span><input type="number" min="0" step="1000" value={invoice.discount} onChange={(event) => setInvoice((current) => ({ ...current, discount: event.target.value }))} className={invoiceInputClass} /></label>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Tiền tip</span><input type="number" min="0" step="1000" value={invoice.tip} onChange={(event) => setInvoice((current) => ({ ...current, tip: event.target.value }))} className={invoiceInputClass} /></label>
              </div>
              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] text-white">
                <div className="p-4"><p className="text-[8px] font-bold text-slate-400">Tạm tính</p><p className="mt-1 text-base font-black">{money(invoiceSubtotal)}</p></div>
                <div className="border-l border-white/10 p-4"><p className="text-[8px] font-bold text-violet-300">Tổng hóa đơn</p><p className="mt-1 text-base font-black">{money(invoiceTotal)}</p></div>
              </div>
            </fieldset>
            <fieldset className="border-t border-slate-100 pt-5">
              <legend className="mb-3 text-[9px] font-black text-slate-800">Thanh toán ban đầu</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Đã thu / tiền cọc</span><input type="number" min="0" max={invoiceTotal || undefined} step="1000" value={invoice.deposit} onChange={(event) => setInvoice((current) => ({ ...current, deposit: event.target.value }))} className={invoiceInputClass} /></label>
                <label><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Phương thức</span><BeautifulSelect value={invoice.method} onChange={(event) => setInvoice((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className={invoiceInputClass}>{Object.entries(methodMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label>
                {Number(invoice.deposit) > 0 && invoice.method !== 'CASH' && <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Mã giao dịch *</span><input value={invoice.reference} onChange={(event) => setInvoice((current) => ({ ...current, reference: event.target.value }))} placeholder="Mã ngân hàng hoặc cổng thanh toán" className={invoiceInputClass} /></label>}
                <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-bold text-slate-600">Ghi chú</span><textarea value={invoice.note} onChange={(event) => setInvoice((current) => ({ ...current, note: event.target.value }))} placeholder="Thông tin cần lưu cùng hóa đơn..." className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
              </div>
            </fieldset>
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
            <p className="hidden text-[8px] font-semibold text-slate-400 sm:block">Giá được tự động điền theo dịch vụ và vẫn có thể điều chỉnh trước khi lưu.</p>
            <div className="ml-auto flex gap-2"><button type="button" onClick={() => setCatalogCreateOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><ReceiptText className="h-4 w-4" />Tạo hóa đơn</button></div>
          </footer>
        </form>
      </div>
    )}
  </div>;
}
