/**
 * Tầng gọi API hóa đơn đăng ký — thứ **tiệm trả cho SalonSys**.
 *
 * ⚠️ Không nhầm với `services/salesInvoices.ts`, thứ khách trả cho tiệm. BR-INV-001 mở đầu
 * bằng đúng cảnh báo này, và BR-REV-008 nói rõ **doanh thu nền tảng tính từ bảng này** — nhầm
 * hai thứ đó là nhầm luôn ý nghĩa của mọi con số trên màn Tổng quan của Superadmin.
 *
 * Chỉ có một phép đọc. Lát cắt gói đăng ký đã bị cắt khỏi MVP nên không có lệnh nộp chứng từ
 * hay xác nhận thanh toán; tệp này tồn tại vì thiếu nó thì màn Tổng quan phải bịa ra con số
 * doanh thu nền tảng.
 */

import { apiGet, type ApiResult } from './apiClient';

/**
 * BR-INV-030…033. `OVERDUE` **tính lúc đọc** từ hạn thanh toán, không phải một cột trong
 * database — BR-TENANT-003 không cho hệ thống có job chạy nền nào để cập nhật nó.
 */
export type SubscriptionInvoiceApiStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

/**
 * `tenantName` và `packageName` được **chốt lúc lập hóa đơn**: tiệm đổi tên hay đổi gói về sau
 * không được làm sai một chứng từ đã phát hành.
 */
export interface SubscriptionInvoiceDto {
  id: string;
  code: string;
  tenantId: string;
  tenantName: string;
  packageId: string;
  packageName: string;
  amount: number;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  reason: string;
  status: SubscriptionInvoiceApiStatus;
  paymentReference?: string | null;
  paymentNote?: string | null;
  submittedAt?: string | null;
  /** Rỗng khi chưa thu. Đây là mốc mà doanh thu nền tảng ghi nhận (BR-REV-008). */
  paidAt?: string | null;
  createdAt: string;
}

export const listSubscriptionInvoices = async (): Promise<ApiResult<SubscriptionInvoiceDto[]>> => {
  const result = await apiGet<{ invoices: SubscriptionInvoiceDto[] }>('/api/subscription-invoices');

  return result.status === 'ok' ? { status: 'ok', data: result.data.invoices } : result;
};
