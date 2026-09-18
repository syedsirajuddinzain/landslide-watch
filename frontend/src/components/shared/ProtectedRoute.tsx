import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from './Badges';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  minRole?: UserRole;
}

const ROLE_LEVEL: Record<UserRole, number> = { citizen: 0, viewer: 1, authority: 2, admin: 3 };

export function ProtectedRoute({ children, minRole = 'viewer' }: Props) {
  const { user, role, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
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
      <div className="min-h-screen bg-[#0d151c] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#14222f] border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Restricted Operational Area</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your account ({user.email}) has the <span className="text-amber-300 font-semibold">{role.toUpperCase()}</span> role. This page requires authorized <span className="text-emerald-400 font-semibold">{minRole.toUpperCase()}</span> disaster management credentials.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/citizen"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
            >
              <ArrowLeft size={14} />
              <span>Return to Citizen Safety Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
