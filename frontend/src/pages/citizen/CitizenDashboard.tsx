import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api, { computeCitizenLocationRisk, getStoredCitizenReports } from '../../lib/api';
import { CitizenMap } from './CitizenMap';
import { ReportHazardModal } from './ReportHazardModal';
import { TripCheckModal } from './TripCheckModal';
import { SaferLocationModal } from './SaferLocationModal';

const NER_CATCHMENTS = [
  { id: 'aizawl', name: 'Aizawl', district: 'Aizawl', state: 'Mizoram', lat: 23.7307, lon: 92.7173 },
  { id: 'gangtok', name: 'Gangtok', district: 'East Sikkim', state: 'Sikkim', lat: 27.3389, lon: 88.6138 },
  { id: 'shillong', name: 'Shillong', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lon: 91.8933 },
  { id: 'kohima', name: 'Kohima', district: 'Kohima', state: 'Nagaland', lat: 25.6751, lon: 94.1086 },
  { id: 'haflong', name: 'Haflong', district: 'Dima Hasao', state: 'Assam', lat: 25.1764, lon: 93.0185 },
  { id: 'champhai', name: 'Champhai', district: 'Champhai', state: 'Mizoram', lat: 23.4566, lon: 93.3282 },
  { id: 'cherrapunji', name: 'Cherrapunji (Sohra)', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.27, lon: 91.73 },
  { id: 'mawsynram', name: 'Mawsynram', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.3, lon: 91.58 },
  { id: 'namchi', name: 'Namchi', district: 'South Sikkim', state: 'Sikkim', lat: 27.1667, lon: 88.35 },
  { id: 'jowai', name: 'Jowai', district: 'West Jaintia Hills', state: 'Meghalaya', lat: 25.45, lon: 92.2 },
  { id: 'senapati', name: 'Senapati', district: 'Senapati', state: 'Manipur', lat: 25.26, lon: 94.02 },
  { id: 'ukhrul', name: 'Ukhrul', district: 'Ukhrul', state: 'Manipur', lat: 25.11, lon: 94.36 },
  { id: 'guwahati', name: 'Guwahati (Kamrup)', district: 'Kamrup Metro', state: 'Assam', lat: 26.1445, lon: 91.7362 },
];

