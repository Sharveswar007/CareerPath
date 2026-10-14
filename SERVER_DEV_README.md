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
| **Web app** | the site students open (Next.js) | Node.js, run by `npm start` | **3000 (the ONLY port exposed)** |
| **Database + login** | accounts, scores, chat history (Supabase) | Docker containers | 54321 - localhost only, reached through the app |
| **AI** | chat/quiz/exam/resume answers (vLLM + CodeLlama-13B) | Docker container, GPU | 8001 - localhost only |
| **Code runner** | executes student code (Judge0) | Docker containers | 2358 - localhost only |

> One open port: students' browsers only ever talk to the web app (3000).
> The database, AI and code runner are reached from localhost by the app
> itself. And the stack is **other-project-safe**: every container is named
> `careerpath-*`, the stop script never touches containers of other projects,
> and the Supabase gateway moved to 54321 so port 8000 stays free for
> whoever else is using it.

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

### Step 3 — Server IP (optional, not required)

The app no longer contains any server IP - the IP can change any time (college
WiFi/DHCP) and nothing breaks, no rebuild needed. Students use
`http://<whatever-the-IP-is>:3000` and the morning start prints the exact URL
for you. A DHCP reservation only makes the URL *stable-looking*, not
functional - ask IT politely, don't fight for it.

### Step 4 — Configure the environment (3 values to fill)

```powershell
Copy-Item server\env.campus.template .env.local
```

`.env.local` needs NOTHING typed by hand when you use the wizard (PART 1.5):

- `NEXT_PUBLIC_SUPABASE_URL` stays `/supa` (relative - no IP anywhere by design)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - the wizard
  copies them out of `server\supabase\docker\.env` for you
- gateway port is preset to 54321 (`SUPABASE_INTERNAL_URL=http://localhost:54321`)


> 🔐 **Private credentials**: after cloning, place the **`.env.campus.local`**
> file (private, gitignored — get it from the project owner's laptop/USB)
> at the repo root, and the wizard in PART 1.5 fills ALL secret values for
> you: the anon/service keys, the vLLM API key, and the Judge0 token. Without
> it the things below still work using the repo's public placeholder pair,
> but the private file is the proper way.

> 💡 Shortcut: there is now a script that fills every IP for you —
> see **PART 1.5** right below before editing anything by hand.

### Step 5 — Port conflict? (only if IT says a port is taken)

```powershell
netstat -ano | findstr "LISTENING" | findstr ":3000 :54321 :2358 :8001"
```

Empty = all free, skip this section. Otherwise:

| Port taken | Change | Then also |
|---|---|---|
| **3000** (website) | start with `daily-start-campus.ps1 -Port 4000` | firewall rule for 4000; **no rebuild** |
| **54321** (Supabase) | `server\supabase\docker\.env` → `API_GW_HTTP_PORT=<e.g. 5678>` | `SUPABASE_INTERNAL_URL` in `.env.local` - the wizard syncs it automatically; **rebuild if the bundle is stale** |
| **2358** (Judge0) | `server\judge0\docker-compose.yml` → `"2359:2358"` | `.env.local` → `JUDGE0_URL=http://localhost:2359`; no rebuild |
| **8001** (vLLM) | `start-vllm.ps1` → `-p 8111:8000` | `.env.local` → `AI_BASE_URL=http://localhost:8111`; no rebuild |

> The campus wizard reads the actual gateway port from the Supabase `.env`,
> so port changes done before running it propagate automatically. All of
> these except 3000 are localhost-only.

### Step 6 — Open the firewall for students (⚠️ do not skip)

ONE rule only (⛔ needs admin rights or college IT - see the admin list below):
- Port → TCP → **3000** (or your `-Port` value) → Allow → (all profiles) → name "CareerPath Web"

> Students' browsers connect ONLY to the web app (3000). Database, AI and
> code runner are never exposed. Without admin/IT approval students on the
> campus LAN cannot reach the server (localhost still works) - options: ask
> IT once, run the rule command once from an admin PowerShell, or demo from
> a phone hotspot.

### What needs admin rights (and what never does)

| Task | Admin needed? | Why / what to do |
|---|---|---|
| Copying files, running every server script, Docker containers, ports above 1024 | ❌ never | All runtime work is user-level |
| Opening the ONE inbound firewall port (TCP 3000) | ⛔ yes (or ask college IT) | Only way students reach the server over LAN |
| DHCP reservation / static IP | ⛔ only IT can, but OPTIONAL | IP changes are harmless now; a stable IP is just cosmetic |
| Windows "Never sleep" power plan | ❌ no (a user setting) | Settings → System → Power |
| Auto-start scheduled task (`register-autostart.ps1`) | ❌ usually not (per-user task) | Optional convenience |

Nothing in any server script attempts admin actions - if a script ever asks
for elevation unexpectedly, that is a bug: stop and check first.

---

## PART 1.5 — One wizard instead of manual edits (easiest way)

Run this instead of touching any .env files by hand — no IP needed (the
build is IP-independent now); it fills `.env.local`, all Supabase secrets
and the Judge0 token from the private credential file:

```powershell
powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1
```

It also prints the two firewall commands — run them in an **Administrator**
PowerShell:

```powershell
netsh advfirewall firewall add rule name="CareerPath Web" dir=in action=allow protocol=TCP localport=3000
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
Get-Content supabase\schema.sql -Raw | docker exec -i careerpath-db psql -U postgres -f /dev/stdin
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

Stops the app + all careerpath-* containers, frees RAM/GPU. Other projects on
the same server are never touched. Nothing is ever deleted — all student data stays on disk and comes back next morning.

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
| login works, chat doesn't | AI not loaded — `docker logs careerpath-vllm`; also check `.env.local` has `AI_BASE_URL=http://localhost:8001` |
| everything down at 9 AM | Re-run `daily-start-campus.ps1` (safe to repeat) |
| URL worked yesterday, broken today | someone changed a `.env.local` value — recheck PART 1 Step 4, rebuild with `-Build`. IP changes are harmless by design now |

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
Copy-Item X:\path\to\.env.campus.local .   # private creds file (from owner) - NEVER commit
powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1   # fills IPs + secrets
# 1 firewall rule: TCP 3000 (wizard prints the command; needs admin/IT)
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
Get-Content supabase\schema.sql -Raw | docker exec -i careerpath-db psql -U postgres -f /dev/stdin

# EVERY MORNING 9 AM
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1
# EVERY EVENING 6 PM
powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1
# EVERY FRIDAY
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
```
