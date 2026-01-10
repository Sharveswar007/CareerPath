// Unified Code Executor - All languages via Piston API
// Simpler and more reliable than browser-based execution

export interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    executionTime?: number;
}

// Supported languages
export const SUPPORTED_LANGUAGES = ["javascript", "python", "java", "cpp"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Normalize language name
export function normalizeLanguage(lang: string): SupportedLanguage {
    const normalized = lang.toLowerCase();
    if (normalized === "c++" || normalized === "cpp") return "cpp";
    if (normalized === "js") return "javascript";
    if (normalized === "py") return "python";
    return normalized as SupportedLanguage;
}

// Check if language is supported
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
    const normalized = normalizeLanguage(lang);
    return SUPPORTED_LANGUAGES.includes(normalized);
}

// For compatibility - all use Piston now
export function isBrowserLanguage(lang: string): boolean {
    return false; // All use Piston API now
}

// Language configuration for Piston API
const PISTON_CONFIG: Record<string, { language: string; version: string; fileName: string }> = {
    javascript: { language: "javascript", version: "18.15.0", fileName: "main.js" },
    python: { language: "python", version: "3.10.0", fileName: "main.py" },
    java: { language: "java", version: "15.0.2", fileName: "Main.java" },
    cpp: { language: "c++", version: "10.2.0", fileName: "main.cpp" },
};

// Execute code using Piston API
export async function executeCode(
    code: string,
    language: string,
    testInput: string = ""
): Promise<ExecutionResult> {
    const startTime = performance.now();
    const normalizedLang = normalizeLanguage(language);

    console.log(`[Executor] Running ${normalizedLang}, input: "${testInput.substring(0, 100)}"`);

    if (!isLanguageSupported(normalizedLang)) {
        return {
            success: false,
            output: "",
            error: `Language "${language}" is not supported. Supported: JavaScript, Python, Java, C++`,
            language: normalizedLang,
        };
    }

    const config = PISTON_CONFIG[normalizedLang];
    if (!config) {
        return {
            success: false,
            output: "",
            error: `No config for language: ${normalizedLang}`,
            language: normalizedLang,
        };
    }

    // Wrap code to auto-call the user's function with test input
    let wrappedCode = code;

    if (normalizedLang === "python") {
        wrappedCode = wrapPythonCode(code, testInput);
    } else if (normalizedLang === "javascript") {
        wrappedCode = wrapJavaScriptCode(code, testInput);
    }
    // For Java/C++, user must handle stdin themselves for now

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: config.language,
                version: config.version,
                files: [{ name: config.fileName, content: wrappedCode }],
                stdin: testInput,
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                success: false,
                output: "",
                error: `Server error: ${response.status}`,
                language: normalizedLang,
                executionTime: performance.now() - startTime,
            };
        }

        const result = await response.json();
        console.log(`[Executor] Piston result:`, result);

        // Check for compile errors
        if (result.compile && result.compile.code !== 0) {
            return {
                success: false,
                output: "",
                error: result.compile.stderr || result.compile.output || "Compilation error",
                language: normalizedLang,
                executionTime: performance.now() - startTime,
            };
        }

        // Check for runtime errors
        if (result.run && result.run.code !== 0) {
            return {
                success: false,
                output: result.run.stdout || "",
                error: result.run.stderr || "Runtime error",
                language: normalizedLang,
                executionTime: performance.now() - startTime,
            };
        }

        const output = (result.run?.stdout || result.run?.output || "").trim();
        console.log(`[Executor] Output: "${output}"`);

        return {
            success: true,
            output,
            error: null,
            language: normalizedLang,
            executionTime: performance.now() - startTime,
        };

    } catch (error: any) {
        console.error(`[Executor] Error:`, error);

        if (error.name === "AbortError") {
            return {
                success: false,
                output: "",
                error: "Execution timed out (15s limit)",
                language: normalizedLang,
                executionTime: performance.now() - startTime,
            };
        }

        return {
            success: false,
            output: "",
            error: error.message || "Failed to execute code",
            language: normalizedLang,
            executionTime: performance.now() - startTime,
        };
    }
}

// Wrap Python code to auto-call user's function with test input
function wrapPythonCode(code: string, testInput: string): string {
    const escapedInput = testInput.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

    return `
import json
import sys

# Parse test input
_test_input_raw = '${escapedInput}'
try:
    _test_input = json.loads(_test_input_raw)
except:
    _test_input = _test_input_raw

# Get functions before user code
_before = set(dir())

# ===== USER CODE =====
${code}
# =====================

# Find new functions
_after = set(dir())
_new_funcs = [n for n in (_after - _before) if callable(eval(n)) and not n.startswith('_')]

# Call the first user-defined function
if _new_funcs:
    _func = eval(_new_funcs[0])
    try:
        _result = _func(_test_input)
        print(_result)
    except TypeError:
        if isinstance(_test_input, (list, tuple)):
            try:
                _result = _func(*_test_input)
                print(_result)
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
        else:
            print(f"Error calling function", file=sys.stderr)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
`;
}

// Wrap JavaScript code to auto-call user's function with test input
function wrapJavaScriptCode(code: string, testInput: string): string {
    const escapedInput = testInput.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

    return `
// Parse test input
let _testInput;
try {
    _testInput = JSON.parse('${escapedInput}');
} catch {
    _testInput = '${escapedInput}';
}

// User code
${code}

// Find and call the user's function
const _funcMatch = \`${code.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`.match(/function\\s+(\\w+)|const\\s+(\\w+)\\s*=\\s*(?:function|\\(|async)/);
if (_funcMatch) {
    const _funcName = _funcMatch[1] || _funcMatch[2];
    try {
        const _fn = eval(_funcName);
        if (typeof _fn === 'function') {
            const _result = _fn(_testInput);
            console.log(typeof _result === 'object' ? JSON.stringify(_result) : _result);
        }
    } catch(e) {
        console.error('Error:', e.message);
    }
}
`;
}
