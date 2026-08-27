/**
 * Danh bạ khách hàng của tiệm — màn hình dùng chung cho cả cổng chủ tiệm và cổng lễ tân.
 *
 * BR-CUS-001 — khách thuộc TIỆM chứ không thuộc chi nhánh, nên màn này cố ý không có bộ
 * lọc chi nhánh: lễ tân Quận 3 phải tra được khách hôm qua đến Quận 1. Đó cũng là điểm
 * khác màn nhân sự, nơi lễ tân chỉ thấy người của chi nhánh mình.
 *
 * Hạng khách, tổng chi tiêu và số lượt ghé đều do máy chủ suy ra từ hóa đơn đã trả đủ
 * (BR-CUS-007/009). Màn hình chỉ hiển thị, không tính lại và cũng không sửa được — biểu
 * mẫu vì vậy chỉ có năm ô, đúng năm cột mà bảng `Customers` có.
 */

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeader, Pagination } from './ui';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { formatMoney as money } from '../utils/money';
import useCustomers from '../hooks/useCustomers';
import type { ApiError } from '../services/apiClient';
import type {
  CustomerApiStatus,
  CustomerApiTier,
  CustomerDto,
  CustomerVisitDto,
  SaveCustomerInput,
} from '../services/customers';
import { defaultCustomerSeed } from '../utils/tenantCustomers';

interface TenantAdminCustomersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
  /** Có mã tiệm nghĩa là phiên đang làm việc với dữ liệu thật; rỗng là chế độ mẫu. */
  tenantId?: string;
  onBookCustomer?: (customer: CustomerDto) => void;
}

/** Đúng năm ô máy chủ nhận. Không có hạng, không có điểm, không có chi nhánh. */
interface CustomerFormState {
  phone: string;
  fullName: string;
  email: string;
  /** Dạng `yyyy-MM-dd` — chính là thứ ô `<input type="date">` sinh ra. */
  birthDate: string;
  note: string;
}

const emptyForm = (): CustomerFormState => ({
  phone: '',
  fullName: '',
  email: '',
  birthDate: '',
  note: '',
});

const phoneDigits = (value: string) => value.replace(/\D/g, '');

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/** Tên hiển thị của một hồ sơ. BR-CUS-003 cho phép tạo khách chỉ với số điện thoại. */
const displayName = (customer: CustomerDto) => customer.fullName?.trim() || customer.phone;

/**
 * `yyyy-MM-dd` sang `dd/MM/yyyy` để đọc.
 *
 * Máy chủ và màn hình cố ý dùng hai định dạng khác nhau: trên đường truyền phải là dạng
 * không mơ hồ, còn trên màn hình phải là dạng người Việt quen đọc.
 */
const readableDate = (value?: string | null) => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const readableDateTime = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

/** `dd/MM/yyyy` của bộ dữ liệu mẫu cũ sang `yyyy-MM-dd` mà hợp đồng máy chủ dùng. */
const isoFromLegacyBirthday = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

const tierMeta: Record<CustomerApiTier, { label: string; badge: string; avatar: string; hint: string }> = {
  VIP: {
    label: 'VIP',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    avatar: 'from-violet-500 to-fuchsia-500',
    hint: 'Đã chi từ 20 triệu trở lên',
  },
  LOYAL: {
    label: 'Thân thiết',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    avatar: 'from-blue-500 to-cyan-500',
    hint: 'Đã chi từ 5 đến dưới 20 triệu',
  },
  STANDARD: {
    label: 'Tiêu chuẩn',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    avatar: 'from-slate-500 to-slate-700',
    hint: 'Đã chi dưới 5 triệu',
  },
  NEW: {
    label: 'Khách mới',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    avatar: 'from-emerald-500 to-teal-500',
    hint: 'Chưa phát sinh hóa đơn nào',
  },
};

