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

  const token = authHeader.substring(7);

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

  authenticate(req, res, next);
}
