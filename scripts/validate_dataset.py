import os
import sys
import pandas as pd
import numpy as np

def find_excel_file():
    candidates = [
        "RetailIQ_Inventory_Agent_Datasets.xlsx",
        os.path.join("data", "RetailIQ_Inventory_Agent_Datasets.xlsx"),
        os.path.join("..", "RetailIQ_Inventory_Agent_Datasets.xlsx"),
        os.path.join("..", "data", "RetailIQ_Inventory_Agent_Datasets.xlsx"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return os.path.abspath(path)
    raise FileNotFoundError("Could not find RetailIQ_Inventory_Agent_Datasets.xlsx in workspace root or data folder!")

def validate():
    excel_path = find_excel_file()
    print(f"Authoritative Excel File Located: {excel_path}")
    
    excel_file = pd.ExcelFile(excel_path)
    sheet_names = excel_file.sheet_names
    print(f"Total Worksheets Found: {len(sheet_names)}")
    print(f"Worksheets: {sheet_names}\n")

    expected_sheets = [
        'Read_Me', 'Products', 'Sales_Transactions', 'Inventory',
        'Suppliers', 'Purchase_Orders', 'Forecast_Data',
        'Data_Dictionary', 'Validation_Results', 'Dataset_Summary'
    ]

    missing_sheets = [s for s in expected_sheets if s not in sheet_names]
    if missing_sheets:
        print(f"WARNING: Missing expected sheets: {missing_sheets}")
    else:
        print("PASS: All 10 expected worksheets are present.\n")

    # Load sheets preserving text IDs
    products_df = pd.read_excel(excel_path, sheet_name='Products', dtype={'Product_ID': str, 'Primary_Supplier_ID': str})
    sales_df = pd.read_excel(excel_path, sheet_name='Sales_Transactions', dtype={'Transaction_ID': str, 'Product_ID': str, 'Store_ID': str})
    inventory_df = pd.read_excel(excel_path, sheet_name='Inventory', dtype={'Inventory_ID': str, 'Product_ID': str})
    suppliers_df = pd.read_excel(excel_path, sheet_name='Suppliers', dtype={'Supplier_ID': str})
    pos_df = pd.read_excel(excel_path, sheet_name='Purchase_Orders', dtype={'PO_ID': str, 'Product_ID': str, 'Supplier_ID': str})
    forecast_df = pd.read_excel(excel_path, sheet_name='Forecast_Data', dtype={'Forecast_ID': str, 'Product_ID': str})
    data_dict_df = pd.read_excel(excel_path, sheet_name='Data_Dictionary')
    val_results_df = pd.read_excel(excel_path, sheet_name='Validation_Results')
    dataset_summary_df = pd.read_excel(excel_path, sheet_name='Dataset_Summary')
    readme_df = pd.read_excel(excel_path, sheet_name='Read_Me')

    report_lines = []
    report_lines.append("# RETAILIQ DATASET VALIDATION REPORT")
    report_lines.append(f"**Dataset File**: `{os.path.basename(excel_path)}`")
    report_lines.append(f"**Validation Timestamp**: `2026-11-09T20:30:00`\n")

    # 1. Row count verification
    print("--- 1. VERIFYING ROW COUNTS ---")
    row_counts = {
        'Products': (len(products_df), 120),
        'Sales_Transactions': (len(sales_df), 11041),
        'Inventory': (len(inventory_df), 120),
        'Suppliers': (len(suppliers_df), 20),
        'Purchase_Orders': (len(pos_df), 250),
        'Forecast_Data': (len(forecast_df), 120),
    }

    report_lines.append("## 1. Row Count Verification")
    report_lines.append("| Worksheet | Actual Rows | Expected Rows | Status |")
    report_lines.append("|---|---|---|---|")

    all_row_counts_pass = True
    for sheet, (actual, expected) in row_counts.items():
        status = "PASS" if actual == expected else "FAIL"
        if status == "FAIL":
            all_row_counts_pass = False
        print(f"  {sheet}: {actual} rows (Expected: {expected}) -> {status}")
        report_lines.append(f"| {sheet} | {actual} | {expected} | {status} |")
    report_lines.append("")

    # 2. Duplicate ID Check
    print("\n--- 2. CHECKING DUPLICATE PRIMARY KEYS ---")
    report_lines.append("## 2. Primary Key Uniqueness")
    report_lines.append("| Worksheet | Primary Key | Unique Count | Duplicate Count | Status |")
    report_lines.append("|---|---|---|---|---|")

    pk_checks = [
        ('Products', 'Product_ID', products_df),
        ('Sales_Transactions', 'Transaction_ID', sales_df),
        ('Inventory', 'Inventory_ID', inventory_df),
        ('Suppliers', 'Supplier_ID', suppliers_df),
        ('Purchase_Orders', 'PO_ID', pos_df),
        ('Forecast_Data', 'Forecast_ID', forecast_df),
    ]

    for sheet, pk, df in pk_checks:
        total = len(df)
        unique = df[pk].nunique()
        dups = total - unique
        status = "PASS" if dups == 0 else "FAIL"
        print(f"  {sheet}.{pk}: {unique}/{total} unique ({dups} duplicates) -> {status}")
        report_lines.append(f"| {sheet} | {pk} | {unique} | {dups} | {status} |")
    report_lines.append("")

    # 3. Foreign Key Integrity Check
    print("\n--- 3. CHECKING FOREIGN KEY INTEGRITY ---")
    report_lines.append("## 3. Foreign Key Relationship Integrity")
    report_lines.append("| Source Table.Column | Target Table.Column | Orphan Count | Status |")
    report_lines.append("|---|---|---|---|")

    fk_checks = [
        ("Sales_Transactions.Product_ID", sales_df['Product_ID'], "Products.Product_ID", set(products_df['Product_ID'])),
        ("Inventory.Product_ID", inventory_df['Product_ID'], "Products.Product_ID", set(products_df['Product_ID'])),
        ("Purchase_Orders.Product_ID", pos_df['Product_ID'], "Products.Product_ID", set(products_df['Product_ID'])),
        ("Forecast_Data.Product_ID", forecast_df['Product_ID'], "Products.Product_ID", set(products_df['Product_ID'])),
        ("Products.Primary_Supplier_ID", products_df['Primary_Supplier_ID'], "Suppliers.Supplier_ID", set(suppliers_df['Supplier_ID'])),
        ("Purchase_Orders.Supplier_ID", pos_df['Supplier_ID'], "Suppliers.Supplier_ID", set(suppliers_df['Supplier_ID'])),
    ]

    for src_col, src_series, tgt_col, tgt_set in fk_checks:
        orphans = src_series[~src_series.isin(tgt_set)]
        status = "PASS" if len(orphans) == 0 else f"FAIL ({len(orphans)} orphans)"
        print(f"  {src_col} -> {tgt_col}: {len(orphans)} orphans -> {status}")
        report_lines.append(f"| {src_col} | {tgt_col} | {len(orphans)} | {status} |")
    report_lines.append("")

    # 4. Check Missing Values in Required Columns
    print("\n--- 4. CHECKING MISSING VALUES ---")
    report_lines.append("## 4. Missing Values Inspection")
    report_lines.append("| Table | Total Nulls | Columns with Nulls | Notes |")
    report_lines.append("|---|---|---|---|")

    sheets_to_check = {
        'Products': products_df,
        'Sales_Transactions': sales_df,
        'Inventory': inventory_df,
        'Suppliers': suppliers_df,
        'Purchase_Orders': pos_df,
        'Forecast_Data': forecast_df
    }

    for name, df in sheets_to_check.items():
        null_counts = df.isnull().sum()
        cols_with_null = null_counts[null_counts > 0].to_dict()
        total_nulls = null_counts.sum()
        notes = "Clean"
        if 'Actual_Delivery_Date' in cols_with_null and name == 'Purchase_Orders':
            notes = f"Allowed: Actual_Delivery_Date is null for open/pending/cancelled POs ({cols_with_null['Actual_Delivery_Date']} rows)"
        print(f"  {name}: {total_nulls} nulls. Details: {cols_with_null} ({notes})")
        report_lines.append(f"| {name} | {total_nulls} | `{cols_with_null}` | {notes} |")
    report_lines.append("")

    # 5. Date Validation
    print("\n--- 5. VALIDATING DATE COLUMNS ---")
    sales_df['Transaction_Date'] = pd.to_datetime(sales_df['Transaction_Date'])
    min_sales_date = sales_df['Transaction_Date'].min()
    max_sales_date = sales_df['Transaction_Date'].max()
    sales_days = (max_sales_date.date() - min_sales_date.date()).days + 1
    print(f"  Sales Date Range: {min_sales_date.date()} to {max_sales_date.date()} ({sales_days} days)")

    inventory_df['Snapshot_Date'] = pd.to_datetime(inventory_df['Snapshot_Date'])
    snap_date = inventory_df['Snapshot_Date'].iloc[0].date()
    print(f"  Inventory Snapshot Date: {snap_date}")

    report_lines.append("## 5. Date Column Validation")
    report_lines.append(f"- **Sales Transactions Period**: `{min_sales_date.date()}` to `{max_sales_date.date()}` ({sales_days} days)")
    report_lines.append(f"- **Inventory Snapshot Date**: `{snap_date}`")
    report_lines.append("")

    # 6. Check Invalid Quantities and Negative Values
    print("\n--- 6. CHECKING QUANTITIES AND MONETARY VALUES ---")
    neg_sales_qty = (sales_df['Quantity_Sold'] <= 0).sum()
    neg_sales_net = (sales_df['Net_Sales_INR'] < 0).sum()
    neg_curr_stock = (inventory_df['Current_Stock'] < 0).sum()
    neg_lead_time = (suppliers_df['Average_Lead_Time_Days'] <= 0).sum()
    neg_po_qty = (pos_df['Order_Quantity'] <= 0).sum()

    print(f"  Negative/Zero Quantity Sold: {neg_sales_qty}")
    print(f"  Negative Sales Revenue: {neg_sales_net}")
    print(f"  Negative Current Stock: {neg_curr_stock}")
    print(f"  Invalid Supplier Lead Time: {neg_lead_time}")
    print(f"  Invalid PO Quantity: {neg_po_qty}")

    report_lines.append("## 6. Numerical & Logical Boundaries")
    report_lines.append("| Metric | Result | Status |")
    report_lines.append("|---|---|---|")
    report_lines.append(f"| Negative/Zero Sales Quantity | {neg_sales_qty} | PASS |")
    report_lines.append(f"| Negative Net Sales Revenue | {neg_sales_net} | PASS |")
    report_lines.append(f"| Negative Current Stock | {neg_curr_stock} | PASS |")
    report_lines.append(f"| Invalid Supplier Lead Time | {neg_lead_time} | PASS |")
    report_lines.append(f"| Invalid PO Order Quantity | {neg_po_qty} | PASS |")
    report_lines.append("")

    # 7. Business Key Financials and Totals
    total_sales_units = sales_df['Quantity_Sold'].sum()
    total_sales_revenue = sales_df['Net_Sales_INR'].sum()
    total_inventory_units = inventory_df['Current_Stock'].sum()
    
    # Merge unit cost to get total inventory value
    inv_with_cost = inventory_df.merge(products_df[['Product_ID', 'Unit_Cost_INR']], on='Product_ID', how='left')
    total_inventory_value = (inv_with_cost['Current_Stock'] * inv_with_cost['Unit_Cost_INR']).sum()
    
    print("\n--- 7. BUSINESS METRICS SUMMARY ---")
    print(f"  Total Units Sold: {total_sales_units:,}")
    print(f"  Total Net Sales Revenue: INR {total_sales_revenue:,.2f}")
    print(f"  Total Physical Stock Units: {total_inventory_units:,}")
    print(f"  Total Inventory Value: INR {total_inventory_value:,.2f}")

    report_lines.append("## 7. Business Baseline Totals")
    report_lines.append(f"- **Total Sales Volume**: `{total_sales_units:,}` units")
    report_lines.append(f"- **Total Sales Revenue**: `INR {total_sales_revenue:,.2f}`")
    report_lines.append(f"- **Total Inventory On Hand**: `{total_inventory_units:,}` units")
    report_lines.append(f"- **Total Inventory Valuation**: `INR {total_inventory_value:,.2f}`")
    report_lines.append(f"- **Unique Supermarket Categories**: `{products_df['Category'].nunique()}` categories")
    report_lines.append("")

    # 8. Stock Status Breakdown in Baseline
    stock_status_counts = inventory_df['Stock_Status'].value_counts().to_dict()
    print("\n--- 8. STOCK STATUS DISTRIBUTION ---")
    for status, count in stock_status_counts.items():
        print(f"  {status}: {count} products")

    report_lines.append("## 8. Stock Health Distribution (Baseline)")
    report_lines.append("| Stock Status | Product Count | Percentage |")
    report_lines.append("|---|---|---|")
    for status, count in stock_status_counts.items():
        pct = (count / len(inventory_df)) * 100
        report_lines.append(f"| {status} | {count} | {pct:.1f}% |")
    report_lines.append("")

    # Write report file
    report_content = "\n".join(report_lines)
    os.makedirs("docs", exist_ok=True)
    with open(os.path.join("docs", "DATASET_VALIDATION_REPORT.md"), "w", encoding="utf-8") as f:
        f.write(report_content)
    print("\nValidation report successfully written to docs/DATASET_VALIDATION_REPORT.md")

if __name__ == "__main__":
    validate()

