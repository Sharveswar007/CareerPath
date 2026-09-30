# CareerPath — Complete Server Deployment Guide (Layman Edition)

Every step from zero to students-using-it, plus the **daily 9-to-6 routine**,
a full **"is anything paid?" audit**, and what to do when something breaks.
Follow top to bottom. Don't skip steps marked ⚠️.

---

## PART 1 — First-time setup (one afternoon, ~1–2 hours)

### Step 0 — What you need before starting

| Thing | Where you get it | Cost |
|---|---|---|
| The server PC (RTX 5090, 32GB VRAM) | already yours | ₹0 |
| A USB stick / LAN transfer (~15 GB: repo + model weights move later) | — | ₹0 |
| Admin access to the server PC | the owner | — |
| Vercel account (you have it) | vercel.com | Free |
| GitHub repo (you have it) | github.com | Free |
| Monitor + keyboard for first login | — | — |

### Step 1 — Install the two big things on the server (~30 min)

1. **NVIDIA driver** (lets the GPU be used):
   - Download "GeForce/RTX driver" from nvidia.com/drivers for the 5090 (Windows).
   - Install → restart PC.
   - Verify: open PowerShell, type `nvidia-smi` → you should see the GPU + "32GB" (or similar). **If this fails, STOP — nothing else will work.**
2. **Docker Desktop for Windows**:
   - docker.com → Download for Windows → install (accept WSL2 prompt).
   - Start it, wait for the whale icon → "running".
   - Accept the service agreement dialog on first run.

> Keep the PC plugged into power, Windows power plan = "Never sleep" while
> serving (Settings → System → Power → Screen and sleep → Never).

### Step 2 — Copy the project to the server (~10 min)

Pick ONE way:
- **Easiest:** on the server, install Git (git-scm.com), open PowerShell:
  ```powershell
  cd C:\
  git clone https://github.com/Sharveswar007/CareerPath.git
  ```
- Or: copy the whole project folder from your laptop via USB/LAN.

Everything the server needs lives in the **`server/`** folder.

### Step 3 — Start everything the first time (~20–40 min, mostly model download)

```powershell
cd C:\CareerPath
powershell -ExecutionPolicy Bypass -File server\start-all.ps1
```

This starts, in order: Judge0 (code runner), vLLM (AI — downloads the 13B
model ~8 GB **once**, then caches it), Supabase (database + login), and the
Cloudflare tunnels (public URLs).

⚠️ **First start is slow (model download). Later daily starts are 3–5 min.**

When it finishes, it prints "Done. Next steps".

### Step 4 — Create the database tables (~5 min)

1. In the server browser open: **http://localhost:8000** (Supabase Studio).
   - Login: see `server/supabase/docker/.env` → `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
2. Left menu → **SQL Editor** → **New query**.
3. Open `C:\CareerPath\supabase\schema.sql` in Notepad, **Select All → Copy** → paste into the SQL editor → **Run**.
   - Safe to re-run any time (it's idempotent). It creates all tables, login
     security (RLS), the avatars storage bucket, and 3 demo coding challenges.

### Step 5 — Get the public URLs and point Vercel at them (~5 min)

```powershell
powershell -ExecutionPolicy Bypass -File server\tunnel\get-tunnel-urls.ps1
```

You'll get 3 URLs like `https://random-words.trycloudflare.com`. Note them.

