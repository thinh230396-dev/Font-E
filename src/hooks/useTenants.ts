/**
 * Nguồn dữ liệu tiệm cho toàn bộ cổng Superadmin.
 *
 * Trước ngày 6, `App.tsx` giữ một mảng `tenants` trong `useState`, nạp từ
 * `localStorage` và tự chạy các quy tắc nghiệp vụ bằng `useEffect` — hết hạn,
 * sinh hóa đơn, di trú gói. Từ nay danh sách tiệm do máy chủ trả về, và những
 * quy tắc ấy nằm ở máy chủ: trạng thái `TRIAL`/`OVERDUE` được tính lúc đọc
 * (BR-TENANT-002), hóa đơn đăng ký sinh trong cùng giao dịch tạo tiệm
 * (BR-TENANT-005).
 *
 * Hook này là **chỗ duy nhất** chuyển `TenantDetailDto` sang `Tenant`. Rải phép
 * chuyển đổi ra từng màn hình là mở đường cho hai màn cùng đọc một tiệm mà hiểu
 * khác nhau.
 *
 * Không dùng React Query hay SWR: dự án cố ý tự viết hook lấy dữ liệu, và nhu
 * cầu ở đây chỉ gồm nạp một lần, nạp lại theo yêu cầu, và ghi rồi nạp lại.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  changeTenantStatus as changeTenantStatusRequest,
  createTenant as createTenantRequest,
  deleteTenant as deleteTenantRequest,
  listPackages,
  listTenantAdminAccounts,
  listTenants,
  renewTenant as renewTenantRequest,
  updateTenant as updateTenantRequest,
  type CreateTenantInput,
  type PackageDto,
  type TenantAdminAccountDto,
  type TenantDetailDto,
  type UpdateTenantInput
} from '../services/tenants';
import {
  DEFAULT_SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_CAPABILITY_CATALOG
} from '../utils/subscriptions';
import type {
  SubscriptionCapability,
  SubscriptionLimits,
  SubscriptionPackage,
  Tenant,
  TenantAdminAccount,
  TenantAdminStatus,
  TenantOwnerSummary
} from '../types';

const toOwner = (owner: TenantDetailDto['owners'][number]): TenantOwnerSummary => ({
  id: owner.id,
  email: owner.email,
  username: owner.username,
  displayName: owner.displayName,
  status: owner.status as TenantAdminStatus
});

/**
 * Chuyển một tiệm từ hình dạng máy chủ sang hình dạng màn hình.
 *
 * Chủ tiệm đầu tiên trong danh sách được coi là chủ tiệm chính — máy chủ sắp
 * theo thứ tự được giao, nên "người đầu tiên" luôn là cùng một người ở mọi lần
 * tải chứ không đổi theo thứ tự database trả về.
 *
 * Những trường mà máy chủ không lưu — logo, quốc gia, ngôn ngữ, ghi chú nội bộ —
 * cố ý để trống thay vì gán giá trị mặc định: một giá trị mặc định trông y hệt
 * một giá trị thật, và màn hình sẽ không còn cách nào phân biệt.
 */
export const toTenant = (dto: TenantDetailDto): Tenant => {
  const primaryOwner = dto.owners[0];

  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    status: dto.displayStatus,
    isReadOnly: dto.isReadOnly,
    isTrial: dto.isTrial,
    createdAt: dto.createdAt,
    address: dto.address || '',
    phone: dto.phone || '',
    contactEmail: dto.contactEmail,
    timezone: dto.timezone,
    packageName: dto.packageName,
    staffCount: dto.activeStaff,
    branchCount: dto.activeBranches,
    maxSalons: dto.maxSalons,
    maxStaff: dto.maxStaff,
    daysRemaining: dto.daysRemaining,
    owners: dto.owners.map(toOwner),
    adminName: primaryOwner ? primaryOwner.displayName : '',
    adminEmail: primaryOwner ? primaryOwner.email : '',
    adminUsername: primaryOwner ? primaryOwner.username : undefined,
    adminStatus: primaryOwner ? (primaryOwner.status as TenantAdminStatus) : undefined,
    tenantAdminId: primaryOwner ? primaryOwner.id : undefined,
    subscriptionPackageId: dto.packageId,
    subscriptionPackageVersion: dto.subscriptionPackageVersion,
    subscriptionPrice: dto.subscriptionPrice,
    subscriptionCurrency: 'VND',
    subscriptionStartedAt: dto.subscriptionStartedAt,
    // Hạn dùng chính là ngày gia hạn kế tiếp: BR-TENANT-006 quy định gia hạn là
    // đẩy `expiresAt` ra xa, không phải một chu kỳ thanh toán riêng.
    subscriptionRenewsAt: dto.expiresAt,
    billingCycle: dto.billingCycle,
    plan: dto.packageName,
    subscriptionPlan: dto.packageName
  };
};

