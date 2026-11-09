from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime, Boolean, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(String(50), primary_key=True, index=True)
    supplier_name = Column(String(255), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    average_lead_time_days = Column(Integer, nullable=False, default=1)
    supplier_reliability = Column(Float, nullable=False, default=0.9)
    minimum_order_value_inr = Column(Float, nullable=False, default=0.0)
    payment_terms = Column(String(50), nullable=False, default="30 days")
    supplier_status = Column(String(50), nullable=False, default="Active")

    products = relationship("Product", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

    def to_dict(self):
        return {
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier_name,
            "city": self.city,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "average_lead_time_days": self.average_lead_time_days,
            "supplier_reliability": round(self.supplier_reliability, 3),
            "minimum_order_value_inr": round(self.minimum_order_value_inr, 2),
            "payment_terms": self.payment_terms,
            "supplier_status": self.supplier_status
        }


class Product(Base):
    __tablename__ = "products"

    product_id = Column(String(50), primary_key=True, index=True)
    product_name = Column(String(255), nullable=False, index=True)
    brand = Column(String(100), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100), nullable=False)
    unit_of_measure = Column(String(50), nullable=False, default="unit")
    unit_cost_inr = Column(Float, nullable=False)
    selling_price_inr = Column(Float, nullable=False)
    primary_supplier_id = Column(String(50), ForeignKey("suppliers.supplier_id"), nullable=False, index=True)
    minimum_order_quantity = Column(Integer, nullable=False, default=1)
    pack_size = Column(Integer, nullable=False, default=1)
    shelf_life_days = Column(Integer, nullable=False, default=30)
    abc_classification = Column(String(10), nullable=False, default="B", index=True)
    product_status = Column(String(50), nullable=False, default="Active")

    supplier = relationship("Supplier", back_populates="products")
    inventory = relationship("Inventory", back_populates="product", uselist=False)
    sales = relationship("SalesTransaction", back_populates="product")
    purchase_orders = relationship("PurchaseOrder", back_populates="product")
    forecasts = relationship("ForecastData", back_populates="product")
    recommendation = relationship("ReplenishmentRecommendation", back_populates="product", uselist=False)

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "brand": self.brand,
            "category": self.category,
            "subcategory": self.subcategory,
            "unit_of_measure": self.unit_of_measure,
            "unit_cost_inr": round(self.unit_cost_inr, 2),
            "selling_price_inr": round(self.selling_price_inr, 2),
            "primary_supplier_id": self.primary_supplier_id,
            "supplier_name": self.supplier.supplier_name if self.supplier else None,
            "minimum_order_quantity": self.minimum_order_quantity,
            "pack_size": self.pack_size,
            "shelf_life_days": self.shelf_life_days,
            "abc_classification": self.abc_classification,
            "product_status": self.product_status
        }


