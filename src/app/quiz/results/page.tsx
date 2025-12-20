// Quiz Results Page

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Trophy,
    ArrowRight,
    Download,
    RotateCcw,
    Briefcase,
    TrendingUp,
    GraduationCap,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import { useSessionStore } from "@/stores";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuizResult {
    personalityType: string;
    personalityProfile: {
        primary: string;
        strengths: string[];
        description: string;
        workStyle: string;
        preferredEnvironment: string;
    };
    scores: Record<string, number>;
    careers: Array<{
        name: string;
        description: string;
        matchScore: number;
        salary: { entry: string; mid: string; senior: string };
        growthOutlook: string;
        requiredEducation: string;
        topSkills: string[];
        whyMatch: string;
    }>;
}

export default function QuizResultsPage() {
    const router = useRouter();
    const { resetQuiz } = useSessionStore();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [selectedCareer, setSelectedCareer] = useState<number>(0);

    useEffect(() => {
        const storedResult = localStorage.getItem("quizResult");
        if (storedResult) {
            setResult(JSON.parse(storedResult));
        } else {
            router.push("/quiz");
        }
    }, [router]);

    const handleRetake = () => {
        resetQuiz();
        localStorage.removeItem("quizResult");
        router.push("/quiz");
    };

    if (!result) {
        return (
            <div className="container max-w-4xl mx-auto py-20 text-center">
                <div className="animate-pulse">Loading results...</div>
            </div>
        );
    }

    const radarData = [
        { dimension: "Realistic", value: result.scores.realistic },
        { dimension: "Investigative", value: result.scores.investigative },
        { dimension: "Artistic", value: result.scores.artistic },
        { dimension: "Social", value: result.scores.social },
        { dimension: "Enterprising", value: result.scores.enterprising },
        { dimension: "Conventional", value: result.scores.conventional },
    ];

    const barData = result.careers.slice(0, 5).map((career) => ({
        name: career.name.length > 15 ? career.name.substring(0, 15) + "..." : career.name,
        match: career.matchScore,
    }));

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg mb-4">
                    <Trophy className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Your Career Assessment Results</h1>
                <p className="text-muted-foreground">
                    Based on your responses, here is your personalized career profile
                </p>
            </motion.div>

            {/* Personality Profile */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid md:grid-cols-2 gap-6 mb-8"
            >
                {/* RIASEC Chart */}
                <Card className="p-6">
                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        Personality Profile: {result.personalityType}
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis
                                    dataKey="dimension"
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                />
                                <Radar
                                    name="Score"
                                    dataKey="value"
                                    stroke="hsl(271, 91%, 65%)"
                                    fill="hsl(271, 91%, 65%)"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Profile Summary */}
                <Card className="p-6">
                    <h2 className="font-semibold text-lg mb-4">Profile Summary</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Primary Type</p>
                            <p className="font-semibold text-lg">{result.personalityProfile.primary}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Description</p>
                            <p className="text-sm">{result.personalityProfile.description}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Work Style</p>
                            <p className="text-sm">{result.personalityProfile.workStyle}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Preferred Environment</p>
                            <p className="text-sm">{result.personalityProfile.preferredEnvironment}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Key Strengths</p>
                            <div className="flex flex-wrap gap-2">
                                {result.personalityProfile.strengths.map((strength) => (
                                    <Badge key={strength} variant="secondary">
                                        {strength}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Career Match Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
            >
                <Card className="p-6">
                    <h2 className="font-semibold text-lg mb-4">Top Career Matches</h2>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical">
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={120}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value) => [`${value}%`, "Match Score"]}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar
                                    dataKey="match"
                                    fill="url(#colorGradient)"
                                    radius={[0, 4, 4, 0]}
                                />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="hsl(271, 91%, 65%)" />
                                        <stop offset="100%" stopColor="hsl(250, 91%, 65%)" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* Career Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="font-semibold text-xl mb-4">Recommended Careers</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {result.careers.map((career, index) => (
                        <motion.div
                            key={career.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * index }}
                        >
                            <Card
                                className={cn(
                                    "p-4 cursor-pointer transition-all h-full",
                                    selectedCareer === index
                                        ? "border-2 border-violet-500 shadow-lg"
                                        : "hover:border-violet-500/50"
                                )}
                                onClick={() => setSelectedCareer(index)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm",
                                                index === 0
                                                    ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                                                    : index === 1
                                                        ? "bg-gradient-to-br from-gray-300 to-gray-400"
                                                        : index === 2
                                                            ? "bg-gradient-to-br from-amber-600 to-amber-700"
                                                            : "bg-gradient-to-br from-violet-500 to-indigo-600"
                                            )}
                                        >
                                            {index + 1}
                                        </div>
                                        <h3 className="font-semibold">{career.name}</h3>
                                    </div>
                                    <Badge
                                        variant={career.matchScore >= 80 ? "default" : "secondary"}
                                        className={
                                            career.matchScore >= 80
                                                ? "bg-green-500"
                                                : career.matchScore >= 60
                                                    ? "bg-amber-500"
                                                    : ""
                                        }
                                    >
                                        {career.matchScore}%
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    {career.description}
                                </p>
                                <Progress value={career.matchScore} className="h-1.5" />
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Selected Career Details */}
            {result.careers[selectedCareer] && (
                <motion.div
                    key={selectedCareer}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="p-6 border-2 border-violet-500/30">
                        <div className="flex items-center gap-3 mb-4">
                            <Briefcase className="h-6 w-6 text-violet-500" />
                            <h2 className="text-xl font-bold">
                                {result.careers[selectedCareer].name}
                            </h2>
                        </div>

                        <p className="text-muted-foreground mb-6">
                            {result.careers[selectedCareer].whyMatch}
                        </p>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <p className="text-sm font-medium">Salary Range (India)</p>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <p>
                                        <span className="text-muted-foreground">Entry:</span>{" "}
                                        {result.careers[selectedCareer].salary.entry}
                                    </p>
                                    <p>
                                        <span className="text-muted-foreground">Mid-Level:</span>{" "}
                                        {result.careers[selectedCareer].salary.mid}
                                    </p>
                                    <p>
                                        <span className="text-muted-foreground">Senior:</span>{" "}
                                        {result.careers[selectedCareer].salary.senior}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap className="h-4 w-4 text-blue-500" />
                                    <p className="text-sm font-medium">Education Required</p>
                                </div>
                                <p className="text-sm">
                                    {result.careers[selectedCareer].requiredEducation}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    <p className="text-sm font-medium">Growth Outlook</p>
                                </div>
                                <p className="text-sm">
                                    {result.careers[selectedCareer].growthOutlook}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <p className="text-sm font-medium mb-2">Top Skills Required</p>
                            <div className="flex flex-wrap gap-2">
                                {result.careers[selectedCareer].topSkills.map((skill) => (
                                    <Badge key={skill} variant="outline">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Link href={`/skills?career=${encodeURIComponent(result.careers[selectedCareer].name)}`}>
                                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600">
                                    Analyze Skills Gap
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href={`/trends?career=${encodeURIComponent(result.careers[selectedCareer].name)}`}>
                                <Button variant="outline">
                                    View Career Trends
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleRetake}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake Quiz
                </Button>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                </Button>
            </div>
        </div>
    );
}
