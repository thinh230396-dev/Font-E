import type { PackageUpgradeRequest } from '../types';

/**
 * Yêu cầu nâng cấp gói — lưu hoàn toàn trên trình duyệt.
 *
 * Trước đây các hàm ở đây gọi `/api/package-upgrade-requests`, một endpoint do plugin
 * `vite-local-auth` phục vụ. Ngày 1 của `README-BACKEND-ROADMAP.md` gỡ plugin đó để proxy
 * đưa được `/api/auth/*` sang backend ASP.NET Core thật, nên endpoint này mất chỗ phục vụ
 * và trả 404 ở mỗi lần tải trang. Module gói đăng ký đã bị cắt khỏi MVP (ngày 17), nên nó
 * sẽ không quay lại.
 *
 * Quyết định 20 ngày 25/08 chốt bỏ hẳn các lời gọi đó thay vì giữ một endpoint chết. Nhờ
 * vậy console sạch khi demo, và quan trọng hơn là ba hàm ghi dưới đây thôi nói dối: chúng
 * từng `return true` ngay trong nhánh `catch`, tức là báo "đã lưu lên máy chủ" đúng vào lúc
 * lời gọi thất bại. Nay chúng chỉ hứa đúng thứ chúng làm được — ghi vào `localStorage`.
 *
 * Màn hình dùng dữ liệu này mang dải nhãn `MockDataNotice` để người xem biết điều đó.
 */

export const PACKAGE_UPGRADE_REQUESTS_STORAGE_KEY = 'salonsys_package_upgrade_requests';

export const loadPackageUpgradeRequests = (): PackageUpgradeRequest[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PACKAGE_UPGRADE_REQUESTS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const savePackageUpgradeRequests = (requests: PackageUpgradeRequest[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PACKAGE_UPGRADE_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư, hết dung lượng). Dữ liệu vẫn còn trong
    // state của React cho tới khi tải lại trang, nên màn hình không vỡ giữa chừng.
  }
};

export const persistPackageUpgradeRequest = (request: PackageUpgradeRequest) => {
  const current = loadPackageUpgradeRequests();
  savePackageUpgradeRequests([request, ...current.filter((item) => item.id !== request.id)]);
};

export const persistPackageUpgradeReview = (request: PackageUpgradeRequest) => {
  const current = loadPackageUpgradeRequests();
  savePackageUpgradeRequests(current.map((item) => (item.id === request.id ? request : item)));
};

export const deletePackageUpgradeRequest = (requestId: string) => {
  const current = loadPackageUpgradeRequests();
  savePackageUpgradeRequests(current.filter((item) => item.id !== requestId));
};
