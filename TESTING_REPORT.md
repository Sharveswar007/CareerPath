# CareerPath — Complete Testing Report

**Date:** September 29, 2026 (two test cycles: functional + post-hardening)
**Environment:** Dev laptop (RTX 4050 6GB, 15.6GB RAM, Windows + WSL2, Docker Desktop)
**Scope:** Full single-user functional verification of every stage. Concurrency
(65 users) is intentionally deferred to the GPU server — a 6GB laptop cannot
simulate it; `server/load-test.ps1` was built for that exact purpose.

---

## 1b. Cycle 2 — production hardening implemented & re-tested

After cycle 1, the following was implemented (model kept as **CodeLlama 13B**
per project decision) and re-tested on the same local stack:

| # | Hardening | Test result |
|---|---|---|
| 1 | `generateStructured()` — vLLM `guided_json` decoding, defensive JSON extraction (fences/prose/object-wrapped arrays), zod validation, automatic corrective retry. Wired into skills-quiz, challenge, and exam generation | ✅ quiz/challenge/exam routes return schema-valid data through the new path |
| 2 | Rate limiting (10 AI requests/min/user) + AI concurrency cap (8 in-flight) with friendly 429/503 + Retry-After | ✅ **verified live: 10×200 then 429** on rapid same-IP requests |
| 3 | `/api/health` — checks Supabase, AI (incl. expected model), Judge0 with timeouts | ✅ `{status: healthy}` with per-dep latency |
| 4 | vLLM API key (`--api-key` on server, `AI_API_KEY` in app) | ✅ mock now enforces Bearer auth: no key → 401, with key → 200 |
| 5 | Privacy & data-handling page (`/privacy`) | ✅ renders (HTTP 200) |
| 6 | GitHub Actions CI (tsc + eslint + tests + build) | ✅ workflow committed |
| 7 | Unit tests (vitest) for extraction, unwrapping, rate limiter, concurrency slots | ✅ 14/14 pass |
| 8 | One-command server ops: `start-all.ps1` / `stop-all.ps1` | ✅ parser-validated |
| 9 | Dead dependencies removed: `pkg.json`, `reactflow`, `@react-spring/web`, `lottie-react` | ✅ npm install clean |

Notable behavior during re-testing: when the mock AI returned a non-JSON chat
reply, the new structured path **failed loudly with a clear error instead of
delivering garbage** — exactly the designed safety net for small-model output.
The mock was then extended with the new per-route JSON contracts, and all
routes pass. No slot leaks observed (0 "busy" responses under normal load).

Final gates (cycle 2): `tsc` 0 errors · ESLint 0 errors (120 documented
warnings) · vitest 14/14 · build clean (38/38 pages) · no dead code found ·
mypy/ruff N/A (no `.py` files in repo; `tsc` + `eslint` are the TS equivalents).

---

## 1. Verdict

| Area | Result |
|---|---|
| App build (`next build`) | ✅ Clean |
| Typecheck (`tsc --noEmit`) | ✅ 0 errors |
| Lint (`eslint .`) | ✅ 0 errors (120 legacy warnings documented in eslint.config.mjs) |
| Dead code sweep | ✅ None found (`check_delete.ts`, `scratch/`, unused helpers removed earlier) |
| Functional routes T1–T11 | ✅ All pass (1 bug found & fixed during testing) |
| Security checks | ✅ Judge0 auth enforced, RLS enforced |
| Tunnels (public URLs) | ⚠️ Blocked by network/Cloudflare-side issue (see §6) |
| 65-user concurrency | ⏭️ Deferred to server (by design) |

**The platform is functionally ready for the server. Copy `server/`, follow
`server/README.md` steps 1–8.**

---

## 2. Stack under test

| Service | Implementation | Status |
|---|---|---|
| Judge0 (code sandbox) | Official docker stack, 4 containers, **auth token enabled** | ✅ Healthy |
| Supabase (DB + auth) | Vendored docker stack, **11/11 containers healthy**, 13 tables applied | ✅ Healthy |
| AI (vLLM stand-in) | `server/dev/mock-vllm.mjs` on :8001, `--served-model-name careerpath-ai` | ✅ Healthy |
| Next.js app | Production build (`npm run start`) | ✅ HTTP 200 |
| Cloudflare tunnels | 3 × quick tunnels | ⚠️ see §6 |

> **Why a mock AI?** The real model (13B/8B AWQ) needs ~8–10GB VRAM; this laptop
> has 6GB. The mock speaks the identical OpenAI API with the identical
> `careerpath-ai` model name, so every route is exercised 1:1. Model *quality*
> and *throughput* are the only things it can't prove — both are server tests
> (`smoke-test.ps1` does a real generation; `load-test.ps1` does 65 users).

