# RetailIQ – Complete Data Dictionary

This document details the data schemas, primary keys, foreign keys, data types, and business rules across the **10 worksheets** of the authoritative Excel dataset: `RetailIQ_Inventory_Agent_Datasets.xlsx`.

---

## 1. Products Master (`Products`)
**Primary Key**: `Product_ID` (Format: `SKU0001` - `SKU0120`)  
**Row Count**: 120 SKUs across 12 supermarket categories.

| Column Name | Data Type | Key/Constraint | Description |
|---|---|---|---|
| `Product_ID` | Text (String) | Primary Key | Unique 7-character SKU identifier. Leading zeros preserved. |
| `Product_Name` | Text (String) | Not Null | Commercial item title (e.g., Milk 1L, Toor Dal 1kg). |
| `Brand` | Text (String) | Not Null | Manufacturer brand label (e.g., GreenBasket, SunField, Aarav). |
| `Category` | Text (String) | Not Null, Index | 1 of 12 Supermarket departments (e.g. Dairy & Eggs, Staples). |
| `Subcategory` | Text (String) | Not Null | Departmental sub-segment. |
| `Unit_of_Measure` | Text (String) | Default 'unit' | Standard stocking unit. |
| `Unit_Cost_INR` | Decimal (Float) | > 0 | Landed cost paid to supplier in Indian Rupees. |
| `Selling_Price_INR`| Decimal (Float) | > Unit_Cost | Shelf retail price in Indian Rupees. |
| `Primary_Supplier_ID`| Text (String) | FK -> `Suppliers.Supplier_ID` | Preferred vendor identifier. |
| `Minimum_Order_Quantity`| Integer | >= 1 | Smallest order quantity accepted by supplier (MOQ). |
| `Pack_Size` | Integer | >= 1 | Case / bundle size for purchasing increments. |
| `Shelf_Life_Days` | Integer | >= 7 | Days before perishable expiration. |
| `ABC_Classification` | Text (A, B, C) | Category | Pareto revenue classification. |
| `Product_Status` | Text (String) | Default 'Active' | Lifecycle status (Active, Inactive). |

---

## 2. Sales Transactions (`Sales_Transactions`)
**Primary Key**: `Transaction_ID` (Format: `TX00000001` - `TX00011041`)  
**Row Count**: 11,041 transactions across 180 continuous historical days (13 May 2026 to 8 Nov 2026).

| Column Name | Data Type | Key/Constraint | Description |
|---|---|---|---|
| `Transaction_ID` | Text (String) | Primary Key | Unique sale line identifier. |
| `Transaction_Date` | DateTime | 2026-05-13 to 2026-11-08 | Exact timestamp of register transaction. |
| `Product_ID` | Text (String) | FK -> `Products.Product_ID` | SKU sold. |
| `Product_Name` | Text (String) | Informational | SKU title at time of sale. |
| `Category` | Text (String) | Informational | Category of sold product. |
| `Quantity_Sold` | Integer | >= 1 | Volume sold in units. No negative or zero values. |
| `Unit_Price_INR` | Decimal (Float) | > 0 | Retail price charged. |
| `Discount_Rate` | Decimal (Float) | 0.0 to 0.15 | Promotional discount percentage applied. |
| `Net_Sales_INR` | Decimal (Float) | > 0 | Net revenue earned: `Quantity × Price × (1 - Discount)`. |
| `Sales_Channel` | Text (String) | In-Store, Online, Quick-Commerce | Fulfillment channel. |
| `Store_ID` | Text (String) | HYD-01, HYD-02, SEC-01 | Supermarket branch identifier. |
| `Promotion_Flag` | Text (Yes/No) | Categorical | Whether active campaign was live during sale. |

---

## 3. Inventory Position Snapshot (`Inventory`)
**Primary Key**: `Inventory_ID` (Format: `INV-SKU0001`)  
**Foreign Key**: `Product_ID` (Unique 1:1 with `Products`)  
**Snapshot Date**: 8 November 2026

