/**
 * Danh bạ khách của tiệm đang làm việc, kèm ba thao tác ghi và một phép đọc
 * hồ sơ đầy đủ.
 *
 * Nằm cạnh màn hình dùng nó thay vì nạp sẵn ở `App.tsx`, giống `useStaff`: màn
 * "Khách hàng" được nạp trễ (`lazy`) nên danh sách chỉ đi lấy khi người dùng
 * thật sự mở tab đó.
 *
 * Cả chủ tiệm lẫn lễ tân đều có toàn quyền ở nhóm `Customers` (ma trận mục 3.4),
 * và cả hai nhận về **cùng một danh sách** — BR-CUS-001, khách thuộc tiệm chứ
 * không thuộc chi nhánh. Đây là chỗ khác `useStaff`, nơi máy chủ thu hẹp danh
 * sách của lễ tân về chi nhánh của họ.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  changeCustomerStatus as changeCustomerStatusRequest,
  createCustomer as createCustomerRequest,
  getCustomer as getCustomerRequest,
  listCustomers,
  updateCustomer as updateCustomerRequest,
  type CustomerApiStatus,
  type CustomerDetail,
  type CustomerDto,
  type SaveCustomerInput
} from '../services/customers';

export interface CustomerDirectory {
  customers: CustomerDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  createCustomer: (input: SaveCustomerInput) => Promise<ApiResult<CustomerDto>>;
  updateCustomer: (id: string, input: SaveCustomerInput) => Promise<ApiResult<CustomerDto>>;
  changeCustomerStatus: (id: string, status: CustomerApiStatus) => Promise<ApiResult<CustomerDto>>;
  /**
   * Hồ sơ đầy đủ kèm lịch sử ghé, gọi khi người dùng mở ngăn chi tiết.
   *
   * Cố ý KHÔNG nạp sẵn cho cả danh sách: lịch sử của hai mươi người là hai mươi
   * phép nối cho một màn hình chỉ mở chi tiết đúng một hồ sơ.
   */
  getCustomer: (id: string) => Promise<ApiResult<CustomerDetail>>;
}

export default function useCustomers(
  enabled: boolean,
  activeTenantId: string | null
): CustomerDirectory {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId) {
      setCustomers([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listCustomers()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setCustomers([]);
          return;
        }

        setError(null);
        setCustomers(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, reloadToken]);

  const createCustomer = useCallback(async (input: SaveCustomerInput) => {
    const result = await createCustomerRequest(input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const updateCustomer = useCallback(async (id: string, input: SaveCustomerInput) => {
    const result = await updateCustomerRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const changeCustomerStatus = useCallback(async (id: string, status: CustomerApiStatus) => {
    const result = await changeCustomerStatusRequest(id, status);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const getCustomer = useCallback((id: string) => getCustomerRequest(id), []);

  return {
    customers,
    loading,
    error,
    reload,
    createCustomer,
    updateCustomer,
    changeCustomerStatus,
    getCustomer
  };
}
