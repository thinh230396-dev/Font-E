import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Search,
  UserRound,
  X,
  XCircle
} from 'lucide-react';
import type { PackageUpgradeRequest, PackageUpgradeRequestStatus } from '../types';
import BeautifulSelect from './BeautifulSelect';

interface PackageUpgradeRequestsProps {
  requests: PackageUpgradeRequest[];
  onReview: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string,
    effectiveDate: 'immediate' | 'next_cycle'
  ) => void;
}

const statusMeta: Record<PackageUpgradeRequestStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  PENDING: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Clock3 },
  APPROVED: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Từ chối', className: 'bg-rose-50 text-rose-700 ring-rose-200', icon: XCircle }
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
};

const formatMoney = (value: number, currency: string) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency,
  maximumFractionDigits: currency === 'VND' ? 0 : 2
}).format(value);

export default function PackageUpgradeRequests({ requests, onReview }: PackageUpgradeRequestsProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | PackageUpgradeRequestStatus>('PENDING');
  const [query, setQuery] = useState('');
  const [reviewing, setReviewing] = useState<PackageUpgradeRequest | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [effectiveDate, setEffectiveDate] = useState<'immediate' | 'next_cycle'>('next_cycle');
  const [reviewNote, setReviewNote] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return requests
      .filter((request) => statusFilter === 'ALL' || request.status === statusFilter)
      .filter((request) => !normalizedQuery || [
        request.id,
        request.tenantName,
        request.requestedByName,
        request.requestedByEmail,
        request.currentPackageName,
        request.requestedPackageName
      ].join(' ').toLocaleLowerCase('vi').includes(normalizedQuery));
  }, [query, requests, statusFilter]);

  const openReview = (request: PackageUpgradeRequest, nextDecision: 'APPROVED' | 'REJECTED') => {
    setReviewing(request);
    setDecision(nextDecision);
    setEffectiveDate(request.effectiveDate);
    setReviewNote('');
    setFormError('');
  };

  const submitReview = () => {
    if (!reviewing) return;
    if (decision === 'REJECTED' && reviewNote.trim().length < 8) {
      setFormError('Vui lòng nhập lý do từ chối tối thiểu 8 ký tự.');
      return;
    }
    onReview(reviewing.id, decision, reviewNote.trim(), effectiveDate);
    setReviewing(null);
  };

  const pendingCount = requests.filter((request) => request.status === 'PENDING').length;
  const approvedCount = requests.filter((request) => request.status === 'APPROVED').length;
  const rejectedCount = requests.filter((request) => request.status === 'REJECTED').length;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Chờ Super Admin duyệt', value: pendingCount, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Đã phê duyệt', value: approvedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Đã từ chối', value: rejectedCount, icon: XCircle, tone: 'bg-rose-50 text-rose-700' }
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-xl border border-brand-outline/35 bg-brand-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase text-brand-text-muted">{label}</p><p className="mt-2 text-2xl font-black text-brand-text">{value}</p></div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-brand-outline/35 bg-brand-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tenant, người gửi hoặc gói..." className="h-10 w-full rounded-lg border border-brand-outline/45 bg-brand-surface-lowest pl-10 pr-3 text-xs text-brand-text outline-none focus:border-brand-primary" />
          </div>
          <BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 w-full rounded-lg border border-brand-outline/45 bg-brand-surface-lowest px-3 text-xs font-bold text-brand-text md:w-44">
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
            <option value="ALL">Tất cả</option>
          </BeautifulSelect>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-brand-outline/40 bg-brand-surface shadow-md">
        {filtered.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <PackageCheck className="h-10 w-10 text-brand-text-muted/40" />
            <p className="mt-4 text-sm font-black text-brand-text">Không có yêu cầu phù hợp</p>
            <p className="mt-1 text-xs text-brand-text-muted">Yêu cầu nâng cấp mới từ Tenant Admin sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-outline/25">
            {filtered.map((request) => {
              const meta = statusMeta[request.status];
              const StatusIcon = meta.icon;
              return (
                <article key={request.id} className="p-4 sm:p-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(250px,1.1fr)_minmax(180px,.75fr)_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-black text-brand-primary">{request.id}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${meta.className}`}><StatusIcon className="h-3 w-3" />{meta.label}</span></div>
                      <p className="mt-2 truncate text-sm font-black text-brand-text">{request.tenantName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-brand-text-muted"><UserRound className="h-3 w-3" />{request.requestedByName} · {request.requestedByEmail}</p>
                      <p className="mt-1 text-[10px] text-brand-text-muted">{formatDateTime(request.requestedAt)}</p>
                    </div>

                    <div className="rounded-xl bg-brand-surface-lowest p-4">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1"><p className="text-[9px] font-bold text-brand-text-muted">Gói hiện tại</p><p className="mt-1 truncate text-xs font-black text-brand-text">{request.currentPackageName}</p></div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-brand-primary" />
                        <div className="min-w-0 flex-1 text-right"><p className="text-[9px] font-bold text-brand-text-muted">Gói yêu cầu</p><p className="mt-1 truncate text-xs font-black text-brand-primary">{request.requestedPackageName}</p></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-[10px]">
                      <p className="flex items-center gap-2 text-brand-text-muted"><CircleDollarSign className="h-3.5 w-3.5 text-brand-primary" /><strong className="text-brand-text">{formatMoney(request.quotedAmount, request.currency)}</strong> / {request.billingCycle === 'yearly' ? 'năm' : 'tháng'}</p>
                      <p className="flex items-center gap-2 text-brand-text-muted"><CalendarClock className="h-3.5 w-3.5 text-brand-primary" />{request.effectiveDate === 'immediate' ? 'Áp dụng ngay' : 'Chu kỳ tiếp theo'}</p>
                      {request.reviewNote && <p className="line-clamp-2 text-brand-text-muted">Ghi chú: {request.reviewNote}</p>}
                      {request.invoiceId && <p className="font-bold text-brand-primary">Hóa đơn: {request.invoiceId}</p>}
                    </div>

                    <div className="flex gap-2 xl:justify-end">
                      {request.status === 'PENDING' ? (
                        <>
                          <button type="button" onClick={() => openReview(request, 'REJECTED')} className="h-10 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[10px] font-black text-rose-700 shadow-none">Từ chối</button>
                          <button type="button" onClick={() => openReview(request, 'APPROVED')} className="flex h-10 items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-600 px-4 text-[10px] font-black text-white shadow-md"><Check className="h-3.5 w-3.5" />Duyệt</button>
                        </>
                      ) : (
                        <span className="text-right text-[10px] text-brand-text-muted">{request.reviewedBy}<br />{formatDateTime(request.reviewedAt)}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {reviewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" aria-label="Đóng" onClick={() => setReviewing(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <section className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className={`p-6 text-white ${decision === 'APPROVED' ? 'bg-gradient-to-br from-emerald-700 to-emerald-950' : 'bg-gradient-to-br from-rose-700 to-rose-950'}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-white/70">{decision === 'APPROVED' ? 'Phê duyệt nâng cấp' : 'Từ chối yêu cầu'}</p><h2 className="mt-2 text-xl font-black">{reviewing.tenantName}</h2><p className="mt-1 text-xs text-white/70">{reviewing.currentPackageName} → {reviewing.requestedPackageName}</p></div><button type="button" onClick={() => setReviewing(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl border-0 bg-white/10 p-0 text-white shadow-none"><X className="h-4 w-4" /></button></div>
            </div>
            <div className="space-y-4 p-6">
              {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}
              {decision === 'APPROVED' && (
                <fieldset>
                  <legend className="text-xs font-black text-slate-700">Thời điểm áp dụng</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(['immediate', 'next_cycle'] as const).map((value) => <label key={value} className={`cursor-pointer rounded-xl border p-4 ${effectiveDate === value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}><input type="radio" className="sr-only" checked={effectiveDate === value} onChange={() => setEffectiveDate(value)} /><p className="text-xs font-black text-slate-800">{value === 'immediate' ? 'Áp dụng ngay' : 'Chu kỳ tiếp theo'}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{value === 'immediate' ? 'Kích hoạt quyền gói sau khi duyệt.' : 'Ghi nhận thay đổi cho kỳ gia hạn tiếp theo.'}</p></label>)}
                  </div>
                </fieldset>
              )}
              <label><span className="mb-1.5 block text-xs font-black text-slate-700">{decision === 'REJECTED' ? 'Lý do từ chối *' : 'Ghi chú phê duyệt'}</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 outline-none focus:border-violet-400 focus:bg-white" placeholder={decision === 'REJECTED' ? 'Nêu rõ lý do để Tenant Admin biết cần bổ sung gì...' : 'Ghi chú cho bộ phận thanh toán hoặc tenant...'} /></label>
              {decision === 'APPROVED' && <div className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-700">Hệ thống sẽ cập nhật gói của tenant, tạo hóa đơn chờ thanh toán và ghi nhật ký phê duyệt.</div>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-5"><button type="button" onClick={() => setReviewing(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600">Hủy</button><button type="button" onClick={submitReview} className={`h-10 rounded-lg px-5 text-xs font-black text-white ${decision === 'APPROVED' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{decision === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
