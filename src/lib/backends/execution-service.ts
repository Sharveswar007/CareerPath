// Backend execution service - tries multiple code execution services
// Falls back between services for reliability

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

interface ExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    language: string;
    // When true, this failure may be environment/sandbox-related rather than
    // a user-code problem, so the chain should try the next provider.
    retryable?: boolean;
}

// Try to find Python executable
function findPythonCommand(): string | null {
    const pythonCmds = ["python", "python3", "py"];
    for (const cmd of pythonCmds) {
        try {
            execSync(`${cmd} --version`, { stdio: "ignore" });
            console.log(`[ExecutionService] Found Python: ${cmd}`);
            return cmd;
        } catch (e) {
            // Command not found, try next one
        }
    }
    return null;
}

// Execute Python code natively
async function executePythonNative(code: string, stdin: string = ""): Promise<ExecutionResult | null> {
    let tempFile: string = "";
    try {
        console.log("[ExecutionService] Executing Python natively");
        
        // Find Python command
        const pythonCmd = findPythonCommand();
        if (!pythonCmd) {
            console.error("[ExecutionService] Python not found in PATH");
            return null;
        }

        // Create temporary file for the code using OS temp directory
        tempFile = join(tmpdir(), `code_${randomUUID()}.py`);
        writeFileSync(tempFile, code);
        
        const output = execSync(`${pythonCmd} "${tempFile}"`, {
            timeout: 10000,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            input: stdin || "",
        });

        console.log("[ExecutionService] Python execution successful");

        return {
            success: true,
            output: output.trim(),
            error: null,
            language: "python",
        };
    } catch (e) {
        const err = e as { stderr?: { toString(): string }; message?: string };
        const errorMessage = err.stderr?.toString() || err.message || String(e);
        console.error("[ExecutionService] Python execution failed:", errorMessage);
        
        return {
            success: false,
            output: "",
            error: errorMessage.substring(0, 500),
            language: "python",
        };
    } finally {
        try {
            if (tempFile) unlinkSync(tempFile);
        } catch (e) {
            console.error("[ExecutionService] Failed to cleanup temp file:", e);
        }
    }
}

// Execute Java code natively
async function executeJavaNative(code: string, stdin: string = ""): Promise<ExecutionResult | null> {
    let tempFile: string = "";
    try {
        console.log("[ExecutionService] Executing Java natively");
        
        // Create temporary file - Java requires specific filename format
        tempFile = join(tmpdir(), `Code_${randomUUID()}.java`);
        
        // Wrap code to make it a valid Java class
        const wrappedCode = `
public class Code_${randomUUID().replace(/-/g, "")} {
    public static void main(String[] args) {
        ${code}
    }
}
`;
        
        writeFileSync(tempFile, wrappedCode);
        
        const output = execSync(`java "${tempFile}"`, {
            timeout: 10000,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            input: stdin || "",
        });

        console.log("[ExecutionService] Java execution successful");

        return {
            success: true,
            output: output.trim(),
            error: null,
            language: "java",
        };
    } catch (e) {
        const err = e as { stderr?: { toString(): string }; message?: string };
        const errorMessage = err.stderr?.toString() || err.message || String(e);
        console.error("[ExecutionService] Java execution failed:", errorMessage);
        
        return {
            success: false,
            output: "",
            error: errorMessage.substring(0, 500),
            language: "java",
        };
    } finally {
        try {
            if (tempFile) unlinkSync(tempFile);
        } catch (e) {
            console.error("[ExecutionService] Failed to cleanup temp file:", e);
        }
    }
}
async function executeJavaScriptNative(code: string, stdin: string = ""): Promise<ExecutionResult | null> {
    let tempFile: string = "";
    try {
        console.log("[ExecutionService] Executing JavaScript natively");
        
        // Create temporary file for the code using OS temp directory
        tempFile = join(tmpdir(), `code_${randomUUID()}.js`);
        
        // Wrap code to capture output and handle stdin
        const wrappedCode = `
(async () => {
    const outputs = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => outputs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
    console.error = (...args) => outputs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
    
    try {
        ${code}
        console.log = originalLog;
        console.error = originalError;
        if (outputs.length > 0) {
            console.log(outputs.join('\\n'));
        }
    } catch (err) {
        console.log = originalLog;
        console.error = originalError;
        if (outputs.length > 0) {
            console.log(outputs.join('\\n'));
        }
        throw err;
    }
})();
`;

        writeFileSync(tempFile, wrappedCode);
        
        const output = execSync(`node "${tempFile}"`, {
            timeout: 10000,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });

        console.log("[ExecutionService] JavaScript execution successful");

        return {
            success: true,
            output: output.trim(),
            error: null,
            language: "javascript",
        };
    } catch (e) {
        const err = e as { stderr?: { toString(): string }; message?: string };
        const errorMessage = err.stderr?.toString() || err.message || String(e);
        console.error("[ExecutionService] JavaScript execution failed:", errorMessage);
        
        return {
            success: false,
            output: "",
            error: errorMessage.substring(0, 500), // Limit error message length
            language: "javascript",
        };
    } finally {
        // Clean up temporary file
        try {
            if (tempFile) unlinkSync(tempFile);
        } catch (e) {
            console.error("[ExecutionService] Failed to cleanup temp file:", e);
        }
    }
}

