// Resume Analysis Page

"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
    FileText,
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    Sparkles,
    Target,
    FileSearch,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const TARGET_ROLES = [
    "Software Engineer",
    "Data Scientist",
    "Product Manager",
    "UX Designer",
    "DevOps Engineer",
    "AI/ML Engineer",
    "Full-Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Data Analyst",
];

interface AnalysisResult {
    overallScore: number;
    atsScore: number;
    sections: Array<{
        name: string;
        score: number;
        feedback: string;
        suggestions: string[];
    }>;
    missingKeywords: string[];
    strengthKeywords: string[];
    formatIssues: string[];
    recommendations: string[];
    _metadata?: {
        fileName: string;
        analyzedAt: string;
    };
}

export default function ResumePage() {
    const [resumeText, setResumeText] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const uploadedFile = acceptedFiles[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            setUploadedFileName(uploadedFile.name);
            
            // Only read as text if it's a text file (for preview)
            if (uploadedFile.type === "text/plain") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    setResumeText(text);
                };
                reader.readAsText(uploadedFile);
            } else if (uploadedFile.type === "application/pdf") {
                setResumeText("[PDF File Selected] Text will be extracted automatically.");
            } else if (uploadedFile.type.startsWith("image/")) {
                setResumeText("[Image File Selected] Text will be extracted using OCR.");
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/plain": [".txt"],
            "application/pdf": [".pdf"],
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    const analyzeResume = async () => {
        if ((!resumeText.trim() && !file) || isAnalyzing) return;

        setIsAnalyzing(true);

        try {
            const formData = new FormData();
            if (file) {
                formData.append("file", file);
            } else {
                formData.append("text", resumeText);
            }

            if (targetRole) {
                formData.append("targetRole", targetRole);
            }

            const response = await fetch("/api/resume/analyze", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Handle validation errors (non-resume document)
                if (errorData.error) {
                    const fullMessage = errorData.details
                        ? `${errorData.error}: ${errorData.details}`
                        : errorData.error;
                    toast.error(fullMessage, {
                        duration: 6000,
                        description: errorData.suggestion || undefined,
                    });
                    return; // Don't throw, just return
                }
                throw new Error("Analysis failed");
            }

            const result = await response.json();
            setAnalysisResult(result);
            toast.success("Resume analyzed successfully!");
        } catch (error: any) {
            console.error("Error analyzing resume:", error);
            toast.error(error.message || "Failed to analyze resume. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    const handleDownload = () => {
        if (!analysisResult) return;

        const date = new Date().toLocaleDateString();
        const content = `
CAREER GUIDANCE PLATFORM - RESUME ANALYSIS REPORT
Date: ${date}
Results for Role: ${targetRole || "General"}
File: ${uploadedFileName || "Pasted Text"}

=========================================
OVERALL SCORE: ${analysisResult.overallScore}/100
ATS SCORE: ${analysisResult.atsScore}/100
=========================================

SECTIONS ANALYSIS:
${analysisResult.sections.map(s => `
[${s.name.toUpperCase()}] - Score: ${s.score}/10
Feedback: ${s.feedback}
Suggestions:
${s.suggestions.map(sg => `  - ${sg}`).join('\n')}
`).join('\n-----------------------------------------\n')}

MISSING KEYWORDS:
${analysisResult.missingKeywords.map(k => `- ${k}`).join('\n')}

STRENGTH KEYWORDS:
${analysisResult.strengthKeywords.map(k => `- ${k}`).join('\n')}

FORMAT ISSUES:
${analysisResult.formatIssues.map(i => `- ${i}`).join('\n')}

RECOMMENDATIONS:
${analysisResult.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

        const blob = new Blob([content.trim()], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Resume_Analysis_${date.replace(/\//g, "-")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-bold">AI Resume Analysis</h1>
                        <p className="text-sm text-muted-foreground">
                            Get instant feedback and ATS optimization tips
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Input */}
                <div className="space-y-6">
                    {/* Upload Area */}
                    <Card
                        {...getRootProps()}
                        className={cn(
                            "p-8 border-2 border-dashed cursor-pointer transition-colors",
                            isDragActive
                                ? "border-violet-500 bg-violet-500/5"
                                : "hover:border-violet-500/50"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="text-center">
                            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                            {uploadedFileName ? (
                                <p className="text-sm font-medium text-violet-600">
                                    Uploaded: {uploadedFileName}
                                </p>
                            ) : (
                                <>
                                    <p className="font-medium mb-1">
                                        Drop your resume here or click to upload
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Supports PDF, Images (PNG, JPG), and TXT files
                                    </p>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Or paste text */}
                    <div className="text-center text-sm text-muted-foreground">
                        or paste your resume text directly
                    </div>

                    {/* Text Input */}
                    <Textarea
                        placeholder="Paste your resume content here..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                    />

                    {/* Target Role */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Target Role (Optional)
                        </label>
                        <Select value={targetRole} onValueChange={setTargetRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select target role for tailored analysis" />
                            </SelectTrigger>
                            <SelectContent>
                                {TARGET_ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Analyze Button */}
                    <Button
                        onClick={analyzeResume}
                        disabled={(!resumeText.trim() && !file) || isAnalyzing}
                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-600"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing Resume...
                            </>
                        ) : (
                            <>
                                <FileSearch className="h-4 w-4 mr-2" />
                                Analyze Resume
                            </>
                        )}
                    </Button>
                </div>

                {/* Right: Results */}
                <div className="space-y-6">
                    {!analysisResult ? (
                        <Card className="p-12 text-center h-full flex flex-col items-center justify-center">
                            <FileText className="h-16 w-16 mb-4 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                                Upload or paste your resume to get AI-powered analysis
                            </p>
                        </Card>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Scores */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-6 text-center">
                                    <div
                                        className={cn(
                                            "h-20 w-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white",
                                            getScoreBg(analysisResult.overallScore)
                                        )}
                                    >
                                        {analysisResult.overallScore}
                                    </div>
                                    <p className="font-medium">Overall Score</p>
                                    <p className="text-xs text-muted-foreground">Out of 100</p>
                                </Card>
                                <Card className="p-6 text-center">
                                    <div
                                        className={cn(
                                            "h-20 w-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white",
                                            getScoreBg(analysisResult.atsScore)
                                        )}
                                    >
                                        {analysisResult.atsScore}
                                    </div>
                                    <p className="font-medium">ATS Score</p>
                                    <p className="text-xs text-muted-foreground">Compatibility</p>
                                </Card>
                            </div>

                            {/* Section Scores */}
                            <Card className="p-6">
                                <h3 className="font-semibold mb-4">Section Analysis</h3>
                                <Tabs defaultValue="scores">
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="scores">Scores</TabsTrigger>
                                        <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="scores" className="space-y-3">
                                        {analysisResult.sections.map((section) => (
                                            <div key={section.name}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{section.name}</span>
                                                    <span className={getScoreColor(section.score)}>
                                                        {section.score}%
                                                    </span>
                                                </div>
                                                <Progress value={section.score} className="h-2" />
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <TabsContent value="suggestions" className="space-y-4">
                                        {analysisResult.sections.map((section) => (
                                            <div key={section.name}>
                                                <p className="font-medium text-sm">{section.name}</p>
                                                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                                                    {section.suggestions.map((sug, i) => (
                                                        <li key={i}>{sug}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            </Card>

                            {/* Keywords */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <p className="font-medium text-sm">Strong Keywords</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {analysisResult.strengthKeywords.map((keyword) => (
                                            <Badge key={keyword} className="bg-green-500/20 text-green-600">
                                                {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                </Card>
                                <Card className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <p className="font-medium text-sm">Missing Keywords</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {analysisResult.missingKeywords.map((keyword) => (
                                            <Badge key={keyword} variant="destructive">
                                                + {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                </Card>
                            </div>

                            {/* Format Issues */}
                            {analysisResult.formatIssues.length > 0 && (
                                <Card className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <p className="font-medium text-sm">Format Issues</p>
                                    </div>
                                    <ul className="space-y-1">
                                        {analysisResult.formatIssues.map((issue, i) => (
                                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                                <span className="text-amber-500">-</span>
                                                {issue}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            )}

                            {/* Recommendations */}
                            <Card className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4 text-violet-500" />
                                    <p className="font-medium text-sm">Top Recommendations</p>
                                </div>
                                <ol className="space-y-2">
                                    {analysisResult.recommendations.slice(0, 5).map((rec, i) => (
                                        <li key={i} className="text-sm flex gap-3">
                                            <span className="h-5 w-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 text-xs font-medium text-violet-600">
                                                {i + 1}
                                            </span>
                                            {rec}
                                        </li>
                                    ))}
                                </ol>
                            </Card>

                            {/* Download */}
                            <Button variant="outline" className="w-full" onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Full Report
                            </Button>

                            <Button
                                variant="default"
                                className="w-full bg-green-600 hover:bg-green-700 text-white mt-3"
                                disabled={isSaving}
                                onClick={async () => {
                                    if (!analysisResult) return;
                                    setIsSaving(true);
                                    try {
                                        const supabase = createClient();
                                        const { data: { user } } = await supabase.auth.getUser();
                                        
                                        if (!user) {
                                            toast.error("Please sign in to save your analysis");
                                            return;
                                        }

                                        const { error } = await supabase
                                            .from("resume_analyses")
                                            .insert({
                                                user_id: user.id,
                                                file_name: analysisResult._metadata?.fileName || uploadedFileName || "resume.txt",
                                                analysis_result: analysisResult,
                                                ats_score: analysisResult.atsScore || analysisResult.overallScore,
                                                suggestions: {
                                                    missingKeywords: analysisResult.missingKeywords,
                                                    formatIssues: analysisResult.formatIssues,
                                                    recommendations: analysisResult.recommendations,
                                                },
                                            });

                                        if (error) throw error;
                                        toast.success("Resume analysis saved to profile!");
                                    } catch (err) {
                                        console.error("Save error:", err);
                                        toast.error("Failed to save. Please try again.");
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                            >
                                {isSaving ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><CheckCircle className="h-4 w-4 mr-2" />Save to Profile</>
                                )}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
