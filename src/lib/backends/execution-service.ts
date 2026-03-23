// Backend execution service - tries multiple code execution services
// Falls back between services for reliability

interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
}

// Try TIO.RUN (Try It Online) - Free, no auth required
async function executeTIO(code: string, language: string, stdin: string = ""): Promise<ExecutionResult | null> {
    try {
        const tioLanguages: Record<string, string> = {
            python: "python3",
            python3: "python3",
            javascript: "node-javascript",
            js: "node-javascript",
            java: "java",
            cpp: "gpp",
            c: "gcc",
            typescript: "node-javascript", // Run as JS
        };

        const tioLang = tioLanguages[language.toLowerCase()];
        if (!tioLang) return null;

        const payload = `Vlang\n${tioLang.length}\n${tioLang}\nVstdin\n${stdin.length}\n${stdin}\nVcode\n${code.length}\n${code}`;

        const response = await fetch("https://tio.run/api/run", {
            method: "POST",
            body: payload,
            headers: {
                "Content-Type": "application/octet-stream",
            },
        });

        if (!response.ok) return null;

        const text = await response.text();
        const lines = text.split("\n");
        const output = lines.slice(1).join("\n").trim();

        console.log("[ExecutionService] TIO execution successful");

        return {
            success: true,
            output,
            error: null,
            language,
        };
    } catch (e) {
        console.error("[ExecutionService] TIO failed:", e);
        return null;
    }
}

// Try Wandbox (https://wandbox.org) - Free, no auth required
async function executeWandbox(code: string, language: string, stdin: string = ""): Promise<ExecutionResult | null> {
    try {
        const wandboxLanguages: Record<string, string> = {
            python: "python3-head",
            python3: "python3-head",
            javascript: "nodejs-head",
            js: "nodejs-head",
            java: "openjdk-head",
            cpp: "gcc-head",
            "c++": "gcc-head",
            c: "gcc-head-c",
            ruby: "ruby-head",
            go: "go-head",
            rust: "rust-head",
            php: "php-head",
        };

        const compiler = wandboxLanguages[language.toLowerCase()];
        if (!compiler) return null;

        console.log("[ExecutionService] Wandbox request - compiler:", compiler);

        const response = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                compiler: compiler,
                code: code,
                stdin: stdin || "",
                options: "",
                save: false,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[ExecutionService] Wandbox HTTP error:", response.status, errorText);
            return null;
        }

        const result = await response.json();
        
        console.log("[ExecutionService] Wandbox response keys:", Object.keys(result));

        // Check for compiler errors
        if (result.compiler_error) {
            console.error("[ExecutionService] Wandbox compiler error:", result.compiler_error);
            return {
                success: false,
                output: result.compiler_output || "",
                error: result.compiler_error,
                language,
            };
        }

        // Check for runtime errors
        if (result.program_error) {
            console.error("[ExecutionService] Wandbox runtime error:", result.program_error);
            return {
                success: false,
                output: result.program_output || "",
                error: result.program_error,
                language,
            };
        }

        const output = (result.program_output || "").trim();
        console.log("[ExecutionService] Wandbox execution successful");

        return {
            success: true,
            output: output,
            error: null,
            language,
        };
    } catch (e) {
        console.error("[ExecutionService] Wandbox failed:", e);
        return null;
    }
}

// Main execution function that tries multiple services
export async function executeCodeViaBackend(
    code: string,
    language: string,
    stdin: string = ""
): Promise<ExecutionResult> {
    const langKey = language.toLowerCase();

    console.log(`[ExecutionService] Attempting to execute ${langKey} code`);

    if (!["python", "javascript", "java", "cpp", "c", "typescript", "py", "js"].includes(langKey)) {
        return {
            success: false,
            output: "",
            error: `Language "${language}" is not supported. Supported: JavaScript, Python, Java, C++, C, TypeScript`,
            language: langKey,
        };
    }

    // Try TIO first (most reliable)
    console.log("[ExecutionService] Trying TIO.RUN...");
    let result = await executeTIO(code, langKey, stdin);
    if (result) return result;

    // Fallback to Wandbox
    console.log("[ExecutionService] TIO failed, trying Wandbox...");
    result = await executeWandbox(code, langKey, stdin);
    if (result) return result;

    // All services failed
    console.error("[ExecutionService] All execution services failed");
    return {
        success: false,
        output: "",
        error: "Code execution services are temporarily unavailable. Please try again later.",
        language: langKey,
    };
}
