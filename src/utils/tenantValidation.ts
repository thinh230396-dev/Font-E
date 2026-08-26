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
  | 'packageId'
  | 'expiresAt'
  | 'primaryBranchName'
  | 'adminSelection'
  | 'adminName'
  | 'adminEmail'
  | 'adminUsername'
  | 'adminPassword';

export type TenantFieldErrors = Partial<Record<TenantFieldKey, string>>;

/**
 * Bản nháp một tiệm mới, đúng bằng những gì `POST /api/tenants` nhận.
 *
 * Trước ngày 6 bản nháp này còn mang số chi nhánh, số nhân sự, doanh thu, trạng thái ban đầu
 * và mốc kết thúc dùng thử. Không trường nào trong số đó tồn tại ở máy chủ: chi nhánh và
 * nhân sự là những bản ghi được ĐẾM chứ không phải con số gõ vào (BR-SUB-005), doanh thu
 * tiệm nằm ngoài tầm với của Superadmin (BR-AUTH-030), còn trạng thái hiển thị được tính
 * lúc đọc từ hạn dùng (BR-TENANT-002).
 */
export interface TenantDraft {
  name: string;
  code: string;
  address: string;
  timezone: string;
  contactEmail: string;
  phone: string;
  packageId: string;
  /** Ngày ở dạng `YYYY-MM-DD` lấy thẳng từ ô nhập. */
  expiresAt: string;
  primaryBranchName: string;
  adminMode: 'existing' | 'new';
  selectedAdminId: string;
  adminName: string;
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
}

