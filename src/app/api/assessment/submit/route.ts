// Assessment Submission API - Stores results and triggers skill gap analysis

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { getTopResources, LearningResource } from "@/lib/resources";
import { searchLearningResources } from "@/lib/tavily/client";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const {
            career,
            careerQuestions,
            logicQuestions,
            careerScore,
            logicScore,
            totalScore,
        } = await request.json();

        if (!career || !careerQuestions || !logicQuestions) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assessment, error: assessmentError } = await (supabase as any)
            .from("user_assessments")
            .insert({
                user_id: user.id,
                selected_career: career,
                career_questions: careerQuestions,
                logic_questions: logicQuestions,
                career_score: careerScore,
                logic_score: logicScore,
                total_score: totalScore,
            })
            .select()
            .single();

        if (assessmentError) {
            console.error("Assessment insert error:", assessmentError);
            return NextResponse.json(
                { error: "Failed to save assessment" },
                { status: 500 }
            );
        }

        const analysisPrompt = `You are an expert career counselor analyzing assessment results for someone targeting a career as a "${career}".

Assessment Results:
- Career Knowledge Score: ${careerScore}/10
- Logic & Aptitude Score: ${logicScore}/10
- Total Score: ${totalScore}/20

Incorrect Career Questions:
${careerQuestions
                .filter((q: { isCorrect: boolean }) => !q.isCorrect)
                .map((q: { question: string }) => `- ${q.question}`)
                .join("\n")}

Incorrect Logic Questions:
${logicQuestions
                .filter((q: { isCorrect: boolean }) => !q.isCorrect)
                .map((q: { question: string }) => `- ${q.question}`)
                .join("\n")}

Generate a comprehensive skill gap analysis. For the roadmap phases, suggest specific skills to learn but DO NOT include resources - I will add those separately.

Return JSON format:
{
  "readinessScore": <number 0-100>,
  "gapAnalysis": "<detailed paragraph about skill gaps>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "roadmap": {
    "totalDuration": "<e.g., 6 months>",
    "phases": [
      {
        "name": "<phase name>",
        "duration": "<e.g., 2 months>",
        "skills": ["<specific skill 1>", "<specific skill 2>"],
        "milestones": ["<milestone 1>", "<milestone 2>"]
      }
    ]
  },
  "recommendedChallenges": ["<DSA topic 1>", "<DSA topic 2>", ...],
  "immediateActions": ["<action 1>", "<action 2>", "<action 3>"]
}

Return ONLY valid JSON, no markdown.`;

        const analysisResponse = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert career counselor. Return only valid JSON, no markdown.",
                },
                {
                    role: "user",
                    content: analysisPrompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 3000,
        });

        const analysisContent = analysisResponse.choices[0]?.message?.content || "{}";
        let analysis;

        try {
            const cleanContent = analysisContent.replace(/```json\n?|\n?```/g, "").trim();
            analysis = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error("Failed to parse analysis:", parseError);
            analysis = generateFallbackAnalysis(career, careerScore, logicScore, totalScore);
        }

        // Enrich roadmap phases with dynamic resources (Tavily + fallback to curated)
        if (analysis.roadmap?.phases) {
            const enrichedPhases = await Promise.all(
                analysis.roadmap.phases.map(async (phase: { skills?: string[]; name?: string }) => {
                    // Try to get dynamic resources from Tavily first
                    let dynamicResources: Array<{ title: string; url: string; type: string; provider: string; cost: string }> = [];

                    // Search based on phase name
                    if (phase.name) {
                        dynamicResources = await searchLearningResources(phase.name, career);
                    }

                    // If no dynamic resources or not enough, add from first skill
                    if (dynamicResources.length < 2 && phase.skills && phase.skills.length > 0) {
                        const skillResources = await searchLearningResources(phase.skills[0], career);
                        skillResources.forEach(r => {
                            if (!dynamicResources.find(dr => dr.url === r.url)) {
                                dynamicResources.push(r);
                            }
                        });
                    }

                    // Fallback to curated resources if dynamic search fails
                    if (dynamicResources.length === 0) {
                        const phaseResources: LearningResource[] = [];

                        if (phase.skills) {
                            phase.skills.forEach((skill: string) => {
                                const topRes = getTopResources(skill, 1);
                                topRes.forEach(r => {
                                    if (!phaseResources.find(pr => pr.url === r.url)) {
                                        phaseResources.push(r);
                                    }
                                });
                            });
                        }

                        if (phase.name) {
                            const nameRes = getTopResources(phase.name, 2);
                            nameRes.forEach(r => {
                                if (!phaseResources.find(pr => pr.url === r.url)) {
                                    phaseResources.push(r);
                                }
                            });
                        }

                        return {
                            ...phase,
                            resources: phaseResources.slice(0, 3).map(r => ({
                                title: r.title,
                                type: r.type,
                                url: r.url,
                                cost: r.cost,
                                provider: r.provider,
                            })),
                        };
                    }

                    // Use dynamic resources
                    return {
                        ...phase,
                        resources: dynamicResources.slice(0, 3),
                    };
                })
            );

            analysis.roadmap.phases = enrichedPhases;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: gapError } = await (supabase as any)
            .from("skills_gap_analysis")
            .insert({
                user_id: user.id,
                assessment_id: assessment.id,
                target_career: career,
                readiness_score: analysis.readinessScore,
                gap_analysis: analysis.gapAnalysis,
                strengths: analysis.strengths,
                weaknesses: analysis.weaknesses,
                roadmap: analysis.roadmap,
            });

        if (gapError) {
            console.error("Gap analysis insert error:", gapError);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: profileError } = await (supabase as any)
            .from("profiles")
            .update({ onboarding_complete: true })
            .eq("id", user.id);

        if (profileError) {
            console.error("Profile update error:", profileError);
        }

        return NextResponse.json({
            success: true,
            assessmentId: assessment.id,
            scores: {
                career: careerScore,
                logic: logicScore,
                total: totalScore,
            },
            analysis,
        });
    } catch (error) {
        console.error("Assessment submission error:", error);
        return NextResponse.json(
            { error: "Failed to process assessment" },
            { status: 500 }
        );
    }
}

