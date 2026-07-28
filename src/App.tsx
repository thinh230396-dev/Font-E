import { lazy, Suspense, useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { 
  loadLocalStorageData, 
  saveLocalStorageData, 
  INITIAL_TENANTS, 
  INITIAL_PACKAGES, 
  INITIAL_ALERTS, 
  INITIAL_INVOICES
} from './data';
import { Tenant, SubscriptionPackage, SystemAlert, Invoice, TenantStatus, TenantAdminAccount, Ticket, PackageUpgradeRequest } from './types';
import { convertMoney, normalizeCurrency } from './utils/money';
import {
  getSubscriptionPackage,
  getSubscriptionPackageForTenant,
  getSubscriptionPrice,
  getYearlyPackagePrice,
  normalizeSubscriptionPackage
} from './utils/subscriptions';
import {
  loadSystemSettings,
  SYSTEM_SETTINGS_STORAGE_KEY,
  SYSTEM_SETTINGS_UPDATED_EVENT,
  type SystemSettingsModel
} from './utils/systemSettings';
import { recordAuditLog } from './utils/auditLogs';
import { inferPaymentGateway, normalizeInvoicePaymentData } from './utils/invoicePayments';
import { SUPPORT_MOCK_TICKETS } from './mockData/supportTickets';
import useGlobalModalGuard from './hooks/useGlobalModalGuard';
import {
  deletePackageUpgradeRequest,
  fetchPackageUpgradeRequests,
  loadPackageUpgradeRequests,
  persistPackageUpgradeRequest,
  persistPackageUpgradeReview,
  savePackageUpgradeRequests
} from './utils/packageUpgradeRequests';
import { resetTenantMockStorage } from './utils/mockDataReset';
import {
  deleteManagedAuthAccount,
  fetchAuthenticatedAccount,
  loginAccount,
  logoutAccount,
  persistManagedAuthAccount
} from './utils/authApi';

// Import subcomponents
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import TenantAdminPortal from './components/NailTenantAdminPortal';
import ReceptionistPortal from './components/ReceptionistPortal';
import type { InterfaceLanguage } from './components/AccountPreferences';
import { getDemoAccountByRole, type DemoAccount, type PortalRole } from './auth/demoAccounts';

const ALERTS_MOCK_SEED_KEY = 'alerts_mock_seed_v2';
const TENANTS_MOCK_SEED_KEY = 'tenants_mock_seed_v1';

const normalizeAccountIdentity = (value?: string) => (
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
);

const getEmailIdentity = (email?: string) => normalizeAccountIdentity(email?.split('@')[0]);

const tenantMatchesAdminIdentity = (tenant: Tenant, admin: TenantAdminAccount) => {
  const adminIdentities = new Set([
    normalizeAccountIdentity(admin.name),
    normalizeAccountIdentity(admin.username),
    getEmailIdentity(admin.email)
  ].filter(Boolean));
  const tenantIdentities = [
    normalizeAccountIdentity(tenant.adminName),
    normalizeAccountIdentity(tenant.adminUsername),
    getEmailIdentity(tenant.adminEmail)
  ].filter(Boolean);

  return tenantIdentities.some((identity) => adminIdentities.has(identity));
};

const loadAlertsWithOneTimeMocks = (): SystemAlert[] => {
  const savedAlerts = loadLocalStorageData<SystemAlert[]>('alerts', []);
  const mocksWereSeeded = loadLocalStorageData<boolean>(ALERTS_MOCK_SEED_KEY, false);

  if (mocksWereSeeded) return savedAlerts;

  saveLocalStorageData(ALERTS_MOCK_SEED_KEY, true);
  const mockIds = new Set(INITIAL_ALERTS.map((alert) => alert.id));
  return [...INITIAL_ALERTS, ...savedAlerts.filter((alert) => !mockIds.has(alert.id))];
};

const loadTenantsWithOneTimeMocks = (): Tenant[] => {
  const savedTenants = loadLocalStorageData<Tenant[]>('tenants', []);
  const mocksWereSeeded = loadLocalStorageData<boolean>(TENANTS_MOCK_SEED_KEY, false);
  if (mocksWereSeeded) return savedTenants;
  saveLocalStorageData(TENANTS_MOCK_SEED_KEY, true);
  const savedIds = new Set(savedTenants.map((tenant) => tenant.id));
  return [...INITIAL_TENANTS.filter((tenant) => !savedIds.has(tenant.id)), ...savedTenants];
};

const Overview = lazy(() => import('./components/Overview'));
const TenantManagement = lazy(() => import('./components/TenantManagement'));
const TenantAdminManagement = lazy(() => import('./components/TenantAdminManagement'));
const SubscriptionPackages = lazy(() => import('./components/SubscriptionPackages'));
const BillingAndInvoices = lazy(() => import('./components/BillingAndInvoices'));
const SystemReports = lazy(() => import('./components/SystemReports'));
const SystemSettings = lazy(() => import('./components/SystemSettings'));
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

const AUDIT_SENSITIVE_FIELDS = new Set(['adminTempPassword', 'tempPassword', 'password', 'token']);
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

const toAuditValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') return '[dữ liệu có cấu trúc]';
  return String(value);
};

