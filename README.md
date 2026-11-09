# RetailIQ – Intelligent Inventory Monitoring and Automated Replenishment Agent

**Application Name**: RetailIQ – AI-Powered Inventory Intelligence  
**Subtitle**: *"Predict Demand. Prevent Stockouts. Optimise Replenishment."*  
**Domain**: Supermarket & Retail Analytics (MBA Business Analytics Major Project)  
**Authoritative Dataset**: `RetailIQ_Inventory_Agent_Datasets.xlsx`  

---

## 🌟 Executive Overview
RetailIQ is an enterprise-grade full-stack business intelligence and autonomous AI replenishment platform built to monitor supermarket inventory levels, forecast demand across multiple procurement horizons, and generate explainable replenishment recommendations with human-in-the-loop governance.

The platform operates **100% locally and deterministically** using the authentic supermarket dataset created specifically for this project. It requires **no paid third-party API subscriptions** and never replaces or hallucinates database figures.

---

## 🐙 Step-by-Step Guide: Push to GitHub Manually

Follow these exact steps from the project root folder (`RetailIQ_GitHub_Deploy`):

### Step 1: Open Terminal in the Project Folder
Open your terminal (PowerShell, Command Prompt, or Git Bash) in this folder:
```powershell
cd D:\Antigravity\RetailIQ_GitHub_Deploy
```

### Step 2: Initialize Git & Stage All Files
```bash
git init
git add .
```

### Step 3: Create the Initial Commit
```bash
git commit -m "Initial commit: RetailIQ Autonomous Inventory Agent & Analytics"
```

