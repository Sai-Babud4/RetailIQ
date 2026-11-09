import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.models.database import SessionLocal
from backend.app.services.reports import ReportsAnalyticsService

def test_reports():
    db = SessionLocal()
    print("Testing all 10 MBA Analytical Reports...")
    
    report_types = [
        ("sales", lambda: ReportsAnalyticsService.sales_performance_report(db)),
        ("valuation", lambda: ReportsAnalyticsService.inventory_valuation_report(db)),
        ("stockouts", lambda: ReportsAnalyticsService.stockout_analysis_report(db)),
        ("overstocking", lambda: ReportsAnalyticsService.overstocking_analysis_report(db)),
        ("turnover", lambda: ReportsAnalyticsService.inventory_turnover_report(db)),
        ("expenditure", lambda: ReportsAnalyticsService.replenishment_expenditure_report(db)),
        ("suppliers", lambda: ReportsAnalyticsService.supplier_performance_report(db)),
        ("forecasts", lambda: ReportsAnalyticsService.demand_forecasting_report(db)),
        ("errors", lambda: ReportsAnalyticsService.forecast_errors_report(db)),
        ("agent", lambda: ReportsAnalyticsService.agent_performance_report(db)),
    ]

    for name, func_call in report_types:
        try:
            data = func_call()
            rep_name = data.get("report_name", name)
            print(f"  [OK] Report '{name}': '{rep_name}' - Generated successfully ({len(data)} top-level metrics).")
        except Exception as e:
            print(f"  [FAIL] Report '{name}': Error: {e}")
            raise e
    
    db.close()
    print("\nAll 10 reports verified successfully!")

if __name__ == "__main__":
    test_reports()

