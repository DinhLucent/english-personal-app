create extension if not exists "pgcrypto";
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  native_language text not null default 'vi',
  target_level text,
  job_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_days integer not null default 30,
  start_date date not null default current_date,
  target_level text,
  focus_areas text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.learning_plans(id) on delete set null,
  day_number integer not null check (day_number between 1 and 30),
  title text not null,
  level text,
  content_json jsonb not null,
  generated_by text not null default 'deepseek',
  created_at timestamptz not null default now(),
  unique (user_id, plan_id, day_number)
);

create table if not exists public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.daily_lessons(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  score integer check (score between 0 and 100),
  minutes_spent integer not null default 0,
  writing_answer text,
  ai_feedback_json jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('conversation', 'reflex', 'grammar', 'assessment')),
  difficulty text,
  status text not null default 'active' check (status in ('active', 'completed')),
  summary_json jsonb,
  score integer check (score between 0 and 100),
  minutes_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  feedback_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word text not null,
  meaning_vi text not null,
  example text not null,
  topic text,
  job_context text,
  ease_factor numeric not null default 2.5,
  review_count integer not null default 0,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_text text not null,
  corrected_text text not null,
  natural_text text not null,
  mistakes_json jsonb not null default '[]',
  explanation_vi text,
  score integer check (score between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level text not null check (level in ('A1', 'A2', 'B1', 'B2')),
  score_json jsonb not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  next_plan_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  agent_type text not null,
  model text,
  input_hash text,
  status text not null check (status in ('success', 'failed')),
  latency_ms integer,
  tokens_input integer,
  tokens_output integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists learning_plans_user_id_idx on public.learning_plans(user_id);
create index if not exists daily_lessons_user_day_idx on public.daily_lessons(user_id, day_number);
create index if not exists lesson_attempts_user_id_idx on public.lesson_attempts(user_id);
create index if not exists practice_sessions_user_type_idx on public.practice_sessions(user_id, type);
create index if not exists conversation_messages_session_idx on public.conversation_messages(session_id);
create index if not exists vocabulary_items_user_review_idx on public.vocabulary_items(user_id, next_review_at);
create index if not exists corrections_user_created_idx on public.corrections(user_id, created_at desc);
create index if not exists assessments_user_created_idx on public.assessments(user_id, created_at desc);
create index if not exists ai_requests_user_created_idx on public.ai_requests(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.learning_plans enable row level security;
alter table public.daily_lessons enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.corrections enable row level security;
alter table public.assessments enable row level security;
alter table public.ai_requests enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.learning_plans to authenticated;
grant select, insert, update, delete on public.daily_lessons to authenticated;
grant select, insert, update, delete on public.lesson_attempts to authenticated;
grant select, insert, update, delete on public.practice_sessions to authenticated;
grant select, insert, update, delete on public.conversation_messages to authenticated;
grant select, insert, update, delete on public.vocabulary_items to authenticated;
grant select, insert, update, delete on public.corrections to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert on public.ai_requests to authenticated;

create policy "Profiles are self-owned" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Learning plans are self-owned" on public.learning_plans
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Daily lessons are self-owned" on public.daily_lessons
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Lesson attempts are self-owned" on public.lesson_attempts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Practice sessions are self-owned" on public.practice_sessions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Conversation messages are self-owned" on public.conversation_messages
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Vocabulary items are self-owned" on public.vocabulary_items
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Corrections are self-owned" on public.corrections
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Assessments are self-owned" on public.assessments
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "AI request logs are self-readable" on public.ai_requests
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Users can insert their own AI request logs" on public.ai_requests
  for insert to authenticated with check (user_id = (select auth.uid()) or user_id is null);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