---

## 3. Functional test results

| # | Test | Route | Result | Evidence |
|---|---|---|---|---|
| T1 | Python execution | `POST /api/challenges/run` | ✅ | `print(sum([1,2,3]))` → `"6"`, Judge0 status id 3 (Accepted), **token flowed** (0 auth errors in logs) |
| T2 | JS execution + fallback | `POST /api/challenges/run` | ✅ | Judge0's Node 12 crashes under WSL2 (`id 11`) → chain fell back → Wandbox → `console.log(40+2)` → `"42"`. Fallback semantics fixed earlier (environment failures retry, user-code failures are final) |
| T3 | Chat streaming | `POST /api/chat` | ✅ | Streaming tokens returned (`This is a **...`) |
| T4 | Skills quiz generation | `POST /api/skills/quiz/generate` | ✅ | Valid question array with options |
| T5 | Challenge generation | `POST /api/challenges/generate` | ✅ | Valid challenge object (title/description) |
| T6 | Exam updates (AI path + fallback) | `POST /api/exams/updates` | ✅ | AI returned non-JSON → route **gracefully degraded** (caught parse error, returned `{updates:[]}`) |
| T7 | Auth gate | `POST /api/assessment/generate` | ✅ | `401 Unauthorized` without session — routes correctly protected |
| T8 | Supabase REST + RLS | `GET /rest/v1/profiles` | ✅ | `200` with anon key; anonymous insert attempt correctly **blocked by RLS** (`42501`) — security working |
| T9 | Real signup | `POST /auth/v1/signup` | ✅ **after fix** | Returns `access_token` (was failing — see §4.1) |
| T10 | Studio reachable | `GET http://localhost:8000` | ✅ | HTTP 401 = dashboard auth wall working |
| T11 | Resume upload → extract → validate → analyze | `POST /api/resume/analyze` | ✅ | Multipart TXT → ATS score 80, sections, keywords, recommendations |

Additional verifications:
- **Judge0 direct API auth matrix:** no token → `401`, wrong token → `401`,
  correct token → `200` + correct execution (`print(6*7)` → `42`).
- **App ↔ Judge0 token wiring:** `JUDGE0_AUTH_TOKEN` env var → `X-Auth-Token`
  header sent for self-hosted Judge0 (RapidAPI path untouched).
- All PowerShell kit scripts pass PowerShell parser validation
  (`load-test.ps1`, `smoke-test.ps1`, `start-vllm.ps1`).

---

## 4. Bugs & issues found during this session (and their fixes)

### 4.1 🔴 Signup completely broken on self-hosted Supabase — FIXED
- **Symptom:** `POST /auth/v1/signup` → `500 unexpected_failure: Error sending confirmation email`.
- **Root cause:** vendored `.env` pointed `SMTP_HOST=supabase-mail`, but the
  current Supabase compose has **no mail container** — every signup died trying
  to send a confirmation email. Every student would have hit this on the server.
- **Fix:** `ENABLE_EMAIL_AUTOCONFIRM=true` (accounts active instantly, no SMTP
  dependency). Applied to the live `.env` (verified: signup returns
  `access_token`) **and** to `.env.example` so `setup-env.sh` regenerations
  keep it.

### 4.2 🟠 Tunnels down on this network — DOCUMENTED, action moved to server
- **Symptom:** all 3 cloudflared containers crash-loop;
  `failed to request quick Tunnel: Post "https://api.trycloudflare.com/tunnel": EOF`.
- **Diagnosis:** general internet fine (Google 200), CF quick-tunnel API
  refused (fails in 0.18s) — Cloudflare-side or ISP/network filtering. They
  worked 8 hours earlier on the same machine.
- **Impact:** none on functional testing (all tests are localhost). The kit
  re-creates tunnels with one command on the server; a named tunnel + domain is
  the permanent upgrade path.

### 4.3 🟡 Test-harness false alarm (not an app bug)
- Resume test first returned `HTTP 000 in 0.000s`: Windows curl cannot read the
  MSYS `/tmp` path used for the upload fixture. Re-tested with a repo-relative
  file → passed. Documented so nobody chases this ghost again.

Carried over from the previous session (already fixed, still verified green here):
Groq SDK `/openai/v1` path rewrite, execution fallback aborting on environment
failures, quiz JSON unwrap hardening, RapidAPI key moved to env var,
`VAULT_ENC_KEY` must be exactly 32 chars.

