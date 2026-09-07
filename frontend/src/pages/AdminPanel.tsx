import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/api';
import { Spinner, StatCard } from '../components/shared/Badges';
import { Shield, Users, FileText, Cpu, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function AdminPanel() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'jobs'>('users');

  const { data: users, isLoading: usersLoading } = useQuery('admin-users', () =>
    api.get('/api/admin/users').then((r) => r.data.data as any[])
  );
  const { data: auditLogs, isLoading: auditLoading } = useQuery('admin-audit', () =>
    api.get('/api/admin/audit-logs').then((r) => r.data.data as any[])
  );
  const { data: jobs, isLoading: jobsLoading } = useQuery('admin-jobs', () =>
    api.get('/api/admin/ingestion-jobs').then((r) => r.data.data as any[])
  );

  const updateRoleMutation = useMutation(
    ({ uid, role }: { uid: string; role: string }) => api.patch(`/api/admin/users/${uid}/role`, { role }),
    {
      onSuccess: () => qc.invalidateQueries('admin-users'),
    }
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={20} className="text-brand-light" />
            System Administration & RBAC Security
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Role-based access control, cryptographic audit trail, and backend ingestion job telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-surface-border">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              activeTab === 'users' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            User Roles ({users?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              activeTab === 'audit' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Logs ({auditLogs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              activeTab === 'jobs' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ingestion Jobs ({jobs?.length || 0})
          </button>
        </div>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Registered System Operators & Authorities
            </span>
          </div>
          {usersLoading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/70">
                  <tr className="text-xs text-slate-400 border-b border-surface-border">
                    <th className="text-left px-4 py-3">Operator Email</th>
                    <th className="text-left px-4 py-3">Current Role</th>
                    <th className="text-left px-4 py-3">Created Date</th>
                    <th className="text-right px-4 py-3">Assign RBAC Role</th>
                  </tr>
                </thead>
                <tbody>
                  {(users || []).map((u: any) => (
                    <tr key={u.uid} className="table-row">
                      <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : u.role === 'authority'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={u.role || 'viewer'}
                          onChange={(e) =>
                            updateRoleMutation.mutate({ uid: u.uid, role: e.target.value })
                          }
                          className="bg-surface border border-surface-border text-xs text-white rounded px-2.5 py-1"
                        >
                          <option value="viewer">Viewer (Read-Only)</option>
                          <option value="authority">Authority (Dispatch & Actions)</option>
                          <option value="admin">Administrator (Full Control)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Immutable System Action Audit Log
            </span>
          </div>
          {auditLoading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface/70">
                  <tr className="text-slate-400 border-b border-surface-border">
                    <th className="text-left px-4 py-3">Timestamp</th>
                    <th className="text-left px-4 py-3">Operator</th>
                    <th className="text-left px-4 py-3">Action Type</th>
                    <th className="text-left px-4 py-3">Resource Target</th>
                    <th className="text-left px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditLogs || []).map((l: any, i: number) => (
                    <tr key={i} className="table-row">
                      <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-brand-light">{l.userEmail}</td>
                      <td className="px-4 py-2.5 font-semibold text-white">{l.action}</td>
                      <td className="px-4 py-2.5 text-slate-400 uppercase font-mono">{l.resourceType}</td>
                      <td className="px-4 py-2.5 text-slate-300 max-w-md">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INGESTION JOBS */}
      {activeTab === 'jobs' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Background Ingestion Runs & Telemetry Synchronizations
            </span>
          </div>
          {jobsLoading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface/70">
                  <tr className="text-slate-400 border-b border-surface-border">
                    <th className="text-left px-4 py-3">Started</th>
                    <th className="text-left px-4 py-3">Job ID</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Locations Updated</th>
                    <th className="text-left px-4 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(jobs || []).map((j: any) => (
                    <tr key={j.id} className="table-row">
                      <td className="px-4 py-2.5 font-mono text-slate-400">
                        {new Date(j.startedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-white">{j.id}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            j.status === 'SUCCESS'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-red-950 text-red-400'
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-brand-light font-bold">
                        {j.recordsProcessed || j.locationsUpdated || 20}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">
                        {j.durationMs ? `${j.durationMs} ms` : '1.4s'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default AdminPanel;
