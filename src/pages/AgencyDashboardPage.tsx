import { useState, useMemo, useEffect, useCallback } from 'react';
import { format as fmt, subMonths } from 'date-fns';
import {
  getAgencyMonthData, saveAgencyMonthData, getClients, getFinancials,
} from '../services/storage';
import { calcRevenue } from '../services/metrics';
import type { AgencyMonthData } from '../types';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Megaphone,
  MessageSquare, DollarSign, BarChart3, Sliders, ArrowRight,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ── helpers ───────────────────────────────────────────────────────────────────

function currentMonthStr() {
  return fmt(new Date(), 'yyyy-MM');
}

function prevMonthStr(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return fmt(new Date(y, mo - 2, 1), 'yyyy-MM');
}

function nextMonthStr(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return fmt(new Date(y, mo, 1), 'yyyy-MM');
}

function fmt$(n: number, decimals = 0) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(n: number) {
  return isFinite(n) ? n.toFixed(1) + '%' : '—';
}

function momArrow(current: number, prev: number) {
  if (!prev) return null;
  const change = ((current - prev) / Math.abs(prev)) * 100;
  return change;
}

// Derive all calculated metrics from raw inputs
function calcB2B(d: AgencyMonthData) {
  const revenue = d.b2bNewClients * d.b2bAvgShownAppts * d.b2bPricePerAppt;
  const profit = revenue - d.b2bAdSpend;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const cac = d.b2bNewClients > 0 ? d.b2bAdSpend / d.b2bNewClients : 0;
  const avgRevPerClient = d.b2bNewClients > 0 ? revenue / d.b2bNewClients : 0;
  const breakEvenClients = avgRevPerClient > 0 ? d.b2bAdSpend / avgRevPerClient : 0;
  return { revenue, profit, margin, cac, breakEvenClients };
}

function calcSMS(d: AgencyMonthData) {
  const revenue = d.smsNewClients * d.smsAvgShownAppts * d.smsPricePerAppt;
  const profit = revenue - d.smsSpend;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const cac = d.smsNewClients > 0 ? d.smsSpend / d.smsNewClients : 0;
  return { revenue, profit, margin, cac };
}

function calcClientAdSpend(month: string): { revenue: number; adSpend: number } {
  const clients = getClients().filter(c => c.status !== 'Archived');
  const allF = getFinancials().filter(f => f.month === month);
  let revenue = 0, adSpend = 0;
  for (const c of clients) {
    const f = allF.find(x => x.clientId === c.id);
    if (f) {
      revenue += calcRevenue(f.appointmentsShown, c.pricePerAppointment);
      adSpend += f.adSpend;
    }
  }
  return { revenue, adSpend };
}

// ── Input field ───────────────────────────────────────────────────────────────

interface NumInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  optional?: boolean;
}

