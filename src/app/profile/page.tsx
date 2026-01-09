// Enhanced User Profile Page with Stunning UI and Animations

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    User,
    Mail,
    Phone,
    MapPin,
    GraduationCap,
    Briefcase,
    Target,
    TrendingUp,
    Code2,
    FileText,
    LogOut,
    Edit3,
    Check,
    X,
    Loader2,
    Award,
    Zap,
    Star,
    ChevronRight,
    Calendar,
    Trophy,
    Flame,
    Sparkles,
    Brain,
    Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { recordActivity, getActivityStats } from "@/lib/activity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileData {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    current_education: string | null;
    avatar_url: string | null;
    onboarding_complete: boolean;
    // New fields
    college: string | null;
    personal_email: string | null;
    date_of_birth: string | null;
    father_name: string | null;
    mother_name: string | null;
    father_email: string | null;
    mother_email: string | null;
    father_phone: string | null;
    mother_phone: string | null;
    faculty_advisor_name: string | null;
    faculty_advisor_email: string | null;
    tenth_marks: string | null;
    twelfth_marks: string | null;
}

interface AssessmentData {
    selected_career: string;
    career_score: number;
    logic_score: number;
    total_score: number;
    completed_at: string;
}

interface GapAnalysisData {
    readiness_score: number;
    target_career: string;
    strengths: string[];
    weaknesses: string[];
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const quickActions = [
    {
        href: "/chat",
        label: "AI Chat",
        icon: Sparkles,
        color: "from-pink-500 to-rose-600",
        description: "Career counseling",
    },
    {
        href: "/skills",
        label: "Skill Analysis",
        icon: Target,
        color: "from-violet-500 to-purple-600",
        description: "View your roadmap",
    },
    {
        href: "/trends",
        label: "Career Trends",
        icon: TrendingUp,
        color: "from-emerald-500 to-teal-600",
        description: "Job market insights",
    },
    {
        href: "/challenges",
        label: "Challenges",
        icon: Code2,
        color: "from-orange-500 to-amber-600",
        description: "Practice coding",
    },
    {
        href: "/resume",
        label: "Resume",
        icon: FileText,
        color: "from-blue-500 to-cyan-600",
        description: "Get ATS score",
    },
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: Rocket,
        color: "from-indigo-500 to-blue-600",
        description: "Overview",
    },
];

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [assessment, setAssessment] = useState<AssessmentData | null>(null);
    const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [challengesSolved, setChallengesSolved] = useState(0);
    const [resumesAnalyzed, setResumesAnalyzed] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [chatSessions, setChatSessions] = useState(0);
    const [latestAtsScore, setLatestAtsScore] = useState<number | null>(null);
    const [totalAssessments, setTotalAssessments] = useState(0);

    const [editForm, setEditForm] = useState({
        full_name: "",
        phone: "",
        location: "",
        current_education: "",
        // New fields
        college: "",
        personal_email: "",
        date_of_birth: "",
        father_name: "",
        mother_name: "",
        father_email: "",
        mother_email: "",
        father_phone: "",
        mother_phone: "",
        faculty_advisor_name: "",
        faculty_advisor_email: "",
        tenth_marks: "",
        twelfth_marks: "",
    });

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // Record activity for streak tracking
            await recordActivity(supabase, user.id);

            // Get activity stats
            const activityStats = await getActivityStats(supabase, user.id);
            setCurrentStreak(activityStats.currentStreak);

            // Load all data in parallel
            const [profileRes, assessmentRes, gapRes, challengesRes, resumesRes, chatRes, allAssessmentsRes] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).single(),
                supabase
                    .from("user_assessments")
                    .select("selected_career, career_score, logic_score, total_score, completed_at")
                    .eq("user_id", user.id)
                    .order("completed_at", { ascending: false })
                    .limit(1)
                    .single(),
                supabase
                    .from("skills_gap_analysis")
                    .select("readiness_score, target_career, strengths, weaknesses")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single(),
                supabase
                    .from("coding_submissions")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("status", "passed"),
                supabase
                    .from("resume_analyses")
                    .select("id, ats_score")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("chat_history")
                    .select("id")
                    .eq("user_id", user.id),
                supabase
                    .from("user_assessments")
                    .select("id")
                    .eq("user_id", user.id),
            ]);

            if (profileRes.data) {
                setProfile(profileRes.data);
                setEditForm({
                    full_name: profileRes.data.full_name || "",
                    phone: profileRes.data.phone || "",
                    location: profileRes.data.location || "",
                    current_education: profileRes.data.current_education || "",
                    // New fields
                    college: profileRes.data.college || "",
                    personal_email: profileRes.data.personal_email || "",
                    date_of_birth: profileRes.data.date_of_birth || "",
                    father_name: profileRes.data.father_name || "",
                    mother_name: profileRes.data.mother_name || "",
                    father_email: profileRes.data.father_email || "",
                    mother_email: profileRes.data.mother_email || "",
                    father_phone: profileRes.data.father_phone || "",
                    mother_phone: profileRes.data.mother_phone || "",
                    faculty_advisor_name: profileRes.data.faculty_advisor_name || "",
                    faculty_advisor_email: profileRes.data.faculty_advisor_email || "",
                    tenth_marks: profileRes.data.tenth_marks || "",
                    twelfth_marks: profileRes.data.twelfth_marks || "",
                });
            }

            if (assessmentRes.data) setAssessment(assessmentRes.data);
            if (gapRes.data) setGapAnalysis(gapRes.data);
            if (challengesRes.data) setChallengesSolved(challengesRes.data.length);
            if (resumesRes.data) {
                setResumesAnalyzed(resumesRes.data.length);
                // Get latest ATS score
                if (resumesRes.data.length > 0 && resumesRes.data[0].ats_score) {
                    setLatestAtsScore(resumesRes.data[0].ats_score);
                }
            }
            if (chatRes.data) setChatSessions(chatRes.data.length);
            if (allAssessmentsRes.data) setTotalAssessments(allAssessmentsRes.data.length);

            setLoading(false);
        };

        loadData();
    }, [supabase, router]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: editForm.full_name,
                    phone: editForm.phone,
                    location: editForm.location,
                    current_education: editForm.current_education,
                    // New fields
                    college: editForm.college || null,
                    personal_email: editForm.personal_email || null,
                    date_of_birth: editForm.date_of_birth || null,
                    father_name: editForm.father_name || null,
                    mother_name: editForm.mother_name || null,
                    father_email: editForm.father_email || null,
                    mother_email: editForm.mother_email || null,
                    father_phone: editForm.father_phone || null,
                    mother_phone: editForm.mother_phone || null,
                    faculty_advisor_name: editForm.faculty_advisor_name || null,
                    faculty_advisor_email: editForm.faculty_advisor_email || null,
                    tenth_marks: editForm.tenth_marks || null,
                    twelfth_marks: editForm.twelfth_marks || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", profile?.id);

            if (error) throw error;

            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        ...editForm,
                    }
                    : null
            );
            setEditing(false);
            toast.success("Profile updated successfully!");
        } catch {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 animate-pulse" />
                        <Loader2 className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin" />
                    </div>
                    <p className="text-muted-foreground">Loading your profile...</p>
                </motion.div>
            </div>
        );
    }

    const readinessScore = gapAnalysis?.readiness_score || 0;
    const getReadinessColor = (score: number) => {
        if (score >= 70) return "text-green-500";
        if (score >= 50) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-20 left-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
                    animate={{
                        x: [0, -50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container max-w-5xl mx-auto py-8 px-4 relative z-10"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8">
                    <Card className="p-6 overflow-hidden relative bg-gradient-to-br from-violet-500 to-indigo-600 border-0 text-white">
                        {/* Decorative Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-96 h-96 border border-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 border border-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Avatar */}
                            <motion.div
                                className="relative"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-xl">
                                    {profile?.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt="Avatar"
                                            className="h-20 w-20 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <User className="h-10 w-10 text-white" />
                                    )}
                                </div>
                                {profile?.onboarding_complete && (
                                    <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </motion.div>

                            {/* User Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold">
                                        {profile?.full_name || "Welcome!"}
                                    </h1>
                                    <Badge className="bg-white/20 text-white border-white/30">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Pro Member
                                    </Badge>
                                </div>
                                <p className="text-white/80 flex items-center gap-2 mb-3">
                                    <Mail className="h-4 w-4" />
                                    {profile?.email}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {assessment?.selected_career && (
                                        <Badge className="bg-white/20 text-white border-white/30">
                                            <Briefcase className="h-3 w-3 mr-1" />
                                            {assessment.selected_career}
                                        </Badge>
                                    )}
                                    {profile?.location && (
                                        <Badge className="bg-white/20 text-white border-white/30">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {profile.location}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEditing(true)}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                >
                                    <Edit3 className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                >
                                    <LogOut className="h-4 w-4 mr-1" />
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Edit Profile Modal */}
                <AnimatePresence>
                    {editing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setEditing(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card className="p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold">Edit Profile</h2>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditing(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-6">
                                        {/* Personal Information */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-violet-600 mb-3 flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Personal Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Full Name <span className="text-red-500">*</span></label>
                                                    <Input
                                                        value={editForm.full_name}
                                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                        placeholder="Your name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Date of Birth <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        type="date"
                                                        value={editForm.date_of_birth}
                                                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Location <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.location}
                                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                        placeholder="City, Country"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Information */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                Contact Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Phone <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                        placeholder="+91 XXXXX XXXXX"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Personal Email <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        type="email"
                                                        value={editForm.personal_email}
                                                        onChange={(e) => setEditForm({ ...editForm, personal_email: e.target.value })}
                                                        placeholder="personal@email.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Information */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                Academic Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Current Education <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.current_education}
                                                        onChange={(e) => setEditForm({ ...editForm, current_education: e.target.value })}
                                                        placeholder="B.Tech CSE, 3rd Year"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">College/Institution <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.college}
                                                        onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                                                        placeholder="Your college name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">10th Marks <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.tenth_marks}
                                                        onChange={(e) => setEditForm({ ...editForm, tenth_marks: e.target.value })}
                                                        placeholder="e.g., 95% or 9.5 CGPA"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">12th Marks <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.twelfth_marks}
                                                        onChange={(e) => setEditForm({ ...editForm, twelfth_marks: e.target.value })}
                                                        placeholder="e.g., 92% or 9.2 CGPA"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Faculty Advisor Name <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        value={editForm.faculty_advisor_name}
                                                        onChange={(e) => setEditForm({ ...editForm, faculty_advisor_name: e.target.value })}
                                                        placeholder="Advisor's name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">FA Email <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                                    <Input
                                                        type="email"
                                                        value={editForm.faculty_advisor_email}
                                                        onChange={(e) => setEditForm({ ...editForm, faculty_advisor_email: e.target.value })}
                                                        placeholder="advisor@college.edu"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Family Information */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-amber-600 mb-3">
                                                👨‍👩‍👧 Family Information <span className="text-muted-foreground text-xs font-normal">(All Optional)</span>
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Father's Name</label>
                                                    <Input
                                                        value={editForm.father_name}
                                                        onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
                                                        placeholder="Father's name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Mother's Name</label>
                                                    <Input
                                                        value={editForm.mother_name}
                                                        onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })}
                                                        placeholder="Mother's name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Father's Email</label>
                                                    <Input
                                                        type="email"
                                                        value={editForm.father_email}
                                                        onChange={(e) => setEditForm({ ...editForm, father_email: e.target.value })}
                                                        placeholder="father@email.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Mother's Email</label>
                                                    <Input
                                                        type="email"
                                                        value={editForm.mother_email}
                                                        onChange={(e) => setEditForm({ ...editForm, mother_email: e.target.value })}
                                                        placeholder="mother@email.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Father's Phone</label>
                                                    <Input
                                                        value={editForm.father_phone}
                                                        onChange={(e) => setEditForm({ ...editForm, father_phone: e.target.value })}
                                                        placeholder="+91 XXXXX XXXXX"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Mother's Phone</label>
                                                    <Input
                                                        value={editForm.mother_phone}
                                                        onChange={(e) => setEditForm({ ...editForm, mother_phone: e.target.value })}
                                                        placeholder="+91 XXXXX XXXXX"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setEditing(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600"
                                                onClick={handleSave}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Check className="h-4 w-4 mr-2" />
                                                )}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats Row */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                    <Brain className="h-5 w-5 text-violet-600" />
                                </div>
                            </div>
                            <p className={cn("text-3xl font-bold", getReadinessColor(readinessScore))}>
                                {readinessScore}%
                            </p>
                            <p className="text-xs text-muted-foreground">Career Ready</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-emerald-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{challengesSolved}</p>
                            <p className="text-xs text-muted-foreground">Challenges Solved</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                    <Flame className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{currentStreak}</p>
                            <p className="text-xs text-muted-foreground">Day Streak</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{resumesAnalyzed}</p>
                            <p className="text-xs text-muted-foreground">Resumes Analyzed</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-pink-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{chatSessions}</p>
                            <p className="text-xs text-muted-foreground">Chat Sessions</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                    <Award className="h-5 w-5 text-cyan-600" />
                                </div>
                            </div>
                            <p className={cn("text-3xl font-bold", latestAtsScore ? (latestAtsScore >= 70 ? "text-green-500" : latestAtsScore >= 50 ? "text-amber-500" : "text-red-500") : "")}>
                                {latestAtsScore ? `${latestAtsScore}%` : "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">ATS Score</p>
                        </div>
                    </Card>
                </motion.div>

                {/* Assessment & Career Readiness */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Assessment Results */}
                    <motion.div variants={itemVariants}>
                        <Card className="p-6 h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="h-5 w-5 text-violet-500" />
                                <h2 className="font-semibold">Assessment Results</h2>
                            </div>

                            {assessment ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <span className="text-sm">Career Path</span>
                                        <Badge className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white">
                                            {assessment.selected_career}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Career Knowledge</span>
                                                <span className="font-medium">{assessment.career_score}/10</span>
                                            </div>
                                            <Progress
                                                value={assessment.career_score * 10}
                                                className="h-2"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Logic & Aptitude</span>
                                                <span className="font-medium">{assessment.logic_score}/10</span>
                                            </div>
                                            <Progress
                                                value={assessment.logic_score * 10}
                                                className="h-2"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Total Score</span>
                                                <span className="font-bold text-violet-600">{assessment.total_score}/20</span>
                                            </div>
                                            <div className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{
                                                width: `${(assessment.total_score / 20) * 100}%`,
                                            }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                        <Calendar className="h-3 w-3" />
                                        Completed {new Date(assessment.completed_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Rocket className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                    <p className="text-muted-foreground mb-4">
                                        Complete your assessment to unlock insights
                                    </p>
                                    <Link href="/onboarding/career?retake=true">
                                        <Button className="bg-gradient-to-r from-violet-600 to-indigo-600">
                                            Start Assessment
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </Card>
                    </motion.div>

                    {/* Career Readiness Gauge */}
                    <motion.div variants={itemVariants}>
                        <Card className="p-6 h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="h-5 w-5 text-emerald-500" />
                                <h2 className="font-semibold">Career Readiness</h2>
                            </div>

                            {gapAnalysis ? (
                                <div className="space-y-4">
                                    {/* Circular Progress */}
                                    <div className="flex justify-center py-4">
                                        <div className="relative h-32 w-32">
                                            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    className="stroke-muted"
                                                />
                                                <motion.circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    className={cn(
                                                        readinessScore >= 70 ? "stroke-green-500" :
                                                            readinessScore >= 50 ? "stroke-amber-500" :
                                                                "stroke-red-500"
                                                    )}
                                                    initial={{ strokeDasharray: "0 251.2" }}
                                                    animate={{
                                                        strokeDasharray: `${(readinessScore / 100) * 251.2} 251.2`,
                                                    }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <motion.span
                                                    className={cn("text-3xl font-bold", getReadinessColor(readinessScore))}
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                >
                                                    {readinessScore}%
                                                </motion.span>
                                                <span className="text-xs text-muted-foreground">Ready</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strengths Preview */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium flex items-center gap-2">
                                            <Star className="h-4 w-4 text-yellow-500" />
                                            Top Strengths
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {gapAnalysis.strengths?.slice(0, 3).map((s, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <Link href="/skills">
                                        <Button variant="outline" className="w-full group">
                                            View Full Analysis
                                            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                    <p className="text-muted-foreground">
                                        Complete assessment for analysis
                                    </p>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants}>
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <motion.div
                                    key={action.href}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Link href={action.href}>
                                        <Card className="p-4 h-full cursor-pointer group hover:shadow-lg transition-all relative overflow-hidden">
                                            <div className={cn(
                                                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity",
                                                action.color
                                            )} />
                                            <div className="relative">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                                                    action.color
                                                )}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                                <h3 className="font-medium text-sm mb-1 group-hover:text-violet-600 transition-colors">
                                                    {action.label}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {action.description}
                                                </p>
                                            </div>
                                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </Card>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Retake Assessment Link */}
                <motion.div
                    variants={itemVariants}
                    className="mt-8 text-center"
                >
                    <Link href="/onboarding/career?retake=true">
                        <Button variant="ghost" className="text-muted-foreground hover:text-violet-600">
                            <Rocket className="h-4 w-4 mr-2" />
                            Retake Assessment
                        </Button>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
