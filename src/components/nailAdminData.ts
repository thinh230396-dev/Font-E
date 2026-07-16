export type NailPageId =
  | 'overview'
  | 'appointments'
  | 'stations'
  | 'pos'
  | 'customers'
  | 'loyalty'
  | 'care'
  | 'staff'
  | 'services'
  | 'inventory'
  | 'gallery'
  | 'online'
  | 'finance'
  | 'sanitation'
  | 'reports'
  | 'settings';

export type UiTone = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';

export interface NailStat {
  label: string;
  value: string;
  detail: string;
  tone: UiTone;
}

export interface NailRow {
  id: string;
  title: string;
  subtitle: string;
  cells: string[];
  badge: string;
  badgeTone: UiTone;
  details: Array<{ label: string; value: string }>;
  note?: string;
}

export interface NailInsight {
  label: string;
  value: string;
  detail: string;
  tone: UiTone;
}

export interface NailFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
}

export interface NailModuleConfig {
  id: Exclude<NailPageId, 'overview'>;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  stats: NailStat[];
  tabs: string[];
  columns: string[];
  rows: NailRow[];
  insightTitle: string;
  insights: NailInsight[];
  checklistTitle: string;
  checklist: string[];
  formTitle: string;
  formFields: NailFormField[];
}

const d = (label: string, value: string) => ({ label, value });

