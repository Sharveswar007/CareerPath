<div align="center">

# 🚀 CareerPath AI

### AI-Powered Career Development Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

*Your personal AI career coach that helps you discover your path, build skills, and land your dream job.*

[Demo](#demo) • [Features](#-features) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [API Keys](#-api-keys-required)

</div>

---

## ✨ Features

### 🎯 **AI Career Assessment**
- Comprehensive skills assessment with adaptive questioning
- Personalized career path recommendations
- Gap analysis with actionable learning roadmap
- Strengths & weaknesses identification

### 💬 **AI Career Chat**
- Real-time AI career counselor powered by Groq LLM
- Context-aware conversations about career decisions
- Resume tips, interview prep, and industry insights
- Persistent chat history

### 📝 **Resume Analyzer**
- Upload and analyze your resume with AI
- Get personalized improvement suggestions
- Skills extraction and matching
- ATS compatibility tips

### 💻 **Coding Challenges**
- AI-generated coding challenges tailored to your career
- **Real code execution** using Piston API
- Supports JavaScript, Python, Java, C++, TypeScript, and more
- Auto-language detection from code
- AI verification of solutions

### 📊 **Skills Dashboard**
- Visual representation of your skill levels
- Track progress over time
- Learning resources recommendations
- Skill gap visualization

### 🌍 **Industry Trends**
- Real-time career trend analysis
- Booming industries and roles
- Salary insights and job market data
- Location-based opportunities

### 📚 **Exam Updates**
- Stay updated with competitive exam notifications
- Government exam calendars
- Application deadlines and prep resources

---

## 🖥️ Demo

<div align="center">

| Landing Page | AI Assessment | Coding Challenge |
|:---:|:---:|:---:|
| Modern dark theme | Adaptive questions | Real code execution |

</div>

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **Database** | Supabase (PostgreSQL) |
| **AI/LLM** | Groq API (Llama 3.1) |
| **Code Execution** | Piston API |
| **Web Search** | Tavily API |
| **Components** | Radix UI, shadcn/ui |
| **Editor** | Monaco Editor |
| **Authentication** | Supabase Auth |
| **Animations** | GSAP, Lottie, React Spring |
| **State Management** | Zustand, React Query |

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or bun
- Supabase account
- API keys (see below)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/career-platform.git
   cd career-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Groq AI
   GROQ_API_KEY=your_groq_api_key

   # Tavily Search (optional)
   TAVILY_API_KEY=your_tavily_api_key
   ```

4. **Set up the database**
   
   Run the SQL schema in your Supabase SQL editor:
   ```bash
   # Schema located at: supabase/schema.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 🔑 API Keys Required

| Service | Purpose | Get Key |
|---------|---------|---------|
| **Supabase** | Database & Auth | [supabase.com](https://supabase.com) |
| **Groq** | AI/LLM (Free tier available) | [console.groq.com](https://console.groq.com) |
| **Tavily** | Web search (Optional) | [tavily.com](https://tavily.com) |

---

## 📁 Project Structure

```
career-platform/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── assessment/    # Skills assessment
│   │   │   ├── challenges/    # Coding challenges
│   │   │   ├── chat/          # AI chat
│   │   │   ├── resume/        # Resume analysis
│   │   │   └── trends/        # Career trends
│   │   ├── challenges/        # Coding challenge UI
│   │   ├── chat/              # AI chatbot UI
│   │   ├── quiz/              # Skills quiz
│   │   ├── skills/            # Skills dashboard
│   │   └── trends/            # Trends page
│   ├── components/            # Reusable components
│   ├── lib/                   # Utilities & API clients
│   │   ├── piston/           # Code execution client
│   │   ├── supabase/         # Database client
│   │   └── tavily/           # Search client
│   └── types/                 # TypeScript types
├── supabase/
│   └── schema.sql            # Database schema
└── public/                    # Static assets
```

---

## 🎨 Key Features Deep Dive

### Real Code Execution
The platform uses Piston API for actual code compilation and execution:
- Secure sandboxed execution
- Supports 50+ programming languages
- Real compiler errors and output
- 15-second timeout protection

### AI-Powered Verification
Coding solutions are verified through:
1. **Real execution** - Code runs on Piston
2. **AI verification** - Groq LLM validates correctness
3. **Feedback** - Detailed explanation of results

### Auto Language Detection
The editor automatically detects:
- Python (`def`, `import`, `print`)
- Java (`public class`, `static void main`)
- C++ (`#include`, `std::`, `cout`)
- TypeScript (type annotations)
- JavaScript (default)

---

## 📜 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/career-platform](https://github.com/yourusername/career-platform)

---


