import { useState, useRef } from 'react';
import { getSettings, saveSettings, DEFAULT_BENCHMARKS } from '../services/storage';
import type { AgencySettings, AgencyBenchmarks, BenchmarkConfig } from '../types';
import PageHeader from '../components/ui/PageHeader';
import { Plus, Trash2, Building2, Upload, Save, Target } from 'lucide-react';

function BenchmarkRow({
  label,
  cfg,
  onChange,
}: {
  label: string;
  cfg: BenchmarkConfig;
  onChange: (c: BenchmarkConfig) => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-3 py-2.5 border-b border-[#1A1A1A] last:border-0">
      <span className="text-slate-400 text-xs col-span-4">{label}</span>
      <div className="col-span-3 flex items-center gap-1.5">
        <span className="text-green-400 text-xs w-10 text-right shrink-0">Good</span>
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
            {cfg.higherIsBetter ? '≥' : '≤'}
          </span>
          <input
            type="number" min="0" step="1"
            value={cfg.good}
            onChange={e => onChange({ ...cfg, good: parseFloat(e.target.value) || 0 })}
            className="input pl-5 py-1 text-xs"
          />
        </div>
      </div>
      <div className="col-span-3 flex items-center gap-1.5">
        <span className="text-amber-400 text-xs w-10 text-right shrink-0">Avg</span>
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
            {cfg.higherIsBetter ? '≥' : '≤'}
          </span>
          <input
            type="number" min="0" step="1"
            value={cfg.avg}
            onChange={e => onChange({ ...cfg, avg: parseFloat(e.target.value) || 0 })}
            className="input pl-5 py-1 text-xs"
          />
        </div>
      </div>
      <div className="col-span-2 text-center">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
          cfg.higherIsBetter
            ? 'bg-green-900/20 text-green-400 border-green-900/30'
            : 'bg-red-900/20 text-red-400 border-red-900/30'
        }`}>
          {cfg.higherIsBetter ? 'Higher better' : 'Lower better'}
        </span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AgencySettings>(getSettings);
  const [saved, setSaved] = useState(false);
  const [newCSM, setNewCSM] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function setBenchmark<K extends keyof AgencyBenchmarks>(key: K, cfg: BenchmarkConfig) {
    setSettings(s => ({ ...s, benchmarks: { ...s.benchmarks, [key]: cfg } }));
  }

  function addCSM() {
    if (!newCSM.trim()) return;
    setSettings(s => ({ ...s, csmNames: [...s.csmNames, newCSM.trim()] }));
    setNewCSM('');
  }

  function removeCSM(name: string) {
    setSettings(s => ({ ...s, csmNames: s.csmNames.filter(n => n !== name) }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSettings(s => ({ ...s, logoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  const benchmarkRows: { label: string; key: keyof AgencyBenchmarks }[] = [
    { label: 'CAC (Client Acquisition Cost)',          key: 'cac' },
    { label: 'Profit Margin %',                        key: 'margin' },
    { label: 'CPL (Cost per Lead)',                    key: 'cpl' },
    { label: 'Cost per Booked Appointment',            key: 'costPerBookedAppt' },
    { label: 'Cost per Shown Appointment',             key: 'costPerShownAppt' },
    { label: 'Lead-to-Booked Rate %',                  key: 'leadToBookedRate' },
    { label: 'Show Rate %',                            key: 'showRate' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Configure your agency and default values"
        actions={
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Agency branding */}
        <div className="card p-6">
          <h2 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-400" />
            Agency Branding
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Agency Name</label>
              <input
                className="input"
                value={settings.agencyName}
                onChange={e => setSettings(s => ({ ...s, agencyName: e.target.value }))}
                placeholder="My Agency"
              />
            </div>
            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-3">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-[#2A2A2A]" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
                    <Building2 size={18} className="text-indigo-400" />
                  </div>
                )}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Upload size={13} /> Upload
                </button>
                {settings.logoUrl && (
                  <button type="button" onClick={() => setSettings(s => ({ ...s, logoUrl: '' }))}
                    className="text-slate-500 hover:text-red-400 text-xs">Remove</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </div>

        {/* Defaults */}
        <div className="card p-6">
          <h2 className="text-slate-200 font-semibold text-sm mb-4">Default Financial Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Default Price per Shown Appointment ($)</label>
              <input className="input" type="number" min="0" step="0.01"
                value={settings.defaultPricePerAppointment}
                onChange={e => setSettings(s => ({ ...s, defaultPricePerAppointment: parseFloat(e.target.value) || 0 }))} />
              <p className="text-slate-500 text-xs mt-1">Applied when creating a new client</p>
            </div>
            <div>
              <label className="label">Default Min Profit Threshold ($/month)</label>
              <input className="input" type="number" min="0" step="0.01"
                value={settings.defaultProfitThreshold}
                onChange={e => setSettings(s => ({ ...s, defaultProfitThreshold: parseFloat(e.target.value) || 0 }))} />
              <p className="text-slate-500 text-xs mt-1">Alert if monthly profit drops below this</p>
            </div>
          </div>
        </div>

        {/* Benchmarks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Target size={16} className="text-amber-400" />
              Performance Benchmarks
            </h2>
            <button
              onClick={() => setSettings(s => ({ ...s, benchmarks: DEFAULT_BENCHMARKS }))}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              Reset to defaults
            </button>
          </div>
          <p className="text-slate-500 text-xs mb-4">
            These thresholds power the Good / Average / Poor badges on the Agency Dashboard metric cards.
          </p>
          <div className="grid grid-cols-12 gap-3 mb-2 px-0.5">
            <span className="text-slate-600 text-[10px] uppercase tracking-wide col-span-4">Metric</span>
            <span className="text-slate-600 text-[10px] uppercase tracking-wide col-span-3 text-center">Good threshold</span>
            <span className="text-slate-600 text-[10px] uppercase tracking-wide col-span-3 text-center">Avg threshold</span>
            <span className="text-slate-600 text-[10px] uppercase tracking-wide col-span-2 text-center">Direction</span>
          </div>
          {benchmarkRows.map(({ label, key }) => (
            <BenchmarkRow
              key={key}
              label={label}
              cfg={settings.benchmarks[key]}
              onChange={cfg => setBenchmark(key, cfg)}
            />
          ))}
        </div>

        {/* CSM names */}
        <div className="card p-6">
          <h2 className="text-slate-200 font-semibold text-sm mb-4">CSM Team Members</h2>
          <div className="space-y-2 mb-3">
            {settings.csmNames.map(name => (
              <div key={name} className="flex items-center justify-between p-2.5 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <span className="text-slate-300 text-sm">{name}</span>
                <button onClick={() => removeCSM(name)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {settings.csmNames.length === 0 && (
              <p className="text-slate-500 text-sm italic">No CSM names added yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" value={newCSM} onChange={e => setNewCSM(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCSM(); } }}
              placeholder="Add CSM name..." />
            <button onClick={addCSM} className="btn-secondary px-3"><Plus size={16} /></button>
          </div>
        </div>

        {/* Data management */}
        <div className="card p-6">
          <h2 className="text-slate-200 font-semibold text-sm mb-2">Data Management</h2>
          <p className="text-slate-500 text-xs mb-4">All data is stored in your browser's localStorage.</p>
          <button
            onClick={() => {
              if (window.confirm('This will delete ALL data permanently. Are you sure?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="btn-danger"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
