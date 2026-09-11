/**
 * Tầng dữ liệu của bàn lễ tân, gom vào một chỗ.
 *
 * Trước ngày 27, năm khối này nằm rải trong `ReceptionistPortal.tsx` — bảng giá ở một chỗ, lịch
 * hẹn cách đó trăm dòng, hóa đơn và kỹ thuật viên ở tít dưới — xen giữa là state của biểu mẫu,
 * hộp thoại và bộ lọc. Đọc màn hình ấy để biết "dữ liệu từ đâu ra" là một cuộc đi săn.
 *
 * Hook này **không đổi hành vi một chút nào**: cùng thứ tự gọi hook, cùng phép suy ra, cùng tên
 * biến trả về đúng như cây render vẫn đọc. Nó chỉ trả lời gọn một câu — quầy lễ tân đọc bốn
 * nguồn của máy chủ (dịch vụ, lịch hẹn, nhân viên, hóa đơn), cộng hai bản đồ chỉ sống ở client
 * cho những thứ máy chủ cố ý không có cột (§9.4).
 *
 * Ranh giới cố ý: **chỉ ĐỌC**. Mọi thao tác ghi nghiệp vụ vẫn ở lại màn hình, vì chúng còn phải
 * đóng hộp thoại, hiện toast và dọn biểu mẫu — những việc thuộc về giao diện chứ không thuộc về
 * dữ liệu.
 */

import { useMemo, useState } from 'react';
import useAppointments from '../../hooks/useAppointments';
import useCustomers from '../../hooks/useCustomers';
import useSalesInvoices from '../../hooks/useSalesInvoices';
import useSalonServices from '../../hooks/useSalonServices';
import useStaff from '../../hooks/useStaff';
import { toReceptionAppointment, toReceptionPayment } from './adapters';
import { technicianShiftMeta } from './constants';
import { readStorage } from './storage';
import type {
  AppointmentExtras,
  CatalogItem,
  ReceptionTechnician,
  TechnicianShift,
  TechnicianStatus
} from './types';

export interface ReceptionDeskParams {
  /** Tiệm đang làm việc, lấy từ phiên đăng nhập. Rỗng thì không hook nào gọi API. */
  tenantId: string | null;
  /** Ngày đang xem trên bảng lịch. Đây là state của màn hình, nên nó đi vào từ ngoài. */
  boardDate: string;
  /** Khóa localStorage của phần trang trí lịch hẹn — theo tiệm VÀ theo chi nhánh. */
  appointmentExtrasStorageKey: string;
  /** Khóa localStorage của chấm công kỹ thuật viên. */
  technicianStorageKey: string;
}

