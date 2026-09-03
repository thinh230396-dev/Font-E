/**
 * Sổ hóa đơn của **một ngày làm việc**, kèm bốn thao tác ghi.
 *
 * Cùng khuôn với `useAppointments` — có tham số ngày, vì hóa đơn cũng cộng dồn mãi theo thời
 * gian trong khi màn hình chỉ bao giờ xem một ca.
 *
 * Cả chủ tiệm lẫn lễ tân đều có toàn quyền ở nhóm `SalesInvoices`, nhưng nhận về hai danh sách
 * khác nhau: BR-ISO-004 xếp hóa đơn bán hàng cùng nhóm với lịch hẹn — lễ tân chỉ thấy chi
 * nhánh mình. Phép thu hẹp ấy nằm ở máy chủ, đọc từ phiên đăng nhập, nên hook này không có
 * tham số chi nhánh và cũng không được có.
 *
 * ⚠️ Cố ý **không** có hàm hoàn tiền. BR-PAY-007 chỉ cho chủ tiệm hoàn, và hook này phục vụ
 * cổng lễ tân; bày sẵn một hàm mà mọi lời gọi đều trả `403` là mời người viết giao diện dựng
 * một nút không bao giờ dùng được.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  cancelSalesInvoice as cancelRequest,
  createSalesInvoice as createRequest,
  dayRange,
  listSalesInvoices,
  recordPayment as recordPaymentRequest,
  updateSalesInvoice as updateRequest,
  type CreateSalesInvoiceInput,
  type RecordPaymentInput,
  type SalesInvoiceDto,
  type UpdateSalesInvoiceInput
} from '../services/salesInvoices';

export interface SalesInvoiceBook {
  invoices: SalesInvoiceDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  createInvoice: (input: CreateSalesInvoiceInput) => Promise<ApiResult<SalesInvoiceDto>>;
  updateInvoice: (id: string, input: UpdateSalesInvoiceInput) => Promise<ApiResult<SalesInvoiceDto>>;
  recordPayment: (id: string, input: RecordPaymentInput) => Promise<ApiResult<SalesInvoiceDto>>;
  cancelInvoice: (id: string) => Promise<ApiResult<SalesInvoiceDto>>;
}

export default function useSalesInvoices(
  enabled: boolean,
  activeTenantId: string | null,
  isoDate: string
): SalesInvoiceBook {
  const [invoices, setInvoices] = useState<SalesInvoiceDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId || !isoDate) {
      setInvoices([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    const { from, to } = dayRange(isoDate);

    void listSalesInvoices(from, to)
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setInvoices([]);
          return;
        }

        setError(null);
        setInvoices(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, isoDate, reloadToken]);

  /*
    Bốn hàm ghi đều `reload()` sau khi thành công, cùng lý do đã ghi ở `useAppointments`: hai
    máy ở quầy cùng mở một lúc là chuyện thường.

    Ở đây còn một lý do mạnh hơn: `recordPayment` có thể làm đổi **cả một bản ghi khác** —
    BR-APT-026 cho lịch hẹn tự hoàn tất khi hóa đơn thu đủ. Nơi gọi vì vậy phải nạp lại cả
    bảng lịch, và tự vá mảng hóa đơn trong bộ nhớ sẽ không bao giờ thấy điều đó.
  */
  const createInvoice = useCallback(async (input: CreateSalesInvoiceInput) => {
    const result = await createRequest(input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const updateInvoice = useCallback(async (id: string, input: UpdateSalesInvoiceInput) => {
    const result = await updateRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const recordPayment = useCallback(async (id: string, input: RecordPaymentInput) => {
    const result = await recordPaymentRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const cancelInvoice = useCallback(async (id: string) => {
    const result = await cancelRequest(id);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return { invoices, loading, error, reload, createInvoice, updateInvoice, recordPayment, cancelInvoice };
}
