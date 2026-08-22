import { SystemAnnouncement, SubscriptionPackageName, Tenant } from '../types';

const STORAGE_KEY = 'system_announcements_v1';
const DISMISSED_BANNERS_KEY = 'dismissed_announcement_banners_v1';
const READ_ANNOUNCEMENTS_KEY = 'read_announcements_by_tenant_v1';
const ARCHIVED_ANNOUNCEMENTS_KEY = 'archived_announcements_by_tenant_v1';
const DELETED_ANNOUNCEMENTS_KEY = 'deleted_announcements_by_tenant_v1';

export const INITIAL_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'ANN-2026-001',
    title: 'Thông báo nâng cấp hệ thống máy chủ & Báo cáo Realtime (00:00 - 02:00 Chủ Nhật)',
    summary: 'Hệ thống SalonSys sẽ tiến hành bảo trì định kỳ nâng cấp máy chủ đám mây nhằm tăng tốc độ tải trang và bổ sung biểu đồ phân tích doanh thu tức thì.',
    content: `Kính gửi Quý Chủ salon & Quản lý vận hành,

Ban Quản trị Hệ thống SalonSys xin trân trọng thông báo về lịch bảo trì định kỳ và nâng cấp hạ tầng máy chủ sắp tới:

### 1. Thời gian bảo trì:
- **Bắt đầu:** 00:00:00 - Chủ Nhật (ngày 24/08/2026)
- **Dự kiến hoàn tất:** 02:00:00 cùng ngày (khoảng 120 phút).

### 2. Nội dung nâng cấp trọng điểm:
- **Tối ưu tốc độ xử lý dữ liệu:** Giảm 40% độ trễ khi xuất báo cáo thu chi nhiều chi nhánh.
- **Tính năng phân tích Realtime:** Tự động đồng bộ doanh số tức thì từ POS sang biểu đồ quản trị.
- **Nâng cấp bảo mật đa lớp:** Tăng cường mã hóa dữ liệu khách hàng và lịch hẹn.

### 3. Lưu ý trong thời gian bảo trì:
- Các giao dịch POS offline vẫn được lưu tại thiết bị và tự động đồng bộ lại ngay khi hệ thống hoàn tất.
- Cổng đặt lịch Online của khách hàng sẽ hiển thị thông báo hẹn lại ngắn.

Mọi thắc mắc hoặc cần hỗ trợ khẩn cấp, vui lòng liên hệ Tổng đài kỹ thuật: **1900 8899** hoặc email **support@salonsys.vn**.

Trân trọng,  
**Đội ngũ Kỹ thuật & Vận hành SalonSys Cloud**`,
    category: 'MAINTENANCE',
    priority: 'URGENT',
    targetAudience: 'ALL_TENANTS',
    bannerEnabled: true,
    pinned: true,
    publishedAt: '2026-08-20T08:00:00.000Z',
    status: 'PUBLISHED',
    authorName: 'SalonSys DevSecOps Team',
    authorRole: 'Hạ tầng & Vận hành Hệ thống',
    actionLabel: 'Xem Trung tâm Trợ giúp',
    actionUrl: 'support',
    readByTenantIds: [],
    dismissedBannerTenantIds: [],
    createdAt: '2026-08-20T08:00:00.000Z'
  },
  {
    id: 'ANN-2026-002',
    title: 'Công bố chính sách Bảng giá gói 2026 & Ưu đãi chu kỳ năm giảm đến 20%',
    summary: 'Chính sách biểu phí dịch vụ mới tối ưu hóa chi phí vận hành cho các chuỗi salon quy mô từ 1 đến không giới hạn chi nhánh.',
    content: `Kính gửi Quý Đối tác & Quý Khách hàng Tenant,

Nhằm đồng hành cùng sự phát triển của các chuỗi Salon & Spa trên toàn quốc, SalonSys trân trọng giới thiệu chính sách giá và chương trình ưu đãi đặc biệt:

### 🌟 1. Điểm mới trong chính sách gói:
- **Không giới hạn nhân sự:** Gói **Premium** và **Enterprise** chính thức mở rộng không giới hạn số lượng kỹ thuật viên & thợ nail trên toàn hệ thống.
- **Tích hợp kênh Zalo OA & SMS Brandname:** Miễn phí thiết lập tích hợp cho tất cả tài khoản gói Premium trở lên.
- **Ủy nhiệm chi tự động (Auto-Reconciliation):** Tenant nộp ảnh biên lai/UNC trực tiếp trên trang, hệ thống kích hoạt gói tức thì sau khi Super Admin đối soát.

### 🎁 2. Ưu đãi thanh toán theo năm:
- **Tiết kiệm đến 20%** tổng chi phí so với thanh toán từng tháng.
- Tặng thêm **01 tháng sử dụng miễn phí** khi thanh toán chu kỳ 12 tháng.

Quý salon có thể chủ động bấm **"Yêu cầu nâng cấp gói"** ngay trong tab *Gói đăng ký* để nhận báo giá ưu đãi nhất.

Trân trọng,  
**Ban Quản trị Sản phẩm & Kinh doanh SalonSys**`,
    category: 'POLICY_UPDATE',
    priority: 'HIGH',
    targetAudience: 'ALL_TENANTS',
    bannerEnabled: false,
    pinned: true,
    publishedAt: '2026-08-15T09:30:00.000Z',
    status: 'PUBLISHED',
    authorName: 'Nguyễn Thanh Tùng',
    authorRole: 'Trưởng bộ phận Chăm sóc Khách hàng',
    actionLabel: 'Xem bảng giá & Nâng cấp',
    actionUrl: 'subscription',
    readByTenantIds: [],
    dismissedBannerTenantIds: [],
    createdAt: '2026-08-15T09:30:00.000Z'
  },
  {
    id: 'ANN-2026-003',
    title: 'Cẩm nang vận hành: 5 mẹo tối ưu lịch hẹn & Giảm 85% tỷ lệ khách hủy giờ chót',
    summary: 'Chia sẻ kinh nghiệm thực chiến từ hơn 500 chuỗi salon làm đẹp hàng đầu về cách thiết lập nhắc lịch tự động và tối ưu công suất ghế.',
    content: `Chào Quý Quản lý & Chủ Salon,

Tỷ lệ hủy lịch phút chót (No-show) luôn là một trong những tổn thất doanh thu lớn nhất của ngành dịch vụ làm đẹp. Dưới đây là 5 mẹo vận hành đã được kiểm chứng hiệu quả:

### 1. Bật nhắc lịch tự động trước 2 tiếng qua Zalo/SMS:
- Thiết lập tin nhắn tự động nhắc khách xác nhận hoặc dời lịch sớm nếu có việc đột xuất. Vào *Cài đặt tiệm $\\rightarrow$ Thông báo* để kích hoạt.

### 2. Áp dụng chính sách đặt cọc giữ chỗ vào giờ cao điểm:
- Vào khung giờ vàng (17:30 - 20:30 ngày Thứ 6, Thứ 7, CN), yêu cầu khách cọc trước một khoản nhỏ (50.000đ - 100.000đ) qua QR Code.

### 3. Phân bổ thợ theo chuyên môn & thời lượng dịch vụ:
- Gán đúng kỹ thuật viên chuyên làm Nail Art hoặc Chăm sóc móng cơ bản để tránh chồng chéo thời gian chờ đợi của khách.

### 4. Tận dụng tính năng Khách hàng thân thiết (Loyalty):
- Tích điểm tự động sau mỗi hóa đơn giúp khách hào hứng quay lại và ưu tiên giữ đúng lịch hẹn.

### 5. Xem biểu đồ Công suất ghế (Station Utilization):
- Thường xuyên kiểm tra tab *Ghế & Khu vực* để điều chuyển khách sang chi nhánh hoặc khu vực vắng hơn trong giờ cao điểm.

Chúc Quý Salon luôn đông khách và vận hành hiệu quả!

Trân trọng,  
**Đội ngũ Tư vấn Vận hành SalonSys Academy**`,
    category: 'OPERATING_TIPS',
    priority: 'NORMAL',
    targetAudience: 'ALL_TENANTS',
    bannerEnabled: false,
    pinned: false,
    publishedAt: '2026-08-10T14:00:00.000Z',
    status: 'PUBLISHED',
    authorName: 'Lê Hoàng Yến',
    authorRole: 'Chuyên gia Tư vấn Vận hành Chuỗi',
    actionLabel: 'Mở trang Cài đặt tiệm',
    actionUrl: 'settings',
    readByTenantIds: [],
    dismissedBannerTenantIds: [],
    createdAt: '2026-08-10T14:00:00.000Z'
  },
  {
    id: 'ANN-2026-004',
    title: 'Hướng dẫn sử dụng tính năng Tải ảnh Ủy nhiệm chi & Xem trước chứng từ thanh toán',
    summary: 'Tenant Admin nay có thể chọn tải file ảnh biên lai trực tiếp từ điện thoại/máy tính hoặc dán link ảnh khi thanh toán hóa đơn gói cước.',
    content: `Kính gửi Quý Chủ Salon,

Nhằm đơn giản hóa quy trình đối soát thanh toán gói cước, SalonSys vừa cập nhật giao diện nộp chứng từ thanh toán mới:

- **Tải ảnh trực tiếp từ máy:** Nhấn nút *"Tải ảnh lên"* để chọn ngay ảnh chụp màn hình chuyển khoản từ app ngân hàng (VietinBank, Techcombank, Vietcombank, Momo, v.v.).
- **Xem trước ảnh (Preview):** Kiểm tra ngay độ sắc nét và thông tin số tiền chuyển trước khi gửi đi.
- **Ghi chú giao dịch:** Điền mã chuẩn chi/FT Code để Super Admin đối chiếu nhanh nhất trong vòng 15 phút.

Quý khách có thể trải nghiệm ngay tại mục *Gói đăng ký $\\rightarrow$ Lịch sử hóa đơn $\\rightarrow$ Nộp chứng từ*.

Trân trọng,  
**SalonSys Product Experience Team**`,
    category: 'FEATURE_RELEASE',
    priority: 'NORMAL',
    targetAudience: 'ALL_TENANTS',
    bannerEnabled: false,
    pinned: false,
    publishedAt: '2026-08-05T10:00:00.000Z',
    status: 'PUBLISHED',
    authorName: 'SalonSys Product Team',
    authorRole: 'Phát triển Sản phẩm',
    actionLabel: 'Đến trang Gói đăng ký',
    actionUrl: 'subscription',
    readByTenantIds: [],
    dismissedBannerTenantIds: [],
    createdAt: '2026-08-05T10:00:00.000Z'
  }
];

