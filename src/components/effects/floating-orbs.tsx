// 3D Floating Orbs Background Component
// Creates an animated background with floating gradient orbs

"use client";

import { motion } from "framer-motion";

interface FloatingOrbsProps {
    className?: string;
    variant?: "default" | "subtle" | "vibrant";
}

export function FloatingOrbs({ className = "", variant = "default" }: FloatingOrbsProps) {
    const getOpacity = () => {
        switch (variant) {
            case "subtle": return 0.3;
            case "vibrant": return 0.7;
            default: return 0.5;
        }
    };

    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}>
            {/* Primary violet orb */}
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
                style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    opacity: getOpacity(),
                    top: "10%",
                    left: "-10%",
                }}
                animate={{
                    x: [0, 100, 50, 0],
                    y: [0, 50, 100, 0],
                    scale: [1, 1.1, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Pink/rose orb */}
            <motion.div
                className="absolute w-[400px] h-[400px] rounded-full blur-[80px]"
                style={{
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    opacity: getOpacity() * 0.8,
                    top: "60%",
                    right: "-5%",
                }}
                animate={{
                    x: [0, -80, -40, 0],
                    y: [0, -40, 60, 0],
                    scale: [1, 0.9, 1.1, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Cyan/teal orb */}
            <motion.div
                className="absolute w-[350px] h-[350px] rounded-full blur-[90px]"
                style={{
                    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    opacity: getOpacity() * 0.6,
                    bottom: "10%",
                    left: "30%",
                }}
                animate={{
                    x: [0, 60, -30, 0],
                    y: [0, -50, -20, 0],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Small accent orb */}
            <motion.div
                className="absolute w-[200px] h-[200px] rounded-full blur-[60px]"
                style={{
                    background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                    opacity: getOpacity() * 0.5,
                    top: "30%",
                    right: "20%",
                }}
                animate={{
                    x: [0, 30, -20, 0],
                    y: [0, -30, 20, 0],
                    scale: [1, 1.2, 0.8, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}

export default FloatingOrbs;
