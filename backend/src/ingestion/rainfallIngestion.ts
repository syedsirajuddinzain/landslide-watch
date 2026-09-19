import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getDb, COLLECTIONS } from '../config/firebase';
import { env } from '../config/env';
import { RainfallObservation, ForecastData, ForecastHour, DataQuality } from '../types';
import { logger } from '../utils/logger';

interface OpenMeteoCurrentResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    precipitation: number; // mm
    rain: number;
    apparent_temperature: number;
  };
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
  };
}

interface OpenMeteoArchiveResponse {
  hourly: {
    time: string[];
    precipitation: number[];
  };
}

interface Location {
  id: string;
  name: string;
  district: string;
  coordinates: { lat: number; lon: number };
}

export async function fetchRainfallForLocation(location: Location): Promise<{
  observation: RainfallObservation | null;
  forecast: ForecastData | null;
}> {
  const { lat, lon } = location.coordinates;

  try {
    // Fetch current conditions + hourly forecast
    const currentRes = await axios.get(env.OPEN_METEO_BASE_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'precipitation,rain',
        hourly: 'precipitation,precipitation_probability',
        timezone: 'Asia/Kolkata',
        forecast_days: 3,
      },
      timeout: 10000,
    });

    const currentData: OpenMeteoCurrentResponse = currentRes.data;

    // Fetch archive for past 72h
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const archiveRes = await axios.get(env.OPEN_METEO_ARCHIVE_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        start_date: threeDaysAgo.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
        hourly: 'precipitation',
        timezone: 'Asia/Kolkata',
      },
      timeout: 10000,
    });

    const archiveData: OpenMeteoArchiveResponse = archiveRes.data;

    // Calculate 24h and 72h cumulative from archive
    const archiveTimes = archiveData.hourly.time;
    const archivePrecip = archiveData.hourly.precipitation;

    let cumulative24h = 0;
    let cumulative72h = 0;

    for (let i = 0; i < archiveTimes.length; i++) {
      const t = new Date(archiveTimes[i]).getTime();
      const p = archivePrecip[i] || 0;
      if (t >= threeDaysAgo.getTime()) cumulative72h += p;
      if (t >= oneDayAgo.getTime()) cumulative24h += p;
    }

    const currentPrecip_mm = currentData.current.precipitation || 0;

    const observation: RainfallObservation = {
      id: uuidv4(),
      locationId: location.id,
      timestamp: new Date().toISOString(),
      current_mmph: currentPrecip_mm, // Open-Meteo returns mm per hour for current
      intensity: classifyIntensity(currentPrecip_mm),
      cumulative_24h_mm: Math.round(cumulative24h * 10) / 10,
      cumulative_72h_mm: Math.round(cumulative72h * 10) / 10,
      source: 'Open-Meteo',
      qualityFlag: 'GOOD' as DataQuality,
      ingestedAt: new Date().toISOString(),
    };

    // Build forecast (next 72h hourly)
    const forecastHours: ForecastHour[] = currentData.hourly.time
      .slice(0, 72)
      .map((timeStr, idx) => ({
        hour: idx,
        precipitation_mm: currentData.hourly.precipitation[idx] || 0,
        probability: currentData.hourly.precipitation_probability[idx] || 0,
      }));

    const next6h_mm = forecastHours.slice(0, 6).reduce((s, h) => s + h.precipitation_mm, 0);
    const next12h_mm = forecastHours.slice(0, 12).reduce((s, h) => s + h.precipitation_mm, 0);
    const next24h_mm = forecastHours.slice(0, 24).reduce((s, h) => s + h.precipitation_mm, 0);
    const next36h_mm = forecastHours.slice(0, 36).reduce((s, h) => s + h.precipitation_mm, 0);
    const next48h_mm = forecastHours.slice(0, 48).reduce((s, h) => s + h.precipitation_mm, 0);
    const next72h_mm = forecastHours.slice(0, 72).reduce((s, h) => s + h.precipitation_mm, 0);

    const forecast: ForecastData = {
      locationId: location.id,
      generatedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      hourly: forecastHours,
      next6h_mm: Math.round(next6h_mm * 10) / 10,
      next12h_mm: Math.round(next12h_mm * 10) / 10,
      next24h_mm: Math.round(next24h_mm * 10) / 10,
      next36h_mm: Math.round(next36h_mm * 10) / 10,
      next48h_mm: Math.round(next48h_mm * 10) / 10,
      next72h_mm: Math.round(next72h_mm * 10) / 10,
      qualityFlag: 'GOOD' as DataQuality,
    };

    return { observation, forecast };
  } catch (err) {
    logger.error(`Failed to fetch rainfall for ${location.name}`, { error: err });
    return { observation: null, forecast: null };
  }
}

function classifyIntensity(mmph: number): RainfallObservation['intensity'] {
  if (mmph === 0) return 'none';
  if (mmph < 2.5) return 'light';
  if (mmph < 7.5) return 'moderate';
  if (mmph < 20) return 'heavy';
  return 'extreme';
}

export async function ingestRainfallAllLocations(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const db = getDb();
  const results = { success: 0, failed: 0, errors: [] as string[] };

  const locationsSnap = await db
    .collection(COLLECTIONS.LOCATIONS)
    .where('isActive', '==', true)
    .get();

  const locations = locationsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Location[];

  logger.info(`Starting rainfall ingestion for ${locations.length} locations`);

  // Process in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (location) => {
        try {
          const { observation, forecast } = await fetchRainfallForLocation(location);

          if (observation) {
            // Store rainfall observation
            await db
              .collection(COLLECTIONS.RAINFALL)
              .doc(`${location.id}_${Date.now()}`)
              .set(observation);

            // Store/update forecast
            if (forecast) {
              await db
                .collection(COLLECTIONS.FORECASTS)
                .doc(location.id)
                .set(forecast);
            }

            results.success++;
          } else {
            results.failed++;
            results.errors.push(`No data returned for ${location.name}`);
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`${location.name}: ${String(err)}`);
        }
      })
    );

    // Small delay between batches
    if (i + BATCH_SIZE < locations.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  logger.info(`Rainfall ingestion complete. Success: ${results.success}, Failed: ${results.failed}`);
  return results;
}
