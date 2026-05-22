import { useState } from 'react';
import type { HappinessEntry } from '../../types';
import { getClientHappiness, saveHappiness, generateId } from '../../services/storage';
import { format, parseISO } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Heart, Plus } from 'lucide-react';
import { HappinessBadge } from '../ui/Badges';

const SCORE_LABELS: Record<number, string> = {
  1: 'At Risk', 2: 'Unhappy', 3: 'Neutral', 4: 'Happy', 5: 'Delighted'
};

interface Props {
  clientId: string;
  onChanged?: () => void;
}

export default function HappinessSection({ clientId, onChanged }: Props) {
  const [entries, setEntries] = useState<HappinessEntry[]>(() => getClientHappiness(clientId));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ score: 3, note: '', date: format(new Date(), 'yyyy-MM-dd') });

  const latest = entries.length ? entries[entries.length - 1] : null;

  const chartData = entries.map(e => ({
    date: format(parseISO(e.date), 'MMM d'),
    score: e.score,
  }));

  function handleSave() {
    const entry: HappinessEntry = {
      id: generateId(),
      clientId,
      score: form.score,
      note: form.note,
      date: form.date,
      createdAt: new Date().toISOString(),
    };
    saveHappiness(entry);
    const updated = getClientHappiness(clientId);
    setEntries(updated);
    setShowForm(false);
    setForm({ score: 3, note: '', date: format(new Date(), 'yyyy-MM-dd') });
    onChanged?.();
  }

  const scoreColor = (s: number) => s <= 2 ? '#f87171' : s === 3 ? '#fbbf24' : '#4ade80';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
          <Heart size={16} className="text-pink-400" />
          Happiness Score
        </h3>
        <div className="flex items-center gap-2">
          {latest && <HappinessBadge score={latest.score} />}
          <button onClick={() => setShowForm(s => !s)} className="btn-secondary text-xs px-3 py-1.5">
            <Plus size={14} className="inline mr-1" />
            Update
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card2 p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Score (1–5)</label>
              <select className="input" value={form.score} onChange={e => setForm(f => ({ ...f, score: parseInt(e.target.value) }))}>
                {[1,2,3,4,5].map(s => (
                  <option key={s} value={s}>{s} — {SCORE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="label">Note</label>
            <textarea className="input h-16 resize-none" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="What's driving this score?" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save Score</button>
          </div>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length > 0 && (
        <div className="h-36 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={20} />
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(val) => [`${val} — ${SCORE_LABELS[val as number] ?? val}`, 'Score']}
              />
              <ReferenceLine y={3} stroke="#2A2A2A" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#818CF8"
                strokeWidth={2}
                dot={{ fill: '#818CF8', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {entries.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {[...entries].reverse().map(e => (
            <div key={e.id} className="flex items-start gap-3 p-3 bg-[#111111] rounded-lg border border-[#2A2A2A]">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${scoreColor(e.score)}20`, color: scoreColor(e.score) }}
              >
                {e.score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-xs font-medium">{SCORE_LABELS[e.score]}</p>
                {e.note && <p className="text-slate-500 text-xs mt-0.5 truncate">{e.note}</p>}
              </div>
              <span className="text-slate-600 text-xs flex-shrink-0">{format(parseISO(e.date), 'MMM d')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
