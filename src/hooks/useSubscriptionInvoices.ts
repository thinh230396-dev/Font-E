/**
 * Sổ hóa đơn đăng ký của toàn hệ thống — nguồn của **doanh thu nền tảng** (BR-REV-008).
 *
 * Chỉ Superadmin gọi được. Là hook chỉ đọc thứ hai của dự án, sau `useRevenueReport`, và cùng
 * lý do: lát cắt gói đăng ký đã bị cắt khỏi MVP nên không có thao tác ghi nào để bày ra.
 *
 * Trả về đúng hình dạng `Invoice` mà các màn Superadmin đang dùng, thay vì DTO thô. Cả ba màn
 * — Tổng quan, Thanh toán & hóa đơn, và ngăn chi tiết tiệm — đọc chung một mảng ấy ở hàng chục
 * chỗ; đổi hình dạng của nó là sửa từng chỗ, và không mua lại gì cho người dùng.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Invoice } from '../types';
import type { ApiError } from '../services/apiClient';
import {
  listSubscriptionInvoices,
  type SubscriptionInvoiceDto
} from '../services/subscriptionInvoices';

/**
 * Mặc DTO lại thành hình dạng `Invoice` của giao diện.
 *
 * Hai chỗ đáng chú ý:
 *
 * - **`currency` luôn là VND** — quyết định 10, BR-VAL-003. Ngày 18 đã thu `CurrencyCode` về
 *   đúng một giá trị và gỡ hẳn `convertMoney` cùng tỷ giá cứng 25.000; ô tiền tệ còn lại trên
 *   kiểu `Invoice` chỉ để đọc được những bản ghi cũ trong `localStorage`.
 * - **`billingPeriod` dựng từ hai mốc kỳ dịch vụ**, vì máy chủ lưu chúng thành hai cột
 *   `datetimeoffset` còn giao diện cũ chỉ có một chuỗi.
 */
const toInvoice = (dto: SubscriptionInvoiceDto): Invoice => {
  const period = `${new Date(dto.periodStart).toLocaleDateString('vi-VN')} – ${new Date(dto.periodEnd).toLocaleDateString('vi-VN')}`;

  return {
    id: dto.id,
    invoiceCode: dto.code,
    tenantId: dto.tenantId,
    tenantName: dto.tenantName,
    planName: dto.packageName,
    packageId: dto.packageId,
    billingCycle: dto.billingCycle === 'YEARLY' ? 'yearly' : 'monthly',
    servicePeriod: period,
    billingPeriod: period,
    dueDate: dto.dueAt,
    amount: dto.amount,
    currency: 'VND',
    status: dto.status,
    transactionCode: dto.paymentReference || undefined,
    note: dto.paymentNote || dto.reason || undefined,
    createdAt: dto.createdAt,
    paidAt: dto.paidAt || undefined
  };
};

export interface SubscriptionInvoiceBook {
  invoices: Invoice[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export default function useSubscriptionInvoices(enabled: boolean): SubscriptionInvoiceBook {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled) {
      setInvoices([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listSubscriptionInvoices()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setInvoices([]);
          return;
        }

        setError(null);
        setInvoices(result.data.map(toInvoice));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, reloadToken]);

  return { invoices, loading, error, reload };
}
