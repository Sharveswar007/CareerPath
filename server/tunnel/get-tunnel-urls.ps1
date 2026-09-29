# Prints the public trycloudflare.com URLs for each tunnel container.
# Usage:  powershell -ExecutionPolicy Bypass -File server\tunnel\get-tunnel-urls.ps1

$containers = @(
    @{ Name = "cloudflared-vllm";     Label = "vLLM     (AI_BASE_URL -> <url>/v1)" },
    @{ Name = "cloudflared-supabase"; Label = "Supabase(NEXT_PUBLIC_SUPABASE_URL)" },
    @{ Name = "cloudflared-judge0";   Label = "Judge0   (JUDGE0_URL)" }
)

foreach ($c in $containers) {
    $logs = docker logs $c.Name 2>&1 | Out-String
    if ($logs -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
        $url = $Matches[0]
        Write-Host ("{0} : {1}" -f $c.Label, $url) -ForegroundColor Green
    } else {
        Write-Host ("{0} : no URL found yet - wait ~10s and re-run, or check 'docker logs {1}'" -f $c.Label, $c.Name) -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Reminder: quick-tunnel URLs change whenever the tunnels are restarted."
Write-Host "Update the matching Vercel environment variables if any URL changed, then Redeploy."
