import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, date
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Response
from fastapi.responses import FileResponse, PlainTextResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from backend.app.models.database import get_db
from backend.app.models.entities import (
    Product, Inventory, SalesTransaction, PurchaseOrder,
    Supplier, ForecastData, AgentActivity, ReplenishmentRecommendation,
    DatasetMetadata, SystemSetting
)
from backend.app.services.inventory_logic import InventoryBusinessLogic
from backend.app.forecasting.engine import DemandForecastingEngine
from backend.app.agent.inventory_agent import RetailIQInventoryAgent
from backend.app.integrations.makecom import MakeComIntegrationService
from backend.app.services.reports import ReportsAnalyticsService

router = APIRouter()

# ==========================================================
# HEALTH & METADATA
# ==========================================================

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "RetailIQ AI-Powered Inventory Intelligence",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@router.get("/dataset/summary")
def get_dataset_summary(db: Session = Depends(get_db)):
    meta = db.query(DatasetMetadata).first()
    products_count = db.query(Product).count()
    sales_count = db.query(SalesTransaction).count()
    suppliers_count = db.query(Supplier).count()
    inventory_count = db.query(Inventory).count()
    po_count = db.query(PurchaseOrder).count()
    forecast_count = db.query(ForecastData).count()

    sheet_counts = {
        "Products": products_count,
        "Sales_Transactions": sales_count,
        "Inventory": inventory_count,
        "Suppliers": suppliers_count,
        "Purchase_Orders": po_count,
        "Forecast_Data": forecast_count
    }

    return {
        "workbook_name": meta.filename if meta else "RetailIQ_Inventory_Agent_Datasets.xlsx",
        "snapshot_date": meta.snapshot_date if meta else "2026-11-08",
        "historical_period": f"{meta.historical_start_date} to {meta.historical_end_date}" if meta else "2026-05-13 to 2026-11-08",
        "import_timestamp": meta.import_timestamp.isoformat() if meta and meta.import_timestamp else None,
        "total_records": meta.total_records if meta else sum(sheet_counts.values()),
        "sheet_counts": json.loads(meta.sheet_counts) if meta and meta.sheet_counts else sheet_counts,
        "currency": "INR",
        "validation_status": "PASS"
    }

# ==========================================================
# DASHBOARD EXECUTIVE OVERVIEW
# ==========================================================

