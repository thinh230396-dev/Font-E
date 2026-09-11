/**
 * Hộp thoại tùy chỉnh một dòng dịch vụ trên hóa đơn: chọn mẫu vẽ, đặt độ khó, gắn màu sơn và
 * sản phẩm đi kèm.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Thân JSX giữ nguyên từng dòng.
 *
 * Người gọi chịu trách nhiệm chỉ dựng component này khi thật sự có dòng đang sửa — prop
 * `customizingLine` vì thế KHÔNG cho phép rỗng. Giữ đúng tên ấy thay vì rút gọn thành `line` là
 * có lý do: thân JSX bên dưới nhắc tới nó hai chục chỗ, và đổi tên là mở đường cho một lỗi sửa
 * sót mà không gì bắt được.
 *
 * ⚠️ Mẫu vẽ và bảng màu ở đây vẫn là dữ liệu mẫu (§9.4 cắt thư viện mẫu nail khỏi MVP). Chúng
 * chỉ làm phần mô tả và phụ thu trên dòng hóa đơn — dòng hóa đơn thì thật.
 */

import type { Dispatch, SetStateAction } from 'react';
import { Check, Palette, Sliders, Sparkles } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import {
  ART_DIFFICULTY_PRESETS,
  ATTACHED_ACCESSORY_OPTIONS,
  type ArtDifficultyPreset,
  type NailArtTemplate,
  type PolishColorOption
} from '../catalogs';
import { money } from '../format';
import { invoiceStaff } from '../mockSeed';
import type { ArtCustomizerForm, InvoiceLineDraft } from '../types';

export interface ArtCustomizerDialogProps {
  /** Dòng hóa đơn đang được tùy chỉnh. Không rỗng — người gọi đã kiểm trước khi dựng. */
  customizingLine: InvoiceLineDraft;
  setCustomizingLine: Dispatch<SetStateAction<InvoiceLineDraft | null>>;
  customizerForm: ArtCustomizerForm;
  setCustomizerForm: Dispatch<SetStateAction<ArtCustomizerForm>>;

  /** Hai danh mục tra cứu, đã lọc theo chi nhánh ở phía người gọi. */
  nailArtTemplates: NailArtTemplate[];
  polishColorOptions: PolishColorOption[];

  handleSelectArtTemplateInCustomizer: (template: NailArtTemplate) => void;
  handleSelectDifficultyInCustomizer: (preset: ArtDifficultyPreset) => void;
  saveLineCustomizer: () => void;
}

