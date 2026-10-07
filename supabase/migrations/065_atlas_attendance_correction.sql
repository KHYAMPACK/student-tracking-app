-- Atlas yoklama düzeltme (correction of an already-saved slot).
--
-- save_atlas_lesson_attendance previously had two problems for corrections:
--   1. When the slot already existed and the caller could not edit it, the upsert's
--      "where can_edit_atlas_session(...)" returned no row, the function re-selected the
--      existing session id instead of failing, and then wiped and rewrote that slot's
--      lesson_attendance — so a non-owner could overwrite another teacher's attendance.
--   2. p_session_id (the edit path) only matched sessions the caller personally took, so a
--      director fell through to the insert/upsert branch, which also re-assigns taken_by
--      and subject_id to the director.
--
-- Now: with p_session_id the session must match class/date/slot and pass
-- can_edit_atlas_session (owner or director) or the call fails; a correction only touches
-- updated_at (taken_by, subject and unit stay as originally recorded); without
-- p_session_id a slot that exists and is not editable by the caller raises instead of
-- being overwritten. lesson_results rows of students who end up not "present" are removed,
-- since save_atlas_lesson_activity only ever records results for present students.

create or replace function public.save_atlas_lesson_attendance(
  p_class_id uuid,
  p_subject_id uuid,
  p_session_date date,
  p_slot_index smallint,
  p_week_index integer,
  p_unit_id uuid,
  p_records jsonb,
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_school_id uuid;
  v_caller_school uuid;
  v_session_id uuid;
  rec jsonb;
  v_student_id uuid;
  v_status text;
begin
  if p_session_date is null or p_slot_index is null then
    raise exception 'Tarih ve ders saati gerekli.';
  end if;

  if p_slot_index < 1 or p_slot_index > 4 then
    raise exception 'Ders saati 1–4 arasında olmalı.';
  end if;

  if p_week_index is null then
    raise exception 'Hafta bilgisi gerekli.';
  end if;

  if p_records is null or jsonb_typeof(p_records) is distinct from 'array' then
    raise exception 'Yoklama listesi gerekli.';
  end if;

  select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  if v_school_id is null then
    raise exception 'Şube bulunamadı.';
  end if;

  if not public.school_has_atlas_schedule(v_school_id) then
    raise exception 'Atlas ders modu bu okul için etkin değil.';
  end if;

  select p.school_id into v_caller_school from public.profiles p where p.id = auth.uid();
  if v_caller_school is distinct from v_school_id then
    raise exception 'Bu işlem için yetkiniz bulunmuyor.';
  end if;

  if not public.is_director() then
    if not public.teacher_can_log_atlas_session(p_class_id, p_subject_id) then
      raise exception 'Bu şube ve ders için yetkiniz yok. Müdürden branş ataması isteyin.';
    end if;
  end if;

  if p_session_id is not null then
    select s.id into v_session_id
    from public.lesson_sessions s
    where s.id = p_session_id
      and s.class_id = p_class_id
      and s.session_date = p_session_date
      and s.slot_index = p_slot_index;

    if v_session_id is null then
      raise exception 'Oturum bulunamadı.';
    end if;

    if not public.can_edit_atlas_session(v_session_id) then
      raise exception 'Bu oturumu düzenleyemezsiniz.';
    end if;

    update public.lesson_sessions
    set updated_at = now()
    where id = v_session_id;
  else
    insert into public.lesson_sessions (
      school_id, class_id, subject_id, slot_index, session_date,
      taken_by, week_index, unit_id
    )
    values (
      v_school_id, p_class_id, p_subject_id, p_slot_index, p_session_date,
      auth.uid(), p_week_index, p_unit_id
    )
    on conflict (class_id, session_date, slot_index)
    do update set
      subject_id = excluded.subject_id,
      taken_by = excluded.taken_by,
      week_index = excluded.week_index,
      unit_id = excluded.unit_id,
      updated_at = now()
    where public.can_edit_atlas_session(lesson_sessions.id)
    returning id into v_session_id;

    if v_session_id is null then
      raise exception 'Bu ders saati doldurulmuş veya düzenlenemiyor.';
    end if;
  end if;

  delete from public.lesson_attendance where session_id = v_session_id;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_student_id := (rec ->> 'student_id')::uuid;
    v_status := rec ->> 'status';
    if v_student_id is null or v_status is null then
      continue;
    end if;
    insert into public.lesson_attendance (session_id, student_id, status)
    values (v_session_id, v_student_id, v_status::public.attendance_status);
  end loop;

  delete from public.lesson_results r
  where r.session_id = v_session_id
    and not exists (
      select 1
      from public.lesson_attendance a
      where a.session_id = v_session_id
        and a.student_id = r.student_id
        and a.status = 'present'
    );

  return v_session_id;
end;
$$;

notify pgrst, 'reload schema';
