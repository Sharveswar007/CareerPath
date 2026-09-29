// Mock vLLM server - OpenAI-compatible endpoints for GPU-free local testing.
// Speaks enough of the protocol for the CareerPath app: streaming, JSON mode,
// model listing. NOT for concurrency testing (that happens on the real GPU).
//
// Each app route has its own JSON contract; responses below mirror those
// contracts exactly (checked against the route source files).
//
// Usage:  node server/dev/mock-vllm.mjs   (listens on :8001)
import http from "node:http";

const PORT = process.env.MOCK_VLLM_PORT || 8001;
const MODEL = process.env.AI_MODEL || "careerpath-ai";

// ---- JSON payloads per route contract ----

// POST /api/assessment/generate (json_object, "question set" prompt)
function assessmentQuestions() {
  return JSON.stringify({
    questions: [
      {
        id: "ck1",
        category: "career_knowledge",
        type: "multiple_choice",
        question: "Which skill is most important for a data analyst? (mock)",
        options: ["SQL", "Public speaking", "Graphic design", "Welding"],
        correctAnswer: 0,
        explanation: "SQL is core to data analysis.",
        difficulty: "easy",
      },
      {
        id: "ck2",
        category: "career_knowledge",
        type: "multiple_choice",
        question: "What does ETL stand for? (mock)",
        options: ["Extract, Transform, Load", "Evaluate, Test, Launch", "Enter, Track, Log", "Export, Transfer, Link"],
        correctAnswer: 0,
        explanation: "ETL = Extract, Transform, Load.",
        difficulty: "easy",
      },
      {
        id: "ap1",
        category: "aptitude",
        type: "multiple_choice",
        question: "What is 15% of 200? (mock)",
        options: ["30", "20", "35", "25"],
        correctAnswer: 0,
        explanation: "0.15 * 200 = 30.",
        difficulty: "easy",
      },
      {
        id: "si1",
        category: "situation",
        type: "multiple_choice",
        question: "A deadline is at risk. Best first step? (mock)",
        options: ["Inform stakeholders early with a recovery plan", "Hide the problem", "Blame a teammate", "Skip testing to move faster"],
        correctAnswer: 0,
        explanation: "Early communication plus a plan is best practice.",
        difficulty: "medium",
      },
    ],
  });
}

// POST /api/skills/quiz/generate (bare JSON array contract)
function skillsQuizArray() {
  return JSON.stringify([
    { id: 1, question: "Mock: which SQL clause filters rows?", options: ["WHERE", "ORDER BY", "LIMIT", "GROUP BY"], correctAnswer: "WHERE" },
    { id: 2, question: "Mock: Python library for dataframes?", options: ["pandas", "flask", "requests", "pillow"], correctAnswer: "pandas" },
  ]);
}

