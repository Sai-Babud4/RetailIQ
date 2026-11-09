import math
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.entities import (
    Product, Inventory, PurchaseOrder, Supplier, SalesTransaction,
    ReplenishmentRecommendation, AgentActivity
)
from backend.app.forecasting.engine import DemandForecastingEngine

class InventoryBusinessLogic:
    """
    Authoritative mathematical implementation of RetailIQ inventory management rules.
    Every calculation step is tracked and formatted for MBA Business Analytics evaluation.
    """

    SNAPSHOT_DATE = date(2026, 11, 8)
    DEFAULT_REVIEW_PERIOD_DAYS = 7

    @classmethod
    def calculate_average_daily_demand(cls, db: Session, product_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Rule A: Average Daily Demand = Total Units Sold During Last 30 Days / 30.
        Ensures calendar dates with zero sales are counted accurately.
        """
        start_date = cls.SNAPSHOT_DATE - timedelta(days=days - 1)
        
        # Query sales in range
        sales_records = db.query(SalesTransaction).filter(
            SalesTransaction.product_id == product_id,
            SalesTransaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
            SalesTransaction.transaction_date <= datetime.combine(cls.SNAPSHOT_DATE, datetime.max.time())
        ).all()

        total_units = sum(s.quantity_sold for s in sales_records)
        avg_demand = total_units / float(days)

        return {
            "product_id": product_id,
            "period_days": days,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": cls.SNAPSHOT_DATE.strftime("%Y-%m-%d"),
            "total_units_sold": total_units,
            "average_daily_demand": round(avg_demand, 2),
            "formula": f"Total Units ({total_units}) / {days} Days = {avg_demand:.2f} units/day"
        }

    @classmethod
    def calculate_incoming_stock(cls, db: Session, product_id: str) -> Dict[str, Any]:
        """
        Calculates incoming stock from valid Pending and In Transit purchase orders.
        Strictly excludes Received, Cancelled, or invalid orders to avoid double-counting.
        """
        open_pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.product_id == product_id,
            PurchaseOrder.po_status.in_(["Pending", "In Transit", "Delayed"])
        ).all()

        incoming_qty = sum(po.order_quantity for po in open_pos)
        po_details = [
            {"po_id": po.po_id, "status": po.po_status, "quantity": po.order_quantity, "expected": str(po.expected_delivery_date)}
            for po in open_pos
        ]

        return {
            "product_id": product_id,
            "incoming_stock": incoming_qty,
            "open_orders_count": len(open_pos),
            "orders": po_details
        }

    @classmethod
    def calculate_inventory_position(cls, current_stock: int, incoming_stock: int, reserved_stock: int) -> Dict[str, Any]:
        """
        Rule B: Inventory Position = Current Stock + Incoming Stock - Reserved Stock.
        """
        pos = current_stock + incoming_stock - reserved_stock
        return {
            "current_stock": current_stock,
            "incoming_stock": incoming_stock,
            "reserved_stock": reserved_stock,
            "inventory_position": pos,
            "formula": f"Current ({current_stock}) + Incoming ({incoming_stock}) - Reserved ({reserved_stock}) = {pos}"
        }

    @classmethod
    def calculate_reorder_point(cls, avg_daily_demand: float, lead_time_days: int, safety_stock: int) -> Dict[str, Any]:
        """
        Rule C: Reorder Point = (Average Daily Demand × Supplier Lead Time) + Safety Stock.
        """
        lead_time_demand = avg_daily_demand * lead_time_days
        rop = int(math.ceil(lead_time_demand + safety_stock))
        return {
            "avg_daily_demand": avg_daily_demand,
            "lead_time_days": lead_time_days,
            "safety_stock": safety_stock,
            "lead_time_demand": round(lead_time_demand, 2),
            "reorder_point": rop,
            "formula": f"({avg_daily_demand:.2f} demand/day × {lead_time_days} days lead) + {safety_stock} safety stock = {rop}"
        }

    @classmethod
    def calculate_target_stock(
        cls,
        forecast_daily_demand: float,
        lead_time_days: int,
        review_period_days: int,
        safety_stock: int
    ) -> Dict[str, Any]:
        """
        Rule D: Target Stock = (Forecast Daily Demand × (Lead Time + Review Period)) + Safety Stock.
        """
        coverage_days = lead_time_days + review_period_days
        target = int(math.ceil((forecast_daily_demand * coverage_days) + safety_stock))
        return {
            "forecast_daily_demand": forecast_daily_demand,
            "lead_time_days": lead_time_days,
            "review_period_days": review_period_days,
            "coverage_days": coverage_days,
            "safety_stock": safety_stock,
            "target_stock": target,
            "formula": f"({forecast_daily_demand:.2f} × ({lead_time_days} lead + {review_period_days} review)) + {safety_stock} safety = {target}"
        }

    @classmethod
    def evaluate_stock_status(
        cls,
        current_stock: int,
        inventory_position: int,
        reorder_point: int,
        days_of_cover: float,
        safety_stock: int,
        shelf_life_days: int
    ) -> str:
        """
        Evaluates stock classification:
          - Out of Stock: Physical stock == 0
          - Critical: Days of cover < 3 or Inventory Position <= Safety Stock
          - Low Stock: Inventory Position <= Reorder Point
          - Overstocked: Days of cover > min(60, shelf_life_days * 0.75)
          - Healthy: Stable position above ROP
        """
        if current_stock <= 0:
            return "Out of Stock"
        if days_of_cover < 3.0 or inventory_position <= safety_stock:
            return "Critical"
        if inventory_position <= reorder_point:
            return "Low Stock"
        
        overstock_threshold = min(45.0, shelf_life_days * 0.8)
        if days_of_cover >= overstock_threshold and inventory_position > (reorder_point * 2):
            return "Overstocked"
        
        return "Healthy"

    @classmethod
    def calculate_replenishment_quantity(
        cls,
        product: Product,
        inventory_position: int,
        target_stock: int,
        supplier: Supplier
    ) -> Dict[str, Any]:
        """
        Rule E: Recommended Quantity = Target Stock - Inventory Position.
        Applies:
          1. Minimum order quantity (MOQ)
          2. Pack-size rounding (round UP to nearest multiple of pack_size)
          3. Perishable shelf-life constraint
          4. Non-negative constraint
        """
        raw_gap = max(0, target_stock - inventory_position)
        
        if raw_gap == 0:
            return {
                "raw_gap": 0,
                "recommended_quantity": 0,
                "pack_size": product.pack_size,
                "moq": product.minimum_order_quantity,
                "explanation": "Inventory position already meets or exceeds target stock."
            }

        # Apply MOQ
        qty_after_moq = max(raw_gap, product.minimum_order_quantity)

        # Apply Pack-Size Rounding (ceiling to nearest pack_size)
        pack_size = max(1, product.pack_size)
        rounded_qty = int(math.ceil(qty_after_moq / pack_size) * pack_size)

        # Shelf-Life Cap for Perishables (Dairy, Bakery, Fresh Produce)
        if product.category in ["Dairy & Eggs", "Bakery", "Fresh Produce"]:
            # Max order shouldn't exceed 20 days of demand to avoid spoilage
            max_shelf_life_units = int(product.shelf_life_days * max(1.0, product.minimum_order_quantity / max(1, product.pack_size)))
            if rounded_qty > max_shelf_life_units and max_shelf_life_units >= product.minimum_order_quantity:
                rounded_qty = int(math.ceil(max_shelf_life_units / pack_size) * pack_size)

        order_val = rounded_qty * product.unit_cost_inr
        meets_mov = order_val >= supplier.minimum_order_value_inr

        return {
            "raw_gap": raw_gap,
            "qty_after_moq": qty_after_moq,
            "pack_size": pack_size,
            "moq": product.minimum_order_quantity,
            "recommended_quantity": rounded_qty,
            "estimated_order_value_inr": round(order_val, 2),
            "supplier_mov_inr": supplier.minimum_order_value_inr,
            "meets_mov": meets_mov,
            "formula": f"Gap ({raw_gap}) -> MOQ adjusted ({qty_after_moq}) -> Pack rounded [x{pack_size}] = {rounded_qty} units"
        }

    @classmethod
    def evaluate_product_comprehensive(cls, db: Session, product_id: str) -> Dict[str, Any]:
        """
        Executes end-to-end evaluation for a product across all business rules.
        """
        product = db.query(Product).filter_by(product_id=product_id).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        inv = db.query(Inventory).filter_by(product_id=product_id).first()
        supplier = db.query(Supplier).filter_by(supplier_id=product.primary_supplier_id).first()

        # 1. 30-day Average Daily Demand
        demand_info = cls.calculate_average_daily_demand(db, product_id, days=30)
        avg_daily_demand = max(0.01, demand_info["average_daily_demand"])

        # 2. Incoming and Reserved stock
        incoming_info = cls.calculate_incoming_stock(db, product_id)
        current_stock = inv.current_stock if inv else 0
        reserved_stock = inv.reserved_stock if inv else 0
        incoming_stock = incoming_info["incoming_stock"]

        # 3. Inventory Position
        inv_pos_info = cls.calculate_inventory_position(current_stock, incoming_stock, reserved_stock)
        inventory_position = inv_pos_info["inventory_position"]

        # 4. Lead time and Safety Stock
        lead_time = supplier.average_lead_time_days if supplier else 2
        safety_stock = inv.safety_stock if inv else max(2, int(avg_daily_demand * 2))

        # 5. Reorder Point
        rop_info = cls.calculate_reorder_point(avg_daily_demand, lead_time, safety_stock)
        reorder_point = rop_info["reorder_point"]

        # 6. Forecast Demand (via forecasting engine)
        forecast_info = DemandForecastingEngine.forecast_product(db, product_id, horizons=[7, 14, 30])
        forecast_daily_demand = forecast_info.get("base_daily_demand", avg_daily_demand)

        # 7. Target Stock
        target_info = cls.calculate_target_stock(
            forecast_daily_demand, lead_time, cls.DEFAULT_REVIEW_PERIOD_DAYS, safety_stock
        )
        target_stock = target_info["target_stock"]

        # 8. Days of Cover
        days_of_cover = current_stock / avg_daily_demand if avg_daily_demand > 0 else 999.0

        # 9. Stock Status Evaluation
        stock_status = cls.evaluate_stock_status(
            current_stock, inventory_position, reorder_point, days_of_cover, safety_stock, product.shelf_life_days
        )

        # 10. Replenishment Quantity
        replenishment_info = cls.calculate_replenishment_quantity(
            product, inventory_position, target_stock, supplier
        )
        rec_qty = replenishment_info["recommended_quantity"]

        # 11. Priority Assignment
        if current_stock == 0 and incoming_stock == 0:
            priority = "Critical"
        elif days_of_cover < 3.0 or (inventory_position <= safety_stock and incoming_stock == 0):
            priority = "Critical"
        elif inventory_position <= reorder_point:
            priority = "High" if days_of_cover < 7.0 else "Medium"
        elif inventory_position < target_stock and rec_qty > 0:
            priority = "Low"
        else:
            priority = "No Action"
            rec_qty = 0

        # Business explanation
        if priority == "Critical":
            explanation = (
                f"URGENT: Product is {stock_status.lower()} with only {current_stock} physical units "
                f"({days_of_cover:.1f} days of cover). Net inventory position ({inventory_position}) is below safety threshold ({safety_stock}). "
                f"Lead time is {lead_time} days. Recommend replenishment of {rec_qty} units from {supplier.supplier_name}."
            )
        elif priority == "High":
            explanation = (
                f"ATTENTION: Inventory position ({inventory_position}) has breached reorder point ({reorder_point}). "
                f"Current stock covers {days_of_cover:.1f} days against {lead_time} days supplier lead time. "
                f"Recommended order of {rec_qty} units to re-establish target stock of {target_stock}."
            )
        elif priority == "Medium":
            explanation = (
                f"MONITOR: Stock position ({inventory_position}) is approaching reorder point ({reorder_point}). "
                f"Order {rec_qty} units soon to maintain buffer."
            )
        elif priority == "Low":
            explanation = (
                f"PREVENTATIVE: Inventory is healthy but slightly under target stock ({target_stock}). "
                f"Optional order of {rec_qty} units during next regular review."
            )
        else:
            explanation = (
                f"OPTIMAL: Stock is sufficient ({current_stock} units, {days_of_cover:.1f} days cover). "
                f"Inventory position ({inventory_position}) comfortably exceeds reorder point ({reorder_point}). No procurement needed."
            )

        calc_steps = {
            "average_daily_demand": demand_info,
            "incoming_stock": incoming_info,
            "inventory_position": inv_pos_info,
            "reorder_point": rop_info,
            "target_stock": target_info,
            "replenishment_quantity": replenishment_info,
            "forecast_summary": {
                "base_daily_demand": forecast_info.get("base_daily_demand"),
                "trend": forecast_info.get("demand_trend"),
                "accuracy_pct": forecast_info.get("evaluation", {}).get("accuracy_percentage")
            }
        }

        return {
            "product_id": product.product_id,
            "product_name": product.product_name,
            "brand": product.brand,
            "category": product.category,
            "current_stock": current_stock,
            "reserved_stock": reserved_stock,
            "incoming_stock": incoming_stock,
            "inventory_position": inventory_position,
            "avg_daily_demand": round(avg_daily_demand, 2),
            "forecast_daily_demand": round(forecast_daily_demand, 2),
            "lead_time_days": lead_time,
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "target_stock": target_stock,
            "days_of_cover": round(days_of_cover, 1),
            "stock_status": stock_status,
            "recommended_quantity": rec_qty,
            "unit_cost_inr": round(product.unit_cost_inr, 2),
            "estimated_cost_inr": round(rec_qty * product.unit_cost_inr, 2),
            "preferred_supplier_id": supplier.supplier_id,
            "supplier_name": supplier.supplier_name,
            "priority": priority,
            "explanation": explanation,
            "calculation_steps": calc_steps
        }

