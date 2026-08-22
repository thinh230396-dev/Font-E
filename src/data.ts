import { Tenant, SubscriptionPackage, SystemAlert, Invoice, BackupSnapshot, BackupPolicy, RestoreJob } from './types';

const initialTenant = (
  id: string,
  name: string,
  packageName: 'Basic' | 'Premium' | 'Enterprise',
  status: Tenant['status'],
  monthlyRevenue: number,
  adminName: string,
  adminEmail: string,
  address: string
): Tenant => ({
  id,
  name,
  adminEmail,
  packageName,
  status,
  monthlyRevenue,
  createdAt: '2026-01-15',
  address,
  phone: '0900000000',
  contactEmail: adminEmail,
  country: 'Vietnam',
  timezone: 'Asia/Ho_Chi_Minh',
  staffCount: packageName === 'Basic' ? 5 : packageName === 'Premium' ? 14 : 32,
  adminName,
  lastLogin: '15/07/2026 18:30',
  allowOnlineBooking: true,
  currency: 'VND',
  defaultLanguage: 'Vietnamese',
  billingCycle: packageName === 'Enterprise' ? 'yearly' : 'monthly',
  subscriptionPackageId: packageName === 'Basic' ? 'PKG-1' : packageName === 'Premium' ? 'PKG-2' : 'PKG-3',
  subscriptionPackageVersion: packageName === 'Basic' ? 2 : 4,
  subscriptionStartedAt: '2026-07-01',
  subscriptionRenewsAt: packageName === 'Enterprise' ? '2027-06-30' : '2026-07-31',
  planStartDate: '2026-07-01',
  adminStatus: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
  paymentStatus: status === 'OVERDUE' ? 'OVERDUE' : 'PAID'
});

export const INITIAL_TENANTS: Tenant[] = [
  initialTenant('TEN-AURORA', 'Aurora Beauty & Spa', 'Enterprise', 'ACTIVE', 128_000_000, 'Trần Minh Anh', 'admin@aurorabeauty.vn', '28 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh'),
  initialTenant('TEN-LUMIERE', 'Lumière Hair Studio', 'Premium', 'ACTIVE', 86_500_000, 'Nguyễn Văn Boss', 'tenantadmin@lumierehair.vn', '95 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh'),
  initialTenant('TEN-BLOOM', 'Bloom Salon', 'Premium', 'TRIAL', 52_400_000, 'Vũ Thu Hà', 'ha.vu@bloomsalon.vn', '12 Nguyễn Văn Trỗi, Phú Nhuận, TP. Hồ Chí Minh'),
  initialTenant('TEN-OASIS', 'Oasis Wellness', 'Premium', 'OVERDUE', 44_800_000, 'Trịnh Bảo Ngọc', 'ngoc.trinh@oasiswellness.vn', '181 Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh'),
  initialTenant('TEN-MUSE', 'Muse Nail Lab', 'Basic', 'ACTIVE', 31_200_000, 'Đỗ Khánh Linh', 'linh.do@musenail.vn', '43 Lê Văn Sỹ, Quận 3, TP. Hồ Chí Minh'),
  initialTenant('TEN-MORNING', 'Morning Dew Spa', 'Basic', 'SUSPENDED', 18_600_000, 'Hoàng Ngọc Uyên', 'uyen.hoang@morningdew.vn', '57 Phan Xích Long, Phú Nhuận, TP. Hồ Chí Minh'),
  initialTenant('TEN-SORA', 'Sora Japanese Salon', 'Premium', 'EXPIRING', 73_900_000, 'Ngô Minh Quang', 'quang.ngo@sorasalon.vn', '8 Thái Văn Lung, Quận 1, TP. Hồ Chí Minh'),
  initialTenant('TEN-IVORY', 'Ivory Skin Clinic', 'Enterprise', 'ACTIVE', 119_500_000, 'Phạm Thanh Tú', 'tu.pham@ivoryskin.vn', '66 Đồng Khởi, Quận 1, TP. Hồ Chí Minh')
];

export const INITIAL_PACKAGES: SubscriptionPackage[] = [
  {
    id: 'PKG-1',
    name: 'Basic',
    price: 49,
    currency: 'USD',
    billingCycle: 'monthly',
    activeTenants: 0,
    features: [
      'Quản lý lịch hẹn cơ bản',
      'Tối đa 5 nhân viên',
      'Báo cáo doanh thu ngày',
      'Hỗ trợ qua Email',
      'Trang đặt lịch tự động'
    ],
    maxStaff: 5,
    maxSalons: 1,
    color: '#7c3aed' // purple
  },
  {
    id: 'PKG-2',
    name: 'Premium',
    price: 99,
    currency: 'USD',
    billingCycle: 'monthly',
    activeTenants: 0,
    features: [
      'Quản lý lịch hẹn nâng cao',
      'Không giới hạn nhân viên',
      'Báo cáo phân tích chuyên sâu',
      'Hỗ trợ 24/7 qua chat & phone',
      'Hệ thống Loyalty & Khách hàng thân thiết',
      'Tự động gửi SMS & Email nhắc lịch',
      'API tích hợp website riêng'
    ],
    maxStaff: 999,
    maxSalons: 3,
    color: '#10b981' // emerald
  },
  {
    id: 'PKG-3',
    name: 'Enterprise',
    price: 249,
    currency: 'USD',
    billingCycle: 'monthly',
    activeTenants: 0,
    features: [
      'Toàn bộ tính năng gói Premium',
      'Quản lý chuỗi nhiều cửa hàng',
      'Domain riêng (Custom Domain)',
      'Hệ thống kế toán & kho hàng chuyên nghiệp',
      'Dedicated Account Manager',
      'Bảo mật nâng cao & SSO',
      'SLA cam kết 99.9%'
    ],
    maxStaff: 9999,
    maxSalons: 99,
    color: '#f59e0b' // amber
  }
];

const alertMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

export const INITIAL_ALERTS: SystemAlert[] = [
  { id: 'DEMO-ALT-020', title: 'Thanh toán cần đối soát', description: 'Giao dịch MoMo của Lumière Hair Studio đã thành công nhưng hóa đơn chưa cập nhật.', type: 'error', createdAt: alertMinutesAgo(2), isRead: false, targetTenantId: 'TEN-LUMIERE' },
  { id: 'DEMO-ALT-019', title: 'Phát hiện đăng nhập bất thường', description: 'Có phiên đăng nhập Superadmin từ thiết bị mới tại Hà Nội.', type: 'warning', createdAt: alertMinutesAgo(8), isRead: false },
  { id: 'DEMO-ALT-018', title: 'Sao lưu dữ liệu hoàn tất', description: 'Bản sao lưu toàn hệ thống lúc 03:00 đã hoàn tất và được xác minh.', type: 'info', createdAt: alertMinutesAgo(18), isRead: false },
  { id: 'DEMO-ALT-017', title: 'Hóa đơn đã quá hạn', description: 'Aurora Beauty & Spa có một hóa đơn quá hạn 3 ngày cần xử lý.', type: 'error', createdAt: alertMinutesAgo(27), isRead: false, targetTenantId: 'TEN-AURORA' },
  { id: 'DEMO-ALT-016', title: 'Gói dịch vụ sắp hết hạn', description: 'Gói Premium của Mint Nail Studio sẽ hết hạn sau 7 ngày.', type: 'warning', createdAt: alertMinutesAgo(42), isRead: false, targetTenantId: 'TEN-MINT' },
  { id: 'DEMO-ALT-015', title: 'Cập nhật hệ thống thành công', description: 'SalonSys Admin đã được cập nhật lên phiên bản mới nhất.', type: 'info', createdAt: alertMinutesAgo(60), isRead: false },
  { id: 'DEMO-ALT-014', title: 'Không thể gửi email', description: 'Máy chủ SMTP từ chối 3 email nhắc thanh toán gần nhất.', type: 'error', createdAt: alertMinutesAgo(76), isRead: false },
  { id: 'DEMO-ALT-013', title: 'Dung lượng lưu trữ đạt 80%', description: 'Kho tài sản của Rose Beauty đang gần đạt giới hạn gói hiện tại.', type: 'warning', createdAt: alertMinutesAgo(120), isRead: false, targetTenantId: 'TEN-ROSE' },
  { id: 'DEMO-ALT-012', title: 'Tenant mới đã kích hoạt', description: 'Nắng Spa đã hoàn tất xác minh và bắt đầu thời gian dùng thử.', type: 'info', createdAt: alertMinutesAgo(180), isRead: false, targetTenantId: 'TEN-NANG' },
  { id: 'DEMO-ALT-011', title: 'Webhook thanh toán bị trễ', description: 'Thời gian phản hồi từ cổng VNPay vượt quá ngưỡng 10 giây.', type: 'warning', createdAt: alertMinutesAgo(240), isRead: false },
  { id: 'DEMO-ALT-010', title: 'Khôi phục dữ liệu thất bại', description: 'Tác vụ khôi phục môi trường DR dừng ở bước xác minh quyền truy cập.', type: 'error', createdAt: alertMinutesAgo(300), isRead: false },
  { id: 'DEMO-ALT-009', title: 'Đã tạo báo cáo doanh thu', description: 'Báo cáo doanh thu toàn hệ thống tháng 07/2026 đã sẵn sàng.', type: 'info', createdAt: alertMinutesAgo(360), isRead: false },
  { id: 'DEMO-ALT-008', title: 'Yêu cầu hỗ trợ ưu tiên cao', description: 'Ticket DEMO-SPT-002 còn 57 phút trước khi vi phạm SLA.', type: 'warning', createdAt: alertMinutesAgo(420), isRead: false },
  { id: 'DEMO-ALT-007', title: 'Đổi mật khẩu thành công', description: 'Mật khẩu Superadmin đã được thay đổi và các phiên cũ đã đăng xuất.', type: 'info', createdAt: alertMinutesAgo(1080), isRead: true },
  { id: 'DEMO-ALT-006', title: 'Đồng bộ hóa đơn hoàn tất', description: '12 hóa đơn từ cổng thanh toán đã được đối soát thành công.', type: 'info', createdAt: alertMinutesAgo(1200), isRead: true },
  { id: 'DEMO-ALT-005', title: 'Tài khoản Tenant Admin bị khóa', description: 'Tài khoản bị khóa tạm thời sau 5 lần đăng nhập không thành công.', type: 'warning', createdAt: alertMinutesAgo(1320), isRead: true, targetTenantId: 'TEN-MINT' },
  { id: 'DEMO-ALT-004', title: 'Chính sách bảo mật đã cập nhật', description: 'Thời gian hết hạn phiên đăng nhập được thay đổi thành 30 phút.', type: 'info', createdAt: alertMinutesAgo(1500), isRead: true },
  { id: 'DEMO-ALT-003', title: 'Kiểm tra SMTP thành công', description: 'Kết nối máy chủ email và thông tin xác thực đang hoạt động bình thường.', type: 'info', createdAt: alertMinutesAgo(1740), isRead: true },
  { id: 'DEMO-ALT-002', title: 'Tác vụ sao lưu được lên lịch', description: 'Bản sao lưu toàn hệ thống tiếp theo sẽ chạy lúc 03:00.', type: 'info', createdAt: alertMinutesAgo(1880), isRead: true },
  { id: 'DEMO-ALT-001', title: 'Đã giải quyết cảnh báo SLA', description: 'Yêu cầu hỗ trợ DEMO-SPT-001 đã được phản hồi trong thời hạn.', type: 'info', createdAt: alertMinutesAgo(2880), isRead: true }
];
const invoiceDateFromNow = (days: number, hours = 0) => new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000).toISOString();

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-1072', invoiceCode: 'SS-INV-2026-1072', tenantId: 'TEN-AURORA', tenantName: 'Aurora Beauty & Spa',
    type: 'RENEWAL', planName: 'Enterprise', packageId: 'PKG-3', packageVersion: 4, billingCycle: 'yearly',
    servicePeriod: '01/07/2026 – 30/06/2027', billingPeriod: 'Năm dịch vụ 2026–2027',
    createdAt: invoiceDateFromNow(-2), updatedAt: invoiceDateFromNow(-1, -18), dueDate: invoiceDateFromNow(5), paidAt: invoiceDateFromNow(-1, -18),
    subtotal: 74700000, discountAmount: 7470000, taxAmount: 6723000, amount: 73953000, currency: 'VND', status: 'PAID',
    billingEmail: 'billing@aurorabeauty.vn', billingCompany: 'Công ty TNHH Aurora Beauty', billingAddress: '28 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', taxCode: '0318459201',
    paymentMethod: 'Chuyển khoản ngân hàng', paymentGateway: 'BANK_TRANSFER', transactionCode: 'VCB260715084521', processingFee: 0, netReceived: 73953000,
    reconciliationStatus: 'MATCHED', reconciledAt: invoiceDateFromNow(-1, -17), reconciledBy: 'finance@salonsys.vn', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'billing-scheduler@system',
    note: 'Gia hạn Enterprise năm; chiết khấu 10% theo hợp đồng.',
    lineItems: [{ id: 'LI-1072-1', description: 'Gói Enterprise · 12 tháng', quantity: 1, unitPrice: 74700000, amount: 74700000, taxRate: 10 }],
    paymentAttempts: [{ id: 'PAY-1072-1', attemptedAt: invoiceDateFromNow(-1, -18), status: 'SUCCESS', gateway: 'BANK_TRANSFER', amount: 73953000, transactionCode: 'VCB260715084521' }],
    activities: [
      { id: 'ACT-1072-1', action: 'Phát hành hóa đơn', description: 'Hóa đơn gia hạn Enterprise năm được phát hành tự động.', actor: 'Hệ thống Billing', createdAt: invoiceDateFromNow(-2) },
      { id: 'ACT-1072-2', action: 'Ghi nhận thanh toán', description: 'Đã nhận chuyển khoản và khớp mã giao dịch VCB260715084521.', actor: 'finance@salonsys.vn', createdAt: invoiceDateFromNow(-1, -18) },
      { id: 'ACT-1072-3', action: 'Đối soát thành công', description: 'Số tiền thực nhận khớp 100% với giá trị hóa đơn.', actor: 'finance@salonsys.vn', createdAt: invoiceDateFromNow(-1, -17) }
    ]
  },
  {
    id: 'INV-2026-1071', invoiceCode: 'SS-INV-2026-1071', tenantId: 'TEN-LUMIERE', tenantName: 'Lumière Hair Studio',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Premium', packageId: 'PKG-2', packageVersion: 4, billingCycle: 'monthly',
    servicePeriod: '01/07/2026 – 31/07/2026', billingPeriod: 'Tháng 07/2026', createdAt: invoiceDateFromNow(-3), updatedAt: invoiceDateFromNow(-2), dueDate: invoiceDateFromNow(2), paidAt: invoiceDateFromNow(-2),
    subtotal: 2475000, discountAmount: 0, taxAmount: 0, amount: 2475000, currency: 'VND', status: 'PAID', billingEmail: 'nam.le@lumierehair.vn', billingCompany: 'Lumière Hair Studio', billingAddress: '95 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
    paymentMethod: 'Ví MoMo', paymentGateway: 'MOMO', transactionCode: 'MOMO260714221004', processingFee: 24750, netReceived: 2450250,
    reconciliationStatus: 'MATCHED', reconciledAt: invoiceDateFromNow(-2, 1), reconciledBy: 'reconciliation-bot@system', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'billing-scheduler@system',
    lineItems: [{ id: 'LI-1071-1', description: 'Gói Premium · Tháng 07/2026', quantity: 1, unitPrice: 2475000, amount: 2475000, taxRate: 0 }],
    paymentAttempts: [
      { id: 'PAY-1071-1', attemptedAt: invoiceDateFromNow(-2, -1), status: 'FAILED', gateway: 'MOMO', amount: 2475000, failureReason: 'Webhook timeout; giao dịch chưa được xác nhận.' },
      { id: 'PAY-1071-2', attemptedAt: invoiceDateFromNow(-2), status: 'SUCCESS', gateway: 'MOMO', amount: 2475000, transactionCode: 'MOMO260714221004' }
    ],
    activities: [
      { id: 'ACT-1071-1', action: 'Phát hành hóa đơn', description: 'Hóa đơn thuê bao tháng được phát hành.', actor: 'Hệ thống Billing', createdAt: invoiceDateFromNow(-3) },
      { id: 'ACT-1071-2', action: 'Thanh toán thành công', description: 'MoMo xác nhận giao dịch thành công sau lần webhook thứ hai.', actor: 'MoMo Gateway', createdAt: invoiceDateFromNow(-2) }
    ]
  },
  {
    id: 'INV-2026-1070', invoiceCode: 'SS-INV-2026-1070', tenantId: 'TEN-BLOOM', tenantName: 'Bloom Salon',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Premium', packageId: 'PKG-2', packageVersion: 4, billingCycle: 'monthly', servicePeriod: '01/07/2026 – 31/07/2026', billingPeriod: 'Tháng 07/2026',
    createdAt: invoiceDateFromNow(-2), updatedAt: invoiceDateFromNow(-2), dueDate: invoiceDateFromNow(4), subtotal: 2475000, discountAmount: 0, taxAmount: 0, amount: 2475000, currency: 'VND', status: 'PENDING',
    billingEmail: 'ha.vu@bloomsalon.vn', billingCompany: 'Bloom Salon', billingAddress: '12 Nguyễn Văn Trỗi, Phú Nhuận, TP. Hồ Chí Minh', paymentMethod: 'Chuyển khoản ngân hàng', paymentGateway: 'BANK_TRANSFER',
    reconciliationStatus: 'PENDING', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'billing-scheduler@system',
    lineItems: [{ id: 'LI-1070-1', description: 'Gói Premium · Tháng 07/2026', quantity: 1, unitPrice: 2475000, amount: 2475000, taxRate: 0 }], paymentAttempts: [],
    activities: [{ id: 'ACT-1070-1', action: 'Phát hành hóa đơn', description: 'Hóa đơn đang trong thời hạn thanh toán.', actor: 'Hệ thống Billing', createdAt: invoiceDateFromNow(-2) }]
  },
  {
    id: 'INV-2026-1069', invoiceCode: 'SS-INV-2026-1069', tenantId: 'TEN-OASIS', tenantName: 'Oasis Wellness',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Premium', packageId: 'PKG-2', packageVersion: 4, billingCycle: 'monthly', servicePeriod: '01/06/2026 – 30/06/2026', billingPeriod: 'Tháng 06/2026',
    createdAt: invoiceDateFromNow(-23), updatedAt: invoiceDateFromNow(-1), dueDate: invoiceDateFromNow(-8), gracePeriodEnd: invoiceDateFromNow(-1), subtotal: 2475000, discountAmount: 0, taxAmount: 0, amount: 2475000, currency: 'VND', status: 'OVERDUE',
    billingEmail: 'ngoc.trinh@oasiswellness.vn', billingCompany: 'Oasis Wellness', billingAddress: '181 Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh', paymentMethod: 'Thẻ quốc tế', paymentGateway: 'STRIPE',
    reconciliationStatus: 'PENDING', collectionStage: 'REMINDER_2', reminderCount: 2, lastReminderAt: invoiceDateFromNow(-1), refundStatus: 'NONE', issuedBy: 'billing-scheduler@system',
    note: 'Thẻ thanh toán hết hạn; tenant đã được gia hạn ân hạn 7 ngày.',
    lineItems: [{ id: 'LI-1069-1', description: 'Gói Premium · Tháng 06/2026', quantity: 1, unitPrice: 2475000, amount: 2475000, taxRate: 0 }],
    paymentAttempts: [
      { id: 'PAY-1069-1', attemptedAt: invoiceDateFromNow(-8), status: 'FAILED', gateway: 'STRIPE', amount: 2475000, failureReason: 'card_expired' },
      { id: 'PAY-1069-2', attemptedAt: invoiceDateFromNow(-4), status: 'FAILED', gateway: 'STRIPE', amount: 2475000, failureReason: 'card_expired' }
    ],
    activities: [
      { id: 'ACT-1069-1', action: 'Phát hành hóa đơn', description: 'Hóa đơn tháng 06/2026 được phát hành.', actor: 'Hệ thống Billing', createdAt: invoiceDateFromNow(-23) },
      { id: 'ACT-1069-2', action: 'Thanh toán thất bại', description: 'Stripe từ chối do thẻ hết hạn.', actor: 'Stripe Gateway', createdAt: invoiceDateFromNow(-8) },
      { id: 'ACT-1069-3', action: 'Gửi nhắc nợ lần 2', description: 'Đã gửi email và thông báo trong ứng dụng.', actor: 'collection-bot@system', createdAt: invoiceDateFromNow(-1) }
    ]
  },
  {
    id: 'INV-2026-1068', invoiceCode: 'SS-INV-2026-1068', tenantId: 'TEN-MUSE', tenantName: 'Muse Nail Lab',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Basic', packageId: 'PKG-1', packageVersion: 2, billingCycle: 'monthly', servicePeriod: '01/07/2026 – 31/07/2026', billingPeriod: 'Tháng 07/2026',
    createdAt: invoiceDateFromNow(-6), updatedAt: invoiceDateFromNow(-5), dueDate: invoiceDateFromNow(1), paidAt: invoiceDateFromNow(-5), subtotal: 1225000, discountAmount: 0, taxAmount: 0, amount: 1225000, currency: 'VND', status: 'PAID',
    billingEmail: 'linh.do@musenail.vn', billingCompany: 'Muse Nail Lab', billingAddress: '43 Lê Văn Sỹ, Quận 3, TP. Hồ Chí Minh', paymentMethod: 'VNPay QR', paymentGateway: 'VNPAY', transactionCode: 'VNP260711194230', processingFee: 12250, netReceived: 1212750,
    reconciliationStatus: 'MISMATCHED', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'billing-scheduler@system', note: 'Đang chờ đối chiếu phí cổng thanh toán chênh lệch 1.250đ.',
    lineItems: [{ id: 'LI-1068-1', description: 'Gói Basic · Tháng 07/2026', quantity: 1, unitPrice: 1225000, amount: 1225000, taxRate: 0 }],
    paymentAttempts: [{ id: 'PAY-1068-1', attemptedAt: invoiceDateFromNow(-5), status: 'SUCCESS', gateway: 'VNPAY', amount: 1225000, transactionCode: 'VNP260711194230' }],
    activities: [
      { id: 'ACT-1068-1', action: 'Phát hành hóa đơn', description: 'Hóa đơn tháng được phát hành.', actor: 'Hệ thống Billing', createdAt: invoiceDateFromNow(-6) },
      { id: 'ACT-1068-2', action: 'Phát hiện chênh lệch', description: 'Phí thực tế lệch 1.250đ so với biểu phí cấu hình.', actor: 'reconciliation-bot@system', createdAt: invoiceDateFromNow(-5, 1) }
    ]
  },
  {
    id: 'INV-2026-1067', invoiceCode: 'SS-INV-2026-1067', tenantId: 'TEN-MORNING', tenantName: 'Morning Dew Spa',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Basic', packageId: 'PKG-1', packageVersion: 2, billingCycle: 'monthly', servicePeriod: '01/05/2026 – 31/05/2026', billingPeriod: 'Tháng 05/2026',
    createdAt: invoiceDateFromNow(-50), updatedAt: invoiceDateFromNow(-2), dueDate: invoiceDateFromNow(-35), gracePeriodEnd: invoiceDateFromNow(-28), subtotal: 1225000, discountAmount: 0, taxAmount: 0, amount: 1225000, currency: 'VND', status: 'OVERDUE',
    billingEmail: 'uyen.hoang@morningdew.vn', billingCompany: 'Morning Dew Spa', billingAddress: '57 Phan Xích Long, Phú Nhuận, TP. Hồ Chí Minh', paymentMethod: 'Chuyển khoản ngân hàng', paymentGateway: 'BANK_TRANSFER', reconciliationStatus: 'PENDING',
    collectionStage: 'SUSPENSION_REVIEW', reminderCount: 3, lastReminderAt: invoiceDateFromNow(-2), refundStatus: 'NONE', issuedBy: 'billing-scheduler@system', note: 'Đã vượt thời gian ân hạn; chờ Superadmin xem xét tạm ngưng tenant.',
    lineItems: [{ id: 'LI-1067-1', description: 'Gói Basic · Tháng 05/2026', quantity: 1, unitPrice: 1225000, amount: 1225000, taxRate: 0 }], paymentAttempts: [],
    activities: [
      { id: 'ACT-1067-1', action: 'Phát hành hóa đơn', description: 'Hóa đơn tháng 05/2026 được phát hành.', actor: 'Hệ thống Billing', createdAt: invoiceDateFromNow(-50) },
      { id: 'ACT-1067-2', action: 'Thông báo cuối cùng', description: 'Đã gửi thông báo cuối trước khi xem xét tạm ngưng.', actor: 'collection-bot@system', createdAt: invoiceDateFromNow(-2) }
    ]
  },
  {
    id: 'INV-2026-1066', invoiceCode: 'SS-INV-2026-1066', tenantId: 'TEN-SORA', tenantName: 'Sora Japanese Salon',
    type: 'PLAN_CHANGE', planName: 'Enterprise', packageId: 'PKG-3', packageVersion: 4, billingCycle: 'monthly', servicePeriod: 'Điều chỉnh giữa chu kỳ 10/07/2026 – 31/07/2026', billingPeriod: 'Điều chỉnh gói tháng 07/2026',
    createdAt: invoiceDateFromNow(-7), updatedAt: invoiceDateFromNow(-6), dueDate: invoiceDateFromNow(-1), subtotal: 3750000, discountAmount: 0, taxAmount: 0, amount: 3750000, currency: 'VND', status: 'CANCELLED',
    billingEmail: 'quang.ngo@sorasalon.vn', billingCompany: 'Sora Japanese Salon', billingAddress: '8 Thái Văn Lung, Quận 1, TP. Hồ Chí Minh', paymentGateway: 'MANUAL', reconciliationStatus: 'NOT_REQUIRED', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'superadmin@salonsys.vn',
    note: 'Hủy do tenant chọn giữ gói Premium đến hết chu kỳ.',
    lineItems: [{ id: 'LI-1066-1', description: 'Phần chênh lệch nâng Premium → Enterprise', quantity: 1, unitPrice: 3750000, amount: 3750000, taxRate: 0 }], paymentAttempts: [],
    activities: [
      { id: 'ACT-1066-1', action: 'Tạo hóa đơn đổi gói', description: 'Superadmin tạo hóa đơn điều chỉnh giữa chu kỳ.', actor: 'superadmin@salonsys.vn', createdAt: invoiceDateFromNow(-7) },
      { id: 'ACT-1066-2', action: 'Hủy hóa đơn', description: 'Tenant chọn tiếp tục gói Premium đến cuối kỳ.', actor: 'superadmin@salonsys.vn', createdAt: invoiceDateFromNow(-6) }
    ]
  },
  {
    id: 'INV-2026-1065', invoiceCode: 'SS-INV-2026-1065', tenantId: 'TEN-IVORY', tenantName: 'Ivory Skin Clinic',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Enterprise', packageId: 'PKG-3', packageVersion: 4, billingCycle: 'monthly', servicePeriod: '01/07/2026 – 31/07/2026', billingPeriod: 'Tháng 07/2026',
    createdAt: invoiceDateFromNow(-9), updatedAt: invoiceDateFromNow(-8), dueDate: invoiceDateFromNow(-2), paidAt: invoiceDateFromNow(-8), subtotal: 249, discountAmount: 0, taxAmount: 0, amount: 249, currency: 'USD', status: 'PAID',
    billingEmail: 'my.bui@ivoryskin.vn', billingCompany: 'Ivory Skin Clinic JSC', billingAddress: '102 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', taxCode: '0109821456', paymentMethod: 'Visa •••• 8842', paymentGateway: 'STRIPE', transactionCode: 'pi_3QxA8Ivory', processingFee: 7.47, netReceived: 241.53,
    reconciliationStatus: 'MATCHED', reconciledAt: invoiceDateFromNow(-8, 1), reconciledBy: 'reconciliation-bot@system', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'billing-scheduler@system',
    lineItems: [{ id: 'LI-1065-1', description: 'Enterprise Subscription · July 2026', quantity: 1, unitPrice: 249, amount: 249, taxRate: 0 }],
    paymentAttempts: [{ id: 'PAY-1065-1', attemptedAt: invoiceDateFromNow(-8), status: 'SUCCESS', gateway: 'STRIPE', amount: 249, transactionCode: 'pi_3QxA8Ivory' }],
    activities: [{ id: 'ACT-1065-1', action: 'Thanh toán thành công', description: 'Stripe đã xác nhận thẻ Visa.', actor: 'Stripe Gateway', createdAt: invoiceDateFromNow(-8) }]
  },
  {
    id: 'INV-2026-1064', invoiceCode: 'SS-INV-2026-1064', tenantId: 'TEN-SORA', tenantName: 'Sora Japanese Salon',
    type: 'MONTHLY_SUBSCRIPTION', planName: 'Premium', packageId: 'PKG-2', packageVersion: 4, billingCycle: 'monthly', servicePeriod: '01/08/2026 – 31/08/2026', billingPeriod: 'Tháng 08/2026',
    createdAt: invoiceDateFromNow(-1), updatedAt: invoiceDateFromNow(-1), dueDate: invoiceDateFromNow(12), subtotal: 2475000, discountAmount: 247500, taxAmount: 0, amount: 2227500, currency: 'VND', status: 'PENDING',
    billingEmail: 'quang.ngo@sorasalon.vn', billingCompany: 'Sora Japanese Salon', billingAddress: '8 Thái Văn Lung, Quận 1, TP. Hồ Chí Minh', paymentMethod: 'Chuyển khoản ngân hàng', paymentGateway: 'BANK_TRANSFER', reconciliationStatus: 'PENDING', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'NONE', issuedBy: 'superadmin@salonsys.vn', note: 'Áp dụng ưu đãi gia hạn sớm 10%.',
    lineItems: [{ id: 'LI-1064-1', description: 'Gói Premium · Tháng 08/2026', quantity: 1, unitPrice: 2475000, amount: 2475000, taxRate: 0 }], paymentAttempts: [],
    activities: [{ id: 'ACT-1064-1', action: 'Phát hành sớm', description: 'Hóa đơn tháng 08 được phát hành theo yêu cầu tenant.', actor: 'superadmin@salonsys.vn', createdAt: invoiceDateFromNow(-1) }]
  },
  {
    id: 'INV-2026-1063', invoiceCode: 'SS-INV-2026-1063', tenantId: 'TEN-LUMIERE', tenantName: 'Lumière Hair Studio',
    type: 'MANUAL_ADJUSTMENT', planName: 'Premium', packageId: 'PKG-2', packageVersion: 4, billingCycle: 'monthly', servicePeriod: 'Phí bổ sung SMS tháng 06/2026', billingPeriod: 'Điều chỉnh tháng 06/2026',
    createdAt: invoiceDateFromNow(-18), updatedAt: invoiceDateFromNow(-3), dueDate: invoiceDateFromNow(-12), paidAt: invoiceDateFromNow(-16), subtotal: 2475000, discountAmount: 0, taxAmount: 0, amount: 2475000, currency: 'VND', status: 'PAID',
    billingEmail: 'nam.le@lumierehair.vn', billingCompany: 'Lumière Hair Studio', billingAddress: '95 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh', paymentMethod: 'Ví MoMo', paymentGateway: 'MOMO', transactionCode: 'MOMO260630154510', processingFee: 24750, netReceived: 1950250,
    reconciliationStatus: 'MATCHED', reconciledAt: invoiceDateFromNow(-16), reconciledBy: 'reconciliation-bot@system', collectionStage: 'NONE', reminderCount: 0, refundStatus: 'PARTIAL', refundedAmount: 500000, refundedAt: invoiceDateFromNow(-3), refundReason: 'Hoàn phần SMS gửi lỗi trong sự cố nhà mạng.', issuedBy: 'superadmin@salonsys.vn',
    lineItems: [{ id: 'LI-1063-1', description: 'Gói bổ sung 5.000 SMS Brandname', quantity: 1, unitPrice: 2475000, amount: 2475000, taxRate: 0 }],
    paymentAttempts: [{ id: 'PAY-1063-1', attemptedAt: invoiceDateFromNow(-16), status: 'SUCCESS', gateway: 'MOMO', amount: 2475000, transactionCode: 'MOMO260630154510' }],
    activities: [
      { id: 'ACT-1063-1', action: 'Thanh toán thành công', description: 'Đã nhận thanh toán qua MoMo.', actor: 'MoMo Gateway', createdAt: invoiceDateFromNow(-16) },
      { id: 'ACT-1063-2', action: 'Hoàn tiền một phần', description: 'Hoàn 500.000đ do sự cố SMS nhà mạng.', actor: 'superadmin@salonsys.vn', createdAt: invoiceDateFromNow(-3) }
    ]
  }
];
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const fullBackupComponents = (databaseRecords: number, databaseSize: string, objectSize: string) => [
  { key: 'DATABASE' as const, label: 'Cơ sở dữ liệu PostgreSQL', status: 'INCLUDED' as const, records: databaseRecords, size: databaseSize },
  { key: 'OBJECT_STORAGE' as const, label: 'Tệp tenant & tài sản', status: 'INCLUDED' as const, records: 12847, size: objectSize },
  { key: 'SYSTEM_SETTINGS' as const, label: 'Cấu hình hệ thống', status: 'INCLUDED' as const, records: 48, size: '1.8 MB' },
  { key: 'AUDIT_LOGS' as const, label: 'Nhật ký kiểm toán', status: 'INCLUDED' as const, records: 286941, size: '34.2 MB' }
];

