
-- =====================================================
-- Career Guidance Platform - Database Schema
-- =====================================================

-- Users Table (managed by Auth, but we use a trigger to create public profiles)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  location text,
  current_education text,
  onboarding_complete boolean default false,
  updated_at timestamp with time zone,
  -- New profile fields
  role text default 'student',
  college text,
  personal_email text,
  date_of_birth date,
  father_name text,
  mother_name text,
  father_email text,
  mother_email text,
  father_phone text,
  mother_phone text,
  faculty_advisor_name text,
  faculty_advisor_email text,
  tenth_marks text,
  twelfth_marks text
);

-- Turn on Security
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on public.profiles;create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on public.profiles;create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', coalesce(new.raw_user_meta_data->>'role', 'student'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function (drop first if exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- Career Selections Table
-- =====================================================
create table if not exists public.career_selections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  career_name text not null,
  is_custom boolean default false,
  selected_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.career_selections enable row level security;

drop policy if exists "Users can view their own career selections" on public.career_selections;create policy "Users can view their own career selections"
  on public.career_selections for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own career selections" on public.career_selections;create policy "Users can insert their own career selections"
  on public.career_selections for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own career selections" on public.career_selections;create policy "Users can update their own career selections"
  on public.career_selections for update
  using ( auth.uid() = user_id );

-- =====================================================
-- User Assessments Table (stores 20 Q&A)
-- =====================================================
create table if not exists public.user_assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  selected_career text not null,
  career_questions jsonb not null,
  logic_questions jsonb not null,
  total_score integer,
  career_score integer,
  logic_score integer,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_assessments enable row level security;

drop policy if exists "Users can view their own assessments" on public.user_assessments;create policy "Users can view their own assessments"
  on public.user_assessments for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own assessments" on public.user_assessments;create policy "Users can insert their own assessments"
  on public.user_assessments for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Skills Gap Analysis Table
-- =====================================================
create table if not exists public.skills_gap_analysis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  assessment_id uuid references public.user_assessments(id),
  target_career text not null,
  readiness_score integer,
  gap_analysis text,
  strengths jsonb,
  weaknesses jsonb,
  roadmap jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.skills_gap_analysis enable row level security;

drop policy if exists "Users can view their own analysis" on public.skills_gap_analysis;create policy "Users can view their own analysis"
  on public.skills_gap_analysis for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own analysis" on public.skills_gap_analysis;create policy "Users can insert their own analysis"
  on public.skills_gap_analysis for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Coding Challenges Table (AI Generated)
-- =====================================================
create table if not exists public.coding_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text not null,
  starter_code jsonb,
  test_cases jsonb,
  is_recommended boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coding_challenges enable row level security;

drop policy if exists "Users can view their own or public challenges" on public.coding_challenges;create policy "Users can view their own or public challenges"
  on public.coding_challenges for select
  using ( auth.uid() = user_id OR user_id IS NULL );

drop policy if exists "Authenticated users can create their own challenges" on public.coding_challenges;create policy "Authenticated users can create their own challenges"
  on public.coding_challenges for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Coding Submissions Table
-- =====================================================
create table if not exists public.coding_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  challenge_id uuid references public.coding_challenges(id) not null,
  code text not null,
  language text not null,
  status text not null check (status in ('pending', 'running', 'passed', 'failed', 'error')),
  test_results jsonb,
  execution_time numeric,
  memory_used numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coding_submissions enable row level security;

drop policy if exists "Users can view their own submissions" on public.coding_submissions;create policy "Users can view their own submissions"
  on public.coding_submissions for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own submissions" on public.coding_submissions;create policy "Users can insert their own submissions"
  on public.coding_submissions for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Resume Analysis Table
-- =====================================================
create table if not exists public.resume_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_url text,
  analysis_result jsonb not null,
  ats_score integer,
  suggestions jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.resume_analyses enable row level security;

drop policy if exists "Users can view their own resume analyses" on public.resume_analyses;create policy "Users can view their own resume analyses"
  on public.resume_analyses for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own resume analyses" on public.resume_analyses;create policy "Users can insert their own resume analyses"
  on public.resume_analyses for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Chat History Table
-- =====================================================
create table if not exists public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  messages jsonb not null,
  context jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_history enable row level security;

drop policy if exists "Users can view their own chat history" on public.chat_history;create policy "Users can view their own chat history"
  on public.chat_history for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own chat history" on public.chat_history;create policy "Users can insert their own chat history"
  on public.chat_history for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own chat history" on public.chat_history;create policy "Users can update their own chat history"
  on public.chat_history for update
  using ( auth.uid() = user_id );

-- =====================================================
-- User Activity Table (for streak tracking)
-- =====================================================
create table if not exists public.user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_date date not null default current_date,
  activity_type text default 'login',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, activity_date)
);

alter table public.user_activity enable row level security;

drop policy if exists "Users can view their own activity" on public.user_activity;create policy "Users can view their own activity"
  on public.user_activity for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own activity" on public.user_activity;create policy "Users can insert their own activity"
  on public.user_activity for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own activity" on public.user_activity;create policy "Users can update their own activity"
  on public.user_activity for update
  using ( auth.uid() = user_id );

