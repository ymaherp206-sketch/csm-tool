import { useState } from 'react';
import type { ActivityLog, ActivityType, NextAction } from '../../types';
import {
  getClientActivity, saveActivity, deleteActivity,
  getClientNextAction, saveNextAction, generateId
} from '../../services/storage';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Phone, Video, MessageCircle, Mail, StickyNote, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  Call: <Phone size={14} />,
  Meeting: <Video size={14} />,
  Message: <MessageCircle size={14} />,
  'Follow-up': <Clock size={14} />,
  Email: <Mail size={14} />,
  Note: <StickyNote size={14} />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Call: 'bg-blue-900/30 text-blue-400',
  Meeting: 'bg-purple-900/30 text-purple-400',
  Message: 'bg-green-900/30 text-green-400',
  'Follow-up': 'bg-amber-900/30 text-amber-400',
  Email: 'bg-indigo-900/30 text-indigo-400',
  Note: 'bg-slate-800/50 text-slate-400',
};

interface Props {
  clientId: string;
  onChanged?: () => void;
}

export default function ActivitySection({ clientId, onChanged }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(() => getClientActivity(clientId));
  const [nextAction, setNextAction] = useState<NextAction | null>(() => getClientNextAction(clientId));
  const [showForm, setShowForm] = useState(false);
  const [showNextForm, setShowNextForm] = useState(false);
  const [form, setForm] = useState<{ type: ActivityType; date: string; note: string }>({
    type: 'Call',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });
  const [naForm, setNaForm] = useState({
    description: nextAction?.description ?? '',
    dueDate: nextAction?.dueDate ?? format(new Date(), 'yyyy-MM-dd'),
  });

  function handleAddLog() {
    if (!form.note.trim()) return;
    const entry: ActivityLog = {
      id: generateId(),
      clientId,
      ...form,
      createdAt: new Date().toISOString(),
    };
    saveActivity(entry);
    setLogs(getClientActivity(clientId));
    setShowForm(false);
    setForm({ type: 'Call', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
    onChanged?.();
  }

  function handleDeleteLog(id: string) {
    deleteActivity(id);
    setLogs(getClientActivity(clientId));
    onChanged?.();
  }

  function handleSaveNextAction() {
    if (!naForm.description.trim()) return;
    const na: NextAction = {
      clientId,
      description: naForm.description,
      dueDate: naForm.dueDate,
      updatedAt: new Date().toISOString(),
    };
    saveNextAction(na);
    setNextAction(na);
    setShowNextForm(false);
    onChanged?.();
  }

  const isOverdue = nextAction && isPast(parseISO(nextAction.dueDate)) && !isToday(parseISO(nextAction.dueDate));

  return (
    <div>
      {/* Next Action */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            Next Action
          </h3>
          <button onClick={() => setShowNextForm(s => !s)} className="btn-secondary text-xs px-3 py-1.5">
            {nextAction ? 'Update' : 'Set'}
          </button>
        </div>

        {showNextForm && (
          <div className="card2 p-4 mb-3">
            <div className="mb-3">
              <label className="label">Task Description</label>
              <input className="input" value={naForm.description} onChange={e => setNaForm(f => ({ ...f, description: e.target.value }))} placeholder="What needs to happen next?" />
            </div>
            <div className="mb-3">
              <label className="label">Due Date</label>
              <input className="input" type="date" value={naForm.dueDate} onChange={e => setNaForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNextForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveNextAction} className="btn-primary">Save</button>
            </div>
          </div>
        )}

        {nextAction ? (
          <div className={`p-3 rounded-lg border ${isOverdue ? 'bg-red-900/10 border-red-900/30' : 'bg-amber-900/10 border-amber-900/30'}`}>
            <div className="flex items-start gap-2">
              {isOverdue && <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-medium ${isOverdue ? 'text-red-300' : 'text-slate-200'}`}>
                  {nextAction.description}
                </p>
                <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                  Due: {format(parseISO(nextAction.dueDate), 'MMM d, yyyy')}
                  {isOverdue && ' — OVERDUE'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm italic">No next action set.</p>
        )}
      </div>

      {/* Activity Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-200 font-semibold text-sm">Activity Timeline</h3>
          <button onClick={() => setShowForm(s => !s)} className="btn-secondary text-xs px-3 py-1.5">
            <Plus size={14} className="inline mr-1" />
            Log Activity
          </button>
        </div>

        {showForm && (
          <div className="card2 p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ActivityType }))}>
                  {(['Call', 'Meeting', 'Message', 'Follow-up', 'Email', 'Note'] as ActivityType[]).map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="mb-3">
              <label className="label">Note *</label>
              <textarea className="input h-16 resize-none" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="What happened?" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddLog} className="btn-primary">Log Activity</button>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <EmptyState icon={<MessageCircle size={32} />} title="No activities logged" description="Log calls, meetings, and follow-ups to keep track of your communication." />
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-[#2A2A2A]" />
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 pl-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${ACTIVITY_COLORS[log.type]}`}>
                    {ACTIVITY_ICONS[log.type]}
                  </div>
                  <div className="flex-1 min-w-0 bg-[#111111] rounded-lg border border-[#2A2A2A] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-slate-300 text-xs font-medium">{log.type}</span>
                        <span className="text-slate-500 text-xs ml-2">{format(parseISO(log.date), 'MMM d, yyyy')}</span>
                      </div>
                      <button onClick={() => handleDeleteLog(log.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{log.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
