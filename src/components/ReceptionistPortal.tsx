import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Banknote,
  Bell,
  BadgeCheck,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Flame,
  HelpCircle,
  Hourglass,
  Image,
  Info,
  Layers,
  Loader2,
  LogOut,
  Menu,
  Merge,
  Minus,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Split,
  Store,
  Sun,
  Tag,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';
import { resetTenantMockStorage } from '../utils/mockDataReset';
import { validateAndCalculatePromotion, type LoyaltyProgram } from '../utils/promotionUtils';
import { serviceSeed, type SalonService } from './TenantAdminServices';
import { designSeed, colorSeed, type NailDesign, type PolishColor } from './TenantAdminNailGallery';
import { Button, Field, MockDataNotice, Modal, StatusBadge } from './ui';
import { tenantStorageKey, tenantStorageScope } from '../utils/tenantStorage';
import useReceptionDesk from '../features/reception/useReceptionDesk';
import type {
  PaymentApiMethod,
  SalesInvoiceDto,
  SalesInvoiceLineInput
} from '../services/salesInvoices';

import { describeApiError, type ApiError } from '../services/apiClient';
import type {
  AppointmentApiStatus,
  AppointmentDto,
  AppointmentWarning
} from '../services/appointments';

import {
  ART_DIFFICULTY_PRESETS,
  COMMON_ALLERGY_SPECIAL_NOTES,
  NAIL_ART_TEMPLATES,
  POLISH_COLOR_OPTIONS,
  type ArtDifficultyPreset,
  type NailArtTemplate,
  type PolishColorOption
} from '../features/reception/catalogs';
import {
  appointmentStatusLabel,
  methodMeta,
  navItems,
  technicianShiftMeta,
  technicianStatusMeta
} from '../features/reception/constants';
import {
  invoiceStaff,
  productCatalog,
  stationsFor
} from '../features/reception/mockSeed';
import { readStorage } from '../features/reception/storage';
import { describeInvoiceLine } from '../features/reception/adapters';
import {
  SALON_CLOSE_MINUTES,
  SALON_LAST_BOOKING_MINUTES,
  SALON_OPEN_MINUTES,
  formatMinutes,
  getOperationalDefaultTime,
  makeId,
  money,
  nowTime,
  today
} from '../features/reception/format';
import type {
  AppointmentEditForm,
  ArtCustomizerForm,
  AppointmentExtras,
  AppointmentSource,
  AppointmentStatus,
  BranchCode,
  CatalogItem,
  DeskQueueFilter,
  InvoiceLineDraft,
  InvoiceLineType,
  PaymentForm,
  PaymentMethod,
  QuickWalkInForm,
  ReceptionAppointment,
  ReceptionPage,
  ReceptionPayment,
  ReceptionTechnician,
  ReceptionistPortalProps,
  ShiftState,
  SplitPaymentEntry,
  TechnicianEditForm,
  TechnicianShift,
  TechnicianStatus
} from '../features/reception/types';
const TenantAdminAppointments = lazy(() => import('./TenantAdminAppointments'));
const TenantAdminCustomers = lazy(() => import('./TenantAdminCustomers'));
const TenantAdminPayments = lazy(() => import('./TenantAdminPayments'));
const ReceptionistProducts = lazy(() => import('./ReceptionistProducts'));
const ReceptionistStations = lazy(() => import('./ReceptionistStations'));
const ReceptionistTechnicians = lazy(() => import('./ReceptionistTechnicians'));
const DeskScreen = lazy(() => import('../features/reception/screens/DeskScreen'));
const ArtCustomizerDialog = lazy(() => import('../features/reception/dialogs/ArtCustomizerDialog'));
const PaymentConfirmDialog = lazy(() => import('../features/reception/dialogs/PaymentConfirmDialog'));





