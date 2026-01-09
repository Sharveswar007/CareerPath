// Piston API Client for Real Code Execution
// Optimized version with hardcoded versions to skip runtime fetch

const PISTON_API = "https://emkc.org/api/v2/piston";

interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    version: string;
}

// Hardcoded language configurations to avoid runtime fetch timeout
const LANGUAGE_CONFIG: Record<string, { language: string; version: string; fileName: string }> = {
    javascript: { language: "javascript", version: "18.15.0", fileName: "script.js" },
    js: { language: "javascript", version: "18.15.0", fileName: "script.js" },
    python: { language: "python", version: "3.10.0", fileName: "main.py" },
    py: { language: "python", version: "3.10.0", fileName: "main.py" },
    java: { language: "java", version: "15.0.2", fileName: "Main.java" },
    cpp: { language: "c++", version: "10.2.0", fileName: "main.cpp" },
    "c++": { language: "c++", version: "10.2.0", fileName: "main.cpp" },
    c: { language: "c", version: "10.2.0", fileName: "main.c" },
    typescript: { language: "typescript", version: "5.0.3", fileName: "script.ts" },
    ts: { language: "typescript", version: "5.0.3", fileName: "script.ts" },
    ruby: { language: "ruby", version: "3.0.1", fileName: "main.rb" },
    go: { language: "go", version: "1.16.2", fileName: "main.go" },
    rust: { language: "rust", version: "1.68.2", fileName: "main.rs" },
    php: { language: "php", version: "8.2.3", fileName: "main.php" },
};

// Execute code using Piston API with timeout
export async function executeCode(
    code: string,
    language: string,
    stdin: string = "" // NEW: Accept input for test cases
): Promise<ExecutionResult> {
    const langKey = language.toLowerCase();
    const config = LANGUAGE_CONFIG[langKey];

    if (!config) {
        return {
            success: false,
            output: "",
            error: `Language "${language}" is not supported. Supported: JavaScript, Python, Java, C++, C, TypeScript, Ruby, Go, Rust, PHP`,
            language: langKey,
            version: "unknown",
        };
    }

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(`${PISTON_API}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language: config.language,
                version: config.version,
                files: [
                    {
                        name: config.fileName,
                        content: code,
                    },
                ],
                stdin: stdin, // Pass the input to the code
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                output: "",
                error: `Server error: ${response.status}`,
                language: config.language,
                version: config.version,
            };
        }

        const result = await response.json();

        // Check for compile errors
        if (result.compile && result.compile.code !== 0) {
            return {
                success: false,
                output: "",
                error: result.compile.stderr || result.compile.output || "Compilation error",
                language: config.language,
                version: config.version,
            };
        }

        // Check for runtime errors
        if (result.run && result.run.code !== 0) {
            return {
                success: false,
                output: result.run.stdout || "",
                error: result.run.stderr || "Runtime error",
                language: config.language,
                version: config.version,
            };
        }

        // Success
        return {
            success: true,
            output: result.run?.stdout || result.run?.output || "",
            error: result.run?.stderr || null,
            language: config.language,
            version: config.version,
        };
    } catch (error: unknown) {
        // Handle timeout
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                output: "",
                error: "Execution timed out. Please try again.",
                language: config.language,
                version: config.version,
            };
        }

        console.error("Execution error:", error);
        return {
            success: false,
            output: "",
            error: "Failed to connect to code execution service. Please try again.",
            language: config.language,
            version: config.version,
        };
    }
}
