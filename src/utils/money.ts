import { getDocumentLanguage } from '../i18n/translate';

export type CurrencyCode = 'USD' | 'VND';

const USD_TO_VND_RATE = 25000;

export const normalizeCurrency = (currency?: string): CurrencyCode => {
  return currency === 'USD' ? 'USD' : 'VND';
};

export const formatMoney = (amount: number, currency?: string) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (normalizedCurrency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0,
    }).format(Math.round(safeAmount))} ₫`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2
  }).format(safeAmount);
};

export const formatCompactMoney = (amount: number, currency?: string) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (normalizedCurrency !== 'VND' || Math.abs(safeAmount) < 1_000_000) {
    return formatMoney(safeAmount, normalizedCurrency);
  }

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

export const convertMoney = (amount: number, fromCurrency?: string, toCurrency?: string) => {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);

  if (from === to) return amount;
  if (from === 'USD' && to === 'VND') return Math.round(amount * USD_TO_VND_RATE);
  return Number((amount / USD_TO_VND_RATE).toFixed(2));
};

export const getBillingCycleLabel = (billingCycle?: 'monthly' | 'yearly') => {
  return billingCycle === 'yearly' ? 'năm' : 'tháng';
};
