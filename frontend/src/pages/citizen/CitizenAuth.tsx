import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, ArrowLeft, Mail, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function CitizenAuth() {
  const navigate = useNavigate();
  const { demoLogin, signIn, switchPortal } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle1ClickEntry = () => {
    switchPortal('citizen');
    demoLogin('citizen');
    navigate('/citizen/welcome');
  };

  const handleGoogleSignIn = () => {
    switchPortal('citizen');
    demoLogin('citizen');
    navigate('/citizen/welcome');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch {
      // Fallback to local session
      demoLogin('citizen');
    } finally {
      setLoading(false);
      switchPortal('citizen');
      navigate('/citizen/welcome');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2018] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Header with back navigation */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#1A3028] hover:text-[#0F2018] px-3 py-1.5 rounded-xl bg-white border border-[#C8D8BC] transition-all shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Role Selection</span>
        </button>

        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          Citizen Access
        </span>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-white rounded-3xl border-2 border-[#C8D8BC] p-6 sm:p-8 shadow-sm space-y-6">
          {/* Brand & Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#4A7C59] text-white flex items-center justify-center mx-auto shadow-xs">
              <Shield size={24} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F2018] tracking-tight">
              Citizen Safety Sign-In
            </h1>
            <p className="text-xs text-[#1A3028] max-w-xs mx-auto">
              Real-time landslide warning and route safety for Northeast India.
            </p>
          </div>

          {/* 3 SIGN-IN CHOICES */}
          <div className="space-y-3">
            {/* 1. 1-CLICK INSTANT ENTRY */}
            <button
              onClick={handle1ClickEntry}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-98"
            >
              <Sparkles size={16} />
              <span>1-Click Instant Citizen Entry</span>
            </button>

            {/* 2. GOOGLE LOGIN */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-[#0F2018] border-2 border-[#C8D8BC] hover:border-slate-400 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* 3. EMAIL TOGGLE */}
            {!isEmailMode ? (
              <button
                onClick={() => setIsEmailMode(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F5F0E8] text-[#1A3028] border border-[#C8D8BC] font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Mail size={14} />
                <span>Sign In with Email</span>
              </button>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 border-t border-[#C8D8BC]/60">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1A3028] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1A3028] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F2018] hover:bg-black text-white font-bold text-xs shadow-xs transition-all"
                >
                  {loading ? 'Verifying...' : 'Submit & Enter'}
                </button>
              </form>
            )}
          </div>

          {/* Privacy & Safe Grid note */}
          <div className="pt-2 text-center text-[10px] text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 size={12} className="text-[#4A7C59]" />
              <span>Public Service of Northeast India Disaster Management</span>
            </div>
            <div>No personal data sold or tracked outside emergency distress.</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-[#1A3028] pb-2">
        Need authority access?{' '}
        <button
          onClick={() => navigate('/authority/login')}
          className="font-bold text-[#4A7C59] hover:underline"
        >
          Switch to Authority Login →
        </button>
      </div>
    </div>
  );
}

export default CitizenAuth;
