# CareerPath vLLM launcher - CodeLlama-13B-Instruct-AWQ on RTX 5090 (32GB)
# Run from anywhere in PowerShell:  powershell -ExecutionPolicy Bypass -File server\vllm\start-vllm.ps1
# Optional: -CacheDir "D:\CareerPath-Server\hf-cache"

param(
    [string]$CacheDir = "C:\CareerPath-Server\hf-cache",
    # Production default: CodeLlama-13B-AWQ (~8GB weights, best quality).
    # For a lighter/faster test run:  -Model Qwen/Qwen2.5-Coder-7B-Instruct-AWQ
    [string]$Model = "TheBloke/CodeLlama-13B-Instruct-AWQ",
    [int]$ContextLen = 8192,
    [int]$MaxSeqs = 32,
    # API key so strangers cannot freeload the GPU. Left unset, it is read
    # from the repo root's .env.local (AI_API_KEY, written by the campus
    # setup wizard) or from .env.campus.local. MUST match AI_API_KEY in the
    # app config or every AI call returns 401.
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

if (-not $ApiKey) {
    $repoRoot = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
    foreach ($f in @((Join-Path $repoRoot ".env.campus.local"), (Join-Path $repoRoot ".env.local"))) {
        if (Test-Path $f) {
            $hit = Select-String -Path $f -Pattern "^AI_API_KEY=(.+)$"
            if ($hit) { $ApiKey = $hit.Matches[0].Groups[1].Value; break }
        }
    }
}
if (-not $ApiKey) {
    Write-Host "No AI_API_KEY found (.env.campus.local / .env.local) - refusing to start vLLM without one." -ForegroundColor Red
    Write-Host "Run  server\campus-setup.ps1  first, or pass  -ApiKey <key>." -ForegroundColor Yellow
    exit 1
}
Write-Host "vLLM API key loaded (starts with: $($ApiKey.Substring(0, 8))...)."

New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

# If an old container exists, replace it (ONLY our own, careerpath-prefixed,
# container - never touches other projects' containers)
docker rm -f careerpath-vllm 2>$null | Out-Null

docker run -d --name careerpath-vllm `
  --restart unless-stopped `
  --gpus all `
  --ipc=host `
  -p 8001:8000 `
  -v "$($CacheDir):/root/.cache/huggingface" `
  vllm/vllm-openai:latest `
  --model $Model `
  --served-model-name careerpath-ai `
  --max-model-len $ContextLen `
  --max-num-seqs $MaxSeqs `
  --gpu-memory-utilization 0.92 `
  --api-key $ApiKey `
  --kv-cache-dtype fp8

Write-Host ""
Write-Host "vLLM container started." -ForegroundColor Green
Write-Host "First run downloads ~8GB of model weights into $CacheDir"
Write-Host "Follow progress:   docker logs -f careerpath-vllm"
Write-Host "Ready when you see: Route: /v1/chat/completions, Methods: POST"
Write-Host "Test afterwards:   http://localhost:8001/v1/models  (should list careerpath-ai)"
