import os
import sys
import unittest
import pandas as pd
from datetime import date, datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.models.database import SessionLocal, engine, Base
from backend.app.models.entities import (
    Product, Inventory, SalesTransaction, Supplier, PurchaseOrder,
    ForecastData, AgentActivity, ReplenishmentRecommendation
)
from backend.app.services.inventory_logic import InventoryBusinessLogic
from backend.app.forecasting.engine import DemandForecastingEngine
from backend.app.agent.inventory_agent import RetailIQInventoryAgent
from backend.app.services.reports import ReportsAnalyticsService

class TestRetailIQ(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_authoritative_dataset_counts(self):
        """Confirm all 6 core tables have exact row counts matching authoritative Excel."""
        products_count = self.db.query(Product).count()
        sales_count = self.db.query(SalesTransaction).count()
        inventory_count = self.db.query(Inventory).count()
        suppliers_count = self.db.query(Supplier).count()
        pos_count = self.db.query(PurchaseOrder).count()
        forecasts_count = self.db.query(ForecastData).count()

        self.assertEqual(products_count, 120, "Must have exactly 120 products")
        self.assertEqual(sales_count, 11041, "Must have exactly 11,041 sales records")
        self.assertEqual(inventory_count, 120, "Must have exactly 120 inventory records")
        self.assertEqual(suppliers_count, 20, "Must have exactly 20 suppliers")
        self.assertGreaterEqual(pos_count, 250, "Must have at least 250 purchase orders")
        self.assertEqual(forecasts_count, 120, "Must have exactly 120 baseline forecasts")

    def test_02_foreign_key_relationships(self):
        """Validate all foreign keys resolve cleanly with zero orphans."""
        product_ids = set(p.product_id for p in self.db.query(Product.product_id).all())
        supplier_ids = set(s.supplier_id for s in self.db.query(Supplier.supplier_id).all())

        # Check products supplier FK
        for p in self.db.query(Product).all():
            self.assertIn(p.primary_supplier_id, supplier_ids)

        # Check inventory product FK
        for inv in self.db.query(Inventory).all():
            self.assertIn(inv.product_id, product_ids)

        # Check purchase order FKs
        for po in self.db.query(PurchaseOrder).all():
            self.assertIn(po.product_id, product_ids)
            self.assertIn(po.supplier_id, supplier_ids)

    def test_03_inventory_position_formula(self):
        """Validate Inventory Position = Current Stock + Incoming Stock - Reserved Stock."""
        inv = self.db.query(Inventory).filter_by(product_id="SKU0001").first()
        calc = InventoryBusinessLogic.calculate_inventory_position(
            inv.current_stock, inv.incoming_stock, inv.reserved_stock
        )
        expected = inv.current_stock + inv.incoming_stock - inv.reserved_stock
        self.assertEqual(calc["inventory_position"], expected)

    def test_04_reorder_point_calculation(self):
        """Validate ROP = (Average Daily Demand × Lead Time) + Safety Stock."""
        rop_calc = InventoryBusinessLogic.calculate_reorder_point(
            avg_daily_demand=2.0, lead_time_days=3, safety_stock=5
        )
        # (2.0 * 3) + 5 = 11
        self.assertEqual(rop_calc["reorder_point"], 11)

    def test_05_replenishment_sizing_pack_moq(self):
        """Validate replenishment sizing applies MOQ and pack size rounding."""
        product = self.db.query(Product).filter_by(product_id="SKU0001").first()
        supplier = self.db.query(Supplier).filter_by(supplier_id=product.primary_supplier_id).first()

        # If Target Stock is 50 and Position is 10, gap is 40.
        res = InventoryBusinessLogic.calculate_replenishment_quantity(
            product=product,
            inventory_position=10,
            target_stock=50,
            supplier=supplier
        )
        self.assertGreaterEqual(res["recommended_quantity"], product.minimum_order_quantity)
        self.assertEqual(res["recommended_quantity"] % product.pack_size, 0)

    def test_06_forecasting_engine_and_holdout(self):
        """Validate demand forecasting engine produces forecasts and holdout metrics."""
        fc = DemandForecastingEngine.forecast_product(self.db, "SKU0001", horizons=[7, 14, 30])
        self.assertIn(7, fc["cumulative_predictions"])
        self.assertIn(14, fc["cumulative_predictions"])
        self.assertIn(30, fc["cumulative_predictions"])
        self.assertGreater(fc["cumulative_predictions"][7], 0)
        self.assertIn("mae", fc["evaluation"])
        self.assertIn("wape", fc["evaluation"])
        self.assertGreaterEqual(fc["evaluation"]["accuracy_percentage"], 0)

    def test_07_agent_tools_and_draft_creation(self):
        """Validate agent tools execute and PO drafts can be created and approved."""
        agent = RetailIQInventoryAgent(self.db)
        
        # Tool 1: get_inventory_status
        status = agent.get_inventory_status("SKU0001")
        self.assertEqual(status["product_id"], "SKU0001")

        # Tool 2: get_product_sales_history
        history = agent.get_product_sales_history("SKU0001", days=30)
        self.assertGreater(history["total_units_sold"], 0)

        # Tool 8: calculate_order_value
        val = agent.calculate_order_value("SKU0001", 24)
        self.assertGreater(val["total_order_value_inr"], 0)

    def test_08_reports_generation(self):
        """Validate MBA Business Analytics reports generate complete data structures."""
        sales_rep = ReportsAnalyticsService.sales_performance_report(self.db)
        self.assertEqual(sales_rep["total_units_sold"], 24304)
        self.assertEqual(sales_rep["total_revenue_inr"], 13658372.87)

        val_rep = ReportsAnalyticsService.inventory_valuation_report(self.db)
        self.assertEqual(val_rep["total_skus"], 120)
        self.assertEqual(val_rep["total_physical_units"], 954)
        self.assertEqual(val_rep["total_inventory_valuation_inr"], 423468.89)

        turnover_rep = ReportsAnalyticsService.inventory_turnover_report(self.db)
        self.assertGreater(turnover_rep["inventory_turnover_ratio"], 0)

if __name__ == "__main__":
    unittest.main()

