import type {
  Client, MonthlyFinancials, ClientWithMetrics, ChurnRiskBreakdown
} from '../types';
import {
  getClientFinancials, getClientHappiness, getClientActivity,
  getClientNextAction, getClientJobs
} from './storage';
import { differenceInDays, parseISO, format, subMonths } from 'date-fns';

export function calcRevenue(shown: number, price: number): number {
  return shown * price;
}

export function calcShowRate(shown: number, booked: number): number {
  if (!booked) return 0;
  return (shown / booked) * 100;
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

  // Profit trend (0–25 points)
  let profitTrendPts = 0;
  const sorted = [...financials].sort((a, b) => b.month.localeCompare(a.month));
  if (sorted.length >= 2) {
    const latest = sorted[0];
    const prev = sorted[1];
    const latestRevenue = calcRevenue(latest.appointmentsShown, client.pricePerAppointment);
    const prevRevenue = calcRevenue(prev.appointmentsShown, client.pricePerAppointment);
    const latestProfit = calcProfit(latestRevenue, latest.adSpend);
    const prevProfit = calcProfit(prevRevenue, prev.adSpend);
    if (latestProfit < prevProfit) {
      const drop = prevProfit > 0 ? (prevProfit - latestProfit) / prevProfit : 1;
      profitTrendPts = Math.min(25, Math.round(drop * 25));
    }
  } else if (sorted.length === 1) {
    const f = sorted[0];
    const rev = calcRevenue(f.appointmentsShown, client.pricePerAppointment);
    const profit = calcProfit(rev, f.adSpend);
    if (profit < 0) profitTrendPts = 25;
    else if (profit < client.minProfitThreshold) profitTrendPts = 12;
  }

  // Days since last activity (0–20 points)
  let activityPts = 0;
  if (lastActivityDate) {
    const days = differenceInDays(new Date(), parseISO(lastActivityDate));
    if (days > 30) activityPts = 20;
    else if (days > 14) activityPts = 12;
    else if (days > 7) activityPts = 6;
  } else {
    activityPts = 15; // no activity logged
  }

  // Show rate (0–15 points)
  let showRatePts = 0;
  if (sorted.length > 0) {
    const f = sorted[0];
    const rate = calcShowRate(f.appointmentsShown, f.appointmentsBooked);
    if (rate < 40) showRatePts = 15;
    else if (rate < 60) showRatePts = 8;
    else if (rate < 75) showRatePts = 3;
  }

  const totalPts = happinessPts + profitTrendPts + activityPts + showRatePts;
  const score = Math.round((totalPts / 100) * 10);
  const capped = Math.min(10, Math.max(1, score));

  const level: 'Low' | 'Medium' | 'High' =
    capped <= 3 ? 'Low' : capped <= 6 ? 'Medium' : 'High';

  return {
    happinessScore: happinessPts,
    profitTrend: profitTrendPts,
    daysSinceActivity: activityPts,
    showRate: showRatePts,
    total: capped,
    level,
  };
}

export function enrichClient(client: Client, selectedMonth?: string): ClientWithMetrics {
  const month = selectedMonth || format(new Date(), 'yyyy-MM');
  const financials = getClientFinancials(client.id);
  const happiness = getClientHappiness(client.id);
  const activity = getClientActivity(client.id);
  const nextAction = getClientNextAction(client.id);

  const currentF = financials.find(f => f.month === month) ?? null;
  const price = client.pricePerAppointment;

  const currentRevenue = currentF ? calcRevenue(currentF.appointmentsShown, price) : 0;
  const currentAdSpend = currentF?.adSpend ?? 0;
  const currentProfit = calcProfit(currentRevenue, currentAdSpend);
  const currentROAS = calcROAS(currentRevenue, currentAdSpend);
  const currentMargin = calcMargin(currentProfit, currentRevenue);
  const currentShowRate = currentF
    ? calcShowRate(currentF.appointmentsShown, currentF.appointmentsBooked)
    : 0;

  const totalRevenue = financials.reduce(
    (s, f) => s + calcRevenue(f.appointmentsShown, price), 0
  );
  const totalAdSpend = financials.reduce((s, f) => s + f.adSpend, 0);
  const totalProfit = totalRevenue - totalAdSpend;
  const totalShown = financials.reduce((s, f) => s + f.appointmentsShown, 0);
  const avgMonthlyProfit = financials.length ? totalProfit / financials.length : 0;

  const latestHappiness = happiness.length ? happiness[happiness.length - 1].score : null;
  const lastActivity = activity.length ? activity[0].date : null;

  const churnRisk = calcChurnRisk(client, financials, latestHappiness, lastActivity);

  const onboardingCompletion =
    client.checklist.length > 0
      ? Math.round((client.checklist.filter(c => c.completed).length / client.checklist.length) * 100)
      : 0;

  const renewalDaysLeft = differenceInDays(parseISO(client.contractEndDate), new Date());
  const isRenewalSoon = renewalDaysLeft >= 0 && renewalDaysLeft <= 30;

  const isUnprofitable = currentF !== null && currentProfit < client.minProfitThreshold;
  const isCumulativeLossRisk = totalAdSpend > 0 && totalAdSpend >= totalRevenue * 0.9;

  return {
    ...client,
    currentMonthFinancials: currentF,
    currentRevenue,
    currentProfit,
    currentAdSpend,
    currentROAS,
    currentMargin,
    currentShowRate,
    totalRevenue,
    totalAdSpend,
    totalProfit,
    totalShownAppointments: totalShown,
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
      const price = client.pricePerAppointment;
      const allF = getClientFinancials(client.id);
      const f = allF.find(x => x.month === month);
      if (f) {
        revenue += calcRevenue(f.appointmentsShown, price);
        adSpend += f.adSpend;
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
