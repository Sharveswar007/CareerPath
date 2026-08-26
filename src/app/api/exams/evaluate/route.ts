import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const { session_id } = await request.json();

        if (!session_id) {
            return NextResponse.json({ error: "session_id required" }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Fetch Session and Test Info
        const { data: sessionData, error: sessionError } = await supabase
            .from("test_sessions")
            .select("test_id, student_id, tests(generation_type)")
            .eq("id", session_id)
            .single();

        if (sessionError || !sessionData) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const { test_id, student_id } = sessionData;

        // 2. Fetch all submissions for this session
        const { data: submissions, error: subError } = await supabase
            .from("test_submissions")
            .select(`
                id, score, is_correct, student_answer, code_submission, ai_evaluation,
                test_questions ( type, content, test_cases )
            `)
            .eq("session_id", session_id);

        if (subError || !submissions) {
            return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
        }

        // 3. Prepare data for Groq evaluation
        const mcqs = submissions.filter((s: any) => s.test_questions.type === 'mcq');
        const fibs = submissions.filter((s: any) => s.test_questions.type === 'fill_in_blank');
        const coding = submissions.filter((s: any) => s.test_questions.type === 'coding');

        const mcqScore = mcqs.filter((s: any) => s.is_correct).length;
        const totalMcqs = mcqs.length;

        // Simplify coding submissions for prompt
        const codingSummary = coding.map((s: any) => ({
            title: s.test_questions.content.title,
            student_code: s.code_submission,
            test_cases_passed: s.score || 0, // Assuming score holds the number of passed test cases
            total_test_cases: s.test_questions.test_cases?.length || 10
        }));

        const prompt = `You are an expert technical interviewer evaluating a student's test submission.
        
Based on the following data, categorize the student into exactly one of these categories: "no_code", "low_code", or "high_code".

Data:
- MCQs: ${mcqScore} out of ${totalMcqs} correct.
- Fill in Blanks: ${fibs.filter((s: any) => s.is_correct).length} out of ${fibs.length} correct.
- Coding Submissions: 
${JSON.stringify(codingSummary, null, 2)}

Categorization Guidelines:
- "no_code": Failed most MCQs. Could not write basic syntax for the coding questions or passed 0 test cases.
- "low_code": Passed many MCQs. Wrote some code and passed some basic/visible test cases, but failed hidden/complex edge cases. Code might be inefficient.
- "high_code": Passed almost all MCQs. Solved coding questions efficiently and passed almost all hidden test cases.

Return strict JSON:
{
    "coding_category": "no_code | low_code | high_code",
    "total_score_out_of_100": 85,
    "detailed_report": {
        "summary": "Brief summary of their performance...",
        "strengths": ["...", "..."],
        "weaknesses": ["...", "..."]
    }
}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "{}";
        const evaluation = JSON.parse(content);

        // 4. Save Results
        const { error: resultError } = await supabase
            .from("test_results")
            .upsert({
                test_id,
                student_id,
                total_score: evaluation.total_score_out_of_100,
                coding_category: evaluation.coding_category,
                detailed_report: evaluation.detailed_report
            });

        if (resultError) {
             console.error("DB Result Insert Error", resultError);
             return NextResponse.json({ error: resultError.message }, { status: 500 });
        }
        
        // Update session status
        await supabase.from("test_sessions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", session_id);

        return NextResponse.json(evaluation);

    } catch (error: any) {
        console.error("Evaluate Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
