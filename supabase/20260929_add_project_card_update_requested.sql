-- Keep update requests separate from the existing "updated" notification flag.
-- Existing project cards are preserved and default to no pending request.

alter table public.project_cards
add column if not exists update_requested boolean not null default false;

comment on column public.project_cards.update_requested is
  'Manual flag used to request that the assignee refresh the project card status.';
