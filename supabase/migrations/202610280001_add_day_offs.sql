create table if not exists public.day_offs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  leave_type text not null check (leave_type in (
    'annual_leave',
    'sick_leave',
    'paid_leave',
    'unpaid_leave',
    'maternity_leave',
    'parental_leave',
    'sabbatical_leave'
  )),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists day_offs_user_date_idx on public.day_offs (user_id, date);

alter table public.day_offs enable row level security;

drop policy if exists "day_offs_owner" on public.day_offs;
create policy "day_offs_owner" on public.day_offs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
