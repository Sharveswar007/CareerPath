// Scroll Reveal Hook - Triggers animations when elements enter viewport
"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

export function useScrollReveal({
    threshold = 0.1,
    rootMargin = "0px",
    triggerOnce = true,
}: UseScrollRevealOptions = {}) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [threshold, rootMargin, triggerOnce]);

    return { ref, isVisible };
}

// Component wrapper for scroll reveal
interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right" | "scale";
    delay?: number;
    duration?: number;
}

export function ScrollReveal({
    children,
    className = "",
    direction = "up",
    delay = 0,
    duration = 0.6,
}: ScrollRevealProps) {
    const { ref, isVisible } = useScrollReveal();

    const getTransform = () => {
        switch (direction) {
            case "up": return "translateY(40px)";
            case "down": return "translateY(-40px)";
            case "left": return "translateX(40px)";
            case "right": return "translateX(-40px)";
            case "scale": return "scale(0.9)";
            default: return "translateY(40px)";
        }
    };

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "none" : getTransform(),
                transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

export default ScrollReveal;
