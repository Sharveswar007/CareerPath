<div align="center">

# 🚀 CareerPath AI

### AI-Powered Career Development Platform for Students

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.1-FF6B35?style=for-the-badge)](https://groq.com/)

*Your personal AI career coach that helps you discover your path, build skills, and land your dream job.*

[🌐 Live Demo](https://career-path-neon.vercel.app/) • [📖 Features](#-features) • [🛠️ Installation](#%EF%B8%8F-installation) • [🔑 API Keys](#-api-keys-required) • [📁 Project Structure](#-project-structure)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#%EF%B8%8F-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Keys Required](#-api-keys-required)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Key Features Deep Dive](#-key-features-deep-dive)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Limitations](#-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

CareerPath AI is a comprehensive web-based platform designed to assist students in making informed career decisions through artificial intelligence. The platform addresses a critical gap in the education system where students often lack access to personalized, data-driven career guidance.

### What Makes Us Different?

| Existing Solution | Limitation | Our Innovation |
|-------------------|------------|----------------|
| LinkedIn Career Explorer | Generic, not localized | Context-aware AI with Indian market focus |
| Naukri.com | Job listings only | Integrated skills gap analysis & roadmaps |
| Generic Chatbots | Pre-scripted responses | AI remembers your profile, scores & goals |
| LeetCode/HackerRank | Coding only | Career-integrated practice with real execution |
| Resume Builders | Template-based | AI analysis with ATS scoring |

---

## ✨ Features

### 🤖 **AI Career Counselor (Chat)**
- Real-time conversational AI powered by Groq LLM (Llama 3.1)
- Context-aware responses using your assessment scores, career selection, and profile
- Persistent chat history with streaming responses
- Career advice, interview prep, and industry insights

### 📝 **Dynamic Career Assessment**
- AI-generated quiz with 20 questions per session
- Breakdown:
  - **50%** Career-specific knowledge
  - **30%** Logical reasoning & aptitude
  - **20%** Situational judgment
- Unique questions generated based on target career
- Comprehensive scoring and analysis

### 💻 **Coding Challenges with Real Execution**
- AI-generated coding problems tailored to your career path
- **Real code execution** using [Piston API](https://github.com/engineer-man/piston)
- Supports 50+ languages: JavaScript, Python, Java, C++, TypeScript, and more
- Monaco Editor (VS Code's editor) for professional coding experience
- AI verification of solutions with detailed feedback
- Auto language detection from code syntax

### 📄 **Resume Analyzer**
- Upload PDF or paste text
- AI extracts skills and evaluates content
- **ATS (Applicant Tracking System) compatibility score**
- Section-wise feedback with improvement suggestions
- Skill matching against target career requirements

### 📊 **Skills Gap Dashboard**
After assessment, users receive:
- Career readiness score (0-100)
- Visual representation of skill levels
- Identified strengths and weaknesses
- Phase-wise learning roadmap with free/paid resources
- Recommended coding challenges

### 🌍 **Industry Trends**
- Real-time job market analysis using Tavily Search API
- Booming careers based on your field
- Salary ranges for Indian market (in LPA)
- Location-based job opportunities
- Latest exam updates (JEE, NEET, GATE, UPSC, etc.)

### 📚 **Competitive Exam Updates**
- Government exam calendars
- Application deadlines
- Preparation resources and tips

### 👤 **User Profile & Onboarding**
- Complete profile management
- Educational background tracking
- Parent/guardian contact information
- Faculty advisor details

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | App Router, Server Components, API Routes |
| **React 19** | UI Components |
| **TypeScript** | Type Safety |
| **Tailwind CSS 4** | Styling |
| **Framer Motion** | Page transitions & animations |
| **GSAP** | Advanced animations |
| **Lottie React** | SVG animations |
| **React Spring** | Physics-based animations |

### Backend & Data
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database with RLS |
| **Supabase Auth** | Email/Password authentication |
| **Zustand** | Global state management |
| **TanStack React Query** | Server state & caching |

### AI & External Services
| Service | Purpose |
|---------|---------|
| **Groq API** | LLM (Llama 3.1) for AI features |
| **Piston API** | Real code execution (50+ languages) |
| **Tavily API** | Web search for industry trends |

### UI Components
| Library | Purpose |
|---------|---------|
| **Radix UI** | Accessible primitives |
| **shadcn/ui** | Pre-built components |
| **Monaco Editor** | VS Code-based code editor |
| **Recharts** | Data visualization |
| **ReactFlow** | Flow diagrams |
| **Lucide React** | Icons |

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **npm**, **yarn**, or **bun** package manager  
- **Supabase** account (free tier works)
- API keys (see [API Keys Required](#-api-keys-required))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Sharveswar007/CareerPath.git
cd CareerPath

# Install dependencies
npm install
# or
bun install

# Set up environment variables (see section below)
cp .env.example .env.local

# Run the development server
npm run dev
# or
bun dev

# Open in browser
# http://localhost:3000
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq AI (Required for AI features)
GROQ_API_KEY=your_groq_api_key

# Tavily Search (Optional - for industry trends)
TAVILY_API_KEY=your_tavily_api_key
```

---

## 🗄️ Database Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note down your `Project URL` and `anon public` key

2. **Run the Schema**
   - Open the SQL Editor in your Supabase dashboard
   - Copy the contents of [`supabase/schema.sql`](./supabase/schema.sql)
   - Paste and run the SQL to create all tables and policies

3. **Configure Authentication**
   - Go to Authentication → Providers
   - Enable Email/Password (enabled by default)
   - Set the Site URL to your deployment URL

### Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with education & contact info |
| `career_selections` | User's selected career paths |
| `user_assessments` | Quiz questions, answers, and scores |
| `skills_gap_analysis` | AI-generated gap analysis & roadmaps |
| `coding_challenges` | AI-generated coding problems |
| `coding_submissions` | User code submissions & results |
| `resume_analyses` | Resume parsing results & ATS scores |
| `chat_history` | AI chat conversation history |
| `user_activity` | Activity tracking for streaks |

---

## 🔑 API Keys Required

| Service | Required | Free Tier | Get Key |
|---------|----------|-----------|---------|
| **Supabase** | ✅ Yes | ✅ Yes | [supabase.com](https://supabase.com) |
| **Groq** | ✅ Yes | ✅ Yes | [console.groq.com](https://console.groq.com) |
| **Tavily** | ⚠️ Optional | ✅ Yes | [tavily.com](https://tavily.com) |

> **Note:** Piston API for code execution is public and doesn't require an API key.

---

## 📁 Project Structure

```
CareerPath/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── assessment/       # Quiz generation & gap analysis
│   │   │   ├── challenges/       # Coding challenge APIs
│   │   │   ├── chat/             # AI chat endpoint
│   │   │   ├── exams/            # Exam updates API
│   │   │   ├── resume/           # Resume parsing API
│   │   │   ├── skills/           # Skills analysis API
│   │   │   └── trends/           # Industry trends API
│   │   ├── (auth)/               # Authentication pages
│   │   ├── challenges/           # Coding challenges UI
│   │   ├── chat/                 # AI chatbot UI
│   │   ├── exams/                # Exam updates page
│   │   ├── onboarding/           # User onboarding flow
│   │   ├── profile/              # User profile page
│   │   ├── quiz/                 # Assessment quiz UI
│   │   ├── resume/               # Resume analyzer UI
│   │   ├── skills/               # Skills dashboard
│   │   └── trends/               # Industry trends page
│   ├── components/               # Reusable UI Components
│   │   ├── background/           # Background effects
│   │   ├── chat/                 # Chat components
│   │   ├── effects/              # Visual effects
│   │   ├── layout/               # Layout components
│   │   ├── providers/            # Context providers
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/                      # Utilities & API Clients
│   │   ├── execution/            # Piston code executor
│   │   ├── supabase/             # Database client
│   │   └── tavily/               # Search client
│   ├── stores/                   # Zustand state stores
│   ├── types/                    # TypeScript types
│   └── hooks/                    # Custom React hooks
├── supabase/
│   └── schema.sql                # Database schema
├── public/                       # Static assets
└── package.json
```

---

## 🔌 API Endpoints

### Assessment APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assessment/generate` | POST | Generate quiz questions for a career |
| `/api/assessment/analyze` | POST | Analyze results and generate gap analysis |

### Chat API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message to AI counselor (streaming) |

### Coding Challenge APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/challenges/generate` | POST | Generate a new coding challenge |
| `/api/challenges/execute` | POST | Execute code via Piston API |
| `/api/challenges/verify` | POST | AI verification of solution |

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
