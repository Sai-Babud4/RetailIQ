# RETAILIQ DATASET VALIDATION REPORT
**Dataset File**: `RetailIQ_Inventory_Agent_Datasets.xlsx`
**Validation Timestamp**: `2026-11-09T20:30:00`

## 1. Row Count Verification
| Worksheet | Actual Rows | Expected Rows | Status |
|---|---|---|---|
| Products | 120 | 120 | PASS |
| Sales_Transactions | 11041 | 11041 | PASS |
| Inventory | 120 | 120 | PASS |
| Suppliers | 20 | 20 | PASS |
| Purchase_Orders | 250 | 250 | PASS |
| Forecast_Data | 120 | 120 | PASS |

## 2. Primary Key Uniqueness
| Worksheet | Primary Key | Unique Count | Duplicate Count | Status |
|---|---|---|---|---|
| Products | Product_ID | 120 | 0 | PASS |
| Sales_Transactions | Transaction_ID | 11041 | 0 | PASS |
| Inventory | Inventory_ID | 120 | 0 | PASS |
| Suppliers | Supplier_ID | 20 | 0 | PASS |
| Purchase_Orders | PO_ID | 250 | 0 | PASS |
| Forecast_Data | Forecast_ID | 120 | 0 | PASS |

## 3. Foreign Key Relationship Integrity
| Source Table.Column | Target Table.Column | Orphan Count | Status |
|---|---|---|---|
| Sales_Transactions.Product_ID | Products.Product_ID | 0 | PASS |
| Inventory.Product_ID | Products.Product_ID | 0 | PASS |
| Purchase_Orders.Product_ID | Products.Product_ID | 0 | PASS |
| Forecast_Data.Product_ID | Products.Product_ID | 0 | PASS |
| Products.Primary_Supplier_ID | Suppliers.Supplier_ID | 0 | PASS |
| Purchase_Orders.Supplier_ID | Suppliers.Supplier_ID | 0 | PASS |

## 4. Missing Values Inspection
| Table | Total Nulls | Columns with Nulls | Notes |
|---|---|---|---|
| Products | 0 | `{}` | Clean |
| Sales_Transactions | 0 | `{}` | Clean |
| Inventory | 0 | `{}` | Clean |
| Suppliers | 0 | `{}` | Clean |
| Purchase_Orders | 80 | `{'Actual_Delivery_Date': 80}` | Allowed: Actual_Delivery_Date is null for open/pending/cancelled POs (80 rows) |
| Forecast_Data | 0 | `{}` | Clean |

## 5. Date Column Validation
- **Sales Transactions Period**: `2026-05-13` to `2026-11-08` (180 days)
- **Inventory Snapshot Date**: `2026-11-08`

## 6. Numerical & Logical Boundaries
| Metric | Result | Status |
|---|---|---|
| Negative/Zero Sales Quantity | 0 | PASS |
| Negative Net Sales Revenue | 0 | PASS |
| Negative Current Stock | 0 | PASS |
| Invalid Supplier Lead Time | 0 | PASS |
| Invalid PO Order Quantity | 0 | PASS |

## 7. Business Baseline Totals
- **Total Sales Volume**: `24,304` units
- **Total Sales Revenue**: `INR 13,658,372.87`
- **Total Inventory On Hand**: `954` units
- **Total Inventory Valuation**: `INR 423,468.89`
- **Unique Supermarket Categories**: `12` categories

## 8. Stock Health Distribution (Baseline)
| Stock Status | Product Count | Percentage |
|---|---|---|
| Healthy | 40 | 33.3% |
| Out of Stock | 29 | 24.2% |
| Critical | 22 | 18.3% |
| Overstocked | 15 | 12.5% |
| Low Stock | 14 | 11.7% |
