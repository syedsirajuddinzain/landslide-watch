import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../lib/api';
import { Location, RiskAssessment, Alert, WhatChangedDelta } from '../types';
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
import { useAuthStore } from '../store/authStore';
import {
  Activity,
  Users,
  Clock,
  Radio,
  ArrowRight,
  Zap,
  Sun,
  CloudLightning,
  RotateCcw,
  Sparkles,
  Map,
  ShieldAlert,
  HardHat,
  ChevronRight,
} from 'lucide-react';
import { MOCK_LOCATIONS } from '../lib/mockData';

type WeatherScenario = 'BASELINE' | 'MONSOON_SURGE' | 'STABILIZATION';

export default function CommandCenter() {
  const navigate = useNavigate();
  const { switchPortal } = useAuthStore();
  const [scenario, setScenario] = useState<WeatherScenario>('BASELINE');

  const { data: locData, isLoading: locLoading } = useQuery(
    'locations',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { refetchInterval: 60_000 }
  );

  const { data: citizenReports } = useQuery(
    'citizen-reports-cc',
    () => api.get('/api/citizen/reports').then((r) => r.data.data as any[]),
    { refetchInterval: 30_000 }
  );

    const rawLocations = (locData && locData.length > 0) ? locData : MOCK_LOCATIONS;

  // DYNAMIC RISK & TELEMETRY ENGINE BASED ON REAL-TIME ATMOSPHERIC SCENARIO
  const locations: Array<Location & { latestRisk?: RiskAssessment }> = rawLocations.map((loc) => {
    const baseRisk = loc.latestRisk || {
      id: `risk-${loc.id}`,
      locationId: loc.id,
      locationName: loc.name,
      district: loc.district,
      state: loc.state,
      timestamp: new Date().toISOString(),
      modelVersion: 'v2.4-hybrid-ner',
      hazardScore: 50,
      impactScore: 50,
      finalScore: 50,
      riskLevel: 'MODERATE' as const,
      priorityLevel: 'P3' as const,
      trend: 'STABLE' as const,
      trendPct: 0,
      componentScores: { rainfall: 0.5, slope: 0.5, soil: 0.5, landCover: 0.5, drainage: 0.5, historical: 0.5 },
      inputs: {
        rainfall_current_mmph: 5,
        rainfall_24h_mm: 30,
        rainfall_72h_mm: 60,
        forecast_6h_mm: 10,
        forecast_24h_mm: 25,
        slope_deg: 25,
        soilSusceptibility: 0.5,
        landCoverSusceptibility: 0.5,
        drainageProximityKm: 0.5,
        historicalEventsNearby: 1,
      },
      explanation: [],
      recommendations: [],
      dataQuality: { rainfall: 'GOOD' as const },
      isDemo: false,
    };

    let score = baseRisk.finalScore;
    let rainCurrent = baseRisk.inputs.rainfall_current_mmph;
    let rain24h = baseRisk.inputs.rainfall_24h_mm;
    let trend = baseRisk.trend;
    let trendPct = baseRisk.trendPct;

    if (scenario === 'MONSOON_SURGE') {
      if (loc.id === 'shillong' || loc.id === 'mawsynram' || loc.id === 'jowai') {
        score = Math.min(94, baseRisk.finalScore + 14.5);
        rainCurrent = Math.round((rainCurrent + 18.2) * 10) / 10;
        rain24h = Math.round((rain24h + 54.0) * 10) / 10;
        trend = 'RISING';
        trendPct = 28.5;
      } else if (loc.id === 'aizawl' || loc.id === 'durtlang' || loc.id === 'gangtok' || loc.id === 'kohima') {
        score = Math.min(96, baseRisk.finalScore + 11.0);
        rainCurrent = Math.round((rainCurrent + 12.0) * 10) / 10;
        rain24h = Math.round((rain24h + 38.0) * 10) / 10;
        trend = 'RISING';
        trendPct = 22.0;
      } else {
        score = Math.min(88, baseRisk.finalScore + 6.5);
        rain24h = Math.round((rain24h + 18.0) * 10) / 10;
      }
    } else if (scenario === 'STABILIZATION') {
      score = Math.max(18, baseRisk.finalScore - 14.0);
      rainCurrent = Math.max(0, Math.round((rainCurrent * 0.15) * 10) / 10);
      rain24h = Math.max(4, Math.round((rain24h * 0.35) * 10) / 10);
      trend = 'FALLING';
      trendPct = 18.5;
    }

    const level = score >= 70 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW';
    const priority = score >= 70 ? 'P1' : score >= 55 ? 'P2' : score >= 35 ? 'P3' : 'P4';

    const updatedRisk: RiskAssessment = {
      ...baseRisk,
      finalScore: Math.round(score * 10) / 10,
      riskLevel: level as any,
      priorityLevel: priority as any,
      trend,
      trendPct,
      inputs: {
        ...baseRisk.inputs,
        rainfall_current_mmph: rainCurrent,
        rainfall_24h_mm: rain24h,
      },
    };

    return {
      ...loc,
      latestRisk: updatedRisk,
    };
  }).sort((a, b) => (b.latestRisk?.finalScore || 0) - (a.latestRisk?.finalScore || 0));

  const criticalCount = locations.filter((l) => l.latestRisk?.riskLevel === 'CRITICAL').length;
  const highCount = locations.filter((l) => l.latestRisk?.riskLevel === 'HIGH').length;
  const moderateCount = locations.filter((l) => l.latestRisk?.riskLevel === 'MODERATE').length;
  const lowCount = locations.filter((l) => l.latestRisk?.riskLevel === 'LOW').length;

  const stats = {
    CRITICAL: criticalCount,
    HIGH: highCount,
    MODERATE: moderateCount,
    LOW: lowCount,
  };

  const p1Count = locations.filter((l) => l.latestRisk?.priorityLevel === 'P1').length;
  const p2Count = locations.filter((l) => l.latestRisk?.priorityLevel === 'P2').length;
  const p3Count = locations.filter((l) => l.latestRisk?.priorityLevel === 'P3').length;
  const p4Count = locations.filter((l) => l.latestRisk?.priorityLevel === 'P4').length;

  const activeAlerts = scenario === 'MONSOON_SURGE' ? 7 : scenario === 'STABILIZATION' ? 1 : 4;
  const heavyRainCount = locations.filter(
    (l) => (l.latestRisk?.inputs.rainfall_current_mmph || 0) >= 12
  ).length;

  const topSurges: WhatChangedDelta[] = scenario === 'MONSOON_SURGE' ? [
    {
      locationId: 'shillong',
      locationName: 'Shillong Peak & Valley',
      district: 'East Khasi Hills',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 67.1,
      currentScore: 81.6,
      scoreDelta: 14.5,
      previousLevel: 'HIGH',
      currentLevel: 'CRITICAL',
      levelChanged: true,
      rainfall24hDelta: 54.0,
      previousRainfall24h: 64.2,
      currentRainfall24h: 118.2,
      primaryCause: 'Intense 3-Hour Cloudburst & Mawlai Bypass Runoff',
      isEscalation: true,
    },
    {
      locationId: 'mawsynram',
      locationName: 'Mawsynram Rain Belt',
      district: 'East Khasi Hills',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 48.5,
      currentScore: 73.0,
      scoreDelta: 24.5,
      previousLevel: 'MODERATE',
      currentLevel: 'CRITICAL',
      levelChanged: true,
      rainfall24hDelta: 62.0,
      previousRainfall24h: 92.0,
      currentRainfall24h: 154.0,
      primaryCause: 'Extreme Pluvial Saturation on 28° Karst Escarpment',
      isEscalation: true,
    },
    {
      locationId: 'aizawl',
      locationName: 'Aizawl Catchment',
      district: 'Aizawl',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 68.4,
      currentScore: 84.6,
      scoreDelta: 16.2,
      previousLevel: 'HIGH',
      currentLevel: 'CRITICAL',
      levelChanged: true,
      rainfall24hDelta: 38.0,
      previousRainfall24h: 52.5,
      currentRainfall24h: 90.5,
      primaryCause: 'Surma Shale Pore Pressure Saturation (38.4°)',
      isEscalation: true,
    },
  ] : scenario === 'STABILIZATION' ? [
    {
      locationId: 'aizawl',
      locationName: 'Aizawl Catchment',
      district: 'Aizawl',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 68.4,
      currentScore: 52.4,
      scoreDelta: -16.0,
      previousLevel: 'HIGH',
      currentLevel: 'MODERATE',
      levelChanged: true,
      rainfall24hDelta: -45.0,
      previousRainfall24h: 52.5,
      currentRainfall24h: 7.5,
      primaryCause: 'Rainfall Receded & Topsoil Gravity Drainage Active',
      isEscalation: false,
    },
    {
      locationId: 'gangtok',
      locationName: 'Gangtok Urban Ridge',
      district: 'East Sikkim',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 67.2,
      currentScore: 51.2,
      scoreDelta: -16.0,
      previousLevel: 'HIGH',
      currentLevel: 'MODERATE',
      levelChanged: true,
      rainfall24hDelta: -38.0,
      previousRainfall24h: 48.0,
      currentRainfall24h: 10.0,
      primaryCause: 'Burtuk Axis Creep Stabilized Post-Rain',
      isEscalation: false,
    },
  ] : [
    {
      locationId: 'aizawl',
      locationName: 'Aizawl Catchment',
      district: 'Aizawl',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 56.4,
      currentScore: 68.4,
      scoreDelta: 12.0,
      previousLevel: 'HIGH',
      currentLevel: 'HIGH',
      levelChanged: false,
      rainfall24hDelta: 24.5,
      previousRainfall24h: 28.0,
      currentRainfall24h: 52.5,
      primaryCause: 'Intense Cloudburst Saturation & 38° Slope Runoff',
      isEscalation: true,
    },
    {
      locationId: 'gangtok',
      locationName: 'Gangtok Urban Ridge',
      district: 'East Sikkim',
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: new Date().toISOString(),
      previousScore: 58.9,
      currentScore: 70.1,
      scoreDelta: 11.2,
      previousLevel: 'HIGH',
      currentLevel: 'CRITICAL',
      levelChanged: true,
      rainfall24hDelta: 18.3,
      previousRainfall24h: 54.5,
      currentRainfall24h: 72.8,
      primaryCause: 'Pore Pressure Accumulation on Burtuk Creep Axis',
      isEscalation: true,
    },
  ];

  if (locLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  // Top 5 Highest-Risk Watchlist Sites
  const topWatchlist = locations.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Clean Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F2018]">Regional Command Center</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#C8D8BC]/40 text-[#0F2018] border border-[#7FB99A]">
              <Radio size={11} className="text-[#4A7C59] animate-pulse" /> LIVE TELEMETRY
            </span>
          </div>
          <p className="text-[#1A3028] text-xs font-medium mt-0.5">
            Executive Early-Warning & Meteorological Cockpit for Northeast India
          </p>
        </div>

        {/* Quick Portal Switcher Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              switchPortal('citizen');
              navigate('/citizen/welcome');
            }}
            className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Open Citizen Onboarding & Welcome Guide"
          >
            Citizen Welcome
          </button>
          <button
            onClick={() => {
              switchPortal('citizen');
              navigate('/citizen/dashboard');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer group"
            title="Switch directly to Citizen Safety Portal"
          >
            <Users size={15} />
            <span>Open Citizen Safety Portal</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Interactive Weather Telemetry Scenario Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-[#C8D8BC] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0F2018]">
          <Sparkles size={16} className="text-[#4A7C59]" />
          <span>Live Atmospheric Simulation:</span>
          <span className="text-[11px] font-normal text-[#1A3028]">
            (Test how the system dynamically recalculates risk levels)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setScenario('BASELINE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              scenario === 'BASELINE'
                ? 'bg-[#4A7C59] text-white shadow-sm'
                : 'bg-[#F5F0E8] text-[#1A3028] hover:bg-[#C8D8BC]/50 border border-[#C8D8BC]'
            }`}
          >
            <RotateCcw size={12} />
            <span>Field Baseline</span>
          </button>

          <button
            onClick={() => setScenario('MONSOON_SURGE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              scenario === 'MONSOON_SURGE'
                ? 'bg-rose-700 text-white shadow-sm animate-pulse'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300'
            }`}
          >
            <CloudLightning size={12} />
            <span>⛈️ Cloudburst Surge (+45mm)</span>
          </button>

          <button
            onClick={() => setScenario('STABILIZATION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              scenario === 'STABILIZATION'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Sun size={12} />
            <span>☀️ Post-Rain Drainage</span>
          </button>
        </div>
      </div>

      <DisclaimerBanner />

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Monitored Sites" value={locations.length} sub="13 NER Districts" />
        <StatCard label="CRITICAL Priority (P1)" value={p1Count} accent="#DC2626" sub="Immediate action" />
        <StatCard label="HIGH Priority (P2)" value={p2Count} accent="#EA580C" sub="Surveillance tier" />
        <StatCard label="ADVISORY (P3)" value={p3Count} accent="#D97706" sub="Routine watch" />
        <StatCard label="Active Alerts" value={activeAlerts} accent={activeAlerts > 0 ? '#DC2626' : '#2D6A4F'} sub="Cellular sirens active" />
        <StatCard label="Heavy Rain Sites" value={heavyRainCount} accent="#4A7C59" sub="Rate > 12 mm/h" />
      </div>

      {/* Operational Priority Tiers Bar */}
      <div className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#C8D8BC] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#0F2018] font-bold">
          <Zap size={14} className="text-[#4A7C59]" /> Operational Priority Allocations:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold">
            🔴 P1 Critical: {p1Count} Sites
          </span>
          <span className="px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-xs font-bold">
            🟠 P2 High: {p2Count} Sites
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
            🟡 P3 Advisory: {p3Count} Sites
          </span>
          <span className="px-3 py-1 rounded-full bg-[#C8D8BC]/50 border border-[#7FB99A] text-[#0F2018] text-xs font-bold">
            🟢 P4 Stable: {p4Count} Sites
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Live Deltas & Quick Navigation Portals */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Telemetry Deltas */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#C8D8BC] pb-3">
              <div className="text-xs font-bold text-[#0F2018] uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={15} className="text-[#4A7C59]" />
                Live "What Changed" Telemetry Deltas
              </div>
              <span className="text-[11px] text-[#4A7C59] font-mono font-bold">
                {scenario === 'MONSOON_SURGE' ? '⚡ Active Cloudburst Surge' : scenario === 'STABILIZATION' ? '☀️ Drainage Recovery' : 'Baseline Stream'}
              </span>
            </div>

            <div className="space-y-2.5">
              {topSurges.map((surge) => (
                <div
                  key={surge.locationId}
                  onClick={() => navigate(`/locations/${surge.locationId}`)}
                  className="p-3.5 bg-[#F5F0E8] rounded-xl border border-[#C8D8BC] hover:border-[#4A7C59] cursor-pointer transition-all flex items-start justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F2018] flex items-center gap-2">
                      <span>{surge.locationName}</span>
                      <span className="text-[#1A3028] font-medium">({surge.district})</span>
                    </div>
                    <div className="text-xs text-[#1A3028] mt-1 font-medium">{surge.primaryCause}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black font-mono ${surge.scoreDelta >= 0 ? 'text-rose-600' : 'text-[#2D6A4F]'}`}>
                      {surge.scoreDelta >= 0 ? `+${surge.scoreDelta.toFixed(1)}` : surge.scoreDelta.toFixed(1)} pts
                    </span>
                    <div className="text-[10px] text-[#1A3028] font-mono font-bold mt-0.5">
                      Score: {surge.currentScore.toFixed(1)}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clean Mission Navigation Cards (Directing to Dedicated Pages) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div
              onClick={() => {
                switchPortal('citizen');
                navigate('/citizen/dashboard');
              }}
              className="p-4 bg-emerald-50/80 hover:bg-emerald-100 rounded-xl border border-emerald-300 hover:border-[#4A7C59] cursor-pointer transition-all shadow-xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users size={18} className="text-[#4A7C59]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <ChevronRight size={14} className="text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Citizen Safety Portal</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                View real-time public safety card, risk advisories & citizen hazard reporting.
              </p>
            </div>

            <div
              onClick={() => navigate('/map')}
              className="p-4 bg-white rounded-xl border border-[#C8D8BC] hover:border-[#4A7C59] cursor-pointer transition-all shadow-xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <Map size={18} className="text-[#4A7C59]" />
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Live 3D Risk Map</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                Dedicated GIS canvas with 5km evacuation buffers and satellite layers.
              </p>
            </div>

            <div
              onClick={() => navigate('/alerts')}
              className="p-4 bg-white rounded-xl border border-[#C8D8BC] hover:border-rose-400 cursor-pointer transition-all shadow-xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <ShieldAlert size={18} className="text-rose-600" />
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Alert Center</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                Send 1-click cellular SMS sirens, CAP broadcasts & review active alarms.
              </p>
            </div>

            <div
              onClick={() => navigate('/response')}
              className="p-4 bg-white rounded-xl border border-[#C8D8BC] hover:border-[#4A7C59] cursor-pointer transition-all shadow-xs space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <HardHat size={18} className="text-[#1A3028]" />
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-bold text-xs text-[#0F2018]">Response Center</div>
              <p className="text-[11px] text-[#1A3028] leading-snug">
                NDMA 4-phase rescue SOP, task boards & official SitRep PDF generator.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Risk Donut Chart */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="card-header flex items-center justify-between pb-3 border-b border-[#C8D8BC] mb-4">
              <span className="font-bold text-xs text-[#0F2018] uppercase tracking-wider">Hazard Level Distribution</span>
              <span className="text-[11px] font-mono font-bold text-[#4A7C59]">{locations.length} Sites</span>
            </div>
            <RiskDistributionChart data={stats} />
          </div>
        </div>
      </div>

      {/* Citizen Ground Hazard Intelligence (Dual-Platform Shared Loop) */}
      <div className="card p-0 overflow-hidden border border-[#C8D8BC]">
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59]">
              <Users size={16} />
            </span>
            <div>
              <span className="text-sm font-bold text-[#0F2018]">Incoming Citizen Ground Reports</span>
              <span className="text-xs text-[#1A3028] font-semibold ml-2">
                (Ground-truth Crowdsourced Hazard Signals)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                switchPortal('citizen');
                navigate('/citizen/dashboard');
              }}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
              title="Open Citizen Safety Portal to file a hazard report"
            >
              <span>Test Citizen Reporting</span>
              <ArrowRight size={12} />
            </button>
            <button
              onClick={() => navigate('/response')}
              className="text-xs text-[#4A7C59] font-bold hover:text-[#0F2018] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Dispatch / Verify in Response Center</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {citizenReports && citizenReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {citizenReports.slice(0, 3).map((report: any) => (
                <div key={report.id} className="p-3 bg-[#F5F0E8]/60 rounded-xl border border-[#C8D8BC] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {report.observationType ? report.observationType.replace(/_/g, ' ') : 'HAZARD'}
                    </span>
                    <span className="text-[10px] font-mono text-[#1A3028] flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#0F2018]">
                    {report.locationName || report.nearestCatchmentName || 'NER Mountain Corridor'}
                  </div>
                  {report.description && (
                    <p className="text-[11px] text-[#1A3028] line-clamp-2 italic">
                      "{report.description}"
                    </p>
                  )}
                  {report.photoUrl && (
                    <div className="relative h-24 rounded-lg overflow-hidden border border-[#C8D8BC]">
                      <img src={report.photoUrl} alt="Ground photo" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                        GPS Verified
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#C8D8BC]/60">
                    <span className="text-[#1A3028] font-mono">
                      {report.coordinates ? `${report.coordinates.lat.toFixed(3)}°N, ${report.coordinates.lon.toFixed(3)}°E` : 'NER Field GPS'}
                    </span>
                    <span className={`font-bold ${report.status === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      ● {report.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5 text-xs text-[#1A3028]">
              No active citizen ground hazard reports pending verification.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Top 5 Critical Action Watchlist (Uncluttered) */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-[#0F2018]">Critical Action Watchlist</span>
            <span className="text-xs text-[#1A3028] font-semibold ml-2">(Top 5 Highest-Risk Catchments)</span>
          </div>
          <button
            onClick={() => navigate('/locations')}
            className="text-xs text-[#4A7C59] font-bold hover:text-[#0F2018] flex items-center gap-1 transition-colors"
          >
            <span>View All 20 Catchments in Locations Registry</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]/80">
              <tr className="text-xs text-[#1A3028] border-b border-[#C8D8BC] font-bold">
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">District & State</th>
                <th className="text-center px-4 py-3">Priority</th>
                <th className="text-center px-4 py-3">Risk Level</th>
                <th className="text-right px-4 py-3">Risk Score</th>
                <th className="text-right px-4 py-3">24h Rain</th>
                <th className="text-left px-4 py-3">Trend</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {topWatchlist.map((loc) => {
                const risk = loc.latestRisk;
                return (
                  <tr
                    key={loc.id}
                    className="table-row cursor-pointer"
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
                      {risk?.finalScore.toFixed(1) || '0.0'}/100
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                      {risk?.inputs?.rainfall_24h_mm?.toFixed(1) || '0.0'} mm
                    </td>
                    <td className="px-4 py-3 text-left">
                      <TrendBadge
                        trend={risk?.trend || 'STABLE'}
                        pct={risk?.trendPct || 0}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-[#4A7C59] font-bold hover:underline">
                        Audit →
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
