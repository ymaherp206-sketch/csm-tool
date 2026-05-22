import type { AgencyMonthData, BenchmarkConfig } from '../types';
import { getClients, getFinancials, getAgencyMonthData } from './storage';
import { calcTiersRevenue, calcTiersBooked } from './metrics';
import { format as fmt, subMonths } from 'date-fns';

export type Rating = 'Good' | 'Average' | 'Poor';

export function rate(value: number, cfg: BenchmarkConfig): Rating {
  if (!isFinite(value)) return 'Poor';
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
  revenue: number;
  totalLeads: number;
  totalBookedAppts: number;
  totalReplies: number;
  profit: number;
  margin: number;
  cac: number;
  cpl: number;
  costPerBookedAppt: number;
  leadToBookedRate: number;
  breakEvenClients: number;
  roas: number;
  revenuePerClient: number;
  costPerAcquiredRevenue: number;
  costPerReply: number;
  replyToBookedRate: number;
}

export function calcChannelMetrics(
  spend: number,
  newClients: number,
  revenue: number,
  totalLeads: number,
  totalBookedAppts: number,
  totalReplies = 0,
): ChannelMetrics {
  const profit = revenue - spend;
  const margin = revenue > 0 ? (profit / revenue) * 100 : NaN;
  const cac = newClients > 0 ? spend / newClients : NaN;
  const cpl = totalLeads > 0 ? spend / totalLeads : NaN;
  const costPerBookedAppt = totalBookedAppts > 0 ? spend / totalBookedAppts : NaN;
  const leadToBookedRate = totalLeads > 0 ? (totalBookedAppts / totalLeads) * 100 : NaN;
  const avgRevPerClient = newClients > 0 ? revenue / newClients : 0;
  const breakEvenClients = avgRevPerClient > 0 ? spend / avgRevPerClient : NaN;
  const roas = spend > 0 ? revenue / spend : NaN;
  const revenuePerClient = newClients > 0 ? revenue / newClients : NaN;
  const costPerAcquiredRevenue = revenue > 0 ? (spend / revenue) * 100 : NaN;
  const costPerReply = totalReplies > 0 ? spend / totalReplies : NaN;
  const replyToBookedRate = totalReplies > 0 ? (totalBookedAppts / totalReplies) * 100 : NaN;

  return {
    spend, newClients, revenue, totalLeads, totalBookedAppts, totalReplies,
    profit, margin, cac, cpl, costPerBookedAppt,
    leadToBookedRate, breakEvenClients, roas, revenuePerClient,
    costPerAcquiredRevenue, costPerReply, replyToBookedRate,
  };
}

export function calcAdsMetrics(d: AgencyMonthData): ChannelMetrics {
  const revenue = calcTiersRevenue(d.adsPricingTiers ?? []);
  return calcChannelMetrics(d.adsSpend, d.adsNewClients, revenue, d.adsTotalLeads, d.adsTotalBookedAppts, 0);
}

export function calcSmsMetrics(d: AgencyMonthData): ChannelMetrics {
  const revenue = calcTiersRevenue(d.smsPricingTiers ?? []);
  return calcChannelMetrics(d.smsSpend, d.smsNewClients, revenue, d.smsTotalLeads, d.smsTotalBookedAppts, d.smsTotalReplies);
}

// ── Client performance averages (Section 2) ───────────────────────────────────

export interface ClientPerformanceStats {
  clientCount: number;
  totalBookedAppts: number;
  totalRevenue: number;
  totalAdSpend: number;
  totalProfit: number;
  avgBookedAppts: number;
  avgRevenue: number;
  avgAdSpend: number;
  avgProfit: number;
  avgMargin: number;
  avgROAS: number;
  avgCostPerBookedAppt: number;
}

export function calcClientPerformance(month: string): ClientPerformanceStats {
  const clients = getClients().filter(c => c.status === 'Active');
  const allF = getFinancials().filter(f => f.month === month);

  let totalBooked = 0, totalRev = 0, totalSpend = 0, count = 0;

  for (const c of clients) {
    const f = allF.find(x => x.clientId === c.id);
    if (!f) continue;
    const rev = calcTiersRevenue(f.pricingTiers ?? []);
    totalBooked += calcTiersBooked(f.pricingTiers ?? []);
    totalRev += rev;
    totalSpend += f.adSpend;
    count++;
  }

  const totalProfit = totalRev - totalSpend;

  return {
    clientCount: count,
    totalBookedAppts: totalBooked,
    totalRevenue: totalRev,
    totalAdSpend: totalSpend,
    totalProfit,
    avgBookedAppts: count > 0 ? totalBooked / count : NaN,
    avgRevenue: count > 0 ? totalRev / count : NaN,
    avgAdSpend: count > 0 ? totalSpend / count : NaN,
    avgProfit: count > 0 ? totalProfit / count : NaN,
    avgMargin: totalRev > 0 ? (totalProfit / totalRev) * 100 : NaN,
    avgROAS: totalSpend > 0 ? totalRev / totalSpend : NaN,
    avgCostPerBookedAppt: totalBooked > 0 ? totalSpend / totalBooked : NaN,
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
  const newClientRevenue = calcTiersRevenue(d.adsPricingTiers ?? []) + calcTiersRevenue(d.smsPricingTiers ?? []);
  const totalRevenue = newClientRevenue + d.retainerRevenue + clientStats.totalRevenue;
  const totalAcqSpend = d.adsSpend + d.smsSpend;
  const totalClientAdSpend = clientStats.totalAdSpend;
  const grossProfit = totalRevenue - totalClientAdSpend;
  const netProfit = grossProfit - totalAcqSpend - d.operatingCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : NaN;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : NaN;
  const totalNewClients = d.adsNewClients + d.smsNewClients;
  const blendedCAC = totalNewClients > 0 ? totalAcqSpend / totalNewClients : NaN;
  const totalSpend = totalAcqSpend + totalClientAdSpend + d.operatingCosts;
  const costToRevenueRatio = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : NaN;

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
// Use NaN/Infinity (not 0) to signal "no data" — legitimate $0 values display as $0.

export function fmtMoney(n: number, decimals = 0): string {
  if (!isFinite(n)) return '—';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(n: number): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(1) + '%';
}

export function fmtNum(n: number, decimals = 1): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

export function momChange(current: number, prev: number): number | null {
  if (!prev || !isFinite(current) || !isFinite(prev)) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}
