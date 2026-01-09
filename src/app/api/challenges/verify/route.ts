// Challenge Code Verification API - Test Case Based Verification
// Runs actual test cases instead of AI guessing

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
            codeStr.includes('write your') ||
            (codeStr.includes('pass') && codeStr.includes('def ') && !codeStr.includes('passed'));

        if (hasPlaceholder) {
            return NextResponse.json({
                passed: false,
                total: test_cases.length,
                passed_count: 0,
                results: [],
                feedback: "Code appears incomplete. Please implement the solution first.",
            });
        }

        // Run each test case
        const results: TestResult[] = [];
        let passedCount = 0;

        for (let i = 0; i < test_cases.length; i++) {
            const testCase = test_cases[i];
            const testInput = testCase.input || "";
            const expectedOutput = (testCase.expected || "").trim();

            try {
                // Execute code with test input
                const execResult = await executeCode(code, language, testInput);

                if (!execResult.success) {
                    // Execution error (compile error, runtime error)
                    results.push({
                        test: i + 1,
                        input: testInput.substring(0, 50) + (testInput.length > 50 ? "..." : ""),
                        expected: expectedOutput.substring(0, 50) + (expectedOutput.length > 50 ? "..." : ""),
                        actual: "",
                        passed: false,
                        error: execResult.error || "Execution failed",
                    });
                    continue;
                }

                // Compare output (trim whitespace for comparison)
                const actualOutput = (execResult.output || "").trim();
                const passed = actualOutput === expectedOutput;

                if (passed) {
                    passedCount++;
                }

                results.push({
                    test: i + 1,
                    input: testInput.substring(0, 50) + (testInput.length > 50 ? "..." : ""),
                    expected: expectedOutput.substring(0, 50) + (expectedOutput.length > 50 ? "..." : ""),
                    actual: actualOutput.substring(0, 50) + (actualOutput.length > 50 ? "..." : ""),
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
            if (firstError?.error?.includes("Execution failed") || firstError?.error?.includes("Compilation")) {
                feedback = `❌ Code has errors. ${firstError.error}`;
            } else {
                feedback = `❌ 0/${test_cases.length} test cases passed. Check your logic.`;
            }
        } else {
            const failedTest = results.find(r => !r.passed);
            feedback = `⚠️ ${passedCount}/${test_cases.length} test cases passed. Test ${failedTest?.test} failed: expected "${failedTest?.expected}", got "${failedTest?.actual}"`;
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
