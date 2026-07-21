import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Megaphone,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import BeautifulSelect from "./BeautifulSelect";

type CampaignType = "REMINDER" | "REVIEW" | "REBOOK" | "WINBACK" | "BROADCAST";
type CampaignStatus = "AUTOMATED" | "ACTIVE" | "DRAFT" | "PAUSED" | "COMPLETED";
type Channel = "ZALO" | "SMS" | "EMAIL";
type BranchScope = "ALL" | "Q1" | "Q3";
type CareAction = "PAUSE" | "DELETE";
interface CareCampaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  branch: BranchScope;
  channels: Channel[];
  audience: string;
  trigger: string;
  schedule: string;
  message: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  appointments: number;
  revenue: number;
  budget: number;
  owner: string;
  steps: string[];
  audit: string[];
  note?: string;
  userCreated?: boolean;
}
interface TenantAdminCustomerCareProps {
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

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + "đ";
const typeMeta: Record<
  CampaignType,
  { label: string; icon: typeof Send; badge: string }
> = {
  REMINDER: {
    label: "Nhắc lịch",
    icon: BellRing,
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  REVIEW: {
    label: "Xin đánh giá",
    icon: Star,
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  REBOOK: {
    label: "Nhắc đặt lại",
    icon: CalendarCheck2,
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  WINBACK: {
    label: "Mời quay lại",
    icon: UsersRound,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  BROADCAST: {
    label: "Thông báo",
    icon: Megaphone,
    badge: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  },
};
const statusMeta: Record<
  CampaignStatus,
  { label: string; badge: string; dot: string }
> = {
  AUTOMATED: {
    label: "Tự động",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  ACTIVE: {
    label: "Đang chạy",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    dot: "bg-violet-500",
  },
  DRAFT: {
    label: "Bản nháp",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  },
  PAUSED: {
    label: "Tạm dừng",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  COMPLETED: {
    label: "Đã kết thúc",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
};
const channelMeta: Record<Channel, { label: string; className: string }> = {
  ZALO: { label: "Zalo", className: "bg-blue-50 text-blue-700" },
  SMS: { label: "SMS", className: "bg-emerald-50 text-emerald-700" },
  EMAIL: { label: "Email", className: "bg-violet-50 text-violet-700" },
};
const seed: CareCampaign[] = [
  {
    id: "CRM-101",
    name: "Nhắc lịch trước 24 giờ",
    type: "REMINDER",
    status: "AUTOMATED",
    branch: "ALL",
    channels: ["ZALO", "SMS"],
    audience: "Khách có lịch đã xác nhận ngày mai",
    trigger: "Trước lịch hẹn 24 giờ",
    schedule: "Tự động mỗi 15 phút",
    message:
      "Chào {{customer_name}}, Nailé Studio nhắc bạn có lịch {{service}} lúc {{appointment_time}} ngày mai. Vui lòng bấm xác nhận hoặc liên hệ salon nếu cần đổi lịch.",
    sent: 428,
    delivered: 425,
    opened: 387,
    clicked: 206,
    appointments: 394,
    revenue: 0,
    budget: 420000,
    owner: "Hệ thống",
    steps: [
      "Lấy lịch đã xác nhận trong 24 giờ tới",
      "Kiểm tra quyền nhận Zalo/SMS",
      "Gửi Zalo; dự phòng SMS nếu thất bại",
      "Cập nhật xác nhận vào lịch hẹn",
    ],
    audit: [
      "15:12 · Đã xử lý 18 lịch mới",
      "14:45 · 17/18 tin gửi thành công",
      "01/07 · Tenant Admin duyệt mẫu NTF-APT-01",
    ],
  },
  {
    id: "CRM-102",
    name: "Cảm ơn & xin đánh giá",
    type: "REVIEW",
    status: "AUTOMATED",
    branch: "ALL",
    channels: ["ZALO"],
    audience: "Khách vừa hoàn thành dịch vụ",
    trigger: "Sau khi hoàn thành 2 giờ",
    schedule: "Theo sự kiện thanh toán",
    message:
      "Cảm ơn {{customer_name}} đã ghé Nailé Studio. Bạn dành 30 giây đánh giá trải nghiệm hôm nay nhé. Phản hồi của bạn giúp chúng tôi phục vụ tốt hơn.",
    sent: 386,
    delivered: 381,
    opened: 347,
    clicked: 188,
    appointments: 0,
    revenue: 0,
    budget: 0,
    owner: "Hệ thống",
    steps: [
      "Nhận sự kiện hoàn tất thanh toán",
      "Loại khách đã đánh giá trong 30 ngày",
      "Gửi lời cảm ơn kèm đường dẫn đánh giá",
      "Chuyển đánh giá dưới 4 sao vào hàng đợi xử lý",
    ],
    audit: [
      "14:18 · Nhận thêm 6 đánh giá",
      "12:10 · Chuyển 1 đánh giá 3 sao cho quản lý",
      "01/07 · Kích hoạt luồng tự động",
    ],
  },
  {
    id: "CRM-103",
    name: "Nhắc làm lại Gel sau 21 ngày",
    type: "REBOOK",
    status: "ACTIVE",
    branch: "ALL",
    channels: ["ZALO", "EMAIL"],
    audience: "Khách làm Gel từ 18–24 ngày trước",
    trigger: "Ngày thứ 21 sau dịch vụ",
    schedule: "09:30 hằng ngày",
    message:
      "Bộ Gel của {{customer_name}} đã đến thời điểm chăm sóc lại. Đặt lịch trong tuần này để nhận kiểm tra tình trạng móng miễn phí.",
    sent: 214,
    delivered: 211,
    opened: 178,
    clicked: 72,
    appointments: 60,
    revenue: 28400000,
    budget: 1800000,
    owner: "Lê Hoàng Nam",
    steps: [
      "Chọn khách làm Gel đủ 21 ngày",
      "Loại khách đã có lịch sắp tới",
      "Gửi ưu tiên Zalo và email",
      "Gắn nguồn chiến dịch khi khách đặt lại",
    ],
    audit: [
      "19/07 · Ghi nhận thêm 4 lịch đặt lại",
      "15/07 · Tăng cửa sổ đối tượng lên 18–24 ngày",
      "05/07 · Tenant Admin phê duyệt",
    ],
  },
  {
    id: "CRM-104",
    name: "Quay lại cùng ưu đãi 15%",
    type: "WINBACK",
    status: "ACTIVE",
    branch: "Q3",
    channels: ["SMS", "EMAIL"],
    audience: "Khách vắng mặt trên 45 ngày",
    trigger: "Không phát sinh lịch trong 45 ngày",
    schedule: "Thứ Ba · 10:00",
    message:
      "Nailé Studio nhớ bạn! Đặt lịch quay lại trước 25/07 để nhận ưu đãi 15% cho dịch vụ Nail yêu thích.",
    sent: 38,
    delivered: 38,
    opened: 29,
    clicked: 12,
    appointments: 7,
    revenue: 4800000,
    budget: 720000,
    owner: "Yến Nhi",
    steps: [
      "Lọc khách vắng trên 45 ngày",
      "Kiểm tra đồng ý nhận ưu đãi",
      "Cấp voucher WINBACK15",
      "Gửi SMS và email",
      "Theo dõi lịch phát sinh trong 14 ngày",
    ],
    audit: [
      "18/07 · 7 khách đã sử dụng ưu đãi",
      "16/07 · Yến Nhi liên hệ thủ công 4 khách VIP",
      "10/07 · Kích hoạt chiến dịch",
    ],
  },
  {
    id: "CRM-105",
    name: "Bộ sưu tập Summer Chrome",
    type: "BROADCAST",
    status: "DRAFT",
    branch: "ALL",
    channels: ["EMAIL", "ZALO"],
    audience: "Khách VIP và Thân thiết",
    trigger: "Gửi theo lịch chiến dịch",
    schedule: "20/07/2026 · 09:00",
    message:
      "Khám phá 12 mẫu Summer Chrome mới tại Nailé Studio. Thành viên VIP và Thân thiết được tặng Nail Art 2 ngón khi đặt lịch trong tuần ra mắt.",
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    appointments: 0,
    revenue: 0,
    budget: 4000000,
    owner: "Hà My",
    steps: [
      "Chốt danh sách 398 khách đủ điều kiện",
      "Kiểm tra quyền nhận tin",
      "Tenant Admin duyệt nội dung và ngân sách",
      "Gửi đồng loạt theo lịch",
    ],
    note: "Đang chờ duyệt ngân sách và kiểm tra liên kết bộ sưu tập.",
    audit: [
      "19/07 · Hà My gửi yêu cầu phê duyệt",
      "18/07 · Hoàn thiện nội dung và nhóm khách",
    ],
  },
  {
    id: "CRM-099",
    name: "Ưu đãi khai trương Quận 1",
    type: "BROADCAST",
    status: "COMPLETED",
    branch: "Q1",
    channels: ["ZALO", "SMS", "EMAIL"],
    audience: "Khách trong bán kính 5km",
    trigger: "Chiến dịch một lần",
    schedule: "01/07/2026 · 08:30",
    message:
      "Nailé Studio Quận 1 chính thức khai trương. Đặt lịch tuần đầu để nhận ưu đãi đặc biệt dành cho khách hàng gần chi nhánh.",
    sent: 612,
    delivered: 603,
    opened: 486,
    clicked: 144,
    appointments: 86,
    revenue: 42600000,
    budget: 6200000,
    owner: "Tenant Admin",
    steps: ["Hoàn tất chiến dịch"],
    audit: [
      "08/07 · Kết thúc và chốt báo cáo",
      "01/07 · Gửi thành công đến 603 khách",
    ],
  },
];

export default function TenantAdminCustomerCare({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  onSelectedBranchChange,
  tenantName = "Nailé Studio",
  roleLabel = "Owner · Tenant Admin",
  accessMode = "full",
  readOnlyReason = "",
  onNotify,
}: TenantAdminCustomerCareProps) {
  const storageKey = `tenant-admin-customer-care-v1:${tenantName}`;
  const [campaigns, setCampaigns] = useState<CareCampaign[]>(() => {
    if (typeof window === "undefined") return seed;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as CareCampaign[]) : seed;
    } catch {
      return seed;
    }
  });
  const [typeFilter, setTypeFilter] = useState<"ALL" | CampaignType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CampaignStatus>(
    "ALL",
  );
  const [selected, setSelected] = useState<CareCampaign | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: CareAction;
    campaign: CareCampaign;
    blockers?: string[];
  } | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "BROADCAST" as CampaignType,
    branch: "ALL" as BranchScope,
    channels: ["ZALO"] as Channel[],
    audience: "",
    trigger: "",
    schedule: "",
    message: "",
    budget: "",
  });
  const canManage = accessMode === "full" && !readOnlyReason;
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(campaigns));
  }, [campaigns, storageKey]);
  useEffect(() => {
    if (!selected && !formOpen && !templatesOpen && !pendingAction) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pendingAction) setPendingAction(null);
        else {
          setSelected(null);
          setFormOpen(false);
          setTemplatesOpen(false);
        }
      }
    };
    addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener("keydown", close);
    };
  }, [formOpen, pendingAction, selected, templatesOpen]);
  const requireManage = () => {
    if (canManage) return true;
    onNotify?.(
      readOnlyReason ||
        "Gói hiện tại chỉ cho phép xem hoạt động chăm sóc khách.",
    );
    return false;
  };
  const scoped = campaigns.filter(
    (campaign) =>
      selectedBranch === "ALL" ||
      campaign.branch === "ALL" ||
      campaign.branch === selectedBranch,
  );
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return campaigns
      .filter(
        (campaign) =>
          selectedBranch === "ALL" ||
          campaign.branch === "ALL" ||
          campaign.branch === selectedBranch,
      )
      .filter(
        (campaign) => typeFilter === "ALL" || campaign.type === typeFilter,
      )
      .filter(
        (campaign) =>
          statusFilter === "ALL" || campaign.status === statusFilter,
      )
      .filter(
        (campaign) =>
          !query ||
          `${campaign.id} ${campaign.name} ${campaign.audience} ${campaign.message}`
            .toLowerCase()
            .includes(query),
      );
  }, [campaigns, searchQuery, selectedBranch, statusFilter, typeFilter]);
  const totalSent = scoped.reduce((sum, item) => sum + item.sent, 0);
  const totalOpened = scoped.reduce((sum, item) => sum + item.opened, 0);
  const totalAppointments = scoped.reduce(
    (sum, item) => sum + item.appointments,
    0,
  );
  const totalRevenue = scoped.reduce((sum, item) => sum + item.revenue, 0);
  const openCreate = () => {
    if (!requireManage()) return;
    setForm({
      name: "",
      type: "BROADCAST",
      branch:
        selectedBranch === "Q1" ? "Q1" : selectedBranch === "Q3" ? "Q3" : "ALL",
      channels: ["ZALO"],
      audience: "",
      trigger: "",
      schedule: "",
      message: "",
      budget: "",
    });
    setFormError("");
    setFormOpen(true);
  };
  const toggleChannel = (channel: Channel) =>
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.audience.trim() ||
      !form.schedule.trim() ||
      form.message.trim().length < 20 ||
      !form.channels.length
    ) {
      setFormError(
        "Vui lòng nhập tên, đối tượng, lịch gửi, nội dung tối thiểu 20 ký tự và chọn ít nhất một kênh.",
      );
      return;
    }
    const campaign: CareCampaign = {
      id: `CRM-${Date.now().toString().slice(-3)}`,
      name: form.name.trim(),
      type: form.type,
      status: "DRAFT",
      branch: form.branch,
      channels: form.channels,
      audience: form.audience.trim(),
      trigger: form.trigger.trim() || "Chiến dịch một lần",
      schedule: form.schedule.trim(),
      message: form.message.trim(),
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      appointments: 0,
      revenue: 0,
      budget: Number(form.budget) || 0,
      owner: roleLabel,
      steps: [
        "Kiểm tra nhóm khách và quyền nhận tin",
        "Tenant Admin duyệt nội dung",
        "Gửi theo lịch đã cấu hình",
        "Đo lường kết quả trong 14 ngày",
      ],
      audit: [`15:18 · Tạo bản nháp bởi ${roleLabel}`],
      userCreated: true,
    };
    setCampaigns((current) => [campaign, ...current]);
    setFormOpen(false);
    setSelected(campaign);
    onNotify?.(`Đã tạo bản nháp “${campaign.name}”.`);
  };
  const changeStatus = (campaign: CareCampaign, status: CampaignStatus) => {
    if (!requireManage()) return;
    const patch: Partial<CareCampaign> = {
      status,
      audit: [
        `15:20 · ${roleLabel} chuyển trạng thái sang ${statusMeta[status].label}`,
        ...campaign.audit,
      ],
    };
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaign.id ? { ...item, ...patch } : item,
      ),
    );
    setSelected((current) =>
      current?.id === campaign.id
        ? ({ ...current, ...patch } as CareCampaign)
        : current,
    );
    onNotify?.(`Đã cập nhật ${campaign.name}.`);
  };
  const duplicateCampaign = (campaign: CareCampaign) => {
    if (!requireManage()) return;
    const copy: CareCampaign = {
      ...campaign,
      id: `CRM-${Date.now().toString().slice(-3)}`,
      name: `${campaign.name} · Bản sao`,
      status: "DRAFT",
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      appointments: 0,
      revenue: 0,
      audit: [`15:22 · Sao chép bởi ${roleLabel}`],
      userCreated: true,
    };
    setCampaigns((current) => [copy, ...current]);
    setSelected(copy);
    onNotify?.("Đã sao chép chiến dịch thành bản nháp.");
  };
  const isNewCampaign = (campaign: CareCampaign) =>
    campaign.userCreated === true ||
    campaign.audit.some(
      (entry) =>
        entry.includes("Tạo bản nháp bởi") || entry.includes("Sao chép bởi"),
    );
  const hasNoCampaignActivity = (campaign: CareCampaign) =>
    campaign.sent === 0 &&
    campaign.delivered === 0 &&
    campaign.opened === 0 &&
    campaign.clicked === 0 &&
    campaign.appointments === 0 &&
    campaign.revenue === 0;
  const canDeleteCampaign = (campaign: CareCampaign) =>
    hasNoCampaignActivity(campaign) &&
    (campaign.status === "DRAFT" || isNewCampaign(campaign));
  const requestAction = (type: CareAction, campaign: CareCampaign) => {
    if (!requireManage()) return;
    setPauseReason("");
    setDeleteConfirmation("");
    if (type === "PAUSE") {
      setPendingAction({ type, campaign });
      return;
    }
    const blockers = [
      campaign.status !== "DRAFT" && !isNewCampaign(campaign)
        ? "Chỉ bản nháp hoặc chiến dịch vừa tạo mới được xóa."
        : "",
      campaign.sent > 0 || campaign.delivered > 0
        ? `Chiến dịch đã gửi ${campaign.sent} tin và ghi nhận ${campaign.delivered} tin thành công.`
        : "",
      campaign.opened > 0 || campaign.clicked > 0
        ? "Chiến dịch đã phát sinh dữ liệu mở hoặc nhấp vào nội dung."
        : "",
      campaign.appointments > 0 || campaign.revenue > 0
        ? "Chiến dịch đã tạo lịch hẹn hoặc doanh thu cần được giữ lại để đối soát."
        : "",
    ].filter(Boolean);
    setPendingAction({ type, campaign, blockers });
  };
  const pauseCampaign = (campaign: CareCampaign) => {
    const reason = pauseReason.trim();
    if (!reason) return;
    const patch: Partial<CareCampaign> = {
      status: "PAUSED",
      note: reason,
      audit: [`15:24 · ${roleLabel} tạm dừng: ${reason}`, ...campaign.audit],
    };
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaign.id ? { ...item, ...patch } : item,
      ),
    );
    setSelected((current) =>
      current?.id === campaign.id
        ? ({ ...current, ...patch } as CareCampaign)
        : current,
    );
    setPendingAction(null);
    setPauseReason("");
    onNotify?.(`Đã tạm dừng “${campaign.name}” và lưu lý do.`);
  };
  const deleteCampaign = (campaign: CareCampaign) => {
    if (
      !canDeleteCampaign(campaign) ||
      deleteConfirmation.trim().toUpperCase() !== "XÓA"
    )
      return;
    setCampaigns((current) =>
      current.filter((item) => item.id !== campaign.id),
    );
    setSelected(null);
    setPendingAction(null);
    setDeleteConfirmation("");
    onNotify?.(`Đã xóa vĩnh viễn chiến dịch “${campaign.name}”.`);
  };
  const exportReport = () => {
    const header =
      "Ma,Chien dich,Loai,Kenh,Da gui,Da mo,Lich tao,Doanh thu,Trang thai";
    const body = filtered
      .map((item) =>
        [
          item.id,
          item.name,
          typeMeta[item.type].label,
          item.channels.join("+"),
          item.sent,
          item.opened,
          item.appointments,
          item.revenue,
          statusMeta[item.status].label,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bao-cao-cham-soc-khach.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    onNotify?.("Đã xuất báo cáo chăm sóc khách hàng.");
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-violet-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            CRM đa kênh · Cập nhật 15:12
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{tenantName}</span>
          </div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Chăm sóc khách hàng
          </h1>
          <p className="mt-2 text-[11px] text-slate-500">
            Tự động nhắc lịch, xin đánh giá, mời quay lại và đo lường doanh thu
            từ từng chiến dịch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportReport}
            className="flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </button>
          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            className="flex h-11 items-center gap-2 border border-violet-200 bg-violet-50 px-4 text-[9px] font-black text-violet-700 shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Mẫu tin nhắn
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!canManage}
            className="flex h-11 items-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[9px] font-black text-white shadow-lg shadow-violet-200 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
          >
            <Plus className="h-4 w-4" />
            Tạo chiến dịch
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
                ? "Được tạo/phê duyệt chiến dịch, cấu hình tự động, sử dụng mẫu tin và xem hiệu quả trong tenant; chỉ liên hệ khách đã đồng ý kênh tương ứng."
                : readOnlyReason || "Chỉ được xem chiến dịch và báo cáo CRM."}
            </p>
          </div>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-[8px] font-black ring-1 ${canManage ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-100 text-amber-800 ring-amber-200"}`}
        >
          {canManage ? "Toàn quyền CRM tenant" : "Chỉ xem"}
        </span>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tin nhắn trong kỳ",
            value: totalSent.toLocaleString("vi-VN"),
            detail: `${Math.round((scoped.reduce((sum, item) => sum + item.delivered, 0) / Math.max(1, totalSent)) * 100)}% gửi thành công`,
            icon: Send,
            tone: "bg-blue-50 text-blue-600",
          },
          {
            label: "Tỷ lệ mở",
            value: `${Math.round((totalOpened / Math.max(1, totalSent)) * 100)}%`,
            detail: "Zalo đang là kênh hiệu quả nhất",
            icon: Mail,
            tone: "bg-violet-50 text-violet-600",
          },
          {
            label: "Lịch tạo lại",
            value: totalAppointments,
            detail: `Doanh thu quy đổi ${money(totalRevenue)}`,
            icon: CalendarCheck2,
            tone: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Cần xử lý",
            value: 38,
            detail: "Khách vắng 45 ngày · 3 phản hồi thấp",
            icon: AlertCircle,
            tone: "bg-amber-50 text-amber-600",
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold text-slate-500">{label}</p>
                <p className="mt-1.5 text-lg font-black tracking-tight text-slate-950">
                  {value}
                </p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-2 text-[8px] font-semibold text-slate-400">
              {detail}
            </p>
          </article>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Tìm chiến dịch, đối tượng, nội dung..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[10px] font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
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
            <div className="flex flex-wrap gap-2">
              <BeautifulSelect
                value={selectedBranch}
                onChange={(event) => onSelectedBranchChange(event.target.value)}
                className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                <option value="Q3">Chi nhánh Quận 3</option>
                <option value="Q1">Chi nhánh Quận 1</option>
              </BeautifulSelect>
              <BeautifulSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | CampaignStatus)
                }
                className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold"
              >
                <option value="ALL">Mọi trạng thái</option>
                {Object.entries(statusMeta).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </BeautifulSelect>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            {(
              [
                "ALL",
                "REMINDER",
                "REVIEW",
                "REBOOK",
                "WINBACK",
                "BROADCAST",
              ] as const
            ).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`h-8 shrink-0 border px-3 text-[8px] font-black shadow-sm ${typeFilter === value ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500"}`}
              >
                {value === "ALL" ? "Tất cả chiến dịch" : typeMeta[value].label}
                <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[7px]">
                  {value === "ALL"
                    ? scoped.length
                    : scoped.filter((item) => item.type === value).length}
                </span>
              </button>
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((campaign) => {
              const meta = typeMeta[campaign.type];
              const Icon = meta.icon;
              const openRate = Math.round(
                (campaign.opened / Math.max(1, campaign.sent)) * 100,
              );
              return (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelected(campaign)}
                  className="group block h-auto w-full rounded-none border-0 bg-white p-4 text-left shadow-none hover:bg-slate-50 sm:p-5"
                >
                  <span className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.badge}`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-slate-900">
                          {campaign.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[7px] font-bold ring-1 ${statusMeta[campaign.status].badge}`}
                        >
                          {statusMeta[campaign.status].label}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-[8px] text-slate-400">
                        {campaign.id} · {campaign.audience}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {campaign.channels.map((channel) => (
                          <span
                            key={channel}
                            className={`rounded-md px-2 py-1 text-[7px] font-bold ${channelMeta[channel].className}`}
                          >
                            {channelMeta[channel].label}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="grid shrink-0 grid-cols-3 gap-4 sm:w-[300px]">
                      <span>
                        <span className="block text-[7px] text-slate-400">
                          Đã gửi
                        </span>
                        <span className="mt-1 block text-[10px] font-black text-slate-800">
                          {campaign.sent}
                        </span>
                      </span>
                      <span>
                        <span className="block text-[7px] text-slate-400">
                          Tỷ lệ mở
                        </span>
                        <span className="mt-1 block text-[10px] font-black text-slate-800">
                          {openRate}%
                        </span>
                      </span>
                      <span>
                        <span className="block text-[7px] text-slate-400">
                          Lịch tạo
                        </span>
                        <span className="mt-1 block text-[10px] font-black text-emerald-700">
                          {campaign.appointments}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 sm:block" />
                  </span>
                </button>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="py-16 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-[10px] font-black text-slate-600">
                Không có chiến dịch phù hợp
              </p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-[8px] text-slate-400">
              Hiển thị{" "}
              <strong className="text-slate-600">{filtered.length}</strong>{" "}
              chiến dịch
            </p>
            <p className="text-[8px] font-semibold text-slate-400">
              Doanh thu quy đổi:{" "}
              {money(filtered.reduce((sum, item) => sum + item.revenue, 0))}
            </p>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">
                  Hàng đợi chăm sóc
                </p>
                <p className="mt-2 text-lg font-black">62 khách cần xử lý</p>
                <p className="mt-1 text-[8px] text-slate-400">
                  Ưu tiên theo tín hiệu và giá trị
                </p>
              </div>
              <Zap className="h-5 w-5 text-amber-300" />
            </div>
            <div className="mt-4 space-y-2">
              {[
                {
                  label: "Vắng trên 45 ngày",
                  value: 38,
                  tone: "bg-amber-400/15 text-amber-300",
                },
                {
                  label: "Sinh nhật trong 7 ngày",
                  value: 12,
                  tone: "bg-violet-400/15 text-violet-300",
                },
                {
                  label: "Đánh giá dưới 4 sao",
                  value: 3,
                  tone: "bg-rose-400/15 text-rose-300",
                },
                {
                  label: "Hồ sơ thiếu liên hệ",
                  value: 9,
                  tone: "bg-blue-400/15 text-blue-300",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl bg-white/7 p-3"
                >
                  <span className="text-[8px] font-bold text-slate-300">
                    {item.label}
                  </span>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[8px] font-black ${item.tone}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                canManage
                  ? onNotify?.(
                      "Đã mở danh sách khách cần chăm sóc theo mức ưu tiên.",
                    )
                  : requireManage()
              }
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-white/10 bg-white/8 text-[8px] font-black text-white shadow-none"
            >
              <UsersRound className="h-3.5 w-3.5" />
              Mở danh sách xử lý
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-800">
                  Hiệu quả theo kênh
                </p>
                <p className="mt-1 text-[8px] text-slate-400">
                  Tỷ lệ mở trung bình
                </p>
              </div>
              <BarChart3 className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "Zalo", value: 88, tone: "bg-blue-500" },
                { label: "SMS", value: 74, tone: "bg-emerald-500" },
                { label: "Email", value: 36, tone: "bg-violet-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex justify-between text-[8px]">
                    <span className="font-bold text-slate-600">
                      {item.label}
                    </span>
                    <span className="font-black text-slate-700">
                      {item.value}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.tone}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Đóng chi tiết chiến dịch"
            onClick={() => setSelected(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-detail-title"
            className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wide text-violet-600">
                    {selected.id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${typeMeta[selected.type].badge}`}
                  >
                    {typeMeta[selected.type].label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[8px] font-bold ring-1 ${statusMeta[selected.status].badge}`}
                  >
                    {statusMeta[selected.status].label}
                  </span>
                </div>
                <h2
                  id="care-detail-title"
                  className="mt-2 text-xl font-black text-slate-950"
                >
                  {selected.name}
                </h2>
                <p className="mt-1 text-[9px] text-slate-400">
                  {selected.schedule} ·{" "}
                  {selected.branch === "ALL"
                    ? "Toàn tenant"
                    : `Chi nhánh ${selected.branch}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-[#171328] to-[#2b2050] p-5 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-300">
                          Phễu chiến dịch
                        </p>
                        <p className="mt-2 text-xl font-black">
                          {selected.audience}
                        </p>
                        <p className="mt-2 text-[9px] text-slate-400">
                          Kích hoạt: {selected.trigger}
                        </p>
                      </div>
                      <Target className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div className="mt-5 grid grid-cols-4 gap-2">
                      {[
                        { label: "Đã gửi", value: selected.sent },
                        { label: "Đã mở", value: selected.opened },
                        { label: "Đã bấm", value: selected.clicked },
                        { label: "Đặt lịch", value: selected.appointments },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl bg-white/7 p-3"
                        >
                          <p className="text-[7px] text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-1 text-[12px] font-black">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-800">
                          Hiệu quả chuyển đổi
                        </p>
                        <p className="mt-1 text-[8px] text-slate-400">
                          Ghi nhận trong phạm vi phân bổ chiến dịch
                        </p>
                      </div>
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-blue-50 p-3">
                        <p className="text-[7px] text-blue-600">Tỷ lệ mở</p>
                        <p className="mt-1 text-[11px] font-black text-blue-800">
                          {Math.round(
                            (selected.opened / Math.max(1, selected.sent)) *
                              100,
                          )}
                          %
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-[7px] text-emerald-600">Doanh thu</p>
                        <p className="mt-1 text-[10px] font-black text-emerald-800">
                          {money(selected.revenue)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-violet-50 p-3">
                        <p className="text-[7px] text-violet-600">ROI</p>
                        <p className="mt-1 text-[11px] font-black text-violet-800">
                          {selected.budget
                            ? (selected.revenue / selected.budget).toFixed(1)
                            : "—"}
                          x
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[9px] font-black text-slate-800">
                      Luồng tự động
                    </p>
                    <div className="mt-3 space-y-2">
                      {selected.steps.map((step, index) => (
                        <div
                          key={step}
                          className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[8px] font-black text-violet-700">
                            {index + 1}
                          </span>
                          <p className="pt-1 text-[8px] leading-4 text-slate-600">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                          <MessageCircle className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-[8px] font-black text-slate-700">
                            Tin nhắn xem trước
                          </p>
                          <p className="mt-0.5 text-[7px] text-slate-400">
                            {selected.channels
                              .map((item) => channelMeta[item].label)
                              .join(" + ")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 text-[9px] leading-5 text-slate-600">
                        {selected.message}
                      </p>
                      <div className="mt-4 rounded-lg bg-violet-600 px-3 py-2 text-center text-[8px] font-black text-white">
                        Xác nhận / Đặt lịch ngay
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[7px] text-slate-400">
                          Người phụ trách
                        </p>
                        <p className="mt-1 text-[8px] font-black text-slate-700">
                          {selected.owner}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[7px] text-slate-400">Ngân sách</p>
                        <p className="mt-1 text-[8px] font-black text-slate-700">
                          {money(selected.budget)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.channels.map((channel) => (
                        <span
                          key={channel}
                          className={`rounded-lg px-2.5 py-1.5 text-[7px] font-bold ${channelMeta[channel].className}`}
                        >
                          {channelMeta[channel].label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[9px] font-black text-slate-800">
                      Nhật ký phê duyệt
                    </p>
                    <div className="mt-3 space-y-3">
                      {selected.audit.map((item, index) => (
                        <div key={`${item}-${index}`} className="flex gap-3">
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? "bg-violet-500" : "bg-slate-300"}`}
                          />
                          <p className="text-[8px] leading-4 text-slate-500">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selected.note && (
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-[8px] font-black uppercase text-amber-600">
                        Lưu ý trước khi duyệt
                      </p>
                      <p className="mt-2 text-[8px] leading-5 text-amber-800">
                        {selected.note}
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 rounded-2xl bg-violet-50 p-4">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <p className="text-[8px] leading-4 text-violet-700">
                      Hệ thống tự loại khách không đồng ý nhận tin trên từng
                      kênh trước khi gửi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-[8px] font-semibold text-slate-400">
                Thao tác dưới quyền {roleLabel}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => requestAction("DELETE", selected)}
                  disabled={!canManage}
                  className="flex h-10 items-center gap-2 border border-rose-200 bg-white px-4 text-[8px] font-black text-rose-700 shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => duplicateCampaign(selected)}
                  disabled={!canManage}
                  className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-[8px] font-black text-slate-600 shadow-sm disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Sao chép
                </button>
                {["ACTIVE", "AUTOMATED"].includes(selected.status) ? (
                  <button
                    type="button"
                    onClick={() => requestAction("PAUSE", selected)}
                    disabled={!canManage}
                    className="flex h-10 items-center gap-2 border border-rose-200 bg-rose-50 px-4 text-[8px] font-black text-rose-700 shadow-sm disabled:opacity-50"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Tạm dừng
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => changeStatus(selected, "ACTIVE")}
                    disabled={!canManage}
                    className="flex h-10 items-center gap-2 border border-violet-700 bg-violet-600 px-4 text-[8px] font-black text-white shadow-sm disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {selected.status === "DRAFT"
                      ? "Phê duyệt & chạy"
                      : "Kích hoạt lại"}
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng xác nhận thao tác"
            onClick={() => setPendingAction(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="care-action-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-slate-100 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                {pendingAction.type === "PAUSE" ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                  Xác nhận thao tác
                </p>
                <h2
                  id="care-action-title"
                  className="mt-1 text-base font-black text-slate-900"
                >
                  {pendingAction.type === "PAUSE"
                    ? "Tạm dừng chiến dịch?"
                    : pendingAction.blockers?.length
                      ? "Không thể xóa chiến dịch"
                      : "Xóa vĩnh viễn chiến dịch?"}
                </h2>
                <p className="mt-1 truncate text-[9px] font-bold text-slate-500">
                  {pendingAction.campaign.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                aria-label="Đóng"
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-white p-0 text-slate-400 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              {pendingAction.type === "PAUSE" && (
                <>
                  <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-[8px] leading-4 text-amber-800">
                      Chiến dịch sẽ ngừng gửi mới ngay sau khi xác nhận. Dữ liệu
                      đã gửi, tương tác và doanh thu vẫn được giữ lại.
                    </p>
                  </div>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-black text-slate-700">
                      Lý do tạm dừng *
                    </span>
                    <textarea
                      value={pauseReason}
                      onChange={(event) => setPauseReason(event.target.value)}
                      placeholder="Ví dụ: Kiểm tra lại nội dung và nhóm khách nhận tin..."
                      className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[9px] leading-5 outline-none focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"
                    />
                  </label>
                  <p className="text-[8px] text-slate-400">
                    Lý do sẽ được lưu vào nhật ký phê duyệt.
                  </p>
                </>
              )}
              {pendingAction.type === "DELETE" &&
              pendingAction.blockers?.length ? (
                <>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[9px] font-black text-rose-800">
                      Chiến dịch chưa đáp ứng điều kiện xóa:
                    </p>
                    <div className="mt-3 space-y-2">
                      {pendingAction.blockers.map((blocker) => (
                        <div
                          key={blocker}
                          className="flex items-start gap-2 text-[8px] leading-4 text-rose-700"
                        >
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {blocker}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[8px] font-black text-slate-700">
                      Quy tắc xóa an toàn
                    </p>
                    <p className="mt-1.5 text-[8px] leading-4 text-slate-500">
                      Được xóa bản nháp hoặc chiến dịch vừa tạo khi chưa gửi,
                      chưa có tương tác, lịch hẹn hay doanh thu. Chiến dịch đã
                      vận hành nên được tạm dừng để bảo toàn lịch sử.
                    </p>
                  </div>
                </>
              ) : pendingAction.type === "DELETE" ? (
                <>
                  <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <p className="text-[8px] leading-4 text-rose-800">
                      Thao tác này không thể hoàn tác. Chiến dịch mới chưa phát
                      sinh dữ liệu sẽ bị xóa khỏi danh sách.
                    </p>
                  </div>
                  <label>
                    <span className="mb-1.5 block text-[9px] font-black text-slate-700">
                      Nhập <strong className="text-rose-600">XÓA</strong> để xác
                      nhận
                    </span>
                    <input
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      autoComplete="off"
                      placeholder="XÓA"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black outline-none focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"
                    />
                  </label>
                </>
              ) : null}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                {pendingAction.type === "DELETE" &&
                pendingAction.blockers?.length
                  ? "Đã hiểu"
                  : "Hủy"}
              </button>
              {pendingAction.type === "PAUSE" && (
                <button
                  type="button"
                  onClick={() => pauseCampaign(pendingAction.campaign)}
                  disabled={!pauseReason.trim()}
                  className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-100 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
                >
                  <Pause className="h-4 w-4" />
                  Xác nhận tạm dừng
                </button>
              )}
              {pendingAction.type === "DELETE" &&
                !pendingAction.blockers?.length && (
                  <button
                    type="button"
                    onClick={() => deleteCampaign(pendingAction.campaign)}
                    disabled={
                      deleteConfirmation.trim().toUpperCase() !== "XÓA"
                    }
                    className="flex items-center gap-2 border border-rose-700 bg-rose-600 px-5 text-[9px] font-black text-white shadow-lg shadow-rose-100 disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa vĩnh viễn
                  </button>
                )}
            </footer>
          </section>
        </div>
      )}

      {templatesOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng thư viện mẫu"
            onClick={() => setTemplatesOpen(false)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-violet-600">
                  Thư viện nội dung
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  Mẫu tin nhắn đã duyệt
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Sử dụng biến cá nhân hóa để giảm sai sót khi gửi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplatesOpen(false)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              {[
                {
                  title: "Nhắc lịch 24 giờ",
                  type: "Nhắc lịch",
                  text: "Chào {{customer_name}}, bạn có lịch {{service}} lúc {{appointment_time}} ngày mai.",
                },
                {
                  title: "Cảm ơn sau dịch vụ",
                  type: "Xin đánh giá",
                  text: "Cảm ơn bạn đã ghé salon. Hãy chia sẻ đánh giá để chúng tôi phục vụ tốt hơn.",
                },
                {
                  title: "Nhắc làm lại Gel",
                  type: "Đặt lại lịch",
                  text: "Bộ Gel đã đến thời điểm chăm sóc lại. Đặt lịch tuần này để kiểm tra móng miễn phí.",
                },
                {
                  title: "Mời khách quay lại",
                  type: "Win-back",
                  text: "Nailé Studio nhớ bạn! Quay lại trong tuần để nhận ưu đãi dành riêng.",
                },
              ].map((template) => (
                <article
                  key={template.title}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-800">
                        {template.title}
                      </p>
                      <p className="mt-1 text-[7px] font-bold text-violet-500">
                        {template.type}
                      </p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className="mt-3 text-[8px] leading-5 text-slate-500">
                    {template.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireManage()) return;
                      setForm((current) => ({
                        ...current,
                        name: template.title,
                        message: template.text,
                      }));
                      setTemplatesOpen(false);
                      setFormOpen(true);
                    }}
                    disabled={!canManage}
                    className="mt-4 flex h-9 w-full items-center justify-center gap-2 border border-violet-200 bg-violet-50 text-[8px] font-black text-violet-700 shadow-none disabled:opacity-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Dùng mẫu này
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Đóng biểu mẫu chiến dịch"
            onClick={() => setFormOpen(false)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
          />
          <form
            onSubmit={submitForm}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-violet-600">
                  Thiết kế CRM
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  Tạo chiến dịch chăm sóc
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Chiến dịch được lưu bản nháp trước khi Tenant Admin phê duyệt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {formError && (
                <div className="rounded-xl bg-rose-50 p-3 text-[8px] font-bold text-rose-700 sm:col-span-2">
                  {formError}
                </div>
              )}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Tên chiến dịch *
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Nhắc làm lại Gel sau 21 ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Loại chiến dịch *
                </span>
                <BeautifulSelect
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as CampaignType,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                >
                  {Object.entries(typeMeta).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </BeautifulSelect>
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Phạm vi *
                </span>
                <BeautifulSelect
                  value={form.branch}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      branch: event.target.value as BranchScope,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px]"
                >
                  <option value="ALL">Toàn tenant</option>
                  <option value="Q3">Chi nhánh Quận 3</option>
                  <option value="Q1">Chi nhánh Quận 1</option>
                </BeautifulSelect>
              </label>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Kênh gửi *
                </span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(channelMeta) as Channel[]).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`h-9 border px-3 text-[8px] font-black shadow-sm ${form.channels.includes(channel) ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500"}`}
                    >
                      {form.channels.includes(channel) && (
                        <Check className="mr-1.5 inline h-3 w-3" />
                      )}
                      {channelMeta[channel].label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Nhóm khách hàng *
                </span>
                <input
                  value={form.audience}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      audience: event.target.value,
                    }))
                  }
                  placeholder="Khách làm Gel từ 18–24 ngày trước..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Điều kiện kích hoạt
                </span>
                <input
                  value={form.trigger}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      trigger: event.target.value,
                    }))
                  }
                  placeholder="Ngày thứ 21 sau dịch vụ"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Lịch gửi *
                </span>
                <input
                  value={form.schedule}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      schedule: event.target.value,
                    }))
                  }
                  placeholder="09:30 hằng ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Nội dung tin nhắn *
                </span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Dùng {{customer_name}}, {{appointment_time}}, {{service}} để cá nhân hóa..."
                  className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-5 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
                <span className="mt-1.5 block text-right text-[7px] text-slate-400">
                  {form.message.length} ký tự
                </span>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[9px] font-bold text-slate-600">
                  Ngân sách dự kiến
                </span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={form.budget}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      budget: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-violet-400"
                />
              </label>
            </div>
            <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="border border-slate-200 bg-white px-4 text-[9px] font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-[9px] font-black text-white shadow-lg shadow-violet-200"
              >
                <Check className="h-4 w-4" />
                Lưu bản nháp
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
