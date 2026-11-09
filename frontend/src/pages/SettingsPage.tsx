import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Key,
  Lock,
  Save,
  CheckCircle2,
  Cpu,
  Info
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [currency, setCurrency] = useState('INR');
  const [reviewPeriod, setReviewPeriod] = useState(7);
  const [requireHumanApproval, setRequireHumanApproval] = useState(true);
  const [deterministicMode, setDeterministicMode] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-blue-600" />
            System Configuration & Procurement Controls
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure business control boundaries, audit controls, and reasoning options.
          </p>
        </div>

        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Section 1: Business Parameters */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              1. Inventory Replenishment Parameters
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operational Currency:</label>
                <input
                  type="text"
                  value={currency}
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold"
                />
                <span className="text-[10px] text-slate-400">Locked to INR per authoritative dataset specifications.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Standard Review Period (Days):</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={reviewPeriod}
                  onChange={(e) => setReviewPeriod(parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
                <span className="text-[10px] text-slate-400">Used in Target Stock formula: Target = Forecast × (Lead Time + Review Period) + Safety Stock.</span>
              </div>
            </div>
          </div>

          {/* Section 2: Human in the Loop Approval */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              2. Governance & Procurement Guardrails
            </h4>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Require Human Approval for Purchase Orders</span>
                  <input
                    type="checkbox"
                    checked={requireHumanApproval}
                    onChange={(e) => setRequireHumanApproval(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Strict business control: Prevents autonomous purchase orders from automatically dispatching to suppliers.
                  All AI recommendations must be approved as Drafts by an inventory manager before moving to Pending.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: AI Engine Mode */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              3. AI Decision Engine Architecture
            </h4>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <Cpu className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900">Deterministic Mathematical Reasoning Engine</span>
                    <span className="ml-2 px-2 py-0.2 rounded bg-blue-200 text-blue-800 text-[10px] font-bold">
                      Active
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                  The primary reasoning engine executes 100% locally using statistical algorithms (WMA, ROP, holdout evaluation)
                  and does not require any paid external API subscriptions.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Optional OpenAI API Key (For Optional Natural Language Summarization):
              </label>
              <div className="relative">
                <Key className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400">
                Optional: Even if provided, the LLM will only summarize outputs and is strictly barred from altering backend calculations.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

