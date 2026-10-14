# CareerPath server - stop ONLY this project's containers:
#   powershell -ExecutionPolicy Bypass -File server\stop-all.ps1
# Data (database volumes, downloaded model) is preserved.
#
# SAFETY: every CareerPath container is named careerpath-* (judge0, supabase
# stack, vLLM). This script stops ONLY those - containers of any other project
# running on this server are never touched.

Write-Host "=== CareerPath: stopping CareerPath containers only ===" -ForegroundColor Cyan

$ours = docker ps -q --filter "name=careerpath-"
$stopped = 0
if ($ours) {
    $names = docker ps --format "{{.Names}}" | Select-String -Pattern "^careerpath-"
    foreach ($n in $names) {
        Write-Host "  Stopping $n" -ForegroundColor DarkGray
        docker stop $n.ToString() | Out-Null
        $stopped++
    }
} else {
    Write-Host "  No CareerPath containers running." -ForegroundColor DarkGray
}

$foreign = (docker ps -q | Measure-Object).Count - $stopped
if ($foreign -lt 0) { $foreign = 0 }
Write-Host ""
Write-Host "CareerPath containers stopped: $stopped" -ForegroundColor $(if ($stopped -gt 0) { "Green" } else { "DarkGray" })
if ($foreign -gt 0) {
    Write-Host "Other projects' containers left running: $foreign (never touched, by design)" -ForegroundColor Yellow
}
Write-Host "Data is preserved. Start again with server\start-all.ps1"
