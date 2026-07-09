-- Link tasks to project cards without changing or deleting existing data.
-- This migration is additive: nullable column + index + best-effort backfill.

alter table public.mini_tasks
add column if not exists source_project_card_id uuid null references public.project_cards(id) on delete set null;

create index if not exists mini_tasks_source_project_card_id_idx
on public.mini_tasks(source_project_card_id);

comment on column public.mini_tasks.source_project_card_id is
  'Optional project card linked to this task. Null means the task is standalone.';

-- Backfill tasks that were generated from project card bodies and include "元施策: <title>".
update public.mini_tasks mt
set source_project_card_id = pc.id
from public.project_cards pc
where mt.source_project_card_id is null
  and mt.body like '元施策: ' || pc.title || '%';
