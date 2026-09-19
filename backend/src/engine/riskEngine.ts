import { v4 as uuidv4 } from 'uuid';
import {
  RiskLevel,
  PriorityLevel,
  Trend,
  RiskAssessment,
  RiskComponentScores,
  RiskExplanationFactor,
  FutureRiskForecast,
  FutureRiskHorizon,
  ForecastData,
  DataQuality,
  SystemSettings,
} from '../types';

// ============================================================
// RISK ENGINE v2.0 (SIH26001 NER)
// Scientific disclaimer: thresholds and weights require local
// calibration and validation before operational deployment.
// This is a decision-support tool, not a certified warning system.
// Risk Score ≠ Landslide Probability
// ============================================================

export const MODEL_VERSION = '2.0.0';

export interface RiskInputs {
  locationId: string;
  locationName: string;
  district: string;
  state: string;
  // Rainfall
  rainfall_current_mmph: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  forecast_6h_mm: number;
  forecast_12h_mm?: number;
  forecast_24h_mm: number;
  forecast_36h_mm?: number;
  forecast_48h_mm?: number;
  // Terrain
  slope_deg: number;
  // Soil
  soilSusceptibility: number; // 0-1
  // Land cover
  landCoverSusceptibility: number; // 0-1
  // Hydrology
  drainageProximityKm: number;
  // History
  historicalEventsNearby: number; // count within 25km
  // Impact factors
  population: number;
  roadCount: number;
  schoolCount: number;
  hospitalCount: number;
  bridgeCount: number;
  // Data quality
  dataQuality: Record<string, DataQuality>;
  // Demo flag
  isDemo: boolean;
  // Previous assessment score for trend calculation
  previousScore?: number;
}

export interface RiskWeights {
  rainfall: number;
  slope: number;
  soil: number;
  landCover: number;
  drainage: number;
  historical: number;
}

export const DEFAULT_WEIGHTS: RiskWeights = {
  rainfall: 0.35,
  slope: 0.25,
  soil: 0.15,
  landCover: 0.10,
  drainage: 0.10,
  historical: 0.05,
};

// ---- Normalization functions ----

/**
 * Normalize rainfall into a 0-1 score.
 * Uses a weighted combination of current, 24h, 72h, and forecast.
 */
export function normalizeRainfall(
  current_mmph: number,
  rainfall_24h_mm: number,
  rainfall_72h_mm: number,
  forecast_6h_mm: number,
  forecast_24h_mm: number
): number {
  // Thresholds (mm/h for current, mm for cumulative)
  const currentScore = Math.min(current_mmph / 20, 1);        // >20mm/h → extreme
  const h24Score = Math.min(rainfall_24h_mm / 100, 1);        // >100mm/24h → extreme
  const h72Score = Math.min(rainfall_72h_mm / 200, 1);        // >200mm/72h → extreme
  const fc6Score = Math.min(forecast_6h_mm / 30, 1);          // >30mm forecast → high
  const fc24Score = Math.min(forecast_24h_mm / 80, 1);        // >80mm forecast → high

  // Weighted combination: observed weighs more than forecast
  const score =
    0.25 * currentScore +
    0.30 * h24Score +
    0.25 * h72Score +
    0.10 * fc6Score +
    0.10 * fc24Score;

  return Math.min(score, 1);
}

/**
 * Normalize slope angle (degrees) to 0-1 susceptibility.
 * Literature: <5°: very low, 5-15°: low, 15-25°: moderate, 25-35°: high, >35°: very high
 */
export function normalizeSlope(slope_deg: number): number {
  if (slope_deg <= 5) return slope_deg / 25;
  if (slope_deg <= 15) return 0.2 + (slope_deg - 5) / 25;
  if (slope_deg <= 25) return 0.6 + (slope_deg - 15) / 40;
  if (slope_deg <= 35) return 0.85 + (slope_deg - 25) / 67;
  return 1.0;
}

/**
 * Normalize drainage proximity to 0-1.
 * Closer to drainage channels = higher saturation & pore-pressure susceptibility.
 */
