# CareerPath - CAMPUS MODE evening stop
# ─────────────────────────────────────────────────────────────
# Stops the Next.js app + all containers, frees RAM/GPU.
# Data is kept on disk (volumes) - nothing is deleted, ever.
# Next morning, daily-start-campus.ps1 brings it all back.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1

param(
    # Port the app was started on (daily-start-campus.ps1 -Port).
    [string]$Port = "3000"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CareerPath CAMPUS stop  $(Get-Date -Format 'ddd dd MMM yyyy  HH:mm')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------- 1. Stop the Next.js app ----------
Write-Host "`n[1/2] Stopping the web app on port $Port..." -ForegroundColor Yellow
$appPids = @()
try {
    # Kill ONLY node processes that BOTH listen on OUR port AND run npm/next
    # start - other projects' node apps are never touched.
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($ownerPid in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue).CommandLine
            if ($ownerPid -and $cmd -match "next|npm") {
                Write-Host "  Stopping PID $ownerPid (app server on port $Port)" -ForegroundColor DarkGray
                Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
                $appPids += $ownerPid
            }
        }
    }
} catch { }
if ($appPids.Count -gt 0) { Write-Host "  App stopped." -ForegroundColor Green }
else { Write-Host "  No app server found listening on port $Port." -ForegroundColor DarkGray }

# ---------- 2. Stop CareerPath containers ONLY ----------
Write-Host "`n[2/2] Stopping CareerPath containers (other projects' containers are untouched)..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-all.ps1"

Write-Host ""
Write-Host "Done. Data stays safe on disk - nothing was deleted." -ForegroundColor Green
Write-Host ""