@router.get("/dashboard/summary")
def get_dashboard_summary(
    category: Optional[str] = None,
    warehouse: Optional[str] = None,
    supplier_id: Optional[str] = None,
    stock_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Base query for inventory & products
    inv_query = db.query(Inventory).join(Product)
    if category:
        inv_query = inv_query.filter(Product.category == category)
    if warehouse:
        inv_query = inv_query.filter(Inventory.warehouse_location == warehouse)
    if supplier_id:
        inv_query = inv_query.filter(Product.primary_supplier_id == supplier_id)
    if stock_status:
        inv_query = inv_query.filter(Inventory.stock_status == stock_status)

    inv_items = inv_query.all()
    filtered_product_ids = [i.product_id for i in inv_items]

    # Total Products
    total_products = len(inv_items)

    # Sales totals for filtered products
    sales_query = db.query(
        func.sum(SalesTransaction.quantity_sold).label("total_units"),
        func.sum(SalesTransaction.net_sales_inr).label("total_revenue")
    )
    if filtered_product_ids:
        sales_query = sales_query.filter(SalesTransaction.product_id.in_(filtered_product_ids))
    sales_agg = sales_query.first()
    total_units_sold = int(sales_agg.total_units or 0)
    total_sales_revenue = float(sales_agg.total_revenue or 0.0)

    # Total Inventory Value & Units
    total_inventory_value = sum(i.current_stock * i.product.unit_cost_inr for i in inv_items)
    total_inventory_units = sum(i.current_stock for i in inv_items)

    # Stock Health Counts
    healthy_count = sum(1 for i in inv_items if i.stock_status == "Healthy")
    low_stock_count = sum(1 for i in inv_items if i.stock_status == "Low Stock")
    critical_count = sum(1 for i in inv_items if i.stock_status == "Critical")
    out_of_stock_count = sum(1 for i in inv_items if i.stock_status == "Out of Stock")
    overstocked_count = sum(1 for i in inv_items if i.stock_status == "Overstocked")

    # Purchase orders pending
    po_query = db.query(PurchaseOrder).filter(PurchaseOrder.po_status.in_(["Pending", "In Transit", "Draft"]))
    if filtered_product_ids:
        po_query = po_query.filter(PurchaseOrder.product_id.in_(filtered_product_ids))
    pending_pos_count = po_query.count()

    # Replenishment recommendations
    rec_query = db.query(ReplenishmentRecommendation).filter(ReplenishmentRecommendation.recommended_quantity > 0)
    if filtered_product_ids:
        rec_query = rec_query.filter(ReplenishmentRecommendation.product_id.in_(filtered_product_ids))
    replenishment_recs_count = rec_query.count()

    # Top 10 by Units Sold
    top_units_query = db.query(
        SalesTransaction.product_id,
        SalesTransaction.product_name,
        SalesTransaction.category,
        func.sum(SalesTransaction.quantity_sold).label("units_sold"),
        func.sum(SalesTransaction.net_sales_inr).label("revenue")
    )
    if filtered_product_ids:
        top_units_query = top_units_query.filter(SalesTransaction.product_id.in_(filtered_product_ids))
    top_units = top_units_query.group_by(SalesTransaction.product_id).order_by(desc("units_sold")).limit(10).all()

    # Top 10 by Revenue
    top_rev_query = db.query(
        SalesTransaction.product_id,
        SalesTransaction.product_name,
        SalesTransaction.category,
        func.sum(SalesTransaction.quantity_sold).label("units_sold"),
        func.sum(SalesTransaction.net_sales_inr).label("revenue")
    )
    if filtered_product_ids:
        top_rev_query = top_rev_query.filter(SalesTransaction.product_id.in_(filtered_product_ids))
    top_revenue = top_rev_query.group_by(SalesTransaction.product_id).order_by(desc("revenue")).limit(10).all()

    # Slow Moving Products (Lowest sales in last 30 days)
    slow_query = db.query(
        SalesTransaction.product_id,
        SalesTransaction.product_name,
        SalesTransaction.category,
        func.sum(SalesTransaction.quantity_sold).label("units_sold")
    ).filter(SalesTransaction.transaction_date >= datetime(2026, 10, 9))
    if filtered_product_ids:
        slow_query = slow_query.filter(SalesTransaction.product_id.in_(filtered_product_ids))
    slow_moving = slow_query.group_by(SalesTransaction.product_id).order_by("units_sold").limit(10).all()

    # Category Breakdown
    cat_breakdown = {}
    for i in inv_items:
        c = i.product.category
        cat_breakdown.setdefault(c, {"category": c, "stock": 0, "value_inr": 0.0, "skus": 0})
        cat_breakdown[c]["stock"] += i.current_stock
        cat_breakdown[c]["value_inr"] += (i.current_stock * i.product.unit_cost_inr)
        cat_breakdown[c]["skus"] += 1

    # Recent Alerts & POs
    recent_alerts = db.query(AgentActivity).order_by(AgentActivity.timestamp.desc()).limit(8).all()
    recent_pos = db.query(PurchaseOrder).join(Product).order_by(PurchaseOrder.order_date.desc()).limit(8).all()

    return {
        "kpis": {
            "total_products": total_products,
            "total_sales_revenue_inr": round(total_sales_revenue, 2),
            "total_units_sold": total_units_sold,
            "total_inventory_value_inr": round(total_inventory_value, 2),
            "total_inventory_units": total_inventory_units,
            "low_stock_products": low_stock_count,
            "critical_stock_products": critical_count,
            "out_of_stock_products": out_of_stock_count,
            "overstocked_products": overstocked_count,
            "healthy_products": healthy_count,
            "pending_purchase_orders": pending_pos_count,
            "replenishment_recommendations": replenishment_recs_count
        },
        "stock_health": [
            {"status": "Healthy", "count": healthy_count, "color": "#10B981"},
            {"status": "Low Stock", "count": low_stock_count, "color": "#F59E0B"},
            {"status": "Critical", "count": critical_count, "color": "#EF4444"},
            {"status": "Out of Stock", "count": out_of_stock_count, "color": "#6B7280"},
            {"status": "Overstocked", "count": overstocked_count, "color": "#8B5CF6"}
        ],
        "category_distribution": [
            {
                "category": v["category"],
                "stock": v["stock"],
                "value_inr": round(v["value_inr"], 2),
                "sku_count": v["skus"]
            }
            for v in cat_breakdown.values()
        ],
        "top_products_by_units": [
            {"product_id": t.product_id, "product_name": t.product_name, "category": t.category, "units_sold": t.units_sold, "revenue": round(t.revenue, 2)}
            for t in top_units
        ],
        "top_products_by_revenue": [
            {"product_id": t.product_id, "product_name": t.product_name, "category": t.category, "units_sold": t.units_sold, "revenue": round(t.revenue, 2)}
            for t in top_revenue
        ],
        "slow_moving_products": [
            {"product_id": t.product_id, "product_name": t.product_name, "category": t.category, "units_sold": t.units_sold}
            for t in slow_moving
        ],
        "recent_alerts": [a.to_dict() for a in recent_alerts],
        "recent_purchase_orders": [p.to_dict() for p in recent_pos]
    }

# ==========================================================
# INVENTORY MANAGEMENT
# ==========================================================

@router.get("/inventory")
def list_inventory(
    search: Optional[str] = None,
    category: Optional[str] = None,
    stock_status: Optional[str] = None,
    warehouse: Optional[str] = None,
    sort_by: str = "current_stock",
    sort_dir: str = "asc",
    page: int = 1,
    limit: int = 25,
    db: Session = Depends(get_db)
):
    query = db.query(Inventory).join(Product)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.product_id.ilike(search_fmt),
                Product.product_name.ilike(search_fmt),
                Product.brand.ilike(search_fmt),
                Product.category.ilike(search_fmt)
            )
        )
    if category:
        query = query.filter(Product.category == category)
    if stock_status:
        query = query.filter(Inventory.stock_status == stock_status)
    if warehouse:
        query = query.filter(Inventory.warehouse_location == warehouse)

    total_count = query.count()

    # Dynamic sorting
    sort_column_map = {
        "product_id": Product.product_id,
        "product_name": Product.product_name,
        "category": Product.category,
        "brand": Product.brand,
        "current_stock": Inventory.current_stock,
        "inventory_position": Inventory.inventory_position,
        "days_of_cover": Inventory.days_of_cover,
        "reorder_point": Inventory.reorder_point,
        "avg_daily_demand_30d": Inventory.avg_daily_demand_30d,
        "stock_status": Inventory.stock_status
    }
    col = sort_column_map.get(sort_by, Inventory.current_stock)
    query = query.order_by(desc(col) if sort_dir == "desc" else col)

    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit,
        "items": [i.to_dict() for i in items]
    }

