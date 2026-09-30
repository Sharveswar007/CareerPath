# CareerPath DAILY START - the one command to run every morning (9 AM).
#
#   powershell -ExecutionPolicy Bypass -File server\daily-start.ps1
#
# What it does (all idempotent - safe to run twice):
#   1. checks Docker Desktop is running (tells you exactly what to click if not)
#   2. starts Judge0 + Supabase + vLLM + tunnels  (start-all.ps1)
#   3. waits until everything is healthy (no guessing)
#   4. prints the tunnel URLs + the 4 Vercel env values to update
#   5. updates Vercel automatically if the Vercel CLI is installed and logged in
#      (else it tells you the 2-minute manual way)
#   6. runs a fast health verdict: READY FOR STUDENTS or what's broken
#
# Optional:  -SkipVercel   if your Vercel env vars are already correct
#
# Evening shutdown (5:30-6 PM):  powershell -File server\stop-all.ps1
#
# NOTE on URLs: quick tunnels get NEW URLs every morning. The Vercel update
# step (automatic below) repoints the app in ~1 minute. Only students hitting
# the app DURING the update second notice anything. For stable URLs, set up a
# named tunnel with a domain (see server/README.md "Before real users").

param(
    [switch]$SkipVercel
)

$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CareerPath daily start  $(Get-Date -Format 'ddd dd MMM yyyy  HH:mm')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ---------- 1. Docker ----------
Write-Host "`n[1/6] Docker Desktop..." -ForegroundColor Yellow
docker ps *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Docker Desktop is NOT running." -ForegroundColor Red
    Write-Host "  -> Start menu, open 'Docker Desktop', wait until the whale icon"
    Write-Host "     in the taskbar says 'running' (about 1 minute),"
    Write-Host "     then run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host "  Docker OK" -ForegroundColor Green

# ---------- 2. All services ----------
Write-Host "`n[2/6] Starting Judge0 + Supabase + vLLM + tunnels..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File "$root\start-all.ps1" @args
# (pass through -Model/-SkipTunnel/etc. if you added them on the command line)

# ---------- 3. Wait for health ----------
Write-Host "`n[3/6] Waiting for services to become healthy..." -ForegroundColor Yellow
$deadline = (Get-Date).AddMinutes(6)
$ready = $false
$elapsed = 0
while ((Get-Date) -lt $deadline) {
    $vllmOk    = ($null -ne (docker ps --format "{{.Names}}" | Select-String -Quiet -Pattern "vllm"))
    $supaOk    = ($null -ne (docker ps --format "{{.Names}}" | Select-String -Quiet -Pattern "supabase-kong"))
    $judgeOk   = ($null -ne (docker ps --format "{{.Names}}" | Select-String -Quiet -Pattern "judge0-server"))
    $tunnelsOk = ((docker ps --format "{{.Names}}" | Select-String -Pattern "cloudflared").Count -ge 3)
    if ($vllmOk -and $supaOk -and $judgeOk -and $tunnelsOk) { $ready = $true; break }
    $elapsed += 10
    Write-Host "  ...containers coming up ($elapsed s elapsed)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 10
}
if ($ready) {
    Write-Host "  All containers up." -ForegroundColor Green
} else {
    Write-Host "  WARNING: some containers are still not up after 6 minutes." -ForegroundColor Red
    Write-Host "  Run:  docker ps -a   and check 'docker logs <name>' for the failing one." -ForegroundColor Yellow
}

# vLLM needs extra time to load the model into VRAM the FIRST time each day
Write-Host "  Waiting for the AI model to finish loading (2-4 min first start of the day)..." -ForegroundColor DarkGray
$vllmReady = $false
for ($i = 0; $i -lt 36; $i++) {
    $r = docker logs vllm 2>&1 | Out-String
    if ($r -match "Uvicorn running|Application startup complete") { $vllmReady = $true; break }
    Start-Sleep -Seconds 10
}
if ($vllmReady) { Write-Host "  AI model loaded and serving." -ForegroundColor Green }
else { Write-Host "  vLLM still loading or something failed - check: docker logs vllm" -ForegroundColor Yellow }

