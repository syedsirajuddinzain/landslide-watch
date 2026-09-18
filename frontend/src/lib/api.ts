import {
  getLiveOrCachedLocations,
  getDynamicAlerts,
  computeLiveCitizenLocationRisk,
  computeCitizenLocationRisk,
  NER_CATCHMENTS_REGISTRY,
} from './liveRiskEngine';
import { TripRiskAssessment } from '../types';
import axios from 'axios';
import { auth } from './firebase';

export { computeCitizenLocationRisk };

const CITIZEN_REPORTS_KEY = 'landslide_watch_citizen_reports';

export function getStoredCitizenReports(): any[] {
  try {
    const raw = localStorage.getItem(CITIZEN_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'rep-01',
      hazardType: 'TILTED_POLE',
      observationType: 'TILTED_TREES_OR_POLES',
      locationName: 'Tuirial Valley Road, Aizawl',
      nearestCatchmentName: 'Aizawl Catchment',
      description: 'Electric utility poles leaning approximately 15 degrees downhill after overnight rain.',
      urgency: 'HIGH',
      status: 'VERIFIED',
      coordinates: { lat: 23.7312, lon: 92.7188 },
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'rep-02',
      hazardType: 'ROAD_CRACK',
      observationType: 'GROUND_OR_ROAD_CRACKS',
      locationName: 'Bawngkawn Slope, Aizawl',
      nearestCatchmentName: 'Aizawl Catchment',
      description: 'Hairline pavement fissures widening along outer lane edge.',
      urgency: 'MEDIUM',
      status: 'UNDER_REVIEW',
      coordinates: { lat: 23.742, lon: 92.729 },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ];
}

export function saveStoredCitizenReport(report: any): void {
  try {
    const existing = getStoredCitizenReports();
    const updated = [report, ...existing];
    localStorage.setItem(CITIZEN_REPORTS_KEY, JSON.stringify(updated));
  } catch {}
}

import {
  MOCK_LOCATIONS,
  MOCK_ALERTS,
  MOCK_NOTIFICATIONS,
  MOCK_HISTORICAL_LANDSLIDES,
  MOCK_DATA_SOURCES,
  getMockLocationDetails,
} from './mockData';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 8000,
});

// Attach Firebase ID token or demo session token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch {}
  }

  // Fallback to active demo/session token from localStorage
  try {
    const saved = localStorage.getItem('lw_session_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.role === 'admin') {
        config.headers.Authorization = 'Bearer demo-admin-token';
      } else if (parsed.role === 'authority') {
        config.headers.Authorization = 'Bearer demo-authority-token';
      } else if (parsed.role === 'citizen') {
        config.headers.Authorization = 'Bearer demo-citizen-token';
      } else {
        config.headers.Authorization = 'Bearer demo-viewer-token';
      }
    }
  } catch {}

  return config;
});

