/**
 * Tầng gọi API báo cáo doanh thu — endpoint duy nhất của ngày 16.
 *
 * BR-REV-006 nói rõ API **chỉ** cung cấp endpoint tổng hợp doanh thu; template báo cáo, lịch
 * gửi định kỳ và xuất file nằm ngoài phạm vi MVP. Vì vậy tệp này cố ý ngắn, và sẽ không dài
 * thêm: mọi thứ khác trên màn báo cáo là giao diện chạy dữ liệu mẫu.
 *
 * Một lời gọi trả về **cả bốn chiều** của BR-REV-004. Bốn lời gọi riêng sẽ là bốn lần quét
 * cùng một khoảng dữ liệu, và tệ hơn — chúng có thể rơi vào hai phía của một lần thu tiền ở
 * quầy, khiến bốn bảng trên cùng một màn hình cộng ra bốn con số khác nhau.
 */

import { apiGet, type ApiResult } from './apiClient';

/** Một dòng phân rã, dùng chung cho ba chiều: ngày, chi nhánh, dịch vụ. */
export interface RevenueBreakdownRow {
  /** Ngày dạng `yyyy-MM-dd`, hoặc mã chi nhánh / dịch vụ. */
  key: string;
  label: string;
  /** Doanh thu tiệm — **đã loại tip** (BR-REV-002) và đã trừ hoàn tiền (BR-REV-003). */
  revenue: number;
  /** Tiền mặt thật sự đi qua két, gồm cả tip. Luôn ≥ `revenue`. */
  collected: number;
  invoiceCount: number;
}

/** Chiều "nhân viên" — có thêm hoa hồng, thứ ba chiều kia không có ai để hỏi. */
export interface StaffRevenueRow extends RevenueBreakdownRow {
  /** Tỉ lệ dạng 0–1 (0,15 là 15%). */
  commissionRate: number;
  /** BR-EMP-011 — phép nhân lúc hiển thị, không có bảng nào lưu. */
  commission: number;
}

/**
 * Báo cáo doanh thu của một khoảng thời gian.
 *
 * **Bốn bảng phân rã luôn cộng lại ra đúng `revenue`.** Đó không phải trùng hợp mà là tính
 * chất của cách máy chủ phân bổ tiền cho từng dòng hàng, và nó là thứ đáng nêu khi bảo vệ:
 * không ai phải giải thích vì sao bảng này khác bảng kia.
 */
export interface RevenueReportDto {
  from: string;
  to: string;
  branchId?: string | null;
  revenue: number;
  collected: number;
  /** Chênh lệch giữa `collected` và `revenue`. Tiền của kỹ thuật viên, tiệm chỉ giữ hộ. */
  tips: number;
  /** Tổng đã hoàn trong khoảng, ghi bằng số dương cho dễ đọc. */
  refunds: number;
  invoiceCount: number;
  byDay: RevenueBreakdownRow[];
  byBranch: RevenueBreakdownRow[];
  byStaff: StaffRevenueRow[];
  byService: RevenueBreakdownRow[];
}

/**
 * @param branchId Bộ lọc do người dùng chọn. Rỗng nghĩa là cả tiệm.
 */
export const getRevenueReport = async (
  from: string,
  to: string,
  branchId?: string | null
): Promise<ApiResult<RevenueReportDto>> => {
  const query = new URLSearchParams({ from, to });

  if (branchId) query.set('branchId', branchId);

  const result = await apiGet<{ report: RevenueReportDto }>(`/api/reports/revenue?${query}`);

  return result.status === 'ok' ? { status: 'ok', data: result.data.report } : result;
};

/** Ngày làm việc theo giờ tiệm thành khoảng ISO mà API nhận. Khoảng nửa mở: `to` không bao gồm. */
export const rangeOf = (startIsoDate: string, endIsoDate: string): { from: string; to: string } => {
  const end = new Date(`${endIsoDate}T00:00:00+07:00`);
  end.setDate(end.getDate() + 1);

  const pad = (value: number) => String(value).padStart(2, '0');
  const nextDay = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

  return { from: `${startIsoDate}T00:00:00+07:00`, to: `${nextDay}T00:00:00+07:00` };
};
