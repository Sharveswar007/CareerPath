"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProctoring } from "@/hooks/useProctoring";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { executeCode, normalizeLanguage } from "@/lib/execution/index";
import { Loader2, Play, Send, AlertTriangle, CheckCircle2, XCircle, Code2, ShieldAlert } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const EDITOR_OPTIONS = {
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 1.6,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
};

const FIB_EDITOR_OPTIONS = {
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 1.6,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    lineNumbers: "off" as const,
    folding: false,
    glyphMargin: false
};

export default function TestSessionPage() {
    const params = useParams<{ code: string }>();
    const code = params.code?.toUpperCase() || "";
    const router = useRouter();
    const [testData, setTestData] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [visited, setVisited] = useState<Record<string, boolean>>({});
    const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
    const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [isKicked, setIsKicked] = useState(false);
    const [showProctorWarning, setShowProctorWarning] = useState(false);
    const [warningReason, setWarningReason] = useState("");
    const MAX_VIOLATIONS = 3;

    const handleViolation = async (violationCount: number, reason: string) => {
        if (isKicked) return;

        if (violationCount >= MAX_VIOLATIONS) {
            setIsKicked(true);
            toast.error(`Exam Terminated: You have exceeded the maximum allowed violations (${MAX_VIOLATIONS}).`, {
                duration: 5000,
            });

            // Set session status to terminated
            if (sessionId) {
                try {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    // Set to 'completed' with no completed_at to distinguish it as a ban (since schema doesn't allow 'terminated')
                    await supabase.from("test_sessions").update({ status: 'completed' }).eq('id', sessionId);
                    
                    // Log final violation
                    await supabase.from("proctoring_violations").insert({
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        assessment_type: "live_exam",
                        violation_reason: `Terminated after ${MAX_VIOLATIONS} strikes (Final: ${reason})`,
                    });
                } catch (e) {
                    console.error("Failed to terminate session", e);
                }
            }

            // Kick them to home screen after 3 seconds
            setTimeout(() => {
                router.push("/");
            }, 3000);
            return;
        }

        // Show warning overlay
        setWarningReason(reason);
        setShowProctorWarning(true);
        toast.error(`Strike ${violationCount}/${MAX_VIOLATIONS}: ${reason}`, {
            duration: 5000,
        });
        
        // Log individual strike
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.from("proctoring_violations").insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                assessment_type: "live_exam",
                violation_reason: `Strike ${violationCount}: ${reason}`,
            });
        } catch (e) {
            console.error("Failed to log strike", e);
        }
    };

    const { isFullscreen, violations, startProctoring, exitFullscreen, stopProctoring } = useProctoring({
        onViolation: handleViolation,
        maxViolations: MAX_VIOLATIONS,
        enabled: hasStarted && !isKicked
    });

    useEffect(() => {
        let mounted = true;

        const loadTest = async () => {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.push('/login');
                return;
            }

            // Fetch test
            const { data: testInfo, error: testError } = await supabase
                .from("tests")
                .select("id, status")
                .eq("code", code)
                .single();

            if (testError || !testInfo || testInfo.status === 'completed') {
                router.push('/test');
                return;
            }

            setTestData(testInfo);

            // Fetch session
            const { data: sessionData, error: sessionError } = await supabase
                .from("test_sessions")
                .select("id, status")
                .eq("test_id", testInfo.id)
                .eq("student_id", userData.user.id)
                .single();

            if (sessionError || !sessionData) {
                router.push('/test');
                return;
            }
            
            if (sessionData.status === 'completed') {
                router.push('/test');
                return;
            }
            
            setSessionId(sessionData.id);

            // Fetch questions (without answers for security)
            const { data: qData, error: qError } = await supabase
                .from("test_questions")
                .select("id, test_id, type, content, test_cases")
                .eq("test_id", testInfo.id)
                .order('id', { ascending: true });

            if (!qError && qData && qData.length > 0) {
                setQuestions(qData);
                // Initialize default languages for coding questions
                const initialLanguages: Record<string, string> = {};
                qData.forEach(q => {
                    if (q.type === 'coding') {
                        initialLanguages[q.id] = 'python';
                    }
                });
                setSelectedLanguages(initialLanguages);
            } else {
                console.error("Failed to load questions:", qError);
                toast.error("Failed to load exam questions. Please try again.");
                router.push('/test');
            }
        };

        loadTest();

        return () => {
            mounted = false;
            exitFullscreen();
        };
    }, [code, router, exitFullscreen]);

    useEffect(() => {
        if (questions.length > 0) {
            setVisited(prev => ({ ...prev, [questions[currentQuestionIndex].id]: true }));
        }
    }, [currentQuestionIndex, questions]);

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleLanguageChange = (questionId: string, language: string) => {
        setSelectedLanguages(prev => ({
            ...prev,
            [questionId]: language
        }));
    };

    const handleRunCode = async (question: any) => {
        const lang = selectedLanguages[question.id] || 'python';
        const studentCode = answers[question.id] || question.content.starter_code?.[lang] || "";
        const visibleTestCases = question.test_cases?.filter((tc: any) => !tc.is_hidden) || [];
        
        let passed = 0;
        let results = [];

        toast.info(`Running ${lang} code against visible test cases...`);

        for (const tc of visibleTestCases) {
            const result = await executeCode(studentCode, lang, tc.input);
            const isCorrect = result.success && String(result.output).trim() === String(tc.expected).trim();
            if (isCorrect) passed++;
            
            results.push({
                input: tc.input,
                expected: tc.expected,
                actual: result.output.trim(),
                passed: isCorrect,
                error: result.error
            });
        }
        
        // Store visible test results in state to show the user
        setAnswers(prev => ({
            ...prev,
            [`${question.id}_results`]: results
        }));

        if (passed === visibleTestCases.length && visibleTestCases.length > 0) {
            toast.success(`Passed all ${visibleTestCases.length} visible test cases!`);
        } else {
            toast.error(`Passed ${passed}/${visibleTestCases.length} visible test cases.`);
        }
    };

    const handleSubmit = async () => {
        // Disable proctoring FIRST because the native confirm() dialog forces the browser out of full screen,
        // which triggers a cheating violation before we can stop it.
        stopProctoring();
        
        // Small timeout to allow the proctoring state to update before blocking the thread
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!confirm("Are you sure you want to submit your exam? You cannot undo this.")) {
            // User cancelled, so re-enable proctoring and return to full screen
            startProctoring();
            return;
        }
        
        setIsSubmitting(true);

        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            
            // Prepare submissions
            const submissions = questions.map(q => {
                let score = 0;
                let isCorrect = false;
                const studentAnswer = answers[q.id];

                if (q.type === 'mcq' || q.type === 'fill_in_blank') {
                    isCorrect = studentAnswer === q.answer?.correct_answer;
                    score = isCorrect ? 1 : 0;
                } else if (q.type === 'coding') {
                    // Score evaluation against hidden test cases happens securely on backend
                }

                return {
                    session_id: sessionId,
                    question_id: q.id,
                    student_answer: studentAnswer,
                    code_submission: q.type === 'coding' ? { code: studentAnswer, language: selectedLanguages[q.id] } : null,
                    is_correct: isCorrect,
                    score: score
                };
            });

            await supabase.from("test_submissions" as any).insert(submissions);

            // Trigger Evaluation
            const res = await fetch('/api/exams/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });

            if (!res.ok) throw new Error("Evaluation failed");

            toast.success("Exam submitted successfully!");
            router.push('/dashboard');
            
        } catch (error) {
            console.error("Submission Error", error);
            toast.error("Failed to submit exam. Please try again.");
            setIsSubmitting(false);
            if (hasStarted) startProctoring(); // Restart if failed
        }
    };

    const handleStartExam = async () => {
        const success = await startProctoring();
        if (success) {
            setHasStarted(true);
        }
    };

    if (questions.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    if (!hasStarted) {
        return (
            <div className="flex flex-col h-screen bg-background items-center justify-center p-6">
                <Card className="max-w-md w-full p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center text-violet-500">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Proctored Examination</h2>
                        <p className="text-muted-foreground mt-2">
                            This test is strictly proctored. You must grant Camera and Microphone permissions, and the test will lock into Fullscreen mode.
                        </p>
                    </div>
                    <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl text-left w-full">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Do not exit fullscreen.</li>
                            <li>Do not switch tabs or open other apps.</li>
                            <li>Copy-pasting is disabled.</li>
                            <li>Your camera and mic must remain active.</li>
                        </ul>
                    </div>
                    <Button onClick={handleStartExam} size="lg" className="w-full">
                        Grant Permissions & Start
                    </Button>
                </Card>
            </div>
        );
    }

    if (showProctorWarning) {
        return (
            <div className="flex flex-col h-screen bg-background items-center justify-center p-6 z-[9999] fixed inset-0">
                <Card className="max-w-md w-full p-8 flex flex-col items-center text-center space-y-6 border-red-500/50 shadow-2xl shadow-red-500/20 bg-card">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-red-500">Proctoring Warning</h2>
                        <p className="text-muted-foreground mt-2">
                            You have triggered a proctoring violation.
                        </p>
                    </div>
                    <div className="bg-muted p-4 rounded-xl text-sm font-medium border border-border w-full">
                        Reason: <span className="text-foreground font-bold">{warningReason}</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <span>Strikes:</span>
                        <span className="text-red-500">{violations}</span>
                        <span className="text-muted-foreground">/ {MAX_VIOLATIONS}</span>
                    </div>
                    {violations >= MAX_VIOLATIONS ? (
                        <div className="text-red-500 font-bold bg-red-500/10 p-3 rounded-lg w-full">
                            Exam Terminated. Redirecting...
                        </div>
                    ) : (
                        <Button 
                            size="lg"
                            className="w-full bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => {
                                setShowProctorWarning(false);
                                if (!isFullscreen) startProctoring();
                            }}
                        >
                            Acknowledge & Resume Exam
                        </Button>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/95">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">Exam Session</h1>
                    <span className="px-3 py-1 bg-violet-500/10 text-violet-500 rounded-full text-sm font-medium">
                        {currentQuestionIndex + 1} of {questions.length}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {isFullscreen && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full text-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Proctoring Active
                        </div>
                    )}
                    
                    <Button 
                        variant="destructive" 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Test
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex relative">
                <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
                    <Card className="p-8 border-border/40 bg-background/50 backdrop-blur-xl">
                        
                        <div className="mb-6 flex justify-between items-center">
                            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                                {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 
                                 currentQuestion.type === 'fill_in_blank' ? 'Fill in the Blank' : 'Coding Challenge'}
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-purple-500 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="accent-purple-500 w-4 h-4"
                                    checked={!!markedForReview[currentQuestion.id]}
                                    onChange={(e) => setMarkedForReview(prev => ({ ...prev, [currentQuestion.id]: e.target.checked }))}
                                />
                                Mark for Review
                            </label>
                        </div>

                        {currentQuestion.type === 'mcq' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {currentQuestion.content.question}
                                    </ReactMarkdown>
                                </h2>
                                <div className="space-y-3">
                                    {currentQuestion.content.options.map((option: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerChange(currentQuestion.id, option)}
                                            className={`w-full text-left px-6 py-4 rounded-xl border transition-all ${
                                                answers[currentQuestion.id] === option 
                                                ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                                                : 'border-border hover:border-violet-500/50 hover:bg-accent/50'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentQuestion.type === 'fill_in_blank' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold">Complete the code</h2>
                                <div className="bg-muted p-6 rounded-xl font-mono text-sm whitespace-pre overflow-x-auto border">
                                    {currentQuestion.content.code_snippet}
                                </div>
                                <div className="pt-4">
                                    <label className="text-sm font-medium mb-3 block text-violet-400 flex items-center">
                                        <Code2 className="w-4 h-4 mr-2" />
                                        Write your missing code here
                                    </label>
                                    <div className="border rounded-xl overflow-hidden ring-1 ring-border focus-within:ring-violet-500 transition-all">
                                        <Editor
                                            path={`fib-${currentQuestion.id}`}
                                            height="150px"
                                            language="plaintext"
                                            theme="vs-dark"
                                            defaultValue={answers[currentQuestion.id] || ''}
                                            onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                                            options={FIB_EDITOR_OPTIONS}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentQuestion.type === 'coding' && (
                            <div className="space-y-6 flex flex-col h-full min-h-[500px]">
                                <div>
                                    <h2 className="text-2xl font-semibold">{currentQuestion.content.title}</h2>
                                    <div className="text-muted-foreground mt-4 prose prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {currentQuestion.content.description}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-4">
                                    <label className="text-sm font-medium flex items-center text-violet-400">
                                        <Code2 className="w-4 h-4 mr-2" />
                                        Code Editor
                                    </label>
                                    <select 
                                        value={selectedLanguages[currentQuestion.id] || 'python'}
                                        onChange={(e) => handleLanguageChange(currentQuestion.id, e.target.value)}
                                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-violet-500"
                                    >
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="c">C</option>
                                        <option value="cpp">C++</option>
                                    </select>
                                </div>

                                <div className="flex-1 border rounded-xl overflow-hidden relative shadow-lg">
                                    <Editor
                                        path={`coding-${currentQuestion.id}`}
                                        height="400px"
                                        language={selectedLanguages[currentQuestion.id] || 'python'}
                                        theme="vs-dark"
                                        defaultValue={answers[currentQuestion.id] ?? currentQuestion.content.starter_code?.[selectedLanguages[currentQuestion.id] || 'python'] ?? ''}
                                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                                        options={EDITOR_OPTIONS}
                                    />
                                </div>

                                <div className="flex justify-between items-center">
                                    <Button onClick={() => handleRunCode(currentQuestion)} variant="secondary">
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Visible Test Cases
                                    </Button>
                                </div>
                                
                                {/* Visible Test Results */}
                                {answers[`${currentQuestion.id}_results`] && (
                                    <div className="mt-4 p-4 border rounded-xl bg-muted/50 space-y-3">
                                        <h3 className="font-semibold text-sm">Visible Test Results:</h3>
                                        {answers[`${currentQuestion.id}_results`].map((res: any, idx: number) => (
                                            <div key={idx} className="flex flex-col gap-1 text-sm p-3 bg-background rounded-lg border">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-muted-foreground">Input: {res.input}</span>
                                                    {res.passed ? (
                                                        <span className="text-green-500 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Passed</span>
                                                    ) : (
                                                        <span className="text-red-500 flex items-center"><XCircle className="w-4 h-4 mr-1"/> Failed</span>
                                                    )}
                                                </div>
                                                {!res.passed && (
                                                    <>
                                                        <div className="font-mono text-muted-foreground">Expected: {res.expected}</div>
                                                        <div className="font-mono text-muted-foreground">Actual: {res.actual || res.error}</div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-12 flex justify-between items-center pt-6 border-t border-border/50">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                            >
                                Previous
                            </Button>
                            
                            <Button
                                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                                disabled={currentQuestionIndex === questions.length - 1}
                            >
                                Next
                            </Button>
                        </div>
                    </Card>
                </div>
                
                {/* Question Palette Sidebar */}
                <div className="w-72 border-l border-border/40 bg-background/50 flex flex-col p-6 overflow-y-auto">
                    <h3 className="font-semibold mb-6 text-sm uppercase tracking-widest text-muted-foreground">Question Palette</h3>
                    
                    <div className="grid grid-cols-4 gap-3 mb-8">
                        {questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id];
                            const isMarked = markedForReview[q.id];
                            const isVisited = visited[q.id];
                            const isCurrent = currentQuestionIndex === idx;
                            
                            let bgClass = "bg-background border-border text-foreground"; // Not visited
                            
                            if (isMarked) {
                                bgClass = "bg-purple-500 text-white border-purple-500";
                            } else if (isAnswered) {
                                bgClass = "bg-emerald-500 text-white border-emerald-500";
                            } else if (isVisited) {
                                bgClass = "bg-orange-500 text-white border-orange-500";
                            }
                            
                            return (
                                <button 
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`h-12 w-12 rounded-lg flex items-center justify-center font-bold text-sm border-2 transition-all ${bgClass} ${isCurrent ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background scale-110' : 'hover:opacity-80 hover:scale-105'}`}
                                >
                                    {String(idx + 1).padStart(2, '0')}
                                </button>
                            )
                        })}
                    </div>
                    
                    <div className="space-y-4 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-border rounded-md" /> Not Visited
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-orange-500 rounded-md" /> Not Answered
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-emerald-500 rounded-md" /> Answered
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-purple-500 rounded-md" /> Marked for Review
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
