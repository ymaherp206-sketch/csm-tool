import { useMemo } from 'react';
import type { AgencyMonthData } from '../../types';
import {
  calcClientPerformance, calcPnL, calcTrendData, momChange,
  fmtMoney, fmtPct,
} from '../../services/agencyMetrics';
import { getAgencyMonthData } from '../../services/storage';
import RatedMetricCard from './RatedMetricCard';
import { AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

interface Props {
  month: string;
  prevMonth: string;
  data: AgencyMonthData;
  onUpdate: (patch: Partial<AgencyMonthData>) => void;
}

function InputRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
        <input
          type="number" min="0" step={100}
          value={value || ''}
          placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-7 pr-3 py-2 text-slate-200 text-sm w-full focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
        />
      </div>
    </div>
  );
}

export default function PnLSection({ month, prevMonth, data, onUpdate }: Props) {
  const clientStats = useMemo(() => calcClientPerformance(month), [month]);
  const prevClientStats = useMemo(() => calcClientPerformance(prevMonth), [prevMonth]);
  const prevData = useMemo(() => getAgencyMonthData(prevMonth), [prevMonth]);

  const pnl = useMemo(() => calcPnL(data, clientStats), [data, clientStats]);
  const prevPnl = useMemo(() => calcPnL(prevData, prevClientStats), [prevData, prevClientStats]);

  const trendData = useMemo(() => calcTrendData(month), [month]);

  const mom = (cur: number, prv: number) => momChange(cur, prv);

  const hasAnyData = pnl.totalRevenue > 0 || pnl.totalAcqSpend > 0;

  // P&L table rows
  const tableRows: { label: string; value: number; indent?: boolean; bold?: boolean; separator?: boolean; positive?: boolean }[] = [
    { label: 'Existing Client Revenue',       value: clientStats.totalRevenue,           indent: true },
    { label: 'New Client Revenue (Ads)',       value: data.adsNewClients * data.adsAvgShownAppts * data.adsPricePerAppt, indent: true },
    { label: 'New Client Revenue (SMS)',       value: data.smsNewClients * data.smsAvgShownAppts * data.smsPricePerAppt, indent: true },
    { label: 'Retainer / Other Revenue',      value: data.retainerRevenue,               indent: true },
    { label: 'Total Revenue',                 value: pnl.totalRevenue,                   bold: true },
    { label: '', value: 0, separator: true },
    { label: 'Client Ad Spend (agency-covered)', value: -clientStats.totalAdSpend,       indent: true },
    { label: 'Gross Profit',                  value: pnl.grossProfit,                    bold: true, positive: pnl.grossProfit >= 0 },
    { label: '', value: 0, separator: true },
    { label: 'Ads Acquisition Spend',         value: -data.adsSpend,                     indent: true },
    { label: 'SMS Acquisition Spend',         value: -data.smsSpend,                     indent: true },
    { label: 'Operating Costs',               value: -data.operatingCosts,               indent: true },
    { label: 'Net Profit',                    value: pnl.netProfit,                      bold: true, positive: pnl.netProfit >= 0 },
  ];

  return (
    <section className="card p-6">
      <h2 className="text-slate-100 font-semibold text-base mb-5 flex items-center gap-2">
        <DollarSign size={17} className="text-green-400" />
        Monthly P&amp;L Summary
      </h2>

      {/* Manual inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <InputRow
          label="Retainer / other revenue this month"
          value={data.retainerRevenue}
          onChange={v => onUpdate({ retainerRevenue: v })}
        />
        <InputRow
          label="Operating costs (salaries, software, misc)"
          value={data.operatingCosts}
          onChange={v => onUpdate({ operatingCosts: v })}
        />
      </div>

      {/* Alerts */}
      {hasAnyData && pnl.netMargin < 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-900/10 border border-red-900/30 rounded-xl mb-4">
          <AlertTriangle size={17} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm">Negative net margin this month</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              Net profit is {fmtMoney(pnl.netProfit)} ({fmtPct(pnl.netMargin)} margin). Total spend exceeds total revenue.
            </p>
          </div>
        </div>
      )}
      {hasAnyData && pnl.netMargin >= 0 && pnl.netMargin < 20 && (
        <div className="flex items-start gap-3 p-4 bg-amber-900/10 border border-amber-900/30 rounded-xl mb-4">
          <TrendingDown size={17} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Net margin below 20%</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Current net margin is {fmtPct(pnl.netMargin)}. Target 20%+ for healthy agency economics.
            </p>
          </div>
        </div>
      )}

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <RatedMetricCard label="Total Revenue" value={fmtMoney(pnl.totalRevenue)} mom={mom(pnl.totalRevenue, prevPnl.totalRevenue)} />
        <RatedMetricCard label="Total Spend"   value={fmtMoney(pnl.totalAcqSpend + pnl.totalClientAdSpend + pnl.totalOperatingCosts)} />
        <RatedMetricCard
          label="Net Profit"
          value={fmtMoney(pnl.netProfit)}
          mom={mom(pnl.netProfit, prevPnl.netProfit)}
        />
        <RatedMetricCard
          label="Net Margin"
          value={fmtPct(pnl.netMargin)}
          mom={mom(pnl.netMargin, prevPnl.netMargin)}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <RatedMetricCard label="Gross Profit"    value={fmtMoney(pnl.grossProfit)} />
        <RatedMetricCard label="Gross Margin"    value={fmtPct(pnl.grossMargin)} />
        <RatedMetricCard label="Blended CAC"     value={fmtMoney(pnl.blendedCAC)} sub="acq. spend only" />
        <RatedMetricCard label="Cost-to-Revenue" value={fmtPct(pnl.costToRevenueRatio)} sub="total spend ÷ revenue" />
      </div>

      {/* P&L table */}
      <div className="mb-6 border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#1A1A1A]">
              <th className="text-left text-slate-500 text-xs font-medium uppercase tracking-wide px-4 py-3">Line Item</th>
              <th className="text-right text-slate-500 text-xs font-medium uppercase tracking-wide px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => {
              if (row.separator) return (
                <tr key={i}><td colSpan={2} className="h-px bg-[#2A2A2A]" /></tr>
              );
              return (
                <tr key={i} className={`border-b border-[#1A1A1A] ${row.bold ? 'bg-[#1A1A1A]' : ''}`}>
                  <td className={`px-4 py-2.5 text-xs ${row.indent ? 'pl-8 text-slate-500' : 'text-slate-300 font-medium'}`}>
                    {row.label}
                  </td>
                  <td className={`px-4 py-2.5 text-xs text-right font-${row.bold ? 'bold' : 'normal'} ${
                    row.bold && row.positive !== undefined
                      ? row.positive ? 'text-green-400' : 'text-red-400'
                      : row.value < 0 ? 'text-red-400/70' : 'text-slate-300'
                  }`}>
                    {row.value !== 0 ? fmtMoney(Math.abs(row.value)) : '—'}
                    {row.value < 0 && row.value !== 0 ? ' (cost)' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6-month trend chart */}
      <div>
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">6-Month Trend</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
              />
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [`$${Number(val).toFixed(0)}`, name as string]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="spend"   name="Spend"   fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit"  name="Net Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
