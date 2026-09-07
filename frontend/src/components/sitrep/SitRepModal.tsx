import React, { useRef } from 'react';
import { useQuery } from 'react-query';
import api from '../../lib/api';
import { Location, RiskAssessment } from '../../types';
import { X, Printer, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SitRepModal({ isOpen, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: locData } = useQuery(
    'locations-sitrep',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { enabled: isOpen }
  );

  if (!isOpen) return null;

  const locations = locData || [];
  const p1Locs = locations.filter((l) => (l.latestRisk?.priorityLevel || 'P4') === 'P1');
  const p2Locs = locations.filter((l) => (l.latestRisk?.priorityLevel || 'P4') === 'P2');
  const p3Locs = locations.filter((l) => (l.latestRisk?.priorityLevel || 'P4') === 'P3');
  const p4Locs = locations.filter((l) => (l.latestRisk?.priorityLevel || 'P4') === 'P4');

  const topRisks = [...locations].sort(
    (a, b) => (b.latestRisk?.finalScore || 0) - (a.latestRisk?.finalScore || 0)
  ).slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const reportDate = format(new Date(), 'dd MMMM yyyy, HH:mm');
  const reportRefId = `SITREP/NER-LANDSLIDE/${format(new Date(), 'yyyyMMdd-HHmm')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-surface-border bg-surface print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-light" />
            <span className="font-bold text-sm text-white">Official Government Situation Report (SitRep)</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
              NDMA / SDMA Format
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={13} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-border transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 text-slate-200" ref={printRef}>
          {/* Government Official Letterhead */}
          <div className="border-b-2 border-slate-700 pb-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield size={28} className="text-brand-light" />
              <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Government of India · North Eastern Council (NEC)
              </div>
            </div>
            <h1 className="text-xl font-extrabold text-white uppercase tracking-wider">
              NORTHEAST INDIA LANDSLIDE SITUATION REPORT (SITREP)
            </h1>
            <p className="text-xs text-slate-400 font-serif">
              State Emergency Operations Center (SEOC) & Disaster Decision-Support Platform
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 font-mono">
              <span>Report Ref: <strong>{reportRefId}</strong></span>
              <span>Issued: <strong>{reportDate} IST</strong></span>
              <span>Classification: <strong>OPERATIONAL — DECISION SUPPORT</strong></span>
            </div>
          </div>

          {/* 1. Executive Summary & Priority Matrix */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest border-b border-surface-border pb-1">
              1. REGIONAL OPERATIONAL STATUS SUMMARY (20 MONITORED CATCHMENTS)
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800">
                <div className="text-xs text-red-300 font-bold">P1 (Immediate Action)</div>
                <div className="text-2xl font-bold text-red-400 font-mono mt-0.5">{p1Locs.length}</div>
                <div className="text-[10px] text-red-400/80">Ground verification deployed</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-800">
                <div className="text-xs text-orange-300 font-bold">P2 (Elevated Watch)</div>
                <div className="text-2xl font-bold text-orange-400 font-mono mt-0.5">{p2Locs.length}</div>
                <div className="text-[10px] text-orange-400/80">SDRF standby alert</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-800">
                <div className="text-xs text-yellow-300 font-bold">P3 (Advisory Tier)</div>
                <div className="text-2xl font-bold text-yellow-400 font-mono mt-0.5">{p3Locs.length}</div>
                <div className="text-[10px] text-yellow-400/80">Rainfall telemetry tracking</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800">
                <div className="text-xs text-emerald-300 font-bold">P4 (Routine)</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{p4Locs.length}</div>
                <div className="text-[10px] text-emerald-400/80">Safe baseline conditions</div>
              </div>
            </div>
          </div>

          {/* 2. Top Critical Catchments */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest border-b border-surface-border pb-1">
              2. HIGH-PRIORITY MONITORED CATCHMENTS & PHYSICAL METRICS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-surface-border">
                <thead className="bg-surface text-slate-300">
                  <tr className="border-b border-surface-border">
                    <th className="p-2.5">Location & District</th>
                    <th className="p-2.5 text-center">Priority</th>
                    <th className="p-2.5 text-right">Risk Score</th>
                    <th className="p-2.5 text-right">24h Rain</th>
                    <th className="p-2.5 text-right">Slope Angle</th>
                    <th className="p-2.5 text-right">Pop. Exposed</th>
                    <th className="p-2.5">Primary Physical Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 font-mono">
                  {topRisks.map((loc) => {
                    const r = loc.latestRisk;
                    const pri = r?.priorityLevel || 'P4';
                    return (
                      <tr key={loc.id} className="hover:bg-surface/50">
                        <td className="p-2.5 font-sans font-bold text-white">
                          {loc.name}, <span className="text-slate-400 font-normal">{loc.district} ({loc.state})</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pri === 'P1' ? 'bg-red-900 text-red-200' : pri === 'P2' ? 'bg-orange-900 text-orange-200' : pri === 'P3' ? 'bg-yellow-900 text-yellow-200' : 'bg-emerald-900 text-emerald-200'
                          }`}>
                            {pri}
                          </span>
                        </td>
                        <td className="p-2.5 text-right text-white font-bold">{r?.finalScore.toFixed(1) || '0.0'}</td>
                        <td className="p-2.5 text-right text-blue-400">{r?.inputs.rainfall_24h_mm.toFixed(1) || '0.0'} mm</td>
                        <td className="p-2.5 text-right text-orange-300">{r?.inputs.slope_deg.toFixed(1) || '0.0'}°</td>
                        <td className="p-2.5 text-right text-slate-300">{loc.population.toLocaleString()}</td>
                        <td className="p-2.5 font-sans text-slate-400 text-[11px]">
                          {r?.explanation?.[0]?.factor || 'Antecedent precipitation buildup'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Directive Operational Actions for District Magistrates */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest border-b border-surface-border pb-1">
              3. IMMEDIATE CIVIL PROTECTION & RESPONSE DIRECTIVES
            </h2>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-surface rounded border border-surface-border flex items-start gap-2">
                <CheckCircle2 size={14} className="text-brand-light mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Field Verification Dispatch:</strong> District Emergency Operation Centers (DEOCs) in high-risk districts must deploy rapid verification teams to inspect toe-erosion and tension cracks.
                </span>
              </div>
              <div className="p-2.5 bg-surface rounded border border-surface-border flex items-start gap-2">
                <CheckCircle2 size={14} className="text-brand-light mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Highway & Road Corridors:</strong> NHIDCL / BRO teams on alert along NH-6, NH-29, and NH-102 for immediate earthmoving equipment deployment at critical choke points.
                </span>
              </div>
              <div className="p-2.5 bg-surface rounded border border-surface-border flex items-start gap-2">
                <CheckCircle2 size={14} className="text-brand-light mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Early-Warning Community Broadcast:</strong> Issue precautionary advisories via Common Alerting Protocol (CAP) to vulnerable settlements along steep cut-slopes.
                </span>
              </div>
            </div>
          </div>

          {/* Report Footer */}
          <div className="pt-4 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Generated by Landslide Watch Multi-Factor Decision Support Engine (SIH26001)</span>
            <span>Authorized by SEOC / NDRF Coordination Desk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SitRepModal;
