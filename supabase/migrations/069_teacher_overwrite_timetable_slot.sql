-- Teachers may now replace a planned weekly-timetable cell with their own branş
-- (p_overwrite = true). Without it the function still only fills empty cells.
drop function if exists public.fill_empty_timetable_slot(uuid, integer, smallint, smallint);

create or replace function public.fill_empty_timetable_slot(
  p_class_id uuid,
  p_week_index integer,
  p_weekday smallint,
  p_slot_index smallint,
  p_overwrite boolean default false
)
returns public.class_week_timetable
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_school_id uuid;
  v_caller_school uuid;
  v_subject_slug text;
  v_subject_id uuid;
  v_row public.class_week_timetable;
begin
  if p_weekday is null or p_weekday < 1 or p_weekday > 5 then
    raise exception 'Gün Pazartesi-Cuma arasında olmalı.';
  end if;
  if p_slot_index is null or p_slot_index < 1 or p_slot_index > 4 then
    raise exception 'Ders saati 1-4 arasında olmalı.';
  end if;
  if p_week_index is null then
    raise exception 'Hafta bilgisi gerekli.';
  end if;

  select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  if v_school_id is null then
    raise exception 'Şube bulunamadı.';
  end if;

  select p.school_id, p.subject_slug into v_caller_school, v_subject_slug
  from public.profiles p where p.id = auth.uid();

  if v_caller_school is distinct from v_school_id then
    raise exception 'Bu işlem için yetkiniz bulunmuyor.';
  end if;
  if v_subject_slug is null then
    raise exception 'Branşınız tanımlı değil, program otomatik doldurulamıyor.';
  end if;

  v_subject_id := public.resolve_subject_for_class(v_subject_slug, p_class_id);
  if v_subject_id is null then
    raise exception 'Branşınız bu şubenin sınıf düzeyine uymuyor.';
  end if;
  if not public.is_director() and not public.teacher_teaches_class_subject(p_class_id, v_subject_id) then
    raise exception 'Bu şube için yetkiniz yok.';
  end if;

  if p_overwrite then
    insert into public.class_week_timetable (school_id, class_id, week_index, weekday, slot_index, subject_slug)
    values (v_school_id, p_class_id, p_week_index, p_weekday, p_slot_index, v_subject_slug)
    on conflict (school_id, class_id, week_index, weekday, slot_index)
    do update set subject_slug = excluded.subject_slug
    returning * into v_row;
  else
    insert into public.class_week_timetable (school_id, class_id, week_index, weekday, slot_index, subject_slug)
    values (v_school_id, p_class_id, p_week_index, p_weekday, p_slot_index, v_subject_slug)
    on conflict (school_id, class_id, week_index, weekday, slot_index) do nothing
    returning * into v_row;
    if v_row.id is null then
      raise exception 'Bu ders saati az önce dolduruldu. Program yenileniyor.';
    end if;
  end if;

  return v_row;
end;
$$;

notify pgrst, 'reload schema';
