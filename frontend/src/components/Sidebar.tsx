import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  Bot,
  Truck,
  ShoppingCart,
  Building2,
  BarChart3,
  History,
  Database,
  Settings,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAgentChat: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab, onOpenAgentChat }) => {
  const navItems = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory Management', icon: Boxes },
    { id: 'forecasting', label: 'Demand Forecasting', icon: TrendingUp },
    { id: 'agent', label: 'AI Inventory Agent', icon: Bot, isAi: true },
    { id: 'replenishment', label: 'Replenishment', icon: Truck },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'suppliers', label: 'Supplier Analytics', icon: Building2 },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'activity', label: 'Agent Activity Log', icon: History },
    { id: 'dataset', label: 'Dataset Management', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-navy-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              RETAILIQ
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                AI
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">
              Inventory Intelligence
            </p>
          </div>
        </div>

        <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-navy-800/80 border border-slate-700/60 text-[11px] text-slate-400">
          <span className="text-emerald-400 font-semibold">● Active Source:</span> RetailIQ Excel Dataset
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'hover:bg-navy-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : item.isAi ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.isAi && !isActive && (
                <span className="h-2 w-2 rounded-full bg-purple-400"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Assistant Quick Trigger Banner */}
      <div className="p-4 border-t border-slate-800/80 bg-navy-800/50">
        <button
          onClick={onOpenAgentChat}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-navy-800 border border-purple-500/30 hover:border-purple-400/60 text-left transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Ask AI Agent</p>
              <p className="text-[10px] text-slate-400">Reasoning & Diagnostics</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Snapshot: 8 Nov 2026</span>
          <span className="text-slate-400 font-mono">120 SKUs</span>
        </div>
      </div>
    </aside>
  );
};

