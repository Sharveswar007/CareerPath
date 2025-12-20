// Enhanced Career Trends Page with Booming Careers Section

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    TrendingUp,
    Search,
    Briefcase,
    DollarSign,
    Building2,
    Newspaper,
    ExternalLink,
    Loader2,
    Flame,
    Star,
    ArrowRight,
    Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Removed static POPULAR_CAREERS and BOOMING_CAREERS - now fetched from API

interface BoomingCareer {
    name: string;
    growth: string;
    avgSalary: string;
    description: string;
    skills?: string[];
    icon: string;
    color: string;
}

interface CareerTrend {
    demandLevel: "very_high" | "high" | "moderate" | "low";
    jobCount: number;
    salaryRange: { fresher: string; midLevel: string; senior: string };
    topSkills: Array<{ name: string; frequency: number }>;
    topCompanies: string[];
    growthOutlook: string;
    news: Array<{ title: string; snippet: string; url: string; source: string; date: string }>;
    marketSummary: string;
    lastUpdated: string;
}

export default function TrendsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
    const [userCareer, setUserCareer] = useState<string | null>(null);
    const [boomingCareers, setBoomingCareers] = useState<BoomingCareer[]>([]);
    const [boomingLoading, setBoomingLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Fetch booming careers from API
        const fetchBoomingCareers = async () => {
            try {
                const response = await fetch("/api/trends/booming");
                if (response.ok) {
                    const data = await response.json();
                    setBoomingCareers(data.careers || []);
                }
            } catch (error) {
                console.error("Failed to fetch booming careers:", error);
            } finally {
                setBoomingLoading(false);
            }
        };

        fetchBoomingCareers();
    }, []);

    useEffect(() => {
        const loadUserCareer = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data } = await supabase
                    .from("career_selections")
                    .select("career_name")
                    .eq("user_id", user.id)
                    .order("selected_at", { ascending: false })
                    .limit(1)
                    .single();

                if (data) {
                    setUserCareer(data.career_name);
                    setSelectedCareer(data.career_name);
                    setSearchQuery(data.career_name);
                }
            }
        };

        loadUserCareer();
    }, [supabase]);

    const { data: trends, isLoading, error } = useQuery<CareerTrend>({
        queryKey: ["career-trends", selectedCareer],
        queryFn: async () => {
            if (!selectedCareer) return null;
            const response = await fetch(`/api/trends/${encodeURIComponent(selectedCareer)}`);
            if (!response.ok) throw new Error("Failed to fetch trends");
            return response.json();
        },
        enabled: !!selectedCareer,
        staleTime: 1000 * 60 * 30,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setSelectedCareer(searchQuery.trim());
        }
    };

    const getDemandColor = (level: string) => {
        switch (level) {
            case "very_high":
                return "text-green-500";
            case "high":
                return "text-emerald-500";
            case "moderate":
                return "text-amber-500";
            default:
                return "text-gray-500";
        }
    };

    const getDemandBadge = (level: string) => {
        switch (level) {
            case "very_high":
                return "bg-green-500";
            case "high":
                return "bg-emerald-500";
            case "moderate":
                return "bg-amber-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-bold">Real-Time Career Trends</h1>
                        <p className="text-sm text-muted-foreground">
                            Live job market data and insights for India
                        </p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        <h2 className="text-lg font-semibold">Booming Careers in {new Date().getFullYear()}</h2>
                    </div>
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                        High Growth
                    </Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {boomingLoading ? (
                        // Loading skeleton
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className="p-4 animate-pulse">
                                <div className="h-10 w-10 rounded-lg bg-muted mb-3" />
                                <div className="h-4 w-24 bg-muted rounded mb-2" />
                                <div className="h-3 w-16 bg-muted rounded" />
                            </Card>
                        ))
                    ) : boomingCareers.length > 0 ? (
                        boomingCareers.map((career, index) => {
                            // Map icon string to component
                            const iconMap: Record<string, React.ElementType> = {
                                Sparkles,
                                Building2,
                                Star,
                                TrendingUp,
                                Code2: Briefcase,
                                Cloud: Building2,
                                Shield: Star,
                                BarChart3: TrendingUp,
                                Palette: Sparkles,
                            };
                            const Icon = iconMap[career.icon] || Star;

                            return (
                                <motion.div
                                    key={career.name}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card
                                        className="p-4 cursor-pointer hover:scale-105 transition-transform group"
                                        onClick={() => {
                                            setSelectedCareer(career.name);
                                            setSearchQuery(career.name);
                                        }}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                                            career.color
                                        )}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="font-medium mb-1 group-hover:text-violet-600 transition-colors">
                                            {career.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                                                {career.growth}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {career.avgSalary}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {career.description}
                                        </p>
                                    </Card>
                                </motion.div>
                            );
                        })
                    ) : (
                        <p className="col-span-4 text-center text-muted-foreground py-8">
                            Failed to load booming careers. Please refresh.
                        </p>
                    )}
                </div>
            </motion.div>

            {userCareer && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <Card className="p-4 border-violet-500/30 bg-violet-500/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Star className="h-5 w-5 text-violet-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Your Career Path</p>
                                    <p className="font-medium">{userCareer}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedCareer(userCareer);
                                    setSearchQuery(userCareer);
                                }}
                            >
                                View Trends
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            )}

            <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
                <div className="flex gap-2">
                    <Input
                        placeholder="Search for a career (e.g., Data Scientist)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                    </Button>
                </div>
            </form>

            {!selectedCareer && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <p className="text-sm text-muted-foreground text-center mb-4">
                        Popular careers to explore:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {(boomingCareers.length > 0
                            ? boomingCareers.map(c => c.name)
                            : ["Software Engineer", "Data Scientist", "Product Manager", "DevOps Engineer"]
                        ).map((career) => (
                            <Button
                                key={career}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedCareer(career);
                                    setSearchQuery(career);
                                }}
                            >
                                {career}
                            </Button>
                        ))}
                    </div>
                </motion.div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    <span className="ml-3">Fetching latest trends...</span>
                </div>
            )}

            {error && (
                <div className="text-center py-20 text-red-500">
                    Failed to load trends. Please try again.
                </div>
            )}

            {trends && selectedCareer && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-emerald-500" />
                            {selectedCareer}
                        </h2>
                        <Badge className={getDemandBadge(trends.demandLevel)}>
                            {trends.demandLevel.replace("_", " ").toUpperCase()} DEMAND
                        </Badge>
                    </div>

                    <Card className="p-6">
                        <p className="text-muted-foreground">{trends.marketSummary}</p>
                    </Card>

                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Briefcase className="h-5 w-5 text-blue-500" />
                                <p className="font-medium">Active Job Openings</p>
                            </div>
                            <p className="text-3xl font-bold">
                                {trends.jobCount.toLocaleString()}+
                            </p>
                            <p className="text-sm text-muted-foreground">Across India</p>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className={cn("h-5 w-5", getDemandColor(trends.demandLevel))} />
                                <p className="font-medium">Growth Outlook</p>
                            </div>
                            <p className="text-sm">{trends.growthOutlook}</p>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Search className="h-5 w-5 text-violet-500" />
                                <p className="font-medium">Data Freshness</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Updated: {new Date(trends.lastUpdated).toLocaleDateString()}
                            </p>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                <h3 className="font-semibold">Salary Range (India)</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Fresher (0-2 years)</span>
                                        <span className="font-medium">{trends.salaryRange.fresher}</span>
                                    </div>
                                    <Progress value={30} className="h-2" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Mid-Level (3-7 years)</span>
                                        <span className="font-medium">{trends.salaryRange.midLevel}</span>
                                    </div>
                                    <Progress value={60} className="h-2" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Senior (8+ years)</span>
                                        <span className="font-medium">{trends.salaryRange.senior}</span>
                                    </div>
                                    <Progress value={90} className="h-2" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="font-semibold mb-4">In-Demand Skills</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={trends.topSkills.slice(0, 6)}
                                        layout="vertical"
                                    >
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={100}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${value}%`, "Demand"]}
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Bar
                                            dataKey="frequency"
                                            fill="hsl(160, 84%, 39%)"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="h-5 w-5 text-blue-500" />
                            <h3 className="font-semibold">Top Hiring Companies</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {trends.topCompanies.map((company) => (
                                <Badge key={company} variant="outline" className="px-3 py-1">
                                    {company}
                                </Badge>
                            ))}
                        </div>
                    </Card>

                    {trends.news.length > 0 && (
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Newspaper className="h-5 w-5 text-orange-500" />
                                <h3 className="font-semibold">Latest News</h3>
                            </div>
                            <div className="space-y-4">
                                {trends.news.map((article, index) => (
                                    <div key={index} className="border-b border-border pb-4 last:border-0">
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group"
                                        >
                                            <h4 className="font-medium group-hover:text-emerald-500 transition-colors flex items-center gap-2">
                                                {article.title}
                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {article.snippet}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {article.source} - {article.date}
                                            </p>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </motion.div>
            )}
        </div>
    );
}
