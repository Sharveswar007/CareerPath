// Real Code Execution API - Uses Piston for actual compilation
import { NextRequest, NextResponse } from "next/server";
import { executeCodeViaBackend } from "@/lib/backends/execution-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, language, stdin } = body; // Added stdin support

        // Validate input
        if (!code || code.trim().length === 0) {
            return NextResponse.json({
                success: false,
                output: "",
                error: "No code provided. Please write your solution first.",
            });
        }

        if (!language) {
            return NextResponse.json({
                success: false,
                output: "",
                error: "No language specified.",
            });
        }

        // Execute the code using backend Piston service with optional stdin
        const result = await executeCodeViaBackend(code, language, stdin || "");

        return NextResponse.json({
            success: result.success,
            output: result.output,
            error: result.error,
            language: result.language,
        });
    } catch (error: unknown) {
        console.error("Run Error:", error);
        return NextResponse.json({
            success: false,
            output: "",
            error: error instanceof Error ? error.message : "Failed to execute code",
        });
    }
}
