-- Rehberlik becomes a real lesson: it can be planned in the weekly timetable and a teacher whose
-- branş is Rehberlik can take attendance for it (lesson_sessions needs a curriculum subject).
insert into public.curriculum_subjects (grade, slug, name, color, icon, sort_order)
select g.grade, 'rehberlik', 'Rehberlik', '#7c3aed', 'child', 99
from (values (5), (6), (7), (8)) as g(grade)
on conflict (grade, slug) do nothing;

alter table public.class_week_timetable drop constraint if exists class_week_timetable_subject_check;
alter table public.class_week_timetable add constraint class_week_timetable_subject_check check (
  (
    subject_slug = any (array['matematik', 'turkce', 'fen', 'sosyal', 'ingilizce', 'din', 'rehberlik'])
    and custom_label is null
  )
  or (
    subject_slug = 'custom'
    and custom_label is not null
    and char_length(btrim(custom_label)) between 1 and 40
  )
);

notify pgrst, 'reload schema';
