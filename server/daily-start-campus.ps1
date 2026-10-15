# CareerPath - CAMPUS MODE daily start
# ─────────────────────────────────────────────────────────────
# Everything runs on the college server itself. Students browse to
#   http://<SERVER-LAN-IP>:3000
# No Cloudflare tunnels. No Vercel. No URLs that change daily.
#
# What it does:
#   1. checks Docker Desktop is running
#   2. starts Judge0 + Supabase + vLLM        (start-all.ps1 -SkipTunnel)
#   3. waits for every container + the AI model to load
#   4. starts the Next.js app (npm run build if .next missing, then npm start)
#   5. prints the exact URL students + staff should open
#
# Usage (every morning):
#   powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1
#
# Optional:
#   -SkipVllm   reuse a running vLLM (faster when restarting mid-day)
#   -Build      force a fresh production build (after pulling new code)
#   -Port 3000  app port if you changed it
#
# Log: server\logs\daily-start-campus-YYYYMMDD.log

param(
    [switch]$SkipVllm,
    [switch]$Build,
    [string]$Port = "3000"
)

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
$repoRoot = Split-Path $root -Parent

$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
Start-Transcript -Path (Join-Path $logDir ("daily-start-campus-{0}.log" -f (Get-Date -Format "yyyyMMdd"))) -Append | Out-Null

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CareerPath CAMPUS start  $(Get-Date -Format 'ddd dd MMM yyyy  HH:mm')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------- 1. Docker ----------
Write-Host "`n[1/5] Docker Desktop..." -ForegroundColor Yellow
docker ps *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Docker Desktop is NOT running." -ForegroundColor Red
    Write-Host "  -> Start menu, open 'Docker Desktop', wait for 'running'," -ForegroundColor Yellow
    Write-Host "     then run this script again." -ForegroundColor Yellow
    Stop-Transcript | Out-Null
    exit 1
}
Write-Host "  Docker OK" -ForegroundColor Green

# ---------- 2. Containers ----------
Write-Host "`n[2/5] Starting Judge0 + Supabase + vLLM (no tunnels, campus mode)..." -ForegroundColor Yellow
$startAll = @{ SkipTunnel = $true }
if ($SkipVllm) { $startAll.SkipVllm = $true }
& "$root\start-all.ps1" @startAll

# ---------- 3. Wait for health ----------
Write-Host "`n[3/5] Waiting for containers + AI model..." -ForegroundColor Yellow
$deadline = (Get-Date).AddMinutes(6)
$ready = $false
$elapsed = 0
while ((Get-Date) -lt $deadline) {
    $names      = docker ps --format "{{.Names}}"
    $vllmOk     = $SkipVllm -or ($null -ne ($names | Select-String -Quiet -Pattern "^careerpath-vllm"))
    $supaOk     = ($null -ne ($names | Select-String -Quiet -Pattern "^careerpath-envoy"))
    $judgeOk    = ($null -ne ($names | Select-String -Quiet -Pattern "^careerpath-judge0$"))
    if ($vllmOk -and $supaOk -and $judgeOk) { $ready = $true; break }
    $elapsed += 10
    Write-Host "  ...containers coming up ($elapsed s elapsed)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 10
}
if (-not $ready) {
    Write-Host "  WARNING: some containers are still not up after 6 minutes." -ForegroundColor Red
    Write-Host "  Run:  docker ps -a   and   docker logs <name>   for the failing one." -ForegroundColor Yellow
}

if (-not $SkipVllm) {
    Write-Host "  Waiting for the AI model to load (2-4 min first start of the day)..." -ForegroundColor DarkGray
    $vllmReady = $false
    for ($i = 0; $i -lt 36; $i++) {
        $r = docker logs careerpath-vllm 2>&1 | Out-String
        if ($r -match "Uvicorn running|Application startup complete") { $vllmReady = $true; break }
        Start-Sleep -Seconds 10
    }
    if ($vllmReady) { Write-Host "  AI model loaded and serving." -ForegroundColor Green }
    else { Write-Host "  vLLM still loading or failed - check:  docker logs careerpath-vllm" -ForegroundColor Yellow }
}

# ---------- 4. Next.js app ----------
Write-Host "`n[4/5] Starting the web app on port $Port..." -ForegroundColor Yellow

$envFile = Join-Path $repoRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "  MISSING .env.local next to the code." -ForegroundColor Red
    Write-Host "  -> Copy the template:  Copy-Item server\env.campus.template .env.local" -ForegroundColor Yellow
    Write-Host "     or run the wizard:    powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1" -ForegroundColor Yellow
    Stop-Transcript | Out-Null
    exit 1
}
Write-Host "  .env.local found." -ForegroundColor Green

