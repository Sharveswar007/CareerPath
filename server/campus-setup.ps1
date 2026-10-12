# CareerPath - CAMPUS one-time setup wizard
# ─────────────────────────────────────────────────────────────
# Run ONCE on the server, from the repo root, BEFORE daily-start-campus:
#
#   powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1
#
# It asks for the server's LAN IP and then fills EVERYTHING that needs it:
#   1. .env.local                      (app config, from .env.campus template)
#   2. server\supabase\docker\.env     (Supabase config, from .env.example)
#   3. prints the 2 firewall rules to click through
#
# The Supabase .env is NOT in git (it holds secrets), so on a fresh clone it
# does not exist - this wizard creates it from the provided .env.example.

$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$repoRoot = Split-Path $root -Parent

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CareerPath CAMPUS one-time setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------- detect LAN IP, let user confirm ----------
$detected = $null
foreach ($nic in (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue)) {
    if ($nic.IPAddress -notmatch "^127\.|^169\.254\." -and $nic.InterfaceAlias -notmatch "Loopback|vEthernet|Docker|WSL") {
        $detected = $nic.IPAddress; break
    }
}
Write-Host ""
if ($detected) {
    Write-Host "  Detected server LAN IP: $detected" -ForegroundColor Green
    $answer = Read-Host "  Use this IP? (Enter = yes, or type the correct one)"
    if ($answer) { $lanIp = $answer } else { $lanIp = $detected }
} else {
    Write-Host "  Could not detect a LAN IP automatically." -ForegroundColor Yellow
    Write-Host "  Run  ipconfig  in another window and look for 'IPv4 Address'." -ForegroundColor Yellow
    $lanIp = Read-Host "  Type the server's LAN IP (e.g. 192.168.1.50)"
}
if (-not $lanIp) { Write-Host "  No IP given - exiting." -ForegroundColor Red; exit 1 }
Write-Host "`n  Using LAN IP: $lanIp" -ForegroundColor Green

# ---------- 1. .env.local ----------
$envLocal  = Join-Path $repoRoot ".env.local"
$envCampus = Join-Path $repoRoot ".env.campus"
Copy-Item $envCampus $envLocal -Force

# keys
$supaDockerEnv = Join-Path $root "supabase\docker\.env"
$supaExample   = Join-Path $root "supabase\docker\.env.example"
if (-not (Test-Path $supaDockerEnv)) {
    Write-Host "`n  Supabase .env does not exist yet - creating from .env.example..." -ForegroundColor Yellow
    Copy-Item $supaExample $supaDockerEnv
}
$anon  = (Select-String -Path $supaDockerEnv -Pattern "^ANON_KEY=(.+)$").Matches[0].Groups[1].Value
$service = (Select-String -Path $supaDockerEnv -Pattern "^SERVICE_ROLE_KEY=(.+)$").Matches[1].Groups[1].Value -replace "^SERVICE_ROLE_KEY=", ""
# the SERVICE_ROLE_KEY line: match more robustly
$serviceLine = (Select-String -Path $supaDockerEnv -Pattern "^SERVICE_ROLE_KEY=(.+)$").Line
$service = $serviceLine -replace "^SERVICE_ROLE_KEY=", ""

(Get-Content $envLocal -Raw) `
    -replace "NEXT_PUBLIC_SUPABASE_URL=http://192\.168\.1\.50:8000", "NEXT_PUBLIC_SUPABASE_URL=http://${lanIp}:8000" `
    -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=.+", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon" `
    -replace "SUPABASE_SERVICE_ROLE_KEY=.+", "SUPABASE_SERVICE_ROLE_KEY=$service" |
    Set-Content $envLocal -NoNewline
Write-Host "`n  [1/3] .env.local written (IP + keys filled)." -ForegroundColor Green

# ---------- 2. Supabase .env ----------
(Get-Content $supaDockerEnv) `
    -replace "^SITE_URL=.*", "SITE_URL=http://${lanIp}:3000" `
    -replace "^API_EXTERNAL_URL=.*", "API_EXTERNAL_URL=http://${lanIp}:8000/auth/v1" |
    Set-Content $supaDockerEnv
Write-Host "  [2/3] Supabase .env written (SITE_URL / API_EXTERNAL_URL point at this server)." -ForegroundColor Green

# ---------- 3. firewall ----------
Write-Host "  [3/3] Firewall rules (run these two commands as Administrator, or click through Windows Firewall):" -ForegroundColor Yellow
Write-Host ""
Write-Host "    netsh advfirewall firewall add rule name=`"CareerPath Web`" dir=in action=allow protocol=TCP localport=3000" -ForegroundColor White
Write-Host "    netsh advfirewall firewall add rule name=`"CareerPath DB`" dir=in action=allow protocol=TCP localport=8000" -ForegroundColor White
Write-Host ""
Write-Host "  Then continue with PART 2 of SERVER_DEV_README.md:" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done. Nothing else needs the IP - everything else uses localhost." -ForegroundColor Green
