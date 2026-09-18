import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, COLLECTIONS } from '../config/firebase';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireAuthority } from '../middleware/rbac';
import { auditLog } from '../middleware/audit';
import { ResponseAction, FieldVerification } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// ==========================================
// RESPONSE ACTIONS
// ==========================================

// GET /api/response/actions
router.get('/actions', authenticate, requireAuthority, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { locationId, status, priority, limit = '100' } = req.query;

    let query = db.collection(COLLECTIONS.RESPONSE_ACTIONS).orderBy('createdAt', 'desc') as FirebaseFirestore.Query;

    if (locationId) query = query.where('locationId', '==', locationId);
    if (status) query = query.where('status', '==', status);
    if (priority) query = query.where('priority', '==', priority);

    query = query.limit(parseInt(limit as string, 10));
    const snap = await query.get();

    const actions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ResponseAction[];
    res.json({ success: true, data: actions, total: snap.size });
  } catch (err) {
    logger.error('Failed to fetch response actions', { error: err });
    res.status(500).json({ success: false, error: 'Failed to fetch response actions' });
  }
});

// POST /api/response/actions
router.post('/actions', authenticate, requireAuthority, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const { alertId, locationId, locationName, district, title, description, priority, assignedTeam, assignedToEmail, notes } = req.body;

  if (!locationId || !title || !priority || !assignedTeam) {
    res.status(400).json({ success: false, error: 'locationId, title, priority, and assignedTeam required' });
    return;
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const actionId = uuidv4();

    const action: ResponseAction = {
      id: actionId,
      alertId,
      locationId,
      locationName: locationName || 'Unknown Location',
      district: district || 'NER',
      title,
      description: description || '',
      priority,
      assignedTeam,
      assignedToEmail: assignedToEmail || req.user!.email,
      status: 'PENDING',
      createdAt: now,
      createdBy: req.user!.email,
      updatedAt: now,
      notes: notes || '',
    };

    await db.collection(COLLECTIONS.RESPONSE_ACTIONS).doc(actionId).set(action);

    await auditLog(
      req.user!.uid,
      req.user!.email,
      'CREATE_RESPONSE_ACTION',
      'response_action',
      `Created response action "${title}" for ${locationName} [Priority: ${priority}, Team: ${assignedTeam}]`,
      actionId
    );

    res.json({ success: true, data: action });
  } catch (err) {
    logger.error('Failed to create response action', { error: err });
    res.status(500).json({ success: false, error: 'Failed to create response action' });
  }
});

// PATCH /api/response/actions/:id
router.patch('/actions/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const { status, notes, assignedTeam } = req.body;
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const docRef = db.collection(COLLECTIONS.RESPONSE_ACTIONS).doc(req.params.id);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    const updates: Partial<ResponseAction> & Record<string, unknown> = {
      updatedAt: now,
    };

    if (status) {
      updates.status = status;
      if (status === 'COMPLETED') {
        updates.completedAt = now;
      }
    }
    if (notes !== undefined) updates.notes = notes;
    if (assignedTeam) updates.assignedTeam = assignedTeam;

    await docRef.update(updates);

    await auditLog(
      req.user!.uid,
      req.user!.email,
      'UPDATE_RESPONSE_ACTION',
      'response_action',
      `Updated action ${req.params.id} -> Status: ${status || snap.data()?.status}`,
      req.params.id
    );

    res.json({ success: true, message: 'Action updated successfully' });
  } catch (err) {
    logger.error(`Failed to update response action ${req.params.id}`, { error: err });
    res.status(500).json({ success: false, error: 'Failed to update response action' });
  }
});

// ==========================================
// FIELD VERIFICATIONS
// ==========================================

// GET /api/response/field-verifications
router.get('/field-verifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { locationId, status, limit = '100' } = req.query;

    let query = db.collection(COLLECTIONS.FIELD_VERIFICATIONS).orderBy('timestamp', 'desc') as FirebaseFirestore.Query;

    if (locationId) query = query.where('locationId', '==', locationId);
    if (status) query = query.where('status', '==', status);

    query = query.limit(parseInt(limit as string, 10));
    const snap = await query.get();

    const verifications = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FieldVerification[];
    res.json({ success: true, data: verifications, total: snap.size });
  } catch (err) {
    logger.error('Failed to fetch field verifications', { error: err });
    res.status(500).json({ success: false, error: 'Failed to fetch field verifications' });
  }
});

