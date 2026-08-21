import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, Bell, Building2, ChevronRight, CircleAlert, Clock3,
  CreditCard, History, ImagePlus, Lock, Pencil, Plug, Save,
  ScrollText, Search, ShieldCheck, SlidersHorizontal, Store, Upload, UserCog, X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { Button, Field, Modal, StatusBadge, Switch, PageHeader } from './ui';
import type { StatusKey } from './ui';
import { REFUND_APPROVAL_OPTIONS } from './nailAdminData';
import type {
  BrandInfo, NailFormField, NailModuleConfig, NailRow, PaymentSettings,
  SettingsRecommendationTarget, UiTone
} from './nailAdminData';

/**
 * Cài đặt tiệm — trung tâm cấu hình của Tenant Admin.
 *
 * Toàn bộ nghiệp vụ (state, lọc, lưu, xuất dữ liệu, quyền) nằm ở
 * NailTenantAdminPortal và được truyền xuống qua props — component này chỉ trình bày.
 *
 * Bố cục dùng cùng nhịp với trang Thanh toán: header có hành động, dải phạm vi,
 * KPI card, khối lọc/menu bên trái và các content card bên phải. Mọi control
 * tiếp tục dùng thư viện UI chung và accent của shell Tenant Admin.
 */

interface TenantAdminSettingsProps {
  config: NailModuleConfig;
  rows: NailRow[];
  searchQuery: string;
  activeTab: string;
  onSearch: (value: string) => void;
  onTab: (value: string) => void;
  /** Phạm vi chi nhánh đang xem, do topbar quyết định. */
  scopeLabel: string;
  tenantName: string;
  onCreate: () => void;
  onExport: () => void;
  /** Hạng mục đang mở chi tiết. */
  selectedRow: NailRow | null;
  onSelectRow: (row: NailRow | null) => void;
  onEditSelected: () => void;
  onConfirmSelected: () => void;
  /** Biểu mẫu cập nhật cấu hình. */
  formOpen: boolean;
  formValues: Record<string, string>;
  onFormChange: (key: string, value: string) => void;
  onFormClose: () => void;
  onFormSubmit: (event: FormEvent) => void;
  /** Biểu mẫu riêng cho tab "Thông tin tiệm" — thay cho khuôn cấu hình chung. */
  brandInfo: BrandInfo;
  onBrandInfoChange: (key: keyof BrandInfo, value: string) => void;
  onBrandInfoSubmit: (event: FormEvent) => void;
  /** Biểu mẫu riêng cho tab "Thanh toán". Công tắc có hiệu lực ngay (§11.3). */
  paymentSettings: PaymentSettings;
  onPaymentMethodToggle: (key: string, enabled: boolean) => void;
  onRefundApprovalChange: (value: string) => void;
  /**
   * Chi nhánh của tenant — chỉ để hiển thị giờ mở cửa thật ở nhóm "Giờ hoạt động".
   * Giờ hoạt động thuộc dữ liệu chi nhánh, được sửa ở trang Chi nhánh.
   */
  branchRows?: NailRow[];
  /** Mở trang Chi nhánh để sửa giờ hoạt động. */
  onNavigateToBranches?: () => void;
  /** Lý do khóa thao tác khi tenant bị tạm ngưng hoặc quá hạn. */
  readOnlyReason?: string;
  /**
   * Đang xem dữ liệu mẫu hay dữ liệu thật của tenant.
   *
   * Danh sách phương thức thanh toán và các chỉ số kết nối là dữ liệu mẫu dựng
   * sẵn trong `nailAdminData`. Ở chế độ dữ liệu thật, tenant chưa nối cổng nào
   * thì phải thấy trạng thái trống chứ không phải thấy một cổng ngân hàng và
   * một máy POS không tồn tại.
   */
  demoMode?: boolean;
  /** Tài khoản đang đăng nhập — dùng cho mục "Phiên hiện tại" ở nhóm Bảo mật. */
  sessionAccount?: { displayName: string; email: string };
  /** Kết thúc phiên đăng nhập hiện tại. */
  onLogout?: () => void;
  /**
   * Ô của biểu mẫu, ghi đè `config.formFields`.
   *
   * Khi sửa một hạng mục, portal dựng danh sách ô từ chính bản ghi đó nên mỗi
   * cặp chi tiết có một ô mang đúng nhãn của nó. Bỏ trống khi thêm mới.
   */
  formFields?: NailFormField[];
  /** Tiêu đề hộp thoại biểu mẫu, ghi đè `config.formTitle`. */
  formTitle?: string;
}

const BRAND_TAB = 'Thông tin tiệm';
const PAYMENT_TAB = 'Thanh toán';
const HOURS_TAB = 'Giờ hoạt động';
const INTEGRATION_TAB = 'Tích hợp';
const SECURITY_TAB = 'Bảo mật';
const OTHER_TAB = 'Khác';

const TIMEZONE_OPTIONS = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore'];
const LANGUAGE_OPTIONS = ['Tiếng Việt', 'English'];

/**
 * Dữ liệu cấu hình mang tông màu riêng (`badgeTone`) chứ không mang mã trạng thái.
 * Ở đây chỉ ánh xạ tông sẵn có sang trạng thái cùng tông để lấy icon; nhãn luôn
 * là chữ gốc của bản ghi, nên không sinh ra bảng từ vựng trạng thái thứ hai (§15.2).
 */
const toneStatusKey: Record<UiTone, StatusKey> = {
  emerald: 'ACTIVE',
  blue: 'CONFIRMED',
  violet: 'CONFIRMED',
  cyan: 'CONFIRMED',
  amber: 'WARNING',
  rose: 'FAILED',
  slate: 'INACTIVE'
};

/** Tông cần người dùng chú ý — dùng cả icon lẫn màu để không phụ thuộc màu (§5.2). */
const attentionTones = new Set<UiTone>(['amber', 'rose']);

const FORM_ID = 'tenant-settings-form';
const BRAND_FORM_ID = 'tenant-brand-settings-form';

const sectionStack = 'flex min-w-0 flex-col gap-3';
const rowList = 'divide-y divide-brand-outline/70';
const inputClass = 'h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface-high/40 px-3 text-body text-brand-text outline-none transition focus:border-[var(--accent)] focus:bg-brand-surface focus:ring-4 focus:ring-[var(--accent-focus)]';

/**
 * Tên nhóm trên thanh điều hướng trái.
 *
 * Đặt theo cách chủ tiệm gọi công việc của mình chứ không theo cách hệ thống
 * phân loại: "Quản trị" nghe như trang cấu hình kỹ thuật của Superadmin, trong
 * khi thứ nằm trong đó là tài khoản nhân sự và bảo mật của chính tiệm.
 */
const GROUP_PROFILE = 'Hồ sơ tiệm';
const GROUP_OPERATION = 'Vận hành';
const GROUP_ACCOUNT = 'Tài khoản & bảo mật';

