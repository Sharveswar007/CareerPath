// Challenge Code Verification API - Test Case Based Verification
// Runs actual test cases with robust comparison

import { NextRequest, NextResponse } from "next/server";
import { executeCode } from "@/lib/piston/client";

export const runtime = "nodejs";

interface TestCase {
    input: string;
    expected: string;
}

interface TestResult {
    test: number;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error?: string;
}

interface VerifyRequest {
    code: string;
    language: string;
    test_cases: TestCase[];
    challenge_title?: string;
}

// Normalize output for comparison - handles various edge cases
function normalizeOutput(output: string): string {
    return output
        .trim()                           // Remove leading/trailing whitespace
        .replace(/\r\n/g, '\n')          // Normalize line endings
        .replace(/\r/g, '\n')            // Normalize line endings
        .replace(/\n+$/, '')             // Remove trailing newlines
        .replace(/^\s+|\s+$/gm, '')      // Trim each line
        .toLowerCase();                   // Case-insensitive comparison
}

// Check if outputs match (with tolerance for formatting)
function outputsMatch(actual: string, expected: string): boolean {
    const normActual = normalizeOutput(actual);
    const normExpected = normalizeOutput(expected);

    // Exact match after normalization
    if (normActual === normExpected) return true;

    // Try numeric comparison (handles "15" vs "15.0" etc)
    const numActual = parseFloat(normActual);
    const numExpected = parseFloat(normExpected);
    if (!isNaN(numActual) && !isNaN(numExpected)) {
        return Math.abs(numActual - numExpected) < 0.0001;
    }

    // Check if actual output CONTAINS expected (for cases where code prints extra)
    if (normActual.includes(normExpected) || normExpected.includes(normActual)) {
        // Only if the core values match - extract numbers and compare
        const actualNums = normActual.match(/-?\d+\.?\d*/g);
        const expectedNums = normExpected.match(/-?\d+\.?\d*/g);
        if (actualNums && expectedNums && actualNums.length > 0 && expectedNums.length > 0) {
            return actualNums[0] === expectedNums[0];
        }
    }

    return false;
}

export async function POST(request: NextRequest) {
    try {
        const body: VerifyRequest = await request.json();
        const { code, language, test_cases, challenge_title } = body;

        // Validate input
        if (!code || code.trim().length === 0) {
            return NextResponse.json({
                passed: false,
                total: 0,
                passed_count: 0,
                results: [],
                feedback: "No code provided. Please write your solution first.",
            });
        }

        if (!test_cases || test_cases.length === 0) {
            return NextResponse.json({
                passed: false,
                total: 0,
                passed_count: 0,
                results: [],
                feedback: "No test cases available for this challenge.",
            });
        }

        // Check for placeholder/incomplete code
        const codeStr = code.toLowerCase();
        const hasPlaceholder =
            codeStr.includes('todo') ||
            codeStr.includes('your code here') ||
            codeStr.includes('write your');

        if (hasPlaceholder) {
            return NextResponse.json({
                passed: false,
                total: test_cases.length,
                passed_count: 0,
                results: [],
                feedback: "Code appears incomplete. Please implement the solution first.",
            });
        }

        // Run each test case with delay to avoid rate limits
        const results: TestResult[] = [];
        let passedCount = 0;

        for (let i = 0; i < test_cases.length; i++) {
            const testCase = test_cases[i];
            const testInput = String(testCase.input || "");
            const expectedOutput = String(testCase.expected || "");

            try {
                // Add small delay between test cases to avoid rate limit
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Execute code with test input
                const execResult = await executeCode(code, language, testInput);

                if (!execResult.success) {
                    // Check if it's a rate limit error
                    const isRateLimit = execResult.error?.includes('429') ||
                        execResult.error?.toLowerCase().includes('rate');

                    results.push({
                        test: i + 1,
                        input: testInput.substring(0, 50) + (testInput.length > 50 ? "..." : ""),
                        expected: expectedOutput.substring(0, 50) + (expectedOutput.length > 50 ? "..." : ""),
                        actual: "",
                        passed: false,
                        error: isRateLimit ? "Rate limited - please wait and retry" : (execResult.error || "Execution failed"),
                    });

                    // If rate limited, stop testing
                    if (isRateLimit) {
                        break;
                    }
                    continue;
                }

                // Compare output using robust comparison
                const actualOutput = execResult.output || "";
                const passed = outputsMatch(actualOutput, expectedOutput);

                if (passed) {
                    passedCount++;
                }

                results.push({
                    test: i + 1,
                    input: testInput.substring(0, 50) + (testInput.length > 50 ? "..." : ""),
                    expected: expectedOutput.trim().substring(0, 50),
                    actual: actualOutput.trim().substring(0, 50),
                    passed,
                    error: passed ? undefined : "Wrong answer",
                });

            } catch (err: any) {
                results.push({
                    test: i + 1,
                    input: testInput.substring(0, 50),
                    expected: expectedOutput.substring(0, 50),
                    actual: "",
                    passed: false,
                    error: err.message || "Test execution failed",
                });
            }
        }

        const allPassed = passedCount === test_cases.length;

        // Generate feedback
        let feedback: string;
        if (allPassed) {
            feedback = `✅ All ${test_cases.length} test cases passed! Great job!`;
        } else if (passedCount === 0) {
            const firstError = results.find(r => r.error);
            if (firstError?.error?.includes("Rate")) {
                feedback = `⏳ Rate limited. Please wait a moment and try again.`;
            } else if (firstError?.error?.includes("Execution") || firstError?.error?.includes("Compilation")) {
                feedback = `❌ Code has errors. ${firstError.error}`;
            } else {
                const failedTest = results.find(r => !r.passed);
                feedback = `❌ 0/${test_cases.length} test cases passed. Expected "${failedTest?.expected}", got "${failedTest?.actual}"`;
            }
        } else {
            const failedTest = results.find(r => !r.passed);
            feedback = `⚠️ ${passedCount}/${test_cases.length} passed. Test ${failedTest?.test}: expected "${failedTest?.expected}", got "${failedTest?.actual}"`;
        }

        return NextResponse.json({
            passed: allPassed,
            total: test_cases.length,
            passed_count: passedCount,
            results,
            feedback,
        });

    } catch (error: any) {
        console.error("Verification Error:", error);

        return NextResponse.json({
            passed: false,
            total: 0,
            passed_count: 0,
            results: [],
            feedback: "Error verifying code: " + (error.message || "Unknown error"),
        });
    }
}