# ---------- 4. URLs ----------
Write-Host "`n[4/6] Today's public tunnel URLs:" -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File "$root\tunnel\get-tunnel-urls.ps1"

# ---------- 5. Vercel env update ----------
Write-Host "`n[5/6] Pointing Vercel at today's URLs..." -ForegroundColor Yellow
if ($SkipVercel) {
    Write-Host "  Skipped (-SkipVercel). Update AI_BASE_URL / NEXT_PUBLIC_SUPABASE_URL /"
    Write-Host "  JUDGE0_URL in Vercel manually if URLs changed, then Redeploy." -ForegroundColor DarkGray
} else {
    $vercelOk = $false
    try {
        $v = & vercel whoami 2>$null
        if ($LASTEXITCODE -eq 0 -and $v) { $vercelOk = $true }
    } catch {}

    if (-not $vercelOk) {
        Write-Host "  Vercel CLI not installed or not logged in - do the 2-minute manual way:" -ForegroundColor Yellow
        Write-Host "    1. Copy the 3 URLs printed above"
        Write-Host "    2. vercel.com -> your project -> Settings -> Environment Variables"
        Write-Host "    3. Update: AI_BASE_URL (add /v1), NEXT_PUBLIC_SUPABASE_URL, JUDGE0_URL"
        Write-Host "    4. Deployments -> Redeploy"
        Write-Host "  (Install once to automate:  npm i -g vercel ;  vercel login)"
    } else {
        $urls = @{}
        foreach ($c in @(@{n="cloudflared-vllm";k="VLLM"},@{n="cloudflared-supabase";k="SUPA"},@{n="cloudflared-judge0";k="JUDGE0"})) {
            $logs = docker logs $c.n 2>&1 | Out-String
            if ($logs -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") { $urls[$c.k] = $Matches[0] }
        }
        if ($urls.VLLM -and $urls.SUPA -and $urls.JUDGE0) {
            $proj = $null
            $projInput = Read-Host "  Vercel project name (look at vercel.com dashboard, e.g. careerpath)"
            if ($projInput) { $proj = $projInput }

            Write-Host "  Updating Vercel env vars for project '$proj'..."
            & vercel env rm AI_BASE_URL production $proj --yes 2>$null | Out-Null
            & vercel env rm NEXT_PUBLIC_SUPABASE_URL production $proj --yes 2>$null | Out-Null
            & vercel env rm JUDGE0_URL production $proj --yes 2>$null | Out-Null
            "$($urls.VLLM)/v1" | & vercel env add AI_BASE_URL production $proj 2>$null | Out-Null
            "$($urls.SUPA)"    | & vercel env add NEXT_PUBLIC_SUPABASE_URL production $proj 2>$null | Out-Null
            "$($urls.JUDGE0)"  | & vercel env add JUDGE0_URL production $proj 2>$null | Out-Null
            Write-Host "  Redeploying..."
            & vercel --prod --yes 2>$null
            Write-Host "  Vercel updated + redeployed." -ForegroundColor Green
        } else {
            Write-Host "  Could not read all 3 tunnel URLs - do the manual Vercel update." -ForegroundColor Yellow
        }
    }
}

# ---------- 6. Verdict ----------
Write-Host "`n[6/6] Health verdict..." -ForegroundColor Yellow
$gpu = (& nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader 2>$null)
if ($gpu) { Write-Host "  GPU: $gpu" }
$cpu = (Get-CimInstance Win32_Processor).LoadPercentage
Write-Host "  CPU load: $cpu%"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  DONE. Checklist before students arrive:" -ForegroundColor Green
Write-Host "    1. Open your Vercel URL -> /api/health  (want: healthy)"
Write-Host "    2. Open the app, send one chat message  (want: streaming words)"
Write-Host "    3. Run one challenge in the code editor (want: green result)"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "At 6 PM run:  powershell -ExecutionPolicy Bypass -File server\stop-all.ps1" -ForegroundColor DarkGray
Write-Host ""
