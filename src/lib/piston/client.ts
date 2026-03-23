// Wandbox API Client for Real Code Execution
// Supports 50+ languages via wandbox.org (Free, no auth required)

const WANDBOX_API = "https://wandbox.org/api/compile.json";

interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    version: string;
}

// Wandbox compiler identifiers
const LANGUAGE_CONFIG: Record<string, { compiler: string; version: string }> = {
    javascript: { compiler: "node-head", version: "Node.js" },
    js: { compiler: "node-head", version: "Node.js" },
    python: { compiler: "python3", version: "Python 3" },
    py: { compiler: "python3", version: "Python 3" },
    java: { compiler: "java-openjdk-head", version: "OpenJDK" },
    cpp: { compiler: "gcc-head", version: "GCC C++" },
    "c++": { compiler: "gcc-head", version: "GCC C++" },
    c: { compiler: "gcc-head-c", version: "GCC C" },
    typescript: { compiler: "node-typescript-head", version: "TypeScript" },
    ts: { compiler: "node-typescript-head", version: "TypeScript" },
    ruby: { compiler: "ruby-head", version: "Ruby" },
    go: { compiler: "go-head", version: "Go" },
    rust: { compiler: "rust-head", version: "Rust" },
    php: { compiler: "php-head", version: "PHP" },
};

// Execute code using Wandbox API with timeout
export async function executeCode(
    code: string,
    language: string,
    stdin: string = ""
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // Wandbox API expects: compiler, code, stdin, options, save
        const requestBody = {
            compiler: config.compiler,
            code: code,
            stdin: stdin || "",
            options: "",
            save: false,
        };

        console.log("[Wandbox] Sending request to:", WANDBOX_API, {
            compiler: config.compiler,
            codeLength: code.length,
            stdinLength: stdin?.length || 0,
        });

        const response = await fetch(WANDBOX_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseText = await response.text();

        console.log("[Wandbox] Response status:", response.status);
        console.log("[Wandbox] Response preview:", responseText.substring(0, 200));

        if (!response.ok) {
            console.error("[Wandbox] Error response:", responseText);
            return {
                success: false,
                output: "",
                error: `Wandbox error (${response.status}): ${response.statusText}`,
                language: config.compiler,
                version: config.version,
            };
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error("[Wandbox] Failed to parse JSON:", responseText);
            return {
                success: false,
                output: "",
                error: "Invalid JSON response from Wandbox",
                language: config.compiler,
                version: config.version,
            };
        }

        console.log("[Wandbox] Parsed result keys:", Object.keys(result));

        // Check for compilation errors
        if (result.compiler_error && result.compiler_error.length > 0) {
            return {
                success: false,
                output: "",
                error: result.compiler_error,
                language: config.compiler,
                version: config.version,
            };
        }

        // Check for runtime errors
        if (result.program_error && result.program_error.length > 0) {
            return {
                success: false,
                output: result.program_output || "",
                error: result.program_error,
                language: config.compiler,
                version: config.version,
            };
        }

        // Success - return program output
        const output = (result.program_output || "").trim();
        console.log("[Wandbox] Success output:", output);

        return {
            success: true,
            output: output,
            error: null,
            language: config.compiler,
            version: config.version,
        };
    } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
            return {
                success: false,
                output: "",
                error: "Execution timed out (15s limit)",
                language: langKey,
                version: "unknown",
            };
        }

        console.error("[Wandbox] Execution error:", error);
        return {
            success: false,
            output: "",
            error: error instanceof Error ? error.message : "Failed to execute code",
            language: langKey,
            version: "unknown",
        };
    }
}
