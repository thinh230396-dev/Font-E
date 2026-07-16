import { useState } from 'react';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  HelpCircle, 
  Database,
  X,
  ChevronLeft,
  ChevronRight
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
  };
  systemName: string;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, badgeCounts, systemName }: SidebarProps) {
  // Collapse state for desktop, persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'salons', label: 'Quản lý Tenant', icon: Store, badge: badgeCounts.expiringSalons ? `${badgeCounts.expiringSalons} sắp hết hạn` : null, badgeColor: 'bg-brand-warning/20 text-brand-tertiary' },
    { id: 'admins', label: 'Quản lí Tenant Admin', icon: Users },
    { id: 'packages', label: 'Gói dịch vụ', icon: Package },
    { id: 'billing', label: 'Thanh toán & hóa đơn', icon: Receipt, badge: badgeCounts.overdueInvoices ? `${badgeCounts.overdueInvoices} quá hạn` : null, badgeColor: 'bg-brand-error/20 text-brand-error' },
    { id: 'reports', label: 'Báo cáo hệ thống', icon: BarChart3 },
    { id: 'settings', label: 'Cấu hình hệ thống', icon: Settings },
    { id: 'security', label: 'Bảo mật & nhật ký', icon: ShieldCheck, badge: badgeCounts.unreadAlerts ? `${badgeCounts.unreadAlerts}` : null, badgeColor: 'bg-brand-error text-brand-on-primary font-bold' },
    { id: 'support', label: 'Hỗ trợ', icon: HelpCircle, badge: badgeCounts.openTickets ? `${badgeCounts.openTickets}` : null, badgeColor: 'bg-brand-secondary/20 text-brand-secondary' },
    { id: 'backup', label: 'Sao lưu dữ liệu', icon: Database }
  ];

  return (
    <>
      {/* Mobile Sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`
        fixed inset-y-0 left-0 bg-brand-surface border-r border-brand-outline/40 
        flex flex-col z-50 transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-[280px] lg:w-[80px]' : 'w-[280px] lg:w-[280px]'}
      `}>
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center border-b border-brand-outline/40 px-5 ${isCollapsed ? 'justify-between lg:justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center shadow-sm shrink-0">
              <Store className="w-5 h-5 text-brand-on-primary font-bold" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="flex flex-col animate-fadeIn leading-tight">
                <span className="font-sans font-extrabold text-sm tracking-tight text-brand-text">
                  Superadmin
                </span>
                <span className="text-[10px] font-medium text-brand-text-muted mt-0.5">
                  {systemName}
                </span>
              </div>
            )}
          </div>

          {/* Close button for mobile menu */}
          {isOpen && (
            <button 
              className="lg:hidden p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false); // Close mobile menu after clicking
                }}
                title={isCollapsed ? item.label : undefined}
                className={`
                  w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl
                  font-semibold text-sm transition-all duration-200 cursor-pointer group relative
                  ${isActive 
                    ? 'bg-brand-primary/10 text-brand-primary' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high/60'
                  }
                  ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
                `}
              >
                <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'lg:justify-center lg:gap-0' : 'flex-1'}`}>
                  <Icon className={`w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-brand-primary' : 'text-brand-text-muted group-hover:text-brand-text'}`} />
                  <span className={`truncate text-left ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </div>
                
                {item.badge && isCollapsed && (
                  <span className="hidden lg:block absolute top-1 right-2 w-2 h-2 rounded-full bg-brand-error animate-pulse" />
                )}

                {item.badge && (
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor} font-semibold animate-pulse whitespace-nowrap flex items-center justify-center ${isCollapsed ? 'lg:hidden' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="mt-auto p-4 border-t border-brand-outline/40">
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-high/60 transition-all cursor-pointer text-xs font-semibold"
          >
            <div className="flex items-center gap-2.5">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-brand-text-muted" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-brand-text-muted" />
                  <span className="text-brand-text-muted">Thu gọn</span>
                </>
              )}
            </div>
            {!isCollapsed && (
              <ChevronLeft className="w-3.5 h-3.5 opacity-40 text-brand-text-muted" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
