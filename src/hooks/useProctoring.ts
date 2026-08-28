"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

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

    const startProctoring = useCallback(async (): Promise<boolean> => {
        try {
            // First, mandate camera/microphone permissions
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            // We have permission, immediately stop the tracks since we just needed the permission grant for now
            stream.getTracks().forEach(track => track.stop());
            
            // Then, request fullscreen
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
                isFullscreenRef.current = true;
                enabledRef.current = true; // Re-enable proctoring flags
                return true;
            }
            return false;
        } catch (err: any) {
            console.error("Proctoring setup failed:", err);
            // Don't trigger a violation for failing to start, just prevent them from starting
            if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                 toast.error("Camera and Microphone permissions are required to start the exam.");
            } else {
                 toast.error("Failed to enter fullscreen or access media devices.");
            }
            return false;
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

    const stopProctoring = useCallback(async () => {
        enabledRef.current = false;
        await exitFullscreen();
    }, [exitFullscreen]);

    // Single effect that registers listeners ONCE and never re-registers
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            
            if (!isCurrentlyFullscreen && isFullscreenRef.current) {
                triggerViolation("Exited full screen");
                // Attempt to auto-resume full screen immediately
                startProctoring().catch(() => {});
            }
            setIsFullscreen(isCurrentlyFullscreen);
            isFullscreenRef.current = isCurrentlyFullscreen;
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && enabledRef.current) {
                triggerViolation("Switched tabs or minimized browser");
            } else if (document.visibilityState === "visible" && enabledRef.current && !document.fullscreenElement) {
                // Attempt to push back into full screen when they return
                startProctoring().catch(() => {});
            }
        };

        // NOTE: We intentionally do NOT add a window "blur" listener.
        // Monaco Editor uses internal <textarea>/<iframe> elements for keyboard input.
        // When a student clicks into the code editor, the browser fires a "blur" event 
        // on the window as focus moves to Monaco's internal element. This was causing
        // false proctoring violations and interfering with keystroke delivery (especially
        // keys like 'a', 's', 'd' which are typed in rapid bursts). The "visibilitychange"
        // event above already reliably detects actual tab switches and app switching.

        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.closest('.monaco-editor') || target.classList.contains('inputarea'))) {
                return; // Allow context menu inside editor
            }
            if (enabledRef.current) {
                e.preventDefault();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!enabledRef.current) return;

            // CRITICAL: Never interfere with Monaco Editor's keyboard input.
            // Monaco uses internal <textarea> elements for capturing keystrokes.
            const target = e.target as HTMLElement;
            if (target && (target.closest('.monaco-editor') || target.classList.contains('inputarea'))) {
                return; // Let Monaco handle everything internally
            }

            // Only block specific dangerous key combinations on non-editor elements
            const key = e.key;

            if (key === "F12" || (e.ctrlKey && e.shiftKey && key === "I")) {
                e.preventDefault();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.altKey && (key === "c" || key === "v" || key === "x" || key === "C" || key === "V" || key === "X")) {
                e.preventDefault();
                return;
            }
            if (e.altKey && key === "Tab") {
                e.preventDefault();
                return;
            }
            if (key === "PrintScreen") {
                e.preventDefault();
                return;
            }
        };

        // VERSION CHECK: If you see this in console, the latest code is running
        console.log("[PROCTORING v8] Listeners attached — safe keydown/contextmenu handlers");

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]); // Only re-run when enabled changes

    return {
        isFullscreen,
        violations,
        startProctoring,
        exitFullscreen,
        stopProctoring
    };
}
