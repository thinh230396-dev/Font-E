export interface SystemSettingsModel {
  version: 2;
  updatedAt: string | null;
  general: {
    systemName: string;
    appUrl: string;
    supportEmail: string;
    defaultLanguage: 'vi' | 'en';
    timezone: string;
    currency: 'VND' | 'USD';
    maintenanceMode: boolean;
  };
  billing: {
    autoLock: boolean;
    warnDays: number;
    lockDays: number;
    invoiceDueDays: number;
    renewalReminderDays: number;
  };
  email: {
    enabled: boolean;
    smtpServer: string;
    smtpPort: number;
    encryption: 'STARTTLS' | 'SSL' | 'NONE';
    smtpUsername: string;
    senderName: string;
    senderEmail: string;
    notifyOverdue: boolean;
    notifyExpiring: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireMfaForSuperadmin: boolean;
    auditRetentionDays: number;
  };
}

export type EditableSystemSettings = Omit<SystemSettingsModel, 'version' | 'updatedAt'>;
export type SystemSettingsSection = keyof EditableSystemSettings;
export type SystemSettingsFieldErrors = Record<string, string>;

export const SYSTEM_SETTINGS_STORAGE_KEY = 'salonsys_system_settings';
export const SYSTEM_SETTINGS_UPDATED_EVENT = 'salonsys:settings-updated';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsModel = {
  version: 2,
  updatedAt: null,
  general: {
    systemName: 'SalonSys Admin',
    appUrl: 'https://admin.salonsys.com',
    supportEmail: 'support@salonsys.com',
    defaultLanguage: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    maintenanceMode: false
  },
  billing: {
    autoLock: true,
    warnDays: 7,
    lockDays: 14,
    invoiceDueDays: 7,
    renewalReminderDays: 7
  },
  email: {
    enabled: true,
    smtpServer: 'smtp.sendgrid.net',
    smtpPort: 587,
    encryption: 'STARTTLS',
    smtpUsername: 'apikey',
    senderName: 'SalonSys',
    senderEmail: 'noreply@salonsys.com',
    notifyOverdue: true,
    notifyExpiring: true
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 10,
    requireMfaForSuperadmin: false,
    auditRetentionDays: 180
  }
};

export const cloneDefaultSystemSettings = (): SystemSettingsModel => (
  JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS)) as SystemSettingsModel
);

export const loadSystemSettings = (): SystemSettingsModel => {
  if (typeof window === 'undefined') return cloneDefaultSystemSettings();
  try {
    const raw = localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
    if (!raw) return cloneDefaultSystemSettings();
    const parsed = JSON.parse(raw) as Partial<SystemSettingsModel> & Record<string, unknown>;

    if (parsed.version === 2 && parsed.general && parsed.billing && parsed.email && parsed.security) {
      return {
        ...cloneDefaultSystemSettings(),
        ...parsed,
        general: { ...DEFAULT_SYSTEM_SETTINGS.general, ...parsed.general },
        billing: { ...DEFAULT_SYSTEM_SETTINGS.billing, ...parsed.billing },
        email: { ...DEFAULT_SYSTEM_SETTINGS.email, ...parsed.email },
        security: { ...DEFAULT_SYSTEM_SETTINGS.security, ...parsed.security }
      } as SystemSettingsModel;
    }

    return {
      ...cloneDefaultSystemSettings(),
      general: {
        ...DEFAULT_SYSTEM_SETTINGS.general,
        appUrl: typeof parsed.appUrl === 'string' ? parsed.appUrl : DEFAULT_SYSTEM_SETTINGS.general.appUrl
      },
      billing: {
        ...DEFAULT_SYSTEM_SETTINGS.billing,
        autoLock: typeof parsed.autoLock === 'boolean' ? parsed.autoLock : DEFAULT_SYSTEM_SETTINGS.billing.autoLock,
        warnDays: typeof parsed.warnDays === 'number' ? parsed.warnDays : DEFAULT_SYSTEM_SETTINGS.billing.warnDays,
        lockDays: typeof parsed.lockDays === 'number' ? parsed.lockDays : DEFAULT_SYSTEM_SETTINGS.billing.lockDays
      },
      email: {
        ...DEFAULT_SYSTEM_SETTINGS.email,
        smtpServer: typeof parsed.smtpServer === 'string' ? parsed.smtpServer : DEFAULT_SYSTEM_SETTINGS.email.smtpServer,
        smtpPort: typeof parsed.smtpPort === 'number' ? parsed.smtpPort : DEFAULT_SYSTEM_SETTINGS.email.smtpPort,
        senderEmail: typeof parsed.smtpSender === 'string' ? parsed.smtpSender : DEFAULT_SYSTEM_SETTINGS.email.senderEmail
      },
      security: {
        ...DEFAULT_SYSTEM_SETTINGS.security,
        sessionTimeout: typeof parsed.sessionTimeout === 'number' ? parsed.sessionTimeout : DEFAULT_SYSTEM_SETTINGS.security.sessionTimeout
      }
    };
  } catch {
    return cloneDefaultSystemSettings();
  }
};

