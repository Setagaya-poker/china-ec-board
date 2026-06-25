-- Googleログイン + 許可ユーザー制限用RLS
-- 実行前に YOUR_GOOGLE_EMAIL@example.com を自分のGoogleメールに変更してください。

insert into public.allowed_users (email, role)
values ('YOUR_GOOGLE_EMAIL@example.com', 'admin')
on conflict (email) do update set role = excluded.role;

create or replace function public.is_allowed_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  );
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
      and role = 'admin'
  );
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.project_cards to authenticated;
grant select, insert, update, delete on public.project_card_tags to authenticated;
grant select, insert, update, delete on public.qa_logs to authenticated;
grant select, insert, update, delete on public.qa_log_tags to authenticated;
grant select, insert, update, delete on public.allowed_users to authenticated;
grant select, insert, update, delete on public.attachments to authenticated;

revoke all on public.tags from anon;
revoke all on public.project_cards from anon;
revoke all on public.project_card_tags from anon;
revoke all on public.qa_logs from anon;
revoke all on public.qa_log_tags from anon;
revoke all on public.allowed_users from anon;
revoke all on public.attachments from anon;

alter table public.tags enable row level security;
alter table public.project_cards enable row level security;
alter table public.project_card_tags enable row level security;
alter table public.qa_logs enable row level security;
alter table public.qa_log_tags enable row level security;
alter table public.allowed_users enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "mvp anon can manage tags" on public.tags;
drop policy if exists "mvp anon can manage project cards" on public.project_cards;
drop policy if exists "mvp anon can manage project card tags" on public.project_card_tags;
drop policy if exists "mvp anon can manage qa logs" on public.qa_logs;
drop policy if exists "mvp anon can manage qa log tags" on public.qa_log_tags;
drop policy if exists "mvp anon can read allowed users" on public.allowed_users;
drop policy if exists "mvp anon can manage attachments" on public.attachments;

drop policy if exists "allowed users can manage tags" on public.tags;
drop policy if exists "allowed users can manage project cards" on public.project_cards;
drop policy if exists "allowed users can manage project card tags" on public.project_card_tags;
drop policy if exists "allowed users can manage qa logs" on public.qa_logs;
drop policy if exists "allowed users can manage qa log tags" on public.qa_log_tags;
drop policy if exists "allowed users can manage attachments" on public.attachments;
drop policy if exists "allowed users can read themselves" on public.allowed_users;
drop policy if exists "admins can manage allowed users" on public.allowed_users;

create policy "allowed users can manage tags"
on public.tags for all to authenticated
using (public.is_allowed_user())
with check (public.is_allowed_user());

create policy "allowed users can manage project cards"
on public.project_cards for all to authenticated
using (public.is_allowed_user())
with check (public.is_allowed_user());

create policy "allowed users can manage project card tags"
on public.project_card_tags for all to authenticated
using (public.is_allowed_user())
with check (public.is_allowed_user());

create policy "allowed users can manage qa logs"
on public.qa_logs for all to authenticated
using (public.is_allowed_user())
with check (public.is_allowed_user());

create policy "allowed users can manage qa log tags"
on public.qa_log_tags for all to authenticated
using (public.is_allowed_user())
with check (public.is_allowed_user());

create policy "allowed users can manage attachments"
on public.attachments for all to authenticated
using (public.is_allowed_user())
with check (public.is_allowed_user());

create policy "allowed users can read themselves"
on public.allowed_users for select to authenticated
using (email = auth.jwt() ->> 'email' or public.is_admin_user());

create policy "admins can manage allowed users"
on public.allowed_users for all to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
