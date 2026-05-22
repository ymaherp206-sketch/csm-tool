import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, saveClient, getRetainerMonthData } from '../services/storage';
import { enrichClient } from '../services/metrics';
import { exportClientCSV, exportClientPDF } from '../services/export';
import type { Client } from '../types';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Edit2, Archive, Download, AlertTriangle, TrendingDown,
  CheckSquare, DollarSign, Target, BarChart2, ChevronLeft, ChevronRight
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import ClientForm from '../components/clients/ClientForm';
import FinancialLog from '../components/financial/FinancialLog';
import RetainerFinancialLog from '../components/financial/RetainerFinancialLog';
import JobsSection from '../components/jobs/JobsSection';
import HappinessSection from '../components/happiness/HappinessSection';
import ActivitySection from '../components/activity/ActivitySection';
import ChurnSection from '../components/churn/ChurnSection';
import { StatusBadge, HappinessBadge, ChurnBadge, RenewalBadge, BillingModelBadge } from '../components/ui/Badges';
import {
  calcTiersRevenue, calcTiersBooked, calcProfit
} from '../services/metrics';
import { getClientFinancials } from '../services/storage';
import { format as fmt, subMonths } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

function currentMonthStr() {
  return fmt(new Date(), 'yyyy-MM');
}

function prevMonthStr(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return fmt(d, 'yyyy-MM');
}

