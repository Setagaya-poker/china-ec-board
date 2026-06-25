-- タグ初期データ追加用
-- Supabase Dashboard > SQL Editor に貼り付けて Run してください。
-- すでに同名タグがある場合は、名前は増やさず色だけ更新します。

insert into public.tags (name, background_color, border_color, text_color)
values
  -- 商品タグ
  ('シトルリン&アルギニン', '#d9eef4', '#a8cfda', '#174555'),
  ('クレアルカリン', '#e4f1dc', '#b9d4a8', '#315f28'),
  ('VITAPOWER', '#fff0c9', '#e4c46f', '#665018'),
  ('EAA', '#f7dbe3', '#daa9b7', '#743449'),
  ('商品共通タグ', '#e7e0f4', '#c8b8df', '#49396d'),

  -- 制作・同梱物
  ('画像制作', '#dff0e9', '#a8d0c0', '#245647'),
  ('動画制作', '#f7dbe3', '#daa9b7', '#743449'),
  ('動画制作（代理店）', '#e7e0f4', '#c8b8df', '#49396d'),
  ('同梱物', '#fff0c9', '#e4c46f', '#665018'),

  -- モール施策
  ('モール施策：Douyin', '#f3e1d5', '#d7b39b', '#69422c'),
  ('モール施策：TMALL', '#d9eef4', '#a8cfda', '#174555'),
  ('モール施策：JD', '#e4f1dc', '#b9d4a8', '#315f28'),

  -- SNS企画
  ('SNS企画：RED', '#dff0e9', '#a8d0c0', '#245647'),
  ('SNS企画：Douyin公式', '#f3e1d5', '#d7b39b', '#69422c'),
  ('SNS企画：Douyinしみけん×VITAS', '#d9eef4', '#a8cfda', '#174555'),
  ('SNS企画：Bilibiliしみけん', '#e4f1dc', '#b9d4a8', '#315f28'),

  -- ライブ・インフルエンサー
  ('ライブコマース（代理店）', '#fff0c9', '#e4c46f', '#665018'),
  ('ライブコマース（自社）', '#f7dbe3', '#daa9b7', '#743449'),
  ('インフルエンサー施策', '#e7e0f4', '#c8b8df', '#49396d')
on conflict (name) do update set
  background_color = excluded.background_color,
  border_color = excluded.border_color,
  text_color = excluded.text_color,
  updated_at = now();
