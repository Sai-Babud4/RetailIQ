import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.models.entities import (
    Product, Inventory, SalesTransaction, PurchaseOrder,
    Supplier, ForecastData, AgentActivity, ReplenishmentRecommendation
)
from backend.app.forecasting.engine import DemandForecastingEngine
from backend.app.services.inventory_logic import InventoryBusinessLogic

class ReportsAnalyticsService:
    """
    RetailIQ MBA Business Analytics Reporting Suite.
    Generates 10 comprehensive analytical reports with metric calculations and CSV export capability.
    """

    @classmethod
    def sales_performance_report(
        cls,
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Report 1: Sales Performance"""
        query = db.query(SalesTransaction)
        if start_date:
            query = query.filter(SalesTransaction.transaction_date >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.filter(SalesTransaction.transaction_date <= datetime.combine(end_date, datetime.max.time()))
        if category:
            query = query.filter(SalesTransaction.category == category)

        txs = query.all()
        if not txs:
            return {"total_transactions": 0, "total_revenue": 0, "total_units": 0}

        total_units = sum(t.quantity_sold for t in txs)
        total_revenue = sum(t.net_sales_inr for t in txs)
        avg_order_value = total_revenue / len(txs) if txs else 0.0

        # Channel Breakdown
        channel_data = {}
        for t in txs:
            c = t.sales_channel
            channel_data.setdefault(c, {"units": 0, "revenue": 0.0, "transactions": 0})
            channel_data[c]["units"] += t.quantity_sold
            channel_data[c]["revenue"] += t.net_sales_inr
            channel_data[c]["transactions"] += 1

        # Store Breakdown
        store_data = {}
        for t in txs:
            s = t.store_id
            store_data.setdefault(s, {"units": 0, "revenue": 0.0, "transactions": 0})
            store_data[s]["units"] += t.quantity_sold
            store_data[s]["revenue"] += t.net_sales_inr
            store_data[s]["transactions"] += 1

        # Promotion Impact
        promo_data = {"Yes": {"revenue": 0.0, "units": 0}, "No": {"revenue": 0.0, "units": 0}}
        for t in txs:
            p = t.promotion_flag
            if p in promo_data:
                promo_data[p]["revenue"] += t.net_sales_inr
                promo_data[p]["units"] += t.quantity_sold

        return {
            "report_name": "Sales Performance Report",
            "total_transactions": len(txs),
            "total_units_sold": total_units,
            "total_revenue_inr": round(total_revenue, 2),
            "average_order_value_inr": round(avg_order_value, 2),
            "channel_breakdown": [
                {"channel": k, "units": v["units"], "revenue_inr": round(v["revenue"], 2), "transactions": v["transactions"]}
                for k, v in channel_data.items()
            ],
            "store_breakdown": [
                {"store_id": k, "units": v["units"], "revenue_inr": round(v["revenue"], 2), "transactions": v["transactions"]}
                for k, v in store_data.items()
            ],
            "promotion_impact": {
                "promoted_revenue_inr": round(promo_data["Yes"]["revenue"], 2),
                "non_promoted_revenue_inr": round(promo_data["No"]["revenue"], 2),
                "promoted_units": promo_data["Yes"]["units"],
                "non_promoted_units": promo_data["No"]["units"]
            }
        }

    @classmethod
    def inventory_valuation_report(cls, db: Session) -> Dict[str, Any]:
        """Report 2: Inventory Valuation"""
        inv_items = db.query(Inventory).join(Product).all()
        total_units = sum(i.current_stock for i in inv_items)
        total_val = sum(i.current_stock * i.product.unit_cost_inr for i in inv_items)

        # By Category
        by_cat = {}
        for i in inv_items:
            cat = i.product.category
            by_cat.setdefault(cat, {"units": 0, "value_inr": 0.0, "sku_count": 0})
            by_cat[cat]["units"] += i.current_stock
            by_cat[cat]["value_inr"] += (i.current_stock * i.product.unit_cost_inr)
            by_cat[cat]["sku_count"] += 1

        # By ABC Classification
        by_abc = {}
        for i in inv_items:
            abc = i.product.abc_classification
            by_abc.setdefault(abc, {"units": 0, "value_inr": 0.0, "sku_count": 0})
            by_abc[abc]["units"] += i.current_stock
            by_abc[abc]["value_inr"] += (i.current_stock * i.product.unit_cost_inr)
            by_abc[abc]["sku_count"] += 1

        # By Warehouse
        by_wh = {}
        for i in inv_items:
            wh = i.warehouse_location
            by_wh.setdefault(wh, {"units": 0, "value_inr": 0.0, "sku_count": 0})
            by_wh[wh]["units"] += i.current_stock
            by_wh[wh]["value_inr"] += (i.current_stock * i.product.unit_cost_inr)
            by_wh[wh]["sku_count"] += 1

        return {
            "report_name": "Inventory Valuation Report",
            "snapshot_date": "2026-11-08",
            "total_skus": len(inv_items),
            "total_physical_units": total_units,
            "total_inventory_valuation_inr": round(total_val, 2),
            "category_valuation": [
                {"category": k, "units": v["units"], "value_inr": round(v["value_inr"], 2), "sku_count": v["sku_count"]}
                for k, v in by_cat.items()
            ],
            "abc_valuation": [
                {"classification": k, "units": v["units"], "value_inr": round(v["value_inr"], 2), "sku_count": v["sku_count"]}
                for k, v in by_abc.items()
            ],
            "warehouse_valuation": [
                {"warehouse": k, "units": v["units"], "value_inr": round(v["value_inr"], 2), "sku_count": v["sku_count"]}
                for k, v in by_wh.items()
            ]
        }

    @classmethod
    def stockout_analysis_report(cls, db: Session) -> Dict[str, Any]:
        """Report 3: Stockout Analysis"""
        out_of_stock = db.query(Inventory).join(Product).filter(Inventory.current_stock == 0).all()
        critical = db.query(Inventory).join(Product).filter(
            Inventory.current_stock > 0,
            Inventory.stock_status == "Critical"
        ).all()

        stockout_items = []
        total_daily_revenue_at_risk = 0.0

        for item in out_of_stock + critical:
            demand = max(0.1, item.avg_daily_demand_30d)
            daily_loss = demand * item.product.selling_price_inr
            total_daily_revenue_at_risk += daily_loss

            stockout_items.append({
                "product_id": item.product_id,
                "product_name": item.product.product_name,
                "category": item.product.category,
                "current_stock": item.current_stock,
                "incoming_stock": item.incoming_stock,
                "avg_daily_demand": item.avg_daily_demand_30d,
                "days_of_cover": item.days_of_cover,
                "stock_status": item.stock_status,
                "daily_revenue_at_risk_inr": round(daily_loss, 2)
            })

        return {
            "report_name": "Stockout Risk Analysis Report",
            "out_of_stock_count": len(out_of_stock),
            "critical_count": len(critical),
            "total_at_risk_count": len(stockout_items),
            "daily_revenue_at_risk_inr": round(total_daily_revenue_at_risk, 2),
            "weekly_projected_loss_inr": round(total_daily_revenue_at_risk * 7, 2),
            "items": stockout_items
        }

    @classmethod
    def overstocking_analysis_report(cls, db: Session) -> Dict[str, Any]:
        """Report 4: Overstocking Analysis"""
        overstocked = db.query(Inventory).join(Product).filter(Inventory.stock_status == "Overstocked").all()
        items = []
        total_tied_capital = 0.0

        for item in overstocked:
            cost = item.product.unit_cost_inr
            val = item.current_stock * cost
            # Excess units above 30 days cover
            excess_units = max(0, int(item.current_stock - (item.avg_daily_demand_30d * 30)))
            tied_capital = excess_units * cost
            total_tied_capital += tied_capital

            items.append({
                "product_id": item.product_id,
                "product_name": item.product.product_name,
                "category": item.product.category,
                "current_stock": item.current_stock,
                "days_of_cover": item.days_of_cover,
                "shelf_life_days": item.product.shelf_life_days,
                "excess_units": excess_units,
                "tied_capital_inr": round(tied_capital, 2),
                "total_valuation_inr": round(val, 2)
            })

        return {
            "report_name": "Overstocked Working Capital Analysis",
            "overstocked_skus_count": len(items),
            "total_excess_capital_tied_inr": round(total_tied_capital, 2),
            "items": items
        }

    @classmethod
    def inventory_turnover_report(cls, db: Session) -> Dict[str, Any]:
        """Report 5: Inventory Turnover (COGS, Turnover Ratio, Days Sales of Inventory)"""
        products = db.query(Product).all()
        # Total COGS over 180 days = sum(quantity_sold * unit_cost_inr)
        tx_stats = db.query(
            SalesTransaction.product_id,
            func.sum(SalesTransaction.quantity_sold).label("total_qty")
        ).group_by(SalesTransaction.product_id).all()

        qty_dict = {t.product_id: t.total_qty for t in tx_stats}
        cogs_total = 0.0
        for p in products:
            sold_qty = qty_dict.get(p.product_id, 0)
            cogs_total += (sold_qty * p.unit_cost_inr)

        # Annualized COGS (180 days -> 365 days)
        annualized_cogs = (cogs_total / 180.0) * 365.0

        # Current total inventory valuation
        inv_items = db.query(Inventory).join(Product).all()
        current_inv_val = sum(i.current_stock * i.product.unit_cost_inr for i in inv_items)

        # Inventory Turnover Ratio = Annualized COGS / Average Inventory
        turnover_ratio = (annualized_cogs / current_inv_val) if current_inv_val > 0 else 0.0
        # Days Sales of Inventory (DSI) = 365 / Turnover Ratio
        dsi = (365.0 / turnover_ratio) if turnover_ratio > 0 else 0.0

        return {
            "report_name": "Inventory Turnover & Efficiency Report",
            "historical_cogs_180d_inr": round(cogs_total, 2),
            "annualized_cogs_inr": round(annualized_cogs, 2),
            "current_inventory_value_inr": round(current_inv_val, 2),
            "inventory_turnover_ratio": round(turnover_ratio, 2),
            "days_sales_of_inventory_dsi": round(dsi, 1),
            "industry_benchmark_turnover": "12 - 18x (Supermarket standard)"
        }

    @classmethod
    def replenishment_expenditure_report(cls, db: Session) -> Dict[str, Any]:
        """Report 6: Replenishment Expenditure Requirements"""
        recs = db.query(ReplenishmentRecommendation).filter(ReplenishmentRecommendation.recommended_quantity > 0).all()
        if not recs:
            # Run evaluation if empty
            from backend.app.agent.inventory_agent import RetailIQInventoryAgent
            agent = RetailIQInventoryAgent(db)
            agent.run_autonomous_replenishment_cycle()
            recs = db.query(ReplenishmentRecommendation).filter(ReplenishmentRecommendation.recommended_quantity > 0).all()

        by_priority = {}
        by_supplier = {}
        total_exp = 0.0

        for r in recs:
            total_exp += r.estimated_cost_inr
            # Priority
            p = r.priority
            by_priority.setdefault(p, {"count": 0, "units": 0, "cost_inr": 0.0})
            by_priority[p]["count"] += 1
            by_priority[p]["units"] += r.recommended_quantity
            by_priority[p]["cost_inr"] += r.estimated_cost_inr

            # Supplier
            sup = r.supplier_name
            by_supplier.setdefault(sup, {"count": 0, "units": 0, "cost_inr": 0.0, "supplier_id": r.preferred_supplier_id})
            by_supplier[sup]["count"] += 1
            by_supplier[sup]["units"] += r.recommended_quantity
            by_supplier[sup]["cost_inr"] += r.estimated_cost_inr

        return {
            "report_name": "Replenishment Expenditure Report",
            "total_flagged_skus": len(recs),
            "total_recommended_units": sum(r.recommended_quantity for r in recs),
            "total_estimated_expenditure_inr": round(total_exp, 2),
            "by_priority": [
                {"priority": k, "sku_count": v["count"], "units": v["units"], "cost_inr": round(v["cost_inr"], 2)}
                for k, v in by_priority.items()
            ],
            "by_supplier": sorted([
                {"supplier_name": k, "supplier_id": v["supplier_id"], "sku_count": v["count"], "units": v["units"], "cost_inr": round(v["cost_inr"], 2)}
                for k, v in by_supplier.items()
            ], key=lambda x: x["cost_inr"], reverse=True)
        }

    @classmethod
    def supplier_performance_report(cls, db: Session) -> Dict[str, Any]:
        """Report 7: Supplier Performance & Delivery Analytics"""
        suppliers = db.query(Supplier).all()
        pos = db.query(PurchaseOrder).all()

        sup_metrics = []
        for s in suppliers:
            sup_pos = [p for p in pos if p.supplier_id == s.supplier_id]
            received = [p for p in sup_pos if p.po_status == "Received" and p.actual_delivery_date and p.expected_delivery_date]
            delayed = [p for p in sup_pos if p.po_status == "Delayed"]
            
            on_time = sum(1 for p in received if p.actual_delivery_date <= p.expected_delivery_date)
            on_time_pct = (on_time / len(received) * 100) if received else 0.0
            total_purchased_val = sum(p.total_order_value_inr for p in sup_pos if p.po_status == "Received")

            sup_metrics.append({
                "supplier_id": s.supplier_id,
                "supplier_name": s.supplier_name,
                "city": s.city,
                "average_lead_time_days": s.average_lead_time_days,
                "simulated_reliability_score": round(s.supplier_reliability, 3),
                "actual_on_time_delivery_pct": round(on_time_pct, 1),
                "total_orders": len(sup_pos),
                "received_orders": len(received),
                "delayed_orders": len(delayed),
                "total_procurement_value_inr": round(total_purchased_val, 2),
                "minimum_order_value_inr": s.minimum_order_value_inr,
                "payment_terms": s.payment_terms,
                "supplier_status": s.supplier_status
            })

        return {
            "report_name": "Supplier Delivery & Reliability Report",
            "total_suppliers": len(suppliers),
            "suppliers": sorted(sup_metrics, key=lambda x: x["actual_on_time_delivery_pct"], reverse=True)
        }

    @classmethod
    def demand_forecasting_report(cls, db: Session) -> Dict[str, Any]:
        """Report 8: Demand Forecasting Aggregates"""
        eval_data = DemandForecastingEngine.get_system_forecast_evaluation(db)
        return {
            "report_name": "Demand Forecasting Suite Report",
            **eval_data
        }

    @classmethod
    def forecast_errors_report(cls, db: Session) -> Dict[str, Any]:
        """Report 9: Forecast Error Benchmarking (MAE & WAPE)"""
        eval_data = DemandForecastingEngine.get_system_forecast_evaluation(db)
        return {
            "report_name": "Forecast Error & Residuals Analysis",
            "evaluation_period": "14-Day Out-of-Sample Holdout Testing",
            "average_mae": eval_data["average_mae"],
            "average_wape": eval_data["average_wape"],
            "overall_accuracy_percentage": eval_data["overall_accuracy_percentage"],
            "detailed_sku_errors": eval_data["sku_evaluations"]
        }

    @classmethod
    def agent_performance_report(cls, db: Session) -> Dict[str, Any]:
        """Report 10: AI Agent Performance & Decisions Audit"""
        activities = db.query(AgentActivity).order_by(AgentActivity.timestamp.desc()).all()
        by_action = {}
        for a in activities:
            by_action[a.action] = by_action.get(a.action, 0) + 1

        approved_pos = db.query(PurchaseOrder).filter(PurchaseOrder.is_generated == True, PurchaseOrder.po_status == "Pending").count()
        draft_pos = db.query(PurchaseOrder).filter(PurchaseOrder.po_status == "Draft").count()

        return {
            "report_name": "Autonomous Agent Performance & Audit",
            "total_agent_activities_logged": len(activities),
            "action_breakdown": by_action,
            "generated_drafts_pending": draft_pos,
            "manager_approved_orders": approved_pos,
            "recent_audit_trail": [a.to_dict() for a in activities[:25]]
        }

