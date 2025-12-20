// Enhanced Skills Page - Shows assessment results and skill gap analysis

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    BarChart3,
    CheckCircle2,
    ArrowRight,
    Loader2,
    BookOpen,
    Target,
    TrendingUp,
    ExternalLink,
    Brain,
    Sparkles,
    Award,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AnalysisResult {
    readinessScore: number;
    gapAnalysis: string;
    strengths: string[];
    weaknesses: string[];
    roadmap: {
        totalDuration: string;
        phases: Array<{
            name: string;
            duration: string;
            skills: string[];
            milestones: string[];
            resources: Array<{
                title: string;
                type: string;
                url: string;
                cost: string;
                provider?: string;
            }>;
        }>;
    };
    recommendedChallenges: string[];
    immediateActions: string[];
}

interface AssessmentData {
    career: string;
    scores: {
        career: number;
        logic: number;
        total: number;
    };
    analysis: AnalysisResult;
}

export default function SkillsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AssessmentData | null>(null);
    const [hasAssessment, setHasAssessment] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const sessionResult = sessionStorage.getItem("assessment_result");

            if (sessionResult) {
                try {
                    const parsed = JSON.parse(sessionResult);
                    setData({
                        career: parsed.analysis?.roadmap ?
                            (await getCareerFromDb()) || "Your Career" : "Your Career",
                        scores: parsed.scores,
                        analysis: parsed.analysis,
                    });
                    setHasAssessment(true);
                    sessionStorage.removeItem("assessment_result");
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Failed to parse session result:", e);
                }
            }

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: analysisData, error } = await supabase
                .from("skills_gap_analysis")
                .select(`
                    *,
                    user_assessments!inner(
                        selected_career,
                        career_score,
                        logic_score,
                        total_score
                    )
                `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (analysisData && !error) {
                setData({
                    career: analysisData.user_assessments.selected_career,
                    scores: {
                        career: analysisData.user_assessments.career_score,
                        logic: analysisData.user_assessments.logic_score,
                        total: analysisData.user_assessments.total_score,
                    },
                    analysis: {
                        readinessScore: analysisData.readiness_score,
                        gapAnalysis: analysisData.gap_analysis,
                        strengths: analysisData.strengths || [],
                        weaknesses: analysisData.weaknesses || [],
                        roadmap: analysisData.roadmap || { totalDuration: "", phases: [] },
                        recommendedChallenges: [],
                        immediateActions: [],
                    },
                });
                setHasAssessment(true);
            } else {
                setHasAssessment(false);
            }

            setLoading(false);
        };

        const getCareerFromDb = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from("career_selections")
                .select("career_name")
                .eq("user_id", user.id)
                .order("selected_at", { ascending: false })
                .limit(1)
                .single();

            return data?.career_name;
        };

        loadData();
    }, [supabase, router]);

    const getScoreColor = (score: number, max: number) => {
        const percentage = (score / max) * 100;
        if (percentage >= 70) return "text-green-500";
        if (percentage >= 50) return "text-amber-500";
        return "text-red-500";
    };

    const getReadinessLabel = (score: number) => {
        if (score >= 80) return "Excellent";
        if (score >= 60) return "Good";
        if (score >= 40) return "Fair";
        return "Needs Work";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    if (!hasAssessment) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md p-8 text-center">
                    <Brain className="h-16 w-16 mx-auto mb-4 text-violet-500" />
                    <h2 className="text-xl font-bold mb-2">No Assessment Found</h2>
                    <p className="text-muted-foreground mb-6">
                        Complete the career assessment to receive your personalized skill gap analysis.
                    </p>
                    <Button
                        onClick={() => router.push("/onboarding/career")}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600"
                    >
                        Start Assessment
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Card>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
                    <CheckCircle2 className="h-4 w-4" />
                    Assessment Complete
                </div>
                <h1 className="text-3xl font-bold mb-2">
                    Your Skill Gap Analysis
                </h1>
                <p className="text-muted-foreground">
                    Personalized roadmap for your journey to become a {data.career}
                </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                            <Sparkles className="h-6 w-6 text-violet-500" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Career Knowledge</p>
                        <p className={cn("text-3xl font-bold", getScoreColor(data.scores.career, 10))}>
                            {data.scores.career}/10
                        </p>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="p-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                            <Brain className="h-6 w-6 text-blue-500" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Logic & Aptitude</p>
                        <p className={cn("text-3xl font-bold", getScoreColor(data.scores.logic, 10))}>
                            {data.scores.logic}/10
                        </p>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="p-6 text-center bg-gradient-to-br from-violet-500/10 to-indigo-500/10">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mx-auto mb-3">
                            <Target className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Readiness Score</p>
                        <p className="text-3xl font-bold text-violet-600">
                            {data.analysis.readinessScore}%
                        </p>
                        <Badge variant="secondary" className="mt-2">
                            {getReadinessLabel(data.analysis.readinessScore)}
                        </Badge>
                    </Card>
                </motion.div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="p-6 h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="h-5 w-5 text-green-500" />
                            <h3 className="font-semibold">Your Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                            {data.analysis.strengths && data.analysis.strengths.length > 0 ? (
                                data.analysis.strengths.map((strength, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                        <span>{strength}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm text-muted-foreground italic">
                                    Complete a new assessment to see your strengths analysis.
                                </li>
                            )}
                        </ul>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="p-6 h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <h3 className="font-semibold">Areas to Improve</h3>
                        </div>
                        <ul className="space-y-2">
                            {data.analysis.weaknesses && data.analysis.weaknesses.length > 0 ? (
                                data.analysis.weaknesses.map((weakness, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                        <TrendingUp className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                        <span>{weakness}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm text-muted-foreground italic">
                                    Complete a new assessment to see improvement areas.
                                </li>
                            )}
                        </ul>
                    </Card>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Card className="p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-violet-500" />
                        <h3 className="font-semibold">Gap Analysis</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                        {data.analysis.gapAnalysis}
                    </p>
                </Card>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Card className="p-6 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-violet-500" />
                            <h3 className="font-semibold">Learning Roadmap</h3>
                        </div>
                        {data.analysis.roadmap?.totalDuration && (
                            <Badge variant="secondary" className="bg-violet-500/10 text-violet-600">
                                {data.analysis.roadmap.totalDuration}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-0">
                        {(data.analysis.roadmap?.phases || []).map((phase, i) => (
                            <div key={i} className="relative pl-8 border-l-2 border-violet-200 dark:border-violet-800 pb-8 last:pb-0 last:border-l-0">
                                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-violet-600 ring-4 ring-background" />

                                <div className="mb-3">
                                    <div className="flex items-baseline justify-between">
                                        <h4 className="font-semibold">{phase.name}</h4>
                                        <span className="text-xs text-muted-foreground">{phase.duration}</span>
                                    </div>
                                </div>

                                {phase.skills?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {phase.skills.map((skill, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {phase.milestones?.length > 0 && (
                                    <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1">
                                        {phase.milestones.map((m, idx) => (
                                            <li key={idx}>{m}</li>
                                        ))}
                                    </ul>
                                )}

                                {phase.resources?.length > 0 && (
                                    <div className="bg-muted/30 rounded-lg p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                            Resources
                                        </p>
                                        <div className="space-y-2">
                                            {phase.resources.map((res, rIdx) => (
                                                <a
                                                    key={rIdx}
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-md bg-background border hover:border-violet-500/50 hover:shadow-md transition-all text-sm group"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium group-hover:text-violet-600 transition-colors">{res.title}</span>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                            {res.provider && (
                                                                <span className="text-violet-600 font-medium">{res.provider}</span>
                                                            )}
                                                            <span className="capitalize bg-muted px-1.5 py-0.5 rounded">{res.type}</span>
                                                            <span className={res.cost === "free" ? "text-green-600" : "text-amber-600"}>
                                                                {res.cost === "free" ? "Free" : res.cost === "freemium" ? "Free tier" : "Paid"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ExternalLink className="h-4 w-4 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap justify-center gap-4"
            >
                <Link href="/trends">
                    <Button variant="outline" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        View Career Trends
                    </Button>
                </Link>
                <Link href="/challenges">
                    <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600">
                        <Target className="h-4 w-4" />
                        Start Coding Challenges
                    </Button>
                </Link>
                <Link href="/onboarding/career?retake=true">
                    <Button variant="ghost" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Retake Assessment
                    </Button>
                </Link>
            </motion.div>
        </div>
    );
}
