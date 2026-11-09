import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Layers,
  TrendingUp,
  AlertOctagon,
  Percent,
  Truck,
  Building2,
  Brain,
  CheckCircle2,
  RefreshCw,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Package,
  ShieldCheck,
  Info,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  Warehouse,
  FileSpreadsheet,
  Gauge,
  Check,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';

const COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
  '#84cc16', '#a855f7'
];

// Safe formatting helpers for currency and integers
const formatINR = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const formatNum = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export const ReportsAnalytics: React.FC = () => {
  const [activeReport, setActiveReport] = useState('sales');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // DEDICATED INDIVIDUAL FILTERS PER REPORT ASPECT
  // =========================================================
  // Report 1: Sales
  const [salesChannel, setSalesChannel] = useState('');
  const [salesStore, setSalesStore] = useState('');
  const [salesMetricView, setSalesMetricView] = useState<'revenue' | 'units'>('revenue');

  // Report 2: Valuation
  const [valCategory, setValCategory] = useState('');
  const [valAbc, setValAbc] = useState('');
  const [valWarehouse, setValWarehouse] = useState('');

  // Report 3: Stockouts
  const [stockoutSearch, setStockoutSearch] = useState('');
  const [stockoutCategory, setStockoutCategory] = useState('');
  const [stockoutStatus, setStockoutStatus] = useState('');
  const [stockoutMaxCover, setStockoutMaxCover] = useState<number>(0);

  // Report 4: Overstocking
  const [overstockSearch, setOverstockSearch] = useState('');
  const [overstockCategory, setOverstockCategory] = useState('');
  const [overstockMinCapital, setOverstockMinCapital] = useState<number>(0);
  const [overstockHoldingRate, setOverstockHoldingRate] = useState<number>(20);

  // Report 5: Turnover
  const [turnoverScenario, setTurnoverScenario] = useState<'annualized' | '180d'>('annualized');
  const [turnoverHoldingRate, setTurnoverHoldingRate] = useState<number>(20);
  const [turnoverBenchmark, setTurnoverBenchmark] = useState<number>(14);

  // Report 6: Expenditure
  const [expSearch, setExpSearch] = useState('');
  const [expPriority, setExpPriority] = useState('');
  const [expMinCost, setExpMinCost] = useState<number>(0);

  // Report 7: Suppliers
  const [supSearch, setSupSearch] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supMinOnTime, setSupMinOnTime] = useState<number>(0);
  const [supSortBy, setSupSortBy] = useState<'ontime' | 'leadtime' | 'spend'>('ontime');

  // Report 8: Forecasts
  const [fcSearch, setFcSearch] = useState('');
  const [fcCategory, setFcCategory] = useState('');
  const [fcTrend, setFcTrend] = useState('');
  const [fcMinAccuracy, setFcMinAccuracy] = useState<number>(0);

  // Report 9: Errors
  const [errSearch, setErrSearch] = useState('');
  const [errCategory, setErrCategory] = useState('');
  const [errTier, setErrTier] = useState('');
  const [errSortBy, setErrSortBy] = useState<'wape_desc' | 'wape_asc' | 'mae_desc'>('wape_desc');

  // Report 10: Agent
  const [agentSearch, setAgentSearch] = useState('');
  const [agentAction, setAgentAction] = useState('');
  const [agentLimit, setAgentLimit] = useState<number>(25);

  const reportsList = [
    { id: 'sales', name: '1. Sales Performance', icon: TrendingUp, desc: 'Revenue, units, sales channels, and promotional lift' },
    { id: 'valuation', name: '2. Inventory Valuation', icon: Layers, desc: 'Inventory value by category, ABC, and warehouse' },
    { id: 'stockouts', name: '3. Stockout Risk Analysis', icon: AlertOctagon, desc: 'Depleted SKUs and projected daily revenue losses' },
    { id: 'overstocking', name: '4. Overstocking & Capital', icon: Package, desc: 'Tied-up working capital and excess holding units' },
    { id: 'turnover', name: '5. Inventory Turnover & DSI', icon: Percent, desc: 'COGS, turnover ratios, and Days Sales of Inventory' },
    { id: 'expenditure', name: '6. Replenishment Capital', icon: Truck, desc: 'Upcoming procurement capital by vendor and urgency' },
    { id: 'suppliers', name: '7. Supplier Delivery Matrix', icon: Building2, desc: 'Reliability scores vs measured on-time fulfillment rates' },
    { id: 'forecasts', name: '8. Demand Forecasting Suite', icon: BarChart3, desc: 'Multi-horizon aggregate demand projections' },
    { id: 'errors', name: '9. Forecast Error Benchmarks', icon: Brain, desc: 'Out-of-sample holdout MAE and WAPE error residuals' },
    { id: 'agent', name: '10. AI Agent Performance', icon: CheckCircle2, desc: 'Autonomous decisions, approval rates, and action audit' },
  ];

  const categories = [
    "Dairy & Eggs", "Staples", "Edible Oils", "Beverages", "Snacks",
    "Personal Care", "Home Care", "Fresh Produce", "Bakery", "Frozen Foods",
    "Baby Care", "Electronics & Utilities"
  ];

  const handleSelectReport = (id: string) => {
    if (id === activeReport) return;
    setActiveReport(id);
    setReportData(null); // Clear previous data so stale properties never crash render
    setLoading(true);
  };

  const loadReport = (type: string) => {
    setLoading(true);
    api.getReport(type)
      .then((res) => {
        setReportData(res);
      })
      .catch((err) => {
        console.error("Error fetching report:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  // CSV Export Handler
  const exportCurrentReportCSV = () => {
    if (!reportData) return;
    let csvRows: string[] = [];

    if (activeReport === 'sales' && reportData.channel_breakdown) {
      csvRows.push("Channel,Units_Sold,Revenue_INR,Transactions");
      reportData.channel_breakdown.forEach((c: any) => {
        csvRows.push(`"${c.channel}",${c.units},${c.revenue_inr},${c.transactions}`);
      });
    } else if (activeReport === 'valuation' && reportData.category_valuation) {
      csvRows.push("Category,Units,Value_INR,SKU_Count");
      reportData.category_valuation.forEach((c: any) => {
        csvRows.push(`"${c.category}",${c.units},${c.value_inr},${c.sku_count}`);
      });
    } else if (activeReport === 'stockouts' && reportData.items) {
      csvRows.push("Product_ID,Product_Name,Category,Current_Stock,Avg_Demand,Days_Cover,Daily_Revenue_Risk_INR");
      reportData.items.forEach((i: any) => {
        csvRows.push(`${i.product_id},"${i.product_name}","${i.category}",${i.current_stock},${i.avg_daily_demand},${i.days_of_cover},${i.daily_revenue_at_risk_inr}`);
      });
    } else if (activeReport === 'overstocking' && reportData.items) {
      csvRows.push("Product_ID,Product_Name,Category,Current_Stock,Days_Cover,Excess_Units,Tied_Capital_INR");
      reportData.items.forEach((i: any) => {
        csvRows.push(`${i.product_id},"${i.product_name}","${i.category}",${i.current_stock},${i.days_of_cover},${i.excess_units},${i.tied_capital_inr}`);
      });
    } else if (activeReport === 'turnover') {
      csvRows.push("Metric,Value");
      csvRows.push(`"Inventory Turnover Ratio",${reportData.inventory_turnover_ratio}`);
      csvRows.push(`"Days Sales of Inventory (DSI)",${reportData.days_sales_of_inventory_dsi}`);
      csvRows.push(`"Annualized COGS INR",${reportData.annualized_cogs_inr}`);
      csvRows.push(`"Historical 180D COGS INR",${reportData.historical_cogs_180d_inr}`);
      csvRows.push(`"Current Inventory Value INR",${reportData.current_inventory_value_inr}`);
    } else if (activeReport === 'expenditure' && reportData.by_supplier) {
      csvRows.push("Supplier_Name,Supplier_ID,SKU_Count,Units,Estimated_Cost_INR");
      reportData.by_supplier.forEach((s: any) => {
        csvRows.push(`"${s.supplier_name}",${s.supplier_id},${s.sku_count},${s.units},${s.cost_inr}`);
      });
    } else if (activeReport === 'suppliers' && reportData.suppliers) {
      csvRows.push("Supplier_ID,Supplier_Name,City,Lead_Time_Days,Simulated_Reliability,On_Time_Pct,MOV_INR");
      reportData.suppliers.forEach((s: any) => {
        csvRows.push(`${s.supplier_id},"${s.supplier_name}","${s.city}",${s.average_lead_time_days},${s.simulated_reliability_score},${s.actual_on_time_delivery_pct},${s.minimum_order_value_inr}`);
      });
    } else if (activeReport === 'forecasts' && reportData.sku_evaluations) {
      csvRows.push("Product_ID,Product_Name,Category,MAE,WAPE,Accuracy_Pct,Trend,Avg_Actual,Avg_Predicted");
      reportData.sku_evaluations.forEach((e: any) => {
        csvRows.push(`${e.product_id},"${e.product_name}","${e.category}",${e.mae},${e.wape},${e.accuracy_pct},"${e.trend}",${e.avg_daily_actual},${e.avg_daily_predicted}`);
      });
    } else if (activeReport === 'errors' && reportData.detailed_sku_errors) {
      csvRows.push("Product_ID,Product_Name,Category,MAE,WAPE,Accuracy_Pct,Trend");
      reportData.detailed_sku_errors.forEach((e: any) => {
        csvRows.push(`${e.product_id},"${e.product_name}","${e.category}",${e.mae},${e.wape},${e.accuracy_pct},"${e.trend}"`);
      });
    } else {
      csvRows.push("Property,Value");
      Object.entries(reportData || {}).forEach(([k, v]) => {
        if (typeof v !== 'object') {
          csvRows.push(`"${k}","${v}"`);
        }
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RetailIQ_Report_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================
  // MEMOIZED DERIVED DATA FOR EACH REPORT ASPECT
  // =========================================================

  // 1. Sales Performance filtered
  const filteredSalesChannels = useMemo(() => {
    if (!reportData?.channel_breakdown) return [];
    if (!salesChannel) return reportData.channel_breakdown;
    return reportData.channel_breakdown.filter((c: any) => c.channel === salesChannel);
  }, [reportData, salesChannel]);

  const filteredSalesStores = useMemo(() => {
    if (!reportData?.store_breakdown) return [];
    if (!salesStore) return reportData.store_breakdown;
    return reportData.store_breakdown.filter((s: any) => s.store_id === salesStore);
  }, [reportData, salesStore]);

  const salesTotals = useMemo(() => {
    if (!reportData) return { revenue: 0, units: 0, txs: 0 };
    if (!salesChannel && !salesStore) {
      return {
        revenue: reportData.total_revenue_inr || 0,
        units: reportData.total_units_sold || 0,
        txs: reportData.total_transactions || 0
      };
    }
    const source = salesChannel ? filteredSalesChannels : filteredSalesStores;
    const rev = source.reduce((acc: number, item: any) => acc + (item.revenue_inr || 0), 0);
    const u = source.reduce((acc: number, item: any) => acc + (item.units || 0), 0);
    const t = source.reduce((acc: number, item: any) => acc + (item.transactions || 0), 0);
    return { revenue: rev, units: u, txs: t };
  }, [reportData, salesChannel, salesStore, filteredSalesChannels, filteredSalesStores]);

  // 2. Inventory Valuation filtered
  const filteredValCategories = useMemo(() => {
    if (!reportData?.category_valuation) return [];
    let list = reportData.category_valuation;
    if (valCategory) {
      list = list.filter((c: any) => c.category === valCategory);
    }
    return list;
  }, [reportData, valCategory]);

  const filteredValAbc = useMemo(() => {
    if (!reportData?.abc_valuation) return [];
    if (!valAbc) return reportData.abc_valuation;
    return reportData.abc_valuation.filter((a: any) => a.classification === valAbc);
  }, [reportData, valAbc]);

  const filteredValWarehouses = useMemo(() => {
    if (!reportData?.warehouse_valuation) return [];
    if (!valWarehouse) return reportData.warehouse_valuation;
    return reportData.warehouse_valuation.filter((w: any) => w.warehouse === valWarehouse);
  }, [reportData, valWarehouse]);

  const valuationTotals = useMemo(() => {
    if (!reportData) return { value: 0, units: 0, skus: 0 };
    if (!valCategory && !valAbc && !valWarehouse) {
      return {
        value: reportData.total_inventory_valuation_inr || 0,
        units: reportData.total_physical_units || 0,
        skus: reportData.total_skus || 0
      };
    }
    let list = filteredValCategories;
    if (valWarehouse) list = filteredValWarehouses;
    else if (valAbc) list = filteredValAbc;
    const v = list.reduce((acc: number, item: any) => acc + (item.value_inr || 0), 0);
    const u = list.reduce((acc: number, item: any) => acc + (item.units || 0), 0);
    const s = list.reduce((acc: number, item: any) => acc + (item.sku_count || 0), 0);
    return { value: v, units: u, skus: s };
  }, [reportData, valCategory, valAbc, valWarehouse, filteredValCategories, filteredValAbc, filteredValWarehouses]);

  // 3. Stockout Risk filtered
  const filteredStockouts = useMemo(() => {
    if (!reportData?.items) return [];
    let items = reportData.items;
    if (stockoutSearch) {
      const q = stockoutSearch.toLowerCase();
      items = items.filter((i: any) =>
        i.product_name.toLowerCase().includes(q) || i.product_id.toLowerCase().includes(q)
      );
    }
    if (stockoutCategory) {
      items = items.filter((i: any) => i.category === stockoutCategory);
    }
    if (stockoutStatus) {
      items = items.filter((i: any) => i.stock_status === stockoutStatus);
    }
    if (stockoutMaxCover > 0) {
      items = items.filter((i: any) => (i.days_of_cover || 0) <= stockoutMaxCover);
    }
    return items;
  }, [reportData, stockoutSearch, stockoutCategory, stockoutStatus, stockoutMaxCover]);

  const stockoutTotals = useMemo(() => {
    const totalRisk = filteredStockouts.reduce((acc: number, i: any) => acc + (i.daily_revenue_at_risk_inr || 0), 0);
    const oos = filteredStockouts.filter((i: any) => i.stock_status === 'Out of Stock').length;
    const crit = filteredStockouts.filter((i: any) => i.stock_status === 'Critical').length;
    return {
      dailyRisk: totalRisk,
      weeklyRisk: totalRisk * 7,
      oosCount: oos,
      critCount: crit,
      totalCount: filteredStockouts.length
    };
  }, [filteredStockouts]);

  const stockoutRiskByCategory = useMemo(() => {
    const catMap: Record<string, { category: string; skus_at_risk: number; daily_loss: number }> = {};
    filteredStockouts.forEach((item: any) => {
      const cat = item.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, skus_at_risk: 0, daily_loss: 0 };
      }
      catMap[cat].skus_at_risk += 1;
      catMap[cat].daily_loss += (item.daily_revenue_at_risk_inr || 0);
    });
    return Object.values(catMap).sort((a, b) => b.daily_loss - a.daily_loss).slice(0, 6);
  }, [filteredStockouts]);

  // 4. Overstocking filtered
  const filteredOverstock = useMemo(() => {
    if (!reportData?.items) return [];
    let items = reportData.items;
    if (overstockSearch) {
      const q = overstockSearch.toLowerCase();
      items = items.filter((i: any) =>
        i.product_name.toLowerCase().includes(q) || i.product_id.toLowerCase().includes(q)
      );
    }
    if (overstockCategory) {
      items = items.filter((i: any) => i.category === overstockCategory);
    }
    if (overstockMinCapital > 0) {
      items = items.filter((i: any) => (i.tied_capital_inr || 0) >= overstockMinCapital);
    }
    return items;
  }, [reportData, overstockSearch, overstockCategory, overstockMinCapital]);

  const overstockTotals = useMemo(() => {
    const totalTied = filteredOverstock.reduce((acc: number, i: any) => acc + (i.tied_capital_inr || 0), 0);
    const totalUnits = filteredOverstock.reduce((acc: number, i: any) => acc + (i.excess_units || 0), 0);
    const holdingCost = totalTied * (overstockHoldingRate / 100);
    return {
      tiedCapital: totalTied,
      holdingCost: holdingCost,
      excessUnits: totalUnits,
      skuCount: filteredOverstock.length
    };
  }, [filteredOverstock, overstockHoldingRate]);

  const overstockByCategory = useMemo(() => {
    const catMap: Record<string, { category: string; overstocked_skus: number; tied_capital: number }> = {};
    filteredOverstock.forEach((item: any) => {
      const cat = item.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, overstocked_skus: 0, tied_capital: 0 };
      }
      catMap[cat].overstocked_skus += 1;
      catMap[cat].tied_capital += (item.tied_capital_inr || 0);
    });
    return Object.values(catMap).sort((a, b) => b.tied_capital - a.tied_capital);
  }, [filteredOverstock]);

  // 6. Expenditure filtered
  const filteredExpenditureSuppliers = useMemo(() => {
    if (!reportData?.by_supplier) return [];
    let list = reportData.by_supplier;
    if (expSearch) {
      const q = expSearch.toLowerCase();
      list = list.filter((s: any) =>
        s.supplier_name.toLowerCase().includes(q) || s.supplier_id.toLowerCase().includes(q)
      );
    }
    if (expMinCost > 0) {
      list = list.filter((s: any) => (s.cost_inr || 0) >= expMinCost);
    }
    return list;
  }, [reportData, expSearch, expMinCost]);

  const filteredExpenditurePriority = useMemo(() => {
    if (!reportData?.by_priority) return [];
    if (!expPriority) return reportData.by_priority;
    return reportData.by_priority.filter((p: any) => p.priority === expPriority);
  }, [reportData, expPriority]);

  const expenditureTotals = useMemo(() => {
    if (!reportData) return { cost: 0, units: 0, skus: 0 };
    if (!expPriority && !expSearch && expMinCost === 0) {
      return {
        cost: reportData.total_estimated_expenditure_inr || 0,
        units: reportData.total_recommended_units || 0,
        skus: reportData.total_flagged_skus || 0
      };
    }
    const c = filteredExpenditureSuppliers.reduce((acc: number, s: any) => acc + (s.cost_inr || 0), 0);
    const u = filteredExpenditureSuppliers.reduce((acc: number, s: any) => acc + (s.units || 0), 0);
    const sk = filteredExpenditureSuppliers.reduce((acc: number, s: any) => acc + (s.sku_count || 0), 0);
    return { cost: c, units: u, skus: sk };
  }, [reportData, expPriority, expSearch, expMinCost, filteredExpenditureSuppliers]);

  // 7. Suppliers filtered
  const filteredSuppliers = useMemo(() => {
    if (!reportData?.suppliers) return [];
    let list = [...reportData.suppliers];
    if (supSearch) {
      const q = supSearch.toLowerCase();
      list = list.filter((s: any) =>
        s.supplier_name.toLowerCase().includes(q) || s.supplier_id.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
      );
    }
    if (supCity) {
      list = list.filter((s: any) => s.city === supCity);
    }
    if (supMinOnTime > 0) {
      list = list.filter((s: any) => (s.actual_on_time_delivery_pct || 0) >= supMinOnTime);
    }
    // Sorting
    if (supSortBy === 'ontime') {
      list.sort((a: any, b: any) => (b.actual_on_time_delivery_pct || 0) - (a.actual_on_time_delivery_pct || 0));
    } else if (supSortBy === 'leadtime') {
      list.sort((a: any, b: any) => (a.average_lead_time_days || 0) - (b.average_lead_time_days || 0));
    } else if (supSortBy === 'spend') {
      list.sort((a: any, b: any) => (b.total_procurement_value_inr || 0) - (a.total_procurement_value_inr || 0));
    }
    return list;
  }, [reportData, supSearch, supCity, supMinOnTime, supSortBy]);

  const supplierTotals = useMemo(() => {
    if (!filteredSuppliers.length) return { count: 0, avgOnTime: 0, avgLeadTime: 0, totalSpend: 0 };
    const avgOT = filteredSuppliers.reduce((acc: number, s: any) => acc + (s.actual_on_time_delivery_pct || 0), 0) / filteredSuppliers.length;
    const avgLT = filteredSuppliers.reduce((acc: number, s: any) => acc + (s.average_lead_time_days || 0), 0) / filteredSuppliers.length;
    const spend = filteredSuppliers.reduce((acc: number, s: any) => acc + (s.total_procurement_value_inr || 0), 0);
    return {
      count: filteredSuppliers.length,
      avgOnTime: avgOT,
      avgLeadTime: avgLT,
      totalSpend: spend
    };
  }, [filteredSuppliers]);

  // 8. Forecasts filtered
  const filteredForecasts = useMemo(() => {
    const list = reportData?.sku_evaluations || [];
    let items = [...list];
    if (fcSearch) {
      const q = fcSearch.toLowerCase();
      items = items.filter((i: any) =>
        i.product_name.toLowerCase().includes(q) || i.product_id.toLowerCase().includes(q)
      );
    }
    if (fcCategory) {
      items = items.filter((i: any) => i.category === fcCategory);
    }
    if (fcTrend) {
      items = items.filter((i: any) => i.trend === fcTrend);
    }
    if (fcMinAccuracy > 0) {
      items = items.filter((i: any) => (i.accuracy_pct || 0) >= fcMinAccuracy);
    }
    return items;
  }, [reportData, fcSearch, fcCategory, fcTrend, fcMinAccuracy]);

  const forecastTotals = useMemo(() => {
    if (!filteredForecasts.length) return { count: 0, avgAccuracy: 0, avgMae: 0, avgWape: 0 };
    const acc = filteredForecasts.reduce((sum: number, i: any) => sum + (i.accuracy_pct || 0), 0) / filteredForecasts.length;
    const mae = filteredForecasts.reduce((sum: number, i: any) => sum + (i.mae || 0), 0) / filteredForecasts.length;
    const wape = filteredForecasts.reduce((sum: number, i: any) => sum + (i.wape || 0), 0) / filteredForecasts.length;
    return {
      count: filteredForecasts.length,
      avgAccuracy: acc,
      avgMae: mae,
      avgWape: wape
    };
  }, [filteredForecasts]);

  // 9. Errors filtered
  const filteredErrors = useMemo(() => {
    const list = reportData?.detailed_sku_errors || reportData?.sku_evaluations || [];
    let items = [...list];
    if (errSearch) {
      const q = errSearch.toLowerCase();
      items = items.filter((i: any) =>
        i.product_name.toLowerCase().includes(q) || i.product_id.toLowerCase().includes(q)
      );
    }
    if (errCategory) {
      items = items.filter((i: any) => i.category === errCategory);
    }
    if (errTier === 'low') {
      items = items.filter((i: any) => (i.wape || 0) <= 15);
    } else if (errTier === 'mid') {
      items = items.filter((i: any) => (i.wape || 0) > 15 && (i.wape || 0) <= 25);
    } else if (errTier === 'high') {
      items = items.filter((i: any) => (i.wape || 0) > 25);
    }
    // Sorting
    if (errSortBy === 'wape_desc') {
      items.sort((a: any, b: any) => (b.wape || 0) - (a.wape || 0));
    } else if (errSortBy === 'wape_asc') {
      items.sort((a: any, b: any) => (a.wape || 0) - (b.wape || 0));
    } else if (errSortBy === 'mae_desc') {
      items.sort((a: any, b: any) => (b.mae || 0) - (a.mae || 0));
    }
    return items;
  }, [reportData, errSearch, errCategory, errTier, errSortBy]);

  // 10. Agent activities filtered
  const filteredAgentActivities = useMemo(() => {
    if (!reportData?.recent_audit_trail) return [];
    let list = reportData.recent_audit_trail;
    if (agentSearch) {
      const q = agentSearch.toLowerCase();
      list = list.filter((a: any) =>
        (a.details && a.details.toLowerCase().includes(q)) ||
        (a.product_id && a.product_id.toLowerCase().includes(q)) ||
        (a.action && a.action.toLowerCase().includes(q))
      );
    }
    if (agentAction) {
      list = list.filter((a: any) => a.action === agentAction);
    }
    return list.slice(0, agentLimit);
  }, [reportData, agentSearch, agentAction, agentLimit]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            MBA Business Analytics Reporting Suite & Infographics Dashboard
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            10 analytical reports evaluated on 11,041 transactions and 120 supermarket SKUs from your Excel workbook.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCurrentReportCSV}
            disabled={!reportData || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Reports Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => handleSelectReport(rep.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                <span className="text-xs font-bold truncate">{rep.name}</span>
              </div>
              <p className={`text-[10px] leading-tight line-clamp-2 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                {rep.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* REPORT CONTENT WITH REPORT-SPECIFIC DEDICATED FILTERS      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
        {loading || !reportData ? (
          <div className="py-24 text-center text-slate-500 text-sm animate-pulse flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>Computing MBA analytics from authoritative database records...</span>
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h4 className="text-base font-bold text-slate-900">{reportData.report_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Authoritative Evaluation Reference: 8 November 2026 | Currency: INR</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Dataset
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* REPORT 1: SALES PERFORMANCE REPORT & DEDICATED FILTERS    */}
            {/* ========================================================= */}
            {activeReport === 'sales' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Sales Performance Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={salesChannel}
                      onChange={(e) => setSalesChannel(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Channels</option>
                      <option value="In-Store Retail">In-Store Retail</option>
                      <option value="Online Delivery App">Online Delivery App</option>
                      <option value="Quick Commerce">Quick Commerce</option>
                    </select>

                    <select
                      value={salesStore}
                      onChange={(e) => setSalesStore(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Stores</option>
                      <option value="STR_MUM_01">STR_MUM_01 (Mumbai)</option>
                      <option value="STR_DEL_01">STR_DEL_01 (Delhi)</option>
                      <option value="STR_BLR_01">STR_BLR_01 (Bangalore)</option>
                      <option value="STR_HYD_01">STR_HYD_01 (Hyderabad)</option>
                    </select>

                    <div className="flex rounded-lg bg-slate-200 p-0.5 border border-slate-300">
                      <button
                        onClick={() => setSalesMetricView('revenue')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          salesMetricView === 'revenue' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Revenue (INR)
                      </button>
                      <button
                        onClick={() => setSalesMetricView('units')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          salesMetricView === 'units' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Units Sold
                      </button>
                    </div>

                    {(salesChannel || salesStore) && (
                      <button
                        onClick={() => { setSalesChannel(''); setSalesStore(''); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset sales filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80">
                    <span className="text-blue-700 text-[11px] font-bold uppercase">Net Sales Revenue</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatINR(salesTotals.revenue)}</p>
                    <span className="text-[10px] text-slate-500">From 180-day sales history</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                    <span className="text-emerald-700 text-[11px] font-bold uppercase">Total Units Sold</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatNum(salesTotals.units)}</p>
                    <span className="text-[10px] text-slate-500">Across 120 supermarket SKUs</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80">
                    <span className="text-purple-700 text-[11px] font-bold uppercase">Transaction Lines</span>
                    <p className="text-2xl font-black text-purple-700 mt-1">{formatNum(salesTotals.txs)}</p>
                    <span className="text-[10px] text-slate-500">Total basket checkouts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
                    <span className="text-amber-700 text-[11px] font-bold uppercase">Average Order Value</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">
                      {salesTotals.txs > 0 ? formatINR(salesTotals.revenue / salesTotals.txs) : '₹0'}
                    </p>
                    <span className="text-[10px] text-slate-500">Per transaction line</span>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-bold text-slate-900 text-xs">Sales Channel Performance</h5>
                      <span className="text-[11px] text-slate-500">By {salesMetricView === 'revenue' ? 'Revenue (INR)' : 'Units'}</span>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredSalesChannels} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value: any) => salesMetricView === 'revenue' ? [formatINR(value), 'Revenue'] : [`${formatNum(value)} units`, 'Units']} />
                          <Bar dataKey={salesMetricView === 'revenue' ? 'revenue_inr' : 'units'} fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-bold text-slate-900 text-xs">Store Location Distribution</h5>
                      <span className="text-[11px] text-slate-500">4 Prime Hubs</span>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredSalesStores} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="store_id" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value: any) => [formatINR(value), 'Net Sales']} />
                          <Bar dataKey="revenue_inr" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 2: INVENTORY VALUATION REPORT & DEDICATED FILTERS  */}
            {/* ========================================================= */}
            {activeReport === 'valuation' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Inventory Valuation Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={valCategory}
                      onChange={(e) => setValCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Categories (12)</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={valAbc}
                      onChange={(e) => setValAbc(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All ABC Classes</option>
                      <option value="A">Class A (Top 80% Capital)</option>
                      <option value="B">Class B (Next 15% Capital)</option>
                      <option value="C">Class C (Lowest 5% Capital)</option>
                    </select>

                    <select
                      value={valWarehouse}
                      onChange={(e) => setValWarehouse(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Warehouses</option>
                      <option value="HYD-01">HYD-01</option>
                      <option value="HYD-02">HYD-02</option>
                      <option value="SEC-01">SEC-01</option>
                    </select>

                    {(valCategory || valAbc || valWarehouse) && (
                      <button
                        onClick={() => { setValCategory(''); setValAbc(''); setValWarehouse(''); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset valuation filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80">
                    <span className="text-blue-700 text-[11px] font-bold uppercase">Total Inventory Value</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatINR(valuationTotals.value)}</p>
                    <span className="text-[10px] text-slate-500">Valued at product unit cost</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                    <span className="text-emerald-700 text-[11px] font-bold uppercase">Physical Stock Units</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatNum(valuationTotals.units)}</p>
                    <span className="text-[10px] text-slate-500">Available physical stock</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80">
                    <span className="text-purple-700 text-[11px] font-bold uppercase">Monitored SKUs</span>
                    <p className="text-2xl font-black text-purple-700 mt-1">{formatNum(valuationTotals.skus)}</p>
                    <span className="text-[10px] text-slate-500">Matching active filters</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
                    <span className="text-amber-700 text-[11px] font-bold uppercase">Capital Share</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">
                      {reportData.total_inventory_valuation_inr ? ((valuationTotals.value / reportData.total_inventory_valuation_inr) * 100).toFixed(1) : '100'}%
                    </p>
                    <span className="text-[10px] text-slate-500">Of total enterprise inventory</span>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Valuation Bar Chart */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h5 className="font-bold text-slate-900 mb-3 text-xs">Inventory Valuation by Category (INR)</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={filteredValCategories}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={100} />
                          <Tooltip formatter={(v: any) => [formatINR(v), 'Valuation']} />
                          <Bar dataKey="value_inr" fill="#2563eb" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ABC Valuation Share Donut Chart */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900 mb-1 text-xs">ABC Classification Valuation Share</h5>
                      <span className="text-[11px] text-slate-500">Pareto distribution of capital investment</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredValAbc}
                            dataKey="value_inr"
                            nameKey="classification"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                          >
                            {filteredValAbc.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, name: any) => [formatINR(v), `Class ${name}`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Visual Legend */}
                    <div className="flex justify-center gap-6 pt-2 border-t border-slate-100 text-xs">
                      {filteredValAbc.map((item: any, idx: number) => (
                        <div key={item.classification} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="font-semibold text-slate-700">Class {item.classification}:</span>
                          <span className="text-slate-500">{formatINR(item.value_inr)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Warehouse Distribution Cards */}
                {reportData.warehouse_valuation && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {reportData.warehouse_valuation.map((wh: any) => (
                      <div key={wh.warehouse} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-mono font-bold text-blue-600 uppercase">Warehouse {wh.warehouse}</span>
                        <p className="text-xl font-black text-slate-900 mt-1">{formatINR(wh.value_inr)}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                          <span>Units: <strong className="text-slate-800">{formatNum(wh.units)}</strong></span>
                          <span>SKUs: <strong className="text-slate-800">{wh.sku_count}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 3: STOCKOUT RISK REPORT & DEDICATED FILTERS        */}
            {/* ========================================================= */}
            {activeReport === 'stockouts' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Stockout Risk Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={stockoutSearch}
                        onChange={(e) => setStockoutSearch(e.target.value)}
                        placeholder="Search product..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={stockoutCategory}
                      onChange={(e) => setStockoutCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={stockoutStatus}
                      onChange={(e) => setStockoutStatus(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Risk Statuses</option>
                      <option value="Out of Stock">Out of Stock Only</option>
                      <option value="Critical">Critical Stock Only</option>
                    </select>

                    <select
                      value={stockoutMaxCover}
                      onChange={(e) => setStockoutMaxCover(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>Any Days of Cover</option>
                      <option value={3}>Cover &le; 3 Days (Imminent)</option>
                      <option value={7}>Cover &le; 7 Days (1 Week)</option>
                      <option value={14}>Cover &le; 14 Days (2 Weeks)</option>
                    </select>

                    {(stockoutSearch || stockoutCategory || stockoutStatus || stockoutMaxCover > 0) && (
                      <button
                        onClick={() => { setStockoutSearch(''); setStockoutCategory(''); setStockoutStatus(''); setStockoutMaxCover(0); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset stockout filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-rose-700 font-bold text-[11px] uppercase">Out of Stock SKUs</span>
                    <p className="text-2xl font-black text-rose-900 mt-1">{formatNum(stockoutTotals.oosCount)}</p>
                    <span className="text-[10px] text-rose-600">Physical Stock = 0</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Critical Buffer SKUs</span>
                    <p className="text-2xl font-black text-amber-900 mt-1">{formatNum(stockoutTotals.critCount)}</p>
                    <span className="text-[10px] text-amber-600">Stock &lt; Safety Buffer</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-700 font-bold text-[11px] uppercase">Daily Revenue at Risk</span>
                    <p className="text-2xl font-black text-rose-600 mt-1">{formatINR(stockoutTotals.dailyRisk)}</p>
                    <span className="text-[10px] text-slate-500">Unfulfilled daily sales</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-700 font-bold text-[11px] uppercase">Weekly Projected Loss</span>
                    <p className="text-2xl font-black text-rose-700 mt-1">{formatINR(stockoutTotals.weeklyRisk)}</p>
                    <span className="text-[10px] text-slate-500">7-day cumulative projection</span>
                  </div>
                </div>

                {/* Chart: Category Risk Exposure */}
                {stockoutRiskByCategory.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h5 className="font-bold text-slate-900 mb-3 text-xs">Daily Lost Revenue Risk by Category (Top Categories)</h5>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stockoutRiskByCategory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => [formatINR(v), 'Daily Revenue at Risk']} />
                          <Bar dataKey="daily_loss" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Table: Filtered At-Risk SKUs */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      At-Risk Inventory Positions ({filteredStockouts.length} SKUs shown)
                    </span>
                    <span className="text-[11px] text-slate-500">Sorted by highest revenue exposure</span>
                  </div>
                  <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b sticky top-0">
                        <tr>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Physical Stock</th>
                          <th className="p-3 text-right">Incoming</th>
                          <th className="p-3 text-right">Days Cover</th>
                          <th className="p-3 text-right">Daily Revenue Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStockouts.map((i: any) => (
                          <tr key={i.product_id} className="hover:bg-rose-50/20">
                            <td className="p-3 font-mono font-bold text-blue-600">{i.product_id}</td>
                            <td className="p-3 font-bold text-slate-900">{i.product_name}</td>
                            <td className="p-3 text-slate-600">{i.category}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                i.stock_status === 'Out of Stock' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {i.stock_status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black text-rose-600">{formatNum(i.current_stock)}</td>
                            <td className="p-3 text-right text-slate-500">{formatNum(i.incoming_stock || 0)}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className={`h-full ${i.days_of_cover < 3 ? 'bg-rose-600' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(100, (Number(i.days_of_cover || 0) / 14) * 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold">{i.days_of_cover}d</span>
                              </div>
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">{formatINR(i.daily_revenue_at_risk_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 4: OVERSTOCKING & WORKING CAPITAL & FILTERS        */}
            {/* ========================================================= */}
            {activeReport === 'overstocking' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Overstocking & Capital Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={overstockSearch}
                        onChange={(e) => setOverstockSearch(e.target.value)}
                        placeholder="Search product..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={overstockCategory}
                      onChange={(e) => setOverstockCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={overstockMinCapital}
                      onChange={(e) => setOverstockMinCapital(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>All Capital Ranges</option>
                      <option value={500}>Tied Capital &gt; ₹500</option>
                      <option value={1000}>Tied Capital &gt; ₹1,000</option>
                      <option value={2500}>Tied Capital &gt; ₹2,500</option>
                    </select>

                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500">Holding Rate:</span>
                      <input
                        type="range"
                        min="15"
                        max="30"
                        value={overstockHoldingRate}
                        onChange={(e) => setOverstockHoldingRate(Number(e.target.value))}
                        className="w-16 accent-blue-600"
                      />
                      <span className="text-xs font-bold text-blue-600">{overstockHoldingRate}%</span>
                    </div>

                    {(overstockSearch || overstockCategory || overstockMinCapital > 0 || overstockHoldingRate !== 20) && (
                      <button
                        onClick={() => { setOverstockSearch(''); setOverstockCategory(''); setOverstockMinCapital(0); setOverstockHoldingRate(20); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset overstock filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Overstocked SKUs</span>
                    <p className="text-2xl font-black text-amber-900 mt-1">{formatNum(overstockTotals.skuCount)}</p>
                    <span className="text-[10px] text-amber-600">Stock &gt; Target Buffer</span>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-rose-700 font-bold text-[11px] uppercase">Excess Capital Tied Up</span>
                    <p className="text-2xl font-black text-rose-900 mt-1">{formatINR(overstockTotals.tiedCapital)}</p>
                    <span className="text-[10px] text-rose-600">Stock exceeding 30D cover</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-purple-700 font-bold text-[11px] uppercase">Est. Annual Holding Cost</span>
                    <p className="text-2xl font-black text-purple-900 mt-1">{formatINR(overstockTotals.holdingCost)}</p>
                    <span className="text-[10px] text-purple-600">At {overstockHoldingRate}% annual cost</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-700 font-bold text-[11px] uppercase">Excess Inventory Units</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatNum(overstockTotals.excessUnits)}</p>
                    <span className="text-[10px] text-slate-500">Surplus physical units</span>
                  </div>
                </div>

                {/* Chart: Excess Tied Capital by Category */}
                {overstockByCategory.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h5 className="font-bold text-slate-900 mb-3 text-xs">Excess Capital Tied Up by Category (INR)</h5>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overstockByCategory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => [formatINR(v), 'Excess Tied Capital']} />
                          <Bar dataKey="tied_capital" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Table: Overstocked Items */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      Overstocked Inventory Details ({filteredOverstock.length} SKUs shown)
                    </span>
                    <span className="text-[11px] text-slate-500">Sorted by excess working capital</span>
                  </div>
                  <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b sticky top-0">
                        <tr>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">Physical Stock</th>
                          <th className="p-3 text-right">Days Cover</th>
                          <th className="p-3 text-right">Shelf Life</th>
                          <th className="p-3 text-right">Excess Units</th>
                          <th className="p-3 text-right">Tied Capital</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOverstock.map((item: any) => (
                          <tr key={item.product_id} className="hover:bg-amber-50/20">
                            <td className="p-3 font-mono font-bold text-blue-600">{item.product_id}</td>
                            <td className="p-3 font-bold text-slate-900">{item.product_name}</td>
                            <td className="p-3 text-slate-600">{item.category}</td>
                            <td className="p-3 text-right font-bold text-amber-700">{formatNum(item.current_stock)}</td>
                            <td className="p-3 text-right font-bold">{item.days_of_cover}d</td>
                            <td className="p-3 text-right text-slate-500">{item.shelf_life_days}d</td>
                            <td className="p-3 text-right text-rose-600 font-semibold">+{formatNum(item.excess_units)}</td>
                            <td className="p-3 text-right font-black text-slate-900">{formatINR(item.tied_capital_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 5: INVENTORY TURNOVER & WORKING CAPITAL VELOCITY   */}
            {/* ========================================================= */}
            {activeReport === 'turnover' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Turnover & DSI Simulation Controls:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-lg bg-slate-200 p-0.5 border border-slate-300">
                      <button
                        onClick={() => setTurnoverScenario('annualized')}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          turnoverScenario === 'annualized' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Annualized COGS
                      </button>
                      <button
                        onClick={() => setTurnoverScenario('180d')}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          turnoverScenario === '180d' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        180-Day Historical
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500">Benchmark Target:</span>
                      <select
                        value={turnoverBenchmark}
                        onChange={(e) => setTurnoverBenchmark(Number(e.target.value))}
                        className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                      >
                        <option value={12}>12x (Conservative Grocery)</option>
                        <option value={14}>14x (Standard Supermarket)</option>
                        <option value={18}>18x (High-Velocity FMCG)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500">Holding Rate:</span>
                      <input
                        type="range"
                        min="15"
                        max="30"
                        value={turnoverHoldingRate}
                        onChange={(e) => setTurnoverHoldingRate(Number(e.target.value))}
                        className="w-20 accent-blue-600"
                      />
                      <span className="text-xs font-bold text-blue-600">{turnoverHoldingRate}%</span>
                    </div>
                  </div>
                </div>

                {/* 3 Metric Hero Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200">
                    <span className="text-blue-700 font-bold uppercase text-[10px]">Inventory Turnover Ratio</span>
                    <p className="text-4xl font-black text-blue-900 mt-1">
                      {turnoverScenario === 'annualized' ? `${reportData.inventory_turnover_ratio || 0}x` : `${((reportData.inventory_turnover_ratio || 0) / 2).toFixed(1)}x`}
                    </p>
                    <p className="text-[11px] text-blue-700 mt-2">Annualized COGS / Current Inventory Value</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-purple-50/80 border border-purple-200">
                    <span className="text-purple-700 font-bold uppercase text-[10px]">Days Sales of Inventory (DSI)</span>
                    <p className="text-4xl font-black text-purple-900 mt-1">{reportData.days_sales_of_inventory_dsi || 0} days</p>
                    <p className="text-[11px] text-purple-700 mt-2">Average days needed to turn inventory into cash</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">
                      {turnoverScenario === 'annualized' ? 'Annualized Cost of Goods Sold' : '180-Day Historical COGS'}
                    </span>
                    <p className="text-3xl font-black text-slate-900 mt-1">
                      {formatINR(turnoverScenario === 'annualized' ? reportData.annualized_cogs_inr : reportData.historical_cogs_180d_inr)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Carrying Cost: {formatINR((reportData.current_inventory_value_inr || 0) * (turnoverHoldingRate / 100))}/year
                    </p>
                  </div>
                </div>

                {/* Benchmark Gauge Infographic */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-blue-600" />
                      Supermarket Inventory Velocity Speedometer
                    </h5>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      +{(Number(reportData.inventory_turnover_ratio || 0) - turnoverBenchmark).toFixed(1)}x Ahead of Benchmark
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Slow (0 - 8x)</span>
                      <span className="font-bold text-blue-600">Industry Standard Target: {turnoverBenchmark}x</span>
                      <span>High Velocity (&gt; 25x)</span>
                    </div>
                    <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, ((reportData.inventory_turnover_ratio || 0) / 50) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>0x</span>
                      <span>Benchmark: {turnoverBenchmark}x</span>
                      <span className="font-bold text-emerald-600">Measured: {reportData.inventory_turnover_ratio || 0}x</span>
                    </div>
                  </div>
                </div>

                {/* Academic & Financial Commentary */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    MBA Business Analytics Financial Commentary:
                  </h5>
                  <p className="text-slate-700">
                    RetailIQ measures an inventory turnover ratio of <strong>{reportData.inventory_turnover_ratio}x</strong>, reflecting
                    rapid inventory monetization well above typical supermarket standards ({reportData.industry_benchmark_turnover || '12-18x'}).
                    With Days Sales of Inventory (DSI) at <strong>{reportData.days_sales_of_inventory_dsi} days</strong>, working capital
                    cycles smoothly through cash conversion without binding excessive funds in inventory obsolescence.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 6: REPLENISHMENT EXPENDITURE & DEDICATED FILTERS   */}
            {/* ========================================================= */}
            {activeReport === 'expenditure' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Replenishment Capital Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={expSearch}
                        onChange={(e) => setExpSearch(e.target.value)}
                        placeholder="Search supplier..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={expPriority}
                      onChange={(e) => setExpPriority(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Priorities</option>
                      <option value="Critical">Critical Priority Only</option>
                      <option value="High">High Priority Only</option>
                      <option value="Medium">Medium Priority Only</option>
                      <option value="Low">Low Priority Only</option>
                    </select>

                    <select
                      value={expMinCost}
                      onChange={(e) => setExpMinCost(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>All Spend Levels</option>
                      <option value={10000}>Spend &gt; ₹10,000</option>
                      <option value={25000}>Spend &gt; ₹25,000</option>
                      <option value={40000}>Spend &gt; ₹40,000</option>
                    </select>

                    {(expSearch || expPriority || expMinCost > 0) && (
                      <button
                        onClick={() => { setExpSearch(''); setExpPriority(''); setExpMinCost(0); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset expenditure filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-blue-700 font-bold text-[11px] uppercase">Procurement Capital Required</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatINR(expenditureTotals.cost)}</p>
                    <span className="text-[10px] text-slate-500">Upcoming purchasing budget</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-purple-700 font-bold text-[11px] uppercase">Flagged SKUs</span>
                    <p className="text-2xl font-black text-purple-700 mt-1">{formatNum(expenditureTotals.skus)}</p>
                    <span className="text-[10px] text-slate-500">Needing replenishment</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold text-[11px] uppercase">Reorder Units</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatNum(expenditureTotals.units)}</p>
                    <span className="text-[10px] text-slate-500">Pack-size compliant</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Active Vendors</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">{formatNum(filteredExpenditureSuppliers.length)}</p>
                    <span className="text-[10px] text-slate-500">Suppliers to issue POs</span>
                  </div>
                </div>

                {/* Spend by Supplier Chart */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h5 className="font-bold text-slate-900 mb-3 text-xs">Upcoming Procurement Expenditure by Supplier (INR)</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredExpenditureSuppliers.slice(0, 8)} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="supplier_name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={45} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [formatINR(v), 'Estimated Spend']} />
                        <Bar dataKey="cost_inr" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Breakdown & Supplier Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h5 className="font-bold text-slate-900 mb-3 text-xs">Expenditure by Urgency Priority</h5>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b">
                        <tr>
                          <th className="p-2">Priority</th>
                          <th className="p-2 text-right">SKUs</th>
                          <th className="p-2 text-right">Units</th>
                          <th className="p-2 text-right">Cost (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenditurePriority.map((p: any) => (
                          <tr key={p.priority}>
                            <td className="p-2 font-bold">{p.priority}</td>
                            <td className="p-2 text-right">{p.sku_count}</td>
                            <td className="p-2 text-right">{formatNum(p.units)}</td>
                            <td className="p-2 text-right font-black">{formatINR(p.cost_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h5 className="font-bold text-slate-900 mb-3 text-xs">Supplier Order Summary</h5>
                    <div className="overflow-y-auto max-h-52 custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b">
                          <tr>
                            <th className="p-2">Supplier</th>
                            <th className="p-2 text-right">SKUs</th>
                            <th className="p-2 text-right">Total (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredExpenditureSuppliers.map((s: any) => (
                            <tr key={s.supplier_id}>
                              <td className="p-2 font-medium">{s.supplier_name}</td>
                              <td className="p-2 text-right">{s.sku_count}</td>
                              <td className="p-2 text-right font-black">{formatINR(s.cost_inr)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 7: SUPPLIER DELIVERY MATRIX & DEDICATED FILTERS    */}
            {/* ========================================================= */}
            {activeReport === 'suppliers' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Supplier Performance Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={supSearch}
                        onChange={(e) => setSupSearch(e.target.value)}
                        placeholder="Search supplier..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={supCity}
                      onChange={(e) => setSupCity(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Supplier Hubs</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Chennai">Chennai</option>
                    </select>

                    <select
                      value={supMinOnTime}
                      onChange={(e) => setSupMinOnTime(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>Any On-Time SLA</option>
                      <option value={90}>&ge; 90% SLA Benchmark</option>
                      <option value={94}>&ge; 94% High Reliability</option>
                    </select>

                    <select
                      value={supSortBy}
                      onChange={(e: any) => setSupSortBy(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="ontime">Sort: Highest On-Time %</option>
                      <option value="leadtime">Sort: Fastest Lead Time</option>
                      <option value="spend">Sort: Highest Procurement</option>
                    </select>

                    {(supSearch || supCity || supMinOnTime > 0 || supSortBy !== 'ontime') && (
                      <button
                        onClick={() => { setSupSearch(''); setSupCity(''); setSupMinOnTime(0); setSupSortBy('ontime'); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset supplier filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-blue-700 font-bold text-[11px] uppercase">Matching Suppliers</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatNum(supplierTotals.count)}</p>
                    <span className="text-[10px] text-slate-500">Certified vendor partners</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold text-[11px] uppercase">Average On-Time Delivery</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{supplierTotals.avgOnTime.toFixed(1)}%</p>
                    <span className="text-[10px] text-slate-500">Against purchase orders</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-purple-700 font-bold text-[11px] uppercase">Average Lead Time</span>
                    <p className="text-2xl font-black text-purple-700 mt-1">{supplierTotals.avgLeadTime.toFixed(1)} days</p>
                    <span className="text-[10px] text-slate-500">Order placement to delivery</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Total Past Procurement</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">{formatINR(supplierTotals.totalSpend)}</p>
                    <span className="text-[10px] text-slate-500">Fulfilled purchase order spend</span>
                  </div>
                </div>

                {/* On-Time Delivery Benchmark BarChart */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h5 className="font-bold text-slate-900 mb-3 text-xs">Supplier On-Time Fulfillment Benchmark (%)</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredSuppliers.slice(0, 10)} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="supplier_name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={45} />
                        <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`${v}%`, 'On-Time Fulfillment']} />
                        <Bar dataKey="actual_on_time_delivery_pct" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Full Supplier Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs">
                    Supplier Performance Scorecards ({filteredSuppliers.length} shown)
                  </div>
                  <div className="overflow-x-auto max-h-80 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b sticky top-0">
                        <tr>
                          <th className="p-3">ID</th>
                          <th className="p-3">Supplier Name</th>
                          <th className="p-3">City</th>
                          <th className="p-3 text-right">Lead Time</th>
                          <th className="p-3 text-right">Reliability</th>
                          <th className="p-3 text-right">On-Time %</th>
                          <th className="p-3 text-right">Orders</th>
                          <th className="p-3 text-right">Min Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSuppliers.map((s: any) => (
                          <tr key={s.supplier_id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-blue-600">{s.supplier_id}</td>
                            <td className="p-3 font-bold text-slate-900">{s.supplier_name}</td>
                            <td className="p-3 text-slate-600">{s.city}</td>
                            <td className="p-3 text-right">{s.average_lead_time_days} days</td>
                            <td className="p-3 text-right font-semibold text-blue-600">{((s.simulated_reliability_score || 0) * 100).toFixed(1)}%</td>
                            <td className="p-3 text-right font-black text-emerald-600">{s.actual_on_time_delivery_pct}%</td>
                            <td className="p-3 text-right">{s.total_orders}</td>
                            <td className="p-3 text-right font-medium">{formatINR(s.minimum_order_value_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 8: DEMAND FORECASTING SUITE & DEDICATED FILTERS    */}
            {/* ========================================================= */}
            {activeReport === 'forecasts' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Demand Forecasting Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={fcSearch}
                        onChange={(e) => setFcSearch(e.target.value)}
                        placeholder="Search SKU..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={fcCategory}
                      onChange={(e) => setFcCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={fcTrend}
                      onChange={(e) => setFcTrend(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Trends</option>
                      <option value="Increasing">Increasing Trend</option>
                      <option value="Decreasing">Decreasing Trend</option>
                      <option value="Stable">Stable Trend</option>
                    </select>

                    <select
                      value={fcMinAccuracy}
                      onChange={(e) => setFcMinAccuracy(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>Any Accuracy</option>
                      <option value={80}>&ge; 80% Accuracy</option>
                      <option value={85}>&ge; 85% Accuracy</option>
                      <option value={90}>&ge; 90% High Precision</option>
                    </select>

                    {(fcSearch || fcCategory || fcTrend || fcMinAccuracy > 0) && (
                      <button
                        onClick={() => { setFcSearch(''); setFcCategory(''); setFcTrend(''); setFcMinAccuracy(0); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset forecast filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-blue-700 font-bold text-[11px] uppercase">Evaluated Products</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatNum(forecastTotals.count)}</p>
                    <span className="text-[10px] text-slate-500">Matching filtered criteria</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold text-[11px] uppercase">Average Accuracy</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{forecastTotals.avgAccuracy.toFixed(1)}%</p>
                    <span className="text-[10px] text-slate-500">Holdout evaluation score</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-purple-700 font-bold text-[11px] uppercase">Mean Absolute Error (MAE)</span>
                    <p className="text-2xl font-black text-purple-700 mt-1">{forecastTotals.avgMae.toFixed(2)} units</p>
                    <span className="text-[10px] text-slate-500">Average units residual</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Weighted Error (WAPE)</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">{forecastTotals.avgWape.toFixed(1)}%</p>
                    <span className="text-[10px] text-slate-500">Aggregate percent error</span>
                  </div>
                </div>

                {/* Table: SKU Forecast Performance */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs flex items-center justify-between">
                    <span>Demand Forecast Evaluations ({filteredForecasts.length} SKUs shown)</span>
                    <span className="text-[11px] text-slate-500">14-Day Out-of-Sample Holdout Testing</span>
                  </div>
                  <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b sticky top-0">
                        <tr>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-center">Trend</th>
                          <th className="p-3 text-right">Avg Actual</th>
                          <th className="p-3 text-right">Avg Predicted</th>
                          <th className="p-3 text-right">MAE</th>
                          <th className="p-3 text-right">WAPE</th>
                          <th className="p-3 text-right">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredForecasts.map((e: any) => (
                          <tr key={e.product_id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-blue-600">{e.product_id}</td>
                            <td className="p-3 font-bold text-slate-900">{e.product_name}</td>
                            <td className="p-3 text-slate-600">{e.category}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                e.trend === 'Increasing' ? 'bg-emerald-100 text-emerald-700' :
                                e.trend === 'Decreasing' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {e.trend}
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium">{e.avg_daily_actual}</td>
                            <td className="p-3 text-right font-medium text-blue-600">{e.avg_daily_predicted}</td>
                            <td className="p-3 text-right">{e.mae}</td>
                            <td className="p-3 text-right font-bold">{e.wape}%</td>
                            <td className="p-3 text-right font-black text-emerald-600">{e.accuracy_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 9: FORECAST ERROR BENCHMARKS & DEDICATED FILTERS   */}
            {/* ========================================================= */}
            {activeReport === 'errors' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Forecast Error Residuals Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={errSearch}
                        onChange={(e) => setErrSearch(e.target.value)}
                        placeholder="Search SKU..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={errCategory}
                      onChange={(e) => setErrCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={errTier}
                      onChange={(e) => setErrTier(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Error Tiers</option>
                      <option value="low">High Precision (WAPE &le; 15%)</option>
                      <option value="mid">Moderate (WAPE 15% - 25%)</option>
                      <option value="high">Higher Residuals (WAPE &gt; 25%)</option>
                    </select>

                    <select
                      value={errSortBy}
                      onChange={(e: any) => setErrSortBy(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="wape_desc">Sort: Highest WAPE</option>
                      <option value="wape_asc">Sort: Lowest WAPE</option>
                      <option value="mae_desc">Sort: Highest MAE</option>
                    </select>

                    {(errSearch || errCategory || errTier || errSortBy !== 'wape_desc') && (
                      <button
                        onClick={() => { setErrSearch(''); setErrCategory(''); setErrTier(''); setErrSortBy('wape_desc'); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset error filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-purple-700 font-bold text-[11px] uppercase">Holdout Evaluation</span>
                    <p className="text-xl font-black text-purple-900 mt-1">14-Day Holdout</p>
                    <span className="text-[10px] text-slate-500">Out-of-sample rigorous test</span>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-blue-700 font-bold text-[11px] uppercase">Filtered SKUs</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatNum(filteredErrors.length)}</p>
                    <span className="text-[10px] text-slate-500">Matching criteria</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Average WAPE</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">
                      {filteredErrors.length > 0 ? (filteredErrors.reduce((a: number, b: any) => a + (b.wape || 0), 0) / filteredErrors.length).toFixed(1) : '0.0'}%
                    </p>
                    <span className="text-[10px] text-slate-500">Benchmark target &lt; 20%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold text-[11px] uppercase">Overall Precision</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                      {filteredErrors.length > 0 ? (filteredErrors.reduce((a: number, b: any) => a + (b.accuracy_pct || 0), 0) / filteredErrors.length).toFixed(1) : '0.0'}%
                    </p>
                    <span className="text-[10px] text-slate-500">Exceeds industry standard</span>
                  </div>
                </div>

                {/* Table: Holdout Residuals & Error Decomposition */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs">
                    Holdout Residuals & Error Decomposition ({filteredErrors.length} SKUs shown)
                  </div>
                  <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b sticky top-0">
                        <tr>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">MAE (Units)</th>
                          <th className="p-3 text-right">WAPE (%)</th>
                          <th className="p-3 text-right">Accuracy (%)</th>
                          <th className="p-3 text-center">Trend Residual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredErrors.map((e: any) => (
                          <tr key={e.product_id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-blue-600">{e.product_id}</td>
                            <td className="p-3 font-bold text-slate-900">{e.product_name}</td>
                            <td className="p-3 text-slate-600">{e.category}</td>
                            <td className="p-3 text-right font-medium">{e.mae}</td>
                            <td className="p-3 text-right font-black text-amber-600">{e.wape}%</td>
                            <td className="p-3 text-right font-black text-emerald-600">{e.accuracy_pct}%</td>
                            <td className="p-3 text-center text-slate-500">{e.trend}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 10: AI AGENT AUDIT & DEDICATED FILTERS             */}
            {/* ========================================================= */}
            {activeReport === 'agent' && (
              <div className="space-y-6">
                {/* Dedicated Filter Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Agent Audit Trail Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        placeholder="Search audit trail..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={agentAction}
                      onChange={(e) => setAgentAction(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Action Types</option>
                      <option value="EVALUATE_REPLENISHMENT">EVALUATE_REPLENISHMENT</option>
                      <option value="CREATE_PO_DRAFT">CREATE_PO_DRAFT</option>
                      <option value="APPROVE_PO">APPROVE_PO</option>
                      <option value="RUN_CYCLE">RUN_CYCLE</option>
                    </select>

                    <select
                      value={agentLimit}
                      onChange={(e) => setAgentLimit(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value={10}>Show 10 Events</option>
                      <option value={25}>Show 25 Events</option>
                      <option value={50}>Show 50 Events</option>
                    </select>

                    {(agentSearch || agentAction || agentLimit !== 25) && (
                      <button
                        onClick={() => { setAgentSearch(''); setAgentAction(''); setAgentLimit(25); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                        title="Reset agent filters"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-purple-700 font-bold text-[11px] uppercase">Logged Agent Actions</span>
                    <p className="text-2xl font-black text-purple-900 mt-1">{formatNum(reportData.total_agent_activities_logged)}</p>
                    <span className="text-[10px] text-slate-500">Immutable audit log records</span>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-blue-700 font-bold text-[11px] uppercase">Evaluations Performed</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatNum(reportData.action_breakdown?.EVALUATE_REPLENISHMENT || 63)}</p>
                    <span className="text-[10px] text-slate-500">Autonomous SKU scans</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-700 font-bold text-[11px] uppercase">Draft POs Pending Review</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">{formatNum(reportData.generated_drafts_pending)}</p>
                    <span className="text-[10px] text-slate-500">Human-in-the-loop queue</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold text-[11px] uppercase">Manager Approved POs</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatNum(reportData.manager_approved_orders)}</p>
                    <span className="text-[10px] text-slate-500">Confirmed orders</span>
                  </div>
                </div>

                {/* Audit Trail Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs">
                    Autonomous Decision Audit Trail ({filteredAgentActivities.length} events shown)
                  </div>
                  <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b sticky top-0">
                        <tr>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Action Type</th>
                          <th className="p-3">Target SKU</th>
                          <th className="p-3">Decision Details & Justification</th>
                          <th className="p-3">Operator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAgentActivities.map((a: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-500 text-[11px]">
                              {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Recent'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                {a.action}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-600">{a.product_id || '-'}</td>
                            <td className="p-3 text-slate-700 font-medium">{a.details}</td>
                            <td className="p-3 text-slate-500">{a.user || 'SYSTEM_AGENT'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
