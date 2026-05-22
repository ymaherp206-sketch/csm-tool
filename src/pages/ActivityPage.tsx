import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getClients, getActivity, getNextActions } from '../services/storage';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Clock, AlertCircle, Phone, Video, MessageCircle, Mail, StickyNote } from 'lucide-react';
import type { ActivityType } from '../types';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Call: 'bg-blue-900/30 text-blue-400',
  Meeting: 'bg-purple-900/30 text-purple-400',
  Message: 'bg-green-900/30 text-green-400',
  'Follow-up': 'bg-amber-900/30 text-amber-400',
  Email: 'bg-indigo-900/30 text-indigo-400',
  Note: 'bg-slate-800/50 text-slate-400',
};

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  Call: <Phone size={13} />,
  Meeting: <Video size={13} />,
  Message: <MessageCircle size={13} />,
  'Follow-up': <Clock size={13} />,
  Email: <Mail size={13} />,
  Note: <StickyNote size={13} />,
};

export default function ActivityPage() {
  const clients = useMemo(() => getClients(), []);
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const allActivity = useMemo(() =>
    getActivity()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 100),
    []
  );

  const nextActions = useMemo(() => {
    const all = getNextActions();
    return all
      .filter(a => clientMap[a.clientId])
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [clientMap]);

  const overdue = nextActions.filter(a => isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate)));
  const upcoming = nextActions.filter(a => {
    const d = parseISO(a.dueDate);
    return !isPast(d) || isToday(d);
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Activity" subtitle="All client activity and upcoming actions" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div className="card p-5 border-red-900/30">
            <h2 className="text-red-300 font-semibold text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              Overdue Actions ({overdue.length})
            </h2>
            <div className="space-y-2">
              {overdue.map(a => (
                <Link key={a.clientId} to={`/clients/${a.clientId}`} className="flex items-start gap-3 p-3 bg-red-900/10 rounded-lg border border-red-900/20 hover:border-red-900/40 transition-colors">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">{a.description}</p>
                    <p className="text-slate-500 text-xs">{clientMap[a.clientId]?.name}</p>
                  </div>
                  <span className="text-red-400 text-xs flex-shrink-0">
                    {format(parseISO(a.dueDate), 'MMM d')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        <div className="card p-5">
          <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            All Next Actions
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No upcoming actions.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {upcoming.map(a => (
                <Link key={a.clientId} to={`/clients/${a.clientId}`} className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">{a.description}</p>
                    <p className="text-slate-500 text-xs">{clientMap[a.clientId]?.name}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${isToday(parseISO(a.dueDate)) ? 'text-amber-400' : 'text-slate-400'}`}>
                    {format(parseISO(a.dueDate), 'MMM d')}
                    {isToday(parseISO(a.dueDate)) && ' — Today'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full activity feed */}
      <div className="card p-5">
        <h2 className="text-slate-200 font-semibold text-sm mb-4">Recent Activity (All Clients)</h2>
        {allActivity.length === 0 ? (
          <EmptyState icon={<MessageCircle size={40} />} title="No activity logged" description="Log calls, meetings, and follow-ups on client pages." />
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-[#2A2A2A]" />
            <div className="space-y-3">
              {allActivity.map(log => {
                const client = clientMap[log.clientId];
                if (!client) return null;
                return (
                  <div key={log.id} className="flex items-start gap-3 pl-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${ACTIVITY_COLORS[log.type]}`}>
                      {ACTIVITY_ICONS[log.type]}
                    </div>
                    <Link to={`/clients/${log.clientId}`} className="flex-1 min-w-0 bg-[#111111] rounded-lg border border-[#2A2A2A] p-3 hover:border-[#3A3A3A] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-slate-300 text-xs font-medium">{log.type}</span>
                          <span className="text-indigo-400 text-xs ml-1.5">— {client.name}</span>
                          <span className="text-slate-500 text-xs ml-2">{format(parseISO(log.date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs mt-1 truncate">{log.note}</p>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
