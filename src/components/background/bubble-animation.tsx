// Bubble Background Animation using GSAP
// Creates floating bubbles with physics simulation

"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

interface Bubble {
    element: HTMLDivElement;
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    opacity: number;
    hue: number;
}

interface BubbleAnimationProps {
    bubbleCount?: number;
    className?: string;
}

export function BubbleAnimation({
    bubbleCount = 25,
    className = "",
}: BubbleAnimationProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bubblesRef = useRef<Bubble[]>([]);
    const animationRef = useRef<number>(0);
    const isReducedMotion = useRef(false);

    // Color palette for bubbles - vibrant gradient colors
    const colors = [
        { hue: 220, saturation: 70, lightness: 60 }, // Blue
        { hue: 280, saturation: 70, lightness: 60 }, // Purple
        { hue: 330, saturation: 70, lightness: 60 }, // Pink
        { hue: 200, saturation: 70, lightness: 60 }, // Cyan
        { hue: 260, saturation: 70, lightness: 60 }, // Violet
    ];

    const createBubble = useCallback(
        (container: HTMLDivElement, index: number): Bubble => {
            const element = document.createElement("div");
            const size = Math.random() * 120 + 40; // 40-160px
            const colorIndex = Math.floor(Math.random() * colors.length);
            const color = colors[colorIndex];
            const opacity = Math.random() * 0.15 + 0.05; // 0.05-0.2

            element.className = "absolute rounded-full pointer-events-none";
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
            element.style.background = `radial-gradient(circle at 30% 30%, 
        hsla(${color.hue}, ${color.saturation}%, ${color.lightness + 20}%, ${opacity}),
        hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${opacity * 0.5}))`;
            element.style.filter = "blur(1px)";
            element.style.willChange = "transform";

            container.appendChild(element);

            const x = Math.random() * container.clientWidth;
            const y = Math.random() * container.clientHeight + container.clientHeight;

            gsap.set(element, { x, y, scale: 0 });
            gsap.to(element, {
                scale: 1,
                duration: 0.5,
                ease: "back.out(1.7)",
                delay: index * 0.05,
            });

            return {
                element,
                x,
                y,
                size,
                speedY: Math.random() * 0.5 + 0.2, // Rising speed
                speedX: (Math.random() - 0.5) * 0.3, // Horizontal drift
                opacity,
                hue: color.hue,
            };
        },
        [colors]
    );

    const animateBubbles = useCallback(() => {
        if (isReducedMotion.current) return;

        const container = containerRef.current;
        if (!container) return;

        bubblesRef.current.forEach((bubble) => {
            // Update position
            bubble.y -= bubble.speedY;
            bubble.x += bubble.speedX;

            // Add subtle wobble using sine wave
            const wobble = Math.sin(Date.now() * 0.001 + bubble.x * 0.01) * 0.5;
            bubble.x += wobble;

            // Reset bubble when it goes off top
            if (bubble.y < -bubble.size) {
                bubble.y = container.clientHeight + bubble.size;
                bubble.x = Math.random() * container.clientWidth;
            }

            // Wrap around horizontally
            if (bubble.x < -bubble.size) {
                bubble.x = container.clientWidth + bubble.size;
            } else if (bubble.x > container.clientWidth + bubble.size) {
                bubble.x = -bubble.size;
            }

            // Apply transform
            gsap.set(bubble.element, {
                x: bubble.x,
                y: bubble.y,
            });
        });

        animationRef.current = requestAnimationFrame(animateBubbles);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check for reduced motion preference
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        isReducedMotion.current = mediaQuery.matches;

        const handleMotionChange = (e: MediaQueryListEvent) => {
            isReducedMotion.current = e.matches;
            if (e.matches) {
                cancelAnimationFrame(animationRef.current);
            } else {
                animateBubbles();
            }
        };

        mediaQuery.addEventListener("change", handleMotionChange);

        // Create bubbles
        for (let i = 0; i < bubbleCount; i++) {
            bubblesRef.current.push(createBubble(container, i));
        }

        // Start animation
        if (!isReducedMotion.current) {
            animateBubbles();
        }

        // Handle visibility change to pause animation when tab is inactive
        const handleVisibilityChange = () => {
            if (document.hidden) {
                cancelAnimationFrame(animationRef.current);
            } else if (!isReducedMotion.current) {
                animateBubbles();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationRef.current);
            mediaQuery.removeEventListener("change", handleMotionChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            bubblesRef.current.forEach((bubble) => bubble.element.remove());
            bubblesRef.current = [];
        };
    }, [bubbleCount, createBubble, animateBubbles]);

    return (
        <div
            ref={containerRef}
            className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
            aria-hidden="true"
        />
    );
}
