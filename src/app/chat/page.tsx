// Chat Page - AI Career Counselor Interface with History

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Trash2, Sparkles, History, Plus, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { useChatStore } from "@/stores";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ChatSession {
    id: string;
    messages: Array<{ role: string; content: string; timestamp?: string }>;
    context?: { userCareer?: string; messageCount?: number };
    created_at: string;
}

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const supabase = createClient();

    const {
        messages,
        isLoading,
        addMessage,
        updateMessage,
        setLoading,
        setStreaming,
        clearMessages,
        setMessages,
        currentSessionId,
        setCurrentSessionId,
    } = useChatStore();

    // Load chat history on mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const loadChatHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await fetch("/api/chat");
            if (response.ok) {
                const data = await response.json();
                if (data.sessions) {
                    setSessions(data.sessions);
                }
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadSession = (session: ChatSession) => {
        const formattedMessages = session.messages.map((msg, i) => ({
            id: `loaded_${session.id}_${i}`,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: msg.timestamp || session.created_at,
        }));
        setMessages(formattedMessages);
        setCurrentSessionId(session.id);
        setShowHistory(false);
        toast.success("Chat session loaded!");
    };

    const startNewChat = () => {
        clearMessages();
        setShowHistory(false);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: `msg_${Date.now()}_user`,
            role: "user" as const,
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };

        const assistantMessage = {
            id: `msg_${Date.now()}_assistant`,
            role: "assistant" as const,
            content: "",
            timestamp: new Date().toISOString(),
            isStreaming: true,
        };

        addMessage(userMessage);
        addMessage(assistantMessage);
        setInput("");
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage.content,
                    sessionId: currentSessionId || null, // Only use database session ID, not client ID
                    history: messages.slice(-10).map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    fullContent += chunk;
                    updateMessage(assistantMessage.id, fullContent);
                }
            }

            setStreaming(assistantMessage.id, false);

            // Reload history to get updated sessions
            loadChatHistory();
        } catch (error) {
            console.error("Chat error:", error);
            updateMessage(
                assistantMessage.id,
                "I apologize, but I encountered an error while processing your request. Please try again."
            );
            setStreaming(assistantMessage.id, false);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleClear = () => {
        clearMessages();
        toast.success("Chat history cleared");
    };

    return (
        <div className="container max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col py-4 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-4"
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg">CareerGuide AI</h1>
                        <p className="text-xs text-muted-foreground">Your personal career advisor</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                        className="relative"
                    >
                        <History className="h-4 w-4 mr-2" />
                        History
                        {sessions.length > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-violet-500 text-white text-xs rounded-full flex items-center justify-center">
                                {sessions.length}
                            </span>
                        )}
                    </Button>
                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear
                        </Button>
                    )}
                </div>
            </motion.div>

            {/* History Sidebar */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <Card className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium">Chat History</h3>
                                <Button size="sm" onClick={startNewChat} className="bg-gradient-to-r from-violet-600 to-indigo-600">
                                    <Plus className="h-4 w-4 mr-1" />
                                    New Chat
                                </Button>
                            </div>

                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : sessions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No previous conversations found
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {sessions.map((session) => (
                                        <motion.div
                                            key={session.id}
                                            whileHover={{ scale: 1.01 }}
                                            onClick={() => loadSession(session)}
                                            className={cn(
                                                "p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 group",
                                                currentSessionId === session.id
                                                    ? "bg-violet-500/10 border border-violet-500/30"
                                                    : "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <MessageSquare className="h-4 w-4 text-violet-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {session.messages?.[0]?.content?.slice(0, 40) || "New conversation"}...
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(session.created_at).toLocaleDateString()} • {session.context?.messageCount || session.messages?.length || 0} messages
                                                </p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col overflow-hidden border-2">
                <div
                    className="flex-1 p-4 overflow-y-auto scroll-smooth"
                    ref={scrollRef}
                >
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center py-12"
                            >
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg animate-float">
                                    <Sparkles className="h-8 w-8 text-white" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Welcome to CareerGuide AI</h2>
                                <p className="text-muted-foreground max-w-md mb-6">
                                    I am here to help you explore career options, understand job trends, and plan
                                    your professional journey. Ask me anything about careers, education, or skills.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                                    {[
                                        "What careers suit someone who loves coding?",
                                        "How do I prepare for GATE exam?",
                                        "What is the salary of a Data Scientist in India?",
                                        "Compare AI Engineer vs Data Scientist",
                                    ].map((suggestion) => (
                                        <Button
                                            key={suggestion}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => setInput(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <MessageBubble key={message.id} message={message} />
                                ))}
                                {isLoading && messages[messages.length - 1]?.role === "assistant" &&
                                    messages[messages.length - 1]?.isStreaming && (
                                        <TypingIndicator />
                                    )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about careers, education, skills, or job trends..."
                            className="min-h-[44px] max-h-[200px] resize-none"
                            disabled={isLoading}
                            rows={1}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading}
                            className="h-[44px] w-[44px] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </form>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </Card>
        </div>
    );
}
