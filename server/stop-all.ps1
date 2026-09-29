# CareerPath server - stop everything:
#   powershell -ExecutionPolicy Bypass -File server\stop-all.ps1
# Data (database volumes, downloaded model) is preserved.

Write-Host "=== CareerPath: stopping all containers ===" -ForegroundColor Cyan
$ids = docker ps -q
if ($ids) {
    $ids | ForEach-Object { docker stop $_ | Out-Null }
}
$running = (docker ps -q | Measure-Object).Count
Write-Host "Containers still running: $running" -ForegroundColor $(if ($running -eq 0) { "Green" } else { "Red" })
Write-Host "Data is preserved. Start again with server\start-all.ps1"
