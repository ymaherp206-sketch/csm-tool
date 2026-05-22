import type { AgencyMonthData, AgencyBenchmarks } from '../../types';
import { calcAdsMetrics, calcSmsMetrics, fmtMoney, fmtPct, fmtNum, momChange } from '../../services/agencyMetrics';
import { getAgencyMonthData } from '../../services/storage';
import RatedMetricCard from './RatedMetricCard';

type Channel = 'ads' | 'sms';

interface InputRowProps {
  label: string;
  prefix?: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  optional?: boolean;
  step?: number;
}

function InputRow({ label, prefix, suffix, value, onChange, optional, step = 1 }: InputRowProps) {
  return (
    <div>
      <label className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1 block">
        {label}
        {optional && <span className="text-slate-600 normal-case ml-1 font-normal">(optional)</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min="0"
          step={step}
          value={value || ''}
          placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg py-2 text-slate-200 text-sm w-full
            focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600
            ${prefix ? 'pl-7 pr-3' : 'px-3'} ${suffix ? 'pr-14' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  channel: Channel;
  data: AgencyMonthData;
  prevMonth: string;
  benchmarks: AgencyBenchmarks;
  onUpdate: (patch: Partial<AgencyMonthData>) => void;
}

export default function AcquisitionSection({ channel, data, prevMonth, benchmarks, onUpdate }: Props) {
  const isAds = channel === 'ads';
  const metrics = isAds ? calcAdsMetrics(data) : calcSmsMetrics(data);
  const prevData = getAgencyMonthData(prevMonth);
  const prevMetrics = isAds ? calcAdsMetrics(prevData) : calcSmsMetrics(prevData);

  const mom = (cur: number, prv: number) => momChange(cur, prv);

  // Show metric grid once any real input exists
  const hasData =
    (isAds ? data.adsSpend : data.smsSpend) > 0 ||
    (isAds ? data.adsNewClients : data.smsNewClients) > 0 ||
    (isAds ? data.adsTotalShownAppts : data.smsTotalShownAppts) > 0;

  return (
    <section className="card p-6">
      <h2 className="text-slate-100 font-semibold text-base mb-6">
        {isAds ? 'Ads Acquisition' : 'SMS Acquisition'} — Inputs &amp; Metrics
      </h2>

      {/* ── Raw inputs only ─────────────────────────────────────────────── */}
      <div className="mb-2">
        <p className="text-slate-500 text-xs uppercase tracking-wide font-medium mb-3">Raw inputs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputRow
            label={isAds ? 'Ad spend this month' : 'SMS campaign spend'}
            prefix="$" step={100}
            value={isAds ? data.adsSpend : data.smsSpend}
            onChange={v => onUpdate(isAds ? { adsSpend: v } : { smsSpend: v })}
          />
          <InputRow
            label="New clients acquired"
            suffix="clients"
            value={isAds ? data.adsNewClients : data.smsNewClients}
            onChange={v => onUpdate(isAds ? { adsNewClients: v } : { smsNewClients: v })}
          />
          <InputRow
            label="Total shown appointments"
            suffix="shown"
            value={isAds ? data.adsTotalShownAppts : data.smsTotalShownAppts}
            onChange={v => onUpdate(isAds ? { adsTotalShownAppts: v } : { smsTotalShownAppts: v })}
          />
          <InputRow
            label="Price per shown appointment"
            prefix="$" step={10}
            value={isAds ? data.adsPricePerAppt : data.smsPricePerAppt}
            onChange={v => onUpdate(isAds ? { adsPricePerAppt: v } : { smsPricePerAppt: v })}
          />
          <InputRow
            label="Total leads generated"
            suffix="leads"
            optional={isAds}
            value={isAds ? data.adsTotalLeads : data.smsTotalLeads}
            onChange={v => onUpdate(isAds ? { adsTotalLeads: v } : { smsTotalLeads: v })}
          />
          <InputRow
            label="Total appointments booked"
            suffix="booked"
            value={isAds ? data.adsTotalBookedAppts : data.smsTotalBookedAppts}
            onChange={v => onUpdate(isAds ? { adsTotalBookedAppts: v } : { smsTotalBookedAppts: v })}
          />
          {!isAds && (
            <>
              <InputRow
                label="Cost per reply"
                prefix="$" step={1} optional
                value={data.smsCostPerReply}
                onChange={v => onUpdate({ smsCostPerReply: v })}
              />
              <InputRow
                label="Cost per booked call"
                prefix="$" step={1} optional
                value={data.smsCostPerBookedCall}
                onChange={v => onUpdate({ smsCostPerBookedCall: v })}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Auto-calculated metrics ──────────────────────────────────────── */}
      <div className="mt-8">
        <p className="text-slate-500 text-xs uppercase tracking-wide font-medium mb-3">
          Auto-calculated — updates in real time
        </p>
        {!hasData ? (
          <div className="py-10 text-center border border-dashed border-[#2A2A2A] rounded-xl">
            <p className="text-slate-500 text-sm">Enter spend, clients, or appointments above to see metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <RatedMetricCard
              label="Avg Shown Appts / Client"
              value={fmtNum(metrics.avgShownAppts)}
              sub="total shown ÷ new clients"
              mom={mom(metrics.avgShownAppts, prevMetrics.avgShownAppts)}
            />
            <RatedMetricCard
              label="Revenue"
              value={fmtMoney(metrics.revenue)}
              sub="shown appts × price"
              mom={mom(metrics.revenue, prevMetrics.revenue)}
            />
            <RatedMetricCard
              label="Net Profit"
              value={fmtMoney(metrics.profit)}
              mom={mom(metrics.profit, prevMetrics.profit)}
            />
            <RatedMetricCard
              label="Profit Margin"
              value={fmtPct(metrics.margin)}
              rawValue={isFinite(metrics.margin) ? metrics.margin : undefined}
              benchmark={benchmarks.margin}
              mom={mom(metrics.margin, prevMetrics.margin)}
            />
            <RatedMetricCard
              label="CAC"
              value={fmtMoney(metrics.cac)}
              rawValue={isFinite(metrics.cac) ? metrics.cac : undefined}
              benchmark={benchmarks.cac}
              sub="spend ÷ new clients"
              mom={mom(metrics.cac, prevMetrics.cac)}
            />
            <RatedMetricCard
              label="CPL"
              value={fmtMoney(metrics.cpl, 2)}
              rawValue={isFinite(metrics.cpl) ? metrics.cpl : undefined}
              benchmark={benchmarks.cpl}
              sub="spend ÷ leads"
              mom={mom(metrics.cpl, prevMetrics.cpl)}
            />
            <RatedMetricCard
              label="Cost / Booked Appt"
              value={fmtMoney(metrics.costPerBookedAppt, 2)}
              rawValue={isFinite(metrics.costPerBookedAppt) ? metrics.costPerBookedAppt : undefined}
              benchmark={benchmarks.costPerBookedAppt}
              mom={mom(metrics.costPerBookedAppt, prevMetrics.costPerBookedAppt)}
            />
            <RatedMetricCard
              label="Cost / Shown Appt"
              value={fmtMoney(metrics.costPerShownAppt, 2)}
              rawValue={isFinite(metrics.costPerShownAppt) ? metrics.costPerShownAppt : undefined}
              benchmark={benchmarks.costPerShownAppt}
              mom={mom(metrics.costPerShownAppt, prevMetrics.costPerShownAppt)}
            />
            <RatedMetricCard
              label="Lead → Booked Rate"
              value={fmtPct(metrics.leadToBookedRate)}
              rawValue={isFinite(metrics.leadToBookedRate) ? metrics.leadToBookedRate : undefined}
              benchmark={benchmarks.leadToBookedRate}
              mom={mom(metrics.leadToBookedRate, prevMetrics.leadToBookedRate)}
            />
            <RatedMetricCard
              label="Show Rate"
              value={fmtPct(metrics.showRate)}
              rawValue={isFinite(metrics.showRate) ? metrics.showRate : undefined}
              benchmark={benchmarks.showRate}
              mom={mom(metrics.showRate, prevMetrics.showRate)}
            />
            <RatedMetricCard
              label="Break-even Clients"
              value={fmtNum(metrics.breakEvenClients)}
              sub="to cover spend"
            />
            {!isAds && data.smsCostPerReply > 0 && (
              <RatedMetricCard label="Cost / Reply" value={fmtMoney(data.smsCostPerReply, 2)} />
            )}
            {!isAds && data.smsCostPerBookedCall > 0 && (
              <RatedMetricCard label="Cost / Booked Call" value={fmtMoney(data.smsCostPerBookedCall, 2)} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
