-- TKA SMP Diagnostic -> Drill V1
-- Publishes the reviewed TKA SMP question bank through the existing workflow guard,
-- configures one freemium DRILL exam per subject, and refreshes mastery after a
-- generic drill attempt is completed.

do $migration$
declare
  v_program_id uuid;
  v_track_id uuid;
  v_drill_type_id uuid;
  v_drill_feature_id uuid;
  v_created_by uuid;
  v_subject_id uuid;
  v_exam_id uuid;
  v_total_questions integer;
  v_pending_reviews integer;
  v_target_nodes integer;
  v_underfilled_nodes integer;
begin
  select p.id, t.id
    into v_program_id, v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_program_id is null or v_track_id is null then
    raise exception 'TKA SMP track not found';
  end if;

  select et.id into v_drill_type_id
  from public.exam_types et
  where upper(et.code) = 'DRILL'
  limit 1;

  if v_drill_type_id is null then
    raise exception 'DRILL exam type not found';
  end if;

  select f.id into v_drill_feature_id
  from public.features f
  where f.code = 'tka.smp.drill.unlimited'
  limit 1;

  if v_drill_feature_id is null then
    raise exception 'TKA SMP drill entitlement feature not found';
  end if;

  select e.created_by into v_created_by
  from public.exams e
  where e.slug = 'tka-smp-diagnostic-awal'
    and e.program_id = v_program_id
    and e.track_id = v_track_id
  limit 1;

  if v_created_by is null then
    raise exception 'TKA SMP diagnostic creator not found';
  end if;

  select count(*)::integer into v_total_questions
  from public.questions q
  where q.program_id = v_program_id
    and q.track_id = v_track_id
    and lower(q.status) in ('approved', 'published');

  if v_total_questions <> 300 then
    raise exception 'TKA SMP publish gate blocked: expected 300 reviewed questions, got %', v_total_questions;
  end if;

  select count(*)::integer into v_pending_reviews
  from public.content_reviews cr
  join public.questions q
    on cr.entity_type = 'question'
   and cr.entity_id = q.id
  where q.program_id = v_program_id
    and q.track_id = v_track_id
    and lower(q.status) = 'approved'
    and lower(cr.status) = 'pending';

  if v_pending_reviews <> 0 then
    raise exception 'TKA SMP publish gate blocked: % pending content reviews remain', v_pending_reviews;
  end if;

  -- approved -> published is the canonical reviewed-content transition. The
  -- workflow action flag keeps the existing guard active and audit trigger runs.
  perform set_config('app.workflow_action', 'publish', true);
  update public.questions q
     set status = 'published',
         reviewer_id = null,
         published_at = coalesce(q.published_at, now()),
         updated_at = now()
   where q.program_id = v_program_id
     and q.track_id = v_track_id
     and lower(q.status) = 'approved';

  -- The seven diagnostic competency/element nodes must each have at least ten
  -- published questions before focused drill can be enabled.
  with target_nodes as (
    select kn.id
    from public.knowledge_nodes kn
    join public.subjects s on s.id = kn.subject_id
    where s.track_id = v_track_id
      and lower(kn.status) = 'active'
      and (
        (upper(s.code) = 'BIN' and lower(kn.node_type) = 'competency')
        or
        (upper(s.code) = 'MAT' and lower(kn.node_type) = 'element')
      )
      and kn.name in (
        'Pemahaman Tekstual',
        'Pemahaman Inferensial',
        'Evaluasi dan Apresiasi',
        'Bilangan',
        'Aljabar',
        'Geometri dan Pengukuran',
        'Data dan Peluang'
      )
  ), counts as (
    select
      tn.id,
      count(distinct q.id)::integer as question_count
    from target_nodes tn
    left join public.knowledge_node_paths knp on knp.ancestor_id = tn.id
    left join public.question_knowledge_nodes qkn
      on qkn.knowledge_node_id = knp.descendant_id
     and lower(qkn.relation_type) = 'primary'
    left join public.questions q
      on q.id = qkn.question_id
     and q.track_id = v_track_id
     and lower(q.status) = 'published'
    group by tn.id
  )
  select
    count(*)::integer,
    count(*) filter (where question_count < 10)::integer
  into v_target_nodes, v_underfilled_nodes
  from counts;

  if v_target_nodes <> 7 then
    raise exception 'TKA SMP drill gate blocked: expected 7 target nodes, got %', v_target_nodes;
  end if;

  if v_underfilled_nodes <> 0 then
    raise exception 'TKA SMP drill gate blocked: % target nodes have fewer than 10 published questions', v_underfilled_nodes;
  end if;

  -- Bahasa Indonesia: one free focused-drill attempt, then Tempur Pass unlocks
  -- unlimited attempts through tka.smp.drill.unlimited.
  select s.id into v_subject_id
  from public.subjects s
  where s.track_id = v_track_id and upper(s.code) = 'BIN'
  limit 1;

  if v_subject_id is null then raise exception 'TKA SMP BIN subject not found'; end if;

  insert into public.exams (
    program_id, track_id, exam_type_id, title, slug, description,
    duration_seconds, attempt_limit, question_order, result_visibility,
    access_type, status, created_by, required_feature_id, token_cost
  ) values (
    v_program_id, v_track_id, v_drill_type_id,
    'Latihan Fokus Bahasa Indonesia TKA SMP',
    'tka-smp-drill-bahasa-indonesia',
    'Latihan 10 soal yang dipilih dinamis dari kompetensi Bahasa Indonesia prioritas.',
    900, 1, 'random', 'instant', 'FREEMIUM', 'active',
    v_created_by, v_drill_feature_id, 0
  )
  on conflict (slug) do update set
    exam_type_id = excluded.exam_type_id,
    duration_seconds = excluded.duration_seconds,
    attempt_limit = excluded.attempt_limit,
    question_order = excluded.question_order,
    result_visibility = excluded.result_visibility,
    access_type = excluded.access_type,
    status = excluded.status,
    required_feature_id = excluded.required_feature_id,
    token_cost = excluded.token_cost,
    updated_at = now()
  returning id into v_exam_id;

  if not exists (
    select 1 from public.exam_sections es
    where es.exam_id = v_exam_id and es.subject_id = v_subject_id
  ) then
    insert into public.exam_sections (
      exam_id, subject_id, title, sort_order, question_count, duration_seconds, config
    ) values (
      v_exam_id, v_subject_id, 'Bahasa Indonesia', 1, 10, 900, '{}'::jsonb
    );
  end if;

  -- Matematika.
  select s.id into v_subject_id
  from public.subjects s
  where s.track_id = v_track_id and upper(s.code) = 'MAT'
  limit 1;

  if v_subject_id is null then raise exception 'TKA SMP MAT subject not found'; end if;

  insert into public.exams (
    program_id, track_id, exam_type_id, title, slug, description,
    duration_seconds, attempt_limit, question_order, result_visibility,
    access_type, status, created_by, required_feature_id, token_cost
  ) values (
    v_program_id, v_track_id, v_drill_type_id,
    'Latihan Fokus Matematika TKA SMP',
    'tka-smp-drill-matematika',
    'Latihan 10 soal yang dipilih dinamis dari elemen Matematika prioritas.',
    900, 1, 'random', 'instant', 'FREEMIUM', 'active',
    v_created_by, v_drill_feature_id, 0
  )
  on conflict (slug) do update set
    exam_type_id = excluded.exam_type_id,
    duration_seconds = excluded.duration_seconds,
    attempt_limit = excluded.attempt_limit,
    question_order = excluded.question_order,
    result_visibility = excluded.result_visibility,
    access_type = excluded.access_type,
    status = excluded.status,
    required_feature_id = excluded.required_feature_id,
    token_cost = excluded.token_cost,
    updated_at = now()
  returning id into v_exam_id;

  if not exists (
    select 1 from public.exam_sections es
    where es.exam_id = v_exam_id and es.subject_id = v_subject_id
  ) then
    insert into public.exam_sections (
      exam_id, subject_id, title, sort_order, question_count, duration_seconds, config
    ) values (
      v_exam_id, v_subject_id, 'Matematika', 1, 10, 900, '{}'::jsonb
    );
  end if;
