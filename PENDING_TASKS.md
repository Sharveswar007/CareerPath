# CareerPath — Pending Tasks

Updated Sep 29 after the **production-hardening implementation + full local
re-test**. Implementation details and test evidence: `TESTING_REPORT.md`.

## ✅ Completed (both test cycles)

- Full local stack end-to-end (Judge0 + Supabase + mock vLLM + app), all routes
- Judge0 auth token end-to-end; **vLLM API key** end-to-end (mock enforces it)
- **Signup bug fixed** (autoconfirm, verified live)
- **Hardening implemented & tested:**
  - `generateStructured()`: guided_json on vLLM, defensive JSON extraction,
    zod validation, automatic retry — wired into quiz/challenges/exams routes
  - Rate limiting (10/min/user) + AI concurrency cap (8) + friendly 429/503 —
    **verified live: 10×200 then 429**
  - `/api/health` endpoint (checks Supabase + AI + Judge0) — verified live
  - CI workflow (`.github/workflows/ci.yml`): tsc + eslint + tests + build
  - Unit tests: 14 vitest tests on the new logic — all passing
  - Privacy/data page at `/privacy`
  - `server/start-all.ps1` / `stop-all.ps1` one-command server scripts
  - Dead dependencies removed (`pkg.json`, `reactflow`, `@react-spring/web`,
    `lottie-react`)
- Static gates: `tsc` 0 errors, ESLint 0 errors (120 documented warnings),
  build clean, no dead code. mypy/ruff N/A (no Python files; tsc+eslint used).

## 🔴 1. Push to GitHub

- All work is committed/pushed separately — the final step of this cycle.
- Secrets remain protected: supabase `.env` + `volumes/` gitignored (verified).

## 🟠 2. On the server (now easier — 3 commands + Vercel env)

1. Admin session: NVIDIA driver + Docker Desktop; verify `nvidia-smi`.
2. Copy `server/` folder over, then:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server\start-all.ps1 -Model "TheBloke/CodeLlama-13B-Instruct-AWQ"
   ```
   (13B default; add `-SkipTunnel` to start faster without public URLs.
   For a quicker first test: use `-Model "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"`.)
3. Schema: Studio (localhost:8000) → SQL Editor → `supabase/schema.sql` → Run.
4. `get-tunnel-urls.ps1` → paste the block from `server/README.md` Step 6 into
   Vercel env vars → Redeploy.
5. `smoke-test.ps1` → then `load-test.ps1 -Users 65` (the concurrency proof).

## 🟡 3. External actions (can't be done from code)

- [ ] Rotate the old leaked RapidAPI key on their dashboard
- [ ] UptimeRobot free monitor → point it at `<vercel-url>/api/health`
- [ ] Sentry free tier (optional but recommended)
- [ ] Domain (~₹500/yr) + Cloudflare named tunnel for stable URLs
- [ ] UPS + Windows Update Active Hours for demo day
- [ ] Seed data + 2–3 demo accounts for evaluators
