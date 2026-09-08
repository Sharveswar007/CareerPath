# 🚀 Complete A-to-Z Deployment Guide: Windows RTX 5090 Server + Vercel Domain

This guide is tailored specifically for **Windows 10 / 11** using **PowerShell**, **Docker Desktop (WSL2)**, and your **RTX 5090 (32GB VRAM)**.

---

## 🗺️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL CLOUD                       │
│  Domain: https://your-careerpath.vercel.app             │
│  (Next.js App + SSR + API Routes)                       │
└───────────────┬─────────────────┬───────────────────────┘
                │                 │
                │ HTTPS (via Cloudflare Tunnel)
                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│       YOUR WINDOWS SERVER (RTX 5090, 64GB RAM)          │
│       OS: Windows 11 / 10 + Docker Desktop (WSL2)       │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │    vLLM (8B)     │  │  Supabase Stack  │             │
│  │  (RTX 5090 CUDA) │  │  (Postgres, Auth)│             │
│  │   Port: 8001     │  │   Port: 8000     │             │
│  └──────────────────┘  └──────────────────┘             │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  Judge0 Sandbox  │  │ Cloudflare Tunnel│             │
│  │   Port: 2358     │  │   (Docker/Exe)   │             │
│  └──────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Windows & GPU Prerequisites

On Windows, NVIDIA drivers automatically provide **Direct CUDA Passthrough** into Docker Desktop via WSL2. You **do not** need complex Linux toolkit installations!

1. **Install Latest NVIDIA Driver**:
   - Make sure GeForce Game Ready or Studio Driver is installed from NVIDIA GeForce Experience / NVIDIA App.
2. **Ensure Docker Desktop is running**:
   - Open Docker Desktop $\rightarrow$ **Settings (gear icon)** $\rightarrow$ **General** $\rightarrow$ Ensure **"Use the WSL 2 based engine"** is checked.
3. **Verify GPU in PowerShell**:
   Open Windows PowerShell and run:
   ```powershell
   docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
   ```
   *(You should see your **NVIDIA GeForce RTX 5090** and **32GB VRAM** listed inside Docker).*

---

## Part 2: Running Services on Windows (PowerShell)

### Step 1: Run vLLM with the 8B AI Model (Port 8001)

Run in Windows PowerShell:

```powershell
# 1. Create a folder for AI models
New-Item -ItemType Directory -Force -Path "C:\ai-server"
cd C:\ai-server

# 2. Launch vLLM container with GPU access
docker run -d --name vllm-8b `
  --restart unless-stopped `
  --gpus all `
  --ipc=host `
  -p 8001:8000 `
  -v "C:\ai-server\cache:/root/.cache/huggingface" `
  -e HUGGING_FACE_HUB_TOKEN="your_huggingface_token_here" `
  vllm/vllm-openai:latest `
  --model meta-llama/Llama-3.1-8B-Instruct `
  --max-model-len 4096 `
  --gpu-memory-utilization 0.90
```

**Verify vLLM in PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/v1/models"
```
*(Should return your `Llama-3.1-8B-Instruct` model name).*

---

### Step 2: Run Self-Hosted Supabase on Windows (Port 8000)

Run in Windows PowerShell:

```powershell
cd C:\
git clone --depth 1 https://github.com/supabase/supabase
cd C:\supabase\docker
Copy-Item .env.example .env
```

1. Open `C:\supabase\docker\.env` in VS Code or Notepad:
   - Change `POSTGRES_PASSWORD` to a secure password.
   - Set `JWT_SECRET` (minimum 32 characters).
   - Generate your `ANON_KEY` and `SERVICE_ROLE_KEY` (or use the pre-filled development keys).
2. Start Supabase:
   ```powershell
   docker compose up -d
   ```
3. Open `http://localhost:8000` (Supabase Studio) in your browser:
   - Go to **SQL Editor**.
   - Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.

---

### Step 3: Run Judge0 Sandbox on Windows (Port 2358)

Because Windows WSL2 uses cgroups v2, Judge0 requires two config flags enabled:

