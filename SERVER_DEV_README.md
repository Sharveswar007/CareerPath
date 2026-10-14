# CareerPath — SERVER DEV README (Campus Mode, Detailed Layman Edition)

**One machine = the whole platform.** The web app, the database, the AI and
the code runner all live on this college server. Students open ONE URL and
everything works inside the campus network. No Vercel, no Cloudflare, no
monthly costs, no URLs that change every morning.

Follow the parts in order. Every step says what you should SEE when it
worked. ⛔ marks the only step that needs admin rights. In ~2–3 hours
(1 hour of it is downloads) the first student can be logged in.

---

## PART 0 — What this server will run

| Piece | What it is | Where it lives | Port |
|---|---|---|---|
| **Web app** | the site students open (Next.js) | Node.js, run by `npm start` | **3000 — the ONLY port exposed** |
| **Database + login** | accounts, scores, chat history (Supabase) | Docker containers | 54321 — localhost only, reached through the app |
| **AI** | chat/quiz/exam/resume answers (vLLM + CodeLlama-13B) | Docker container, GPU | 8001 — localhost only |
| **Code runner** | executes student code (Judge0) | Docker containers | 2358 — localhost only |

**One open port.** Students' browsers only ever talk to the web app (3000);
the database, AI and code runner are reached from localhost by the app itself.

**Other-project-safe by design.** Another project already runs on this
server? It is never touched:

- every one of our containers has a `careerpath-` prefix (`careerpath-db`,
  `careerpath-auth`, `careerpath-vllm`, `careerpath-judge0`, …) — our scripts
  stop/start ONLY those,
- the stop script stops `careerpath-*` containers only; the app killer only
  kills a node process that BOTH listens on port 3000 AND runs npm/next,
- the Supabase gateway lives on 54321 so port 8000 stays free for whoever
  else is using it,
- if another project runs its own Supabase stack too, our container names
  and Docker project names (`careerpath-supabase`, `careerpath-judge0`) still
  can't collide.

One-time cost: **₹0/month forever** (free software + your hardware).

---

## PART 1 — One-time setup (~1 hour, no admin needed except ⛔)

### Step 1 — Install 3 things (once)

1. **NVIDIA driver** — nvidia.com/drivers → download the Windows driver for
   the RTX 5090 → install → restart.
   *Verify:* open PowerShell normally, type `nvidia-smi` → you see the GPU
   name and memory. **If this shows an error, STOP — nothing else works.**
2. **Docker Desktop** — docker.com → "Download for Windows" → install (accept
   the WSL2 prompt) → open it → wait until the bottom-left corner says
   "running" (green whale).
   *Verify:* `docker ps` prints a (possibly empty) table without errors.
3. **Node.js LTS** — nodejs.org → install the LTS version → Next → Next.
   *Verify:* `node -v` prints a version number.

⚠️ **Power:** Settings → System → Power → set "screen off" and "sleep" to
**Never** while plugged in (no admin needed). The server must stay awake
while students use it.

### Step 2 — Put the project on the server

Pick ONE way:

**Way A (preferred, easy updates later): git clone**
```powershell
cd C:\
git clone https://github.com/Sharveswar007/CareerPath.git
cd CareerPath
```
*(Git: git-scm.com → install with all defaults if not present.)*

**Way B (no git, no internet on server): ZIP transfer**
1. On your laptop: download the repo as ZIP from GitHub (Code ▸ Download ZIP)
2. Copy it + the private file (Step 3) to the server by USB/LAN.
3. Right-click the ZIP → "Extract all…" → extract to `C:\CareerPath`
   so that `C:\CareerPath\package.json` exists.
4. **Delete the ZIP itself — it is not needed after extracting.**

### Step 3 — Copy the PRIVATE credentials file ⚠️ (do not skip)

Copy **`.env.campus.local`** from the owner's laptop to the repo root
(`C:\CareerPath\.env.campus.local`, next to `package.json`).

- It is gitignored — it can never be pushed or leaked by a commit.
- It holds the fresh Judge0 token, vLLM key and a freshly signed Supabase
  key set. The values that used to be public on GitHub are burned; do reuse
  them.