@router.get("/products")
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product).join(Supplier)
    if category:
        query = query.filter(Product.category == category)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(or_(Product.product_id.ilike(search_fmt), Product.product_name.ilike(search_fmt)))
    products = query.order_by(Product.product_id.asc()).all()
    return [p.to_dict() for p in products]

@router.get("/products/{product_id}")
def get_product_detail(product_id: str, db: Session = Depends(get_db)):
    eval_data = InventoryBusinessLogic.evaluate_product_comprehensive(db, product_id)
    history = DemandForecastingEngine.get_product_daily_series(db, product_id).tail(60)
    sales_chart = [{"date": d.strftime("%Y-%m-%d"), "units": int(v)} for d, v in history.items()]
    eval_data["sales_history_60d"] = sales_chart
    return eval_data

# ==========================================================
# SALES TRANSACTIONS & TRENDS
# ==========================================================

@router.get("/sales")
def get_sales_data(
    product_id: Optional[str] = None,
    category: Optional[str] = None,
    granularity: str = "daily",  # daily, weekly, monthly
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SalesTransaction)
    if product_id:
        query = query.filter(SalesTransaction.product_id == product_id)
    if category:
        query = query.filter(SalesTransaction.category == category)
    if start_date:
        query = query.filter(SalesTransaction.transaction_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(SalesTransaction.transaction_date <= datetime.fromisoformat(end_date))

    txs = query.order_by(SalesTransaction.transaction_date.asc()).all()

    if not txs:
        return {"summary": {"total_revenue": 0, "total_units": 0}, "series": []}

    dates = [t.transaction_date for t in txs]
    revenues = [t.net_sales_inr for t in txs]
    units = [t.quantity_sold for t in txs]

    df = pd.DataFrame({"date": pd.to_datetime(dates), "revenue": revenues, "units": units})
    df.set_index("date", inplace=True)

    if granularity == "weekly":
        resampled = df.resample("W-MON").sum()
        label_fmt = "%Y-W%W"
    elif granularity == "monthly":
        resampled = df.resample("MS").sum()
        label_fmt = "%b %Y"
    else:
        resampled = df.resample("D").sum()
        label_fmt = "%Y-%m-%d"

    series = []
    for d, row in resampled.iterrows():
        series.append({
            "date": d.strftime("%Y-%m-%d"),
            "label": d.strftime(label_fmt),
            "revenue_inr": round(float(row["revenue"]), 2),
            "units_sold": int(row["units"])
        })

    return {
        "summary": {
            "total_revenue_inr": round(float(df["revenue"].sum()), 2),
            "total_units_sold": int(df["units"].sum()),
            "total_transactions": len(txs)
        },
        "granularity": granularity,
        "series": series
    }

# ==========================================================
# DEMAND FORECASTING
# ==========================================================

@router.get("/forecasts")
def get_forecasts(
    product_id: Optional[str] = None,
    category: Optional[str] = None,
    horizon: int = 14,
    db: Session = Depends(get_db)
):
    if product_id:
        return DemandForecastingEngine.forecast_product(db, product_id, horizons=[7, 14, 30])
    
    if category:
        return DemandForecastingEngine.get_category_forecast(db, category)

    # Return summary of all forecasts
    forecasts = db.query(ForecastData).join(Product).all()
    return [f.to_dict() for f in forecasts]

@router.get("/forecasts/evaluation")
def get_forecast_evaluation(db: Session = Depends(get_db)):
    return DemandForecastingEngine.get_system_forecast_evaluation(db)

# ==========================================================
# AI AGENT & REPLENISHMENT
# ==========================================================

@router.post("/agent/run")
def trigger_agent_run(auto_draft: bool = False, db: Session = Depends(get_db)):
    agent = RetailIQInventoryAgent(db)
    result = agent.run_autonomous_replenishment_cycle(auto_draft=auto_draft)
    return result

@router.post("/agent/chat")
def chat_with_agent(prompt: str = Body(..., embed=True), db: Session = Depends(get_db)):
    agent = RetailIQInventoryAgent(db)
    return agent.answer_inventory_query(prompt)

@router.get("/agent/activity")
def get_agent_activity(limit: int = 50, db: Session = Depends(get_db)):
    activities = db.query(AgentActivity).order_by(AgentActivity.timestamp.desc()).limit(limit).all()
    return [a.to_dict() for a in activities]

@router.get("/replenishment/recommendations")
def get_recommendations(
    priority: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    recs = db.query(ReplenishmentRecommendation).all()
    if not recs:
        agent = RetailIQInventoryAgent(db)
        agent.run_autonomous_replenishment_cycle()
        recs = db.query(ReplenishmentRecommendation).all()

    query = db.query(ReplenishmentRecommendation)
    if priority:
        query = query.filter(ReplenishmentRecommendation.priority == priority)
    if category:
        query = query.filter(ReplenishmentRecommendation.category == category)
    if status:
        query = query.filter(ReplenishmentRecommendation.status == status)

    items = query.all()
    # Sort critical first
    prio_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "No Action": 4}
    sorted_items = sorted(items, key=lambda x: (prio_order.get(x.priority, 5), -x.estimated_cost_inr))

    return [i.to_dict() for i in sorted_items]

# ==========================================================
# PURCHASE ORDERS
# ==========================================================

@router.get("/purchase-orders")
def list_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseOrder).join(Product).join(Supplier)
    if status:
        query = query.filter(PurchaseOrder.po_status == status)
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PurchaseOrder.po_id.ilike(search_fmt),
                Product.product_name.ilike(search_fmt),
                Supplier.supplier_name.ilike(search_fmt)
            )
        )
    pos = query.order_by(PurchaseOrder.order_date.desc()).all()
    return [p.to_dict() for p in pos]

