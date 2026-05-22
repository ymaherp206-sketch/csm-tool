import { useState } from 'react';
import type { Client, ClientStatus, CommChannel, ChecklistItem } from '../../types';
import {
  generateId, getSettings, defaultChecklist, saveClient
} from '../../services/storage';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  client?: Client;
  onSaved: (client: Client) => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSaved, onCancel }: Props) {
  const settings = getSettings();
  const isEdit = !!client;

  const today = format(new Date(), 'yyyy-MM-dd');
  const oneYear = format(new Date(Date.now() + 365 * 86400000), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    name: client?.name ?? '',
    businessType: client?.businessType ?? '',
    startDate: client?.startDate ?? today,
    contractEndDate: client?.contractEndDate ?? oneYear,
    status: (client?.status ?? 'Active') as ClientStatus,
    assignedCSM: client?.assignedCSM ?? (settings.csmNames[0] ?? ''),
    commChannel: (client?.commChannel ?? 'Email') as CommChannel,
    notes: client?.notes ?? '',
    pricePerAppointment: client?.pricePerAppointment ?? settings.defaultPricePerAppointment,
    minProfitThreshold: client?.minProfitThreshold ?? settings.defaultProfitThreshold,
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    client?.checklist ?? defaultChecklist()
  );
  const [newItem, setNewItem] = useState('');

  function handleChange(k: keyof typeof form, v: string | number) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function addChecklistItem() {
    if (!newItem.trim()) return;
    setChecklist(c => [...c, { id: generateId(), label: newItem.trim(), completed: false }]);
    setNewItem('');
  }

  function toggleChecklist(id: string) {
    setChecklist(c => c.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  }

  function removeChecklistItem(id: string) {
    setChecklist(c => c.filter(i => i.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const saved: Client = {
      id: client?.id ?? generateId(),
      ...form,
      checklist,
      createdAt: client?.createdAt ?? now,
      updatedAt: now,
    };
    saveClient(saved);
    onSaved(saved);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Client Name *</label>
          <input className="input" required value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Acme Corp" />
        </div>
        <div>
          <label className="label">Business Type</label>
          <input className="input" value={form.businessType} onChange={e => handleChange('businessType', e.target.value)} placeholder="Dental, Law Firm..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Start Date</label>
          <input className="input" type="date" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Contract End Date</label>
          <input className="input" type="date" value={form.contractEndDate} onChange={e => handleChange('contractEndDate', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => handleChange('status', e.target.value as ClientStatus)}>
            <option>Active</option>
            <option>Inactive</option>
            <option>Archived</option>
          </select>
        </div>
        <div>
          <label className="label">Assigned CSM</label>
          <select className="input" value={form.assignedCSM} onChange={e => handleChange('assignedCSM', e.target.value)}>
            {settings.csmNames.map(n => <option key={n}>{n}</option>)}
            <option value="">— Unassigned —</option>
          </select>
        </div>
        <div>
          <label className="label">Comm Channel</label>
          <select className="input" value={form.commChannel} onChange={e => handleChange('commChannel', e.target.value as CommChannel)}>
            {(['WhatsApp', 'Email', 'Slack', 'Phone'] as CommChannel[]).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Price / Shown Appointment ($)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.pricePerAppointment}
            onChange={e => handleChange('pricePerAppointment', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Min Profit Threshold ($/mo)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.minProfitThreshold}
            onChange={e => handleChange('minProfitThreshold', parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input h-20 resize-none" value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Any notes about this client..." />
      </div>

      {/* Onboarding Checklist */}
      <div>
        <label className="label">Onboarding Checklist</label>
        <div className="space-y-2 mb-3">
          {checklist.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleChecklist(item.id)}
                className="accent-indigo-500 w-4 h-4 flex-shrink-0"
              />
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                {item.label}
              </span>
              <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
            placeholder="Add checklist item..."
          />
          <button type="button" onClick={addChecklistItem} className="btn-secondary px-3">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Save Changes' : 'Add Client'}</button>
      </div>
    </form>
  );
}
