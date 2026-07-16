import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Crown,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';

interface LoginPageProps {
  systemName: string;
  onLogin: (remember: boolean) => void;
}

const roles = [
  {
    title: 'Superadmin',
    description: 'Quản trị toàn nền tảng',
    icon: Crown,
    tone: 'login-role--violet',
  },
  {
    title: 'Tenant Admin',
    description: 'Điều hành thương hiệu salon',
    icon: Building2,
    tone: 'login-role--cyan',
  },
  {
    title: 'Receptionist',
    description: 'Lịch hẹn và khách hàng',
    icon: CalendarDays,
    tone: 'login-role--emerald',
  },
];

export default function LoginPage({ systemName, onLogin }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    if (normalizedIdentifier.includes('@') && !/^\S+@\S+\.\S+$/.test(normalizedIdentifier)) {
      setError('Email chưa đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    if (!normalizedIdentifier.includes('@') && normalizedIdentifier.length < 3) {
      setError('Tên đăng nhập cần có ít nhất 3 ký tự.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => onLogin(remember), 650);
  };

  return (
    <main className="login-shell h-[100dvh] overflow-hidden bg-[#f6f7fb] text-slate-950">
      <div className="grid h-full lg:grid-cols-[1.06fr_0.94fr]">
        <section className="login-showcase relative hidden h-full overflow-hidden bg-[#151129] px-10 py-8 text-white lg:flex lg:flex-col xl:px-16 xl:py-10">
          <div className="login-orb login-orb-one" aria-hidden="true" />
          <div className="login-orb login-orb-two" aria-hidden="true" />
          <div className="login-showcase-glow" aria-hidden="true" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6d28d9] shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
                <Store className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-base font-extrabold tracking-[-0.02em]">{systemName}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-200/65">Salon management platform</p>
              </div>
            </div>
            <div className="login-showcase-status flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-semibold text-violet-100/75 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
              Hệ thống sẵn sàng
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-[690px] py-7">
            <div className="login-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Một nền tảng · Mọi vị trí
            </div>
            <h1 className="max-w-[650px] text-[clamp(2.65rem,3.75vw,4.1rem)] font-black leading-[1.02] tracking-[-0.052em]">
              Một điểm đăng nhập.
              <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">Mọi nhịp vận hành.</span>
            </h1>
            <p className="login-left-description mt-5 max-w-[570px] text-[14px] leading-6 text-slate-300/72">
              Từ quản trị toàn hệ thống đến vận hành tại quầy, mỗi thành viên đều được đưa đến đúng không gian làm việc của mình.
            </p>

            <div className="login-benefits mt-7 grid max-w-[680px] gap-3 sm:grid-cols-3" aria-label="Các vai trò được hỗ trợ">
              {roles.map(({ title, description, icon: Icon, tone }) => (
                <div key={title} className={`login-role-card ${tone} rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm`}>
                  <div className="login-role-icon mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  <p className="text-[12px] font-extrabold text-white">{title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-300/65">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="login-showcase-footer relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] text-slate-400/65">
            <span>© 2026 {systemName}</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Dữ liệu được mã hóa và bảo vệ</span>
          </div>
        </section>

        <section className="relative flex h-full items-center justify-center overflow-hidden px-5 py-5 sm:px-10 lg:px-12 xl:px-20">
          <div className="absolute left-5 top-5 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6d28d9] text-white shadow-lg shadow-violet-200">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900">{systemName}</span>
          </div>

          <div className="w-full max-w-[460px] animate-login-enter">
            <div className="login-card rounded-[30px] border border-slate-200/85 bg-white p-6 shadow-[0_28px_80px_rgba(36,24,67,0.11)] sm:p-8">
              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#6d28d9] ring-1 ring-violet-200/70">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-emerald-700 ring-1 ring-emerald-200/70">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Đăng nhập an toàn
                  </div>
                </div>
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7c3aed]">Cổng nhân sự {systemName}</p>
                <h2 className="text-[1.85rem] font-black tracking-[-0.04em] text-slate-950 sm:text-[2.05rem]">Chào mừng bạn quay lại</h2>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  Hệ thống sẽ tự nhận diện vai trò và đưa bạn đến đúng không gian làm việc.
                </p>
              </div>

              <div className="login-role-strip mb-5 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5" aria-label="Hỗ trợ đăng nhập cho Superadmin, Tenant Admin và Receptionist">
                {roles.map(({ title, icon: Icon }) => (
                  <div key={title} className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-[9px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/70">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <span className="truncate">{title}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-identifier" className="mb-2 block text-[12px] font-bold text-slate-700">Email hoặc tên đăng nhập</label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#7c3aed]" />
                    <input
                      id="login-identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="tenban@salonsys.vn"
                      aria-describedby={error ? 'login-error' : undefined}
                      className="login-control h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label htmlFor="login-password" className="text-[12px] font-bold text-slate-700">Mật khẩu</label>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice('Vui lòng liên hệ quản trị viên phụ trách tài khoản của bạn để đặt lại mật khẩu.');
                        setError('');
                      }}
                      className="login-text-button min-h-0 border-0 bg-transparent p-0 text-[11px] font-bold text-[#7c3aed] shadow-none hover:text-[#5b21b6]"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="group relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#7c3aed]" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Nhập mật khẩu của bạn"
                      aria-describedby={error ? 'login-error' : undefined}
                      className="login-control h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-pressed={showPassword}
                      className="login-password-toggle absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent text-slate-400 shadow-none hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[12px] font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#6d28d9]"
                    />
                    Duy trì đăng nhập
                  </label>
                  <span className="hidden items-center gap-1 text-[9px] font-semibold text-slate-400 sm:flex">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Phiên được bảo vệ
                  </span>
                </div>

                <div className="min-h-4" aria-live="polite">
                  {error && <p id="login-error" role="alert" className="text-[11px] font-semibold text-rose-600">{error}</p>}
                  {!error && notice && <p className="text-[11px] font-medium text-slate-500">{notice}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="login-submit flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-800 bg-[#6d28d9] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(109,40,217,0.22)] transition hover:bg-[#5b21b6] focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-wait"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Đang xác thực tài khoản...
                    </>
                  ) : (
                    <>
                      Tiếp tục đăng nhập
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="login-trust-note mt-4 flex items-start justify-center gap-2.5 px-4 text-center text-[10px] leading-4 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p>Quyền truy cập được cấp theo vai trò, chi nhánh và chính sách của tổ chức.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
