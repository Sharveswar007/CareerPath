-- =====================================================
-- Teacher Access Policies for Skills Gap Analysis
-- Run this in Supabase SQL Editor to allow teachers
-- to view skills gap analysis for their assigned students
-- =====================================================

-- Policy: Teachers can view skills gap analysis for students
-- assigned to them via faculty_advisor_email
CREATE POLICY "Teachers can view their students analysis"
  ON public.skills_gap_analysis FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE faculty_advisor_email = auth.jwt()->>'email'
    )
  );

-- Also add policy for user_assessments if needed
CREATE POLICY "Teachers can view their students assessments"
  ON public.user_assessments FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE faculty_advisor_email = auth.jwt()->>'email'
    )
  );

-- Also add policy for coding_submissions
CREATE POLICY "Teachers can view their students submissions"
  ON public.coding_submissions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE faculty_advisor_email = auth.jwt()->>'email'
    )
  );

-- Also add policy for resume_analyses
CREATE POLICY "Teachers can view their students resumes"
  ON public.resume_analyses FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE faculty_advisor_email = auth.jwt()->>'email'
    )
  );

-- Also add policy for chat_history
CREATE POLICY "Teachers can view their students chats"
  ON public.chat_history FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE faculty_advisor_email = auth.jwt()->>'email'
    )
  );
