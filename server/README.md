# CareerPath Server Kit

Everything the Windows server (RTX 5090, 32GB VRAM) needs, in one folder.
Copy this whole `server/` folder to the server (e.g. `D:\CareerPath-Server\server`).

```
server/
├── README.md              <- you are here (follow steps 1-8)
├── start-all.ps1          <- ONE command: starts Judge0 + vLLM + Supabase + tunnels
├── stop-all.ps1           <- ONE command: stops everything (data preserved)
├── .env.server.example    <- copy to .env.server, fill in passwords/URLs
├── setup-env.sh           <- (re)generates supabase/docker/.env with random secrets
├── vllm/
│   └── start-vllm.ps1     <- starts vLLM with CodeLlama-13B-Instruct-AWQ on :8001
├── judge0/
│   ├── docker-compose.yml <- official Judge0 stack (server+worker+db+redis) on :2358
│   └── judge0.conf        <- pre-configured for Windows WSL2 (passwords + auth token set)
├── supabase/
│   └── docker/            <- full vendored Supabase stack + pre-generated .env
├── tunnel/
│   ├── start-tunnel.ps1   <- 3 public HTTPS URLs, NO Cloudflare account needed
│   └── get-tunnel-urls.ps1<- prints the URLs + which Vercel env var each maps to
├── smoke-test.ps1         <- verifies all 3 services in one command
├── load-test.ps1          <- simulates 65 concurrent users (run ON the server)
└── dev/
    └── mock-vllm.mjs      <- fake AI server: test the app without a GPU
```

NOTE: `supabase/docker/.env` contains REAL generated secrets and is gitignored.
It travels with the folder if you copy it directly. If you ever lose it
(e.g. fresh git clone), regenerate: `bash server/setup-env.sh` (Git Bash or WSL).

## Prerequisites (the ONLY 2 installs, one admin session)

1. NVIDIA driver for RTX 5090 (nvidia.com/download) -> reboot
2. Docker Desktop for Windows, WSL2 backend (docker.com/products/docker-desktop) -> reboot if asked

While admin is present, verify:
```powershell
nvidia-smi     # shows RTX 5090, 32768MiB
wsl --status   # shows default version: 2
```

Then as normal user: start Docker Desktop once, enable
Settings -> General -> "Start Docker Desktop when you sign in".

Nothing else to install: Python/CUDA/Postgres/Redis/cloudflared all live in containers.

## Step 1 - Verify GPU works inside Docker (no admin)

```powershell
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi
```
Expected: nvidia-smi output showing the RTX 5090. If it errors, fix this before continuing.

## Step 2 - Start Judge0 (code execution)

```powershell
cd server\judge0
docker compose up -d
```
Takes ~2-3 min first time (pulls images). Then test:
```powershell
Invoke-RestMethod -Uri "http://localhost:2358/system_info"
```
Expected: JSON with version info.

## Step 3 - Start vLLM (the AI)

```powershell
powershell -ExecutionPolicy Bypass -File server\vllm\start-vllm.ps1
```
First run downloads ~8GB (CodeLlama-13B-Instruct-AWQ). Watch with `docker logs -f vllm`.

Lighter test model (recommended for the first server test, ~6GB download, faster):
```powershell
powershell -ExecutionPolicy Bypass -File server\vllm\start-vllm.ps1 -Model "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"
```
The app always sees the model as `careerpath-ai`, so swapping models never
requires any code or Vercel changes.
Ready when you see: `Route: /v1/chat/completions, Methods: POST`.
Test:
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/v1/models"
```
Expected: lists "careerpath-ai".

## Step 4 - Start Supabase (database + auth)

The full Supabase docker stack is VENDORED in `server\supabase\docker` with a
pre-generated `.env` (random secrets + freshly minted anon/service_role API keys,
self-verified by `setup-env.sh`). Nothing to configure - just start it:

```powershell
cd server\supabase\docker
docker compose up -d
```
First run pulls ~10 images (3-6 min). Studio login: see DASHBOARD_USERNAME /
DASHBOARD_PASSWORD in `supabase\docker\.env`.

Then open http://localhost:8000 (Studio), SQL Editor, paste your repo's
`supabase/schema.sql`, Run.

Note: email confirmation is disabled ON PURPOSE (`ENABLE_EMAIL_AUTOCONFIRM=true`)
so students can log in immediately after signup - no mail server needed.

> If `.env` is missing (fresh git clone - it is gitignored), regenerate first:
> `bash server/setup-env.sh` from the repo root (needs Git Bash or WSL).
>
> After tunnels are running (Step 5), put the supabase tunnel URL into
> SUPABASE_PUBLIC_URL and API_EXTERNAL_URL in that .env, then
> `docker compose up -d` again to apply (auth email links use it).

## Step 5 - Make all 3 services public (no Cloudflare account needed)

```powershell
powershell -ExecutionPolicy Bypass -File server\tunnel\start-tunnel.ps1
powershell -ExecutionPolicy Bypass -File server\tunnel\get-tunnel-urls.ps1
```
You get 3 random `https://xxxx.trycloudflare.com` URLs.

