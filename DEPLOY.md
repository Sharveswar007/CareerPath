# Deployment Guide for CareerPath AI

This guide covers how to deploy the CareerPath AI application. The recommended stack is **Vercel** for the frontend/API and **Supabase** for the backend/database.

## Prerequisites

Before you begin, ensure you have:
1.  A [GitHub](https://github.com/) account.
2.  A [Supabase](https://supabase.com/) account.
3.  A [Vercel](https://vercel.com/) account.
4.  API Keys for:
    *   [Groq Cloud](https://console.groq.com/) (for AI features)
    *   [Tavily](https://tavily.com/) (Optional, for web search features)

## Step 1: Push Code to GitHub

If you haven't already, push your code to a GitHub repository.

## Step 2: Supabase Setup

1.  **Create a Project:**
    *   Log in to Supabase and create a new project.
    *   Note down your `Project URL` and `anon public` key from the API settings.

2.  **Database Schema:**
    *   Go to the **SQL Editor** in your Supabase dashboard.
    *   Open the file `supabase/schema.sql` from this repository.
    *   Copy the entire content of `schema.sql`.
    *   Paste it into the SQL Editor and click **Run**.
    *   This will create the necessary tables, policies, and triggers.

3.  **Authentication:**
    *   Go to **Authentication** -> **Providers**.
    *   Enable **Email/Password** (enabled by default).
    *   (Optional) Enable Google or GitHub auth if you plan to add social login later.
    *   Go to **URL Configuration** and set the `Site URL` to your production URL (e.g., `https://your-project.vercel.app`) once you have it. For now, `http://localhost:3000` is fine for local dev.

## Step 3: Vercel Deployment

1.  **Import Project:**
    *   Log in to Vercel.
    *   Click **Add New...** -> **Project**.
    *   Import the GitHub repository you just pushed.

2.  **Configure Project:**
    *   **Framework Preset:** Next.js
    *   **Root Directory:** `./` (default)
    *   **Build Command:** `next build` (default) (Note: `package.json` has `next build --webpack`, Vercel uses the scripts from package.json automatically so this is fine).
    *   **Output Directory:** `.next` (default)
    *   **Install Command:** `npm install` (or `bun install` if Vercel detects bun.lock).

3.  **Environment Variables:**
    *   Expand the **Environment Variables** section.
    *   Add the following variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `GROQ_API_KEY` | Your Groq API Key |
| `TAVILY_API_KEY` | Your Tavily API Key (Optional) |

4.  **Deploy:**
    *   Click **Deploy**.
    *   Vercel will build and deploy your application.
    *   Once done, you will get a live URL (e.g., `https://career-platform-xyz.vercel.app`).

## Step 4: Final Configuration

1.  **Update Supabase Redirect URL:**
    *   Go back to your Supabase dashboard -> **Authentication** -> **URL Configuration**.
    *   Add your new Vercel URL to the **Redirect URLs** list.
    *   Update the **Site URL** to your Vercel URL.

2.  **Verify Application:**
    *   Visit your Vercel URL.
    *   Sign up for a new account to test database connection and auth.
    *   Try the AI Chat to test Groq API integration.
    *   Try the Coding Challenge to test Piston API integration.

## Troubleshooting

*   **Build Errors:** Check the "Build Logs" in Vercel. Common issues include missing dependencies or type errors.
*   **Database Errors:** Ensure you ran the `schema.sql` correctly and that your RLS (Row Level Security) policies allow the operations you are trying to perform.
*   **API Issues:** Verify that your API keys are correct in the Vercel Environment Variables settings. Redeploy if you change environment variables.
