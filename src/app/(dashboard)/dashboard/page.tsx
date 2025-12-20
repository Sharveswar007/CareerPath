// Enhanced Dashboard with 3D Effects and Animations

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Code2,
    Trophy,
    Target,
    BookOpen,
    ArrowRight,
    TrendingUp,
    Sparkles,
    MessageSquare,
    FileText,
    Flame,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FloatingOrbs } from "@/components/effects/floating-orbs";
import { ScrollReveal } from "@/components/effects/scroll-reveal";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        challengesSolved: 0,
        readinessScore: 0,
        currentStreak: 0,
    });
    const supabase = createClient();

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                // Fetch real stats
                const [challengesRes, gapRes] = await Promise.all([
                    supabase
                        .from("coding_submissions")
                        .select("id")
                        .eq("user_id", user.id)
                        .eq("status", "passed"),
                    supabase
                        .from("skills_gap_analysis")
                        .select("readiness_score")
                        .eq("user_id", user.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single(),
                ]);

                setStats({
                    challengesSolved: challengesRes.data?.length || 0,
                    readinessScore: gapRes.data?.readiness_score || 0,
                    currentStreak: 5, // Could be from user_activity table
                });
            }

            setLoading(false);
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 animate-pulse" />
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </motion.div>
            </div>
        );
    }

    const quickActions = [
        {
            href: "/chat",
            icon: MessageSquare,
            title: "AI Career Chat",
            description: "Get personalized career advice",
            color: "from-pink-500 to-rose-500",
            hoverBorder: "hover:border-pink-500/50",
        },
        {
            href: "/challenges",
            icon: Code2,
            title: "Practice Coding",
            description: "Solve algorithmic challenges",
            color: "from-violet-500 to-purple-500",
            hoverBorder: "hover:border-violet-500/50",
        },
        {
            href: "/resume",
            icon: FileText,
            title: "Resume Analysis",
            description: "Get your ATS score",
            color: "from-blue-500 to-cyan-500",
            hoverBorder: "hover:border-blue-500/50",
        },
        {
            href: "/skills",
            icon: Target,
            title: "Skills Roadmap",
            description: "View learning path",
            color: "from-emerald-500 to-teal-500",
            hoverBorder: "hover:border-emerald-500/50",
        },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Floating 3D Orbs Background */}
            <FloatingOrbs variant="subtle" />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container py-8 px-4 max-w-6xl mx-auto relative z-10"
            >
                {/* Header */}
                <motion.header variants={itemVariants} className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <motion.div
                            className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                        >
                            <Sparkles className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-3xl font-bold">
                                Welcome back, {user?.user_metadata?.full_name || "User"}!
                            </h1>
                            <p className="text-muted-foreground">
                                Here's your career progress today
                            </p>
                        </div>
                    </div>
                </motion.header>

                {/* Stats Cards with Glassmorphism */}
                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3 mb-8">
                    {[
                        {
                            icon: Trophy,
                            label: "Challenges Solved",
                            value: stats.challengesSolved,
                            color: "text-violet-500",
                            bg: "bg-violet-500/10",
                        },
                        {
                            icon: Target,
                            label: "Career Readiness",
                            value: `${stats.readinessScore}%`,
                            color: "text-emerald-500",
                            bg: "bg-emerald-500/10",
                        },
                        {
                            icon: Flame,
                            label: "Current Streak",
                            value: `${stats.currentStreak} Days`,
                            color: "text-orange-500",
                            bg: "bg-orange-500/10",
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            whileHover={{ y: -5, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Card className="p-6 glass-card hover:shadow-xl transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 ${stat.bg} rounded-xl`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {stat.label}
                                        </p>
                                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Quick Actions with 3D Hover Effect */}
                <ScrollReveal className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        Quick Actions
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {quickActions.map((action, i) => (
                            <motion.div
                                key={action.href}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link href={action.href}>
                                    <Card className={`p-5 h-full cursor-pointer group transition-all hover:shadow-xl ${action.hoverBorder} relative overflow-hidden`}>
                                        {/* Gradient overlay on hover */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                                        <div className="relative">
                                            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                                                <action.icon className="h-6 w-6 text-white" />
                                            </div>
                                            <h3 className="font-semibold mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                {action.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {action.description}
                                            </p>
                                        </div>
                                        <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </ScrollReveal>

                {/* Activity Section */}
                <ScrollReveal delay={0.2}>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="p-6 glass-card">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-violet-500" />
                                Recommended Next Steps
                            </h2>
                            <ul className="space-y-3">
                                {[
                                    {
                                        icon: Code2,
                                        color: "text-blue-500 bg-blue-500/10",
                                        title: "Complete \"Binary Search\" Challenge",
                                        subtitle: "Recommended based on your Arrays activity",
                                        href: "/challenges",
                                    },
                                    {
                                        icon: BookOpen,
                                        color: "text-violet-500 bg-violet-500/10",
                                        title: "Review System Design Concepts",
                                        subtitle: "Preparation for your career goal",
                                        href: "/skills",
                                    },
                                    {
                                        icon: TrendingUp,
                                        color: "text-emerald-500 bg-emerald-500/10",
                                        title: "Check Latest Career Trends",
                                        subtitle: "Stay updated with job market",
                                        href: "/trends",
                                    },
                                ].map((item, i) => (
                                    <motion.li
                                        key={i}
                                        whileHover={{ x: 5 }}
                                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    >
                                        <div className={`p-2 rounded-lg ${item.color}`}>
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium">{item.title}</h4>
                                            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" asChild>
                                            <Link href={item.href}>
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </motion.li>
                                ))}
                            </ul>
                        </Card>

                        {/* Motivation Card */}
                        <Card className="p-6 bg-gradient-to-br from-violet-500 to-indigo-600 text-white border-0 relative overflow-hidden">
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                            <div className="relative">
                                <h2 className="text-2xl font-bold mb-2">Keep Going! 🚀</h2>
                                <p className="text-white/80 mb-6">
                                    You're making great progress. Every challenge you solve brings you closer to your dream career.
                                </p>
                                <div className="flex gap-3">
                                    <Button asChild variant="secondary" className="bg-white text-violet-600 hover:bg-white/90">
                                        <Link href="/challenges">Continue Learning</Link>
                                    </Button>
                                    <Button asChild variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                                        <Link href="/profile">View Profile</Link>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </ScrollReveal>
            </motion.div>
        </div>
    );
}