export const saveSystemSettings = (settings: SystemSettingsModel) => {
  localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent<SystemSettingsModel>(SYSTEM_SETTINGS_UPDATED_EVENT, { detail: settings }));
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateSystemSettings = (settings: SystemSettingsModel): SystemSettingsFieldErrors => {
  const errors: SystemSettingsFieldErrors = {};

  if (settings.general.systemName.trim().length < 2) errors['general.systemName'] = 'Tên hệ thống phải có ít nhất 2 ký tự.';
  if (!isValidHttpUrl(settings.general.appUrl)) errors['general.appUrl'] = 'URL phải bắt đầu bằng http:// hoặc https://.';
  if (!isValidEmail(settings.general.supportEmail)) errors['general.supportEmail'] = 'Email hỗ trợ không hợp lệ.';

  if (settings.billing.warnDays < 0 || settings.billing.warnDays > 90) errors['billing.warnDays'] = 'Số ngày cảnh báo phải từ 0 đến 90.';
  if (settings.billing.lockDays < 1 || settings.billing.lockDays > 180) errors['billing.lockDays'] = 'Số ngày khóa phải từ 1 đến 180.';
  if (settings.billing.autoLock && settings.billing.lockDays <= settings.billing.warnDays) errors['billing.lockDays'] = 'Ngày khóa phải lớn hơn số ngày cảnh báo.';
  if (settings.billing.invoiceDueDays < 1 || settings.billing.invoiceDueDays > 90) errors['billing.invoiceDueDays'] = 'Hạn thanh toán phải từ 1 đến 90 ngày.';
  if (settings.billing.renewalReminderDays < 1 || settings.billing.renewalReminderDays > 60) errors['billing.renewalReminderDays'] = 'Nhắc gia hạn phải từ 1 đến 60 ngày.';

  if (settings.email.enabled) {
    if (!settings.email.smtpServer.trim()) errors['email.smtpServer'] = 'SMTP server không được để trống.';
    if (settings.email.smtpPort < 1 || settings.email.smtpPort > 65535) errors['email.smtpPort'] = 'Cổng SMTP phải từ 1 đến 65535.';
    if (!settings.email.senderName.trim()) errors['email.senderName'] = 'Tên người gửi không được để trống.';
    if (!isValidEmail(settings.email.senderEmail)) errors['email.senderEmail'] = 'Email người gửi không hợp lệ.';
  }

  if (settings.security.sessionTimeout < 5 || settings.security.sessionTimeout > 1440) errors['security.sessionTimeout'] = 'Thời gian phiên phải từ 5 đến 1440 phút.';
  if (settings.security.maxLoginAttempts < 3 || settings.security.maxLoginAttempts > 10) errors['security.maxLoginAttempts'] = 'Số lần đăng nhập sai phải từ 3 đến 10.';
  if (settings.security.passwordMinLength < 8 || settings.security.passwordMinLength > 32) errors['security.passwordMinLength'] = 'Độ dài mật khẩu phải từ 8 đến 32 ký tự.';
  if (settings.security.auditRetentionDays < 30 || settings.security.auditRetentionDays > 3650) errors['security.auditRetentionDays'] = 'Thời gian lưu nhật ký phải từ 30 đến 3650 ngày.';

  return errors;
};
