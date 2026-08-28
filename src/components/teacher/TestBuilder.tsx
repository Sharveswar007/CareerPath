"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, CheckCircle2 } from "lucide-react";

export type MCQ = { id: string; type: 'mcq'; question: string; options: string[]; correct_answer: string };
export type FillInBlank = { id: string; type: 'fill_in_blank'; code_snippet: string; correct_answer: string };
export type CodingQuestion = { id: string; type: 'coding'; title: string; description: string; language: string; starter_code: string; test_cases: { input: string; expected: string; is_hidden: boolean }[] };
export type CustomQuestion = MCQ | FillInBlank | CodingQuestion;

interface TestBuilderProps {
    onSave: (title: string, questions: CustomQuestion[]) => void;
}

export function TestBuilder({ onSave }: TestBuilderProps) {
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState<CustomQuestion[]>([]);

    const addMCQ = () => {
        setQuestions([...questions, { id: Date.now().toString(), type: 'mcq', question: '', options: ['', '', '', ''], correct_answer: '' }]);
    };

    const addFillInBlank = () => {
        setQuestions([...questions, { id: Date.now().toString(), type: 'fill_in_blank', code_snippet: '', correct_answer: '' }]);
    };

    const addCoding = () => {
        setQuestions([...questions, { id: Date.now().toString(), type: 'coding', title: '', description: '', language: 'python', starter_code: '', test_cases: [] }]);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: string, value: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateMCQOption = (id: string, index: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === id && q.type === 'mcq') {
                const newOptions = [...q.options];
                newOptions[index] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="custom-title">Exam Title</Label>
                <Input 
                    id="custom-title" 
                    placeholder="e.g. Midterm Assessment" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={addMCQ} className="flex-1 border-dashed"><Plus className="w-4 h-4 mr-2" /> MCQ</Button>
                <Button variant="outline" onClick={addFillInBlank} className="flex-1 border-dashed"><Plus className="w-4 h-4 mr-2" /> Fill-in-Blank</Button>
                <Button variant="outline" onClick={addCoding} className="flex-1 border-dashed"><Plus className="w-4 h-4 mr-2" /> Coding Sandbox</Button>
            </div>

            <div className="space-y-4">
                {questions.map((q, index) => (
                    <Card key={q.id} className="relative border-border/50 shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-2 top-2 text-muted-foreground hover:text-red-500"
                            onClick={() => removeQuestion(q.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/50">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                                <GripVertical className="w-4 h-4" /> 
                                Question {index + 1} ({q.type.replace(/_/g, ' ').toUpperCase()})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {q.type === 'mcq' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Question</Label>
                                        <Input value={q.question} onChange={(e) => updateQuestion(q.id, 'question', e.target.value)} placeholder="What is..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {q.options.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className={`shrink-0 w-8 h-8 rounded-full ${q.correct_answer === opt && opt !== '' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : ''}`}
                                                    onClick={() => updateQuestion(q.id, 'correct_answer', opt)}
                                                    disabled={opt === ''}
                                                    title="Mark as correct answer"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </Button>
                                                <Input 
                                                    value={opt} 
                                                    onChange={(e) => updateMCQOption(q.id, i, e.target.value)} 
                                                    placeholder={`Option ${i + 1}`} 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {q.type === 'fill_in_blank' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Code Snippet (Use ___ for the blank)</Label>
                                        <Textarea 
                                            value={q.code_snippet} 
                                            onChange={(e) => updateQuestion(q.id, 'code_snippet', e.target.value)} 
                                            placeholder="def add(a, b):&#10;    return ___" 
                                            className="font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Correct Answer</Label>
                                        <Input 
                                            value={q.correct_answer} 
                                            onChange={(e) => updateQuestion(q.id, 'correct_answer', e.target.value)} 
                                            placeholder="a + b" 
                                            className="font-mono"
                                        />
                                    </div>
                                </>
                            )}

                            {q.type === 'coding' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <Input value={q.title} onChange={(e) => updateQuestion(q.id, 'title', e.target.value)} placeholder="Two Sum" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Language</Label>
                                            <Select value={q.language} onValueChange={(val) => updateQuestion(q.id, 'language', val)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="python">Python</SelectItem>
                                                    <SelectItem value="java">Java</SelectItem>
                                                    <SelectItem value="c">C</SelectItem>
                                                    <SelectItem value="cpp">C++</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea value={q.description} onChange={(e) => updateQuestion(q.id, 'description', e.target.value)} placeholder="Given an array of integers..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Starter Code</Label>
                                        <Textarea value={q.starter_code} onChange={(e) => updateQuestion(q.id, 'starter_code', e.target.value)} className="font-mono h-24" placeholder="def two_sum(nums, target):&#10;    pass" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Test Cases</Label>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-xs"
                                                onClick={() => updateQuestion(q.id, 'test_cases', [...q.test_cases, { input: '', expected: '', is_hidden: false }])}
                                            >
                                                Add Case
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {q.test_cases.map((tc, tcIdx) => (
                                                <div key={tcIdx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border border-border/50">
                                                    <Input 
                                                        placeholder="Input (e.g. [2,7], 9)" 
                                                        value={tc.input} 
                                                        className="h-8 text-xs font-mono"
                                                        onChange={(e) => {
                                                            const newTcs = [...q.test_cases];
                                                            newTcs[tcIdx].input = e.target.value;
                                                            updateQuestion(q.id, 'test_cases', newTcs);
                                                        }} 
                                                    />
                                                    <Input 
                                                        placeholder="Output (e.g. [0,1])" 
                                                        value={tc.expected} 
                                                        className="h-8 text-xs font-mono"
                                                        onChange={(e) => {
                                                            const newTcs = [...q.test_cases];
                                                            newTcs[tcIdx].expected = e.target.value;
                                                            updateQuestion(q.id, 'test_cases', newTcs);
                                                        }} 
                                                    />
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className={`h-8 w-8 shrink-0 ${tc.is_hidden ? 'text-violet-500' : 'text-muted-foreground'}`}
                                                        onClick={() => {
                                                            const newTcs = [...q.test_cases];
                                                            newTcs[tcIdx].is_hidden = !tc.is_hidden;
                                                            updateQuestion(q.id, 'test_cases', newTcs);
                                                        }}
                                                        title="Toggle Hidden"
                                                    >
                                                        {tc.is_hidden ? "Hidden" : "Public"}
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        onClick={() => {
                                                            const newTcs = [...q.test_cases];
                                                            newTcs.splice(tcIdx, 1);
                                                            updateQuestion(q.id, 'test_cases', newTcs);
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
                
                {questions.length === 0 && (
                    <div className="text-center p-8 bg-muted/20 border border-dashed border-border/50 rounded-xl text-muted-foreground text-sm">
                        No questions added yet. Click the buttons above to build your test.
                    </div>
                )}
            </div>
            <Button className="w-full bg-violet-600 hover:bg-violet-700" disabled={!title || questions.length === 0} onClick={() => onSave(title, questions)}>
                Save Exam
            </Button>
        </div>
    );
}
