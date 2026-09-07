import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../lib/api';
import { Location, RiskAssessment } from '../../types';
import {
  Search,
  MapPin,
  FileText,
  Radio,
  Bot,
  RefreshCw,
  LayoutDashboard,
  Map,
  CloudRain,
  Mountain,
  Layers,
  History,
  Activity,
  AlertTriangle,
  Shield,
  Settings,
  Bell,
  Sliders,
  Volume2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSitRep: () => void;
  onOpenCap: () => void;
  onOpenAnalyst: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenSitRep, onOpenCap, onOpenAnalyst }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: locData } = useQuery(
    'locations-palette',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { enabled: isOpen }
  );

  const locations = locData || [];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // System pages
  const PAGES = [
    { title: 'Command Center', path: '/', icon: LayoutDashboard, category: 'Navigation' },
    { title: 'Live 9-Layer GIS Risk Map', path: '/map', icon: Map, category: 'Navigation' },
    { title: 'Catchment Registry', path: '/locations', icon: MapPin, category: 'Navigation' },
    { title: 'Rainfall Monitoring Radar', path: '/rainfall', icon: CloudRain, category: 'Navigation' },
    { title: 'SRTM Terrain & Slope Analysis', path: '/terrain', icon: Mountain, category: 'Navigation' },
    { title: 'ISRIC SoilGrids Geotechnical Analysis', path: '/soil', icon: Layers, category: 'Navigation' },
    { title: 'Historical Landslides & Backtesting', path: '/landslides', icon: History, category: 'Navigation' },
    { title: 'Critical Infrastructure Exposure', path: '/infrastructure', icon: Activity, category: 'Navigation' },
    { title: 'Alert Center & Incident Lifecycle', path: '/alerts', icon: AlertTriangle, category: 'Navigation' },
    { title: 'Response Center & NDRF Dispatch', path: '/response', icon: Shield, category: 'Navigation' },
    { title: 'Data Health & Pipeline Telemetry', path: '/datasources', icon: Sliders, category: 'Navigation' },
    { title: 'System Settings & Calibration', path: '/settings', icon: Settings, category: 'Navigation' },
  ];

  // Actions
  const ACTIONS = [
    { title: 'Generate Official NDMA SitRep (PDF)', action: onOpenSitRep, icon: FileText, category: 'Actions' },
    { title: 'Transmit CAP-Sachet Emergency Warning', action: onOpenCap, icon: Radio, category: 'Actions' },
    { title: 'Ask Grounded AI Risk Analyst', action: onOpenAnalyst, icon: Bot, category: 'Actions' },
    { title: 'Trigger Manual Data Pipeline Ingestion', action: () => api.post('/api/ingestion/trigger'), icon: RefreshCw, category: 'Actions' },
  ];

  // Filter items
  const filteredLocs = locations
    .filter((l) => l.name.toLowerCase().includes(query.toLowerCase()) || l.district.toLowerCase().includes(query.toLowerCase()) || l.state.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((l) => ({
      title: `${l.name} Catchment (${l.district}, ${l.state})`,
      subtitle: `Score: ${l.latestRisk?.finalScore.toFixed(1) || '0.0'} · ${l.latestRisk?.priorityLevel || 'P4'} · 24h Rain: ${l.latestRisk?.inputs.rainfall_24h_mm.toFixed(1) || '0'}mm`,
      action: () => navigate(`/locations/${l.id}`),
      icon: MapPin,
      category: 'Locations',
    }));

  const filteredPages = PAGES.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())).map((p) => ({
    title: p.title,
    subtitle: p.path,
    action: () => navigate(p.path),
    icon: p.icon,
    category: 'Pages',
  }));

  const filteredActions = ACTIONS.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())).map((a) => ({
    title: a.title,
    subtitle: 'System Command',
    action: a.action,
    icon: a.icon,
    category: 'Actions',
  }));

  const allItems = [...filteredActions, ...filteredLocs, ...filteredPages];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Search Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-surface-border bg-surface">
          <Search size={18} className="text-slate-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a catchment name (Shillong, Aizawl), page, or command..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-surface-border/50 rounded border border-surface-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-surface-border/30">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching locations, pages, or commands found.
            </div>
          ) : (
            allItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.category}-${item.title}-${index}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-brand/20 border border-brand/40 text-white' : 'hover:bg-surface/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand text-white' : 'bg-surface text-slate-400'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{item.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase px-2 py-0.5 rounded bg-surface border border-surface-border">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-surface border-t border-surface-border flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd> · Select with <kbd>↵ Enter</kbd></span>
          <span>Landslide Watch Spotlight</span>
        </div>
      </div>
    </div>
  );
}
export default CommandPalette;
