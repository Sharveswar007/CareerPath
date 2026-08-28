"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowRight } from "lucide-react";

export default function TestJoinPage() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!code || code.length !== 6) {
            setError("Please enter a valid 6-letter code.");
            return;
        }

        setIsLoading(true);

        try {
            // Check if test exists
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from("tests")
                .select("id, status")
                .eq("code", code.toUpperCase())
                .single();

            if (fetchError || !data) {
                setError("Test not found. Please check your code.");
                return;
            }

            if (data.status === 'completed') {
                setError("This test has already been completed.");
                return;
            }

            // Create session
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.push('/login');
                return;
            }

            // Check for existing session first
            const { data: existingSession } = await supabase
                .from("test_sessions")
                .select("status, completed_at")
                .eq("test_id", data.id)
                .eq("student_id", userData.user.id)
                .single();
                
            if (existingSession) {
                if (existingSession.status === 'completed' && !existingSession.completed_at) {
                    setError("You have been blocked from this test due to malpractice.");
                    return;
                }
                if (existingSession.status === 'completed' && existingSession.completed_at) {
                    setError("You have already completed this test.");
                    return;
                }
                // If in_progress or joined, they can proceed
            } else {
                const { error: sessionError } = await supabase
                    .from("test_sessions")
                    .insert({
                        test_id: data.id,
                        student_id: userData.user.id,
                        status: 'joined'
                    });

                if (sessionError) {
                     throw sessionError;
                }
            }

            router.push(`/test/${code.toUpperCase()}`);

        } catch (err: any) {
            console.error(err);
            setError("An error occurred while joining the test.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="glass-panel p-8 text-center rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 p-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                            <FileQuestion className="w-8 h-8 text-white" />
                        </div>

                        <h1 className="text-3xl font-bold mb-2">Join a Test</h1>
                        <p className="text-muted-foreground mb-8">
                            Enter the 6-letter code provided by your instructor to join the evaluation.
                        </p>

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="Enter 6-letter code"
                                    maxLength={6}
                                    className="w-full text-center text-3xl tracking-[0.5em] font-mono p-4 rounded-xl bg-background/50 border border-border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-lg"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 font-medium">{error}</p>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full h-12 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                                disabled={isLoading || code.length !== 6}
                            >
                                {isLoading ? "Joining..." : "Join Test"}
                                {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                            </Button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
