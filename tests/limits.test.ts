import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, acquireAiSlot, currentInFlight, LIMITS } from "@/lib/ai/limits";

describe("rateLimit", () => {
    beforeEach(() => {
        // unique key per test run avoids cross-test window bleed
    });

    it("allows requests under the limit", () => {
        const key = `test:${Math.random()}`;
        for (let i = 0; i < 3; i++) {
            expect(rateLimit(key, 5).allowed).toBe(true);
        }
    });

    it("blocks requests over the limit", () => {
        const key = `test:${Math.random()}`;
        for (let i = 0; i < LIMITS.AI_PER_MINUTE; i++) {
            rateLimit(key, LIMITS.AI_PER_MINUTE);
        }
        const result = rateLimit(key, LIMITS.AI_PER_MINUTE);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("rate_limit");
        expect(result.retryAfterSec).toBeGreaterThan(0);
    });

    it("tracks keys independently", () => {
        const a = `a:${Math.random()}`;
        const b = `b:${Math.random()}`;
        for (let i = 0; i < LIMITS.AI_PER_MINUTE; i++) rateLimit(a);
        expect(rateLimit(a).allowed).toBe(false);
        expect(rateLimit(b).allowed).toBe(true);
    });
});

describe("acquireAiSlot", () => {
    it("admits up to MAX_INFLIGHT callers then rejects", () => {
        const slots = Array.from({ length: LIMITS.MAX_INFLIGHT }, () => acquireAiSlot());
        expect(slots.every((s) => s.acquired)).toBe(true);
        expect(currentInFlight()).toBe(LIMITS.MAX_INFLIGHT);

        const rejected = acquireAiSlot();
        expect(rejected.acquired).toBe(false);

        slots.forEach((s) => s.release());
        expect(currentInFlight()).toBe(0);

        expect(acquireAiSlot().acquired).toBe(true);
    });

    it("release is idempotent", () => {
        const before = currentInFlight();
        const slot = acquireAiSlot();
        slot.release();
        slot.release();
        slot.release();
        expect(currentInFlight()).toBe(before);
    });
});
