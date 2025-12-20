// AI-Powered Career Assessment Quiz Page
// Generates personalized questions based on user's target career

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Check,
    ClipboardList,
    Loader2,
    Sparkles,
    Brain,
    Target,
    Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface AIQuestion {
    id: string;
    category: "career_knowledge" | "technical" | "aptitude" | "personality" | "situation";
    type: "multiple_choice";
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
}

const CATEGORY_INFO = {
    career_knowledge: { name: "Career Knowledge", icon: Briefcase, color: "bg-violet-500" },
    technical: { name: "Technical", icon: Brain, color: "bg-blue-500" },
    aptitude: { name: "Aptitude & Logic", icon: Target, color: "bg-emerald-500" },
    personality: { name: "Personality", icon: Sparkles, color: "bg-pink-500" },
    situation: { name: "Situational", icon: ClipboardList, color: "bg-amber-500" },
};

export default function AIQuizPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [questions, setQuestions] = useState<AIQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userCareer, setUserCareer] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<{
        score: number;
        total: number;
        byCategory: Record<string, { correct: number; total: number }>;
    } | null>(null);

    useEffect(() => {
        const loadQuestions = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // Get user's career
            const { data: careerData } = await supabase
                .from("career_selections")
                .select("career_name")
                .eq("user_id", user.id)
                .order("selected_at", { ascending: false })
                .limit(1)
                .single();

            if (careerData?.career_name) {
                setUserCareer(careerData.career_name);
                await generateQuestions(careerData.career_name);
            } else {
                toast.error("Please select a career first");
                router.push("/onboarding/career");
            }

            setLoading(false);
        };

        loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generateQuestions = async (career: string) => {
        setGenerating(true);
        try {
            const response = await fetch("/api/assessment/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ career, questionCount: 20 }),
            });

            if (!response.ok) throw new Error("Failed to generate questions");

            const data = await response.json();
            setQuestions(data.questions || []);
            toast.success(`Generated ${data.totalQuestions} questions for ${career}`);
        } catch (error) {
            console.error("Generation error:", error);
            toast.error("Failed to generate questions. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const currentQuestion = questions[currentQuestionIndex];
    const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    const handleAnswer = (value: string) => {
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: parseInt(value),
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    // Helper to normalize category names
    const normalizeCategory = (category: string): string => {
        const lower = category.toLowerCase();
        // Career knowledge categories
        if (lower.includes("career") || lower.includes("technical") ||
            lower.includes("knowledge") || lower.includes("skill") ||
            lower.includes("tool") || lower.includes("technology")) {
            return "career_knowledge";
        }
        // Aptitude/Logic categories
        if (lower.includes("aptitude") || lower.includes("logic") ||
            lower.includes("reasoning") || lower.includes("pattern") ||
            lower.includes("numerical") || lower.includes("analytical")) {
            return "aptitude";
        }
        // Situational categories
        if (lower.includes("situation") || lower.includes("scenario") ||
            lower.includes("workplace") || lower.includes("judgment")) {
            return "situation";
        }
        // Default to career knowledge
        return "career_knowledge";
    };

    const calculateResults = () => {
        let correctCount = 0;
        const byCategory: Record<string, { correct: number; total: number }> = {};

        questions.forEach((q) => {
            // Normalize the category name
            const normalizedCategory = normalizeCategory(q.category);

            if (!byCategory[normalizedCategory]) {
                byCategory[normalizedCategory] = { correct: 0, total: 0 };
            }
            byCategory[normalizedCategory].total++;

            if (answers[q.id] === q.correctAnswer) {
                correctCount++;
                byCategory[normalizedCategory].correct++;
            }
        });

        return {
            score: correctCount,
            total: questions.length,
            byCategory,
        };
    };

    const handleSubmit = async () => {
        // Check if all questions are answered
        const unanswered = questions.filter((q) => answers[q.id] === undefined);
        if (unanswered.length > 0) {
            toast.error(`Please answer all questions. ${unanswered.length} remaining.`);
            const firstUnansweredIndex = questions.findIndex((q) => answers[q.id] === undefined);
            setCurrentQuestionIndex(firstUnansweredIndex);
            return;
        }

        setIsSubmitting(true);

        try {
            const calculatedResults = calculateResults();
            setResults(calculatedResults);

            // DEBUG: Log all categories to see what AI generated
            console.log("Questions categories:", questions.map(q => q.category));
            console.log("Calculated byCategory:", calculatedResults.byCategory);

            // Calculate scores from normalized categories
            const careerKnowledge = calculatedResults.byCategory["career_knowledge"] || { correct: 0, total: 0 };
            const aptitude = calculatedResults.byCategory["aptitude"] || { correct: 0, total: 0 };
            const situation = calculatedResults.byCategory["situation"] || { correct: 0, total: 0 };

            console.log("Career Knowledge:", careerKnowledge);
            console.log("Aptitude:", aptitude);
            console.log("Situation:", situation);

            // Career score from career knowledge
            const careerScore = Math.round(
                (careerKnowledge.correct / Math.max(careerKnowledge.total, 1)) * 10
            );

            // Logic score from aptitude + situational
            const logicTotalCorrect = aptitude.correct + situation.correct;
            const logicTotalQuestions = aptitude.total + situation.total;
            const logicScore = Math.round(
                (logicTotalCorrect / Math.max(logicTotalQuestions, 1)) * 10
            );

            console.log("Final scores - Career:", careerScore, "Logic:", logicScore);

            // Categorize questions using our normalize function
            const careerQuestionsList = questions
                .filter((q) => normalizeCategory(q.category) === "career_knowledge")
                .map((q) => ({
                    question: q.question,
                    isCorrect: answers[q.id] === q.correctAnswer,
                    selectedAnswer: q.options[answers[q.id]],
                    correctAnswer: q.options[q.correctAnswer],
                }));

            const logicQuestionsList = questions
                .filter((q) => {
                    const norm = normalizeCategory(q.category);
                    return norm === "aptitude" || norm === "situation";
                })
                .map((q) => ({
                    question: q.question,
                    isCorrect: answers[q.id] === q.correctAnswer,
                    selectedAnswer: q.options[answers[q.id]],
                    correctAnswer: q.options[q.correctAnswer],
                }));

            // Submit to assessment API
            const response = await fetch("/api/assessment/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    career: userCareer,
                    careerQuestions: careerQuestionsList,
                    logicQuestions: logicQuestionsList,
                    careerScore,
                    logicScore,
                    totalScore: careerScore + logicScore,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit assessment");
            }

            const responseData = await response.json();

            // Store analysis result for skills page
            sessionStorage.setItem("assessment_result", JSON.stringify({
                scores: {
                    career: careerScore,
                    logic: logicScore,
                    total: careerScore + logicScore,
                },
                analysis: responseData.analysis,
            }));

            toast.success("Assessment completed! Redirecting to skill analysis...");

            // Redirect to skills page to show updated analysis
            setTimeout(() => {
                router.push("/skills");
            }, 1500);
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || generating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-6 text-center"
                >
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 animate-pulse" />
                        <Brain className="h-10 w-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-bounce" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-2">Generating AI Assessment</h2>
                        <p className="text-muted-foreground">
                            Creating personalized questions for {userCareer || "your career"}...
                        </p>
                    </div>
                    <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                </motion.div>
            </div>
        );
    }

    if (showResults && results) {
        const percentage = Math.round((results.score / results.total) * 100);

        return (
            <div className="container max-w-3xl mx-auto py-8 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    <Card className="p-8 text-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                        <Sparkles className="h-16 w-16 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold mb-2">Assessment Complete!</h1>
                        <p className="text-white/80 mb-6">Here&apos;s how you performed</p>

                        <div className="text-6xl font-bold mb-2">{percentage}%</div>
                        <p className="text-lg">
                            {results.score} / {results.total} correct answers
                        </p>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Performance by Category</h2>
                        <div className="space-y-4">
                            {Object.entries(results.byCategory).map(([category, data]) => {
                                const catInfo = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO] || {
                                    name: category,
                                    color: "bg-gray-500",
                                };
                                const catPercentage = Math.round((data.correct / data.total) * 100);

                                return (
                                    <div key={category}>
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium">{catInfo.name}</span>
                                            <span className="text-muted-foreground">
                                                {data.correct}/{data.total} ({catPercentage}%)
                                            </span>
                                        </div>
                                        <Progress value={catPercentage} className="h-2" />
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <div className="flex gap-4">
                        <Button
                            onClick={() => router.push("/skills")}
                            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600"
                        >
                            View Skill Analysis
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/profile")}
                            className="flex-1"
                        >
                            Go to Profile
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="container max-w-3xl mx-auto py-8 px-4 text-center">
                <p>No questions available. Please try again.</p>
                <Button onClick={() => generateQuestions(userCareer || "Software Engineer")} className="mt-4">
                    Regenerate Questions
                </Button>
            </div>
        );
    }

    const categoryInfo = CATEGORY_INFO[currentQuestion.category as keyof typeof CATEGORY_INFO] || {
        name: currentQuestion.category,
        icon: ClipboardList,
        color: "bg-gray-500",
    };
    const CategoryIcon = categoryInfo.icon;

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-bold">AI Career Assessment</h1>
                        <p className="text-sm text-muted-foreground">
                            Personalized for {userCareer}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Progress Section */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                        {Math.round(progress)}% complete
                    </span>
                </div>
                <Progress value={progress} className="h-2" />

                {/* Category badges */}
                <div className="flex gap-2 mt-3 flex-wrap">
                    {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                        const categoryQuestions = questions.filter((q) => q.category === key);
                        if (categoryQuestions.length === 0) return null;

                        const answeredCount = categoryQuestions.filter((q) => answers[q.id] !== undefined).length;
                        const isActive = currentQuestion.category === key;
                        const isComplete = answeredCount === categoryQuestions.length;

                        return (
                            <Badge
                                key={key}
                                className={cn(
                                    "transition-colors",
                                    isActive
                                        ? `${info.color} text-white`
                                        : isComplete
                                            ? "bg-green-500/20 text-green-600"
                                            : "bg-muted text-muted-foreground"
                                )}
                            >
                                {info.name}
                                {isComplete && <Check className="ml-1 h-3 w-3" />}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* Question Card */}
            <Card className="p-6 border-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Category & Difficulty */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className={cn("p-2 rounded-lg", categoryInfo.color)}>
                                <CategoryIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium">{categoryInfo.name}</span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    currentQuestion.difficulty === "easy" && "border-green-500 text-green-500",
                                    currentQuestion.difficulty === "medium" && "border-amber-500 text-amber-500",
                                    currentQuestion.difficulty === "hard" && "border-red-500 text-red-500"
                                )}
                            >
                                {currentQuestion.difficulty}
                            </Badge>
                        </div>

                        {/* Question */}
                        <h2 className="text-xl font-semibold mb-6">{currentQuestion.question}</h2>

                        {/* Options */}
                        <RadioGroup
                            value={answers[currentQuestion.id]?.toString()}
                            onValueChange={handleAnswer}
                            className="space-y-3"
                        >
                            {currentQuestion.options.map((option, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <Label
                                        htmlFor={`option-${index}`}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                                            answers[currentQuestion.id] === index
                                                ? "border-violet-500 bg-violet-500/10"
                                                : "border-border hover:border-violet-300 hover:bg-muted/50"
                                        )}
                                    >
                                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                        <span>{option}</span>
                                    </Label>
                                </motion.div>
                            ))}
                        </RadioGroup>
                    </motion.div>
                </AnimatePresence>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
                <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Submit Assessment
                            </>
                        )}
                    </Button>
                ) : (
                    <Button onClick={handleNext} disabled={answers[currentQuestion.id] === undefined}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                )}
            </div>

            {/* Question dots navigation */}
            <div className="flex flex-wrap gap-1 mt-6 justify-center">
                {questions.map((q, index) => (
                    <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={cn(
                            "w-3 h-3 rounded-full transition-all",
                            index === currentQuestionIndex
                                ? "bg-violet-500 scale-125"
                                : answers[q.id] !== undefined
                                    ? "bg-green-500"
                                    : "bg-muted hover:bg-muted-foreground/30"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
