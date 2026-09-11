/**
 * Bàn tiếp tân — màn chính của quầy lễ tân.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27, là màn đầu tiên rời khỏi tệp ấy. Thân JSX bên dưới
 * **giữ nguyên từng dòng**; chỉ có phần khai báo ở đầu là mới.
 *
 * ## Vì sao danh sách props dài tới ngần này
 *
 * Vì bàn tiếp tân đúng là phụ thuộc vào ngần ấy thứ: sáu lát cắt của danh sách lịch hẹn, hai
 * danh sách kỹ thuật viên, bốn con số của ca làm, ba state của bộ lọc, và tám hành động nghiệp
 * vụ. Gom chúng thành vài object cho "gọn" thì chữ ký ngắn lại nhưng thân JSX phải sửa hàng trăm
 * chỗ — và đó đúng là kiểu thay đổi mà không phép kiểm thử nào của dự án này bắt được.
 *
 * Nên ở đây chọn cách ngược lại: **giữ nguyên tên**, trả giá bằng một chữ ký dài nhưng thành
 * thật. Ai đọc nó sẽ thấy ngay màn này cần gì — thứ mà trước đây phải dò trong năm nghìn dòng.
 */

import type { Dispatch, SetStateAction } from 'react';
import {
  AlertCircle,
  Armchair,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  DoorOpen,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Sparkles,
  TimerReset,
  UserCheck,
  UsersRound,
  Zap
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../../../components/ui';
import MetricCard from '../MetricCard';
import { extractCustomerAlerts, getServiceTimerStatus } from '../adapters';
import { appointmentStatusLabel, technicianStatusMeta } from '../constants';
import { money } from '../format';
import { stationsFor } from '../mockSeed';
import type {
  AppointmentStatus,
  BranchCode,
  DeskQueueFilter,
  InvoiceDraftSummary,
  QuickWalkInForm,
  ReceptionAppointment,
  ReceptionPage,
  ReceptionPayment,
  ReceptionTechnician,
  ShiftState
} from '../types';

export interface DeskScreenProps {
  /* ── Phạm vi đang làm việc ───────────────────────────────────────────────────────── */
  branchCode: BranchCode;
  branchName: string;

  /* ── Sáu lát cắt của lịch hẹn hôm nay ────────────────────────────────────────────── */
  todayAppointments: ReceptionAppointment[];
  actionableAppointments: ReceptionAppointment[];
  activeAppointments: ReceptionAppointment[];
  upcomingAppointments: ReceptionAppointment[];
  unassignedAppointments: ReceptionAppointment[];
  deskQueueAppointments: ReceptionAppointment[];

  /* ── Nhân sự và ghế ──────────────────────────────────────────────────────────────── */
  branchTechnicians: ReceptionTechnician[];
  availableTechnicians: ReceptionTechnician[];
  occupiedStations: number;

  /* ── Con số của ca làm ───────────────────────────────────────────────────────────── */
  completedToday: number;
  paidToday: ReceptionPayment[];
  todayRevenue: number;
  shift: ShiftState;
  invoiceDrafts: Record<string, InvoiceDraftSummary>;

  /* ── State hiển thị của chính màn này ────────────────────────────────────────────── */
  deskViewMode: 'QUEUE' | 'STATIONS' | 'STAFF';
  setDeskViewMode: Dispatch<SetStateAction<'QUEUE' | 'STATIONS' | 'STAFF'>>;
  deskQueueFilter: DeskQueueFilter;
  setDeskQueueFilter: Dispatch<SetStateAction<DeskQueueFilter>>;

  /* ── Mở các hộp thoại vẫn do cổng lễ tân sở hữu ──────────────────────────────────── */
  setWalkInOpen: Dispatch<SetStateAction<boolean>>;
  setQuickWalkInOpen: Dispatch<SetStateAction<boolean>>;
  setQuickWalkInForm: Dispatch<SetStateAction<QuickWalkInForm>>;
  openShiftDialog: (mode: 'OPEN' | 'CLOSE') => void;
  openPayment: (appointment: ReceptionAppointment) => void;
  openAppointmentEdit: (appointment: ReceptionAppointment) => void;

  /* ── Hành động nghiệp vụ ─────────────────────────────────────────────────────────── */
  updateAppointmentStatus: (appointment: ReceptionAppointment, status: AppointmentStatus) => void;
  extendServiceDuration: (appointmentId: string, extraMinutes?: number) => void;
  requireOpenShift: () => boolean;
  navigate: (nextPage: ReceptionPage) => void;
  loadMockReceptionData: () => void;
}

export default function DeskScreen({
  branchCode,
  branchName,
  todayAppointments,
  actionableAppointments,
  activeAppointments,
  upcomingAppointments,
  unassignedAppointments,
  deskQueueAppointments,
  branchTechnicians,
  availableTechnicians,
  occupiedStations,
  completedToday,
  paidToday,
  todayRevenue,
  shift,
  invoiceDrafts,
  deskViewMode,
  setDeskViewMode,
  deskQueueFilter,
  setDeskQueueFilter,
  setWalkInOpen,
  setQuickWalkInOpen,
  setQuickWalkInForm,
  openShiftDialog,
  openPayment,
  openAppointmentEdit,
  updateAppointmentStatus,
  extendServiceDuration,
  requireOpenShift,
  navigate,
  loadMockReceptionData
}: DeskScreenProps) {
    const currentStations = stationsFor(branchCode);
    const totalStations = currentStations.length;
    const availableTechsCount = availableTechnicians.length;
    const isShiftOpen = shift.status === 'OPEN';

    return (
      <div className="space-y-4">
        {/* 1. Header chuẩn theo khung PageHeader (Đồng bộ với Khách hàng tại quầy) */}
        <PageHeader
          title="Bàn tiếp tân"
          titleAside={(
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openShiftDialog(isShiftOpen ? 'CLOSE' : 'OPEN')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer border ${
                  isShiftOpen
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                }`}
                title="Bấm để đổi trạng thái ca / chốt ca"
              >
                <span className={`h-2 w-2 rounded-full ${isShiftOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {isShiftOpen
                  ? `Ca đang mở · ${new Date(shift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Ca đã đóng (Mở ca ngay)'}
              </button>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-brand-outline bg-brand-surface-high px-2.5 py-0.5 text-caption font-semibold text-brand-text-muted">
                <MapPin className="h-3 w-3 text-brand-secondary" />
                {branchName}
              </span>
            </div>
          )}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { if (requireOpenShift()) setQuickWalkInOpen(true); }}
                className="flex h-10 items-center gap-2 border border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-4 text-caption font-black text-white shadow-none cursor-pointer"
              >
                <Zap className="h-4 w-4 text-amber-200 fill-amber-200" />
                ⚡ Walk-in (5s)
              </button>
              <button
                type="button"
                onClick={() => { if (requireOpenShift()) setWalkInOpen(true); }}
                className="flex h-10 items-center gap-2 border border-pink-600 bg-pink-600 hover:bg-pink-700 px-4 text-caption font-black text-white shadow-none cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Tiếp nhận khách
              </button>
              <button
                type="button"
                onClick={() => navigate('appointments')}
                className="flex h-10 items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 px-4 text-caption font-bold text-slate-700 shadow-none cursor-pointer"
              >
                <CalendarClock className="h-4 w-4" />
                Tạo lịch hẹn
              </button>
              <button
                type="button"
                onClick={() => openShiftDialog(isShiftOpen ? 'CLOSE' : 'OPEN')}
                className="flex h-10 items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 px-4 text-caption font-bold text-slate-600 shadow-none cursor-pointer"
              >
                <DoorOpen className="h-4 w-4" />
                {isShiftOpen ? 'Chốt ca' : 'Mở ca'}
              </button>
            </div>
          )}
        />

        {/* 2. 5 Live Metric Cards: Cô đọng, con số lớn, không thừa chữ */}
        <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-5">
          <article className="rounded-2xl border border-brand-outline bg-brand-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-text-muted">Tại Salon</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-secondary/10 text-brand-secondary">
                <UsersRound className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-brand-text">{activeAppointments.length}</span>
              <span className="text-xs font-bold text-brand-secondary">khách</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-brand-text-muted">
              {activeAppointments.filter((item) => item.status === 'CHECKED_IN').length} đang chờ · {activeAppointments.filter((item) => item.status === 'IN_SERVICE').length} đang làm
            </p>
          </article>

          <article className="rounded-2xl border border-brand-outline bg-brand-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-text-muted">Đang Phục Vụ</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Armchair className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-brand-text">{activeAppointments.filter((item) => item.status === 'IN_SERVICE').length}</span>
              <span className="text-xs font-bold text-brand-text-muted">ca</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-brand-text-muted">
              {occupiedStations}/{totalStations} ghế đang dùng
            </p>
          </article>

          <article className="rounded-2xl border border-brand-outline bg-brand-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-text-muted">Cần Xử Lý</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-brand-text">{actionableAppointments.length}</span>
              {unassignedAppointments.length > 0 && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                  {unassignedAppointments.length} chưa KTV
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-medium text-brand-text-muted">
              {unassignedAppointments.length > 0 ? 'Cần phân công ngay' : 'Đã phân công đủ'}
            </p>
          </article>

          <article className="rounded-2xl border border-brand-outline bg-brand-surface p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-text-muted">Lịch Sắp Đến</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-brand-text">{upcomingAppointments.length}</span>
              <span className="text-xs font-bold text-brand-text-muted">lịch</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-brand-text-muted">
              Hôm nay: {todayAppointments.length} lịch ({completedToday} xong)
            </p>
          </article>

          <article className="col-span-2 rounded-2xl border border-brand-outline bg-brand-surface p-3.5 shadow-xs xl:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-text-muted">Doanh Thu Ca</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CircleDollarSign className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 truncate">{money(todayRevenue)}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-brand-text-muted">
              {paidToday.length} hóa đơn đã thu
            </p>
          </article>
        </section>

        {/* 3. Main Workspace Grid */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.65fr)]">
          {/* Main Panel */}
          <div className="overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-xs">
            {/* View Switcher & Filter Bar */}
            <div className="border-b border-brand-outline p-3.5 sm:p-4 bg-brand-surface-high/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* View Tabs */}
                <div className="flex rounded-xl bg-brand-surface p-1 border border-brand-outline">
                  <button
                    type="button"
                    onClick={() => setDeskViewMode('QUEUE')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                      deskViewMode === 'QUEUE'
                        ? 'bg-brand-secondary text-white shadow-xs'
                        : 'text-brand-text-muted hover:text-brand-text'
                    }`}
                  >
                    <TimerReset className="h-3.5 w-3.5" />
                    <span>Hàng đợi ({deskQueueAppointments.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeskViewMode('STATIONS')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                      deskViewMode === 'STATIONS'
                        ? 'bg-brand-secondary text-white shadow-xs'
                        : 'text-brand-text-muted hover:text-brand-text'
                    }`}
                  >
                    <Armchair className="h-3.5 w-3.5" />
                    <span>Sơ đồ ghế ({occupiedStations}/{totalStations})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeskViewMode('STAFF')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                      deskViewMode === 'STAFF'
                        ? 'bg-brand-secondary text-white shadow-xs'
                        : 'text-brand-text-muted hover:text-brand-text'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>KTV trực ca ({availableTechsCount} rảnh)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('appointments')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-secondary hover:underline"
                  >
                    Toàn bộ lịch <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Sub-filter chips for Queue view */}
              {deskViewMode === 'QUEUE' && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-outline/60">
                  <div className="flex gap-1.5 overflow-x-auto" role="tablist">
                    {[
                      { id: 'ACTION' as DeskQueueFilter, label: 'Cần xử lý', value: actionableAppointments.length },
                      { id: 'IN_SERVICE' as DeskQueueFilter, label: '⏱️ Đang làm', value: activeAppointments.filter((item) => item.status === 'IN_SERVICE').length },
                      { id: 'WAITING' as DeskQueueFilter, label: '⏳ Đang chờ', value: activeAppointments.filter((item) => item.status === 'CHECKED_IN').length },
                      { id: 'UPCOMING' as DeskQueueFilter, label: '📅 Sắp đến', value: upcomingAppointments.length },
                    ].map((item) => {
                      const active = deskQueueFilter === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setDeskQueueFilter(item.id)}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black transition cursor-pointer ${
                            active
                              ? 'bg-brand-primary text-white shadow-xs'
                              : 'bg-brand-surface border border-brand-outline text-brand-text-muted hover:text-brand-text'
                          }`}
                        >
                          {item.label}
                          <span className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${active ? 'bg-white/25 text-white' : 'bg-brand-surface-high text-brand-text-muted'}`}>
                            {item.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] font-semibold text-brand-text-muted">
                    Hiển thị {deskQueueAppointments.length} khách
                  </span>
                </div>
              )}
            </div>

            {/* TAB CONTENT: 1. QUEUE */}
            {deskViewMode === 'QUEUE' && (
              <div className="divide-y divide-brand-outline">
                {deskQueueAppointments.length === 0 && (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2.5 text-sm font-black text-brand-text">Không có khách trong mục này</p>
                    <p className="mt-0.5 text-xs text-brand-text-muted">Tất cả lịch hẹn hiện tại đã được xử lý xong.</p>
                  </div>
                )}
                {deskQueueAppointments.map((appointment) => {
                  const isUnassigned = appointment.staff === 'Chưa phân công';
                  const isWaiting = appointment.status === 'CHECKED_IN';
                  const isInService = appointment.status === 'IN_SERVICE';
                  const timerStatus = isInService ? getServiceTimerStatus(appointment) : null;
                  const customerAlerts = extractCustomerAlerts(appointment);

                  return (
                    <article
                      key={appointment.id}
                      className={`p-3.5 sm:p-4 transition hover:bg-brand-surface-high/30 ${
                        isWaiting
                          ? 'bg-brand-secondary/5'
                          : timerStatus?.isOverrun
                            ? 'bg-rose-500/10 border-l-4 border-l-rose-500'
                            : ''
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[68px_minmax(0,1fr)_auto] lg:items-center">
                        {/* Time & Duration badge */}
                        <div className="flex items-center justify-between lg:block">
                          <div className="rounded-xl border border-brand-outline bg-brand-surface px-2.5 py-1.5 text-center shadow-2xs">
                            <p className="text-sm font-black tabular-nums text-brand-text">{appointment.start}</p>
                            <p className="text-[10px] font-bold uppercase text-brand-text-muted">{appointment.duration}p</p>
                          </div>
                          <div className="lg:hidden">
                            <StatusBadge status={appointment.status} label={appointmentStatusLabel[appointment.status]} size="small" />
                          </div>
                        </div>

                        {/* Middle info */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-black text-brand-text">{appointment.customer}</p>
                            <span className="hidden lg:inline-flex">
                              <StatusBadge status={appointment.status} label={appointmentStatusLabel[appointment.status]} size="small" />
                            </span>
                            {appointment.station && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-brand-surface-high border border-brand-outline px-1.5 py-0.5 text-[10px] font-black text-brand-text">
                                <Armchair className="h-3 w-3 text-brand-secondary" /> {appointment.station}
                              </span>
                            )}
                            {appointment.firstVisit && (
                              <span className="rounded-md bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-black text-brand-primary border border-brand-primary/20">
                                Mới
                              </span>
                            )}
                            {isUnassigned && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                <AlertCircle className="h-3 w-3" /> Chưa KTV
                              </span>
                            )}
                          </div>

                          {/* Allergy / VIP Tags */}
                          {customerAlerts.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {customerAlerts.map((alert, aIdx) => (
                                <span
                                  key={`${alert.label}-${aIdx}`}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                                    alert.tone === 'danger'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                      : alert.tone === 'warning'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                        : alert.tone === 'purple'
                                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                          : 'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                                  }`}
                                >
                                  <span>{alert.icon}</span>
                                  <span>{alert.label}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Service & Staff row */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-brand-text-muted">
                            <span className="font-bold text-brand-text">{appointment.service}</span>
                            <span className="inline-flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-brand-secondary" />
                              <strong className={isUnassigned ? 'text-amber-600 font-black' : 'text-brand-text'}>
                                {appointment.staff}
                              </strong>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {appointment.phone}
                            </span>
                            {appointment.deposit > 0 && (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                Cọc {money(appointment.deposit)}
                              </span>
                            )}
                          </div>

                          {/* Live Service Timer with slim progress bar */}
                          {isInService && timerStatus && (
                            <div
                              className={`mt-2 rounded-lg border p-2 text-xs transition-all ${
                                timerStatus.isOverrun
                                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30'
                                  : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <Clock3 className={`h-3.5 w-3.5 ${timerStatus.isOverrun ? 'text-rose-600 animate-spin' : 'text-emerald-600'}`} />
                                  {timerStatus.isOverrun ? (
                                    <span className="font-black text-rose-600 dark:text-rose-400">
                                      🚨 Quá giờ +{timerStatus.overrunMinutes}p ({timerStatus.elapsedMinutes}/{timerStatus.duration}p)
                                    </span>
                                  ) : (
                                    <span>
                                      ⏱️ Tiến độ: <strong>{timerStatus.elapsedMinutes}/{timerStatus.duration}p</strong> (Còn {timerStatus.remainingMinutes}p)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => extendServiceDuration(appointment.id, 15)}
                                    className="rounded bg-brand-surface border border-brand-outline hover:border-brand-primary px-1.5 py-0.5 text-[10px] font-black text-brand-text cursor-pointer"
                                    title="Gia hạn thêm 15 phút"
                                  >
                                    +15p
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => extendServiceDuration(appointment.id, 30)}
                                    className="rounded bg-brand-surface border border-brand-outline hover:border-brand-primary px-1.5 py-0.5 text-[10px] font-black text-brand-text cursor-pointer"
                                    title="Gia hạn thêm 30 phút"
                                  >
                                    +30p
                                  </button>
                                </div>
                              </div>
                              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-brand-outline/40">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    timerStatus.isOverrun ? 'bg-rose-500 w-full' : 'bg-emerald-500'
                                  }`}
                                  style={{
                                    width: timerStatus.isOverrun
                                      ? '100%'
                                      : `${Math.min(100, Math.round((timerStatus.elapsedMinutes / timerStatus.duration) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {appointment.note && (
                            <p className="mt-1.5 text-[11px] text-brand-text-muted bg-brand-surface-high/50 rounded px-2 py-0.5 inline-block">
                              <span className="font-bold text-brand-text">Ghi chú:</span> {appointment.note}
                            </p>
                          )}
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-1.5 lg:justify-end">
                          <a
                            href={`tel:${appointment.phone.replace(/\s/g, '')}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-outline bg-brand-surface text-brand-text-muted hover:text-brand-secondary"
                            aria-label={`Gọi ${appointment.customer}`}
                            title="Gọi điện cho khách"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>

                          {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
                            <>
                              <button
                                type="button"
                                onClick={() => openAppointmentEdit(appointment)}
                                className="rounded-lg border border-brand-outline bg-brand-surface px-2.5 py-1.5 text-xs font-bold text-brand-text hover:bg-brand-surface-high cursor-pointer"
                              >
                                {isUnassigned ? 'Gán KTV' : 'Sửa'}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-black text-white cursor-pointer shadow-xs"
                              >
                                <Check className="h-3.5 w-3.5" /> Check-in
                              </button>
                            </>
                          )}

                          {appointment.status === 'CHECKED_IN' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openAppointmentEdit(appointment)}
                                className="rounded-lg border border-brand-outline bg-brand-surface px-2.5 py-1.5 text-xs font-bold text-brand-text hover:bg-brand-surface-high cursor-pointer"
                              >
                                {isUnassigned ? 'Gán KTV/Ghế' : 'Sửa'}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAppointmentStatus(appointment, 'IN_SERVICE')}
                                className="rounded-lg bg-brand-primary hover:bg-brand-primary/90 px-3 py-1.5 text-xs font-black text-white cursor-pointer shadow-xs"
                              >
                                Bắt đầu làm
                              </button>
                              <button
                                type="button"
                                onClick={() => openPayment(appointment)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 px-2.5 py-1.5 text-xs font-black cursor-pointer"
                              >
                                <ReceiptText className="h-3.5 w-3.5" />
                                {invoiceDrafts[appointment.id]?.lines?.length ? `Hóa đơn (${invoiceDrafts[appointment.id].lines.length})` : 'Tạo HĐ'}
                              </button>
                            </>
                          )}

                          {appointment.status === 'IN_SERVICE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openPayment(appointment)}
                                className="inline-flex items-center gap-1 rounded-lg border border-brand-outline bg-brand-surface hover:bg-brand-surface-high px-2.5 py-1.5 text-xs font-bold text-brand-text cursor-pointer"
                                title="Thêm dịch vụ / mẫu vẽ / sản phẩm"
                              >
                                + Món phụ
                              </button>
                              <button
                                type="button"
                                onClick={() => openPayment(appointment)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-black text-white shadow-xs cursor-pointer"
                              >
                                <ReceiptText className="h-3.5 w-3.5" /> Thu tiền & Hoàn tất
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: 2. LIVE STATIONS GRID */}
            {deskViewMode === 'STATIONS' && (
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currentStations.map((stationId) => {
                    const occupyingAppt = activeAppointments.find((a) => a.station === stationId && a.status === 'IN_SERVICE');
                    const reservedAppt = activeAppointments.find((a) => a.station === stationId && a.status === 'CHECKED_IN');
                    const timerStatus = occupyingAppt ? getServiceTimerStatus(occupyingAppt) : null;

                    if (occupyingAppt) {
                      return (
                        <div
                          key={stationId}
                          className={`rounded-xl border p-3 bg-brand-surface transition ${
                            timerStatus?.isOverrun
                              ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/30'
                              : 'border-emerald-500/50 bg-emerald-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-brand-primary text-white px-2 py-0.5 text-xs font-black">
                              {stationId}
                            </span>
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                              Đang làm
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-black text-brand-text truncate">{occupyingAppt.customer}</p>
                          <p className="text-[11px] text-brand-text-muted truncate">{occupyingAppt.service}</p>
                          <p className="text-[11px] font-semibold text-brand-secondary truncate">KTV: {occupyingAppt.staff}</p>
                          
                          {timerStatus && (
                            <div className="mt-2 text-[10px] font-bold">
                              {timerStatus.isOverrun ? (
                                <span className="text-rose-600 font-black">🚨 Quá {timerStatus.overrunMinutes}p</span>
                              ) : (
                                <span className="text-emerald-600">⏱️ {timerStatus.elapsedMinutes}/{timerStatus.duration}p (còn {timerStatus.remainingMinutes}p)</span>
                              )}
                            </div>
                          )}

                          <div className="mt-2.5 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openPayment(occupyingAppt)}
                              className="flex-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white py-1 text-[11px] font-black text-center cursor-pointer"
                            >
                              Thu tiền
                            </button>
                            <button
                              type="button"
                              onClick={() => extendServiceDuration(occupyingAppt.id, 15)}
                              className="rounded border border-brand-outline bg-brand-surface px-1.5 py-1 text-[10px] font-bold text-brand-text hover:bg-brand-surface-high cursor-pointer"
                              title="+15p"
                            >
                              +15p
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (reservedAppt) {
                      return (
                        <div key={stationId} className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-amber-500 text-white px-2 py-0.5 text-xs font-black">
                              {stationId}
                            </span>
                            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">
                              Đang chờ
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-black text-brand-text truncate">{reservedAppt.customer}</p>
                          <p className="text-[11px] text-brand-text-muted truncate">{reservedAppt.service}</p>
                          <p className="text-[11px] font-semibold text-brand-secondary truncate">KTV: {reservedAppt.staff}</p>
                          <button
                            type="button"
                            onClick={() => updateAppointmentStatus(reservedAppt, 'IN_SERVICE')}
                            className="mt-2.5 w-full rounded bg-brand-primary hover:bg-brand-primary/90 text-white py-1 text-[11px] font-black text-center cursor-pointer"
                          >
                            Bắt đầu làm
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={stationId} className="rounded-xl border border-dashed border-brand-outline bg-brand-surface p-3 hover:border-brand-primary transition">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-brand-surface-high border border-brand-outline px-2 py-0.5 text-xs font-black text-brand-text">
                            {stationId}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-brand-text-muted">
                            Trống
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-medium text-brand-text-muted text-center">Ghế sẵn sàng</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (requireOpenShift()) {
                              setQuickWalkInForm((prev) => ({ ...prev, station: stationId }));
                              setQuickWalkInOpen(true);
                            }
                          }}
                          className="mt-2.5 w-full rounded bg-brand-surface-high hover:bg-brand-primary hover:text-white border border-brand-outline text-brand-text py-1 text-[11px] font-bold text-center cursor-pointer transition"
                        >
                          ⚡ Xếp khách nhanh
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. STAFF ON-DUTY */}
            {deskViewMode === 'STAFF' && (
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {branchTechnicians.filter((t) => ['PRESENT', 'SERVING', 'BREAK'].includes(t.status)).map((tech) => {
                    const activeAppt = activeAppointments.find((a) => a.staff === tech.name && a.status === 'IN_SERVICE');
                    return (
                      <div key={tech.id} className="rounded-xl border border-brand-outline bg-brand-surface p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-secondary/15 text-xs font-black text-brand-secondary">
                              {tech.initials}
                            </span>
                            <div>
                              <p className="text-xs font-black text-brand-text">{tech.name}</p>
                              <p className="text-[10px] text-brand-text-muted">{tech.specialty}</p>
                            </div>
                          </div>
                          <StatusBadge status={tech.status} label={technicianStatusMeta[tech.status].label} size="small" />
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-brand-outline/60 text-xs">
                          {activeAppt ? (
                            <p className="text-[11px] font-medium text-brand-primary truncate">
                              Đang phục vụ: <strong>{activeAppt.customer}</strong> ({activeAppt.station || 'Chưa ghế'})
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              🟢 Sẵn sàng nhận khách tiếp theo
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Assist Panel */}
          <aside className="space-y-4">
            {/* Next Arrivals */}
            <div className="rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Lịch Kế Tiếp ({upcomingAppointments.length})</h3>
                </div>
                <Clock3 className="h-4 w-4 text-brand-primary" />
              </div>
              <div className="mt-3 space-y-2">
                {upcomingAppointments.slice(0, 3).map((appointment, index) => (
                  <article
                    key={appointment.id}
                    className={`rounded-xl border p-2.5 transition ${
                      index === 0
                        ? 'border-brand-primary/40 bg-brand-primary/5'
                        : 'border-brand-outline bg-brand-surface-high/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`flex h-9 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums ${
                        index === 0 ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text border border-brand-outline'
                      }`}>
                        {appointment.start}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-black text-brand-text">{appointment.customer}</p>
                          {index === 0 && <span className="text-[10px] font-black text-brand-primary">Kế tiếp</span>}
                        </div>
                        <p className="truncate text-[11px] text-brand-text-muted">{appointment.service}</p>
                        <p className="truncate text-[10px] font-semibold text-brand-secondary">{appointment.staff}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateAppointmentStatus(appointment, 'CHECKED_IN')}
                        className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[11px] font-black text-white cursor-pointer"
                      >
                        <Check className="h-3 w-3" /> Check-in
                      </button>
                      <a
                        href={`tel:${appointment.phone.replace(/\s/g, '')}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-outline bg-brand-surface text-brand-text-muted hover:text-brand-secondary"
                        aria-label={`Gọi ${appointment.customer}`}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                      <a
                        href={`sms:${appointment.phone.replace(/\s/g, '')}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-outline bg-brand-surface text-brand-text-muted hover:text-brand-secondary"
                        aria-label={`Nhắn tin ${appointment.customer}`}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </a>
                    </div>
                  </article>
                ))}
                {upcomingAppointments.length === 0 && (
                  <p className="rounded-xl border border-dashed border-brand-outline py-6 text-center text-xs font-semibold text-brand-text-muted">
                    Không còn khách sắp đến hôm nay.
                  </p>
                )}
              </div>
            </div>

            {/* Shift Reconcile & Drawer Summary */}
            <div className="rounded-2xl border border-brand-outline bg-brand-surface p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Quỹ & Thu Ngân Ca</h3>
                <button
                  type="button"
                  onClick={() => navigate('payments')}
                  className="text-xs font-bold text-brand-secondary hover:underline"
                >
                  POS <ArrowUpRight className="h-3 w-3 inline" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-brand-surface-high/50 p-2.5">
                  <p className="text-[10px] font-bold uppercase text-brand-text-muted">Quỹ đầu ca</p>
                  <p className="mt-1 font-black text-brand-text">{money(shift.openingCash)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                  <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Đã thu ca</p>
                  <p className="mt-1 font-black text-emerald-700 dark:text-emerald-400">{money(todayRevenue)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-brand-outline/60 text-xs">
                <span className="text-brand-text-muted">Đã thanh toán:</span>
                <strong className="text-brand-text">{paidToday.length} đơn</strong>
              </div>
            </div>

            {/* Quick Mock Reset */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={loadMockReceptionData}
                className="flex items-center gap-1.5 text-[11px] font-bold text-brand-text-muted hover:text-brand-secondary cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> Khôi phục dữ liệu mẫu
              </button>
            </div>
          </aside>
        </section>
      </div>
    );
}