// POST /api/response/field-verifications
router.post('/field-verifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const { alertId, locationId, locationName, district, status, observations, hazardConfirmed, evidenceNotes, coordinates } = req.body;

  if (!locationId || !status || !observations) {
    res.status(400).json({ success: false, error: 'locationId, status, and observations required' });
    return;
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const verifId = uuidv4();

    const verification: FieldVerification = {
      id: verifId,
      alertId,
      locationId,
      locationName: locationName || 'Unknown Location',
      district: district || 'NER',
      status,
      observations,
      hazardConfirmed: Boolean(hazardConfirmed),
      evidenceNotes: evidenceNotes || '',
      inspectorName: req.user!.email.split('@')[0],
      inspectorEmail: req.user!.email,
      timestamp: now,
      coordinates,
    };

    await db.collection(COLLECTIONS.FIELD_VERIFICATIONS).doc(verifId).set(verification);

    // If an alert was associated, update alert status to INVESTIGATING or RESOLVED depending on verification
    if (alertId) {
      const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
      const alertSnap = await alertRef.get();
      if (alertSnap.exists) {
        if (status === 'FALSE_ALARM') {
          await alertRef.update({
            status: 'RESOLVED',
            resolvedAt: now,
            resolvedBy: req.user!.email,
            resolutionNotes: `Resolved following field verification: False Alarm. Observations: ${observations}`,
          });
        } else if (status === 'VERIFIED' || status === 'CONFIRMED_HAZARD') {
          await alertRef.update({
            status: 'INVESTIGATING',
            investigatedAt: now,
            investigatedBy: req.user!.email,
          });
        }
      }
    }

    await auditLog(
      req.user!.uid,
      req.user!.email,
      'FIELD_VERIFICATION_LOGGED',
      'field_verification',
      `Logged field inspection for ${locationName} [Status: ${status}, Hazard Confirmed: ${hazardConfirmed}]`,
      verifId
    );

    res.json({ success: true, data: verification });
  } catch (err) {
    logger.error('Failed to log field verification', { error: err });
    res.status(500).json({ success: false, error: 'Failed to log field verification' });
  }
});

// GET /api/response/citizen-reports
router.get('/citizen-reports', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.CITIZEN_REPORTS).orderBy('createdAt', 'desc').limit(50).get();
    if (!snap.empty) {
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json({ success: true, data: reports });
      return;
    }
    // Fallback demo reports if collection not seeded
    res.json({
      success: true,
      data: [
        {
          id: 'rep-init-01',
          userName: 'Lalhmingthanga',
          userPhone: '+91 98623 44102',
          coordinates: { lat: 23.7385, lon: 92.7145 },
          locationName: 'Ramhlun South Ridge, Aizawl',
          nearestCatchmentId: 'aizawl',
          nearestCatchmentName: 'Aizawl Catchment',
          distanceToCatchmentKm: 1.1,
          observationType: 'GROUND_CRACKS',
          description: 'Fresh 2-inch tension cracks opened across the hillside footpath following yesterday heavy downpour.',
          photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
          status: 'SUBMITTED',
          createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
        },
        {
          id: 'rep-init-02',
          userName: 'Kevichüsa',
          userPhone: '+91 94360 88219',
          coordinates: { lat: 25.6751, lon: 94.1086 },
          locationName: 'Sanuorü Bypass Road, Kohima',
          nearestCatchmentId: 'kohima',
          nearestCatchmentName: 'Kohima Catchment',
          distanceToCatchmentKm: 2.4,
          observationType: 'FALLING_ROCKS',
          description: 'Boulders and loose shale sliding onto the highway outer lane.',
          status: 'UNDER_REVIEW',
          createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        },
      ],
    });
  } catch (err) {
    logger.error('Failed to fetch citizen reports for response center', { error: err });
    res.status(500).json({ success: false, error: 'Failed to fetch citizen reports' });
  }
});

export default router;

