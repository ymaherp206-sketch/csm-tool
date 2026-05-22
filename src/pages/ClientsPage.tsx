import { useState, useMemo } from 'react';
import { getClients } from '../services/storage';
import { enrichClient } from '../services/metrics';
import type { Client, ClientStatus } from '../types';
import ClientCard from '../components/clients/ClientCard';
import ClientForm from '../components/clients/ClientForm';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { Users, Plus, Search, Filter } from 'lucide-react';

const STATUS_FILTERS: (ClientStatus | 'All')[] = ['All', 'Active', 'Inactive', 'Archived'];

export default function ClientsPage() {
  const [refresh, setRefresh] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All');

  const clients = useMemo(() => {
    const raw = getClients();
    return raw.map(c => enrichClient(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.businessType.toLowerCase().includes(search.toLowerCase()) ||
        c.assignedCSM.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [clients, statusFilter, search]);

  function handleSaved(_: Client) {
    setShowAdd(false);
    setRefresh(r => r + 1);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle={`${clients.filter(c => c.status === 'Active').length} active clients`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Client
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1A1A1A] text-slate-400 border border-[#2A2A2A] hover:border-[#3A3A3A]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title={search || statusFilter !== 'All' ? 'No clients match your filters' : 'No clients yet'}
          description={!search && statusFilter === 'All' ? 'Add your first client to get started tracking performance.' : undefined}
          action={
            !search && statusFilter === 'All' ? (
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add Client
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add New Client" onClose={() => setShowAdd(false)} size="lg">
          <ClientForm onSaved={handleSaved} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  );
}
