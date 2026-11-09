import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Wrench,
  Layers,
  Database
} from 'lucide-react';
import { api } from '../services/api';

export const AiInventoryAgent: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [cycleResult, setCycleResult] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      sender: 'agent',
      text: "Welcome to the **RetailIQ Autonomous Inventory Agent** dashboard.\n\nI monitor all 120 supermarket products continuously, compute deterministic reorder points, forecast demand over supplier lead times, and generate explainable replenishment recommendations with human-in-the-loop controls."
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const workflowSteps = [
    { step: 1, name: "Inventory Snapshot", desc: "Retrieve physical stock, reserved units, and open purchase orders." },
    { step: 2, name: "Historical Sales", desc: "Extract 180-day transactional demand history for SKU." },
    { step: 3, name: "Average Daily Demand", desc: "Calculate 30-day continuous ADD including zero-sale days." },
    { step: 4, name: "Lead Time Forecast", desc: "Predict demand over the supplier's specific lead-time window." },
    { step: 5, name: "Supplier Validation", desc: "Retrieve supplier lead time, reliability index, MOQ, and pack size." },
    { step: 6, name: "ROP & Net Position", desc: "Compute Reorder Point = (ADD × Lead Time) + Safety Stock." },
    { step: 7, name: "Stock Risk Assessment", desc: "Classify stock status and determine priority (Critical, High, Medium, Low)." },
    { step: 8, name: "Order Sizing", desc: "Calculate Target Stock minus Position, applying pack-size and MOQ rounding." },
    { step: 9, name: "Explainable Narrative", desc: "Formulate human-readable MBA analytics justification for procurement." },
    { step: 10, name: "PO Draft Generation", desc: "Generate purchase order draft in database if replenishment is needed." },
    { step: 11, name: "Audit Trail Logging", desc: "Record every parameter and decision state permanently in the audit log." }
  ];

  const agentTools = [
    { id: "tool1", name: "get_inventory_status()", desc: "Queries physical, incoming, and reserved stock for any SKU or full catalog." },
    { id: "tool2", name: "get_product_sales_history()", desc: "Extracts continuous daily sales volume and transaction lines." },
    { id: "tool3", name: "forecast_product_demand()", desc: "Executes 7, 14, and 30-day statistical demand projections." },
    { id: "tool4", name: "get_supplier_information()", desc: "Returns vendor lead times, reliability scores, and minimum order values." },
    { id: "tool5", name: "calculate_reorder_point()", desc: "Evaluates exact ROP threshold based on lead time and safety buffer." },
    { id: "tool6", name: "calculate_stock_coverage()", desc: "Calculates current days of inventory cover against daily velocity." },
    { id: "tool7", name: "recommend_replenishment()", desc: "Executes end-to-end multi-step replenishment optimization." },
    { id: "tool8", name: "calculate_order_value()", desc: "Calculates procurement cost at cost price and verifies supplier MOV." },
    { id: "tool9", name: "create_purchase_order_draft()", desc: "Drafts new purchase order without sending to external vendors." },
    { id: "tool10", name: "log_agent_decision()", desc: "Writes immutable audit record with timestamps and decision metadata." }
  ];

  const handleRunCycle = async () => {
    setRunning(true);
    try {
      const res = await api.runAgentCycle(false);
      setCycleResult(res);
    } catch (err: any) {
      alert(`Agent run error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSendChat = async (promptText?: string) => {
    const text = promptText || chatInput;
    if (!text.trim() || chatLoading) return;

    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.chatWithAgent(text);
      setChatMessages(prev => [...prev, { sender: 'agent', text: res.answer, data: res.data }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'agent', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-navy-900 text-white rounded-2xl p-6 shadow-md border border-purple-800/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">RetailIQ Autonomous Inventory Agent</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Autonomous AI agent implementing a 11-step analytical replenishment workflow.
                Grounded in 10 deterministic tools, preventing hallucinated stock recommendations or vendor details.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunCycle}
            disabled={running}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/30 transition-all shrink-0 disabled:opacity-60"
          >
            <Play className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Executing 11-Step Cycle...' : 'Run Autonomous Agent Cycle'}
          </button>
        </div>

        {/* Cycle Results Strip */}
        {cycleResult && (
          <div className="mt-5 pt-4 border-t border-purple-800/60 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
            <div className="bg-white/10 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-300 uppercase">Evaluated</span>
              <p className="text-base font-bold text-white mt-0.5">{cycleResult.total_products_evaluated} SKUs</p>
            </div>
            <div className="bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/30">
              <span className="text-[10px] text-rose-300 uppercase font-bold">Critical</span>
              <p className="text-base font-extrabold text-rose-200 mt-0.5">{cycleResult.summary.critical}</p>
            </div>
            <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30">
              <span className="text-[10px] text-amber-300 uppercase font-bold">High</span>
              <p className="text-base font-extrabold text-amber-200 mt-0.5">{cycleResult.summary.high}</p>
            </div>
            <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
              <span className="text-[10px] text-blue-300 uppercase font-bold">Medium</span>
              <p className="text-base font-extrabold text-blue-200 mt-0.5">{cycleResult.summary.medium}</p>
            </div>
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">No Action</span>
              <p className="text-base font-extrabold text-emerald-200 mt-0.5">{cycleResult.summary.no_action}</p>
            </div>
            <div className="bg-white/10 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-300 uppercase">Total Procurement</span>
              <p className="text-base font-bold text-white mt-0.5">₹{(cycleResult.summary.total_procurement_cost_inr / 1000).toFixed(1)}k</p>
            </div>
          </div>
        )}
      </div>

      {/* 11-Step Autonomous Workflow Pipeline Visualizer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            11-Step Autonomous Replenishment Workflow
          </h4>
          <p className="text-xs text-slate-500">Standardized execution pipeline applied to all catalog products</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {workflowSteps.map((w) => (
            <div
              key={w.step}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition-all text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-100 text-purple-800">
                  Step {w.step}
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h5 className="font-bold text-slate-900 pt-1">{w.name}</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Tools Directory & Interactive Agent Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: 10 Backend Tools Directory */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                10 Integrated Backend Agent Tools
              </h4>
              <p className="text-xs text-slate-500">Programmatic tools accessible to the decision engine</p>
            </div>
          </div>

          <div className="space-y-2">
            {agentTools.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setSelectedTool(t.id === selectedTool ? null : t.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${selectedTool === t.id
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-700">#{idx + 1} {t.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Tool</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 7 Cols: Interactive Reasoning Chat Console */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col h-[580px] overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Bot className="h-5 w-5 text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Interactive Agent Chat & Diagnostics</h4>
                <p className="text-[10px] text-slate-400">Ask the agent questions about SKU demand and reorder decisions</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Grounded
            </span>
          </div>

          {/* Quick Questions Chips */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar">
            {[
              "What is the stock level of cheese?",
              "Demand forecast for milk",
              "How many eggs do we have?",
              "Which products need immediate replenishment?",
              "Which products may run out of stock in the next seven days?",
              "Which supplier is most reliable?"
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(q)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-300 transition-all shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 custom-scrollbar">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 w-fit animate-pulse">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Agent querying database & formulating grounded response...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything: 'stock level of cheese', 'demand for milk', 'who supplies rice'..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