export default function ArtCustomizerDialog({
  customizingLine,
  setCustomizingLine,
  customizerForm,
  setCustomizerForm,
  nailArtTemplates,
  polishColorOptions,
  handleSelectArtTemplateInCustomizer,
  handleSelectDifficultyInCustomizer,
  saveLineCustomizer
}: ArtCustomizerDialogProps) {
  return (
        <Modal
          open
          size="large"
          icon={<Palette className="text-amber-500" />}
          title="Tùy chỉnh mẫu vẽ, độ khó & dịch vụ bổ sung"
          description={`Cấu hình cho dịch vụ: ${customizingLine.name}`}
          onClose={() => setCustomizingLine(null)}
          footer={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-text-muted">
                  <span>Công thức:</span>
                  <span>{money(Math.max(0, parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0))} (Gốc)</span>
                  <span>+</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">+{money(Math.max(0, parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0))} (Art)</span>
                  <span>+</span>
                  <span className="text-brand-secondary font-black">+{money(Number(customizerForm.attachedProductPrice) || 0)} (Kèm)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-brand-text">Tổng đơn giá:</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {money(
                      Math.max(0, parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0) +
                      Math.max(0, parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0) +
                      (Number(customizerForm.attachedProductPrice) || 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setCustomizingLine(null)}>
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={saveLineCustomizer}
                  iconLeading={<Check className="h-4 w-4" />}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black cursor-pointer shadow-md shadow-amber-600/20"
                >
                  Lưu & Áp dụng
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {/* Khối 0: Giá dịch vụ gốc & Thanh công thức cộng dồn */}
            <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/30 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-md bg-brand-secondary/15 px-2 py-0.5 text-caption font-black text-brand-secondary">
                      Dịch vụ chính
                    </span>
                    <span className="text-body font-black text-brand-text">{customizingLine.name}</span>
                  </div>
                  <p className="mt-1 text-caption text-brand-text-muted">
                    Giá dịch vụ gốc được giữ nguyên. Chỉ khi chọn thêm mẫu vẽ, mức độ khó hoặc phụ kiện thì hệ thống mới cộng thêm vào giá này.
                  </p>
                </div>
                <div className="shrink-0 text-right sm:border-l sm:border-brand-outline/60 sm:pl-4">
                  <span className="block text-caption font-bold text-brand-text-muted">Giá dịch vụ gốc</span>
                  <span className="text-base font-black text-brand-text">
                    {money(parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0)}
                  </span>
                </div>
              </div>

              {/* Bảng minh họa công thức tính giá cộng dồn */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-brand-surface p-2.5 border border-brand-outline text-center">
                <div className="p-1">
                  <span className="block text-[10px] font-bold text-brand-text-muted uppercase">1. Giá gốc dịch vụ</span>
                  <span className="text-xs font-black text-brand-text">
                    {money(parseInt(String(customizerForm.basePrice || '0').replace(/\D/g, ''), 10) || 0)}
                  </span>
                </div>
                <div className="p-1 border-x border-brand-outline/60">
                  <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">2. + Phụ thu vẽ Art</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    +{money(parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0)}
                  </span>
                </div>
                <div className="p-1">
                  <span className="block text-[10px] font-bold text-brand-secondary uppercase">3. + Phụ kiện/Màu</span>
                  <span className="text-xs font-black text-brand-secondary">
                    +{money(Number(customizerForm.attachedProductPrice) || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Khối 1: Chọn mẫu vẽ nail art từ thư viện hoặc tự nhập */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-xs font-black text-brand-text">1. Mẫu vẽ Nail Art & Họa tiết kèm theo</h4>
                </div>
                {customizerForm.designName && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomizerForm({
                        ...customizerForm,
                        designName: '',
                        designLevel: 0,
                        difficultyLabel: '',
                        designSurcharge: '0',
                      });
                    }}
                    className="text-caption font-bold text-brand-error hover:underline"
                  >
                    Bỏ chọn mẫu
                  </button>
                )}
              </div>

              {/* Danh sách mẫu gợi ý nhanh */}
              <div>
                <span className="block text-caption font-bold text-brand-text-muted mb-1.5">
                  Chọn mẫu vẽ có sẵn trong Catalog:
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {nailArtTemplates.map((tmpl) => {
                    const isSelected = customizerForm.designName === tmpl.name;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectArtTemplateInCustomizer(tmpl)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30'
                            : 'border-brand-outline bg-brand-surface hover:border-amber-500/50 hover:bg-brand-surface-high'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-[11px] font-black text-brand-text truncate">{tmpl.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        </div>
                        <span className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          Mức {tmpl.defaultLevel} · +{money(tmpl.surcharge)}
                        </span>
                        <span className="mt-0.5 text-[10px] text-brand-text-muted line-clamp-1">
                          {tmpl.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hoặc tự nhập tên mẫu */}
              <div>
                <label className="block text-caption font-bold text-brand-text-muted mb-1">
                  Hoặc tên mẫu vẽ tùy chỉnh theo yêu cầu khách:
                </label>
                <input
                  type="text"
                  value={customizerForm.designName}
                  onChange={(e) => setCustomizerForm({ ...customizerForm, designName: e.target.value })}
                  placeholder="Ví dụ: Vẽ hoa cúc 3D ngón cái, Vẽ hoạt hình Stitch, Đính đá ombre..."
                  className="reception-input text-body"
                />
              </div>
            </div>

            {/* Khối 2: Độ khó và Phụ thu tiền vẽ */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-black text-brand-text">2. Phân loại độ khó & Phụ thu tiền công vẽ</h4>
              </div>

              <div>
                <span className="block text-caption font-bold text-brand-text-muted mb-1.5">
                  Mức độ khó của mẫu vẽ:
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ART_DIFFICULTY_PRESETS.map((preset) => {
                    const isSelected = customizerForm.designLevel === preset.level;
                    return (
                      <button
                        key={preset.level}
                        type="button"
                        onClick={() => handleSelectDifficultyInCustomizer(preset)}
                        className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/40 text-brand-text'
                            : 'border-brand-outline bg-brand-surface text-brand-text-muted hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-brand-text">{preset.label}</span>
                          {isSelected && <Check className="h-3 w-3 text-amber-600" />}
                        </div>
                        <span className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          {preset.surcharge > 0 ? `+${money(preset.surcharge)}` : '0đ (Không phụ thu)'}
                        </span>
                        <span className="mt-0.5 text-[10px] text-brand-text-muted">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhập số tiền phụ thu vẽ art */}
              <div className="rounded-xl bg-brand-surface p-3 border border-brand-outline">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-black text-brand-text">Tiền phụ thu vẽ Art (VNĐ)</span>
                    <span className="text-caption text-brand-text-muted">
                      Hiển thị: <strong className="text-amber-600 dark:text-amber-400 font-bold">{money(parseInt(String(customizerForm.designSurcharge || '0').replace(/\D/g, ''), 10) || 0)}</strong>
                    </span>
                  </div>
                  <div className="w-40">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customizerForm.designSurcharge}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setCustomizerForm({ ...customizerForm, designSurcharge: val });
                      }}
                      placeholder="0"
                      className="reception-input text-right text-body font-black text-amber-600 dark:text-amber-400"
                    />
                  </div>
                </div>

                {/* Quick add surcharge pills */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-brand-text-muted">Chọn nhanh:</span>
                  {[0, 30000, 50000, 80000, 100000, 150000, 200000, 350000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomizerForm({ ...customizerForm, designSurcharge: String(val) })}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                        String(customizerForm.designSurcharge) === String(val)
                          ? 'bg-amber-600 text-white'
                          : 'bg-brand-surface-high border border-brand-outline text-brand-text hover:border-amber-500'
                      }`}
                    >
                      {val === 0 ? '0đ' : `+${val / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Khối 3: Màu sơn & Sản phẩm/Phụ kiện đi kèm */}
            <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-secondary" />
                <h4 className="text-xs font-black text-brand-text">3. Màu sơn & Sản phẩm chăm sóc đi kèm</h4>
              </div>

              {/* Bảng màu sơn */}
              <div>
                <span className="block text-caption font-bold text-brand-text-muted mb-1.5">
                  Màu sơn móng đi kèm: {customizerForm.attachedColorName ? <strong className="text-brand-text font-black">{customizerForm.attachedColorName} ({customizerForm.attachedColorCode})</strong> : <span className="italic">Chưa chọn</span>}
                </span>
                <div className="flex flex-wrap gap-2">
                  {polishColorOptions.map((c) => {
                    const isSelected = customizerForm.attachedColorCode === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCustomizerForm({ ...customizerForm, attachedColorCode: '', attachedColorName: '', attachedColorHex: '' });
                          } else {
                            setCustomizerForm({ ...customizerForm, attachedColorCode: c.code, attachedColorName: c.name, attachedColorHex: c.hex });
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-caption font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-secondary bg-brand-secondary/15 ring-2 ring-brand-secondary/30 text-brand-text font-black'
                            : 'border-brand-outline bg-brand-surface-high/60 text-brand-text-muted hover:text-brand-text'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.code} - {c.name}</span>
                        {isSelected && <Check className="h-3 w-3 text-brand-secondary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sản phẩm / Phụ kiện đính kèm */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-brand-outline/60">
                <div>
                  <label className="block text-caption font-bold text-brand-text-muted mb-1">
                    Sản phẩm phụ kiện / đính đá kèm theo:
                  </label>
                  <select
                    value={customizerForm.attachedProductName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const found = ATTACHED_ACCESSORY_OPTIONS.find(opt => opt.name === selectedName);
                      if (found) {
                        setCustomizerForm({
                          ...customizerForm,
                          attachedProductName: found.name,
                          attachedProductPrice: found.price,
                        });
                      } else {
                        setCustomizerForm({
                          ...customizerForm,
                          attachedProductName: '',
                          attachedProductPrice: 0,
                        });
                      }
                    }}
                    className="reception-input text-body"
                  >
                    <option value="">-- Không kèm sản phẩm phụ kiện --</option>
                    {ATTACHED_ACCESSORY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name} {opt.price > 0 ? `(+${money(opt.price)})` : '(Miễn phí)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-caption font-bold text-brand-text-muted mb-1">
                    Kỹ thuật viên thực hiện dịch vụ này:
                  </label>
                  <select
                    value={customizerForm.staff}
                    onChange={(e) => setCustomizerForm({ ...customizerForm, staff: e.target.value })}
                    className="reception-input text-body font-bold"
                  >
                    {invoiceStaff.map((staff) => (
                      <option key={staff} value={staff}>{staff}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú vẽ riêng */}
              <div>
                <label className="block text-caption font-bold text-brand-text-muted mb-1">
                  Ghi chú chi tiết cho thợ vẽ (ngón nào, yêu cầu đặc biệt...):
                </label>
                <input
                  type="text"
                  value={customizerForm.customArtNote}
                  onChange={(e) => setCustomizerForm({ ...customizerForm, customArtNote: e.target.value })}
                  placeholder="Ví dụ: Vẽ ngón trỏ và áp út 2 tay, màu nền nude nhạt..."
                  className="reception-input text-body"
                />
              </div>
            </div>
          </div>
        </Modal>
  );
}