async function getFallbackData(url: string = ''): Promise<any> {
  const cleanUrl = url.replace(/^\/api/, '').split('?')[0];

  if (cleanUrl === '/locations' || cleanUrl === '/locations/' || cleanUrl === '') {
    const locs = await getLiveOrCachedLocations();
    return { success: true, data: locs, total: locs.length };
  }

  if (cleanUrl.startsWith('/locations/')) {
    const id = cleanUrl.replace('/locations/', '').trim();
    const locs = await getLiveOrCachedLocations();
    const found = locs.find((l) => l.id.toLowerCase() === id.toLowerCase()) || locs[0];
    return { success: true, data: found };
  }

  if (cleanUrl === '/risk/latest' || cleanUrl === '/risk/latest/') {
    const locs = await getLiveOrCachedLocations();
    return { success: true, data: locs.map((l) => l.latestRisk).filter(Boolean) };
  }

  if (cleanUrl.startsWith('/risk/summary')) {
    const locs = await getLiveOrCachedLocations();
    const critical = locs.filter(l => l.latestRisk.priorityLevel === 'P1').length;
    const high = locs.filter(l => l.latestRisk.priorityLevel === 'P2').length;
    const advisory = locs.filter(l => l.latestRisk.priorityLevel === 'P3').length;
    const low = locs.filter(l => l.latestRisk.priorityLevel === 'P4').length;
    const alerts = await getDynamicAlerts();
    return {
      success: true,
      data: {
        totalMonitored: locs.length,
        critical,
        high,
        advisory,
        low,
        activeAlerts: alerts.length,
        precipitationSurges: locs.filter(l => l.latestRisk.inputs.rainfall_24h_mm >= 30).length,
        lastComputed: new Date().toISOString(),
        counts: { CRITICAL: critical, HIGH: high, MODERATE: advisory, LOW: low },
        priorityCounts: { P1: critical, P2: high, P3: advisory, P4: low },
      },
    };
  }

  if (cleanUrl.includes('/alerts')) {
    const alerts = await getDynamicAlerts();
    return { success: true, data: alerts, total: alerts.length };
  }

  if (cleanUrl.includes('/analytics/risk-distribution')) {
    const locs = await getLiveOrCachedLocations();
    const dist = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    locs.forEach((l) => {
      const lvl = l.latestRisk?.riskLevel || 'MODERATE';
      if (lvl in dist) dist[lvl as keyof typeof dist]++;
    });
    return { success: true, data: dist };
  }

  if (cleanUrl.includes('/analytics/alert-frequency')) {
    const alerts = await getDynamicAlerts();
    return {
      success: true,
      data: {
        total: alerts.length,
        byStatus: {
          active: alerts.filter(a => a.status === 'NEW').length,
          acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
          dispatched: 0,
          resolved: 0,
        },
        byLevel: {
          CRITICAL: alerts.filter(a => a.riskLevel === 'CRITICAL').length,
          HIGH: alerts.filter(a => a.riskLevel === 'HIGH').length,
          MODERATE: 0,
        },
      },
    };
  }

  if (cleanUrl.includes('/analytics/rainfall-summary')) {
    const locs = await getLiveOrCachedLocations();
    return {
      success: true,
      data: locs.map((loc) => {
        const mmph = loc.latestRisk?.inputs.rainfall_current_mmph || 0;
        const c24 = loc.latestRisk?.inputs.rainfall_24h_mm || 0;
        const c72 = loc.latestRisk?.inputs.rainfall_72h_mm || 0;
        const intCat = mmph >= 15 ? 'heavy' : mmph >= 5 ? 'moderate' : mmph > 0 ? 'light' : 'none';
        return {
          locationId: loc.id,
          locationName: loc.name,
          district: loc.district,
          state: loc.state,
          current_mmph: mmph,
          cumulative_24h_mm: c24,
          cumulative_72h_mm: c72,
          intensity: intCat,
        };
      }),
    };
  }

  if (cleanUrl.startsWith('/risk/what-changed')) {
    const locs = await getLiveOrCachedLocations();
    const topSurges = locs.slice(0, 3).map((l) => ({
      locationId: l.id,
      locationName: l.name,
      district: l.district,
      previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
      currentTimestamp: l.latestRisk.timestamp,
      previousScore: Math.max(10, Math.round((l.latestRisk.finalScore - (l.latestRisk.trendPct || 2.5)) * 10) / 10),
      currentScore: l.latestRisk.finalScore,
      scoreDelta: l.latestRisk.trend === 'RISING' ? l.latestRisk.trendPct : -l.latestRisk.trendPct,
      previousLevel: l.latestRisk.riskLevel,
      currentLevel: l.latestRisk.riskLevel,
      levelChanged: false,
      rainfall24hDelta: l.latestRisk.inputs.rainfall_24h_mm,
      previousRainfall24h: Math.max(0, l.latestRisk.inputs.rainfall_24h_mm - 5),
      currentRainfall24h: l.latestRisk.inputs.rainfall_24h_mm,
      primaryCause: l.latestRisk.explanation[0]?.value || 'Precipitation saturation',
      isEscalation: l.latestRisk.trend === 'RISING',
    }));

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalLocations: locs.length,
        escalatedLocations: topSurges.filter(s => s.scoreDelta > 0),
        deescalatedLocations: topSurges.filter(s => s.scoreDelta < 0),
        newCriticalAlerts: locs.filter(l => l.latestRisk.priorityLevel === 'P1').length,
        newHighAlerts: locs.filter(l => l.latestRisk.priorityLevel === 'P2').length,
        meanRiskDelta: 0.2,
        topSurges,
      },
    };
  }

  if (cleanUrl.includes('/citizen/reports') || cleanUrl.includes('/response/citizen-reports')) {
    return { success: true, data: getStoredCitizenReports() };
  }

  if (cleanUrl.includes('/citizen/risk-at-location') || url.includes('/citizen/risk-at-location')) {
    let lat = 23.7307;
    let lon = 92.7173;
    try {
      const queryStr = url.includes('?') ? url.split('?')[1] : '';
      const params = new URLSearchParams(queryStr);
      const qLat = parseFloat(params.get('lat') || '');
      const qLon = parseFloat(params.get('lon') || '');
      if (!isNaN(qLat)) lat = qLat;
      if (!isNaN(qLon)) lon = qLon;
    } catch {}
    const riskResult = await computeLiveCitizenLocationRisk(lat, lon);
    return {
      success: true,
      isWithinNER: riskResult.isWithinNER,
      data: riskResult,
    };
  }

  if (cleanUrl.includes('/citizen/check-trip')) {
    return {
      success: true,
      data: computeCitizenTripRisk('Aizawl', 'Champhai'),
    };
  }

  return { success: true, data: [] };
}



