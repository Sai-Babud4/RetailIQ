import React, { useState, useEffect } from 'react';
import {
  Truck,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  ShoppingCart,
  Eye,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { ReplenishmentRecommendation } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onSelectProduct: (productId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ReplenishmentManagement: React.FC<Props> = ({ onSelectProduct, onNavigateTab }) => {
  const [recs, setRecs] = useState<ReplenishmentRecommendation[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const categories = [
    "Dairy & Eggs", "Staples", "Edible Oils", "Beverages", "Snacks",
    "Personal Care", "Home Care", "Fresh Produce", "Bakery", "Frozen Foods",
    "Baby Care", "Electronics & Utilities"
  ];

  const loadRecs = () => {
    setLoading(true);
    api.getReplenishmentRecommendations({
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      status: statusFilter || undefined
    })
      .then((res) => setRecs(res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecs();
  }, [priorityFilter, categoryFilter, statusFilter]);

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      await api.runAgentCycle(false);
      loadRecs();
      setActionMessage("Autonomous replenishment analysis complete. Recommendations updated.");
    } catch (err: any) {
      setActionMessage(`Error running analysis: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async (rec: ReplenishmentRecommendation) => {
    try {
      const res = await api.createPurchaseOrderDraft({
        product_id: rec.product_id,
        quantity: rec.recommended_quantity,
        supplier_id: rec.preferred_supplier_id,
        notes: `Replenishment draft created for ${rec.priority} item: ${rec.product_name}`
      });
      setActionMessage(res.message);
      loadRecs();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const exportCSV = () => {
    if (!recs.length) return;
    const headers = [
      "Product_ID", "Product_Name", "Category", "Current_Stock", "Inventory_Position",
      "Daily_Demand", "Forecast_Demand", "Lead_Time", "Reorder_Point", "Target_Stock",
      "Recommended_Quantity", "Supplier_Name", "Unit_Cost_INR", "Estimated_Cost_INR",
      "Priority", "Status", "AI_Explanation"
    ];
    const rows = recs.map(r => [
      r.product_id, `"${r.product_name}"`, `"${r.category}"`, r.current_stock,
      r.inventory_position, r.daily_demand, r.forecast_demand, r.lead_time,
      r.reorder_point, r.target_stock, r.recommended_quantity, `"${r.supplier_name}"`,
      r.unit_cost_inr, r.estimated_cost_inr, r.priority, r.status, `"${r.ai_explanation.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RetailIQ_Replenishment_Recommendations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCost = recs.reduce((acc, r) => acc + (r.recommended_quantity > 0 ? r.estimated_cost_inr : 0), 0);
  const totalUnits = recs.reduce((acc, r) => acc + r.recommended_quantity, 0);

  return (
    <div className="space-y-5">
      {/* Action Notification */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-blue-600 hover:text-blue-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner & Action Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Automated Replenishment Optimization
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies inventory gaps, aligns supplier MOQ and pack size rounding, and suggests purchase volumes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Run AI Analysis</span>
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Recommendations</span>
            </button>
          </div>
        </div>

        {/* Filters and Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="No Action">No Action</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Drafted">Drafted PO</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span>Flagged: <strong>{recs.filter(r => r.recommended_quantity > 0).length} SKUs</strong></span>
            <span>Total Units: <strong>{totalUnits.toLocaleString()}</strong></span>
            <span>Est. Spend: <strong className="text-blue-600">₹{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">SKU & Product</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Stock</th>
                <th className="p-3.5 text-right">Inv. Pos</th>
                <th className="p-3.5 text-right">ROP</th>
                <th className="p-3.5 text-right">Daily Demand</th>
                <th className="p-3.5 text-right font-bold text-blue-700">Rec. Quantity</th>
                <th className="p-3.5 text-right">Est. Cost</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recs.map((r) => (
                <tr key={r.product_id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="p-3.5">
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono font-bold text-blue-600 text-xs block">{r.product_id}</span>
                    <span className="font-bold text-slate-900">{r.product_name}</span>
                  </td>
                  <td className="p-3.5 text-slate-600">{r.category}</td>
                  <td className="p-3.5 text-right font-extrabold text-slate-900">{r.current_stock}</td>
                  <td className="p-3.5 text-right font-bold text-slate-800">{r.inventory_position}</td>
                  <td className="p-3.5 text-right font-semibold text-slate-700">{r.reorder_point}</td>
                  <td className="p-3.5 text-right text-slate-600">{r.daily_demand.toFixed(1)}/d</td>
                  <td className="p-3.5 text-right font-black text-blue-600 text-sm bg-blue-50/50">
                    {r.recommended_quantity > 0 ? `${r.recommended_quantity} units` : '—'}
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    {r.recommended_quantity > 0 ? `₹${r.estimated_cost_inr.toLocaleString()}` : '—'}
                  </td>
                  <td className="p-3.5">
                    <span className="text-slate-900 font-medium block truncate max-w-[140px]">{r.supplier_name}</span>
                    <span className="text-[10px] text-slate-400">Lead: {r.lead_time}d</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'Drafted'
                        ? 'bg-purple-100 text-purple-800'
                        : r.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.status === 'Rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.recommended_quantity > 0 && r.status === 'Pending' && (
                        <button
                          onClick={() => handleCreateDraft(r)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                          title="Generate PO Draft"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>Draft</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectProduct(r.product_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="View Full Calculation Breakdown"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

