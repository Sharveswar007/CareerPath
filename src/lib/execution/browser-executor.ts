// Browser-based code execution for JavaScript and Python
// Detects and calls ANY user-defined function with test input

export interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    executionTime?: number;
}

// Execute JavaScript by detecting and calling user's function
export function executeJavaScript(code: string, testInput: string = ""): ExecutionResult {
    const startTime = performance.now();
    let output = "";
    let error: string | null = null;

    try {
        // Parse the test input as JSON
        let parsedInput: any;
        try {
            parsedInput = JSON.parse(testInput.trim());
        } catch {
            parsedInput = testInput.trim();
        }

        const logs: string[] = [];
        const mockConsole = {
            log: (...args: any[]) => {
                logs.push(args.map(a =>
                    typeof a === 'object' ? JSON.stringify(a) : String(a)
                ).join(" "));
            },
        };

        // Wrap code to find and call ANY defined function
        const wrappedCode = `
            (function() {
                const console = arguments[0];
                const _testInput = arguments[1];
                
                // Track functions before and after user code
                const _beforeFuncs = Object.keys(this).filter(k => typeof this[k] === 'function');
                
                // User's code
                ${code}
                
                // Find newly defined functions
                const _afterFuncs = Object.getOwnPropertyNames(arguments.callee.caller || {});
                
                // Try to find the user's function by pattern matching in code
                const funcMatch = \`${code.replace(/`/g, '\\`')}\`.match(/function\\s+(\\w+)|const\\s+(\\w+)\\s*=|let\\s+(\\w+)\\s*=|var\\s+(\\w+)\\s*=/);
                if (funcMatch) {
                    const funcName = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4];
                    try {
                        const fn = eval(funcName);
                        if (typeof fn === 'function') {
                            const result = fn(_testInput);
                            return result;
                        }
                    } catch(e) {}
                }
                
                return undefined;
            })
        `;

        const fn = eval(wrappedCode);
        const result = fn(mockConsole, parsedInput);

        if (result !== undefined) {
            output = typeof result === 'object' ? JSON.stringify(result) : String(result);
        } else if (logs.length > 0) {
            output = logs[logs.length - 1];
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

// Execute Python by detecting and calling ANY user-defined function
export async function executePython(code: string, testInput: string = ""): Promise<ExecutionResult> {
    const startTime = performance.now();
    let output = "";
    let error: string | null = null;

    try {
        const pyodide = await loadPyodide();
        const escapedInput = testInput.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const fullCode = `
import sys
import json
from io import StringIO

sys.stdout = StringIO()
sys.stderr = StringIO()

# Parse test input
_test_input_raw = '${escapedInput}'
try:
    _test_input = json.loads(_test_input_raw)
except:
    _test_input = _test_input_raw

# Get all names before user code
_before_names = set(dir())

# ============ USER CODE ============
${code}
# ===================================

# Find new function defined by user
_after_names = set(dir())
_new_names = _after_names - _before_names
_user_funcs = [n for n in _new_names if callable(eval(n)) and not n.startswith('_')]

_result = None
_found = False

# Call the first user-defined function
for _fname in _user_funcs:
    try:
        _func = eval(_fname)
        _result = _func(_test_input)
        _found = True
        break
    except TypeError:
        if isinstance(_test_input, (list, tuple)):
            try:
                _result = _func(*_test_input)
                _found = True
                break
            except:
                pass
    except:
        pass

_stdout = sys.stdout.getvalue().strip()

if _found and _result is not None:
    _final = str(_result)
elif _stdout:
    _final = _stdout.split('\\n')[-1]
else:
    _final = ""

sys.stdout = StringIO()
sys.stderr = StringIO()
_final
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
