import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { executeCodeViaBackend } from "@/lib/backends/execution-service";
import { wrapPythonCode, wrapJavaScriptCode, normalizeLanguage } from "@/lib/execution/executor";

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
        const sb = supabase as any;
        const { data: sessionData, error: sessionError } = await sb.from("test_sessions").select("test_id, student_id, tests(generation_type)").eq("id", session_id).single();

        if (sessionError || !sessionData) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const { test_id, student_id } = sessionData;

        // 2. Fetch all submissions for this session
        const { data: submissions, error: subError } = await sb.from("test_submissions").select(`
                id, score, is_correct, student_answer, code_submission, ai_evaluation,
                test_questions ( type, content, test_cases, answer )
            `).eq("session_id", session_id);

        if (subError || !submissions) {
            return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
        }

        const mcqs = submissions.filter((s: any) => s.test_questions.type === 'mcq');
        const fibs = submissions.filter((s: any) => s.test_questions.type === 'fill_in_blank');
        const coding = submissions.filter((s: any) => s.test_questions.type === 'coding');

        // Re-evaluate MCQs and FIBs securely on the backend
        for (const sub of mcqs.concat(fibs)) {
            const correctAnswer = sub.test_questions.answer?.correct_answer;
            const studentAns = sub.student_answer;
            let isCorrect = false;
            
            if (correctAnswer !== undefined && studentAns !== undefined) {
                if (sub.test_questions.type === 'mcq') {
                    isCorrect = String(studentAns).trim() === String(correctAnswer).trim();
                } else if (sub.test_questions.type === 'fill_in_blank') {
                    isCorrect = String(studentAns).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
                }
            }
            
            sub.is_correct = isCorrect;
            sub.score = isCorrect ? 1 : 0;
            await sb.from("test_submissions").update({ is_correct: isCorrect, score: sub.score }).eq("id", sub.id);
        }

        // Execute coding questions securely against test cases
        for (const sub of coding) {
            const codeSub = sub.code_submission as any;
            if (!codeSub || !codeSub.code) {
                sub.score = 0;
                continue;
            }
            
            const studentCode = codeSub.code;
            const lang = normalizeLanguage(codeSub.language || 'javascript');
            const testCases = sub.test_questions.test_cases || [];
            
            let passed = 0;
            
            for (const tc of testCases) {
                let wrappedCode = studentCode;
                if (lang === 'python') wrappedCode = wrapPythonCode(studentCode, tc.input);
                if (lang === 'javascript') wrappedCode = wrapJavaScriptCode(studentCode, tc.input);
                
                const result = await executeCodeViaBackend(wrappedCode, lang, tc.input);
                if (result.success && String(result.output).trim() === String(tc.expected).trim()) {
                    passed++;
                }
            }
            
            sub.score = passed; 
            // We don't update DB here yet because AI might adjust the score
        }

        const totalMcqs = mcqs.length;
        const mcqScore = mcqs.filter((s: any) => s.is_correct).length;
        
        const totalFibs = fibs.length;
        const fibScore = fibs.filter((s: any) => s.is_correct).length;
        
        const codingSummary = coding.map((s: any) => ({
            id: s.id,
            title: s.test_questions.content.title,
            student_code: s.code_submission?.code || "",
            test_cases_passed: s.score || 0,
            total_test_cases: s.test_questions.test_cases?.length || 10
        }));

        const prompt = `You are an expert technical interviewer evaluating a student's test submission.
        
Data:
- MCQs: ${mcqScore} out of ${totalMcqs} correct.
- Fill in Blanks: ${fibScore} out of ${totalFibs} correct.
- Coding Submissions: 
${JSON.stringify(codingSummary, null, 2)}

Tasks:
1. Categorize the student into EXACTLY ONE of these categories: "no_code", "low_code", or "high_code".
   - "no_code": Failed most MCQs, no basic syntax for coding.
   - "low_code": Passed many MCQs, wrote some code, passed basic cases but failed complex ones.
   - "high_code": Passed almost all MCQs, solved coding questions efficiently.
2. For EACH coding submission, evaluate the student's code and assign a partial correctness percentage (0 to 100).
   - If they passed all test cases, assign 100.
   - If they failed test cases, analyze their logic, syntax, and approach to determine a fair partial score %.

Return strict JSON:
{
    "coding_category": "no_code | low_code | high_code",
    "coding_partial_scores": {
        "submission_id_here": 85
    },
    "detailed_report": {
        "summary": "Brief summary...",
        "strengths": ["...", "..."],
        "weaknesses": ["...", "..."]
    }
}`;

        const completion = await groq.chat.completions.create({
            model: "groq/compound-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" },
        });

        let content = completion.choices[0]?.message?.content || "{}";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            content = jsonMatch[0];
        } else {
            content = "{}";
        }
        
        const evaluation = JSON.parse(content);
        
        // Apply AI partial scores to coding questions
        let totalCodingTestCases = 0;
        let codingPassed = 0;
        
        for (const sub of coding) {
             const tcs = sub.test_questions.test_cases || [];
             totalCodingTestCases += tcs.length;
             
             let aiPercentage = evaluation.coding_partial_scores?.[sub.id];
             
             // If AI didn't provide a score or it passed all cases natively, use native score
             if (aiPercentage === undefined || sub.score === tcs.length) {
                 codingPassed += (sub.score || 0);
             } else {
                 // Use AI partial percentage to calculate equivalent test cases passed
                 const adjustedScore = Math.round((aiPercentage / 100) * tcs.length);
                 sub.score = adjustedScore;
                 codingPassed += adjustedScore;
             }
             
             await sb.from("test_submissions").update({ 
                 score: sub.score, 
                 ai_evaluation: { partial_percentage: aiPercentage, original_passed: sub.score }
             }).eq("id", sub.id);
        }
        
        const maxScore = totalMcqs + totalFibs + totalCodingTestCases;
        const totalScoreObtained = mcqScore + fibScore + codingPassed;
        const calculatedPercentage = maxScore > 0 ? Math.round((totalScoreObtained / maxScore) * 100) : 0;

        evaluation.total_score_out_of_100 = calculatedPercentage;

        // 4. Save Results
        const { error: resultError } = await sb.from("test_results").upsert({
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
        await sb.from("test_sessions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", session_id);

        return NextResponse.json(evaluation);

    } catch (error: any) {
        console.error("Evaluate Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
