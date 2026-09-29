import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/structured";
import { acquireAiSlot, rateLimit, LIMITS } from "@/lib/ai/limits";
import { requestIdentifier, clientIp } from "@/lib/ai/identify";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const testSchema = z.object({
    mcqs: z.array(z.object({
        question: z.string().min(1),
        options: z.array(z.string()).min(2),
        correct_answer: z.string().min(1),
    })).min(1),
    fill_in_blanks: z.array(z.object({
        code_snippet: z.string().min(1),
        correct_answer: z.string().min(1),
    })).default([]),
    coding_questions: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        starter_code: z.record(z.string(), z.string()).optional(),
        test_cases: z.array(z.object({
            input: z.string(),
            expected: z.string(),
            is_hidden: z.boolean().optional(),
        })).optional(),
    })).default([]),
});

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
            { error: "The AI is busy right now - please retry in a few seconds." },
            { status: 503, headers: { "Retry-After": "10" } }
        );
    }

    try {
        const { difficulty, test_id } = await request.json();
        if (!test_id) {
            return NextResponse.json({ error: "test_id required" }, { status: 400 });
        }

        const prompt = `Generate a comprehensive technical test to evaluate a student's general programming ability (Data Structures, Algorithms, Core Logic).
Difficulty Level: ${difficulty || "Medium"}

The test must strictly contain:
1. 10 Multiple Choice Questions (MCQs) focusing on fundamental concepts.
2. 2 "Fill in the blank" code snippets.
3. 2 Coding Sandbox Questions (Q1: Easy algorithm, Q2: Medium/Hard algorithm).
   - For EACH coding question, provide exactly 3 'visible' test cases and exactly 10 'hidden' test cases (13 total test cases per question).
   - The 'starter_code' MUST ONLY contain the empty function signature. DO NOT include the actual solution or implementation logic. Use comments like '// YOUR CODE HERE'.

Return a JSON object with keys "mcqs", "fill_in_blanks", "coding_questions".`;

        const generatedTest = await generateStructured({
            schema: testSchema,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            maxTokens: 4096,
            jsonSchema: {
                type: "object",
                properties: {
                    mcqs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question: { type: "string" },
                                options: { type: "array", items: { type: "string" } },
                                correct_answer: { type: "string" },
                            },
                            required: ["question", "options", "correct_answer"],
                        },
                    },
                    fill_in_blanks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                code_snippet: { type: "string" },
                                correct_answer: { type: "string" },
                            },
                            required: ["code_snippet", "correct_answer"],
                        },
                    },
                    coding_questions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
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
                                        properties: {
                                            input: { type: "string" },
                                            expected: { type: "string" },
                                            is_hidden: { type: "boolean" },
                                        },
                                        required: ["input", "expected"],
                                    },
                                },
                            },
                            required: ["title", "description"],
                        },
                    },
                },
                required: ["mcqs"],
            },
        });

        const supabase = await createClient();

        // Map and insert MCQs
        const mcqInserts = generatedTest.mcqs.map((q) => ({
            test_id,
            type: 'mcq',
            content: { question: q.question, options: q.options },
            answer: { correct_answer: q.correct_answer }
        }));

        // Map and insert Fill in Blanks
        const fibInserts = generatedTest.fill_in_blanks.map((q) => ({
            test_id,
            type: 'fill_in_blank',
            content: { code_snippet: q.code_snippet },
            answer: { correct_answer: q.correct_answer }
        }));

        // Map and insert Coding Questions
        const codingInserts = generatedTest.coding_questions.map((q) => ({
            test_id,
            type: 'coding',
            content: { title: q.title, description: q.description, starter_code: q.starter_code },
            test_cases: q.test_cases || []
        }));

        const allQuestions = [...mcqInserts, ...fibInserts, ...codingInserts];

        if (allQuestions.length === 0) {
            return NextResponse.json({ error: "AI failed to generate any valid questions." }, { status: 502 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped insert payload
        const sb = supabase as any;
        const { error } = await sb.from("test_questions").insert(allQuestions);

        if (error) {
            console.error("DB Insert Error:", error);
            return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: allQuestions.length });

    } catch (error: unknown) {
        console.error("Test Gen Error:", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "Failed to generate the test - please try again." }, { status: 502 });
    } finally {
        slot.release();
    }
}
