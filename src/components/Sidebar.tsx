import { useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  Gem,
  HelpCircle,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  badgeCounts: {
    expiringSalons: number;
    overdueInvoices: number;
    unreadAlerts: number;
    openTickets: number;
    pendingUpgrades: number;
  };
  systemName: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  badgeCounts,
  systemName,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // Sidebar preference remains optional if storage is unavailable.
      }
      return next;
    });
  };

  const navigationGroups = [
    {
      label: 'Điều hành',
      items: [
        { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
        {
          id: 'salons',
          label: 'Quản lý Tenant',
          icon: Store,
          badge: badgeCounts.pendingUpgrades + badgeCounts.expiringSalons,
          badgeTone: 'warning',
        },
        { id: 'admins', label: 'Tenant Admin', icon: Users },
        { id: 'packages', label: 'Gói dịch vụ', icon: Package },
        {
          id: 'billing',
          label: 'Thanh toán & hóa đơn',
          icon: Receipt,
          badge: badgeCounts.overdueInvoices,
          badgeTone: 'danger',
        },
        { id: 'reports', label: 'Báo cáo hệ thống', icon: BarChart3 },
      ],
    },
    {
      label: 'Quản trị',
      items: [
        { id: 'settings', label: 'Cấu hình hệ thống', icon: Settings },
        {
          id: 'security',
          label: 'Bảo mật & nhật ký',
          icon: ShieldCheck,
          badge: badgeCounts.unreadAlerts,
          badgeTone: 'danger',
        },
        {
          id: 'support',
          label: 'Trung tâm hỗ trợ',
          icon: HelpCircle,
          badge: badgeCounts.openTickets,
          badgeTone: 'info',
        },
        { id: 'backup', label: 'Sao lưu dữ liệu', icon: Database },
      ],
    },
  ];

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          role-sidebar sa-sidebar fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden
          transition-[width,transform] duration-300 ease-out
          lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'is-collapsed w-[280px] lg:w-[88px]' : 'w-[280px]'}
        `}
      >
        <div className="sa-sidebar-brand">
          <button
            type="button"
            className="sa-brand-button"
            onClick={() => {
              setActiveTab('overview');
              setIsOpen(false);
            }}
            aria-label="Về trang tổng quan"
          >
            <span className="sa-brand-mark"><Gem className="h-5 w-5" /></span>
            <span className={`sa-brand-copy ${isCollapsed ? 'lg:hidden' : ''}`}>
              <strong>{systemName}</strong>
              <small>Superadmin Console</small>
            </span>
          </button>
        </div>

        <nav className="sa-sidebar-nav" aria-label="Điều hướng quản trị">
          {navigationGroups.map((group) => (
            <div key={group.label} className="sa-nav-group">
              <p className={isCollapsed ? 'lg:sr-only' : ''}>{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`sa-nav-item ${isActive ? 'is-active' : ''} ${isCollapsed ? 'lg:justify-center' : ''}`}
                    >
                      <span className="sa-nav-icon">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.3 : 1.9} />
                      </span>
                      <span className={`sa-nav-label ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {Boolean(item.badge) && (
                        <span
                          className={`sa-nav-badge sa-nav-badge--${item.badgeTone} ${isCollapsed ? 'sa-nav-dot' : ''}`}
                          aria-label={`${item.badge} mục cần chú ý`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {!item.badge && !isCollapsed && <ChevronRight className="sa-nav-chevron h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sa-sidebar-footer">
          <div className={`sa-system-status ${isCollapsed ? 'lg:hidden' : ''}`}>
            <span className="sa-system-status-icon"><ShieldCheck className="h-4 w-4" /></span>
            <span>
              <strong>Hệ thống an toàn</strong>
              <small>Tất cả dịch vụ đang hoạt động</small>
            </span>
            <span className="sa-status-pulse" />
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className={`sa-collapse-button ${isCollapsed ? 'lg:justify-center' : ''}`}
            aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span className={isCollapsed ? 'lg:hidden' : ''}>{isCollapsed ? 'Mở rộng' : 'Thu gọn menu'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
