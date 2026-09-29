import { describe, it, expect } from "vitest";
import { extractJson, unwrapArray } from "@/lib/ai/structured";

describe("extractJson", () => {
    it("parses plain JSON objects", () => {
        expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
    });

    it("parses JSON wrapped in markdown fences", () => {
        expect(extractJson('```json\n{"a": [1,2]}\n```')).toEqual({ a: [1, 2] });
    });

    it("parses JSON with prose before/after", () => {
        expect(extractJson('Here is your JSON:\n{"ok": true}\nHope that helps!')).toEqual({ ok: true });
    });

    it("parses arrays", () => {
        expect(extractJson('[{"question": "q1"}]')).toEqual([{ question: "q1" }]);
    });

    it("handles nested braces by taking the largest valid block", () => {
        const text = 'prefix {"outer": {"inner": "}"}} suffix';
        expect(extractJson(text)).toEqual({ outer: { inner: "}" } });
    });

    it("throws when no JSON exists", () => {
        expect(() => extractJson("no json here at all")).toThrow();
    });
});

describe("unwrapArray", () => {
    it("passes arrays through", () => {
        expect(unwrapArray([1, 2])).toEqual([1, 2]);
    });

    it("unwraps object-wrapped arrays", () => {
        expect(unwrapArray({ questions: [{ q: 1 }] })).toEqual([{ q: 1 }]);
    });

    it("throws when neither array nor object", () => {
        expect(() => unwrapArray("string")).toThrow();
        expect(() => unwrapArray(null)).toThrow();
    });
});
