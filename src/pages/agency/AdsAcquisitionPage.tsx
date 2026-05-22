import { useState, useEffect, useCallback } from 'react';
import { format as fmt } from 'date-fns';
import { getAgencyMonthData, saveAgencyMonthData, getSettings } from '../../services/storage';
import type { AgencyMonthData } from '../../types';
import AcquisitionSection from '../../components/agency/AcquisitionSection';
import ClientPerformanceSection from '../../components/agency/ClientPerformanceSection';
import PnLSection from '../../components/agency/PnLSection';
import MonthNav from '../../components/agency/MonthNav';

export default function AdsAcquisitionPage() {
  const [month, setMonth] = useState(() => fmt(new Date(), 'yyyy-MM'));
  const [data, setData] = useState<AgencyMonthData>(() => getAgencyMonthData(fmt(new Date(), 'yyyy-MM')));
  const settings = getSettings();

  useEffect(() => {
    setData(getAgencyMonthData(month));
  }, [month]);

  const update = useCallback((patch: Partial<AgencyMonthData>) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      saveAgencyMonthData(next);
      return next;
    });
  }, []);

  const prevDate = new Date(month + '-01');
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prev = fmt(prevDate, 'yyyy-MM');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Ads Acquisition</h1>
          <p className="text-slate-500 text-sm mt-1">B2B paid ad spend and new client acquisition metrics</p>
        </div>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      <AcquisitionSection
        channel="ads"
        data={data}
        prevMonth={prev}
        benchmarks={settings.benchmarks}
        onUpdate={update}
      />

      <ClientPerformanceSection month={month} prevMonth={prev} />

      <PnLSection month={month} prevMonth={prev} data={data} onUpdate={update} />
    </div>
  );
}
