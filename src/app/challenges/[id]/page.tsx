
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Editor from "@monaco-editor/react";
import {
    Play,
    Send,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    Loader2,
    Terminal,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


// Mock Data (In a real app, fetch from DB/API)
// For AI Generated challenges, we would fetch from `coding_challenges` table by ID.
// Mock Data Removed - Fetching from DB only

export default function ChallengeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState("description");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [challengeData, setChallengeData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Auto-detect language from code
    const detectLanguage = (codeStr: string): string => {
        const code = codeStr.trim();

        // Python patterns
        if (/^def\s+\w+\s*\(/.test(code) || /^import\s+\w+/.test(code) || /print\s*\(/.test(code)) {
            return "python";
        }
        // Java patterns
        if (/public\s+(static\s+)?class\s+/.test(code) || /public\s+static\s+void\s+main/.test(code)) {
            return "java";
        }
        // C++ patterns
        if (/#include\s*</.test(code) || /std::/.test(code) || /cout\s*<</.test(code)) {
            return "cpp";
        }
        // C patterns
        if (/#include\s*<stdio\.h>/.test(code) || /printf\s*\(/.test(code)) {
            return "c";
        }
        // TypeScript patterns
        if (/:\s*(string|number|boolean|void)\s*[=;)]/.test(code) || /interface\s+\w+\s*\{/.test(code)) {
            return "typescript";
        }
        // Default to JavaScript
        return "javascript";
    };

    // Fetch challenge from DB
    useEffect(() => {
        if (!params.id) return;

        const fetchChallenge = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from("coding_challenges")
                .select("*")
                .eq("id", params.id)
                .single();

            if (data && !error) {
                setChallengeData({
                    id: data.id,
                    title: data.title,
                    difficulty: data.difficulty,
                    description: data.description,
                    starterCode: data.starter_code,
                    fullData: data
                });
            } else {
                toast.error("Challenge not found or invalid ID");
            }
            setLoading(false);
        };

        fetchChallenge();
    }, [params.id]);

    // Update code when language changes
    useEffect(() => {
        // @ts-ignore
        setCode(challengeData?.starterCode?.[language] || "");
    }, [language, challengeData]);


    const [showAnalysis, setShowAnalysis] = useState(false);
    const [feedback, setFeedback] = useState<string>("");
    const [consoleOutput, setConsoleOutput] = useState<string>("");
    const [hasError, setHasError] = useState(false);
    const supabase = createClient();

    // Run code - real execution using Piston API
    const handleRun = async () => {
        if (!code.trim()) {
            toast.error("Please write some code first!");
            return;
        }

        // Auto-detect language from code
        const detectedLang = detectLanguage(code);
        setLanguage(detectedLang);

        setIsRunning(true);
        setActiveTab("console");
        setConsoleOutput("");
        setHasError(false);
        setFeedback("");

        try {
            const response = await fetch("/api/challenges/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: code,
                    language: detectedLang, // Use detected language
                }),
            });

            const result = await response.json();

            if (result.success) {
                setConsoleOutput(result.output || "(No output)");
                setHasError(false);
                setFeedback(`Executed with ${result.language} v${result.version}`);
                toast.success("✅ Code executed successfully!");
            } else {
                setConsoleOutput(result.error || "Unknown error occurred");
                setHasError(true);
                setFeedback("Execution failed");
                toast.error("❌ Error in code. Check output below.");
            }

        } catch (error) {
            console.error("Run error:", error);
            setConsoleOutput("Failed to connect to code execution service");
            setHasError(true);
            toast.error("Failed to run code. Please try again.");
        } finally {
            setIsRunning(false);
        }
    };

    // Submit code - execute, verify with AI, then save
    const handleSubmit = async () => {
        if (!code.trim()) {
            toast.error("Please write some code first!");
            return;
        }

        // Auto-detect language from code
        const detectedLang = detectLanguage(code);
        setLanguage(detectedLang);

        setIsRunning(true);
        setActiveTab("console");
        setConsoleOutput("");
        setHasError(false);

        try {
            // Check if user is logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please login to submit your solution");
                setIsRunning(false);
                return;
            }

            // Step 1: Execute the code using real compiler
            toast.info("Running your code...");

            const runResponse = await fetch("/api/challenges/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: code,
                    language: detectedLang, // Use detected language
                }),
            });

            const runResult = await runResponse.json();

            // Show execution result
            if (runResult.success) {
                setConsoleOutput(runResult.output || "(No output)");
                setHasError(false);
            } else {
                // If execution failed, don't proceed with verification
                setConsoleOutput(runResult.error || "Unknown error occurred");
                setHasError(true);
                setFeedback("Execution failed - fix errors first");
                toast.error("❌ Execution failed. Fix errors and try again.");
                setIsRunning(false);
                return;
            }

            // Step 2: Use AI to verify if the solution is correct
            toast.info("Verifying your solution with AI...");

            const verifyResponse = await fetch("/api/challenges/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: code,
                    language: language,
                    challenge: {
                        title: challengeData.title,
                        description: challengeData.description,
                    },
                    output: runResult.output, // Send actual output for verification
                }),
            });

            const verifyResult = await verifyResponse.json();
            const isCorrect = verifyResult.passed === true;

            // Update feedback with AI verification result
            setFeedback(verifyResult.feedback || (isCorrect ? "✅ Solution verified correct!" : "❌ Solution needs improvement"));

            if (isCorrect) {
                // Only save submission if correct
                const { error: dbError } = await supabase
                    .from("coding_submissions")
                    .insert({
                        user_id: user.id,
                        challenge_id: challengeData.id,
                        code: code,
                        language: language,
                        status: "passed",
                    });

                if (dbError) {
                    console.error("DB Error:", dbError);
                    toast.error("Failed to save submission");
                    setIsRunning(false);
                    return;
                }

                toast.success("🎉 Correct! Solution verified and saved.");
                setShowAnalysis(true);

                // Generate replacement challenge in background
                fetch("/api/challenges/bulk-generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ career: "Software Engineer", count: 1 }),
                }).catch(() => { });
            } else {
                toast.error("❌ Not correct. " + (verifyResult.feedback || "Check the AI feedback and try again."));
            }

        } catch (error) {
            console.error("Submit error:", error);
            setConsoleOutput("Failed to process submission");
            setHasError(true);
            toast.error("Submission failed. Please try again.");
        } finally {
            setIsRunning(false);
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading challenge context...</p>
            </div>
        );
    }

    if (!challengeData) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
                <p className="text-muted-foreground">Challenge not found. It may have been deleted.</p>
                <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-[calc(100vh-4rem)]", isFullScreen && "fixed inset-0 z-50 bg-background")}>
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="font-semibold flex items-center gap-2">
                            {challengeData.title}
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                                {challengeData.difficulty}
                            </Badge>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRun}
                        disabled={isRunning}
                    >
                        {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                        Run
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isRunning}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Submit
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                    >
                        {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Success Dialog - Shows actual feedback */}
            {showAnalysis && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md bg-card border-none shadow-2xl overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Challenge Solved! 🎉</h2>
                            <p className="text-muted-foreground text-sm mb-4">
                                Great job! Your solution has been saved.
                            </p>

                            {feedback && (
                                <div className="bg-muted/50 p-4 rounded-lg text-left mb-4">
                                    <p className="text-xs text-muted-foreground mb-1">AI Feedback</p>
                                    <p className="text-sm">{feedback}</p>
                                </div>
                            )}

                            <div className="flex gap-2 justify-center">
                                <Button variant="outline" onClick={() => setShowAnalysis(false)}>
                                    Close
                                </Button>
                                <Button
                                    className="bg-violet-600 hover:bg-violet-700"
                                    onClick={() => {
                                        setShowAnalysis(false);
                                        window.location.href = "/challenges";
                                    }}
                                >
                                    Next Challenge
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Problem Description */}
                <div className="w-1/2 border-r flex flex-col bg-card/30">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <div className="border-b px-2">
                            <TabsList className="bg-transparent">
                                <TabsTrigger value="description">Description</TabsTrigger>
                                <TabsTrigger value="hints">Hints</TabsTrigger>
                                <TabsTrigger value="console" className={cn(consoleOutput && "text-blue-500")}>
                                    <Terminal className="h-4 w-4 mr-2" />
                                    Output
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <TabsContent value="description" className="mt-0 space-y-4">
                                <div className="prose dark:prose-invert max-w-none">
                                    {/* Simple markdown rendering for now, can replace with react-markdown Later */}
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                        {challengeData.description}
                                    </pre>
                                </div>
                            </TabsContent>

                            <TabsContent value="console" className="mt-0">
                                {consoleOutput ? (
                                    <div className="space-y-4">
                                        {/* Status Header */}
                                        <div className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg",
                                            hasError ? "bg-red-500/10" : "bg-green-500/10"
                                        )}>
                                            {hasError ? (
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            ) : (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            )}
                                            <div>
                                                <p className={cn(
                                                    "font-medium",
                                                    hasError ? "text-red-600" : "text-green-600"
                                                )}>
                                                    {hasError ? "Execution Error" : "Executed Successfully"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{feedback}</p>
                                            </div>
                                        </div>

                                        {/* Console Output */}
                                        <div className="bg-[#1e1e1e] rounded-lg p-4 min-h-[150px] max-h-[300px] overflow-auto">
                                            <p className="text-xs text-gray-400 mb-2 font-mono">Output:</p>
                                            <pre className={cn(
                                                "font-mono text-sm whitespace-pre-wrap break-all",
                                                hasError ? "text-red-400" : "text-green-400"
                                            )}>
                                                {consoleOutput}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                                        <Terminal className="h-8 w-8 mb-2 opacity-50" />
                                        <p>Run your code to see output</p>
                                        <p className="text-xs text-muted-foreground mt-1">Click Run to execute your code</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Right Panel: Editor */}
                <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
                    <Editor
                        height="100%"
                        language={language}
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 4,
                            padding: { top: 16 }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
