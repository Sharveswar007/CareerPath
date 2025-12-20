// Enhanced Coding Challenges Page - Auto-generate 100 challenges based on profile

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Code2,
    Filter,
    Trophy,
    ChevronRight,
    Zap,
    Target,
    Flame,
    Sparkles,
    Loader2,
    Star,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { recordActivity, getActivityStats } from "@/lib/activity";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [
    "All",
    "Arrays",
    "Strings",
    "Linked Lists",
    "Trees",
    "Dynamic Programming",
    "Graphs",
    "Heaps",
    "Stacks",
];

interface Challenge {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    description: string;
    solved: boolean;
    isGenerated: boolean;
    isRecommended?: boolean;
}

const TARGET_CHALLENGE_COUNT = 20; // Reduced to avoid rate limits on free tier
const MIN_UNSOLVED_COUNT = 10;

export default function ChallengesPage() {
    const [selectedDifficulty, setSelectedDifficulty] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [activeTab, setActiveTab] = useState("unsolved");
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [userCareer, setUserCareer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [autoGenerating, setAutoGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    const supabase = createClient();

    // Function to generate challenges in background
    const generateChallengesInBackground = useCallback(async (career: string, count: number) => {
        setAutoGenerating(true);
        setGenerationProgress(0);

        try {
            const batchSize = 20;
            const batches = Math.ceil(count / batchSize);
            let generated = 0;

            for (let i = 0; i < batches; i++) {
                const toGenerate = Math.min(batchSize, count - generated);

                const res = await fetch("/api/challenges/bulk-generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        career,
                        count: toGenerate,
                    }),
                });

                if (res.ok) {
                    const result = await res.json();
                    generated += result.generated || 0;
                    setGenerationProgress(Math.round((generated / count) * 100));
                }

                // Small delay between batches
                if (i < batches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Refresh challenges list
            await refreshChallenges();

            if (generated > 0) {
                toast.success(`Generated ${generated} personalized challenges!`);
            }
        } catch (error) {
            console.error("Auto-generation error:", error);
        } finally {
            setAutoGenerating(false);
        }
    }, []);

    // Function to refresh challenges from database
    const refreshChallenges = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [challengesResult, submissionsResult] = await Promise.all([
            supabase
                .from("coding_challenges")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false }),
            supabase
                .from("coding_submissions")
                .select("challenge_id")
                .eq("user_id", user.id)
                .eq("status", "passed"),
        ]);

        const solvedIds = new Set(
            (submissionsResult.data || []).map(s => s.challenge_id)
        );

        if (challengesResult.data) {
            const dbChallenges = challengesResult.data.map(c => ({
                id: c.id,
                title: c.title,
                difficulty: c.difficulty,
                category: c.category,
                description: c.description,
                solved: solvedIds.has(c.id),
                isGenerated: true,
                isRecommended: c.is_recommended,
            }));
            setChallenges(dbChallenges);
        }
    }, [supabase]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Record activity for streak tracking
                await recordActivity(supabase, user.id);
                const activityStats = await getActivityStats(supabase, user.id);
                setCurrentStreak(activityStats.currentStreak);

                // Fetch AI-generated categories based on career
                try {
                    const categoriesRes = await fetch("/api/challenges/categories");
                    if (categoriesRes.ok) {
                        const categoriesData = await categoriesRes.json();
                        if (categoriesData.categories?.length > 0) {
                            setCategories(categoriesData.categories);
                        }
                    }
                } catch {
                    console.error("Failed to fetch personalized categories");
                }

                // Fetch user's career
                const { data: careerData } = await supabase
                    .from("career_selections")
                    .select("career_name")
                    .eq("user_id", user.id)
                    .order("selected_at", { ascending: false })
                    .limit(1)
                    .single();

                const career = careerData?.career_name || "Software Engineer";
                setUserCareer(career);

                // Fetch existing challenges
                const [challengesResult, submissionsResult] = await Promise.all([
                    supabase
                        .from("coding_challenges")
                        .select("*")
                        .eq("user_id", user.id)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("coding_submissions")
                        .select("challenge_id")
                        .eq("user_id", user.id)
                        .eq("status", "passed"),
                ]);

                const solvedIds = new Set(
                    (submissionsResult.data || []).map(s => s.challenge_id)
                );

                const existingChallenges = challengesResult.data || [];
                const unsolvedCount = existingChallenges.filter(c => !solvedIds.has(c.id)).length;
                const totalCount = existingChallenges.length;

                // Process and set challenges
                const dbChallenges = existingChallenges.map(c => ({
                    id: c.id,
                    title: c.title,
                    difficulty: c.difficulty,
                    category: c.category,
                    description: c.description,
                    solved: solvedIds.has(c.id),
                    isGenerated: true,
                    isRecommended: c.is_recommended,
                }));
                setChallenges(dbChallenges);

                // Auto-generate challenges if needed
                if (totalCount < TARGET_CHALLENGE_COUNT) {
                    const toGenerate = TARGET_CHALLENGE_COUNT - totalCount;
                    // Don't wait, generate in background
                    generateChallengesInBackground(career, toGenerate);
                } else if (unsolvedCount < MIN_UNSOLVED_COUNT) {
                    // Generate more if user has solved most
                    const toGenerate = MIN_UNSOLVED_COUNT - unsolvedCount;
                    generateChallengesInBackground(career, toGenerate);
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [supabase, generateChallengesInBackground]);

    const filteredChallenges = challenges.filter((challenge) => {
        const matchesDifficulty =
            selectedDifficulty === "all" || challenge.difficulty === selectedDifficulty;
        const matchesCategory =
            selectedCategory === "All" || challenge.category === selectedCategory;
        const matchesTab =
            activeTab === "all" ||
            (activeTab === "completed" && challenge.solved) ||
            (activeTab === "unsolved" && !challenge.solved) ||
            (activeTab === "recommended" && challenge.isRecommended);
        return matchesDifficulty && matchesCategory && matchesTab;
    });

    const totalSolved = challenges.filter(c => c.solved).length;
    const totalChallenges = challenges.length;
    const unsolvedCount = challenges.filter(c => !c.solved).length;

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy":
                return "bg-green-500/20 text-green-600 dark:text-green-400";
            case "medium":
                return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
            case "hard":
                return "bg-red-500/20 text-red-600 dark:text-red-400";
            default:
                return "bg-gray-500/20 text-gray-600";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                        <Code2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-bold">Coding Challenges</h1>
                        <p className="text-sm text-muted-foreground">
                            {userCareer ? `Personalized for ${userCareer}` : "Practice DSA and ace technical interviews"}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Auto-generation progress banner */}
            {autoGenerating && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Card className="p-4 bg-violet-500/10 border-violet-500/30">
                        <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                Generating personalized challenges based on your profile...
                            </span>
                            <span className="text-sm text-violet-600 ml-auto">{generationProgress}%</span>
                        </div>
                        <Progress value={generationProgress} className="h-2" />
                    </Card>
                </motion.div>
            )}

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalSolved}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Target className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{unsolvedCount}</p>
                            <p className="text-xs text-muted-foreground">To Solve</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <Flame className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{currentStreak}</p>
                            <p className="text-xs text-muted-foreground">Day Streak</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {totalChallenges > 0 ? Math.round((totalSolved / totalChallenges) * 100) : 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Progress</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters and Tabs */}
            <div className="flex flex-wrap gap-4 mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="unsolved">
                            <Target className="h-3 w-3 mr-1" />
                            To Solve ({unsolvedCount})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed ({totalSolved})
                        </TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="recommended">
                            <Star className="h-3 w-3 mr-1" />
                            Recommended
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex gap-2 ml-auto">
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="w-32">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Challenges List */}
            <div className="space-y-3">
                {filteredChallenges.map((challenge, index) => (
                    <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                    >
                        <Link href={`/challenges/${challenge.id}`}>
                            <Card className={cn(
                                "p-4 hover:border-violet-500/50 transition-all cursor-pointer group",
                                challenge.solved && "bg-green-500/5 border-green-500/30"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                            challenge.solved
                                                ? "bg-green-500 text-white"
                                                : challenge.isRecommended
                                                    ? "bg-violet-500/20 text-violet-500"
                                                    : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {challenge.solved ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : challenge.isRecommended ? (
                                            <Star className="h-4 w-4" />
                                        ) : (
                                            <Zap className="h-4 w-4 text-violet-500" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={cn(
                                                "font-medium transition-colors",
                                                challenge.solved
                                                    ? "text-green-700 dark:text-green-400"
                                                    : "group-hover:text-violet-600"
                                            )}>
                                                {challenge.title}
                                            </h3>
                                            <Badge
                                                variant="secondary"
                                                className={getDifficultyColor(challenge.difficulty)}
                                            >
                                                {challenge.difficulty}
                                            </Badge>
                                            {challenge.solved && (
                                                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                                    Completed
                                                </Badge>
                                            )}
                                            {challenge.isRecommended && !challenge.solved && (
                                                <Badge variant="outline" className="text-violet-600 border-violet-500/30">
                                                    Recommended
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {challenge.description}
                                        </p>
                                    </div>

                                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                                        <Badge variant="outline">{challenge.category}</Badge>
                                    </div>

                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                                </div>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {filteredChallenges.length === 0 && !autoGenerating && (
                <Card className="p-12 text-center">
                    <Code2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">
                        {activeTab === "completed"
                            ? "No challenges completed yet. Start solving to see your progress!"
                            : activeTab === "unsolved"
                                ? "Great job! You've completed all available challenges."
                                : "No challenges match your filters. Try adjusting your selection."}
                    </p>
                </Card>
            )}

            {/* Summary footer */}
            {totalChallenges > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 text-center text-sm text-muted-foreground"
                >
                    <p>
                        You have {totalChallenges} personalized challenges • {totalSolved} completed • {unsolvedCount} to go
                    </p>
                </motion.div>
            )}
        </div>
    );
}
