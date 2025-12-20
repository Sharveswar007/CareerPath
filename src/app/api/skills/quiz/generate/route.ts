import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const { career } = await request.json();

        if (!career) {
            return NextResponse.json({ error: "Career is required" }, { status: 400 });
        }

        const prompt = `Generate 5 technical interview questions to assess a candidate for a "${career}" role.
        
        Format the output strictly as a JSON array of objects with this structure:
        [
            {
                "id": 1,
                "question": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option A" // One of the options verbatim
            }
        ]
        
        Ensure questions cover key skills required for ${career} (e.g., for Software Engineer: specific languages, algorithms, system design).
        Do not include any text outside the JSON array.`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
        });

        const content = completion.choices[0]?.message?.content || "[]";

        // Basic cleanup in case of markdown code blocks
        const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const questions = JSON.parse(cleanedContent);
            return NextResponse.json({ questions });
        } catch (parseError) {
            console.error("Failed to parse Groq response:", content);
            return NextResponse.json({ error: "Failed to generate valid questions" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Quiz generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
