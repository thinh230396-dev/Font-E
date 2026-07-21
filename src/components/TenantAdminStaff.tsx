import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Download,
  Filter,
  LayoutGrid,
  LayoutList,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import BeautifulSelect from "./BeautifulSelect";

type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "NAIL_ARTIST_SENIOR"
  | "NAIL_TECHNICIAN"
  | "PEDICURE_SPECIALIST"
  | "ASSISTANT"
  | "RECEPTIONIST";
type StaffStatus = "WORKING" | "OFF_SHIFT" | "LEAVE" | "INACTIVE";
type ActiveStaffStatus = Exclude<StaffStatus, "INACTIVE">;
type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
type BranchCode = "Q1" | "Q3";
type StaffView = "TABLE" | "CARDS";
type ShiftAction = "START" | "END";

interface ScheduleDay {
  day: string;
  date: string;
  shift: string;
  status: "WORK" | "OFF" | "LEAVE";
}

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  branch: BranchCode;
  role: StaffRole;
  status: StaffStatus;
  employmentType: EmploymentType;
  startDate: string;
  shiftStart: string;
  shiftEnd: string;
  appointments: number;
  completed: number;
  revenue: number;
  rating: number;
  utilization: number;
  commissionRate: number;
  commissionEarned: number;
  target: number;
  attendance: number;
  lateCount: number;
  leaveBalance: number;
  lastClockIn?: string;
  lastClockOut?: string;
  skills: string[];
  permissions: string[];
  notes: string;
  schedule: ScheduleDay[];
}

interface TenantAdminStaffProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: "full" | "limited" | "locked";
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
}

interface StaffFormState {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  branch: BranchCode;
  role: StaffRole;
  status: StaffStatus;
  employmentType: EmploymentType;
  startDate: string;
  shiftStart: string;
  shiftEnd: string;
  commissionRate: string;
  notes: string;
  canManageAppointments: boolean;
  canViewCustomers: boolean;
  canCollectPayment: boolean;
}

const branchLabels: Record<BranchCode, string> = {
  Q1: "Chi nhánh Quận 1",
  Q3: "Chi nhánh Quận 3",
};

const roleMeta: Record<
  StaffRole,
  { label: string; badge: string; avatar: string }
> = {
  OWNER: {
    label: "Chủ salon",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    avatar: "bg-violet-100 text-violet-700",
  },
  MANAGER: {
    label: "Quản lý",
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    avatar: "bg-indigo-100 text-indigo-700",
  },
  NAIL_ARTIST_SENIOR: {
    label: "Nail Artist Senior",
    badge: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    avatar: "bg-fuchsia-100 text-fuchsia-700",
  },
  NAIL_TECHNICIAN: {
    label: "Nail Technician",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    avatar: "bg-blue-100 text-blue-700",
  },
  PEDICURE_SPECIALIST: {
    label: "Pedicure Specialist",
    badge: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    avatar: "bg-cyan-100 text-cyan-700",
  },
  ASSISTANT: {
    label: "Trợ lý kỹ thuật",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    avatar: "bg-emerald-100 text-emerald-700",
  },
  RECEPTIONIST: {
    label: "Lễ tân",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    avatar: "bg-amber-100 text-amber-700",
  },
};

const statusMeta: Record<
  StaffStatus,
  { label: string; badge: string; dot: string }
