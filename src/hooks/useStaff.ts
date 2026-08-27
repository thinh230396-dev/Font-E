/**
 * Hồ sơ nhân viên của tiệm đang làm việc, kèm bốn thao tác ghi.
 *
 * Nằm cạnh màn hình dùng nó thay vì nạp sẵn ở `App.tsx`, giống `useSalonServices`:
 * màn "Nhân sự" được nạp trễ (`lazy`) nên danh sách chỉ đi lấy khi người dùng
 * thật sự mở tab đó.
 *
 * Lễ tân cũng gọi được `GET /api/staff` ở mức chỉ xem, và máy chủ tự thu hẹp về
 * chi nhánh của họ. Bốn hàm ghi thì máy chủ trả `403`.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  changeStaffStatus as changeStaffStatusRequest,
  createStaff as createStaffRequest,
  grantStaffAccount as grantStaffAccountRequest,
  listStaff,
  updateStaff as updateStaffRequest,
  type GrantStaffAccountInput,
  type GrantStaffAccountResult,
  type SaveStaffInput,
  type StaffApiStatus,
  type StaffDto
} from '../services/staff';

export interface StaffDirectory {
  staff: StaffDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  createStaff: (input: SaveStaffInput) => Promise<ApiResult<StaffDto>>;
  updateStaff: (id: string, input: SaveStaffInput) => Promise<ApiResult<StaffDto>>;
  changeStaffStatus: (id: string, status: StaffApiStatus) => Promise<ApiResult<StaffDto>>;
  grantStaffAccount: (
    id: string,
    input: GrantStaffAccountInput
  ) => Promise<ApiResult<GrantStaffAccountResult>>;
}

export default function useStaff(enabled: boolean, activeTenantId: string | null): StaffDirectory {
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId) {
      setStaff([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listStaff()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setStaff([]);
          return;
        }

        setError(null);
        setStaff(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, reloadToken]);

  const createStaff = useCallback(async (input: SaveStaffInput) => {
    const result = await createStaffRequest(input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const updateStaff = useCallback(async (id: string, input: SaveStaffInput) => {
    const result = await updateStaffRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const changeStaffStatus = useCallback(async (id: string, status: StaffApiStatus) => {
    const result = await changeStaffStatusRequest(id, status);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  /**
   * Nạp lại danh sách sau khi cấp xong: `StaffDto.account` vừa đổi từ rỗng sang
   * có, và đó là thứ quyết định nút "Cấp tài khoản đăng nhập" còn hiện hay không.
   */
  const grantStaffAccount = useCallback(async (id: string, input: GrantStaffAccountInput) => {
    const result = await grantStaffAccountRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return { staff, loading, error, reload, createStaff, updateStaff, changeStaffStatus, grantStaffAccount };
}
