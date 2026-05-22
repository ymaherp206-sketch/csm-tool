import { Plus, Trash2 } from 'lucide-react';
import type { PricingTier } from '../../types';

interface Props {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
}

export default function PricingTiersInput({ tiers, onChange }: Props) {
  function updateTier(index: number, patch: Partial<PricingTier>) {
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTier() {
    onChange([...tiers, { price: 0, booked: 0 }]);
  }

  function removeTier(index: number) {
    if (tiers.length <= 1) return;
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={i} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1 block">
                Tier {i + 1} — Price / Appt ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={tier.price || ''}
                  placeholder="0"
                  onChange={e => updateTier(i, { price: parseFloat(e.target.value) || 0 })}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-7 pr-3 py-2 text-slate-200 text-sm w-full focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1 block">
                Appts Booked
              </label>
              <input
                type="number" min="0"
                value={tier.booked || ''}
                placeholder="0"
                onChange={e => updateTier(i, { booked: parseInt(e.target.value) || 0 })}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-slate-200 text-sm w-full focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
              />
            </div>
            {tiers.length > 1 && (
              <button
                type="button"
                onClick={() => removeTier(i)}
                className="mb-0.5 p-2 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addTier}
        className="mt-3 flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
      >
        <Plus size={14} /> Add pricing tier
      </button>
    </div>
  );
}