end;
$migration$;

-- Generic Schema V2 practice completion updates exam_attempts directly. Keep the
-- TKA projection refresh in the database so every completed focused drill gets
-- the same deterministic mastery/recommendation update regardless of UI caller.
create or replace function app_private.refresh_tka_smp_drill_projection_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_program_code text;
  v_track_code text;
  v_exam_type_code text;
begin
  if lower(coalesce(new.status, '')) <> 'completed'
     or lower(coalesce(old.status, '')) = 'completed'
     or lower(coalesce(new.metadata ->> 'practiceKind', '')) <> 'drill' then
    return new;
  end if;

  select p.code, t.code, et.code
    into v_program_code, v_track_code, v_exam_type_code
  from public.exams e
  join public.programs p on p.id = e.program_id
  join public.tracks t on t.id = e.track_id
  join public.exam_types et on et.id = e.exam_type_id
  where e.id = new.exam_id;

  if upper(coalesce(v_program_code, '')) = 'TKA'
     and upper(coalesce(v_track_code, '')) = 'SMP'
     and upper(coalesce(v_exam_type_code, '')) = 'DRILL' then
    perform app_private.refresh_tka_smp_learning_projection_for_user(new.user_id, new.id);
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_tka_smp_drill_projection_after_attempt on public.exam_attempts;
create trigger trg_tka_smp_drill_projection_after_attempt
after update of status on public.exam_attempts
for each row
execute function app_private.refresh_tka_smp_drill_projection_after_attempt();