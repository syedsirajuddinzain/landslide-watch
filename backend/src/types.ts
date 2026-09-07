// ============================================================
// LANDSLIDE WATCH — SHARED TYPES (SIH26001 NER)
// ============================================================

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type Trend = 'RISING' | 'FALLING' | 'STABLE';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
export type DataQuality = 'GOOD' | 'STALE' | 'MISSING' | 'ERROR' | 'ESTIMATED' | 'SIMULATED';
export type DataSourceStatus = 'LIVE' | 'STATIC' | 'STALE' | 'ERROR' | 'ESTIMATED' | 'SIMULATED';
export type UserRole = 'admin' | 'authority' | 'viewer';
export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type VerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'FALSE_ALARM'
  | 'CONFIRMED_HAZARD'
  | 'NEEDS_ESCALATION';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Location {
  id: string;
  name: string;
  district: string;
  state: string;
  country: string;
  coordinates: Coordinates;
  population: number;
  isActive: boolean;
  addedAt: string;
  addedBy: string;
  metadata?: Record<string, unknown>;
}

export interface TerrainData {
  locationId: string;
  elevation_m: number;
  avgSlope_deg: number;
  maxSlope_deg: number;
  slopeSusceptibility: number; // 0-1
  dem_source: string;
  processedAt: string;
  qualityFlag: DataQuality;
}

export interface SoilData {
  locationId: string;
  soilType: string;
  clay_pct: number;
  sand_pct: number;
  silt_pct: number;
  bulkDensity: number;
  organicCarbon: number;
  waterRetentionIndex: number;
  soilSusceptibility: number; // 0-1
  source: string;
  fetchedAt: string;
  qualityFlag: DataQuality;
}

export interface LandCoverData {
  locationId: string;
  dominantClass: string;
  classification: Record<string, number>; // class -> percentage
  source: string;
  year: number;
  landCoverSusceptibility: number; // 0-1
  qualityFlag: DataQuality;
}

export interface DrainageData {
  locationId: string;
  nearestRiver: { name: string; distanceKm: number } | null;
  nearestStream: { distanceKm: number } | null;
  drainageDensity: number;
  source: string;
  qualityFlag: DataQuality;
}

export interface RainfallObservation {
  id: string;
  locationId: string;
  timestamp: string;
  current_mmph: number;
  intensity: 'none' | 'light' | 'moderate' | 'heavy' | 'extreme';
  cumulative_24h_mm: number;
  cumulative_72h_mm: number;
  source: string;
  qualityFlag: DataQuality;
  ingestedAt: string;
}

export interface ForecastHour {
  hour: number; // hours from now
  precipitation_mm: number;
  probability: number; // 0-100
}

export interface ForecastData {
  locationId: string;
  generatedAt: string;
  source: string;
  hourly: ForecastHour[];
  next6h_mm: number;
  next12h_mm?: number;
  next24h_mm: number;
  next72h_mm: number;
  qualityFlag: DataQuality;
}

export interface HistoricalLandslide {
  id: string;
  date: string;
  coordinates: Coordinates;
  locationName: string;
  district: string;
  state: string;
  country: string;
  source: string;
  trigger: string;
  fatalities: number | null;
  injuries: number | null;
  missing: number | null;
  description: string;
  lessonsLearned: string;
  nearbyLocations: Array<{ locationId: string; distanceKm: number }>;
  qualityFlag: DataQuality;
}

export interface InfrastructureItem {
  osmId?: string;
  name?: string;
  type?: string;
  distanceKm: number;
  coordinates?: Coordinates;
}

export interface InfrastructureData {
  locationId: string;
  roads: InfrastructureItem[];
  bridges: InfrastructureItem[];
  schools: InfrastructureItem[];
  hospitals: InfrastructureItem[];
  settlements: Array<{ name: string; population?: number; distanceKm: number }>;
  source: string;
  fetchedAt: string;
  qualityFlag: DataQuality;
}

export interface RiskComponentScores {
  rainfall: number; // 0-1
  slope: number;    // 0-1
  soil: number;     // 0-1
  landCover: number; // 0-1
  drainage: number; // 0-1
  historical: number; // 0-1
}

export interface RiskExplanationFactor {
  factor: string;
  value: string;
  contribution: number; // 0-100
  label: 'HIGH' | 'MODERATE' | 'LOW';
  detailDescription?: string;
}

export interface FutureRiskHorizon {
  horizonHours: number; // 6, 12, 24
  label: string; // "+6 Hours", "+12 Hours", "+24 Hours"
  forecastPrecipitation_mm: number;
  estimatedHazardScore: number;
  estimatedFinalScore: number;
  estimatedRiskLevel: RiskLevel;
  estimatedPriority: PriorityLevel;
  primaryDrivers: string[];
}

export interface FutureRiskForecast {
  locationId: string;
  locationName: string;
  generatedAt: string;
  currentRiskScore: number;
  currentRiskLevel: RiskLevel;
  horizons: {
    plus6h: FutureRiskHorizon;
    plus12h: FutureRiskHorizon;
    plus24h: FutureRiskHorizon;
  };
  forecastConfidence: 'HIGH' | 'MODERATE' | 'LOW';
  scientificNote: string;
}

