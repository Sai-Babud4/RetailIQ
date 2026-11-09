@echo off
setlocal
echo ========================================================
echo   RetailIQ - Push Project to GitHub & Deploy to Vercel
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking git status...
git status
echo.

echo [2/4] Staging all files (including pre-populated database)...
git add .
echo.

set /p COMMIT_MSG="Enter commit message (Press Enter for default: 'Fix Vercel serverless deployment and database bundling'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Fix Vercel serverless deployment and database bundling

echo [3/4] Creating commit...
git commit -m "%COMMIT_MSG%"
echo.

echo [4/4] Pushing to GitHub main branch...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTE] If your default branch is 'master', trying to push to master...
    git push origin master
)

echo.
echo ========================================================
echo   Push completed!
echo   Vercel will now automatically trigger a redeployment.
echo   Check your live site at https://retail-iq-eight.vercel.app
echo ========================================================
pause

