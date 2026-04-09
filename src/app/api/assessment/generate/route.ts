// API Route: Generate AI-Powered Assessment Questions
// Generates personalized assessment questions based on user's target career

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

interface GeneratedQuestion {
    id: string;
    category: "career_knowledge" | "technical" | "aptitude" | "personality" | "situation";
    type: "multiple_choice";
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
}

interface AssessmentQuestionPayload {
    questions: GeneratedQuestion[];
}

const CAREER_SUBTOPICS: Record<string, string[]> = {
    "Data Scientist": ["Machine Learning", "Statistics", "Python/R", "Data Visualization", "Deep Learning", "NLP", "Big Data", "SQL", "A/B Testing", "Feature Engineering"],
    "Software Engineer": ["System Design", "Algorithms", "Data Structures", "OOP", "Databases", "APIs", "Git", "Testing", "Cloud Services", "Security"],
    "Frontend Developer": ["HTML/CSS", "JavaScript", "React/Vue/Angular", "Responsive Design", "Performance", "Accessibility", "State Management", "Build Tools", "TypeScript", "Testing"],
    "Backend Developer": ["APIs", "Databases", "Authentication", "Caching", "Microservices", "DevOps", "Security", "Message Queues", "Docker", "Load Balancing"],
    "Product Manager": ["Roadmapping", "User Research", "Metrics", "Agile/Scrum", "Stakeholder Management", "Prioritization", "A/B Testing", "Market Analysis", "PRDs", "Feature Specs"],
    default: ["Technical Skills", "Industry Knowledge", "Tools & Technologies", "Best Practices", "Problem Solving", "Communication", "Teamwork", "Project Management", "Leadership", "Innovation"],
};

const APTITUDE_TYPES = [
    "Number Series",
    "Pattern Recognition",
    "Logical Deduction",
    "Coding Output",
    "Algorithm Complexity",
    "Data Interpretation",
    "Verbal Reasoning",
    "Syllogisms",
    "Blood Relations",
    "Seating Arrangements",
];

function generateFallbackQuestions(career: string, questionCount: number): GeneratedQuestion[] {
    const total = Math.max(10, Math.min(30, questionCount));
    const careerCount = Math.ceil(total * 0.5);
    const aptitudeCount = Math.ceil(total * 0.3);
    const situationCount = total - careerCount - aptitudeCount;

    const makeQuestion = (
        id: string,
        category: GeneratedQuestion["category"],
        question: string,
        options: string[],
        correctAnswer: number,
        explanation: string,
        difficulty: GeneratedQuestion["difficulty"]
    ): GeneratedQuestion => ({
        id,
        category,
        type: "multiple_choice",
        question,
        options,
        correctAnswer,
        explanation,
        difficulty,
    });

    const questions: GeneratedQuestion[] = [];

    for (let i = 0; i < careerCount; i++) {
        questions.push(
            makeQuestion(
                `ck${i + 1}`,
                "career_knowledge",
                `For a ${career} role, which practice is most important when starting a new project?`,
                ["Understand requirements and define clear milestones", "Start coding without planning", "Avoid documentation until release", "Skip testing to move faster"],
                0,
                "Good planning and requirement clarity reduce risks and improve delivery quality.",
                i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard"
            )
        );
    }

    for (let i = 0; i < aptitudeCount; i++) {
        questions.push(
            makeQuestion(
                `ap${i + 1}`,
                "aptitude",
                "If a process takes 2 hours per task, how long for 4 tasks done sequentially?",
                ["8 hours", "4 hours", "6 hours", "2 hours"],
                0,
                "Sequential tasks add up linearly: 2 × 4 = 8.",
                i % 2 === 0 ? "easy" : "medium"
            )
        );
    }

    for (let i = 0; i < situationCount; i++) {
        questions.push(
            makeQuestion(
                `sq${i + 1}`,
                "situation",
                "A critical deadline is at risk due to unexpected bugs. What should you do first?",
                ["Communicate risk early and prioritize high-impact fixes", "Hide the issue and hope it resolves", "Delay all communication until the deadline", "Rewrite the whole system immediately"],
                0,
                "Early communication and risk-based prioritization is the best professional response.",
                "medium"
            )
        );
    }

    return questions.sort(() => Math.random() - 0.5);
}

