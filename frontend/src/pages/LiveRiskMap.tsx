import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Location, RiskAssessment, HistoricalLandslide, RiskLevel, PriorityLevel } from '../types';
import { MOCK_LOCATIONS } from '../lib/mockData';
import { RiskMap } from '../components/map/RiskMap';
import { RiskBadge, PriorityBadge, TrendBadge, Spinner } from '../components/shared/Badges';
import { Search, X, Filter, Layers, Navigation, ExternalLink, Clock, Play, FastForward } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

type TimeHorizon = 'current' | '6h' | '12h' | '24h';

export default function LiveRiskMap() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [horizon, setHorizon] = useState<TimeHorizon>('current');

  const { data: locData } = useQuery(
    'locations',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { refetchInterval: 60_000 }
  );

  const { data: landslidesData } = useQuery(
    'landslides-all',
    () => api.get('/api/landslides').then((r) => r.data.data as HistoricalLandslide[]),
    { staleTime: 5 * 60_000 }
  );

  // Compute horizon-adjusted locations
  const rawLocations: Location[] = (locData && locData.length > 0 ? locData : MOCK_LOCATIONS) as Location[];
  const baseLocations: Location[] = rawLocations.map((loc) => {
    const mock = MOCK_LOCATIONS.find((m) => m.id === loc.id);
    return { ...loc, latestRisk: loc.latestRisk || mock?.latestRisk || null };
  });
  const locations: Location[] = baseLocations.map((loc) => {
    if (horizon === 'current' || !loc.latestRisk) return loc;

    const multiplier = horizon === '6h' ? 1.12 : horizon === '12h' ? 1.25 : 1.4;
    const projectedScore = Math.min(100, Math.round((loc.latestRisk.finalScore * multiplier) * 10) / 10);
    const projectedLevel: RiskLevel =
      projectedScore >= 70 ? 'CRITICAL' : projectedScore >= 50 ? 'HIGH' : projectedScore >= 30 ? 'MODERATE' : 'LOW';
    const projectedPri: PriorityLevel =
      projectedLevel === 'CRITICAL' ? 'P1' : projectedLevel === 'HIGH' ? 'P2' : projectedLevel === 'MODERATE' ? 'P3' : 'P4';

    return {
      ...loc,
      latestRisk: {
        ...loc.latestRisk,
        finalScore: projectedScore,
        riskLevel: projectedLevel,
        priorityLevel: projectedPri,
      },
    };
  });

  const selectedLoc = locations.find((l) => l.id === selectedId);

  const filtered = locations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.district.toLowerCase().includes(search.toLowerCase()) ||
      loc.state.toLowerCase().includes(search.toLowerCase());

    const matchesRisk =
      selectedRiskFilter === 'ALL' ||
      loc.latestRisk?.riskLevel === selectedRiskFilter;

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Interactive Left Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-surface-border flex flex-col bg-surface-card">
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-surface-border space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, district, or state..."
              className="input pl-8 py-1.5 text-xs w-full bg-surface"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedRiskFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  selectedRiskFilter === lvl
                    ? 'bg-brand text-white'
                    : 'bg-surface text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Location List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
          {filtered
            .sort((a, b) => (b.latestRisk?.finalScore || 0) - (a.latestRisk?.finalScore || 0))
            .map((loc) => {
              const risk = loc.latestRisk;
              const isSelected = loc.id === selectedId;
              return (
                <div
                  key={loc.id}
                  onClick={() => setSelectedId(loc.id === selectedId ? undefined : loc.id)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-brand bg-brand/10'
                      : 'border-surface-border/40 hover:border-surface-border hover:bg-surface/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate">{loc.name}</span>
                    {risk && <PriorityBadge priority={risk.priorityLevel || 'P4'} />}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {loc.district}, {loc.state}
                  </div>
                  {risk && (
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-surface-border/50">
                      <div className="flex items-center gap-1.5">
                        <RiskBadge level={risk.riskLevel} size="xs" />
                        <span className="text-xs font-mono font-bold text-white">
                          {risk.finalScore.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-blue-400">
                        {risk.inputs.rainfall_24h_mm.toFixed(1)} mm
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Selected Location Quick Inspection Drawer */}
        {selectedLoc?.latestRisk && (
          <div className="border-t border-surface-border p-3.5 space-y-2.5 bg-surface-elevated animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">{selectedLoc.name}</span>
                <span className="text-[10px] text-slate-400 block">{selectedLoc.district}, {selectedLoc.state}</span>
              </div>
              <button
                onClick={() => setSelectedId(undefined)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface p-2 rounded-lg border border-surface-border">
                <span className="text-slate-400 text-[10px]">Hazard / Impact</span>
                <div className="font-mono text-white font-bold mt-0.5">
                  {selectedLoc.latestRisk.hazardScore.toFixed(1)} / {selectedLoc.latestRisk.impactScore.toFixed(1)}
                </div>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-surface-border">
                <span className="text-slate-400 text-[10px]">Slope Angle</span>
                <div className="font-mono text-orange-400 font-bold mt-0.5">
                  {selectedLoc.latestRisk.inputs.slope_deg.toFixed(1)}°
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/locations/${selectedLoc.id}`)}
              className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <span>Full Location Telemetry</span>
              <ExternalLink size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 9-Layer Interactive GIS Map Viewport */}
      <div className="flex-1 relative">
        {/* Time-Travel Risk Horizon Scrubber Bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1 p-1 bg-surface-elevated/90 backdrop-blur-md border border-surface-border rounded-xl shadow-2xl">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 font-mono text-[11px] border-r border-surface-border/60">
            <Clock size={12} className="text-brand-light animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-slate-300 font-semibold">TIME HORIZON:</span>
          </div>
          {[
            { id: 'current', label: '● Live Now', desc: 'Real-time telemetry' },
            { id: '6h', label: '+6 Hours', desc: 'Short-range horizon' },
            { id: '12h', label: '+12 Hours', desc: 'Mid-range horizon' },
            { id: '24h', label: '+24 Hours', desc: 'Long-range forecast' },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => setHorizon(h.id as TimeHorizon)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                horizon === h.id
                  ? 'bg-brand text-white shadow-md shadow-brand/30 border border-brand-light'
                  : 'text-slate-400 hover:text-white hover:bg-surface'
              }`}
              title={h.desc}
            >
              <span>{h.label}</span>
            </button>
          ))}
        </div>

        <RiskMap
          locations={locations}
          landslides={landslidesData || []}
          selectedLocationId={selectedId}
          onLocationSelect={(id) => setSelectedId(id === selectedId ? undefined : id)}
          height="100%"
        />
      </div>
    </div>
  );
}


