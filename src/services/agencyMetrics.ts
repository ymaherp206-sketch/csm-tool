import type { AgencyMonthData, BenchmarkConfig } from '../types';
import { getClients, getFinancials, getAgencyMonthData } from './storage';
import { calcRevenue } from './metrics';
import { format as fmt, subMonths } from 'date-fns';

export type Rating = 'Good' | 'Average' | 'Poor';

export function rate(value: number, cfg: BenchmarkConfig): Rating {
  if (!isFinite(value) || value === 0) return 'Poor';
  if (cfg.higherIsBetter) {
    if (value >= cfg.good) return 'Good';
    if (value >= cfg.avg)  return 'Average';
    return 'Poor';
  } else {
    if (value <= cfg.good) return 'Good';
    if (value <= cfg.avg)  return 'Average';
    return 'Poor';
  }
}

// ── Per-channel derived metrics ───────────────────────────────────────────────

export interface ChannelMetrics {
  spend: number;
  newClients: number;
  avgShownAppts: number;
  pricePerAppt: number;
  totalLeads: number;
  totalBookedAppts: number;
  totalShownAppts: number;
  revenue: number;
  profit: number;
  margin: number;
  cac: number;
  cpl: number;
  costPerBookedAppt: number;
  costPerShownAppt: number;
  leadToBookedRate: number;
  showRate: number;
  breakEvenClients: number;
}

export function calcChannelMetrics(
  spend: number,
  newClients: number,
  avgShownAppts: number,
  pricePerAppt: number,
  totalLeads: number,
  totalBookedAppts: number,
): ChannelMetrics {
  const totalShownAppts = newClients * avgShownAppts;
  const revenue = totalShownAppts * pricePerAppt;
  const profit = revenue - spend;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const cac = newClients > 0 ? spend / newClients : 0;
  const cpl = totalLeads > 0 ? spend / totalLeads : 0;
  const costPerBookedAppt = totalBookedAppts > 0 ? spend / totalBookedAppts : 0;
  const costPerShownAppt = totalShownAppts > 0 ? spend / totalShownAppts : 0;
  const leadToBookedRate = totalLeads > 0 ? (totalBookedAppts / totalLeads) * 100 : 0;
  const showRate = totalBookedAppts > 0 ? (totalShownAppts / totalBookedAppts) * 100 : 0;
  const avgRevPerClient = newClients > 0 ? revenue / newClients : 0;
  const breakEvenClients = avgRevPerClient > 0 ? spend / avgRevPerClient : 0;

  return {
    spend, newClients, avgShownAppts, pricePerAppt, totalLeads, totalBookedAppts,
    totalShownAppts, revenue, profit, margin, cac, cpl,
    costPerBookedAppt, costPerShownAppt, leadToBookedRate, showRate, breakEvenClients,
  };
}

export function calcAdsMetrics(d: AgencyMonthData): ChannelMetrics {
  return calcChannelMetrics(
    d.adsSpend, d.adsNewClients, d.adsAvgShownAppts, d.adsPricePerAppt,
    d.adsTotalLeads, d.adsTotalBookedAppts,
  );
}

export function calcSmsMetrics(d: AgencyMonthData): ChannelMetrics {
  return calcChannelMetrics(
    d.smsSpend, d.smsNewClients, d.smsAvgShownAppts, d.smsPricePerAppt,
    d.smsTotalLeads, d.smsTotalBookedAppts,
  );
}

// ── Client performance averages (Section 2) ───────────────────────────────────

export interface ClientPerformanceStats {
  clientCount: number;
  totalShownAppts: number;
  totalRevenue: number;
  totalAdSpend: number;
  totalProfit: number;
  avgShownAppts: number;
  avgRevenue: number;
  avgAdSpend: number;
  avgProfit: number;
  avgMargin: number;
  avgROAS: number;
  avgCostPerShownAppt: number;
}

