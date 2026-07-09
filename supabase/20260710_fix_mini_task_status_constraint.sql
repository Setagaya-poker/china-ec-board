-- Safely update mini task status values and their check constraint.
-- This does not delete rows. It only relaxes the old check first, normalizes values,
-- then applies the new allowed status set.

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.mini_tasks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.mini_tasks drop constraint %I', constraint_record.conname);
  end loop;
end $$;

update public.mini_tasks
set status = case
  when status in ('検討中', '準備中') then '未着手'
  when status = '実行中' then '実施中'
  else status
end
where status in ('検討中', '準備中', '実行中');

alter table public.mini_tasks
add constraint mini_tasks_status_check
check (status in ('未着手', '実施中', '完了'));
