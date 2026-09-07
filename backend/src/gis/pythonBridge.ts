import axios from 'axios';
import { env } from '../config/env';
import { TerrainData, SoilData, LandCoverData } from '../types';
import { logger } from '../utils/logger';

const GIS = () => axios.create({ baseURL: env.GIS_SERVICE_URL, timeout: 30000 });

export async function fetchTerrainFromGIS(
  locationId: string,
  lat: number,
  lon: number
): Promise<TerrainData | null> {
  try {
    const res = await GIS().post('/process-dem', { locationId, lat, lon });
    return res.data as TerrainData;
  } catch (err) {
    logger.warn(`GIS terrain fetch failed for ${locationId}. Falling back to OpenTopoData.`, { error: err });
    return fetchTerrainFromOpenTopoData(locationId, lat, lon);
  }
}

export async function fetchSoilFromGIS(
  locationId: string,
  lat: number,
  lon: number
): Promise<SoilData | null> {
  try {
    const res = await GIS().post('/soil', { locationId, lat, lon });
    return res.data as SoilData;
  } catch (err) {
    logger.warn(`GIS soil fetch failed for ${locationId}. Falling back to SoilGrids API.`, { error: err });
    return fetchSoilFromSoilGrids(locationId, lat, lon);
  }
}

export async function fetchLandCoverFromGIS(
  locationId: string,
  lat: number,
  lon: number
): Promise<LandCoverData | null> {
  try {
    const res = await GIS().post('/landcover', { locationId, lat, lon });
    return res.data as LandCoverData;
  } catch (err) {
    logger.warn(`GIS land cover fetch failed for ${locationId}.`, { error: err });
    return null;
  }
}

// ---- Fallback: OpenTopoData (no key needed, free, 1000 req/day) ----
async function fetchTerrainFromOpenTopoData(
  locationId: string,
  lat: number,
  lon: number
): Promise<TerrainData | null> {
  // Sample a small grid around the location to estimate slope
  const offsets = [
    [0, 0], [0.005, 0], [-0.005, 0], [0, 0.005], [0, -0.005],
    [0.003, 0.003], [-0.003, 0.003], [0.003, -0.003], [-0.003, -0.003],
  ];

  const locationsStr = offsets
    .map(([dlat, dlon]) => `${(lat + dlat).toFixed(5)},${(lon + dlon).toFixed(5)}`)
    .join('|');

  try {
    const res = await axios.get(`${env.OPENTOPODATA_URL}`, {
      params: { locations: locationsStr, interpolation: 'bilinear' },
      timeout: 15000,
    });

    const elevations: number[] = res.data.results.map((r: { elevation: number | null }) => r.elevation ?? 0);
    const centerElev = elevations[0];

    // Estimate slope from elevation differences over known distances
    // Each 0.005° ≈ 556m at equator; adjusted for lat
    const latScale = Math.cos((lat * Math.PI) / 180) * 111000; // m per degree lon
    const latDist = 0.005 * 111000; // m per degree lat
    const lonDist = 0.005 * latScale;

    const slopes: number[] = [];
    // N-S pairs (indices 1,2 are ±lat)
    if (elevations[1] !== undefined && elevations[2] !== undefined) {
      slopes.push(Math.abs((elevations[1] - elevations[2]) / (2 * latDist)) * 180 / Math.PI);
    }
    // E-W pairs (indices 3,4 are ±lon)
    if (elevations[3] !== undefined && elevations[4] !== undefined) {
      slopes.push(Math.abs((elevations[3] - elevations[4]) / (2 * lonDist)) * 180 / Math.PI);
    }

    const avgSlope = slopes.length > 0 ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 15;
    const maxSlope = slopes.length > 0 ? Math.max(...slopes) * 1.3 : 20; // estimated max

    const slopeSusceptibility = computeSlopeSusceptibility(avgSlope);

    return {
      locationId,
      elevation_m: Math.round(centerElev),
      avgSlope_deg: Math.round(avgSlope * 10) / 10,
      maxSlope_deg: Math.round(maxSlope * 10) / 10,
      slopeSusceptibility,
      dem_source: 'OpenTopoData (SRTM 90m)',
      processedAt: new Date().toISOString(),
      qualityFlag: 'GOOD',
    };
  } catch (err) {
    logger.error(`OpenTopoData also failed for ${locationId}`, { error: err });
    // Return estimated values based on NER's typical terrain
    return {
      locationId,
      elevation_m: 500,
      avgSlope_deg: 18,
      maxSlope_deg: 28,
      slopeSusceptibility: 0.55,
      dem_source: 'Estimated (NER typical)',
      processedAt: new Date().toISOString(),
      qualityFlag: 'ESTIMATED',
    };
  }
}

