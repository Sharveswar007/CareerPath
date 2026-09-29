# CareerPath server smoke test - verifies Judge0, vLLM, and Supabase in one run
# Usage: powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1
# Optional: -VllmUrl / -Judge0Url to test the public tunnel URLs instead of localhost

param(
    [string]$VllmUrl = "http://localhost:8001",
    [string]$Judge0Url = "http://localhost:2358",
    [string]$SupabaseUrl = "http://localhost:8000",
    [string]$Judge0Token = "7e37040d8cc7bc9cba642dd84667aeac3b6248456b95e0f5"
)

$pass = 0; $fail = 0

function Check($name, $ok, $detail) {
    if ($ok) { Write-Host "[PASS] $name $detail" -ForegroundColor Green; $script:pass++ }
    else     { Write-Host "[FAIL] $name $detail" -ForegroundColor Red;   $script:fail++ }
}

# 1. vLLM models endpoint
try {
    $models = Invoke-RestMethod -Uri "$VllmUrl/v1/models" -TimeoutSec 10
    $ok = ($models.data | Where-Object { $_.id -eq "careerpath-ai" }) -ne $null
    Check "vLLM" $ok "($VllmUrl, model careerpath-ai)"
} catch {
    Check "vLLM" $false "($VllmUrl unreachable: $($_.Exception.Message))"
}

# 2. vLLM actual generation (proves GPU inference works end to end)
try {
    $body = @{ model = "careerpath-ai"; max_tokens = 20; messages = @(@{ role = "user"; content = "Say OK" }) } | ConvertTo-Json -Depth 5
    $gen = Invoke-RestMethod -Uri "$VllmUrl/v1/chat/completions" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 60
    $text = $gen.choices[0].message.content
    Check "vLLM generation" ($text.Length -gt 0) "(reply: $($text.Substring(0, [Math]::Min(40, $text.Length))))"
} catch {
    Check "vLLM generation" $false "($($_.Exception.Message))"
}

# 3. Judge0 (requires auth token - must match AUTHN_TOKEN in judge0.conf)
$j0Headers = @{ "X-Auth-Token" = $Judge0Token }
try {
    $info = Invoke-RestMethod -Uri "$Judge0Url/system_info" -TimeoutSec 10 -Headers $j0Headers
    Check "Judge0" $true "(version $($info.version) at $Judge0Url)"
} catch {
    Check "Judge0" $false "($Judge0Url unreachable or token rejected)"
}

# 3b. Judge0 real code execution (proves sandbox works end to end)
try {
    $body = @{ language_id = 71; source_code = "print(6*7)" } | ConvertTo-Json
    $run = Invoke-RestMethod -Uri "$Judge0Url/submissions?base64_encoded=false&wait=true" -Method Post -ContentType "application/json" -Headers $j0Headers -Body $body -TimeoutSec 30
    Check "Judge0 execution" (("$($run.stdout)".Trim()) -eq "42") "(output: $($run.stdout))"
} catch {
    Check "Judge0 execution" $false "($($_.Exception.Message))"
}

# 4. Supabase Studio (Kong gateway)
try {
    $resp = Invoke-WebRequest -Uri "$SupabaseUrl/rest/v1/" -TimeoutSec 10 -UseBasicParsing
    Check "Supabase API" ($resp.StatusCode -lt 500) "(HTTP $($resp.StatusCode) at $SupabaseUrl)"
} catch {
    # 401/403 without apikey is still proof the gateway is up
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) {
        Check "Supabase API" $true "(gateway reachable, auth required as expected)"
    } else {
        Check "Supabase API" $false "($SupabaseUrl unreachable)"
    }
}

# 5. GPU check
try {
    $smi = nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader 2>$null
    Check "GPU" ($LASTEXITCODE -eq 0) "($smi)"
} catch {
    Check "GPU" $false "(nvidia-smi failed)"
}

Write-Host ""
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
