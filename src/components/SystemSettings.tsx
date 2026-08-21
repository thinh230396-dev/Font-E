import BeautifulSelect from './BeautifulSelect';
import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  CreditCard,
  Globe2,
  Info,
  Mail,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import {
  cloneDefaultSystemSettings,
  loadSystemSettings,
  saveSystemSettings,
  validateSystemSettings,
  type EditableSystemSettings,
  type SystemSettingsFieldErrors,
  type SystemSettingsModel,
  type SystemSettingsSection
} from '../utils/systemSettings';
import { recordAuditLog } from '../utils/auditLogs';
import { Modal } from './ui';

type SettingsTab = 'general' | 'billing' | 'notifications' | 'security';
type NoticeType = 'success' | 'error' | 'info';

const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
  { id: 'general', label: 'Tổng quan', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'billing', label: 'Thanh toán', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'notifications', label: 'Email & thông báo', icon: <BellRing className="w-4 h-4" /> },
  { id: 'security', label: 'Bảo mật', icon: <ShieldCheck className="w-4 h-4" /> }
];

export default function SystemSettings() {
  const [initialSettings] = useState(loadSystemSettings);
  const [savedSettings, setSavedSettings] = useState<SystemSettingsModel>(initialSettings);
  const [draft, setDraft] = useState<SystemSettingsModel>(initialSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [errors, setErrors] = useState<SystemSettingsFieldErrors>({});
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedSettings), [draft, savedSettings]);
  const errorCount = Object.keys(errors).length;

  const updateSection = <K extends SystemSettingsSection,>(section: K, patch: Partial<EditableSystemSettings[K]>) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], ...patch }
    }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((field) => delete next[`${section}.${field}`]);
      return next;
    });
    setNotice(null);
  };

  const navigateToFirstError = (nextErrors: SystemSettingsFieldErrors) => {
    const firstKey = Object.keys(nextErrors)[0];
    if (!firstKey) return;
    if (firstKey.startsWith('billing.')) setActiveTab('billing');
    else if (firstKey.startsWith('email.')) setActiveTab('notifications');
    else if (firstKey.startsWith('security.')) setActiveTab('security');
    else setActiveTab('general');
  };

  const handleSave = () => {
    const nextErrors = validateSystemSettings(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      navigateToFirstError(nextErrors);
      setNotice({ type: 'error', message: `Còn ${Object.keys(nextErrors).length} trường chưa hợp lệ. Vui lòng kiểm tra lại.` });
      return;
    }

    const saved: SystemSettingsModel = { ...draft, version: 2, updatedAt: new Date().toISOString() };
    const sections = (['general', 'billing', 'email', 'security'] as const).filter((section) => JSON.stringify(savedSettings[section]) !== JSON.stringify(saved[section]));
    const securityChanges = Object.entries(saved.security)
      .filter(([field, value]) => value !== savedSettings.security[field as keyof SystemSettingsModel['security']])
      .map(([field, value]) => ({
        field: `security.${field}`,
        before: String(savedSettings.security[field as keyof SystemSettingsModel['security']]),
        after: String(value)
      }));
    saveSystemSettings(saved);
    recordAuditLog({
      eventCode: securityChanges.length > 0 ? 'SECURITY.POLICY.UPDATED' : 'SYSTEM.SETTINGS.UPDATED',
      event: securityChanges.length > 0 ? 'Cập nhật chính sách bảo mật' : 'Cập nhật cấu hình hệ thống',
      description: `Superadmin đã lưu thay đổi tại ${sections.length} nhóm cấu hình: ${sections.join(', ')}.`,
      severity: securityChanges.length > 0 ? 'high' : 'medium',
      status: 'success',
      category: securityChanges.length > 0 ? 'SECURITY' : 'SYSTEM',
      resource: securityChanges.length > 0 ? 'Chính sách bảo mật' : 'Cấu hình hệ thống',
      resourceId: securityChanges.length > 0 ? 'SECURITY-POLICY' : 'SYSTEM-SETTINGS',
      method: 'CLIENT /settings',
      changes: securityChanges,
      metadata: { changedSections: sections.join(',') }
    });
    setSavedSettings(saved);
    setDraft(saved);
    setNotice({ type: 'success', message: 'Đã lưu toàn bộ cấu hình hệ thống trên trình duyệt này.' });
  };

  const handleDiscard = () => {
    setDraft(savedSettings);
    setErrors({});
    setNotice({ type: 'info', message: 'Đã hủy các thay đổi chưa lưu.' });
  };

  const handleReset = () => {
    setDraft(cloneDefaultSystemSettings());
    setErrors({});
    setShowResetConfirm(false);
    setActiveTab('general');
    setNotice({ type: 'info', message: 'Đã đưa biểu mẫu về mặc định. Nhấn “Lưu thay đổi” để áp dụng.' });
  };

  const handleCheckEmail = () => {
    const emailErrors = Object.fromEntries(Object.entries(validateSystemSettings(draft)).filter(([key]) => key.startsWith('email.')));
    setErrors((current) => ({ ...Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith('email.'))), ...emailErrors }));
    if (Object.keys(emailErrors).length > 0) {
      setNotice({ type: 'error', message: 'Thông số email chưa hợp lệ. Vui lòng sửa các trường được đánh dấu.' });
      return;
    }
    setNotice({ type: 'success', message: 'Thông số SMTP hợp lệ. Việc kết nối và gửi mail thật cần dịch vụ backend SMTP.' });
  };

  const lastUpdated = savedSettings.updatedAt
    ? new Date(savedSettings.updatedAt).toLocaleString('vi-VN')
    : 'Chưa lưu lần nào';

  return (
    <div className="space-y-5 pb-2">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-primary" />
            <span>Cấu hình hệ thống</span>
          </h1>
          <p className="text-xs text-brand-text-muted mt-1">Quản lý chính sách vận hành, thanh toán, email và bảo mật dùng chung cho SalonSys.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowResetConfirm(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-outline/40 bg-brand-surface text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high text-xs font-semibold cursor-pointer whitespace-nowrap">
            <RotateCcw className="w-3.5 h-3.5" /> <span>Khôi phục mặc định</span>
          </button>
          {isDirty && (
            <button type="button" onClick={handleDiscard} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-outline/40 bg-brand-surface text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high text-xs font-semibold cursor-pointer whitespace-nowrap">
              <X className="w-3.5 h-3.5" /> <span>Hủy thay đổi</span>
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={!isDirty} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary text-xs font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap">
            <Save className="w-4 h-4" /> <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>

      {notice && <Notice type={notice.type} message={notice.message} onClose={() => setNotice(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatusCard label="Trạng thái cấu hình" value={isDirty ? 'Chưa lưu thay đổi' : 'Đã đồng bộ'} tone={isDirty ? 'warning' : 'success'} note={`Cập nhật: ${lastUpdated}`} />
        <StatusCard label="Chế độ bảo trì" value={draft.general.maintenanceMode ? 'Đang bật' : 'Đang tắt'} tone={draft.general.maintenanceMode ? 'warning' : 'success'} note="Chỉ hiện cảnh báo trong trang quản trị" />
        <StatusCard label="Khóa công nợ" value={draft.billing.autoLock ? 'Tự động' : 'Thủ công'} tone={draft.billing.autoLock ? 'info' : 'neutral'} note={draft.billing.autoLock ? `Khóa sau ${draft.billing.lockDays} ngày` : 'Không tự động tạm ngưng'} />
        <StatusCard label="Dịch vụ email" value={draft.email.enabled ? 'Đã bật' : 'Đã tắt'} tone={draft.email.enabled ? 'info' : 'neutral'} note={draft.email.enabled ? `${draft.email.smtpServer}:${draft.email.smtpPort}` : 'Không gửi thông báo email'} />
      </div>

      <div className="bg-brand-surface border border-brand-outline/40 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto border-b border-brand-outline/30">
          <div className="flex min-w-max px-2 sm:px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-3.5 text-xs font-bold cursor-pointer transition-colors border-0 bg-transparent whitespace-nowrap ${activeTab === tab.id ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text'}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-primary" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SettingsPanel icon={<Globe2 className="w-4 h-4" />} title="Nhận diện & địa chỉ hệ thống" description="Thông tin cơ sở dùng trong liên kết, email và màn hình quản trị.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tên hệ thống" required error={errors['general.systemName']} className="sm:col-span-2">
                    <input className="form-control" value={draft.general.systemName} onChange={(event) => updateSection('general', { systemName: event.target.value })} placeholder="SalonSys Admin" />
                  </Field>
                  <Field label="URL quản trị" required error={errors['general.appUrl']} className="sm:col-span-2" hint="Dùng trong liên kết kích hoạt, hóa đơn và callback.">
                    <input className="form-control" type="url" value={draft.general.appUrl} onChange={(event) => updateSection('general', { appUrl: event.target.value })} placeholder="https://admin.salonsys.com" />
                  </Field>
                  <Field label="Email hỗ trợ" required error={errors['general.supportEmail']} className="sm:col-span-2">
                    <input className="form-control" type="email" value={draft.general.supportEmail} onChange={(event) => updateSection('general', { supportEmail: event.target.value })} placeholder="support@salonsys.com" />
                  </Field>
                  <Field label="Ngôn ngữ mặc định">
                    <BeautifulSelect className="form-control" value={draft.general.defaultLanguage} onChange={(event) => updateSection('general', { defaultLanguage: event.target.value as 'vi' | 'en' })}>
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </BeautifulSelect>
                  </Field>
                  <Field
                    label="Tiền tệ báo cáo mặc định"
                    hint="Dùng để quy đổi và tổng hợp doanh thu, công nợ trên các màn quản trị; đồng thời là giá trị mặc định khi tạo gói hoặc hóa đơn mới."
                  >
                    <BeautifulSelect className="form-control" value={draft.general.currency} onChange={(event) => updateSection('general', { currency: event.target.value as 'VND' | 'USD' })}>
                      <option value="VND">VND — Việt Nam Đồng</option>
                      <option value="USD">USD — US Dollar</option>
                    </BeautifulSelect>
                  </Field>
                  <Field label="Múi giờ" className="sm:col-span-2">
                    <BeautifulSelect className="form-control" value={draft.general.timezone} onChange={(event) => updateSection('general', { timezone: event.target.value })}>
                      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                      <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                      <option value="Europe/London">Europe/London (GMT+0)</option>
                    </BeautifulSelect>
                  </Field>
                </div>
                <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3 text-[11px] leading-relaxed text-brand-text-muted">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                    <p>
                      <strong className="text-brand-text">Không thay đổi giá đã niêm yết:</strong> mỗi gói vẫn có thể dùng VND hoặc USD riêng.
                      Khi tổng hợp báo cáo, hệ thống mới quy đổi các giá trị đó về <strong className="text-brand-text">{draft.general.currency}</strong>.
                    </p>
                  </div>
                </div>
              </SettingsPanel>

              <SettingsPanel icon={<Settings className="w-4 h-4" />} title="Vận hành hệ thống" description="Điều khiển trạng thái truy cập toàn nền tảng." pending="Hiện chỉ hiển thị dải cảnh báo trong trang quản trị của Superadmin. Việc chặn tenant đăng nhập cần xử lý ở phía máy chủ.">
                <ToggleRow
                  label="Chế độ bảo trì"
                  description="Dự kiến tạm chặn tenant truy cập trong khi nâng cấp. Hiện chỉ hiện dải cảnh báo cho Superadmin."
                  checked={draft.general.maintenanceMode}
                  onChange={(checked) => updateSection('general', { maintenanceMode: checked })}
                  warning
                />
                {draft.general.maintenanceMode && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-500 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Tenant sẽ bị chặn truy cập sau khi cấu hình này được lưu và backend áp dụng chính sách.
                  </div>
                )}
                <div className="rounded-lg border border-brand-outline/30 bg-brand-surface-high/30 p-3 text-[11px] leading-relaxed text-brand-text-muted">
                  <strong className="text-brand-text">Phạm vi:</strong> các thiết lập ở trang này được lưu tập trung trên trình duyệt hiện tại. Sự kiện cập nhật đã sẵn sàng để backend hoặc các module khác đồng bộ khi được tích hợp.
                </div>
              </SettingsPanel>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SettingsPanel icon={<CreditCard className="w-4 h-4" />} title="Công nợ & tạm ngưng dịch vụ" description="Quy tắc cảnh báo và xử lý tenant quá hạn thanh toán." pending="Giá trị được lưu lại nhưng chưa có tác vụ định kỳ nào đọc để tự tạm ngưng hay nhắc nợ.">
                <ToggleRow label="Tự động tạm ngưng tenant nợ cước" description="Tác vụ định kỳ sẽ kiểm tra hóa đơn quá hạn và tạm ngưng tenant đủ điều kiện." checked={draft.billing.autoLock} onChange={(checked) => updateSection('billing', { autoLock: checked })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Cảnh báo sau khi quá hạn" suffix="ngày" error={errors['billing.warnDays']}>
                    <input className="form-control" type="number" min={0} max={90} disabled={!draft.billing.autoLock} value={draft.billing.warnDays} onChange={(event) => updateSection('billing', { warnDays: Number(event.target.value) })} />
                  </Field>
                  <Field label="Tạm ngưng sau khi quá hạn" suffix="ngày" error={errors['billing.lockDays']}>
                    <input className="form-control" type="number" min={1} max={180} disabled={!draft.billing.autoLock} value={draft.billing.lockDays} onChange={(event) => updateSection('billing', { lockDays: Number(event.target.value) })} />
                  </Field>
                </div>
                <div className="rounded-lg border border-brand-tertiary/20 bg-brand-tertiary/5 p-3 text-[11px] leading-relaxed text-brand-text-muted">
                  Khi bật, tenant được cảnh báo ở ngày thứ <strong className="text-brand-text">{draft.billing.warnDays}</strong> và tạm ngưng ở ngày thứ <strong className="text-brand-text">{draft.billing.lockDays}</strong> kể từ hạn thanh toán.
                </div>
              </SettingsPanel>

              <SettingsPanel icon={<Clock3 className="w-4 h-4" />} title="Chu kỳ hóa đơn & gia hạn" description="Mốc thời gian mặc định khi tạo hóa đơn định kỳ." pending="Hóa đơn định kỳ hiện dùng mốc mặc định trong mã nguồn, chưa đọc các giá trị này.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Hạn thanh toán hóa đơn" suffix="ngày" error={errors['billing.invoiceDueDays']} hint="Tính từ ngày phát hành hóa đơn.">
                    <input className="form-control" type="number" min={1} max={90} value={draft.billing.invoiceDueDays} onChange={(event) => updateSection('billing', { invoiceDueDays: Number(event.target.value) })} />
                  </Field>
                  <Field label="Nhắc trước ngày gia hạn" suffix="ngày" error={errors['billing.renewalReminderDays']}>
                    <input className="form-control" type="number" min={1} max={60} value={draft.billing.renewalReminderDays} onChange={(event) => updateSection('billing', { renewalReminderDays: Number(event.target.value) })} />
                  </Field>
                </div>
                <div className="rounded-lg border border-brand-outline/30 bg-brand-surface-high/30 p-3 text-[11px] leading-relaxed text-brand-text-muted">
                  Các mốc này là giá trị mặc định cho hóa đơn mới. Hóa đơn đã phát hành và lịch gia hạn đã chốt không bị thay đổi hồi tố.
                </div>
              </SettingsPanel>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SettingsPanel icon={<Mail className="w-4 h-4" />} title="Máy chủ SMTP" description="Thông số gửi thư kích hoạt, hóa đơn và cảnh báo hệ thống." pending="Chưa có dịch vụ gửi thư nào được nối; thông số lưu sẵn để dùng khi backend email hoàn thiện.">
                <ToggleRow label="Bật gửi email hệ thống" description="Tắt để ngừng toàn bộ email tự động từ SalonSys." checked={draft.email.enabled} onChange={(checked) => updateSection('email', { enabled: checked })} />
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${draft.email.enabled ? '' : 'opacity-50'}`}>
                  <Field label="SMTP server" required error={errors['email.smtpServer']} className="sm:col-span-2">
                    <input className="form-control" disabled={!draft.email.enabled} value={draft.email.smtpServer} onChange={(event) => updateSection('email', { smtpServer: event.target.value })} placeholder="smtp.example.com" />
                  </Field>
                  <Field label="Cổng" required error={errors['email.smtpPort']}>
                    <input className="form-control" type="number" min={1} max={65535} disabled={!draft.email.enabled} value={draft.email.smtpPort} onChange={(event) => updateSection('email', { smtpPort: Number(event.target.value) })} />
                  </Field>
                  <Field label="Mã hóa">
                    <BeautifulSelect className="form-control" disabled={!draft.email.enabled} value={draft.email.encryption} onChange={(event) => updateSection('email', { encryption: event.target.value as SystemSettingsModel['email']['encryption'] })}>
                      <option value="STARTTLS">STARTTLS</option>
                      <option value="SSL">SSL/TLS</option>
                      <option value="NONE">Không mã hóa</option>
                    </BeautifulSelect>
                  </Field>
                  <Field label="Tên đăng nhập" className="sm:col-span-2">
                    <input className="form-control" disabled={!draft.email.enabled} value={draft.email.smtpUsername} onChange={(event) => updateSection('email', { smtpUsername: event.target.value })} placeholder="apikey hoặc email SMTP" />
                  </Field>
                  <Field label="Tên người gửi" required error={errors['email.senderName']}>
                    <input className="form-control" disabled={!draft.email.enabled} value={draft.email.senderName} onChange={(event) => updateSection('email', { senderName: event.target.value })} />
                  </Field>
                  <Field label="Email người gửi" required error={errors['email.senderEmail']}>
                    <input className="form-control" type="email" disabled={!draft.email.enabled} value={draft.email.senderEmail} onChange={(event) => updateSection('email', { senderEmail: event.target.value })} />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={handleCheckEmail} disabled={!draft.email.enabled} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-outline/40 bg-brand-surface-high px-3 py-2 text-xs font-semibold text-brand-text cursor-pointer hover:bg-brand-surface-highest disabled:opacity-40 disabled:cursor-not-allowed">
                    <RefreshCcw className="w-3.5 h-3.5" /> <span>Kiểm tra thông số</span>
                  </button>
                </div>
                <p className="text-[10px] text-brand-text-muted">Mật khẩu/API key không được lưu ở trình duyệt. Hãy quản lý bí mật SMTP ở biến môi trường của backend.</p>
              </SettingsPanel>

              <SettingsPanel icon={<BellRing className="w-4 h-4" />} title="Quy tắc thông báo" description="Chọn các sự kiện nghiệp vụ được phép gửi email tự động." pending="Phụ thuộc vào máy chủ SMTP ở trên, nên hiện chưa có email nào được gửi đi.">
                <ToggleRow label="Thông báo hóa đơn quá hạn" description="Gửi email tới Tenant Admin khi hóa đơn chuyển sang trạng thái quá hạn." checked={draft.email.notifyOverdue} disabled={!draft.email.enabled} onChange={(checked) => updateSection('email', { notifyOverdue: checked })} />
                <ToggleRow label="Thông báo gói sắp hết hạn" description={`Gửi trước ${draft.billing.renewalReminderDays} ngày theo cấu hình thanh toán.`} checked={draft.email.notifyExpiring} disabled={!draft.email.enabled} onChange={(checked) => updateSection('email', { notifyExpiring: checked })} />
                {!draft.email.enabled && <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-500">Các quy tắc đang tạm vô hiệu vì dịch vụ email đã tắt.</div>}
              </SettingsPanel>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SettingsPanel icon={<Clock3 className="w-4 h-4" />} title="Phiên đăng nhập" description="Giới hạn thời gian và số lần xác thực thất bại." pending="Lớp xác thực đang dùng giới hạn cố định 5 lần đăng nhập sai và không đọc các giá trị này.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Hết hạn phiên" suffix="phút" error={errors['security.sessionTimeout']} hint="Tự đăng xuất khi không có tương tác.">
                    <input className="form-control" type="number" min={5} max={1440} value={draft.security.sessionTimeout} onChange={(event) => updateSection('security', { sessionTimeout: Number(event.target.value) })} />
                  </Field>
                  <Field label="Số lần đăng nhập sai" suffix="lần" error={errors['security.maxLoginAttempts']} hint="Khóa tạm thời tài khoản khi vượt giới hạn.">
                    <input className="form-control" type="number" min={3} max={10} value={draft.security.maxLoginAttempts} onChange={(event) => updateSection('security', { maxLoginAttempts: Number(event.target.value) })} />
                  </Field>
                </div>
              </SettingsPanel>

              <SettingsPanel icon={<ShieldCheck className="w-4 h-4" />} title="Chính sách bảo mật" description="Yêu cầu tối thiểu cho tài khoản quản trị và nhật ký." pending="Bật MFA chưa thêm bước xác minh nào; độ dài mật khẩu tối thiểu chưa được biểu mẫu nào kiểm tra.">
                <ToggleRow label="Bắt buộc MFA cho Superadmin" description="Yêu cầu mã xác thực thứ hai khi đăng nhập tài khoản quản trị hệ thống." checked={draft.security.requireMfaForSuperadmin} onChange={(checked) => updateSection('security', { requireMfaForSuperadmin: checked })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Độ dài mật khẩu tối thiểu" suffix="ký tự" error={errors['security.passwordMinLength']}>
                    <input className="form-control" type="number" min={8} max={32} value={draft.security.passwordMinLength} onChange={(event) => updateSection('security', { passwordMinLength: Number(event.target.value) })} />
                  </Field>
                  <Field label="Lưu nhật ký kiểm toán" suffix="ngày" error={errors['security.auditRetentionDays']}>
                    <input className="form-control" type="number" min={30} max={3650} value={draft.security.auditRetentionDays} onChange={(event) => updateSection('security', { auditRetentionDays: Number(event.target.value) })} />
                  </Field>
                </div>
                <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3 text-[11px] leading-relaxed text-brand-text-muted flex items-start gap-2">
                  <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  Bật MFA chỉ kích hoạt chính sách. Luồng đăng ký thiết bị và xác minh OTP cần được backend xác nhận trước khi thực thi cho người dùng.
                </div>
              </SettingsPanel>
            </div>
          )}
        </div>
      </div>

      <div
        role="region"
        aria-label="Trạng thái lưu cấu hình"
        className="system-settings-savebar sticky bottom-4 z-20 rounded-2xl border border-brand-outline/60 bg-brand-surface/95 p-3 shadow-[0_18px_48px_rgba(31,39,65,0.14)] backdrop-blur-xl sm:px-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isDirty ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {isDirty ? <Clock3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-text">{isDirty ? 'Có thay đổi chưa được lưu' : 'Cấu hình đã đồng bộ'}</p>
              <p className="mt-0.5 truncate text-[10px] text-brand-text-muted">
                {isDirty ? 'Kiểm tra lại trước khi áp dụng cho toàn hệ thống.' : `Cập nhật gần nhất: ${lastUpdated}`}
                {errorCount > 0 ? ` · ${errorCount} lỗi cần sửa` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleSave} disabled={!isDirty} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-brand-on-primary whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">
            <Save className="w-4 h-4" /> <span>Lưu tất cả thay đổi</span>
          </button>
        </div>
      </div>

      <Modal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Khôi phục cấu hình mặc định?"
        description="Biểu mẫu sẽ trở về giá trị mặc định. Cấu hình đang lưu chỉ bị thay thế sau khi bạn nhấn “Lưu thay đổi”."
        size="small"
        footer={
          <>
            <button type="button" onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-lg border border-brand-outline/40 text-xs font-semibold text-brand-text-muted hover:text-brand-text cursor-pointer">Hủy</button>
            <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold cursor-pointer">Khôi phục mặc định</button>
          </>
        }
      />
    </div>
  );
}

function SettingsPanel({ icon, title, description, pending, children }: { icon: ReactNode; title: string; description: string; pending?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-brand-outline/35 bg-brand-surface-lowest/25 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-brand-outline/25">
        <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-brand-text">{title}</h2>
            {pending && <span className="ui-badge ui-badge--small ui-badge--neutral">Chưa có hiệu lực</span>}
          </div>
          <p className="text-caption text-brand-text-muted mt-1 leading-relaxed">{description}</p>
          {pending && <p className="text-caption text-brand-text-muted mt-1.5 leading-relaxed">{pending}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, error, hint, suffix, className = '', children }: { label: string; required?: boolean; error?: string; hint?: string; suffix?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide font-bold text-brand-text-muted mb-1.5">
        <span>{label}{required && <span className="text-brand-error ml-0.5">*</span>}</span>
        {suffix && <span className="normal-case font-medium text-brand-text-muted/70">{suffix}</span>}
      </span>
      {children}
      {error ? <span className="block text-[10px] text-brand-error mt-1.5">{error}</span> : hint ? <span className="block text-[10px] text-brand-text-muted mt-1.5">{hint}</span> : null}
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled = false, warning = false }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; warning?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border border-brand-outline/25 bg-brand-surface-high/25 p-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className={`text-xs font-bold ${warning && checked ? 'text-amber-400' : 'text-brand-text'}`}>{label}</p>
        <p className="text-[10px] text-brand-text-muted mt-1 leading-relaxed">{description}</p>
      </div>
      <label className={`relative inline-flex h-9 w-11 shrink-0 items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          role="switch"
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1/2 h-6 w-11 -translate-y-1/2 rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/45 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-brand-surface ${checked ? (warning ? 'border-amber-500 bg-amber-500' : 'border-brand-primary bg-brand-primary') : 'border-brand-outline/60 bg-brand-outline/35'}`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </label>
    </div>
  );
}

function StatusCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: 'success' | 'warning' | 'info' | 'neutral' }) {
  const toneStyles = {
    success: { pill: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-400' },
    warning: { pill: 'text-amber-400 bg-amber-500/10', dot: 'bg-amber-400' },
    info: { pill: 'text-brand-primary bg-brand-primary/10', dot: 'bg-brand-primary' },
    neutral: { pill: 'text-brand-text-muted bg-brand-outline/15', dot: 'bg-brand-outline' }
  }[tone];
  return (
    <div className="rounded-xl border border-brand-outline/35 bg-brand-surface p-4 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-wide font-bold text-brand-text-muted">{label}</p>
        <span className={`w-2 h-2 rounded-full ${toneStyles.dot}`} />
      </div>
      <p className={`inline-flex rounded-md px-2 py-1 text-xs font-bold mt-2 ${toneStyles.pill}`}>{value}</p>
      <p className="text-[10px] text-brand-text-muted mt-2 truncate" title={note}>{note}</p>
    </div>
  );
}

function Notice({ type, message, onClose }: { type: NoticeType; message: string; onClose: () => void }) {
  const style = type === 'success'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
    : type === 'error'
      ? 'border-rose-500/25 bg-rose-500/10 text-rose-400'
      : 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary';
  const icon = type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />;
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-xs font-medium ${style}`}>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="border-0 bg-transparent p-1 cursor-pointer opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}
