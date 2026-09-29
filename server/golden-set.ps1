# CareerPath golden-set evaluation - measures STRUCTURAL AI accuracy.
# RUN ON THE SERVER (or anywhere that can reach the vLLM endpoint).
#
# What it does: sends ~20 fixed prompts (the same shapes the app sends) and
# checks every response is parseable JSON with the fields the app requires.
# Use it BEFORE demo week and after any model/prompt change; a score below
# 80% overall means do not change anything else until it improves.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File server\golden-set.ps1
#   powershell -ExecutionPolicy Bypass -File server\golden-set.ps1 -BaseUrl "http://localhost:8000/v1" -MinScore 80
#
# Note: measures JSON validity + required structure only. Spot-check a few
# answers manually for factual quality (no script can grade truth).

param(
    [string]$BaseUrl = "http://localhost:8000/v1",
    [string]$ApiKey  = "",
    [string]$Model   = "careerpath-ai",
    [double]$MinScore = 80,
    [string]$PromptsFile = "$PSScriptRoot\golden-prompts.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PromptsFile)) {
    Write-Host "ERROR: prompts file not found: $PromptsFile" -ForegroundColor Red
    exit 1
}
$spec = Get-Content $PromptsFile -Raw | ConvertFrom-Json

function Extract-Json([string]$text) {
    # mirrors the app's defensive extraction: strip fences, find first {...}
    $t = $text.Trim() -replace '(?s)^```(json)?\s*', '' -replace '(?s)\s*```$', ''
    try { return $t | ConvertFrom-Json } catch {}
    $start = $t.IndexOf("{")
    if ($start -ge 0) {
        # try progressively shorter suffixes from the first brace
        for ($end = $t.Length; $end -gt $start + 1; $end--) {
            $slice = $t.Substring($start, $end - $start)
            try { return $slice | ConvertFrom-Json } catch {}
        }
    }
    return $null
}

function Test-Shape($obj, $v) {
    if ($null -eq $obj) { return $false }
    if ($v.requiredKey) {
        if (-not $obj.PSObject.Properties[$v.requiredKey]) { return $false }
        $arr = $obj.($v.requiredKey)
        if ($arr -isnot [System.Array]) { return $false }
        if ($arr.Count -lt $v.minItems) { return $false }
        foreach ($item in $arr) {
            foreach ($k in $v.itemKeys) {
                if (-not $item.PSObject.Properties[$k]) { return $false }
            }
        }
    }
    return $true
}

Write-Host ""
Write-Host "=== CareerPath golden-set evaluation ===" -ForegroundColor Cyan
Write-Host "Endpoint: $BaseUrl   Model: $Model"
Write-Host ""

$total = 0; $passed = 0
$failures = New-Object System.Collections.Generic.List[string]

foreach ($cat in $spec.categories) {
    $catTotal = 0; $catPass = 0
    foreach ($prompt in $cat.prompts) {
        $catTotal++; $total++
        $body = @{
            model       = $Model
            temperature = 0.4
            max_tokens  = 2048
            messages    = @(
                @{ role = "system"; content = $cat.system },
                @{ role = "user";   content = $prompt }
            )
        } | ConvertTo-Json -Depth 6

        $headers = @{ "Content-Type" = "application/json" }
        if ($ApiKey) { $headers["Authorization"] = "Bearer $ApiKey" }

        try {
            $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/chat/completions" `
                -Headers $headers -Body $body -TimeoutSec 180
            $content = $resp.choices[0].message.content
            $json = Extract-Json $content
            if (Test-Shape $json $cat.validate) {
                $catPass++; $passed++
            } else {
                $failures.Add("$($cat.name): shape invalid")
                Write-Host "  FAIL (shape)  $($cat.name)" -ForegroundColor Red
            }
        } catch {
            $failures.Add("$($cat.name): request failed - $($_.Exception.Message)")
            Write-Host "  FAIL (error)  $($cat.name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    $pct = if ($catTotal -gt 0) { [math]::Round(100 * $catPass / $catTotal) } else { 0 }
    Write-Host ("{0,-18} {1}/{2}  ({3}%)" -f $cat.name, $catPass, $catTotal, $pct) -ForegroundColor $(if ($pct -ge 80) { "Green" } else { "Yellow" })
}

$overall = if ($total -gt 0) { [math]::Round(100 * $passed / $total) } else { 0 }
Write-Host ""
Write-Host "OVERALL: $passed/$total  ($overall%)" -ForegroundColor $(if ($overall -ge $MinScore) { "Green" } else { "Red" })

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Failures:" -ForegroundColor Yellow
    $failures | Select-Object -First 10 | ForEach-Object { Write-Host "  - $_" }
}

if ($overall -lt $MinScore) {
    Write-Host ""
    Write-Host "BELOW THRESHOLD ($MinScore%). Fix model/prompt before demo." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "PASS - model output structure is reliable." -ForegroundColor Green