- **What you must end up with on the server (checklist):**
  | On the server | What it is | Ever delete it? |
  |---|---|---|
  | `C:\CareerPath\` (project folder) | all the code | never — this is what RUNS |
  | `C:\CareerPath\.env.campus.local` | private credentials | never — backup it in your password manager/USB |
  | `C:\CareerPath-Server\hf-cache\` (created on first start) | the 8 GB AI model | never — it downloads ONCE |

### Step 4 — Start Docker Desktop (every boot, user-level)

Double-click Docker Desktop, wait for "running". No admin needed.

### Step 5 — Port conflicts? (only if IT says a port is taken)

Check — run and look for lines:

```powershell
netstat -ano | findstr "LISTENING" | findstr ":3000 :54321 :2358 :8001"
```

No output = all free, continue. If occupied:

| Port taken | Change | Then also |
|---|---|---|
| **3000** (website) | start with `daily-start-campus.ps1 -Port 4000` | firewall rule for 4000; **no rebuild** |
| **54321** (Supabase) | `server\supabase\docker\.env` → `API_GW_HTTP_PORT=<e.g. 5678>` (file is created by the wizard in Step 6 — change after) | `SUPABASE_INTERNAL_URL` in `.env.local` — the wizard syncs it automatically; **rebuild if the bundle is stale** |
| **2358** (Judge0) | `server\judge0\docker-compose.yml` → `"2359:2358"` (only the LEFT number) | `.env.local` → `JUDGE0_URL=http://localhost:2359`; no rebuild |
| **8001** (vLLM) | `server\vllm\start-vllm.ps1` → `-p 8111:8000` | `.env.local` → `AI_BASE_URL=http://localhost:8111`; no rebuild |

Everything except 3000 is localhost-only — conflicts on those only matter
when the OTHER project runs its service on the same port at the same time.

### Step 6 — Run the one-time setup wizard ⚠️

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1
```

What it does for you (you type nothing):

1. creates `server\supabase\docker\.env` from the tracked template, if the
   file doesn't exist yet (fresh clone),
2. injects the private secrets from `.env.campus.local`: JWT signing secret,
   anon + service keys, dashboard password (and DB password if the DB volume
   is new),
3. writes the Judge0 token + internal passwords into `server\judge0\judge0.conf`,
4. writes `.env.local` from `server\env.campus.template` and fills the keys,
5. syncs `SUPABASE_INTERNAL_URL` with the configured gateway port,
6. prints the ONE firewall command.

**You should see** (green/yellow lines):
```
Private credentials found (.env.campus.local) - fresh secrets will be injected.
Supabase .env does not exist yet - creating from .env.example...
Supabase secrets set from .env.campus.local (JWT secret + keys + dashboard).
Judge0 token + passwords set from .env.campus.local.
[1/3] .env.local written (gateway port 54321, keys filled).
[2/3] Supabase .env written (SITE_URL localhost:3000, gateway port 54321).
[3/3] ONE firewall rule is needed ...
```

*Verify quickly:* `Get-Content .env.local` — lines `NEXT_PUBLIC_SUPABASE_URL=/supa`,
`SUPABASE_INTERNAL_URL=http://localhost:54321`, an anon key starting `eyJ…`
(NOT `PASTE_FROM…`), the private `AI_API_KEY` and `JUDGE0_AUTH_TOKEN` values.

