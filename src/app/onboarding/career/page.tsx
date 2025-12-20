// Career Selection Page - Onboarding Step 1

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Code2,
    Database,
    Brain,
    Palette,
    Shield,
    LineChart,
    Smartphone,
    Cloud,
    Gamepad2,
    Briefcase,
    Stethoscope,
    Building2,
    GraduationCap,
    Rocket,
    Search,
    ArrowRight,
    Loader2,
    Check,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const PREDEFINED_CAREERS = [
    {
        id: "software-engineer",
        name: "Software Engineer",
        icon: Code2,
        color: "from-blue-500 to-cyan-500",
        description: "Build applications and systems",
    },
    {
        id: "data-scientist",
        name: "Data Scientist",
        icon: Database,
        color: "from-purple-500 to-pink-500",
        description: "Analyze data and build ML models",
    },
    {
        id: "ai-ml-engineer",
        name: "AI/ML Engineer",
        icon: Brain,
        color: "from-violet-500 to-purple-500",
        description: "Create intelligent systems",
    },
    {
        id: "frontend-developer",
        name: "Frontend Developer",
        icon: Palette,
        color: "from-pink-500 to-rose-500",
        description: "Craft beautiful user interfaces",
    },
    {
        id: "backend-developer",
        name: "Backend Developer",
        icon: Cloud,
        color: "from-slate-500 to-gray-600",
        description: "Build server-side applications",
    },
    {
        id: "fullstack-developer",
        name: "Full-Stack Developer",
        icon: Rocket,
        color: "from-orange-500 to-amber-500",
        description: "Master both frontend and backend",
    },
    {
        id: "devops-engineer",
        name: "DevOps Engineer",
        icon: Cloud,
        color: "from-teal-500 to-emerald-500",
        description: "Automate and deploy systems",
    },
    {
        id: "cybersecurity-analyst",
        name: "Cybersecurity Analyst",
        icon: Shield,
        color: "from-red-500 to-orange-500",
        description: "Protect systems from threats",
    },
    {
        id: "mobile-developer",
        name: "Mobile Developer",
        icon: Smartphone,
        color: "from-green-500 to-emerald-500",
        description: "Build iOS and Android apps",
    },
    {
        id: "game-developer",
        name: "Game Developer",
        icon: Gamepad2,
        color: "from-indigo-500 to-blue-500",
        description: "Create interactive games",
    },
    {
        id: "product-manager",
        name: "Product Manager",
        icon: Briefcase,
        color: "from-amber-500 to-yellow-500",
        description: "Lead product development",
    },
    {
        id: "ux-designer",
        name: "UX/UI Designer",
        icon: Palette,
        color: "from-fuchsia-500 to-pink-500",
        description: "Design user experiences",
    },
    {
        id: "data-analyst",
        name: "Data Analyst",
        icon: LineChart,
        color: "from-cyan-500 to-blue-500",
        description: "Extract insights from data",
    },
    {
        id: "cloud-architect",
        name: "Cloud Architect",
        icon: Cloud,
        color: "from-sky-500 to-indigo-500",
        description: "Design cloud infrastructure",
    },
    {
        id: "blockchain-developer",
        name: "Blockchain Developer",
        icon: Database,
        color: "from-yellow-500 to-orange-500",
        description: "Build decentralized apps",
    },
];

export default function CareerSelectionPage() {
    const router = useRouter();
    const supabase = createClient();

    const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
    const [customCareer, setCustomCareer] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            // Check if this is a retake (allow bypassing onboarding check)
            const urlParams = new URLSearchParams(window.location.search);
            const isRetake = urlParams.get("retake") === "true";

            if (!isRetake) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("onboarding_complete")
                    .eq("id", user.id)
                    .single();

                if (profile?.onboarding_complete) {
                    router.push("/profile");
                    return;
                }
            }

            setCheckingAuth(false);
        };

        checkAuth();
    }, [supabase, router]);

    const filteredCareers = PREDEFINED_CAREERS.filter((career) =>
        career.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectCareer = (careerName: string) => {
        setSelectedCareer(careerName);
        setShowCustomInput(false);
        setCustomCareer("");
    };

    const handleCustomCareer = () => {
        setShowCustomInput(true);
        setSelectedCareer(null);
    };

    const handleContinue = async () => {
        const careerToSave = showCustomInput ? customCareer.trim() : selectedCareer;

        if (!careerToSave) {
            toast.error("Please select or enter a career path");
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("Please login to continue");
                router.push("/login");
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("career_selections").insert({
                user_id: user.id,
                career_name: careerToSave,
                is_custom: showCustomInput,
            });

            if (error) throw error;

            sessionStorage.setItem("selected_career", careerToSave);
            router.push("/onboarding/assessment");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save career selection";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
                        <GraduationCap className="h-4 w-4" />
                        Step 1 of 3
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        Choose Your Career Path
                    </h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Select the career you want to pursue. This will help us personalize your assessment and recommendations.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search careers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6"
                >
                    {filteredCareers.map((career, index) => {
                        const Icon = career.icon;
                        const isSelected = selectedCareer === career.name;

                        return (
                            <motion.div
                                key={career.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <Card
                                    onClick={() => handleSelectCareer(career.name)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg relative overflow-hidden group",
                                        isSelected
                                            ? "ring-2 ring-violet-500 border-violet-500"
                                            : "hover:border-violet-500/50"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                                            career.color
                                        )}
                                    >
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="font-medium text-sm mb-1 line-clamp-1">
                                        {career.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {career.description}
                                    </p>
                                </Card>
                            </motion.div>
                        );
                    })}

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: filteredCareers.length * 0.03 }}
                    >
                        <Card
                            onClick={handleCustomCareer}
                            className={cn(
                                "p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-dashed",
                                showCustomInput
                                    ? "ring-2 ring-violet-500 border-violet-500"
                                    : "hover:border-violet-500/50"
                            )}
                        >
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                                <Plus className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium text-sm mb-1">
                                Other Career
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Enter your own path
                            </p>
                        </Card>
                    </motion.div>
                </motion.div>

                <AnimatePresence>
                    {showCustomInput && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 max-w-md mx-auto"
                        >
                            <Card className="p-4">
                                <Label htmlFor="custom-career" className="text-sm font-medium mb-2 block">
                                    Enter your career path
                                </Label>
                                <Input
                                    id="custom-career"
                                    placeholder="e.g., Biotech Engineer, Film Director..."
                                    value={customCareer}
                                    onChange={(e) => setCustomCareer(e.target.value)}
                                    className="mb-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                    We will generate personalized questions based on your career choice.
                                </p>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center"
                >
                    <Button
                        onClick={handleContinue}
                        disabled={loading || (!selectedCareer && !customCareer.trim())}
                        size="lg"
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 min-w-[200px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                Continue to Assessment
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
