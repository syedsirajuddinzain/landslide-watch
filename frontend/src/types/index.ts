export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type Trend = 'RISING' | 'FALLING' | 'STABLE';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
export type VerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'FALSE_ALARM' | 'CONFIRMED_HAZARD' | 'NEEDS_ESCALATION';
export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DataQuality = 'GOOD' | 'STALE' | 'MISSING' | 'ERROR' | 'ESTIMATED' | 'SIMULATED';
export type UserRole = 'admin' | 'authority' | 'viewer' | 'citizen';

export interface Coordinates { lat: number; lon: number; }

export interface Location {
  id: string; name: string; district: string; state: string; country: string;
  coordinates: Coordinates; population: number; isActive: boolean; addedAt: string;
  latestRisk?: RiskAssessment | null;
}

export interface FutureRiskHorizon {
  horizonHours: number;
  projectedPrecipitation_mm: number;
  projectedCumulative24h_mm: number;
  score: number;
  riskLevel: RiskLevel;
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  primaryDriver: string;
}

export interface FutureRiskForecast {
  locationId: string;
  generatedAt: string;
  forecastSource: string;
  plus6h: FutureRiskHorizon;
  plus12h: FutureRiskHorizon;
  plus24h: FutureRiskHorizon;
}

export interface RiskAssessment {
  id: string; locationId: string; locationName: string; district: string; state: string;
  timestamp: string; modelVersion: string;
  inputs: {
    rainfall_current_mmph: number; rainfall_24h_mm: number; rainfall_72h_mm: number;
    forecast_6h_mm: number; forecast_24h_mm: number; slope_deg: number;
    soilSusceptibility: number; landCoverSusceptibility: number;
    drainageProximityKm: number; historicalEventsNearby: number;
  };
  componentScores: { rainfall: number; slope: number; soil: number; landCover: number; drainage: number; historical: number; };
  hazardScore: number; impactScore: number; finalScore: number;
  riskLevel: RiskLevel;
  priorityLevel: PriorityLevel;
  trend: Trend; trendPct: number;
  explanation: Array<{ factor: string; value: string; contribution: number; label: 'HIGH' | 'MODERATE' | 'LOW'; detailDescription?: string; }>;
  recommendations: string[];
  futureProjections?: FutureRiskForecast;
  earlyWarning?: EarlyWarningWindow;
  dataQuality: Record<string, DataQuality>;
  isDemo: boolean;
}

export interface RainfallObservation {
  id: string; locationId: string; timestamp: string;
  current_mmph: number; intensity: 'none' | 'light' | 'moderate' | 'heavy' | 'extreme';
  cumulative_24h_mm: number; cumulative_72h_mm: number;
  source: string; qualityFlag: DataQuality; ingestedAt: string;
}

export interface ForecastHour {
  hour: number;
  precipitation_mm: number;
  probability: number;
}

export interface ForecastData {
  locationId: string; generatedAt: string; source: string;
  hourly: ForecastHour[];
  next6h_mm: number; next24h_mm: number; next72h_mm: number; qualityFlag: DataQuality;
}

export interface TerrainData {
  locationId: string; elevation_m: number; avgSlope_deg: number; maxSlope_deg: number;
  slopeSusceptibility: number; dem_source: string; processedAt: string; qualityFlag: DataQuality;
}

export interface SoilData {
  locationId: string; soilType: string; clay_pct: number; sand_pct: number; silt_pct: number;
  bulkDensity: number; organicCarbon: number; waterRetentionIndex: number;
  soilSusceptibility: number; source: string; fetchedAt: string; qualityFlag: DataQuality;
}

export interface LandCoverData {
  locationId: string; dominantClass: string; classification: Record<string, number>;
  source: string; year: number; landCoverSusceptibility: number; qualityFlag: DataQuality;
}

export interface DrainageData {
  locationId: string;
  nearestRiver: { name: string; distanceKm: number; } | null;
  nearestStream: { distanceKm: number; } | null;
  drainageDensity: number; source: string; qualityFlag: DataQuality;
}

export interface InfrastructureData {
  locationId: string;
  roads: Array<{ osmId?: string; type?: string; distanceKm: number; }>;
  bridges: Array<{ osmId?: string; name?: string; distanceKm: number; }>;
  schools: Array<{ osmId?: string; name?: string; distanceKm: number; }>;
  hospitals: Array<{ osmId?: string; name?: string; distanceKm: number; }>;
  settlements: Array<{ name: string; population?: number; distanceKm: number; }>;
  source: string; fetchedAt: string; qualityFlag: DataQuality;
}

export interface HistoricalLandslide {
  id: string;
  date: string;
  coordinates: Coordinates;
  locationName: string;
  district: string;
  state: string;
  source: string;
  trigger: string;
  fatalities: number | null;
  injuries: number | null;
  missing?: number | null;
  displaced?: number | null;
  description: string;
  whyItHappened?: string;
  whatWentWrong?: string;
  precautionsGovtCouldHaveTaken?: string;
  infrastructureImpact?: string;
  lessonsLearned?: string;
  nearbyLocations: Array<{ locationId: string; distanceKm: number; }>;
  qualityFlag: DataQuality;
}

export interface Alert {
  id: string; locationId: string; locationName: string; district: string; state: string;
  riskScore: number; riskLevel: RiskLevel; triggerThreshold: number;
  priorityLevel?: PriorityLevel;
  reason: string; explanation: RiskAssessment['explanation'];
  status: AlertStatus; createdAt: string; source: string;
  acknowledgedAt?: string; acknowledgedBy?: string;
  investigatedAt?: string; investigatedBy?: string;
  resolvedAt?: string; resolvedBy?: string; resolutionNotes?: string;
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
  detectedElevatedRisk: boolean;
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
  notes: string;
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
  evidenceNotes: string;
  inspectorName: string;
  inspectorEmail: string;
  timestamp: string;
  coordinates?: Coordinates;
}

