"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, FileQuestion, Plus, Loader2, Play, User, Key, Calendar, Download, Target, Trophy, Mail, Phone, BookOpen, Trash2, CheckCircle2, XCircle, ChevronRight, Eye, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestBuilder, CustomQuestion } from "@/components/teacher/TestBuilder";

export default function TeacherDashboard() {
    const router = useRouter();
    const [teacher, setTeacher] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingTest, setIsCreatingTest] = useState(false);
    
    // Create Test Form State
    const [testType, setTestType] = useState("ai");
    const [focusArea, setFocusArea] = useState("");
    const [difficulty, setDifficulty] = useState("Medium");
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // Live Test State
    const [liveTestModalOpen, setLiveTestModalOpen] = useState(false);
    const [activeTest, setActiveTest] = useState<any>(null);
    const [liveSessions, setLiveSessions] = useState<any[]>([]);

    // Student Detail State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [sessionDetails, setSessionDetails] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (profile?.role !== 'teacher') {
                router.push('/dashboard');
                return;
            }

            setTeacher(session.user);
            await Promise.all([
                fetchTests(supabase, session.user.id),
                fetchStudents(supabase, session.user.email || "")
            ]);
            setLoading(false);
        };
        init();
    }, [router]);

    // Live Test Polling
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (liveTestModalOpen && activeTest?.id) {
            const fetchLiveStats = async () => {
                const supabase = createClient();
                const sb = supabase as any;
                
                const { data: sessions } = await sb.from('test_sessions')
                    .select('id, student_id, status, completed_at')
                    .eq('test_id', activeTest.id);
                
                if (sessions && sessions.length > 0) {
                    const studentIds = sessions.map((s: any) => s.student_id);
                    const { data: profiles } = await sb.from('profiles')
                        .select('id, full_name')
                        .in('id', studentIds);
                    
                    const enrichedSessions = sessions.map((s: any) => ({
                        ...s,
                        profiles: profiles?.find((p: any) => p.id === s.student_id) || null
                    }));
                    setLiveSessions(enrichedSessions);
                } else {
                    setLiveSessions([]);
                }
                
                const { data: testInfo } = await sb.from('tests')
                    .select('status')
                    .eq('id', activeTest.id)
                    .single();
                if (testInfo && testInfo.status !== activeTest.status) {
                    setActiveTest((prev: any) => ({ ...prev, status: testInfo.status }));
                    fetchTests(supabase, teacher.id); // Refresh tests list in background
                }
            };
            
            interval = setInterval(fetchLiveStats, 1000);
            fetchLiveStats(); // Initial fetch
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [liveTestModalOpen, activeTest?.id]); // Only re-run if modal opens or active test changes


    const fetchTests = async (supabase: any, teacherId: string) => {
        const sb = supabase as any;
        const { data } = await sb.from('tests')
            .select('*')
            .eq('creator_id', teacherId)
            .order('created_at', { ascending: false });
        if (data) setTests(data);
    };

    const fetchStudents = async (supabase: any, teacherEmail: string) => {
        const sb = supabase as any;
        
        // 1. Fetch Students
        const { data: studentData } = await sb.from('profiles')
            .select('*')
            .eq('faculty_advisor_email', teacherEmail);
            
        if (studentData) {
            setStudents(studentData);
            
            // 2. Fetch their test results for analytics
            const studentIds = studentData.map((s: any) => s.id);
            if (studentIds.length > 0) {
                const { data: resultsData } = await sb.from('test_results')
                    .select('*, tests(configuration, generation_type)')
                    .in('student_id', studentIds);
                
                if (resultsData) setTestResults(resultsData);
            }
        }
    };

    // --- Analytics Calculations ---
    const getStudentStats = (studentId: string) => {
        const studentTests = testResults.filter(tr => tr.student_id === studentId);
        const totalAssessments = studentTests.length;
        const avgScore = totalAssessments > 0 
            ? Math.round(studentTests.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / totalAssessments)
            : 0;
        return { totalAssessments, avgScore, history: studentTests };
    };

    const globalStats = {
        totalStudents: students.length,
        totalAssessments: testResults.length,
        avgScore: testResults.length > 0 
            ? Math.round(testResults.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / testResults.length)
            : 0
    };

    // --- CSV Export ---
    const exportCSV = () => {
        const headers = ["Student Name", "Email", "College", "Average Score", "Total Assessments"];
        const rows = students.map(student => {
            const stats = getStudentStats(student.id);
            return [
                student.full_name || 'Unknown',
                student.email,
                student.college || '-',
                stats.avgScore,
                stats.totalAssessments
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `student_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV Exported successfully!");
    };

    const generateRandomCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreateTest = async () => {
        if (!teacher) return;
        setIsCreatingTest(true);
        try {
            const supabase = createClient();
            const code = generateRandomCode();
            let title = `Skill Categorization Assessment (${difficulty})`;

            const sb = supabase as any;
            const { data: testData, error: insertError } = await sb.from('tests')
                .insert({
                    creator_id: teacher.id,
                    code,
                    status: 'created',
                    generation_type: 'ai_generated',
                    configuration: { title }
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const res = await fetch('/api/exams/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    test_id: testData.id,
                    difficulty: difficulty
                })
            });
            
            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                throw new Error(errData.error || "AI Generation failed");
            }

            toast.success("AI Test created successfully!");
            setCreateModalOpen(false);
            fetchTests(supabase, teacher.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create AI test");
        } finally {
            setIsCreatingTest(false);
        }
    };

    const handleSaveCustomTest = async (title: string, questions: CustomQuestion[]) => {
        if (!teacher) return;
        setIsCreatingTest(true);
        try {
            const supabase = createClient();
            const code = generateRandomCode();
            const sb = supabase as any;

            // Insert test
            const { data: testData, error: insertError } = await sb.from('tests')
                .insert({
                    creator_id: teacher.id,
                    code,
                    status: 'created',
                    generation_type: 'custom',
                    configuration: { title }
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Insert questions
            const questionInserts = questions.map(q => {
                if (q.type === 'mcq') {
                    return { test_id: testData.id, type: 'mcq', content: { question: q.question, options: q.options }, answer: { correct_answer: q.correct_answer } };
                } else if (q.type === 'fill_in_blank') {
                    return { test_id: testData.id, type: 'fill_in_blank', content: { code_snippet: q.code_snippet }, answer: { correct_answer: q.correct_answer } };
                } else if (q.type === 'coding') {
                    return { test_id: testData.id, type: 'coding', content: { title: q.title, description: q.description, language: q.language, starter_code: q.starter_code }, test_cases: q.test_cases };
                }
                return null;
            }).filter(Boolean);

            const { error: qError } = await sb.from("test_questions").insert(questionInserts);
            if (qError) throw qError;

            toast.success("Custom Test created successfully!");
            setCreateModalOpen(false);
            fetchTests(supabase, teacher.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save custom test");
        } finally {
            setIsCreatingTest(false);
        }
    };

    const openLiveDashboard = async (test: any) => {
        setActiveTest(test);
        setLiveTestModalOpen(true);
        setLiveSessions([]);
    };

    const handleUnban = async (sessionId: string) => {
        if (!confirm("Are you sure you want to unban this student? They will be allowed to re-enter the test.")) return;
        try {
            const supabase = createClient();
            const { error } = await supabase.from('test_sessions')
                .update({ status: 'in_progress', completed_at: null })
                .eq('id', sessionId);
            if (error) throw error;
            toast.success("Student unbanned successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to unban student.");
        }
    };

    const updateTestStatus = async (status: string) => {
        if (!activeTest) return;
        const supabase = createClient();
        const sb = supabase as any;
        
        try {
            await sb.from('tests').update({ status }).eq('id', activeTest.id);
            toast.success(`Exam ${status} successfully`);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const deleteTest = async (testId: string) => {
        if (!confirm("Are you sure you want to delete this exam? This will delete all student sessions and results. This cannot be undone.")) return;
        
        const supabase = createClient();
        const sb = supabase as any;
        try {
            // 1. Get all sessions for this test
            const { data: sessions, error: sessionsError } = await sb.from('test_sessions').select('id').eq('test_id', testId);
            if (sessionsError) throw sessionsError;

            const sessionIds = sessions?.map((s: any) => s.id) || [];

            // 2. Delete submissions for these sessions
            if (sessionIds.length > 0) {
                const { error: subError } = await sb.from('test_submissions').delete().in('session_id', sessionIds);
                if (subError) throw subError;
            }

            // 3. Delete results
            const { error: resError } = await sb.from('test_results').delete().eq('test_id', testId);
            if (resError) throw resError;

            // 4. Delete sessions
            const { error: sessDeleteError } = await sb.from('test_sessions').delete().eq('test_id', testId);
            if (sessDeleteError) throw sessDeleteError;

            // 5. Delete questions
            const { error: qError } = await sb.from('test_questions').delete().eq('test_id', testId);
            if (qError) throw qError;

            // 6. Delete the test
            const { error: testError } = await sb.from('tests').delete().eq('id', testId);
            if (testError) throw testError;

            toast.success("Exam deleted successfully");
            fetchTests(supabase, teacher.id);
        } catch (error: any) {
            console.error("Delete test error:", error);
            toast.error("Failed to delete exam: " + (error.message || "Unknown error"));
        }
    };

    const fetchSessionDetails = async (sessionId: string) => {
        const supabase = createClient();
        const sb = supabase as any;
        
        try {
            // Fetch results
            const { data: result } = await sb.from('test_results')
                .select('*')
                .eq('student_id', selectedSession.student_id)
                .eq('test_id', activeTest.id)
                .single();
                
            // Fetch submissions
            const { data: submissions } = await sb.from('test_submissions')
                .select('*, test_questions(type, content, test_cases)')
                .eq('session_id', sessionId);
                
            setSessionDetails({ result, submissions });
        } catch (error) {
            console.error("Failed to fetch session details:", error);
        }
    };

    useEffect(() => {
        if (selectedSession) {
            fetchSessionDetails(selectedSession.id);
        }
    }, [selectedSession]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10 p-4 px-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-violet-500/20 p-2 rounded-lg text-violet-500">
                        <Users className="w-5 h-5" />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">Teacher Portal</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{teacher?.email}</span>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-6 mt-6">
                <Tabs defaultValue="students" className="w-full">
                    <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="students" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <User className="w-4 h-4 mr-2" /> Students & Analytics
                        </TabsTrigger>
                        <TabsTrigger value="tests" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileQuestion className="w-4 h-4 mr-2" /> Manage Tests
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="students" className="space-y-6">
                        
                        {/* Analytics Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <Card className="p-6 bg-card/50 border-border/50 flex flex-col justify-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><Users className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Total Students</p>
                                        <h3 className="text-3xl font-bold">{globalStats.totalStudents}</h3>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-6 bg-card/50 border-border/50 flex flex-col justify-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-violet-500/10 text-violet-500 rounded-lg"><Target className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Average Score</p>
                                        <h3 className="text-3xl font-bold">{globalStats.avgScore} <span className="text-sm text-muted-foreground font-normal">pts</span></h3>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-6 bg-card/50 border-border/50 flex flex-col justify-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg"><Trophy className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Total Assessments</p>
                                        <h3 className="text-3xl font-bold">{globalStats.totalAssessments}</h3>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold">Student Roster</h2>
                            <Button variant="outline" onClick={exportCSV} className="border-border">
                                <Download className="w-4 h-4 mr-2" /> Export CSV
                            </Button>
                        </div>

                        {students.length === 0 ? (
                            <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No students registered yet</h3>
                                <p className="text-muted-foreground mt-1">Students will appear here once they sign up and assign you as their faculty advisor.</p>
                            </div>
                        ) : (
                            <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Student Name</th>
                                            <th className="px-6 py-4 font-medium">Email</th>
                                            <th className="px-6 py-4 font-medium">College</th>
                                            <th className="px-6 py-4 font-medium">Avg Score</th>
                                            <th className="px-6 py-4 font-medium">Assessments</th>
                                            <th className="px-6 py-4 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {students.map(student => {
                                            const stats = getStudentStats(student.id);
                                            return (
                                                <tr key={student.id} className="bg-card/50 hover:bg-card transition-colors cursor-pointer" onClick={async () => {
                                            setSelectedStudent(student);
                                            
                                            // Fetch latest test results for this specific student to ensure history is up-to-date
                                            const { createClient } = await import("@/lib/supabase/client");
                                            const supabase = createClient();
                                            const { data: latestResults } = await supabase.from('test_results')
                                                .select('*, tests(configuration, generation_type)')
                                                .eq('student_id', student.id);
                                                
                                            if (latestResults) {
                                                setTestResults(prev => {
                                                    // Remove old results for this student and append fresh ones
                                                    const filtered = prev.filter(tr => tr.student_id !== student.id);
                                                    return [...filtered, ...latestResults];
                                                });
                                            }
                                        }}>
                                                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center font-bold text-xs uppercase">
                                                            {(student.full_name || 'U').substring(0,2)}
                                                        </div>
                                                        {student.full_name || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">{student.email}</td>
                                                    <td className="px-6 py-4">{student.college || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold">{stats.avgScore}</span> pts
                                                    </td>
                                                    <td className="px-6 py-4">{stats.totalAssessments}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>View</Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tests" className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold">Your Exam Sessions</h2>
                            
                            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-violet-600 hover:bg-violet-700 shadow-md">
                                        <Plus className="w-4 h-4 mr-2" /> Create New Exam
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[1000px] border-border/50 bg-card/90 backdrop-blur-2xl shadow-2xl max-h-[90vh] flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle>Create New Exam Session</DialogTitle>
                                        <DialogDescription>
                                            Generate an AI-powered assessment or create custom questions.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-4 flex-1 overflow-y-auto pr-2">
                                        <div className="space-y-3">
                                            <Label>Exam Type</Label>
                                            <RadioGroup defaultValue={testType} onValueChange={setTestType} className="flex gap-4">
                                                <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg flex-1 border border-transparent hover:border-border transition-colors">
                                                    <RadioGroupItem value="ai" id="ai" />
                                                    <Label htmlFor="ai" className="cursor-pointer">AI Generated</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg flex-1 border border-transparent hover:border-border transition-colors">
                                                    <RadioGroupItem value="custom" id="custom" />
                                                    <Label htmlFor="custom" className="cursor-pointer">Custom Questions</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        {testType === 'ai' ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="diff">Target Difficulty</Label>
                                                    <Select value={difficulty} onValueChange={setDifficulty}>
                                                        <SelectTrigger id="diff">
                                                            <SelectValue placeholder="Select difficulty" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Easy">Beginner (Easy)</SelectItem>
                                                            <SelectItem value="Medium">Intermediate (Medium)</SelectItem>
                                                            <SelectItem value="Hard">Advanced (Hard)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="bg-violet-500/10 border border-violet-500/20 text-violet-500 p-4 rounded-xl text-sm flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <Sparkles className="w-4 h-4 shrink-0" />
                                                        Skill Categorization Assessment
                                                    </div>
                                                    <p className="text-muted-foreground">
                                                        This AI-generated exam is specifically designed to evaluate students and categorize them into:
                                                    </p>
                                                    <ul className="list-disc pl-5 space-y-1 mt-1 text-muted-foreground">
                                                        <li><strong className="text-violet-400">No Code:</strong> Basic understanding, unable to write syntax.</li>
                                                        <li><strong className="text-violet-400">Low Code:</strong> Can write basic code but struggles with complex logic.</li>
                                                        <li><strong className="text-violet-400">High Code:</strong> Advanced problem solver, writes optimal code.</li>
                                                    </ul>
                                                    <p className="mt-2 text-xs italic">
                                                        Includes 10 MCQs, 2 Fill-in-the-blanks, and 2 Coding Sandbox challenges.
                                                    </p>
                                                </div>
                                                <div className="mt-4 flex justify-end">
                                                    <Button variant="outline" className="mr-2" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                                                    <Button onClick={handleCreateTest} disabled={isCreatingTest} className="bg-violet-600 hover:bg-violet-700">
                                                        {isCreatingTest && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Generate Categorization Exam
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="border-t border-border/50 pt-4 mt-2">
                                                <TestBuilder onSave={handleSaveCustomTest} />
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {tests.length === 0 ? (
                            <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                                <FileQuestion className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No tests created yet</h3>
                                <p className="text-muted-foreground mt-1">Create your first exam session to get started.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tests.map(test => (
                                    <Card key={test.id} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-violet-500/30 transition-all flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-semibold text-lg line-clamp-1">
                                                {test.configuration?.title || (test.generation_type === 'ai_generated' ? 'AI Assessment' : 'Custom Assessment')}
                                            </h3>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                test.status === 'created' ? 'bg-violet-500/10 text-violet-500' :
                                                test.status === 'started' ? 'bg-emerald-500/10 text-emerald-500' :
                                                'bg-gray-500/10 text-gray-500'
                                            }`}>
                                                {test.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm text-muted-foreground mb-6 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Key className="w-4 h-4" />
                                                Code: <span className="font-mono text-foreground font-bold tracking-widest">{test.code}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Created: {new Date(test.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full mt-auto">
                                            <Button className="flex-1" variant={test.status === 'started' ? 'default' : 'outline'} onClick={() => openLiveDashboard(test)}>
                                                Manage
                                            </Button>
                                            <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => deleteTest(test.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            {/* Live Test Dashboard Modal */}
            <Dialog open={liveTestModalOpen} onOpenChange={setLiveTestModalOpen}>
                <DialogContent className="sm:max-w-[700px] border-border/50 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Live Exam Dashboard</DialogTitle>
                        <DialogDescription>Monitor student activity during the test.</DialogDescription>
                    </DialogHeader>
                    
                    {activeTest && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between bg-muted/50 p-4 rounded-xl border border-border/50">
                                <div>
                                    <p className="text-sm text-muted-foreground">Join Code</p>
                                    <p className="text-3xl font-mono font-bold tracking-widest text-violet-500">{activeTest.code}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground mb-2">Status: <span className="font-semibold text-foreground uppercase">{activeTest.status}</span></p>
                                    {activeTest.status === 'created' && (
                                        <Button onClick={() => updateTestStatus('started')} className="bg-emerald-600 hover:bg-emerald-700">
                                            <Play className="w-4 h-4 mr-2" /> Start Exam
                                        </Button>
                                    )}
                                    {activeTest.status === 'started' && (
                                        <Button onClick={() => updateTestStatus('completed')} variant="destructive">
                                            End Exam
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Live Participants ({liveSessions.length})
                                </h3>
                                <div className="border border-border/50 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                                    {liveSessions.length === 0 ? (
                                        <p className="text-center text-muted-foreground p-6 text-sm">No students have joined yet.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-border/50">
                                                {liveSessions.map(session => (
                                                    <tr key={session.id} className="bg-card/50">
                                                        <td className="px-4 py-3 font-medium">{session.profiles?.full_name || 'Unknown Student'}</td>
                                                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                                                                session.status === 'completed' && session.completed_at ? 'bg-emerald-500/10 text-emerald-500' :
                                                                (session.status === 'completed' && !session.completed_at) ? 'bg-red-500/20 text-red-500 font-bold border border-red-500/30' :
                                                                session.status === 'in_progress' ? 'bg-violet-500/10 text-violet-500' :
                                                                'bg-gray-500/10 text-gray-500'
                                                            }`}>
                                                                {(session.status === 'completed' && !session.completed_at) && <ShieldAlert className="w-3 h-3" />}
                                                                {(session.status === 'completed' && !session.completed_at) ? 'COMPLETED (MALPRACTICE)' : session.status.toUpperCase()}
                                                            </span>
                                                            {(session.status === 'completed' && !session.completed_at) && (
                                                                <Button variant="outline" size="sm" className="h-7 text-xs border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white" onClick={() => handleUnban(session.id)}>
                                                                    Unban
                                                                </Button>
                                                            )}
                                                            {session.status === 'completed' && (
                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedSession(session)}>
                                                                    <Eye className="w-4 h-4 text-violet-500" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Student Details Modal */}
            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="sm:max-w-[700px] border-border/50 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Student Profile</DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="py-4 space-y-6">
                            
                            {/* Profile Header */}
                            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                                <div className="w-16 h-16 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center text-xl font-bold uppercase">
                                    {(selectedStudent.full_name || 'U').substring(0,2)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedStudent.full_name || 'Unknown Student'}</h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedStudent.email}</span>
                                        {selectedStudent.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedStudent.phone}</span>}
                                    </div>
                                </div>
                            </div>

                            <Tabs defaultValue="overview">
                                <TabsList className="w-full bg-muted/50 rounded-lg p-1">
                                    <TabsTrigger value="overview" className="flex-1 rounded-md">Overview</TabsTrigger>
                                    <TabsTrigger value="history" className="flex-1 rounded-md">Test History</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="overview" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/30">
                                            <h4 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4" /> Academic Info</h4>
                                            <div className="text-sm space-y-1">
                                                <p><span className="text-muted-foreground">College:</span> {selectedStudent.college || 'N/A'}</p>
                                                <p><span className="text-muted-foreground">Degree:</span> {selectedStudent.current_education || 'N/A'}</p>
                                                <p><span className="text-muted-foreground">10th Marks:</span> {selectedStudent.tenth_marks || 'N/A'}</p>
                                                <p><span className="text-muted-foreground">12th Marks:</span> {selectedStudent.twelfth_marks || 'N/A'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/30">
                                            <h4 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Parent Details</h4>
                                            <div className="text-sm space-y-1">
                                                <p><span className="text-muted-foreground">Father:</span> {selectedStudent.father_name || 'N/A'}</p>
                                                <p><span className="text-muted-foreground">Mother:</span> {selectedStudent.mother_name || 'N/A'}</p>
                                                <p><span className="text-muted-foreground">Phone:</span> {selectedStudent.father_phone || selectedStudent.mother_phone || 'N/A'}</p>
                                                <p><span className="text-muted-foreground">Email:</span> {selectedStudent.father_email || selectedStudent.mother_email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                                
                                <TabsContent value="history" className="mt-4">
                                    <div className="border border-border/50 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                        {(() => {
                                            const history = getStudentStats(selectedStudent.id).history;
                                            if (history.length === 0) {
                                                return <div className="p-8 text-center text-muted-foreground text-sm">No tests completed yet.</div>;
                                            }
                                            return (
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-3 font-medium text-left">Test Name</th>
                                                            <th className="px-4 py-3 font-medium text-left">Date</th>
                                                            <th className="px-4 py-3 font-medium text-right">Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/50">
                                                        {history.map((result: any) => (
                                                            <tr key={result.id} className="bg-card/50">
                                                                <td className="px-4 py-3 font-medium">{result.tests?.configuration?.title || (result.tests?.generation_type === 'ai_generated' ? 'AI Assessment' : 'Custom Assessment')}</td>
                                                                <td className="px-4 py-3 text-muted-foreground">{new Date(result.created_at).toLocaleDateString()}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-violet-500">{result.total_score} pts</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            );
                                        })()}
                                    </div>
                                </TabsContent>
                            </Tabs>

                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Session Evaluation Details Modal */}
            <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
                <DialogContent className="sm:max-w-[800px] border-border/50 bg-card/95 backdrop-blur-xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detailed Evaluation Report</DialogTitle>
                        <DialogDescription>Review student performance for this specific exam session.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
                        {sessionDetails ? (
                            <>
                                {sessionDetails.result && (
                                    <div className="bg-violet-500/10 border border-violet-500/20 p-6 rounded-xl flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-violet-400 mb-1">Final Score: {sessionDetails.result.total_score}%</h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                Skill Category: 
                                                <span className="font-semibold text-foreground px-2 py-0.5 bg-background rounded-md border border-border">
                                                    {sessionDetails.result.coding_category}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg border-b border-border/50 pb-2">Question Breakdown</h3>
                                    
                                    {sessionDetails.submissions?.map((sub: any, idx: number) => {
                                        const q = sub.test_questions;
                                        const isCode = q.type === 'coding';
                                        
                                        // Calculate percentage for coding
                                        let codingPercentage = 0;
                                        if (isCode && q.test_cases?.length > 0) {
                                            codingPercentage = Math.round((sub.score / q.test_cases.length) * 100);
                                        }

                                        return (
                                            <div key={sub.id} className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Question {idx + 1} ({q.type})</span>
                                                        <p className="font-medium">{q.content?.question || q.content?.title || "Coding Challenge"}</p>
                                                    </div>
                                                    
                                                    {isCode ? (
                                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${codingPercentage === 100 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : codingPercentage > 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                                                            {codingPercentage === 100 ? 'Correct (100%)' : codingPercentage > 0 ? `Partial (${codingPercentage}%)` : 'Incorrect (0%)'}
                                                        </div>
                                                    ) : (
                                                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${sub.is_correct ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                                                            {sub.is_correct ? <><CheckCircle2 className="w-3 h-3"/> Correct</> : <><XCircle className="w-3 h-3"/> Incorrect</>}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="bg-background p-3 rounded-lg border border-border text-sm font-mono overflow-x-auto">
                                                    <span className="text-muted-foreground text-xs block mb-1">Student's Answer:</span>
                                                    {isCode ? (
                                                        <pre className="text-violet-300">{sub.code_submission?.code || sub.student_answer || "No code submitted"}</pre>
                                                    ) : (
                                                        <span className="text-foreground">{sub.student_answer || "No answer provided"}</span>
                                                    )}
                                                </div>

                                                {isCode && q.test_cases?.length > 0 && (
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-xs text-muted-foreground">Passed {sub.ai_evaluation?.original_passed !== undefined ? sub.ai_evaluation.original_passed : sub.score} out of {q.test_cases.length} strict test cases.</p>
                                                        {sub.ai_evaluation?.partial_percentage !== undefined && (
                                                            <p className="text-xs text-violet-500 font-medium">✨ AI Partial Score: {sub.ai_evaluation.partial_percentage}% for logical correctness</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

const Sparkles = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/>
        <path d="M19 17v4"/>
        <path d="M3 5h4"/>
        <path d="M17 19h4"/>
    </svg>
)
