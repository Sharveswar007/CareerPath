// Groq API Client for AI-powered chat responses

import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// System prompt for career counselor persona
const CAREER_COUNSELOR_SYSTEM_PROMPT = `You are CareerGuide AI, an expert career counselor specializing in guidance for Indian students. You provide thoughtful, personalized career advice based on the user's educational background, interests, skills, and aspirations.

Your areas of expertise include:
- Career options across technical and non-technical fields
- Indian education system: Streams (Science, Commerce, Arts), Boards (CBSE, ICSE, State)
- Entrance exams: JEE, NEET, CAT, GATE, UPSC, CLAT, NID, NIFT, and others
- Top colleges and universities in India and abroad
- Salary expectations and career growth paths
- Required skills and qualifications for various careers
- Current job market trends and emerging fields

Communication guidelines:
- Be empathetic and encouraging while being realistic
- Provide specific, actionable advice with examples
- Include relevant statistics and data when available
- Consider the Indian context for salary, education, and career paths
- Use clear, professional language without emojis
- Format responses with proper markdown for readability
- When discussing code or technical topics, use proper code blocks

Do not:
- Make up statistics or data
- Recommend illegal or unethical career paths
- Dismiss the user's concerns or aspirations
- Provide overly generic advice`;

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface StreamingCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullContent: string) => void;
    onError: (error: Error) => void;
}

// Generate chat completion with streaming
export async function streamChatCompletion(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks,
    userContext?: string
): Promise<void> {
    const systemPrompt = userContext
        ? `${CAREER_COUNSELOR_SYSTEM_PROMPT}\n\nUser Context:\n${userContext}`
        : CAREER_COUNSELOR_SYSTEM_PROMPT;

    const allMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages,
    ];

    try {
        const stream = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: allMessages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.9,
        });

        let fullContent = "";

        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || "";
            if (token) {
                fullContent += token;
                callbacks.onToken(token);
            }
        }

        callbacks.onComplete(fullContent);
    } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
}

// Generate chat completion without streaming
export async function generateChatCompletion(
    messages: ChatMessage[],
    userContext?: string
): Promise<string> {
    const systemPrompt = userContext
        ? `${CAREER_COUNSELOR_SYSTEM_PROMPT}\n\nUser Context:\n${userContext}`
        : CAREER_COUNSELOR_SYSTEM_PROMPT;

    const allMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages,
    ];

    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: allMessages,
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.9,
    });

    return completion.choices[0]?.message?.content || "";
}

// Generate coding challenge using AI
export async function generateCodingChallenge(
    difficulty: "easy" | "medium" | "hard" | "expert",
    category: string,
    targetCareer?: string
): Promise<{
    title: string;
    description: string;
    examples: Array<{ input: string; output: string; explanation?: string }>;
    constraints: string[];
    testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
    hints: string[];
    optimalComplexity: { time: string; space: string };
}> {
    const prompt = `Generate a ${difficulty} level coding challenge for the category: ${category}.
${targetCareer ? `This should be relevant to someone pursuing a career as a ${targetCareer}.` : ""}

Return a JSON object with the following structure:
{
  "title": "Challenge title",
  "description": "Detailed problem description in markdown format",
  "examples": [
    {"input": "example input", "output": "example output", "explanation": "optional explanation"}
  ],
  "constraints": ["constraint 1", "constraint 2"],
  "testCases": [
    {"input": "test input", "expectedOutput": "expected output", "isHidden": false}
  ],
  "hints": ["hint 1", "hint 2"],
  "optimalComplexity": {"time": "O(n)", "space": "O(1)"}
}

Include at least 3 examples, 10 test cases (with 5 hidden), and 3 hints.
Make the problem statement clear and unambiguous.`;

    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content:
                    "You are an expert competitive programming problem setter. Generate high-quality coding challenges with proper test cases. Always respond with valid JSON only, no additional text.",
            },
            { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content || "{}";

    // Parse the JSON response, handling potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonString = jsonMatch[1] || content;

    return JSON.parse(jsonString.trim());
}

// Analyze resume content using AI
export async function analyzeResume(
    resumeText: string,
    targetCareer?: string
): Promise<{
    overallScore: number;
    atsScore: number;
    sections: Array<{ name: string; score: number; feedback: string; suggestions: string[] }>;
    missingKeywords: string[];
    strengthKeywords: string[];
    formatIssues: string[];
    recommendations: string[];
}> {
    const prompt = `Analyze the following resume for a career in ${targetCareer || "technology"}:

${resumeText}

Provide a comprehensive analysis in JSON format:
{
  "overallScore": 0-100,
  "atsScore": 0-100,
  "sections": [
    {"name": "section name", "score": 0-100, "feedback": "feedback text", "suggestions": ["suggestion 1"]}
  ],
  "missingKeywords": ["keyword 1"],
  "strengthKeywords": ["keyword 1"],
  "formatIssues": ["issue 1"],
  "recommendations": ["recommendation 1"]
}

Evaluate: Contact info, Education, Experience, Skills, Projects, Formatting, ATS compatibility.`;

    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content:
                    "You are an expert resume reviewer and career counselor. Analyze resumes thoroughly and provide actionable feedback. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonString = jsonMatch[1] || content;

    return JSON.parse(jsonString.trim());
}
