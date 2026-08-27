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
import { Users, FileQuestion, Plus, Loader2, Play, CheckCircle2, User, Key, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TeacherDashboard() {
    const router = useRouter();
    const [teacher, setTeacher] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
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
            fetchTests(supabase, session.user.id);
            fetchStudents(supabase, session.user.email || "");
            setLoading(false);
        };
        init();
    }, [router]);

    const fetchTests = async (supabase: any, teacherId: string) => {
        const sb = supabase as any;
        const { data } = await sb.from('tests')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });
        if (data) setTests(data);
    };

    const fetchStudents = async (supabase: any, teacherEmail: string) => {
        const sb = supabase as any;
        const { data } = await sb.from('profiles')
            .select('*')
            .eq('faculty_advisor_email', teacherEmail);
        if (data) setStudents(data);
    };

    const handleCreateTest = async () => {
        setIsCreatingTest(true);
        try {
            const supabase = createClient();
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            let title = "Custom Exam";
            if (testType === 'ai') {
                const focus = focusArea || "General Programming";
                title = `AI Exam: ${focus} (${difficulty})`;
            }

            const sb = supabase as any;
            const { data: testData, error: insertError } = await sb.from('tests')
                .insert({
                    teacher_id: teacher.id,
                    title,
                    code,
                    status: 'created',
                    generation_type: testType
                })
                .select()
                .single();

            if (insertError) throw insertError;

            if (testType === 'ai') {
                const res = await fetch('/api/exams/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        test_id: testData.id,
                        focus_area: focusArea || "General Programming",
                        difficulty: difficulty
                    })
                });
                if (!res.ok) throw new Error("AI Generation failed");
            }

            toast.success("Test created successfully!");
            setCreateModalOpen(false);
            fetchTests(supabase, teacher.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create test");
        } finally {
            setIsCreatingTest(false);
        }
    };

    const openLiveDashboard = async (test: any) => {
        setActiveTest(test);
        setLiveTestModalOpen(true);
        setLiveSessions([]);

        const supabase = createClient();
        const sb = supabase as any;

        // Fetch initial sessions
        const { data: sessions } = await sb.from('test_sessions')
            .select('id, student_id, status, profiles(full_name)')
            .eq('test_id', test.id);
        
        if (sessions) setLiveSessions(sessions);

        // Subscribe to changes
        sb.channel(`live-test-${test.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'test_sessions', filter: `test_id=eq.${test.id}` }, (payload: any) => {
                // Refetch sessions for simplicity
                sb.from('test_sessions')
                    .select('id, student_id, status, profiles(full_name)')
                    .eq('test_id', test.id)
                    .then(({ data }: any) => {
                        if (data) setLiveSessions(data);
                    });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tests', filter: `id=eq.${test.id}` }, (payload: any) => {
                setActiveTest((prev: any) => ({ ...prev, status: payload.new.status }));
                fetchTests(supabase, teacher.id);
            })
            .subscribe();
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
                <Tabs defaultValue="tests" className="w-full">
                    <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="tests" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileQuestion className="w-4 h-4 mr-2" /> Tests
                        </TabsTrigger>
                        <TabsTrigger value="students" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <User className="w-4 h-4 mr-2" /> Students
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tests" className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold">Your Exam Sessions</h2>
                            
                            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-violet-600 hover:bg-violet-700 shadow-md">
                                        <Plus className="w-4 h-4 mr-2" /> Create New Exam
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px] border-border/50 bg-card/80 backdrop-blur-2xl shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Create New Exam Session</DialogTitle>
                                        <DialogDescription>
                                            Generate an AI-powered assessment or create custom questions.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-4">
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

                                        {testType === 'ai' && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="focus">Focus Area</Label>
                                                    <Input 
                                                        id="focus" 
                                                        placeholder="e.g. React, Data Structures, Python Basics" 
                                                        value={focusArea}
                                                        onChange={(e) => setFocusArea(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="diff">Difficulty</Label>
                                                    <Select value={difficulty} onValueChange={setDifficulty}>
                                                        <SelectTrigger id="diff">
                                                            <SelectValue placeholder="Select difficulty" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Easy">Easy</SelectItem>
                                                            <SelectItem value="Medium">Medium</SelectItem>
                                                            <SelectItem value="Hard">Hard</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="bg-violet-500/10 text-violet-500 p-3 rounded-lg text-sm flex items-start gap-2">
                                                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <p>AI will generate 10 MCQs, 2 Fill-in-the-blanks, and 2 Coding sandbox questions based on this focus area.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateTest} disabled={isCreatingTest} className="bg-violet-600 hover:bg-violet-700">
                                            {isCreatingTest && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Generate Test
                                        </Button>
                                    </DialogFooter>
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
                                            <h3 className="font-semibold text-lg line-clamp-1">{test.title}</h3>
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
                                        <Button className="w-full" variant={test.status === 'started' ? 'default' : 'outline'} onClick={() => openLiveDashboard(test)}>
                                            Manage Session
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="students" className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold">Your Students</h2>
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {students.map(student => (
                                            <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-medium">{student.full_name || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{student.email}</td>
                                                <td className="px-6 py-4">{student.college || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                                session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                session.status === 'in_progress' ? 'bg-violet-500/10 text-violet-500' :
                                                                'bg-gray-500/10 text-gray-500'
                                                            }`}>
                                                                {session.status.toUpperCase()}
                                                            </span>
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
        </div>
    );
}

// Sparkles icon definition since we used it
const Sparkles = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/>
        <path d="M19 17v4"/>
        <path d="M3 5h4"/>
        <path d="M17 19h4"/>
    </svg>
)
