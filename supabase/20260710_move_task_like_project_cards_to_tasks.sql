-- Move project cards that are actually finite tasks into mini_tasks.
-- This preserves title, body, tags, assignees, due dates, and project links.
-- It deletes only the moved project card rows after inserting equivalent task rows.

begin;

with move_targets(old_card_id, parent_card_id, task_due_date) as (
  values
    (
      '7a687730-ea14-489a-ad31-3e3bf21273f7'::uuid,
      null::uuid,
      null::date
    ),
    (
      'b71c5cdf-1f84-45d7-8c5b-85ed79df55a7'::uuid,
      null::uuid,
      null::date
    ),
    (
      'cd8e8ac6-b54d-46a3-b112-6ceb17bfd71b'::uuid,
      '8e04523c-1aee-4329-9107-9c85f723a8ec'::uuid,
      '2026-07-08'::date
    ),
    (
      'aa66a480-66a7-4c09-8eeb-d1464d64f967'::uuid,
      null::uuid,
      null::date
    ),
    (
      'a868ed91-4d3d-4809-88ff-d7e02abd9320'::uuid,
      'e84bed86-8de3-4313-b8e9-acac0b7c986d'::uuid,
      '2026-07-09'::date
    )
),
source_cards as (
  select
    pc.id as old_card_id,
    mt.parent_card_id,
    pc.title,
    pc.body,
    case
      when pc.status = '完了' then '完了'
      when pc.status = '実行中' then '実施中'
      else '未着手'
    end as task_status,
    coalesce(pc.due_date, mt.task_due_date) as due_date,
    pc.assignees,
    pc.updated_by
  from public.project_cards pc
  join move_targets mt on mt.old_card_id = pc.id
),
inserted_tasks as (
  insert into public.mini_tasks (
    title,
    body,
    status,
    source_project_card_id,
    due_date,
    assignees,
    updated_by,
    created_at,
    updated_at
  )
  select
    sc.title,
    case
      when trim(coalesce(sc.body, '')) = '' then '案件カードからタスクへ移動。'
      else sc.body || E'\n\n---\n案件カードからタスクへ移動。'
    end,
    sc.task_status,
    sc.parent_card_id,
    sc.due_date,
    sc.assignees,
    coalesce(sc.updated_by, '梅澤'),
    now(),
    now()
  from source_cards sc
  where not exists (
    select 1
    from public.mini_tasks mt
    where lower(regexp_replace(trim(mt.title), '\s+', ' ', 'g')) =
      lower(regexp_replace(trim(sc.title), '\s+', ' ', 'g'))
  )
  returning id, title
),
inserted_task_sources as (
  select it.id as mini_task_id, sc.old_card_id
  from inserted_tasks it
  join source_cards sc on sc.title = it.title
),
inserted_tags as (
  insert into public.mini_task_tags (mini_task_id, tag_id)
  select distinct its.mini_task_id, pct.tag_id
  from inserted_task_sources its
  join public.project_card_tags pct on pct.card_id = its.old_card_id
  on conflict do nothing
  returning mini_task_id, tag_id
),
deleted_cards as (
  delete from public.project_cards pc
  using move_targets mt
  where pc.id = mt.old_card_id
  returning pc.id
)
select
  (select count(*) from inserted_tasks) as inserted_task_count,
  (select count(*) from inserted_tags) as inserted_tag_link_count,
  (select count(*) from deleted_cards) as deleted_project_card_count;

commit;
