import React, { useState } from 'react';
import { Shield, MapPin, Compass, Search, CheckCircle, ArrowRight, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { MONITORED_NER_LOCATIONS } from './nerLocations';

interface CitizenOnboardingModalProps {
  isOpen: boolean;
  onComplete: (location: { lat: number; lon: number; name: string }) => void;
}

export function CitizenOnboardingModal({ isOpen, onComplete }: CitizenOnboardingModalProps) {
  const { setUserLocation, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState<'welcome' | 'location' | 'manual'>('welcome');
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle GPS location
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your device browser. Please select location manually.');
      setStep('manual');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Find nearest monitored location
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

        const resolvedLocation = {
          lat,
          lon,
          name: isWithinNER
            ? (minD < 15 ? `${nearest.name}, ${nearest.state}` : `${nearest.name} Region, ${nearest.state}`)
            : `GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (Out of Region)`,
        };

        setUserLocation(resolvedLocation);
        completeOnboarding();
        onComplete(resolvedLocation);
      },
      (err) => {
        setIsLocating(false);
        setErrorMessage('Location permission was denied. You can select your town manually below.');
        setStep('manual');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle skip with sample catchment
  const handleSkip = () => {
    const defaultLoc = MONITORED_NER_LOCATIONS[0];
    const fallback = {
      lat: defaultLoc.lat,
      lon: defaultLoc.lon,
      name: `${defaultLoc.name}, ${defaultLoc.state}`,
    };
    setUserLocation(fallback);
    completeOnboarding();
    onComplete(fallback);
  };

  // Handle manual selection
  const handleSelectLocation = (loc: (typeof MONITORED_NER_LOCATIONS)[0]) => {
    const selected = {
      lat: loc.lat,
      lon: loc.lon,
      name: `${loc.name}, ${loc.state}`,
    };
    setUserLocation(selected);
    completeOnboarding();
    onComplete(selected);
  };

  const filteredLocations = MONITORED_NER_LOCATIONS.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#C8D8BC] shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Top-Right Dismiss Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          title="Close and view dashboard directly"
        >
          <X size={16} />
        </button>

        {/* STEP 1: WELCOME SCREEN */}
        {step === 'welcome' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-[#4A7C59] text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/20">
              <Shield size={42} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F2018] tracking-tight uppercase">
                Stay Safe.<br />
                Know Your Risk.
              </h2>
              <p className="text-sm text-[#2C4A3E] font-medium leading-relaxed">
                Get a quick safety check for the area around you.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => setStep('location')}
                className="w-full py-4 px-6 rounded-2xl bg-[#4A7C59] hover:bg-[#3B6647] text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all hover:gap-3"
              >
                <span>CONTINUE</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Skip for now · View Dashboard (Aizawl, Mizoram) →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOCATION PERMISSION */}
        {step === 'location' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <MapPin size={42} className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#0F2018] tracking-tight">
                📍 Allow location access
              </h2>
              <p className="text-xs sm:text-sm text-[#2C4A3E] font-medium leading-relaxed max-w-xs mx-auto">
                Use your location to check the landslide risk around you.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleUseGPS}
                disabled={isLocating}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4A7C59] hover:bg-[#3B6647] text-white font-black text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Compass size={18} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'DETECTING GPS...' : 'ALLOW LOCATION'}</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">OR</span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              <button
                onClick={() => setStep('manual')}
                className="w-full py-3 px-4 rounded-2xl bg-[#F5F0E8] hover:bg-[#EAE2D5] border border-[#C8D8BC] text-[#0F2018] font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Search size={16} className="text-[#4A7C59]" />
                <span>ENTER LOCATION MANUALLY</span>
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-2 px-3 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Skip for now · Explore Monitored Region (Aizawl, Mizoram) →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MANUAL LOCATION SELECTOR */}
        {step === 'manual' && (
          <div className="p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#C8D8BC]">
              <div>
                <h3 className="text-sm font-bold text-[#0F2018]">Select Monitored Area</h3>
                <p className="text-[11px] text-[#2C4A3E]">Choose a catchment across Northeast India</p>
              </div>
              <button
                onClick={() => setStep('location')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search town, district, or state..."
                autoFocus
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-[#C8D8BC] text-xs focus:outline-none focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59]"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-60 scrollbar-thin">
              {filteredLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full text-left p-3 rounded-xl bg-[#F7F9F6] hover:bg-[#EAEFD8] border border-[#C8D8BC]/60 hover:border-[#4A7C59] transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F2018] group-hover:text-[#4A7C59]">
                      {loc.name}
                    </div>
                    <div className="text-[10px] text-[#2C4A3E]">
                      {loc.district}, {loc.state}
                    </div>
                  </div>
                  <MapPin size={14} className="text-slate-400 group-hover:text-[#4A7C59]" />
                </button>
              ))}

              {filteredLocations.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No monitored catchments found matching "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
