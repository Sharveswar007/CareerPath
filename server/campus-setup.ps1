# CareerPath - CAMPUS one-time setup wizard
# ─────────────────────────────────────────────────────────────
# Run ONCE on the server, from the repo root, BEFORE daily-start-campus:
#
#   powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1
#
# What it fills:
#   1. .env.local                      (app config, from the campus template)
#   2. server\supabase\docker\.env     (Supabase config, secrets + URLs)
#   3. server\judge0\judge0.conf       (token + internal passwords)
#   4. prints the firewall rule (needs admin/IT, see SERVER_DEV_README.md)
#
# NO LAN IP NEEDED ANYMORE: the browser now talks to Supabase through the app
# itself (relative /supa URL + next.config rewrites), so the build carries no
# IP and the college WiFi IP may change any time without breaking anything.
# Students still just open http://<whatever-the-ip-is>:<app port>.
#
# If a private .env.campus.local exists at the repo root (gitignored!), the
# wizard also rotates every public/demo secret: Judge0 token + passwords,
# vLLM API key, and a freshly signed Supabase key set (JWT secret + keys).

param(
    # App port if you changed it with daily-start-campus.ps1 -Port <n>
    [int]$AppPort = 3000
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
    # No cred file: keep template values (fine for offline LAN use).
    Write-Host "  NOTE: no .env.campus.local found - the public template values will be kept." -ForegroundColor Yellow
    Write-Host "        Copy the private credentials file to the repo root if you want the" -ForegroundColor Yellow
    Write-Host "        fresh secret set." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CareerPath CAMPUS one-time setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------- 1. Supabase .env (keys first) ----------
$envLocal  = Join-Path $repoRoot ".env.local"
$envCampus = Join-Path $repoRoot ".env.campus"          # legacy location, takes precedence
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

# Our gateway port (example default 54321) - keep every localhost URL in sync.
$gwPort = "54321"
$apiGw = Select-String -Path $supaDockerEnv -Pattern "^API_GW_HTTP_PORT=(\d+)" -ErrorAction SilentlyContinue
if ($apiGw) { $gwPort = $apiGw.Matches[0].Groups[1].Value }

$anon    = (Select-String -Path $supaDockerEnv -Pattern "^ANON_KEY=(.+)$").Matches[0].Groups[1].Value
$service = ((Select-String -Path $supaDockerEnv -Pattern "^SERVICE_ROLE_KEY=(.+)$").Line) -replace "^SERVICE_ROLE_KEY=", ""

# Judge0: token + internal passwords from the private credential file
$judge0Conf = Join-Path $root "judge0\judge0.conf"
if ($usingCred -and (Test-Path $judge0Conf)) {
    $j0 = Get-Content $judge0Conf -Raw
    if ($cred["JUDGE0_AUTH_TOKEN"])     { $j0 = $j0 -replace "(?m)^AUTHN_TOKEN=.*$",       ("AUTHN_TOKEN=" + $cred["JUDGE0_AUTH_TOKEN"]) }
    if ($cred["JUDGE0_REDIS_PASSWORD"]) { $j0 = $j0 -replace "(?m)^REDIS_PASSWORD=.*$",    ("REDIS_PASSWORD=" + $cred["JUDGE0_REDIS_PASSWORD"]) }
    if ($cred["JUDGE0_DB_PASSWORD"])    { $j0 = $j0 -replace "(?m)^POSTGRES_PASSWORD=.*$", ("POSTGRES_PASSWORD=" + $cred["JUDGE0_DB_PASSWORD"]) }
    $j0 | Set-Content $judge0Conf -NoNewline
    Write-Host "  Judge0 token + passwords set from .env.campus.local." -ForegroundColor Green
}

# ---------- 2. .env.local ----------
Copy-Item $envCampus $envLocal -Force

$envNew = Get-Content $envLocal -Raw
# Keys come from the actual Supabase config (new or rotated), never typed by hand:
$envNew = $envNew -replace "(?m)^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*$",   ("NEXT_PUBLIC_SUPABASE_ANON_KEY=" + $anon)
$envNew = $envNew -replace "(?m)^SUPABASE_SERVICE_ROLE_KEY=.*$",       ("SUPABASE_SERVICE_ROLE_KEY=" + $service)
if ($cred["AI_API_KEY"])        { $envNew = $envNew -replace "(?m)^AI_API_KEY=.*$",       ("AI_API_KEY=" + $cred["AI_API_KEY"]) }
if ($cred["JUDGE0_AUTH_TOKEN"]) { $envNew = $envNew -replace "(?m)^JUDGE0_AUTH_TOKEN=.*$", ("JUDGE0_AUTH_TOKEN=" + $cred["JUDGE0_AUTH_TOKEN"]) }
if (-not $usingCred) {
    # Carry over an already-rotated Judge0 token so .env.local and judge0.conf agree
    $confToken = Select-String -Path $judge0Conf -Pattern "^AUTHN_TOKEN=(.+)$" -ErrorAction SilentlyContinue
    if ($confToken -and $confToken.Matches[0].Groups[1].Value -ne "campus-local-please-rotate-me") {
        $envNew = $envNew -replace "(?m)^JUDGE0_AUTH_TOKEN=.*$", ("JUDGE0_AUTH_TOKEN=" + $confToken.Matches[0].Groups[1].Value)
    }
}
# keep SUPABASE_INTERNAL_URL in sync with the actual gateway port (54321 default)
$envNew = $envNew -replace "(?m)^SUPABASE_INTERNAL_URL=.*$", ("SUPABASE_INTERNAL_URL=http://localhost:$gwPort")
$envNew | Set-Content $envLocal -NoNewline
Write-Host "`n  [1/3] .env.local written (gateway port $gwPort, keys filled)." -ForegroundColor Green

# ---------- 3. Supabase URLs ----------
# localhost on purpose: GoTrue only needs these for redirect/email links, and
# password login works regardless. No IP is baked into the build.
(Get-Content $supaDockerEnv) `
    -replace "^SITE_URL=.*", "SITE_URL=http://localhost:$AppPort" `
    -replace "^API_EXTERNAL_URL=.*", "API_EXTERNAL_URL=http://localhost:$gwPort/auth/v1" |
    Set-Content $supaDockerEnv
Write-Host "  [2/3] Supabase .env written (SITE_URL localhost:$AppPort, gateway port $gwPort)." -ForegroundColor Green

# ---------- 4. firewall ----------
Write-Host "  [3/3] ONE firewall rule is needed (browser -> app port $AppPort) - requires" -ForegroundColor Yellow
Write-Host "        admin OR ask college IT to open TCP port $AppPort. Everything else" -ForegroundColor Yellow
Write-Host "        stays on localhost, nothing else is exposed to students." -ForegroundColor Yellow
Write-Host ""
Write-Host "    netsh advfirewall firewall add rule name=`"CareerPath Web`" dir=in action=allow protocol=TCP localport=$AppPort" -ForegroundColor White
Write-Host ""
Write-Host "  Without admin approval, students on the campus LAN cannot reach the server;" -ForegroundColor Yellow
Write-Host "  localhost access still works. Also see SERVER_DEV_README.md PART 1.5." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Then continue with PART 2 of SERVER_DEV_README.md:" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done. The IP never appears anywhere - it may change any time." -ForegroundColor Green
