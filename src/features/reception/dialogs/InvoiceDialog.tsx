/**
 * Hộp thoại lập hóa đơn và thu tiền — màn có tiền đi qua của quầy lễ tân.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27, là khối JSX lớn nhất của cổng (912 dòng). Thân
 * giữ nguyên từng dòng.
 *
 * ## Bốn mươi tám props, và vì sao vẫn chọn cách này
 *
 * Con số ấy lớn thật, và nó lớn vì màn này đúng là có ngần ấy phụ thuộc: một danh mục ba tab
 * kèm bộ lọc riêng, một bảng dòng hóa đơn sửa được tại chỗ, phép gộp hóa đơn cho khách đi theo
 * nhóm, khuyến mãi, chia tiền nhiều phương thức, và năm thành phần của phép tính tiền.
 *
 * Cách gọn hơn là gom chúng thành vài object — nhưng làm vậy phải sửa hàng trăm chỗ trong thân
 * JSX, và dự án này **không có phép kiểm thử nào bắt được một lỗi sửa sót ở đó**. Giữ nguyên tên
 * biến thì thân không đổi một dòng, đổi lại là một chữ ký dài. Với màn có tiền đi qua, đó là
 * đánh đổi đúng.
 *
 * Bước gọn thật sự về sau không phải gom props, mà là đưa cả cụm state của **bản nháp hóa đơn**
 * xuống chính màn này — lúc đó hơn hai chục props kia biến mất vì chúng sinh ra ngay tại đây.
 * Việc ấy đổi hành vi nên cần bàn trước, không làm lén trong một đợt tách.
 */

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  Minus,
  Palette,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Split,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import type { LoyaltyProgram } from '../../../utils/promotionUtils';
import { ART_DIFFICULTY_PRESETS, type NailArtTemplate } from '../catalogs';
import { methodMeta } from '../constants';
import { money } from '../format';
import { invoiceStaff } from '../mockSeed';
import type {
  BranchCode,
  CatalogItem,
  InvoiceLineDraft,
  InvoiceLineType,
  PaymentForm,
  PaymentMethod,
  ReceptionAppointment,
  SplitPaymentEntry
} from '../types';

export interface InvoiceDialogProps {
  /* ── Khách đang thu tiền ─────────────────────────────────────────────────────────── */
  paymentAppointment: ReceptionAppointment;
  setPaymentAppointment: Dispatch<SetStateAction<ReceptionAppointment | null>>;
  appointments: ReceptionAppointment[];
  branchCode: BranchCode;
  branchName: string;

  /** Chỉ đọc cờ `loading` để nói "đang tải bảng giá" — cố ý hẹp hơn cả kho dữ liệu dịch vụ. */
  salonServices: { loading: boolean };

  /* ── Bảng dòng hóa đơn ───────────────────────────────────────────────────────────── */
  invoiceLines: InvoiceLineDraft[];
  setInvoiceLines: Dispatch<SetStateAction<InvoiceLineDraft[]>>;
  updateInvoiceLine: (id: string, patch: Partial<InvoiceLineDraft>) => void;
  openLineCustomizer: (line: InvoiceLineDraft) => void;

  /* ── Danh mục ba tab và bộ lọc của nó ────────────────────────────────────────────── */
  activeCatalog: CatalogItem[];
  filteredCatalog: CatalogItem[];
  filteredArtTemplates: NailArtTemplate[];
  invoiceCategories: string[];
  invoiceCategory: string;
  setInvoiceCategory: Dispatch<SetStateAction<string>>;
  invoiceCatalogTab: 'SERVICE' | 'ART' | 'PRODUCT';
  setInvoiceCatalogTab: Dispatch<SetStateAction<'SERVICE' | 'ART' | 'PRODUCT'>>;
  invoiceCatalogQuery: string;
  setInvoiceCatalogQuery: Dispatch<SetStateAction<string>>;
  addCatalogItem: (type: InvoiceLineType, item: CatalogItem) => void;
  addArtServiceItem: (template: NailArtTemplate, targetDifficultyLevel?: number) => void;
  removeCatalogItem: (type: InvoiceLineType, item: CatalogItem) => void;

  /* ── Gộp hóa đơn cho khách đi theo nhóm ──────────────────────────────────────────── */
  mergedAppointmentIds: string[];
  mergeAppointmentToBill: (otherAppointment: ReceptionAppointment) => void;
  unmergeAppointmentFromBill: (appointmentId: string) => void;

  /* ── Khuyến mãi ──────────────────────────────────────────────────────────────────── */
  loyaltyPrograms: LoyaltyProgram[];
  selectedPromoId: string;
  setSelectedPromoId: Dispatch<SetStateAction<string>>;
  promoFeedback: { isError: boolean; text: string } | null;
  setPromoFeedback: Dispatch<SetStateAction<{ isError: boolean; text: string } | null>>;
  handleSelectPromo: (promoId: string, lines?: InvoiceLineDraft[]) => void;

