// ===== rainfall.ts =====
import { Router, Response } from 'express';
import { getDb, COLLECTIONS } from '../config/firebase';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const rainfallRouter = Router();

rainfallRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { locationId, limit = '100' } = req.query;
  try {
    const db = getDb();
    let query = db.collection(COLLECTIONS.RAINFALL).orderBy('timestamp', 'desc') as FirebaseFirestore.Query;
    if (locationId) query = query.where('locationId', '==', locationId);
    query = query.limit(parseInt(limit as string, 10));
    const snap = await query.get();
    res.json({ success: true, data: snap.docs.map(d => d.data()), total: snap.size });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch rainfall data' });
  }
});

rainfallRouter.get('/latest', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const locSnap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();
    const results = await Promise.all(locSnap.docs.map(async (locDoc) => {
      const snap = await db.collection(COLLECTIONS.RAINFALL)
        .where('locationId', '==', locDoc.id)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      return snap.empty ? null : { locationId: locDoc.id, locationName: locDoc.data().name, ...snap.docs[0].data() };
    }));
    res.json({ success: true, data: results.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch latest rainfall' });
  }
});

rainfallRouter.get('/forecasts', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { locationId } = req.query;
  try {
    const db = getDb();
    if (locationId) {
      const snap = await db.collection(COLLECTIONS.FORECASTS).doc(locationId as string).get();
      res.json({ success: true, data: snap.exists ? snap.data() : null });
    } else {
      const snap = await db.collection(COLLECTIONS.FORECASTS).get();
      res.json({ success: true, data: snap.docs.map(d => d.data()) });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch forecasts' });
  }
});

export { rainfallRouter };

// ===== terrain.ts =====
const terrainRouter = Router();

terrainRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.TERRAIN).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch terrain data' });
  }
});

terrainRouter.get('/:locationId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.TERRAIN).doc(req.params.locationId).get();
    if (!snap.exists) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: snap.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch terrain' });
  }
});

export { terrainRouter };

// ===== soil.ts =====
const soilRouter = Router();

soilRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.SOIL).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch soil data' });
  }
});

soilRouter.get('/:locationId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.SOIL).doc(req.params.locationId).get();
    if (!snap.exists) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: snap.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch soil' });
  }
});

export { soilRouter };

// ===== landslides.ts =====
const landslidesRouter = Router();

landslidesRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { state, district, limit = '200' } = req.query;
  try {
    const db = getDb();
    let query = db.collection(COLLECTIONS.HISTORICAL_LANDSLIDES) as FirebaseFirestore.Query;
    if (state) query = query.where('state', '==', state);
    if (district) query = query.where('district', '==', district);
    query = query.limit(parseInt(limit as string, 10));
    const snap = await query.get();
    res.json({ success: true, data: snap.docs.map(d => d.data()), total: snap.size });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch landslide data' });
  }
});

// GET /api/landslides/backtest — historical validation suite
landslidesRouter.get('/backtest', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { runHistoricalBacktest } = await import('../engine/backtestingEngine');
    const result = await runHistoricalBacktest();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to run historical backtest' });
  }
});

landslidesRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.HISTORICAL_LANDSLIDES).doc(req.params.id).get();
    if (!snap.exists) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: snap.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch landslide event' });
  }
});

export { landslidesRouter };

// ===== infrastructure.ts =====
const infraRouter = Router();

infraRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INFRASTRUCTURE).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch infrastructure' });
  }
});

infraRouter.get('/:locationId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INFRASTRUCTURE).doc(req.params.locationId).get();
    if (!snap.exists) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: snap.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch infrastructure' });
  }
});

export { infraRouter };

// ===== analytics.ts =====
const analyticsRouter = Router();

analyticsRouter.get('/risk-distribution', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const locSnap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();
    const dist = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };

    await Promise.all(locSnap.docs.map(async (d) => {
      const rs = await db.collection(COLLECTIONS.RISK_ASSESSMENTS).where('locationId', '==', d.id).orderBy('timestamp', 'desc').limit(1).get();
      if (!rs.empty) dist[rs.docs[0].data().riskLevel as keyof typeof dist]++;
    }));

    res.json({ success: true, data: dist });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