/**
 * Chuyển một tài khoản chủ tiệm sang hình dạng mà màn quản lý tài khoản dùng.
 *
 * `source` luôn là `TENANT`: phân biệt "tài khoản sinh ra cùng tiệm" với "tài
 * khoản được mời riêng" là di sản của thời dữ liệu mẫu. Ở database thật chỉ có
 * một loại tài khoản chủ tiệm, và nó luôn ra đời trong giao dịch tạo tiệm
 * (BR-TENANT-004).
 */
const toTenantAdminAccount = (
  dto: TenantAdminAccountDto,
  tenantsById: Map<string, Tenant>
): TenantAdminAccount => ({
  id: dto.id,
  name: dto.displayName,
  email: dto.email,
  username: dto.username,
  tenantIds: dto.tenantIds,
  tenantCount: dto.tenantIds.length,
  tenantName: dto.tenantIds.length === 0
    ? 'Chưa được giao tiệm nào'
    : dto.tenantIds.map((id) => {
      const tenant = tenantsById.get(id);
      return tenant ? tenant.name : id;
    }).join(', '),
  role: 'Owner',
  status: dto.status as TenantAdminStatus,
  // Máy chủ chưa ghi nhận lần hoạt động gần nhất trên bảng tài khoản.
  lastActive: '',
  phone: '',
  createdAt: dto.createdAt,
  source: 'TENANT'
});

/**
 * `features` và `limits` là JSON thô đúng như cột trong database. Đọc hỏng thì
 * trả về khối rỗng chứ không ném lỗi: một gói thiếu phần mô tả tính năng vẫn bán
 * được, còn một màn hình trắng thì không cứu được gì.
 */
