# Upgrade from random trycloudflare.com URLs to a NAMED Cloudflare tunnel:
# URLs that NEVER change (vllm.yourdomain.com etc.), work on any network that
# allows outbound HTTPS, and can be locked down with Cloudflare Access later.
#
# Prerequisites (one-time, ~30 min, full walkthrough in the root
# SERVER_DEPLOYMENT_GUIDE.md "PART 6 - Named tunnel"):
#   1. Buy a domain (~Rs 500/yr), add it to a free Cloudflare account
#      (Cloudflare shows 2 nameservers - set them at your registrar)
#   2. Cloudflare dashboard -> Zero Trust -> Networks -> Tunnels ->
#      Create tunnel -> "Cloudflared" -> name it careerpath
#   3. In the tunnel's "Public Hostname" tab add the 3 routes:
#        vllm.yourdomain.com     -> http://localhost:8001
#        supabase.yourdomain.com -> http://localhost:8000
#        judge0.yourdomain.com   -> http://localhost:2358
#      (adjust hostnames to your domain; ports already match this stack)
#   4. Copy the tunnel token (starts with eyJ...)
#
# Then run ON THE SERVER - that's the whole server-side setup:
#   powershell -ExecutionPolicy Bypass -File server\tunnel\start-named-tunnel.ps1 -Token "eyJ..."
#
# In Vercel set ONCE (never changes again):
#   AI_BASE_URL               = https://vllm.yourdomain.com/v1
#   NEXT_PUBLIC_SUPABASE_URL  = https://supabase.yourdomain.com
#   JUDGE0_URL                = https://judge0.yourdomain.com
#
# With this done, daily-start.ps1 can be run with -SkipVercel every morning:
# URLs never change, so there is nothing to update anymore.

param(
    [Parameter(Mandatory = $true)][string]$Token
)

$ErrorActionPreference = "Stop"

# remove the old quick-tunnel containers (superseded by the named tunnel)
foreach ($n in @("cloudflared-vllm", "cloudflared-supabase", "cloudflared-judge0")) {
    docker rm -f $n 2>$null | Out-Null
}
docker rm -f cloudflared-named 2>$null | Out-Null

# ONE connector runs the whole tunnel. With a dashboard-managed (token) tunnel
# all routing lives in the Cloudflare dashboard's Public Hostname tab, so a
# single container serves all three hostnames.
docker run -d --name cloudflared-named --restart unless-stopped `
  cloudflare/cloudflared:latest tunnel --no-autoupdate run --token $Token

Start-Sleep -Seconds 8
$logs = docker logs cloudflared-named 2>&1 | Out-String
if ($logs -match "Registered tunnel connection") {
    Write-Host ""
    Write-Host "Named tunnel CONNECTED." -ForegroundColor Green
    Write-Host "Your 3 hostnames now reach this server - test one in a browser:"
    Write-Host "  https://supabase.yourdomain.com/rest/v1/   (want: 401 JSON = working)"
} elseif ($logs -match "failed|error") {
    Write-Host ""
    Write-Host "Tunnel did not connect - check the token and dashboard routing:" -ForegroundColor Red
    docker logs cloudflared-named 2>&1 | Select-Object -Last 6
} else {
    Write-Host ""
    Write-Host "Started - check connection status:  docker logs -f cloudflared-named" -ForegroundColor Yellow
}
