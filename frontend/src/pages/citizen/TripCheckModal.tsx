import { useState } from 'react';
import { X, Navigation, Car, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { computeCitizenTripRisk } from '../../lib/api';
import { TripRiskAssessment } from '../../types';

interface TripCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_ROUTES = [
  {
    title: 'Guwahati ➔ Shillong',
    origin: { name: 'Guwahati', lat: 26.1445, lon: 91.7362 },
    destination: { name: 'Shillong', lat: 25.5788, lon: 91.8933 },
  },
  {
    title: 'Siliguri ➔ Gangtok',
    origin: { name: 'Siliguri', lat: 26.7271, lon: 88.3953 },
    destination: { name: 'Gangtok', lat: 27.3389, lon: 88.6138 },
  },
  {
    title: 'Aizawl ➔ Champhai',
    origin: { name: 'Aizawl', lat: 23.7307, lon: 92.7173 },
    destination: { name: 'Champhai', lat: 23.4566, lon: 93.3282 },
  },
  {
    title: 'Dimapur ➔ Kohima',
    origin: { name: 'Dimapur', lat: 25.9095, lon: 93.7266 },
    destination: { name: 'Kohima', lat: 25.6751, lon: 94.1086 },
  },
];

export function TripCheckModal({ isOpen, onClose }: TripCheckModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [assessment, setAssessment] = useState<TripRiskAssessment>(() => {
    const route = POPULAR_ROUTES[0];
    return computeCitizenTripRisk(route.origin, route.destination);
  });

  if (!isOpen) return null;

  const handleSelectRoute = (index: number) => {
    setSelectedPreset(index);
    const route = POPULAR_ROUTES[index];
    const res = computeCitizenTripRisk(route.origin, route.destination);
    setAssessment(res);
  };

  const isHigh = assessment.overallCaution === 'HIGH_ALERT';
  const isCaution = assessment.overallCaution === 'CAUTION';

  const bannerBg = isHigh
    ? 'bg-rose-50 border-rose-300 text-rose-950'
    : isCaution
    ? 'bg-amber-50 border-amber-300 text-amber-950'
    : 'bg-emerald-50 border-emerald-300 text-emerald-950';

  const bannerIcon = isHigh ? '🚨' : isCaution ? '⚠️' : '✅';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#C8D8BC] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59]">
              <Car size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#0F2018]">Check My Trip / Corridor Risk</h2>
              <p className="text-[11px] text-[#1A3028]">
                Real-time route landslide susceptibility & pass safety check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#1A3028] hover:bg-[#C8D8BC]/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Route Selector */}
          <div>
            <label className="block text-xs font-bold text-[#0F2018] mb-2">
              Select Monitored Highway Corridor:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_ROUTES.map((r, idx) => (
                <button
                  key={r.title}
                  onClick={() => handleSelectRoute(idx)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedPreset === idx
                      ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#0F2018] font-bold shadow-xs'
                      : 'border-[#C8D8BC] text-[#1A3028] hover:border-[#7FB99A]'
                  }`}
                >
                  <span className="text-xs">{r.title}</span>
                  <Navigation size={12} className="text-[#4A7C59]" />
                </button>
              ))}
            </div>
          </div>

          {/* Overall Caution Banner */}
          <div className={`p-4 rounded-2xl border ${bannerBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-base flex items-center gap-1.5 font-black">
                <span>{bannerIcon}</span>
                <span>{assessment.headline}</span>
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 border border-current/20">
                {assessment.overallCaution.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {assessment.summary}
            </p>
            <div className="text-[11px] font-mono opacity-80 pt-1 border-t border-current/10">
              Total Corridor Distance: ~{assessment.totalDistanceKm} km
            </div>
          </div>

          {/* Risky Highway Pass Segments */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#0F2018]">
              Monitored Highway Passes & Cut Slopes:
            </div>
            <div className="space-y-2">
              {assessment.riskySegments.map((seg) => (
                <div
                  key={seg.catchmentId}
                  className="p-3 bg-[#F5F0E8] rounded-xl border border-[#C8D8BC] flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#0F2018] flex items-center gap-1.5">
                      <span>{seg.catchmentName}</span>
                      <span className="text-[11px] font-normal text-[#1A3028]">
                        ({seg.district})
                      </span>
                    </div>
                    <div className="text-[11px] text-[#1A3028] leading-tight">{seg.reason}</div>
                    <div className="text-[10px] text-[#4A7C59] font-mono mt-1">
                      Rainfall: {seg.rainfall24h_mm} mm · Slope: {seg.slope_deg}°
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      seg.riskLevel === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : seg.riskLevel === 'HIGH'
                        ? 'bg-orange-100 text-orange-800 border border-orange-300'
                        : seg.riskLevel === 'MODERATE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {seg.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Travel Recommendations */}
          <div className="card p-3.5 space-y-2 bg-white">
            <div className="text-xs font-bold text-[#0F2018] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#4A7C59]" />
              <span>Safety Recommendations for this Route</span>
            </div>
            <ul className="space-y-1 text-[11px] text-[#1A3028]">
              {assessment.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="text-[#4A7C59] shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
export default TripCheckModal;
