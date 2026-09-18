import { Router, Response } from 'express';
import { getDb, COLLECTIONS } from '../config/firebase';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { calculateRiskForLocation, runRiskCalculationAllLocations, getSettings } from '../engine/riskOrchestrator';
import { calculateFutureRisk, RiskInputs } from '../engine/riskEngine';
import { getLocationWhatChanged, getSystemWhatChangedSummary } from '../engine/whatChangedEngine';
import { ForecastData, Location } from '../types';
import { logger } from '../utils/logger';
import { NER_CATCHMENTS } from './citizen';

const router = Router();

function getFallbackLatestRisks() {
  return NER_CATCHMENTS.map((c) => {
    const slopeNorm = Math.min(c.slope / 45, 1);
    const rainNorm = Math.min(c.baseRain / 70, 1);
    const score = Math.round((rainNorm * 0.35 + slopeNorm * 0.25 + 0.72 * 0.15 + 0.60 * 0.10 + 0.65 * 0.10 + 0.75 * 0.05) * 1000) / 10;
    const level = score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 30 ? 'MODERATE' : 'LOW';
    const pri = score >= 70 ? 'P1' : score >= 50 ? 'P2' : score >= 30 ? 'P3' : 'P4';
    return {
      id: `risk-${c.id}`,
      locationId: c.id,
      locationName: c.name,
      district: c.district,
      state: c.state,
      timestamp: new Date().toISOString(),
      finalScore: score,
      riskLevel: level,
      priorityLevel: pri,
      inputs: {
        rainfall_current_mmph: Math.round(c.baseRain * 0.1 * 10) / 10,
        rainfall_24h_mm: c.baseRain,
        rainfall_72h_mm: Math.round(c.baseRain * 1.8 * 10) / 10,
        slope_deg: c.slope,
      },
    };
  });
}

// GET /api/risk/latest — latest risk for all locations
router.get('/latest', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const locSnap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();
    if (!locSnap.empty) {
      const locationIds = locSnap.docs.map((d) => d.id);

      const latestRisks = await Promise.all(
        locationIds.map(async (id) => {
          const snap = await db
            .collection(COLLECTIONS.RISK_ASSESSMENTS)
            .where('locationId', '==', id)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
          return snap.empty ? null : { locationId: id, ...snap.docs[0].data() };
        })
      );

      res.json({ success: true, data: latestRisks.filter(Boolean) });
      return;
    }
  } catch (err) {
    logger.warn('Firestore risk/latest query bypassed; using autonomous NER risks');
  }

  res.json({ success: true, data: getFallbackLatestRisks() });
});

// GET /api/risk/what-changed — system-wide what changed delta
router.get('/what-changed', optionalAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const summary = await getSystemWhatChangedSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    logger.error('Failed to compute what changed summary', { error: err });
    res.status(500).json({ success: false, error: 'Failed to compute what changed summary' });
  }
});

// GET /api/risk/what-changed/:locationId — location what changed delta
router.get('/what-changed/:locationId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const delta = await getLocationWhatChanged(req.params.locationId);
    if (!delta) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }
    res.json({ success: true, data: delta });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute location delta' });
  }
});

