/**
 * Lớp **adapter** của quầy lễ tân: mặc dữ liệu máy chủ lại thành đúng hình dạng mà cây render
 * hiện có đang đọc, và rút ra vài thứ hiển thị suy được từ chúng.
 *
 * Đây là ý tưởng đã gánh cả lát cắt ngày 14–15: nối cổng lễ tân vào API **mà không viết lại**
 * năm nghìn dòng JSX. Đổi lại, mọi chỗ hai bên lệch nhau đều phải được giải quyết ở đây chứ
 * không phải trong màn hình — nên đây cũng là nơi đọc đầu tiên khi một con số trên quầy trông
 * lạ so với dữ liệu thật.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27.
 */

import type { AppointmentApiStatus, AppointmentDto } from '../../services/appointments';
import type { SalesInvoiceDto } from '../../services/salesInvoices';
import { COMMON_ALLERGY_SPECIAL_NOTES } from './catalogs';
import { formatMinutes, money, nowTime } from './format';
import type {
  AppointmentExtras,
  AppointmentStatus,
  InvoiceLineDraft,
  ReceptionAppointment,
  ReceptionPayment
} from './types';

export const extractCustomerAlerts = (appointment: ReceptionAppointment) => {
  const alerts: Array<{ label: string; shortLabel: string; tone: string; icon: string }> = [];
  const noteText = `${appointment.note || ''}`.toLowerCase();

  // If explicit allergies / tags
  (appointment.allergies || []).forEach((a) => {
    const found = COMMON_ALLERGY_SPECIAL_NOTES.find((item) => item.label.toLowerCase() === a.toLowerCase() || item.shortLabel.toLowerCase() === a.toLowerCase() || a.toLowerCase().includes(item.shortLabel.toLowerCase()));
    if (found) {
      if (!alerts.some((al) => al.shortLabel === found.shortLabel)) {
        alerts.push({ label: found.label, shortLabel: found.shortLabel, tone: found.tone, icon: found.icon });
      }
    } else {
      alerts.push({ label: a, shortLabel: a, tone: 'bg-rose-500/10 text-rose-600 border border-rose-500/30', icon: '⚠️' });
    }
  });

  (appointment.specialTags || []).forEach((t) => {
    if (!alerts.some((al) => al.label.toLowerCase() === t.toLowerCase())) {
      const found = COMMON_ALLERGY_SPECIAL_NOTES.find((item) => item.label.toLowerCase() === t.toLowerCase() || item.shortLabel.toLowerCase() === t.toLowerCase());
      if (found) {
        alerts.push({ label: found.label, shortLabel: found.shortLabel, tone: found.tone, icon: found.icon });
      } else {
        alerts.push({ label: t, shortLabel: t, tone: 'bg-purple-500/10 text-purple-600 border border-purple-500/30', icon: '⭐' });
      }
    }
  });

  // Keyword extraction fallback from note
  if (noteText.includes('axeton') || noteText.includes('cồn') || (noteText.includes('dị ứng') && !alerts.some((a) => a.shortLabel.includes('axeton') || a.shortLabel.includes('Dị ứng')))) {
    if (!alerts.some((a) => a.shortLabel.includes('axeton') || a.shortLabel.includes('dị ứng'))) {
      alerts.push({ label: 'Dị ứng Axeton / Cồn / Hóa chất', shortLabel: 'Dị ứng axeton/cồn', tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30', icon: '⚠️' });
    }
  }
  if (noteText.includes('da mỏng') || noteText.includes('da tay mỏng') || noteText.includes('nhạy cảm') || noteText.includes('dễ rát')) {
    if (!alerts.some((a) => a.shortLabel.includes('Da tay mỏng') || a.shortLabel.includes('mỏng') || a.shortLabel.includes('nhạy cảm'))) {
      alerts.push({ label: 'Da tay mỏng / nhạy cảm', shortLabel: 'Da mỏng nhạy cảm', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30', icon: '⚠️' });
    }
  }
  if (noteText.includes('móng yếu') || noteText.includes('móng mỏng') || noteText.includes('dễ gãy')) {
    if (!alerts.some((a) => a.shortLabel.includes('mỏng') || a.shortLabel.includes('Móng'))) {
      alerts.push({ label: 'Móng yếu / mỏng', shortLabel: 'Móng mỏng yếu', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30', icon: '💅' });
    }
  }
  if (noteText.includes('bạc hà') || noteText.includes('tinh dầu')) {
    if (!alerts.some((a) => a.shortLabel.includes('bạc hà'))) {
      alerts.push({ label: 'Không dùng tinh dầu / Bạc hà', shortLabel: 'Tránh bạc hà', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30', icon: '🌿' });
    }
  }
  if (noteText.includes('nhẹ tay') || noteText.includes('sợ đau')) {
    if (!alerts.some((a) => a.shortLabel.includes('nhẹ tay'))) {
      alerts.push({ label: 'Yêu cầu làm nhẹ tay', shortLabel: 'Làm nhẹ tay', tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30', icon: '✨' });
    }
  }
  if (noteText.includes('vip') || noteText.includes('thành viên') || noteText.includes('khó tính')) {
    if (!alerts.some((a) => a.shortLabel.includes('VIP'))) {
      alerts.push({ label: 'Khách VIP / Tiêu chuẩn khắt khe', shortLabel: 'Khách VIP', tone: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30', icon: '⭐' });
    }
  }

  return alerts;
};




/** Sáu trạng thái máy chủ dùng, ánh xạ sang bảy trạng thái của giao diện cũ. */
export const toPortalStatus = (status: AppointmentApiStatus): AppointmentStatus => status;

/**
 * Một lịch hẹn của máy chủ, mặc lại hình dạng mà cây render đang dùng.
 *
 * Vì sao có lớp chuyển đổi này thay vì sửa cây render theo DTO: `ReceptionistPortal.tsx` dài
 * hơn năm nghìn dòng và đọc `appointment.start`, `appointment.duration`, `appointment.staff`
 * ở hàng trăm chỗ. Đổi hình dạng nghĩa là sửa từng chỗ ấy — công việc dài, rủi ro cao, và
 * không mua lại được gì cho người dùng. Lộ trình §5 ngày 14–15 nói thẳng: đừng viết lại file
 * này, chỉ thay chỗ khởi tạo state và các hàm ghi.
 *
 * @param price Tổng giá lấy từ danh mục dịch vụ. Lịch hẹn ở máy chủ **không lưu giá** —
 *   BR-SVC-006 chốt giá tại thời điểm lập hóa đơn, không phải lúc đặt lịch — nên con số ở đây
 *   chỉ là ước tính để quầy nhìn, và hóa đơn thật vẫn do máy chủ tính.
 */
/**
 * Một hóa đơn của máy chủ, mặc lại hình dạng mà màn thu tiền đang dùng.
 *
 * Cùng lý do với `toReceptionAppointment`: cây render đọc `payment.paid`, `payment.items`,
 * `payment.audit` ở hàng chục chỗ, và đổi hình dạng của chúng không mua lại gì cho người dùng.
 *
 * Ba chỗ đáng chú ý trong phép ánh xạ:
 *
 * - **`deposit` và `refunded` đọc từ các dòng thu**, không phải hai cột riêng. BR-PAY-002 nói
 *   ba loại dòng tiền cùng nằm một bảng, và tiền cọc là loại `DEPOSIT` do BR-APT-031 chuyển
 *   sang lúc lập hóa đơn.
 * - **`audit` dựng lại từ chính các dòng thu.** Máy chủ không lưu nhật ký dạng câu chữ trên
 *   hóa đơn — nó ghi vào bảng nhật ký kiểm toán (BR-AUD-001) — nhưng mỗi dòng tiền tự nó đã là
 *   một sự kiện có giờ, có số tiền, có phương thức.
 * - **`cashier` rỗng.** Máy chủ có lưu người lập hóa đơn nhưng không gửi ra trong DTO; tên
 *   người thu nằm ở nhật ký kiểm toán. Bịa ra tên người đang đăng nhập sẽ ghi sai người cho
 *   mọi hóa đơn do ca trước lập.
 */
/**
 * Gộp mẫu vẽ, màu sơn và sản phẩm kèm theo vào **tên dòng hóa đơn**.
 *
 * Máy chủ chỉ có tên và đơn giá cho một dòng nhập tay (BR-INV-012) — không có cột nào cho
 * "mẫu vẽ độ khó 3" hay "màu Merlot". Ba thứ đó thuộc thư viện mẫu nail, một module ở mức C
 * của §9.3, nên chúng đi vào phần tên để hóa đơn in ra vẫn nói đủ thứ khách đã dùng.
 */
export const describeInvoiceLine = (line: InvoiceLineDraft): string => {
  let name = line.name.trim();

  if (line.fromCustomerName) name = `[${line.fromCustomerName}] ${name}`;

  if (line.designName) {
    const difficulty = line.difficultyLabel || (line.designLevel ? `Độ khó mức ${line.designLevel}` : '');
    name += ` + Mẫu: ${line.designName}${difficulty ? ` (${difficulty})` : ''}`;
  }

  if (line.attachedColorName) name += ` · Màu: ${line.attachedColorName}`;
  if (line.attachedProductName) name += ` · Kèm: ${line.attachedProductName}`;

  return name;
};

export const toReceptionPayment = (dto: SalesInvoiceDto): ReceptionPayment => {
  const sumOf = (type: 'DEPOSIT' | 'REFUND') => dto.payments
    .filter((row) => row.type === type)
    .reduce((total, row) => total + Math.abs(row.amount), 0);

  const collectedRows = dto.payments.filter((row) => row.type === 'PAYMENT');
  const last = collectedRows[collectedRows.length - 1];
  const issuedAt = new Date(dto.createdAt);
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    id: dto.id,
    appointmentId: dto.appointmentId || undefined,
    customer: dto.customerName || dto.customerPhone,
    phone: dto.customerPhone,
    branch: dto.branchId,
    createdAt: `${issuedAt.toLocaleDateString('vi-VN')} · ${pad(issuedAt.getHours())}:${pad(issuedAt.getMinutes())}`,
    subtotal: dto.subtotal,
    discount: dto.discount,
    tip: dto.tip,
    deposit: sumOf('DEPOSIT'),
    total: dto.total,
    paid: dto.collected,
    refunded: sumOf('REFUND'),
    status: dto.status,
    method: last?.method,
    reference: last?.reference || undefined,
    splitPayments: collectedRows.length > 1
      ? collectedRows.map((row) => ({
        method: row.method,
        amount: row.amount,
        reference: row.reference || undefined
      }))
      : undefined,
    cashier: '—',
    source: dto.appointmentId ? 'Từ lịch hẹn' : 'Bán lẻ tại quầy',
    items: dto.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      amount: line.lineTotal,
      staff: dto.staffName || '—'
    })),
    note: dto.note || undefined,
    audit: dto.payments.map((row) => {
      const at = new Date(row.paidAt);
      const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
      const label = row.type === 'DEPOSIT' ? 'Tiền cọc' : row.type === 'REFUND' ? 'Hoàn tiền' : 'Thu';

      return `${clock} · ${label} ${Math.abs(row.amount).toLocaleString('vi-VN')}đ (${row.method})${row.reason ? ` — ${row.reason}` : ''}`;
    })
  };
};

export const toReceptionAppointment = (
  dto: AppointmentDto,
  price: number,
  extras: AppointmentExtras
): ReceptionAppointment => {
  const start = new Date(dto.startAt);
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    id: dto.id,
    customerId: dto.customerId,
    customer: dto.customerName || dto.customerPhone,
    phone: dto.customerPhone,
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    duration: dto.totalMinutes,
    service: dto.services[0]?.serviceName || 'Dịch vụ',
    services: dto.services.map((line) => line.serviceName),
    staff: dto.staffName,
    branch: dto.branchId,
    source: dto.source,
    status: toPortalStatus(dto.status),
    price,
    deposit: dto.deposit,
    note: dto.note || '',
    station: dto.station || undefined,
    createdAt: dto.createdAt,
    ...extras
  };
};

export const getServiceTimerStatus = (appointment: ReceptionAppointment, nowTimeString?: string) => {
  if (appointment.status !== 'IN_SERVICE') return null;

  const currentNow = nowTimeString || nowTime();
  const [nowH, nowM] = currentNow.split(':').map(Number);
  const nowMinutes = (nowH * 60) + nowM;

  let startMinutes = 0;
  if (appointment.serviceStartedAt) {
    try {
      const d = new Date(appointment.serviceStartedAt);
      if (!isNaN(d.getTime())) {
        startMinutes = d.getHours() * 60 + d.getMinutes();
      } else {
        const [h, m] = appointment.start.split(':').map(Number);
        startMinutes = h * 60 + m;
      }
    } catch {
      const [h, m] = appointment.start.split(':').map(Number);
      startMinutes = h * 60 + m;
    }
  } else {
    const [h, m] = appointment.start.split(':').map(Number);
    startMinutes = h * 60 + m;
  }

  let elapsedMinutes = nowMinutes - startMinutes;
  if (elapsedMinutes < 0) elapsedMinutes = Math.max(10, 60 - Math.abs(elapsedMinutes)); // Wrap-around safeguard
  if (elapsedMinutes > 300) elapsedMinutes = Math.min(elapsedMinutes, (appointment.duration || 60) + 25);

  const duration = (appointment.duration || 60) + (appointment.serviceExtendedMinutes || 0);
  const isOverrun = elapsedMinutes > duration;
  const overrunMinutes = Math.max(0, elapsedMinutes - duration);
  const remainingMinutes = Math.max(0, duration - elapsedMinutes);
  const percent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / duration) * 100)));

  return {
    elapsedMinutes,
    duration,
    isOverrun,
    overrunMinutes,
    remainingMinutes,
    percent,
  };
};
