import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, role, demoCitizenLogin, demoAuthorityLogin } = useAuthStore();

  const handleCitizenClick = () => {
    if (user && role === 'citizen') {
      navigate('/citizen/dashboard');
    } else {
      navigate('/citizen/auth');
    }
  };

  const handleAuthorityClick = () => {
    if (user && (role === 'authority' || role === 'admin')) {
      navigate('/authority');
    } else {
      navigate('/authority/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#0F2018] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 selection:bg-[#4A7C59] selection:text-white relative">
      {/* Background ambient natural accents */}
      <div className="absolute -top-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 bg-[#4A7C59]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 bg-[#7FB99A]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-4xl mx-auto my-auto z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#4A7C59] text-white shadow-md mx-auto mb-1">
            <Shield size={26} className="sm:w-7 sm:h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C8D8BC]/50 text-[#1A3028] border border-[#7FB99A]/60">
            <span>SIH26001 · Northeast India</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-[#0F2018] tracking-tight uppercase">
            Landslide Watch
          </h1>

          <p className="text-xs sm:text-sm text-[#1A3028] font-medium max-w-md mx-auto">
            Early warning & decision-support system. Choose your portal to continue.
          </p>
        </div>

        {/* 2 Focused Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          {/* CARD 1: CITIZEN */}
          <div className="rounded-3xl bg-white border-2 border-[#C8D8BC] hover:border-[#4A7C59] p-5 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#C8D8BC]/35 border border-[#7FB99A]/50 text-[#4A7C59] flex items-center justify-center shadow-xs">
                  <Users size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#C8D8BC]/40 text-[#1A3028] border border-[#7FB99A]/50">
                  Public Safety
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#0F2018]">
                  Citizen Portal
                </h2>
                <p className="text-xs sm:text-sm text-[#1A3028] font-medium mt-1 leading-relaxed">
                  Simple personal safety for residents and travelers.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="bg-[#F5F0E8] p-3.5 rounded-2xl border border-[#C8D8BC] space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#1A3028] font-medium">
                  <CheckCircle2 size={14} className="text-[#4A7C59] shrink-0" />
                  <span>Am I safe where I am right now?</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1A3028] font-medium">
                  <CheckCircle2 size={14} className="text-[#4A7C59] shrink-0" />
                  <span>🚗 Check safe travel routes</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1A3028] font-medium">
                  <CheckCircle2 size={14} className="text-[#4A7C59] shrink-0" />
                  <span>📷 Report ground cracks & hazards</span>
                </div>
              </div>
            </div>

            <div className="pt-5 space-y-2">
              <button
                onClick={handleCitizenClick}
                className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>👤 I AM A CITIZEN</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => {
                  demoCitizenLogin();
                  navigate('/citizen/welcome');
                }}
                className="w-full py-2 px-3 rounded-lg bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 active:scale-[0.99] text-[#1A3028] text-xs font-semibold border border-[#C8D8BC] transition-all cursor-pointer"
              >
                ⚡ 1-Click Demo Citizen Access
              </button>
            </div>
          </div>

          {/* CARD 2: AUTHORITY */}
          <div className="rounded-3xl bg-white border-2 border-[#C8D8BC] hover:border-[#1A3028] p-5 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#1A3028]/10 border border-[#1A3028]/20 text-[#1A3028] flex items-center justify-center shadow-xs">
                  <Building2 size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  Protected Access
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#0F2018]">
                  Disaster Authority
                </h2>
                <p className="text-xs sm:text-sm text-[#1A3028] font-medium mt-1 leading-relaxed">
                  Command center for NDMA, SDMA, DDMA & NDRF.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="bg-[#F5F0E8] p-3.5 rounded-2xl border border-[#C8D8BC] space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#1A3028] font-medium">
                  <CheckCircle2 size={14} className="text-[#1A3028] shrink-0" />
                  <span>9-Layer live GIS risk map & alerts</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1A3028] font-medium">
                  <CheckCircle2 size={14} className="text-[#1A3028] shrink-0" />
                  <span>Automated SOP task dispatch</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1A3028] font-medium">
                  <CheckCircle2 size={14} className="text-[#1A3028] shrink-0" />
                  <span>Physics simulation & field verification</span>
                </div>
              </div>
            </div>

            <div className="pt-5 space-y-2">
              <button
                onClick={handleAuthorityClick}
                className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>🏛️ I AM AN AUTHORITY</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => {
                  demoAuthorityLogin();
                  navigate('/authority');
                }}
                className="w-full py-2 px-3 rounded-lg bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 active:scale-[0.99] text-[#1A3028] text-xs font-semibold border border-[#C8D8BC] transition-all cursor-pointer"
              >
                🛡️ 1-Click Demo Officer Access
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Mobile-Friendly Footer */}
      <footer className="text-center pt-4 z-10">
        <p className="text-[11px] text-[#1A3028]/70 font-medium">
          Landslide Watch SIH26001 · Multi-Factor Landslide Early Warning · Northeast India
        </p>
      </footer>
    </div>
  );
}

