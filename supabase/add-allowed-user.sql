-- 許可ユーザー追加用
-- EMAIL_HERE@example.com を追加したいGoogleメールに変更してから実行してください。

insert into public.allowed_users (email, role)
values ('EMAIL_HERE@example.com', 'member')
on conflict (email) do update set role = excluded.role;
