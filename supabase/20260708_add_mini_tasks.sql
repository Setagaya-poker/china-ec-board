-- Step 4: add mini task tables without changing existing data.
-- This migration is additive. It does not drop, truncate, or overwrite existing rows.

create table if not exists public.mini_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  status text not null check (status in ('未着手', '実施中', '完了')),
  due_date date null,
  updated_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mini_task_tags (
  mini_task_id uuid not null references public.mini_tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  primary key (mini_task_id, tag_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_mini_tasks_updated_at'
      and tgrelid = 'public.mini_tasks'::regclass
  ) then
    create trigger set_mini_tasks_updated_at
    before update on public.mini_tasks
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.mini_tasks enable row level security;
alter table public.mini_task_tags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mini_tasks'
      and policyname = 'mvp anon can manage mini tasks'
  ) then
    create policy "mvp anon can manage mini tasks"
    on public.mini_tasks for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mini_task_tags'
      and policyname = 'mvp anon can manage mini task tags'
  ) then
    create policy "mvp anon can manage mini task tags"
    on public.mini_task_tags for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
