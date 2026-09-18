import { getDb, COLLECTIONS } from '../config/firebase';
import { WhatChangedDelta, SystemWhatChangedSummary, RiskAssessment, RainfallObservation, Location } from '../types';

export async function getLocationWhatChanged(locationId: string): Promise<WhatChangedDelta | null> {
  const db = getDb();

  const locDoc = await db.collection(COLLECTIONS.LOCATIONS).doc(locationId).get();
  if (!locDoc.exists) return null;
  const loc = locDoc.data() as Location;

  let riskDocs: RiskAssessment[] = [];
  let rainDocs: RainfallObservation[] = [];

  try {
    const [riskSnap, rainSnap] = await Promise.all([
      db.collection(COLLECTIONS.RISK_ASSESSMENTS).where('locationId', '==', locationId).get(),
      db.collection(COLLECTIONS.RAINFALL).where('locationId', '==', locationId).get(),
    ]);

    riskDocs = riskSnap.docs
      .map((d) => d.data() as RiskAssessment)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    rainDocs = rainSnap.docs
      .map((d) => d.data() as RainfallObservation)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    // Graceful fallback
  }

  const currentRisk = riskDocs[0];
  const previousRisk = riskDocs[1];

  const currentRain = rainDocs[0];
  const previousRain = rainDocs[1];

  const curScore = currentRisk?.finalScore ?? 0;
  const prevScore = previousRisk?.finalScore ?? curScore;
  const scoreDelta = Math.round((curScore - prevScore) * 10) / 10;

  const curLevel = currentRisk?.riskLevel ?? 'LOW';
  const prevLevel = previousRisk?.riskLevel ?? curLevel;

  const curRain24 = currentRain?.cumulative_24h_mm ?? (currentRisk?.inputs.rainfall_24h_mm ?? 0);
  const prevRain24 = previousRain?.cumulative_24h_mm ?? (previousRisk?.inputs.rainfall_24h_mm ?? curRain24);
  const rainDelta = Math.round((curRain24 - prevRain24) * 10) / 10;

  let primaryCause = 'Environmental conditions remained stable over the latest observation cycle.';
  if (scoreDelta > 3) {
    primaryCause = `Risk score increased by +${scoreDelta.toFixed(1)} points primarily due to ${
      rainDelta > 0 ? `a 24-hour rainfall surge of +${rainDelta.toFixed(1)} mm (now ${curRain24.toFixed(1)} mm)` : 'elevated forecasted precipitation and soil saturation'
    }.`;
  } else if (scoreDelta < -3) {
    primaryCause = `Risk score subsided by ${Math.abs(scoreDelta).toFixed(1)} points as antecedent moisture drained and rainfall decreased from ${prevRain24.toFixed(1)} mm to ${curRain24.toFixed(1)} mm.`;
  }

  return {
    locationId,
    locationName: loc.name,
    district: loc.district,
    previousTimestamp: previousRisk?.timestamp ?? null,
    currentTimestamp: currentRisk?.timestamp ?? new Date().toISOString(),
    previousScore: prevScore,
    currentScore: curScore,
    scoreDelta,
    previousLevel: prevLevel,
    currentLevel: curLevel,
    levelChanged: prevLevel !== curLevel,
    rainfall24hDelta: rainDelta,
    previousRainfall24h: prevRain24,
    currentRainfall24h: curRain24,
    primaryCause,
    isEscalation: scoreDelta > 0 || (prevLevel !== 'CRITICAL' && curLevel === 'CRITICAL'),
  };
}

export async function getSystemWhatChangedSummary(): Promise<SystemWhatChangedSummary> {
  const db = getDb();
  const locsSnap = await db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get();

  const deltas: WhatChangedDelta[] = [];
  for (const doc of locsSnap.docs) {
    const delta = await getLocationWhatChanged(doc.id);
    if (delta) deltas.push(delta);
  }

  const escalatedLocations = deltas.filter((d) => d.scoreDelta > 2).sort((a, b) => b.scoreDelta - a.scoreDelta);
  const deescalatedLocations = deltas.filter((d) => d.scoreDelta < -2).sort((a, b) => a.scoreDelta - b.scoreDelta);

  const newCriticalAlerts = deltas.filter(
    (d) => d.levelChanged && d.currentLevel === 'CRITICAL'
  ).length;
  const newHighAlerts = deltas.filter(
    (d) => d.levelChanged && d.currentLevel === 'HIGH'
  ).length;

  const totalScoreDelta = deltas.reduce((sum, d) => sum + d.scoreDelta, 0);
  const meanRiskDelta = deltas.length > 0 ? Math.round((totalScoreDelta / deltas.length) * 10) / 10 : 0;

  return {
    timestamp: new Date().toISOString(),
    totalLocations: deltas.length,
    escalatedLocations,
    deescalatedLocations,
    newCriticalAlerts,
    newHighAlerts,
    meanRiskDelta,
    topSurges: escalatedLocations.slice(0, 5),
  };
}
