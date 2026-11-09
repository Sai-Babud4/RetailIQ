export type StockStatus = 'Healthy' | 'Low Stock' | 'Critical' | 'Out of Stock' | 'Overstocked';
export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'No Action';
export type POStatus = 'Received' | 'In Transit' | 'Pending' | 'Delayed' | 'Cancelled' | 'Draft';

export interface Product {
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  subcategory: string;
  unit_of_measure: string;
  unit_cost_inr: number;
  selling_price_inr: number;
  primary_supplier_id: string;
  supplier_name?: string;
  minimum_order_quantity: number;
  pack_size: number;
  shelf_life_days: number;
  abc_classification: 'A' | 'B' | 'C';
  product_status: string;
}

export interface InventoryItem {
  inventory_id: string;
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  snapshot_date: string;
  current_stock: number;
  reserved_stock: number;
  incoming_stock: number;
  safety_stock: number;
  reorder_point: number;
  target_stock_days: number;
  avg_daily_demand_30d: number;
  inventory_position: number;
  days_of_cover: number;
  warehouse_location: string;
  last_updated: string;
  stock_status: StockStatus;
  unit_cost_inr: number;
  inventory_value_inr: number;
}

export interface SalesTransaction {
  transaction_id: string;
  transaction_date: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity_sold: number;
  unit_price_inr: number;
  discount_rate: number;
  net_sales_inr: number;
  sales_channel: string;
  store_id: string;
  promotion_flag: string;
}

export interface PurchaseOrder {
  po_id: string;
  order_date: string;
  product_id: string;
  product_name: string;
  category: string;
  supplier_id: string;
  supplier_name: string;
  order_quantity: number;
  received_quantity: number;
  unit_cost_inr: number;
  total_order_value_inr: number;
  expected_delivery_date: string;
  actual_delivery_date?: string | null;
  po_status: POStatus;
  is_generated: boolean;
  notes?: string;
}

export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  city: string;
  contact_email: string;
  contact_phone: string;
  average_lead_time_days: number;
  supplier_reliability: number;
  minimum_order_value_inr: number;
  payment_terms: string;
  supplier_status: string;
  total_orders_placed?: number;
  on_time_delivery_pct?: number;
}

export interface ForecastData {
  forecast_id: string;
  product_id: string;
  product_name: string;
  category: string;
  forecast_generated_for_date: string;
  forecast_horizon_days: number;
  predicted_demand_7_days: number;
  predicted_demand_14_days: number;
  predicted_demand_30_days: number;
  forecast_method: string;
  trend_adjustment: number;
  demand_trend: 'Increasing' | 'Decreasing' | 'Stable';
  generated_on: string;
}

export interface AgentActivity {
  activity_id: number;
  timestamp: string;
  product_id?: string | null;
  product_name?: string | null;
  action: string;
  reason: string;
  current_stock?: number | null;
  reorder_point?: number | null;
  recommended_quantity?: number | null;
  priority: PriorityLevel;
  decision_status: string;
  details?: string | null;
}

export interface ReplenishmentRecommendation {
  id: number;
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  inventory_position: number;
  daily_demand: number;
  forecast_demand: number;
  lead_time: number;
  reorder_point: number;
  target_stock: number;
  recommended_quantity: number;
  preferred_supplier_id: string;
  supplier_name: string;
  unit_cost_inr: number;
  estimated_cost_inr: number;
  priority: PriorityLevel;
  ai_explanation: string;
  calculation_steps?: string;
  status: 'Pending' | 'Drafted' | 'Approved' | 'Rejected';
  last_evaluated_at: string;
}

export interface DashboardSummary {
  kpis: {
    total_products: number;
    total_sales_revenue_inr: number;
    total_units_sold: number;
    total_inventory_value_inr: number;
    total_inventory_units: number;
    low_stock_products: number;
    critical_stock_products: number;
    out_of_stock_products: number;
    overstocked_products: number;
    healthy_products: number;
    pending_purchase_orders: number;
    replenishment_recommendations: number;
  };
  stock_health: Array<{ status: StockStatus; count: number; color: string }>;
  category_distribution: Array<{ category: string; stock: number; value_inr: number; sku_count: number }>;
  top_products_by_units: Array<{ product_id: string; product_name: string; category: string; units_sold: number; revenue: number }>;
  top_products_by_revenue: Array<{ product_id: string; product_name: string; category: string; units_sold: number; revenue: number }>;
  slow_moving_products: Array<{ product_id: string; product_name: string; category: string; units_sold: number }>;
  recent_alerts: AgentActivity[];
  recent_purchase_orders: PurchaseOrder[];
}

export interface DatasetSummary {
  workbook_name: string;
  snapshot_date: string;
  historical_period: string;
  import_timestamp: string;
  total_records: number;
  sheet_counts: Record<string, number>;
  currency: string;
  validation_status: string;
}

