/**
 * Doanh thu **nền tảng** — BR-REV-008.
 *
 * Đây là số tiền SalonSys thu được từ việc bán gói, tính từ hóa đơn đăng ký đã
 * thanh toán. Nó khác hẳn doanh thu *của tiệm* — tiền khách trả cho tiệm khi làm
 * nail — và sự khác biệt đó không phải chuyện chữ nghĩa: BR-AUTH-030 xếp doanh
 * thu của tiệm vào dữ liệu nghiệp vụ mà Superadmin **không được** truy cập, nên
 * `GET /api/tenants` cố ý không trả về nó và kiểu `Tenant` không còn mang nó.
 *
 * Nguồn dữ liệu ở đây vẫn là hóa đơn đăng ký trong `localStorage`: module gói
 * đăng ký nằm ngoài phạm vi backend MVP. Vì vậy mọi khối số dùng các hàm này
 * phải đi kèm dải nhãn "Dữ liệu mẫu". Khi module đó lên API, chỉ nguồn hóa đơn
 * đổi — công thức ở đây thì không.
 */

import type { Invoice } from '../types';

/** Chỉ hóa đơn đã thu mới là doanh thu. Hóa đơn chờ thu là khoản phải thu, không phải tiền. */
const isCollected = (invoice: Invoice) => invoice.status === 'PAID';

/**
 * Tổng doanh thu nền tảng đã thu.
 *
 * Trước ngày 18 hàm này nhận thêm đơn vị tiền báo cáo và quy đổi từng hóa đơn về
 * đó. Quyết định 10 bỏ USD nên mọi hóa đơn đã cùng một đơn vị, và một phép cộng là
 * đủ — giữ tham số ấy lại chỉ để gợi ý rằng hệ thống còn hai đơn vị tiền.
 */
export const getTotalPlatformRevenue = (invoices: Invoice[]): number => invoices
  .filter(isCollected)
  .reduce((total, invoice) => total + invoice.amount, 0);

/**
 * Doanh thu nền tảng thu được từ **từng tiệm**, tra theo mã tiệm.
 *
 * Trả về `Map` chứ không phải một hàm tra lẻ: các màn hình xếp hạng và vẽ biểu đồ
 * đều duyệt qua toàn bộ danh sách tiệm, nên tính một lần rồi tra là O(n); tra lẻ
 * từng tiệm sẽ quét lại cả mảng hóa đơn đúng bằng số tiệm lần.
 */
export const getPlatformRevenueByTenant = (invoices: Invoice[]): Map<string, number> => {
  const totals = new Map<string, number>();

  for (const invoice of invoices) {
    if (!isCollected(invoice) || !invoice.tenantId) continue;

    totals.set(
      invoice.tenantId,
      (totals.get(invoice.tenantId) || 0)
        + invoice.amount
    );
  }

  return totals;
};
