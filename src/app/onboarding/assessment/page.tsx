// Assessment Page - 20 Questions (10 Career + 10 Logic)

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain,
    Lightbulb,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle2,
    Target,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer?: number;
    category: "career_knowledge" | "aptitude" | "situation";
    difficulty?: string;
}

export default function AssessmentPage() {
    const router = useRouter();
    const supabase = createClient();

    const [career, setCareer] = useState<string>("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [phase, setPhase] = useState<"career_knowledge" | "aptitude" | "situation">("career_knowledge");

    useEffect(() => {
        const initAssessment = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const storedCareer = sessionStorage.getItem("selected_career");

            if (!storedCareer) {
                router.push("/onboarding/career");
                return;
            }

            setCareer(storedCareer);

            try {
                const response = await fetch("/api/assessment/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ career: storedCareer }),
                });

                if (!response.ok) {
                    throw new Error("Failed to generate questions");
                }

                const data = await response.json();
                // Validate and normalize questions to ensure options is always an array
                const validatedQuestions = (data.questions || []).map((q: Question) => ({
                    ...q,
                    options: Array.isArray(q.options) ? q.options : [],
                })).filter((q: Question) => q.options.length > 0);
                setQuestions(validatedQuestions);
            } catch (error) {
                toast.error("Failed to load assessment. Please try again.");
                router.push("/onboarding/career");
            } finally {
                setLoading(false);
            }
        };

        initAssessment();
    }, [supabase, router]);

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const careerQuestions = questions.filter((q) => q.category === "career_knowledge");
    const logicQuestions = questions.filter((q) => q.category === "aptitude" || q.category === "situation");

    useEffect(() => {
        if (currentQuestion) {
            setPhase(currentQuestion.category);
        }
    }, [currentQuestion]);

    const handleAnswer = (value: string) => {
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: parseInt(value),
        }));
    };

    const handleNext = () => {
        if (!answers[currentQuestion.id] && answers[currentQuestion.id] !== 0) {
            toast.error("Please select an answer");
            return;
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleSubmit = async () => {
        const unanswered = questions.filter(
            (q) => answers[q.id] === undefined
        );

        if (unanswered.length > 0) {
            toast.error(`Please answer all questions. ${unanswered.length} remaining.`);
            return;
        }

        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("Session expired. Please login again.");
                router.push("/login");
                return;
            }

            const careerQuestionsWithAnswers = careerQuestions.map((q) => ({
                ...q,
                userAnswer: answers[q.id],
                isCorrect: q.correctAnswer === answers[q.id],
            }));

            const logicQuestionsWithAnswers = logicQuestions.map((q) => ({
                ...q,
                userAnswer: answers[q.id],
                isCorrect: q.correctAnswer === answers[q.id],
            }));

            const careerScore = careerQuestionsWithAnswers.filter((q) => q.isCorrect).length;
            const logicScore = logicQuestionsWithAnswers.filter((q) => q.isCorrect).length;
            const totalScore = careerScore + logicScore;

            const response = await fetch("/api/assessment/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    career,
                    careerQuestions: careerQuestionsWithAnswers,
                    logicQuestions: logicQuestionsWithAnswers,
                    careerScore,
                    logicScore,
                    totalScore,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit assessment");
            }

            const result = await response.json();

            sessionStorage.setItem("assessment_result", JSON.stringify(result));
            sessionStorage.removeItem("selected_career");

            toast.success("Assessment completed successfully!");
            router.push("/skills");
        } catch (error) {
            toast.error("Failed to submit assessment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <div className="text-center">
                    <p className="font-medium">Generating your personalized assessment...</p>
                    <p className="text-sm text-muted-foreground">
                        Creating 20 questions tailored for {career || "your career"}
                    </p>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
                        <Target className="h-4 w-4" />
                        Step 2 of 3
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                        {career} Assessment
                    </h1>
                    <p className="text-muted-foreground">
                        Answer all 20 questions to receive your personalized skill gap analysis
                    </p>
                </motion.div>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">
                            Question {currentIndex + 1} of {questions.length}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                            {Math.round(progress)}% complete
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />

                    <div className="flex gap-2 mt-3">
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                phase === "career_knowledge"
                                    ? "bg-violet-500 text-white"
                                    : careerQuestions.every((q) => answers[q.id] !== undefined)
                                        ? "bg-green-500/20 text-green-600"
                                        : "bg-muted text-muted-foreground"
                            )}
                        >
                            <Sparkles className="h-3 w-3" />
                            Career Knowledge (1-10)
                            {careerQuestions.every((q) => answers[q.id] !== undefined) && (
                                <CheckCircle2 className="h-3 w-3" />
                            )}
                        </div>
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                (phase === "aptitude" || phase === "situation")
                                    ? "bg-violet-500 text-white"
                                    : logicQuestions.every((q) => answers[q.id] !== undefined)
                                        ? "bg-green-500/20 text-green-600"
                                        : "bg-muted text-muted-foreground"
                            )}
                        >
                            <Brain className="h-3 w-3" />
                            Logic & Aptitude (11-20)
                            {logicQuestions.every((q) => answers[q.id] !== undefined) && (
                                <CheckCircle2 className="h-3 w-3" />
                            )}
                        </div>
                    </div>
                </div>

                <Card className="p-6 mb-6 border-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestion.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div
                                className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4",
                                    currentQuestion.category === "career_knowledge"
                                        ? "bg-violet-500/10 text-violet-600"
                                        : "bg-blue-500/10 text-blue-600"
                                )}
                            >
                                {currentQuestion.category === "career_knowledge" ? (
                                    <>
                                        <Sparkles className="h-3 w-3" />
                                        Career Knowledge
                                    </>
                                ) : (
                                    <>
                                        <Brain className="h-3 w-3" />
                                        Logic & Aptitude
                                    </>
                                )}
                                {currentQuestion.difficulty && (
                                    <span className="ml-2 opacity-70">
                                        ({currentQuestion.difficulty})
                                    </span>
                                )}
                            </div>

                            <h2 className="text-lg font-semibold mb-6 leading-relaxed">
                                {currentQuestion.question}
                            </h2>

                            <RadioGroup
                                value={answers[currentQuestion.id]?.toString() || ""}
                                onValueChange={handleAnswer}
                                className="space-y-3"
                            >
                                {currentQuestion.options.map((option, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Label
                                            htmlFor={`option-${index}`}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                                                answers[currentQuestion.id] === index
                                                    ? "border-violet-500 bg-violet-500/10"
                                                    : "border-border hover:border-violet-500/50 hover:bg-accent"
                                            )}
                                        >
                                            <RadioGroupItem
                                                value={index.toString()}
                                                id={`option-${index}`}
                                            />
                                            <span className="flex-1">{option}</span>
                                        </Label>
                                    </motion.div>
                                ))}
                            </RadioGroup>
                        </motion.div>
                    </AnimatePresence>
                </Card>

                <div className="flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>

                    {currentIndex === questions.length - 1 ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || answers[currentQuestion.id] === undefined}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    Complete Assessment
                                    <CheckCircle2 className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={answers[currentQuestion.id] === undefined}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                </div>

                <div className="mt-8">
                    <p className="text-sm text-muted-foreground mb-2">Question Navigator:</p>
                    <div className="flex flex-wrap gap-1">
                        {questions.map((q, index) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(index)}
                                className={cn(
                                    "w-8 h-8 text-xs font-medium rounded transition-colors",
                                    currentIndex === index
                                        ? "bg-violet-500 text-white"
                                        : answers[q.id] !== undefined
                                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                            : "bg-muted text-muted-foreground hover:bg-accent"
                                )}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
