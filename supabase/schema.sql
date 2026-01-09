
-- =====================================================
-- Career Guidance Platform - Database Schema
-- =====================================================

-- Users Table (managed by Auth, but we use a trigger to create public profiles)
create table public.profiles (
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

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
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
create table public.career_selections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  career_name text not null,
  is_custom boolean default false,
  selected_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.career_selections enable row level security;

create policy "Users can view their own career selections"
  on public.career_selections for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own career selections"
  on public.career_selections for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own career selections"
  on public.career_selections for update
  using ( auth.uid() = user_id );

-- =====================================================
-- User Assessments Table (stores 20 Q&A)
-- =====================================================
create table public.user_assessments (
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

create policy "Users can view their own assessments"
  on public.user_assessments for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own assessments"
  on public.user_assessments for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Skills Gap Analysis Table
-- =====================================================
create table public.skills_gap_analysis (
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

create policy "Users can view their own analysis"
  on public.skills_gap_analysis for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own analysis"
  on public.skills_gap_analysis for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Coding Challenges Table (AI Generated)
-- =====================================================
create table public.coding_challenges (
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

create policy "Users can view their own or public challenges"
  on public.coding_challenges for select
  using ( auth.uid() = user_id OR user_id IS NULL );

create policy "Authenticated users can create their own challenges"
  on public.coding_challenges for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Coding Submissions Table
-- =====================================================
create table public.coding_submissions (
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

create policy "Users can view their own submissions"
  on public.coding_submissions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own submissions"
  on public.coding_submissions for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Resume Analysis Table
-- =====================================================
create table public.resume_analyses (
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

create policy "Users can view their own resume analyses"
  on public.resume_analyses for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own resume analyses"
  on public.resume_analyses for insert
  with check ( auth.uid() = user_id );

-- =====================================================
-- Chat History Table
-- =====================================================
create table public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  messages jsonb not null,
  context jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_history enable row level security;

create policy "Users can view their own chat history"
  on public.chat_history for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own chat history"
  on public.chat_history for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own chat history"
  on public.chat_history for update
  using ( auth.uid() = user_id );

-- =====================================================
-- User Activity Table (for streak tracking)
-- =====================================================
create table public.user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_date date not null default current_date,
  activity_type text default 'login',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, activity_date)
);

alter table public.user_activity enable row level security;

create policy "Users can view their own activity"
  on public.user_activity for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own activity"
  on public.user_activity for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own activity"
  on public.user_activity for update
  using ( auth.uid() = user_id );
