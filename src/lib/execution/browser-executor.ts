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
            log: (...args: any[]) => logs.push(args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(" ")),
            error: (...args: any[]) => logs.push("ERROR: " + args.map(a => String(a)).join(" ")),
            warn: (...args: any[]) => logs.push("WARN: " + args.map(a => String(a)).join(" ")),
        };

        // Parse stdin as input - try to parse as JSON array/value
        let parsedInput: any = stdin.trim();
        try {
            parsedInput = JSON.parse(stdin.trim());
        } catch {
            // Keep as string if not valid JSON
        }

        // Create wrapper that auto-calls the main function
        const wrappedCode = `
            "use strict";
            const console = this.console;
            const input = this.input;
            const parsedInput = this.parsedInput;
            const parseInt = this.parseInt;
            const parseFloat = this.parseFloat;
            const JSON = this.JSON;
            const Math = this.Math;
            const Array = this.Array;
            const Object = this.Object;
            const String = this.String;
            const Number = this.Number;
            const Boolean = this.Boolean;
            const Map = this.Map;
            const Set = this.Set;
            
            // User code
            ${code}
            
            // Auto-detect and call the main function
            const funcNames = ['solve', 'solution', 'main', 'sum_array_elements', 'twoSum', 'maxProfit'];
            for (const name of funcNames) {
                if (typeof this[name] === 'function' || typeof eval('typeof ' + name) !== 'undefined') {
                    try {
                        const fn = eval(name);
                        if (typeof fn === 'function') {
                            const result = fn(parsedInput);
                            if (result !== undefined) {
                                console.log(typeof result === 'object' ? JSON.stringify(result) : result);
                            }
                            break;
                        }
                    } catch(e) {}
                }
            }
        `;

        const sandboxedFn = new Function(wrappedCode);

        sandboxedFn.call({
            console: mockConsole,
            input: stdin.trim(),
            parsedInput,
            parseInt,
            parseFloat,
            JSON,
            Math,
            Array,
            Object,
            String,
            Number,
            Boolean,
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

        // Reset stdout/stderr and set up test input
        const setupCode = `
import sys
from io import StringIO
import json

# Capture stdout
sys.stdout = StringIO()
sys.stderr = StringIO()

# Store the test input
_test_input_raw = '''${stdin.trim().replace(/'/g, "\\'")}'''

# Try to parse as JSON
try:
    _test_input = json.loads(_test_input_raw)
except:
    _test_input = _test_input_raw

# Mock input function for stdin-style input
_input_lines = _test_input_raw.split('\\n')
_input_index = 0

def input(prompt=""):
    global _input_index
    if _input_index < len(_input_lines):
        result = _input_lines[_input_index]
        _input_index += 1
        return result
    return ""

__builtins__.input = input
`;

        pyodide.runPython(setupCode);

        // Run user code
        pyodide.runPython(code);

        // Auto-detect and call the main function with test input
        const callFunctionCode = `
# Try to find and call the main function
_possible_funcs = ['solve', 'solution', 'main', 'sum_array_elements', 'twoSum', 'maxProfit', 
                   'two_sum', 'max_profit', 'longestSubstring', 'longest_substring']

_result = None
_found = False

for _fname in _possible_funcs:
    if _fname in dir() and callable(eval(_fname)):
        _func = eval(_fname)
        try:
            _result = _func(_test_input)
            _found = True
            break
        except TypeError:
            # Function might need different args, try as individual elements
            if isinstance(_test_input, (list, tuple)) and len(_test_input) > 0:
                try:
                    _result = _func(*_test_input)
                    _found = True
                    break
                except:
                    pass

# Print result if we found and called a function
if _found and _result is not None:
    # Only print if nothing was printed yet
    _current_output = sys.stdout.getvalue()
    if not _current_output.strip():
        print(_result)
`;

        pyodide.runPython(callFunctionCode);

        // Get output
        output = pyodide.runPython(`
stdout_val = sys.stdout.getvalue()
stderr_val = sys.stderr.getvalue()
# Reset for next run
sys.stdout = StringIO()
sys.stderr = StringIO()
stdout_val + stderr_val
        `);

        // If output has multiple lines, try to get just the last meaningful value
        const lines = output.trim().split('\n');
        if (lines.length > 1) {
            // Filter out debug prints that contain "Input:", "Expected:", "Got:"
            const cleanLines = lines.filter(line =>
                !line.includes('Input:') &&
                !line.includes('Expected:') &&
                !line.includes('Got:') &&
                !line.includes('Test ')
            );
            if (cleanLines.length > 0) {
                output = cleanLines[cleanLines.length - 1];
            }
        }

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