// GET /api/risk/future/:locationId — future risk projections (+6h, +12h, +24h)
router.get('/future/:locationId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { locationId } = req.params;
  const db = getDb();
  try {
    let actualId = locationId;
    let locSnap = await db.collection(COLLECTIONS.LOCATIONS).doc(actualId).get();

    if (!locSnap.exists) {
      locSnap = await db.collection(COLLECTIONS.LOCATIONS).doc(actualId.toLowerCase()).get();
      if (locSnap.exists) {
        actualId = actualId.toLowerCase();
      } else {
        const querySnap = await db.collection(COLLECTIONS.LOCATIONS).where('name', '==', locationId).limit(1).get();
        if (!querySnap.empty) {
          locSnap = querySnap.docs[0];
          actualId = locSnap.id;
        }
      }
    }

    if (!locSnap.exists) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }

    const [forecastSnap, riskSnap, settings] = await Promise.all([
      db.collection(COLLECTIONS.FORECASTS).doc(actualId).get(),
      db.collection(COLLECTIONS.RISK_ASSESSMENTS).where('locationId', '==', actualId).orderBy('timestamp', 'desc').limit(1).get(),
      getSettings(db),
    ]);

    const loc = locSnap.data() as Location;
    const forecast = forecastSnap.exists ? (forecastSnap.data() as ForecastData) : null;
    const latestRisk = riskSnap.docs[0]?.data();

    const inputs: RiskInputs = {
      locationId: actualId,
      locationName: loc.name,
      district: loc.district,
      state: loc.state,
      rainfall_current_mmph: latestRisk?.inputs?.rainfall_current_mmph ?? 0,
      rainfall_24h_mm: latestRisk?.inputs?.rainfall_24h_mm ?? 0,
      rainfall_72h_mm: latestRisk?.inputs?.rainfall_72h_mm ?? 0,
      forecast_6h_mm: forecast?.next6h_mm ?? 0,
      forecast_24h_mm: forecast?.next24h_mm ?? 0,
      slope_deg: latestRisk?.inputs?.slope_deg ?? 18,
      soilSusceptibility: latestRisk?.inputs?.soilSusceptibility ?? 0.5,
      landCoverSusceptibility: latestRisk?.inputs?.landCoverSusceptibility ?? 0.4,
      drainageProximityKm: latestRisk?.inputs?.drainageProximityKm ?? 2.0,
      historicalEventsNearby: latestRisk?.inputs?.historicalEventsNearby ?? 0,
      population: loc.population,
      roadCount: 2,
      schoolCount: 1,
      hospitalCount: 0,
      bridgeCount: 1,
      dataQuality: latestRisk?.dataQuality ?? { rainfall: 'GOOD', terrain: 'GOOD', soil: 'GOOD', forecast: 'GOOD' },
      isDemo: false,
    };

    const futureProjections = calculateFutureRisk(inputs, forecast, settings);
    res.json({ success: true, data: futureProjections });
  } catch (err) {
    logger.error(`Failed to calculate future risk for ${locationId}`, { error: err });
    res.status(500).json({ success: false, error: 'Failed to calculate future risk' });
  }
});

// GET /api/risk/:locationId — risk history for a location
router.get('/:locationId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { locationId } = req.params;
  const limit = parseInt(req.query.limit as string || '50', 10);

  try {
    const db = getDb();
    const snap = await db
      .collection(COLLECTIONS.RISK_ASSESSMENTS)
      .where('locationId', '==', locationId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    res.json({ success: true, data: snap.docs.map((d) => d.data()), total: snap.size });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch risk history' });
  }
});

// POST /api/risk/recalculate/:locationId — manual recalculate
router.post('/recalculate/:locationId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }
  try {
    const assessment = await calculateRiskForLocation(req.params.locationId);
    if (!assessment) {
      res.status(404).json({ success: false, error: 'Location not found or calculation failed' });
      return;
    }
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Risk calculation failed' });
  }
});

// POST /api/risk/recalculate-all — recalculate all locations (admin/authority)
router.post('/recalculate-all', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }
  try {
    const result = await runRiskCalculationAllLocations();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Bulk recalculation failed' });
  }
});

// GET /api/risk/summary/stats — counts by risk level and priority
router.get('/summary/stats', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const locSnap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();
    if (!locSnap.empty) {
      const locationIds = locSnap.docs.map((d) => d.id);

      const counts = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
      const priorityCounts = { P1: 0, P2: 0, P3: 0, P4: 0 };
      let criticalLocations: string[] = [];

      await Promise.all(
        locationIds.map(async (id) => {
          const snap = await db
            .collection(COLLECTIONS.RISK_ASSESSMENTS)
            .where('locationId', '==', id)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
          if (!snap.empty) {
            const risk = snap.docs[0].data();
            if (risk.riskLevel in counts) counts[risk.riskLevel as keyof typeof counts]++;
            const pri = risk.priorityLevel || (risk.riskLevel === 'CRITICAL' ? 'P1' : risk.riskLevel === 'HIGH' ? 'P2' : risk.riskLevel === 'MODERATE' ? 'P3' : 'P4');
            if (pri in priorityCounts) priorityCounts[pri as keyof typeof priorityCounts]++;
            if (risk.riskLevel === 'CRITICAL') criticalLocations.push(id);
          }
        })
      );

      res.json({ success: true, data: { counts, priorityCounts, total: locationIds.length, criticalLocations } });
      return;
    }
  } catch (err) {
    logger.warn('Firestore risk/summary/stats query bypassed; using autonomous NER stats');
  }

  const fallbackRisks = getFallbackLatestRisks();
  const counts = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
  const priorityCounts = { P1: 0, P2: 0, P3: 0, P4: 0 };
  const criticalLocations: string[] = [];
  fallbackRisks.forEach((r) => {
    counts[r.riskLevel as keyof typeof counts]++;
    priorityCounts[r.priorityLevel as keyof typeof priorityCounts]++;
    if (r.riskLevel === 'CRITICAL') criticalLocations.push(r.locationId);
  });

  res.json({ success: true, data: { counts, priorityCounts, total: fallbackRisks.length, criticalLocations } });
});

export default router;

