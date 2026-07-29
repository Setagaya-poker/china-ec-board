-- Add an optional manual update flag to project cards.
-- Existing cards default to false, and no existing data is deleted or overwritten.

alter table public.project_cards
add column if not exists update_flag boolean not null default false;

comment on column public.project_cards.update_flag is
  'Manual flag used to show that a project card has an update the team should notice.';
