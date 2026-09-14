import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Spinner } from '../components/shared/Badges';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { signIn, loading, user, demoLogin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Invalid email or password.' : err.message || 'Sign in failed.';
      setError(msg);
    }
  };

  const fillDemo = (role: string) => {
    const creds: Record<string, [string, string]> = {
      citizen: ['citizen@landslidewatch.in', 'Citizen@SIH2026'],
      admin: ['admin@landslidewatch.in', 'Admin@SIH2026'],
      authority: ['authority@landslidewatch.in', 'Authority@SIH2026'],
      viewer: ['viewer@landslidewatch.in', 'Viewer@SIH2026'],
    };
    const [e, p] = creds[role];
    setEmail(e); setPassword(p);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 mb-4 shadow-2xl">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Landslide Watch</h1>
          <p className="text-slate-400 text-sm mt-1">NER Landslide Risk · SIH26001</p>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-3 mb-6 flex gap-2">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">Decision-support system. Risk scores require field validation. Do not issue evacuation orders solely based on this system.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="you@example.com" required autoComplete="email" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="input pr-10" placeholder="••••••••" required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-2 text-red-400 text-xs">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {loading ? <><Spinner size={16} /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        {/* 1-Click Instant Guest / Evaluator Entry */}
        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              demoLogin('citizen');
              navigate('/citizen');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 border border-[#7FB99A]/40"
          >
            <span>👥 1-Click Entry: Citizen Safety View ("Am I safe?")</span>
          </button>
          <button
            onClick={() => {
              demoLogin('authority');
              navigate('/');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1A3028] hover:bg-[#0F2018] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 border border-[#C8D8BC]/40"
          >
            <span>🛡️ 1-Click Entry: Disaster Authority Cockpit (GIS & SOP)</span>
          </button>
        </div>

        {/* Demo quick-fill */}
        <div className="mt-4 card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo Accounts</div>
          <div className="grid grid-cols-4 gap-2">
            {['citizen', 'authority', 'admin', 'viewer'].map(role => (
              <button key={role} onClick={() => fillDemo(role)}
                className="text-xs py-1.5 px-2 rounded bg-surface hover:bg-surface-card border border-surface-border text-slate-300 hover:text-white capitalize transition-colors">
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