class SalesTransaction(Base):
    __tablename__ = "sales_transactions"

    transaction_id = Column(String(50), primary_key=True, index=True)
    transaction_date = Column(DateTime, nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    quantity_sold = Column(Integer, nullable=False)
    unit_price_inr = Column(Float, nullable=False)
    discount_rate = Column(Float, nullable=False, default=0.0)
    net_sales_inr = Column(Float, nullable=False)
    sales_channel = Column(String(50), nullable=False, default="In-Store")
    store_id = Column(String(50), nullable=False, default="SEC-01")
    promotion_flag = Column(String(10), nullable=False, default="No")

    product = relationship("Product", back_populates="sales")

    __table_args__ = (
        Index("idx_sales_date_product", "transaction_date", "product_id"),
        Index("idx_sales_date_category", "transaction_date", "category"),
    )

    def to_dict(self):
        return {
            "transaction_id": self.transaction_id,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "category": self.category,
            "quantity_sold": self.quantity_sold,
            "unit_price_inr": round(self.unit_price_inr, 2),
            "discount_rate": round(self.discount_rate, 2),
            "net_sales_inr": round(self.net_sales_inr, 2),
            "sales_channel": self.sales_channel,
            "store_id": self.store_id,
            "promotion_flag": self.promotion_flag
        }


class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(String(50), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), unique=True, nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False)
    current_stock = Column(Integer, nullable=False, default=0)
    reserved_stock = Column(Integer, nullable=False, default=0)
    incoming_stock = Column(Integer, nullable=False, default=0)
    safety_stock = Column(Integer, nullable=False, default=0)
    reorder_point = Column(Integer, nullable=False, default=0)
    target_stock_days = Column(Integer, nullable=False, default=14)
    avg_daily_demand_30d = Column(Float, nullable=False, default=0.0)
    inventory_position = Column(Integer, nullable=False, default=0)
    days_of_cover = Column(Float, nullable=False, default=0.0)
    warehouse_location = Column(String(50), nullable=False, default="HYD-01", index=True)
    last_updated = Column(Date, nullable=False)
    stock_status = Column(String(50), nullable=False, default="Healthy", index=True)

    product = relationship("Product", back_populates="inventory")

    def to_dict(self):
        cost = self.product.unit_cost_inr if self.product else 0.0
        val = cost * self.current_stock
        return {
            "inventory_id": self.inventory_id,
            "product_id": self.product_id,
            "product_name": self.product.product_name if self.product else "",
            "brand": self.product.brand if self.product else "",
            "category": self.product.category if self.product else "",
            "snapshot_date": self.snapshot_date.isoformat() if self.snapshot_date else None,
            "current_stock": self.current_stock,
            "reserved_stock": self.reserved_stock,
            "incoming_stock": self.incoming_stock,
            "safety_stock": self.safety_stock,
            "reorder_point": self.reorder_point,
            "target_stock_days": self.target_stock_days,
            "avg_daily_demand_30d": round(self.avg_daily_demand_30d, 2),
            "inventory_position": self.inventory_position,
            "days_of_cover": round(self.days_of_cover, 1),
            "warehouse_location": self.warehouse_location,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "stock_status": self.stock_status,
            "unit_cost_inr": round(cost, 2),
            "inventory_value_inr": round(val, 2)
        }


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    po_id = Column(String(50), primary_key=True, index=True)
    order_date = Column(Date, nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), nullable=False, index=True)
    supplier_id = Column(String(50), ForeignKey("suppliers.supplier_id"), nullable=False, index=True)
    order_quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, nullable=False, default=0)
    unit_cost_inr = Column(Float, nullable=False)
    total_order_value_inr = Column(Float, nullable=False)
    expected_delivery_date = Column(Date, nullable=False)
    actual_delivery_date = Column(Date, nullable=True)
    po_status = Column(String(50), nullable=False, default="Pending", index=True)
    is_generated = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    product = relationship("Product", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")

    def to_dict(self):
        return {
            "po_id": self.po_id,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "product_id": self.product_id,
            "product_name": self.product.product_name if self.product else "",
            "category": self.product.category if self.product else "",
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.supplier_name if self.supplier else "",
            "order_quantity": self.order_quantity,
            "received_quantity": self.received_quantity,
            "unit_cost_inr": round(self.unit_cost_inr, 2),
            "total_order_value_inr": round(self.total_order_value_inr, 2),
            "expected_delivery_date": self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            "actual_delivery_date": self.actual_delivery_date.isoformat() if self.actual_delivery_date else None,
            "po_status": self.po_status,
            "is_generated": self.is_generated,
            "notes": self.notes
        }


class ForecastData(Base):
    __tablename__ = "forecast_data"

    forecast_id = Column(String(50), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), nullable=False, index=True)
    forecast_generated_for_date = Column(Date, nullable=False)
    forecast_horizon_days = Column(Integer, nullable=False, default=7)
    predicted_demand_7_days = Column(Float, nullable=False, default=0.0)
    predicted_demand_14_days = Column(Float, nullable=False, default=0.0)
    predicted_demand_30_days = Column(Float, nullable=False, default=0.0)
    forecast_method = Column(String(255), nullable=False)
    trend_adjustment = Column(Float, nullable=False, default=1.0)
    demand_trend = Column(String(50), nullable=False, default="Stable", index=True)
    generated_on = Column(Date, nullable=False)

    product = relationship("Product", back_populates="forecasts")

    def to_dict(self):
        return {
            "forecast_id": self.forecast_id,
            "product_id": self.product_id,
            "product_name": self.product.product_name if self.product else "",
            "category": self.product.category if self.product else "",
            "forecast_generated_for_date": self.forecast_generated_for_date.isoformat() if self.forecast_generated_for_date else None,
            "forecast_horizon_days": self.forecast_horizon_days,
            "predicted_demand_7_days": round(self.predicted_demand_7_days, 1),
            "predicted_demand_14_days": round(self.predicted_demand_14_days, 1),
            "predicted_demand_30_days": round(self.predicted_demand_30_days, 1),
            "forecast_method": self.forecast_method,
            "trend_adjustment": round(self.trend_adjustment, 3),
            "demand_trend": self.demand_trend,
            "generated_on": self.generated_on.isoformat() if self.generated_on else None
        }


