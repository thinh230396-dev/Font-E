import type { Branch, SubscriptionPackage, SubscriptionPackageName, Tenant, TenantAdminAccount, TenantStatus } from '../types';
import { getSubscriptionBranchLimit, getSubscriptionStaffLimit, isUnlimitedBranches, isUnlimitedStaff } from './subscriptions';

/**
 * Kiểm tra hồ sơ tenant, tách khỏi component theo đúng mẫu `validateBranchDraft`
 * trong `utils/branches.ts`.
 *
 * Vì sao là hàm thuần chứ không nằm trong form: biểu mẫu tạo tenant trước đây
 * chỉ báo lỗi bằng toast sau khi bấm Lưu, nên người dùng phải tự dò xem trường
 * nào sai giữa bốn nhóm cuộn dài. Tách ra thì cùng một bộ luật vừa chạy được
 * theo từng lần gõ để đánh dấu đúng ô, vừa chạy lại lúc submit.
 */

/** Khoá lỗi trùng với tên trường trong biểu mẫu, để UI gắn thẳng vào `Field`. */
export type TenantFieldKey =
  | 'name'
  | 'code'
  | 'address'
  | 'timezone'
  | 'contactEmail'
  | 'phone'
  | 'adminSelection'
  | 'adminCode'
  | 'adminName'
  | 'adminEmail'
  | 'adminPhone'
  | 'adminUsername'
  | 'branchCount'
  | 'staffCount'
  | 'trialEndDate';

export type TenantFieldErrors = Partial<Record<TenantFieldKey, string>>;

export interface TenantDraft {
  name: string;
  code: string;
  address: string;
  timezone: string;
  contactEmail: string;
  phone: string;
  adminMode: 'existing' | 'new';
  selectedAdminId: string;
  adminCode: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminUsername: string;
  packageName: SubscriptionPackageName;
  branchCount: number;
  staffCount: number;
  status: TenantStatus;
  trialEndDate: string;
}

