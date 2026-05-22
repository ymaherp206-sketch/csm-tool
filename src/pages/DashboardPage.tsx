import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getClients } from '../services/storage';
import { enrichClient, getAgencyMonthlyData } from '../services/metrics';
import { format, parseISO, addDays } from 'date-fns';
import {
  Users, DollarSign, TrendingUp, TrendingDown, Target, Briefcase,
  AlertTriangle, ChevronLeft, ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { HappinessBadge, ChurnBadge } from '../components/ui/Badges';
import { exportAgencyCSV } from '../services/export';
import { getClientJobs } from '../services/storage';
import { format as fmt } from 'date-fns';

function currentMonthStr() {
  return fmt(new Date(), 'yyyy-MM');
}

function prevMonthStr(month: string) {
  const [y, m] = month.split('-').map(Number);
  return fmt(new Date(y, m - 2, 1), 'yyyy-MM');
}

function nextMonthStr(month: string) {
  const [y, m] = month.split('-').map(Number);
  return fmt(new Date(y, m, 1), 'yyyy-MM');
}

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [refresh] = useState(0);

  const allClients = useMemo(() => {
    const raw = getClients().filter(c => c.status !== 'Archived');
    return raw.map(c => enrichClient(c, selectedMonth));
  }, [selectedMonth, refresh]);

  const activeClients = allClients.filter(c => c.status === 'Active');

  // Aggregate metrics for selected month
  const totalRevenue = activeClients.reduce((s, c) => s + c.currentRevenue, 0);
  const totalAdSpend = activeClients.reduce((s, c) => s + c.currentAdSpend, 0);
  const totalProfit = totalRevenue - totalAdSpend;
  const avgROAS = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

  // Previous month
  const prevMonth = prevMonthStr(selectedMonth);
  const prevClients = useMemo(() => {
    const raw = getClients().filter(c => c.status !== 'Archived');
    return raw.map(c => enrichClient(c, prevMonth));
  }, [prevMonth]);

  const prevRevenue = prevClients.reduce((s, c) => s + c.currentRevenue, 0);
  const prevSpend = prevClients.reduce((s, c) => s + c.currentAdSpend, 0);
  const prevProfit = prevRevenue - prevSpend;

  const momRevenue = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const momSpend = prevSpend > 0 ? ((totalAdSpend - prevSpend) / prevSpend) * 100 : null;
  const momProfit = prevProfit !== 0 ? ((totalProfit - prevProfit) / Math.abs(prevProfit)) * 100 : null;

  // Jobs this month
  const jobsThisMonth = useMemo(() => {
    let count = 0, value = 0;
    for (const c of activeClients) {
      const jobs = getClientJobs(c.id).filter(j => j.date.startsWith(selectedMonth));
      count += jobs.length;
      value += jobs.reduce((s, j) => s + j.value, 0);
    }
    return { count, value };
  }, [activeClients, selectedMonth]);

  // Trend chart
  const trendData = useMemo(() => {
    const raw = getClients().filter(c => c.status !== 'Archived');
    return getAgencyMonthlyData(raw, 6);
  }, [refresh]);

  // Clients needing attention
  const unprofitable = activeClients.filter(c => c.isUnprofitable);
  const atRiskHappiness = activeClients.filter(c => c.happinessScore !== null && c.happinessScore <= 2);
  const highChurn = activeClients.filter(c => c.churnRisk.level === 'High');
  const renewalSoon = activeClients.filter(c => c.isRenewalSoon);
  const needAttention = [...new Set([...unprofitable, ...atRiskHappiness, ...highChurn, ...renewalSoon])];

  // Top clients by profit
  const topClients = [...activeClients]
    .sort((a, b) => b.currentProfit - a.currentProfit)
    .slice(0, 3);

  // Upcoming next actions (next 7 days)
  const upcoming = useMemo(() => {
    const now = new Date();
    const in7 = addDays(now, 7);
    return activeClients
      .filter(c => c.nextAction)
      .map(c => ({ client: c, action: c.nextAction! }))
      .filter(({ action }) => {
        const d = parseISO(action.dueDate);
        return d <= in7;
      })
      .sort((a, b) => a.action.dueDate.localeCompare(b.action.dueDate));
  }, [activeClients]);

  function MoMBadge({ val }: { val: number | null }) {
    if (val === null) return <span className="text-slate-500 text-xs">—</span>;
    return (
      <span className={`text-xs font-medium flex items-center gap-0.5 ${val > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {val > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(val).toFixed(1)}% MoM
      </span>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">{activeClients.length} active clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportAgencyCSV(allClients, selectedMonth)} className="btn-secondary text-xs flex items-center gap-1.5">
            Export CSV
          </button>
          <button onClick={() => setSelectedMonth(prevMonthStr(selectedMonth))} className="btn-secondary px-2 py-1.5">
            <ChevronLeft size={16} />
          </button>
          <span className="text-slate-300 font-medium text-sm min-w-[90px] text-center">{selectedMonth}</span>
          <button
            onClick={() => { if (selectedMonth < currentMonthStr()) setSelectedMonth(nextMonthStr(selectedMonth)); }}
            className="btn-secondary px-2 py-1.5"
            disabled={selectedMonth >= currentMonthStr()}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Active Clients', value: activeClients.length, icon: <Users size={18} />, mom: null },
          { label: 'Revenue', value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <DollarSign size={18} />, mom: momRevenue },
          { label: 'Ad Spend', value: `$${totalAdSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <TrendingDown size={18} />, mom: momSpend ? -momSpend : null },
          { label: 'Net Profit', value: `$${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18} />, mom: momProfit, green: totalProfit >= 0 },
          { label: 'Closed Jobs', value: `${jobsThisMonth.count} · $${jobsThisMonth.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <Briefcase size={18} />, mom: null },
          { label: 'Avg ROAS', value: avgROAS > 0 ? `${avgROAS.toFixed(2)}x` : '—', icon: <Target size={18} />, mom: null },
        ].map(m => (
          <div key={m.label} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{m.label}</span>
              <span className="text-slate-600">{m.icon}</span>
            </div>
            <p className={`text-xl font-bold mb-1 ${m.green !== undefined ? (m.green ? 'text-green-400' : 'text-red-400') : 'text-slate-100'}`}>
              {m.value}
            </p>
            <MoMBadge val={m.mom} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trend chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-slate-200 font-semibold text-sm mb-4">Agency Profit Trend (6 Months)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                  formatter={(val, name) => [`$${Number(val).toFixed(0)}`, name as string]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="adSpend" name="Ad Spend" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top clients */}
        <div className="card p-5">
          <h2 className="text-slate-200 font-semibold text-sm mb-4">Top Clients by Profit</h2>
          {topClients.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
                  <span className="text-slate-500 font-bold text-sm w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">{c.name}</p>
                    <p className="text-slate-500 text-xs">{c.assignedCSM}</p>
                  </div>
                  <span className={`text-sm font-semibold ${c.currentProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${c.currentProfit.toFixed(0)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients needing attention */}
        <div className="card p-5">
          <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Clients Needing Attention
            {needAttention.length > 0 && (
              <span className="badge-red ml-1">{needAttention.length}</span>
            )}
          </h2>
          {needAttention.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">All clients look healthy!</p>
          ) : (
            <div className="space-y-2">
              {needAttention.map(c => (
                <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium">{c.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {c.isUnprofitable && <span className="badge-red">Unprofitable</span>}
                      {c.happinessScore !== null && c.happinessScore <= 2 && <HappinessBadge score={c.happinessScore} />}
                      {c.churnRisk.level === 'High' && <ChurnBadge level="High" score={c.churnRisk.total} />}
                      {c.isRenewalSoon && <span className="badge-amber">Renewal Soon</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${c.currentProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${c.currentProfit.toFixed(0)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming next actions */}
        <div className="card p-5">
          <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            Upcoming Next Actions (7 days)
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No upcoming actions.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(({ client: c, action }) => {
                const isOverdue = parseISO(action.dueDate) < new Date();
                return (
                  <Link key={c.id} to={`/clients/${c.id}`} className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
                    {isOverdue && <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-medium truncate">{action.description}</p>
                      <p className="text-slate-500 text-xs">{c.name}</p>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                      {format(parseISO(action.dueDate), 'MMM d')}
                      {isOverdue && ' — OVERDUE'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
