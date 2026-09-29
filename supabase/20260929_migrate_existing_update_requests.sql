-- Before update_requested existed, update_flag was temporarily used for
-- update requests. Move those existing requests to the dedicated column so
-- they keep the same meaning after the UI restores update_flag to "updated".

update public.project_cards
set update_requested = true,
    update_flag = false
where update_flag = true
  and update_requested = false;
