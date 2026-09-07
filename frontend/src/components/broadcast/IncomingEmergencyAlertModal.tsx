import React from 'react';
import { LiveEmergencyAlert, playEmergencySirenSound } from '../../lib/broadcastService';
import { Radio, AlertTriangle, ShieldAlert, Navigation, MapPin, Volume2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  alert: LiveEmergencyAlert | null;
  onDismiss: () => void;
}

export function IncomingEmergencyAlertModal({ alert, onDismiss }: Props) {
  const navigate = useNavigate();

  if (!alert) return null;

  const handleViewEvacuation = () => {
    onDismiss();
    navigate('/map');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white border-2 border-red-600 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.5)] flex flex-col animate-pulse">
        {/* Government Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 text-center relative">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-white text-red-600 mx-auto flex items-center justify-center shadow-lg mb-2">
            <Radio size={28} className="animate-ping" />
          </div>

          <div className="text-[11px] font-black uppercase tracking-widest text-red-100">
            National Disaster Management Authority (NDMA)
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
            EMERGENCY CELL BROADCAST
          </h2>
          <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-white text-red-700 font-black text-xs uppercase tracking-wide">
            🚨 {alert.radiusKm} KM GEOFENCE HAZARD ACTIVE
          </div>
        </div>

        {/* Alert Body */}
        <div className="p-6 space-y-4 bg-white text-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
            <span className="flex items-center gap-1 font-semibold text-red-600">
              <ShieldAlert size={14} /> IMMEDIATE EVACUATION ORDER
            </span>
            <span className="font-mono text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()} IST</span>
          </div>

          {/* Location Badge */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-3">
            <MapPin size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-red-700 font-bold uppercase tracking-wider">Affected Catchment Zone</div>
              <div className="text-base font-bold text-slate-900">{alert.locationName}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                {alert.district}, {alert.state} · <span className="font-bold text-red-600">Within {alert.radiusKm} KM Circle</span>
              </div>
            </div>
          </div>

          {/* Alert Message Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner">
            {alert.message}
          </div>

          {/* Recommended Protective Actions */}
          <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
              Immediate Civil Protection Instructions:
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Evacuate steep hill slopes & unstable gorge edges immediately.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Proceed to designated high-ground civil relief shelters.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Do NOT traverse waterlogged valley cut roads or bridges.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                playEmergencySirenSound();
              }}
              className="px-4 py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Volume2 size={16} />
              <span>Replay Siren</span>
            </button>

            <button
              onClick={handleViewEvacuation}
              className="px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-[0.98]"
            >
              <Navigation size={16} />
              <span>Safe Evacuation Map</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              onClick={onDismiss}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2"
            >
              Acknowledge & Dismiss Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default IncomingEmergencyAlertModal;
