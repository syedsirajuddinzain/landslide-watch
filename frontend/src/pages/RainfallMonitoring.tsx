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
            <h1 className="text-xl font-black text-[#0F2018] flex items-center gap-2">
              <CloudRain size={22} className="text-[#4A7C59]" />
              Precipitation Telemetry & Radar Monitoring
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#4A7C59]/15 text-[#4A7C59] border border-[#7FB99A]">
              <Radio size={11} className="animate-pulse" /> OPEN-METEO LIVE
            </span>
          </div>
          <p className="text-[#1A3028] text-xs font-medium mt-1">
            Real-time hourly rainfall rate, 24h/72h cumulative precipitation, and NWP forecast curves across Northeast India
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catchment..."
              className="input pl-8 py-1.5 text-xs w-44 bg-white"
            />
          </div>
          <select
            value={filterIntensity}
            onChange={(e) => setFilterIntensity(e.target.value)}
            className="input py-1.5 text-xs w-36 bg-white"
          >
            <option value="ALL">All Intensities</option>
            <option value="extreme">Extreme (&gt;50 mm/h)</option>
            <option value="heavy">Heavy (&gt;15 mm/h)</option>
            <option value="moderate">Moderate (&gt;5 mm/h)</option>
            <option value="light">Light / None</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Monitored Sites" value={latest.length} />
        <StatCard label="Extreme Rain (>50mm/h)" value={intensityCount('extreme')} accent="#ef4444" />
        <StatCard label="Heavy Rain (>15mm/h)" value={intensityCount('heavy')} accent="#f97316" />
        <StatCard label="Moderate Rain (>5mm/h)" value={intensityCount('moderate')} accent="#f59e0b" />
        <StatCard label="Light / No Rain" value={intensityCount('none') + intensityCount('light')} accent="#22c55e" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]/70">
                <tr className="text-xs font-bold text-[#1A3028] border-b border-[#C8D8BC]">
                  <th className="text-left px-4 py-3 font-semibold">Catchment / Location</th>
                  <th className="text-left px-4 py-3 font-semibold">District & State</th>
                  <th className="text-right px-4 py-3 font-semibold">Rate (mm/h)</th>
                  <th className="text-left px-4 py-3 font-semibold">Intensity Category</th>
                  <th className="text-right px-4 py-3 font-semibold">24h Accumulated</th>
                  <th className="text-right px-4 py-3 font-semibold">72h Antecedent</th>
                  <th className="text-left px-4 py-3 font-semibold">Data Provenance</th>
                  <th className="text-left px-4 py-3 font-semibold">Quality</th>
                  <th className="text-right px-4 py-3 font-semibold">Last Synchronized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8D8BC]/60">
                {filtered
                  .sort((a: any, b: any) => (b.current_mmph || 0) - (a.current_mmph || 0))
                  .map((r: any) => {
                    const isSelected = r.locationId === selectedLocation;
                    return (
                      <tr
                        key={r.locationId}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#4A7C59]/10 border-l-4 border-l-[#4A7C59]' : 'hover:bg-[#F5F0E8]/50'
                        }`}
                        onClick={() =>
                          setSelectedLocation(isSelected ? '' : r.locationId)
                        }
                      >
                        <td className="px-4 py-3 font-medium text-[#0F2018]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{r.locationName || r.locationId}</span>
                            <ArrowUpRight size={12} className="text-[#4A7C59]" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#1A3028] text-xs">{r.district}, {r.state}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#4A7C59] text-sm">
                          {(r.current_mmph ?? r.rainfall_1h_mm ?? 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              (r.intensity || '').toLowerCase() === 'extreme'
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : (r.intensity || '').toLowerCase() === 'heavy'
                                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                : (r.intensity || '').toLowerCase() === 'moderate'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {r.intensity || 'none'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#0F2018]">
                          {(r.cumulative_24h_mm ?? r.rainfall_24h_mm ?? 0).toFixed(1)} mm
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#1A3028] font-semibold">
                          {(r.cumulative_72h_mm ?? r.rainfall_72h_mm ?? 0).toFixed(1)} mm
                        </td>
                        <td className="px-4 py-3 text-[#1A3028] text-xs font-mono">{r.source || 'Open-Meteo AWS'}</td>
                        <td className="px-4 py-3">
                          <DataQualityBadge quality={r.qualityFlag || 'GOOD'} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs font-mono whitespace-nowrap">
                          {r.ingestedAt ? `${formatDistanceToNow(parseISO(r.ingestedAt))} ago` : 'Just now'}
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

