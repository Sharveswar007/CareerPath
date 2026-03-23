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
            shell: true,
        });

        console.log("[ExecutionService] Python execution successful");

        return {
            success: true,
            output: output.trim(),
            error: null,
            language: "python",
        };
    } catch (e: any) {
        const errorMessage = e.stderr?.toString() || e.message || String(e);
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
            shell: true,
        });

        console.log("[ExecutionService] Java execution successful");

        return {
            success: true,
            output: output.trim(),
            error: null,
            language: "java",
        };
    } catch (e: any) {
        const errorMessage = e.stderr?.toString() || e.message || String(e);
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
            shell: true,
        });

        console.log("[ExecutionService] JavaScript execution successful");

        return {
            success: true,
            output: output.trim(),
            error: null,
            language: "javascript",
        };
    } catch (e: any) {
        const errorMessage = e.stderr?.toString() || e.message || String(e);
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

// Try Judge0 API - Free, no auth required
async function executeJudge0(code: string, language: string, stdin: string = ""): Promise<ExecutionResult | null> {
    try {
        // Judge0 language IDs
        const judge0Languages: Record<string, number> = {
            python: 71,      // Python 3
            python3: 71,
            javascript: 63,   // Node.js
            js: 63,
            java: 62,        // Java
            cpp: 54,         // C++ (gcc)
            "c++": 54,
            c: 50,           // C (gcc)
            typescript: 63,  // Run as JavaScript
        };

        const languageId = judge0Languages[language.toLowerCase()];
        if (languageId === undefined) return null;

        console.log("[ExecutionService] Judge0 request - language ID:", languageId);

        // Step 1: Submit code for execution
        const submitResponse = await fetch("https://judge0.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RapidAPI-Key": "16726e4f4dmsh53eeca2383340c0p1f24dfjsnc4ecfdf6f9d5",
                "X-RapidAPI-Host": "judge0.p.rapidapi.com"
            },
            body: JSON.stringify({
                language_id: languageId,
                source_code: code,
                stdin: stdin || "",
                cpu_time_limit: 5,
                memory_limit: 64000
            }),
        });

        if (!submitResponse.ok) {
            console.error("[ExecutionService] Judge0 HTTP error:", submitResponse.status);
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

        // Check for runtime errors
        if (result.runtime_error) {
            return {
                success: false,
                output: result.stdout || "",
                error: result.runtime_error,
                language,
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
        // Wandbox compiler list (simplified)
        const wandboxLanguages: Record<string, string> = {
            python: "python",
            python3: "python",
            javascript: "nodejs",
            js: "nodejs",
            java: "java",
            cpp: "gcc-head",
            "c++": "gcc-head",
            c: "gcc-head",
            ruby: "ruby",
            go: "go",
            rust: "rust-head",
            php: "php",
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
                options: "-O0 -Wall",
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

    // For JavaScript/TypeScript, use native Node.js execution
    if (langKey === "javascript" || langKey === "js" || langKey === "typescript") {
        console.log("[ExecutionService] Using native JavaScript execution");
        const result = await executeJavaScriptNative(code, stdin);
        if (result) return result;
    }

    // For Python, try native execution first
    if (langKey === "python" || langKey === "py") {
        console.log("[ExecutionService] Trying native Python execution...");
        const result = await executePythonNative(code, stdin);
        if (result) return result;
        // Fall through to external services if native fails
    }

    // For Java, try native execution
    if (langKey === "java") {
        console.log("[ExecutionService] Trying native Java execution...");
        const result = await executeJavaNative(code, stdin);
        if (result) return result;
    }

    // Try Judge0 for compiled languages
    if (["cpp", "c", "java"].includes(langKey)) {
        console.log("[ExecutionService] Trying Judge0...");
        let result = await executeJudge0(code, langKey, stdin);
        if (result) return result;
    }

    // Fallback to Wandbox for any language
    console.log("[ExecutionService] Trying Wandbox as fallback...");
    let result = await executeWandbox(code, langKey, stdin);
    if (result) return result;

    // All services failed
    console.error("[ExecutionService] All execution services failed");
    return {
        success: false,
        output: "",
        error: "Code execution services are temporarily unavailable. Please try again or refresh the page.",
        language: langKey,
    };
}