export function normalizeDrainage(distanceKm: number): number {
  if (distanceKm <= 0.1) return 1.0;
  if (distanceKm <= 0.5) return 0.9;
  if (distanceKm <= 1.0) return 0.7;
  if (distanceKm <= 2.0) return 0.5;
  if (distanceKm <= 5.0) return 0.3;
  return Math.max(0, 0.3 - (distanceKm - 5) / 20);
}

/**
 * Normalize historical events count within 25km radius to 0-1.
 */
export function normalizeHistorical(eventCount: number): number {
  return Math.min(eventCount / 5, 1);
}

// ---- Hazard Score ----

export function calculateHazardScore(
  componentScores: RiskComponentScores,
  weights: RiskWeights
): number {
  const score =
    weights.rainfall * componentScores.rainfall +
    weights.slope * componentScores.slope +
    weights.soil * componentScores.soil +
    weights.landCover * componentScores.landCover +
    weights.drainage * componentScores.drainage +
    weights.historical * componentScores.historical;

  return Math.round(score * 100 * 10) / 10; // 0-100, 1 decimal
}

// ---- Impact Score (Exposure) ----

export function calculateImpactScore(
  population: number,
  roadCount: number,
  schoolCount: number,
  hospitalCount: number,
  bridgeCount: number
): number {
  // Population: normalize to 0-1 (10,000+ = max exposure score)
  const popScore = Math.min(population / 10000, 1);

  // Critical infrastructure weighted score
  const infraScore = Math.min(
    (roadCount * 0.3 + schoolCount * 1.5 + hospitalCount * 2.0 + bridgeCount * 1.0) / 15,
    1
  );

  // Population 60%, Infrastructure 40%
  const combined = 0.6 * popScore + 0.4 * infraScore;
  return Math.round(combined * 100 * 10) / 10;
}

// ---- Operational Priority Score (Hazard + Exposure) ----

export function scoreToPriorityLevel(
  hazardScore: number,
  impactScore: number,
  finalScore: number
): PriorityLevel {
  if (finalScore >= 70 || (hazardScore >= 60 && impactScore >= 30) || hazardScore >= 75) {
    return 'P1';
  }
  if (finalScore >= 50 || (hazardScore >= 45 && impactScore >= 20) || hazardScore >= 60) {
    return 'P2';
  }
  if (finalScore >= 35 || hazardScore >= 35) {
    return 'P3';
  }
  // P4: Routine
  return 'P4';
}

// ---- Risk Level ----

export function scoreToRiskLevel(
  score: number,
  thresholds: SystemSettings['alertThresholds']
): RiskLevel {
  if (score >= thresholds.critical) return 'CRITICAL';
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.moderate) return 'MODERATE';
  return 'LOW';
}

// ---- Trend ----

export function calculateTrend(current: number, previous?: number): { trend: Trend; trendPct: number } {
  if (previous === undefined || previous === 0) return { trend: 'STABLE', trendPct: 0 };

  const changePct = ((current - previous) / previous) * 100;

  if (changePct > 5) return { trend: 'RISING', trendPct: Math.round(changePct) };
  if (changePct < -5) return { trend: 'FALLING', trendPct: Math.round(Math.abs(changePct)) };
  return { trend: 'STABLE', trendPct: Math.round(Math.abs(changePct)) };
}

// ---- Explainability Engine ----