class AgentActivity(Base):
    __tablename__ = "agent_activities"

    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    product_id = Column(String(50), nullable=True, index=True)
    product_name = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    current_stock = Column(Integer, nullable=True)
    reorder_point = Column(Integer, nullable=True)
    recommended_quantity = Column(Integer, nullable=True)
    priority = Column(String(50), nullable=False, default="Low", index=True)
    decision_status = Column(String(50), nullable=False, default="Recommended", index=True)
    details = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "activity_id": self.activity_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "action": self.action,
            "reason": self.reason,
            "current_stock": self.current_stock,
            "reorder_point": self.reorder_point,
            "recommended_quantity": self.recommended_quantity,
            "priority": self.priority,
            "decision_status": self.decision_status,
            "details": self.details
        }


class ReplenishmentRecommendation(Base):
    __tablename__ = "replenishment_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), unique=True, nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    current_stock = Column(Integer, nullable=False)
    inventory_position = Column(Integer, nullable=False)
    daily_demand = Column(Float, nullable=False)
    forecast_demand = Column(Float, nullable=False)
    lead_time = Column(Integer, nullable=False)
    reorder_point = Column(Integer, nullable=False)
    target_stock = Column(Integer, nullable=False)
    recommended_quantity = Column(Integer, nullable=False)
    preferred_supplier_id = Column(String(50), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    unit_cost_inr = Column(Float, nullable=False)
    estimated_cost_inr = Column(Float, nullable=False)
    priority = Column(String(50), nullable=False, index=True)
    ai_explanation = Column(Text, nullable=False)
    calculation_steps = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Pending", index=True)
    last_evaluated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    product = relationship("Product", back_populates="recommendation")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "category": self.category,
            "current_stock": self.current_stock,
            "inventory_position": self.inventory_position,
            "daily_demand": round(self.daily_demand, 2),
            "forecast_demand": round(self.forecast_demand, 2),
            "lead_time": self.lead_time,
            "reorder_point": self.reorder_point,
            "target_stock": self.target_stock,
            "recommended_quantity": self.recommended_quantity,
            "preferred_supplier_id": self.preferred_supplier_id,
            "supplier_name": self.supplier_name,
            "unit_cost_inr": round(self.unit_cost_inr, 2),
            "estimated_cost_inr": round(self.estimated_cost_inr, 2),
            "priority": self.priority,
            "ai_explanation": self.ai_explanation,
            "calculation_steps": self.calculation_steps,
            "status": self.status,
            "last_evaluated_at": self.last_evaluated_at.isoformat() if self.last_evaluated_at else None
        }


class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    import_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    total_records = Column(Integer, nullable=False)
    sheet_counts = Column(Text, nullable=False)
    snapshot_date = Column(String(50), nullable=False)
    historical_start_date = Column(String(50), nullable=False)
    historical_end_date = Column(String(50), nullable=False)
    validation_summary = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "import_timestamp": self.import_timestamp.isoformat() if self.import_timestamp else None,
            "total_records": self.total_records,
            "sheet_counts": self.sheet_counts,
            "snapshot_date": self.snapshot_date,
            "historical_start_date": self.historical_start_date,
            "historical_end_date": self.historical_end_date,
            "validation_summary": self.validation_summary
        }


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "description": self.description,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

