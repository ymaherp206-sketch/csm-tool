import { format as fmt } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  month: string;
  onChange: (m: string) => void;
}

function shift(month: string, delta: number): string {
  const d = new Date(month + '-01');
  d.setMonth(d.getMonth() + delta);
  return fmt(d, 'yyyy-MM');
}

export default function MonthNav({ month, onChange }: Props) {
  const isCurrentMonth = month === fmt(new Date(), 'yyyy-MM');
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(shift(month, -1))} className="btn-secondary px-2 py-1.5">
        <ChevronLeft size={16} />
      </button>
      <span className="text-slate-300 font-medium text-sm w-24 text-center tabular-nums">{month}</span>
      <button
        onClick={() => { if (!isCurrentMonth) onChange(shift(month, 1)); }}
        disabled={isCurrentMonth}
        className="btn-secondary px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
