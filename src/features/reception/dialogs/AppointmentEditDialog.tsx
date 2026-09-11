/**
 * Hộp thoại sửa một lịch hẹn đã có.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 */

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { CalendarClock, Check, ShieldCheck } from 'lucide-react';
import { Button, Field, Modal, StatusBadge } from '../../../components/ui';
import { appointmentStatusLabel, technicianStatusMeta } from '../constants';
import { stationsFor } from '../mockSeed';
import type {
  AppointmentEditForm,
  BranchCode,
  CatalogItem,
  ReceptionAppointment,
  ReceptionTechnician
} from '../types';

export interface AppointmentEditDialogProps {
  /** Lịch hẹn đang sửa. Không rỗng — người gọi đã kiểm trước khi dựng. */
  editingAppointment: ReceptionAppointment;
  setEditingAppointment: Dispatch<SetStateAction<ReceptionAppointment | null>>;
  appointmentEditForm: AppointmentEditForm;
  setAppointmentEditForm: Dispatch<SetStateAction<AppointmentEditForm>>;
  appointmentEditErrors: Record<string, string>;
  setAppointmentEditErrors: Dispatch<SetStateAction<Record<string, string>>>;

  serviceCatalog: CatalogItem[];
  emptyServiceOption: ReactNode;
  assignableTechnicians: ReceptionTechnician[];
  branchCode: BranchCode;
  branchName: string;

  handleAppointmentEditServiceChange: (serviceName: string) => void;
  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  submitAppointmentEdit: (event: FormEvent) => void;
}

export default function AppointmentEditDialog({
  editingAppointment,
  setEditingAppointment,
  appointmentEditForm,
  setAppointmentEditForm,
  appointmentEditErrors,
  setAppointmentEditErrors,
  serviceCatalog,
  emptyServiceOption,
  assignableTechnicians,
  branchCode,
  branchName,
  handleAppointmentEditServiceChange,
  formError,
  setFormError,
  submitAppointmentEdit
}: AppointmentEditDialogProps) {
  return (
        <Modal
          open
          size="large"
          icon={<CalendarClock />}
          headerAside={<StatusBadge status={editingAppointment.status} label={appointmentStatusLabel[editingAppointment.status]} size="small" />}
          title={`Điều phối lịch ${editingAppointment.start}`}
          description={`${editingAppointment.customer} · ${branchName}`}
          onClose={() => { setEditingAppointment(null); setFormError(''); setAppointmentEditErrors({}); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setEditingAppointment(null); setFormError(''); setAppointmentEditErrors({}); }}>Hủy</Button>
              <Button type="submit" form="reception-edit-appointment" variant="primary" iconLeading={<Check />}>Lưu điều phối</Button>
            </>
          }
        >
          <form id="reception-edit-appointment" onSubmit={submitAppointmentEdit} noValidate className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-secondary/25 bg-brand-secondary/10 p-3 text-body font-bold leading-5 text-brand-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Giờ mở cửa salon: 08:00 – 20:30. Chỉ kỹ thuật viên đang làm việc, trong ca trực và có đúng chuyên môn mới được phân công.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *" error={appointmentEditErrors.customer}>
                <input
                  value={appointmentEditForm.customer}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, customer: event.target.value });
                    if (appointmentEditErrors.customer) setAppointmentEditErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  className="reception-input"
                  autoFocus
                />
              </Field>
              <Field label="Số điện thoại *" helper="10 số di động VN (09xx, 08xx, 03xx, 07xx, 05xx)" error={appointmentEditErrors.phone}>
                <input
                  type="tel"
                  value={appointmentEditForm.phone}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, phone: event.target.value });
                    if (appointmentEditErrors.phone) setAppointmentEditErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Dịch vụ *" error={appointmentEditErrors.service}>
                <select
                  value={appointmentEditForm.service}
                  onChange={(event) => {
                    handleAppointmentEditServiceChange(event.target.value);
                    if (appointmentEditErrors.service) setAppointmentEditErrors((prev) => ({ ...prev, service: '' }));
                  }}
                  className="reception-input"
                >
                  {emptyServiceOption}
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *" error={appointmentEditErrors.staff}>
                <select
                  value={appointmentEditForm.staff}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, staff: event.target.value });
                    if (appointmentEditErrors.staff) setAppointmentEditErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="reception-input"
                >
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng" error={appointmentEditErrors.station}>
                <select
                  value={appointmentEditForm.station}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, station: event.target.value });
                    if (appointmentEditErrors.station) setAppointmentEditErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="reception-input"
                >
                  <option value="">Chưa xếp ghế</option>
                  {stationsFor(branchCode).map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *" helper="Salon mở cửa từ 08:00 đến 20:30" error={appointmentEditErrors.start}>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={appointmentEditForm.start}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, start: event.target.value });
                    if (appointmentEditErrors.start) setAppointmentEditErrors((prev) => ({ ...prev, start: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Thời lượng *" error={appointmentEditErrors.duration}>
                <select
                  value={appointmentEditForm.duration}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, duration: event.target.value });
                    if (appointmentEditErrors.duration) setAppointmentEditErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="reception-input"
                >
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *" error={appointmentEditErrors.price}>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={appointmentEditForm.price}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, price: event.target.value });
                    if (appointmentEditErrors.price) setAppointmentEditErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={appointmentEditForm.note} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Yêu cầu của khách, dị ứng, mẫu tham khảo..." />
            </Field>
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
  );
}
