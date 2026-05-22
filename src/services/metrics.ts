import type {
  Client, MonthlyFinancials, RetainerMonthData, ClientWithMetrics, ChurnRiskBreakdown, PricingTier
} from '../types';
import {
  getClientFinancials, getClientHappiness, getClientActivity,
  getClientNextAction, getClientJobs,
  getRetainerMonthData, getRetainerMonthsForClient,
} from './storage';
import { differenceInDays, parseISO, format, subMonths } from 'date-fns';

export function calcRevenue(shown: number, price: number): number {
  return shown * price;
}

export function calcShowRate(shown: number, booked: number): number {
  if (!booked) return 0;
  return (shown / booked) * 100;
}

export function calcTiersRevenue(tiers: PricingTier[]): number {
  return tiers.reduce((sum, t) => sum + t.price * t.booked, 0);
}

export function calcTiersBooked(tiers: PricingTier[]): number {
  return tiers.reduce((sum, t) => sum + t.booked, 0);
}

export function calcProfit(revenue: number, adSpend: number): number {
  return revenue - adSpend;
}

export function calcMargin(profit: number, revenue: number): number {
  if (!revenue) return 0;
  return (profit / revenue) * 100;
}

export function calcROAS(revenue: number, adSpend: number): number {
  if (!adSpend) return 0;
  return revenue / adSpend;
}

export function calcBreakEven(adSpend: number, price: number): number {
  if (!price) return 0;
  return adSpend / price;
}

export function calcChurnRisk(
  client: Client,
  financials: MonthlyFinancials[],
  happinessScore: number | null,
  lastActivityDate: string | null
): ChurnRiskBreakdown {
  // Happiness (0–40 points, inverted: 5=0pts, 1=40pts)
  let happinessPts = 0;
  if (happinessScore !== null) {
    happinessPts = Math.round(((5 - happinessScore) / 4) * 40);
  } else {
    happinessPts = 20; // unknown = moderate
  }

  // Profit trend (0–35 points)
  let profitTrendPts = 0;
  const sorted = [...financials].sort((a, b) => b.month.localeCompare(a.month));
  if (sorted.length >= 2) {
    const latest = sorted[0];
    const prev = sorted[1];
    const latestRevenue = calcTiersRevenue(latest.pricingTiers ?? []);
    const prevRevenue = calcTiersRevenue(prev.pricingTiers ?? []);
    const latestProfit = calcProfit(latestRevenue, latest.adSpend);
    const prevProfit = calcProfit(prevRevenue, prev.adSpend);
    if (latestProfit < prevProfit) {
      const drop = prevProfit > 0 ? (prevProfit - latestProfit) / prevProfit : 1;
      profitTrendPts = Math.min(35, Math.round(drop * 35));
    }
  } else if (sorted.length === 1) {
    const f = sorted[0];
    const rev = calcTiersRevenue(f.pricingTiers ?? []);
    const profit = calcProfit(rev, f.adSpend);
    if (profit < 0) profitTrendPts = 35;
    else if (profit < client.minProfitThreshold) profitTrendPts = 17;
  }

  // Days since last activity (0–25 points)
  let activityPts = 0;
  if (lastActivityDate) {
    const days = differenceInDays(new Date(), parseISO(lastActivityDate));
    if (days > 30) activityPts = 25;
    else if (days > 14) activityPts = 15;
    else if (days > 7) activityPts = 6;
  } else {
    activityPts = 15; // no activity logged
  }

  // happiness(40) + profitTrend(35) + activity(25) = 100
  const totalPts = happinessPts + profitTrendPts + activityPts;
  const score = Math.round((totalPts / 100) * 10);
  const capped = Math.min(10, Math.max(1, score));

  const level: 'Low' | 'Medium' | 'High' =
    capped <= 3 ? 'Low' : capped <= 6 ? 'Medium' : 'High';

  return {
    happinessScore: happinessPts,
    profitTrend: profitTrendPts,
    daysSinceActivity: activityPts,
    showRate: 0,
    total: capped,
    level,
  };
}