const statusMeta: Record<CustomerApiStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  INACTIVE: { label: 'Ngừng hoạt động', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-caption outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100';
const errorInputClass =
  'h-11 w-full rounded-xl border border-rose-300 bg-rose-50/60 px-3 text-caption outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100';

/**
 * Bộ chọn trạng thái ngay trên dòng — BR-CUS-006, "xóa khách" chính là chuyển sang
 * `INACTIVE`. Hai lựa chọn, không hơn: `CARE` của bản giao diện cũ đã bị BR-CUS-005 bỏ.
 */
function CustomerStatusDropdown({
  status,
  disabled,
  onStatusChange,
}: {
  status: CustomerApiStatus;
  disabled?: boolean;
  onStatusChange: (status: CustomerApiStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = statusMeta[status];

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-caption font-bold ring-1 disabled:opacity-60 ${meta.className}`}
      >
        {meta.label}
        {!disabled && <ChevronDown className="h-3 w-3" />}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {(Object.keys(statusMeta) as CustomerApiStatus[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                if (value !== status) onStatusChange(value);
              }}
              className="flex h-9 w-full items-center gap-2 border-0 bg-transparent px-3 text-left text-caption font-bold text-slate-600 shadow-none hover:bg-slate-50"
            >
              {value === status && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              <span className={value === status ? '' : 'ml-5'}>{statusMeta[value].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Bộ dữ liệu mẫu cho tài khoản demo, chuyển sang đúng hình dạng máy chủ trả về.
 *
 * Chỉ giữ lại những trường thật sự tồn tại; mười lăm trường còn lại của bản cũ — điểm
 * thưởng, nguồn khách, sở thích, dị ứng, kênh liên lạc, nhãn... — biến mất ở đây đúng như
 * chúng đã biến mất khỏi biểu mẫu.
 */
const demoSeed: CustomerDto[] = defaultCustomerSeed.map((customer) => ({
    id: customer.id,
    tenantId: 'DEMO',
    phone: customer.phone.replace(/\s/g, ''),
    fullName: customer.name,
    email: customer.email || null,
    birthDate: isoFromLegacyBirthday(customer.birthday) || null,
    note: customer.note || null,
    status: customer.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    tier: customer.tier,
    visits: customer.visits,
    totalSpent: customer.totalSpent,
    lastVisitAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

export default function TenantAdminCustomers({
  searchQuery,
  onSearchQueryChange,
  tenantName = 'Nailé Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason = '',
  onNotify,
  tenantId,
  onBookCustomer,
}: TenantAdminCustomersProps) {
  const isReceptionist = roleLabel.toLowerCase().startsWith('receptionist');
  const canManage = accessMode === 'full' && !readOnlyReason;
  const canExport = canManage && !isReceptionist;

  /**
   * Danh bạ thật của tiệm đang làm việc.
   *
   * Chạy song song với `demoList` chứ không thay thế: tài khoản demo vẫn cần một đường dữ
   * liệu mẫu. Khi có `tenantId` thì màn này chuyển hẳn sang máy chủ và KHÔNG ghi bản sao
   * nào xuống trình duyệt.
   */
  const isLive = Boolean(tenantId);
  const directory = useCustomers(isLive, tenantId || null);
  /**
   * Tách riêng hàm đọc hồ sơ ra khỏi `directory`.
   *
   * `useCustomers` trả về một đối tượng MỚI ở mỗi lần render, nên đặt cả `directory` vào
   * danh sách phụ thuộc của hiệu ứng bên dưới sẽ khiến nó chạy lại sau mỗi lần render —
   * và vì chính hiệu ứng đó gọi `setVisits`, vòng lặp không bao giờ dừng. Bản thân hàm
   * này thì ổn định: nó đã được `useCallback` giữ nguyên qua các lần render.
   */
  const fetchCustomer = directory.getCustomer;
  const [demoList, setDemoList] = useState<CustomerDto[]>(demoSeed);
  const customers = isLive ? directory.customers : demoList;

  const [tierFilter, setTierFilter] = useState<'ALL' | CustomerApiTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerApiStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visits, setVisits] = useState<CustomerVisitDto[] | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selected = useMemo(
    () => customers.find((customer) => customer.id === selectedId) || null,
    [customers, selectedId],
  );

  /**
   * Lịch sử ghé của hồ sơ đang mở, lấy từ `GET /api/customers/{id}`.
   *
   * Chỉ gọi khi người dùng thật sự mở ngăn chi tiết: lịch sử của cả danh sách là hai mươi
   * phép nối cho một màn hình mỗi lần chỉ xem một hồ sơ.
   */
  useEffect(() => {
    if (!selectedId || !isLive) {
      setVisits(null);
      return;
    }

    let active = true;
    setVisitsLoading(true);

    void fetchCustomer(selectedId)
      .then((result) => {
        if (!active) return;
        setVisits(result.status === 'ok' ? result.data.visits : []);
      })
      .finally(() => {
        if (active) setVisitsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, isLive, fetchCustomer]);

  useEffect(() => {
    if (!selected && !formOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setFormOpen(false);
      }
    };
    addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', close);
    };
  }, [formOpen, selected]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tierFilter, statusFilter]);

  const requireManage = () => {
    if (canManage) return true;
    onNotify?.(readOnlyReason || 'Bạn chỉ được xem hồ sơ khách hàng.');
    return false;
  };

  /** Gắn lỗi máy chủ vào đúng ô nhập; phần không gắn được thì hiện ở đầu biểu mẫu. */
  const applyApiError = (error: ApiError) => {
    const mapped: Record<string, string> = {};
    error.fields.forEach((item) => {
      mapped[item.field] = item.message;
    });
    setFieldErrors(mapped);
    setFormError(error.fields.length ? '' : error.message);
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const digits = phoneDigits(query);

    return customers
      .filter((customer) => tierFilter === 'ALL' || customer.tier === tierFilter)
      .filter((customer) => statusFilter === 'ALL' || customer.status === statusFilter)
      .filter((customer) => {
        if (!query) return true;
        const searchable = `${customer.id} ${customer.fullName || ''} ${customer.phone} ${customer.email || ''}`.toLowerCase();
        return searchable.includes(query) || (!!digits && phoneDigits(customer.phone).includes(digits));
      });
  }, [customers, searchQuery, statusFilter, tierFilter]);

  const pagedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const activeCount = customers.filter((customer) => customer.status === 'ACTIVE').length;
  const loyalCount = customers.filter((customer) => ['VIP', 'LOYAL'].includes(customer.tier)).length;
  const newCount = customers.filter((customer) => customer.tier === 'NEW').length;
  const totalSpent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  const openCreate = () => {
    if (!requireManage()) return;
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (customer: CustomerDto) => {
    if (!requireManage()) return;
    setEditingId(customer.id);
    setForm({
      phone: customer.phone,
      fullName: customer.fullName || '',
      email: customer.email || '',
      birthDate: customer.birthDate || '',
      note: customer.note || '',
    });
    setSelectedId(null);
    setFormError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage() || saving) return;
    setFormError('');
    setFieldErrors({});

    // BR-CUS-003 — chỉ số điện thoại là bắt buộc. Mọi phép kiểm còn lại nằm ở máy chủ
    // (BR-VAL-002); ở đây chỉ chặn trường hợp gửi một biểu mẫu rỗng hoàn toàn.
    if (!form.phone.trim()) {
      setFieldErrors({ phone: 'Vui lòng nhập số điện thoại của khách.' });
      return;
    }

    const input: SaveCustomerInput = {
      phone: form.phone.trim(),
      fullName: form.fullName.trim() || undefined,
      email: form.email.trim() || undefined,
      birthDate: form.birthDate || undefined,
      note: form.note.trim() || undefined,
    };

    if (!isLive) {
      const now = new Date().toISOString();
      if (editingId) {
        setDemoList((current) =>
          current.map((customer) =>
            customer.id === editingId
              ? {
                  ...customer,
                  phone: input.phone,
                  fullName: input.fullName ?? null,
                  email: input.email ?? null,
                  birthDate: input.birthDate ?? null,
                  note: input.note ?? null,
                  updatedAt: now,
                }
              : customer,
          ),
        );
        onNotify?.('Đã cập nhật hồ sơ khách hàng.');
      } else {
        const created: CustomerDto = {
          id: `CUS-DEMO-${Date.now().toString().slice(-6)}`,
          tenantId: 'DEMO',
          phone: input.phone,
          fullName: input.fullName ?? null,
          email: input.email ?? null,
          birthDate: input.birthDate ?? null,
          note: input.note ?? null,
          status: 'ACTIVE',
          tier: 'NEW',
          visits: 0,
          totalSpent: 0,
          lastVisitAt: null,
          createdAt: now,
          updatedAt: now,
        };
        setDemoList((current) => [created, ...current]);
        setSelectedId(created.id);
        onNotify?.(`Đã tạo hồ sơ ${displayName(created)}.`);
      }
      setFormOpen(false);
      return;
    }

    setSaving(true);
    const result = editingId
      ? await directory.updateCustomer(editingId, input)
      : await directory.createCustomer(input);
    setSaving(false);

    if (result.status === 'error') {
      applyApiError(result.error);
      return;
    }

    setFormOpen(false);
    setSelectedId(result.data.id);
    onNotify?.(
      editingId
        ? `Đã cập nhật hồ sơ ${displayName(result.data)}.`
        : `Đã tạo hồ sơ ${displayName(result.data)}.`,
    );
  };

  const changeStatus = async (customer: CustomerDto, status: CustomerApiStatus) => {
    if (!requireManage() || saving) return;

    if (!isLive) {
      setDemoList((current) =>
        current.map((item) => (item.id === customer.id ? { ...item, status } : item)),
      );
      onNotify?.(`${displayName(customer)} · ${statusMeta[status].label}.`);
      return;
    }

    setSaving(true);
    const result = await directory.changeCustomerStatus(customer.id, status);
    setSaving(false);

    if (result.status === 'error') {
      onNotify?.(result.error.message);
      return;
    }

    onNotify?.(
      status === 'INACTIVE'
        ? `Đã ngừng hồ sơ ${displayName(customer)}. Lịch sử dịch vụ và hóa đơn vẫn giữ nguyên.`
        : `Đã mở lại hồ sơ ${displayName(customer)}.`,
    );
  };

  const exportCustomers = () => {
    if (!canExport) {
      onNotify?.('Lễ tân không có quyền xuất dữ liệu khách hàng hàng loạt.');
      return;
    }
    const header = 'Ma,Ho ten,So dien thoai,Email,Hang,Luot ghe,Tong chi tieu,Lan ghe gan nhat,Trang thai';
    const body = filtered
      .map((customer) =>
        [
          customer.id,
          customer.fullName || '',
          customer.phone,
          customer.email || '',
          tierMeta[customer.tier].label,
          customer.visits,
          customer.totalSpent,
          readableDateTime(customer.lastVisitAt) || 'Chua phat sinh',
          statusMeta[customer.status].label,
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'danh-sach-khach-hang.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    onNotify?.('Đã xuất danh sách theo bộ lọc hiện tại.');
  };

  const bookCustomer = (customer: CustomerDto) => {
    if (!requireManage()) return;
    onBookCustomer?.(customer);
    setSelectedId(null);
  };

  const listMessage = directory.error
    ? directory.error.message
    : isLive && directory.loading
      ? 'Đang tải danh bạ khách hàng...'
      : '';

  return (
    <div className="space-y-5">
      <PageHeader
        title={isReceptionist ? 'Khách hàng tại quầy' : 'Khách hàng'}
        actions={(
          <div className="flex flex-wrap gap-2">
            {!isReceptionist && (
              <button
                type="button"
                onClick={exportCustomers}
                disabled={!canExport}
                className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-none disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Xuất danh sách
              </button>
            )}
            <button
              type="button"
              onClick={openCreate}
              disabled={!canManage}
              className="flex h-10 items-center gap-2 border border-pink-600 bg-pink-600 px-4 text-caption font-black text-white shadow-none disabled:border-slate-300 disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" />
              Thêm khách mới
            </button>
          </div>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Khách của tiệm',
            value: customers.length,
            detail: `${activeCount} đang hoạt động`,
            icon: UsersRound,
            tone: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Thân thiết & VIP',
            value: loyalCount,
            detail: 'Suy từ tổng chi tiêu, không nâng hạng tay',
            icon: Star,
            tone: 'bg-violet-50 text-violet-600',
          },
          {
            label: 'Chưa phát sinh hóa đơn',
            value: newCount,
            detail: 'Hồ sơ đã lập nhưng chưa từng thanh toán',
            icon: UserRound,
            tone: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Tổng chi tiêu đã ghi nhận',
            value: money(totalSpent),
            detail: 'Cộng từ hóa đơn đã trả đủ',
            icon: TrendingUp,
            tone: 'bg-emerald-50 text-emerald-600',
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption font-bold text-slate-500">{label}</p>
                <p className="ta-metric-value mt-1.5 truncate text-slate-950">{value}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-2 text-caption font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-[430px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Tìm theo số điện thoại, tên, email hoặc mã khách..."
              autoComplete="off"
              inputMode="search"
              aria-label="Tìm kiếm khách hàng"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-caption font-semibold outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
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
          <div className="flex flex-wrap items-center gap-2">
            {/* BR-CUS-001 — khách dùng chung cho mọi chi nhánh, nên ở đây cố ý không có
                bộ lọc chi nhánh. Câu này thay chỗ của nó để người dùng biết đó là chủ ý. */}
            <span className="text-caption font-semibold text-slate-400">
              Danh bạ dùng chung cho mọi chi nhánh
            </span>
            <BeautifulSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | CustomerApiStatus)}
              className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"
              aria-label="Lọc trạng thái khách hàng"
            >
              <option value="ALL">Mọi trạng thái</option>
              {(Object.keys(statusMeta) as CustomerApiStatus[]).map((key) => (
                <option key={key} value={key}>
                  {statusMeta[key].label}
                </option>
              ))}
            </BeautifulSelect>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          {(['ALL', 'VIP', 'LOYAL', 'STANDARD', 'NEW'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTierFilter(value)}
              title={value === 'ALL' ? undefined : tierMeta[value].hint}
              className={`h-8 shrink-0 border px-3 text-caption font-black shadow-sm ${
                tierFilter === value
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {value === 'ALL' ? 'Tất cả khách hàng' : tierMeta[value].label}
              <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-caption">
                {value === 'ALL'
                  ? customers.length
                  : customers.filter((item) => item.tier === value).length}
              </span>
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1020px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-caption font-black uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Khách hàng</th>
                <th className="px-4 py-3">Hạng</th>
                <th className="px-4 py-3">Lượt ghé & chi tiêu</th>
                <th className="px-4 py-3">Lần ghé gần nhất</th>
                {/* Chốt bề ngang hai cột cuối: nhãn trạng thái dài ngắn khác nhau nên nếu
                    để bảng tự co, cụm tác vụ ở mỗi dòng lại nằm một chỗ. */}
                <th className="w-44 px-4 py-3">Trạng thái</th>
                <th className="w-52 px-5 py-3 text-right">Tác vụ tại quầy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedId(customer.id)}
                  className="cursor-pointer text-caption text-slate-600 transition hover:bg-emerald-50/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-caption font-black text-white ${tierMeta[customer.tier].avatar}`}
                      >
                        {initials(displayName(customer))}
                      </span>
                      <div>
                        <p className="font-black text-slate-900">{displayName(customer)}</p>
                        <p className="mt-1 text-caption text-slate-400">
                          {customer.phone}
                          {customer.email ? ` · ${customer.email}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${tierMeta[customer.tier].badge}`}
                      title={tierMeta[customer.tier].hint}
                    >
                      {tierMeta[customer.tier].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-800">{customer.visits} lượt ghé</p>
                    <p className="mt-1 text-caption text-slate-400">{money(customer.totalSpent)}</p>
                  </td>
                  <td className="px-4 py-4">
                    {customer.lastVisitAt ? (
                      <p className="font-bold text-slate-700">{readableDateTime(customer.lastVisitAt)}</p>
                    ) : (
                      <p className="text-caption text-slate-400">Chưa phát sinh</p>
                    )}
                  </td>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <CustomerStatusDropdown
                      status={customer.status}
                      disabled={!canManage}
                      onStatusChange={(status) => void changeStatus(customer, status)}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`tel:${phoneDigits(customer.phone)}`}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Gọi ${displayName(customer)}`}
                        className="ui-row-action ui-row-action-icon flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          bookCustomer(customer);
                        }}
                        disabled={!canManage}
                        className="ui-row-action flex shrink-0 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2.5 font-bold text-emerald-700 disabled:opacity-50"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        Đặt lịch
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(customer.id);
                        }}
                        className="ui-row-action ui-row-action-icon flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700"
                        aria-label={`Xem hồ sơ ${displayName(customer)}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {pagedCustomers.map((customer) => (
            <div
              key={customer.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(customer.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedId(customer.id);
                }
              }}
              className="block h-auto w-full cursor-pointer rounded-none border-0 bg-white p-4 text-left shadow-none transition hover:bg-slate-50/80"
            >
              <span className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-caption font-black text-white ${tierMeta[customer.tier].avatar}`}
                >
                  {initials(displayName(customer))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block truncate text-caption font-black text-slate-900">
                        {displayName(customer)}
                      </span>
                      <span className="mt-1 block text-caption text-slate-400">
                        {customer.phone} · {customer.visits} lượt ghé
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                      <span className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${tierMeta[customer.tier].badge}`}>
                        {tierMeta[customer.tier].label}
                      </span>
                      <CustomerStatusDropdown
                        status={customer.status}
                        disabled={!canManage}
                        onStatusChange={(status) => void changeStatus(customer, status)}
                      />
                    </span>
                    <span className="truncate text-caption font-bold text-slate-600">
                      {money(customer.totalSpent)}
                    </span>
                  </span>
                </span>
              </span>
            </div>
          ))}
        </div>

        {!filtered.length && (
          <div className="py-16 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-caption font-black text-slate-600">
              {listMessage || (customers.length ? 'Không tìm thấy hồ sơ phù hợp' : 'Tiệm chưa có khách hàng nào')}
            </p>
            <p className="mt-1 text-caption text-slate-400">
              {customers.length
                ? 'Kiểm tra lại số điện thoại hoặc tạo khách mới nếu chưa có hồ sơ.'
                : 'Hồ sơ đầu tiên thường được lập ngay tại quầy, chỉ cần số điện thoại.'}
            </p>
            {canManage && !directory.loading && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 border border-emerald-200 bg-emerald-50 px-4 text-caption font-black text-emerald-700 shadow-sm"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                Tạo hồ sơ mới
              </button>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          <Pagination
            id="customers-pagination"
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / pageSize) || 1}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="hồ sơ"
            variant="violet"
          />
          <div className="mt-2 flex items-center justify-end gap-1.5 text-caption font-semibold text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Dữ liệu riêng tư · {tenantName}
          </div>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Đóng chi tiết khách hàng"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-detail-title"
            className="reception-customer-detail relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="customer-detail-header border-b border-slate-100 bg-[linear-gradient(125deg,#ecfdf5_0%,#ffffff_65%)] px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-caption font-black text-white ${tierMeta[selected.tier].avatar}`}
                  >
                    {initials(displayName(selected))}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-caption font-black uppercase tracking-wide text-emerald-700">
                        {selected.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${tierMeta[selected.tier].badge}`}
                        title={tierMeta[selected.tier].hint}
                      >
                        {tierMeta[selected.tier].label}
                      </span>
                      <CustomerStatusDropdown
                        status={selected.status}
                        disabled={!canManage}
                        onStatusChange={(status) => void changeStatus(selected, status)}
                      />
                    </div>
                    <h2 id="customer-detail-title" className="mt-2 truncate text-xl font-black text-slate-950">
                      {displayName(selected)}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-slate-500">
                      <span>{selected.phone}</span>
                      <span className="text-slate-300">•</span>
                      <span>{selected.email || 'Chưa có email'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Đóng"
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${phoneDigits(selected.phone)}`}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-caption font-black text-white shadow-sm"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Gọi khách
                </a>
                <button
                  type="button"
                  onClick={() => bookCustomer(selected)}
                  disabled={!canManage}
                  className="flex h-10 items-center justify-center gap-2 border border-violet-200 bg-violet-50 px-2 text-caption font-black text-violet-700 shadow-sm disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Đặt lịch
                </button>
              </div>
            </header>

            <div className="customer-detail-body min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="space-y-5">
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Tổng chi tiêu', value: money(selected.totalSpent), icon: TrendingUp },
                    { label: 'Lượt ghé', value: String(selected.visits), icon: UsersRound },
                    {
                      label: 'Chi tiêu trung bình',
                      value: money(Math.round(selected.totalSpent / Math.max(1, selected.visits))),
                      icon: WalletCards,
                    },
                    {
                      label: 'Lần ghé gần nhất',
                      value: readableDateTime(selected.lastVisitAt) || 'Chưa phát sinh',
                      icon: CalendarClock,
                    },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="customer-detail-stat rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="mt-2 text-caption font-bold text-slate-400">{label}</p>
                      <p className="mt-1.5 text-caption font-black text-slate-900">{value}</p>
                    </div>
                  ))}
                </section>

                <section className="customer-detail-card rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-caption font-black text-slate-800">Ghi chú phục vụ</p>
                      <p className="mt-1 text-caption text-slate-400">
                        Nơi ghi dị ứng, lưu ý về móng và mọi điều cần nhớ trước khi phục vụ
                      </p>
                    </div>
                    <Sparkles className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="mt-3 whitespace-pre-line text-caption leading-5 text-slate-600">
                    {selected.note || 'Chưa có ghi chú phục vụ.'}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="customer-detail-subcard rounded-xl bg-slate-50 p-3">
                      <p className="text-caption font-bold uppercase text-slate-400">Ngày sinh</p>
                      <p className="mt-1.5 font-black text-slate-700">
                        {readableDate(selected.birthDate) || 'Khách chưa khai'}
                      </p>
                    </div>
                    <div className="customer-detail-subcard rounded-xl bg-slate-50 p-3">
                      <p className="text-caption font-bold uppercase text-slate-400">Lập hồ sơ</p>
                      <p className="mt-1.5 font-black text-slate-700">
                        {readableDateTime(selected.createdAt) || '—'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="customer-detail-card overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-caption font-black text-slate-800">Lịch sử dịch vụ</p>
                      <p className="mt-1 text-caption text-slate-400">
                        Đọc từ hóa đơn đã trả đủ · tối đa 10 lần gần nhất
                      </p>
                    </div>
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {visitsLoading ? (
                      <p className="px-4 py-8 text-center text-caption text-slate-400">Đang tải lịch sử...</p>
                    ) : visits && visits.length ? (
                      visits.map((visit) => (
                        <div key={visit.invoiceId} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-caption font-black text-slate-700">
                              {visit.serviceNames.join(' · ') || 'Không có dòng dịch vụ'}
                            </p>
                            <p className="mt-1 text-caption text-slate-400">
                              {readableDateTime(visit.issuedAt)} · {visit.branchName}
                              {visit.staffName ? ` · ${visit.staffName}` : ''}
                            </p>
                            <p className="mt-1 text-caption text-slate-400">{visit.invoiceCode}</p>
                          </div>
                          <p className="shrink-0 text-caption font-black text-slate-800">{money(visit.total)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-8 text-center text-caption text-slate-400">
                        {isLive ? 'Khách chưa phát sinh hóa đơn nào' : 'Chế độ dữ liệu mẫu chưa có lịch sử hóa đơn'}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <footer className="customer-detail-footer flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Chỉ sử dụng dữ liệu cho nghiệp vụ phục vụ khách
              </p>
              <button
                type="button"
                onClick={() => openEdit(selected)}
                disabled={!canManage}
                className="flex h-10 items-center justify-center gap-2 border border-emerald-700 bg-emerald-600 px-4 text-caption font-black text-white shadow-sm disabled:opacity-50"
              >
                <UserRound className="h-3.5 w-3.5" />
                Cập nhật hồ sơ
              </button>
            </footer>
          </aside>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng biểu mẫu khách hàng"
            onClick={() => setFormOpen(false)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <form
            onSubmit={submitForm}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <p className="text-caption font-black uppercase tracking-wide text-emerald-700">
                  {isReceptionist ? 'Hồ sơ tại quầy' : 'Hồ sơ khách hàng'}
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  {editingId ? 'Cập nhật hồ sơ khách' : 'Thêm khách hàng mới'}
                </h2>
                <p className="mt-1 text-caption text-slate-500">
                  Chỉ số điện thoại là bắt buộc, và nó là định danh duy nhất trong tiệm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {formError && (
                <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-caption font-bold text-rose-700 sm:col-span-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <label>
                <span className="mb-1.5 block text-caption font-bold text-slate-600">Số điện thoại *</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="0901234567"
                  autoComplete="tel"
                  className={fieldErrors.phone ? errorInputClass : inputClass}
                />
                {fieldErrors.phone && (
                  <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.phone}</span>
                )}
              </label>

              <label>
                <span className="mb-1.5 block text-caption font-bold text-slate-600">Họ và tên</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  className={fieldErrors.fullName ? errorInputClass : inputClass}
                />
                {fieldErrors.fullName && (
                  <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.fullName}</span>
                )}
              </label>

              <label>
                <span className="mb-1.5 block text-caption font-bold text-slate-600">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="khach@email.com"
                  autoComplete="email"
                  className={fieldErrors.email ? errorInputClass : inputClass}
                />
                {fieldErrors.email && (
                  <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.email}</span>
                )}
              </label>

              <label>
                <span className="mb-1.5 block text-caption font-bold text-slate-600">Ngày sinh</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                  className={fieldErrors.birthDate ? errorInputClass : inputClass}
                />
                {fieldErrors.birthDate && (
                  <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.birthDate}</span>
                )}
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-caption font-bold text-slate-600">Ghi chú phục vụ</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Dị ứng, tình trạng móng, sở thích, cách xưng hô, thói quen đặt lịch..."
                  className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-caption leading-5 outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
                {fieldErrors.note && (
                  <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.note}</span>
                )}
              </label>
            </div>

            <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="flex items-center gap-1.5 text-caption text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Hạng khách và tổng chi tiêu do hệ thống tính từ hóa đơn, không nhập tay
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-caption font-black text-white shadow-lg shadow-emerald-200 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
                </button>
              </div>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