-- =====================================================
-- Proctoring Violations Table (Malpractice Tracking)
-- =====================================================
create table if not exists public.proctoring_violations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  assessment_type text not null,
  violation_reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.proctoring_violations enable row level security;

drop policy if exists "Users can view their own violations" on public.proctoring_violations;create policy "Users can view their own violations"
  on public.proctoring_violations for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own violations" on public.proctoring_violations;create policy "Users can insert their own violations"
  on public.proctoring_violations for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Tests Table
-- =====================================================
create table if not exists public.tests (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references auth.users(id) not null,
  code text not null unique,
  status text not null default 'created' check (status in ('created', 'started', 'completed')),
  generation_type text not null check (generation_type in ('custom', 'ai_generated')),
  configuration jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tests enable row level security;

drop policy if exists "Anyone can view tests" on public.tests;create policy "Anyone can view tests"
  on public.tests for select
  using ( true );

drop policy if exists "Teachers can insert tests" on public.tests;create policy "Teachers can insert tests"
  on public.tests for insert
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') );

drop policy if exists "Teachers can update their own tests" on public.tests;create policy "Teachers can update their own tests"
  on public.tests for update
  using ( creator_id = auth.uid() );

-- =====================================================
-- Test Questions Table
-- =====================================================
create table if not exists public.test_questions (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references public.tests(id) on delete cascade not null,
  type text not null check (type in ('mcq', 'fill_in_blank', 'coding')),
  content jsonb not null,
  answer jsonb,
  test_cases jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.test_questions enable row level security;

drop policy if exists "Anyone can view test questions" on public.test_questions;create policy "Anyone can view test questions"
  on public.test_questions for select
  using ( true );

drop policy if exists "Teachers can insert test questions" on public.test_questions;create policy "Teachers can insert test questions"
  on public.test_questions for insert
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') );

-- =====================================================
-- Test Sessions Table
-- =====================================================
create table if not exists public.test_sessions (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references public.tests(id) on delete cascade not null,
  student_id uuid references auth.users(id) not null,
  status text not null default 'joined' check (status in ('joined', 'in_progress', 'completed')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  unique(test_id, student_id)
);

alter table public.test_sessions enable row level security;

drop policy if exists "Users can view their own sessions or teachers can view all" on public.test_sessions;create policy "Users can view their own sessions or teachers can view all"
  on public.test_sessions for select
  using ( auth.uid() = student_id OR exists (select 1 from public.tests where creator_id = auth.uid() and id = test_id) );

drop policy if exists "Students can insert their own sessions" on public.test_sessions;create policy "Students can insert their own sessions"
  on public.test_sessions for insert
  with check ( auth.uid() = student_id );

drop policy if exists "Students can update their own sessions" on public.test_sessions;create policy "Students can update their own sessions"
  on public.test_sessions for update
  using ( auth.uid() = student_id );

-- =====================================================
-- Test Submissions Table
-- =====================================================
create table if not exists public.test_submissions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.test_sessions(id) on delete cascade not null,
  question_id uuid references public.test_questions(id) on delete cascade not null,
  student_answer jsonb,
  code_submission text,
  is_correct boolean,
  score integer,
  ai_evaluation jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(session_id, question_id)
);

alter table public.test_submissions enable row level security;

drop policy if exists "Students can view their own submissions or teachers can view all" on public.test_submissions;create policy "Students can view their own submissions or teachers can view all"
  on public.test_submissions for select
  using ( 
    exists (select 1 from public.test_sessions where id = session_id and student_id = auth.uid()) OR 
    exists (select 1 from public.test_sessions s join public.tests t on s.test_id = t.id where s.id = session_id and t.creator_id = auth.uid()) 
  );

drop policy if exists "Students can insert their own submissions" on public.test_submissions;create policy "Students can insert their own submissions"
  on public.test_submissions for insert
  with check ( exists (select 1 from public.test_sessions where id = session_id and student_id = auth.uid()) );

drop policy if exists "Students can update their own submissions" on public.test_submissions;create policy "Students can update their own submissions"
  on public.test_submissions for update
  using ( exists (select 1 from public.test_sessions where id = session_id and student_id = auth.uid()) );

-- =====================================================
-- Test Results Table
-- =====================================================
create table if not exists public.test_results (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references public.tests(id) on delete cascade not null,
  student_id uuid references auth.users(id) not null,
  total_score integer,
  coding_category text check (coding_category in ('no_code', 'low_code', 'high_code')),
  detailed_report jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(test_id, student_id)
);

alter table public.test_results enable row level security;

drop policy if exists "Users can view their own results or teachers can view all" on public.test_results;create policy "Users can view their own results or teachers can view all"
  on public.test_results for select
  using ( auth.uid() = student_id OR exists (select 1 from public.tests where creator_id = auth.uid() and id = test_id) );

drop policy if exists "Teachers can insert results" on public.test_results;create policy "Teachers can insert results"
  on public.test_results for insert
  with check ( exists (select 1 from public.tests where creator_id = auth.uid() and id = test_id) );

drop policy if exists "Students can insert their own results via api" on public.test_results;create policy "Students can insert their own results via api"
  on public.test_results for insert
  with check ( auth.uid() = student_id );

drop policy if exists "Students can update their own results" on public.test_results;create policy "Students can update their own results"
  on public.test_results for update
  using ( auth.uid() = student_id );
-- Account deletion (backs the /privacy promise)
-- =====================================================
-- Several user-owned tables above have plain FKs (no ON DELETE CASCADE), so
-- deleting an auth user directly would fail. Three SECURITY DEFINER functions:
--
--   cleanup_user_rows_data(uuid) - removes rows that would block the delete
--                                 (plain function, called by both paths below)
--   cleanup_user_rows()          - trigger wrapper (BEFORE DELETE on auth.users,
--                                 so manual deletes in Studio also work)
--   delete_user_data(uuid)       - runs the cleanup, then deletes the auth user
--                                 (FK cascades wipe profiles, assessments,
--                                 chats, resumes, activity, proctoring...)
--                                 Called by POST /api/account/delete.
create or replace function public.cleanup_user_rows_data(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- submissions pointing at challenges owned by the user (incl. other users')
  delete from coding_submissions
   where challenge_id in (select id from coding_challenges where user_id = target);

  delete from coding_submissions where user_id = target;
  delete from coding_challenges  where user_id = target;
  delete from test_sessions      where student_id = target;
  delete from test_results       where student_id = target;
  -- NOTE: avatar files in storage.objects are deleted by the APP via the
  -- Storage API (direct SQL deletes on storage tables are blocked by design).
  -- See src/app/api/account/delete/route.ts.
end;
$$;

create or replace function public.cleanup_user_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cleanup_user_rows_data(OLD.id);
  return OLD;
end;
$$;

create or replace function public.delete_user_data(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cleanup_user_rows_data(target);
  delete from auth.users where id = target;
end;
$$;

-- only the service role may call these functions directly
revoke all on function public.delete_user_data(uuid) from public;
revoke all on function public.delete_user_data(uuid) from anon;
revoke all on function public.delete_user_data(uuid) from authenticated;
grant execute on function public.delete_user_data(uuid) to service_role;

-- safety net: even a manual delete in Studio cleans up owned rows first
drop trigger if exists on_auth_user_delete on auth.users;
create trigger on_auth_user_delete
  before delete on auth.users
  for each row execute procedure public.cleanup_user_rows();

-- =====================================================
-- Storage: avatars bucket (used by the profile page uploader)
-- =====================================================
-- insert into storage.buckets (id, name, public) is idempotent by primary key
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- public read of avatars
drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- signed-in users may upload/update only inside their own folder:
--   avatars/<their-user-id>-<timestamp>.<ext>  (matches profile/page.tsx)
drop policy if exists "Avatar own-folder write" on storage.objects;
create policy "Avatar own-folder write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatar own-folder update" on storage.objects;
create policy "Avatar own-folder update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- Demo seed data (idempotent - safe to re-run)
-- =====================================================
-- Public starter challenges (user_id IS NULL = visible to everyone via RLS).
-- starter_code/test_cases are jsonb, hence the explicit casts.
insert into public.coding_challenges (user_id, title, description, difficulty, category, starter_code, test_cases)
select * from (values
  (null::uuid, 'Two Sum', 'Given an array of integers, return indices of the two numbers that add up to a target.', 'easy', 'arrays',
   '{"python": "def two_sum(nums, target):\n    # your code here\n    pass\n", "javascript": "function twoSum(nums, target) {\n  // your code here\n}\n"}'::jsonb,
   '[{"input": "[2,7,11,15], 9", "expected": "[0,1]"}, {"input": "[3,2,4], 6", "expected": "[1,2]"}]'::jsonb),
  (null::uuid, 'Reverse String', 'Reverse the given string without using built-in reverse functions.', 'easy', 'strings',
   '{"python": "def reverse_string(s: str) -> str:\n    # your code here\n    pass\n", "javascript": "function reverseString(s) {\n  // your code here\n}\n"}'::jsonb,
   '[{"input": "hello", "expected": "olleh"}, {"input": "CareerPath", "expected": "htapreeraC"}]'::jsonb),
  (null::uuid, 'FizzBuzz', 'Print numbers 1 to n, replacing multiples of 3 with Fizz, 5 with Buzz, and both with FizzBuzz.', 'easy', 'loops',
   '{"python": "def fizz_buzz(n: int) -> list:\n    # your code here\n    pass\n", "javascript": "function fizzBuzz(n) {\n  // your code here\n}\n"}'::jsonb,
   '[{"input": "5", "expected": "[1,2,Fizz,4,Buzz]"}, {"input": "15", "expected": "[1,2,Fizz,4,Buzz,Fizz,7,8,Fizz,Buzz,11,Fizz,13,14,FizzBuzz]"}]'::jsonb)
) AS seed(user_id, title, description, difficulty, category, starter_code, test_cases)
where not exists (select 1 from public.coding_challenges where title = 'Two Sum');
