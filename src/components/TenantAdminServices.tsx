import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { PageHeader, Switch } from './ui';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  Boxes,
  Calendar,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Layers3,
  LayoutGrid,
  LayoutList,
  Pencil,
  Plus,
  ReceiptText,
  Scissors,
  Search,
  Sparkles,
  Star,
  Store,
  Tag,
  Target,
  TrendingUp,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { formatCompactMoney, formatMoney as formatCurrency, normalizeMoneyText } from '../utils/money';

type ServiceCategory = 'MANICURE' | 'PEDICURE' | 'GEL' | 'ACRYLIC' | 'NAIL_ART' | 'SPA';
type ServiceStatus = 'ACTIVE' | 'HIDDEN' | 'DRAFT';
type BranchCode = 'Q1' | 'Q3';
type ServiceView = 'TABLE' | 'CARDS';

interface PriceHistory {
  date: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
}

export interface SalonService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  duration: number;
  bufferTime: number;
  requiredSkill: string;
  taxRate: number;
  price: number;
  memberPrice: number;
  cost: number;
  deposit: number;
  commissionRate: number;
  status: ServiceStatus;
  onlineBooking: boolean;
  branches: BranchCode[];
  staffCount: number;
  bookings: number;
  revenue: number;
  rating: number;
  addOns: string[];
  notes: string;
  priceHistory: PriceHistory[];
}

