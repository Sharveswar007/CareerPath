# CareerPath

CareerPath is a full-stack AI-enabled career development platform for students. It combines onboarding, personalized assessment, skills-gap analysis, coding challenge practice, resume analysis, exam updates, and career trend insights in one application.

The project is built with Next.js App Router, Supabase (database and auth), and Groq for AI-powered workflows.

## Table of Contents

1. Project Overview
2. Core Capabilities
3. Technology Stack
4. System Architecture
5. Repository Structure
6. API Surface
7. Data Model
8. Local Development Setup
9. Environment Variables
10. Database Setup
11. Build, Run, and Lint Commands
12. Deployment Notes
13. Operational Notes and Troubleshooting
14. Security and Data Ownership
15. Contribution Guidelines

## Project Overview

CareerPath provides an integrated workflow for student career progression:

1. A student signs in and completes profile onboarding.
2. The platform captures target career preferences.
3. The system generates a structured assessment and evaluates responses.
4. A readiness score and skill-gap analysis are produced.
5. The student practices curated coding challenges with executable test validation.
6. Resume analysis produces ATS scoring and improvement recommendations.
7. The profile dashboard aggregates outcomes for students and faculty-facing review workflows.

## Core Capabilities

### 1) AI Chat Counseling

- Context-aware career counseling chat powered by Groq.
- Persistent chat history stored in Supabase.
- Response streaming on supported flows.

### 2) Personalized Assessment

- AI-generated question sets with enforced category distribution.
- Current generation strategy is optimized for low latency with fallback batching.
- Server-side score recomputation is used to prevent client-side tampering.

### 3) Skills Gap Analysis

- Readiness score calculation and strengths/weaknesses mapping.
- Analysis records persisted in `skills_gap_analysis`.

### 4) Coding Challenges

- Challenge generation and challenge library support.
- In-browser editor via Monaco.
- Real execution pipeline through backend execution services.
- Test verification with normalized output comparison (string, numeric, and structured JSON-like outputs).
- Draft autosave for challenge code in browser storage.

### 5) Resume Analysis and ATS

- Accepts PDF, image, and text inputs.
- Uses text extraction and OCR fallback when needed.
- AI validates whether document content is a resume before scoring.
- ATS and recommendations are saved into `resume_analyses` for profile reporting.

### 6) Trends and Exam Updates

- Career trend endpoints and booming role insights.
- Exam update retrieval and display workflows.

## Technology Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Radix UI primitives
- Monaco Editor

### Backend and Data

- Next.js API routes
- Supabase Auth
- Supabase PostgreSQL with Row Level Security

### AI and External Services

- Groq API (LLM workflows)
- OCR.space API (optional OCR path for resume extraction)
- Tavily API (optional trend/search enrichment)
- Multi-backend challenge execution flow (Wandbox-first execution with additional fallbacks configured in backend service)

## System Architecture

At a high level:

1. UI pages in `src/app` call API routes in `src/app/api`.
2. API routes orchestrate AI providers and persistence.
3. Supabase stores user, assessment, challenge, resume, and activity data.
4. Execution service handles code runs for challenge validation.

## Repository Structure

```text
careerpath/
   src/
      app/
         api/
            assessment/
            challenges/
            chat/
            exams/
            resume/
            skills/
            trends/
         challenges/
         onboarding/
         profile/
         quiz/
         resume/
         skills/
         trends/
      components/
      lib/
         backends/
         execution/
         groq/
         supabase/
         tavily/
      types/
   supabase/
      schema.sql
   DEPLOY.md
   PROJECT_WRITEUP.md
   package.json
   README.md
```

## API Surface

Current route handlers under `src/app/api/**/route.ts`:

### Assessment

- `POST /api/assessment/generate`
- `POST /api/assessment/submit`

### Challenges

- `POST /api/challenges/bulk-generate`
- `POST /api/challenges/categories`
- `POST /api/challenges/generate`
- `POST /api/challenges/run`
- `POST /api/challenges/verify`

### Skills

- `POST /api/skills/quiz/generate`
- `POST /api/skills/quiz/analyze`

### Resume

- `POST /api/resume/analyze`

### Chat

- `POST /api/chat`

### Trends

- `GET /api/trends/[career]`
- `GET /api/trends/booming`

### Exams

- `GET /api/exams/updates`

## Data Model

The primary tables are defined in `supabase/schema.sql`:

- `profiles`
- `career_selections`
- `user_assessments`
- `skills_gap_analysis`
- `coding_challenges`
- `coding_submissions`
- `resume_analyses`
- `chat_history`
- `user_activity`

The schema includes Row Level Security policies so users can only access their own records for protected tables.

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+ (or compatible package manager)
- Supabase project
- Groq API key

### Steps

1. Clone the repository.
2. Install dependencies.
3. Create `.env.local`.
4. Apply `supabase/schema.sql` to your Supabase project.
5. Run development server.

