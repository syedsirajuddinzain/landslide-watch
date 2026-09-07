import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { getDb, COLLECTIONS } from '../config/firebase';
import { env } from '../config/env';
import { ingestRainfallAllLocations } from './rainfallIngestion';
import { runRiskCalculationAllLocations } from '../engine/riskOrchestrator';
import { logger } from '../utils/logger';

let rainfallJob: cron.ScheduledTask | null = null;

async function recordJobStart(jobType: string): Promise<string> {
  const db = getDb();
  const jobId = uuidv4();
  await db.collection(COLLECTIONS.INGESTION_JOBS).doc(jobId).set({
    id: jobId,
    jobType,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
    locationsProcessed: 0,
    errors: [],
    triggeredBy: 'scheduler',
  });
  return jobId;
}

async function recordJobComplete(
  jobId: string,
  success: number,
  errors: string[]
): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.INGESTION_JOBS).doc(jobId).update({
    completedAt: new Date().toISOString(),
    status: errors.length === 0 ? 'success' : 'partial',
    locationsProcessed: success,
    errors: errors.slice(0, 20), // cap error list
  });
}

async function recordJobFailed(jobId: string, error: string): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.INGESTION_JOBS).doc(jobId).update({
    completedAt: new Date().toISOString(),
    status: 'failed',
    errors: [error],
  });
}

async function runRainfallAndRiskCycle(): Promise<void> {
  const jobId = await recordJobStart('rainfall_and_risk');
  logger.info('Starting scheduled rainfall ingestion + risk calculation cycle');

  try {
    // Step 1: Ingest rainfall
    const rainfallResult = await ingestRainfallAllLocations();

    // Step 2: Recalculate risk for all locations
    const riskResult = await runRiskCalculationAllLocations();

    await recordJobComplete(jobId, rainfallResult.success, [
      ...rainfallResult.errors,
      ...riskResult.errors,
    ]);

    logger.info(
      `Cycle complete. Rainfall: ${rainfallResult.success} OK / ${rainfallResult.failed} failed. Risk: ${riskResult.success} calculated.`
    );

    // Update data source status
    const db = getDb();
    await db.collection(COLLECTIONS.DATA_SOURCES).doc('open-meteo').update({
      lastSuccessAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      status: rainfallResult.failed === 0 ? 'LIVE' : 'STALE',
    });
  } catch (err) {
    logger.error('Rainfall/risk cycle failed', { error: err });
    await recordJobFailed(jobId, String(err));
  }
}

export function startScheduler(): void {
  // Run immediately on startup
  setTimeout(() => {
    runRainfallAndRiskCycle().catch((err) => {
      logger.error('Initial cycle failed', { error: err });
    });
  }, 5000); // 5 second delay for Firebase to initialize

  // Schedule recurring job
  const intervalMinutes = env.RAINFALL_INGESTION_INTERVAL_MINUTES;
  const cronExpression = `*/${intervalMinutes} * * * *`;

  rainfallJob = cron.schedule(cronExpression, () => {
    runRainfallAndRiskCycle().catch((err) => {
      logger.error('Scheduled cycle error', { error: err });
    });
  });

  logger.info(`Scheduler started. Rainfall/risk cycle every ${intervalMinutes} minutes.`);
}

export function stopScheduler(): void {
  if (rainfallJob) {
    rainfallJob.stop();
    logger.info('Scheduler stopped');
  }
}

// Allow manual trigger from API
export async function triggerManualIngestion(): Promise<{
  rainfallSuccess: number;
  riskSuccess: number;
  errors: string[];
}> {
  const rainfallResult = await ingestRainfallAllLocations();
  const riskResult = await runRiskCalculationAllLocations();

  return {
    rainfallSuccess: rainfallResult.success,
    riskSuccess: riskResult.success,
    errors: [...rainfallResult.errors, ...riskResult.errors],
  };
}
