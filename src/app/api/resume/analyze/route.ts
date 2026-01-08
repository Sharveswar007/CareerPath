// Resume Analysis API - Analyzes resume with AI and saves to database
// Supports: PDF (text & image-based), Images, and plain text files
// Vercel-compatible: Uses unpdf for text PDFs, OCR.space for image-based PDFs/images

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";

// Use Node.js runtime for proper module support
export const runtime = "nodejs";

// Increase timeout for AI processing
export const maxDuration = 60;

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Helper: Extract text from PDF using unpdf (for text-based PDFs)
async function extractTextFromPDF(uint8Array: Uint8Array): Promise<string> {
    try {
        const pdf = await getDocumentProxy(uint8Array);
        const { text } = await extractText(pdf, { mergePages: true });
        return text || '';
    } catch (error) {
        console.error("PDF parse error:", error);
        throw error;
    }
}

// Helper: Extract text from image-based PDF or image using OCR.space API
async function extractTextWithOCR(file: File): Promise<string> {
    const OCR_API_KEY = process.env.OCR_SPACE_API_KEY;
    
    if (!OCR_API_KEY) {
        throw new Error("OCR service not configured. Please paste your resume text directly.");
    }

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("apikey", OCR_API_KEY);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        formData.append("detectOrientation", "true");
        formData.append("scale", "true");
        formData.append("OCREngine", "2"); // More accurate engine
        
        // For PDFs, enable multi-page processing
        if (file.type === "application/pdf") {
            formData.append("isCreateSearchablePdf", "false");
            formData.append("filetype", "PDF");
        }

        const response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`OCR API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.IsErroredOnProcessing) {
            throw new Error(result.ErrorMessage?.[0] || "OCR processing failed");
        }

        // Combine text from all pages
        const extractedText = result.ParsedResults
            ?.map((page: { ParsedText: string }) => page.ParsedText)
            .join("\n\n") || "";

        return extractedText;
    } catch (error) {
        console.error("OCR extraction error:", error);
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        // 1. Parse FormData
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const text = formData.get("text") as string | null;
        const targetRole = formData.get("targetRole") as string | null;

        let resumeContent = "";
        let fileName = "pasted_text.txt";

        // 2. Extract Text based on file type
        if (file) {
            fileName = file.name;
            const fileType = file.type;
            const fileSize = file.size;

            // Check file size (max 10MB)
            if (fileSize > 10 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "File too large. Maximum size is 10MB." },
                    { status: 400 }
                );
            }

            // Handle different file types
            if (fileType === "application/pdf") {
                // First try text extraction (for text-based PDFs)
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    resumeContent = await extractTextFromPDF(uint8Array);
                    
                    // If text extraction yields very little content, try OCR
                    if (!resumeContent || resumeContent.trim().length < 100) {
                        console.log("PDF has little text, trying OCR...");
                        resumeContent = await extractTextWithOCR(file);
                    }
                } catch (pdfError: unknown) {
                    console.log("Text extraction failed, trying OCR...", pdfError);
                    // Fall back to OCR for image-based PDFs
                    try {
                        resumeContent = await extractTextWithOCR(file);
                    } catch (ocrError: unknown) {
                        console.error("OCR Extraction Error:", ocrError);
                        return NextResponse.json(
                            { 
                                error: "Failed to process PDF file",
                                details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
                                suggestion: "Try copying your resume text and pasting it directly."
                            },
                            { status: 400 }
                        );
                    }
                }
                
                if (!resumeContent || resumeContent.trim().length < 50) {
                    return NextResponse.json(
                        { 
                            error: "Could not extract text from PDF",
                            details: "The PDF might be corrupted or contain no readable text.",
                            suggestion: "Try copying your resume text and pasting it directly."
                        },
                        { status: 400 }
                    );
                }
            } else if (fileType.startsWith("image/")) {
                // Use OCR for images
                try {
                    resumeContent = await extractTextWithOCR(file);
                    
                    if (!resumeContent || resumeContent.trim().length < 50) {
                        return NextResponse.json(
                            { 
                                error: "Could not extract text from image",
                                details: "The image might be too small, blurry, or not contain readable text.",
                                suggestion: "Upload a clear, high-resolution image of your resume."
                            },
                            { status: 400 }
                        );
                    }
                } catch (ocrError: unknown) {
                    console.error("Image OCR Error:", ocrError);
                    return NextResponse.json(
                        { 
                            error: "Failed to process image file",
                            details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
                            suggestion: "Try a different image or paste the text directly."
                        },
                        { status: 400 }
                    );
                }
            } else if (fileType === "text/plain" || fileType === "text/markdown" || fileType === "application/rtf") {
                // Handle text files
                resumeContent = await file.text();
            } else {
                return NextResponse.json(
                    { 
                        error: "Unsupported file type",
                        details: `File type '${fileType}' is not supported.`,
                        suggestion: "Please upload a PDF or text file, or paste your resume text directly."
                    },
                    { status: 400 }
                );
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

        // 5. Return results (database save handled client-side for edge runtime)
        // Include metadata for client-side saving
        return NextResponse.json({
            ...result,
            _metadata: {
                fileName,
                analyzedAt: new Date().toISOString(),
            }
        });

    } catch (error: unknown) {
        console.error("Critical Analysis Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error during analysis" },
            { status: 500 }
        );
    }
}
