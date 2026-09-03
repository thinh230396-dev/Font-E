import { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  loadLocalStorageData,
  saveLocalStorageData,
  INITIAL_ALERTS,
  INITIAL_INVOICES
} from './data';
import { Tenant, SubscriptionPackage, SystemAlert, Invoice, TenantStatus, TenantAdminAccount, Ticket, PackageUpgradeRequest, SystemAnnouncement } from './types';
import { normalizeCurrency } from './utils/money';
import {
  getSubscriptionPackage,
  buildSubscriptionPackageFromTenant,
  getSubscriptionPackageForTenant,
  getSubscriptionPrice,
  getYearlyPackagePrice,
  normalizeSubscriptionPackage
} from './utils/subscriptions';
import { loadSystemAnnouncements, saveSystemAnnouncements } from './utils/systemAnnouncements';
import {
  loadSystemSettings,
  SYSTEM_SETTINGS_STORAGE_KEY,
  SYSTEM_SETTINGS_UPDATED_EVENT,
  type SystemSettingsModel
} from './utils/systemSettings';
import { inferPaymentGateway, normalizeInvoicePaymentData } from './utils/invoicePayments';
import { SUPPORT_MOCK_TICKETS } from './mockData/supportTickets';
import useGlobalModalGuard from './hooks/useGlobalModalGuard';
import { Button, MockDataNotice, Modal as UiModal, useToast } from './components/ui';
import {
  deletePackageUpgradeRequest,
  loadPackageUpgradeRequests,
  persistPackageUpgradeRequest,
  persistPackageUpgradeReview,
  savePackageUpgradeRequests
} from './utils/packageUpgradeRequests';
import { resetTenantMockStorage } from './utils/mockDataReset';
import { setTenantStorageScope } from './utils/tenantStorage';
import { describeApiError } from './services/apiClient';
import useMyTenant from './hooks/useMyTenant';
import useTenants from './hooks/useTenants';
import useSubscriptionInvoices from './hooks/useSubscriptionInvoices';
import type { CreateTenantInput, UpdateTenantInput } from './services/tenants';
import {
  getSession,
  listMyTenants,
  login as loginRequest,
  logout as logoutRequest,
  selectTenant as selectTenantRequest,
  type SessionState,
  type TenantSummary
} from './services/auth';

// Import subcomponents
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import TenantPicker from './components/TenantPicker';
import TenantSwitcher from './components/TenantSwitcher';
import TenantAdminPortal from './components/NailTenantAdminPortal';
import ReceptionistPortal from './components/ReceptionistPortal';
import { useLanguage } from './i18n';
import { getDemoAccountByRole, type DemoAccount, type PortalRole } from './auth/demoAccounts';

const ALERTS_MOCK_SEED_KEY = 'alerts_mock_seed_v2';

/**
 * Ngưỡng "sắp hết hạn" của giao diện, tính bằng ngày.
 *
 * BR-TENANT-001 chỉ có bốn trạng thái và không có `EXPIRING`, nên đây thuần túy là một lời
 * nhắc trên thanh điều hướng chứ không phải một trạng thái của tiệm: nó không đổi quyền, không
 * chặn ghi, và không xuất hiện ở bất kỳ phép kiểm nào phía máy chủ.
 */
const EXPIRING_SOON_DAYS = 7;


const loadAlertsWithOneTimeMocks = (): SystemAlert[] => {
  const savedAlerts = loadLocalStorageData<SystemAlert[]>('alerts', []);
  const mocksWereSeeded = loadLocalStorageData<boolean>(ALERTS_MOCK_SEED_KEY, false);

  if (mocksWereSeeded) return savedAlerts;

  saveLocalStorageData(ALERTS_MOCK_SEED_KEY, true);
  const mockIds = new Set(INITIAL_ALERTS.map((alert) => alert.id));
  return [...INITIAL_ALERTS, ...savedAlerts.filter((alert) => !mockIds.has(alert.id))];
};

// `loadTenantsWithOneTimeMocks` và `normalizeTenantStatusSync` từng nằm ở đây. Cả hai đã
// hết việc từ ngày 6: danh sách tiệm nay do `GET /api/tenants` trả về, còn phép đồng bộ
// trạng thái tiệm với trạng thái tài khoản chủ tiệm là một quy tắc của thời dữ liệu mẫu —
// ở database thật hai thứ đó độc lập, vì một tài khoản chủ tiệm có thể giữ nhiều tiệm
// (BR-AUTH-023) nên khóa một tiệm không thể kéo theo khóa cả con người đó.

const Overview = lazy(() => import('./components/Overview'));
const TenantManagement = lazy(() => import('./components/TenantManagement'));
const TenantAdminManagement = lazy(() => import('./components/TenantAdminManagement'));
const SubscriptionPackages = lazy(() => import('./components/SubscriptionPackages'));
const BillingAndInvoices = lazy(() => import('./components/BillingAndInvoices'));
const SystemReports = lazy(() => import('./components/SystemReports'));
const SystemSettings = lazy(() => import('./components/SystemSettings'));
const SuperAdminAnnouncements = lazy(() => import('./components/SuperAdminAnnouncements'));
const AccountPreferences = lazy(() => import('./components/AccountPreferences'));
const SecurityAndLogs = lazy(() => import('./components/SecurityAndLogs'));
const HelpAndSupport = lazy(() => import('./components/HelpAndSupport'));
const DataBackup = lazy(() => import('./components/DataBackup'));

const dedupeInvoices = (invoiceList: Invoice[]) => {
  const seenIds = new Set<string>();
  return invoiceList.filter((invoice) => {
    if (seenIds.has(invoice.id)) {
      return false;
    }
    seenIds.add(invoice.id);
    return true;
  });
};