export function enrichClient(client: Client, selectedMonth?: string): ClientWithMetrics {
  const month = selectedMonth || format(new Date(), 'yyyy-MM');
  const happiness = getClientHappiness(client.id);
  const activity = getClientActivity(client.id);
  const nextAction = getClientNextAction(client.id);
  const latestHappiness = happiness.length ? happiness[happiness.length - 1].score : null;
  const lastActivity = activity.length ? activity[0].date : null;

  const onboardingCompletion =
    client.checklist.length > 0
      ? Math.round((client.checklist.filter(c => c.completed).length / client.checklist.length) * 100)
      : 0;
  const renewalDaysLeft = differenceInDays(parseISO(client.contractEndDate), new Date());
  const isRenewalSoon = renewalDaysLeft >= 0 && renewalDaysLeft <= 30;

  let currentMonthFinancials: MonthlyFinancials | null = null;
  let currentRetainerData: RetainerMonthData | null = null;
  let currentRevenue = 0;
  let currentAdSpend = 0;
  let currentProfit = 0;
  let currentROAS = 0;
  let currentMargin = 0;
  let currentShowRate = 0;
  let totalRevenue = 0;
  let totalAdSpend = 0;
  let totalShown = 0;
  let avgMonthlyProfit = 0;
  let isUnprofitable = false;
  let isCumulativeLossRisk = false;
  let churnRisk: ChurnRiskBreakdown;

  if (client.billingModel === 'Retainer') {
    const rd = getRetainerMonthData(client.id, month);
    currentRetainerData = rd;
    const fee = rd.retainerFee > 0 ? rd.retainerFee : client.retainerFee;
    currentRevenue = fee;
    currentAdSpend = 0; // agency's cost is zero
    currentProfit = fee;
    currentROAS = 0;
    currentMargin = fee > 0 ? 100 : 0;
    currentShowRate = 0;

    const allRetainer = getRetainerMonthsForClient(client.id);
    totalRevenue = allRetainer.reduce((s, r) => {
      const f = r.retainerFee > 0 ? r.retainerFee : client.retainerFee;
      return s + f;
    }, 0);
    totalAdSpend = 0;
    totalShown = allRetainer.reduce((s, r) => s + r.appointmentsBooked, 0);
    const monthsWithData = allRetainer.filter(r => r.retainerFee > 0 || client.retainerFee > 0).length;
    avgMonthlyProfit = monthsWithData > 0 ? totalRevenue / monthsWithData : client.retainerFee;

    churnRisk = calcChurnRisk(client, [], latestHappiness, lastActivity);
    isUnprofitable = false;
    isCumulativeLossRisk = false;
  } else {
    const financials = getClientFinancials(client.id);
    const currentF = financials.find(f => f.month === month) ?? null;
    currentMonthFinancials = currentF;

    currentRevenue = currentF ? calcTiersRevenue(currentF.pricingTiers ?? []) : 0;
    currentAdSpend = currentF?.adSpend ?? 0;
    currentProfit = calcProfit(currentRevenue, currentAdSpend);
    currentROAS = calcROAS(currentRevenue, currentAdSpend);
    currentMargin = calcMargin(currentProfit, currentRevenue);
    currentShowRate = 0;

    totalRevenue = financials.reduce((s, f) => s + calcTiersRevenue(f.pricingTiers ?? []), 0);
    totalAdSpend = financials.reduce((s, f) => s + f.adSpend, 0);
    const totalProfit = totalRevenue - totalAdSpend;
    totalShown = financials.reduce((s, f) => s + calcTiersBooked(f.pricingTiers ?? []), 0);
    avgMonthlyProfit = financials.length ? totalProfit / financials.length : 0;

    churnRisk = calcChurnRisk(client, financials, latestHappiness, lastActivity);
    isUnprofitable = currentF !== null && currentProfit < client.minProfitThreshold;
    isCumulativeLossRisk = totalAdSpend > 0 && totalAdSpend >= totalRevenue * 0.9;
  }

  const totalProfit = totalRevenue - totalAdSpend;

  return {
    ...client,
    currentMonthFinancials,
    currentRetainerData,
    currentRevenue,
    currentProfit,
    currentAdSpend,
    currentROAS,
    currentMargin,
    currentShowRate,
    totalRevenue,
    totalAdSpend,
    totalProfit,
    totalBookedAppointments: totalShown,
    avgMonthlyProfit,
    happinessScore: latestHappiness,
    churnRisk,
    lastActivityDate: lastActivity,
    onboardingCompletion,
    renewalDaysLeft,
    isRenewalSoon,
    isUnprofitable,
    isCumulativeLossRisk,
    nextAction,
  };
}

export function getAgencyMonthlyData(clients: Client[], months: number = 6) {
  const result: Array<{
    month: string;
    label: string;
    revenue: number;
    adSpend: number;
    profit: number;
    jobs: number;
    jobsValue: number;
  }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const month = format(d, 'yyyy-MM');
    const label = format(d, 'MMM yy');

    let revenue = 0, adSpend = 0, jobsCount = 0, jobsValue = 0;

    for (const client of clients) {
      if (client.billingModel === 'Retainer') {
        const rd = getRetainerMonthData(client.id, month);
        revenue += rd.retainerFee > 0 ? rd.retainerFee : client.retainerFee;
        // retainer clients' ad spend is NOT agency cost — excluded
      } else {
        const allF = getClientFinancials(client.id);
        const f = allF.find(x => x.month === month);
        if (f) {
          revenue += calcTiersRevenue(f.pricingTiers ?? []);
          adSpend += f.adSpend;
        }
      }
      const jobs = getClientJobs(client.id).filter(
        j => j.date.startsWith(month)
      );
      jobsCount += jobs.length;
      jobsValue += jobs.reduce((s, j) => s + j.value, 0);
    }

    result.push({ month, label, revenue, adSpend, profit: revenue - adSpend, jobs: jobsCount, jobsValue });
  }

  return result;
}
