/**
 * Tầng gọi API tầng nền tảng: tiệm, bảng giá gói, tài khoản chủ tiệm.
 *
 * Cùng nguyên tắc với `src/services/auth.ts` — **không hàm nào nuốt lỗi**. Mỗi
 * lời gọi trả về `ApiResult`, và nơi gọi tự quyết định hiện lỗi ở đâu: lỗi nhập
 * liệu gắn vào đúng ô nhập, lỗi hạn mức hiện ở hộp thoại, lỗi mạng hiện ở toast.
 *
 * Những kiểu dưới đây chép đúng hình dạng DTO của máy chủ. Cố ý **không** dùng
 * lại kiểu `Tenant` của frontend: kiểu đó mang hàng chục trường từ thời dữ liệu
 * mẫu mà database không có, và trộn hai thứ vào một sẽ khiến người đọc không
 * phân biệt được trường nào thật sự tồn tại ở máy chủ. Việc chuyển đổi sang
 * `Tenant` nằm ở `src/hooks/useTenants.ts`, tức đúng một chỗ.
 */

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult
} from './apiClient';

/** Bốn trạng thái hiển thị của tiệm — BR-TENANT-001 đã bỏ `EXPIRING`. */
export type TenantDisplayStatus = 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'SUSPENDED';

/** Chủ tiệm được giao quản lý một tiệm — BR-AUTH-023. */
export interface TenantOwnerDto {
  id: string;
  email: string;
  username?: string;
  displayName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
}

/**
 * Một tiệm trong màn quản lý của Superadmin.
 *
 * Không có trường doanh thu, và đó là chủ ý: BR-AUTH-030 xếp doanh thu của tiệm
 * vào dữ liệu nghiệp vụ mà Superadmin không được đọc. Hai con số duy nhất đến từ
 * bên trong tiệm là `activeBranches` và `activeStaff`, có mặt vì BR-SUB-005 —
 * đó là hai hạn mức được cưỡng chế thật, nên người bán gói phải thấy ai sắp chạm trần.
 */
export interface TenantDetailDto {
  id: string;
  code: string;
  name: string;
  displayStatus: TenantDisplayStatus;
  isReadOnly: boolean;
  isTrial: boolean;
  expiresAt: string;
  /** Âm khi tiệm đã quá hạn — màn hình hiển thị đúng như vậy. */
  daysRemaining: number;
  address?: string;
  phone?: string;
  contactEmail?: string;
  timezone: string;
  packageId: string;
  packageName: string;
  subscriptionPrice: number;
  subscriptionPackageVersion: number;
  billingCycle: 'monthly' | 'yearly';
  subscriptionStartedAt: string;
  maxSalons: number;
  maxStaff: number;
  activeBranches: number;
  activeStaff: number;
  owners: TenantOwnerDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PackageDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  maxSalons: number;
  maxStaff: number;
  version: number;
  status: string;
  color?: string;
  capabilities: string[];
  /** JSON thô đúng như cột trong database — frontend đã có sẵn cách đọc hai khối này. */
  features: string;
  limits: string;
}

export interface TenantAdminAccountDto {
  id: string;
  email: string;
  username?: string;
  displayName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;
  tenantIds: string[];
}

/**
 * Chủ tiệm cho một tiệm mới — BR-TENANT-004.
 *
 * `password` bỏ trống thì máy chủ tự sinh và trả lại **đúng một lần** trong
 * `generatedPassword`. Hệ thống không gửi email, nên nếu màn hình không hiện
 * chuỗi đó ngay thì tài khoản vừa tạo không ai đăng nhập được.
 */
export interface TenantOwnerInput {
  mode: 'new' | 'existing';
  existingUserId?: string;
  email?: string;
  username?: string;
  displayName?: string;
  password?: string;
}

export interface CreateTenantInput {
  code: string;
  name: string;
  packageId: string;
  expiresAt: string;
  isTrial: boolean;
  billingCycle?: 'monthly' | 'yearly';
  address?: string;
  phone?: string;
  contactEmail?: string;
  timezone?: string;
  primaryBranchName?: string;
  primaryBranchCode?: string;
  owner: TenantOwnerInput;
}

export interface CreateTenantOutcome {
  tenant: TenantDetailDto;
  /** Khác `null` đúng một lần: ngay sau khi máy chủ vừa sinh mật khẩu tạm. */
  generatedPassword?: string;
}

export interface UpdateTenantInput {
  name: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
}

export const listTenants = async (): Promise<ApiResult<TenantDetailDto[]>> => {
  const result = await apiGet<{ tenants: TenantDetailDto[] }>('/api/tenants');

  return result.status === 'ok' ? { status: 'ok', data: result.data.tenants } : result;
};


