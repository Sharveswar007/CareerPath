// Root Layout with Providers

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Header } from "@/components/layout/header";
import { BubbleAnimation } from "@/components/background/bubble-animation";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "CareerPath - AI-Powered Career Guidance Platform",
  description:
    "Get personalized career recommendations, skills gap analysis, coding challenges, and real-time career trends powered by AI. Designed for Indian students and professionals.",
  keywords: [
    "career guidance",
    "career counseling",
    "AI career advisor",
    "skills assessment",
    "career quiz",
    "job trends",
    "Indian careers",
    "coding challenges",
  ],
  authors: [{ name: "CareerPath Team" }],
  openGraph: {
    title: "CareerPath - AI-Powered Career Guidance",
    description: "Discover your ideal career path with AI-powered guidance",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="relative min-h-screen">
              <BubbleAnimation />
              <Header />
              <main className="relative z-10">{children}</main>
            </div>
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
