import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
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

const benefits = [
  'Theo dõi toàn bộ tenant trong một màn hình',
  'Kiểm soát doanh thu, hóa đơn và gói dịch vụ',
  'Bảo mật dữ liệu với nhật ký hoạt động chi tiết',
];

export default function LoginPage({ systemName, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
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

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Email chưa đúng định dạng. Vui lòng kiểm tra lại.');
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
    <main className="login-shell min-h-screen bg-[#f7f5fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.04fr_0.96fr]">
        <section className="login-showcase relative hidden overflow-hidden bg-[#24163f] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
          <div className="login-orb login-orb-one" aria-hidden="true" />
          <div className="login-orb login-orb-two" aria-hidden="true" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6d28d9] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
              <Store className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-base font-extrabold tracking-[-0.02em]">{systemName}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/75">Superadmin portal</p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-xl py-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-violet-100 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Vận hành thông minh, tăng trưởng bền vững
            </div>
            <h1 className="max-w-[590px] text-[clamp(2.65rem,4.6vw,4.8rem)] font-black leading-[0.98] tracking-[-0.055em]">
              Trung tâm điều hành cho hệ thống salon của bạn.
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-7 text-violet-100/68">
              Quản lý tenant, gói dịch vụ và hiệu suất kinh doanh trên một nền tảng bảo mật, rõ ràng và dễ kiểm soát.
            </p>

            <div className="mt-9 space-y-3.5">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-[13px] font-medium text-violet-50/88">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-[10px] text-violet-200/55">
            <span>© 2026 {systemName}</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Kết nối được bảo vệ</span>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
          <div className="absolute left-5 top-5 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6d28d9] text-white shadow-lg shadow-violet-200">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900">{systemName}</span>
          </div>

          <div className="w-full max-w-[430px] animate-login-enter">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-[#6d28d9]">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7c3aed]">Chào mừng trở lại</p>
              <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-[2.15rem]">Đăng nhập Superadmin</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Sử dụng tài khoản quản trị để tiếp tục vào hệ thống.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-[13px] font-bold text-slate-700">Email quản trị</label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#7c3aed]" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="superadmin@salonsys.vn"
                    aria-describedby={error ? 'login-error' : undefined}
                    className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label htmlFor="login-password" className="text-[13px] font-bold text-slate-700">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice('Vui lòng liên hệ quản trị viên hệ thống để đặt lại mật khẩu.');
                      setError('');
                    }}
                    className="login-text-button min-h-0 border-0 bg-transparent p-0 text-[12px] font-bold text-[#7c3aed] shadow-none hover:text-[#5b21b6]"
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
                    className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
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

              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[13px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#6d28d9]"
                />
                Duy trì đăng nhập trên thiết bị này
              </label>

              <div className="min-h-5" aria-live="polite">
                {error && <p id="login-error" role="alert" className="text-[12px] font-semibold text-rose-600">{error}</p>}
                {!error && notice && <p className="text-[12px] font-medium text-slate-500">{notice}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="login-submit flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-violet-800 bg-[#6d28d9] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(109,40,217,0.22)] transition hover:bg-[#5b21b6] focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-4 text-[11px] leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p>Trang quản trị dành riêng cho người được ủy quyền. Mọi hoạt động đăng nhập đều được giám sát để bảo vệ dữ liệu hệ thống.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