> = {
  WORKING: {
    label: "Đang làm việc",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  OFF_SHIFT: {
    label: "Chưa vào ca",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  LEAVE: {
    label: "Nghỉ phép",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  INACTIVE: {
    label: "Ngừng hoạt động",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
};

const employmentLabels: Record<EmploymentType, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  CONTRACT: "Cộng tác viên",
};

const createWeek = (
  shift: string,
  offIndex: number,
  leaveIndex = -1,
): ScheduleDay[] =>
  ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, index) => ({
    day,
    date: `${13 + index}/07`,
    shift: index === offIndex || index === leaveIndex ? "—" : shift,
    status:
      index === leaveIndex ? "LEAVE" : index === offIndex ? "OFF" : "WORK",
  }));

const staffSeed: StaffMember[] = [
  {
    id: "STF-001",
    name: "Lê Hoàng Nam",
    phone: "0903 228 118",
    email: "nam.le@naile.vn",
    birthday: "1987-04-18",
    branch: "Q3",
    role: "OWNER",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2022-03-01",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    appointments: 12,
    completed: 12,
    revenue: 18_600_000,
    rating: 4.9,
    utilization: 72,
    commissionRate: 0,
    commissionEarned: 0,
    target: 20_000_000,
    attendance: 100,
    lateCount: 0,
    leaveBalance: 10,
    skills: ["Quản lý salon Nail", "Tư vấn dịch vụ", "Kiểm soát chất lượng"],
    permissions: [
      "Toàn quyền hệ thống",
      "Quản lý tài chính",
      "Quản lý nhân sự",
    ],
    notes: "Phụ trách vận hành chung và khách VIP.",
    schedule: createWeek("08:00–18:00", 6),
  },
  {
    id: "STF-002",
    name: "Thảo Nguyễn",
    phone: "0918 440 226",
    email: "thao.nguyen@naile.vn",
    birthday: "1991-09-12",
    branch: "Q3",
    role: "NAIL_ARTIST_SENIOR",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2022-05-16",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    appointments: 38,
    completed: 36,
    revenue: 42_800_000,
    rating: 4.9,
    utilization: 92,
    commissionRate: 18,
    commissionEarned: 7_704_000,
    target: 45_000_000,
    attendance: 98,
    lateCount: 1,
    leaveBalance: 7.5,
    skills: [
      "Nail Art Premium",
      "Acrylic",
      "Gel Extension",
      "Đào tạo kỹ thuật",
    ],
    permissions: ["Quản lý lịch cá nhân", "Xem hồ sơ khách", "Thu tiền"],
    notes: "Kỹ thuật viên chính cho Nail Art và khách VIP.",
    schedule: createWeek("08:00–18:00", 1),
  },
  {
    id: "STF-003",
    name: "Minh Khang",
    phone: "0937 510 884",
    email: "khang.minh@naile.vn",
    birthday: "1994-12-03",
    branch: "Q3",
    role: "NAIL_TECHNICIAN",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2023-02-06",
    shiftStart: "09:00",
    shiftEnd: "20:00",
    appointments: 34,
    completed: 32,
    revenue: 36_500_000,
    rating: 4.8,
    utilization: 87,
    commissionRate: 16,
    commissionEarned: 5_840_000,
    target: 40_000_000,
    attendance: 97,
    lateCount: 2,
    leaveBalance: 8,
    skills: ["Gel Manicure", "Dặm gel", "Sửa form", "Nail Art cơ bản"],
    permissions: ["Quản lý lịch cá nhân", "Xem hồ sơ khách"],
    notes: "Có tỷ lệ khách quay lại cao nhất nhóm Nail Technician.",
    schedule: createWeek("09:00–20:00", 2),
  },
  {
    id: "STF-004",
    name: "Quốc Bảo",
    phone: "0906 771 423",
    email: "bao.quoc@naile.vn",
    birthday: "1990-06-24",
    branch: "Q3",
    role: "PEDICURE_SPECIALIST",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2023-08-14",
    shiftStart: "08:00",
    shiftEnd: "17:00",
    appointments: 41,
    completed: 39,
    revenue: 28_700_000,
    rating: 4.8,
    utilization: 84,
    commissionRate: 15,
    commissionEarned: 4_305_000,
    target: 30_000_000,
    attendance: 99,
    lateCount: 0,
    leaveBalance: 6,
    skills: ["Pedicure Spa", "Chăm sóc gót", "Massage chân", "Sơn gel"],
    permissions: ["Quản lý lịch cá nhân", "Xem hồ sơ khách"],
    notes: "Phụ trách nhóm dịch vụ Pedicure chuyên sâu.",
    schedule: createWeek("08:00–17:00", 3),
  },
  {
    id: "STF-005",
    name: "Thuỳ Dương",
    phone: "0972 804 115",
    email: "duong.thuy@naile.vn",
    birthday: "1998-02-19",
    branch: "Q3",
    role: "ASSISTANT",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2024-01-08",
    shiftStart: "10:00",
    shiftEnd: "20:00",
    appointments: 29,
    completed: 28,
    revenue: 18_200_000,
    rating: 4.7,
    utilization: 79,
    commissionRate: 10,
    commissionEarned: 1_820_000,
    target: 20_000_000,
    attendance: 96,
    lateCount: 2,
    leaveBalance: 9,
    skills: ["Chuẩn bị dụng cụ", "Sơn gel cơ bản", "Khử khuẩn thiết bị"],
    permissions: ["Quản lý lịch cá nhân", "Xem hồ sơ khách"],
    notes: "Đang trong lộ trình đào tạo lên Nail Technician.",
    schedule: createWeek("10:00–20:00", 4),
  },
  {
    id: "STF-006",
    name: "Yến Nhi",
    phone: "0909 366 282",
    email: "nhi.yen@naile.vn",
    birthday: "1996-07-30",
    branch: "Q3",
    role: "RECEPTIONIST",
    status: "LEAVE",
    employmentType: "FULL_TIME",
    startDate: "2023-11-20",
    shiftStart: "08:00",
    shiftEnd: "17:00",
    appointments: 0,
    completed: 0,
    revenue: 0,
    rating: 4.8,
    utilization: 0,
    commissionRate: 2,
    commissionEarned: 720_000,
    target: 0,
    attendance: 95,
    lateCount: 1,
    leaveBalance: 5.5,
    skills: ["Tiếp đón", "Quản lý lịch", "Chăm sóc khách", "Thu ngân"],
    permissions: ["Quản lý toàn bộ lịch", "Xem hồ sơ khách", "Thu tiền"],
    notes: "Nghỉ phép ngày 16–17/07.",
    schedule: createWeek("08:00–17:00", 6, 3),
  },
  {
    id: "STF-007",
    name: "Hà My",
    phone: "0988 120 496",
    email: "my.ha@naile.vn",
    birthday: "1989-11-21",
    branch: "Q1",
    role: "NAIL_ARTIST_SENIOR",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2022-09-01",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    appointments: 35,
    completed: 34,
    revenue: 39_400_000,
    rating: 4.9,
    utilization: 89,
    commissionRate: 18,
    commissionEarned: 7_092_000,
    target: 42_000_000,
    attendance: 99,
    lateCount: 0,
    leaveBalance: 8.5,
    skills: ["Nail Art", "Gel Extension", "Form Almond", "Đào tạo kỹ thuật"],
    permissions: ["Quản lý toàn bộ lịch", "Xem hồ sơ khách", "Thu tiền"],
    notes: "Trưởng nhóm kỹ thuật chi nhánh Quận 1.",
    schedule: createWeek("08:00–18:00", 2),
  },
  {
    id: "STF-008",
    name: "Gia Huy",
    phone: "0914 822 631",
    email: "huy.gia@naile.vn",
    birthday: "1995-03-08",
    branch: "Q1",
    role: "NAIL_TECHNICIAN",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2024-02-12",
    shiftStart: "09:00",
    shiftEnd: "20:00",
    appointments: 31,
    completed: 29,
    revenue: 27_900_000,
    rating: 4.7,
    utilization: 82,
    commissionRate: 15,
    commissionEarned: 4_185_000,
    target: 32_000_000,
    attendance: 97,
    lateCount: 1,
    leaveBalance: 9,
    skills: ["Manicure", "Gel đơn sắc", "French", "Dặm gel"],
    permissions: ["Quản lý lịch cá nhân", "Xem hồ sơ khách"],
    notes: "",
    schedule: createWeek("09:00–20:00", 1),
  },
  {
    id: "STF-009",
    name: "Hoàng Anh",
    phone: "0962 418 507",
    email: "anh.hoang@naile.vn",
    birthday: "1999-08-15",
    branch: "Q1",
    role: "ASSISTANT",
    status: "OFF_SHIFT",
    employmentType: "PART_TIME",
    startDate: "2025-01-06",
    shiftStart: "14:00",
    shiftEnd: "20:00",
    appointments: 18,
    completed: 18,
    revenue: 9_600_000,
    rating: 4.6,
    utilization: 68,
    commissionRate: 8,
    commissionEarned: 768_000,
    target: 12_000_000,
    attendance: 94,
    lateCount: 3,
    leaveBalance: 4,
    skills: ["Chuẩn bị bàn Nail", "Khử khuẩn", "Sơn gel cơ bản"],
    permissions: ["Quản lý lịch cá nhân"],
    notes: "Sinh viên làm bán thời gian ca chiều.",
    schedule: createWeek("14:00–20:00", 3),
  },
  {
    id: "STF-010",
    name: "Khánh Vy",
    phone: "0901 778 540",
    email: "vy.khanh@naile.vn",
    birthday: "1993-05-27",
    branch: "Q1",
    role: "RECEPTIONIST",
    status: "WORKING",
    employmentType: "FULL_TIME",
    startDate: "2024-06-03",
    shiftStart: "10:00",
    shiftEnd: "20:00",
    appointments: 0,
    completed: 0,
    revenue: 0,
    rating: 4.8,
    utilization: 0,
    commissionRate: 2,
    commissionEarned: 680_000,
    target: 0,
    attendance: 98,
    lateCount: 1,
    leaveBalance: 7,
    skills: ["Tiếp đón", "Chăm sóc khách", "Thu ngân"],
    permissions: ["Quản lý toàn bộ lịch", "Xem hồ sơ khách", "Thu tiền"],
    notes: "",
    schedule: createWeek("10:00–20:00", 5),
  },
];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100";
const dateInputClass = `${inputClass} staff-date-input pl-10 pr-3`;
const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN");
const initials = (name: string) =>
  name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const performanceTone = (value: number) =>
  value >= 90
    ? "text-emerald-600"
    : value >= 75
      ? "text-violet-600"
      : "text-amber-600";

const emptyForm = (branch: string): StaffFormState => ({
  name: "",
  phone: "",
  email: "",
  birthday: "",
  branch: branch === "Q1" ? "Q1" : "Q3",
  role: "NAIL_TECHNICIAN",
  status: "OFF_SHIFT",
  employmentType: "FULL_TIME",
  startDate: "2026-07-16",
  shiftStart: "09:00",
  shiftEnd: "18:00",
  commissionRate: "15",
  notes: "",
  canManageAppointments: true,
  canViewCustomers: true,
  canCollectPayment: false,
});

export default function TenantAdminStaff({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = "Nailé Studio",
  roleLabel = "Owner · Tenant Admin",
  accessMode = "full",
  readOnlyReason = "",
  onNotify,
}: TenantAdminStaffProps) {
  const storageKey = `tenant-admin-staff-v2:${tenantName}`;
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    if (typeof window === "undefined") return staffSeed;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as StaffMember[]) : staffSeed;
    } catch {
      return staffSeed;
    }
  });
  const [roleFilter, setRoleFilter] = useState<"ALL" | StaffRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ActiveStaffStatus>(
    "ALL",
  );
  const [employmentFilter, setEmploymentFilter] = useState<
    "ALL" | EmploymentType
  >("ALL");
  const [sortBy, setSortBy] = useState<
    "REVENUE" | "UTILIZATION" | "RATING" | "NAME"
  >("REVENUE");
  const [viewMode, setViewMode] = useState<StaffView>("TABLE");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT" | null>(null);
  const [form, setForm] = useState<StaffFormState>(() =>
    emptyForm(selectedBranch),
  );
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [shiftAction, setShiftAction] = useState<{
    type: ShiftAction;
    staff: StaffMember;
  } | null>(null);
  const canManage = accessMode === "full" && !readOnlyReason;
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(staff));
  }, [staff, storageKey]);
  useEffect(() => {
    if (!selectedStaff && !formMode && !shiftAction) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (shiftAction) setShiftAction(null);
      else if (formMode) setFormMode(null);
      else setSelectedStaff(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [formMode, selectedStaff, shiftAction]);
  const requireManage = () => {
    if (canManage) return true;
    onNotify?.(
      readOnlyReason || "Gói hiện tại chỉ cho phép xem dữ liệu nhân sự.",
    );
    return false;
  };

  const branchStaff = useMemo(
    () =>
      staff.filter(
        (member) =>
          selectedBranch === "ALL" || member.branch === selectedBranch,
      ),
    [selectedBranch, staff],
  );
  const activeBranchStaff = useMemo(
    () => branchStaff.filter((member) => member.status !== "INACTIVE"),
    [branchStaff],
  );
  const inactiveBranchStaff = useMemo(
    () => branchStaff.filter((member) => member.status === "INACTIVE"),
    [branchStaff],
  );
  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeBranchStaff
      .filter((member) => roleFilter === "ALL" || member.role === roleFilter)
      .filter(
        (member) => statusFilter === "ALL" || member.status === statusFilter,
      )
      .filter(
        (member) =>
          employmentFilter === "ALL" ||
          member.employmentType === employmentFilter,
      )
      .filter(
        (member) =>
          !query ||
          `${member.id} ${member.name} ${member.phone} ${member.email} ${member.skills.join(" ")}`
            .toLowerCase()
            .includes(query),
      )
      .sort((a, b) =>
        sortBy === "UTILIZATION"
          ? b.utilization - a.utilization
          : sortBy === "RATING"
            ? b.rating - a.rating
            : sortBy === "NAME"
              ? a.name.localeCompare(b.name, "vi")
              : b.revenue - a.revenue,
      );
  }, [
    activeBranchStaff,
    employmentFilter,
    roleFilter,
    searchQuery,
    sortBy,
    statusFilter,
  ]);

  const workingCount = activeBranchStaff.filter(
    (member) => member.status === "WORKING",
  ).length;
  const activeFilterCount = [
    roleFilter !== "ALL",
    statusFilter !== "ALL",
    employmentFilter !== "ALL",
  ].filter(Boolean).length;
  const serviceStaff = activeBranchStaff.filter(
    (member) => !["OWNER", "MANAGER", "RECEPTIONIST"].includes(member.role),
  );
  const averageUtilization = serviceStaff.length
    ? Math.round(
        serviceStaff.reduce((sum, member) => sum + member.utilization, 0) /
          serviceStaff.length,
      )
    : 0;
  const totalRevenue = activeBranchStaff.reduce(
    (sum, member) => sum + member.revenue,
    0,
  );
  const totalCommission = activeBranchStaff.reduce(
    (sum, member) => sum + member.commissionEarned,
    0,
  );

  const openCreate = () => {
    if (!requireManage()) return;
    setForm(emptyForm(selectedBranch));
    setFormError("");
    setFormMode("CREATE");
  };
  const openEdit = (member: StaffMember) => {
    if (!requireManage()) return;
    setForm({
      name: member.name,
      phone: member.phone,
      email: member.email,
      birthday: member.birthday,
      branch: member.branch,
      role: member.role,
      status: member.status,
      employmentType: member.employmentType,
      startDate: member.startDate,
      shiftStart: member.shiftStart,
      shiftEnd: member.shiftEnd,
      commissionRate: String(member.commissionRate),
      notes: member.notes,
      canManageAppointments: member.permissions.some((item) =>
        item.includes("lịch"),
      ),
      canViewCustomers: member.permissions.some((item) =>
        item.includes("hồ sơ khách"),
      ),
      canCollectPayment: member.permissions.includes("Thu tiền"),
    });
    setFormError("");
    setFormMode("EDIT");
  };

  const submitStaff = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setFormError("Vui lòng nhập họ tên, số điện thoại và email nhân viên.");
      return;
    }
    const duplicate = staff.find(
      (member) =>
        (member.phone.replace(/\s/g, "") === form.phone.replace(/\s/g, "") ||
          member.email.toLowerCase() === form.email.toLowerCase()) &&
        member.id !== selectedStaff?.id,
    );
    if (duplicate) {
      setFormError(
        `Thông tin liên hệ đã thuộc hồ sơ ${duplicate.name} (${duplicate.id}).`,
      );
      return;
    }
    const existing = formMode === "EDIT" ? selectedStaff : null;
    const id =
      existing?.id ||
      `STF-${String(Math.max(...staff.map((member) => Number(member.id.replace("STF-", "")))) + 1).padStart(3, "0")}`;
    const permissions = [
      form.canManageAppointments ? "Quản lý lịch cá nhân" : "",
      form.canViewCustomers ? "Xem hồ sơ khách" : "",
      form.canCollectPayment ? "Thu tiền" : "",
    ].filter(Boolean);
    const payload: StaffMember = {
      id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      birthday: form.birthday,
      branch: form.branch,
      role: form.role,
      status: form.status,
      employmentType: form.employmentType,
      startDate: form.startDate,
      shiftStart: form.shiftStart,
      shiftEnd: form.shiftEnd,
      commissionRate: Math.max(0, Number(form.commissionRate) || 0),
      notes: form.notes.trim(),
      permissions,
      appointments: existing?.appointments || 0,
      completed: existing?.completed || 0,
      revenue: existing?.revenue || 0,
      rating: existing?.rating || 0,
      utilization: existing?.utilization || 0,
      commissionEarned: existing?.commissionEarned || 0,
      target: existing?.target || 20_000_000,
      attendance: existing?.attendance || 100,
      lateCount: existing?.lateCount || 0,
      leaveBalance: existing?.leaveBalance || 12,
      skills: existing?.skills || ["Đang cập nhật"],
      schedule:
        existing?.schedule ||
        createWeek(`${form.shiftStart}–${form.shiftEnd}`, 6),
    };
    setStaff((current) =>
      formMode === "EDIT"
        ? current.map((member) => (member.id === id ? payload : member))
        : [payload, ...current],
    );
    setSelectedStaff(payload.status === "INACTIVE" ? null : payload);
    if (selectedBranch !== "ALL") onSelectedBranchChange(payload.branch);
    setFormMode(null);
    setNotice(
      payload.status === "INACTIVE"
        ? `Đã chuyển hồ sơ ${payload.name} vào khu nhân sự ngừng hoạt động.`
        : formMode === "CREATE"
          ? `Đã tạo hồ sơ ${payload.name}.`
          : `Đã cập nhật hồ sơ ${payload.name}.`,
    );
  };

  const updateStaff = (id: string, patch: Partial<StaffMember>) => {
    if (!requireManage()) return;
    setStaff((current) =>
      current.map((member) =>
        member.id === id ? { ...member, ...patch } : member,
      ),
    );
    setSelectedStaff((current) =>
      current?.id === id ? { ...current, ...patch } : current,
    );
  };
  const confirmShiftAction = () => {
    if (!shiftAction || !requireManage()) return;
    const time = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (shiftAction.type === "START") {
      updateStaff(shiftAction.staff.id, {
        status: "WORKING",
        lastClockIn: time,
      });
      setNotice(`${shiftAction.staff.name} đã bắt đầu ca lúc ${time}.`);
    } else {
      updateStaff(shiftAction.staff.id, {
        status: "OFF_SHIFT",
        lastClockOut: time,
      });
      setNotice(`${shiftAction.staff.name} đã kết thúc ca lúc ${time}.`);
    }
    setShiftAction(null);
  };
  const reactivateStaff = (member: StaffMember) => {
    if (!requireManage()) return;
    updateStaff(member.id, { status: "OFF_SHIFT" });
    setNotice(
      `Đã kích hoạt lại hồ sơ ${member.name}. Nhân viên được đưa về danh sách chính ở trạng thái chưa vào ca.`,
    );
  };
  const resetFilters = () => {
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setEmploymentFilter("ALL");
    onSearchQueryChange("");
  };
  const exportStaff = () => {
    if (!requireManage()) return;
    const rows = filteredStaff.map((member) =>
      [
        member.id,
        member.name,
        roleMeta[member.role].label,
        branchLabels[member.branch],
        member.phone,
        member.email,
        member.appointments,
        member.revenue,
        member.utilization,
        statusMeta[member.status].label,
      ].join(","),
    );
    const blob = new Blob(
      [
        `Mã nhân viên,Tên,Vai trò,Chi nhánh,Số điện thoại,Email,Lịch hẹn,Doanh thu,Công suất,Trạng thái\n${rows.join("\n")}`,
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "danh-sach-nhan-su.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      {notice && (
        <div className="fixed right-4 top-24 z-[80] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-4 w-4" />
          </span>
          <p className="text-[9px] font-bold text-slate-700">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Đóng thông báo"
            className="ml-2 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-violet-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Chấm công cập nhật lúc 14:32 · {tenantName}
          </div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Nhân sự
          </h1>
          <p className="mt-2 text-[11px] text-slate-500">
            Quản lý đội ngũ Nail, lịch làm việc, kỹ năng, năng suất, doanh thu
            và chính sách hoa hồng.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BeautifulSelect
            value={selectedBranch}
            onChange={(event) => onSelectedBranchChange(event.target.value)}
            aria-label="Chọn chi nhánh"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm sm:w-48"
          >
            <option value="Q3">Chi nhánh Quận 3</option>
            <option value="Q1">Chi nhánh Quận 1</option>
            <option value="ALL">Tất cả chi nhánh</option>
          </BeautifulSelect>
          <button
            type="button"
            onClick={exportStaff}
            disabled={!canManage}
            className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Xuất danh sách
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!canManage}
            className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[10px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
          >
            <UserPlus className="h-4 w-4" />
            Thêm nhân viên
          </button>
        </div>
      </section>

      <section
        className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canManage ? "border-violet-100 bg-gradient-to-r from-violet-50 to-white" : "border-amber-200 bg-amber-50"}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${canManage ? "bg-violet-600 text-white" : "bg-amber-100 text-amber-700"}`}
          >
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-slate-800">
              Phạm vi quyền: {roleLabel}
            </p>
            <p className="mt-1 text-[8px] leading-4 text-slate-500">
              {canManage
                ? "Được quản lý hồ sơ, chi nhánh, ca làm, hoa hồng và quyền nghiệp vụ trong tenant; thay đổi nhạy cảm đều được gắn với tài khoản quản trị."
                : readOnlyReason || "Chỉ được xem hồ sơ và hiệu suất nhân sự."}
            </p>
          </div>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-100 text-amber-800 ring-amber-200"}`}
        >
          {canManage ? "Toàn quyền nhân sự tenant" : "Chỉ xem"}
        </span>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng nhân sự",
            value: String(activeBranchStaff.length),
            detail: `${workingCount} đang trong ca hôm nay`,
            icon: UsersRound,
            tone: "bg-blue-50 text-blue-600",
          },
          {
            label: "Công suất trung bình",
            value: `${averageUtilization}%`,
            detail: "+5,2% so với tháng trước",
            icon: Target,
            tone: "bg-violet-50 text-violet-600",
          },
          {
            label: "Doanh thu đội ngũ",
            value: `${(totalRevenue / 1_000_000).toLocaleString("vi-VN")} triệu`,
            detail: "74,5% mục tiêu tháng",
            icon: CircleDollarSign,
            tone: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Hoa hồng dự kiến",
            value: `${(totalCommission / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`,
            detail: "Chốt kỳ vào 31/07/2026",
            icon: WalletCards,
            tone: "bg-amber-50 text-amber-600",
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold text-slate-500">{label}</p>
                <p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">
                  {value}
                </p>
              </div>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {detail}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-xs font-black text-slate-900">
                Phân bổ ca hôm nay
              </h2>
              <p className="mt-1 text-[8px] text-slate-400">
                Theo khung giờ hoạt động 08:00–20:00
              </p>
            </div>
            <Clock3 className="h-4.5 w-4.5 text-violet-500" />
          </div>
          <div className="overflow-x-auto p-4">
            <div className="min-w-[760px]">
              <div className="ml-36 grid grid-cols-7 text-center text-[7px] font-bold text-slate-400">
                {[
                  "08:00",
                  "10:00",
                  "12:00",
                  "14:00",
                  "16:00",
                  "18:00",
                  "20:00",
                ].map((time) => (
                  <span key={time}>{time}</span>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                {activeBranchStaff
                  .slice(0, 6)
                  .map((member) => {
                    const start = Number(member.shiftStart.split(":")[0]);
                    const end = Number(member.shiftEnd.split(":")[0]);
                    const left = Math.max(0, ((start - 8) / 12) * 100);
                    const width = Math.max(8, ((end - start) / 12) * 100);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedStaff(member)}
                        className="grid h-auto w-full grid-cols-[132px_1fr] items-center gap-2 border-0 bg-transparent p-0 text-left shadow-none"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[7px] font-black ${roleMeta[member.role].avatar}`}
                          >
                            {initials(member.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[8px] font-black text-slate-700">
                              {member.name}
                            </span>
                            <span className="mt-0.5 block text-[7px] text-slate-400">
                              {roleMeta[member.role].label}
                            </span>
                          </span>
                        </span>
                        <span className="relative block h-8 overflow-hidden rounded-lg bg-slate-100">
                          <span
                            className={`absolute inset-y-1 rounded-md ${member.status === "LEAVE" ? "bg-amber-200" : member.status === "OFF_SHIFT" ? "bg-slate-300" : "bg-gradient-to-r from-violet-500 to-indigo-500"}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <span
                              className={`flex h-full items-center justify-center text-[7px] font-black ${member.status === "WORKING" ? "text-white" : "text-slate-600"}`}
                            >
                              {member.status === "LEAVE"
                                ? "Nghỉ phép"
                                : `${member.shiftStart}–${member.shiftEnd}`}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </article>
        <article className="rounded-2xl bg-gradient-to-br from-[#19152e] to-[#292148] p-5 text-white shadow-xl shadow-violet-950/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-violet-300">
                Mức độ phủ ca
              </p>
              <p className="mt-2 text-2xl font-black">86%</p>
            </div>
            <CalendarDays className="h-5 w-5 text-violet-300" />
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[7px] text-slate-400">Trong ca</p>
              <p className="mt-1 text-sm font-black">{workingCount}</p>
            </div>
            <div>
              <p className="text-[7px] text-slate-400">Nghỉ phép</p>
              <p className="mt-1 text-sm font-black">
                {
                  activeBranchStaff.filter((member) => member.status === "LEAVE")
                    .length
                }
              </p>
            </div>
            <div>
              <p className="text-[7px] text-slate-400">Trễ ca</p>
              <p className="mt-1 text-sm font-black">2</p>
            </div>
          </div>
          <p className="mt-5 text-[8px] leading-4 text-slate-400">
            Khung 18:00–20:00 tại Quận 3 còn thiếu 1 nhân sự hỗ trợ kỹ thuật.
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Tìm tên, mã nhân viên, kỹ năng, điện thoại..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-400 shadow-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={`flex h-10 items-center gap-2 border px-3 text-[8px] font-bold shadow-sm ${showFilters || activeFilterCount ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"}`}
            >
              <Filter className="h-3.5 w-3.5" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <BeautifulSelect
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as typeof sortBy)
              }
              aria-label="Sắp xếp nhân sự"
              className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[8px] font-bold"
            >
              <option value="REVENUE">Doanh thu cao nhất</option>
              <option value="UTILIZATION">Công suất cao nhất</option>
              <option value="RATING">Đánh giá cao nhất</option>
              <option value="NAME">Tên A–Z</option>
            </BeautifulSelect>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                aria-label="Xem bảng"
                className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === "TABLE" ? "bg-slate-900 text-white" : "bg-transparent text-slate-400"}`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                aria-label="Xem thẻ"
                className={`flex h-8 w-9 items-center justify-center border-0 p-0 shadow-none ${viewMode === "CARDS" ? "bg-slate-900 text-white" : "bg-transparent text-slate-400"}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-slate-100 bg-violet-50/40 p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <label>
              <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                Vai trò
              </span>
              <BeautifulSelect
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as "ALL" | StaffRole)
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              >
                <option value="ALL">Tất cả vai trò</option>
                {Object.entries(roleMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </BeautifulSelect>
            </label>
            <label>
              <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                Trạng thái ca
              </span>
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | ActiveStaffStatus,
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(statusMeta)
                  .filter(([value]) => value !== "INACTIVE")
                  .map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                  ))}
              </BeautifulSelect>
            </label>
            <label>
              <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                Loại hợp đồng
              </span>
              <BeautifulSelect
                value={employmentFilter}
                onChange={(event) =>
                  setEmploymentFilter(
                    event.target.value as "ALL" | EmploymentType,
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              >
                <option value="ALL">Tất cả loại hợp đồng</option>
                {Object.entries(employmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </BeautifulSelect>
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="self-end border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm"
            >
              Đặt lại
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3">
          {(["ALL", "WORKING", "OFF_SHIFT", "LEAVE"] as const).map((status) => {
            const count =
              status === "ALL"
                ? activeBranchStaff.length
                : activeBranchStaff.filter((member) => member.status === status)
                    .length;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-0 text-[8px] font-bold shadow-none ${statusFilter === status ? "text-violet-700" : "text-slate-500"}`}
              >
                {status !== "ALL" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`}
                  />
                )}
                {status === "ALL" ? "Tất cả nhân sự" : statusMeta[status].label}
                <span
                  className={`rounded-full px-1.5 py-0.5 ${statusFilter === status ? "bg-violet-100" : "bg-slate-100"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          <span className="ml-auto text-[8px] text-slate-400">
            {filteredStaff.length} hồ sơ phù hợp
          </span>
        </div>

        {viewMode === "TABLE" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[8px] font-black uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Nhân viên</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Ca hôm nay</th>
                  <th className="px-4 py-3">Lịch hẹn</th>
                  <th className="px-4 py-3">Doanh thu</th>
                  <th className="px-4 py-3">Hiệu suất</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="text-[9px] text-slate-600 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[8px] font-black ${roleMeta[member.role].avatar}`}
                        >
                          {initials(member.name)}
                        </span>
                        <div>
                          <p className="font-black text-slate-800">
                            {member.name}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {member.id} · {branchLabels[member.branch]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${roleMeta[member.role].badge}`}
                      >
                        {roleMeta[member.role].label}
                      </span>
                      <p className="mt-1.5 text-[7px] text-slate-400">
                        {employmentLabels[member.employmentType]}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-black text-slate-800">
                        {member.shiftStart}–{member.shiftEnd}
                      </p>
                      <p className="mt-1 text-[8px] text-slate-400">
                        Chấm công {member.attendance}%
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-black text-slate-800">
                        {member.appointments} lịch
                      </p>
                      <p className="mt-1 text-[8px] text-slate-400">
                        {member.completed} hoàn thành
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-black text-slate-800">
                        {formatCurrency(member.revenue)}
                      </p>
                      <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{
                            width: `${Math.min(100, member.target ? (member.revenue / member.target) * 100 : 0)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p
                        className={`font-black ${performanceTone(member.utilization)}`}
                      >
                        {member.utilization}% công suất
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[8px] text-amber-600">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {member.rating || "—"} · Trễ {member.lateCount} lần
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[member.status].badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusMeta[member.status].dot}`}
                        />
                        {statusMeta[member.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStaff(member)}
                        className="border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm"
                      >
                        Xem hồ sơ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredStaff.length && (
              <div className="px-6 py-14 text-center">
                <Search className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-[10px] font-black text-slate-600">
                  Không tìm thấy nhân sự phù hợp
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 border-0 bg-transparent px-2 text-[9px] font-bold text-violet-600 shadow-none"
                >
                  Xóa tìm kiếm và bộ lọc
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredStaff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedStaff(member)}
                className="h-auto min-h-60 border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[9px] font-black ${roleMeta[member.role].avatar}`}
                  >
                    {initials(member.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black text-slate-800">
                      {member.name}
                    </p>
                    <p className="mt-1 text-[8px] text-slate-400">
                      {roleMeta[member.role].label} ·{" "}
                      {branchLabels[member.branch]}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-[7px] font-bold ring-1 ${statusMeta[member.status].badge}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusMeta[member.status].dot}`}
                    />
                    {statusMeta[member.status].label}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-[7px] text-slate-400">Lịch hẹn</p>
                    <p className="mt-1 text-[10px] font-black text-slate-800">
                      {member.appointments}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-slate-400">Doanh thu</p>
                    <p className="mt-1 truncate text-[10px] font-black text-slate-800">
                      {(member.revenue / 1_000_000).toLocaleString("vi-VN")}tr
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-slate-400">Công suất</p>
                    <p
                      className={`mt-1 text-[10px] font-black ${performanceTone(member.utilization)}`}
                    >
                      {member.utilization}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-[8px]">
                  <span className="text-slate-400">
                    Ca {member.shiftStart}–{member.shiftEnd}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {member.rating || "—"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {member.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-violet-50 px-2 py-1 text-[7px] font-bold text-violet-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[8px] text-slate-400">
            Hiển thị{" "}
            <span className="font-black text-slate-600">
              {filteredStaff.length}
            </span>{" "}
            hồ sơ đang hoạt động · Kỳ hiệu suất tháng 07/2026
          </p>
          <p className="flex items-center gap-1.5 text-[8px] text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            {selectedBranch === "ALL"
              ? "Tất cả chi nhánh"
              : branchLabels[selectedBranch as BranchCode]}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-[0_10px_30px_rgba(15,23,42,0.035)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Archive className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs font-black text-slate-900">
                  Nhân sự ngừng hoạt động
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black text-slate-600 ring-1 ring-slate-200">
                  {inactiveBranchStaff.length}
                </span>
              </div>
              <p className="mt-1 text-[8px] leading-4 text-slate-500">
                Hồ sơ được lưu riêng, không xuất hiện trong danh sách nhân viên,
                lịch phân ca, xếp hạng hoặc chỉ số đội ngũ.
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-rose-50 px-3 py-1.5 text-[8px] font-bold text-rose-700 ring-1 ring-rose-200">
            Kho hồ sơ nội bộ
          </span>
        </div>

        {inactiveBranchStaff.length ? (
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {inactiveBranchStaff.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedStaff(member)}
                  className="flex h-auto min-w-0 flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left shadow-none"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[8px] font-black text-slate-600">
                    {initials(member.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-black text-slate-800">
                      {member.name}
                    </span>
                    <span className="mt-1 block text-[8px] text-slate-500">
                      {member.id} · {roleMeta[member.role].label}
                    </span>
                    <span className="mt-1 block text-[8px] text-slate-400">
                      {branchLabels[member.branch]} · Bắt đầu {formatDate(member.startDate)}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(member)}
                    className="border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-600 shadow-sm"
                  >
                    Xem hồ sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => reactivateStaff(member)}
                    disabled={!canManage}
                    className="flex items-center gap-1.5 border border-violet-200 bg-violet-50 px-3 text-[8px] font-black text-violet-700 shadow-sm disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Kích hoạt lại
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <Archive className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-[9px] font-black text-slate-600">
              Chưa có hồ sơ ngừng hoạt động
            </p>
            <p className="mt-1 text-[8px] text-slate-400">
              Khi đổi trạng thái một nhân viên, hồ sơ sẽ tự động chuyển vào đây.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-black text-slate-900">
                Bảng xếp hạng tháng
              </h2>
              <p className="mt-1 text-[8px] text-slate-400">
                Theo doanh thu dịch vụ
              </p>
            </div>
            <Award className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div className="mt-3 space-y-1">
            {[...serviceStaff]
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 3)
              .map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedStaff(member)}
                  className="flex h-auto w-full items-center gap-3 border-0 bg-transparent px-0 py-2.5 text-left shadow-none"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-[8px] font-black ${index === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[7px] font-black ${roleMeta[member.role].avatar}`}
                  >
                    {initials(member.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[9px] font-black text-slate-700">
                      {member.name}
                    </span>
                    <span className="mt-1 block text-[8px] text-slate-400">
                      {member.appointments} lịch · {member.utilization}% công
                      suất
                    </span>
                  </span>
                  <span className="text-[8px] font-black text-slate-800">
                    {(member.revenue / 1_000_000).toLocaleString("vi-VN")}tr
                  </span>
                </button>
              ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-black text-slate-900">
                Nghỉ phép sắp tới
              </h2>
              <p className="mt-1 text-[8px] text-slate-400">
                Yêu cầu đã duyệt trong 14 ngày
              </p>
            </div>
            <CalendarDays className="h-4.5 w-4.5 text-violet-500" />
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                name: "Yến Nhi",
                day: "16–17",
                month: "THG 07",
                fullDate: "16–17/07/2026",
                reason: "Việc gia đình",
                days: "2 ngày",
              },
              {
                name: "Minh Khang",
                day: "22",
                month: "THG 07",
                fullDate: "22/07/2026",
                reason: "Nghỉ phép năm",
                days: "1 ngày",
              },
              {
                name: "Hà My",
                day: "27–28",
                month: "THG 07",
                fullDate: "27–28/07/2026",
                reason: "Nghỉ phép năm",
                days: "2 ngày",
              },
            ]
              .filter((item) =>
                activeBranchStaff.some((member) => member.name === item.name),
              )
              .map((item) => (
              <div
                key={`${item.name}-${item.fullDate}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <span
                  className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 px-1 text-center text-white shadow-md shadow-violet-100"
                  aria-label={item.fullDate}
                >
                  <span className="whitespace-nowrap text-[10px] font-black leading-none">
                    {item.day}
                  </span>
                  <span className="mt-1 whitespace-nowrap text-[7px] font-bold uppercase tracking-wide text-violet-100">
                    {item.month}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-slate-700">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[8px] text-slate-400">
                    {item.reason}
                  </p>
                </div>
                <span className="text-[7px] font-bold text-slate-500">
                  {item.days}
                </span>
              </div>
              ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-black text-slate-900">
                Sức khỏe đội ngũ
              </h2>
              <p className="mt-1 text-[8px] text-slate-400">
                Chỉ số nhân sự tháng 07/2026
              </p>
            </div>
            <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[7px] text-slate-400">Đúng giờ</p>
              <p className="mt-1 text-lg font-black text-slate-900">96%</p>
            </div>
            <div>
              <p className="text-[7px] text-slate-400">Ổn định</p>
              <p className="mt-1 text-lg font-black text-slate-900">94%</p>
            </div>
            <div>
              <p className="text-[7px] text-slate-400">CSAT</p>
              <p className="mt-1 text-lg font-black text-emerald-600">4.8</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-3">
            <p className="text-[8px] font-black text-emerald-800">
              Gợi ý đào tạo
            </p>
            <p className="mt-1 text-[8px] leading-4 text-emerald-700">
              3 nhân viên phù hợp khóa nâng cao kỹ thuật màu và tư vấn bán thêm.
            </p>
          </div>
        </article>
      </section>

      {selectedStaff && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Đóng hồ sơ nhân viên"
            onClick={() => setSelectedStaff(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <aside className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[10px] font-black ${roleMeta[selectedStaff.role].avatar}`}
                >
                  {initials(selectedStaff.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-black text-slate-900">
                      {selectedStaff.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${statusMeta[selectedStaff.status].badge}`}
                    >
                      {statusMeta[selectedStaff.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-[8px] text-slate-400">
                    {selectedStaff.id} · {roleMeta[selectedStaff.role].label} ·{" "}
                    {branchLabels[selectedStaff.branch]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[7px] text-slate-400">Lịch hẹn</p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {selectedStaff.appointments}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[7px] text-slate-400">Doanh thu</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">
                    {(selectedStaff.revenue / 1_000_000).toLocaleString(
                      "vi-VN",
                    )}
                    tr
                  </p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <p className="text-[7px] text-violet-400">Công suất</p>
                  <p className="mt-1 text-lg font-black text-violet-700">
                    {selectedStaff.utilization}%
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[7px] text-amber-500">Đánh giá</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-black text-amber-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {selectedStaff.rating || "—"}
                  </p>
                </div>
              </div>
              <div
                className={`mt-4 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${selectedStaff.status === "WORKING" ? "border-emerald-200 bg-emerald-50/70" : selectedStaff.status === "OFF_SHIFT" ? "border-slate-200 bg-slate-50" : selectedStaff.status === "INACTIVE" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedStaff.status === "WORKING" ? "bg-emerald-600 text-white" : selectedStaff.status === "OFF_SHIFT" ? "bg-slate-200 text-slate-600" : selectedStaff.status === "INACTIVE" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    <Clock3 className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                      Trạng thái ca hôm nay
                    </p>
                    <p className="mt-1 text-[11px] font-black text-slate-900">
                      {selectedStaff.status === "WORKING"
                        ? "Đang trong ca làm việc"
                        : selectedStaff.status === "OFF_SHIFT"
                          ? "Ngoài ca làm việc"
                          : selectedStaff.status === "LEAVE"
                            ? "Đang nghỉ phép"
                            : "Nhân sự ngừng hoạt động"}
                    </p>
                    <p className="mt-1 text-[8px] leading-4 text-slate-500">
                      {selectedStaff.status === "WORKING"
                        ? `Ghi nhận bắt đầu lúc ${selectedStaff.lastClockIn || selectedStaff.shiftStart}. Nhân viên đang sẵn sàng nhận lịch.`
                        : selectedStaff.status === "OFF_SHIFT"
                          ? selectedStaff.lastClockOut
                            ? `Đã kết thúc ca gần nhất lúc ${selectedStaff.lastClockOut}.`
                            : "Chưa bắt đầu ca hôm nay hoặc ca đã kết thúc."
                          : selectedStaff.status === "LEAVE"
                            ? "Không thể bắt đầu ca khi hồ sơ đang ở trạng thái nghỉ phép."
                            : "Cần kích hoạt lại hồ sơ trước khi chấm công."}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl border border-white/80 bg-white px-4 py-3 text-left shadow-sm sm:text-right">
                  <p className="text-[7px] font-bold text-slate-400">
                    Ca được phân công
                  </p>
                  <p className="mt-1 text-[10px] font-black text-slate-800">
                    {selectedStaff.shiftStart}–{selectedStaff.shiftEnd}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                    Thông tin nhân sự
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${selectedStaff.phone.replace(/\s/g, "")}`}
                      aria-label="Gọi nhân viên"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      aria-label="Nhắn tin"
                      className="flex h-9 w-9 items-center justify-center border-0 bg-violet-50 p-0 text-violet-600 shadow-none"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-[7px] text-slate-400">Số điện thoại</p>
                      <p className="mt-1 text-[9px] font-bold text-slate-700">
                        {selectedStaff.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Mail className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[7px] text-slate-400">Email</p>
                      <p className="mt-1 truncate text-[9px] font-bold text-slate-700">
                        {selectedStaff.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <BriefcaseBusiness className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-[7px] text-slate-400">Hợp đồng</p>
                      <p className="mt-1 text-[9px] font-bold text-slate-700">
                        {employmentLabels[selectedStaff.employmentType]} · từ{" "}
                        {formatDate(selectedStaff.startDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Clock3 className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-[7px] text-slate-400">Ca mặc định</p>
                      <p className="mt-1 text-[9px] font-bold text-slate-700">
                        {selectedStaff.shiftStart}–{selectedStaff.shiftEnd}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[8px] font-bold text-slate-400">
                      Mục tiêu doanh thu tháng
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {formatCurrency(selectedStaff.target)}
                    </p>
                  </div>
                  <Target className="h-4.5 w-4.5 text-violet-300" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[7px] text-slate-400">
                  <span>
                    Đã đạt{" "}
                    {selectedStaff.target
                      ? Math.round(
                          (selectedStaff.revenue / selectedStaff.target) * 100,
                        )
                      : 0}
                    %
                  </span>
                  <span>{formatCurrency(selectedStaff.revenue)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                    style={{
                      width: `${Math.min(100, selectedStaff.target ? (selectedStaff.revenue / selectedStaff.target) * 100 : 0)}%`,
                    }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[7px] text-slate-500">Hoa hồng</p>
                    <p className="mt-1 text-[10px] font-black">
                      {selectedStaff.commissionRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-slate-500">Tạm tính</p>
                    <p className="mt-1 text-[10px] font-black">
                      {formatCurrency(selectedStaff.commissionEarned)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-slate-500">Chấm công</p>
                    <p className="mt-1 text-[10px] font-black">
                      {selectedStaff.attendance}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-800">
                      Lịch làm việc tuần này
                    </h3>
                    <p className="mt-1 text-[9px] font-medium text-slate-500">
                      13/07–19/07/2026
                    </p>
                  </div>
                  <CalendarDays className="h-4 w-4 text-violet-500" />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {selectedStaff.schedule.map((day) => (
                    <div
                      key={day.day}
                      className={`flex min-h-20 flex-col items-center justify-center rounded-xl px-2 py-3 text-center ${day.status === "WORK" ? "bg-violet-50" : day.status === "LEAVE" ? "bg-amber-50" : "bg-slate-100"}`}
                    >
                      <p className="text-[9px] font-black text-slate-600">
                        {day.day}
                      </p>
                      <p className="mt-1 text-[8px] font-medium text-slate-400">
                        {day.date}
                      </p>
                      <p
                        className={`mt-2 whitespace-nowrap text-[8px] font-black leading-none ${day.status === "WORK" ? "text-violet-700" : day.status === "LEAVE" ? "text-amber-700" : "text-slate-500"}`}
                      >
                        {day.status === "WORK"
                          ? day.shift.replace(":00", "h").replace(":00", "h")
                          : day.status === "LEAVE"
                            ? "Nghỉ phép"
                            : "Nghỉ"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                  Kỹ năng chuyên môn
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedStaff.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-fuchsia-50 px-2 py-1 text-[7px] font-bold text-fuchsia-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <div>
                    <p className="text-[8px] font-black text-violet-800">
                      Quyền truy cập
                    </p>
                    <p className="mt-1 text-[8px] leading-4 text-violet-600">
                      {selectedStaff.permissions.length
                        ? selectedStaff.permissions.join(" · ")
                        : "Chưa cấp quyền nghiệp vụ"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                  Ghi chú quản lý
                </p>
                <p className="mt-2 text-[9px] leading-5 text-slate-600">
                  {selectedStaff.notes || "Chưa có ghi chú cho nhân viên này."}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(selectedStaff)}
                  disabled={!canManage}
                  className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setShiftAction({
                      type:
                        selectedStaff.status === "WORKING" ? "END" : "START",
                      staff: selectedStaff,
                    })
                  }
                  disabled={
                    !canManage ||
                    !["WORKING", "OFF_SHIFT"].includes(selectedStaff.status)
                  }
                  className={`flex h-11 flex-1 items-center justify-center gap-2 border px-4 text-[9px] font-black text-white shadow-lg disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none ${selectedStaff.status === "WORKING" ? "border-rose-700 bg-rose-600 shadow-rose-100" : "border-violet-700 bg-violet-600 shadow-violet-200"}`}
                >
                  <Clock3 className="h-4 w-4" />
                  {selectedStaff.status === "WORKING"
                    ? "Kết thúc ca"
                    : selectedStaff.status === "OFF_SHIFT"
                      ? "Bắt đầu ca"
                      : selectedStaff.status === "LEAVE"
                        ? "Đang nghỉ phép"
                        : "Hồ sơ ngừng hoạt động"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {shiftAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng xác nhận ca làm"
            onClick={() => setShiftAction(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="shift-action-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-slate-100 p-5">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${shiftAction.type === "START" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
              >
                <Clock3 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                  Xác nhận chấm công
                </p>
                <h2
                  id="shift-action-title"
                  className="mt-1 text-base font-black text-slate-900"
                >
                  {shiftAction.type === "START"
                    ? "Bắt đầu ca làm việc?"
                    : "Kết thúc ca làm việc?"}
                </h2>
                <p className="mt-1 text-[9px] font-bold text-slate-500">
                  {shiftAction.staff.name} · {shiftAction.staff.shiftStart}–
                  {shiftAction.staff.shiftEnd}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShiftAction(null)}
                aria-label="Đóng"
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-400 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div
                className={`rounded-2xl border p-4 ${shiftAction.type === "START" ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}
              >
                <p
                  className={`text-[9px] font-black ${shiftAction.type === "START" ? "text-emerald-800" : "text-rose-800"}`}
                >
                  {shiftAction.type === "START"
                    ? "Nhân viên sẽ được đánh dấu đang trong ca"
                    : "Nhân viên sẽ được đánh dấu ngoài ca"}
                </p>
                <p
                  className={`mt-2 text-[8px] leading-4 ${shiftAction.type === "START" ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {shiftAction.type === "START"
                    ? "Hệ thống ghi nhận giờ vào ca thực tế và cho phép phân công lịch mới cho nhân viên trong ngày."
                    : "Hệ thống ghi nhận giờ ra ca thực tế và ngừng đề xuất nhân viên cho các lịch mới. Những lịch đã phân công vẫn được giữ nguyên."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-[7px] font-bold text-slate-400">
                    Chi nhánh
                  </p>
                  <p className="mt-1 text-[9px] font-black text-slate-700">
                    {branchLabels[shiftAction.staff.branch]}
                  </p>
                </div>
                <div>
                  <p className="text-[7px] font-bold text-slate-400">
                    Thời điểm ghi nhận
                  </p>
                  <p className="mt-1 text-[9px] font-black text-slate-700">
                    Theo giờ hệ thống hiện tại
                  </p>
                </div>
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setShiftAction(null)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmShiftAction}
                className={`flex items-center gap-2 border px-5 text-[9px] font-black text-white shadow-lg ${shiftAction.type === "START" ? "border-emerald-700 bg-emerald-600 shadow-emerald-100" : "border-rose-700 bg-rose-600 shadow-rose-100"}`}
              >
                <Clock3 className="h-4 w-4" />
                {shiftAction.type === "START"
                  ? "Xác nhận bắt đầu ca"
                  : "Xác nhận kết thúc ca"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {formMode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng biểu mẫu"
            onClick={() => setFormMode(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <form
            onSubmit={submitStaff}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {formMode === "CREATE"
                    ? "Thêm nhân viên mới"
                    : `Chỉnh sửa ${selectedStaff?.id}`}
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Thiết lập hồ sơ, vai trò, ca làm và quyền nghiệp vụ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormMode(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div className="rounded-xl bg-rose-50 p-3 text-[9px] font-bold text-rose-700">
                  {formError}
                </div>
              )}
              <fieldset>
                <legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <UserRound className="h-3.5 w-3.5" />
                  </span>
                  Thông tin cá nhân
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Họ và tên *
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Nguyễn Minh Anh"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Số điện thoại *
                    </span>
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="09xx xxx xxx"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Email công việc *
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="ten@naile.vn"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Ngày sinh
                    </span>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                      <input
                        type="date"
                        value={form.birthday}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            birthday: event.target.value,
                          }))
                        }
                        className={dateInputClass}
                      />
                    </div>
                  </label>
                </div>
              </fieldset>
              <fieldset className="border-t border-slate-100 pt-5">
                <legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                  </span>
                  Công việc & hợp đồng
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Chi nhánh
                    </span>
                    <BeautifulSelect
                      value={form.branch}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          branch: event.target.value as BranchCode,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="Q3">Chi nhánh Quận 3</option>
                      <option value="Q1">Chi nhánh Quận 1</option>
                    </BeautifulSelect>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Vai trò
                    </span>
                    <BeautifulSelect
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          role: event.target.value as StaffRole,
                        }))
                      }
                      className={inputClass}
                    >
                      {Object.entries(roleMeta).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </BeautifulSelect>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Loại hợp đồng
                    </span>
                    <BeautifulSelect
                      value={form.employmentType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          employmentType: event.target.value as EmploymentType,
                        }))
                      }
                      className={inputClass}
                    >
                      {Object.entries(employmentLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </BeautifulSelect>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Ngày bắt đầu
                    </span>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }))
                        }
                        className={dateInputClass}
                      />
                    </div>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Trạng thái
                    </span>
                    <BeautifulSelect
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as StaffStatus,
                        }))
                      }
                      className={inputClass}
                    >
                      {Object.entries(statusMeta).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </BeautifulSelect>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Hoa hồng dịch vụ (%)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.commissionRate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          commissionRate: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset className="border-t border-slate-100 pt-5">
                <legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Clock3 className="h-3.5 w-3.5" />
                  </span>
                  Ca làm mặc định
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Bắt đầu ca
                    </span>
                    <input
                      type="time"
                      value={form.shiftStart}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shiftStart: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                      Kết thúc ca
                    </span>
                    <input
                      type="time"
                      value={form.shiftEnd}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shiftEnd: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset className="border-t border-slate-100 pt-5">
                <legend className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  Quyền nghiệp vụ
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      key: "canManageAppointments" as const,
                      label: "Quản lý lịch hẹn",
                    },
                    {
                      key: "canViewCustomers" as const,
                      label: "Xem hồ sơ khách",
                    },
                    {
                      key: "canCollectPayment" as const,
                      label: "Thu tiền tại quầy",
                    },
                  ].map((permission) => (
                    <label
                      key={permission.key}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={form[permission.key]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [permission.key]: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-violet-600"
                      />
                      <span className="text-[8px] font-bold text-slate-700">
                        {permission.label}
                      </span>
                    </label>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                    Ghi chú quản lý
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    placeholder="Năng lực, kế hoạch đào tạo, lưu ý công việc..."
                  />
                </label>
              </fieldset>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"
              >
                <UserCog className="h-4 w-4" />
                {formMode === "CREATE" ? "Tạo hồ sơ" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
