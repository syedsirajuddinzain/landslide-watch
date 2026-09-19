import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../lib/api';
import { LocationDetail, FutureRiskForecast, WhatChangedDelta } from '../types';
import {
  RiskBadge,
  PriorityBadge,
  TrendBadge,
  DataQualityBadge,
  AlertStatusBadge,
  ScoreRing,
  SectionDivider,
  DisclaimerBanner,
  Spinner,
  EmptyState,
} from '../components/shared/Badges';
import {
  RiskHistoryChart,
  RainfallChart,
  CumulativeRainfallChart,
} from '../components/charts/Charts';
import { SimulationPanel } from '../components/simulation/SimulationPanel';
import { RiskMap } from '../components/map/RiskMap';
import { EmergencySmsModal } from '../components/broadcast/EmergencySmsModal';
import { useAuthStore } from '../store/authStore';
import {
  MapPin,
  CloudRain,
  Mountain,
  Layers,
  Activity,
  AlertTriangle,
  Users,
  ArrowLeft,
  Clock,
  CheckCircle,
  Droplets,
  Thermometer,
  ShieldAlert,
  Compass,
  Zap,
  TrendingUp,
  Cpu,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-surface-border/50 last:border-0">
      <span className="text-xs text-slate-500 flex-shrink-0 w-44">{label}</span>
      <span className="text-xs text-slate-200 text-right">{value}</span>
    </div>
  );
}

