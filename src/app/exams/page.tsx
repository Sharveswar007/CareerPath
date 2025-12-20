// Entrance Exam Updates Page - AI-Generated Content

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    GraduationCap,
    Calendar,
    ExternalLink,
    Bell,
    Clock,
    FileText,
    Loader2,
    Search,
    Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Exam metadata - static info that doesn't change
const EXAMS = [
    {
        id: "jee-main",
        name: "JEE Main",
        fullName: "Joint Entrance Examination Main",
        category: "Engineering",
        conductingBody: "NTA",
        frequency: "Twice a year (January & April)",
        eligibility: "12th pass/appearing with PCM",
        officialUrl: "https://jeemain.nta.nic.in",
    },
    {
        id: "jee-advanced",
        name: "JEE Advanced",
        fullName: "Joint Entrance Examination Advanced",
        category: "Engineering",
        conductingBody: "IIT (Rotating)",
        frequency: "Once a year (May/June)",
        eligibility: "Top 2.5 lakh JEE Main qualifiers",
        officialUrl: "https://jeeadv.ac.in",
    },
    {
        id: "neet-ug",
        name: "NEET UG",
        fullName: "National Eligibility cum Entrance Test",
        category: "Medical",
        conductingBody: "NTA",
        frequency: "Once a year (May)",
        eligibility: "12th pass/appearing with PCB",
        officialUrl: "https://neet.nta.nic.in",
    },
    {
        id: "gate",
        name: "GATE",
        fullName: "Graduate Aptitude Test in Engineering",
        category: "PG Engineering",
        conductingBody: "IIT (Rotating)",
        frequency: "Once a year (February)",
        eligibility: "B.Tech/B.E. graduates or final year",
        officialUrl: "https://gate.iitk.ac.in",
    },
    {
        id: "cat",
        name: "CAT",
        fullName: "Common Admission Test",
        category: "Management",
        conductingBody: "IIM (Rotating)",
        frequency: "Once a year (November)",
        eligibility: "Graduation in any discipline",
        officialUrl: "https://iimcat.ac.in",
    },
    {
        id: "upsc-cse",
        name: "UPSC CSE",
        fullName: "Civil Services Examination",
        category: "Government",
        conductingBody: "UPSC",
        frequency: "Once a year",
        eligibility: "Graduation in any discipline, 21-32 years",
        officialUrl: "https://upsc.gov.in",
    },
    {
        id: "clat",
        name: "CLAT",
        fullName: "Common Law Admission Test",
        category: "Law",
        conductingBody: "Consortium of NLUs",
        frequency: "Once a year (December)",
        eligibility: "12th pass with 45%",
        officialUrl: "https://consortiumofnlus.ac.in",
    },
    {
        id: "nid",
        name: "NID DAT",
        fullName: "National Institute of Design Aptitude Test",
        category: "Design",
        conductingBody: "NID",
        frequency: "Once a year",
        eligibility: "12th pass for B.Des",
        officialUrl: "https://admissions.nid.edu",
    },
];

interface ExamUpdate {
    date: string;
    title: string;
    type: "notification" | "registration" | "admit_card" | "result" | "counselling";
    description?: string;
}

