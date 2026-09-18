import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, AlertTriangle, Building2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/shared/Badges';

export default function AuthorityLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, authorityLogin, demoAuthorityLogin, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    if (user && (role === 'authority' || role === 'admin')) {
      const from = (location.state as any)?.from?.pathname || '/authority';
      navigate(from, { replace: true });
    }
  }, [user, role, navigate, location.state, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      await authorityLogin(email.trim(), password);
      navigate('/authority', { replace: true });
    } catch (err: any) {
      setLocalError(err.message || 'Authority authentication failed. Please verify credentials.');
    }
  };

  const fillDemoCreds = (type: 'officer' | 'admin') => {
    if (type === 'officer') {
      setEmail('authority@landslidewatch.gov.in');
      setPassword('Authority@SIH2026');
    } else {
      setEmail('admin@landslidewatch.gov.in');
      setPassword('Admin@SIH2026');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#0F2018] flex flex-col justify-between selection:bg-[#1A3028] selection:text-white relative overflow-hidden">
      {/* Background ambient natural lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#4A7C59]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-[#C8D8BC] bg-white/80 backdrop-blur-md flex items-center justify-between z-10 shadow-xs">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#1A3028] hover:text-[#0F2018] transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-[#1A3028]">
          <Shield size={14} className="text-[#4A7C59]" />
          <span className="font-mono font-bold text-[#0F2018]">SECURE DISASTER COMMAND GATEWAY</span>
        </div>
      </header>

      {/* Center Container */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[#1A3028] border border-[#1A3028]/20 text-white flex items-center justify-center mx-auto shadow-md">
              <Building2 size={32} className="text-emerald-200" />
            </div>
            <h1 className="text-2xl font-black text-[#0F2018] tracking-wide uppercase">
              Authority Access
            </h1>
            <p className="text-xs text-[#1A3028] max-w-xs mx-auto font-medium">
              Authorized emergency management, SDMA/DDMA officers & field response teams only.
            </p>
          </div>

          {/* Security Alert Notice */}
          <div className="bg-white border border-[#C8D8BC] rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#1A3028] shadow-xs">
            <Lock size={16} className="text-[#4A7C59] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#0F2018]">Strict Role-Based Authorization:</span> Common citizen accounts cannot access regional command tools or operational dispatch APIs.
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#C8D8BC] rounded-3xl p-6 shadow-md space-y-4">
            {(localError || error) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{localError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A3028] mb-1.5">
                  Authority ID / Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@landslidewatch.gov.in"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] text-[#0F2018] text-sm focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] focus:outline-none transition-all placeholder:text-[#1A3028]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A3028] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] text-[#0F2018] text-sm focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] focus:outline-none transition-all placeholder:text-[#1A3028]/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A3028]/60 hover:text-[#0F2018]"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white font-bold text-sm tracking-wide shadow-md shadow-[#1A3028]/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Spinner size={16} />
                    <span>Verifying Authority Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>SIGN IN</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-[11px] font-mono text-[#1A3028]/70 uppercase tracking-wider font-semibold">
                Authorized personnel only.
              </span>
            </div>

            {/* FAST EVALUATOR QUICK ACTIONS */}
            <div className="pt-4 border-t border-[#C8D8BC] space-y-2">
              <div className="text-[11px] font-bold text-[#0F2018] uppercase tracking-wider">
                Evaluator Quick Access (Hackathon Testing)
              </div>
              <button
                type="button"
                onClick={() => {
                  demoAuthorityLogin();
                  navigate('/authority');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 border border-[#C8D8BC] text-[#1A3028] hover:text-[#0F2018] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>🛡️ Demo Authority Officer Login (1-Click)</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoCreds('officer')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 text-[#1A3028] text-[11px] font-semibold border border-[#C8D8BC] transition-colors cursor-pointer"
                >
                  Fill Officer Creds
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCreds('admin')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#F5F0E8] hover:bg-[#C8D8BC]/50 text-[#1A3028] text-[11px] font-semibold border border-[#C8D8BC] transition-colors cursor-pointer"
                >
                  Fill Admin Creds
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-[#C8D8BC] bg-white/80 text-center text-[11px] text-[#1A3028] z-10 font-mono font-medium">
        Landslide Watch SIH26001 · Protected Disaster Decision Support Interface
      </footer>
    </div>
  );
}