---

## 5. Static analysis

| Tool | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 errors; ~120 warnings = documented legacy UI `any` debt (waiver in `eslint.config.mjs`); server-side code is clean |
| `next build` | Compiles, 37/37 pages |
| Dead code | None (previous sweep removed `check_delete.ts` — which also contained a hardcoded credential — `scratch/`, and 4 unused helpers in `groq/client.ts`) |
| **mypy / ruff** | **Not applicable:** zero `.py` files in the repo (verified with `find`). This is a TypeScript project; `tsc` + `eslint` are the equivalents and are clean. `ruff`/`mypy` will apply only if Python services are added later. |

---

## 6. Known limitations of this test session

1. **AI realism** — mock vLLM returns deterministic fixtures. It proves wiring,
   contracts, streaming, parsing, and error paths — not model quality or speed.
2. **Concurrency** — impossible on 6GB VRAM by design; run
   `server\load-test.ps1 -Users 65` on the RTX 5090 (single command, PASS/FAIL
   verdict printed).
3. **Tunnels** — unverifiable from this network today (§4.2); public-URL
   behavior was proven in the earlier session (real Python execution through
   the Cloudflare edge).
4. **Auth-gated routes** tested at the gate level (401 without session) plus
   direct GoTrue signup; full browser login flow was verified in the earlier
   session through the same stack.
5. **SMTP flows** (password-reset emails etc.) are intentionally unconfigured —
   autoconfirm makes them unnecessary for the demo; add real SMTP later if
   password reset is needed.

---

## 7. What to run on the server (summary)

Full layman steps: **`server/README.md` (steps 1–8)**. The short version:

```powershell
# after copying the server/ folder + one admin session (driver + Docker Desktop):
cd server\judge0; docker compose up -d
powershell -ExecutionPolicy Bypass -File server\vllm\start-vllm.ps1 -Model "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"   # 8B first test
cd ..\supabase\docker; docker compose up -d        # then schema.sql in Studio
powershell -ExecutionPolicy Bypass -File server\tunnel\start-tunnel.ps1
powershell -ExecutionPolicy Bypass -File server\tunnel\get-tunnel-urls.ps1   # -> Vercel env vars -> Redeploy
powershell -ExecutionPolicy Bypass -File server\smoke-test.ps1
powershell -ExecutionPolicy Bypass -File server\load-test.ps1 -Users 65      # the concurrency proof
```

---

## 8. Addendum — accuracy + operations cycle (Sep 29 evening)

New features, all **verified live** against the local stack:

| # | Test | Result |
|---|---|---|
| A1 | Account deletion — trigger path (manual Studio delete wipes profile/chat/submissions) | ✅ |
| A2 | Account deletion — API path (`delete_user_data` RPC as service_role, HTTP 204, all rows gone) | ✅ |
| A3 | Delete route guards — 401 unauthenticated / 400 missing credentials | ✅ |
| A4 | Demo accounts — 3 students created + password login verified | ✅ |
| A5 | Backup — pg_dump 737 KB + restore drill PASSED (15 tables, seeds intact) | ✅ |
| A6 | Schema idempotency — full `schema.sql` re-run: EXIT 0, data preserved, 39 policies intact | ✅ |
| A7 | Seed data — 3 public challenges auto-inserted | ✅ |
| A8 | Dedupe path — quiz route returns filtered questions | ✅ |
| A9 | Rate limiter re-check — 9×200 then 429 (shared bucket across routes) | ✅ |
| A10 | Chat streaming + privacy page after client-component conversion | ✅ 200 |
| A11 | Smoke test — 6/6 PASS | ✅ |
| A12 | **Linux CI parity** (node:20 container, exact CI commands) — install/tsc/eslint/vitest 21/21/build all OK | ✅ |

**Bug found & fixed this cycle:** `delete_user_data` originally `PERFORM`ed a
trigger function directly → Postgres error `trigger functions can only be
called as triggers`. Refactored into `cleanup_user_rows_data(uuid)` (plain
function) + trigger wrapper + RPC wrapper; both deletion paths re-verified.

**New artifacts:** `RUNBOOK.md`, `server/golden-set.ps1` +
`golden-prompts.json` (structural accuracy scorecard), `server/backup-db.ps1`,
`server/create-demo-accounts.ps1`, `/api/account/delete` +
`src/lib/supabase/admin.ts`, `src/lib/ai/dedupe.ts` (+7 tests, 21 total),
`src/lib/obs/request-id.ts` (wired into 4 routes), `AI_TIMEOUT_MS` knob,
idempotent schema + seed data.
