export type ClientStatus = 'Active' | 'Inactive' | 'Archived';
export type CommChannel = 'WhatsApp' | 'Email' | 'Slack' | 'Phone';
export type ActivityType = 'Call' | 'Meeting' | 'Message' | 'Follow-up' | 'Email' | 'Note';
export type BillingModel = 'PPSA' | 'Retainer';

export interface PricingTier {
  price: number;
  booked: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface Client {
  id: string;
  name: string;
  businessType: string;
  startDate: string;
  contractEndDate: string;
  status: ClientStatus;
  assignedCSM: string;
  commChannel: CommChannel;
  notes: string;
  checklist: ChecklistItem[];
  billingModel: BillingModel;
  pricePerAppointment: number;  // PPSA: price per shown appt; Retainer: 0
  retainerFee: number;          // Retainer: monthly fee; PPSA: 0
  minProfitThreshold: number;   // PPSA only
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyFinancials {
  clientId: string;
  month: string;
  pricingTiers: PricingTier[];
  adSpend: number;
}

export interface RetainerMonthData {
  clientId: string;
  month: string;
  retainerFee: number;          // what they pay agency this month
  clientAdSpend: number;        // their own ad spend — reference only, NOT agency cost
  appointmentsBooked: number;
  closedJobsCount: number;
  closedJobsValue: number;
  clientLeads: number;          // optional, for client CPL
}

export interface ClosedJob {
  id: string;
  clientId: string;
  date: string;
  value: number;
  jobType: string;
  description: string;
  createdAt: string;
}

export interface HappinessEntry {
  id: string;
  clientId: string;
  score: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  clientId: string;
  type: ActivityType;
  date: string;
  note: string;
  createdAt: string;
}

export interface NextAction {
  clientId: string;
  description: string;
  dueDate: string;
  updatedAt: string;
}

// One threshold entry: lower-is-better or higher-is-better
export interface BenchmarkConfig {
  good: number;
  avg: number;
  higherIsBetter: boolean;
}

export interface AgencyBenchmarks {
  cac: BenchmarkConfig;
  margin: BenchmarkConfig;
  cpl: BenchmarkConfig;
  costPerBookedAppt: BenchmarkConfig;
  costPerShownAppt: BenchmarkConfig;
  leadToBookedRate: BenchmarkConfig;
  showRate: BenchmarkConfig;
  roas: BenchmarkConfig;
  revenuePerClient: BenchmarkConfig;
  costPerAcquiredRevenue: BenchmarkConfig;
  costPerReply: BenchmarkConfig;
  replyToBookedRate: BenchmarkConfig;
}

export interface AgencySettings {
  agencyName: string;
  logoUrl: string;
  defaultPricePerAppointment: number;
  defaultProfitThreshold: number;
  defaultBillingModel: BillingModel;
  csmNames: string[];
  benchmarks: AgencyBenchmarks;
}

export interface ChurnRiskBreakdown {
  happinessScore: number;
  profitTrend: number;
  daysSinceActivity: number;
  showRate: number;
  total: number;
  level: 'Low' | 'Medium' | 'High';
}

export interface AgencyMonthData {
  month: string;
  // Ads Acquisition — Calculator 1 (performance)
  adsSpend: number;
  adsNewClients: number;
  adsTotalLeads: number;
  adsTotalBookedAppts: number;
  // Ads Acquisition — Calculator 2 (revenue via multi-tier pricing)
  adsPricingTiers: PricingTier[];
  // SMS Acquisition — Calculator 1 (performance)
  smsSpend: number;
  smsNewClients: number;
  smsTotalLeads: number;
  smsTotalBookedAppts: number;
  smsTotalReplies: number;
  // SMS Acquisition — Calculator 2 (revenue via multi-tier pricing)
  smsPricingTiers: PricingTier[];
  // P&L
  retainerRevenue: number;
  operatingCosts: number;
}

export interface ClientWithMetrics extends Client {
  currentMonthFinancials: MonthlyFinancials | null;
  currentRetainerData: RetainerMonthData | null;
  currentRevenue: number;
  currentProfit: number;
  currentAdSpend: number;
  currentROAS: number;
  currentMargin: number;
  currentShowRate: number;
  totalRevenue: number;
  totalAdSpend: number;
  totalProfit: number;
  totalBookedAppointments: number;
  avgMonthlyProfit: number;
  happinessScore: number | null;
  churnRisk: ChurnRiskBreakdown;
  lastActivityDate: string | null;
  onboardingCompletion: number;
  renewalDaysLeft: number;
  isRenewalSoon: boolean;
  isUnprofitable: boolean;
  isCumulativeLossRisk: boolean;
  nextAction: NextAction | null;
}