Then in **vercel.com** → your project → **Settings → Environment Variables**,
set (copy values exactly from `server/README.md` Step 6 — tokens included):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<supabase-tunnel-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from server/supabase/docker/.env, line ANON_KEY>
AI_BASE_URL=https://<vllm-tunnel-url>/v1
AI_API_KEY=cp-vllm-4f9d2a81c67b45e3a2d80f19c3e75b64
AI_MODEL=careerpath-ai
GROQ_API_KEY=dummy_not_used
JUDGE0_URL=https://<judge0-tunnel-url>
JUDGE0_AUTH_TOKEN=7e37040d8cc7bc9cba642dd84667aeac3b6248456b95e0f5
SUPABASE_SERVICE_ROLE_KEY=<from .env, line SERVICE_ROLE_KEY>
```

Then **Deployments → ⋯ → Redeploy**.

Also in Supabase Studio → Authentication → URL Configuration:
Site URL = your Vercel URL, Redirect URLs += `<your-vercel-url>/auth/callback`.

### Step 6 — Prove it all works (~10 min)

```powershell
# on the server:
powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1      # want 6/6 PASS
powershell -ExecutionPolicy Bypass -File server\golden-set.ps1      # want >= 80%
powershell -ExecutionPolicy Bypass -File server\load-test.ps1 -Users 65   # the big one
```

Then in any browser (your phone, on mobile data — proves the public path):
1. Open your Vercel URL → should load.
2. Sign up a test account → should log in.
3. Chat: send a message → words should stream out.
4. Challenges: run any code → green result.
5. Profile → upload a photo as avatar → appears.
6. `/privacy` → (don't delete your real account; you already tested this).

### Step 7 — Create demo accounts (~2 min)

```powershell
powershell -ExecutionPolicy Bypass -File server\create-demo-accounts.ps1
```
Prints 3 emails + one shared password. Log in once with one of them.

**✅ First-time setup complete. Everything after this is daily routine.**

---

## PART 2 — The daily 9-to-6 routine (your "simple easy way")

### 🌅 Every morning (one command)

```powershell
powershell -ExecutionPolicy Bypass -File server\daily-start.ps1
```

It does everything and checks itself: Docker → all services → waits for the
AI to load → prints today's URLs → **updates Vercel automatically** (asks for
your project name once; if you don't have the Vercel CLI it prints the exact
manual steps, takes 2 min) → gives you a READY / NOT-READY verdict.

First run of the day: ~5 min (model reloads into GPU). If it says READY and
`/api/health` says healthy — students can log in.

### 🌆 Every evening (one command)

```powershell
powershell -ExecutionPolicy Bypass -File server\stop-all.ps1
```
Stops everything, frees RAM/GPU, data stays safe on disk.

### 📅 Weekly (Friday, 10 min)

```powershell
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1        # backup
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1 -Restore -File server\backups\<latest>.sql   # verify once
docker system df          # if disk gets full: docker system prune -f
```

Full ops manual (fallbacks, diagnosis, demo-day checklist): **`RUNBOOK.md`**.

---

## PART 3 — "Is everything free?" — full audit

**Short answer: yes, the whole system runs on ₹0/month as configured.** Details:

| Service | Used for | Free? | Notes |
|---|---|---|---|
| **Your server PC** | AI (vLLM), database (Supabase), code execution (Judge0), tunnels | ✅ your hardware | Electricity only |
| **vLLM + CodeLlama-13B** | all AI features (chat, quiz, exams, assessment, resume analysis) | ✅ fully | Open weights, runs locally, no API cost, no rate limits. Model downloaded once |
| **Cloudflare quick tunnels** | public URLs for the 3 services | ✅ fully | No account needed. Caveat: URLs change every restart (daily-start handles it) |
| **Supabase (self-hosted)** | database, auth, storage | ✅ fully | Open source, runs in YOUR Docker |
| **Judge0 (self-hosted)** | code execution | ✅ fully | Runs in YOUR Docker |
| **Vercel (Hobby plan)** | hosts the website/app | ✅ free tier | Limits: 100 GB bandwidth/mo, serverless execution seconds. A college demo is far below this. Only real limit: **non-commercial use** — fine for a college project |
| **GitHub** | code + CI | ✅ free tier | Public repo = free Actions minutes |
| **Groq cloud** | automatic AI fallback if your server is down | ✅ free tier | Only used if `AI_BASE_URL` is removed; generous free limits, you're a backup user |
| **Tavily** | real-time exam/trends news | ⚠️ free 1,000 credits/mo | App **auto-falls back to AI-generated content** when credits run out — nothing breaks |
| **OCR.space** | scanned-PDF resume text extraction | ⚠️ free ~25k/mo | Only for scanned PDFs; typed PDFs skip it. App errors gracefully without a key |
| **RapidAPI Judge0** | old cloud code-execution (legacy) | — | **Not used on the server path** (self-hosted Judge0 is). Key was leaked once — **rotate it on rapidapi.com anyway** |
| **UptimeRobot (optional)** | outage emails | ✅ free tier | 50 monitors free |

⚠️ The ONLY ways you could ever pay:
1. **Vercel Pro** — only if you exceed free bandwidth (a college demo won't).
2. Someone ramps `TAVILY_API_KEY` usage — impossible to exceed silently; free tier just stops, app falls back.
3. Domain for named tunnel (~₹500/**year**, optional but recommended for stable URLs).

**Conclusion: you can run this 9–6 every day, all year, for ₹0** (+ optional ₹500/yr domain).

---

## PART 4 — Things that WILL require attention (honest list)

| Thing | Reality | Handling |
|---|---|---|
| **Tunnel URLs change every morning** | Quick tunnels are random per start | `daily-start.ps1` auto-updates Vercel (~1 min). For permanent URLs: named tunnel + ₹500/yr domain |
| **6+ hrs/day uptime on your PC** | Heat, dust, Windows updates | RUNBOOK §4: pause Windows Update, "Never sleep", UPS if possible |
| **65 concurrent users** | Unproven until you run it on the real GPU | `load-test.ps1 -Users 65` in Step 6 — if it fails, raise `--max-num-seqs` (RUNBOOK §5) |
| **College network may block trycloudflare** | Some networks filter it | Test on day 1; fallback = phone hotspot (RUNBOOK §4) |
| **First AI request of the day is slow (~30–60 s)** | Model warms up | Do one test chat in the morning checklist — students never see it |
| **Disk fills slowly** (Docker logs/images) | Weeks of uptime | Weekly `docker system df` + `prune` (PART 2) |

---

## PART 5 — When something breaks (fast map)

| Symptom | First thing to do |
|---|---|
| daily-start says Docker not running | Start Docker Desktop, re-run script |
| A service fails to start | `docker ps -a` → find the restarted/exited one → `docker logs <name>` |
| App loads but AI errors | RUNBOOK §0: clear `AI_BASE_URL` in Vercel → Redeploy → instant Groq fallback; fix GPU after |
| Everything down at 9 AM | Re-run `daily-start.ps1` (idempotent) |
| Something else | Open **`RUNBOOK.md`** — it has the full diagnosis map |

---

## PART 6 — Named tunnel: URLs that NEVER change (recommended once demo works)

Quick tunnels give new random URLs every morning (handled automatically by
daily-start). The permanent upgrade is a **named tunnel** on your own domain —
URLs never change again and daily-start stops needing the Vercel step.

One-time, ~30 min, ~₹500/yr:

1. Buy a domain (any registrar). In Cloudflare (free account): **Add site** →
   it shows 2 nameservers → paste those 2 into your registrar's DNS settings.
2. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create tunnel**
   → type "Cloudflared" → name it `careerpath`.
3. In the tunnel's **Public Hostname** tab, add 3 routes:
   ```
   vllm.yourdomain.com     ->  http://localhost:8001
   supabase.yourdomain.com ->  http://localhost:8000
   judge0.yourdomain.com   ->  http://localhost:2358
   ```
4. Copy the tunnel **token** (starts with `eyJ`). On the server:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server\tunnel\start-named-tunnel.ps1 -Token "eyJ..."
   ```
