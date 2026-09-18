import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, MapPin, Radio, AlertTriangle, ArrowRight, Activity, Compass } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, role, signOut, demoCitizenLogin, demoAuthorityLogin } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#0A121A] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-3.5 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span>Landslide Watch</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SIH26001
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                National Decision-Support & Early-Warning Platform · Northeast India
              </div>
            </div>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-200">{user.email}</div>
                <div className="text-[10px] text-emerald-400 font-mono capitalize">Active: {role}</div>
              </div>
              <button
                onClick={() => navigate(role === 'authority' || role === 'admin' ? '/authority' : '/citizen')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => signOut()}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
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
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
              >
                <Users size={14} />
                <span>Citizen Safety Portal</span>
              </button>
              <button
                onClick={() => navigate('/authority/login')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300 shadow-inner">
            <Radio size={13} className="text-emerald-400 animate-pulse" />
            <span>Operational Real-Time Environmental Telemetry & Multi-Factor Risk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            Landslide Watch
          </h1>

          <p className="text-base sm:text-lg font-medium text-slate-300 leading-relaxed">
            Know the risk. Stay prepared. Stay safe around landslide-prone areas.
          </p>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Choose your dedicated workspace below to access personalized personal safety guidance or operational disaster command controls.
          </p>
        </div>

        {/* DUAL ENTRY SELECTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* OPTION 1: CITIZEN / COMMON PERSON */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-emerald-500/30 hover:border-emerald-400 p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-lg">
                  <Users size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Public Safety · Free
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  Citizen / Common Person
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                  Simple, localized personal safety dashboard. Know the risk at your location or planned travel route.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  "For citizens: check the safety conditions around your location, receive warnings and report hazards."
                </p>
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Citizen Features:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Instant GPS Safety Check
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> 🚗 Check My Trip Route
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> 📷 Camera Hazard Report
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> 🎙️ Voice Reporting
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
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
              >
                <span>👤 I AM A CITIZEN</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => {
                  demoCitizenLogin();
                  navigate('/citizen/welcome');
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700/50 transition-colors"
                title="1-Click Evaluation Mode"
              >
                ⚡ 1-Click Evaluator: Enter Citizen Safety Portal
              </button>
            </div>
          </div>

          {/* OPTION 2: AUTHORITY / DISASTER MANAGEMENT */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-blue-500/30 hover:border-blue-400 p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 shadow-lg">
                  <Building2 size={28} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Strictly Protected
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors">
                  I am an Authority
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  For NDMA, SDMA, DDMA, NDRF & emergency responders
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  "For authorities: monitor regional risk, alerts, infrastructure and field response."
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">✓</span> 9-Layer Interactive GIS Map
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">✓</span> Response Task Dispatch
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">✓</span> Citizen Reports Verification
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">✓</span> Automated Backtesting
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
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
              >
                <span>🏛️ I AM AN AUTHORITY</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => {
                  demoAuthorityLogin();
                  navigate('/authority');
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700/50 transition-colors"
                title="1-Click Evaluation Mode"
              >
                🛡️ Fast Demo Evaluator: Enter as Authority Officer
              </button>
            </div>
          </div>
        </div>

        {/* TRUST & SCIENTIFIC DISCLAIMER */}
        <div className="mt-8 sm:mt-12 text-center max-w-3xl border border-slate-800 rounded-2xl p-4 bg-slate-950/40 text-xs text-slate-500 leading-relaxed flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 hidden sm:block" />
          <div className="text-left text-[11px] sm:text-xs">
            <span className="font-bold text-slate-400">Decision-Support System:</span> Risk scores represent multi-factor physical indicators (Open-Meteo precipitation, SRTM slope, ISRIC SoilGrids, OSM lifelines). Risk Score ≠ Landslide Probability. All alerts require ground field verification by authorized disaster management officials.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/80 px-6 py-4 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Smart India Hackathon 2026 · Problem ID: <span className="font-mono text-slate-300">SIH26001</span> · Northeast India
          </div>
          <div className="flex items-center gap-4 text-[11px]">
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
