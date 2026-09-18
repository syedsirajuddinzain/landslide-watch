import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, Radio, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, role, signOut, demoCitizenLogin, demoAuthorityLogin } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#0F2018] flex flex-col justify-between selection:bg-[#4A7C59] selection:text-white relative overflow-hidden">
      {/* Background ambient natural lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#4A7C59]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-[#7FB99A]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#C8D8BC]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner / Navbar */}
      <header className="border-b border-[#C8D8BC] bg-white/80 backdrop-blur-md px-6 py-3.5 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4A7C59] flex items-center justify-center text-white shadow-sm">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider uppercase text-[#0F2018] flex items-center gap-2">
                <span>Landslide Watch</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#C8D8BC]/50 text-[#1A3028] border border-[#7FB99A]/60">
                  SIH26001
                </span>
              </div>
              <div className="text-[11px] text-[#1A3028] font-medium">
                National Decision-Support & Early-Warning Platform · Northeast India
              </div>
            </div>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#0F2018]">{user.email}</div>
                <div className="text-[10px] text-[#4A7C59] font-mono capitalize">Active: {role}</div>
              </div>
              <button
                onClick={() => navigate(role === 'authority' || role === 'admin' ? '/authority' : '/citizen')}
                className="px-3.5 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => signOut()}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F5F0E8] text-[#1A3028] text-xs font-semibold border border-[#C8D8BC] transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  demoCitizenLogin();
                  navigate('/citizen');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Users size={14} />
                <span>Citizen Safety Portal</span>
              </button>
              <button
                onClick={() => navigate('/authority/login')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F0E8] text-[#1A3028] text-xs font-semibold border border-[#C8D8BC] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 size={13} />
                <span className="hidden sm:inline">Authority Login</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center items-center z-10 w-full">
        {/* Core Hero Branding */}
        <div className="text-center max-w-2xl space-y-3 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#C8D8BC] text-[11px] font-semibold text-[#1A3028] shadow-xs">
            <Radio size={13} className="text-[#4A7C59] animate-pulse" />
            <span>Operational Real-Time Environmental Telemetry & Multi-Factor Risk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#0F2018] tracking-tight uppercase">
            Landslide Watch
          </h1>

          <p className="text-base sm:text-lg font-medium text-[#1A3028] leading-relaxed">
            Know the risk. Stay prepared. Stay safe around landslide-prone areas.
          </p>

          <p className="text-xs sm:text-sm text-[#1A3028] max-w-xl mx-auto font-normal">
            Choose your dedicated workspace below to access personalized personal safety guidance or operational disaster command controls.
          </p>
        </div>

        {/* DUAL ENTRY SELECTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* OPTION 1: CITIZEN / COMMON PERSON */}
          <div className="group relative rounded-3xl bg-white border-2 border-[#C8D8BC] hover:border-[#4A7C59] p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#C8D8BC]/30 border border-[#7FB99A]/50 text-[#4A7C59] flex items-center justify-center group-hover:bg-[#4A7C59] group-hover:text-white transition-all shadow-xs">
                  <Users size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#C8D8BC]/50 text-[#1A3028] border border-[#7FB99A]/60">
                  Public Safety · Free
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#0F2018] group-hover:text-[#4A7C59] transition-colors">
                  Citizen / Common Person
                </h2>
                <p className="text-xs sm:text-sm text-[#1A3028] font-medium mt-1 leading-relaxed">
                  Simple, localized personal safety dashboard. Know the risk at your location or planned travel route.
                </p>
              </div>

              <div className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#C8D8BC] space-y-2.5">
                <p className="text-xs text-[#1A3028] italic leading-relaxed">
                  "For citizens: check the safety conditions around your location, receive warnings and report hazards."
                </p>
                <div className="pt-2 border-t border-[#C8D8BC] space-y-2">
                  <div className="text-[11px] font-bold text-[#0F2018] uppercase tracking-wider">
                    Citizen Features:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1A3028]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#4A7C59] font-black">✓</span> Instant GPS Safety Check
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#4A7C59] font-black">✓</span> 🚗 Check My Trip Route
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#4A7C59] font-black">✓</span> 📷 Camera Hazard Report
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#4A7C59] font-black">✓</span> 🎙️ Voice Reporting
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <button
                onClick={() => {
                  if (user && role === 'citizen') {
                    navigate('/citizen/dashboard');
                  } else {
                    navigate('/citizen/auth');
                  }
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-black text-sm tracking-wide shadow-md shadow-[#4A7C59]/20 flex items-center justify-center gap-2 group-hover:gap-3 transition-all cursor-pointer"
              >
                <span>👤 I AM A CITIZEN</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => {
                  demoCitizenLogin();
                  navigate('/citizen/welcome');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 text-[#1A3028] hover:text-[#0F2018] text-xs font-bold border border-[#C8D8BC] transition-all shadow-2xs cursor-pointer"
                title="1-Click Evaluation Mode"
              >
                ⚡ 1-Click Evaluator: Enter Citizen Safety Portal
              </button>
            </div>
          </div>

          {/* OPTION 2: AUTHORITY / DISASTER MANAGEMENT */}
          <div className="group relative rounded-3xl bg-white border-2 border-[#C8D8BC] hover:border-[#1A3028] p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#1A3028]/10 border border-[#1A3028]/20 text-[#1A3028] flex items-center justify-center group-hover:bg-[#1A3028] group-hover:text-white transition-all shadow-xs">
                  <Building2 size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
                  Strictly Protected · Officers
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#0F2018] group-hover:text-[#1A3028] transition-colors">
                  Disaster Management Authority
                </h2>
                <p className="text-xs sm:text-sm text-[#1A3028] font-medium mt-1 leading-relaxed">
                  For NDMA, SDMA, DDMA, NDRF battalions & certified emergency responders.
                </p>
              </div>

              <div className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#C8D8BC] space-y-2.5">
                <p className="text-xs text-[#1A3028] italic leading-relaxed">
                  "For authorities: monitor regional risk, alerts, critical infrastructure and field response."
                </p>
                <div className="pt-2 border-t border-[#C8D8BC] space-y-2">
                  <div className="text-[11px] font-bold text-[#0F2018] uppercase tracking-wider">
                    Authority Command Features:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1A3028]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#1A3028] font-black">✓</span> 9-Layer GIS Risk Map
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#1A3028] font-black">✓</span> Response Task Dispatch
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#1A3028] font-black">✓</span> Citizen Reports Verification
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#1A3028] font-black">✓</span> Automated Backtesting
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <button
                onClick={() => {
                  if (user && (role === 'authority' || role === 'admin')) {
                    navigate('/authority');
                  } else {
                    navigate('/authority/login');
                  }
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#1A3028] hover:bg-[#0F2018] text-white font-black text-sm tracking-wide shadow-md shadow-[#1A3028]/20 flex items-center justify-center gap-2 group-hover:gap-3 transition-all cursor-pointer"
              >
                <span>🏛️ I AM AN AUTHORITY</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => {
                  demoAuthorityLogin();
                  navigate('/authority');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 text-[#1A3028] hover:text-[#0F2018] text-xs font-bold border border-[#C8D8BC] transition-all shadow-2xs cursor-pointer"
                title="1-Click Evaluation Mode"
              >
                🛡️ Fast Demo Evaluator: Enter as Authority Officer
              </button>
            </div>
          </div>
        </div>

        {/* TRUST & SCIENTIFIC DISCLAIMER */}
        <div className="mt-8 sm:mt-12 text-center max-w-3xl border border-[#C8D8BC] rounded-2xl p-4 bg-white text-xs text-[#1A3028] leading-relaxed flex items-center gap-3 shadow-xs">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 hidden sm:block" />
          <div className="text-left text-[11px] sm:text-xs">
            <span className="font-bold text-[#0F2018]">Decision-Support System:</span> Risk scores represent multi-factor physical indicators (Open-Meteo precipitation, SRTM slope, ISRIC SoilGrids, OSM lifelines). Risk Score ≠ Landslide Probability. All alerts require ground field verification by authorized disaster management officials.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#C8D8BC] bg-white/80 px-6 py-4 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#1A3028]">
          <div>
            Smart India Hackathon 2026 · Problem ID: <span className="font-mono text-[#0F2018] font-bold">SIH26001</span> · Northeast India
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-[#1A3028]">
            <span>Assam</span>
            <span>•</span>
            <span>Meghalaya</span>
            <span>•</span>
            <span>Mizoram</span>
            <span>•</span>
            <span>Sikkim</span>
            <span>•</span>
            <span>Nagaland</span>
            <span>•</span>
            <span>Manipur</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