// Try Judge0 API
async function executeJudge0(code: string, language: string, stdin: string = ""): Promise<ExecutionResult | null> {
    try {
        // Judge0 language IDs
        const judge0Languages: Record<string, number> = {
            python: 71,      // Python 3
            python3: 71,
            py: 71,
            javascript: 63,   // Node.js
            js: 63,
            java: 62,        // Java
            cpp: 54,         // C++ (gcc)
            "c++": 54,
            c: 50,           // C (gcc)
            typescript: 74,  // TypeScript
            ts: 74,
        };

        const languageId = judge0Languages[language.toLowerCase()];
        if (languageId === undefined) return null;

        console.log("[ExecutionService] Judge0 request - language ID:", languageId);

        // Allow overriding Judge0 URL via environment variable
        // This is useful when hosting your own Judge0 CE instance
        let judge0Url = process.env.JUDGE0_URL;
        const isRapidApi = !judge0Url || judge0Url.includes("rapidapi.com");
        
        if (!judge0Url) {
            judge0Url = "https://judge0-ce.p.rapidapi.com";
        }
        
        // Remove trailing slash if present
        judge0Url = judge0Url.replace(/\/$/, "");

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (isRapidApi) {
            const rapidApiKey = process.env.RAPIDAPI_KEY;
            if (!rapidApiKey) {
                console.error("[ExecutionService] RapidAPI Judge0 selected but RAPIDAPI_KEY is not set");
                return null;
            }
            headers["X-RapidAPI-Key"] = rapidApiKey;
            headers["X-RapidAPI-Host"] = judge0Url.replace("https://", "").split("/")[0];
        } else {
            // Self-hosted Judge0 (e.g. behind a Cloudflare tunnel) requires an auth token
            // configured via AUTHN_HEADER/AUTHN_TOKEN in judge0.conf.
            const judge0AuthToken = process.env.JUDGE0_AUTH_TOKEN;
            if (judge0AuthToken) {
                headers["X-Auth-Token"] = judge0AuthToken;
            }
        }

        // Step 1: Submit code for execution
        const submitResponse = await fetch(`${judge0Url}/submissions?base64_encoded=false&wait=true`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                language_id: languageId,
                source_code: code,
                stdin: stdin || "",
                cpu_time_limit: 5,
                memory_limit: 64000
            }),
        });

        if (!submitResponse.ok) {
            const errText = await submitResponse.text().catch(() => "");
            console.error("[ExecutionService] Judge0 HTTP error:", submitResponse.status, errText);
            return null;
        }

        const result = await submitResponse.json();
        console.log("[ExecutionService] Judge0 response status:", result.status);

        // Check for compilation errors
        if (result.compile_output) {
            return {
                success: false,
                output: "",
                error: result.compile_output,
                language,
            };
        }

        // Check for runtime errors / stderr.
        // These can be genuine user-code errors OR sandbox/environment crashes
        // (e.g. WSL2 runtimes failing to spawn), so mark retryable and let the
        // chain try the next provider before giving up.
        if (result.stderr) {
            return {
                success: false,
                output: (result.stdout || "").trim(),
                error: result.stderr,
                language,
                retryable: true,
            };
        }

        // Check status code (3 = Accepted). Internal/exec-format errors
        // (8, 9, 10, 11, 12) mean the sandbox itself failed -> try next provider.
        if (result.status && result.status.id && result.status.id !== 3) {
            if ([8, 9, 10, 11, 12].includes(result.status.id)) {
                console.error("[ExecutionService] Judge0 internal error (status " + result.status.id + "), falling back");
                return null;
            }
            return {
                success: false,
                output: (result.stdout || "").trim(),
                error: result.message || result.status.description || "Execution failed",
                language,
                retryable: true,
            };
        }

        const output = (result.stdout || "").trim();
        console.log("[ExecutionService] Judge0 execution successful");

        return {
            success: true,
            output: output,
            error: null,
            language,
        };
    } catch (e) {
        console.error("[ExecutionService] Judge0 failed:", e);
        return null;
    }
}

