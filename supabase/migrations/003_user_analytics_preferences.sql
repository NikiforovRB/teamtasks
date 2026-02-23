-- User analytics filter preferences (persist across reloads)
create table if not exists public.user_analytics_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  project_id uuid null references public.projects(id) on delete set null,
  employee_id uuid null references public.employees(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_analytics_preferences enable row level security;

drop policy if exists "user_analytics_preferences_own" on public.user_analytics_preferences;
create policy "user_analytics_preferences_own"
on public.user_analytics_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
