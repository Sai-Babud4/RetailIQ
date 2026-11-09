import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import SalesTransaction, Product, ForecastData

class DemandForecastingEngine:
    """
    RetailIQ Advanced Demand Forecasting Engine.
    Implements:
      1. 7-day Moving Average (7D MA)
      2. 30-day Moving Average (30D MA)
      3. Weighted Moving Average (WMA with higher weights on recent weeks)
      4. Trend-Based Demand Adjustment (linear regression slope)
      5. Day-of-Week Seasonality Analysis (7-day pattern multipliers)
      6. Evaluation via chronological holdout testing (Holdout MAE & WAPE)
    """

    @staticmethod
    def get_product_daily_series(db: Session, product_id: str, end_date: datetime.date = None) -> pd.Series:
        """
        Retrieves continuous daily sales series for a product, ensuring zero-sales calendar days are included.
        """
        query = db.query(SalesTransaction).filter(SalesTransaction.product_id == product_id)
        if end_date:
            query = query.filter(SalesTransaction.transaction_date <= datetime.combine(end_date, datetime.max.time()))
        
        txs = query.order_by(SalesTransaction.transaction_date.asc()).all()
        if not txs:
            return pd.Series(dtype=float)

        dates = [t.transaction_date.date() for t in txs]
        quantities = [t.quantity_sold for t in txs]

        df = pd.DataFrame({"date": pd.to_datetime(dates), "quantity": quantities})
        df_daily = df.groupby("date")["quantity"].sum()

        # Reindex to full calendar range from min date to snapshot date (2026-11-08 or end_date)
        min_date = df_daily.index.min()
        max_date = pd.to_datetime(end_date if end_date else "2026-11-08")
        full_idx = pd.date_range(start=min_date, end=max_date, freq="D")
        daily_series = df_daily.reindex(full_idx, fill_value=0)
        return daily_series

    @classmethod
    def calculate_day_of_week_multipliers(cls, series: pd.Series) -> Dict[int, float]:
        """
        Calculates seasonality index for Monday=0 ... Sunday=6.
        """
        if len(series) < 14:
            return {i: 1.0 for i in range(7)}

        mean_val = series.mean()
        if mean_val <= 0:
            return {i: 1.0 for i in range(7)}

        dow = series.index.dayofweek
        dow_means = series.groupby(dow).mean()
        multipliers = {}
        for i in range(7):
            val = dow_means.get(i, mean_val)
            multipliers[i] = float(val / mean_val) if mean_val > 0 else 1.0
        return multipliers

    @classmethod
    def forecast_product(
        cls,
        db: Session,
        product_id: str,
        horizons: List[int] = [7, 14, 30],
        method: str = "ensemble"
    ) -> Dict[str, Any]:
        """
        Generates 7, 14, and 30 day demand forecasts using statistical models.
        """
        series = cls.get_product_daily_series(db, product_id)
        if len(series) < 30:
            return {
                "product_id": product_id,
                "error": "Insufficient sales history",
                "predictions": {h: 0.0 for h in horizons}
            }

        # 1. 7D MA
        ma_7 = float(series.tail(7).mean())
        # 2. 30D MA
        ma_30 = float(series.tail(30).mean())
        
        # 3. Weighted Moving Average (Last 4 weeks weights: 0.1, 0.2, 0.3, 0.4)
        w4 = series.tail(7).mean()
        w3 = series.tail(14).head(7).mean()
        w2 = series.tail(21).head(7).mean()
        w1 = series.tail(28).head(7).mean()
        wma = float(0.1 * w1 + 0.2 * w2 + 0.3 * w3 + 0.4 * w4)

        # 4. Trend calculation over last 30 days
        last_30 = series.tail(30).values
        x = np.arange(len(last_30))
        if len(last_30) > 1 and np.var(x) > 0:
            slope, intercept = np.polyfit(x, last_30, 1)
        else:
            slope = 0.0

        # Trend multiplier
        first_half = series.tail(30).head(15).mean()
        second_half = series.tail(15).mean()
        if first_half > 0:
            trend_ratio = second_half / first_half
            trend_adjustment = float(np.clip(trend_ratio, 0.75, 1.35))
        else:
            trend_adjustment = 1.0

        if trend_adjustment > 1.05:
            demand_trend = "Increasing"
        elif trend_adjustment < 0.95:
            demand_trend = "Decreasing"
        else:
            demand_trend = "Stable"

        # 5. Day-of-week multipliers
        dow_multipliers = cls.calculate_day_of_week_multipliers(series)

        # Base daily forecast
        base_daily_demand = (0.5 * wma + 0.3 * ma_7 + 0.2 * ma_30) * trend_adjustment
        base_daily_demand = max(0.05, float(base_daily_demand))

        # Project for upcoming days starting 2026-11-09
        start_date = series.index.max() + timedelta(days=1)
        daily_projections = []
        cumulative_predictions = {}

        for day_offset in range(1, 31):
            future_date = start_date + timedelta(days=day_offset - 1)
            dow = future_date.dayofweek
            seasonality = dow_multipliers.get(dow, 1.0)
            # Slight dampening for long horizons
            horizon_damp = 1.0 - (day_offset * 0.003)
            projected = max(0.0, base_daily_demand * seasonality * horizon_damp)
            daily_projections.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "day_name": future_date.strftime("%a"),
                "predicted_demand": round(projected, 2)
            })
            if day_offset in horizons:
                cum_sum = sum(p["predicted_demand"] for p in daily_projections[:day_offset])
                cumulative_predictions[day_offset] = round(cum_sum, 1)

        # Accuracy evaluation using 14-day holdout
        eval_metrics = cls.evaluate_model(series)

        # Fetch Excel baseline forecast
        baseline = db.query(ForecastData).filter_by(product_id=product_id).first()
        baseline_info = baseline.to_dict() if baseline else None

        return {
            "product_id": product_id,
            "base_daily_demand": round(base_daily_demand, 2),
            "ma_7": round(ma_7, 2),
            "ma_30": round(ma_30, 2),
            "wma": round(wma, 2),
            "trend_slope": round(float(slope), 4),
            "trend_adjustment": round(trend_adjustment, 3),
            "demand_trend": demand_trend,
            "cumulative_predictions": cumulative_predictions,
            "daily_projections": daily_projections,
            "evaluation": eval_metrics,
            "excel_baseline": baseline_info
        }

    @classmethod
    def evaluate_model(cls, series: pd.Series, holdout_days: int = 14) -> Dict[str, Any]:
        """
        Time-based chronological holdout evaluation (train on historical period except last N days).
        Calculates MAE and WAPE.
        """
        if len(series) < holdout_days + 30:
            return {"mae": 0.0, "wape": 0.0, "status": "insufficient_data"}

        train = series.iloc[:-holdout_days]
        actuals = series.iloc[-holdout_days:].values

        # Generate holdout predictions using train data
        w4 = train.tail(7).mean()
        w3 = train.tail(14).head(7).mean()
        w2 = train.tail(21).head(7).mean()
        w1 = train.tail(28).head(7).mean()
        wma = float(0.1 * w1 + 0.2 * w2 + 0.3 * w3 + 0.4 * w4)

        dow_mults = cls.calculate_day_of_week_multipliers(train)
        holdout_dates = series.iloc[-holdout_days:].index

        predictions = []
        for d in holdout_dates:
            dow = d.dayofweek
            pred = max(0.0, wma * dow_mults.get(dow, 1.0))
            predictions.append(pred)

        preds = np.array(predictions)
        abs_errors = np.abs(actuals - preds)
        mae = float(np.mean(abs_errors))
        
        sum_actuals = float(np.sum(actuals))
        if sum_actuals > 0:
            wape = float(np.sum(abs_errors) / sum_actuals)
        else:
            wape = 0.0

        accuracy_pct = max(0.0, min(100.0, (1.0 - wape) * 100))

        return {
            "holdout_days": holdout_days,
            "mae": round(mae, 2),
            "wape": round(wape, 4),
            "wape_percentage": round(wape * 100, 2),
            "accuracy_percentage": round(accuracy_pct, 1),
            "total_holdout_actuals": round(sum_actuals, 1),
            "total_holdout_predicted": round(float(np.sum(preds)), 1)
        }

    @classmethod
    def get_category_forecast(cls, db: Session, category: str) -> Dict[str, Any]:
        """
        Aggregates demand forecast across all products in a category.
        """
        products = db.query(Product).filter(Product.category == category).all()
        if not products:
            return {"category": category, "total_products": 0}

        cat_pred_7 = 0.0
        cat_pred_14 = 0.0
        cat_pred_30 = 0.0
        trend_counts = {"Increasing": 0, "Decreasing": 0, "Stable": 0}

        product_summaries = []
        for p in products:
            fc = cls.forecast_product(db, p.product_id)
            preds = fc.get("cumulative_predictions", {})
            p7 = preds.get(7, 0.0)
            p14 = preds.get(14, 0.0)
            p30 = preds.get(30, 0.0)

            cat_pred_7 += p7
            cat_pred_14 += p14
            cat_pred_30 += p30

            trend = fc.get("demand_trend", "Stable")
            trend_counts[trend] = trend_counts.get(trend, 0) + 1

            product_summaries.append({
                "product_id": p.product_id,
                "product_name": p.product_name,
                "predicted_7d": p7,
                "predicted_14d": p14,
                "predicted_30d": p30,
                "demand_trend": trend,
                "accuracy_pct": fc.get("evaluation", {}).get("accuracy_percentage", 0)
            })

        dominant_trend = max(trend_counts, key=trend_counts.get)

        return {
            "category": category,
            "total_products": len(products),
            "predicted_demand_7_days": round(cat_pred_7, 1),
            "predicted_demand_14_days": round(cat_pred_14, 1),
            "predicted_demand_30_days": round(cat_pred_30, 1),
            "trend_distribution": trend_counts,
            "dominant_trend": dominant_trend,
            "products": product_summaries
        }

    @classmethod
    def get_system_forecast_evaluation(cls, db: Session) -> Dict[str, Any]:
        """
        Computes overall model accuracy and benchmark comparisons across all 120 SKUs.
        """
        products = db.query(Product).all()
        mae_list = []
        wape_list = []
        trend_summary = {"Increasing": 0, "Decreasing": 0, "Stable": 0}

        sku_evaluations = []
        for p in products:
            fc = cls.forecast_product(db, p.product_id)
            ev = fc.get("evaluation", {})
            if ev.get("status") != "insufficient_data":
                mae_list.append(ev["mae"])
                wape_list.append(ev["wape"])
                sku_evaluations.append({
                    "product_id": p.product_id,
                    "product_name": p.product_name,
                    "category": p.category,
                    "mae": ev["mae"],
                    "wape": ev["wape"],
                    "accuracy_pct": ev["accuracy_percentage"],
                    "trend": fc["demand_trend"]
                })
            trend = fc.get("demand_trend", "Stable")
            trend_summary[trend] = trend_summary.get(trend, 0) + 1

        avg_mae = float(np.mean(mae_list)) if mae_list else 0.0
        avg_wape = float(np.mean(wape_list)) if wape_list else 0.0
        overall_accuracy = max(0.0, min(100.0, (1.0 - avg_wape) * 100))

        return {
            "evaluated_products_count": len(mae_list),
            "average_mae": round(avg_mae, 2),
            "average_wape": round(avg_wape, 4),
            "overall_accuracy_percentage": round(overall_accuracy, 1),
            "evaluation_methodology": "14-day holdout out-of-sample backtesting against true historical transactions",
            "trend_distribution": trend_summary,
            "sku_evaluations": sorted(sku_evaluations, key=lambda x: x["accuracy_pct"], reverse=True)
        }