export const INITIAL_BACKUPS: BackupSnapshot[] = [
  {
    id: 'BKP-20260716-0300', filename: 'salonsys_full_20260716_030000.zst', size: '482.6 MB', sizeBytes: 506042778,
    createdAt: minutesAgo(351), completedAt: minutesAgo(339), status: 'SUCCESS', type: 'AUTO', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3',
    checksum: 'sha256:4e3c1f8a728dcd49b33f5d4c18c591c7622bd01a9a4f56f13bc9b72c98ce13ad', integrityStatus: 'VERIFIED', verifiedAt: minutesAgo(322), durationSeconds: 724,
    initiatedBy: 'backup-scheduler@system', retentionClass: 'DAILY', expiresAt: daysFromNow(7), immutableUntil: daysFromNow(7),
    note: 'Snapshot tự động hằng ngày; đã sao chép sang vùng dự phòng.', components: fullBackupComponents(1842950, '318.7 MB', '128.0 MB')
  },
  {
    id: 'BKP-20260715-0300', filename: 'salonsys_full_20260715_030000.zst', size: '479.8 MB', sizeBytes: 503106765,
    createdAt: minutesAgo(1791), completedAt: minutesAgo(1779), status: 'SUCCESS', type: 'AUTO', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3',
    checksum: 'sha256:9842bcf4e4de97e76fe2a73393a267285c53a54fdd12ed1b06caf824754af912', integrityStatus: 'VERIFIED', verifiedAt: minutesAgo(1761), durationSeconds: 706,
    initiatedBy: 'backup-scheduler@system', retentionClass: 'WEEKLY', expiresAt: daysFromNow(28), immutableUntil: daysFromNow(14),
    note: 'Điểm khôi phục tuần; giữ lại theo chính sách 4 tuần.', components: fullBackupComponents(1831084, '316.4 MB', '127.4 MB')
  },
  {
    id: 'BKP-20260714-1642', filename: 'salonsys_manual_20260714_164200.zst', size: '478.9 MB', sizeBytes: 502163046,
    createdAt: minutesAgo(2410), completedAt: minutesAgo(2398), status: 'SUCCESS', type: 'MANUAL', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3',
    checksum: 'sha256:3f62b63af66463b0890326cda4e81e137f1b2f75d25017dadcd721c84a301b6d', integrityStatus: 'VERIFIED', verifiedAt: minutesAgo(2379), durationSeconds: 692,
    initiatedBy: 'superadmin@salonsys.vn', retentionClass: 'MANUAL', expiresAt: daysFromNow(90), immutableUntil: daysFromNow(30),
    note: 'Tạo trước khi triển khai phiên bản billing 2.8.0.', components: fullBackupComponents(1828760, '315.8 MB', '127.1 MB')
  },
  {
    id: 'BKP-20260714-0300', filename: 'salonsys_full_20260714_030000.zst', size: '476.3 MB', sizeBytes: 499437568,
    createdAt: minutesAgo(3231), completedAt: minutesAgo(3220), status: 'SUCCESS', type: 'AUTO', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3',
    checksum: 'sha256:3fc7120b8dab21c3d9323d54f5218fd62d231ea624178de9361653ceae2dd439', integrityStatus: 'VERIFIED', verifiedAt: minutesAgo(3201), durationSeconds: 681,
    initiatedBy: 'backup-scheduler@system', retentionClass: 'DAILY', expiresAt: daysFromNow(5), immutableUntil: daysFromNow(5),
    note: 'Snapshot tự động hằng ngày.', components: fullBackupComponents(1819042, '314.2 MB', '126.1 MB')
  },
  {
    id: 'BKP-20260713-0300', filename: 'salonsys_full_20260713_030000.zst', size: '0 B', sizeBytes: 0,
    createdAt: minutesAgo(4671), completedAt: minutesAgo(4669), status: 'FAILED', type: 'AUTO', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3', checksum: '—', integrityStatus: 'FAILED', durationSeconds: 128,
    initiatedBy: 'backup-scheduler@system', retentionClass: 'DAILY', expiresAt: daysFromNow(4),
    failureReason: 'Object Storage trả về HTTP 503 trong giai đoạn tạo manifest; không có snapshot không hoàn chỉnh nào được lưu.',
    note: 'Hệ thống tự động chạy lại thành công sau 45 phút.', components: [
      { key: 'DATABASE', label: 'Cơ sở dữ liệu PostgreSQL', status: 'INCLUDED', records: 1811048, size: '312.9 MB' },
      { key: 'OBJECT_STORAGE', label: 'Tệp tenant & tài sản', status: 'FAILED', size: '0 B' },
      { key: 'SYSTEM_SETTINGS', label: 'Cấu hình hệ thống', status: 'SKIPPED', size: '0 B' },
      { key: 'AUDIT_LOGS', label: 'Nhật ký kiểm toán', status: 'SKIPPED', size: '0 B' }
    ]
  },
  {
    id: 'BKP-20260713-0345', filename: 'salonsys_full_20260713_034500_retry.zst', size: '474.1 MB', sizeBytes: 497130701,
    createdAt: minutesAgo(4626), completedAt: minutesAgo(4615), status: 'SUCCESS', type: 'AUTO', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3',
    checksum: 'sha256:a11b0e847a5c9ff460ab67467931e5f348b29b7d619cf5b2e6642b2a5f64c59e', integrityStatus: 'VERIFIED', verifiedAt: minutesAgo(4598), durationSeconds: 671,
    initiatedBy: 'backup-retry@system', retentionClass: 'DAILY', expiresAt: daysFromNow(4), immutableUntil: daysFromNow(4),
    note: 'Lần chạy lại tự động sau sự cố Object Storage.', components: fullBackupComponents(1811051, '312.9 MB', '125.2 MB')
  },
  {
    id: 'BKP-20260701-0300', filename: 'salonsys_full_20260701_030000.zst', size: '451.7 MB', sizeBytes: 473641779,
    createdAt: minutesAgo(21951), completedAt: minutesAgo(21941), status: 'SUCCESS', type: 'AUTO', scope: 'FULL',
    storageProvider: 'GOOGLE_CLOUD_STORAGE', bucket: 'salonsys-prod-backups', region: 'asia-southeast1', replicaRegion: 'asia-east1',
    encryption: 'AES-256-GCM', kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v2',
    checksum: 'sha256:6430fcaa7dc80c7a5f3b510ef2f35b3a7dd9836a1dfb51dd241d12ec47d55753', integrityStatus: 'VERIFIED', verifiedAt: minutesAgo(21923), durationSeconds: 622,
    initiatedBy: 'backup-scheduler@system', retentionClass: 'MONTHLY', expiresAt: daysFromNow(350), immutableUntil: daysFromNow(75),
    note: 'Điểm khôi phục tháng 07/2026.', components: fullBackupComponents(1692044, '296.6 MB', '120.8 MB')
  }
];

