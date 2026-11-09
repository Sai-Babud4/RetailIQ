import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { AgentActivity } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onSelectProduct: (productId: string) => void;
}

export const AgentActivityLog: React.FC<Props> = ({ onSelectProduct }) => {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<AgentActivity | null>(null);

  const loadActivities = () => {
    setLoading(true);
    api.getAgentActivity(100)
      .then((res) => setActivities(res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const actions = [
    "AI recommendation", "Purchase order draft", "Manager approval",
    "Rejection", "Received order", "Stock alert", "Autonomous run", "Dataset Ingestion"
  ];

  const filtered = activities.filter(a => {
    if (actionFilter && a.action !== actionFilter) return false;
    if (priorityFilter && a.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchP = a.product_name?.toLowerCase().includes(s) || a.product_id?.toLowerCase().includes(s);
      const matchR = a.reason?.toLowerCase().includes(s);
      if (!matchP && !matchR) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="h-4 w-4 text-purple-600" />
              Autonomous Decision & Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable logging of all AI recommendations, manager approvals, stock alerts, and procurement actions.
            </p>
          </div>

          <button
            onClick={loadActivities}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, product, or reason..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                <option value="">All Actions ({activities.length})</option>
                {actions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Reason & Business Context</th>
                <th className="p-3.5 text-right">Stock</th>
                <th className="p-3.5 text-right">Rec Qty</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((act) => (
                <tr key={act.activity_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-mono text-slate-400">#{act.activity_id}</td>
                  <td className="p-3.5 text-slate-600 whitespace-nowrap">
                    {act.timestamp ? new Date(act.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                      {act.action}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {act.product_id ? (
                      <div>
                        <span className="font-bold text-slate-900 block">{act.product_name}</span>
                        <span className="font-mono text-[10px] text-blue-600">{act.product_id}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">System Scope</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <PriorityBadge priority={act.priority} />
                  </td>
                  <td className="p-3.5 text-slate-600 max-w-md">
                    <p className="line-clamp-2 leading-relaxed text-[11px]">{act.reason}</p>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    {act.current_stock !== null && act.current_stock !== undefined ? act.current_stock : '—'}
                  </td>
                  <td className="p-3.5 text-right font-bold text-blue-600">
                    {act.recommended_quantity !== null && act.recommended_quantity !== undefined && act.recommended_quantity > 0
                      ? `${act.recommended_quantity} units`
                      : '—'}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {act.decision_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedActivity(act)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-purple-400" />
                Audit Trail Record #{selectedActivity.activity_id}
              </h4>
              <button onClick={() => setSelectedActivity(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Action</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedActivity.action}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Timestamp</span>
                  <p className="font-mono text-slate-700 mt-0.5">{selectedActivity.timestamp}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Priority</span>
                  <div className="mt-1"><PriorityBadge priority={selectedActivity.priority} /></div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Decision Status</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedActivity.decision_status}</p>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">Reason & Analytical Narrative:</h5>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedActivity.reason}
                </p>
              </div>

              {selectedActivity.details && (
                <div>
                  <h5 className="font-bold text-slate-900 mb-1">Raw Execution Payload:</h5>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40">
                    {selectedActivity.details}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

