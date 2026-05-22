import { useMemo } from 'react';
import { calcClientPerformance, momChange, fmtMoney, fmtPct, fmtNum } from '../../services/agencyMetrics';
import RatedMetricCard from './RatedMetricCard';
import { Users } from 'lucide-react';

interface Props {
  month: string;
  prevMonth: string;
}

export default function ClientPerformanceSection({ month, prevMonth }: Props) {
  const stats = useMemo(() => calcClientPerformance(month), [month]);
  const prev  = useMemo(() => calcClientPerformance(prevMonth), [prevMonth]);

  const mom = (cur: number, prv: number) => momChange(cur, prv);
  const hasData = stats.clientCount > 0;

  const cards = [
    { label: 'Avg Shown Appts / Client', value: fmtNum(stats.avgShownAppts), mom: mom(stats.avgShownAppts, prev.avgShownAppts) },
    { label: 'Avg Revenue / Client',     value: fmtMoney(stats.avgRevenue),   mom: mom(stats.avgRevenue, prev.avgRevenue) },
    { label: 'Avg Ad Spend / Client',    value: fmtMoney(stats.avgAdSpend),   mom: mom(stats.avgAdSpend, prev.avgAdSpend) },
    { label: 'Avg Profit / Client',      value: fmtMoney(stats.avgProfit),    mom: mom(stats.avgProfit, prev.avgProfit) },
    { label: 'Avg Profit Margin',        value: fmtPct(stats.avgMargin),      mom: mom(stats.avgMargin, prev.avgMargin) },
    { label: 'Avg ROAS',                 value: stats.avgROAS > 0 ? fmtNum(stats.avgROAS, 2) + 'x' : '—', mom: mom(stats.avgROAS, prev.avgROAS) },
    { label: 'Avg Cost / Shown Appt',   value: fmtMoney(stats.avgCostPerShownAppt, 2), mom: mom(stats.avgCostPerShownAppt, prev.avgCostPerShownAppt) },
    { label: 'Total Shown Appts',        value: stats.totalShownAppts > 0 ? String(stats.totalShownAppts) : '—', mom: mom(stats.totalShownAppts, prev.totalShownAppts) },
    { label: 'Total Revenue',            value: fmtMoney(stats.totalRevenue), mom: mom(stats.totalRevenue, prev.totalRevenue) },
    { label: 'Total Client Ad Spend',   value: fmtMoney(stats.totalAdSpend), mom: mom(stats.totalAdSpend, prev.totalAdSpend) },
    { label: 'Total Net Profit',         value: fmtMoney(stats.totalProfit),  mom: mom(stats.totalProfit, prev.totalProfit) },
  ];

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-slate-100 font-semibold text-base flex items-center gap-2">
            <Users size={17} className="text-indigo-400" />
            Client Performance — Agency Averages
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Pulled automatically from {stats.clientCount} active client{stats.clientCount !== 1 ? 's' : ''} with data for {month}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="py-10 text-center border border-dashed border-[#2A2A2A] rounded-xl">
          <p className="text-slate-500 text-sm">No client financial data logged for {month} yet.</p>
          <p className="text-slate-600 text-xs mt-1">Add monthly data on individual client pages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map(c => (
            <RatedMetricCard key={c.label} label={c.label} value={c.value} mom={c.mom} />
          ))}
        </div>
      )}
    </section>
  );
}
