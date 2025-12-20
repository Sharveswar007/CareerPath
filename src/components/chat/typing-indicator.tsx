// Typing Indicator Component

"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
    return (
        <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="h-3 w-3 bg-white rounded-full"
                />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-violet-500 rounded-full"
                            animate={{
                                y: [0, -6, 0],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.15,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