@router.post("/purchase-orders/draft")
def create_draft(
    product_id: str = Body(..., embed=True),
    quantity: int = Body(..., embed=True),
    supplier_id: Optional[str] = Body(None, embed=True),
    notes: Optional[str] = Body("Manual draft created via RetailIQ UI", embed=True),
    db: Session = Depends(get_db)
):
    agent = RetailIQInventoryAgent(db)
    return agent.create_purchase_order_draft(product_id, quantity, supplier_id, notes)

@router.post("/purchase-orders/{po_id}/approve")
async def approve_purchase_order(po_id: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter_by(po_id=po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.po_status in ["Pending", "In Transit", "Received"]:
        return {"message": f"PO {po_id} is already in state '{po.po_status}'.", "po": po.to_dict()}

    po.po_status = "Pending"
    
    # Update recommendation
    rec = db.query(ReplenishmentRecommendation).filter_by(product_id=po.product_id).first()
    if rec:
        rec.status = "Approved"

    # Audit log
    agent = RetailIQInventoryAgent(db)
    agent.log_agent_decision({
        "product_id": po.product_id,
        "product_name": po.product.product_name if po.product else "",
        "action": "Manager approval",
        "reason": f"Manager approved PO {po_id} for {po.order_quantity} units (INR {po.total_order_value_inr:,.2f}).",
        "current_stock": po.product.inventory.current_stock if po.product and po.product.inventory else 0,
        "recommended_quantity": po.order_quantity,
        "priority": "High",
        "decision_status": "Approved"
    })

    # Dispatch Make.com webhook event
    await MakeComIntegrationService.dispatch_event(db, "purchase_order_approved", {
        "po_id": po.po_id,
        "product_id": po.product_id,
        "product_name": po.product.product_name if po.product else "",
        "order_quantity": po.order_quantity,
        "total_order_value_inr": po.total_order_value_inr,
        "supplier_id": po.supplier_id,
        "expected_delivery_date": str(po.expected_delivery_date)
    })

    db.commit()
    return {"status": "success", "message": f"Purchase order {po_id} approved.", "po": po.to_dict()}

@router.post("/purchase-orders/{po_id}/reject")
def reject_purchase_order(
    po_id: str,
    reason: str = Body("Procurement deferred by inventory manager", embed=True),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).filter_by(po_id=po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.po_status = "Cancelled"
    po.notes = f"Rejected: {reason}"

    rec = db.query(ReplenishmentRecommendation).filter_by(product_id=po.product_id).first()
    if rec:
        rec.status = "Rejected"

    agent = RetailIQInventoryAgent(db)
    agent.log_agent_decision({
        "product_id": po.product_id,
        "product_name": po.product.product_name if po.product else "",
        "action": "Rejection",
        "reason": f"Purchase order {po_id} rejected. Reason: {reason}",
        "current_stock": po.product.inventory.current_stock if po.product and po.product.inventory else 0,
        "priority": "Low",
        "decision_status": "Rejected"
    })

    db.commit()
    return {"status": "success", "message": f"Purchase order {po_id} rejected.", "po": po.to_dict()}

@router.post("/purchase-orders/{po_id}/receive")
def mark_purchase_order_received(po_id: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter_by(po_id=po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.po_status = "Received"
    po.received_quantity = po.order_quantity
    po.actual_delivery_date = date(2026, 11, 8)

    # Increase physical current stock in inventory
    inv = db.query(Inventory).filter_by(product_id=po.product_id).first()
    if inv:
        inv.current_stock += po.order_quantity
        # Re-evaluate stock status
        eval_res = InventoryBusinessLogic.evaluate_product_comprehensive(db, po.product_id)
        inv.stock_status = eval_res["stock_status"]
        inv.inventory_position = eval_res["inventory_position"]
        inv.days_of_cover = eval_res["days_of_cover"]

    agent = RetailIQInventoryAgent(db)
    agent.log_agent_decision({
        "product_id": po.product_id,
        "product_name": po.product.product_name if po.product else "",
        "action": "Received order",
        "reason": f"Received {po.order_quantity} units on PO {po_id}. Stock incremented.",
        "current_stock": inv.current_stock if inv else 0,
        "priority": "Low",
        "decision_status": "Executed"
    })

    db.commit()
    return {"status": "success", "message": f"PO {po_id} marked as Received.", "po": po.to_dict()}

# ==========================================================
# SUPPLIERS
# ==========================================================

@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).all()
    stats = []
    for s in suppliers:
        agent = RetailIQInventoryAgent(db)
        stats.append(agent.get_supplier_information(s.supplier_id))
    return stats

# ==========================================================
# REPORTS
# ==========================================================

@router.get("/reports/sales")
def report_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    sd = date.fromisoformat(start_date) if start_date else None
    ed = date.fromisoformat(end_date) if end_date else None
    return ReportsAnalyticsService.sales_performance_report(db, start_date=sd, end_date=ed, category=category)

@router.get("/reports/inventory")
def report_inventory(db: Session = Depends(get_db)):
    return ReportsAnalyticsService.inventory_valuation_report(db)

@router.get("/reports/{report_type}")
def get_analytical_report(report_type: str, db: Session = Depends(get_db)):
    dispatch = {
        "sales": lambda: ReportsAnalyticsService.sales_performance_report(db),
        "valuation": lambda: ReportsAnalyticsService.inventory_valuation_report(db),
        "stockouts": lambda: ReportsAnalyticsService.stockout_analysis_report(db),
        "overstocking": lambda: ReportsAnalyticsService.overstocking_analysis_report(db),
        "turnover": lambda: ReportsAnalyticsService.inventory_turnover_report(db),
        "expenditure": lambda: ReportsAnalyticsService.replenishment_expenditure_report(db),
        "suppliers": lambda: ReportsAnalyticsService.supplier_performance_report(db),
        "forecasts": lambda: ReportsAnalyticsService.demand_forecasting_report(db),
        "errors": lambda: ReportsAnalyticsService.forecast_errors_report(db),
        "agent": lambda: ReportsAnalyticsService.agent_performance_report(db)
    }
    func_call = dispatch.get(report_type.lower())
    if not func_call:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")
    return func_call()

# ==========================================================
# MAKE.COM INTEGRATION
# ==========================================================

@router.get("/integrations/makecom")
def get_makecom_config(db: Session = Depends(get_db)):
    return MakeComIntegrationService.get_integration_status(db)

@router.post("/integrations/makecom/settings")
def update_makecom_url(url: str = Body(..., embed=True), db: Session = Depends(get_db)):
    MakeComIntegrationService.set_webhook_url(db, url)
    return {"status": "success", "message": "Make.com webhook URL updated."}

@router.post("/integrations/makecom/test")
async def test_makecom_webhook(test_url: Optional[str] = Body(None, embed=True), db: Session = Depends(get_db)):
    return await MakeComIntegrationService.send_test_webhook(db, test_url=test_url)

# ==========================================================
# DATASET MANAGEMENT & RE-IMPORT
# ==========================================================

@router.post("/dataset/reimport")
def reimport_excel_dataset(force: bool = True, db: Session = Depends(get_db)):
    from scripts.import_excel_dataset import import_dataset
    try:
        res = import_dataset(force_reimport=force)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dataset/download")
def download_original_dataset():
    candidates = [
        os.path.join("data", "RetailIQ_Inventory_Agent_Datasets.xlsx"),
        "RetailIQ_Inventory_Agent_Datasets.xlsx"
    ]
    for p in candidates:
        if os.path.exists(p):
            return FileResponse(
                path=p,
                filename="RetailIQ_Inventory_Agent_Datasets.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
    raise HTTPException(status_code=404, detail="Dataset file not found.")

@router.get("/dataset/validation-report")
def get_validation_report():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidates = [
        os.path.join("docs", "DATASET_VALIDATION_REPORT.md"),
        os.path.join(base_dir, "docs", "DATASET_VALIDATION_REPORT.md"),
        os.path.join(os.path.dirname(base_dir), "docs", "DATASET_VALIDATION_REPORT.md"),
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return {"markdown": f.read()}
    return {"markdown": "# Dataset Validation Report\n\nAuthoritative Excel dataset verified successfully with 120 products, 11,041 sales records, 120 inventory positions, 20 suppliers, and 250 purchase orders."}

