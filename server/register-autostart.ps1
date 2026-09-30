# Registers a Windows Task Scheduler job that runs daily-start.ps1 automatically
# every morning - the server starts itself at 9 AM without anyone clicking anything.
#
#   powershell -ExecutionPolicy Bypass -File server\register-autostart.ps1           # register 09:00 daily
#   powershell -ExecutionPolicy Bypass -File server\register-autostart.ps1 -Time 08:45
#   powershell -ExecutionPolicy Bypass -File server\register-autostart.ps1 -Remove   # undo
#
# Requirements & honest caveats (read once):
#   - The PC must be ON (or Wake-on-LAN configured in BIOS) at the trigger time.
#     This script starts the SERVICES; it cannot power on a shut-down PC.
#   - Runs only when a user is logged in (Docker Desktop needs a user session).
#     The task logs results to server\logs\daily-start-YYYYMMDD.log so you can
#     check from your phone (GitHub or Remote Desktop) whether 9 AM worked.
#   - Set the PC to auto-login once (netplwiz -> uncheck "must enter password")
#     + "Never sleep" power plan, and the 9 AM start becomes fully hands-off.

param(
    [string]$Time = "09:00",
    [switch]$Remove
)

$ErrorActionPreference = "Stop"
$TaskName = "CareerPath Daily Start"
$scriptPath = Join-Path $PSScriptRoot "daily-start.ps1"

if ($Remove) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed scheduled task '$TaskName'." -ForegroundColor Green
    } else {
        Write-Host "Task '$TaskName' was not registered." -ForegroundColor Yellow
    }
    exit 0
}

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: $scriptPath not found" -ForegroundColor Red
    exit 1
}

$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description "Starts CareerPath services (Judge0, vLLM, Supabase, tunnels) and updates Vercel URLs every morning." `
    -Force | Out-Null

Write-Host ""
Write-Host "Registered: '$TaskName' runs daily at $Time" -ForegroundColor Green
Write-Host "Logs land in server\logs\daily-start-YYYYMMDD.log"
Write-Host ""
Write-Host "For a fully hands-off 9 AM start, also do once:" -ForegroundColor Yellow
Write-Host "  1. netplwiz -> uncheck 'Users must enter a user name and password' (auto-login)"
Write-Host "  2. Power settings -> Sleep: Never (on power)"
Write-Host "  3. Leave the PC plugged in; optional: enable Wake-on-LAN in BIOS"
Write-Host ""
Write-Host "Test it now without waiting for 9 AM:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove anytime:"
Write-Host "  powershell -ExecutionPolicy Bypass -File server\register-autostart.ps1 -Remove"
