-- Free-text class homework: one row per class, rows given together share a batch_id.
-- Read-only for parents; any teacher or the director can assign to any class of the school.
create table if not exists public.class_homework (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  batch_id      uuid not null,
  class_id      uuid not null references public.classes (id) on delete cascade,
  created_by    uuid not null references public.profiles (id) on delete cascade,
  author_name   text not null default 'Öğretmen',
  subject_label text not null,
  title         text not null,
  description   text not null default '',
  due_on        date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint class_homework_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint class_homework_subject_len check (char_length(btrim(subject_label)) between 1 and 40),
  constraint class_homework_description_len check (char_length(description) <= 2000),
  constraint class_homework_unique_per_batch unique (batch_id, class_id)
);

create index if not exists class_homework_class_idx on public.class_homework (class_id, created_at desc);
create index if not exists class_homework_school_idx on public.class_homework (school_id, created_at desc);
create index if not exists class_homework_creator_idx on public.class_homework (created_by);

alter table public.class_homework enable row level security;

create or replace function public.parent_has_child_in_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.student_parents sp
    join public.students s on s.id = sp.student_id
    where sp.parent_id = auth.uid() and s.class_id = target_class_id
  );
$$;

drop policy if exists "Read class homework" on public.class_homework;
create policy "Read class homework" on public.class_homework for select to authenticated
  using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    and (public.is_staff() or public.parent_has_child_in_class(class_id))
  );

drop policy if exists "Staff insert class homework" on public.class_homework;
create policy "Staff insert class homework" on public.class_homework for insert to authenticated
  with check (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    and created_by = auth.uid()
    and (public.is_director() or public.is_teacher())
    and exists (select 1 from public.classes c where c.id = class_id and c.school_id = class_homework.school_id)
  );

drop policy if exists "Staff update own class homework" on public.class_homework;
create policy "Staff update own class homework" on public.class_homework for update to authenticated
  using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    and (public.is_director() or created_by = auth.uid())
  )
  with check (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    and (public.is_director() or created_by = auth.uid())
  );

drop policy if exists "Staff delete own class homework" on public.class_homework;
create policy "Staff delete own class homework" on public.class_homework for delete to authenticated
  using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    and (public.is_director() or created_by = auth.uid())
  );

-- Parent notifications for class homework (deduped per homework row)
alter table public.parent_notifications
  add column if not exists class_homework_id uuid references public.class_homework (id) on delete cascade;

create unique index if not exists parent_notifications_class_homework_unique_idx
  on public.parent_notifications (parent_id, student_id, kind, class_homework_id)
  where kind = 'class_homework' and class_homework_id is not null;

notify pgrst, 'reload schema';
