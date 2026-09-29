import { describe, it, expect } from "vitest";
import { dedupeQuestions, normalizeForDedupe } from "@/lib/ai/dedupe";

describe("normalizeForDedupe", () => {
    it("lowercases and strips punctuation", () => {
        expect(normalizeForDedupe("What is a HTTP/2 Connection?")).toBe("what is a http 2 connection");
    });

    it("collapses repeated whitespace", () => {
        expect(normalizeForDedupe("a    b\tc")).toBe("a b c");
    });
});

describe("dedupeQuestions", () => {
    it("keeps distinct questions", () => {
        const out = dedupeQuestions([
            { question: "What is a pointer?", options: ["address", "value"] },
            { question: "What is a reference?", options: ["alias", "copy"] },
        ]);
        expect(out).toHaveLength(2);
    });

    it("drops case/punctuation-insensitive duplicates, keeping the first", () => {
        const out = dedupeQuestions([
            { question: "Explain Big-O notation.", options: ["a", "b"], tag: "first" },
            { question: "explain big-o notation!", options: ["c", "d"], tag: "dupe" },
            { question: "Explain BIG O NOTATION", options: ["e", "f"], tag: "dupe2" },
        ] as Array<{ question: string; options: string[]; tag: string }>);
        expect(out).toHaveLength(1);
        expect((out[0] as { tag: string }).tag).toBe("first");
    });

    it("drops questions with degenerate option sets (all options identical)", () => {
        const out = dedupeQuestions([
            { question: "Pick one", options: ["same", "same", "same"] },
            { question: "Real question", options: ["x", "y"] },
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].question).toBe("Real question");
    });

    it("keeps options that are case variants of each other only if they differ after normalize... i.e. drops them", () => {
        const out = dedupeQuestions([
            { question: "Case variants", options: ["Option A", "option a"] },
        ]);
        expect(out).toHaveLength(0);
    });

    it("returns empty array for empty input", () => {
        expect(dedupeQuestions([])).toEqual([]);
    });
});
