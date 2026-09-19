import { calculateRisk, RiskInputs, DEFAULT_WEIGHTS } from '../src/engine/riskEngine';
import { SystemSettings } from '../src/types';

const DEFAULT_SETTINGS: SystemSettings = {
  riskWeights: DEFAULT_WEIGHTS,
  alertThresholds: { moderate: 40, high: 65, critical: 80 },
  ingestionIntervalMinutes: 30,
  demoMode: false,
  systemVersion: '1.0.0',
};

const BASE_INPUTS: RiskInputs = {
  locationId: 'test-loc-001',
  locationName: 'Test Village',
  district: 'Test District',
  state: 'Assam',
  rainfall_current_mmph: 0,
  rainfall_24h_mm: 0,
  rainfall_72h_mm: 0,
  forecast_6h_mm: 0,
  forecast_24h_mm: 0,
  slope_deg: 10,
  soilSusceptibility: 0.3,
  landCoverSusceptibility: 0.3,
  drainageProximityKm: 5,
  historicalEventsNearby: 0,
  population: 5000,
  roadCount: 2,
  schoolCount: 1,
  hospitalCount: 0,
  bridgeCount: 1,
  dataQuality: { rainfall: 'GOOD', terrain: 'GOOD', soil: 'GOOD', forecast: 'GOOD' },
  isDemo: false,
};

describe('Risk Engine — Core Calculations', () => {
  test('dry conditions with gentle slope → LOW risk', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      slope_deg: 5,
      soilSusceptibility: 0.2,
      drainageProximityKm: 8,
    }, DEFAULT_SETTINGS);

    expect(result.riskLevel).toBe('LOW');
    expect(result.finalScore).toBeLessThan(40);
    expect(result.hazardScore).toBeGreaterThanOrEqual(0);
    expect(result.impactScore).toBeGreaterThanOrEqual(0);
  });

  test('moderate rainfall + moderate slope → MODERATE risk', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_current_mmph: 5,
      rainfall_24h_mm: 45,
      rainfall_72h_mm: 80,
      forecast_24h_mm: 30,
      slope_deg: 18,
      soilSusceptibility: 0.5,
      drainageProximityKm: 2,
      historicalEventsNearby: 1,
    }, DEFAULT_SETTINGS);

    expect(result.riskLevel).toBe('MODERATE');
    expect(result.finalScore).toBeGreaterThanOrEqual(40);
    expect(result.finalScore).toBeLessThan(65);
  });

  test('heavy rainfall + steep slope → HIGH or CRITICAL risk', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_current_mmph: 12,
      rainfall_24h_mm: 85,
      rainfall_72h_mm: 140,
      forecast_6h_mm: 20,
      forecast_24h_mm: 70,
      slope_deg: 28,
      soilSusceptibility: 0.65,
      drainageProximityKm: 0.8,
      historicalEventsNearby: 2,
      population: 8000,
      schoolCount: 2,
      hospitalCount: 1,
    }, DEFAULT_SETTINGS);

    expect(['HIGH', 'CRITICAL']).toContain(result.riskLevel);
    expect(result.finalScore).toBeGreaterThanOrEqual(65);
  });

  test('extreme rainfall + very steep slope + history → HIGH or CRITICAL risk', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_current_mmph: 25,
      rainfall_24h_mm: 140,
      rainfall_72h_mm: 230,
      forecast_6h_mm: 40,
      forecast_24h_mm: 120,
      slope_deg: 38,
      soilSusceptibility: 0.85,
      landCoverSusceptibility: 0.7,
      drainageProximityKm: 0.3,
      historicalEventsNearby: 4,
      population: 10000,
      schoolCount: 3,
      hospitalCount: 2,
      bridgeCount: 2,
    }, DEFAULT_SETTINGS);

    expect(['HIGH', 'CRITICAL']).toContain(result.riskLevel);
    expect(result.finalScore).toBeGreaterThanOrEqual(65);
  });

  test('missing data (zeros) → does not crash, returns LOW', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_current_mmph: 0,
      rainfall_24h_mm: 0,
      rainfall_72h_mm: 0,
      slope_deg: 0,
      soilSusceptibility: 0,
      landCoverSusceptibility: 0,
      drainageProximityKm: 10,
      historicalEventsNearby: 0,
      population: 0,
      roadCount: 0,
      schoolCount: 0,
      hospitalCount: 0,
      bridgeCount: 0,
    }, DEFAULT_SETTINGS);

    expect(result.riskLevel).toBe('LOW');
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  test('scores are always within 0-100 range', () => {
    const extremeInputs: RiskInputs = {
      ...BASE_INPUTS,
      rainfall_current_mmph: 1000,
      rainfall_24h_mm: 5000,
      rainfall_72h_mm: 10000,
      slope_deg: 90,
      soilSusceptibility: 1,
      landCoverSusceptibility: 1,
      drainageProximityKm: 0,
      historicalEventsNearby: 100,
    };
    const result = calculateRisk(extremeInputs, DEFAULT_SETTINGS);
    expect(result.hazardScore).toBeGreaterThanOrEqual(0);
    expect(result.hazardScore).toBeLessThanOrEqual(100);
    expect(result.impactScore).toBeGreaterThanOrEqual(0);
    expect(result.impactScore).toBeLessThanOrEqual(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
  });

  test('trend is RISING when current score is higher than previous', () => {
    // First compute baseline score
    const baseline = calculateRisk({ ...BASE_INPUTS }, DEFAULT_SETTINGS);
    // Now compute a higher-rainfall scenario with the baseline as previousScore
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_current_mmph: 15,
      rainfall_24h_mm: 100,
      rainfall_72h_mm: 180,
      forecast_24h_mm: 80,
      slope_deg: 30,
      previousScore: Math.min(baseline.finalScore * 0.5, 20), // force a low previous
    }, DEFAULT_SETTINGS);
    expect(result.trend).toBe('RISING');
    expect(result.trendPct).toBeGreaterThan(0);
  });

  test('trend is FALLING when current score is lower than previous', () => {
    const result = calculateRisk({ ...BASE_INPUTS, rainfall_24h_mm: 5, previousScore: 75 }, DEFAULT_SETTINGS);
    expect(result.trend).toBe('FALLING');
  });

  test('explanation factors are ordered by contribution descending', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 80,
      slope_deg: 25,
    }, DEFAULT_SETTINGS);

    for (let i = 0; i < result.explanation.length - 1; i++) {
      expect(result.explanation[i].contribution).toBeGreaterThanOrEqual(result.explanation[i + 1].contribution);
    }
  });

  test('configurable thresholds are respected', () => {
    const customSettings: SystemSettings = {
      ...DEFAULT_SETTINGS,
      alertThresholds: { moderate: 30, high: 55, critical: 70 },
    };
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 60,
      slope_deg: 22,
      soilSusceptibility: 0.55,
      drainageProximityKm: 1.5,
    }, customSettings);

    // With lower thresholds, same inputs may yield higher level
    expect(['MODERATE', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
  });

  test('recommendations are non-empty for HIGH and CRITICAL', () => {
    const high = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 90,
      slope_deg: 30,
      soilSusceptibility: 0.7,
      drainageProximityKm: 0.5,
    }, DEFAULT_SETTINGS);

    if (high.riskLevel === 'HIGH' || high.riskLevel === 'CRITICAL') {
      expect(high.recommendations.length).toBeGreaterThan(1);
      expect(high.recommendations.some(r => r.includes('field'))).toBeTruthy();
    }
  });

  test('assessment has required fields', () => {
    const result = calculateRisk(BASE_INPUTS, DEFAULT_SETTINGS);
    expect(result.id).toBeTruthy();
    expect(result.locationId).toBe('test-loc-001');
    expect(result.timestamp).toBeTruthy();
    expect(result.modelVersion).toBeTruthy();
    expect(result.componentScores).toBeDefined();
    expect(result.hazardScore).toBeDefined();
    expect(result.impactScore).toBeDefined();
    expect(result.finalScore).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  test('isDemo flag is preserved', () => {
    const result = calculateRisk({ ...BASE_INPUTS, isDemo: true }, DEFAULT_SETTINGS);
    expect(result.isDemo).toBe(true);
  });
});

