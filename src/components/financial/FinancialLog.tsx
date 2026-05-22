import { useState } from 'react';
import type { MonthlyFinancials } from '../../types';
import { saveFinancials, getFinancialsForMonth } from '../../services/storage';
import {
  calcRevenue, calcShowRate, calcProfit, calcMargin, calcROAS, calcBreakEven
} from '../../services/metrics';
import { TrendingUp, DollarSign, Target } from 'lucide-react';

interface Props {
  clientId: string;
  pricePerAppointment: number;
  month: string;
  onSaved: () => void;
}

export default function FinancialLog({ clientId, pricePerAppointment, month, onSaved }: Props) {
  const existing = getFinancialsForMonth(clientId, month);

  const [form, setForm] = useState({
    appointmentsBooked: existing?.appointmentsBooked ?? 0,
    appointmentsShown: existing?.appointmentsShown ?? 0,
    adSpend: existing?.adSpend ?? 0,
  });

  const revenue = calcRevenue(form.appointmentsShown, pricePerAppointment);
  const showRate = calcShowRate(form.appointmentsShown, form.appointmentsBooked);
  const profit = calcProfit(revenue, form.adSpend);
  const margin = calcMargin(profit, revenue);
  const roas = calcROAS(revenue, form.adSpend);
  const breakEven = calcBreakEven(form.adSpend, pricePerAppointment);

  function handleSave() {
    const entry: MonthlyFinancials = {
      clientId,
      month,
      ...form,
    };
    saveFinancials(entry);
    onSaved();
  }

  return (
    <div className="card2 p-5">
      <h3 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-indigo-400" />
        Financial Log — {month}
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <label className="label">Booked Appointments</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.appointmentsBooked}
            onChange={e => setForm(f => ({ ...f, appointmentsBooked: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <label className="label">Shown Appointments</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.appointmentsShown}
            onChange={e => setForm(f => ({ ...f, appointmentsShown: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <label className="label">Ad Spend ($)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.adSpend}
            onChange={e => setForm(f => ({ ...f, adSpend: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {/* Preview calculations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Revenue', value: `$${revenue.toFixed(0)}`, icon: <DollarSign size={14} /> },
          { label: 'Show Rate', value: `${showRate.toFixed(1)}%`, icon: <Target size={14} /> },
          { label: 'Gross Profit', value: `$${profit.toFixed(0)}`, color: profit >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Margin', value: `${margin.toFixed(1)}%`, color: margin >= 0 ? 'text-slate-200' : 'text-red-400' },
          { label: 'ROAS', value: roas > 0 ? `${roas.toFixed(2)}x` : '—' },
          { label: 'Break-even', value: `${breakEven.toFixed(0)} appts` },
        ].map(m => (
          <div key={m.label} className="bg-[#111111] rounded-lg p-3 border border-[#2A2A2A]">
            <p className="text-slate-500 text-xs mb-1">{m.label}</p>
            <p className={`font-semibold text-sm ${m.color ?? 'text-slate-200'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <button onClick={handleSave} className="btn-primary w-full">
        Save Financial Data
      </button>
    </div>
  );
}
