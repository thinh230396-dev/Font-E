/**
 * Hồ sơ tiệm cho cổng chủ tiệm.
 *
 * Tồn tại vì `useTenants` không dùng được ở đây: hook đó gọi `GET /api/tenants`,
 * endpoint chỉ Superadmin có quyền, nên nó được bật đúng cho vai trò ấy
 * (`App.tsx`). Trước ngày 8, `App.tsx` vẫn tra tiệm của chủ tiệm trong chính
 * mảng rỗng đó, nên cổng chủ tiệm chưa bao giờ nhận được một tiệm thật và luôn
 * rơi vào chế độ dữ liệu mẫu.
 *
 * Phép chuyển từ DTO sang `Tenant` dùng lại `toTenant` của `useTenants` chứ
 * không viết bản thứ hai — hai phép chuyển đổi cho cùng một khái niệm là hai
 * cách hiểu khác nhau về cùng một tiệm.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError } from '../services/apiClient';
import { getMyTenant } from '../services/tenants';
import type { Tenant } from '../types';
import { toTenant } from './useTenants';

export interface MyTenantState {
  tenant: Tenant | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

/**
 * @param enabled Chỉ bật cho vai trò chủ tiệm; hai vai trò kia không có ô
 *   `OwnTenantProfile` trong ma trận quyền nên sẽ nhận `403`.
 * @param activeTenantId Tiệm đang làm việc của phiên. Không được gửi lên máy chủ
 *   — máy chủ tự đọc từ phiên — nhưng đổi giá trị là dấu hiệu người dùng vừa
 *   chuyển tiệm, và khi đó phải nạp lại hồ sơ.
 */
export default function useMyTenant(
  enabled: boolean,
  activeTenantId: string | null
): MyTenantState {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId) {
      setTenant(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void getMyTenant()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setTenant(null);
          return;
        }

        setError(null);
        setTenant(toTenant(result.data));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, reloadToken]);

  return { tenant, loading, error, reload };
}
