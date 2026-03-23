// Unified Code Executor - All code execution via backend API
// Frontend calls backend service which uses Piston API

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

// For compatibility
export function isBrowserLanguage(lang: string): boolean {
    return false; // All execution via backend API
}

// Execute code by calling backend API
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

    // Wrap code to auto-call the user's function with test input
    let wrappedCode = code;

    if (normalizedLang === "python") {
        wrappedCode = wrapPythonCode(code, testInput);
    } else if (normalizedLang === "javascript") {
        wrappedCode = wrapJavaScriptCode(code, testInput);
    }
    // For Java/C++, user must handle stdin themselves for now

    try {
        console.log("[Executor] Calling backend API at /api/challenges/run");
        
        const response = await fetch("/api/challenges/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: wrappedCode,
                language: normalizedLang,
                stdin: testInput,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Executor] API error:", response.status, errorText);
            return {
                success: false,
                output: "",
                error: `API error: ${response.status}`,
                language: normalizedLang,
                executionTime: performance.now() - startTime,
            };
        }

        const result = await response.json();
        console.log("[Executor] API response:", {
            success: result.success,
            outputLength: result.output?.length || 0,
            error: result.error,
        });

        return {
            success: result.success,
            output: result.output || "",
            error: result.error || null,
            language: normalizedLang,
            executionTime: performance.now() - startTime,
        };
    } catch (error: any) {
        console.error("[Executor] Error:", error);

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
