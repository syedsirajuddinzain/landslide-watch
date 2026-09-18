import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/api';
import { StatCard, Spinner, PriorityBadge, VerificationStatusBadge } from '../components/shared/Badges';
import {
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Search,
  UserCheck,
  Send,
  Truck,
  Radio,
  Megaphone,
  HeartPulse,
  HardHat,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Zap,
  Building2,
  Activity,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ResponseAction, FieldVerification } from '../types';
import { SitRepModal } from '../components/sitrep/SitRepModal';

export function ResponseCenter() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'board' | 'verification' | 'citizen-reports' | 'protocols'>('board');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSitRepModal, setShowSitRepModal] = useState(false);
  const [simToast, setSimToast] = useState<string | null>(null);

  // Queries
  const { data: actionsData, isLoading: actionsLoading } = useQuery('response-actions', () =>
    api.get('/api/response/actions').then((r) => r.data.data as ResponseAction[])
  );
  const { data: citizenReports } = useQuery('citizen-reports-rc', () =>
    api.get('/api/citizen/reports').then((r) => r.data.data as any[])
  );

  const updateCitizenReportMutation = useMutation(
    ({ id, status }: { id: string; status: string }) => api.patch(`/api/citizen/reports/${id}`, { status }),
    {
      onSuccess: () => qc.invalidateQueries('citizen-reports-rc'),
    }
  );

  const { data: verifData, isLoading: verifLoading } = useQuery('field-verifications', () =>
    api.get('/api/response/field-verifications').then((r) => r.data.data as FieldVerification[])
  );
  const { data: activeAlerts } = useQuery('active-alerts', () =>
    api.get('/api/alerts/active').then((r) => r.data.data as any[])
  );
  const { data: locations } = useQuery('locations', () =>
    api.get('/api/locations').then((r) => r.data.data as any[])
  );

  // Mutations
  const createActionMutation = useMutation((newAction: any) => api.post('/api/response/actions', newAction), {
    onSuccess: () => {
      qc.invalidateQueries('response-actions');
      setShowNewTaskModal(false);
    },
  });

  const updateActionMutation = useMutation(
    ({ id, updates }: { id: string; updates: any }) => api.patch(`/api/response/actions/${id}`, updates),
    {
      onSuccess: () => qc.invalidateQueries('response-actions'),
    }
  );

  const createVerifMutation = useMutation(
    (newVerif: any) => api.post('/api/response/field-verifications', newVerif),
    {
      onSuccess: () => {
        qc.invalidateQueries('field-verifications');
        qc.invalidateQueries('active-alerts');
        setShowVerifyModal(false);
      },
    }
  );

  // Form states for new task
  const [taskLocId, setTaskLocId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [taskTeam, setTaskTeam] = useState('NDRF Team 1');
  const [taskDesc, setTaskDesc] = useState('');

  // Form states for field verification
  const [verifLocId, setVerifLocId] = useState('');
  const [verifAlertId, setVerifAlertId] = useState('');
  const [verifStatus, setVerifStatus] = useState<any>('CONFIRMED_HAZARD');
  const [verifHazardConfirmed, setVerifHazardConfirmed] = useState(true);
  const [verifObs, setVerifObs] = useState('');
  const [verifEvidence, setVerifEvidence] = useState('');

  const actions = actionsData || [];
  const verifications = verifData || [];
  const alerts = activeAlerts || [];

  const pendingActions = actions.filter((a) => a.status === 'PENDING');
  const inProgressActions = actions.filter((a) => a.status === 'IN_PROGRESS');
  const completedActions = actions.filter((a) => a.status === 'COMPLETED');

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    const loc = locations?.find((l: any) => l.id === taskLocId);
    createActionMutation.mutate({
      locationId: taskLocId,
      locationName: loc?.name || 'NER Location',
      district: loc?.district || 'NER',
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      assignedTeam: taskTeam,
    });
  }

  function handleCreateVerification(e: React.FormEvent) {
    e.preventDefault();
    const loc = locations?.find((l: any) => l.id === verifLocId);
    createVerifMutation.mutate({
      locationId: verifLocId,
      alertId: verifAlertId || undefined,
      locationName: loc?.name || 'NER Location',
      district: loc?.district || 'NER',
      status: verifStatus,
      hazardConfirmed: verifHazardConfirmed,
      observations: verifObs,
      evidenceNotes: verifEvidence,
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-400" />
            Disaster Response Center & Field Dispatch
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Operational dispatch board, SDRF/NDRF task assignments, and on-site ground verification records
          </p>
        </div>

        {/* Action buttons & tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-surface-border">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                activeTab === 'board' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Task Board ({actions.length})
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                activeTab === 'verification' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Field Verifications ({verifications.length})
            </button>
            <button
              onClick={() => setActiveTab('citizen-reports')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                activeTab === 'citizen-reports' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Citizen Hazard Queue ({citizenReports?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('protocols')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                activeTab === 'protocols' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Response Protocols
            </button>
          </div>

          <button
            onClick={() => setShowNewTaskModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <PlusCircle size={14} /> Dispatch Task
          </button>
          <button
            onClick={() => setShowVerifyModal(true)}
            className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-3 border border-surface-border text-white"
          >
            <UserCheck size={14} /> Log Field Report
          </button>
          <button
            onClick={() => setShowSitRepModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A3028] hover:bg-[#4A7C59] text-white text-xs font-bold border border-[#4A7C59]/40 shadow-sm transition-all"
            title="Generate Official NDMA Incident Situation Report PDF"
          >
            <FileText size={14} className="text-[#C8D8BC]" />
            <span>NDMA SitRep PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Response Tasks" value={pendingActions.length} accent="#f59e0b" />
        <StatCard label="In Progress Tasks" value={inProgressActions.length} accent="#38bdf8" />
        <StatCard label="Completed Operations" value={completedActions.length} accent="#10b981" />
        <StatCard label="Field Reports Logged" value={verifications.length} accent="#a855f7" />
      </div>

      {/* TAB 1: TASK BOARD */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column: PENDING */}
          <div className="bg-surface/50 border border-surface-border rounded-xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Pending Dispatch ({pendingActions.length})
              </span>
            </div>
            {pendingActions.map((act) => (
              <div key={act.id} className="card bg-surface border border-surface-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={act.priority} />
                  <span className="text-[10px] text-slate-500 font-mono">{act.district}</span>
                </div>
                <div className="text-sm font-semibold text-white">{act.title}</div>
                <div className="text-xs text-slate-400">{act.locationName}</div>
                {act.description && <div className="text-xs text-slate-300">{act.description}</div>}
                <div className="text-[11px] text-slate-400">Team: <strong className="text-white">{act.assignedTeam}</strong></div>
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-border/50">
                  <button
                    onClick={() => updateActionMutation.mutate({ id: act.id, updates: { status: 'IN_PROGRESS' } })}
                    className="text-xs px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800 hover:bg-blue-900"
                  >
                    Start Task
                  </button>
                </div>
              </div>
            ))}
            {pendingActions.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-8">No pending tasks.</div>
            )}
          </div>

          {/* Column: IN PROGRESS */}
          <div className="bg-surface/50 border border-surface-border rounded-xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                In Progress ({inProgressActions.length})
              </span>
            </div>
            {inProgressActions.map((act) => (
              <div key={act.id} className="card bg-surface border border-surface-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={act.priority} />
                  <span className="text-[10px] text-slate-500 font-mono">{act.district}</span>
                </div>
                <div className="text-sm font-semibold text-white">{act.title}</div>
                <div className="text-xs text-slate-400">{act.locationName}</div>
                {act.description && <div className="text-xs text-slate-300">{act.description}</div>}
                <div className="text-[11px] text-slate-400">Team: <strong className="text-white">{act.assignedTeam}</strong></div>
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-border/50">
                  <button
                    onClick={() => updateActionMutation.mutate({ id: act.id, updates: { status: 'COMPLETED' } })}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
            {inProgressActions.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-8">No active tasks in progress.</div>
            )}
          </div>

          {/* Column: COMPLETED */}
          <div className="bg-surface/50 border border-surface-border rounded-xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Completed ({completedActions.length})
              </span>
            </div>
            {completedActions.map((act) => (
              <div key={act.id} className="card bg-surface/60 border border-surface-border p-3 space-y-2 opacity-85">
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={act.priority} />
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 size={12} /> Resolved
                  </span>
                </div>
                <div className="text-sm font-semibold text-white line-through text-slate-400">{act.title}</div>
                <div className="text-xs text-slate-500">{act.locationName}</div>
                <div className="text-[10px] text-slate-500">Completed: {act.completedAt ? new Date(act.completedAt).toLocaleTimeString() : 'Done'}</div>
              </div>
            ))}
            {completedActions.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-8">No tasks completed yet.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FIELD VERIFICATIONS */}
      {activeTab === 'verification' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              On-Site Ground Verification Submissions ({verifications.length} Reports)
            </span>
          </div>
          {verifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No field inspection reports logged yet. Click "Log Field Report" to submit telemetry verification.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/70">
                  <tr className="text-xs text-slate-400 border-b border-surface-border">
                    <th className="text-left px-4 py-3">Timestamp</th>
                    <th className="text-left px-4 py-3">Location & District</th>
                    <th className="text-left px-4 py-3">Verification Outcome</th>
                    <th className="text-left px-4 py-3">Ground Observations</th>
                    <th className="text-left px-4 py-3">Hazard Confirmed</th>
                    <th className="text-left px-4 py-3">Reporting Inspector</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v) => (
                    <tr key={v.id} className="table-row">
                      <td className="px-4 py-3 text-xs font-mono text-slate-300">
                        {new Date(v.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {v.locationName}, <span className="text-slate-400 text-xs">{v.district}</span>
                      </td>
                      <td className="px-4 py-3">
                        <VerificationStatusBadge status={v.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 max-w-sm">
                        {v.observations}
                        {v.evidenceNotes && (
                          <div className="text-[11px] text-slate-500 mt-0.5 italic">
                            Evidence: {v.evidenceNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.hazardConfirmed ? (
                          <span className="text-red-400 font-bold text-xs flex items-center gap-1">
                            <AlertTriangle size={12} /> Confirmed
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No Active Slip</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {v.inspectorEmail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: CITIZEN GROUND HAZARD QUEUE */}
      {activeTab === 'citizen-reports' && (
        <div className="space-y-4">
          <div className="card p-5 bg-white border border-[#C8D8BC] space-y-2">
            <div className="flex items-center justify-between border-b border-[#C8D8BC] pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#4A7C59]" />
                <h2 className="text-sm font-bold text-[#0F2018]">
                  Incoming Crowdsourced Ground Reports
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#4A7C59]">
                {citizenReports?.length || 0} Reports Received
              </span>
            </div>
            <p className="text-xs text-[#1A3028]">
              Ground signals submitted by residents and travelers. Authorities can review photos, verify slope failures, and instantly link reports to NDRF/SDRF field response tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(citizenReports || []).map((report: any) => (
              <div
                key={report.id}
                className="card p-4 bg-white border border-[#C8D8BC] space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {report.observationType ? report.observationType.replace(/_/g, ' ') : 'GROUND HAZARD'}
                    </span>
                    <span className={`text-xs font-bold ${report.status === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      ● {report.status}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(report.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-[#0F2018]">
                    {report.locationName || report.nearestCatchmentName || 'NER Mountain Corridor'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    GPS: {report.coordinates ? `${report.coordinates.lat.toFixed(4)}°N, ${report.coordinates.lon.toFixed(4)}°E` : 'N/A'}
                  </div>
                </div>

                {report.description && (
                  <p className="text-xs text-[#1A3028] bg-[#F5F0E8] p-2.5 rounded-lg italic border border-[#C8D8BC]/60">
                    "{report.description}"
                  </p>
                )}

                {report.photoUrl && (
                  <div className="relative h-40 rounded-xl overflow-hidden border border-[#C8D8BC]">
                    <img src={report.photoUrl} alt="Ground photo" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                      Field Camera
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-[#C8D8BC]">
                  <div>
                    Reporter: <span className="font-semibold text-[#0F2018]">{report.userName || 'Anonymous'}</span>
                    {report.userPhone && <span className="font-mono ml-1">({report.userPhone})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTaskLocId(report.nearestCatchmentId || 'aizawl');
                        setTaskTitle(`Field Inspection: ${report.observationType?.replace(/_/g, ' ') || 'Hazard'} at ${report.locationName || 'Monitored Site'}`);
                        setTaskDesc(`Citizen report #${report.id}: "${report.description || 'Ground hazard observed'}". Reported by ${report.userName || 'Citizen'}.`);
                        setActiveTab('board');
                        setShowNewTaskModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-colors"
                      title="Dispatch NDRF/SDRF field team for this hazard"
                    >
                      Dispatch Task
                    </button>
                    {report.status !== 'VERIFIED' && (
                      <button
                        onClick={() => updateCitizenReportMutation.mutate({ id: report.id, status: 'VERIFIED' })}
                        className="px-2.5 py-1 rounded-lg bg-[#4A7C59] hover:bg-[#1A3028] text-white font-bold text-xs transition-colors"
                      >
                        ✓ Verify
                      </button>
                    )}
                    {report.status !== 'DISMISSED' && (
                      <button
                        onClick={() => updateCitizenReportMutation.mutate({ id: report.id, status: 'DISMISSED' })}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETE NDMA MULTI-TIER RESCUE & EVACUATION SOP PLAYBOOK */}
      {activeTab === 'protocols' && (
        <div className="space-y-6">
          {/* Top Banner & Interactive Simulation */}
          <div className="bg-[#F5F0E8] p-5 rounded-2xl border border-[#C8D8BC] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#4A7C59]" />
                <h2 className="text-base font-black text-[#0F2018]">
                  National Incident Command System (ICS) · End-to-End Rescue SOP
                </h2>
              </div>
              <p className="text-xs text-[#1A3028] font-medium mt-1">
                Standard Operating Procedure: From Landslide Watch Early Warning ➔ Cellular Dispatch ➔ Pre-Emptive Evacuation ➔ Post-Slide Search & Rescue
              </p>
            </div>

            <button
              onClick={() => {
                setSimToast('🚨 P1 Evacuation Order Dispatched: District Magistrate, SP Police, NDRF Unit 1, BRO Engineers, Village Pradhan & CMO notified in 3.8 seconds.');
                setTimeout(() => setSimToast(null), 8000);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-md shadow-rose-700/20 flex items-center gap-2 transition-all active:scale-[0.98] shrink-0"
            >
              <Zap size={14} className="animate-pulse" />
              <span>Simulate P1 Agency Mobilization</span>
            </button>
          </div>

          {/* Toast Notification */}
          {simToast && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
              <CheckCircle2 size={16} className="text-rose-600 shrink-0" />
              <span>{simToast}</span>
            </div>
          )}

          {/* 4-Phase Chronological Operational Rescue Timeline */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C8D8BC] pb-3">
              <span className="text-xs font-bold text-[#0F2018] uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-[#4A7C59]" />
                The 4-Phase Chronological Rescue Lifecycle
              </span>
              <span className="text-[11px] text-[#4A7C59] font-mono font-bold">Target Response SLA: &lt; 15 Minutes</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Phase 0 */}
              <div className="p-4 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    PHASE 0 · T-4h to T-2h
                  </span>
                  <Radio size={14} className="text-[#4A7C59] animate-pulse" />
                </div>
                <div className="text-xs font-black text-[#0F2018]">AI Early Warning & Cellular Alert</div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  Landslide Watch AI detects composite score &gt;70. Fast2SMS DLT SMS + CAP Sachet sirens fire in &lt;5s to the DEOC roster.
                </p>
                <div className="text-[10px] text-[#4A7C59] font-semibold bg-white p-2 rounded border border-[#C8D8BC]">
                  <strong>Action:</strong> Automated sirens sound on 2G phones of field officers & village pradhans.
                </div>
              </div>

              {/* Phase 1 */}
              <div className="p-4 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                    PHASE 1 · T-2h to T-0h
                  </span>
                  <Megaphone size={14} className="text-orange-600" />
                </div>
                <div className="text-xs font-black text-[#0F2018]">Highway Barricade & Village Evacuation</div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  Local police halt vehicular traffic 5km out. Aapda Mitra volunteers guide hillside families to designated flat ridge shelters.
                </p>
                <div className="text-[10px] text-[#4A7C59] font-semibold bg-white p-2 rounded border border-[#C8D8BC]">
                  <strong>Action:</strong> Zero civilian vehicles on road; schools & clinics evacuated.
                </div>
              </div>

              {/* Phase 2 */}
              <div className="p-4 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    PHASE 2 · T = 0 to 2h
                  </span>
                  <Truck size={14} className="text-rose-600" />
                </div>
                <div className="text-xs font-black text-[#0F2018]">Deep Search & Rescue (NDRF/SDRF)</div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  If slope rupture occurs, NDRF deploys thermal imaging drones, acoustic victim listening devices, and K9 sniffer dog squads.
                </p>
                <div className="text-[10px] text-[#4A7C59] font-semibold bg-white p-2 rounded border border-[#C8D8BC]">
                  <strong>Action:</strong> Golden Hour victim extrication from mud debris & collapsed roofs.
                </div>
              </div>

              {/* Phase 3 */}
              <div className="p-4 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    PHASE 3 · T + 2h to 24h
                  </span>
                  <HeartPulse size={14} className="text-emerald-600" />
                </div>
                <div className="text-xs font-black text-[#0F2018]">Heavy Clearance & Medical Triage</div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  BRO/PWD excavators carve a single-lane emergency passage. Rescued patients triaged (Red/Yellow/Green) to District Hospitals.
                </p>
                <div className="text-[10px] text-[#4A7C59] font-semibold bg-white p-2 rounded border border-[#C8D8BC]">
                  <strong>Action:</strong> Road re-opened for relief trucks; drinking water & tents staged.
                </div>
              </div>
            </div>
          </div>

          {/* The 6 Key Stakeholders: Who Watches, Who Gets Alert, What They Do */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F2018] uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-[#4A7C59]" />
                The 6-Stakeholder Operational Chain of Command
              </h3>
              <span className="text-[11px] text-[#1A3028]">Pre-Configured Emergency Dispatch Matrix</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Stakeholder 1: DEOC Watcher & District Magistrate */}
              <div className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-[#0F2018] flex items-center gap-1.5">
                      <Building2 size={14} className="text-[#4A7C59]" />
                      <span>District Magistrate / DC</span>
                    </div>
                    <div className="text-[11px] text-[#4A7C59] font-bold">Role: Incident Commander</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    SLA: 5 Mins
                  </span>
                </div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>What they receive:</strong> Instant high-priority cellular siren SMS with GPS coordinates, exposed population, and 24h rainfall totals.
                </p>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>Action taken:</strong> Signs emergency evacuation orders under Disaster Management Act 2005, orders school closures, and mobilizes SDRF reserve funds.
                </p>
              </div>

              {/* Stakeholder 2: Police & Traffic */}
              <div className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-[#0F2018] flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-600" />
                      <span>Superintendent of Police (SP)</span>
                    </div>
                    <div className="text-[11px] text-[#4A7C59] font-bold">Role: Traffic & Perimeter Lockdown</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    SLA: 10 Mins
                  </span>
                </div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>What they receive:</strong> Automated SMS alert listing the vulnerable highway corridors (e.g., NH-54, NH-10).
                </p>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>Action taken:</strong> Deploys police barricades at 5km checkpoints, stops tourist buses and heavy trucks, and establishes a secure corridor for rescue vehicles.
                </p>
              </div>

              {/* Stakeholder 3: NDRF & SDRF */}
              <div className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-[#0F2018] flex items-center gap-1.5">
                      <HardHat size={14} className="text-amber-600" />
                      <span>NDRF / SDRF Battalions</span>
                    </div>
                    <div className="text-[11px] text-[#4A7C59] font-bold">Role: Search, Extrication & Rescue</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    SLA: 15 Mins
                  </span>
                </div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>What they receive:</strong> Digital SitRep report with slope steepness, soil clay percentage, and estimated debris runout footprint.
                </p>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>Action taken:</strong> Deploys tactical teams with thermal drones, high-angle rope gear, hydraulic cutters, acoustic listening kits, and sniffer dogs.
                </p>
              </div>

              {/* Stakeholder 4: PWD & BRO Heavy Machinery */}
              <div className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-[#0F2018] flex items-center gap-1.5">
                      <Truck size={14} className="text-[#1A3028]" />
                      <span>PWD / Border Roads (BRO)</span>
                    </div>
                    <div className="text-[11px] text-[#4A7C59] font-bold">Role: Heavy Equipment & Debris Clearance</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    SLA: 20 Mins
                  </span>
                </div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>What they receive:</strong> Geographic location of landslide debris and road blockage coordinates.
                </p>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>Action taken:</strong> Dispatches pre-staged JCB excavators, wheel loaders, and rock-breakers from both sides of the blockage to clear a single-lane passage.
                </p>
              </div>

              {/* Stakeholder 5: Village Council & Aapda Mitra */}
              <div className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-[#0F2018] flex items-center gap-1.5">
                      <Megaphone size={14} className="text-blue-600" />
                      <span>Village Heads & Aapda Mitra</span>
                    </div>
                    <div className="text-[11px] text-[#4A7C59] font-bold">Role: Community Evacuation to Shelters</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    SLA: 10 Mins
                  </span>
                </div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>What they receive:</strong> Direct cellular siren text message on simple 2G phones: "DANGER: Move to Village Ridge School immediately".
                </p>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>Action taken:</strong> Blows hand sirens/temple bells, goes door-to-door to help elderly and children, and ensures families reach pre-identified ridge shelters.
                </p>
              </div>

              {/* Stakeholder 6: Medical Officer & Hospitals */}
              <div className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-[#0F2018] flex items-center gap-1.5">
                      <HeartPulse size={14} className="text-rose-600" />
                      <span>Chief Medical Officer (CMO)</span>
                    </div>
                    <div className="text-[11px] text-[#4A7C59] font-bold">Role: Trauma Triage & Critical Care</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    SLA: 15 Mins
                  </span>
                </div>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>What they receive:</strong> Casualty risk estimation and hospital capacity advisory.
                </p>
                <p className="text-[11px] text-[#1A3028] leading-relaxed">
                  <strong>Action taken:</strong> Prepares 50 emergency trauma beds, readies oxygen cylinders and blood reserves, and stages 4 ambulances at the safe checkpoint boundary.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW DISPATCH TASK */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-elevated border border-surface-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border bg-surface flex items-center justify-between">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle size={16} className="text-brand-light" /> Dispatch Response Action
              </div>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Location *</label>
                <select
                  value={taskLocId}
                  onChange={(e) => setTaskLocId(e.target.value)}
                  required
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                >
                  <option value="">Select monitored site...</option>
                  {(locations || []).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.district}, {l.state})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Priority Level *</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                  >
                    <option value="P1">P1 (Critical Attention)</option>
                    <option value="P2">P2 (Elevated)</option>
                    <option value="P3">P3 (Advisory)</option>
                    <option value="P4">P4 (Routine)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Team *</label>
                  <input
                    type="text"
                    value={taskTeam}
                    onChange={(e) => setTaskTeam(e.target.value)}
                    required
                    placeholder="e.g. NDRF Unit 3"
                    className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Action Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  placeholder="e.g. Inspect Hillside Culverts and Clear Debris"
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Operational Instructions</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  placeholder="Provide specific notes or coordinates for the field team..."
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-border">
                <button type="button" onClick={() => setShowNewTaskModal(false)} className="btn-ghost px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={createActionMutation.isLoading} className="btn-primary px-4 py-2">
                  Dispatch Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG FIELD REPORT */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-elevated border border-surface-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border bg-surface flex items-center justify-between">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck size={16} className="text-brand-light" /> Submit Ground Field Inspection Report
              </div>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateVerification} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Monitored Location *</label>
                <select
                  value={verifLocId}
                  onChange={(e) => setVerifLocId(e.target.value)}
                  required
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                >
                  <option value="">Select location...</option>
                  {(locations || []).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.district}, {l.state})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Verification Status *</label>
                  <select
                    value={verifStatus}
                    onChange={(e) => setVerifStatus(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                  >
                    <option value="CONFIRMED_HAZARD">Confirmed Hazard</option>
                    <option value="VERIFIED">Ground Verified (Active Slip)</option>
                    <option value="FALSE_ALARM">False Alarm (No Evidence)</option>
                    <option value="NEEDS_ESCALATION">Needs Emergency Escalation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Related Active Alert</label>
                  <select
                    value={verifAlertId}
                    onChange={(e) => setVerifAlertId(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                  >
                    <option value="">None / General Check</option>
                    {alerts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.locationName} ({a.riskLevel})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-surface rounded-lg border border-surface-border">
                <input
                  type="checkbox"
                  id="hazardChk"
                  checked={verifHazardConfirmed}
                  onChange={(e) => setVerifHazardConfirmed(e.target.checked)}
                  className="rounded bg-surface-elevated border-surface-border"
                />
                <label htmlFor="hazardChk" className="text-white font-medium cursor-pointer">
                  Physical Slope Movement / Tension Cracks Observed on Ground
                </label>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Inspector Ground Observations *</label>
                <textarea
                  value={verifObs}
                  onChange={(e) => setVerifObs(e.target.value)}
                  rows={3}
                  required
                  placeholder="Describe slope condition, rock falls, road blockage, or water seepage..."
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Evidence / Geotagged Photo Notes</label>
                <input
                  type="text"
                  value={verifEvidence}
                  onChange={(e) => setVerifEvidence(e.target.value)}
                  placeholder="e.g. Geotagged photos archived in DEOC log #449"
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-white"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-border">
                <button type="button" onClick={() => setShowVerifyModal(false)} className="btn-ghost px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={createVerifMutation.isLoading} className="btn-primary px-4 py-2">
                  Submit Field Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official NDMA Situation Report Modal */}
      <SitRepModal isOpen={showSitRepModal} onClose={() => setShowSitRepModal(false)} />
    </div>
  );
}
export default ResponseCenter;
