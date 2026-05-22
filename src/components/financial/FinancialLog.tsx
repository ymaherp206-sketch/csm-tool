import { useState } from 'react';
import type { MonthlyFinancials, PricingTier } from '../../types';
import { saveFinancials, getFinancialsForMonth } from '../../services/storage';
import { calcTiersRevenue, calcTiersBooked, calcMargin, calcROAS } from '../../services/metrics';
import PricingTiersInput from '../agency/PricingTiersInput';
import { TrendingUp } from 'lucide-react';

interface Props {
  clientId: string;
  month: string;
  onSaved: () => void;
}

const DEFAULT_TIERS: PricingTier[] = [{ price: 0, booked: 0 }, { price: 0, booked: 0 }];

function fmt$(n: number, dec = 0) {
  if (!isFinite(n) || n === 0) return '—';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n: number) {
  if (!isFinite(n) || n === 0) return '—';
  return n.toFixed(1) + '%';
}

export default function FinancialLog({ clientId, month, onSaved }: Props) {
  const existing = getFinancialsForMonth(clientId, month);
  const existingTiers = existing?.pricingTiers;

  const [tiers, setTiers] = useState<PricingTier[]>(() =>
    existingTiers && existingTiers.length > 0 ? existingTiers : [...DEFAULT_TIERS]
  );
  const [adSpend, setAdSpend] = useState(existing?.adSpend ?? 0);

  function save(newTiers: PricingTier[], newSpend: number) {
    const entry: MonthlyFinancials = { clientId, month, pricingTiers: newTiers, adSpend: newSpend };
    saveFinancials(entry);
    onSaved();
  }

  function handleTierChange(newTiers: PricingTier[]) {
    setTiers(newTiers);
    save(newTiers, adSpend);
  }

  function handleAdSpend(v: number) {
    setAdSpend(v);
    save(tiers, v);
  }

  const totalBooked = calcTiersBooked(tiers);
  const revenue = calcTiersRevenue(tiers);
  const avgPrice = totalBooked > 0 ? revenue / totalBooked : NaN;
  const profit = revenue - adSpend;
  const margin = calcMargin(profit, revenue);
  const roas = calcROAS(revenue, adSpend);
  const breakEven = isFinite(avgPrice) && avgPrice > 0 ? adSpend / avgPrice : NaN;

  const hasData = revenue > 0 || adSpend > 0;

  const metrics = [
    { label: 'Total Booked', value: totalBooked > 0 ? String(totalBooked) : '—' },
    { label: 'Avg Price / Appt', value: fmt$(avgPrice, 2) },
    { label: 'Revenue', value: revenue > 0 ? `$${revenue.toFixed(0)}` : '—' },
    { label: 'Gross Profit', value: hasData ? fmt$(profit) : '—', color: hasData ? (profit >= 0 ? 'text-green-400' : 'text-red-400') : undefined },
    { label: 'Margin', value: revenue > 0 ? fmtPct(margin) : '—' },
    { label: 'ROAS', value: revenue > 0 && adSpend > 0 ? `${roas.toFixed(2)}x` : '—' },
    { label: 'Break-even', value: adSpend > 0 && isFinite(breakEven) ? `${breakEven.toFixed(0)} appts` : '—' },
  ];

  return (
    <div className="card2 p-5">
      <h3 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-indigo-400" />
        Financial Log — {month}
      </h3>

      <div className="mb-5">
        <p className="text-slate-500 text-xs uppercase tracking-wide font-medium mb-3">
          Appointment Pricing Tiers
        </p>
        <PricingTiersInput tiers={tiers} onChange={handleTierChange} />
      </div>

      <div className="mb-5">
        <label className="label">Ad Spend ($)</label>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
          <input
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-7 pr-3 py-2 text-slate-200 text-sm w-full focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
            type="number" min="0" step="1"
            value={adSpend || ''}
            placeholder="0"
            onChange={e => handleAdSpend(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