export const loadSystemAnnouncements = (): SystemAnnouncement[] => {
  if (typeof window === 'undefined') return INITIAL_ANNOUNCEMENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_ANNOUNCEMENTS;
  } catch {
    return INITIAL_ANNOUNCEMENTS;
  }
};

export const saveSystemAnnouncements = (announcements: SystemAnnouncement[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
  } catch (error) {
    console.error('Failed to save system announcements:', error);
  }
};

export const getAnnouncementsForTenant = (
  announcements: SystemAnnouncement[],
  tenant?: Partial<Tenant> | null
): SystemAnnouncement[] => {
  return announcements.filter((item) => {
    if (item.status !== 'PUBLISHED') return false;
    if (item.targetAudience === 'ALL_TENANTS') return true;
    if (item.targetAudience === 'SPECIFIC_PACKAGE') {
      if (!tenant?.packageName) return true;
      return Boolean(item.targetPackageNames?.includes(tenant.packageName as SubscriptionPackageName));
    }
    if (item.targetAudience === 'SPECIFIC_TENANTS') {
      if (!tenant?.id) return true;
      return Boolean(item.targetTenantIds?.includes(tenant.id) || (tenant.name && item.targetTenantIds?.includes(tenant.name)));
    }
    return true;
  });
};

export const filterAnnouncementsForTenant = getAnnouncementsForTenant;