/**
 * Hồ sơ của chính tiệm đang làm việc — nguồn cho cổng chủ tiệm.
 *
 * Khác `listTenants` ở đúng một điểm và đó là điểm quan trọng: đường dẫn không
 * mang mã tiệm, nên không có cách nào hỏi hồ sơ của tiệm khác. Máy chủ lấy tiệm
 * từ phiên đăng nhập (BR-AUTH-024), còn `GET /api/tenants` thì chỉ Superadmin
 * gọi được vì nó đọc được mọi tiệm.
 */
export const getMyTenant = async (): Promise<ApiResult<TenantDetailDto>> => {
  const result = await apiGet<{ tenant: TenantDetailDto }>('/api/tenants/me');

  return result.status === 'ok' ? { status: 'ok', data: result.data.tenant } : result;
};
export const listPackages = async (): Promise<ApiResult<PackageDto[]>> => {
  const result = await apiGet<{ packages: PackageDto[] }>('/api/packages');

  return result.status === 'ok' ? { status: 'ok', data: result.data.packages } : result;
};

/** Danh sách tài khoản chủ tiệm — nguồn cho ô "giao tiệm cho chủ tiệm đã có". */
export const listTenantAdminAccounts = async (): Promise<ApiResult<TenantAdminAccountDto[]>> => {
  const result = await apiGet<{ accounts: TenantAdminAccountDto[] }>(
    '/api/accounts?role=TENANT_ADMIN'
  );

  return result.status === 'ok' ? { status: 'ok', data: result.data.accounts } : result;
};

export const createTenant = async (
  input: CreateTenantInput
): Promise<ApiResult<CreateTenantOutcome>> => {
  const result = await apiPost<{ tenant: TenantDetailDto; generatedPassword?: string }>(
    '/api/tenants',
    input
  );

  return result.status === 'ok'
    ? {
        status: 'ok',
        data: { tenant: result.data.tenant, generatedPassword: result.data.generatedPassword }
      }
    : result;
};

const unwrapTenant = (result: ApiResult<{ tenant: TenantDetailDto }>): ApiResult<TenantDetailDto> =>
  result.status === 'ok' ? { status: 'ok', data: result.data.tenant } : result;

export const updateTenant = async (id: string, input: UpdateTenantInput) =>
  unwrapTenant(await apiPut<{ tenant: TenantDetailDto }>(`/api/tenants/${id}`, input));

/** BR-TENANT-006 — gia hạn bằng ngày hết hạn mới do Superadmin nhập tay. */
export const renewTenant = async (id: string, expiresAt: string) =>
  unwrapTenant(await apiPost<{ tenant: TenantDetailDto }>(`/api/tenants/${id}/renew`, { expiresAt }));

/**
 * Khóa hoặc mở khóa tiệm — BR-TENANT-002.
 *
 * Chỉ nhận đúng hai giá trị mà database lưu. `TRIAL` và `OVERDUE` không đặt tay
 * được vì chúng là kết quả tính lúc đọc từ hạn dùng.
 */
export const changeTenantStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
  unwrapTenant(await apiPatch<{ tenant: TenantDetailDto }>(`/api/tenants/${id}/status`, { status }));

/**
 * BR-AUTH-020 — khóa tạm hoặc mở khóa một tài khoản chủ tiệm.
 *
 * Nằm cạnh `listTenantAdminAccounts` chứ không tách sang tệp riêng: hai hàm đọc và ghi trên
 * cùng một tài nguyên, và tách chúng ra hai chỗ là bắt người sửa phải nhớ cả hai.
 *
 * **Không nhận `'INACTIVE'`, và kiểu ở đây là hàng rào thứ nhất.** Vô hiệu vĩnh viễn là một
 * quyết định không hoàn tác được (BR-DEL-001 không cho xóa để tạo lại), nên nó phải có đường
 * riêng chứ không nấp sau cùng một tham số. Máy chủ cũng từ chối, nhưng để `tsc` bắt trước thì
 * lỗi lộ ra lúc gõ chứ không lúc chạy.
 */
export const changeTenantAdminStatus = async (
  id: string,
  status: 'ACTIVE' | 'SUSPENDED'
): Promise<ApiResult<TenantAdminAccountDto>> => {
  const result = await apiPatch<{ account: TenantAdminAccountDto }>(
    `/api/accounts/${id}/status`,
    { status }
  );

  return result.status === 'ok' ? { status: 'ok', data: result.data.account } : result;
};

/** BR-TENANT-020 — xóa mềm. Mã tiệm vẫn bị chiếm sau khi xóa. */
export const deleteTenant = (id: string) => apiDelete<void>(`/api/tenants/${id}`);
