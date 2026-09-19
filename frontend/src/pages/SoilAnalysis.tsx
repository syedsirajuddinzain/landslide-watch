import { useQuery } from 'react-query';
import api from '../lib/api';
import { DataQualityBadge, Spinner, StatCard } from '../components/shared/Badges';
import { FlaskConical, Droplets, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SoilAnalysis() {
  const { data, isLoading } = useQuery('soil-all', () =>
    api.get('/api/soil').then((r) => r.data.data as any[])
  );
  const { data: locData } = useQuery('locations', () =>
    api.get('/api/locations').then((r) => r.data.data as any[])
  );
  const locMap = Object.fromEntries((locData || []).map((l: any) => [l.id, l]));

  const soils = (data || []).map((s: any) => ({
    ...s,
    location: locMap[s.locationId],
  }));

  const highSusceptibilityCount = soils.filter((s: any) => (s.soilSusceptibility || 0) >= 0.6).length;
  const avgClay = soils.length > 0
    ? Math.round(soils.reduce((sum: number, s: any) => sum + (s.clay_pct || 0), 0) / soils.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0F2018] flex items-center gap-2">
            <FlaskConical size={22} className="text-[#4A7C59]" />
            Soil & Geotechnical Analysis
          </h1>
          <p className="text-[#1A3028] text-xs font-medium mt-1">
            Geotechnical properties from ISRIC SoilGrids v2.0 (250m resolution) — Clay, Sand, Silt, Bulk Density, Water Retention
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Soil Profiles Profiled" value={soils.length} />
        <StatCard label="High Soil Susceptibility" value={highSusceptibilityCount} accent="#f59e0b" sub="Clay/Silt content > 60%" />
        <StatCard label="Mean Clay Proportion" value={`${avgClay}%`} accent="#38bdf8" sub="Governs pore-water pressure" />
        <StatCard label="Database Provider" value="ISRIC SoilGrids" accent="#10b981" sub="Global Gridded Soil Information" />
      </div>

      <div className="card p-4 bg-white border border-[#C8D8BC]">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-[#4A7C59] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1A3028] leading-relaxed">
            <strong className="text-[#0F2018]">Geotechnical Impact on Slope Stability:</strong> High clay and silt proportions increase soil water retention and lower the effective friction angle. During prolonged rainfall, elevated pore-water pressure along shear planes causes sudden loss of shear strength, triggering rapid rotational and translational slope failures.
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
              Regional Geotechnical Soil Registry ({soils.length} Sites)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]/70">
                <tr className="text-xs font-bold text-[#1A3028] border-b border-[#C8D8BC]">
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-left px-4 py-3 font-medium">State</th>
                  <th className="text-left px-4 py-3 font-medium">Soil Class</th>
                  <th className="text-right px-4 py-3 font-medium">Clay %</th>
                  <th className="text-right px-4 py-3 font-medium">Sand %</th>
                  <th className="text-right px-4 py-3 font-medium">Silt %</th>
                  <th className="text-right px-4 py-3 font-medium">Bulk Density</th>
                  <th className="text-left px-4 py-3 font-medium">Susceptibility</th>
                  <th className="text-center px-4 py-3 font-medium">Quality</th>
                </tr>
              </thead>
              <tbody>
                {soils
                  .sort((a: any, b: any) => (b.soilSusceptibility || 0) - (a.soilSusceptibility || 0))
                  .map((s: any) => (
                    <tr key={s.locationId} className="table-row">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <Link
                          to={`/locations/${s.locationId}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {s.location?.name || s.locationId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                        {s.location?.state}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium text-xs">
                        {s.soilType}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                        {s.clay_pct}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-700 font-semibold">
                        {s.sand_pct}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {s.silt_pct}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {s.bulkDensity ? `${s.bulkDensity} g/cm³` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-amber-500"
                              style={{
                                width: `${Math.min(100, (s.soilSusceptibility || 0) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {((s.soilSusceptibility || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DataQualityBadge quality={s.qualityFlag || 'GOOD'} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
export default SoilAnalysis;
