import { useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Building2,
  Compass,
  ArrowRight,
  PhoneCall,
  MapPin,
  Sparkles,
  Radio,
  CheckCircle,
  AlertTriangle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function DualEntryLanding() {
  const navigate = useNavigate();
  const { demoLogin, switchPortal } = useAuthStore();

  const handleCitizenEntry = () => {
    switchPortal('citizen');
    navigate('/citizen/auth');
  };

  const handleAuthorityEntry = () => {
    switchPortal('authority');
    navigate('/authority/login');
  };

  const handleInstantCitizenDemo = () => {
    demoLogin('citizen');
    navigate('/citizen/welcome');
  };

  const handleInstantAuthorityDemo = () => {
    demoLogin('authority');
    navigate('/authority');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2018] flex flex-col font-sans selection:bg-[#4A7C59] selection:text-white">
      {/* Top Banner */}
      <div className="bg-[#1A3028] text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-[#4A7C59]/40">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-[#4A7C59] text-[10px] font-black uppercase tracking-wider">
              SIH 2026
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Smart India Hackathon • SIH26001 Northeast India Landslide Early Warning
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>8 States Monitored</span>
            </span>
            <a href="tel:112" className="text-rose-400 hover:text-rose-300 font-bold hidden sm:inline">
              SOS 112
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-[#C8D8BC] px-4 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-[#0F2018] flex items-center gap-2">
                <span>LANDSLIDE WATCH</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  NER Grid
                </span>
              </div>
              <div className="text-[11px] text-[#1A3028] font-medium">
                Dual-Purpose Multi-Factor Early Warning System
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstantCitizenDemo}
              className="px-3 py-1.5 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] hover:border-[#4A7C59] text-xs font-bold text-[#0F2018] transition-all hidden sm:inline-flex items-center gap-1.5"
            >
              <span>👤 Quick Citizen View</span>
            </button>
            <button
              onClick={handleInstantAuthorityDemo}
              className="px-3 py-1.5 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Building2 size={13} className="text-[#C8D8BC]" />
              <span>🏛️ Quick Authority View</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="py-10 sm:py-14 px-4 bg-gradient-to-b from-white via-[#FAF7F2] to-[#FAF7F2] border-b border-[#C8D8BC]/80">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-xs font-bold text-[#4A7C59]">
            <Sparkles size={14} />
            <span>Dual-Purpose AI & GIS Early Warning Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2018] tracking-tight leading-tight">
            Select Your Role to Continue
          </h1>

          <p className="text-sm sm:text-base text-[#1A3028] max-w-2xl mx-auto leading-relaxed">
            One unified predictive engine powered by Open-Meteo precipitation, NASA COOLR historical records,
            and SRTM 30m digital elevation — serving both the general public and disaster management authorities.
          </p>
        </div>
      </div>

      {/* THE TWO BIG DUAL ENTRY CARDS */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* CARD 1: CITIZEN ENTRY */}
          <div
            onClick={handleCitizenEntry}
            className="group cursor-pointer rounded-3xl bg-white border-2 border-[#C8D8BC] hover:border-[#4A7C59] p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#4A7C59]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>

            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#4A7C59]/15 text-[#4A7C59] flex items-center justify-center group-hover:bg-[#4A7C59] group-hover:text-white transition-colors duration-300 shadow-xs">
                <User size={28} />
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#4A7C59] mb-1">
                  Public & Community Safety
                </div>
                <h2 className="text-2xl font-black text-[#0F2018] tracking-tight flex items-center justify-between">
                  <span>I AM A CITIZEN</span>
                  <ArrowRight size={20} className="text-[#4A7C59] transform group-hover:translate-x-1.5 transition-transform" />
                </h2>
                <p className="text-xs text-[#1A3028] mt-2 leading-relaxed">
                  For residents, travelers, and mountain commuters across the 8 Northeast Indian States.
                  Understand your personal landslide safety without technical jargon.
                </p>
              </div>

              {/* Citizen Feature Highlights */}
              <div className="space-y-2 pt-2 border-t border-[#C8D8BC]/60">
                <div className="flex items-center gap-2 text-xs font-medium text-[#0F2018]">
                  <CheckCircle size={15} className="text-[#4A7C59] shrink-0" />
                  <span><strong>"Am I Safe Right Now?"</strong> personal status</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#0F2018]">
                  <CheckCircle size={15} className="text-[#4A7C59] shrink-0" />
                  <span><strong>🚗 Check My Trip</strong> mountain corridor safety</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#0F2018]">
                  <CheckCircle size={15} className="text-[#4A7C59] shrink-0" />
                  <span><strong>🚨 Report Hazard</strong> with Camera photo & Mic audio</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#0F2018]">
                  <CheckCircle size={15} className="text-[#4A7C59] shrink-0" />
                  <span><strong>🔴 Critical Emergency Mode</strong> & Safer ground finder</span>
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCitizenEntry();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4A7C59] group-hover:bg-[#1A3028] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>Enter as Citizen →</span>
              </button>
              <div className="text-center mt-2 text-[11px] text-slate-500">
                1-Click entry • No password required
              </div>
            </div>
          </div>

          {/* CARD 2: AUTHORITY ENTRY */}
          <div
            onClick={handleAuthorityEntry}
            className="group cursor-pointer rounded-3xl bg-[#1A3028] border-2 border-[#1A3028] hover:border-[#4A7C59] p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-white transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#4A7C59]/15 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>

            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-[#C8D8BC] flex items-center justify-center group-hover:bg-[#4A7C59] group-hover:text-white transition-colors duration-300 shadow-xs">
                <Building2 size={28} />
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#C8D8BC] mb-1">
                  Disaster Management Cockpit
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-between">
                  <span>I AM AN AUTHORITY</span>
                  <ArrowRight size={20} className="text-[#C8D8BC] transform group-hover:translate-x-1.5 transition-transform" />
                </h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  For NDMA, State SDMAs, District Collectors, NDRF / SDRF Battalions, and Geological Survey engineers.
                  Full GIS telemetric early warning command center.
                </p>
              </div>

              {/* Authority Feature Highlights */}
              <div className="space-y-2 pt-2 border-t border-white/15">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <CheckCircle size={15} className="text-[#C8D8BC] shrink-0" />
                  <span><strong>Live 9-Layer GIS Map</strong> with rainfall radar overlays</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <CheckCircle size={15} className="text-[#C8D8BC] shrink-0" />
                  <span><strong>Response Center & NDRF Task Board</strong> dispatch</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <CheckCircle size={15} className="text-[#C8D8BC] shrink-0" />
                  <span><strong>Citizen Ground Reports Feed</strong> triage & verification</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <CheckCircle size={15} className="text-[#C8D8BC] shrink-0" />
                  <span><strong>Operational SOPs</strong> & 1-Click CAP Alert siren issuance</span>
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAuthorityEntry();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4A7C59] hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>Enter Command Center →</span>
              </button>
              <div className="text-center mt-2 text-[11px] text-slate-400">
                Secured Login • ID / Email + RBAC
              </div>
            </div>
          </div>
        </div>

        {/* Live Operational Perimeter Banner */}
        <div className="p-4 rounded-2xl bg-white border border-[#C8D8BC] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <div className="font-bold text-[#0F2018]">
                Exclusive Coverage: The 8 Northeast Indian States
              </div>
              <div className="text-[11px] text-[#1A3028]">
                Assam • Meghalaya • Mizoram • Nagaland • Manipur • Sikkim • Arunachal Pradesh • Tripura
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-[#4A7C59] font-bold bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#C8D8BC] self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>20 Catchments Monitored</span>
          </div>
        </div>

        {/* Emergency Assistance Footer */}
        <div className="p-4 rounded-2xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#0F2018]">
            <span className="flex items-center gap-1.5">
              <span>🚨</span> 24x7 Emergency Contact Directory (Northeast India)
            </span>
            <span className="text-[10px] text-[#4A7C59] font-bold">National Hotlines</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <a
              href="tel:112"
              className="p-2.5 rounded-xl bg-white border border-[#C8D8BC] flex items-center justify-between font-bold text-[#0F2018] hover:border-rose-400 shadow-xs"
            >
              <span>112 (National SOS Emergency)</span>
              <PhoneCall size={13} className="text-rose-600" />
            </a>
            <a
              href="tel:1070"
              className="p-2.5 rounded-xl bg-white border border-[#C8D8BC] flex items-center justify-between font-bold text-[#0F2018] hover:border-[#4A7C59] shadow-xs"
            >
              <span>1070 (State Disaster Management)</span>
              <PhoneCall size={13} className="text-[#4A7C59]" />
            </a>
            <a
              href="tel:1077"
              className="p-2.5 rounded-xl bg-white border border-[#C8D8BC] flex items-center justify-between font-bold text-[#0F2018] hover:border-[#4A7C59] shadow-xs"
            >
              <span>1077 (District Disaster Authority)</span>
              <PhoneCall size={13} className="text-[#4A7C59]" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DualEntryLanding;