function nextMonthStr(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return fmt(d, 'yyyy-MM');
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());

  const reload = useCallback(() => setRefresh(r => r + 1), []);

  const client = useMemo(() => {
    if (!id) return null;
    return getClient(id) ?? null;
  }, [id, refresh]);

  const enriched = useMemo(() => {
    if (!client) return null;
    return enrichClient(client, selectedMonth);
  }, [client, selectedMonth, refresh]);

  if (!client || !enriched) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Client not found.</p>
        <Link to="/clients" className="btn-primary mt-4 inline-block">Back to Clients</Link>
      </div>
    );
  }

  function handleArchive() {
    if (!client) return;
    if (!window.confirm(`Archive ${client.name}? They will be hidden from the active list.`)) return;
    const updated: Client = { ...client, status: 'Archived', updatedAt: new Date().toISOString() };
    saveClient(updated);
    reload();
  }

  const isRetainer = (client.billingModel ?? 'PPSA') === 'Retainer';
  const prevMonth = prevMonthStr(selectedMonth);
  const allFinancials = getClientFinancials(client.id);

  // Previous month comparison
  let prevRevenue = 0, prevProfit = 0, prevAdSpend = 0;
  if (isRetainer) {
    const prevRD = getRetainerMonthData(client.id, prevMonth);
    prevRevenue = prevRD.retainerFee > 0 ? prevRD.retainerFee : client.retainerFee;
    prevProfit = prevRevenue;
    prevAdSpend = prevRD.clientAdSpend;
  } else {
    const prevF = allFinancials.find(f => f.month === prevMonth) ?? null;
    prevRevenue = prevF ? calcTiersRevenue(prevF.pricingTiers ?? []) : 0;
    prevProfit = prevF ? calcProfit(prevRevenue, prevF.adSpend) : 0;
    prevAdSpend = prevF?.adSpend ?? 0;
  }

  const momRevenue = prevRevenue > 0 ? ((enriched.currentRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const momProfit = prevProfit !== 0 ? ((enriched.currentProfit - prevProfit) / Math.abs(prevProfit)) * 100 : null;
  const momAdSpend = prevAdSpend > 0 ? ((enriched.currentAdSpend - prevAdSpend) / prevAdSpend) * 100 : null;

  // Trend chart last 6 months
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(selectedMonth + '-01'), 5 - i);
    const m = fmt(d, 'yyyy-MM');
    const label = fmt(d, 'MMM yy');
    if (isRetainer) {
      const rd = getRetainerMonthData(client.id, m);
      const rev = rd.retainerFee > 0 ? rd.retainerFee : client.retainerFee;
      return { label, revenue: rev, adSpend: rd.clientAdSpend, profit: rev };
    }
    const f = allFinancials.find(x => x.month === m);
    if (!f) return { label, revenue: 0, adSpend: 0, profit: 0 };
    const rev = calcTiersRevenue(f.pricingTiers ?? []);
    const spend = f.adSpend;
    return { label, revenue: rev, adSpend: spend, profit: rev - spend };
  });

  const currentF = enriched.currentMonthFinancials;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/clients')} className="text-slate-500 hover:text-slate-300 mt-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-100">{client.name}</h1>
              <BillingModelBadge model={client.billingModel ?? 'PPSA'} />
              <StatusBadge status={client.status} />
              {enriched.isRenewalSoon && <RenewalBadge daysLeft={enriched.renewalDaysLeft} />}
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-sm">
              {client.businessType && <span>{client.businessType}</span>}
              {client.assignedCSM && <span>· {client.assignedCSM}</span>}
              <span>· Started {format(parseISO(client.startDate), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportClientCSV(enriched, selectedMonth)} className="btn-secondary flex items-center gap-1.5">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => exportClientPDF(enriched)} className="btn-secondary flex items-center gap-1.5">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-1.5">
            <Edit2 size={14} /> Edit
          </button>
          {client.status !== 'Archived' && (
            <button onClick={handleArchive} className="btn-danger flex items-center gap-1.5">
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {enriched.isUnprofitable && (
        <div className="flex items-start gap-3 p-4 bg-red-900/10 border border-red-900/30 rounded-xl mb-4">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm">This client is not profitable</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              Profit ${enriched.currentProfit.toFixed(0)} is below the minimum threshold of ${client.minProfitThreshold.toFixed(0)}.
              Revenue: ${enriched.currentRevenue.toFixed(0)} · Ad Spend: ${enriched.currentAdSpend.toFixed(0)} · Margin: {enriched.currentMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
      {enriched.isCumulativeLossRisk && (
        <div className="flex items-start gap-3 p-4 bg-amber-900/10 border border-amber-900/30 rounded-xl mb-4">
          <TrendingDown size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Cumulative Loss Risk</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Cumulative ad spend (${enriched.totalAdSpend.toFixed(0)}) is approaching total revenue (${enriched.totalRevenue.toFixed(0)}).
            </p>
          </div>
        </div>
      )}

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-6">
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
        <span className="text-slate-500 text-xs">Viewing financials for selected month</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Financial KPIs */}
          <div className="card p-5">
            <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" />
              Monthly Financials — {selectedMonth}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {((): { label: string; value: string; trend?: number | null; color: string }[] => {
                if (isRetainer) {
                  const rd = enriched.currentRetainerData;
                  const clientROAS = rd && rd.clientAdSpend > 0 && rd.closedJobsValue > 0
                    ? (rd.closedJobsValue / rd.clientAdSpend).toFixed(2) + 'x' : '—';
                  return [
                    { label: 'Retainer Fee', value: enriched.currentRevenue > 0 ? `$${enriched.currentRevenue.toFixed(0)}` : '—', trend: momRevenue, color: 'text-slate-200' },
                    { label: "Client's Ad Spend *", value: rd && rd.clientAdSpend > 0 ? `$${rd.clientAdSpend.toFixed(0)}` : '—', trend: momAdSpend ? -momAdSpend : null, color: 'text-slate-400' },
                    { label: 'Agency Profit', value: enriched.currentProfit > 0 ? `$${enriched.currentProfit.toFixed(0)}` : '—', trend: momProfit, color: 'text-green-400' },
                    { label: 'Client ROAS *', value: clientROAS, color: 'text-slate-200' },
                  ];
                }
                return [
                  { label: 'Revenue', value: `$${enriched.currentRevenue.toFixed(0)}`, trend: momRevenue, color: 'text-slate-200' },
                  { label: 'Ad Spend', value: `$${enriched.currentAdSpend.toFixed(0)}`, trend: momAdSpend ? -momAdSpend : null, color: 'text-slate-200' },
                  { label: 'Net Profit', value: `$${enriched.currentProfit.toFixed(0)}`, trend: momProfit, color: enriched.currentProfit >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'ROAS', value: enriched.currentROAS > 0 ? `${enriched.currentROAS.toFixed(2)}x` : '—', color: 'text-slate-200' },
                ];
              })().map(m => (
                <div key={m.label} className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                  <p className="text-slate-500 text-xs mb-1">{m.label}</p>
                  <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                  {m.trend !== null && m.trend !== undefined && (
                    <p className={`text-xs mt-0.5 ${m.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {m.trend > 0 ? '↑' : '↓'} {Math.abs(m.trend).toFixed(1)}% MoM
                    </p>
                  )}
                </div>
              ))}
            </div>
            {isRetainer ? (() => {
              const rd = enriched.currentRetainerData;
              const closedJobs = rd ? rd.closedJobsCount : 0;
              const avgJobVal = rd && rd.closedJobsCount > 0 ? `$${(rd.closedJobsValue / rd.closedJobsCount).toFixed(0)}` : '—';
              const clientCPL = rd && rd.clientLeads > 0 && rd.clientAdSpend > 0 ? `$${(rd.clientAdSpend / rd.clientLeads).toFixed(0)}` : '—';
              return (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Closed Jobs', value: closedJobs > 0 ? String(closedJobs) : '—', icon: <CheckSquare size={14} /> },
                    { label: 'Avg Job Value', value: avgJobVal, icon: <DollarSign size={14} /> },
                    { label: 'Client CPL *', value: clientCPL, icon: <BarChart2 size={14} /> },
                  ].map(m => (
                    <div key={m.label} className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                      <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">{m.icon} {m.label}</div>
                      <p className="text-slate-200 font-semibold text-sm">{m.value}</p>
                    </div>
                  ))}
                </div>
              );
            })() : (() => {
              const tiers = currentF?.pricingTiers ?? [];
              const totalBooked = calcTiersBooked(tiers);
              const revenue = calcTiersRevenue(tiers);
              const avgPrice = totalBooked > 0 ? revenue / totalBooked : 0;
              const adSpend = currentF?.adSpend ?? 0;
              const breakEven = avgPrice > 0 ? adSpend / avgPrice : 0;
              return (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Booked', value: totalBooked > 0 ? String(totalBooked) + ' appts' : '—', icon: <Target size={14} /> },
                    { label: 'Margin', value: enriched.currentMargin > 0 || enriched.currentRevenue > 0 ? `${enriched.currentMargin.toFixed(1)}%` : '—', icon: <BarChart2 size={14} /> },
                    { label: 'Break-even', value: adSpend > 0 && avgPrice > 0 ? `${breakEven.toFixed(0)} appts` : '—', icon: <Target size={14} /> },
                  ].map(m => (
                    <div key={m.label} className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                      <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">{m.icon} {m.label}</div>
                      <p className="text-slate-200 font-semibold text-sm">{m.value}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Cumulative LTV */}
          <div className="card p-5">
            <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-indigo-400" />
              All-Time Cumulative
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total LTV', value: `$${enriched.totalRevenue.toFixed(0)}` },
                { label: 'Total Ad Spend', value: `$${enriched.totalAdSpend.toFixed(0)}` },
                { label: 'Total Net Profit', value: `$${enriched.totalProfit.toFixed(0)}`, color: enriched.totalProfit >= 0 ? 'text-green-400' : 'text-red-400' },
                { label: 'Total Booked', value: enriched.totalBookedAppointments > 0 ? enriched.totalBookedAppointments + ' appts' : '—' },
                { label: 'Avg Monthly Profit', value: `$${enriched.avgMonthlyProfit.toFixed(0)}` },
              ].map(m => (
                <div key={m.label} className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                  <p className="text-slate-500 text-xs mb-1">{m.label}</p>
                  <p className={`font-semibold text-sm ${m.color ?? 'text-slate-200'}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue chart */}
          <div className="card p-5">
            <h2 className="text-slate-200 font-semibold text-sm mb-4">6-Month Trend</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                    formatter={(val, name) => [`$${Number(val).toFixed(0)}`, name as string]}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="adSpend" name="Ad Spend" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Log input */}
          <div className="card p-5">
            {isRetainer ? (
              <RetainerFinancialLog
                clientId={client.id}
                defaultRetainerFee={client.retainerFee}
                month={selectedMonth}
                onSaved={reload}
              />
            ) : (
              <FinancialLog
                clientId={client.id}
                month={selectedMonth}
                onSaved={reload}
              />
            )}
          </div>

          {/* Jobs */}
          <div className="card p-5">
            <JobsSection clientId={client.id} month={selectedMonth} onChanged={reload} />
          </div>

          {/* Activity */}
          <div className="card p-5">
            <ActivitySection clientId={client.id} onChanged={reload} />
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Badges / quick info */}
          <div className="card p-5">
            <h2 className="text-slate-200 font-semibold text-sm mb-4">Client Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Happiness</span>
                <HappinessBadge score={enriched.happinessScore} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Churn Risk</span>
                <ChurnBadge level={enriched.churnRisk.level} score={enriched.churnRisk.total} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Channel</span>
                <span className="badge-blue">{client.commChannel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Contract ends</span>
                <span className="text-slate-300 text-xs">
                  {format(parseISO(client.contractEndDate), 'MMM d, yyyy')}
                  {enriched.renewalDaysLeft >= 0 && ` (${enriched.renewalDaysLeft}d)`}
                </span>
              </div>
              {!isRetainer && client.pricePerAppointment > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Default price/appt</span>
                  <span className="text-slate-300 text-xs">${client.pricePerAppointment}</span>
                </div>
              )}
            </div>
          </div>

          {/* Onboarding checklist */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
                <CheckSquare size={16} className="text-indigo-400" />
                Onboarding
              </h2>
              <span className="text-indigo-400 text-xs font-semibold">{enriched.onboardingCompletion}%</span>
            </div>
            <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${enriched.onboardingCompletion}%` }} />
            </div>
            <div className="space-y-2">
              {client.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${item.completed ? 'bg-indigo-600' : 'border border-[#2A2A2A]'}`}>
                    {item.completed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className={`text-xs ${item.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Happiness */}
          <div className="card p-5">
            <HappinessSection clientId={client.id} onChanged={reload} />
          </div>

          {/* Churn risk */}
          <div className="card p-5">
            <ChurnSection breakdown={enriched.churnRisk} />
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="card p-5">
              <h2 className="text-slate-200 font-semibold text-sm mb-3">Notes</h2>
              <p className="text-slate-400 text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <Modal title={`Edit ${client.name}`} onClose={() => setShowEdit(false)} size="lg">
          <ClientForm
            client={client}
            onSaved={() => { setShowEdit(false); reload(); }}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      )}
    </div>
  );
}
