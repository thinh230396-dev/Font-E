import { getTenantAdminInitialData } from './mockDataReset';
import { tenantStorageKey } from './tenantStorage';

export type CustomerTier = 'VIP' | 'LOYAL' | 'STANDARD' | 'NEW';
export type CustomerStatus = 'ACTIVE' | 'CARE' | 'INACTIVE';
export type BranchCode = 'Q1' | 'Q3';

export interface ServiceVisit {
  date: string;
  service: string;
  technician: string;
  amount: number;
  rating?: number;
}

export interface TenantCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  branch: BranchCode;
  tier: CustomerTier;
  status: CustomerStatus;
  source: string;
  visits: number;
  totalSpent: number;
  points: number;
  lastVisit: string;
  nextAppointment?: string;
  favoriteTechnician: string;
  preferences: string[];
  allergies: string;
  nailCondition: string;
  note: string;
  consent: string[];
  tags: string[];
  history: ServiceVisit[];
  activity: string[];
}

export const tierMeta: Record<CustomerTier, { label: string; badge: string; avatar: string; discountText?: string }> = {
  VIP: {
    label: 'VIP Diamond',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800',
    avatar: 'from-violet-500 to-fuchsia-500',
    discountText: 'Ưu đãi giảm 10% & phòng VIP',
  },
  LOYAL: {
    label: 'Thân thiết',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800',
    avatar: 'from-blue-500 to-cyan-500',
    discountText: 'Ưu đãi giảm 5%',
  },
  STANDARD: {
    label: 'Tiêu chuẩn',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    avatar: 'from-slate-500 to-slate-700',
    discountText: 'Tích điểm 10%',
  },
  NEW: {
    label: 'Khách mới',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800',
    avatar: 'from-emerald-500 to-teal-500',
    discountText: 'Tặng 50k lần đầu',
  },
};

const visit = (
  date: string,
  service: string,
  technician: string,
  amount: number,
  rating?: number,
): ServiceVisit => ({ date, service, technician, amount, rating });

