"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProctoring } from "@/hooks/useProctoring";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { executeCode, normalizeLanguage } from "@/lib/execution";
import { Loader2, Play, Send, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function TestSessionPage({ params }: { params: { code: string } }) {
    const code = params.code.toUpperCase();
    const router = useRouter();
    const [testData, setTestData] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const { startProctoring, stopProctoring, isRecording, stream } = useProctoring("test_session");
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

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
                .select("id")
                .eq("test_id", testInfo.id)
                .eq("student_id", userData.user.id)
                .single();

            if (sessionError || !sessionData) {
                router.push('/test');
                return;
            }
            
            setSessionId(sessionData.id);

            // Fetch questions
            const { data: qData, error: qError } = await supabase
                .from("test_questions")
                .select("*")
                .eq("test_id", testInfo.id)
                .order('id', { ascending: true });

            if (!qError && qData) {
                setQuestions(qData);
            }

            // Start proctoring
            startProctoring();
        };

        loadTest();

        return () => {
            mounted = false;
            stopProctoring();
        };
    }, [code, router]);

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleRunCode = async (question: any) => {
        const studentCode = answers[question.id] || question.content.starter_code?.javascript || "";
        const visibleTestCases = question.test_cases?.filter((tc: any) => !tc.is_hidden) || [];
        
        let passed = 0;
        let results = [];

        toast.info("Running code against visible test cases...");

        for (const tc of visibleTestCases) {
            const result = await executeCode(studentCode, 'javascript', tc.input);
            const isCorrect = result.success && result.output.trim() === tc.expected.trim();
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
        if (!confirm("Are you sure you want to submit your exam? You cannot undo this.")) return;
        
        setIsSubmitting(true);
        stopProctoring();

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
                    // Actual evaluation of all test cases will happen on the backend or via evaluation endpoint
                    // For now, save the raw code submission
                }

                return {
                    session_id: sessionId,
                    question_id: q.id,
                    student_answer: studentAnswer,
                    code_submission: q.type === 'coding' ? studentAnswer : null,
                    is_correct: isCorrect,
                    score: score
                };
            });

            await supabase.from("test_submissions").insert(submissions);

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
            startProctoring(); // Restart if failed
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
                    {isRecording && (
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
                        Submit Exam
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex relative">
                {/* Proctoring Video Feed */}
                <div className="absolute bottom-4 left-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-border shadow-xl z-50">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>

                <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
                    <Card className="p-8 border-border/40 bg-background/50 backdrop-blur-xl">
                        
                        <div className="mb-6">
                            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                                {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 
                                 currentQuestion.type === 'fill_in_blank' ? 'Fill in the Blank' : 'Coding Challenge'}
                            </span>
                        </div>

                        {currentQuestion.type === 'mcq' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold">{currentQuestion.content.question}</h2>
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
                                <div className="bg-muted p-6 rounded-xl font-mono text-sm whitespace-pre">
                                    {currentQuestion.content.code_snippet}
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Your Answer:</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 rounded-xl bg-background border border-border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                                        placeholder="Type the missing code here..."
                                        value={answers[currentQuestion.id] || ''}
                                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {currentQuestion.type === 'coding' && (
                            <div className="space-y-6 flex flex-col h-full min-h-[500px]">
                                <div>
                                    <h2 className="text-2xl font-semibold">{currentQuestion.content.title}</h2>
                                    <p className="text-muted-foreground mt-2">{currentQuestion.content.description}</p>
                                </div>
                                
                                <div className="flex-1 border rounded-xl overflow-hidden relative">
                                    <Editor
                                        height="400px"
                                        language="javascript"
                                        theme="vs-dark"
                                        value={answers[currentQuestion.id] ?? currentQuestion.content.starter_code?.javascript}
                                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            lineHeight: 1.6,
                                            padding: { top: 16, bottom: 16 },
                                            scrollBeyondLastLine: false,
                                        }}
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
            </main>
        </div>
    );
}