| Column Name | Data Type | Formula / Business Rule | Description |
|---|---|---|---|
| `Inventory_ID` | Text | Primary Key | Unique inventory record identifier. |
| `Product_ID` | Text | FK -> `Products.Product_ID` | Connected SKU. |
| `Snapshot_Date` | Date | `2026-11-08` | Benchmark monitoring cutoff date. |
| `Current_Stock` | Integer | Physical count >= 0 | On-hand physical inventory in warehouse. |
| `Reserved_Stock` | Integer | Allocated count >= 0 | Units reserved for customer orders in progress. |
| `Incoming_Stock` | Integer | Sum of open POs | Units on valid Pending or In Transit purchase orders. |
| `Safety_Stock` | Integer | Buffer threshold | Buffer maintained against demand spikes. |
| `Reorder_Point` | Integer | `(ADD × Lead Time) + Safety Stock` | Replenishment trigger threshold. |
| `Target_Stock_Days` | Integer | 7 to 21 days | Standard stock target in days. |
| `Avg_Daily_Demand_30D` | Decimal | `Last 30D Sales ÷ 30` | Average velocity (including zero-sales days). |
| `Inventory_Position`| Integer | `Current + Incoming - Reserved`| True net pipeline inventory position. |
| `Days_of_Cover` | Decimal | `Current_Stock ÷ ADD` | Days until shelf exhaustion. |
| `Warehouse_Location`| Text | HYD-01, HYD-02, SEC-01 | Primary fulfillment center. |
| `Last_Updated` | Date | Last audit date | Physical verification timestamp. |
| `Stock_Status` | Text | 5 Classifications | Healthy, Low Stock, Critical, Out of Stock, Overstocked. |

---

## 4. Suppliers Master (`Suppliers`)
**Primary Key**: `Supplier_ID` (Format: `SUP001` - `SUP020`)  
**Row Count**: 20 Regional Distributors.

| Column Name | Data Type | Description |
|---|---|---|
| `Supplier_ID` | Text | Unique vendor code. |
| `Supplier_Name` | Text | Legal business name. |
| `City` | Text | Regional distribution hub (Medchal, Secunderabad, Guntur, Vijayawada, etc.). |
| `Contact_Email` | Text | Order routing inbox. |
| `Contact_Phone` | Text | Dispatch phone number. |
| `Average_Lead_Time_Days`| Integer | Promised turnaround time (1 to 7 calendar days). |
| `Supplier_Reliability` | Decimal | Synthetic baseline reliability index (0.0 to 1.0). |
| `Minimum_Order_Value_INR`| Decimal | Minimum invoice size for PO placement. |
| `Payment_Terms` | Text | Credit window (7 days, 15 days, 30 days). |
| `Supplier_Status` | Text | Active, Under Review. |

---

## 5. Purchase Orders (`Purchase_Orders`)
**Primary Key**: `PO_ID` (Format: `PO000001` - `PO000250`+)  
**Row Count**: 250 Historical records + generated application drafts.

| Column Name | Data Type | Description |
|---|---|---|
| `PO_ID` | Text | Unique purchase order number. |
| `Order_Date` | Date | Issuance date. |
| `Product_ID` | Text (FK) | SKU purchased. |
| `Supplier_ID` | Text (FK) | Vendor receiving order. |
| `Order_Quantity` | Integer | Total units ordered. |
| `Received_Quantity` | Integer | Units accepted at loading dock. |
| `Unit_Cost_INR` | Decimal | Landed purchase price per unit. |
| `Total_Order_Value_INR` | Decimal | `Order_Quantity × Unit_Cost_INR`. |
| `Expected_Delivery_Date`| Date | Scheduled arrival date. |
| `Actual_Delivery_Date` | Date (Nullable) | Date goods arrived (Null for open orders). |
| `PO_Status` | Text | Received, In Transit, Pending, Delayed, Cancelled, Draft. |

---

## 6. Baseline Forecast Data (`Forecast_Data`)
**Primary Key**: `Forecast_ID` (Format: `FC-SKU0001`)  
**Row Count**: 120 Forecast rows (one per SKU) supplied in Excel workbook.

| Column Name | Data Type | Description |
|---|---|---|
| `Forecast_ID` | Text | Unique forecast record code. |
| `Product_ID` | Text (FK) | Associated product SKU. |
| `Forecast_Generated_For_Date`| Date | Forecast horizon starting date (`2026-11-09`). |
| `Forecast_Horizon_Days`| Integer | Standard primary horizon (7 days). |
| `Predicted_Demand_7_Days`| Decimal | Expected cumulative units over 7 days. |
| `Predicted_Demand_14_Days`| Decimal | Expected cumulative units over 14 days. |
| `Predicted_Demand_30_Days`| Decimal | Expected cumulative units over 30 days. |
| `Forecast_Method` | Text | Excel method description (`Weighted moving average + trend`). |
| `Trend_Adjustment` | Decimal | Multiplier ratio applied. |
| `Demand_Trend` | Text | Increasing, Decreasing, Stable. |
| `Generated_On` | Date | Generation timestamp (`2026-11-08`). |

---

## 7. Auxiliary Documentation Sheets
- `Read_Me`: Contextual project overview and metadata.
- `Data_Dictionary`: Field reference supplied inside the Excel workbook.
- `Validation_Results`: Official 17 quality benchmarks verification log.
- `Dataset_Summary`: High-level summary metrics table.

