import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function parsePrivateKey(rawKey: string): string {
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

export const env = {
  PORT: parseInt(optionalEnv('PORT', '4000'), 10),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  IS_PROD: process.env.NODE_ENV === 'production',

  // Firebase
  FIREBASE_PROJECT_ID: requireEnv('FIREBASE_PROJECT_ID'),
  FIREBASE_PRIVATE_KEY_ID: requireEnv('FIREBASE_PRIVATE_KEY_ID'),
  FIREBASE_PRIVATE_KEY: parsePrivateKey(requireEnv('FIREBASE_PRIVATE_KEY')),
  FIREBASE_CLIENT_EMAIL: requireEnv('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_CLIENT_ID: requireEnv('FIREBASE_CLIENT_ID'),

  // GIS microservice
  GIS_SERVICE_URL: optionalEnv('GIS_SERVICE_URL', 'http://localhost:5001'),

  // External APIs
  OPEN_METEO_BASE_URL: optionalEnv('OPEN_METEO_BASE_URL', 'https://api.open-meteo.com/v1/forecast'),
  OPEN_METEO_ARCHIVE_URL: optionalEnv('OPEN_METEO_ARCHIVE_URL', 'https://archive-api.open-meteo.com/v1/archive'),
  COOLR_API_URL: optionalEnv('COOLR_API_URL', 'https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Reports_Points/FeatureServer/0/query'),
  OPENTOPODATA_URL: optionalEnv('OPENTOPODATA_URL', 'https://api.opentopodata.org/v1/srtm90m'),
  SOILGRIDS_URL: optionalEnv('SOILGRIDS_URL', 'https://rest.isric.org/soilgrids/v2.0/properties/query'),
  OVERPASS_URL: optionalEnv('OVERPASS_URL', 'https://overpass-api.de/api/interpreter'),

  // Scheduler
  RAINFALL_INGESTION_INTERVAL_MINUTES: parseInt(optionalEnv('RAINFALL_INGESTION_INTERVAL_MINUTES', '30'), 10),
  FORECAST_INGESTION_INTERVAL_HOURS: parseInt(optionalEnv('FORECAST_INGESTION_INTERVAL_HOURS', '3'), 10),

  // Risk thresholds
  ALERT_THRESHOLD_MODERATE: parseFloat(optionalEnv('DEFAULT_ALERT_THRESHOLD_MODERATE', '40')),
  ALERT_THRESHOLD_HIGH: parseFloat(optionalEnv('DEFAULT_ALERT_THRESHOLD_HIGH', '65')),
  ALERT_THRESHOLD_CRITICAL: parseFloat(optionalEnv('DEFAULT_ALERT_THRESHOLD_CRITICAL', '80')),

  // Demo
  DEMO_MODE: optionalEnv('DEMO_MODE', 'false') === 'true',

  // Optional
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',

  // CORS
  CORS_ORIGINS: optionalEnv('CORS_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),
};