const getIsoDateAfterDays = (days: number) => {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const getIsoDateAfterDaysFrom = (dateIso: string, days: number) => {
  return new Date(new Date(dateIso).getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const getBillingCycleDays = (billingCycle?: 'monthly' | 'yearly') => {
  return billingCycle === 'yearly' ? 365 : 30;
};

const LEGACY_MOCK_SUPPORT_TICKET_IDS = new Set([
  'TKT-2026-0716-018',
  'TKT-2026-0716-017',
  'TKT-2026-0716-016',
  'TKT-2026-0716-015',
  'TKT-2026-0716-014',
  'TKT-2026-0715-013',
  'TKT-2026-0715-012',
  'TKT-2026-0716-011'
]);


const getTenantSubscriptionRenewalDate = (tenant: Tenant) => {
  if (tenant.subscriptionRenewsAt) return tenant.subscriptionRenewsAt;
  if (tenant.daysRemaining !== undefined) return getIsoDateAfterDays(tenant.daysRemaining);

  const startDate = tenant.subscriptionStartedAt || tenant.planStartDate || tenant.createdAt;
  const startTime = new Date(startDate).getTime();
  if (Number.isNaN(startTime)) return undefined;
  return new Date(startTime + getBillingCycleDays(tenant.billingCycle) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const isTenantSubscriptionExpired = (tenant: Tenant, todayIso: string) => {
  if (tenant.daysRemaining !== undefined && tenant.daysRemaining <= 0) return true;
  if (tenant.trialEndDate && tenant.trialEndDate <= todayIso) return true;
  const renewalDate = getTenantSubscriptionRenewalDate(tenant);
  return Boolean(renewalDate && renewalDate <= todayIso);
};

const getPeriodEndIsoDate = (invoice: Invoice) => {
  const periodText = invoice.servicePeriod || invoice.billingPeriod;
  const match = periodText?.match(/Đến\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

const normalizeInvoiceDueDate = (invoice: Invoice) => {
  const periodEndDate = getPeriodEndIsoDate(invoice);
  if (periodEndDate) {
    return { ...invoice, dueDate: periodEndDate };
  }

  if (!invoice.createdAt) {
    return invoice;
  }

  const oldDefaultDueDate = getIsoDateAfterDaysFrom(invoice.createdAt, 15);
  if (invoice.dueDate !== oldDefaultDueDate) {
    return invoice;
  }

  return {
    ...invoice,
    dueDate: getIsoDateAfterDaysFrom(invoice.createdAt, getBillingCycleDays(invoice.billingCycle))
  };
};

export default function App() {
  useGlobalModalGuard();
  const showToast = useToast();

  /**
   * Phiên đăng nhập thật, do máy chủ trả về ở `GET /api/auth/session`.
   *
   * Nguồn duy nhất cho việc "ai đang đăng nhập" và "đang làm việc cho tiệm nào".
   * Tiệm đang làm việc nằm trong phiên ở phía máy chủ (BR-AUTH-024) chứ không
   * phải trong state này — đây chỉ là bản đọc về để hiển thị.
   */
  const [session, setSession] = useState<SessionState | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [myTenants, setMyTenants] = useState<TenantSummary[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);
  /** Tăng lên một để buộc tải lại danh sách tiệm sau khi người dùng bấm "Thử lại". */
  const [tenantsReloadToken, setTenantsReloadToken] = useState(0);

  /**
   * Bản chuyển đổi sang hình dạng `DemoAccount` mà các portal đang nhận.
   *
   * Từ ngày 4, máy chủ không còn chép tiệm và chi nhánh lên bảng tài khoản nữa
   * (BR-AUTH-024, BR-EMP-004) — chúng thuộc về phiên. Lớp chuyển đổi này giữ
   * cho hai portal hơn 5.000 dòng không phải sửa trong hôm nay; chúng sẽ đọc
   * thẳng từ phiên khi được nối API ở ngày 14–15.
   */
  const sessionAccount: DemoAccount | null = session
    ? {
        email: session.account.email,
        role: session.account.role,
        displayName: session.account.displayName,
        tenantId: session.tenant?.id,
        tenantName: session.tenant?.name,
        // Chỗ ép kiểu ở đây đã bỏ được từ ngày 6: `DemoAccount.branchCode` nay là `string`,
        // đúng với việc mã chi nhánh do người dùng tự đặt và có tập giá trị mở.
        branchCode: session.branch?.code,
        branchName: session.branch?.name,
        branchId: session.branch?.id
      }
    : null;

  const isAuthenticated = Boolean(session);
  const portalRole: PortalRole = session?.account.role || 'SUPERADMIN';
  // Mobile sidebar visibility state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('salonsys_theme') === 'dark' ? 'dark' : 'light';
  });
  // Ngôn ngữ nay do LanguageProvider ở `main.tsx` giữ, để mọi component đọc
  // được qua context thay vì phải luồn prop qua từng cấp.
  const { language: interfaceLanguage, setLanguage: setInterfaceLanguage } = useLanguage();
  const [systemSettings, setSystemSettings] = useState<SystemSettingsModel>(loadSystemSettings);
  
  // Navigation active tab state
  const [activeTab, setActiveTab] = useState('overview');

  /**
   * Tiệm, gói và tài khoản chủ tiệm — cả ba đọc thẳng từ máy chủ (ngày 6).
   *
   * Chỉ chạy với Superadmin: hai vai trò còn lại không có quyền với ba endpoint
   * này (BR-AUTH-010, BR-AUTH-030), nên gọi bằng vai trò khác chỉ để nhận về một
   * lỗi 403 đã biết trước.
   */
  const directory = useTenants(session?.account.role === 'SUPERADMIN');
  const { tenants, packages: apiPackages, tenantAdmins } = directory;

  /**
   * Hồ sơ tiệm cho cổng chủ tiệm — ngày 8.
   *
   * Tách khỏi `directory` ở trên vì hai vai trò đọc tiệm bằng hai đường khác
   * hẳn nhau: Superadmin gọi `GET /api/tenants` và thấy mọi tiệm; chủ tiệm gọi
   * `GET /api/tenants/me` và chỉ thấy tiệm đang làm việc của phiên mình. Gộp
   * thành một hook sẽ phải mang theo một nhánh `if` về vai trò ngay giữa tầng
   * lấy dữ liệu.
   */
  const myWorkspace = useMyTenant(
    session?.account.role === 'TENANT_ADMIN',
    session?.activeTenantId || null
  );

  /**
   * Số tiệm đang dùng mỗi gói, đếm từ chính danh sách tiệm.
   *
   * Máy chủ không gửi con số này kèm bảng giá, và cũng không nên: nó là một phép
   * đếm trên danh sách mà màn hình đã cầm sẵn trong tay. Gửi thêm một bản sao là
   * tạo thêm một chỗ để lệch với danh sách tiệm đang hiển thị ngay bên cạnh.
   */
  const packages = useMemo(
    () => apiPackages.map((pkg) => ({
      ...pkg,
      activeTenants: tenants.filter((tenant) => tenant.subscriptionPackageId === pkg.id).length
    })),
    [apiPackages, tenants]
  );
  const [alerts, setAlerts] = useState<SystemAlert[]>(loadAlertsWithOneTimeMocks);
  /*
    ── Hóa đơn đăng ký: nền là dữ liệu THẬT, từ ngày 17 ──────────────────────────────────
    Trước đây state này khởi tạo từ `INITIAL_INVOICES` trong `localStorage`, và màn Tổng quan
    của Superadmin cộng chúng lại thành "Doanh thu nền tảng đã thu". Con số ra 86.353.000₫
    trong khi database chỉ có 11.100.000₫ thật — đúng thứ mà BR-REV-008 đã cảnh báo sẵn:
    *"Dữ liệu mẫu hiện tại đang sai ngữ cảnh này."*

    Nay nền là API. Các thao tác ghi của module gói đăng ký — đánh dấu đã thu, nộp chứng từ,
    duyệt nâng cấp — vẫn sửa mảng trong bộ nhớ như cũ, vì module ấy đã bị cắt khỏi MVP (§0 mục
    13) và màn hình của nó đã mang dải nhãn dữ liệu mẫu. Tải lại trang thì chúng biến mất và
    sự thật của máy chủ quay về, đó là hành vi đúng cho một module chỉ để trình diễn.

    Cố ý KHÔNG còn ghi xuống `localStorage`: giữ lại thì lần tải sau sẽ đọc bản chụp cũ đè lên
    dữ liệu máy chủ, và con số bịa quay lại theo đúng con đường vừa đi chặn.
  */
  const subscriptionInvoiceBook = useSubscriptionInvoices(
    session?.account.role === 'SUPERADMIN'
  );

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    setInvoices(dedupeInvoices(subscriptionInvoiceBook.invoices.map(
      (invoice) => normalizeInvoicePaymentData(normalizeInvoiceDueDate(invoice))
    )));
  }, [subscriptionInvoiceBook.invoices]);
  const [upgradeRequests, setUpgradeRequests] = useState<PackageUpgradeRequest[]>(loadPackageUpgradeRequests);
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const storedTickets = loadLocalStorageData<Ticket[]>('support_tickets', [])
      .filter((ticket) => !LEGACY_MOCK_SUPPORT_TICKET_IDS.has(ticket.id));
    const storedIds = new Set(storedTickets.map((ticket) => ticket.id));
    return [
      ...SUPPORT_MOCK_TICKETS.filter((ticket) => !storedIds.has(ticket.id)),
      ...storedTickets
    ];
  });
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(loadSystemAnnouncements);

  // Global search state in Header
  const [searchQuery, setSearchQuery] = useState('');

  // Selected tenant from overview to open details panel in tenant screen
  const [selectedTenantFromOverview, setSelectedTenantFromOverview] = useState<Tenant | null>(null);

  // Custom confirm modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  };

  useEffect(() => {
    let active = true;

    void getSession().then((result) => {
      if (!active) return;

      if (result.status === 'ok') {
        setSession(result.data);
        return;
      }

      // Chưa đăng nhập là trạng thái BÌNH THƯỜNG, không phải sự cố — im lặng đưa
      // về màn đăng nhập. Mọi lý do khác (mất mạng, máy chủ lỗi) thì phải nói ra,
      // vì im lặng ở đó khiến người dùng tưởng mình gõ sai mật khẩu.
      if (result.error.kind !== 'unauthenticated') {
        const { message, tone } = describeApiError(result.error);
        showToast(message, tone);
      }

      setSession(null);
    }).finally(() => {
      if (active) setAuthChecked(true);
    });

    return () => {
      active = false;
    };
  }, [showToast]);

  /**
   * Tải danh sách tiệm của tài khoản — BR-AUTH-023.
   *
   * Chỉ chạy với chủ tiệm: Superadmin không thuộc tiệm nào, còn lễ tân chỉ có
   * đúng một tiệm và đã được máy chủ đặt sẵn, nên cả hai không cần danh sách này.
   * Dữ liệu dùng cho cả màn chọn tiệm lẫn bộ đổi tiệm ở thanh trên cùng.
   */
  useEffect(() => {
    if (session?.account.role !== 'TENANT_ADMIN') return;

    let active = true;
    setTenantsLoading(true);
    setTenantsError(null);

    void listMyTenants().then((result) => {
      if (!active) return;

      if (result.status === 'ok') {
        setMyTenants(result.data);
      } else {
        setMyTenants([]);
        setTenantsError(result.error.message);
      }
    }).finally(() => {
      if (active) setTenantsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [session?.account.role, tenantsReloadToken]);

  useEffect(() => {
    const root = document.documentElement;
    // Rất nhiều phần tử đang transition `background-color`/`color`. Khi token đổi
    // giữa sáng và tối, trình duyệt bắt đầu transition từ giá trị cũ và có thể
    // kẹt luôn ở đó — nền vẫn trắng trong khi chữ đã chuyển sang màu sáng, đọc
    // không nổi. Tắt transition đúng trong khung hình đổi theme rồi bật lại.
    root.classList.add('theme-switching');
    root.dataset.theme = themeMode;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('salonsys_theme', themeMode);
    // Đọc layout để ép tính lại style ngay khi transition còn đang bị tắt.
    void root.offsetHeight;
    const timer = window.setTimeout(() => root.classList.remove('theme-switching'), 80);
    return () => window.clearTimeout(timer);
  }, [themeMode]);

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const updatedSettings = (event as CustomEvent<SystemSettingsModel>).detail;
      setSystemSettings(updatedSettings || loadSystemSettings());
    };
    const handleSettingsStorage = (event: StorageEvent) => {
      if (event.key === SYSTEM_SETTINGS_STORAGE_KEY) setSystemSettings(loadSystemSettings());
    };

    window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsStorage);
    return () => {
      window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsStorage);
    };
  }, []);

  useEffect(() => {
    document.title = isAuthenticated
      ? `${systemSettings.general.systemName} — ${interfaceLanguage === 'en' ? 'Workspace' : 'Không gian làm việc'}`
      : `${interfaceLanguage === 'en' ? 'Sign in' : 'Đăng nhập'} — ${systemSettings.general.systemName}`;
    document.documentElement.dataset.timezone = systemSettings.general.timezone;
  }, [interfaceLanguage, isAuthenticated, systemSettings.general.systemName, systemSettings.general.timezone]);

  const handleLogin = async (identifier: string, password: string, remember: boolean): Promise<string | null> => {
    const result = await loginRequest(identifier, password, remember);

    // Trả về chuỗi lỗi để `LoginPage` hiện ngay tại form. Đăng nhập là chỗ duy
    // nhất mà lỗi phải nằm cạnh ô nhập chứ không phải ở góc màn hình: người dùng
    // đang nhìn vào form, và họ cần biết sửa cái gì.
    if (result.status === 'error') return result.error.message;

    // Đọc lại phiên thay vì tự dựng từ phản hồi đăng nhập: phạm vi làm việc —
    // tiệm, chi nhánh, quyền của gói — do máy chủ tính, và chỉ có một chỗ trả lời
    // câu đó. Hai nguồn cho cùng một sự thật là hai chỗ để lệch nhau.
    const sessionResult = await getSession();
    if (sessionResult.status === 'error') return sessionResult.error.message;

    setSession(sessionResult.data);
    return null;
  };

  const handleLogout = () => {
    setSession(null);
    setMyTenants([]);
    setTenantsError(null);

    void logoutRequest().then((result) => {
      // Đăng xuất hỏng thì phiên phía máy chủ vẫn còn sống. Nói ra, đừng im lặng:
      // người dùng đang tưởng mình đã thoát, nhất là khi dùng máy chung.
      if (result.status === 'error') {
        showToast('Không gọi được lệnh đăng xuất trên máy chủ. Phiên có thể vẫn còn hiệu lực.', 'warning');
      }
    });
  };

  /** BR-AUTH-025 — chọn hoặc đổi tiệm đang làm việc. */
  const handleSelectTenant = async (tenantId: string) => {
    setPendingTenantId(tenantId);

    const result = await selectTenantRequest(tenantId);

    if (result.status === 'error') {
      const { message, tone } = describeApiError(result.error);
      showToast(message, tone);
      setPendingTenantId(null);
      return;
    }

    // Đọc lại phiên để lấy đúng những gì máy chủ đã ghi nhận, gồm cả chi nhánh
    // và cờ "còn phải chọn tiệm nữa không".
    const sessionResult = await getSession();
    if (sessionResult.status === 'ok') {
      setSession(sessionResult.data);
      showToast(`Đang làm việc cho ${result.data.name}.`, 'success');
    } else {
      const { message, tone } = describeApiError(sessionResult.error);
      showToast(message, tone);
    }

    setPendingTenantId(null);
  };

  // Ghi state xuống localStorage.
  //
  // Ba khóa `tenants`, `packages` và `tenant_admins` đã rời khỏi đây ở ngày 6: cả ba nay do
  // máy chủ giữ, và ghi thêm một bản sao xuống trình duyệt chỉ tạo ra một sự thật thứ hai
  // để có ngày lệch với sự thật thứ nhất.
  useEffect(() => {
    saveLocalStorageData('alerts', alerts);
  }, [alerts]);

  /*
    Khóa `invoices` cũng rời khỏi đây ở ngày 17, cùng lý do với ba khóa trên: hóa đơn đăng ký
    nay do máy chủ giữ. Ghi thêm một bản sao xuống trình duyệt sẽ khiến lần tải sau đọc bản
    chụp cũ đè lên dữ liệu thật — chính là con đường mà con số 86.353.000₫ đã đi.
  */

  useEffect(() => {
    savePackageUpgradeRequests(upgradeRequests);
  }, [upgradeRequests]);

  useEffect(() => {
    saveSystemAnnouncements(announcements);
  }, [announcements]);

  // Trước đây ở đây có một effect nạp yêu cầu nâng gói từ `/api/package-upgrade-requests`.
  // Endpoint đó mất chỗ phục vụ khi plugin `vite-local-auth` bị gỡ ở ngày 1, và module gói
  // đăng ký đã bị cắt khỏi MVP nên nó không quay lại. Effect được bỏ theo quyết định 20:
  // giữ lại chỉ để lại một lỗi 404 ở mỗi lần tải trang. Nguồn dữ liệu nay là `localStorage`,
  // và màn hình nói rõ điều đó bằng dải nhãn `MockDataNotice`.

  useEffect(() => {
    saveLocalStorageData('support_tickets', tickets);
  }, [tickets]);

  // Ở đây từng có ba effect nữa, tất cả đều sửa mảng `tenants` tại chỗ:
  //
  //   1. Di trú liên kết gói từ tên gói sang mã gói, và điền giá đã khóa lần đầu.
  //   2. Áp dụng thay đổi gói đã duyệt khi tới ngày hiệu lực.
  //   3. Chuyển tiệm sang gói thay thế khi gói cũ ngừng bán và subscription hết hạn.
  //
  // Cả ba là quy tắc nghiệp vụ chạy trong trình duyệt vì hồi đó chưa có máy chủ. Nay tiệm
  // do máy chủ giữ: liên kết gói được chốt ngay trong giao dịch tạo tiệm cùng giá và số
  // phiên bản tại thời điểm đó (BR-SUB-004), nên không còn gì để di trú. Hai quy tắc còn
  // lại thuộc module gói đăng ký — module đã bị cắt khỏi MVP — nên giữ chúng chỉ để sửa một
  // bản sao trong bộ nhớ rồi mất khi tải lại trang, tức nói dối người dùng rằng đã đổi gói.

  useEffect(() => {
    setInvoices((currentInvoices) => {
      let hasChanges = false;
      const migrated = currentInvoices.map((invoice) => {
        if (invoice.packageId && invoice.packageVersion) return invoice;
        const relatedTenant = tenants.find((tenant) => tenant.id === invoice.tenantId);
        const pkg = packages.find((item) => item.id === relatedTenant?.subscriptionPackageId)
          || (invoice.planName ? getSubscriptionPackage(packages, invoice.planName) : undefined)
          || (relatedTenant ? getSubscriptionPackage(packages, relatedTenant.packageName) : undefined);
        if (!pkg) return invoice;
        hasChanges = true;
        return {
          ...invoice,
          packageId: invoice.packageId || pkg.id,
          packageVersion: invoice.packageVersion || pkg.version || 1,
          planName: invoice.planName || pkg.name
        };
      });
      return hasChanges ? migrated : currentInvoices;
    });
  }, [packages, tenants]);

  /**
   * Tạo tiệm — BR-TENANT-004/005.
   *
   * Máy chủ làm cả năm việc trong một giao dịch: tiệm, chi nhánh chính, tài khoản chủ tiệm,
   * dòng liên kết tài khoản–tiệm, và hóa đơn đăng ký đầu tiên. Frontend không được tự sinh
   * hóa đơn nữa — bản cũ tạo một hóa đơn giả ở `localStorage` song song với hóa đơn thật ở
   * máy chủ, và hai bên không bao giờ khớp số.
   *
   * Trả kết quả về cho màn hình thay vì tự hiện thông báo: lỗi nhập liệu phải nằm cạnh đúng
   * ô nhập sai, và chỉ màn hình mới biết ô nào ở đâu.
   */
  const handleAddTenant = async (input: CreateTenantInput) => {
    const result = await directory.createTenant(input);

    if (result.status === 'ok') {
      showToast(`Đã tạo tiệm "${result.data.tenant.name}".`, 'success', {
        description: 'Tiệm, chi nhánh chính và hóa đơn đăng ký đầu tiên đã được ghi cùng lúc.'
      });
    }

    return result;
  };

  /** Sửa hồ sơ tiệm — chỉ bốn trường mà máy chủ lưu (BR-TENANT-006). */
  const handleUpdateTenant = async (id: string, input: UpdateTenantInput) => {
    const result = await directory.updateTenant(id, input);

    if (result.status === 'ok') showToast(`Đã cập nhật tiệm "${result.data.name}".`, 'success');

    return result;
  };

  /** Gia hạn bằng ngày hết hạn mới do Superadmin nhập tay — BR-TENANT-006. */
  const handleRenewTenant = async (id: string, expiresAt: string) => {
    const result = await directory.renewTenant(id, expiresAt);

    if (result.status === 'ok') {
      showToast(`Đã gia hạn tiệm "${result.data.name}".`, 'success', {
        description: `Hạn dùng mới: ${new Date(result.data.subscriptionRenewsAt || expiresAt).toLocaleDateString('vi-VN')}.`
      });
    }

    return result;
  };

  /**
   * Khóa hoặc mở khóa tiệm — BR-TENANT-002.
   *
   * Chỉ đụng tới tiệm, không đụng tới tài khoản chủ tiệm. Bản cũ khóa cả hai cùng lúc, và
   * điều đó sai từ khi một tài khoản được phép giữ nhiều tiệm (BR-AUTH-023): khóa một tiệm
   * mà chặn luôn con người đó là chặn cả những tiệm khác họ đang quản lý.
   */
  const handleChangeTenantStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    const result = await directory.changeTenantStatus(id, status);

    if (result.status === 'ok') {
      showToast(
        status === 'SUSPENDED' ? 'Đã khóa tiệm' : 'Đã mở khóa tiệm',
        status === 'SUSPENDED' ? 'warning' : 'success',
        {
          description: status === 'SUSPENDED'
            ? `Tiệm "${result.data.name}" chuyển sang chế độ chỉ đọc; tài khoản chủ tiệm vẫn đăng nhập được.`
            : `Tiệm "${result.data.name}" đã hoạt động trở lại.`
        }
      );
    }

    return result;
  };

  /**
   * Xóa tiệm — BR-TENANT-020/021, xóa mềm ở máy chủ.
   *
   * Dữ liệu mẫu của cổng chủ tiệm trong `localStorage` vẫn được dọn theo. Từ ngày 9 nó được
   * dọn theo **mã tiệm**: khóa lưu trữ không còn gắn theo tên nữa, nên dọn theo tên sẽ trượt
   * hết — và trước đó thì nó dọn nhầm sang một tiệm khác trùng tên.
   */
  const handleDeleteTenant = async (id: string) => {
    const target = tenants.find((tenant) => tenant.id === id);
    const result = await directory.deleteTenant(id);

    if (result.status === 'ok' && target) {
      resetTenantMockStorage(target.id);
      showToast(`Đã xóa tiệm "${target.name}".`, 'success', {
        description: 'Mã tiệm vẫn được giữ chỗ; tài khoản chủ tiệm không bị xóa theo.'
      });
    }

    return result;
  };

  /** Bật/tắt khóa từ màn Tổng quan — cùng một đường ghi với màn Quản lý tiệm. */
  const handleToggleTenantStatusFromOverview = (id: string, newStatus: TenantStatus) => {
    const currentTenant = tenants.find((tenant) => tenant.id === id);
    if (!currentTenant || currentTenant.status === newStatus) return;

    void handleChangeTenantStatus(id, newStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE').then(
      (result) => {
        if (result.status === 'error') {
          const { message, tone } = describeApiError(result.error);
          showToast(message, tone);
        }
      }
    );
  };

  // Jump to Tenant View from overview when viewing details
  const handleViewTenantFromOverview = (tenant: Tenant) => {
    setSelectedTenantFromOverview(tenant);
    setActiveTab('salons');
  };

  // Alert Actions
  const handleMarkAlertAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const handleMarkAllAlertsAsRead = () => {
    setAlerts(alerts.map(a => ({ ...a, isRead: true })));
    showToast('Đã đánh dấu tất cả cảnh báo hệ thống là đã đọc!');
  };

  const handleToggleArchiveAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isArchived: !a.isArchived } : a));
    const target = alerts.find(a => a.id === id);
    showToast(target?.isArchived ? 'Đã khôi phục cảnh báo.' : 'Đã lưu trữ cảnh báo để làm gọn màn hình.');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
    showToast('Đã xóa cảnh báo khỏi hệ thống.');
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    showToast('Đã xóa sạch cảnh báo.');
  };

  // Invoice update status
  const handleUpdateInvoiceStatus = (id: string, newStatus: Invoice['status'], paymentDetails: Partial<Invoice> = {}) => {
    const currentInvoice = invoices.find((invoice) => invoice.id === id);
    const now = new Date().toISOString();

    setInvoices((current) => current.map((inv) => inv.id === id ? normalizeInvoicePaymentData({
      ...inv,
      ...paymentDetails,
      status: newStatus,
      paidAt: newStatus === 'PAID' ? inv.paidAt || now : inv.paidAt,
      updatedAt: now,
      activities: currentInvoice && currentInvoice.status !== newStatus ? [
        ...(paymentDetails.activities || inv.activities || []),
        {
          id: `ACT-${Date.now()}`,
          action: 'Đổi trạng thái hóa đơn',
          description: `${currentInvoice.status} → ${newStatus}${paymentDetails.paymentMethod ? ` (Kênh: ${paymentDetails.paymentMethod})` : ''}`,
          actor: 'superadmin@salonsys.vn',
          createdAt: now
        }
      ] : (paymentDetails.activities || inv.activities)
    }) : inv));

    // Ở đây từng có một khối dài sửa luôn tiệm khi hóa đơn chuyển sang ĐÃ THU: kích hoạt gói
    // mới, đẩy ngày gia hạn, mở khóa tiệm. Khối đó đã được gỡ ở ngày 6.
    //
    // Lý do không phải là dọn dẹp mà là tính trung thực: hóa đơn đăng ký vẫn nằm ở
    // `localStorage` (module gói đăng ký đã bị cắt khỏi MVP), trong khi tiệm nay do máy chủ
    // giữ. Một thao tác ở trình duyệt không thể gia hạn một tiệm thật; nếu vẫn để, màn hình
    // sẽ báo "đã gia hạn" rồi tải lại trang là mọi thứ trở về như cũ. Gia hạn thật nằm ở nút
    // Gia hạn của màn Quản lý tiệm, gọi thẳng `POST /api/tenants/{id}/renew` (BR-TENANT-006).

    // If there's an upgrade request linked to this invoice, finalize it to APPROVED
    if (newStatus === 'PAID' && currentInvoice) {
      setUpgradeRequests((current) => current.map((req) => {
        if (req.invoiceId === id || (req.tenantId === currentInvoice.tenantId && req.status === 'PENDING')) {
          const reviewed = {
            ...req,
            status: 'APPROVED' as const,
            reviewedAt: now,
            reviewedBy: 'Super Admin',
            reviewNote: 'Đã xác nhận thanh toán và tự động kích hoạt gói.',
            invoiceId: id
          };
          persistPackageUpgradeReview(reviewed);
          return reviewed;
        }
        return req;
      }));
    }

    showToast(`Đã cập nhật hóa đơn ${id} thành trạng thái: ${newStatus}`, newStatus === 'PAID' ? 'success' : 'info');
  };

  const handleUpdateInvoice = (id: string, updates: Partial<Invoice>) => {
    const currentInvoice = invoices.find((invoice) => invoice.id === id);
    if (!currentInvoice) return;

    if (updates.status && updates.status !== currentInvoice.status) {
      handleUpdateInvoiceStatus(id, updates.status, updates);
      return;
    }

    setInvoices((current) => current.map((invoice) => invoice.id === id ? {
      ...invoice,
      ...updates,
      updatedAt: new Date().toISOString()
    } : invoice));
  };

  const handleCreateInvoice = (invoice: Invoice) => {
    if (invoices.some((current) => current.id === invoice.id || current.invoiceCode === invoice.invoiceCode)) {
      showToast(`Mã hóa đơn ${invoice.invoiceCode || invoice.id} đã tồn tại.`, 'error');
      return false;
    }
    setInvoices((current) => dedupeInvoices([normalizeInvoicePaymentData(normalizeInvoiceDueDate(invoice)), ...current]));
    return true;
  };

  // Ở đây từng có bảy hàm quản lý gói dịch vụ — thêm, sửa giá, ngừng bán, hẹn ngừng, hủy hẹn,
  // mở bán lại, xóa — cộng một hàm quản lý tài khoản chủ tiệm. Tất cả đã được gỡ ở ngày 6.
  //
  // Bảng giá nay đọc từ `GET /api/packages`, và danh sách tài khoản chủ tiệm từ
  // `GET /api/accounts`. Cả hai endpoint đều CHỈ ĐỌC, vì module quản lý gói đã bị cắt khỏi
  // MVP và phần cấp tài khoản nằm ở lát cắt sau. Giữ lại các hàm ghi ấy nghĩa là để người
  // dùng đổi giá một gói, thấy màn hình cập nhật, rồi mất trắng khi tải lại trang — trong khi
  // tiệm thật ở máy chủ vẫn giữ nguyên giá cũ đã khóa từ lúc đăng ký (BR-SUB-004).
  //
  // Hai màn hình tương ứng nay ở chế độ chỉ xem và nói rõ điều đó ngay trên đầu trang.

  const handleRequestPackageUpgrade = (
    tenant: Tenant,
    account: DemoAccount,
    targetPackage: SubscriptionPackage,
    billingCycle: 'monthly' | 'yearly',
    effectiveDate: 'immediate' | 'next_cycle'
  ) => {
    const existingPending = upgradeRequests.find((request) => request.tenantId === tenant.id && request.status === 'PENDING');
    if (existingPending) {
      showToast(
        'Yêu cầu đang chờ duyệt',
        'warning',
        { description: `Tenant đã có yêu cầu nâng cấp lên gói ${existingPending.requestedPackageName}. Super Admin sẽ xử lý trong Quản lý Tenant → Yêu cầu nâng cấp.` }
      );
      return;
    }

    const currentPackage = getSubscriptionPackageForTenant(packages, tenant);
    const pricing = getSubscriptionPrice(packages, targetPackage.name, billingCycle);
    const now = new Date();
    const request: PackageUpgradeRequest = {
      id: `UPG-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getTime().toString(36).slice(-5).toUpperCase()}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      requestedByName: account.displayName,
      requestedByEmail: account.email,
      currentPackageId: currentPackage?.id,
      currentPackageName: tenant.packageName,
      requestedPackageId: targetPackage.id,
      requestedPackageName: targetPackage.name,
      billingCycle,
      effectiveDate,
      quotedAmount: pricing.price,
      currency: normalizeCurrency(pricing.currency),
      status: 'PENDING',
      requestedAt: now.toISOString()
    };

    // Yêu cầu nâng gói ở lại `localStorage`: module gói đăng ký nằm ngoài MVP (quyết định
    // 20). Yêu cầu KHÔNG còn được ghi kèm lên bản ghi tiệm nữa — tiệm do máy chủ giữ, và một
    // "thay đổi gói đang chờ" chỉ tồn tại trong trình duyệt sẽ biến mất khi tải lại trang.
    setUpgradeRequests((current) => [request, ...current]);

    persistPackageUpgradeRequest(request);
    setAlerts((current) => [{
      id: `ALT-${request.id}`,
      title: `Yêu cầu nâng cấp: ${tenant.name}`,
      description: `${account.displayName} yêu cầu chuyển từ ${tenant.packageName} sang ${targetPackage.name}.`,
      type: 'info',
      createdAt: now.toISOString(),
      isRead: false,
      targetTenantId: tenant.id
    }, ...current]);
  };

  const handleReviewUpgradeRequest = async (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string,
    effectiveDate: 'immediate' | 'next_cycle'
  ) => {
    const request = upgradeRequests.find((item) => item.id === requestId);
    if (!request || request.status !== 'PENDING') return false;

    const tenant = tenants.find((item) => item.id === request.tenantId);
    const targetPackage = packages.find((item) => item.id === request.requestedPackageId)
      || getSubscriptionPackage(packages, request.requestedPackageName);
    if (!tenant || !targetPackage) {
      showToast('Không thể xử lý', 'error', { description: 'Tenant hoặc gói được yêu cầu không còn tồn tại.' });
      return false;
    }

    const reviewedAt = new Date().toISOString();
    let invoiceId: string | undefined;
    let invoice: Invoice | undefined;
    let effectiveStart = reviewedAt.slice(0, 10);
    let pricing: ReturnType<typeof getSubscriptionPrice> | undefined;

    if (decision === 'APPROVED') {
      effectiveStart = effectiveDate === 'immediate'
        ? reviewedAt.slice(0, 10)
        : tenant.subscriptionRenewsAt || tenant.trialEndDate || reviewedAt.slice(0, 10);
      pricing = getSubscriptionPrice(packages, targetPackage.name, request.billingCycle);

      invoiceId = `INV-UPG-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = effectiveDate === 'immediate' ? getIsoDateAfterDays(7) : effectiveStart;
      invoice = normalizeInvoicePaymentData(normalizeInvoiceDueDate({
        id: invoiceId,
        invoiceCode: invoiceId,
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: 'PLAN_CHANGE',
        planName: targetPackage.name,
        packageId: targetPackage.id,
        packageVersion: targetPackage.version || 1,
        billingCycle: request.billingCycle,
        servicePeriod: effectiveDate === 'immediate' ? `Từ ${effectiveStart}` : `Chu kỳ bắt đầu ${effectiveStart}`,
        dueDate,
        amount: pricing.price,
        currency: normalizeCurrency(pricing.currency),
        status: 'PENDING',
        note: `Tạo tự động từ yêu cầu nâng cấp ${request.id}. ${reviewNote}`.trim(),
        createdAt: reviewedAt.slice(0, 10),
        billingPeriod: effectiveDate === 'immediate' ? 'Nâng cấp áp dụng ngay' : 'Nâng cấp từ chu kỳ tiếp theo',
        issuedBy: 'Super Admin'
      }));
    }

    const reviewedRequest: PackageUpgradeRequest = {
      ...request,
      status: decision,
      effectiveDate,
      reviewedAt,
      reviewedBy: 'Super Admin',
      reviewNote: reviewNote || (decision === 'APPROVED' ? 'Đã xác nhận giá và quyền gói mới.' : 'Yêu cầu chưa được chấp thuận.'),
      invoiceId
    };
    // Nhánh "máy chủ chưa xác nhận" từng đứng ở đây đã được bỏ cùng quyết định 20. Nó không
    // bao giờ chạy: hàm ghi cũ `return true` ngay trong `catch`, nên nó báo thành công cả
    // khi lời gọi hỏng. Nay việc lưu chỉ còn là ghi vào `localStorage` nên không có gì để
    // chờ xác nhận, và màn hình đã nói rõ đây là dữ liệu mẫu.
    persistPackageUpgradeReview(reviewedRequest);

    // Duyệt một yêu cầu KHÔNG còn đổi gói của tiệm. Đổi gói là thao tác ghi trên tiệm, mà
    // tiệm nay do máy chủ giữ và không có endpoint đổi gói — module gói đăng ký đã bị cắt.
    // Hóa đơn kèm theo vẫn được lập ở `localStorage` như trước, vì hóa đơn đăng ký cũng nằm
    // trong module bị cắt và màn hình đã gắn nhãn dữ liệu mẫu.
    if (decision === 'APPROVED' && pricing && invoice) {
      setInvoices((current) => dedupeInvoices([invoice, ...current]));
    }

    setUpgradeRequests((current) => current.map((item) => item.id === requestId ? reviewedRequest : item));
    persistPackageUpgradeReview(reviewedRequest);
    showToast(
      decision === 'APPROVED' ? 'Đã duyệt nâng cấp' : 'Đã từ chối yêu cầu',
      decision === 'APPROVED' ? 'success' : 'info',
      {
        description: decision === 'APPROVED'
          ? effectiveDate === 'immediate'
            ? `Tenant "${tenant.name}" đã được cập nhật sang gói ${targetPackage.name}. Hóa đơn ${invoiceId} đã được tạo.`
            : `Đã lên lịch chuyển tenant "${tenant.name}" sang gói ${targetPackage.name} vào ${tenant.subscriptionRenewsAt || tenant.trialEndDate || reviewedAt.slice(0, 10)}. Hóa đơn ${invoiceId} đã được tạo.`
          : `Yêu cầu nâng cấp của tenant "${tenant.name}" đã được từ chối và lưu lý do.`
      }
    );
    return true;
  };

  const handleCancelUpgradeRequest = (requestId: string) => {
    const request = upgradeRequests.find((item) => item.id === requestId);
    if (!request || request.status !== 'PENDING') return;

    const now = new Date().toISOString();
    const updatedRequest: PackageUpgradeRequest = {
      ...request,
      status: 'REJECTED',
      reviewNote: 'Tenant đã hủy yêu cầu.',
      reviewedAt: now,
      reviewedBy: 'Tenant Admin'
    };

    setUpgradeRequests((current) =>
      current.map((item) => (item.id === requestId ? updatedRequest : item))
    );
    persistPackageUpgradeReview(updatedRequest);

    setAlerts((current) => current.filter((alert) => alert.id !== `ALT-${requestId}`));
    showToast('Đã hủy yêu cầu', 'info', { description: 'Yêu cầu nâng cấp gói đã được hủy bỏ.' });
  };

  const handleSubmitInvoicePaymentProof = (
    invoiceId: string,
    proof: { transactionCode?: string; paymentProofNote?: string; paymentProofUrl?: string }
  ) => {
    const nowIso = new Date().toISOString();
    let updatedInvoiceTenantName = '';

    setInvoices((current) =>
      current.map((invoice) => {
        if (invoice.id !== invoiceId && invoice.invoiceCode !== invoiceId) return invoice;
        updatedInvoiceTenantName = invoice.tenantName;
        const newActivities = [
          ...(invoice.activities || []),
          {
            id: `ACT-${Date.now()}`,
            action: 'Nộp chứng từ chuyển khoản',
            actor: 'Tenant Admin',
            description: `Đã nộp mã GD/bút toán "${proof.transactionCode || 'Chưa cung cấp'}" và đính kèm chứng từ thanh toán`,
            createdAt: nowIso
          }
        ];
        return {
          ...invoice,
          transactionCode: proof.transactionCode || invoice.transactionCode,
          paymentProofUrl: proof.paymentProofUrl || invoice.paymentProofUrl,
          paymentProofNote: proof.paymentProofNote || invoice.paymentProofNote,
          paymentProofSubmittedAt: nowIso,
          activities: newActivities
        };
      })
    );

    // Bản sao chứng từ trên bản ghi tiệm (`tenant.customInvoices`) đã được bỏ: máy chủ không
    // lưu trường đó, nên ghi vào đấy chỉ là ghi vào một bản sao trong bộ nhớ.

    setAlerts((current) => [
      {
        id: `ALT-PAY-${Date.now()}`,
        title: `Chứng từ thanh toán: ${updatedInvoiceTenantName || 'Tenant'}`,
        description: `Hóa đơn ${invoiceId} đã được nộp chứng từ thanh toán. Super Admin cần đối soát và duyệt hóa đơn.`,
        type: 'info',
        createdAt: nowIso,
        isRead: false
      },
      ...current
    ]);

    showToast('Đã gửi thông tin thanh toán', 'success', {
      description: 'Hệ thống đã chuyển bằng chứng thanh toán đến Super Admin để đối soát & kích hoạt.'
    });
  };

  // Dynamic Badge counts to supply to sidebar
  const badgeCounts = {
    // BR-TENANT-001 đã bỏ trạng thái `EXPIRING`, nên huy hiệu này không còn đếm theo trạng
    // thái nữa mà đếm theo số ngày còn lại thật do máy chủ tính. Ngưỡng bảy ngày là quy ước
    // của giao diện — nó chỉ quyết định khi nào hiện lời nhắc, không quyết định quyền gì cả.
    // Tiệm đã quá hạn có `daysRemaining` âm và không được tính vào đây: chúng đã sang trạng
    // thái `OVERDUE` và hiện ở cột trạng thái, nhắc thêm một lần nữa là nhắc thừa.
    expiringSalons: tenants.filter((tenant) => (
      tenant.daysRemaining !== undefined
      && tenant.daysRemaining >= 0
      && tenant.daysRemaining <= EXPIRING_SOON_DAYS
    )).length,
    overdueInvoices: invoices.filter(i => i.status === 'OVERDUE').length,
    unreadAlerts: alerts.filter(a => !a.isRead).length,
    openTickets: tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
    pendingUpgrades: upgradeRequests.filter((request) => request.status === 'PENDING').length
  };

  /*
    ── Dải nhãn "Dữ liệu mẫu" của cổng Superadmin ────────────────────────────────────────
    Quyết định 8 của lộ trình: những màn nằm ngoài phạm vi backend MVP vẫn giữ
    `localStorage` và vẫn đi qua được khi demo, nhưng phải NÓI RA rằng dữ liệu là mẫu.
    Từ ngày 16 các màn đã nối chạy dữ liệu thật, nên hai loại số nằm cạnh nhau trong cùng
    một cổng — im lặng ở đây là để người xem tự đoán con số nào tra được vào database.

    Đặt thành một bảng ở nơi định tuyến chứ không rải `<MockDataNotice />` vào từng màn:
    dải nhãn phải xuất hiện ở cùng một chỗ trên mọi màn, và danh sách "màn nào chưa nối"
    là một sự thật của cả cổng chứ không phải của riêng từng tệp. Nối xong một màn thì xóa
    đúng một dòng ở đây — không phải đi tìm dải nhãn nằm lẫn trong một tệp vài nghìn dòng.
  */
  const MOCK_DATA_REASONS: Record<string, string> = {
    admins: 'Danh sách đọc thật từ máy chủ. Tài khoản chủ tiệm được cấp trong lúc lập tiệm, nên trang này chỉ để tra cứu — cấp và khóa tài khoản làm ở màn Quản lý Tenant.',
    packages: 'Bảng giá đọc thật từ máy chủ — đúng mã gói và giá mà màn lập tiệm dùng. Nhưng module quản lý gói nằm ngoài phạm vi MVP (§0 mục 13), nên mọi thay đổi ở đây chỉ sửa bản sao trong bộ nhớ và mất khi tải lại trang.',
    billing: 'Hóa đơn đăng ký đọc thật từ máy chủ. Nhưng mọi thao tác ghi — phát hành, đổi trạng thái, hoàn tiền — chỉ sửa bản sao trong bộ nhớ và mất khi tải lại trang.',
    reports: 'Số liệu trên trang đọc thật từ máy chủ — cùng danh sách tiệm và hóa đơn đăng ký với màn Thanh toán. Đây là tiền SalonSys thu TỪ các tiệm (BR-REV-008); doanh thu tiệm thu từ khách nằm ở màn Báo cáo của cổng chủ tiệm. Template báo cáo, lịch gửi định kỳ và xuất file nằm ngoài phạm vi MVP.',
    announcements: 'Bản tin hệ thống nằm ngoài phạm vi backend MVP, nên nội dung và lịch gửi chỉ lưu trên trình duyệt này.',
    settings: 'Cấu hình hệ thống lưu trên trình duyệt này. Máy chủ chưa có bảng cấu hình, nên các tùy chọn ở đây không ảnh hưởng tới hành vi thật của API.',
    support: 'Trung tâm hỗ trợ và phiếu yêu cầu nằm ngoài phạm vi 9 module lõi, nên mọi phiếu chỉ tồn tại trên trình duyệt này.',
    backup: 'Sao lưu và khôi phục nằm ngoài phạm vi backend MVP. Các thao tác ở đây là mô phỏng — không có bản sao lưu nào được tạo ra.'
  };

  /*
    Câu mở đầu riêng cho những màn KHÔNG phải dữ liệu mẫu.

    Chỉ có một màn như vậy, và nó lộ ra ở buổi tổng duyệt ngày 19: Báo cáo hệ thống đọc cùng
    danh sách tiệm và cùng mảng hóa đơn đăng ký với màn Thanh toán — cả hai đều từ máy chủ —
    nhưng lại đeo nhãn "Dữ liệu mẫu — chưa nối máy chủ". Màn nào không có mặt ở đây thì giữ
    nguyên câu cảnh báo mặc định.
  */
  const MOCK_DATA_TITLES: Record<string, string> = {
    admins: 'Phạm vi trang này.',
    packages: 'Phạm vi trang này.',
    billing: 'Phạm vi trang này.',
    reports: 'Phạm vi trang này.'
  };

  // Render proper sub-component view
  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview 
            tenants={tenants}
            invoices={invoices}
            alerts={alerts}
            tickets={tickets}
            onMarkAlertAsRead={handleMarkAlertAsRead}
            onClearAllAlerts={handleClearAllAlerts}
            onToggleTenantStatus={handleToggleTenantStatusFromOverview}
            onViewTenant={handleViewTenantFromOverview}
            onNavigateToTab={(tab) => setActiveTab(tab === 'tenants' ? 'salons' : tab)}
            searchQuery={searchQuery}
            reportCurrency={systemSettings.general.currency}
          />
        );
      case 'salons':
        return (
          <TenantManagement
            tenants={tenants}
            packages={packages}
            tenantAdmins={tenantAdmins}
            loading={directory.loading}
            loadError={directory.error}
            onReload={directory.reload}
            onAddTenant={handleAddTenant}
            onUpdateTenant={handleUpdateTenant}
            onRenewTenant={handleRenewTenant}
            onChangeTenantStatus={handleChangeTenantStatus}
            onDeleteTenant={handleDeleteTenant}
            selectedTenantFromOverview={selectedTenantFromOverview}
            clearSelectedTenant={() => setSelectedTenantFromOverview(null)}
            searchQuery={searchQuery}
            showConfirm={triggerConfirm}
            upgradeRequests={upgradeRequests}
            onReviewUpgradeRequest={handleReviewUpgradeRequest}
            reportCurrency={systemSettings.general.currency}
          />
        );
      case 'admins':
        return <TenantAdminManagement tenants={tenants} packages={packages} invitedAdmins={tenantAdmins} showConfirm={triggerConfirm} />;
      case 'packages':
        return (
          <SubscriptionPackages
            packages={packages}
            invoices={invoices}
            tenants={tenants}
            reportCurrency={systemSettings.general.currency}
          />
        );
      case 'billing':
        return (
          <BillingAndInvoices
            invoices={invoices}
            tenants={tenants}
            upgradeRequests={upgradeRequests}
            onReviewUpgradeRequest={handleReviewUpgradeRequest}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            onUpdateInvoice={handleUpdateInvoice}
            onCreateInvoice={handleCreateInvoice}
            showConfirm={triggerConfirm}
            reportCurrency={systemSettings.general.currency}
          />
        );
      case 'reports':
        return <SystemReports tenants={tenants} invoices={invoices} packages={packages} reportCurrency={systemSettings.general.currency} />;
      case 'announcements':
        return (
          <SuperAdminAnnouncements
            announcements={announcements}
            onUpdateAnnouncements={setAnnouncements}
            tenants={tenants}
            onNotify={(msg, type) => showToast(msg, type || 'info')}
          />
        );
      case 'settings':
        return <SystemSettings />;
      case 'account-preferences':
        return (
          <AccountPreferences
            themeMode={themeMode}
            language={interfaceLanguage}
            onThemeChange={setThemeMode}
            onLanguageChange={setInterfaceLanguage}
            onBack={() => setActiveTab('overview')}
            onOpenSystemSettings={() => setActiveTab('settings')}
          />
        );
      case 'security':
        return <SecurityAndLogs showConfirm={triggerConfirm} onOpenSecuritySettings={() => setActiveTab('settings')} />;
      case 'support':
        return <HelpAndSupport tickets={tickets} onTicketsChange={setTickets} showConfirm={triggerConfirm} />;
      case 'backup':
        return <DataBackup showConfirm={triggerConfirm} />;
      default:
        return (
          <div className="py-20 text-center text-brand-text-muted">
            Màn hình đang trong quá trình phát triển.
          </div>
        );
    }
  };

  // Confirm Modal component JSX
  const renderConfirmDialog = () => {
    if (!confirmDialog) return null;

    const { title, message, onConfirm } = confirmDialog;

    /* Dùng `ui/Modal` chứ không phải Modal cũ: hộp thoại xác nhận gần như luôn
       được mở TỪ TRONG một hộp thoại khác (bấm X ở modal tạo tenant sẽ hỏi
       "Hủy tạo Tenant"). `ui/Modal` có ngăn xếp hộp thoại nên lớp xác nhận này
       nằm đúng trên lớp gọi nó, Escape chỉ đóng nó thay vì đóng luôn biểu mẫu
       phía dưới, và focus được trả về đúng nút đã mở. Modal cũ nằm ngoài ngăn
       xếp đó nên bị lớp dưới che kín — nút X trông như không hoạt động. */
    return (
      <UiModal
        open
        onClose={() => setConfirmDialog(null)}
        size="small"
        title={title}
        icon={<Info aria-hidden="true" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDialog(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onConfirm();
                setConfirmDialog(null);
              }}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <p className="text-brand-text-muted">{message}</p>
      </UiModal>
    );
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-sm font-semibold text-brand-text-muted">
        Đang xác minh phiên đăng nhập...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage systemName={systemSettings.general.systemName} onLogin={handleLogin} />;
  }

  // BR-AUTH-024/025 — chưa chọn tiệm thì chưa vào portal được. Máy chủ cũng từ
  // chối mọi endpoint nghiệp vụ ở trạng thái này, nên cho vào portal chỉ tạo ra
  // một màn hình trống rỗng đầy lỗi 403.
  if (session?.mustSelectTenant) {
    return (
      <TenantPicker
        accountName={session.account.displayName}
        accountEmail={session.account.email}
        tenants={myTenants}
        loading={tenantsLoading}
        error={tenantsError}
        pendingTenantId={pendingTenantId}
        onSelect={handleSelectTenant}
        onRetry={() => setTenantsReloadToken((token) => token + 1)}
        onLogout={handleLogout}
      />
    );
  }

  const defaultTenantAccount = getDemoAccountByRole('TENANT_ADMIN');
  /**
   * Tiệm mà cổng chủ tiệm đang làm việc — từ ngày 8 là dữ liệu thật của phiên.
   *
   * Cả chuỗi tra ngược theo tên hiển thị và email trước đây đã biến mất cùng lý
   * do sinh ra nó: hồi dữ liệu còn nằm ở `localStorage`, không có gì nối tài
   * khoản đăng nhập với tiệm nên màn hình phải đoán bằng cách so tên. Nay
   * `GET /api/tenants/me` trả về đúng tiệm của phiên (BR-AUTH-024), và bảng
   * `user_tenants` đã trả lời câu hỏi "ai quản tiệm nào" ở máy chủ (BR-AUTH-023).
   */
  const targetTenant = myWorkspace.tenant || undefined;
  /**
   * Danh tính hiển thị trên cổng chủ tiệm.
   *
   * Từ ngày 8 mọi trường đều lấy từ phiên đăng nhập; `defaultTenantAccount` chỉ
   * còn là lưới an toàn cho lúc phiên chưa nạp xong, không còn là nguồn dữ liệu.
   */
  const tenantPortalAccount: DemoAccount = {
    ...defaultTenantAccount,
    ...sessionAccount,
    displayName: sessionAccount?.displayName || defaultTenantAccount.displayName,
    email: sessionAccount?.email || defaultTenantAccount.email,
    tenantId: sessionAccount?.tenantId || targetTenant?.id,
    tenantName: sessionAccount?.tenantName || targetTenant?.name || defaultTenantAccount.tenantName
  };

  /**
   * Ghi nhận tiệm của phiên trước khi hai cổng con render.
   *
   * Đặt ngay trong thân hàm chứ không trong `useEffect`: hiệu ứng chỉ chạy SAU lần render đầu,
   * mà lần render đầu chính là lúc mỗi màn dựng khóa lưu trữ và đọc `localStorage`. Chậm một
   * nhịp ở đây nghĩa là đọc nhầm ngăn của tiệm trước rồi mới sửa lại — thấy được bằng mắt.
   */
  setTenantStorageScope(
    portalRole === 'RECEPTIONIST' ? sessionAccount?.tenantId : tenantPortalAccount.tenantId
  );

  /*
    Bảng giá chỉ có ở phiên Superadmin — `GET /api/packages` trả 403 cho chủ tiệm. Nên với cổng
    chủ tiệm, phép tra ở đây LUÔN trượt, và trước ngày 20 nó rơi thẳng về một hằng số Premium:
    tiệm Enterprise bị báo "Gói Premium", chỉ được mở 3 chi nhánh thay vì 99, và thấy Kho vật tư
    với Vệ sinh & an toàn bị khóa dù đã trả tiền cho chúng.

    Dựng gói từ chính hồ sơ tiệm là đường duy nhất nói đúng: tên gói, giá đã chốt và hai hạn mức
    đều nằm sẵn trên `GET /api/tenants/me`.
  */
  const tenantPortalPackage = targetTenant
    ? getSubscriptionPackageForTenant(packages, targetTenant) || buildSubscriptionPackageFromTenant(targetTenant)
    : packages.find((pkg) => pkg.name === 'Premium') || packages[0];

  if (portalRole === 'TENANT_ADMIN') {
    return (
      <TenantAdminPortal
        account={tenantPortalAccount}
        tenantSwitcher={session?.tenant ? (
          <TenantSwitcher
            currentTenantId={session.tenant.id}
            currentTenantName={session.tenant.name}
            tenants={myTenants}
            pendingTenantId={pendingTenantId}
            onSelect={handleSelectTenant}
          />
        ) : undefined}
        tenant={targetTenant}
        subscriptionPackage={tenantPortalPackage}
        availablePackages={packages}
        invoices={targetTenant ? invoices.filter((invoice) => invoice.tenantId === targetTenant.id) : []}
        upgradeRequests={targetTenant ? upgradeRequests.filter((request) => request.tenantId === targetTenant.id) : []}
        onRequestUpgrade={(plan, billingCycle, effectiveDate) => {
          if (targetTenant) {
            handleRequestPackageUpgrade(targetTenant, tenantPortalAccount, plan, billingCycle, effectiveDate);
          }
        }}
        onCancelUpgradeRequest={handleCancelUpgradeRequest}
        onSubmitInvoicePaymentProof={handleSubmitInvoicePaymentProof}
        onUpdateTenant={handleUpdateTenant}
        onLogout={handleLogout}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        interfaceLanguage={interfaceLanguage}
        onLanguageChange={setInterfaceLanguage}
        tickets={tickets}
        onTicketsChange={setTickets}
        announcements={announcements}
        onUpdateAnnouncements={setAnnouncements}
      />
    );
  }

  if (portalRole === 'RECEPTIONIST') {
    return (
      <ReceptionistPortal
        account={sessionAccount || getDemoAccountByRole('RECEPTIONIST')}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="role-shell role-shell--superadmin flex min-h-screen bg-brand-bg text-brand-text">
      <a href="#superadmin-main" className="superadmin-skip-link">
        Bỏ qua điều hướng
      </a>
      
      {/* Sidebar component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen}
        badgeCounts={badgeCounts}
        systemName={systemSettings.general.systemName}
      />

      {/* Main workspace container */}
      <div className="superadmin-workspace flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        
        {/* Header component */}
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          alerts={alerts}
          onMarkAllAlertsAsRead={handleMarkAllAlertsAsRead}
          onDeleteAlert={handleDeleteAlert}
          onToggleArchiveAlert={handleToggleArchiveAlert}
          onClearAllAlerts={handleClearAllAlerts}
          onAlertClick={(id) => {
            handleMarkAlertAsRead(id);
            setActiveTab('security');
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onLogout={handleLogout}
          onOpenAccountSettings={() => setActiveTab('account-preferences')}
          onOpenSecurity={() => setActiveTab('security')}
          onOpenSupport={() => setActiveTab('support')}
          interfaceLanguage={interfaceLanguage}
        />

        {systemSettings.general.maintenanceMode && (
          <div role="status" className="sa-maintenance-banner mx-4 mt-4 flex flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-600 sm:mx-6 sm:flex-row sm:items-center lg:mx-8 dark:text-amber-400">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Chế độ bảo trì đang bật</p>
                <p className="text-[10px] mt-0.5 opacity-85">Tenant sẽ bị giới hạn truy cập khi chính sách được backend áp dụng. Superadmin vẫn có thể quản trị hệ thống.</p>
              </div>
            </div>
            <button type="button" onClick={() => setActiveTab('settings')} className="px-3 py-1.5 rounded-lg border border-amber-500/35 bg-transparent text-xs font-bold cursor-pointer whitespace-nowrap">
              Xem cấu hình
            </button>
          </div>
        )}

        {/* Dynamic subview panel */}
        <main id="superadmin-main" tabIndex={-1} className="role-main superadmin-main mx-auto w-full max-w-[1560px] flex-1 p-4 sm:p-6 lg:p-7 xl:p-8">
          <Suspense fallback={(
            <div className="py-20 text-center text-xs font-semibold text-brand-text-muted">
              Đang tải màn hình...
            </div>
          )}>
            {MOCK_DATA_REASONS[activeTab] && (
              <MockDataNotice
                title={MOCK_DATA_TITLES[activeTab]}
                reason={MOCK_DATA_REASONS[activeTab]}
                className="mb-5"
              />
            )}
            {renderView()}
          </Suspense>
        </main>
        
      </div>

      {/* Custom Global Dialogs */}
      {renderConfirmDialog()}

    </div>
  );
}
