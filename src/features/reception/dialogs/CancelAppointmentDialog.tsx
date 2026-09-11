/**
 * Hộp thoại xác nhận hủy một lịch hẹn tạo nhầm.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 *
 * Đòi một lý do trước khi hủy, và lý do ấy đi vào nhật ký kiểm toán — BR-APT-024 không cho xóa
 * cứng lịch hẹn, nên "hủy" ở đây là một trạng thái có người chịu trách nhiệm, không phải một
 * phép xóa.
 */

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Field, Modal, StatusBadge } from '../../../components/ui';
import { appointmentStatusLabel } from '../constants';
import { money } from '../format';
import type { ReceptionAppointment } from '../types';

export interface CancelAppointmentDialogProps {
  /** Lịch hẹn sắp hủy. Không rỗng — người gọi đã kiểm trước khi dựng. */
  deletingAppointment: ReceptionAppointment;
  setDeletingAppointment: Dispatch<SetStateAction<ReceptionAppointment | null>>;
  deleteReason: string;
  setDeleteReason: Dispatch<SetStateAction<string>>;
  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  submitDeleteAppointment: (event: FormEvent) => void;
}

export default function CancelAppointmentDialog({
  deletingAppointment,
  setDeletingAppointment,
  deleteReason,
  setDeleteReason,
  formError,
  setFormError,
  submitDeleteAppointment
}: CancelAppointmentDialogProps) {
  return (
        <Modal
          open
          size="medium"
          icon={<Trash2 />}
          title="Xác nhận hủy lịch tạo nhầm"
          description="Lịch không bị xóa mất dấu vết. Hệ thống sẽ chuyển sang trạng thái Đã hủy và lưu lý do để đối soát."
          onClose={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}>
                Giữ lại lịch
              </Button>
              <Button type="submit" form="reception-delete-appointment" variant="danger" iconLeading={<Trash2 />}>
                Xác nhận hủy
              </Button>
            </>
          }
        >
          <form id="reception-delete-appointment" onSubmit={submitDeleteAppointment} noValidate className="space-y-4">
            <div className="p-4 ui-tone ui-tone--danger">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand-error">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-brand-text">{deletingAppointment.customer}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-text-muted">
                    {deletingAppointment.start} · {deletingAppointment.service} · {deletingAppointment.phone}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={deletingAppointment.status} label={appointmentStatusLabel[deletingAppointment.status]} size="small" />
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {deletingAppointment.staff}
                    </span>
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {money(deletingAppointment.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-3 text-body font-bold leading-5 text-brand-text-muted sm:grid-cols-2">
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Chỉ cho hủy lịch chưa bắt đầu dịch vụ</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã thanh toán</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã có cọc</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Lưu người thao tác và thời gian</p>
            </div>

            <Field
              label="Lý do hủy/xóa khỏi quầy"
              required
              error={formError || undefined}
              helper="Lý do được lưu kèm người thao tác để đối soát."
            >
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                className="min-h-24 resize-none py-3"
                placeholder="Ví dụ: Tạo nhầm lịch, khách đặt trùng, nhập sai số điện thoại..."
              />
            </Field>
          </form>
        </Modal>
  );
}
