/**
 * Bảng lịch của **một ngày làm việc**, kèm bốn thao tác ghi.
 *
 * Là hook đầu tiên có tham số ngày, và đó là điểm khác bản chất so với
 * `useCustomers` hay `useStaff`: danh bạ khách có trần tự nhiên nên nạp trọn
 * được, còn lịch hẹn cộng dồn mãi. Đổi ngày là một lần nạp mới, không phải một
 * phép lọc trên dữ liệu đã có — lọc ở trình duyệt thì lịch của ngày mai chỉ hiện
 * khi nó tình cờ nằm trong khoảng đã tải.
 *
 * Cả chủ tiệm lẫn lễ tân đều có toàn quyền ở nhóm `Appointments` (ma trận mục
 * 3.4), nhưng **nhận về hai danh sách khác nhau**: BR-ISO-004 thu hẹp lễ tân về
 * chi nhánh của họ. Phép thu hẹp ấy nằm ở máy chủ, đọc từ phiên đăng nhập, nên
 * hook này không có tham số chi nhánh và cũng không được có.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiError, ApiResult } from '../services/apiClient';
import {
  changeAppointmentStatus as changeStatusRequest,
  createAppointment as createRequest,
  dayRange,
  listAppointments,
  rescheduleAppointment as rescheduleRequest,
  updateAppointment as updateRequest,
  type AppointmentApiStatus,
  type AppointmentDto,
  type AppointmentSaveResult,
  type SaveAppointmentInput
} from '../services/appointments';

export interface AppointmentBoard {
  appointments: AppointmentDto[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  createAppointment: (input: SaveAppointmentInput) => Promise<ApiResult<AppointmentSaveResult>>;
  updateAppointment: (
    id: string,
    input: SaveAppointmentInput
  ) => Promise<ApiResult<AppointmentSaveResult>>;
  rescheduleAppointment: (id: string, startAt: string) => Promise<ApiResult<AppointmentSaveResult>>;
  changeStatus: (id: string, status: AppointmentApiStatus) => Promise<ApiResult<AppointmentDto>>;
}

/**
 * @param isoDate Ngày làm việc cần xem, dạng `yyyy-MM-dd` theo giờ tiệm.
 */
export default function useAppointments(
  enabled: boolean,
  activeTenantId: string | null,
  isoDate: string
): AppointmentBoard {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled || !activeTenantId || !isoDate) {
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    const { from, to } = dayRange(isoDate);

    void listAppointments(from, to)
      .then((result) => {
        if (!active) return;

        if (result.status === 'error') {
          setError(result.error);
          setAppointments([]);
          return;
        }

        setError(null);
        setAppointments(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, activeTenantId, isoDate, reloadToken]);

  /**
   * Bốn hàm ghi đều `reload()` sau khi thành công thay vì tự vá mảng trong bộ
   * nhớ. Đắt hơn một lời gọi mạng, nhưng đây là màn hình mà **hai máy ở quầy
   * cùng mở một lúc** là chuyện thường: vá tại chỗ thì máy này không bao giờ
   * thấy lịch máy kia vừa đặt, và hai người sẽ xếp hai khách vào cùng một giờ
   * mà tin rằng mình đúng.
   *
   * Nó còn đúng vì một lý do nữa: `endAt`, `totalMinutes` và `nextStatuses` đều
   * do máy chủ suy ra, nên bản ghi sau khi ghi không bao giờ là thứ giao diện
   * tự dựng lại được.
   */
  const createAppointment = useCallback(async (input: SaveAppointmentInput) => {
    const result = await createRequest(input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const updateAppointment = useCallback(async (id: string, input: SaveAppointmentInput) => {
    const result = await updateRequest(id, input);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const rescheduleAppointment = useCallback(async (id: string, startAt: string) => {
    const result = await rescheduleRequest(id, startAt);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  const changeStatus = useCallback(async (id: string, status: AppointmentApiStatus) => {
    const result = await changeStatusRequest(id, status);

    if (result.status === 'ok') reload();

    return result;
  }, [reload]);

  return {
    appointments,
    loading,
    error,
    reload,
    createAppointment,
    updateAppointment,
    rescheduleAppointment,
    changeStatus
  };
}
