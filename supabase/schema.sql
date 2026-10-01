-- Enable pgcrypto for gen_random_uuid() if needed (Supabase has it by default).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fa')),
  created_at timestamptz not null default now()
);

create table if not exists public.time_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  note text,
  is_remote boolean not null default false,
  created_at timestamptz not null default now(),
  check (check_out_at is null or check_out_at > check_in_at)
);

create table if not exists public.day_flags (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  is_remote boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  title text not null,
  description text,
  is_done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- run these if the tables already exist from an earlier deploy:
alter table public.tasks add column if not exists is_done boolean not null default false;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.time_sessions add column if not exists is_remote boolean not null default false;

create index if not exists time_sessions_user_date_idx on public.time_sessions (user_id, date);
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
create index if not exists day_flags_user_date_idx on public.day_flags (user_id, date);

alter table public.profiles enable row level security;
alter table public.time_sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.day_flags enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "sessions_owner" on public.time_sessions;
create policy "sessions_owner" on public.time_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "day_flags_owner" on public.day_flags;
create policy "day_flags_owner" on public.day_flags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
