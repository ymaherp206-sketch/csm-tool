import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Settings,
  ChevronLeft, ChevronRight, Building2, BarChart3, Megaphone, MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { getSettings } from '../../services/storage';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const settings = getSettings();

  const agencyActive = location.pathname.startsWith('/agency');

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1A1A]'
    }`;

  return (
    <aside
      className={`flex flex-col bg-[#111111] border-r border-[#2A2A2A] transition-all duration-200
        ${collapsed ? 'w-16' : 'w-56'} min-h-screen sticky top-0 z-30`}
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
          <span className="font-semibold text-slate-100 text-sm truncate">{settings.agencyName}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {/* Dashboard */}
        <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
          <LayoutDashboard size={18} className="flex-shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Agency group */}
        {collapsed ? (
          // Icon-only: show parent icon, active if any sub-route matches
          <NavLink
            to="/agency/ads"
            className={linkClass(agencyActive)}
          >
            <BarChart3 size={18} className="flex-shrink-0" />
          </NavLink>
        ) : (
          <>
            {/* Non-clickable group label */}
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              ${agencyActive ? 'text-indigo-400' : 'text-slate-400'}`}>
              <BarChart3 size={18} className="flex-shrink-0" />
              <span>Agency</span>
            </div>
            {/* Sub-items */}
            <NavLink
              to="/agency/ads"
              className={({ isActive }) =>
                `flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-[#1A1A1A]'
                }`}
            >
              <Megaphone size={15} className="flex-shrink-0" />
              <span>Ads Acquisition</span>
            </NavLink>
            <NavLink
              to="/agency/sms"
              className={({ isActive }) =>
                `flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-[#1A1A1A]'
                }`}
            >
              <MessageSquare size={15} className="flex-shrink-0" />
              <span>SMS Acquisition</span>
            </NavLink>
          </>
        )}

        {/* Clients */}
        <NavLink to="/clients" className={({ isActive }) => linkClass(isActive)}>
          <Users size={18} className="flex-shrink-0" />
          {!collapsed && <span>Clients</span>}
        </NavLink>

        {/* Activity */}
        <NavLink to="/activity" className={({ isActive }) => linkClass(isActive)}>
          <Activity size={18} className="flex-shrink-0" />
          {!collapsed && <span>Activity</span>}
        </NavLink>

        {/* Settings */}
        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)}>
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
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