function NumInput({ label, value, onChange, prefix, suffix, step = 1, optional }: NumInputProps) {
  return (
    <div>
      <label className="label">
        {label}{optional && <span className="text-slate-600 ml-1">(optional)</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          min="0"
          step={step}
          value={value || ''}
          placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  highlight?: boolean;
}

function KpiCard({ label, value, sub, color = 'text-slate-100', highlight }: KpiCardProps) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-indigo-900/20 border-indigo-700/40' : 'bg-[#1A1A1A] border-[#2A2A2A]'}`}>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ── MoM pill ──────────────────────────────────────────────────────────────────

function MoM({ change }: { change: number | null }) {
  if (change === null) return <span className="text-slate-600 text-xs">—</span>;
  const pos = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgencyDashboardPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [data, setData] = useState<AgencyMonthData>(() => getAgencyMonthData(currentMonthStr()));

  // Simulator state (starts seeded from real data)
  const [sim, setSim] = useState({ b2bClients: 0, smsClients: 0, pricePerAppt: 0, b2bSpend: 0, smsSpend: 0 });

  // Load month data when month changes
  useEffect(() => {
    const d = getAgencyMonthData(month);
    setData(d);
    setSim({
      b2bClients: d.b2bNewClients,
      smsClients: d.smsNewClients,
      pricePerAppt: (d.b2bPricePerAppt + d.smsPricePerAppt) / 2 || d.b2bPricePerAppt || d.smsPricePerAppt,
      b2bSpend: d.b2bAdSpend,
      smsSpend: d.smsSpend,
    });
  }, [month]);

  // Auto-save on change
  const update = useCallback((patch: Partial<AgencyMonthData>) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      saveAgencyMonthData(next);
      return next;
    });
  }, []);

  // Previous month for MoM
  const prevData = useMemo(() => getAgencyMonthData(prevMonthStr(month)), [month]);
  const clientData = useMemo(() => calcClientAdSpend(month), [month]);
  const prevClientData = useMemo(() => calcClientAdSpend(prevMonthStr(month)), [month]);

  const b2b = calcB2B(data);
  const sms = calcSMS(data);
  const prevB2B = calcB2B(prevData);
  const prevSMS = calcSMS(prevData);

  // Combined summary
  const totalRevenue = b2b.revenue + sms.revenue + data.retainerRevenue + clientData.revenue;
  const totalSpend = data.b2bAdSpend + data.smsSpend + clientData.adSpend;
  const totalProfit = totalRevenue - totalSpend - data.operatingCosts;
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalNewClients = data.b2bNewClients + data.smsNewClients;
  const totalAcqSpend = data.b2bAdSpend + data.smsSpend;
  const blendedCAC = totalNewClients > 0 ? totalAcqSpend / totalNewClients : 0;

  const prevTotalRevenue = prevB2B.revenue + prevSMS.revenue + prevData.retainerRevenue + prevClientData.revenue;
  const prevTotalSpend = prevData.b2bAdSpend + prevData.smsSpend + prevClientData.adSpend;
  const prevTotalProfit = prevTotalRevenue - prevTotalSpend - prevData.operatingCosts;

  // 6-month history for trend chart
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = fmt(subMonths(new Date(month + '-01'), 5 - i), 'yyyy-MM');
      const d = getAgencyMonthData(m);
      const b = calcB2B(d);
      const s = calcSMS(d);
      const c = calcClientAdSpend(m);
      const rev = b.revenue + s.revenue + d.retainerRevenue + c.revenue;
      const spend = d.b2bAdSpend + d.smsSpend + c.adSpend;
      const profit = rev - spend - d.operatingCosts;
      return { label: fmt(new Date(m + '-01'), 'MMM yy'), revenue: Math.round(rev), profit: Math.round(profit), spend: Math.round(spend) };
    });
  }, [month]);

  // Simulator calculations
  const simAvgAppts = ((data.b2bAvgShownAppts || 0) + (data.smsAvgShownAppts || 0)) / 2 || 1;
  const simRevenue = (sim.b2bClients + sim.smsClients) * simAvgAppts * sim.pricePerAppt;
  const simSpend = sim.b2bSpend + sim.smsSpend;
  const simProfit = simRevenue - simSpend;
  const simCAC = (sim.b2bClients + sim.smsClients) > 0 ? simSpend / (sim.b2bClients + sim.smsClients) : 0;
  const simMargin = simRevenue > 0 ? (simProfit / simRevenue) * 100 : 0;

  const isCurrentMonth = month === currentMonthStr();

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header + month selector */}
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Agency Dashboard" subtitle="Acquisition performance and financial overview" />
        <div className="flex items-center gap-2 mt-1">
          <button onClick={() => setMonth(prevMonthStr(month))} className="btn-secondary px-2 py-1.5">
            <ChevronLeft size={16} />
          </button>
          <span className="text-slate-300 font-medium text-sm w-24 text-center">{month}</span>
          <button
            onClick={() => { if (!isCurrentMonth) setMonth(nextMonthStr(month)); }}
            disabled={isCurrentMonth}
            className="btn-secondary px-2 py-1.5 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Combined summary ───────────────────────────────────────────────── */}
      <section className="card p-5 mb-6">
        <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-400" />
          Combined Agency Summary — {month}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-slate-100 text-xl font-bold">{fmt$(totalRevenue)}</p>
            <MoM change={momArrow(totalRevenue, prevTotalRevenue)} />
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Total Spend</p>
            <p className="text-slate-100 text-xl font-bold">{fmt$(totalSpend)}</p>
            <MoM change={momArrow(totalSpend, prevTotalSpend)} />
          </div>
          <div className={`rounded-xl p-4 border ${totalProfit >= 0 ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Net Profit</p>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt$(totalProfit)}</p>
            <MoM change={momArrow(totalProfit, prevTotalProfit)} />
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Net Margin</p>
            <p className={`text-xl font-bold ${totalMargin >= 20 ? 'text-green-400' : totalMargin >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{pct(totalMargin)}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">New Clients</p>
            <p className="text-slate-100 text-xl font-bold">{totalNewClients}</p>
            <span className="text-slate-500 text-xs">{data.b2bNewClients} B2B + {data.smsNewClients} SMS</span>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Blended CAC</p>
            <p className="text-slate-100 text-xl font-bold">{blendedCAC > 0 ? fmt$(blendedCAC) : '—'}</p>
            <span className="text-slate-500 text-xs">acq. spend only</span>
          </div>
        </div>

        {/* Trend chart */}
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [`$${Number(val).toFixed(0)}`, name as string]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="spend" name="Spend" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Retainer + Operating costs ─────────────────────────────────────── */}
      <section className="card p-5 mb-6">
        <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-green-400" />
          Other Revenue &amp; Costs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumInput label="Retainer revenue this month" prefix="$" step={100}
            value={data.retainerRevenue} onChange={v => update({ retainerRevenue: v })} />
          <NumInput label="Operating costs (salaries, software, misc)" prefix="$" step={100}
            value={data.operatingCosts} onChange={v => update({ operatingCosts: v })} />
        </div>
        <p className="text-slate-500 text-xs mt-3">
          Client retainer revenue pulled from client records this month: <span className="text-slate-300 font-medium">{fmt$(clientData.revenue)}</span>
          {' '}· Client ad spend: <span className="text-slate-300 font-medium">{fmt$(clientData.adSpend)}</span>
        </p>
      </section>

      {/* ── Two channel sections ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

        {/* B2B Ads */}
        <section className="card p-5">
          <h2 className="text-slate-200 font-semibold text-sm mb-5 flex items-center gap-2">
            <Megaphone size={16} className="text-indigo-400" />
            B2B Paid Ads — Client Acquisition
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <NumInput label="B2B ad spend" prefix="$" step={100}
              value={data.b2bAdSpend} onChange={v => update({ b2bAdSpend: v })} />
            <NumInput label="New clients acquired" suffix="clients"
              value={data.b2bNewClients} onChange={v => update({ b2bNewClients: v })} />
            <NumInput label="Avg price / shown appt" prefix="$" step={10}
              value={data.b2bPricePerAppt} onChange={v => update({ b2bPricePerAppt: v })} />
            <NumInput label="Avg shown appts / new client" suffix="appts"
              value={data.b2bAvgShownAppts} onChange={v => update({ b2bAvgShownAppts: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="CAC (B2B Ads)" value={b2b.cac > 0 ? fmt$(b2b.cac) : '—'}
              sub="ad spend ÷ new clients" />
            <KpiCard label="Revenue from new clients" value={fmt$(b2b.revenue)} />
            <KpiCard label="Net profit" value={fmt$(b2b.profit)}
              color={b2b.profit >= 0 ? 'text-green-400' : 'text-red-400'} />
            <KpiCard label="Profit margin" value={pct(b2b.margin)}
              color={b2b.margin >= 20 ? 'text-green-400' : b2b.margin >= 0 ? 'text-amber-400' : 'text-red-400'} />
            <KpiCard label="Break-even clients needed"
              value={b2b.breakEvenClients > 0 ? b2b.breakEvenClients.toFixed(1) : '—'}
              sub="to cover B2B spend" />
            <div className="rounded-xl p-4 border border-[#2A2A2A] bg-[#111111]">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">vs last month</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Revenue</span>
                  <MoM change={momArrow(b2b.revenue, prevB2B.revenue)} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Profit</span>
                  <MoM change={momArrow(b2b.profit, prevB2B.profit)} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CAC</span>
                  <MoM change={momArrow(b2b.cac, prevB2B.cac)} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SMS */}
        <section className="card p-5">
          <h2 className="text-slate-200 font-semibold text-sm mb-5 flex items-center gap-2">
            <MessageSquare size={16} className="text-green-400" />
            SMS Outreach — Client Acquisition
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <NumInput label="SMS campaign spend" prefix="$" step={100}
              value={data.smsSpend} onChange={v => update({ smsSpend: v })} />
            <NumInput label="New clients via SMS" suffix="clients"
              value={data.smsNewClients} onChange={v => update({ smsNewClients: v })} />
            <NumInput label="Avg price / shown appt" prefix="$" step={10}
              value={data.smsPricePerAppt} onChange={v => update({ smsPricePerAppt: v })} />
            <NumInput label="Avg shown appts / SMS client" suffix="appts"
              value={data.smsAvgShownAppts} onChange={v => update({ smsAvgShownAppts: v })} />
            <NumInput label="Cost per reply" prefix="$" step={1} optional
              value={data.smsCostPerReply} onChange={v => update({ smsCostPerReply: v })} />
            <NumInput label="Cost per booked call" prefix="$" step={1} optional
              value={data.smsCostPerBookedCall} onChange={v => update({ smsCostPerBookedCall: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="CAC (SMS)" value={sms.cac > 0 ? fmt$(sms.cac) : '—'}
              sub="SMS spend ÷ new clients" />
            <KpiCard label="Revenue from SMS clients" value={fmt$(sms.revenue)} />
            <KpiCard label="Net profit" value={fmt$(sms.profit)}
              color={sms.profit >= 0 ? 'text-green-400' : 'text-red-400'} />
            <KpiCard label="Profit margin" value={pct(sms.margin)}
              color={sms.margin >= 20 ? 'text-green-400' : sms.margin >= 0 ? 'text-amber-400' : 'text-red-400'} />
            {data.smsCostPerReply > 0 && (
              <KpiCard label="Cost / reply" value={fmt$(data.smsCostPerReply, 2)} />
            )}
            {data.smsCostPerBookedCall > 0 && (
              <KpiCard label="Cost / booked call" value={fmt$(data.smsCostPerBookedCall, 2)} />
            )}
            <div className="rounded-xl p-4 border border-[#2A2A2A] bg-[#111111]">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">vs last month</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Revenue</span>
                  <MoM change={momArrow(sms.revenue, prevSMS.revenue)} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Profit</span>
                  <MoM change={momArrow(sms.profit, prevSMS.profit)} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CAC</span>
                  <MoM change={momArrow(sms.cac, prevSMS.cac)} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Channel comparison ─────────────────────────────────────────────── */}
      <section className="card p-5 mb-6">
        <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
          <ArrowRight size={16} className="text-amber-400" />
          Channel Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left text-slate-500 text-xs font-medium uppercase tracking-wide py-2 pr-6">Metric</th>
                <th className="text-right text-indigo-400 text-xs font-medium uppercase tracking-wide py-2 px-4">B2B Paid Ads</th>
                <th className="text-right text-green-400 text-xs font-medium uppercase tracking-wide py-2 px-4">SMS Outreach</th>
                <th className="text-right text-slate-400 text-xs font-medium uppercase tracking-wide py-2 pl-4">Winner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {[
                {
                  label: 'New Clients', b2bVal: data.b2bNewClients, smsVal: data.smsNewClients,
                  fmt: (v: number) => v.toString(), higher: true,
                },
                {
                  label: 'Revenue', b2bVal: b2b.revenue, smsVal: sms.revenue,
                  fmt: (v: number) => fmt$(v), higher: true,
                },
                {
                  label: 'Net Profit', b2bVal: b2b.profit, smsVal: sms.profit,
                  fmt: (v: number) => fmt$(v), higher: true,
                },
                {
                  label: 'Margin %', b2bVal: b2b.margin, smsVal: sms.margin,
                  fmt: (v: number) => pct(v), higher: true,
                },
                {
                  label: 'CAC', b2bVal: b2b.cac, smsVal: sms.cac,
                  fmt: (v: number) => v > 0 ? fmt$(v) : '—', higher: false,
                },
              ].map(({ label, b2bVal, smsVal, fmt: fmtFn, higher }) => {
                const b2bWins = higher ? b2bVal > smsVal : (b2bVal < smsVal && b2bVal > 0);
                const smsWins = higher ? smsVal > b2bVal : (smsVal < b2bVal && smsVal > 0);
                const tied = !b2bWins && !smsWins;
                return (
                  <tr key={label}>
                    <td className="text-slate-400 text-xs py-3 pr-6">{label}</td>
                    <td className={`text-right text-xs py-3 px-4 font-medium ${b2bWins ? 'text-indigo-300' : 'text-slate-300'}`}>
                      {fmtFn(b2bVal)}
                    </td>
                    <td className={`text-right text-xs py-3 px-4 font-medium ${smsWins ? 'text-green-300' : 'text-slate-300'}`}>
                      {fmtFn(smsVal)}
                    </td>
                    <td className="text-right text-xs py-3 pl-4">
                      {tied ? <span className="text-slate-600">—</span>
                        : b2bWins ? <span className="badge-blue">B2B Ads</span>
                        : <span className="badge-green">SMS</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── What-if simulator ──────────────────────────────────────────────── */}
      <section className="card p-5">
        <h2 className="text-slate-200 font-semibold text-sm mb-1 flex items-center gap-2">
          <Sliders size={16} className="text-purple-400" />
          What-If Simulator
        </h2>
        <p className="text-slate-500 text-xs mb-5">Adjust the sliders to model different scenarios in real time.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sliders */}
          <div className="space-y-5">
            {[
              {
                label: `B2B New Clients: ${sim.b2bClients}`,
                value: sim.b2bClients, min: 0, max: 50, step: 1,
                onChange: (v: number) => setSim(s => ({ ...s, b2bClients: v })),
              },
              {
                label: `SMS New Clients: ${sim.smsClients}`,
                value: sim.smsClients, min: 0, max: 50, step: 1,
                onChange: (v: number) => setSim(s => ({ ...s, smsClients: v })),
              },
              {
                label: `Price per Appointment: $${sim.pricePerAppt}`,
                value: sim.pricePerAppt, min: 0, max: 1000, step: 10,
                onChange: (v: number) => setSim(s => ({ ...s, pricePerAppt: v })),
              },
              {
                label: `B2B Ad Spend: $${sim.b2bSpend.toLocaleString()}`,
                value: sim.b2bSpend, min: 0, max: 50000, step: 500,
                onChange: (v: number) => setSim(s => ({ ...s, b2bSpend: v })),
              },
              {
                label: `SMS Spend: $${sim.smsSpend.toLocaleString()}`,
                value: sim.smsSpend, min: 0, max: 20000, step: 250,
                onChange: (v: number) => setSim(s => ({ ...s, smsSpend: v })),
              },
            ].map(({ label, value, min, max, step, onChange }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>{label}</span>
                </div>
                <input
                  type="range"
                  min={min} max={max} step={step} value={value}
                  onChange={e => onChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#2A2A2A] rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 gap-3 content-start">
            <KpiCard label="Simulated Revenue" value={fmt$(simRevenue)} highlight />
            <KpiCard label="Simulated Profit" value={fmt$(simProfit)}
              color={simProfit >= 0 ? 'text-green-400' : 'text-red-400'} highlight />
            <KpiCard label="Blended CAC" value={simCAC > 0 ? fmt$(simCAC) : '—'} highlight />
            <KpiCard label="Profit Margin" value={pct(simMargin)}
              color={simMargin >= 20 ? 'text-green-400' : simMargin >= 0 ? 'text-amber-400' : 'text-red-400'} highlight />
            <div className="col-span-2 rounded-xl p-4 border border-indigo-700/30 bg-indigo-900/10">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">vs current actuals</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Revenue', sim: simRevenue, actual: b2b.revenue + sms.revenue },
                  { label: 'Profit', sim: simProfit, actual: b2b.profit + sms.profit },
                  { label: 'CAC', sim: simCAC, actual: blendedCAC },
                ].map(({ label, sim: sv, actual }) => {
                  const diff = sv - actual;
                  const pos = diff >= 0;
                  return (
                    <div key={label}>
                      <p className="text-slate-500 mb-0.5">{label}</p>
                      <p className={`font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>
                        {diff >= 0 ? '+' : ''}{fmt$(diff)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
