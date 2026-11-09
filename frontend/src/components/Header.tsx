import React from 'react';
import { Bot, RefreshCw, Calendar, Sparkles, Building } from 'lucide-react';

interface Props {
  activeTab: string;
  onOpenAgentChat: () => void;
  onTriggerAgentRun: () => void;
  isEvaluating: boolean;
}

export const Header: React.FC<Props> = ({
  activeTab,
  onOpenAgentChat,
  onTriggerAgentRun,
  isEvaluating
}) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Executive Overview',
      subtitle: 'Predict Demand. Prevent Stockouts. Optimise Replenishment.'
    },
    inventory: {
      title: 'Inventory Monitoring & Position',
      subtitle: 'Live physical, incoming, and reserved stock classifications across 120 SKUs.'
    },
    forecasting: {
      title: 'Demand Forecasting Suite',
      subtitle: 'Multi-horizon predictive demand models evaluated against true historical sales.'
    },
    agent: {
      title: 'RetailIQ Autonomous Inventory Agent',
      subtitle: '11-step deterministic AI replenishment agent with transparent formulas and explainability.'
    },
    replenishment: {
      title: 'Replenishment Management',
      subtitle: 'Algorithmic purchase recommendations with pack-size rounding and MOQ compliance.'
    },
    'purchase-orders': {
      title: 'Purchase Order Management',
      subtitle: 'Track historical procurement, delivery timelines, and approve AI draft orders.'
    },
    suppliers: {
      title: 'Supplier Performance Analytics',
      subtitle: 'Evaluation of lead-time variances, reliability indexes, and on-time fulfillment.'
    },
    reports: {
      title: 'Reports & Analytics',
      subtitle: 'MBA Business Analytics analytical reports for executive valuation and inventory turnover.'
    },
    activity: {
      title: 'AI Agent Audit Log',
      subtitle: 'Immutable record of autonomous actions, stock alerts, and managerial decisions.'
    },
    dataset: {
      title: 'Dataset Management',
      subtitle: 'Authoritative Excel workbook records, row verification, and safe re-ingestion.'
    },
    makecom: {
      title: 'Make.com Automation Integration',
      subtitle: 'Autonomous replenishment webhooks and email notification dispatch.'
    },
    settings: {
      title: 'System Settings & Controls',
      subtitle: 'Configure operational parameters, LLM reasoning keys, and human approval gates.'
    }
  };

  const current = titles[activeTab] || { title: 'RetailIQ Intelligence', subtitle: '' };

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-sm">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{current.title}</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Authoritative Excel Data Active
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Snapshot Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200 font-medium">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span>Snapshot: <strong>8 Nov 2026</strong></span>
        </div>

        {/* Currency Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200 font-bold">
          <span>INR (₹)</span>
        </div>

        {/* Run AI Analysis Action */}
        <button
          onClick={onTriggerAgentRun}
          disabled={isEvaluating}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          {isEvaluating ? 'Evaluating SKUs...' : 'Run AI Analysis'}
        </button>

        {/* Ask AI Agent Drawer Trigger */}
        <button
          onClick={onOpenAgentChat}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm shadow-purple-500/20 transition-all"
        >
          <Bot className="h-4 w-4" />
          <span>Ask Agent</span>
        </button>
      </div>
    </header>
  );
};

