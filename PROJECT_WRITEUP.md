# CareerPath AI - Project Write-Up

---

**Project Title:** CareerPath AI – An AI-Powered Career Development Platform

**Team Members:** Sharveswar M, Magi Sharma J

**Course:** B.Tech CSE Core, 4th Semester, 2nd Year

**Project Type:** In-House Project

**Live Demo:** https://career-path-neon.vercel.app/

**GitHub Repository:** https://github.com/Sharveswar007/CareerPath

---

## 1. Introduction

CareerPath AI is a comprehensive web-based platform designed to assist students in making informed career decisions through artificial intelligence. The platform addresses a critical gap in the Indian education system where students often lack access to personalized, data-driven career guidance.

The application leverages modern AI technologies to provide real-time career counseling, skills assessment, resume analysis, and coding practice—all integrated into a single unified platform.

---

## 2. Problem Identification: Existing Solutions vs Our Innovation

### 2.1 What Already Exists in the Market

| Existing Platform | Limitations |
|-------------------|-------------|
| **LinkedIn Career Explorer** | Generic suggestions, not personalized to Indian education system |
| **Naukri.com** | Job listings only, no skill gap analysis or learning roadmaps |
| **Shiksha.com** | Static content, no AI-powered personalization |
| **Generic Chatbots** | Pre-scripted responses, lack context awareness |
| **LeetCode/HackerRank** | Coding practice only, not career-integrated |
| **Resume Builders** | Template-based, no AI analysis or ATS scoring |

### 2.2 Our Innovation and Creativity

CareerPath AI introduces several **novel features** not found in existing solutions:

| Innovation | Description |
|------------|-------------|
| **Context-Aware AI Counselor** | Our AI chatbot remembers user's career selection, assessment scores, strengths, and weaknesses to provide hyper-personalized advice |
| **Integrated Ecosystem** | Single platform combining career chat, assessments, coding practice, resume analysis, and market trends |
| **Real Code Execution** | Unlike mock evaluators, our platform executes actual code using Piston API with real compiler feedback |
| **AI-Generated Assessments** | Dynamic quiz questions generated based on user's target career, never repetitive |
| **Indian Market Focus** | Salary data, exam updates (JEE, NEET, GATE, UPSC), and career paths tailored for Indian students |
| **Skills Gap Roadmap** | AI-generated personalized learning path with duration, milestones, and free/paid resources |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 16 Frontend (React 19)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Chat    │ │  Quiz    │ │Challenges│ │  Resume  │ │  Trends  │  │   │
│  │  │  Page    │ │  Page    │ │  Page    │ │  Page    │ │  Page    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │                    ↓ Zustand State Management ↓                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js API Routes (Server-Side)                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ /api/    │ │ /api/    │ │ /api/    │ │ /api/    │ │ /api/    │  │   │
│  │  │ chat     │ │assessment│ │challenges│ │ resume   │ │ trends   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│    EXTERNAL SERVICES    │ │    DATABASE     │ │    CODE EXECUTION       │
│  ┌───────────────────┐  │ │  ┌───────────┐  │ │  ┌───────────────────┐  │
│  │   Groq API        │  │ │  │ Supabase  │  │ │  │   Piston API      │  │
│  │   (Llama 3.1)     │  │ │  │ PostgreSQL│  │ │  │   (50+ Languages) │  │
│  │   - Chat AI       │  │ │  │ - Users   │  │ │  │   - JavaScript    │  │
│  │   - Quiz Gen      │  │ │  │ - Profiles│  │ │  │   - Python        │  │
│  │   - Resume Parse  │  │ │  │ - Chats   │  │ │  │   - Java          │  │
│  └───────────────────┘  │ │  │ - Results │  │ │  │   - C++           │  │
│  ┌───────────────────┐  │ │  └───────────┘  │ │  └───────────────────┘  │
│  │   Tavily API      │  │ │  ┌───────────┐  │ └─────────────────────────┘
│  │   (Web Search)    │  │ │  │ Supabase  │  │
│  │   - Job Trends    │  │ │  │   Auth    │  │
│  │   - Exam Updates  │  │ │  │ - Email   │  │
│  └───────────────────┘  │ │  │ - OAuth   │  │
└─────────────────────────┘ │  └───────────┘  │
                            └─────────────────┘
