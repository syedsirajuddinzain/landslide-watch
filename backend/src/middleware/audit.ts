import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, COLLECTIONS } from '../config/firebase';
import { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

export async function auditLog(
  userId: string,
  userEmail: string,
  action: string,
  targetType: string,
  details: string,
  targetId?: string
): Promise<void> {
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      id: uuidv4(),
      action,
      userId,
      userEmail,
      targetType,
      targetId: targetId || null,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to write audit log', { error: err, action });
  }
}

// Middleware that auto-logs write operations
export function auditMiddleware(action: string, targetType: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400 && req.user) {
        auditLog(
          req.user.uid,
          req.user.email,
          action,
          targetType,
          `${req.method} ${req.originalUrl}`,
        ).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
