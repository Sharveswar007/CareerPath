// Backend execution service using Piston API (reliable and working)
// This runs on the backend to hide API calls and avoid CORS issues

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

interface PistonRequest {
    language: string;
    version: string;
    files: Array<{ name: string; content: string }>;
    stdin?: string;
    args?: string[];
    compile_timeout?: number;
    run_timeout?: number;
}

interface PistonResponse {
    run: {
        stdout: string;
        stderr: string;
        code: number;
        signal: string | null;
    };
    compile?: {
        stdout: string;
        stderr: string;
        code: number;
        signal: string | null;
    };
}

interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
}

// Language to Piston language mapping
const LANGUAGE_CONFIG: Record<string, { language: string; version: string; extension: string }> = {
    javascript: { language: "javascript", version: "18.8.0", extension: "js" },
    js: { language: "javascript", version: "18.8.0", extension: "js" },
    python: { language: "python", version: "3.10.0", extension: "py" },
    py: { language: "python", version: "3.10.0", extension: "py" },
    java: { language: "java", version: "15.0.1", extension: "java" },
    cpp: { language: "cpp", version: "10.2.0", extension: "cpp" },
    "c++": { language: "cpp", version: "10.2.0", extension: "cpp" },
    c: { language: "c", version: "10.2.0", extension: "c" },
    typescript: { language: "typescript", version: "4.7.4", extension: "ts" },
    ts: { language: "typescript", version: "4.7.4", extension: "ts" },
};

export async function executeCodeViaBackend(
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
            error: `Language "${language}" is not supported`,
            language: langKey,
        };
    }

    try {
        const requestBody: PistonRequest = {
            language: config.language,
            version: config.version,
            files: [
                {
                    name: `main.${config.extension}`,
                    content: code,
                },
            ],
            stdin: stdin || undefined,
            run_timeout: 15000,
        };

        console.log("[ExecutionService] Executing code via Piston API");

        const response = await fetch(PISTON_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error(`[ExecutionService] Piston error: ${response.status}`);
            return {
                success: false,
                output: "",
                error: `Execution service error: ${response.status}`,
                language,
            };
        }

        const result: PistonResponse = await response.json();

        // Check for compilation errors
        if (result.compile && result.compile.code !== 0) {
            const stderr = result.compile.stderr || result.compile.stdout || "Compilation failed";
            console.error("[ExecutionService] Compilation error:", stderr);
            return {
                success: false,
                output: "",
                error: stderr,
                language,
            };
        }

        // Check for runtime errors
        if (result.run.code !== 0) {
            const stderr = result.run.stderr || "Runtime error";
            const stdout = result.run.stdout || "";
            console.error("[ExecutionService] Runtime error:", stderr);
            return {
                success: false,
                output: stdout,
                error: stderr,
                language,
            };
        }

        const output = (result.run.stdout || "").trim();
        console.log("[ExecutionService] Execution successful");

        return {
            success: true,
            output,
            error: null,
            language,
        };
    } catch (error) {
        console.error("[ExecutionService] Error:", error);
        return {
            success: false,
            output: "",
            error: error instanceof Error ? error.message : "Execution failed",
            language,
        };
    }
}
