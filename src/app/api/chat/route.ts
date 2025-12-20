// Chat API Route - Personalized AI responses with user context from database

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ChatMessageSchema } from "@/types/api";
import { createClient } from "@/lib/supabase/server";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

interface UserContext {
    name?: string;
    email?: string;
    career?: string;
    education?: string;
    location?: string;
    readinessScore?: number;
    strengths?: string[];
    weaknesses?: string[];
    recentAssessmentScore?: number;
    challengesSolved?: number;
    streakDays?: number;
}

async function getUserContext(userId: string): Promise<UserContext> {
    const supabase = await createClient();
    const context: UserContext = {};

    try {
        // Get user profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, education_level, location")
            .eq("id", userId)
            .single();

        if (profile) {
            context.name = profile.full_name;
            context.education = profile.education_level;
            context.location = profile.location;
        }

        // Get selected career
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: careerData } = await (supabase as any)
            .from("career_selections")
            .select("career_name")
            .eq("user_id", userId)
            .order("selected_at", { ascending: false })
            .limit(1)
            .single();

        if (careerData) {
            context.career = careerData.career_name;
        }

        // Get latest skill gap analysis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: skillsData } = await (supabase as any)
            .from("skills_gap_analysis")
            .select("readiness_score, strengths, weaknesses")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (skillsData) {
            context.readinessScore = skillsData.readiness_score;
            context.strengths = skillsData.strengths;
            context.weaknesses = skillsData.weaknesses;
        }

        // Get latest assessment score
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assessmentData } = await (supabase as any)
            .from("user_assessments")
            .select("total_score")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (assessmentData) {
            context.recentAssessmentScore = assessmentData.total_score;
        }

        // Get solved challenges count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: solvedCount } = await (supabase as any)
            .from("coding_submissions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "passed");

        context.challengesSolved = solvedCount || 0;

        // Get streak
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: activityData } = await (supabase as any)
            .from("user_activity")
            .select("streak_count")
            .eq("user_id", userId)
            .order("activity_date", { ascending: false })
            .limit(1)
            .single();

        if (activityData) {
            context.streakDays = activityData.streak_count;
        }

    } catch (error) {
        console.error("Error fetching user context:", error);
    }

    return context;
}

function buildSystemPrompt(userContext: UserContext): string {
    let prompt = `You are CareerGuide AI, an expert career counselor specializing in guidance for Indian students and professionals. You provide thoughtful, personalized career advice.`;

    // Add personalized context if available
    if (Object.keys(userContext).length > 0) {
        prompt += `\n\n--- USER CONTEXT (Use this to personalize your responses) ---`;

        if (userContext.name) {
            prompt += `\n- User's Name: ${userContext.name}`;
        }
        if (userContext.career) {
            prompt += `\n- Target Career: ${userContext.career}`;
        }
        if (userContext.education) {
            prompt += `\n- Education Level: ${userContext.education}`;
        }
        if (userContext.location) {
            prompt += `\n- Location: ${userContext.location}`;
        }
        if (userContext.readinessScore !== undefined) {
            prompt += `\n- Career Readiness Score: ${userContext.readinessScore}%`;
        }
        if (userContext.strengths && userContext.strengths.length > 0) {
            prompt += `\n- User's Strengths: ${userContext.strengths.join(", ")}`;
        }
        if (userContext.weaknesses && userContext.weaknesses.length > 0) {
            prompt += `\n- Areas to Improve: ${userContext.weaknesses.join(", ")}`;
        }
        if (userContext.recentAssessmentScore !== undefined) {
            prompt += `\n- Recent Assessment Score: ${userContext.recentAssessmentScore}/20`;
        }
        if (userContext.challengesSolved !== undefined && userContext.challengesSolved > 0) {
            prompt += `\n- Coding Challenges Solved: ${userContext.challengesSolved}`;
        }
        if (userContext.streakDays !== undefined && userContext.streakDays > 0) {
            prompt += `\n- Current Learning Streak: ${userContext.streakDays} days`;
        }

        prompt += `\n--- END USER CONTEXT ---\n`;
    }

    prompt += `
Your areas of expertise include:
- Career options across technical and non-technical fields
- Indian education system: Streams (Science, Commerce, Arts), Boards (CBSE, ICSE, State)
- Entrance exams: JEE, NEET, CAT, GATE, UPSC, CLAT, NID, NIFT, NDA, and others
- Top colleges and universities in India and abroad (IITs, NITs, IIMs, AIIMS, etc.)
- Salary expectations and career growth paths in the Indian job market
- Required skills and qualifications for various careers
- Current job market trends and emerging fields
- Skills development and learning resources

Communication guidelines:
- Use the user's name if available to make responses personal
- Reference their target career when giving advice
- Consider their strengths and weaknesses when suggesting learning paths
- Be empathetic and encouraging while being realistic about challenges
- Provide specific, actionable advice with examples
- Include relevant statistics and data when available
- Consider the Indian context for salary, education, and career paths
- Use clear, professional language
- Format responses with proper markdown for readability

Do not:
- Make up statistics or data that you are not confident about
- Recommend illegal or unethical career paths
- Dismiss the user's concerns or aspirations
- Provide overly generic advice that could apply to anyone
- Answer questions unrelated to careers, education, skills, or professional development. If a user asks about general topics, politely redirect them to career-related topics.`;

    return prompt;
}

