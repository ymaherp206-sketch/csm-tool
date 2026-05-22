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
  startDate: string; // ISO date
  contractEndDate: string; // ISO date
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
  month: string; // YYYY-MM
  appointmentsBooked: number;
  appointmentsShown: number;
  adSpend: number;
  // Calculated:
  // revenue = shown * pricePerAppointment
  // showRate = shown / booked * 100
  // grossProfit = revenue - adSpend
  // margin = grossProfit / revenue * 100
  // ROAS = revenue / adSpend
  // breakEven = adSpend / pricePerAppointment
}

export interface ClosedJob {
  id: string;
  clientId: string;
  date: string; // ISO date
  value: number;
  jobType: string;
  description: string;
  createdAt: string;
}

export interface HappinessEntry {
  id: string;
  clientId: string;
  score: number; // 1-5
  note: string;
  date: string; // ISO date
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  clientId: string;
  type: ActivityType;
  date: string; // ISO date
  note: string;
  createdAt: string;
}

export interface NextAction {
  clientId: string;
  description: string;
  dueDate: string; // ISO date
  updatedAt: string;
}

export interface AgencySettings {
  agencyName: string;
  logoUrl: string; // base64 or URL
  defaultPricePerAppointment: number;
  defaultProfitThreshold: number;
  csmNames: string[];
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
  month: string; // YYYY-MM
  // B2B Ads
  b2bAdSpend: number;
  b2bNewClients: number;
  b2bPricePerAppt: number;
  b2bAvgShownAppts: number;
  // SMS
  smsSpend: number;
  smsNewClients: number;
  smsPricePerAppt: number;
  smsAvgShownAppts: number;
  smsCostPerReply: number;
  smsCostPerBookedCall: number;
  // Other
  retainerRevenue: number;
  operatingCosts: number;
}

// Computed / derived types
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