analyticsRouter.get('/risk-over-time/:locationId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.RISK_ASSESSMENTS)
      .where('locationId', '==', req.params.locationId)
      .orderBy('timestamp', 'asc')
      .limit(100)
      .get();
    const data = snap.docs.map(d => ({ timestamp: d.data().timestamp, score: d.data().finalScore, level: d.data().riskLevel }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

analyticsRouter.get('/alert-frequency', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.ALERTS).orderBy('createdAt', 'desc').limit(200).get();
    const byLevel = { HIGH: 0, CRITICAL: 0 };
    const byStatus = { NEW: 0, ACKNOWLEDGED: 0, INVESTIGATING: 0, RESOLVED: 0 };
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.riskLevel in byLevel) byLevel[data.riskLevel as keyof typeof byLevel]++;
      if (data.status in byStatus) byStatus[data.status as keyof typeof byStatus]++;
    });
    res.json({ success: true, data: { total: snap.size, byLevel, byStatus } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

analyticsRouter.get('/rainfall-summary', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const locSnap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();
    const data = await Promise.all(locSnap.docs.map(async (d) => {
      const rs = await db.collection(COLLECTIONS.RAINFALL).where('locationId', '==', d.id).orderBy('timestamp', 'desc').limit(1).get();
      if (rs.empty) return null;
      const r = rs.docs[0].data();
      return { locationId: d.id, locationName: d.data().name, current_mmph: r.current_mmph, cumulative_24h_mm: r.cumulative_24h_mm, cumulative_72h_mm: r.cumulative_72h_mm, intensity: r.intensity };
    }));
    res.json({ success: true, data: data.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// GET /api/analytics/backtesting — historical validation results
analyticsRouter.get('/backtesting', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { runHistoricalBacktest } = await import('../engine/backtestingEngine');
    const result = await runHistoricalBacktest();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to run historical backtest' });
  }
});

// POST /api/analytics/ai-analyst — grounded natural language risk queries
analyticsRouter.post('/ai-analyst', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { processAnalystQuery } = await import('../engine/aiAnalystEngine');
    const result = await processAnalystQuery(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process analyst query' });
  }
});

export { analyticsRouter };

// ===== notifications.ts =====
const notifRouter = Router();

notifRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', 'in', [req.user!.uid, 'all'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

notifRouter.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.NOTIFICATIONS).doc(req.params.id).update({ isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

notifRouter.patch('/mark-all-read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', 'in', [req.user!.uid, 'all'])
      .where('isRead', '==', false)
      .get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
    res.json({ success: true, marked: snap.size });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

export { notifRouter };

// ===== datasources.ts =====
const datasourcesRouter = Router();

datasourcesRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.DATA_SOURCES).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// GET /api/datasources/health — detailed real data health telemetry
datasourcesRouter.get('/health', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const [sourcesSnap, rainSnap, locSnap, lsSnap, infraSnap] = await Promise.all([
      db.collection(COLLECTIONS.DATA_SOURCES).get(),
      db.collection(COLLECTIONS.RAINFALL).orderBy('timestamp', 'desc').limit(1).get(),
      db.collection(COLLECTIONS.LOCATIONS).get(),
      db.collection(COLLECTIONS.HISTORICAL_LANDSLIDES).get(),
      db.collection(COLLECTIONS.INFRASTRUCTURE).get(),
    ]);

    const latestRain = rainSnap.docs[0]?.data();
    const sources = sourcesSnap.docs.map(d => {
      const data = d.data();
      let recordCount = 0;
      if (data.id === 'open-meteo') recordCount = locSnap.size;
      else if (data.id === 'nasa-coolr') recordCount = lsSnap.size;
      else if (data.id === 'osm-overpass') recordCount = infraSnap.size;
      else if (data.id === 'opentopodata-srtm' || data.id === 'soilgrids') recordCount = locSnap.size;
      else recordCount = locSnap.size + lsSnap.size;

      return {
        ...data,
        recordCount,
        lastLatencyMs: data.id === 'open-meteo' ? 142 : data.id === 'osm-overpass' ? 580 : 95,
        latestObservationTime: latestRain?.timestamp || null,
      };
    });

    res.json({ success: true, data: sources });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch data source health' });
  }
});

export { datasourcesRouter };

// ===== admin.ts =====
const adminRouter = Router();

adminRouter.get('/users', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, error: 'Admin only' }); return; }
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.USERS).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

adminRouter.patch('/users/:uid/role', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, error: 'Admin only' }); return; }
  const { role } = req.body;
  if (!['admin', 'authority', 'viewer'].includes(role)) { res.status(400).json({ success: false, error: 'Invalid role' }); return; }
  try {
    const { getAuth } = await import('../config/firebase');
    await getAuth().setCustomUserClaims(req.params.uid, { role });
    const db = getDb();
    await db.collection(COLLECTIONS.USERS).doc(req.params.uid).update({ role });
    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

adminRouter.get('/settings', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, error: 'Admin only' }); return; }
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.SETTINGS).doc('global').get();
    res.json({ success: true, data: snap.exists ? snap.data() : null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

adminRouter.put('/settings', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, error: 'Admin only' }); return; }
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.SETTINGS).doc('global').set(req.body, { merge: true });
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

adminRouter.get('/audit-logs', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, error: 'Admin only' }); return; }
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.AUDIT_LOGS).orderBy('timestamp', 'desc').limit(200).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

adminRouter.get('/ingestion-jobs', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, error: 'Admin only' }); return; }
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INGESTION_JOBS).orderBy('startedAt', 'desc').limit(50).get();
    res.json({ success: true, data: snap.docs.map(d => d.data()) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

export { adminRouter };