export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            console.error("GROQ_API_KEY is not configured");
            return new Response(
                JSON.stringify({ error: "GROQ_API_KEY not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Get user context from database if authenticated
        let userContext: UserContext = {};
        if (user) {
            userContext = await getUserContext(user.id);
            userContext.email = user.email;
        }

        const body = await request.json();

        const parseResult = ChatMessageSchema.safeParse(body);
        if (!parseResult.success) {
            return new Response(
                JSON.stringify({ error: "Invalid request", details: parseResult.error }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const { message } = parseResult.data;
        const history = body.history || [];
        const sessionId = body.sessionId;

        // Build personalized system prompt
        const systemPrompt = buildSystemPrompt(userContext);

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt },
        ];

        for (const msg of history.slice(-10)) {
            if (msg.role === "user" || msg.role === "assistant") {
                messages.push({ role: msg.role, content: msg.content });
            }
        }

        messages.push({ role: "user", content: message });

        const stream = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.9,
        });

        let fullResponse = "";
        let savedSessionId: string | null = null;

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                    controller.close();

                    // Save chat history to database
                    if (user) {
                        try {
                            const updatedHistory = [
                                ...history,
                                { role: "user", content: message, timestamp: new Date().toISOString() },
                                { role: "assistant", content: fullResponse, timestamp: new Date().toISOString() },
                            ];

                            // Check if sessionId is a valid UUID (database ID)
                            const isValidUUID = sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

                            if (isValidUUID) {
                                // Update existing chat session
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const { error } = await (supabase as any)
                                    .from("chat_history")
                                    .update({
                                        messages: updatedHistory,
                                        context: {
                                            messageCount: updatedHistory.length,
                                            userCareer: userContext.career,
                                            updatedAt: new Date().toISOString(),
                                        }
                                    })
                                    .eq("id", sessionId)
                                    .eq("user_id", user.id);

                                if (error) {
                                    console.error("Failed to update chat session:", error);
                                } else {
                                    console.log("Chat session updated:", sessionId);
                                    savedSessionId = sessionId;
                                }
                            } else {
                                // Create new chat session
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const { data, error } = await (supabase as any)
                                    .from("chat_history")
                                    .insert({
                                        user_id: user.id,
                                        messages: updatedHistory,
                                        context: {
                                            startedAt: new Date().toISOString(),
                                            messageCount: updatedHistory.length,
                                            userCareer: userContext.career,
                                        },
                                    })
                                    .select("id")
                                    .single();

                                if (error) {
                                    console.error("Failed to create chat session:", error);
                                } else {
                                    console.log("New chat session created:", data?.id);
                                    savedSessionId = data?.id;
                                }
                            }
                        } catch (dbError) {
                            console.error("Database save error:", dbError);
                        }
                    }
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: unknown) {
        console.error("Chat API error:", error);
        return NextResponse.json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: chatHistory, error } = await (supabase as any)
            .from("chat_history")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            sessions: chatHistory || [],
        });

    } catch (error) {
        console.error("Fetch chat history error:", error);
        return NextResponse.json(
            { error: "Failed to fetch chat history" },
            { status: 500 }
        );
    }
}