```

**Architecture Highlights:**
- **Monolithic Frontend + API:** Next.js App Router handles both UI and backend API routes
- **Serverless Deployment:** Hosted on Vercel with automatic scaling
- **Real-time Streaming:** Chat responses stream token-by-token for better UX
- **Row-Level Security:** Supabase RLS ensures users can only access their own data

---

## 4. Key Features

### 4.1 AI Career Counselor (Chat)
A conversational AI assistant that provides personalized career guidance. Unlike generic chatbots, it fetches the user's profile, assessment history, and career selection from the database to deliver context-aware responses.

### 4.2 Dynamic Career Assessment
AI-generated quiz with 20 questions covering:
- Career-specific knowledge (50%)
- Logical reasoning and aptitude (30%)
- Situational judgment (20%)

Questions are uniquely generated each time based on the user's target career.

### 4.3 Coding Challenges with Real Execution
- AI generates coding problems tailored to user's career path
- Code is executed on real compilers via Piston API
- Supports JavaScript, Python, Java, C++, TypeScript, and more
- Monaco Editor (VS Code's editor) for professional coding experience

### 4.4 Resume Analyzer
- Upload PDF or paste text
- AI extracts skills and evaluates content
- Provides ATS (Applicant Tracking System) compatibility score
- Section-wise feedback with improvement suggestions

### 4.5 Industry Trends Dashboard
- Real-time job market analysis
- Booming careers based on user's field
- Salary ranges for Indian market (in LPA)
- Integration with job portals data via Tavily search

### 4.6 Skills Gap Analysis
After assessment, users receive:
- Career readiness score (0-100)
- Identified strengths and weaknesses
- Phase-wise learning roadmap with resources
- Recommended coding challenges

---

## 5. Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion, GSAP |
| **State Management** | Zustand |
| **Data Fetching** | TanStack React Query |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **AI/LLM** | Groq API (Llama 3.1) |
| **Code Execution** | Piston API |
| **Web Search** | Tavily API |
| **Code Editor** | Monaco Editor |
| **Deployment** | Vercel |

---

## 6. Screenshots

*(Add screenshots in the following sections)*

### 6.1 Landing Page
![Landing Page](screenshots/landing.png)
*Modern dark-themed landing page with feature cards and call-to-action buttons*

### 6.2 AI Chat Interface
![AI Chat](screenshots/chat.png)
*Conversational interface with streaming responses and chat history*

### 6.3 Career Assessment Quiz
![Quiz Page](screenshots/quiz.png)
*Dynamic quiz with progress indicator and category badges*

### 6.4 Coding Challenge Editor
![Coding Challenge](screenshots/challenge.png)
*Monaco editor with real code execution and output panel*

### 6.5 Resume Analysis Results
![Resume Analysis](screenshots/resume.png)
*ATS score, section-wise feedback, and improvement suggestions*

### 6.6 Skills Dashboard
![Skills Dashboard](screenshots/skills.png)
*Readiness score, skill gaps, and personalized learning roadmap*

### 6.7 Industry Trends
![Trends Page](screenshots/trends.png)
*Booming careers, salary insights, and market analysis*

---

## 7. Testing Results

| Test Type | Description | Result |
|-----------|-------------|--------|
| **Authentication Flow** | User signup, login, logout, session persistence | ✅ Passed |
| **AI Chat Response** | Message sending, streaming, history saving | ✅ Passed |
| **Quiz Generation** | Dynamic question generation for 10+ careers | ✅ Passed |
| **Code Execution** | JavaScript, Python, Java, C++ compilation | ✅ Passed |
| **Resume PDF Parsing** | PDF text extraction and AI analysis | ✅ Passed |
| **Database Operations** | CRUD operations with RLS policies | ✅ Passed |
| **Responsive Design** | Mobile, tablet, desktop layouts | ✅ Passed |
| **API Rate Limiting** | Groq API retry logic on 429 errors | ✅ Passed |
| **Cross-Browser** | Chrome, Firefox, Edge, Safari | ✅ Passed |

**Performance Metrics:**
- Lighthouse Performance Score: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s

---

## 8. Limitations

| Limitation | Description |
|------------|-------------|
| **API Rate Limits** | Groq free tier has request limits; heavy usage may cause delays |
| **No Offline Mode** | Application requires internet connectivity for all features |
| **English Only** | Currently supports only English language |
| **No Mobile App** | Web-only platform; native mobile apps not available |
| **Resume Format** | Best results with PDF and TXT; complex formatting may not parse correctly |
| **Code Execution Timeout** | 15-second limit on code execution; long-running programs may fail |
| **No Video Content** | Learning resources are links only; no embedded video courses |

---

## 9. Conclusion

CareerPath AI successfully demonstrates the integration of modern AI technologies into an educational platform. By combining personalized career counseling, dynamic assessments, real code execution, and resume analysis into a single ecosystem, we have created a unique solution that addresses the fragmented nature of existing career guidance tools.

The platform is live, functional, and serves as a proof-of-concept for AI-driven career development systems tailored to the Indian student community.

---

**Live Application:** https://career-path-neon.vercel.app/

**Source Code:** https://github.com/Sharveswar007/CareerPath

---

*Document prepared for In-House Project Evaluation*
*B.Tech CSE, 4th Semester, 2nd Year*

