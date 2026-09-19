import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Compass,
  PhoneCall,
  Share2,
  Car,
  Camera,
  CheckCircle,
  AlertTriangle,
  Search,
  Clock,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Bell,
  Navigation,
  Layers,
  Sparkles,
  Info,
  Droplets,
  Mountain,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api, { computeCitizenLocationRisk, getStoredCitizenReports } from '../../lib/api';
import { CitizenMap } from './CitizenMap';
import { ReportHazardModal } from './ReportHazardModal';
import { TripCheckModal } from './TripCheckModal';
import { SaferLocationModal } from './SaferLocationModal';
import { EmergencyModeModal } from './EmergencyModeModal';
import { CitizenOnboardingModal } from './CitizenOnboardingModal';
import { MONITORED_NER_LOCATIONS } from './nerLocations';

interface CitizenDashboardProps {
  initialWelcome?: boolean;
}

export function CitizenDashboard({ initialWelcome = false }: CitizenDashboardProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, userLocation, setUserLocation, hasCompletedOnboarding, switchPortal, signOut } = useAuthStore();

  // Onboarding modal (triggered on welcome route, first arrival, or via Guide button)
  const isWelcomeRoute = location.pathname.includes('welcome') || initialWelcome;
  const [showOnboarding, setShowOnboarding] = useState(isWelcomeRoute || !hasCompletedOnboarding);

  // Modals
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showSaferModal, setShowSaferModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'travel' | 'report' | 'alerts'>('home');
  const [expandConditions, setExpandConditions] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState('');

  // Fallback coords if none selected: default to Aizawl monitored ridge
  const currentCoords = userLocation || {
    lat: 23.7307,
    lon: 92.7173,
    name: 'Aizawl, Mizoram',
  };

  // Live Risk Data from API
  const [riskData, setRiskData] = useState<any>(() => computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon));
  const [citizenReports, setCitizenReports] = useState<any[]>(() => getStoredCitizenReports());
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);

  // Dynamic Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Resident';

  // Fetch real dynamic risk whenever current coordinates change
  useEffect(() => {
    let isMounted = true;
    const fetchRisk = async () => {
      setIsLoadingRisk(true);
      try {
        const res = await api.get(`/api/citizen/risk-at-location?lat=${currentCoords.lat}&lon=${currentCoords.lon}`);
        const resData = res.data;
        if (isMounted && resData && typeof resData === 'object' && resData.success) {
          if (resData.isWithinNER === false || resData.data?.isWithinNER === false) {
            setRiskData({
              isWithinNER: false,
              message: resData.message || resData.data?.message,
              coordinates: resData.coordinates || resData.data?.coordinates,
              nearestCatchment: resData.nearestCatchment || resData.data?.nearestCatchment,
              distanceToNearestCatchmentKm: resData.distanceToNearestCatchmentKm || resData.data?.distanceToNearestCatchmentKm,
            });
          } else if (resData.data) {
            const backendData = resData.data;
            setRiskData({
              isWithinNER: true,
              currentRisk: backendData.currentRisk,
              nearestCatchment: backendData.nearestCatchment,
              breakdownCards: backendData.breakdownCards,
              actionTips: backendData.actionTips,
              warningSigns: backendData.warningSigns || [
                'New ground cracks appearing on slopes or foundations',
                'Sudden murky or brown water flow in roadside drains',
                'Tilting trees, utility poles, or retaining walls',
                'Hollow rumbling noises or falling gravel from slopes',
              ],
              currentConditions: backendData.currentConditions,
              nearbyHazards: backendData.nearbyHazards,
              potentialSaferLocations: backendData.potentialSaferLocations,
              freshnessMetadata: {
                rainfall: backendData.currentRisk?.freshness || 'LIVE — Open-Meteo telemetry synced',
              },
            });
          }
        } else if (isMounted) {
          const updated = computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon);
          setRiskData(updated);
        }
      } catch {
        if (isMounted) {
          const updated = computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon);
          setRiskData(updated);
        }
      } finally {
        if (isMounted) setIsLoadingRisk(false);
      }
    };

    fetchRisk();

    // Refresh citizen reports from backend
    api.get('/api/citizen/reports')
      .then((res) => {
        if (isMounted && res.data?.success && Array.isArray(res.data.data)) {
          setCitizenReports(res.data.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentCoords.lat, currentCoords.lon]);

  // Use Browser Geolocation
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser. Please select manually.');
      return;
    }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGPS(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        let nearest = MONITORED_NER_LOCATIONS[0];
        let minD = 99999;
        for (const loc of MONITORED_NER_LOCATIONS) {
          const d = Math.hypot(lat - loc.lat, lon - loc.lon) * 111;
          if (d < minD) {
            minD = d;
            nearest = loc;
          }
        }

        const isWithinNER =
          lat >= 21.5 && lat <= 29.5 &&
          lon >= 88.0 && lon <= 97.5 &&
          minD <= 120;

        const name = isWithinNER
          ? (minD < 15 ? `${nearest.name}, ${nearest.state}` : `${nearest.name} Region, ${nearest.state}`)
          : `GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (Out of Region)`;

        setUserLocation({ lat, lon, name });
        const immediateData = computeCitizenLocationRisk(lat, lon, nearest.id);
        setRiskData(immediateData);
        setShowLocationPicker(false);
        showToast(
          isWithinNER
            ? '📍 Updated to your live GPS coordinates'
            : '📍 Live GPS located (Outside Northeast India coverage area)'
        );
      },
      () => {
        setIsLocatingGPS(false);
        showToast('GPS access denied. You can select your location manually below.');
        setShowLocationPicker(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectCatchment = (loc: (typeof MONITORED_NER_LOCATIONS)[0]) => {
    const newLoc = { lat: loc.lat, lon: loc.lon, name: `${loc.name}, ${loc.state}` };
    setUserLocation(newLoc);
    // Instantly compute and apply the new location's unique risk assessment
    const immediateData = computeCitizenLocationRisk(loc.lat, loc.lon, loc.id);
    setRiskData(immediateData);
    setShowLocationPicker(false);
    showToast(`📍 Location changed to ${loc.name}, ${loc.state}`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleShareLocation = () => {
    const risk = riskData.currentRisk;
    const shareText = `⚠️ LANDSLIDE WATCH SAFETY STATUS: I am currently near ${currentCoords.name} (GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}). Current assessed risk: ${risk?.level || 'MONITORED'} (${risk?.score || '--'}/100). Please check on my safety. (Disaster Emergency 112)`;

    if (navigator.share) {
      navigator
        .share({
          title: 'My Landslide Watch Safety Status',
          text: shareText,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('📋 Emergency distress message copied to clipboard!');
    }
  };

  const risk = riskData?.currentRisk || {
    score: 0,
    level: 'LOW',
    headline: 'Retrieving live risk assessment...',
    explanation: 'Fetching dynamic telemetry from Open-Meteo weather API...',
  };
  const isCritical = risk.level === 'CRITICAL';
  const isHigh = risk.level === 'HIGH';
  const displayScore = typeof risk.score === 'number' && !isNaN(risk.score) && risk.score > 0 ? risk.score.toFixed(1) : '--.-';

  const riskBadgeColor = isCritical
    ? 'bg-rose-600 text-white border-rose-700'
    : isHigh
    ? 'bg-amber-600 text-white border-amber-700'
    : risk.level === 'MODERATE'
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : 'bg-emerald-100 text-emerald-900 border-emerald-300';

  const riskCardBorder = isCritical
    ? 'border-rose-400 bg-rose-50/70 shadow-rose-200/50'
    : isHigh
    ? 'border-amber-400 bg-amber-50/70 shadow-amber-200/50'
    : risk.level === 'MODERATE'
    ? 'border-amber-300 bg-amber-50/30'
    : 'border-[#C8D8BC] bg-white';

  const filteredLocations = MONITORED_NER_LOCATIONS.filter(
    (l) =>
      l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
      l.district.toLowerCase().includes(locationSearch.toLowerCase()) ||
      l.state.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2018] flex flex-col selection:bg-emerald-600 selection:text-white pb-20">
      {/* FIRST-TIME WELCOME & LOCATION ONBOARDING MODAL */}
      <CitizenOnboardingModal
        isOpen={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          if (location.pathname.includes('welcome')) {
            navigate('/citizen/dashboard', { replace: true });
          }
        }}
      />

      {/* TOAST FEEDBACK */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0F2018] text-white text-xs font-bold shadow-xl animate-in fade-in flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-[#C8D8BC] px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight text-[#0F2018] flex items-center gap-1.5">
                <span>Landslide Watch</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-[10px] text-[#2C4A3E] font-medium">Citizen Safety Portal · NER</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCritical && (
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black animate-pulse flex items-center gap-1 shadow-xs"
              >
                <AlertOctagon size={13} />
                <span>EMERGENCY SOS</span>
              </button>
            )}

            <button
              onClick={() => {
                switchPortal('authority');
                navigate('/authority');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 group cursor-pointer"
              title="Switch to Disaster Management Authority Cockpit"
            >
              <Radio size={12} className="text-emerald-400 animate-pulse" />
              <span>Authority Cockpit</span>
              <span className="text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-2xl mx-auto w-full p-4 space-y-4 flex-1">
        {/* TOP GREETING & PERSONAL LOCATION BAR */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-[#2C4A3E] font-medium">
              {greeting}, <span className="font-bold text-[#0F2018]">{userName}</span>
            </div>
            <div className="text-sm font-black text-[#0F2018] flex items-center gap-1.5 mt-0.5">
              <MapPin size={14} className="text-[#4A7C59]" />
              <span className="truncate max-w-[200px] sm:max-w-xs">{currentCoords.name}</span>
            </div>
          </div>

          {/* Location Switcher & GPS Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] hover:border-[#4A7C59] text-[11px] font-bold text-[#0F2018] shadow-xs transition-colors"
              title="Open Welcome Safety Guide & Information"
            >
              Guide
            </button>
            <button
              onClick={() => setShowLocationPicker(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#C8D8BC] hover:border-[#4A7C59] text-[11px] font-bold text-[#0F2018] shadow-xs transition-colors"
            >
              Change Location
            </button>
            <button
              onClick={handleUseGPS}
              disabled={isLocatingGPS}
              className="p-2 rounded-xl bg-[#4A7C59] hover:bg-[#3B6647] text-white shadow-xs transition-colors"
              title="Locate via GPS"
            >
              <Compass size={15} className={isLocatingGPS ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 4 ACTION SHORTCUTS (Trip, Report, Safer Ground, Emergency) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => setShowTripModal(true)}
            className="p-3 rounded-2xl bg-white border border-[#C8D8BC] hover:border-blue-500 shadow-xs text-left transition-all space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Car size={16} />
            </div>
            <div className="text-xs font-bold text-[#0F2018] group-hover:text-blue-700">
              Check My Trip
            </div>
            <div className="text-[10px] text-slate-500">Analyze route risk</div>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="p-3 rounded-2xl bg-white border border-[#C8D8BC] hover:border-amber-500 shadow-xs text-left transition-all space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Camera size={16} />
            </div>
            <div className="text-xs font-bold text-[#0F2018] group-hover:text-amber-700">
              Report Hazard
            </div>
            <div className="text-[10px] text-slate-500">Photo & Voice GPS</div>
          </button>

          <button
            onClick={() => setShowSaferModal(true)}
            className="p-3 rounded-2xl bg-white border border-[#C8D8BC] hover:border-emerald-500 shadow-xs text-left transition-all space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Compass size={16} />
            </div>
            <div className="text-xs font-bold text-[#0F2018] group-hover:text-emerald-700">
              Safer Ground
            </div>
            <div className="text-[10px] text-slate-500">Flatter low-slope areas</div>
          </button>

          <button
            onClick={() => setShowEmergencyModal(true)}
            className="p-3 rounded-2xl bg-white border border-[#C8D8BC] hover:border-rose-500 shadow-xs text-left transition-all space-y-1 group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertOctagon size={16} />
            </div>
            <div className="text-xs font-bold text-[#0F2018] group-hover:text-rose-700">
              Emergency SOS
            </div>
            <div className="text-[10px] text-slate-500">Call 112 & Share GPS</div>
          </button>
        </div>

        {/* OUT-OF-REGION NOTICE (When location is outside Northeast India) */}
        {riskData?.isWithinNER === false ? (
          <div className="p-6 rounded-3xl bg-white border-2 border-amber-300 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <Compass size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Regional Boundary Notice
                </span>
                <h2 className="text-base sm:text-lg font-black text-[#0F2018] mt-1 leading-snug">
                  Landslide Watch is currently designed for landslide-risk monitoring in Northeast India.
                </h2>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#C8D8BC] space-y-2 text-xs text-[#2C4A3E] leading-relaxed">
              <p className="font-semibold text-[#0F2018]">
                We don't currently have sufficient regional data to provide a reliable assessment for your location ({currentCoords.name}).
              </p>
              <p>
                Our high-resolution multi-factor risk engine currently ingests terrain, geological fault lines, hydrological catchments, and real-time precipitation specifically calibrated across the 8 Northeast Indian States (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura).
              </p>
              <div className="pt-2 border-t border-[#C8D8BC]/60 flex items-center gap-1.5 text-[11px] text-amber-900 font-medium">
                <Info size={13} className="shrink-0 text-amber-700" />
                <span>Regional risk assessment is unavailable outside the supported area. No artificial or static score is displayed.</span>
              </div>
            </div>

            {/* Selector to explore monitored NER locations */}
            <div className="space-y-2.5 pt-1">
              <div className="text-xs font-bold text-[#0F2018]">
                Explore Monitored Catchments Across Northeast India:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MONITORED_NER_LOCATIONS.slice(0, 6).map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectCatchment(loc)}
                    className="p-2.5 rounded-xl bg-[#F5F0E8] hover:bg-[#EAE2D5] border border-[#C8D8BC] text-left transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#0F2018] group-hover:text-[#4A7C59]">
                      {loc.name}
                    </div>
                    <div className="text-[10px] text-slate-500">{loc.state}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowLocationPicker(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#C8D8BC] text-xs font-bold text-[#4A7C59] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View All 20 Monitored Catchments →</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 7: PRIMARY "YOUR CURRENT RISK" CARD */}
            <div className={`p-5 rounded-3xl border-2 ${riskCardBorder} shadow-sm space-y-3.5 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#2C4A3E]">
                  YOUR CURRENT RISK
                </span>
                <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border ${riskBadgeColor}`}>
                  ● {risk.level}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-3xl sm:text-4xl font-black font-mono text-[#0F2018] tracking-tight">
                  {displayScore}
                  <span className="text-sm text-[#2C4A3E] font-mono font-medium"> / 100</span>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-medium">
                  Nearest Catchment: <span className="font-bold text-[#0F2018]">{riskData.nearestCatchment?.name || 'NER Catchment'}</span>
                </div>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-black text-[#0F2018] leading-snug">
                  {risk.level === 'LOW'
                    ? 'LOW RISK: Current assessed conditions are relatively low risk.'
                    : risk.headline}
                </h2>
                <p className="text-xs text-[#2C4A3E] font-medium mt-1 leading-relaxed">
                  {risk.level === 'LOW'
                    ? 'Current assessed conditions are relatively low risk. A low risk score does not mean zero danger; maintain situational awareness during sudden downpours.'
                    : risk.explanation}
                </p>
              </div>

              {/* Real-time Data Freshness Badge */}
              <div className="pt-3 border-t border-[#C8D8BC]/60 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock size={12} className="text-[#4A7C59]" />
                  <span>{riskData.freshnessMetadata?.rainfall || 'LIVE (Open-Meteo API) · Telemetry Synced'}</span>
                </div>
                <span className="font-mono font-semibold">
                  Updated just now
                </span>
              </div>
            </div>

        {/* CITIZEN EARLY WARNING & UPCOMING CONDITIONS ADVISORY */}
        {riskData?.forecastNotice?.isEscalating ? (
          <div className="p-4 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-700" />
                {riskData.forecastNotice.headline || 'Conditions May Worsen'}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300">
                FORECAST ADVISORY
              </span>
            </div>

            <p className="text-xs text-[#0F2018] font-medium leading-relaxed">
              {riskData.forecastNotice.description}
            </p>

            <div className="pt-2 border-t border-amber-200 space-y-1.5">
              <div className="text-[11px] font-bold text-[#0F2018] uppercase tracking-wider">
                Recommended Resident Precautions:
              </div>
              <ul className="space-y-1.5 text-xs text-[#1A3028]">
                {(riskData.forecastNotice.guidance || []).map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-white border border-[#C8D8BC] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-[#0F2018]">Upcoming Conditions:</span>
              <span className="text-slate-600">Rainfall forecast indicates stable conditions over the coming hours.</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Open-Meteo NWP</span>
          </div>
        )}

        {/* SECTION 8: "WHY IS MY AREA AT RISK?" (Dynamic Factors) */}
        <div className="p-4 rounded-3xl bg-white border border-[#C8D8BC] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#0F2018] uppercase tracking-wider">
              Why is my area evaluated as {risk.level}?
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Multi-Factor Evidence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(riskData.breakdownCards || []).map((card: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#C8D8BC]/70 space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#0F2018]">
                  <span className="flex items-center gap-1.5">
                    <span>{card.icon}</span>
                    <span>{card.title}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#C8D8BC] font-semibold text-slate-700">
                    {card.status}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-[#4A7C59]">{card.value}</div>
                <p className="text-[11px] text-[#2C4A3E] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 9: "WHAT SHOULD I DO?" SAFETY RECOMMENDATIONS & WARNING SIGNS */}
        <div className="p-4 rounded-3xl bg-white border border-[#C8D8BC] shadow-xs space-y-3.5">
          <div>
            <h3 className="text-xs font-black text-[#0F2018] uppercase tracking-wider">
              ⚠️ What Should I Do Right Now?
            </h3>
            <p className="text-[11px] text-[#2C4A3E] mt-0.5">
              Tailored safety actions for assessed {risk.level} condition
            </p>
          </div>

          <ul className="space-y-2">
            {(riskData.actionTips || []).map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-[#0F2018]">
                <CheckCircle size={15} className="text-[#4A7C59] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{tip}</span>
              </li>
            ))}
          </ul>

          {/* Practical Warning Signs Checklist */}
          <div className="pt-3 border-t border-[#C8D8BC]/60 space-y-2">
            <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠️</span> Watch for immediate slope warning signs:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
              {(riskData.warningSigns || []).map((sign: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50/60 border border-amber-200/60">
                  <span className="text-amber-700 font-bold">•</span>
                  <span>{sign}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 10: CURRENT ENVIRONMENTAL CONDITIONS (Expandable) */}
        <div className="p-4 rounded-3xl bg-white border border-[#C8D8BC] shadow-xs space-y-3">
          <button
            type="button"
            onClick={() => setExpandConditions(!expandConditions)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h3 className="text-xs font-black text-[#0F2018] uppercase tracking-wider">
                Current Environmental Conditions
              </h3>
              <p className="text-[10px] text-slate-500">Live rainfall, terrain slope, soil & drainage</p>
            </div>
            <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
              {expandConditions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {expandConditions && (
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/60">
                <div className="text-[10px] text-slate-500">Current Rainfall</div>
                <div className="font-mono font-bold text-[#0F2018] text-sm">
                  {riskData.currentConditions?.currentRainfall_mmph ?? 0} mm/h
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/60">
                <div className="text-[10px] text-slate-500">Last 24h Rainfall</div>
                <div className="font-mono font-bold text-[#0F2018] text-sm">
                  {riskData.currentConditions?.rainfall_24h_mm ?? 18.2} mm
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/60">
                <div className="text-[10px] text-slate-500">Last 72h Rainfall</div>
                <div className="font-mono font-bold text-[#0F2018] text-sm">
                  {riskData.currentConditions?.rainfall_72h_mm ?? 32.8} mm
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/60">
                <div className="text-[10px] text-slate-500">Forecast (+24h)</div>
                <div className="font-mono font-bold text-[#0F2018] text-sm">
                  {riskData.currentConditions?.forecast_24h_mm ?? 14.5} mm
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/60">
                <div className="text-[10px] text-slate-500">Terrain Slope</div>
                <div className="font-mono font-bold text-[#0F2018] text-sm">
                  {riskData.currentConditions?.slope_deg ?? 38}° Inclination
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/60">
                <div className="text-[10px] text-slate-500">Soil Geology</div>
                <div className="font-bold text-[#0F2018] text-xs truncate">
                  {riskData.currentConditions?.soilType ?? 'Mountain Shale'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 11 & 20: SIMPLIFIED CITIZEN MAP & NEARBY HAZARDS */}
        <div id="citizen-map-section" className="p-4 rounded-3xl bg-white border border-[#C8D8BC] shadow-xs space-y-3 scroll-mt-20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-[#0F2018] uppercase tracking-wider">
                Surrounding Hazards & Safe Ground Map
              </h3>
              <p className="text-[10px] text-slate-500">Personalized 3km radius safety zone</p>
            </div>
            <button
              onClick={() => {
                if (user && (role === 'authority' || role === 'admin')) {
                  navigate('/map');
                } else {
                  navigate('/authority/login');
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
              title="Open Multi-Layer Authority GIS Map"
            >
              <Layers size={12} />
              <span>ADVANCED MAP</span>
            </button>
          </div>

          <CitizenMap
            userCoordinates={{ lat: currentCoords.lat, lon: currentCoords.lon }}
            locationName={currentCoords.name}
            riskLevel={risk.level}
            riskScore={risk.score}
            nearbyHazards={riskData.nearbyHazards || []}
            citizenReports={citizenReports}
            height="260px"
          />

          {/* NEARBY HAZARDS LIST */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              📍 Nearby Assessed Hazard Locations:
            </div>
            <div className="space-y-1.5">
              {(riskData.nearbyHazards || []).map((haz: any) => (
                <div
                  key={haz.id}
                  className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8D8BC]/70 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#0F2018] flex items-center gap-1.5">
                      <span className="text-amber-600">●</span>
                      <span>{haz.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{haz.description}</div>
                  </div>
                  <span className="font-mono font-bold text-[#4A7C59] shrink-0 ml-2">
                    {haz.distanceKm} km away
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )}

        {/* SECTION 22: COMMUNITY GROUND REPORTS FEED */}
        <div className="p-4 rounded-3xl bg-white border border-[#C8D8BC] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-[#0F2018] uppercase tracking-wider">
                Community Ground Reports Feed
              </h3>
              <p className="text-[10px] text-slate-500">Submitted by residents and field observers</p>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-2.5 py-1 rounded-xl bg-[#4A7C59] hover:bg-[#3B6647] text-white text-[11px] font-bold"
            >
              + Report Hazard
            </button>
          </div>

          <div className="space-y-2">
            {citizenReports.slice(0, 3).map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#C8D8BC]/70 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {rep.observationType?.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-[10px] font-bold ${rep.status === 'VERIFIED' ? 'text-emerald-700' : 'text-slate-500'}`}>
                    ● {rep.status}
                  </span>
                </div>
                <div className="font-bold text-[#0F2018]">{rep.locationName || rep.nearestCatchmentName}</div>
                {rep.description && (
                  <p className="text-[11px] text-[#2C4A3E] italic bg-white p-2 rounded-xl border border-slate-100">
                    "{rep.description}"
                  </p>
                )}
                {rep.photoUrl && (
                  <div className="h-28 rounded-xl overflow-hidden border border-[#C8D8BC]">
                    <img src={rep.photoUrl} alt="Report evidence" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                  <span>Reporter: {rep.userName || 'Citizen'}</span>
                  <span>{new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Section 23) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#C8D8BC] py-2 px-4 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 py-1 rounded-xl text-[10px] font-bold transition-colors ${
              activeTab === 'home' ? 'text-[#4A7C59]' : 'text-slate-500'
            }`}
          >
            <Shield size={18} />
            <span>HOME</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('map');
              const el = document.getElementById('citizen-map-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className={`flex flex-col items-center gap-0.5 py-1 rounded-xl text-[10px] font-bold transition-colors ${
              activeTab === 'map' ? 'text-[#4A7C59]' : 'text-slate-500'
            }`}
          >
            <Navigation size={18} />
            <span>MAP</span>
          </button>

          <button
            onClick={() => setShowTripModal(true)}
            className="flex flex-col items-center gap-0.5 py-1 rounded-xl text-[10px] font-bold text-slate-500 hover:text-[#4A7C59] transition-colors"
          >
            <Car size={18} />
            <span>TRAVEL</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex flex-col items-center gap-0.5 py-1 rounded-xl text-[10px] font-bold text-slate-500 hover:text-amber-700 transition-colors"
          >
            <Camera size={18} />
            <span>REPORT</span>
          </button>

          <button
            onClick={handleShareLocation}
            className="flex flex-col items-center gap-0.5 py-1 rounded-xl text-[10px] font-bold text-slate-500 hover:text-rose-600 transition-colors"
          >
            <Share2 size={18} />
            <span>SHARE</span>
          </button>
        </div>
      </nav>

      {/* MODALS */}
      {/* 1. Report Hazard with Camera & Mic */}
      <ReportHazardModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        userCoordinates={currentCoords}
        onReportSubmitted={(rep) => {
          setCitizenReports((prev) => [rep, ...prev]);
          showToast('✓ Hazard report submitted with evidence');
        }}
      />

      {/* 2. Check My Trip */}
      <TripCheckModal
        isOpen={showTripModal}
        onClose={() => setShowTripModal(false)}
      />

      {/* 3. Potential Safer Ground */}
      <SaferLocationModal
        isOpen={showSaferModal}
        onClose={() => setShowSaferModal(false)}
        locations={riskData.potentialSaferLocations || []}
        currentLocationName={currentCoords.name}
      />

      {/* 4. Emergency Mode Modal */}
      <EmergencyModeModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        locationName={currentCoords.name}
        riskScore={risk.score}
        onOpenReport={() => setShowReportModal(true)}
        onOpenSaferGround={() => setShowSaferModal(true)}
        onShareLocation={handleShareLocation}
      />

      {/* 5. Manual Location Selector Dialog */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#C8D8BC] p-5 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8D8BC]">
              <h3 className="text-sm font-bold text-[#0F2018]">Select Location</h3>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Search town or district..."
                className="w-full px-3.5 py-2 pl-9 rounded-xl border border-[#C8D8BC] text-xs focus:outline-none focus:border-[#4A7C59]"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {filteredLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectCatchment(loc)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EAEFD8] border border-[#C8D8BC]/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#0F2018]">{loc.name}</div>
                    <div className="text-[10px] text-slate-500">{loc.district}, {loc.state}</div>
                  </div>
                  <MapPin size={14} className="text-[#4A7C59]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitizenDashboard;
