import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/structured";
import { acquireAiSlot, rateLimit, LIMITS } from "@/lib/ai/limits";
import { requestIdentifier, clientIp } from "@/lib/ai/identify";
import { newRequestId, logError } from "@/lib/obs/request-id";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { z } from "zod";

export const runtime = "nodejs";

type CodingChallengeInsert = Database['public']['Tables']['coding_challenges']['Insert'];

const challengeSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    difficulty: z.string().optional(),
    category: z.string().optional(),
    starter_code: z.record(z.string(), z.string()).optional(),
    test_cases: z.array(z.object({
        input: z.string().optional(),
        expected: z.string().optional(),
    })).optional(),
});

export async function POST(request: NextRequest) {
    const requestId = newRequestId();
    const identifier = await requestIdentifier(request).catch(() => `ip:${clientIp(request)}`);
    const rl = rateLimit(identifier, LIMITS.AI_PER_MINUTE);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: "Too many requests - please wait a moment and try again." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 30) } }
        );
    }

    const slot = acquireAiSlot();
    if (!slot.acquired) {
        return NextResponse.json(
            { error: "The AI is busy right now - please retry in a few seconds." },
            { status: 503, headers: { "Retry-After": "10" } }
        );
    }

    try {
        const { career, difficulty } = await request.json();
        if (!career) {
            return NextResponse.json({ error: "Career required" }, { status: 400 });
        }

        const prompt = `Generate a coding challenge for a "${career}" interview.
Difficulty: ${difficulty || "Medium"}.

Return a JSON object with:
- "title": Problem Title
- "description": Markdown description of the problem
- "difficulty": "${difficulty || "medium"}"
- "category": Topic (e.g. Arrays, API, Database)
- "starter_code": object with keys "python", "java", "c", "cpp" - each an empty skeleton with comments like "# Write your solution here" (no solutions)
- "test_cases": array of { "input": "...", "expected": "..." } (3-5 cases)`;

        const challenge = await generateStructured({
            schema: challengeSchema,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
            maxTokens: 2048,
            jsonSchema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    difficulty: { type: "string" },
                    category: { type: "string" },
                    starter_code: {
                        type: "object",
                        properties: {
                            python: { type: "string" },
                            java: { type: "string" },
                            c: { type: "string" },
                            cpp: { type: "string" },
                        },
                    },
                    test_cases: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: { input: { type: "string" }, expected: { type: "string" } },
                            required: ["input", "expected"],
                        },
                    },
                },
                required: ["title", "description"],
            },
        });

        // Save to Supabase
        let savedChallenge;
        try {
            const supabase = await createClient();

            const normalizedDifficulty = (
                challenge.difficulty?.toLowerCase() === "easy" ? "easy" :
                    challenge.difficulty?.toLowerCase() === "hard" ? "hard" : "medium"
            ) as "easy" | "medium" | "hard";

            const insertData: CodingChallengeInsert = {
                title: challenge.title,
                description: challenge.description,
                difficulty: normalizedDifficulty,
                category: challenge.category || "General",
                starter_code: challenge.starter_code || null,
                test_cases: challenge.test_cases || [],
            };

            // Loose typing at the Supabase boundary: insertData is built from
            // AI output, so we validate shape manually rather than fighting generics.
            const { data, error } = await supabase
                .from("coding_challenges")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI-generated payload, shape validated above
                .insert(insertData as any)
                .select()
                .single();

            if (error) {
                console.error("DB Insert Error", error);
                // We still return the challenge to the user even if save fails
            }
            savedChallenge = data;

        } catch (err) {
            console.error("Supabase Error", err);
        }

        return NextResponse.json(savedChallenge || challenge);

    } catch (error: unknown) {
        logError(requestId, "challenges.generate_failed", error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: "Failed to generate a valid challenge - please try again." },
            { status: 502 }
        );
    } finally {
        slot.release();
    }
}
