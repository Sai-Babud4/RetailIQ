# RetailIQ – Intelligent Inventory Monitoring and Automated Replenishment Agent

**MBA Business Analytics Major Project Report**  
**Application Name**: RetailIQ – AI-Powered Inventory Intelligence  
**Subtitle**: *Predict Demand. Prevent Stockouts. Optimise Replenishment.*  
**Author**: MBA Business Analytics Candidate  
**Date**: November 2026  
**Reference Dataset**: `RetailIQ_Inventory_Agent_Datasets.xlsx` (Authoritative Source)  

---

## 1. Executive Summary & Business Problem Formulation

Modern retail supermarket chains face a dual inventory challenge: **stockouts** of high-velocity fast-moving consumer goods (FMCG) and **overstocking** of slow-moving items. In traditional retail environments:
- Stockouts erode customer loyalty and incur direct top-line revenue losses.
- Overstocking ties up valuable working capital, incurs holding costs, and causes product spoilage—particularly in perishable categories like *Dairy & Eggs*, *Bakery*, and *Fresh Produce*.

**RetailIQ** solves this dilemma by deploying an autonomous AI decision agent that integrates:
1. Continuous 180-day sales transaction monitoring across 11,041 transaction records.
2. Statistical multi-model demand forecasting (Weighted Moving Averages, Seasonality, and Linear Trends) evaluated against real holdout sales.
3. Transparent deterministic replenishment mechanics that factor in supplier lead time, minimum order quantities (MOQ), case pack sizes, and supplier minimum order values (MOV).
4. Strict governance via **Human-in-the-Loop (HITL)** approval controls and automated webhook notifications through **Make.com**.

---

## 2. Authoritative Dataset Verification

All metrics, analytics, dashboards, and agent recommendations in RetailIQ are derived exclusively from `RetailIQ_Inventory_Agent_Datasets.xlsx`.

### Ingested Worksheets & Verified Totals:
- **Products Master**: 120 unique supermarket SKUs across 12 categories.
- **Sales Transactions**: 11,041 individual transactions spanning 180 calendar days (`2026-05-13` to `2026-11-08`).
  - Total Volume Sold: **24,304 units**.
  - Total Net Sales Revenue: **INR 13,658,372.87**.
- **Inventory Snapshot**: 120 product snapshots as of **8 November 2026**.
  - Physical Stock on Hand: **954 units**.
  - Total Inventory Valuation (at cost): **INR 423,468.89**.
- **Suppliers Master**: 20 regional FMCG distributors across Telangana and Andhra Pradesh.
- **Purchase Orders**: 250 historical and open purchase order lines.
- **Baseline Forecast**: 120 original Excel baseline forecast records.
- **Quality Benchmarks**: 10 out of 10 validation integrity checks PASSED (0 duplicate keys, 0 orphan foreign keys, 0 invalid quantities).

---

## 3. Mathematical Formulations & Business Rules

### A. Average Daily Demand ($\text{ADD}$)
To avoid demand distortions from days with zero sales, RetailIQ uses continuous calendar-day averaging over a rolling 30-day window:
$$\text{ADD} = \frac{\sum_{t=1}^{30} \text{Units Sold}_t}{30}$$

### B. Net Inventory Position ($\text{IP}$)
$$\text{IP} = \text{Current Stock} + \text{Incoming Stock} - \text{Reserved Stock}$$
*Crucial Control*: `Incoming Stock` includes **only** open orders in `Pending` or `In Transit` status. `Received`, `Delayed`, and `Cancelled` orders are excluded to prevent double-counting.

### C. Reorder Point ($\text{ROP}$)
$$\text{ROP} = (\text{ADD} \times L) + \text{Safety Stock}$$
Where:
- $L$ = Supplier lead time in calendar days (1 to 7 days).
- $\text{Safety Stock}$ = Buffer maintained against lead-time volatility and demand surges.

### D. Target Stock Level ($\text{TS}$)
$$\text{TS} = (\text{Forecast Daily Demand} \times (L + R)) + \text{Safety Stock}$$
Where:
- $R$ = Review period cycle (default: 7 calendar days).

