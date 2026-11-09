import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  PackageCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { PurchaseOrder } from '../types';

interface Props {
  onSelectProduct: (productId: string) => void;
}

export const PurchaseOrders: React.FC<Props> = ({ onSelectProduct }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Manual Draft Modal State
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [draftProduct, setDraftProduct] = useState('');
  const [draftQty, setDraftQty] = useState(24);
  const [draftNotes, setDraftNotes] = useState('Manual procurement order created by inventory manager');

  const loadOrders = () => {
    setLoading(true);
    api.getPurchaseOrders({
      status: statusFilter || undefined,
      supplier_id: supplierFilter || undefined,
      search: search || undefined
    })
      .then((res) => setOrders(res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.getSuppliers().then(setSuppliers);
    api.getProducts().then(setProductsList);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, supplierFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleApprove = async (poId: string) => {
    try {
      const res = await api.approvePurchaseOrder(poId);
      setActionMessage(res.message);
      loadOrders();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleReject = async (poId: string) => {
    try {
      const res = await api.rejectPurchaseOrder(poId);
      setActionMessage(res.message);
      loadOrders();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleReceive = async (poId: string) => {
    try {
      const res = await api.receivePurchaseOrder(poId);
      setActionMessage(res.message);
      loadOrders();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateManualDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftProduct || draftQty <= 0) return;

    try {
      const res = await api.createPurchaseOrderDraft({
        product_id: draftProduct,
        quantity: draftQty,
        notes: draftNotes
      });
      setActionMessage(res.message);
      setShowDraftModal(false);
      loadOrders();
    } catch (err: any) {
      alert(`Error creating draft: ${err.message}`);
    }
  };

  const exportCSV = () => {
    if (!orders.length) return;
    const headers = [
      "PO_ID", "Order_Date", "Product_ID", "Product_Name", "Supplier_ID",
      "Supplier_Name", "Order_Quantity", "Received_Quantity", "Unit_Cost_INR",
      "Total_Order_Value_INR", "Expected_Delivery", "Actual_Delivery", "PO_Status", "Is_Generated"
    ];
    const rows = orders.map(p => [
      p.po_id, p.order_date, p.product_id, `"${p.product_name}"`, p.supplier_id,
      `"${p.supplier_name}"`, p.order_quantity, p.received_quantity, p.unit_cost_inr,
      p.total_order_value_inr, p.expected_delivery_date, p.actual_delivery_date || "",
      p.po_status, p.is_generated ? "Yes" : "No"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RetailIQ_Purchase_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Transit':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Delayed':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
      case 'Draft':
        return 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Notification */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-blue-600 hover:text-blue-800 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Purchase Order Lifecycle Management
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              250 authoritative historical orders plus active AI-generated replenishment drafts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (productsList.length > 0) setDraftProduct(productsList[0].product_id);
                setShowDraftModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create PO Draft</span>
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

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO#, product, or supplier..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
            />
          </form>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                <option value="">All Statuses ({orders.length})</option>
                <option value="Draft">Draft Orders</option>
                <option value="Pending">Pending Delivery</option>
                <option value="In Transit">In Transit</option>
                <option value="Received">Received</option>
                <option value="Delayed">Delayed Orders</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Supplier:</span>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium max-w-[180px]"
              >
                <option value="">All Suppliers ({suppliers.length})</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-right">Order Qty</th>
                <th className="p-3.5 text-right">Unit Cost</th>
                <th className="p-3.5 text-right">Total Value</th>
                <th className="p-3.5">Order Date</th>
                <th className="p-3.5">Expected Delivery</th>
                <th className="p-3.5">Actual Delivery</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {orders.map((po) => (
                <tr key={po.po_id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-blue-600">
                    <div className="flex items-center gap-1.5">
                      <span>{po.po_id}</span>
                      {po.is_generated && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          AI Draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 block">{po.product_name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{po.product_id}</span>
                  </td>
                  <td className="p-3.5 text-slate-700">{po.supplier_name}</td>
                  <td className="p-3.5 text-right font-bold text-slate-900">{po.order_quantity}</td>
                  <td className="p-3.5 text-right text-slate-600">₹{po.unit_cost_inr.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-extrabold text-slate-900">
                    ₹{po.total_order_value_inr.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-slate-600">{po.order_date}</td>
                  <td className="p-3.5 text-slate-600">{po.expected_delivery_date}</td>
                  <td className="p-3.5 text-slate-600">
                    {po.actual_delivery_date || <span className="text-slate-400 italic">Pending</span>}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(po.po_status)}`}>
                      {po.po_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {po.po_status === 'Draft' && (
                        <>
                          <button
                            onClick={() => handleApprove(po.po_id)}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            title="Approve Order"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(po.po_id)}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                            title="Reject Draft"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {(po.po_status === 'Pending' || po.po_status === 'In Transit' || po.po_status === 'Delayed') && (
                        <button
                          onClick={() => handleReceive(po.po_id)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          title="Mark Received"
                        >
                          Receive
                        </button>
                      )}

                      <button
                        onClick={() => onSelectProduct(po.product_id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700"
                        title="View SKU"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual PO Draft Creation Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-400" />
                Create Purchase Order Draft
              </h4>
              <button onClick={() => setShowDraftModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualDraft} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Product SKU:</label>
                <select
                  value={draftProduct}
                  onChange={(e) => setDraftProduct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none"
                  required
                >
                  {productsList.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_id} — {p.product_name} (₹{p.unit_cost_inr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Order Quantity (Units):</label>
                <input
                  type="number"
                  min={1}
                  value={draftQty}
                  onChange={(e) => setDraftQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes & Procurement Justification:</label>
                <textarea
                  rows={2}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Create PO Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

