import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, Lock, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../../components/shared/Badges';

export default function CitizenAuth() {
  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, resetPassword, demoCitizenLogin, loading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === 'register') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match. Please verify.');
        return;
      }
      try {
        await signUp(email.trim(), password);
        navigate('/citizen/welcome');
      } catch (err: any) {
        setLocalError(err.message || 'Failed to create citizen account.');
      }
    } else {
      try {
        await signIn(email.trim(), password);
        navigate('/citizen/welcome');
      } catch (err: any) {
        setLocalError(err.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
      navigate('/citizen/welcome');
    } catch (err: any) {
      setLocalError(err.message || 'Google sign in failed.');
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setLocalError('Please enter your email address to receive password reset link.');
      return;
    }
    setIsResetting(true);
    setLocalError(null);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-[#0F2018] flex flex-col justify-between selection:bg-emerald-600 selection:text-white relative">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[#D5E0D5] bg-white/80 backdrop-blur-xs flex items-center justify-between z-10 shadow-xs">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#2C4A3E] hover:text-[#0F2018] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-[#2C4A3E] font-medium">
          <Shield size={16} className="text-[#4A7C59]" />
          <span>Citizen Public Safety Portal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Branding */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#4A7C59] text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-950/20">
              <Shield size={28} />
            </div>
            <h1 className="text-2xl font-black text-[#0F2018] tracking-tight">
              {mode === 'register' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}
            </h1>
            <p className="text-xs text-[#2C4A3E] max-w-xs mx-auto font-medium">
              {mode === 'register'
                ? 'Join Landslide Watch to monitor local risk and receive instant alerts.'
                : 'Sign in to check safety conditions around your area.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl border border-[#C8D8BC] p-6 sm:p-8 shadow-sm space-y-5">
            {/* Google Sign-in Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">OR</span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Feedback messages */}
            {(localError || error) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{localError || error}</span>
              </div>
            )}

            {resetSent && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600" />
                <span>Password reset link sent to your email.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0F2018] mb-1">
                  Email / Gmail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-200 text-xs focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] focus:outline-none transition-all"
                  />
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2018] mb-1">
                  {mode === 'register' ? 'Create Password' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-3.5 py-2.5 pl-9 pr-9 rounded-xl border border-slate-200 text-xs focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] focus:outline-none transition-all"
                  />
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-[#0F2018] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-200 text-xs focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] focus:outline-none transition-all"
                    />
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResetting}
                    className="text-[11px] font-semibold text-[#4A7C59] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#4A7C59] hover:bg-[#3B6647] text-white font-bold text-xs tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Spinner size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{mode === 'register' ? 'CREATE ACCOUNT' : 'LOGIN'}</span>
                )}
              </button>
            </form>

            {/* Mode Switcher */}
            <div className="text-center pt-2 border-t border-slate-100">
              {mode === 'register' ? (
                <div className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLocalError(null);
                    }}
                    className="font-bold text-[#4A7C59] hover:underline ml-1"
                  >
                    LOGIN
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-600">
                  Need an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setLocalError(null);
                    }}
                    className="font-bold text-[#4A7C59] hover:underline ml-1"
                  >
                    CREATE YOUR ACCOUNT
                  </button>
                </div>
              )}
            </div>

            {/* FAST DEMO ACCESS BUTTON FOR HACKATHON JUDGES */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  demoCitizenLogin();
                  navigate('/citizen/welcome');
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#F5F0E8] hover:bg-[#EAE2D5] border border-[#C8D8BC] text-[#0F2018] text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>⚡ 1-Click Guest Citizen Entry (No Typing)</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
        Landslide Watch · Common Citizen Safety Network · Northeast India
      </footer>
    </div>
  );
}
