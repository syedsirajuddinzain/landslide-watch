import { Router, Response } from 'express';
import { getDb, COLLECTIONS } from '../config/firebase';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { updateAlertStatus } from '../engine/alertEngine';
import { auditLog } from '../middleware/audit';
import { Alert } from '../types';

const router = Router();

// GET /api/alerts — list alerts with filters
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { status, locationId, riskLevel, limit = '50' } = req.query;

    let query = db.collection(COLLECTIONS.ALERTS).orderBy('createdAt', 'desc') as FirebaseFirestore.Query;

    if (status) query = query.where('status', '==', status);
    if (locationId) query = query.where('locationId', '==', locationId);
    if (riskLevel) query = query.where('riskLevel', '==', riskLevel);

    query = query.limit(parseInt(limit as string, 10));
    const snap = await query.get();

    res.json({ success: true, data: snap.docs.map((d) => d.data()), total: snap.size });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/active — unresolved alerts
router.get('/active', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db
      .collection(COLLECTIONS.ALERTS)
      .where('status', 'in', ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'])
      .get();
    const alerts = snap.docs.map((d) => d.data());
    alerts.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ success: true, data: alerts, total: alerts.length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch active alerts' });
  }
});

// GET /api/alerts/:id
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.ALERTS).doc(req.params.id).get();
    if (!snap.exists) { res.status(404).json({ success: false, error: 'Alert not found' }); return; }
    res.json({ success: true, data: snap.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch alert' });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') { res.status(403).json({ success: false, error: 'Insufficient permissions' }); return; }
  try {
    await updateAlertStatus(req.params.id, 'ACKNOWLEDGED', req.user!.uid, req.user!.email);
    await auditLog(req.user!.uid, req.user!.email, 'ACKNOWLEDGE_ALERT', 'alert', `Acknowledged alert ${req.params.id}`, req.params.id);
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

// PATCH /api/alerts/:id/investigate
router.patch('/:id/investigate', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') { res.status(403).json({ success: false, error: 'Insufficient permissions' }); return; }
  try {
    await updateAlertStatus(req.params.id, 'INVESTIGATING', req.user!.uid, req.user!.email);
    await auditLog(req.user!.uid, req.user!.email, 'INVESTIGATE_ALERT', 'alert', `Investigating alert ${req.params.id}`, req.params.id);
    res.json({ success: true, message: 'Alert under investigation' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update alert' });
  }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') { res.status(403).json({ success: false, error: 'Insufficient permissions' }); return; }
  const { resolutionNotes } = req.body;
  try {
    await updateAlertStatus(req.params.id, 'RESOLVED', req.user!.uid, req.user!.email, resolutionNotes);
    await auditLog(req.user!.uid, req.user!.email, 'RESOLVE_ALERT', 'alert', `Resolved alert ${req.params.id}: ${resolutionNotes || 'no notes'}`, req.params.id);
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
});

export default router;
