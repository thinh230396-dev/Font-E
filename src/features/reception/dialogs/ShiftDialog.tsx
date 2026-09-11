/**
 * Hộp thoại mở ca và chốt ca của quầy.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 *
 * Lúc chốt ca, nó bày ra phép trừ đầy đủ — tiền đầu ca cộng tiền mặt đã thu, so với số người ở
 * quầy đếm được — để chênh lệch hiện thành một con số chứ không thành một cảm giác.
 *
 * ⚠️ Ca làm việc là khái niệm chỉ sống trên trình duyệt này: §9.4 cắt chấm công và ca khỏi MVP,
 * nên máy chủ không có bảng nào cho nó.
 */

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { AlertCircle, WalletCards } from 'lucide-react';
import { Button, Field, Modal } from '../../../components/ui';
import { money } from '../format';
import type { ReceptionAppointment, ShiftState } from '../types';

export interface ShiftDialogProps {
  /** Đang mở ca hay đang chốt ca. Không rỗng — người gọi đã kiểm trước khi dựng. */
  shiftModal: 'OPEN' | 'CLOSE';
  setShiftModal: Dispatch<SetStateAction<'OPEN' | 'CLOSE' | null>>;
  shift: ShiftState;

  /** Số người ở quầy đếm được trong két, dạng chuỗi vì họ gõ dở chừng. */
  cashAmount: string;
  setCashAmount: Dispatch<SetStateAction<string>>;

  /* ── Ba con số của phép đối soát cuối ca ─────────────────────────────────────────── */
  cashCollectedToday: number;
  expectedClosingCash: number;
  closingCashDifference: number;

  /** Còn khách đang phục vụ thì chốt ca là một quyết định cần cân nhắc, nên màn này nói ra. */
  activeAppointments: ReceptionAppointment[];

  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  submitShift: (event: FormEvent) => void;
}

export default function ShiftDialog({
  shiftModal,
  setShiftModal,
  shift,
  cashAmount,
  setCashAmount,
  cashCollectedToday,
  expectedClosingCash,
  closingCashDifference,
  activeAppointments,
  formError,
  setFormError,
  submitShift
}: ShiftDialogProps) {
  return (
        <Modal
          open
          size="medium"
          icon={<WalletCards />}
          title={shiftModal === 'OPEN' ? 'Mở ca lễ tân' : 'Đối soát & chốt ca'}
          description={shiftModal === 'OPEN' ? 'Ghi nhận quỹ tiền mặt trước khi bắt đầu vận hành.' : 'Kiểm tra khách đang phục vụ, doanh thu tiền mặt và số quỹ thực tế.'}
          onClose={() => { setShiftModal(null); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShiftModal(null); setFormError(''); }}>Hủy</Button>
              <Button
                type="submit"
                form="reception-shift"
                variant="primary"
                disabled={shiftModal === 'CLOSE' && activeAppointments.length > 0}
              >
                {shiftModal === 'OPEN' ? 'Xác nhận mở ca' : 'Xác nhận chốt ca'}
              </Button>
            </>
          }
        >
          <form id="reception-shift" onSubmit={submitShift} noValidate className="space-y-4">
            {shiftModal === 'CLOSE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-brand-surface-high/60 p-3">
                    <p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">Quỹ đầu ca</p>
                    <p className="mt-2 text-sm font-black text-brand-text">{money(shift.openingCash)}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-secondary/10 p-3 ring-1 ring-brand-secondary/18">
                    <p className="text-caption font-black uppercase tracking-wide text-brand-secondary">Thu tiền mặt</p>
                    <p className="mt-2 text-sm font-black text-brand-secondary">+ {money(cashCollectedToday)}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-2xl bg-brand-text p-4 text-white">
                    <span className="text-body font-bold text-brand-text-muted">Quỹ hệ thống dự kiến</span>
                    <strong className="text-lg font-black">{money(expectedClosingCash)}</strong>
                  </div>
                </div>
                {activeAppointments.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-brand-error bg-brand-error/10 p-3 text-body font-bold leading-5 text-brand-error">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Còn {activeAppointments.length} khách đang chờ hoặc đang phục vụ. Chưa thể chốt ca.
                  </div>
                )}
              </>
            )}
            <Field label={shiftModal === 'OPEN' ? 'Tiền quỹ đầu ca' : 'Tiền mặt đếm thực tế cuối ca'}>
              <input type="number" min="0" step="1000" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className="reception-input" autoFocus />
            </Field>
            {shiftModal === 'CLOSE' && (
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-body font-black ${closingCashDifference === 0 ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-brand-tertiary/10 text-brand-tertiary'}`}>
                <span>Chênh lệch quỹ</span>
                <strong>{closingCashDifference === 0 ? 'Khớp hệ thống' : `${closingCashDifference > 0 ? 'Thừa' : 'Thiếu'} ${money(Math.abs(closingCashDifference))}`}</strong>
              </div>
            )}
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
  );
}
