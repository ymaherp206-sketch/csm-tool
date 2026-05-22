import { Link } from 'react-router-dom';
import type { ClientWithMetrics } from '../../types';
import { StatusBadge, HappinessBadge, ChurnBadge, ProfitBadge, RenewalBadge } from '../ui/Badges';
import { DollarSign, CheckSquare, ArrowRight } from 'lucide-react';

interface Props {
  client: ClientWithMetrics;
}

export default function ClientCard({ client }: Props) {
  return (
    <Link to={`/clients/${client.id}`} className="card block p-5 hover:border-[#3A3A3A] transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-slate-100 font-semibold text-sm group-hover:text-indigo-400 transition-colors flex items-center gap-1">
            {client.name}
            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          {client.businessType && (
            <p className="text-slate-500 text-xs mt-0.5">{client.businessType}</p>
          )}
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <HappinessBadge score={client.happinessScore} />
        <ChurnBadge level={client.churnRisk.level} score={client.churnRisk.total} />
        {client.isRenewalSoon && <RenewalBadge daysLeft={client.renewalDaysLeft} />}
        <ProfitBadge isUnprofitable={client.isUnprofitable} isCumulativeLoss={client.isCumulativeLossRisk} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Revenue</p>
          <p className="text-slate-200 text-sm font-semibold">${client.currentRevenue.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Profit</p>
          <p className={`text-sm font-semibold ${client.currentProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${client.currentProfit.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">ROAS</p>
          <p className="text-slate-200 text-sm font-semibold">
            {client.currentROAS > 0 ? `${client.currentROAS.toFixed(2)}x` : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <CheckSquare size={12} />
          <span>{client.onboardingCompletion}% onboarded</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign size={12} />
          <span>LTV ${client.totalRevenue.toFixed(0)}</span>
        </div>
        {client.assignedCSM && (
          <span className="truncate max-w-[80px]">{client.assignedCSM}</span>
        )}
      </div>

      {client.onboardingCompletion < 100 && (
        <div className="mt-3">
          <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${client.onboardingCompletion}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
