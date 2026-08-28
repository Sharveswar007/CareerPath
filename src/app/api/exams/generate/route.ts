import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const { difficulty, test_id } = await request.json();

        if (!test_id) {
            return NextResponse.json({ error: "test_id required" }, { status: 400 });
        }

        const prompt = `Generate a comprehensive technical test to evaluate a student's general programming ability (Data Structures, Algorithms, Core Logic) and categorize them as "No Code", "Low Code", or "High Code".
Difficulty Level: ${difficulty || "Medium"}

The test must strictly contain:
1. 10 Multiple Choice Questions (MCQs) focusing on fundamental concepts.
2. 2 "Fill in the blank" code snippets.
3. 2 Coding Sandbox Questions (Q1: Easy algorithm, Q2: Medium/Hard algorithm).
   - For EACH coding question, provide exactly 3 'visible' test cases and exactly 10 'hidden' test cases (13 total test cases per question).
   - The 'starter_code' MUST ONLY contain the empty function signature. DO NOT include the actual solution or implementation logic. Use comments like '// YOUR CODE HERE'.

Return strict JSON structure:
{
    "mcqs": [
        {
            "question": "...",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A"
        }
    ],
    "fill_in_blanks": [
        {
            "code_snippet": "function add(a, b) { return ___ ; }",
            "correct_answer": "a + b"
        }
    ],
    "coding_questions": [
        {
            "title": "Problem Title",
            "description": "Markdown description...",
            "starter_code": {
                "python": "def solve(args):\n    # YOUR CODE HERE\n    pass",
                "java": "class Solution {\n    public static void solve() {\n        // YOUR CODE HERE\n    }\n}",
                "c": "#include <stdio.h>\n\nvoid solve() {\n    // YOUR CODE HERE\n}",
                "cpp": "#include <iostream>\n\nvoid solve() {\n    // YOUR CODE HERE\n}"
            },
            "test_cases": [
                { "input": "[1, 2]", "expected": "3", "is_hidden": false },
                { "input": "[10, -2]", "expected": "8", "is_hidden": true }
            ]
        }
    ]
}
`;

        const completion = await groq.chat.completions.create({
            model: "groq/compound-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        let content = completion.choices[0]?.message?.content || "{}";
        
        // Robust JSON extraction to ignore any preamble/postamble text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            content = jsonMatch[0];
        } else {
            content = "{}";
        }
        
        let generatedTest;
        try {
            generatedTest = JSON.parse(content);
        } catch (parseError) {
            console.error("JSON Parse Error. Content:", content);
            return NextResponse.json({ error: "Failed to parse AI output. Please try again." }, { status: 500 });
        }

        const supabase = await createClient();

        // Map and insert MCQs
        const mcqInserts = (generatedTest.mcqs || []).map((q: any) => ({
            test_id,
            type: 'mcq',
            content: { question: q.question, options: q.options },
            answer: { correct_answer: q.correct_answer }
        }));

        // Map and insert Fill in Blanks
        const fibInserts = (generatedTest.fill_in_blanks || []).map((q: any) => ({
            test_id,
            type: 'fill_in_blank',
            content: { code_snippet: q.code_snippet },
            answer: { correct_answer: q.correct_answer }
        }));

        // Map and insert Coding Questions
        const codingInserts = (generatedTest.coding_questions || []).map((q: any) => ({
            test_id,
            type: 'coding',
            content: { title: q.title, description: q.description, starter_code: q.starter_code },
            test_cases: q.test_cases || []
        }));

        const allQuestions = [...mcqInserts, ...fibInserts, ...codingInserts];

        if (allQuestions.length === 0) {
            return NextResponse.json({ error: "AI failed to generate any valid questions." }, { status: 500 });
        }

        const sb = supabase as any;
        const { error } = await sb.from("test_questions").insert(allQuestions);

        if (error) {
            console.error("DB Insert Error:", error);
            return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: allQuestions.length });

    } catch (error: any) {
        console.error("Test Gen Error:", error);
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}