/** Hình thức của từng nhóm cấu hình: icon cho thanh điều hướng và một dòng mô tả. */
const categoryMeta: Record<string, { icon: typeof Store; group: string; description: string }> = {
  [BRAND_TAB]: { icon: Store, group: GROUP_PROFILE, description: 'Tên thương hiệu, logo, liên hệ, múi giờ và hồ sơ pháp lý dùng khi xuất hoá đơn.' },
  [HOURS_TAB]: { icon: Clock3, group: GROUP_PROFILE, description: 'Giờ mở cửa từng chi nhánh, ngày nghỉ lễ và khung giờ nhận lịch của khách.' },
  'Chính sách': { icon: ScrollText, group: GROUP_PROFILE, description: 'Quy định đặt lịch, cọc, hủy, bảo hành làm lại và cách xử lý dữ liệu khách.' },
  [PAYMENT_TAB]: { icon: CreditCard, group: GROUP_OPERATION, description: 'Phương thức khách thanh toán tại quầy, hoá đơn, phụ thu và cấp duyệt hoàn tiền.' },
  'Thông báo': { icon: Bell, group: GROUP_OPERATION, description: 'Tin nhắc lịch gửi khách và cảnh báo nội bộ cho nhân sự của tiệm.' },
  'Phân quyền': { icon: ShieldCheck, group: GROUP_ACCOUNT, description: 'Vai trò của nhân sự và phạm vi dữ liệu mỗi vai trò được xem theo chi nhánh.' },
  [INTEGRATION_TAB]: { icon: Plug, group: GROUP_ACCOUNT, description: 'Kênh đặt lịch online, cổng thanh toán và xuất dữ liệu cho kế toán.' },
  [SECURITY_TAB]: { icon: Lock, group: GROUP_ACCOUNT, description: 'Xác thực hai lớp, mật khẩu, phiên đăng nhập và nhật ký truy cập của tài khoản quản trị.' }
};
const defaultCategoryMeta = { icon: SlidersHorizontal, group: OTHER_TAB, description: 'Các hạng mục cấu hình chưa thuộc nhóm nào ở trên.' };
const groupOrder = [GROUP_PROFILE, GROUP_OPERATION, GROUP_ACCOUNT, OTHER_TAB];
const getCategoryMeta = (tab: string) => categoryMeta[tab] || defaultCategoryMeta;

/**
 * Hạng mục có sẵn trong dữ liệu mẫu được gắn nhóm theo mã.
 *
 * Bảng này phải đi trước phép so khớp theo chữ bên dưới: nhiều hạng mục mang
 * chữ trùng tên nhóm khác (ví dụ "Chính sách mật khẩu" thuộc Bảo mật nhưng lại
 * chứa chữ "Chính sách"), nên nếu để so khớp chữ quyết định thì chúng sẽ rơi
 * nhầm nhóm.
 */
const seededRowCategory: Record<string, string> = {
  'SET-BRAND-LEGAL': 'Thông tin tiệm',
  'SET-HOURS-SPECIAL': 'Giờ hoạt động',
  'SET-HOURS-SLOT': 'Giờ hoạt động',
  'SET-BOOKING': 'Chính sách',
  'SET-POLICY-WARRANTY': 'Chính sách',
  'SET-POLICY-DATA': 'Chính sách',
  'SET-PAY-INVOICE': 'Thanh toán',
  'SET-PAY-EXTRA': 'Thanh toán',
  'SET-NOTIFY': 'Thông báo',
  'SET-NOTIFY-STAFF': 'Thông báo',
  'SET-ACCESS': 'Phân quyền',
  'SET-ACCESS-SCOPE': 'Phân quyền',
  'SET-INTEGRATION-CHANNEL': 'Tích hợp',
  'SET-INTEGRATION-EXPORT': 'Tích hợp',
  'SET-SECURITY-AUTH': 'Bảo mật',
  'SET-SECURITY-PASSWORD': 'Bảo mật',
  'SET-SECURITY-SESSION': 'Bảo mật',
  'SET-SECURITY-AUDIT': 'Bảo mật'
};

/**
 * Xác định hạng mục thuộc nhóm nào.
 *
 * Hạng mục do người dùng tạo mang tên nhóm ở tiêu đề (trường đầu của biểu mẫu là
 * "Nhóm cấu hình") nên so khớp theo chữ là đủ. Hạng mục không khớp nhóm nào vẫn
 * hiện ở nhóm "Khác" — không bao giờ bị ẩn khỏi giao diện.
 */
const resolveRowCategory = (row: NailRow, tabs: string[]) => {
  const seeded = seededRowCategory[row.id];
  if (seeded && tabs.includes(seeded)) return seeded;
  const haystack = `${row.title} ${row.subtitle} ${row.details.map((item) => `${item.label} ${item.value}`).join(' ')}`.toLocaleLowerCase('vi');
  return tabs.find((tab) => haystack.includes(tab.toLocaleLowerCase('vi'))) || OTHER_TAB;
};

/**
 * Một nhóm nội dung: tên nhóm, mô tả ngắn, rồi tới các dòng cài đặt.
 * Bề mặt, viền, bo góc và shadow dùng cùng card pattern với trang Thanh toán.
 */
function SettingsSection({ title, description, action, children }: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-brand-outline bg-brand-surface">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3.5">
        <div className="min-w-0 max-w-2xl">
          <h3 className="ta-card-title">{title}</h3>
          {description && <p className="mt-0.5 text-caption leading-5 text-brand-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children && <div className="min-w-0 border-t border-brand-outline/70 px-4">{children}</div>}
    </section>
  );
}

/**
 * Một dòng cài đặt — khuôn dùng chung cho phương thức thanh toán, giờ chi nhánh
 * và cổng tích hợp: tên và mô tả ở trái, giá trị hoặc control ở phải.
 */
function SettingsRow({ title, description, warning = false, children }: {
  title: string;
  description?: string;
  /** Mô tả mang tính cảnh báo: thêm icon và đổi màu, không chỉ dựa vào màu (§5.2). */
  warning?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-body font-semibold text-brand-text">{title}</p>
        {description && (
          <p className={`mt-0.5 flex items-start gap-1.5 text-caption leading-5 ${warning ? 'text-brand-warning' : 'text-brand-text-muted'}`}>
            {warning && <AlertTriangle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />}
            {description}
          </p>
        )}
      </div>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">{children}</div>
    </div>
  );
}

/**
 * Dải cảnh báo của một nhóm.
 *
 * Dùng cùng khuôn banner trạng thái của trang Thanh toán để cảnh báo đủ rõ mà
 * vẫn giữ đúng nhịp card của toàn trang.
 */
function AttentionBanner({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-brand-tertiary/25 bg-brand-tertiary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 items-start gap-2.5">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
        <span className="min-w-0">
          <span className="block text-body font-medium text-brand-text">{title}</span>
          <span className="mt-0.5 block text-caption leading-5 text-brand-text-muted">{detail}</span>
        </span>
      </p>
      {action}
    </div>
  );
}

/**
 * Một hạng mục cấu hình — một dòng quét được trong một nhịp mắt.
 *
 * Trước đây dòng này đổ cả sáu cặp chi tiết của bản ghi ra ngoài, nên ba hạng
 * mục của nhóm Chính sách chiếm hơn một nghìn pixel tường chữ, và bấm "Chỉnh
 * sửa" lại mở hộp thoại hiện đúng những chi tiết vừa đọc. Nay dòng chỉ giữ thứ
 * cần để nhận ra và so sánh hạng mục — tên, trạng thái, giá trị đang áp dụng và
 * dấu vết cập nhật — còn chi tiết đầy đủ nằm trong hộp thoại vốn đã có.
 */