// Try Wandbox (https://wandbox.org) - Free, no auth required
async function executeWandbox(code: string, language: string, stdin: string = ""): Promise<ExecutionResult | null> {
    try {
        // Wandbox compiler IDs from https://wandbox.org/api/list.json
        const wandboxLanguages: Record<string, string> = {
            python: "cpython-3.12.7",
            python3: "cpython-3.12.7",
            javascript: "nodejs-20.17.0",
            js: "nodejs-20.17.0",
            java: "openjdk-jdk-21+35",
            cpp: "gcc-head",
            "c++": "gcc-head",
            c: "gcc-head-c",
            ruby: "ruby-3.3.6",
            go: "go-1.23.2",
            rust: "rust-1.82.0",
            php: "php-8.3.12",
            typescript: "nodejs-20.17.0",
            ts: "nodejs-20.17.0",
        };

        const compiler = wandboxLanguages[language.toLowerCase()];
        if (!compiler) return null;

        console.log("[ExecutionService] Wandbox request - compiler:", compiler);

        const response = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
                retryable: true,
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

    // Best "failure" seen so far - returned only if every provider fails,
    // so the user gets the most informative error instead of a generic one.
    let bestFailure: ExecutionResult | null = null;

    const considerFailure = (r: ExecutionResult) => {
        if (!bestFailure || (r.retryable && !bestFailure.retryable)) {
            bestFailure = r;
        }
    };

    const tryProvider = (r: ExecutionResult | null): ExecutionResult | null => {
        if (!r) return null; // provider unreachable -> try next
        if (r.success) return r; // done
        if (r.retryable) {
            considerFailure(r);
            return null; // environment-ish failure -> try next
        }
        return r; // definitive user-code failure (e.g. compile error) -> final
    };

    // If a custom Judge0 URL is provided, prioritize it
    if (process.env.JUDGE0_URL) {
        console.log("[ExecutionService] Custom JUDGE0_URL detected. Trying Judge0 first...");
        const finalResult = tryProvider(await executeJudge0(code, langKey, stdin));
        if (finalResult) return finalResult;
    }

    // Try Wandbox (primary remote provider)
    console.log("[ExecutionService] Trying Wandbox...");
    {
        const finalResult = tryProvider(await executeWandbox(code, langKey, stdin));
        if (finalResult) return finalResult;
    }

    // Fallback to native execution if remote providers fail
    console.log("[ExecutionService] Trying native execution fallback...");

    // For JavaScript/TypeScript, use native Node.js execution
    if (langKey === "javascript" || langKey === "js" || langKey === "typescript") {
        console.log("[ExecutionService] Trying native JavaScript execution...");
        const nativeResult = await executeJavaScriptNative(code, stdin);
        if (nativeResult && nativeResult.success) return nativeResult;
        if (nativeResult) considerFailure(nativeResult);
    }

    // For Python, try native execution
    if (langKey === "python" || langKey === "py") {
        console.log("[ExecutionService] Trying native Python execution...");
        const nativeResult = await executePythonNative(code, stdin);
        if (nativeResult && nativeResult.success) return nativeResult;
        if (nativeResult) considerFailure(nativeResult);
    }

    // For Java, try native execution
    if (langKey === "java") {
        console.log("[ExecutionService] Trying native Java execution...");
        const nativeResult = await executeJavaNative(code, stdin);
        if (nativeResult && nativeResult.success) return nativeResult;
        if (nativeResult) considerFailure(nativeResult);
    }

    // Try Judge0 as last fallback
    if (["python", "py", "javascript", "js", "typescript", "cpp", "c", "java"].includes(langKey)) {
        console.log("[ExecutionService] Trying Judge0 as last fallback...");
        const finalResult = tryProvider(await executeJudge0(code, langKey, stdin));
        if (finalResult) return finalResult;
    }

    // All services failed - return the most informative failure we saw
    if (bestFailure) {
        console.error("[ExecutionService] All execution services failed; returning best failure");
        return bestFailure;
    }
    console.error("[ExecutionService] All execution services failed");
    return {
        success: false,
        output: "",
        error: "Code execution services are temporarily unavailable. Please try again or refresh the page.",
        language: langKey,
    };
}