function normalizeQuestions(rawQuestions: unknown, prefix: string): GeneratedQuestion[] {
    if (!Array.isArray(rawQuestions)) return [];

    return rawQuestions
        .map((question, index) => {
            if (!question || typeof question !== "object") return null;

            const candidate = question as Partial<GeneratedQuestion> & { options?: unknown; correctAnswer?: unknown };
            const options = Array.isArray(candidate.options)
                ? candidate.options.filter((option): option is string => typeof option === "string")
                : [];

            if (options.length === 0 || typeof candidate.question !== "string") return null;

            const normalizedCorrectAnswer = typeof candidate.correctAnswer === "number"
                ? candidate.correctAnswer
                : 0;

            return {
                id: candidate.id && typeof candidate.id === "string" ? candidate.id : `${prefix}${index + 1}`,
                category: candidate.category && ["career_knowledge", "technical", "aptitude", "personality", "situation"].includes(candidate.category)
                    ? candidate.category
                    : "career_knowledge",
                type: "multiple_choice",
                question: candidate.question,
                options,
                correctAnswer: normalizedCorrectAnswer,
                explanation: typeof candidate.explanation === "string" ? candidate.explanation : "",
                difficulty: candidate.difficulty && ["easy", "medium", "hard"].includes(candidate.difficulty)
                    ? candidate.difficulty
                    : "medium",
            } as GeneratedQuestion;
        })
        .filter((question): question is GeneratedQuestion => Boolean(question));
}

function cleanGroqResponse(content: string): string {
    return content.replace(/```json\n?|\n?```/g, "").trim();
}

async function callGroq(prompt: string, maxTokens: number, timeoutMs: number): Promise<string> {
    const response = await Promise.race([
        groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: "You are an expert interviewer and question writer. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Groq request timed out")), timeoutMs)),
    ]);

    return response.choices[0]?.message?.content || "{}";
}

function buildPrompt(career: string, counts: { career: number; aptitude: number; situation: number }, seed: number, label: string): string {
    const subtopics = CAREER_SUBTOPICS[career] || CAREER_SUBTOPICS.default;
    const shuffledSubtopics = [...subtopics].sort(() => Math.random() - 0.5).slice(0, 5).join(", ");
    const shuffledAptitude = [...APTITUDE_TYPES].sort(() => Math.random() - 0.5).slice(0, 4).join(", ");
    const situationScenarios = ["deadline pressure", "team conflict", "client escalation", "technical debt", "resource constraints", "stakeholder disagreement", "production bug", "scope creep", "knowledge transfer"]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join(", ");

    return `Generate a complete assessment question set for a "${career}" role.

You are generating ${counts.career + counts.aptitude + counts.situation} total multiple-choice questions in ONE JSON object.

Use these target counts:
- Career knowledge: ${counts.career}
- Aptitude/logical reasoning: ${counts.aptitude}
- Situational judgment: ${counts.situation}

Variation seed: ${seed} (${label})

Guidelines:
- Make questions diverse and non-repetitive.
- Use realistic workplace scenarios.
- Keep options 4 per question.
- correctAnswer MUST be a 0-based numeric index.
- Difficulty mix should be reasonable: easy, medium, hard.
- Return EXACTLY the requested counts if possible.

Focus topics for career knowledge: ${shuffledSubtopics}
Focus types for aptitude: ${shuffledAptitude}
Focus scenarios for situational questions: ${situationScenarios}

Return strictly this JSON shape:
{
  "questions": [
    {
      "id": "ck1",
      "category": "career_knowledge",
      "type": "multiple_choice",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "...",
      "difficulty": "easy"
    }
  ]
}

No markdown. No extra keys.`;
}

