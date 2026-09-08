# 🚀 Complete A-to-Z Deployment Guide: RTX 5090 Server + Vercel Domain

This guide walks you through every single step to run your entire stack:
- **RTX 5090 Server**: Runs **vLLM (8B Model)**, **Self-Hosted Supabase**, and **Judge0 Sandbox** in Docker.
- **Cloudflare Tunnel**: Free, secure bridge that gives your local server services HTTPS URLs without opening router ports.
- **Vercel**: Hosts the **CareerPath Next.js Frontend & API routes** with your custom domain.

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
│          YOUR LOCAL SERVER (RTX 5090, 64GB RAM)         │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │    vLLM (8B)     │  │  Supabase Stack  │             │
│  │   (RTX 5090 GPU) │  │  (Postgres, Auth)│             │
│  │   Port: 8001     │  │   Port: 8000     │             │
│  └──────────────────┘  └──────────────────┘             │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  Judge0 Sandbox  │  │ Cloudflare Tunnel│             │
│  │   Port: 2358     │  │  (HTTPS Ingress) │             │
│  └──────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Server Setup (RTX 5090 PC)

### Step 1: Install NVIDIA Driver & NVIDIA Container Toolkit
*Allows Docker containers to access your RTX 5090 (32GB VRAM).*

On Ubuntu / Debian:
```bash
# 1. Update and install basic tools
sudo apt update && sudo apt install -y curl git docker.io docker-compose-v2

# 2. Add NVIDIA Container Toolkit repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# 3. Install toolkit and restart Docker
sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 4. Verify Docker sees your RTX 5090
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```

---

### Step 2: Deploy vLLM with the 8B AI Model (Port 8001)

Create a directory on your server:
```bash
mkdir -p ~/ai-server && cd ~/ai-server
```

Run the vLLM Docker container:
```bash
docker run -d --name vllm-8b \
  --restart unless-stopped \
  --gpus all \
  --ipc=host \
  -p 8001:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -e HUGGING_FACE_HUB_TOKEN="your_huggingface_token_here" \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90 \
  --kv-cache-dtype auto
```

**Verify vLLM is healthy:**
```bash
curl http://localhost:8001/v1/models
```
*(Should return a JSON listing `meta-llama/Llama-3.1-8B-Instruct`).*

---

### Step 3: Deploy Self-Hosted Supabase (Port 8000)

```bash
cd ~
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

1. Generate strong passwords in `.env`:
   - Set `POSTGRES_PASSWORD`
   - Set `JWT_SECRET` (minimum 32 characters)
   - Generate your `ANON_KEY` and `SERVICE_ROLE_KEY` using the JWT secret (via [jwt.io](https://jwt.io)).

2. Start Supabase:
```bash
docker compose up -d
```

3. Apply CareerPath Database Schema:
   - Open browser on server: `http://localhost:8000` (Supabase Studio).
   - Go to **SQL Editor**.
   - Copy and paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.

---

### Step 4: Deploy Judge0 Sandbox (Port 2358)

```bash
mkdir -p ~/judge0 && cd ~/judge0

# Download official configs
curl -sL https://github.com/judge0/judge0/releases/download/v1.13.1/docker-compose.yml -o docker-compose.yml
curl -sL https://github.com/judge0/judge0/releases/download/v1.13.1/judge0.conf -o judge0.conf

# Start Judge0
docker compose up -d db redis
sleep 10
docker compose up -d
```

**Verify Judge0 is healthy:**
```bash
curl http://localhost:2358/system_info
```

---

## Part 2: Expose Server Services via Cloudflare Tunnel (Bridge to Vercel)

> ⚠️ **Why this is required**: Vercel runs in the cloud. It cannot connect to `http://localhost:8000` or `http://localhost:8001` on your home/office PC.
> A **Cloudflare Tunnel** securely gives your local services free public HTTPS domains without opening ports on your router or needing a static IP.

### Step 1: Install `cloudflared` on the Server
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### Step 2: Login & Create Tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create careerpath-server
```

### Step 3: Configure Routing
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /home/user/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: supabase.yourdomain.com
    service: http://localhost:8000
  - hostname: vllm.yourdomain.com
    service: http://localhost:8001
  - hostname: judge0.yourdomain.com
    service: http://localhost:2358
  - service: http_status:404
```

Route the DNS hostnames:
```bash
cloudflared tunnel route dns careerpath-server supabase.yourdomain.com
cloudflared tunnel route dns careerpath-server vllm.yourdomain.com
cloudflared tunnel route dns careerpath-server judge0.yourdomain.com
```

Start the tunnel as a system service:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
```

---

## Part 3: Deploy CareerPath on Vercel

### Step 1: Push Code to GitHub
On your development machine:
```bash
git add .
git commit -m "Configure production endpoints"
git push origin main
```

### Step 2: Import Project in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Connect your GitHub account and import `CareerPath`.
3. Framework Preset: **Next.js**.

### Step 3: Set Environment Variables in Vercel
In the Vercel project settings, add the following variables:

| Variable Name | Production Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.yourdomain.com` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Supabase anon key)* |
| `AI_BASE_URL` | `https://vllm.yourdomain.com/v1` |
| `AI_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` |
| `GROQ_API_KEY` | *(Dummy string or fallback key)* |
| `JUDGE0_URL` | `https://judge0.yourdomain.com` |
| `TAVILY_API_KEY` | *(Your Tavily key for trends)* |

### Step 4: Click Deploy
Vercel will build and assign your domain:
- **Default Vercel domain**: `https://career-path-neon.vercel.app`
- **Custom domain**: Go to **Settings > Domains** in Vercel to attach `careerpath.yourdomain.com`.

### Step 5: Update Supabase Redirect URL
In your Supabase Studio (`https://supabase.yourdomain.com`):
1. Navigate to **Authentication > URL Configuration**.
2. Set **Site URL** to: `https://your-domain.vercel.app`.
3. Add redirect URL: `https://your-domain.vercel.app/auth/callback`.

---

## Part 4: End-to-End Verification (Test Everything)

Once deployed, verify each feature from your Vercel URL:

1. **User Auth**: Sign up a test user $\rightarrow$ Checks connection to **Supabase Auth** on server.
2. **AI Counseling & Quiz**: Start an AI counseling chat session $\rightarrow$ Checks inference stream from **vLLM (RTX 5090)**.
3. **Coding Sandbox**: Open a challenge and click "Run Code" $\rightarrow$ Checks execution on **Judge0 Sandbox**.
4. **Monitoring**:
   - Run `nvidia-smi` on the server: You will see vLLM utilizing the GPU cores with sub-second token generation latency.
   - Run `docker stats` on the server: Monitor RAM usage across Judge0 and Supabase.

---

## 🎯 Summary Cheat Sheet

| Component | Runs On | Port | Public Access |
| :--- | :--- | :--- | :--- |
| **Next.js Frontend** | Vercel Cloud | 443 | `https://yourdomain.vercel.app` |
| **Supabase (DB & Auth)** | RTX 5090 Server | 8000 | `https://supabase.yourdomain.com` |
| **vLLM 8B Model** | RTX 5090 Server | 8001 | `https://vllm.yourdomain.com` |
| **Judge0 Code Engine** | RTX 5090 Server | 2358 | `https://judge0.yourdomain.com` |