**No IP is asked anywhere — by design.** The build carries no IP; the college
WiFi IP can change any time and nothing breaks (the morning script prints
today's student URL for you).

---

## PART 1.5 — Open ONE firewall port ⛔ (needs admin — ask IT once)

The only admin-requiring step. Students on the campus LAN need TCP **3000**
allowed inbound. EITHER:

```powershell
# paste into an Administrator PowerShell once:
netsh advfirewall firewall add rule name="CareerPath Web" dir=in action=allow protocol=TCP localport=3000
```

OR: Windows Security → Firewall & network protection → Advanced settings →
Inbound Rules → New Rule → Port → TCP 3000 → Allow → all profiles → name
"CareerPath Web".

OR: send IT the one-liner above and ask them to run it.

**Without this**, students cannot reach the server over LAN — but localhost
(https://localhost:3000 on the server itself) still works, so you can finish
setup first and open the port later.

### What needs admin (and what never does)

| Task | Admin needed? | Notes |
|---|---|---|
| Copying files, all server scripts, Docker containers, all our ports | ❌ never | all user-level |
| ONE inbound firewall rule (TCP 3000) | ⛔ yes / ask IT | only way students reach the server over LAN |
| DHCP reservation for a stable IP | ⛔ IT only — but OPTIONAL | IP changes are harmless now; stable IP is just cosmetic |
| "Never sleep" power plan | ❌ no | user setting |
| Auto-start scheduled task (`register-autostart.ps1`) | ❌ usually not | optional convenience |

Nothing in any script attempts admin actions — if something asks for
elevation unexpectedly, treat it as a bug and stop.

---

## PART 2 — First start (~30–40 min, mostly one-time downloads)

Make sure Docker Desktop shows "running", then:

```powershell
cd C:\CareerPath
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
```

The script does, in order:
1. checks Docker Desktop is up (tells you exactly if not),
2. starts the containers: Judge0 (`careerpath-judge0*`), Supabase
   (`careerpath-db`, `careerpath-auth`, `careerpath-rest`, `careerpath-envoy`,
   …) and vLLM (`careerpath-vllm`). **First run downloads the 13B AI model
   ONCE (~8 GB) into `C:\CareerPath-Server\hf-cache`.**
3. waits for the AI model to load into the GPU (2–4 min; progress prints),
4. installs npm deps + builds the web app (first time 3–5 min),
5. starts the app and prints today's student URL.

**You should see at the end:**
```
READY - give students this URL:
      http://<server-ip>:3000
```
(The `ipconfig`-style IP in the URL is today's IP. It may change tomorrow —
that is fine, the script will print the new one.)

### Step 2.1 — Create the database tables (once)

With the containers running, paste this in PowerShell:

```powershell
Get-Content supabase\schema.sql -Raw | docker exec -i careerpath-db psql -U postgres -f /dev/stdin
```

*Success looks like:* the last lines contain `CREATE TABLE`, `CREATE POLICY`,
many `INSERT 0 1` and — at the very end — `INSERT 0 3`.
Safe to re-run any time (nothing gets duplicated or deleted). If it errors:
re-run once; still failing → send the FIRST error line to your dev.

### Step 2.2 — Verify everything (2 min)

```powershell
powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1
```

*Success looks like:* **6 passes, 0 failed** — vLLM up, vLLM generating on
the GPU, Judge0 up, Judge0 running real code (`print(6*7)` → 42), Supabase
API answering, GPU visible. Any FAIL prints the reason on the same line.

> ℹ️ `/api/health` saying **"degraded", ai: fetch failed** right after a
> morning start is normal: the model is still warming into the GPU. It turns
> to `model ready` after a few minutes by itself — do a test chat first
> thing in the morning so students never hit the slow first request.

### Step 2.3 — (optional, 1 min) Demo accounts

```powershell
powershell -ExecutionPolicy Bypass -File server\create-demo-accounts.ps1
```
Creates 3 filled-in student accounts (shared password printed at the end)
so evaluators never see an empty platform. Safe to re-run (skips existing).

### Step 2.4 — First real test (2 min, on the server)

Open http://localhost:3000 → sign up → log in → chat (any question → the
first answer may take ~30 s, the AI is warming) → any challenge → Run code →
green result → upload a profile photo → done.

✅ **First-time setup complete. This whole thing never needs admin again.**

---

## PART 3 — The daily routine (the whole job)

| When | Command | What it says when OK |
|---|---|---|
| 🌅 morning | `powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1` | `READY - give students this URL: http://…:3000` (~5 min; model reloads into GPU) |
| 🌆 evening | `powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1` | literally lists which `careerpath-*` containers it stopped; "Other projects' containers left running: N (never touched)" |
| 📅 Friday | `powershell -ExecutionPolicy Bypass -File server\backup-db.ps1` | writes `server\backups\…sql` — keep the newest 4+, copy them anywhere |

The morning test: open the printed URL on your own phone (campus WiFi) once
— login, chat, run one challenge. Students can be let in.

---

## PART 4 — Privacy (already safe, nothing to configure)

- Students can delete **their own** account on the `/privacy` page (asks for
  their password, deletes only their own data).
- Teachers deleting a test is manual (confirm dialog, by design).
- Nothing in the app deletes anything else automatically.

---

## PART 5 — When something breaks (first 60 seconds)

| Symptom | Do this |
|---|---|
| daily-start-campus says Docker not running | start Docker Desktop, wait for "running", re-run |
| READY but health shows "degraded" | read the printed dependency lines — each names its own service; `docker logs <container>` |
| login/signup errors but site opens | check the wizard output was green; re-run `campus-setup.ps1` (safe to re-run), then rebuild `-Build` |
| students can't open the site at all | student side: `ping <server-ip>` → fails = network/firewall (only the firewall rule can fix this); server side: `netstat -ano | findstr :3000` → empty = app not running, re-run daily-start |
| login works, chat doesn't | AI not loaded: `docker logs careerpath-vllm`; check `.env.local` has `AI_BASE_URL=http://localhost:8001` and the same `AI_API_KEY` |
| challenges don't run | `docker logs careerpath-judge0`; check `JUDGE0_URL`/`JUDGE0_AUTH_TOKEN` in `.env.local` |
| everything down at 9 AM | re-run `daily-start-campus.ps1` — safe to repeat |
| worked yesterday, broken today | someone edited `.env.local` — compare with the template, rebuild with `-Build`. IP changes are NEVER the cause (no IP is baked in) |

Full diagnosis map: `RUNBOOK.md`.

---

## PART 6 — Updating the code (students get it in one command)

```powershell
git pull
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
```

(Do NOT run `-Build` in the morning in a hurry — only after code updates.
The plain morning command reuses the existing build.)

### What was created where (for the curious)

| Path | What |
|---|---|
| `C:\CareerPath-Server\hf-cache\` | AI model weights (8 GB, downloaded once) |
| Docker volumes `careerpath-supabase_*` and `careerpath-judge0_data` | ALL database/user data — nothing is deleted by any script |
| `server\backups\` | Friday database backups |
| `server\logs\` | daily start/stop transcripts + app server log (gitignored) |
| `.env.local`, `server\supabase\docker\.env`, `server\judge0\judge0.conf` | server-local configs filled by the wizard (never committed) |

---

## PART 7 — Optional: off-campus access (skip unless needed)

Campus mode only works inside the college network. Later, a Cloudflare
**named tunnel** + ₹500/yr domain gives off-campus access (walkthrough:
SERVER_DEPLOYMENT_GUIDE.md PART 6). Not needed for an in-campus demo.

---

## One-page quick card (print this)

```powershell
# ===== ONCE =====
git clone https://github.com/Sharveswar007/CareerPath.git ; cd C:\CareerPath
Copy-Item X:\path\to\.env.campus.local .   # private credentials (owner) - NEVER commit
powershell -ExecutionPolicy Bypass -File server\campus-setup.ps1        # fills keys/secrets/ports
# ⛔ admin/IT once: netsh advfirewall firewall add rule name="CareerPath Web" dir=in action=allow protocol=TCP localport=3000
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1 -Build
Get-Content supabase\schema.sql -Raw | docker exec -i careerpath-db psql -U postgres -f /dev/stdin
powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1          # want 6/6 PASS
# optional demo accounts:
powershell -ExecutionPolicy Bypass -File server\create-demo-accounts.ps1

# ===== EVERY MORNING 9 AM =====
powershell -ExecutionPolicy Bypass -File server\daily-start-campus.ps1   # prints today's URL

# ===== EVERY EVENING 6 PM =====
powershell -ExecutionPolicy Bypass -File server\stop-all-campus.ps1      # other projects untouched

# ===== EVERY FRIDAY =====
powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
```