const parseJson = <T>(raw: string, fallback: T): T => {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/**
 * Quyền tính năng của gói — BR-SUB-007.
 *
 * Máy chủ chỉ gửi về danh sách khóa đang mở. Nhãn tiếng Việt tra từ danh mục có
 * sẵn ở frontend, và **cả những khóa không mở cũng được liệt kê** với
 * `enabled: false` — bảng so sánh gói cần biết cái gì thiếu, không chỉ cái gì có.
 * Khóa lạ mà danh mục chưa biết thì vẫn hiện, lấy chính khóa làm nhãn, để một
 * tính năng mới ở máy chủ không lặng lẽ biến mất khỏi giao diện.
 */
const toCapabilities = (unlockedKeys: string[]): SubscriptionCapability[] => {
  const unlocked = new Set(unlockedKeys);
  const known = new Set(SUBSCRIPTION_CAPABILITY_CATALOG.map((item) => item.key));

  return [
    ...SUBSCRIPTION_CAPABILITY_CATALOG.map((item) => ({
      key: item.key,
      label: item.label,
      enabled: unlocked.has(item.key)
    })),
    ...unlockedKeys
      .filter((key) => !known.has(key))
      .map((key) => ({ key, label: key, enabled: true }))
  ];
};

const toPackage = (dto: PackageDto): SubscriptionPackage => ({
  id: dto.id,
  name: dto.name,
  description: dto.description,
  price: dto.price,
  currency: 'VND',
  billingCycle: dto.billingCycle,
  // Số tiệm đang dùng gói được đếm từ chính danh sách tiệm ở `App.tsx`; đây chỉ
  // là giá trị khởi đầu để kiểu dữ liệu đủ trường.
  activeTenants: 0,
  features: parseJson<string[]>(dto.features, []),
  limits: parseJson<SubscriptionLimits>(dto.limits, DEFAULT_SUBSCRIPTION_LIMITS),
  maxStaff: dto.maxStaff,
  maxSalons: dto.maxSalons,
  version: dto.version,
  status: dto.status as SubscriptionPackage['status'],
  color: dto.color || '#7c3aed',
  capabilities: toCapabilities(dto.capabilities)
});

export interface TenantDirectory {
  tenants: Tenant[];
  packages: SubscriptionPackage[];
  tenantAdmins: TenantAdminAccount[];
  loading: boolean;
  /** Lỗi của lần nạp gần nhất. `null` khi nạp được, kể cả khi danh sách rỗng. */
  error: ApiError | null;
  reload: () => void;
  createTenant: (
    input: CreateTenantInput
  ) => Promise<ApiResult<{ tenant: Tenant; generatedPassword?: string }>>;
  updateTenant: (id: string, input: UpdateTenantInput) => Promise<ApiResult<Tenant>>;
  renewTenant: (id: string, expiresAt: string) => Promise<ApiResult<Tenant>>;
  changeTenantStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<ApiResult<Tenant>>;
  deleteTenant: (id: string) => Promise<ApiResult<void>>;
}

/**
 * @param enabled Chỉ Superadmin có quyền với ba endpoint này (BR-AUTH-010,
 * BR-AUTH-030). Gọi bằng vai trò khác thì chắc chắn nhận `403`, nên hook đứng
 * im thay vì đi hỏi để lấy về một lỗi đã biết trước.
 */
export default function useTenants(enabled: boolean): TenantDirectory {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [tenantAdmins, setTenantAdmins] = useState<TenantAdminAccount[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled) {
      setTenants([]);
      setPackages([]);
      setTenantAdmins([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    // Ba lời gọi độc lập nhau nên đi song song. Nối tiếp thì màn hình chờ đúng
    // bằng tổng ba lượt, mà không lượt nào cần kết quả của lượt trước.
    void Promise.all([listTenants(), listPackages(), listTenantAdminAccounts()])
      .then(([tenantResult, packageResult, accountResult]) => {
        if (!active) return;

        // Danh sách tiệm là thứ màn hình không sống thiếu được; hai danh sách kia
        // chỉ làm giàu thêm. Nên chỉ lỗi ở danh sách tiệm mới coi là hỏng.
        if (tenantResult.status === 'error') {
          setError(tenantResult.error);
          setTenants([]);
          setPackages([]);
          setTenantAdmins([]);
          return;
        }

        const mapped = tenantResult.data.map(toTenant);
        const byId = new Map(mapped.map((tenant) => [tenant.id, tenant]));

        setError(null);
        setTenants(mapped);
        setPackages(packageResult.status === 'ok' ? packageResult.data.map(toPackage) : []);
        setTenantAdmins(
          accountResult.status === 'ok'
            ? accountResult.data.map((account) => toTenantAdminAccount(account, byId))
            : []
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, reloadToken]);

  /**
   * Sau mỗi lần ghi thành công thì nạp lại cả danh sách, thay vì tự vá bản ghi
   * trong bộ nhớ. Lý do: nhiều trường của tiệm được máy chủ TÍNH lúc đọc —
   * trạng thái hiển thị, số ngày còn lại, cờ chỉ đọc, số chi nhánh và nhân viên
   * đang hoạt động. Tự vá là tự tính lại chúng ở phía trình duyệt, tức dựng lại
   * đúng thứ mà ngày 6 đang dỡ bỏ.
   */
  const createTenant = useCallback(async (input: CreateTenantInput) => {
    const result = await createTenantRequest(input);

    if (result.status === 'error') return result;

    reload();

    return {
      status: 'ok' as const,
      data: {
        tenant: toTenant(result.data.tenant),
        generatedPassword: result.data.generatedPassword
      }
    };
  }, [reload]);

  const updateTenant = useCallback(async (id: string, input: UpdateTenantInput) => {
    const result = await updateTenantRequest(id, input);

    if (result.status === 'error') return result;

    reload();
    return { status: 'ok' as const, data: toTenant(result.data) };
  }, [reload]);

  const renewTenant = useCallback(async (id: string, expiresAt: string) => {
    const result = await renewTenantRequest(id, expiresAt);

    if (result.status === 'error') return result;

    reload();
    return { status: 'ok' as const, data: toTenant(result.data) };
  }, [reload]);

  const changeTenantStatus = useCallback(async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    const result = await changeTenantStatusRequest(id, status);

    if (result.status === 'error') return result;

    reload();
    return { status: 'ok' as const, data: toTenant(result.data) };
  }, [reload]);

  const deleteTenant = useCallback(async (id: string) => {
    const result = await deleteTenantRequest(id);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return {
    tenants,
    packages,
    tenantAdmins,
    loading,
    error,
    reload,
    createTenant,
    updateTenant,
    renewTenant,
    changeTenantStatus,
    deleteTenant
  };
}
