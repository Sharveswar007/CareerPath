// Scroll Down Indicator Component
// Animated arrow that bounces to indicate scrolling

"use client";

import { motion } from "framer-motion";
import { ChevronDown, MousePointer2 } from "lucide-react";

interface ScrollIndicatorProps {
    className?: string;
    variant?: "arrow" | "mouse" | "dots";
    onClick?: () => void;
    targetId?: string;
}

export function ScrollIndicator({
    className = "",
    variant = "arrow",
    onClick,
    targetId,
}: ScrollIndicatorProps) {
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
        }
    };

    if (variant === "mouse") {
        return (
            <motion.div
                className={`flex flex-col items-center gap-2 cursor-pointer ${className}`}
                onClick={handleClick}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
            >
                <motion.div
                    className="w-6 h-10 rounded-full border-2 border-violet-500/50 flex items-start justify-center p-1"
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <motion.div
                        className="w-1.5 h-3 rounded-full bg-violet-500"
                        animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
                <span className="text-xs text-muted-foreground">Scroll</span>
            </motion.div>
        );
    }

    if (variant === "dots") {
        return (
            <motion.div
                className={`flex flex-col items-center gap-1.5 cursor-pointer ${className}`}
                onClick={handleClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
            >
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-violet-500/60"
                        animate={{
                            opacity: [0.3, 1, 0.3],
                            scale: [0.8, 1, 0.8],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.2,
                        }}
                    />
                ))}
            </motion.div>
        );
    }

    // Default arrow variant
    return (
        <motion.div
            className={`flex flex-col items-center gap-1 cursor-pointer group ${className}`}
            onClick={handleClick}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
        >
            <motion.div
                className="p-2 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
                <ChevronDown className="w-5 h-5 text-violet-500" />
            </motion.div>
        </motion.div>
    );
}

export default ScrollIndicator;
