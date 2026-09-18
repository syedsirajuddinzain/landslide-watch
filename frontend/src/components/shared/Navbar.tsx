import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, Bot, Radio, Menu } from 'lucide-react';
import { useQuery } from 'react-query';
import api from '../../lib/api';
import { Notification } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { GroundedAnalystModal } from '../ai/GroundedAnalystModal';
import { CommandPalette } from './CommandPalette';

const BREADCRUMBS: Record<string, string> = {
  '/': 'Command Center',
  '/authority': 'Regional Command Center',
  '/map': 'Live Risk Map',
  '/locations': 'Locations Registry',
  '/rainfall': 'Rainfall Monitoring',
  '/terrain': 'Terrain & Slope Analysis',
  '/soil': 'Geotechnical Soil Analysis',
  '/landslides': 'Historical Landslides & Backtesting',
  '/infrastructure': 'Critical Infrastructure & Exposure',
  '/analytics': 'Risk Analytics & Trends',
  '/alerts': 'Alert Center',
  '/notifications': 'Notification Feed',
  '/response': 'Response Center & Field Verification',
  '/datasources': 'Data Sources & Quality Health',
  '/admin': 'System Administration',
  '/settings': 'Calibration & Settings',
};

export function Navbar() {
  const location = useLocation();
  const path = '/' + location.pathname.split('/')[1];
  const title = BREADCRUMBS[path] || 'Landslide Watch';
  const isLocationDetail = location.pathname.startsWith('/locations/') && location.pathname !== '/locations';
  const { toggleSidebar } = useUIStore();
  const [showAnalyst, setShowAnalyst] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live ticking IST clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: notifData } = useQuery(
    'notifications-unread-count',
    () => api.get('/api/notifications').then((r) => r.data.data as Notification[]),
    { refetchInterval: 30_000 }
  );

  const unread = notifData?.filter((n) => !n.isRead).length || 0;

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <>
      <header className="h-14 border-b border-[#C8D8BC] bg-white flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {/* Hamburger Menu Toggle (Mobile & Desktop) */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-[#0F2018] hover:bg-[#F5F0E8] transition-colors mr-1 border border-[#C8D8BC] flex items-center justify-center cursor-pointer shadow-2xs"
            title="Open Operational Navigation"
          >
            <Menu size={18} />
          </button>

          <span className="hidden sm:inline text-slate-500 font-semibold text-xs">Northeast India (NER)</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="text-[#0F2018] font-bold truncate text-xs sm:text-sm">{title}</span>
          {isLocationDetail && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-[#4A7C59] font-mono text-[10px] sm:text-xs font-bold">Catchment Detail</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Indian Standard Time Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] text-[#0F2018] text-xs font-mono font-bold">
            <Radio size={11} className="text-[#4A7C59] animate-pulse" />
            <span>{formattedTime} IST</span>
          </div>

          {/* AI Risk Analyst Assistant (Single Global Placement) */}
          <button
            onClick={() => setShowAnalyst(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            title="Ask AI Risk Analyst about live telemetry & catchments"
          >
            <Bot size={14} />
            <span>AI Analyst</span>
          </button>

          <Link
            to="/notifications"
            className="relative p-2 rounded-lg text-[#1A3028] hover:text-[#0F2018] hover:bg-[#C8D8BC]/30 border border-[#C8D8BC] transition-colors"
            title="View Notifications"
          >
            <Bell size={15} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Global AI Assistant & Command Palette */}
      <GroundedAnalystModal isOpen={showAnalyst} onClose={() => setShowAnalyst(false)} />
      <CommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onOpenSitRep={() => {}}
        onOpenCap={() => {}}
        onOpenAnalyst={() => setShowAnalyst(true)}
      />
    </>
  );
}
export default Navbar;



