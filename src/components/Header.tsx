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
  Moon,
  Sun,
  ChevronDown,
  Settings2,
  LockKeyhole,
  CheckCircle2
} from 'lucide-react';
import { SystemAlert } from '../types';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  alerts: SystemAlert[];
  onMarkAllAlertsAsRead: () => void;
  onAlertClick: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenAccountSettings: () => void;
  onOpenSecurity: () => void;
}

export default function Header({ 
  sidebarOpen, 
  setSidebarOpen, 
  alerts, 
  onMarkAllAlertsAsRead,
  onAlertClick,
  searchQuery,
  setSearchQuery,
  themeMode,
  onToggleTheme,
  onLogout,
  onOpenAccountSettings,
  onOpenSecurity
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter(a => !a.isRead);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) {
        setShowAlertMenu(false);
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
    <header className="h-16 bg-brand-surface border-b border-brand-outline/40 flex items-center justify-between px-6 sticky top-0 z-30">
      
      {/* Left side: Hamburger (Mobile) and Search */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden md:block">
          <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Tìm kiếm tenant, Tenant Admin, gói dịch vụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg pl-10 pr-4 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary placeholder:text-brand-text-muted/60"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right side: Alerts, Help, User Profile */}
      <div className="flex items-center gap-3">
        
        {/* System Notification Bell */}
        <div className="relative" ref={alertRef}>
          <button 
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg hover:bg-brand-surface-high transition-colors relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-brand-error text-[9px] font-bold text-white rounded-full flex items-center justify-center border border-white shrink-0">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-brand-surface border border-brand-outline/50 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 bg-brand-surface-high/80 border-b border-brand-outline/40 flex justify-between items-center">
                <span className="text-xs font-semibold text-brand-text">Cảnh báo hệ thống</span>
                {unreadAlerts.length > 0 && (
                  <button 
                    onClick={() => {
                      onMarkAllAlertsAsRead();
                      setShowAlertMenu(false);
                    }}
                    className="text-[10px] text-brand-primary hover:underline cursor-pointer"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-brand-outline/30">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-brand-text-muted">Không có cảnh báo nào</div>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      onClick={() => {
                        onAlertClick(alert.id);
                        setShowAlertMenu(false);
                      }}
                      className={`p-3 text-left transition-colors cursor-pointer hover:bg-brand-surface-high/50 ${!alert.isRead ? 'bg-brand-primary/5' : ''}`}
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
                            {alert.createdAt}
                          </span>
                        </div>
                        {!alert.isRead && (
                          <span className="w-1.5 h-1.5 bg-brand-primary rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help Center */}
        <button 
          className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg hover:bg-brand-surface-high transition-colors cursor-pointer"
          title="Trợ giúp"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title={themeMode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          aria-label={themeMode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="header-theme-toggle h-10 px-2 rounded-xl border border-brand-outline/60 bg-brand-surface-high hover:bg-brand-surface-highest text-brand-text shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            themeMode === 'dark'
              ? 'bg-violet-500 text-white shadow-sm'
              : 'bg-amber-100 text-amber-600 border border-amber-200'
          }`}>
            {themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </span>
          <span className="pr-1 text-[11px] font-bold hidden sm:inline">
            {themeMode === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}
          </span>
        </button>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-brand-outline/30" />

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            className={`header-profile-trigger flex items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${
              showProfileMenu
                ? 'border-brand-primary/30 bg-brand-primary/5 shadow-sm'
                : 'border-transparent hover:border-brand-outline/60 hover:bg-brand-surface-high'
            }`}
          >
            <div className="relative w-8 h-8 rounded-xl bg-brand-surface-highest border border-brand-outline/40 overflow-hidden flex-shrink-0 shadow-inner">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEacud0tQ8HtS17f0spPnyOekngb2QobaJ8igUCndQJn8kZ61Q4WzGVbd7mT0KUNIKKHOvBj7EjAXWYPvVmqlbAKajxEvmXL18spcUSw6T7hfSUwFvSHE6RMO8gNVMGN4HJrnb9kiCmiNhrg6yCtqT3hkAAARHawmrFL4u_h1AQnguMZGUSPncRN1HPDNvbgsUVotvTGmyTN4bTZ2wTkT1-qEFLUNb4aYPrsG0_0anZ-o5i4TnX4O" 
                alt="letruongthinhcr145@gmail.com" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-brand-surface bg-emerald-500" />
            </div>
            <div className="hidden xl:block leading-none min-w-[94px]">
              <p className="text-[12px] font-bold text-brand-text">Superadmin</p>
              <p className="text-[9px] text-brand-text-muted mt-1">Đang hoạt động</p>
            </div>
            <ChevronDown className={`hidden xl:block h-3.5 w-3.5 text-brand-text-muted transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <div role="menu" className="header-profile-menu absolute right-0 mt-2.5 w-[304px] bg-brand-surface border border-brand-outline/60 rounded-2xl shadow-[0_20px_55px_rgba(15,23,42,0.18)] z-50 overflow-hidden animate-profile-menu">
              <div className="p-4 border-b border-brand-outline/40 bg-gradient-to-br from-brand-primary/[0.08] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-brand-outline/50 bg-brand-surface-highest shadow-sm">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEacud0tQ8HtS17f0spPnyOekngb2QobaJ8igUCndQJn8kZ61Q4WzGVbd7mT0KUNIKKHOvBj7EjAXWYPvVmqlbAKajxEvmXL18spcUSw6T7hfSUwFvSHE6RMO8gNVMGN4HJrnb9kiCmiNhrg6yCtqT3hkAAARHawmrFL4u_h1AQnguMZGUSPncRN1HPDNvbgsUVotvTGmyTN4bTZ2wTkT1-qEFLUNb4aYPrsG0_0anZ-o5i4TnX4O"
                      alt="Ảnh đại diện Superadmin"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <CheckCircle2 className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-brand-surface text-emerald-500" fill="currentColor" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-extrabold text-brand-text">Superadmin</p>
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Online</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-brand-text-muted">superadmin@salonsys.vn</p>
                  </div>
                </div>
              </div>

              <div className="px-3 pt-3">
                <div className="flex items-start gap-3 rounded-xl border border-brand-primary/15 bg-brand-primary/[0.06] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-brand-text">Vai trò Superadmin</p>
                    <p className="mt-1 text-[9px] leading-4 text-brand-text-muted">Toàn quyền quản trị nền tảng SalonSys</p>
                  </div>
                </div>
              </div>

              <div className="p-2.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenAccountSettings();
                    setShowProfileMenu(false);
                  }}
                  className="profile-menu-action w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-brand-surface-high cursor-pointer"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-surface-highest text-brand-text-muted"><Settings2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-brand-text">Tùy chọn giao diện</span>
                    <span className="mt-0.5 block text-[9px] text-brand-text-muted">Ngôn ngữ và chế độ sáng tối</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-brand-text-muted/60" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenSecurity();
                    setShowProfileMenu(false);
                  }}
                  className="profile-menu-action w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-brand-surface-high cursor-pointer"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-surface-highest text-brand-text-muted"><LockKeyhole className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-brand-text">Bảo mật đăng nhập</span>
                    <span className="mt-0.5 block text-[9px] text-brand-text-muted">Mật khẩu và lịch sử truy cập</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-brand-text-muted/60" />
                </button>
              </div>

              <div className="p-2.5 border-t border-brand-outline/40 bg-brand-surface-lowest/50">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="profile-menu-logout w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-bold text-brand-error hover:bg-brand-error/10 rounded-xl cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất khỏi tài khoản
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
