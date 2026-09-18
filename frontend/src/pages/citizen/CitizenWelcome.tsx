import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Compass,
  AlertTriangle,
  Radio,
  Car,
  Camera,
  CheckCircle,
  Search,
  ArrowRight,
  PhoneCall,
  Sparkles,
  X,
  Mic,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  NER_STATES,
  NER_CATCHMENT_PRESETS,
  isLocationInNER,
  CatchmentPreset,
} from '../../lib/geoUtils';

export function CitizenWelcome() {
  const navigate = useNavigate();
  const { userLocation, setUserLocation, switchPortal } = useAuthStore();

  const [selectedState, setSelectedState] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [denialAlert, setDenialAlert] = useState<string | null>(null);

  const [selectedCatchment, setSelectedCatchment] = useState<CatchmentPreset>(() => {
    if (userLocation) {
      const match = NER_CATCHMENT_PRESETS.find(
        (c) =>
          c.name.toLowerCase().includes(userLocation.name.toLowerCase()) ||
          userLocation.name.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) return match;
    }
    return NER_CATCHMENT_PRESETS[0]; // Default: Aizawl Catchment
  });

  // Filter catchments
  const filteredCatchments = NER_CATCHMENT_PRESETS.filter((c) => {
    const matchState = selectedState === 'All' || c.state === selectedState;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q);
    return matchState && matchSearch;
  });

  // Handle Search Input with Immediate NER Boundary Interception
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length >= 3) {
      const check = isLocationInNER(0, 0, val);
      if (!check.allowed && check.reason) {
        setDenialAlert(check.reason);
      } else {
        setDenialAlert(null);
      }
    } else {
      setDenialAlert(null);
    }
  };

  // Browser Geolocation with Strict NER Validation
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setDenialAlert(
        'Geolocation is not supported by your browser. Please select your location manually from the Northeast India list.'
      );
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
          setDenialAlert(
            `⚠️ Location Outside Northeast India: Your GPS coordinates (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E) fall outside our operational perimeter. Landslide Watch operates strictly within the 8 Northeast Indian States (Assam, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Arunachal Pradesh, Tripura). Locations outside this territory are not permitted.`
          );
          return;
        }

        // Inside NER: match nearest catchment
        let nearest = NER_CATCHMENT_PRESETS[0];
        let minD = 9999;
        NER_CATCHMENT_PRESETS.forEach((c) => {
          const dLat = (lat - c.lat) * 111;
          const dLon = (lon - c.lon) * 105;
          const d = Math.sqrt(dLat * dLat + dLon * dLon);
          if (d < minD) {
            minD = d;
            nearest = c;
          }
        });

        setSelectedCatchment(nearest);
        setUserLocation({
          lat,
          lon,
          name: `${nearest.name} (${minD < 1 ? 'Under 1' : Math.round(minD)} km away)`,
        });
      },
      (err) => {
        setIsLocatingGPS(false);
        setDenialAlert(
          'Could not retrieve GPS location (permission denied or signal timeout). Please select your district from the list below.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectCatchment = (c: CatchmentPreset) => {
    setSelectedCatchment(c);
    setUserLocation({
      lat: c.lat,
      lon: c.lon,
      name: `${c.name}, ${c.state}`,
    });
    setDenialAlert(null);
  };

  const handleProceedToPortal = () => {
    if (selectedCatchment) {
      setUserLocation({
        lat: selectedCatchment.lat,
        lon: selectedCatchment.lon,
        name: `${selectedCatchment.name}, ${selectedCatchment.state}`,
      });
    }
    navigate('/citizen/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2018] flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-[#1A3028] text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-[#4A7C59]/40">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[11px] text-[#C8D8BC] hover:text-white font-bold"
            >
              <ArrowLeft size={12} />
              <span>Landing Screen</span>
            </button>
            <span className="text-slate-500">•</span>
            <span className="px-2 py-0.5 rounded-full bg-[#4A7C59] text-[10px] font-black uppercase tracking-wider">
              👥 Citizen Onboarding
            </span>
          </div>
          <button
            onClick={() => {
              switchPortal('authority');
              navigate('/authority/login');
            }}
            className="flex items-center gap-1 text-[11px] text-[#C8D8BC] hover:text-white font-bold"
          >
            <span>Authority Login →</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-[#C8D8BC] px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
              <Shield size={20} />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-[#0F2018] flex items-center gap-1.5">
                <span>Landslide Watch</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  Northeast India
                </span>
              </div>
              <div className="text-[11px] text-[#1A3028] font-medium">
                Public Safety & Early Warning Grid
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-all shadow-xs"
            >
              <PhoneCall size={13} className="text-rose-600" />
              <span>SOS 112</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Welcome: "STAY SAFE. KNOW YOUR RISK." */}
      <div className="bg-gradient-to-b from-white to-[#FAF7F2] border-b border-[#C8D8BC] py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-xs font-bold text-[#4A7C59]">
            <Sparkles size={14} />
            <span>Northeast India Citizen Safety Platform</span>
          </div>

          {/* EXACT HEADLINE FROM USER'S WORKFLOW DIAGRAM */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0F2018] tracking-tight uppercase">
            STAY SAFE. KNOW YOUR RISK.
          </h1>

          <p className="text-xs sm:text-sm text-[#1A3028] max-w-2xl mx-auto leading-relaxed">
            Real-time multi-factor landslide hazard forecasting across all 8 Northeast Indian States.
            Check your immediate safety, plan travel through mountain passes, and report slope hazards.
          </p>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 max-w-3xl mx-auto text-left">
            <div className="p-3 rounded-2xl bg-white border border-[#C8D8BC] shadow-xs space-y-1">
              <div className="text-lg">📡</div>
              <div className="text-xs font-bold text-[#0F2018]">Your Current Risk</div>
              <div className="text-[10px] text-[#1A3028]">Real-time rainfall & slope shear</div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#C8D8BC] shadow-xs space-y-1">
              <div className="text-lg">🚗</div>
              <div className="text-xs font-bold text-[#0F2018]">Check My Trip</div>
              <div className="text-[10px] text-[#1A3028]">Mountain corridor route safety</div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#C8D8BC] shadow-xs space-y-1">
              <div className="text-lg">🚨</div>
              <div className="text-xs font-bold text-[#0F2018]">Report Hazard</div>
              <div className="text-[10px] text-[#1A3028]">Photo & Voice memo to NDRF</div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#C8D8BC] shadow-xs space-y-1">
              <div className="text-lg">🧭</div>
              <div className="text-xs font-bold text-[#0F2018]">Safer Locations</div>
              <div className="text-[10px] text-[#1A3028]">Find flat terrain & shelters</div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: LOCATION PERMISSION PROMPT (GPS OR MANUAL SELECTOR) */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* NER Boundary Denial Alert */}
        {denialAlert && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 space-y-2 shadow-sm animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <span>Outside Operational NER Boundary</span>
              </div>
              <button
                onClick={() => setDenialAlert(null)}
                className="text-rose-600 hover:text-rose-900 font-bold"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {denialAlert}
            </p>
            <div className="text-[11px] text-rose-800 font-bold bg-white/70 p-2 rounded-xl border border-rose-200">
              💡 Please select one of the monitored catchments below across Assam, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Arunachal Pradesh, or Tripura.
            </div>
          </div>
        )}

        {/* Selected Location Card & Proceed to Portal CTA */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#4A7C59] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#4A7C59] flex items-center gap-1.5">
              <MapPin size={12} />
              <span>Location Permission Active</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-[#0F2018] flex items-center gap-2">
              <span>{selectedCatchment.name}</span>
            </div>
            <div className="text-xs text-[#1A3028]">
              {selectedCatchment.district}, {selectedCatchment.state} • {selectedCatchment.description}
            </div>
          </div>

          <button
            onClick={handleProceedToPortal}
            className="px-6 py-3.5 rounded-2xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all transform active:scale-98 shrink-0"
          >
            <span>Enter Citizen Safety Portal</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* LOCATION PERMISSION PROMPT SECTION */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-[#0F2018] flex items-center gap-1.5">
                <span>📍 Location Permission Prompt</span>
              </h2>
              <p className="text-xs text-[#1A3028]">
                Allow GPS access or select your Northeast India district manually below.
              </p>
            </div>

            {/* GPS Auto-Detect Button */}
            <button
              onClick={handleUseGPS}
              disabled={isLocatingGPS}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-black text-xs transition-all shadow-xs self-start sm:self-auto"
            >
              <Compass size={16} className={isLocatingGPS ? 'animate-spin' : ''} />
              <span>{isLocatingGPS ? 'Detecting GPS...' : '📍 Auto-Detect My GPS'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search town, district, or mountain pass in Northeast India..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#C8D8BC] bg-white text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59]"
            />
          </div>

          {/* 8 NER State Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedState('All')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                selectedState === 'All'
                  ? 'bg-[#0F2018] text-white shadow-xs'
                  : 'bg-white border border-[#C8D8BC] text-[#1A3028] hover:border-[#4A7C59]'
              }`}
            >
              All 8 States
            </button>
            {NER_STATES.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  selectedState === st
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'bg-white border border-[#C8D8BC] text-[#1A3028] hover:border-[#4A7C59]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Catchment Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCatchments.map((c) => {
            const isSelected = selectedCatchment.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCatchment(c)}
                className={`p-3.5 rounded-2xl text-left transition-all border shadow-xs space-y-1.5 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#F5F0E8] border-2 border-[#4A7C59] ring-2 ring-[#4A7C59]/20'
                    : 'bg-white border-[#C8D8BC] hover:border-[#4A7C59] hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="text-xs font-bold text-[#0F2018] flex items-center gap-1">
                      <span>{c.name}</span>
                      {isSelected && <CheckCircle size={13} className="text-[#4A7C59]" />}
                    </div>
                    <div className="text-[11px] text-[#1A3028] font-medium">
                      {c.district}, {c.state}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#C8D8BC] text-[#1A3028]">
                    {c.state}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 line-clamp-1 italic">
                  {c.description}
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400 font-mono border-t border-[#C8D8BC]/40">
                  <span>{c.lat.toFixed(2)}°N, {c.lon.toFixed(2)}°E</span>
                  <span className="text-[#4A7C59] font-bold">Select →</span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredCatchments.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#C8D8BC] space-y-2">
            <div className="text-2xl">🔍</div>
            <div className="text-xs font-bold text-[#0F2018]">No matching NER locations found</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Please check your spelling. Landslide Watch operates strictly across the 8 Northeast Indian States.
            </p>
          </div>
        )}

        {/* Emergency Assistance Footnote */}
        <div className="p-4 rounded-2xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#0F2018]">
            <span className="flex items-center gap-1.5">
              <span>🚨</span> 24x7 Emergency Contact Directory (Northeast India)
            </span>
            <span className="text-[10px] text-[#4A7C59] font-bold">Toll-Free Helpline</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <a
              href="tel:112"
              className="p-2.5 rounded-xl bg-white border border-[#C8D8BC] flex items-center justify-between font-bold text-[#0F2018] hover:border-rose-400"
            >
              <span>112 (National SOS)</span>
              <PhoneCall size={13} className="text-rose-600" />
            </a>
            <a
              href="tel:1070"
              className="p-2.5 rounded-xl bg-white border border-[#C8D8BC] flex items-center justify-between font-bold text-[#0F2018] hover:border-[#4A7C59]"
            >
              <span>1070 (SDMA Control Room)</span>
              <PhoneCall size={13} className="text-[#4A7C59]" />
            </a>
            <a
              href="tel:1077"
              className="p-2.5 rounded-xl bg-white border border-[#C8D8BC] flex items-center justify-between font-bold text-[#0F2018] hover:border-[#4A7C59]"
            >
              <span>1077 (District Collectorate)</span>
              <PhoneCall size={13} className="text-[#4A7C59]" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CitizenWelcome;
