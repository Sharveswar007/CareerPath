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
    
    // Use refs for everything that event handlers need — avoids stale closures entirely
    const violationsRef = useRef(0);
    const isLockedOut = useRef(false);
    const enabledRef = useRef(enabled);
    const isFullscreenRef = useRef(false);
    const onViolationRef = useRef(onViolation);
    const maxViolationsRef = useRef(maxViolations);

    // Keep refs in sync with props — no effect re-runs needed
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);
    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
    useEffect(() => { maxViolationsRef.current = maxViolations; }, [maxViolations]);

    const triggerViolation = useCallback((reason: string) => {
        if (!enabledRef.current) return;
        if (isLockedOut.current) return;
        
        violationsRef.current += 1;
        const newCount = violationsRef.current;

        if (newCount >= maxViolationsRef.current) {
            isLockedOut.current = true;
        }

        setViolations(newCount);
        onViolationRef.current(newCount, reason);
    }, []); // No dependencies — everything is read from refs

    const requestFullscreen = useCallback(async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
                isFullscreenRef.current = true;
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
            isFullscreenRef.current = false;
        } catch (err) {
            console.error("Error attempting to exit fullscreen:", err);
        }
    }, []);

    // Single effect that registers listeners ONCE and never re-registers
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            
            if (!isCurrentlyFullscreen && isFullscreenRef.current) {
                triggerViolation("Exited full screen");
            }
            setIsFullscreen(isCurrentlyFullscreen);
            isFullscreenRef.current = isCurrentlyFullscreen;
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && enabledRef.current) {
                triggerViolation("Switched tabs or minimized browser");
            }
        };

        const handleBlur = () => {
            if (enabledRef.current) {
                triggerViolation("Window lost focus (opened another app)");
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (enabledRef.current) {
                e.preventDefault();
            }
        };

        const handleClipboard = (e: ClipboardEvent) => {
            if (enabledRef.current) {
                e.preventDefault();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!enabledRef.current) return;

            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
                e.preventDefault();
            }
            if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x" || e.key === "C" || e.key === "V" || e.key === "X")) {
                e.preventDefault();
            }
            if (e.altKey && e.key === "Tab") {
                e.preventDefault();
            }
            if (e.key === "PrintScreen") {
                e.preventDefault();
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("copy", handleClipboard);
        document.addEventListener("cut", handleClipboard);
        document.addEventListener("paste", handleClipboard);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("copy", handleClipboard);
            document.removeEventListener("cut", handleClipboard);
            document.removeEventListener("paste", handleClipboard);
            document.removeEventListener("keydown", handleKeyDown);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]); // Only re-run when enabled changes

    return {
        isFullscreen,
        violations,
        requestFullscreen,
        exitFullscreen
    };
}
