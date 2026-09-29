// Post-generation dedupe for AI quiz/question output.
//
// Small self-hosted models repeat near-identical questions, especially when
// many students request the same topic during one demo session. This filter
// drops exact (case/punctuation-insensitive) duplicates and questions with
// broken option sets (duplicated options, or fewer than 2 distinct options).

export interface DedupeQuestionLike {
    question: string;
    options?: string[];
}

/** Normalize text for duplicate detection: lowercase, letters/digits only. */
export function normalizeForDedupe(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Keep the first occurrence of each distinct question; drop questions whose
 * options are degenerate (fewer than 2 distinct options after normalization).
 */
export function dedupeQuestions<T extends DedupeQuestionLike>(questions: T[]): T[] {
    const seen = new Set<string>();
    const kept: T[] = [];
    for (const q of questions) {
        const key = normalizeForDedupe(q.question ?? "");
        if (!key || seen.has(key)) continue;

        const opts = (q.options ?? []).map((o) => normalizeForDedupe(o ?? "")).filter(Boolean);
        if (new Set(opts).size < 2) continue;

        seen.add(key);
        kept.push(q);
    }
    return kept;
}
