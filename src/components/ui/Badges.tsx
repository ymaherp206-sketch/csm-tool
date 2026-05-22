import type { ClientStatus, BillingModel } from '../../types';

export function StatusBadge({ status }: { status: ClientStatus }) {
  if (status === 'Active') return <span className="badge-green">Active</span>;
  if (status === 'Inactive') return <span className="badge-amber">Inactive</span>;
  return <span className="badge-gray">Archived</span>;
}

export function HappinessBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge-gray">—</span>;
  const labels: Record<number, string> = {
    1: 'At Risk', 2: 'Unhappy', 3: 'Neutral', 4: 'Happy', 5: 'Delighted'
  };
  if (score <= 2) return <span className="badge-red">{labels[score] ?? score}</span>;
  if (score === 3) return <span className="badge-amber">{labels[score]}</span>;
  return <span className="badge-green">{labels[score] ?? score}</span>;
}

export function ChurnBadge({ level, score }: { level: 'Low' | 'Medium' | 'High'; score: number }) {
  if (level === 'Low') return <span className="badge-green">Low Risk {score}/10</span>;
  if (level === 'Medium') return <span className="badge-amber">Medium Risk {score}/10</span>;
  return <span className="badge-red">High Risk {score}/10</span>;
}

export function ProfitBadge({ isUnprofitable, isCumulativeLoss }: { isUnprofitable: boolean; isCumulativeLoss: boolean }) {
  if (isUnprofitable) return <span className="badge-red">Consider Dropping</span>;
  if (isCumulativeLoss) return <span className="badge-amber">Cumulative Loss Risk</span>;
  return null;
}

export function BillingModelBadge({ model }: { model: BillingModel }) {
  if (model === 'Retainer') return <span className="badge-purple">Retainer</span>;
  return <span className="badge-blue">PPSA</span>;
}

export function RenewalBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) return <span className="badge-red">Expired</span>;
  if (daysLeft <= 30) return <span className="badge-amber">Renewal Soon ({daysLeft}d)</span>;
  return null;
}
