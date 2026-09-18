import React from 'react';
import { AlertOctagon, PhoneCall, Share2, Camera, Compass, X, AlertTriangle } from 'lucide-react';

interface EmergencyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  riskScore: number;
  onOpenReport: () => void;
  onOpenSaferGround: () => void;
  onShareLocation: () => void;
}

export function EmergencyModeModal({
  isOpen,
  onClose,
  locationName,
  riskScore,
  onOpenReport,
  onOpenSaferGround,
  onShareLocation,
}: EmergencyModeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl border-2 border-rose-500 shadow-2xl w-full max-w-md overflow-hidden relative text-[#0F2018] flex flex-col">
        {/* Header */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-white animate-ping" />
            <span className="text-xs font-black tracking-widest uppercase">Emergency Action Mode</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-rose-700/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Core Distress Status */}
        <div className="p-6 text-center space-y-3 bg-rose-50/70 border-b border-rose-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-600 text-white mx-auto shadow-lg shadow-rose-900/30">
            <AlertOctagon size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-rose-900 tracking-tight">
              🔴 CRITICAL RISK
            </h2>
            <p className="text-xs text-rose-800 font-bold mt-1">
              Your current area ({locationName}) has very high assessed landslide risk ({riskScore}/100).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-rose-200 text-left text-[11px] text-rose-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-rose-600 shrink-0" />
              <span>Safety Directive:</span>
            </div>
            <p className="leading-tight">
              Move away from steep, saturated hillside slopes and unreinforced stone walls immediately. Stay alert for rockfall or sudden muddy water flow.
            </p>
          </div>
        </div>

        {/* 4 PRIMARY EMERGENCY BUTTONS */}
        <div className="p-6 space-y-3 bg-white">
          <a
            href="tel:112"
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm tracking-wide shadow-md flex items-center justify-center gap-2.5 transition-all"
          >
            <PhoneCall size={18} />
            <span>📞 EMERGENCY HELP (CALL 112)</span>
          </a>

          <button
            onClick={onShareLocation}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-rose-300 text-rose-900 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <Share2 size={16} />
            <span>📍 SHARE MY LOCATION</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenReport();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Camera size={16} className="text-amber-700" />
            <span>🚨 REPORT HAZARD (CAMERA EVIDENCE)</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSaferGround();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Compass size={16} className="text-emerald-700" />
            <span>🗺️ FIND POTENTIAL SAFER LOCATION</span>
          </button>
        </div>

        {/* STRICT DISCLAIMER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-600 font-medium">
          Follow official local emergency instructions. All evacuations must follow local District Disaster Management Authority (DDMA) protocols.
        </div>
      </div>
    </div>
  );
}
