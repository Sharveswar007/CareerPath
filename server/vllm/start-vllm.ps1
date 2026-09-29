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
    # API key so strangers cannot freeload the GPU through the tunnel.
    # MUST match AI_API_KEY in Vercel environment variables.
    [string]$ApiKey = "cp-vllm-4f9d2a81c67b45e3a2d80f19c3e75b64"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

# If an old container exists, replace it
docker rm -f vllm 2>$null | Out-Null

docker run -d --name vllm `
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
Write-Host "Follow progress:   docker logs -f vllm"
Write-Host "Ready when you see: Route: /v1/chat/completions, Methods: POST"
Write-Host "Test afterwards:   http://localhost:8001/v1/models  (should list careerpath-ai)"
