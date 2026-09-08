# 🚀 Complete Windows Server Deployment Guide: RTX 5090 + Vercel

This is the **definitive, step-by-step master guide** to setting up your entire infrastructure on a **Windows 10 / 11** machine equipped with an **NVIDIA GeForce RTX 5090 (32GB VRAM), 64GB RAM, and 2TB Storage**, and connecting it to your frontend domain hosted on **Vercel**.

Every command in this guide is designed for **Windows PowerShell**.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites on Windows](#2-prerequisites-on-windows)
3. [Folder Setup on Windows](#3-folder-setup-on-windows)
4. [Step 1: Deploy vLLM 8B AI Model (GPU Accelerated)](#step-1-deploy-vllm-8b-ai-model-gpu-accelerated)
5. [Step 2: Deploy Self-Hosted Supabase](#step-2-deploy-self-hosted-supabase)
6. [Step 3: Deploy Judge0 Code Sandbox](#step-3-deploy-judge0-code-sandbox)
7. [Step 4: Connect Windows Services to Vercel via Cloudflare Tunnel](#step-4-connect-windows-services-to-vercel-via-cloudflare-tunnel)
8. [Step 5: Deploy CareerPath on Vercel](#step-5-deploy-careerpath-on-vercel)
9. [Step 6: Verify the Complete System End-to-End](#step-6-verify-the-complete-system-end-to-end)
10. [Daily Management & PC Restart Cheat Sheet](#daily-management--pc-restart-cheat-sheet)

---

## 1. Architecture Overview

Your RTX 5090 Windows PC acts as the **high-performance backend server** running 3 Docker services, while **Vercel** delivers the Next.js web application to students globally:

```
┌──────────────────────────────────────────────────────────────────┐
│                          VERCEL CLOUD                            │
│  Domain: https://your-careerpath.vercel.app                      │
│  (Next.js App + SSR Pages + API Handlers)                        │
└────────────────┬────────────────┬─────────────────┬──────────────┘
                 │                │                 │
                 │ HTTPS (Secured via Cloudflare Tunnel)
                 ▼                ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│          YOUR WINDOWS SERVER (RTX 5090 32GB, 64GB RAM)           │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐  │
│  │   vLLM (8B AI Model)   │  │    Supabase Stack (Port 8000)  │  │
│  │  Port 8001 (RTX 5090)  │  │    PostgreSQL on Port 5432     │  │
│  │  OpenAI-compatible API │  │    Auth, Studio, REST API      │  │
│  └────────────────────────┘  └────────────────────────────────┘  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐  │
│  │   Judge0 Code Engine   │  │   Cloudflare Tunnel Container  │  │
│  │  Port 2358 (Isolated)  │  │   Zero-Config HTTPS Ingress    │  │
│  │  Executes Python/C++/JS│  │   No Router Port-Forwarding    │  │
│  └────────────────────────┘  └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites on Windows

### A. NVIDIA Drivers (Windows)
You **do not** need to install any Linux toolkits on Windows. NVIDIA drivers provide direct CUDA passthrough to Docker via WSL 2 out of the box.
- Make sure you have the latest NVIDIA drivers installed via **GeForce Experience** or [nvidia.com/drivers](https://www.nvidia.com/download/index.aspx).

### B. Docker Desktop (Windows)
1. Download & install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop $\rightarrow$ Click **Settings (gear icon)** at top right.
3. Under **General**, verify **"Use the WSL 2 based engine"** is checked.
4. Under **Resources > WSL Integration**, enable integration with your default WSL distro.

### C. Verify GPU in Windows PowerShell
Open **PowerShell** and run:
```powershell
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```
> **Expected output**: A table showing `NVIDIA GeForce RTX 5090`, Driver version, and `32768MiB` VRAM.

*(💡 If PowerShell says `docker: The term 'docker' is not recognized`, run:)*
```powershell
$env:PATH = "C:\Users\$($env:USERNAME)\AppData\Local\Programs\DockerDesktop\resources\bin;$env:PATH"
```

---

## 3. Folder Setup on Windows

Open **PowerShell as Administrator** and create a clean root directory for your server components:

```powershell
New-Item -ItemType Directory -Force -Path "C:\CareerPath-Server\vllm"
New-Item -ItemType Directory -Force -Path "C:\CareerPath-Server\supabase"
New-Item -ItemType Directory -Force -Path "C:\CareerPath-Server\judge0"
New-Item -ItemType Directory -Force -Path "C:\CareerPath-Server\hf-cache"
```

---

## Step 1: Deploy vLLM 8B AI Model (GPU Accelerated)

vLLM utilizes the RTX 5090's **32GB VRAM** and massive memory bandwidth to serve your 8B model with continuous batching (handling 25-40 concurrent active generations).

### 1. Choose Your Model:
- **Option A (Meta Llama 3.1 8B Instruct - Recommended)**:
  Requires an approved Hugging Face token from [huggingface.co/meta-llama/Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct).
- **Option B (Qwen 2.5 Coder 7B / 8B Instruct - Open Access, No Token Required)**:
  `Qwen/Qwen2.5-Coder-7B-Instruct` or `mistralai/Mistral-7B-Instruct-v0.3`.

### 2. Start vLLM in PowerShell:
Run the following in PowerShell (replace `your_hf_token_here` with your Hugging Face token if using Llama):

```powershell
docker run -d --name vllm-8b `
  --restart unless-stopped `
  --gpus all `
  --ipc=host `
  -p 8001:8000 `
  -v "C:\CareerPath-Server\hf-cache:/root/.cache/huggingface" `
  -e HUGGING_FACE_HUB_TOKEN="your_hf_token_here" `
  vllm/vllm-openai:latest `
  --model meta-llama/Llama-3.1-8B-Instruct `
  --max-model-len 4096 `
  --gpu-memory-utilization 0.88 `
  --kv-cache-dtype auto
```

### 3. Monitor First-Time Model Download:
```powershell
docker logs -f vllm-8b
```
*(On first run, vLLM will download the model weights (~16GB) to `C:\CareerPath-Server\hf-cache`. Once ready, you will see `Route: /v1/chat/completions, Methods: POST`).*

### 4. Test vLLM via PowerShell:
```powershell
$body = @{
    model = "meta-llama/Llama-3.1-8B-Instruct"
    messages = @(
        @{ role = "user"; content = "Give me 1 career tip for a software engineer." }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8001/v1/chat/completions" -Method Post -ContentType "application/json" -Body $body
```
> If this returns an AI response, **vLLM is running at full speed on your RTX 5090!**

---

## Step 2: Deploy Self-Hosted Supabase

Supabase runs PostgreSQL, GoTrue Authentication, Storage, and Supabase Studio on your PC.

### 1. Clone Supabase Docker Configuration:
```powershell
cd C:\CareerPath-Server
git clone --depth 1 https://github.com/supabase/supabase
Rename-Item -Path "C:\CareerPath-Server\supabase\docker" -NewName "supabase-docker"
cd C:\CareerPath-Server\supabase\supabase-docker
Copy-Item .env.example .env
```

### 2. Configure Passwords in `.env`:
Open `C:\CareerPath-Server\supabase\supabase-docker\.env` in VS Code or Notepad:
- Set `POSTGRES_PASSWORD=YourStrongDatabasePassword123!`
- Set `JWT_SECRET=YourSuperSecretKeyWithAtLeast32Chars123!`
- You can leave the default pre-filled `ANON_KEY` and `SERVICE_ROLE_KEY` for initial setup.

### 3. Start Supabase Containers:
```powershell
docker compose up -d
```
*(This starts PostgreSQL on port `5432`, Kong API Gateway on port `8000`, and Supabase Studio on port `8000`).*

### 4. Apply Database Tables & Schema:
1. Open your browser on Windows and navigate to: **[http://localhost:8000](http://localhost:8000)** (Supabase Studio).
2. Click **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Open [`supabase/schema.sql`](./supabase/schema.sql) from your CareerPath repo, copy all SQL lines, paste into the query window, and click **Run**.
5. All 9 tables (`profiles`, `coding_challenges`, `user_assessments`, etc.) are now created with RLS security policies!

---

## Step 3: Deploy Judge0 Code Sandbox

Judge0 compiles and executes student code (Python, C++, Java, JavaScript) inside secure sandboxed Docker containers.

### 1. Download Official Judge0 Files:
```powershell
cd C:\CareerPath-Server\judge0

curl.exe -sL https://github.com/judge0/judge0/releases/download/v1.13.1/docker-compose.yml -o docker-compose.yml
curl.exe -sL https://github.com/judge0/judge0/releases/download/v1.13.1/judge0.conf -o judge0.conf
```

### 2. Configure `judge0.conf` for Windows WSL2:
Open `C:\CareerPath-Server\judge0\judge0.conf` in Notepad.
Find and verify these two parameters are set to `true` (required to run under Windows WSL2 cgroups v2):
```ini
ENABLE_PER_PROCESS_AND_THREAD_TIME_LIMIT=true
ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=true
```
*(Also set a custom `REDIS_PASSWORD` and `POSTGRES_PASSWORD` in `judge0.conf` and `docker-compose.yml`).*

### 3. Start Judge0:
```powershell
docker compose up -d db redis
Start-Sleep -Seconds 10
docker compose up -d
```

### 4. Verify Judge0 in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:2358/system_info"
```
> Returns system version: `1.13.1`. Judge0 is live!

---

## Step 4: Connect Windows Services to Vercel via Cloudflare Tunnel

> 💡 **Why this is necessary**: Vercel's servers live in AWS cloud data centers. They cannot call `http://localhost:8000` on your Windows PC.
> A **Cloudflare Tunnel** connects your local Windows ports to the internet with **free HTTPS domains**, without modifying your home Wi-Fi router or exposing your home IP!

### 1. Setup Cloudflare Tunnel:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) (Sign up for a free account if you haven't).
2. Go to **Zero Trust** $\rightarrow$ **Networks** $\rightarrow$ **Tunnels**.
3. Click **Create a Tunnel**. Name it `careerpath-windows`.
4. Under "Choose your environment", select **Docker**.
5. Cloudflare will give you a single command with a token. Run that command in Windows PowerShell:
   ```powershell
   docker run -d --name cloudflared --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token YOUR_CLOUDFLARE_TOKEN
   ```

### 2. Add the 3 Public Hostnames in the Cloudflare Dashboard:
In the Tunnel settings under **Public Hostnames**, add these 3 routes:

| Public Hostname | Service Type | URL on Windows |
| :--- | :--- | :--- |
| `supabase.yourdomain.com` | `HTTP` | `host.docker.internal:8000` |
| `vllm.yourdomain.com` | `HTTP` | `host.docker.internal:8001` |
| `judge0.yourdomain.com` | `HTTP` | `host.docker.internal:2358` |

*(Note: `host.docker.internal` allows the cloudflared Docker container to reach your Windows ports).*

Now, test in your Windows browser:
- `https://supabase.yourdomain.com` $\rightarrow$ Opens your local Supabase Studio securely from the internet!
- `https://judge0.yourdomain.com/system_info` $\rightarrow$ Returns Judge0 status!
- `https://vllm.yourdomain.com/v1/models` $\rightarrow$ Returns your 8B model!

---

## Step 5: Deploy CareerPath on Vercel

### 1. Push Your Code to GitHub:
Make sure your latest code is pushed to your GitHub repository:
```powershell
cd d:\coding\CareerPath
git push origin main
```

### 2. Import into Vercel:
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select your repository `CareerPath`.
3. Framework Preset: **Next.js**.

### 3. Add Environment Variables in Vercel:
Under **Environment Variables**, paste the following keys using your new Cloudflare HTTPS domains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://supabase.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_from_env_file

AI_BASE_URL=https://vllm.yourdomain.com/v1
AI_MODEL=meta-llama/Llama-3.1-8B-Instruct
GROQ_API_KEY=dummy_build_key

JUDGE0_URL=https://judge0.yourdomain.com

TAVILY_API_KEY=your_tavily_key_if_used
```

### 4. Deploy:
Click **Deploy**. In ~1-2 minutes, Vercel will give you your live URL (e.g. `https://careerpath.vercel.app`).

### 5. Update Supabase Auth Redirects:
In Supabase Studio (`https://supabase.yourdomain.com`):
1. Go to **Authentication** $\rightarrow$ **URL Configuration**.
2. Set **Site URL**: `https://careerpath.vercel.app`
3. In **Redirect URLs**, add: `https://careerpath.vercel.app/auth/callback`

---

## Step 6: Verify the Complete System End-to-End

Open your Vercel URL in your browser:

1. **Test User Onboarding**:
   - Create a student account and sign in.
   - Verify user record appears in Supabase Studio $\rightarrow$ Table Editor $\rightarrow$ `profiles`.
2. **Test AI Counseling & Quiz Generation**:
   - Ask a question in Career Counseling Chat or generate an assessment.
   - **Open Windows Task Manager $\rightarrow$ Performance $\rightarrow$ GPU (RTX 5090)**:
     You will see GPU Compute spike to ~30-50% and VRAM stay at ~10GB while words stream into the browser with near-zero latency!
3. **Test Code Sandbox**:
   - Open a coding challenge and click **Run Code**.
   - Judge0 executes the code and returns the test case results.

---

## Daily Management & PC Restart Cheat Sheet

Because all containers use `--restart unless-stopped`, **when you restart your Windows PC, Docker Desktop will automatically restart all 4 services in the background!**

Here is your quick PowerShell cheat sheet for maintenance:

| Task | PowerShell Command |
| :--- | :--- |
| **Check all running services** | `docker ps` |
| **Check GPU usage & VRAM** | `nvidia-smi` |
| **Check vLLM AI generation logs** | `docker logs -f vllm-8b` |
| **Check Judge0 execution logs** | `cd C:\CareerPath-Server\judge0; docker compose logs -f` |
| **Check Supabase database logs** | `cd C:\CareerPath-Server\supabase\supabase-docker; docker compose logs -f` |
| **Restart vLLM** | `docker restart vllm-8b` |
| **Stop all services temporarily** | `docker stop vllm-8b cloudflared; cd C:\CareerPath-Server\judge0; docker compose down; cd C:\CareerPath-Server\supabase\supabase-docker; docker compose down` |
| **Start all services** | `docker start vllm-8b cloudflared; cd C:\CareerPath-Server\judge0; docker compose up -d; cd C:\CareerPath-Server\supabase\supabase-docker; docker compose up -d` |
