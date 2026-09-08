

const { execSync } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { join } = require('path');
const { randomUUID } = require('crypto');
const { tmpdir } = require('os');

async function executePythonNative(code, stdin = "") {
    let tempFile = "";
    try {
        console.log("[ExecutionService] Executing Python natively");
        
        const pythonCmd = "python";

        // Create temporary file for the code using OS temp directory
        tempFile = join(tmpdir(), `code_${randomUUID()}.py`);
        writeFileSync(tempFile, code);
        
        console.log("tempFile", tempFile);

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

executePythonNative('print("Hello")').then(console.log);
