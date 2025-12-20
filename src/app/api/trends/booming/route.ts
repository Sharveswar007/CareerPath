// API Route: Generate Booming Careers based on user's field
// Uses AI to provide current market trends personalized to user's industry

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let userField = "Technology"; // Default field

        if (user) {
            // Get user's selected career to determine their field
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: careerData } = await (supabase as any)
                .from("career_selections")
                .select("career_name")
                .eq("user_id", user.id)
                .order("selected_at", { ascending: false })
                .limit(1)
                .single();

            if (careerData?.career_name) {
                // Determine field from career
                const career = careerData.career_name.toLowerCase();
                if (career.includes("data") || career.includes("ml") || career.includes("ai") || career.includes("scientist")) {
                    userField = "Data Science & AI";
                } else if (career.includes("design") || career.includes("ux") || career.includes("ui")) {
                    userField = "Design & UX";
                } else if (career.includes("product") || career.includes("manager")) {
                    userField = "Product Management";
                } else if (career.includes("devops") || career.includes("cloud") || career.includes("infrastructure")) {
                    userField = "Cloud & DevOps";
                } else if (career.includes("security") || career.includes("cyber")) {
                    userField = "Cybersecurity";
                } else if (career.includes("blockchain") || career.includes("web3")) {
                    userField = "Web3 & Blockchain";
                } else {
                    userField = "Software Development";
                }
            }
        }

        const prompt = `You are a career market analyst. Generate 4 booming careers in the "${userField}" field for 2024-2025.

Return ONLY a JSON array with this exact structure (no markdown):
[
    {
        "name": "Career Title",
        "growth": "+XX%",
        "avgSalary": "Range in LPA (Indian market)",
        "description": "One line about why it's booming",
        "skills": ["skill1", "skill2", "skill3"]
    }
]

Requirements:
- Use real market data and trends
- Growth percentages should be realistic (15-50%)
- Salary ranges in Indian LPA format (e.g., "15-30 LPA")
- Include emerging and high-demand roles
- Description should be compelling and current

Return ONLY the JSON array, no other text.`;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a career market analyst. Return only valid JSON arrays.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = completion.choices[0]?.message?.content || "[]";

        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
            const careers = JSON.parse(cleanContent);

            // Add icons based on career names
            const iconMapping: Record<string, string> = {
                "ai": "Sparkles",
                "ml": "Sparkles",
                "data": "BarChart3",
                "cloud": "Cloud",
                "devops": "Server",
                "security": "Shield",
                "cyber": "Shield",
                "engineer": "Code2",
                "developer": "Code2",
                "architect": "Building2",
                "manager": "Briefcase",
                "designer": "Palette",
                "analyst": "TrendingUp",
            };

            const colorPalette = [
                "from-violet-500 to-purple-600",
                "from-blue-500 to-cyan-600",
                "from-red-500 to-orange-600",
                "from-emerald-500 to-teal-600",
            ];

            const enrichedCareers = careers.map((career: { name: string }, index: number) => {
                const nameLower = career.name.toLowerCase();
                let icon = "Star";

                for (const [key, value] of Object.entries(iconMapping)) {
                    if (nameLower.includes(key)) {
                        icon = value;
                        break;
                    }
                }

                return {
                    ...career,
                    icon,
                    color: colorPalette[index % colorPalette.length],
                };
            });

            return NextResponse.json({
                field: userField,
                careers: enrichedCareers,
            });
        } catch {
            // Fallback careers
            return NextResponse.json({
                field: userField,
                careers: [
                    {
                        name: "AI/ML Engineer",
                        growth: "+45%",
                        avgSalary: "18-35 LPA",
                        description: "Highest demand in 2024",
                        skills: ["Python", "TensorFlow", "Deep Learning"],
                        icon: "Sparkles",
                        color: "from-violet-500 to-purple-600",
                    },
                    {
                        name: "Cloud Architect",
                        growth: "+38%",
                        avgSalary: "25-50 LPA",
                        description: "Multi-cloud expertise valued",
                        skills: ["AWS", "Azure", "Kubernetes"],
                        icon: "Cloud",
                        color: "from-blue-500 to-cyan-600",
                    },
                    {
                        name: "Cybersecurity Analyst",
                        growth: "+32%",
                        avgSalary: "12-28 LPA",
                        description: "Critical for digital security",
                        skills: ["SOC", "Threat Analysis", "SIEM"],
                        icon: "Shield",
                        color: "from-red-500 to-orange-600",
                    },
                    {
                        name: "Data Engineer",
                        growth: "+30%",
                        avgSalary: "15-35 LPA",
                        description: "Big data driving demand",
                        skills: ["Spark", "Kafka", "Airflow"],
                        icon: "TrendingUp",
                        color: "from-emerald-500 to-teal-600",
                    },
                ],
            });
        }
    } catch (error) {
        console.error("Booming careers API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch booming careers" },
            { status: 500 }
        );
    }
}
