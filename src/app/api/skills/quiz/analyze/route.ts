import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const { career, answers, questions } = await request.json(); // answers: { qId: answerString }

        if (!career || !answers || !questions) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        // Calculate score locally first
        let correctCount = 0;
        const total = questions.length;

        questions.forEach((q: any) => {
            if (answers[q.id] === q.correctAnswer) {
                correctCount++;
            }
        });

        const scorePercentage = Math.round((correctCount / total) * 100);

        // Generate AI Analysis & Roadmap
        const prompt = `Analyze these quiz results for a "${career}" candidate.
        Score: ${scorePercentage}% (${correctCount}/${total}).
        Questions & User Answers:
        ${questions.map((q: any) => `- Q: ${q.question}\n  User Answer: ${answers[q.id]}\n  Correct: ${q.correctAnswer}`).join("\n")}

        Provide a structured JSON response with:
        1. "gap_analysis": A summary of weak areas.
        2. "recommendations": 3-4 specific action items.
        3. "roadmap": A structured learning path with phases and resources.
        
        Format:
        {
            "gap_analysis": "detailed string",
            "recommendations": ["string"],
            "roadmap": {
                "totalDuration": "string (e.g. '3 months')",
                "phases": [
                    {
                        "name": "string (e.g. 'Phase 1: Foundations')",
                        "duration": "string",
                        "skills": ["string"],
                        "milestones": ["string"],
                        "resources": [
                            {
                                "title": "string",
                                "platform": "string",
                                "type": "course" | "video" | "documentation",
                                "url": "string (valid url)",
                                "cost": "free" | "paid",
                                "duration": "string"
                            }
                        ]
                    }
                ]
            }
        }`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "{}";
        let analysis: any = {};

        try {
            // Robust JSON extraction
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : content;
            analysis = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error for Analysis:", content);
            // Fallback with correct schema
            analysis = {
                gap_analysis: "We could not generate a detailed analysis at this moment. Please review your answers.",
                recommendations: ["Review the core concepts.", "Practice more problems.", "Check documentation."],
                roadmap: {
                    totalDuration: "4 weeks",
                    phases: [
                        {
                            name: "Phase 1: Review Basics",
                            duration: "1 week",
                            skills: ["Fundamentals"],
                            milestones: ["Complete basic review"],
                            resources: [
                                {
                                    title: "Official Documentation",
                                    platform: "Web",
                                    type: "documentation",
                                    url: "https://devdocs.io",
                                    cost: "free",
                                    duration: "ongoing"
                                }
                            ]
                        }
                    ]
                }
            };
        }

        // Ensure all fields exist
        const finalResult = {
            score: scorePercentage || 0,
            gap_analysis: analysis.gap_analysis || "No specific gap analysis provided.",
            recommendations: analysis.recommendations || [],
            roadmap: analysis.roadmap || { totalDuration: "N/A", phases: [] },
            metrics: analysis.metrics || {}
        };

        // Save to Supabase (with error handling to not block response)
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Save Skills Gap Analysis
                await (supabase.from("skills_gap_analysis") as any).insert({
                    user_id: user.id,
                    session_id: "current",
                    target_career: career,
                    readiness_score: finalResult.score,
                    gap_analysis: finalResult.gap_analysis,
                    // metrics column does not exist in DB
                    created_at: new Date().toISOString(),
                });
            }
        } catch (dbError) {
            console.error("Database Save Error:", dbError);
        }

        return NextResponse.json(finalResult);

    } catch (error: any) {
        console.error("Quiz analysis error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
