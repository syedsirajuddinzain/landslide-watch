import { Router, Response } from 'express';
import { getDb, COLLECTIONS } from '../config/firebase';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { calculateRiskForLocation } from '../engine/riskOrchestrator';
import { fetchAndStoreOSMForLocation } from '../ingestion/osmIngestion';
import { fetchTerrainFromGIS, fetchSoilFromGIS, fetchLandCoverFromGIS } from '../gis/pythonBridge';
import { auditLog } from '../middleware/audit';
import { Location } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/locations — list all active locations with latest risk
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();
    const locations = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Location[];

    // Fetch latest risk assessment for each location (in-memory sort avoids composite index requirement)
    const withRisk = await Promise.all(
      locations.map(async (loc) => {
        try {
          const riskSnap = await db
            .collection(COLLECTIONS.RISK_ASSESSMENTS)
            .where('locationId', '==', loc.id)
            .get();

          let latestRisk = null;
          if (!riskSnap.empty) {
            const risks = riskSnap.docs.map((d) => d.data());
            risks.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            latestRisk = risks[0];
          }

          // If no risk document exists in Firestore, calculate on the fly
          if (!latestRisk) {
            latestRisk = await calculateRiskForLocation(loc.id).catch(() => null);
          }

          return { ...loc, latestRisk };
        } catch {
          return { ...loc, latestRisk: null };
        }
      })
    );

    res.json({ success: true, data: withRisk, total: withRisk.length });
  } catch (err) {
    logger.error('Failed to list locations', { error: err });
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

// GET /api/locations/:id — single location with full detail
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const db = getDb();

    let actualId = id;
    let locSnap = await db.collection(COLLECTIONS.LOCATIONS).doc(actualId).get();

    if (!locSnap.exists) {
      locSnap = await db.collection(COLLECTIONS.LOCATIONS).doc(actualId.toLowerCase()).get();
      if (locSnap.exists) {
        actualId = actualId.toLowerCase();
      } else {
        const querySnap = await db.collection(COLLECTIONS.LOCATIONS).where('name', '==', id).limit(1).get();
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

    const [terrainSnap, soilSnap, lcSnap, drainSnap, infraSnap, forecastSnap] =
      await Promise.all([
        db.collection(COLLECTIONS.TERRAIN).doc(actualId).get(),
        db.collection(COLLECTIONS.SOIL).doc(actualId).get(),
        db.collection(COLLECTIONS.LAND_COVER).doc(actualId).get(),
        db.collection(COLLECTIONS.DRAINAGE).doc(actualId).get(),
        db.collection(COLLECTIONS.INFRASTRUCTURE).doc(actualId).get(),
        db.collection(COLLECTIONS.FORECASTS).doc(actualId).get(),
      ]);

    // Latest rainfall (in-memory sort to avoid Firestore composite index requirement)
    const rainfallSnap = await db
      .collection(COLLECTIONS.RAINFALL)
      .where('locationId', '==', actualId)
      .get();
    const sortedRain = rainfallSnap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Latest risk assessments (in-memory sort)
    const riskSnap = await db
      .collection(COLLECTIONS.RISK_ASSESSMENTS)
      .where('locationId', '==', actualId)
      .get();
    const sortedRisk = riskSnap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Historical landslides nearby
    const allLandslides = await db.collection(COLLECTIONS.HISTORICAL_LANDSLIDES).get();
    const nearbyLandslides = allLandslides.docs
      .map((d) => d.data())
      .filter((d) =>
        (d.nearbyLocations || []).some(
          (n: { locationId: string }) => n.locationId === actualId
        )
      );

    // Active alerts (in-memory sort)
    const alertsSnap = await db
      .collection(COLLECTIONS.ALERTS)
      .where('locationId', '==', actualId)
      .get();
    const sortedAlerts = alertsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: {
        location: { id: locSnap.id, ...locSnap.data() },
        terrain: terrainSnap.exists ? terrainSnap.data() : null,
        soil: soilSnap.exists ? soilSnap.data() : null,
        landCover: lcSnap.exists ? lcSnap.data() : null,
        drainage: drainSnap.exists ? drainSnap.data() : null,
        infrastructure: infraSnap.exists ? infraSnap.data() : null,
        forecast: forecastSnap.exists ? forecastSnap.data() : null,
        latestRainfall: sortedRain.length > 0 ? sortedRain[0] : null,
        riskHistory: sortedRisk.slice(0, 10),
        latestRisk: sortedRisk.length > 0 ? sortedRisk[0] : null,
        nearbyLandslides,
        alerts: sortedAlerts.slice(0, 10),
      },
    });
  } catch (err) {
    logger.error('Failed to fetch location detail', { error: err, id });
    res.status(500).json({ success: false, error: 'Failed to fetch location detail' });
  }
});

// POST /api/locations — add a new location (admin only)
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin only' });
    return;
  }

  const { name, district, state, coordinates, population } = req.body;
  if (!name || !district || !state || !coordinates?.lat || !coordinates?.lon) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  try {
    const db = getDb();
    const locationRef = db.collection(COLLECTIONS.LOCATIONS).doc();
    const location: Location = {
      id: locationRef.id,
      name,
      district,
      state,
      country: 'India',
      coordinates,
      population: population || 0,
      isActive: true,
      addedAt: new Date().toISOString(),
      addedBy: req.user!.email,
    };

    await locationRef.set(location);

    // Kick off static data fetch asynchronously
    (async () => {
      try {
        
        const [terrain, soil, landCover] = await Promise.all([
          fetchTerrainFromGIS(location.id, coordinates.lat, coordinates.lon),
          fetchSoilFromGIS(location.id, coordinates.lat, coordinates.lon),
          fetchLandCoverFromGIS(location.id, coordinates.lat, coordinates.lon),
        ]);

        const batch = db.batch();
        if (terrain) batch.set(db.collection(COLLECTIONS.TERRAIN).doc(location.id), terrain);
        if (soil) batch.set(db.collection(COLLECTIONS.SOIL).doc(location.id), soil);
        if (landCover) batch.set(db.collection(COLLECTIONS.LAND_COVER).doc(location.id), landCover);
        await batch.commit();

        await fetchAndStoreOSMForLocation(location.id, coordinates.lat, coordinates.lon);
        await calculateRiskForLocation(location.id);

        logger.info(`Static data initialized for new location: ${name}`);
      } catch (e) {
        logger.error(`Static data init failed for ${name}`, { error: e });
      }
    })();

    await auditLog(req.user!.uid, req.user!.email, 'CREATE_LOCATION', 'location', `Added ${name}`, location.id);
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    logger.error('Failed to create location', { error: err });
    res.status(500).json({ success: false, error: 'Failed to create location' });
  }
});

// DELETE /api/locations/:id (admin only — soft delete)
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin only' });
    return;
  }
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.LOCATIONS).doc(req.params.id).update({ isActive: false });
    await auditLog(req.user!.uid, req.user!.email, 'DEACTIVATE_LOCATION', 'location', `Deactivated ${req.params.id}`, req.params.id);
    res.json({ success: true, message: 'Location deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to deactivate location' });
  }
});

export default router;

// Export fetchTerrainFromOpenTopoData for use in other files

