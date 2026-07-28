export type CurrencyCode = 'USD' | 'VND';

const USD_TO_VND_RATE = 25000;

export const normalizeCurrency = (currency?: string): CurrencyCode => {
  return currency === 'USD' ? 'USD' : 'VND';
};

export const formatMoney = (amount: number, currency?: string) => {
  const normalizedCurrency = normalizeCurrency(currency);

  return new Intl.NumberFormat(normalizedCurrency === 'VND' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: normalizedCurrency === 'VND' ? 0 : 2
  }).format(Number.isFinite(amount) ? amount : 0);
};

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
