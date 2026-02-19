-- Tag templates (library of tags for use in tasks)
create table if not exists public.tag_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#FFFFFF',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tag_template_name_len check (char_length(name) between 1 and 20),
  constraint tag_template_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.tag_templates enable row level security;

drop policy if exists "tag_templates_authenticated_all" on public.tag_templates;
create policy "tag_templates_authenticated_all"
on public.tag_templates
for all
to authenticated
using (true)
with check (true);

-- Optional: seed default presets when table is empty
insert into public.tag_templates (name, color, "order")
select 'Срочно', '#F33737', 0
union all select 'Важно', '#EBE400', 1
union all select 'Обычное', '#6F6F6F', 2
where not exists (select 1 from public.tag_templates limit 1);
