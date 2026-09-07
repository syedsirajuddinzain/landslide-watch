import axios from 'axios';
import { getDb, COLLECTIONS } from '../config/firebase';
import { env } from '../config/env';
import { InfrastructureData, DrainageData, InfrastructureItem } from '../types';
import { logger } from '../utils/logger';

interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassWay {
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: Array<OverpassNode | OverpassWay>;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function overpassQuery(query: string): Promise<OverpassResponse> {
  const res = await axios.post(
    env.OVERPASS_URL,
    `data=${encodeURIComponent(query)}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    }
  );
  return res.data;
}

export async function fetchInfrastructureForLocation(
  locationId: string,
  lat: number,
  lon: number,
  radiusMeters = 5000
): Promise<{ infrastructure: InfrastructureData; drainage: DrainageData }> {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="school"](around:${radiusMeters},${lat},${lon});
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
  node["amenity"="clinic"](around:${radiusMeters},${lat},${lon});
  node["bridge"="yes"](around:${radiusMeters},${lat},${lon});
  way["highway"~"primary|secondary|tertiary|trunk"](around:${radiusMeters},${lat},${lon});
  way["waterway"~"river|stream|canal"](around:${radiusMeters},${lat},${lon});
  node["waterway"~"river|stream"](around:${radiusMeters},${lat},${lon});
  node["place"~"village|town|hamlet"](around:${radiusMeters},${lat},${lon});
);
out body geom;
`;

  const now = new Date().toISOString();
  let data: OverpassResponse;

  try {
    data = await overpassQuery(query);
  } catch (err) {
    logger.error(`Overpass API failed for location ${locationId}`, { error: err });
    // Return empty but valid structures
    return {
      infrastructure: {
        locationId,
        roads: [],
        bridges: [],
        schools: [],
        hospitals: [],
        settlements: [],
        source: 'OSM (fetch failed)',
        fetchedAt: now,
        qualityFlag: 'ERROR',
      },
      drainage: {
        locationId,
        nearestRiver: null,
        nearestStream: null,
        drainageDensity: 0,
        source: 'OSM (fetch failed)',
        qualityFlag: 'ERROR',
      },
    };
  }

  const schools: InfrastructureItem[] = [];
  const hospitals: InfrastructureItem[] = [];
  const bridges: InfrastructureItem[] = [];
  const roads: InfrastructureItem[] = [];
  const settlements: Array<{ name: string; population?: number; distanceKm: number }> = [];
  const rivers: Array<{ name: string; distanceKm: number }> = [];
  const streams: Array<{ distanceKm: number }> = [];

  for (const el of data.elements) {
    const tags = el.tags || {};
    const nodeLat = (el as OverpassNode).lat;
    const nodeLon = (el as OverpassNode).lon;

    // Get representative coords
    let elLat = nodeLat;
    let elLon = nodeLon;
    if (!elLat && (el as OverpassWay).geometry?.length) {
      const geom = (el as OverpassWay).geometry![0];
      elLat = geom.lat;
      elLon = geom.lon;
    }

    const distKm = elLat && elLon ? haversineKm(lat, lon, elLat, elLon) : radiusMeters / 1000;

    if (tags.amenity === 'school') {
      schools.push({
        osmId: String(el.id),
        name: tags.name || 'School',
        type: 'school',
        distanceKm: Math.round(distKm * 100) / 100,
        coordinates: elLat ? { lat: elLat, lon: elLon } : undefined,
      });
    } else if (tags.amenity === 'hospital' || tags.amenity === 'clinic') {
      hospitals.push({
        osmId: String(el.id),
        name: tags.name || tags.amenity,
        type: tags.amenity,
        distanceKm: Math.round(distKm * 100) / 100,
        coordinates: elLat ? { lat: elLat, lon: elLon } : undefined,
      });
    } else if (tags.bridge === 'yes') {
      bridges.push({
        osmId: String(el.id),
        name: tags.name || 'Bridge',
        type: 'bridge',
        distanceKm: Math.round(distKm * 100) / 100,
        coordinates: elLat ? { lat: elLat, lon: elLon } : undefined,
      });
    } else if (tags.highway) {
      roads.push({
        osmId: String(el.id),
        type: tags.highway,
        distanceKm: Math.round(distKm * 100) / 100,
      });
    } else if (tags.waterway === 'river' || tags.waterway === 'canal') {
      rivers.push({ name: tags.name || 'River', distanceKm: Math.round(distKm * 100) / 100 });
    } else if (tags.waterway === 'stream') {
      streams.push({ distanceKm: Math.round(distKm * 100) / 100 });
    } else if (tags.place) {
      settlements.push({
        name: tags.name || tags.place,
        population: tags.population ? parseInt(tags.population) : undefined,
        distanceKm: Math.round(distKm * 100) / 100,
      });
    }
  }

  // Sort by distance
  rivers.sort((a, b) => a.distanceKm - b.distanceKm);
  streams.sort((a, b) => a.distanceKm - b.distanceKm);
  schools.sort((a, b) => a.distanceKm - b.distanceKm);
  hospitals.sort((a, b) => a.distanceKm - b.distanceKm);

  const infrastructure: InfrastructureData = {
    locationId,
    roads: roads.slice(0, 20),
    bridges: bridges.slice(0, 10),
    schools: schools.slice(0, 10),
    hospitals: hospitals.slice(0, 10),
    settlements: settlements.slice(0, 15),
    source: 'OpenStreetMap (Overpass API)',
    fetchedAt: now,
    qualityFlag: 'GOOD',
  };

  const drainageDensity = (rivers.length + streams.length) / (radiusMeters / 1000) ** 2;

  const drainage: DrainageData = {
    locationId,
    nearestRiver: rivers.length > 0 ? rivers[0] : null,
    nearestStream: streams.length > 0 ? streams[0] : null,
    drainageDensity: Math.round(drainageDensity * 100) / 100,
    source: 'OpenStreetMap (Overpass API)',
    qualityFlag: 'GOOD',
  };

  return { infrastructure, drainage };
}

export async function fetchAndStoreOSMForLocation(
  locationId: string,
  lat: number,
  lon: number
): Promise<void> {
  const db = getDb();
  logger.info(`Fetching OSM data for ${locationId} at (${lat}, ${lon})`);

  const { infrastructure, drainage } = await fetchInfrastructureForLocation(locationId, lat, lon);

  await Promise.all([
    db.collection(COLLECTIONS.INFRASTRUCTURE).doc(locationId).set(infrastructure),
    db.collection(COLLECTIONS.DRAINAGE).doc(locationId).set(drainage),
  ]);

  logger.info(`OSM data stored for ${locationId}: ${infrastructure.roads.length} roads, ${infrastructure.schools.length} schools, ${infrastructure.hospitals.length} hospitals`);
}
