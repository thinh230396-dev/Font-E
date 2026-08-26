/**
 * Danh sách chi nhánh của tiệm đang làm việc, kèm ba thao tác ghi.
 *
 * Trước ngày 8, màn chi nhánh của cổng chủ tiệm lưu bằng cách gọi
 * `onUpdateTenant(tenant.id, { branches })` — tức `PUT /api/tenants/{id}`, một
 * endpoint chỉ Superadmin có quyền. Chủ tiệm bấm lưu sẽ nhận `403`, và bốn
 * endpoint chi nhánh viết từ ngày 5 thì không có đường nào gọi tới.
 *
 * Sau mỗi lần ghi thành công thì nạp lại cả danh sách thay vì tự vá bản ghi
 * trong bộ nhớ, cùng lý do đã ghi ở `useTenants`: thứ tự sắp xếp do máy chủ
 * quyết định, và hạn mức `max_salons` được đếm ở đó chứ không ở trình duyệt.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  changeBranchStatus as changeBranchStatusRequest,
  createBranch as createBranchRequest,
  listBranches,
  updateBranch as updateBranchRequest,
  type BranchApiStatus,
  type BranchDto,
  type SaveBranchInput
} from '../services/branches';

export interface BranchDirectory {
  branches: BranchDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  createBranch: (input: SaveBranchInput) => Promise<ApiResult<BranchDto>>;
  updateBranch: (id: string, input: SaveBranchInput) => Promise<ApiResult<BranchDto>>;
  changeBranchStatus: (id: string, status: BranchApiStatus) => Promise<ApiResult<BranchDto>>;
}

/**
 * @param enabled Tắt khi phiên chưa chọn tiệm — máy chủ sẽ trả
 *   `TENANT_NOT_SELECTED` chứ không trả danh sách rỗng.
 * @param activeTenantId Đổi giá trị nghĩa là người dùng vừa chuyển tiệm, phải nạp lại.
 */
export default function useBranches(
  enabled: boolean,
  activeTenantId: string | null
): BranchDirectory {
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId) {
      setBranches([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listBranches()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setBranches([]);
          return;
        }

        setError(null);
        setBranches(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, reloadToken]);

  const createBranch = useCallback(async (input: SaveBranchInput) => {
    const result = await createBranchRequest(input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const updateBranch = useCallback(async (id: string, input: SaveBranchInput) => {
    const result = await updateBranchRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const changeBranchStatus = useCallback(async (id: string, status: BranchApiStatus) => {
    const result = await changeBranchStatusRequest(id, status);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return { branches, loading, error, reload, createBranch, updateBranch, changeBranchStatus };
}
