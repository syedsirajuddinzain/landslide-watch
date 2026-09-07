import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/api';
import { Alert, AlertStatus, RiskLevel } from '../types';
import { RiskBadge, AlertStatusBadge, Spinner, EmptyState } from '../components/shared/Badges';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Search, X, MapPin, Clock, Smartphone, Megaphone, Radio } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { EmergencySmsModal } from '../components/broadcast/EmergencySmsModal';
import { CapBroadcastModal } from '../components/broadcast/CapBroadcastModal';
import { FiveKmEmergencyModal } from '../components/broadcast/FiveKmEmergencyModal';

export default function AlertCenter() {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('');
  const [levelFilter, setLevelFilter] = useState<RiskLevel | ''>('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Dedicated Emergency Broadcast Modals
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showCapModal, setShowCapModal] = useState(false);
  const [showFiveKmModal, setShowFiveKmModal] = useState(false);

  const { data, isLoading } = useQuery(
    ['alerts', statusFilter, levelFilter],
    () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (levelFilter) params.set('riskLevel', levelFilter);
      params.set('limit', '100');
      return api.get(`/api/alerts?${params}`).then(r => r.data.data as Alert[]);
    },
    { refetchInterval: 15_000 }
  );

  const mutate = (action: string, alertId: string, extra?: object) =>
    api.patch(`/api/alerts/${alertId}/${action}`, extra || {}).then(() => {
      qc.invalidateQueries(['alerts']);
      qc.invalidateQueries('active-alerts');
      setSelectedAlert(null);
    });

  const alerts = data || [];
  const newCount = alerts.filter(a => a.status === 'NEW').length;
  const activeCount = alerts.filter(a => ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(a.status)).length;

  return (
    <div className="p-6 space-y-5">
      {/* Top Header & Emergency Broadcast Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Alert Center</h1>
          <p className="text-slate-400 text-xs mt-0.5">{activeCount} active operational alerts · {newCount} new triggers</p>
        </div>

        {/* 3 Dedicated Emergency Broadcast Actions (Exclusive to Alert Center) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSmsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            title="Dispatch direct cellular SMS sirens to mobile phones via Fast2SMS"
          >
            <Smartphone size={14} />
            <span>📱 Emergency SMS</span>
          </button>

          <button
            onClick={() => setShowCapModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            title="Transmit CAP Sachet broadcast for national radio/TV"
          >
            <Megaphone size={14} />
            <span>CAP Broadcast</span>
          </button>

          <button
            onClick={() => setShowFiveKmModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            title="5km Geofenced Evacuation Siren for civilian handsets"
          >
            <Radio size={14} className="animate-pulse" />
            <span>5km Evacuation Siren</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-surface-border">
        <div className="text-xs text-slate-300 font-semibold">Filter Operational Alarms:</div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="input py-1 text-xs w-36 bg-surface-card">
            <option value="">All Statuses</option>
            {(['NEW','ACKNOWLEDGED','INVESTIGATING','RESOLVED'] as AlertStatus[]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)}
            className="input py-1 text-xs w-32 bg-surface-card">
            <option value="">All Levels</option>
            {(['CRITICAL','HIGH','MODERATE','LOW'] as RiskLevel[]).map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : alerts.length === 0 ? (
        <div className="card">
          <EmptyState icon={<CheckCircle size={32} className="text-green-500" />} title="No alerts match filters" desc="All monitored locations are within safe thresholds" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alert list */}
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id}
                onClick={() => { setSelectedAlert(alert); setResolutionNotes(''); }}
                className={`card cursor-pointer hover:border-brand/50 transition-all ${selectedAlert?.id === alert.id ? 'border-brand' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskBadge level={alert.riskLevel} />
                    <AlertStatusBadge status={alert.status} />
                    {alert.isDemo && <span className="badge bg-purple-900/40 text-purple-400 border border-purple-700 text-xs">DEMO</span>}
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{formatDistanceToNow(parseISO(alert.createdAt))} ago</div>
                </div>
                <div className="font-semibold text-white text-sm">{alert.locationName}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />{alert.district}, {alert.state}
                </div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{alert.reason}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs font-mono text-slate-300">Score: <strong>{alert.riskScore.toFixed(1)}</strong> / Threshold: {alert.triggerThreshold}</div>
                  <button onClick={e => { e.stopPropagation(); navigate(`/locations/${alert.locationId}`); }}
                    className="text-xs text-brand-light hover:text-white">View Location →</button>
                </div>
              </div>
            ))}
          </div>

          {/* Alert detail */}
          {selectedAlert && (
            <div className="card sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-white">Alert Detail</div>
                <button onClick={() => setSelectedAlert(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RiskBadge level={selectedAlert.riskLevel} size="lg" />
                  <AlertStatusBadge status={selectedAlert.status} />
                </div>

                <div>
                  <div className="text-lg font-bold text-white">{selectedAlert.locationName}</div>
                  <div className="text-sm text-slate-400">{selectedAlert.district}, {selectedAlert.state}</div>
                </div>

                <div className="bg-surface rounded-lg p-3 space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Risk Score</div>
                  <div className="text-2xl font-bold text-white">{selectedAlert.riskScore.toFixed(1)}<span className="text-sm text-slate-500">/100</span></div>
                  <div className="text-xs text-slate-500">Triggered at threshold: {selectedAlert.triggerThreshold}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Reason</div>
                  <div className="text-sm text-slate-300">{selectedAlert.reason}</div>
                </div>

                {selectedAlert.explanation && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Contributing Factors</div>
                    <div className="space-y-1">
                      {selectedAlert.explanation.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-1.5 bg-surface rounded">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${f.label === 'HIGH' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                          <span className="text-slate-300 flex-1">{f.factor}</span>
                          <span className="text-slate-500">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500">
                  <div className="flex items-center gap-1"><Clock size={10} /> Created: {format(parseISO(selectedAlert.createdAt), 'dd MMM yyyy HH:mm')} IST</div>
                  {selectedAlert.acknowledgedBy && <div className="mt-0.5">Acknowledged by: {selectedAlert.acknowledgedBy}</div>}
                  {selectedAlert.investigatedBy && <div className="mt-0.5">Investigating: {selectedAlert.investigatedBy}</div>}
                </div>

                {/* Actions */}
                {role !== 'viewer' && (
                  <div className="pt-3 border-t border-surface-border space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedAlert.status === 'NEW' && (
                        <button onClick={() => mutate('acknowledge', selectedAlert.id)}
                          className="btn-primary text-xs py-1.5">Acknowledge</button>
                      )}
                      {selectedAlert.status === 'ACKNOWLEDGED' && (
                        <button onClick={() => mutate('investigate', selectedAlert.id)}
                          className="btn btn-primary text-xs py-1.5">Start Investigation</button>
                      )}
                      {selectedAlert.status === 'INVESTIGATING' && (
                        <div className="col-span-2 space-y-2">
                          <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Resolution notes (optional)..."
                            className="input text-xs resize-none h-16" />
                          <button onClick={() => mutate('resolve', selectedAlert.id, { resolutionNotes })}
                            className="btn-primary text-xs py-1.5 w-full">Mark Resolved</button>
                        </div>
                      )}
                      {selectedAlert.status === 'RESOLVED' && (
                        <div className="col-span-2 text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle size={12} /> Resolved by {selectedAlert.resolvedBy}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exclusive Emergency Broadcast Modals */}
      <EmergencySmsModal isOpen={showSmsModal} onClose={() => setShowSmsModal(false)} />
      <CapBroadcastModal isOpen={showCapModal} onClose={() => setShowCapModal(false)} />
      <FiveKmEmergencyModal isOpen={showFiveKmModal} onClose={() => setShowFiveKmModal(false)} />
    </div>
  );
}
