import { getDb, COLLECTIONS } from '../config/firebase';
import { calculateRisk, RiskInputs } from './riskEngine';
import { checkAndGenerateAlert } from './alertEngine';
import { assessDataQuality } from '../utils/dataQuality';
import {
  Location, TerrainData, SoilData, LandCoverData, DrainageData,
  RainfallObservation, ForecastData, InfrastructureData,
  RiskAssessment, SystemSettings
} from '../types';
import { logger } from '../utils/logger';

const DEFAULT_SETTINGS: SystemSettings = {
  riskWeights: {
    rainfall: 0.35,
    slope: 0.25,
    soil: 0.15,
    landCover: 0.10,
    drainage: 0.10,
    historical: 0.05,
  },
  alertThresholds: { moderate: 40, high: 65, critical: 80 },
  ingestionIntervalMinutes: 30,
  demoMode: false,
  systemVersion: '1.0.0',
};

async function getSettings(db: FirebaseFirestore.Firestore): Promise<SystemSettings> {
  try {
    const snap = await db.collection(COLLECTIONS.SETTINGS).doc('global').get();
    if (snap.exists) return snap.data() as SystemSettings;
  } catch {}
  return DEFAULT_SETTINGS;
}

async function getLatestRainfall(
  db: FirebaseFirestore.Firestore,
  locationId: string
): Promise<RainfallObservation | null> {
  const snap = await db
    .collection(COLLECTIONS.RAINFALL)
    .where('locationId', '==', locationId)
    .get();

  if (snap.empty) return null;
  const docs = snap.docs.map(d => d.data() as RainfallObservation);
  docs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  return docs[0];
}