# NEXT_PUBLIC_* values are baked in at build time; a stale .next + new IP breaks auth.
# Also verify they are FILLED - a template copy builds fine until Next prerenders
# the login page, which then dies with the cryptic
#   "@supabase/ssr: Your project's URL and API key are required to create a Supabase client!"
$envLines = Get-Content $envFile
$supaUrl   = ($envLines | Select-String -Pattern "^NEXT_PUBLIC_SUPABASE_URL=(.+)$").Matches[0].Groups[1].Value
$supaAnon  = ($envLines | Select-String -Pattern "^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$").Matches[0].Groups[1].Value
if (-not $supaUrl -or $supaUrl -match "PASTE|your-project|your_supabase" -or
    -not $supaAnon -or $supaAnon.Length -lt 40 -or $supaAnon -match "PASTE|your_supabase") {
    Write-Host "  .env.local exists but the Supabase URL/key are MISSING or still placeholders." -ForegroundColor Red
    Write-Host "  Run the wizard to fill them from server\supabase\docker\.env:" -ForegroundColor Yellow
    Write-Host "    powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1" -ForegroundColor White
    Stop-Transcript | Out-Null
    exit 1
}
Write-Host "  .env.local Supabase URL + key look filled (anon key $($supaAnon.Length) chars)." -ForegroundColor Green
$needsBuild = $Build -or -not (Test-Path (Join-Path $repoRoot ".next"))
if ($needsBuild) {
    Write-Host "  Building production bundle (npm run build; first time ~3-5 min)..." -ForegroundColor Yellow
    Push-Location $repoRoot
    if (-not (Test-Path (Join-Path $repoRoot "node_modules"))) {
        Write-Host "  Installing dependencies first (npm install)..." -ForegroundColor DarkGray
        npm install
        if ($LASTEXITCODE -ne 0) { Write-Host "  npm install FAILED." -ForegroundColor Red; Pop-Location; Stop-Transcript | Out-Null; exit 1 }
    }
    npm run build
    $buildExit = $LASTEXITCODE
    Pop-Location
    if ($buildExit -ne 0) {
        Write-Host "  Build FAILED - app will not start. Fix the build error first." -ForegroundColor Red
        Stop-Transcript | Out-Null
        exit 1
    }
} else {
    Write-Host "  Reusing existing production build (use -Build to rebuild)." -ForegroundColor DarkGray
}

# start if nothing is listening on the port yet
$portBusy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portBusy) {
    Write-Host "  Something is already listening on port $Port (npm start already running?)." -ForegroundColor DarkGray
} else {
    Write-Host "  Launching  npm start  in the background..." -ForegroundColor DarkGray
    Push-Location $repoRoot
    Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c npm start -- -p $Port > server\logs\app-server.log 2>&1"
    Pop-Location
    # wait for the port to open
    for ($i = 0; $i -lt 24; $i++) {
        if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { break }
        Start-Sleep -Seconds 5
    }
}

# ---------- 5. Verdict + URL ----------
Write-Host "`n[5/5] Health verdict..." -ForegroundColor Yellow
$healthy = $false
try {
    $h = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 15
    $healthy = $h.status -eq "healthy"
    if ($h.deps) {
        foreach ($p in $h.deps.PSObject.Properties) {
            Write-Host ("    {0,-12} {1}" -f $p.Name, $p.Value.detail) -ForegroundColor DarkGray
        }
    }
} catch { Write-Host "  /api/health not answering yet - give it 30 more seconds and check." -ForegroundColor Yellow }

$lanIp = $null
foreach ($nic in (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue)) {
    if ($nic.IPAddress -notmatch "^127\.|^169\.254\." -and $nic.InterfaceAlias -notmatch "Loopback|vEthernet|Docker|WSL") {
        $lanIp = $nic.IPAddress; break
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
if ($healthy -and $lanIp) {
    Write-Host "  READY - give students this URL:" -ForegroundColor Green
    Write-Host "      http://${lanIp}:$Port" -ForegroundColor Green
} elseif ($healthy) {
    Write-Host "  READY locally. Detect no LAN IP - type  ipconfig  and use the IPv4 Address:" -ForegroundColor Yellow
    Write-Host "      http://<SERVER-IP>:$Port" -ForegroundColor Yellow
} else {
    Write-Host "  NOT READY - /api/health is not healthy yet." -ForegroundColor Red
    Write-Host "  Check the printed dependency lines above and server\logs\app-server.log" -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "At 6 PM run:  powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1" -ForegroundColor DarkGray
Write-Host ""
Stop-Transcript | Out-Null
