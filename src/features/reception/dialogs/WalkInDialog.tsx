/**
 * Hộp thoại tiếp nhận khách vãng lai — bản đầy đủ, có giờ bắt đầu, ghi chú, dị ứng và mẫu vẽ.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 *
 * Khác `Walk-in cấp tốc` ở chỗ nào: bản cấp tốc điền hộ mọi thứ điền được và đẩy khách thẳng vào
 * trạng thái đang làm; bản này để người ở quầy tự đặt giờ và ghi chú, dùng khi khách chưa vội.
 */

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { AlertCircle, UserCheck } from 'lucide-react';
import { Button, Field, Modal } from '../../../components/ui';
import { technicianStatusMeta } from '../constants';
import { stationsFor } from '../mockSeed';
import type { BranchCode, CatalogItem, ReceptionTechnician, WalkInForm } from '../types';

export interface WalkInDialogProps {
  walkIn: WalkInForm;
  setWalkIn: Dispatch<SetStateAction<WalkInForm>>;
  walkInErrors: Record<string, string>;
  setWalkInErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setWalkInOpen: Dispatch<SetStateAction<boolean>>;

  serviceCatalog: CatalogItem[];
  /** Ô "chưa có dịch vụ nào" khi bảng giá rỗng — do cổng lễ tân dựng sẵn để mọi ô chọn nói giống nhau. */
  emptyServiceOption: ReactNode;
  /** Kỹ thuật viên đủ điều kiện nhận khách, đã lọc theo chi nhánh và trạng thái ca. */
  assignableTechnicians: ReceptionTechnician[];
  branchCode: BranchCode;

  handleWalkInServiceChange: (serviceName: string) => void;
  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  submitWalkIn: (event: FormEvent) => void;
}

export default function WalkInDialog({
  walkIn,
  setWalkIn,
  walkInErrors,
  setWalkInErrors,
  setWalkInOpen,
  serviceCatalog,
  emptyServiceOption,
  assignableTechnicians,
  branchCode,
  handleWalkInServiceChange,
  formError,
  setFormError,
  submitWalkIn
}: WalkInDialogProps) {
  return (
        <Modal
          open
          size="large"
          icon={<UserCheck />}
          title="Tiếp nhận khách vãng lai"
          description="Tạo lượt phục vụ tại quầy và đưa khách vào hàng chờ ngay lập tức."
          onClose={() => { setWalkInOpen(false); setFormError(''); setWalkInErrors({}); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setWalkInOpen(false); setFormError(''); setWalkInErrors({}); }}>Hủy</Button>
              <Button type="submit" form="reception-walkin" variant="primary" iconLeading={<UserCheck />}>Tạo &amp; check-in</Button>
            </>
          }
        >
          <form id="reception-walkin" onSubmit={submitWalkIn} noValidate className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-tertiary/25 bg-brand-tertiary/10 p-3 text-body font-bold leading-5 text-brand-tertiary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Giờ mở cửa salon: 08:00 – 20:30 (Khung giờ tiếp nhận khách: 08:00 – 20:00). Hệ thống kiểm tra trùng KTV, ca làm việc, giờ đóng cửa và ghế phục vụ.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *" error={walkInErrors.customer}>
                <input
                  value={walkIn.customer}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, customer: event.target.value });
                    if (walkInErrors.customer) setWalkInErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  className="reception-input"
                  placeholder="Nguyễn Minh Anh"
                  autoFocus
                />
              </Field>
              <Field label="Số điện thoại *" helper="10 số di động VN (09xx, 08xx, 03xx, 07xx, 05xx)" error={walkInErrors.phone}>
                <input
                  type="tel"
                  value={walkIn.phone}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, phone: event.target.value });
                    if (walkInErrors.phone) setWalkInErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className="reception-input"
                  placeholder="0903123456"
                />
              </Field>
              <Field label="Dịch vụ *" error={walkInErrors.service}>
                <select
                  value={walkIn.service}
                  onChange={(event) => {
                    handleWalkInServiceChange(event.target.value);
                    if (walkInErrors.service) setWalkInErrors((prev) => ({ ...prev, service: '' }));
                  }}
                  className="reception-input"
                >
                  {emptyServiceOption}
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *" error={walkInErrors.staff}>
                <select
                  value={walkIn.staff}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, staff: event.target.value });
                    if (walkInErrors.staff) setWalkInErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="reception-input"
                >
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng" error={walkInErrors.station}>
                <select
                  value={walkIn.station}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, station: event.target.value });
                    if (walkInErrors.station) setWalkInErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="reception-input"
                >
                  <option value="">Xếp sau khi check-in</option>
                  {stationsFor(branchCode).map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *" helper="Salon mở cửa từ 08:00 đến 20:30" error={walkInErrors.start}>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={walkIn.start}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, start: event.target.value });
                    if (walkInErrors.start) setWalkInErrors((prev) => ({ ...prev, start: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Thời lượng *" error={walkInErrors.duration}>
                <select
                  value={walkIn.duration}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, duration: event.target.value });
                    if (walkInErrors.duration) setWalkInErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="reception-input"
                >
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *" error={walkInErrors.price}>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={walkIn.price}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, price: event.target.value });
                    if (walkInErrors.price) setWalkInErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={walkIn.note} onChange={(event) => setWalkIn({ ...walkIn, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Dị ứng, sở thích hoặc yêu cầu đặc biệt..." />
            </Field>
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
  );
}
