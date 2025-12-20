
const BASE_URL = "http://localhost:3000";

async function testResumeAnalysis() {
    console.log("Testing Resume Analysis API...");

    const resumeText = `
    John Doe
    Software Engineer
    Experience: 5 years in React, Node.js, and TypeScript.
    Skills: JavaScript, Python, SQL.
    Education: BS Computer Science.
  `;

    const formData = new FormData();
    formData.append("text", resumeText);
    formData.append("targetRole", "Software Engineer");

    try {
        const res = await fetch(`${BASE_URL}/api/resume/analyze`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error ${res.status}: ${err}`);
        }

        const data = await res.json();
        console.log("Analysis Result:", JSON.stringify(data, null, 2));

        // Simple validation
        if (typeof data.overallScore === 'number' && Array.isArray(data.sections)) {
            console.log("SUCCESS: Received valid analysis structure.");
        } else {
            console.error("FAILURE: Invalid response structure.");
            process.exit(1);
        }
    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
}

testResumeAnalysis();