export function generateExplanation(
  componentScores: RiskComponentScores,
  weights: RiskWeights,
  inputs: RiskInputs
): RiskExplanationFactor[] {
  const rainfallPts = Math.round(componentScores.rainfall * weights.rainfall * 100);
  const slopePts = Math.round(componentScores.slope * weights.slope * 100);
  const soilPts = Math.round(componentScores.soil * weights.soil * 100);
  const lcPts = Math.round(componentScores.landCover * weights.landCover * 100);
  const drainPts = Math.round(componentScores.drainage * weights.drainage * 100);
  const histPts = Math.round(componentScores.historical * weights.historical * 100);

  const factors: RiskExplanationFactor[] = [
    {
      factor: 'Rainfall Saturation & Forecast',
      value: `24h: ${inputs.rainfall_24h_mm.toFixed(1)}mm | 72h: ${inputs.rainfall_72h_mm.toFixed(1)}mm | Forecast 24h: ${inputs.forecast_24h_mm.toFixed(1)}mm`,
      contribution: rainfallPts,
      label: componentScores.rainfall > 0.66 ? 'HIGH' : componentScores.rainfall > 0.33 ? 'MODERATE' : 'LOW',
      detailDescription: `Current 24h observed rainfall (${inputs.rainfall_24h_mm.toFixed(1)} mm) and forecasted precipitation (${inputs.forecast_24h_mm.toFixed(1)} mm) contribute ${rainfallPts} points to the hazard assessment.`,
    },
    {
      factor: 'Terrain Slope Steepness',
      value: `Average slope: ${inputs.slope_deg.toFixed(1)}°`,
      contribution: slopePts,
      label: componentScores.slope > 0.66 ? 'HIGH' : componentScores.slope > 0.33 ? 'MODERATE' : 'LOW',
      detailDescription: `Terrain gradient of ${inputs.slope_deg.toFixed(1)}° from SRTM DEM yields a slope susceptibility factor contributing ${slopePts} points.`,
    },
    {
      factor: 'Geotechnical Soil Properties',
      value: `Susceptibility index: ${(inputs.soilSusceptibility * 100).toFixed(0)}%`,
      contribution: soilPts,
      label: componentScores.soil > 0.66 ? 'HIGH' : componentScores.soil > 0.33 ? 'MODERATE' : 'LOW',
      detailDescription: `ISRIC SoilGrids clay fraction and bulk density determine soil shear strength reduction under wet conditions (+${soilPts} points).`,
    },
    {
      factor: 'Land Cover & Vegetation Cohesion',
      value: `Land cover susceptibility: ${(inputs.landCoverSusceptibility * 100).toFixed(0)}%`,
      contribution: lcPts,
      label: componentScores.landCover > 0.66 ? 'HIGH' : componentScores.landCover > 0.33 ? 'MODERATE' : 'LOW',
      detailDescription: `Vegetation root cohesion and land surface coverage contribute ${lcPts} points to the slope stability index.`,
    },
    {
      factor: 'Hydrological Drainage Proximity',
      value: `${inputs.drainageProximityKm.toFixed(2)} km to drainage channel`,
      contribution: drainPts,
      label: componentScores.drainage > 0.66 ? 'HIGH' : componentScores.drainage > 0.33 ? 'MODERATE' : 'LOW',
      detailDescription: `Proximity to watercourse (${inputs.drainageProximityKm.toFixed(2)} km) increases toe-erosion and saturation potential (+${drainPts} points).`,
    },
    {
      factor: 'Historical Landslide Proximity (25km)',
      value: `${inputs.historicalEventsNearby} recorded landslide events nearby`,
      contribution: histPts,
      label: componentScores.historical > 0.66 ? 'HIGH' : componentScores.historical > 0.33 ? 'MODERATE' : 'LOW',
      detailDescription: `Geological history of ${inputs.historicalEventsNearby} documented landslide events within 25km radius adds ${histPts} points baseline hazard weight.`,
    },
  ];

  // Sort by contribution descending
  return factors.sort((a, b) => b.contribution - a.contribution);
}

// ---- Recommendations Engine ----

