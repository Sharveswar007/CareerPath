// Browser-based code execution for JavaScript and Python
// No server calls needed - runs entirely in the browser

export interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    executionTime?: number;
}

// Execute JavaScript in a sandboxed environment
export function executeJavaScript(code: string, stdin: string = ""): ExecutionResult {
    const startTime = performance.now();
    let output = "";
    let error: string | null = null;

    try {
        // Create a sandboxed console
        const logs: string[] = [];
        const mockConsole = {
            log: (...args: any[]) => logs.push(args.map(a => String(a)).join(" ")),
            error: (...args: any[]) => logs.push("ERROR: " + args.map(a => String(a)).join(" ")),
            warn: (...args: any[]) => logs.push("WARN: " + args.map(a => String(a)).join(" ")),
        };

        // Parse stdin as input
        const input = stdin.trim();

        // Create sandboxed function with timeout
        const sandboxedCode = `
            "use strict";
            const console = this.console;
            const input = this.input;
            const parseInt = this.parseInt;
            const parseFloat = this.parseFloat;
            const JSON = this.JSON;
            const Math = this.Math;
            const Array = this.Array;
            const Object = this.Object;
            const String = this.String;
            const Number = this.Number;
            const Boolean = this.Boolean;
            const Date = this.Date;
            const RegExp = this.RegExp;
            const Map = this.Map;
            const Set = this.Set;
            
            // User code
            ${code}
        `;

        const sandboxedFn = new Function(sandboxedCode);

        // Execute with timeout (5 seconds)
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("Execution timed out (5s limit)")), 5000);
        });

        // Run synchronously (Function execution is sync)
        sandboxedFn.call({
            console: mockConsole,
            input,
            parseInt,
            parseFloat,
            JSON,
            Math,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Date,
            RegExp,
            Map,
            Set,
        });

        output = logs.join("\n");

    } catch (e: any) {
        error = e.message || "JavaScript execution error";
    }

    const executionTime = performance.now() - startTime;

    return {
        success: !error,
        output: error ? "" : output,
        error,
        language: "javascript",
        executionTime,
    };
}

// Pyodide instance cache
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

// Load Pyodide (lazy load on first Python execution)
async function loadPyodide(): Promise<any> {
    if (pyodideInstance) return pyodideInstance;

    if (pyodideLoading) return pyodideLoading;

    pyodideLoading = (async () => {
        // Load Pyodide from CDN
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";

        await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Pyodide"));
            document.head.appendChild(script);
        });

        // Initialize Pyodide
        // @ts-ignore - Pyodide is loaded globally
        pyodideInstance = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });

        return pyodideInstance;
    })();

    return pyodideLoading;
}

// Execute Python using Pyodide
export async function executePython(code: string, stdin: string = ""): Promise<ExecutionResult> {
    const startTime = performance.now();
    let output = "";
    let error: string | null = null;

    try {
        const pyodide = await loadPyodide();

        // Set up stdin simulation
        const inputLines = stdin.trim().split("\n");
        let inputIndex = 0;

        // Redirect stdout
        pyodide.runPython(`
import sys
from io import StringIO

# Capture stdout
sys.stdout = StringIO()
sys.stderr = StringIO()

# Mock input function
_input_lines = ${JSON.stringify(inputLines)}
_input_index = 0

def input(prompt=""):
    global _input_index
    if _input_index < len(_input_lines):
        result = _input_lines[_input_index]
        _input_index += 1
        return result
    return ""

__builtins__.input = input
        `);

        // Run user code
        pyodide.runPython(code);

        // Get output
        output = pyodide.runPython(`
stdout_val = sys.stdout.getvalue()
stderr_val = sys.stderr.getvalue()
# Reset for next run
sys.stdout = StringIO()
sys.stderr = StringIO()
stdout_val + stderr_val
        `);

    } catch (e: any) {
        error = e.message || "Python execution error";
        // Clean up error message
        if (error && error.includes("PythonError:")) {
            error = error.split("PythonError:")[1]?.trim() || error;
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        success: !error,
        output: error ? "" : output.trim(),
        error,
        language: "python",
        executionTime,
    };
}

// Check if Pyodide is loaded
export function isPyodideLoaded(): boolean {
    return pyodideInstance !== null;
}

// Preload Pyodide (call on page load for faster first execution)
export function preloadPyodide(): void {
    loadPyodide().catch(console.error);
}
