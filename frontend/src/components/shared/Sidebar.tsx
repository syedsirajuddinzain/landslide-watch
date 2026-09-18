import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard, Map, MapPin, CloudRain, Mountain, Layers,
  AlertTriangle, Bell, ClipboardList, Database, Settings, Users,
  Shield, Activity, LogOut, BarChart2, Shovel, X
} from 'lucide-react';

const NAV = [
  { separator: true, label: 'AUTHORITY COCKPIT' },
  { to: '/authority',    icon: LayoutDashboard, label: 'Command Center', roles: ['admin','authority','viewer'] },
  { to: '/map',          icon: Map,             label: 'Live Risk Map',  roles: ['admin','authority','viewer'] },
  { to: '/locations',    icon: MapPin,           label: 'Locations Registry', roles: ['admin','authority','viewer'] },
  { to: '/rainfall',     icon: CloudRain,        label: 'Rainfall Monitoring', roles: ['admin','authority','viewer'] },
  { to: '/terrain',      icon: Mountain,         label: 'Terrain Analysis', roles: ['admin','authority','viewer'] },
  { to: '/soil',         icon: Layers,           label: 'Soil Analysis', roles: ['admin','authority','viewer'] },
  { to: '/landslides',   icon: Shovel,           label: 'Historical Landslides', roles: ['admin','authority','viewer'] },
  { to: '/infrastructure', icon: Activity,       label: 'Infrastructure', roles: ['admin','authority','viewer'] },
  { to: '/analytics',    icon: BarChart2,        label: 'Risk Analytics', roles: ['admin','authority','viewer'] },
  { separator: true, label: 'OPERATIONS' },
  { to: '/alerts',       icon: AlertTriangle,    label: 'Alert Center',  roles: ['admin','authority'] },
  { to: '/notifications',icon: Bell,             label: 'Notifications', roles: ['admin','authority','viewer'] },
  { to: '/response',     icon: ClipboardList,    label: 'Response Center', roles: ['admin','authority'] },
  { to: '/datasources',  icon: Database,         label: 'Data Sources',  roles: ['admin','authority','viewer'] },
  { separator: true, label: 'SYSTEM' },
  { to: '/admin',        icon: Users,            label: 'Admin Panel',   roles: ['admin'] },
  { to: '/settings',     icon: Settings,         label: 'Settings & Calibration', roles: ['admin'] },
];

export function Sidebar() {
  const { user, role, signOut } = useAuthStore();
  const { sidebarOpen, closeSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    closeSidebar();
    navigate('/authority/login');
  };

  return (
    <>
      {/* Backdrop Overlay (Both Mobile & Desktop) */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sliding Off-canvas Drawer */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 md:w-72 bg-white border-r border-[#C8D8BC] flex flex-col z-50 shadow-2xl overflow-y-auto scrollbar-thin transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with Logo and Close Button */}
        <div className="p-4 border-b border-[#C8D8BC] flex items-center justify-between bg-[#F5F0E8]/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A7C59] to-[#0F2018] flex items-center justify-center shadow-sm">
              <Shield size={16} className="text-[#F5F0E8]" />
            </div>
            <div>
              <div className="text-sm font-black text-[#0F2018] leading-none">LANDSLIDE</div>
              <div className="text-xs text-[#4A7C59] font-bold leading-none mt-0.5">WATCH · SIH26001</div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={closeSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-[#C8D8BC]/30 transition-colors"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item, i) => {
            if ('separator' in item) {
              return (
                <div key={i} className="px-3 pt-4 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                end={item.to === '/authority'}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1A3028] text-white shadow-xs'
                    : 'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1A3028] hover:bg-[#F5F0E8] transition-colors'
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Authority User Profile & Sign Out */}
        <div className="p-3 border-t border-[#C8D8BC] bg-[#F5F0E8]/40">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 bg-white rounded-xl border border-[#C8D8BC]/60">
            <div className="w-8 h-8 rounded-full bg-[#1A3028] flex items-center justify-center text-xs font-bold text-white shadow-xs">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#0F2018] truncate">{user?.email || 'Officer'}</div>
              <div className="text-[10px] font-black text-[#4A7C59] uppercase tracking-wider">{role}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