export function generateRecommendations(
  riskLevel: RiskLevel,
  priorityLevel: PriorityLevel,
  inputs: RiskInputs
): string[] {
  const base: string[] = [
    'Continuous telemetry monitoring of precipitation via Open-Meteo.',
    'Verify data freshness and ensure telemetry sensors are reporting normally.',
  ];

  if (priorityLevel === 'P4' && riskLevel === 'LOW') {
    return [
      ...base,
      'Standard seasonal monitoring protocol active.',
      'Routine slope stability inspection during scheduled rounds.',
    ];
  }

  if (priorityLevel === 'P3' || riskLevel === 'MODERATE') {
    return [
      ...base,
      'Increase sensor polling and automated assessment frequency for this location.',
      'Alert local PWD and district disaster management authority (DDMA) liaison.',
      'Review condition of hillside drainage culverts and road embankments.',
      `Monitor potential exposure of ${inputs.population.toLocaleString()} residents in the catchment zone.`,
    ];
  }

  if (priorityLevel === 'P2' || riskLevel === 'HIGH') {
    return [
      'HIGH OPERATIONAL PRIORITY: Dispatch field engineering team for on-site visual survey.',
      'Alert State Disaster Management Authority (SDMA) and District Collector.',
      `Inspect critical infrastructure: ${inputs.roadCount} road corridors, ${inputs.bridgeCount} bridges, and ${inputs.schoolCount + inputs.hospitalCount} community structures.`,
      'Pre-position clearance heavy machinery (excavators, earthmovers) near vulnerable road cuts.',
      'Issue precautionary weather-hazard advisories to transport operators and schools.',
      'Review and verify designated emergency evacuation routes.',
      ...base,
    ];
  }

  if (priorityLevel === 'P1' || riskLevel === 'CRITICAL') {
    return [
      'P1 CRITICAL IMMEDIATE ATTENTION: Immediate field verification required before issuing public alerts.',
      'Activate District Emergency Operations Center (DEOC) for coordinate emergency management.',
      `Ensure safety protocols for ~${inputs.population.toLocaleString()} potentially exposed residents.`,
      `Priority safety assessment on ${inputs.hospitalCount} medical facilities and ${inputs.schoolCount} educational institutions.`,
      'Coordinate standby status with SDRF / NDRF battalions for rapid deployment if verified.',
      'Implement traffic management or temporary diversions along vulnerable high-slope road segments.',
      'Identify mobility-impaired individuals and vulnerable households for prioritized support if evacuation becomes necessary.',
      ...base,
    ];
  }

  return base;
}

// ---- Future Risk Estimation Engine (+6h, +12h, +24h) ----

