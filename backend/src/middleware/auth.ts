import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7).trim();

  // Support local development and demo bearer tokens
  if (token.startsWith('demo-')) {
    if (token.includes('admin')) {
      req.user = { uid: 'demo-admin-id', email: 'admin@landslidewatch.gov.in', role: 'admin' };
    } else if (token.includes('authority') || token.includes('officer')) {
      req.user = { uid: 'demo-authority-officer-id', email: 'authority@landslidewatch.gov.in', role: 'authority' };
    } else if (token.includes('citizen') || token.includes('google')) {
      req.user = { uid: 'demo-citizen-id', email: 'citizen@landslidewatch.in', role: 'citizen' };
    } else {
      req.user = { uid: 'demo-viewer-id', email: 'viewer@landslidewatch.in', role: 'viewer' };
    }
    next();
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: (decoded.role as string) || 'viewer',
    };

    next();
  } catch (err) {
    logger.warn('Token verification failed', { error: err });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7).trim();
  if (token.startsWith('demo-')) {
    if (token.includes('admin')) {
      req.user = { uid: 'demo-admin-id', email: 'admin@landslidewatch.gov.in', role: 'admin' };
    } else if (token.includes('authority') || token.includes('officer')) {
      req.user = { uid: 'demo-authority-officer-id', email: 'authority@landslidewatch.gov.in', role: 'authority' };
    } else if (token.includes('citizen') || token.includes('google')) {
      req.user = { uid: 'demo-citizen-id', email: 'citizen@landslidewatch.in', role: 'citizen' };
    } else {
      req.user = { uid: 'demo-viewer-id', email: 'viewer@landslidewatch.in', role: 'viewer' };
    }
    next();
    return;
  }

  getAuth()
    .verifyIdToken(token)
    .then((decoded) => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || '',
        role: (decoded.role as string) || 'viewer',
      };
      next();
    })
    .catch(() => {
      // For optionalAuth, continue as unauthenticated on error
      next();
    });
}
