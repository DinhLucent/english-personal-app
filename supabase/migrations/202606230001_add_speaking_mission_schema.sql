create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  day_number integer not null check (day_number between 1 and 30),
  week_number integer not null check (week_number >= 1),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2')),
  track text not null default 'workplace' check (track in ('workplace', 'ielts_later')),
  title text not null,
  goal text not null,
  scenario text not null,
  estimated_minutes integer not null default 20 check (estimated_minutes between 1 and 180),
  target_chunks jsonb not null default '[]',
  target_vocabulary jsonb not null default '[]',
  practice_questions jsonb not null default '[]',
  roleplay_prompt text not null,
  rubric_json jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track, level, day_number)
);

create table if not exists public.mission_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete restrict,
  status text not null default 'started' check (status in ('started', 'completed')),
  current_step text not null default 'prepare' check (
    current_step in ('prepare', 'drill', 'roleplay', 'feedback', 'retry', 'review')
  ),
  score_task integer check (score_task between 0 and 5),
  score_fluency integer check (score_fluency between 0 and 5),
  score_accuracy integer check (score_accuracy between 0 and 5),
  score_vocabulary integer check (score_vocabulary between 0 and 5),
  score_interaction integer check (score_interaction between 0 and 5),
  summary_json jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table if not exists public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete restrict,
  mission_attempt_id uuid not null references public.mission_attempts(id) on delete cascade,
  step text not null check (step in ('drill', 'roleplay', 'retry')),
  prompt text not null,
  user_answer text not null,
  retry_of uuid references public.speaking_attempts(id) on delete set null,
  feedback_json jsonb,
  score_task integer check (score_task between 0 and 5),
  score_fluency integer check (score_fluency between 0 and 5),
  score_accuracy integer check (score_accuracy between 0 and 5),
  score_vocabulary integer check (score_vocabulary between 0 and 5),
  score_interaction integer check (score_interaction between 0 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('error', 'chunk', 'vocabulary', 'answer')),
  source_id uuid,
  mission_id uuid references public.missions(id) on delete set null,
  content text not null,
  meaning_vi text,
  example text,
  error_pattern text,
  correct_form text,
  next_review_at timestamptz not null default now(),
  review_count integer not null default 0 check (review_count >= 0),
  ease_factor numeric not null default 2.5 check (ease_factor > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missions_track_day_idx on public.missions(track, day_number);
create index if not exists mission_attempts_user_status_idx on public.mission_attempts(user_id, status);
create index if not exists mission_attempts_mission_id_idx on public.mission_attempts(mission_id);
create index if not exists speaking_attempts_user_created_idx on public.speaking_attempts(user_id, created_at desc);
create index if not exists speaking_attempts_mission_id_idx on public.speaking_attempts(mission_id);
create index if not exists speaking_attempts_mission_attempt_id_idx on public.speaking_attempts(mission_attempt_id);
create index if not exists speaking_attempts_retry_of_idx on public.speaking_attempts(retry_of);
create index if not exists review_items_user_review_idx on public.review_items(user_id, next_review_at);
create index if not exists review_items_mission_id_idx on public.review_items(mission_id);

alter table public.missions enable row level security;
alter table public.mission_attempts enable row level security;
alter table public.speaking_attempts enable row level security;
alter table public.review_items enable row level security;

grant select on public.missions to authenticated;
grant select, insert, update, delete on public.mission_attempts to authenticated;
grant select, insert, update, delete on public.speaking_attempts to authenticated;
grant select, insert, update, delete on public.review_items to authenticated;

create policy "Missions are readable by authenticated users" on public.missions
  for select to authenticated using (true);

create policy "Mission attempts are self-owned" on public.mission_attempts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Speaking attempts are self-owned" on public.speaking_attempts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Review items are self-owned" on public.review_items
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
