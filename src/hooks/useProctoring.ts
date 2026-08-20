"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseProctoringOptions {
    onViolation: (violationCount: number, reason: string) => void;
    maxViolations?: number;
    enabled?: boolean;
}

export function useProctoring({ onViolation, maxViolations = 3, enabled = true }: UseProctoringOptions) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [violations, setViolations] = useState(0);
    const violationsRef = useRef(0);
    const isLockedOut = useRef(false);

    const triggerViolation = useCallback((reason: string) => {
        if (!enabled) return;
        // Once locked out, stop counting entirely
        if (isLockedOut.current) return;
        
        violationsRef.current += 1;
        const newCount = violationsRef.current;

        // If this violation hits the max, lock out immediately before calling onViolation
        if (newCount >= maxViolations) {
            isLockedOut.current = true;
        }

        setViolations(newCount);
        onViolation(newCount, reason);
    }, [enabled, onViolation, maxViolations]);

    const requestFullscreen = useCallback(async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            }
        } catch (err) {
            console.error("Error attempting to enable fullscreen:", err);
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        try {
            if (document.exitFullscreen && document.fullscreenElement) {
                await document.exitFullscreen();
            }
            setIsFullscreen(false);
        } catch (err) {
            console.error("Error attempting to exit fullscreen:", err);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // 1. Fullscreen Change Detection
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            
            // If they were in fullscreen (or we expected them to be) and they exited
            if (!isCurrentlyFullscreen && isFullscreen) {
                triggerViolation("Exited full screen");
            }
            setIsFullscreen(isCurrentlyFullscreen);
        };

        // 2. Tab Switching / Minimizing (Visibility API)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && enabled) {
                triggerViolation("Switched tabs or minimized browser");
            }
        };

        // 3. Window Blur (Clicking outside the browser or opening another app)
        const handleBlur = () => {
            if (enabled) {
                triggerViolation("Window lost focus (opened another app)");
            }
        };

        // 4. Disable Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => {
            if (enabled) {
                e.preventDefault();
            }
        };

        // 5. Disable Copy/Cut/Paste
        const handleClipboard = (e: ClipboardEvent) => {
            if (enabled) {
                e.preventDefault();
            }
        };

        // 6. Disable specific keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!enabled) return;

            // Prevent F12, Ctrl+Shift+I (DevTools)
            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
                e.preventDefault();
            }
            // Prevent Ctrl+C, Ctrl+V, Ctrl+X
            if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x" || e.key === "C" || e.key === "V" || e.key === "X")) {
                e.preventDefault();
            }
            // Prevent Alt+Tab (can't completely prevent, but we can prevent default behavior on page)
            if (e.altKey && e.key === "Tab") {
                e.preventDefault();
            }
            // Prevent Print Screen
            if (e.key === "PrintScreen") {
                e.preventDefault();
            }
        };

        // Attach listeners
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("copy", handleClipboard);
        document.addEventListener("cut", handleClipboard);
        document.addEventListener("paste", handleClipboard);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            // Cleanup
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("copy", handleClipboard);
            document.removeEventListener("cut", handleClipboard);
            document.removeEventListener("paste", handleClipboard);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [enabled, isFullscreen, triggerViolation]);

    return {
        isFullscreen,
        violations,
        requestFullscreen,
        exitFullscreen
    };
}