```powershell
New-Item -ItemType Directory -Force -Path "C:\judge0"
cd C:\judge0

# Download official docker-compose and config
curl.exe -sL https://github.com/judge0/judge0/releases/download/v1.13.1/docker-compose.yml -o docker-compose.yml
curl.exe -sL https://github.com/judge0/judge0/releases/download/v1.13.1/judge0.conf -o judge0.conf
```

In `C:\judge0\judge0.conf`, ensure these two lines are set (required for Windows):
```ini
ENABLE_PER_PROCESS_AND_THREAD_TIME_LIMIT=true
ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=true
```

Start Judge0:
```powershell
docker compose up -d db redis
Start-Sleep -Seconds 10
docker compose up -d
```

**Verify Judge0 in PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:2358/system_info"
```

---

## Part 3: Expose Windows Endpoints via Cloudflare Tunnel

> 💡 **Why this is needed**: Vercel runs in the cloud and cannot reach `http://localhost:8000` on your Windows PC.
> A **Cloudflare Tunnel** securely connects your Windows PC to a free public HTTPS address without port forwarding.

### Option A: Using Docker (Easiest & Cleanest on Windows)

No Windows installers needed! You can run Cloudflare Tunnel directly as a lightweight container:

1. Create a free account at [cloudflare.com](https://dash.cloudflare.com/) and add your domain (or use a free subdomain).
2. Go to **Zero Trust > Networks > Tunnels > Create a Tunnel**.
3. Name it `careerpath-windows-server`.
4. Choose **Docker** as the connector. It will give you a 1-line command like:
   ```powershell
   docker run -d --name cloudflared --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token YOUR_CLOUDFLARE_TOKEN
   ```
5. In the Cloudflare dashboard, add **Public Hostnames**:
   - `supabase.yourdomain.com` $\rightarrow$ `http://host.docker.internal:8000`
   - `vllm.yourdomain.com` $\rightarrow$ `http://host.docker.internal:8001`
   - `judge0.yourdomain.com` $\rightarrow$ `http://host.docker.internal:2358`

*(Note: In Docker Desktop on Windows, `host.docker.internal` points to your Windows PC).*

---

### Option B: Using Windows `cloudflared.exe`

If you prefer a native Windows executable:
```powershell
# 1. Install via winget
winget install --id Cloudflare.cloudflared

# 2. Authenticate
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create careerpath-windows
```

Create `C:\Users\<YourUser>\.cloudflared\config.yml`:
```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: C:\Users\<YourUser>\.cloudflared\<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: supabase.yourdomain.com
    service: http://localhost:8000
  - hostname: vllm.yourdomain.com
    service: http://localhost:8001
  - hostname: judge0.yourdomain.com
    service: http://localhost:2358
  - service: http_status:404
```

Route DNS & start Windows Service:
```powershell
cloudflared tunnel route dns careerpath-windows supabase.yourdomain.com
cloudflared tunnel route dns careerpath-windows vllm.yourdomain.com
cloudflared tunnel route dns careerpath-windows judge0.yourdomain.com

cloudflared service install
Start-Service cloudflared
```

---

## Part 4: Connect with Vercel

1. **Import your GitHub repo** at [vercel.com/new](https://vercel.com/new).
2. Under **Settings > Environment Variables**, add your tunnel endpoints:

   | Environment Variable | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.yourdomain.com` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Supabase anon key)* |
   | `AI_BASE_URL` | `https://vllm.yourdomain.com/v1` |
   | `AI_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` |
   | `JUDGE0_URL` | `https://judge0.yourdomain.com` |
   | `GROQ_API_KEY` | *(Dummy key or backup Groq key)* |
   | `TAVILY_API_KEY` | *(Your Tavily key)* |

3. Click **Deploy**.
4. In your Supabase Studio (`https://supabase.yourdomain.com`), update **Authentication > URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Part 5: End-to-End Verification

Open your Vercel URL in your browser:
- **Sign Up / Login**: Verifies communication with **Supabase** running on your Windows PC.
- **AI Chat / Quiz**: Streams responses from **vLLM utilizing your RTX 5090 GPU**.
- **Code Execution**: Runs student code in the isolated **Judge0 container**.
- **GPU Activity**: Open **Task Manager > Performance > GPU 0 (NVIDIA GeForce RTX 5090)** $\rightarrow$ Watch the 32GB VRAM and GPU Compute spike during model responses!