export default function ReceptionistPortal({ account, themeMode, onThemeChange, onLogout }: ReceptionistPortalProps) {
  const tenantName = account.tenantName || 'Nailé Studio';
  /*
    Mã chi nhánh lấy thẳng từ phiên đăng nhập (BR-EMP-004), không còn thu hẹp về hai giá trị
    mẫu nữa — phép ép `account.branchCode === 'Q1' ? 'Q1' : 'Q3'` đã bỏ ở ngày 14 cùng lúc với
    việc mở kiểu `BranchCode`.

    Còn lại một chỗ lùi mặc định về 'Q3': tài khoản chủ tiệm không thuộc chi nhánh nào nên
    phiên của họ không có mã, mà màn hình này vẫn cần một chi nhánh để dựng sơ đồ ghế của dữ
    liệu mẫu. Với lễ tân — người thật sự dùng cổng này — nhánh ấy không bao giờ chạy.
  */
  const branchCode: BranchCode = account.branchCode || 'Q3';

  /*
    Khóa chi nhánh dùng để LỌC dữ liệu thật, tách hẳn khỏi `branchCode` vốn chỉ là nhãn hiển
    thị và là khóa tra sơ đồ ghế mẫu. Lẫn hai thứ này khiến màn hình rỗng trong im lặng: mọi
    DTO mang `BRN-LUMIERE-Q3`, còn phép lọc thì so với "Q3".

    Rỗng với chủ tiệm — họ không thuộc chi nhánh nào — và khi đó không lọc gì cả, đúng với
    BR-ISO-004: chỉ lễ tân mới bị thu hẹp theo chi nhánh.
  */
  const branchScopeId = account.branchId || null;
  /*
    Tên chi nhánh đến từ phiên đăng nhập. Trước đây mọi mã khác 'Q1' đều bị đoán thành "Quận 3"
    — phép đoán ấy chỉ đúng với đúng hai chi nhánh của bộ dữ liệu mẫu, còn với tiệm thật thì nó
    nói sai tên chi nhánh ngay trên thanh bên, chỗ người ở quầy nhìn cả ngày.
  */
  const branchLabel = account.branchName || `Chi nhánh ${branchCode}`;
  const branchName = account.branchName || `${tenantName} · ${branchLabel}`;
  const nextThemeMode = themeMode === 'dark' ? 'light' : 'dark';
  const appointmentStorageKey = tenantStorageKey('tenant-admin-appointments-v2');
  const paymentStorageKey = tenantStorageKey('tenant-admin-payments-v1');
  const technicianStorageKey = tenantStorageKey('receptionist-technicians-v1');
  /*
    Phần trang trí của lịch hẹn mà máy chủ không có cột để lưu — xem `AppointmentExtras`.
    Khóa theo cả chi nhánh vì hai quầy không dùng chung một ca làm việc.
  */
  const appointmentExtrasStorageKey = `${tenantStorageKey('receptionist-appointment-extras-v1')}:${account.branchCode || 'ALL'}`;
  const shiftStorageKey = `receptionist-shift-v1:${account.email}`;
  const servicesStorageKey = tenantStorageKey('tenant-admin-services-v2');
  const designsStorageKey = tenantStorageKey('tenant-admin-nail-designs-v1');
  const colorsStorageKey = tenantStorageKey('tenant-admin-nail-colors-v1');

  // Đọc đồng bộ dữ liệu dịch vụ, mẫu vẽ, màu sơn từ Tenant Admin
  const [servicesData, setServicesData] = useState<SalonService[]>(() => {
    const v2 = readStorage<SalonService[] | null>(servicesStorageKey, null);
    if (v2 && Array.isArray(v2) && v2.length > 0) return v2;
    const v1 = readStorage<SalonService[] | null>(tenantStorageKey('tenant-admin-services-v1'), null);
    if (v1 && Array.isArray(v1) && v1.length > 0) return v1;
    return serviceSeed;
  });

  const [designsData, setDesignsData] = useState<NailDesign[]>(() => {
    const saved = readStorage<NailDesign[] | null>(designsStorageKey, null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return designSeed;
  });

  const [colorsData, setColorsData] = useState<PolishColor[]>(() => {
    const saved = readStorage<PolishColor[] | null>(colorsStorageKey, null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return colorSeed;
  });

  // Lắng nghe thay đổi dữ liệu từ Tenant Admin theo thời gian thực
  useEffect(() => {
    const handleServicesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; services?: SalonService[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.services) {
          setServicesData(customEvent.detail.services);
        } else {
          setServicesData(readStorage(servicesStorageKey, serviceSeed));
        }
      }
    };

    const handleDesignsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; designs?: NailDesign[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.designs) {
          setDesignsData(customEvent.detail.designs);
        } else {
          setDesignsData(readStorage(designsStorageKey, designSeed));
        }
      }
    };

    const handleColorsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string; colors?: PolishColor[] }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        if (customEvent.detail?.colors) {
          setColorsData(customEvent.detail.colors);
        } else {
          setColorsData(readStorage(colorsStorageKey, colorSeed));
        }
      }
    };

    /*
      Sự kiện này từng là cách hai tab của cùng một trình duyệt báo nhau rằng lịch hẹn vừa
      đổi, hồi cả hai cùng đọc chung một khóa `localStorage`. Từ ngày 14 nguồn sự thật là máy
      chủ, nên việc đúng là nạp lại từ đó — dữ liệu đính kèm trong sự kiện có thể đã cũ hơn
      thứ máy chủ đang giữ, và nhận nó là tự nguyện quay về một bản chụp quá khứ.
    */
    const handleAppointmentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tenantName?: string }>;
      if (!customEvent.detail?.tenantName || customEvent.detail.tenantName === tenantName) {
        appointmentBoard.reload();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === servicesStorageKey) {
        setServicesData(readStorage(servicesStorageKey, serviceSeed));
      }
      if (e.key === designsStorageKey) {
        setDesignsData(readStorage(designsStorageKey, designSeed));
      }
      if (e.key === colorsStorageKey) {
        setColorsData(readStorage(colorsStorageKey, colorSeed));
      }
      // Khóa lịch hẹn trong localStorage không còn là nguồn sự thật, nên không nghe nữa.
    };

    window.addEventListener('salonsys_services_updated', handleServicesUpdated);
    window.addEventListener('salonsys_designs_updated', handleDesignsUpdated);
    window.addEventListener('salonsys_colors_updated', handleColorsUpdated);
    window.addEventListener('salonsys_appointments_updated', handleAppointmentsUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('salonsys_services_updated', handleServicesUpdated);
      window.removeEventListener('salonsys_designs_updated', handleDesignsUpdated);
      window.removeEventListener('salonsys_colors_updated', handleColorsUpdated);
      window.removeEventListener('salonsys_appointments_updated', handleAppointmentsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [servicesStorageKey, designsStorageKey, colorsStorageKey, appointmentStorageKey, tenantName]);

  // Catalog mẫu vẽ nail art đồng bộ từ Tenant Admin Gallery
  const nailArtTemplates: NailArtTemplate[] = useMemo(() => {
    const available = designsData.filter((d) => {
      if (d.status === 'HIDDEN') return false;
      if (d.branches && d.branches.length > 0 && !d.branches.includes(branchCode)) return false;
      return true;
    });
    if (available.length === 0) return NAIL_ART_TEMPLATES;
    return available.map((d) => ({
      id: d.id,
      name: d.name,
      defaultLevel: d.level || 2,
      category: d.collection || 'Bộ sưu tập',
      surcharge: d.surcharge || 0,
      description: d.notes || `Phong cách: ${d.styles?.join(', ') || 'Đặc biệt'} · Phụ liệu: ${d.materials?.join(', ') || 'Gel nghệ thuật'}`,
      tags: d.styles || [],
      duration: d.duration || 30,
      baseServiceId: d.baseServiceId,
      imageUrl: d.imageUrl,
      preview: d.preview,
      colors: d.colors,
      materials: d.materials,
    }));
  }, [designsData, branchCode]);

  // Catalog màu sơn đồng bộ từ Tenant Admin Gallery
  const polishColorOptions: PolishColorOption[] = useMemo(() => {
    const available = colorsData.filter((c) => {
      if (c.status === 'OUT') return false;
      if (c.branches && c.branches.length > 0 && !c.branches.includes(branchCode)) return false;
      return true;
    });
    if (available.length === 0) return POLISH_COLOR_OPTIONS;
    return available.map((c) => ({
      id: c.id,
      name: `${c.name} (${c.finish})`,
      brand: c.brand,
      code: c.code,
      hex: c.hex,
      finish: c.finish,
    }));
  }, [colorsData, branchCode]);

  const [page, setPage] = useState<ReceptionPage>('desk');
  const [appointmentBookingRequest, setAppointmentBookingRequest] = useState<{
    requestId: number;
    customerId: string;
    name: string;
    phone: string;
    branch: BranchCode;
    note: string;
    allergies: string;
    nailCondition: string;
    favoriteTechnician: string;
    tier?: string;
    points?: number;
    totalSpent?: number;
    visits?: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('receptionist_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('receptionist_sidebar_collapsed', String(next));
      } catch {
        // Preference optional
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Menu mobile đóng được bằng Escape như mọi lớp phủ khác.
  useEffect(() => {
    if (!sidebarOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [sidebarOpen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [boardDate, setBoardDate] = useState<string>(() => today());

  /*
    Toàn bộ phần ĐỌC của quầy nằm trong một hook — xem `features/reception/useReceptionDesk`.
    Tên trả về giữ nguyên như khi chúng còn nằm rải trong tệp này, nên cây render bên dưới không
    phải sửa một dòng nào.
  */
  const {
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
  } = useReceptionDesk({
    tenantId: account.tenantId || null,
    boardDate,
    appointmentExtrasStorageKey,
    technicianStorageKey
  });

  /*
    Giữ dịch vụ đang chọn trên hai biểu mẫu luôn nằm trong bảng giá THẬT.

    Giá trị khởi tạo của chúng là 'Gel Manicure' — một cái tên của bộ dữ liệu mẫu. Khi bảng giá
    lên dữ liệu thật, cái tên đó không còn tồn tại, nhưng thẻ `<select>` vẫn *hiển thị* mục đầu
    tiên vì trình duyệt không có gì khác để vẽ. Người ở quầy thấy "Chăm sóc da chân" đang được
    chọn, bấm gửi, rồi nhận về "dịch vụ không còn trong bảng giá" — một câu vô lý với thứ họ
    đang nhìn. Đây là lỗi chỉ xuất hiện khi hai nguồn dữ liệu gặp nhau, và nó im lặng cho tới
    tận lúc bấm nút.
  */
  /** Lỗi API hiện qua đúng dải thông báo mà màn hình này vốn dùng, không dựng cơ chế thứ hai. */
  const reportApiError = (error: ApiError) => setToast(describeApiError(error).message);

  /**
   * BR-APT-005 và BR-APT-013 — đặt trong quá khứ và đặt ngoài ca là **cảnh báo, không chặn**.
   * Chúng đi kèm một lần lưu ĐÃ thành công, nên phải hiện sau câu báo thành công chứ không
   * thay thế nó: người ở quầy cần biết lịch đã lưu trước, rồi mới tới chuyện cần để ý.
   */
  const reportWarnings = (warnings: AppointmentWarning[]) => {
    if (warnings.length === 0) return;

    window.setTimeout(() => setToast(warnings.map((item) => item.message).join(' · ')), 1200);
  };

  /**
   * Tên kỹ thuật viên trên biểu mẫu, đổi sang mã mà API cần.
   *
   * Biểu mẫu của cổng lễ tân chọn người bằng **tên** vì đó là thứ người ở quầy nói với nhau.
   * Máy chủ thì làm việc bằng mã. Chỗ dịch giữa hai thứ đó nằm ở đây, một lần duy nhất.
   */
  const staffIdByName = (name: string): string | null =>
    staffDirectory.staff.find((item) => item.fullName === name)?.id || null;

  /**
   * Hồ sơ khách theo số điện thoại, tạo mới nếu chưa có — BR-CUS-004.
   *
   * Mọi lịch hẹn bắt buộc gắn một hồ sơ khách, kể cả khách vãng lai vừa bước vào. Không có
   * khách ẩn danh: tổng chi tiêu và hạng khách ở BR-CUS-007 đều đọc ngược từ hóa đơn, nên một
   * lượt khách không có hồ sơ là một lượt biến mất khỏi mọi con số về sau.
   *
   * BR-CUS-002 — số điện thoại là duy nhất trong một tiệm, nên nó chính là khóa tra cứu.
   */
  const ensureCustomerId = async (phone: string, fullName: string): Promise<string | null> => {
    const trimmedPhone = phone.trim();
    const existing = customerDirectory.customers.find((item) => item.phone === trimmedPhone);

    if (existing) return existing.id;

    const created = await customerDirectory.createCustomer({
      phone: trimmedPhone,
      fullName: fullName.trim()
    });

    if (created.status === 'error') {
      reportApiError(created.error);
      return null;
    }

    return created.data.id;
  };

  /**
   * Dựng lại thân request "thay trọn" từ bản ghi máy chủ đang giữ.
   *
   * `PUT /api/appointments/{id}` là phép thay trọn: bỏ trống một trường là xóa trường đó. Khi
   * chỉ muốn đổi đúng một thứ — thêm ghi chú đối soát chẳng hạn — vẫn phải gửi đủ mọi trường
   * còn lại, và đây là chỗ lấy chúng ra để không ai phải nhớ danh sách ấy bằng tay.
   */
  const toSaveInput = (dto: AppointmentDto) => ({
    customerId: dto.customerId,
    staffId: dto.staffId,
    startAt: dto.startAt,
    serviceIds: dto.services.map((line) => line.serviceId),
    source: dto.source,
    station: dto.station || undefined,
    note: dto.note || undefined,
    deposit: dto.deposit
  });

  const [shift, setShift] = useState<ShiftState>(() => readStorage(shiftStorageKey, { status: 'OPEN', openedAt: new Date().toISOString(), openingCash: 1000000 }));
  const [clockTick, setClockTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const [walkInOpen, setWalkInOpen] = useState(false);
  const [quickWalkInOpen, setQuickWalkInOpen] = useState(false);
  const [quickWalkInForm, setQuickWalkInForm] = useState<QuickWalkInForm>({
    customer: '',
    phone: '',
    service: 'Gel Manicure',
    staff: '',
    station: '',
    duration: '60',
    price: '450000',
    allergies: [] as string[],
    note: '',
    quickAction: 'START_NOW' as 'START_NOW' | 'CHECK_IN_QUEUE',
  });

  const [paymentAppointment, setPaymentAppointment] = useState<ReceptionAppointment | null>(null);
  const [mergedAppointmentIds, setMergedAppointmentIds] = useState<string[]>([]);
  const [showMergeSelector, setShowMergeSelector] = useState(false);
  const [splitPaymentMode, setSplitPaymentMode] = useState(false);
  const [splitPaymentsList, setSplitPaymentsList] = useState<SplitPaymentEntry[]>([
    { id: 'SP-1', method: 'CASH', amount: 0, reference: '' },
  ]);
  const [splitEquallyCount, setSplitEquallyCount] = useState(2);
  const [showSplitCalc, setShowSplitCalc] = useState(false);

  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ReceptionAppointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<ReceptionAppointment | null>(null);
  const [shiftModal, setShiftModal] = useState<'OPEN' | 'CLOSE' | null>(null);
  const [toast, setToast] = useState('');
  const loyaltyStorageKey = tenantStorageKey('tenant-admin-loyalty-v1');
  const invoiceDraftsStorageKey = `${tenantStorageKey('receptionist-invoice-drafts-v1')}:${branchCode}`;
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>(() => readStorage(loyaltyStorageKey, []));
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [promoFeedback, setPromoFeedback] = useState<{ isError: boolean; text: string } | null>(null);

  const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, { lines: InvoiceLineDraft[]; form: { method: PaymentMethod; discount: string; tip: string; reference: string; note: string }; promoId?: string; mergedIds?: string[]; splitPayments?: SplitPaymentEntry[] }>>(() => readStorage(invoiceDraftsStorageKey, {}));

  const [formError, setFormError] = useState('');
  const [walkInErrors, setWalkInErrors] = useState<Record<string, string>>({});
  const [appointmentEditErrors, setAppointmentEditErrors] = useState<Record<string, string>>({});
  const [walkIn, setWalkIn] = useState({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: getOperationalDefaultTime(), duration: '60', price: '450000', note: '', allergies: [] as string[], specialTags: [] as string[], designName: '', designLevel: 0, designSurcharge: 0 });

  useEffect(() => {
    const firstName = serviceCatalog[0]?.name;
    if (!firstName) return;

    const known = (name: string) => serviceCatalog.some((item) => item.name === name);

    if (!known(walkIn.service)) setWalkIn((current) => ({ ...current, service: firstName }));
    if (!known(quickWalkInForm.service)) {
      setQuickWalkInForm((current) => ({ ...current, service: firstName }));
    }
  }, [serviceCatalog, walkIn.service, quickWalkInForm.service]);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineDraft[]>([]);
  const [invoiceCatalogTab, setInvoiceCatalogTab] = useState<'SERVICE' | 'ART' | 'PRODUCT'>('SERVICE');
  const [invoiceCatalogQuery, setInvoiceCatalogQuery] = useState('');
  const [invoiceCategory, setInvoiceCategory] = useState('Tất cả');
  const [cashAmount, setCashAmount] = useState('1000000');
  const [deleteReason, setDeleteReason] = useState('Tạo nhầm lịch');
  const [technicianQuery, setTechnicianQuery] = useState('');
  const [technicianStatusFilter, setTechnicianStatusFilter] = useState<'ALL' | TechnicianStatus>('ALL');
  const [technicianShiftFilter, setTechnicianShiftFilter] = useState<'ALL' | TechnicianShift>('ALL');
  const [technicianSpecialtyFilter, setTechnicianSpecialtyFilter] = useState('ALL');
  const [deskQueueFilter, setDeskQueueFilter] = useState<DeskQueueFilter>('ACTION');
  const [deskViewMode, setDeskViewMode] = useState<'QUEUE' | 'STATIONS' | 'STAFF'>('QUEUE');
  const [editingTechnician, setEditingTechnician] = useState<ReceptionTechnician | null>(null);
  const [technicianEditForm, setTechnicianEditForm] = useState<TechnicianEditForm>({ status: 'PRESENT', shift: 'FULL_DAY', checkIn: '', checkOut: '', leaveNote: '' });
  const [appointmentEditForm, setAppointmentEditForm] = useState<AppointmentEditForm>({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: getOperationalDefaultTime(), duration: '60', price: '450000', note: '', allergies: [] as string[], specialTags: [] as string[], designName: '', designLevel: 0, designSurcharge: 0 });

  // Modal tùy chỉnh mẫu vẽ & sản phẩm đi kèm cho 1 dòng dịch vụ
  const [customizingLine, setCustomizingLine] = useState<InvoiceLineDraft | null>(null);
  const [customizerForm, setCustomizerForm] = useState<ArtCustomizerForm>({
    basePrice: '0',
    designName: '',
    designLevel: 0,
    difficultyLabel: '',
    designSurcharge: '0',
    attachedColorCode: '',
    attachedColorName: '',
    attachedColorHex: '',
    attachedProductName: '',
    attachedProductPrice: 0,
    staff: 'Chưa phân công',
    customArtNote: '',
  });

  useEffect(() => {
    if (selectedPromoId && paymentAppointment) {
      const program = loyaltyPrograms.find((p) => p.id === selectedPromoId);
      if (program) {
        const result = validateAndCalculatePromotion({
          program,
          items: invoiceLines,
          customerUsageCount: 0,
        });
        if (!result.isValid) {
          setPromoFeedback({ isError: true, text: result.reason || 'Hóa đơn chưa đủ điều kiện áp dụng ưu đãi này.' });
          setPaymentForm((prev) => ({ ...prev, discount: '0' }));
        } else {
          setPromoFeedback({ isError: false, text: `Áp dụng thành công: ${program.name} (Giảm ${money(result.discountAmount)})` });
          setPaymentForm((prev) => ({ ...prev, discount: String(result.discountAmount) }));
        }
      }
    }
  }, [invoiceLines]);
  useEffect(() => {
    if (!paymentAppointment) return;
    if (!invoiceLines.length) return;
    setInvoiceDrafts((current) => {
      const updated = {
        ...current,
        [paymentAppointment.id]: {
          lines: invoiceLines,
          form: paymentForm,
          promoId: selectedPromoId,
        },
      };
      try {
        localStorage.setItem(invoiceDraftsStorageKey, JSON.stringify(updated));
      } catch {
        // quota ignore
      }
      return updated;
    });
  }, [paymentAppointment, invoiceLines, paymentForm, selectedPromoId, invoiceDraftsStorageKey]);
  /*
    🔴 Effect ghi lịch hẹn xuống localStorage rồi phát sự kiện đã bị GỠ ở ngày 14, và việc gỡ
    là bắt buộc chứ không phải dọn dẹp cho gọn.

    Nó tạo ra một vòng lặp vô hạn ngay khi lịch hẹn chuyển sang dữ liệu thật: mảng đổi → effect
    phát `salonsys_appointments_updated` → chỗ nghe gọi `reload()` → nạp lại → mảng mới có danh
    tính khác → effect chạy lại. Lần chạy thử đầu tiên bắn hơn mười lăm request giống hệt nhau
    trong chưa tới một giây.

    Nguyên nhân sâu hơn: đây là tàn dư của thời localStorage là nguồn sự thật, khi phát sự kiện
    là cách duy nhất để hai màn hình biết dữ liệu vừa đổi. Nay máy chủ giữ vai đó, nên việc ghi
    một bản sao xuống trình duyệt vừa thừa vừa nguy hiểm — nó dựng lại đúng cái nguồn sự thật
    thứ hai mà cả lát cắt này đi bỏ.
  */
  useEffect(() => localStorage.setItem(invoiceDraftsStorageKey, JSON.stringify(invoiceDrafts)), [invoiceDraftsStorageKey, invoiceDrafts]);
  useEffect(() => localStorage.setItem(paymentStorageKey, JSON.stringify(payments)), [paymentStorageKey, payments]);
  /*
    Hai effect cũ ghi cả danh sách kỹ thuật viên xuống localStorage rồi chuẩn hóa lại nó đã bỏ
    ở ngày 14: danh sách nay suy ra từ API mỗi lần đọc, còn phần chấm công thì `patchTechnicianAttendance`
    tự lưu. Giữ lại chúng là chép đè hồ sơ thật bằng một bản chụp của trình duyệt.
  */
  useEffect(() => localStorage.setItem(shiftStorageKey, JSON.stringify(shift)), [shift, shiftStorageKey]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /*
    Máy chủ đã thu hẹp theo chi nhánh cho lễ tân (BR-ISO-004) và theo ngày (tham số truy vấn
    của hook), nên phép lọc ở đây chỉ còn là lớp phòng thân cho trường hợp chủ tiệm mở cổng
    này — họ nhận về cả tiệm.
  */
  const branchTodayAppointments = useMemo(() => appointments
    .filter((appointment) => !branchScopeId || appointment.branch === branchScopeId),
  [appointments, branchScopeId]);
  const todayAppointments = useMemo(() => [...branchTodayAppointments]
    .sort((a, b) => a.start.localeCompare(b.start)), [branchTodayAppointments]);
  const activeAppointments = todayAppointments.filter((appointment) => ['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status));
  const upcomingAppointments = todayAppointments.filter((appointment) => ['PENDING', 'CONFIRMED'].includes(appointment.status));
  const branchTechnicians = useMemo(
    () => technicians.filter((technician) => !branchScopeId || technician.branch === branchScopeId),
    [branchScopeId, technicians]
  );
  const technicianSpecialties = useMemo(() => ['ALL', ...Array.from(new Set(branchTechnicians.map((technician) => technician.specialty)))], [branchTechnicians]);
  const filteredTechnicians = useMemo(() => {
    const query = technicianQuery.trim().toLowerCase();
    return branchTechnicians
      .filter((technician) => technicianStatusFilter === 'ALL' || technician.status === technicianStatusFilter)
      .filter((technician) => technicianShiftFilter === 'ALL' || technician.shift === technicianShiftFilter)
      .filter((technician) => technicianSpecialtyFilter === 'ALL' || technician.specialty === technicianSpecialtyFilter)
      .filter((technician) => !query || `${technician.name} ${technician.specialty}`.toLowerCase().includes(query));
  }, [branchTechnicians, technicianQuery, technicianShiftFilter, technicianSpecialtyFilter, technicianStatusFilter]);
  const technicianStats = {
    total: branchTechnicians.length,
    present: branchTechnicians.filter((technician) => ['PRESENT', 'SERVING', 'BREAK', 'LATE'].includes(technician.status)).length,
    serving: branchTechnicians.filter((technician) => technician.status === 'SERVING').length,
    notArrived: branchTechnicians.filter((technician) => technician.status === 'NOT_CHECKED_IN' || technician.status === 'LATE').length,
    reportedOff: branchTechnicians.filter((technician) => technician.status === 'SICK_REPORTED' || technician.status === 'ON_LEAVE').length,
  };
  /*
    Chỉ lọc theo việc người đó có mặt hay không.

    Phép lọc theo KỸ NĂNG đã bỏ ở ngày 14, và không phải vì tiện: BR-EMP-010 nói rõ kỹ năng
    chỉ để hiển thị và hệ thống **không cưỡng chế** khi phân công, còn §9.4 xếp "ràng buộc kỹ
    năng theo dịch vụ" vào nhóm bỏ hẳn khỏi MVP.

    Lỗi này chỉ lộ ra khi dữ liệu thật về: bộ dữ liệu mẫu ghi kỹ năng trùng nguyên văn tên
    dịch vụ nên phép so sánh luôn khớp, còn hồ sơ nhân viên thật ghi kỹ năng theo nhóm ("Gel",
    "Nail Art"). Kết quả là ô chọn kỹ thuật viên rỗng trơn và không giải thích gì — quầy không
    tiếp nhận được khách nào.
  */
  const assignableTechnicians = branchTechnicians.filter(
    (technician) => !['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE'].includes(technician.status)
  );
  const completedIds = new Set(payments.filter((payment) => payment.status === 'PAID').map((payment) => payment.appointmentId));
  const protectedAppointmentIds = new Set(payments.filter((payment) => ['PAID', 'PARTIAL', 'REFUNDED'].includes(payment.status)).map((payment) => payment.appointmentId).filter(Boolean));
  const paidToday = payments.filter((payment) => payment.status === 'PAID' && payment.createdAt.includes(new Date().toLocaleDateString('vi-VN')));
  const todayRevenue = paidToday.reduce((sum, payment) => sum + payment.paid, 0);
  const completedToday = todayAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
  const actionableAppointments = todayAppointments.filter((appointment) => ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'].includes(appointment.status));
  const unassignedAppointments = actionableAppointments.filter((appointment) => appointment.staff === 'Chưa phân công');
  const availableTechnicians = branchTechnicians.filter((technician) => technician.status === 'PRESENT');
  const servingTechnicians = branchTechnicians.filter((technician) => technician.status === 'SERVING');
  const occupiedStations = new Set(activeAppointments.map((appointment) => appointment.station).filter(Boolean)).size;
  const deskQueueAppointments = actionableAppointments.filter((appointment) => {
    if (deskQueueFilter === 'UPCOMING') return ['PENDING', 'CONFIRMED'].includes(appointment.status);
    if (deskQueueFilter === 'WAITING') return appointment.status === 'CHECKED_IN';
    if (deskQueueFilter === 'IN_SERVICE') return appointment.status === 'IN_SERVICE';
    return true;
  }).filter((appointment) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || `${appointment.customer} ${appointment.phone} ${appointment.service} ${appointment.staff} ${appointment.station || ''}`.toLowerCase().includes(query);
  }).sort((a, b) => {
    const priority: Record<AppointmentStatus, number> = { CHECKED_IN: 0, IN_SERVICE: 1, PENDING: 2, CONFIRMED: 3, COMPLETED: 4, CANCELLED: 5, NO_SHOW: 6, REFUNDED: 7 };
    return priority[a.status] - priority[b.status] || a.start.localeCompare(b.start);
  });
  const invoiceSubtotal = invoiceLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const invoiceDiscount = Math.max(0, Number(paymentForm.discount) || 0);
  const invoiceTip = Math.max(0, Number(paymentForm.tip) || 0);
  const invoiceTaxAndFees = 0;
  const totalMergedDeposit = (paymentAppointment?.deposit || 0) + appointments.filter((a) => mergedAppointmentIds.includes(a.id)).reduce((sum, a) => sum + a.deposit, 0);
  const invoiceTotal = Math.max(0, invoiceSubtotal - totalMergedDeposit - invoiceDiscount + invoiceTip + invoiceTaxAndFees);
  const totalSplitAllocated = splitPaymentsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const splitDifference = invoiceTotal - totalSplitAllocated;
  const cashCollectedToday = paidToday
    .filter((payment) => payment.method === 'CASH')
    .reduce((sum, payment) => sum + Math.max(0, payment.total - payment.deposit), 0);
  const expectedClosingCash = shift.openingCash + cashCollectedToday;
  const closingCashDifference = (Number(cashAmount) || 0) - expectedClosingCash;
  const deskAlerts = [
    ...activeAppointments
      .filter((appointment) => appointment.status === 'CHECKED_IN')
      .map((appointment) => ({ id: `waiting-${appointment.id}`, tone: 'cyan', title: `${appointment.customer} đang chờ`, detail: `${appointment.start} · ${appointment.service}${appointment.station ? ` · Ghế ${appointment.station}` : ' · Chưa xếp ghế'}` })),
    ...unassignedAppointments
      .map((appointment) => ({ id: `unassigned-${appointment.id}`, tone: 'amber', title: `${appointment.customer} chưa được phân công`, detail: `${appointment.start} · ${appointment.service}` })),
    ...upcomingAppointments
      .filter((appointment) => appointment.status === 'PENDING')
      .map((appointment) => ({ id: `pending-${appointment.id}`, tone: 'violet', title: `Lịch ${appointment.start} chờ xác nhận`, detail: `${appointment.customer} · ${appointment.phone}` })),
  ].slice(0, 5);
  const activeCatalog = invoiceCatalogTab === 'SERVICE' ? serviceCatalog : productCatalog;
  const invoiceCategories = invoiceCatalogTab === 'ART'
    ? ['Tất cả', ...Array.from(new Set(nailArtTemplates.map((item) => item.category)))]
    : ['Tất cả', ...Array.from(new Set(activeCatalog.map((item) => item.category)))];
  const filteredCatalog = activeCatalog.filter((item) => (
    (invoiceCategory === 'Tất cả' || item.category === invoiceCategory)
    && item.name.toLowerCase().includes(invoiceCatalogQuery.trim().toLowerCase())
  ));
  const filteredArtTemplates = nailArtTemplates.filter((item) => (
    (invoiceCategory === 'Tất cả' || item.category === invoiceCategory)
    && `${item.name} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(invoiceCatalogQuery.trim().toLowerCase())
  ));

  const requireOpenShift = () => {
    if (shift.status === 'OPEN') return true;
    setToast('Vui lòng mở ca trước khi thực hiện nghiệp vụ tại quầy.');
    return false;
  };

  const canTechnicianDoService = (technician: ReceptionTechnician, serviceName: string) => {
    const normalizedService = serviceName.trim().toLowerCase();
    if (!normalizedService) return true;
    if (technician.skills.some((skill) => skill.toLowerCase() === normalizedService || normalizedService.includes(skill.toLowerCase()) || skill.toLowerCase().includes(normalizedService))) return true;
    if (technician.specialty && (technician.specialty.toLowerCase().includes(normalizedService) || normalizedService.includes(technician.specialty.toLowerCase()))) return true;
    const foundService = servicesData.find(s => s.name.toLowerCase() === normalizedService);
    if (foundService?.requiredSkill && technician.skills.some(sk => sk.toLowerCase().includes(foundService.requiredSkill.toLowerCase()))) return true;
    return true;
  };

  useEffect(() => {
    if (!walkInOpen || walkIn.staff === 'Chưa phân công') return;
    const technician = branchTechnicians.find((item) => item.name === walkIn.staff);
    if (!technician || !canTechnicianDoService(technician, walkIn.service)) {
      setWalkIn((current) => ({ ...current, staff: 'Chưa phân công' }));
    }
  }, [branchTechnicians, walkIn.service, walkIn.staff, walkInOpen]);

  useEffect(() => {
    if (!editingAppointment || appointmentEditForm.staff === 'Chưa phân công') return;
    const technician = branchTechnicians.find((item) => item.name === appointmentEditForm.staff);
    if (!technician || !canTechnicianDoService(technician, appointmentEditForm.service)) {
      setAppointmentEditForm((current) => ({ ...current, staff: 'Chưa phân công' }));
    }
  }, [appointmentEditForm.service, appointmentEditForm.staff, branchTechnicians, editingAppointment]);

  const minutesOf = (value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };

  const validateAppointmentDraft = (draft: AppointmentEditForm, editingId?: string): Record<string, string> => {
    const errors: Record<string, string> = {};
    const phoneDigits = draft.phone.replace(/\D/g, '');
    const cleanPhone = draft.phone.replace(/[\s.-]/g, '');
    const duration = Number(draft.duration);
    const price = Number(draft.price);

    // 1. Kiểm tra thông tin khách hàng
    if (!draft.customer.trim()) {
      errors.customer = 'Vui lòng nhập tên khách hàng.';
    } else if (draft.customer.trim().length < 2) {
      errors.customer = 'Vui lòng nhập tên khách hàng tối thiểu 2 ký tự.';
    }

    if (!draft.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại khách hàng.';
    } else if (!/^(?:0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone) && !/^(?:\+84|0)[0-9\s.-]{8,12}$/.test(draft.phone.trim())) {
      errors.phone = 'Số điện thoại chưa đúng định dạng di động Việt Nam (gồm 10 số, ví dụ 0903123456).';
    } else {
      const duplicatedPhone = branchTodayAppointments.find((appointment) => (
        appointment.id !== editingId
        && appointment.phone.replace(/\D/g, '') === phoneDigits
        && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)
      ));
      if (duplicatedPhone) {
        errors.phone = `Khách hàng ${duplicatedPhone.customer} (${draft.phone}) đang có lịch ${duplicatedPhone.start} (${duplicatedPhone.service}).`;
      }
    }

    // 2. Kiểm tra dịch vụ
    if (!draft.service.trim()) {
      errors.service = 'Vui lòng chọn dịch vụ trước khi tiếp nhận khách.';
    }

    // 3. Phân công kỹ thuật viên
    const technician = branchTechnicians.find((item) => item.name === draft.staff);
    if (!draft.staff || draft.staff === 'Chưa phân công') {
      errors.staff = 'Vui lòng phân công kỹ thuật viên trước khi tạo hoặc bắt đầu dịch vụ.';
    } else if (!technician) {
      errors.staff = 'Kỹ thuật viên không thuộc chi nhánh hiện tại.';
    } else if (['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE', 'BREAK'].includes(technician.status)) {
      errors.staff = `${technician.name} hiện ${technicianStatusMeta[technician.status]?.label.toLowerCase() || 'vắng mặt'}, chưa thể nhận khách.`;
    } else if (!canTechnicianDoService(technician, draft.service)) {
      errors.staff = `${technician.name} không có khả năng làm dịch vụ ${draft.service}. Vui lòng chọn kỹ thuật viên khác.`;
    }

    // 4. Kiểm tra định dạng thời gian
    if (!draft.start || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start)) {
      errors.start = 'Vui lòng chọn giờ bắt đầu hợp lệ (định dạng HH:mm).';
    } else {
      const startMinutes = minutesOf(draft.start);
      const endMinutes = startMinutes + (Number.isFinite(duration) && duration > 0 ? duration : 60);

      // 5. KIỂM TRA NGHIÊM NGẶT GIỜ MỞ CỬA CỦA SALON (08:00 – 20:30)
      if (startMinutes < SALON_OPEN_MINUTES) {
        errors.start = `Salon chỉ mở cửa từ 08:00. Khung giờ ${draft.start} nằm ngoài giờ hoạt động.`;
      } else if (startMinutes > SALON_LAST_BOOKING_MINUTES) {
        errors.start = `Salon ngưng nhận khách mới sau 20:00 (đóng cửa lúc 20:30). Khung giờ ${draft.start} quá trễ.`;
      } else if (endMinutes > SALON_CLOSE_MINUTES) {
        errors.start = `Dịch vụ kéo dài ${duration} phút sẽ kết thúc lúc ${formatMinutes(endMinutes)} (sau giờ đóng cửa 20:30).`;
      }

      /*
        6. NGOÀI CA CỦA KỸ THUẬT VIÊN — bỏ chặn ở ngày 14.

        BR-APT-013 nói rõ: đặt lịch ngoài ca thì **cảnh báo, vẫn cho lưu**. Máy chủ đã cưỡng
        chế đúng như vậy và gửi về mảng `warnings` bên cạnh phản hồi thành công, nên giao diện
        chỉ việc hiện chúng.

        Trước đây chỗ này chặn cứng, và nó chặn thật: khách quen nhờ đúng một kỹ thuật viên
        làm nốt cuối ca là chuyện thường ở tiệm nail, mà quầy thì không có cách nào bỏ qua.
        Đây cũng là điểm khác giữa hai loại luật — trùng giờ kỹ thuật viên (BR-APT-011) mới là
        thứ chặn cứng, và nó do máy chủ trả `409 SLOT_CONFLICT`.
      */

      // Xung đột lịch Kỹ thuật viên
      if (!errors.staff && draft.staff && draft.staff !== 'Chưa phân công') {
        const conflictingAppointment = branchTodayAppointments.find((appointment) => {
          if (appointment.id === editingId || appointment.staff !== draft.staff || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
          const appointmentStart = minutesOf(appointment.start);
          const appointmentEnd = appointmentStart + appointment.duration;
          return startMinutes < appointmentEnd && endMinutes > appointmentStart;
        });
        if (conflictingAppointment) {
          const conflictEnd = formatMinutes(minutesOf(conflictingAppointment.start) + conflictingAppointment.duration);
          errors.staff = `${draft.staff} đang bận phục vụ ${conflictingAppointment.customer} từ ${conflictingAppointment.start} đến ${conflictEnd}.`;
        }
      }

      // Xung đột Ghế / Bàn
      if (draft.station) {
        const conflictingStation = branchTodayAppointments.find((appointment) => {
          if (appointment.id === editingId || appointment.station !== draft.station || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) return false;
          const appointmentStart = minutesOf(appointment.start);
          const appointmentEnd = appointmentStart + appointment.duration;
          return startMinutes < appointmentEnd && endMinutes > appointmentStart;
        });
        if (conflictingStation) {
          const stationEnd = formatMinutes(minutesOf(conflictingStation.start) + conflictingStation.duration);
          errors.station = `${draft.station} đang được dùng từ ${conflictingStation.start} đến ${stationEnd} bởi ${conflictingStation.customer}.`;
        }
      }
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      errors.duration = 'Thời lượng dịch vụ phải lớn hơn 0 phút.';
    } else if (duration > 240) {
      errors.duration = 'Thời lượng dịch vụ tối đa là 240 phút (4 giờ).';
    }

    if (!Number.isFinite(price) || price <= 0) {
      errors.price = 'Giá dự kiến phải lớn hơn 0đ.';
    }

    if (draft.station && !stationsFor(branchCode).includes(draft.station)) {
      errors.station = 'Ghế hoặc phòng không thuộc chi nhánh hiện tại.';
    }

    return errors;
  };

  /**
   * Nạp lại dữ liệu mẫu cho những phần **còn ở mức C** — thu tiền, kỹ thuật viên, ca làm việc.
   *
   * Cố ý KHÔNG đụng tới lịch hẹn nữa: từ ngày 14 lịch hẹn là dữ liệu thật trong database, và
   * một nút "nạp lại dữ liệu mẫu" mà ghi đè được lên nó thì đó không còn là nút trình diễn,
   * đó là một nút xóa dữ liệu. Bảng lịch chỉ được nạp lại từ máy chủ.
   */
  const loadMockReceptionData = () => {
    appointmentBoard.reload();
    invoiceBook.reload();
    // Danh sách kỹ thuật viên nay là dữ liệu thật; nút nạp dữ liệu mẫu không đụng tới nó.
    staffDirectory.reload();
    setShift({ status: 'OPEN', openedAt: new Date().toISOString(), openingCash: 1500000 });
    setPaymentAppointment(null);
    setEditingAppointment(null);
    setEditingTechnician(null);
    setInvoiceLines([]);
    setPaymentForm({ method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
    setSearchQuery('');
    setFormError('');
    resetTenantMockStorage(tenantStorageScope());
    setToast("Đã reset mock data các chức năng còn ở dữ liệu mẫu. Lịch hẹn và hóa đơn giữ nguyên dữ liệu thật.");
  };

  const openTechnicianEdit = (technician: ReceptionTechnician) => {
    setEditingTechnician(technician);
    setTechnicianEditForm({
      status: technician.status,
      shift: technician.shift,
      checkIn: technician.checkIn || '',
      checkOut: technician.checkOut || '',
      leaveNote: technician.leaveNote || '',
    });
    setFormError('');
  };

  const submitTechnicianEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingTechnician) return;
    setFormError('');
    const timePattern = /^$|^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(technicianEditForm.checkIn) || !timePattern.test(technicianEditForm.checkOut)) {
      setFormError('Giờ check-in/check-out phải theo định dạng HH:mm, ví dụ 08:30.');
      return;
    }
    if (technicianEditForm.checkIn && technicianEditForm.checkOut && technicianEditForm.checkOut < technicianEditForm.checkIn) {
      setFormError('Giờ check-out không được sớm hơn giờ check-in.');
      return;
    }
    const activeCustomer = branchTodayAppointments.find((appointment) => appointment.staff === editingTechnician.name && appointment.status === 'IN_SERVICE');
    if (activeCustomer && (['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE'].includes(technicianEditForm.status) || technicianEditForm.checkOut)) {
      setFormError(`${editingTechnician.name} đang phục vụ ${activeCustomer.customer}. Vui lòng hoàn tất hoặc bàn giao khách trước khi cho nghỉ/check-out.`);
      return;
    }

    /*
      Chỉ ghi phần chấm công. Ca làm việc cố định của nhân viên (`shift`) là hồ sơ nhân sự do
      chủ tiệm đặt ở màn "Nhân viên" — lễ tân ghi nhận người đó hôm nay có mặt hay không, chứ
      không đổi ca chính thức của họ.
    */
    patchTechnicianAttendance(editingTechnician.id, {
      status: technicianEditForm.status,
      checkIn: technicianEditForm.checkIn || undefined,
      checkOut: technicianEditForm.checkOut || undefined,
      leaveNote: technicianEditForm.leaveNote.trim() || undefined
    });
    setEditingTechnician(null);
    setToast(`Đã cập nhật trạng thái và thời gian làm việc của ${editingTechnician.name}.`);
  };

  const updateAppointmentStatus = async (appointment: ReceptionAppointment, status: AppointmentStatus) => {
    if (!requireOpenShift()) return;

    /*
      Sơ đồ chuyển trạng thái KHÔNG còn chép ở đây. Máy chủ gửi kèm `nextStatuses` cho từng
      lịch hẹn, tính từ đúng bảng BR-APT-022 ở tầng Domain, nên hỏi nó là hỏi thẳng nguồn sự
      thật. Bảng `allowedTransitions` cũ chỉ liệt kê ba dòng và đã sai với hủy lịch lẫn khách
      không đến — đúng loại lệch mà một bản chép luôn dẫn tới.
    */
    const dto = appointmentDtoById.get(appointment.id);

    if (dto && !dto.nextStatuses.includes(status as AppointmentApiStatus)) {
      setToast(`Không thể chuyển từ “${appointmentStatusLabel[appointment.status]}” sang “${appointmentStatusLabel[status]}”.`);
      return;
    }
    if (status === 'IN_SERVICE' && (!appointment.staff || appointment.staff === 'Chưa phân công')) {
      openAppointmentEdit(appointment);
      setToast('Vui lòng phân công kỹ thuật viên trước khi bắt đầu dịch vụ.');
      return;
    }
    if (status === 'IN_SERVICE' && !appointment.station) {
      openAppointmentEdit(appointment);
      setToast('Vui lòng xếp ghế hoặc phòng trước khi bắt đầu dịch vụ.');
      return;
    }
    if (status === 'IN_SERVICE') {
      const technician = branchTechnicians.find((item) => item.name === appointment.staff);
      if (!technician || ['NOT_CHECKED_IN', 'SICK_REPORTED', 'ON_LEAVE', 'BREAK'].includes(technician.status)) {
        setToast('Kỹ thuật viên hiện chưa sẵn sàng nhận khách. Vui lòng phân công lại.');
        return;
      }
      const otherActiveService = appointments.find((item) => item.id !== appointment.id && item.staff === appointment.staff && item.status === 'IN_SERVICE');
      if (otherActiveService) {
        setToast(`${appointment.staff} đang phục vụ ${otherActiveService.customer}. Vui lòng chờ hoặc phân công lại.`);
        return;
      }
      const servingId = staffIdByName(appointment.staff);
      if (servingId) patchTechnicianAttendance(servingId, { status: 'SERVING' });
    }
    const result = await appointmentBoard.changeStatus(appointment.id, status as AppointmentApiStatus);

    if (result.status === 'error') {
      reportApiError(result.error);
      return;
    }

    // Giờ bắt đầu phục vụ THẬT, để đồng hồ đếm ngược ở quầy chạy đúng. Máy chủ không lưu mốc
    // này — nó chỉ giữ giờ hẹn — nên đây là một trong những thứ ở `AppointmentExtras`.
    if (status === 'IN_SERVICE') {
      patchAppointmentExtras(appointment.id, { serviceStartedAt: new Date().toISOString() });
    }

    const messages: Partial<Record<AppointmentStatus, string>> = {
      CHECKED_IN: `${appointment.customer} đã check-in.`,
      IN_SERVICE: `${appointment.customer} đã bắt đầu dịch vụ.`,
      COMPLETED: `${appointment.customer} đã hoàn tất dịch vụ.`,
    };
    setToast(messages[status] || 'Đã cập nhật lịch hẹn.');
  };

  const deleteAppointment = (appointment: ReceptionAppointment) => {
    if (!requireOpenShift()) return;
    if (['IN_SERVICE', 'COMPLETED'].includes(appointment.status) || protectedAppointmentIds.has(appointment.id)) {
      setToast('Không thể xóa lịch đã bắt đầu dịch vụ, đã hoàn tất hoặc đã phát sinh thanh toán. Vui lòng xử lý bằng hoàn tiền/ghi chú đối soát.');
      return;
    }
    if (appointment.deposit > 0) {
      setToast('Không thể xóa lịch đã có tiền cọc. Vui lòng xử lý hoàn cọc hoặc hủy lịch có đối soát.');
      return;
    }
    setDeletingAppointment(appointment);
    setDeleteReason('Tạo nhầm lịch');
    setFormError('');
  };

  const submitDeleteAppointment = async (event: FormEvent) => {
    event.preventDefault();
    if (!deletingAppointment) return;
    const trimmedReason = deleteReason.trim();
    if (trimmedReason.length < 5) {
      setFormError('Vui lòng nhập lý do xóa/hủy rõ ràng, tối thiểu 5 ký tự.');
      return;
    }
    const auditNote = `[${new Date().toLocaleString('vi-VN')}] ${account.displayName} xóa khỏi quầy: ${trimmedReason}`;
    const dto = appointmentDtoById.get(deletingAppointment.id);

    /*
      Hai lời gọi, và thứ tự có ý nghĩa: ghi lý do TRƯỚC rồi mới hủy.

      BR-APT-024 không có lệnh xóa lịch hẹn — thứ giao diện gọi là "xóa" chính là chuyển sang
      CANCELLED. Nhưng lịch đã hủy là một trạng thái cuối và không sửa được nữa, nên nếu hủy
      trước thì lý do đối soát không còn đường nào vào hồ sơ.
    */
    if (dto) {
      const noted = await appointmentBoard.updateAppointment(dto.id, {
        ...toSaveInput(dto),
        note: [dto.note, auditNote].filter(Boolean).join('\n')
      });

      if (noted.status === 'error') {
        reportApiError(noted.error);
        return;
      }
    }

    const cancelled = await appointmentBoard.changeStatus(deletingAppointment.id, 'CANCELLED');

    if (cancelled.status === 'error') {
      reportApiError(cancelled.error);
      return;
    }
    if (editingAppointment?.id === deletingAppointment.id) setEditingAppointment(null);
    if (paymentAppointment?.id === deletingAppointment.id) setPaymentAppointment(null);
    setDeletingAppointment(null);
    setDeleteReason('Tạo nhầm lịch');
    setFormError('');
    setToast(`Đã hủy lịch tạo nhầm của ${deletingAppointment.customer} và lưu lý do đối soát.`);
  };

  const submitWalkIn = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!requireOpenShift()) return;
    const errors = validateAppointmentDraft(walkIn);
    if (Object.keys(errors).length > 0) {
      setWalkInErrors(errors);
      setFormError(Object.values(errors)[0] || 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return;
    }
    setWalkInErrors({});

    const customerId = await ensureCustomerId(walkIn.phone, walkIn.customer);
    if (!customerId) return;

    const staffId = staffIdByName(walkIn.staff);
    if (!staffId) {
      setWalkInErrors({ staff: 'Chọn kỹ thuật viên phụ trách trước khi tiếp nhận khách.' });
      setFormError('Lịch hẹn phải có kỹ thuật viên phụ trách — chi nhánh của lịch đi theo người làm.');
      return;
    }

    const serviceId = serviceCatalog.find((item) => item.name === walkIn.service)?.id;
    if (!serviceId) {
      setFormError('Dịch vụ này không còn trong bảng giá. Chọn lại một dịch vụ đang bán.');
      return;
    }

    const created = await appointmentBoard.createAppointment({
      customerId,
      staffId,
      startAt: `${today()}T${walkIn.start}:00+07:00`,
      serviceIds: [serviceId],
      status: 'CONFIRMED',
      source: 'RECEPTION',
      station: walkIn.station || undefined,
      note: walkIn.note.trim() || undefined
    });

    if (created.status === 'error') {
      reportApiError(created.error);
      return;
    }

    // Khách vãng lai bước vào là đã có mặt, nên check-in ngay sau khi đặt. Máy chủ không cho
    // tạo thẳng ở CHECKED_IN: BR-APT-021 chỉ mở hai trạng thái khởi tạo.
    await appointmentBoard.changeStatus(created.data.appointment.id, 'CHECKED_IN');

    patchAppointmentExtras(created.data.appointment.id, {
      createdBy: account.displayName,
      firstVisit: true,
      allergies: walkIn.allergies,
      specialTags: walkIn.specialTags
    });

    const welcomedName = walkIn.customer.trim() || walkIn.phone.trim();

    reportWarnings(created.data.warnings);
    setWalkInOpen(false);
    setWalkIn({ customer: '', phone: '', service: 'Gel Manicure', staff: 'Chưa phân công', station: '', start: getOperationalDefaultTime(), duration: '60', price: '450000', note: '', allergies: [], specialTags: [], designName: '', designLevel: 0, designSurcharge: 0 });
    setToast(`Đã tiếp nhận khách vãng lai ${welcomedName}.`);
  };

  const handleWalkInServiceChange = (serviceName: string) => {
    const selected = serviceCatalog.find((item) => item.name === serviceName);
    const currentTechnician = branchTechnicians.find((technician) => technician.name === walkIn.staff);
    setWalkIn({
      ...walkIn,
      service: serviceName,
      staff: currentTechnician && canTechnicianDoService(currentTechnician, serviceName) ? walkIn.staff : 'Chưa phân công',
      price: selected ? String(selected.price) : walkIn.price,
      duration: selected?.duration ? String(selected.duration) : walkIn.duration,
    });
  };

  const submitQuickWalkIn = async (action: 'START_NOW' | 'CHECK_IN_QUEUE' = 'START_NOW') => {
    if (!requireOpenShift()) return;
    const customerName = quickWalkInForm.customer.trim() || `Khách vãng lai #${Date.now().toString().slice(-4)}`;
    const phone = quickWalkInForm.phone.trim() || '0900 000 000';
    const duration = parseInt(quickWalkInForm.duration, 10) || 60;
    const price = parseInt(quickWalkInForm.price, 10) || 450000;
    const staff = quickWalkInForm.staff || 'Chưa phân công';
    const station = quickWalkInForm.station || undefined;
    const isStartNow = action === 'START_NOW';

    const staffId = staffIdByName(staff);
    if (!staffId) {
      setToast('Chọn kỹ thuật viên phụ trách trước — chi nhánh của lịch hẹn đi theo người làm.');
      return;
    }

    const serviceId = serviceCatalog.find((item) => item.name === quickWalkInForm.service)?.id;
    if (!serviceId) {
      setToast('Dịch vụ này không còn trong bảng giá. Chọn lại một dịch vụ đang bán.');
      return;
    }

    const customerId = await ensureCustomerId(phone, customerName);
    if (!customerId) return;

    const created = await appointmentBoard.createAppointment({
      customerId,
      staffId,
      startAt: `${today()}T${nowTime()}:00+07:00`,
      serviceIds: [serviceId],
      status: 'CONFIRMED',
      source: 'RECEPTION',
      station,
      note: quickWalkInForm.note.trim() || undefined
    });

    if (created.status === 'error') {
      reportApiError(created.error);
      return;
    }

    const newId = created.data.appointment.id;

    /*
      Hai bước, không phải một: BR-APT-021 chỉ cho tạo lịch ở PENDING hoặc CONFIRMED, còn sơ đồ
      mục 16.1 bắt đi qua CHECKED_IN mới tới được IN_SERVICE. Nút "bắt đầu ngay" ở quầy vì vậy
      là hai lần chuyển liên tiếp chứ không phải một lối tắt — và đó là điều đúng: một khách
      đang được phục vụ thì chắc chắn đã đến tiệm.
    */
    await appointmentBoard.changeStatus(newId, 'CHECKED_IN');

    if (isStartNow) {
      await appointmentBoard.changeStatus(newId, 'IN_SERVICE');
      patchAppointmentExtras(newId, { serviceStartedAt: new Date().toISOString() });
      patchTechnicianAttendance(staffId, { status: 'SERVING' });
    }

    patchAppointmentExtras(newId, {
      createdBy: account.displayName,
      firstVisit: true,
      allergies: quickWalkInForm.allergies
    });

    reportWarnings(created.data.warnings);
    setQuickWalkInOpen(false);
    setQuickWalkInForm({
      customer: '',
      phone: '',
      service: 'Gel Manicure',
      staff: '',
      station: '',
      duration: '60',
      price: '450000',
      allergies: [],
      note: '',
      quickAction: 'START_NOW',
    });

    setToast(isStartNow ? `⚡ Đã tiếp nhận & bắt đầu dịch vụ ngay cho ${customerName}!` : `⚡ Đã tiếp nhận & check-in hàng chờ cho ${customerName}!`);
  };

  /**
   * Gia hạn thời gian phục vụ ngay tại ghế.
   *
   * Chỉ ghi ở client: đây là chuyện của đồng hồ đếm ngược trong một ca làm việc, không phải
   * một lần dời lịch. Đổi `startAt` ở máy chủ sẽ kéo theo phép chống trùng lịch chạy lại và có
   * thể từ chối — trong khi khách thì đang ngồi đó và việc đã kéo dài thật rồi.
   */
  /**
   * Đổi kỹ thuật viên phụ trách một lịch hẹn — thao tác của màn "Kỹ thuật viên".
   *
   * Đây là một lần sửa thật chứ không phải đổi nhãn hiển thị: chi nhánh của lịch hẹn đi theo
   * người làm (BR-EMP-003), và phép chống trùng lịch ở BR-APT-011 tính theo từng kỹ thuật
   * viên — nên giao khách cho một người đang bận sẽ bị máy chủ từ chối, đúng như phải thế.
   */
  const assignAppointmentStaff = async (appointmentId: string, technicianName: string) => {
    const dto = appointmentDtoById.get(appointmentId);
    if (!dto) return;

    const staffId = staffIdByName(technicianName);
    if (!staffId) {
      setToast(`Không tìm thấy hồ sơ nhân viên của ${technicianName}.`);
      return;
    }

    const saved = await appointmentBoard.updateAppointment(dto.id, { ...toSaveInput(dto), staffId });

    if (saved.status === 'error') {
      reportApiError(saved.error);
      return;
    }

    reportWarnings(saved.data.warnings);
  };

  const extendServiceDuration = (appointmentId: string, extraMinutes = 15) => {
    const current = appointmentExtras[appointmentId]?.serviceExtendedMinutes || 0;

    patchAppointmentExtras(appointmentId, { serviceExtendedMinutes: current + extraMinutes });
    const apt = appointments.find((a) => a.id === appointmentId);
    setToast(`⏱️ Đã gia hạn thêm +${extraMinutes} phút cho "${apt?.customer || 'khách'}".`);
  };

  const mergeAppointmentToBill = (otherAppointment: ReceptionAppointment) => {
    if (mergedAppointmentIds.includes(otherAppointment.id)) return;
    const services = otherAppointment.services?.length ? otherAppointment.services : [otherAppointment.service];
    const splitPrice = Math.floor(otherAppointment.price / services.length);
    const newLines: InvoiceLineDraft[] = services.map((name, index) => {
      const catalogMatch = serviceCatalog.find((s) => s.name === name);
      const originalBasePrice = catalogMatch ? catalogMatch.price : (index === services.length - 1 ? otherAppointment.price - splitPrice * index : splitPrice);
      return {
        id: `${makeId('LINE')}-merge-${otherAppointment.id}-${index}`,
        type: 'SERVICE',
        name,
        quantity: 1,
        basePrice: originalBasePrice,
        unitPrice: originalBasePrice,
        staff: otherAppointment.staff,
        fromCustomerName: otherAppointment.customer,
        fromAppointmentId: otherAppointment.id,
      };
    });
    setInvoiceLines((prev) => [...prev, ...newLines]);
    setMergedAppointmentIds((prev) => [...prev, otherAppointment.id]);
    setShowMergeSelector(false);
    setToast(`Đã gộp dịch vụ của khách "${otherAppointment.customer}" vào hóa đơn.`);
  };

  const unmergeAppointmentFromBill = (aptId: string) => {
    const targetApt = appointments.find((a) => a.id === aptId);
    setInvoiceLines((prev) => prev.filter((l) => l.fromAppointmentId !== aptId));
    setMergedAppointmentIds((prev) => prev.filter((id) => id !== aptId));
    setToast(`Đã tách hóa đơn của "${targetApt?.customer || 'khách gộp'}".`);
  };

  const splitEqually = (numPeople: number) => {
    const perPerson = Math.floor(invoiceTotal / numPeople);
    const remainder = invoiceTotal - (perPerson * numPeople);
    const methods: PaymentMethod[] = ['CASH', 'BANK', 'CARD', 'MOMO', 'ZALOPAY'];
    const newSplits: SplitPaymentEntry[] = Array.from({ length: numPeople }, (_, i) => ({
      id: `SP-${Date.now()}-${i}`,
      method: methods[i % methods.length],
      amount: i === 0 ? perPerson + remainder : perPerson,
      reference: '',
    }));
    setSplitPaymentsList(newSplits);
    setToast(`Đã chia đều hóa đơn cho ${numPeople} người (${money(perPerson)}/người).`);
  };

  const addSplitRow = () => {
    const currentTotal = splitPaymentsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const remaining = Math.max(0, invoiceTotal - currentTotal);
    setSplitPaymentsList((prev) => [
      ...prev,
      { id: `SP-${Date.now()}-${prev.length + 1}`, method: 'BANK', amount: remaining, reference: '' },
    ]);
  };

  const removeSplitRow = (id: string) => {
    if (splitPaymentsList.length <= 1) return;
    setSplitPaymentsList((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSplitRow = (id: string, patch: Partial<SplitPaymentEntry>) => {
    setSplitPaymentsList((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  };

  const openAppointmentEdit = (appointment: ReceptionAppointment) => {
    if (['IN_SERVICE', 'COMPLETED'].includes(appointment.status)) {
      setToast('Không thể sửa thông tin tiếp nhận sau khi dịch vụ đã bắt đầu.');
      return;
    }
    setEditingAppointment(appointment);
    setAppointmentEditErrors({});
    setAppointmentEditForm({
      customer: appointment.customer,
      phone: appointment.phone,
      service: appointment.service,
      staff: appointment.staff || 'Chưa phân công',
      station: appointment.station || '',
      start: appointment.start,
      duration: String(appointment.duration),
      price: String(appointment.price),
      note: appointment.note || '',
    });
    setFormError('');
  };

  const submitAppointmentEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingAppointment) return;
    setFormError('');
    const errors = validateAppointmentDraft(appointmentEditForm, editingAppointment.id);
    if (Object.keys(errors).length > 0) {
      setAppointmentEditErrors(errors);
      setFormError(Object.values(errors)[0] || 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return;
    }
    setAppointmentEditErrors({});

    const dto = appointmentDtoById.get(editingAppointment.id);
    if (!dto) {
      setToast('Lịch hẹn này không còn trên bảng lịch. Tải lại rồi thử lại.');
      return;
    }

    const staffId = staffIdByName(appointmentEditForm.staff);
    if (!staffId) {
      setAppointmentEditErrors({ staff: 'Chọn kỹ thuật viên phụ trách.' });
      setFormError('Lịch hẹn phải có kỹ thuật viên phụ trách.');
      return;
    }

    const serviceId = serviceCatalog.find((item) => item.name === appointmentEditForm.service)?.id;
    if (!serviceId) {
      setFormError('Dịch vụ này không còn trong bảng giá. Chọn lại một dịch vụ đang bán.');
      return;
    }

    /*
      KHÔNG gửi `duration` và `price`. Cả hai đều do máy chủ suy ra — thời lượng từ danh sách
      dịch vụ (BR-APT-010), giá thì chốt lúc lập hóa đơn (BR-SVC-006) — nên hai ô ấy trên biểu
      mẫu chỉ để người ở quầy nhìn thấy con số, không phải để họ quyết định nó.

      Tên và số điện thoại khách cũng không gửi: đổi khách của một lịch hẹn là lập một lịch
      khác. Sửa hồ sơ khách thì vào màn Khách hàng.
    */
    const saved = await appointmentBoard.updateAppointment(dto.id, {
      customerId: dto.customerId,
      staffId,
      startAt: `${appointmentEditForm.start ? `${dto.startAt.slice(0, 10)}T${appointmentEditForm.start}:00+07:00` : dto.startAt}`,
      serviceIds: [serviceId],
      source: dto.source,
      station: appointmentEditForm.station || undefined,
      note: appointmentEditForm.note.trim() || undefined,
      deposit: dto.deposit
    });

    if (saved.status === 'error') {
      reportApiError(saved.error);
      return;
    }

    reportWarnings(saved.data.warnings);
    setEditingAppointment(null);
    setToast(`Đã cập nhật thông tin tiếp nhận của ${appointmentEditForm.customer.trim()}.`);
  };

  const handleAppointmentEditServiceChange = (serviceName: string) => {
    const selected = serviceCatalog.find((item) => item.name === serviceName);
    const currentTechnician = branchTechnicians.find((technician) => technician.name === appointmentEditForm.staff);
    setAppointmentEditForm({
      ...appointmentEditForm,
      service: serviceName,
      staff: currentTechnician && canTechnicianDoService(currentTechnician, serviceName) ? appointmentEditForm.staff : 'Chưa phân công',
      price: selected ? String(selected.price) : appointmentEditForm.price,
      duration: selected?.duration ? String(selected.duration) : appointmentEditForm.duration,
    });
  };

  const handleSelectPromo = (promoId: string, lines = invoiceLines) => {
    setSelectedPromoId(promoId);
    if (!promoId) {
      setPromoFeedback(null);
      setPaymentForm((prev) => ({ ...prev, discount: '0' }));
      return;
    }
    const program = loyaltyPrograms.find((p) => p.id === promoId);
    if (!program) {
      setPromoFeedback({ isError: true, text: 'Chương trình ưu đãi không tồn tại' });
      return;
    }
    const result = validateAndCalculatePromotion({
      program,
      items: lines,
      customerUsageCount: 0,
    });
    if (!result.isValid) {
      setPromoFeedback({ isError: true, text: result.reason || 'Hóa đơn chưa đủ điều kiện áp dụng ưu đãi này.' });
      setPaymentForm((prev) => ({ ...prev, discount: '0' }));
    } else {
      setPromoFeedback({ isError: false, text: `Áp dụng thành công: ${program.name} (Giảm ${money(result.discountAmount)})` });
      setPaymentForm((prev) => ({ ...prev, discount: String(result.discountAmount) }));
    }
  };

  const openPayment = (appointment: ReceptionAppointment) => {
    if (!requireOpenShift()) return;
    if (!['CHECKED_IN', 'IN_SERVICE'].includes(appointment.status)) {
      setToast('Chỉ có thể tạo hóa đơn thanh toán cho khách đã check-in hoặc đang làm dịch vụ.');
      return;
    }
    if (completedIds.has(appointment.id)) {
      setToast('Lịch hẹn này đã có hóa đơn thanh toán hoàn tất.');
      return;
    }
    const loadedPromos = readStorage<LoyaltyProgram[]>(loyaltyStorageKey, []);
    setLoyaltyPrograms(loadedPromos);
    setSelectedPromoId('');
    setPromoFeedback(null);
    setShowPaymentConfirm(false);
    setCustomizingLine(null);

    setPaymentAppointment(appointment);
    const existingDraft = invoiceDrafts[appointment.id];
    setMergedAppointmentIds(existingDraft?.mergedIds || []);
    setShowMergeSelector(false);
    setSplitPaymentMode(Boolean(existingDraft?.splitPayments?.length));
    if (existingDraft && existingDraft.lines?.length) {
      setInvoiceLines(existingDraft.lines);
      setPaymentForm(existingDraft.form || { method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
      setSelectedPromoId(existingDraft.promoId || '');
      setSplitPaymentsList(existingDraft.splitPayments && existingDraft.splitPayments.length > 0 ? existingDraft.splitPayments : [
        { id: 'SP-1', method: 'CASH', amount: Math.max(0, (appointment.price || 0) - (appointment.deposit || 0)), reference: '' }
      ]);
    } else {
      const selectedServices = appointment.services?.length ? appointment.services : [appointment.service];
      const splitPrice = Math.floor(appointment.price / selectedServices.length);
      setInvoiceLines(selectedServices.map((name, index) => {
        const catalogMatch = serviceCatalog.find(s => s.name === name);
        const originalBasePrice = catalogMatch ? catalogMatch.price : (index === selectedServices.length - 1 ? appointment.price - splitPrice * index : splitPrice);
        
        return {
          id: `${makeId('LINE')}-${index}`,
          type: 'SERVICE',
          name,
          quantity: 1,
          basePrice: originalBasePrice,
          unitPrice: originalBasePrice, // Giữ y nguyên giá gốc của dịch vụ
          staff: appointment.staff,
          designName: undefined,
          designLevel: 0,
          difficultyLabel: undefined,
          designSurcharge: 0,
        };
      }));
      setPaymentForm({ method: 'CASH', discount: '0', tip: '0', reference: '', note: '' });
      setSplitPaymentsList([
        { id: 'SP-1', method: 'CASH', amount: Math.max(0, (appointment.price || 0) - (appointment.deposit || 0)), reference: '' }
      ]);
    }
    setInvoiceCatalogTab('SERVICE');
    setInvoiceCatalogQuery('');
    setInvoiceCategory('Tất cả');
    setFormError('');
  };

  const openLineCustomizer = (line: InvoiceLineDraft) => {
    setCustomizingLine(line);
    const initialLevel = line.designLevel ?? (line.designSurcharge ? (line.designSurcharge >= 350000 ? 4 : line.designSurcharge >= 200000 ? 3 : line.designSurcharge >= 100000 ? 2 : 1) : 0);
    const diffPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === initialLevel);
    setCustomizerForm({
      basePrice: String(line.basePrice ?? line.unitPrice ?? 0),
      designName: line.designName || '',
      designLevel: initialLevel,
      difficultyLabel: line.difficultyLabel || diffPreset?.label || '',
      designSurcharge: String(line.designSurcharge ?? (diffPreset?.surcharge || 0)),
      attachedColorCode: line.attachedColorId || '',
      attachedColorName: line.attachedColorName || '',
      attachedColorHex: line.attachedColorHex || '',
      attachedProductName: line.attachedProductName || '',
      attachedProductPrice: line.attachedProductPrice || 0,
      staff: line.staff,
      customArtNote: line.customArtNote || '',
    });
  };

  const handleSelectArtTemplateInCustomizer = (template: NailArtTemplate) => {
    const levelPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === template.defaultLevel) || ART_DIFFICULTY_PRESETS[2];
    const surcharge = template.surcharge || levelPreset.surcharge;
    setCustomizerForm(prev => ({
      ...prev,
      designName: template.name,
      designLevel: template.defaultLevel,
      difficultyLabel: levelPreset.label,
      designSurcharge: String(surcharge),
    }));
  };

  const handleSelectDifficultyInCustomizer = (preset: ArtDifficultyPreset) => {
    setCustomizerForm(prev => ({
      ...prev,
      designLevel: preset.level,
      difficultyLabel: preset.label,
      designSurcharge: preset.level === 99 ? prev.designSurcharge : String(preset.surcharge),
    }));
  };

  const saveLineCustomizer = () => {
    if (!customizingLine) return;
    const rawSurcharge = String(customizerForm.designSurcharge || '0').replace(/[^0-9]/g, '');
    const rawBase = String(customizerForm.basePrice || '0').replace(/[^0-9]/g, '');
    const surcharge = Math.max(0, parseInt(rawSurcharge || '0', 10));
    const base = Math.max(0, parseInt(rawBase || '0', 10));
    const accPrice = Math.max(0, Number(customizerForm.attachedProductPrice) || 0);
    const diffPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === customizerForm.designLevel);
    
    const unitPrice = base + surcharge + accPrice;

    setInvoiceLines(current => current.map(line => {
      if (line.id !== customizingLine.id) return line;
      return {
        ...line,
        basePrice: base,
        unitPrice,
        staff: customizerForm.staff,
        designId: customizerForm.designName ? `ART-${Date.now().toString(36)}` : undefined,
        designName: customizerForm.designName.trim() || undefined,
        designLevel: customizerForm.designLevel,
        difficultyLabel: customizerForm.difficultyLabel || diffPreset?.label,
        designSurcharge: surcharge,
        customArtNote: customizerForm.customArtNote.trim() || undefined,
        attachedColorId: customizerForm.attachedColorCode || undefined,
        attachedColorName: customizerForm.attachedColorName || undefined,
        attachedColorHex: customizerForm.attachedColorHex || undefined,
        attachedProductId: customizerForm.attachedProductName ? `ACC-${customizerForm.attachedProductName}` : undefined,
        attachedProductName: customizerForm.attachedProductName || undefined,
        attachedProductPrice: accPrice,
      };
    }));

    setCustomizingLine(null);
    setToast(`Đã cập nhật mẫu vẽ, độ khó và giá cho "${customizingLine.name}".`);
  };

  const addArtServiceItem = (template: NailArtTemplate, targetDifficultyLevel?: number) => {
    const level = targetDifficultyLevel !== undefined ? targetDifficultyLevel : template.defaultLevel;
    const levelPreset = ART_DIFFICULTY_PRESETS.find(p => p.level === level) || ART_DIFFICULTY_PRESETS[1];
    const surcharge = template.surcharge || levelPreset.surcharge;
    
    // Tìm giá dịch vụ gốc tương ứng từ danh sách dịch vụ đã đồng bộ
    const matchedService = template.baseServiceId 
      ? servicesData.find(s => s.id === template.baseServiceId)
      : null;
    const baseServicePrice = matchedService?.price || 450000;
    const baseServiceName = matchedService?.name || 'Sơn gel';
    const unitPrice = baseServicePrice + surcharge;

    const newLine: InvoiceLineDraft = {
      id: makeId('LINE'),
      type: 'SERVICE',
      name: `${baseServiceName} + ${template.name}`,
      basePrice: baseServicePrice,
      quantity: 1,
      unitPrice,
      staff: paymentAppointment?.staff || 'Chưa phân công',
      designId: template.id,
      designName: template.name,
      designLevel: level,
      difficultyLabel: levelPreset.label,
      designSurcharge: surcharge,
    };

    setInvoiceLines(current => [...current, newLine]);
    setToast(`Đã thêm dịch vụ kèm mẫu "${template.name}" (${levelPreset.shortLabel}).`);
  };

  const addCatalogItem = (type: InvoiceLineType, item: CatalogItem) => {
    setInvoiceLines((current) => {
      const existing = current.find((line) => line.type === type && line.name === item.name && (type === 'PRODUCT' || line.staff === paymentAppointment?.staff));
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, {
        id: makeId('LINE'),
        type,
        name: item.name,
        basePrice: item.price,
        quantity: 1,
        unitPrice: item.price,
        staff: type === 'SERVICE' ? paymentAppointment?.staff || 'Chưa phân công' : 'Quầy bán lẻ',
      }];
    });
    setFormError('');
  };

  const removeCatalogItem = (type: InvoiceLineType, item: CatalogItem) => {
    setInvoiceLines((current) => {
      const existing = current.find((line) => line.type === type && line.name === item.name && (type === 'PRODUCT' || line.staff === paymentAppointment?.staff));
      if (!existing) return current;
      if (existing.quantity <= 1) {
        return current.filter((line) => line.id !== existing.id);
      }
      return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity - 1 } : line);
    });
    setFormError('');
  };

  const updateInvoiceLine = (id: string, patch: Partial<InvoiceLineDraft>) => {
    setInvoiceLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  };

  const submitPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!paymentAppointment) return;
    if (!invoiceLines.length) return setFormError('Hóa đơn phải có ít nhất một dịch vụ hoặc sản phẩm.');
    if (invoiceLines.some((line) => !line.name.trim() || !Number.isInteger(line.quantity) || line.quantity < 1 || line.unitPrice < 0)) return setFormError('Vui lòng kiểm tra tên, số lượng và đơn giá của từng dòng.');
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discount = Math.max(0, Number(paymentForm.discount) || 0);

    if (selectedPromoId) {
      const program = loyaltyPrograms.find((p) => p.id === selectedPromoId);
      if (program) {
        const result = validateAndCalculatePromotion({
          program,
          items: invoiceLines,
          customerUsageCount: 0,
        });
        if (!result.isValid) {
          return setFormError(`Không đủ điều kiện áp dụng ưu đãi "${program.name}": ${result.reason}`);
        }
      }
    }

    const tip = Math.max(0, Number(paymentForm.tip) || 0);
    if (discount > subtotal) return setFormError('Giảm giá không được lớn hơn tổng tiền hàng.');
    const grandTotal = Math.max(0, subtotal - discount + tip);
    const allDeposits = (paymentAppointment.deposit || 0) + appointments.filter((a) => mergedAppointmentIds.includes(a.id)).reduce((sum, a) => sum + a.deposit, 0);
    if (grandTotal < allDeposits) return setFormError('Tổng hóa đơn sau giảm giá không được thấp hơn số tiền khách đã đặt cọc.');

    if (splitPaymentMode) {
      if (!splitPaymentsList.length) return setFormError('Vui lòng thêm ít nhất một phương thức chia hóa đơn.');
      if (splitDifference !== 0) {
        return setFormError(`Tổng tiền các phương thức (${money(totalSplitAllocated)}) chưa khớp với số tiền thực thu (${money(invoiceTotal)}). Chênh lệch: ${money(Math.abs(splitDifference))}.`);
      }
      for (let i = 0; i < splitPaymentsList.length; i++) {
        const item = splitPaymentsList[i];
        if (item.amount <= 0) return setFormError(`Phương thức #${i + 1} có số tiền không hợp lệ.`);
        if (item.method !== 'CASH' && !item.reference?.trim()) {
          return setFormError(`Phương thức #${i + 1} (${methodMeta[item.method].label}) cần nhập mã giao dịch để đối soát.`);
        }
      }
    } else {
      if (paymentForm.method !== 'CASH' && !paymentForm.reference.trim()) return setFormError('Vui lòng nhập mã giao dịch để đối soát.');
      if (paymentForm.method !== 'CASH' && payments.some((payment) => payment.reference?.trim().toLowerCase() === paymentForm.reference.trim().toLowerCase() && payment.appointmentId !== paymentAppointment.id)) return setFormError('Mã giao dịch đã được sử dụng. Vui lòng kiểm tra lại để tránh ghi nhận trùng.');
    }
    
    setFormError('');
    setShowPaymentConfirm(true);
  };

  /**
   * Thu tiền thật — ba lời gọi, theo đúng thứ tự, và thứ tự có ý nghĩa.
   *
   * 1. **Lập hóa đơn từ lịch hẹn** (BR-INV-010). Gửi kèm `appointmentId` chứ không lập hóa
   *    đơn bán lẻ, vì chính mối nối ấy là điều kiện để BR-APT-026 đóng lịch khi thu đủ — và
   *    cũng là cách tiền cọc của lịch tự thành một dòng `DEPOSIT` (BR-APT-031).
   * 2. **Sửa trọn bộ dòng hàng** (BR-INV-015). Cần bước này vì máy chủ dựng hóa đơn từ dịch vụ
   *    của lịch hẹn và **bỏ qua** `lines` mà client gửi kèm lệnh lập — đúng như thiết kế, để
   *    một hóa đơn không thể ghi tên dịch vụ khác với thứ khách đã đặt. Nhưng POS ở quầy còn
   *    thêm sản phẩm, phụ thu mẫu vẽ và các dòng gộp từ khách khác, nên chúng vào ở bước sửa.
   * 3. **Ghi nhận thu tiền** (BR-PAY-001), một lời gọi cho mỗi phương thức — BR-PAY-004.
   *
   * Số tiền phải thu KHÔNG do màn hình tự tính: sau bước 2, máy chủ trả về `remaining` đã trừ
   * sẵn tiền cọc. Tự cộng lại ở đây là dựng phép tính thứ hai cho cùng một con số, và ngày nó
   * lệch thì người ở quầy phát hiện ngay trước mặt khách.
   */
  const executeFinalPayment = async () => {
    if (!paymentAppointment) return;

    const discount = Math.max(0, Number(paymentForm.discount) || 0);
    const tip = Math.max(0, Number(paymentForm.tip) || 0);
    const allInvolvedAppointmentIds = [paymentAppointment.id, ...mergedAppointmentIds];

    // Bấm "Thanh toán" hai lần vì màn hình chậm là chuyện thường ở quầy. Máy chủ đã chặn hóa
    // đơn thứ hai cho cùng một lịch, nhưng dùng lại hóa đơn đang mở thì người dùng không phải
    // nhìn thấy lỗi nào cả.
    const openInvoice = invoiceBook.invoices.find((item) => (
      item.appointmentId === paymentAppointment.id
      && ['PENDING', 'PARTIAL'].includes(item.status)
    ));

    let invoice: SalesInvoiceDto | null = openInvoice || null;

    if (!invoice) {
      const created = await invoiceBook.createInvoice({ appointmentId: paymentAppointment.id });

      if (created.status === 'error') {
        setShowPaymentConfirm(false);
        reportApiError(created.error);
        return;
      }

      invoice = created.data;
    }

    /*
      Dòng nào có mã dịch vụ thì gửi mã — máy chủ đọc giá hiện tại từ bảng giá (BR-SVC-007),
      và giá client gửi kèm bị bỏ qua. Dòng còn lại — sản phẩm, phụ thu mẫu vẽ, dòng nhập tay —
      là mục tự do của BR-INV-012 và giữ nguyên giá quầy nhập.
    */
    const lines: SalesInvoiceLineInput[] = invoiceLines.map((line) => {
      const catalogMatch = line.type === 'SERVICE'
        ? serviceCatalog.find((item) => item.name === line.name.trim())
        : undefined;

      if (catalogMatch?.id && !line.designSurcharge && !line.attachedProductPrice) {
        return { serviceId: catalogMatch.id, quantity: line.quantity };
      }

      return {
        name: describeInvoiceLine(line),
        unitPrice: line.unitPrice,
        quantity: line.quantity
      };
    });

    const revised = await invoiceBook.updateInvoice(invoice.id, {
      staffId: appointmentDtoById.get(paymentAppointment.id)?.staffId,
      lines,
      discount,
      discountReason: discount > 0 ? (paymentForm.note.trim() || 'Giảm giá tại quầy') : undefined,
      tip,
      note: paymentForm.note.trim() || undefined
    });

    if (revised.status === 'error') {
      setShowPaymentConfirm(false);
      reportApiError(revised.error);
      return;
    }

    // `remaining` của máy chủ đã trừ tiền cọc. Đây là con số thật khách phải đưa.
    const amountDue = revised.data.remaining;

    const installments = splitPaymentMode
      ? splitPaymentsList.map((item) => ({
        method: item.method as PaymentApiMethod,
        amount: item.amount,
        reference: item.reference?.trim() || undefined
      }))
      : [{
        method: paymentForm.method as PaymentApiMethod,
        amount: amountDue,
        reference: paymentForm.reference.trim() || undefined
      }];

    for (const installment of installments) {
      if (installment.amount <= 0) continue;

      const paid = await invoiceBook.recordPayment(revised.data.id, installment);

      if (paid.status === 'error') {
        setShowPaymentConfirm(false);
        reportApiError(paid.error);
        // Dừng ngay: các lần thu trước đó ĐÃ vào sổ và không được cuộn ngược. Người ở quầy mở
        // lại hóa đơn sẽ thấy đúng phần đã thu và phần còn thiếu.
        invoiceBook.reload();
        return;
      }
    }
    /*
      BR-APT-026 — lịch hẹn tự hoàn tất, và việc đó xảy ra **ở máy chủ**, bên trong cùng giao
      dịch với lần thu cuối. Giao diện không đặt trạng thái nào cả; nó chỉ nạp lại bảng lịch để
      thấy kết quả.

      Đây chính là chỗ ngày 14 để dở. Khi ấy màn thu tiền còn chạy dữ liệu mẫu nên không có gì
      đóng lịch được: lễ tân không có quyền đặt tay `COMPLETED` (BR-APT-027), và đánh dấu ở
      client trong khi máy chủ thấy khác là đúng loại nói dối cả lát cắt này đi sửa.
    */
    appointmentBoard.reload();

    const involvedStaffs = appointments.filter((a) => allInvolvedAppointmentIds.includes(a.id)).map((a) => a.staff);
    technicians.forEach((item) => {
      if (involvedStaffs.includes(item.name) && item.status === 'SERVING') {
        const stillHasOther = appointments.some((a) => !allInvolvedAppointmentIds.includes(a.id) && a.staff === item.name && a.status === 'IN_SERVICE');
        if (!stillHasOther) {
          patchTechnicianAttendance(item.id, { status: 'PRESENT' });
        }
      }
    });

    setInvoiceDrafts((current) => {
      const next = { ...current };
      allInvolvedAppointmentIds.forEach((id) => delete next[id]);
      try {
        localStorage.setItem(invoiceDraftsStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setShowPaymentConfirm(false);
    setPaymentAppointment(null);
    setMergedAppointmentIds([]);
    setSplitPaymentMode(false);
    setToast(`Đã thu ${money(amountDue)} từ khách hàng ${paymentAppointment.customer}.`);
  };

  const openShiftDialog = (mode: 'OPEN' | 'CLOSE') => {
    setCashAmount(String(mode === 'CLOSE' ? expectedClosingCash : 1000000));
    setFormError('');
    setShiftModal(mode);
  };

  const submitShift = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount < 0) return setFormError('Số tiền trong quỹ không hợp lệ.');
    if (shiftModal === 'OPEN') {
      setShift({ status: 'OPEN', openedAt: new Date().toISOString(), openingCash: amount });
      setToast('Đã mở ca lễ tân.');
    } else {
      if (activeAppointments.length > 0) return setFormError(`Còn ${activeAppointments.length} khách đang chờ hoặc đang phục vụ. Vui lòng hoàn tất hoặc bàn giao trước khi chốt ca.`);
      setShift((current) => ({ ...current, status: 'CLOSED', closedAt: new Date().toISOString(), closingCash: amount }));
      const difference = amount - expectedClosingCash;
      setToast(difference === 0 ? 'Đã chốt ca, tiền mặt khớp với hệ thống.' : `Đã chốt ca và ghi nhận chênh lệch ${money(Math.abs(difference))} ${difference > 0 ? 'thừa' : 'thiếu'}.`);
    }
    setShiftModal(null);
    setFormError('');
  };

  const navigate = (nextPage: ReceptionPage) => {
    if (nextPage === 'desk') {
      // Quay về màn quầy là lúc đáng nạp lại nhất: người dùng vừa rời đi làm việc khác, và
      // trong lúc đó máy bên cạnh có thể đã đặt thêm lịch.
      appointmentBoard.reload();
      invoiceBook.reload();
      staffDirectory.reload();
    }
    setPage(nextPage);
    setSidebarOpen(false);
    setSearchQuery('');
  };


  /*
    ── Dải nhãn "Dữ liệu mẫu" của cổng lễ tân ────────────────────────────────────────────
    Cổng này chạy dữ liệu THẬT ở gần hết các màn — lịch hẹn, khách, kỹ thuật viên, bảng giá,
    hóa đơn và thu tiền. Đúng vì thế mà hai màn còn lại là chỗ dễ nhầm nhất trong cả dự án:
    người ở quầy vừa thu một khoản tiền thật xong thì bấm sang Sản phẩm và thấy một kho hàng
    không có thật, trên cùng một thanh điều hướng.

    Quyết định 8 — giữ màn để mạch demo không đứt, nhưng nói ra rằng dữ liệu là mẫu.
  */
  const MOCK_DATA_REASONS: Record<string, string> = {
    products: 'Kho sản phẩm bán lẻ nằm ngoài phạm vi 9 module lõi, nên tồn kho và lượt bán ở đây chỉ lưu trên trình duyệt này. Bán một món cho khách thì thêm nó thành dòng nhập tay trên hóa đơn — dòng đó là thật.',
    stations: 'Sơ đồ ghế & khu vực nằm ngoài phạm vi backend MVP (§9.3), nên tình trạng ghế ở đây là dữ liệu mẫu, không phải chỗ ngồi thật của khách đang ở tiệm.'
  };

  /*
    ── Ba trạng thái của dữ liệu quầy ────────────────────────────────────────────────────
    Từ ngày 25 màn lễ tân không còn lùi về dữ liệu mẫu khi máy chủ trả rỗng, nên ba trạng thái
    "đang tải", "gọi hỏng" và "chưa có gì" phải tự nói ra tên mình — trước đây cả ba đều hiện
    ra thành một danh sách demo trông y như thật.

    Dải nhãn này nói hai trạng thái đầu, cho cả bốn nguồn cùng lúc: lịch hẹn, hóa đơn, bảng giá
    dịch vụ, kỹ thuật viên. Gộp chung vì chúng nạp song song và một sự cố mạng thường quật cả
    bốn — bốn dải nhãn giống nhau xếp chồng lên nhau thì thành nhiễu, không thành thông tin.

    Trạng thái thứ ba, "chưa có gì", thuộc về từng danh sách và nằm ngay tại danh sách ấy.

    Mỏng và không bóng, cùng khuôn với MockDataNotice: đây là chú thích về dữ liệu chứ không
    phải một khối nội dung mới trên trang.
  */
  const receptionSources = [
    { label: 'lịch hẹn', book: appointmentBoard },
    { label: 'hóa đơn', book: invoiceBook },
    { label: 'bảng giá dịch vụ', book: salonServices },
    { label: 'kỹ thuật viên', book: staffDirectory }
  ];

  const failedSources = receptionSources.filter((source) => source.book.error);
  const loadingSources = receptionSources.filter((source) => source.book.loading);

  const renderDataState = () => {
    if (failedSources.length > 0) {
      return (
        <p className="mb-5 flex items-start gap-2 rounded-control border border-brand-error/30 bg-brand-error/5 px-3 py-2 text-caption text-brand-error">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-bold">
              Không tải được {failedSources.map((source) => source.label).join(', ')}.
            </span>{' '}
            {failedSources[0].book.error?.message}{' '}
            <button
              type="button"
              onClick={() => failedSources.forEach((source) => source.book.reload())}
              className="font-bold underline underline-offset-2"
            >
              Thử lại
            </button>
          </span>
        </p>
      );
    }

    if (loadingSources.length > 0) {
      return (
        <p className="mb-5 flex items-center gap-2 text-caption text-brand-text-muted">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          Đang tải {loadingSources.map((source) => source.label).join(', ')}…
        </p>
      );
    }

    return null;
  };

  /*
    Ô chọn dịch vụ khi bảng giá rỗng. Một thẻ <select> không có lựa chọn nào trông y hệt một
    thẻ hỏng, nên nó phải tự nói ra đang thiếu gì — và nói khác nhau giữa "đang tải" với "tiệm
    chưa khai dịch vụ nào", vì hai chuyện ấy cần hai hành động khác nhau từ người ở quầy.
  */
  const emptyServiceOption = serviceCatalog.length === 0
    ? (
      <option value="">
        {salonServices.loading ? 'Đang tải bảng giá…' : 'Tiệm chưa khai dịch vụ nào'}
      </option>
    )
    : null;

  const renderPage = () => {
    if (page === 'desk') {
      return (
        <DeskScreen
          branchCode={branchCode}
          branchName={branchName}
          todayAppointments={todayAppointments}
          actionableAppointments={actionableAppointments}
          activeAppointments={activeAppointments}
          upcomingAppointments={upcomingAppointments}
          unassignedAppointments={unassignedAppointments}
          deskQueueAppointments={deskQueueAppointments}
          branchTechnicians={branchTechnicians}
          availableTechnicians={availableTechnicians}
          occupiedStations={occupiedStations}
          completedToday={completedToday}
          paidToday={paidToday}
          todayRevenue={todayRevenue}
          shift={shift}
          invoiceDrafts={invoiceDrafts}
          deskViewMode={deskViewMode}
          setDeskViewMode={setDeskViewMode}
          deskQueueFilter={deskQueueFilter}
          setDeskQueueFilter={setDeskQueueFilter}
          setWalkInOpen={setWalkInOpen}
          setQuickWalkInOpen={setQuickWalkInOpen}
          setQuickWalkInForm={setQuickWalkInForm}
          openShiftDialog={openShiftDialog}
          openPayment={openPayment}
          openAppointmentEdit={openAppointmentEdit}
          updateAppointmentStatus={updateAppointmentStatus}
          extendServiceDuration={extendServiceDuration}
          requireOpenShift={requireOpenShift}
          navigate={navigate}
          loadMockReceptionData={loadMockReceptionData}
        />
      );
    }
    if (page === 'technicians') return (
      <ReceptionistTechnicians
        technicians={technicians}
        appointments={appointments}
        branchScopeId={branchScopeId}
        branchName={branchName}
        roleLabel={`Receptionist · ${account.displayName}`}
        onAssignStaff={(appointmentId, technicianName) => {
          void assignAppointmentStaff(appointmentId, technicianName);
        }}
        onAttendanceChange={patchTechnicianAttendance}

        onNotify={setToast}
        onOpenAppointments={(query) => {
          setSearchQuery(query || '');
          setPage('appointments');
        }}
      />
    );
    const commonProps = { searchQuery, onSearchQueryChange: setSearchQuery, selectedBranch: branchCode, onSelectedBranchChange: () => undefined, branchLocked: true, tenantName, roleLabel: `Receptionist · ${account.displayName} · ${branchName}`, accessMode: 'full' as const, onNotify: setToast };
    if (page === 'appointments') {
      return (
        <TenantAdminAppointments
          {...commonProps}
          bookingRequest={appointmentBookingRequest}
          onBookingRequestHandled={() => setAppointmentBookingRequest(null)}
        />
      );
    }
    if (page === 'customers') {
      // BR-CUS-001 — khách thuộc tiệm chứ không thuộc chi nhánh, nên màn này KHÔNG nhận
      // `selectedBranch` và `branchLocked` như các màn khác của quầy: lễ tân Quận 3 phải
      // tra được khách hôm qua đến Quận 1 (BR-ISO-004).
      return (
        <TenantAdminCustomers
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          tenantName={tenantName}
          roleLabel={`Receptionist · ${account.displayName} · ${branchName}`}
          accessMode="full"
          onNotify={setToast}
          tenantId={account.tenantId}
          onBookCustomer={(customer) => {
            const name = customer.fullName?.trim() || customer.phone;
            setAppointmentBookingRequest({
              requestId: Date.now(),
              customerId: customer.id,
              name,
              phone: customer.phone,
              branch: branchCode,
              note: customer.note || '',
              // Ba trường này đã bị gỡ khỏi hồ sơ khách ở ngày 10 (quyết định 44) vì không
              // có cột nào lưu chúng. Màn đặt lịch vẫn khai chúng là bắt buộc nên truyền
              // rỗng; nó là màn dữ liệu mẫu và sẽ được viết lại ở ngày 11.
              allergies: '',
              nailCondition: '',
              favoriteTechnician: '',
            });
            setPage('appointments');
            setToast(`Đã tự động điền thông tin ${name}.`);
          }}
        />
      );
    }
    if (page === 'products') return <ReceptionistProducts {...commonProps} />;
    if (page === 'stations') return <ReceptionistStations {...commonProps} />;
    return <TenantAdminPayments {...commonProps} />;
  };

  return (
    <div className="role-shell role-shell--reception reception-workspace min-h-screen bg-brand-bg text-brand-text">
      <aside className={`role-sidebar reception-sidebar fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex w-[260px] flex-col bg-[#111625] text-white shadow-2xl transition-[width,transform] duration-300 lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex h-[var(--size-topbar)] shrink-0 items-center gap-3 border-b border-white/10 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'px-4'}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white font-black shadow-md shadow-brand-secondary/20"><Store className="h-5 w-5" /></span>
          <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-body font-bold text-white">{tenantName}</p>
            <p className="mt-0.5 text-caption font-semibold uppercase tracking-wider text-slate-400">Không gian lễ tân</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng Receptionist">
          <p className={`mb-2 px-3 text-caption font-bold uppercase tracking-[0.16em] text-slate-500 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Vận hành tại quầy</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? 'page' : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group flex h-10 w-full items-center gap-3 rounded-xl transition-all cursor-pointer ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'px-3'
                } ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    active ? 'text-emerald-400 scale-105' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={`text-xs truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
                {active && !sidebarCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-2.5 space-y-2">
          <div className={`flex items-center gap-2.5 rounded-xl bg-white/5 p-2 ${sidebarCollapsed ? 'lg:justify-center lg:p-1.5' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
              {account.displayName.split(' ').slice(-2).map((part) => part[0]).join('')}
            </span>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-xs font-bold text-white">{account.displayName}</p>
              <p className="truncate text-[10px] text-slate-400 font-medium">Lễ tân · {branchLabel}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer ${sidebarCollapsed ? 'lg:hidden' : ''}`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="hidden lg:flex h-8 w-full items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}

          <div className="hidden lg:block">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu hẹp thanh bên (Ctrl+B)'}
              aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu hẹp thanh bên'}
              className={`flex h-8 w-full items-center rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer ${
                sidebarCollapsed ? 'justify-center p-0' : 'justify-between px-2.5'
              }`}
            >
              <span className={sidebarCollapsed ? 'hidden' : 'truncate flex items-center gap-1.5'}>
                <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
                <span>Thu hẹp</span>
              </span>
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">Ctrl+B</kbd>
              )}
            </button>
          </div>
        </div>
      </aside>
      {/* Lớp phủ khi mở menu trên mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden cursor-pointer"
        />
      )}

      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <header className="role-topbar sticky top-0 z-[var(--z-sticky)] flex h-[var(--size-topbar)] items-center gap-3 border-b border-brand-outline bg-brand-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface p-0 text-brand-text shadow-xs hover:bg-brand-surface-high transition lg:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 sm:block"><p className="text-caption font-bold uppercase tracking-wider text-brand-text-muted">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</p><p className="mt-0.5 text-body font-bold text-brand-text">{navItems.find((item) => item.id === page)?.label}</p></div>
          <div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={page === 'products' ? 'Tìm tên, SKU, lô sản phẩm...' : page === 'stations' ? 'Tìm mã ghế, khách, kỹ thuật viên...' : 'Tìm tên, số điện thoại, dịch vụ...'} className="h-[var(--size-control)] w-full rounded-control border border-brand-outline bg-brand-surface-lowest pl-10 pr-4 text-body outline-none focus:border-brand-secondary" /></div>
          <span className="hidden sm:flex" title="Tài khoản chỉ được điều phối chi nhánh này"><StatusBadge status="ACTIVE" label={branchLabel} /></span>
          <button
            type="button"
            onClick={() => onThemeChange(nextThemeMode)}
            className="ui-btn ui-btn--secondary ui-btn--small"
            aria-label={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            aria-pressed={themeMode === 'dark'}
            title={themeMode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {themeMode === 'dark' ? <Sun className="h-4 w-4 text-brand-tertiary" /> : <Moon className="h-4 w-4 text-brand-text-muted" />}
            <span className="hidden sm:inline">{themeMode === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative rounded-xl border border-brand-outline p-2.5 text-brand-text-muted hover:bg-brand-surface-high"
              aria-label={`Thông báo tại quầy, ${deskAlerts.length} mục cần chú ý`}
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" />
              {deskAlerts.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-error ring-2 ring-brand-surface" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-brand-outline bg-brand-surface p-3 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-xs font-black">Thông báo tại quầy</p>
                  <span className="text-caption font-bold text-brand-error">{deskAlerts.length} cần chú ý</span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {deskAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => { setShowNotifications(false); setPage('desk'); }}
                      className={`w-full rounded-xl p-3 text-left ${alert.tone === 'cyan' ? 'bg-brand-secondary/10 text-brand-secondary' : alert.tone === 'amber' ? 'bg-brand-tertiary/10 text-brand-tertiary' : 'bg-brand-primary/10 text-brand-primary'}`}
                    >
                      <p className="text-body font-black">{alert.title}</p>
                      <p className="mt-1 text-caption opacity-75">{alert.detail}</p>
                    </button>
                  ))}
                  {deskAlerts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-brand-outline p-6 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-brand-secondary" />
                      <p className="mt-2 text-body font-black text-brand-text">Quầy đang vận hành ổn định</p>
                      <p className="mt-1 text-caption text-brand-text-muted">Không có mục cần xử lý ngay.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="role-main mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"><Suspense fallback={<div className="py-24 text-center text-xs font-bold text-brand-text-muted">Đang tải không gian lễ tân...</div>}>{MOCK_DATA_REASONS[page] && <MockDataNotice reason={MOCK_DATA_REASONS[page]} className="mb-5" />}{renderDataState()}{renderPage()}</Suspense></main>
      </div>

      {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-brand-secondary bg-brand-secondary px-4 py-3 text-xs font-bold text-white shadow-2xl"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand-secondary" />{toast}</div>}

      {deletingAppointment && (
        <Modal
          open
          size="medium"
          icon={<Trash2 />}
          title="Xác nhận hủy lịch tạo nhầm"
          description="Lịch không bị xóa mất dấu vết. Hệ thống sẽ chuyển sang trạng thái Đã hủy và lưu lý do để đối soát."
          onClose={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDeletingAppointment(null); setDeleteReason('Tạo nhầm lịch'); setFormError(''); }}>
                Giữ lại lịch
              </Button>
              <Button type="submit" form="reception-delete-appointment" variant="danger" iconLeading={<Trash2 />}>
                Xác nhận hủy
              </Button>
            </>
          }
        >
          <form id="reception-delete-appointment" onSubmit={submitDeleteAppointment} noValidate className="space-y-4">
            <div className="p-4 ui-tone ui-tone--danger">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand-error">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-brand-text">{deletingAppointment.customer}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-text-muted">
                    {deletingAppointment.start} · {deletingAppointment.service} · {deletingAppointment.phone}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={deletingAppointment.status} label={appointmentStatusLabel[deletingAppointment.status]} size="small" />
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {deletingAppointment.staff}
                    </span>
                    <span className="rounded-full bg-brand-surface px-2.5 py-1 text-caption font-black text-brand-text-muted ring-1 ring-brand-outline">
                      {money(deletingAppointment.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-3 text-body font-bold leading-5 text-brand-text-muted sm:grid-cols-2">
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Chỉ cho hủy lịch chưa bắt đầu dịch vụ</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã thanh toán</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Không cho hủy lịch đã có cọc</p>
              <p className="rounded-xl bg-brand-surface px-3 py-2">✓ Lưu người thao tác và thời gian</p>
            </div>

            <Field
              label="Lý do hủy/xóa khỏi quầy"
              required
              error={formError || undefined}
              helper="Lý do được lưu kèm người thao tác để đối soát."
            >
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                className="min-h-24 resize-none py-3"
                placeholder="Ví dụ: Tạo nhầm lịch, khách đặt trùng, nhập sai số điện thoại..."
              />
            </Field>
          </form>
        </Modal>
      )}

      {walkInOpen && (
        <Modal
          open
          size="large"
          icon={<UserCheck />}
          title="Tiếp nhận khách vãng lai"
          description="Tạo lượt phục vụ tại quầy và đưa khách vào hàng chờ ngay lập tức."
          onClose={() => { setWalkInOpen(false); setFormError(''); setWalkInErrors({}); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setWalkInOpen(false); setFormError(''); setWalkInErrors({}); }}>Hủy</Button>
              <Button type="submit" form="reception-walkin" variant="primary" iconLeading={<UserCheck />}>Tạo &amp; check-in</Button>
            </>
          }
        >
          <form id="reception-walkin" onSubmit={submitWalkIn} noValidate className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-tertiary/25 bg-brand-tertiary/10 p-3 text-body font-bold leading-5 text-brand-tertiary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Giờ mở cửa salon: 08:00 – 20:30 (Khung giờ tiếp nhận khách: 08:00 – 20:00). Hệ thống kiểm tra trùng KTV, ca làm việc, giờ đóng cửa và ghế phục vụ.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *" error={walkInErrors.customer}>
                <input
                  value={walkIn.customer}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, customer: event.target.value });
                    if (walkInErrors.customer) setWalkInErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  className="reception-input"
                  placeholder="Nguyễn Minh Anh"
                  autoFocus
                />
              </Field>
              <Field label="Số điện thoại *" helper="10 số di động VN (09xx, 08xx, 03xx, 07xx, 05xx)" error={walkInErrors.phone}>
                <input
                  type="tel"
                  value={walkIn.phone}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, phone: event.target.value });
                    if (walkInErrors.phone) setWalkInErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className="reception-input"
                  placeholder="0903123456"
                />
              </Field>
              <Field label="Dịch vụ *" error={walkInErrors.service}>
                <select
                  value={walkIn.service}
                  onChange={(event) => {
                    handleWalkInServiceChange(event.target.value);
                    if (walkInErrors.service) setWalkInErrors((prev) => ({ ...prev, service: '' }));
                  }}
                  className="reception-input"
                >
                  {emptyServiceOption}
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *" error={walkInErrors.staff}>
                <select
                  value={walkIn.staff}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, staff: event.target.value });
                    if (walkInErrors.staff) setWalkInErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="reception-input"
                >
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng" error={walkInErrors.station}>
                <select
                  value={walkIn.station}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, station: event.target.value });
                    if (walkInErrors.station) setWalkInErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="reception-input"
                >
                  <option value="">Xếp sau khi check-in</option>
                  {stationsFor(branchCode).map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *" helper="Salon mở cửa từ 08:00 đến 20:30" error={walkInErrors.start}>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={walkIn.start}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, start: event.target.value });
                    if (walkInErrors.start) setWalkInErrors((prev) => ({ ...prev, start: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Thời lượng *" error={walkInErrors.duration}>
                <select
                  value={walkIn.duration}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, duration: event.target.value });
                    if (walkInErrors.duration) setWalkInErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="reception-input"
                >
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *" error={walkInErrors.price}>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={walkIn.price}
                  onChange={(event) => {
                    setWalkIn({ ...walkIn, price: event.target.value });
                    if (walkInErrors.price) setWalkInErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={walkIn.note} onChange={(event) => setWalkIn({ ...walkIn, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Dị ứng, sở thích hoặc yêu cầu đặc biệt..." />
            </Field>
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
      )}

      {/* ⚡ Chế độ Walk-in cấp tốc (1-Click Walk-in 5 giây) */}
      {quickWalkInOpen && (
        <Modal
          open
          size="medium"
          icon={<Zap className="text-amber-500" />}
          title="⚡ Walk-in Cấp tốc (5 Giây)"
          description="Nhận khách vãng lai tức thì không bắt buộc nhập tên hay SĐT nếu khách đang vội."
          onClose={() => { setQuickWalkInOpen(false); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setQuickWalkInOpen(false); setFormError(''); }}>Hủy</Button>
              <Button
                type="button"
                onClick={() => submitQuickWalkIn('START_NOW')}
                variant="primary"
                iconLeading={<Zap className="h-4 w-4" />}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black shadow-md shadow-amber-500/25 cursor-pointer"
              >
                Nhận khách ngay (5s)
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
              ⚡ Hệ thống tự động gán mã định danh, giờ bắt đầu và đưa khách trực tiếp vào trạng thái <strong>Đang làm dịch vụ</strong> mà không gián đoạn luồng phục vụ.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Dịch vụ cơ bản *">
                <select
                  value={quickWalkInForm.service}
                  onChange={(e) => {
                    const foundService = serviceCatalog.find((s) => s.name === e.target.value);
                    setQuickWalkInForm({
                      ...quickWalkInForm,
                      service: e.target.value,
                      price: foundService ? String(foundService.price) : quickWalkInForm.price,
                      duration: foundService?.duration ? String(foundService.duration) : quickWalkInForm.duration,
                    });
                  }}
                  className="reception-input font-bold"
                >
                  {emptyServiceOption}
                  {serviceCatalog.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} · {money(s.price)} ({s.duration}p)
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Chọn ghế trống *">
                <select
                  value={quickWalkInForm.station}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, station: e.target.value })}
                  className="reception-input font-bold"
                >
                  <option value="">-- Chọn ghế salon --</option>
                  {stationsFor(branchCode).map((st) => (
                    <option key={st} value={st}>
                      💺 {st}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Chỉ định KTV (Tùy chọn)">
                <select
                  value={quickWalkInForm.staff}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, staff: e.target.value })}
                  className="reception-input"
                >
                  <option value="Chưa phân công">Chưa phân công (Chọn sau)</option>
                  {assignableTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.name}>
                      {tech.name} ({technicianStatusMeta[tech.status].label})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tên khách (Để trống = Khách Vãng Lai)">
                <input
                  type="text"
                  value={quickWalkInForm.customer}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, customer: e.target.value })}
                  placeholder="Khách Vãng Lai..."
                  className="reception-input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số điện thoại (Không bắt buộc)">
                <input
                  type="tel"
                  value={quickWalkInForm.phone}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, phone: e.target.value })}
                  placeholder="09xx..."
                  className="reception-input"
                />
              </Field>

              <Field label="Lưu ý / Dị ứng nhanh">
                <input
                  type="text"
                  value={quickWalkInForm.note}
                  onChange={(e) => setQuickWalkInForm({ ...quickWalkInForm, note: e.target.value })}
                  placeholder="Ví dụ: Da nhạy cảm, móng mỏng, vội..."
                  className="reception-input"
                />
              </Field>
            </div>

            {formError && <p role="alert" className="p-2.5 text-xs font-bold text-rose-600 bg-rose-500/10 rounded-xl border border-rose-500/20">{formError}</p>}
          </div>
        </Modal>
      )}

      {editingAppointment && (
        <Modal
          open
          size="large"
          icon={<CalendarClock />}
          headerAside={<StatusBadge status={editingAppointment.status} label={appointmentStatusLabel[editingAppointment.status]} size="small" />}
          title={`Điều phối lịch ${editingAppointment.start}`}
          description={`${editingAppointment.customer} · ${branchName}`}
          onClose={() => { setEditingAppointment(null); setFormError(''); setAppointmentEditErrors({}); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setEditingAppointment(null); setFormError(''); setAppointmentEditErrors({}); }}>Hủy</Button>
              <Button type="submit" form="reception-edit-appointment" variant="primary" iconLeading={<Check />}>Lưu điều phối</Button>
            </>
          }
        >
          <form id="reception-edit-appointment" onSubmit={submitAppointmentEdit} noValidate className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-secondary/25 bg-brand-secondary/10 p-3 text-body font-bold leading-5 text-brand-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Giờ mở cửa salon: 08:00 – 20:30. Chỉ kỹ thuật viên đang làm việc, trong ca trực và có đúng chuyên môn mới được phân công.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng *" error={appointmentEditErrors.customer}>
                <input
                  value={appointmentEditForm.customer}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, customer: event.target.value });
                    if (appointmentEditErrors.customer) setAppointmentEditErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  className="reception-input"
                  autoFocus
                />
              </Field>
              <Field label="Số điện thoại *" helper="10 số di động VN (09xx, 08xx, 03xx, 07xx, 05xx)" error={appointmentEditErrors.phone}>
                <input
                  type="tel"
                  value={appointmentEditForm.phone}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, phone: event.target.value });
                    if (appointmentEditErrors.phone) setAppointmentEditErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Dịch vụ *" error={appointmentEditErrors.service}>
                <select
                  value={appointmentEditForm.service}
                  onChange={(event) => {
                    handleAppointmentEditServiceChange(event.target.value);
                    if (appointmentEditErrors.service) setAppointmentEditErrors((prev) => ({ ...prev, service: '' }));
                  }}
                  className="reception-input"
                >
                  {emptyServiceOption}
                  {serviceCatalog.map((service) => <option key={service.name}>{service.name}</option>)}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *" error={appointmentEditErrors.staff}>
                <select
                  value={appointmentEditForm.staff}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, staff: event.target.value });
                    if (appointmentEditErrors.staff) setAppointmentEditErrors((prev) => ({ ...prev, staff: '' }));
                  }}
                  className="reception-input"
                >
                  <option>Chưa phân công</option>
                  {assignableTechnicians.map((technician) => <option key={technician.id} value={technician.name}>{technician.name} · {technicianStatusMeta[technician.status].label}</option>)}
                </select>
              </Field>
              <Field label="Ghế / phòng" error={appointmentEditErrors.station}>
                <select
                  value={appointmentEditForm.station}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, station: event.target.value });
                    if (appointmentEditErrors.station) setAppointmentEditErrors((prev) => ({ ...prev, station: '' }));
                  }}
                  className="reception-input"
                >
                  <option value="">Chưa xếp ghế</option>
                  {stationsFor(branchCode).map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </Field>
              <Field label="Giờ bắt đầu *" helper="Salon mở cửa từ 08:00 đến 20:30" error={appointmentEditErrors.start}>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={appointmentEditForm.start}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, start: event.target.value });
                    if (appointmentEditErrors.start) setAppointmentEditErrors((prev) => ({ ...prev, start: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
              <Field label="Thời lượng *" error={appointmentEditErrors.duration}>
                <select
                  value={appointmentEditForm.duration}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, duration: event.target.value });
                    if (appointmentEditErrors.duration) setAppointmentEditErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="reception-input"
                >
                  {[30, 40, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} phút</option>)}
                </select>
              </Field>
              <Field label="Giá dự kiến *" error={appointmentEditErrors.price}>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={appointmentEditForm.price}
                  onChange={(event) => {
                    setAppointmentEditForm({ ...appointmentEditForm, price: event.target.value });
                    if (appointmentEditErrors.price) setAppointmentEditErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className="reception-input"
                />
              </Field>
            </div>
            <Field label="Ghi chú phục vụ">
              <textarea value={appointmentEditForm.note} onChange={(event) => setAppointmentEditForm({ ...appointmentEditForm, note: event.target.value })} className="reception-input min-h-20 resize-none" placeholder="Yêu cầu của khách, dị ứng, mẫu tham khảo..." />
            </Field>
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
      )}

      {paymentAppointment && (
        <Modal
          open
          size="fullscreen"
          icon={<ReceiptText />}
          title="Tạo hóa đơn & thanh toán"
          description={`${paymentAppointment.customer} · ${paymentAppointment.phone} · ${branchName}`}
          onClose={() => setPaymentAppointment(null)}
          footer={
            <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-brand-text-muted">Tổng thực thu:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{money(invoiceTotal)}</span>
                {paymentAppointment.deposit > 0 && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Đã trừ cọc {money(paymentAppointment.deposit)}
                  </span>
                )}
                {invoiceDiscount > 0 && (
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Giảm {money(invoiceDiscount)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button variant="secondary" onClick={() => setPaymentAppointment(null)}>
                  Đóng
                </Button>
                <button
                  type="submit"
                  form="reception-invoice-form"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Xác nhận thanh toán {money(invoiceTotal)}
                </button>
              </div>
            </div>
          }
        >
          {/* Nút thanh toán nằm cạnh khối tổng tiền trong cột phải, không tách ra
              chân hộp thoại — người thu ngân cần thấy số tiền ngay khi bấm. */}
          <form id="reception-invoice-form" onSubmit={submitPayment} className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:overflow-hidden">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface-high/25 lg:flex lg:min-h-0 lg:flex-col">
              <div className="shrink-0 border-b border-brand-outline p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-brand-text">Chọn dịch vụ, mẫu vẽ hoặc sản phẩm</h3>
                    <p className="mt-1 text-body text-brand-text-muted">Chọn dịch vụ, gắn mẫu vẽ theo độ khó hoặc thêm sản phẩm đi kèm.</p>
                  </div>
                  <div className="flex rounded-xl border border-brand-outline bg-brand-surface p-1">
                    <button type="button" onClick={() => { setInvoiceCatalogTab('SERVICE'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>Dịch vụ</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('ART'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'ART' ? 'bg-amber-600 text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>🎨 Mẫu vẽ & Độ khó</button>
                    <button type="button" onClick={() => { setInvoiceCatalogTab('PRODUCT'); setInvoiceCategory('Tất cả'); }} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${invoiceCatalogTab === 'PRODUCT' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}>Sản phẩm</button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
                  <input
                    value={invoiceCatalogQuery}
                    onChange={(event) => setInvoiceCatalogQuery(event.target.value)}
                    className="reception-input pl-10"
                    placeholder={
                      invoiceCatalogTab === 'SERVICE'
                        ? 'Tìm tên dịch vụ...'
                        : invoiceCatalogTab === 'ART'
                          ? 'Tìm mẫu nail art, phong cách vẽ tranh...'
                          : 'Tìm tên sản phẩm...'
                    }
                  />
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {invoiceCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setInvoiceCategory(category)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-bold ${
                        invoiceCategory === category
                          ? invoiceCatalogTab === 'SERVICE'
                            ? 'border-brand-secondary bg-brand-secondary text-white'
                            : invoiceCatalogTab === 'ART'
                              ? 'border-amber-600 bg-amber-600 text-white'
                              : 'border-brand-primary bg-brand-primary text-white'
                          : 'border-brand-outline bg-brand-surface text-brand-text-muted'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh sách dịch vụ / Mẫu vẽ / Sản phẩm */}
              {invoiceCatalogTab === 'ART' ? (
                <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-2">
                  {filteredArtTemplates.map((template) => {
                    const preset = ART_DIFFICULTY_PRESETS.find(p => p.level === template.defaultLevel);
                    return (
                      <div
                        key={template.id}
                        className="group relative flex flex-col rounded-2xl border border-amber-500/30 bg-brand-surface p-4 shadow-sm transition-all duration-300 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-caption font-bold text-amber-700 dark:text-amber-300">
                              {template.category}
                            </span>
                            <h4 className="mt-1 text-xs font-black text-brand-text">{template.name}</h4>
                          </div>
                          <span className="shrink-0 rounded-lg bg-brand-surface-high border border-amber-500/30 px-2 py-1 text-right">
                            <span className="block text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">{preset?.shortLabel}</span>
                            <span className="block text-caption font-black text-brand-text">+{money(template.surcharge)}</span>
                          </span>
                        </div>

                        <p className="mt-2 text-caption text-brand-text-muted line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.tags.map(t => (
                            <span key={t} className="rounded bg-brand-surface-high/60 px-1.5 py-0.5 text-[10px] text-brand-text-muted">
                              #{t}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-brand-outline/40">
                          <span className="text-caption text-brand-text-muted font-bold">
                            Thời gian: ~{template.duration}p
                          </span>
                          <button
                            type="button"
                            onClick={() => addArtServiceItem(template)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3 py-1.5 text-caption font-black shadow-sm transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm dịch vụ sơn + vẽ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!filteredArtTemplates.length && (
                    <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">
                      Không tìm thấy mẫu vẽ phù hợp.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:min-h-0 lg:flex-1 xl:grid-cols-3">
                  {filteredCatalog.map((item, index) => {
                    const count = invoiceLines.filter((line) => line.type === invoiceCatalogTab && line.name === item.name).reduce((sum, line) => sum + line.quantity, 0);
                    return (
                      <div
                        key={item.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            addCatalogItem(invoiceCatalogTab, item);
                          }
                        }}
                        className="group relative flex min-h-[170px] flex-col rounded-2xl border border-brand-outline bg-brand-surface p-4 text-left shadow-sm transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-brand-secondary hover:shadow-lg hover:shadow-card focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                      >
                        {count > 0 && <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-secondary px-1.5 text-caption font-black text-white">{count}</span>}
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? ' text-brand-secondary' : ' text-brand-primary'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <span className="mt-3 line-clamp-2 text-xs font-black leading-5 text-brand-text">{item.name}</span>
                        <span className="mt-1 text-caption font-semibold text-brand-text-muted">{item.category}</span>
                        <span className="mt-auto flex items-end justify-between gap-3 pt-3">
                          <span>
                            <span className={`block text-sm font-black ${invoiceCatalogTab === 'SERVICE' ? 'text-brand-secondary' : 'text-brand-primary'}`}>{money(item.price)}</span>
                            <span className="mt-0.5 block text-caption text-brand-text-muted">{invoiceCatalogTab === 'SERVICE' ? `${item.duration} phút` : `Còn ${item.stock} sản phẩm`}</span>
                          </span>
                          {count > 0 ? (
                            <span className="flex items-center gap-1.5 shrink-0 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => removeCatalogItem(invoiceCatalogTab, item)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-outline bg-brand-surface text-brand-text hover:bg-brand-surface-high transition-all duration-200 cursor-pointer shadow-sm"
                                aria-label="Giảm số lượng"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-body font-black w-5 text-center text-brand-text">{count}</span>
                              <button
                                type="button"
                                onClick={() => addCatalogItem(invoiceCatalogTab, item)}
                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary hover:bg-brand-secondary' : 'bg-brand-primary hover:bg-brand-primary'}`}
                                aria-label="Tăng số lượng"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ) : (
                            <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all duration-200 group-hover:scale-105 shrink-0 ${invoiceCatalogTab === 'SERVICE' ? 'bg-brand-secondary' : 'bg-brand-primary'}`}>
                              <Plus className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {!filteredCatalog.length && (
                    <div className="col-span-full py-16 text-center text-xs text-brand-text-muted">
                      {invoiceCatalogTab === 'SERVICE' && activeCatalog.length === 0
                        ? (salonServices.loading ? 'Đang tải bảng giá dịch vụ…' : 'Tiệm chưa khai dịch vụ nào.')
                        : 'Không tìm thấy mục phù hợp.'}
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="min-w-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 scrollbar-thin scrollbar-thumb-brand-outline/60">
              {/* Thẻ 1: Khách hàng & Bảng danh sách dịch vụ đã chọn */}
              <div className="selected-services rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-sm flex flex-col w-full min-w-0 lg:flex-1 lg:min-h-[360px] min-h-[320px] overflow-hidden overflow-x-hidden">
                <div className="flex items-center gap-3 border-b border-brand-outline pb-3 shrink-0 w-full min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white font-black text-sm shadow-sm">
                    {paymentAppointment.customer.split(' ').slice(-2).map((part) => part[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-black text-brand-text">{paymentAppointment.customer}</p>
                      <span className="shrink-0 rounded-md bg-brand-secondary/10 px-1.5 py-0.5 text-caption font-bold text-brand-secondary">Đã check-in</span>
                    </div>
                    <p className="mt-0.5 truncate text-caption text-brand-text-muted">{paymentAppointment.phone} · ID: {paymentAppointment.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-1 text-caption font-black text-brand-primary">{branchCode}</span>
                </div>

                {/* 🔗 GỘP HÓA ĐƠN (MERGE BILLS) CHO KHÁCH ĐI THEO NHÓM / MẸ CON / BẠN BÈ */}
                <div className="mt-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
                      <UsersRound className="h-3.5 w-3.5" /> Gộp hóa đơn nhóm / bạn bè (Merge Bills)
                    </span>
                    {mergedAppointmentIds.length > 0 && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        Đang gộp {mergedAppointmentIds.length} khách
                      </span>
                    )}
                  </div>

                  {mergedAppointmentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mergedAppointmentIds.map((mId) => {
                        const mApp = appointments.find((a) => a.id === mId);
                        return (
                          <span
                            key={mId}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                          >
                            <span>🔗 {mApp?.customer || mId} ({mApp?.station || 'Ghế'})</span>
                            <button
                              type="button"
                              onClick={() => unmergeAppointmentFromBill(mId)}
                              className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                              title="Tách ra khỏi hóa đơn này"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Danh sách các khách/ghế khác đang hoạt động có thể gộp */}
                  {appointments.filter((a) => a.id !== paymentAppointment.id && a.branch === branchCode && ['CHECKED_IN', 'IN_SERVICE'].includes(a.status) && !mergedAppointmentIds.includes(a.id)).length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-caption">
                      <span className="text-brand-text-muted font-bold">Gộp thêm:</span>
                      {appointments
                        .filter((a) => a.id !== paymentAppointment.id && a.branch === branchCode && ['CHECKED_IN', 'IN_SERVICE'].includes(a.status) && !mergedAppointmentIds.includes(a.id))
                        .slice(0, 3)
                        .map((otherApp) => (
                          <button
                            key={otherApp.id}
                            type="button"
                            onClick={() => mergeAppointmentToBill(otherApp)}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-brand-surface px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer shadow-2xs"
                          >
                            <Plus className="h-2.5 w-2.5" /> {otherApp.customer} ({otherApp.station || otherApp.start})
                          </button>
                        ))}
                    </div>
                  ) : (
                    mergedAppointmentIds.length === 0 && (
                      <p className="text-[11px] text-brand-text-muted">
                        Không có khách đang làm khác tại chi nhánh để gộp.
                      </p>
                    )
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 shrink-0 pb-2 w-full min-w-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ReceiptText className="h-3.5 w-3.5 text-brand-secondary shrink-0" />
                    <h3 className="text-xs font-black text-brand-text truncate">Chi tiết dịch vụ, giá tiền & ưu đãi</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-caption font-bold">
                    <span className="rounded-full bg-brand-surface-high px-2 py-0.5 text-brand-text-muted shrink-0">{invoiceLines.length} dòng</span>
                    <span className="rounded-full bg-brand-secondary/10 px-2 py-0.5 text-brand-secondary shrink-0">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                    {invoiceDiscount > 0 && <span className="rounded-full bg-brand-error/10 px-2 py-0.5 text-brand-error shrink-0">Ưu đãi -{money(invoiceDiscount)}</span>}
                  </div>
                </div>

                {/* Khung Bảng dịch vụ */}
                <div className="service-list-container mt-1 flex-1 flex flex-col min-h-[240px] w-full min-w-0 overflow-hidden overflow-x-hidden rounded-xl border border-brand-outline/60 bg-brand-surface-high/20">
                  {/* Hàng tiêu đề Bảng */}
                  <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-center gap-1 px-2 py-2 text-caption font-extrabold uppercase tracking-wider text-brand-text-muted border-b border-brand-outline bg-brand-surface-high/50 shrink-0 w-full min-w-0">
                    <span className="text-center min-w-0">STT</span>
                    <span className="min-w-0">Dịch vụ & Mẫu vẽ đi kèm</span>
                    <span className="text-right min-w-0">Đơn giá</span>
                    <span className="min-w-0">Kỹ thuật viên</span>
                    <span className="text-center min-w-0">Số lượng</span>
                    <span className="text-right min-w-0">Thành tiền</span>
                    <span className="text-center min-w-0">Xóa</span>
                  </div>

                  {/* Vùng cuộn các dòng Bảng */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0 divide-y divide-brand-outline/40 scrollbar-thin scrollbar-thumb-brand-outline/60 py-0.5">
                    {invoiceLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="w-full min-w-0 text-xs transition-colors hover:bg-brand-surface-high/40 shrink-0"
                      >
                        {/* 1-Row Grid Layout chuẩn xác trên xl: */}
                        <div className="hidden xl:grid grid-cols-[28px_minmax(0,1fr)_56px_82px_66px_70px_22px] items-start gap-1 w-full min-w-0 px-2 py-2.5">
                          {/* STT */}
                          <div className="flex justify-center items-center min-w-0 pt-1">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-caption font-black border ${line.type === 'SERVICE' ? 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary' : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Tên dịch vụ & Mẫu vẽ + Độ khó + Phụ kiện đi kèm */}
                          <div className="min-w-0 pr-1">
                            <p className="font-bold text-brand-text text-body leading-snug min-w-0">
                              {line.name}
                            </p>
                            
                            {/* Chi tiết mẫu vẽ, màu sơn, phụ kiện nếu có */}
                            <div className="mt-1 space-y-1">
                              {line.designName && (
                                <div className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  <span>🎨 Mẫu: {line.designName}</span>
                                  {line.difficultyLabel && (
                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-black">
                                      {line.difficultyLabel}
                                    </span>
                                  )}
                                  {line.designSurcharge ? (
                                    <span className="text-amber-800 dark:text-amber-200 font-extrabold">
                                      (+{money(line.designSurcharge)})
                                    </span>
                                  ) : null}
                                </div>
                              )}

                              {line.attachedColorName && (
                                <div className="flex items-center gap-1 text-[11px] text-brand-text-muted">
                                  {line.attachedColorHex && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-black/20"
                                      style={{ backgroundColor: line.attachedColorHex }}
                                    />
                                  )}
                                  <span>Màu: <strong className="text-brand-text">{line.attachedColorName}</strong></span>
                                </div>
                              )}

                              {line.attachedProductName && (
                                <div className="text-[11px] text-brand-text-muted">
                                  <span>💎 Kèm: <strong className="text-brand-text">{line.attachedProductName}</strong> {line.attachedProductPrice ? `(+${money(line.attachedProductPrice)})` : ''}</span>
                                </div>
                              )}

                              {line.customArtNote && (
                                <div className="text-[11px] italic text-brand-text-muted line-clamp-1">
                                  📝 {line.customArtNote}
                                </div>
                              )}
                            </div>

                            {/* Nút tùy chỉnh mẫu vẽ & độ khó dành cho dịch vụ */}
                            {line.type === 'SERVICE' && (
                              <button
                                type="button"
                                onClick={() => openLineCustomizer(line)}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-brand-secondary/40 bg-brand-secondary/10 px-2 py-0.5 text-[11px] font-bold text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all cursor-pointer shadow-xs"
                              >
                                <Palette className="h-3 w-3" />
                                {line.designName ? 'Sửa mẫu vẽ & độ khó' : '+ Kèm mẫu vẽ/độ khó/phụ kiện'}
                              </button>
                            )}

                            <p className="mt-0.5 truncate text-caption font-semibold text-brand-text-muted">
                              {line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · {line.staff}
                            </p>
                          </div>

                          {/* Đơn giá */}
                          <div className="min-w-0 w-full text-right pt-1">
                            <span className="block truncate text-caption font-bold text-brand-text-muted">x {money(line.unitPrice)}</span>
                          </div>

                          {/* Kỹ thuật viên */}
                          <div className="min-w-0 w-full pt-0.5">
                            {line.type === 'SERVICE' ? (
                              <select
                                value={line.staff}
                                onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                className={`h-8 w-full min-w-0 rounded-lg border px-1 text-caption font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                  line.staff === 'Chưa phân công'
                                    ? 'border-brand-tertiary/60 bg-brand-tertiary/10 text-brand-tertiary focus:border-brand-tertiary focus:ring-2 focus:ring-brand-tertiary/20'
                                    : 'border-brand-outline bg-brand-surface-high/80 focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20'
                                }`}
                                aria-label={`Kỹ thuật viên cho ${line.name}`}
                              >
                                {invoiceStaff.map((staff) => (
                                  <option key={staff} value={staff}>{staff}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="h-8 w-full min-w-0 flex items-center justify-center rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-caption font-semibold">
                                Sản phẩm
                              </div>
                            )}
                          </div>

                          {/* Số lượng */}
                          <div className="min-w-0 w-full flex justify-center pt-0.5">
                            <div className="flex h-8 w-full min-w-0 items-center justify-between rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-colors"
                                aria-label={`Giảm số lượng ${line.name}`}
                              >
                                −
                              </button>
                              <span className="text-body font-black text-brand-text flex-1 text-center min-w-0">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })}
                                className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-sm font-black text-brand-text-muted hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-colors"
                                aria-label={`Tăng số lượng ${line.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Thành tiền */}
                          <div className="min-w-0 w-full text-right pt-1">
                            <strong className="block text-body font-black text-brand-text tracking-tight min-w-0 truncate">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>

                          {/* Xóa */}
                          <div className="min-w-0 w-[22px] flex justify-center pt-1">
                            <button
                              type="button"
                              onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                              className="flex h-7 w-6 items-center justify-center rounded-lg text-brand-error hover:text-brand-error hover:bg-brand-error/15 focus:outline-none focus:ring-2 focus:ring-brand-error/40 transition-all cursor-pointer"
                              title="Xóa dịch vụ"
                              aria-label={`Xóa ${line.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Responsive 2-Row Layout Fallback khi khung hẹp (< xl) */}
                        <div className="xl:hidden flex flex-col gap-2 w-full min-w-0 p-3">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-body font-black border ${line.type === 'SERVICE' ? 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary' : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'}`}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span className="min-w-0 flex-1">
                                <p className="font-bold text-brand-text text-xs leading-snug min-w-0" title={line.name}>
                                  {line.name}
                                </p>
                                
                                {line.designName && (
                                  <div className="mt-1 inline-flex flex-wrap items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                    <span>🎨 {line.designName}</span>
                                    {line.difficultyLabel && <span>({line.difficultyLabel})</span>}
                                    {line.designSurcharge ? <span>+{money(line.designSurcharge)}</span> : null}
                                  </div>
                                )}

                                {line.attachedColorName && (
                                  <p className="mt-0.5 text-[11px] text-brand-text-muted">
                                    💅 Màu: {line.attachedColorName}
                                  </p>
                                )}

                                {line.attachedProductName && (
                                  <p className="mt-0.5 text-[11px] text-brand-text-muted">
                                    💎 Kèm: {line.attachedProductName} (+{money(line.attachedProductPrice || 0)})
                                  </p>
                                )}

                                {line.type === 'SERVICE' && (
                                  <button
                                    type="button"
                                    onClick={() => openLineCustomizer(line)}
                                    className="mt-1.5 flex items-center gap-1 rounded border border-brand-secondary/40 bg-brand-secondary/10 px-2 py-0.5 text-[11px] font-bold text-brand-secondary cursor-pointer"
                                  >
                                    <Palette className="h-3 w-3" /> Tùy chỉnh mẫu vẽ & giá
                                  </button>
                                )}

                                <p className="mt-0.5 text-caption font-semibold text-brand-text-muted">{line.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'} · Đơn giá {money(line.unitPrice)}</p>
                              </span>
                            </div>
                            <strong className="text-xs font-black text-brand-text shrink-0 text-right">
                              {money(line.quantity * line.unitPrice)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-outline/20 min-w-0">
                            <div className="min-w-0 flex-1 max-w-[160px]">
                              {line.type === 'SERVICE' ? (
                                <select
                                  value={line.staff}
                                  onChange={(event) => updateInvoiceLine(line.id, { staff: event.target.value })}
                                  className={`h-8 w-full min-w-0 rounded-lg border px-2 text-body font-semibold text-brand-text outline-none transition-all cursor-pointer truncate ${
                                    line.staff === 'Chưa phân công'
                                      ? 'border-brand-tertiary/60 bg-brand-tertiary/10 text-brand-tertiary'
                                      : 'border-brand-outline bg-brand-surface-high/80'
                                  }`}
                                >
                                  {invoiceStaff.map((staff) => (
                                    <option key={staff} value={staff}>{staff}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-body font-semibold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-1 rounded-md">Sản phẩm</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex h-7 items-center rounded-lg border border-brand-outline bg-brand-surface-high/60 p-0.5">
                                <button type="button" onClick={() => updateInvoiceLine(line.id, { quantity: Math.max(1, line.quantity - 1) })} className="h-6 w-6 text-xs font-black text-brand-text-muted hover:text-brand-text flex items-center justify-center">−</button>
                                <span className="w-5 text-center text-xs font-black text-brand-text">{line.quantity}</span>
                                <button type="button" onClick={() => updateInvoiceLine(line.id, { quantity: line.quantity + 1 })} className="h-6 w-6 text-xs font-black text-brand-text-muted hover:text-brand-text flex items-center justify-center">+</button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setInvoiceLines((current) => current.filter((item) => item.id !== line.id))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-error hover:text-brand-error hover:bg-brand-error/15"
                                title="Xóa dịch vụ"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!invoiceLines.length && (
                      <div className="py-12 text-center text-xs text-brand-text-muted">
                        Chưa chọn dịch vụ hoặc sản phẩm nào.<br />Nhấn vào danh mục bên trái để thêm vào hóa đơn.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Đối soát tổng quan chi phí & Giảm giá / Tip */}
              <div className="rounded-2xl border border-brand-secondary/25 bg-brand-surface p-4 shadow-sm text-body lg:shrink-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-[0.08em] text-brand-secondary">Đối soát hóa đơn</p>
                    <p className="mt-1 text-caption text-brand-text-muted">Giá dịch vụ, cọc, ưu đãi, tip, thuế/phụ phí và tổng cuối.</p>
                  </div>
                  <span className="rounded-full bg-brand-secondary/10 px-2.5 py-1 text-caption font-black text-brand-secondary">{invoiceLines.reduce((s, l) => s + l.quantity, 0)} mục</span>
                </div>

                <div className="rounded-xl border border-brand-outline/70 bg-brand-surface-high/25 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-caption font-bold uppercase tracking-wider text-brand-text-muted">Tạm tính</span>
                      <strong className="mt-1 block text-sm font-black text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="rounded-lg bg-brand-surface p-2">
                      <span className="block text-caption font-bold uppercase tracking-wider text-brand-text-muted">Ưu đãi</span>
                      <strong className="mt-1 block text-sm font-black text-brand-error">-{money(invoiceDiscount)}</strong>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-brand-outline/40 pt-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><ReceiptText className="h-3.5 w-3.5 shrink-0 text-brand-text-muted" /><span className="truncate">Tổng tiền dịch vụ</span></span>
                      <strong className="text-right text-brand-text">{money(invoiceSubtotal)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-secondary" /><span className="truncate">Tiền cọc</span></span>
                      <strong className="text-right text-brand-secondary">- {money(paymentAppointment.deposit)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-error" /><span className="truncate">Giảm giá / Ưu đãi</span></span>
                      <strong className="text-right text-brand-error">- {money(invoiceDiscount)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><WalletCards className="h-3.5 w-3.5 shrink-0 text-brand-secondary" /><span className="truncate">Tip kỹ thuật viên</span></span>
                      <strong className="text-right text-brand-secondary">+ {money(invoiceTip)}</strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-brand-text-muted">
                      <span className="flex min-w-0 items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0 text-brand-tertiary" /><span className="truncate">Thuế / Phụ phí nếu có</span></span>
                      <strong className="text-right text-brand-tertiary">+ {money(invoiceTaxAndFees)}</strong>
                    </div>
                  </div>
                </div>

                {/* Chọn chương trình ưu đãi Loyalty */}
                <div className="mt-3 rounded-xl border border-brand-primary/25 bg-brand-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-brand-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Áp dụng chương trình ưu đãi
                    </span>
                  </div>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => handleSelectPromo(e.target.value)}
                    className="mt-2 h-9 w-full rounded-lg border border-brand-primary/20 bg-brand-surface px-2.5 text-body font-bold text-brand-text outline-none focus:border-brand-primary"
                  >
                    <option value="">-- Chọn ưu đãi hoặc nhập giảm giá bên dưới --</option>
                    {loyaltyPrograms.filter((p) => p.status === 'ACTIVE').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.benefit})
                      </option>
                    ))}
                  </select>

                  {promoFeedback && (
                    <div className={`mt-2 rounded-lg p-2.5 text-caption font-bold leading-4 ${promoFeedback.isError ? 'bg-brand-error/10 text-brand-error border border-brand-error' : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary'}`}>
                      {promoFeedback.text}
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-error/20 bg-brand-error/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-brand-error">Giảm giá</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-error">-</span>
                        <input type="number" min="0" step="1000" value={paymentForm.discount} onChange={(event) => { setSelectedPromoId(''); setPromoFeedback(null); setPaymentForm({ ...paymentForm, discount: event.target.value }); }} className="w-[86px] rounded-lg border border-brand-error/20 bg-brand-surface py-1.5 px-2 text-right text-body font-black text-brand-text outline-none focus:border-brand-error focus:ring-2 focus:ring-brand-error/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => { setSelectedPromoId(''); setPromoFeedback(null); setPaymentForm({ ...paymentForm, discount: String(val) }); }} className={`rounded-lg px-1.5 py-1.5 text-caption font-black transition ${Number(paymentForm.discount) === val ? 'bg-brand-error text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `-${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-secondary/20 bg-brand-secondary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-brand-secondary">Tip KTV</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-secondary">+</span>
                        <input type="number" min="0" step="1000" value={paymentForm.tip} onChange={(event) => setPaymentForm({ ...paymentForm, tip: event.target.value })} className="w-[86px] rounded-lg border border-brand-secondary/20 bg-brand-surface py-1.5 px-2 text-right text-body font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/15" placeholder="0" />
                        <span className="font-bold text-brand-text">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[0, 20000, 50000, 100000].map((val) => (
                        <button key={val} type="button" onClick={() => setPaymentForm({ ...paymentForm, tip: String(val) })} className={`rounded-lg px-1.5 py-1.5 text-caption font-black transition ${Number(paymentForm.tip) === val ? 'bg-brand-secondary text-white shadow-sm' : 'bg-brand-surface text-brand-text-muted hover:text-brand-text'}`}>
                          {val === 0 ? 'Không' : `+${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-brand-secondary/40 p-3.5 shadow-inner">
                  <div className="min-w-0">
                    <span className="block text-caption font-extrabold uppercase tracking-wider text-brand-secondary">Tổng thanh toán cuối cùng</span>
                    <span className="mt-0.5 block truncate text-caption text-brand-text-muted">Sau cọc, ưu đãi, tip và thuế/phụ phí</span>
                  </div>
                  <strong className="text-right text-2xl font-black tracking-tight text-brand-secondary sm:text-3xl">{money(invoiceTotal)}</strong>
                </div>
              </div>

              {/* Thẻ 3: Phương thức & Xác nhận thanh toán (Hỗ trợ Tách hóa đơn / Split Payments) */}
              <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm space-y-3 lg:shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-outline/40 pb-2">
                  <p className="text-caption font-extrabold uppercase tracking-[0.08em] text-brand-text-muted">
                    Phương thức thanh toán
                  </p>
                  
                  {/* Mode switcher: Đơn lẻ vs Tách nhiều phương thức */}
                  <div className="flex items-center gap-1 rounded-lg bg-brand-surface-high p-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSplitPaymentMode(false)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        !splitPaymentMode
                          ? 'bg-brand-secondary text-white font-black shadow-xs'
                          : 'text-brand-text-muted hover:text-brand-text'
                      }`}
                    >
                      1 Phương thức
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSplitPaymentMode(true);
                        if (splitPaymentsList.length === 0) {
                          splitEqually(2);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        splitPaymentMode
                          ? 'bg-indigo-600 text-white font-black shadow-xs'
                          : 'text-brand-text-muted hover:text-brand-text'
                      }`}
                    >
                      <Split className="h-3 w-3" /> Tách / Chia tiền (Split)
                    </button>
                  </div>
                </div>

                {!splitPaymentMode ? (
                  /* Chế độ 1 Phương thức thanh toán chuẩn */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(methodMeta).map(([value, meta]) => {
                        const Icon = meta.icon;
                        const selected = paymentForm.method === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentForm({ ...paymentForm, method: value as PaymentMethod })}
                            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-caption font-bold transition-all cursor-pointer ${
                              selected
                                ? 'border-brand-secondary bg-brand-secondary/15 text-brand-secondary shadow-sm'
                                : 'border-brand-outline text-brand-text-muted hover:bg-brand-surface-high'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>

                    {paymentForm.method !== 'CASH' && (
                      <input
                        value={paymentForm.reference}
                        onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })}
                        className="reception-input h-8 text-body"
                        placeholder="Mã giao dịch chuyển khoản / thẻ *"
                      />
                    )}
                  </div>
                ) : (
                  /* Chế độ Tách nhiều hình thức / Chia tiền theo nhóm (Split Payments) */
                  <div className="space-y-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-caption font-black text-indigo-700 dark:text-indigo-300">
                        Chia nhanh:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => splitEqually(2)}
                          className="rounded-md border border-indigo-500/30 bg-brand-surface px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                        >
                          Chia 2 (50/50)
                        </button>
                        <button
                          type="button"
                          onClick={() => splitEqually(3)}
                          className="rounded-md border border-indigo-500/30 bg-brand-surface px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                        >
                          Chia 3
                        </button>
                        <button
                          type="button"
                          onClick={addSplitRow}
                          className="rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer shadow-2xs"
                        >
                          + Thêm phần
                        </button>
                      </div>
                    </div>

                    {/* Danh sách các phần thanh toán */}
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {splitPaymentsList.map((splitRow, idx) => (
                        <div
                          key={splitRow.id}
                          className="grid grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-1.5 rounded-lg border border-brand-outline bg-brand-surface p-2 text-xs"
                        >
                          {/* Phương thức */}
                          <select
                            value={splitRow.method}
                            onChange={(e) => updateSplitRow(splitRow.id, { method: e.target.value as PaymentMethod })}
                            className="h-8 rounded-md border border-brand-outline bg-brand-surface-high px-1 text-[11px] font-bold text-brand-text outline-none"
                          >
                            {Object.entries(methodMeta).map(([val, meta]) => (
                              <option key={val} value={val}>{meta.label}</option>
                            ))}
                          </select>

                          {/* Số tiền */}
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={splitRow.amount}
                              onChange={(e) => updateSplitRow(splitRow.id, { amount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                              className="h-8 w-full rounded-md border border-brand-outline bg-brand-surface-high px-2 text-right text-xs font-black text-brand-text outline-none focus:border-brand-secondary"
                              placeholder="0"
                            />
                          </div>

                          {/*
                            Người trả (tiền mặt) hoặc mã giao dịch (mọi phương thức khác).

                            🔴 Ô này từng ghi vào `payerName` trong khi phép kiểm ở `submitPayment`
                            đọc `reference`, nên **chia tiền với bất kỳ phương thức không phải tiền
                            mặt nào cũng bất khả thi**: gõ mã xong vẫn nhận "cần nhập mã giao dịch
                            để đối soát", và không có cách nào qua được. BR-PAY-004 vì vậy bị chặn
                            hẳn ở giao diện dù máy chủ hỗ trợ đầy đủ. Sửa ở ngày 15.

                            Với tiền mặt, ô này vẫn là tên người trả và cố ý KHÔNG gửi lên: máy chủ
                            chỉ có cột `reference` cho mã giao dịch (BR-PAY-005), và nhét tên người
                            vào đó là làm bẩn một cột dùng để đối soát với sao kê ngân hàng.
                          */}
                          <input
                            type="text"
                            value={splitRow.method === 'CASH' ? (splitRow.payerName || '') : (splitRow.reference || '')}
                            onChange={(e) => updateSplitRow(
                              splitRow.id,
                              splitRow.method === 'CASH'
                                ? { payerName: e.target.value }
                                : { reference: e.target.value }
                            )}
                            placeholder={splitRow.method === 'CASH' ? `Phần ${idx + 1}...` : 'Mã GD / Tên...'}
                            className="h-8 w-full rounded-md border border-brand-outline bg-brand-surface-high px-2 text-[11px] text-brand-text outline-none"
                          />

                          {/* Nút xóa */}
                          <button
                            type="button"
                            onClick={() => removeSplitRow(splitRow.id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Xóa phần này"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Đối soát chênh lệch tổng tiền chia */}
                    {(() => {
                      const currentSplitSum = splitPaymentsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                      const diff = invoiceTotal - currentSplitSum;
                      return (
                        <div
                          className={`rounded-lg p-2 text-xs font-bold ${
                            diff === 0
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Đã phân bổ: <strong>{money(currentSplitSum)}</strong></span>
                            {diff === 0 ? (
                              <span className="flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" /> Khớp 100%
                              </span>
                            ) : (
                              <span className="font-black text-rose-600 dark:text-rose-400">
                                {diff > 0 ? `Còn thiếu ${money(diff)}` : `Vượt quá ${money(Math.abs(diff))}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <textarea
                  value={paymentForm.note}
                  onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })}
                  className="reception-input min-h-[50px] text-body resize-none"
                  placeholder="Ghi chú hóa đơn (không bắt buộc)..."
                />
                {formError && <p role="alert" className="rounded-xl bg-brand-error/10 p-2.5 text-caption font-bold leading-4 text-brand-error">{formError}</p>}
              </div>
            </aside>
          </form>
        </Modal>
      )}

      {/* Hộp thoại tùy chỉnh chi tiết Mẫu vẽ & Độ khó & Sản phẩm đi kèm cho Dịch vụ */}
      {customizingLine && (
        <ArtCustomizerDialog
          customizingLine={customizingLine}
          setCustomizingLine={setCustomizingLine}
          customizerForm={customizerForm}
          setCustomizerForm={setCustomizerForm}
          nailArtTemplates={nailArtTemplates}
          polishColorOptions={polishColorOptions}
          handleSelectArtTemplateInCustomizer={handleSelectArtTemplateInCustomizer}
          handleSelectDifficultyInCustomizer={handleSelectDifficultyInCustomizer}
          saveLineCustomizer={saveLineCustomizer}
        />
      )}

      {showPaymentConfirm && paymentAppointment && (
        <PaymentConfirmDialog
          paymentAppointment={paymentAppointment}
          paymentForm={paymentForm}
          invoiceLines={invoiceLines}
          invoiceSubtotal={invoiceSubtotal}
          invoiceDiscount={invoiceDiscount}
          invoiceTip={invoiceTip}
          invoiceTaxAndFees={invoiceTaxAndFees}
          invoiceTotal={invoiceTotal}
          account={account}
          branchName={branchName}
          setShowPaymentConfirm={setShowPaymentConfirm}
          executeFinalPayment={executeFinalPayment}
        />
      )}

      {editingTechnician && <Modal
        open
        size="medium"
        icon={<UserCheck />}
        headerAside={<StatusBadge status={editingTechnician.status} label={technicianStatusMeta[editingTechnician.status].label} size="small" />}
        title={`Cập nhật ${editingTechnician.name}`}
        description="Chỉnh trạng thái hôm nay, ca làm, giờ đi làm, giờ nghỉ và ghi chú nghỉ nếu có."
        onClose={() => { setEditingTechnician(null); setFormError(''); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditingTechnician(null); setFormError(''); }}>Hủy</Button>
            <Button type="submit" form="reception-technician-edit" variant="primary" iconLeading={<Check />}>Lưu cập nhật</Button>
          </>
        }
      >
        <form id="reception-technician-edit" onSubmit={submitTechnicianEdit} noValidate className="space-y-4">
          {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          <div className="rounded-2xl border border-brand-outline bg-brand-surface-high/35 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-card bg-brand-secondary/15 text-body font-black text-brand-secondary">{editingTechnician.initials}</span>
              <div>
                <p className="text-sm font-black text-brand-text">{editingTechnician.name}</p>
                <p className="mt-1 text-body font-bold text-brand-text-muted">{editingTechnician.specialty} · {editingTechnician.branch}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Trạng thái hôm nay</span>
              <select value={technicianEditForm.status} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, status: event.target.value as TechnicianStatus }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
                {Object.entries(technicianStatusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Ca làm việc</span>
              <select value={technicianEditForm.shift} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, shift: event.target.value as TechnicianShift }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-bold text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10">
                {Object.entries(technicianShiftMeta).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Giờ đi làm / check-in</span>
              <input type="time" value={technicianEditForm.checkIn} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, checkIn: event.target.value }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10" />
            </label>
            <label>
              <span className="mb-1.5 block text-body font-black text-brand-text-muted">Giờ nghỉ / check-out</span>
              <input type="time" value={technicianEditForm.checkOut} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, checkOut: event.target.value }))} className="h-11 w-full rounded-xl border border-brand-outline bg-brand-surface-high/50 px-3 text-xs font-black text-brand-text outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/10" />
            </label>
          </div>

          <Field label="Ghi chú nghỉ / đi trễ / bàn giao ca" helper="Không bắt buộc.">
            <textarea value={technicianEditForm.leaveNote} onChange={(event) => setTechnicianEditForm((current) => ({ ...current, leaveNote: event.target.value }))} placeholder="Ví dụ: báo nghỉ ốm lúc 07:10, nghỉ phép đã duyệt, vào trễ do kẹt xe..." className="min-h-24 resize-y py-3" />
          </Field>
        </form>
      </Modal>}

      {shiftModal && (
        <Modal
          open
          size="medium"
          icon={<WalletCards />}
          title={shiftModal === 'OPEN' ? 'Mở ca lễ tân' : 'Đối soát & chốt ca'}
          description={shiftModal === 'OPEN' ? 'Ghi nhận quỹ tiền mặt trước khi bắt đầu vận hành.' : 'Kiểm tra khách đang phục vụ, doanh thu tiền mặt và số quỹ thực tế.'}
          onClose={() => { setShiftModal(null); setFormError(''); }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShiftModal(null); setFormError(''); }}>Hủy</Button>
              <Button
                type="submit"
                form="reception-shift"
                variant="primary"
                disabled={shiftModal === 'CLOSE' && activeAppointments.length > 0}
              >
                {shiftModal === 'OPEN' ? 'Xác nhận mở ca' : 'Xác nhận chốt ca'}
              </Button>
            </>
          }
        >
          <form id="reception-shift" onSubmit={submitShift} noValidate className="space-y-4">
            {shiftModal === 'CLOSE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-brand-surface-high/60 p-3">
                    <p className="text-caption font-black uppercase tracking-wide text-brand-text-muted">Quỹ đầu ca</p>
                    <p className="mt-2 text-sm font-black text-brand-text">{money(shift.openingCash)}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-secondary/10 p-3 ring-1 ring-brand-secondary/18">
                    <p className="text-caption font-black uppercase tracking-wide text-brand-secondary">Thu tiền mặt</p>
                    <p className="mt-2 text-sm font-black text-brand-secondary">+ {money(cashCollectedToday)}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-2xl bg-brand-text p-4 text-white">
                    <span className="text-body font-bold text-brand-text-muted">Quỹ hệ thống dự kiến</span>
                    <strong className="text-lg font-black">{money(expectedClosingCash)}</strong>
                  </div>
                </div>
                {activeAppointments.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-brand-error bg-brand-error/10 p-3 text-body font-bold leading-5 text-brand-error">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Còn {activeAppointments.length} khách đang chờ hoặc đang phục vụ. Chưa thể chốt ca.
                  </div>
                )}
              </>
            )}
            <Field label={shiftModal === 'OPEN' ? 'Tiền quỹ đầu ca' : 'Tiền mặt đếm thực tế cuối ca'}>
              <input type="number" min="0" step="1000" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className="reception-input" autoFocus />
            </Field>
            {shiftModal === 'CLOSE' && (
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-body font-black ${closingCashDifference === 0 ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-brand-tertiary/10 text-brand-tertiary'}`}>
                <span>Chênh lệch quỹ</span>
                <strong>{closingCashDifference === 0 ? 'Khớp hệ thống' : `${closingCashDifference > 0 ? 'Thừa' : 'Thiếu'} ${money(Math.abs(closingCashDifference))}`}</strong>
              </div>
            )}
            {formError && <p role="alert" className="p-3 text-body font-bold text-brand-text ui-tone ui-tone--danger">{formError}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
}

