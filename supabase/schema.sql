-- 中国越境EC 施策・QA管理ボード MVP schema
-- Supabase Dashboard > SQL Editor に貼り付けて実行してください。

create extension if not exists "pgcrypto";

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  background_color text not null default '#d9eef4',
  border_color text not null default '#a8cfda',
  text_color text not null default '#174555',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  status text not null check (status in ('検討中', '準備中', '実行中', '完了')),
  is_routine boolean not null default false,
  sort_order integer not null default 0,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_card_tags (
  card_id uuid not null references public.project_cards(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  primary key (card_id, tag_id)
);

create table if not exists public.qa_logs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  type text not null check (type in ('調査依頼', 'QA')),
  state text not null check (state in ('未対応', '対応中', '完了', '保留')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qa_log_tags (
  qa_log_id uuid not null references public.qa_logs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  primary key (qa_log_id, tag_id)
);

create table if not exists public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'member')) default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('project_card', 'qa_log')),
  owner_id uuid not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

drop trigger if exists set_project_cards_updated_at on public.project_cards;
create trigger set_project_cards_updated_at
before update on public.project_cards
for each row execute function public.set_updated_at();

drop trigger if exists set_qa_logs_updated_at on public.qa_logs;
create trigger set_qa_logs_updated_at
before update on public.qa_logs
for each row execute function public.set_updated_at();

insert into public.tags (name, background_color, border_color, text_color)
values
  ('シトルリン&アルギニン', '#d9eef4', '#a8cfda', '#174555'),
  ('クレアルカリン', '#e4f1dc', '#b9d4a8', '#315f28'),
  ('VITAPOWER', '#fff0c9', '#e4c46f', '#665018'),
  ('EAA', '#f7dbe3', '#daa9b7', '#743449'),
  ('商品共通タグ', '#e7e0f4', '#c8b8df', '#49396d'),
  ('画像制作', '#dff0e9', '#a8d0c0', '#245647'),
  ('モール施策：Douyin', '#f3e1d5', '#d7b39b', '#69422c'),
  ('モール施策：TMALL', '#d9eef4', '#a8cfda', '#174555'),
  ('モール施策：JD', '#e4f1dc', '#b9d4a8', '#315f28'),
  ('同梱物', '#fff0c9', '#e4c46f', '#665018'),
  ('動画制作', '#f7dbe3', '#daa9b7', '#743449'),
  ('動画制作（代理店）', '#e7e0f4', '#c8b8df', '#49396d'),
  ('SNS企画：RED', '#dff0e9', '#a8d0c0', '#245647'),
  ('SNS企画：Douyin公式', '#f3e1d5', '#d7b39b', '#69422c'),
  ('SNS企画：Douyinしみけん×VITAS', '#d9eef4', '#a8cfda', '#174555'),
  ('SNS企画：Bilibiliしみけん', '#e4f1dc', '#b9d4a8', '#315f28'),
  ('ライブコマース（代理店）', '#fff0c9', '#e4c46f', '#665018'),
  ('ライブコマース（自社）', '#f7dbe3', '#daa9b7', '#743449'),
  ('インフルエンサー施策', '#e7e0f4', '#c8b8df', '#49396d')
on conflict (name) do nothing;

-- MVP初期段階: Googleログイン導入前でも接続確認しやすいように、anon/authenticatedにCRUDを許可します。
-- チーム公開前にGoogle OAuthとRLSポリシーへ切り替えます。
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.tags enable row level security;
alter table public.project_cards enable row level security;
alter table public.project_card_tags enable row level security;
alter table public.qa_logs enable row level security;
alter table public.qa_log_tags enable row level security;
alter table public.allowed_users enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "mvp anon can manage tags" on public.tags;
create policy "mvp anon can manage tags"
on public.tags for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp anon can manage project cards" on public.project_cards;
create policy "mvp anon can manage project cards"
on public.project_cards for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp anon can manage project card tags" on public.project_card_tags;
create policy "mvp anon can manage project card tags"
on public.project_card_tags for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp anon can manage qa logs" on public.qa_logs;
create policy "mvp anon can manage qa logs"
on public.qa_logs for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp anon can manage qa log tags" on public.qa_log_tags;
create policy "mvp anon can manage qa log tags"
on public.qa_log_tags for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp anon can read allowed users" on public.allowed_users;
create policy "mvp anon can read allowed users"
on public.allowed_users for select to anon, authenticated using (true);

drop policy if exists "mvp anon can manage attachments" on public.attachments;
create policy "mvp anon can manage attachments"
on public.attachments for all to anon, authenticated using (true) with check (true);
