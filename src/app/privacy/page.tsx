"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const dataItems = [
    {
        title: "Account details",
        what: "Email address and your name (if you provide it).",
        why: "To create your account and let you log in.",
    },
    {
        title: "Career assessment results",
        what: "Your answers, readiness scores, and skills-gap analysis.",
        why: "To show your progress and personalize recommendations.",
    },
    {
        title: "Coding challenge submissions",
        what: "The code you submit and its test results.",
        why: "To verify your solutions and track practice history.",
    },
    {
        title: "Resume files and analyses",
        what: "Uploaded resume files (PDF/text) and the generated ATS feedback.",
        why: "To analyze your resume and suggest improvements.",
    },
    {
        title: "Chat history",
        what: "Your conversations with the AI career counselor.",
        why: "So your counseling context is preserved across sessions.",
    },
];

export default function PrivacyPage() {
    const router = useRouter();
    const [showDelete, setShowDelete] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleDelete(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setStatus(null);
        try {
            const res = await fetch("/api/account/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const body = (await res.json()) as { ok?: boolean; error?: string };
            if (res.ok && body.ok) {
                setStatus("Your account and all its data have been permanently deleted.");
                setEmail("");
                setPassword("");
                setTimeout(() => router.push("/"), 2500);
            } else {
                setStatus(body.error ?? "Deletion failed - please try again.");
            }
        } catch {
            setStatus("Network error - please try again.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            <main className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="text-3xl font-bold mb-2">Privacy &amp; Data Handling</h1>
                <p className="text-gray-400 mb-10">
                    CareerPath is a student career-development platform. This page explains
                    exactly what we store and how to remove it.
                </p>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-4">What we store and why</h2>
                    <div className="space-y-4">
                        {dataItems.map((item) => (
                            <div key={item.title} className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                                <h3 className="font-semibold mb-1">{item.title}</h3>
                                <p className="text-sm text-gray-300">
                                    <span className="text-gray-500">What: </span>
                                    {item.what}
                                </p>
                                <p className="text-sm text-gray-300">
                                    <span className="text-gray-500">Why: </span>
                                    {item.why}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">Who can see your data</h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Your records are protected by database row-level security: you can only
                        access your own data through your account. Platform administrators
                        (the development team) can access data only for maintenance. Uploaded
                        resumes may be processed by third-party AI/OCR services solely to
                        generate your analysis; they are not shared with anyone else.
                    </p>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">Delete your account and data</h2>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        You can delete everything yourself, right here - no email required.
                        Deletion removes your account, assessments, submissions, resume files,
                        analyses, and chat history permanently and immediately. This cannot be
                        undone.
                    </p>

                    {!showDelete ? (
                        <button
                            type="button"
                            onClick={() => setShowDelete(true)}
                            className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/50"
                        >
                            Delete my account…
                        </button>
                    ) : (
                        <form
                            onSubmit={handleDelete}
                            className="rounded-lg border border-red-900 bg-red-950/30 p-5 space-y-3"
                        >
                            <p className="text-sm text-red-300">
                                Confirm with the email and password you sign in with:
                            </p>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@college.edu"
                                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                            />
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                    {busy ? "Deleting…" : "Permanently delete everything"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDelete(false);
                                        setStatus(null);
                                    }}
                                    className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                            </div>
                            {status && <p className="text-sm text-gray-300 pt-1">{status}</p>}
                        </form>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">Contact</h2>
                    <p className="text-gray-300 text-sm">
                        Questions about your data? Reach out through your institution or the
                        project&apos;s GitHub repository:{" "}
                        <a
                            className="text-blue-400 underline"
                            href="https://github.com/Sharveswar007/CareerPath/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            github.com/Sharveswar007/CareerPath
                        </a>
                        .
                    </p>
                </section>

                <div className="mt-12">
                    <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
                        ← Back to home
                    </Link>
                </div>
            </main>
        </div>
    );
}
