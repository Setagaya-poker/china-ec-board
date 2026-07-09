-- Three Peaceメンバー追加用
-- Supabase Dashboard > SQL Editor に貼り付けて Run してください。

insert into public.allowed_users (email, role)
values
  ('tonei@three-peace.tokyo', 'member'),
  ('hao@three-peace.tokyo', 'member')
on conflict (email) do update set role = excluded.role;
