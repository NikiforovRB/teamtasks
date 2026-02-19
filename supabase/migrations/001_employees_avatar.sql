-- Add avatar_url to employees (optional; run in SQL Editor if table already exists)
alter table public.employees
add column if not exists avatar_url text null;
