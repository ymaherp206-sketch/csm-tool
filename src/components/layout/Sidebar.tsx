import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Settings, ChevronLeft, ChevronRight, Building2, BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { getSettings } from '../../services/storage';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agency', icon: BarChart3, label: 'Agency' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const settings = getSettings();

  return (
    <aside
      className={`
        flex flex-col bg-[#111111] border-r border-[#2A2A2A] transition-all duration-200
        ${collapsed ? 'w-16' : 'w-56'}
        min-h-screen sticky top-0 z-30
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2A2A2A]">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <span className="font-semibold text-slate-100 text-sm truncate">
            {settings.agencyName}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1A1A]'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center py-4 border-t border-[#2A2A2A] text-slate-500 hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
