// Resume Analysis API - Analyzes resume with AI and saves to database

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
// @ts-ignore
import pdf from "pdf-parse";

// Force Node.js runtime for proper file system and module support
export const runtime = "nodejs";

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
    try {
        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Parse FormData
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const text = formData.get("text") as string;
        const targetRole = formData.get("targetRole") as string;

        let resumeContent = "";
        let fileName = "pasted_text.txt";

        // 2. Extract Text (PDF or Raw Text)
        if (file) {
            fileName = file.name;
            if (file.type === "application/pdf") {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const data = await pdf(buffer);
                    resumeContent = data.text;
                } catch (pdfError: unknown) {
                    console.error("PDF Parsing Error:", pdfError);
                    return NextResponse.json(
                        { error: `Failed to read PDF file: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}. Please try a text file.` },
                        { status: 400 }
                    );
                }
            } else {
                // Handle text/plain or other text formats
                resumeContent = await file.text();
            }
        } else if (text) {
            resumeContent = text;
        } else {
            return NextResponse.json(
                { error: "No resume content provided. Please upload a file or paste text." },
                { status: 400 }
            );
        }

        // 3. Validate if this is actually a resume
        const truncatedContent = resumeContent.slice(0, 15000);

        // First, check if the content looks like a resume
        const validationPrompt = `You are a strict document classifier. Your job is to determine if a document is a resume/CV or not.

Document to analyze:
"""
${truncatedContent.slice(0, 2000)}
"""

A RESUME must have AT LEAST 2 of these elements:
1. Contact info (name, email, phone, or address)
2. Work experience or job history
3. Education or qualifications  
4. Skills section

If this is NOT a resume (e.g., it's a random document, article, code, story, or unrelated content), set isResume to false.

Return JSON only:
{"isResume": boolean, "confidence": number 0-100, "reason": "why you think this"}`;

        const validationCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a document classifier. Be STRICT - only return isResume:true if the document is clearly a resume/CV. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: validationPrompt,
                },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.1,
            max_tokens: 300,
            response_format: { type: "json_object" },
        });

        const validationContent = validationCompletion.choices[0]?.message?.content || "{}";
        console.log("Resume validation response:", validationContent);

        let validationResult;
        try {
            validationResult = JSON.parse(validationContent);
        } catch {
            console.error("Failed to parse validation:", validationContent);
            // If parsing fails completely, reject to be safe
            return NextResponse.json(
                {
                    error: "Could not verify if this is a resume",
                    details: "Please upload a clear resume document in PDF or text format.",
                    suggestion: "Make sure your resume includes Contact Info, Work Experience, Education, and Skills sections."
                },
                { status: 400 }
            );
        }

        console.log("Parsed validation result:", validationResult);

        // STRICT CHECK: Reject if not a resume
        if (validationResult.isResume !== true) {
            return NextResponse.json(
                {
                    error: "This doesn't appear to be a resume",
                    details: validationResult.reason || "The uploaded document doesn't look like a resume or CV.",
                    suggestion: "Please upload a valid resume document containing your work experience, education, skills, and contact information."
                },
                { status: 400 }
            );
        }

        // 4. Analyze with Groq AI (only if validated as resume)
        const prompt = `
            Act as an expert Technical Recruiter. Analyze this resume for the role of "${targetRole || "General Application"}".
            
            Resume Text:
            ${truncatedContent}

            Return a RAW JSON object (no markdown, no blocks) with this structure:
            {
                "overallScore": number (0-100),
                "atsScore": number (0-100),
                "sections": [{"name": string, "score": number, "feedback": string, "suggestions": string[]}],
                "missingKeywords": string[],
                "strengthKeywords": string[],
                "formatIssues": string[],
                "recommendations": string[]
            }
        `;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a Resume Analysis API. Output purely valid JSON.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        // 4. Parse AI Response
        const responseContent = completion.choices[0]?.message?.content || "{}";
        let result;
        try {
            result = JSON.parse(responseContent);
        } catch (jsonError) {
            console.error("AI Response Parse Error:", responseContent);
            return NextResponse.json(
                { error: "AI analysis produced invalid data. Please try again." },
                { status: 502 }
            );
        }

        // 5. Save to Database (if user is authenticated)
        if (user) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: insertError } = await (supabase as any)
                    .from("resume_analyses")
                    .insert({
                        user_id: user.id,
                        file_name: fileName,
                        analysis_result: result,
                        ats_score: result.atsScore || result.overallScore,
                        suggestions: {
                            missingKeywords: result.missingKeywords,
                            formatIssues: result.formatIssues,
                            recommendations: result.recommendations,
                        },
                    });

                if (insertError) {
                    console.error("Resume analysis save error:", insertError);
                } else {
                    console.log("Resume analysis saved to database for user:", user.id);
                }
            } catch (dbError) {
                console.error("Database error:", dbError);
                // Continue even if DB save fails - user still gets analysis
            }
        }

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error("Critical Analysis Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error during analysis" },
            { status: 500 }
        );
    }
}
