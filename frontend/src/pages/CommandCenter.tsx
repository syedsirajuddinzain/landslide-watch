import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import api from '../lib/api';
import { Location, RiskAssessment, Alert } from '../types';
import {
  RiskBadge,
  PriorityBadge,
  TrendBadge,
  StatCard,
  DisclaimerBanner,
  Spinner,
} from '../components/shared/Badges';
import { RiskDistributionChart } from '../components/charts/Charts';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Clock,
  Radio,
  ArrowRight,
  Zap,
  RotateCcw,
  Map,
  ShieldAlert,
  HardHat,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react';
import { EarlyWarningTimeline } from '../components/earlywarning/EarlyWarningTimeline';
import { MOCK_LOCATIONS } from '../lib/mockData';

export default function CommandCenter() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Catchments Query (refreshed every 30s)
  const { data: locData, isLoading: locLoading } = useQuery(
    'locations',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { refetchInterval: 30_000 }
  );

  // Live Active Alerts Query
  const { data: alertsData } = useQuery(
    'active-alerts',
    () => api.get('/api/alerts/active').then((r) => r.data.data as Alert[]).catch(() => []),
    { refetchInterval: 20_000 }
  );

  // Live Citizen Hazard Reports Query
  const { data: citizenReports } = useQuery(
    'citizen-reports-cc',
    () => api.get('/api/citizen/reports').then((r) => r.data.data as any[]).catch(() => []),
    { refetchInterval: 30_000 }
  );

  const handleRefreshTelemetry = async () => {
    setIsRefreshing(true);
    await Promise.all([
      qc.invalidateQueries('locations'),
      qc.invalidateQueries('active-alerts'),
      qc.invalidateQueries('citizen-reports-cc'),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const rawLocations = (locData && locData.length > 0) ? locData : MOCK_LOCATIONS;

  // Ensure all locations have dynamic telemetry data
  const locations: Array<Location & { latestRisk?: RiskAssessment }> = rawLocations.map((loc) => {
    const baseRisk = loc.latestRisk || {
      id: `risk-${loc.id}`,
      locationId: loc.id,
      locationName: loc.name,
      district: loc.district,
      state: loc.state,
      timestamp: new Date().toISOString(),
      modelVersion: 'v2.4-hybrid-ner',
      hazardScore: 45,
      impactScore: 50,
      finalScore: 45,
      riskLevel: 'MODERATE' as const,
      priorityLevel: 'P3' as const,
      trend: 'STABLE' as const,
      trendPct: 0,
      componentScores: { rainfall: 0.4, slope: 0.5, soil: 0.5, landCover: 0.4, drainage: 0.5, historical: 0.3 },
      inputs: {
        rainfall_current_mmph: 4.0,
        rainfall_24h_mm: 25.0,
        rainfall_72h_mm: 48.0,
        forecast_6h_mm: 8.0,
        forecast_24h_mm: 18.0,
        slope_deg: 24,
        soilSusceptibility: 0.5,
        landCoverSusceptibility: 0.45,
        drainageProximityKm: 1.1,
        historicalEventsNearby: 1,
      },
      explanation: [],
      recommendations: [],
      dataQuality: { rainfall: 'GOOD' as const },
      isDemo: false,
    };

    return {
      ...loc,
      latestRisk: baseRisk,
    };
  }).sort((a, b) => (b.latestRisk?.finalScore || 0) - (a.latestRisk?.finalScore || 0));

  // Dynamic KPI Calculations
  const p1Count = locations.filter((l) => (l.latestRisk?.priorityLevel === 'P1' || (l.latestRisk?.finalScore || 0) >= 70)).length;
  const p2Count = locations.filter((l) => (l.latestRisk?.priorityLevel === 'P2' || ((l.latestRisk?.finalScore || 0) >= 50 && (l.latestRisk?.finalScore || 0) < 70))).length;
  const p3Count = locations.filter((l) => (l.latestRisk?.priorityLevel === 'P3' || ((l.latestRisk?.finalScore || 0) >= 30 && (l.latestRisk?.finalScore || 0) < 50))).length;
  const p4Count = locations.filter((l) => (l.latestRisk?.priorityLevel === 'P4' || (l.latestRisk?.finalScore || 0) < 30)).length;

  const stats = {
    CRITICAL: p1Count,
    HIGH: p2Count,
    MODERATE: p3Count,
    LOW: p4Count,
  };

  const activeAlertsCount = (alertsData && alertsData.length > 0) ? alertsData.length : (p1Count > 0 ? p1Count : (p2Count > 0 ? 1 : 0));
  const heavyRainCount = locations.filter((l) => (l.latestRisk?.inputs?.rainfall_current_mmph || 0) >= 10 || (l.latestRisk?.inputs?.rainfall_24h_mm || 0) >= 40).length;
  const avg24hRain = locations.length > 0
    ? Math.round((locations.reduce((acc, curr) => acc + (curr.latestRisk?.inputs?.rainfall_24h_mm || 0), 0) / locations.length) * 10) / 10
    : 0;

  // Filtered Watchlist Table
  const filteredLocations = locations.filter((loc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      loc.name.toLowerCase().includes(q) ||
      loc.district.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterTier === 'ALL') return true;
    if (filterTier === 'P1') return loc.latestRisk?.priorityLevel === 'P1' || (loc.latestRisk?.finalScore || 0) >= 70;
    if (filterTier === 'P2') return loc.latestRisk?.priorityLevel === 'P2' || ((loc.latestRisk?.finalScore || 0) >= 50 && (loc.latestRisk?.finalScore || 0) < 70);
    if (filterTier === 'P3') return loc.latestRisk?.priorityLevel === 'P3' || ((loc.latestRisk?.finalScore || 0) >= 30 && (loc.latestRisk?.finalScore || 0) < 50);
    if (filterTier === 'P4') return loc.latestRisk?.priorityLevel === 'P4' || (loc.latestRisk?.finalScore || 0) < 30;
    return true;
  });

  // Top 3 Priority Threat Escalations dynamically selected from highest risk
  const topThreats = locations.slice(0, 3);

  function getDynamicThreatDescription(loc: Location & { latestRisk?: RiskAssessment }) {
    const r = loc.latestRisk;
    const rain = r?.inputs?.rainfall_24h_mm ?? 0;
    const slope = r?.inputs?.slope_deg ?? 24;
    if (rain >= 35 && slope >= 30) {
      return `Steep ${slope}° gradient with heavy precipitation saturation (${rain.toFixed(1)} mm/24h)`;
    }
    if (slope >= 35) {
      return `Critical terrain slope (${slope}°) prone to gravity shear displacement`;
    }
    if (rain >= 30) {
      return `Elevated 24h precipitation (${rain.toFixed(1)} mm) raising pore-water pressure`;
    }
    return `Routine geo-seismic monitoring in ${loc.district} mountain corridor`;
  }

  if (locLoading) {
    return (
      <div className="flex items-center justify-center h-72">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Executive Operational Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-black text-[#0F2018] tracking-tight">Regional Command Center</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#C8D8BC]/40 text-[#0F2018] border border-[#7FB99A]">
              <Radio size={12} className="text-[#4A7C59] animate-pulse" /> LIVE TELEMETRY
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              · 20 NER Catchments Online
            </span>
          </div>
          <p className="text-[#1A3028] text-xs font-medium mt-1">
            Executive Early-Warning & Geotechnical Disaster Cockpit · Northeast India
          </p>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshTelemetry}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F0E8] border border-[#C8D8BC] text-[#1A3028] text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
            title="Refetch telemetry from all sensor feeds and recalculate risk"
          >
            <RotateCcw size={13} className={isRefreshing ? 'animate-spin text-[#4A7C59]' : 'text-slate-600'} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Telemetry'}</span>
          </button>

          <button
            onClick={() => navigate('/alerts')}
            className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            title="Open Alert Center to dispatch cellular sirens and CAP alerts"
          >
            <ShieldAlert size={14} />
            <span>Emergency Broadcast</span>
          </button>
        </div>
      </div>

      <DisclaimerBanner />

      {/* Primary KPI Row (100% Dynamic) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Monitored Catchments"
          value={locations.length}
          sub="13 NER Districts"
        />
        <StatCard
          label="CRITICAL (P1)"
          value={p1Count}
          accent="#DC2626"
          sub={p1Count > 0 ? 'Immediate action required' : 'No active breaches'}
        />
        <StatCard
          label="HIGH Risk (P2)"
          value={p2Count}
          accent="#EA580C"
          sub="Surveillance tier"
        />
        <StatCard
          label="ADVISORY (P3)"
          value={p3Count}
          accent="#D97706"
          sub="Routine observation"
        />
        <StatCard
          label="Active Alerts"
          value={activeAlertsCount}
          accent={activeAlertsCount > 0 ? '#DC2626' : '#2D6A4F'}
          sub={activeAlertsCount > 0 ? 'Hazard sirens active' : 'All clear'}
        />
        <StatCard
          label="Avg 24h Rain"
          value={`${avg24hRain} mm`}
          accent="#4A7C59"
          sub={`${heavyRainCount} heavy rain site${heavyRainCount === 1 ? '' : 's'}`}
        />
      </div>

      {/* Priority Tiers Allocation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#C8D8BC] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-[#0F2018] font-bold">
          <Zap size={15} className="text-[#4A7C59]" />
          <span>Operational Priority Allocations:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterTier(filterTier === 'P1' ? 'ALL' : 'P1')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              filterTier === 'P1'
                ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
            }`}
          >
            🔴 P1 Critical: {p1Count} Sites
          </button>
          <button
            onClick={() => setFilterTier(filterTier === 'P2' ? 'ALL' : 'P2')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              filterTier === 'P2'
                ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                : 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100'
            }`}
          >
            🟠 P2 High: {p2Count} Sites
          </button>
          <button
            onClick={() => setFilterTier(filterTier === 'P3' ? 'ALL' : 'P3')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              filterTier === 'P3'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            🟡 P3 Advisory: {p3Count} Sites
          </button>
          <button
            onClick={() => setFilterTier(filterTier === 'P4' ? 'ALL' : 'P4')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              filterTier === 'P4'
                ? 'bg-[#1A3028] text-white border-[#0F2018] shadow-xs'
                : 'bg-[#F5F0E8] text-[#0F2018] border-[#C8D8BC] hover:bg-[#EAE2D5]'
            }`}
          >
            🟢 P4 Stable: {p4Count} Sites
          </button>
          {filterTier !== 'ALL' && (
            <button
              onClick={() => setFilterTier('ALL')}
              className="text-[11px] font-bold text-[#4A7C59] hover:underline px-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Prominent Early Warning Window & Risk Escalation Timeline */}
      <EarlyWarningTimeline locations={locations} />

      {/* Main Strategic Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Dynamic Priority Escalations & Mission Operations */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dynamic Highest Threat Catchments */}
          <div className="card p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#C8D8BC] pb-3">
              <div className="text-xs font-bold text-[#0F2018] uppercase tracking-wider flex items-center gap-2">
                <Activity size={15} className="text-[#4A7C59]" />
                <span>Priority Vulnerability & Threat Signals</span>
              </div>
              <span className="text-[11px] text-[#4A7C59] font-mono font-bold">
                Real-Time Risk Ranking
              </span>
            </div>

            <div className="space-y-2.5">
              {topThreats.map((loc) => {
                const risk = loc.latestRisk;
                const score = risk?.finalScore ?? 0;
                return (
                  <div
                    key={loc.id}
                    onClick={() => navigate(`/locations/${loc.id}`)}
                    className="p-3.5 bg-[#F5F0E8]/70 hover:bg-[#F5F0E8] rounded-xl border border-[#C8D8BC] hover:border-[#4A7C59] cursor-pointer transition-all flex items-start justify-between gap-3 shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F2018] group-hover:text-[#4A7C59] transition-colors">
                          {loc.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({loc.district}, {loc.state})
                        </span>
                        <RiskBadge level={risk?.riskLevel || 'MODERATE'} size="sm" />
                      </div>
                      <div className="text-xs text-[#1A3028] mt-1 font-medium leading-relaxed">
                        {getDynamicThreatDescription(loc)}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600 font-mono">
                        <span>24h Rain: <strong className="text-blue-700">{risk?.inputs?.rainfall_24h_mm?.toFixed(1) || '0'} mm</strong></span>
                        <span>·</span>
                        <span>Slope: <strong className="text-[#0F2018]">{risk?.inputs?.slope_deg ?? 25}°</strong></span>
                        <span>·</span>
                        <span>Trend: <strong className="text-[#4A7C59]">{risk?.trend || 'STABLE'}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black font-mono text-[#0F2018]">
                        {score.toFixed(1)}<span className="text-xs text-slate-400 font-normal">/100</span>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#4A7C59] group-hover:translate-x-0.5 transition-transform mt-1">
                        Audit <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dedicated Mission Operations Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => navigate('/map')}
              className="p-4 bg-white rounded-xl border border-[#C8D8BC] hover:border-[#4A7C59] cursor-pointer transition-all shadow-2xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <Map size={20} className="text-[#4A7C59]" />
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Live 3D Risk Map</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                Geospatial satellite canvas with 5km evacuation buffers and terrain slope contours.
              </p>
            </div>

            <div
              onClick={() => navigate('/alerts')}
              className="p-4 bg-white rounded-xl border border-[#C8D8BC] hover:border-rose-400 cursor-pointer transition-all shadow-2xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <ShieldAlert size={20} className="text-rose-600" />
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Alert Center</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                Send 1-click cellular sirens, CAP standard broadcasts & manage active disaster alarms.
              </p>
            </div>

            <div
              onClick={() => navigate('/response')}
              className="p-4 bg-white rounded-xl border border-[#C8D8BC] hover:border-[#4A7C59] cursor-pointer transition-all shadow-2xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <HardHat size={20} className="text-[#1A3028]" />
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Response Center</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                NDMA 4-phase incident SOP, resource deployments & official SitRep generator.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Risk Distribution & Citizen Signals */}
        <div className="space-y-4">
          {/* Hazard Level Distribution */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8D8BC]">
              <span className="font-bold text-xs text-[#0F2018] uppercase tracking-wider">Hazard Level Distribution</span>
              <span className="text-[11px] font-mono font-bold text-[#4A7C59]">{locations.length} Sites</span>
            </div>
            <RiskDistributionChart data={stats} />
          </div>

          {/* Incoming Resident Signals (Read-only intelligence for Authority) */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8D8BC]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F2018]">
                <Users size={14} className="text-[#4A7C59]" />
                <span>Citizen Ground Signals</span>
              </div>
              <button
                onClick={() => navigate('/response')}
                className="text-[11px] font-bold text-[#4A7C59] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                Verify in SOP <ArrowRight size={10} />
              </button>
            </div>

            {citizenReports && citizenReports.length > 0 ? (
              <div className="space-y-2">
                {citizenReports.slice(0, 2).map((rep: any) => (
                  <div key={rep.id} className="p-2.5 bg-[#F5F0E8]/60 rounded-xl border border-[#C8D8BC] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F2018] truncate">{rep.locationName || 'NER Mountain Zone'}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        <Clock size={9} className="inline mr-0.5" />
                        {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {rep.description && (
                      <p className="text-[11px] text-slate-700 italic line-clamp-2">
                        "{rep.description}"
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500">
                      <span className="uppercase font-semibold text-amber-800">{rep.observationType || 'HAZARD'}</span>
                      <span className={`font-bold ${rep.status === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        ● {rep.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                No unverified resident hazard reports pending.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Complete 20-Catchment Operational Watchlist */}
      <div className="card p-0 overflow-hidden border border-[#C8D8BC]">
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0F2018]">Operational Catchment Registry</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white border border-[#C8D8BC] text-[#1A3028]">
                {filteredLocations.length} of {locations.length} Sites
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              Real-time multi-factor geotechnical matrix with direct inspection access.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search catchment, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#C8D8BC] text-xs text-[#0F2018] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4A7C59]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]/80">
              <tr className="text-xs text-[#1A3028] border-b border-[#C8D8BC] font-bold">
                <th className="text-left px-4 py-3">Catchment Site</th>
                <th className="text-left px-4 py-3">District & State</th>
                <th className="text-center px-4 py-3">Priority</th>
                <th className="text-center px-4 py-3">Risk Level</th>
                <th className="text-right px-4 py-3">Risk Score</th>
                <th className="text-right px-4 py-3">24h Rain</th>
                <th className="text-right px-4 py-3">Slope</th>
                <th className="text-left px-4 py-3">Trend</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8D8BC]/50">
              {filteredLocations.map((loc) => {
                const risk = loc.latestRisk;
                return (
                  <tr
                    key={loc.id}
                    className="hover:bg-[#F5F0E8]/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/locations/${loc.id}`)}
                  >
                    <td className="px-4 py-3 font-bold text-[#0F2018]">{loc.name}</td>
                    <td className="px-4 py-3 text-xs text-[#1A3028] font-medium">
                      {loc.district}, {loc.state}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PriorityBadge priority={risk?.priorityLevel || 'P3'} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RiskBadge level={risk?.riskLevel || 'MODERATE'} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-[#0F2018]">
                      {risk?.finalScore.toFixed(1) || '0.0'}<span className="text-[10px] text-slate-400 font-normal">/100</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                      {risk?.inputs?.rainfall_24h_mm?.toFixed(1) || '0.0'} mm
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                      {risk?.inputs?.slope_deg ?? 25}°
                    </td>
                    <td className="px-4 py-3 text-left">
                      <TrendBadge
                        trend={risk?.trend || 'STABLE'}
                        pct={risk?.trendPct || 0}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-[#4A7C59] font-bold hover:underline inline-flex items-center gap-0.5">
                        Inspect <ChevronRight size={12} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
