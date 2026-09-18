import { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  Share2,
  Volume2,
  VolumeX,
  Compass,
  Flashlight,
  ArrowRight,
  X,
  ShieldAlert,
} from 'lucide-react';

interface EmergencyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoordinates: { lat: number; lon: number; name?: string };
  riskLevel: string;
  riskScore: number;
  nearestCatchmentName: string;
  saferLocation?: { name: string; distanceKm: number };
}

export function EmergencyModeModal({
  isOpen,
  onClose,
  userCoordinates,
  riskLevel,
  riskScore,
  nearestCatchmentName,
  saferLocation,
}: EmergencyModeModalProps) {
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Handle Siren Sound via Web Audio API
  const toggleSiren = () => {
    if (sirenPlaying) {
      // Stop siren
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch {}
        oscillatorRef.current = null;
      }
      setSirenPlaying(false);
    } else {
      // Start siren
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        // Modulate frequency like emergency siren
        osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.6);
        osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 1.2);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscillatorRef.current = osc;
        setSirenPlaying(true);
      } catch {
        setSirenPlaying(false);
      }
    }
  };

  // Clean up audio when closing
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch {}
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleShareDistress = () => {
    const text = `🚨 URGENT LANDSLIDE SOS BEACON: I need emergency assistance! Location: ${userCoordinates.name || nearestCatchmentName} (GPS: ${userCoordinates.lat.toFixed(4)}°N, ${userCoordinates.lon.toFixed(4)}°E). Landslide Risk: ${riskLevel} (${riskScore}/100). Please alert local authorities / NDRF.`;
    if (navigator.share) {
      navigator.share({
        title: 'URGENT LANDSLIDE SOS BEACON',
        text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Distress beacon message copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in font-sans">
      <div className="bg-white rounded-3xl border-4 border-rose-600 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Urgent Header */}
        <div className="bg-rose-600 text-white p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white text-rose-600 flex items-center justify-center shadow-md">
              <AlertOctagon size={24} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-rose-100">
                CRITICAL EMERGENCY MODE
              </div>
              <div className="text-base font-black">Landslide Distress Active</div>
            </div>
          </div>

          <button
            onClick={() => {
              if (sirenPlaying) toggleSiren();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status & Coordinates */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-rose-600" />
                <span>Assessed Threat Level</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                {riskLevel} • {riskScore.toFixed(1)}/100
              </span>
            </div>

            <div className="text-xs text-rose-950 font-medium">
              You are currently near <strong>{userCoordinates.name || nearestCatchmentName}</strong>.
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-rose-800 pt-1 border-t border-rose-200/60">
              <span>GPS: {userCoordinates.lat.toFixed(4)}°N, {userCoordinates.lon.toFixed(4)}°E</span>
              <span>Region: Northeast India</span>
            </div>
          </div>

          {/* TWO PRIMARY SOS ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all text-center transform active:scale-98"
            >
              <PhoneCall size={18} />
              <span>Call 112 (National SOS)</span>
            </a>

            <button
              onClick={handleShareDistress}
              className="p-4 rounded-2xl bg-[#0F2018] hover:bg-black text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all text-center"
            >
              <Share2 size={18} />
              <span>Share GPS Distress Beacon</span>
            </button>
          </div>

          {/* EMERGENCY TOOLS: SIREN & FLASHLIGHT */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={toggleSiren}
              className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                sirenPlaying
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-bounce'
                  : 'bg-[#FAF7F2] border-[#C8D8BC] text-[#0F2018] hover:bg-amber-50'
              }`}
            >
              {sirenPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{sirenPlaying ? 'Stop Siren' : '🔊 Play SOS Siren'}</span>
            </button>

            <button
              onClick={() => setFlashlightOn(!flashlightOn)}
              className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                flashlightOn
                  ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                  : 'bg-[#FAF7F2] border-[#C8D8BC] text-[#0F2018] hover:bg-yellow-50'
              }`}
            >
              <Flashlight size={16} />
              <span>{flashlightOn ? 'Flashlight Active' : '🔦 Torch Guide'}</span>
            </button>
          </div>

          {/* NEAREST SAFER GROUND NAVIGATION */}
          {saferLocation && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>🧭 Nearest Recommended Safer Ground</span>
                <span className="font-mono text-emerald-700">{saferLocation.distanceKm} km away</span>
              </div>
              <div className="text-xs font-black text-emerald-950">{saferLocation.name}</div>
              <p className="text-[11px] text-emerald-800">
                Move perpendicular to slope cutting towards wide flat terrace ground. Avoid staying under uncemented hillside cuts.
              </p>
            </div>
          )}

          {/* 3 CRITICAL EVACUATION DIRECTIVES */}
          <div className="space-y-1.5 text-xs">
            <div className="font-black text-[#0F2018] uppercase tracking-wider text-[11px]">
              Immediate Survival Actions:
            </div>
            <ul className="space-y-1.5 text-[11px] text-[#1A3028]">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">1.</span>
                <span>Move away from hillside escarpment cuts, natural stream ravines, and retaining walls.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">2.</span>
                <span>Listen for unusual rumbling sounds, falling stones, or sudden burst of muddy stream water.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">3.</span>
                <span>If caught in sudden debris flow, protect your head with your arms and roll into a ball.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#FAF7F2] border-t border-[#C8D8BC] flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[10px]">Toll-Free National Emergency: 112</span>
          <button
            onClick={() => {
              if (sirenPlaying) toggleSiren();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#0F2018] font-bold text-xs transition-colors"
          >
            Close Emergency Mode
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyModeModal;
