-- Roles + local auth by employee login/password (plain text)
alter table public.employees
add column if not exists login text null,
add column if not exists password text null,
add column if not exists role text not null default 'employee';

-- Keep logins normalized and unique (latin+digits expected from UI)
update public.employees
set login = lower(login)
where login is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_role_check'
  ) then
    alter table public.employees
    add constraint employees_role_check check (role in ('admin', 'employee'));
  end if;
end
$$;

create unique index if not exists employees_login_unique_idx
on public.employees ((lower(login)))
where login is not null;

-- Preferences should be bindable to employee id (not auth.users id)
alter table public.user_analytics_preferences
drop constraint if exists user_analytics_preferences_user_id_fkey;

alter table public.user_ui_preferences
drop constraint if exists user_ui_preferences_user_id_fkey;

-- Allow client work without Supabase Auth session (custom login flow)
alter table public.employees disable row level security;
alter table public.projects disable row level security;
alter table public.tasks disable row level security;
alter table public.tags disable row level security;
alter table public.tag_templates disable row level security;
alter table public.user_analytics_preferences disable row level security;
alter table public.user_ui_preferences disable row level security;
