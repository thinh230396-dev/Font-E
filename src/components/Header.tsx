import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  LogOut, 
  Shield, 
  AlertTriangle, 
  XCircle, 
  Info,
  HelpCircle,
  LifeBuoy,
  BookOpen,
  ArrowRight,
  ChevronDown,
  Settings2,
  LockKeyhole,
  CheckCircle2,
  CalendarDays,
  X
} from 'lucide-react';
import { SystemAlert } from '../types';
import { formatAlertFilterDate, formatAlertTimestamp, getAlertDateKey } from '../utils/alerts';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  alerts: SystemAlert[];
  onMarkAllAlertsAsRead: () => void;
  onAlertClick: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLogout: () => void;
  onOpenAccountSettings: () => void;
  onOpenSecurity: () => void;
  onOpenSupport: () => void;
  interfaceLanguage: 'vi' | 'en';
}

export default function Header({ 
  sidebarOpen, 
  setSidebarOpen, 
  alerts, 
  onMarkAllAlertsAsRead,
  onAlertClick,
  searchQuery,
  setSearchQuery,
  onLogout,
  onOpenAccountSettings,
  onOpenSecurity,
  onOpenSupport,
  interfaceLanguage
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [alertDate, setAlertDate] = useState('');
  const [visibleAlertCount, setVisibleAlertCount] = useState(6);
  const profileRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter(a => !a.isRead);
  const dateFilteredAlerts = alertDate
    ? alerts.filter((alert) => getAlertDateKey(alert.createdAt) === alertDate)
    : alerts;
  const dateFilteredUnreadAlerts = dateFilteredAlerts.filter((alert) => !alert.isRead);
  const filteredAlerts = alertFilter === 'UNREAD' ? dateFilteredUnreadAlerts : dateFilteredAlerts;
  const visibleAlerts = filteredAlerts.slice(0, visibleAlertCount);
  const remainingAlertCount = Math.max(0, filteredAlerts.length - visibleAlerts.length);
  const isEnglish = interfaceLanguage === 'en';
  const todayDateKey = getAlertDateKey(new Date().toISOString());

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) {
        setShowAlertMenu(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelpMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-brand-error shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default: return <Info className="w-4 h-4 text-brand-primary shrink-0" />;
    }
  };

  return (
    <header className="role-topbar sa-topbar sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-brand-outline/40 bg-brand-surface px-4 sm:px-6 lg:px-7">
      
      {/* Left side: Hamburger (Mobile) and Search */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="sa-header-icon lg:hidden p-1.5 rounded text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="sa-global-search relative hidden w-full max-w-md md:block">
          <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Tìm kiếm tenant, Tenant Admin, gói dịch vụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-10 pr-14 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary placeholder:text-brand-text-muted/60"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              aria-label="Xóa nội dung tìm kiếm"
              className="sa-search-clear absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text text-xs"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Right side: Alerts, Help, User Profile */}
      <div className="flex items-center gap-3">
        {/* System Notification Bell */}
        <div className="relative" ref={alertRef}>
          <button 
            type="button"
            onClick={() => {
              if (!showAlertMenu) setVisibleAlertCount(6);
              setShowAlertMenu(!showAlertMenu);
              setShowHelpMenu(false);
              setShowProfileMenu(false);
            }}
            title={isEnglish ? 'Notifications' : 'Thông báo'}
            aria-label={isEnglish ? `Notifications, ${unreadAlerts.length} unread` : `Thông báo, ${unreadAlerts.length} chưa đọc`}
            aria-haspopup="menu"
            aria-expanded={showAlertMenu}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border p-0 transition-colors cursor-pointer ${showAlertMenu ? 'border-brand-primary/35 bg-brand-primary/10 text-brand-primary' : 'border-transparent text-brand-text-muted hover:border-brand-outline/60 hover:bg-brand-surface-high hover:text-brand-text'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full border border-white bg-brand-error px-1 text-[8px] font-bold text-white">
                 {unreadAlerts.length > 99 ? '99+' : unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <div role="menu" className="animate-profile-menu absolute right-0 z-50 mt-2.5 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-brand-outline/60 bg-brand-surface shadow-[0_20px_55px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-brand-outline/40 bg-gradient-to-br from-brand-primary/[0.08] to-transparent px-4 py-3.5">
                <div><p className="text-xs font-extrabold text-brand-text">{isEnglish ? 'Notifications' : 'Thông báo hệ thống'}</p><p className="mt-0.5 text-[9px] text-brand-text-muted">{unreadAlerts.length ? `${unreadAlerts.length} ${isEnglish ? 'unread notifications' : 'thông báo chưa đọc'}` : (isEnglish ? 'You are all caught up' : 'Bạn đã xem tất cả thông báo')}</p></div>
                {unreadAlerts.length > 0 && (
                  <button 
                    onClick={() => {
                      onMarkAllAlertsAsRead();
                    }}
                    className="min-h-0 border-0 bg-transparent px-2 py-1 text-[10px] font-bold text-brand-primary shadow-none cursor-pointer"
                  >
                    {isEnglish ? 'Mark all read' : 'Đánh dấu đã đọc'}
                  </button>
                )}
              </div>
              <div className="border-b border-brand-outline/40 bg-brand-surface px-3 py-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-brand-outline/50 bg-brand-surface-lowest px-2.5 py-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-brand-primary" />
                  <label htmlFor="notification-date-filter" className="sr-only">{isEnglish ? 'Filter notifications by date' : 'Lọc thông báo theo ngày'}</label>
                  <input
                    id="notification-date-filter"
                    type="date"
                    max={todayDateKey}
                    value={alertDate}
                    onChange={(event) => {
                      setAlertDate(event.target.value);
                      setVisibleAlertCount(6);
                    }}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[10px] font-semibold text-brand-text outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  {alertDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlertDate('');
                        setVisibleAlertCount(6);
                      }}
                      aria-label={isEnglish ? 'Clear date filter' : 'Xóa lọc theo ngày'}
                      title={isEnglish ? 'Clear date filter' : 'Xóa lọc theo ngày'}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-0 bg-brand-surface-high p-0 text-brand-text-muted shadow-none hover:text-brand-text"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-1 border-b border-brand-outline/40 bg-brand-surface px-3 py-2">
                <button type="button" onClick={() => { setAlertFilter('ALL'); setVisibleAlertCount(6); }} className={`min-h-8 flex-1 border-0 px-3 py-1.5 text-[10px] font-bold shadow-none ${alertFilter === 'ALL' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-transparent text-brand-text-muted hover:bg-brand-surface-high'}`}>{isEnglish ? 'All' : 'Tất cả'} <span className="ml-1 opacity-70">{dateFilteredAlerts.length}</span></button>
                <button type="button" onClick={() => { setAlertFilter('UNREAD'); setVisibleAlertCount(6); }} className={`min-h-8 flex-1 border-0 px-3 py-1.5 text-[10px] font-bold shadow-none ${alertFilter === 'UNREAD' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-transparent text-brand-text-muted hover:bg-brand-surface-high'}`}>{isEnglish ? 'Unread' : 'Chưa đọc'} <span className="ml-1 opacity-70">{dateFilteredUnreadAlerts.length}</span></button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-brand-outline/30">
                {filteredAlerts.length === 0 ? (
                  <div className="px-6 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-surface-high text-brand-text-muted"><Bell className="h-5 w-5" /></span><p className="mt-3 text-xs font-bold text-brand-text">{alertDate ? (isEnglish ? 'No notifications found' : 'Không tìm thấy thông báo') : alertFilter === 'UNREAD' ? (isEnglish ? 'No unread notifications' : 'Không có thông báo chưa đọc') : (isEnglish ? 'No notifications' : 'Chưa có thông báo')}</p><p className="mt-1 text-[10px] text-brand-text-muted">{alertDate ? (isEnglish ? `No matching notifications on ${formatAlertFilterDate(alertDate, 'en')}.` : `Không có thông báo phù hợp trong ngày ${formatAlertFilterDate(alertDate, 'vi')}.`) : alertFilter === 'UNREAD' ? (isEnglish ? 'All notifications have been read.' : 'Bạn đã đọc tất cả thông báo.') : (isEnglish ? 'New system events will appear here.' : 'Sự kiện mới của hệ thống sẽ xuất hiện tại đây.')}</p></div>
                ) : (
                  visibleAlerts.map((alert) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={alert.id} 
                      onClick={() => {
                        onAlertClick(alert.id);
                        setShowAlertMenu(false);
                      }}
                      className={`h-auto w-full rounded-none border-0 p-3.5 text-left shadow-none transition-colors cursor-pointer hover:bg-brand-surface-high/50 ${!alert.isRead ? 'bg-brand-primary/5' : 'bg-transparent'}`}
                    >
                      <div className="flex gap-2.5 items-start">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium text-brand-text truncate ${!alert.isRead ? 'font-semibold' : ''}`}>
                            {alert.title}
                          </p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5 line-clamp-2">
                            {alert.description}
                          </p>
                          <span className="text-[8px] text-brand-text-muted/60 mt-1 block">
                            {formatAlertTimestamp(alert.createdAt, interfaceLanguage)}
                          </span>
                        </div>
                        {!alert.isRead && (
                          <span className="w-1.5 h-1.5 bg-brand-primary rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              {filteredAlerts.length > 0 && (
                <div className="border-t border-brand-outline/40 bg-brand-surface-lowest/60 p-2.5">
                  <button
                    type="button"
                    disabled={remainingAlertCount === 0}
                    onClick={() => {
                      if (remainingAlertCount > 0) {
                        setVisibleAlertCount((count) => count + 12);
                      }
                    }}
                    className={`flex h-auto w-full items-center justify-center gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 text-[10px] font-bold shadow-none transition-colors ${
                      remainingAlertCount > 0
                        ? 'text-brand-primary hover:bg-brand-primary/5'
                        : 'cursor-default text-brand-text-muted opacity-80'
                    }`}
                  >
                    {remainingAlertCount > 0 ? (
                      isEnglish
                        ? `Show ${Math.min(12, remainingAlertCount)} more notifications`
                        : `Hiện thêm ${Math.min(12, remainingAlertCount)} thông báo`
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        {isEnglish ? 'All notifications shown' : 'Đã hiển thị tất cả'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Center */}
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => {
              setShowHelpMenu(!showHelpMenu);
              setShowAlertMenu(false);
              setShowProfileMenu(false);
            }}
            title={isEnglish ? 'Help' : 'Trợ giúp'}
            aria-label={isEnglish ? 'Open help menu' : 'Mở menu trợ giúp'}
            aria-haspopup="menu"
            aria-expanded={showHelpMenu}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border p-0 transition-colors cursor-pointer ${showHelpMenu ? 'border-brand-primary/35 bg-brand-primary/10 text-brand-primary' : 'border-transparent text-brand-text-muted hover:border-brand-outline/60 hover:bg-brand-surface-high hover:text-brand-text'}`}
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {showHelpMenu && (
            <div role="menu" className="animate-profile-menu absolute right-0 z-50 mt-2.5 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-brand-outline/60 bg-brand-surface shadow-[0_20px_55px_rgba(15,23,42,0.18)]">
              <div className="border-b border-brand-outline/40 bg-gradient-to-br from-brand-primary/[0.08] to-transparent px-4 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary"><LifeBuoy className="h-4.5 w-4.5" /></span><div><p className="text-xs font-extrabold text-brand-text">{isEnglish ? 'How can we help?' : 'Bạn cần hỗ trợ?'}</p><p className="mt-0.5 text-[9px] text-brand-text-muted">{isEnglish ? 'Quick access to support tools' : 'Truy cập nhanh các công cụ hỗ trợ'}</p></div></div></div>
              <div className="p-2.5">
                <button type="button" role="menuitem" onClick={() => { onOpenSupport(); setShowHelpMenu(false); }} className="profile-menu-action flex h-auto w-full items-center gap-3 rounded-xl border-0 bg-transparent px-2.5 py-2.5 text-left shadow-none hover:bg-brand-surface-high"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-brand-text">{isEnglish ? 'Support center' : 'Trung tâm hỗ trợ'}</span><span className="mt-0.5 block text-[9px] text-brand-text-muted">{isEnglish ? 'Manage tickets and monitor SLA' : 'Quản lý ticket và theo dõi SLA'}</span></span><ArrowRight className="h-3.5 w-3.5 text-brand-text-muted" /></button>
                <button type="button" role="menuitem" onClick={() => { onOpenSecurity(); setShowHelpMenu(false); }} className="profile-menu-action flex h-auto w-full items-center gap-3 rounded-xl border-0 bg-transparent px-2.5 py-2.5 text-left shadow-none hover:bg-brand-surface-high"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><Shield className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-brand-text">{isEnglish ? 'Report a security issue' : 'Kiểm tra sự cố bảo mật'}</span><span className="mt-0.5 block text-[9px] text-brand-text-muted">{isEnglish ? 'Review alerts and access logs' : 'Xem cảnh báo và nhật ký truy cập'}</span></span><ArrowRight className="h-3.5 w-3.5 text-brand-text-muted" /></button>
              </div>
              <div className="border-t border-brand-outline/40 bg-brand-surface-lowest/60 px-4 py-3"><p className="text-[9px] text-brand-text-muted">{isEnglish ? 'Support email' : 'Email hỗ trợ'}</p><a href="mailto:support@salonsys.vn" className="mt-1 block text-[10px] font-bold text-brand-primary hover:underline">support@salonsys.vn</a></div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-brand-outline/30" />

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            className={`header-profile-trigger sa-profile-trigger ${showProfileMenu ? 'is-open' : ''}`}
          >
            <div className="sa-profile-trigger-avatar">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEacud0tQ8HtS17f0spPnyOekngb2QobaJ8igUCndQJn8kZ61Q4WzGVbd7mT0KUNIKKHOvBj7EjAXWYPvVmqlbAKajxEvmXL18spcUSw6T7hfSUwFvSHE6RMO8gNVMGN4HJrnb9kiCmiNhrg6yCtqT3hkAAARHawmrFL4u_h1AQnguMZGUSPncRN1HPDNvbgsUVotvTGmyTN4bTZ2wTkT1-qEFLUNb4aYPrsG0_0anZ-o5i4TnX4O" 
                alt="letruongthinhcr145@gmail.com" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <span className="sa-profile-online-dot" />
            </div>
            <div className="sa-profile-trigger-copy hidden xl:flex">
              <p>Superadmin</p>
              <span>{isEnglish ? 'System administrator' : 'Quản trị hệ thống'}</span>
            </div>
            <span className="sa-profile-chevron hidden xl:flex">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {showProfileMenu && (
            <div role="menu" className="header-profile-menu sa-profile-menu animate-profile-menu">
              <div className="sa-profile-menu-hero">
                <div className="sa-profile-menu-glow" aria-hidden="true" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="sa-profile-menu-avatar">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEacud0tQ8HtS17f0spPnyOekngb2QobaJ8igUCndQJn8kZ61Q4WzGVbd7mT0KUNIKKHOvBj7EjAXWYPvVmqlbAKajxEvmXL18spcUSw6T7hfSUwFvSHE6RMO8gNVMGN4HJrnb9kiCmiNhrg6yCtqT3hkAAARHawmrFL4u_h1AQnguMZGUSPncRN1HPDNvbgsUVotvTGmyTN4bTZ2wTkT1-qEFLUNb4aYPrsG0_0anZ-o5i4TnX4O"
                      alt="Ảnh đại diện Superadmin"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="sa-profile-menu-avatar-status"><CheckCircle2 className="h-3.5 w-3.5" fill="currentColor" /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-white">Superadmin</p>
                      <span className="sa-profile-online-pill"><span /> Online</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-white/55">superadmin@salonsys.vn</p>
                  </div>
                </div>
                <div className="sa-profile-access-card">
                  <span><Shield className="h-3.5 w-3.5" /></span>
                  <div>
                    <strong>{isEnglish ? 'Full system access' : 'Toàn quyền hệ thống'}</strong>
                    <small>{isEnglish ? 'Superadmin permissions are active' : 'Quyền Superadmin đang hoạt động'}</small>
                  </div>
                </div>
              </div>

              <div className="sa-profile-actions">
                <p className="sa-profile-section-label">{isEnglish ? 'Account' : 'Tài khoản'}</p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenAccountSettings();
                    setShowProfileMenu(false);
                  }}
                  className="profile-menu-action sa-profile-action"
                >
                  <span className="sa-profile-action-icon sa-profile-action-icon--violet"><Settings2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="sa-profile-action-title">{isEnglish ? 'Interface preferences' : 'Tùy chọn giao diện'}</span>
                    <span className="sa-profile-action-note">{isEnglish ? 'Language, theme and display' : 'Ngôn ngữ, giao diện và hiển thị'}</span>
                  </span>
                  <span className="sa-profile-action-arrow"><ArrowRight className="h-3.5 w-3.5" /></span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenSecurity();
                    setShowProfileMenu(false);
                  }}
                  className="profile-menu-action sa-profile-action"
                >
                  <span className="sa-profile-action-icon sa-profile-action-icon--emerald"><LockKeyhole className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="sa-profile-action-title">{isEnglish ? 'Sign-in security' : 'Bảo mật đăng nhập'}</span>
                    <span className="sa-profile-action-note">{isEnglish ? 'Password and access history' : 'Mật khẩu và lịch sử truy cập'}</span>
                  </span>
                  <span className="sa-profile-action-arrow"><ArrowRight className="h-3.5 w-3.5" /></span>
                </button>
              </div>

              <div className="sa-profile-menu-footer">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="profile-menu-logout sa-profile-logout"
                >
                  <LogOut className="w-4 h-4" />
                  {isEnglish ? 'Sign out of this account' : 'Đăng xuất khỏi tài khoản'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
