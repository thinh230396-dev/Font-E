import type { Branch, Tenant } from '../types';

export const BRANCH_MODEL_OPTIONS: Array<{ value: NonNullable<Branch['model']>; label: string; description: string }> = [
  { value: 'FULL_SERVICE', label: 'Salon đầy đủ dịch vụ', description: 'Manicure, Pedicure, Nail Art, chăm sóc và bán lẻ.' },
  { value: 'NAIL_STUDIO', label: 'Nail Studio chuyên biệt', description: 'Không gian gọn, tập trung kỹ thuật Nail và khách đặt lịch.' },
  { value: 'EXPRESS_KIOSK', label: 'Express / Kiosk', description: 'Điểm dịch vụ nhanh, ít ghế và danh mục dịch vụ tinh gọn.' }
];

export const getBranchModelLabel = (model?: Branch['model']) => (
  BRANCH_MODEL_OPTIONS.find((option) => option.value === model)?.label || 'Salon đầy đủ dịch vụ'
);

export const getBranchStatusLabel = (status: Branch['status']) => (
  status === 'ACTIVE' ? 'Đang hoạt động' : status === 'PLANNING' ? 'Chuẩn bị mở' : 'Tạm ngưng'
);

const normalizeCodeText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

export const generateBranchCode = (branchName: string, tenantName: string, existingBranches: Branch[] = []) => {
  const normalizedTenant = normalizeCodeText(tenantName);
  let source = normalizeCodeText(branchName)
    .replace(normalizedTenant, '')
    .replace(/\b(CHI NHANH|BRANCH|SALON|NAIL|STUDIO|TIEM)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!source) source = String(existingBranches.length + 1);
  const words = source.split(' ').filter(Boolean);
  const shortCode = words.length === 1
    ? words[0].slice(0, 4)
    : words.map((word) => /^\d+$/.test(word) ? word : word[0]).join('').slice(0, 5);
  const base = `BR-${shortCode || existingBranches.length + 1}`;
  const usedCodes = new Set(existingBranches.flatMap((branch) => [branch.id, branch.code || '']).map((code) => code.toUpperCase()));
  if (!usedCodes.has(base)) return base;
  let suffix = 2;
  while (usedCodes.has(`${base}-${String(suffix).padStart(2, '0')}`)) suffix += 1;
  return `${base}-${String(suffix).padStart(2, '0')}`;
};

export interface BranchDraft {
  id?: string;
  name: string;
  address: string;
  model: NonNullable<Branch['model']>;
  status: Branch['status'];
  managerName: string;
  phone: string;
  email: string;
  openingHours: string;
  openingDate?: string;
  stationCount: number;
  staffUsed: number;
  staffCapacity: number;
  monthlyRevenue?: number;
  capacityPercent?: number;
  services: string[];
}

export const validateBranchDraft = (
  draft: BranchDraft,
  existingBranches: Branch[],
  options: { editingId?: string | null; maxAdditionalStaff?: number | null } = {}
) => {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const address = draft.address.trim();
  if (name.length < 3) errors.name = 'Tên chi nhánh phải có ít nhất 3 ký tự.';
  else if (name.length > 80) errors.name = 'Tên chi nhánh không được vượt quá 80 ký tự.';
  else if (existingBranches.some((branch) => branch.id !== options.editingId && branch.name.trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) errors.name = 'Tên chi nhánh đã tồn tại trong tenant.';
  if (address.length < 10) errors.address = 'Địa chỉ cần ghi rõ số nhà, đường và khu vực.';
  if (draft.status === 'ACTIVE' && !draft.managerName.trim()) errors.manager = 'Chi nhánh hoạt động phải có quản lý phụ trách.';
  const phone = draft.phone.replace(/[\s().-]/g, '');
  if (draft.phone.trim() && !/^(?:\+84|0)\d{9,10}$/.test(phone)) errors.phone = 'Số điện thoại phải đúng định dạng Việt Nam.';
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Email chi nhánh chưa đúng định dạng.';
  const hourMatch = draft.openingHours.trim().match(/^(\d{2}):(\d{2})\s*[–—-]\s*(\d{2}):(\d{2})$/);
  if (!hourMatch) errors.openingHours = 'Giờ hoạt động cần theo định dạng 08:00–21:00.';
  else {
    const [, startHour, startMinute, endHour, endMinute] = hourMatch.map(Number);
    const validClock = startHour < 24 && endHour < 24 && startMinute < 60 && endMinute < 60;
    if (!validClock || startHour * 60 + startMinute >= endHour * 60 + endMinute) errors.openingHours = 'Giờ đóng cửa phải sau giờ mở cửa.';
  }
  if (draft.status === 'PLANNING' && !draft.openingDate) errors.openingDate = 'Chi nhánh chuẩn bị mở cần có ngày dự kiến khai trương.';
  const maxStations = draft.model === 'EXPRESS_KIOSK' ? 8 : draft.model === 'NAIL_STUDIO' ? 30 : 100;
  if (!Number.isInteger(draft.stationCount) || draft.stationCount < 1 || draft.stationCount > maxStations) errors.stations = `Mô hình này cho phép từ 1 đến ${maxStations} vị trí phục vụ.`;
  if (!Number.isInteger(draft.staffUsed) || draft.staffUsed < 0) errors.staffCount = 'Số nhân sự phải là số nguyên từ 0 trở lên.';
  if (!Number.isInteger(draft.staffCapacity) || draft.staffCapacity < draft.staffUsed) errors.staffCapacity = 'Sức chứa nhân sự không được nhỏ hơn nhân sự ban đầu.';
  if (options.maxAdditionalStaff !== null && options.maxAdditionalStaff !== undefined && draft.staffUsed > options.maxAdditionalStaff) errors.staffCount = `Chỉ còn ${options.maxAdditionalStaff} nhân sự trong hạn mức gói.`;
  if ((draft.monthlyRevenue || 0) < 0) errors.monthlyRevenue = 'Doanh thu không được là số âm.';
  if ((draft.capacityPercent || 0) < 0 || (draft.capacityPercent || 0) > 100) errors.capacityPercent = 'Công suất phải nằm trong khoảng 0–100%.';
  if (draft.status === 'ACTIVE' && draft.services.filter(Boolean).length === 0) errors.services = 'Chi nhánh hoạt động cần có ít nhất một nhóm dịch vụ.';
  return { errors, isValid: Object.keys(errors).length === 0 };
};

const inferProvince = (address: string) => {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) || 'Chưa cập nhật';
};

