import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Calculator, AlertTriangle, ArrowUpRight, TrendingUp, Package, Clock, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { StockBadge } from './StockBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  productId: string | null;
  onClose: () => void;
  onDraftCreated?: () => void;
}

export const ProductDetailModal: React.FC<Props> = ({ productId, onClose, onDraftCreated }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [orderQty, setOrderQty] = useState<number>(0);
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setDraftResult(null);
    api.getProductDetail(productId)
      .then((res) => {
        setData(res);
        setOrderQty(res.recommended_quantity || res.moq || 10);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [productId]);

  if (!productId) return null;

  const handleCreateDraft = async () => {
    if (!orderQty || orderQty <= 0) return;
    setDrafting(true);
    try {
      const res = await api.createPurchaseOrderDraft({
        product_id: productId,
        quantity: orderQty,
        supplier_id: data.preferred_supplier_id,
        notes: `Draft created from Product Inspection modal for ${data.product_name}`
      });
      setDraftResult(res.message);
      if (onDraftCreated) onDraftCreated();
    } catch (err: any) {
      setDraftResult(`Error: ${err.message || 'Failed to create draft'}`);
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {productId}
            </span>
            <h3 className="text-base font-bold text-white">{data?.product_name || 'Loading SKU Details...'}</h3>
            {data && <StockBadge status={data.stock_status} size="sm" />}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading || !data ? (
            <div className="py-20 text-center text-slate-500 text-sm animate-pulse">
              Retrieving historical transactions and evaluating inventory parameters...
            </div>
          ) : (
            <>
              {/* Top Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{data.category}</p>
                  <p className="text-[11px] text-slate-500">{data.brand}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unit Economics</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">₹{data.unit_cost_inr.toFixed(2)} cost</p>
                  <p className="text-[11px] text-slate-500">₹{(data.unit_cost_inr * 1.3).toFixed(2)} selling</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Preferred Supplier</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{data.supplier_name}</p>
                  <p className="text-[11px] text-slate-500">Lead Time: {data.lead_time_days} days</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inventory Health</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <PriorityBadge priority={data.priority} />
                    <span className="text-[11px] font-semibold text-slate-700">{data.days_of_cover} days cover</span>
                  </div>
                </div>
              </div>

              {/* Inventory Position Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  Stock Position & Reorder Mechanics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] text-slate-500">Physical Available</span>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">{data.current_stock} <span className="text-xs font-normal text-slate-500">units</span></p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] text-slate-500">Incoming Stock (Open POs)</span>
                    <p className="text-xl font-extrabold text-blue-600 mt-0.5">+{data.incoming_stock} <span className="text-xs font-normal text-slate-500">units</span></p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] text-slate-500">Reserved Customer Units</span>
                    <p className="text-xl font-extrabold text-amber-600 mt-0.5">-{data.reserved_stock} <span className="text-xs font-normal text-slate-500">units</span></p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-blue-700">Net Inventory Position</span>
                    <p className="text-xl font-black text-blue-900 mt-0.5">={data.inventory_position} <span className="text-xs font-normal text-blue-700">units</span></p>
                  </div>
                </div>
              </div>

              {/* 60-Day Historical Demand Chart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Daily Demand Profile (Last 60 Calendar Days)
                  </h4>
                  <span className="text-xs text-slate-500">
                    30D Avg Daily Demand: <strong>{data.avg_daily_demand} units/day</strong>
                  </span>
                </div>
                <div className="h-44 w-full bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.sales_history_60d || []}>
                      <defs>
                        <linearGradient id="skuDemandGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="units" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#skuDemandGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Business Math Explanation */}
              <div className="bg-slate-900 text-slate-200 rounded-xl p-4.5 text-xs space-y-2 border border-slate-800">
                <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-[11px]">
                  <Calculator className="h-4 w-4" />
                  Deterministic Business Rule Calculations
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 font-mono text-[11px] pt-1">
                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <p className="text-slate-400 text-[10px] font-sans">REORDER POINT (ROP)</p>
                    <p className="mt-1">{data.calculation_steps?.reorder_point?.formula}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <p className="text-slate-400 text-[10px] font-sans">TARGET STOCK</p>
                    <p className="mt-1">{data.calculation_steps?.target_stock?.formula}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <p className="text-slate-400 text-[10px] font-sans">REPLENISHMENT SIZING</p>
                    <p className="mt-1">{data.calculation_steps?.replenishment_quantity?.formula}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-[11px] pt-1 font-sans italic">
                  Agent Assessment: {data.explanation}
                </p>
              </div>

              {/* Order Generation Action */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Recommended Replenishment Order</h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recommended: <strong>{data.recommended_quantity} units</strong> (Est. ₹{data.estimated_cost_inr.toFixed(2)})
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      value={orderQty}
                      onChange={(e) => setOrderQty(parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-center"
                    />
                  </div>
                  <button
                    onClick={handleCreateDraft}
                    disabled={drafting || orderQty <= 0}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {drafting ? 'Creating PO Draft...' : 'Generate PO Draft'}
                  </button>
                </div>
              </div>

              {draftResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  draftResult.startsWith('Error')
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {draftResult}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

