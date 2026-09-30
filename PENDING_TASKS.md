# CareerPath — Pending Tasks

Updated Sep 29 (evening) after the **accuracy + operations hardening cycle**.
Previous rounds' evidence: `TESTING_REPORT.md`.

## ✅ Completed (all cycles)

**This cycle (accuracy + ops):**
- **Account self-deletion**: `/privacy` form → `/api/account/delete`
  (password-confirmed) → SQL `delete_user_data()` wipes every owned row +
  the auth user. **Verified live end-to-end** (trigger path AND API path,
  all rows confirmed gone in the DB)
- **Question dedupe** on quiz + exams routes (drops repeated/degenerate MCQs)
- **`AI_TIMEOUT_MS`** env knob (lower it for the fast 8B test model)
- **Request-ID structured logging** on chat/quiz/challenges/exams routes
- **`server/golden-set.ps1`** — AI structural-accuracy scorecard (≥80% gate)
- **`server/backup-db.ps1`** — pg_dump backup + **restore drill PASSED live**
- **`server/create-demo-accounts.ps1`** — 3 demo students, **verified live**
- **`RUNBOOK.md`** — fallbacks, daily checks, diagnosis, weekly ops, demo checklist
- **Schema now fully idempotent** (`CREATE TABLE IF NOT EXISTS` + policy
  drops) — full re-run tested live with data preserved
- **Seed data** — 3 public coding challenges ship with the schema
- **CI parity proven in a Linux container**: `npm ci --legacy-peer-deps` →
  tsc OK → eslint 0 errors → 21/21 vitest → build OK (Node 20)

**Earlier cycles:** structured AI output (guided_json + zod + retry), rate
limiting + concurrency cap (verified live), `/api/health`, vLLM + Judge0 auth
tokens, signup autoconfirm fix, privacy page, CI workflow, start/stop-all
scripts, dead-dependency removal, 21 unit tests, all 11 route tests.

## 🟠 1. On the server (3 commands + Vercel env)

1. Admin session: NVIDIA driver + Docker Desktop; verify `nvidia-smi`.
2. Copy the repo, then:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server\start-all.ps1 -Model "TheBloke/CodeLlama-13B-Instruct-AWQ"
   ```
   (13B default; `-SkipTunnel` starts faster without public URLs. For a
   quicker first test: `-Model "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"`.)
3. Schema: Studio (localhost:8000) → SQL Editor → paste `supabase/schema.sql`
   → Run. (Idempotent — safe to re-run; seed challenges appear automatically.)
4. `get-tunnel-urls.ps1` → paste the block from `server/README.md` Step 6
   into Vercel env vars (now includes `SUPABASE_SERVICE_ROLE_KEY`) → Redeploy.
5. Verify: `smoke-test.ps1` → `golden-set.ps1` (≥80%) → `load-test.ps1 -Users 65`.
6. Demo week prep: `create-demo-accounts.ps1` + follow `RUNBOOK.md` §4 checklist.

## 🟡 2. External actions (can't be done from code)

- [ ] Rotate the old leaked RapidAPI key on their dashboard
- [ ] UptimeRobot free monitor → point it at `<vercel-url>/api/health`
- [ ] Sentry free tier (optional but recommended)
- [ ] Domain (~₹500/yr) + Cloudflare named tunnel for stable URLs
- [ ] UPS + Windows Update Active Hours for demo day

## 🔵 3. Nice-to-have (skip unless time remains)

- Nightly scheduled backup via Task Scheduler (command is in `backup-db.ps1` comments)
- Cloudflare quick-tunnel URLs were blocked from this machine earlier today
  (network-side); if it recurs on the server, use phone hotspot as fallback
- Tavily grounding for exam/trends answers (accuracy upgrade, ~half a day)

## 🆕 Added Sep 30 (final round)

- **`SERVER_DEPLOYMENT_GUIDE.md`** — complete layman deployment walkthrough:
  first-time setup, daily 9 AM / 6 PM routine, full free-tier cost audit,
  failure map, printable quick-reference card
- **`server/daily-start.ps1`** — ONE command every morning: Docker check →
  all services → waits for AI load → prints URLs → auto-updates Vercel
  (with CLI) or prints exact manual steps → READY/NOT-READY verdict
- Evening shutdown stays: `server/stop-all.ps1`

**Cost audit result: entire stack runs at ₹0/month** (Vercel Hobby,
self-hosted vLLM/Supabase/Judge0, free Cloudflare tunnels). Optional ₹500/yr
domain for stable URLs is the only suggested spend. Tavily/OCR.space have
free tiers with graceful in-app fallbacks. Rotate the leaked RapidAPI key
(legacy path, unused on the server).
