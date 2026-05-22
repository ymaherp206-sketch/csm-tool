import type { ChurnRiskBreakdown } from '../../types';
import { ChurnBadge } from '../ui/Badges';
import { AlertTriangle } from 'lucide-react';

interface Props {
  breakdown: ChurnRiskBreakdown;
}

const BAR_FACTORS = [
  { key: 'happinessScore' as const, label: 'Happiness', max: 40, desc: 'Low happiness score drives high risk' },
  { key: 'profitTrend' as const, label: 'Profit Trend', max: 25, desc: 'Declining profit increases churn risk' },
  { key: 'daysSinceActivity' as const, label: 'Activity Recency', max: 20, desc: 'Long inactivity increases risk' },
  { key: 'showRate' as const, label: 'Show Rate', max: 15, desc: 'Low appointment show rate = higher risk' },
];

export default function ChurnSection({ breakdown }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          Churn Risk Score
        </h3>
        <ChurnBadge level={breakdown.level} score={breakdown.total} />
      </div>

      <div className="space-y-3">
        {BAR_FACTORS.map(({ key, label, max, desc }) => {
          const val = breakdown[key];
          const pct = (val / max) * 100;
          const barColor = pct < 33 ? 'bg-green-500' : pct < 66 ? 'bg-amber-500' : 'bg-red-500';

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">{label}</span>
                <span className="text-slate-500 text-xs">{val}/{max} pts</span>
              </div>
              <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-slate-600 text-xs mt-0.5">{desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-[#111111] border border-[#2A2A2A]">
        <p className="text-slate-500 text-xs">
          Total risk score: <span className="text-slate-300 font-semibold">{breakdown.total}/10</span>
          {' '}— {breakdown.level === 'Low' ? 'Client appears stable.' : breakdown.level === 'Medium' ? 'Monitor this client closely.' : 'Immediate attention recommended.'}
        </p>
      </div>
    </div>
  );
}
