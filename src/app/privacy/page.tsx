import Link from "next/link";

export const metadata = {
    title: "Privacy & Data Handling - CareerPath",
    description: "What CareerPath stores, why, and how to delete it.",
};

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
                    <h2 className="text-xl font-semibold mb-3">How to delete your data</h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Email the platform administrators from your registered email address
                        asking for deletion, and your account, assessments, submissions,
                        resume files, analyses, and chat history will be permanently removed.
                        You can also delete individual chat sessions from the chat page at
                        any time.
                    </p>
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