const buildAuditChanges = <T extends object>(current: T, patch: Partial<T>) => (
  Object.entries(patch)
    .filter(([field, value]) => !AUDIT_SENSITIVE_FIELDS.has(field) && value !== (current as Record<string, unknown>)[field])
    .slice(0, 12)
    .map(([field, value]) => ({
      field,
      before: toAuditValue((current as Record<string, unknown>)[field]),
      after: toAuditValue(value)
    }))
);

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

  const [sessionAccount, setSessionAccount] = useState<DemoAccount | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const isAuthenticated = Boolean(sessionAccount);
  const portalRole: PortalRole = sessionAccount?.role || 'SUPERADMIN';
  // Mobile sidebar visibility state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('salonsys_theme') === 'dark' ? 'dark' : 'light';
  });
  const [interfaceLanguage, setInterfaceLanguage] = useState<InterfaceLanguage>(() => {
    if (typeof window === 'undefined') return 'vi';
    return localStorage.getItem('salonsys_interface_language') === 'en' ? 'en' : 'vi';
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettingsModel>(loadSystemSettings);
  
  // Navigation active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Core application states loaded from localStorage
  const [tenants, setTenants] = useState<Tenant[]>(loadTenantsWithOneTimeMocks);
  const [packages, setPackages] = useState<SubscriptionPackage[]>(() => 
    loadLocalStorageData<SubscriptionPackage[]>('packages', INITIAL_PACKAGES).map(normalizeSubscriptionPackage)
  );
  const [alerts, setAlerts] = useState<SystemAlert[]>(loadAlertsWithOneTimeMocks);
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const existingInvoices = loadLocalStorageData<Invoice[]>('invoices', []);
    const sourceInvoices = existingInvoices.length > 0
      ? existingInvoices
      : loadLocalStorageData<Invoice[]>('invoices_v2', INITIAL_INVOICES);
    return dedupeInvoices(sourceInvoices.map((invoice) => normalizeInvoicePaymentData(normalizeInvoiceDueDate(invoice))));
  });
  const [tenantAdmins, setTenantAdmins] = useState<TenantAdminAccount[]>(() =>
    loadLocalStorageData<TenantAdminAccount[]>('tenant_admins', [])
  );
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

  // Global search state in Header
  const [searchQuery, setSearchQuery] = useState('');

  // Selected tenant from overview to open details panel in tenant screen
  const [selectedTenantFromOverview, setSelectedTenantFromOverview] = useState<Tenant | null>(null);

  // Custom toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  // Custom confirm modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom alert modal state
  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'error' | 'warning';
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  };

  useEffect(() => {
    let active = true;
    void fetchAuthenticatedAccount().then((account) => {
      if (active) setSessionAccount(account);
    }).finally(() => {
      if (active) setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem('salonsys_theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = interfaceLanguage;
    document.documentElement.dataset.language = interfaceLanguage;
    localStorage.setItem('salonsys_interface_language', interfaceLanguage);
  }, [interfaceLanguage]);

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

  const handleLogin = async (identifier: string, password: string, remember: boolean): Promise<boolean> => {
    const account = await loginAccount(identifier, password, remember);
    if (!account) return false;
    setSessionAccount(account);
    return true;
  };

  const handleLogout = () => {
    setSessionAccount(null);
    void logoutAccount();
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Global alert override (now shows a premium blocking modal dialog)
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message: string) => {
      const lower = message.toLowerCase();
      let type: 'success' | 'info' | 'error' | 'warning' = 'info';
      let title = 'Thông báo';
      if (lower.includes('thành công') || lower.includes('hoàn tất') || lower.includes('thành công!')) {
        type = 'success';
        title = 'Thành công';
      } else if (lower.includes('cảnh báo') || lower.includes('yêu cầu')) {
        type = 'warning';
        title = 'Cảnh báo';
      } else if (lower.includes('lỗi') || lower.includes('thất bại') || lower.includes('bắt buộc')) {
        type = 'error';
        title = 'Lỗi hệ thống';
      }
      setAlertDialog({ title, message, type });
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  // Sync state changes to LocalStorage
  useEffect(() => {
    saveLocalStorageData('tenants', tenants);
  }, [tenants]);

  useEffect(() => {
    saveLocalStorageData('packages', packages);
  }, [packages]);

  useEffect(() => {
    saveLocalStorageData('alerts', alerts);
  }, [alerts]);

  useEffect(() => {
    saveLocalStorageData('invoices', invoices);
    saveLocalStorageData('invoices_v2', invoices);
  }, [invoices]);

  useEffect(() => {
    saveLocalStorageData('tenant_admins', tenantAdmins);
  }, [tenantAdmins]);

  useEffect(() => {
    savePackageUpgradeRequests(upgradeRequests);
  }, [upgradeRequests]);

  useEffect(() => {
    let active = true;
    void fetchPackageUpgradeRequests().then((remoteRequests) => {
      if (!active || remoteRequests === null) return;
      setUpgradeRequests((current) => {
        if (remoteRequests.length === 0 && current.length > 0) {
          return current;
        }
        return remoteRequests;
      });
    });
    return () => { active = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    saveLocalStorageData('support_tickets', tickets);
  }, [tickets]);

  // Migrate legacy tenant data from a package-name link to a stable package-id link.
  // Locked pricing is only filled once, so future package price changes do not silently
  // alter the commercial agreement of existing tenants.
  useEffect(() => {
    setTenants((currentTenants) => {
      let hasChanges = false;
      const migrated = currentTenants.map((tenant) => {
        const pkg = packages.find((item) => item.id === tenant.subscriptionPackageId)
          || getSubscriptionPackage(packages, tenant.packageName);
        if (!pkg) return tenant;

        const cycle = tenant.billingCycle || 'monthly';
        const pricing = getSubscriptionPrice(packages, pkg.name, cycle);
        const nextFields: Partial<Tenant> = {};
        if (tenant.subscriptionPackageId !== pkg.id) nextFields.subscriptionPackageId = pkg.id;
        if (tenant.packageName !== pkg.name) {
          nextFields.packageName = pkg.name;
          nextFields.plan = pkg.name;
          nextFields.subscriptionPlan = pkg.name;
        }
        if (!tenant.subscriptionPackageVersion) nextFields.subscriptionPackageVersion = pkg.version || 1;
        if (tenant.subscriptionPrice === undefined) nextFields.subscriptionPrice = pricing.price;
        if (!tenant.subscriptionCurrency) nextFields.subscriptionCurrency = pricing.currency;
        if (!tenant.subscriptionStartedAt) nextFields.subscriptionStartedAt = tenant.planStartDate || tenant.createdAt;
        if (!tenant.subscriptionRenewsAt) nextFields.subscriptionRenewsAt = getTenantSubscriptionRenewalDate(tenant);

        if (Object.keys(nextFields).length === 0) return tenant;
        hasChanges = true;
        return { ...tenant, ...nextFields };
      });

      return hasChanges ? migrated : currentTenants;
    });
  }, [packages]);

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

  useEffect(() => {
    setPackages((currentPackages) => {
      let hasChanges = false;
      const synchronized = currentPackages.map((pkg) => {
        const activeTenants = tenants.filter((tenant) => (
          tenant.subscriptionPackageId === pkg.id || tenant.packageName === pkg.name
        )).length;
        if (pkg.activeTenants === activeTenants) return pkg;
        hasChanges = true;
        return { ...pkg, activeTenants };
      });
      return hasChanges ? synchronized : currentPackages;
    });
  }, [tenants]);

  // Approved changes scheduled for the next cycle remain pending until their
  // effective date. This prevents tenants from receiving new entitlements early.
  useEffect(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const dueTenantIds = tenants
      .filter((tenant) => tenant.pendingSubscriptionChange?.effectiveAt
        && tenant.pendingSubscriptionChange.effectiveAt <= todayIso)
      .map((tenant) => tenant.id);
    if (dueTenantIds.length === 0) return;

    setTenants((current) => current.map((tenant) => {
      const pending = tenant.pendingSubscriptionChange;
      if (!pending || !dueTenantIds.includes(tenant.id)) return tenant;
      const cycleDays = getBillingCycleDays(pending.billingCycle);
      const activity = {
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: 'Hệ thống',
        type: 'subscription',
        description: `Đã áp dụng thay đổi theo lịch sang gói ${pending.packageName}.`
      };
      return {
        ...tenant,
        packageName: pending.packageName,
        plan: pending.packageName,
        subscriptionPlan: pending.packageName,
        subscriptionPackageId: pending.packageId,
        subscriptionPackageVersion: pending.packageVersion,
        subscriptionPrice: pending.price,
        subscriptionCurrency: pending.currency,
        billingCycle: pending.billingCycle,
        planStartDate: pending.effectiveAt,
        subscriptionStartedAt: pending.effectiveAt,
        subscriptionRenewsAt: getIsoDateAfterDaysFrom(pending.effectiveAt, cycleDays),
        daysRemaining: cycleDays,
        effectiveDate: 'immediate',
        pendingSubscriptionChange: undefined,
        customActivities: [activity, ...(tenant.customActivities || [])],
        lastSync: new Date().toISOString()
      };
    }));
  }, [tenants]);

  // A deprecated package stops accepting new tenants immediately. Existing tenants
  // are migrated only after their own subscription reaches its expiry date.
  useEffect(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const pendingRetirements = packages.filter((pkg) => pkg.retirementRequest);
    if (pendingRetirements.length === 0) return;

    const migrations = tenants.flatMap((tenant) => {
      const sourcePackage = pendingRetirements.find((pkg) => (
        tenant.subscriptionPackageId === pkg.id || tenant.packageName === pkg.name
      ));
      if (!sourcePackage?.retirementRequest || !isTenantSubscriptionExpired(tenant, todayIso)) return [];

      const replacementPackage = packages.find((pkg) => pkg.id === sourcePackage.retirementRequest?.replacementPackageId)
        || getSubscriptionPackage(packages, sourcePackage.retirementRequest.replacementPackageName);
      if (!replacementPackage || (replacementPackage.status || 'ACTIVE') !== 'ACTIVE') return [];

      return [{ tenant, sourcePackage, replacementPackage }];
    });

    if (migrations.length === 0) return;

    setTenants((currentTenants) => currentTenants.map((tenant) => {
      const migration = migrations.find((item) => item.tenant.id === tenant.id);
      if (!migration) return tenant;

      const { sourcePackage, replacementPackage } = migration;
      const cycle = tenant.billingCycle || 'monthly';
      const pricing = getSubscriptionPrice(packages, replacementPackage.name, cycle);
      const cycleDays = getBillingCycleDays(cycle);
      const now = new Date();
      const activity = {
        date: now.toISOString().replace('T', ' ').slice(0, 16),
        user: 'Hệ thống',
        type: 'subscription',
        description: `Tự động chuyển từ gói ${sourcePackage.name} sang ${replacementPackage.name} sau khi subscription cũ hết hạn.`
      };

      return {
        ...tenant,
        packageName: replacementPackage.name,
        plan: replacementPackage.name,
        subscriptionPlan: replacementPackage.name,
        subscriptionPackageId: replacementPackage.id,
        subscriptionPackageVersion: replacementPackage.version || 1,
        subscriptionPrice: pricing.price,
        subscriptionCurrency: pricing.currency,
        subscriptionStartedAt: todayIso,
        subscriptionRenewsAt: getIsoDateAfterDays(cycleDays),
        daysRemaining: cycleDays,
        status: 'ACTIVE',
        paymentStatus: 'PENDING',
        allowOnlineBooking: replacementPackage.capabilities?.some((capability) => capability.key === 'online_booking' && capability.enabled) === true,
        customActivities: [activity, ...(tenant.customActivities || [])],
        lastSync: now.toISOString()
      };
    }));

    setInvoices((currentInvoices) => {
      const generatedInvoices: Invoice[] = migrations
        .filter(({ tenant, sourcePackage }) => !currentInvoices.some((invoice) => invoice.id === `INV-AUTO-${sourcePackage.id}-${tenant.id}-${todayIso}`))
        .map(({ tenant, sourcePackage, replacementPackage }) => {
          const cycle = tenant.billingCycle || 'monthly';
          const pricing = getSubscriptionPrice(packages, replacementPackage.name, cycle);
          const invoiceCurrency = normalizeCurrency(tenant.currency);
          const cycleDays = getBillingCycleDays(cycle);
          return {
            id: `INV-AUTO-${sourcePackage.id}-${tenant.id}-${todayIso}`,
            invoiceCode: `INV-AUTO-${tenant.id}-${todayIso}`,
            tenantId: tenant.id,
            tenantName: tenant.name,
            type: 'PLAN_CHANGE',
            planName: replacementPackage.name,
            packageId: replacementPackage.id,
            packageVersion: replacementPackage.version || 1,
            billingCycle: cycle,
            servicePeriod: `Tự động chuyển sang ${replacementPackage.name} từ ${todayIso}`,
            dueDate: todayIso,
            amount: convertMoney(pricing.price, pricing.currency, invoiceCurrency),
            currency: invoiceCurrency,
            status: 'PENDING',
            note: `Gói ${sourcePackage.name} đã ngừng; chuyển tự động khi subscription hết hạn.`,
            createdAt: todayIso,
            billingPeriod: `Đến ${getIsoDateAfterDays(cycleDays).split('-').reverse().join('/')}`
          };
        });
      return generatedInvoices.length > 0 ? dedupeInvoices([...generatedInvoices, ...currentInvoices]) : currentInvoices;
    });
  }, [packages, tenants]);

  useEffect(() => {
    const completedPackageIds = packages
      .filter((pkg) => pkg.retirementRequest)
      .filter((pkg) => !tenants.some((tenant) => tenant.subscriptionPackageId === pkg.id || tenant.packageName === pkg.name))
      .map((pkg) => pkg.id);
    if (completedPackageIds.length === 0) return;

    setPackages((currentPackages) => currentPackages.map((pkg) => (
      completedPackageIds.includes(pkg.id)
        ? { ...pkg, status: 'ARCHIVED', retirementRequest: undefined, updatedAt: new Date().toISOString() }
        : pkg
    )));
  }, [packages, tenants]);

  const syncTenantAuthAccount = (tenant: Tenant) => {
    if (!tenant.adminEmail || !tenant.adminName) return;
    void persistManagedAuthAccount({
      id: tenant.tenantAdminId || tenant.id,
      email: tenant.adminEmail,
      username: tenant.adminUsername,
      password: tenant.adminTempPassword,
      role: 'TENANT_ADMIN',
      displayName: tenant.adminName,
      tenantId: tenant.id,
      tenantName: tenant.name,
      status: tenant.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
    }).catch((error) => {
      setToast({
        message: error instanceof Error ? error.message : 'Không thể đồng bộ tài khoản đăng nhập.',
        type: 'error'
      });
    });
  };

  const syncAdminAuthAccount = (admin: TenantAdminAccount) => {
    void persistManagedAuthAccount({
      id: admin.id,
      email: admin.email,
      username: admin.username,
      password: admin.tempPassword,
      role: 'TENANT_ADMIN',
      displayName: admin.name,
      tenantId: admin.tenantIds[0],
      tenantName: admin.tenantName,
      status: admin.status
    }).catch((error) => {
      setToast({
        message: error instanceof Error ? error.message : 'Không thể đồng bộ tài khoản đăng nhập.',
        type: 'error'
      });
    });
  };

  // Handle Tenant CRUD operations
  const handleAddTenant = (newTenantData: Omit<Tenant, 'createdAt' | 'lastLogin'>) => {
    const newId = newTenantData.id.trim().toUpperCase();
    if (tenants.some((tenant) => tenant.id.toLowerCase() === newId.toLowerCase())) {
      alert(`Mã tenant "${newId}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    const invoiceCurrency = normalizeCurrency(newTenantData.currency);
    const selectedPackage = getSubscriptionPackage(packages, newTenantData.packageName);
    const selectedCycle = newTenantData.billingCycle || 'monthly';
    const packagePricing = getSubscriptionPrice(packages, newTenantData.packageName, selectedCycle);
    const packageCurrency = normalizeCurrency(packagePricing.currency);
    const packagePrice = packagePricing.price;
    const newTenant: Tenant = {
      ...newTenantData,
      id: newId,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: 'Chưa đăng nhập',
      lastSync: new Date().toISOString(),
      subscriptionPackageId: selectedPackage?.id,
      subscriptionPackageVersion: selectedPackage?.version || 1,
      subscriptionPrice: packagePricing.price,
      subscriptionCurrency: packagePricing.currency,
      subscriptionStartedAt: new Date().toISOString().slice(0, 10),
      subscriptionRenewsAt: getIsoDateAfterDays(getBillingCycleDays(selectedCycle))
    };
    
    setTenants([newTenant, ...tenants]);
    syncTenantAuthAccount(newTenant);

    const billingDueDays = newTenant.daysRemaining ?? getBillingCycleDays(newTenant.billingCycle);

    // Also simulate creating an invoice for this tenant
    const newInvoice: Invoice = {
      id: `INV-2026-${Math.floor(800 + Math.random() * 200)}`,
      tenantName: newTenant.name,
      tenantId: newId,
      packageId: selectedPackage?.id,
      packageVersion: selectedPackage?.version || 1,
      planName: newTenant.packageName,
      billingCycle: selectedCycle,
      amount: convertMoney(packagePrice, packageCurrency, invoiceCurrency),
      currency: invoiceCurrency,
      dueDate: getIsoDateAfterDays(billingDueDays),
      status: 'PENDING',
      billingPeriod: 'Tháng 7/2026',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setInvoices(prevInvoices => dedupeInvoices([newInvoice, ...prevInvoices]));

    recordAuditLog({
      eventCode: 'TENANT.CREATED',
      event: 'Tạo tenant mới',
      description: `Superadmin đã tạo tenant "${newTenant.name}" và khởi tạo hóa đơn đầu tiên ${newInvoice.id}.`,
      severity: 'medium',
      status: 'success',
      category: 'TENANT',
      resource: `Tenant ${newTenant.name}`,
      resourceId: newTenant.id,
      method: 'CLIENT /tenants',
      metadata: { package: newTenant.packageName, invoiceId: newInvoice.id }
    });

    alert(`Đã thêm tenant "${newTenant.name}" thành công! Hóa đơn đầu tiên ${newInvoice.id} đã được khởi tạo.`);
  };

  const handleUpdateTenant = (id: string, updatedFields: Partial<Tenant>) => {
    const currentTenant = tenants.find((tenant) => tenant.id === id);
    if (currentTenant && (
      updatedFields.adminEmail !== undefined
      || updatedFields.adminName !== undefined
      || updatedFields.adminUsername !== undefined
      || updatedFields.adminTempPassword !== undefined
      || updatedFields.status !== undefined
      || updatedFields.tenantAdminId !== undefined
    )) {
      syncTenantAuthAccount({ ...currentTenant, ...updatedFields });
    }
    setTenants(prevTenants => prevTenants.map(t => {
      if (t.id === id) {
        let subscriptionFields: Partial<Tenant> = {};
        if (updatedFields.packageName && updatedFields.packageName !== t.packageName) {
          const targetPackage = getSubscriptionPackage(packages, updatedFields.packageName);
          const cycle = updatedFields.billingCycle || t.billingCycle || 'monthly';
          const pricing = getSubscriptionPrice(packages, updatedFields.packageName, cycle);
          subscriptionFields = {
            subscriptionPackageId: targetPackage?.id,
            subscriptionPackageVersion: targetPackage?.version || 1,
            subscriptionPrice: updatedFields.subscriptionPrice ?? pricing.price,
            subscriptionCurrency: updatedFields.subscriptionCurrency ?? pricing.currency,
            subscriptionStartedAt: updatedFields.planStartDate || new Date().toISOString().slice(0, 10),
            subscriptionRenewsAt: getIsoDateAfterDays(getBillingCycleDays(cycle))
          };
        }
        const nextTenant = { ...t, ...updatedFields, ...subscriptionFields, lastSync: new Date().toISOString() };
        
        // Let's check if there are new custom invoices added
        if (updatedFields.customInvoices && updatedFields.customInvoices.length > (t.customInvoices?.length || 0)) {
          const newInvs = updatedFields.customInvoices.filter(newInv => 
            !(t.customInvoices || []).some(oldInv => oldInv.id === newInv.id)
          );
          
          if (newInvs.length > 0) {
            const standardNewInvs: Invoice[] = newInvs.map((newInv: any) => {
              let standardStatus: Invoice['status'] = 'PENDING';
              const sUpper = newInv.status?.toUpperCase() || '';
              if (
                sUpper === 'PAID' || 
                newInv.status === 'Đã thanh toán' || 
                newInv.status === 'Đã thu tiền' || 
                newInv.status === 'Thu tự động thành công'
              ) {
                standardStatus = 'PAID';
              } else if (sUpper === 'OVERDUE' || newInv.status === 'Quá hạn') {
                standardStatus = 'OVERDUE';
              } else if (sUpper === 'CANCELLED' || newInv.status === 'Đã hủy') {
                standardStatus = 'CANCELLED';
              } else {
                standardStatus = 'PENDING';
              }

              const standardType: Invoice['type'] = newInv.type === 'Gia hạn gói' || newInv.type === 'RENEWAL'
                ? 'RENEWAL'
                : (newInv.type === 'Nâng/Đổi gói' || newInv.type === 'PLAN_CHANGE' ? 'PLAN_CHANGE' : 'MONTHLY_SUBSCRIPTION');

              return {
                id: newInv.id,
                invoiceCode: newInv.invoiceCode || newInv.id,
                tenantId: id,
                tenantName: nextTenant.name,
                type: standardType,
                planName: newInv.packageName || nextTenant.packageName,
                packageId: newInv.packageId || nextTenant.subscriptionPackageId,
                packageVersion: newInv.packageVersion || nextTenant.subscriptionPackageVersion,
                billingCycle: newInv.billingCycle || nextTenant.billingCycle || 'monthly',
                servicePeriod: newInv.period || newInv.servicePeriod,
                dueDate: newInv.dueDate,
                amount: newInv.amount,
                currency: normalizeCurrency(nextTenant.currency),
                status: standardStatus,
                paymentMethod: newInv.paymentMethod,
                paymentGateway: newInv.paymentGateway || inferPaymentGateway(newInv.paymentMethod),
                transactionCode: newInv.transactionCode || newInv.transactionId,
                processingFee: newInv.processingFee,
                netReceived: newInv.netReceived,
                paymentAttempts: newInv.paymentAttempts,
                note: newInv.notes || newInv.note,
                createdAt: newInv.createdAt || new Date().toISOString().slice(0, 10),
                paidAt: standardStatus === 'PAID' ? (newInv.paidAt || new Date().toISOString().slice(0, 10)) : undefined,
                billingPeriod: newInv.period || newInv.servicePeriod || 'Tháng dịch vụ'
              };
            }).map((invoice) => normalizeInvoicePaymentData(normalizeInvoiceDueDate(invoice)));
            
            setInvoices(prevInvoices => dedupeInvoices([...standardNewInvs, ...prevInvoices]));
          }
        }
        
        return nextTenant;
      }
      return t;
    }));

    if (currentTenant) {
      const changes = buildAuditChanges(currentTenant, updatedFields);
      recordAuditLog({
        eventCode: 'TENANT.UPDATED',
        event: 'Cập nhật thông tin tenant',
        description: `Superadmin đã cập nhật ${changes.length || 1} trường của tenant "${currentTenant.name}".`,
        severity: updatedFields.status || updatedFields.packageName ? 'medium' : 'low',
        status: 'success',
        category: 'TENANT',
        resource: `Tenant ${currentTenant.name}`,
        resourceId: id,
        method: `CLIENT /tenants/${id}`,
        changes
      });
    }
  };

  const handleDeleteTenant = (id: string) => {
    const deletedTenant = tenants.find((tenant) => tenant.id === id);
    if (!deletedTenant) return;
    const deletedRequests = upgradeRequests.filter((request) => request.tenantId === id);
    const remainingTenants = tenants.filter((tenant) => tenant.id !== id);
    const adminStillUsed = remainingTenants.some((tenant) => (
      tenant.adminEmail.trim().toLowerCase() === deletedTenant.adminEmail.trim().toLowerCase()
      || (deletedTenant.tenantAdminId && tenant.tenantAdminId === deletedTenant.tenantAdminId)
    ));

    setTenants(remainingTenants);
    setInvoices((current) => current.filter((invoice) => invoice.tenantId !== id));
    setUpgradeRequests((current) => current.filter((request) => request.tenantId !== id));
    setAlerts((current) => current.filter((alert) => alert.targetTenantId !== id));
    setTickets((current) => current.filter((ticket) => ticket.tenantId !== id));
    setTenantAdmins((current) => current.flatMap((admin) => {
      if (!admin.tenantIds.includes(id)) return [admin];
      const tenantIds = admin.tenantIds.filter((tenantId) => tenantId !== id);
      if (tenantIds.length === 0 && admin.source === 'TENANT') return [];
      return [{
        ...admin,
        tenantIds,
        tenantCount: tenantIds.length,
        tenantName: remainingTenants.find((tenant) => tenantIds.includes(tenant.id))?.name || 'Chưa liên kết tiệm'
      }];
    }));
    resetTenantMockStorage(deletedTenant.name);
    deletedRequests.forEach((request) => {
      void deletePackageUpgradeRequest(request.id);
    });
    if (!adminStillUsed) {
      void deleteManagedAuthAccount(deletedTenant.tenantAdminId || deletedTenant.adminEmail).catch(() => {
        // The tenant data has already been removed locally; a later sync can retry account cleanup.
      });
    }
    if (deletedTenant) {
      recordAuditLog({
        eventCode: 'TENANT.DELETED',
        event: 'Xóa tenant',
        description: `Superadmin đã xóa tenant "${deletedTenant.name}" và các hóa đơn liên kết khỏi dữ liệu trình duyệt.`,
        severity: 'high',
        status: 'success',
        category: 'TENANT',
        resource: `Tenant ${deletedTenant.name}`,
        resourceId: id,
        method: `CLIENT /tenants/${id}`
      });
    }
  };

  // Toggle tenant status from overview
  const handleToggleTenantStatusFromOverview = (id: string, newStatus: TenantStatus) => {
    const currentTenant = tenants.find((tenant) => tenant.id === id);
    if (!currentTenant || currentTenant.status === newStatus) return;
    setTenants((current) => current.map((tenant) => (
      tenant.id === id ? { ...tenant, status: newStatus } : tenant
    )));
    setAlertDialog({
      title: 'Đã cập nhật trạng thái',
      message: `Tenant "${currentTenant.name}" đã được chuyển sang trạng thái ${newStatus}.`,
      type: newStatus === 'SUSPENDED' ? 'warning' : 'success'
    });
    if (currentTenant && currentTenant.status !== newStatus) {
      recordAuditLog({
        eventCode: 'TENANT.STATUS.UPDATED',
        event: 'Cập nhật trạng thái tenant',
        description: `Trạng thái tenant "${currentTenant.name}" được chuyển từ ${currentTenant.status} sang ${newStatus}.`,
        severity: newStatus === 'SUSPENDED' ? 'high' : 'medium',
        status: 'success',
        category: 'TENANT',
        resource: `Tenant ${currentTenant.name}`,
        resourceId: id,
        method: `CLIENT /tenants/${id}/status`,
        changes: [{ field: 'status', before: currentTenant.status, after: newStatus }]
      });
    }
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
    alert('Đã đánh dấu tất cả cảnh báo hệ thống là đã đọc!');
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    alert('Đã xóa sạch cảnh báo.');
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
          description: `${currentInvoice.status} → ${newStatus}`,
          actor: 'superadmin@salonsys.vn',
          createdAt: now
        }
      ] : (paymentDetails.activities || inv.activities)
    }) : inv));
    
    // Also sync back to tenant's customInvoices
    setTenants(prevTenants => prevTenants.map(t => {
      if (t.customInvoices && t.customInvoices.some(inv => inv.id === id)) {
        return {
          ...t,
          customInvoices: t.customInvoices.map(inv => {
            if (inv.id === id) {
              let displayStatus = 'Đang chờ';
              if (newStatus === 'PAID') displayStatus = 'Đã thanh toán';
              else if (newStatus === 'OVERDUE') displayStatus = 'Quá hạn';
              else if (newStatus === 'CANCELLED') displayStatus = 'Đã hủy';
              return {
                ...inv,
                status: displayStatus,
                paymentMethod: paymentDetails.paymentMethod || inv.paymentMethod,
                transactionCode: paymentDetails.transactionCode || inv.transactionCode
              };
            }
            return inv;
          })
        };
      }
      return t;
    }));

    setAlertDialog({
      title: 'Thông báo',
      message: `Đã cập nhật hóa đơn ${id} thành trạng thái: ${newStatus}`,
      type: 'info'
    });
    if (currentInvoice && currentInvoice.status !== newStatus) {
      recordAuditLog({
        eventCode: 'BILLING.INVOICE.UPDATED',
        event: 'Cập nhật trạng thái hóa đơn',
        description: `Hóa đơn ${id} của tenant "${currentInvoice.tenantName}" được chuyển sang ${newStatus}.`,
        severity: newStatus === 'CANCELLED' || newStatus === 'OVERDUE' ? 'medium' : 'low',
        status: 'success',
        category: 'BILLING',
        resource: `Hóa đơn ${id}`,
        resourceId: id,
        method: `CLIENT /invoices/${id}`,
        changes: [{ field: 'status', before: currentInvoice.status, after: newStatus }]
      });
    }
  };

  const handleUpdateInvoice = (id: string, updates: Partial<Invoice>) => {
    const currentInvoice = invoices.find((invoice) => invoice.id === id);
    if (!currentInvoice) return;
    const changes = buildAuditChanges(currentInvoice, updates);
    setInvoices((current) => current.map((invoice) => invoice.id === id ? {
      ...invoice,
      ...updates,
      updatedAt: new Date().toISOString()
    } : invoice));
    recordAuditLog({
      eventCode: 'BILLING.INVOICE.DETAILS.UPDATED',
      event: 'Cập nhật nghiệp vụ hóa đơn',
      description: `Superadmin cập nhật ${changes.length || 1} trường của hóa đơn ${id}.`,
      severity: updates.refundedAmount || updates.reconciliationStatus === 'MISMATCHED' ? 'medium' : 'low',
      status: 'success',
      category: 'BILLING',
      resource: `Hóa đơn ${id}`,
      resourceId: id,
      method: `CLIENT /invoices/${id}/details`,
      changes
    });
  };

  const handleCreateInvoice = (invoice: Invoice) => {
    if (invoices.some((current) => current.id === invoice.id || current.invoiceCode === invoice.invoiceCode)) {
      alert(`Mã hóa đơn ${invoice.invoiceCode || invoice.id} đã tồn tại.`);
      return false;
    }
    setInvoices((current) => dedupeInvoices([normalizeInvoicePaymentData(normalizeInvoiceDueDate(invoice)), ...current]));
    recordAuditLog({
      eventCode: 'BILLING.INVOICE.CREATED',
      event: 'Tạo hóa đơn thủ công',
      description: `Superadmin tạo hóa đơn ${invoice.invoiceCode || invoice.id} cho tenant "${invoice.tenantName}".`,
      severity: 'medium', status: 'success', category: 'BILLING', resource: `Hóa đơn ${invoice.id}`,
      resourceId: invoice.id, method: 'CLIENT /invoices', metadata: { tenantId: invoice.tenantId, amount: invoice.amount, currency: invoice.currency || 'VND' }
    });
    return true;
  };

  // Subscription update pricing/features
  const handleUpdatePackage = (id: string, updatedFields: Partial<SubscriptionPackage>) => {
    const currentPackage = packages.find((pkg) => pkg.id === id);
    if (!currentPackage) return;

    const packageHasTenants = tenants.some((tenant) => tenant.subscriptionPackageId === id || tenant.packageName === currentPackage.name);
    if (packageHasTenants && updatedFields.status === 'ARCHIVED') {
      alert('Không thể lưu trữ ngay gói đang có tenant. Hãy dùng “Ngừng đăng ký” và chọn gói thay thế.');
      return;
    }
    if (packageHasTenants && updatedFields.status === 'DEPRECATED' && !currentPackage.retirementRequest) {
      alert('Gói đang có tenant sử dụng. Hãy tạo yêu cầu “Ngừng đăng ký” để tenant được chuyển an toàn khi hết hạn.');
      return;
    }

    const nextName = updatedFields.name?.trim() || currentPackage.name;
    const duplicateName = packages.some((pkg) => pkg.id !== id && pkg.name.toLowerCase() === nextName.toLowerCase());
    if (duplicateName) {
      alert(`Gói dịch vụ "${nextName}" đã tồn tại.`);
      return;
    }

    const nextMonthlyPrice = updatedFields.price ?? currentPackage.price;
    const nextYearlyPrice = updatedFields.yearlyPrice
      ?? (updatedFields.price !== undefined ? Number((nextMonthlyPrice * 12 * (1 - (updatedFields.yearlyDiscountPercent ?? currentPackage.yearlyDiscountPercent ?? 0) / 100)).toFixed(2)) : getYearlyPackagePrice(currentPackage));
    const priceChanged = nextMonthlyPrice !== currentPackage.price
      || nextYearlyPrice !== getYearlyPackagePrice(currentPackage)
      || (updatedFields.currency && updatedFields.currency !== currentPackage.currency);
    const nextVersion = (currentPackage.version || 1) + 1;
    const nextPackage = normalizeSubscriptionPackage({
      ...currentPackage,
      ...updatedFields,
      name: nextName,
      yearlyPrice: nextYearlyPrice,
      retirementRequest: updatedFields.status === 'ACTIVE' ? undefined : (updatedFields.retirementRequest ?? currentPackage.retirementRequest),
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      priceHistory: priceChanged
        ? [
            {
              id: `PRICE-${Date.now()}`,
              monthlyPrice: currentPackage.price,
              yearlyPrice: getYearlyPackagePrice(currentPackage),
              currency: currentPackage.currency || 'USD',
              effectiveFrom: currentPackage.updatedAt?.slice(0, 10) || currentPackage.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              note: 'Phiên bản giá trước; tenant đã đăng ký tiếp tục dùng giá đã khóa.'
            },
            ...(currentPackage.priceHistory || [])
          ]
        : currentPackage.priceHistory
    });

    setPackages((current) => current.map((pkg) => pkg.id === id ? nextPackage : pkg));

    const packageChanges = buildAuditChanges(currentPackage, updatedFields);
    recordAuditLog({
      eventCode: priceChanged ? 'PACKAGE.PRICE.UPDATED' : 'PACKAGE.UPDATED',
      event: priceChanged ? 'Cập nhật giá gói dịch vụ' : 'Cập nhật gói dịch vụ',
      description: `Superadmin đã cập nhật gói "${currentPackage.name}" lên phiên bản ${nextVersion}.`,
      severity: priceChanged || updatedFields.status ? 'medium' : 'low',
      status: 'success',
      category: 'PACKAGE',
      resource: `Gói ${currentPackage.name}`,
      resourceId: id,
      method: `CLIENT /packages/${id}`,
      changes: packageChanges,
      metadata: { version: nextVersion, priceChanged }
    });

    if (nextName !== currentPackage.name) {
      setTenants((current) => current.map((tenant) => (
        tenant.subscriptionPackageId === id || tenant.packageName === currentPackage.name
          ? {
              ...tenant,
              packageName: nextName,
              plan: nextName,
              subscriptionPlan: nextName
            }
          : tenant
      )));
      setInvoices((current) => current.map((invoice) => (
        invoice.packageId === id || invoice.planName === currentPackage.name
          ? { ...invoice, packageId: id }
          : invoice
      )));
    }
  };

  const handleAddPackage = (newPackage: Omit<SubscriptionPackage, 'id' | 'activeTenants'>) => {
    const normalizedName = newPackage.name.trim();
    const isDuplicate = packages.some(p => p.name.toLowerCase() === normalizedName.toLowerCase());

    if (isDuplicate) {
      alert(`Gói dịch vụ "${normalizedName}" đã tồn tại.`);
      return;
    }

    setPackages((current) => [
      ...current,
      normalizeSubscriptionPackage({
        ...newPackage,
        id: `PKG-${Date.now()}`,
        name: normalizedName,
        activeTenants: 0,
        status: newPackage.status || 'DRAFT',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ]);
    recordAuditLog({
      eventCode: 'PACKAGE.CREATED',
      event: 'Tạo gói dịch vụ',
      description: `Superadmin đã tạo gói "${normalizedName}" ở trạng thái ${newPackage.status || 'DRAFT'}.`,
      severity: 'medium',
      status: 'success',
      category: 'PACKAGE',
      resource: `Gói ${normalizedName}`,
      method: 'CLIENT /packages',
      metadata: { status: newPackage.status || 'DRAFT', monthlyPrice: newPackage.price }
    });
    alert(`Đã thêm gói dịch vụ "${normalizedName}" thành công!`);
  };

  const handleDeprecatePackage = (id: string) => {
    const targetPackage = packages.find(p => p.id === id);
    setPackages(packages.map(p => p.id === id ? { ...p, status: 'DEPRECATED' } : p));
    if (targetPackage) recordAuditLog({
      eventCode: 'PACKAGE.DEPRECATED', event: 'Ngừng cung cấp gói dịch vụ',
      description: `Gói "${targetPackage.name}" ngừng nhận đăng ký mới.`, severity: 'medium', status: 'success',
      category: 'PACKAGE', resource: `Gói ${targetPackage.name}`, resourceId: id, method: `CLIENT /packages/${id}/deprecate`,
      changes: [{ field: 'status', before: targetPackage.status || 'ACTIVE', after: 'DEPRECATED' }]
    });
    alert(`Đã ngưng cung cấp gói "${targetPackage?.name || id}". Các tenant đang dùng vẫn được giữ nguyên.`);
  };

  const handleSchedulePackageRetirement = (id: string, replacementPackageName: string) => {
    const targetPackage = packages.find((pkg) => pkg.id === id);
    const replacementPackage = getSubscriptionPackage(packages, replacementPackageName);
    if (!targetPackage || !replacementPackage || replacementPackage.id === id || (replacementPackage.status || 'ACTIVE') !== 'ACTIVE') {
      alert('Vui lòng chọn một gói thay thế đang hoạt động.');
      return;
    }

    const affectedTenants = tenants.filter((tenant) => (
      tenant.subscriptionPackageId === id || tenant.packageName === targetPackage.name
    ));
    if (affectedTenants.length === 0) {
      handleDeprecatePackage(id);
      return;
    }

    const incompatibleTenant = affectedTenants.find((tenant) => (
      (tenant.branches?.length || 1) > replacementPackage.maxSalons
      || Number(tenant.staffCount || 0) > replacementPackage.maxStaff
    ));
    if (incompatibleTenant) {
      alert(`Gói ${replacementPackage.name} không đủ hạn mức cho tenant "${incompatibleTenant.name}". Vui lòng chọn gói thay thế khác.`);
      return;
    }

    setPackages((currentPackages) => currentPackages.map((pkg) => pkg.id === id ? {
      ...pkg,
      status: 'DEPRECATED',
      retirementRequest: {
        requestedAt: new Date().toISOString(),
        replacementPackageId: replacementPackage.id,
        replacementPackageName: replacementPackage.name,
        affectedTenantIds: affectedTenants.map((tenant) => tenant.id),
        mode: 'AT_TENANT_EXPIRY'
      },
      updatedAt: new Date().toISOString()
    } : pkg));
    recordAuditLog({
      eventCode: 'PACKAGE.RETIREMENT.SCHEDULED', event: 'Lập lịch ngừng gói dịch vụ',
      description: `${affectedTenants.length} tenant sẽ được chuyển từ "${targetPackage.name}" sang "${replacementPackage.name}" khi hết hạn.`,
      severity: 'high', status: 'success', category: 'PACKAGE', resource: `Gói ${targetPackage.name}`, resourceId: id,
      method: `CLIENT /packages/${id}/retirement`, metadata: { replacementPackage: replacementPackage.name, affectedTenants: affectedTenants.length }
    });
    alert(`Đã ngừng nhận đăng ký mới cho gói "${targetPackage.name}". ${affectedTenants.length} tenant hiện tại sẽ tự chuyển sang "${replacementPackage.name}" khi hết hạn.`);
  };

  const handleCancelPackageRetirement = (id: string) => {
    const targetPackage = packages.find((pkg) => pkg.id === id);
    if (!targetPackage?.retirementRequest) return;
    setPackages((currentPackages) => currentPackages.map((pkg) => pkg.id === id ? {
      ...pkg,
      status: 'ACTIVE',
      retirementRequest: undefined,
      updatedAt: new Date().toISOString()
    } : pkg));
    recordAuditLog({
      eventCode: 'PACKAGE.RETIREMENT.CANCELLED', event: 'Hủy lịch ngừng gói dịch vụ',
      description: `Đã mở lại đăng ký và hủy lịch chuyển tenant của gói "${targetPackage.name}".`, severity: 'medium', status: 'success',
      category: 'PACKAGE', resource: `Gói ${targetPackage.name}`, resourceId: id, method: `CLIENT /packages/${id}/retirement`
    });
    alert(`Đã mở lại đăng ký cho gói "${targetPackage.name}". Các lịch chuyển gói đang chờ đã được hủy.`);
  };

  const handleReactivatePackage = (id: string) => {
    const targetPackage = packages.find(p => p.id === id);
    setPackages(packages.map(p => p.id === id ? { ...p, status: 'ACTIVE', retirementRequest: undefined } : p));
    if (targetPackage) recordAuditLog({
      eventCode: 'PACKAGE.REACTIVATED', event: 'Mở bán lại gói dịch vụ', description: `Gói "${targetPackage.name}" được chuyển về trạng thái hoạt động.`,
      severity: 'medium', status: 'success', category: 'PACKAGE', resource: `Gói ${targetPackage.name}`, resourceId: id,
      method: `CLIENT /packages/${id}/reactivate`, changes: [{ field: 'status', before: targetPackage.status || 'DEPRECATED', after: 'ACTIVE' }]
    });
    alert(`Đã mở bán lại gói "${targetPackage?.name || id}".`);
  };

  const handleDeletePackage = (id: string) => {
    const targetPackage = packages.find(p => p.id === id);
    if (!targetPackage) return;
    const hasTenants = tenants.some((tenant) => tenant.subscriptionPackageId === id || tenant.packageName === targetPackage.name);
    if (hasTenants) {
      alert('Không thể xóa gói đang có tenant sử dụng. Hãy chuyển tenant sang gói khác hoặc lưu trữ gói này.');
      return;
    }
    setPackages(packages.filter(p => p.id !== id));
    recordAuditLog({
      eventCode: 'PACKAGE.DELETED', event: 'Xóa gói dịch vụ', description: `Superadmin đã xóa gói "${targetPackage.name}" không còn tenant sử dụng.`,
      severity: 'high', status: 'success', category: 'PACKAGE', resource: `Gói ${targetPackage.name}`, resourceId: id, method: `CLIENT /packages/${id}`
    });
    alert(`Đã xóa gói dịch vụ "${targetPackage?.name || id}".`);
  };

  const handleTenantAdminsChange = (nextAdmins: TenantAdminAccount[]) => {
    const added = nextAdmins.filter((admin) => !tenantAdmins.some((current) => current.id === admin.id));
    const removed = tenantAdmins.filter((admin) => !nextAdmins.some((current) => current.id === admin.id));
    const updated = nextAdmins.filter((admin) => {
      const current = tenantAdmins.find((item) => item.id === admin.id);
      return current && JSON.stringify(current) !== JSON.stringify(admin);
    });
    setTenantAdmins(nextAdmins);
    [...added, ...updated].forEach(syncAdminAuthAccount);
    removed.forEach((admin) => {
      void deleteManagedAuthAccount(admin.id).catch(() => {
        // Local removal remains visible while server cleanup can be retried later.
      });
    });

    if (added.length > 0) {
      const admin = added[0];
      recordAuditLog({
        eventCode: 'USER.TENANT_ADMIN.INVITED', event: 'Tạo hoặc mời Tenant Admin',
        description: `Đã thêm tài khoản Tenant Admin ${admin.email}${added.length > 1 ? ` và ${added.length - 1} tài khoản khác` : ''}.`,
        severity: 'medium', status: 'success', category: 'USER', resource: `Tenant Admin ${admin.email}`, resourceId: admin.id,
        method: 'CLIENT /tenant-admins', metadata: { addedAccounts: added.length, role: admin.role }
      });
    } else if (removed.length > 0) {
      const admin = removed[0];
      recordAuditLog({
        eventCode: 'USER.TENANT_ADMIN.DELETED', event: 'Xóa Tenant Admin',
        description: `Đã xóa tài khoản Tenant Admin ${admin.email}${removed.length > 1 ? ` và ${removed.length - 1} tài khoản khác` : ''}.`,
        severity: 'high', status: 'success', category: 'USER', resource: `Tenant Admin ${admin.email}`, resourceId: admin.id,
        method: `CLIENT /tenant-admins/${admin.id}`, metadata: { removedAccounts: removed.length }
      });
    } else if (updated.length > 0) {
      const admin = updated[0];
      recordAuditLog({
        eventCode: 'USER.TENANT_ADMIN.UPDATED', event: 'Cập nhật Tenant Admin',
        description: `Đã cập nhật tài khoản Tenant Admin ${admin.email}${updated.length > 1 ? ` và ${updated.length - 1} tài khoản khác` : ''}.`,
        severity: 'medium', status: 'success', category: 'USER', resource: `Tenant Admin ${admin.email}`, resourceId: admin.id,
        method: `CLIENT /tenant-admins/${admin.id}`, metadata: { updatedAccounts: updated.length, status: admin.status, role: admin.role }
      });
    }
  };

  const handleRequestPackageUpgrade = (
    tenant: Tenant,
    account: DemoAccount,
    targetPackage: SubscriptionPackage,
    billingCycle: 'monthly' | 'yearly',
    effectiveDate: 'immediate' | 'next_cycle'
  ) => {
    const existingPending = upgradeRequests.find((request) => request.tenantId === tenant.id && request.status === 'PENDING');
    if (existingPending) {
      setAlertDialog({
        title: 'Yêu cầu đang chờ duyệt',
        message: `Tenant đã có yêu cầu nâng cấp lên gói ${existingPending.requestedPackageName}. Super Admin sẽ xử lý trong Quản lý Tenant → Yêu cầu nâng cấp.`,
        type: 'warning'
      });
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

    setUpgradeRequests((current) => [request, ...current]);
    void persistPackageUpgradeRequest(request).then((saved) => {
      if (saved) return;
      setUpgradeRequests((current) => current.filter((item) => item.id !== request.id));
      setAlerts((current) => current.filter((alert) => alert.id !== `ALT-${request.id}`));
      setAlertDialog({
        title: 'Chưa gửi được yêu cầu',
        message: 'Máy chủ chưa xác nhận yêu cầu nâng cấp. Vui lòng kiểm tra phiên đăng nhập và thử lại.',
        type: 'error'
      });
    });
    setAlerts((current) => [{
      id: `ALT-${request.id}`,
      title: `Yêu cầu nâng cấp: ${tenant.name}`,
      description: `${account.displayName} yêu cầu chuyển từ ${tenant.packageName} sang ${targetPackage.name}.`,
      type: 'info',
      createdAt: now.toISOString(),
      isRead: false,
      targetTenantId: tenant.id
    }, ...current]);
    recordAuditLog({
      eventCode: 'PACKAGE.UPGRADE.REQUESTED',
      event: 'Tenant Admin gửi yêu cầu nâng cấp',
      description: `${account.displayName} gửi yêu cầu chuyển tenant "${tenant.name}" từ ${tenant.packageName} sang ${targetPackage.name}.`,
      severity: 'medium',
      status: 'success',
      category: 'PACKAGE',
      resource: `Tenant ${tenant.name}`,
      resourceId: tenant.id,
      method: 'POST /api/package-upgrade-requests',
      user: account.email,
      actorRole: 'TENANT_ADMIN',
      metadata: { requestId: request.id, targetPackage: targetPackage.name, effectiveDate }
    });
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
      setAlertDialog({
        title: 'Không thể xử lý',
        message: 'Tenant hoặc gói được yêu cầu không còn tồn tại.',
        type: 'error'
      });
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
    const persisted = await persistPackageUpgradeReview(reviewedRequest);
    if (!persisted) {
      setAlertDialog({
        title: 'Chưa thể lưu phê duyệt',
        message: 'Máy chủ chưa xác nhận thao tác. Tenant và hóa đơn chưa bị thay đổi; vui lòng thử lại.',
        type: 'error'
      });
      return false;
    }

    if (decision === 'APPROVED' && pricing) {
      if (effectiveDate === 'immediate') {
        handleUpdateTenant(tenant.id, {
          packageName: targetPackage.name,
          plan: targetPackage.name,
          subscriptionPlan: targetPackage.name,
          billingCycle: request.billingCycle,
          effectiveDate,
          planStartDate: effectiveStart,
          subscriptionPrice: pricing.price,
          subscriptionCurrency: pricing.currency,
          pendingSubscriptionChange: undefined
        });
      } else {
        handleUpdateTenant(tenant.id, {
          effectiveDate,
          pendingSubscriptionChange: {
            requestId: request.id,
            packageId: targetPackage.id,
            packageName: targetPackage.name,
            packageVersion: targetPackage.version || 1,
            billingCycle: request.billingCycle,
            price: pricing.price,
            currency: pricing.currency,
            effectiveAt: effectiveStart,
            requestedAt: reviewedAt
          }
        });
      }
      if (invoice) setInvoices((current) => dedupeInvoices([invoice!, ...current]));
    }

    setUpgradeRequests((current) => current.map((item) => item.id === requestId ? reviewedRequest : item));
    recordAuditLog({
      eventCode: decision === 'APPROVED' ? 'PACKAGE.UPGRADE.APPROVED' : 'PACKAGE.UPGRADE.REJECTED',
      event: decision === 'APPROVED' ? 'Duyệt yêu cầu nâng cấp' : 'Từ chối yêu cầu nâng cấp',
      description: decision === 'APPROVED'
        ? `Super Admin duyệt tenant "${tenant.name}" chuyển sang gói ${targetPackage.name}.`
        : `Super Admin từ chối yêu cầu chuyển gói của tenant "${tenant.name}".`,
      severity: 'medium',
      status: 'success',
      category: 'PACKAGE',
      resource: `Yêu cầu ${request.id}`,
      resourceId: request.id,
      method: `PATCH /api/package-upgrade-requests/${request.id}`,
      metadata: { decision, targetPackage: targetPackage.name, invoiceId: invoiceId || '', effectiveDate }
    });
    setAlertDialog({
      title: decision === 'APPROVED' ? 'Đã duyệt nâng cấp' : 'Đã từ chối yêu cầu',
      message: decision === 'APPROVED'
        ? effectiveDate === 'immediate'
          ? `Tenant "${tenant.name}" đã được cập nhật sang gói ${targetPackage.name}. Hóa đơn ${invoiceId} đã được tạo.`
          : `Đã lên lịch chuyển tenant "${tenant.name}" sang gói ${targetPackage.name} vào ${tenant.subscriptionRenewsAt || tenant.trialEndDate || reviewedAt.slice(0, 10)}. Hóa đơn ${invoiceId} đã được tạo.`
        : `Yêu cầu nâng cấp của tenant "${tenant.name}" đã được từ chối và lưu lý do.`,
      type: decision === 'APPROVED' ? 'success' : 'info'
    });
    return true;
  };

  // Dynamic Badge counts to supply to sidebar
  const badgeCounts = {
    expiringSalons: tenants.filter(t => t.status === 'EXPIRING').length,
    overdueInvoices: invoices.filter(i => i.status === 'OVERDUE').length,
    unreadAlerts: alerts.filter(a => !a.isRead).length,
    openTickets: tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
    pendingUpgrades: upgradeRequests.filter((request) => request.status === 'PENDING').length
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
            onMarkAlertAsRead={handleMarkAlertAsRead}
            onClearAllAlerts={handleClearAllAlerts}
            onToggleTenantStatus={handleToggleTenantStatusFromOverview}
            onViewTenant={handleViewTenantFromOverview}
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
            onAddTenant={handleAddTenant}
            onUpdateTenant={handleUpdateTenant}
            onDeleteTenant={handleDeleteTenant}
            selectedTenantFromOverview={selectedTenantFromOverview}
            clearSelectedTenant={() => setSelectedTenantFromOverview(null)}
            searchQuery={searchQuery}
            showConfirm={triggerConfirm}
            upgradeRequests={upgradeRequests}
            onReviewUpgradeRequest={handleReviewUpgradeRequest}
          />
        );
      case 'admins':
        return <TenantAdminManagement tenants={tenants} packages={packages} invitedAdmins={tenantAdmins} onInvitedAdminsChange={handleTenantAdminsChange} onUpdateTenant={handleUpdateTenant} showConfirm={triggerConfirm} />;
      case 'packages':
        return (
          <SubscriptionPackages 
            packages={packages}
            invoices={invoices}
            tenants={tenants}
            reportCurrency={systemSettings.general.currency}
            onAddPackage={handleAddPackage}
            onUpdatePackage={handleUpdatePackage}
            onDeprecatePackage={handleDeprecatePackage}
            onSchedulePackageRetirement={handleSchedulePackageRetirement}
            onCancelPackageRetirement={handleCancelPackageRetirement}
            onReactivatePackage={handleReactivatePackage}
            onDeletePackage={handleDeletePackage}
          />
        );
      case 'billing':
        return (
          <BillingAndInvoices 
            invoices={invoices}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            onUpdateInvoice={handleUpdateInvoice}
            onCreateInvoice={handleCreateInvoice}
            showConfirm={triggerConfirm}
            reportCurrency={systemSettings.general.currency}
          />
        );
      case 'reports':
        return <SystemReports tenants={tenants} invoices={invoices} packages={packages} reportCurrency={systemSettings.general.currency} />;
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

  // Toast component JSX
  const renderToast = () => {
    if (!toast) return null;

    const { message, type } = toast;
    let bgClass = 'border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/95';
    let iconColor = 'text-emerald-500';
    let icon = <CheckCircle className="w-5 h-5" />;

    if (type === 'error') {
      bgClass = 'border-red-500/30 bg-red-50/95 dark:bg-red-950/95';
      iconColor = 'text-red-500';
      icon = <XCircle className="w-5 h-5" />;
    } else if (type === 'warning') {
      bgClass = 'border-amber-500/30 bg-amber-50/95 dark:bg-amber-950/95';
      iconColor = 'text-amber-500';
      icon = <AlertTriangle className="w-5 h-5" />;
    } else if (type === 'info') {
      bgClass = 'border-indigo-500/30 bg-indigo-50/95 dark:bg-indigo-950/95';
      iconColor = 'text-indigo-500';
      icon = <Info className="w-5 h-5" />;
    }

    return (
      <div className="fixed top-5 right-5 z-[9999] animate-slideDown max-w-sm w-full">
        <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 ${bgClass}`}>
          <div className={`${iconColor} shrink-0 mt-0.5`}>
            {icon}
          </div>
          <div className="flex-1 text-xs font-semibold text-brand-text leading-relaxed">
            {message}
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-brand-text-muted hover:text-brand-text transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Confirm Modal component JSX
  const renderConfirmDialog = () => {
    if (!confirmDialog) return null;

    const { title, message, onConfirm } = confirmDialog;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <div 
          className="sa-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setConfirmDialog(null)}
        />
        
        {/* Modal Dialog card */}
        <div className="relative bg-brand-surface border border-brand-outline/45 rounded-2xl max-w-md w-full shadow-2xl p-6 overflow-hidden animate-zoomIn flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
              <Info className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-brand-text">{title}</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed mt-2">{message}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setConfirmDialog(null)}
              className="px-4 py-2 border border-brand-outline/40 hover:bg-brand-surface-high rounded-xl text-xs font-semibold text-brand-text transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                onConfirm();
                setConfirmDialog(null);
              }}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Alert Modal component JSX
  const renderAlertDialog = () => {
    if (!alertDialog) return null;

    const { title, message, type } = alertDialog;
    
    let iconBg = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400';
    let icon = <Info className="w-6 h-6" />;
    
    if (type === 'success') {
      iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
      icon = <CheckCircle className="w-6 h-6" />;
    } else if (type === 'error') {
      iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400';
      icon = <XCircle className="w-6 h-6" />;
    } else if (type === 'warning') {
      iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400';
      icon = <AlertTriangle className="w-6 h-6" />;
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <div 
          className="sa-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setAlertDialog(null)}
        />
        
        {/* Modal Dialog card */}
        <div className="relative bg-brand-surface border border-brand-outline/45 rounded-2xl max-w-md w-full shadow-2xl p-6 overflow-hidden animate-zoomIn flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-brand-text">{title}</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed mt-2 whitespace-pre-wrap">{message}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setAlertDialog(null)}
              className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/95 text-brand-on-primary rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md w-full sm:w-auto text-center"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
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

  const defaultTenantAccount = getDemoAccountByRole('TENANT_ADMIN');
  const targetOwnerIdentity = normalizeAccountIdentity('NguyenVanBoss');
  const storedTenantId = sessionAccount?.tenantId || '';
  const storedTenantEmail = (sessionAccount?.email || '').trim().toLowerCase();
  const sessionTenant = tenants.find((tenant) => tenant.id === storedTenantId)
    || tenants.find((tenant) => tenant.adminEmail.trim().toLowerCase() === storedTenantEmail);
  const sessionAdmin = tenantAdmins.find((admin) => admin.email.trim().toLowerCase() === storedTenantEmail);
  const fallbackAdmin = tenantAdmins.find((admin) => (
    normalizeAccountIdentity(admin.name) === targetOwnerIdentity
    || normalizeAccountIdentity(admin.username) === targetOwnerIdentity
    || getEmailIdentity(admin.email) === targetOwnerIdentity
  ));
  const targetAdmin = sessionAdmin
    || tenantAdmins.find((admin) => Boolean(sessionTenant) && (admin.tenantIds.includes(sessionTenant!.id) || sessionTenant!.tenantAdminId === admin.id))
    || (!sessionTenant ? fallbackAdmin : undefined);
  const targetTenant = sessionTenant
    || tenants.find((tenant) => Boolean(targetAdmin) && (
      targetAdmin!.tenantIds.includes(tenant.id)
      || tenant.tenantAdminId === targetAdmin!.id
      || tenantMatchesAdminIdentity(tenant, targetAdmin!)
    ))
    || tenants.find((tenant) => (
      normalizeAccountIdentity(tenant.adminName) === targetOwnerIdentity
      || normalizeAccountIdentity(tenant.adminUsername) === targetOwnerIdentity
      || getEmailIdentity(tenant.adminEmail) === targetOwnerIdentity
    ));
  const tenantPortalAccount: DemoAccount = {
    ...defaultTenantAccount,
    ...sessionAccount,
    displayName: sessionAccount?.displayName || targetAdmin?.name || targetTenant?.adminName || defaultTenantAccount.displayName,
    email: sessionAccount?.email || targetAdmin?.email || targetTenant?.adminEmail || defaultTenantAccount.email,
    tenantId: sessionAccount?.tenantId || targetTenant?.id,
    tenantName: sessionAccount?.tenantName || targetTenant?.name || targetAdmin?.tenantName || defaultTenantAccount.tenantName
  };
  const tenantPortalPackage = targetTenant
    ? getSubscriptionPackageForTenant(packages, targetTenant)
    : packages.find((pkg) => pkg.name === 'Premium') || packages[0];

  if (portalRole === 'TENANT_ADMIN') {
    return (
      <TenantAdminPortal
        account={tenantPortalAccount}
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
        onUpdateTenant={handleUpdateTenant}
        onLogout={handleLogout}
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
            {renderView()}
          </Suspense>
        </main>
        
      </div>

      {/* Custom Global Dialogs */}
      {renderToast()}
      {renderConfirmDialog()}
      {renderAlertDialog()}

    </div>
  );
}
