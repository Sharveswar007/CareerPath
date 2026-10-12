# CareerPath — SERVER DEV README (Campus Mode, Layman Edition)

**One machine = the whole platform.** The web app, the database, the AI, and
the code runner all live on this college server. Students open one URL and
everything works — inside the campus network. No Vercel, no Cloudflare, no
monthly costs, no URLs that change every morning.

Read top to bottom. Don't skip the ⚠️ steps.

---

## PART 0 — What this server will run

| Piece | What it is | Where it lives | Port |
|---|---|---|---|
| **Web app** | the site students open (Next.js) | Node.js, run by `npm start` | 3000 |
| **Database + login** | accounts, scores, chat history (Supabase) | Docker containers | 8000 |
| **AI** | chat/quiz/exam/resume answers (vLLM + CodeLlama-13B) | Docker container, GPU | 8001 |
| **Code runner** | executes student code (Judge0) | Docker containers | 2358 |

One-time cost: **₹0/month forever** (all software free + your hardware).

---

## PART 1 — One-time setup (admin session, ~1 hour)

### Step 1 — Install 3 things (once)

1. **NVIDIA driver** — nvidia.com/drivers → install → restart.
   Verify: open PowerShell → `nvidia-smi` → you see the GPU. **If this fails, STOP.**
2. **Docker Desktop** — docker.com → install → start it → wait for "running".
3. **Node.js LTS** — nodejs.org → install the LTS version (needed to run the web app).

⚠️ Set Windows power plan to **Never sleep** (Settings → System → Power).
The server must stay awake while students use it.

### Step 2 — Get the code

```powershell
cd C:\
git clone https://github.com/Sharveswar007/CareerPath.git
cd CareerPath
```

### Step 3 — Give the server a FIXED address (⚠️ do not skip)

1. On the server run `ipconfig` → note the **IPv4 Address** (e.g. `192.168.1.50`).
2. Ask college IT (or the router admin page) to **reserve that IP** for this
   server (DHCP reservation / static IP).
   > Why: this IP is baked into the app at build time. If the IP changes,
   > students get a broken site until you rebuild.

### Step 4 — Configure the environment (3 values to fill)

```powershell
Copy-Item .env.campus .env.local
notepad .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` → `http://<YOUR-LAN-IP>:8000` (replace the sample IP)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → from `server\supabase\docker\.env`, line `ANON_KEY=`
- `SUPABASE_SERVICE_ROLE_KEY` → same file, line `SERVICE_ROLE_KEY=`

Then set Supabase's own URLs to the same server (login redirects rely on it):

```powershell
notepad server\supabase\docker\.env
```

In that file, set:
- `SITE_URL=http://<YOUR-LAN-IP>:3000` (replace the sample IP in there)
- also fix the `API_EXTERNAL_URL` value, if present, to `http://<YOUR-LAN-IP>:8000`

> Why: this tells Supabase's login system which address the app lives on.
> A stale value here causes "redirect fall-through" or email-link login
> issues. Password login always works regardless.

Everything else in `.env.local` is already correct. Save and close.

> 💡 Shortcut: there is now a script that fills every IP for you —
> see **PART 1.5** right below before editing anything by hand.

### Step 5 — Open the firewall for students (⚠️ do not skip)

Open **Windows Defender Firewall** → Inbound Rules → New Rule (do it twice):
- Rule 1: Port → TCP → **3000** → Allow → (all profiles) → name "CareerPath Web"
- Rule 2: Port → TCP → **8000** → Allow → (all profiles) → name "CareerPath DB"

> Students' browsers connect to the web app (3000) AND directly to the
> database gateway (8000). The AI and code runner stay private on localhost.

---

## PART 1.5 — One wizard instead of manual edits (easiest way)

Run this instead of touching any .env files by hand — it asks for the LAN
IP (auto-detects it) and fills `.env.local` AND Supabase's own config:

```powershell
powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1
```

It also prints the two firewall commands — run them in an **Administrator**
PowerShell:

```powershell
netsh advfirewall firewall add rule name="CareerPath Web" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="CareerPath DB" dir=in action=allow protocol=TCP localport=8000
```

(Manual way — PART 1 Step 4 — still works if you prefer clicking.)

---

## PART 2 — First start (~30–40 min, mostly one-time downloads)