export const nailModuleConfigs: Record<Exclude<NailPageId, 'overview'>, NailModuleConfig> = {
  appointments: {
    id: 'appointments', eyebrow: 'Vận hành hôm nay', title: 'Lịch hẹn', description: 'Điều phối khách, kỹ thuật viên, ghế Nail và toàn bộ hành trình phục vụ.', primaryAction: 'Tạo lịch hẹn', secondaryAction: 'Xuất lịch',
    stats: [
      { label: 'Tổng lịch hôm nay', value: '32', detail: '28 đã xác nhận', tone: 'blue' },
      { label: 'Đang phục vụ', value: '7', detail: '5 Manicure · 2 Pedicure', tone: 'violet' },
      { label: 'Chờ xác nhận', value: '4', detail: 'Cần xử lý trong 15 phút', tone: 'amber' },
      { label: 'Doanh thu dự kiến', value: '18,6 triệu', detail: 'Đã cọc 5,2 triệu', tone: 'emerald' }
    ],
    tabs: ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang phục vụ', 'Hoàn thành', 'Đã hủy'],
    columns: ['Khách hàng', 'Dịch vụ', 'Thời gian', 'Kỹ thuật viên', 'Ghế', 'Trạng thái'],
    rows: [
      { id: 'APT-2148', title: 'Nguyễn Minh Anh', subtitle: '0912 884 206 · Khách VIP', cells: ['Combo Gel Manicure & Nail Art', '09:00–10:30', 'Thảo Nguyễn', 'M-03'], badge: 'Đang phục vụ', badgeTone: 'violet', details: [d('Mẫu Nail', 'French chrome cấp độ 2'), d('Màu sơn', 'OPI Bubble Bath'), d('Tiền cọc', '300.000đ'), d('Tổng dự kiến', '920.000đ'), d('Nguồn đặt', 'Online'), d('Ghi chú', 'Móng ngón trỏ yếu')], note: 'Khách đã tải ảnh mẫu và yêu cầu giữ độ dài móng tự nhiên.' },
      { id: 'APT-2149', title: 'Trần Thu Hà', subtitle: '0908 337 912 · Thành viên', cells: ['Pedicure Spa + Sơn gel', '10:00–11:20', 'Minh Châu', 'P-02'], badge: 'Đã xác nhận', badgeTone: 'blue', details: [d('Kiểu móng', 'Vuông bo góc'), d('Màu sơn', 'DND 751'), d('Tiền cọc', '200.000đ'), d('Tổng dự kiến', '780.000đ'), d('Nguồn đặt', 'Zalo'), d('Nhắc lịch', 'Đã gửi 08:00')] },
      { id: 'APT-2150', title: 'Lê Ngọc Mai', subtitle: '0936 221 557 · Khách mới', cells: ['Đắp gel + Ombre', '11:30–13:30', 'Hà My', 'M-05'], badge: 'Chờ xác nhận', badgeTone: 'amber', details: [d('Độ dài', 'Level 2'), d('Hình dáng', 'Almond'), d('Tiền cọc', '0đ'), d('Tổng dự kiến', '1.250.000đ'), d('Nguồn đặt', 'Instagram'), d('Yêu cầu', 'Gọi xác nhận trước 11:00')] },
      { id: 'APT-2151', title: 'Phạm Gia Hân', subtitle: '0974 360 118 · Khách thường', cells: ['Tháo gel + Manicure', '13:30–14:30', 'Thuỳ Dương', 'M-01'], badge: 'Đã xác nhận', badgeTone: 'blue', details: [d('Bộ cũ', 'Gel cứng'), d('Tình trạng móng', 'Khô nhẹ'), d('Tiền cọc', '100.000đ'), d('Tổng dự kiến', '480.000đ'), d('Nguồn đặt', 'Điện thoại'), d('Lưu ý', 'Không dùng máy mài tốc độ cao')] },
      { id: 'APT-2152', title: 'Vũ Khánh Linh', subtitle: '0909 552 770 · Khách VIP', cells: ['Acrylic Full Set + Đính đá', '15:00–17:30', 'Thảo Nguyễn', 'M-04'], badge: 'Đã xác nhận', badgeTone: 'blue', details: [d('Độ dài', 'Level 3'), d('Hình dáng', 'Coffin'), d('Tiền cọc', '500.000đ'), d('Tổng dự kiến', '1.680.000đ'), d('Nguồn đặt', 'Online'), d('Mẫu Nail', 'Luxury crystal #N-184')] }
    ],
    insightTitle: 'Tình hình lịch hôm nay',
    insights: [
      { label: 'Tỷ lệ lấp đầy', value: '86%', detail: 'Cao điểm 15:00–18:00', tone: 'violet' },
      { label: 'Đúng giờ', value: '93%', detail: '2 lịch bắt đầu trễ', tone: 'emerald' },
      { label: 'Hủy / Không đến', value: '3,1%', detail: 'Giảm 1,2% so với tuần trước', tone: 'amber' }
    ],
    checklistTitle: 'Việc cần xử lý', checklist: ['Xác nhận 4 lịch mới', 'Phân ghế cho lịch APT-2155', 'Nhắc khách APT-2160 thanh toán cọc', 'Kiểm tra xung đột ca lúc 18:30'],
    formTitle: 'Tạo lịch hẹn mới', formFields: [
      { key: 'customer', label: 'Tên khách hàng', type: 'text', placeholder: 'Nhập tên hoặc số điện thoại' },
      { key: 'service', label: 'Dịch vụ', type: 'select', options: ['Gel Manicure', 'Pedicure Spa', 'Đắp gel', 'Acrylic Full Set', 'Nail Art'] },
      { key: 'date', label: 'Ngày hẹn', type: 'date' }, { key: 'time', label: 'Giờ bắt đầu', type: 'time' },
      { key: 'technician', label: 'Kỹ thuật viên', type: 'select', options: ['Thảo Nguyễn', 'Minh Châu', 'Hà My', 'Thuỳ Dương'] },
      { key: 'station', label: 'Ghế phục vụ', type: 'select', options: ['Tự động phân ghế', 'M-01', 'M-02', 'M-03', 'P-01', 'P-02'] },
      { key: 'note', label: 'Ghi chú và mẫu Nail', type: 'textarea', placeholder: 'Màu sơn, hình dáng, dị ứng hoặc yêu cầu riêng...' }
    ]
  },
  stations: {
    id: 'stations', eyebrow: 'Điều phối không gian', title: 'Ghế & khu vực', description: 'Theo dõi công suất ghế Manicure, Pedicure, khu VIP và lịch bảo trì.', primaryAction: 'Thêm ghế', secondaryAction: 'Sơ đồ mặt bằng',
    stats: [
      { label: 'Tổng vị trí', value: '14', detail: '8 Manicure · 4 Pedicure · 2 VIP', tone: 'blue' },
      { label: 'Đang sử dụng', value: '7', detail: 'Công suất tức thời 50%', tone: 'violet' },
      { label: 'Sẵn sàng', value: '5', detail: 'Đã vệ sinh và khử khuẩn', tone: 'emerald' },
      { label: 'Bảo trì', value: '2', detail: 'P-04 cần kiểm tra bồn ngâm', tone: 'amber' }
    ],
    tabs: ['Tất cả', 'Manicure', 'Pedicure', 'Khu VIP', 'Bảo trì'],
    columns: ['Vị trí', 'Khu vực', 'Lịch hiện tại', 'Kỹ thuật viên', 'Lượt hôm nay', 'Trạng thái'],
    rows: [
      { id: 'M-01', title: 'Ghế Manicure 01', subtitle: 'Khu A · Gần quầy lễ tân', cells: ['Manicure', '13:30–14:30 · Phạm Gia Hân', 'Thuỳ Dương', '5 lượt'], badge: 'Đang sử dụng', badgeTone: 'violet', details: [d('Thiết bị', 'Đèn UV, máy mài, hút bụi'), d('Khử khuẩn gần nhất', '12:55 hôm nay'), d('Lịch tiếp theo', '15:00'), d('Công suất ngày', '78%'), d('Bảo trì gần nhất', '01/07/2026'), d('Checklist', '8/8 hoàn tất')] },
      { id: 'M-03', title: 'Ghế Manicure 03', subtitle: 'Khu A · Bàn đôi', cells: ['Manicure', '09:00–10:30 · Nguyễn Minh Anh', 'Thảo Nguyễn', '4 lượt'], badge: 'Đang sử dụng', badgeTone: 'violet', details: [d('Thiết bị', 'Đèn UV, máy mài, hút bụi'), d('Khử khuẩn gần nhất', '08:42 hôm nay'), d('Lịch tiếp theo', '11:00'), d('Công suất ngày', '91%'), d('Bảo trì gần nhất', '28/06/2026'), d('Checklist', '8/8 hoàn tất')] },
      { id: 'P-02', title: 'Ghế Pedicure 02', subtitle: 'Khu B · Bồn ngâm massage', cells: ['Pedicure', '10:00–11:20 · Trần Thu Hà', 'Minh Châu', '4 lượt'], badge: 'Đang sử dụng', badgeTone: 'violet', details: [d('Thiết bị', 'Bồn massage, ghế điện'), d('Khử khuẩn gần nhất', '09:30 hôm nay'), d('Lịch tiếp theo', '12:30'), d('Công suất ngày', '82%'), d('Bảo trì gần nhất', '05/07/2026'), d('Checklist', '10/10 hoàn tất')] },
      { id: 'M-06', title: 'Ghế Manicure 06', subtitle: 'Khu A · Cuối phòng', cells: ['Manicure', 'Trống đến 15:30', 'Chưa phân công', '2 lượt'], badge: 'Sẵn sàng', badgeTone: 'emerald', details: [d('Thiết bị', 'Đèn UV, máy mài'), d('Khử khuẩn gần nhất', '13:05 hôm nay'), d('Lịch tiếp theo', '15:30'), d('Công suất ngày', '42%'), d('Bảo trì gần nhất', '03/07/2026'), d('Checklist', '8/8 hoàn tất')] },
      { id: 'P-04', title: 'Ghế Pedicure 04', subtitle: 'Khu B · Gần cửa sổ', cells: ['Pedicure', 'Tạm ngưng nhận lịch', '—', '0 lượt'], badge: 'Bảo trì', badgeTone: 'amber', details: [d('Sự cố', 'Áp lực nước bồn ngâm yếu'), d('Phát hiện', '15/07/2026 · 19:10'), d('Nhà cung cấp', 'NailPro Equipment'), d('Dự kiến xong', '17/07/2026'), d('Người phụ trách', 'Lê Hoàng Nam'), d('Chi phí dự kiến', '850.000đ')] }
    ],
    insightTitle: 'Hiệu suất không gian', insights: [
      { label: 'Manicure', value: '84%', detail: '6/8 ghế có lịch', tone: 'violet' },
      { label: 'Pedicure', value: '71%', detail: '1 ghế đang bảo trì', tone: 'blue' },
      { label: 'Khu VIP', value: '62%', detail: 'Còn trống sau 17:00', tone: 'emerald' }
    ],
    checklistTitle: 'Vận hành khu vực', checklist: ['Vệ sinh P-01 sau lịch 14:00', 'Kiểm tra bồn ngâm P-04', 'Bổ sung khăn sạch khu VIP', 'Chốt sơ đồ ghế cuối tuần'],
    formTitle: 'Thêm vị trí phục vụ', formFields: [
      { key: 'name', label: 'Tên vị trí', type: 'text', placeholder: 'Ví dụ: Ghế Manicure 07' },
      { key: 'area', label: 'Khu vực', type: 'select', options: ['Manicure', 'Pedicure', 'Khu VIP'] },
      { key: 'code', label: 'Mã vị trí', type: 'text', placeholder: 'M-07' },
      { key: 'equipment', label: 'Thiết bị đi kèm', type: 'textarea', placeholder: 'Đèn UV, máy mài, hút bụi...' }
    ]
  },
  pos: {
    id: 'pos', eyebrow: 'Bán hàng tại quầy', title: 'POS & thanh toán', description: 'Lập hóa đơn dịch vụ, sản phẩm, tiền tip, đặt cọc và đối soát thanh toán.', primaryAction: 'Tạo hóa đơn', secondaryAction: 'Đóng ca',
    stats: [
      { label: 'Doanh thu ca', value: '14,82 triệu', detail: '23 hóa đơn đã thanh toán', tone: 'emerald' },
      { label: 'Đang chờ thanh toán', value: '5', detail: 'Tổng giá trị 3,76 triệu', tone: 'amber' },
      { label: 'Giá trị đơn TB', value: '644.000đ', detail: '+8,4% so với tuần trước', tone: 'violet' },
      { label: 'Tiền tip', value: '1,26 triệu', detail: 'Đã phân bổ cho 7 kỹ thuật viên', tone: 'blue' }
    ],
    tabs: ['Tất cả hóa đơn', 'Chờ thanh toán', 'Đã thanh toán', 'Hoàn tiền', 'Đặt cọc'],
    columns: ['Hóa đơn', 'Khách hàng', 'Dịch vụ & sản phẩm', 'Thanh toán', 'Nhân viên', 'Trạng thái'],
    rows: [
      { id: 'INV-7821', title: 'INV-7821', subtitle: 'Nguyễn Minh Anh · 10:32', cells: ['Gel Manicure + Nail Art · Dầu dưỡng', '1.070.000đ · MoMo', 'Thảo Nguyễn'], badge: 'Đã thanh toán', badgeTone: 'emerald', details: [d('Tiền hàng', '1.020.000đ'), d('Tiền tip', '100.000đ'), d('Giảm thành viên', '-50.000đ'), d('Đặt cọc đã trừ', '300.000đ'), d('Còn thanh toán', '770.000đ'), d('Phương thức', 'MoMo')] },
      { id: 'INV-7822', title: 'INV-7822', subtitle: 'Trần Thu Hà · 11:18', cells: ['Pedicure Spa + Sơn gel', '780.000đ · Chuyển khoản', 'Minh Châu'], badge: 'Chờ thanh toán', badgeTone: 'amber', details: [d('Tiền dịch vụ', '780.000đ'), d('Tiền tip', '0đ'), d('Giảm giá', '0đ'), d('Đặt cọc đã trừ', '200.000đ'), d('Còn thanh toán', '580.000đ'), d('Phương thức', 'Chưa chọn')] },
      { id: 'INV-7819', title: 'INV-7819', subtitle: 'Đặng Hải Yến · 09:45', cells: ['Combo Manicure · Kem dưỡng tay', '690.000đ · Thẻ', 'Thuỳ Dương'], badge: 'Đã thanh toán', badgeTone: 'emerald', details: [d('Tiền dịch vụ', '520.000đ'), d('Sản phẩm', '220.000đ'), d('Voucher', '-50.000đ'), d('Tiền tip', '50.000đ'), d('Tổng thu', '740.000đ'), d('Phương thức', 'Visa **** 4821')] },
      { id: 'INV-7817', title: 'INV-7817', subtitle: 'Hoàng Bảo Ngọc · 08:52', cells: ['Tháo bột + Phục hồi móng', '460.000đ · Tiền mặt', 'Hà My'], badge: 'Đã thanh toán', badgeTone: 'emerald', details: [d('Tiền dịch vụ', '460.000đ'), d('Tiền tip', '80.000đ'), d('Giảm giá', '0đ'), d('Khách đưa', '600.000đ'), d('Tiền thừa', '60.000đ'), d('Phương thức', 'Tiền mặt')] },
      { id: 'INV-7814', title: 'INV-7814', subtitle: 'Bùi Thanh Trúc · 16:20 hôm qua', cells: ['Acrylic Full Set', '1.350.000đ · Ví điện tử', 'Thảo Nguyễn'], badge: 'Hoàn tiền', badgeTone: 'rose', details: [d('Giá trị gốc', '1.350.000đ'), d('Đã hoàn', '300.000đ'), d('Lý do', 'Điều chỉnh dịch vụ'), d('Người duyệt', 'Lê Hoàng Nam'), d('Thời gian', '16/07 · 08:15'), d('Mã giao dịch', 'RF-28419')] }
    ],
    insightTitle: 'Cơ cấu thanh toán', insights: [
      { label: 'Chuyển khoản', value: '42%', detail: '6,22 triệu', tone: 'violet' },
      { label: 'Ví điện tử', value: '27%', detail: '4,00 triệu', tone: 'blue' },
      { label: 'Tiền mặt & thẻ', value: '31%', detail: '4,60 triệu', tone: 'emerald' }
    ],
    checklistTitle: 'Đối soát ca', checklist: ['Xử lý 5 hóa đơn chờ', 'Kiểm tra giao dịch RF-28419', 'Phân bổ 220.000đ tiền tip', 'Kiểm đếm tiền mặt lúc 20:30'],
    formTitle: 'Tạo hóa đơn mới', formFields: [
      { key: 'customer', label: 'Khách hàng', type: 'text', placeholder: 'Tên hoặc số điện thoại' },
      { key: 'service', label: 'Dịch vụ', type: 'select', options: ['Gel Manicure', 'Pedicure Spa', 'Acrylic Full Set', 'Nail Art', 'Sản phẩm bán lẻ'] },
      { key: 'amount', label: 'Giá trị', type: 'number', placeholder: '0' },
      { key: 'payment', label: 'Phương thức thanh toán', type: 'select', options: ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'MoMo', 'ZaloPay'] },
      { key: 'tip', label: 'Tiền tip', type: 'number', placeholder: '0' },
      { key: 'note', label: 'Ghi chú hóa đơn', type: 'textarea' }
    ]
  },
  customers: {
    id: 'customers', eyebrow: 'Dữ liệu khách hàng', title: 'Khách hàng', description: 'Quản lý hồ sơ, lịch sử làm Nail, sở thích, tình trạng móng và giá trị vòng đời.', primaryAction: 'Thêm khách hàng', secondaryAction: 'Xuất danh sách',
    stats: [
      { label: 'Tổng khách hàng', value: '1.284', detail: '+104 khách trong tháng', tone: 'blue' },
      { label: 'Tỷ lệ quay lại', value: '72%', detail: '+4,8% so với tháng trước', tone: 'emerald' },
      { label: 'Giá trị vòng đời TB', value: '4,82 triệu', detail: '8,4 lượt ghé trung bình', tone: 'violet' },
      { label: 'Cần chăm sóc', value: '38', detail: 'Chưa quay lại trong 45 ngày', tone: 'amber' }
    ],
    tabs: ['Tất cả', 'VIP', 'Thân thiết', 'Khách mới', 'Cần chăm sóc', 'Không hoạt động'],
    columns: ['Khách hàng', 'Phân hạng', 'Lượt ghé', 'Tổng chi tiêu', 'Sở thích Nail', 'Tình trạng'],
    rows: [
      { id: 'CUS-1842', title: 'Nguyễn Minh Anh', subtitle: '0912 884 206 · minhanh@gmail.com', cells: ['VIP', '18 lượt', '24.850.000đ', 'French · Tông nude · Almond'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Điểm thành viên', '2.485 điểm'), d('Lần ghé gần nhất', '16/07/2026'), d('Kỹ thuật viên yêu thích', 'Thảo Nguyễn'), d('Dị ứng', 'Không ghi nhận'), d('Tình trạng móng', 'Móng ngón trỏ yếu'), d('Sinh nhật', '12/08/1994')], note: 'Ưu tiên sơn không HEMA và thường đặt lịch sáng cuối tuần.' },
      { id: 'CUS-1796', title: 'Trần Thu Hà', subtitle: '0908 337 912 · Zalo đã kết nối', cells: ['Thân thiết', '11 lượt', '12.480.000đ', 'Pedicure · Màu đỏ rượu'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Điểm thành viên', '1.248 điểm'), d('Lần ghé gần nhất', '16/07/2026'), d('Kỹ thuật viên yêu thích', 'Minh Châu'), d('Dị ứng', 'Tinh dầu bạc hà'), d('Tình trạng móng', 'Bình thường'), d('Sinh nhật', '28/07/1991')] },
      { id: 'CUS-2011', title: 'Lê Ngọc Mai', subtitle: '0936 221 557 · Khách từ Instagram', cells: ['Khách mới', '1 lượt', '1.250.000đ', 'Ombre · Đính đá nhỏ'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Điểm thành viên', '125 điểm'), d('Lần ghé gần nhất', '16/07/2026'), d('Kỹ thuật viên yêu thích', 'Chưa xác định'), d('Dị ứng', 'Chưa khai báo'), d('Tình trạng móng', 'Móng mỏng'), d('Sinh nhật', '06/11/1997')] },
      { id: 'CUS-1224', title: 'Bùi Thanh Trúc', subtitle: '0938 400 176 · Nhận ưu đãi SMS', cells: ['Thân thiết', '13 lượt', '9.860.000đ', 'Gel đơn sắc · Móng ngắn'], badge: 'Cần chăm sóc', badgeTone: 'amber', details: [d('Điểm thành viên', '986 điểm'), d('Lần ghé gần nhất', '28/05/2026'), d('Kỹ thuật viên yêu thích', 'Thuỳ Dương'), d('Dị ứng', 'Không ghi nhận'), d('Tình trạng móng', 'Khô nhẹ'), d('Sinh nhật', '19/07/1988')] },
      { id: 'CUS-0740', title: 'Hoàng Mỹ Hạnh', subtitle: '0907 311 840 · Chỉ nhận email', cells: ['Tiêu chuẩn', '5 lượt', '3.650.000đ', 'Manicure cơ bản'], badge: 'Không hoạt động', badgeTone: 'slate', details: [d('Điểm thành viên', '365 điểm'), d('Lần ghé gần nhất', '18/11/2025'), d('Kỹ thuật viên yêu thích', 'Hà My'), d('Dị ứng', 'Acetone nồng độ cao'), d('Tình trạng móng', 'Móng giòn'), d('Sinh nhật', '25/01/1986')] }
    ],
    insightTitle: 'Chất lượng tệp khách', insights: [
      { label: 'Hồ sơ đầy đủ', value: '82%', detail: 'Có ngày sinh và sở thích', tone: 'emerald' },
      { label: 'Khách VIP', value: '86', detail: 'Chiếm 34% doanh thu', tone: 'violet' },
      { label: 'CSAT trung bình', value: '4.8', detail: 'Từ 428 đánh giá', tone: 'amber' }
    ],
    checklistTitle: 'Cơ hội chăm sóc', checklist: ['12 khách có sinh nhật trong 7 ngày', '38 khách vắng mặt trên 45 ngày', '26 khách sắp đủ điểm nâng hạng', '9 hồ sơ thiếu thông tin dị ứng'],
    formTitle: 'Thêm khách hàng', formFields: [
      { key: 'name', label: 'Họ và tên', type: 'text' }, { key: 'phone', label: 'Số điện thoại', type: 'text' },
      { key: 'birthday', label: 'Ngày sinh', type: 'date' }, { key: 'source', label: 'Nguồn khách', type: 'select', options: ['Khách giới thiệu', 'Google', 'Instagram', 'TikTok', 'Khách vãng lai'] },
      { key: 'condition', label: 'Tình trạng móng / dị ứng', type: 'textarea', placeholder: 'Ghi chú sức khỏe móng và da...' },
      { key: 'preference', label: 'Sở thích Nail', type: 'textarea', placeholder: 'Màu, form móng, phong cách...' }
    ]
  },
  loyalty: {
    id: 'loyalty', eyebrow: 'Giữ chân khách hàng', title: 'Thành viên & ưu đãi', description: 'Quản lý hạng thành viên, điểm thưởng, gói dịch vụ, voucher và chương trình giới thiệu.', primaryAction: 'Tạo ưu đãi', secondaryAction: 'Cấu hình hạng',
    stats: [
      { label: 'Thành viên hoạt động', value: '742', detail: '58% tổng khách hàng', tone: 'blue' },
      { label: 'Điểm đang lưu hành', value: '486K', detail: 'Tương đương 48,6 triệu', tone: 'violet' },
      { label: 'Tỷ lệ đổi thưởng', value: '31%', detail: '+6% so với quý trước', tone: 'emerald' },
      { label: 'Doanh thu thành viên', value: '68%', detail: 'Của tổng doanh thu tháng', tone: 'amber' }
    ],
    tabs: ['Tổng quan', 'Hạng thành viên', 'Điểm thưởng', 'Voucher', 'Gói dịch vụ', 'Giới thiệu bạn'],
    columns: ['Chương trình', 'Đối tượng', 'Quyền lợi', 'Sử dụng', 'Doanh thu', 'Trạng thái'],
    rows: [
      { id: 'LOY-001', title: 'Hạng VIP Diamond', subtitle: 'Chi tiêu từ 20 triệu / 12 tháng', cells: ['86 khách', 'Giảm 12% · Ưu tiên ghế VIP', '78%', '42,8 triệu'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Số thành viên', '86'), d('Điểm nhân', 'x1,5'), d('Ưu đãi sinh nhật', '500.000đ'), d('Giữ hạng', '20 triệu/năm'), d('Doanh thu TB', '18,2 triệu/khách'), d('Tỷ lệ quay lại', '89%')] },
      { id: 'LOY-002', title: 'Gói Gel Lover 6 buổi', subtitle: 'Sử dụng trong 6 tháng', cells: ['124 khách', '6 Gel Manicure · Tặng 1 tháo gel', '64%', '38,4 triệu'], badge: 'Đang bán', badgeTone: 'emerald', details: [d('Giá gói', '2.790.000đ'), d('Giá trị niêm yết', '3.360.000đ'), d('Đã bán', '124 gói'), d('Buổi còn lại', '418'), d('Hết hạn gần nhất', '31/07/2026'), d('Tỷ lệ gia hạn', '54%')] },
      { id: 'LOY-003', title: 'Voucher sinh nhật tháng 7', subtitle: 'Tự động gửi trước sinh nhật 7 ngày', cells: ['104 khách', 'Giảm 20% tối đa 250.000đ', '42%', '8,6 triệu'], badge: 'Đang chạy', badgeTone: 'violet', details: [d('Đã gửi', '104'), d('Đã mở', '82'), d('Đã sử dụng', '44'), d('Chi phí ưu đãi', '7,2 triệu'), d('Doanh thu tạo ra', '8,6 triệu'), d('Hết hạn', '31/07/2026')] },
      { id: 'LOY-004', title: 'Giới thiệu bạn – Cùng đẹp', subtitle: 'Người giới thiệu và bạn cùng nhận quà', cells: ['238 lượt', '100.000đ mỗi người', '36%', '21,2 triệu'], badge: 'Đang chạy', badgeTone: 'violet', details: [d('Lượt giới thiệu', '238'), d('Khách mới hợp lệ', '86'), d('Voucher đã cấp', '172'), d('Voucher đã dùng', '96'), d('Chi phí', '9,6 triệu'), d('Doanh thu', '21,2 triệu')] },
      { id: 'LOY-005', title: 'Happy Hour 12h–14h', subtitle: 'Từ thứ Hai đến thứ Năm', cells: ['Khách tiêu chuẩn', 'Giảm 15% dịch vụ dưới 60 phút', '28%', '6,8 triệu'], badge: 'Sắp kết thúc', badgeTone: 'amber', details: [d('Lượt sử dụng', '68'), d('Khung giờ', '12:00–14:00'), d('Ngày áp dụng', 'T2–T5'), d('Chi phí ưu đãi', '1,1 triệu'), d('Doanh thu', '6,8 triệu'), d('Kết thúc', '20/07/2026')] }
    ],
    insightTitle: 'Hiệu quả thành viên', insights: [
      { label: 'Tỷ lệ quay lại', value: '84%', detail: 'Cao hơn khách thường 22%', tone: 'emerald' },
      { label: 'Chi tiêu TB', value: '7,4 triệu', detail: 'Nhóm Thân thiết', tone: 'violet' },
      { label: 'Sắp nâng hạng', value: '26', detail: 'Còn dưới 500.000đ', tone: 'amber' }
    ],
    checklistTitle: 'Việc cần làm', checklist: ['Gia hạn 18 gói sắp hết hạn', 'Duyệt ưu đãi tháng 8', 'Xử lý 6 yêu cầu hoàn điểm', 'Gửi voucher cho 12 sinh nhật'],
    formTitle: 'Tạo chương trình ưu đãi', formFields: [
      { key: 'name', label: 'Tên chương trình', type: 'text' }, { key: 'audience', label: 'Đối tượng', type: 'select', options: ['Tất cả khách', 'VIP', 'Thân thiết', 'Khách mới', 'Khách cần chăm sóc'] },
      { key: 'benefit', label: 'Quyền lợi', type: 'text', placeholder: 'Giảm 15% hoặc tặng 100 điểm' },
      { key: 'start', label: 'Ngày bắt đầu', type: 'date' }, { key: 'end', label: 'Ngày kết thúc', type: 'date' },
      { key: 'conditions', label: 'Điều kiện áp dụng', type: 'textarea' }
    ]
  },
  care: {
    id: 'care', eyebrow: 'Chăm sóc tự động', title: 'Chăm sóc khách hàng', description: 'Tạo chiến dịch nhắc lịch, cảm ơn, xin đánh giá và mời khách quay lại.', primaryAction: 'Tạo chiến dịch', secondaryAction: 'Mẫu tin nhắn',
    stats: [
      { label: 'Tin nhắn tháng này', value: '2.486', detail: 'Tỷ lệ gửi thành công 98,6%', tone: 'blue' },
      { label: 'Tỷ lệ mở', value: '82%', detail: 'SMS, Zalo và email', tone: 'violet' },
      { label: 'Lịch tạo lại', value: '146', detail: 'Doanh thu quy đổi 92 triệu', tone: 'emerald' },
      { label: 'Chờ xử lý', value: '38', detail: 'Khách vắng trên 45 ngày', tone: 'amber' }
    ],
    tabs: ['Tất cả', 'Tự động', 'Đang chạy', 'Bản nháp', 'Đã kết thúc'],
    columns: ['Chiến dịch', 'Kênh', 'Đối tượng', 'Đã gửi', 'Chuyển đổi', 'Trạng thái'],
    rows: [
      { id: 'CRM-101', title: 'Nhắc lịch trước 24 giờ', subtitle: 'Tự động theo lịch đã xác nhận', cells: ['Zalo + SMS', 'Khách có lịch ngày mai', '428 tin', '92% xác nhận'], badge: 'Tự động', badgeTone: 'emerald', details: [d('Tần suất', 'Mỗi 15 phút'), d('Tỷ lệ gửi', '99,2%'), d('Tỷ lệ phản hồi', '48%'), d('Xác nhận lịch', '92%'), d('Hủy sau nhắc', '2,4%'), d('Mẫu tin', 'NTF-Appointment-01')] },
      { id: 'CRM-102', title: 'Cảm ơn & xin đánh giá', subtitle: 'Gửi sau khi hoàn thành 2 giờ', cells: ['Zalo', 'Khách vừa sử dụng dịch vụ', '386 tin', '42% đánh giá'], badge: 'Tự động', badgeTone: 'emerald', details: [d('Tỷ lệ gửi', '98,8%'), d('Tỷ lệ mở', '91%'), d('Đánh giá nhận được', '162'), d('Điểm trung bình', '4.8/5'), d('Phản hồi tiêu cực', '3'), d('Mẫu tin', 'NTF-Review-02')] },
      { id: 'CRM-103', title: 'Nhắc làm lại Gel sau 21 ngày', subtitle: 'Theo dịch vụ Gel Manicure', cells: ['Zalo + Email', 'Khách làm Gel 18–24 ngày trước', '214 tin', '28% đặt lại'], badge: 'Đang chạy', badgeTone: 'violet', details: [d('Đối tượng', '214 khách'), d('Đã mở', '178'), d('Đã bấm đặt lịch', '72'), d('Lịch đã tạo', '60'), d('Doanh thu quy đổi', '28,4 triệu'), d('Kết thúc', '31/07/2026')] },
      { id: 'CRM-104', title: 'Quay lại cùng ưu đãi 15%', subtitle: 'Khách vắng mặt trên 45 ngày', cells: ['SMS + Email', '38 khách cần chăm sóc', '38 tin', '18% đặt lại'], badge: 'Đang chạy', badgeTone: 'violet', details: [d('Đối tượng', '38 khách'), d('Đã mở', '29'), d('Đã dùng ưu đãi', '7'), d('Doanh thu', '4,8 triệu'), d('Chi phí ưu đãi', '720.000đ'), d('Kết thúc', '25/07/2026')] },
      { id: 'CRM-105', title: 'Bộ sưu tập Summer Chrome', subtitle: 'Ra mắt 12 mẫu Nail mới', cells: ['Instagram + Email', 'VIP và Thân thiết', '0 tin', 'Chưa chạy'], badge: 'Bản nháp', badgeTone: 'amber', details: [d('Đối tượng dự kiến', '398 khách'), d('Nội dung', '12 mẫu Summer Chrome'), d('Ưu đãi', 'Tặng Nail Art 2 ngón'), d('Ngân sách', '4 triệu'), d('Ngày gửi', '20/07/2026'), d('Người duyệt', 'Chưa duyệt')] }
    ],
    insightTitle: 'Hiệu quả kênh', insights: [
      { label: 'Zalo', value: '88%', detail: 'Tỷ lệ mở cao nhất', tone: 'blue' },
      { label: 'SMS', value: '98,9%', detail: 'Tỷ lệ gửi thành công', tone: 'emerald' },
      { label: 'Email', value: '36%', detail: 'Tỷ lệ mở trung bình', tone: 'violet' }
    ],
    checklistTitle: 'Cần xử lý', checklist: ['Duyệt chiến dịch Summer Chrome', 'Phản hồi 3 đánh giá dưới 4 sao', 'Bổ sung số điện thoại 9 hồ sơ', 'Kiểm tra hạn mức SMS tháng'],
    formTitle: 'Tạo chiến dịch chăm sóc', formFields: [
      { key: 'name', label: 'Tên chiến dịch', type: 'text' }, { key: 'channel', label: 'Kênh gửi', type: 'select', options: ['Zalo', 'SMS', 'Email', 'Zalo + SMS', 'Đa kênh'] },
      { key: 'audience', label: 'Nhóm khách hàng', type: 'select', options: ['Khách có lịch', 'Khách vừa hoàn thành', 'Khách vắng 45 ngày', 'VIP', 'Thân thiết'] },
      { key: 'schedule', label: 'Thời gian gửi', type: 'date' }, { key: 'message', label: 'Nội dung', type: 'textarea', placeholder: 'Soạn nội dung cá nhân hóa...' }
    ]
  },
  staff: {
    id: 'staff', eyebrow: 'Đội ngũ & hiệu suất', title: 'Nhân sự', description: 'Quản lý kỹ thuật viên, ca làm, kỹ năng Nail, chấm công, doanh thu và hoa hồng.', primaryAction: 'Thêm nhân viên', secondaryAction: 'Xuất bảng công',
    stats: [
      { label: 'Tổng nhân sự', value: '18', detail: '15 đang trong ca', tone: 'blue' },
      { label: 'Công suất trung bình', value: '86%', detail: '+5,2% so với tháng trước', tone: 'violet' },
      { label: 'Doanh thu đội ngũ', value: '186,4 triệu', detail: '74,5% mục tiêu tháng', tone: 'emerald' },
      { label: 'Hoa hồng dự kiến', value: '26,8 triệu', detail: 'Chốt kỳ ngày 31/07', tone: 'amber' }
    ],
    tabs: ['Tất cả', 'Đang trong ca', 'Chưa vào ca', 'Nghỉ phép', 'Kỹ thuật viên', 'Lễ tân'],
    columns: ['Nhân viên', 'Vai trò & kỹ năng', 'Ca hôm nay', 'Lịch hẹn', 'Doanh thu', 'Trạng thái'],
    rows: [
      { id: 'STF-002', title: 'Thảo Nguyễn', subtitle: 'Senior Nail Artist · Quận 3', cells: ['Acrylic · Gel X · Nail Art cấp 3', '08:00–18:00', '38 lịch · 92% công suất', '42,8 triệu'], badge: 'Đang làm việc', badgeTone: 'emerald', details: [d('Đánh giá', '4.9/5'), d('Hoa hồng', '18% · 7,7 triệu'), d('Chấm công', '98%'), d('Đi trễ', '1 lần'), d('Phép còn lại', '7,5 ngày'), d('Khách quay lại', '84%')] },
      { id: 'STF-003', title: 'Minh Châu', subtitle: 'Nail Technician · Quận 3', cells: ['Pedicure · Gel · Chăm sóc móng', '09:00–20:00', '34 lịch · 87% công suất', '36,5 triệu'], badge: 'Đang làm việc', badgeTone: 'emerald', details: [d('Đánh giá', '4.8/5'), d('Hoa hồng', '16% · 5,8 triệu'), d('Chấm công', '97%'), d('Đi trễ', '2 lần'), d('Phép còn lại', '8 ngày'), d('Khách quay lại', '78%')] },
      { id: 'STF-004', title: 'Hà My', subtitle: 'Senior Nail Artist · Quận 1', cells: ['Gel X · Ombre · Đào tạo kỹ thuật', '08:00–18:00', '35 lịch · 89% công suất', '39,4 triệu'], badge: 'Đang làm việc', badgeTone: 'emerald', details: [d('Đánh giá', '4.9/5'), d('Hoa hồng', '18% · 7,1 triệu'), d('Chấm công', '99%'), d('Đi trễ', '0 lần'), d('Phép còn lại', '8,5 ngày'), d('Khách quay lại', '86%')] },
      { id: 'STF-005', title: 'Thuỳ Dương', subtitle: 'Junior Nail Technician · Quận 3', cells: ['Gel cơ bản · Tháo móng · Manicure', '10:00–20:00', '29 lịch · 79% công suất', '18,2 triệu'], badge: 'Đang làm việc', badgeTone: 'emerald', details: [d('Đánh giá', '4.7/5'), d('Hoa hồng', '10% · 1,8 triệu'), d('Chấm công', '96%'), d('Đi trễ', '2 lần'), d('Phép còn lại', '9 ngày'), d('Lộ trình', 'Nâng cấp Nail Art 2')] },
      { id: 'STF-006', title: 'Yến Nhi', subtitle: 'Lễ tân · Quận 3', cells: ['Đặt lịch · POS · Chăm sóc khách', 'Nghỉ 16–17/07', '—', 'KPI CSKH 94%'], badge: 'Nghỉ phép', badgeTone: 'amber', details: [d('Chấm công', '95%'), d('Đi trễ', '1 lần'), d('Phép còn lại', '5,5 ngày'), d('CSAT phục vụ', '4.8/5'), d('Lịch xử lý', '326 lịch'), d('Quyền', 'Lịch, khách hàng, POS')] }
    ],
    insightTitle: 'Sức khỏe đội ngũ', insights: [
      { label: 'Đúng giờ', value: '96%', detail: '2 lượt trễ trong tuần', tone: 'emerald' },
      { label: 'CSAT nhân viên', value: '4.8', detail: 'Từ 428 đánh giá', tone: 'amber' },
      { label: 'Ổn định nhân sự', value: '94%', detail: '12 tháng gần nhất', tone: 'violet' }
    ],
    checklistTitle: 'Nhân sự cần chú ý', checklist: ['Duyệt nghỉ phép của Minh Châu', 'Xếp người thay ca Yến Nhi', '3 nhân viên cần đào tạo Nail Art', 'Chốt hoa hồng tạm tính tuần 3'],
    formTitle: 'Thêm nhân viên', formFields: [
      { key: 'name', label: 'Họ và tên', type: 'text' }, { key: 'phone', label: 'Số điện thoại', type: 'text' },
      { key: 'role', label: 'Vai trò', type: 'select', options: ['Quản lý', 'Senior Nail Artist', 'Nail Technician', 'Junior Technician', 'Lễ tân'] },
      { key: 'skills', label: 'Kỹ năng', type: 'textarea', placeholder: 'Gel, Acrylic, Pedicure, Nail Art...' },
      { key: 'shift', label: 'Ca mặc định', type: 'select', options: ['08:00–18:00', '09:00–20:00', '10:00–20:00', 'Bán thời gian'] },
      { key: 'commission', label: 'Hoa hồng (%)', type: 'number' }
    ]
  },
  services: {
    id: 'services', eyebrow: 'Danh mục bán hàng', title: 'Dịch vụ & giá', description: 'Quản lý dịch vụ Nail, biến thể, phụ thu, vật tư, lợi nhuận, hoa hồng và đặt online.', primaryAction: 'Thêm dịch vụ', secondaryAction: 'Xuất bảng giá',
    stats: [
      { label: 'Tổng dịch vụ', value: '48', detail: '42 đang kinh doanh', tone: 'blue' },
      { label: 'Doanh thu dịch vụ', value: '186,4 triệu', detail: '+14,2% so với tháng trước', tone: 'emerald' },
      { label: 'Giá trị lịch hẹn TB', value: '682.000đ', detail: '398 lượt đặt trong tháng', tone: 'violet' },
      { label: 'Biên lợi nhuận TB', value: '68,4%', detail: 'Sau chi phí vật tư', tone: 'amber' }
    ],
    tabs: ['Tất cả', 'Manicure', 'Pedicure', 'Gel', 'Acrylic & Gel X', 'Nail Art', 'Chăm sóc'],
    columns: ['Dịch vụ', 'Nhóm & biến thể', 'Thời lượng', 'Giá bán', 'Lãi gộp', 'Trạng thái'],
    rows: [
      { id: 'SVC-101', title: 'Gel Manicure Signature', subtitle: 'Manicure · Bán chạy #1', cells: ['Gel · 180 màu khả dụng', '75 phút', '560.000đ · TV 504.000đ', '72% · HH 18%'], badge: 'Đặt online', badgeTone: 'emerald', details: [d('Chi phí vật tư', '158.000đ'), d('Tiền cọc', '150.000đ'), d('Kỹ thuật viên', '8 người'), d('Lượt đặt tháng', '86'), d('Đánh giá', '4.9/5'), d('Phụ thu', 'Tháo gel 80.000đ')] },
      { id: 'SVC-102', title: 'Pedicure Spa Deluxe', subtitle: 'Pedicure · Massage 20 phút', cells: ['Pedicure · 3 lựa chọn tinh dầu', '90 phút', '680.000đ · TV 612.000đ', '66% · HH 16%'], badge: 'Đặt online', badgeTone: 'emerald', details: [d('Chi phí vật tư', '230.000đ'), d('Tiền cọc', '200.000đ'), d('Kỹ thuật viên', '6 người'), d('Lượt đặt tháng', '64'), d('Đánh giá', '4.8/5'), d('Phụ thu', 'Sơn gel 180.000đ')] },
      { id: 'SVC-103', title: 'Acrylic Full Set', subtitle: 'Acrylic · Form móng tùy chọn', cells: ['Độ dài level 1–4 · 5 form', '150 phút', '1.150.000đ từ', '61% · HH 20%'], badge: 'Đặt online', badgeTone: 'emerald', details: [d('Chi phí vật tư', '448.000đ'), d('Tiền cọc', '400.000đ'), d('Kỹ thuật viên', '3 người'), d('Lượt đặt tháng', '42'), d('Đánh giá', '4.9/5'), d('Phụ thu', 'Level 3 +200.000đ')] },
      { id: 'SVC-104', title: 'Nail Art theo cấp độ', subtitle: 'Nail Art · Cấp 1 đến 4', cells: ['Vẽ tay · Chrome · Đính đá', '30–120 phút', '200.000đ–1.200.000đ', '74% · HH 22%'], badge: 'Cần tư vấn', badgeTone: 'violet', details: [d('Chi phí vật tư', 'Tùy mẫu'), d('Tiền cọc', '30%'), d('Kỹ thuật viên', '4 người'), d('Lượt đặt tháng', '58'), d('Đánh giá', '4.9/5'), d('Đặt online', 'Chọn cấp độ + tải ảnh')] },
      { id: 'SVC-105', title: 'Phục hồi móng IBX', subtitle: 'Chăm sóc · Móng yếu và hư tổn', cells: ['Liệu trình 1 buổi hoặc 4 buổi', '45 phút', '420.000đ · Gói 1.450.000đ', '58% · HH 12%'], badge: 'Đang kinh doanh', badgeTone: 'blue', details: [d('Chi phí vật tư', '176.000đ'), d('Tiền cọc', '0đ'), d('Kỹ thuật viên', '7 người'), d('Lượt đặt tháng', '31'), d('Đánh giá', '4.8/5'), d('Khuyến nghị', 'Lặp lại sau 14 ngày')] }
    ],
    insightTitle: 'Hiệu suất danh mục', insights: [
      { label: 'Bán chạy nhất', value: 'Gel Manicure', detail: '86 lượt · 48,2 triệu', tone: 'violet' },
      { label: 'Lãi cao nhất', value: 'Nail Art', detail: 'Biên lợi nhuận 74%', tone: 'emerald' },
      { label: 'Cần điều chỉnh', value: '6 dịch vụ', detail: 'Biên thấp hoặc ít lượt', tone: 'amber' }
    ],
    checklistTitle: 'Quản trị bảng giá', checklist: ['Cập nhật phụ thu độ dài Acrylic', 'Duyệt bảng giá bộ sưu tập tháng 8', 'Bổ sung ảnh cho 4 dịch vụ online', 'Rà soát chi phí Gel nhập mới'],
    formTitle: 'Thêm dịch vụ Nail', formFields: [
      { key: 'name', label: 'Tên dịch vụ', type: 'text' }, { key: 'category', label: 'Nhóm dịch vụ', type: 'select', options: ['Manicure', 'Pedicure', 'Gel', 'Acrylic', 'Gel X', 'Nail Art', 'Chăm sóc móng'] },
      { key: 'duration', label: 'Thời lượng (phút)', type: 'number' }, { key: 'price', label: 'Giá niêm yết', type: 'number' },
      { key: 'cost', label: 'Chi phí vật tư', type: 'number' }, { key: 'deposit', label: 'Tiền cọc', type: 'number' },
      { key: 'description', label: 'Mô tả, biến thể và phụ thu', type: 'textarea' }
    ]
  },
  inventory: {
    id: 'inventory', eyebrow: 'Vật tư & hàng hóa', title: 'Kho vật tư', description: 'Theo dõi sơn, gel, bột, hóa chất, dụng cụ tiêu hao, định mức và nhà cung cấp.', primaryAction: 'Nhập kho', secondaryAction: 'Kiểm kê',
    stats: [
      { label: 'Giá trị tồn kho', value: '128,6 triệu', detail: '642 mã hàng', tone: 'blue' },
      { label: 'Sắp hết', value: '18', detail: '6 mặt hàng mức nghiêm trọng', tone: 'amber' },
      { label: 'Sắp hết hạn', value: '9', detail: 'Trong vòng 60 ngày', tone: 'rose' },
      { label: 'Chi phí tháng', value: '36,2 triệu', detail: '19,4% doanh thu', tone: 'violet' }
    ],
    tabs: ['Tất cả', 'Sơn Gel', 'Bột & Gel đắp', 'Hóa chất', 'Phụ kiện', 'Tiêu hao', 'Sắp hết'],
    columns: ['Sản phẩm', 'Nhóm & nhà cung cấp', 'Tồn kho', 'Định mức', 'Giá trị', 'Trạng thái'],
    rows: [
      { id: 'SKU-DND-751', title: 'DND Gel 751 – Merlot', subtitle: 'Màu đỏ rượu · Kệ G-02', cells: ['Sơn Gel · DND Việt Nam', '3 chai', 'Tối thiểu 12', '825.000đ'], badge: 'Sắp hết', badgeTone: 'rose', details: [d('Giá nhập', '275.000đ/chai'), d('Sử dụng 30 ngày', '8 chai'), d('Đủ dùng', 'Khoảng 6 ngày'), d('Lô gần nhất', 'LOT-D751-0626'), d('Hạn sử dụng', '06/2028'), d('Đề xuất nhập', '12 chai')] },
      { id: 'SKU-OPI-BB', title: 'OPI Bubble Bath', subtitle: 'Màu nude hồng · Kệ G-01', cells: ['Sơn Gel · OPI', '5 chai', 'Tối thiểu 15', '1.950.000đ'], badge: 'Sắp hết', badgeTone: 'amber', details: [d('Giá nhập', '390.000đ/chai'), d('Sử dụng 30 ngày', '12 chai'), d('Đủ dùng', 'Khoảng 9 ngày'), d('Lô gần nhất', 'LOT-OPI-0526'), d('Hạn sử dụng', '05/2028'), d('Đề xuất nhập', '15 chai')] },
      { id: 'SKU-APEX-CLEAR', title: 'Apex Gel Clear 50ml', subtitle: 'Gel đắp trong · Kệ A-03', cells: ['Gel đắp · NailPro Supply', '8 hũ', 'Tối thiểu 6', '4.160.000đ'], badge: 'Ổn định', badgeTone: 'emerald', details: [d('Giá nhập', '520.000đ/hũ'), d('Sử dụng 30 ngày', '5 hũ'), d('Đủ dùng', 'Khoảng 45 ngày'), d('Lô gần nhất', 'APX-0626'), d('Hạn sử dụng', '06/2027'), d('Đề xuất nhập', '0')] },
      { id: 'SKU-ACETONE-5L', title: 'Acetone tinh khiết 5L', subtitle: 'Hóa chất · Tủ HC-01', cells: ['Hóa chất · VietChem', '2 can', 'Tối thiểu 4', '1.240.000đ'], badge: 'Sắp hết', badgeTone: 'amber', details: [d('Giá nhập', '620.000đ/can'), d('Sử dụng 30 ngày', '4 can'), d('Đủ dùng', 'Khoảng 14 ngày'), d('Lô gần nhất', 'ACT-0526'), d('Hạn sử dụng', '05/2029'), d('Đề xuất nhập', '4 can')] },
      { id: 'SKU-CHARM-CRY', title: 'Charm Crystal Mix', subtitle: 'Đá và charm · Hộp C-12', cells: ['Phụ kiện · Crystal Nail', '148 viên', 'Tối thiểu 80', '2.960.000đ'], badge: 'Ổn định', badgeTone: 'emerald', details: [d('Giá nhập TB', '20.000đ/viên'), d('Sử dụng 30 ngày', '62 viên'), d('Đủ dùng', 'Khoảng 70 ngày'), d('Bộ sưu tập', 'Luxury 2026'), d('Kiểm kê lệch', '-2 viên'), d('Đề xuất nhập', '0')] }
    ],
    insightTitle: 'Sức khỏe kho', insights: [
      { label: 'Vòng quay tồn kho', value: '4,2 lần', detail: 'Mục tiêu 4,5 lần/năm', tone: 'violet' },
      { label: 'Chênh lệch kiểm kê', value: '0,8%', detail: 'Trong ngưỡng cho phép', tone: 'emerald' },
      { label: 'Đơn nhập chờ', value: '4', detail: 'Giá trị 18,6 triệu', tone: 'amber' }
    ],
    checklistTitle: 'Việc cần xử lý', checklist: ['Tạo đơn nhập DND 751', 'Kiểm kê phụ kiện khu C', 'Xử lý 9 lô sắp hết hạn', 'Duyệt phiếu xuất dùng nội bộ'],
    formTitle: 'Tạo phiếu nhập kho', formFields: [
      { key: 'supplier', label: 'Nhà cung cấp', type: 'select', options: ['DND Việt Nam', 'OPI Việt Nam', 'NailPro Supply', 'VietChem', 'Crystal Nail'] },
      { key: 'product', label: 'Sản phẩm / SKU', type: 'text' }, { key: 'quantity', label: 'Số lượng', type: 'number' },
      { key: 'unitCost', label: 'Đơn giá nhập', type: 'number' }, { key: 'expiry', label: 'Hạn sử dụng', type: 'date' },
      { key: 'note', label: 'Ghi chú lô hàng', type: 'textarea' }
    ]
  },
  gallery: {
    id: 'gallery', eyebrow: 'Nội dung & cảm hứng', title: 'Màu & mẫu Nail', description: 'Quản lý mã màu, bộ sưu tập mẫu, độ khó, phụ thu và kỹ thuật viên có thể thực hiện.', primaryAction: 'Thêm mẫu Nail', secondaryAction: 'Thêm màu sơn',
    stats: [
      { label: 'Mã màu đang có', value: '486', detail: '32 thương hiệu', tone: 'blue' },
      { label: 'Mẫu Nail', value: '328', detail: '42 mẫu mới tháng này', tone: 'violet' },
      { label: 'Được chọn nhiều nhất', value: 'French Chrome', detail: '68 lượt trong tháng', tone: 'emerald' },
      { label: 'Màu đang hết', value: '12', detail: 'Đã tạo đề xuất nhập', tone: 'amber' }
    ],
    tabs: ['Tất cả mẫu', 'Đang thịnh hành', 'French', 'Chrome', 'Ombre', 'Đính đá', 'Mã màu'],
    columns: ['Mẫu / màu', 'Phong cách', 'Độ khó', 'Thời gian thêm', 'Giá phụ thu', 'Trạng thái'],
    rows: [
      { id: 'NAIL-184', title: 'Crystal French Chrome', subtitle: 'Bộ sưu tập Summer 2026', cells: ['French · Chrome · Crystal', 'Cấp 3', '+75 phút', '+680.000đ'], badge: 'Đang thịnh hành', badgeTone: 'violet', details: [d('Màu nền', 'OPI Bubble Bath'), d('Chrome', 'Aurora Pearl 03'), d('Phụ kiện', 'Crystal Mix SS3'), d('Kỹ thuật viên', 'Thảo, Hà My'), d('Lượt chọn', '68'), d('Đánh giá', '4.9/5')] },
      { id: 'NAIL-176', title: 'Milky Ombre Blossom', subtitle: 'Spring Minimal Collection', cells: ['Ombre · Vẽ hoa', 'Cấp 2', '+45 phút', '+420.000đ'], badge: 'Đang bán', badgeTone: 'emerald', details: [d('Màu nền', 'DND Milky White'), d('Màu vẽ', 'Pastel Set 02'), d('Phụ kiện', 'Không'), d('Kỹ thuật viên', '5 người'), d('Lượt chọn', '46'), d('Đánh giá', '4.8/5')] },
      { id: 'NAIL-169', title: 'Red Wine Velvet', subtitle: 'Evening Glam Collection', cells: ['Velvet · Cat Eye', 'Cấp 2', '+30 phút', '+350.000đ'], badge: 'Đang bán', badgeTone: 'emerald', details: [d('Màu nền', 'DND 751 Merlot'), d('Hiệu ứng', 'Cat Eye Magnet 05'), d('Phụ kiện', 'Gold Line'), d('Kỹ thuật viên', '6 người'), d('Lượt chọn', '52'), d('Đánh giá', '4.9/5')] },
      { id: 'CLR-OPI-BB', title: 'OPI Bubble Bath', subtitle: 'Mã OPI-BB · Nude hồng', cells: ['Nude · Sheer', 'Màu sơn', '—', '390.000đ/chai'], badge: 'Còn 5 chai', badgeTone: 'amber', details: [d('Thương hiệu', 'OPI'), d('Mã màu', 'NL S86'), d('Bộ sưu tập', 'Classic'), d('Tồn kho', '5 chai'), d('Lượt dùng tháng', '86'), d('Mẫu liên kết', '42 mẫu')] },
      { id: 'NAIL-192', title: 'Ocean Glass 3D', subtitle: 'Bộ sưu tập dự kiến tháng 8', cells: ['3D Gel · Glass · Ocean', 'Cấp 4', '+120 phút', '+1.100.000đ'], badge: 'Bản nháp', badgeTone: 'amber', details: [d('Màu nền', 'Glass Blue 02'), d('Vật liệu', '3D Clear Gel'), d('Phụ kiện', 'Shell Flake'), d('Kỹ thuật viên', 'Đang đào tạo'), d('Ngày mở bán', '01/08/2026'), d('Ảnh mẫu', '3 ảnh chờ duyệt')] }
    ],
    insightTitle: 'Xu hướng thiết kế', insights: [
      { label: 'Phong cách nổi bật', value: 'Chrome', detail: '+38% lượt chọn', tone: 'violet' },
      { label: 'Tông màu', value: 'Milky Nude', detail: 'Chiếm 26% yêu cầu', tone: 'emerald' },
      { label: 'Phụ thu TB', value: '468.000đ', detail: '+12% so với tháng 6', tone: 'amber' }
    ],
    checklistTitle: 'Quản lý thư viện', checklist: ['Duyệt 3 ảnh Ocean Glass 3D', 'Ẩn 12 màu đang hết hàng', 'Gắn kỹ thuật viên cho 8 mẫu mới', 'Chuẩn bị bộ sưu tập tháng 8'],
    formTitle: 'Thêm mẫu Nail', formFields: [
      { key: 'name', label: 'Tên mẫu Nail', type: 'text' }, { key: 'style', label: 'Phong cách', type: 'select', options: ['French', 'Chrome', 'Ombre', 'Đính đá', '3D Gel', 'Minimal'] },
      { key: 'level', label: 'Độ khó', type: 'select', options: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4'] },
      { key: 'duration', label: 'Thời gian thêm (phút)', type: 'number' }, { key: 'surcharge', label: 'Giá phụ thu', type: 'number' },
      { key: 'materials', label: 'Màu và vật liệu sử dụng', type: 'textarea' }
    ]
  },
  online: {
    id: 'online', eyebrow: 'Kênh đặt lịch công khai', title: 'Đặt lịch online', description: 'Cấu hình trang đặt lịch, dịch vụ hiển thị, tiền cọc, khung giờ và nguồn chuyển đổi.', primaryAction: 'Mở trang đặt lịch', secondaryAction: 'Sao chép liên kết',
    stats: [
      { label: 'Lượt truy cập tháng', value: '4.826', detail: '+24% so với tháng trước', tone: 'blue' },
      { label: 'Tỷ lệ chuyển đổi', value: '18,6%', detail: '898 lượt bắt đầu đặt', tone: 'violet' },
      { label: 'Lịch online', value: '286', detail: '72% tự động xác nhận', tone: 'emerald' },
      { label: 'Tiền cọc online', value: '48,2 triệu', detail: 'Tỷ lệ thành công 96,8%', tone: 'amber' }
    ],
    tabs: ['Tổng quan', 'Dịch vụ hiển thị', 'Khung giờ', 'Tiền cọc', 'Nguồn truy cập', 'Cài đặt trang'],
    columns: ['Nguồn / cấu hình', 'Nội dung', 'Lượt truy cập', 'Chuyển đổi', 'Doanh thu', 'Trạng thái'],
    rows: [
      { id: 'ONL-GOOGLE', title: 'Google Business Profile', subtitle: 'Nút “Đặt lịch” trên Google Maps', cells: ['Trang đặt lịch Quận 3', '1.842 lượt', '22,4%', '68,2 triệu'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Lịch tạo', '124'), d('Tỷ lệ cọc', '94%'), d('Giá trị TB', '720.000đ'), d('Chi phí kênh', '0đ'), d('UTM', 'google_business'), d('Trang đích', '/booking/q3')] },
      { id: 'ONL-INSTAGRAM', title: 'Instagram Bio', subtitle: '@lumierenail.vn · Link in bio', cells: ['Bộ sưu tập Summer', '1.126 lượt', '16,8%', '34,6 triệu'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Lịch tạo', '72'), d('Tỷ lệ cọc', '91%'), d('Giá trị TB', '680.000đ'), d('Chi phí kênh', '4,2 triệu'), d('UTM', 'instagram_bio'), d('Trang đích', '/booking/summer')] },
      { id: 'ONL-TIKTOK', title: 'TikTok Profile', subtitle: '@lumierenailstudio', cells: ['Landing Nail Art', '986 lượt', '12,2%', '18,4 triệu'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Lịch tạo', '44'), d('Tỷ lệ cọc', '88%'), d('Giá trị TB', '620.000đ'), d('Chi phí kênh', '3,8 triệu'), d('UTM', 'tiktok_profile'), d('Trang đích', '/booking/nail-art')] },
      { id: 'ONL-QR', title: 'QR tại quầy', subtitle: 'QR in trên hóa đơn và card', cells: ['Đặt lại trong 30 ngày', '624 lượt', '28,6%', '28,8 triệu'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Lịch tạo', '46'), d('Tỷ lệ cọc', '98%'), d('Giá trị TB', '626.000đ'), d('Chi phí kênh', '0đ'), d('Mã QR', 'QR-REBOOK-01'), d('Trang đích', '/booking/rebook')] },
      { id: 'ONL-WIDGET', title: 'Widget đối tác khách sạn', subtitle: 'Chờ xác nhận hợp tác', cells: ['Khu VIP · Khách du lịch', '0 lượt', '—', '0đ'], badge: 'Bản nháp', badgeTone: 'amber', details: [d('Đối tác', 'Lumière Boutique Hotel'), d('Hoa hồng', '10%'), d('Dịch vụ', '8 dịch vụ VIP'), d('Ngôn ngữ', 'Việt · Anh · Hàn'), d('Ngày dự kiến', '01/08/2026'), d('Trạng thái', 'Chờ duyệt pháp lý')] }
    ],
    insightTitle: 'Phễu đặt lịch', insights: [
      { label: 'Xem dịch vụ', value: '4.826', detail: '100% lượt truy cập', tone: 'blue' },
      { label: 'Chọn thời gian', value: '1.284', detail: '26,6% lượt truy cập', tone: 'violet' },
      { label: 'Hoàn tất cọc', value: '286', detail: '22,3% người bắt đầu', tone: 'emerald' }
    ],
    checklistTitle: 'Tối ưu chuyển đổi', checklist: ['Bổ sung ảnh cho 4 dịch vụ', 'Rút gọn bước chọn Nail Art', 'Kiểm tra thanh toán ZaloPay', 'Duyệt widget đối tác khách sạn'],
    formTitle: 'Tạo liên kết đặt lịch', formFields: [
      { key: 'name', label: 'Tên chiến dịch / liên kết', type: 'text' }, { key: 'channel', label: 'Kênh', type: 'select', options: ['Google', 'Instagram', 'TikTok', 'QR tại quầy', 'Đối tác'] },
      { key: 'branch', label: 'Chi nhánh', type: 'select', options: ['Tất cả', 'Quận 3', 'Quận 1'] },
      { key: 'service', label: 'Nhóm dịch vụ hiển thị', type: 'select', options: ['Tất cả', 'Gel', 'Pedicure', 'Acrylic', 'Nail Art', 'VIP'] },
      { key: 'deposit', label: 'Chính sách cọc', type: 'select', options: ['Theo dịch vụ', 'Cố định 200.000đ', '30% giá trị', 'Không cọc'] },
      { key: 'note', label: 'Thông điệp trang đích', type: 'textarea' }
    ]
  },
  finance: {
    id: 'finance', eyebrow: 'Tài chính nội bộ', title: 'Thu chi', description: 'Theo dõi doanh thu, chi phí, sổ quỹ, công nợ, đối soát và lợi nhuận theo chi nhánh.', primaryAction: 'Tạo phiếu thu/chi', secondaryAction: 'Đối soát ca',
    stats: [
      { label: 'Tổng thu tháng', value: '186,4 triệu', detail: '+18,6% so với tháng 6', tone: 'emerald' },
      { label: 'Tổng chi tháng', value: '112,8 triệu', detail: '60,5% doanh thu', tone: 'rose' },
      { label: 'Lợi nhuận tạm tính', value: '73,6 triệu', detail: 'Biên lợi nhuận 39,5%', tone: 'violet' },
      { label: 'Số dư tiền mặt', value: '18,2 triệu', detail: 'Đã đối soát đến 15/07', tone: 'blue' }
    ],
    tabs: ['Tất cả giao dịch', 'Phiếu thu', 'Phiếu chi', 'Sổ quỹ', 'Công nợ', 'Đối soát'],
    columns: ['Giao dịch', 'Nhóm thu/chi', 'Đối tượng', 'Phương thức', 'Giá trị', 'Trạng thái'],
    rows: [
      { id: 'TXN-8842', title: 'Doanh thu POS ca sáng', subtitle: '16/07/2026 · 12:05', cells: ['Thu dịch vụ & sản phẩm', '23 hóa đơn', 'Đa phương thức', '+14.820.000đ'], badge: 'Đã đối soát', badgeTone: 'emerald', details: [d('Tiền mặt', '3.260.000đ'), d('Chuyển khoản', '6.220.000đ'), d('Thẻ', '2.840.000đ'), d('Ví điện tử', '2.500.000đ'), d('Người chốt', 'Khánh Vy'), d('Chênh lệch', '0đ')] },
      { id: 'EXP-3421', title: 'Nhập sơn Gel DND', subtitle: '16/07/2026 · Nhà cung cấp DND VN', cells: ['Chi phí vật tư', 'Hóa đơn NCC-7841', 'Chuyển khoản', '-8.250.000đ'], badge: 'Đã duyệt', badgeTone: 'blue', details: [d('Số mặt hàng', '18 SKU'), d('Số lượng', '30 chai'), d('Thuế VAT', '750.000đ'), d('Ngày thanh toán', '16/07/2026'), d('Người duyệt', 'Lê Hoàng Nam'), d('Chứng từ', 'Đã đính kèm')] },
      { id: 'EXP-3420', title: 'Chi hoa hồng tuần 2', subtitle: '15/07/2026 · 12 nhân viên', cells: ['Lương & hoa hồng', 'Kỳ 08–14/07', 'Chuyển khoản', '-12.680.000đ'], badge: 'Đã thanh toán', badgeTone: 'emerald', details: [d('Hoa hồng dịch vụ', '10.820.000đ'), d('Hoa hồng sản phẩm', '640.000đ'), d('Tiền tip phân bổ', '1.220.000đ'), d('Nhân viên', '12 người'), d('Người duyệt', 'Lê Hoàng Nam'), d('Chứng từ', 'PAY-0715')] },
      { id: 'EXP-3418', title: 'Bảo trì ghế Pedicure P-04', subtitle: '16/07/2026 · NailPro Equipment', cells: ['Bảo trì thiết bị', 'Bồn ngâm và hệ thống nước', 'Chưa thanh toán', '-850.000đ'], badge: 'Chờ duyệt', badgeTone: 'amber', details: [d('Báo giá', '850.000đ'), d('Ngày thực hiện', '17/07/2026'), d('Người yêu cầu', 'Minh Châu'), d('Trung tâm chi phí', 'Chi nhánh Q3'), d('Hạn duyệt', '16/07 · 18:00'), d('Chứng từ', 'Báo giá đính kèm')] },
      { id: 'REC-1284', title: 'Thu gói Gel Lover', subtitle: '15/07/2026 · Khách Nguyễn Hải Yến', cells: ['Thẻ dịch vụ trả trước', 'Gói 6 buổi', 'Thẻ Visa', '+2.790.000đ'], badge: 'Đã ghi nhận', badgeTone: 'emerald', details: [d('Khách hàng', 'Nguyễn Hải Yến'), d('Số buổi', '6 Gel Manicure'), d('Hạn sử dụng', '15/01/2027'), d('Thuế VAT', 'Đã bao gồm'), d('Nhân viên bán', 'Yến Nhi'), d('Hóa đơn', 'INV-7808')] }
    ],
    insightTitle: 'Cơ cấu chi phí', insights: [
      { label: 'Lương & hoa hồng', value: '42%', detail: '47,4 triệu', tone: 'violet' },
      { label: 'Vật tư', value: '28%', detail: '31,6 triệu', tone: 'blue' },
      { label: 'Mặt bằng & vận hành', value: '30%', detail: '33,8 triệu', tone: 'amber' }
    ],
    checklistTitle: 'Tài chính cần xử lý', checklist: ['Duyệt chi phí bảo trì P-04', 'Đối soát ca tối lúc 20:30', 'Thu hồi công nợ đối tác 6,4 triệu', 'Chốt báo cáo lợi nhuận tuần 3'],
    formTitle: 'Tạo phiếu thu / chi', formFields: [
      { key: 'type', label: 'Loại giao dịch', type: 'select', options: ['Phiếu thu', 'Phiếu chi'] },
      { key: 'category', label: 'Nhóm giao dịch', type: 'select', options: ['Doanh thu khác', 'Vật tư', 'Lương & hoa hồng', 'Bảo trì', 'Mặt bằng', 'Marketing'] },
      { key: 'amount', label: 'Số tiền', type: 'number' }, { key: 'date', label: 'Ngày ghi nhận', type: 'date' },
      { key: 'payment', label: 'Phương thức', type: 'select', options: ['Tiền mặt', 'Chuyển khoản', 'Thẻ'] },
      { key: 'note', label: 'Diễn giải và chứng từ', type: 'textarea' }
    ]
  },
  sanitation: {
    id: 'sanitation', eyebrow: 'An toàn & chất lượng', title: 'Vệ sinh & an toàn', description: 'Quản lý khử khuẩn dụng cụ, vệ sinh ghế, hóa chất, checklist ca và sự cố khách hàng.', primaryAction: 'Ghi nhận khử khuẩn', secondaryAction: 'Checklist ca',
    stats: [
      { label: 'Checklist hôm nay', value: '94%', detail: '68/72 mục đã hoàn tất', tone: 'emerald' },
      { label: 'Bộ dụng cụ sạch', value: '42', detail: 'Đủ phục vụ khoảng 5 giờ', tone: 'blue' },
      { label: 'Ghế chờ vệ sinh', value: '2', detail: 'P-01 và M-05', tone: 'amber' },
      { label: 'Sự cố tháng này', value: '1', detail: 'Đã đóng và có biện pháp', tone: 'rose' }
    ],
    tabs: ['Tổng quan', 'Khử khuẩn dụng cụ', 'Vệ sinh ghế', 'Hóa chất', 'Checklist ca', 'Sự cố'],
    columns: ['Hạng mục', 'Khu vực / lô', 'Người phụ trách', 'Thời gian', 'Kết quả', 'Trạng thái'],
    rows: [
      { id: 'SAN-4821', title: 'Khử khuẩn bộ dụng cụ #K-128', subtitle: 'Kềm, dũa kim loại, đẩy da', cells: ['Khu khử khuẩn', 'Thuỳ Dương', '13:05 · Chu trình 45 phút', 'Đạt'], badge: 'Sẵn sàng', badgeTone: 'emerald', details: [d('Phương pháp', 'Ngâm Barbicide + tủ UV'), d('Nồng độ', 'Theo chuẩn 1:16'), d('Bắt đầu', '12:20'), d('Kết thúc', '13:05'), d('Người kiểm tra', 'Minh Châu'), d('Hạn sử dụng', 'Trong ngày')] },
      { id: 'SAN-4820', title: 'Vệ sinh ghế Pedicure P-02', subtitle: 'Sau lịch Trần Thu Hà', cells: ['Khu Pedicure', 'Minh Châu', '11:22 · 12 phút', 'Đạt'], badge: 'Hoàn thành', badgeTone: 'emerald', details: [d('Bồn ngâm', 'Xả, chà, khử khuẩn'), d('Bề mặt ghế', 'Đã lau sát khuẩn'), d('Dụng cụ', 'Đã chuyển khử khuẩn'), d('Khăn bẩn', 'Đã chuyển giặt'), d('Kiểm tra', 'Không phát hiện bất thường'), d('Lịch tiếp theo', '12:30')] },
      { id: 'SAN-4819', title: 'Checklist mở ca Quận 3', subtitle: '16/07/2026 · 07:45', cells: ['Toàn chi nhánh', 'Yến Nhi', '18/20 mục', 'Thiếu 2 mục'], badge: 'Cần bổ sung', badgeTone: 'amber', details: [d('PPE nhân viên', 'Đạt'), d('Dung dịch khử khuẩn', 'Đạt'), d('Tủ UV', 'Đạt'), d('Ghế P-04', 'Không đạt'), d('Khăn sạch', 'Thiếu khu VIP'), d('Người duyệt', 'Chờ quản lý')] },
      { id: 'CHEM-AC-0526', title: 'Kiểm tra lô Acetone ACT-0526', subtitle: 'Tủ hóa chất HC-01', cells: ['Hóa chất', 'Lê Hoàng Nam', '15/07 · 19:30', 'Đạt'], badge: 'An toàn', badgeTone: 'emerald', details: [d('Nhãn GHS', 'Đầy đủ'), d('Hạn sử dụng', '05/2029'), d('Nắp và bao bì', 'Nguyên vẹn'), d('Thông gió tủ', 'Hoạt động'), d('SDS', 'Đã lưu'), d('Số lượng', '2 can')] },
      { id: 'INC-0021', title: 'Phản ứng da nhẹ sau tháo gel', subtitle: 'Khách CUS-1682 · 08/07/2026', cells: ['Sự cố khách hàng', 'Thảo Nguyễn', 'Đã xử lý trong 15 phút', 'Đã đóng'], badge: 'Đã đóng', badgeTone: 'slate', details: [d('Mức độ', 'Nhẹ'), d('Biểu hiện', 'Đỏ nhẹ quanh biểu bì'), d('Xử lý', 'Rửa sạch, chườm mát'), d('Theo dõi', 'Khách ổn sau 24h'), d('Nguyên nhân', 'Nghi nhạy cảm HEMA'), d('Biện pháp', 'Gắn cảnh báo hồ sơ')] }
    ],
    insightTitle: 'Tuân thủ vận hành', insights: [
      { label: 'Khử khuẩn đúng hạn', value: '98%', detail: 'Mục tiêu ≥ 95%', tone: 'emerald' },
      { label: 'Checklist ghế', value: '94%', detail: '4 mục đang chờ', tone: 'amber' },
      { label: 'Hóa chất có SDS', value: '100%', detail: '36/36 hóa chất', tone: 'blue' }
    ],
    checklistTitle: 'Cần hoàn tất hôm nay', checklist: ['Bổ sung khăn sạch khu VIP', 'Đóng checklist mở ca', 'Vệ sinh P-01 sau lịch 14:00', 'Kiểm tra hạn 9 lô hóa chất'],
    formTitle: 'Ghi nhận vệ sinh / khử khuẩn', formFields: [
      { key: 'type', label: 'Loại hạng mục', type: 'select', options: ['Khử khuẩn dụng cụ', 'Vệ sinh ghế', 'Kiểm tra hóa chất', 'Checklist ca', 'Sự cố'] },
      { key: 'target', label: 'Dụng cụ / vị trí', type: 'text' }, { key: 'owner', label: 'Người thực hiện', type: 'text' },
      { key: 'time', label: 'Thời gian', type: 'time' }, { key: 'result', label: 'Kết quả', type: 'select', options: ['Đạt', 'Cần bổ sung', 'Không đạt'] },
      { key: 'note', label: 'Chi tiết và biện pháp', type: 'textarea' }
    ]
  },
  reports: {
    id: 'reports', eyebrow: 'Phân tích kinh doanh', title: 'Báo cáo', description: 'Theo dõi doanh thu, lợi nhuận, lịch hẹn, khách hàng, nhân sự, kho và hiệu quả marketing.', primaryAction: 'Tạo báo cáo', secondaryAction: 'Lên lịch gửi',
    stats: [
      { label: 'Doanh thu tháng', value: '186,4 triệu', detail: '+18,6% so với tháng 6', tone: 'emerald' },
      { label: 'Lợi nhuận', value: '73,6 triệu', detail: 'Biên ròng 39,5%', tone: 'violet' },
      { label: 'Tỷ lệ quay lại', value: '72%', detail: '+4,8 điểm phần trăm', tone: 'blue' },
      { label: 'Công suất vận hành', value: '86%', detail: 'Cao điểm 15:00–18:00', tone: 'amber' }
    ],
    tabs: ['Tổng quan', 'Doanh thu', 'Lịch hẹn', 'Khách hàng', 'Nhân sự', 'Kho', 'Marketing'],
    columns: ['Báo cáo', 'Phạm vi', 'Kỳ dữ liệu', 'Người nhận', 'Cập nhật', 'Trạng thái'],
    rows: [
      { id: 'RPT-001', title: 'Báo cáo vận hành ngày', subtitle: 'Doanh thu, lịch, ghế và nhân sự', cells: ['Tất cả chi nhánh', 'Hàng ngày · 00:00–23:59', 'Owner · 2 quản lý', '16/07 · 14:32'], badge: 'Tự động', badgeTone: 'emerald', details: [d('Định dạng', 'Dashboard + PDF'), d('Lịch gửi', '21:30 hàng ngày'), d('Kênh gửi', 'Email'), d('Chỉ số', '24 chỉ số'), d('Lần gửi gần nhất', '15/07 · 21:31'), d('Trạng thái gửi', 'Thành công')] },
      { id: 'RPT-002', title: 'Hiệu suất kỹ thuật viên', subtitle: 'Doanh thu, công suất, đánh giá, hoa hồng', cells: ['Theo chi nhánh', 'Hàng tuần · T2–CN', 'Owner · Quản lý nhân sự', '14/07 · 08:00'], badge: 'Tự động', badgeTone: 'emerald', details: [d('Định dạng', 'Excel + Dashboard'), d('Lịch gửi', '08:00 thứ Hai'), d('Kênh gửi', 'Email'), d('Nhân viên', '18 người'), d('Chỉ số', '16 chỉ số'), d('Kỳ tiếp theo', '20/07/2026')] },
      { id: 'RPT-003', title: 'Lợi nhuận theo dịch vụ', subtitle: 'Doanh thu trừ vật tư và hoa hồng', cells: ['Tất cả dịch vụ', 'Tháng 07/2026', 'Owner', '16/07 · 14:00'], badge: 'Đang cập nhật', badgeTone: 'violet', details: [d('Dịch vụ', '48'), d('Doanh thu', '186,4 triệu'), d('Chi phí vật tư', '36,2 triệu'), d('Hoa hồng', '26,8 triệu'), d('Lợi nhuận gộp', '123,4 triệu'), d('Dữ liệu chốt', '15/07/2026')] },
      { id: 'RPT-004', title: 'Tồn kho & mức sử dụng', subtitle: 'Vòng quay, hết hạn, chênh lệch kiểm kê', cells: ['Kho Quận 1 & Quận 3', 'Tháng 07/2026', 'Owner · Quản lý kho', '16/07 · 12:00'], badge: 'Sẵn sàng', badgeTone: 'blue', details: [d('SKU', '642'), d('Giá trị tồn', '128,6 triệu'), d('Sắp hết', '18 SKU'), d('Sắp hết hạn', '9 lô'), d('Chênh lệch', '0,8%'), d('Vòng quay', '4,2 lần')] },
      { id: 'RPT-005', title: 'Hiệu quả chiến dịch Summer Chrome', subtitle: 'Nguồn, chuyển đổi và ROI', cells: ['Instagram · TikTok · Email', '20/07–31/08/2026', 'Marketing · Owner', 'Chưa có dữ liệu'], badge: 'Bản nháp', badgeTone: 'amber', details: [d('Ngân sách', '12 triệu'), d('Mục tiêu lịch', '180'), d('Mục tiêu doanh thu', '126 triệu'), d('Kênh', '3'), d('Bộ sưu tập', '12 mẫu'), d('Ngày bắt đầu', '20/07/2026')] }
    ],
    insightTitle: 'Điểm nổi bật tháng 7', insights: [
      { label: 'Tăng trưởng doanh thu', value: '+18,6%', detail: 'Dẫn đầu bởi Nail Art', tone: 'emerald' },
      { label: 'Giờ cao điểm', value: '15h–18h', detail: 'Công suất đạt 96%', tone: 'violet' },
      { label: 'Khách quay lại', value: '+4,8%', detail: 'Nhờ nhắc Gel 21 ngày', tone: 'blue' }
    ],
    checklistTitle: 'Báo cáo cần xem', checklist: ['Lợi nhuận 6 dịch vụ biên thấp', 'Công suất ghế Pedicure tuần 3', 'Chi phí vật tư tăng 8,2%', 'ROI chiến dịch khách quay lại'],
    formTitle: 'Tạo báo cáo tùy chỉnh', formFields: [
      { key: 'name', label: 'Tên báo cáo', type: 'text' }, { key: 'scope', label: 'Phạm vi', type: 'select', options: ['Toàn hệ thống', 'Chi nhánh Quận 3', 'Chi nhánh Quận 1'] },
      { key: 'module', label: 'Nhóm dữ liệu', type: 'select', options: ['Doanh thu', 'Lịch hẹn', 'Khách hàng', 'Nhân sự', 'Kho', 'Marketing'] },
      { key: 'from', label: 'Từ ngày', type: 'date' }, { key: 'to', label: 'Đến ngày', type: 'date' },
      { key: 'recipients', label: 'Người nhận và lịch gửi', type: 'textarea' }
    ]
  },
  settings: {
    id: 'settings', eyebrow: 'Cấu hình hệ thống', title: 'Cài đặt tiệm', description: 'Thiết lập thương hiệu, chi nhánh, giờ mở cửa, chính sách, thanh toán, phân quyền và tích hợp.', primaryAction: 'Lưu thay đổi', secondaryAction: 'Nhật ký cấu hình',
    stats: [
      { label: 'Chi nhánh', value: '2', detail: 'Quận 1 và Quận 3', tone: 'blue' },
      { label: 'Tài khoản quản trị', value: '6', detail: '1 Owner · 2 Manager · 3 Lễ tân', tone: 'violet' },
      { label: 'Tích hợp hoạt động', value: '8/9', detail: 'ZaloPay cần xác thực lại', tone: 'amber' },
      { label: 'Điểm bảo mật', value: '92/100', detail: 'MFA đã bật cho quản lý', tone: 'emerald' }
    ],
    tabs: ['Thông tin tiệm', 'Chi nhánh', 'Giờ hoạt động', 'Chính sách', 'Thanh toán', 'Thông báo', 'Phân quyền', 'Tích hợp'],
    columns: ['Hạng mục', 'Cấu hình hiện tại', 'Phạm vi', 'Cập nhật bởi', 'Cập nhật lúc', 'Trạng thái'],
    rows: [
      { id: 'SET-BRAND', title: 'Thương hiệu Nailé Studio', subtitle: 'Logo, tên hiển thị và thông tin liên hệ', cells: ['Nailé Studio · nailestudio.vn', 'Toàn hệ thống', 'Lê Hoàng Nam', '15/07 · 18:42'], badge: 'Hoàn chỉnh', badgeTone: 'emerald', details: [d('Tên pháp lý', 'Công ty TNHH Nailé'), d('Hotline', '1900 6828'), d('Email', 'hello@nailestudio.vn'), d('Website', 'nailestudio.vn'), d('Múi giờ', 'Asia/Ho_Chi_Minh'), d('Ngôn ngữ', 'Tiếng Việt')] },
      { id: 'SET-BOOKING', title: 'Chính sách đặt lịch', subtitle: 'Cọc, hủy, đổi lịch và khách không đến', cells: ['Cọc 30% · Hủy trước 12 giờ', 'Tất cả chi nhánh', 'Lê Hoàng Nam', '14/07 · 10:05'], badge: 'Đang áp dụng', badgeTone: 'emerald', details: [d('Cọc mặc định', '30%'), d('Hủy miễn phí', 'Trước 12 giờ'), d('Đổi lịch', 'Tối đa 2 lần'), d('Không đến', 'Mất tiền cọc'), d('Trễ trên 15 phút', 'Có thể rút ngắn dịch vụ'), d('Tự động xác nhận', 'Dịch vụ dưới 90 phút')] },
      { id: 'SET-PAYMENT', title: 'Phương thức thanh toán', subtitle: 'Tiền mặt, thẻ, chuyển khoản và ví điện tử', cells: ['6 phương thức', 'Toàn hệ thống', 'Lê Hoàng Nam', '12/07 · 16:20'], badge: '5/6 hoạt động', badgeTone: 'amber', details: [d('Tiền mặt', 'Hoạt động'), d('Chuyển khoản', 'Vietcombank **** 2868'), d('Thẻ', 'Stripe Terminal'), d('MoMo', 'Hoạt động'), d('ZaloPay', 'Cần xác thực lại'), d('Hoàn tiền', 'Cần Owner duyệt')] },
      { id: 'SET-NOTIFY', title: 'SMS, Zalo & email', subtitle: 'Mẫu tin, hạn mức và quy tắc gửi', cells: ['12 mẫu tự động', 'Toàn hệ thống', 'Khánh Vy', '10/07 · 09:12'], badge: 'Đang hoạt động', badgeTone: 'emerald', details: [d('Zalo OA', 'Đã xác thực'), d('SMS Brandname', 'NAILE STUDIO'), d('Email', 'hello@nailestudio.vn'), d('Hạn mức SMS', '2.000/tháng'), d('Đã dùng', '1.246'), d('Giờ yên lặng', '21:00–08:00')] },
      { id: 'SET-ACCESS', title: 'Vai trò & phân quyền', subtitle: 'Owner, Manager, Lễ tân, Kỹ thuật viên', cells: ['4 vai trò · 18 nhân viên', 'Theo chi nhánh', 'Lê Hoàng Nam', '08/07 · 14:30'], badge: 'MFA đã bật', badgeTone: 'emerald', details: [d('Owner', 'Toàn quyền'), d('Manager', 'Trừ cấu hình tài chính'), d('Lễ tân', 'Lịch, khách, POS'), d('Kỹ thuật viên', 'Lịch và hồ sơ được giao'), d('MFA', 'Bắt buộc Owner/Manager'), d('Phiên đăng nhập', '8 giờ')] }
    ],
    insightTitle: 'Trạng thái hệ thống', insights: [
      { label: 'Đồng bộ dữ liệu', value: 'Ổn định', detail: 'Lần cuối 14:32', tone: 'emerald' },
      { label: 'Sao lưu gần nhất', value: '02:00', detail: '16/07/2026 · Thành công', tone: 'blue' },
      { label: 'Cảnh báo tích hợp', value: '1', detail: 'ZaloPay cần xác thực', tone: 'amber' }
    ],
    checklistTitle: 'Khuyến nghị cấu hình', checklist: ['Xác thực lại ZaloPay', 'Cập nhật giờ lễ 02/09', 'Rà soát quyền của 2 nhân viên nghỉ', 'Tải xuống bản sao lưu tháng 7'],
    formTitle: 'Cập nhật cấu hình', formFields: [
      { key: 'section', label: 'Nhóm cấu hình', type: 'select', options: ['Thông tin tiệm', 'Chi nhánh', 'Chính sách đặt lịch', 'Thanh toán', 'Thông báo', 'Phân quyền'] },
      { key: 'name', label: 'Tên cấu hình', type: 'text' }, { key: 'value', label: 'Giá trị mới', type: 'text' },
      { key: 'scope', label: 'Phạm vi', type: 'select', options: ['Toàn hệ thống', 'Chi nhánh Quận 3', 'Chi nhánh Quận 1'] },
      { key: 'reason', label: 'Lý do thay đổi', type: 'textarea' }
    ]
  }
};
