import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: number; // positive = good, negative = bad
  trendLabel?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue';
}

const colors = {
  default: 'text-slate-100',
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-indigo-400',
};

export default function MetricCard({ label, value, sub, icon, trend, trendLabel, color = 'default' }: Props) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      {(sub || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-2">
          {trend !== undefined && (
            <span className={`text-xs font-medium ${trendPositive ? 'text-green-400' : trendNegative ? 'text-red-400' : 'text-slate-400'}`}>
              {trendPositive ? '↑' : trendNegative ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {trendLabel && <span className="text-slate-500 text-xs">{trendLabel}</span>}
          {sub && !trendLabel && <span className="text-slate-500 text-xs">{sub}</span>}
        </div>
      )}
    </div>
  );
}
