import { useState, useEffect, useCallback } from 'react';
import { format as fmt } from 'date-fns';
import { getAgencyMonthData, saveAgencyMonthData, getSettings } from '../../services/storage';
import type { AgencyMonthData, PricingTier } from '../../types';
import { calcTiersRevenue, calcTiersBooked } from '../../services/metrics';
import { fmtMoney, fmtPct, fmtNum } from '../../services/agencyMetrics';
import MonthNav from '../../components/agency/MonthNav';
import RatedMetricCard from '../../components/agency/RatedMetricCard';
import PricingTiersInput from '../../components/agency/PricingTiersInput';

const DEFAULT_TIERS: PricingTier[] = [{ price: 0, booked: 0 }, { price: 0, booked: 0 }];

function InputField({ label, prefix, suffix, value, onChange, step = 1 }: {
  label: string; prefix?: string; suffix?: string;
  value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div>
      <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1 block">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">{prefix}</span>}
        <input
          type="number" min="0" step={step}
          value={value || ''} placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg py-2 text-slate-200 text-sm w-full focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 ${prefix ? 'pl-7 pr-3' : 'px-3'} ${suffix ? 'pr-14' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}

export default function AdsAcquisitionPage() {
  const [month, setMonth] = useState(() => fmt(new Date(), 'yyyy-MM'));
  const [data, setData] = useState<AgencyMonthData>(() => getAgencyMonthData(fmt(new Date(), 'yyyy-MM')));
  const { benchmarks } = getSettings();

  useEffect(() => { setData(getAgencyMonthData(month)); }, [month]);

  const update = useCallback((patch: Partial<AgencyMonthData>) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      saveAgencyMonthData(next);
      return next;
    });
  }, []);

  // Calculator 1 — Ad Performance
  const { adsSpend, adsTotalLeads, adsTotalBookedAppts, adsNewClients } = data;
  const cac = adsNewClients > 0 ? adsSpend / adsNewClients : NaN;
  const cpl = adsTotalLeads > 0 ? adsSpend / adsTotalLeads : NaN;
  const cpa = adsTotalBookedAppts > 0 ? adsSpend / adsTotalBookedAppts : NaN;
  const leadToBookedRate = adsTotalLeads > 0 ? (adsTotalBookedAppts / adsTotalLeads) * 100 : NaN;

  // Calculator 2 — Revenue & Profit
  const tiers = data.adsPricingTiers?.length ? data.adsPricingTiers : DEFAULT_TIERS;
  const totalBooked = calcTiersBooked(tiers);
  const adsRevenue = calcTiersRevenue(tiers);
  const revenuePerClient = adsNewClients > 0 ? adsRevenue / adsNewClients : NaN;
  const avgPrice = totalBooked > 0 ? adsRevenue / totalBooked : NaN;
  const grossProfit = adsRevenue - adsSpend;
  const margin = adsRevenue > 0 ? (grossProfit / adsRevenue) * 100 : NaN;
  const roas = adsSpend > 0 ? adsRevenue / adsSpend : NaN;
  const breakEvenClients = isFinite(revenuePerClient) && revenuePerClient > 0 ? adsSpend / revenuePerClient : NaN;

  const hasCalc1 = adsSpend > 0 || adsTotalLeads > 0 || adsTotalBookedAppts > 0 || adsNewClients > 0;
  const hasCalc2 = adsRevenue > 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Ads Acquisition</h1>
          <p className="text-slate-500 text-sm mt-1">Paid ad spend and new client acquisition metrics</p>
        </div>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      {/* Calculator 1 */}
      <section className="card p-6">
        <h2 className="text-slate-100 font-semibold text-base mb-1">Calculator 1 — Ad Performance Metrics</h2>
        <p className="text-slate-500 text-xs mb-5">Track ad spend efficiency and pipeline conversion</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InputField label="Ad spend" prefix="$" step={100} value={adsSpend} onChange={v => update({ adsSpend: v })} />
          <InputField label="Leads generated" suffix="leads" value={adsTotalLeads} onChange={v => update({ adsTotalLeads: v })} />
          <InputField label="Appointments booked" suffix="booked" value={adsTotalBookedAppts} onChange={v => update({ adsTotalBookedAppts: v })} />
          <InputField label="New clients acquired" suffix="clients" value={adsNewClients} onChange={v => update({ adsNewClients: v })} />
        </div>

        {!hasCalc1 ? (
          <div className="py-8 text-center border border-dashed border-[#2A2A2A] rounded-xl">
            <p className="text-slate-500 text-sm">Enter spend and pipeline data above to see metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <RatedMetricCard label="CAC" value={fmtMoney(cac)} rawValue={isFinite(cac) ? cac : undefined} benchmark={benchmarks.cac} sub="spend ÷ new clients" />
            <RatedMetricCard label="CPL" value={fmtMoney(cpl, 2)} rawValue={isFinite(cpl) ? cpl : undefined} benchmark={benchmarks.cpl} sub="spend ÷ leads" />
            <RatedMetricCard label="CPA" value={fmtMoney(cpa, 2)} rawValue={isFinite(cpa) ? cpa : undefined} benchmark={benchmarks.costPerBookedAppt} sub="spend ÷ booked" />
            <RatedMetricCard label="Lead → Booked" value={fmtPct(leadToBookedRate)} rawValue={isFinite(leadToBookedRate) ? leadToBookedRate : undefined} benchmark={benchmarks.leadToBookedRate} />
            <RatedMetricCard label="Cost / New Client" value={fmtMoney(cac)} rawValue={isFinite(cac) ? cac : undefined} benchmark={benchmarks.cac} sub="spend ÷ clients" />
            <RatedMetricCard label="Break-even Clients" value={fmtNum(breakEvenClients, 1)} sub="to cover spend" />
          </div>
        )}
      </section>

      {/* Calculator 2 */}
      <section className="card p-6">
        <h2 className="text-slate-100 font-semibold text-base mb-1">Calculator 2 — Revenue &amp; Profit from New Clients</h2>
        <p className="text-slate-500 text-xs mb-5">Enter appointment pricing tiers to calculate revenue</p>

        <div className="mb-6 max-w-xl">
          <PricingTiersInput
            tiers={tiers}
            onChange={newTiers => update({ adsPricingTiers: newTiers })}
          />
        </div>

        {!hasCalc2 ? (
          <div className="py-8 text-center border border-dashed border-[#2A2A2A] rounded-xl">
            <p className="text-slate-500 text-sm">Enter pricing tiers above to see revenue metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <RatedMetricCard label="Total Booked" value={totalBooked > 0 ? String(totalBooked) : '—'} />
            <RatedMetricCard label="Total Revenue" value={fmtMoney(adsRevenue)} />
            <RatedMetricCard label="Gross Profit" value={fmtMoney(adsSpend > 0 ? grossProfit : NaN)} />
            <RatedMetricCard label="Margin" value={fmtPct(margin)} rawValue={isFinite(margin) ? margin : undefined} benchmark={benchmarks.margin} />
            <RatedMetricCard label="ROAS" value={isFinite(roas) ? `${roas.toFixed(2)}x` : '—'} rawValue={isFinite(roas) ? roas : undefined} benchmark={benchmarks.roas} sub="revenue ÷ spend" />
            <RatedMetricCard label="Revenue / Client" value={fmtMoney(revenuePerClient)} rawValue={isFinite(revenuePerClient) ? revenuePerClient : undefined} benchmark={benchmarks.revenuePerClient} />
            <RatedMetricCard label="Avg Price / Appt" value={fmtMoney(avgPrice, 2)} />
          </div>
        )}
      </section>
    </div>
  );
}
