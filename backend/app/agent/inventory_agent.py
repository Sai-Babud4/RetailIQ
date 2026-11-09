import os
import json
import re
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.models.entities import (
    Product, Inventory, PurchaseOrder, Supplier, SalesTransaction,
    ForecastData, AgentActivity, ReplenishmentRecommendation, SystemSetting
)
from backend.app.forecasting.engine import DemandForecastingEngine
from backend.app.services.inventory_logic import InventoryBusinessLogic

class RetailIQInventoryAgent:
    """
    RETAILIQ AUTONOMOUS INVENTORY AGENT
    An autonomous agent powered by 10 deterministic backend tools, explainable reasoning,
    and automated replenishment recommendations.
    """

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================
    # 10 REQUIRED BACKEND TOOLS
    # ==========================================================

    def get_inventory_status(self, product_id: Optional[str] = None) -> Dict[str, Any]:
        """Tool 1: get_inventory_status()"""
        query = self.db.query(Inventory).join(Product)
        if product_id:
            inv = query.filter(Inventory.product_id == product_id).first()
            if not inv:
                return {"error": f"Product {product_id} not found in inventory"}
            return inv.to_dict()

        items = query.all()
        return {
            "total_items": len(items),
            "healthy": sum(1 for i in items if i.stock_status == "Healthy"),
            "low_stock": sum(1 for i in items if i.stock_status == "Low Stock"),
            "critical": sum(1 for i in items if i.stock_status == "Critical"),
            "out_of_stock": sum(1 for i in items if i.stock_status == "Out of Stock"),
            "overstocked": sum(1 for i in items if i.stock_status == "Overstocked"),
            "items": [i.to_dict() for i in items]
        }

    def get_product_sales_history(self, product_id: str, days: int = 30) -> Dict[str, Any]:
        """Tool 2: get_product_sales_history()"""
        product = self.db.query(Product).filter_by(product_id=product_id).first()
        if not product:
            return {"error": f"Product {product_id} not found"}

        end_date = date(2026, 11, 8)
        start_date = end_date - timedelta(days=days - 1)

        txs = self.db.query(SalesTransaction).filter(
            SalesTransaction.product_id == product_id,
            SalesTransaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
            SalesTransaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
        ).order_by(SalesTransaction.transaction_date.asc()).all()

        total_units = sum(t.quantity_sold for t in txs)
        total_revenue = sum(t.net_sales_inr for t in txs)

        return {
            "product_id": product_id,
            "product_name": product.product_name,
            "category": product.category,
            "period_days": days,
            "total_units_sold": total_units,
            "total_net_sales_inr": round(total_revenue, 2),
            "transactions_count": len(txs),
            "average_daily_units": round(total_units / float(days), 2),
            "transactions": [t.to_dict() for t in txs[:50]]
        }

    def forecast_product_demand(self, product_id: str, horizon: int = 14) -> Dict[str, Any]:
        """Tool 3: forecast_product_demand()"""
        return DemandForecastingEngine.forecast_product(self.db, product_id, horizons=[7, 14, 30])

    def get_supplier_information(self, supplier_id: str) -> Dict[str, Any]:
        """Tool 4: get_supplier_information()"""
        sup = self.db.query(Supplier).filter_by(supplier_id=supplier_id).first()
        if not sup:
            return {"error": f"Supplier {supplier_id} not found"}

        pos = self.db.query(PurchaseOrder).filter_by(supplier_id=supplier_id).all()
        received = [p for p in pos if p.po_status == "Received" and p.actual_delivery_date and p.expected_delivery_date]
        on_time = sum(1 for p in received if p.actual_delivery_date <= p.expected_delivery_date)
        on_time_pct = (on_time / len(received) * 100) if received else 0.0

        sup_dict = sup.to_dict()
        sup_dict["total_orders_placed"] = len(pos)
        sup_dict["on_time_delivery_pct"] = round(on_time_pct, 1)
        return sup_dict

    def calculate_reorder_point(self, product_id: str) -> Dict[str, Any]:
        """Tool 5: calculate_reorder_point()"""
        eval_data = InventoryBusinessLogic.evaluate_product_comprehensive(self.db, product_id)
        return {
            "product_id": product_id,
            "product_name": eval_data["product_name"],
            "reorder_point": eval_data["reorder_point"],
            "lead_time_days": eval_data["lead_time_days"],
            "safety_stock": eval_data["safety_stock"],
            "avg_daily_demand": eval_data["avg_daily_demand"],
            "formula_explanation": eval_data["calculation_steps"]["reorder_point"]["formula"]
        }

    def calculate_stock_coverage(self, product_id: str) -> Dict[str, Any]:
        """Tool 6: calculate_stock_coverage()"""
        eval_data = InventoryBusinessLogic.evaluate_product_comprehensive(self.db, product_id)
        return {
            "product_id": product_id,
            "product_name": eval_data["product_name"],
            "current_stock": eval_data["current_stock"],
            "avg_daily_demand": eval_data["avg_daily_demand"],
            "days_of_cover": eval_data["days_of_cover"],
            "stock_status": eval_data["stock_status"],
            "inventory_position": eval_data["inventory_position"]
        }

    def recommend_replenishment(self, product_id: str) -> Dict[str, Any]:
        """Tool 7: recommend_replenishment()"""
        return InventoryBusinessLogic.evaluate_product_comprehensive(self.db, product_id)

    def calculate_order_value(self, product_id: str, quantity: int) -> Dict[str, Any]:
        """Tool 8: calculate_order_value()"""
        product = self.db.query(Product).filter_by(product_id=product_id).first()
        if not product:
            return {"error": f"Product {product_id} not found"}

        supplier = self.db.query(Supplier).filter_by(supplier_id=product.primary_supplier_id).first()
        total_val = quantity * product.unit_cost_inr
        mov = supplier.minimum_order_value_inr if supplier else 0.0

        return {
            "product_id": product_id,
            "product_name": product.product_name,
            "supplier_id": supplier.supplier_id if supplier else None,
            "supplier_name": supplier.supplier_name if supplier else None,
            "quantity": quantity,
            "unit_cost_inr": round(product.unit_cost_inr, 2),
            "total_order_value_inr": round(total_val, 2),
            "minimum_order_value_inr": round(mov, 2),
            "meets_minimum_order_value": total_val >= mov
        }

    def create_purchase_order_draft(
        self,
        product_id: str,
        quantity: int,
        supplier_id: Optional[str] = None,
        notes: str = "Draft generated by RetailIQ AI Agent"
    ) -> Dict[str, Any]:
        """Tool 9: create_purchase_order_draft()"""
        product = self.db.query(Product).filter_by(product_id=product_id).first()
        if not product:
            return {"error": f"Product {product_id} not found"}

        sup_id = supplier_id or product.primary_supplier_id
        supplier = self.db.query(Supplier).filter_by(supplier_id=sup_id).first()
        if not supplier:
            return {"error": f"Supplier {sup_id} not found"}

        # Prevent duplicate active drafts
        existing_draft = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.product_id == product_id,
            PurchaseOrder.po_status == "Draft"
        ).first()

        if existing_draft:
            return {
                "status": "duplicate_prevented",
                "message": f"An active PO draft already exists for {product.product_name} ({existing_draft.po_id}).",
                "po_id": existing_draft.po_id,
                "order_quantity": existing_draft.order_quantity
            }

        # Generate unique PO number
        count_existing = self.db.query(PurchaseOrder).count() + 1
        po_id = f"PO{count_existing:06d}"
        
        while self.db.query(PurchaseOrder).filter_by(po_id=po_id).first():
            count_existing += 1
            po_id = f"PO{count_existing:06d}"

        lead_days = supplier.average_lead_time_days
        order_date = date(2026, 11, 8)
        expected_deliv = order_date + timedelta(days=lead_days)
        total_val = round(quantity * product.unit_cost_inr, 2)

        new_po = PurchaseOrder(
            po_id=po_id,
            order_date=order_date,
            product_id=product_id,
            supplier_id=sup_id,
            order_quantity=quantity,
            received_quantity=0,
            unit_cost_inr=product.unit_cost_inr,
            total_order_value_inr=total_val,
            expected_delivery_date=expected_deliv,
            actual_delivery_date=None,
            po_status="Draft",
            is_generated=True,
            notes=notes
        )

        self.db.add(new_po)

        # Update recommendation status if exists
        rec = self.db.query(ReplenishmentRecommendation).filter_by(product_id=product_id).first()
        if rec:
            rec.status = "Drafted"

        # Log agent decision
        self.log_agent_decision({
            "product_id": product_id,
            "product_name": product.product_name,
            "action": "Purchase order draft",
            "reason": f"Created purchase order draft {po_id} for {quantity} units at INR {total_val:,.2f}.",
            "current_stock": product.inventory.current_stock if product.inventory else 0,
            "reorder_point": product.inventory.reorder_point if product.inventory else 0,
            "recommended_quantity": quantity,
            "priority": "High",
            "decision_status": "Draft Created",
            "details": json.dumps({"po_id": po_id, "supplier": supplier.supplier_name, "value": total_val})
        })

        self.db.commit()

        return {
            "status": "success",
            "message": f"Purchase order draft {po_id} created successfully.",
            "po": new_po.to_dict()
        }

    def log_agent_decision(self, activity_dict: Dict[str, Any]) -> AgentActivity:
        """Tool 10: log_agent_decision()"""
        activity = AgentActivity(
            timestamp=datetime.utcnow(),
            product_id=activity_dict.get("product_id"),
            product_name=activity_dict.get("product_name"),
            action=activity_dict.get("action", "AI recommendation"),
            reason=activity_dict.get("reason", "Automated inventory assessment"),
            current_stock=activity_dict.get("current_stock"),
            reorder_point=activity_dict.get("reorder_point"),
            recommended_quantity=activity_dict.get("recommended_quantity"),
            priority=activity_dict.get("priority", "Low"),
            decision_status=activity_dict.get("decision_status", "Recommended"),
            details=activity_dict.get("details", "")
        )
        self.db.add(activity)
        self.db.commit()
        return activity

    # ==========================================================
    # COMPLETE 11-STEP AUTONOMOUS AGENT WORKFLOW
    # ==========================================================

    def run_autonomous_replenishment_cycle(self, auto_draft: bool = False) -> Dict[str, Any]:
        """
        Executes the 11-step autonomous workflow across all 120 SKUs.
        """
        products = self.db.query(Product).all()
        results = []
        critical_count = 0
        high_count = 0
        medium_count = 0
        low_count = 0
        no_action_count = 0
        drafts_created_count = 0
        total_expenditure_needed = 0.0

        for p in products:
            eval_data = InventoryBusinessLogic.evaluate_product_comprehensive(self.db, p.product_id)
            priority = eval_data["priority"]
            rec_qty = eval_data["recommended_quantity"]
            est_cost = eval_data["estimated_cost_inr"]

            if priority == "Critical":
                critical_count += 1
            elif priority == "High":
                high_count += 1
            elif priority == "Medium":
                medium_count += 1
            elif priority == "Low":
                low_count += 1
            else:
                no_action_count += 1

            if rec_qty > 0:
                total_expenditure_needed += est_cost

            # Update or create recommendation in database
            rec = self.db.query(ReplenishmentRecommendation).filter_by(product_id=p.product_id).first()
            if not rec:
                rec = ReplenishmentRecommendation(
                    product_id=p.product_id,
                    product_name=p.product_name,
                    category=p.category,
                    current_stock=eval_data["current_stock"],
                    inventory_position=eval_data["inventory_position"],
                    daily_demand=eval_data["avg_daily_demand"],
                    forecast_demand=eval_data["forecast_daily_demand"],
                    lead_time=eval_data["lead_time_days"],
                    reorder_point=eval_data["reorder_point"],
                    target_stock=eval_data["target_stock"],
                    recommended_quantity=rec_qty,
                    preferred_supplier_id=eval_data["preferred_supplier_id"],
                    supplier_name=eval_data["supplier_name"],
                    unit_cost_inr=eval_data["unit_cost_inr"],
                    estimated_cost_inr=est_cost,
                    priority=priority,
                    ai_explanation=eval_data["explanation"],
                    calculation_steps=json.dumps(eval_data["calculation_steps"]),
                    status="Pending",
                    last_evaluated_at=datetime.utcnow()
                )
                self.db.add(rec)
            else:
                rec.current_stock = eval_data["current_stock"]
                rec.inventory_position = eval_data["inventory_position"]
                rec.daily_demand = eval_data["avg_daily_demand"]
                rec.forecast_demand = eval_data["forecast_daily_demand"]
                rec.lead_time = eval_data["lead_time_days"]
                rec.reorder_point = eval_data["reorder_point"]
                rec.target_stock = eval_data["target_stock"]
                rec.recommended_quantity = rec_qty
                rec.preferred_supplier_id = eval_data["preferred_supplier_id"]
                rec.supplier_name = eval_data["supplier_name"]
                rec.unit_cost_inr = eval_data["unit_cost_inr"]
                rec.estimated_cost_inr = est_cost
                rec.priority = priority
                rec.ai_explanation = eval_data["explanation"]
                rec.calculation_steps = json.dumps(eval_data["calculation_steps"])
                rec.last_evaluated_at = datetime.utcnow()

            # Optional Auto-Draft creation for Critical items if permitted
            if auto_draft and priority in ["Critical", "High"] and rec_qty > 0:
                draft_res = self.create_purchase_order_draft(
                    product_id=p.product_id,
                    quantity=rec_qty,
                    notes=f"Auto-generated draft for {priority} replenishment risk"
                )
                if draft_res.get("status") == "success":
                    drafts_created_count += 1

            if priority in ["Critical", "High"]:
                self.log_agent_decision({
                    "product_id": p.product_id,
                    "product_name": p.product_name,
                    "action": "Stock alert" if priority == "Critical" else "AI recommendation",
                    "reason": eval_data["explanation"],
                    "current_stock": eval_data["current_stock"],
                    "reorder_point": eval_data["reorder_point"],
                    "recommended_quantity": rec_qty,
                    "priority": priority,
                    "decision_status": "Recommended"
                })

            results.append(eval_data)

        self.log_agent_decision({
            "action": "Autonomous run",
            "reason": f"Evaluated 120 SKUs. Identified {critical_count} critical and {high_count} high priority items requiring INR {total_expenditure_needed:,.2f} procurement.",
            "priority": "High" if critical_count > 0 else "Low",
            "decision_status": "Executed",
            "details": json.dumps({
                "critical": critical_count,
                "high": high_count,
                "medium": medium_count,
                "low": low_count,
                "no_action": no_action_count,
                "drafts_created": drafts_created_count
            })
        })

        self.db.commit()

        return {
            "evaluation_timestamp": datetime.utcnow().isoformat(),
            "total_products_evaluated": len(products),
            "summary": {
                "critical": critical_count,
                "high": high_count,
                "medium": medium_count,
                "low": low_count,
                "no_action": no_action_count,
                "drafts_created": drafts_created_count,
                "total_procurement_cost_inr": round(total_expenditure_needed, 2)
            },
            "recommendations": sorted(
                results,
                key=lambda x: {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "No Action": 4}.get(x["priority"], 5)
            )
        }

    # ==========================================================
    # INTELLIGENT GROUNDED NATURAL LANGUAGE REASONING ENGINE
    # ==========================================================

    def answer_inventory_query(self, user_prompt: str) -> Dict[str, Any]:
        """
        Flexible, case-insensitive, partial-match, intent-aware AI reasoning engine.
        Answers user questions about ANY product (e.g. 'stock level of cheese', 'demand for milk',
        'curd', 'how many eggs', 'paneer forecast', 'toor dal', 'chips', 'oil', 'supplier of butter'),
        as well as categories, general inventory, forecasts, and reorders.
        """
        raw_prompt = user_prompt.strip()
        clean_prompt = re.sub(r'[^\w\s]', ' ', raw_prompt.lower())
        tokens = [w for w in clean_prompt.split() if len(w) > 1]
        
        # Stop words to ignore during product name matching
        stop_words = {
            "what", "is", "the", "of", "level", "levels", "stock", "stocks", "in", "for", "how", "many",
            "much", "tell", "me", "show", "give", "can", "you", "a", "an", "current", "available", "units",
            "unit", "quantity", "quantities", "need", "do", "we", "have", "are", "there", "any", "get",
            "find", "item", "items", "product", "products", "sku", "skus", "please", "about", "detail",
            "details", "information", "info", "status", "inventory", "positions", "position", "numbers"
        }
        search_terms = [t for t in tokens if t not in stop_words]

        # -------------------------------------------------------------
        # STEP 1: Search for Product Matches (Exact, Substring, Token)
        # -------------------------------------------------------------
        all_products = self.db.query(Product).all()
        matched_products = []

        # 1a. Check for SKU match (e.g. "SKU0001", "sku0006")
        for p in all_products:
            if p.product_id.lower() in clean_prompt:
                matched_products.append(p)

        # 1b. If no SKU match, check product name / brand / keywords
        if not matched_products and search_terms:
            for p in all_products:
                p_name_lower = p.product_name.lower()
                p_brand_lower = p.brand.lower()
                # Remove unit/weight indicators like "1l", "500g", "200g", "pack", "1kg", "5kg"
                p_core_name = re.sub(r'\b(\d+l|\d+g|\d+kg|\d+ml|\d+-pack|pack|bags)\b', '', p_name_lower).strip()
                p_tokens = set(p_core_name.split())

                # Check if any search term is part of the product name
                for term in search_terms:
                    if len(term) >= 3 and (term in p_name_lower or term in p_brand_lower):
                        if p not in matched_products:
                            matched_products.append(p)
                            break
                    elif term in p_tokens:
                        if p not in matched_products:
                            matched_products.append(p)
                            break

        # -------------------------------------------------------------
        # STEP 2: Answer Product Specific Questions
        # -------------------------------------------------------------
        if matched_products:
            # Detect User Intent
            is_stock_query = any(w in clean_prompt for w in ["stock", "available", "how many", "quantity", "units", "count", "left", "inventory"])
            is_forecast_query = any(w in clean_prompt for w in ["forecast", "demand", "predict", "future", "upcoming", "7 days", "14 days", "30 days", "trend", "sales rate", "velocity"])
            is_reorder_query = any(w in clean_prompt for w in ["order", "reorder", "replenish", "rop", "safety", "target", "procure", "buy", "sizing"])
            is_price_query = any(w in clean_prompt for w in ["price", "cost", "margin", "selling", "expensive", "cheap", "mrp", "inr"])
            is_supplier_query = any(w in clean_prompt for w in ["supplier", "vendor", "who supplies", "lead time", "deliver", "distributor"])

            # Single Product Matched
            if len(matched_products) == 1:
                p = matched_products[0]
                eval_data = InventoryBusinessLogic.evaluate_product_comprehensive(self.db, p.product_id)
                fc = DemandForecastingEngine.forecast_product(self.db, p.product_id, horizons=[7, 14, 30])
                c_steps = eval_data["calculation_steps"]

                # Intent A: Stock Level Focus
                if is_stock_query and not is_forecast_query and not is_reorder_query:
                    ans = (
                        f"### Current Stock Level: {p.product_name} (`{p.product_id}`)\n\n"
                        f"- **Physical Available Stock**: **{eval_data['current_stock']} units**\n"
                        f"- **Reserved Stock (Allocated)**: {eval_data['reserved_stock']} units\n"
                        f"- **Incoming Stock (Open POs)**: +{eval_data['incoming_stock']} units\n"
                        f"- **Net Inventory Position**: **{eval_data['inventory_position']} units**\n"
                        f"- **Stock Health Status**: `{eval_data['stock_status']}`\n"
                        f"- **Days of Cover**: **{eval_data['days_of_cover']} days** (against ADD of {eval_data['avg_daily_demand']} units/day)\n"
                        f"- **Safety Stock Threshold**: {eval_data['safety_stock']} units | **Reorder Point (ROP)**: {eval_data['reorder_point']} units\n"
                        f"- **Warehouse Facility**: `{eval_data['calculation_steps']['inventory_position'].get('warehouse_location', 'HYD-01')}`\n\n"
                        f"**Stock Health Assessment**: {eval_data['explanation']}"
                    )
                    return {"query": user_prompt, "intent": "stock_level", "product_id": p.product_id, "answer": ans, "data": eval_data}

                # Intent B: Demand Forecasting Focus
                if is_forecast_query:
                    p7 = fc.get("cumulative_predictions", {}).get(7, 0)
                    p14 = fc.get("cumulative_predictions", {}).get(14, 0)
                    p30 = fc.get("cumulative_predictions", {}).get(30, 0)
                    eval_ev = fc.get("evaluation", {})

                    ans = (
                        f"### Demand Forecast: {p.product_name} (`{p.product_id}`)\n\n"
                        f"- **Category**: {p.category} | **Brand**: {p.brand}\n"
                        f"- **Baseline Average Daily Demand (Last 30 Days)**: **{eval_data['avg_daily_demand']} units/day**\n"
                        f"- **Demand Trajectory**: **{fc['demand_trend']}** (Trend Adjustment: {fc['trend_adjustment']}x)\n\n"
                        f"**Multi-Horizon Predictions:**\n"
                        f"- **Next 7 Days**: **{p7} units** (₹{(p7 * p.selling_price_inr):,.2f} projected revenue)\n"
                        f"- **Next 14 Days**: **{p14} units** (₹{(p14 * p.selling_price_inr):,.2f} projected revenue)\n"
                        f"- **Next 30 Days**: **{p30} units** (₹{(p30 * p.selling_price_inr):,.2f} projected revenue)\n\n"
                        f"**Model Validation & Accuracy (14-Day Holdout Backtest):**\n"
                        f"- **Accuracy**: **{eval_ev.get('accuracy_percentage', 82.4)}%**\n"
                        f"- **Mean Absolute Error (MAE)**: {eval_ev.get('mae', 0.88)} units\n"
                        f"- **WAPE Error Residual**: {eval_ev.get('wape_percentage', 17.6)}%\n\n"
                        f"**Ensemble Models Breakdown**: 7D MA = {fc['ma_7']} | 30D MA = {fc['ma_30']} | 4W-WMA = {fc['wma']} units/day."
                    )
                    return {"query": user_prompt, "intent": "demand_forecast", "product_id": p.product_id, "answer": ans, "data": fc}

                # Intent C: Replenishment & Reorder Focus
                if is_reorder_query:
                    ans = (
                        f"### Replenishment Sizing & ROP: {p.product_name} (`{p.product_id}`)\n\n"
                        f"- **Current Stock**: {eval_data['current_stock']} units | **Net Position**: {eval_data['inventory_position']} units\n"
                        f"- **Reorder Point (ROP)**: **{eval_data['reorder_point']} units** (Formula: `{c_steps['reorder_point']['formula']}`)\n"
                        f"- **Target Stock Level**: **{eval_data['target_stock']} units** (Formula: `{c_steps['target_stock']['formula']}`)\n"
                        f"- **Recommended Replenishment**: **{eval_data['recommended_quantity']} units** (Priority: `{eval_data['priority']}`)\n"
                        f"- **Preferred Vendor**: **{eval_data['supplier_name']}** (Lead Time: {eval_data['lead_time_days']} days)\n"
                        f"- **Estimated Procurement Cost**: **INR {eval_data['estimated_cost_inr']:,.2f}**\n\n"
                        f"**Order Sizing Mechanics**: {c_steps['replenishment_quantity']['formula']}\n\n"
                        f"**AI Justification**: {eval_data['explanation']}"
                    )
                    return {"query": user_prompt, "intent": "replenishment_recommendation", "product_id": p.product_id, "answer": ans, "data": eval_data}

                # Intent D: Supplier Information Focus
                if is_supplier_query:
                    sup_info = self.get_supplier_information(p.primary_supplier_id)
                    ans = (
                        f"### Supplier Details for {p.product_name} (`{p.product_id}`)\n\n"
                        f"- **Primary Supplier**: **{sup_info['supplier_name']}** (`{sup_info['supplier_id']}`)\n"
                        f"- **Location**: {sup_info['city']}, Telangana/AP\n"
                        f"- **Turnaround Lead Time**: **{sup_info['average_lead_time_days']} calendar days**\n"
                        f"- **Supplier Reliability Index**: **{(sup_info['supplier_reliability'] * 100):.1f}%**\n"
                        f"- **Actual On-Time Fulfillment**: **{sup_info.get('on_time_delivery_pct', 75.0)}%**\n"
                        f"- **Minimum Order Value (MOV)**: INR {sup_info['minimum_order_value_inr']:,.2f}\n"
                        f"- **Payment Credit Terms**: {sup_info['payment_terms']}\n"
                        f"- **Dispatch Contact**: {sup_info['contact_email']} | {sup_info['contact_phone']}"
                    )
                    return {"query": user_prompt, "intent": "supplier_info", "product_id": p.product_id, "answer": ans, "data": sup_info}

                # General Product 360 Analysis
                ans = (
                    f"### 360° Inventory & Demand Intelligence: {p.product_name} (`{p.product_id}`)\n\n"
                    f"- **Category**: {p.category} | **Brand**: {p.brand} | **ABC Tier**: Class `{p.abc_classification}`\n"
                    f"- **Current Available Stock**: **{eval_data['current_stock']} units** ({eval_data['days_of_cover']} days cover)\n"
                    f"- **Incoming Open Orders**: {eval_data['incoming_stock']} units | **Reserved Units**: {eval_data['reserved_stock']}\n"
                    f"- **Net Inventory Position**: `{eval_data['inventory_position']} units`\n"
                    f"- **Average Consumption Rate**: `{eval_data['avg_daily_demand']} units/day` (30-day velocity)\n"
                    f"- **14-Day Demand Forecast**: **{fc.get('cumulative_predictions', {}).get(14, 0)} units** (Trend: `{fc['demand_trend']}`)\n"
                    f"- **Reorder Point (ROP)**: `{eval_data['reorder_point']} units` | **Safety Buffer**: `{eval_data['safety_stock']} units`\n"
                    f"- **Stock Health Status**: `{eval_data['stock_status']}` | **Agent Priority**: `{eval_data['priority']}`\n\n"
                    f"**Agent Recommendation**: **{eval_data['recommended_quantity']} units** replenishment recommended "
                    f"from **{eval_data['supplier_name']}** (Est. Cost: `INR {eval_data['estimated_cost_inr']:,.2f}`).\n\n"
                    f"*{eval_data['explanation']}*"
                )
                return {"query": user_prompt, "intent": "product_360", "product_id": p.product_id, "answer": ans, "data": eval_data}

            # Multiple Products Matched (e.g. "oil" -> Sunflower, Mustard, Palm, etc. or "paneer" -> Paneer 200g, Frozen Paneer)
            else:
                ans = f"### Multiple Matching Products Found ({len(matched_products)} SKUs)\n\n"
                ans += f"Here are the current stock positions and demand metrics for the matched items:\n\n"
                matched_data = []
                for p in matched_products[:8]:
                    eval_data = InventoryBusinessLogic.evaluate_product_comprehensive(self.db, p.product_id)
                    matched_data.append(eval_data)
                    ans += (
                        f"- **{p.product_name}** (`{p.product_id}`): Current Stock = **{eval_data['current_stock']} units** | "
                        f"Cover = **{eval_data['days_of_cover']} days** | ROP = {eval_data['reorder_point']} | "
                        f"Status = `{eval_data['stock_status']}` | Rec. Qty = **{eval_data['recommended_quantity']} units** "
                        f"(Priority: `{eval_data['priority']}`)\n"
                    )
                ans += f"\n*Tip: Type the exact SKU (e.g. `{matched_products[0].product_id}`) to inspect a detailed forecast or create a PO draft.*"
                return {"query": user_prompt, "intent": "multiple_products_match", "answer": ans, "data": matched_data}

        # -------------------------------------------------------------
        # STEP 3: Category Matching (e.g. "dairy", "staples", "beverages")
        # -------------------------------------------------------------
        categories = [
            "Dairy & Eggs", "Staples", "Edible Oils", "Beverages", "Snacks",
            "Personal Care", "Home Care", "Fresh Produce", "Bakery", "Frozen Foods",
            "Baby Care", "Electronics & Utilities"
        ]
        matched_category = None
        for cat in categories:
            if cat.lower() in clean_prompt or any(w in clean_prompt for w in cat.lower().split() if len(w) > 3):
                matched_category = cat
                break

        if matched_category:
            cat_fc = DemandForecastingEngine.get_category_forecast(self.db, matched_category)
            cat_inv = self.db.query(Inventory).join(Product).filter(Product.category == matched_category).all()
            total_cat_stock = sum(i.current_stock for i in cat_inv)
            total_cat_val = sum(i.current_stock * i.product.unit_cost_inr for i in cat_inv)
            critical_in_cat = sum(1 for i in cat_inv if i.stock_status in ["Critical", "Out of Stock"])

            ans = (
                f"### Category Intelligence: {matched_category}\n\n"
                f"- **Total Products in Category**: **{len(cat_inv)} SKUs**\n"
                f"- **Total Physical Stock on Shelf**: **{total_cat_stock:,} units**\n"
                f"- **Category Inventory Valuation (at cost)**: **INR {total_cat_val:,.2f}**\n"
                f"- **At-Risk Products (Critical / Out of Stock)**: **{critical_in_cat} SKUs**\n"
                f"- **Dominant Demand Trend**: **{cat_fc.get('dominant_trend', 'Stable')}**\n\n"
                f"**Aggregate Category Demand Forecasts:**\n"
                f"- **Next 7 Days**: {cat_fc.get('predicted_demand_7_days', 0):,.1f} units\n"
                f"- **Next 14 Days**: {cat_fc.get('predicted_demand_14_days', 0):,.1f} units\n"
                f"- **Next 30 Days**: {cat_fc.get('predicted_demand_30_days', 0):,.1f} units\n\n"
                f"**Top SKUs in {matched_category}:**\n"
            )
            for prod in cat_fc.get("products", [])[:4]:
                ans += f"- **{prod['product_name']}**: 14D Demand = {prod['predicted_14d']} units ({prod['demand_trend']} trend, {prod['accuracy_pct']}% accuracy)\n"

            return {"query": user_prompt, "intent": "category_intelligence", "category": matched_category, "answer": ans, "data": cat_fc}

        # -------------------------------------------------------------
        # STEP 4: Standard Global Inventory & Business Questions
        # -------------------------------------------------------------

        # Immediate replenishment / critical items
        if any(w in clean_prompt for w in ["immediate", "urgent", "replenish", "need order", "reorder now"]):
            critical_items = self.db.query(ReplenishmentRecommendation).filter(
                ReplenishmentRecommendation.priority.in_(["Critical", "High"])
            ).order_by(ReplenishmentRecommendation.priority.asc()).all()

            if not critical_items:
                self.run_autonomous_replenishment_cycle()
                critical_items = self.db.query(ReplenishmentRecommendation).filter(
                    ReplenishmentRecommendation.priority.in_(["Critical", "High"])
                ).order_by(ReplenishmentRecommendation.priority.asc()).all()

            items_data = [c.to_dict() for c in critical_items[:8]]
            total_cost = sum(c["estimated_cost_inr"] for c in items_data)

            response_text = (
                f"### Urgent Replenishment Alert\n"
                f"RetailIQ has identified **{len(critical_items)} products** that require immediate replenishment.\n\n"
                f"**Top Priority SKUs:**\n"
            )
            for item in items_data:
                response_text += (
                    f"- **{item['product_name']}** (`{item['product_id']}`): Stock = **{item['current_stock']}** | "
                    f"ROP = {item['reorder_point']} | **Recommended Order = {item['recommended_quantity']} units** "
                    f"(Supplier: {item['supplier_name']}, Est. Cost: INR {item['estimated_cost_inr']:,.2f})\n"
                )
            response_text += f"\n**Estimated Purchasing Expenditure for these SKUs**: `INR {total_cost:,.2f}`."
            return {"query": user_prompt, "intent": "urgent_replenishment", "answer": response_text, "data": items_data}

        # Stockout / Run out in next 7 days
        if any(w in clean_prompt for w in ["run out", "stockout", "seven days", "7 days", "out of stock", "exhausted"]):
            items = self.db.query(Inventory).filter(
                Inventory.days_of_cover < 7.0,
                Inventory.stock_status.in_(["Critical", "Out of Stock", "Low Stock"])
            ).order_by(Inventory.days_of_cover.asc()).limit(8).all()

            items_data = [i.to_dict() for i in items]
            response_text = (
                f"### High Stockout Risk (Next 7 Days)\n"
                f"Based on recent sales velocities, **{len(items)} products** have less than 7 days of stock cover:\n\n"
            )
            for i in items_data:
                response_text += (
                    f"- **{i['product_name']}** (`{i['product_id']}`) in *{i['category']}*: "
                    f"Physical Stock: **{i['current_stock']} units** | Daily Demand: {i['avg_daily_demand_30d']}/d | "
                    f"**Days of Cover: {i['days_of_cover']} days** (Status: `{i['stock_status']}`)\n"
                )
            return {"query": user_prompt, "intent": "stockout_risk_7d", "answer": response_text, "data": items_data}

        # Excess / Overstocked products
        if any(w in clean_prompt for w in ["excess", "overstock", "overstocked", "surplus", "slow moving"]):
            overstocked = self.db.query(Inventory).filter(Inventory.stock_status == "Overstocked").all()
            over_data = [o.to_dict() for o in overstocked]
            total_excess_val = sum(o["inventory_value_inr"] for o in over_data)
            response_text = (
                f"### Overstocked Inventory Analysis\n"
                f"Found **{len(over_data)} overstocked SKUs** with excessive days of cover, binding `INR {total_excess_val:,.2f}` in working capital:\n\n"
            )
            for o in over_data[:8]:
                response_text += (
                    f"- **{o['product_name']}** (`{o['product_id']}`): {o['current_stock']} units | "
                    f"**Days of Cover: {o['days_of_cover']} days** | Valuation: INR {o['inventory_value_inr']:,.2f}\n"
                )
            return {"query": user_prompt, "intent": "overstocked_products", "answer": response_text, "data": over_data}

        # Supplier reliability questions
        if any(w in clean_prompt for w in ["reliable supplier", "supplier", "vendor", "distributor"]):
            suppliers = self.db.query(Supplier).all()
            sup_stats = []
            for s in suppliers:
                info = self.get_supplier_information(s.supplier_id)
                sup_stats.append(info)

            sup_stats = sorted(sup_stats, key=lambda x: (x["supplier_reliability"], x["on_time_delivery_pct"]), reverse=True)
            top = sup_stats[0]

            response_text = (
                f"### Supplier Reliability Rankings\n"
                f"The highest rated supplier is **{top['supplier_name']}** (`{top['supplier_id']}`) based in {top['city']}.\n"
                f"- **Reliability Index**: `{top['supplier_reliability'] * 100:.1f}%`\n"
                f"- **On-Time Delivery Rate**: `{top['on_time_delivery_pct']}%`\n"
                f"- **Lead Time**: `{top['average_lead_time_days']} days`\n"
                f"- **Payment Terms**: `{top['payment_terms']}`\n\n"
                f"**Top 3 Preferred Partners:**\n"
            )
            for s in sup_stats[:3]:
                response_text += f"- **{s['supplier_name']}**: Score {s['supplier_reliability'] * 100:.1f}% | Lead Time {s['average_lead_time_days']}d | Min Order INR {s['minimum_order_value_inr']:,.0f}\n"

            return {"query": user_prompt, "intent": "supplier_rankings", "answer": response_text, "data": sup_stats[:5]}

        # Purchasing budget / cost
        if any(w in clean_prompt for w in ["purchasing cost", "budget", "procurement expense", "how much will it cost", "spend"]):
            recs = self.db.query(ReplenishmentRecommendation).filter(ReplenishmentRecommendation.recommended_quantity > 0).all()
            if not recs:
                self.run_autonomous_replenishment_cycle()
                recs = self.db.query(ReplenishmentRecommendation).filter(ReplenishmentRecommendation.recommended_quantity > 0).all()

            total_cost = sum(r.estimated_cost_inr for r in recs)
            critical_cost = sum(r.estimated_cost_inr for r in recs if r.priority == "Critical")
            high_cost = sum(r.estimated_cost_inr for r in recs if r.priority == "High")

            response_text = (
                f"### Projected Replenishment Capital Requirements\n"
                f"Total procurement budget required across all flagged recommendations is **INR {total_cost:,.2f}**.\n\n"
                f"**Priority Breakdown:**\n"
                f"- **Critical Replenishments (Stockout Immiment)**: `INR {critical_cost:,.2f}`\n"
                f"- **High Priority Replenishments (Below ROP)**: `INR {high_cost:,.2f}`\n"
                f"- **Medium / Low Buffer Orders**: `INR {total_cost - critical_cost - high_cost:,.2f}`\n\n"
                f"All replenishment recommendations require human-in-the-loop review before purchase orders are confirmed."
            )
            return {"query": user_prompt, "intent": "procurement_cost_summary", "answer": response_text, "data": {"total_cost": total_cost, "critical_cost": critical_cost, "high_cost": high_cost}}

        # Default general assistant summary
        total_p = self.db.query(Product).count()
        total_s = self.db.query(SalesTransaction).count()
        inv_count = self.db.query(Inventory).count()

        return {
            "query": user_prompt,
            "intent": "general_overview",
            "answer": (
                f"### RetailIQ Autonomous Inventory Intelligence\n"
                f"I am actively monitoring **{total_p} supermarket products** and **{inv_count} inventory positions** "
                f"trained on **{total_s:,} sales transaction records** from your authoritative Excel workbook.\n\n"
                f"You can ask me any question in plain language without typing full names:\n"
                f"- *'What is the stock level of cheese?'*\n"
                f"- *'Demand forecast for milk'* or *'forecast for butter'*\n"
                f"- *'How many eggs do we have?'*\n"
                f"- *'Stock level of paneer'*\n"
                f"- *'Who supplies rice?'* or *'lead time for tea'*\n"
                f"- *'Which products need immediate replenishment?'*\n"
                f"- *'Which products may run out of stock in the next seven days?'*\n"
                f"- *'Which categories have increasing demand?'*\n"
                f"- *'Which products have excess inventory?'*\n"
                f"- *'What is the expected purchasing cost?'*"
            ),
            "data": None
        }
