// Lightweight request-ID + structured logging for API routes.
//
// Why: when something breaks on demo day, scattered console.log lines can't be
// correlated to a request. Every route that adopts this gets one short ID per
// request; grep the server log for that ID to see everything that happened.
//
// Keep it dependency-free on purpose - JSON lines are good enough for a
// single-server deployment and parse cleanly in any log viewer.

import { randomUUID } from "node:crypto";

/** Short per-request ID (8 hex chars is plenty to correlate within one log). */
export function newRequestId(): string {
    return randomUUID().replace(/-/g, "").slice(0, 8);
}

/** Structured INFO line. */
export function logEvent(requestId: string, event: string, meta: Record<string, unknown> = {}) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), requestId, event, ...meta }));
}

/** Structured ERROR line (message only - never log full stacks with user data). */
export function logError(
    requestId: string,
    event: string,
    err: unknown,
    meta: Record<string, unknown> = {}
) {
    console.error(
        JSON.stringify({
            ts: new Date().toISOString(),
            requestId,
            event,
            error: err instanceof Error ? err.message : String(err),
            ...meta,
        })
    );
}
