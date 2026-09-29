// Structured AI output: extraction, validation, and one guided retry.
//
// Why this exists: small self-hosted models (CodeLlama 13B) sometimes wrap
// arrays in objects, emit markdown fences, or add prose around JSON. Every
// JSON-producing route used to hand-roll its own fragile parsing; this module
// gives all of them one hardened path:
//   1. ask vLLM for schema-guided decoding (guided_json) when self-hosted
//   2. extract JSON defensively (fences, prose, object-wrapped arrays)
//   3. validate with zod; on failure retry ONCE telling the model what broke

import type { ZodType } from "zod";
import { groq, AI_MODEL, isSelfHostedAI } from "@/lib/groq/client";

export interface StructuredOptions<T> {
    /** zod schema the final output must satisfy */
    schema: ZodType<T>;
    /** chat messages for the request */
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    /** JSON schema used for vLLM guided decoding (optional but recommended) */
    jsonSchema?: Record<string, unknown>;
    temperature?: number;
    maxTokens?: number;
    /** extra retry attempt when validation fails (default: 1) */
    retries?: number;
}

/** Pull the first JSON value out of arbitrary model text. */
export function extractJson(raw: string): unknown {
    const text = raw.trim();

    // 1. strip markdown fences
    const unfenced = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

    // 2. direct parse
    try {
        return JSON.parse(unfenced);
    } catch {
        /* keep digging */
    }

    // 3. first {...} or [...] block in the text (skips prose preambles)
    const start = unfenced.search(/[{[]/);
    if (start >= 0) {
        for (let end = unfenced.length; end > start; end--) {
            const slice = unfenced.slice(start, end);
            try {
                return JSON.parse(slice);
            } catch {
                /* shrink and retry */
            }
        }
    }
    throw new Error("no valid JSON found in model output");
}

/** Smaller models wrap arrays in objects ("{"questions": [...]}"). Unwrap. */
export function unwrapArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
        const inner = Object.values(value).find((v) => Array.isArray(v));
        if (inner) return inner;
    }
    throw new Error("expected a JSON array");
}

/**
 * Chat completion that must satisfy `schema`.
 * - Self-hosted (vLLM): uses guided_json decoding so the model CANNOT emit
 *   invalid JSON shapes at the decoding level.
 * - Groq cloud: relies on prompt + defensive extraction.
 * Retries once with the validation error appended to the conversation.
 */
export async function generateStructured<T>(opts: StructuredOptions<T>): Promise<T> {
    const { schema, messages, jsonSchema, temperature = 0.4, maxTokens = 2048 } = opts;
    const retries = opts.retries ?? 1;

    const guided = isSelfHostedAI && jsonSchema ? { guided_json: jsonSchema } : {};

    let conversation = [...messages];
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const completion = await groq.chat.completions.create({
            model: AI_MODEL,
            messages: conversation,
            temperature,
            max_tokens: maxTokens,
            ...(isSelfHostedAI ? {} : { response_format: { type: "json_object" as const } }),
            ...guided,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        let candidate: unknown;
        try {
            candidate = extractJson(raw);
        } catch (e) {
            lastError = e;
        }

        if (candidate !== undefined) {
            const parsed = schema.safeParse(candidate);
            if (parsed.success) return parsed.data;
            lastError = new Error(
                `validation failed: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
            );
        }

        if (attempt < retries) {
            conversation = [
                ...conversation,
                { role: "assistant", content: raw.slice(0, 2000) },
                {
                    role: "user",
                    content: `Your previous output was invalid: ${String(lastError)}. Return ONLY corrected JSON matching the requested structure, with no other text.`,
                },
            ];
        }
    }
    throw lastError instanceof Error ? lastError : new Error("AI returned invalid JSON");
}