export function CitizenDashboard() {
  const navigate = useNavigate();
  const { userLocation, setUserLocation, switchPortal } = useAuthStore();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Active modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showSaferModal, setShowSaferModal] = useState(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Current Coordinates & Data
  const currentCoords = userLocation || { lat: 23.7307, lon: 92.7173, name: 'Aizawl, Mizoram' };
  const [riskData, setRiskData] = useState<any>(() => computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon));
  const [citizenReports, setCitizenReports] = useState<any[]>(() => getStoredCitizenReports());

  // Greeting calculation
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Fetch or calculate risk when location changes
  useEffect(() => {
    const updated = computeCitizenLocationRisk(currentCoords.lat, currentCoords.lon);
    setRiskData(updated);
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

        const data = computeCitizenLocationRisk(lat, lon);
        const name = `${data.nearestCatchment.name} Area (${data.nearestCatchment.distanceKm} km)`;

        setUserLocation({ lat, lon, name });
        setShowLocationPicker(false);
        showToast('📍 Updated to your live GPS coordinates');
      },
      () => {
        setIsLocatingGPS(false);
        showToast('GPS access denied. You can select your location manually below.');
        setShowLocationPicker(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectCatchment = (c: (typeof NER_CATCHMENTS)[0]) => {
    setUserLocation({ lat: c.lat, lon: c.lon, name: `${c.name}, ${c.state}` });
    setShowLocationPicker(false);
    showToast(`📍 Set location to ${c.name}, ${c.state}`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleShareLocation = () => {
    const shareText = `⚠️ LANDSLIDE WATCH EMERGENCY ALERT: I am currently near ${currentCoords.name} (GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lon.toFixed(4)}). Assessed Landslide Risk: ${riskData.currentRisk.level} (${riskData.currentRisk.score}/100). Please check on my safety.`;
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

  const risk = riskData.currentRisk;
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

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2018] flex flex-col">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#0F2018] text-white text-xs font-bold shadow-lg animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Top Mobile Header */}
      <header className="bg-white border-b border-[#C8D8BC] px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight text-[#0F2018] flex items-center gap-1.5">
                <span>Landslide Watch</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <div className="text-[10px] text-[#1A3028] font-medium">Citizen Safety App · NER</div>
            </div>
          </div>

          {/* Switch to Authority View */}
          <button
            onClick={() => {
              switchPortal('authority');
              navigate('/');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            title="Switch to Authority Command Center"
          >
            <Radio size={12} className="text-[#C8D8BC]" />
            <span>Authority Cockpit</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto w-full p-4 space-y-4 flex-1">
        {/* Greeting & Location Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs text-[#1A3028] font-medium">{greeting}</div>
            <div className="text-sm font-bold text-[#0F2018]">Are you safe right now?</div>
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

        {/* PRIMARY "AM I SAFE RIGHT NOW?" RISK CARD */}
        <div className={`p-5 rounded-3xl border-2 ${riskCardBorder} shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${riskBadgeColor}`}>
              ● {risk.badge}
            </span>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-[#0F2018]">
                {risk.score.toFixed(1)}
              </span>
              <span className="text-xs text-[#1A3028] font-mono"> / 100</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-black text-[#0F2018] tracking-tight">
              {risk.headline}
            </h1>
            <p className="text-xs text-[#1A3028] font-medium mt-1 leading-relaxed">
              {risk.explanation}
            </p>
          </div>

          {/* Real-time Data Freshness Badge */}
          <div className="pt-3 border-t border-[#C8D8BC]/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#1A3028]">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock size={12} className="text-[#4A7C59]" />
              <span>{riskData.freshnessMetadata.rainfall}</span>
            </div>
            <span className="font-mono font-bold text-[#0F2018]">
              Nearest Catchment: {riskData.nearestCatchment.name} ({riskData.nearestCatchment.distanceKm} km)
            </span>
          </div>
        </div>

        {/* 3 QUICK ACTION SHORTCUTS */}
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
            <div className="text-[10px] text-[#1A3028]">Submit photo & GPS</div>
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

        {/* INTERACTIVE CITIZEN MAP */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#0F2018]">
            <span>Surrounding Hazard Map</span>
            <span className="text-[11px] font-normal text-[#1A3028]">3 km radius</span>
          </div>
          <CitizenMap
            userCoordinates={{ lat: currentCoords.lat, lon: currentCoords.lon }}
            locationName={currentCoords.name || 'Your Location'}
            riskLevel={risk.level}
            riskScore={risk.score}
            nearbyHazards={riskData.nearbyHazards}
            citizenReports={citizenReports}
            height="260px"
          />
        </div>

        {/* "WHY IS THE RISK AT THIS LEVEL?" PLAIN LANGUAGE CARDS */}
        <div className="card p-4 space-y-3 bg-white border border-[#C8D8BC]">
          <div className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
            Why is the risk evaluated as {risk.level}?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {riskData.breakdownCards.map((b: any, i: number) => (
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

        {/* "WHAT SHOULD I DO?" SAFETY ACTIONS */}
        <div className="card p-4 space-y-3 bg-white border border-[#C8D8BC]">
          <div className="text-xs font-bold text-[#0F2018] uppercase tracking-wider">
            What should I do right now?
          </div>
          <ul className="space-y-2 text-xs text-[#0F2018]">
            {riskData.actionTips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle size={15} className="text-[#4A7C59] shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed font-medium">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* EMERGENCY ACTION BUTTONS */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
              <span>🆘</span> Emergency Distress Action
            </span>
            <span className="text-[10px] text-rose-700 font-bold">Toll-Free 24x7</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
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
          </div>
        </div>

        {/* COMMUNITY GROUND REPORTS FEED */}
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
                    {r.observationType.replace(/_/g, ' ')}
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
                    {r.coordinates?.lat?.toFixed(4)}°N, {r.coordinates?.lon?.toFixed(4)}°E
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

      {/* LOCATION PICKER MODAL */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#C8D8BC] shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
              <div className="text-xs font-bold text-[#0F2018]">Choose Your Location</div>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-xs text-[#1A3028] font-bold hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="p-3 border-b border-[#C8D8BC]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search NER district or town..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-1 text-xs">
              <button
                onClick={handleUseGPS}
                className="w-full p-2.5 rounded-xl bg-[#4A7C59]/10 text-[#4A7C59] font-bold text-left flex items-center gap-2 hover:bg-[#4A7C59]/20 transition-colors"
              >
                <Compass size={15} />
                <span>Use Live GPS Location</span>
              </button>

              {NER_CATCHMENTS.filter((c) =>
                c.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                c.state.toLowerCase().includes(locationSearch.toLowerCase())
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCatchment(c)}
                  className="w-full p-2.5 rounded-xl hover:bg-[#F5F0E8] text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-[#0F2018]">{c.name}</div>
                    <div className="text-[10px] text-[#1A3028]">{c.district}, {c.state}</div>
                  </div>
                  <MapPin size={13} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
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
        locations={riskData.saferLocations}
        currentLocationName={currentCoords.name || 'Your Location'}
      />
    </div>
  );
}
export default CitizenDashboard;