5. In Vercel set the 3 env vars to the new URLs **once** (never again):
   `AI_BASE_URL=https://vllm.yourdomain.com/v1`,
   `NEXT_PUBLIC_SUPABASE_URL=https://supabase.yourdomain.com`,
   `JUDGE0_URL=https://judge0.yourdomain.com` → Redeploy.
6. From now on, mornings are even simpler:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server\daily-start.ps1 -SkipVercel
   ```
   (No Vercel step — nothing changes.) The task also survives networks that
   block trycloudflare, since traffic flows through your own domain.

## PART 7 — Fully automatic 9 AM start (optional, 5 min)

`daily-start.ps1` is one command — but you can remove even that:

```powershell
# registers a Windows Scheduled Task (run once, on the server)
powershell -ExecutionPolicy Bypass -File server\register-autostart.ps1          # 09:00 daily
powershell -ExecutionPolicy Bypass -File server\register-autostart.ps1 -Time 08:45   # custom time
```

For it to actually fire hands-off, do these three things once:
1. **Auto-login**: `netplwiz` → uncheck "Users must enter a user name and password".
2. **Never sleep** when plugged in (Settings → Power).
3. Leave it plugged in; the task logs to `server\logs\daily-start-YYYYMMDD.log`
   so you can verify from anywhere each morning.

Undo anytime: `...register-autostart.ps1 -Remove`.
Honest limits: it cannot power on a shut-down PC (enable Wake-on-LAN in BIOS
if you want that), and Windows updates can reboot it — pause them (RUNBOOK §4).

## PART 8 — UptimeRobot: know about outages before students do (5 min)

1. uptimerobot.com → free account → **Add New Monitor**.
2. Type: HTTP(s) · Name: `CareerPath health` · URL: `https://<your-vercel-url>/api/health`
   · Interval: 5 minutes.
3. Add a second monitor for the Supabase URL (`.../rest/v1/` — it should
   answer 401, which counts as "up" if you pick the keyword monitor type with
   keyword `code`).
4. Alerting: Settings → Alerts → connect email (or Telegram/Discord).

Now if the tunnel, GPU server, or app dies at 10 AM, you get pinged before
the first student notices. This pairs with `/api/health`, which already
checks Supabase + AI + Judge0 with timeouts.

## Quick reference card (print this)

```powershell
# FIRST TIME (once)
git clone https://github.com/Sharveswar007/CareerPath.git ; cd CareerPath
powershell -ExecutionPolicy Bypass -File server\start-all.ps1
# Studio localhost:8000 -> SQL -> paste supabase/schema.sql -> Run
# get-tunnel-urls.ps1 -> Vercel env -> Redeploy  (server/README.md Step 6)
server\smoke-test.ps1 ; server\golden-set.ps1 ; server\load-test.ps1 -Users 65
server\create-demo-accounts.ps1

# EVERY MORNING 9 AM
powershell -ExecutionPolicy Bypass -File server\daily-start.ps1

# EVERY EVENING 6 PM
powershell -ExecutionPolicy Bypass -File server\stop-all.ps1

# WEEKLY FRIDAY
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
```
