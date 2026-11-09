import React, { useState, useEffect } from 'react';
import {
  Building2,
  Award,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Mail,
  Phone,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { Supplier } from '../types';

export const SupplierAnalytics: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [rankingCriterion, setRankingCriterion] = useState<'reliability' | 'on_time' | 'lead_time' | 'spend'>('reliability');

  useEffect(() => {
    setLoading(true);
    api.getSuppliers()
      .then((res) => setSuppliers(res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sortedSuppliers = [...suppliers]
    .filter(s => search === '' || s.supplier_name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (rankingCriterion === 'reliability') {
        return b.supplier_reliability - a.supplier_reliability;
      }
      if (rankingCriterion === 'on_time') {
        return (b.on_time_delivery_pct || 0) - (a.on_time_delivery_pct || 0);
      }
      if (rankingCriterion === 'lead_time') {
        return a.average_lead_time_days - b.average_lead_time_days;
      }
      return (b.total_orders_placed || 0) - (a.total_orders_placed || 0);
    });

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-navy-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Vendor Master Analytics
              </span>
              <span className="text-xs text-slate-400">• 20 Regional Supermarket Distributors</span>
            </div>
            <h3 className="text-xl font-bold mt-2 tracking-tight">Supplier Performance Intelligence</h3>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Real-time benchmarking comparing simulated baseline supplier reliability scores
              against actual measured on-time fulfillment rates across 250 historical purchase orders.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 px-4 py-3 rounded-xl border border-white/10 shrink-0">
            <div>
              <p className="text-[10px] text-slate-300 uppercase font-semibold">Active Suppliers</p>
              <p className="text-2xl font-black text-white">{suppliers.length}</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-[10px] text-slate-300 uppercase font-semibold">Avg Lead Time</p>
              <p className="text-base font-bold text-blue-300">
                {suppliers.length ? (suppliers.reduce((acc, s) => acc + s.average_lead_time_days, 0) / suppliers.length).toFixed(1) : 2.5} Days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking and Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name or city..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-bold">Rank By:</span>
          {(['reliability', 'on_time', 'lead_time', 'spend'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRankingCriterion(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rankingCriterion === r
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {r === 'reliability' && 'Reliability Index'}
              {r === 'on_time' && 'Actual On-Time %'}
              {r === 'lead_time' && 'Fastest Lead Time'}
              {r === 'spend' && 'Purchase Volume'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Supplier Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sortedSuppliers.slice(0, 3).map((sup, idx) => (
          <div
            key={sup.supplier_id}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute -top-3 -right-3 h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-end justify-start pl-3 pb-2 text-xs font-black shadow-md">
              #{idx + 1}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600">{sup.supplier_id}</span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                  sup.supplier_status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {sup.supplier_status}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-900 mt-1.5">{sup.supplier_name}</h4>
              <p className="text-xs text-slate-500">{sup.city}, Telangana / AP</p>
            </div>

            <div className="my-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-500 block">Baseline Reliability</span>
                <span className="text-base font-extrabold text-blue-600">{(sup.supplier_reliability * 100).toFixed(1)}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70">
                <span className="text-[10px] text-emerald-700 block">Measured On-Time</span>
                <span className="text-base font-extrabold text-emerald-800">{sup.on_time_delivery_pct || 75.0}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-500 block">Lead Time</span>
                <span className="text-sm font-bold text-slate-800">{sup.average_lead_time_days} days</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-500 block">Min Order Value</span>
                <span className="text-sm font-bold text-slate-800">₹{sup.minimum_order_value_inr.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 text-slate-400" />
                {sup.contact_email}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-400" />
                {sup.contact_phone}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Complete Supplier Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            All 20 Supermarket Suppliers Comparative Matrix
          </h4>
          <span className="text-xs text-slate-500">
            Ranked by: <strong>{rankingCriterion}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">City</th>
                <th className="p-3.5 text-center">Lead Time</th>
                <th className="p-3.5 text-right">Simulated Score</th>
                <th className="p-3.5 text-right">Measured On-Time %</th>
                <th className="p-3.5 text-right">Min Order (MOV)</th>
                <th className="p-3.5">Payment Terms</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedSuppliers.map((sup, idx) => (
                <tr key={sup.supplier_id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-blue-600">{sup.supplier_id}</td>
                  <td className="p-3.5 font-bold text-slate-900">{sup.supplier_name}</td>
                  <td className="p-3.5 text-slate-600">{sup.city}</td>
                  <td className="p-3.5 text-center font-bold text-slate-800">{sup.average_lead_time_days} days</td>
                  <td className="p-3.5 text-right font-mono font-bold text-blue-600">
                    {(sup.supplier_reliability * 100).toFixed(1)}%
                  </td>
                  <td className="p-3.5 text-right font-mono font-extrabold text-emerald-600">
                    {sup.on_time_delivery_pct || 75.0}%
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    ₹{sup.minimum_order_value_inr.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-slate-600">{sup.payment_terms}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sup.supplier_status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {sup.supplier_status}
                    </span>
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