export interface AIAnalystQuery {
  question: string;
  focusLocationId?: string;
}

export interface AIAnalystResponse {
  answer: string;
  groundedFacts: Array<{ metric: string; value: string; source: string }>;
  relevantLocations: Array<{ id: string; name: string; score: number; level: RiskLevel; priority: PriorityLevel; district?: string }>;
  recommendedActions: string[];
  confidence: 'HIGH' | 'MODERATE' | 'DATA_LIMITED';
  generatedAt: string;
}

export interface Notification {
  id: string; userId: string; type: string; channel: string;
  title: string; body: string; relatedAlertId?: string; relatedLocationId?: string;
  isRead: boolean; createdAt: string; deliveryStatus: string;
}

export interface DataSource {
  id: string; name: string; type: string; url: string; updateFrequency: string;
  lastSuccessAt: string | null; lastAttemptAt: string | null;
  status: string; coverage: string; qualityNotes: string;
  recordCount?: number; lastLatencyMs?: number; latestObservationTime?: string | null;
}

export interface SystemSettings {
  riskWeights: { rainfall: number; slope: number; soil: number; landCover: number; drainage: number; historical: number; };
  alertThresholds: { moderate: number; high: number; critical: number; };
  ingestionIntervalMinutes: number; demoMode: boolean; systemVersion: string;
}

export interface LocationDetail {
  location: Location; terrain: TerrainData | null; soil: SoilData | null;
  landCover: LandCoverData | null; drainage: DrainageData | null;
  infrastructure: InfrastructureData | null; forecast: ForecastData | null;
  latestRainfall: RainfallObservation | null;
  riskHistory: RiskAssessment[]; latestRisk: RiskAssessment | null;
  nearbyLandslides: HistoricalLandslide[]; alerts: Alert[];
}

// ============================================================
// CITIZEN PERSONAL SAFETY TYPES
// ============================================================

export type HazardObservationType =
  | 'ROAD_BLOCKED'
  | 'MUD_DEBRIS'
  | 'FALLING_ROCKS'
  | 'GROUND_CRACKS'
  | 'UNUSUAL_WATER_FLOW'
  | 'BUILDING_DAMAGE'
  | 'LANDSLIDE'
  | 'OTHER';

export interface CitizenHazardReport {
  id: string;
  userId?: string;
  userPhone?: string;
  userName?: string;
  coordinates: Coordinates;
  locationName?: string;
  nearestCatchmentId?: string;
  nearestCatchmentName?: string;
  distanceToCatchmentKm?: number;
  observationType: HazardObservationType;
  description?: string;
  photoUrl?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'DISMISSED';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  verificationId?: string;
}

export interface TripRiskSegment {
  catchmentId: string;
  catchmentName: string;
  district: string;
  state: string;
  riskScore: number;
  riskLevel: RiskLevel;
  priorityLevel: PriorityLevel;
  rainfall24h_mm: number;
  slope_deg: number;
  reason: string;
  cautionFlag: 'HIGH_RISK_CORRIDOR' | 'CAUTION_SLOPE' | 'NORMAL';
}

export interface TripRiskAssessment {
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  totalDistanceKm: number;
  overallCaution: 'NORMAL' | 'CAUTION' | 'HIGH_ALERT';
  headline: string;
  summary: string;
  recommendations: string[];
  riskySegments: TripRiskSegment[];
  assessedAt: string;
}

export interface PotentialSaferLocation {
  id: string;
  name: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  distanceKm: number;
  currentRiskScore: number;
  currentRiskLevel: RiskLevel;
  safetyMarginScore: number;
  safeGroundFeatures: string[];
  directionsNote: string;
  officialDisclaimer: string;
}

// ----------------------------------------------------
// DATA-DRIVEN EARLY WARNING & RISK ESCALATION TYPES
// ----------------------------------------------------

export type RiskEscalationStage = 'NORMAL' | 'WATCH' | 'PREPARE' | 'HIGH_RISK' | 'CRITICAL';

export interface ForecastRiskPoint {
  horizon: 'now' | '+3h' | '+6h' | '+12h' | '+24h';
  hoursAhead: number;
  projectedRainfall24h_mm: number;
  projectedPrecipRate_mmph: number;
  riskScore: number;
  stage: RiskEscalationStage;
  isThresholdCrossed: boolean;
}

export interface EarlyWarningWindow {
  locationId: string;
  locationName: string;
  district: string;
  state: string;
  currentRisk: number;
  currentStage: RiskEscalationStage;
  forecastPeakRisk: number;
  forecastPeakStage: RiskEscalationStage;
  threshold: number; // 65 for High Risk
  thresholdCrossed: boolean;
  timeToThresholdHours: number | null; // e.g. 6 if crossed in 6 hours
  timeToThresholdLabel: string; // e.g. "approximately 6 hours"
  status: 'RISK_ESCALATING' | 'STABLE' | 'DE_ESCALATING' | 'THRESHOLD_ACTIVE';
  statusLabel: string;
  message: string;
  timeline: ForecastRiskPoint[];
  authorityActionProtocols: string[];
  citizenGuidance: string[];
  evaluationTimestamp: string;
}

export interface LeadTimeAnalyticsSummary {
  eventsEvaluated: number;
  thresholdCrossings: number;
  medianLeadTimeHours: number | null;
  minLeadTimeHours: number | null;
  maxLeadTimeHours: number | null;
  missedEvents: number;
  falseWarnings: number;
  dataSourceStatus: string;
  dataLimitationsNotice: string;
}


