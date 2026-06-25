-- MVP接続確認用の一時ポリシーです。
-- Googleログイン導入前に、ブラウザからSupabaseへ保存できるか確認するためだけに使います。
-- チーム公開前に、allowed_users と auth.uid() を使った制限付きポリシーへ切り替えます。

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
drop policy if exists "mvp anon can manage project cards" on public.project_cards;
drop policy if exists "mvp anon can manage project card tags" on public.project_card_tags;
drop policy if exists "mvp anon can manage qa logs" on public.qa_logs;
drop policy if exists "mvp anon can manage qa log tags" on public.qa_log_tags;
drop policy if exists "mvp anon can read allowed users" on public.allowed_users;
drop policy if exists "mvp anon can manage attachments" on public.attachments;

create policy "mvp anon can manage tags"
on public.tags for all to anon, authenticated using (true) with check (true);

create policy "mvp anon can manage project cards"
on public.project_cards for all to anon, authenticated using (true) with check (true);

create policy "mvp anon can manage project card tags"
on public.project_card_tags for all to anon, authenticated using (true) with check (true);

create policy "mvp anon can manage qa logs"
on public.qa_logs for all to anon, authenticated using (true) with check (true);

create policy "mvp anon can manage qa log tags"
on public.qa_log_tags for all to anon, authenticated using (true) with check (true);

create policy "mvp anon can read allowed users"
on public.allowed_users for select to anon, authenticated using (true);

create policy "mvp anon can manage attachments"
on public.attachments for all to anon, authenticated using (true) with check (true);
