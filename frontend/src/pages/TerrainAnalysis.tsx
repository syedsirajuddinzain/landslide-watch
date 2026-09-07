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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Mountain size={20} className="text-orange-400" />
            Terrain & Slope Gradient Analysis
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Topographic slope angles and SRTM 90m Digital Elevation Models via OpenTopoData API
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Monitored Topographic Sites" value={terrain.length} />
        <StatCard label="Steep Slopes (≥25°)" value={steepCount} accent="#f97316" sub="High gravitational hazard" />
        <StatCard label="Mean Elevation" value={`${avgElevation} m`} accent="#38bdf8" sub="Above sea level" />
        <StatCard label="Elevation Model" value="SRTMGL1" accent="#a855f7" sub="NASA/USGS 30-90m DEM" />
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Layers size={14} className="text-brand-light" /> Slope Angle Hazard Classification Scale (Varnes 1984 / BIS 14496)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-surface rounded-lg border border-surface-border">
            <div className="text-green-400 font-bold">&lt; 10° (Gentle)</div>
            <div className="text-slate-400 mt-1">Minimal gravitational shear stress. Low landslide initiation hazard.</div>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-surface-border">
            <div className="text-yellow-400 font-bold">10° – 20° (Moderate)</div>
            <div className="text-slate-400 mt-1">Vulnerable during prolonged antecedent rainfall saturation.</div>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-surface-border">
            <div className="text-orange-400 font-bold">20° – 30° (Steep)</div>
            <div className="text-slate-400 mt-1">High susceptibility. Primary landslide initiation zone in NER hill tracts.</div>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-surface-border">
            <div className="text-red-400 font-bold">&gt; 30° (Very Steep / Escarpment)</div>
            <div className="text-slate-400 mt-1">Critical threshold. Rapid rockfalls, debris flows, and planar translational slides.</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Topographic Slope Registry ({terrain.length} Locations)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/70">
                <tr className="text-xs text-slate-400 border-b border-surface-border">
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-left px-4 py-3 font-medium">District & State</th>
                  <th className="text-right px-4 py-3 font-medium">Elevation</th>
                  <th className="text-right px-4 py-3 font-medium">Avg Slope</th>
                  <th className="text-right px-4 py-3 font-medium">Max Slope</th>
                  <th className="text-left px-4 py-3 font-medium">Susceptibility Index</th>
                  <th className="text-left px-4 py-3 font-medium">DEM Source</th>
                  <th className="text-center px-4 py-3 font-medium">Quality</th>
                </tr>
              </thead>
              <tbody>
                {terrain
                  .sort((a: any, b: any) => (b.avgSlope_deg || 0) - (a.avgSlope_deg || 0))
                  .map((t: any) => {
                    const avgSlope = t.avgSlope_deg || 0;
                    const slopeColor =
                      avgSlope >= 30
                        ? 'text-red-600 font-bold'
                        : avgSlope >= 20
                        ? 'text-orange-600 font-bold'
                        : avgSlope >= 10
                        ? 'text-amber-600 font-semibold'
                        : 'text-emerald-600 font-semibold';

                    return (
                      <tr key={t.locationId} className="table-row">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <Link
                            to={`/locations/${t.locationId}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {t.location?.name || t.locationId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
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
