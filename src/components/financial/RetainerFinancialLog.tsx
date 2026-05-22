import { useState } from 'react';
import type { RetainerMonthData } from '../../types';
import { saveRetainerMonthData, getRetainerMonthData } from '../../services/storage';
import { TrendingUp } from 'lucide-react';

interface Props {
  clientId: string;
  defaultRetainerFee: number;
  month: string;
  onSaved: () => void;
}

function fmt$(n: number, decimals = 0) {
  if (!isFinite(n) || n === 0) return '—';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function RetainerFinancialLog({ clientId, defaultRetainerFee, month, onSaved }: Props) {
  const existing = getRetainerMonthData(clientId, month);
  const initialFee = existing.retainerFee > 0 ? existing.retainerFee : defaultRetainerFee;

  const [form, setForm] = useState({
    retainerFee: initialFee,
    clientAdSpend: existing.clientAdSpend,
    appointmentsBooked: existing.appointmentsBooked,
    closedJobsCount: existing.closedJobsCount,
    closedJobsValue: existing.closedJobsValue,
    clientLeads: existing.clientLeads,
  });

  function handleUpdate(patch: Partial<typeof form>) {
    const updated = { ...form, ...patch };
    setForm(updated);
    const entry: RetainerMonthData = { clientId, month, ...updated };
    saveRetainerMonthData(entry);
    onSaved();
  }

  const avgJobValue = form.closedJobsCount > 0 ? form.closedJobsValue / form.closedJobsCount : NaN;
  const clientROAS = form.clientAdSpend > 0 && form.closedJobsValue > 0
    ? form.closedJobsValue / form.clientAdSpend : NaN;
  const clientCPL = form.clientLeads > 0 && form.clientAdSpend > 0
    ? form.clientAdSpend / form.clientLeads : NaN;

  const metrics = [
    { label: 'Agency Revenue', value: form.retainerFee > 0 ? `$${form.retainerFee.toLocaleString()}` : '—' },
    { label: 'Agency Profit', value: form.retainerFee > 0 ? `$${form.retainerFee.toLocaleString()}` : '—', color: 'text-green-400' },
    { label: 'Agency Margin', value: form.retainerFee > 0 ? '100%' : '—' },
    { label: 'Avg Job Value', value: fmt$(avgJobValue) },
    { label: 'Client ROAS', value: isFinite(clientROAS) ? `${clientROAS.toFixed(2)}x` : '—' },
    { label: 'Client CPL', value: fmt$(clientCPL) },
  ];

  return (
    <div className="card2 p-5">
      <h3 className="text-slate-200 font-semibold text-sm mb-1 flex items-center gap-2">
        <TrendingUp size={16} className="text-purple-400" />
        Retainer Log — {month}
      </h3>
      <p className="text-slate-500 text-xs mb-4">
        Client ad spend is logged for reference only — it is never counted as agency cost.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="label">Retainer fee this month ($)</label>
          <input
            className="input" type="number" min="0" step="1"
            value={form.retainerFee || ''}
            placeholder={String(defaultRetainerFee || 0)}
            onChange={e => handleUpdate({ retainerFee: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Client's ad spend ($) <span className="text-slate-600 normal-case font-normal">ref only</span></label>
          <input
            className="input" type="number" min="0" step="1"
            value={form.clientAdSpend || ''}
            placeholder="0"
            onChange={e => handleUpdate({ clientAdSpend: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Appointments booked</label>
          <input
            className="input" type="number" min="0"
            value={form.appointmentsBooked || ''}
            placeholder="0"
            onChange={e => handleUpdate({ appointmentsBooked: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Closed jobs count</label>
          <input
            className="input" type="number" min="0"
            value={form.closedJobsCount || ''}
            placeholder="0"
            onChange={e => handleUpdate({ closedJobsCount: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Closed jobs value ($)</label>
          <input
            className="input" type="number" min="0" step="1"
            value={form.closedJobsValue || ''}
            placeholder="0"
            onChange={e => handleUpdate({ closedJobsValue: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Client leads <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
          <input
            className="input" type="number" min="0"
            value={form.clientLeads || ''}
            placeholder="0"
            onChange={e => handleUpdate({ clientLeads: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-[#111111] rounded-lg p-3 border border-[#2A2A2A]">
            <p className="text-slate-500 text-xs mb-1">{m.label}</p>
            <p className={`font-semibold text-sm ${m.color ?? 'text-slate-200'}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