function computeSlopeSusceptibility(slopeDeg: number): number {
  if (slopeDeg <= 5) return 0.1;
  if (slopeDeg <= 15) return 0.3;
  if (slopeDeg <= 25) return 0.6;
  if (slopeDeg <= 35) return 0.85;
  return 1.0;
}

// ---- Fallback: SoilGrids API ----
async function fetchSoilFromSoilGrids(
  locationId: string,
  lat: number,
  lon: number
): Promise<SoilData | null> {
  try {
    const properties = ['clay', 'sand', 'silt', 'bdod', 'soc'];
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      number_of_nearest_neighbours: '1',
    });
    properties.forEach((p) => params.append('property', p));
    params.append('depth', '0-5cm');
    params.append('value', 'mean');

    const res = await axios.get(
      `${env.SOILGRIDS_URL}?${params.toString()}`,
      { timeout: 15000 }
    );

    const layers = res.data.properties?.layers || [];
    const getValue = (name: string): number => {
      const layer = layers.find((l: { name: string; depths: Array<{ values: { mean: number | null } }> }) => l.name === name);
      return layer?.depths?.[0]?.values?.mean ?? null;
    };

    // SoilGrids returns values in specific units, convert to %
    const clay_raw = getValue('clay'); // g/kg * 10 = %
    const sand_raw = getValue('sand');
    const silt_raw = getValue('silt');
    const bdod_raw = getValue('bdod'); // cg/cm³ → g/cm³ / 100
    const soc_raw = getValue('soc');   // dg/kg → g/kg / 10

    const clay_pct = clay_raw ? clay_raw / 10 : 25;
    const sand_pct = sand_raw ? sand_raw / 10 : 45;
    const silt_pct = silt_raw ? silt_raw / 10 : 30;
    const bulkDensity = bdod_raw ? bdod_raw / 100 : 1.3;
    const organicCarbon = soc_raw ? soc_raw / 10 : 2.0;

    const soilSusceptibility = computeSoilSusceptibility(clay_pct, bulkDensity, organicCarbon);
    const soilType = classifySoilType(clay_pct, sand_pct, silt_pct);
    const waterRetentionIndex = (clay_pct * 0.5 + silt_pct * 0.3) / 100;

    return {
      locationId,
      soilType,
      clay_pct: Math.round(clay_pct * 10) / 10,
      sand_pct: Math.round(sand_pct * 10) / 10,
      silt_pct: Math.round(silt_pct * 10) / 10,
      bulkDensity: Math.round(bulkDensity * 100) / 100,
      organicCarbon: Math.round(organicCarbon * 10) / 10,
      waterRetentionIndex: Math.round(waterRetentionIndex * 100) / 100,
      soilSusceptibility,
      source: 'ISRIC SoilGrids v2',
      fetchedAt: new Date().toISOString(),
      qualityFlag: 'GOOD',
    };
  } catch (err) {
    logger.error(`SoilGrids also failed for ${locationId}`, { error: err });
    return {
      locationId,
      soilType: 'Unknown (Estimated)',
      clay_pct: 30,
      sand_pct: 40,
      silt_pct: 30,
      bulkDensity: 1.3,
      organicCarbon: 2.0,
      waterRetentionIndex: 0.5,
      soilSusceptibility: 0.5,
      source: 'Estimated (SoilGrids unavailable)',
      fetchedAt: new Date().toISOString(),
      qualityFlag: 'ESTIMATED',
    };
  }
}

function computeSoilSusceptibility(clay: number, bd: number, oc: number): number {
  // Higher clay → more plastic, higher susceptibility when wet
  const clayScore = Math.min(clay / 50, 1);
  // Lower bulk density → looser material → higher susceptibility
  const bdScore = Math.max(0, (1.8 - bd) / 1.0);
  // Lower organic carbon → less cohesion → slightly higher susceptibility
  const ocScore = Math.max(0, 1 - oc / 10);
  const raw = 0.5 * clayScore + 0.3 * bdScore + 0.2 * ocScore;
  return Math.round(Math.min(raw, 1) * 100) / 100;
}

function classifySoilType(clay: number, sand: number, silt: number): string {
  if (clay > 40) return 'Clay';
  if (sand > 70) return 'Sandy';
  if (silt > 50) return 'Silty';
  if (clay > 25 && sand > 25) return 'Sandy Clay Loam';
  if (clay > 20) return 'Clay Loam';
  return 'Loam';
}