### E. Replenishment Order Sizing
$$\text{Raw Gap} = \max(0, \text{TS} - \text{IP})$$
$$\text{Recommended Quantity} = \left\lceil \frac{\max(\text{Raw Gap}, \text{MOQ})}{P} \right\rceil \times P$$
Where:
- $\text{MOQ}$ = Supplier Minimum Order Quantity.
- $P$ = Standard case pack size.

---

## 4. Multi-Horizon Demand Forecasting & Validation

RetailIQ implements a statistical ensemble forecasting model:
1. **7-Day Moving Average**: Captures immediate short-term demand shifts.
2. **30-Day Moving Average**: Establishes medium-term consumption baseline.
3. **4-Week Weighted Moving Average (WMA)**: Applies progressive weekly weights ($0.1, 0.2, 0.3, 0.4$) prioritizing the most recent demand trends.
4. **Day-of-Week Seasonality Analysis**: Computes 7-day cyclical indices capturing weekend shopping spikes and weekday troughs.
5. **Trend Adjustment Ratio**: Computes slope over recent 15-day vs prior 15-day velocity, capped between $0.75$ and $1.35$.

### Holdout Evaluation Methodology
Rather than random train-test splitting (which violates temporal ordering in time series), RetailIQ evaluates forecast accuracy using a **14-day chronological holdout** test:
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{14} \sum_{t=1}^{14} |A_t - F_t|$$
- **Weighted Absolute Percentage Error (WAPE)**:
  $$\text{WAPE} = \frac{\sum_{t=1}^{14} |A_t - F_t|}{\sum_{t=1}^{14} A_t}$$
- **System Benchmark**: Achieves **82.4% overall accuracy** across all 120 SKUs with an average holdout MAE of **0.88 units/day**.

---

## 5. Technical Architecture

RetailIQ is architected as an enterprise full-stack web platform:
- **Frontend**:
  - React 18, TypeScript, Vite 5.
  - Tailwind CSS with custom enterprise palette: dark navy sidebar (`#0B1528`), clean white dashboard background (`#F8FAFC`).
  - Interactive Recharts visual charts (Area, Bar, Pie).
  - Lucide React iconography.
- **Backend**:
  - Python 3.11 with **FastAPI** high-performance asynchronous REST API.
  - **SQLAlchemy ORM** with SQLite database (`data/retailiq.db`).
  - **Pandas** & **NumPy** for vector-based analytics, aggregation, and time-series resamplings.
  - **OpenPyXL** for direct workbook inspection.
- **Integrations**:
  - **Make.com Webhooks**: Outbound dispatch for 6 lifecycle events.
  - **Deterministic AI Engine**: 100% offline-first decision pipeline requiring zero paid API keys.

---

## 6. The 10 MBA Analytical Reports Summary

1. **Sales Performance**: Total volume, revenue by sales channel (In-Store, Online, Quick-Commerce), store branch breakdown, and promotional elasticity.
2. **Inventory Valuation**: Total capitalization at cost price by department, ABC classification, and warehouse facility.
3. **Stockout Risk Analysis**: Out of stock and critical SKUs with projected daily lost revenue.
4. **Overstocking Analysis**: Excess capital tied up beyond 30 days of cover, highlighting perishability risk.
5. **Inventory Turnover & DSI**: Annualized COGS divided by inventory value yielding an optimal **18.6x turnover** and **19.6 days DSI**.
6. **Replenishment Expenditure**: Projected procurement capital by supplier and urgency level.
7. **Supplier Performance**: Reliability index benchmarking vs empirical on-time fulfillment rates.
8. **Demand Forecasting**: 7, 14, and 30-day cumulative unit demand projections across all 12 categories.
9. **Forecast Errors**: Granular holdout MAE and WAPE accuracy benchmarks.
10. **AI Agent Audit Log**: Immutable record of all autonomous evaluations, approvals, and order generation.

---

## 7. Conclusion & Academic Evaluation Checklist

RetailIQ demonstrates how modern business analytics transforms raw supermarket data into autonomous, explainable supply chain intelligence. By adhering strictly to authoritative records and enforcing mathematical rigor, the platform prevents inventory stockouts, optimizes supplier procurement, and safeguards retail profitability.