export function calcClientPerformance(month: string): ClientPerformanceStats {
  const clients = getClients().filter(c => c.status === 'Active');
  const allF = getFinancials().filter(f => f.month === month);

  let totalShown = 0, totalRev = 0, totalSpend = 0, count = 0;

  for (const c of clients) {
    const f = allF.find(x => x.clientId === c.id);
    if (!f) continue;
    const rev = calcRevenue(f.appointmentsShown, c.pricePerAppointment);
    totalShown += f.appointmentsShown;
    totalRev += rev;
    totalSpend += f.adSpend;
    count++;
  }

  const totalProfit = totalRev - totalSpend;
  const avg = (n: number) => count > 0 ? n / count : 0;

  return {
    clientCount: count,
    totalShownAppts: totalShown,
    totalRevenue: totalRev,
    totalAdSpend: totalSpend,
    totalProfit,
    avgShownAppts: avg(totalShown),
    avgRevenue: avg(totalRev),
    avgAdSpend: avg(totalSpend),
    avgProfit: avg(totalProfit),
    avgMargin: totalRev > 0 ? (totalProfit / totalRev) * 100 : 0,
    avgROAS: totalSpend > 0 ? totalRev / totalSpend : 0,
    avgCostPerShownAppt: totalShown > 0 ? totalSpend / totalShown : 0,
  };
}

// ── P&L summary ───────────────────────────────────────────────────────────────

export interface PnLSummary {
  totalRevenue: number;
  totalClientAdSpend: number;
  totalAcqSpend: number;
  totalOperatingCosts: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  blendedCAC: number;
  costToRevenueRatio: number;
  totalNewClients: number;
}

export function calcPnL(d: AgencyMonthData, clientStats: ClientPerformanceStats): PnLSummary {
  const ads = calcAdsMetrics(d);
  const sms = calcSmsMetrics(d);

  const newClientRevenue = ads.revenue + sms.revenue;
  const totalRevenue = newClientRevenue + d.retainerRevenue + clientStats.totalRevenue;
  const totalAcqSpend = d.adsSpend + d.smsSpend;
  const totalClientAdSpend = clientStats.totalAdSpend;
  const grossProfit = totalRevenue - totalClientAdSpend;
  const netProfit = grossProfit - totalAcqSpend - d.operatingCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const totalNewClients = d.adsNewClients + d.smsNewClients;
  const blendedCAC = totalNewClients > 0 ? totalAcqSpend / totalNewClients : 0;
  const totalSpend = totalAcqSpend + totalClientAdSpend + d.operatingCosts;
  const costToRevenueRatio = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;

  return {
    totalRevenue, totalClientAdSpend, totalAcqSpend, totalOperatingCosts: d.operatingCosts,
    grossProfit, netProfit, grossMargin, netMargin, blendedCAC, costToRevenueRatio, totalNewClients,
  };
}

// ── 6-month trend ─────────────────────────────────────────────────────────────

export function calcTrendData(anchorMonth: string) {
  return Array.from({ length: 6 }, (_, i) => {
    const m = fmt(subMonths(new Date(anchorMonth + '-01'), 5 - i), 'yyyy-MM');
    const label = fmt(new Date(m + '-01'), 'MMM yy');
    const d = getAgencyMonthData(m);
    const cs = calcClientPerformance(m);
    const pnl = calcPnL(d, cs);
    return {
      label,
      revenue: Math.round(pnl.totalRevenue),
      spend: Math.round(pnl.totalAcqSpend + pnl.totalClientAdSpend + pnl.totalOperatingCosts),
      profit: Math.round(pnl.netProfit),
    };
  });
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmtMoney(n: number, decimals = 0): string {
  if (!isFinite(n) || n === 0) return '—';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(n: number): string {
  if (!isFinite(n) || n === 0) return '—';
  return n.toFixed(1) + '%';
}

export function fmtNum(n: number, decimals = 1): string {
  if (!isFinite(n) || n === 0) return '—';
  return n.toFixed(decimals);
}

export function momChange(current: number, prev: number): number | null {
  if (!prev) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}
