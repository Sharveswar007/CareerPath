// Landing Page with Hero Section

"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  MessageSquare,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Code2,
  FileText,
  ArrowRight,
  Sparkles,
  Target,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: MessageSquare,
    title: "AI Career Counselor",
    description:
      "Chat with an intelligent AI advisor that understands Indian education and career paths. Get personalized guidance 24/7.",
    href: "/chat",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: ClipboardList,
    title: "Career Assessment Quiz",
    description:
      "Take a comprehensive 50+ question assessment based on RIASEC and personality frameworks to discover your ideal career.",
    href: "/quiz",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: BarChart3,
    title: "Skills Gap Analysis",
    description:
      "Compare your current skills against career requirements and get a personalized learning roadmap with resources.",
    href: "/skills",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Trends",
    description:
      "Access live job market data, salary insights, and demand analysis from LinkedIn, Naukri, and industry sources.",
    href: "/trends",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Code2,
    title: "Coding Challenges",
    description:
      "Practice with AI-generated coding problems tailored to your target career. Master DSA and technical interviews.",
    href: "/challenges",
    color: "from-orange-500 to-amber-600",
  },
  {
    icon: FileText,
    title: "Resume Analysis",
    description:
      "Get instant AI-powered feedback on your resume with ATS optimization tips and improvement suggestions.",
    href: "/resume",
    color: "from-indigo-500 to-violet-600",
  },
];

const stats = [
  { value: "50+", label: "Careers Covered" },
  { value: "500+", label: "Learning Resources" },
  { value: "60+", label: "Quiz Questions" },
  { value: "24/7", label: "AI Availability" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
};

export default function HomePage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
        <div className="container max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-sm font-medium"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Career Guidance for Indian Students
            </motion.div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block">Discover Your</span>
              <span className="block bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Perfect Career Path
              </span>
            </h1>

            {/* Subheading */}
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl">
              Get personalized career recommendations, skills gap analysis, real-time job
              market trends, and AI-powered guidance - all designed for your success.
            </p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Link href="/chat">
                <Button
                  size="lg"
                  className="group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 px-8"
                >
                  Start Exploring
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/quiz">
                <Button
                  size="lg"
                  variant="outline"
                  className="group border-2 hover:bg-accent px-8"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Take Career Quiz
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Career Success
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools powered by AI to help you make informed career decisions
              and achieve your professional goals.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Link href={feature.href}>
                  <Card className="group h-full p-6 border-2 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 cursor-pointer">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg transition-transform group-hover:scale-110`}
                    >
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="mt-4 flex items-center text-sm font-medium text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 md:p-12 text-center text-white overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10">
              <Rocket className="h-12 w-12 mx-auto mb-4 animate-float" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Shape Your Future?
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Join thousands of students who have discovered their ideal career path
                with our AI-powered guidance platform.
              </p>
              <Link href="/chat">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-violet-700 hover:bg-white/90 shadow-xl px-8"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Start Chatting with AI
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/40">
        <div className="container max-w-6xl mx-auto text-center text-muted-foreground text-sm">
          <p>
            Built for Indian students pursuing their dream careers.
            <br className="md:hidden" />
            <span className="hidden md:inline"> | </span>
            Powered by Groq AI, Supabase, and Next.js.
          </p>
        </div>
      </footer>
    </div>
  );
}
