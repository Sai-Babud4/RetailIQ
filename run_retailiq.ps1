# RetailIQ PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "RETAILIQ - AI-POWERED INVENTORY INTELLIGENCE" -ForegroundColor White
Write-Host "Intelligent Inventory Monitoring and Automated Replenishment Agent" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$pythonExe = "C:\Users\saiba\AppData\Local\Programs\Orange\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonExe) { $pythonExe = "python" }
}

Write-Host "[1/3] Verifying database records..." -ForegroundColor Yellow
& $pythonExe scripts/import_excel_dataset.py

Write-Host ""
Write-Host "[2/3] Launching web browser at http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process "http://127.0.0.1:8000"

Write-Host ""
Write-Host "[3/3] Starting RetailIQ FastAPI Server on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate the server.`n" -ForegroundColor Gray
& $pythonExe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

