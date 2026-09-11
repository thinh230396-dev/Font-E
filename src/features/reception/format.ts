/**
 * Giờ mở cửa của tiệm và mấy phép định dạng nhỏ mà cả quầy lễ tân dùng chung.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27.
 *
 * ⚠️ `TenantAdminAppointments.tsx` hiện có **bản sao riêng** của ba hằng giờ mở cửa và của
 * `getOperationalDefaultTime` (đặt tên `formatMinutesFromStart`). Hai bản sao ấy chưa được gộp
 * trong lần tách này vì màn đặt lịch của chủ tiệm còn chờ đợt tách của riêng nó; khi tới đó thì
 * đây là chỗ để gộp về.
 */

export const SALON_OPEN_MINUTES = 8 * 60; // 08:00 (480 min)
export const SALON_CLOSE_MINUTES = 20 * 60 + 30; // 20:30 (1230 min)
export const SALON_LAST_BOOKING_MINUTES = 20 * 60; // 20:00 (1200 min)

export const formatMinutes = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getOperationalDefaultTime = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes >= SALON_OPEN_MINUTES && currentMinutes <= SALON_LAST_BOOKING_MINUTES) {
    const rounded = Math.ceil(currentMinutes / 5) * 5;
    return formatMinutes(Math.min(rounded, SALON_LAST_BOOKING_MINUTES));
  }
  return '08:00';
};

export const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
export const nowTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
export const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
