/**
 * Bảng giá dịch vụ của tiệm đang làm việc, kèm ba thao tác ghi.
 *
 * Nằm cạnh màn hình dùng nó thay vì nạp sẵn ở `App.tsx`: màn "Dịch vụ & giá"
 * được nạp trễ (`lazy`), nên bảng giá chỉ cần đi lấy khi người dùng thật sự mở
 * tab đó.
 *
 * Lễ tân cũng gọi được `GET /api/services` ở mức chỉ xem (ma trận mục 3.4) —
 * họ cần biết giá khi lập hóa đơn. Ba hàm ghi thì máy chủ sẽ từ chối bằng `403`.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  changeServiceStatus as changeServiceStatusRequest,
  createService as createServiceRequest,
  listServices,
  updateService as updateServiceRequest,
  type SaveServiceInput,
  type ServiceApiStatus,
  type ServiceDto
} from '../services/salonServices';

export interface ServiceDirectory {
  services: ServiceDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  createService: (input: SaveServiceInput) => Promise<ApiResult<ServiceDto>>;
  updateService: (id: string, input: SaveServiceInput) => Promise<ApiResult<ServiceDto>>;
  changeServiceStatus: (id: string, status: ServiceApiStatus) => Promise<ApiResult<ServiceDto>>;
}

export default function useSalonServices(
  enabled: boolean,
  activeTenantId: string | null
): ServiceDirectory {
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId) {
      setServices([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listServices()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setServices([]);
          return;
        }

        setError(null);
        setServices(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, reloadToken]);

  const createService = useCallback(async (input: SaveServiceInput) => {
    const result = await createServiceRequest(input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const updateService = useCallback(async (id: string, input: SaveServiceInput) => {
    const result = await updateServiceRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const changeServiceStatus = useCallback(async (id: string, status: ServiceApiStatus) => {
    const result = await changeServiceStatusRequest(id, status);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return { services, loading, error, reload, createService, updateService, changeServiceStatus };
}