export interface TenantValidationContext {
  tenants: Tenant[];
  packages: SubscriptionPackage[];
  /** Toàn bộ tài khoản chủ tiệm đã biết, đọc từ máy chủ. */
  tenantAdmins: TenantAdminAccount[];
  /** Các tài khoản đang được phép chọn ở chế độ "giao cho chủ tiệm đã có". */
  availableAdminIds: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

/** Số điện thoại Việt Nam, cùng luật với `validateBranchDraft` để hai nơi không lệch nhau. */
export const isValidVietnamPhone = (value: string) => (
  /^(?:\+84|0)\d{9,10}$/.test(value.replace(/[\s().-]/g, ''))
);

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Kiểm tra trước khi gửi lên máy chủ.
 *
 * Đây là lớp kiểm **thứ hai chứ không phải duy nhất**: máy chủ vẫn kiểm lại tất cả và là bên
 * có tiếng nói cuối cùng. Lớp này tồn tại để người dùng biết mình sai ở đâu ngay lúc gõ,
 * thay vì phải bấm Lưu rồi chờ một vòng đi về mới thấy lỗi.
 */
export const validateTenantDraft = (
  draft: TenantDraft,
  context: TenantValidationContext
): { errors: TenantFieldErrors; isValid: boolean } => {
  const { tenants, packages, tenantAdmins, availableAdminIds } = context;
  const errors: TenantFieldErrors = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'Tên tiệm không được để trống.';
  else if (name.length < 3) errors.name = 'Tên tiệm phải có ít nhất 3 ký tự.';
  else if (name.length > 80) errors.name = 'Tên tiệm không được vượt quá 80 ký tự.';

  const code = draft.code.trim().toUpperCase();
  if (!code) errors.code = 'Mã tiệm không được để trống.';
  else if (!/^[A-Z0-9-]+$/.test(code)) errors.code = 'Mã tiệm chỉ gồm chữ in hoa, số và dấu gạch ngang.';
  else if (tenants.some((tenant) => (tenant.code || '').toUpperCase() === code)) {
    errors.code = `Mã tiệm "${code}" đã được dùng.`;
  }

  if (!draft.address.trim()) errors.address = 'Địa chỉ tiệm không được để trống.';
  else if (draft.address.trim().length < 10) errors.address = 'Địa chỉ cần ghi rõ số nhà, đường và khu vực.';

  if (!draft.timezone.trim()) errors.timezone = 'Vui lòng chọn múi giờ.';

  /* Hai trường liên hệ của tiệm không bắt buộc, nhưng đã nhập thì phải đúng
     định dạng: biểu mẫu đặt `noValidate` nên trình duyệt không còn kiểm hộ. */
  if (draft.contactEmail.trim() && !isValidEmail(draft.contactEmail)) {
    errors.contactEmail = 'Email liên hệ của tiệm chưa đúng định dạng.';
  }
  if (draft.phone.trim() && !isValidVietnamPhone(draft.phone)) {
    errors.phone = 'Số điện thoại tiệm phải đúng định dạng Việt Nam, ví dụ 0901234567.';
  }

  if (!draft.packageId) errors.packageId = 'Vui lòng chọn gói dịch vụ.';
  else if (!packages.some((pkg) => pkg.id === draft.packageId)) {
    errors.packageId = 'Gói dịch vụ này không còn trên bảng giá. Hãy tải lại trang.';
  }

  /* Hạn dùng bắt buộc và phải ở tương lai. Tự chọn hộ một ngày là âm thầm tạo ra một hợp
     đồng khác với thứ người dùng định ký, nên biểu mẫu để trống và bắt nhập (BR-TENANT-006). */
  if (!draft.expiresAt) errors.expiresAt = 'Vui lòng nhập hạn dùng của tiệm.';
  else if (draft.expiresAt <= todayIso()) errors.expiresAt = 'Hạn dùng phải sau ngày hôm nay.';

  const primaryBranchName = draft.primaryBranchName.trim();
  if (primaryBranchName && primaryBranchName.length < 3) {
    errors.primaryBranchName = 'Tên chi nhánh chính phải có ít nhất 3 ký tự.';
  }

  if (draft.adminMode === 'existing') {
    if (!availableAdminIds.includes(draft.selectedAdminId)) {
      errors.adminSelection = 'Vui lòng chọn một tài khoản chủ tiệm đang hoạt động.';
    }

    return { errors, isValid: Object.keys(errors).length === 0 };
  }

  const adminName = draft.adminName.trim();
  if (!adminName) errors.adminName = 'Tên chủ tiệm không được để trống.';

  const adminEmail = draft.adminEmail.trim().toLowerCase();
  if (!adminEmail) {
    errors.adminEmail = 'Email chủ tiệm không được để trống.';
  } else if (!isValidEmail(adminEmail)) {
    errors.adminEmail = 'Email chủ tiệm chưa đúng định dạng.';
  } else if (tenantAdmins.some((admin) => admin.email.trim().toLowerCase() === adminEmail)) {
    /* Email đã có tài khoản thì đường đi đúng là giao thêm tiệm cho tài khoản ấy, chứ không
       phải lập một tài khoản thứ hai cùng email — máy chủ cũng sẽ từ chối. */
    errors.adminEmail = 'Email này đã có tài khoản chủ tiệm. Hãy dùng chế độ "Giao cho chủ tiệm đã có".';
  }

  const adminUsername = draft.adminUsername.trim();
  if (adminUsername) {
    if (adminUsername.includes('@')) {
      errors.adminUsername = 'Username không dùng định dạng email. Ví dụ hợp lệ: nguyenvanbay.';
    } else if (!/^[a-z0-9._-]+$/i.test(adminUsername)) {
      errors.adminUsername = 'Username chỉ gồm chữ, số và các ký tự . _ -';
    } else if (tenantAdmins.some((admin) => (
      (admin.username || '').trim().toLowerCase() === adminUsername.toLowerCase()
    ))) {
      errors.adminUsername = 'Username này đã được dùng cho một tài khoản khác.';
    }
  }

  /* Mật khẩu để trống là hợp lệ và là đường được khuyến khích: máy chủ tự sinh một chuỗi
     mạnh rồi trả về đúng một lần. Đã tự nhập thì phải đủ dài. */
  const adminPassword = draft.adminPassword.trim();
  if (adminPassword && adminPassword.length < 8) {
    errors.adminPassword = 'Mật khẩu tạm phải có ít nhất 8 ký tự, hoặc để trống cho máy chủ tự sinh.';
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

export interface TenantDeletionEligibility {
  canDelete: boolean;
  blockReasons: string[];
}

/**
 * Điều kiện an toàn trước khi xóa một tiệm.
 *
 * Bản trước ngày 6 chặn bốn thứ: tiệm còn chi nhánh, còn nhân sự, đang hoạt động, hoặc có
 * yêu cầu nâng gói chờ duyệt. Cả bốn đều là quy ước tự đặt ở thời dữ liệu mẫu, không nằm
 * trong `README-BUSINESS-RULES.md`, và điều kiện đầu tiên còn **bất khả thi**: BR-BRANCH-002
 * cấm ngừng chi nhánh chính, nên số chi nhánh hoạt động không bao giờ về 0 và không tiệm nào
 * xóa được — trong khi `DELETE /api/tenants/{id}` ở máy chủ vẫn nhận và vẫn chạy đúng.
 *
 * Nay chỉ còn một điều kiện, và nó có thật: tiệm đang hoạt động thì phải khóa trước. Đây là
 * bước dừng để người bấm nhìn lại một lần, và nó **thực hiện được** — nút khóa nằm ngay cạnh
 * nút xóa (BR-TENANT-002).
 *
 * Máy chủ vẫn là bên quyết định cuối cùng. Hàm này chỉ giúp người dùng khỏi bấm vào một việc
 * mà họ sẽ hối tiếc, chứ không phải hàng rào an ninh — hàng rào nằm ở ma trận quyền.
 */
export const getTenantDeletionEligibility = (tenant: Tenant): TenantDeletionEligibility => {
  const blockReasons: string[] = [];

  if (tenant.status === 'ACTIVE' || tenant.status === 'TRIAL') {
    blockReasons.push(
      'Tiệm đang hoạt động. Hãy khóa tiệm trước để chắc chắn không ai còn đang làm việc trên đó, rồi mới xóa.'
    );
  }

  return {
    canDelete: blockReasons.length === 0,
    blockReasons
  };
};

/**
 * Kiểm tra xem tài khoản Tenant Admin của một Tenant có đang bị khóa (SUSPENDED) hay không.
 */
export const isTenantAdminSuspended = (
  tenant: Tenant,
  tenantAdmins?: TenantAdminAccount[]
): boolean => {
  if (tenant.adminStatus === 'SUSPENDED') return true;
  if (!tenantAdmins || tenantAdmins.length === 0) return false;
  const adminEmail = tenant.adminEmail?.trim().toLowerCase();
  const adminId = tenant.tenantAdminId?.trim().toLowerCase();
  return tenantAdmins.some((admin) => {
    if (admin.status !== 'SUSPENDED') return false;
    const matchEmail = Boolean(adminEmail && admin.email?.trim().toLowerCase() === adminEmail);
    const matchId = Boolean(
      adminId && (
        (admin.adminCode && admin.adminCode.trim().toLowerCase() === adminId) ||
        admin.id.trim().toLowerCase() === adminId
      )
    );
    return matchEmail || matchId;
  });
};

