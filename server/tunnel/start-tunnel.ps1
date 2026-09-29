# CareerPath quick-tunnel launcher - NO Cloudflare account needed
# Exposes vLLM (8001), Supabase (8000), and Judge0 (2358) via trycloudflare.com quick tunnels.
#
# Usage:  powershell -ExecutionPolicy Bypass -File server\tunnel\start-tunnel.ps1
#
# HOW QUICK TUNNELS WORK (read once):
#   - Each trycloudflare.com URL is random and stays valid while its container runs.
#   - If you restart the PC or re-run this script, URLs CHANGE.
#   - After (re)starting, run get-tunnel-urls.ps1 and update the three env vars in Vercel
#     (Settings -> Environment Variables) if the values changed, then Redeploy.
#
# UPGRADE PATH (recommended before real users):
#   Buy a domain (~INR 200-800/yr), add it to a free Cloudflare account, create a NAMED
#   tunnel with a fixed token, and run one cloudflared container with that token.
#   URLs then never change (vllm.yourdomain.com etc.) and you can lock the endpoints
#   behind Cloudflare Access service tokens. The quick-tunnel setup below is for
#   development and demos.

param(
    [string]$VllmPort = "8001",
    [string]$SupabasePort = "8000",
    [string]$Judge0Port = "2358"
)

$ErrorActionPreference = "Stop"

# Replace existing tunnel containers quietly
foreach ($n in @("cloudflared-vllm", "cloudflared-supabase", "cloudflared-judge0")) {
    docker rm -f $n 2>$null | Out-Null
}

docker run -d --name cloudflared-vllm --restart unless-stopped `
  cloudflare/cloudflared:latest tunnel --no-autoupdate `
  --url "http://host.docker.internal:$VllmPort"

docker run -d --name cloudflared-supabase --restart unless-stopped `
  cloudflare/cloudflared:latest tunnel --no-autoupdate `
  --url "http://host.docker.internal:$SupabasePort"

docker run -d --name cloudflared-judge0 --restart unless-stopped `
  cloudflare/cloudflared:latest tunnel --no-autoupdate `
  --url "http://host.docker.internal:$Judge0Port"

Write-Host ""
Write-Host "3 tunnel containers started. Fetching URLs..." -ForegroundColor Green
Write-Host "(URLs appear in each container's logs ~5-10 seconds after start)"
Write-Host ""
Write-Host "Run this to print them:"
Write-Host "  powershell -ExecutionPolicy Bypass -File server\tunnel\get-tunnel-urls.ps1"
Write-Host ""
Write-Host "Then set in Vercel (if changed):"
Write-Host "  AI_BASE_URL     = <vllm-url>/v1"
Write-Host "  NEXT_PUBLIC_SUPABASE_URL = <supabase-url>"
Write-Host "  JUDGE0_URL      = <judge0-url>"
Write-Host "and Redeploy."
