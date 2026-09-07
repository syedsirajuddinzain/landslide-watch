import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, COLLECTIONS } from '../config/firebase';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { calculateRisk } from '../engine/riskEngine';
import { checkAndGenerateAlert } from '../engine/alertEngine';
import { getSettings } from '../engine/riskOrchestrator';
import { assessDataQuality } from '../utils/dataQuality';
import { logger } from '../utils/logger';

const router = Router();

interface SimStep {
  step: number;
  label: string;
  rainfall_current_mmph: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  forecast_6h_mm: number;
  forecast_24h_mm: number;
  delayMs: number;
}

const SIMULATION_STEPS: SimStep[] = [
  { step: 1, label: 'Baseline Conditions', rainfall_current_mmph: 2, rainfall_24h_mm: 15, rainfall_72h_mm: 35, forecast_6h_mm: 5, forecast_24h_mm: 20, delayMs: 0 },
  { step: 2, label: 'Rainfall Begins Increasing', rainfall_current_mmph: 6, rainfall_24h_mm: 40, rainfall_72h_mm: 65, forecast_6h_mm: 15, forecast_24h_mm: 45, delayMs: 2000 },
  { step: 3, label: 'Moderate Rainfall Event', rainfall_current_mmph: 9, rainfall_24h_mm: 65, rainfall_72h_mm: 95, forecast_6h_mm: 22, forecast_24h_mm: 70, delayMs: 2000 },
  { step: 4, label: 'Heavy Rainfall — Risk Rising', rainfall_current_mmph: 14, rainfall_24h_mm: 90, rainfall_72h_mm: 145, forecast_6h_mm: 28, forecast_24h_mm: 85, delayMs: 2000 },
  { step: 5, label: 'Extreme Rainfall — Critical Threshold', rainfall_current_mmph: 22, rainfall_24h_mm: 130, rainfall_72h_mm: 215, forecast_6h_mm: 35, forecast_24h_mm: 110, delayMs: 2000 },
];

