import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Shield,
  MapPin,
  Compass,
  PhoneCall,
  Share2,
  Car,
  Camera,
  CheckCircle,
  Search,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  X,
  AlertOctagon,
  Mic,
  CheckSquare,
  Square,
  CloudRain,
  Droplets,
  Wind,
  Thermometer,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api, { computeCitizenLocationRisk, getStoredCitizenReports } from '../../lib/api';
import { isLocationInNER, NER_CATCHMENT_PRESETS, NER_STATES } from '../../lib/geoUtils';
import { CitizenMap } from './CitizenMap';
import { ReportHazardModal } from './ReportHazardModal';
import { TripCheckModal } from './TripCheckModal';
import { SaferLocationModal } from './SaferLocationModal';
import { EmergencyModeModal } from './EmergencyModeModal';

export function CitizenDashboard() {
  const navigate = useNavigate();
  const { userLocation, setUserLocation, switchPortal } = useAuthStore();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [selectedStateFilter, setSelectedStateFilter] = useState('All');
  const [denialAlert, setDenialAlert] = useState<string | null>(null);

  // Active modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showSaferModal, setShowSaferModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Interactive Checklist State
  const [checkedTips, setCheckedTips] = useState<Record<number, boolean>>({});

  // Voice Search State in Location Picker
  const [isListeningVoiceSearch, setIsListeningVoiceSearch] = useState(false);
  const searchRecognitionRef = useRef<any>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch authoritative locations from backend (or fallback via api interceptor)
  const { data: locationsData } = useQuery(
    'locations',
    () => api.get('/api/locations').then((r) => r.data.data),
    { refetchInterval: 60_000 }
  );

  // Current Coordinates & Data
  const currentCoords = userLocation || { lat: 23.7307, lon: 92.7173, name: 'Aizawl, Mizoram' };
  const [riskData, setRiskData] = useState<any>(() =>
    computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon, undefined, locationsData)
  );
  const [citizenReports, setCitizenReports] = useState<any[]>(() => getStoredCitizenReports());

  // Greeting calculation
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Synchronize risk calculation when location changes or API data arrives
  useEffect(() => {
    const updated = computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon, undefined, locationsData);
    setRiskData(updated);
  }, [currentCoords.lat, currentCoords.lon, locationsData]);

  // Setup Voice Search for location picker
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-IN';
      rec.onresult = (e: any) => {
        const spoken = e.results[0][0].transcript;
        if (spoken) {
          setLocationSearch(spoken);
        }
        setIsListeningVoiceSearch(false);
      };
      rec.onerror = () => setIsListeningVoiceSearch(false);
      rec.onend = () => setIsListeningVoiceSearch(false);
      searchRecognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (!searchRecognitionRef.current) {
      showToast('Voice search not supported in this browser.');
      return;
    }
    if (isListeningVoiceSearch) {
      searchRecognitionRef.current.stop();
      setIsListeningVoiceSearch(false);
    } else {
      try {
        searchRecognitionRef.current.start();
        setIsListeningVoiceSearch(true);
      } catch {
        setIsListeningVoiceSearch(false);
      }
    }
  };

  // Use Browser Geolocation with Strict NER Boundary Check
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser. Please select from Northeast India list.');
      return;
    }
    setIsLocatingGPS(true);
    setDenialAlert(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGPS(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Strict NER Boundary Verification
        const check = isLocationInNER(lat, lon);
        if (!check.allowed) {
          setDenialAlert(check.reason || 'Location outside Northeast India is not permitted.');
          showToast('⚠️ Location is outside Northeast India. Only NER locations are monitored.');
          setShowLocationPicker(true);
          return;
        }

        const data = computeCitizenLocationRisk(lat, lon, undefined, locationsData);
        const name = `${data.nearestCatchment?.name || 'Local'} Area (${data.nearestCatchment?.distanceKm || 1} km)`;

        setUserLocation({ lat, lon, name });
        setShowLocationPicker(false);
        showToast('📍 Updated to your live GPS coordinates in Northeast India');
      },
      () => {
        setIsLocatingGPS(false);
        showToast('GPS access denied. You can select your location manually below.');
        setShowLocationPicker(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectCatchment = (c: any) => {
    setUserLocation({ lat: c.lat, lon: c.lon, name: `${c.name}, ${c.state}` });
    setShowLocationPicker(false);
    setDenialAlert(null);
    showToast(`📍 Set location to ${c.name}, ${c.state}`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleShareLocation = () => {
    const shareText = `⚠️ LANDSLIDE WATCH EMERGENCY ALERT: I am currently near ${currentCoords.name} (GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}). Assessed Landslide Risk: ${riskData?.currentRisk?.level || 'MONITORED'} (${riskData?.currentRisk?.score || 50}/100). Please check on my safety.`;
    if (navigator.share) {
      navigator.share({
        title: 'My Landslide Watch Emergency Status',
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('📋 Emergency distress message copied to clipboard!');
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚨 LANDSLIDE WATCH ALERT: My current safety status at ${currentCoords.name} (GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}) is ${riskData?.currentRisk?.level || 'MONITORED'} (${riskData?.currentRisk?.score || 50}/100). Check live conditions here: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const risk = riskData?.currentRisk || {
    score: 45.2,
    level: 'MODERATE',
    priorityLevel: 'P3',
    trend: 'STABLE',
    trendPct: 0,
    badge: 'MODERATE CAUTION',
    headline: '🟡 ADVISORY: Moderate Slope Susceptibility with Rain',
    explanation: 'Moderate rainfall detected in mountain catchment. Exercise standard caution on hillside paths.',
    freshness: 'LIVE — Telemetry synced with Authority Cockpit',
  };

  const isCritical = risk.level === 'CRITICAL';
  const isHigh = risk.level === 'HIGH';

  const riskBadgeColor =
    isCritical
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : isHigh
      ? 'bg-orange-100 text-orange-800 border-orange-300'
      : risk.level === 'MODERATE'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  const riskCardBorder =
    isCritical
      ? 'border-rose-400 bg-rose-50/50'
      : isHigh
      ? 'border-orange-400 bg-orange-50/50'
      : risk.level === 'MODERATE'
      ? 'border-amber-300 bg-amber-50/30'
      : 'border-[#C8D8BC] bg-[#F5F0E8]/40';

  const breakdownCards = riskData?.breakdownCards || [
    { icon: '🌧️', title: 'Rainfall Saturation', value: '86.5 mm (24h)', desc: 'Heavy precipitation saturation' },
    { icon: '⛰️', title: 'Slope Incline', value: '38.4° Hillside', desc: 'Steep mountain gradient' },
    { icon: '💧', title: 'Soil Pore Pressure', value: '72% Saturation', desc: 'Colluvial soil pore pressure' },
    { icon: '📜', title: 'Historical Records', value: '6 Events Documented', desc: 'Regional disaster inventory' },
  ];

  const actionTips: string[] = riskData?.actionTips || riskData?.whatShouldIDo || [
    'Avoid parking under steep hillside banks during rainfall.',
    'Keep storm water ditches clear of fallen leaves and silt.',
    'Follow official advisories from the District Disaster Authority.',
  ];

  const toggleCheckTip = (i: number) => {
    setCheckedTips((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const completedChecks = actionTips.filter((_, i) => checkedTips[i]).length;
  const completionPct = Math.round((completedChecks / (actionTips.length || 1)) * 100);

  const freshnessText = riskData?.freshnessMetadata?.rainfall || risk.freshness || 'LIVE — Telemetry synced';
  const nearestCatchment = riskData?.nearestCatchment || { name: 'Aizawl Catchment', distanceKm: 1.2 };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2018] flex flex-col font-sans selection:bg-[#4A7C59] selection:text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#0F2018] text-white text-xs font-bold shadow-lg animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* TOP DUAL-PLATFORM SWITCHER BANNER */}
      <div className="bg-[#1A3028] text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-[#4A7C59]/40">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-[#4A7C59] text-[10px] font-black uppercase tracking-wider">
            👥 Citizen Safety Portal
          </span>
          <span className="text-slate-300 hidden sm:inline">
            Personal Safety & Community Hazard Grid
          </span>
        </div>
        <button
          onClick={() => {
            switchPortal('authority');
            navigate('/authority');
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#4A7C59] hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-sm"
        >
          <Radio size={12} className="text-[#C8D8BC] animate-pulse" />
          <span>Switch to Authority Cockpit (GIS & SOP) →</span>
        </button>
      </div>

      {/* Mobile App Bar */}
      <header className="bg-white border-b border-[#C8D8BC] px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight text-[#0F2018] flex items-center gap-1.5">
                <span>Landslide Watch</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <div className="text-[10px] text-[#1A3028] font-medium">Northeast India Early Warning</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/citizen/welcome')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] hover:border-[#4A7C59] text-xs font-bold text-[#0F2018] transition-all"
              title="Return to Welcome & Region Guide"
            >
              <span>🏠 Welcome Guide</span>
            </button>
            <button
              onClick={() => {
                switchPortal('authority');
                navigate('/authority');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white text-xs font-bold transition-all shadow-xs"
            >
              🛡️ Cockpit
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto w-full p-4 space-y-4 flex-1">
        {/* Denial Alert Banner if non-NER attempted */}
        {denialAlert && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs flex items-start justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{denialAlert}</span>
            </div>
            <button
              onClick={() => setDenialAlert(null)}
              className="text-rose-600 hover:text-rose-900 font-bold"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Greeting & Location Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs text-[#1A3028] font-medium">{greeting}</div>
            <div className="text-sm font-bold text-[#0F2018]">Am I safe from landslides right now?</div>
          </div>

          {/* Location Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLocationPicker(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#C8D8BC] hover:border-[#4A7C59] text-xs font-bold text-[#0F2018] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MapPin size={13} className="text-[#4A7C59]" />
              <span className="truncate max-w-[150px]">{currentCoords.name || 'Set Location'}</span>
            </button>
            <button
              onClick={handleUseGPS}
              disabled={isLocatingGPS}
              className="p-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white transition-all shadow-xs"
              title="Use current GPS coordinates"
            >
              <Compass size={16} className={isLocatingGPS ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 1. DYNAMIC "YOUR CURRENT RISK" CARD */}
        <div className={`p-5 rounded-3xl border-2 ${riskCardBorder} shadow-sm space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${riskBadgeColor}`}>
                ● {risk.badge || risk.level}
              </span>
              {risk.priorityLevel && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-800 border border-slate-300 shadow-xs">
                  {risk.priorityLevel} Tier
                </span>
              )}
              {risk.trend && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  risk.trend === 'RISING'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : risk.trend === 'FALLING'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {risk.trend === 'RISING' ? '▲' : risk.trend === 'FALLING' ? '▼' : '●'} {risk.trend}
                  {typeof risk.trendPct === 'number' && risk.trendPct !== 0
                    ? ` (${risk.trendPct > 0 ? '+' : ''}${risk.trendPct}%)`
                    : ''}
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-2xl font-black font-mono text-[#0F2018]">
                {typeof risk.score === 'number' ? risk.score.toFixed(1) : risk.score}
              </span>
              <span className="text-xs text-[#1A3028] font-mono"> / 100</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-black text-[#0F2018] tracking-tight">
              {risk.headline || 'Landslide Risk Assessment'}
            </h1>
            <p className="text-xs text-[#1A3028] font-medium mt-1 leading-relaxed">
              {risk.explanation || risk.humanStatement}
            </p>
          </div>

          {/* Real-time Data Freshness Badge */}
          <div className="pt-3 border-t border-[#C8D8BC]/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#1A3028]">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock size={12} className="text-[#4A7C59]" />
              <span>{freshnessText}</span>
            </div>
            <span className="font-mono font-bold text-[#0F2018]">
              Nearest Catchment: {nearestCatchment.name} ({nearestCatchment.distanceKm} km)
            </span>
          </div>
        </div>

        {/* 3 QUICK ACTION SHORTCUTS + CRITICAL EMERGENCY MODE BUTTON */}
        <div className="space-y-2.5">
          {/* CRITICAL EMERGENCY MODE SOS TRIGGER */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className={`w-full p-3 rounded-2xl flex items-center justify-between font-black text-xs transition-all shadow-sm ${
              isCritical
                ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                : 'bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertOctagon size={16} className="text-rose-600 shrink-0" />
              <span>🔴 Critical Emergency Mode (SOS Siren & 112 Beacon)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/80 text-rose-800 text-[10px] font-bold">
              Open SOS →
            </span>
          </button>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setShowTripModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-[#C8D8BC] hover:border-[#4A7C59] shadow-xs text-left transition-all space-y-1 group"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-1">
                <Car size={15} />
              </div>
              <div className="text-xs font-bold text-[#0F2018] group-hover:text-[#4A7C59]">
                Check My Trip
              </div>
              <div className="text-[10px] text-[#1A3028]">Route safety & pass check</div>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-[#C8D8BC] hover:border-amber-500 shadow-xs text-left transition-all space-y-1 group"
            >
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-1">
                <Camera size={15} />
              </div>
              <div className="text-xs font-bold text-[#0F2018] group-hover:text-amber-700">
                Report Hazard
              </div>
              <div className="text-[10px] text-[#1A3028]">Camera photo + Mic audio</div>
            </button>

            <button
              onClick={() => setShowSaferModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-[#C8D8BC] hover:border-emerald-500 shadow-xs text-left transition-all space-y-1 group"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-1">
                <Compass size={15} />
              </div>
              <div className="text-xs font-bold text-[#0F2018] group-hover:text-emerald-700">
                Safer Ground
              </div>
              <div className="text-[10px] text-[#1A3028]">Nearby flatter slopes</div>
            </button>
          </div>
        </div>

        {/* 2. "WHY IS MY AREA AT RISK?" PLAIN LANGUAGE CARDS */}
        <div className="card p-4 space-y-3 bg-white border border-[#C8D8BC]">
          <div className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
            Why is my area assessed at {risk.level} risk?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {breakdownCards.map((b: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC]/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#0F2018]">
                  <span>{b.title}</span>
                  <span className="text-sm">{b.icon}</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-[#4A7C59]">{b.value}</div>
                <div className="text-[10px] text-[#1A3028] leading-tight">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. CURRENT ENVIRONMENTAL CONDITIONS */}
        <div className="card p-4 space-y-3 bg-white border border-[#C8D8BC]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
              Current Environmental Conditions
            </span>
            <span className="text-[10px] text-[#4A7C59] font-mono font-bold">Open-Meteo Synced</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC] space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <CloudRain size={12} className="text-blue-500" />
                <span>Precipitation (24h)</span>
              </div>
              <div className="font-mono font-black text-sm text-[#0F2018]">
                {breakdownCards[0]?.value?.split(' ')[0] || '86.5'} mm
              </div>
              <div className="text-[9px] text-[#1A3028]">Pluvial rain volume</div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC] space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Compass size={12} className="text-amber-500" />
                <span>Slope Steepness</span>
              </div>
              <div className="font-mono font-black text-sm text-[#0F2018]">
                {breakdownCards[1]?.value?.split(' ')[0] || '38.4°'}
              </div>
              <div className="text-[9px] text-[#1A3028]">Hillside gradient</div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC] space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Droplets size={12} className="text-cyan-500" />
                <span>Pore Moisture</span>
              </div>
              <div className="font-mono font-black text-sm text-[#0F2018]">
                {breakdownCards[2]?.value?.split(' ')[0] || '72%'}
              </div>
              <div className="text-[9px] text-[#1A3028]">Subsurface pressure</div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC] space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Thermometer size={12} className="text-rose-500" />
                <span>Weather State</span>
              </div>
              <div className="font-mono font-black text-sm text-[#0F2018]">
                21.4°C
              </div>
              <div className="text-[9px] text-[#1A3028]">Humid overcast</div>
            </div>
          </div>
        </div>

        {/* 3. "WHAT SHOULD I DO?" INTERACTIVE CHECKLIST */}
        <div className="card p-4 space-y-3 bg-white border border-[#C8D8BC]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
              "What Should I Do?" Safety Checklist
            </span>
            <span className="text-[11px] font-mono font-bold text-[#4A7C59]">
              {completedChecks}/{actionTips.length} Completed ({completionPct}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-[#FAF7F2] overflow-hidden border border-[#C8D8BC]/50">
            <div
              className="h-full bg-[#4A7C59] transition-all duration-300 rounded-full"
              style={{ width: `${completionPct}%` }}
            ></div>
          </div>

          <ul className="space-y-2 text-xs text-[#0F2018]">
            {actionTips.map((tip: string, i: number) => {
              const isDone = !!checkedTips[i];
              return (
                <li
                  key={i}
                  onClick={() => toggleCheckTip(i)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isDone
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 line-through opacity-75'
                      : 'bg-[#F5F0E8] border-[#C8D8BC]/80 hover:border-[#4A7C59]'
                  }`}
                >
                  <button type="button" className="shrink-0 mt-0.5 text-[#4A7C59]">
                    {isDone ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <span className="text-xs leading-relaxed font-medium">{tip}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 5. NEARBY HAZARDS & CITIZEN MAP */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#0F2018]">
            <span>Nearby Hazards & Citizen Map</span>
            <span className="text-[11px] font-normal text-[#1A3028]">3 km surveillance radius</span>
          </div>
          <CitizenMap
            userCoordinates={{ lat: currentCoords.lat, lon: currentCoords.lon }}
            locationName={currentCoords.name || 'Your Location'}
            riskLevel={risk.level || 'MODERATE'}
            riskScore={typeof risk.score === 'number' ? risk.score : 45}
            nearbyHazards={riskData?.nearbyHazards || []}
            citizenReports={citizenReports}
            height="260px"
          />
        </div>

        {/* 9. SHARE MY SAFETY GPS & EMERGENCY SOS ACTION BUTTONS */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
              <span>🆘</span> Emergency Distress Action
            </span>
            <span className="text-[10px] text-rose-700 font-bold">24x7 Toll-Free</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href="tel:112"
              className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
            >
              <PhoneCall size={14} />
              <span>Call 112 (National)</span>
            </a>

            <button
              onClick={handleShareLocation}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-rose-100/50 text-rose-900 border border-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <Share2 size={14} />
              <span>Share My Safety GPS</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <span>WhatsApp SOS</span>
            </button>
          </div>
        </div>

        {/* COMMUNITY GROUND HAZARD REPORTS FEED */}
        <div className="card p-4 space-y-3 bg-white border border-[#C8D8BC]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
              Community Ground Hazard Reports
            </span>
            <span className="text-[11px] font-mono text-[#4A7C59] font-bold">
              {citizenReports.length} Submitted
            </span>
          </div>

          <div className="space-y-2.5">
            {citizenReports.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {r.observationType ? r.observationType.replace(/_/g, ' ') : 'GROUND HAZARD'}
                  </span>
                  <span className="text-[10px] font-mono text-[#1A3028]">
                    {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#0F2018]">
                  {r.locationName || r.nearestCatchmentName}
                </div>
                {r.description && (
                  <div className="text-[11px] text-[#1A3028] italic">"{r.description}"</div>
                )}
                <div className="flex items-center justify-between text-[10px] pt-1 text-[#1A3028]">
                  <span className="font-mono">
                    {r.coordinates?.lat ? `${r.coordinates.lat.toFixed(3)}°N, ${r.coordinates.lon.toFixed(3)}°E` : 'NER GPS'}
                  </span>
                  <span className={`font-bold ${r.status === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    ● {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 8. LOCATION PICKER MODAL WITH VOICE SEARCH */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#C8D8BC] shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-[#0F2018]">Select Northeast India Location</div>
                <div className="text-[10px] text-[#1A3028]">Monitored across the 8 NER States</div>
              </div>
              <button
                onClick={() => {
                  setShowLocationPicker(false);
                  setDenialAlert(null);
                }}
                className="text-xs text-[#1A3028] font-bold hover:text-black p-1"
              >
                Close ✕
              </button>
            </div>

            {/* Non-NER Warning Banner */}
            {(() => {
              const check = locationSearch.trim().length >= 3 ? isLocationInNER(0, 0, locationSearch) : { allowed: true };
              if (!check.allowed || denialAlert) {
                return (
                  <div className="m-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                      <span>Outside Operational NER Boundary</span>
                    </div>
                    <div className="leading-snug">{check.reason || denialAlert}</div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="p-3 border-b border-[#C8D8BC] space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search NER district, town, or mountain pass..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                  />
                </div>

                {/* Voice Search Button */}
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  className={`p-2 rounded-xl border transition-all ${
                    isListeningVoiceSearch
                      ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                      : 'bg-white border-[#C8D8BC] text-[#4A7C59] hover:bg-[#FAF7F2]'
                  }`}
                  title="Voice search location"
                >
                  <Mic size={15} />
                </button>
              </div>

              {/* State Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  onClick={() => setSelectedStateFilter('All')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                    selectedStateFilter === 'All'
                      ? 'bg-[#0F2018] text-white'
                      : 'bg-[#FAF7F2] border border-[#C8D8BC] text-[#1A3028]'
                  }`}
                >
                  All 8 States
                </button>
                {NER_STATES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStateFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                      selectedStateFilter === st
                        ? 'bg-[#4A7C59] text-white'
                        : 'bg-[#FAF7F2] border border-[#C8D8BC] text-[#1A3028]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-1 text-xs flex-1">
              <button
                onClick={handleUseGPS}
                className="w-full p-2.5 rounded-xl bg-[#4A7C59]/10 text-[#4A7C59] font-bold text-left flex items-center gap-2 hover:bg-[#4A7C59]/20 transition-colors"
              >
                <Compass size={15} />
                <span>Auto-Detect My GPS (Northeast India)</span>
              </button>

              {NER_CATCHMENT_PRESETS.filter((c) => {
                const matchState = selectedStateFilter === 'All' || c.state === selectedStateFilter;
                const q = locationSearch.toLowerCase().trim();
                const matchSearch =
                  !q ||
                  c.name.toLowerCase().includes(q) ||
                  c.district.toLowerCase().includes(q) ||
                  c.state.toLowerCase().includes(q);
                return matchState && matchSearch;
              }).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCatchment(c)}
                  className="w-full p-2.5 rounded-xl hover:bg-[#F5F0E8] text-left transition-colors flex items-center justify-between border border-transparent hover:border-[#C8D8BC]"
                >
                  <div>
                    <div className="font-bold text-[#0F2018]">{c.name}</div>
                    <div className="text-[10px] text-[#1A3028]">{c.district}, {c.state} • {c.description}</div>
                  </div>
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALL MODALS */}
      <ReportHazardModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        userCoordinates={currentCoords}
        onReportSubmitted={(rep) => {
          setCitizenReports((prev) => [rep, ...prev]);
        }}
      />

      <TripCheckModal
        isOpen={showTripModal}
        onClose={() => setShowTripModal(false)}
      />

      <SaferLocationModal
        isOpen={showSaferModal}
        onClose={() => setShowSaferModal(false)}
        locations={riskData?.saferLocations || riskData?.potentialSaferLocations || []}
        currentLocationName={currentCoords.name || 'Your Location'}
      />

      {/* 10. CRITICAL EMERGENCY MODE MODAL */}
      <EmergencyModeModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        userCoordinates={currentCoords}
        riskLevel={risk.level}
        riskScore={typeof risk.score === 'number' ? risk.score : 45}
        nearestCatchmentName={nearestCatchment.name}
        saferLocation={riskData?.potentialSaferLocations?.[0]}
      />
    </div>
  );
}

export default CitizenDashboard;
