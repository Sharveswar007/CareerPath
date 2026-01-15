// Header Component with Navigation

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    BarChart3,
    TrendingUp,
    Code2,
    FileText,
    GraduationCap,
    Moon,
    Sun,
    Menu,
    X,
    Home,
    User,
    Target,
    Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/skills", label: "Skills Analysis", icon: Target },
    { href: "/trends", label: "Career Trends", icon: TrendingUp },
    { href: "/challenges", label: "Challenges", icon: Code2 },
    { href: "/resume", label: "Resume", icon: FileText },
    { href: "/dashboard", label: "Dashboard", icon: Rocket },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
];

export function Header() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Hide header on login and onboarding pages
    if (pathname?.startsWith("/login") || pathname?.startsWith("/onboarding")) {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2">
                    <motion.div
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <GraduationCap className="h-6 w-6 text-white" />
                    </motion.div>
                    <span className="hidden font-bold text-xl bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent sm:inline-block">
                        CareerPath
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-violet-500/10 rounded-lg border border-violet-500/20"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        style={{ originY: "0px" }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    {mounted && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                                const { createClient } = await import("@/lib/supabase/client");
                                const supabase = createClient();
                                await supabase.auth.signOut();
                                window.location.href = "/login";
                            }}
                            title="Sign Out"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" x2="9" y1="12" y2="12" />
                            </svg>
                        </Button>
                    )}

                    {mounted && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="relative overflow-hidden"
                            title="Toggle Theme"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={theme}
                                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {theme === "dark" ? (
                                        <Sun className="h-5 w-5" />
                                    ) : (
                                        <Moon className="h-5 w-5" />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={mobileMenuOpen ? "close" : "menu"}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {mobileMenuOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </motion.div>
                        </AnimatePresence>
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="lg:hidden overflow-hidden border-t border-border/40"
                    >
                        <nav className="container px-4 py-4 space-y-1">
                            {navItems.map((item, index) => {
                                const isActive = pathname === item.href;
                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Link
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                                isActive
                                                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
