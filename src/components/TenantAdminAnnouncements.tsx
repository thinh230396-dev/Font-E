import { useState, useMemo } from 'react';
import {
  Megaphone,
  Bell,
  CheckCheck,
  Search,
  Filter,
  Pin,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  Wrench,
  Tag,
  BookOpen,
  Inbox,
  CheckCircle2,
  Flame,
  Check
} from 'lucide-react';
import {
  SystemAnnouncement,
  AnnouncementCategory,
  Tenant
} from '../types';
import {
  getCategoryLabel,
  getPriorityBadge,
  isAnnouncementReadByTenant,
  markAnnouncementRead,
  markAllAnnouncementsRead
} from '../utils/systemAnnouncements';
import { formatAlertTimestamp } from '../utils/alerts';

interface TenantAdminAnnouncementsProps {
  tenantName: string;
  tenant?: Partial<Tenant> | null;
  announcements: SystemAnnouncement[];
  onUpdateAnnouncements: (updated: SystemAnnouncement[]) => void;
  onNavigatePage?: (page: any) => void;
  onNotify?: (message: string) => void;
}

type StatusTab = 'ALL' | 'UNREAD' | 'URGENT' | 'PINNED';

export default function TenantAdminAnnouncements({
  tenantName,
  tenant,
  announcements,
  onUpdateAnnouncements,
  onNavigatePage,
  onNotify
}: TenantAdminAnnouncementsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatusTab, setSelectedStatusTab] = useState<StatusTab>('ALL');
  const [readingAnnouncement, setReadingAnnouncement] = useState<SystemAnnouncement | null>(null);

  const tenantId = tenant?.id || 'TENANT-DEFAULT';

  // Filter announcements for current tenant: ONLY PUBLISHED
  const tenantScopedAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (item.status !== 'PUBLISHED') return false;
      if (item.targetAudience === 'ALL_TENANTS') return true;
      if (item.targetAudience === 'SPECIFIC_PACKAGE') {
        if (!tenant?.packageName) return true;
        return item.targetPackageNames?.includes(tenant.packageName as any);
      }
      if (item.targetAudience === 'SPECIFIC_TENANTS') {
        if (!tenant?.id) return true;
        return item.targetTenantIds?.includes(tenant.id) || (tenant.name && item.targetTenantIds?.includes(tenant.name));
      }
      return true;
    });
  }, [announcements, tenant]);

  // Counts for tabs
  const totalCount = tenantScopedAnnouncements.length;

  const unreadCount = useMemo(() => {
    return tenantScopedAnnouncements.filter((a) => !isAnnouncementReadByTenant(a, tenantId)).length;
  }, [tenantScopedAnnouncements, tenantId]);

  const urgentCount = useMemo(() => {
    return tenantScopedAnnouncements.filter((a) => a.priority === 'URGENT' || a.priority === 'HIGH').length;
  }, [tenantScopedAnnouncements]);

  const pinnedCount = useMemo(() => {
    return tenantScopedAnnouncements.filter((a) => a.pinned).length;
  }, [tenantScopedAnnouncements]);

  // Apply search, category and status tab filters
  const filteredAnnouncements = useMemo(() => {
    return tenantScopedAnnouncements
      .filter((item) => {
        const isRead = isAnnouncementReadByTenant(item, tenantId);

        // Status tab filtering
        if (selectedStatusTab === 'UNREAD' && isRead) return false;
        if (selectedStatusTab === 'URGENT' && item.priority !== 'URGENT' && item.priority !== 'HIGH') return false;
        if (selectedStatusTab === 'PINNED' && !item.pinned) return false;

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchSummary = item.summary.toLowerCase().includes(query);
          const matchContent = item.content.toLowerCase().includes(query);
          const matchAuthor = item.authorName.toLowerCase().includes(query);
          if (!matchTitle && !matchSummary && !matchContent && !matchAuthor) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned first, then urgent, then date
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
        if (a.priority !== 'URGENT' && b.priority === 'URGENT') return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [tenantScopedAnnouncements, searchQuery, selectedCategory, selectedStatusTab, tenantId]);

  const handleOpenAnnouncement = (item: SystemAnnouncement) => {
    setReadingAnnouncement(item);
    if (!isAnnouncementReadByTenant(item, tenantId)) {
      const updated = markAnnouncementRead(item.id, tenantId, announcements);
      onUpdateAnnouncements(updated);
    }
  };

  const handleMarkSingleRead = (e: React.MouseEvent, item: SystemAnnouncement) => {
    e.stopPropagation();
    if (!isAnnouncementReadByTenant(item, tenantId)) {
      const updated = markAnnouncementRead(item.id, tenantId, announcements);
      onUpdateAnnouncements(updated);
      onNotify?.(`Đã đánh dấu đã đọc thông báo: "${item.title}"`);
    }
  };

  const handleMarkAllRead = () => {
    const updated = markAllAnnouncementsRead(tenantId, announcements);
    onUpdateAnnouncements(updated);
    onNotify?.('Đã đánh dấu tất cả thông báo hệ thống là đã đọc.');
  };

  const getCategoryIcon = (category: AnnouncementCategory) => {
    switch (category) {
      case 'MAINTENANCE':
        return <Wrench className="h-4 w-4 text-amber-500" />;
      case 'POLICY_UPDATE':
        return <Tag className="h-4 w-4 text-blue-500" />;
      case 'FEATURE_RELEASE':
        return <Sparkles className="h-4 w-4 text-violet-500" />;
      case 'OPERATING_TIPS':
        return <BookOpen className="h-4 w-4 text-emerald-500" />;
      case 'BILLING':
        return <Layers className="h-4 w-4 text-pink-500" />;
      default:
        return <Megaphone className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#171328] via-[#2a1c4a] to-[#432371] p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Megaphone className="h-4 w-4 text-violet-300" />
              </span>
              <span className="text-caption font-black uppercase tracking-[0.2em] text-violet-300">
                SalonSys Broadcast Hub
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
              Bản tin & Thông báo Hệ thống
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kênh thông tin chính thức từ Ban Quản trị Super Admin gửi đến {tenantName}. Cập nhật lịch bảo trì, tính năng mới và quy định vận hành.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="Đánh dấu tất cả thông báo là đã đọc"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-3.5 sm:px-4 text-caption font-bold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95 cursor-pointer"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Đánh dấu đã đọc ({unreadCount})</span>
              </button>
            )}

            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 text-caption font-bold backdrop-blur-md">
              <Inbox className="h-4 w-4 text-violet-300" />
              <span>{totalCount} bản tin</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {unreadCount} mới
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả bản tin', count: totalCount, icon: Inbox },
              { id: 'UNREAD', label: 'Chưa đọc', count: unreadCount, icon: Bell },
              { id: 'URGENT', label: 'Khẩn cấp', count: urgentCount, icon: Flame },
              { id: 'PINNED', label: 'Đã ghim', count: pinnedCount, icon: Pin }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatusTab(tab.id as StatusTab)}
                  className={`inline-flex items-center gap-1.5 h-9 rounded-xl px-3.5 text-caption font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.id === 'UNREAD'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-0 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-caption outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Chủ đề:
          </span>
          {[
            { id: 'ALL', label: 'Tất cả chủ đề' },
            { id: 'MAINTENANCE', label: 'Bảo trì hệ thống' },
            { id: 'POLICY_UPDATE', label: 'Chính sách & Bảng giá' },
            { id: 'OPERATING_TIPS', label: 'Mẹo vận hành' },
            { id: 'FEATURE_RELEASE', label: 'Tính năng mới' },
            { id: 'BILLING', label: 'Hóa đơn' },
            { id: 'GENERAL', label: 'Chung' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-800">
            {selectedStatusTab === 'UNREAD'
              ? 'Tuyệt vời! Bạn đã đọc hết tất cả bản tin.'
              : 'Không có bản tin nào'}
          </h3>
          <p className="mt-1 text-caption text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem các thông báo khác.'
              : 'Khi Ban Quản trị Super Admin phát sóng thông báo mới, nội dung sẽ xuất hiện ngay tại đây.'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL' || selectedStatusTab !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedStatusTab('ALL');
              }}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-caption font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Về tất cả bản tin
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredAnnouncements.map((item) => {
            const isRead = isAnnouncementReadByTenant(item, tenantId);
            const priorityBadge = getPriorityBadge(item.priority);

            return (
              <div
                key={item.id}
                onClick={() => handleOpenAnnouncement(item)}
                className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 hover:border-violet-300 hover:shadow-md ${
                  !isRead
                    ? 'border-violet-200 bg-white shadow-sm ring-1 ring-violet-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-violet-50 transition">
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                            <Pin className="h-3 w-3" /> Đã ghim
                          </span>
                        )}

                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${priorityBadge.tone}`}>
                          {priorityBadge.label}
                        </span>

                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {getCategoryLabel(item.category)}
                        </span>

                        {!isRead ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            Mới
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            <Check className="h-3 w-3 text-emerald-600" /> Đã đọc
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-base font-black text-slate-900 group-hover:text-violet-700 transition leading-snug">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-caption text-slate-500 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Footer info */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-400">
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="h-3 w-3 text-slate-400" />
                          <strong>{item.authorName}</strong> ({item.authorRole})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatAlertTimestamp(item.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    {!isRead ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkSingleRead(e, item)}
                        title="Đánh dấu đã đọc"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-caption font-bold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Đánh dấu đã đọc</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Đã đọc
                      </span>
                    )}

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-1.5 text-caption font-black text-violet-700 group-hover:bg-violet-600 group-hover:text-white transition shadow-sm cursor-pointer"
                    >
                      <span>Xem nội dung</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Announcement Detail Modal */}
      {readingAnnouncement && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={readingAnnouncement.title}
        >
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#171328] to-[#3a2062] p-6 text-white shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${getPriorityBadge(readingAnnouncement.priority).tone}`}>
                      {getPriorityBadge(readingAnnouncement.priority).label}
                    </span>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                      {getCategoryLabel(readingAnnouncement.category)}
                    </span>
                    {readingAnnouncement.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                        <Pin className="h-3 w-3" /> Đã ghim
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black leading-snug">
                    {readingAnnouncement.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-caption text-slate-300 pt-1">
                    <span>Người gửi: <strong>{readingAnnouncement.authorName}</strong> ({readingAnnouncement.authorRole})</span>
                    <span>·</span>
                    <span>{formatAlertTimestamp(readingAnnouncement.publishedAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReadingAnnouncement(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary box */}
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-xs font-semibold leading-relaxed text-violet-900">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 mb-1">Tóm tắt thông báo</p>
                {readingAnnouncement.summary}
              </div>

              {/* Main Content Formatted */}
              <div className="prose prose-slate max-w-none text-caption text-slate-700 leading-relaxed whitespace-pre-line space-y-3">
                {readingAnnouncement.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReadingAnnouncement(null)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-caption font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              {readingAnnouncement.actionUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const target = readingAnnouncement.actionUrl;
                    setReadingAnnouncement(null);
                    if (target && onNavigatePage) {
                      onNavigatePage(target);
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-caption font-black text-white hover:bg-violet-700 shadow-md shadow-violet-200 cursor-pointer"
                >
                  <span>{readingAnnouncement.actionLabel || 'Xem tác vụ liên quan'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