function generateFallbackAnalysis(
    career: string,
    careerScore: number,
    logicScore: number,
    totalScore: number
) {
    const percentage = (totalScore / 20) * 100;

    // Get curated resources for fallback
    const fundamentalResources = getTopResources("programming fundamentals", 2);
    const dsaResources = getTopResources("data structures algorithms", 2);
    const interviewResources = getTopResources("interview preparation", 2);

    return {
        readinessScore: Math.round(percentage),
        gapAnalysis: `Based on your assessment for ${career}, you scored ${totalScore}/20. ${percentage >= 70
            ? "You have a solid foundation and are well-prepared for this career path."
            : percentage >= 50
                ? "You have a good start but need to strengthen some areas to be job-ready."
                : "You need significant improvement in both technical knowledge and logical reasoning to pursue this career."
            }`,
        strengths: percentage >= 50
            ? ["Foundational knowledge present", "Good problem-solving approach"]
            : ["Willingness to learn", "Interest in the field"],
        weaknesses: percentage < 70
            ? ["Technical concepts need reinforcement", "Logical reasoning skills need practice"]
            : ["Advanced topics need exploration"],
        roadmap: {
            totalDuration: percentage >= 70 ? "3 months" : percentage >= 50 ? "6 months" : "9 months",
            phases: [
                {
                    name: "Foundation Building",
                    duration: "1-2 months",
                    skills: ["Programming fundamentals", "Basic tools"],
                    milestones: ["Complete fundamentals course", "Build first project"],
                    resources: fundamentalResources.map(r => ({
                        title: r.title,
                        type: r.type,
                        url: r.url,
                        cost: r.cost,
                        provider: r.provider,
                    })),
                },
                {
                    name: "Data Structures & Algorithms",
                    duration: "2-3 months",
                    skills: ["Data structures", "Algorithms", "Problem solving"],
                    milestones: ["Complete DSA course", "Solve 100+ problems"],
                    resources: dsaResources.map(r => ({
                        title: r.title,
                        type: r.type,
                        url: r.url,
                        cost: r.cost,
                        provider: r.provider,
                    })),
                },
                {
                    name: "Interview Preparation",
                    duration: "1-2 months",
                    skills: ["DSA revision", "System Design basics", "Mock interviews"],
                    milestones: ["Complete NeetCode 150", "5+ mock interviews"],
                    resources: interviewResources.map(r => ({
                        title: r.title,
                        type: r.type,
                        url: r.url,
                        cost: r.cost,
                        provider: r.provider,
                    })),
                },
            ],
        },
        recommendedChallenges: ["Arrays", "Strings", "Linked Lists", "Trees", "Dynamic Programming"],
        immediateActions: [
            "Start with CS50 or freeCodeCamp",
            "Practice on LeetCode daily",
            "Join coding communities on Discord",
        ],
    };
}
