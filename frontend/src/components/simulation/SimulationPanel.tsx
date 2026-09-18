import { useState } from 'react';
import { Play, Loader, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import { RiskBadge, TrendBadge, DemoBanner } from '../shared/Badges';
import { RiskAssessment, RiskLevel } from '../../types';

interface SimStep {
  step: number;
  label: string;
  delayMs: number;
  rainfall: { current_mmph: number; cumulative_24h_mm: number; cumulative_72h_mm: number; forecast_24h_mm: number; };
  assessment: RiskAssessment;
  alertGenerated: { id: string; riskLevel: RiskLevel } | null;
}

interface SimResult {
  locationId: string;
  locationName: string;
  district: string;
  steps: SimStep[];
  summary: { startRiskLevel: RiskLevel; endRiskLevel: RiskLevel; alertsGenerated: number; peakScore: number; };
}

export function SimulationPanel({ locationId, locationName }: { locationId: string; locationName: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  const runSimulation = async () => {
    setRunning(true);
    setResult(null);
    setCurrentStep(0);
    setError('');

    try {
      const res = await api.post('/api/simulation/run', { locationId });
      const data: SimResult = res.data.data;

      // Animate through steps
      for (let i = 0; i < data.steps.length; i++) {
        setCurrentStep(i + 1);
        await new Promise(r => setTimeout(r, data.steps[i].delayMs || 1500));
      }

      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Simulation failed. Make sure you have authority or admin role.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Early-Warning Simulation</div>
          <div className="text-xs text-slate-500">{locationName}</div>
        </div>
        <button
          onClick={runSimulation}
          disabled={running}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {running ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {(running || result) && (
        <div className="p-3 rounded-xl bg-amber-500/20 border-2 border-amber-500 text-amber-300 font-bold text-xs flex items-center gap-2.5 mb-4 shadow-md animate-in fade-in">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <div>
            <div className="text-amber-200 font-black tracking-wide">⚠️ SIMULATION MODE ACTIVE</div>
            <div className="text-[11px] text-amber-300/80 font-normal">What-if stress testing scenario. Synthetic values are strictly isolated from operational live telemetry.</div>
          </div>
        </div>
      )}

      <DemoBanner />

      {/* Progress steps */}
      {(running || result) && (
        <div className="space-y-2 mb-4">
          {['Baseline Conditions', 'Rainfall Begins Increasing', 'Moderate Rainfall Event', 'Heavy Rainfall — Risk Rising', 'Extreme Rainfall — Critical Threshold'].map((label, i) => {
            const step = i + 1;
            const done = currentStep > step || (!running && result);
            const active = currentStep === step && running;
            const stepData = result?.steps[i];

            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${done ? 'border-green-800 bg-green-900/20' : active ? 'border-brand bg-brand/10 animate-pulse' : 'border-surface-border bg-surface/50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-600 text-white' : active ? 'bg-brand text-white' : 'bg-surface-border text-slate-500'}`}>
                  {done ? <CheckCircle size={12} /> : step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white">{label}</div>
                  {stepData && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {stepData.rainfall.cumulative_24h_mm}mm (24h) · {stepData.rainfall.cumulative_72h_mm}mm (72h)
                    </div>
                  )}
                </div>
                {stepData && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RiskBadge level={stepData.assessment.riskLevel} size="xs" />
                    <span className="text-xs font-mono text-slate-400">{stepData.assessment.finalScore.toFixed(1)}</span>
                    {stepData.alertGenerated && <AlertTriangle size={12} className="text-red-400" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="border-t border-surface-border pt-4 mt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Simulation Summary</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Start → End</div>
              <div className="flex items-center gap-2">
                <RiskBadge level={result.summary.startRiskLevel} size="xs" />
                <ChevronRight size={12} className="text-slate-600" />
                <RiskBadge level={result.summary.endRiskLevel} size="xs" />
              </div>
            </div>
            <div className="bg-surface p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Peak Score</div>
              <div className="text-lg font-bold text-red-400">{result.summary.peakScore.toFixed(1)}</div>
            </div>
            <div className="bg-surface p-3 rounded-lg col-span-2">
              <div className="text-xs text-slate-500 mb-1">Alerts Generated</div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="font-semibold text-white">{result.summary.alertsGenerated} alert{result.summary.alertsGenerated !== 1 ? 's' : ''}</span>
                <span className="text-xs text-slate-500">— check Alert Center</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-600 bg-slate-800/40 rounded p-2">
            All simulation data has been persisted to the database and processed through the actual risk engine. Risk history and alerts are available in their respective pages.
          </div>
        </div>
      )}
    </div>
  );
}
