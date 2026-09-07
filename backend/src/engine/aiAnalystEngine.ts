import { getDb, COLLECTIONS } from '../config/firebase';
import {
  AIAnalystQuery,
  AIAnalystResponse,
  Location,
  RiskAssessment,
  Alert,
  InfrastructureData,
  RainfallObservation,
} from '../types';

export async function processAnalystQuery(query: AIAnalystQuery): Promise<AIAnalystResponse> {
  const db = getDb();
  const q = query.question.toLowerCase();

  // Load live system state in parallel
  const [locSnap, riskSnap, alertSnap, infraSnap, rainSnap] = await Promise.all([
    db.collection(COLLECTIONS.LOCATIONS).where('isActive', '==', true).get(),
    db.collection(COLLECTIONS.RISK_ASSESSMENTS).orderBy('timestamp', 'desc').limit(100).get(),
    db.collection(COLLECTIONS.ALERTS).where('status', 'in', ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING']).get(),
    db.collection(COLLECTIONS.INFRASTRUCTURE).get(),
    db.collection(COLLECTIONS.RAINFALL).orderBy('timestamp', 'desc').limit(100).get(),
  ]);

  const locations = locSnap.docs.map((d) => ({ ...(d.data() as Location), id: d.id }));
  const risks = riskSnap.docs.map((d) => d.data() as RiskAssessment);
  const alerts = alertSnap.docs.map((d) => d.data() as Alert);
  const infraMap = Object.fromEntries(infraSnap.docs.map((d) => [d.id, d.data() as InfrastructureData]));

  // Map each location to its latest risk & rainfall
  const locMap = new Map<string, { loc: Location; risk?: RiskAssessment; rain?: RainfallObservation; infra?: InfrastructureData }>();
  locations.forEach((loc) => {
    const latestRisk = risks.find((r) => r.locationId === loc.id);
    const latestRain = rainSnap.docs.map((d) => d.data() as RainfallObservation).find((r) => r.locationId === loc.id);
    const infra = infraMap[loc.id];
    locMap.set(loc.id, { loc, risk: latestRisk, rain: latestRain, infra });
  });

  const groundedFacts: Array<{ metric: string; value: string; source: string }> = [];
  const relevantLocations: Array<{ id: string; name: string; score: number; level: any; priority: any }> = [];
  let answer = '';
  const recommendedActions: string[] = [];

  // 1. Query about a specific location
  const matchedLoc = locations.find((l) => q.includes(l.name.toLowerCase()) || q.includes(l.id.toLowerCase()));
  if (matchedLoc || query.focusLocationId) {
    const targetLoc = matchedLoc || locations.find((l) => l.id === query.focusLocationId)!;
    const data = locMap.get(targetLoc.id);
    const risk = data?.risk;
    const rain = data?.rain;
    const infra = data?.infra;

    if (risk) {
      relevantLocations.push({
        id: targetLoc.id,
        name: targetLoc.name,
        score: risk.finalScore,
        level: risk.riskLevel,
        priority: risk.priorityLevel || 'P3',
      });

      groundedFacts.push({
        metric: `${targetLoc.name} Final Risk Score`,
        value: `${risk.finalScore.toFixed(1)}/100 (${risk.riskLevel})`,
        source: 'Risk Engine v2.0',
      });
      groundedFacts.push({
        metric: `${targetLoc.name} 24h Precipitation`,
        value: `${risk.inputs.rainfall_24h_mm.toFixed(1)} mm`,
        source: 'Open-Meteo Weather API',
      });
      groundedFacts.push({
        metric: `${targetLoc.name} Slope Gradient`,
        value: `${risk.inputs.slope_deg.toFixed(1)}°`,
        source: 'SRTM DEM (OpenTopoData)',
      });

      const topFactors = risk.explanation.slice(0, 3);
      answer = `### Risk Analysis for **${targetLoc.name}**, ${targetLoc.district} (${targetLoc.state})\n\n` +
        `* **Current Risk Assessment:** **${risk.riskLevel}** (${risk.finalScore.toFixed(1)}/100) — Trend: **${risk.trend}** (${risk.trendPct}%)\n` +
        `* **Operational Priority:** **${risk.priorityLevel || 'P2'}**\n` +
        `* **Primary Hazard Drivers:**\n` +
        topFactors.map((f) => `  * **${f.factor}:** ${f.value} (+${f.contribution} points)`).join('\n') +
        `\n\n* **Infrastructure Exposure:** ${infra?.roads.length || 0} roads, ${infra?.schools.length || 0} schools, ${infra?.hospitals.length || 0} hospitals within 5km catchment (~${targetLoc.population.toLocaleString()} residents).\n`;

      if (risk.recommendations.length > 0) {
        recommendedActions.push(...risk.recommendations.slice(0, 4));
      }
    } else {
      answer = `Location **${targetLoc.name}** is registered in the system, but no current risk assessment has been ingested yet. Please trigger an ingestion cycle.`;
    }
  }

  // 2. Query about "attention first" / "highest risk" / "priority"
  else if (q.includes('first') || q.includes('priority') || q.includes('highest') || q.includes('critical') || q.includes('attention')) {
    const sorted = Array.from(locMap.values())
      .filter((item) => item.risk !== undefined)
      .sort((a, b) => (b.risk?.finalScore || 0) - (a.risk?.finalScore || 0));

    const top5 = sorted.slice(0, 5);
    top5.forEach((item) => {
      if (item.risk) {
        relevantLocations.push({
          id: item.loc.id,
          name: item.loc.name,
          score: item.risk.finalScore,
          level: item.risk.riskLevel,
          priority: item.risk.priorityLevel || 'P2',
        });
        groundedFacts.push({
          metric: `${item.loc.name} Priority & Score`,
          value: `${item.risk.priorityLevel || 'P2'} — ${item.risk.finalScore.toFixed(1)}/100`,
          source: 'Risk Engine v2.0',
        });
      }
    });

    answer = `### Highest Priority Locations Requiring Immediate Operational Attention\n\n` +
      `Based on combined **Hazard (70%)** and **Geospatial Exposure (30%)**, here are the top monitored sites:\n\n` +
      top5.map((item, idx) => {
        const r = item.risk!;
        const inf = item.infra;
        return `${idx + 1}. **${item.loc.name}** (${item.loc.district}, ${item.loc.state}) — **${r.priorityLevel || 'P2'} / ${r.riskLevel} (${r.finalScore.toFixed(1)}/100)**\n` +
          `   * 24h Rainfall: ${r.inputs.rainfall_24h_mm.toFixed(1)} mm | Slope: ${r.inputs.slope_deg.toFixed(1)}°\n` +
          `   * Exposure: ${inf?.schools.length || 0} schools, ${inf?.hospitals.length || 0} hospitals, ~${item.loc.population.toLocaleString()} residents.`;
      }).join('\n\n') +
      `\n\n*All active alerts must be verified on the ground before issuing evacuation directives.*`;

    recommendedActions.push(
      'Verify telemetry sensors and dispatch field teams to P1 locations.',
      'Check culvert blockages along primary road corridors near high-slope areas.',
      'Alert District Emergency Operations Centers (DEOC) for top priority sites.'
    );
  }

  // 3. Query about "rising" or "trend" or "districts"
  else if (q.includes('rising') || q.includes('trend') || q.includes('district')) {
    const risingLocs = Array.from(locMap.values())
      .filter((item) => item.risk && item.risk.trend === 'RISING')
      .sort((a, b) => (b.risk?.trendPct || 0) - (a.risk?.trendPct || 0));

    risingLocs.forEach((item) => {
      relevantLocations.push({
        id: item.loc.id,
        name: item.loc.name,
        score: item.risk!.finalScore,
        level: item.risk!.riskLevel,
        priority: item.risk!.priorityLevel || 'P2',
      });
      groundedFacts.push({
        metric: `${item.loc.name} Risk Trend`,
        value: `Rising (+${item.risk!.trendPct}%)`,
        source: 'Continuous Risk Tracking',
      });
    });

    if (risingLocs.length > 0) {
      answer = `### Locations With Rising Risk Trends\n\n` +
        `The system detected **${risingLocs.length} locations** where hazard scores have climbed over recent telemetry cycles:\n\n` +
        risingLocs.map((item) => {
          const r = item.risk!;
          return `* **${item.loc.name}** (${item.loc.district}): Score **${r.finalScore.toFixed(1)}** (${r.riskLevel}) — Surge: **+${r.trendPct}%** (24h rain: ${r.inputs.rainfall_24h_mm.toFixed(1)} mm, 24h forecast: ${r.inputs.forecast_24h_mm.toFixed(1)} mm)`;
        }).join('\n');

      recommendedActions.push(
        'Increase monitoring frequency from 30min to 15min intervals for rising locations.',
        'Alert local road transport authorities of worsening conditions.'
      );
    } else {
      answer = `### Risk Trends Across Northeast India\n\nAll monitored locations currently report **STABLE** or **FALLING** risk profiles. No rapid environmental surges are active.`;
    }
  }

  // 4. Query about "infrastructure", "roads", "schools", "hospitals"
  else if (q.includes('road') || q.includes('school') || q.includes('hospital') || q.includes('bridge') || q.includes('infrastructure')) {
    const highRiskInfra = Array.from(locMap.values())
      .filter((item) => item.risk && (item.risk.riskLevel === 'HIGH' || item.risk.riskLevel === 'CRITICAL' || item.risk.impactScore > 40))
      .sort((a, b) => (b.risk?.impactScore || 0) - (a.risk?.impactScore || 0));

    highRiskInfra.slice(0, 5).forEach((item) => {
      relevantLocations.push({
        id: item.loc.id,
        name: item.loc.name,
        score: item.risk!.finalScore,
        level: item.risk!.riskLevel,
        priority: item.risk!.priorityLevel || 'P2',
      });
    });

    answer = `### Critical Infrastructure Exposure in Elevated Hazard Zones\n\n` +
      highRiskInfra.slice(0, 5).map((item) => {
        const inf = item.infra;
        const r = item.risk!;
        return `* **${item.loc.name}** (${item.loc.district}) — **${r.riskLevel}** (Impact Score: ${r.impactScore.toFixed(1)}/100)\n` +
          `  * Critical facilities: **${inf?.hospitals.length || 0} hospitals/clinics**, **${inf?.schools.length || 0} schools**, **${inf?.bridges.length || 0} bridges**, **${inf?.roads.length || 0} road segments**.\n` +
          `  * Population at risk: **${item.loc.population.toLocaleString()} residents**.`;
      }).join('\n\n');

    recommendedActions.push(
      'Inspect bridge abutments and hillside culverts near exposed roads.',
      'Notify school principals and hospital administrators of local hazard status.'
    );
  }

  // 5. Default broad response
  else {
    const totalCount = locations.length;
    const criticalCount = risks.filter((r) => r.riskLevel === 'CRITICAL').length;
    const highCount = risks.filter((r) => r.riskLevel === 'HIGH').length;
    const activeAlertCount = alerts.length;

    groundedFacts.push(
      { metric: 'Total Monitored Sites', value: `${totalCount} locations`, source: 'NER Registry' },
      { metric: 'Critical Hazard Locations', value: `${criticalCount}`, source: 'Live Risk Engine' },
      { metric: 'High Hazard Locations', value: `${highCount}`, source: 'Live Risk Engine' },
      { metric: 'Active Operational Alerts', value: `${activeAlertCount}`, source: 'Alert Engine' }
    );

    answer = `### Regional Overview — Landslide Watch NER\n\n` +
      `Currently monitoring **${totalCount} locations** across 13 districts in 6 Northeastern states:\n\n` +
      `* **CRITICAL Sites:** ${criticalCount}\n` +
      `* **HIGH Risk Sites:** ${highCount}\n` +
      `* **Active Unresolved Alerts:** ${activeAlertCount}\n\n` +
      `You can ask specific questions such as:\n` +
      `* *"Why did risk increase in Shillong?"*\n` +
      `* *"Which locations require attention first?"*\n` +
      `* *"Which high-risk locations have hospitals or schools nearby?"*\n` +
      `* *"What are the recommended actions for current alerts?"*`;

    recommendedActions.push('Review the Command Center for live telemetry updates and active alerts.');
  }

  return {
    answer,
    groundedFacts,
    relevantLocations,
    recommendedActions,
    confidence: 'HIGH',
    generatedAt: new Date().toISOString(),
  };
}
