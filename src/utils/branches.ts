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
