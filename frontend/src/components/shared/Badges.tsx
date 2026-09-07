import { RiskLevel, Trend, DataQuality, AlertStatus } from '../../types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';

// ---- Risk Badge ----
export function RiskBadge({ level, size = 'sm' }: { level: RiskLevel; size?: 'xs' | 'sm' | 'lg' }) {
  const classes: Record<RiskLevel, string> = {
    LOW: 'badge-low',
    MODERATE: 'badge-moderate',
    HIGH: 'badge-high',
    CRITICAL: 'badge-critical',
  };
  const textSize = size === 'xs' ? 'text-xs' : size === 'lg' ? 'text-sm px-3 py-1' : '';
  return <span className={`${classes[level]} ${textSize}`}>{level}</span>;
}

// ---- Trend Badge ----
export function TrendBadge({ trend, pct }: { trend: Trend; pct: number }) {
  if (trend === 'RISING') return (
    <span className="flex items-center gap-1 text-rose-600 text-xs font-semibold">
      <TrendingUp size={12} /> +{pct}% RISING
    </span>
  );
  if (trend === 'FALLING') return (
    <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
      <TrendingDown size={12} /> -{pct}% FALLING
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-slate-500 text-xs font-medium">
      <Minus size={12} /> STABLE
    </span>
  );
}

// ---- Data Quality Badge ----
export function DataQualityBadge({ quality }: { quality: DataQuality }) {
  const cfg: Record<DataQuality, { cls: string; label: string }> = {
    GOOD:      { cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300', label: 'LIVE' },
    STALE:     { cls: 'bg-amber-100 text-amber-800 border border-amber-300',     label: 'STALE' },
    MISSING:   { cls: 'bg-slate-100 text-slate-700 border border-slate-300',     label: 'MISSING' },
    ERROR:     { cls: 'bg-rose-100 text-rose-800 border border-rose-300',         label: 'ERROR' },
    ESTIMATED: { cls: 'bg-orange-100 text-orange-800 border border-orange-300',   label: 'ESTIMATED' },
    SIMULATED: { cls: 'bg-purple-100 text-purple-800 border border-purple-300',   label: 'SIMULATED' },
  };
  const { cls, label } = cfg[quality] || cfg.MISSING;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${cls}`}>{label}</span>;
}

// ---- Alert Status Badge ----
export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const cfg: Record<AlertStatus, { cls: string; icon: React.ReactNode }> = {
    NEW:          { cls: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',         icon: <AlertTriangle size={10} /> },
    ACKNOWLEDGED: { cls: 'bg-amber-100 text-amber-800 border border-amber-300 font-medium',         icon: <Clock size={10} /> },
    INVESTIGATING:{ cls: 'bg-sky-100 text-sky-800 border border-sky-300 font-medium',               icon: <Search size={10} /> },
    RESOLVED:     { cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium',    icon: <CheckCircle size={10} /> },
  };
  const { cls, icon } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {icon} {status}
    </span>
  );
}

// ---- Priority Badge ----
export function PriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' | 'P4' }) {
  const cfg: Record<'P1' | 'P2' | 'P3' | 'P4', { cls: string; label: string }> = {
    P1: { cls: 'bg-rose-600 text-white font-bold shadow-xs', label: 'P1 (Critical)' },
    P2: { cls: 'bg-orange-500 text-white font-semibold shadow-xs', label: 'P2 (Elevated)' },
    P3: { cls: 'bg-amber-500 text-slate-950 font-bold shadow-xs', label: 'P3 (Advisory)' },
    P4: { cls: 'bg-slate-200 text-slate-800 font-semibold', label: 'P4 (Routine)' },
  };
  const { cls, label } = cfg[priority] || cfg.P4;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ---- Verification Status Badge ----
export function VerificationStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    PENDING_VERIFICATION: { cls: 'bg-amber-100 text-amber-800 border border-amber-300', label: 'Pending Verification' },
    VERIFIED: { cls: 'bg-sky-100 text-sky-800 border border-sky-300 font-medium', label: 'Ground Verified' },
    FALSE_ALARM: { cls: 'bg-slate-100 text-slate-700 border border-slate-300', label: 'False Alarm' },
    CONFIRMED_HAZARD: { cls: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold', label: 'Confirmed Hazard' },
    NEEDS_ESCALATION: { cls: 'bg-purple-100 text-purple-800 border border-purple-300 font-semibold', label: 'Needs Escalation' },
  };
  const { cls, label } = cfg[status] || { cls: 'bg-slate-100 text-slate-700', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${cls}`}>
      {label}
    </span>
  );
}

// ---- Loading Spinner ----
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="animate-spin text-brand-light" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---- Score Ring ----
export function ScoreRing({ score, level, size = 80 }: { score: number; level: RiskLevel; size?: number }) {
  const color = { LOW: '#22c55e', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' }[level];
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold" style={{ color }}>{score.toFixed(0)}</div>
        <div className="text-xs text-slate-500">/ 100</div>
      </div>
    </div>
  );
}

// ---- Empty State ----
export function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-600 mb-3">{icon}</div>
      <div className="text-slate-400 font-medium mb-1">{title}</div>
      {desc && <div className="text-sm text-slate-600">{desc}</div>}
    </div>
  );
}

// ---- Stat Card ----
export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="card">
      <div className="stat-label mb-1">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ---- Section Divider ----
export function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">{title}</div>
      <div className="flex-1 border-t border-surface-border" />
    </div>
  );
}

// ---- Demo Banner ----
export function DemoBanner() {
  return (
    <div className="bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-2 flex items-center gap-2 text-purple-300 text-sm mb-4">
      <AlertTriangle size={14} />
      <span><strong>DEMO MODE</strong> — Data shown is simulated for demonstration purposes. Not real-world risk data.</span>
    </div>
  );
}

// ---- Disclaimer Banner ----
export function DisclaimerBanner() {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 text-xs mb-4">
      ⚠️ This is a decision-support system. Risk scores require local calibration. Do not issue evacuation orders based solely on this system. Verify all alerts with field teams before taking action.
    </div>
  );
}
