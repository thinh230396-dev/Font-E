import { getDocumentLanguage } from '../i18n/translate';
import type { CurrencyCode } from '../types';

export type { CurrencyCode };

/**
 * Chuẩn hóa giá trị tiền tệ đọc từ dữ liệu đã lưu — BR-VAL-003.
 *
 * Luôn trả về `'VND'`. Hàm vẫn tồn tại sau khi USD bị bỏ ở ngày 18 vì `localStorage`
 * của những phiên trước có thể còn bản ghi mang `currency: 'USD'`: kiểu dữ liệu đã
 * hẹp lại nhưng dữ liệu cũ thì không tự đổi theo, và đây là chỗ duy nhất chặn một
 * chuỗi lạ đi tiếp vào phần hiển thị.
 */
export const normalizeCurrency = (_currency?: string): CurrencyCode => 'VND';

/**
 * Cách viết số tiền VND, dùng chung cho toàn hệ thống.
 *
 * Giữ tham số `currency` dù chỉ còn một đơn vị: hàng chục màn hình đang truyền cột
 * tiền tệ của bản ghi vào đây, và bỏ tham số là buộc phải sửa 86 chỗ gọi cho một
 * thay đổi không đổi gì trên màn hình. Kiểu đã hẹp lại thành `CurrencyCode` nên
 * không ai truyền được đơn vị khác vào nữa.
 */
export const formatMoney = (amount: number, _currency?: CurrencyCode) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(safeAmount))} ₫`;
};

export const formatCompactMoney = (amount: number, currency?: CurrencyCode) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (Math.abs(safeAmount) < 1_000_000) return formatMoney(safeAmount, currency);

  const divisor = Math.abs(safeAmount) >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
  const value = safeAmount / divisor;

  // Đơn vị rút gọn là chữ tiếng Việt nên phải theo ngôn ngữ giao diện. Cách viết
  // SỐ của VND thì giữ nguyên kiểu Việt ở mọi ngôn ngữ: đó là quy ước của đồng
  // tiền, không phải của giao diện.
  const language = getDocumentLanguage();
  const unit = divisor === 1_000_000_000
    ? (language === 'en' ? 'bn' : 'tỷ')
    : (language === 'en' ? 'm' : 'triệu');

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 1,
  }).format(value)} ${unit} ₫`;
};

export const normalizeMoneyText = (value: string) => value.replace(
  /(-?\d{1,3}(?:\.\d{3})*|-?\d+)\s*(?:đ|₫)(?=\s|[.,;:!?)]|$)/gi,
  '$1 ₫',
);

export const getBillingCycleLabel = (billingCycle?: 'monthly' | 'yearly') => {
  return billingCycle === 'yearly' ? 'năm' : 'tháng';
};