```bash
git clone https://github.com/Sharveswar007/CareerPath.git
cd CareerPath
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` with the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
TAVILY_API_KEY=
OCR_SPACE_API_KEY=
```

Required in most environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

Optional but feature-dependent:

- `TAVILY_API_KEY` for trend/search enrichment
- `OCR_SPACE_API_KEY` for OCR fallback on image-heavy resumes

## Database Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Execute `supabase/schema.sql`.
4. Confirm authentication settings and site URL.

If you run in multiple environments, keep per-environment Supabase projects to isolate test and production data.

## Build, Run, and Lint Commands

From `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Deployment Notes

The project is designed for Vercel + Supabase deployment.

1. Import repository in Vercel.
2. Configure environment variables.
3. Deploy.
4. Update Supabase auth URL/redirect configuration for production domain.

See `DEPLOY.md` for deployment workflow details.

## Operational Notes and Troubleshooting

### 1) Resume scores do not appear in profile

- Ensure analysis save succeeds into `resume_analyses`.
- Confirm profile page can query `resume_analyses` with current session.

### 2) Challenge execution errors

- Inspect browser console logs around `/api/challenges/run` response.
- Confirm challenge test input format and execution wrapper behavior.

### 3) AI route failures

- Verify `GROQ_API_KEY` is set in the active environment.
- Check provider limits and retry behavior.

### 4) OCR not working for image/PDF

- Confirm `OCR_SPACE_API_KEY` is present.
- If OCR fails, use direct text paste as fallback.

## Security and Data Ownership

- Authentication and authorization are handled through Supabase Auth and RLS.
- User-specific records are written with user-scoped ownership.
- Sensitive logic (for example score recomputation) is handled server-side to reduce client trust risk.

## Contribution Guidelines

1. Create a feature branch from `main`.
2. Keep changes scoped and production-safe.
3. Run `npm run build` before opening pull requests.
4. Include concise notes on behavior changes and affected routes.

## Additional Documentation

- `DEPLOY.md` for deployment steps
- `PROJECT_WRITEUP.md` for project documentation context

### Resume API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resume/analyze` | POST | Parse and analyze resume |

### Skills API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills/roadmap` | POST | Generate learning roadmap |
| `/api/skills/analysis` | GET | Get skills gap analysis |

### Trends API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trends` | POST | Fetch industry trends via Tavily |
| `/api/trends/salary` | POST | Get salary data for careers |

### Exams API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/exams` | GET | Fetch exam updates and deadlines |

---

## 🔍 Key Features Deep Dive

### Real Code Execution
The platform uses Piston API for actual code compilation and execution:
- ✅ Secure sandboxed execution
- ✅ Supports 50+ programming languages
- ✅ Real compiler errors and output
- ✅ 15-second timeout protection

### AI-Powered Verification
Coding solutions are verified through:
1. **Real execution** - Code runs on Piston
2. **AI verification** - Groq LLM validates correctness
3. **Detailed feedback** - Explanation of results

### Auto Language Detection
The editor automatically detects languages based on syntax:
- `def`, `import`, `print` → Python
- `public class`, `static void main` → Java
- `#include`, `std::`, `cout` → C++
- Type annotations → TypeScript
- Default → JavaScript

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   - Add all variables from `.env.local`

4. **Deploy**
   - Click Deploy and wait for the build

5. **Update Supabase**
   - Add your Vercel URL to Supabase Auth redirect URLs

See [`DEPLOY.md`](./DEPLOY.md) for detailed deployment instructions.

---

## 🧪 Testing

| Test Type | Description | Status |
|-----------|-------------|--------|
| Authentication Flow | Signup, login, logout, session | ✅ Passed |
| AI Chat Response | Streaming, history saving | ✅ Passed |
| Quiz Generation | Dynamic questions for 10+ careers | ✅ Passed |
| Code Execution | JS, Python, Java, C++ | ✅ Passed |
| Resume PDF Parsing | Text extraction + AI analysis | ✅ Passed |
| Database Operations | CRUD with RLS policies | ✅ Passed |
| Responsive Design | Mobile, tablet, desktop | ✅ Passed |
| Cross-Browser | Chrome, Firefox, Edge, Safari | ✅ Passed |

### Performance Metrics
- 🎯 Lighthouse Score: 90+
- ⚡ First Contentful Paint: < 1.5s
- 🚀 Time to Interactive: < 3s

---

## ⚠️ Limitations

| Limitation | Description |
|------------|-------------|
| **API Rate Limits** | Groq free tier has request limits |
| **No Offline Mode** | Requires internet for all features |
| **English Only** | Currently supports English only |
| **Web Only** | No native mobile apps |
| **Resume Format** | Best results with PDF/TXT files |
| **Code Timeout** | 15-second limit on execution |
| **No Video Content** | Resources are links only |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use Prettier for formatting
- Write meaningful commit messages
- Test your changes before submitting

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Sharveswar M** - [GitHub](https://github.com/Sharveswar007)
- **Magi Sharma J**

---

<div align="center">

### ⭐ Star this repo if you found it helpful!

**[🌐 Live Demo](https://career-path-neon.vercel.app/)** • **[📧 Report Issues](https://github.com/Sharveswar007/CareerPath/issues)**

</div>
