# CareerPath — Runbook

What to do when something breaks, in order. Print this page. During a demo,
do NOT debug live — fall back first (see §0), investigate after.

## §0 · 60-second fallbacks (memorize these)

| Symptom | Do this |
|---|---|
| AI answers fail everywhere (chat/quiz/exams) | Vercel → Settings → Environment Variables → **clear `AI_BASE_URL`** (+ `AI_API_KEY`) → Redeploy. App instantly falls back to Groq cloud. Fix GPU later. |
| Code execution fails (challenges) | Note it, switch to MCQ-only demos (quiz/exams still work). Judge0 restart: `docker restart judge0` on the server. |
| Whole app down | Check Vercel status + your last deploy. Roll back: Vercel → Deployments → previous → "Promote to Production". |
| Everything on the server down | `powershell -File server\start-all.ps1` (idempotent — safe to re-run). |

## §1 · Daily checks (2 minutes)

```powershell
# 1. app alive?
curl https://<your-vercel-url>/api/health     # want {"status":"healthy"}

# 2. containers all up? (want ~18 running, none Restarting)
docker ps --format "table {{.Names}}\t{{.Status}}"

# 3. GPU healthy? (want temp < 85C, no Xid errors)
nvidia-smi
```

Also: UptimeRobot (free) pings `/api/health` every 5 min → you get an email
before students notice. Set it up once (PENDING_TASKS.md §3).

## §2 · Quick diagnosis map

| What's broken | Where to look |
|---|---|
| AI weird/empty answers | `docker logs cloudflared-vllm` (tunnel up?), `docker logs <vllm-container>` (OOM? crashed?), then `server\golden-set.ps1` — score ≥ 80% = model fine, bug is app-side |
| Execution fails | `docker logs judge0` |
| Login/signup broken | Supabase Studio (localhost:8000) → Auth → is it up? `docker logs supabase-auth` |
| App slow | `nvidia-smi` (GPU saturated?), `/api/health` → `ai` field latency |
| Someone reports 429/503 | That's the rate limiter/concurrency cap working — see §5 to tune |

Log format: every hardened route logs JSON lines with a short `requestId` —
grep the Vercel function logs for the ID a user reports.

## §3 · Weekly maintenance (10 minutes, pick a fixed day)

1. **Backup**: `powershell -File server\backup-db.ps1`
   → keep the last 4 files in `server\backups\` (gitignored), delete older.
2. **Backup verify**: `.\backup-db.ps1 -Restore -File <newest backup>` → must print PASSED.
3. **Disk space**: Docker eats disk silently — `docker system df`. If the
   "Build Cache" is huge: `docker system prune -f`. Keep 20+ GB free
   (models + images are big).
4. **Updates**: `docker compose pull` in `server\supabase\docker` and
   `server\judge0`, then `docker compose up -d`. Do NOT update the vLLM image
   in demo week — pin whatever works.
5. **`git pull` on the server copy** if the app changed.

## §4 · Before demo day (checklist)

- [ ] `start-all.ps1` up, `/api/health` healthy
- [ ] `golden-set.ps1` score ≥ 80%
- [ ] `smoke-test.ps1` all PASS
- [ ] Fresh backups + one restore drill PASSED
- [ ] Demo accounts exist (`create-demo-accounts.ps1`) and **you have logged in with one** on the real URL
- [ ] GPU: `nvidia-smi` clean, Windows Update paused (Active Hours set), UPS plugged
- [ ] Browser: logged out, cache refreshed, demo tab open; second browser as backup
- [ ] Phone hotspot tested (in case college Wi-Fi blocks Cloudflare tunnels)
- [ ] §0 fallbacks readable from memory

## §5 · Tuning knobs (when you know what you're changing)

| Knob | Where | Default | When to change |
|---|---|---|---|
| AI timeout | `AI_TIMEOUT_MS` (Vercel env) | 120000 | Lower (60000) with the faster 8B test model |
| Rate limit per user | `LIMITS.AI_PER_MINUTE` in `src/lib/ai/limits.ts` | 10/min | Raise only if real students hit it during normal use |
| Concurrency cap | `MAX_INFLIGHT` in `src/lib/ai/limits.ts` | 8 | Tune with `load-test.ps1 -Users 65`: raise until 429s appear, back off one step |
| vLLM parallelism | `--max-num-seqs` in `server/vllm/start-vllm.ps1` | (vLLM default) | Primary GPU knob for 65 users — increase with VRAM headroom |

## §6 · Data safety rules

- Never commit `server/backups/`, `server/supabase/docker/.env`, or any real key (all gitignored — keep it that way).
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all database security. It lives in Vercel env + supabase `.env` only. Never in code, never in the client.
- Deleting a user? They can do it themselves at `/privacy` (password-confirmed). For manual deletion: Studio → delete the auth user — the `on_auth_user_delete` trigger cleans up all their rows first.
- Restoring a backup over live data **wipes everything created after the backup** — announce downtime, then restore.
