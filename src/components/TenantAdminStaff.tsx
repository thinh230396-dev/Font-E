import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader, Pagination } from './ui';
import { getTenantAdminInitialData } from "../utils/mockDataReset";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  Filter,
  KeyRound,
  LayoutGrid,
  LayoutList,
  Mail,
  MapPin,
  Pencil,
  Percent,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import BeautifulSelect from "./BeautifulSelect";
import useStaff from "../hooks/useStaff";
import { tenantStorageKey } from "../utils/tenantStorage";
import type { ApiError } from "../services/apiClient";
import type { BranchDto } from "../services/branches";
import type {
  SaveStaffInput,
  StaffApiRole,
  StaffApiStatus,
  StaffDto,
} from "../services/staff";

type StaffRole = StaffApiRole;
type StaffStatus = StaffApiStatus;
type ActiveStaffStatus = Exclude<StaffStatus, "INACTIVE">;
type StaffView = "TABLE" | "CARDS";

/**
 * Hồ sơ nhân viên như màn hình dùng — chính là `StaffDto` của máy chủ.
 *
 * Ngày 9 bỏ hẳn kiểu `StaffMember` riêng của thời dữ liệu mẫu. Kiểu đó mang
 * mười tám trường không có cột nào ở database — chấm công, doanh thu, đánh giá,
 * công suất, mục tiêu tháng, số lần trễ, quỹ phép, ngày sinh, ngày vào làm,
 * loại hợp đồng, lịch tuần, ghi chú và danh sách quyền — nên giữ nó là giữ một
 * biểu mẫu cho người dùng gõ vào rồi mất trắng sau lần tải trang kế tiếp.
 */
type StaffRecord = StaffDto;

interface BranchOption {
  id: string;
  name: string;
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
  /** Có mã tiệm nghĩa là phiên đang làm việc với dữ liệu thật; rỗng là chế độ mẫu. */
  tenantId?: string;
  /** Chi nhánh thật của tiệm, do cổng chủ tiệm nạp sẵn bằng `GET /api/branches`. */
  branches?: BranchDto[];
}

/** Đúng chín ô máy chủ nhận. Hoa hồng giữ dạng chuỗi phần trăm để gõ cho tự nhiên. */
interface StaffFormState {
  fullName: string;
  phone: string;
  email: string;
  branchId: string;
  role: StaffRole;
  shiftStart: string;
  shiftEnd: string;
  /** Người dùng gõ theo phần trăm (15), máy chủ nhận theo tỷ lệ (0,15). */
  commissionPercent: string;
  skills: string[];
}

interface GrantAccountFormState {
  email: string;
  username: string;
  displayName: string;
}

const DEMO_BRANCHES: BranchOption[] = [
  { id: "Q3", name: "Chi nhánh Quận 3" },
  { id: "Q1", name: "Chi nhánh Quận 1" },
];

const roleMeta: Record<
  StaffRole,
  { label: string; badge: string; avatar: string }