```powershell
cd C:\CareerPath
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
```

The script:
1. checks Docker,
2. starts Judge0 + Supabase + vLLM in containers (first run downloads the
   13B AI model **once**, ~8 GB — after that it's cached),
3. waits for the AI to load,
4. installs npm deps and builds the web app (first time ~3–5 min),
5. starts the app and prints the exact URL for students.

⚠️ **Run the SQL setup once** (creates all tables, security rules, 3 sample
challenges). While containers are running, paste this into PowerShell:

```powershell
Get-Content supabase\schema.sql -Raw | docker exec -i supabase-db psql -U postgres -f /dev/stdin
```

Successful output ends with `INSERT 0 3`. (If it errors, re-run it once —
it's safe to repeat. If it still fails, send the first error line to your
dev, it's a one-line diagnosis.)

**Prove it all works (defaults to localhost — campus-perfect):**

```powershell
powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1
```

Want 6/6 PASS: vLLM up, vLLM generating on GPU, Judge0 up, Judge0 running
real code, Supabase API answering.

> ℹ️ **`/api/health` says "degraded" with `ai: fetch failed` right after
> start?** That is vLLM still loading the model into the GPU — it turns to
> "model ready" on its own after a few minutes, and this health check only
> treats Supabase + AI as critical. Judge0 shows its own status.

✅ **First-time setup complete.** Everything after this is daily routine.

---

## PART 3 — Daily routine (the whole job)

### 🌅 Every morning (one command)

```powershell
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1
```

~5 min. When it prints **READY** and gives you the URL — open the site on
your own phone (campus WiFi) once: login, chat, run one challenge.

### 🌆 Every evening (one command)

```powershell
powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1
```

Stops everything, frees RAM/GPU. **Nothing is ever deleted** — all student
data stays on disk and comes back next morning.

### 📅 Weekly (Friday, 5 min — your data's safety net)

```powershell
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
```

Makes a full database backup to `server\backups\`. Keep the last 4+ files
(or copy them elsewhere). Restoring: see RUNBOOK §6.

---

## PART 4 — Self-service account deletion (privacy, already safe)

- Students can delete **their own** account on the `/privacy` page; it
  requires their password and can only delete *their own* data. Done for
  compliance — nothing else in the app deletes anything by itself.
- Teachers deleting a test is manual (with a confirm dialog) and by design.

---

## PART 5 — When something breaks (first 60 seconds)

| Symptom | Do this |
|---|---|
| daily-start-campus says Docker not running | Start Docker Desktop, re-run |
| READY but health shows "degraded" | Look at the printed dependency lines; the failing one names the service: check with `docker logs <container>` |
| students can't open the site at all | On a student laptop: `ping <SERVER-IP>` (firewall 3000 off?), on the server `netstat -ano | findstr :3000` (app stopped?) |
| login works, chat doesn't | AI not loaded — `docker logs vllm`; also check `.env.local` has `AI_BASE_URL=http://localhost:8001` |
| everything down at 9 AM | Re-run `daily-start-campus.ps1` (safe to repeat) |
| URL worked yesterday, broken today | someone changed a `.env.local` value or the server's IP changed — recheck Step 3/4 of PART 1, rebuild with `-Build` |

Full diagnosis: `RUNBOOK.md`.

---

## PART 6 — Optional: off-campus access later

Campus mode works only inside the college network. When you ever need
off-campus access, the cleanest upgrade is a Cloudflare **named tunnel** +
₹500/yr domain (walkthrough: SERVER_DEPLOYMENT_GUIDE.md PART 6). Not needed
for an in-campus demo.

---

## Snapshots & updates (keep the code fresh)

```powershell
# update the code anytime (students get the update after one command):
git pull
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
```

### One-page quick card (print this)

```powershell
# ONCE
git clone https://github.com/Sharveswar007/CareerPath.git ; cd CareerPath
Copy-Item .env.campus .env.local ; notepad .env.local   # fill 3 values
# 2 firewall rules: TCP 3000 + TCP 8000
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
Get-Content supabase\schema.sql -Raw | docker exec -i supabase-db psql -U postgres -f /dev/stdin

# EVERY MORNING 9 AM
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1
# EVERY EVENING 6 PM
powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1
# EVERY FRIDAY
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
```
