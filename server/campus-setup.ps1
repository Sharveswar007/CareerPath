# CareerPath - CAMPUS one-time setup wizard
# ─────────────────────────────────────────────────────────────
# Run ONCE on the server, from the repo root, BEFORE daily-start-campus:
#
#   powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1
#
# It asks for the server's LAN IP and then fills EVERYTHING that needs it:
#   1. .env.local                      (app config, from the campus template)
#   2. server\supabase\docker\.env     (Supabase config, from .env.example)
#   3. prints the 2 firewall rules to click through
#
# If a private .env.campus.local exists at the repo root (gitignored!), the
# wizard also rotates every public/demo secret: Judge0 token + passwords,
# vLLM API key, and a freshly signed Supabase key set (JWT secret + keys).
#
# The Supabase .env is NOT in git (it holds secrets), so on a fresh clone it
# does not exist - this wizard creates it from the provided .env.example.

param(
    # Optional: non-interactive use (automation, re-runs). When omitted the
    # wizard asks interactively, as normal.
    [string]$IpAddress
)

$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$repoRoot = Split-Path $root -Parent

# ---------- optional private credentials (.env.campus.local, gitignored) ----------
# Parses simple KEY=VALUE lines; comments and blank lines are ignored.
function Load-CredFile {
    param([string]$Path)
    $map = @{}
    foreach ($line in (Get-Content $Path)) {
        if ($line -match "^([A-Z0-9_]+)=(.+)$") { $map[$Matches[1]] = $Matches[2].Trim() }
    }
    return $map
}

