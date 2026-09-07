import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/api';
import { Spinner } from '../components/shared/Badges';
import { Sliders, Save, CheckCircle2, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { SystemSettings } from '../types';

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery('system-settings', () =>
    api.get('/api/admin/settings').then((r) => r.data.data as SystemSettings)
  );

  const [weights, setWeights] = useState({
    rainfall: 0.35,
    slope: 0.25,
    soil: 0.15,
    landCover: 0.1,
    drainage: 0.1,
    historical: 0.05,
  });

  const [thresholds, setThresholds] = useState({
    moderate: 40,
    high: 65,
    critical: 80,
  });

  const [ingestionInterval, setIngestionInterval] = useState(30);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.riskWeights) setWeights(settings.riskWeights);
      if (settings.alertThresholds) setThresholds(settings.alertThresholds);
      if (settings.ingestionIntervalMinutes) setIngestionInterval(settings.ingestionIntervalMinutes);
    }
  }, [settings]);

  const saveMutation = useMutation(
    (newSettings: any) => api.put('/api/admin/settings', newSettings),
    {
      onSuccess: () => {
        qc.invalidateQueries('system-settings');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      },
    }
  );

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isWeightValid) return;

    saveMutation.mutate({
      riskWeights: weights,
      alertThresholds: thresholds,
      ingestionIntervalMinutes: Number(ingestionInterval),
      systemVersion: '2.0.0',
    });
  }

  function handleReset() {
    setWeights({
      rainfall: 0.35,
      slope: 0.25,
      soil: 0.15,
      landCover: 0.1,
      drainage: 0.1,
      historical: 0.05,
    });
    setThresholds({
      moderate: 40,
      high: 65,
      critical: 80,
    });
    setIngestionInterval(30);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders size={20} className="text-brand-light" />
            System Calibration & Risk Model Weights
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure multi-factor risk formula coefficients, alert boundaries, and operational intervals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost text-xs px-3 py-1.5 border border-surface-border text-slate-300"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} /> Global configuration saved and deployed across risk engine instances.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Risk Weights Section */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                Multi-Factor Hazard Weights (Must Sum to 1.00)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Relative contribution of each physical environmental factor to the overall Hazard Score
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded font-mono font-bold ${
                isWeightValid
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              Sum: {totalWeight.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="flex justify-between text-slate-300 mb-1">
                <span>Rainfall Intensity & Moisture (35%)</span>
                <span className="font-mono text-brand-light">{(weights.rainfall * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={weights.rainfall}
                onChange={(e) => setWeights({ ...weights, rainfall: parseFloat(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>

            <div>
              <label className="flex justify-between text-slate-300 mb-1">
                <span>Terrain Slope Gradient (25%)</span>
                <span className="font-mono text-brand-light">{(weights.slope * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.10"
                max="0.50"
                step="0.05"
                value={weights.slope}
                onChange={(e) => setWeights({ ...weights, slope: parseFloat(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>

            <div>
              <label className="flex justify-between text-slate-300 mb-1">
                <span>Soil Geotechnical Properties (15%)</span>
                <span className="font-mono text-brand-light">{(weights.soil * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={weights.soil}
                onChange={(e) => setWeights({ ...weights, soil: parseFloat(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>

            <div>
              <label className="flex justify-between text-slate-300 mb-1">
                <span>Land Cover / Vegetation (10%)</span>
                <span className="font-mono text-brand-light">{(weights.landCover * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.25"
                step="0.05"
                value={weights.landCover}
                onChange={(e) => setWeights({ ...weights, landCover: parseFloat(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>

            <div>
              <label className="flex justify-between text-slate-300 mb-1">
                <span>Drainage / Stream Proximity (10%)</span>
                <span className="font-mono text-brand-light">{(weights.drainage * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.25"
                step="0.05"
                value={weights.drainage}
                onChange={(e) => setWeights({ ...weights, drainage: parseFloat(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>

            <div>
              <label className="flex justify-between text-slate-300 mb-1">
                <span>Historical Landslide Recurrence (5%)</span>
                <span className="font-mono text-brand-light">{(weights.historical * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.00"
                max="0.20"
                step="0.05"
                value={weights.historical}
                onChange={(e) => setWeights({ ...weights, historical: parseFloat(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>
          </div>
        </div>

        {/* Alert Thresholds Section */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-border pb-3">
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Alert Trigger Threshold Boundaries
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Defines the score cutoffs for automated advisory escalation
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Moderate Threshold (pts)</label>
              <input
                type="number"
                min="20"
                max="50"
                value={thresholds.moderate}
                onChange={(e) => setThresholds({ ...thresholds, moderate: parseInt(e.target.value, 10) })}
                className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 40 (Yellow)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">High Threshold (pts)</label>
              <input
                type="number"
                min="50"
                max="75"
                value={thresholds.high}
                onChange={(e) => setThresholds({ ...thresholds, high: parseInt(e.target.value, 10) })}
                className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 65 (Orange)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Critical Threshold (pts)</label>
              <input
                type="number"
                min="70"
                max="95"
                value={thresholds.critical}
                onChange={(e) => setThresholds({ ...thresholds, critical: parseInt(e.target.value, 10) })}
                className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 80 (Red / Evac Alert)</span>
            </div>
          </div>
        </div>

        {/* Ingestion Cadence */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-border pb-3">
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Telemetry Polling Frequency
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Open-Meteo & radar weather observation synchronization cycle
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="text-slate-300">Weather Polling Cadence:</label>
            <select
              value={ingestionInterval}
              onChange={(e) => setIngestionInterval(parseInt(e.target.value, 10))}
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-white font-mono"
            >
              <option value="15">Every 15 Minutes (Emergency Mode)</option>
              <option value="30">Every 30 Minutes (Standard Operation)</option>
              <option value="60">Every 60 Minutes (Off-Peak / Winter)</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={!isWeightValid || saveMutation.isLoading}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saveMutation.isLoading ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
export default SettingsPage;