export interface RiskAssessment {
  id: string;
  locationId: string;
  locationName: string;
  district: string;
  state: string;
  timestamp: string;
  modelVersion: string;
  inputs: {
    rainfall_current_mmph: number;
    rainfall_24h_mm: number;
    rainfall_72h_mm: number;
    forecast_6h_mm: number;
    forecast_12h_mm?: number;
    forecast_24h_mm: number;
    slope_deg: number;
    soilSusceptibility: number;
    landCoverSusceptibility: number;
    drainageProximityKm: number;
    historicalEventsNearby: number;
  };
  componentScores: RiskComponentScores;
  weights: Record<string, number>;
  hazardScore: number; // 0-100
  impactScore: number; // 0-100
  finalScore: number;  // 0-100
  priorityLevel: PriorityLevel; // P1, P2, P3, P4
  riskLevel: RiskLevel;
  trend: Trend;
  trendPct: number;
  explanation: RiskExplanationFactor[];
  futureProjections?: {
    plus6h: { score: number; level: RiskLevel };
    plus12h: { score: number; level: RiskLevel };
    plus24h: { score: number; level: RiskLevel };
  };
  recommendations: string[];
  dataQuality: Record<string, DataQuality>;
  isDemo: boolean;
}

export interface WhatChangedDelta {
  locationId: string;
  locationName: string;
  district: string;
  previousTimestamp: string | null;
  currentTimestamp: string;
  previousScore: number;
  currentScore: number;
  scoreDelta: number;
  previousLevel: RiskLevel;
  currentLevel: RiskLevel;
  levelChanged: boolean;
  rainfall24hDelta: number;
  previousRainfall24h: number;
  currentRainfall24h: number;
  primaryCause: string;
  isEscalation: boolean;
}

export interface SystemWhatChangedSummary {
  timestamp: string;
  totalLocations: number;
  escalatedLocations: WhatChangedDelta[];
  deescalatedLocations: WhatChangedDelta[];
  newCriticalAlerts: number;
  newHighAlerts: number;
  meanRiskDelta: number;
  topSurges: WhatChangedDelta[];
}

export interface BacktestEvaluation {
  eventId: string;
  date: string;
  locationName: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  actualTrigger: string;
  fatalities: number | null;
  injuries: number | null;
  historicalRainfall24h_mm: number;
  historicalRainfall72h_mm: number;
  computedHazardScore: number;
  predictedRiskLevel: RiskLevel;
  detectedElevatedRisk: boolean; // True if computed hazard >= moderate/high
  leadTimeHoursEstimated: number | null;
  dataSourceStatus: 'ARCHIVE_ACCESSED' | 'SYNTHETIC_ARCHIVE' | 'DATA_UNAVAILABLE';
  notes: string;
}

export interface BacktestSummary {
  runAt: string;
  totalEventsEvaluated: number;
  detectedEventsCount: number;
  detectionRatePct: number;
  averageLeadTimeHours: number;
  mean24hPrecipitationAtTrigger_mm: number;
  dataLimitationsNotice: string;
  evaluations: BacktestEvaluation[];
}

export interface Alert {
  id: string;
  locationId: string;
  locationName: string;
  district: string;
  state: string;
  riskScore: number;
  riskLevel: RiskLevel;
  priorityLevel?: PriorityLevel;
  triggerThreshold: number;
  reason: string;
  explanation: RiskExplanationFactor[];
  status: AlertStatus;
  createdAt: string;
  source: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  investigatedAt?: string;
  investigatedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  isDemo: boolean;
}

export interface ResponseAction {
  id: string;
  alertId?: string;
  locationId: string;
  locationName: string;
  district: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  assignedTeam: string;
  assignedToEmail: string;
  status: ActionStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface FieldVerification {
  id: string;
  alertId?: string;
  locationId: string;
  locationName: string;
  district: string;
  status: VerificationStatus;
  observations: string;
  hazardConfirmed: boolean;
  evidenceNotes?: string;
  inspectorName: string;
  inspectorEmail: string;
  timestamp: string;
  coordinates?: Coordinates;
}

export interface Notification {
  id: string;
  userId: string | 'all';
  type: 'alert' | 'info' | 'warning' | 'system';
  channel: 'in-app' | 'email' | 'sms';
  title: string;
  body: string;
  relatedAlertId?: string;
  relatedLocationId?: string;
  isRead: boolean;
  createdAt: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
}

export interface DataSource {
  id: string;
  name: string;
  type: 'live' | 'static' | 'estimated' | 'simulated';
  url: string;
  updateFrequency: string;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  status: DataSourceStatus;
  coverage: string;
  qualityNotes: string;
  recordCount?: number;
  lastLatencyMs?: number;
  lastErrorMessage?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  targetType: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  riskWeights: {
    rainfall: number;
    slope: number;
    soil: number;
    landCover: number;
    drainage: number;
    historical: number;
  };
  alertThresholds: {
    moderate: number;
    high: number;
    critical: number;
  };
  ingestionIntervalMinutes: number;
  demoMode: boolean;
  systemVersion: string;
}

export interface SimulationStep {
  step: number;
  label: string;
  rainfall_current_mmph: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  forecast_6h_mm: number;
  forecast_24h_mm: number;
  expectedRiskLevel: RiskLevel;
  delayMs: number;
}

// Grounded AI Analyst
export interface AIAnalystQuery {
  question: string;
  focusLocationId?: string;
  district?: string;
}

export interface AIAnalystResponse {
  answer: string;
  groundedFacts: Array<{ metric: string; value: string; source: string }>;
  relevantLocations: Array<{ id: string; name: string; score: number; level: RiskLevel; priority: PriorityLevel }>;
  recommendedActions: string[];
  confidence: 'HIGH' | 'MODERATE' | 'DATA_LIMITED';
  generatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

