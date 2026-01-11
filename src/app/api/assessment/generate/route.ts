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

// Topics for variety in questions
const CAREER_SUBTOPICS: Record<string, string[]> = {
    "Data Scientist": ["Machine Learning", "Statistics", "Python/R", "Data Visualization", "Deep Learning", "NLP", "Big Data", "SQL", "A/B Testing", "Feature Engineering"],
    "Software Engineer": ["System Design", "Algorithms", "Data Structures", "OOP", "Databases", "APIs", "Git", "Testing", "Cloud Services", "Security"],
    "Frontend Developer": ["HTML/CSS", "JavaScript", "React/Vue/Angular", "Responsive Design", "Performance", "Accessibility", "State Management", "Build Tools", "TypeScript", "Testing"],
    "Backend Developer": ["APIs", "Databases", "Authentication", "Caching", "Microservices", "DevOps", "Security", "Message Queues", "Docker", "Load Balancing"],
    "Product Manager": ["Roadmapping", "User Research", "Metrics", "Agile/Scrum", "Stakeholder Management", "Prioritization", "A/B Testing", "Market Analysis", "PRDs", "Feature Specs"],
    "default": ["Technical Skills", "Industry Knowledge", "Tools & Technologies", "Best Practices", "Problem Solving", "Communication", "Teamwork", "Project Management", "Leadership", "Innovation"],
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

        // Get subtopics for this career
        const subtopics = CAREER_SUBTOPICS[career] || CAREER_SUBTOPICS["default"];

        // Randomly select subtopics for variety
        const shuffledSubtopics = [...subtopics].sort(() => Math.random() - 0.5);
        const selectedSubtopics = shuffledSubtopics.slice(0, 5).join(", ");

        // Randomly select aptitude types
        const shuffledAptitude = [...APTITUDE_TYPES].sort(() => Math.random() - 0.5);
        const selectedAptitude = shuffledAptitude.slice(0, 4).join(", ");

        // Generate a random seed for variety
        const randomSeed = Math.floor(Math.random() * 10000);

        // Generate questions in categories
        const careerQuestionsCount = Math.ceil(questionCount * 0.5);
        const aptitudeQuestionsCount = Math.ceil(questionCount * 0.3);
        const situationalCount = questionCount - careerQuestionsCount - aptitudeQuestionsCount;

        const allQuestions: GeneratedQuestion[] = [];

        // 1. Generate Career Knowledge Questions with VARIETY
        const careerPrompt = `Generate ${careerQuestionsCount} UNIQUE multiple-choice questions to assess knowledge for "${career}" role.

IMPORTANT: Make each question DIFFERENT and DIVERSE. Use random seed ${randomSeed} for variation.

Focus on these specific topics: ${selectedSubtopics}

Requirements:
- Each question MUST cover a DIFFERENT aspect/topic
- NO duplicate or similar questions
- Include REAL-WORLD scenarios from Indian companies (TCS, Infosys, Flipkart, Razorpay, etc.)
- Mix of conceptual, practical, and scenario-based questions
- 40% easy, 40% medium, 20% hard difficulty

CRITICAL: "correctAnswer" MUST be 0-BASED INDEX:
- 0 = First option (Option A)
- 1 = Second option (Option B)  
- 2 = Third option (Option C)
- 3 = Fourth option (Option D)

Return a JSON array:
[
    {
        "id": "ck1",
        "category": "career_knowledge",
        "type": "multiple_choice",
        "question": "Unique question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct",
        "difficulty": "easy|medium|hard"
    }
]

Return ONLY valid JSON array. No markdown.`;

        // Helper function for delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Helper function to call Groq with retry on rate limit
        const callGroqWithRetry = async (
            messages: Array<{ role: "system" | "user"; content: string }>,
            maxTokens: number,
            maxRetries: number = 3
        ): Promise<string> => {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const response = await groq.chat.completions.create({
                        model: "llama-3.1-8b-instant",
                        messages,
                        temperature: 0.9,
                        max_tokens: maxTokens,
                    });
                    return response.choices[0]?.message?.content || "[]";
                } catch (error: unknown) {
                    const err = error as { status?: number; message?: string };
                    if (err.status === 429 && attempt < maxRetries - 1) {
                        console.log(`Rate limit hit, waiting 3s before retry ${attempt + 2}...`);
                        await delay(3000);
                    } else {
                        throw error;
                    }
                }
            }
            return "[]";
        };

        // 1. Generate Career Knowledge Questions
        const careerContent = await callGroqWithRetry(
            [
                {
                    role: "system",
                    content: "You are an expert interviewer. Generate UNIQUE, DIVERSE questions. Never repeat similar questions. Each question must test a different concept.",
                },
                {
                    role: "user",
                    content: careerPrompt,
                },
            ],
            4000
        );

        try {
            let cleanCareerContent = careerContent.replace(/```json\n?|\n?```/g, "").trim();
            const careerMatch = cleanCareerContent.match(/\[[\s\S]*\]/);
            if (careerMatch) cleanCareerContent = careerMatch[0];
            const careerQuestions = JSON.parse(cleanCareerContent);
            if (Array.isArray(careerQuestions)) allQuestions.push(...careerQuestions);
        } catch (e) {
            console.error("Failed to parse career questions:", e);
        }

        // Wait before next API call to avoid rate limits
        await delay(3000);

        // 2. Generate Aptitude/Logic Questions with VARIETY
        const aptitudePrompt = `Generate ${aptitudeQuestionsCount} UNIQUE logical reasoning questions for "${career}" role.

IMPORTANT: Each question must be COMPLETELY DIFFERENT. Use random seed ${randomSeed + 1} for variation.

Focus on these types: ${selectedAptitude}

Requirements:
- Each question tests a DIFFERENT type of reasoning
- NO repeated patterns or similar number series
- Include code output questions if technical role
- Mix of numerical, logical, and analytical questions

CRITICAL: "correctAnswer" MUST be 0-BASED INDEX:
- 0 = First option (Option A)
- 1 = Second option (Option B)  
- 2 = Third option (Option C)
- 3 = Fourth option (Option D)

Return a JSON array:
[
    {
        "id": "ap1",
        "category": "aptitude",
        "type": "multiple_choice",
        "question": "Unique aptitude question?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Step-by-step solution",
        "difficulty": "easy|medium|hard"
    }
]

Return ONLY valid JSON array. No markdown.`;

        // 2. Generate Aptitude Questions with retry
        const aptContent = await callGroqWithRetry(
            [
                {
                    role: "system",
                    content: "You are an aptitude test expert. Generate UNIQUE questions with different patterns each time. Never repeat number series or logical puzzles.",
                },
                {
                    role: "user",
                    content: aptitudePrompt,
                },
            ],
            3000
        );

        try {
            let cleanAptContent = aptContent.replace(/```json\n?|\n?```/g, "").trim();
            const aptMatch = cleanAptContent.match(/\[[\s\S]*\]/);
            if (aptMatch) cleanAptContent = aptMatch[0];
            const aptQuestions = JSON.parse(cleanAptContent);
            if (Array.isArray(aptQuestions)) {
                aptQuestions.forEach((q: GeneratedQuestion, i: number) => {
                    q.id = `ap${i + 1}`;
                });
                allQuestions.push(...aptQuestions);
            }
        } catch (e) {
            console.error("Failed to parse aptitude questions:", e);
        }

        // 3. Generate Situational Questions with VARIETY
        const situationScenarios = [
            "deadline pressure", "team conflict", "client escalation",
            "technical debt", "resource constraints", "stakeholder disagreement",
            "production bug", "scope creep", "knowledge transfer"
        ];
        const randomScenarios = [...situationScenarios].sort(() => Math.random() - 0.5).slice(0, 3).join(", ");

        const situationalPrompt = `Generate ${situationalCount} UNIQUE situational judgment questions for "${career}" role.

IMPORTANT: Each scenario must be COMPLETELY DIFFERENT. Use random seed ${randomSeed + 2}.

Focus on scenarios involving: ${randomScenarios}

Requirements:
- Each question presents a UNIQUE workplace challenge
- Scenarios should be realistic for Indian tech companies
- Include dilemmas with no obvious right answer
- Test judgment, not technical knowledge

CRITICAL: "correctAnswer" MUST be 0-BASED INDEX:
- 0 = First option (Response A)
- 1 = Second option (Response B)  
- 2 = Third option (Response C)
- 3 = Fourth option (Response D)

Return a JSON array:
[
    {
        "id": "sq1",
        "category": "situation",
        "type": "multiple_choice",
        "question": "Scenario: [unique situation]. What would you do?",
        "options": ["Response A", "Response B", "Response C", "Response D"],
        "correctAnswer": 0,
        "explanation": "Why this approach is best",
        "difficulty": "medium"
    }
]

Return ONLY valid JSON array. No markdown.`;

        // Wait before next API call to avoid rate limits
        await delay(3000);

        // 3. Generate Situational Questions with retry
        const sitContent = await callGroqWithRetry(
            [
                {
                    role: "system",
                    content: "You are a workplace psychologist. Generate UNIQUE scenarios that test different soft skills each time.",
                },
                {
                    role: "user",
                    content: situationalPrompt,
                },
            ],
            2000
        );

        try {
            let cleanSitContent = sitContent.replace(/```json\n?|\n?```/g, "").trim();
            const sitMatch = cleanSitContent.match(/\[[\s\S]*\]/);
            if (sitMatch) cleanSitContent = sitMatch[0];
            const sitQuestions = JSON.parse(cleanSitContent);
            if (Array.isArray(sitQuestions)) {
                sitQuestions.forEach((q: GeneratedQuestion, i: number) => {
                    q.id = `sq${i + 1}`;
                });
                allQuestions.push(...sitQuestions);
            }
        } catch (e) {
            console.error("Failed to parse situational questions:", e);
        }

        // Shuffle all questions for variety in order
        const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);

        return NextResponse.json({
            success: true,
            career,
            totalQuestions: shuffledQuestions.length,
            questions: shuffledQuestions,
            categories: {
                career_knowledge: shuffledQuestions.filter(q => q.category === "career_knowledge").length,
                aptitude: shuffledQuestions.filter(q => q.category === "aptitude").length,
                situation: shuffledQuestions.filter(q => q.category === "situation").length,
            },
            generatedAt: new Date().toISOString(),
            seed: randomSeed,
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
