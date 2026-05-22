export type ClientStatus = 'Active' | 'Inactive' | 'Archived';
export type CommChannel = 'WhatsApp' | 'Email' | 'Slack' | 'Phone';
export type ActivityType = 'Call' | 'Meeting' | 'Message' | 'Follow-up' | 'Email' | 'Note';

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
  pricePerAppointment: number;
  minProfitThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyFinancials {
  clientId: string;
  month: string;
  appointmentsBooked: number;
  appointmentsShown: number;
  adSpend: number;
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
}

export interface AgencySettings {
  agencyName: string;
  logoUrl: string;
  defaultPricePerAppointment: number;
  defaultProfitThreshold: number;
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
  // Ads Acquisition
  adsSpend: number;
  adsNewClients: number;
  adsAvgShownAppts: number;
  adsPricePerAppt: number;
  adsTotalLeads: number;
  adsTotalBookedAppts: number;
  // SMS Acquisition
  smsSpend: number;
  smsNewClients: number;
  smsAvgShownAppts: number;
  smsPricePerAppt: number;
  smsTotalLeads: number;
  smsTotalBookedAppts: number;
  smsCostPerReply: number;
  smsCostPerBookedCall: number;
  // P&L
  retainerRevenue: number;
  operatingCosts: number;
}

export interface ClientWithMetrics extends Client {
  currentMonthFinancials: MonthlyFinancials | null;
  currentRevenue: number;
  currentProfit: number;
  currentAdSpend: number;
  currentROAS: number;
  currentMargin: number;
  currentShowRate: number;
  totalRevenue: number;
  totalAdSpend: number;
  totalProfit: number;
  totalShownAppointments: number;
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
