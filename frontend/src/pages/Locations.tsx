import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Location, RiskAssessment, RiskLevel } from '../types';
import { MOCK_LOCATIONS } from '../lib/mockData';
import { RiskBadge, PriorityBadge, TrendBadge, Spinner, EmptyState } from '../components/shared/Badges';
import { MapPin, Search, Filter } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function Locations() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');
  const [stateFilter, setStateFilter] = useState('');

  const { data, isLoading } = useQuery(
    'locations',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { refetchInterval: 60_000 }
  );

  const locations = (data || [])
    .filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.state.toLowerCase().includes(q);
      const matchRisk = !riskFilter || l.latestRisk?.riskLevel === riskFilter;
      const matchState = !stateFilter || l.state === stateFilter;
      return matchSearch && matchRisk && matchState;
    })
    .sort((a, b) => (b.latestRisk?.finalScore || 0) - (a.latestRisk?.finalScore || 0));

  const states = [...new Set((data || []).map((l) => l.state))].sort();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin size={20} className="text-brand-light" />
            Monitored NER Catchment Registry
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            20 Monitored Sites Across 13 NER Districts with Real-Time Multi-Factor Risk & Priorities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search site / district..."
              className="input pl-8 py-1.5 text-xs w-48 bg-surface"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="input py-1.5 text-xs w-32 bg-surface"
          >
            <option value="">All Risk Levels</option>
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as RiskLevel[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="input py-1.5 text-xs w-36 bg-surface"
          >
            <option value="">All States ({states.length})</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/70">
                <tr className="text-xs text-slate-400 border-b border-surface-border">
                  <th className="text-left px-4 py-3 font-medium">Location Name</th>
                  <th className="text-left px-4 py-3 font-medium">District & State</th>
                  <th className="text-center px-4 py-3 font-medium">Priority</th>
                  <th className="text-center px-4 py-3 font-medium">Risk Level</th>
                  <th className="text-right px-4 py-3 font-medium">Risk Score</th>
                  <th className="text-right px-4 py-3 font-medium">24h Rain</th>
                  <th className="text-right px-4 py-3 font-medium">Slope</th>
                  <th className="text-left px-4 py-3 font-medium">Risk Trend</th>
                  <th className="text-right px-4 py-3 font-medium">Population</th>
                  <th className="text-right px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const mock = MOCK_LOCATIONS.find((m) => m.id === loc.id || m.name.toLowerCase() === loc.name.toLowerCase());
                  const risk = loc.latestRisk || mock?.latestRisk;
                  return (
                    <tr
                      key={loc.id}
                      className="table-row cursor-pointer hover:bg-surface/60 transition-colors"
                      onClick={() => navigate(`/locations/${loc.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-white">{loc.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {loc.district}, {loc.state}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {risk ? (
                          <PriorityBadge priority={risk.priorityLevel || 'P4'} />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {risk ? <RiskBadge level={risk.riskLevel} /> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {risk?.finalScore.toFixed(1) || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-400">
                        {risk ? `${risk.inputs.rainfall_24h_mm.toFixed(1)} mm` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-orange-400">
                        {risk ? `${risk.inputs.slope_deg.toFixed(1)}°` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {risk ? <TrendBadge trend={risk.trend} pct={risk.trendPct} /> : null}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono">
                        {loc.population.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs font-mono whitespace-nowrap">
                        {risk ? `${formatDistanceToNow(parseISO(risk.timestamp))} ago` : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {locations.length === 0 && (
            <EmptyState icon={<MapPin size={28} />} title="No locations match selected filters" />
          )}
        </div>
      )}
    </div>
  );
}
export default Locations;

