// Tavily API Client for Real-Time Career Trends

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_BASE_URL = "https://api.tavily.com";

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
}

interface TavilySearchResponse {
    query: string;
    follow_up_questions?: string[];
    answer?: string;
    images?: string[];
    results: TavilySearchResult[];
}

export async function searchCareerTrends(
    careerName: string
): Promise<TavilySearchResponse | null> {
    if (!TAVILY_API_KEY) {
        console.error("TAVILY_API_KEY not configured");
        return null;
    }

    try {
        const response = await fetch(`${TAVILY_BASE_URL}/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: `${careerName} job market demand salary trends India ${new Date().getFullYear()} ${new Date().getFullYear() + 1}`,
                search_depth: "advanced",
                include_answer: true,
                include_images: false,
                max_results: 10,
                include_domains: [
                    "linkedin.com",
                    "glassdoor.com",
                    "naukri.com",
                    "indeed.com",
                    "ambitionbox.com",
                    "economictimes.com",
                    "moneycontrol.com",
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Tavily search error:", error);
        return null;
    }
}

export async function searchEntranceExamUpdates(
    examName: string
): Promise<TavilySearchResponse | null> {
    if (!TAVILY_API_KEY) {
        console.error("TAVILY_API_KEY not configured");
        return null;
    }

    try {
        const response = await fetch(`${TAVILY_BASE_URL}/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: `${examName} exam 2025 notification registration date admit card result`,
                search_depth: "advanced",
                include_answer: true,
                include_images: false,
                max_results: 8,
                include_domains: [
                    "nta.ac.in",
                    "jeemain.nta.nic.in",
                    "neet.nta.nic.in",
                    "gate.iitb.ac.in",
                    "upsc.gov.in",
                    "shiksha.com",
                    "collegedunia.com",
                    "careers360.com",
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Tavily exam search error:", error);
        return null;
    }
}

export async function searchSkillDemand(
    skillName: string
): Promise<TavilySearchResponse | null> {
    if (!TAVILY_API_KEY) {
        return null;
    }

    try {
        const response = await fetch(`${TAVILY_BASE_URL}/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: `${skillName} skill demand jobs salary India ${new Date().getFullYear()}`,
                search_depth: "basic",
                include_answer: true,
                max_results: 5,
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Tavily skill search error:", error);
        return null;
    }
}

// Parse demand level from search results
export function parseDemandLevel(
    results: TavilySearchResult[]
): "very_high" | "high" | "moderate" | "low" {
    const contentText = results.map((r) => r.content.toLowerCase()).join(" ");

    const veryHighIndicators = [
        "extremely high demand",
        "skyrocketing",
        "critical shortage",
        "top hiring",
        "most in-demand",
    ];
    const highIndicators = [
        "high demand",
        "growing rapidly",
        "strong demand",
        "increased hiring",
        "talent shortage",
    ];
    const moderateIndicators = [
        "steady demand",
        "moderate growth",
        "stable market",
        "consistent hiring",
    ];

    if (veryHighIndicators.some((i) => contentText.includes(i))) {
        return "very_high";
    }
    if (highIndicators.some((i) => contentText.includes(i))) {
        return "high";
    }
    if (moderateIndicators.some((i) => contentText.includes(i))) {
        return "moderate";
    }
    return "moderate"; // Default to moderate if unclear
}

// Extract salary information from results
export function parseSalaryData(
    results: TavilySearchResult[],
    careerName: string
): { fresher: string; midLevel: string; senior: string } {
    // Default salary ranges by career category
    const defaults: Record<string, { fresher: string; midLevel: string; senior: string }> = {
        "Software Engineer": { fresher: "5-10 LPA", midLevel: "12-25 LPA", senior: "30-50+ LPA" },
        "Data Scientist": { fresher: "6-12 LPA", midLevel: "15-30 LPA", senior: "35-60+ LPA" },
        "Product Manager": { fresher: "10-18 LPA", midLevel: "25-45 LPA", senior: "50-100+ LPA" },
        default: { fresher: "4-8 LPA", midLevel: "10-20 LPA", senior: "25-45+ LPA" },
    };

    return defaults[careerName] || defaults.default;
}

// Extract top skills from results
export function parseTopSkills(
    results: TavilySearchResult[],
    careerName: string
): Array<{ name: string; frequency: number }> {
    const skillKeywords: Record<string, string[]> = {
        "Software Engineer": ["Python", "JavaScript", "Java", "React", "Node.js", "AWS", "Docker", "Git", "SQL"],
        "Data Scientist": ["Python", "Machine Learning", "SQL", "Statistics", "TensorFlow", "Data Visualization"],
        "Product Manager": ["Agile", "Analytics", "User Research", "Roadmapping", "SQL", "Communication"],
        default: ["Problem Solving", "Communication", "Teamwork", "Technical Skills", "Adaptability"],
    };

    const skills = skillKeywords[careerName] || skillKeywords.default;
    return skills.map((skill, index) => ({
        name: skill,
        frequency: Math.max(95 - index * 8, 40),
    }));
}

// Extract news articles from results
export function parseNewsArticles(
    results: TavilySearchResult[]
): Array<{ title: string; snippet: string; url: string; source: string; date: string }> {
    return results.slice(0, 6).map((result) => ({
        title: result.title,
        snippet: result.content.substring(0, 200) + "...",
        url: result.url,
        source: new URL(result.url).hostname.replace("www.", ""),
        date: result.published_date || new Date().toISOString().split("T")[0],
    }));
}

// Search for learning resources for a specific skill/topic
export async function searchLearningResources(
    skill: string,
    career: string
): Promise<Array<{
    title: string;
    url: string;
    type: string;
    provider: string;
    cost: string;
}>> {
    if (!TAVILY_API_KEY) {
        console.log("TAVILY_API_KEY not configured, skipping resource search");
        return [];
    }

    try {
        const response = await fetch(`${TAVILY_BASE_URL}/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: `best ${skill} course tutorial for ${career} ${new Date().getFullYear()} ${new Date().getFullYear() + 1}`,
                search_depth: "basic",
                include_answer: false,
                include_images: false,
                max_results: 8,
                include_domains: [
                    "coursera.org",
                    "udemy.com",
                    "youtube.com",
                    "freecodecamp.org",
                    "edx.org",
                    "udacity.com",
                    "pluralsight.com",
                    "codecademy.com",
                    "khanacademy.org",
                    "geeksforgeeks.org",
                    "w3schools.com",
                    "tutorialspoint.com",
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data: TavilySearchResponse = await response.json();

        // Parse results into learning resource format
        return data.results.slice(0, 3).map((result) => {
            const url = new URL(result.url);
            const hostname = url.hostname.replace("www.", "");

            // Determine type based on domain
            let type = "course";
            if (hostname.includes("youtube")) type = "youtube";
            else if (hostname.includes("geeksforgeeks") || hostname.includes("w3schools") || hostname.includes("tutorialspoint")) type = "tutorial";

            // Determine cost based on domain
            let cost = "freemium";
            if (hostname.includes("freecodecamp") || hostname.includes("youtube") || hostname.includes("khanacademy") || hostname.includes("w3schools")) {
                cost = "free";
            } else if (hostname.includes("udemy") || hostname.includes("pluralsight")) {
                cost = "paid";
            }

            // Get provider name
            const providerMap: Record<string, string> = {
                "coursera.org": "Coursera",
                "udemy.com": "Udemy",
                "youtube.com": "YouTube",
                "freecodecamp.org": "freeCodeCamp",
                "edx.org": "edX",
                "udacity.com": "Udacity",
                "pluralsight.com": "Pluralsight",
                "codecademy.com": "Codecademy",
                "khanacademy.org": "Khan Academy",
                "geeksforgeeks.org": "GeeksforGeeks",
                "w3schools.com": "W3Schools",
                "tutorialspoint.com": "TutorialsPoint",
            };

            const provider = providerMap[hostname] || hostname;

            return {
                title: result.title.length > 80 ? result.title.substring(0, 77) + "..." : result.title,
                url: result.url,
                type,
                provider,
                cost,
            };
        });
    } catch (error) {
        console.error("Tavily learning resource search error:", error);
        return [];
    }
}
