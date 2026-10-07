-- 1) Çift işaretli cevap: yayınevi bunu YANLIŞ sayar (boş değil). Öğrenci cevabı olarak '*' saklanır.
alter table public.exam_student_answers
  drop constraint if exists exam_student_answers_choice_check;
alter table public.exam_student_answers
  add constraint exam_student_answers_choice_check
  check (choice is null or choice in ('A', 'B', 'C', 'D', 'E', '*'));

-- 2) LGS puanı: yayınevi puanı sabit katsayılarla hesaplıyor:
--    puan = base + Σ (ders neti × katsayı)  (tam doğru = 500).
--    8.SINIF TG GELİŞİM VE DEĞERLENDİRME-1 sonuç listesindeki 13 öğrenciye birebir uyuyor (hata 0.000).
--    Katsayılar deneme başına exam_sessions.score_coefficients içinde tutulur; boşsa aşağıdaki varsayılan kullanılır.
alter table public.exam_sessions
  add column if not exists score_coefficients jsonb;

alter table public.exam_session_rankings
  alter column lgs_score type numeric(8, 3);

create or replace function public.exam_default_score_coefficients()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select '{"base": 200, "turkce": 3.9, "inkilap": 1.8, "din": 1.7, "ingilizce": 1.5, "matematik": 4.9, "fen": 3.7}'::jsonb;
$$;

-- 3) Sıralama artık net değil puana göre (eşitlikte net). Puan: ders netleri × katsayılar.
--    Ders kırılımı olmayan eski toplam-net kayıtları eski tahmini formülle (net × 5.95 + 10) devam eder.
create or replace function public.compute_exam_rankings(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_school_id uuid;
  v_coef jsonb;
begin
  select es.school_id, coalesce(es.score_coefficients, public.exam_default_score_coefficients())
  into v_school_id, v_coef
  from public.exam_sessions es
  where es.id = p_session_id;

  if v_school_id is null then
    raise exception 'Sınav oturumu bulunamadı.';
  end if;

  delete from public.exam_session_rankings where session_id = p_session_id;

  insert into public.exam_session_rankings (
    session_id,
    student_id,
    total_net,
    total_correct,
    total_wrong,
    total_blank,
    lgs_score,
    school_rank,
    grade_rank,
    class_rank,
    computed_at
  )
  with subject_totals as (
    select
      esr.session_id,
      esr.student_id,
      coalesce(sum(esr.net), 0)::numeric(6, 2) as total_net,
      coalesce(sum(esr.correct_count), 0)::smallint as total_correct,
      coalesce(sum(esr.wrong_count), 0)::smallint as total_wrong,
      coalesce(sum(esr.blank_count), 0)::smallint as total_blank,
      round(
        (
          coalesce((v_coef ->> 'base')::numeric, 0)
          + coalesce(sum(esr.net * coalesce((v_coef ->> esr.subject_code)::numeric, 0)), 0)
        )::numeric,
        3
      ) as lgs_score
    from public.exam_subject_results esr
    where esr.session_id = p_session_id
    group by esr.session_id, esr.student_id
  ),
  legacy_totals as (
    select
      esr.session_id,
      esr.student_id,
      coalesce(esr.net, 0)::numeric(6, 2) as total_net,
      0::smallint as total_correct,
      0::smallint as total_wrong,
      0::smallint as total_blank,
      round((coalesce(esr.net, 0) * 5.95 + 10)::numeric, 3) as lgs_score
    from public.exam_student_results esr
    where esr.session_id = p_session_id
      and esr.subject is null
      and esr.net is not null
      and not exists (
        select 1 from subject_totals st where st.student_id = esr.student_id
      )
  ),
  totals as (
    select * from subject_totals
    union all
    select * from legacy_totals
  ),
  ranked as (
    select
      t.*,
      rank() over (order by t.lgs_score desc nulls last, t.total_net desc nulls last, t.student_id) as school_rank,
      rank() over (
        partition by st.grade
        order by t.lgs_score desc nulls last, t.total_net desc nulls last, t.student_id
      ) as grade_rank,
      rank() over (
        partition by st.class_id
        order by t.lgs_score desc nulls last, t.total_net desc nulls last, t.student_id
      ) as class_rank
    from totals t
    join public.students st on st.id = t.student_id
    where st.school_id = v_school_id
  )
  select
    session_id,
    student_id,
    total_net,
    total_correct,
    total_wrong,
    total_blank,
    lgs_score,
    school_rank::integer,
    grade_rank::integer,
    class_rank::integer,
    now()
  from ranked;

  insert into public.exam_student_results (session_id, student_id, subject, net, score)
  select
    r.session_id,
    r.student_id,
    null,
    r.total_net,
    r.lgs_score
  from public.exam_session_rankings r
  where r.session_id = p_session_id
  on conflict (session_id, student_id, subject)
  do update set
    net = excluded.net,
    score = excluded.score,
    updated_at = now();
end;
$$;

notify pgrst, 'reload schema';