### Step 4: Create a New GitHub Repository
1. Go to [https://github.com/new](https://github.com/new).
2. Enter Repository name (e.g., `retailiq-inventory-agent`).
3. Choose **Public** or **Private**.
4. Leave *"Initialize with README"* unchecked.
5. Click **Create repository**.

### Step 5: Link Remote & Push
Copy your repository URL from GitHub and run:
```bash
git branch -M main
git remote add origin https://github.com/<your-username>/retailiq-inventory-agent.git
git push -u origin main
```
*(Alternatively, simply double-click `push_to_github.bat` or run `.\push_to_github.ps1` and paste your GitHub repository URL when prompted).*

---

## ▲ Step-by-Step Guide: Host Online via Vercel

This repository is already pre-configured for Vercel with:
- `vercel.json` (routing rules for FastAPI backend + Vite React frontend)
- `api/index.py` (serverless ASGI handler that automatically boots the database into `/tmp` for serverless execution)
- `requirements.txt` (serverless Python dependencies)

### Step 1: Log in to Vercel
Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.

### Step 2: Import the GitHub Repository
1. In the Vercel Dashboard, click **"Add New..."** $\rightarrow$ **"Project"**.
2. Under "Import Git Repository", find and select your newly pushed `retailiq-inventory-agent` repository.
3. Click **Import**.

### Step 3: Configure Project Settings (Automatic)
Vercel will detect `vercel.json`:
- **Framework Preset**: Other / Vite
- **Root Directory**: `./` (leave as default root)
- **Environment Variables**: None required! The application operates with its local pre-populated SQLite database and deterministic engine.

### Step 4: Click Deploy!
1. Click **Deploy**.
2. Vercel will:
   - Build the React TypeScript frontend (`frontend/dist`)
   - Package the FastAPI Python serverless function (`api/index.py`)
   - Deploy your live URL (e.g., `https://retailiq-inventory-agent.vercel.app`).
3. Your full dashboard is now accessible anywhere on the internet!

---

## 📊 Dataset Specifications
The application ingests and runs on `RetailIQ_Inventory_Agent_Datasets.xlsx`:

- **Products**: 120 unique supermarket SKUs across 12 categories
- **Sales Transactions**: 11,041 real sales lines spanning 180 continuous calendar days (13 May 2026 to 8 November 2026)
  - Total Volume Sold: **24,304 units**
  - Total Revenue: **INR 13,658,372.87**
- **Inventory Snapshot**: 120 inventory records as of **8 November 2026**
  - Current Available Physical Stock: **986 units**
  - Total Inventory Valuation: **INR 451,265.05**
- **Suppliers**: 20 regional FMCG distributors
- **Purchase Orders**: 250 open and historical orders
- **Baseline Forecast**: 120 original Excel demand forecasts
- **Integrity Benchmarks**: 10 out of 10 PASS (zero duplicate IDs, zero orphan foreign keys, zero invalid quantities)

---

## 🚀 Running Locally (Windows)

### Option 1: Fast One-Click Launch
Double-click `run_retailiq.bat` or run in PowerShell:
```powershell
.\run_retailiq.ps1
```
This script will:
1. Verify the SQLite database records from `RetailIQ_Inventory_Agent_Datasets.xlsx`.
2. Automatically launch your default web browser to `http://127.0.0.1:8000`.
3. Start the high-performance FastAPI server serving both the production React UI and the REST API.

### Option 2: Manual Start
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

---

## 🖥️ The 11 Core Navigation Pages

1. **Executive Overview**: 10 primary KPI cards, dynamic date/category/warehouse/stock-status global filters, 180-day revenue trends (Daily/Weekly/Monthly), stock health distribution, category valuation, and top 10 SKUs.
2. **Inventory Management**: Searchable, sortable, paginated inventory matrix (120 SKUs) displaying physical, reserved, and incoming stock positions, reorder points, days of cover, and stock health status pills.
3. **Demand Forecasting**: 7, 14, and 30-day statistical demand projections, comparing Excel baseline forecasts against newly generated application forecasts with time-based holdout validation (MAE and WAPE).
4. **AI Inventory Agent**: 11-step visual workflow pipeline, directory of 10 backend tools, and grounded natural language query interface answering questions like *"what is the stock level of cheese"*, *"demand forecast for milk"*, and *"which products need immediate replenishment"*.
5. **Replenishment Management**: Prioritized procurement recommendations with case pack-size rounding, supplier MOQ compliance, and one-click purchase order draft generation.
6. **Purchase Orders**: Complete order lifecycle tracker (Draft $\rightarrow$ Pending $\rightarrow$ In Transit $\rightarrow$ Received), delivery schedule tracking, approval/rejection actions, and stock receipt incrementation.
7. **Supplier Analytics**: Benchmarking matrix comparing baseline supplier reliability against empirical on-time fulfillment rates across 250 orders.
8. **Reports & Analytics**: 10 MBA analytical reports with dedicated per-tab configurable filters, visual infographics, and CSV exports.
9. **Agent Activity Log**: Immutable audit trail logging all AI evaluations, recommendations, manager approvals, and stock alerts.
10. **Dataset Management**: Data ingestion status, 10-worksheet row verification, copy download of `RetailIQ_Inventory_Agent_Datasets.xlsx`, and safe re-import procedure.
11. **Settings**: Procurement parameters, standard review period, human-in-the-loop approval locks, and deterministic reasoning controls.

---

## 🧮 Inventory Mathematical Rules

### A. Average Daily Demand ($\text{ADD}$)
$$\text{ADD} = \frac{\sum_{t=1}^{30} \text{Units Sold}_t}{30}$$
*Accounts for calendar days with zero sales to prevent demand inflation.*

### B. Net Inventory Position ($\text{IP}$)
$$\text{IP} = \text{Current Stock} + \text{Incoming Stock} - \text{Reserved Stock}$$
*Incoming Stock includes strictly open orders in `Pending` or `In Transit` status.*

### C. Reorder Point ($\text{ROP}$)
$$\text{ROP} = (\text{ADD} \times \text{Lead Time}) + \text{Safety Stock}$$

### D. Target Stock ($\text{TS}$)
$$\text{TS} = (\text{Forecast Daily Demand} \times (\text{Lead Time} + \text{Review Period})) + \text{Safety Stock}$$

### E. Recommended Reorder Quantity
$$\text{Recommended Quantity} = \left\lceil \frac{\max(\text{TS} - \text{IP}, \text{MOQ})}{\text{Pack Size}} \right\rceil \times \text{Pack Size}$$

---

## 🛠️ Testing & Verification
Execute the automated test suite:
```bash
python -m unittest discover tests
```
Output:
```
Ran 8 tests in 0.956s
OK
```
