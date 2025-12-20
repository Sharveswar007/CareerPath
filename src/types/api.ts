// API Request and Response Types for Career Guidance Platform

import { z } from "zod";

// Chat API Types
export const ChatMessageSchema = z.object({
    message: z.string().min(1).max(10000),
    sessionId: z.string().nullable().optional(),
});

export type ChatMessageRequest = z.infer<typeof ChatMessageSchema>;

export interface ChatMessageResponse {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

// Quiz API Types
export const QuizAnswerSchema = z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.number(), z.array(z.string())]),
    category: z.string(),
});

export const QuizSubmissionSchema = z.object({
    sessionId: z.string(),
    answers: z.array(QuizAnswerSchema),
    completionTime: z.number(), // in seconds
});

export type QuizAnswer = z.infer<typeof QuizAnswerSchema>;
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

export interface QuizResult {
    personalityType: string;
    scores: {
        technical: number;
        creative: number;
        analytical: number;
        social: number;
        realistic: number;
        investigative: number;
        artistic: number;
        enterprising: number;
        conventional: number;
    };
    careers: CareerMatch[];
    personalityProfile: {
        strengths: string[];
        workStyle: string;
        preferredEnvironment: string;
    };
}

export interface CareerMatch {
    name: string;
    matchScore: number;
    description: string;
    salary: {
        entry: string;
        mid: string;
        senior: string;
    };
    growthOutlook: string;
    requiredEducation: string;
    topSkills: string[];
    whyMatch: string;
}

// Skills Analysis API Types
export const UserSkillSchema = z.object({
    name: z.string(),
    proficiency: z.number().min(0).max(100),
    category: z.string(),
});

export const SkillsAnalysisRequestSchema = z.object({
    sessionId: z.string(),
    targetCareer: z.string(),
    currentSkills: z.array(UserSkillSchema),
});

export type UserSkill = z.infer<typeof UserSkillSchema>;
export type SkillsAnalysisRequest = z.infer<typeof SkillsAnalysisRequestSchema>;

export interface SkillGap {
    skillName: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    priority: "critical" | "high" | "medium" | "low";
    estimatedHours: number;
}

export interface LearningResource {
    title: string;
    platform: string;
    type: "course" | "book" | "video" | "tutorial" | "practice";
    cost: "free" | "paid" | "freemium";
    duration: string;
    url: string;
    rating?: number;
}

export interface RoadmapPhase {
    name: string;
    duration: string;
    skills: string[];
    milestones: string[];
    resources: LearningResource[];
}

export interface SkillsAnalysisResult {
    readinessScore: number;
    masteredSkills: UserSkill[];
    partialSkills: SkillGap[];
    missingSkills: SkillGap[];
    roadmap: {
        totalDuration: string;
        phases: RoadmapPhase[];
    };
    recommendations: string[];
}

// Career Trends API Types
export interface CareerTrend {
    demandLevel: "very_high" | "high" | "moderate" | "low";
    jobCount: number;
    salaryRange: {
        fresher: string;
        midLevel: string;
        senior: string;
    };
    topSkills: Array<{ name: string; frequency: number }>;
    topCompanies: string[];
    growthOutlook: string;
    news: Array<{
        title: string;
        snippet: string;
        url: string;
        source: string;
        date: string;
    }>;
    marketSummary: string;
    lastUpdated: string;
}

// Coding Challenge API Types
export const CodeSubmissionSchema = z.object({
    challengeId: z.string(),
    code: z.string(),
    language: z.enum([
        "python",
        "javascript",
        "typescript",
        "java",
        "cpp",
        "c",
        "go",
        "rust",
        "sql",
    ]),
});

export type CodeSubmission = z.infer<typeof CodeSubmissionSchema>;

export interface TestCaseResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime: number;
    memoryUsed: number;
}

export interface CodeEvaluationResult {
    status: "passed" | "failed" | "error" | "timeout";
    score: number;
    testCases: TestCaseResult[];
    totalExecutionTime: number;
    totalMemoryUsed: number;
    feedback: string;
}

// Resume Analysis API Types
export const ResumeAnalysisRequestSchema = z.object({
    fileBase64: z.string(),
    fileName: z.string(),
    targetCareer: z.string().optional(),
});

export type ResumeAnalysisRequest = z.infer<typeof ResumeAnalysisRequestSchema>;

export interface ResumeAnalysisResult {
    overallScore: number;
    atsScore: number;
    sections: {
        name: string;
        score: number;
        feedback: string;
        suggestions: string[];
    }[];
    missingKeywords: string[];
    strengthKeywords: string[];
    formatIssues: string[];
    recommendations: string[];
}

// Entrance Exam API Types
export interface EntranceExamUpdate {
    examName: string;
    fullName: string;
    dates: {
        registration: { start: string; end: string };
        examDate: string;
        admitCard: string;
        result: string;
    };
    importantLinks: Array<{ label: string; url: string }>;
    patternChanges: string[];
    cutoffTrends: Array<{ year: number; general: number; obc: number; sc: number; st: number }>;
    news: Array<{ title: string; snippet: string; url: string }>;
    lastUpdated: string;
}

// Error Response Type
export interface APIError {
    error: string;
    message: string;
    code: string;
    details?: Record<string, unknown>;
}
