import admin from 'firebase-admin';
import { env } from './env';

let app: admin.app.App;

export function initFirebase(): admin.app.App {
  if (!admin.apps.length) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKeyId: env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        clientId: env.FIREBASE_CLIENT_ID,
      } as admin.ServiceAccount),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  } else {
    app = admin.apps[0]!;
  }
  return app;
}

export function getDb(): FirebaseFirestore.Firestore {
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  return admin.auth();
}

// Collection name constants
export const COLLECTIONS = {
  USERS: 'users',
  LOCATIONS: 'locations',
  TERRAIN: 'terrain',
  SOIL: 'soil',
  LAND_COVER: 'land_cover',
  DRAINAGE: 'drainage',
  RAINFALL: 'rainfall',
  FORECASTS: 'forecasts',
  HISTORICAL_LANDSLIDES: 'historical_landslides',
  INFRASTRUCTURE: 'infrastructure',
  RISK_ASSESSMENTS: 'risk_assessments',
  ALERTS: 'alerts',
  RESPONSE_ACTIONS: 'response_actions',
  FIELD_VERIFICATIONS: 'field_verifications',
  NOTIFICATIONS: 'notifications',
  DATA_SOURCES: 'data_sources',
  INGESTION_JOBS: 'ingestion_jobs',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
  CITIZEN_REPORTS: 'citizen_reports',
} as const;
