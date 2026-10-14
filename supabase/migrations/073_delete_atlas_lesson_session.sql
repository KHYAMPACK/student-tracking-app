-- A teacher may delete a lesson session she can edit (attendance and question results go with it);
-- a director may delete any. The time window is enforced in the app, like corrections.
create or replace function public.delete_atlas_lesson_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.lesson_sessions where id = p_session_id) then
    raise exception 'Oturum bulunamadı.';
  end if;
  if not public.can_edit_atlas_session(p_session_id) then
    raise exception 'Bu oturumu silemezsiniz.';
  end if;
  delete from public.lesson_sessions where id = p_session_id;
end;
$$;

grant execute on function public.delete_atlas_lesson_session(uuid) to authenticated;
notify pgrst, 'reload schema';