// POST /api/simulation/run — runs the full 5-step simulation for a location
router.post('/run', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role === 'viewer') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const { locationId } = req.body;
  if (!locationId) {
    res.status(400).json({ success: false, error: 'locationId required' });
    return;
  }

  const db = getDb();

  try {
    // Load location and static data
    const [locSnap, terrainSnap, soilSnap, lcSnap, drainSnap, infraSnap] = await Promise.all([
      db.collection(COLLECTIONS.LOCATIONS).doc(locationId).get(),
      db.collection(COLLECTIONS.TERRAIN).doc(locationId).get(),
      db.collection(COLLECTIONS.SOIL).doc(locationId).get(),
      db.collection(COLLECTIONS.LAND_COVER).doc(locationId).get(),
      db.collection(COLLECTIONS.DRAINAGE).doc(locationId).get(),
      db.collection(COLLECTIONS.INFRASTRUCTURE).doc(locationId).get(),
    ]);

    if (!locSnap.exists) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }

    const location = locSnap.data()!;
    const terrain = terrainSnap.exists ? terrainSnap.data()! : null;
    const soil = soilSnap.exists ? soilSnap.data()! : null;
    const landCover = lcSnap.exists ? lcSnap.data()! : null;
    const drainage = drainSnap.exists ? drainSnap.data()! : null;
    const infra = infraSnap.exists ? infraSnap.data()! : null;

    const settings = await getSettings(db);

    // Count historical landslides
    const allLsSnap = await db.collection(COLLECTIONS.HISTORICAL_LANDSLIDES).get();
    let historicalCount = 0;
    for (const doc of allLsSnap.docs) {
      const d = doc.data();
      if ((d.nearbyLocations || []).some((n: { locationId: string }) => n.locationId === locationId)) {
        historicalCount++;
      }
    }

    // Run each simulation step through the actual risk engine
    const results = [];
    let previousScore: number | undefined = undefined;

    for (const step of SIMULATION_STEPS) {
      const inputs = {
        locationId,
        locationName: location.name,
        district: location.district,
        state: location.state,
        rainfall_current_mmph: step.rainfall_current_mmph,
        rainfall_24h_mm: step.rainfall_24h_mm,
        rainfall_72h_mm: step.rainfall_72h_mm,
        forecast_6h_mm: step.forecast_6h_mm,
        forecast_24h_mm: step.forecast_24h_mm,
        slope_deg: terrain?.avgSlope_deg ?? 18,
        soilSusceptibility: soil?.soilSusceptibility ?? 0.5,
        landCoverSusceptibility: landCover?.landCoverSusceptibility ?? 0.5,
        drainageProximityKm: drainage?.nearestRiver?.distanceKm ?? 1.5,
        historicalEventsNearby: historicalCount,
        population: location.population || 2500,
        roadCount: infra?.roads?.length ?? 2,
        schoolCount: infra?.schools?.length ?? 1,
        hospitalCount: infra?.hospitals?.length ?? 0,
        bridgeCount: infra?.bridges?.length ?? 1,
        dataQuality: {
          rainfall: 'SIMULATED' as const,
          terrain: terrain ? 'GOOD' as const : 'ESTIMATED' as const,
          soil: soil ? 'GOOD' as const : 'ESTIMATED' as const,
          forecast: 'SIMULATED' as const,
        },
        isDemo: true,
        previousScore,
      };

      const assessment = calculateRisk(inputs, settings);
      previousScore = assessment.finalScore;

      // Persist each step to Firestore (with demo flag)
      await db.collection(COLLECTIONS.RISK_ASSESSMENTS).doc(assessment.id).set(assessment);

      // Store simulated rainfall observation
      const rainfallObs = {
        id: uuidv4(),
        locationId,
        timestamp: new Date().toISOString(),
        current_mmph: step.rainfall_current_mmph,
        intensity: step.rainfall_current_mmph >= 20 ? 'extreme' : step.rainfall_current_mmph >= 7.5 ? 'heavy' : 'moderate',
        cumulative_24h_mm: step.rainfall_24h_mm,
        cumulative_72h_mm: step.rainfall_72h_mm,
        source: 'SIMULATION',
        qualityFlag: 'SIMULATED',
        ingestedAt: new Date().toISOString(),
      };
      await db.collection(COLLECTIONS.RAINFALL).doc(`${locationId}_sim_${step.step}`).set(rainfallObs);

      // Check for alert
      const alert = await checkAndGenerateAlert(assessment, settings);

      results.push({
        step: step.step,
        label: step.label,
        delayMs: step.delayMs,
        rainfall: {
          current_mmph: step.rainfall_current_mmph,
          cumulative_24h_mm: step.rainfall_24h_mm,
          cumulative_72h_mm: step.rainfall_72h_mm,
          forecast_24h_mm: step.forecast_24h_mm,
        },
        assessment,
        alertGenerated: alert ? { id: alert.id, riskLevel: alert.riskLevel } : null,
      });
    }

    logger.info(`Simulation completed for ${location.name} — ${results.length} steps`);

    res.json({
      success: true,
      data: {
        locationId,
        locationName: location.name,
        district: location.district,
        steps: results,
        summary: {
          startRiskLevel: results[0]?.assessment.riskLevel,
          endRiskLevel: results[results.length - 1]?.assessment.riskLevel,
          alertsGenerated: results.filter((r) => r.alertGenerated).length,
          peakScore: Math.max(...results.map((r) => r.assessment.finalScore)),
        },
      },
    });
  } catch (err) {
    logger.error('Simulation failed', { error: err });
    res.status(500).json({ success: false, error: 'Simulation failed' });
  }
});

// POST /api/simulation/reset/:locationId — clear simulation data
router.post('/reset/:locationId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin only' });
    return;
  }
  const db = getDb();
  const { locationId } = req.params;

  try {
    // Delete simulated rainfall
    for (let i = 1; i <= 5; i++) {
      await db.collection(COLLECTIONS.RAINFALL).doc(`${locationId}_sim_${i}`).delete();
    }

    // Delete demo risk assessments for this location
    const demoRisks = await db
      .collection(COLLECTIONS.RISK_ASSESSMENTS)
      .where('locationId', '==', locationId)
      .where('isDemo', '==', true)
      .get();
    const batch = db.batch();
    demoRisks.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    res.json({ success: true, message: 'Simulation data cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

export default router;