export const isAnnouncementReadByTenant = (
  announcement: SystemAnnouncement,
  tenantId: string
): boolean => {
  if (!tenantId) return false;
  if (announcement.readByTenantIds?.includes(tenantId)) return true;
  try {
    const raw = window.localStorage.getItem(`${READ_ANNOUNCEMENTS_KEY}_${tenantId}`);
    if (raw) {
      const readIds: string[] = JSON.parse(raw);
      return readIds.includes(announcement.id);
    }
  } catch {}
  return false;
};

export const markAnnouncementRead = (
  announcementId: string,
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  // Local storage quick track
  try {
    const key = `${READ_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    const readIds: string[] = raw ? JSON.parse(raw) : [];
    if (!readIds.includes(announcementId)) {
      readIds.push(announcementId);
      window.localStorage.setItem(key, JSON.stringify(readIds));
    }
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (item.id === announcementId) {
      const existingReads = item.readByTenantIds || [];
      if (!existingReads.includes(tenantId)) {
        return { ...item, readByTenantIds: [...existingReads, tenantId] };
      }
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const markAllAnnouncementsRead = (
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  try {
    const key = `${READ_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const allIds = allAnnouncements.map((a) => a.id);
    window.localStorage.setItem(key, JSON.stringify(allIds));
  } catch {}

  const updated = allAnnouncements.map((item) => {
    const existingReads = item.readByTenantIds || [];
    if (!existingReads.includes(tenantId)) {
      return { ...item, readByTenantIds: [...existingReads, tenantId] };
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const isAnnouncementArchivedByTenant = (
  announcement: SystemAnnouncement,
  tenantId: string
): boolean => {
  if (!tenantId) return false;
  if (announcement.archivedByTenantIds?.includes(tenantId)) return true;
  try {
    const raw = window.localStorage.getItem(`${ARCHIVED_ANNOUNCEMENTS_KEY}_${tenantId}`);
    if (raw) {
      const archivedIds: string[] = JSON.parse(raw);
      return archivedIds.includes(announcement.id);
    }
  } catch {}
  return false;
};

export const isAnnouncementDeletedByTenant = (
  announcement: SystemAnnouncement,
  tenantId: string
): boolean => {
  if (!tenantId) return false;
  if (announcement.deletedByTenantIds?.includes(tenantId)) return true;
  try {
    const raw = window.localStorage.getItem(`${DELETED_ANNOUNCEMENTS_KEY}_${tenantId}`);
    if (raw) {
      const deletedIds: string[] = JSON.parse(raw);
      return deletedIds.includes(announcement.id);
    }
  } catch {}
  return false;
};

export const archiveAnnouncementForTenant = (
  announcementId: string,
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  try {
    const key = `${ARCHIVED_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(announcementId)) {
      list.push(announcementId);
      window.localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (item.id === announcementId) {
      const existing = item.archivedByTenantIds || [];
      if (!existing.includes(tenantId)) {
        return { ...item, archivedByTenantIds: [...existing, tenantId] };
      }
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const unarchiveAnnouncementForTenant = (
  announcementId: string,
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  try {
    const key = `${ARCHIVED_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      const filtered = list.filter((id) => id !== announcementId);
      window.localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (item.id === announcementId && item.archivedByTenantIds) {
      return {
        ...item,
        archivedByTenantIds: item.archivedByTenantIds.filter((id) => id !== tenantId)
      };
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const deleteAnnouncementForTenant = (
  announcementId: string,
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  try {
    const key = `${DELETED_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(announcementId)) {
      list.push(announcementId);
      window.localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (item.id === announcementId) {
      const existing = item.deletedByTenantIds || [];
      if (!existing.includes(tenantId)) {
        return { ...item, deletedByTenantIds: [...existing, tenantId] };
      }
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const restoreAnnouncementForTenant = (
  announcementId: string,
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  try {
    const delKey = `${DELETED_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const rawDel = window.localStorage.getItem(delKey);
    if (rawDel) {
      const list: string[] = JSON.parse(rawDel);
      window.localStorage.setItem(delKey, JSON.stringify(list.filter((id) => id !== announcementId)));
    }

    const archKey = `${ARCHIVED_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const rawArch = window.localStorage.getItem(archKey);
    if (rawArch) {
      const list: string[] = JSON.parse(rawArch);
      window.localStorage.setItem(archKey, JSON.stringify(list.filter((id) => id !== announcementId)));
    }
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (item.id === announcementId) {
      return {
        ...item,
        deletedByTenantIds: item.deletedByTenantIds?.filter((id) => id !== tenantId),
        archivedByTenantIds: item.archivedByTenantIds?.filter((id) => id !== tenantId)
      };
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const archiveAllReadForTenant = (
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;

  const readAnnouncements = allAnnouncements.filter((a) => isAnnouncementReadByTenant(a, tenantId));
  const readIds = readAnnouncements.map((a) => a.id);

  try {
    const key = `${ARCHIVED_ANNOUNCEMENTS_KEY}_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    const existingList: string[] = raw ? JSON.parse(raw) : [];
    const combined = Array.from(new Set([...existingList, ...readIds]));
    window.localStorage.setItem(key, JSON.stringify(combined));
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (readIds.includes(item.id)) {
      const existing = item.archivedByTenantIds || [];
      if (!existing.includes(tenantId)) {
        return { ...item, archivedByTenantIds: [...existing, tenantId] };
      }
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const purgeDeletedForTenant = (
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;
  // This keeps the deleted state permanent for the tenant
  return allAnnouncements;
};

export const isBannerDismissedByTenant = (
  announcementId: string,
  tenantId: string
): boolean => {
  if (!tenantId) return false;
  try {
    const raw = window.localStorage.getItem(`${DISMISSED_BANNERS_KEY}_${tenantId}`);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      return list.includes(announcementId);
    }
  } catch {}
  return false;
};

export const dismissBannerForTenant = (
  announcementId: string,
  tenantId: string,
  allAnnouncements: SystemAnnouncement[]
): SystemAnnouncement[] => {
  if (!tenantId) return allAnnouncements;
  try {
    const key = `${DISMISSED_BANNERS_KEY}_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(announcementId)) {
      list.push(announcementId);
      window.localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}

  const updated = allAnnouncements.map((item) => {
    if (item.id === announcementId) {
      const existing = item.dismissedBannerTenantIds || [];
      if (!existing.includes(tenantId)) {
        return { ...item, dismissedBannerTenantIds: [...existing, tenantId] };
      }
    }
    return item;
  });

  saveSystemAnnouncements(updated);
  return updated;
};

export const getCategoryLabel = (category: SystemAnnouncement['category']): string => {
  switch (category) {
    case 'MAINTENANCE': return 'Bảo trì hệ thống';
    case 'POLICY_UPDATE': return 'Chính sách & Bảng giá';
    case 'FEATURE_RELEASE': return 'Tính năng mới';
    case 'OPERATING_TIPS': return 'Mẹo vận hành Salon';
    case 'BILLING': return 'Hóa đơn & Thanh toán';
    case 'GENERAL': return 'Thông báo chung';
    default: return 'Thông báo';
  }
};

export const getPriorityBadge = (priority: SystemAnnouncement['priority']) => {
  switch (priority) {
    case 'URGENT':
      return { label: 'Khẩn cấp', tone: 'bg-rose-500 text-white', border: 'border-rose-300' };
    case 'HIGH':
      return { label: 'Quan trọng', tone: 'bg-amber-500 text-white', border: 'border-amber-300' };
    case 'NORMAL':
      return { label: 'Bình thường', tone: 'bg-violet-500 text-white', border: 'border-violet-300' };
    case 'LOW':
      return { label: 'Tham khảo', tone: 'bg-slate-500 text-white', border: 'border-slate-300' };
  }
};