async function countHistoricalLandslides(
  db: FirebaseFirestore.Firestore,
  locationId: string
): Promise<number> {
  try {
    const snap = await db
      .collection(COLLECTIONS.HISTORICAL_LANDSLIDES)
      .where('nearbyLocations', 'array-contains-any', [])
      .get();
    // Use nearbyLocations field with locationId match
    const allSnap = await db.collection(COLLECTIONS.HISTORICAL_LANDSLIDES).get();
    let count = 0;
    for (const doc of allSnap.docs) {
      const data = doc.data();
      const nearby = data.nearbyLocations || [];
      if (nearby.some((n: { locationId: string; distanceKm: number }) => n.locationId === locationId)) {
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

async function getPreviousScore(
  db: FirebaseFirestore.Firestore,
  locationId: string
): Promise<number | undefined> {
  try {
    const snap = await db
      .collection(COLLECTIONS.RISK_ASSESSMENTS)
      .where('locationId', '==', locationId)
      .orderBy('timestamp', 'desc')
      .limit(2)
      .get();

    if (snap.docs.length >= 2) {
      const prev = snap.docs[1].data() as RiskAssessment;
      return prev.finalScore;
    }
  } catch {}
  return undefined;
}

export async function calculateRiskForLocation(
  locationId: string
): Promise<RiskAssessment | null> {
  const db = getDb();
  const settings = await getSettings(db);

  try {
    // Load all required data in parallel
    const [
      locationSnap,
      terrainSnap,
      soilSnap,
      landCoverSnap,
      drainageSnap,
      forecastSnap,
      infraSnap,
    ] = await Promise.all([
      db.collection(COLLECTIONS.LOCATIONS).doc(locationId).get(),
      db.collection(COLLECTIONS.TERRAIN).doc(locationId).get(),
      db.collection(COLLECTIONS.SOIL).doc(locationId).get(),
      db.collection(COLLECTIONS.LAND_COVER).doc(locationId).get(),
      db.collection(COLLECTIONS.DRAINAGE).doc(locationId).get(),
      db.collection(COLLECTIONS.FORECASTS).doc(locationId).get(),
      db.collection(COLLECTIONS.INFRASTRUCTURE).doc(locationId).get(),
    ]);

    if (!locationSnap.exists) {
      logger.warn(`Location ${locationId} not found`);
      return null;
    }

    const location = locationSnap.data() as Location;
    const terrain = terrainSnap.exists ? (terrainSnap.data() as TerrainData) : null;
    const soil = soilSnap.exists ? (soilSnap.data() as SoilData) : null;
    const landCover = landCoverSnap.exists ? (landCoverSnap.data() as LandCoverData) : null;
    const drainage = drainageSnap.exists ? (drainageSnap.data() as DrainageData) : null;
    const forecast = forecastSnap.exists ? (forecastSnap.data() as ForecastData) : null;
    const infra = infraSnap.exists ? (infraSnap.data() as InfrastructureData) : null;

    const rainfall = await getLatestRainfall(db, locationId);
    const historicalCount = await countHistoricalLandslides(db, locationId);
    const previousScore = await getPreviousScore(db, locationId);

    const inputs: RiskInputs = {
      locationId,
      locationName: location.name,
      district: location.district,
      state: location.state,
      // Rainfall (use 0 if missing, mark quality)
      rainfall_current_mmph: rainfall?.current_mmph ?? 0,
      rainfall_24h_mm: rainfall?.cumulative_24h_mm ?? 0,
      rainfall_72h_mm: rainfall?.cumulative_72h_mm ?? 0,
      forecast_6h_mm: forecast?.next6h_mm ?? 0,
      forecast_24h_mm: forecast?.next24h_mm ?? 0,
      // Terrain (use estimated defaults if missing)
      slope_deg: terrain?.avgSlope_deg ?? 15, // 15° = moderate default for NER
      // Soil
      soilSusceptibility: soil?.soilSusceptibility ?? 0.5,
      // Land cover
      landCoverSusceptibility: landCover?.landCoverSusceptibility ?? 0.5,
      // Drainage
      drainageProximityKm: drainage?.nearestRiver?.distanceKm ?? 2.0,
      // History
      historicalEventsNearby: historicalCount,
      // Impact factors
      population: location.population,
      roadCount: infra?.roads.length ?? 0,
      schoolCount: infra?.schools.length ?? 0,
      hospitalCount: infra?.hospitals.length ?? 0,
      bridgeCount: infra?.bridges.length ?? 0,
      // Data quality
      dataQuality: {
        rainfall: assessDataQuality(rainfall?.ingestedAt ?? null, 'rainfall'),
        terrain: assessDataQuality(terrain?.processedAt ?? null, 'terrain'),
        soil: assessDataQuality(soil?.fetchedAt ?? null, 'soil'),
        forecast: assessDataQuality(forecast?.generatedAt ?? null, 'forecast'),
      },
      isDemo: settings.demoMode,
      previousScore,
    };

    const assessment = calculateRisk(inputs, settings, forecast);
    const sanitizedData = JSON.parse(JSON.stringify(assessment));

    // Persist to Firestore
    await db.collection(COLLECTIONS.RISK_ASSESSMENTS).doc(assessment.id).set(sanitizedData);

    // Check and generate alert if needed
    await checkAndGenerateAlert(assessment, settings);

    return assessment;
  } catch (err: any) {
    logger.error(`Risk calculation failed for ${locationId}: ${err?.message || err}`, { stack: err?.stack });
    return null;
  }
}

export async function runRiskCalculationAllLocations(): Promise<{
  success: number;
  errors: string[];
}> {
  const db = getDb();
  const results = { success: 0, errors: [] as string[] };

  const locationsSnap = await db
    .collection(COLLECTIONS.LOCATIONS)
    .where('isActive', '==', true)
    .get();

  const locationIds = locationsSnap.docs.map((d) => d.id);
  logger.info(`Calculating risk for ${locationIds.length} locations`);

  // Process in small batches
  const BATCH = 5;
  for (let i = 0; i < locationIds.length; i += BATCH) {
    const batch = locationIds.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map((id) => calculateRiskForLocation(id))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      if (r.status === 'fulfilled' && r.value) {
        results.success++;
      } else {
        results.errors.push(`${batch[j]}: ${r.status === 'rejected' ? String(r.reason) : 'null result'}`);
      }
    }

    if (i + BATCH < locationIds.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

export { DEFAULT_SETTINGS, getSettings };
