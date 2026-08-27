"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Loader2 } from "lucide-react";

export default function TestWaitingRoom() {
    const params = useParams<{ code: string }>();
    const [studentCount, setStudentCount] = useState(1);
    const [testId, setTestId] = useState<string | null>(null);
    const router = useRouter();
    const code = params.code?.toUpperCase() || "";

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const init = async () => {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();

            // Fetch test details initially
            const { data: testData, error: testError } = await supabase
                .from("tests")
                .select("id, status")
                .eq("code", code)
                .single();

            if (testError || !testData) {
                router.push('/test');
                return;
            }

            setTestId(testData.id);

            if (testData.status === 'started') {
                router.push(`/test/${code}/session`);
                return;
            }
            
            const fetchStatus = async () => {
                // Fetch student count
                const { count } = await supabase
                    .from("test_sessions")
                    .select("*", { count: 'exact', head: true })
                    .eq("test_id", testData.id)
                    .eq("status", "joined");
                
                if (count !== null) setStudentCount(count);

                // Fetch test status
                const { data: currentTest } = await supabase
                    .from("tests")
                    .select("status")
                    .eq("id", testData.id)
                    .single();
                
                if (currentTest?.status === 'started') {
                    router.push(`/test/${code}/session`);
                }
            };

            // Call immediately and then set interval
            fetchStatus();
            interval = setInterval(fetchStatus, 1000);
        };

        init();

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [code, router]);

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md text-center"
            >
                <div className="glass-panel p-12 rounded-3xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-6" />
                        
                        <h1 className="text-2xl font-bold mb-2">Waiting Room</h1>
                        <p className="text-muted-foreground mb-8">
                            Please wait for your instructor to start the exam.
                        </p>

                        <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded-full border border-border">
                            <Users className="w-4 h-4 text-violet-500" />
                            <span className="font-medium">{studentCount} student{studentCount !== 1 ? 's' : ''} joined</span>
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-border/50 w-full">
                            <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">Test Code</p>
                            <p className="text-3xl font-mono font-bold tracking-[0.2em]">{code}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