function hasEnoughQuestions(questions: GeneratedQuestion[], expectedCount: number): boolean {
    return questions.length >= expectedCount && questions.every((question) => question.options.length === 4);
}

async function generateQuestionSet(
    career: string,
    questionCount: number,
    seed: number,
    label: string,
    timeoutMs: number,
    maxTokens: number
): Promise<GeneratedQuestion[]> {
    const careerCount = Math.ceil(questionCount * 0.5);
    const aptitudeCount = Math.ceil(questionCount * 0.3);
    const situationCount = questionCount - careerCount - aptitudeCount;

    const prompt = buildPrompt(career, { career: careerCount, aptitude: aptitudeCount, situation: situationCount }, seed, label);
    const rawContent = await callGroq(prompt, maxTokens, timeoutMs);
    const cleaned = cleanGroqResponse(rawContent);

    try {
        const parsed = JSON.parse(cleaned) as AssessmentQuestionPayload;
        return normalizeQuestions(parsed.questions, `${label}-q`);
    } catch (error) {
        console.error(`Failed to parse ${label} questions:`, error);
        return [];
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { career, questionCount = 20 } = await request.json();

        if (!career) {
            return NextResponse.json({ error: "Career required" }, { status: 400 });
        }

        const normalizedCount = Math.max(10, Math.min(30, Number(questionCount) || 20));
        const randomSeed = Math.floor(Math.random() * 10000);

        // Primary path: one prompt for the whole assessment.
        const fullQuestions = await generateQuestionSet(career, normalizedCount, randomSeed, "full", 25000, 5000);

        let finalQuestions = fullQuestions;
        let usedFallback = false;

        // Fallback: smaller batches if the single prompt is incomplete or times out.
        if (!hasEnoughQuestions(fullQuestions, normalizedCount)) {
            usedFallback = true;
            const firstBatchCount = Math.ceil(normalizedCount / 2);
            const secondBatchCount = normalizedCount - firstBatchCount;

            const [firstBatch, secondBatch] = await Promise.all([
                generateQuestionSet(career, firstBatchCount, randomSeed + 1, "batch-a", 18000, 3200),
                generateQuestionSet(career, secondBatchCount, randomSeed + 2, "batch-b", 18000, 3200),
            ]);

            finalQuestions = [...firstBatch, ...secondBatch];
        }

        if (!hasEnoughQuestions(finalQuestions, 1)) {
            finalQuestions = generateFallbackQuestions(career, normalizedCount);
            usedFallback = true;
        }

        finalQuestions = finalQuestions.slice(0, normalizedCount).map((question, index) => ({
            ...question,
            id: `${question.category.slice(0, 2)}${index + 1}`,
        }));

        return NextResponse.json({
            success: true,
            career,
            totalQuestions: finalQuestions.length,
            questions: finalQuestions,
            categories: {
                career_knowledge: finalQuestions.filter((q) => q.category === "career_knowledge").length,
                aptitude: finalQuestions.filter((q) => q.category === "aptitude").length,
                situation: finalQuestions.filter((q) => q.category === "situation").length,
            },
            generatedAt: new Date().toISOString(),
            seed: randomSeed,
            fallbackUsed: usedFallback,
        });
    } catch (error: unknown) {
        console.error("Assessment generation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate assessment" },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch user's generated questions
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const career = url.searchParams.get("career");

        if (!career) {
            return NextResponse.json({ error: "Career parameter required" }, { status: 400 });
        }

        // Check if we have cached questions for this career
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cached } = await (supabase as any)
            .from("generated_assessments")
            .select("*")
            .eq("user_id", user.id)
            .eq("career", career)
            .single();

        if (cached?.questions) {
            return NextResponse.json({
                success: true,
                cached: true,
                questions: cached.questions,
            });
        }

        return NextResponse.json({
            success: false,
            message: "No cached questions found. Use POST to generate new questions.",
        });
    } catch (error) {
        console.error("Fetch assessment error:", error);
        return NextResponse.json(
            { error: "Failed to fetch assessment" },
            { status: 500 }
        );
    }
}
