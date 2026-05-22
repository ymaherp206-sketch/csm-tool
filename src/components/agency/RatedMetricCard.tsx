import type { BenchmarkConfig } from '../../types';
import { rate, type Rating } from '../../services/agencyMetrics';
import { TrendingUp, TrendingDown } from 'lucide-react';

const RATING_STYLES: Record<Rating, { badge: string; dot: string }> = {
  Good:    { badge: 'bg-green-900/30 text-green-400 border-green-900/40',  dot: 'bg-green-400' },
  Average: { badge: 'bg-amber-900/30 text-amber-400 border-amber-900/40', dot: 'bg-amber-400' },
  Poor:    { badge: 'bg-red-900/30  text-red-400   border-red-900/40',    dot: 'bg-red-400'   },
};

interface Props {
  label: string;
  value: string;        // pre-formatted string, '—' if no data
  rawValue?: number;    // for benchmark rating; omit to hide badge
  benchmark?: BenchmarkConfig;
  sub?: string;
  mom?: number | null;  // month-over-month % change
}

export default function RatedMetricCard({ label, value, rawValue, benchmark, sub, mom }: Props) {
  const rating: Rating | null =
    rawValue !== undefined && benchmark && rawValue !== 0
      ? rate(rawValue, benchmark)
      : null;

  const noData = value === '—';

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide leading-tight">{label}</span>
        {rating && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${RATING_STYLES[rating].badge}`}>
            {rating}
          </span>
        )}
      </div>

      <p className={`text-xl font-bold ${noData ? 'text-slate-600' : 'text-slate-100'}`}>
        {value}
      </p>

      <div className="flex items-center gap-2 min-h-[16px]">
        {mom !== null && mom !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${mom > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {mom > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(mom).toFixed(1)}% vs last mo
          </span>
        )}
        {sub && !mom && (
          <span className="text-slate-600 text-xs">{sub}</span>
        )}
      </div>
    </div>
  );
}
