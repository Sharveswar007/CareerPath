// In-memory rate limiting + concurrency cap for AI-heavy routes.
//
// Scope: per-server-instance memory. Correct for this deployment (single
// Next.js server on Vercel). If the app ever scales horizontally, move the
// counters to Upstash Redis or similar.
//
// Two layers:
//   1. RATE LIMIT  - N requests per minute per user (stops F5 abuse)
//   2. CONCURRENCY - max in-flight AI calls process-wide (protects the GPU;
//      vLLM queues internally, but we cap how deep the Next.js queue goes)

const WINDOW_MS = 60_000;

const hits = new Map<string, number[]>();
const inFlight = { count: 0 };
const MAX_INFLIGHT = 8;

export interface LimitResult {
    allowed: boolean;
    reason?: "rate_limit" | "busy";
    retryAfterSec?: number;
}

export function rateLimit(key: string, perMinute = 10): LimitResult {
    const now = Date.now();
    const window = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (window.length >= perMinute) {
        hits.set(key, window); // keep pruned list
        const retryAfterSec = Math.ceil((WINDOW_MS - (now - window[0])) / 1000);
        return { allowed: false, reason: "rate_limit", retryAfterSec };
    }
    window.push(now);
    hits.set(key, window);

    // opportunistic cleanup so the map cannot grow unbounded
    if (hits.size > 5000) {
        for (const [k, v] of hits) {
            if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
        }
    }
    return { allowed: true };
}

/** Try to reserve an AI concurrency slot; release with the returned fn. */
export function acquireAiSlot(): { acquired: boolean; release: () => void } {
    if (inFlight.count >= MAX_INFLIGHT) {
        return { acquired: false, release: () => {} };
    }
    inFlight.count++;
    let released = false;
    return {
        acquired: true,
        release: () => {
            if (!released) {
                released = true;
                inFlight.count--;
            }
        },
    };
}

export function currentInFlight(): number {
    return inFlight.count;
}

export const LIMITS = { AI_PER_MINUTE: 10, MAX_INFLIGHT } as const;