export interface TenantValidationContext {
  tenants: Tenant[];
  packages: SubscriptionPackage[];
  /** Toàn bộ Tenant Admin đã biết, kể cả người được mời nhưng chưa gán tenant. */
  tenantAdmins: TenantAdminAccount[];
  /** Các admin đang được phép chọn ở chế độ "dùng admin có sẵn". */
  availableAdminIds: string[];
  /** Bỏ qua chính tenant này khi kiểm trùng, dùng cho biểu mẫu sửa. */
  editingTenantId?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

/** Số điện thoại Việt Nam, cùng luật với `validateBranchDraft` để hai nơi không lệch nhau. */
export const isValidVietnamPhone = (value: string) => (
  /^(?:\+84|0)\d{9,10}$/.test(value.replace(/[\s().-]/g, ''))
);

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Ngày kết thúc dùng thử gợi ý theo số ngày trial của chính gói được chọn.
 * Trước đây trường này để trống được, nên tenant TRIAL không có mốc hết hạn nào
 * và các effect tự hết hạn trong `App.tsx` không có gì để bám vào.
 */
export const getSuggestedTrialEndDate = (
  packages: SubscriptionPackage[],
  packageName: SubscriptionPackageName
) => {
  const trialDays = packages.find((pkg) => pkg.name === packageName)?.trialDays ?? 14;
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

export const validateTenantDraft = (
  draft: TenantDraft,
  context: TenantValidationContext
): { errors: TenantFieldErrors; isValid: boolean } => {
  const { tenants, packages, tenantAdmins, availableAdminIds, editingTenantId } = context;
  const errors: TenantFieldErrors = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'Tên tenant không được để trống.';
  else if (name.length < 3) errors.name = 'Tên tenant phải có ít nhất 3 ký tự.';
  else if (name.length > 80) errors.name = 'Tên tenant không được vượt quá 80 ký tự.';

  const code = draft.code.trim().toUpperCase();
  if (!code) errors.code = 'Mã tenant không được để trống.';
  else if (!/^[A-Z0-9-]+$/.test(code)) errors.code = 'Mã tenant chỉ gồm chữ in hoa, số và dấu gạch ngang.';
  else if (tenants.some((tenant) => tenant.id !== editingTenantId && tenant.id.toUpperCase() === code)) {
    errors.code = `Mã tenant "${code}" đã tồn tại.`;
  }

  if (!draft.address.trim()) errors.address = 'Địa chỉ đại diện không được để trống.';
  else if (draft.address.trim().length < 10) errors.address = 'Địa chỉ cần ghi rõ số nhà, đường và khu vực.';

  if (!draft.timezone.trim()) errors.timezone = 'Vui lòng chọn múi giờ.';

  /* Hai trường liên hệ của tiệm không bắt buộc, nhưng đã nhập thì phải đúng
     định dạng: biểu mẫu đặt `noValidate` nên trình duyệt không còn kiểm hộ. */
  if (draft.contactEmail.trim() && !isValidEmail(draft.contactEmail)) {
    errors.contactEmail = 'Email liên hệ tenant chưa đúng định dạng.';
  }
  if (draft.phone.trim() && !isValidVietnamPhone(draft.phone)) {
    errors.phone = 'Số điện thoại tenant phải đúng định dạng Việt Nam, ví dụ 0901234567.';
  }

  if (draft.adminMode === 'existing' && !availableAdminIds.includes(draft.selectedAdminId)) {
    errors.adminSelection = 'Vui lòng chọn một Tenant Admin có sẵn chưa gán tenant.';
  }

  const adminName = draft.adminName.trim();
  if (!adminName) errors.adminName = 'Tên Tenant Admin không được để trống.';

  const adminEmail = draft.adminEmail.trim().toLowerCase();
  if (!adminEmail) {
    errors.adminEmail = 'Email Tenant Admin không được để trống.';
  } else if (!isValidEmail(adminEmail)) {
    errors.adminEmail = 'Email Tenant Admin chưa đúng định dạng.';
  } else if (tenants.some((tenant) => (
    tenant.id !== editingTenantId && tenant.adminEmail.trim().toLowerCase() === adminEmail
  ))) {
    errors.adminEmail = 'Email này đang là Tenant Admin của một tenant khác. Mỗi Tenant Admin chỉ quản lý 1 tenant.';
  } else if (draft.adminMode === 'new' && tenantAdmins.some((admin) => (
    /* Ở chế độ tạo mới, email trùng một Tenant Admin ĐÃ MỜI nhưng chưa gán
       tenant trước đây lọt lưới, vì phép kiểm chỉ soi danh sách tenant. */
    admin.email.trim().toLowerCase() === adminEmail
  ))) {
    errors.adminEmail = 'Email này đã có tài khoản Tenant Admin. Hãy dùng chế độ "Dùng Tenant Admin có sẵn".';
  }

  const adminPhone = draft.adminPhone.trim();
  if (!adminPhone) errors.adminPhone = 'Số điện thoại Tenant Admin không được để trống.';
  else if (!isValidVietnamPhone(adminPhone)) {
    errors.adminPhone = 'Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0901234567.';
  }

  const adminUsername = draft.adminUsername.trim();
  if (!adminUsername) errors.adminUsername = 'Username đăng nhập không được để trống.';
  else if (adminUsername.includes('@')) {
    errors.adminUsername = 'Username không dùng định dạng email. Ví dụ hợp lệ: nguyenvanbay.';
  } else if (!/^[a-z0-9._-]+$/i.test(adminUsername)) {
    errors.adminUsername = 'Username chỉ gồm chữ, số và các ký tự . _ -';
  } else if (tenants.some((tenant) => (
    tenant.id !== editingTenantId
    && (tenant.adminUsername || '').trim().toLowerCase() === adminUsername.toLowerCase()
  ))) {
    errors.adminUsername = 'Username này đã được dùng cho một Tenant Admin khác.';
  }

  const adminCode = draft.adminCode.trim();
  if (draft.adminMode === 'new' && adminCode && tenants.some((tenant) => (
    tenant.id !== editingTenantId && (tenant.tenantAdminId || '').toLowerCase() === adminCode.toLowerCase()
  ))) {
    errors.adminCode = 'Mã Tenant Admin đã tồn tại trên hệ thống.';
  }

  const branchLimit = getSubscriptionBranchLimit(packages, draft.packageName);
  if (!Number.isInteger(draft.branchCount) || draft.branchCount < 1) {
    errors.branchCount = 'Số chi nhánh phải là số nguyên từ 1 trở lên.';
  } else if (!isUnlimitedBranches(branchLimit) && draft.branchCount > branchLimit) {
    errors.branchCount = `Gói ${draft.packageName} chỉ hỗ trợ tối đa ${branchLimit} chi nhánh.`;
  }

  const staffLimit = getSubscriptionStaffLimit(packages, draft.packageName);
  if (!Number.isInteger(draft.staffCount) || draft.staffCount < 0) {
    errors.staffCount = 'Số nhân sự phải là số nguyên từ 0 trở lên.';
  } else if (!isUnlimitedStaff(staffLimit) && draft.staffCount > staffLimit) {
    errors.staffCount = `Gói ${draft.packageName} chỉ hỗ trợ tối đa ${staffLimit} nhân sự toàn tenant.`;
  }

  /* Tenant dùng thử bắt buộc có mốc kết thúc, nếu không thì nó dùng thử vĩnh
     viễn: `App.tsx` suy ra hạn từ `trialEndDate`/`daysRemaining`, cả hai đều
     rỗng khi trường này để trống. */
  if (draft.status === 'TRIAL') {
    if (!draft.trialEndDate) {
      errors.trialEndDate = 'Tenant dùng thử phải có ngày kết thúc dùng thử.';
    } else if (draft.trialEndDate <= todayIso()) {
      errors.trialEndDate = 'Ngày kết thúc dùng thử phải sau hôm nay.';
    }
  } else if (draft.trialEndDate && draft.trialEndDate <= todayIso()) {
    errors.trialEndDate = 'Ngày kết thúc dùng thử phải sau hôm nay.';
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

/**
 * Chia lại nhân sự cho các chi nhánh khi tổng nhân sự toàn tenant thay đổi.
 *
 * Bản cũ tính chi nhánh cuối bằng `tổng mới − tổng CŨ của các chi nhánh trước`,
 * trong khi các chi nhánh trước đã nhận số MỚI — hai vế lệch nhau nên tổng cộng
 * lại không ra tổng đã nhập. Ví dụ hai chi nhánh 10+10, đổi tổng thành 30:
 * chi nhánh đầu thành 15, chi nhánh cuối thành 30−10=20, cộng lại 35.
 *
 * Ở đây chia đều rồi rải phần dư cho những chi nhánh đầu, nên tổng luôn khớp.
 */
export const redistributeBranchStaff = (branches: Branch[], totalStaff: number): Branch[] => {
  if (branches.length === 0) return branches;

  const safeTotal = Math.max(0, Math.floor(totalStaff));
  const base = Math.floor(safeTotal / branches.length);
  const remainder = safeTotal % branches.length;

  return branches.map((branch, index) => {
    const staffForThisBranch = base + (index < remainder ? 1 : 0);
    return {
      ...branch,
      staffUsed: staffForThisBranch,
      // `staffCount` là trường cũ vẫn còn nơi đọc; giữ cho khớp `staffUsed`.
      staffCount: staffForThisBranch,
      staffCapacity: Math.max(branch.staffCapacity ?? 0, staffForThisBranch),
    };
  });
};