$cred = @{}
$usingCred = $false
$credPath = Join-Path $repoRoot ".env.campus.local"
if (Test-Path $credPath) {
    $cred = Load-CredFile -Path $credPath
    $usingCred = $true
    Write-Host "  Private credentials found (.env.campus.local) - fresh secrets will be injected." -ForegroundColor Green
} else {
    # No cred file: keep template values, but if Judge0 was already rotated
    # by a previous cred-file run, carry that token over instead of the
    # placeholder so .env.local and judge0.conf always agree.
    Write-Host "  NOTE: no .env.campus.local found - the public template values will be kept." -ForegroundColor Yellow
    Write-Host "        Fine for offline LAN use; copy the private credentials file to the repo" -ForegroundColor Yellow
    Write-Host "        root first if you want the fresh secret set." -ForegroundColor Yellow
}

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
if ($IpAddress) {
    $lanIp = $IpAddress
    Write-Host "  Using IP from -IpAddress: $lanIp" -ForegroundColor Green
} elseif ($detected) {
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

# ---------- 1. Supabase config + keys ----------
$envLocal  = Join-Path $repoRoot ".env.local"
# Tracked, secret-free template at server\env.campus.template; a legacy
# .env.campus at the repo root still takes precedence if someone kept one.
$envCampus = Join-Path $repoRoot ".env.campus"
if (-not (Test-Path $envCampus)) { $envCampus = Join-Path $root "env.campus.template" }
$supaDockerEnv = Join-Path $root "supabase\docker\.env"
$supaExample   = Join-Path $root "supabase\docker\.env.example"
$supaFresh = -not (Test-Path $supaDockerEnv)
if ($supaFresh) {
    Write-Host "`n  Supabase .env does not exist yet - creating from .env.example..." -ForegroundColor Yellow
    Copy-Item $supaExample $supaDockerEnv
}

if ($usingCred) {
    # Rotate the repo's public demo secrets with the private values:
    # signing secret (JWT_SECRET), the two derived keys, dashboard password.
    $supaNew = Get-Content $supaDockerEnv -Raw
    if ($cred["SUPABASE_JWT_SECRET"])           { $supaNew = $supaNew -replace "(?m)^JWT_SECRET=.*$",           ("JWT_SECRET=" + $cred["SUPABASE_JWT_SECRET"]) }
    if ($cred["NEXT_PUBLIC_SUPABASE_ANON_KEY"]) { $supaNew = $supaNew -replace "(?m)^ANON_KEY=.*$",             ("ANON_KEY=" + $cred["NEXT_PUBLIC_SUPABASE_ANON_KEY"]) }
    if ($cred["SUPABASE_SERVICE_ROLE_KEY"])     { $supaNew = $supaNew -replace "(?m)^SERVICE_ROLE_KEY=.*$",     ("SERVICE_ROLE_KEY=" + $cred["SUPABASE_SERVICE_ROLE_KEY"]) }
    if ($cred["SUPABASE_DASHBOARD_PASSWORD"])   { $supaNew = $supaNew -replace "(?m)^DASHBOARD_PASSWORD=.*$",   ("DASHBOARD_PASSWORD=" + $cred["SUPABASE_DASHBOARD_PASSWORD"]) }
    # DB password only takes effect on the DB volume's FIRST creation
    if ($cred["SUPABASE_DB_PASSWORD"] -and $supaFresh) { $supaNew = $supaNew -replace "(?m)^POSTGRES_PASSWORD=.*$", ("POSTGRES_PASSWORD=" + $cred["SUPABASE_DB_PASSWORD"]) }
    $supaNew | Set-Content $supaDockerEnv -NoNewline
    Write-Host "  Supabase secrets set from .env.campus.local (JWT secret + keys + dashboard)." -ForegroundColor Green
}

$anon  = (Select-String -Path $supaDockerEnv -Pattern "^ANON_KEY=(.+)$").Matches[0].Groups[1].Value
$service = ((Select-String -Path $supaDockerEnv -Pattern "^SERVICE_ROLE_KEY=(.+)$").Line) -replace "^SERVICE_ROLE_KEY=", ""

# Judge0: token + internal passwords from the private credential file
$judge0Conf = Join-Path $root "judge0\judge0.conf"
if ($usingCred -and (Test-Path $judge0Conf)) {
    $j0 = Get-Content $judge0Conf -Raw
    if ($cred["JUDGE0_AUTH_TOKEN"])     { $j0 = $j0 -replace "(?m)^AUTHN_TOKEN=.*",       ("AUTHN_TOKEN=" + $cred["JUDGE0_AUTH_TOKEN"]) }
    if ($cred["JUDGE0_REDIS_PASSWORD"]) { $j0 = $j0 -replace "(?m)^REDIS_PASSWORD=.*",    ("REDIS_PASSWORD=" + $cred["JUDGE0_REDIS_PASSWORD"]) }
    if ($cred["JUDGE0_DB_PASSWORD"])    { $j0 = $j0 -replace "(?m)^POSTGRES_PASSWORD=.*", ("POSTGRES_PASSWORD=" + $cred["JUDGE0_DB_PASSWORD"]) }
    $j0 | Set-Content $judge0Conf -NoNewline
    Write-Host "  Judge0 token + passwords set from .env.campus.local." -ForegroundColor Green
}

Copy-Item $envCampus $envLocal -Force

# honor a pre-configured non-default Supabase gateway port (API_GW_HTTP_PORT)
$envLocalRaw = Get-Content $envLocal -Raw
$dbPortMatch = $envLocalRaw | Select-String -Pattern "NEXT_PUBLIC_SUPABASE_URL=http://192\.168\.1\.50:(\d+)"
$dbPort = if ($dbPortMatch) { $dbPortMatch.Matches[0].Groups[1].Value } else { "8000" }

$localNew = ($envLocalRaw) `
    -replace "NEXT_PUBLIC_SUPABASE_URL=http://192\.168\.1\.50:[0-9]+", "NEXT_PUBLIC_SUPABASE_URL=http://${lanIp}:$dbPort" `
    -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=.+", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon" `
    -replace "SUPABASE_SERVICE_ROLE_KEY=.+", "SUPABASE_SERVICE_ROLE_KEY=$service"
if ($cred["AI_API_KEY"])        { $localNew = $localNew -replace "(?m)^AI_API_KEY=.*",       ("AI_API_KEY=" + $cred["AI_API_KEY"]) }
if ($cred["JUDGE0_AUTH_TOKEN"]) { $localNew = $localNew -replace "(?m)^JUDGE0_AUTH_TOKEN=.*", ("JUDGE0_AUTH_TOKEN=" + $cred["JUDGE0_AUTH_TOKEN"]) }
if (-not $usingCred) {
    $confToken = Select-String -Path $judge0Conf -Pattern "^AUTHN_TOKEN=(.+)$" -ErrorAction SilentlyContinue
    if ($confToken -and $confToken.Matches[0].Groups[1].Value -ne "campus-local-please-rotate-me") {
        $localNew = $localNew -replace "(?m)^JUDGE0_AUTH_TOKEN=.*", ("JUDGE0_AUTH_TOKEN=" + $confToken.Matches[0].Groups[1].Value)
    }
}
$localNew | Set-Content $envLocal -NoNewline
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
