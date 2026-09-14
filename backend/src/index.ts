import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initFirebase, getDb, COLLECTIONS } from './config/firebase';
import { env } from './config/env';
import { logger } from './utils/logger';

// Routes
import locationRoutes from './routes/locations';
import riskRoutes from './routes/risk';
import alertRoutes from './routes/alerts';
import responseRoutes from './routes/response';
import simulationRoutes from './routes/simulation';
import citizenRoutes from './routes/citizen';
import {
  rainfallRouter,
  terrainRouter,
  soilRouter,
  landslidesRouter,
  infraRouter,
  analyticsRouter,
  notifRouter,
  datasourcesRouter,
  adminRouter,
} from './routes/combined';

// Scheduler
import { startScheduler } from './ingestion/scheduler';

async function bootstrap(): Promise<void> {
  // Init Firebase
  initFirebase();
  const db = getDb();

  // Seed initial data sources config
  await seedDataSources(db);

  // Seed global settings if missing
  const settingsSnap = await db.collection(COLLECTIONS.SETTINGS).doc('global').get();
  if (!settingsSnap.exists) {
    await db.collection(COLLECTIONS.SETTINGS).doc('global').set({
      riskWeights: { rainfall: 0.35, slope: 0.25, soil: 0.15, landCover: 0.10, drainage: 0.10, historical: 0.05 },
      alertThresholds: { moderate: 40, high: 65, critical: 80 },
      ingestionIntervalMinutes: env.RAINFALL_INGESTION_INTERVAL_MINUTES,
      demoMode: env.DEMO_MODE,
      systemVersion: '1.0.0',
    });
    logger.info('Global settings initialized');
  }

  // Express app
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('combined', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Health check (no auth)
  app.get('/health', async (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      firebase: 'connected',
    });
  });

  // API Routes
  app.use('/api/locations', locationRoutes);
  app.use('/api/risk', riskRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/response', responseRoutes);
  app.use('/api/citizen', citizenRoutes);
  app.use('/api/simulation', simulationRoutes);
  app.use('/api/rainfall', rainfallRouter);
  app.use('/api/terrain', terrainRouter);
  app.use('/api/soil', soilRouter);
  app.use('/api/landslides', landslidesRouter);
  app.use('/api/infrastructure', infraRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/notifications', notifRouter);
  app.use('/api/datasources', datasourcesRouter);
  app.use('/api/admin', adminRouter);

  // Manual ingestion trigger
  app.post('/api/ingestion/trigger', async (req, res) => {
    try {
      const { triggerManualIngestion } = await import('./ingestion/scheduler');
      const result = await triggerManualIngestion();
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // Start server
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Landslide Watch API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Start background scheduler
  startScheduler();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

async function seedDataSources(db: FirebaseFirestore.Firestore): Promise<void> {
  const sources = [
    { id: 'open-meteo', name: 'Open-Meteo Weather API', type: 'live', url: 'https://open-meteo.com/', updateFrequency: 'Every 30 minutes', status: 'LIVE', coverage: 'Global (NER India focus)', qualityNotes: 'Free public API, no key required', lastSuccessAt: null, lastAttemptAt: null },
    { id: 'opentopodata-srtm', name: 'OpenTopoData SRTM 90m', type: 'static', url: 'https://api.opentopodata.org/', updateFrequency: 'One-time initialization', status: 'STATIC', coverage: 'Global', qualityNotes: '90m resolution DEM via public API', lastSuccessAt: null, lastAttemptAt: null },
    { id: 'soilgrids', name: 'ISRIC SoilGrids v2', type: 'static', url: 'https://www.isric.org/explore/soilgrids', updateFrequency: 'One-time initialization', status: 'STATIC', coverage: 'Global', qualityNotes: 'Free REST API, property values at depth intervals', lastSuccessAt: null, lastAttemptAt: null },
    { id: 'osm-overpass', name: 'OpenStreetMap (Overpass API)', type: 'static', url: 'https://overpass-api.de/', updateFrequency: 'One-time initialization', status: 'STATIC', coverage: 'Global', qualityNotes: 'Roads, rivers, infrastructure, settlements', lastSuccessAt: null, lastAttemptAt: null },
    { id: 'nasa-coolr', name: 'NASA COOLR Landslide Catalog', type: 'static', url: 'https://gis.earthdata.nasa.gov/', updateFrequency: 'One-time initialization + periodic refresh', status: 'STATIC', coverage: 'Global (India coverage available)', qualityNotes: 'Public ArcGIS REST API, no key required', lastSuccessAt: null, lastAttemptAt: null },
    { id: 'firebase-firestore', name: 'Firebase Firestore', type: 'live', url: 'https://firebase.google.com/', updateFrequency: 'Real-time', status: 'LIVE', coverage: 'Application database', qualityNotes: 'Primary persistent database for all application data', lastSuccessAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString() },
  ];

  const batch = db.batch();
  for (const s of sources) {
    const ref = db.collection(COLLECTIONS.DATA_SOURCES).doc(s.id);
    const existing = await ref.get();
    if (!existing.exists) batch.set(ref, s);
  }
  await batch.commit();
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
