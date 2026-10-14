-- Optional short teacher note per student per lesson (entered on the Sorular screen);
-- parents already read their child's lesson_results rows, so it shows up in the weekly summary.
alter table public.lesson_results
  add column if not exists teacher_note text;

alter table public.lesson_results drop constraint if exists lesson_results_teacher_note_len;
alter table public.lesson_results
  add constraint lesson_results_teacher_note_len
  check (teacher_note is null or char_length(teacher_note) between 1 and 200);

create or replace function public.save_atlas_lesson_activity(
  p_session_id uuid,
  p_lesson_type public.atlas_lesson_type,
  p_assessment_type_id uuid default null,
  p_questions_total integer default null,
  p_results jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sess record;
  rec jsonb;
  v_student_id uuid;
  v_wrong integer;
  v_blank integer;
  v_total integer;
  v_note text;
begin
  select * into v_sess from public.lesson_sessions where id = p_session_id;
  if v_sess.id is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not public.can_edit_atlas_session(p_session_id) then
    raise exception 'Bu oturumu düzenleyemezsiniz.';
  end if;

  if p_lesson_type = 'practice' then
    if p_questions_total is null or p_questions_total < 1 then
      raise exception 'Test için soru sayısı gerekli.';
    end if;
    if p_assessment_type_id is null then
      raise exception 'Değerlendirme türü gerekli.';
    end if;
  end if;

  update public.lesson_sessions
  set lesson_type = p_lesson_type,
      assessment_type_id = case when p_lesson_type = 'practice' then p_assessment_type_id else null end,
      questions_total = case when p_lesson_type = 'practice' then p_questions_total else null end,
      activity_completed_at = now(),
      activity_dismissed_at = null,
      updated_at = now()
  where id = p_session_id;

  delete from public.lesson_results where session_id = p_session_id;

  if p_lesson_type = 'practice' then
    v_total := p_questions_total;
    for rec in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
    loop
      v_student_id := (rec ->> 'student_id')::uuid;
      v_wrong := coalesce((rec ->> 'wrong_count')::integer, 0);
      v_blank := coalesce((rec ->> 'blank_count')::integer, 0);
      v_note := left(nullif(btrim(coalesce(rec ->> 'note', '')), ''), 200);
      if v_student_id is null then continue; end if;
      if v_wrong + v_blank > v_total then
        raise exception 'Yanlış + boş toplamı soru sayısını aşamaz.';
      end if;
      if not exists (
        select 1 from public.lesson_attendance a
        where a.session_id = p_session_id
          and a.student_id = v_student_id
          and a.status = 'present'
      ) then
        continue;
      end if;
      insert into public.lesson_results (session_id, student_id, wrong_count, blank_count, teacher_note)
      values (p_session_id, v_student_id, v_wrong, v_blank, v_note);
    end loop;
  end if;

  return p_session_id;
end;
$$;

notify pgrst, 'reload schema';