export const INITIAL_BACKUP_POLICY: BackupPolicy = {
  enabled: true, frequency: 'DAILY', time: '03:00', weekday: 'MONDAY', timezone: 'Asia/Ho_Chi_Minh',
  dailyRetention: 7, weeklyRetention: 4, monthlyRetention: 12, immutableDays: 7,
  primaryRegion: 'asia-southeast1', replicaRegion: 'asia-east1', crossRegionReplication: true,
  encryptionEnabled: true, kmsKeyId: 'projects/salonsys/locations/global/keyRings/backup/cryptoKeys/prod-v3',
  compression: 'ZSTD', automaticVerification: true, includeObjectStorage: true, includeAuditLogs: true,
  updatedAt: minutesAgo(8640), updatedBy: 'superadmin@salonsys.vn'
};

export const INITIAL_RESTORE_JOBS: RestoreJob[] = [
  {
    id: 'RST-20260710-1018', snapshotId: 'BKP-20260701-0300', snapshotFilename: 'salonsys_full_20260701_030000.zst', target: 'DR_SANDBOX',
    status: 'SUCCESS', requestedAt: minutesAgo(8240), startedAt: minutesAgo(8235), completedAt: minutesAgo(8188), requestedBy: 'superadmin@salonsys.vn',
    progress: 100, maintenanceMode: false, preRestoreSnapshot: false, validationPassed: true, note: 'Diễn tập DR định kỳ; xác nhận RTO 52 phút và dữ liệu toàn vẹn.'
  },
  {
    id: 'RST-20260618-2210', snapshotId: 'BKP-20260618-0300', snapshotFilename: 'salonsys_full_20260618_030000.zst', target: 'DR_SANDBOX',
    status: 'FAILED', requestedAt: minutesAgo(39400), startedAt: minutesAgo(39396), completedAt: minutesAgo(39368), requestedBy: 'superadmin@salonsys.vn',
    progress: 64, maintenanceMode: false, preRestoreSnapshot: false, validationPassed: true, note: 'Diễn tập DR trước bản phát hành lớn.',
    failureReason: 'Không thể khôi phục một object do quyền truy cập replica bucket chưa đồng bộ.'
  }
];

// Helper to load state from localStorage or fallback to defaults
export const loadLocalStorageData = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(`salonsys_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading localStorage key', key, error);
    return defaultValue;
  }
};

// Helper to save state to localStorage
export const saveLocalStorageData = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(`salonsys_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing localStorage key', key, error);
  }
};
