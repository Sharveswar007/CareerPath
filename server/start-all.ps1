# CareerPath server - start EVERYTHING with one command:
#   powershell -ExecutionPolicy Bypass -File server\start-all.ps1
# Safe to re-run: every step is idempotent.
#
# Optional flags:
#   -SkipVllm    don't (re)start the AI container
#   -SkipTunnel  don't start the public tunnel containers

param(
    [switch]$SkipVllm,
    [switch]$SkipTunnel
)

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot   # the server/ folder

Write-Host "=== CareerPath: starting all services ===" -ForegroundColor Cyan

# 0. Docker running?
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Start Docker Desktop first, then re-run." -ForegroundColor Red
    exit 1
}

# 1. Judge0 (code execution)
Write-Host "`n[1/4] Judge0..." -ForegroundColor Yellow
docker compose -f "$root\judge0\docker-compose.yml" up -d

# 2. vLLM (the AI)
if (-not $SkipVllm) {
    Write-Host "`n[2/4] vLLM (AI)..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "$root\vllm\start-vllm.ps1"
} else {
    Write-Host "`n[2/4] vLLM skipped (-SkipVllm)" -ForegroundColor DarkGray
}

# 3. Supabase (database + auth)
Write-Host "`n[3/4] Supabase..." -ForegroundColor Yellow
docker compose -f "$root\supabase\docker\docker-compose.yml" up -d

# 4. Cloudflare tunnels (public URLs)
if (-not $SkipTunnel) {
    Write-Host "`n[4/4] Cloudflare tunnels..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "$root\tunnel\start-tunnel.ps1"
} else {
    Write-Host "`n[4/4] Tunnels skipped (-SkipTunnel)" -ForegroundColor DarkGray
}

Write-Host "`n=== Waiting for health checks (30s)... ===" -ForegroundColor Cyan
Start-Sleep -Seconds 30
docker ps --format "{{.Names}} | {{.Status}}" | Sort-Object

Write-Host "`n=== Done. Next steps ===" -ForegroundColor Green
Write-Host "  URLs + status : powershell -File $root\tunnel\get-tunnel-urls.ps1"
Write-Host "  Full check    : powershell -File $root\smoke-test.ps1"
Write-Host "  Load test     : powershell -File $root\load-test.ps1 -Users 65"
Write-Host "  Stop all      : powershell -File $root\stop-all.ps1"
