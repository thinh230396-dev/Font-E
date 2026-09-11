/**
 * Hộp thoại xác nhận trước khi thu tiền — bước cuối cùng của một lần thanh toán ở quầy.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 *
 * Đây là màn duy nhất của quầy mà người dùng đọc kỹ từng con số trước khi bấm, nên nó nhận đủ
 * **năm thành phần của phép tính tiền** thay vì chỉ nhận con số cuối: tạm tính, giảm giá, tip,
 * thuế/phí và tổng. Truyền mỗi tổng tiền xuống thì hộp thoại không tự dựng lại được bảng kê, và
 * người ở quầy mất đúng thứ họ cần để đối chiếu với khách.
 */

import type { Dispatch, SetStateAction } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import type { DemoAccount } from '../../../auth/demoAccounts';
import { methodMeta } from '../constants';
import { money } from '../format';
import type { InvoiceLineDraft, PaymentForm, ReceptionAppointment } from '../types';

export interface PaymentConfirmDialogProps {
  /** Lịch hẹn đang thu tiền. Không rỗng — người gọi đã kiểm trước khi dựng. */
  paymentAppointment: ReceptionAppointment;
  paymentForm: PaymentForm;
  invoiceLines: InvoiceLineDraft[];

  /* ── Năm thành phần của phép tính tiền ───────────────────────────────────────────── */
  invoiceSubtotal: number;
  invoiceDiscount: number;
  invoiceTip: number;
  invoiceTaxAndFees: number;
  invoiceTotal: number;

  account: DemoAccount;
  branchName: string;

  setShowPaymentConfirm: Dispatch<SetStateAction<boolean>>;
  executeFinalPayment: () => void;
}

export default function PaymentConfirmDialog({
  paymentAppointment,
  paymentForm,
  invoiceLines,
  invoiceSubtotal,
  invoiceDiscount,
  invoiceTip,
  invoiceTaxAndFees,
  invoiceTotal,
  account,
  branchName,
  setShowPaymentConfirm,
  executeFinalPayment
}: PaymentConfirmDialogProps) {
  return (
        <Modal
          open
          size="medium"
          icon={<ShieldCheck />}
          title="Xác nhận thanh toán hóa đơn"
          description="Vui lòng kiểm tra lại thông tin thu tiền và chi phí trước khi lưu giao dịch."
          onClose={() => setShowPaymentConfirm(false)}
          footer={
            <div className="flex w-full flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setShowPaymentConfirm(false)}
                className="w-full sm:w-auto"
              >
                Hủy / Quay lại chỉnh sửa
              </Button>
              <Button
                variant="primary"
                onClick={() => { void executeFinalPayment(); }}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/25 cursor-pointer"
                iconLeading={<ShieldCheck className="h-4 w-4" />}
              >
                Xác nhận & Hoàn tất {money(invoiceTotal)}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-outline/60 pb-3">
                <div className="min-w-0">
                  <p className="text-body font-black text-brand-text truncate">{paymentAppointment.customer}</p>
                  <p className="text-caption text-brand-text-muted">{paymentAppointment.phone} · {branchName}</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {methodMeta[paymentForm.method].label}
                  </span>
                  {paymentForm.reference && (
                    <p className="text-caption font-mono text-brand-text-muted truncate">Mã GD: {paymentForm.reference}</p>
                  )}
                </div>
              </div>

              {/* Danh sách các dịch vụ & mẫu vẽ đi kèm trong hóa đơn */}
              <div className="mt-3 divide-y divide-brand-outline/40 max-h-48 overflow-y-auto pr-1">
                {invoiceLines.map((line, idx) => (
                  <div key={line.id} className="py-2 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-brand-text">{idx + 1}. {line.name}</span>
                        <span className="text-brand-text-muted font-bold">x{line.quantity}</span>
                      </div>
                      {line.designName && (
                        <p className="text-caption text-amber-700 dark:text-amber-300 font-semibold">
                          🎨 {line.designName} {line.difficultyLabel ? `(${line.difficultyLabel})` : ''} {line.designSurcharge ? `(+${money(line.designSurcharge)})` : ''}
                        </p>
                      )}
                      {line.attachedProductName && (
                        <p className="text-caption text-brand-text-muted">
                          💎 {line.attachedProductName}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-brand-text shrink-0">
                      {money(line.quantity * line.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-2 text-body border-t border-brand-outline/60 pt-3">
                <div className="flex justify-between text-brand-text-muted">
                  <span>Tổng tiền dịch vụ & sản phẩm ({invoiceLines.length} dòng / {invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục)</span>
                  <span className="font-bold text-brand-text">{money(invoiceSubtotal)}</span>
                </div>
                {paymentAppointment.deposit > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Đã trừ tiền đặt cọc trước</span>
                    <span className="font-bold">- {money(paymentAppointment.deposit)}</span>
                  </div>
                )}
                {invoiceDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Ưu đãi / Giảm giá</span>
                    <span className="font-bold">- {money(invoiceDiscount)}</span>
                  </div>
                )}
                {invoiceTip > 0 && (
                  <div className="flex justify-between text-brand-secondary">
                    <span>Tip kỹ thuật viên</span>
                    <span className="font-bold">+ {money(invoiceTip)}</span>
                  </div>
                )}
                {invoiceTaxAndFees > 0 && (
                  <div className="flex justify-between text-brand-tertiary">
                    <span>Thuế / Phụ phí</span>
                    <span className="font-bold">+ {money(invoiceTaxAndFees)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div>
                  <p className="text-caption font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Tổng thực thu tại quầy</p>
                  <p className="text-caption text-brand-text-muted">Thu ngân: {account.displayName}</p>
                </div>
                <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {money(invoiceTotal)}
                </strong>
              </div>

              {paymentForm.note && (
                <div className="mt-3 rounded-lg bg-brand-surface p-2.5 text-caption text-brand-text-muted border border-brand-outline/60">
                  <span className="font-bold text-brand-text">Ghi chú:</span> {paymentForm.note}
                </div>
              )}
            </div>
          </div>
        </Modal>
  );
}
