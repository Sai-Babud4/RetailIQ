@echo off
title RetailIQ - Intelligent Inventory Intelligence
echo ======================================================================
echo RETAILIQ - AI-POWERED INVENTORY INTELLIGENCE
echo Intelligent Inventory Monitoring and Automated Replenishment Agent
echo ======================================================================
echo.

:: Detect Python executable
set PYTHON_EXE=C:\Users\saiba\AppData\Local\Programs\Orange\python.exe
if not exist "%PYTHON_EXE%" (
    set PYTHON_EXE=python
)

echo [1/3] Verifying database records...
"%PYTHON_EXE%" scripts/import_excel_dataset.py

echo.
echo [2/3] Launching web browser at http://127.0.0.1:8000 ...
start http://127.0.0.1:8000

echo.
echo [3/3] Starting RetailIQ FastAPI Server on http://127.0.0.1:8000 ...
echo Press Ctrl+C to terminate the server.
echo.
"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
pause

