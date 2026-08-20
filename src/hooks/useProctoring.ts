"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseProctoringOptions {
    onViolation: (violationCount: number, reason: string) => void;
    maxViolations?: number;
    enabled?: boolean;
}

export function useProctoring({ onViolation, enabled = true }: UseProctoringOptions) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [violations, setViolations] = useState(0);
    const isProctoringActive = useRef(false);

    // Helper to trigger violation
    const triggerViolation = useCallback((reason: string) => {
        if (!isProctoringActive.current || !enabled) return;
        
        setViolations((prev) => {
            const newCount = prev + 1;
            onViolation(newCount, reason);
            return newCount;
        });
    }, [enabled, onViolation]);

    const requestFullscreen = useCallback(async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
                isProctoringActive.current = true;
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
            isProctoringActive.current = false;
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
            setIsFullscreen(isCurrentlyFullscreen);
            
            if (!isCurrentlyFullscreen && isProctoringActive.current) {
                triggerViolation("Exited full screen");
                isProctoringActive.current = false; // Disable until they re-enter
            }
        };

        // 2. Tab Switching / Minimizing (Visibility API)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && isProctoringActive.current) {
                triggerViolation("Switched tabs or minimized browser");
            }
        };

        // 3. Window Blur (Clicking outside the browser or opening another app)
        const handleBlur = () => {
            if (isProctoringActive.current) {
                triggerViolation("Window lost focus (opened another app)");
            }
        };

        // 4. Disable Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => {
            if (isProctoringActive.current) {
                e.preventDefault();
            }
        };

        // 5. Disable Copy/Cut/Paste
        const handleClipboard = (e: ClipboardEvent) => {
            if (isProctoringActive.current) {
                e.preventDefault();
            }
        };

        // 6. Disable specific keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isProctoringActive.current) return;

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
            isProctoringActive.current = false;
        };
    }, [enabled, triggerViolation]);

    return {
        isFullscreen,
        violations,
        requestFullscreen,
        exitFullscreen
    };
}
