import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { InventoryItem } from '../types';
import { StockBadge } from '../components/StockBadge';

interface Props {
  onSelectProduct: (productId: string) => void;
}

export const InventoryManagement: React.FC<Props> = ({ onSelectProduct }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [sortBy, setSortBy] = useState('current_stock');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);

  const categories = [
    "Dairy & Eggs", "Staples", "Edible Oils", "Beverages", "Snacks",
    "Personal Care", "Home Care", "Fresh Produce", "Bakery", "Frozen Foods",
    "Baby Care", "Electronics & Utilities"
  ];

  const warehouses = ["HYD-01", "HYD-02", "SEC-01"];
  const stockStatuses = ["Healthy", "Low Stock", "Critical", "Out of Stock", "Overstocked"];

  const loadInventory = () => {
    setLoading(true);
    api.getInventory({
      search: search || undefined,
      category: category || undefined,
      stock_status: stockStatus || undefined,
      warehouse: warehouse || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      limit
    })
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, [page, limit, category, stockStatus, warehouse, sortBy, sortDir]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadInventory();
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    if (!items.length) return;
    const headers = [
      "Product_ID", "Product_Name", "Brand", "Category", "Current_Stock",
      "Reserved_Stock", "Incoming_Stock", "Inventory_Position", "Safety_Stock",
      "Reorder_Point", "Avg_Daily_Demand", "Days_of_Cover", "Warehouse", "Stock_Status", "Valuation_INR"
    ];
    const rows = items.map(i => [
      i.product_id, `"${i.product_name}"`, `"${i.brand}"`, `"${i.category}"`,
      i.current_stock, i.reserved_stock, i.incoming_stock, i.inventory_position,
      i.safety_stock, i.reorder_point, i.avg_daily_demand_30d, i.days_of_cover,
      i.warehouse_location, i.stock_status, i.inventory_value_inr
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RetailIQ_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, product name, brand or category..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </form>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={loadInventory}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Stock Status:</span>
            <select
              value={stockStatus}
              onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium"
            >
              <option value="">All Statuses</option>
              {stockStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Warehouse:</span>
            <select
              value={warehouse}
              onChange={(e) => { setWarehouse(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <span className="text-slate-400 text-xs ml-auto">
            Showing {items.length} of {total} SKUs
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] select-none">
              <tr>
                <th onClick={() => handleSort('product_id')} className="p-3.5 cursor-pointer hover:text-slate-900">
                  <div className="flex items-center gap-1">SKU {sortBy === 'product_id' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th onClick={() => handleSort('product_name')} className="p-3.5 cursor-pointer hover:text-slate-900">
                  <div className="flex items-center gap-1">Product Name {sortBy === 'product_name' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th onClick={() => handleSort('category')} className="p-3.5 cursor-pointer hover:text-slate-900">
                  <div className="flex items-center gap-1">Category {sortBy === 'category' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th onClick={() => handleSort('current_stock')} className="p-3.5 cursor-pointer hover:text-slate-900 text-right">
                  <div className="flex items-center justify-end gap-1">Physical Stock {sortBy === 'current_stock' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 text-right text-slate-400">Reserved</th>
                <th className="p-3.5 text-right text-slate-400">Incoming</th>
                <th onClick={() => handleSort('inventory_position')} className="p-3.5 cursor-pointer hover:text-slate-900 text-right">
                  <div className="flex items-center justify-end gap-1">Inv. Position {sortBy === 'inventory_position' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 text-right text-slate-500">Safety</th>
                <th onClick={() => handleSort('reorder_point')} className="p-3.5 cursor-pointer hover:text-slate-900 text-right">
                  <div className="flex items-center justify-end gap-1">ROP {sortBy === 'reorder_point' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 text-right text-slate-500">Avg Demand</th>
                <th onClick={() => handleSort('days_of_cover')} className="p-3.5 cursor-pointer hover:text-slate-900 text-right">
                  <div className="flex items-center justify-end gap-1">Days Cover {sortBy === 'days_of_cover' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5">WH</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((i) => (
                <tr
                  key={i.product_id}
                  className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectProduct(i.product_id)}
                >
                  <td className="p-3.5 font-mono font-bold text-blue-600">{i.product_id}</td>
                  <td className="p-3.5 font-bold text-slate-900">
                    <div>
                      {i.product_name}
                      <span className="block text-[11px] font-normal text-slate-500">{i.brand}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-600">{i.category}</td>
                  <td className="p-3.5 text-right font-extrabold text-slate-900">
                    {i.current_stock.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right text-amber-600 font-medium">
                    {i.reserved_stock > 0 ? `-${i.reserved_stock}` : '0'}
                  </td>
                  <td className="p-3.5 text-right text-blue-600 font-medium">
                    {i.incoming_stock > 0 ? `+${i.incoming_stock}` : '0'}
                  </td>
                  <td className="p-3.5 text-right font-black text-slate-900 bg-slate-50/50">
                    {i.inventory_position.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right text-slate-500">{i.safety_stock}</td>
                  <td className="p-3.5 text-right font-bold text-slate-700">{i.reorder_point}</td>
                  <td className="p-3.5 text-right text-slate-600">{i.avg_daily_demand_30d.toFixed(1)}/d</td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    <span className={i.days_of_cover < 3 ? 'text-rose-600 font-black' : i.days_of_cover < 7 ? 'text-amber-600' : 'text-slate-800'}>
                      {i.days_of_cover.toFixed(1)}d
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500">{i.warehouse_location}</td>
                  <td className="p-3.5 text-center">
                    <StockBadge status={i.stock_status} size="sm" />
                  </td>
                  <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectProduct(i.product_id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Inspect SKU details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} SKUs
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold"
            >
              Previous
            </button>

            <span className="px-3 py-1 font-bold text-slate-700">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

