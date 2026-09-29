// GET /api/health - liveness + dependency status (for UptimeRobot / ops).
// Returns 200 when all critical deps respond, 502 when something is down.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DepCheck {
    ok: boolean;
    detail: string;
    ms: number;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return await Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
}

async function checkSupabase(): Promise<DepCheck> {
    const start = Date.now();
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return { ok: false, detail: "env vars missing", ms: Date.now() - start };
        const res = await withTimeout(
            fetch(`${url}/rest/v1/`, { headers: { apikey: key }, signal: AbortSignal.timeout(5000) }),
            6000
        );
        return { ok: res.status < 500, detail: `HTTP ${res.status}`, ms: Date.now() - start };
    } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "error", ms: Date.now() - start };
    }
}

async function checkAI(): Promise<DepCheck> {
    const start = Date.now();
    try {
        const base = process.env.AI_BASE_URL;
        if (!base) return { ok: true, detail: "groq cloud (no AI_BASE_URL)", ms: 0 };
        const root = base.replace(/\/$/, "").replace(/\/v1$/, "");
        const res = await withTimeout(
            fetch(`${root}/v1/models`, {
                headers: process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {},
                signal: AbortSignal.timeout(5000),
            }),
            6000
        );
        const body = (await res.json().catch(() => ({}))) as { data?: Array<{ id: string }> };
        const hasModel = body.data?.some((m) => m.id === (process.env.AI_MODEL || "careerpath-ai"));
        return { ok: res.ok && Boolean(hasModel), detail: hasModel ? "model ready" : `HTTP ${res.status}`, ms: Date.now() - start };
    } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "error", ms: Date.now() - start };
    }
}

async function checkJudge0(): Promise<DepCheck> {
    const start = Date.now();
    try {
        const url = process.env.JUDGE0_URL;
        if (!url) return { ok: true, detail: "not configured (external executors used)", ms: 0 };
        const headers: Record<string, string> = {};
        if (process.env.JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
        const res = await withTimeout(
            fetch(`${url.replace(/\/$/, "")}/system_info`, { headers, signal: AbortSignal.timeout(5000) }),
            6000
        );
        return { ok: res.ok, detail: `HTTP ${res.status}`, ms: Date.now() - start };
    } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "error", ms: Date.now() - start };
    }
}

export async function GET() {
    const [supabase, ai, judge0] = await Promise.all([checkSupabase(), checkAI(), checkJudge0()]);
    const allOk = supabase.ok && ai.ok; // judge0 has non-Judge0 fallbacks, so not critical here

    return NextResponse.json(
        {
            status: allOk ? "healthy" : "degraded",
            time: new Date().toISOString(),
            deps: { supabase, ai, judge0 },
        },
        { status: allOk ? 200 : 502 }
    );
}
