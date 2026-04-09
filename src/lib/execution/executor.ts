// Unified Code Executor - All code execution via backend API
// Frontend calls backend service which uses Wandbox-first execution

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

    const hasTestInput = testInput.trim().length > 0;

    if (hasTestInput && normalizedLang === "python") {
        wrappedCode = wrapPythonCode(code, testInput);
    } else if (hasTestInput && normalizedLang === "javascript") {
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
        const apiSummary = {
            success: result.success,
            outputLength: result.output?.length || 0,
            error: result.error,
        };
        console.log("[Executor] API response:", JSON.stringify(apiSummary));

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

def _parse_args(raw_input):
    raw_input = (raw_input or "").strip()
    if not raw_input:
        return []

    try:
        parsed = json.loads(raw_input)
        if isinstance(parsed, (list, tuple)):
            return list(parsed)
        return [parsed]
    except Exception:
        pass

    args = []
    current = []
    depth = 0
    quote = None
    escape = False

    for char in raw_input:
        if escape:
            current.append(char)
            escape = False
            continue

        if char == "\\":
            current.append(char)
            escape = True
            continue

        if quote:
            current.append(char)
            if char == quote:
                quote = None
            continue

        if char in ("'", '"'):
            current.append(char)
            quote = char
            continue

        if char in "([{":
            depth += 1
            current.append(char)
            continue

        if char in ")]}":
            depth = max(0, depth - 1)
            current.append(char)
            continue

        if char == "," and depth == 0:
            arg = "".join(current).strip()
            if arg:
                try:
                    args.append(json.loads(arg))
                except Exception:
                    args.append(arg)
            current = []
            continue

        current.append(char)

    arg = "".join(current).strip()
    if arg:
        try:
            args.append(json.loads(arg))
        except Exception:
            args.append(arg)

    return args

_test_args = _parse_args(_test_input_raw)

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
        if len(_test_args) == 0:
            _result = _func()
        elif len(_test_args) == 1:
            _result = _func(_test_args[0])
        else:
            _result = _func(*_test_args)
        print(_result)
    except TypeError:
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
let _testArgs = [];

function _parseArgs(rawInput) {
    const value = String(rawInput || "").trim();
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        // Fall through to comma-aware parsing
    }

    const args = [];
    let current = "";
    let depth = 0;
    let quote = null;
    let escape = false;

    for (const char of value) {
        if (escape) {
            current += char;
            escape = false;
            continue;
        }

        if (char === "\\") {
            current += char;
            escape = true;
            continue;
        }

        if (quote) {
            current += char;
            if (char === quote) quote = null;
            continue;
        }

        if (char === '"' || char === "'") {
            current += char;
            quote = char;
            continue;
        }

        if (char === "[" || char === "{" || char === "(") {
            depth += 1;
            current += char;
            continue;
        }

        if (char === "]" || char === "}" || char === ")") {
            depth = Math.max(0, depth - 1);
            current += char;
            continue;
        }

        if (char === "," && depth === 0) {
            const token = current.trim();
            if (token) {
                try {
                    args.push(JSON.parse(token));
                } catch {
                    args.push(token);
                }
            }
            current = "";
            continue;
        }

        current += char;
    }

    const token = current.trim();
    if (token) {
        try {
            args.push(JSON.parse(token));
        } catch {
            args.push(token);
        }
    }

    return args;
}

try {
    _testInput = JSON.parse('${escapedInput}');
} catch {
    _testInput = '${escapedInput}';
}

_testArgs = _parseArgs('${escapedInput}');

// User code
${code}

// Find and call the user's function
const _funcMatch = \`${code.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`.match(/function\\s+(\\w+)|const\\s+(\\w+)\\s*=\\s*(?:function|\\(|async)/);
if (_funcMatch) {
    const _funcName = _funcMatch[1] || _funcMatch[2];
    try {
        const _fn = eval(_funcName);
        if (typeof _fn === 'function') {
            const _result = _testArgs.length > 1
                ? _fn(..._testArgs)
                : _testArgs.length === 1
                    ? _fn(_testArgs[0])
                    : _fn();
            console.log(typeof _result === 'object' ? JSON.stringify(_result) : _result);
        }
    } catch(e) {
        console.error('Error:', e.message);
    }
}
`;
}
