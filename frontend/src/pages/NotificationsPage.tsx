import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/api';
import { Spinner, EmptyState } from '../components/shared/Badges';
import { Bell, CheckCircle as CheckIcon, ShieldAlert, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery('notifications', () =>
    api.get('/api/notifications').then((r) => r.data.data as any[])
  );

  const markRead = useMutation((id: string) => api.patch(`/api/notifications/${id}/read`), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });
  const markAll = useMutation(() => api.patch('/api/notifications/mark-all-read'), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });

  const notifs = data || [];
  const unread = notifs.filter((n: any) => !n.isRead).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} className="text-brand-light" />
            Alerts & Notification Feed
          </h1>
          <p className="text-slate-400 text-xs mt-1">{unread} unread notifications</p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="btn-ghost text-xs px-3 py-1.5 border border-surface-border"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {notifs.length === 0 ? (
            <div className="card">
              <EmptyState icon={<Bell size={28} />} title="No active notifications" desc="You're all caught up with recent regional hazard alerts." />
            </div>
          ) : (
            notifs.map((n: any) => {
              const isWarning = n.type === 'warning' || n.type === 'critical';
              return (
                <div
                  key={n.id}
                  className={`card flex items-start gap-4 cursor-pointer transition-all ${
                    !n.isRead ? 'border-brand/50 bg-brand/5' : 'hover:bg-surface/60'
                  }`}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isWarning ? 'bg-red-950 text-red-400' : 'bg-blue-950 text-blue-400'
                    }`}
                  >
                    {isWarning ? <ShieldAlert size={18} /> : <Info size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white truncate">{n.title}</div>
                      <div className="text-[11px] text-slate-500 shrink-0 ml-2 font-mono">
                        {n.createdAt ? `${formatDistanceToNow(parseISO(n.createdAt))} ago` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 leading-relaxed">{n.body}</div>
                  </div>
                  {n.isRead && <CheckIcon size={16} className="text-slate-600 shrink-0 mt-1" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
export default NotificationsPage;