export function calculateFutureRisk(
  inputs: RiskInputs,
  forecast: ForecastData | null,
  settings: SystemSettings
): FutureRiskForecast {
  const weights = settings.riskWeights;

  // Extract forecast rainfalls from hourly array if available
  const hourly = forecast?.hourly || [];
  const rainNext6h = forecast?.next6h_mm ?? (hourly.slice(0, 6).reduce((s, h) => s + h.precipitation_mm, 0) || inputs.forecast_6h_mm);
  const rainNext12h = forecast?.next12h_mm ?? (hourly.slice(0, 12).reduce((s, h) => s + h.precipitation_mm, 0) || (inputs.forecast_6h_mm + (inputs.forecast_24h_mm - inputs.forecast_6h_mm) * 0.4));
  const rainNext24h = forecast?.next24h_mm ?? (hourly.slice(0, 24).reduce((s, h) => s + h.precipitation_mm, 0) || inputs.forecast_24h_mm);
  const rainNext36h = (forecast as any)?.next36h_mm ?? (hourly.slice(0, 36).reduce((s, h) => s + h.precipitation_mm, 0) || (rainNext24h + (rainNext24h * 0.4)));
  const rainNext48h = (forecast as any)?.next48h_mm ?? (hourly.slice(0, 48).reduce((s, h) => s + h.precipitation_mm, 0) || (rainNext24h * 1.6));

  const currentImpact = calculateImpactScore(
    inputs.population,
    inputs.roadCount,
    inputs.schoolCount,
    inputs.hospitalCount,
    inputs.bridgeCount
  );

  const evaluateHorizon = (horizonHours: number, label: string, projectedAccum24h: number, projectedAccum72h: number, projectedFc24h: number): FutureRiskHorizon => {
    const rainfallScore = normalizeRainfall(
      Math.min(projectedAccum24h / 6, 25),
      projectedAccum24h,
      projectedAccum72h,
      Math.max(0, projectedFc24h * 0.3),
      projectedFc24h
    );

    const compScores: RiskComponentScores = {
      rainfall: rainfallScore,
      slope: normalizeSlope(inputs.slope_deg),
      soil: inputs.soilSusceptibility,
      landCover: inputs.landCoverSusceptibility,
      drainage: normalizeDrainage(inputs.drainageProximityKm),
      historical: normalizeHistorical(inputs.historicalEventsNearby),
    };

    const hazardScore = calculateHazardScore(compScores, weights);
    const finalScore = Math.round((0.7 * hazardScore + 0.3 * currentImpact) * 10) / 10;
    const estimatedRiskLevel = scoreToRiskLevel(finalScore, settings.alertThresholds);
    const estimatedPriority = scoreToPriorityLevel(hazardScore, currentImpact, finalScore);

    const primaryDrivers: string[] = [];
    if (rainfallScore > 0.5) primaryDrivers.push(`Projected ${horizonHours}h precipitation (${projectedAccum24h.toFixed(1)} mm)`);
    if (compScores.slope > 0.6) primaryDrivers.push(`Steep terrain (${inputs.slope_deg.toFixed(1)}°)`);
    if (compScores.soil > 0.6) primaryDrivers.push(`High soil moisture susceptibility (${(inputs.soilSusceptibility * 100).toFixed(0)}%)`);

    const precipForHorizon =
      horizonHours === 6 ? rainNext6h :
      horizonHours === 12 ? rainNext12h :
      horizonHours === 24 ? rainNext24h :
      horizonHours === 36 ? rainNext36h :
      rainNext48h;

    return {
      horizonHours,
      label,
      forecastPrecipitation_mm: Math.round(precipForHorizon * 10) / 10,
      estimatedHazardScore: hazardScore,
      estimatedFinalScore: finalScore,
      estimatedRiskLevel,
      estimatedPriority,
      primaryDrivers: primaryDrivers.length > 0 ? primaryDrivers : ['Stable environmental baseline'],
    };
  };

  const plus6h = evaluateHorizon(6, '+6 Hours', inputs.rainfall_24h_mm * 0.8 + rainNext6h, inputs.rainfall_72h_mm + rainNext6h, Math.max(0, rainNext24h - rainNext6h));
  const plus12h = evaluateHorizon(12, '+12 Hours', inputs.rainfall_24h_mm * 0.6 + rainNext12h, inputs.rainfall_72h_mm + rainNext12h, Math.max(0, rainNext24h - rainNext12h));
  const plus24h = evaluateHorizon(24, '+24 Hours', rainNext24h, inputs.rainfall_72h_mm * 0.6 + rainNext24h, Math.max(0, inputs.forecast_24h_mm * 0.8));
  const plus36h = evaluateHorizon(36, '+36 Hours', inputs.rainfall_24h_mm * 0.2 + (rainNext36h - rainNext12h), inputs.rainfall_72h_mm * 0.4 + rainNext36h, Math.max(0, rainNext48h - rainNext36h));
  const plus48h = evaluateHorizon(48, '+48 Hours', rainNext48h - rainNext24h, inputs.rainfall_72h_mm * 0.2 + rainNext48h, Math.max(0, (rainNext48h - rainNext24h) * 0.5));

  // Current score for comparison
  const currentRainScore = normalizeRainfall(inputs.rainfall_current_mmph, inputs.rainfall_24h_mm, inputs.rainfall_72h_mm, inputs.forecast_6h_mm, inputs.forecast_24h_mm);
  const currentHazard = calculateHazardScore({
    rainfall: currentRainScore,
    slope: normalizeSlope(inputs.slope_deg),
    soil: inputs.soilSusceptibility,
    landCover: inputs.landCoverSusceptibility,
    drainage: normalizeDrainage(inputs.drainageProximityKm),
    historical: normalizeHistorical(inputs.historicalEventsNearby),
  }, weights);
  const currentFinal = Math.round((0.7 * currentHazard + 0.3 * currentImpact) * 10) / 10;
  const currentLevel = scoreToRiskLevel(currentFinal, settings.alertThresholds);

  return {
    locationId: inputs.locationId,
    locationName: inputs.locationName,
    generatedAt: new Date().toISOString(),
    currentRiskScore: currentFinal,
    currentRiskLevel: currentLevel,
    horizons: {
      plus6h,
      plus12h,
      plus24h,
      plus36h,
      plus48h,
    },
    forecastConfidence: hourly.length >= 48 ? 'HIGH' : hourly.length >= 24 ? 'MODERATE' : 'LOW',
    scientificNote: 'Future risk is estimated using numerical weather prediction from Open-Meteo and configured static geotechnical parameters. These values are decision-support projections and do not constitute deterministic landslide forecasts.',
  };
}

// ---- Main calculation function ----

