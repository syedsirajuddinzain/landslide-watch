import { useQuery } from 'react-query';
import api from '../lib/api';
import { DataQualityBadge, Spinner, StatCard } from '../components/shared/Badges';
import { Mountain, Layers, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TerrainAnalysis() {
  const { data, isLoading } = useQuery('terrain-all', () =>
    api.get('/api/terrain').then((r) => r.data.data as any[])
  );
  const { data: locData } = useQuery('locations', () =>
    api.get('/api/locations').then((r) => r.data.data as any[])
  );

  const locMap = Object.fromEntries((locData || []).map((l: any) => [l.id, l]));
  const terrain = (data || []).map((t: any) => ({
    ...t,
    location: locMap[t.locationId],
  }));

  const steepCount = terrain.filter((t: any) => (t.avgSlope_deg || 0) >= 25).length;
  const avgElevation = terrain.length > 0
    ? Math.round(terrain.reduce((sum: number, t: any) => sum + (t.elevation_m || 0), 0) / terrain.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0F2018] flex items-center gap-2">
            <Mountain size={22} className="text-[#4A7C59]" />
            Terrain & Slope Gradient Analysis
          </h1>
          <p className="text-[#1A3028] text-xs font-medium mt-1">
            Topographic slope angles, elevation gradients, and NASA SRTM 30m Digital Elevation Models across Northeast India
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Monitored Topographic Sites" value={terrain.length} />
        <StatCard label="Steep Slopes (≥25°)" value={steepCount} accent="#f97316" sub="High gravitational hazard" />
        <StatCard label="Mean Elevation" value={`${avgElevation} m`} accent="#38bdf8" sub="Above sea level" />
        <StatCard label="Elevation Model" value="SRTMGL1" accent="#a855f7" sub="NASA/USGS 30-90m DEM" />
      </div>

      <div className="card p-4 bg-white">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#1A3028] uppercase tracking-wider">
          <Layers size={15} className="text-[#4A7C59]" /> Slope Angle Hazard Classification Scale (Varnes 1984 / BIS 14496)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#F5F0E8]/60 rounded-xl border border-[#C8D8BC]">
            <div className="text-emerald-700 font-bold">&lt; 10° (Gentle)</div>
            <div className="text-[#1A3028] mt-1 text-xs">Minimal gravitational shear stress. Low landslide initiation hazard.</div>
          </div>
          <div className="p-3 bg-[#F5F0E8]/60 rounded-xl border border-[#C8D8BC]">
            <div className="text-amber-700 font-bold">10° – 20° (Moderate)</div>
            <div className="text-[#1A3028] mt-1 text-xs">Vulnerable during prolonged antecedent rainfall saturation.</div>
          </div>
          <div className="p-3 bg-[#F5F0E8]/60 rounded-xl border border-[#C8D8BC]">
            <div className="text-orange-700 font-bold">20° – 30° (Steep)</div>
            <div className="text-[#1A3028] mt-1 text-xs">High susceptibility. Primary landslide initiation zone in NER hill tracts.</div>
          </div>
          <div className="p-3 bg-[#F5F0E8]/60 rounded-xl border border-[#C8D8BC]">
            <div className="text-rose-700 font-bold">&gt; 30° (Critical Escarpment)</div>
            <div className="text-[#1A3028] mt-1 text-xs">Critical threshold. Rapid rockfalls, debris flows, and planar slope failures.</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-[#C8D8BC] bg-[#F5F0E8]/70 flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
              Topographic Slope Registry ({terrain.length} Monitored Catchments)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]/70">
                <tr className="text-xs font-bold text-[#1A3028] border-b border-[#C8D8BC]">
                  <th className="text-left px-4 py-3 font-semibold">Catchment</th>
                  <th className="text-left px-4 py-3 font-semibold">District & State</th>
                  <th className="text-right px-4 py-3 font-semibold">Elevation</th>
                  <th className="text-right px-4 py-3 font-semibold">Avg Slope</th>
                  <th className="text-right px-4 py-3 font-semibold">Max Slope</th>
                  <th className="text-left px-4 py-3 font-semibold">Susceptibility Index</th>
                  <th className="text-left px-4 py-3 font-semibold">DEM Source</th>
                  <th className="text-center px-4 py-3 font-semibold">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8D8BC]/60">
                {terrain
                  .sort((a: any, b: any) => (b.avgSlope_deg || 0) - (a.avgSlope_deg || 0))
                  .map((t: any) => {
                    const avgSlope = t.avgSlope_deg || 0;
                    const slopeColor =
                      avgSlope >= 30
                        ? 'text-red-700 font-bold'
                        : avgSlope >= 20
                        ? 'text-orange-700 font-bold'
                        : avgSlope >= 10
                        ? 'text-amber-700 font-semibold'
                        : 'text-emerald-700 font-semibold';

                    return (
                      <tr key={t.locationId} className="hover:bg-[#F5F0E8]/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#0F2018]">
                          <Link
                            to={`/locations/${t.locationId}`}
                            className="hover:text-[#4A7C59] transition-colors"
                          >
                            {t.location?.name || t.locationId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#1A3028] text-xs">
                          {t.location?.district}, {t.location?.state}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {t.elevation_m} m
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${slopeColor}`}>
                          {t.avgSlope_deg}°
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {t.maxSlope_deg}°
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  avgSlope >= 25 ? 'bg-red-500' : 'bg-orange-400'
                                }`}
                                style={{
                                  width: `${Math.min(100, (t.slopeSusceptibility || 0) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-700">
                              {((t.slopeSusceptibility || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                          {t.dem_source || 'SRTM 30m Global DEM'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DataQualityBadge quality={t.qualityFlag || 'GOOD'} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
export default TerrainAnalysis;
