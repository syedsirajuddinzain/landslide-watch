import React from 'react';
import { X, MapPin, Shield, Compass, AlertCircle, ArrowUpRight } from 'lucide-react';
import { PotentialSaferLocation } from '../../types';

interface SaferLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: PotentialSaferLocation[];
  currentLocationName: string;
}

export function SaferLocationModal({
  isOpen,
  onClose,
  locations = [],
  currentLocationName,
}: SaferLocationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#C8D8BC] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59]">
              <Compass size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#0F2018]">Potential Safer Locations Nearby</h2>
              <p className="text-[11px] text-[#1A3028]">
                Algorithmically identified lower-slope ground relative to {currentLocationName}
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
          {/* Prominent Disclaimer Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
              <AlertCircle size={14} className="text-amber-700 shrink-0" />
              <span>Decision-Support Advisory (Not an Official Shelter)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              These locations represent lower-slope terrain (&lt;8°) and broad ridge plateaus evaluated from SRTM elevation models. They do NOT guarantee immunity from landslides or mudflows. Always prioritize official evacuation directives from the District Administration (DEOC / DDMA).
            </p>
          </div>

          {/* Locations List */}
          <div className="space-y-3">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-3.5 bg-[#F5F0E8] rounded-xl border border-[#C8D8BC] space-y-2 hover:border-[#4A7C59] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#0F2018] flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#4A7C59]" />
                      <span>{loc.name}</span>
                    </div>
                    <div className="text-[11px] text-[#1A3028]">
                      {loc.district}, {loc.state} · ~{loc.distanceKm} km away
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    Risk: {loc.currentRiskScore.toFixed(1)}/100 (LOW)
                  </span>
                </div>

                {/* Safe Ground Features */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#0F2018]">Terrain Advantages:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {loc.safeGroundFeatures.map((feat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white border border-[#C8D8BC] text-[10px] text-[#1A3028]"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Directions Note */}
                <div className="text-[11px] text-[#1A3028] pt-1.5 border-t border-[#C8D8BC]/60 font-medium flex items-center justify-between">
                  <span>{loc.directionsNote}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.coordinates.lat},${loc.coordinates.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#4A7C59] font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>Directions</span>
                    <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default SaferLocationModal;