export default function useReceptionDesk({
  tenantId,
  boardDate,
  appointmentExtrasStorageKey,
  technicianStorageKey
}: ReceptionDeskParams) {
  /*
    Bảng giá dịch vụ — dữ liệu THẬT từ ngày 14, và CHỈ dữ liệu thật từ ngày 25.

    Đây là điều kiện để đặt lịch chạy được chút nào: API chỉ nhận mã dịch vụ có thật, mà bảng
    giá mẫu trong `localStorage` thì mang những cái tên do bộ nạp giao diện bịa ra ("Nail Art
    Premium"…). Tra một cái tên bịa trong danh mục thật sẽ không ra gì, và mọi lần tiếp nhận
    khách đều dừng ở câu "dịch vụ không còn trong bảng giá".

    Ngày 14 vẫn lùi về `servicesData` của localStorage khi máy chủ trả danh sách rỗng, để màn
    hình có thứ trình bày. Nay bỏ hẳn phép lùi ấy: nó trộn ba chuyện khác hẳn nhau vào cùng một
    hình — đang tải, gọi hỏng, và tiệm thật sự chưa khai dịch vụ nào — mà người ở quầy thì không
    có cách nào phân biệt. Ba trạng thái ấy nay do phần hiển thị nói ra, mỗi trạng thái một câu.
  */
  const salonServices = useSalonServices(true, tenantId);

  const serviceCatalog: CatalogItem[] = useMemo(
    () => salonServices.services
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category || 'Dịch vụ',
        duration: item.durationMinutes
      })),
    [salonServices.services]
  );

  /*
    ── Lịch hẹn: dữ liệu thật, từ ngày 14 ────────────────────────────────────────────────
    Trước đây đây là một `useState` đọc `localStorage`. Nay nó là kết quả suy ra từ hook, và
    đó là khác biệt quan trọng nhất của cả màn hình: KHÔNG còn hàm `setAppointments` nào.

    Cố ý bỏ hẳn phép vá mảng tại chỗ. Đây là màn hình mà hai máy ở quầy cùng mở một lúc là
    chuyện thường; vá tại chỗ thì máy này không bao giờ thấy lịch máy kia vừa đặt, và hai
    người sẽ xếp hai khách vào cùng một giờ mà đều tin mình đúng. Mọi thao tác ghi vì vậy
    gọi API rồi để hook nạp lại — chậm hơn một lời gọi mạng, đổi lấy việc màn hình luôn nói
    đúng thứ máy chủ đang giữ.
  */
  const appointmentBoard = useAppointments(true, tenantId, boardDate);

  const [appointmentExtras, setAppointmentExtras] = useState<Record<string, AppointmentExtras>>(
    () => readStorage(appointmentExtrasStorageKey, {} as Record<string, AppointmentExtras>)
  );

  const appointments = useMemo(() => appointmentBoard.appointments.map((dto) => {
    const price = dto.services.reduce((total, line) => {
      const match = serviceCatalog.find((item) => item.name === line.serviceName);
      return total + (match ? match.price : 0);
    }, 0);

    return toReceptionAppointment(dto, price, appointmentExtras[dto.id] || {});
  }), [appointmentBoard.appointments, appointmentExtras, serviceCatalog]);

  /** Tra ngược về bản ghi gốc của máy chủ, cho những chỗ cần `staffId` hoặc `nextStatuses`. */
  const appointmentDtoById = useMemo(
    () => new Map(appointmentBoard.appointments.map((dto) => [dto.id, dto])),
    [appointmentBoard.appointments]
  );

  const staffDirectory = useStaff(true, tenantId);
  const customerDirectory = useCustomers(true, tenantId);


  /** Ghi phần trang trí chỉ sống ở client, kèm lưu xuống localStorage. */
  const patchAppointmentExtras = (id: string, patch: AppointmentExtras) => {
    setAppointmentExtras((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } };

      try {
        localStorage.setItem(appointmentExtrasStorageKey, JSON.stringify(next));
      } catch {
        // Hết dung lượng thì bỏ qua: đây là phần trang trí, mất nó không mất dữ liệu thật.
      }

      return next;
    });
  };
  /*
    ── Hóa đơn: dữ liệu thật, từ ngày 15 ────────────────────────────────────────────────
    Cùng khuôn với lịch hẹn ở ngày 14: không còn `setPayments`, mọi thao tác ghi gọi API rồi
    để hook nạp lại. Ở đây phép nạp lại còn quan trọng hơn — một lần thu tiền có thể làm đổi
    cả một bản ghi KHÁC, vì BR-APT-026 cho lịch hẹn tự hoàn tất khi hóa đơn thu đủ.
  */
  const invoiceBook = useSalesInvoices(true, tenantId, boardDate);

  const payments = useMemo(
    () => invoiceBook.invoices.map(toReceptionPayment),
    [invoiceBook.invoices]
  );

  /** Tra ngược về hóa đơn gốc của máy chủ, cho những chỗ cần `remaining` hoặc danh sách dòng thu. */
  const invoiceDtoById = useMemo(
    () => new Map(invoiceBook.invoices.map((dto) => [dto.id, dto])),
    [invoiceBook.invoices]
  );
  /*
    ── Kỹ thuật viên: danh sách thật, chấm công ở client ─────────────────────────────────
    Hồ sơ nhân viên đến từ API — đó là điều bắt buộc, vì phân công lịch hẹn cần MÃ nhân viên
    có thật; một danh sách tên bịa thì không lịch nào đặt được.

    Nhưng bảy trạng thái mà quầy dùng — có mặt, đang phục vụ, nghỉ giải lao, báo ốm, đi trễ —
    là **chấm công**, và §9.4 xếp chấm công vào nhóm bỏ hẳn khỏi MVP. Máy chủ chỉ có bốn trạng
    thái nhân sự và không có cột nào cho giờ vào ca thực tế. Nên chúng ở lại client, trong một
    bản đồ theo mã nhân viên — cùng cách đã làm với phần trang trí của lịch hẹn.
  */
  const [technicianAttendance, setTechnicianAttendance] = useState<Record<string, Partial<ReceptionTechnician>>>(
    () => readStorage(technicianStorageKey, {} as Record<string, Partial<ReceptionTechnician>>)
  );

  const patchTechnicianAttendance = (id: string, patch: Partial<ReceptionTechnician>) => {
    setTechnicianAttendance((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } };

      try {
        localStorage.setItem(technicianStorageKey, JSON.stringify(next));
      } catch {
        // Hết dung lượng thì bỏ qua: chấm công mất đi không mất dữ liệu thật nào.
      }

      return next;
    });
  };

  const technicians: ReceptionTechnician[] = useMemo(() => {
    // Không lùi về danh sách mẫu khi máy chủ trả rỗng — cùng lý do đã ghi ở bảng giá dịch vụ.
    // Ở đây hậu quả còn nặng hơn: phân công lịch hẹn cần MÃ nhân viên có thật, nên một cái tên
    // bịa chỉ dẫn tới một lời từ chối ở bước cuối, sau khi người ở quầy đã hỏi khách xong.
    const live = staffDirectory.staff.filter((item) => item.role === 'TECHNICIAN');

    return live.map((item) => {
      const attendance = technicianAttendance[item.id] || {};
      const startHour = Number(item.shiftStart.slice(0, 2)) || 0;
      const shift: TechnicianShift = startHour >= 13 ? 'AFTERNOON' : startHour >= 11 ? 'FULL_DAY' : 'MORNING';

      // BR-EMP-005 quyết định người này có mặt hay không; chấm công của quầy chỉ tinh chỉnh
      // bên trong nhóm "đang làm việc", không được phép biến một người đã nghỉ việc thành
      // người sẵn sàng nhận khách.
      const baseStatus: TechnicianStatus = item.status === 'WORKING'
        ? 'PRESENT'
        : item.status === 'LEAVE' ? 'ON_LEAVE' : 'NOT_CHECKED_IN';

      return {
        id: item.id,
        name: item.fullName,
        initials: item.fullName.split(' ').slice(-2).map((part) => part[0] || '').join('').toUpperCase(),
        specialty: item.skills[0] || 'Nail Technician',
        skills: item.skills.length ? item.skills : ['Nail Technician'],
        shift,
        shiftLabel: `${item.shiftStart}–${item.shiftEnd}`,
        status: item.status === 'WORKING' ? (attendance.status || baseStatus) : baseStatus,
        branch: item.branchId,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        leaveNote: attendance.leaveNote,
        avatarTone: 'from-brand-secondary to-brand-secondary'
      };
    });
  }, [staffDirectory.staff, technicianAttendance]);

  return {
    salonServices,
    serviceCatalog,
    appointmentBoard,
    appointments,
    appointmentDtoById,
    appointmentExtras,
    setAppointmentExtras,
    patchAppointmentExtras,
    staffDirectory,
    customerDirectory,
    invoiceBook,
    payments,
    invoiceDtoById,
    technicianAttendance,
    patchTechnicianAttendance,
    technicians
  };
}