export const defaultCustomerSeed: TenantCustomer[] = [
  {
    id: 'CUS-1842',
    name: 'Nguyễn Minh Anh',
    phone: '0912 884 206',
    email: 'minhanh@gmail.com',
    birthday: '12/08/1994',
    branch: 'Q3',
    tier: 'VIP',
    status: 'ACTIVE',
    source: 'Khách giới thiệu',
    visits: 18,
    totalSpent: 24850000,
    points: 2485,
    lastVisit: '16/07/2026',
    nextAppointment: '23/07 · 08:15',
    favoriteTechnician: 'Thảo Nguyễn',
    preferences: ['French', 'Tông nude', 'Form Almond', 'Sơn không HEMA'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Móng ngón trỏ yếu, cần hạn chế mài sâu',
    note: 'Ưu tiên lịch sáng cuối tuần và phòng VIP khi có thể.',
    consent: ['Zalo', 'SMS', 'Email'],
    tags: ['Chi tiêu cao', 'Hay đặt cuối tuần'],
    history: [
      visit('16/07/2026', 'Nail Art Premium', 'Thảo Nguyễn', 1250000, 5),
      visit('28/06/2026', 'Gel Manicure', 'Thảo Nguyễn', 680000, 5),
      visit('06/06/2026', 'Combo VIP', 'Hà My', 1650000, 5),
    ],
    activity: [
      '16/07 · Hoàn thành APT-1041 và cộng 125 điểm',
      '09/07 · Đã gửi voucher sinh nhật',
      '28/06 · Đánh giá dịch vụ 5 sao',
    ],
  },
  {
    id: 'CUS-1796',
    name: 'Trần Thu Hà',
    phone: '0908 337 912',
    email: 'thuha91@gmail.com',
    birthday: '28/07/1991',
    branch: 'Q3',
    tier: 'LOYAL',
    status: 'ACTIVE',
    source: 'Google',
    visits: 11,
    totalSpent: 12480000,
    points: 1248,
    lastVisit: '16/07/2026',
    nextAppointment: '23/07 · 09:30',
    favoriteTechnician: 'Minh Châu',
    preferences: ['Pedicure', 'Đỏ rượu', 'Móng vuông ngắn'],
    allergies: 'Tinh dầu bạc hà',
    nailCondition: 'Bình thường',
    note: 'Không dùng tinh dầu bạc hà trong bước ngâm chân.',
    consent: ['Zalo', 'Email'],
    tags: ['Sắp sinh nhật', 'Cần lưu ý dị ứng'],
    history: [
      visit('16/07/2026', 'Pedicure Spa + Sơn gel', 'Minh Châu', 780000, 5),
      visit('25/06/2026', 'Pedicure chuyên sâu', 'Minh Châu', 920000, 4),
    ],
    activity: ['16/07 · Tái đặt lịch sau 7 ngày', '12/07 · Mở tin nhắn ưu đãi sinh nhật'],
  },
  {
    id: 'CUS-2050',
    name: 'Đinh Gia Hân',
    phone: '0902 826 114',
    email: 'giahan@gmail.com',
    birthday: '03/03/1995',
    branch: 'Q1',
    tier: 'LOYAL',
    status: 'ACTIVE',
    source: 'TikTok',
    visits: 9,
    totalSpent: 8720000,
    points: 872,
    lastVisit: '12/07/2026',
    nextAppointment: '23/07 · 09:00',
    favoriteTechnician: 'Hà My',
    preferences: ['Chrome', 'Form Oval', 'Khu VIP'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Bình thường',
    note: 'Thường đi cùng bạn; thích phòng yên tĩnh.',
    consent: ['Zalo', 'SMS'],
    tags: ['Sắp nâng hạng'],
    history: [visit('12/07/2026', 'Summer Chrome', 'Hà My', 1180000, 5)],
    activity: ['18/07 · Xác nhận lịch qua Zalo', '12/07 · Cộng 118 điểm'],
  },
  {
    id: 'CUS-1052',
    name: 'Tạ Mỹ Duyên',
    phone: '0933 112 800',
    email: 'myduyen.ta@gmail.com',
    birthday: '15/10/1993',
    branch: 'Q3',
    tier: 'VIP',
    status: 'ACTIVE',
    source: 'Instagram',
    visits: 15,
    totalSpent: 18500000,
    points: 1850,
    lastVisit: '15/07/2026',
    favoriteTechnician: 'Minh Châu',
    preferences: ['Đắp gel nối móng', 'Form Stiletto', 'Nail Art cầu kỳ'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Móng dài tự nhiên khoẻ',
    note: 'Thích dùng form nối móng nhọn, KTV quen Minh Châu.',
    consent: ['Zalo', 'SMS'],
    tags: ['VIP Diamond', 'Đặt lịch nối móng'],
    history: [visit('15/07/2026', 'Đắp gel nối móng VIP', 'Minh Châu', 1350000, 5)],
    activity: ['15/07 · Hoàn thành dịch vụ đắp gel nối móng'],
  },
  {
    id: 'CUS-1053',
    name: 'Huỳnh Phương Thảo',
    phone: '0905 811 229',
    email: 'phuongthao.huynh@gmail.com',
    birthday: '09/04/1992',
    branch: 'Q3',
    tier: 'VIP',
    status: 'ACTIVE',
    source: 'Website booking',
    visits: 16,
    totalSpent: 21000000,
    points: 2100,
    lastVisit: '14/07/2026',
    favoriteTechnician: 'Thảo Nguyễn',
    preferences: ['Nail Art Premium', 'Đính charm cao cấp', 'Ombre'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Móng khoẻ',
    note: 'Khách cần hoàn tất đúng giờ, luôn đặt trước 1 tuần.',
    consent: ['Zalo', 'SMS', 'Email'],
    tags: ['VIP', 'Nail Art'],
    history: [visit('14/07/2026', 'Nail Art Premium', 'Thảo Nguyễn', 1200000, 5)],
    activity: ['14/07 · Tích 120 điểm'],
  },
  {
    id: 'CUS-1056',
    name: 'Võ Mai Phương',
    phone: '0908 991 234',
    email: 'maiphuong.vo@gmail.com',
    birthday: '22/09/1996',
    branch: 'Q3',
    tier: 'LOYAL',
    status: 'ACTIVE',
    source: 'Khách vãng lai',
    visits: 7,
    totalSpent: 7500000,
    points: 750,
    lastVisit: '16/07/2026',
    favoriteTechnician: 'Thuỳ Dương',
    preferences: ['Sơn gel Hàn Quốc', 'Tông pastel nhẹ'],
    allergies: 'Da tay nhạy cảm với nhiệt đèn UV quá cao',
    nailCondition: 'Da biểu bì mỏng, hơ đèn nấc nhiệt thấp (Low Heat Mode)',
    note: 'Lưu ý bật chế độ Low Heat khi hơ đèn gel.',
    consent: ['Zalo', 'SMS'],
    tags: ['Cần chăm sóc nhiệt', 'Thân thiết'],
    history: [visit('16/07/2026', 'Sơn gel Hàn Quốc', 'Thuỳ Dương', 380000, 5)],
    activity: ['16/07 · Đã cập nhật hồ sơ lưu ý nhiệt đèn hơ'],
  },
  {
    id: 'CUS-1224',
    name: 'Bùi Thanh Trúc',
    phone: '0938 400 176',
    email: 'thanhtruc@gmail.com',
    birthday: '19/07/1988',
    branch: 'Q3',
    tier: 'LOYAL',
    status: 'CARE',
    source: 'Khách giới thiệu',
    visits: 13,
    totalSpent: 9860000,
    points: 986,
    lastVisit: '28/05/2026',
    nextAppointment: '23/07 · 14:00',
    favoriteTechnician: 'Thuỳ Dương',
    preferences: ['Gel đơn sắc', 'Móng ngắn', 'Tông lạnh'],
    allergies: 'Không ghi nhận',
    nailCondition: 'Khô nhẹ quanh viền móng',
    note: 'Đã vắng trên 45 ngày; ưu tiên gửi ưu đãi quay lại.',
    consent: ['SMS', 'Email'],
    tags: ['Vắng 52 ngày', 'Sinh nhật trong tháng'],
    history: [
      visit('28/05/2026', 'Sơn gel Hàn Quốc', 'Thuỳ Dương', 620000, 4),
      visit('05/05/2026', 'Manicure cơ bản', 'Thuỳ Dương', 420000, 5),
    ],
    activity: ['19/07 · Đã gửi lời chúc sinh nhật', '12/07 · Thêm vào nhóm khách cần chăm sóc'],
  },
  {
    id: 'CUS-2011',
    name: 'Lê Ngọc Mai',
    phone: '0936 221 557',
    email: 'ngocmai97@gmail.com',
    birthday: '06/11/1997',
    branch: 'Q1',
    tier: 'NEW',
    status: 'ACTIVE',
    source: 'Instagram',
    visits: 1,
    totalSpent: 1250000,
    points: 125,
    lastVisit: '16/07/2026',
    favoriteTechnician: 'Chưa xác định',
    preferences: ['Ombre', 'Đính đá nhỏ', 'Form Coffin'],
    allergies: 'Chưa khai báo',
    nailCondition: 'Móng mỏng',
    note: 'Cần hỏi lại dị ứng trước lần phục vụ tiếp theo.',
    consent: ['Instagram', 'Email'],
    tags: ['Hồ sơ thiếu dị ứng'],
    history: [visit('16/07/2026', 'Ombre Premium', 'Thảo Nguyễn', 1250000, 5)],
    activity: ['16/07 · Tạo hồ sơ từ POS', '16/07 · Hoàn thành lần ghé đầu tiên'],
  },
  {
    id: 'CUS-0740',
    name: 'Hoàng Mỹ Hạnh',
    phone: '0907 311 840',
    email: 'myhanh86@gmail.com',
    birthday: '25/01/1986',
    branch: 'Q1',
    tier: 'STANDARD',
    status: 'INACTIVE',
    source: 'Khách vãng lai',
    visits: 5,
    totalSpent: 3650000,
    points: 365,
    lastVisit: '18/11/2025',
    favoriteTechnician: 'Hà My',
    preferences: ['Manicure cơ bản', 'Màu pastel'],
    allergies: 'Acetone nồng độ cao',
    nailCondition: 'Móng giòn',
    note: 'Chỉ nhận email; không gọi điện chăm sóc.',
    consent: ['Email'],
    tags: ['Không SMS', 'Vắng trên 6 tháng'],
    history: [visit('18/11/2025', 'Manicure cơ bản', 'Hà My', 450000, 4)],
    activity: ['02/07 · Email quay lại chưa mở', '18/11 · Hoàn thành dịch vụ gần nhất'],
  },
];

export const getTenantCustomerStorageKey = () => tenantStorageKey('tenant-admin-customers-v1');

export const normalizeDigits = (val: string) => val.replace(/\D/g, '');

export function getTenantCustomers(): TenantCustomer[] {
  if (typeof window === 'undefined') return defaultCustomerSeed;
  const key = getTenantCustomerStorageKey();
  try {
    const stored = localStorage.getItem(key);
    return getTenantAdminInitialData(stored ? (JSON.parse(stored) as TenantCustomer[]) : null, defaultCustomerSeed);
  } catch {
    return defaultCustomerSeed;
  }
}

export function saveTenantCustomers(customers: TenantCustomer[]): void {
  if (typeof window === 'undefined') return;
  const key = getTenantCustomerStorageKey();
  localStorage.setItem(key, JSON.stringify(customers));
  window.dispatchEvent(new CustomEvent('salonsys_customers_updated', { detail: { key, customers } }));
}

export function findCustomerByPhoneOrId(
  query: string,
  customers: TenantCustomer[],
): TenantCustomer | undefined {
  const cleanQuery = query.trim().toLowerCase();
  const digits = normalizeDigits(query);
  if (!cleanQuery) return undefined;

  return customers.find((c) => {
    if (c.id.toLowerCase() === cleanQuery) return true;
    if (digits.length >= 6 && normalizeDigits(c.phone).includes(digits)) return true;
    if (c.phone.replace(/\s/g, '') === cleanQuery.replace(/\s/g, '')) return true;
    if (c.name.toLowerCase() === cleanQuery) return true;
    return false;
  });
}

export function searchCustomers(
  query: string,
  customers: TenantCustomer[],
  limit = 8,
): TenantCustomer[] {
  const cleanQuery = query.trim().toLowerCase();
  const digits = normalizeDigits(query);
  if (!cleanQuery) return customers.slice(0, limit);

  return customers
    .filter((c) => {
      const matchName = c.name.toLowerCase().includes(cleanQuery);
      const matchPhone = digits.length >= 3 && normalizeDigits(c.phone).includes(digits);
      const matchId = c.id.toLowerCase().includes(cleanQuery);
      const matchEmail = c.email?.toLowerCase().includes(cleanQuery);
      return matchName || matchPhone || matchId || matchEmail;
    })
    .slice(0, limit);
}
