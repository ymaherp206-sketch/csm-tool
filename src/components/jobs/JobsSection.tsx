import { useState } from 'react';
import type { ClosedJob } from '../../types';
import { getClientJobs, saveJob, deleteJob, generateId } from '../../services/storage';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

interface Props {
  clientId: string;
  month?: string;
  onChanged?: () => void;
}

export default function JobsSection({ clientId, month, onChanged }: Props) {
  const [jobs, setJobs] = useState<ClosedJob[]>(() => getClientJobs(clientId));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    value: 0,
    jobType: '',
    description: '',
  });

  const displayJobs = month
    ? jobs.filter(j => j.date.startsWith(month))
    : jobs;

  const totalValue = displayJobs.reduce((s, j) => s + j.value, 0);
  const avgValue = displayJobs.length ? totalValue / displayJobs.length : 0;

  function handleAdd() {
    const job: ClosedJob = {
      id: generateId(),
      clientId,
      ...form,
      createdAt: new Date().toISOString(),
    };
    saveJob(job);
    const updated = getClientJobs(clientId);
    setJobs(updated);
    setShowForm(false);
    setForm({ date: format(new Date(), 'yyyy-MM-dd'), value: 0, jobType: '', description: '' });
    onChanged?.();
  }

  function handleDelete(id: string) {
    deleteJob(id);
    setJobs(getClientJobs(clientId));
    onChanged?.();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
          <Briefcase size={16} className="text-indigo-400" />
          Closed Jobs {month ? `(${month})` : '(All Time)'}
        </h3>
        <button onClick={() => setShowForm(s => !s)} className="btn-secondary text-xs px-3 py-1.5">
          <Plus size={14} className="inline mr-1" />
          Log Job
        </button>
      </div>

      {/* Summary */}
      {displayJobs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total Jobs', value: displayJobs.length },
            { label: 'Total Value', value: `$${totalValue.toLocaleString()}` },
            { label: 'Avg Value', value: `$${avgValue.toFixed(0)}` },
          ].map(m => (
            <div key={m.label} className="bg-[#111111] rounded-lg p-3 border border-[#2A2A2A]">
              <p className="text-slate-500 text-xs mb-1">{m.label}</p>
              <p className="text-slate-200 font-semibold text-sm">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card2 p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Value ($)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="mb-3">
            <label className="label">Job Type</label>
            <input className="input" value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))} placeholder="e.g. Dental Implant, Consultation..." />
          </div>
          <div className="mb-3">
            <label className="label">Description (optional)</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdd} className="btn-primary">Save Job</button>
          </div>
        </div>
      )}

      {/* List */}
      {displayJobs.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title="No jobs logged" description={month ? 'No jobs closed this month.' : 'Log closed jobs to track revenue.'} />
      ) : (
        <div className="space-y-2">
          {[...displayJobs].sort((a, b) => b.date.localeCompare(a.date)).map(job => (
            <div key={job.id} className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#2A2A2A]">
              <div>
                <p className="text-slate-200 text-sm font-medium">{job.jobType || 'Job'}</p>
                <p className="text-slate-500 text-xs">{format(parseISO(job.date), 'MMM d, yyyy')}{job.description ? ` · ${job.description}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 font-semibold text-sm">${job.value.toLocaleString()}</span>
                <button onClick={() => handleDelete(job.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
