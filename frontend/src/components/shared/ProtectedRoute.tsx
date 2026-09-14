import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from './Badges';
import { UserRole } from '../../types';

interface Props {
  children: React.ReactNode;
  minRole?: UserRole;
}

const ROLE_LEVEL: Record<UserRole, number> = { citizen: 1, viewer: 1, authority: 2, admin: 3 };

export function ProtectedRoute({ children, minRole = 'viewer' }: Props) {
  const { user, role, initialized, demoLogin } = useAuthStore();

  useEffect(() => {
    // Auto-login as authority so anyone with the live link opens the dashboard immediately!
    if (!user) {
      demoLogin('authority');
    }
  }, [user, demoLogin]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <Spinner size={32} />
      </div>
    );
  }

  return <>{children}</>;
}
