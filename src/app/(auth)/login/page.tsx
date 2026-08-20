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


export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");

    const router = useRouter();
    const supabase = createClient();


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
