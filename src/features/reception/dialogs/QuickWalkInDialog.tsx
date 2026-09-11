/**
 * Hộp thoại "Walk-in cấp tốc" — khách đang vội, người ở quầy điền năm ô rồi bấm một nút.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 *
 * Khác bản tiếp nhận đầy đủ: ở đây giờ bắt đầu là **ngay bây giờ**, tên và số điện thoại để
 * trống được, và khách đi thẳng vào trạng thái đang làm dịch vụ. Đổi lại, nó vẫn đòi một kỹ
 * thuật viên — chi nhánh của lịch hẹn đi theo người làm, nên không có người thì không có chỗ
 * để ghi lịch.
 */

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Zap } from 'lucide-react';
import { Button, Field, Modal } from '../../../components/ui';
import { technicianStatusMeta } from '../constants';
import { money } from '../format';
import { stationsFor } from '../mockSeed';
import type {
  BranchCode,
  CatalogItem,
  QuickWalkInForm,
  ReceptionTechnician
} from '../types';

export interface QuickWalkInDialogProps {
  quickWalkInForm: QuickWalkInForm;
  setQuickWalkInForm: Dispatch<SetStateAction<QuickWalkInForm>>;
  setQuickWalkInOpen: Dispatch<SetStateAction<boolean>>;

  serviceCatalog: CatalogItem[];
  emptyServiceOption: ReactNode;
  assignableTechnicians: ReceptionTechnician[];
  branchCode: BranchCode;

  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  submitQuickWalkIn: (action?: 'START_NOW' | 'CHECK_IN_QUEUE') => void;
}

export default function QuickWalkInDialog({
  quickWalkInForm,
  setQuickWalkInForm,
  setQuickWalkInOpen,
  serviceCatalog,
  emptyServiceOption,
  assignableTechnicians,
  branchCode,
  formError,
  setFormError,
  submitQuickWalkIn
}: QuickWalkInDialogProps) {
  return (
        <Modal
          open
          size="medium"
          icon={<Zap className="text-amber-500" />}
          title="⚡ Walk-in Cấp tốc (5 Giây)"
          description="Nhận khách vãng lai tức thì không bắt buộc nhập tên hay SĐT nếu khách đang vội."
          onClose={() => { setQuickWalkInOpen(false); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setQuickWalkInOpen(false); setFormError(''); }}>Hủy</Button>
              <Button
                type="button"
                onClick={() => submitQuickWalkIn('START_NOW')}
                variant="primary"
                iconLeading={<Zap className="h-4 w-4" />}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black shadow-md shadow-amber-500/25 cursor-pointer"
              >
                Nhận khách ngay (5s)
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
              ⚡ Hệ thống tự động gán mã định danh, giờ bắt đầu và đưa khách trực tiếp vào trạng thái <strong>Đang làm dịch vụ</strong> mà không gián đoạn luồng phục vụ.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Dịch vụ cơ bản *">
                <select
                  value={quickWalkInForm.service}
                  onChange={(e) => {
                    const foundService = serviceCatalog.find((s) => s.name === e.target.value);
                    setQuickWalkInForm({
                      ...quickWalkInForm,
                      service: e.target.value,
                      price: foundService ? String(foundService.price) : quickWalkInForm.price,
                      duration: foundService?.duration ? String(foundService.duration) : quickWalkInForm.duration,
                    });
                  }}
                  className="reception-input font-bold"
                >
                  {emptyServiceOption}
                  {serviceCatalog.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} · {money(s.price)} ({s.duration}p)
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Chọn ghế trống *">
                <select
                  value={quickWalkInForm.station}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, station: e.target.value })}
                  className="reception-input font-bold"
                >
                  <option value="">-- Chọn ghế salon --</option>
                  {stationsFor(branchCode).map((st) => (
                    <option key={st} value={st}>
                      💺 {st}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Chỉ định KTV (Tùy chọn)">
                <select
                  value={quickWalkInForm.staff}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, staff: e.target.value })}
                  className="reception-input"
                >
                  <option value="Chưa phân công">Chưa phân công (Chọn sau)</option>
                  {assignableTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.name}>
                      {tech.name} ({technicianStatusMeta[tech.status].label})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tên khách (Để trống = Khách Vãng Lai)">
                <input
                  type="text"
                  value={quickWalkInForm.customer}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, customer: e.target.value })}
                  placeholder="Khách Vãng Lai..."
                  className="reception-input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số điện thoại (Không bắt buộc)">
                <input
                  type="tel"
                  value={quickWalkInForm.phone}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, phone: e.target.value })}
                  placeholder="09xx..."
                  className="reception-input"
                />
              </Field>

              <Field label="Lưu ý / Dị ứng nhanh">
                <input
                  type="text"
                  value={quickWalkInForm.note}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, note: e.target.value })}
                  placeholder="Ví dụ: Da nhạy cảm, móng mỏng, vội..."
                  className="reception-input"
                />
              </Field>
            </div>

            {formError && <p role="alert" className="p-2.5 text-xs font-bold text-rose-600 bg-rose-500/10 rounded-xl border border-rose-500/20">{formError}</p>}
          </div>
        </Modal>
  );
}
