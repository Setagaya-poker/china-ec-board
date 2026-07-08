-- Step 2: add an optional due date to existing project cards.
-- This migration is additive and keeps all existing rows.

alter table public.project_cards
add column if not exists due_date date null;

comment on column public.project_cards.due_date is 'Optional due date for a project card. Null means no due date.';
