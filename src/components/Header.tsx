import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  LogOut, 
  User, 
  Shield, 
  AlertTriangle, 
  XCircle, 
  Info,
  HelpCircle,
  Moon,
  Sun
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
  onLogout
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
          className="h-9 min-w-[88px] px-2.5 rounded-full border border-brand-outline/60 bg-brand-surface-high hover:bg-brand-surface-highest text-brand-text shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            themeMode === 'dark'
              ? 'bg-brand-primary text-brand-on-primary'
              : 'bg-amber-100 text-amber-600 border border-amber-200'
          }`}>
            {themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </span>
          <span className="text-xs font-bold hidden sm:inline">
            {themeMode === 'dark' ? 'Tối' : 'Sáng'}
          </span>
        </button>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-brand-outline/30" />

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-brand-surface-highest border border-brand-outline/40 overflow-hidden flex-shrink-0 shadow-inner">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEacud0tQ8HtS17f0spPnyOekngb2QobaJ8igUCndQJn8kZ61Q4WzGVbd7mT0KUNIKKHOvBj7EjAXWYPvVmqlbAKajxEvmXL18spcUSw6T7hfSUwFvSHE6RMO8gNVMGN4HJrnb9kiCmiNhrg6yCtqT3hkAAARHawmrFL4u_h1AQnguMZGUSPncRN1HPDNvbgsUVotvTGmyTN4bTZ2wTkT1-qEFLUNb4aYPrsG0_0anZ-o5i4TnX4O" 
                alt="letruongthinhcr145@gmail.com" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden lg:block leading-none">
              <p className="text-[12px] font-bold text-brand-text">Superadmin</p>
              <p className="text-[10px] text-brand-text-muted mt-1">Quản trị hệ thống</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-brand-surface border border-brand-outline/50 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-brand-outline/40 bg-brand-surface-high/50">
                <p className="text-xs font-bold text-brand-text">Superadmin</p>
                <p className="text-[10px] text-brand-text-muted truncate mt-0.5">superadmin@salonsys.vn</p>
              </div>
              <div className="p-1">
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-brand-text hover:bg-brand-surface-highest rounded-lg cursor-default">
                  <Shield className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Quyền Superadmin</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-brand-text hover:bg-brand-surface-highest rounded-lg cursor-default">
                  <User className="w-3.5 h-3.5 text-brand-secondary" />
                  <span>Cài đặt cá nhân</span>
                </div>
              </div>
              <div className="p-1 border-t border-brand-outline/30 bg-brand-surface-lowest/40">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-error hover:bg-brand-error/10 rounded-lg cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
