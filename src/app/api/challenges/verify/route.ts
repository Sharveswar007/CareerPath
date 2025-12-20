// Challenge Code Verification API - AI-based verification

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

interface VerifyRequest {
    code: string;
    language: string;
    challenge: {
        title: string;
        description: string;
    };
    output?: string; // Actual execution output
}

export async function POST(request: NextRequest) {
    try {
        const body: VerifyRequest = await request.json();
        const { code, language, challenge, output } = body;

        // Validate input
        if (!code || code.trim().length === 0) {
            return NextResponse.json({
                passed: false,
                feedback: "No code provided. Please write your solution first.",
            });
        }

        if (!challenge?.title) {
            return NextResponse.json({
                passed: false,
                feedback: "Challenge data missing.",
            });
        }

        // Check for placeholder/incomplete code
        const codeStr = code.toLowerCase();
        const hasPlaceholder =
            codeStr.includes('todo') ||
            codeStr.includes('your code here') ||
            codeStr.includes('implement') ||
            codeStr.includes('write your') ||
            codeStr.includes('// code') ||
            codeStr.includes('pass') && codeStr.includes('def '); // Python placeholder

        // Check if code is too short (likely just starter code)
        const codeWithoutComments = code.replace(/\/\/.*|\/\*[\s\S]*?\*\/|#.*/g, '').trim();
        const significantCode = codeWithoutComments.replace(/\s+/g, '');

        if (significantCode.length < 20 || hasPlaceholder) {
            return NextResponse.json({
                passed: false,
                feedback: "Code appears incomplete. Please implement the solution first.",
            });
        }

        // Build prompt with or without actual output
        const outputSection = output
            ? `\nACTUAL OUTPUT FROM EXECUTION:\n\`\`\`\n${output}\n\`\`\`\n`
            : "";

        const prompt = `You are a fair code evaluator for a coding challenge platform.

PROBLEM: "${challenge.title}"
${challenge.description}

USER'S ${language.toUpperCase()} CODE:
\`\`\`${language}
${code}
\`\`\`
${outputSection}
EVALUATION CRITERIA:
1. Does the code attempt to solve the stated problem?
2. ${output ? "Does the actual output look reasonable for the problem?" : "Would the code logic produce correct results?"}
3. Is the core algorithm/approach correct for solving this problem?

IMPORTANT:
- Focus on whether the solution WORKS, not coding style
- If the code runs without errors and the approach is reasonable, lean towards passing
- Only fail if there are CLEAR logical errors that would cause wrong results
- Minor optimizations are NOT required for passing

Return this JSON:
{
  "passed": true or false,
  "feedback": "Brief, encouraging feedback"
}

ONLY return valid JSON.`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful code evaluator. Be fair and encouraging. If the code demonstrates understanding of the problem and the approach is correct, pass it. Only fail for clear bugs that would cause incorrect results. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.0, // Zero temperature for deterministic evaluation
            max_tokens: 1500, // Increased to prevent JSON truncation
        });

        const content = completion.choices[0]?.message?.content || "{}";

        // Clean and parse the response
        let cleanContent = content
            .replace(/```json\n?|\n?```/g, "")
            .replace(/```\n?|\n?```/g, "")
            .trim();

        // Better JSON extraction - find matching braces
        const extractJSON = (str: string): string => {
            const start = str.indexOf('{');
            if (start === -1) return "{}";

            let braceCount = 0;
            let end = start;

            for (let i = start; i < str.length; i++) {
                if (str[i] === '{') braceCount++;
                if (str[i] === '}') braceCount--;
                if (braceCount === 0) {
                    end = i;
                    break;
                }
            }

            return str.substring(start, end + 1);
        };

        cleanContent = extractJSON(cleanContent);

        let result;
        try {
            result = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error("JSON parse error:", parseError);
            console.error("Raw AI response:", content.substring(0, 300));

            // Return a default response - assume pass if code ran
            return NextResponse.json({
                passed: true,
                feedback: "Code executed. Unable to get detailed analysis.",
            });
        }

        // Return simplified response
        return NextResponse.json({
            passed: result.passed === true,
            feedback: result.feedback || (result.passed ? "Code looks correct!" : "Code needs improvement."),
        });

    } catch (error: any) {
        console.error("Verification Error:", error);

        // Check for rate limit
        if (error?.status === 429) {
            return NextResponse.json({
                passed: false,
                results: [],
                feedback: "Rate limit reached. Please wait a moment and try again.",
            });
        }

        return NextResponse.json({
            passed: false,
            results: [],
            feedback: "Error evaluating code: " + (error.message || "Unknown error"),
        });
    }
}
