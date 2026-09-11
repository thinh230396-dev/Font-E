/**
 * Đọc một khóa `localStorage` và trả về giá trị dự phòng khi không đọc được.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Bọc trong `try/catch` là bắt buộc chứ không phải
 * cẩn thận thừa: trình duyệt ở chế độ riêng tư, hoặc người dùng chặn dữ liệu trang, thì chính
 * lệnh đọc ném lỗi — và một cổng lễ tân không được sập chỉ vì không đọc nổi một bản ghi nháp.
 */

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}
