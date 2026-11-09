import {
  DashboardSummary,
  InventoryItem,
  Product,
  PurchaseOrder,
  Supplier,
  ForecastData,
  AgentActivity,
  ReplenishmentRecommendation,
  DatasetSummary
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Dataset
  getDatasetSummary: async (): Promise<DatasetSummary> => {
    const res = await fetch(`${API_BASE}/dataset/summary`);
    return res.json();
  },
  getValidationReportMarkdown: async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/dataset/validation-report`);
    const data = await res.json();
    return data.markdown || '';
  },
  reimportDataset: async (force: boolean = true) => {
    const res = await fetch(`${API_BASE}/dataset/reimport?force=${force}`, { method: 'POST' });
    return res.json();
  },

  // Dashboard
  getDashboardSummary: async (filters: {
    category?: string;
    warehouse?: string;
    supplier_id?: string;
    stock_status?: string;
  } = {}): Promise<DashboardSummary> => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.warehouse) params.append('warehouse', filters.warehouse);
    if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
    if (filters.stock_status) params.append('stock_status', filters.stock_status);

    const res = await fetch(`${API_BASE}/dashboard/summary?${params.toString()}`);
    return res.json();
  },

  // Inventory
  getInventory: async (params: {
    search?: string;
    category?: string;
    stock_status?: string;
    warehouse?: string;
    sort_by?: string;
    sort_dir?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    items: InventoryItem[];
  }> => {
    const sp = new URLSearchParams();
    if (params.search) sp.append('search', params.search);
    if (params.category) sp.append('category', params.category);
    if (params.stock_status) sp.append('stock_status', params.stock_status);
    if (params.warehouse) sp.append('warehouse', params.warehouse);
    if (params.sort_by) sp.append('sort_by', params.sort_by);
    if (params.sort_dir) sp.append('sort_dir', params.sort_dir);
    if (params.page) sp.append('page', params.page.toString());
    if (params.limit) sp.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/inventory?${sp.toString()}`);
    return res.json();
  },

  // Products
  getProducts: async (category?: string, search?: string): Promise<Product[]> => {
    const sp = new URLSearchParams();
    if (category) sp.append('category', category);
    if (search) sp.append('search', search);
    const res = await fetch(`${API_BASE}/products?${sp.toString()}`);
    return res.json();
  },
  getProductDetail: async (productId: string) => {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    return res.json();
  },

  // Sales
  getSalesTrend: async (granularity: 'daily' | 'weekly' | 'monthly' = 'daily', category?: string) => {
    const sp = new URLSearchParams({ granularity });
    if (category) sp.append('category', category);
    const res = await fetch(`${API_BASE}/sales?${sp.toString()}`);
    return res.json();
  },

  // Forecasts
  getForecasts: async (productId?: string, category?: string) => {
    const sp = new URLSearchParams();
    if (productId) sp.append('product_id', productId);
    if (category) sp.append('category', category);
    const res = await fetch(`${API_BASE}/forecasts?${sp.toString()}`);
    return res.json();
  },
  getForecastEvaluation: async () => {
    const res = await fetch(`${API_BASE}/forecasts/evaluation`);
    return res.json();
  },

  // AI Agent & Replenishment
  runAgentCycle: async (autoDraft: boolean = false) => {
    const res = await fetch(`${API_BASE}/agent/run?auto_draft=${autoDraft}`, { method: 'POST' });
    return res.json();
  },
  chatWithAgent: async (prompt: string) => {
    const res = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },
  getAgentActivity: async (limit: number = 50): Promise<AgentActivity[]> => {
    const res = await fetch(`${API_BASE}/agent/activity?limit=${limit}`);
    return res.json();
  },
  getReplenishmentRecommendations: async (filters: {
    priority?: string;
    category?: string;
    status?: string;
  } = {}): Promise<ReplenishmentRecommendation[]> => {
    const sp = new URLSearchParams();
    if (filters.priority) sp.append('priority', filters.priority);
    if (filters.category) sp.append('category', filters.category);
    if (filters.status) sp.append('status', filters.status);
    const res = await fetch(`${API_BASE}/replenishment/recommendations?${sp.toString()}`);
    return res.json();
  },

  // Purchase Orders
  getPurchaseOrders: async (filters: { status?: string; supplier_id?: string; search?: string } = {}): Promise<PurchaseOrder[]> => {
    const sp = new URLSearchParams();
    if (filters.status) sp.append('status', filters.status);
    if (filters.supplier_id) sp.append('supplier_id', filters.supplier_id);
    if (filters.search) sp.append('search', filters.search);
    const res = await fetch(`${API_BASE}/purchase-orders?${sp.toString()}`);
    return res.json();
  },
  createPurchaseOrderDraft: async (data: {
    product_id: string;
    quantity: number;
    supplier_id?: string;
    notes?: string;
  }) => {
    const res = await fetch(`${API_BASE}/purchase-orders/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  approvePurchaseOrder: async (poId: string) => {
    const res = await fetch(`${API_BASE}/purchase-orders/${poId}/approve`, { method: 'POST' });
    return res.json();
  },
  rejectPurchaseOrder: async (poId: string, reason?: string) => {
    const res = await fetch(`${API_BASE}/purchase-orders/${poId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Procurement deferred by inventory manager' })
    });
    return res.json();
  },
  receivePurchaseOrder: async (poId: string) => {
    const res = await fetch(`${API_BASE}/purchase-orders/${poId}/receive`, { method: 'POST' });
    return res.json();
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await fetch(`${API_BASE}/suppliers`);
    return res.json();
  },

  // Reports
  getReport: async (reportType: string) => {
    const res = await fetch(`${API_BASE}/reports/${reportType}`);
    return res.json();
  },

  // Make.com Integration
  getMakeComConfig: async () => {
    const res = await fetch(`${API_BASE}/integrations/makecom`);
    return res.json();
  },
  saveMakeComSettings: async (url: string) => {
    const res = await fetch(`${API_BASE}/integrations/makecom/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  },
  testMakeComWebhook: async (testUrl?: string) => {
    const res = await fetch(`${API_BASE}/integrations/makecom/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_url: testUrl })
    });
    return res.json();
  }
};

