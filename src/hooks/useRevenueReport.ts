/**
 * Báo cáo doanh thu của một khoảng ngày — BR-REV-001…005.
 *
 * Là hook **chỉ đọc** duy nhất trong dự án: báo cáo không có thao tác ghi nào, vì doanh thu
 * không phải thứ ai nhập vào mà là thứ suy ra từ tiền đã thu. BR-REV-006 cũng đóng luôn cửa
 * cho template và lịch gửi định kỳ, nên sẽ không có hàm ghi nào được thêm về sau.
 *
 * Chỉ chủ tiệm gọi được (ma trận mục 3.4). Lễ tân và Superadmin đều nhận `403`, nên màn hình
 * dùng hook này phải nằm sau một phép kiểm vai trò — không nên để người dùng thấy một trang
 * trống kèm lỗi quyền.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError } from '../services/apiClient';
import { getRevenueReport, rangeOf, type RevenueReportDto } from '../services/reports';

export interface RevenueReportState {
  report: RevenueReportDto | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

/**
 * @param startIsoDate Ngày đầu khoảng, dạng `yyyy-MM-dd` theo giờ tiệm.
 * @param endIsoDate Ngày cuối khoảng, **bao gồm cả ngày này**.
 * @param branchId Bộ lọc chi nhánh, rỗng nghĩa là cả tiệm.
 */
export default function useRevenueReport(
  enabled: boolean,
  activeTenantId: string | null,
  startIsoDate: string,
  endIsoDate: string,
  branchId?: string | null
): RevenueReportState {
  const [report, setReport] = useState<RevenueReportDto | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId || !startIsoDate || !endIsoDate) {
      setReport(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    const { from, to } = rangeOf(startIsoDate, endIsoDate);

    void getRevenueReport(from, to, branchId)
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setReport(null);
          return;
        }

        setError(null);
        setReport(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, startIsoDate, endIsoDate, branchId, reloadToken]);

  return { report, loading, error, reload };
}
