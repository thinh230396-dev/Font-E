import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  AlertTriangle, Award, BadgePercent, BarChart3, CalendarClock, Check, ChevronRight, Copy, Download,
  Gift, Layers3, Pause, Play, Plus, Save, Search, ShieldCheck, Sparkles, Star, Target,
  TicketPercent, Trash2, TrendingUp, UsersRound, WalletCards, X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import {
  ApplicationScope,
  DiscountType,
  defaultLoyaltyPrograms,
  generateProgramRulesText,
  LoyaltyProgram,
  ProgramAction,
  ProgramStatus,
  ProgramType,
  BranchScope,
} from '../utils/promotionUtils';

interface TenantAdminLoyaltyProps {
  searchQuery: string; onSearchQueryChange: (value: string) => void;
  selectedBranch: string; onSelectedBranchChange: (value: string) => void;
  tenantName?: string; roleLabel?: string; accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string; onNotify?: (message: string) => void;
}

export interface MemberTier {
  id: string;
  name: string;
  minThreshold: number; // in VNĐ
  pointMultiplier: number;
  discountPercent: number;
  benefit: string;
  members: number;
  revenue: number;
  tone: string;
}

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const nowTimeFormatted = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const typeMeta: Record<ProgramType, { label: string; icon: typeof Gift; badge: string }> = {
  VOUCHER: { label: 'Voucher', icon: TicketPercent, badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  PACKAGE: { label: 'Gói dịch vụ', icon: WalletCards, badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  REFERRAL: { label: 'Giới thiệu bạn', icon: UsersRound, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  HAPPY_HOUR: { label: 'Ưu đãi khung giờ', icon: CalendarClock, badge: 'bg-amber-50 text-amber-700 ring-amber-200' }
};
const statusMeta: Record<ProgramStatus, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Đang hoạt động', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  DRAFT: { label: 'Bản nháp', badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  ENDING: { label: 'Sắp kết thúc', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  PAUSED: { label: 'Tạm dừng', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' }
};

const defaultMemberTiers: MemberTier[] = [
  { id: 'TIER-1', name: 'Thành viên', minThreshold: 0, pointMultiplier: 1.0, discountPercent: 0, benefit: 'Tích 1 điểm / 10.000đ', members: 428, revenue: 38, tone: 'from-slate-600 to-slate-800' },
  { id: 'TIER-2', name: 'Thân thiết', minThreshold: 5000000, pointMultiplier: 1.2, discountPercent: 5, benefit: 'Giảm 5% · Ưu tiên lịch', members: 228, revenue: 28, tone: 'from-blue-500 to-cyan-500' },
  { id: 'TIER-3', name: 'VIP Diamond', minThreshold: 20000000, pointMultiplier: 1.5, discountPercent: 12, benefit: 'Giảm 12% · Phòng VIP', members: 86, revenue: 34, tone: 'from-violet-500 to-fuchsia-500' }
];

function formatTierThreshold(minVal: number, nextMinVal?: number): string {
  const formatM = (val: number) => {
    if (val >= 1000000) {
      const m = val / 1000000;
      return Number.isInteger(m) ? `${m} triệu` : `${m.toFixed(2).replace('.', ',')} triệu`;
    }
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  if (nextMinVal !== undefined) {
    const upper = nextMinVal - 10000;
    return `${formatM(minVal)}–${formatM(upper)} / 12 tháng`;
  }
  return `Từ ${formatM(minVal)} / 12 tháng`;
}

const seed = defaultLoyaltyPrograms;

export default function TenantAdminLoyalty({ searchQuery, onSearchQueryChange, selectedBranch, onSelectedBranchChange, tenantName = 'Nailé Studio', roleLabel = 'Owner · Tenant Admin', accessMode = 'full', readOnlyReason = '', onNotify }: TenantAdminLoyaltyProps) {
  const storageKey = `tenant-admin-loyalty-v1:${tenantName}`;
  const tierStorageKey = `tenant-admin-tiers-v1:${tenantName}`;
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(() => { if (typeof window === 'undefined') return getTenantAdminInitialData(null, seed); try { const stored = localStorage.getItem(storageKey); return getTenantAdminInitialData(stored ? JSON.parse(stored) as LoyaltyProgram[] : null, seed); } catch { return getTenantAdminInitialData(null, seed); } });
  const [memberTiers, setMemberTiers] = useState<MemberTier[]>(() => {
    if (typeof window === 'undefined') return defaultMemberTiers;
    try {
      const stored = localStorage.getItem(tierStorageKey);
      return stored ? (JSON.parse(stored) as MemberTier[]) : defaultMemberTiers;
    } catch {
      return defaultMemberTiers;
    }
  });
  const [isEditingTiers, setIsEditingTiers] = useState(false);
  const [draftTiers, setDraftTiers] = useState<MemberTier[]>([]);
  const [tierError, setTierError] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProgramType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProgramStatus>('ALL');
  const [selected, setSelected] = useState<LoyaltyProgram | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: ProgramAction; program: LoyaltyProgram; blockers?: string[] } | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'VOUCHER' as ProgramType,
    branch: 'ALL' as BranchScope,
    audience: '',
    start: '',
    end: '',
    channels: 'Zalo, Tại quầy',
    minInvoiceValue: '0',
    discountType: 'PERCENT' as DiscountType,
    discountValue: '10',
    maxDiscount: '',
    maxTotalUsage: '',
    maxUsagePerCustomer: '1',
    applScope: 'ALL' as ApplicationScope,
    selectedItemsText: ''
  });
  const canManage = accessMode === 'full' && !readOnlyReason;
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(programs)); }, [programs, storageKey]);
  useEffect(() => { localStorage.setItem(tierStorageKey, JSON.stringify(memberTiers)); }, [memberTiers, tierStorageKey]);
  useEffect(() => {
    if (!selected && !formOpen && !tierOpen && !pendingAction) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pendingAction) setPendingAction(null);
        else if (isEditingTiers) {
          setIsEditingTiers(false);
          setTierError('');
        } else {
          setSelected(null);
          setFormOpen(false);
          setTierOpen(false);
        }
      }
    };
    addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', close);
    };
  }, [formOpen, isEditingTiers, pendingAction, selected, tierOpen]);
  const requireManage = () => { if (canManage) return true; onNotify?.(readOnlyReason || 'Gói hiện tại chỉ cho phép xem chương trình thành viên.'); return false; };

  const handleStartEditTiers = () => {
    if (!requireManage()) return;
    setDraftTiers(JSON.parse(JSON.stringify(memberTiers)));
    setTierError('');
    setIsEditingTiers(true);
  };

  const handleCancelEditTiers = () => {
    setIsEditingTiers(false);
    setTierError('');
  };

  const updateDraftTier = (index: number, field: keyof MemberTier, value: any) => {
    setDraftTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveTiers = () => {
    if (!requireManage()) return;
    setTierError('');

    for (let i = 0; i < draftTiers.length; i++) {
      const t = draftTiers[i];
      if (!t.name.trim()) {
        setTierError(`Vui lòng nhập tên cho hạng thứ ${i + 1}.`);
        return;
      }
      if (isNaN(t.minThreshold) || t.minThreshold < 0) {
        setTierError(`Ngưỡng chi tiêu của hạng "${t.name}" phải là số lớn hơn hoặc bằng 0.`);
        return;
      }
      if (isNaN(t.pointMultiplier) || t.pointMultiplier <= 0) {
        setTierError(`Hệ số nhân điểm của hạng "${t.name}" phải lớn hơn 0.`);
        return;
      }
      if (isNaN(t.discountPercent) || t.discountPercent < 0 || t.discountPercent > 100) {
        setTierError(`Phần trăm giảm giá của hạng "${t.name}" phải từ 0% đến 100%.`);
        return;
      }
      if (!t.benefit.trim()) {
        setTierError(`Vui lòng nhập quyền lợi cho hạng "${t.name}".`);
        return;
      }
    }

    for (let i = 1; i < draftTiers.length; i++) {
      const prev = draftTiers[i - 1];
      const curr = draftTiers[i];
      if (curr.minThreshold <= prev.minThreshold) {
        setTierError(
          `Ngưỡng chi tiêu hạng "${curr.name}" (${new Intl.NumberFormat('vi-VN').format(curr.minThreshold)}đ) phải lớn hơn ngưỡng hạng "${prev.name}" (${new Intl.NumberFormat('vi-VN').format(prev.minThreshold)}đ). Ngưỡng các hạng không được trùng hoặc chồng chéo.`
        );
        return;
      }
    }

    setMemberTiers(draftTiers);
    setIsEditingTiers(false);
    onNotify?.('Cập nhật cấu hình hệ thống hạng thành viên thành công!');
  };
  const scoped = programs.filter((program) => selectedBranch === 'ALL' || program.branch === 'ALL' || program.branch === selectedBranch);
  const filtered = useMemo(() => { const query = searchQuery.trim().toLowerCase(); return programs.filter((program) => selectedBranch === 'ALL' || program.branch === 'ALL' || program.branch === selectedBranch).filter((program) => typeFilter === 'ALL' || program.type === typeFilter).filter((program) => statusFilter === 'ALL' || program.status === statusFilter).filter((program) => !query || `${program.id} ${program.name} ${program.audience} ${program.benefit}`.toLowerCase().includes(query)); }, [programs, searchQuery, selectedBranch, statusFilter, typeFilter]);
  const memberRevenue = scoped.reduce((sum, item) => sum + item.revenue, 0);
  const totalIssued = scoped.reduce((sum, item) => sum + item.issued, 0);
  const totalRedeemed = scoped.reduce((sum, item) => sum + item.redeemed, 0);
  const averageRoi = Math.round(scoped.reduce((sum, item) => sum + (item.cost ? item.revenue / item.cost : 0), 0) / Math.max(1, scoped.filter((item) => item.cost > 0).length) * 10) / 10;
  
  const openCreate = () => {
    if (!requireManage()) return;
    setForm({
      name: '',
      type: 'VOUCHER',
      branch: selectedBranch === 'Q1' ? 'Q1' : selectedBranch === 'Q3' ? 'Q3' : 'ALL',
      audience: '',
      start: '',
      end: '',
      channels: 'Zalo, Tại quầy',
      minInvoiceValue: '0',
      discountType: 'PERCENT',
      discountValue: '10',
      maxDiscount: '',
      maxTotalUsage: '',
      maxUsagePerCustomer: '1',
      applScope: 'ALL',
      selectedItemsText: ''
    });
    setFormError('');
    setFormOpen(true);
  };

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.audience.trim() || !form.start || !form.end) {
      setFormError('Vui lòng nhập đầy đủ tên chương trình, đối tượng và thời gian áp dụng.');
      return;
    }
    if (new Date(form.end) < new Date(form.start)) {
      setFormError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    const discountVal = Number(form.discountValue) || 0;
    if (discountVal <= 0) {
      setFormError('Giá trị giảm phải lớn hơn 0.');
      return;
    }
    if (form.discountType === 'PERCENT' && discountVal > 100) {
      setFormError('Phần trăm giảm giá không được vượt quá 100%.');
      return;
    }
    const minInvoice = Math.max(0, Number(form.minInvoiceValue) || 0);
    const maxDisc = form.maxDiscount ? Math.max(0, Number(form.maxDiscount) || 0) : undefined;
    const maxTotalU = form.maxTotalUsage ? Math.max(0, Number(form.maxTotalUsage) || 0) : undefined;
    const maxCustomerU = form.maxUsagePerCustomer ? Math.max(0, Number(form.maxUsagePerCustomer) || 0) : undefined;
    const selectedItems = form.selectedItemsText.split(',').map((s) => s.trim()).filter(Boolean);

    if (form.applScope === 'SELECTED_ITEMS' && selectedItems.length === 0) {
      setFormError('Vui lòng nhập ít nhất một tên dịch vụ hoặc sản phẩm được chọn.');
      return;
    }

    const benefitLabel = form.discountType === 'PERCENT'
      ? `Giảm ${discountVal}%${maxDisc ? ` tối đa ${new Intl.NumberFormat('vi-VN').format(maxDisc)}đ` : ''}`
      : `Giảm trực tiếp ${new Intl.NumberFormat('vi-VN').format(discountVal)}đ`;

    const programDraft: Partial<LoyaltyProgram> = {
      minInvoiceValue: minInvoice,
      discountType: form.discountType,
      discountValue: discountVal,
      maxDiscount: maxDisc,
      maxTotalUsage: maxTotalU,
      maxUsagePerCustomer: maxCustomerU,
      applScope: form.applScope,
      selectedItemNames: selectedItems,
    };

    const autoRules = generateProgramRulesText(programDraft);

    const program: LoyaltyProgram = {
      id: `LOY-${Date.now().toString().slice(-3)}`,
      name: form.name.trim(),
      type: form.type,
      status: 'DRAFT',
      branch: form.branch,
      audience: form.audience.trim(),
      benefit: benefitLabel,
      start: new Date(form.start).toLocaleDateString('vi-VN'),
      end: new Date(form.end).toLocaleDateString('vi-VN'),
      issued: 0,
      redeemed: 0,
      revenue: 0,
      cost: 0,
      members: 0,
      minInvoiceValue: minInvoice,
      discountType: form.discountType,
      discountValue: discountVal,
      maxDiscount: maxDisc,
      maxTotalUsage: maxTotalU,
      maxUsagePerCustomer: maxCustomerU,
      applScope: form.applScope,
      selectedItemNames: selectedItems,
      rules: autoRules,
      channels: form.channels.split(',').map((item) => item.trim()).filter(Boolean),
      owner: roleLabel,
      audit: [`${nowTimeFormatted()} · Tạo bản nháp với điều kiện cấu hình bởi ${roleLabel}`],
      userCreated: true,
    };

    setPrograms((current) => [program, ...current]);
    setFormOpen(false);
    setSelected(program);
    onNotify?.(`Đã tạo bản nháp “${program.name}” với điều kiện ưu đãi cấu hình thành công.`);
  };
  const changeStatus = (program: LoyaltyProgram, status: ProgramStatus) => { if (!requireManage()) return; const patch: Partial<LoyaltyProgram> = { status, audit: [`15:08 · ${roleLabel} chuyển trạng thái sang ${statusMeta[status].label}`, ...program.audit] }; setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, ...patch } : item)); setSelected((current) => current?.id === program.id ? { ...current, ...patch } as LoyaltyProgram : current); onNotify?.(`Đã cập nhật trạng thái ${program.name}.`); };
  const duplicateProgram = (program: LoyaltyProgram) => { const copy: LoyaltyProgram = { ...program, id: `LOY-${Date.now().toString().slice(-3)}`, name: `${program.name} · Bản sao`, status: 'DRAFT', issued: 0, redeemed: 0, revenue: 0, cost: 0, audit: [`15:10 · Sao chép bởi ${roleLabel}`], userCreated: true }; setPrograms((current) => [copy, ...current]); setSelected(copy); setPendingAction(null); onNotify?.('Đã sao chép chương trình thành bản nháp.'); };
  const pauseProgram = (program: LoyaltyProgram) => { const reason = pauseReason.trim(); if (!reason) return; const patch: Partial<LoyaltyProgram> = { status: 'PAUSED', note: reason, audit: [`15:12 · ${roleLabel} tạm dừng: ${reason}`, ...program.audit] }; setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, ...patch } : item)); setSelected((current) => current?.id === program.id ? { ...current, ...patch } as LoyaltyProgram : current); setPendingAction(null); setPauseReason(''); onNotify?.(`Đã tạm dừng “${program.name}” và lưu lý do.`); };
  const isNewProgram = (program: LoyaltyProgram) => program.userCreated === true || program.audit.some((entry) => entry.includes('Tạo bản nháp bởi') || entry.includes('Sao chép bởi'));
  const hasNoProgramActivity = (program: LoyaltyProgram) => program.issued === 0 && program.redeemed === 0 && program.revenue === 0 && program.cost === 0;
  const canDeleteProgram = (program: LoyaltyProgram) => hasNoProgramActivity(program) && (program.status === 'DRAFT' || isNewProgram(program));
  const requestAction = (type: ProgramAction, program: LoyaltyProgram) => {
    if (!requireManage()) return;
    setPauseReason('');
    setDeleteConfirmation('');
    if (type !== 'DELETE') { setPendingAction({ type, program }); return; }
    const blockers = [
      program.status !== 'DRAFT' && !isNewProgram(program) ? 'Chỉ bản nháp hoặc ưu đãi vừa tạo mới được xóa.' : '',
      program.issued > 0 || program.redeemed > 0 ? `Ưu đãi đã cấp ${program.issued} lượt hoặc đã sử dụng ${program.redeemed} lượt.` : '',
      program.revenue > 0 || program.cost > 0 ? 'Ưu đãi đã phát sinh doanh thu hoặc chi phí cần được giữ lại để đối soát.' : ''
    ].filter(Boolean);
    setPendingAction({ type, program, blockers });
  };
  const deleteProgram = (program: LoyaltyProgram) => {
    if (!canDeleteProgram(program) || deleteConfirmation.trim().toUpperCase() !== 'XÓA') return;
    setPrograms((current) => current.filter((item) => item.id !== program.id));
    setSelected(null);
    setPendingAction(null);
    setDeleteConfirmation('');
    onNotify?.(`Đã xóa vĩnh viễn bản nháp “${program.name}”.`);
  };
  const exportPrograms = () => { const header = 'Ma,Chuong trinh,Loai,Doi tuong,Da cap,Da dung,Doanh thu,Chi phi,Trang thai'; const body = filtered.map((item) => [item.id, item.name, typeMeta[item.type].label, item.audience, item.issued, item.redeemed, item.revenue, item.cost, statusMeta[item.status].label].join(',')).join('\n'); const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'bao-cao-thanh-vien-uu-dai.csv'; link.click(); URL.revokeObjectURL(link.href); onNotify?.('Đã xuất báo cáo thành viên & ưu đãi.'); };

  return <div className="space-y-5">
    <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-violet-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Hiệu quả giữ chân · Cập nhật 15:05<span className="text-slate-300">•</span><span className="text-slate-500">{tenantName}</span></div><h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Thành viên & ưu đãi</h1><p className="mt-2 text-[11px] text-slate-500">Quản lý hạng, điểm thưởng, voucher, gói dịch vụ và hiệu quả chương trình trên toàn tenant.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportPrograms} className="flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"><Download className="h-4 w-4" />Xuất báo cáo</button><button type="button" onClick={() => setTierOpen(true)} className="flex h-11 items-center gap-2 border border-violet-200 bg-violet-50 px-4 text-[9px] font-black text-violet-700 shadow-sm"><Layers3 className="h-4 w-4" />Cấu hình hạng</button><button type="button" onClick={openCreate} disabled={!canManage} className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Plus className="h-4 w-4" />Tạo ưu đãi</button></div></section>
    <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? 'border-violet-100 bg-gradient-to-r from-violet-50 to-white' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4.5 w-4.5" /></span><div><p className="text-[10px] font-black text-slate-800">Phạm vi quyền: {roleLabel}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{canManage ? 'Được cấu hình hạng, tạo/phê duyệt ưu đãi, quản lý điểm, gói dịch vụ và xem hiệu quả trong tenant; mọi thay đổi đều có nhật ký.' : readOnlyReason || 'Chỉ được xem chương trình và hiệu quả thành viên.'}</p></div></div><span className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{canManage ? 'Toàn quyền Loyalty tenant' : 'Chỉ xem'}</span></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Thành viên hoạt động', value: '742', detail: '58% tổng khách hàng · +46 tháng này', icon: UsersRound, tone: 'bg-blue-50 text-blue-600' },
      { label: 'Điểm đang lưu hành', value: '486K', detail: 'Tương đương 48,6 triệu đồng', icon: Star, tone: 'bg-violet-50 text-violet-600' },
      { label: 'Doanh thu thành viên', value: money(memberRevenue), detail: '68% tổng doanh thu trong kỳ', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Tỷ lệ đổi ưu đãi', value: `${Math.round(totalRedeemed / Math.max(1, totalIssued) * 100)}%`, detail: `ROI trung bình ${averageRoi}x · ${totalRedeemed}/${totalIssued} lượt`, icon: Target, tone: 'bg-amber-50 text-amber-600' }
    ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1.5 text-lg font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 text-[8px] font-semibold text-slate-400">{detail}</p></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="relative w-full xl:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm chương trình, quyền lợi, đối tượng..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap gap-2"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Tất cả chi nhánh</option><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect><BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ProgramStatus)} className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"><option value="ALL">Mọi trạng thái</option>{Object.entries(statusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></div></div><div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">{(['ALL', 'VOUCHER', 'PACKAGE', 'REFERRAL', 'HAPPY_HOUR'] as const).map((value) => <button key={value} type="button" onClick={() => setTypeFilter(value)} className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${typeFilter === value ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>{value === 'ALL' ? 'Tất cả chương trình' : typeMeta[value].label}<span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">{value === 'ALL' ? scoped.length : scoped.filter((item) => item.type === value).length}</span></button>)}</div><div className="divide-y divide-slate-100">{filtered.map((program) => { const type = typeMeta[program.type]; const Icon = type.icon; const conversion = Math.round(program.redeemed / Math.max(1, program.issued) * 100); return <button key={program.id} type="button" onClick={() => setSelected(program)} className="group block h-auto w-full rounded-none border-0 bg-white p-4 text-left shadow-none hover:bg-slate-50 sm:p-5"><span className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${type.badge}`}><Icon className="h-4.5 w-4.5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black text-slate-900">{program.name}</span><span className={`rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${statusMeta[program.status].badge}`}>{statusMeta[program.status].label}</span></span><span className="mt-1.5 block text-[8px] text-slate-400">{program.id} · {program.audience} · {program.branch === 'ALL' ? 'Toàn tenant' : program.branch}</span><span className="mt-2 block text-[8px] font-bold text-violet-600">{program.benefit}</span></span><span className="grid shrink-0 grid-cols-3 gap-4 sm:w-[320px]"><span><span className="block text-[7px] text-slate-400">Sử dụng</span><span className="mt-1 block text-[10px] font-black text-slate-800">{program.redeemed}/{program.issued}</span></span><span><span className="block text-[7px] text-slate-400">Chuyển đổi</span><span className="mt-1 block text-[10px] font-black text-slate-800">{conversion}%</span></span><span><span className="block text-[7px] text-slate-400">Doanh thu</span><span className="mt-1 block text-[10px] font-black text-emerald-700">{money(program.revenue)}</span></span></span><ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 sm:block" /></span></button>; })}</div>{!filtered.length && <div className="py-16 text-center"><Gift className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-[10px] font-black text-slate-600">Không có chương trình phù hợp</p></div>}<div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3"><p className="text-[8px] text-slate-400">Hiển thị <strong className="text-slate-600">{filtered.length}</strong> chương trình</p><p className="text-[8px] font-semibold text-slate-400">Doanh thu theo bộ lọc: {money(filtered.reduce((sum, item) => sum + item.revenue, 0))}</p></div></div>
      <aside className="space-y-4"><div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white shadow-lg"><div className="flex items-start justify-between"><div><p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">Cơ cấu thành viên</p><p className="mt-2 text-lg font-black">{memberTiers.reduce((sum, t) => sum + t.members, 0)} thành viên</p><p className="mt-1 text-[8px] text-slate-400">Phân hạng theo chi tiêu 12 tháng</p></div><Award className="h-5 w-5 text-amber-300" /></div><div className="mt-5 space-y-4">{memberTiers.map((tier) => <div key={tier.id}><div className="mb-1.5 flex items-center justify-between"><span className="text-[8px] font-bold text-slate-300">{tier.name}</span><span className="text-[8px] font-black">{tier.members}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r ${tier.tone}`} style={{ width: `${Math.max(12, tier.members / 742 * 100)}%` }} /></div></div>)}</div><button type="button" onClick={() => setTierOpen(true)} className="mt-5 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/8 text-[8px] font-black text-white shadow-none"><Layers3 className="h-3.5 w-3.5" />Xem cấu hình hạng</button></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black text-slate-800">Cần Tenant Admin xử lý</p><p className="mt-1 text-[8px] text-slate-400">Ưu tiên theo thời hạn</p></div><Sparkles className="h-4 w-4 text-amber-500" /></div><div className="mt-3 space-y-2">{[{ label: 'Chương trình chờ duyệt', value: scoped.filter((item) => item.status === 'DRAFT').length, tone: 'bg-violet-50 text-violet-700' }, { label: 'Sắp kết thúc', value: scoped.filter((item) => item.status === 'ENDING').length, tone: 'bg-amber-50 text-amber-700' }, { label: 'Đang tạm dừng', value: scoped.filter((item) => item.status === 'PAUSED').length, tone: 'bg-rose-50 text-rose-700' }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-[8px] font-bold text-slate-600">{item.label}</span><span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[8px] font-black ${item.tone}`}>{item.value}</span></div>)}</div></div></aside></section>

    {selected && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><button type="button" aria-label="Đóng chi tiết chương trình" onClick={() => setSelected(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><section role="dialog" aria-modal="true" aria-labelledby="loyalty-detail-title" className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-wide text-violet-600">{selected.id}</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${typeMeta[selected.type].badge}`}>{typeMeta[selected.type].label}</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selected.status].badge}`}>{statusMeta[selected.status].label}</span></div><h2 id="loyalty-detail-title" className="mt-2 text-xl font-black text-slate-950">{selected.name}</h2><p className="mt-1 text-[9px] text-slate-400">{selected.start}–{selected.end} · {selected.branch === 'ALL' ? 'Toàn tenant' : `Chi nhánh ${selected.branch}`}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"><div className="space-y-4"><div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white"><p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-300">Quyền lợi chương trình</p><p className="mt-2 text-xl font-black leading-tight">{selected.benefit}</p><p className="mt-2 text-[9px] text-slate-400">Đối tượng: {selected.audience}</p><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/7 p-3"><p className="text-[7px] text-slate-400">Đã cấp</p><p className="mt-1 text-[12px] font-black">{selected.issued}</p></div><div className="rounded-xl bg-white/7 p-3"><p className="text-[7px] text-slate-400">Đã dùng</p><p className="mt-1 text-[12px] font-black">{selected.redeemed}</p></div><div className="rounded-xl bg-white/7 p-3"><p className="text-[7px] text-slate-400">Chuyển đổi</p><p className="mt-1 text-[12px] font-black">{Math.round(selected.redeemed / Math.max(1, selected.issued) * 100)}%</p></div></div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black text-slate-800">Hiệu quả tài chính</p><p className="mt-1 text-[8px] text-slate-400">Doanh thu quy đổi và chi phí ưu đãi</p></div><BarChart3 className="h-4 w-4 text-emerald-500" /></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[7px] text-emerald-600">Doanh thu</p><p className="mt-1 text-[10px] font-black text-emerald-800">{money(selected.revenue)}</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-[7px] text-rose-600">Chi phí</p><p className="mt-1 text-[10px] font-black text-rose-800">{money(selected.cost)}</p></div><div className="rounded-xl bg-violet-50 p-3"><p className="text-[7px] text-violet-600">ROI</p><p className="mt-1 text-[10px] font-black text-violet-800">{selected.cost ? (selected.revenue / selected.cost).toFixed(1) : '—'}x</p></div></div></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[9px] font-black text-slate-800">Điều kiện áp dụng</p><div className="mt-3 space-y-2">{selected.rules.map((rule) => <div key={rule} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /><p className="text-[8px] leading-4 text-slate-600">{rule}</p></div>)}</div></div></div><div className="space-y-4"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[8px] font-black uppercase text-slate-400">Phân phối & quản trị</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Người phụ trách</p><p className="mt-1 text-[8px] font-black text-slate-700">{selected.owner}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] text-slate-400">Đối tượng dự kiến</p><p className="mt-1 text-[8px] font-black text-slate-700">{selected.members} khách</p></div></div><div className="mt-3 flex flex-wrap gap-2">{selected.channels.map((channel) => <span key={channel} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[7px] font-bold text-blue-700">{channel}</span>)}</div></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-[9px] font-black text-slate-800">Nhật ký phê duyệt</p><div className="mt-3 space-y-3">{selected.audit.map((item, index) => <div key={`${item}-${index}`} className="flex gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-violet-500' : 'bg-slate-300'}`} /><p className="text-[8px] leading-4 text-slate-500">{item}</p></div>)}</div></div>{selected.note && <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[8px] font-black uppercase text-amber-600">Lưu ý trước khi duyệt</p><p className="mt-2 text-[8px] leading-5 text-amber-800">{selected.note}</p></div>}<div className="flex items-start gap-2 rounded-2xl bg-violet-50 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><p className="text-[8px] leading-4 text-violet-700">Mọi thay đổi ngân sách, quyền lợi và trạng thái đều được ghi nhận dưới phạm vi tenant.</p></div></div></div></div><footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-[8px] font-semibold text-slate-400">Thao tác dưới quyền {roleLabel}</p><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => requestAction('DELETE', selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-rose-200 bg-white px-4 text-[8px] font-black text-rose-700 shadow-sm disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Xóa</button><button type="button" onClick={() => requestAction('DUPLICATE', selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-black text-slate-600 shadow-sm disabled:opacity-50"><Copy className="h-3.5 w-3.5" />Sao chép</button>{selected.status === 'ACTIVE' ? <button type="button" onClick={() => requestAction('PAUSE', selected)} disabled={!canManage} className="flex h-10 items-center gap-2 border border-rose-200 bg-rose-50 px-4 text-[8px] font-black text-rose-700 shadow-sm disabled:opacity-50"><Pause className="h-3.5 w-3.5" />Tạm dừng</button> : <button type="button" onClick={() => changeStatus(selected, 'ACTIVE')} disabled={!canManage} className="flex h-10 items-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-[8px] font-black text-white shadow-sm disabled:opacity-50"><Play className="h-3.5 w-3.5" />{selected.status === 'DRAFT' ? 'Phê duyệt & chạy' : 'Kích hoạt lại'}</button>}</div></footer></section></div>}

    {pendingAction && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng xác nhận thao tác" onClick={() => setPendingAction(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><section role="alertdialog" aria-modal="true" aria-labelledby="loyalty-action-title" className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start gap-3 border-b border-slate-100 p-5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${pendingAction.type === 'DUPLICATE' ? 'bg-violet-50 text-violet-600' : 'bg-rose-50 text-rose-600'}`}>{pendingAction.type === 'DUPLICATE' ? <Copy className="h-5 w-5" /> : pendingAction.type === 'PAUSE' ? <Pause className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Xác nhận thao tác</p><h2 id="loyalty-action-title" className="mt-1 text-base font-black text-slate-900">{pendingAction.type === 'DUPLICATE' ? 'Sao chép ưu đãi này?' : pendingAction.type === 'PAUSE' ? 'Tạm dừng ưu đãi?' : pendingAction.blockers?.length ? 'Không thể xóa ưu đãi' : 'Xóa vĩnh viễn ưu đãi?'}</h2><p className="mt-1 truncate text-[9px] font-bold text-slate-500">{pendingAction.program.name}</p></div><button type="button" onClick={() => setPendingAction(null)} aria-label="Đóng" className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-400 shadow-sm"><X className="h-3.5 w-3.5" /></button></header><div className="space-y-4 p-5">{pendingAction.type === 'DUPLICATE' && <><p className="text-[9px] leading-5 text-slate-600">Hệ thống sẽ tạo một bản nháp mới, giữ nguyên nội dung và điều kiện. Số lượt cấp, lượt dùng, doanh thu và chi phí sẽ được đặt về 0.</p><div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-[8px] font-black text-violet-700">Bản sao mới</p><p className="mt-1.5 text-[10px] font-black text-slate-900">{pendingAction.program.name} · Bản sao</p><p className="mt-1 text-[8px] text-slate-500">Trạng thái: Bản nháp · Chưa phân phối</p></div></>}{pendingAction.type === 'PAUSE' && <><div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p className="text-[8px] leading-4 text-amber-800">Ưu đãi sẽ ngừng cấp mới ngay sau khi xác nhận. Các lượt đã sử dụng và dữ liệu đối soát vẫn được giữ nguyên.</p></div><label><span className="mb-1.5 block text-[9px] font-black text-slate-700">Lý do tạm dừng *</span><textarea value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} placeholder="Ví dụ: Kiểm tra trùng mã ưu đãi..." className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[9px] leading-5 outline-none focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50" /></label><p className="text-[8px] text-slate-400">Lý do sẽ được lưu vào nhật ký phê duyệt.</p></>}{pendingAction.type === 'DELETE' && pendingAction.blockers?.length ? <><div className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-[9px] font-black text-rose-800">Ưu đãi chưa đáp ứng điều kiện xóa:</p><div className="mt-3 space-y-2">{pendingAction.blockers.map((blocker) => <div key={blocker} className="flex items-start gap-2 text-[8px] leading-4 text-rose-700"><X className="mt-0.5 h-3.5 w-3.5 shrink-0" />{blocker}</div>)}</div></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[8px] font-black text-slate-700">Quy tắc xóa an toàn</p><p className="mt-1.5 text-[8px] leading-4 text-slate-500">Được xóa bản nháp hoặc ưu đãi vừa tạo khi chưa cấp, chưa sử dụng và chưa phát sinh số liệu tài chính. Với chương trình đã vận hành, hãy tạm dừng để bảo toàn lịch sử.</p></div></> : pendingAction.type === 'DELETE' ? <><div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><p className="text-[8px] leading-4 text-rose-800">Thao tác này không thể hoàn tác. Ưu đãi mới chưa phát sinh dữ liệu sẽ bị xóa khỏi danh sách.</p></div><label><span className="mb-1.5 block text-[9px] font-black text-slate-700">Nhập <strong className="text-rose-600">XÓA</strong> để xác nhận</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" placeholder="XÓA" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black outline-none focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50" /></label></> : null}</div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setPendingAction(null)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">{pendingAction.type === 'DELETE' && pendingAction.blockers?.length ? 'Đã hiểu' : 'Hủy'}</button>{pendingAction.type === 'DUPLICATE' && <button type="button" onClick={() => duplicateProgram(pendingAction.program)} className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Copy className="h-4 w-4" />Tạo bản sao</button>}{pendingAction.type === 'PAUSE' && <button type="button" onClick={() => pauseProgram(pendingAction.program)} disabled={!pauseReason.trim()} className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-100 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Pause className="h-4 w-4" />Xác nhận tạm dừng</button>}{pendingAction.type === 'DELETE' && !pendingAction.blockers?.length && <button type="button" onClick={() => deleteProgram(pendingAction.program)} disabled={deleteConfirmation.trim().toUpperCase() !== 'XÓA'} className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-100 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Trash2 className="h-4 w-4" />Xóa vĩnh viễn</button>}</footer></section></div>}

    {tierOpen && (
      <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Đóng cấu hình hạng"
          onClick={() => {
            setTierOpen(false);
            setIsEditingTiers(false);
            setTierError('');
          }}
          className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        />
        <section role="dialog" aria-modal="true" className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Cấu hình Loyalty</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">Hệ thống hạng thành viên</h2>
              <p className="mt-1 text-[9px] text-slate-500">
                {isEditingTiers
                  ? 'Chỉnh sửa cấu hình trực tiếp các hạng thành viên và điều kiện xếp hạng.'
                  : 'Xếp hạng tự động theo tổng chi tiêu trong 12 tháng gần nhất.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTierOpen(false);
                setIsEditingTiers(false);
                setTierError('');
              }}
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="space-y-4 p-5 sm:p-6">
            {isEditingTiers ? (
              <div className="space-y-4">
                {tierError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-[9px] font-bold text-rose-700">
                    {tierError}
                  </div>
                )}
                {draftTiers.map((tier, index) => (
                  <article key={tier.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white text-[10px] font-black ${tier.tone}`}>
                          {index + 1}
                        </span>
                        <span className="text-[10px] font-black text-slate-800">
                          Hạng {index + 1}: {tier.name || 'Chưa đặt tên'}
                        </span>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400">{tier.members} thành viên</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[8px] font-bold text-slate-600">Tên hạng *</label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => updateDraftTier(index, 'name', e.target.value)}
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                          placeholder="Tên hạng"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[8px] font-bold text-slate-600">Ngưỡng chi tiêu 12 tháng (VNĐ) *</label>
                        <input
                          type="number"
                          min="0"
                          step="500000"
                          value={tier.minThreshold}
                          onChange={(e) => updateDraftTier(index, 'minThreshold', Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[8px] font-bold text-slate-600">Tỷ lệ tích điểm (x Hệ số) *</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={tier.pointMultiplier}
                            onChange={(e) => updateDraftTier(index, 'pointMultiplier', Math.max(0.1, Number(e.target.value) || 1))}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                            placeholder="1.0"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">
                            x{tier.pointMultiplier} điểm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[8px] font-bold text-slate-600">Phần trăm giảm giá (%) *</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={tier.discountPercent}
                            onChange={(e) => updateDraftTier(index, 'discountPercent', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                            placeholder="0"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">%</span>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[8px] font-bold text-slate-600">Quyền lợi hạng *</label>
                        <input
                          type="text"
                          value={tier.benefit}
                          onChange={(e) => updateDraftTier(index, 'benefit', e.target.value)}
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                          placeholder="Mô tả quyền lợi"
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              memberTiers.map((tier, index) => (
                <article key={tier.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${tier.tone}`}>
                      {index === 2 ? <Award className="h-5 w-5" /> : index === 1 ? <Star className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[11px] font-black text-slate-900">{tier.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[7px] font-bold text-slate-500">{tier.members} thành viên</span>
                      </div>
                      <p className="mt-1.5 text-[8px] text-slate-400">
                        Điều kiện: {formatTierThreshold(tier.minThreshold, memberTiers[index + 1]?.minThreshold)}
                      </p>
                      <p className="mt-2 text-[8px] font-bold text-violet-600">
                        {tier.benefit} · x{tier.pointMultiplier} điểm{tier.discountPercent > 0 ? ` · Giảm ${tier.discountPercent}%` : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[7px] text-slate-400">Tỷ trọng doanh thu</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{tier.revenue}%</p>
                    </div>
                  </div>
                </article>
              ))
            )}

            {!isEditingTiers && (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[8px] leading-4 text-amber-800">
                  Thay đổi ngưỡng hạng có thể ảnh hưởng quyền lợi hiện tại. Hệ thống xếp hạng tự động dựa trên chi tiêu 12 tháng gần nhất.
                </p>
              </div>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            {isEditingTiers ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEditTiers}
                  className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveTiers}
                  className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  <Save className="h-4 w-4" />
                  Lưu thay đổi
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setTierOpen(false)}
                  className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleStartEditTiers}
                  disabled={!canManage}
                  className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:opacity-50 hover:bg-violet-700"
                >
                  <Layers3 className="h-4 w-4" />
                  Chỉnh sửa cấu hình
                </button>
              </>
            )}
          </footer>
        </section>
      </div>
    )}

    {formOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu ưu đãi" onClick={() => setFormOpen(false)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitForm} className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-wide text-violet-600">Thiết kế chương trình</p><h2 className="mt-1 text-lg font-black text-slate-900">Tạo ưu đãi mới</h2><p className="mt-1 text-[9px] text-slate-500">Chương trình được lưu ở trạng thái bản nháp với điều kiện cấu hình minh bạch.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></header><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700 sm:col-span-2">{formError}</div>}
      <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Tên chương trình *</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Voucher sinh nhật tháng 8" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
      <label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Loại chương trình *</span><BeautifulSelect value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ProgramType }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]">{Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</BeautifulSelect></label>
      <label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Phạm vi chi nhánh *</span><BeautifulSelect value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value as BranchScope }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"><option value="ALL">Toàn tenant</option><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option></BeautifulSelect></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Đối tượng áp dụng *</span><input value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))} placeholder="VIP, Thân thiết, Khách sinh nhật tháng 8..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
      <label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ngày bắt đầu *</span><input type="date" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400" /></label>
      <label><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Ngày kết thúc *</span><input type="date" value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400" /></label>

      {/* Cấu hình Mức giảm & Loại giảm giá */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
        <p className="text-[10px] font-black text-slate-800">Mức giảm & Cách thức tính *</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <span className="mb-1 block text-[8px] font-bold text-slate-500">Loại giảm giá</span>
            <BeautifulSelect value={form.discountType} onChange={(e) => setForm((curr) => ({ ...curr, discountType: e.target.value as DiscountType }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px]">
              <option value="PERCENT">Giảm theo %</option>
              <option value="FIXED">Giảm số tiền cố định (VNĐ)</option>
            </BeautifulSelect>
          </div>
          <div>
            <span className="mb-1 block text-[8px] font-bold text-slate-500">{form.discountType === 'PERCENT' ? 'Mức giảm (%) *' : 'Số tiền giảm (VNĐ) *'}</span>
            <input type="number" min="1" max={form.discountType === 'PERCENT' ? '100' : undefined} value={form.discountValue} onChange={(e) => setForm((curr) => ({ ...curr, discountValue: e.target.value }))} placeholder={form.discountType === 'PERCENT' ? '20' : '100000'} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-violet-400" />
          </div>
          <div>
            <span className="mb-1 block text-[8px] font-bold text-slate-500">Mức giảm tối đa (VNĐ)</span>
            <input type="number" min="0" disabled={form.discountType === 'FIXED'} value={form.discountType === 'FIXED' ? '' : form.maxDiscount} onChange={(e) => setForm((curr) => ({ ...curr, maxDiscount: e.target.value }))} placeholder={form.discountType === 'PERCENT' ? '250000' : 'Không giới hạn'} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-violet-400 disabled:bg-slate-100 disabled:text-slate-400" />
          </div>
        </div>
      </div>

      {/* Điều kiện hóa đơn & Lượt sử dụng */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
        <p className="text-[10px] font-black text-slate-800">Điều kiện hóa đơn & Giới hạn sử dụng</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <span className="mb-1 block text-[8px] font-bold text-slate-500">Giá trị hóa đơn tối thiểu (VNĐ)</span>
            <input type="number" min="0" value={form.minInvoiceValue} onChange={(e) => setForm((curr) => ({ ...curr, minInvoiceValue: e.target.value }))} placeholder="500000" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-violet-400" />
          </div>
          <div>
            <span className="mb-1 block text-[8px] font-bold text-slate-500">Số lần dùng tối đa (Toàn CT)</span>
            <input type="number" min="1" value={form.maxTotalUsage} onChange={(e) => setForm((curr) => ({ ...curr, maxTotalUsage: e.target.value }))} placeholder="Để trống nếu không giới hạn" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] outline-none focus:border-violet-400" />
          </div>
          <div>
            <span className="mb-1 block text-[8px] font-bold text-slate-500">Tối đa / 1 khách hàng (Lần)</span>
            <input type="number" min="1" value={form.maxUsagePerCustomer} onChange={(e) => setForm((curr) => ({ ...curr, maxUsagePerCustomer: e.target.value }))} placeholder="1" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-violet-400" />
          </div>
        </div>
      </div>

      {/* Phạm vi áp dụng */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
        <p className="text-[10px] font-black text-slate-800">Phạm vi áp dụng đối với dịch vụ / sản phẩm *</p>
        <div className="mt-3 space-y-3">
          <BeautifulSelect value={form.applScope} onChange={(e) => setForm((curr) => ({ ...curr, applScope: e.target.value as ApplicationScope }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold">
            <option value="ALL">Toàn bộ hóa đơn (Tổng cộng hóa đơn)</option>
            <option value="SERVICES_ONLY">Chỉ áp dụng cho DỊCH VỤ</option>
            <option value="PRODUCTS_ONLY">Chỉ áp dụng cho SẢN PHẨM</option>
            <option value="SELECTED_ITEMS">Dịch vụ hoặc sản phẩm được chọn cụ thể</option>
          </BeautifulSelect>
          {form.applScope === 'SELECTED_ITEMS' && (
            <div>
              <span className="mb-1 block text-[8px] font-bold text-slate-500">Danh sách dịch vụ/sản phẩm áp dụng (phân cách bằng dấu phẩy) *</span>
              <input value={form.selectedItemsText} onChange={(e) => setForm((curr) => ({ ...curr, selectedItemsText: e.target.value }))} placeholder="Ví dụ: Gel Manicure, Cắt da móng, Chrome" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] outline-none focus:border-violet-400" />
            </div>
          )}
        </div>
      </div>

      <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-slate-600">Kênh phân phối</span><input value={form.channels} onChange={(event) => setForm((current) => ({ ...current, channels: event.target.value }))} placeholder="Zalo, SMS, Email, tại quầy..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400" /></label>
    </div><footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setFormOpen(false)} className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"><Check className="h-4 w-4" />Lưu bản nháp</button></footer></form></div>}
  </div>;
}