  /* ── Năm thành phần của phép tính tiền ───────────────────────────────────────────── */
  invoiceSubtotal: number;
  invoiceDiscount: number;
  invoiceTip: number;
  invoiceTaxAndFees: number;
  invoiceTotal: number;

  /* ── Thu tiền: một phương thức, hoặc chia nhiều phương thức ──────────────────────── */
  paymentForm: PaymentForm;
  setPaymentForm: Dispatch<SetStateAction<PaymentForm>>;
  splitPaymentMode: boolean;
  setSplitPaymentMode: Dispatch<SetStateAction<boolean>>;
  splitPaymentsList: SplitPaymentEntry[];
  addSplitRow: () => void;
  removeSplitRow: (id: string) => void;
  updateSplitRow: (id: string, patch: Partial<SplitPaymentEntry>) => void;
  splitEqually: (numPeople: number) => void;

  formError: string;
  submitPayment: (event: FormEvent) => void;
}

export default function InvoiceDialog({
  paymentAppointment,
  setPaymentAppointment,
  appointments,
  branchCode,
  branchName,
  salonServices,
  invoiceLines,
  setInvoiceLines,
  updateInvoiceLine,
  openLineCustomizer,
  activeCatalog,
  filteredCatalog,
  filteredArtTemplates,
  invoiceCategories,
  invoiceCategory,
  setInvoiceCategory,
  invoiceCatalogTab,
  setInvoiceCatalogTab,
  invoiceCatalogQuery,
  setInvoiceCatalogQuery,
  addCatalogItem,
  addArtServiceItem,
  removeCatalogItem,
  mergedAppointmentIds,
  mergeAppointmentToBill,
  unmergeAppointmentFromBill,
  loyaltyPrograms,
  selectedPromoId,
  setSelectedPromoId,
  promoFeedback,
  setPromoFeedback,
  handleSelectPromo,
  invoiceSubtotal,
  invoiceDiscount,
  invoiceTip,
  invoiceTaxAndFees,
  invoiceTotal,
  paymentForm,
  setPaymentForm,
  splitPaymentMode,
  setSplitPaymentMode,
  splitPaymentsList,
  addSplitRow,
  removeSplitRow,
  updateSplitRow,
  splitEqually,
  formError,
  submitPayment
}: InvoiceDialogProps) {
  return (
        <Modal
          open
          size="fullscreen"
          icon={<ReceiptText />}
          title="Tạo hóa đơn & thanh toán"
          description={`${paymentAppointment.customer} · ${paymentAppointment.phone} · ${branchName}`}
          onClose={() => setPaymentAppointment(null)}
          footer={
            <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-brand-text-muted">Tổng thực thu:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{money(invoiceTotal)}</span>
                {paymentAppointment.deposit > 0 && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Đã trừ cọc {money(paymentAppointment.deposit)}
                  </span>
                )}
                {invoiceDiscount > 0 && (
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Giảm {money(invoiceDiscount)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button variant="secondary" onClick={() => setPaymentAppointment(null)}>
                  Đóng
                </Button>
                <button
                  type="submit"
                  form="reception-invoice-form"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Xác nhận thanh toán {money(invoiceTotal)}
                </button>
              </div>
            </div>
          }
        >
          {/* Nút thanh toán nằm cạnh khối tổng tiền trong cột phải, không tách ra
              chân hộp thoại — người thu ngân cần thấy số tiền ngay khi bấm. */}
          <form id="reception-invoice-form" onSubmit={submitPayment} className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:overflow-hidden">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface-high/25 lg:flex lg:min-h-0 lg:flex-col">
              <div className="shrink-0 border-b border-brand-outline p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-brand-text">Chọn dịch vụ, mẫu vẽ hoặc sản phẩm</h3>
                    <p className="mt-1 text-body text-brand-text-muted">Chọn dịch vụ, gắn mẫu vẽ theo độ khó hoặc thêm sản phẩm đi kèm.</p>
                  </div>
                  <div className="flex rounded-xl border border-brand-outline bg-brand-surface p-1">
                    <button type="button" onClick={() => { setInvoiceCatalogTab('SERVICE'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>Dịch vụ</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('ART'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'ART' ? 'bg-amber-600 text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>🎨 Mẫu vẽ & Độ khó</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('PRODUCT'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'PRODUCT' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>Sản phẩm</button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                  <input
                    value={invoiceCatalogQuery}
                    onChange={(event) => setInvoiceCatalogQuery(event.target.value)}
                    className="reception-input pl-10"
                    placeholder={
                      invoiceCatalogTab === 'SERVICE'
                        ? 'Tìm tên dịch vụ...'
                        : invoiceCatalogTab === 'ART'
                          ? 'Tìm mẫu nail art, phong cách vẽ tranh...'
                          : 'Tìm tên sản phẩm...'
                    }
                  />
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {invoiceCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setInvoiceCategory(category)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-bold ${
                        invoiceCategory === category
                          ? invoiceCatalogTab === 'SERVICE'
                            ? 'border-brand-secondary bg-brand-secondary text-white'
                            : invoiceCatalogTab === 'ART'
                              ? 'border-amber-600 bg-amber-600 text-white'
                              : 'border-brand-primary bg-brand-primary text-white'
                          : 'border-brand-outline bg-brand-surface text-brand-text-muted'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh sách dịch vụ / Mẫu vẽ / Sản phẩm */}
              {invoiceCatalogTab === 'ART' ? (
                <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-2">
                  {filteredArtTemplates.map((template) => {
                    const preset = ART_DIFFICULTY_PRESETS.find(p => p.level === template.defaultLevel);
                    return (
                      <div
                        key={template.id}
                        className="group relative flex flex-col rounded-2xl border border-amber-500/30 bg-brand-surface p-4 shadow-sm transition-all duration-300 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-caption font-bold text-amber-700 dark:text-amber-300">
                              {template.category}
                            </span>
                            <h4 className="mt-1 text-xs font-black text-brand-text">{template.name}</h4>
                          </div>
                          <span className="shrink-0 rounded-lg bg-brand-surface-high border border-amber-500/30 px-2 py-1 text-right">
                            <span className="block text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">{preset?.shortLabel}</span>
                            <span className="block text-caption font-black text-brand-text">+{money(template.surcharge)}</span>
                          </span>
                        </div>

                        <p className="mt-2 text-caption text-brand-text-muted line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.tags.map(t => (
                            <span key={t} className="rounded bg-brand-surface-high/60 px-1.5 py-0.5 text-[10px] text-brand-text-muted">
                              #{t}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-brand-outline/40">
                          <span className="text-caption text-brand-text-muted font-bold">
                            Thời gian: ~{template.duration}p
                          </span>
                          <button
                            type="button"
                            onClick={() => addArtServiceItem(template)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3 py-1.5 text-caption font-black shadow-sm transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm dịch vụ sơn + vẽ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!filteredArtTemplates.length && (
                    <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">
                      Không tìm thấy mẫu vẽ phù hợp.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-3">
                  {filteredCatalog.map((item, index) => {
                    const count = invoiceLines.filter((line) => line.type === invoiceCatalogTab && line.name === item.name).reduce((sum, line) => sum + line.quantity, 0);
                    return (
                      <div
                        key={item.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            addCatalogItem(invoiceCatalogTab, item);
                          }
                        }}
                        className="group relative flex min-h-[170px] flex-col rounded-2xl border border-brand-outline bg-brand-surface p-4 text-left shadow-sm transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-brand-secondary hover:shadow-lg hover:shadow-card focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                      >
                        {count > 0 && <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-secondary px-1.5 text-caption font-black text-white">{count}</span>}
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? ' text-brand-secondary' : ' text-brand-primary'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <span className="mt-3 line-clamp-2 text-xs font-black leading-5 text-brand-text">{item.name}</span>
                        <span className="mt-1 text-caption font-semibold text-brand-text-muted">{item.category}</span>
                        <span className="mt-auto flex items-end justify-between gap-3 pt-3">
                          <span>
                            <span className={`block text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? 'text-brand-secondary' : 'text-brand-primary'}`}>{money(item.price)}</span>
                            <span className="mt-0.5 block text-caption text-brand-text-muted">{invoiceCatalogTab === 'SERVICE' ? `${item.duration} phút` : `Còn ${item.stock} sản phẩm`}</span>
                          </span>
                          {count > 0 ? (
                            <span className="flex items-center gap-1.5 shrink-0 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => removeCatalogItem(invoiceCatalogTab, item)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text hover:bg-brand-surface-high transition-all duration-200 cursor-pointer shadow-sm"
                                aria-label="Giảm số lượng"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-body font-black w-5 text-center text-brand-text">{count}</span>
                              <button
                                type="button"
                                onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary hover:bg-brand-secondary' : 'bg-brand-primary hover:bg-brand-primary'}`}
                                aria-label="Tăng số lượng"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ) : (
                            <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 group-hover:scale-105 shrink-0 ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary' : 'bg-brand-primary'}`}>
                              <Plus className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {!filteredCatalog.length && (
                    <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">
                      {invoiceCatalogTab === 'SERVICE' && activeCatalog.length === 0
                        ? (salonServices.loading ? 'Đang tải bảng giá dịch vụ…' : 'Tiệm chưa khai dịch vụ nào.')
                        : 'Không tìm thấy mục phù hợp.'}
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="min-w-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 scrollbar-thin scrollbar-thumb-brand-outline/60">
              {/* Thẻ 1: Khách hàng & Bảng danh sách dịch vụ đã chọn */}
              <div className="selected-services rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-sm flex flex-col w-full min-w-0 lg:flex-1 lg:min-h-[360px] min-h-[320px] overflow-hidden overflow-x-hidden">
                <div className="flex items-center gap-3 border-b border-brand-outline pb-3 shrink-0 w-full min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white font-black text-sm shadow-sm">
                    {paymentAppointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-black text-brand-text">{paymentAppointment.customer}</p>
                      <span className="shrink-0 rounded-md bg-brand-secondary/10 px-1.5 py-0.5 text-caption font-bold text-brand-secondary">Đã check-in</span>
                    </div>
                    <p className="mt-0.5 truncate text-caption text-brand-text-muted">{paymentAppointment.phone} · ID: {paymentAppointment.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-1 text-caption font-black text-brand-primary">{branchCode}</span>
                </div>

                {/* 🔗 GỘP HÓA ĐƠN (MERGE BILLS) CHO KHÁCH ĐI THEO NHÓM / MẸ CON / BẠN BÈ */}
                <div className="mt-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
                      <UsersRound className="h-3.5 w-3.5" /> Gộp hóa đơn nhóm / bạn bè (Merge Bills)
                    </span>
                    {mergedAppointmentIds.length > 0 && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        Đang gộp {mergedAppointmentIds.length} khách
                      </span>
                    )}
                  </div>

                  {mergedAppointmentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mergedAppointmentIds.map((mId) => {
                        const mApp = appointments.find((a) => a.id === mId);
                        return (
                          <span
                            key={mId}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                          >
                            <span>🔗 {mApp?.customer || mId} ({mApp?.station || 'Ghế'})</span>
                            <button
                              type="button"
                              onClick={() => unmergeAppointmentFromBill(mId)}
                              className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                              title="Tách ra khỏi hóa đơn này"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Danh sách các khách/ghế khác đang hoạt động có thể gộp */}
                  {appointments.filter((a) => a.id !== paymentAppointment.id && a.branch === branchCode && ['CHECKED_IN', 'IN_SERVICE'].includes(a.status) && !mergedAppointmentIds.includes(a.id)).length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-caption">
                      <span className="text-brand-text-muted font-bold">Gộp thêm:</span>
                      {appointments
                        .filter((a) => a.id !== paymentAppointment.id && a.branch === branchCode && ['CHECKED_IN', 'IN_SERVICE'].includes(a.status) && !mergedAppointmentIds.includes(a.id))
                        .slice(0, 3)
                        .map((otherApp) => (
                          <button
                            key={otherApp.id}
                            type="button"
                            onClick={() => mergeAppointmentToBill(otherApp)}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-brand-surface px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer shadow-2xs"
                          >
                            <Plus className="h-2.5 w-2.5" /> {otherApp.customer} ({otherApp.station || otherApp.start})
                          </button>
                        ))}
                    </div>
                  ) : (
                    mergedAppointmentIds.length === 0 && (
                      <p className="text-[11px] text-brand-text-muted">
                        Không có khách đang làm khác tại chi nhánh để gộp.
                      </p>
                    )
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 shrink-0 pb-2 w-full min-w-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ReceiptText className="h-3.5 w-3.5 text-brand-secondary shrink-0" />
                    <h3 className="text-xs font-black text-brand-text truncate">Chi tiết dịch vụ, giá tiền & ưu đãi</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-caption font-bold">
                    <span className="rounded-full bg-brand-surface-high px-2 py-0.5 text-brand-text-muted shrink-0">{invoiceLines.length} dòng</span>
                    <span className="rounded-full bg-brand-secondary/10 px-2 py-0.5 text-brand-secondary shrink-0">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                    {invoiceDiscount > 0 && <span className="rounded-full bg-brand-error/10 px-2 py-0.5 text-brand-error shrink-0">Ưu đãi -{money(invoiceDiscount)}</span>}
                  </div>
                </div>

                {/* Khung Bảng dịch vụ */}
                <div className="service-list-container mt-1 flex-1 flex flex-col min-h-[240px] w-full min-w-0 overflow-hidden overflow-x-hidden rounded-xl border border-brand-outline/60 bg-brand-surface-high/20">
                  {/* Hàng tiêu đề Bảng */}
                  <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-center gap-1 px-2 py-2 text-caption font-extrabold uppercase tracking-wider text-brand-text-muted border-b border-brand-outline bg-brand-surface-high/50 shrink-0 w-full min-w-0">
                    <span className="text-center min-w-0">STT</span>
                    <span className="min-w-0">Dịch vụ & Mẫu vẽ đi kèm</span>
                    <span className="text-right min-w-0">Đơn giá</span>
                    <span className="min-w-0">Kỹ thuật viên</span>
                    <span className="text-center min-w-0">Số lượng</span>
                    <span className="text-right min-w-0">Thành tiền</span>
                    <span className="text-center min-w-0">Xóa</span>
                  </div>

                  {/* Vùng cuộn các dòng Bảng */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 divide-y divide-brand-outline/40 scrollbar-thin scrollbar-thumb-brand-outline/60 py-0.5">
                    {invoiceLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="w-full min-w-0 text-xs transition-colors hover:bg-brand-surface-high/40 shrink-0"
                      >
                        {/* 1-Row Grid Layout chuẩn xác trên xl: */}
                        <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-start gap-1 w-full min-w-0 px-2 py-2.5">
                          {/* STT */}
                          <div className="flex justify-center items-center min-w-0 pt-1">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-caption font-black border ${line.type === 'SERVICE' ? 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary' : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Tên dịch vụ & Mẫu vẽ + Độ khó + Phụ kiện đi kèm */}
                          <div className="min-w-0 pr-1">
                            <p className="font-bold text-brand-text text-body leading-snug min-w-0">
                              {line.name}
                            </p>
                            
                            {/* Chi tiết mẫu vẽ, màu sơn, phụ kiện nếu có */}
                            <div className="mt-1 space-y-1">
                              {line.designName && (
                                <div className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  <span>🎨 Mẫu: {line.designName}</span>
                                  {line.difficultyLabel && (
                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-black">
                                      {line.difficultyLabel}
                                    </span>
                                  )}
                                  {line.designSurcharge ? (
                                    <span className="text-amber-800 dark:text-amber-200 font-extrabold">
                                      (+{money(line.designSurcharge)})
                                    </span>
                                  ) : null}
                                </div>
                              )}

                              {line.attachedColorName && (
                                <div className="flex items-center gap-1 text-[11px] text-brand-text-muted">
                                  {line.attachedColorHex && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-black/20"
                                      style={{ backgroundColor: line.attachedColorHex }}
                                    />
                                  )}
                                  <span>Màu: <strong className="text-brand-text">{line.attachedColorName}</strong></span>
                                </div>
                              )}

                              {line.attachedProductName && (
                                <div className="text-[11px] text-brand-text-muted">
                                  <span>💎 Kèm: <strong className="text-brand-text">{line.attachedProductName}</strong> {line.attachedProductPrice ? `(+${money(line.attachedProductPrice)})` : ''}</span>
                                </div>
                              )}

                              {line.customArtNote && (
                                <div className="text-[11px] italic text-brand-text-muted line-clamp-1">
                                  📝 {line.customArtNote}
                                </div>
                              )}
                            </div>

                            {/* Nút tùy chỉnh mẫu vẽ & độ khó dành cho dịch vụ */}
                            {line.type === 'SERVICE' && (
                              <button
                                type="button"
                                onClick={() => openLineCustomizer(line)}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-brand-secondary/40 bg-brand-secondary/10 px-2 py-0.5 text-[11px] font-bold text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all cursor-pointer shadow-xs"
                              >
                                <Palette className="h-3 w-3" />
                                {line.designName ? 'Sửa mẫu vẽ & độ khó' : '+ Kèm mẫu vẽ/độ khó/phụ kiện'}
                              </button>
                            )}

                            <p className="mt-0.5 truncate text-caption font-semibold text-brand-text-muted">
                              {line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · {line.staff}
                            </p>
                          </div>

                          {/* Đơn giá */}
                          <div className="min-w-0 w-full text-right pt-1">
                            <span className="block truncate text-caption font-bold text-brand-text-muted">x {money(line.unitPrice)}</span>
                          </div>

                          {/* Kỹ thuật viên */}
                          <div className="min-w-0 w-full pt-0.5">
                            {line.type === 'SERVICE' ? (
                              <select
                                value={line.staff}
                                onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                className={`h-8 w-full min-w-0 rounded-lg border px-1 text-caption font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                  line.staff === 'Chưa phân công'
                                    ? 'border-brand-tertiary/60 bg-brand-tertiary/10 text-brand-tertiary focus:border-brand-tertiary focus:ring-2 focus:ring-brand-tertiary/20'
                                    : 'border-brand-outline bg-brand-surface-high/80 focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20'
                                }`}
                                aria-label={`Kỹ thuật viên cho ${line.name}`}
                              >
                                {invoiceStaff.map((staff) => (
                                  <option key={staff} value={staff}>{staff}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="h-8 w-full min-w-0 flex items-center justify-center rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-caption font-semibold">
                                Sản phẩm
                              </div>
                            )}
                          </div>

                          {/* Số lượng */}
                          <div className="min-w-0 w-full flex justify-center pt-0.5">
                            <div className="flex h-8 w-full min-w-0 items-center justify-between rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-colors"
                                aria-label={`Giảm số lượng ${line.name}`}
                              >
                                −
                              </button>
                              <span className="text-body font-black text-brand-text flex-1 text-center min-w-0">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-colors"
                                aria-label={`Tăng số lượng ${line.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Thành tiền */}
                          <div className="min-w-0 w-full text-right pt-1">
                            <strong className="block text-body font-black text-brand-text tracking-tight min-w-0 truncate">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>

                          {/* Xóa */}
                          <div className="min-w-0 w-[22px] flex justify-center pt-1">
                            <button
                              type="button"
                              onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                              className="flex h-7 w-6 items-center justify-center rounded-lg text-brand-error hover:text-brand-error hover:bg-brand-error/15 focus:outline-none focus:ring-2 focus:ring-brand-error/40 transition-all cursor-pointer"
                              title="Xóa dịch vụ"
                              aria-label={`Xóa ${line.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Responsive 2-Row Layout Fallback khi khung hẹp (< xl) */}
                        <div className="xl:hidden flex flex-col gap-2 w-full min-w-0 p-3">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-body font-black border ${line.type === 'SERVICE' ? 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary' : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'}`}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span className="min-w-0 flex-1">
                                <p className="font-bold text-brand-text text-xs leading-snug min-w-0" title={line.name}>
                                  {line.name}
                                </p>
                                
                                {line.designName && (
                                  <div className="mt-1 inline-flex flex-wrap items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                    <span>🎨 {line.designName}</span>
                                    {line.difficultyLabel && <span>({line.difficultyLabel})</span>}
                                    {line.designSurcharge ? <span>+{money(line.designSurcharge)}</span> : null}
                                  </div>
                                )}

                                {line.attachedColorName && (
                                  <p className="mt-0.5 text-[11px] text-brand-text-muted">
                                    💅 Màu: {line.attachedColorName}
                                  </p>
                                )}

                                {line.attachedProductName && (
                                  <p className="mt-0.5 text-[11px] text-brand-text-muted">
                                    💎 Kèm: {line.attachedProductName} (+{money(line.attachedProductPrice || 0)})
                                  </p>
                                )}

                                {line.type === 'SERVICE' && (
                                  <button
                                    type="button"
                                    onClick={() => openLineCustomizer(line)}
                                    className="mt-1.5 flex items-center gap-1 rounded border border-brand-secondary/40 bg-brand-secondary/10 px-2 py-0.5 text-[11px] font-bold text-brand-secondary cursor-pointer"
                                  >
                                    <Palette className="h-3 w-3" /> Tùy chỉnh mẫu vẽ & giá
                                  </button>
                                )}

                                <p className="mt-0.5 text-caption font-semibold text-brand-text-muted">{line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · Đơn giá {money(line.unitPrice)}</p>
                              </span>
                            </div>
                            <strong className="text-xs font-black text-brand-text shrink-0 text-right">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-outline/20 min-w-0">
                            <div className="min-w-0 flex-1 max-w-[160px]">
                              {line.type === 'SERVICE' ? (
                                <select
                                  value={line.staff}
                                  onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                  className={`h-8 w-full min-w-0 rounded-lg border px-2 text-body font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                    line.staff === 'Chưa phân công'
                                      ? 'border-brand-tertiary/60 bg-brand-tertiary/10 text-brand-tertiary'
                                      : 'border-brand-outline bg-brand-surface-high/80'
                                  }`}
                                >
                                  {invoiceStaff.map((staff) => (
                                    <option key={staff} value={staff}>{staff}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-body font-semibold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-1 rounded-md">Sản phẩm</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex h-7 items-center rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5">
                                <button type="button" onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })} className="h-6 w-6 text-xs font-black text-brand-text-muted hover:text-brand-text flex items-center justify-center">−</button>
                                <span className="w-5 text-center text-xs font-black text-brand-text">{line.quantity}</span>
                                <button type="button" onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })} className="h-6 w-6 text-xs font-black text-brand-text-muted hover:text-brand-text flex items-center justify-center">+</button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-error hover:text-brand-error hover:bg-brand-error/15"
                                title="Xóa dịch vụ"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!invoiceLines.length && (
                      <div className="py-12 text-center text-xs text-brand-text-muted">
                        Chưa chọn dịch vụ hoặc sản phẩm nào.<br />Nhấn vào danh mục bên trái để thêm vào hóa đơn.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Đối soát tổng quan chi phí & Giảm giá / Tip */}
              <div className="rounded-2xl border border-brand-secondary/25 bg-brand-surface p-4 shadow-sm text-body lg:shrink-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-[0.08em] text-brand-secondary">Đối soát hóa đơn</p>
                    <p className="mt-1 text-caption text-brand-text-muted">Giá dịch vụ, cọc, ưu đãi, tip, thuế/phụ phí và tổng cuối.</p>
                  </div>
                  <span className="rounded-full bg-brand-secondary/10 px-2.5 py-1 text-caption font-black text-brand-secondary">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                </div>

                <div className="rounded-xl border border-brand-outline/70 bg-brand-surface-high/25 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-caption font-bold uppercase tracking-wider text-brand-text-muted">Tạm tính</span>
                      <strong className="mt-1 block text-sm font-black text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-caption font-bold uppercase tracking-wider text-brand-text-muted">Ưu đãi</span>
                      <strong className="mt-1 block text-sm font-black text-brand-error">-{money(invoiceDiscount)}</strong>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-brand-outline/40 pt-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><ReceiptText className="h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><span className="truncate">Tổng tiền dịch vụ</span></span>
                      <strong className="text-right text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-secondary" /><span className="truncate">Tiền cọc</span></span>
                      <strong className="text-right text-brand-secondary">- {money(paymentAppointment.deposit)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-error" /><span className="truncate">Giảm giá / Ưu đãi</span></span>
                      <strong className="text-right text-brand-error">- {money(invoiceDiscount)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><WalletCards className="h-3.5 w-3.5 shrink-0 text-brand-secondary" /><span className="truncate">Tip kỹ thuật viên</span></span>
                      <strong className="text-right text-brand-secondary">+ {money(invoiceTip)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0 text-brand-tertiary" /><span className="truncate">Thuế / Phụ phí nếu có</span></span>
                      <strong className="text-right text-brand-tertiary">+ {money(invoiceTaxAndFees)}</strong>
                    </div>
                  </div>
                </div>

                {/* Chọn chương trình ưu đãi Loyalty */}
                <div className="mt-3 rounded-xl border border-brand-primary/25 bg-brand-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-brand-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Áp dụng chương trình ưu đãi
                    </span>
                  </div>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => handleSelectPromo(e.target.value)}
                    className="mt-2 h-9 w-full rounded-lg border border-brand-primary/20 bg-brand-surface px-2.5 text-body font-bold text-brand-text outline-none focus:border-brand-primary"
                  >
                    <option value="">-- Chọn ưu đãi hoặc nhập giảm giá bên dưới --</option>
                    {loyaltyPrograms.filter((p) => p.status === 'ACTIVE').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.benefit})
                      </option>
                    ))}
                  </select>

                  {promoFeedback && (
                    <div className={`mt-2 rounded-lg p-2.5 text-caption font-bold leading-4 ${promoFeedback.isError ? 'bg-brand-error/10 text-brand-error border border-brand-error' : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary'}`}>
                      {promoFeedback.text}
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-error/20 bg-brand-error/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-brand-error">Giảm giá</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-error">-</span>
                        <input type="number" min="0" step="1000" value={paymentForm.discount} onChange={(event) => { setSelectedPromoId(''); setPromoFeedback(null); setPaymentForm({ ...paymentForm, discount: event.target.value }); }} className="w-[86px] rounded-lg border border-brand-error/20 bg-brand-surface py-1.5 px-2 text-right text-body font-black text-brand-text outline-none focus:border-brand-error focus:ring-2 focus:ring-brand-error/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => { setSelectedPromoId(''); setPromoFeedback(null); setPaymentForm({ ...paymentForm, discount: String(val) }); }} className={`rounded-lg px-1.5 py-1.5 text-caption font-black transition ${Number(paymentForm.discount) === val ? 'bg-brand-error text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `-${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-secondary/20 bg-brand-secondary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-brand-secondary">Tip KTV</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-secondary">+</span>
                        <input type="number" min="0" step="1000" value={paymentForm.tip} onChange={(event) => setPaymentForm({ ...paymentForm, tip: event.target.value })} className="w-[86px] rounded-lg border border-brand-secondary/20 bg-brand-surface py-1.5 px-2 text-right text-body font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, tip: String(val) })} className={`rounded-lg px-1.5 py-1.5 text-caption font-black transition ${Number(paymentForm.tip) === val ? 'bg-brand-secondary text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `+${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-brand-secondary/40 p-3.5 shadow-inner">
                  <div className="min-w-0">
                    <span className="block text-caption font-extrabold uppercase tracking-wider text-brand-secondary">Tổng thanh toán cuối cùng</span>
                    <span className="mt-0.5 block truncate text-caption text-brand-text-muted">Sau cọc, ưu đãi, tip và thuế/phụ phí</span>
                  </div>
                  <strong className="text-right text-2xl font-black tracking-tight text-brand-secondary sm:text-3xl">{money(invoiceTotal)}</strong>
                </div>
              </div>

              {/* Thẻ 3: Phương thức & Xác nhận thanh toán (Hỗ trợ Tách hóa đơn / Split Payments) */}
              <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm space-y-3 lg:shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-outline/40 pb-2">
                  <p className="text-caption font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">
                    Phương thức thanh toán
                  </p>
                  
                  {/* Mode switcher: Đơn lẻ vs Tách nhiều phương thức */}
                  <div className="flex items-center gap-1 rounded-lg bg-brand-surface-high p-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSplitPaymentMode(false)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        !splitPaymentMode
                          ? 'bg-brand-secondary text-white font-black shadow-xs'
                          : 'text-brand-text-muted hover:text-brand-text'
                      }`}
                    >
                      1 Phương thức
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSplitPaymentMode(true);
                        if (splitPaymentsList.length === 0) {
                          splitEqually(2);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        splitPaymentMode
                          ? 'bg-indigo-600 text-white font-black shadow-xs'
                          : 'text-brand-text-muted hover:text-brand-text'
                      }`}
                    >
                      <Split className="h-3 w-3" /> Tách / Chia tiền (Split)
                    </button>
                  </div>
                </div>

                {!splitPaymentMode ? (
                  /* Chế độ 1 Phương thức thanh toán chuẩn */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(methodMeta).map(([value, meta]) => {
                        const Icon = meta.icon;
                        const selected = paymentForm.method === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentForm({ ...paymentForm, method: value as PaymentMethod })}
                            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-caption font-bold transition-all cursor-pointer ${
                              selected
                                ? 'border-brand-secondary bg-brand-secondary/15 text-brand-secondary shadow-sm'
                                : 'border-brand-outline text-brand-text-muted hover:bg-brand-surface-high'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>

                    {paymentForm.method !== 'CASH' && (
                      <input
                        value={paymentForm.reference}
                        onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })}
                        className="reception-input h-8 text-body"
                        placeholder="Mã giao dịch chuyển khoản / thẻ *"
                      />
                    )}
                  </div>
                ) : (
                  /* Chế độ Tách nhiều hình thức / Chia tiền theo nhóm (Split Payments) */
                  <div className="space-y-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-caption font-black text-indigo-700 dark:text-indigo-300">
                        Chia nhanh:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => splitEqually(2)}
                          className="rounded-md border border-indigo-500/30 bg-brand-surface px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                        >
                          Chia 2 (50/50)
                        </button>
                        <button
                          type="button"
                          onClick={() => splitEqually(3)}
                          className="rounded-md border border-indigo-500/30 bg-brand-surface px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                        >
                          Chia 3
                        </button>
                        <button
                          type="button"
                          onClick={addSplitRow}
                          className="rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer shadow-2xs"
                        >
                          + Thêm phần
                        </button>
                      </div>
                    </div>

                    {/* Danh sách các phần thanh toán */}
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {splitPaymentsList.map((splitRow, idx) => (
                        <div
                          key={splitRow.id}
                          className="grid grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-1.5 rounded-lg border border-brand-outline bg-brand-surface p-2 text-xs"
                        >
                          {/* Phương thức */}
                          <select
                            value={splitRow.method}
                            onChange={(e) => updateSplitRow(splitRow.id, { method: e.target.value as PaymentMethod })}
                            className="h-8 rounded-md border border-brand-outline bg-brand-surface-high px-1 text-[11px] font-bold text-brand-text outline-none"
                          >
                            {Object.entries(methodMeta).map(([val, meta]) => (
                              <option key={val} value={val}>{meta.label}</option>
                            ))}
                          </select>

                          {/* Số tiền */}
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={splitRow.amount}
                              onChange={(e) => updateSplitRow(splitRow.id, { amount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                              className="h-8 w-full rounded-md border border-brand-outline bg-brand-surface-high px-2 text-right text-xs font-black text-brand-text outline-none focus:border-brand-secondary"
                              placeholder="0"
                            />
                          </div>

                          {/*
                            Người trả (tiền mặt) hoặc mã giao dịch (mọi phương thức khác).

                            🔴 Ô này từng ghi vào `payerName` trong khi phép kiểm ở `submitPayment`
                            đọc `reference`, nên **chia tiền với bất kỳ phương thức không phải tiền
                            mặt nào cũng bất khả thi**: gõ mã xong vẫn nhận "cần nhập mã giao dịch
                            để đối soát", và không có cách nào qua được. BR-PAY-004 vì vậy bị chặn
                            hẳn ở giao diện dù máy chủ hỗ trợ đầy đủ. Sửa ở ngày 15.

                            Với tiền mặt, ô này vẫn là tên người trả và cố ý KHÔNG gửi lên: máy chủ
                            chỉ có cột `reference` cho mã giao dịch (BR-PAY-005), và nhét tên người
                            vào đó là làm bẩn một cột dùng để đối soát với sao kê ngân hàng.
                          */}
                          <input
                            type="text"
                            value={splitRow.method === 'CASH' ? (splitRow.payerName || '') : (splitRow.reference || '')}
                            onChange={(e) => updateSplitRow(
                              splitRow.id,
                              splitRow.method === 'CASH'
                                ? { payerName: e.target.value }
                                : { reference: e.target.value }
                            )}
                            placeholder={splitRow.method === 'CASH' ? `Phần ${idx + 1}...` : 'Mã GD / Tên...'}
                            className="h-8 w-full rounded-md border border-brand-outline bg-brand-surface-high px-2 text-[11px] text-brand-text outline-none"
                          />

                          {/* Nút xóa */}
                          <button
                            type="button"
                            onClick={() => removeSplitRow(splitRow.id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Xóa phần này"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Đối soát chênh lệch tổng tiền chia */}
                    {(() => {
                      const currentSplitSum = splitPaymentsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                      const diff = invoiceTotal - currentSplitSum;
                      return (
                        <div
                          className={`rounded-lg p-2 text-xs font-bold ${
                            diff === 0
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Đã phân bổ: <strong>{money(currentSplitSum)}</strong></span>
                            {diff === 0 ? (
                              <span className="flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" /> Khớp 100%
                              </span>
                            ) : (
                              <span className="font-black text-rose-600 dark:text-rose-400">
                                {diff > 0 ? `Còn thiếu ${money(diff)}` : `Vượt quá ${money(Math.abs(diff))}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <textarea
                  value={paymentForm.note}
                  onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })}
                  className="reception-input min-h-[50px] text-body resize-none"
                  placeholder="Ghi chú hóa đơn (không bắt buộc)..."
                />
                {formError && <p role="alert" className="rounded-xl bg-brand-error/10 p-2.5 text-caption font-bold leading-4 text-brand-error">{formError}</p>}
              </div>
            </aside>
          </form>
        </Modal>
  );
}