export function calculateRisk(
  inputs: RiskInputs,
  settings: SystemSettings,
  forecast?: ForecastData | null
): RiskAssessment {
  const weights = settings.riskWeights;

  // Normalize each component
  const rainfallScore = normalizeRainfall(
    inputs.rainfall_current_mmph,
    inputs.rainfall_24h_mm,
    inputs.rainfall_72h_mm,
    inputs.forecast_6h_mm,
    inputs.forecast_24h_mm
  );

  const slopeScore = normalizeSlope(inputs.slope_deg);
  const soilScore = inputs.soilSusceptibility;
  const landCoverScore = inputs.landCoverSusceptibility;
  const drainageScore = normalizeDrainage(inputs.drainageProximityKm);
  const historicalScore = normalizeHistorical(inputs.historicalEventsNearby);

  const componentScores: RiskComponentScores = {
    rainfall: rainfallScore,
    slope: slopeScore,
    soil: soilScore,
    landCover: landCoverScore,
    drainage: drainageScore,
    historical: historicalScore,
  };

  const hazardScore = calculateHazardScore(componentScores, weights);
  const impactScore = calculateImpactScore(
    inputs.population,
    inputs.roadCount,
    inputs.schoolCount,
    inputs.hospitalCount,
    inputs.bridgeCount
  );

  // Operational priority: 70% hazard + 30% impact
  const finalScore = Math.round((0.7 * hazardScore + 0.3 * impactScore) * 10) / 10;

  const riskLevel = scoreToRiskLevel(finalScore, settings.alertThresholds);
  const priorityLevel = scoreToPriorityLevel(hazardScore, impactScore, finalScore);
  const { trend, trendPct } = calculateTrend(finalScore, inputs.previousScore);
  const explanation = generateExplanation(componentScores, weights, inputs);
  const recommendations = generateRecommendations(riskLevel, priorityLevel, inputs);

  // Compute future projections if forecast available or from inputs
  const futureRisk = calculateFutureRisk(inputs, forecast ?? null, settings);

  return {
    id: uuidv4(),
    locationId: inputs.locationId,
    locationName: inputs.locationName,
    district: inputs.district,
    state: inputs.state,
    timestamp: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    inputs: {
      rainfall_current_mmph: inputs.rainfall_current_mmph ?? 0,
      rainfall_24h_mm: inputs.rainfall_24h_mm ?? 0,
      rainfall_72h_mm: inputs.rainfall_72h_mm ?? 0,
      forecast_6h_mm: inputs.forecast_6h_mm ?? 0,
      forecast_12h_mm: inputs.forecast_12h_mm ?? 0,
      forecast_24h_mm: inputs.forecast_24h_mm ?? 0,
      slope_deg: inputs.slope_deg ?? 15,
      soilSusceptibility: inputs.soilSusceptibility ?? 0.5,
      landCoverSusceptibility: inputs.landCoverSusceptibility ?? 0.5,
      drainageProximityKm: inputs.drainageProximityKm ?? 2.0,
      historicalEventsNearby: inputs.historicalEventsNearby ?? 0,
    },
    componentScores,
    weights,
    hazardScore,
    impactScore,
    finalScore,
    priorityLevel,
    riskLevel,
    trend,
    trendPct,
    explanation,
    futureProjections: {
      plus6h: { score: futureRisk.horizons.plus6h.estimatedFinalScore, level: futureRisk.horizons.plus6h.estimatedRiskLevel },
      plus12h: { score: futureRisk.horizons.plus12h.estimatedFinalScore, level: futureRisk.horizons.plus12h.estimatedRiskLevel },
      plus24h: { score: futureRisk.horizons.plus24h.estimatedFinalScore, level: futureRisk.horizons.plus24h.estimatedRiskLevel },
      plus36h: futureRisk.horizons.plus36h ? { score: futureRisk.horizons.plus36h.estimatedFinalScore, level: futureRisk.horizons.plus36h.estimatedRiskLevel } : undefined,
      plus48h: futureRisk.horizons.plus48h ? { score: futureRisk.horizons.plus48h.estimatedFinalScore, level: futureRisk.horizons.plus48h.estimatedRiskLevel } : undefined,
    },
    recommendations,
    dataQuality: inputs.dataQuality,
    isDemo: inputs.isDemo,
  };
}

// ---- Simulate risk increase for demo ----

export interface SimulationResult {
  step: number;
  label: string;
  assessment: RiskAssessment;
}

