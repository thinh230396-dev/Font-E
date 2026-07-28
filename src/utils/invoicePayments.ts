import type { Invoice } from '../types';

export type InvoicePaymentGateway = NonNullable<Invoice['paymentGateway']>;

export const PAYMENT_GATEWAY_LABELS: Record<InvoicePaymentGateway, string> = {
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
  STRIPE: 'Thẻ / Stripe',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  MANUAL: 'Tiền mặt / ghi nhận thủ công'
};

export const inferPaymentGateway = (paymentMethod?: string): InvoicePaymentGateway | undefined => {
  const normalized = paymentMethod?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('momo')) return 'MOMO';
  if (normalized.includes('vnpay')) return 'VNPAY';
  if (normalized.includes('stripe') || normalized.includes('thẻ') || normalized.includes('card') || normalized.includes('visa') || normalized.includes('mastercard')) return 'STRIPE';
  if (normalized.includes('chuyển khoản') || normalized.includes('bank')) return 'BANK_TRANSFER';
  if (normalized.includes('tiền mặt') || normalized.includes('thủ công') || normalized.includes('cash') || normalized.includes('khác')) return 'MANUAL';
  return undefined;
};

export const getPaymentMethodLabel = (invoice: Pick<Invoice, 'paymentMethod' | 'paymentGateway' | 'status'>) => {
  if (invoice.paymentMethod?.trim()) return invoice.paymentMethod.trim();
  if (invoice.paymentGateway) return PAYMENT_GATEWAY_LABELS[invoice.paymentGateway];
  return invoice.status === 'PAID' ? 'Ghi nhận thủ công (dữ liệu cũ)' : 'Chưa xác định';
};

export const paymentGatewayRequiresTransactionCode = (gateway?: InvoicePaymentGateway) => Boolean(gateway && gateway !== 'MANUAL');

export const getTransactionDisplay = (invoice: Pick<Invoice, 'transactionCode' | 'paymentGateway' | 'paymentMethod' | 'status'>) => {
  if (invoice.transactionCode?.trim()) return invoice.transactionCode.trim();
  if (invoice.status !== 'PAID') return 'Chưa phát sinh giao dịch';
  const gateway = invoice.paymentGateway || inferPaymentGateway(invoice.paymentMethod);
  return gateway === 'MANUAL' || !gateway ? 'Không yêu cầu mã giao dịch' : 'Thiếu mã giao dịch';
};

export const normalizeInvoicePaymentData = (invoice: Invoice): Invoice => {
  let paymentGateway = invoice.paymentGateway || inferPaymentGateway(invoice.paymentMethod);
  let paymentMethod = invoice.paymentMethod?.trim() || (paymentGateway ? PAYMENT_GATEWAY_LABELS[paymentGateway] : undefined);

  // Hóa đơn cũ có thể chỉ được đánh dấu đã thanh toán mà không lưu kênh thu tiền.
  // Giữ đúng sự thật dữ liệu bằng cách phân loại là ghi nhận thủ công thay vì tạo mã giao dịch giả.
  if (invoice.status === 'PAID' && !paymentGateway) {
    paymentGateway = 'MANUAL';
    paymentMethod = 'Ghi nhận thủ công (dữ liệu cũ)';
  }

  const processingFee = invoice.processingFee || 0;
  const refundedAmount = invoice.refundedAmount || 0;
  const netReceived = invoice.status === 'PAID' && invoice.netReceived === undefined
    ? Math.max(0, invoice.amount - processingFee - refundedAmount)
    : invoice.netReceived;

  return {
    ...invoice,
    paymentGateway,
    paymentMethod,
    netReceived
  };
};
