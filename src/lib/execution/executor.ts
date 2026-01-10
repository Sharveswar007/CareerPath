// Unified Code Executor
// Routes execution to browser (JS/Python) or Piston API (Java/C++)

import { executeJavaScript, executePython, ExecutionResult } from "./browser-executor";

// Supported languages
export const SUPPORTED_LANGUAGES = ["javascript", "python", "java", "cpp"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Check if language is supported
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
    const normalized = lang.toLowerCase().replace("c++", "cpp");
    return SUPPORTED_LANGUAGES.includes(normalized as SupportedLanguage);
}

// Normalize language name
export function normalizeLanguage(lang: string): SupportedLanguage {
    const normalized = lang.toLowerCase();
    if (normalized === "c++" || normalized === "cpp") return "cpp";
    if (normalized === "js") return "javascript";
    if (normalized === "py") return "python";
    return normalized as SupportedLanguage;
}

// Check if language runs in browser (no API needed)
export function isBrowserLanguage(lang: string): boolean {
    const normalized = normalizeLanguage(lang);
    return normalized === "javascript" || normalized === "python";
}

// Execute code using the appropriate executor
export async function executeCode(
    code: string,
    language: string,
    stdin: string = ""
): Promise<ExecutionResult> {
    const normalizedLang = normalizeLanguage(language);

    console.log(`[Executor] Running ${normalizedLang}, input: "${stdin.substring(0, 50)}"`);

    if (!isLanguageSupported(normalizedLang)) {
        return {
            success: false,
            output: "",
            error: `Language "${language}" is not supported. Supported: JavaScript, Python, Java, C++`,
            language: normalizedLang,
        };
    }

    let result: ExecutionResult;

    // Route to appropriate executor
    switch (normalizedLang) {
        case "javascript":
            result = executeJavaScript(code, stdin);
            break;

        case "python":
            result = await executePython(code, stdin);
            break;

        case "java":
        case "cpp":
            // Use Piston API for Java/C++
            result = await executePiston(code, normalizedLang, stdin);
            break;

        default:
            result = {
                success: false,
                output: "",
                error: `Unsupported language: ${language}`,
                language: normalizedLang,
            };
    }

    console.log(`[Executor] Result: success=${result.success}, output="${result.output}", error="${result.error}"`);
    return result;
}

// Piston API execution for Java and C++
async function executePiston(
    code: string,
    language: SupportedLanguage,
    stdin: string = ""
): Promise<ExecutionResult> {
    const PISTON_API = "https://emkc.org/api/v2/piston";

    const config: Record<string, { language: string; version: string; fileName: string }> = {
        java: { language: "java", version: "15.0.2", fileName: "Main.java" },
        cpp: { language: "c++", version: "10.2.0", fileName: "main.cpp" },
    };

    const langConfig = config[language];
    if (!langConfig) {
        return {
            success: false,
            output: "",
            error: "Unsupported language for Piston",
            language,
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${PISTON_API}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: langConfig.language,
                version: langConfig.version,
                files: [{ name: langConfig.fileName, content: code }],
                stdin,
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
                language,
            };
        }

        const result = await response.json();

        // Check for compile errors
        if (result.compile && result.compile.code !== 0) {
            return {
                success: false,
                output: "",
                error: result.compile.stderr || result.compile.output || "Compilation error",
                language,
            };
        }

        // Check for runtime errors
        if (result.run && result.run.code !== 0) {
            return {
                success: false,
                output: result.run.stdout || "",
                error: result.run.stderr || "Runtime error",
                language,
            };
        }

        return {
            success: true,
            output: result.run?.stdout || result.run?.output || "",
            error: result.run?.stderr || null,
            language,
        };

    } catch (error: any) {
        if (error.name === "AbortError") {
            return {
                success: false,
                output: "",
                error: "Execution timed out. Please try again.",
                language,
            };
        }

        return {
            success: false,
            output: "",
            error: error.message || "Failed to execute code",
            language,
        };
    }
}
