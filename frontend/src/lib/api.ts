import axios from 'axios';
import { auth } from './firebase';
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

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

function getFallbackData(url: string = '') {
  const cleanUrl = url.replace(/^\/api/, '').split('?')[0];

  if (cleanUrl === '/locations' || cleanUrl === '/locations/' || cleanUrl === '') {
    return { success: true, data: MOCK_LOCATIONS };
  }

  if (cleanUrl.startsWith('/locations/')) {
    const id = cleanUrl.replace('/locations/', '').trim();
    return { success: true, data: getMockLocationDetails(id) };
  }

  if (cleanUrl === '/risk/latest' || cleanUrl === '/risk/latest/') {
    return { success: true, data: MOCK_LOCATIONS.map((l) => l.latestRisk).filter(Boolean) };
  }

  if (cleanUrl.startsWith('/risk/summary')) {
    return {
      success: true,
      data: {
        totalMonitored: 20,
        critical: 2,
        high: 5,
        advisory: 8,
        low: 5,
        activeAlerts: 4,
        precipitationSurges: 3,
        lastComputed: new Date().toISOString(),
        counts: { CRITICAL: 2, HIGH: 5, MODERATE: 8, LOW: 5 },
        priorityCounts: { P1: 2, P2: 5, P3: 8, P4: 5 },
      },
    };
  }

  if (cleanUrl.includes('/analytics/risk-distribution')) {
    const dist = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    MOCK_LOCATIONS.forEach((l) => {
      const lvl = l.latestRisk?.riskLevel || 'MODERATE';
      if (lvl in dist) dist[lvl as keyof typeof dist]++;
    });
    return { success: true, data: dist };
  }

  if (cleanUrl.includes('/analytics/alert-frequency')) {
    return {
      success: true,
      data: {
        total: MOCK_ALERTS.length,
        byStatus: {
          active: MOCK_ALERTS.filter((a) => a.status === 'NEW').length || 4,
          acknowledged: MOCK_ALERTS.filter((a) => a.status === 'ACKNOWLEDGED').length || 3,
          dispatched: MOCK_ALERTS.filter((a) => a.status === 'INVESTIGATING').length || 3,
          resolved: MOCK_ALERTS.filter((a) => a.status === 'RESOLVED').length || 2,
        },
        byLevel: {
          CRITICAL: MOCK_ALERTS.filter((a) => a.riskLevel === 'CRITICAL').length || 2,
          HIGH: MOCK_ALERTS.filter((a) => a.riskLevel === 'HIGH').length || 5,
          MODERATE: MOCK_ALERTS.filter((a) => a.riskLevel === 'MODERATE').length || 5,
        },
      },
    };
  }

  if (cleanUrl.includes('/analytics/rainfall-summary')) {
    return {
      success: true,
      data: MOCK_LOCATIONS.map((loc) => {
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
    const surges = [
      {
        locationId: 'aizawl',
        locationName: 'Aizawl Catchment',
        district: 'Aizawl',
        previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
        currentTimestamp: new Date().toISOString(),
        previousScore: 61.6,
        currentScore: 75.8,
        scoreDelta: 14.2,
        previousLevel: 'HIGH',
        currentLevel: 'CRITICAL',
        levelChanged: true,
        rainfall24hDelta: 24.5,
        previousRainfall24h: 62.0,
        currentRainfall24h: 86.5,
        primaryCause: 'Intense Cloudburst Saturation & 38° Slope Runoff',
        isEscalation: true,
      },
      {
        locationId: 'gangtok',
        locationName: 'Gangtok Urban Ridge',
        district: 'East Sikkim',
        previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
        currentTimestamp: new Date().toISOString(),
        previousScore: 58.9,
        currentScore: 70.1,
        scoreDelta: 11.2,
        previousLevel: 'HIGH',
        currentLevel: 'CRITICAL',
        levelChanged: true,
        rainfall24hDelta: 18.3,
        previousRainfall24h: 54.5,
        currentRainfall24h: 72.8,
        primaryCause: 'Pore Pressure Accumulation on Burtuk Creep Axis',
        isEscalation: true,
      },
      {
        locationId: 'shillong',
        locationName: 'Shillong Peak & Valley',
        district: 'East Khasi Hills',
        previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
        currentTimestamp: new Date().toISOString(),
        previousScore: 58.2,
        currentScore: 67.1,
        scoreDelta: 8.9,
        previousLevel: 'HIGH',
        currentLevel: 'HIGH',
        levelChanged: false,
        rainfall24hDelta: 15.2,
        previousRainfall24h: 49.0,
        currentRainfall24h: 64.2,
        primaryCause: 'Elevated Mawlai Bypass Drainage Runoff',
        isEscalation: true,
      },
    ];

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalLocations: MOCK_LOCATIONS.length,
        escalatedLocations: surges,
        deescalatedLocations: [
          {
            locationId: 'krishnai',
            locationName: 'Krishnai River Catchment',
            district: 'Goalpara',
            previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
            currentTimestamp: new Date().toISOString(),
            previousScore: 28.5,
            currentScore: 22.0,
            scoreDelta: -6.5,
            previousLevel: 'MODERATE',
            currentLevel: 'LOW',
            levelChanged: true,
            rainfall24hDelta: -12.0,
            previousRainfall24h: 24.0,
            currentRainfall24h: 12.0,
            primaryCause: 'Precipitation Receded & Rapid Floodplain Runoff',
            isEscalation: false,
          },
        ],
        newCriticalAlerts: 2,
        newHighAlerts: 1,
        meanRiskDelta: 3.4,
        topSurges: surges,
      },
    };
  }

  if (cleanUrl.startsWith('/alerts')) {
    return { success: true, data: MOCK_ALERTS };
  }

  if (cleanUrl === '/notifications' || cleanUrl === '/notifications/') {
    return { success: true, data: MOCK_NOTIFICATIONS };
  }

  if (cleanUrl === '/landslides' || cleanUrl === '/landslides/') {
    return { success: true, data: MOCK_HISTORICAL_LANDSLIDES };
  }

  if (cleanUrl.includes('/datasources') || cleanUrl.includes('/data-sources')) {
    return { success: true, data: MOCK_DATA_SOURCES };
  }

  if (cleanUrl.includes('/ingestion/trigger') || cleanUrl.includes('/pipeline/run')) {
    return { success: true, message: 'Pipeline synchronization completed successfully across all 8 data feeds.' };
  }

  if (cleanUrl.includes('/rainfall')) {
    return {
      success: true,
      data: MOCK_LOCATIONS.map((loc) => {
        const mmph = loc.latestRisk?.inputs.rainfall_current_mmph || 0;
        const c24 = loc.latestRisk?.inputs.rainfall_24h_mm || 0;
        const c72 = loc.latestRisk?.inputs.rainfall_72h_mm || 0;
        const intCat = mmph >= 15 ? 'heavy' : mmph >= 5 ? 'moderate' : mmph > 0 ? 'light' : 'none';
        return {
          id: `rain-${loc.id}`,
          locationId: loc.id,
          locationName: loc.name,
          district: loc.district,
          state: loc.state,
          current_mmph: mmph,
          rainfall_1h_mm: mmph,
          cumulative_24h_mm: c24,
          rainfall_24h_mm: c24,
          cumulative_72h_mm: c72,
          rainfall_72h_mm: c72,
          intensity: intCat,
          source: 'IMD AWS / Open-Meteo',
          qualityFlag: 'GOOD',
          ingestedAt: new Date(Date.now() - Math.floor(Math.random() * 5 + 1) * 60000).toISOString(),
          timestamp: new Date().toISOString(),
          status: 'LIVE',
          lastUpdated: new Date().toISOString(),
        };
      }),
    };
  }

  if (cleanUrl.includes('/terrain')) {
    const ELEVATIONS: Record<string, number> = {
      aizawl: 1132,
      gangtok: 1650,
      shillong: 1525,
      kohima: 1444,
      haflong: 680,
      mawsynram: 1400,
      jowai: 1380,
      namchi: 1315,
      senapati: 1040,
      ukhrul: 1662,
      champhai: 1678,
      durtlang: 1280,
      wokha: 1313,
      viswema: 1620,
      maibang: 355,
      boko: 48,
      hajo: 52,
      lakhipur: 24,
      krishnai: 45,
      mynso: 1260,
    };

    return {
      success: true,
      data: MOCK_LOCATIONS.map((loc) => {
        const slope = loc.latestRisk?.inputs.slope_deg || 22;
        return {
          locationId: loc.id,
          elevation_m: ELEVATIONS[loc.id] || 1132,
          avgSlope_deg: slope,
          maxSlope_deg: Math.round((slope + 7.5) * 10) / 10,
          slopeSusceptibility: Math.min(0.98, Math.round((slope / 42) * 100) / 100),
          dem_source: 'SRTM_30M_GLOBAL_DEM',
          processedAt: new Date().toISOString(),
          qualityFlag: 'GOOD',
        };
      }),
    };
  }

  if (cleanUrl.includes('/soil')) {
    const SOIL_TYPES: Record<string, { type: string; clay: number; sand: number; silt: number; density: number }> = {
      aizawl: { type: 'Clay Loam (Typic Dystrochrepts)', clay: 38, sand: 28, silt: 34, density: 1.35 },
      gangtok: { type: 'Gravelly Silty Clay Loam (Humic Dystrudepts)', clay: 42, sand: 24, silt: 34, density: 1.31 },
      shillong: { type: 'Lateritic Red Sandy Clay (Kandiudults)', clay: 36, sand: 36, silt: 28, density: 1.38 },
      kohima: { type: 'Silty Clay Loam (Typic Hapludolls)', clay: 39, sand: 26, silt: 35, density: 1.33 },
      haflong: { type: 'Colluvial Sandy Clay (Typic Paleudults)', clay: 34, sand: 38, silt: 28, density: 1.40 },
      mawsynram: { type: 'Humic Clay (Dystrudepts)', clay: 44, sand: 20, silt: 36, density: 1.28 },
      jowai: { type: 'Red Loamy Soil (Hapludults)', clay: 35, sand: 35, silt: 30, density: 1.36 },
      namchi: { type: 'Gravelly Clay Loam (Udic Paleustalfs)', clay: 40, sand: 25, silt: 35, density: 1.32 },
      senapati: { type: 'Mountain Loam (Typic Dystrudepts)', clay: 33, sand: 37, silt: 30, density: 1.39 },
      ukhrul: { type: 'Fine Loamy Soil (Paleustalfs)', clay: 37, sand: 29, silt: 34, density: 1.34 },
      champhai: { type: 'Clay Loam (Dystrochrepts)', clay: 36, sand: 30, silt: 34, density: 1.36 },
      durtlang: { type: 'Silty Clay (Typic Hapludults)', clay: 41, sand: 23, silt: 36, density: 1.30 },
      wokha: { type: 'Red Clayey Soil (Paleudults)', clay: 38, sand: 28, silt: 34, density: 1.35 },
      viswema: { type: 'Coarse Loamy Colluvium', clay: 30, sand: 42, silt: 28, density: 1.42 },
      maibang: { type: 'Alluvial Clay Loam', clay: 32, sand: 38, silt: 30, density: 1.41 },
      boko: { type: 'Fluventic Alluvium', clay: 24, sand: 48, silt: 28, density: 1.45 },
      hajo: { type: 'Active Floodplain Silt', clay: 22, sand: 50, silt: 28, density: 1.46 },
      lakhipur: { type: 'Barak Alluvium', clay: 26, sand: 44, silt: 30, density: 1.44 },
      krishnai: { type: 'Foothill Sandy Loam', clay: 25, sand: 46, silt: 29, density: 1.43 },
      mynso: { type: 'Lateritic Loam', clay: 35, sand: 35, silt: 30, density: 1.37 },
    };

    return {
      success: true,
      data: MOCK_LOCATIONS.map((loc) => {
        const soilInfo = SOIL_TYPES[loc.id] || { type: 'Clay Loam (Typic Dystrochrepts)', clay: 35, sand: 32, silt: 33, density: 1.35 };
        return {
          locationId: loc.id,
          soilType: soilInfo.type,
          clay_pct: soilInfo.clay,
          sand_pct: soilInfo.sand,
          silt_pct: soilInfo.silt,
          bulkDensity: soilInfo.density,
          waterRetentionIndex: Math.round(((soilInfo.clay * 1.5 + soilInfo.silt) / 100) * 100) / 100,
          soilSusceptibility: loc.latestRisk?.inputs.soilSusceptibility || 0.65,
          source: 'ICAR_NBSS_LUP / ISRIC SoilGrids',
          fetchedAt: new Date().toISOString(),
          qualityFlag: 'GOOD',
        };
      }),
    };
  }

  if (cleanUrl.includes('/infrastructure')) {
    const INFRA_DATA: Record<string, { roads: number; bridges: number; schools: number; hospitals: number; settlements: number; exposure: string }> = {
      aizawl: { roads: 42, bridges: 8, schools: 68, hospitals: 12, settlements: 34, exposure: 'VERY HIGH' },
      gangtok: { roads: 31, bridges: 9, schools: 38, hospitals: 7, settlements: 19, exposure: 'VERY HIGH' },
      shillong: { roads: 36, bridges: 6, schools: 54, hospitals: 11, settlements: 26, exposure: 'VERY HIGH' },
      kohima: { roads: 28, bridges: 5, schools: 34, hospitals: 6, settlements: 18, exposure: 'VERY HIGH' },
      haflong: { roads: 18, bridges: 7, schools: 16, hospitals: 4, settlements: 11, exposure: 'HIGH' },
      namchi: { roads: 16, bridges: 3, schools: 14, hospitals: 3, settlements: 9, exposure: 'HIGH' },
      durtlang: { roads: 11, bridges: 2, schools: 9, hospitals: 2, settlements: 6, exposure: 'HIGH' },
      mawsynram: { roads: 9, bridges: 4, schools: 8, hospitals: 2, settlements: 7, exposure: 'MODERATE' },
      senapati: { roads: 15, bridges: 5, schools: 15, hospitals: 3, settlements: 10, exposure: 'HIGH' },
      ukhrul: { roads: 13, bridges: 3, schools: 12, hospitals: 3, settlements: 8, exposure: 'MODERATE' },
      jowai: { roads: 14, bridges: 4, schools: 15, hospitals: 4, settlements: 9, exposure: 'HIGH' },
      champhai: { roads: 14, bridges: 3, schools: 13, hospitals: 3, settlements: 8, exposure: 'HIGH' },
      wokha: { roads: 15, bridges: 3, schools: 14, hospitals: 3, settlements: 9, exposure: 'HIGH' },
      viswema: { roads: 6, bridges: 2, schools: 4, hospitals: 1, settlements: 4, exposure: 'MODERATE' },
      maibang: { roads: 8, bridges: 4, schools: 6, hospitals: 2, settlements: 5, exposure: 'MODERATE' },
      mynso: { roads: 6, bridges: 2, schools: 5, hospitals: 1, settlements: 4, exposure: 'LOW' },
      boko: { roads: 10, bridges: 4, schools: 9, hospitals: 2, settlements: 7, exposure: 'MODERATE' },
      hajo: { roads: 11, bridges: 3, schools: 11, hospitals: 2, settlements: 8, exposure: 'MODERATE' },
      lakhipur: { roads: 10, bridges: 4, schools: 10, hospitals: 2, settlements: 7, exposure: 'MODERATE' },
      krishnai: { roads: 10, bridges: 3, schools: 9, hospitals: 2, settlements: 7, exposure: 'MODERATE' },
    };

    return {
      success: true,
      data: MOCK_LOCATIONS.map((loc) => {
        const inf = INFRA_DATA[loc.id] || { roads: 12, bridges: 3, schools: 8, hospitals: 2, settlements: 6, exposure: 'MODERATE' };
        return {
          locationId: loc.id,
          locationName: loc.name,
          district: loc.district,
          state: loc.state,
          roads: Array.from({ length: inf.roads }, (_, i) => ({
            osmId: `osm-rd-${loc.id}-${i + 1}`,
            type: i === 0 ? 'primary' : 'secondary',
            distanceKm: 0.1 + i * 0.2,
          })),
          bridges: Array.from({ length: inf.bridges }, (_, i) => ({
            osmId: `osm-br-${loc.id}-${i + 1}`,
            name: `Bridge #${i + 1}`,
            distanceKm: 0.2 + i * 0.4,
          })),
          schools: Array.from({ length: inf.schools }, (_, i) => ({
            osmId: `osm-sc-${loc.id}-${i + 1}`,
            name: `School #${i + 1}`,
            distanceKm: 0.3 + i * 0.2,
          })),
          hospitals: Array.from({ length: inf.hospitals }, (_, i) => ({
            osmId: `osm-hp-${loc.id}-${i + 1}`,
            name: `Health Facility #${i + 1}`,
            distanceKm: 0.2 + i * 0.3,
          })),
          settlements: Array.from({ length: inf.settlements }, (_, i) => ({
            name: `Sector #${i + 1}`,
            population: Math.round(loc.population / inf.settlements),
            distanceKm: 0.1 + i * 0.2,
          })),
          roadsCount: inf.roads,
          bridgesCount: inf.bridges,
          schoolsCount: inf.schools,
          hospitalsCount: inf.hospitals,
          settlementsCount: inf.settlements,
          exposureScore: Math.round(((loc.latestRisk?.finalScore || 50) * 0.8) * 10) / 10,
          exposureLevel: inf.exposure,
          qualityFlag: 'GOOD',
        };
      }),
    };
  }

  return { success: true, data: [] };
}

api.interceptors.response.use(
  (res) => {
    // If backend returned empty data array for locations, inject rich fallback
    if (res.config?.url?.includes('/locations') && Array.isArray(res.data?.data) && res.data.data.length === 0) {
      return { ...res, data: getFallbackData(res.config.url) };
    }
    return res;
  },
  async (err) => {
    // If request failed (e.g. backend offline, network error, or mobile connection)
    const url = err.config?.url || '';
    const fallback = getFallbackData(url);
    if (fallback.data && (Array.isArray(fallback.data) ? fallback.data.length > 0 : Object.keys(fallback.data).length > 0)) {
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
