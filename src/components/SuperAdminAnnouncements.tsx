import { useState, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Send,
  Pin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Users,
  Eye,
  Trash2,
  Edit3,
  Archive,
  RotateCcw,
  Layers,
  Sparkles,
  Wrench,
  Tag,
  BookOpen,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import {
  SystemAnnouncement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  SubscriptionPackageName,
  Tenant
} from '../types';
import {
  getCategoryLabel,
  getPriorityBadge,
  saveSystemAnnouncements
} from '../utils/systemAnnouncements';
import { formatAlertTimestamp } from '../utils/alerts';
import { recordAuditLog } from '../utils/auditLogs';
import BeautifulSelect from './BeautifulSelect';

interface SuperAdminAnnouncementsProps {
  announcements: SystemAnnouncement[];
  onUpdateAnnouncements: (updated: SystemAnnouncement[]) => void;
  tenants: Tenant[];
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SuperAdminAnnouncements({
  announcements,
  onUpdateAnnouncements,
  tenants,
  onNotify
}: SuperAdminAnnouncementsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemAnnouncement | null>(null);
  const [viewingItem, setViewingItem] = useState<SystemAnnouncement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: '',
    confirmVariant: 'primary',
    onConfirm: () => {}
  });

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('MAINTENANCE');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('NORMAL');
  const [formAudience, setFormAudience] = useState<AnnouncementAudience>('ALL_TENANTS');
  const [formPackages, setFormPackages] = useState<SubscriptionPackageName[]>(['Premium', 'Enterprise']);
  const [formTenantIds, setFormTenantIds] = useState<string[]>([]);
  const [formBannerEnabled, setFormBannerEnabled] = useState(true);
  const [formPinned, setFormPinned] = useState(false);
  const [formActionLabel, setFormActionLabel] = useState('');
  const [formActionUrl, setFormActionUrl] = useState('');
  const [formAuthorName, setFormAuthorName] = useState('SalonSys Super Admin');
  const [formAuthorRole, setFormAuthorRole] = useState('Ban Quản trị Hệ thống');

  const stats = useMemo(() => {
    const published = announcements.filter((a) => a.status === 'PUBLISHED').length;
    const drafts = announcements.filter((a) => a.status === 'DRAFT').length;
    const archived = announcements.filter((a) => a.status === 'ARCHIVED').length;
    const activeTotal = published + drafts;
    const maintenance = announcements.filter((a) => a.category === 'MAINTENANCE' && a.status === 'PUBLISHED').length;
    const totalReads = announcements.reduce((sum, a) => sum + (a.readByTenantIds?.length || 0), 0);

    return { total: activeTotal, allTotal: announcements.length, published, drafts, maintenance, totalReads, archived };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchSummary = item.summary.toLowerCase().includes(q);
          const matchAuthor = item.authorName.toLowerCase().includes(q);
          if (!matchTitle && !matchSummary && !matchAuthor) return false;
        }

        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
          return false;
        }

        // When viewing 'ALL', only show active announcements (PUBLISHED and DRAFT); archived items stay in 'Kho lưu trữ' only
        if (statusFilter === 'ALL') {
          if (item.status === 'ARCHIVED') return false;
        } else if (item.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements, searchQuery, categoryFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAnnouncements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAnnouncements.map((a) => a.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const requestBulkArchive = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận lưu trữ ${selectedIds.length} bản tin`,
      description: (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            Bạn có chắc chắn muốn chuyển <strong>{selectedIds.length}</strong> bản tin đã chọn vào mục Lưu trữ?
          </p>
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Lưu ý khi lưu trữ hàng loạt:
            </p>
            <p className="text-[11px] leading-relaxed">
              Tất cả các bản tin này sẽ chuyển sang tab <strong>Đã lưu trữ</strong> và <strong>bị ẩn hoàn toàn khỏi tất cả cổng Salon (Tenant Admin)</strong>. Bạn có thể vào tab Đã lưu trữ để khôi phục (Hiện lại) bất cứ khi nào.
            </p>
          </div>
        </div>
      ),
      confirmLabel: `Lưu trữ ${selectedIds.length} bản tin`,
      confirmVariant: 'warning',
      onConfirm: () => {
        const nextList = announcements.map((a) =>
          selectedIds.includes(a.id) ? { ...a, status: 'ARCHIVED' as const } : a
        );
        onUpdateAnnouncements(nextList);
        saveSystemAnnouncements(nextList);
        setSelectedIds([]);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onNotify?.(`Đã chuyển ${selectedIds.length} bản tin vào mục Lưu trữ để làm gọn màn hình.`, 'success');
      }
    });
  };

  const requestBulkRestore = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận phát sóng lại ${selectedIds.length} bản tin`,
      description: (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            Bạn có chắc muốn phát sóng lại <strong>{selectedIds.length}</strong> bản tin đã chọn?
          </p>
          <p className="text-xs text-emerald-700 font-medium">
            ✓ Các bản tin này sẽ chuyển sang trạng thái <strong>Đang phát sóng</strong> và hiển thị trở lại trên toàn bộ cổng Salon (Tenant Admin).
          </p>
        </div>
      ),
      confirmLabel: `Phát sóng lại (${selectedIds.length})`,
      confirmVariant: 'success',
      onConfirm: () => {
        const nextList = announcements.map((a) =>
          selectedIds.includes(a.id) ? { ...a, status: 'PUBLISHED' as const } : a
        );
        onUpdateAnnouncements(nextList);
        saveSystemAnnouncements(nextList);
        setSelectedIds([]);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onNotify?.(`Đã khôi phục phát sóng ${selectedIds.length} bản tin.`, 'success');
      }
    });
  };

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận xóa vĩnh viễn ${selectedIds.length} bản tin`,
      description: (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-600">
            Bạn đang yêu cầu xóa vĩnh viễn <strong>{selectedIds.length}</strong> bản tin đã chọn.
          </p>
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              Cảnh báo xóa hàng loạt:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Tất cả {selectedIds.length} bản tin sẽ bị <strong>xóa hoàn toàn khỏi cơ sở dữ liệu hệ thống</strong>.</li>
              <li>Phía <strong>toàn bộ Tenant Admin cũng sẽ mất theo ngay lập tức</strong>.</li>
              <li>Hành động này không thể hoàn tác!</li>
            </ul>
          </div>
        </div>
      ),
      confirmLabel: `Xóa vĩnh viễn (${selectedIds.length})`,
      confirmVariant: 'danger',
      onConfirm: () => {
        const nextList = announcements.filter((a) => !selectedIds.includes(a.id));
        onUpdateAnnouncements(nextList);
        saveSystemAnnouncements(nextList);
        setSelectedIds([]);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onNotify?.(`Đã xóa sạch ${selectedIds.length} bản tin khỏi hệ thống.`, 'info');
      }
    });
  };

  const requestArchiveOlderThan30Days = () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const targets = announcements.filter(
      (a) => a.status === 'PUBLISHED' && new Date(a.publishedAt || a.createdAt).getTime() < thirtyDaysAgo
    );
    if (targets.length === 0) {
      onNotify?.('Không có bản tin nào cũ hơn 30 ngày cần lưu trữ.', 'info');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Lưu trữ bản tin cũ hơn 30 ngày',
      description: (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            Tìm thấy <strong>{targets.length}</strong> bản tin đang phát sóng đã tồn tại hơn 30 ngày.
          </p>
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Làm gọn giao diện:
            </p>
            <p className="text-[11px] leading-relaxed">
              Chuyển tất cả {targets.length} bản tin này vào mục <strong>Đã lưu trữ</strong> để dọn dẹp màn hình cho cả Superadmin và Tenant Admin. Bạn vẫn có thể mở lại bất cứ lúc nào.
            </p>
          </div>
        </div>
      ),
      confirmLabel: `Lưu trữ ${targets.length} bản tin cũ`,
      confirmVariant: 'warning',
      onConfirm: () => {
        const nextList = announcements.map((a) =>
          a.status === 'PUBLISHED' && new Date(a.publishedAt || a.createdAt).getTime() < thirtyDaysAgo
            ? { ...a, status: 'ARCHIVED' as const }
            : a
        );
        onUpdateAnnouncements(nextList);
        saveSystemAnnouncements(nextList);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onNotify?.(`Đã lưu trữ ${targets.length} bản tin cũ hơn 30 ngày. Màn hình đã được dọn dẹp gọn gàng!`, 'success');
      }
    });
  };

  const resetForm = () => {
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormCategory('MAINTENANCE');
    setFormPriority('NORMAL');
    setFormAudience('ALL_TENANTS');
    setFormPackages(['Premium', 'Enterprise']);
    setFormTenantIds([]);
    setFormBannerEnabled(true);
    setFormPinned(false);
    setFormActionLabel('');
    setFormActionUrl('');
    setFormAuthorName('SalonSys Super Admin');
    setFormAuthorRole('Ban Quản trị Hệ thống');
    setEditingItem(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (item: SystemAnnouncement) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormSummary(item.summary);
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormAudience(item.targetAudience);
    setFormPackages(item.targetPackageNames || ['Premium']);
    setFormTenantIds(item.targetTenantIds || []);
    setFormBannerEnabled(item.bannerEnabled ?? false);
    setFormPinned(item.pinned ?? false);
    setFormActionLabel(item.actionLabel || '');
    setFormActionUrl(item.actionUrl || '');
    setFormAuthorName(item.authorName);
    setFormAuthorRole(item.authorRole);
    setShowCreateModal(true);
  };

  const handleSaveAnnouncement = (isPublish: boolean) => {
    if (!formTitle.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề thông báo', 'error');
      return;
    }
    if (!formContent.trim()) {
      onNotify?.('Vui lòng nhập nội dung chi tiết thông báo', 'error');
      return;
    }

    const now = new Date().toISOString();
    const summary = formSummary.trim() || formContent.slice(0, 150) + '...';

    if (editingItem) {
      // Update existing
      const updated: SystemAnnouncement = {
        ...editingItem,
        title: formTitle.trim(),
        summary,
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        targetAudience: formAudience,
        targetPackageNames: formAudience === 'SPECIFIC_PACKAGE' ? formPackages : undefined,
        targetTenantIds: formAudience === 'SPECIFIC_TENANTS' ? formTenantIds : undefined,
        bannerEnabled: formBannerEnabled,
        pinned: formPinned,
        actionLabel: formActionLabel.trim() || undefined,
        actionUrl: formActionUrl.trim() || undefined,
        authorName: formAuthorName.trim() || 'Super Admin',
        authorRole: formAuthorRole.trim() || 'Ban Quản trị Hệ thống',
        status: isPublish ? 'PUBLISHED' : editingItem.status,
        updatedAt: now
      };

      const nextList = announcements.map((a) => (a.id === updated.id ? updated : a));
      onUpdateAnnouncements(nextList);
      saveSystemAnnouncements(nextList);

      recordAuditLog({
        eventCode: 'ANNOUNCEMENT.UPDATED',
        event: 'Cập nhật thông báo hệ thống',
        description: `Superadmin đã cập nhật thông báo: "${updated.title}" (${getCategoryLabel(updated.category)})`,
        category: 'SYSTEM',
        severity: updated.priority === 'URGENT' ? 'high' : 'medium',
        status: 'success',
        resource: 'ANNOUNCEMENTS'
      });

      onNotify?.('Đã cập nhật thông báo thành công!', 'success');
    } else {
      // Create new
      const newId = `ANN-${new Date().getFullYear()}-${String(announcements.length + 1).padStart(3, '0')}`;
      const newAnnouncement: SystemAnnouncement = {
        id: newId,
        title: formTitle.trim(),
        summary,
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        targetAudience: formAudience,
        targetPackageNames: formAudience === 'SPECIFIC_PACKAGE' ? formPackages : undefined,
        targetTenantIds: formAudience === 'SPECIFIC_TENANTS' ? formTenantIds : undefined,
        bannerEnabled: formBannerEnabled,
        pinned: formPinned,
        actionLabel: formActionLabel.trim() || undefined,
        actionUrl: formActionUrl.trim() || undefined,
        authorName: formAuthorName.trim() || 'SalonSys Super Admin',
        authorRole: formAuthorRole.trim() || 'Ban Quản trị Hệ thống',
        publishedAt: now,
        status: isPublish ? 'PUBLISHED' : 'DRAFT',
        readByTenantIds: [],
        dismissedBannerTenantIds: [],
        createdAt: now
      };

      const nextList = [newAnnouncement, ...announcements];
      onUpdateAnnouncements(nextList);
      saveSystemAnnouncements(nextList);

      recordAuditLog({
        eventCode: isPublish ? 'ANNOUNCEMENT.BROADCAST' : 'ANNOUNCEMENT.DRAFTED',
        event: isPublish ? 'Phát sóng thông báo toàn hệ thống' : 'Lưu bản nháp thông báo',
        description: `Superadmin đã phát sóng thông báo: "${newAnnouncement.title}" tới đối tượng: ${newAnnouncement.targetAudience}`,
        category: 'SYSTEM',
        severity: newAnnouncement.priority === 'URGENT' ? 'high' : 'medium',
        status: 'success',
        resource: 'ANNOUNCEMENTS'
      });

      onNotify?.(isPublish ? 'Đã phát sóng thông báo tới các Tenant!' : 'Đã lưu bản nháp thông báo.', 'success');
    }

    setShowCreateModal(false);
    resetForm();
  };

  const handleDeleteAnnouncement = (id: string) => {
    const item = announcements.find((a) => a.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa vĩnh viễn thông báo',
      description: (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-600">
            Bạn có chắc chắn muốn xóa thông báo này khỏi hệ thống?
          </p>
          {item && (
            <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
              <p className="text-xs font-bold text-slate-900">{item.title}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.summary}</p>
            </div>
          )}
          <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              Cảnh báo quan trọng:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
              <li>Bản tin sẽ bị <strong>xóa hoàn toàn khỏi cơ sở dữ liệu hệ thống</strong>.</li>
              <li>Phía <strong>toàn bộ Tenant Admin cũng sẽ bị mất thông báo này ngay lập tức</strong>.</li>
              <li>Hành động này không thể hoàn tác!</li>
            </ul>
          </div>
        </div>
      ),
      confirmLabel: 'Xóa vĩnh viễn',
      confirmVariant: 'danger',
      onConfirm: () => {
        const nextList = announcements.filter((a) => a.id !== id);
        onUpdateAnnouncements(nextList);
        saveSystemAnnouncements(nextList);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (viewingItem?.id === id) {
          setViewingItem(null);
        }
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        onNotify?.('Đã xóa thông báo khỏi toàn hệ thống.', 'info');
      }
    });
  };

  const handleToggleArchive = (item: SystemAnnouncement) => {
    const isCurrentlyArchived = item.status === 'ARCHIVED';
    if (isCurrentlyArchived) {
      setConfirmModal({
        isOpen: true,
        title: 'Xác nhận phát sóng lại thông báo',
        description: (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn kích hoạt và phát sóng lại thông báo:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-900">{item.title}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.summary}</p>
            </div>
            <p className="text-xs text-emerald-700 font-medium leading-relaxed">
              ✓ Bản tin sẽ chuyển sang trạng thái <strong>Đang phát sóng</strong> và lập tức hiển thị trở lại trên toàn bộ cổng Salon (Tenant Admin).
            </p>
          </div>
        ),
        confirmLabel: 'Hiện lại (Phát sóng)',
        confirmVariant: 'success',
        onConfirm: () => {
          const nextList: SystemAnnouncement[] = announcements.map((a) =>
            a.id === item.id ? { ...a, status: 'PUBLISHED' as const } : a
          );
          onUpdateAnnouncements(nextList);
          saveSystemAnnouncements(nextList);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          if (viewingItem?.id === item.id) {
            setViewingItem({ ...item, status: 'PUBLISHED' });
          }
          onNotify?.('Đã phát sóng lại thông báo lên toàn hệ thống.', 'success');
        }
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'Xác nhận lưu trữ thông báo',
        description: (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn chuyển thông báo này vào mục Lưu trữ?
            </p>
            <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
              <p className="text-xs font-bold text-slate-900">{item.title}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.summary}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Hiệu lực áp dụng:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
                <li>Thông báo sẽ <strong>bị ẩn hoàn toàn khỏi tất cả các cổng Salon (Tenant Admin)</strong>.</li>
                <li>Dữ liệu và lịch sử đọc vẫn được giữ nguyên vẹn trong tab <strong>Đã lưu trữ</strong> của Superadmin.</li>
                <li>Bạn có thể vào tab <strong>Đã lưu trữ</strong> để bấm <strong>Hiện lại</strong> bất cứ lúc nào.</li>
              </ul>
            </div>
          </div>
        ),
        confirmLabel: 'Lưu trữ thông báo',
        confirmVariant: 'warning',
        onConfirm: () => {
          const nextList: SystemAnnouncement[] = announcements.map((a) =>
            a.id === item.id ? { ...a, status: 'ARCHIVED' as const } : a
          );
          onUpdateAnnouncements(nextList);
          saveSystemAnnouncements(nextList);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          if (viewingItem?.id === item.id) {
            setViewingItem({ ...item, status: 'ARCHIVED' });
          }
          onNotify?.('Đã chuyển bản tin vào mục Lưu trữ để làm gọn màn hình.', 'success');
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-primary" />
            Kênh Phát Thông Báo Hệ Thống (Broadcasts)
          </h2>
          <p className="text-xs text-brand-text-muted mt-1">
            Gửi bản tin trực tiếp xuống hộp thư và banner trên cổng Tenant Admin (Bảo trì, chính sách, mẹo vận hành).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-xs font-bold text-brand-on-primary shadow-sm hover:bg-brand-primary/90 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Soạn thông báo mới
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-brand-text-muted">Bản tin hoạt động</span>
          <p className="mt-1 text-2xl font-black text-brand-text">{stats.total}</p>
          <p className="mt-1 text-[10px] text-brand-text-muted">Đang phát & Bản nháp</p>
        </div>
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-emerald-500">Đang phát sóng</span>
          <p className="mt-1 text-2xl font-black text-emerald-600">{stats.published}</p>
          <p className="mt-1 text-[10px] text-brand-text-muted">Salon nhìn thấy trên cổng</p>
        </div>
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-amber-500">Kho lưu trữ</span>
          <p className="mt-1 text-2xl font-black text-amber-600">{stats.archived}</p>
          <p className="mt-1 text-[10px] text-brand-text-muted">Bản tin đã cất kho (ẩn)</p>
        </div>
        <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-brand-primary">Lượt đọc của Tenant</span>
          <p className="mt-1 text-2xl font-black text-brand-primary">{stats.totalReads}</p>
          <p className="mt-1 text-[10px] text-brand-text-muted">Salon đã mở xem thông báo</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-brand-surface border border-brand-outline/35 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Tất cả', count: stats.total },
              { id: 'PUBLISHED', label: 'Đang phát sóng', count: stats.published },
              { id: 'DRAFT', label: 'Bản nháp', count: stats.drafts },
              { id: 'ARCHIVED', label: 'Kho lưu trữ', count: stats.archived }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-brand-primary text-brand-on-primary shadow-xs'
                    : 'bg-brand-surface-high text-brand-text-muted hover:text-brand-text'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      statusFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : tab.id === 'ARCHIVED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-brand-surface-highest text-brand-text'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestArchiveOlderThan30Days}
              title="Lưu trữ tự động các bản tin đã phát hơn 30 ngày để màn hình luôn gọn gàng"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-outline/40 bg-brand-surface-high px-3 py-2 text-xs font-bold text-brand-text hover:bg-brand-surface-highest transition cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              Lưu trữ bản tin &gt; 30 ngày
            </button>

            <div className="relative min-w-0 md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thông báo..."
                className="h-9 w-full rounded-xl border border-brand-outline/40 bg-brand-surface-high pl-9 pr-3 text-xs text-brand-text outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-brand-outline/20 pt-3">
          <span className="text-[10px] font-bold text-brand-text-muted mr-1">Danh mục:</span>
          {[
            { id: 'ALL', label: 'Tất cả danh mục' },
            { id: 'MAINTENANCE', label: 'Bảo trì hệ thống' },
            { id: 'POLICY_UPDATE', label: 'Chính sách & Giá' },
            { id: 'OPERATING_TIPS', label: 'Mẹo vận hành' },
            { id: 'FEATURE_RELEASE', label: 'Tính năng mới' },
            { id: 'BILLING', label: 'Hóa đơn' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-brand-text text-brand-surface'
                  : 'bg-brand-surface-high text-brand-text-muted hover:text-brand-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Strip */}
      {filteredAnnouncements.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-surface-high/60 border border-brand-outline/30 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-text">
              <input
                type="checkbox"
                checked={filteredAnnouncements.length > 0 && selectedIds.length === filteredAnnouncements.length}
                onChange={toggleSelectAll}
                className="rounded border-brand-outline/60 text-brand-primary focus:ring-brand-primary/20 h-4 w-4"
              />
              <span>Chọn tất cả ({filteredAnnouncements.length})</span>
            </label>
            {selectedIds.length > 0 && (
              <span className="text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                Đã chọn {selectedIds.length} bản tin
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestBulkArchive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-outline/50 bg-brand-surface px-3 py-1.5 text-xs font-bold text-brand-text hover:bg-brand-surface-highest transition cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-amber-500" />
                Lưu trữ ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={requestBulkRestore}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-outline/50 bg-brand-surface px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Phát sóng lại ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={requestBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa bỏ ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Announcements Table / Cards */}
      <div className="space-y-3">
        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-brand-outline/35 bg-brand-surface p-12 text-center text-brand-text-muted">
            {statusFilter === 'ARCHIVED' ? (
              <>
                <Archive className="w-10 h-10 mx-auto text-amber-500/60 mb-2" />
                <p className="text-sm font-bold text-brand-text">Kho lưu trữ đang trống</p>
                <p className="text-xs text-brand-text-muted mt-1 max-w-sm mx-auto">
                  Khi bạn lưu trữ một thông báo, thông báo sẽ được chuyển vào đây để làm gọn màn hình và ẩn khỏi cổng Tenant Admin.
                </p>
              </>
            ) : (
              <>
                <Megaphone className="w-10 h-10 mx-auto text-brand-text-muted/40 mb-2" />
                <p className="text-sm font-bold text-brand-text">Chưa có thông báo nào phù hợp</p>
                <p className="text-xs text-brand-text-muted mt-1 max-w-sm mx-auto">
                  {searchQuery || categoryFilter !== 'ALL'
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                    : 'Bấm nút "Soạn thông báo mới" để phát sóng bản tin đầu tiên.'}
                </p>
              </>
            )}
          </div>
        ) : (
          filteredAnnouncements.map((item) => {
            const priorityBadge = getPriorityBadge(item.priority);
            const readCount = item.readByTenantIds?.length || 0;
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-brand-surface p-4 hover:border-brand-primary/40 transition shadow-sm ${
                  isSelected ? 'border-brand-primary ring-1 ring-brand-primary/20 bg-brand-primary/[0.02]' : 'border-brand-outline/35'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                      className="mt-1 rounded border-brand-outline/60 text-brand-primary focus:ring-brand-primary/20 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-brand-text-muted bg-brand-surface-high px-1.5 py-0.5 rounded">
                          {item.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${priorityBadge.tone}`}>
                          {priorityBadge.label}
                        </span>
                        <span className="bg-brand-surface-high px-2 py-0.5 rounded text-[10px] font-bold text-brand-text">
                          {getCategoryLabel(item.category)}
                        </span>
                        {item.pinned && (
                          <span className="bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" /> Đã ghim
                          </span>
                        )}
                        {item.bannerEnabled && (
                          <span className="bg-rose-500/15 text-rose-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            Banner khẩn cấp
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'PUBLISHED'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : item.status === 'ARCHIVED'
                            ? 'bg-slate-500/15 text-slate-500'
                            : 'bg-amber-500/15 text-amber-600'
                        }`}>
                          {item.status === 'PUBLISHED' ? 'Đang phát' : item.status === 'ARCHIVED' ? 'Đã lưu trữ' : 'Bản nháp'}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-brand-text leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-brand-text-muted line-clamp-1">
                        {item.summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-brand-text-muted pt-1">
                        <span>Đối tượng: <strong>{item.targetAudience === 'ALL_TENANTS' ? 'Toàn bộ Salon (All)' : item.targetAudience === 'SPECIFIC_PACKAGE' ? `Gói: ${item.targetPackageNames?.join(', ')}` : 'Tenant cụ thể'}</strong></span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                          <Eye className="w-3 h-3" /> {readCount} salon đã đọc
                        </span>
                        <span>·</span>
                        <span>Người gửi: <strong>{item.authorName}</strong></span>
                        <span>·</span>
                        <span>{formatAlertTimestamp(item.publishedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-brand-outline/20">
                    <button
                      type="button"
                      onClick={() => setViewingItem(item)}
                      className="px-3 py-1.5 rounded-lg border border-brand-outline/40 bg-brand-surface-high text-xs font-bold text-brand-text hover:bg-brand-surface-highest transition cursor-pointer"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg border border-brand-outline/40 bg-brand-surface-high text-brand-text hover:bg-brand-surface-highest transition cursor-pointer"
                      title="Chỉnh sửa thông báo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {item.status === 'ARCHIVED' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer shadow-xs"
                        title="Phát sóng lại - Hiển thị ngay trên Tenant Admin"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hiện lại</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(item)}
                        className="p-1.5 rounded-lg border border-brand-outline/40 bg-brand-surface-high text-brand-text hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                        title="Lưu trữ - Chuyển sang mục Đã lưu trữ và ẩn khỏi Tenant Admin"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(item.id)}
                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                      title="Xóa vĩnh viễn (Tenant Admin cũng mất theo)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose / Edit Announcement Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#171328] to-[#3a2062] p-6 text-white shrink-0 flex items-center justify-between">
              <div>
                <p className="text-caption font-black uppercase tracking-wider text-violet-300">
                  {editingItem ? 'Chỉnh sửa bản tin' : 'Soạn thông báo hệ thống mới'}
                </p>
                <h2 className="text-xl font-black mt-1">
                  {editingItem ? editingItem.title : 'Phát sóng thông báo xuống Tenant'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề thông báo *</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Thông báo bảo trì nâng cấp máy chủ định kỳ..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-caption font-semibold outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Danh mục</label>
                  <BeautifulSelect
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-caption"
                  >
                    <option value="MAINTENANCE">Bảo trì hệ thống</option>
                    <option value="POLICY_UPDATE">Chính sách & Bảng giá</option>
                    <option value="OPERATING_TIPS">Mẹo vận hành Salon</option>
                    <option value="FEATURE_RELEASE">Tính năng mới</option>
                    <option value="BILLING">Hóa đơn & Thanh toán</option>
                    <option value="GENERAL">Thông báo chung</option>
                  </BeautifulSelect>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ ưu tiên</label>
                  <BeautifulSelect
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-caption"
                  >
                    <option value="URGENT">Khẩn cấp (Đỏ)</option>
                    <option value="HIGH">Quan trọng (Cam)</option>
                    <option value="NORMAL">Bình thường (Tím)</option>
                    <option value="LOW">Tham khảo (Xám)</option>
                  </BeautifulSelect>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đối tượng nhận</label>
                  <BeautifulSelect
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-caption"
                  >
                    <option value="ALL_TENANTS">Toàn bộ Salon (Tất cả)</option>
                    <option value="SPECIFIC_PACKAGE">Theo gói dịch vụ</option>
                    <option value="SPECIFIC_TENANTS">Chọn đích danh Salon</option>
                  </BeautifulSelect>
                </div>
              </div>

              {/* Conditional audience selector */}
              {formAudience === 'SPECIFIC_PACKAGE' && (
                <div className="rounded-xl bg-violet-50 p-3">
                  <label className="block font-bold text-violet-900 mb-1">Chọn các gói nhận thông báo:</label>
                  <div className="flex gap-4">
                    {(['Basic', 'Premium', 'Enterprise'] as SubscriptionPackageName[]).map((pkg) => (
                      <label key={pkg} className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPackages.includes(pkg)}
                          onChange={(e) => {
                            if (e.target.checked) setFormPackages([...formPackages, pkg]);
                            else setFormPackages(formPackages.filter((p) => p !== pkg));
                          }}
                          className="rounded text-violet-600"
                        />
                        {pkg}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formAudience === 'SPECIFIC_TENANTS' && (
                <div className="rounded-xl bg-violet-50 p-3">
                  <label className="block font-bold text-violet-900 mb-1">Chọn Salon nhận thông báo:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {tenants.map((t) => (
                      <label key={t.id} className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer truncate">
                        <input
                          type="checkbox"
                          checked={formTenantIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormTenantIds([...formTenantIds, t.id]);
                            else setFormTenantIds(formTenantIds.filter((id) => id !== t.id));
                          }}
                          className="rounded text-violet-600"
                        />
                        <span className="truncate">{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tóm tắt ngắn (Hiển thị ngoài danh sách)</label>
                <input
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Mô tả tóm tắt nội dung chính trong 1-2 câu..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-caption outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo đầy đủ. Hỗ trợ định dạng phân đoạn, dấu gạch đầu dòng..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium text-caption outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 leading-relaxed"
                />
              </div>

              {/* Toggles & Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formBannerEnabled}
                    onChange={(e) => setFormBannerEnabled(e.target.checked)}
                    className="rounded text-violet-600 h-4 w-4"
                  />
                  <div>
                    <p className="font-bold text-slate-800">Hiện Banner khẩn cấp</p>
                    <p className="text-[11px] text-slate-500">Hiển thị thanh dải banner trên đầu trang Tenant</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="rounded text-violet-600 h-4 w-4"
                  />
                  <div>
                    <p className="font-bold text-slate-800">Ghim lên đầu hộp thư</p>
                    <p className="text-[11px] text-slate-500">Ưu tiên nằm trên cùng danh sách</p>
                  </div>
                </label>
              </div>

              {/* Attached Action Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhãn nút hành động (Tùy chọn)</label>
                  <input
                    value={formActionLabel}
                    onChange={(e) => setFormActionLabel(e.target.value)}
                    placeholder="Ví dụ: Xem gói cước, Mở cài đặt..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-caption outline-none focus:border-violet-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã trang điều hướng (Tùy chọn)</label>
                  <BeautifulSelect
                    value={formActionUrl}
                    onChange={(e) => setFormActionUrl(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-caption"
                  >
                    <option value="">Không có nút điều hướng</option>
                    <option value="subscription">Trang Gói đăng ký & Bảng giá</option>
                    <option value="settings">Trang Cài đặt tiệm</option>
                    <option value="appointments">Trang Lịch hẹn</option>
                    <option value="support">Trang Trung tâm trợ giúp</option>
                    <option value="finance">Trang Thu & Chi</option>
                  </BeautifulSelect>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 shrink-0">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSaveAnnouncement(false)}
                className="h-10 rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-bold text-violet-700 hover:bg-violet-100"
              >
                Lưu bản nháp
              </button>
              <button
                type="button"
                onClick={() => handleSaveAnnouncement(true)}
                className="h-10 rounded-xl bg-violet-600 px-5 text-xs font-black text-white hover:bg-violet-700 shadow-md shadow-violet-200 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Phát sóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Modal */}
      {viewingItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl text-slate-900">
            <div className="bg-gradient-to-r from-[#171328] to-[#3a2062] p-6 text-white shrink-0 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadge(viewingItem.priority).tone}`}>
                    {getPriorityBadge(viewingItem.priority).label}
                  </span>
                  <span className="bg-white/15 px-2 py-0.5 rounded text-[10px] font-bold text-violet-200">
                    {getCategoryLabel(viewingItem.category)}
                  </span>
                </div>
                <h2 className="text-xl font-black leading-snug">{viewingItem.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-violet-50 p-3.5 text-violet-900 font-medium">
                {viewingItem.summary}
              </div>
              <div className="whitespace-pre-line leading-relaxed text-slate-700 text-caption">
                {viewingItem.content}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleDeleteAnnouncement(item.id);
                  }}
                  className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-600 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa thông báo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingItem;
                    handleToggleArchive(item);
                    setViewingItem({
                      ...item,
                      status: item.status === 'ARCHIVED' ? 'PUBLISHED' : 'ARCHIVED'
                    });
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  {viewingItem.status === 'ARCHIVED' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hiện lại (Phát sóng)</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lưu trữ (Ẩn)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleOpenEdit(item);
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="h-9 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Action Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    confirmModal.confirmVariant === 'danger'
                      ? 'bg-rose-100 text-rose-600'
                      : confirmModal.confirmVariant === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : confirmModal.confirmVariant === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-violet-100 text-violet-600'
                  }`}
                >
                  {confirmModal.confirmVariant === 'danger' ? (
                    <Trash2 className="h-5 w-5" />
                  ) : confirmModal.confirmVariant === 'warning' ? (
                    <Archive className="h-5 w-5" />
                  ) : confirmModal.confirmVariant === 'success' ? (
                    <RotateCcw className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {confirmModal.title}
                  </h3>
                  <div className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    {confirmModal.description}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`h-9 rounded-xl px-4 text-xs font-bold text-white shadow-sm transition cursor-pointer ${
                  confirmModal.confirmVariant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.confirmVariant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmModal.confirmVariant === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
