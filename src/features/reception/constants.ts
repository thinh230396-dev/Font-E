/**
 * Nhãn, tông màu và mục điều hướng của quầy lễ tân — phần "từ vựng hiển thị" cố định.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27. Đây là những bảng tra cứu KHÔNG đổi theo dữ liệu:
 * đổi một dòng ở đây là đổi cách gọi tên trên toàn cổng, nên để chúng nằm cạnh nhau thì soát
 * lại từ vựng nghiệp vụ (§2.6) chỉ cần đọc một file.
 */

import {
  Armchair,
  Banknote,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Smartphone,
  UserCheck,
  UsersRound,
  WalletCards
} from 'lucide-react';
import type {
  AppointmentStatus,
  PaymentMethod,
  ReceptionPage,
  TechnicianShift,
  TechnicianStatus
} from './types';

/**
 * Tông màu và icon của trạng thái do STATUS_MAP dùng chung quản lý.
 * Ở đây chỉ giữ cách gọi riêng tại quầy lễ tân (§2.6 — giữ từ vựng nghiệp vụ),
 * truyền vào StatusBadge qua prop `label`.
 */
export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đang chờ',
  IN_SERVICE: 'Đang phục vụ',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến',
  REFUNDED: 'Đã hoàn tiền',
};

export const methodMeta: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  CASH: { label: 'Tiền mặt', icon: Banknote },
  BANK: { label: 'Chuyển khoản (VietQR)', icon: WalletCards },
  CARD: { label: 'Thẻ POS', icon: CreditCard },
  MOMO: { label: 'Ví MoMo', icon: Smartphone },
  ZALOPAY: { label: 'Ví ZaloPay', icon: Smartphone },
};

export const technicianStatusMeta: Record<TechnicianStatus, { label: string; helper: string }> = {
  PRESENT: { label: 'Có mặt', helper: 'Sẵn sàng nhận khách' },
  NOT_CHECKED_IN: { label: 'Chưa check-in', helper: 'Chưa vào ca' },
  SERVING: { label: 'Đang phục vụ', helper: 'Đang có khách' },
  BREAK: { label: 'Đang nghỉ giữa ca', helper: 'Tạm ngưng nhận khách' },
  SICK_REPORTED: { label: 'Báo nghỉ', helper: 'Đã báo nghỉ hôm nay' },
  ON_LEAVE: { label: 'Nghỉ phép', helper: 'Nghỉ theo lịch phép' },
  LATE: { label: 'Đi trễ', helper: 'Check-in trễ ca' },
};

export const technicianShiftMeta: Record<TechnicianShift, string> = {
  MORNING: 'Ca sáng · 08:00–16:00',
  AFTERNOON: 'Ca chiều · 12:00–20:00',
  FULL_DAY: 'Ca nguyên ngày · 08:00–20:00',
};

export const navItems: Array<{ id: ReceptionPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'desk', label: 'Bàn lễ tân', icon: LayoutDashboard },
  { id: 'appointments', label: 'Lịch hẹn', icon: CalendarDays },
  { id: 'customers', label: 'Khách hàng', icon: UsersRound },
  { id: 'products', label: 'Sản phẩm quầy', icon: PackageSearch },
  { id: 'stations', label: 'Ghế & phòng', icon: Armchair },
  { id: 'technicians', label: 'Kỹ thuật viên', icon: UserCheck },
  { id: 'payments', label: 'Thanh toán & POS', icon: ReceiptText },
];