function ConfigRow({ row, valueLabel, categoryLabel, onOpen }: {
  row: NailRow;
  valueLabel: string;
  categoryLabel?: string;
  onOpen: () => void;
}) {
  const [currentValue, scope, updatedBy, updatedAt] = row.cells;
  const meta = [categoryLabel, scope, updatedBy && `Cập nhật bởi ${updatedBy}`, updatedAt].filter(Boolean) as string[];

  return (
    <article className="flex min-w-0 flex-col gap-3 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h4 className="text-body font-semibold text-brand-text">{row.title}</h4>
          <StatusBadge status={toneStatusKey[row.badgeTone]} label={row.badge} size="small" />
        </div>
        <p className="mt-0.5 text-caption leading-5 text-brand-text-muted">{row.subtitle}</p>
        {meta.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-brand-text-muted">
            {meta.map((item, index) => (
              <span key={item} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden="true">·</span>}
                <span className="tabular-nums">{item}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 lg:justify-end">
        {currentValue && (
          <p className="min-w-0 lg:max-w-72 lg:text-right">
            <span className="block text-caption text-brand-text-muted">{valueLabel}</span>
            <span className="mt-0.5 block text-body font-semibold leading-5 text-brand-text">{currentValue}</span>
          </p>
        )}
        <Button size="small" variant="secondary" iconLeading={<Pencil />} onClick={onOpen}>
          Chỉnh sửa
        </Button>
      </div>
    </article>
  );
}

/** Trạng thái rỗng của một nhóm — luôn kèm một hành động để đi tiếp (§20.2). */
function EmptyCategory({ title, description, action, inset = false }: {
  title: string;
  description: string;
  action?: ReactNode;
  /**
   * Khối này đã nằm trong một card rồi.
   *
   * Khi đó bỏ viền và nền riêng: một hộp gạch đứt bên trong một hộp viền liền,
   * chỉ để nói "chưa có gì", là hai lớp khung cho không nội dung nào.
   */
  inset?: boolean;
}) {
  return (
    <div
      className={
        inset
          ? 'flex flex-col items-start gap-2 py-4'
          : 'flex flex-col items-start gap-2 rounded-xl border border-dashed border-brand-outline bg-brand-surface p-5'
      }
    >
      <p className="text-body font-medium text-brand-text">{title}</p>
      <p className="max-w-xl text-body leading-6 text-brand-text-muted">{description}</p>
      {action && <span className="mt-2">{action}</span>}
    </div>
  );
}

/**
 * Đầu cột nội dung: đang đứng ở nhóm nào và nhóm đó lo việc gì.
 *
 * Không lặp lại icon của nhóm — icon đã nằm ngay cạnh mục đang chọn trên thanh
 * điều hướng trái, thêm một hộp icon nữa ở đây chỉ dựng thêm một tầng tiêu đề.
 */
function SettingsPageHeader({ title, description, summary }: {
  title: string;
  description: string;
  summary: string;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-2 border-b border-brand-outline pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 className="ta-section-title">{title}</h2>
        <p className="mt-1 max-w-2xl text-body leading-6 text-brand-text-muted">{description}</p>
      </div>
      <span className="w-fit shrink-0 rounded-full bg-brand-surface-high px-2.5 py-1 text-caption font-semibold text-brand-text-muted">
        {summary}
      </span>
    </header>
  );
}

function RecommendationItem({ title, description, icon: Icon, actionLabel, onAction }: {
  title: string;
  description: string;
  icon: typeof Store;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-surface-high text-brand-text-muted">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-brand-text">{title}</span>
        <span className="mt-0.5 block text-caption leading-5 text-brand-text-muted">{description}</span>
      </span>
      {actionLabel && (
        <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-[var(--accent-strong)]">
          {actionLabel}<ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  return onAction ? (
    <button type="button" onClick={onAction} className="flex h-auto w-full items-center gap-3 rounded-control border-0 bg-transparent px-3 py-2.5 text-left shadow-none transition-colors hover:bg-brand-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 px-3 py-2.5">{content}</div>
  );
}

export default function TenantAdminSettings({
  config,
  rows,
  searchQuery,
  activeTab,
  onSearch,
  onTab,
  scopeLabel,
  tenantName,
  onCreate,
  onExport,
  selectedRow,
  onSelectRow,
  onEditSelected,
  onConfirmSelected,
  formOpen,
  formValues,
  onFormChange,
  onFormClose,
  onFormSubmit,
  brandInfo,
  onBrandInfoChange,
  onBrandInfoSubmit,
  paymentSettings,
  onPaymentMethodToggle,
  onRefundApprovalChange,
  branchRows = [],
  onNavigateToBranches,
  readOnlyReason = '',
  demoMode = false,
  sessionAccount,
  onLogout,
  formFields,
  formTitle
}: TenantAdminSettingsProps) {
  const configTabs = config.tabs;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [savedBrandSignature, setSavedBrandSignature] = useState(() => JSON.stringify(brandInfo));
  const [isSaving, setIsSaving] = useState(false);

  /** Hạng mục được gắn nhóm một lần, dùng lại cho sidebar, nội dung và tìm kiếm. */
  const categorizedRows = useMemo(
    () => rows.map((row) => ({ row, category: resolveRowCategory(row, configTabs) })),
    [configTabs, rows]
  );

  const hasOtherRows = categorizedRows.some((item) => item.category === OTHER_TAB);
  /** Nhóm "Khác" chỉ xuất hiện khi thật sự có hạng mục chưa thuộc nhóm nào. */
  const availableTabs = useMemo(
    () => (hasOtherRows ? [...configTabs, OTHER_TAB] : configTabs),
    [configTabs, hasOtherRows]
  );
  const activeGroup = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];
  const activeMeta = getCategoryMeta(activeGroup);
  const isBrandTab = activeGroup === BRAND_TAB;
  const isPaymentTab = activeGroup === PAYMENT_TAB;
  const isHoursTab = activeGroup === HOURS_TAB;
  const isIntegrationTab = activeGroup === INTEGRATION_TAB;
  const isSecurityTab = activeGroup === SECURITY_TAB;

  /**
   * Danh sách cổng thanh toán đến từ dữ liệu mẫu trong `nailAdminData`, không
   * phải từ cấu hình thật của tenant. Ở chế độ dữ liệu thật, tenant chưa nối
   * cổng nào thì nhóm Thanh toán và Tích hợp phải hiện trạng thái trống chứ
   * không phải hiện một tài khoản ngân hàng và một máy POS không tồn tại.
   */
  const paymentMethods = demoMode ? paymentSettings.methods : [];
  const enabledMethodCount = paymentMethods.filter((method) => method.enabled).length;
  const attentionMethods = paymentMethods.filter((method) => method.needsAttention);
  const categoryRows = categorizedRows.filter((item) => item.category === activeGroup).map((item) => item.row);
  const brandSignature = JSON.stringify(brandInfo);
  const brandIsDirty = brandSignature !== savedBrandSignature;

  useEffect(() => {
    if (!brandIsDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [brandIsDirty]);

  const handleBrandSave = (event: FormEvent) => {
    event.preventDefault();
    if (!brandIsDirty || isSaving) return;
    if (readOnlyReason) {
      onBrandInfoSubmit(event);
      return;
    }
    const submittedSignature = brandSignature;
    setIsSaving(true);
    onBrandInfoSubmit(event);
    window.setTimeout(() => {
      setSavedBrandSignature(submittedSignature);
      setIsSaving(false);
    }, 650);
  };

  /**
   * Bỏ mọi thay đổi chưa lưu của biểu mẫu Thông tin tiệm.
   *
   * Bản đã lưu gần nhất vốn đã được giữ dưới dạng chuỗi để so sánh dirty, nên
   * hoàn tác chỉ là đọc lại chuỗi đó và ghi ngược từng trường khác biệt — không
   * cần thêm state hay thêm prop nào từ portal.
   */
  const handleBrandRevert = () => {
    let saved: BrandInfo;
    try {
      saved = JSON.parse(savedBrandSignature) as BrandInfo;
    } catch {
      return;
    }
    (Object.keys(saved) as Array<keyof BrandInfo>).forEach((key) => {
      if (saved[key] !== brandInfo[key]) onBrandInfoChange(key, String(saved[key]));
    });
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onBrandInfoChange('logoUrl', reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /** Đếm hạng mục theo nhóm để sidebar cho biết nhóm nào có nội dung. */
  const rowCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    categorizedRows.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + 1; });
    return counts;
  }, [categorizedRows]);

  /** Nhóm cần chú ý — hiện dấu cảnh báo trên sidebar thay vì giấu trong bảng. */
  const attentionCategories = useMemo(() => {
    const set = new Set<string>();
    if (attentionMethods.length) {
      set.add(PAYMENT_TAB);
      if (configTabs.includes(INTEGRATION_TAB)) set.add(INTEGRATION_TAB);
    }
    categorizedRows.forEach((item) => {
      if (attentionTones.has(item.row.badgeTone)) set.add(item.category);
    });
    return set;
  }, [attentionMethods.length, categorizedRows, configTabs]);

  // Tìm kiếm áp dụng cho toàn bộ hạng mục, không chỉ nhóm đang mở — người dùng
  // gõ từ khóa là để tìm cấu hình, không phải để lọc trong đúng một nhóm.
  const query = searchQuery.trim().toLocaleLowerCase('vi');
  const searchResults = useMemo(() => {
    if (!query) return [];
    return categorizedRows.filter(({ row }) => {
      const haystack = `${row.id} ${row.title} ${row.subtitle} ${row.cells.join(' ')} ${row.badge} ${row.details.map((item) => `${item.label} ${item.value}`).join(' ')}`.toLocaleLowerCase('vi');
      return haystack.includes(query);
    });
  }, [categorizedRows, query]);

  const adminStat = config.stats.find((stat) => stat.label.toLocaleLowerCase('vi').includes('tài khoản'));

  const groupedTabs = useMemo(() => groupOrder
    .map((group) => ({ group, tabs: availableTabs.filter((tab) => getCategoryMeta(tab).group === group) }))
    .filter((item) => item.tabs.length > 0), [availableTabs]);

  const detailStatus = selectedRow ? toneStatusKey[selectedRow.badgeTone] : 'INACTIVE';
  const valueColumnLabel = config.columns[1] || 'Cấu hình hiện tại';
  // Khi sửa một hạng mục, portal gửi xuống bộ ô dựng từ chính bản ghi đó; khi
  // thêm mới thì dùng khuôn chung của module.
  const activeFormFields = formFields ?? config.formFields;
  const activeFormTitle = formTitle ?? config.formTitle;
  /**
   * Số liệu nền của tenant, hiện thành một dòng chữ trong thanh công cụ.
   *
   * Đây là thông tin để biết mình đang cấu hình cho phạm vi nào — không phải chỉ
   * số điều hành, nên không dựng thành thẻ KPI. Mục nào chưa có dữ liệu thật thì
   * bị bỏ khỏi dòng thay vì hiện một dấu gạch ngang không nói lên điều gì.
   */
  const tenantFacts = [
    { label: 'chi nhánh', value: String(branchRows.length) },
    demoMode && adminStat?.value ? { label: 'quản trị viên', value: adminStat.value } : null,
    paymentMethods.length
      ? { label: 'cổng thanh toán', value: `${enabledMethodCount}/${paymentMethods.length}` }
      : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  /**
   * Việc cần chủ tiệm xử lý, gom từ mọi nhóm về đầu trang.
   *
   * Mỗi việc phải nói được ba thứ: chuyện gì, hệ quả ra sao, và bấm vào đâu để
   * sửa. Một con số "Cảnh báo: 3" không nói được thứ nào trong ba thứ đó.
   */
  const pendingTasks = [
    readOnlyReason
      ? { key: 'read-only', title: 'Cấu hình đang ở chế độ chỉ xem', detail: readOnlyReason, actionLabel: undefined, onAction: undefined }
      : null,
    ...attentionMethods.map((method) => ({
      key: `method-${method.key}`,
      title: `${method.label} cần xác thực lại`,
      detail: `${method.detail} · Cổng này sẽ không nhận thanh toán cho đến khi được xác thực.`,
      actionLabel: activeGroup === PAYMENT_TAB ? undefined : 'Mở nhóm Thanh toán',
      onAction: activeGroup === PAYMENT_TAB ? undefined : () => onTab(PAYMENT_TAB)
    }))
  ].filter(Boolean) as Array<{
    key: string;
    title: string;
    detail: string;
    actionLabel?: string;
    onAction?: () => void;
  }>;

  /**
   * Khuyến nghị của ĐÚNG nhóm đang mở.
   *
   * Trước đây cả 8 nhóm cùng đọc một mảng `config.checklist`, nên nhóm Bảo mật
   * hiện "Cập nhật giờ lễ 02/09" và "Tải xuống bản sao lưu tháng 7" — việc của
   * nhóm khác, và sao lưu vốn thuộc Superadmin chứ không thuộc tenant. Nay mỗi
   * nhóm khai khuyến nghị riêng trong dữ liệu, còn `target` được ánh xạ sang
   * đúng nhóm hoặc đúng trang mà người dùng cần tới.
   */
  const recommendationTargets: Record<SettingsRecommendationTarget, { icon: typeof Store; go?: () => void }> = {
    brand: { icon: Store, go: () => onTab(BRAND_TAB) },
    hours: { icon: Clock3, go: () => onTab(HOURS_TAB) },
    policy: { icon: ScrollText, go: () => onTab('Chính sách') },
    payment: { icon: CreditCard, go: () => onTab(PAYMENT_TAB) },
    notify: { icon: Bell, go: () => onTab('Thông báo') },
    access: { icon: UserCog, go: () => onTab('Phân quyền') },
    integration: { icon: Plug, go: () => onTab(INTEGRATION_TAB) },
    security: { icon: Lock, go: () => onTab(SECURITY_TAB) },
    branches: { icon: Building2, go: onNavigateToBranches }
  };

  const recommendations = (config.settingsRecommendations?.[activeGroup] || []).map((item) => {
    const target = item.target ? recommendationTargets[item.target] : undefined;
    return {
      title: item.title,
      description: item.description,
      icon: target?.icon || History,
      // Chỉ hiện nút khi thật sự có nơi để đi tới, để không có nút chết.
      actionLabel: target?.go ? item.actionLabel || 'Mở' : undefined,
      onAction: target?.go
    };
  });

  const contentSummary = isBrandTab
    ? `Áp dụng cho toàn bộ ${tenantName}`
    : isPaymentTab
      ? paymentMethods.length ? `${enabledMethodCount}/${paymentMethods.length} phương thức đang bật` : 'Chưa kết nối cổng nào'
      : isHoursTab
        ? branchRows.length ? `${branchRows.length} chi nhánh` : 'Chưa có chi nhánh'
        : isIntegrationTab
          ? paymentMethods.length ? `${paymentMethods.length} cổng thanh toán` : 'Chưa có kết nối'
          : isSecurityTab
            ? `${categoryRows.length} chính sách`
            : `${categoryRows.length} hạng mục`;

  /** Danh sách hạng mục của nhóm đang mở — dùng lại ở cuối mọi nhánh nội dung. */
  const categoryRowList = categoryRows.length > 0 && (
    <section className={`min-w-0 rounded-xl border border-brand-outline bg-brand-surface px-4 ${rowList}`}>
      {categoryRows.map((row) => (
        <ConfigRow key={row.id} row={row} valueLabel={valueColumnLabel} onOpen={() => onSelectRow(row)} />
      ))}
    </section>
  );

  /** Nội dung của nhóm đang mở, hoặc kết quả tìm kiếm khi có từ khóa. */
  let groupBody: ReactNode;

  if (query) {
    groupBody = searchResults.length ? (
      <div className={sectionStack}>
        <section className="min-w-0 rounded-xl border border-brand-outline bg-brand-surface p-4">
          <p role="status" className="text-body text-brand-text-muted">
            <span className="font-semibold tabular-nums text-brand-text">{searchResults.length}</span> hạng mục khớp “{searchQuery.trim()}” trong toàn bộ cài đặt.
          </p>
          <div className={`mt-3 ${rowList}`}>
            {searchResults.map(({ row, category }) => (
              <ConfigRow
                key={row.id}
                row={row}
                valueLabel={valueColumnLabel}
                categoryLabel={category}
                onOpen={() => onSelectRow(row)}
              />
            ))}
          </div>
        </section>
      </div>
    ) : (
      <EmptyCategory
        title="Không tìm thấy hạng mục phù hợp"
        description="Thử từ khóa khác, hoặc xóa tìm kiếm để quay lại nhóm cấu hình đang mở."
        action={<Button size="small" variant="secondary" onClick={() => onSearch('')}>Xóa tìm kiếm</Button>}
      />
    );
  } else if (isBrandTab) {
    groupBody = (
      <div className={sectionStack}>
        <SettingsSection
          title="Nhận diện thương hiệu"
          description="Tên và logo hiển thị cho khách khi đặt lịch, trên hóa đơn và trong tin nhắn."
        >
          {/* Logo đứng cạnh hai ô tên chứ không chiếm trọn một hàng phía trên: nó
              là một ô vuông nhỏ, để nó ăn hết chiều ngang chỉ đẩy mọi ô nhập
              xuống dưới nếp gấp. */}
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:gap-6">
            <Field
              label="Logo"
              className="sm:w-56 sm:shrink-0"
              helper="PNG, JPG hoặc WebP, vuông tối thiểu 256×256px."
            >
              <div className="flex items-center gap-3 rounded-control border border-dashed border-brand-outline bg-brand-surface-high/40 p-3">
                {brandInfo.logoUrl ? (
                  <img
                    src={brandInfo.logoUrl}
                    alt={`Logo ${brandInfo.displayName}`}
                    className="h-14 w-14 shrink-0 rounded-control border border-brand-outline bg-brand-surface object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  >
                    <ImagePlus className="h-6 w-6" />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="sr-only" />
                  <Button size="small" variant="secondary" iconLeading={<Upload />} onClick={() => logoInputRef.current?.click()}>
                    Tải lên
                  </Button>
                  {brandInfo.logoUrl && (
                    <Button size="small" variant="ghost" onClick={() => onBrandInfoChange('logoUrl', '')}>
                      Xóa logo
                    </Button>
                  )}
                </div>
              </div>
            </Field>

            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
              <Field label="Tên hiển thị thương hiệu">
                <input
                  type="text"
                  required
                  value={brandInfo.displayName}
                  onChange={(event) => onBrandInfoChange('displayName', event.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Tên pháp lý">
                <input
                  type="text"
                  value={brandInfo.legalName}
                  onChange={(event) => onBrandInfoChange('legalName', event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Liên hệ"
          description="Kênh khách và hệ thống dùng để liên lạc với tiệm."
        >
          <div className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
            <Field label="Hotline">
              <input
                type="tel"
                value={brandInfo.hotline}
                onChange={(event) => onBrandInfoChange('hotline', event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Email liên hệ">
              <input
                type="email"
                value={brandInfo.email}
                onChange={(event) => onBrandInfoChange('email', event.target.value)}
                className={inputClass}
              />
            </Field>

          </div>
        </SettingsSection>

        <SettingsSection
          title="Địa chỉ & hiện diện trực tuyến"
          description="Thông tin dùng trên hóa đơn, trang đặt lịch và kênh liên hệ công khai."
        >
          <div className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
            <Field label="Website">
              <input
                type="text"
                value={brandInfo.website}
                onChange={(event) => onBrandInfoChange('website', event.target.value)}
                placeholder="ten-mien.vn"
                className={inputClass}
              />
            </Field>

            <Field label="Địa chỉ" className="sm:col-span-2">
              <textarea
                value={brandInfo.address}
                onChange={(event) => onBrandInfoChange('address', event.target.value)}
                rows={2}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                className="w-full resize-y rounded-control border border-brand-outline bg-brand-surface-high/40 px-3 py-2.5 text-body leading-6 text-brand-text outline-none transition focus:border-[var(--accent)] focus:bg-brand-surface focus:ring-4 focus:ring-[var(--accent-focus)]"
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Khu vực & ngôn ngữ"
          description="Múi giờ dùng cho lịch hẹn, báo cáo và ngôn ngữ mặc định của giao diện."
        >
          <div className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6 xl:grid-cols-3">
            <Field label="Múi giờ">
              <BeautifulSelect
                value={brandInfo.timezone}
                onChange={(event) => onBrandInfoChange('timezone', event.target.value)}
                className="w-full"
              >
                {TIMEZONE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </BeautifulSelect>
            </Field>

            <Field label="Tiền tệ mặc định">
              <BeautifulSelect
                value={brandInfo.currency}
                onChange={(event) => onBrandInfoChange('currency', event.target.value as BrandInfo['currency'])}
                className="w-full"
              >
                <option value="VND">VND — Việt Nam đồng</option>
                <option value="USD">USD — Đô la Mỹ</option>
              </BeautifulSelect>
            </Field>

            <Field label="Ngôn ngữ mặc định">
              <BeautifulSelect
                value={brandInfo.language}
                onChange={(event) => onBrandInfoChange('language', event.target.value)}
                className="w-full"
              >
                {LANGUAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </BeautifulSelect>
            </Field>
          </div>
        </SettingsSection>

        {categoryRowList}
      </div>
    );
  } else if (isPaymentTab) {
    groupBody = (
      <div className={sectionStack}>
        <SettingsSection
          title="Phương thức thanh toán"
          description="Bật hoặc tắt phương thức khách có thể dùng khi thanh toán. Thay đổi có hiệu lực ngay."
          action={(
            <span className="text-caption tabular-nums text-brand-text-muted">
              {enabledMethodCount}/{paymentMethods.length} đang bật
            </span>
          )}
        >
          {!paymentMethods.length && (
            <EmptyCategory
              inset
              title="Chưa kết nối cổng thanh toán nào"
              description="Kết nối cổng thanh toán trong nhóm Tích hợp, sau đó bật phương thức khách được dùng tại quầy ở đây."
              action={<Button size="small" variant="secondary" iconTrailing={<ArrowUpRight />} onClick={() => onTab(INTEGRATION_TAB)}>Mở nhóm Tích hợp</Button>}
            />
          )}
          <div className={rowList}>
            {paymentMethods.map((method) => {
              // Cổng chưa xác thực không thể bật; lý do luôn hiển thị bằng chữ (§10.3).
              const blocked = Boolean(method.needsAttention) && !method.enabled;
              return (
                <SettingsRow
                  key={method.key}
                  title={method.label}
                  description={method.detail}
                  warning={Boolean(method.needsAttention)}
                >
                  {/* Công tắc đã nói lên bật/tắt, nên trạng thái ở đây chỉ là chữ
                      thay vì một badge có nền màu đứng ngay cạnh nó. */}
                  <span className={`text-caption ${method.needsAttention && !method.enabled ? 'text-brand-warning' : 'text-brand-text-muted'}`}>
                    {method.enabled ? 'Đang bật' : method.needsAttention ? 'Cần xác thực' : 'Đã tắt'}
                  </span>
                  <Switch
                    checked={method.enabled}
                    onChange={(checked) => onPaymentMethodToggle(method.key, checked)}
                    label={`Bật ${method.label}`}
                    labelHidden
                    disabled={blocked}
                  />
                </SettingsRow>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Chính sách hoàn tiền"
          description="Cấp thấp nhất được duyệt yêu cầu hoàn tiền cho khách."
        >
          <Field label="Cấp duyệt hoàn tiền" className="max-w-md py-4">
            <BeautifulSelect
              value={paymentSettings.refundApproval}
              onChange={(event) => onRefundApprovalChange(event.target.value)}
              className="w-full"
            >
              {REFUND_APPROVAL_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </BeautifulSelect>
          </Field>
        </SettingsSection>

        {categoryRowList}
      </div>
    );
  } else if (isHoursTab) {
    groupBody = (
      <div className={sectionStack}>
        {branchRows.length ? (
          <SettingsSection
            title="Giờ mở cửa theo chi nhánh"
            description="Khung giờ đang áp dụng khi khách đặt lịch. Giờ mở cửa thuộc hồ sơ chi nhánh nên được sửa ở trang Chi nhánh."
            action={onNavigateToBranches && (
              <Button size="small" variant="secondary" iconTrailing={<ArrowUpRight />} onClick={onNavigateToBranches}>
                Mở trang Chi nhánh
              </Button>
            )}
          >
            <div className={rowList}>
              {branchRows.map((branch) => (
                <SettingsRow key={branch.id} title={branch.title} description={branch.subtitle}>
                  <span className="text-body font-semibold tabular-nums text-brand-text">{branch.cells[0]}</span>
                  <StatusBadge status={toneStatusKey[branch.badgeTone]} label={branch.badge} size="small" />
                </SettingsRow>
              ))}
            </div>
          </SettingsSection>
        ) : (
          <EmptyCategory
            title="Chưa có chi nhánh để lấy giờ hoạt động"
            description="Giờ mở cửa được lưu theo từng chi nhánh. Thêm chi nhánh ở trang Chi nhánh, giờ hoạt động sẽ hiện tại đây."
            action={onNavigateToBranches && (
              <Button size="small" variant="secondary" iconTrailing={<ArrowUpRight />} onClick={onNavigateToBranches}>
                Mở trang Chi nhánh
              </Button>
            )}
          />
        )}

        {categoryRowList}
      </div>
    );
  } else if (isIntegrationTab) {
    groupBody = (
      <div className={sectionStack}>
        {/* Chỉ số kết nối là dữ liệu mẫu, nên chỉ hiện ở chế độ dữ liệu mẫu. */}
        {demoMode && <SettingsSection
          title={config.insightTitle}
          description="Tình trạng đồng bộ của các kênh và cổng đang nối với tenant."
        >
          {/* Giá trị ở đây là số đo, không phải trạng thái bản ghi — nên không
              dùng StatusBadge. Mục cần chú ý được đánh dấu bằng cả icon lẫn màu
              để không phụ thuộc màu (§5.2). */}
          <dl className="grid gap-x-8 gap-y-4 py-4 sm:grid-cols-3">
            {config.insights.map((insight) => {
              const needsAttention = attentionTones.has(insight.tone);
              return (
                <div key={insight.label} className="min-w-0">
                  <dt className="text-caption text-brand-text-muted">{insight.label}</dt>
                  <dd className="mt-1">
                    <span className="block text-body-lg font-semibold tabular-nums text-brand-text">{insight.value}</span>
                    <span className={`mt-0.5 flex items-start gap-1.5 text-caption leading-5 ${needsAttention ? 'text-brand-warning' : 'text-brand-text-muted'}`}>
                      {needsAttention && <AlertTriangle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />}
                      {insight.detail}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </SettingsSection>}

        <SettingsSection
          title="Cổng thanh toán đã kết nối"
          description="Trạng thái từng cổng. Bật hoặc tắt được thực hiện ở nhóm Thanh toán."
          action={paymentMethods.length ? (
            <Button size="small" variant="ghost" iconTrailing={<ChevronRight />} onClick={() => onTab(PAYMENT_TAB)}>
              Nhóm Thanh toán
            </Button>
          ) : undefined}
        >
          {!paymentMethods.length && (
            <EmptyCategory
              inset
              title="Chưa có cổng thanh toán nào được kết nối"
              description="Khi tenant kết nối cổng thanh toán, trạng thái từng cổng sẽ hiện tại đây để bạn theo dõi."
            />
          )}
          <div className={rowList}>
            {paymentMethods.map((method) => (
              <SettingsRow
                key={method.key}
                title={method.label}
                description={method.detail}
                warning={Boolean(method.needsAttention)}
              >
                <span className={`text-caption ${method.needsAttention && !method.enabled ? 'text-brand-warning' : 'text-brand-text-muted'}`}>
                  {method.enabled ? 'Đang kết nối' : method.needsAttention ? 'Cần xác thực' : 'Đã tắt'}
                </span>
              </SettingsRow>
            ))}
          </div>
        </SettingsSection>

        {categoryRowList}
      </div>
    );
  } else if (isSecurityTab) {
    // Nhóm Bảo mật chỉ nói về tài khoản và đăng nhập. Trước đây nó mượn chi tiết
    // của hạng mục "Vai trò & phân quyền" nên nội dung vừa trùng nhóm Phân quyền
    // vừa thiếu những thứ thật sự thuộc bảo mật. Nay nhóm có hạng mục riêng
    // (SET-SECURITY-*) và một mục phiên đăng nhập dùng dữ liệu đăng nhập thật.
    groupBody = (
      <div className={sectionStack}>
        <SettingsSection
          title="Phiên đăng nhập hiện tại"
          description="Thiết bị bạn đang dùng để quản trị tenant. Đăng xuất tại đây kết thúc ngay phiên này."
        >
          <div className={rowList}>
            <SettingsRow
              title={sessionAccount?.displayName || 'Tài khoản quản trị'}
              description={sessionAccount?.email || 'Không đọc được thông tin tài khoản của phiên hiện tại.'}
            >
              <StatusBadge status="ACTIVE" label="Đang hoạt động" size="small" />
              {onLogout && (
                <Button size="small" variant="secondary" onClick={onLogout}>
                  Đăng xuất
                </Button>
              )}
            </SettingsRow>
          </div>
          {/* Nói thẳng vì sao chưa liệt kê được thiết bị khác, thay vì bịa một
              danh sách thiết bị không có thật. */}
          <p className="mt-3 text-caption leading-5 text-brand-text-muted">
            Hệ thống hiện chỉ đọc được phiên trên trình duyệt này. Danh sách thiết bị khác và lịch sử truy cập
            theo tài khoản chưa được máy chủ cung cấp, nên chưa hiển thị ở đây.
          </p>
        </SettingsSection>

        {categoryRows.length > 0 ? (
          <SettingsSection
            title="Chính sách bảo mật"
            description="Quy tắc áp dụng cho mọi tài khoản quản trị thuộc tenant."
          >
            <div className={rowList}>
              {categoryRows.map((row) => (
                <SettingsRow key={row.id} title={row.title} description={row.subtitle}>
                  <span className="hidden text-caption text-brand-text-muted sm:inline">{row.cells[0]}</span>
                  <StatusBadge status={toneStatusKey[row.badgeTone]} label={row.badge} size="small" />
                  <Button size="small" variant="secondary" iconLeading={<Pencil />} onClick={() => onSelectRow(row)}>
                    Chỉnh sửa
                  </Button>
                </SettingsRow>
              ))}
            </div>
          </SettingsSection>
        ) : (
          <EmptyCategory
            title="Chưa thiết lập chính sách bảo mật"
            description="Thêm chính sách xác thực hai lớp, độ mạnh mật khẩu, thời hạn phiên đăng nhập và nhật ký truy cập cho tài khoản quản trị của tenant."
            action={<Button size="small" variant="primary" iconLeading={<Save />} onClick={onCreate}>{config.primaryAction}</Button>}
          />
        )}

        <SettingsSection
          title="Cảnh báo bảo mật"
          description="Đăng nhập bất thường và các sự kiện cần bạn xem lại."
        >
          <EmptyCategory
            inset
            title="Không có cảnh báo bảo mật"
            description="Chưa ghi nhận đăng nhập bất thường hoặc chuỗi đăng nhập sai nào cho tài khoản quản trị của tenant."
          />
        </SettingsSection>
      </div>
    );
  } else if (categoryRows.length) {
    groupBody = <div className={sectionStack}>{categoryRowList}</div>;
  } else {
    groupBody = (
      <EmptyCategory
        title={`Chưa có hạng mục trong nhóm ${activeGroup}`}
        description="Tạo hạng mục cấu hình cho nhóm này, hoặc dùng ô tìm kiếm để xem cấu hình ở nhóm khác."
        action={<Button size="small" variant="primary" iconLeading={<Save />} onClick={onCreate}>{config.primaryAction}</Button>}
      />
    );
  }

  /** Đầu cột nội dung: đang đứng ở nhóm nào và nhóm đó lo việc gì. */
  const groupHeader = (
    <SettingsPageHeader
      title={activeGroup}
      description={activeMeta.description}
      summary={contentSummary}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Đầu trang dùng khuôn chung của cổng Tenant Admin (README §8.2). */}
      <PageHeader
        title={config.title}
        actions={(
          <Button variant="secondary" onClick={onExport} iconLeading={<History />}>
            Nhật ký cấu hình
          </Button>
        )}
      />

      {/* Cụm điều khiển: tìm kiếm, phạm vi dữ liệu và vài số liệu nền của tenant
          nằm chung một thanh, đúng khuôn toolbar của trang Báo cáo.

          Năm thẻ KPI trước đây đứng ở đây đã được gộp vào dòng số liệu bên phải:
          "2 chi nhánh" hay "6 tài khoản quản trị" là số tham chiếu để biết mình
          đang cấu hình cho phạm vi nào, không phải chỉ số cần theo dõi hằng ngày
          — chúng không đáng chiếm 161px đầu trang, và bốn trong năm thẻ còn tô
          màu Tailwind rời rạc thay vì token của hệ thống. */}
      <section className="rounded-card border border-brand-outline bg-brand-surface shadow-card">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.75] text-brand-text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Tìm cài đặt..."
                aria-label="Tìm hạng mục cấu hình trong toàn bộ cài đặt"
                className={`${inputClass} pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearch('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control border-0 bg-transparent p-0 text-brand-text-muted shadow-none transition hover:bg-brand-surface-high hover:text-brand-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <X aria-hidden="true" className="h-4 w-4 stroke-[1.75]" />
                </button>
              )}
            </div>

            {/* Chi nhánh do topbar điều khiển; hiện lại ở đây để phạm vi cấu hình
                nằm gọn cùng chỗ với ô tìm kiếm, giống chip phạm vi ở trang Báo cáo. */}
            <span
              title="Phạm vi chi nhánh được chọn ở thanh trên cùng"
              className="flex h-[var(--size-control)] shrink-0 items-center gap-1.5 rounded-control border border-brand-outline bg-brand-surface-lowest px-3 text-body text-brand-text-muted"
            >
              <Building2 aria-hidden="true" className="h-4 w-4" />
              <span>Phạm vi:</span>
              <strong className="font-semibold text-brand-text">{scopeLabel}</strong>
            </span>
          </div>

          {/* Một câu, không phải danh sách định nghĩa: nhãn đã nằm ngay sau con số
              nên thêm <dt> ẩn chỉ khiến trình đọc màn hình đọc nhãn hai lần. */}
          {/* Trên điện thoại, dòng số liệu này bị đẩy xuống thành ba dòng riêng mà
              không giúp gì cho thao tác đang làm — số hạng mục của từng nhóm đã
              có sẵn ở danh sách nhóm. Ẩn đi để phần điều khiển lên trước. */}
          <p className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-brand-text-muted sm:flex">
            {tenantFacts.map((fact, index) => (
              <span key={fact.label} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden="true">·</span>}
                <span>
                  <strong className="font-semibold tabular-nums text-brand-text">{fact.value}</strong> {fact.label}
                </span>
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Việc cần xử lý — chỉ hiện khi thật sự có việc.

          Thẻ "Cảnh báo: 3" trước đây chỉ nói ra một con số rồi để chủ tiệm tự đi
          tìm ba việc đó nằm ở nhóm nào. Nay mỗi việc là một dòng nói rõ chuyện gì
          và có nút đi thẳng tới đúng nhóm cần sửa. Khi không có việc nào thì khối
          này biến mất thay vì chiếm chỗ để báo "mọi thứ đều ổn". */}
      {pendingTasks.length > 0 && (
        <section aria-label="Việc cần xử lý" className="flex flex-col gap-2">
          {pendingTasks.map((task) => (
            <AttentionBanner
              key={task.key}
              title={task.title}
              detail={task.detail}
              action={task.actionLabel && task.onAction && (
                <Button size="small" variant="secondary" onClick={task.onAction}>
                  {task.actionLabel}
                </Button>
              )}
            />
          ))}
        </section>
      )}

      <section className="min-w-0 lg:hidden" aria-labelledby="tenant-settings-mobile-navigation-label">
        <p id="tenant-settings-mobile-navigation-label" className="mb-1.5 text-caption font-semibold text-brand-text-muted">
          Danh mục cài đặt
        </p>
        <BeautifulSelect
          value={activeGroup}
          onChange={(event) => onTab(event.target.value)}
          aria-label="Danh mục cài đặt"
          className={`${inputClass} font-semibold`}
        >
          {groupedTabs.map(({ group, tabs }) => (
            <optgroup key={group} label={group}>
              {tabs.map((tab) => <option key={tab} value={tab}>{tab}</option>)}
            </optgroup>
          ))}
        </BeautifulSelect>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        {/* Cột trái: ô tìm kiếm rồi danh sách nhóm. `top` bằng chiều cao topbar
            dính (68px) cộng 16px, nếu không phần đầu cột sẽ trượt xuống dưới
            topbar khi cuộn. */}
        {/* Cột trái chỉ làm một việc: điều hướng giữa các nhóm. Ô tìm kiếm đã
            chuyển lên thanh công cụ vì nó tìm trong TOÀN BỘ cài đặt, không phải
            lọc trong nhóm đang mở — đặt nó ngay trên danh sách nhóm khiến hai
            việc khác nhau trông như một. `top` bằng chiều cao topbar dính (68px)
            cộng 16px, nếu không phần đầu cột sẽ trượt xuống dưới topbar khi cuộn. */}
        <aside className="hidden min-w-0 lg:sticky lg:top-[84px] lg:block">
            <nav
              aria-label="Nhóm cấu hình"
              className="flex min-w-0 flex-col gap-4"
            >
              {groupedTabs.map(({ group, tabs }) => (
                <div key={group} className="min-w-0">
                  <p className="mb-1.5 px-2 text-caption font-semibold uppercase tracking-wide text-brand-text-muted">{group}</p>
                  <ul className="flex min-w-0 flex-col gap-1">
                  {tabs.map((tab) => {
                    const active = tab === activeGroup;
                    const { icon: Icon } = getCategoryMeta(tab);
                    const count = rowCountByCategory[tab] || 0;
                    const needsAttention = attentionCategories.has(tab);
                    return (
                      <li key={tab} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onTab(tab)}
                          aria-current={active ? 'page' : undefined}
                          className={`relative flex min-h-[var(--size-control)] w-full min-w-0 items-center gap-2.5 rounded-control border-0 px-2.5 text-left text-body font-semibold shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                            active
                              ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                              : 'bg-transparent text-brand-text-muted hover:bg-brand-surface-high/70 hover:text-brand-text'
                          }`}
                        >
                          {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--accent)]" />}
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[1.75]" />
                          <span className="min-w-0 flex-1 truncate">{tab}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-1.5">
                            {needsAttention && (
                              <span title="Có hạng mục cần chú ý" className="flex items-center text-brand-warning">
                                <AlertTriangle aria-hidden="true" className="h-4 w-4 stroke-[1.75]" />
                                <span className="sr-only">Có hạng mục cần chú ý</span>
                              </span>
                            )}
                            {count > 0 && (
                              <span className="min-w-5 rounded-full bg-brand-surface-high px-1.5 py-0.5 text-center text-caption font-semibold tabular-nums text-brand-text-muted">{count}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  </ul>
                </div>
              ))}
            </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          {isBrandTab && !query ? (
            <form id={BRAND_FORM_ID} onSubmit={handleBrandSave} className="flex min-w-0 flex-col gap-4">
              {groupHeader}
              {groupBody}
            </form>
          ) : (
            <>
              {groupHeader}
              {groupBody}
            </>
          )}

          {/* Khuyến nghị của đúng nhóm đang mở. Nhóm nào chưa khai thì không hiện
              khối này, thay vì mượn khuyến nghị của nhóm khác. */}
          {recommendations.length > 0 && !query && <section className="min-w-0 overflow-hidden rounded-xl border border-brand-outline bg-brand-surface">
            <div className="border-b border-brand-outline/70 px-4 py-3">
              <h3 className="text-body font-bold text-brand-text">{config.checklistTitle}: {activeGroup}</h3>
              <p className="mt-0.5 text-caption text-brand-text-muted">Việc nên rà soát khi thay đổi cấu hình trong nhóm này.</p>
            </div>
            <div className="grid divide-y divide-brand-outline/70 sm:grid-cols-2 sm:divide-y-0">
              {recommendations.map((item) => (
                <RecommendationItem
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  actionLabel={item.actionLabel}
                  onAction={item.onAction}
                />
              ))}
            </div>
          </section>}
        </div>
      </div>

      {/* Thanh lưu dính đáy màn hình.

          Nút "Lưu thay đổi" trước đây nằm cố định ở đầu trang và bị vô hiệu hóa ở
          7 trong 8 nhóm — chỉ nhóm "Thông tin tiệm" mới có biểu mẫu để lưu — nên
          phần lớn thời gian nó là một nút xám không giải thích được vì sao không
          bấm được (§10.3). Nay nút chỉ xuất hiện đúng lúc có thay đổi chưa lưu,
          và luôn đi kèm đường lui. */}
      {isBrandTab && !query && brandIsDirty && (
        <div
          role="region"
          aria-label="Thay đổi chưa lưu"
          className="sticky bottom-4 flex flex-col gap-3 rounded-card border border-brand-outline bg-brand-surface p-3 shadow-floating sm:flex-row sm:items-center sm:justify-between"
          style={{ zIndex: 'var(--z-sticky)' }}
        >
          <p className="flex min-w-0 items-center gap-2.5 text-body text-brand-text">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-warning" />
            <span>
              {readOnlyReason
                ? `Không lưu được: ${readOnlyReason}`
                : 'Thông tin tiệm có thay đổi chưa lưu.'}
            </span>
          </p>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <Button size="small" variant="secondary" onClick={handleBrandRevert} disabled={isSaving}>
              Hoàn tác
            </Button>
            <Button
              size="small"
              variant="primary"
              type="submit"
              form={BRAND_FORM_ID}
              iconLeading={<Save />}
              loading={isSaving}
              disabled={Boolean(readOnlyReason)}
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}

      {/* Chi tiết một hạng mục cấu hình */}
      <Modal
        open={Boolean(selectedRow)}
        onClose={() => onSelectRow(null)}
        size="large"
        className="tenant-settings-surface"
        eyebrow={selectedRow?.id}
        title={selectedRow?.title ?? ''}
        description={selectedRow?.subtitle}
        headerAside={selectedRow && <StatusBadge status={detailStatus} label={selectedRow.badge} size="small" />}
        footer={(
          <>
            <Button variant="secondary" onClick={onEditSelected} iconLeading={<Pencil />}>
              Chỉnh sửa
            </Button>
            <Button variant="primary" onClick={onConfirmSelected}>
              Xác nhận &amp; cập nhật
            </Button>
          </>
        )}
      >
        {selectedRow && (
          <div className="flex flex-col gap-5">
            {selectedRow.cells[0] && (
              <p>
                <span className="block text-caption text-brand-text-muted">{valueColumnLabel}</span>
                <span className="mt-0.5 block text-body-lg font-semibold leading-6 text-brand-text">{selectedRow.cells[0]}</span>
              </p>
            )}

            <dl className={`min-w-0 ${rowList}`}>
              {selectedRow.details.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-2.5">
                  <dt className="min-w-0 text-body text-brand-text-muted">{item.label}</dt>
                  <dd className="min-w-0 text-body font-semibold text-brand-text">{item.value}</dd>
                </div>
              ))}
            </dl>

            {selectedRow.note && (
              <div className="border-t border-brand-outline pt-5">
                <p className="text-caption text-brand-text-muted">Ghi chú vận hành</p>
                <p className="mt-1 text-body leading-6 text-brand-text">{selectedRow.note}</p>
              </div>
            )}

            <p className="text-caption leading-5 text-brand-text-muted">
              Cập nhật gần nhất lúc 14:32 bởi hệ thống {tenantName}. Mọi thay đổi quản trị được ghi lại trong nhật ký cấu hình.
            </p>
          </div>
        )}
      </Modal>

      {/* Biểu mẫu cập nhật cấu hình */}
      <Modal
        open={formOpen}
        onClose={onFormClose}
        size="large"
        className="tenant-settings-surface"
        closeOnBackdrop={false}
        eyebrow={config.title}
        title={activeFormTitle}
        description={formFields
          ? 'Sửa trực tiếp từng giá trị của hạng mục. Thay đổi ghi đè lên đúng hạng mục này.'
          : 'Nhập thông tin cần thiết; bạn có thể bổ sung chi tiết sau khi lưu.'}
        footer={(
          <>
            <Button variant="secondary" onClick={onFormClose}>Hủy</Button>
            <Button variant="primary" type="submit" form={FORM_ID} iconLeading={<Save />}>
              Lưu thay đổi
            </Button>
          </>
        )}
      >
        <form id={FORM_ID} onSubmit={onFormSubmit} className="grid gap-5 sm:grid-cols-2 sm:gap-x-8">
          {activeFormFields.map((field) => {
            const isFirstField = field === activeFormFields[0];
            const value = formValues[field.key] || '';

            if (field.type === 'select') {
              // Phạm vi phải là chi nhánh CÓ THẬT của tenant. Dữ liệu tĩnh không
              // biết tenant nào đang đăng nhập, nên danh sách được dựng tại chỗ
              // từ chi nhánh thật; tenant chưa có chi nhánh thì chỉ còn lựa chọn
              // áp dụng cho toàn tenant.
              const options = ['scope', '__scope'].includes(field.key)
                ? ['Tất cả chi nhánh', ...branchRows.map((branch) => branch.title)]
                : field.options || [];
              return (
                <Field key={field.key} label={field.label}>
                  <BeautifulSelect
                    value={value}
                    onChange={(event) => onFormChange(field.key, event.target.value)}
                    className="w-full"
                  >
                    <option value="">Chọn {field.label.toLocaleLowerCase('vi')}</option>
                    {options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </BeautifulSelect>
                </Field>
              );
            }

            if (field.type === 'textarea') {
              return (
                <Field key={field.key} label={field.label} className="sm:col-span-2">
                  <textarea
                    value={value}
                    onChange={(event) => onFormChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full resize-y rounded-control border border-brand-outline bg-brand-surface px-3 py-2.5 text-body leading-6 text-brand-text outline-none"
                  />
                </Field>
              );
            }

            return (
              <Field key={field.key} label={field.label}>
                <input
                  type={field.type}
                  value={value}
                  onChange={(event) => onFormChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  required={isFirstField}
                  className={inputClass}
                />
              </Field>
            );
          })}
        </form>
      </Modal>
    </div>
  );
}
