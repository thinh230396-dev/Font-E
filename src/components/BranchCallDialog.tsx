import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Phone, ShieldCheck, X } from 'lucide-react';

interface BranchCallDialogProps {
  branchName: string;
  phone: string;
  onClose: () => void;
}

export default function BranchCallDialog({ branchName, phone, onClose }: BranchCallDialogProps) {
  const [copied, setCopied] = useState(false);
  const normalizedPhone = phone.replace(/[^\d+]/g, '');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const copyPhone = async () => {
    await navigator.clipboard?.writeText(phone);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const startCall = () => {
    onClose();
    window.location.href = `tel:${normalizedPhone}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]">
      <button type="button" aria-label="Đóng hộp thoại gọi chi nhánh" onClick={onClose} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
      <section role="dialog" aria-modal="true" aria-labelledby="branch-call-title" aria-describedby="branch-call-description" className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#171328] via-[#241841] to-[#43246d] px-6 pb-7 pt-6 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20"><Phone className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">Liên hệ chi nhánh</p>
                <h2 id="branch-call-title" className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Gọi chi nhánh này?</h2>
                <p className="mt-2 truncate text-[10px] font-semibold text-slate-300">{branchName}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 p-0 text-slate-300 shadow-none hover:bg-white/15 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Số điện thoại chi nhánh</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{phone}</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100"><Phone className="h-5 w-5" /></span>
            </div>
          </div>

          <div id="branch-call-description" className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><ShieldCheck className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-black text-slate-800">Bạn vẫn kiểm soát cuộc gọi</p><p className="mt-1 text-[9px] leading-5 text-slate-500">SalonSys chỉ mở ứng dụng gọi điện trên thiết bị. Cuộc gọi chỉ bắt đầu sau khi bạn xác nhận trong ứng dụng đó.</p></div>
          </div>

          <p className="text-center text-[8px] leading-4 text-slate-400">Trên máy tính, Windows có thể yêu cầu bạn chọn Phone Link, Teams hoặc một ứng dụng gọi điện mặc định.</p>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-bold text-slate-600 shadow-sm">Hủy</button>
          <button type="button" onClick={() => void copyPhone()} className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[10px] font-black shadow-sm ${copied ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Đã sao chép số' : 'Sao chép số'}</button>
          <button type="button" onClick={startCall} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600 px-5 text-[10px] font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"><Phone className="h-4 w-4" />Mở ứng dụng gọi</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}