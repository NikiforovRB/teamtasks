-- User UI preferences (e.g. show weekend in kanban)
create table if not exists public.user_ui_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_weekend boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_ui_preferences enable row level security;

drop policy if exists "user_ui_preferences_own" on public.user_ui_preferences;
create policy "user_ui_preferences_own"
on public.user_ui_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