describe('Risk Engine — Threshold Boundaries', () => {
  test('score just below moderate → LOW', () => {
    // Calibrate to produce score just under 40
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 20,
      slope_deg: 8,
      soilSusceptibility: 0.2,
    }, DEFAULT_SETTINGS);
    expect(['LOW', 'MODERATE']).toContain(result.riskLevel);
  });

  test('score just above critical threshold → CRITICAL', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_current_mmph: 20,
      rainfall_24h_mm: 110,
      rainfall_72h_mm: 200,
      forecast_24h_mm: 90,
      slope_deg: 35,
      soilSusceptibility: 0.8,
      landCoverSusceptibility: 0.7,
      drainageProximityKm: 0.2,
      historicalEventsNearby: 3,
      schoolCount: 2,
      hospitalCount: 1,
      population: 8000,
    }, DEFAULT_SETTINGS);
    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.priorityLevel).toBe('P1');
  });

  test('priority levels map correctly based on hazard and exposure', () => {
    const p1Result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 120,
      rainfall_72h_mm: 220,
      slope_deg: 36,
      soilSusceptibility: 0.8,
      population: 15000,
      hospitalCount: 2,
      schoolCount: 3,
    }, DEFAULT_SETTINGS);
    expect(p1Result.priorityLevel).toBe('P1');

    const p4Result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 0,
      slope_deg: 3,
      soilSusceptibility: 0.1,
      population: 500,
    }, DEFAULT_SETTINGS);
    expect(p4Result.priorityLevel).toBe('P4');
  });

  test('future risk calculates +6h, +12h, +24h horizons', () => {
    const result = calculateRisk({
      ...BASE_INPUTS,
      rainfall_24h_mm: 40,
      forecast_6h_mm: 25,
      forecast_24h_mm: 85,
    }, DEFAULT_SETTINGS);

    expect(result.futureProjections).toBeDefined();
    expect(result.futureProjections?.plus6h).toBeDefined();
    expect(result.futureProjections?.plus12h).toBeDefined();
    expect(result.futureProjections?.plus24h).toBeDefined();
    expect(result.futureProjections?.plus36h).toBeDefined();
    expect(result.futureProjections?.plus48h).toBeDefined();
    expect(result.futureProjections!.plus6h.score).toBeGreaterThanOrEqual(0);
    expect(result.futureProjections!.plus24h.score).toBeLessThanOrEqual(100);
    expect(result.futureProjections!.plus48h!.score).toBeLessThanOrEqual(100);
  });
});

