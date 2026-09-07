import { v4 as uuidv4 } from 'uuid';
import { getDb, COLLECTIONS } from '../config/firebase';
import { RiskAssessment, Alert, Notification, SystemSettings } from '../types';
import { logger } from '../utils/logger';

const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between alerts for same location

export async function checkAndGenerateAlert(
  assessment: RiskAssessment,
  settings: SystemSettings
): Promise<Alert | null> {
  const db = getDb();

  // Only generate alerts for HIGH and CRITICAL
  if (assessment.riskLevel !== 'HIGH' && assessment.riskLevel !== 'CRITICAL') {
    return null;
  }

  // Check for recent open alert at this location
  const recentAlerts = await db
    .collection(COLLECTIONS.ALERTS)
    .where('locationId', '==', assessment.locationId)
    .where('status', 'in', ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'])
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!recentAlerts.empty) {
    const lastAlert = recentAlerts.docs[0].data() as Alert;
    const lastAlertAge = Date.now() - new Date(lastAlert.createdAt).getTime();

    if (lastAlertAge < ALERT_COOLDOWN_MS) {
      logger.debug(`Alert suppressed for ${assessment.locationId} — recent alert within cooldown`);
      return null;
    }
  }

  // Determine threshold used
  const threshold =
    assessment.riskLevel === 'CRITICAL'
      ? settings.alertThresholds.critical
      : settings.alertThresholds.high;

  // Build alert reason
  const topFactors = assessment.explanation
    .slice(0, 3)
    .filter((f) => f.label === 'HIGH' || f.label === 'MODERATE')
    .map((f) => f.factor)
    .join(', ');

  const reason =
    topFactors ||
    `Risk score ${assessment.finalScore.toFixed(1)} exceeds ${assessment.riskLevel} threshold`;

  const alert: Alert = {
    id: uuidv4(),
    locationId: assessment.locationId,
    locationName: assessment.locationName,
    district: assessment.district,
    state: assessment.state,
    riskScore: assessment.finalScore,
    riskLevel: assessment.riskLevel,
    triggerThreshold: threshold,
    reason,
    explanation: assessment.explanation,
    status: 'NEW',
    createdAt: new Date().toISOString(),
    source: 'RISK_ENGINE',
    isDemo: assessment.isDemo,
  };

  // Persist to Firestore
  await db.collection(COLLECTIONS.ALERTS).doc(alert.id).set(JSON.parse(JSON.stringify(alert)));
  logger.info(`Alert generated: ${alert.id} for ${alert.locationName} — ${alert.riskLevel}`);

  // Create in-app notifications
  await createNotifications(alert, db);

  return alert;
}

async function createNotifications(
  alert: Alert,
  db: FirebaseFirestore.Firestore
): Promise<void> {
  const notification: Notification = {
    id: uuidv4(),
    userId: 'all',
    type: alert.riskLevel === 'CRITICAL' ? 'warning' : 'alert',
    channel: 'in-app',
    title: `${alert.riskLevel} Landslide Risk — ${alert.locationName}`,
    body: `Risk score ${alert.riskScore.toFixed(1)}/100. ${alert.reason}`,
    relatedAlertId: alert.id,
    relatedLocationId: alert.locationId,
    isRead: false,
    createdAt: new Date().toISOString(),
    deliveryStatus: 'delivered',
  };

  await db.collection(COLLECTIONS.NOTIFICATIONS).doc(notification.id).set(JSON.parse(JSON.stringify(notification)));
}

export async function updateAlertStatus(
  alertId: string,
  newStatus: Alert['status'],
  userId: string,
  userEmail: string,
  notes?: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const updates: Partial<Alert> & Record<string, unknown> = { status: newStatus };

  if (newStatus === 'ACKNOWLEDGED') {
    updates.acknowledgedAt = now;
    updates.acknowledgedBy = userEmail;
  } else if (newStatus === 'INVESTIGATING') {
    updates.investigatedAt = now;
    updates.investigatedBy = userEmail;
  } else if (newStatus === 'RESOLVED') {
    updates.resolvedAt = now;
    updates.resolvedBy = userEmail;
    if (notes) updates.resolutionNotes = notes;
  }

  await db.collection(COLLECTIONS.ALERTS).doc(alertId).update(updates);
  logger.info(`Alert ${alertId} updated to ${newStatus} by ${userEmail}`);
}
