import type { Ticket } from '../types';

const minutesFromNow = (minutes: number) => (
  new Date(Date.now() + minutes * 60 * 1000).toISOString()
);

export const SUPPORT_MOCK_TICKETS: Ticket[] = [
  {
    id: 'DEMO-SPT-001',
    tenantId: 'TEN-DEMO-AURORA',
    tenantName: 'Aurora Beauty',
    requesterName: 'Nguyễn Minh Anh',
    requesterEmail: 'minhanh@aurorabeauty.demo',
    requesterPhone: '090 123 4567',
    plan: 'Enterprise',
    subject: 'Phát hiện lượt đăng nhập bất thường vào tài khoản quản trị',
    category: 'Bảo mật tài khoản',
    channel: 'SYSTEM',
    priority: 'URGENT',
    status: 'ESCALATED',
    createdAt: minutesFromNow(-180),
    updatedAt: minutesFromNow(-18),
    firstResponseDueAt: minutesFromNow(-120),
    resolutionDueAt: minutesFromNow(60),
    firstRespondedAt: minutesFromNow(-155),
    assignedTo: {
      id: 'SUPERADMIN',
      name: 'Superadmin',
      email: 'superadmin@salonsys.vn'
    },
    team: 'SECURITY',
    tags: ['demo', 'security', 'login'],
    description: 'Tenant nhận được cảnh báo đăng nhập từ thiết bị và vị trí chưa từng sử dụng. Cần kiểm tra phiên truy cập và hướng dẫn đổi thông tin xác thực.',
    messages: [
      {
        id: 'DEMO-MSG-001',
        authorName: 'Hệ thống SalonSys',
        authorEmail: 'security@salonsys.vn',
        authorRole: 'SYSTEM',
        type: 'SYSTEM_EVENT',
        body: 'Hệ thống phát hiện một lượt đăng nhập từ thiết bị mới và tự động tạo ticket.',
        createdAt: minutesFromNow(-180)
      },
      {
        id: 'DEMO-MSG-002',
        authorName: 'Superadmin',
        authorEmail: 'superadmin@salonsys.vn',
        authorRole: 'SUPERADMIN',
        type: 'PUBLIC_REPLY',
        body: 'Chúng tôi đã khóa phiên đáng ngờ và đang kiểm tra lịch sử truy cập. Vui lòng chưa đăng nhập lại cho đến khi nhận được xác nhận.',
        createdAt: minutesFromNow(-155)
      }
    ],
    history: [
      {
        id: 'DEMO-HIS-001',
        action: 'Ticket được tạo tự động',
        detail: 'Cảnh báo đăng nhập bất thường vượt ngưỡng bảo mật.',
        actor: 'Hệ thống SalonSys',
        createdAt: minutesFromNow(-180)
      },
      {
        id: 'DEMO-HIS-002',
        action: 'Đã leo thang',
        detail: 'Chuyển ticket đến nhóm Bảo mật để điều tra.',
        actor: 'Superadmin',
        createdAt: minutesFromNow(-150)
      }
    ],
    relatedResource: {
      type: 'TENANT',
      id: 'TEN-DEMO-AURORA',
      label: 'Aurora Beauty'
    }
  },
  {
    id: 'DEMO-SPT-002',
    tenantId: 'TEN-DEMO-LUMIERE',
    tenantName: 'Lumière Hair Studio',
    requesterName: 'Lê Hoàng Nam',
    requesterEmail: 'nam.le@lumierehair.demo',
    requesterPhone: '093 888 2200',
    plan: 'Premium',
    subject: 'Thanh toán thành công nhưng hóa đơn vẫn hiển thị quá hạn',
    category: 'Hóa đơn & thanh toán',
    channel: 'EMAIL',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    createdAt: minutesFromNow(-95),
    updatedAt: minutesFromNow(-12),
    firstResponseDueAt: minutesFromNow(-50),
    resolutionDueAt: minutesFromNow(90),
    firstRespondedAt: minutesFromNow(-72),
    assignedTo: {
      id: 'SUPERADMIN',
      name: 'Superadmin',
      email: 'superadmin@salonsys.vn'
    },
    team: 'BILLING',
    tags: ['demo', 'invoice', 'payment'],
    description: 'Khách hàng đã thanh toán qua MoMo và nhận thông báo giao dịch thành công, tuy nhiên trạng thái hóa đơn trên cổng quản trị chưa được cập nhật.',
    messages: [
      {
        id: 'DEMO-MSG-003',
        authorName: 'Lê Hoàng Nam',
        authorEmail: 'nam.le@lumierehair.demo',
        authorRole: 'TENANT_ADMIN',
        type: 'PUBLIC_REPLY',
        body: 'Tôi đã thanh toán lúc 10:15 nhưng hóa đơn vẫn báo quá hạn. Nhờ đội ngũ kiểm tra giúp.',
        createdAt: minutesFromNow(-95),
        attachments: [{ id: 'DEMO-ATT-001', name: 'bien-lai-momo.png', size: '248 KB' }]
      },
      {
        id: 'DEMO-MSG-004',
        authorName: 'Superadmin',
        authorEmail: 'superadmin@salonsys.vn',
        authorRole: 'SUPERADMIN',
        type: 'PUBLIC_REPLY',
        body: 'Chúng tôi đã tiếp nhận biên lai và đang đối soát giao dịch với cổng thanh toán.',
        createdAt: minutesFromNow(-72)
      }
    ],
    history: [
      {
        id: 'DEMO-HIS-003',
        action: 'Tiếp nhận qua email',
        detail: 'Ticket được tạo từ email của Tenant Admin.',
        actor: 'Hệ thống SalonSys',
        createdAt: minutesFromNow(-95)
      },
      {
        id: 'DEMO-HIS-004',
        action: 'Bắt đầu xử lý',
        detail: 'Đang đối soát mã giao dịch và trạng thái webhook.',
        actor: 'Superadmin',
        createdAt: minutesFromNow(-70)
      }
    ],
    relatedResource: {
      type: 'INVOICE',
      id: 'INV-DEMO-2407',
      label: 'Hóa đơn INV-DEMO-2407'
    }
  },
  {
    id: 'DEMO-SPT-003',
    tenantId: 'TEN-DEMO-MAY',
    tenantName: 'Mây Nail & Spa',
    requesterName: 'Trần Thảo Vy',
    requesterEmail: 'thaovy@maynail.demo',
    plan: 'Basic',
    subject: 'Không thể xuất báo cáo doanh thu cuối ngày',
    category: 'Báo cáo',
    channel: 'CHAT',
    priority: 'MEDIUM',
    status: 'OPEN',
    createdAt: minutesFromNow(-25),
    updatedAt: minutesFromNow(-25),
    firstResponseDueAt: minutesFromNow(35),
    resolutionDueAt: minutesFromNow(480),
    team: 'TECHNICAL',
    tags: ['demo', 'report', 'export'],
    description: 'Nút xuất báo cáo không phản hồi sau khi chọn khoảng thời gian hôm nay. Tenant đã thử tải lại trang nhưng sự cố vẫn còn.',
    messages: [
      {
        id: 'DEMO-MSG-005',
        authorName: 'Trần Thảo Vy',
        authorEmail: 'thaovy@maynail.demo',
        authorRole: 'TENANT_ADMIN',
        type: 'PUBLIC_REPLY',
        body: 'Mình bấm xuất Excel nhưng không thấy tệp tải xuống. Nhờ hỗ trợ kiểm tra sớm giúp mình.',
        createdAt: minutesFromNow(-25)
      }
    ],
    history: [
      {
        id: 'DEMO-HIS-005',
        action: 'Ticket mới',
        detail: 'Yêu cầu được tiếp nhận từ kênh chat.',
        actor: 'Hệ thống SalonSys',
        createdAt: minutesFromNow(-25)
      }
    ],
    relatedResource: {
      type: 'TENANT',
      id: 'TEN-DEMO-MAY',
      label: 'Mây Nail & Spa'
    }
  },
  {
    id: 'DEMO-SPT-004',
    tenantId: 'TEN-DEMO-HANA',
    tenantName: 'Hana Salon',
    requesterName: 'Phạm Ngọc Hà',
    requesterEmail: 'ngoc.ha@hanasalon.demo',
    plan: 'Premium',
    subject: 'Cập nhật email nhận thông báo hóa đơn',
    category: 'Tài khoản & thông báo',
    channel: 'PHONE',
    priority: 'LOW',
    status: 'RESOLVED',
    createdAt: minutesFromNow(-2880),
    updatedAt: minutesFromNow(-1440),
    firstResponseDueAt: minutesFromNow(-2820),
    resolutionDueAt: minutesFromNow(-2400),
    firstRespondedAt: minutesFromNow(-2850),
    resolvedAt: minutesFromNow(-1440),
    assignedTo: {
      id: 'SUPERADMIN',
      name: 'Superadmin',
      email: 'superadmin@salonsys.vn'
    },
    team: 'L1_SUPPORT',
    tags: ['demo', 'notification', 'account'],
    description: 'Tenant yêu cầu thay đổi email nhận thông báo hóa đơn sang địa chỉ của bộ phận kế toán.',
    messages: [
      {
        id: 'DEMO-MSG-006',
        authorName: 'Superadmin',
        authorEmail: 'superadmin@salonsys.vn',
        authorRole: 'SUPERADMIN',
        type: 'PUBLIC_REPLY',
        body: 'Email nhận hóa đơn đã được cập nhật và xác minh thành công.',
        createdAt: minutesFromNow(-1440)
      }
    ],
    history: [
      {
        id: 'DEMO-HIS-006',
        action: 'Đã giải quyết',
        detail: 'Cập nhật email nhận hóa đơn theo yêu cầu của Tenant Admin.',
        actor: 'Superadmin',
        createdAt: minutesFromNow(-1440)
      }
    ],
    satisfaction: 5,
    relatedResource: {
      type: 'TENANT',
      id: 'TEN-DEMO-HANA',
      label: 'Hana Salon'
    }
  }
];
