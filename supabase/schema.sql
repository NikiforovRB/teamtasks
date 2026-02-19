-- Task tracker schema for Supabase (Postgres)
-- Apply in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_hidden boolean not null default false,
  "order" integer not null default 0,
  avatar_url text null,
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_hidden boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tasks
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('planned', 'completed');
  end if;
end$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null references public.projects(id) on delete set null,
  employee_id uuid null references public.employees(id) on delete set null,
  short_description text not null,
  long_description text null,
  date date not null,
  status public.task_status not null default 'planned',
  time_spent_minutes integer null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_spent_minutes_non_negative check (time_spent_minutes is null or time_spent_minutes >= 0)
);

create index if not exists tasks_date_idx on public.tasks(date);
create index if not exists tasks_employee_idx on public.tasks(employee_id);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_status_idx on public.tasks(status);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- Tags (per-task, max 20 chars)
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  color text not null default '#FFFFFF',
  created_at timestamptz not null default now(),
  constraint tag_name_len check (char_length(name) between 1 and 20),
  constraint tag_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists tags_task_id_idx on public.tags(task_id);

-- Tag templates (library for "Добавить тег" in tasks)
create table if not exists public.tag_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#FFFFFF',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tag_template_name_len check (char_length(name) between 1 and 20),
  constraint tag_template_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

drop policy if exists "tag_templates_authenticated_all" on public.tag_templates;
create policy "tag_templates_authenticated_all"
on public.tag_templates for all to authenticated using (true) with check (true);

-- RLS
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.tags enable row level security;
alter table public.tag_templates enable row level security;

drop policy if exists "employees_authenticated_all" on public.employees;
create policy "employees_authenticated_all"
on public.employees
for all
to authenticated
using (true)
with check (true);

drop policy if exists "projects_authenticated_all" on public.projects;
create policy "projects_authenticated_all"
on public.projects
for all
to authenticated
using (true)
with check (true);

drop policy if exists "tasks_authenticated_all" on public.tasks;
create policy "tasks_authenticated_all"
on public.tasks
for all
to authenticated
using (true)
with check (true);

drop policy if exists "tags_authenticated_all" on public.tags;
create policy "tags_authenticated_all"
on public.tags
for all
to authenticated
using (true)
with check (true);

