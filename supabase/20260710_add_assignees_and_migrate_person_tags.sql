-- Add assignees as a first-class field and migrate person-name tags.
-- Additive columns first, then remove only person-tag links from staging data.

alter table public.project_cards
add column if not exists assignees text[] not null default '{}';

alter table public.mini_tasks
add column if not exists assignees text[] not null default '{}';

comment on column public.project_cards.assignees is
  'People responsible for this project card. Migrated from person-name tags.';

comment on column public.mini_tasks.assignees is
  'People responsible for this task. Migrated from person-name tags.';

with person_tags(tag_name, assignee_name) as (
  values
    ('Haoさん', 'Hao'),
    ('寧さん', '寧'),
    ('梅澤', '梅澤')
),
card_assignees as (
  select
    pct.card_id,
    array_agg(distinct pt.assignee_name order by pt.assignee_name) as assignees
  from public.project_card_tags pct
  join public.tags t on t.id = pct.tag_id
  join person_tags pt on pt.tag_name = t.name
  group by pct.card_id
)
update public.project_cards pc
set assignees = (
  select array_agg(distinct person order by person)
  from unnest(pc.assignees || ca.assignees) as person
)
from card_assignees ca
where ca.card_id = pc.id;

with person_tags(tag_name, assignee_name) as (
  values
    ('Haoさん', 'Hao'),
    ('寧さん', '寧'),
    ('梅澤', '梅澤')
),
task_assignees as (
  select
    mtt.mini_task_id,
    array_agg(distinct pt.assignee_name order by pt.assignee_name) as assignees
  from public.mini_task_tags mtt
  join public.tags t on t.id = mtt.tag_id
  join person_tags pt on pt.tag_name = t.name
  group by mtt.mini_task_id
)
update public.mini_tasks mt
set assignees = (
  select array_agg(distinct person order by person)
  from unnest(mt.assignees || ta.assignees) as person
)
from task_assignees ta
where ta.mini_task_id = mt.id;

delete from public.project_card_tags pct
using public.tags t
where pct.tag_id = t.id
  and t.name in ('Haoさん', '寧さん', '梅澤');

delete from public.mini_task_tags mtt
using public.tags t
where mtt.tag_id = t.id
  and t.name in ('Haoさん', '寧さん', '梅澤');

delete from public.tags t
where t.name in ('Haoさん', '寧さん', '梅澤')
  and not exists (
    select 1 from public.project_card_tags pct where pct.tag_id = t.id
  )
  and not exists (
    select 1 from public.mini_task_tags mtt where mtt.tag_id = t.id
  )
  and not exists (
    select 1 from public.qa_log_tags qlt where qlt.tag_id = t.id
  );
