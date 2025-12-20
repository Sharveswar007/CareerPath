// Message Bubble Component for Chat Interface

"use client";

import { motion } from "framer-motion";
import { User, Sparkles, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    isStreaming?: boolean;
}

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const { theme } = useTheme();
    const [copied, setCopied] = useState(false);
    const isUser = message.role === "user";

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-md",
                    isUser
                        ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                        : "bg-gradient-to-br from-violet-500 to-indigo-600"
                )}
            >
                {isUser ? (
                    <User className="h-4 w-4 text-white" />
                ) : (
                    <Sparkles className="h-4 w-4 text-white" />
                )}
            </div>

            {/* Message Content */}
            <div
                className={cn(
                    "group relative max-w-[80%] rounded-2xl px-4 py-3",
                    isUser
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                )}
            >
                {/* Copy Button */}
                {!isUser && message.content && !message.isStreaming && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-10 top-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={copyToClipboard}
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                )}

                {/* Message Text */}
                {isUser ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || "");
                                    const isInline = !match;

                                    if (isInline) {
                                        return (
                                            <code
                                                className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
                                                {...props}
                                            >
                                                {children}
                                            </code>
                                        );
                                    }

                                    return (
                                        <SyntaxHighlighter
                                            style={theme === "dark" ? oneDark : oneLight}
                                            language={match[1]}
                                            PreTag="div"
                                            className="rounded-lg text-sm my-3"
                                        >
                                            {String(children).replace(/\n$/, "")}
                                        </SyntaxHighlighter>
                                    );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-violet-600 dark:text-violet-400 hover:underline"
                                    >
                                        {children}
                                    </a>
                                ),
                                table: ({ children }) => (
                                    <div className="overflow-x-auto my-3">
                                        <table className="min-w-full border border-border rounded-lg">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                th: ({ children }) => (
                                    <th className="px-3 py-2 bg-muted font-semibold text-left border-b border-border">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className="px-3 py-2 border-b border-border">{children}</td>
                                ),
                            }}
                        >
                            {message.content || " "}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Streaming Indicator */}
                {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1" />
                )}

                {/* Timestamp */}
                <div
                    className={cn(
                        "text-[10px] mt-1",
                        isUser ? "text-white/70 text-right" : "text-muted-foreground"
                    )}
                >
                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </div>
            </div>
        </motion.div>
    );
}
