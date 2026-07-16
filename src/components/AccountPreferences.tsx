import {
  ArrowLeft,
  Check,
  ChevronRight,
  Globe2,
  Languages,
  MonitorCog,
  Moon,
  Palette,
  Settings2,
  ShieldCheck,
  Sun,
} from 'lucide-react';

export type InterfaceLanguage = 'vi' | 'en';

interface AccountPreferencesProps {
  themeMode: 'light' | 'dark';
  language: InterfaceLanguage;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLanguageChange: (language: InterfaceLanguage) => void;
  onBack: () => void;
  onOpenSystemSettings: () => void;
}

const languages: Array<{
  id: InterfaceLanguage;
  label: string;
  nativeLabel: string;
  shortCode: string;
}> = [
  { id: 'vi', label: 'Tiếng Việt', nativeLabel: 'Vietnamese', shortCode: 'VI' },
  { id: 'en', label: 'English', nativeLabel: 'Tiếng Anh', shortCode: 'EN' },
];

export default function AccountPreferences({
  themeMode,
  language,
  onThemeChange,
  onLanguageChange,
  onBack,
  onOpenSystemSettings,
}: AccountPreferencesProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="account-preference-back mb-3 inline-flex min-h-0 items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] font-bold text-brand-text-muted shadow-none hover:text-brand-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại tổng quan
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/15">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-brand-text sm:text-2xl">Tùy chọn cá nhân</h1>
              <p className="mt-1 text-[11px] text-brand-text-muted">Thiết lập ngôn ngữ và giao diện dành riêng cho tài khoản của bạn.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Tự động lưu trên thiết bị này
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-brand-outline/50 bg-brand-surface shadow-sm">
          <div className="flex items-start gap-3 border-b border-brand-outline/40 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-brand-text">Ngôn ngữ giao diện</h2>
              <p className="mt-1 text-[10px] leading-4 text-brand-text-muted">Chọn ngôn ngữ bạn muốn sử dụng trong không gian làm việc.</p>
            </div>
          </div>

          <div className="space-y-2.5 p-4">
            {languages.map((item) => {
              const isSelected = language === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onLanguageChange(item.id)}
                  aria-pressed={isSelected}
                  className={`account-preference-option flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-brand-primary/35 bg-brand-primary/[0.07]'
                      : 'border-brand-outline/45 bg-brand-surface-lowest hover:border-brand-primary/25 hover:bg-brand-surface-high'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black ${
                    isSelected ? 'bg-brand-primary text-white' : 'bg-brand-surface-highest text-brand-text-muted'
                  }`}>
                    {item.shortCode}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-extrabold text-brand-text">{item.label}</span>
                    <span className="mt-0.5 block text-[9px] text-brand-text-muted">{item.nativeLabel}</span>
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    isSelected ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-outline text-transparent'
                  }`}>
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl bg-brand-surface-high px-3 py-2.5 text-[9px] leading-4 text-brand-text-muted">
            <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary" />
            Lựa chọn cá nhân sẽ ưu tiên hơn ngôn ngữ mặc định của hệ thống trên thiết bị này.
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-brand-outline/50 bg-brand-surface shadow-sm">
          <div className="flex items-start gap-3 border-b border-brand-outline/40 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-brand-text">Chế độ hiển thị</h2>
              <p className="mt-1 text-[10px] leading-4 text-brand-text-muted">Chuyển đổi giao diện sáng hoặc tối theo môi trường làm việc.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              type="button"
              onClick={() => onThemeChange('light')}
              aria-pressed={themeMode === 'light'}
              className={`account-theme-option overflow-hidden rounded-xl border p-2.5 text-left ${
                themeMode === 'light' ? 'border-brand-primary bg-brand-primary/[0.06]' : 'border-brand-outline/50 bg-brand-surface-lowest'
              }`}
            >
              <span className="block rounded-lg border border-slate-200 bg-slate-100 p-2 shadow-inner">
                <span className="mb-2 flex gap-1"><i className="h-1.5 w-1.5 rounded-full bg-violet-500" /><i className="h-1.5 w-7 rounded-full bg-slate-300" /></span>
                <span className="grid grid-cols-[28%_1fr] gap-1.5"><i className="h-14 rounded bg-white shadow-sm" /><i className="h-14 rounded bg-white shadow-sm" /></span>
              </span>
              <span className="mt-3 flex items-center gap-2 px-1">
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="flex-1 text-[11px] font-extrabold text-brand-text">Giao diện sáng</span>
                {themeMode === 'light' && <Check className="h-3.5 w-3.5 text-brand-primary" />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onThemeChange('dark')}
              aria-pressed={themeMode === 'dark'}
              className={`account-theme-option overflow-hidden rounded-xl border p-2.5 text-left ${
                themeMode === 'dark' ? 'border-brand-primary bg-brand-primary/[0.06]' : 'border-brand-outline/50 bg-brand-surface-lowest'
              }`}
            >
              <span className="block rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-inner">
                <span className="mb-2 flex gap-1"><i className="h-1.5 w-1.5 rounded-full bg-violet-400" /><i className="h-1.5 w-7 rounded-full bg-slate-700" /></span>
                <span className="grid grid-cols-[28%_1fr] gap-1.5"><i className="h-14 rounded bg-slate-800" /><i className="h-14 rounded bg-slate-800" /></span>
              </span>
              <span className="mt-3 flex items-center gap-2 px-1">
                <Moon className="h-4 w-4 text-violet-500" />
                <span className="flex-1 text-[11px] font-extrabold text-brand-text">Giao diện tối</span>
                {themeMode === 'dark' && <Check className="h-3.5 w-3.5 text-brand-primary" />}
              </span>
            </button>
          </div>

          <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl bg-brand-surface-high px-3 py-2.5 text-[9px] leading-4 text-brand-text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            Thay đổi chỉ ảnh hưởng giao diện của tài khoản hiện tại, không tác động người dùng khác.
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-brand-outline/50 bg-brand-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface-highest text-brand-text-muted">
            <MonitorCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[12px] font-extrabold text-brand-text">Bạn cần cấu hình hệ thống?</h2>
            <p className="mt-1 text-[10px] leading-4 text-brand-text-muted">Chính sách vận hành, thanh toán, email và bảo mật được quản lý tại một trang riêng.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSystemSettings}
          className="account-system-settings inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-outline/50 bg-brand-surface-high px-4 py-2.5 text-[11px] font-bold text-brand-text hover:border-brand-primary/30 hover:text-brand-primary"
        >
          <span>Mở cấu hình hệ thống</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </section>
    </div>
  );
}