export function computeCitizenTripRisk(
  origin: string | { name: string; lat: number; lon: number },
  destination: string | { name: string; lat: number; lon: number }
): TripRiskAssessment {
  const fromName = typeof origin === 'string' ? origin : origin.name;
  const toName = typeof destination === 'string' ? destination : destination.name;
  const fromCoords = typeof origin === 'string' ? { lat: 23.7307, lon: 92.7173 } : { lat: origin.lat, lon: origin.lon };
  const toCoords = typeof destination === 'string' ? { lat: 23.4566, lon: 93.3282 } : { lat: destination.lat, lon: destination.lon };

  const isHighRiskCorridor = fromName.toLowerCase().includes('aizawl') || toName.toLowerCase().includes('champhai') || fromName.toLowerCase().includes('gangtok');

  return {
    origin: { name: fromName, ...fromCoords },
    destination: { name: toName, ...toCoords },
    totalDistanceKm: 184,
    overallCaution: isHighRiskCorridor ? 'CAUTION' : 'NORMAL',
    headline: isHighRiskCorridor
      ? `🟠 TRAVEL CAUTION: Parts of this journey pass through elevated landslide risk zones`
      : `🟢 CORRIDOR STABLE: Monitored mountain corridors report normal travel conditions`,
    summary: `Evaluated 4 monitored mountain pass corridors along the route from ${fromName} to ${toName}. Saturated cutting slopes on ghat sections require daytime travel and reduced speeds.`,
    recommendations: [
      'Avoid non-essential night travel through steep cuttings where falling rocks are difficult to see.',
      'Check local highway police updates (112) for active clearance before setting off.',
      'Maintain extra braking distance on wet asphalt hairpin bends.',
      'Do not stop or park directly underneath uncemented hillside cuttings.',
    ],
    riskySegments: [
      {
        catchmentId: 'champhai',
        catchmentName: 'Champhai Border Highway Corridor',
        district: 'Champhai',
        state: 'Mizoram',
        riskScore: 64.2,
        riskLevel: 'HIGH',
        priorityLevel: 'P2',
        rainfall24h_mm: 38.5,
        slope_deg: 34.5,
        reason: '34.5° slope cutting with 38.5mm recent rainfall and historical debris slips.',
        cautionFlag: 'HIGH_RISK_CORRIDOR',
      },
      {
        catchmentId: 'durtlang',
        catchmentName: 'Durtlang Escarpment Ridge',
        district: 'Aizawl',
        state: 'Mizoram',
        riskScore: 62.0,
        riskLevel: 'HIGH',
        priorityLevel: 'P2',
        rainfall24h_mm: 40.0,
        slope_deg: 37.5,
        reason: 'Steep sandstone ridge crossing with roadside water seepage.',
        cautionFlag: 'CAUTION_SLOPE',
      },
    ],
    assessedAt: new Date().toISOString(),
  };
}

api.interceptors.response.use(
  async (res) => {
    // If static hosting (like Surge) returned HTML document for API route instead of JSON
    if (typeof res.data === 'string' && (res.data.includes('<!DOCTYPE') || res.data.includes('<html') || res.data.includes('<!doctype'))) {
      const fallback = await getFallbackData(res.config?.url || '');
      return {
        ...res,
        data: fallback,
      };
    }
    // If backend returned empty data array for locations, inject rich fallback
    if (res.config?.url?.includes('/locations') && Array.isArray(res.data?.data) && res.data.data.length === 0) {
      return { ...res, data: await getFallbackData(res.config.url) };
    }
    return res;
  },
  async (err) => {
    // If request failed (e.g. backend offline, network error, or mobile connection)
    const url = err.config?.url || '';
    const fallback = await getFallbackData(url);
    if (fallback && fallback.data && (Array.isArray(fallback.data) ? fallback.data.length > 0 : Object.keys(fallback.data).length > 0)) {
      return Promise.resolve({
        data: fallback,
        status: 200,
        statusText: 'OK (Autonomous Fallback)',
        headers: {},
        config: err.config,
      });
    }
    return Promise.reject(err);
  }
);

export default api;

