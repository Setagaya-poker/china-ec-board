-- 本番Supabase構造確認用（読み取り専用）
-- SQL Editorで実行して、結果をCodexに貼ってください。
-- drop / truncate / update / insert / delete は含みません。

-- 1. 対象テーブルのカラム・型・NULL許容・デフォルト値
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'project_cards',
    'project_card_tags',
    'qa_logs',
    'qa_log_tags',
    'tags',
    'allowed_users',
    'attachments'
  )
order by table_name, ordinal_position;

-- 2. 主キー・外部キー・ユニーク・チェック制約
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
  and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name in (
    'project_cards',
    'project_card_tags',
    'qa_logs',
    'qa_log_tags',
    'tags',
    'allowed_users',
    'attachments'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- 3. RLSポリシー
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'project_cards',
    'project_card_tags',
    'qa_logs',
    'qa_log_tags',
    'tags',
    'allowed_users',
    'attachments'
  )
order by tablename, policyname;

-- 4. 既存データ件数
select 'project_cards' as table_name, count(*)::bigint as row_count from public.project_cards
union all
select 'project_card_tags', count(*)::bigint from public.project_card_tags
union all
select 'qa_logs', count(*)::bigint from public.qa_logs
union all
select 'qa_log_tags', count(*)::bigint from public.qa_log_tags
union all
select 'tags', count(*)::bigint from public.tags
union all
select 'allowed_users', count(*)::bigint from public.allowed_users
union all
select 'attachments', count(*)::bigint from public.attachments
order by table_name;

-- 5. Storage bucket一覧
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
order by name;
