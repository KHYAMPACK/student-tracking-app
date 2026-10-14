-- Director-only view of how far parents have adopted the app (last login, push enabled).
create or replace function public.get_parent_adoption()
returns table (parent_id uuid, last_sign_in_at timestamptz, has_push boolean)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_director() then
    raise exception 'Bu işlem için yetkiniz bulunmuyor.';
  end if;

  return query
  select p.id, u.last_sign_in_at, (p.web_push_subscription is not null)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'parent'
    and p.school_id = (select me.school_id from public.profiles me where me.id = auth.uid());
end;
$$;

revoke all on function public.get_parent_adoption() from public, anon;
grant execute on function public.get_parent_adoption() to authenticated;
notify pgrst, 'reload schema';
