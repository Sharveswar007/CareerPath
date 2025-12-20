// API Route: Generate Coding Challenge Categories based on user's career
// Returns static categories to avoid rate limits - AI generation optional

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pre-defined categories by career type
const CAREER_CATEGORIES: Record<string, string[]> = {
    "Software Engineer": ["All", "Arrays", "Strings", "Hash Tables", "Trees", "Dynamic Programming", "Graphs", "System Design", "Linked Lists"],
    "Frontend Developer": ["All", "Arrays", "Strings", "DOM Manipulation", "Async Programming", "Trees", "Dynamic Programming", "Event Loop", "Recursion"],
    "Backend Developer": ["All", "Arrays", "Hash Tables", "Trees", "Graphs", "System Design", "Databases", "Concurrency", "API Design"],
    "Full Stack Developer": ["All", "Arrays", "Strings", "Trees", "Hash Tables", "System Design", "Databases", "Dynamic Programming", "API Design"],
    "Data Scientist": ["All", "Arrays", "Matrix Operations", "Statistics", "Trees", "Graphs", "Dynamic Programming", "Machine Learning", "Data Structures"],
    "Data Analyst": ["All", "Arrays", "Strings", "SQL Queries", "Statistics", "Data Manipulation", "Sorting", "Searching", "Hash Tables"],
    "DevOps Engineer": ["All", "Arrays", "Strings", "Shell Scripting", "System Design", "Trees", "Graphs", "Networking", "Automation"],
    "Cybersecurity Analyst": ["All", "Arrays", "Strings", "Encryption", "Hash Tables", "Trees", "Bit Manipulation", "Networking", "System Security"],
    "Mobile Developer": ["All", "Arrays", "Strings", "Trees", "Dynamic Programming", "Memory Management", "UI Patterns", "Async Programming", "Data Structures"],
    "Machine Learning Engineer": ["All", "Arrays", "Matrix Operations", "Trees", "Graphs", "Dynamic Programming", "Statistics", "Optimization", "Neural Networks"],
    "default": ["All", "Arrays", "Strings", "Linked Lists", "Trees", "Dynamic Programming", "Graphs", "Heaps", "Stacks"],
};

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let userCareer = "Software Engineer";

        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: careerData } = await (supabase as any)
                .from("career_selections")
                .select("career_name")
                .eq("user_id", user.id)
                .order("selected_at", { ascending: false })
                .limit(1)
                .single();

            if (careerData?.career_name) {
                userCareer = careerData.career_name;
            }
        }

        // Get categories for this career, or use default
        const categories = CAREER_CATEGORIES[userCareer] || CAREER_CATEGORIES["default"];

        return NextResponse.json({
            career: userCareer,
            categories: categories,
        });
    } catch (error) {
        console.error("Categories API error:", error);
        // Return default categories on any error
        return NextResponse.json({
            career: "Software Engineer",
            categories: CAREER_CATEGORIES["default"],
        });
    }
}

