// Browser-based code execution for JavaScript and Python
// Runs each test case by calling user's function with parsed input

export interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    executionTime?: number;
}

// Execute JavaScript by calling user's function with test input
export function executeJavaScript(code: string, testInput: string = ""): ExecutionResult {
    const startTime = performance.now();
    let output = "";
    let error: string | null = null;

    try {
        // Parse the test input as JSON (e.g., "[1,2,3,4,5]" -> [1,2,3,4,5])
        let parsedInput: any;
        try {
            parsedInput = JSON.parse(testInput.trim());
        } catch {
            parsedInput = testInput.trim();
        }

        // Create isolated scope
        const logs: string[] = [];
        const mockConsole = {
            log: (...args: any[]) => {
                const formatted = args.map(a =>
                    typeof a === 'object' ? JSON.stringify(a) : String(a)
                ).join(" ");
                logs.push(formatted);
            },
        };

        // Wrap user code to define function and return result
        const wrappedCode = `
            (function() {
                const console = arguments[0];
                const _testInput = arguments[1];
                
                // User's code (defines functions)
                ${code}
                
                // Find the main function
                const _funcNames = [
                    'solve', 'solution', 'main', 
                    'sumArrayElements', 'sum_array_elements',
                    'twoSum', 'two_sum',
                    'maxProfit', 'max_profit',
                    'longestSubstring', 'longest_substring',
                    'isPalindrome', 'is_palindrome',
                    'reverseString', 'reverse_string',
                    'findMax', 'find_max',
                    'fibonacci', 'factorial'
                ];
                
                for (const name of _funcNames) {
                    try {
                        const fn = eval(name);
                        if (typeof fn === 'function') {
                            const result = fn(_testInput);
                            return result;
                        }
                    } catch(e) {}
                }
                
                // If no function found, return any console.log output
                return undefined;
            })
        `;

        const fn = eval(wrappedCode);
        const result = fn(mockConsole, parsedInput);

        // If function returned a value, use that
        if (result !== undefined) {
            output = typeof result === 'object' ? JSON.stringify(result) : String(result);
        } else if (logs.length > 0) {
            // Otherwise use console output
            output = logs[logs.length - 1]; // Use last log as result
        }

    } catch (e: any) {
        error = e.message || "JavaScript execution error";
    }

    return {
        success: !error,
        output: error ? "" : output,
        error,
        language: "javascript",
        executionTime: performance.now() - startTime,
    };
}

// Pyodide instance cache
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

// Load Pyodide
async function loadPyodide(): Promise<any> {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideLoading) return pyodideLoading;

    pyodideLoading = (async () => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";

        await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Pyodide"));
            document.head.appendChild(script);
        });

        // @ts-ignore
        pyodideInstance = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });

        return pyodideInstance;
    })();

    return pyodideLoading;
}

// Execute Python by calling user's function with test input
export async function executePython(code: string, testInput: string = ""): Promise<ExecutionResult> {
    const startTime = performance.now();
    let output = "";
    let error: string | null = null;

    try {
        const pyodide = await loadPyodide();

        // Escape the test input for Python string
        const escapedInput = testInput.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        // Complete Python execution code
        const fullCode = `
import sys
import json
from io import StringIO

# Capture stdout
sys.stdout = StringIO()
sys.stderr = StringIO()

# Parse test input
_test_input_raw = '${escapedInput}'
try:
    _test_input = json.loads(_test_input_raw)
except:
    _test_input = _test_input_raw

# ============ USER CODE START ============
${code}
# ============ USER CODE END ============

# Find and call the main function
_possible_funcs = [
    'solve', 'solution', 'main',
    'sum_array_elements', 'sumArrayElements',
    'two_sum', 'twoSum',
    'max_profit', 'maxProfit',
    'longest_substring', 'longestSubstring',
    'is_palindrome', 'isPalindrome',
    'reverse_string', 'reverseString',
    'find_max', 'findMax',
    'fibonacci', 'factorial'
]

_result = None
_found = False

for _fname in _possible_funcs:
    if _fname in dir() and callable(eval(_fname)):
        _func = eval(_fname)
        try:
            _result = _func(_test_input)
            _found = True
            break
        except TypeError as e:
            # Try unpacking if input is a list
            if isinstance(_test_input, (list, tuple)):
                try:
                    _result = _func(*_test_input)
                    _found = True
                    break
                except:
                    pass

# Get the output
_stdout = sys.stdout.getvalue().strip()

# Result is: function return value, or stdout if no return
if _found and _result is not None:
    _final_output = str(_result)
elif _stdout:
    # Get last line of stdout (the actual result)
    _final_output = _stdout.split('\\n')[-1]
else:
    _final_output = ""

# Reset stdout for next run
sys.stdout = StringIO()
sys.stderr = StringIO()

_final_output
`;

        output = pyodide.runPython(fullCode);

    } catch (e: any) {
        error = e.message || "Python execution error";
        if (error && error.includes("PythonError:")) {
            error = error.split("PythonError:")[1]?.trim() || error;
        }
    }

    return {
        success: !error,
        output: error ? "" : String(output).trim(),
        error,
        language: "python",
        executionTime: performance.now() - startTime,
    };
}

export function isPyodideLoaded(): boolean {
    return pyodideInstance !== null;
}

export function preloadPyodide(): void {
    loadPyodide().catch(console.error);
}