export default function ExamsPage() {
    const [selectedExam, setSelectedExam] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [updates, setUpdates] = useState<ExamUpdate[]>([]);
    const [loadingUpdates, setLoadingUpdates] = useState(false);

    const categories = ["all", ...new Set(EXAMS.map((e) => e.category))];

    const filteredExams = EXAMS.filter((exam) => {
        const matchesSearch =
            exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.fullName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            activeCategory === "all" || exam.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const selectedExamData = EXAMS.find((e) => e.id === selectedExam);

    // Fetch AI-generated updates when exam is selected
    useEffect(() => {
        if (!selectedExamData) {
            setUpdates([]);
            return;
        }

        const fetchUpdates = async () => {
            setLoadingUpdates(true);
            try {
                const response = await fetch("/api/exams/updates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        examName: selectedExamData.name,
                        examFullName: selectedExamData.fullName,
                        conductingBody: selectedExamData.conductingBody,
                        frequency: selectedExamData.frequency,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setUpdates(data.updates || []);
                } else {
                    setUpdates([]);
                }
            } catch (error) {
                console.error("Failed to fetch updates:", error);
                setUpdates([]);
            } finally {
                setLoadingUpdates(false);
            }
        };

        fetchUpdates();
    }, [selectedExamData]);

    const getTypeColor = (type: string) => {
        switch (type) {
            case "registration":
                return "bg-green-500";
            case "admit_card":
                return "bg-blue-500";
            case "result":
                return "bg-violet-500";
            case "counselling":
                return "bg-amber-500";
            default:
                return "bg-gray-500";
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "registration":
                return "bg-green-500/20 text-green-600";
            case "admit_card":
                return "bg-blue-500/20 text-blue-600";
            case "result":
                return "bg-violet-500/20 text-violet-600";
            case "counselling":
                return "bg-amber-500/20 text-amber-600";
            default:
                return "bg-gray-500/20 text-gray-600";
        }
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
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-bold">Entrance Exam Updates</h1>
                        <p className="text-sm text-muted-foreground">
                            AI-generated exam notifications and dates
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search exams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                    <TabsList>
                        {categories.map((cat) => (
                            <TabsTrigger key={cat} value={cat} className="capitalize">
                                {cat === "all" ? "All" : cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Exam List */}
                <div className="lg:col-span-1 space-y-3">
                    <h2 className="font-semibold mb-3">Select an Exam</h2>
                    {filteredExams.map((exam) => (
                        <Card
                            key={exam.id}
                            className={cn(
                                "p-4 cursor-pointer transition-all",
                                selectedExam === exam.id
                                    ? "border-2 border-violet-500 shadow-md"
                                    : "hover:border-violet-500/50"
                            )}
                            onClick={() => setSelectedExam(exam.id)}
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                                    <GraduationCap className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-medium">{exam.name}</h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {exam.fullName}
                                    </p>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        {exam.category}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Exam Details & Updates */}
                <div className="lg:col-span-2 space-y-6">
                    {!selectedExamData ? (
                        <Card className="p-12 text-center">
                            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                                Select an exam to view AI-generated updates
                            </p>
                        </Card>
                    ) : (
                        <motion.div
                            key={selectedExam}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Exam Info */}
                            <Card className="p-6">
                                <h2 className="text-xl font-bold mb-2">{selectedExamData.name}</h2>
                                <p className="text-muted-foreground mb-4">
                                    {selectedExamData.fullName}
                                </p>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Conducting Body</p>
                                        <p className="font-medium">{selectedExamData.conductingBody}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Frequency</p>
                                        <p className="font-medium">{selectedExamData.frequency}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-muted-foreground">Eligibility</p>
                                        <p className="font-medium">{selectedExamData.eligibility}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Timeline */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="h-5 w-5 text-violet-500" />
                                    <h3 className="font-semibold">Important Dates & Updates</h3>
                                    <Badge variant="outline" className="ml-auto">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        AI Generated
                                    </Badge>
                                </div>

                                {loadingUpdates ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-violet-500 mr-2" />
                                        <span className="text-muted-foreground">Generating updates...</span>
                                    </div>
                                ) : updates.length > 0 ? (
                                    <div className="space-y-4">
                                        {updates.map((update, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        className={cn(
                                                            "h-3 w-3 rounded-full",
                                                            getTypeColor(update.type)
                                                        )}
                                                    />
                                                    {index < updates.length - 1 && (
                                                        <div className="w-0.5 h-full bg-border mt-1" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium text-sm">{update.title}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {new Date(update.date).toLocaleDateString("en-IN", {
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                            </p>
                                                            {update.description && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {update.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Badge className={getTypeBadge(update.type)}>
                                                            {update.type.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm py-4">
                                        Unable to generate updates. Please try again later.
                                    </p>
                                )}
                            </Card>

                            {/* Quick Links */}
                            <Card className="p-6">
                                <h3 className="font-semibold mb-4">Quick Links</h3>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={selectedExamData.officialUrl} target="_blank" rel="noopener noreferrer">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Official Website
                                            <ExternalLink className="h-3 w-3 ml-1" />
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Bell className="h-4 w-4 mr-2" />
                                        Set Reminder
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Syllabus
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
