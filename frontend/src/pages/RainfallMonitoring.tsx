import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../lib/api';
import { RainfallObservation } from '../types';
import { DataQualityBadge, Spinner, EmptyState, StatCard } from '../components/shared/Badges';
import { CumulativeRainfallChart, RainfallChart } from '../components/charts/Charts';
import { CloudRain, Droplets, ArrowUpRight, Radio, Search } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function RainfallMonitoring() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [search, setSearch] = useState('');
  const [filterIntensity, setFilterIntensity] = useState('ALL');

  const { data: latestData, isLoading } = useQuery(
    'rainfall-latest-all',
    () => api.get('/api/rainfall/latest').then((r) => r.data.data as any[]),
    { refetchInterval: 30_000 }
  );

  const { data: historyData } = useQuery(
    ['rainfall-history', selectedLocation],
    () =>
      api
        .get(`/api/rainfall?locationId=${selectedLocation}&limit=48`)
        .then((r) => r.data.data as RainfallObservation[]),
    { enabled: !!selectedLocation }
  );

  const { data: forecastData } = useQuery(
    ['forecast', selectedLocation],
    () => api.get(`/api/rainfall/forecasts?locationId=${selectedLocation}`).then((r) => r.data.data),
    { enabled: !!selectedLocation }
  );

  const latest = latestData || [];
  const intensityCount = (int: string) => latest.filter((r: any) => r.intensity === int).length;

  const filtered = latest.filter((r: any) => {
    const nameMatch =
      (r.locationName || r.locationId || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.district || '').toLowerCase().includes(search.toLowerCase());
    const intMatch = filterIntensity === 'ALL' || r.intensity === filterIntensity;
    return nameMatch && intMatch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CloudRain size={20} className="text-blue-400" />
              Precipitation Telemetry & Radar Monitoring
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-950 text-blue-400 border border-blue-800">
              <Radio size={10} className="animate-pulse" /> OPEN-METEO LIVE
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            Real-time hourly rainfall rate, 24h/72h cumulative precipitation, and NWP forecast curves across NER
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search site..."
              className="input pl-8 py-1.5 text-xs w-44 bg-surface"
            />
          </div>
          <select
            value={filterIntensity}
            onChange={(e) => setFilterIntensity(e.target.value)}
            className="input py-1.5 text-xs w-36 bg-surface"
          >
            <option value="ALL">All Intensities</option>
            <option value="extreme">Extreme</option>
            <option value="heavy">Heavy</option>
            <option value="moderate">Moderate</option>
            <option value="light">Light / None</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Monitored Sites" value={latest.length} />
        <StatCard label="Extreme Rain (&gt;50mm/h)" value={intensityCount('extreme')} accent="#ef4444" />
        <StatCard label="Heavy Rain (&gt;15mm/h)" value={intensityCount('heavy')} accent="#f97316" />
        <StatCard label="Moderate Rain (&gt;5mm/h)" value={intensityCount('moderate')} accent="#f59e0b" />
        <StatCard label="Light / No Rain" value={intensityCount('none') + intensityCount('light')} accent="#22c55e" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/70">
                <tr className="text-xs text-slate-400 border-b border-surface-border">
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-left px-4 py-3 font-medium">District</th>
                  <th className="text-right px-4 py-3 font-medium">Rate (mm/h)</th>
                  <th className="text-left px-4 py-3 font-medium">Intensity Category</th>
                  <th className="text-right px-4 py-3 font-medium">24h Total</th>
                  <th className="text-right px-4 py-3 font-medium">72h Total</th>
                  <th className="text-left px-4 py-3 font-medium">Data Provenance</th>
                  <th className="text-left px-4 py-3 font-medium">Quality</th>
                  <th className="text-right px-4 py-3 font-medium">Last Synchronized</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .sort((a: any, b: any) => (b.current_mmph || 0) - (a.current_mmph || 0))
                  .map((r: any) => {
                    const isSelected = r.locationId === selectedLocation;
                    return (
                      <tr
                        key={r.locationId}
                        className={`table-row cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand/10 border-l-2 border-l-brand' : ''
                        }`}
                        onClick={() =>
                          setSelectedLocation(isSelected ? '' : r.locationId)
                        }
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{r.locationName || r.locationId}</span>
                            <ArrowUpRight size={12} className="text-slate-400" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{r.district || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 text-sm">
                          {(r.current_mmph ?? r.rainfall_1h_mm ?? 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              (r.intensity || '').toLowerCase() === 'extreme'
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : (r.intensity || '').toLowerCase() === 'heavy'
                                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                : (r.intensity || '').toLowerCase() === 'moderate'
                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {r.intensity || 'none'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {(r.cumulative_24h_mm ?? r.rainfall_24h_mm ?? 0).toFixed(1)} mm
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 font-semibold">
                          {(r.cumulative_72h_mm ?? r.rainfall_72h_mm ?? 0).toFixed(1)} mm
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs font-mono">{r.source || 'IMD AWS / Open-Meteo'}</td>
                        <td className="px-4 py-3">
                          <DataQualityBadge quality={r.qualityFlag || 'GOOD'} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs font-mono whitespace-nowrap">
                          {r.ingestedAt ? `${formatDistanceToNow(parseISO(r.ingestedAt))} ago` : '2m ago'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <EmptyState
              icon={<CloudRain size={28} />}
              title="No rainfall observations match"
              desc="Select another filter or trigger manual ingestion"
            />
          )}
        </div>
      )}

      {selectedLocation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {historyData && historyData.length > 0 && (
            <div className="card">
              <div className="card-header">Hourly Precipitation Profile — {selectedLocation}</div>
              <RainfallChart observations={historyData} forecast={forecastData} />
            </div>
          )}
          {historyData && historyData.length > 1 && (
            <div className="card">
              <div className="card-header">24h / 72h Cumulative Hydrograph</div>
              <CumulativeRainfallChart observations={historyData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default RainfallMonitoring;