interface TenantAdminServicesProps {
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

interface ServiceFormState {
  name: string;
  category: ServiceCategory;
  description: string;
  duration: string;
  bufferTime: string;
  requiredSkill: string;
  taxRate: string;
  price: string;
  memberPrice: string;
  cost: string;
  deposit: string;
  commissionRate: string;
  status: ServiceStatus;
  onlineBooking: boolean;
  branchQ1: boolean;
  branchQ3: boolean;
  notes: string;
}

const categoryMeta: Record<ServiceCategory, { label: string; color: string; badge: string; icon: typeof Scissors }> = {
  MANICURE: { label: 'Manicure', color: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-200', icon: Scissors },
  PEDICURE: { label: 'Pedicure', color: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200', icon: Target },
  GEL: { label: 'Sơn & đắp gel', color: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-200', icon: Sparkles },
  ACRYLIC: { label: 'Acrylic', color: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', icon: Layers3 },
  NAIL_ART: { label: 'Nail Art', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 ring-rose-200', icon: Sparkles },
  SPA: { label: 'Chăm sóc móng', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Target }
};

const statusMeta: Record<ServiceStatus, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Đang kinh doanh', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  HIDDEN: { label: 'Đang ẩn', badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  DRAFT: { label: 'Bản nháp', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' }
};

const branchLabels: Record<BranchCode, string> = { Q1: 'Quận 1', Q3: 'Quận 3' };

export const serviceSeed: SalonService[] = [
  { id: 'SVC-001', name: 'Nail Art Premium', category: 'NAIL_ART', description: 'Thiết kế móng cá nhân hóa với vẽ tay, charm và hiệu ứng theo mẫu khách chọn.', duration: 120, bufferTime: 15, requiredSkill: 'Nail Artist Senior · Nail Art nâng cao', taxRate: 8, price: 950_000, memberPrice: 855_000, cost: 220_000, deposit: 300_000, commissionRate: 18, status: 'ACTIVE', onlineBooking: true, branches: ['Q1', 'Q3'], staffCount: 4, bookings: 42, revenue: 39_900_000, rating: 4.9, addOns: ['Charm cao cấp +120.000đ', 'Tháo gel cũ +80.000đ'], notes: 'Giá gồm tối đa 4 móng vẽ tay; mẫu phức tạp được tư vấn trước khi xác nhận.', priceHistory: [{ date: '01/06/2026', oldPrice: 850_000, newPrice: 950_000, reason: 'Cập nhật vật tư Nail Art cao cấp' }, { date: '01/01/2026', oldPrice: 790_000, newPrice: 850_000, reason: 'Điều chỉnh bảng giá năm 2026' }] },
  { id: 'SVC-002', name: 'Combo manicure & sơn gel', category: 'MANICURE', description: 'Làm sạch da, tạo form móng và sơn gel bền màu theo quy trình tiêu chuẩn.', duration: 75, bufferTime: 10, requiredSkill: 'Nail Technician · Manicure & Gel', taxRate: 8, price: 450_000, memberPrice: 405_000, cost: 105_000, deposit: 100_000, commissionRate: 18, status: 'ACTIVE', onlineBooking: true, branches: ['Q1', 'Q3'], staffCount: 7, bookings: 68, revenue: 30_600_000, rating: 4.9, addOns: ['Sơn mắt mèo +90.000đ', 'Gia cố móng +120.000đ'], notes: 'Dụng cụ được đóng túi tiệt khuẩn riêng cho từng lượt phục vụ.', priceHistory: [{ date: '15/04/2026', oldPrice: 420_000, newPrice: 450_000, reason: 'Nâng cấp dòng sơn gel Hàn Quốc' }] },
  { id: 'SVC-003', name: 'Pedicure spa chuyên sâu', category: 'PEDICURE', description: 'Chăm sóc móng chân, làm sạch da, tẩy tế bào chết và massage thư giãn.', duration: 90, bufferTime: 15, requiredSkill: 'Pedicure Specialist · Spa chân', taxRate: 8, price: 650_000, memberPrice: 585_000, cost: 155_000, deposit: 150_000, commissionRate: 17, status: 'ACTIVE', onlineBooking: true, branches: ['Q1', 'Q3'], staffCount: 5, bookings: 51, revenue: 33_150_000, rating: 4.8, addOns: ['Ủ paraffin +150.000đ', 'Sơn gel chân +180.000đ'], notes: 'Không thực hiện khi khách có dấu hiệu viêm hoặc tổn thương da chưa được xử lý.', priceHistory: [{ date: '01/03/2026', oldPrice: 590_000, newPrice: 650_000, reason: 'Bổ sung bước ủ dưỡng chuyên sâu' }] },
  { id: 'SVC-004', name: 'Đắp gel nối móng', category: 'GEL', description: 'Nối móng bằng gel, cân chỉnh form và hoàn thiện bề mặt tự nhiên.', duration: 150, bufferTime: 15, requiredSkill: 'Nail Artist Senior · Gel Extension', taxRate: 8, price: 890_000, memberPrice: 801_000, cost: 235_000, deposit: 300_000, commissionRate: 20, status: 'ACTIVE', onlineBooking: true, branches: ['Q1', 'Q3'], staffCount: 5, bookings: 37, revenue: 32_930_000, rating: 4.8, addOns: ['French đầu móng +120.000đ', 'Dặm gel sau 2 tuần +280.000đ'], notes: 'Giá áp dụng độ dài S–M; độ dài L trở lên có phụ thu theo form.', priceHistory: [{ date: '01/01/2026', oldPrice: 820_000, newPrice: 890_000, reason: 'Điều chỉnh bảng giá năm 2026' }] },
  { id: 'SVC-005', name: 'Acrylic Full Set', category: 'ACRYLIC', description: 'Tạo form acrylic bền chắc, phù hợp khách cần độ dài và kết cấu ổn định.', duration: 150, bufferTime: 20, requiredSkill: 'Nail Artist Senior · Acrylic', taxRate: 8, price: 1_350_000, memberPrice: 1_215_000, cost: 360_000, deposit: 400_000, commissionRate: 20, status: 'ACTIVE', onlineBooking: true, branches: ['Q3'], staffCount: 3, bookings: 28, revenue: 37_800_000, rating: 4.9, addOns: ['Ombre bột +180.000đ', 'Tháo acrylic cũ +150.000đ'], notes: 'Chỉ phục vụ tại Quận 3; cần kiểm tra nền móng trước khi thực hiện.', priceHistory: [{ date: '01/01/2026', oldPrice: 1_250_000, newPrice: 1_350_000, reason: 'Cập nhật bột acrylic ít mùi' }] },
  { id: 'SVC-006', name: 'Sơn gel Hàn Quốc', category: 'GEL', description: 'Sơn gel một màu với bảng màu cao cấp, bền màu và tháo đúng kỹ thuật.', duration: 60, bufferTime: 10, requiredSkill: 'Nail Technician · Gel Polish', taxRate: 8, price: 420_000, memberPrice: 378_000, cost: 95_000, deposit: 100_000, commissionRate: 15, status: 'ACTIVE', onlineBooking: true, branches: ['Q1', 'Q3'], staffCount: 8, bookings: 74, revenue: 31_080_000, rating: 4.8, addOns: ['Mắt mèo +90.000đ', 'Tráng gương +110.000đ'], notes: 'Đã gồm làm sạch da cơ bản; chưa gồm tháo lớp gel cũ.', priceHistory: [{ date: '10/02/2026', oldPrice: 390_000, newPrice: 420_000, reason: 'Mở rộng bảng màu cao cấp' }] },
  { id: 'SVC-007', name: 'Chăm sóc gót chân', category: 'SPA', description: 'Làm mềm, xử lý da chai và dưỡng ẩm gót chân theo mức độ an toàn.', duration: 45, bufferTime: 15, requiredSkill: 'Pedicure Specialist · Foot Care', taxRate: 8, price: 320_000, memberPrice: 288_000, cost: 72_000, deposit: 0, commissionRate: 14, status: 'ACTIVE', onlineBooking: true, branches: ['Q1', 'Q3'], staffCount: 6, bookings: 46, revenue: 14_720_000, rating: 4.7, addOns: ['Ủ paraffin +150.000đ', 'Massage chân 15 phút +100.000đ'], notes: 'Nhân viên phải hoàn thành checklist vệ sinh bồn và dụng cụ sau mỗi lượt.', priceHistory: [{ date: '01/05/2026', oldPrice: 290_000, newPrice: 320_000, reason: 'Bổ sung sản phẩm dưỡng chuyên dụng' }] },
  { id: 'SVC-008', name: 'Nail Art cô dâu', category: 'NAIL_ART', description: 'Bộ móng thiết kế đồng bộ phong cách cưới, có buổi tư vấn mẫu và thử màu.', duration: 180, bufferTime: 20, requiredSkill: 'Nail Artist Senior · Bridal Design', taxRate: 8, price: 1_650_000, memberPrice: 1_485_000, cost: 430_000, deposit: 500_000, commissionRate: 18, status: 'ACTIVE', onlineBooking: false, branches: ['Q1'], staffCount: 2, bookings: 18, revenue: 29_700_000, rating: 4.9, addOns: ['Bộ móng thử +250.000đ', 'Charm Swarovski báo giá riêng'], notes: 'Chỉ nhận lịch sau tư vấn và xác nhận mẫu; khách nên đặt trước tối thiểu 7 ngày.', priceHistory: [{ date: '01/04/2026', oldPrice: 1_500_000, newPrice: 1_650_000, reason: 'Bổ sung buổi tư vấn thiết kế' }] },
  { id: 'SVC-009', name: 'Phục hồi móng IBX', category: 'SPA', description: 'Liệu trình củng cố móng yếu, bong tách hoặc hư tổn sau tháo gel.', duration: 45, bufferTime: 10, requiredSkill: 'Nail Technician · Nail Recovery', taxRate: 8, price: 380_000, memberPrice: 342_000, cost: 145_000, deposit: 0, commissionRate: 12, status: 'DRAFT', onlineBooking: false, branches: ['Q3'], staffCount: 4, bookings: 0, revenue: 0, rating: 0, addOns: ['Manicure cơ bản +160.000đ'], notes: 'Đang chạy thử nội bộ trước khi mở bán ngày 01/08/2026.', priceHistory: [] },
  { id: 'SVC-010', name: 'Kids Nail Combo', category: 'MANICURE', description: 'Chăm sóc móng nhẹ nhàng và sơn an toàn dành cho trẻ em từ 6 tuổi.', duration: 45, bufferTime: 10, requiredSkill: 'Nail Technician · Kids Care', taxRate: 8, price: 280_000, memberPrice: 252_000, cost: 65_000, deposit: 0, commissionRate: 12, status: 'HIDDEN', onlineBooking: false, branches: ['Q1', 'Q3'], staffCount: 5, bookings: 12, revenue: 3_360_000, rating: 4.8, addOns: ['Sticker an toàn +40.000đ'], notes: 'Cần người giám hộ đi cùng; chỉ sử dụng sản phẩm không mùi dành cho trẻ em.', priceHistory: [{ date: '01/02/2026', oldPrice: 250_000, newPrice: 280_000, reason: 'Cập nhật bộ sản phẩm an toàn trẻ em' }] }
];

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-body font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const marginPercent = (service: Pick<SalonService, 'price' | 'cost'>) => service.price ? Math.round((service.price - service.cost) / service.price * 100) : 0;
const parseMoneyInput = (value: string | number): number => {
  if (typeof value === 'number') return Math.max(0, Math.floor(value));
  if (!value) return 0;
  const digitsOnly = String(value).replace(/\D/g, '');
  return digitsOnly ? Math.max(0, parseInt(digitsOnly, 10)) : 0;
};

const formatMoneyInput = (value: string | number): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseMoneyInput(value);
  if (num === 0) {
    const rawStr = String(value).trim();
    if (rawStr === '0' || rawStr === '0đ') return '0';
    return '';
  }
  return num.toLocaleString('vi-VN');
};

const emptyForm = (branch: string): ServiceFormState => ({ name: '', category: 'MANICURE', description: '', duration: '60', bufferTime: '10', requiredSkill: 'Nail Technician', taxRate: '8', price: '', memberPrice: '', cost: '', deposit: '0', commissionRate: '15', status: 'DRAFT', onlineBooking: false, branchQ1: branch === 'Q1' || branch === 'ALL', branchQ3: branch !== 'Q1', notes: '' });

interface ServiceDetailDrawerProps {
  service: SalonService;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleOnlineBooking: () => void;
  onToggleStatus: () => void;
}

function ServiceDetailDrawer({
  service,
  canManage,
  onClose,
  onEdit,
  onToggleOnlineBooking,
  onToggleStatus,
}: ServiceDetailDrawerProps) {
  const CategoryIcon = categoryMeta[service.category].icon;
  const grossProfit = Math.max(0, service.price - service.cost);
  const memberSaving = Math.max(0, service.price - service.memberPrice);
  const totalSlotTime = service.duration + service.bufferTime;
  // ===== hết khối chẩn đoán =====

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="Đóng chi tiết dịch vụ"
        onClick={onClose}
        className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-detail-title"
        className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl sm:max-h-[calc(100vh-3rem)]"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-caption font-black uppercase tracking-[0.14em] text-violet-600">
              Chi tiết dịch vụ
            </p>
            <p className="mt-1 text-caption text-slate-400">
              {service.id} · {categoryMeta[service.category].label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="bg-gradient-to-br from-[#18142d] via-[#241b42] to-[#33225b] px-5 py-6 text-white sm:px-6">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/15">
                <CategoryIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-caption font-bold text-violet-100 ring-1 ring-white/15">
                    {categoryMeta[service.category].label}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${statusMeta[service.status].badge}`}>
                    {statusMeta[service.status].label}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${service.onlineBooking ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/25' : 'bg-white/10 text-slate-300 ring-white/15'}`}>
                    {service.onlineBooking ? 'Có đặt online' : 'Đặt tại quầy'}
                  </span>
                </div>
                <h2
                  id="service-detail-title"
                  className="mt-3 text-xl font-black tracking-[-0.025em] sm:text-2xl"
                >
                  {service.name}
                </h2>
                <p className="mt-2 max-w-xl text-caption leading-5 text-slate-300">
                  {service.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-caption font-bold text-slate-400">Giá niêm yết</p>
                <p className="mt-1 text-3xl font-black tracking-tight">
                  {formatCurrency(service.price)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.07] px-4 py-3 sm:text-right">
                <p className="text-caption font-bold text-slate-400">Giá thành viên</p>
                <p className="mt-1 text-sm font-black text-violet-200">
                  {formatCurrency(service.memberPrice)}
                </p>
                {memberSaving > 0 && (
                  <p className="mt-1 text-caption text-emerald-300">
                    Tiết kiệm {formatCurrency(memberSaving)}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-5 p-5 sm:p-6">
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Tổng thời gian',
                  value: `${totalSlotTime} phút`,
                  detail: `${service.duration} phút làm · ${service.bufferTime} phút vệ sinh`,
                  icon: Clock3,
                  tone: 'bg-blue-50 text-blue-600',
                },
                {
                  label: 'Lượt đặt',
                  value: service.bookings.toLocaleString('vi-VN'),
                  detail: 'Trong kỳ hiện tại',
                  icon: CalendarCheck2,
                  tone: 'bg-violet-50 text-violet-600',
                },
                {
                  label: 'Doanh thu',
                  value: formatCompactMoney(service.revenue),
                  detail: 'Doanh thu ghi nhận',
                  icon: TrendingUp,
                  tone: 'bg-emerald-50 text-emerald-600',
                },
                {
                  label: 'Đánh giá',
                  value: service.rating ? service.rating.toFixed(1) : '—',
                  detail: service.rating ? 'Điểm trung bình' : 'Chưa có đánh giá',
                  icon: Star,
                  tone: 'bg-amber-50 text-amber-600',
                },
              ].map(({ label, value, detail, icon: Icon, tone }) => (
                <article key={label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-caption font-bold text-slate-400">{label}</p>
                  <p className="mt-1 text-body font-black text-slate-900">{value}</p>
                  <p className="mt-1 text-caption leading-4 text-slate-400">{detail}</p>
                </article>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4">
                <div>
                  <h3 className="text-caption font-black text-slate-900">Giá & lợi nhuận</h3>
                  <p className="mt-1 text-caption text-slate-400">Cấu trúc tài chính trên mỗi lượt dịch vụ</p>
                </div>
                <CircleDollarSign className="h-4.5 w-4.5 text-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3">
                {[
                  { label: 'Chi phí trực tiếp', value: formatCurrency(service.cost), tone: 'text-slate-900' },
                  { label: 'Lãi gộp dự kiến', value: formatCurrency(grossProfit), tone: 'text-emerald-600' },
                  { label: 'Biên lợi nhuận', value: `${marginPercent(service)}%`, tone: 'text-emerald-600' },
                  { label: 'Hoa hồng', value: `${service.commissionRate}%`, tone: 'text-violet-600' },
                  { label: 'Tiền đặt cọc', value: service.deposit ? formatCurrency(service.deposit) : 'Không yêu cầu', tone: 'text-slate-900' },
                  { label: 'Thuế VAT', value: `${service.taxRate}%`, tone: 'text-slate-900' },
                ].map((item) => (
                  <div key={item.label} className="bg-white p-4">
                    <p className="text-caption font-bold text-slate-400">{item.label}</p>
                    <p className={`mt-1.5 text-caption font-black ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-caption font-black text-slate-900">Vận hành & phân phối</h3>
                  <p className="mt-1 text-caption text-slate-400">Nhân sự, chi nhánh và kênh nhận lịch</p>
                </div>
                <Store className="h-4.5 w-4.5 text-violet-500" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-violet-500" />
                    <p className="text-caption font-black text-slate-700">Nhân sự đủ điều kiện</p>
                  </div>
                  <p className="mt-2 text-lg font-black text-slate-900">{service.staffCount} người</p>
                  <p className="mt-1 text-caption leading-4 text-slate-500">{service.requiredSkill}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-blue-500" />
                    <p className="text-caption font-black text-slate-700">Chi nhánh áp dụng</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {service.branches.map((branch) => (
                      <span key={branch} className="rounded-full bg-white px-2.5 py-1 text-caption font-bold text-slate-600 ring-1 ring-slate-200">
                        {branchLabels[branch]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-all border-slate-200 bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${service.onlineBooking ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Globe className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-caption font-black text-slate-800">Đặt lịch trực tuyến</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-extrabold transition-colors ${service.onlineBooking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${service.onlineBooking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {service.onlineBooking ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-caption leading-4 text-slate-400">
                      {service.onlineBooking ? 'Cho phép đặt trên ứng dụng khách hàng.' : 'Chỉ nhận lịch tại quầy hoặc qua điện thoại.'}
                    </p>
                  </div>
                </div>
                {/* Công tắc dùng lại `Switch` của thư viện chung (README §11.3).
                    Bản tự dựng trước đây là một <button>, mà `.role-shell--* button`
                    ép mọi <button> về khổ control 40px và bo góc 8px — nằm ngoài
                    @layer nên đè luôn `h-5 w-9 rounded-full` — khiến công tắc thành
                    khối vuông 36×40 thay vì thanh gạt. `Switch` dựng bằng
                    <input type="checkbox"> nên không dính các quy tắc đó, đồng thời
                    có sẵn role/bàn phím đúng chuẩn.

                    Màu bật lấy tông "thành công" thay vì accent của cổng: cả hàng
                    này — icon, huy hiệu "Đang bật" — đều nói bằng ngôn ngữ xanh
                    lá, để accent hồng vào đây sẽ lạc lõng. */}
                <span className="inline-flex shrink-0" style={{ '--accent': 'var(--color-brand-secondary)' } as CSSProperties}>
                  <Switch
                    checked={service.onlineBooking}
                    onChange={onToggleOnlineBooking}
                    disabled={!canManage}
                    label="Bật hoặc tắt đặt lịch online"
                    labelHidden
                  />
                </span>
              </div>
            </section>

            {service.addOns.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-fuchsia-500" />
                  <h3 className="text-caption font-black text-slate-900">Dịch vụ thêm gợi ý</h3>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {service.addOns.map((item) => (
                    <div key={item} className="flex items-start gap-2 rounded-xl bg-fuchsia-50 p-3 text-caption font-bold leading-4 text-fuchsia-700">
                      <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {normalizeMoneyText(item)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-caption font-black text-slate-900">Lịch sử thay đổi giá</h3>
                  <p className="mt-1 text-caption text-slate-400">Các lần điều chỉnh gần nhất</p>
                </div>
                <ReceiptText className="h-4.5 w-4.5 text-violet-500" />
              </div>
              <div className="mt-3 space-y-2">
                {service.priceHistory.length ? (
                  service.priceHistory.map((item) => (
                    <article key={`${item.date}-${item.newPrice}`} className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-100/80 px-2 py-0.5 text-caption font-extrabold text-violet-700">
                          <Calendar className="h-3 w-3 text-violet-500 shrink-0" />
                          <span>{item.date}</span>
                        </span>
                        <div className="flex items-center gap-1.5 text-caption font-black text-slate-800">
                          <span className="text-slate-400 line-through font-medium">{formatCurrency(item.oldPrice)}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-emerald-600">{formatCurrency(item.newPrice)}</span>
                        </div>
                      </div>
                      {item.reason && (
                        <p className="text-caption leading-4 text-slate-500 break-words">{item.reason}</p>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
                    <ReceiptText className="mx-auto h-5 w-5 text-slate-300" />
                    <p className="mt-2 text-caption text-slate-400">Chưa có lịch sử điều chỉnh giá.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-caption font-black uppercase tracking-wide text-amber-800">Lưu ý vận hành</h3>
                  <p className="mt-2 text-caption leading-5 text-amber-800/80">
                    {service.notes || 'Chưa có lưu ý cho dịch vụ này.'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white p-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onEdit}
              disabled={!canManage}
              className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
            >
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={onToggleStatus}
              disabled={!canManage}
              className="flex h-11 flex-1 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-caption font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
            >
              {service.status === 'ACTIVE' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {service.status === 'ACTIVE' ? 'Ẩn dịch vụ' : 'Mở bán dịch vụ'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function TenantAdminServices({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = 'Nailé Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason,
  onNotify
}: TenantAdminServicesProps) {
  const storageKey = 'tenant-admin-services-v2:' + tenantName;
  const [services, setServices] = useState<SalonService[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      return getTenantAdminInitialData(Array.isArray(parsed) ? parsed : null, serviceSeed);
    } catch {
      return getTenantAdminInitialData(null, serviceSeed);
    }
  });
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ServiceCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServiceStatus>('ALL');
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [sortBy, setSortBy] = useState<'REVENUE' | 'BOOKINGS' | 'PRICE_HIGH' | 'PRICE_LOW' | 'NAME'>('REVENUE');
  const [viewMode, setViewMode] = useState<ServiceView>('TABLE');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedService, setSelectedService] = useState<SalonService | null>(null);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [form, setForm] = useState<ServiceFormState>(() => emptyForm(selectedBranch));
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(services));
    } catch {
      // Local storage is optional; the page remains usable when it is unavailable.
    }
  }, [services, storageKey]);

  useEffect(() => {
    if (!selectedService && !formMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (formMode) setFormMode(null);
      else setSelectedService(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [formMode, selectedService]);

  const canManage = accessMode === 'full';
  const requireManage = () => {
    if (canManage) return true;
    const message = readOnlyReason || 'Tài khoản hiện chỉ có quyền xem danh mục dịch vụ và bảng giá.';
    setNotice(message);
    onNotify?.(message);
    return false;
  };

  const branchServices = useMemo(() => services.filter((service) => selectedBranch === 'ALL' || service.branches.includes(selectedBranch as BranchCode)), [selectedBranch, services]);
  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return branchServices
      .filter((service) => categoryFilter === 'ALL' || service.category === categoryFilter)
      .filter((service) => statusFilter === 'ALL' || service.status === statusFilter)
      .filter((service) => bookingFilter === 'ALL' || (bookingFilter === 'ONLINE' ? service.onlineBooking : !service.onlineBooking))
      .filter((service) => !query || `${service.id} ${service.name} ${service.description} ${service.addOns.join(' ')}`.toLowerCase().includes(query))
      .sort((a, b) => sortBy === 'BOOKINGS' ? b.bookings - a.bookings : sortBy === 'PRICE_HIGH' ? b.price - a.price : sortBy === 'PRICE_LOW' ? a.price - b.price : sortBy === 'NAME' ? a.name.localeCompare(b.name, 'vi') : b.revenue - a.revenue);
  }, [bookingFilter, branchServices, categoryFilter, searchQuery, sortBy, statusFilter]);

  const activeFilterCount = [categoryFilter !== 'ALL', statusFilter !== 'ALL', bookingFilter !== 'ALL'].filter(Boolean).length;
  const activeCount = branchServices.filter((service) => service.status === 'ACTIVE').length;
  const totalRevenue = branchServices.reduce((sum, service) => sum + service.revenue, 0);
  const totalBookings = branchServices.reduce((sum, service) => sum + service.bookings, 0);
  const averageTicket = totalBookings ? Math.round(totalRevenue / totalBookings) : 0;

  const openCreate = () => { if (!requireManage()) return; setForm(emptyForm(selectedBranch)); setFormError(''); setFormMode('CREATE'); };
  const openEdit = (service: SalonService) => {
    if (!requireManage()) return;
    setForm({
      name: service.name,
      category: service.category,
      description: service.description,
      duration: String(service.duration),
      bufferTime: String(service.bufferTime),
      requiredSkill: service.requiredSkill,
      taxRate: String(service.taxRate),
      price: formatMoneyInput(service.price),
      memberPrice: formatMoneyInput(service.memberPrice),
      cost: formatMoneyInput(service.cost),
      deposit: formatMoneyInput(service.deposit),
      commissionRate: String(service.commissionRate),
      status: service.status,
      onlineBooking: service.onlineBooking,
      branchQ1: service.branches.includes('Q1'),
      branchQ3: service.branches.includes('Q3'),
      notes: service.notes
    });
    setFormError('');
    setFormMode('EDIT');
  };

  const submitService = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    const price = parseMoneyInput(form.price);
    const memberPrice = parseMoneyInput(form.memberPrice) || price;
    const cost = parseMoneyInput(form.cost);
    const deposit = parseMoneyInput(form.deposit);

    if (!form.name.trim() || !form.description.trim() || Number(form.duration) <= 0 || price <= 0) {
      setFormError('Vui lòng nhập tên, mô tả, thời lượng và giá dịch vụ hợp lệ.');
      return;
    }
    if (!form.branchQ1 && !form.branchQ3) {
      setFormError('Dịch vụ cần được áp dụng tại ít nhất một chi nhánh.');
      return;
    }
    const duplicate = services.find((service) => service.name.trim().toLowerCase() === form.name.trim().toLowerCase() && service.id !== selectedService?.id);
    if (duplicate) { setFormError(`Tên dịch vụ đã tồn tại với mã ${duplicate.id}.`); return; }
    const existing = formMode === 'EDIT' ? selectedService : null;
    const oldPrice = existing?.price || price;
    const id = existing?.id || `SVC-${String(Math.max(...services.map((service) => Number(service.id.replace('SVC-', '')))) + 1).padStart(3, '0')}`;
    const branches = ([form.branchQ1 ? 'Q1' : null, form.branchQ3 ? 'Q3' : null].filter(Boolean)) as BranchCode[];
    const history = existing ? (price !== oldPrice ? [{ date: '20/07/2026', oldPrice, newPrice: price, reason: 'Điều chỉnh từ trang quản trị' }, ...existing.priceHistory] : existing.priceHistory) : [];
    const payload: SalonService = { id, name: form.name.trim(), category: form.category, description: form.description.trim(), duration: Number(form.duration), bufferTime: Math.max(0, Number(form.bufferTime) || 0), requiredSkill: form.requiredSkill.trim() || 'Nail Technician', taxRate: Math.max(0, Number(form.taxRate) || 0), price, memberPrice, cost, deposit, commissionRate: Math.max(0, Number(form.commissionRate) || 0), status: form.status, onlineBooking: form.onlineBooking, branches, notes: form.notes.trim(), staffCount: existing?.staffCount || 0, bookings: existing?.bookings || 0, revenue: existing?.revenue || 0, rating: existing?.rating || 0, addOns: existing?.addOns || [], priceHistory: history };
    setServices((current) => formMode === 'EDIT' ? current.map((service) => service.id === id ? payload : service) : [payload, ...current]);
    setSelectedService(payload);
    setFormMode(null);
    setNotice(formMode === 'CREATE' ? `Đã tạo dịch vụ ${payload.name}.` : `Đã cập nhật ${payload.name}.`);
  };

  const updateService = (id: string, patch: Partial<SalonService>) => { if (!requireManage()) return; setServices((current) => current.map((service) => service.id === id ? { ...service, ...patch } : service)); setSelectedService((current) => current?.id === id ? { ...current, ...patch } : current); };
  const resetFilters = () => { setCategoryFilter('ALL'); setStatusFilter('ALL'); setBookingFilter('ALL'); onSearchQueryChange(''); };
  const exportServices = () => { if (!requireManage()) return; const rows = filteredServices.map((service) => [service.id, service.name, categoryMeta[service.category].label, service.duration, service.bufferTime, service.requiredSkill, service.taxRate, service.price, service.memberPrice, service.cost, marginPercent(service), service.commissionRate, statusMeta[service.status].label].join(',')); const blob = new Blob([`Mã dịch vụ,Tên,Nhóm,Thời lượng,Thời gian vệ sinh,Kỹ năng bắt buộc,Thuế suất,Giá niêm yết,Giá thành viên,Chi phí,Biên lợi nhuận,Hoa hồng,Trạng thái\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'danh-muc-dich-vu.csv'; link.click(); URL.revokeObjectURL(link.href); };

  return (
    <div className="space-y-5">
      {notice && <div className="fixed right-4 top-24 z-[80] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><p className="text-caption font-bold text-slate-700">{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo" className="ml-2 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button></div>}

      <PageHeader
        title="Dịch vụ & giá"
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><BeautifulSelect value={selectedBranch} onChange={(event) => onSelectedBranchChange(event.target.value)} aria-label="Chọn chi nhánh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold text-slate-700 shadow-sm sm:w-48"><option value="Q3">Chi nhánh Quận 3</option><option value="Q1">Chi nhánh Quận 1</option><option value="ALL">Tất cả chi nhánh</option></BeautifulSelect><button type="button" onClick={exportServices} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Xuất bảng giá</button><button type="button" onClick={openCreate} disabled={!canManage} className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-caption font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"><Plus className="h-4 w-4" />Thêm dịch vụ</button></div>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'Tổng dịch vụ', value: String(branchServices.length), detail: `${activeCount} dịch vụ đang kinh doanh`, icon: Boxes, tone: 'bg-blue-50 text-blue-600' },
        { label: 'Doanh thu dịch vụ', value: formatCompactMoney(totalRevenue), detail: '+14,2% so với tháng trước', icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-600' },
        { label: 'Giá trị lịch hẹn TB', value: formatCurrency(averageTicket), detail: `${totalBookings} lượt đặt trong tháng`, icon: ReceiptText, tone: 'bg-violet-50 text-violet-600' },
        { label: 'Biên lợi nhuận TB', value: '68,4%', detail: 'Sau chi phí vật tư trực tiếp', icon: TrendingUp, tone: 'bg-amber-50 text-amber-600' }
      ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><p className="text-caption font-bold text-slate-500">{label}</p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-2 text-caption font-semibold text-slate-400">{detail}</p></article>)}</section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Cơ cấu doanh thu theo nhóm</h2><p className="mt-1 text-caption text-slate-400">Tháng 07/2026 · Theo dịch vụ đã hoàn thành</p></div><BarChart3 className="h-4.5 w-4.5 text-violet-500" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{(Object.keys(categoryMeta) as ServiceCategory[]).map((category) => { const categoryServices = branchServices.filter((service) => service.category === category); const revenue = categoryServices.reduce((sum, service) => sum + service.revenue, 0); const percent = totalRevenue ? Math.round(revenue / totalRevenue * 100) : 0; const Icon = categoryMeta[category].icon; return <button key={category} type="button" onClick={() => setCategoryFilter(category)} className={`h-auto min-h-24 border p-3 text-left shadow-none ${categoryFilter === category ? 'border-violet-300 bg-violet-50/60' : 'border-slate-100 bg-slate-50/70'}`}><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${categoryMeta[category].badge}`}><Icon className="h-4 w-4" /></span><span className="text-caption font-black text-slate-500">{percent}%</span></div><p className="mt-2 truncate text-caption font-black text-slate-700">{categoryMeta[category].label}</p><p className="ta-money mt-1 text-right text-caption text-slate-500">{categoryServices.length} dịch vụ · {formatCompactMoney(revenue)}</p></button>; })}</div></article><article className="rounded-2xl bg-gradient-to-br from-[#19152e] to-[#292148] p-5 text-white shadow-xl shadow-violet-950/10"><div className="flex items-start justify-between"><div><p className="text-caption font-bold uppercase tracking-[0.14em] text-violet-300">Tối ưu bảng giá</p><p className="mt-2 text-xl font-black">6 dịch vụ cần xem xét</p></div><BadgePercent className="h-5 w-5 text-violet-300" /></div><p className="mt-3 text-caption leading-4 text-slate-400">Biên lợi nhuận thấp hơn 55% hoặc chưa điều chỉnh giá trong 12 tháng.</p><div className="mt-4 space-y-2 text-caption"><div className="flex items-center justify-between"><span className="text-slate-400">Biên thấp</span><span className="font-black">3 dịch vụ</span></div><div className="flex items-center justify-between"><span className="text-slate-400">Giá chưa cập nhật</span><span className="font-black">2 dịch vụ</span></div><div className="flex items-center justify-between"><span className="text-slate-400">Đặt ít</span><span className="font-black">1 dịch vụ</span></div></div><button type="button" onClick={() => { setSortBy('PRICE_LOW'); setShowFilters(true); setNotice('Đã sắp xếp danh sách để kiểm tra giá.'); }} className="mt-5 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/10 text-caption font-black text-white shadow-none"><Tag className="h-3.5 w-3.5" />Rà soát bảng giá</button></article></section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm tên, mã dịch vụ, mô tả hoặc dịch vụ thêm..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-caption outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />{searchQuery && <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Xóa tìm kiếm" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"><X className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowFilters((value) => !value)} className={`flex h-10 items-center gap-2 border px-3 text-caption font-bold shadow-sm ${showFilters || activeFilterCount ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}><Filter className="h-3.5 w-3.5" />Bộ lọc{activeFilterCount > 0 && <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-caption text-white">{activeFilterCount}</span>}</button><BeautifulSelect value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} aria-label="Sắp xếp dịch vụ" className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"><option value="REVENUE">Doanh thu cao nhất</option><option value="BOOKINGS">Lượt đặt nhiều nhất</option><option value="PRICE_HIGH">Giá cao nhất</option><option value="PRICE_LOW">Giá thấp nhất</option><option value="NAME">Tên A–Z</option></BeautifulSelect><div className="flex items-center rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setViewMode('TABLE')} aria-label="Xem bảng" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'TABLE' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutList className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setViewMode('CARDS')} aria-label="Xem thẻ" className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'CARDS' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /></button></div></div></div>

        {showFilters && <div className="grid gap-3 border-b border-slate-100 bg-violet-50/40 p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]"><label><span className="mb-1.5 block text-caption font-black uppercase text-slate-500">Nhóm dịch vụ</span><BeautifulSelect value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | ServiceCategory)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"><option value="ALL">Tất cả nhóm</option>{Object.entries(categoryMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-caption font-black uppercase text-slate-500">Trạng thái</span><BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ServiceStatus)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><label><span className="mb-1.5 block text-caption font-black uppercase text-slate-500">Đặt lịch online</span><BeautifulSelect value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value as typeof bookingFilter)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"><option value="ALL">Tất cả dịch vụ</option><option value="ONLINE">Đang mở online</option><option value="OFFLINE">Chỉ đặt tại quầy</option></BeautifulSelect></label><button type="button" onClick={resetFilters} className="self-end border border-slate-200 bg-white px-3 text-caption font-bold text-slate-600 shadow-sm">Đặt lại</button></div>}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3">{(['ALL', 'ACTIVE', 'HIDDEN', 'DRAFT'] as const).map((status) => { const count = status === 'ALL' ? branchServices.length : branchServices.filter((service) => service.status === status).length; return <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-0 text-caption font-bold shadow-none ${statusFilter === status ? 'text-violet-700' : 'text-slate-500'}`}>{status !== 'ALL' && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />}{status === 'ALL' ? 'Tất cả dịch vụ' : statusMeta[status].label}<span className={`rounded-full px-1.5 py-0.5 ${statusFilter === status ? 'bg-violet-100' : 'bg-slate-100'}`}>{count}</span></button>; })}<span className="ml-auto text-caption text-slate-400">{filteredServices.length} dịch vụ phù hợp</span></div>

        {viewMode === 'TABLE' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-caption font-black uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5">Dịch vụ</th>
                  <th className="px-4 py-3.5">Nhóm</th>
                  <th className="px-4 py-3.5">Thời lượng & Cọc</th>
                  <th className="px-4 py-3.5">Giá bán</th>
                  <th className="px-4 py-3.5">Chi phí & Lãi gộp</th>
                  <th className="px-4 py-3.5">Hiệu suất</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => {
                  const CategoryIcon = categoryMeta[service.category].icon;
                  return (
                    <tr
                      key={service.id}
                      className="group transition-colors hover:bg-violet-50/30"
                    >
                      {/* 1. Tên dịch vụ & Mã */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${categoryMeta[service.category].badge}`}
                          >
                            <CategoryIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-body font-bold text-slate-900 sm:text-xs">
                              {service.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-slate-400">
                              <span className="font-mono font-medium text-slate-500">
                                {service.id}
                              </span>
                              <span>·</span>
                              <span>
                                {service.branches
                                  .map((b) => branchLabels[b])
                                  .join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Nhóm dịch vụ */}
                      <td className="px-4 py-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-caption font-bold ring-1 ${categoryMeta[service.category].badge}`}
                        >
                          {categoryMeta[service.category].label}
                        </span>
                      </td>

                      {/* 3. Thời lượng và cọc */}
                      <td className="px-4 py-4 align-middle">
                        <p className="text-caption font-bold text-slate-800">
                          {service.duration} phút{' '}
                          <span className="font-normal text-slate-400">
                            (+{service.bufferTime}p đệm)
                          </span>
                        </p>
                        <p className="mt-0.5 text-caption text-slate-400">
                          {service.deposit > 0
                            ? `Cọc: ${formatCurrency(service.deposit)}`
                            : 'Không cọc'}
                        </p>
                      </td>

                      {/* 4. Giá bán */}
                      <td className="px-4 py-4 align-middle">
                        <p className="text-body font-black text-slate-900 sm:text-xs">
                          {formatCurrency(service.price)}
                        </p>
                        <p className="mt-0.5 text-caption font-semibold text-violet-600">
                          TV: {formatCurrency(service.memberPrice)}
                        </p>
                      </td>

                      {/* 5. Chi phí & lãi gộp */}
                      <td className="px-4 py-4 align-middle">
                        <p className="text-caption font-bold text-slate-800">
                          {formatCurrency(service.cost)}{' '}
                          <span
                            className={`ml-1 inline-block rounded px-1.5 py-0.5 text-caption font-extrabold ${marginPercent(service) >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                          >
                            Lãi {marginPercent(service)}%
                          </span>
                        </p>
                        <p className="mt-0.5 text-caption text-slate-400">
                          Hoa hồng: {service.commissionRate}%
                        </p>
                      </td>

                      {/* 6. Hiệu suất */}
                      <td className="px-4 py-4 align-middle">
                        <p className="text-caption font-bold text-slate-800">
                          {service.bookings} lượt ·{' '}
                          {(service.revenue / 1_000_000).toLocaleString('vi-VN')}
                          tr
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-caption text-slate-500">
                          <span className="flex items-center gap-0.5 font-bold text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {service.rating || '—'}
                          </span>
                          <span>·</span>
                          <span>{service.staffCount} KTV</span>
                        </div>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-bold ring-1 ${statusMeta[service.status].badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusMeta[service.status].dot}`}
                            />
                            {statusMeta[service.status].label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-semibold ${service.onlineBooking ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-500'}`}
                          >
                            {service.onlineBooking ? (
                              <Eye className="h-2.5 w-2.5 text-emerald-600" />
                            ) : (
                              <EyeOff className="h-2.5 w-2.5 text-slate-400" />
                            )}
                            {service.onlineBooking
                              ? 'Có trên trang online'
                              : 'Chỉ tại quầy'}
                          </span>
                        </div>
                      </td>

                      {/* 8. Thao tác */}
                      <td className="px-5 py-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedService(service)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-caption font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <Eye className="h-3.5 w-3.5 text-violet-600" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredServices.length && (
              <div className="px-6 py-14 text-center">
                <Search className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-caption font-black text-slate-600">
                  Không tìm thấy dịch vụ phù hợp
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 border-0 bg-transparent px-2 text-caption font-bold text-violet-600 shadow-none"
                >
                  Xóa tìm kiếm và bộ lọc
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((service) => {
              const CategoryIcon = categoryMeta[service.category].icon;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service)}
                  className="group flex h-auto min-h-64 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${categoryMeta[service.category].badge}`}
                      >
                        <CategoryIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-bold text-slate-900">
                          {service.name}
                        </p>
                        <p className="mt-1 text-caption text-slate-400">
                          {categoryMeta[service.category].label} · {service.duration} phút
                        </p>
                        <p className="mt-0.5 truncate text-caption text-slate-400">
                          {service.bufferTime}p vệ sinh · {service.requiredSkill}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${statusMeta[service.status].badge}`}
                      >
                        {statusMeta[service.status].label}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-caption leading-4 text-slate-500">
                      {service.description}
                    </p>
                  </div>

                  <div>
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-caption font-medium text-slate-400">Giá bán</p>
                        <p className="mt-1 truncate text-caption font-black text-slate-900">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-caption font-medium text-slate-400">Lãi gộp</p>
                        <p className="mt-1 text-caption font-black text-emerald-600">
                          {marginPercent(service)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-caption font-medium text-slate-400">Lượt đặt</p>
                        <p className="mt-1 text-caption font-black text-violet-600">
                          {service.bookings}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-caption">
                      <span className="flex items-center gap-1 text-slate-500">
                        <UsersRound className="h-3 w-3 text-slate-400" />
                        {service.staffCount} KTV
                      </span>
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {service.rating || '—'}
                      </span>
                      <span
                        className={
                          service.onlineBooking
                            ? 'font-bold text-emerald-600'
                            : 'text-slate-400'
                        }
                      >
                        {service.onlineBooking ? 'Có online' : 'Tại quầy'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-caption text-slate-400">Hiển thị <span className="font-black text-slate-600">{filteredServices.length}</span> dịch vụ · Giá đã bao gồm VAT</p><p className="flex items-center gap-1.5 text-caption text-slate-400"><Store className="h-3.5 w-3.5" />{selectedBranch === 'ALL' ? 'Tất cả chi nhánh' : `Chi nhánh ${branchLabels[selectedBranch as BranchCode]}`}</p></div></section>

      <section className="grid gap-5 lg:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Dịch vụ bán chạy</h2><p className="mt-1 text-caption text-slate-400">Theo lượt đặt tháng 07/2026</p></div><TrendingUp className="h-4.5 w-4.5 text-emerald-500" /></div><div className="mt-3 space-y-1">{[...branchServices].sort((a, b) => b.bookings - a.bookings).slice(0, 4).map((service, index) => <button key={service.id} type="button" onClick={() => setSelectedService(service)} className="flex h-auto w-full items-center gap-3 border-0 bg-transparent px-0 py-2.5 text-left shadow-none"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-caption font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-caption font-black text-slate-700">{service.name}</span><span className="ta-money mt-1 block text-caption text-slate-400">{service.bookings} lượt · {formatCurrency(service.price)}</span></span><span className="ta-money text-right text-caption font-black text-slate-800">{formatCompactMoney(service.revenue)}</span></button>)}</div></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Hiệu quả đặt online</h2><p className="mt-1 text-caption text-slate-400">Tỷ lệ chuyển đổi trang đặt lịch</p></div><CalendarCheck2 className="h-4.5 w-4.5 text-violet-500" /></div><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-caption text-slate-400">Hiển thị</p><p className="mt-1 text-lg font-black text-slate-900">{branchServices.filter((service) => service.onlineBooking).length}</p></div><div><p className="text-caption text-slate-400">Chuyển đổi</p><p className="mt-1 text-lg font-black text-slate-900">18,6%</p></div><div><p className="text-caption text-slate-400">Doanh thu</p><p className="mt-1 text-lg font-black text-emerald-600">42%</p></div></div><div className="mt-4 rounded-xl bg-violet-50 p-3"><p className="text-caption font-black text-violet-800">Gợi ý</p><p className="mt-1 text-caption leading-4 text-violet-600">Mở đặt online cho “Nail Art cô dâu” sau bước tư vấn có thể tăng 4–6 lịch mỗi tháng.</p></div></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"><div className="flex items-start justify-between"><div><h2 className="text-xs font-black text-slate-900">Cấu trúc giá</h2><p className="mt-1 text-caption text-slate-400">Chính sách chung đang áp dụng</p></div><WalletCards className="h-4.5 w-4.5 text-amber-500" /></div><div className="mt-4 space-y-3">{[{ label: 'Ưu đãi thành viên', value: '10%', detail: 'Trên giá niêm yết' }, { label: 'Hoa hồng trung bình', value: '15,8%', detail: 'Theo doanh thu dịch vụ' }, { label: 'Tỷ lệ đặt cọc', value: '28%', detail: 'Trên giá dịch vụ TB' }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-caption font-black text-slate-700">{item.label}</p><p className="mt-1 text-caption text-slate-400">{item.detail}</p></div><span className="text-body font-black text-violet-700">{item.value}</span></div>)}</div></article></section>

      {selectedService && (
        <ServiceDetailDrawer
          service={selectedService}
          canManage={canManage}
          onClose={() => setSelectedService(null)}
          onEdit={() => openEdit(selectedService)}
          onToggleOnlineBooking={() =>
            updateService(selectedService.id, {
              onlineBooking: !selectedService.onlineBooking,
            })
          }
          onToggleStatus={() => {
            const next =
              selectedService.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
            updateService(selectedService.id, { status: next });
            setNotice(
              next === 'ACTIVE'
                ? `Đã mở bán ${selectedService.name}.`
                : `Đã ẩn ${selectedService.name}.`,
            );
          }}
        />
      )}

      {formMode && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><button type="button" aria-label="Đóng biểu mẫu" onClick={() => setFormMode(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" /><form onSubmit={submitService} className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6"><div><h2 className="text-base font-black text-slate-900">{formMode === 'CREATE' ? 'Thêm dịch vụ mới' : `Chỉnh sửa ${selectedService?.id}`}</h2><p className="mt-1 text-caption text-slate-500">Thiết lập thông tin, giá, chi phí và kênh phân phối.</p></div><button type="button" onClick={() => setFormMode(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5 sm:p-6">{formError && <div className="rounded-xl bg-rose-50 p-3 text-caption font-bold text-rose-700">{formError}</div>}<fieldset><legend className="mb-3 flex items-center gap-2 text-caption font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Sparkles className="h-3.5 w-3.5" /></span>Thông tin dịch vụ</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Tên dịch vụ *</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="Ví dụ: Nail Art Premium" /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Nhóm dịch vụ</span><BeautifulSelect value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ServiceCategory }))} className={inputClass}>{Object.entries(categoryMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label></div><label className="mt-3 block"><span className="mb-1.5 block text-caption font-bold text-slate-600">Mô tả dịch vụ *</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-caption leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Mô tả quy trình và giá trị của dịch vụ..." /></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Kỹ năng bắt buộc</span><input value={form.requiredSkill} onChange={(event) => setForm((current) => ({ ...current, requiredSkill: event.target.value }))} className={inputClass} placeholder="Nail Technician · Gel Polish" /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Thời gian vệ sinh sau lượt</span><input type="number" min="0" step="5" value={form.bufferTime} onChange={(event) => setForm((current) => ({ ...current, bufferTime: event.target.value }))} className={inputClass} /></label></div></fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-caption font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CircleDollarSign className="h-3.5 w-3.5" /></span>Giá & chi phí</legend><div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Thời lượng (phút) *</span><input type="number" min="15" step="15" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Giá niêm yết *</span><input type="text" inputMode="numeric" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: formatMoneyInput(event.target.value) }))} className={inputClass} placeholder="0" /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Giá thành viên</span><input type="text" inputMode="numeric" value={form.memberPrice} onChange={(event) => setForm((current) => ({ ...current, memberPrice: formatMoneyInput(event.target.value) }))} className={inputClass} placeholder="0" /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Chi phí vật tư</span><input type="text" inputMode="numeric" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: formatMoneyInput(event.target.value) }))} className={inputClass} placeholder="0" /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Tiền đặt cọc</span><input type="text" inputMode="numeric" value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: formatMoneyInput(event.target.value) }))} className={inputClass} placeholder="0" /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Hoa hồng (%)</span><input type="number" min="0" max="100" value={form.commissionRate} onChange={(event) => setForm((current) => ({ ...current, commissionRate: event.target.value }))} className={inputClass} /></label><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Thuế suất VAT (%)</span><input type="number" min="0" max="100" value={form.taxRate} onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))} className={inputClass} /></label></div>{parseMoneyInput(form.price) > 0 && <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-caption text-slate-400">Lãi gộp dự kiến</p><p className="mt-1 text-caption font-black text-slate-800">{formatCurrency(Math.max(0, parseMoneyInput(form.price) - parseMoneyInput(form.cost)))}</p></div><div><p className="text-caption text-slate-400">Biên lợi nhuận</p><p className="mt-1 text-caption font-black text-emerald-600">{Math.round((parseMoneyInput(form.price) - parseMoneyInput(form.cost)) / parseMoneyInput(form.price) * 100)}%</p></div><div><p className="text-caption text-slate-400">Hoa hồng/lượt</p><p className="mt-1 text-caption font-black text-violet-600">{formatCurrency(Math.round(parseMoneyInput(form.price) * Number(form.commissionRate || 0) / 100))}</p></div></div>}</fieldset><fieldset className="border-t border-slate-100 pt-5"><legend className="mb-3 flex items-center gap-2 text-caption font-black text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Store className="h-3.5 w-3.5" /></span>Phân phối & trạng thái</legend><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-caption font-bold text-slate-600">Trạng thái</span><BeautifulSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ServiceStatus }))} className={inputClass}>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</BeautifulSelect></label><div><span className="mb-1.5 block text-caption font-bold text-slate-600">Đặt lịch trực tuyến</span><div className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 transition-all ${form.onlineBooking ? 'border-emerald-200 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center gap-2 min-w-0"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${form.onlineBooking ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200/80 text-slate-400'}`}><Globe className="h-3.5 w-3.5" /></span><p className="truncate text-caption font-bold text-slate-800">{form.onlineBooking ? 'Cho phép đặt online' : 'Chỉ bán tại quầy'}</p></div><div className="flex items-center gap-2 shrink-0"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-extrabold transition-colors ${form.onlineBooking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${form.onlineBooking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />{form.onlineBooking ? 'Đang bật' : 'Đang tắt'}</span><button type="button" role="switch" aria-checked={form.onlineBooking} onClick={() => setForm((current) => ({ ...current, onlineBooking: !current.onlineBooking }))} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 ${form.onlineBooking ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.onlineBooking ? 'translate-x-4' : 'translate-x-0'}`} /></button></div></div></div></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={form.branchQ3} onChange={(event) => setForm((current) => ({ ...current, branchQ3: event.target.checked }))} className="h-4 w-4 accent-violet-600" /><span className="text-caption font-bold text-slate-700">Chi nhánh Quận 3</span></label><label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={form.branchQ1} onChange={(event) => setForm((current) => ({ ...current, branchQ1: event.target.checked }))} className="h-4 w-4 accent-violet-600" /><span className="text-caption font-bold text-slate-700">Chi nhánh Quận 1</span></label></div><label className="mt-3 block"><span className="mb-1.5 block text-caption font-bold text-slate-600">Lưu ý vận hành</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-caption leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Điều kiện áp dụng, phụ thu, lưu ý khi tư vấn..." /></label></fieldset></div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => setFormMode(null)} className="border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm">Hủy</button><button type="submit" className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-caption font-black text-white shadow-lg shadow-violet-200"><Sparkles className="h-4 w-4" />{formMode === 'CREATE' ? 'Tạo dịch vụ' : 'Lưu thay đổi'}</button></div></form></div>}
    </div>
  );
}