export const normalizeBranch = (
  branch: Branch,
  tenant?: Pick<Tenant, 'name' | 'address' | 'phone' | 'contactEmail' | 'adminName' | 'timezone' | 'monthlyRevenue'>,
  index = 0
): Branch => {
  const isPrimary = branch.isPrimary ?? index === 0;
  const staffUsed = Number(branch.staffUsed ?? branch.staffCount ?? 0);
  const address = branch.address || (isPrimary ? tenant?.address : '') || 'Chưa cập nhật';
  const stationCount = Number(branch.stationCount ?? Math.max(4, staffUsed + 2));
  const model = branch.model || (isPrimary ? 'FULL_SERVICE' : 'NAIL_STUDIO');

  return {
    ...branch,
    id: branch.id,
    code: branch.code || branch.id.replace(/^BR-/, ''),
    name: branch.name || `${tenant?.name || 'Salon'} - ${isPrimary ? 'Chi nhánh chính' : `Chi nhánh ${index + 1}`}`,
    address,
    model,
    isPrimary,
    managerName: branch.managerName || (isPrimary ? tenant?.adminName : '') || 'Chưa phân công',
    phone: branch.phone || (isPrimary ? tenant?.phone : '') || 'Chưa cập nhật',
    email: branch.email || (isPrimary ? tenant?.contactEmail : '') || '',
    province: branch.province || inferProvince(address),
    timezone: branch.timezone || tenant?.timezone || 'Asia/Ho_Chi_Minh',
    openingHours: branch.openingHours || (model === 'EXPRESS_KIOSK' ? '09:00–21:00' : '08:00–21:00'),
    stationCount,
    staffCapacity: Number(branch.staffCapacity ?? Math.max(stationCount, staffUsed)),
    services: branch.services?.length ? branch.services : model === 'EXPRESS_KIOSK'
      ? ['Sơn gel nhanh', 'Manicure cơ bản', 'Nail Art đơn giản']
      : ['Manicure', 'Pedicure', 'Sơn Gel', 'Nail Art'],
    monthlyRevenue: Number(branch.monthlyRevenue ?? (isPrimary ? tenant?.monthlyRevenue : 0) ?? 0),
    capacityPercent: Math.max(0, Math.min(100, Number(branch.capacityPercent ?? 0))),
    staffUsed,
    staffCount: staffUsed,
    staffLimit: Number(branch.staffLimit || branch.staffCapacity || 0),
    status: branch.status || 'ACTIVE',
    createdAt: branch.createdAt || new Date().toISOString(),
    updatedAt: branch.updatedAt || new Date().toISOString()
  };
};

export const normalizeTenantBranches = (tenant: Tenant): Branch[] => (
  (tenant.branches?.length ? tenant.branches : [{
    id: 'BR-1',
    name: `${tenant.name} - Chi nhánh chính`,
    address: tenant.address,
    staffUsed: tenant.staffCount,
    staffCount: tenant.staffCount,
    staffLimit: tenant.staffCount,
    status: 'ACTIVE' as const,
    isPrimary: true
  }]).map((branch, index) => normalizeBranch(branch, tenant, index))
);
