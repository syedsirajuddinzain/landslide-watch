import React, { useState, Fragment } from 'react';
import { useQuery, useMutation } from 'react-query';
import api from '../lib/api';
import { StatCard, Spinner, RiskBadge } from '../components/shared/Badges';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  History,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
  Users,
  Search,
  Filter,
  Flame,
  FileText,
  Building,
  HelpCircle,
} from 'lucide-react';
import { HistoricalLandslide, BacktestSummary } from '../types';

export function HistoricalLandslides() {
  const { data, isLoading } = useQuery('landslides', () =>
    api.get('/api/landslides?limit=200').then((r) => r.data.data as HistoricalLandslide[])
  );
  const [expandedId, setExpandedId] = useState<string | null>('hist-ls-1');
  const [activeTab, setActiveTab] = useState<'catalog' | 'backtest'>('catalog');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  const {
    data: backtestData,
    isLoading: backtestLoading,
    mutate: runBacktest,
  } = useMutation(() =>
    api.get('/api/landslides/backtest').then((r) => r.data.data as BacktestSummary)
  );

  const events: HistoricalLandslide[] = data || [];

  const filteredEvents = events.filter((ls) => {
    const matchSearch =
      ls.locationName.toLowerCase().includes(search.toLowerCase()) ||
      ls.district.toLowerCase().includes(search.toLowerCase()) ||
      ls.trigger.toLowerCase().includes(search.toLowerCase());
    const matchState = stateFilter === 'ALL' || ls.state === stateFilter;
    return matchSearch && matchState;
  });

  const sorted = [...filteredEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totals = events.reduce(
    (acc, ls) => ({
      fatalities: acc.fatalities + (ls.fatalities ?? 0),
      injuries: acc.injuries + (ls.injuries ?? 0),
      missing: acc.missing + (ls.missing ?? 0),
      displaced: acc.displaced + (ls.displaced ?? 0),
    }),
    { fatalities: 0, injuries: 0, missing: 0, displaced: 0 }
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History size={20} className="text-blue-600" />
              Historical Landslide Disaster Registry & Post-Mortem Analysis
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
              GSI & NDMA ARCHIVE
            </span>
          </div>
          <p className="text-slate-600 text-xs mt-0.5">
            Documented historical landslide disasters in Northeast India with forensic root-cause analysis and government prevention audits
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'catalog'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Disaster Catalog ({events.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('backtest');
              if (!backtestData && !backtestLoading) runBacktest();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'backtest'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>AI Model Backtest Suite</span>
          </button>
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Key Human Impact KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="card p-4 border-l-4 border-l-red-500 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fatalities (Dead)</div>
              <div className="text-2xl font-black font-mono text-red-600 mt-1">{totals.fatalities} Lives Lost</div>
              <div className="text-[11px] text-slate-500 mt-1">Confirmed disaster casualties</div>
            </div>

            <div className="card p-4 border-l-4 border-l-orange-500 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reported Injuries</div>
              <div className="text-2xl font-black font-mono text-orange-600 mt-1">{totals.injuries} Hospitalized</div>
              <div className="text-[11px] text-slate-500 mt-1">Trauma & critical injuries</div>
            </div>

            <div className="card p-4 border-l-4 border-l-purple-500 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Missing Persons</div>
              <div className="text-2xl font-black font-mono text-purple-700 mt-1">{totals.missing} Unrecovered</div>
              <div className="text-[11px] text-slate-500 mt-1">Unaccounted under debris</div>
            </div>

            <div className="card p-4 border-l-4 border-l-blue-500 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Displaced Citizens</div>
              <div className="text-2xl font-black font-mono text-blue-700 mt-1">{totals.displaced.toLocaleString()}+ Evacuated</div>
              <div className="text-[11px] text-slate-500 mt-1">Sheltered in relief camps</div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="card p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search historical landslides by name, district, or trigger..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All NER States</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Manipur">Manipur</option>
                <option value="Assam">Assam</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Nagaland">Nagaland</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size={32} />
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((ls) => {
                const isOpen = expandedId === ls.id;
                return (
                  <div
                    key={ls.id}
                    className={`card p-0 border transition-all duration-200 overflow-hidden ${
                      isOpen ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Event Summary Header Bar */}
                    <div
                      onClick={() => setExpandedId(isOpen ? null : ls.id)}
                      className="p-4 bg-white hover:bg-slate-50/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors select-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">{ls.locationName}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              {ls.date}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              {ls.district}, {ls.state}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                            <span className="font-semibold text-slate-700">Trigger:</span> {ls.trigger}
                          </p>
                        </div>
                      </div>

                      {/* Casualty Counter Badges */}
                      <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-bold border border-red-200">
                            💀 {ls.fatalities ?? 0} Dead
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-bold border border-orange-200">
                            🩹 {ls.injuries ?? 0} Injured
                          </span>
                          {(ls.missing ?? 0) > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
                              ❓ {ls.missing} Missing
                            </span>
                          )}
                        </div>

                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Post-Mortem Accordion Body */}
                    {isOpen && (
                      <div className="p-5 bg-slate-50/60 border-t border-slate-200 space-y-4 animate-in fade-in duration-150 text-slate-900">
                        {/* Overview Narrative */}
                        <div className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                          <strong className="text-slate-900 font-semibold">Incident Overview: </strong>
                          {ls.description}
                        </div>

                        {/* 3 Pillar Forensic Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {/* 1. WHY IT HAPPENED */}
                          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                              <Flame size={14} className="text-amber-600" />
                              <span>1. Why That Landslide Happened</span>
                            </div>
                            <div className="text-xs text-slate-800 leading-relaxed font-normal">
                              {ls.whyItHappened || ls.trigger}
                            </div>
                          </div>

                          {/* 2. WHAT WENT WRONG */}
                          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 flex flex-col space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 uppercase tracking-wide">
                              <ShieldAlert size={14} className="text-red-600" />
                              <span>2. What Went Wrong (Failures)</span>
                            </div>
                            <div className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                              {ls.whatWentWrong || 'Lack of real-time slope telemetry and delayed ground verification alerts.'}
                            </div>
                          </div>

                          {/* 3. PRECAUTIONS GOVT COULD HAVE TAKEN */}
                          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wide">
                              <ShieldCheck size={14} className="text-emerald-600" />
                              <span>3. Government Precautions to Save Lives</span>
                            </div>
                            <div className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                              {ls.precautionsGovtCouldHaveTaken || 'Pre-emptive evacuation orders, geofenced mobile SMS, and automated radar warnings.'}
                            </div>
                          </div>
                        </div>

                        {/* Infrastructure & Lessons Learned Bottom Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                          {/* Infrastructure Damage */}
                          {ls.infrastructureImpact && (
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5">
                              <Building size={16} className="text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-0.5">
                                  Infrastructure Damage & Economic Disruption
                                </div>
                                <div className="text-xs text-slate-700">{ls.infrastructureImpact}</div>
                              </div>
                            </div>
                          )}

                          {/* Lessons Learned */}
                          {ls.lessonsLearned && (
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5">
                              <BookOpen size={16} className="text-purple-600 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-0.5">
                                  Scientific Lessons Learned & Policy Directives
                                </div>
                                <div className="text-xs text-slate-700">{ls.lessonsLearned}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata Footer */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                          <span className="font-mono">
                            Coordinates: {ls.coordinates.lat.toFixed(4)}°N, {ls.coordinates.lon.toFixed(4)}°E
                          </span>
                          <span className="font-mono font-medium text-slate-600">
                            Source Record: {ls.source}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredEvents.length === 0 && (
                <div className="card p-12 text-center text-slate-500 space-y-2">
                  <AlertTriangle size={32} className="mx-auto text-slate-400" />
                  <div className="text-base font-bold text-slate-800">No historical landslide events match your filter</div>
                  <div className="text-xs">Try searching for a different location name or resetting the state filter.</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'backtest' && (
        <div className="space-y-6">
          <div className="card p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Historical AI Model Validation & Backtesting Engine</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Executes the multi-factor risk formula against Open-Meteo Historical Weather Archives for past disaster events to measure detection lead time.
              </div>
            </div>
            <button
              onClick={() => runBacktest()}
              disabled={backtestLoading}
              className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{backtestLoading ? 'Running Backtest...' : 'Run Historical Backtest'}</span>
            </button>
          </div>

          {backtestLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-medium text-slate-700">Fetching historical weather archives & computing model detection rate...</div>
            </div>
          )}

          {backtestData && !backtestLoading && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <StatCard label="Disasters Evaluated" value={backtestData.totalEventsEvaluated} />
                <StatCard
                  label="Detection Rate"
                  value={`${backtestData.detectionRatePct}%`}
                  accent="#10b981"
                  sub={`${backtestData.detectedEventsCount}/${backtestData.totalEventsEvaluated} successfully flagged`}
                />
                <StatCard
                  label="Average Early Warning Lead Time"
                  value={`${backtestData.averageLeadTimeHours}h`}
                  accent="#38bdf8"
                  sub="Advance warning before failure"
                />
                <StatCard
                  label="Mean Trigger Precipitation"
                  value={`${backtestData.mean24hPrecipitationAtTrigger_mm} mm`}
                  accent="#f59e0b"
                  sub="24h saturation rainfall"
                />
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong className="font-bold">Scientific Validation Notice:</strong> {backtestData.dataLimitationsNotice}
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Event-by-Event Backtest Validation Results
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Run at: {new Date(backtestData.runAt).toLocaleTimeString()}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-xs text-slate-700 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold">Event & Date</th>
                        <th className="text-left px-4 py-3 font-semibold">Location</th>
                        <th className="text-right px-4 py-3 font-semibold">24h Hist. Rain</th>
                        <th className="text-right px-4 py-3 font-semibold">Model Score</th>
                        <th className="text-left px-4 py-3 font-semibold">Predicted Level</th>
                        <th className="text-center px-4 py-3 font-semibold">Advance Detection</th>
                        <th className="text-right px-4 py-3 font-semibold">Est. Lead Time</th>
                        <th className="text-left px-4 py-3 font-semibold">Archive Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestData.evaluations.map((ev) => (
                        <tr key={ev.eventId} className="table-row">
                          <td className="px-4 py-3 font-mono text-slate-700 text-xs font-semibold">
                            {ev.date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {ev.locationName}, <span className="text-slate-500 text-xs font-normal">{ev.district}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                            {ev.historicalRainfall24h_mm.toFixed(1)} mm
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {ev.computedHazardScore.toFixed(1)}/100
                          </td>
                          <td className="px-4 py-3">
                            <RiskBadge level={ev.predictedRiskLevel} size="xs" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ev.detectedElevatedRisk ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle2 size={13} /> DETECTED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-600 text-xs bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                                <AlertTriangle size={13} /> MISSED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                            {ev.leadTimeHoursEstimated ? `~${ev.leadTimeHoursEstimated}h` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-600">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                              {ev.dataSourceStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default HistoricalLandslides;
