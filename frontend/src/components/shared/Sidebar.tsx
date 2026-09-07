import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard, Map, MapPin, CloudRain, Mountain, Layers,
  AlertTriangle, Bell, ClipboardList, Database, Settings, Users,
  Shield, Activity, LogOut, BarChart2, Shovel, X
} from 'lucide-react';

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Command Center', roles: ['admin','authority','viewer'] },
  { to: '/map',          icon: Map,             label: 'Live Risk Map',  roles: ['admin','authority','viewer'] },
  { to: '/locations',    icon: MapPin,           label: 'Locations',     roles: ['admin','authority','viewer'] },
  { to: '/rainfall',     icon: CloudRain,        label: 'Rainfall',      roles: ['admin','authority','viewer'] },
  { to: '/terrain',      icon: Mountain,         label: 'Terrain',       roles: ['admin','authority','viewer'] },
  { to: '/soil',         icon: Layers,           label: 'Soil Analysis', roles: ['admin','authority','viewer'] },
  { to: '/landslides',   icon: Shovel,           label: 'Hist. Landslides', roles: ['admin','authority','viewer'] },
  { to: '/infrastructure', icon: Activity,       label: 'Infrastructure', roles: ['admin','authority','viewer'] },
  { to: '/analytics',    icon: BarChart2,        label: 'Analytics',     roles: ['admin','authority','viewer'] },
  { separator: true, label: 'OPERATIONS' },
  { to: '/alerts',       icon: AlertTriangle,    label: 'Alert Center',  roles: ['admin','authority'] },
  { to: '/notifications',icon: Bell,             label: 'Notifications', roles: ['admin','authority','viewer'] },
  { to: '/response',     icon: ClipboardList,    label: 'Response',      roles: ['admin','authority'] },
  { to: '/datasources',  icon: Database,         label: 'Data Sources',  roles: ['admin','authority','viewer'] },
  { separator: true, label: 'ADMIN' },
  { to: '/admin',        icon: Users,            label: 'Admin Panel',   roles: ['admin'] },
  { to: '/settings',     icon: Settings,         label: 'Settings',      roles: ['admin'] },
];

export function Sidebar() {
  const { user, role, signOut } = useAuthStore();
  const { sidebarOpen, closeSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    closeSidebar();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 md:w-60 bg-surface-card border-r border-surface-border flex flex-col z-50 overflow-y-auto scrollbar-thin transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A7C59] to-[#0F2018] flex items-center justify-center shadow-sm">
              <Shield size={16} className="text-[#F5F0E8]" />
            </div>
            <div>
              <div className="text-sm font-black text-[#0F2018] leading-none">LANDSLIDE</div>
              <div className="text-xs text-[#4A7C59] font-bold leading-none mt-0.5">WATCH · SIH26001</div>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((item, i) => {
            if ('separator' in item) {
              return (
                <div key={i} className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  {item.label}
                </div>
              );
            }

            if (!item.roles.includes(role)) return null;

            const Icon = item.icon!;
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === '/'}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  isActive ? 'sidebar-item-active' : 'sidebar-item'
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-surface-border">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-900 truncate">{user?.email}</div>
              <div className="text-[10px] text-slate-500 uppercase">{role}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="sidebar-item w-full text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
