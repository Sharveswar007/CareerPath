// Database Types for Career Guidance Platform
// Minimal types to allow flexibility with Supabase queries

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          location: string | null;
          current_education: string | null;
          onboarding_complete: boolean;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          location?: string | null;
          current_education?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          location?: string | null;
          current_education?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string | null;
        };
      };
      career_selections: {
        Row: {
          id: string;
          user_id: string;
          career_name: string;
          is_custom: boolean;
          selected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          career_name: string;
          is_custom?: boolean;
          selected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          career_name?: string;
          is_custom?: boolean;
          selected_at?: string;
        };
      };
      user_assessments: {
        Row: {
          id: string;
          user_id: string;
          selected_career: string;
          career_questions: Json;
          logic_questions: Json;
          total_score: number | null;
          career_score: number | null;
          logic_score: number | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          selected_career: string;
          career_questions: Json;
          logic_questions: Json;
          total_score?: number | null;
          career_score?: number | null;
          logic_score?: number | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          selected_career?: string;
          career_questions?: Json;
          logic_questions?: Json;
          total_score?: number | null;
          career_score?: number | null;
          logic_score?: number | null;
          completed_at?: string;
        };
      };
      skills_gap_analysis: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string | null;
          target_career: string;
          readiness_score: number | null;
          gap_analysis: string | null;
          strengths: Json | null;
          weaknesses: Json | null;
          roadmap: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_id?: string | null;
          target_career: string;
          readiness_score?: number | null;
          gap_analysis?: string | null;
          strengths?: Json | null;
          weaknesses?: Json | null;
          roadmap?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assessment_id?: string | null;
          target_career?: string;
          readiness_score?: number | null;
          gap_analysis?: string | null;
          strengths?: Json | null;
          weaknesses?: Json | null;
          roadmap?: Json | null;
          created_at?: string;
        };
      };
      coding_challenges: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string;
          difficulty: string;
          category: string;
          starter_code: Json | null;
          test_cases: Json | null;
          is_recommended: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description: string;
          difficulty: string;
          category: string;
          starter_code?: Json | null;
          test_cases?: Json | null;
          is_recommended?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string;
          difficulty?: string;
          category?: string;
          starter_code?: Json | null;
          test_cases?: Json | null;
          is_recommended?: boolean;
          created_at?: string;
        };
      };
      coding_submissions: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          code: string;
          language: string;
          status: string;
          test_results: Json | null;
          execution_time: number | null;
          memory_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          code: string;
          language: string;
          status?: string;
          test_results?: Json | null;
          execution_time?: number | null;
          memory_used?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          code?: string;
          language?: string;
          status?: string;
          test_results?: Json | null;
          execution_time?: number | null;
          memory_used?: number | null;
          created_at?: string;
        };
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_url: string | null;
          analysis_result: Json;
          ats_score: number | null;
          suggestions: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_url?: string | null;
          analysis_result: Json;
          ats_score?: number | null;
          suggestions?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_url?: string | null;
          analysis_result?: Json;
          ats_score?: number | null;
          suggestions?: Json | null;
          created_at?: string;
        };
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          messages: Json;
          context: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          messages: Json;
          context?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          messages?: Json;
          context?: Json | null;
          created_at?: string;
        };
      };
      user_activity: {
        Row: {
          id: string;
          user_id: string;
          activity_date: string;
          activity_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_date?: string;
          activity_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_date?: string;
          activity_type?: string;
          created_at?: string;
        };
      };
      // Allow any table access for flexibility
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
}