IMPORTANT: quick-tunnel URLs change whenever tunnels restart.
Keep these containers running during your demo. If URLs change:
update AI_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, JUDGE0_URL in Vercel, Redeploy.

Before real users, upgrade to a named tunnel on a cheap domain (~INR 500/yr)
so URLs never change and you can add auth. See notes in start-tunnel.ps1.

## Step 6 - Point Vercel at this server

Vercel -> your project -> Settings -> Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<supabase-tunnel-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase .env>
AI_BASE_URL=https://<vllm-tunnel-url>
AI_API_KEY=cp-vllm-4f9d2a81c67b45e3a2d80f19c3e75b64
AI_MODEL=careerpath-ai
GROQ_API_KEY=dummy_not_used
JUDGE0_URL=https://<judge0-tunnel-url>
JUDGE0_AUTH_TOKEN=7e37040d8cc7bc9cba642dd84667aeac3b6248456b95e0f5
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase .env (line SERVICE_ROLE_KEY)>
```
Both secrets must match their server-side values:
`AI_API_KEY` = the `-ApiKey` used in `start-vllm.ps1`, and `JUDGE0_AUTH_TOKEN`
= `AUTHN_TOKEN` in `server\judge0\judge0.conf`. The defaults above already
do, so you can copy-paste this block as-is.
`SUPABASE_SERVICE_ROLE_KEY` is SERVER-ONLY (bypasses all database security);
it enables the self-service account deletion on `/privacy`.
Then Deployments -> Redeploy.

Also in Supabase Studio -> Authentication -> URL Configuration:
Site URL = your Vercel URL, and add `<vercel-url>/auth/callback` to Redirect URLs.

## Step 7 - Smoke test everything

```powershell
powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1
```
This checks GPU, vLLM (incl. a real generation), Judge0 (incl. a real code
execution with the auth token) and Supabase. Then in the browser on your Vercel
URL: sign up, chat with the AI (words should stream), generate an assessment,
run code in a challenge.

## Step 8 - Load test (65 concurrent users)

```powershell
powershell -ExecutionPolicy Bypass -File server\load-test.ps1 -Users 65
```
Simulates 65 students for 3 minutes (AI generation + code execution + chat).
PASS = at least 90% of requests succeed and average latency is within budget.
While it runs, watch `docker logs -f vllm` - the line "Running: X reqs, Waiting:
Y" shows the queue. Some waiting is fine (vLLM queues instead of failing);
what matters is the PASS/FAIL verdict at the end.

Optional: test through the real internet instead of localhost:
`-Target https://your-vercel-url`

## Step 9 - Accuracy check, backups, demo accounts

Run these once before demo week (details in the root `RUNBOOK.md`):

```powershell
# 1. AI structural accuracy (want >= 80%)
powershell -ExecutionPolicy Bypass -File server\golden-set.ps1

# 2. Database backup + verify it restores (one-time drill, then weekly)
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1 -Restore -File server\backups\<latest>.sql

# 3. Ready-to-demo student accounts (printed password works for all 3)
powershell -ExecutionPolicy Bypass -File server\create-demo-accounts.ps1
```

## Daily ops

| Task | Command |
|---|---|
| All containers | `docker ps` |
| GPU/VRAM | `nvidia-smi` |
| vLLM logs | `docker logs -f vllm` |
| Judge0 logs | `cd server\judge0; docker compose logs -f` |
| Supabase logs | `cd server\supabase\docker; docker compose logs -f` |
| Print tunnel URLs | `powershell -File server\tunnel\get-tunnel-urls.ps1` |
| Load test (65 users) | `powershell -File server\load-test.ps1 -Users 65` |
| Health check | `curl https://<vercel-url>/api/health` |
| DB backup | `powershell -File server\backup-db.ps1` |
| Restart AI | `docker restart vllm` |
| Start everything (first time / manual) | `powershell -File server\start-all.ps1` |
| **DAILY START (9 AM — does everything incl. Vercel update)** | `powershell -File server\daily-start.ps1` |
| Stop everything | `powershell -File server\stop-all.ps1` |

Reboots: containers use restart policies, so with Docker Desktop set to start on
login, everything comes back after a power cut. Quick-tunnel URLs are the one
exception - re-run get-tunnel-urls.ps1 and update Vercel if they changed.
