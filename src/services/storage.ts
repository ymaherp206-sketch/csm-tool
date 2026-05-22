import type {
  Client, MonthlyFinancials, ClosedJob, HappinessEntry,
  ActivityLog, NextAction, AgencySettings, ChecklistItem, AgencyMonthData
} from '../types';

const KEYS = {
  clients: 'csm_clients',
  financials: 'csm_financials',
  jobs: 'csm_jobs',
  happiness: 'csm_happiness',
  activity: 'csm_activity',
  nextActions: 'csm_next_actions',
  settings: 'csm_settings',
  agencyMonths: 'csm_agency_months',
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Clients ──────────────────────────────────────────────────────────────────
export function getClients(): Client[] {
  return get<Client[]>(KEYS.clients, []);
}

export function saveClient(client: Client): void {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === client.id);
  if (idx >= 0) clients[idx] = client;
  else clients.push(client);
  set(KEYS.clients, clients);
}

export function deleteClient(id: string): void {
  set(KEYS.clients, getClients().filter(c => c.id !== id));
}

export function getClient(id: string): Client | undefined {
  return getClients().find(c => c.id === id);
}

// ── Financials ────────────────────────────────────────────────────────────────
export function getFinancials(): MonthlyFinancials[] {
  return get<MonthlyFinancials[]>(KEYS.financials, []);
}

export function getClientFinancials(clientId: string): MonthlyFinancials[] {
  return getFinancials().filter(f => f.clientId === clientId);
}

export function getFinancialsForMonth(clientId: string, month: string): MonthlyFinancials | null {
  return getFinancials().find(f => f.clientId === clientId && f.month === month) ?? null;
}

export function saveFinancials(entry: MonthlyFinancials): void {
  const all = getFinancials();
  const idx = all.findIndex(f => f.clientId === entry.clientId && f.month === entry.month);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  set(KEYS.financials, all);
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export function getJobs(): ClosedJob[] {
  return get<ClosedJob[]>(KEYS.jobs, []);
}

export function getClientJobs(clientId: string): ClosedJob[] {
  return getJobs().filter(j => j.clientId === clientId);
}

export function saveJob(job: ClosedJob): void {
  const jobs = getJobs();
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  set(KEYS.jobs, jobs);
}

export function deleteJob(id: string): void {
  set(KEYS.jobs, getJobs().filter(j => j.id !== id));
}

// ── Happiness ─────────────────────────────────────────────────────────────────
export function getHappiness(): HappinessEntry[] {
  return get<HappinessEntry[]>(KEYS.happiness, []);
}

export function getClientHappiness(clientId: string): HappinessEntry[] {
  return getHappiness()
    .filter(h => h.clientId === clientId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function saveHappiness(entry: HappinessEntry): void {
  const all = getHappiness();
  const idx = all.findIndex(h => h.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  set(KEYS.happiness, all);
}

// ── Activity ──────────────────────────────────────────────────────────────────
export function getActivity(): ActivityLog[] {
  return get<ActivityLog[]>(KEYS.activity, []);
}

export function getClientActivity(clientId: string): ActivityLog[] {
  return getActivity()
    .filter(a => a.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveActivity(entry: ActivityLog): void {
  const all = getActivity();
  const idx = all.findIndex(a => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  set(KEYS.activity, all);
}

export function deleteActivity(id: string): void {
  set(KEYS.activity, getActivity().filter(a => a.id !== id));
}

// ── Next Actions ──────────────────────────────────────────────────────────────
export function getNextActions(): NextAction[] {
  return get<NextAction[]>(KEYS.nextActions, []);
}

export function getClientNextAction(clientId: string): NextAction | null {
  return getNextActions().find(a => a.clientId === clientId) ?? null;
}

export function saveNextAction(action: NextAction): void {
  const all = getNextActions();
  const idx = all.findIndex(a => a.clientId === action.clientId);
  if (idx >= 0) all[idx] = action;
  else all.push(action);
  set(KEYS.nextActions, all);
}

// ── Settings ──────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: 'My Agency',
  logoUrl: '',
  defaultPricePerAppointment: 100,
  defaultProfitThreshold: 500,
  csmNames: ['CSM 1'],
};

export function getSettings(): AgencySettings {
  return get<AgencySettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AgencySettings): void {
  set(KEYS.settings, settings);
}

// ── Agency Month Data ─────────────────────────────────────────────────────────
const AGENCY_MONTH_DEFAULTS: Omit<AgencyMonthData, 'month'> = {
  b2bAdSpend: 0, b2bNewClients: 0, b2bPricePerAppt: 0, b2bAvgShownAppts: 0,
  smsSpend: 0, smsNewClients: 0, smsPricePerAppt: 0, smsAvgShownAppts: 0,
  smsCostPerReply: 0, smsCostPerBookedCall: 0,
  retainerRevenue: 0, operatingCosts: 0,
};

export function getAgencyMonths(): AgencyMonthData[] {
  return get<AgencyMonthData[]>(KEYS.agencyMonths, []);
}

export function getAgencyMonthData(month: string): AgencyMonthData {
  return getAgencyMonths().find(m => m.month === month) ?? { month, ...AGENCY_MONTH_DEFAULTS };
}

export function saveAgencyMonthData(data: AgencyMonthData): void {
  const all = getAgencyMonths();
  const idx = all.findIndex(m => m.month === data.month);
  if (idx >= 0) all[idx] = data;
  else all.push(data);
  set(KEYS.agencyMonths, all);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function defaultChecklist(): ChecklistItem[] {
  return [
    { id: generateId(), label: 'Access Granted', completed: false },
    { id: generateId(), label: 'Campaign Live', completed: false },
    { id: generateId(), label: 'Reporting Set Up', completed: false },
    { id: generateId(), label: 'Onboarding Call Done', completed: false },
    { id: generateId(), label: 'First Invoice Sent', completed: false },
  ];
}
