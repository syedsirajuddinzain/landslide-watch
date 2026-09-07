import { DataQualityBadge, EmptyState, Spinner, StatCard } from '../components/shared/Badges';
// ============================================================
// RISK ANALYTICS
// ============================================================
import { useQuery } from 'react-query';
import api from '../lib/api';
import { RiskDistributionChart, RiskByDistrictChart, RainfallChart } from '../components/charts/Charts';
import { BarChart2 } from 'lucide-react';

export function RiskAnalytics() {
  const { data: dist } = useQuery('risk-dist', () => api.get('/api/analytics/risk-distribution').then(r => r.data.data));
  const { data: alertFreq } = useQuery('alert-freq', () => api.get('/api/analytics/alert-frequency').then(r => r.data.data));
  const { data: rainfallSum } = useQuery('rainfall-summary', () => api.get('/api/analytics/rainfall-summary').then(r => r.data.data as any[]));

  const distData = dist || { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
  const total = Object.values(distData).reduce((a: any, b: any) => a + b, 0) as number;

  const byDistrict = Object.entries(
    (rainfallSum || []).reduce((acc: Record<string, any[]>, r: any) => {
      const d = r.district || 'Unknown';
      if (!acc[d]) acc[d] = [];
      acc[d].push(r);
      return acc;
    }, {})
  ).map(([district, locs]) => ({
    district,
    avgScore: 50,
    maxLevel: 'MODERATE',
  })).slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Risk Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Monitored" value={total} />
        <StatCard label="CRITICAL" value={(distData as any).CRITICAL || 0} accent="#ef4444" />
        <StatCard label="HIGH" value={(distData as any).HIGH || 0} accent="#f97316" />
        <StatCard label="Alerts (Total)" value={alertFreq?.total || 0} accent="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">Risk Level Distribution</div>
          <RiskDistributionChart data={distData} />
        </div>
        <div className="card">
          <div className="card-header">Alert Status Breakdown</div>
          {alertFreq ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {Object.entries(alertFreq.byStatus || {}).map(([status, count]) => (
                <div key={status} className="bg-surface p-3 rounded-lg">
                  <div className="text-xs text-slate-500">{status}</div>
                  <div className="text-xl font-bold text-white">{count as number}</div>
                </div>
              ))}
            </div>
          ) : <Spinner />}
        </div>
        <div className="card">
          <div className="card-header">Rainfall Summary (All Locations)</div>
          {rainfallSum && rainfallSum.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500 border-b border-surface-border">
                  <th className="text-left pb-2">Location</th>
                  <th className="text-right pb-2">24h (mm)</th>
                  <th className="text-right pb-2">72h (mm)</th>
                  <th className="text-right pb-2">Intensity</th>
                </tr></thead>
                <tbody>
                  {(rainfallSum || []).sort((a: any, b: any) => b.cumulative_24h_mm - a.cumulative_24h_mm).slice(0, 10).map((r: any) => (
                    <tr key={r.locationId} className="border-b border-surface-border/50">
                      <td className="py-1.5 text-white">{r.locationName}</td>
                      <td className="py-1.5 text-right font-mono text-blue-400">{r.cumulative_24h_mm?.toFixed(1)}</td>
                      <td className="py-1.5 text-right font-mono text-slate-400">{r.cumulative_72h_mm?.toFixed(1)}</td>
                      <td className="py-1.5 text-right uppercase text-xs text-slate-500">{r.intensity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="text-xs text-slate-500 text-center py-8">No rainfall data yet</div>}
        </div>
        <div className="card">
          <div className="card-header">Alert Types</div>
          {alertFreq ? (
            <div className="space-y-3 mt-2">
              {Object.entries(alertFreq.byLevel || {}).map(([level, count]) => (
                <div key={level} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-400">{level}</div>
                  <div className="flex-1 bg-surface rounded-full h-2">
                    <div className="h-2 rounded-full bg-brand-light" style={{ width: `${Math.min(100, ((count as number) / (alertFreq.total || 1)) * 100)}%` }} />
                  </div>
                  <div className="text-xs font-mono text-white w-6 text-right">{count as number}</div>
                </div>
              ))}
            </div>
          ) : <Spinner />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TERRAIN PAGE
// ============================================================
export function Terrain() {
  const { data, isLoading } = useQuery('terrain-all', () => api.get('/api/terrain').then(r => r.data.data as any[]));
  const { data: locData } = useQuery('locations', () => api.get('/api/locations').then(r => r.data.data as any[]));

  const locMap = Object.fromEntries((locData || []).map((l: any) => [l.id, l]));
  const terrain = (data || []).map((t: any) => ({ ...t, location: locMap[t.locationId] }));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Terrain & Slope Analysis</h1>
      <p className="text-slate-400 text-sm">Elevation and slope data from SRTM via OpenTopoData API · Processed once during initialization</p>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface"><tr className="text-xs text-slate-500 border-b border-surface-border">
              {['Location','District','State','Elevation (m)','Avg Slope (°)','Max Slope (°)','Susceptibility','Source','Quality'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {terrain.sort((a: any, b: any) => b.avgSlope_deg - a.avgSlope_deg).map((t: any) => (
                <tr key={t.locationId} className="table-row">
                  <td className="px-4 py-2.5 font-medium text-white">{t.location?.name || t.locationId}</td>
                  <td className="px-4 py-2.5 text-slate-400">{t.location?.district}</td>
                  <td className="px-4 py-2.5 text-slate-400">{t.location?.state}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{t.elevation_m}</td>
                  <td className="px-4 py-2.5 font-mono text-orange-400">{t.avgSlope_deg}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{t.maxSlope_deg}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${(t.slopeSusceptibility || 0) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{((t.slopeSusceptibility || 0)*100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">{t.dem_source}</td>
                  <td className="px-4 py-2.5"><DataQualityBadge quality={t.qualityFlag || "GOOD"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SOIL PAGE
// ============================================================
export function SoilAnalysis() {
  const { data, isLoading } = useQuery('soil-all', () => api.get('/api/soil').then(r => r.data.data as any[]));
  const { data: locData } = useQuery('locations', () => api.get('/api/locations').then(r => r.data.data as any[]));
  const locMap = Object.fromEntries((locData || []).map((l: any) => [l.id, l]));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Soil Analysis</h1>
      <p className="text-slate-400 text-sm">Soil property data from ISRIC SoilGrids v2 · Processed once during initialization</p>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface"><tr className="text-xs text-slate-500 border-b border-surface-border">
              {['Location','State','Soil Type','Clay %','Sand %','Silt %','Bulk Density','Org. Carbon','Susceptibility','Source'].map(h => (
                <th key={h} className="text-left px-3 py-3 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(data || []).sort((a: any, b: any) => b.soilSusceptibility - a.soilSusceptibility).map((s: any) => (
                <tr key={s.locationId} className="table-row">
                  <td className="px-3 py-2.5 font-medium text-white">{locMap[s.locationId]?.name || s.locationId}</td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs">{locMap[s.locationId]?.state}</td>
                  <td className="px-3 py-2.5 text-slate-300">{s.soilType}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">{s.clay_pct}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">{s.sand_pct}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">{s.silt_pct}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">{s.bulkDensity}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">{s.organicCarbon}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-surface rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-yellow-400" style={{ width: `${(s.soilSusceptibility || 0)*100}%` }} />
                      </div>
                      <span className="text-xs">{((s.soilSusceptibility || 0)*100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HISTORICAL LANDSLIDES — with casualty summary + lessons learned
// ============================================================
import { useState as useHistState, Fragment } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

export function HistoricalLandslides() {
  const { data, isLoading } = useQuery('landslides', () => api.get('/api/landslides?limit=200').then(r => r.data.data as any[]));
  const [expandedId, setExpandedId] = useHistState<string | null>(null);

  const events = data || [];
  const sorted = [...events].sort((a: any, b: any) => b.date.localeCompare(a.date));

  const totals = events.reduce((acc: any, ls: any) => ({
    fatalities: acc.fatalities + (ls.fatalities ?? 0),
    injuries: acc.injuries + (ls.injuries ?? 0),
    missing: acc.missing + (ls.missing ?? 0),
  }), { fatalities: 0, injuries: 0, missing: 0 });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Historical Landslide Events</h1>
      <p className="text-slate-400 text-sm">Data from NASA COOLR catalog + curated NER records · {events.length} events. Click any event to view lessons learned.</p>

      {isLoading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Events" value={events.length} />
            <StatCard label="Total Fatalities" value={totals.fatalities} accent="#ef4444" />
            <StatCard label="Total Injuries" value={totals.injuries} accent="#f97316" />
            <StatCard label="Total Missing" value={totals.missing} accent="#a855f7" />
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface"><tr className="text-xs text-slate-500 border-b border-surface-border">
                {['Date','Location','District','State','Trigger','Fatalities','Injuries','Missing','Source',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {sorted.map((ls: any) => {
                  const isOpen = expandedId === ls.id;
                  return (
                    <Fragment key={ls.id}>
                      <tr
                        className="table-row cursor-pointer hover:bg-surface/60"
                        onClick={() => setExpandedId(isOpen ? null : ls.id)}
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-300 text-xs">{ls.date}</td>
                        <td className="px-4 py-2.5 text-white">{ls.locationName}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{ls.district}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{ls.state}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">{ls.trigger}</td>
                        <td className="px-4 py-2.5 text-center text-red-400">{ls.fatalities ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center text-orange-400">{ls.injuries ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center text-purple-400">{ls.missing ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{ls.source}</td>
                        <td className="px-4 py-2.5 text-slate-400">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-surface/40">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="text-sm text-slate-300 mb-2">{ls.description}</div>
                            {ls.lessonsLearned ? (
                              <div className="flex gap-2 items-start bg-surface rounded-lg p-3 border border-surface-border">
                                <BookOpen size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Lessons Learned</div>
                                  <div className="text-sm text-slate-300">{ls.lessonsLearned}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 italic">No documented lessons-learned notes for this event yet.</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// INFRASTRUCTURE
// ============================================================
export function Infrastructure() {
  const { data, isLoading } = useQuery('infra-all', () => api.get('/api/infrastructure').then(r => r.data.data as any[]));
  const { data: locData } = useQuery('locations', () => api.get('/api/locations').then(r => r.data.data as any[]));
  const locMap = Object.fromEntries((locData || []).map((l: any) => [l.id, l]));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Infrastructure & Exposure</h1>
      <p className="text-slate-400 text-sm">OSM data within 5km radius of each monitored location</p>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface"><tr className="text-xs text-slate-500 border-b border-surface-border">
              {['Location','State','Roads','Bridges','Schools','Hospitals','Settlements','Source'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(data || []).map((inf: any) => (
                <tr key={inf.locationId} className="table-row">
                  <td className="px-4 py-2.5 font-medium text-white">{locMap[inf.locationId]?.name || inf.locationId}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{locMap[inf.locationId]?.state}</td>
                  <td className="px-4 py-2.5 text-slate-300">{(inf.roads || []).length}</td>
                  <td className="px-4 py-2.5 text-slate-300">{(inf.bridges || []).length}</td>
                  <td className="px-4 py-2.5 text-slate-300">{(inf.schools || []).length}</td>
                  <td className="px-4 py-2.5 text-slate-300">{(inf.hospitals || []).length}</td>
                  <td className="px-4 py-2.5 text-slate-300">{(inf.settlements || []).length}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 truncate">{inf.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================
import { useMutation, useQueryClient } from 'react-query';
import { Bell, CheckCircle as CheckIcon } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery('notifications', () => api.get('/api/notifications').then(r => r.data.data as any[]));

  const markRead = useMutation((id: string) => api.patch(`/api/notifications/${id}/read`), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });
  const markAll = useMutation(() => api.patch('/api/notifications/mark-all-read'), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });

  const notifs = data || [];
  const unread = notifs.filter((n: any) => !n.isRead).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 text-sm">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markAll.mutate()} className="btn-ghost text-xs">Mark all read</button>
        )}
      </div>
      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {notifs.length === 0 ? (
            <div className="card"><EmptyState icon={<Bell size={28} />} title="No notifications" /></div>
          ) : notifs.map((n: any) => (
            <div key={n.id} className={`card flex items-start gap-3 cursor-pointer transition-all ${!n.isRead ? 'border-brand/40 bg-brand/5' : ''}`}
              onClick={() => !n.isRead && markRead.mutate(n.id)}>
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.type === 'warning' ? 'bg-red-400' : 'bg-blue-400'} ${!n.isRead ? 'opacity-100' : 'opacity-0'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{n.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{n.body}</div>
                <div className="text-xs text-slate-600 mt-1">{formatDistanceToNow(parseISO(n.createdAt))} ago</div>
              </div>
              {n.isRead && <CheckIcon size={14} className="text-slate-600 flex-shrink-0 mt-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DATA SOURCES
// ============================================================
export function DataSources() {
  const { data, isLoading } = useQuery('datasources', () => api.get('/api/datasources').then(r => r.data.data as any[]));


  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Data Sources</h1>
      <p className="text-slate-400 text-sm">All external data providers and their current status</p>
      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data || []).map((src: any) => (
            <div key={src.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-white text-sm">{src.name}</div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${src.status === 'LIVE' ? 'bg-green-900/40 text-green-400' : src.status === 'STATIC' ? 'bg-blue-900/40 text-blue-400' : src.status === 'ERROR' ? 'bg-red-900/40 text-red-400' : 'bg-slate-700 text-slate-400'}`}>{src.status}</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Type: <span className="text-slate-300">{src.type}</span></div>
                <div>Update frequency: <span className="text-slate-300">{src.updateFrequency}</span></div>
                <div>Coverage: <span className="text-slate-300">{src.coverage}</span></div>
                {src.lastSuccessAt && <div>Last success: <span className="text-slate-300">{formatDistanceToNow(parseISO(src.lastSuccessAt))} ago</span></div>}
                <div className="text-slate-600 mt-1">{src.qualityNotes}</div>
              </div>
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-light hover:text-white mt-2 block">{src.url} →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// RESPONSE CENTER
// ============================================================
import { AlertTriangle as Alert2, Shield } from 'lucide-react';

export function ResponseCenter() {
  const { data } = useQuery('active-alerts', () => api.get('/api/alerts/active').then(r => r.data.data as any[]));
  const alerts = data || [];
  const criticalAlerts = alerts.filter((a: any) => a.riskLevel === 'CRITICAL');
  const highAlerts = alerts.filter((a: any) => a.riskLevel === 'HIGH');

  const HIGH_ACTIONS = [
    'Increase monitoring frequency for this location.',
    'Alert field teams to be on standby.',
    'Review drainage infrastructure status.',
    'Communicate risk status to district officials.',
    'Inspect roads and bridges in the area.',
    'Review and update evacuation route maps.',
  ];

  const CRITICAL_ACTIONS = [
    'URGENT: Dispatch field team for immediate visual inspection.',
    'Alert district collector and state disaster management authority.',
    'Inspect all critical infrastructure (bridges, roads, hospitals, schools).',
    'Review safety of residents in the affected area.',
    'Prepare public warning communications — verify conditions first before issuing.',
    'Identify vulnerable populations (elderly, mobility-impaired) for priority action.',
    'Coordinate with NDRF/SDRF for potential deployment.',
    'Activate district emergency operations center if not already done.',
    'Isolate or restrict access to high-slope areas until field-assessed.',
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Response Center</h1>
        <p className="text-slate-400 text-sm">Decision-support recommendations based on current active alerts</p>
      </div>
      <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3 text-amber-300 text-xs">
        ⚠️ These are decision-support recommendations only. Do NOT issue evacuation orders automatically. All actions require field verification and authority approval.
      </div>

      {criticalAlerts.length > 0 && (
        <div className="card border-red-800">
          <div className="flex items-center gap-2 mb-4">
            <Alert2 size={18} className="text-red-400" />
            <div className="text-red-400 font-semibold">CRITICAL — {criticalAlerts.length} Location(s)</div>
          </div>
          <div className="mb-3">
            {criticalAlerts.map((a: any) => (
              <div key={a.id} className="text-sm text-white mb-1">• {a.locationName}, {a.district} — Score: {a.riskScore.toFixed(1)}</div>
            ))}
          </div>
          <div className="space-y-1.5">
            {CRITICAL_ACTIONS.map((action, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-200 p-2 bg-red-900/20 rounded">
                <span className="text-red-400 font-bold flex-shrink-0">{i+1}.</span>{action}
              </div>
            ))}
          </div>
        </div>
      )}

      {highAlerts.length > 0 && (
        <div className="card border-orange-800">
          <div className="flex items-center gap-2 mb-4">
            <Alert2 size={16} className="text-orange-400" />
            <div className="text-orange-400 font-semibold">HIGH — {highAlerts.length} Location(s)</div>
          </div>
          <div className="mb-3">
            {highAlerts.map((a: any) => (
              <div key={a.id} className="text-sm text-white mb-1">• {a.locationName}, {a.district} — Score: {a.riskScore.toFixed(1)}</div>
            ))}
          </div>
          <div className="space-y-1.5">
            {HIGH_ACTIONS.map((action, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-200 p-2 bg-orange-900/20 rounded">
                <span className="text-orange-400 font-bold flex-shrink-0">{i+1}.</span>{action}
              </div>
            ))}
          </div>
        </div>
      )}

      {criticalAlerts.length === 0 && highAlerts.length === 0 && (
        <div className="card">
          <EmptyState icon={<Shield size={32} className="text-green-500" />} title="No active HIGH or CRITICAL alerts" desc="All monitored locations are within acceptable risk thresholds" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN
// ============================================================
export function Admin() {
  const { data: users } = useQuery('admin-users', () => api.get('/api/admin/users').then(r => r.data.data as any[]));
  const { data: jobs } = useQuery('ingestion-jobs', () => api.get('/api/admin/ingestion-jobs').then(r => r.data.data as any[]));
  const { data: auditLogs } = useQuery('audit-logs', () => api.get('/api/admin/audit-logs').then(r => r.data.data as any[]));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Admin Panel</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">Users</div>
          <div className="space-y-2">
            {(users || []).map((u: any) => (
              <div key={u.uid} className="flex items-center justify-between p-2 bg-surface rounded">
                <div>
                  <div className="text-sm text-white">{u.email}</div>
                  <div className="text-xs text-slate-500">{u.displayName}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-brand/20 text-brand-light">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Recent Ingestion Jobs</div>
          <div className="space-y-2">
            {(jobs || []).slice(0, 8).map((j: any) => (
              <div key={j.id} className="flex items-center justify-between p-2 bg-surface rounded text-xs">
                <div>
                  <div className="text-white">{j.jobType}</div>
                  <div className="text-slate-500">{j.startedAt ? formatDistanceToNow(parseISO(j.startedAt)) + ' ago' : '—'}</div>
                </div>
                <span className={`px-2 py-0.5 rounded ${j.status === 'success' ? 'bg-green-900/40 text-green-400' : j.status === 'failed' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'}`}>{j.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">Audit Log</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-surface-border">
                {['Timestamp','Action','User','Target','Details'].map(h => <th key={h} className="text-left pb-2 pr-4">{h}</th>)}
              </tr></thead>
              <tbody>
                {(auditLogs || []).slice(0, 20).map((log: any) => (
                  <tr key={log.id} className="border-b border-surface-border/30">
                    <td className="py-1.5 pr-4 text-slate-500 font-mono whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}</td>
                    <td className="py-1.5 pr-4 text-brand-light">{log.action}</td>
                    <td className="py-1.5 pr-4 text-slate-400">{log.userEmail}</td>
                    <td className="py-1.5 pr-4 text-slate-400">{log.targetType}</td>
                    <td className="py-1.5 text-slate-500 truncate max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
import { useState as useLocalState } from 'react';

export function Settings() {
  const { data: settings } = useQuery('settings', () => api.get('/api/admin/settings').then(r => r.data.data as any));
  const qc = useQueryClient();
  const [saving, setSaving] = useLocalState(false);

  const save = async (updates: any) => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', updates);
      qc.invalidateQueries('settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-white">System Settings</h1>
      <div className="card space-y-4">
        <div className="card-header">Risk Weights (must sum to 1.0)</div>
        {settings.riskWeights && Object.entries(settings.riskWeights).map(([key, val]) => (
          <div key={key} className="flex items-center gap-4">
            <label className="text-sm text-slate-400 w-32 capitalize">{key}</label>
            <input type="number" step="0.01" min="0" max="1" defaultValue={val as number}
              className="input w-24 text-sm" id={`weight-${key}`} />
          </div>
        ))}
      </div>
      <div className="card space-y-4">
        <div className="card-header">Alert Thresholds</div>
        {settings.alertThresholds && Object.entries(settings.alertThresholds).map(([key, val]) => (
          <div key={key} className="flex items-center gap-4">
            <label className="text-sm text-slate-400 w-32 capitalize">{key}</label>
            <input type="number" min="0" max="100" defaultValue={val as number}
              className="input w-24 text-sm" id={`threshold-${key}`} />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">Demo Mode</div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Enable Demo Mode</label>
          <input type="checkbox" defaultChecked={settings.demoMode} id="demo-mode" className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-600 mt-2">When enabled, all risk calculations are flagged as SIMULATED</div>
      </div>
      <div className="text-xs text-slate-600 bg-surface/50 rounded p-3">
        System Version: {settings.systemVersion} · Ingestion interval: {settings.ingestionIntervalMinutes} min
      </div>
    </div>
  );
}