// POST /api/challenges/generate (json challenge contract)
function codingChallenge() {
  return JSON.stringify({
    title: "Mock Two Sum",
    description: "Return indices of two numbers adding to target. (mock)",
    examples: [{ input: "[2,7,11,15], 9", output: "[0,1]", explanation: "2+7=9" }],
    constraints: ["Exactly one solution exists"],
    testCases: [
      { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", isHidden: false },
      { input: "[3,2,4], 6", expectedOutput: "[1,2]", isHidden: true },
    ],
    hints: ["Use a hash map", "One pass", "Watch for duplicates"],
    optimalComplexity: { time: "O(n)", space: "O(n)" },
  });
}

// POST /api/resume/analyze - validation step
function resumeValidation() {
  return JSON.stringify({ isResume: true, confidence: 90, reason: "mock: contains skills and experience sections" });
}

// POST /api/resume/analyze - analysis step
function resumeAnalysis() {
  return JSON.stringify({
    overallScore: 72,
    atsScore: 80,
    sections: [
      { name: "Education", score: 75, feedback: "Mock feedback", suggestions: ["Add GPA"] },
      { name: "Skills", score: 70, feedback: "Mock feedback", suggestions: ["Add cloud skills"] },
    ],
    missingKeywords: ["Docker", "Kubernetes"],
    strengthKeywords: ["Python", "SQL"],
    formatIssues: ["Mock: use consistent date formats"],
    recommendations: ["Mock: quantify achievements with numbers"],
  });
}

// POST /api/assessment/submit (skills gap / roadmap)
function skillsGap() {
  return JSON.stringify({
    readinessScore: 65,
    strengths: ["Mock: fundamentals"],
    weaknesses: ["Mock: system design"],
    roadmap: [
      { phase: "Phase 1", title: "SQL basics", duration: "2 weeks", resources: [{ title: "Mock course", url: "https://example.com", type: "free" }] },
      { phase: "Phase 2", title: "Projects", duration: "3 weeks", resources: [{ title: "Mock guide", url: "https://example.com", type: "free" }] },
    ],
  });
}

// Trends / exams / generic json_object fallback
function trendsJson() {
  return JSON.stringify({
    trendingCareers: [{ title: "Mock AI Engineer", demandLevel: "High", salaryRange: "8-25 LPA" }],
    summary: "Mock trend data for local testing.",
  });
}

// NEW structured contracts (generateStructured prompts)

// skills/quiz/generate: { questions: [...] }
function structuredQuiz() {
  return JSON.stringify({
    questions: [
      { id: 1, question: "Mock: which SQL clause filters rows?", options: ["WHERE", "ORDER BY", "GROUP BY", "LIMIT"], correctAnswer: "WHERE" },
      { id: 2, question: "Mock: what does a LEFT JOIN return?", options: ["All rows from the left table", "Only matches", "Only right rows", "Cartesian product"], correctAnswer: "All rows from the left table" },
      { id: 3, question: "Mock: pandas function to read CSV?", options: ["read_csv", "open_csv", "load_csv", "import_csv"], correctAnswer: "read_csv" },
      { id: 4, question: "Mock: chart type for trends over time?", options: ["Line", "Pie", "Scatter", "Map"], correctAnswer: "Line" },
      { id: 5, question: "Mock: median of [1,2,3,4]?", options: ["2.5", "2", "3", "4"], correctAnswer: "2.5" },
    ],
  });
}

// challenges/generate: single challenge object
function structuredChallenge() {
  return JSON.stringify({
    title: "Mock Two Sum",
    description: "Return indices of two numbers adding to the target.",
    difficulty: "medium",
    category: "Arrays",
    starter_code: { python: "def solve():\n    pass", java: "class Solution {}", c: "void solve() {}", cpp: "void solve() {}" },
    test_cases: [{ input: "[2,7,11,15], 9", expected: "[0,1]" }],
  });
}

// exams/generate: full test object
function structuredExamTest() {
  return JSON.stringify({
    mcqs: [
      { question: "Mock: Big-O of binary search?", options: ["O(log n)", "O(n)", "O(n^2)", "O(1)"], correct_answer: "O(log n)" },
      { question: "Mock: which is a JS primitive?", options: ["number", "array", "object", "function"], correct_answer: "number" },
    ],
    fill_in_blanks: [{ code_snippet: "function add(a, b) { return ___; }", correct_answer: "a + b" }],
    coding_questions: [
      {
        title: "Mock Sum Two",
        description: "Return a+b.",
        starter_code: { python: "def solve(a, b):\n    # YOUR CODE HERE\n    pass" },
        test_cases: [
          { input: "1, 2", expected: "3", is_hidden: false },
          { input: "10, 20", expected: "30", is_hidden: true },
        ],
      },
    ],
  });
}

function buildContent(body) {
  const prompt = (body.messages || []).map((m) => m.content || "").join("\n");

  // JSON mode (response_format: json_object) - pick the right JSON contract
  if (body.response_format?.type === "json_object") {
    if (/question set|assessment/i.test(prompt)) return JSON.stringify(JSON.parse(assessmentQuestions()));
    if (/isResume/i.test(prompt)) return resumeValidation();
    if (/overallScore|atsScore/i.test(prompt)) return JSON.stringify(JSON.parse(resumeAnalysis()));
    if (/readiness|roadmap|skill gap|strengths/i.test(prompt)) return JSON.stringify(JSON.parse(skillsGap()));
    if (/coding challenge|testCases|optimalComplexity/i.test(prompt)) return JSON.stringify(JSON.parse(codingChallenge()));
    if (/exam/i.test(prompt)) {
      return JSON.stringify({
        updates: [
          { date: "2026-01-15", title: "Mock JEE Main Session 1", description: "Mock exam update for local testing", status: "Notification out" },
          { date: "2026-02-10", title: "Mock GATE 2026", description: "Mock exam update for local testing", status: "Admit card released" },
        ],
      });
    }
    return JSON.stringify(JSON.parse(trendsJson()));
  }

  // Bare JSON array contract (skills quiz generate route)
  if (/strictly as a JSON array/i.test(prompt)) return skillsQuizArray();

  // NEW structured contracts (generateStructured prompts)
  if (/interview questions to assess/i.test(prompt)) return JSON.stringify(JSON.parse(structuredQuiz()));
  if (/coding challenge for a/i.test(prompt)) return JSON.stringify(JSON.parse(structuredChallenge()));
  if (/comprehensive technical test/i.test(prompt)) return JSON.stringify(JSON.parse(structuredExamTest()));

  // Coding challenge generation
  if (/coding challenge|testCases|optimalComplexity/i.test(prompt)) return JSON.stringify(JSON.parse(codingChallenge()));

  // Default: chat reply
  return "This is a **mock response** from the local test model. The full AI server (CodeLlama-13B on the RTX 5090) will provide real career guidance on the production machine.";
}

const server = http.createServer((req, res) => {
  // Mirror vLLM's --api-key behavior: 401 without a valid Bearer key
  // (except the health endpoint). Set MOCK_VLLM_KEY to enable.
  const REQUIRED_KEY = process.env.MOCK_VLLM_KEY;
  if (REQUIRED_KEY && req.url !== "/health" && req.url !== "/healthz") {
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${REQUIRED_KEY}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
      return;
    }
  }
  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ object: "list", data: [{ id: MODEL, object: "model", owned_by: "mock" }] }));
    return;
  }
  if (req.method === "GET" && (req.url === "/health" || req.url === "/healthz")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", mock: true }));
    return;
  }
  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(data || "{}"); } catch { /* keep {} */ }
      const content = buildContent(body);
      const id = "chatcmpl-mock-" + Date.now();
      const created = Math.floor(Date.now() / 1000);

      if (body.stream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        // Stream in word chunks like a real model
        const pieces = content.match(/.{1,12}/s) || [content];
        let i = 0;
        const timer = setInterval(() => {
          if (i < pieces.length) {
            const chunk = {
              id, object: "chat.completion.chunk", created, model: MODEL,
              choices: [{ index: 0, delta: { content: pieces[i] }, finish_reason: null }],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            i++;
          } else {
            const done = {
              id, object: "chat.completion.chunk", created, model: MODEL,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            };
            res.write(`data: ${JSON.stringify(done)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            clearInterval(timer);
          }
        }, 15);
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id, object: "chat.completion", created, model: MODEL,
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      }));
    });
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: `mock vLLM: no route for ${req.method} ${req.url}` } }));
});

server.listen(PORT, () => {
  console.log(`[mock-vllm] listening on http://localhost:${PORT} (model: ${MODEL})`);
});
