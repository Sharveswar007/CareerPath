// Exam Updates API - AI-Generated exam timeline and notifications

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

interface ExamUpdate {
    date: string;
    title: string;
    type: "notification" | "registration" | "admit_card" | "result" | "counselling";
    description?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { examName, examFullName, conductingBody, frequency } = await request.json();

        if (!examName) {
            return NextResponse.json({ error: "Exam name required" }, { status: 400 });
        }

        // Get current date for realistic timeline
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const prompt = `Generate a realistic exam timeline for "${examFullName}" (${examName}) conducted by ${conductingBody}.

Current Date: ${currentDate.toLocaleDateString("en-IN")}
Exam Frequency: ${frequency}

Generate 5-7 important dates/updates for this exam for the upcoming cycle (${currentYear}-${currentYear + 1}).

Consider typical exam patterns:
- Registration usually opens 2-3 months before exam
- Admit cards released 2-3 weeks before exam
- Results announced 4-6 weeks after exam
- Counselling starts 2-3 weeks after results

Return a JSON array with dates in YYYY-MM-DD format:
[
    {
        "date": "YYYY-MM-DD",
        "title": "Short title of the event",
        "type": "notification|registration|admit_card|result|counselling",
        "description": "Brief description (optional)"
    }
]

Make dates realistic based on typical ${examName} patterns.
Return ONLY valid JSON array, no markdown.`;

        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: "You are an expert on Indian entrance exams. Generate realistic exam timelines based on historical patterns. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.5,
            max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content || "[]";

        let updates: ExamUpdate[] = [];
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
            updates = JSON.parse(cleanContent);

            // Sort by date
            updates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } catch (parseError) {
            console.error("Failed to parse exam updates:", parseError);
            // Return empty array on parse failure
            return NextResponse.json({ updates: [] });
        }

        return NextResponse.json({
            success: true,
            examName,
            updates,
            generatedAt: new Date().toISOString(),
        });

    } catch (error: unknown) {
        console.error("Exam updates API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate updates" },
            { status: 500 }
        );
    }
}
