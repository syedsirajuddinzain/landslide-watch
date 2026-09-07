import { DataQuality } from '../types';

const STALE_THRESHOLDS = {
  rainfall: 2 * 60 * 60 * 1000,   // 2 hours
  forecast: 6 * 60 * 60 * 1000,   // 6 hours
  terrain: 365 * 24 * 60 * 60 * 1000, // 1 year (static)
  soil: 365 * 24 * 60 * 60 * 1000,    // 1 year (static)
};

export function assessDataQuality(
  lastFetchedAt: string | null,
  dataType: keyof typeof STALE_THRESHOLDS,
  hasError = false,
  isEstimated = false,
  isSimulated = false
): DataQuality {
  if (isSimulated) return 'SIMULATED';
  if (hasError) return 'ERROR';
  if (!lastFetchedAt) return 'MISSING';
  if (isEstimated) return 'ESTIMATED';

  const age = Date.now() - new Date(lastFetchedAt).getTime();
  const threshold = STALE_THRESHOLDS[dataType];

  if (age > threshold) return 'STALE';
  return 'GOOD';
}

export function overallQuality(qualities: DataQuality[]): DataQuality {
  if (qualities.includes('ERROR')) return 'ERROR';
  if (qualities.includes('MISSING')) return 'MISSING';
  if (qualities.includes('SIMULATED')) return 'SIMULATED';
  if (qualities.includes('STALE')) return 'STALE';
  if (qualities.includes('ESTIMATED')) return 'ESTIMATED';
  return 'GOOD';
}

export function qualityBadgeColor(quality: DataQuality): string {
  switch (quality) {
    case 'GOOD': return 'green';
    case 'STALE': return 'yellow';
    case 'MISSING': return 'gray';
    case 'ERROR': return 'red';
    case 'ESTIMATED': return 'orange';
    case 'SIMULATED': return 'purple';
    default: return 'gray';
  }
}
