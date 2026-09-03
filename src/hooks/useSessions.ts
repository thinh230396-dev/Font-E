/**
 * Danh sách phiên đăng nhập đang mở, kèm thao tác thu hồi — BR-AUTH-032/033.
 *
 * Khác mọi hook trước ở một điểm: **nạp lại sau khi ghi là bắt buộc, không phải
 * tối ưu**. Thu hồi một phiên làm đổi trạng thái của đúng bản ghi ấy, nhưng nó
 * cũng có thể làm đổi thứ tự cả danh sách — phiên đã đóng tụt xuống dưới. Vá tại
 * chỗ thì hàng vẫn nằm nguyên vị trí cũ và người dùng tưởng thao tác chưa ăn.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import { listSessions, revokeSession as revokeRequest, type SessionDto } from '../services/sessions';

export interface SessionDirectory {
  sessions: SessionDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  revokeSession: (id: string) => Promise<ApiResult<SessionDto>>;
}

export default function useSessions(
  enabled: boolean,
  /**
   * Đổi giá trị này thì nạp lại. Truyền mã tiệm đang làm việc cho cổng chủ tiệm,
   * vì đổi tiệm là đổi luôn tập phiên nhìn thấy được; cổng Superadmin thì truyền
   * mã tài khoản, vì phạm vi của họ không phụ thuộc tiệm nào.
   */
  scopeKey: string | null
): SessionDirectory {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !scopeKey) {
      setSessions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void listSessions()
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setSessions([]);
          return;
        }

        setError(null);
        setSessions(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, scopeKey, reloadToken]);

  const revokeSession = useCallback(async (id: string) => {
    const result = await revokeRequest(id);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return { sessions, loading, error, reload, revokeSession };
}
