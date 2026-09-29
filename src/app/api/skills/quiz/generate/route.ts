import { NextRequest, NextResponse } from "next/server";
import { generateStructured, unwrapArray } from "@/lib/ai/structured";
import { acquireAiSlot, rateLimit, LIMITS } from "@/lib/ai/limits";
import { requestIdentifier, clientIp } from "@/lib/ai/identify";
import { z } from "zod";

export const runtime = "nodejs";

const questionSchema = z.object({
    id: z.number().optional(),
    question: z.string().min(1),
    options: z.array(z.string()).min(2),
    correctAnswer: z.string().optional(),
    // some models emit snake_case despite instructions
    correct_answer: z.string().optional(),
});

const questionsSchema = z.object({
    questions: z.array(questionSchema).min(1),
});
// Models sometimes emit a bare array despite instructions - accept both shapes.
const tolerantSchema = z.preprocess(
    (v) => (Array.isArray(v) ? { questions: v } : v),
    questionsSchema
);

export async function POST(request: NextRequest) {
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
            { error: "The AI tutor is busy right now - please retry in a few seconds." },
            { status: 503, headers: { "Retry-After": "10" } }
        );
    }

    try {
        const { career } = await request.json();
        if (!career) {
            return NextResponse.json({ error: "Career is required" }, { status: 400 });
        }

        const prompt = `Generate 5 technical interview questions to assess a candidate for a "${career}" role.

Each item must have:
- "question": the question text
- "options": exactly 4 answer options
- "correctAnswer": one of the options verbatim

Cover key skills required for ${career} (e.g., for Software Engineer: specific languages, algorithms, system design).`;

        const parsed = await generateStructured({
            schema: tolerantSchema,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            maxTokens: 2048,
            jsonSchema: {
                type: "object",
                properties: {
                    questions: {
                        type: "array",
                        minItems: 5,
                        maxItems: 5,
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "integer" },
                                question: { type: "string" },
                                options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                                correctAnswer: { type: "string" },
                            },
                            required: ["question", "options", "correctAnswer"],
                        },
                    },
                },
                required: ["questions"],
            },
        });

        const questions = parsed.questions.map((q, i) => ({
            id: q.id ?? i + 1,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer ?? q.correct_answer ?? q.options[0],
        }));

        return NextResponse.json({ questions });
    } catch (error: unknown) {
        console.error(
            "Quiz generation error:",
            error instanceof Error ? error.message : error
        );
        return NextResponse.json(
            { error: "Failed to generate valid questions - please try again." },
            { status: 502 }
        );
    } finally {
        slot.release();
    }
}
