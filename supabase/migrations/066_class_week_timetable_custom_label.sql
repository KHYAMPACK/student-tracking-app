-- Weekly timetable: let a cell hold a free-text activity ("Soru Çözümü", "Ödev", …) instead of
-- one of the fixed subjects. A custom cell uses subject_slug = 'custom' plus custom_label; it still
-- occupies one of the 4 slots. Attendance never reads this table to decide what a teacher may log
-- (save_atlas_lesson_attendance ignores it), so custom cells need no change there.
--
-- Run this BEFORE deploying the client that selects custom_label, or every timetable read fails.

alter table public.class_week_timetable
  add column if not exists custom_label text;

alter table public.class_week_timetable
  drop constraint if exists class_week_timetable_subject_check;

alter table public.class_week_timetable
  add constraint class_week_timetable_subject_check check (
    (
      subject_slug in ('matematik', 'turkce', 'fen', 'sosyal', 'ingilizce', 'din')
      and custom_label is null
    )
    or (
      subject_slug = 'custom'
      and custom_label is not null
      and char_length(btrim(custom_label)) between 1 and 40
    )
  );

notify pgrst, 'reload schema';
