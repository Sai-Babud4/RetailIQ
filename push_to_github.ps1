# RetailIQ - Push Project to GitHub PowerShell Helper
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  RetailIQ - Push Project to GitHub & Deploy to Vercel" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/4] Checking git status..." -ForegroundColor Yellow
git status

Write-Host "`n[2/4] Staging all files..." -ForegroundColor Yellow
git add .

$commitMsg = Read-Host "`nEnter commit message (Press Enter for default: 'Fix Vercel serverless deployment and database bundling')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Fix Vercel serverless deployment and database bundling"
}

Write-Host "`n[3/4] Creating commit..." -ForegroundColor Yellow
git commit -m $commitMsg

Write-Host "`n[4/4] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying origin master..." -ForegroundColor Yellow
    git push origin master
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  Push completed successfully!" -ForegroundColor Green
Write-Host "  Vercel will automatically build and update the live site." -ForegroundColor Green
Write-Host "  Target: https://retail-iq-eight.vercel.app" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