> = {
  RECEPTIONIST: {
    label: "Lễ tân",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    avatar: "bg-amber-100 text-amber-700",
  },
  TECHNICIAN: {
    label: "Nhân viên kỹ thuật",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    avatar: "bg-blue-100 text-blue-700",
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

/** BR-EMP-005 — bốn trạng thái, kèm câu giải thích hệ quả của mỗi lần đổi. */
const statusChangeNotes: Record<StaffStatus, string> = {
  WORKING: "Nhân viên được đánh dấu đang trong ca và sẵn sàng nhận lịch hẹn.",
  OFF_SHIFT: "Nhân viên ngoài ca. Lịch đã phân công vẫn giữ nguyên.",
  LEAVE: "Nhân viên đang nghỉ phép và không được đề xuất cho lịch mới.",
  INACTIVE:
    "Hồ sơ chuyển sang ngừng hoạt động và tài khoản đăng nhập của nhân viên (nếu có) bị vô hiệu hóa ngay. Nhận lại người cũ sẽ KHÔNG tự cấp lại quyền đăng nhập.",
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-body font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100";
const errorInputClass =
  "h-11 w-full rounded-xl border border-rose-300 bg-rose-50/60 px-3 text-body font-medium text-slate-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100";
const initials = (name: string) =>
  name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/** Giờ ca ở dạng `HH:mm`; đọc ra số giờ để vẽ thanh ca trên trục 08:00–20:00. */
const hourOf = (value: string) => {
  const [hour, minute] = value.split(":");
  return Number(hour) + Number(minute || 0) / 60;
};

const emptyForm = (branchId: string): StaffFormState => ({
  fullName: "",
  phone: "",
  email: "",
  branchId,
  role: "TECHNICIAN",
  shiftStart: "09:00",
  shiftEnd: "18:00",
  commissionPercent: "15",
  skills: [],
});

/**
 * Mười hồ sơ mẫu cho tài khoản demo, đã thu về đúng hình dạng máy chủ trả.
 *
 * `tenantId` để rỗng và mốc thời gian là hằng số: chúng chỉ tồn tại để hai
 * nhánh dữ liệu dùng chung một kiểu, không chỗ nào trên màn hình đọc tới.
 */
const demoStamp = "2026-07-01T00:00:00+07:00";
const demoStaff = (
  id: string,
  fullName: string,
  branchId: string,
  role: StaffRole,
  status: StaffStatus,
  shiftStart: string,
  shiftEnd: string,
  commissionRate: number,
  skills: string[],
  phone: string,
  email: string,
  account?: StaffRecord["account"]
): StaffRecord => ({
  id,
  tenantId: "",
  branchId,
  fullName,
  phone,
  email,
  role,
  status,
  shiftStart,
  shiftEnd,
  commissionRate,
  skills,
  account,
  createdAt: demoStamp,
  updatedAt: demoStamp,
});

const staffSeed: StaffRecord[] = [
  demoStaff("STF-001", "Trần Yến Nhi", "Q3", "RECEPTIONIST", "WORKING", "08:00", "17:00", 0.08, ["Tư vấn khách", "Chốt lịch hẹn"], "0901 234 567", "yennhi@naile.vn", { id: "USR-DEMO-01", email: "yennhi@naile.vn", username: "yennhi", status: "ACTIVE" }),
  demoStaff("STF-002", "Nguyễn Minh Khang", "Q3", "TECHNICIAN", "WORKING", "09:00", "18:00", 0.18, ["Sơn gel", "Vẽ nail nghệ thuật"], "0902 345 678", "minhkhang@naile.vn"),
  demoStaff("STF-003", "Lê Hà My", "Q3", "TECHNICIAN", "OFF_SHIFT", "12:00", "20:00", 0.16, ["Đắp bột", "Chăm sóc móng"], "0903 456 789", "hamy@naile.vn"),
  demoStaff("STF-004", "Phạm Thu Trang", "Q3", "TECHNICIAN", "LEAVE", "09:00", "18:00", 0.15, ["Sơn gel", "Nối mi"], "0904 567 890", "thutrang@naile.vn"),
  demoStaff("STF-005", "Đỗ Bảo Ngọc", "Q3", "TECHNICIAN", "WORKING", "10:00", "19:00", 0.17, ["Vẽ nail nghệ thuật", "Đính đá"], "0905 678 901", "baongoc@naile.vn"),
  demoStaff("STF-006", "Vũ Kim Chi", "Q1", "RECEPTIONIST", "WORKING", "08:00", "17:00", 0.08, ["Tư vấn khách", "Thu ngân"], "0906 789 012", "kimchi@naile.vn", { id: "USR-DEMO-02", email: "kimchi@naile.vn", username: "kimchi", status: "ACTIVE" }),
  demoStaff("STF-007", "Hoàng Anh Thư", "Q1", "TECHNICIAN", "WORKING", "09:00", "18:00", 0.18, ["Đắp bột", "Sơn gel"], "0907 890 123", "anhthu@naile.vn"),
  demoStaff("STF-008", "Bùi Thanh Vy", "Q1", "TECHNICIAN", "OFF_SHIFT", "12:00", "20:00", 0.15, ["Chăm sóc móng", "Massage tay"], "0908 901 234", "thanhvy@naile.vn"),
  demoStaff("STF-009", "Ngô Gia Hân", "Q1", "TECHNICIAN", "WORKING", "10:00", "19:00", 0.16, ["Vẽ nail nghệ thuật"], "0909 012 345", "giahan@naile.vn"),
  demoStaff("STF-010", "Trịnh Mai Lan", "Q3", "TECHNICIAN", "INACTIVE", "09:00", "18:00", 0.15, ["Sơn gel"], "0910 123 456", "mailan@naile.vn"),
];

export default function TenantAdminStaff({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  accessMode = "full",
  readOnlyReason = "",
  onNotify,
  tenantId,
  branches,
}: TenantAdminStaffProps) {
  const storageKey = tenantStorageKey("tenant-admin-staff-v3");
  const [demoStaffList, setDemoStaffList] = useState<StaffRecord[]>(() => {
    if (typeof window === "undefined") return staffSeed;
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? (JSON.parse(stored) as StaffRecord[]) : null;
      return getTenantAdminInitialData(Array.isArray(parsed) ? parsed : null, staffSeed);
    } catch {
      return staffSeed;
    }
  });

  /**
   * Hồ sơ thật của tiệm đang làm việc.
   *
   * Chạy song song với `demoStaffList` chứ không thay thế: tài khoản demo vẫn
   * cần một đường dữ liệu mẫu. Khi có `tenantId` thì màn này chuyển hẳn sang
   * máy chủ và KHÔNG ghi bản sao nào xuống trình duyệt.
   */
  const isLive = Boolean(tenantId);
  const directory = useStaff(isLive, tenantId || null);
  const staff = isLive ? directory.staff : demoStaffList;

  const branchOptions: BranchOption[] = useMemo(() => {
    if (!isLive) return DEMO_BRANCHES;
    return (branches || []).map((branch) => ({ id: branch.id, name: branch.name }));
  }, [branches, isLive]);

  /**
   * Chi nhánh mở cho ô chọn trong biểu mẫu.
   *
   * Chi nhánh đã ngừng hoạt động vẫn phải hiện ở bảng và ngăn chi tiết — người
   * cũ của nó còn đó — nhưng không nhận người mới, nên biểu mẫu chỉ mở những
   * chi nhánh đang hoạt động.
   */
  const assignableBranches: BranchOption[] = useMemo(() => {
    if (!isLive) return DEMO_BRANCHES;
    return (branches || [])
      .filter((branch) => branch.status === "ACTIVE")
      .map((branch) => ({ id: branch.id, name: branch.name }));
  }, [branches, isLive]);

  const branchName = (branchId: string) =>
    branchOptions.find((option) => option.id === branchId)?.name || "Chi nhánh đã gỡ";

  const [roleFilter, setRoleFilter] = useState<"ALL" | StaffRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ActiveStaffStatus>("ALL");
  const [accountFilter, setAccountFilter] = useState<"ALL" | "HAS" | "NONE">("ALL");
  const [sortBy, setSortBy] = useState<"NAME" | "SHIFT" | "COMMISSION">("NAME");
  const [viewMode, setViewMode] = useState<StaffView>("TABLE");
  const [showFilters, setShowFilters] = useState(false);
  const [isInactiveSectionExpanded, setIsInactiveSectionExpanded] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT" | null>(null);
  const [form, setForm] = useState<StaffFormState>(() => emptyForm(selectedBranch));
  const [skillDraft, setSkillDraft] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [statusTarget, setStatusTarget] = useState<{ staff: StaffRecord; status: StaffStatus } | null>(null);
  const [grantTarget, setGrantTarget] = useState<StaffRecord | null>(null);
  const [grantForm, setGrantForm] = useState<GrantAccountFormState>({ email: "", username: "", displayName: "" });
  const [grantedPassword, setGrantedPassword] = useState<{ staffName: string; email: string; password: string } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const canManage = accessMode === "full" && !readOnlyReason;

  /**
   * Hồ sơ đang mở tra theo mã chứ không giữ một bản sao trong state.
   *
   * Sau mỗi lần ghi, hook nạp lại danh sách và trả về đối tượng MỚI. Giữ bản sao
   * thì ngăn chi tiết sẽ còn hiện dữ liệu trước khi sửa cho tới lúc người dùng
   * đóng nó ra và mở lại.
   */
  const selectedStaff = useMemo(
    () => staff.find((member) => member.id === selectedStaffId) || null,
    [selectedStaffId, staff]
  );

  useEffect(() => {
    // Chế độ thật KHÔNG ghi vào localStorage: máy chủ là nguồn duy nhất.
    if (isLive) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(demoStaffList));
    } catch {
      // Local storage is optional; the page remains usable when it is unavailable.
    }
  }, [demoStaffList, isLive, storageKey]);

  useEffect(() => {
    if (!selectedStaffId && !formMode && !statusTarget && !grantTarget && !grantedPassword) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (grantedPassword) setGrantedPassword(null);
      else if (grantTarget) setGrantTarget(null);
      else if (statusTarget) setStatusTarget(null);
      else if (formMode) setFormMode(null);
      else setSelectedStaffId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [formMode, grantTarget, grantedPassword, selectedStaffId, statusTarget]);

  const requireManage = () => {
    if (canManage) return true;
    onNotify?.(readOnlyReason || "Tài khoản hiện chỉ có quyền xem dữ liệu nhân sự.");
    return false;
  };

  const branchStaff = useMemo(
    () => staff.filter((member) => selectedBranch === "ALL" || member.branchId === selectedBranch),
    [selectedBranch, staff]
  );
  const activeBranchStaff = useMemo(
    () => branchStaff.filter((member) => member.status !== "INACTIVE"),
    [branchStaff]
  );
  const inactiveBranchStaff = useMemo(
    () => branchStaff.filter((member) => member.status === "INACTIVE"),
    [branchStaff]
  );
  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeBranchStaff
      .filter((member) => roleFilter === "ALL" || member.role === roleFilter)
      .filter((member) => statusFilter === "ALL" || member.status === statusFilter)
      .filter((member) =>
        accountFilter === "ALL"
          ? true
          : accountFilter === "HAS"
            ? Boolean(member.account)
            : !member.account
      )
      .filter(
        (member) =>
          !query ||
          `${member.id} ${member.fullName} ${member.phone || ""} ${member.email || ""} ${member.skills.join(" ")}`
            .toLowerCase()
            .includes(query)
      )
      .sort((a, b) =>
        sortBy === "SHIFT"
          ? a.shiftStart.localeCompare(b.shiftStart)
          : sortBy === "COMMISSION"
            ? b.commissionRate - a.commissionRate
            : a.fullName.localeCompare(b.fullName, "vi")
      );
  }, [accountFilter, activeBranchStaff, roleFilter, searchQuery, sortBy, statusFilter]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pagedStaff = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedBranch, roleFilter, statusFilter, accountFilter, sortBy]);

  const workingCount = activeBranchStaff.filter((member) => member.status === "WORKING").length;
  const receptionistCount = activeBranchStaff.filter((member) => member.role === "RECEPTIONIST").length;
  const technicianCount = activeBranchStaff.filter((member) => member.role === "TECHNICIAN").length;
  const accountCount = activeBranchStaff.filter((member) => Boolean(member.account)).length;
  const activeFilterCount = [roleFilter !== "ALL", statusFilter !== "ALL", accountFilter !== "ALL"].filter(Boolean).length;

  /** Gắn lỗi máy chủ vào đúng ô nhập; phần không gắn được thì hiện ở đầu biểu mẫu. */
  const applyApiError = (error: ApiError) => {
    const mapped: Record<string, string> = {};
    error.fields.forEach((item) => {
      mapped[item.field] = item.message;
    });
    setFieldErrors(mapped);
    setFormError(error.fields.length ? "" : error.message);
  };

  const openCreate = () => {
    if (!requireManage()) return;
    const fallbackBranch =
      selectedBranch !== "ALL" && assignableBranches.some((branch) => branch.id === selectedBranch)
        ? selectedBranch
        : assignableBranches[0]?.id || "";
    setForm(emptyForm(fallbackBranch));
    setSkillDraft("");
    setFormError("");
    setFieldErrors({});
    setFormMode("CREATE");
  };

  const openEdit = (member: StaffRecord) => {
    if (!requireManage()) return;
    setForm({
      fullName: member.fullName,
      phone: member.phone || "",
      email: member.email || "",
      branchId: member.branchId,
      role: member.role,
      shiftStart: member.shiftStart,
      shiftEnd: member.shiftEnd,
      commissionPercent: String(Math.round(member.commissionRate * 1000) / 10),
      skills: [...member.skills],
    });
    setSelectedStaffId(member.id);
    setSkillDraft("");
    setFormError("");
    setFieldErrors({});
    setFormMode("EDIT");
  };

  const addSkill = () => {
    const skill = skillDraft.trim();
    if (!skill || form.skills.includes(skill)) {
      setSkillDraft("");
      return;
    }
    setForm((current) => ({ ...current, skills: [...current.skills, skill] }));
    setSkillDraft("");
  };

  /**
   * Thân request gửi đi.
   *
   * `PUT /api/staff/{id}` là phép thay TRỌN hồ sơ, nên biểu mẫu sửa gửi đủ chín
   * ô kể cả những ô người dùng không đụng tới — bỏ trống `email` ở đây là xóa
   * email trên hồ sơ.
   */
  const toSaveInput = (): SaveStaffInput => ({
    branchId: form.branchId,
    fullName: form.fullName.trim(),
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    role: form.role,
    shiftStart: form.shiftStart,
    shiftEnd: form.shiftEnd,
    commissionRate: Math.max(0, Number(form.commissionPercent) || 0) / 100,
    skills: form.skills,
  });

  /** Nhánh dữ liệu mẫu: chỉ ghi vào bộ nhớ trình duyệt, không gọi máy chủ. */
  const submitDemoStaff = () => {
    const existing = formMode === "EDIT" ? demoStaffList.find((member) => member.id === selectedStaffId) : null;
    const nextId =
      existing?.id ||
      `STF-${String(
        demoStaffList.reduce((max, member) => Math.max(max, Number(member.id.replace("STF-", "")) || 0), 0) + 1
      ).padStart(3, "0")}`;
    const payload: StaffRecord = {
      ...(existing || demoStaff(nextId, "", form.branchId, form.role, "WORKING", form.shiftStart, form.shiftEnd, 0, [], "", "")),
      id: nextId,
      branchId: form.branchId,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      role: form.role,
      shiftStart: form.shiftStart,
      shiftEnd: form.shiftEnd,
      commissionRate: Math.max(0, Number(form.commissionPercent) || 0) / 100,
      skills: form.skills,
    };
    setDemoStaffList((current) =>
      existing ? current.map((member) => (member.id === nextId ? payload : member)) : [payload, ...current]
    );
    setSelectedStaffId(nextId);
    setFormMode(null);
    setNotice(existing ? `Đã cập nhật hồ sơ ${payload.fullName}.` : `Đã tạo hồ sơ ${payload.fullName}.`);
  };

  const submitStaff = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage() || saving) return;
    setFormError("");
    setFieldErrors({});

    if (!form.fullName.trim()) {
      setFieldErrors({ fullName: "Vui lòng nhập họ và tên nhân viên." });
      return;
    }
    if (!form.branchId) {
      setFieldErrors({ branchId: "Chọn chi nhánh nơi nhân viên làm việc." });
      return;
    }

    if (!isLive) {
      submitDemoStaff();
      return;
    }

    setSaving(true);
    const input = toSaveInput();
    const result = formMode === "EDIT" && selectedStaffId
      ? await directory.updateStaff(selectedStaffId, input)
      : await directory.createStaff(input);
    setSaving(false);

    if (result.status === "error") {
      applyApiError(result.error);
      return;
    }

    setSelectedStaffId(result.data.id);
    setFormMode(null);
    setNotice(
      formMode === "CREATE"
        ? `Đã tạo hồ sơ ${result.data.fullName}.`
        : `Đã cập nhật hồ sơ ${result.data.fullName}.`
    );
  };

  const confirmStatusChange = async () => {
    if (!statusTarget || !requireManage() || saving) return;
    const { staff: member, status } = statusTarget;

    if (!isLive) {
      setDemoStaffList((current) =>
        current.map((item) => (item.id === member.id ? { ...item, status } : item))
      );
      setStatusTarget(null);
      setNotice(`${member.fullName} · ${statusMeta[status].label}.`);
      return;
    }

    setSaving(true);
    const result = await directory.changeStaffStatus(member.id, status);
    setSaving(false);
    setStatusTarget(null);

    if (result.status === "error") {
      onNotify?.(result.error.message);
      setNotice(result.error.message);
      return;
    }

    setNotice(
      status === "INACTIVE"
        ? `Đã cho ${member.fullName} nghỉ việc. Tài khoản đăng nhập của nhân viên đã bị vô hiệu hóa.`
        : `${member.fullName} · ${statusMeta[status].label}.`
    );
  };

  const openGrantAccount = (member: StaffRecord) => {
    if (!requireManage()) return;
    setGrantTarget(member);
    setGrantForm({ email: member.email || "", username: "", displayName: member.fullName });
    setFormError("");
    setFieldErrors({});
  };

  const submitGrantAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!grantTarget || !requireManage() || saving) return;
    setFormError("");
    setFieldErrors({});

    if (!isLive) {
      setFormError("Chế độ dữ liệu mẫu không cấp được tài khoản đăng nhập thật.");
      return;
    }

    setSaving(true);
    const result = await directory.grantStaffAccount(grantTarget.id, {
      email: grantForm.email.trim() || undefined,
      username: grantForm.username.trim() || undefined,
      displayName: grantForm.displayName.trim() || undefined,
    });
    setSaving(false);

    if (result.status === "error") {
      applyApiError(result.error);
      return;
    }

    const staffName = result.data.staff.fullName;
    setGrantTarget(null);
    setPasswordCopied(false);

    if (result.data.generatedPassword) {
      setGrantedPassword({
        staffName,
        email: result.data.staff.account?.email || grantForm.email.trim(),
        password: result.data.generatedPassword,
      });
      return;
    }

    setNotice(`Đã cấp tài khoản đăng nhập cho ${staffName}.`);
  };

  const copyPassword = async () => {
    if (!grantedPassword) return;
    try {
      await navigator.clipboard.writeText(grantedPassword.password);
      setPasswordCopied(true);
    } catch {
      // Trình duyệt từ chối quyền ghi clipboard — mật khẩu vẫn hiện nguyên trên màn hình để chép tay.
      setPasswordCopied(false);
    }
  };

  const resetFilters = () => {
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setAccountFilter("ALL");
    onSearchQueryChange("");
  };

  const exportStaff = () => {
    if (!requireManage()) return;
    const rows = filteredStaff.map((member) =>
      [
        member.id,
        member.fullName,
        roleMeta[member.role].label,
        branchName(member.branchId),
        member.phone || "",
        member.email || "",
        `${member.shiftStart}-${member.shiftEnd}`,
        `${Math.round(member.commissionRate * 1000) / 10}%`,
        member.account ? member.account.email : "Chưa cấp",
        statusMeta[member.status].label,
      ].join(",")
    );
    const blob = new Blob(
      [
        `Mã nhân viên,Họ tên,Vai trò,Chi nhánh,Số điện thoại,Email,Ca làm,Hoa hồng,Tài khoản đăng nhập,Trạng thái\n${rows.join("\n")}`,
      ],
      { type: "text/csv;charset=utf-8" }
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "danh-sach-nhan-su.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const accountBadge = (member: StaffRecord) => {
    if (member.account) {
      const active = member.account.status === "ACTIVE";
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${active ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
          <KeyRound className="h-3 w-3" />
          {active ? "Đã cấp" : "Đã khóa"}
        </span>
      );
    }
    if (member.role !== "RECEPTIONIST") {
      return <span className="text-caption text-slate-400">Không áp dụng</span>;
    }
    return <span className="text-caption font-bold text-slate-500">Chưa cấp</span>;
  };

  return (
    <div className="space-y-5">
      {notice && (
        <div className="fixed right-4 top-24 z-[80] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-4 w-4" />
          </span>
          <p className="text-caption font-bold text-slate-700">{notice}</p>
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

      <PageHeader
        title="Nhân sự"
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BeautifulSelect
              value={selectedBranch}
              onChange={(event) => onSelectedBranchChange(event.target.value)}
              aria-label="Chọn chi nhánh"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold text-slate-700 shadow-sm sm:w-56"
            >
              {branchOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
              <option value="ALL">Tất cả chi nhánh</option>
            </BeautifulSelect>
            <button
              type="button"
              onClick={exportStaff}
              disabled={!canManage}
              className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Xuất danh sách
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={!canManage}
              className="flex h-11 items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-caption font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
            >
              <UserPlus className="h-4 w-4" />
              Thêm nhân viên
            </button>
          </div>
        )}
      />

      {isLive && directory.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-caption font-black text-rose-800">Không tải được danh sách nhân sự</p>
          <p className="mt-1 text-caption text-rose-700">{directory.error.message}</p>
          <button
            type="button"
            onClick={directory.reload}
            className="mt-3 border border-rose-200 bg-white px-3 text-caption font-bold text-rose-700 shadow-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Nhân sự đang làm việc",
            value: String(activeBranchStaff.length),
            detail: `${technicianCount} kỹ thuật viên · ${receptionistCount} lễ tân`,
            icon: UsersRound,
            tone: "bg-blue-50 text-blue-600",
          },
          {
            label: "Đang trong ca",
            value: String(workingCount),
            detail: "Theo trạng thái ca hiện tại",
            icon: Clock3,
            tone: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Tài khoản đăng nhập",
            value: String(accountCount),
            detail: "Chỉ lễ tân được cấp quyền vào quầy",
            icon: KeyRound,
            tone: "bg-violet-50 text-violet-600",
          },
          {
            label: "Ngừng hoạt động",
            value: String(inactiveBranchStaff.length),
            detail: "Hồ sơ giữ lại cho lịch hẹn và hóa đơn cũ",
            icon: Archive,
            tone: "bg-slate-100 text-slate-600",
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption font-bold text-slate-500">{label}</p>
                <p className="ta-metric-value mt-1.5 text-slate-950">{value}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-2 text-caption font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xs font-black text-slate-900">Ca làm mặc định</h2>
            <p className="mt-1 text-caption text-slate-400">
              Mỗi nhân viên có một ca cố định. Trục giờ 08:00–20:00.
            </p>
          </div>
          <Clock3 className="h-4.5 w-4.5 text-violet-500" />
        </div>
        {activeBranchStaff.length ? (
          <div className="overflow-x-auto p-4">
            <div className="min-w-[760px]">
              <div className="ml-36 grid grid-cols-7 text-center text-caption font-bold text-slate-400">
                {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((time) => (
                  <span key={time}>{time}</span>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                {activeBranchStaff.slice(0, 8).map((member) => {
                  const start = hourOf(member.shiftStart);
                  const end = hourOf(member.shiftEnd);
                  const left = Math.max(0, ((start - 8) / 12) * 100);
                  const width = Math.max(8, Math.min(100 - left, ((end - start) / 12) * 100));
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedStaffId(member.id)}
                      className="grid h-auto w-full grid-cols-[132px_1fr] items-center gap-2 border-0 bg-transparent p-0 text-left shadow-none"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-caption font-black ${roleMeta[member.role].avatar}`}>
                          {initials(member.fullName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-caption font-black text-slate-700">
                            {member.fullName}
                          </span>
                          <span className="mt-0.5 block text-caption text-slate-400">
                            {roleMeta[member.role].label}
                          </span>
                        </span>
                      </span>
                      <span className="relative block h-8 overflow-hidden rounded-lg bg-slate-100">
                        <span
                          className={`absolute inset-y-1 rounded-md ${member.status === "LEAVE" ? "bg-amber-200" : member.status === "OFF_SHIFT" ? "bg-slate-300" : "bg-violet-500"}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className={`flex h-full items-center justify-center text-caption font-black ${member.status === "WORKING" ? "text-white" : "text-slate-600"}`}>
                            {member.status === "LEAVE" ? "Nghỉ phép" : `${member.shiftStart}–${member.shiftEnd}`}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <Clock3 className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-caption font-black text-slate-600">Chưa có nhân viên nào đang làm việc</p>
            <p className="mt-1 text-caption text-slate-400">Thêm hồ sơ đầu tiên để thấy phân bổ ca.</p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Tìm tên, mã nhân viên, kỹ năng, điện thoại..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-caption outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
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
              className={`flex h-10 items-center gap-2 border px-3 text-caption font-bold shadow-sm ${showFilters || activeFilterCount ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"}`}
            >
              <Filter className="h-3.5 w-3.5" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-caption text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <BeautifulSelect
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              aria-label="Sắp xếp nhân sự"
              className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"
            >
              <option value="NAME">Tên A–Z</option>
              <option value="SHIFT">Ca bắt đầu sớm nhất</option>
              <option value="COMMISSION">Hoa hồng cao nhất</option>
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
              <span className="mb-1.5 block text-caption font-black uppercase text-slate-500">Vai trò</span>
              <BeautifulSelect
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "ALL" | StaffRole)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"
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
              <span className="mb-1.5 block text-caption font-black uppercase text-slate-500">Trạng thái ca</span>
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | ActiveStaffStatus)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"
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
              <span className="mb-1.5 block text-caption font-black uppercase text-slate-500">Tài khoản đăng nhập</span>
              <BeautifulSelect
                value={accountFilter}
                onChange={(event) => setAccountFilter(event.target.value as "ALL" | "HAS" | "NONE")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-caption font-bold"
              >
                <option value="ALL">Tất cả hồ sơ</option>
                <option value="HAS">Đã cấp tài khoản</option>
                <option value="NONE">Chưa cấp tài khoản</option>
              </BeautifulSelect>
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="self-end border border-slate-200 bg-white px-3 text-caption font-bold text-slate-600 shadow-sm"
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
                : activeBranchStaff.filter((member) => member.status === status).length;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`flex h-7 min-h-0 items-center gap-1.5 border-0 bg-transparent px-0 text-caption font-bold shadow-none ${statusFilter === status ? "text-violet-700" : "text-slate-500"}`}
              >
                {status !== "ALL" && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />}
                {status === "ALL" ? "Tất cả nhân sự" : statusMeta[status].label}
                <span className={`rounded-full px-1.5 py-0.5 ${statusFilter === status ? "bg-violet-100" : "bg-slate-100"}`}>
                  {count}
                </span>
              </button>
            );
          })}
          <span className="ml-auto text-caption text-slate-400">{filteredStaff.length} hồ sơ phù hợp</span>
        </div>

        {isLive && directory.loading ? (
          <div className="px-6 py-14 text-center">
            <p className="text-caption font-black text-slate-500">Đang tải hồ sơ nhân sự...</p>
          </div>
        ) : viewMode === "TABLE" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-caption font-black uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Nhân viên</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Ca làm</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedStaff.map((member) => (
                  <tr key={member.id} className="text-caption text-slate-600 hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-caption font-black ${roleMeta[member.role].avatar}`}>
                          {initials(member.fullName)}
                        </span>
                        <div>
                          <p className="font-black text-slate-800">{member.fullName}</p>
                          <p className="mt-1 text-caption text-slate-400">{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${roleMeta[member.role].badge}`}>
                        {roleMeta[member.role].label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{branchName(member.branchId)}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-black text-slate-800">
                        {member.shiftStart}–{member.shiftEnd}
                      </p>
                      <p className="mt-1 text-caption text-slate-400">
                        Hoa hồng {Math.round(member.commissionRate * 1000) / 10}%
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-700">{member.phone || "Chưa có số điện thoại"}</p>
                      <p className="mt-1 truncate text-caption text-slate-400">{member.email || "Chưa có email"}</p>
                    </td>
                    <td className="px-4 py-3.5">{accountBadge(member)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${statusMeta[member.status].badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[member.status].dot}`} />
                        {statusMeta[member.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffId(member.id)}
                        className="border border-slate-200 bg-white px-3 text-caption font-bold text-slate-600 shadow-sm"
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
                <p className="mt-3 text-caption font-black text-slate-600">
                  {staff.length ? "Không tìm thấy nhân sự phù hợp" : "Tiệm chưa có hồ sơ nhân viên nào"}
                </p>
                {staff.length ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 border-0 bg-transparent px-2 text-caption font-bold text-violet-600 shadow-none"
                  >
                    Xóa tìm kiếm và bộ lọc
                  </button>
                ) : (
                  <p className="mt-1 text-caption text-slate-400">
                    Bấm “Thêm nhân viên” để tạo hồ sơ đầu tiên.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {pagedStaff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedStaffId(member.id)}
                className="h-auto min-h-52 border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-caption font-black ${roleMeta[member.role].avatar}`}>
                    {initials(member.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-black text-slate-800">{member.fullName}</p>
                    <p className="mt-1 text-caption text-slate-400">
                      {roleMeta[member.role].label} · {branchName(member.branchId)}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-caption font-bold ring-1 ${statusMeta[member.status].badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[member.status].dot}`} />
                    {statusMeta[member.status].label}
                  </span>
                </div>
                <div className="mt-4 space-y-1.5 text-caption text-slate-500">
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                    Ca {member.shiftStart}–{member.shiftEnd}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {member.phone || "Chưa có số điện thoại"}
                  </p>
                  <p className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                    {member.account
                      ? `Tài khoản ${member.account.email}`
                      : member.role === "RECEPTIONIST"
                        ? "Chưa cấp tài khoản đăng nhập"
                        : "Không cấp tài khoản đăng nhập"}
                  </p>
                </div>
                {member.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {member.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="rounded-md bg-violet-50 px-2 py-1 text-caption font-bold text-violet-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          <Pagination
            id="staff-pagination"
            currentPage={page}
            totalPages={Math.ceil(filteredStaff.length / pageSize) || 1}
            totalItems={filteredStaff.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="hồ sơ"
            variant="violet"
          />
          <div className="mt-2 flex items-center justify-end text-caption text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {selectedBranch === "ALL" ? "Tất cả chi nhánh" : branchName(selectedBranch)}
            </span>
          </div>
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
                <h2 className="text-xs font-black text-slate-900">Nhân sự ngừng hoạt động</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-black text-slate-600 ring-1 ring-slate-200">
                  {inactiveBranchStaff.length}
                </span>
              </div>
              <p className="mt-1 text-caption leading-4 text-slate-500">
                Hồ sơ được giữ lại để tên nhân viên còn hiện đúng trong lịch hẹn và hóa đơn cũ. Không
                chiếm hạn mức nhân sự của gói.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsInactiveSectionExpanded((current) => !current)}
            aria-expanded={isInactiveSectionExpanded}
            aria-controls="inactive-staff-list"
            className="flex h-9 w-fit items-center gap-1.5 border border-slate-200 bg-white px-3 text-caption font-black text-slate-600 shadow-sm"
          >
            {isInactiveSectionExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isInactiveSectionExpanded ? "Thu gọn" : "Mở rộng"}
          </button>
        </div>

        <div id="inactive-staff-list">
          {isInactiveSectionExpanded &&
            (inactiveBranchStaff.length ? (
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                {inactiveBranchStaff.map((member) => (
                  <article
                    key={member.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStaffId(member.id)}
                      className="flex h-auto min-w-0 flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left shadow-none"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-caption font-black text-slate-600">
                        {initials(member.fullName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-caption font-black text-slate-800">{member.fullName}</span>
                        <span className="mt-1 block text-caption text-slate-500">
                          {member.id} · {roleMeta[member.role].label}
                        </span>
                        <span className="mt-1 block text-caption text-slate-400">{branchName(member.branchId)}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffId(member.id)}
                        className="border border-slate-200 bg-white px-3 text-caption font-bold text-slate-600 shadow-sm"
                      >
                        Xem hồ sơ
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusTarget({ staff: member, status: "OFF_SHIFT" })}
                        disabled={!canManage}
                        className="flex items-center gap-1.5 border border-violet-200 bg-violet-50 px-3 text-caption font-black text-violet-700 shadow-sm disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Nhận lại
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <Archive className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-caption font-black text-slate-600">Chưa có hồ sơ ngừng hoạt động</p>
                <p className="mt-1 text-caption text-slate-400">
                  Khi cho một nhân viên nghỉ việc, hồ sơ sẽ tự động chuyển vào đây.
                </p>
              </div>
            ))}
        </div>
      </section>

      {selectedStaff && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Đóng hồ sơ nhân viên"
            onClick={() => setSelectedStaffId(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <aside className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-caption font-black ${roleMeta[selectedStaff.role].avatar}`}>
                  {initials(selectedStaff.fullName)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-black text-slate-900">{selectedStaff.fullName}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-bold ring-1 ${statusMeta[selectedStaff.status].badge}`}>
                      {statusMeta[selectedStaff.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-slate-400">
                    {selectedStaff.id} · {roleMeta[selectedStaff.role].label} · {branchName(selectedStaff.branchId)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffId(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-slate-400">Số điện thoại</dt>
                  <dd className="mt-1 flex items-center gap-2 text-caption font-bold text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {selectedStaff.phone || "Chưa có"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-caption text-slate-400">Email</dt>
                  <dd className="mt-1 flex items-center gap-2 truncate text-caption font-bold text-slate-700">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {selectedStaff.email || "Chưa có"}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-slate-400">Ca làm mặc định</dt>
                  <dd className="mt-1 flex items-center gap-2 text-caption font-bold text-slate-700">
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                    {selectedStaff.shiftStart}–{selectedStaff.shiftEnd}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-slate-400">Hoa hồng dịch vụ</dt>
                  <dd className="mt-1 flex items-center gap-2 text-caption font-bold text-slate-700">
                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                    {Math.round(selectedStaff.commissionRate * 1000) / 10}% doanh thu dịch vụ nhân viên thực hiện
                  </dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-caption font-black uppercase tracking-wide text-slate-400">Kỹ năng chuyên môn</p>
                {selectedStaff.skills.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedStaff.skills.map((skill) => (
                      <span key={skill} className="rounded-md bg-fuchsia-50 px-2 py-1 text-caption font-bold text-fuchsia-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-caption text-slate-400">
                    Chưa ghi nhận kỹ năng. Kỹ năng chỉ để tham khảo khi phân công, hệ thống không cưỡng chế.
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-caption font-black uppercase tracking-wide text-slate-400">Tài khoản đăng nhập</p>
                    {selectedStaff.account ? (
                      <div className="mt-2">
                        <p className="text-caption font-bold text-slate-700">{selectedStaff.account.email}</p>
                        <p className="mt-1 text-caption text-slate-400">
                          {selectedStaff.account.username ? `Tên đăng nhập ${selectedStaff.account.username} · ` : ""}
                          {selectedStaff.account.status === "ACTIVE" ? "Đang hoạt động" : "Đã bị vô hiệu hóa"}
                        </p>
                      </div>
                    ) : selectedStaff.role === "RECEPTIONIST" ? (
                      <p className="mt-2 max-w-md text-caption leading-5 text-slate-500">
                        Hồ sơ này chưa có quyền vào quầy lễ tân. Cấp tài khoản để nhân viên đăng nhập
                        được vào cổng lễ tân.
                      </p>
                    ) : (
                      <p className="mt-2 max-w-md text-caption leading-5 text-slate-500">
                        Chỉ hồ sơ lễ tân mới được cấp tài khoản đăng nhập. Kỹ thuật viên làm việc theo
                        lịch do lễ tân và chủ tiệm phân công.
                      </p>
                    )}
                  </div>
                  {!selectedStaff.account && selectedStaff.role === "RECEPTIONIST" && selectedStaff.status !== "INACTIVE" && (
                    <button
                      type="button"
                      onClick={() => openGrantAccount(selectedStaff)}
                      disabled={!canManage}
                      className="flex h-10 items-center gap-2 border border-violet-200 bg-violet-50 px-4 text-caption font-black text-violet-700 shadow-sm disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Cấp tài khoản đăng nhập
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-caption font-black uppercase tracking-wide text-slate-400">Trạng thái làm việc</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(statusMeta) as StaffStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusTarget({ staff: selectedStaff, status })}
                      disabled={!canManage || selectedStaff.status === status}
                      className={`flex h-9 items-center gap-1.5 border px-3 text-caption font-bold shadow-sm disabled:opacity-45 ${
                        selectedStaff.status === status
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />
                      {status === "INACTIVE" ? "Cho nghỉ việc" : statusMeta[status].label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-caption leading-4 text-slate-400">{statusChangeNotes[selectedStaff.status]}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6">
              <button
                type="button"
                onClick={() => openEdit(selectedStaff)}
                disabled={!canManage}
                className="flex h-11 w-full items-center justify-center gap-2 border border-violet-700 bg-violet-600 px-4 text-caption font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none sm:w-auto"
              >
                <Pencil className="h-3.5 w-3.5" />
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </aside>
        </div>
      )}

      {statusTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng xác nhận đổi trạng thái"
            onClick={() => setStatusTarget(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="staff-status-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-slate-100 p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${statusTarget.status === "INACTIVE" ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-violet-600"}`}>
                {statusTarget.status === "INACTIVE" ? <Archive className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-black uppercase tracking-wide text-slate-400">Đổi trạng thái nhân sự</p>
                <h2 id="staff-status-title" className="mt-1 text-base font-black text-slate-900">
                  {statusTarget.status === "INACTIVE"
                    ? `Cho ${statusTarget.staff.fullName} nghỉ việc?`
                    : `Chuyển sang “${statusMeta[statusTarget.status].label}”?`}
                </h2>
                <p className="mt-1 text-caption font-bold text-slate-500">
                  {statusTarget.staff.fullName} · {branchName(statusTarget.staff.branchId)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                aria-label="Đóng"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>
            <div className="p-5">
              <div className={`rounded-2xl border p-4 ${statusTarget.status === "INACTIVE" ? "border-rose-100 bg-rose-50" : "border-slate-100 bg-slate-50"}`}>
                <p className={`text-caption leading-5 ${statusTarget.status === "INACTIVE" ? "text-rose-700" : "text-slate-600"}`}>
                  {statusChangeNotes[statusTarget.status]}
                </p>
              </div>
              {statusTarget.status !== "INACTIVE" && statusTarget.staff.status === "INACTIVE" && (
                <p className="mt-3 text-caption leading-4 text-slate-500">
                  Nhận lại người cũ vẫn tính vào hạn mức nhân sự của gói. Nếu gói đã đủ chỗ, máy chủ
                  sẽ từ chối và báo lại ngay.
                </p>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={saving}
                className={`flex h-10 items-center gap-2 rounded-xl border px-5 text-caption font-black text-white shadow-lg cursor-pointer transition-colors disabled:opacity-60 ${statusTarget.status === "INACTIVE" ? "border-rose-700 bg-rose-600 hover:bg-rose-700 shadow-rose-100" : "border-violet-700 bg-violet-600 hover:bg-violet-700 shadow-violet-200"}`}
              >
                {saving ? "Đang lưu..." : statusTarget.status === "INACTIVE" ? "Xác nhận cho nghỉ việc" : "Xác nhận đổi trạng thái"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {grantTarget && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng biểu mẫu cấp tài khoản"
            onClick={() => setGrantTarget(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <form
            onSubmit={submitGrantAccount}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-base font-black text-slate-900">Cấp tài khoản đăng nhập</h2>
                <p className="mt-1 text-caption text-slate-500">
                  {grantTarget.fullName} · {roleMeta[grantTarget.role].label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGrantTarget(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {formError && (
                <div className="rounded-xl bg-rose-50 p-3 text-caption font-bold text-rose-700">{formError}</div>
              )}
              <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <p className="text-caption leading-4 text-violet-700">
                  Mật khẩu do máy chủ sinh và chỉ hiện <b>đúng một lần</b> ngay sau khi cấp. Hệ thống
                  không gửi email và không có đường đọc lại.
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-caption font-bold text-slate-600">Email đăng nhập *</span>
                <input
                  type="email"
                  value={grantForm.email}
                  onChange={(event) => setGrantForm((current) => ({ ...current, email: event.target.value }))}
                  className={fieldErrors.email ? errorInputClass : inputClass}
                  placeholder="letan@naile.vn"
                />
                {fieldErrors.email && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.email}</span>}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-caption font-bold text-slate-600">Tên đăng nhập</span>
                  <input
                    value={grantForm.username}
                    onChange={(event) => setGrantForm((current) => ({ ...current, username: event.target.value }))}
                    className={fieldErrors.username ? errorInputClass : inputClass}
                    placeholder="Không bắt buộc"
                  />
                  {fieldErrors.username && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.username}</span>}
                </label>
                <label>
                  <span className="mb-1.5 block text-caption font-bold text-slate-600">Tên hiển thị</span>
                  <input
                    value={grantForm.displayName}
                    onChange={(event) => setGrantForm((current) => ({ ...current, displayName: event.target.value }))}
                    className={fieldErrors.displayName ? errorInputClass : inputClass}
                  />
                  {fieldErrors.displayName && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.displayName}</span>}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setGrantTarget(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-xl border border-violet-700 bg-violet-600 px-5 text-caption font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 cursor-pointer transition-colors disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {saving ? "Đang cấp..." : "Cấp tài khoản"}
              </button>
            </div>
          </form>
        </div>
      )}

      {grantedPassword && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="granted-password-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-slate-100 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-black uppercase tracking-wide text-slate-400">Đã cấp tài khoản</p>
                <h2 id="granted-password-title" className="mt-1 text-base font-black text-slate-900">
                  {grantedPassword.staffName} đăng nhập được ngay
                </h2>
              </div>
            </header>
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-caption font-black text-amber-800">Chép mật khẩu trước khi đóng</p>
                <p className="mt-1 text-caption leading-4 text-amber-700">
                  Đây là lần duy nhất chuỗi này hiện ra. Đóng hộp thoại là không đọc lại được — muốn có
                  mật khẩu khác thì phải cấp lại tài khoản.
                </p>
              </div>
              <div>
                <p className="text-caption text-slate-400">Email đăng nhập</p>
                <p className="mt-1 text-caption font-bold text-slate-700">{grantedPassword.email}</p>
              </div>
              <div>
                <p className="text-caption text-slate-400">Mật khẩu</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-body font-black tracking-wider text-white">
                    {grantedPassword.password}
                  </code>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="flex h-12 w-12 items-center justify-center border border-slate-200 bg-white p-0 text-slate-600 shadow-sm"
                    aria-label="Sao chép mật khẩu"
                  >
                    {passwordCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {passwordCopied && <p className="mt-1 text-caption font-bold text-emerald-600">Đã chép vào clipboard.</p>}
              </div>
            </div>
            <footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setNotice(`Đã cấp tài khoản đăng nhập cho ${grantedPassword.staffName}.`);
                  setGrantedPassword(null);
                }}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-5 text-caption font-black text-white shadow-lg cursor-pointer transition-colors hover:bg-slate-800"
              >
                Tôi đã lưu mật khẩu
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
                  {formMode === "CREATE" ? "Thêm nhân viên mới" : `Chỉnh sửa ${selectedStaffId}`}
                </h2>
                <p className="mt-1 text-caption text-slate-500">
                  Hồ sơ, chi nhánh, vai trò và ca làm cố định của nhân viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormMode(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div className="rounded-xl bg-rose-50 p-3 text-caption font-bold text-rose-700">{formError}</div>
              )}
              <fieldset>
                <legend className="mb-3 flex items-center gap-2 text-caption font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <UserRound className="h-3.5 w-3.5" />
                  </span>
                  Thông tin liên hệ
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Họ và tên *</span>
                    <input
                      value={form.fullName}
                      onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                      className={fieldErrors.fullName ? errorInputClass : inputClass}
                      placeholder="Nguyễn Minh Anh"
                    />
                    {fieldErrors.fullName && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.fullName}</span>}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Số điện thoại</span>
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      className={fieldErrors.phone ? errorInputClass : inputClass}
                      placeholder="09xx xxx xxx"
                    />
                    {fieldErrors.phone && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.phone}</span>}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Email công việc</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className={fieldErrors.email ? errorInputClass : inputClass}
                      placeholder="ten@naile.vn"
                    />
                    {fieldErrors.email && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.email}</span>}
                  </label>
                </div>
                <p className="mt-2 text-caption leading-4 text-slate-400">
                  Email trên hồ sơ được dùng làm email đăng nhập mặc định khi cấp tài khoản lễ tân.
                </p>
              </fieldset>

              <fieldset className="border-t border-slate-100 pt-5">
                <legend className="mb-3 flex items-center gap-2 text-caption font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <UserCog className="h-3.5 w-3.5" />
                  </span>
                  Công việc
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Chi nhánh *</span>
                    <BeautifulSelect
                      value={form.branchId}
                      onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                      className={fieldErrors.branchId ? errorInputClass : inputClass}
                    >
                      <option value="">— Chọn chi nhánh —</option>
                      {assignableBranches.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </BeautifulSelect>
                    {fieldErrors.branchId && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.branchId}</span>}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Vai trò *</span>
                    <BeautifulSelect
                      value={form.role}
                      onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as StaffRole }))}
                      className={fieldErrors.role ? errorInputClass : inputClass}
                    >
                      {Object.entries(roleMeta).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </BeautifulSelect>
                    {fieldErrors.role && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.role}</span>}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Bắt đầu ca *</span>
                    <input
                      type="time"
                      value={form.shiftStart}
                      onChange={(event) => setForm((current) => ({ ...current, shiftStart: event.target.value }))}
                      className={fieldErrors.shiftStart ? errorInputClass : inputClass}
                    />
                    {fieldErrors.shiftStart && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.shiftStart}</span>}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Kết thúc ca *</span>
                    <input
                      type="time"
                      value={form.shiftEnd}
                      onChange={(event) => setForm((current) => ({ ...current, shiftEnd: event.target.value }))}
                      className={fieldErrors.shiftEnd ? errorInputClass : inputClass}
                    />
                    {fieldErrors.shiftEnd && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.shiftEnd}</span>}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-caption font-bold text-slate-600">Hoa hồng dịch vụ (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.commissionPercent}
                      onChange={(event) => setForm((current) => ({ ...current, commissionPercent: event.target.value }))}
                      className={fieldErrors.commissionRate ? errorInputClass : inputClass}
                    />
                    {fieldErrors.commissionRate && <span className="mt-1 block text-caption font-bold text-rose-600">{fieldErrors.commissionRate}</span>}
                  </label>
                </div>
                {formMode === "EDIT" && (
                  <p className="mt-2 text-caption leading-4 text-slate-400">
                    Trạng thái làm việc đổi ở ngăn hồ sơ, không đổi trong biểu mẫu này — để việc cho một
                    người nghỉ việc không bao giờ xảy ra như tác dụng phụ của một lần sửa tên.
                  </p>
                )}
              </fieldset>

              <fieldset className="border-t border-slate-100 pt-5">
                <legend className="mb-3 flex items-center gap-2 text-caption font-black text-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  Kỹ năng chuyên môn
                </legend>
                <div className="flex gap-2">
                  <input
                    value={skillDraft}
                    onChange={(event) => setSkillDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      addSkill();
                    }}
                    className={inputClass}
                    placeholder="Sơn gel, đắp bột, vẽ nail..."
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="h-11 shrink-0 border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm"
                  >
                    Thêm
                  </button>
                </div>
                {form.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {form.skills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1.5 rounded-md bg-fuchsia-50 px-2 py-1 text-caption font-bold text-fuchsia-700"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              skills: current.skills.filter((item) => item !== skill),
                            }))
                          }
                          aria-label={`Bỏ kỹ năng ${skill}`}
                          className="flex h-4 w-4 items-center justify-center border-0 bg-transparent p-0 text-fuchsia-500 shadow-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-caption leading-4 text-slate-400">
                  Kỹ năng chỉ để tham khảo khi phân công. Hệ thống không chặn việc gán một kỹ thuật
                  viên cho dịch vụ ngoài danh sách này.
                </p>
              </fieldset>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-caption font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-xl border border-violet-700 bg-violet-600 px-5 text-caption font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 cursor-pointer transition-colors disabled:opacity-60"
              >
                <UserCog className="h-4 w-4" />
                {saving ? "Đang lưu..." : formMode === "CREATE" ? "Tạo hồ sơ" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
