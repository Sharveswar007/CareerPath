# CareerPath - CAMPUS MODE evening stop
# ─────────────────────────────────────────────────────────────
# Stops the Next.js app + all containers, frees RAM/GPU.
# Data is kept on disk (volumes) - nothing is deleted, ever.
# Next morning, daily-start-campus.ps1 brings it all back.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CareerPath CAMPUS stop  $(Get-Date -Format 'ddd dd MMM yyyy  HH:mm')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------- 1. Stop the Next.js app ----------
Write-Host "`n[1/2] Stopping the web app (node servers)..." -ForegroundColor Yellow
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    foreach ($p in $nodeProcs) {
        # kill only npm-start app servers, never other node processes:
        # match by command line containing "next start"/"npm start"
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)").CommandLine
        if ($cmd -match "next.*(start|server)|npm.*start") {
            Write-Host "  Stopping PID $($p.Id) (app server)" -ForegroundColor DarkGray
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "  App stopped." -ForegroundColor Green
} else {
    Write-Host "  No app server running." -ForegroundColor DarkGray
}

# ---------- 2. Stop all containers ----------
Write-Host "`n[2/2] Stopping containers..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-all.ps1"

Write-Host ""
Write-Host "Done. Data stays safe on disk - nothing was deleted." -ForegroundColor Green
Write-Host ""
