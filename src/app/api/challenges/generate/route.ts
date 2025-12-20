import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type CodingChallengeInsert = Database['public']['Tables']['coding_challenges']['Insert'];

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const { career, difficulty } = await request.json();

        if (!career) {
            return NextResponse.json({ error: "Career required" }, { status: 400 });
        }

        const prompt = `Generate a coding challenge for a "${career}" interview.
    Difficulty: ${difficulty || "Medium"}.
        
        Return strict JSON structure:
{
    "title": "Problem Title",
        "description": "MarkDown description of the problem...",
            "difficulty": "${difficulty || "medium"}",
                "category": "Topic (e.g. Arrays, API, Database)",
                    "starter_code": {
        "javascript": "// Write your solution here\\nfunction solve() {\\n\\n}",
            "python": "# Write your solution here\\ndef solve():\\n    pass"
    },
    "test_cases": [
        { "input": "...", "expected": "..." }
    ]
}
`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "{}";
        const challenge = JSON.parse(content);

        // Save to Supabase
        let savedChallenge;
        try {
            const supabase = await createClient();

            // Normalize difficulty to valid enum value
            const normalizedDifficulty = (
                challenge.difficulty?.toLowerCase() === "easy" ? "easy" :
                    challenge.difficulty?.toLowerCase() === "hard" ? "hard" : "medium"
            ) as "easy" | "medium" | "hard";

            // Create properly typed insert object
            const insertData: CodingChallengeInsert = {
                title: String(challenge.title || "Untitled Challenge"),
                description: String(challenge.description || ""),
                difficulty: normalizedDifficulty,
                category: String(challenge.category || "General"),
                starter_code: challenge.starter_code || null,
                test_cases: challenge.test_cases || [],
            };

            // Cast to any to bypass generic inference issues while keeping data type safety via insertData
            const { data, error } = await (supabase
                .from("coding_challenges") as any)
                .insert(insertData)
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

    } catch (error: any) {
        console.error("Challenge Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
