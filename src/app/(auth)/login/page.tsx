"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Google icon component
const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");

    const router = useRouter();
    const supabase = createClient();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || "Failed to sign in with Google");
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }

        setLoading(true);

        try {
            if (isRegister) {
                // Register
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                if (error) throw error;
                
                // If Supabase auto-logs in (Confirm Email is OFF), redirect immediately
                if (data.session) {
                    toast.success("Account created successfully!");
                    router.push("/dashboard");
                    router.refresh();
                } else {
                    // If Confirm Email is ON, tell them to check email
                    toast.success("Registration successful! Check your email to verify.");
                    setIsRegister(false); // Switch to login view
                }
            } else {
                // Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                toast.success("Signed in successfully!");
                router.push("/dashboard"); 
                router.refresh();
            }
        } catch (error: any) {
            console.error("Authentication error:", error);
            toast.error(error?.message || (isRegister ? "Failed to register" : "Failed to sign in"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                        Career AI
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Your personal AI career guidance assistant
                    </p>
                </div>

                <Card className="p-8 border-violet-500/20 shadow-xl overflow-hidden">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold">
                            {isRegister ? "Create an Account" : "Welcome Back"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isRegister ? "Sign up to start your journey" : "Sign in to continue"}
                        </p>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                        <AnimatePresence mode="wait">
                            {isRegister && (
                                <motion.div
                                    key="name-field"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required={isRegister}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isRegister ? "Sign Up" : "Sign In"}
                        </Button>
                    </form>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        variant="outline"
                        className="w-full h-10 text-sm bg-white hover:bg-gray-50 text-gray-800 border-gray-300"
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <GoogleIcon />
                        )}
                        Google
                    </Button>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">
                            {isRegister ? "Already have an account?" : "Don't have an account?"}
                        </span>{" "}
                        <button
                            type="button"
                            onClick={() => setIsRegister(!isRegister)}
                            className="font-medium text-indigo-500 hover:text-indigo-600 hover:underline"
                        >
                            {isRegister ? "Sign In" : "Sign Up"}
                        </button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
