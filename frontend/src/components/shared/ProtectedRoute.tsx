import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from './Badges';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft, LogIn, LogOut } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  minRole?: UserRole;
}

const ROLE_LEVEL: Record<UserRole, number> = { citizen: 0, viewer: 1, authority: 2, admin: 3 };

export function ProtectedRoute({ children, minRole = 'viewer' }: Props) {
  const { user, role, initialized, signOut } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F0E8]">
        <Spinner size={32} />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (minRole === 'authority' || minRole === 'admin') {
      return <Navigate to="/authority/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Role check
  const userLevel = ROLE_LEVEL[role] ?? 0;
  const requiredLevel = ROLE_LEVEL[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] text-[#0F2018] flex items-center justify-center p-4 relative selection:bg-[#4A7C59] selection:text-white">
        {/* Background ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-[#4A7C59]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full p-8 rounded-3xl bg-white border-2 border-[#C8D8BC] text-center space-y-5 shadow-lg relative z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              Operational Clearance Required
            </span>
            <h2 className="text-xl font-black text-[#0F2018] tracking-tight">
              Restricted Operational Area
            </h2>
            <p className="text-xs text-[#1A3028]/85 leading-relaxed max-w-sm mx-auto">
              Your account (<span className="font-semibold text-[#0F2018]">{user.email}</span>) is signed in with the{' '}
              <span className="px-1.5 py-0.5 rounded font-bold bg-[#C8D8BC]/60 text-[#0F2018] uppercase text-[10px] tracking-wide">
                {role}
              </span>{' '}
              role. This command area requires authorized{' '}
              <span className="px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase text-[10px] tracking-wide">
                {minRole}
              </span>{' '}
              disaster management credentials.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              to={role === 'citizen' ? '/citizen' : '/'}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white text-xs font-bold transition-all shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>{role === 'citizen' ? 'Citizen Dashboard' : 'Return Home'}</span>
            </Link>

            <Link
              to="/authority/login"
              className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-white hover:bg-[#F5F0E8] text-[#1A3028] border border-[#C8D8BC] text-xs font-bold transition-all"
            >
              <LogIn size={14} />
              <span>Authority Login</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-[#C8D8BC]/40">
            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A3028]/60 hover:text-red-700 transition-colors"
            >
              <LogOut size={12} />
              <span>Sign out / Switch account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
