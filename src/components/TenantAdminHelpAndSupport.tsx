import { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Download,
  ExternalLink,
  FileQuestion,
  FileText,
  Headphones,
  Image as ImageIcon,
  Inbox,
  Info,
  LifeBuoy,
  Mail,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  ThumbsUp,
  Ticket as TicketIcon,
  Timer,
  Trash2,
  Upload,
  UploadCloud,
  User,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import type { DemoAccount } from '../auth/demoAccounts';
import type { SubscriptionPackage, Tenant, Ticket, TicketHistoryEntry, TicketMessage } from '../types';
import { recordAuditLog } from '../utils/auditLogs';
import BeautifulSelect from './BeautifulSelect';
import { Modal } from './ui';

export interface TenantAdminHelpAndSupportProps {
  tenantName: string;
  tenant?: Tenant;
  account: DemoAccount;
  subscriptionPackage?: SubscriptionPackage;
  tickets: Ticket[];
  onTicketsChange: (tickets: Ticket[]) => void;
  onNotify?: (message: string) => void;
}

type SupportTab = 'tickets' | 'knowledge' | 'channels';
type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'RESOLVED' | 'CLOSED';
type PriorityFilter = 'ALL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

const STATUS_MAP: Record<Ticket['status'], { label: string; badgeClass: string; dotClass: string }> = {
  OPEN: { label: 'Mới tạo', badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', dotClass: 'bg-sky-500' },
  ASSIGNED: { label: 'Đã phân công', badgeClass: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', dotClass: 'bg-violet-500' },
  IN_PROGRESS: { label: 'Đang xử lý', badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dotClass: 'bg-blue-500' },
  PENDING_CUSTOMER: { label: 'Chờ phản hồi', badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dotClass: 'bg-amber-500' },
  ESCALATED: { label: 'Đang giải quyết gấp', badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dotClass: 'bg-rose-500' },
  RESOLVED: { label: 'Đã giải quyết', badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dotClass: 'bg-emerald-500' },
  CLOSED: { label: 'Đã hoàn tất', badgeClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dotClass: 'bg-slate-400' }
};

const PRIORITY_MAP: Record<Ticket['priority'], { label: string; badgeClass: string; iconClass: string }> = {
  URGENT: { label: 'Khẩn cấp', badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', iconClass: 'text-rose-600' },
  HIGH: { label: 'Cao', badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', iconClass: 'text-amber-600' },
  MEDIUM: { label: 'Trung bình', badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', iconClass: 'text-blue-600' },
  LOW: { label: 'Thấp', badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200', iconClass: 'text-slate-500' }
};

const CATEGORIES = [
  'POS, Thu ngân & Thanh toán',
  'Máy in hóa đơn & Thiết bị phần cứng',
  'Lịch hẹn & Đặt lịch online',
  'Khách hàng, Thẻ thành viên & Điểm thưởng',
  'Kho hàng & Vật tư tiêu hao',
  'Hóa đơn, Gói dịch vụ & Gia hạn',
  'Tài khoản, Phân quyền & Nhân sự',
  'Sự cố kỹ thuật & Hệ thống khác'
];

interface KnowledgeArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
  tags: string[];
  steps: string[];
  tip?: string;
}

const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'KB-001',
    category: 'POS, Thu ngân & Thanh toán',
    title: 'Cách thiết lập mã VietQR động tự động điền số tiền tại quầy thu ngân',
    summary: 'Hướng dẫn cài đặt mã QR hiển thị đúng số tiền hóa đơn và tự động nhận diện thanh toán thành công.',
    readTime: '3 phút đọc',
    tags: ['VietQR', 'POS', 'Thanh toán tự động'],
    steps: [
      'Truy cập mục "Cài đặt tiệm" > chọn nhóm "Thanh toán".',
      'Bật phương thức "Chuyển khoản ngân hàng (VietQR)".',
      'Nhập chính xác Số tài khoản, Tên ngân hàng thụ hưởng và Cú pháp hóa đơn.',
      'Tại màn hình POS thu ngân, chọn phương thức Chuyển khoản — mã QR động sẽ tự động sinh kèm số tiền chính xác.',
      'Khách quét mã, hệ thống ghi nhận giao dịch thành công ngay khi tài khoản báo có.'
    ],
    tip: 'Nên kiểm tra chuyển thử 10.000đ trước ca làm để đảm bảo webhook thông báo hoạt động thông suốt.'
  },
  {
    id: 'KB-002',
    category: 'Máy in hóa đơn & Thiết bị phần cứng',
    title: 'Khắc phục sự cố máy in bill LAN/USB không tự cắt giấy hoặc in chậm',
    summary: 'Các bước kiểm tra cổng kết nối, cài driver ESC/POS và chỉnh khổ giấy K80 tiêu chuẩn.',
    readTime: '4 phút đọc',
    tags: ['Máy in bill', 'K80', 'Hardware'],
    steps: [
      'Kiểm tra dây nguồn và cáp mạng LAN cắm trực tiếp từ Router vào máy in (đèn xanh sáng ổn định).',
      'In test IP của máy in bằng cách giữ nút Feed và bật công tắc nguồn.',
      'Vào Cài đặt > Thiết bị ngoại vi > Điền địa chỉ IP máy in vừa lấy được (ví dụ: 192.168.1.200).',
      'Bật tùy chọn "Tự động cắt giấy sau khi in" và chọn khổ giấy 80mm.',
      'Bấm nút "In thử nghiệm" để kiểm tra chất lượng bản in.'
    ],
    tip: 'Nếu máy in kết nối qua USB, vui lòng đảm bảo đã cài phần mềm kết nối Desktop Agent của SalonSys.'
  },
  {
    id: 'KB-003',
    category: 'Lịch hẹn & Đặt lịch online',
    title: 'Cấu hình gửi tin Zalo ZNS tự động nhắc lịch hẹn trước 2 giờ',
    summary: 'Giảm 75% tỷ lệ khách quên lịch bằng tính năng gửi thông báo tự động qua Zalo OA.',
    readTime: '3 phút đọc',
    tags: ['Zalo ZNS', 'Nhắc lịch', 'Automation'],
    steps: [
      'Vào mục "Cài đặt tiệm" > chọn nhóm "Thông báo".',
      'Bật trạng thái kích hoạt Zalo ZNS Reminder.',
      'Chọn thời gian gửi nhắc lịch trước giờ hẹn: 2 giờ hoặc 24 giờ.',
      'Xem trước mẫu tin nhắn thương hiệu hiển thị tên tiệm, tên thợ và địa chỉ chi nhánh.',
      'Lưu cài đặt. Tin nhắn sẽ tự động gửi tới khách có số điện thoại đăng ký Zalo.'
    ],
    tip: 'Mẫu tin ZNS đã được kiểm duyệt chuẩn bởi Zalo, không tính phí tin nhắn nếu khách xác nhận lịch.'
  },
  {
    id: 'KB-004',
    category: 'Tài khoản, Phân quyền & Nhân sự',
    title: 'Quy trình phân quyền và thiết lập hoa hồng cho Kỹ thuật viên & Lễ tân',
    summary: 'Cách tạo tài khoản cho thợ làm nail, phân quyền xem lịch riêng và tính tỷ lệ chia hoa hồng chuẩn xác.',
    readTime: '5 phút đọc',
    tags: ['Nhân sự', 'Hoa hồng', 'Phân quyền'],
    steps: [
      'Truy cập mục "Nhân sự" > bấm "Thêm nhân viên mới".',
      'Điền thông tin và chọn vai trò: Kỹ thuật viên (chỉ thấy lịch của mình) hoặc Lễ tân (thao tác đặt lịch & POS).',
      'Tại mục "Chính sách hoa hồng", thiết lập mức % hoa hồng cho Dịch vụ (ví dụ: 10%) và Sản phẩm bán thêm (ví dụ: 5%).',
      'Gửi liên kết kích hoạt hoặc cung cấp mật khẩu tạm thời cho nhân viên.',
      'Báo cáo doanh thu và hoa hồng sẽ tự động tổng hợp vào cuối ngày tại mục Báo cáo.'
    ]
  },
  {
    id: 'KB-005',
    category: 'POS, Thu ngân & Thanh toán',
    title: 'Chế độ ngoại tuyến (Offline Mode): Bán hàng và in bill khi mất kết nối mạng',
    summary: 'Hệ thống tự động lưu dữ liệu cục bộ an toàn và tự đồng bộ ngay khi có mạng trở lại.',
    readTime: '3 phút đọc',
    tags: ['Offline Mode', 'Dữ liệu', 'An toàn'],
    steps: [
      'Khi mất mạng Internet, thanh trạng thái chuyển sang màu cam "Chế độ ngoại tuyến".',
      'Thu ngân vẫn có thể tạo hóa đơn, chọn dịch vụ và in bill bình thường.',
      'Tất cả giao dịch được lưu trữ mã hóa trên trình duyệt.',
      'Khi có mạng trở lại, hệ thống tự động tải và đồng bộ tất cả đơn hàng lên máy chủ mà không làm gián đoạn bán hàng.'
    ]
  }
];

const CANNED_RESPONSES = [
  'Đã kiểm tra lại và hệ thống đã hoạt động bình thường. Cảm ơn đội ngũ hỗ trợ!',
  'Chúng tôi vẫn gặp lỗi tương tự ở máy thu ngân số 2, phiền kỹ thuật viên hỗ trợ thêm.',
  'Đã gửi kèm ảnh chụp màn hình thông báo lỗi để tiện đối chiếu.',
  'Cần hướng dẫn gấp qua điện thoại vì đang trong ca phục vụ khách đông.'
];

export default function TenantAdminHelpAndSupport({
  tenantName,
  tenant,
  account,
  subscriptionPackage,
  tickets,
  onTicketsChange,
  onNotify
}: TenantAdminHelpAndSupportProps) {
  const [activeTab, setActiveTab] = useState<SupportTab>('tickets');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Modals & form state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [feedbackNote, setFeedbackNote] = useState('');

  // Reply state
  const [replyBody, setReplyBody] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string; size: string; url: string; type: string }>>([]);
  const [cannedRepliesCollapsed, setCannedRepliesCollapsed] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ name: string; url?: string; size?: string } | null>(null);

  // File input refs
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  // New ticket form
  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formPriority, setFormPriority] = useState<Ticket['priority']>('MEDIUM');
  const [formChannel, setFormChannel] = useState<Ticket['channel']>('CHAT');
  const [formDescription, setFormDescription] = useState('');
  const [createAttachedFiles, setCreateAttachedFiles] = useState<Array<{ id: string; name: string; size: string; url: string; type: string }>>([]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = (files: FileList | File[]): Promise<Array<{ id: string; name: string; size: string; url: string; type: string }>> => {
    const list = Array.from(files);
    return Promise.all(
      list.map((file) => {
        return new Promise<{ id: string; name: string; size: string; url: string; type: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              size: formatFileSize(file.size),
              url: (e.target?.result as string) || '',
              type: file.type || 'image/png'
            });
          };
          reader.onerror = () => {
            resolve({
              id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              size: formatFileSize(file.size),
              url: '',
              type: file.type || 'application/octet-stream'
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );
  };

  const handleReplyFilesAdded = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const processed = await processFiles(files);
    setAttachedFiles((prev) => [...prev, ...processed]);
  };

  const handleCreateFilesAdded = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const processed = await processFiles(files);
    setCreateAttachedFiles((prev) => [...prev, ...processed]);
  };

  const handlePasteOnReply = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const f = items[i].getAsFile();
        if (f) imgFiles.push(f);
      }
    }
    if (imgFiles.length > 0) {
      e.preventDefault();
      await handleReplyFilesAdded(imgFiles);
    }
  };

  // Knowledge base search
  const [kbSearch, setKbSearch] = useState('');
  const [kbCategory, setKbCategory] = useState('ALL');
  const [expandedKbId, setExpandedKbId] = useState<string | null>('KB-001');

  const tenantId = tenant?.id || account.tenantId || 'TEN-CURRENT';
  const planName = subscriptionPackage?.name || tenant?.packageName || tenant?.plan || 'Premium';

  // Filter tickets for this tenant
  const tenantTickets = useMemo(() => {
    const rawName = (tenantName || account.tenantName || tenant?.name || '').trim().toLowerCase();
    const rawEmail = (account.email || tenant?.adminEmail || '').trim().toLowerCase();
    const rawTenantId = tenantId.trim().toLowerCase();

    const matched = tickets.filter((t) => {
      if (t.tenantId && t.tenantId.toLowerCase() === rawTenantId) return true;
      if (t.tenantName && t.tenantName.toLowerCase().includes(rawName)) return true;
      if (t.requesterEmail && t.requesterEmail.toLowerCase() === rawEmail) return true;
      return false;
    });

    // If no direct matches exist, ensure we provide sample tickets for a rich experience
    if (matched.length === 0 && tickets.length > 0) {
      return tickets.slice(0, 3);
    }
    return matched;
  }, [tickets, tenantId, tenantName, account, tenant]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tenantTickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        ticket.id.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        (ticket.category && ticket.category.toLowerCase().includes(query));

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'].includes(ticket.status);
      } else if (statusFilter === 'PENDING') {
        matchesStatus = ticket.status === 'PENDING_CUSTOMER';
      } else if (statusFilter === 'RESOLVED') {
        matchesStatus = ticket.status === 'RESOLVED';
      } else if (statusFilter === 'CLOSED') {
        matchesStatus = ticket.status === 'CLOSED';
      }

      const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tenantTickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  // Selected ticket
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) {
      return filteredTickets[0] || tenantTickets[0] || null;
    }
    return tenantTickets.find((t) => t.id === selectedTicketId) || filteredTickets[0] || null;
  }, [selectedTicketId, tenantTickets, filteredTickets]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = tenantTickets.length;
    const active = tenantTickets.filter((t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'].includes(t.status)).length;
    const pending = tenantTickets.filter((t) => t.status === 'PENDING_CUSTOMER').length;
    const resolved = tenantTickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;

    let slaText = '< 15 phút (Ưu tiên 24/7)';
    if (planName === 'Basic') slaText = '< 4 giờ làm việc';
    else if (planName === 'Standard') slaText = '< 2 giờ làm việc';
    else if (planName === 'Premium') slaText = '< 30 phút';

    return { total, active, pending, resolved, slaText };
  }, [tenantTickets, planName]);

  // Handle create new ticket
  const handleCreateTicket = (e: FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formDescription.trim()) return;

    const now = new Date();
    const id = `TIC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let responseHours = 1;
    if (formPriority === 'URGENT') responseHours = 0.25;
    else if (formPriority === 'HIGH') responseHours = 0.5;
    else if (formPriority === 'LOW') responseHours = 4;

    const firstResponseDueAt = new Date(now.getTime() + responseHours * 60 * 60 * 1000).toISOString();
    const resolutionDueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const initialMessages: TicketMessage[] = [
      {
        id: `MSG-${Date.now()}-SYS`,
        authorName: 'Hệ thống SalonSys',
        authorEmail: 'support@salonsys.vn',
        authorRole: 'SYSTEM',
        type: 'SYSTEM_EVENT',
        body: `Yêu cầu hỗ trợ đã được tiếp nhận từ quản trị viên ${account.displayName || tenantName}. Hệ thống tự động chuyển tới đội ngũ chuyên trách.`,
        createdAt: now.toISOString()
      },
      {
        id: `MSG-${Date.now()}-REQ`,
        authorName: account.displayName || 'Quản trị viên Salon',
        authorEmail: account.email || 'admin@salon.vn',
        authorRole: 'TENANT_ADMIN',
        type: 'PUBLIC_REPLY',
        body: formDescription.trim() || (createAttachedFiles.length > 0 ? 'Đã đính kèm ảnh chụp sự cố.' : ''),
        createdAt: now.toISOString(),
        attachments: createAttachedFiles.length > 0 ? createAttachedFiles : undefined
      }
    ];

    const initialHistory: TicketHistoryEntry[] = [
      {
        id: `HIS-${Date.now()}-1`,
        action: 'Tạo yêu cầu hỗ trợ mới',
        detail: `Tenant "${tenantName}" đã gửi yêu cầu: "${formSubject.trim()}".`,
        actor: account.displayName || 'Tenant Admin',
        createdAt: now.toISOString()
      }
    ];

    const newTicket: Ticket = {
      id,
      tenantId: tenant?.id || account.tenantId || 'TEN-DEMO-001',
      tenantName: tenantName || account.tenantName || 'Salon',
      requesterName: account.displayName || 'Quản trị viên Salon',
      requesterEmail: account.email || 'admin@salon.vn',
      requesterPhone: tenant?.phone || '090 888 9999',
      plan: planName as any,
      subject: formSubject.trim(),
      category: formCategory,
      channel: formChannel,
      priority: formPriority,
      status: 'OPEN',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      firstResponseDueAt,
      resolutionDueAt,
      team: formCategory.includes('Hóa đơn') ? 'BILLING' : formCategory.includes('Phân quyền') ? 'SECURITY' : 'TECHNICAL',
      tags: ['tenant-request', formPriority.toLowerCase(), formCategory.slice(0, 10)],
      description: formDescription.trim(),
      messages: initialMessages,
      history: initialHistory,
      relatedResource: {
        type: 'TENANT',
        id: tenant?.id || 'TEN-CURRENT',
        label: tenantName
      }
    };

    onTicketsChange([newTicket, ...tickets]);
    setSelectedTicketId(id);
    setCreateModalOpen(false);

    // Reset form
    setFormSubject('');
    setFormDescription('');
    setCreateAttachedFiles([]);
    setFormPriority('MEDIUM');

    recordAuditLog({
      eventCode: 'SUPPORT.TICKET.CREATED_BY_TENANT',
      event: 'Gửi yêu cầu hỗ trợ tới Superadmin',
      description: `${id}: Tenant "${tenantName}" gửi yêu cầu "${formSubject}".`,
      severity: formPriority === 'URGENT' ? 'high' : 'medium',
      status: 'success',
      category: 'SUPPORT',
      resource: `Ticket ${id}`,
      resourceId: id,
      method: 'CLIENT /tenant/support/tickets/create'
    });

    onNotify?.(`Đã gửi yêu cầu hỗ trợ ${id} thành công. Kỹ thuật viên sẽ phản hồi trong vòng ${metrics.slaText}.`);
  };

  // Handle reply from Tenant Admin
  const handleSendReply = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicket || (!replyBody.trim() && attachedFiles.length === 0)) return;

    const now = new Date().toISOString();
    const newMsg: TicketMessage = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorName: account.displayName || 'Quản trị viên Salon',
      authorEmail: account.email || 'admin@salon.vn',
      authorRole: 'TENANT_ADMIN',
      type: 'PUBLIC_REPLY',
      body: replyBody.trim() || (attachedFiles.length > 0 ? 'Đã gửi hình ảnh đính kèm.' : ''),
      createdAt: now,
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id !== selectedTicket.id) return t;

      const nextStatus = t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'IN_PROGRESS' : t.status === 'PENDING_CUSTOMER' ? 'IN_PROGRESS' : t.status;

      return {
        ...t,
        messages: [...(t.messages || []), newMsg],
        status: nextStatus,
        updatedAt: now,
        history: [
          ...(t.history || []),
          {
            id: `HIS-${Date.now()}`,
            action: 'Phản hồi từ Quản trị Salon',
            detail: `Đã gửi phản hồi mới${attachedFiles.length > 0 ? ` (Kèm ${attachedFiles.length} hình ảnh)` : ''} đến ban quản trị Superadmin.`,
            actor: account.displayName || 'Tenant Admin',
            createdAt: now
          }
        ]
      };
    });

    onTicketsChange(updatedTickets);
    setReplyBody('');
    setAttachedFiles([]);

    recordAuditLog({
      eventCode: 'SUPPORT.TICKET.TENANT_REPLIED',
      event: 'Salon phản hồi ticket hỗ trợ',
      description: `${selectedTicket.id}: Quản trị viên salon đã gửi tin nhắn phản hồi.`,
      severity: 'low',
      status: 'success',
      category: 'SUPPORT',
      resource: `Ticket ${selectedTicket.id}`,
      resourceId: selectedTicket.id,
      method: `CLIENT /tenant/support/tickets/${selectedTicket.id}/reply`
    });

    onNotify?.('Đã gửi phản hồi thành công đến kỹ thuật viên.');
  };

  // Close ticket confirmed by Tenant
  const handleCloseTicket = (ticketId: string) => {
    const now = new Date().toISOString();
    const updated = tickets.map((t) => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        status: 'CLOSED' as const,
        resolvedAt: t.resolvedAt || now,
        updatedAt: now,
        history: [
          ...(t.history || []),
          {
            id: `HIS-${Date.now()}`,
            action: 'Đóng ticket hoàn tất',
            detail: 'Quản trị viên salon xác nhận sự cố đã được xử lý xong.',
            actor: account.displayName || 'Tenant Admin',
            createdAt: now
          }
        ]
      };
    });
    onTicketsChange(updated);
    onNotify?.(`Đã xác nhận hoàn tất và đóng yêu cầu ${ticketId}.`);
  };

  // Reopen ticket
  const handleReopenTicket = (ticketId: string) => {
    const now = new Date().toISOString();
    const updated = tickets.map((t) => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        status: 'IN_PROGRESS' as const,
        updatedAt: now,
        history: [
          ...(t.history || []),
          {
            id: `HIS-${Date.now()}`,
            action: 'Mở lại yêu cầu',
            detail: 'Salon yêu cầu kiểm tra lại do sự cố phát sinh.',
            actor: account.displayName || 'Tenant Admin',
            createdAt: now
          }
        ]
      };
    });
    onTicketsChange(updated);
    onNotify?.(`Đã mở lại yêu cầu ${ticketId}. Đội ngũ kỹ thuật sẽ tiếp tục xử lý.`);
  };

  // Submit satisfaction rating
  const handleSubmitFeedback = () => {
    if (!selectedTicket) return;
    const now = new Date().toISOString();
    const updated = tickets.map((t) => {
      if (t.id !== selectedTicket.id) return t;
      return {
        ...t,
        satisfaction: ratingScore as any,
        updatedAt: now,
        history: [
          ...(t.history || []),
          {
            id: `HIS-${Date.now()}`,
            action: 'Đánh giá chất lượng hỗ trợ',
            detail: `Salon đánh giá ${ratingScore}/5 sao. Ghi chú: "${feedbackNote || 'Hài lòng'}".`,
            actor: account.displayName || 'Tenant Admin',
            createdAt: now
          }
        ]
      };
    });
    onTicketsChange(updated);
    setFeedbackModalOpen(false);
    setFeedbackNote('');
    onNotify?.('Cảm ơn bạn đã gửi đánh giá chất lượng dịch vụ hỗ trợ!');
  };

  // Filtered knowledge articles
  const filteredKbArticles = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();
    return KNOWLEDGE_ARTICLES.filter((article) => {
      const matchCategory = kbCategory === 'ALL' || article.category === kbCategory;
      const matchSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [kbSearch, kbCategory]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              <LifeBuoy className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">Trung tâm trợ giúp & Hỗ trợ kỹ thuật</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Gửi yêu cầu trực tiếp đến Đội ngũ Kỹ thuật & Superadmin hệ thống · Cam kết SLA phản hồi theo gói <strong className="text-violet-600 dark:text-violet-400">{planName}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCallModalOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Phone className="h-4 w-4 text-emerald-600" />
            <span>Hotline 24/7</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-600 bg-violet-600 px-5 text-xs font-black text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo yêu cầu mới</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng yêu cầu của tiệm</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</p>
              <p className="mt-1 text-[11px] text-slate-400">Ghi nhận từ {tenantName}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <TicketIcon className="h-4 w-4" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Đang xử lý & Phản hồi</p>
              <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{metrics.active + metrics.pending}</p>
              <p className="mt-1 text-[11px] text-slate-400">{metrics.pending} yêu cầu chờ bạn phản hồi</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Clock3 className="h-4 w-4" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Đã giải quyết thành công</p>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.resolved}</p>
              <p className="mt-1 text-[11px] text-slate-400">Tỷ lệ hoàn thành {metrics.total ? Math.round((metrics.resolved / metrics.total) * 100) : 100}%</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cam kết phản hồi (SLA)</p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{metrics.slaText}</p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Ưu tiên theo gói {planName}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
              <Zap className="h-4 w-4" />
            </span>
          </div>
        </article>
      </section>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === 'tickets'
                ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Yêu cầu hỗ trợ của tiệm</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {tenantTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === 'knowledge'
                ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Cẩm nang & Hỏi đáp nhanh (FAQ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === 'channels'
                ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Headphones className="h-4 w-4" />
            <span>Kênh liên hệ & Ma trận SLA</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TICKETS & CONVERSATION */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Status pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'ACTIVE', label: 'Đang xử lý' },
                  { key: 'PENDING', label: 'Chờ phản hồi' },
                  { key: 'RESOLVED', label: 'Đã giải quyết' },
                  { key: 'CLOSED', label: 'Đã đóng' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as StatusFilter)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === tab.key
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Priority & Category dropdowns + Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <BeautifulSelect
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                    aria-label="Lọc mức độ ưu tiên"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="ALL">Mọi ưu tiên</option>
                    <option value="URGENT">Khẩn cấp</option>
                    <option value="HIGH">Cao</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="LOW">Thấp</option>
                  </BeautifulSelect>
                </div>

                <div className="w-48">
                  <BeautifulSelect
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Lọc danh mục"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="ALL">Mọi danh mục</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </BeautifulSelect>
                </div>

                <div className="relative min-w-[200px] flex-1 sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo mã #TIC, tiêu đề..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs font-medium outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Two-Column Layout */}
          {tenantTickets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                <LifeBuoy className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">Chưa có yêu cầu hỗ trợ nào</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                Khi salon của bạn gặp sự cố phần mềm, thiết bị POS, máy in hoặc cần hỗ trợ cấu hình, hãy tạo yêu cầu để đội ngũ chuyên môn xử lý ngay.
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-black text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                <span>Gửi yêu cầu hỗ trợ đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
              {/* Left Column: Ticket List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Danh sách yêu cầu ({filteredTickets.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setPriorityFilter('ALL');
                      setCategoryFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="text-[11px] font-semibold text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>

                <div className="max-h-[720px] space-y-2.5 overflow-y-auto pr-1">
                  {filteredTickets.map((ticket) => {
                    const isSelected = selectedTicket?.id === ticket.id;
                    const statusInfo = STATUS_MAP[ticket.status] || STATUS_MAP.OPEN;
                    const priorityInfo = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.MEDIUM;
                    const messageCount = ticket.messages?.length || 0;
                    const lastMsg = ticket.messages?.[ticket.messages.length - 1];

                    return (
                      <article
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`group cursor-pointer rounded-2xl border p-4 transition ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50/40 shadow-sm ring-1 ring-violet-400 dark:border-violet-600 dark:bg-violet-950/20'
                            : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-violet-700 dark:text-violet-300">
                              {ticket.id}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusInfo.badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                              {statusInfo.label}
                            </span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityInfo.badgeClass}`}>
                            {priorityInfo.label}
                          </span>
                        </div>

                        <h4 className="mt-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
                          {ticket.subject}
                        </h4>

                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                          {lastMsg ? lastMsg.body : ticket.description}
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <Tag className="h-3 w-3 shrink-0" />
                            {ticket.category}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <MessageCircle className="h-3 w-3 text-slate-400" />
                            {messageCount} tin nhắn
                          </span>
                        </div>
                      </article>
                    );
                  })}

                  {filteredTickets.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                      Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Conversation & Ticket Details */}
              {selectedTicket ? (
                <div className="flex h-[760px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {/* Detail Header */}
                  <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black uppercase text-violet-600 dark:text-violet-400">
                            {selectedTicket.id}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold ${STATUS_MAP[selectedTicket.status]?.badgeClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_MAP[selectedTicket.status]?.dotClass}`} />
                            {STATUS_MAP[selectedTicket.status]?.label}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-caption font-bold ${PRIORITY_MAP[selectedTicket.priority]?.badgeClass}`}>
                            Ưu tiên: {PRIORITY_MAP[selectedTicket.priority]?.label}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Nhóm: {selectedTicket.team || 'TECHNICAL'}
                          </span>
                        </div>

                        <h2 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                          {selectedTicket.subject}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-caption text-slate-400">
                          <span>Danh mục: <strong className="text-slate-700 dark:text-slate-200">{selectedTicket.category}</strong></span>
                          <span>·</span>
                          <span>Người tạo: <strong className="text-slate-700 dark:text-slate-200">{selectedTicket.requesterName}</strong></span>
                          <span>·</span>
                          <span>Chuyên viên: <strong className="text-violet-600 dark:text-violet-400">{selectedTicket.assignedTo?.name || 'Đội ngũ Superadmin'}</strong></span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {['RESOLVED', 'CLOSED'].includes(selectedTicket.status) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setFeedbackModalOpen(true)}
                              className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-caption font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            >
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                              <span>{selectedTicket.satisfaction ? `Đã đánh giá (${selectedTicket.satisfaction}★)` : 'Đánh giá hỗ trợ'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReopenTicket(selectedTicket.id)}
                              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-caption font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Mở lại yêu cầu</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-caption font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Xác nhận đã xử lý xong</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages Feed Area */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {/* Initial Description Card */}
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/30 dark:bg-violet-950/20">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-200 text-[10px] font-black text-violet-800 dark:bg-violet-800 dark:text-violet-200">
                            {selectedTicket.requesterName.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {selectedTicket.requesterName} (Khởi tạo yêu cầu)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(selectedTicket.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700 dark:text-slate-300">
                        {selectedTicket.description}
                      </p>
                    </div>

                    {/* Messages List */}
                    {selectedTicket.messages?.map((msg) => {
                      const isSuperadmin = msg.authorRole === 'SUPERADMIN' || msg.authorRole === 'SUPPORT';
                      const isSystem = msg.type === 'SYSTEM_EVENT' || msg.authorRole === 'SYSTEM';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex items-center justify-center py-1">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              ℹ️ {msg.body}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2.5 ${isSuperadmin ? 'justify-start' : 'justify-end'}`}
                        >
                          {isSuperadmin && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-caption font-black text-emerald-700 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300">
                              KT
                            </div>
                          )}

                          <div
                            className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                              isSuperadmin
                                ? 'rounded-bl-none border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                : 'rounded-br-none border border-violet-600 bg-violet-600 text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className={`text-[11px] font-bold ${isSuperadmin ? 'text-emerald-700 dark:text-emerald-400' : 'text-violet-100'}`}>
                                {isSuperadmin ? 'Kỹ thuật viên Superadmin' : 'Bạn (Quản trị tiệm)'}
                              </span>
                              <time className={`text-[10px] ${isSuperadmin ? 'text-slate-400' : 'text-violet-200'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </time>
                            </div>

                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5">
                              {msg.body}
                            </p>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {/* Images Grid */}
                                {msg.attachments.some((att) => att.url || att.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)) && (
                                  <div className="flex flex-wrap gap-2">
                                    {msg.attachments
                                      .filter((att) => att.url || att.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))
                                      .map((att) => (
                                        <button
                                          key={att.id}
                                          type="button"
                                          onClick={() => setPreviewImage(att)}
                                          className="group relative block overflow-hidden rounded-xl border border-black/10 bg-black/10 text-left shadow-xs transition hover:border-violet-400 focus:outline-none dark:border-white/10"
                                        >
                                          {att.url ? (
                                            <img
                                              src={att.url}
                                              alt={att.name}
                                              className="h-28 w-28 object-cover transition duration-200 group-hover:scale-105 sm:h-36 sm:w-36"
                                            />
                                          ) : (
                                            <div className="flex h-28 w-28 flex-col items-center justify-center bg-slate-100 p-2 text-center text-slate-500 sm:h-36 sm:w-36 dark:bg-slate-800 dark:text-slate-400">
                                              <ImageIcon className="h-7 w-7 text-slate-400" />
                                              <span className="mt-1 line-clamp-1 text-[10px]">{att.name}</span>
                                            </div>
                                          )}
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
                                            <span className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-900 shadow">
                                              <Maximize2 className="h-3 w-3 text-slate-900" /> Xem lớn
                                            </span>
                                          </div>
                                          <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 text-[9px] font-medium text-white">
                                            {att.name}
                                          </div>
                                        </button>
                                      ))}
                                  </div>
                                )}

                                {/* Non-image files */}
                                {msg.attachments.some((att) => !att.url && !att.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)) && (
                                  <div className="flex flex-wrap gap-2">
                                    {msg.attachments
                                      .filter((att) => !att.url && !att.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i))
                                      .map((att) => (
                                        <div
                                          key={att.id}
                                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                                            isSuperadmin
                                              ? 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                              : 'bg-violet-700/60 text-white'
                                          }`}
                                        >
                                          <Paperclip className="h-3 w-3" />
                                          <span>{att.name}</span>
                                          <span className="opacity-70">({att.size})</span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {!isSuperadmin && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-caption font-black text-violet-700 shadow-sm dark:bg-violet-900/50 dark:text-violet-300">
                              {(account.displayName || 'NA').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Canned Quick Replies */}
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-850">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gợi ý phản hồi nhanh:</p>
                      <button
                        type="button"
                        onClick={() => setCannedRepliesCollapsed((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-violet-300 transition-colors shadow-2xs"
                        title={cannedRepliesCollapsed ? 'Mở rộng gợi ý' : 'Thu gọn gợi ý'}
                      >
                        <span>{cannedRepliesCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
                        {cannedRepliesCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      </button>
                    </div>
                    {!cannedRepliesCollapsed && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {CANNED_RESPONSES.map((txt) => (
                          <button
                            key={txt}
                            type="button"
                            onClick={() => setReplyBody(txt)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-violet-300"
                          >
                            {txt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reply Input Form */}
                  <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                    <form onSubmit={handleSendReply} className="space-y-3">
                      {/* Attached images preview bar */}
                      {attachedFiles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/70 p-2.5 dark:border-violet-900/50 dark:bg-violet-950/30">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 pr-1">
                            <ImageIcon className="h-4 w-4" />
                            <span>Đã chọn ({attachedFiles.length}):</span>
                          </div>
                          {attachedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="group relative flex items-center gap-2 rounded-xl border border-violet-200/80 bg-white p-1.5 pr-2 text-xs shadow-2xs dark:border-slate-700 dark:bg-slate-900"
                            >
                              {file.url ? (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="h-9 w-9 rounded-lg object-cover cursor-pointer hover:opacity-90"
                                  onClick={() => setPreviewImage(file)}
                                  title="Bấm để xem lớn"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                              <div className="max-w-[140px] truncate">
                                <p className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                                <p className="text-[10px] text-slate-400">{file.size}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                                className="ml-1 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                title="Xóa ảnh này"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => replyFileInputRef.current?.click()}
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-dashed border-violet-300 px-2.5 text-[11px] font-bold text-violet-600 hover:bg-violet-100/50 dark:border-violet-700 dark:text-violet-400"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm ảnh
                          </button>
                        </div>
                      )}

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={replyFileInputRef}
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleReplyFilesAdded(e.target.files);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />

                      <div className="relative">
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          onPaste={handlePasteOnReply}
                          placeholder="Nhập nội dung phản hồi, câu hỏi bổ sung hoặc dán (Ctrl+V) ảnh chụp màn hình..."
                          rows={2}
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-24 text-xs outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
                        />

                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => replyFileInputRef.current?.click()}
                            title="Chọn ảnh đính kèm từ máy tính (hoặc dán Ctrl+V)"
                            className={`flex h-8 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold transition ${
                              attachedFiles.length > 0
                                ? 'border-violet-500 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <ImageIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            <span className="hidden sm:inline">Gửi ảnh</span>
                          </button>

                          <button
                            type="submit"
                            disabled={!replyBody.trim() && attachedFiles.length === 0}
                            className="flex h-8 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-800"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Gửi</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex h-[760px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <FileQuestion className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Chọn một yêu cầu để xem chi tiết</p>
                    <p className="mt-1 text-xs text-slate-400">Hoặc bấm "Tạo yêu cầu mới" ở góc trên để gửi thắc mắc</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASE / FAQ */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* KB Hero Search */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl sm:p-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-caption font-bold text-violet-300 ring-1 ring-violet-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                Cẩm nang kỹ thuật & Hỏi đáp tự phục vụ
              </span>
              <h2 className="mt-3 text-xl font-black sm:text-2xl">Bạn cần hướng dẫn sử dụng tính năng nào?</h2>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Tra cứu ngay giải pháp cho các lỗi thường gặp về máy in bill, mã VietQR, cấu hình Zalo nhắc lịch và chính sách hoa hồng.
              </p>

              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="Nhập từ khóa tìm kiếm (ví dụ: máy in, vietqr, hoa hồng, offline...)"
                  className="h-12 w-full rounded-2xl border border-white/15 bg-white/10 pl-11 pr-4 text-xs text-white placeholder-slate-400 outline-none backdrop-blur-md transition focus:border-violet-400 focus:bg-white/15 focus:ring-4 focus:ring-violet-500/20"
                />
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {['ALL', 'POS, Thu ngân & Thanh toán', 'Máy in hóa đơn & Thiết bị phần cứng', 'Lịch hẹn & Đặt lịch online', 'Tài khoản, Phân quyền & Nhân sự'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setKbCategory(cat)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  kbCategory === cat
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {cat === 'ALL' ? 'Tất cả chủ đề' : cat}
              </button>
            ))}
          </div>

          {/* Articles Accordion List */}
          <div className="space-y-3">
            {filteredKbArticles.map((article) => {
              const isExpanded = expandedKbId === article.id;
              return (
                <article
                  key={article.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    onClick={() => setExpandedKbId(isExpanded ? null : article.id)}
                    className="flex cursor-pointer items-start justify-between gap-4 p-5 hover:bg-slate-50/80 dark:hover:bg-slate-850"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-caption font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          {article.category}
                        </span>
                        <span className="text-caption text-slate-400">· {article.readTime}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                        {article.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {article.summary}
                      </p>
                    </div>

                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition dark:bg-slate-800">
                      <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90 text-violet-600' : ''}`} />
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-850/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Các bước thực hiện chuẩn:</p>
                      <ol className="mt-3 space-y-2 text-xs leading-6 text-slate-700 dark:text-slate-300">
                        {article.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-black text-white">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>

                      {article.tip && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div>
                            <span className="font-bold">Mẹo vận hành: </span>
                            {article.tip}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <div className="flex flex-wrap gap-1.5">
                          {article.tags.map((tag) => (
                            <span key={tag} className="rounded-lg bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormSubject(`Cần hỗ trợ về: ${article.title}`);
                            setFormCategory(article.category);
                            setCreateModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
                        >
                          <span>Chưa giải quyết được? Gửi yêu cầu hỗ trợ</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT CHANNELS & SLA MATRIX */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Phone className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">Hotline Kỹ thuật 24/7</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dành riêng cho sự cố khẩn cấp và lỗi quẹt thẻ tại quầy.</p>
              <p className="mt-4 text-lg font-black text-emerald-600 dark:text-emerald-400">1900 886 999</p>
              <button
                type="button"
                onClick={() => setCallModalOpen(true)}
                className="mt-3 flex h-9 w-full items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Gọi tổng đài hỗ trợ
              </button>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <MessageSquare className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">Zalo OA Hỗ trợ</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nhắn tin trực tiếp với Kỹ thuật viên qua Zalo Official Account.</p>
              <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">Zalo: SalonSys Official</p>
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
              >
                <span>Mở Zalo Chat</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                <Mail className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">Email Tiếp nhận</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tiếp nhận yêu cầu nâng cấp gói, đối soát và tài liệu kế toán.</p>
              <p className="mt-4 text-sm font-bold text-violet-600 dark:text-violet-400">support@salonsys.vn</p>
              <a
                href="mailto:support@salonsys.vn"
                className="mt-3 flex h-9 w-full items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
              >
                Gửi email yêu cầu
              </a>
            </article>
          </div>

          {/* SLA Commitment Table */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Cam kết chất lượng dịch vụ (SLA)</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thời gian phản hồi và xử lý tối đa theo từng gói thuê bao của Salon.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-3 pr-4">Mức độ ưu tiên</th>
                    <th className="py-3 px-4">Gói Basic</th>
                    <th className="py-3 px-4">Gói Standard</th>
                    <th className="py-3 px-4 bg-violet-50/60 font-black text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                      Gói Premium (Hiện tại)
                    </th>
                    <th className="py-3 pl-4">Gói Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-rose-600">🔴 Khẩn cấp (Chết POS / Mất kết nối)</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">&lt; 1 giờ</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">&lt; 30 phút</td>
                    <td className="py-3.5 px-4 bg-violet-50/60 font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">&lt; 15 phút</td>
                    <td className="py-3.5 pl-4 font-bold text-emerald-600">&lt; 5 phút (Hotline riêng)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-amber-600">🟠 Cao (Lỗi tính năng chính)</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">&lt; 4 giờ</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">&lt; 2 giờ</td>
                    <td className="py-3.5 px-4 bg-violet-50/60 font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">&lt; 1 giờ</td>
                    <td className="py-3.5 pl-4 font-bold text-emerald-600">&lt; 30 phút</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-blue-600">🟡 Trung bình (Thắc mắc / Hướng dẫn)</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">&lt; 12 giờ</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">&lt; 6 giờ</td>
                    <td className="py-3.5 px-4 bg-violet-50/60 font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">&lt; 3 giờ</td>
                    <td className="py-3.5 pl-4 font-bold text-emerald-600">&lt; 1 giờ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SUPPORT TICKET */}
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Tạo yêu cầu hỗ trợ mới gửi Superadmin"
          size="medium"
        >
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Tiêu đề yêu cầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Ví dụ: Máy in bill chi nhánh Quận 1 không tự cắt giấy"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Danh mục sự cố
                </label>
                <BeautifulSelect
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </BeautifulSelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mức độ ưu tiên
                </label>
                <BeautifulSelect
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as Ticket['priority'])}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="URGENT">Khẩn cấp (Ảnh hưởng thu ngân / Đang nghẽn)</option>
                  <option value="HIGH">Cao (Lỗi một phần tính năng quan trọng)</option>
                  <option value="MEDIUM">Trung bình (Cần hỗ trợ trong ngày)</option>
                  <option value="LOW">Thấp (Góp ý / Thắc mắc chung)</option>
                </BeautifulSelect>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kênh liên hệ mong muốn
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  { key: 'CHAT', label: 'Nhắn qua App', icon: MessageSquare },
                  { key: 'PHONE', label: 'Gọi điện thoại', icon: Phone },
                  { key: 'EMAIL', label: 'Email', icon: Mail }
                ].map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => setFormChannel(ch.key as Ticket['channel'])}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${
                      formChannel === ch.key
                        ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-400 dark:bg-violet-950 dark:text-violet-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <ch.icon className="h-4 w-4" />
                    <span>{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Chi tiết sự cố & Bước tái hiện <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mô tả cụ thể hiện tượng xảy ra, máy số mấy, chi nhánh nào và thông báo lỗi hiển thị trên màn hình..."
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Đính kèm hình ảnh chụp lỗi màn hình (tùy chọn)
              </label>

              {/* Hidden file input for create ticket */}
              <input
                type="file"
                ref={createFileInputRef}
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleCreateFilesAdded(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              <div className="mt-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-violet-400 bg-violet-50/50 px-4 text-xs font-bold text-violet-700 hover:bg-violet-100/70 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300 transition"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Tải ảnh chụp màn hình lên</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB)
                  </span>
                </div>

                {createAttachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {createAttachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pr-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        {file.url ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="max-w-[130px] truncate">
                          <p className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{file.size}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCreateAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                          className="ml-1 rounded p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-6 text-xs font-black text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
              >
                <Check className="h-4 w-4" />
                <span>Gửi yêu cầu ngay</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DIRECT CALL HOTLINE */}
      {callModalOpen && (
        <Modal
          open={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          title="Tổng đài hỗ trợ kỹ thuật SalonSys 24/7"
          size="small"
        >
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Phone className="h-8 w-8" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">1900 886 999</h4>
              <p className="mt-1 text-xs text-slate-500">Phím 1: Hỗ trợ khẩn cấp POS & Thanh toán · Phím 2: Hỗ trợ máy in & Thiết bị</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-left text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">Thông tin định danh salon khi gọi:</p>
              <p className="mt-1">• Tên tiệm: <strong>{tenantName}</strong></p>
              <p>• Gói cước: <strong className="text-violet-600">{planName} (Ưu tiên line 1)</strong></p>
              <p>• Mã quản trị: <strong>{tenantId}</strong></p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCallModalOpen(false)}
                className="h-10 w-full rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: SATISFACTION RATING (CSAT) */}
      {feedbackModalOpen && selectedTicket && (
        <Modal
          open={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          title="Đánh giá chất lượng hỗ trợ"
          size="small"
        >
          <div className="space-y-4 text-center">
            <p className="text-xs text-slate-500">
              Bạn đánh giá thế nào về tốc độ và chất lượng giải quyết yêu cầu <strong>{selectedTicket.id}</strong>?
            </p>

            {/* 5 Stars Selector */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRatingScore(score)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      score <= ratingScore ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-xs font-black text-amber-600">
              {ratingScore === 5 && 'Tuyệt vời, xử lý rất nhanh và tận tình!'}
              {ratingScore === 4 && 'Hài lòng, vấn đề đã được giải quyết.'}
              {ratingScore === 3 && 'Bình thường, cần cải thiện tốc độ.'}
              {ratingScore === 2 && 'Chưa hài lòng, mất nhiều thời gian.'}
              {ratingScore === 1 && 'Rất không hài lòng.'}
            </p>

            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Nhập nhận xét hoặc đóng góp ý kiến (không bắt buộc)..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                className="h-10 rounded-xl bg-violet-600 px-5 text-xs font-black text-white shadow-sm hover:bg-violet-700"
              >
                Gửi đánh giá
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: IMAGE LIGHTBOX PREVIEW */}
      {previewImage && (
        <Modal
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={previewImage.name || 'Ảnh đính kèm'}
          size="large"
        >
          <div className="space-y-4">
            <div className="flex max-h-[70vh] min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-2 shadow-inner">
              {previewImage.url ? (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <ImageIcon className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-2 text-xs">Không có dữ liệu hiển thị ảnh xem trước.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800 dark:text-slate-200">{previewImage.name}</span>
                {previewImage.size && <span className="ml-2 font-medium text-slate-400">({previewImage.size})</span>}
              </div>

              <div className="flex items-center gap-2">
                {previewImage.url && (
                  <a
                    href={previewImage.url}
                    download={previewImage.name || 'anh-dinh-kem.png'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải xuống</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
