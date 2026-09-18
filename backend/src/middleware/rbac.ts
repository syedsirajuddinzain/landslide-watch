import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  citizen: 0,
  viewer: 1,
  authority: 2,
  admin: 3,
};

export function requireRole(minimumRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as UserRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: `Access denied. Requires role: ${minimumRole}`,
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireAuthority = requireRole('authority');
export const requireViewer = requireRole('viewer');
