# CareerPath load test - RUN ON THE SERVER (needs the GPU/CPU capacity).
# Simulates concurrent students hitting the same routes a real session uses.
#
# Usage (on the server, after everything is started):
#   powershell -ExecutionPolicy Bypass -File server\load-test.ps1 -Users 65
#   powershell -ExecutionPolicy Bypass -File server\load-test.ps1 -Users 65 -Target http://localhost:3000 -DurationSec 180
#
# While it runs, watch capacity in other terminals:
#   nvidia-smi -l 2                          # GPU util / VRAM
#   docker logs -f vllm                      # queue depth ("Running: x reqs, Waiting: y")
#   docker stats --no-stream                 # container CPU/RAM
#
# Pass/fail: a route passes if >=90% of its requests succeed and the average
# latency stays under the per-route budget in $budgets below.

param(
    [int]$Users = 65,
    [string]$Target = "http://localhost:3000",
    [int]$DurationSec = 180
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "=== CareerPath load test: $Users users x ${DurationSec}s -> $Target ===" -ForegroundColor Cyan
Write-Host ""

# ---- warm-up (model load + JIT) so results aren't skewed by first hits ----
Write-Host "Warming up (3 AI calls)..."
1..3 | ForEach-Object {
    Invoke-RestMethod -Uri "$Target/api/skills/quiz/generate" -Method Post -ContentType "application/json" -Body '{"career":"Data Analyst"}' -TimeoutSec 120 | Out-Null
}
Write-Host "Warm-up done." -ForegroundColor Green

# ---- worker: each job loops one route mix until the deadline ----
$scriptblock = {
    param($Target, $DurationSec)
    $deadline = (Get-Date).AddSeconds($DurationSec)
    # each user: 1 heavy AI gen, then light calls in a loop (like a real session)
    $result = [ordered]@{
        quizOk = 0;  quizMs = @()
        runOk  = 0;  runMs  = @()
        chatOk = 0;  chatMs = @()
        quizFail = 0; runFail = 0; chatFail = 0
    }
    try {
        Invoke-RestMethod -Uri "$Target/api/skills/quiz/generate" -Method Post -ContentType "application/json" -Body '{"career":"Data Analyst"}' -TimeoutSec 300 | Out-Null
        $result.quizOk++
    } catch { $result.quizFail++ }

    while ((Get-Date) -lt $deadline) {
        # code execution (Judge0 with token; exercises sandbox + fallback)
        $ms = Measure-Command {
            try {
                $r = Invoke-RestMethod -Uri "$Target/api/challenges/run" -Method Post -ContentType "application/json" -Body '{"code":"print(6*7)","language":"python"}' -TimeoutSec 60
                if ($r.success) { $result.runOk++ } else { $result.runFail++ }
            } catch { $result.runFail++ }
        }
        $result.runMs += [int]$ms.TotalMilliseconds

        # chat streaming endpoint (reads the stream)
        $ms = Measure-Command {
            try {
                $resp = Invoke-WebRequest -Uri "$Target/api/chat" -Method Post -ContentType "application/json" -Body '{"message":"hi","history":[]}' -TimeoutSec 60 -UseBasicParsing
                if ($resp.Content.Length -gt 0) { $result.chatOk++ } else { $result.chatFail++ }
            } catch { $result.chatFail++ }
        }
        $result.chatMs += [int]$ms.TotalMilliseconds

        Start-Sleep -Milliseconds 500
    }
    return $result
}

# ---- launch $Users jobs ----
Write-Host "Launching $Users users..."
$jobs = @()
for ($u = 1; $u -le $Users; $u++) {
    $jobs += Start-Job -ScriptBlock $scriptblock -ArgumentList $Target, $DurationSec
}

# ---- progress while running ----
$sw = [System.Diagnostics.Stopwatch]::StartNew()
while ($jobs | Where-Object { $_.State -eq 'Running' }) {
    Start-Sleep -Seconds 20
    $running = ($jobs | Where-Object { $_.State -eq 'Running' }).Count
    Write-Host ("  [{0,3}s] {1}/{2} users still running..." -f [int]$sw.Elapsed.TotalSeconds, $running, $Users)
}
$jobs | Wait-Job -Timeout 600 | Out-Null

# ---- aggregate ----
$agg = [ordered]@{ quizOk=0; runOk=0; chatOk=0; quizFail=0; runFail=0; chatFail=0 }
$quizAll=@(); $runAll=@(); $chatAll=@()
foreach ($j in $jobs) {
    $r = Receive-Job -Job $j
    $agg.quizOk += $r.quizOk;   $agg.quizFail += $r.quizFail; $quizAll += $r.quizMs
    $agg.runOk  += $r.runOk;    $agg.runFail  += $r.runFail;  $runAll  += $r.runMs
    $agg.chatOk += $r.chatOk;   $agg.chatFail += $r.chatFail; $chatAll += $r.chatMs
}
$jobs | Remove-Job -Force

function Stats($arr) {
    if ($arr.Count -eq 0) { return @{ avg=0; p95=0; max=0 } }
    $s = $arr | Sort-Object
    [ordered]@{
        avg = [int](($s | Measure-Object -Average).Average)
        p95 = $s[[int][Math]::Floor($s.Count * 0.95) - 1]
        max = $s[-1]
    }
}
$qs = Stats $quizAll; $rs = Stats $runAll; $cs = Stats $chatAll

Write-Host ""
Write-Host "================ RESULTS ($Users users, ${DurationSec}s) ================" -ForegroundColor Cyan
Write-Host ("{0,-12} {1,6} {2,6} {3,7} {4,8} {5,8} {6,8}" -f "Route","OK","Fail","Pass%","Avg ms","p95 ms","Max ms")
function Line($name,$ok,$fail,$s,$budget) {
    $total = $ok + $fail
    $passPct = if ($total -gt 0) { [int](100 * $ok / $total) } else { 0 }
    $verdict = if ($passPct -ge 90 -and $s.avg -le $budget) { "PASS" } else { "FAIL" }
    Write-Host ("{0,-12} {1,6} {2,6} {3,6}% {4,8} {5,8} {6,8}  -> {7}" -f $name,$ok,$fail,$passPct,$s.avg,$s.p95,$s.max,$verdict) -ForegroundColor $(if ($verdict -eq "PASS") { "Green" } else { "Red" })
}
Line "quiz/gen"   $agg.quizOk $agg.quizFail $qs 120000
Line "challenges/run" $agg.runOk  $agg.runFail  $rs 30000
Line "chat"       $agg.chatOk $agg.chatFail $cs 60000
Write-Host "========================================================"
Write-Host "Verdict thresholds: >=90% success AND avg latency within budget."
Write-Host "If FAIL: check 'docker logs vllm' queue depth, lower --max-num-seqs, or accept queueing (vLLM queues rather than rejects)."
