import React, { useState, useEffect } from 'react';
import {
  Boxes,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Filter,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { KpiCard } from '../components/KpiCard';
import { StockBadge } from '../components/StockBadge';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onSelectProduct: (productId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveOverview: React.FC<Props> = ({ onSelectProduct, onNavigateTab }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [salesGranularity, setSalesGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    "Dairy & Eggs", "Staples", "Edible Oils", "Beverages", "Snacks",
    "Personal Care", "Home Care", "Fresh Produce", "Bakery", "Frozen Foods",
    "Baby Care", "Electronics & Utilities"
  ];

  const warehouses = ["HYD-01", "HYD-02", "SEC-01"];
  const stockStatuses = ["Healthy", "Low Stock", "Critical", "Out of Stock", "Overstocked"];

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashResult, salesResult] = await Promise.allSettled([
        api.getDashboardSummary({
          category: categoryFilter || undefined,
          warehouse: warehouseFilter || undefined,
          stock_status: stockStatusFilter || undefined
        }),
        api.getSalesTrend(salesGranularity, categoryFilter || undefined)
      ]);

      if (dashResult.status === 'fulfilled') {
        setData(dashResult.value);
      }
      if (salesResult.status === 'fulfilled') {
        setSalesTrend(salesResult.value.series || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, warehouseFilter, stockStatusFilter, salesGranularity]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500 text-sm animate-pulse">
        Loading authoritative RetailIQ database analytics...
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_products: 0,
    total_sales_revenue_inr: 0,
    total_units_sold: 0,
    total_inventory_value_inr: 0,
    total_inventory_units: 0,
    low_stock_products: 0,
    critical_stock_products: 0,
    out_of_stock_products: 0,
    overstocked_products: 0,
    healthy_products: 0,
    pending_purchase_orders: 0,
    replenishment_recommendations: 0
  };

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Global Filters:</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="">All Categories (12)</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="">All Stock Health Statuses</option>
            {stockStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(categoryFilter || warehouseFilter || stockStatusFilter) && (
            <button
              onClick={() => {
                setCategoryFilter('');
                setWarehouseFilter('');
                setStockStatusFilter('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 10 Required KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Total Products"
          value={kpis.total_products}
          subtitle="Authoritative SKUs"
          badge="12 Categories"
          badgeType="info"
          icon={Boxes}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigateTab('inventory')}
        />

        <KpiCard
          title="Sales Revenue"
          value={`₹${(kpis.total_sales_revenue_inr / 100000).toFixed(2)}L`}
          subtitle="180-day sales volume"
          badge="INR Total"
          badgeType="success"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => onNavigateTab('reports')}
        />

        <KpiCard
          title="Total Units Sold"
          value={kpis.total_units_sold.toLocaleString()}
          subtitle="Across 11,041 tx lines"
          badge="180 Days"
          badgeType="info"
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigateTab('reports')}
        />

        <KpiCard
          title="Inventory Valuation"
          value={`₹${(kpis.total_inventory_value_inr / 100000).toFixed(2)}L`}
          subtitle={`${kpis.total_inventory_units.toLocaleString()} total units on hand`}
          badge="At Cost"
          badgeType="purple"
          icon={Layers}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => onNavigateTab('inventory')}
        />

        <KpiCard
          title="Healthy Stock"
          value={kpis.healthy_products}
          subtitle="Stable stock levels"
          badge={`${((kpis.healthy_products / (kpis.total_products || 1)) * 100).toFixed(0)}% optimal`}
          badgeType="success"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => {
            setStockStatusFilter('Healthy');
            onNavigateTab('inventory');
          }}
        />

        <KpiCard
          title="Low Stock"
          value={kpis.low_stock_products}
          subtitle="Position below ROP"
          badge="Attention"
          badgeType="warning"
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          onClick={() => {
            setStockStatusFilter('Low Stock');
            onNavigateTab('inventory');
          }}
        />

        <KpiCard
          title="Critical Stock"
          value={kpis.critical_stock_products}
          subtitle="Cover < 3 days"
          badge="High Risk"
          badgeType="danger"
          icon={AlertOctagon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          onClick={() => {
            setStockStatusFilter('Critical');
            onNavigateTab('inventory');
          }}
        />

        <KpiCard
          title="Out of Stock"
          value={kpis.out_of_stock_products}
          subtitle="Zero units on shelf"
          badge="Depleted"
          badgeType="danger"
          icon={Clock}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
          onClick={() => {
            setStockStatusFilter('Out of Stock');
            onNavigateTab('inventory');
          }}
        />

        <KpiCard
          title="Overstocked"
          value={kpis.overstocked_products}
          subtitle="Excess buffer stock"
          badge="Capital Tied"
          badgeType="purple"
          icon={Layers}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => {
            setStockStatusFilter('Overstocked');
            onNavigateTab('inventory');
          }}
        />

        <KpiCard
          title="Pending POs"
          value={kpis.pending_purchase_orders}
          subtitle="Open procurement"
          badge={`${kpis.replenishment_recommendations} Recs`}
          badgeType="info"
          icon={ShoppingCart}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigateTab('purchase-orders')}
        />
      </div>

      {/* Row 1: Sales Revenue Trend (A) & Stock Health Donut (C) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A: Sales Revenue Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Sales Revenue Historical Trend (180 Days)
              </h3>
              <p className="text-xs text-slate-500">Historical performance from 13 May 2026 to 8 Nov 2026</p>
            </div>

            {/* Granularity Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 self-start">
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSalesGranularity(g)}
                  className={`px-3 py-1 rounded-md capitalize transition-all ${
                    salesGranularity === g ? 'bg-white text-blue-600 shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesTrendColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="#94A3B8"
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                  labelFormatter={(lbl) => `Period: ${lbl}`}
                />
                <Area type="monotone" dataKey="revenue_inr" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#salesTrendColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Stock Health Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-600" />
              Stock Health Classification
            </h3>
            <p className="text-xs text-slate-500">Distribution across 120 supermarket SKUs</p>
          </div>

          <div className="h-48 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.stock_health || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {(data?.stock_health || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {(data?.stock_health || []).map((s) => (
              <div key={s.status} className="flex items-center justify-between px-2 py-1 rounded bg-slate-50">
                <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                  {s.status}
                </span>
                <strong className="text-slate-900">{s.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Category Analysis (B) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-600" />
              Inventory Category Analysis (Valuation & Stock on Hand)
            </h3>
            <p className="text-xs text-slate-500">Inventory value and physical quantities across the 12 retail categories</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.category_distribution || []} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="category" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" stroke="#64748B" />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#2563EB" tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#10B981" />
              <Tooltip formatter={(val: any, name: any) => [name === 'value_inr' ? `₹${Number(val).toLocaleString()}` : val, name === 'value_inr' ? 'Inventory Value' : 'Stock Units']} />
              <Legend verticalAlign="top" height={36} />
              <Bar yAxisId="left" dataKey="value_inr" name="Inventory Value (INR)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="stock" name="Current Stock (Units)" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Product Performance Top 10 by Units & Revenue (D) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Products by Units Sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top 10 Products by Units Sold</h3>
              <p className="text-xs text-slate-500">Highest velocity supermarket SKUs</p>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              View Inventory <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(data?.top_products_by_units || []).map((item, idx) => (
              <div
                key={item.product_id}
                onClick={() => onSelectProduct(item.product_id)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-slate-400 text-center">#{idx + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.product_name}</p>
                    <p className="text-[11px] text-slate-500">{item.category} • <span className="font-mono">{item.product_id}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900">{item.units_sold.toLocaleString()} units</span>
                  <p className="text-[11px] text-slate-500">₹{item.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Products by Sales Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top 10 Products by Sales Revenue</h3>
              <p className="text-xs text-slate-500">Highest grossing product lines</p>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              View Sales Report <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(data?.top_products_by_revenue || []).map((item, idx) => (
              <div
                key={item.product_id}
                onClick={() => onSelectProduct(item.product_id)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-slate-400 text-center">#{idx + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.product_name}</p>
                    <p className="text-[11px] text-slate-500">{item.category} • <span className="font-mono">{item.product_id}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-blue-600">₹{item.revenue.toLocaleString()}</span>
                  <p className="text-[11px] text-slate-500">{item.units_sold.toLocaleString()} units sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Activity & Alerts (E) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent AI Agent Decisions & Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent AI Agent Decisions & Alerts</h3>
            </div>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
            >
              Full Audit Trail <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {(data?.recent_alerts || []).map((act) => (
              <div key={act.activity_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{act.action}</span>
                  <PriorityBadge priority={act.priority} />
                </div>
                <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{act.reason}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/50 pt-1.5">
                  <span>{act.product_name || 'System Level Action'}</span>
                  <span>{act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchase Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Purchase Orders</h3>
            </div>
            <button
              onClick={() => onNavigateTab('purchase-orders')}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              Manage Orders <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(data?.recent_purchase_orders || []).map((po) => (
              <div key={po.po_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600">{po.po_id}</span>
                    <span className="font-bold text-slate-900">{po.product_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supplier: {po.supplier_name} • Order Date: {po.order_date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                    {po.po_status}
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 mt-1">₹{po.total_order_value_inr.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

