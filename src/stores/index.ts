// Zustand Store for Session and User State

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
    name: string | null;
    stream: string | null;
    interests: string[];
    skills: Array<{ name: string; proficiency: number }>;
}

interface QuizState {
    currentStep: number;
    answers: Record<string, string | number | string[]>;
    isComplete: boolean;
}

interface SessionState {
    sessionId: string;
    userId: string | null;
    isAuthenticated: boolean;
    userProfile: UserProfile;
    quizState: QuizState;

    // Actions
    setSessionId: (id: string) => void;
    setUserId: (id: string | null) => void;
    setAuthenticated: (value: boolean) => void;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    updateQuizState: (state: Partial<QuizState>) => void;
    resetQuiz: () => void;
    resetAll: () => void;
}

// Generate a unique session ID
const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const initialUserProfile: UserProfile = {
    name: null,
    stream: null,
    interests: [],
    skills: [],
};

const initialQuizState: QuizState = {
    currentStep: 0,
    answers: {},
    isComplete: false,
};

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            sessionId: generateSessionId(),
            userId: null,
            isAuthenticated: false,
            userProfile: initialUserProfile,
            quizState: initialQuizState,

            setSessionId: (id) => set({ sessionId: id }),

            setUserId: (id) => set({ userId: id }),

            setAuthenticated: (value) => set({ isAuthenticated: value }),

            updateUserProfile: (profile) =>
                set((state) => ({
                    userProfile: { ...state.userProfile, ...profile },
                })),

            updateQuizState: (quizState) =>
                set((state) => ({
                    quizState: { ...state.quizState, ...quizState },
                })),

            resetQuiz: () => set({ quizState: initialQuizState }),

            resetAll: () =>
                set({
                    sessionId: generateSessionId(),
                    userId: null,
                    isAuthenticated: false,
                    userProfile: initialUserProfile,
                    quizState: initialQuizState,
                }),
        }),
        {
            name: "career-platform-session",
            partialize: (state) => ({
                sessionId: state.sessionId,
                userId: state.userId,
                isAuthenticated: state.isAuthenticated,
                userProfile: state.userProfile,
                quizState: state.quizState,
            }),
        }
    )
);

// Chat Store for Message State
interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    isStreaming?: boolean;
}

interface ChatSession {
    id: string;
    messages: ChatMessage[];
    context?: {
        startedAt?: string;
        messageCount?: number;
        userCareer?: string;
    };
    created_at: string;
}

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    currentSessionId: string | null;
    chatSessions: ChatSession[];

    // Actions
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, content: string) => void;
    setStreaming: (id: string, isStreaming: boolean) => void;
    setLoading: (value: boolean) => void;
    setError: (error: string | null) => void;
    clearMessages: () => void;
    setMessages: (messages: ChatMessage[]) => void;
    setCurrentSessionId: (id: string | null) => void;
    setChatSessions: (sessions: ChatSession[]) => void;
    loadSession: (session: ChatSession) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isLoading: false,
    error: null,
    currentSessionId: null,
    chatSessions: [],

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
        })),

    updateMessage: (id, content) =>
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === id ? { ...msg, content } : msg
            ),
        })),

    setStreaming: (id, isStreaming) =>
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === id ? { ...msg, isStreaming } : msg
            ),
        })),

    setLoading: (value) => set({ isLoading: value }),

    setError: (error) => set({ error }),

    clearMessages: () => set({ messages: [], currentSessionId: null }),

    setMessages: (messages) => set({ messages }),

    setCurrentSessionId: (id) => set({ currentSessionId: id }),

    setChatSessions: (sessions) => set({ chatSessions: sessions }),

    loadSession: (session) => set({
        messages: session.messages || [],
        currentSessionId: session.id,
    }),
}));

// Skills Store
interface SkillsState {
    userSkills: Array<{ name: string; proficiency: number; category: string }>;
    targetCareer: string | null;
    analysisResult: Record<string, unknown> | null;

    // Actions
    setUserSkills: (skills: Array<{ name: string; proficiency: number; category: string }>) => void;
    updateSkill: (name: string, proficiency: number) => void;
    setTargetCareer: (career: string | null) => void;
    setAnalysisResult: (result: Record<string, unknown> | null) => void;
    resetSkills: () => void;
}

export const useSkillsStore = create<SkillsState>()(
    persist(
        (set) => ({
            userSkills: [],
            targetCareer: null,
            analysisResult: null,

            setUserSkills: (skills) => set({ userSkills: skills }),

            updateSkill: (name, proficiency) =>
                set((state) => ({
                    userSkills: state.userSkills.map((skill) =>
                        skill.name === name ? { ...skill, proficiency } : skill
                    ),
                })),

            setTargetCareer: (career) => set({ targetCareer: career }),

            setAnalysisResult: (result) => set({ analysisResult: result }),

            resetSkills: () =>
                set({
                    userSkills: [],
                    targetCareer: null,
                    analysisResult: null,
                }),
        }),
        {
            name: "career-platform-skills",
        }
    )
);