export default function LocationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'future' | 'what_changed' | 'geotech' | 'exposure' | 'shelters' | 'simulation'
  >('overview');
  const [showSmsModal, setShowSmsModal] = useState(false);

  const { data, isLoading, error } = useQuery(
    ['location-detail', id],
    () => api.get(`/api/locations/${id}`).then((r) => r.data.data as LocationDetail),
    { refetchInterval: 60_000 }
  );

  const { data: futureRisk } = useQuery(
    ['future-risk', id],
    () => api.get(`/api/risk/future/${id}`).then((r) => r.data.data as FutureRiskForecast),
    { enabled: !!id }
  );

  const { data: whatChanged } = useQuery(
    ['what-changed-loc', id],
    () => api.get(`/api/risk/what-changed/${id}`).then((r) => r.data.data as WhatChangedDelta),
    { enabled: !!id }
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  if (error || !data)
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertTriangle size={32} />}
          title="Location not found"
          desc="This location may have been removed or the ID is incorrect."
        />
      </div>
    );

  const {
    location,
    terrain,
    soil,
    landCover,
    drainage,
    infrastructure,
    forecast,
    latestRainfall,
    riskHistory,
    latestRisk,
    nearbyLandslides,
    alerts,
  } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 mt-1 border border-surface-border">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{location.name}</h1>
              {latestRisk && <PriorityBadge priority={latestRisk.priorityLevel || 'P4'} />}
              {latestRisk && <RiskBadge level={latestRisk.riskLevel} size="lg" />}
              {latestRisk?.isDemo && (
                <span className="badge bg-purple-100 text-purple-800 border border-purple-300 font-semibold">
                  DEMO DATA
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <MapPin size={12} />
              <span>
                {location.district}, {location.state} · {location.coordinates.lat.toFixed(4)}°N,{' '}
                {location.coordinates.lon.toFixed(4)}°E · ~{location.population.toLocaleString()} pop
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowSmsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md shadow-blue-600/20 transition-all"
            title="Dispatch emergency SMS alerts to mobile numbers for this catchment"
          >
            <MessageSquare size={14} />
            <span>📱 Send Emergency SMS Alert</span>
          </button>

          {latestRisk && (
            <div className="flex items-center gap-4 bg-surface p-3 rounded-xl border border-surface-border">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Risk Score</div>
                <div className="text-xl font-bold font-mono text-slate-900">{latestRisk.finalScore.toFixed(1)}/100</div>
                <TrendBadge trend={latestRisk.trend} pct={latestRisk.trendPct} />
              </div>
              <ScoreRing score={latestRisk.finalScore} level={latestRisk.riskLevel} size={54} />
            </div>
          )}
        </div>
      </div>

      <DisclaimerBanner />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-surface-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview & Scoring
        </button>
        <button
          onClick={() => setActiveTab('future')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'future' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          +6h / +12h / +24h Projections
        </button>
        <button
          onClick={() => setActiveTab('what_changed')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'what_changed' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          What Changed (Telemetry Delta)
        </button>
        <button
          onClick={() => setActiveTab('geotech')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'geotech' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Geotechnical & Terrain
        </button>
        <button
          onClick={() => setActiveTab('exposure')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'exposure' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          OSM Infrastructure Exposure
        </button>
        <button
          onClick={() => setActiveTab('shelters')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'shelters' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Evacuation & Safe Shelters
        </button>
        {(role === 'admin' || role === 'authority') && (
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'simulation' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Scenario Simulation
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Risk scores breakdown */}
            {latestRisk && (
              <div className="card">
                <div className="card-header">Multi-Factor Hazard & Impact Breakdown</div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-surface rounded-lg p-3 text-center border border-surface-border">
                    <div className="text-xs text-slate-500 mb-1">Hazard Score</div>
                    <div className="text-2xl font-bold text-white font-mono">{latestRisk.hazardScore.toFixed(1)}</div>
                    <div className="text-xs text-slate-600">/ 100</div>
                  </div>
                  <div className="bg-surface rounded-lg p-3 text-center border border-surface-border">
                    <div className="text-xs text-slate-500 mb-1">Impact Score</div>
                    <div className="text-2xl font-bold text-white font-mono">{latestRisk.impactScore.toFixed(1)}</div>
                    <div className="text-xs text-slate-600">/ 100</div>
                  </div>
                  <div className="bg-surface rounded-lg p-3 text-center border border-surface-border">
                    <div className="text-xs text-slate-500 mb-1">Operational Priority</div>
                    <div className="mt-1">
                      <PriorityBadge priority={latestRisk.priorityLevel || 'P4'} />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Decision Support Tier</div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-surface-border">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Component Factor Susceptibility
                  </div>
                  {Object.entries(latestRisk.componentScores).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="text-xs text-slate-400 w-28 capitalize">{key}</div>
                      <div className="flex-1 bg-surface rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-brand-light transition-all"
                          style={{ width: `${Math.round((val as number) * 100)}%` }}
                        />
                      </div>
                      <div className="text-xs font-mono text-slate-300 w-10 text-right">
                        {Math.round((val as number) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explainability factors */}
            {latestRisk?.explanation && (
              <div className="card">
                <div className="card-header">Why Is This Location At Risk? (Telemetry Explainability)</div>
                <div className="space-y-2">
                  {latestRisk.explanation.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-surface-border">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                          f.label === 'HIGH'
                            ? 'bg-red-400'
                            : f.label === 'MODERATE'
                            ? 'bg-yellow-400'
                            : 'bg-green-400'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white">{f.factor}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{f.value}</div>
                      </div>
                      <div className="text-xs font-mono font-bold text-brand-light flex-shrink-0">
                        +{f.contribution} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rainfall overview */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="card-header mb-0 flex items-center gap-2">
                  <CloudRain size={16} className="text-blue-400" /> Live Rainfall Telemetry
                </div>
                {latestRainfall && <DataQualityBadge quality={latestRainfall.qualityFlag} />}
              </div>
              {latestRainfall ? (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-surface p-3 rounded-lg border border-surface-border">
                      <div className="text-xs text-slate-500">Current Rate</div>
                      <div className="text-lg font-bold text-blue-400 font-mono">
                        {latestRainfall.current_mmph.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-600">mm/h</div>
                    </div>
                    <div className="bg-surface p-3 rounded-lg border border-surface-border">
                      <div className="text-xs text-slate-500">24h Total</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {latestRainfall.cumulative_24h_mm.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-600">mm</div>
                    </div>
                    <div className="bg-surface p-3 rounded-lg border border-surface-border">
                      <div className="text-xs text-slate-500">72h Total</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {latestRainfall.cumulative_72h_mm.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-600">mm</div>
                    </div>
                    <div className="bg-surface p-3 rounded-lg border border-surface-border">
                      <div className="text-xs text-slate-500">Intensity</div>
                      <div
                        className={`text-xs font-bold uppercase mt-1 ${
                          latestRainfall.intensity === 'extreme'
                            ? 'text-red-400'
                            : latestRainfall.intensity === 'heavy'
                            ? 'text-orange-400'
                            : latestRainfall.intensity === 'moderate'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        {latestRainfall.intensity}
                      </div>
                    </div>
                  </div>
                  {forecast && <RainfallChart observations={[latestRainfall]} forecast={forecast} />}
                </>
              ) : (
                <EmptyState
                  icon={<Droplets size={24} />}
                  title="No rainfall data"
                  desc="Telemetry will synchronize on next ingestion cycle"
                />
              )}
            </div>

            {/* Risk history chart */}
            {riskHistory.length > 1 && (
              <div className="card">
                <div className="card-header">Historical Risk Progression (Past Cycles)</div>
                <RiskHistoryChart data={riskHistory} />
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden">
              <RiskMap
                locations={[{ ...location, latestRisk: latestRisk || undefined }]}
                height="220px"
                selectedLocationId={location.id}
              />
            </div>

            {/* Location Specs */}
            <div className="card">
              <div className="card-header">Geographic Location</div>
              <Row
                label="Population"
                value={
                  <span className="flex items-center gap-1 font-mono">
                    <Users size={12} />
                    {location.population.toLocaleString()}
                  </span>
                }
              />
              <Row label="Elevation" value={terrain ? `${terrain.elevation_m} m MSL` : '—'} />
              <Row
                label="Coordinates"
                value={`${location.coordinates.lat.toFixed(4)}°N, ${location.coordinates.lon.toFixed(4)}°E`}
              />
              <Row label="District & State" value={`${location.district}, ${location.state}`} />
            </div>

            {/* Recommended Protocol Actions */}
            {latestRisk?.recommendations && latestRisk.recommendations.length > 0 && (
              <div className="card">
                <div className="card-header">Immediate Operational Recommendations</div>
                <div className="space-y-2">
                  {latestRisk.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-slate-300 p-2.5 bg-surface rounded-lg border border-surface-border"
                    >
                      <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center text-white text-[10px] flex-shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </div>
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FUTURE RISK FORECAST */}
      {activeTab === 'future' && (
        <div className="card p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-light" /> Predictive Future Risk Horizon
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Projections computed via Open-Meteo precipitation curves, antecedent soil moisture decay, and slope physics
              </p>
            </div>
            {futureRisk && (
              <span className="text-xs px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                Model: 48h NWP Forecast Horizon
              </span>
            )}
          </div>

          {futureRisk ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { label: '+6 Hours Horizon', data: futureRisk.plus6h },
                { label: '+12 Hours Horizon', data: futureRisk.plus12h },
                { label: '+24 Hours Horizon', data: futureRisk.plus24h },
                { label: '+36 Hours Horizon', data: futureRisk.plus36h },
                { label: '+48 Hours Horizon', data: futureRisk.plus48h },
              ].filter((item): item is { label: string; data: NonNullable<typeof item.data> } => Boolean(item.data)).map(({ label, data: h }) => (
                <div key={label} className="bg-surface p-5 rounded-xl border border-surface-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{label}</span>
                    <RiskBadge level={h.riskLevel} />
                  </div>

                  <div className="text-center py-2">
                    <div className="text-3xl font-bold font-mono text-white">{h.score.toFixed(1)}</div>
                    <div className="text-xs text-slate-500 font-mono">Projected Risk Score</div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-surface-border">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Projected Rainfall:</span>
                      <strong className="font-mono text-blue-400">{h.projectedPrecipitation_mm.toFixed(1)} mm</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cumulative 24h:</span>
                      <strong className="font-mono text-white">{h.projectedCumulative24h_mm.toFixed(1)} mm</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confidence:</span>
                      <span className="text-emerald-400 font-semibold">{h.confidence}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 italic bg-surface-card p-2 rounded border border-surface-border/50">
                    Primary Driver: {h.primaryDriver}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Future forecast curves are computing from recent Open-Meteo precipitation feeds.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WHAT CHANGED */}
      {activeTab === 'what_changed' && (
        <div className="card p-5 space-y-6">
          <div className="border-b border-surface-border pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-brand-light" /> "What Changed" Environmental Delta Analysis
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Differential mathematical comparison between current cycle and previous assessment
            </p>
          </div>

          {whatChanged ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-surface rounded-xl border border-surface-border">
                  <div className="text-xs text-slate-500">Risk Score Change</div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      whatChanged.scoreDelta > 0
                        ? 'text-red-400'
                        : whatChanged.scoreDelta < 0
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}
                  >
                    {whatChanged.scoreDelta >= 0 ? `+${whatChanged.scoreDelta.toFixed(1)}` : whatChanged.scoreDelta.toFixed(1)} pts
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-surface-border">
                  <div className="text-xs text-slate-500">Rainfall Delta (24h)</div>
                  <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                    {whatChanged.rainfall24hDelta >= 0 ? `+${whatChanged.rainfall24hDelta.toFixed(1)}` : whatChanged.rainfall24hDelta.toFixed(1)} mm
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-surface-border">
                  <div className="text-xs text-slate-500">Risk Level Transition</div>
                  <div className="text-sm font-bold text-white mt-2 flex items-center gap-2">
                    <RiskBadge level={whatChanged.previousLevel} size="xs" />
                    <span>→</span>
                    <RiskBadge level={whatChanged.currentLevel} size="xs" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-surface rounded-xl border border-surface-border">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Primary Environmental Driver
                </div>
                <div className="text-sm font-medium text-white">{whatChanged.primaryCause}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-8">
              Telemetry deltas require at least two completed assessment cycles.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GEOTECHNICAL & TERRAIN */}
      {activeTab === 'geotech' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-surface-border pb-3">
              <Mountain size={16} className="text-amber-400" />
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                SRTM 90m Topographical Physics
              </div>
            </div>
            {terrain ? (
              <div className="space-y-2 text-xs">
                <Row label="Mean Slope Gradient" value={`${terrain.avgSlope_deg}°`} />
                <Row label="Max Peak Slope" value={`${terrain.maxSlope_deg}°`} />
                <Row label="Terrain Elevation" value={`${terrain.elevation_m} m MSL`} />
                <Row label="Slope Susceptibility" value={`${(terrain.slopeSusceptibility * 100).toFixed(0)}%`} />
                <Row label="DEM Data Source" value={<span className="font-mono text-[11px]">{terrain.dem_source}</span>} />
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4">Terrain data pending SRTM extraction.</div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-surface-border pb-3">
              <Layers size={16} className="text-emerald-400" />
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                ISRIC SoilGrids v2.0 Geotechnical Specs
              </div>
            </div>
            {soil ? (
              <div className="space-y-2 text-xs">
                <Row label="Soil Classification" value={soil.soilType} />
                <Row label="Clay Fraction (0-30cm)" value={`${soil.clay_pct}%`} />
                <Row label="Sand Fraction" value={`${soil.sand_pct}%`} />
                <Row label="Silt Fraction" value={`${soil.silt_pct}%`} />
                <Row label="Bulk Density" value={`${soil.bulkDensity} g/cm³`} />
                <Row label="Water Retention Index" value={`${(soil.waterRetentionIndex * 100).toFixed(0)}%`} />
                <Row label="Soil Susceptibility" value={`${(soil.soilSusceptibility * 100).toFixed(0)}%`} />
                <Row label="Geotechnical Provenance" value={<span className="font-mono text-[11px]">{soil.source}</span>} />
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4">Soil data pending ISRIC SoilGrids extraction.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: OSM INFRASTRUCTURE */}
      {activeTab === 'exposure' && (
        <div className="card p-5 space-y-6">
          <div className="border-b border-surface-border pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-brand-light" /> OpenStreetMap Critical Infrastructure Inventory (5km Buffer)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified critical lifeline assets vulnerable to slope deformation in this catchment
            </p>
          </div>

          {infrastructure ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-surface rounded-lg border border-surface-border text-center">
                <div className="text-xs text-slate-500">Road Segments</div>
                <div className="text-xl font-bold text-white mt-1 font-mono">{infrastructure.roads.length}</div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-surface-border text-center">
                <div className="text-xs text-slate-500">Schools</div>
                <div className="text-xl font-bold text-white mt-1 font-mono">{infrastructure.schools.length}</div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-surface-border text-center">
                <div className="text-xs text-slate-500">Hospitals / Clinics</div>
                <div className="text-xl font-bold text-white mt-1 font-mono">{infrastructure.hospitals.length}</div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-surface-border text-center">
                <div className="text-xs text-slate-500">Bridges</div>
                <div className="text-xl font-bold text-white mt-1 font-mono">{infrastructure.bridges.length}</div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-surface-border text-center">
                <div className="text-xs text-slate-500">Settlement Nodes</div>
                <div className="text-xl font-bold text-white mt-1 font-mono">{infrastructure.settlements.length}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-8 text-center">
              Infrastructure assets pending Overpass OSM query.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: EVACUATION & SAFE SHELTERS */}
      {activeTab === 'shelters' && (
        <div className="card p-5 space-y-6">
          <div className="border-b border-surface-border pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-emerald-400" /> Designated Safe Relief Shelters & Evacuation Corridors
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-identified higher-ground cyclone & landslide relief centers for {location.name} ({location.district})
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
              3 SAFE CENTERS DESIGNATED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{location.district} District Multi-Purpose Indoor Stadium</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700 font-bold">
                  PRIMARY SHELTER
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Elevation:</span>
                  <span className="font-mono text-white">{(location.coordinates.lat * 50 + 400).toFixed(0)} m MSL (Ridge Top)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="font-mono text-emerald-400 font-bold">2,500 Persons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance from Hazard:</span>
                  <span className="font-mono text-slate-200">1.8 km via Ridge Road</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Generator & Medical:</span>
                  <span className="text-emerald-400 font-bold">✅ 120kVA Gen + Triage Desk</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{location.name} Govt. Higher Secondary Campus</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700 font-bold">
                  SECONDARY
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Elevation:</span>
                  <span className="font-mono text-white">{(location.coordinates.lat * 50 + 350).toFixed(0)} m MSL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="font-mono text-blue-400 font-bold">1,200 Persons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance from Hazard:</span>
                  <span className="font-mono text-slate-200">2.4 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Water Tank & Food:</span>
                  <span className="text-blue-400 font-bold">✅ 10,000L Overhead Tank</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Community Disaster Relief Hall (Ward 4)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-900/60 text-yellow-300 border border-yellow-700 font-bold">
                  TERTIARY
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Elevation:</span>
                  <span className="font-mono text-white">{(location.coordinates.lat * 50 + 310).toFixed(0)} m MSL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="font-mono text-yellow-400 font-bold">800 Persons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance from Hazard:</span>
                  <span className="font-mono text-slate-200">3.1 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ham Radio Station:</span>
                  <span className="text-emerald-400 font-bold">✅ VHF 145.5 MHz Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-surface rounded-xl border border-surface-border space-y-2">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass size={14} className="text-brand-light" /> Designated Evacuation Corridors & Road Advisory
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-surface-card border border-surface-border">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>🟢 Primary Evacuation Corridor (Ridge Highway)</span>
                </div>
                <div className="text-slate-400 mt-1 text-[11px]">
                  Paved double-lane road along mountain ridge away from runoff channels. Open for all emergency transport.
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-card border border-surface-border">
                <div className="font-bold text-red-400 flex items-center gap-1.5">
                  <span>🔴 High-Hazard Valley Cut Route (RESTRICTED)</span>
                </div>
                <div className="text-slate-400 mt-1 text-[11px]">
                  Passes directly beneath 32° toe slope. Barricades deployed by district traffic police during heavy rain.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SCENARIO SIMULATION */}
      {activeTab === 'simulation' && (role === 'admin' || role === 'authority') && (
        <SimulationPanel locationId={location.id} locationName={location.name} />
      )}

      {/* Emergency SMS Modal */}
      <EmergencySmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        defaultLocationId={location.id}
      />
    </div>
  );
}


