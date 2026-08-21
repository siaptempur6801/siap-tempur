-- Milestone 2: TKA SMP Mini Tryout core.
--
-- This migration intentionally reuses the authenticated section/RPC engine that
-- already powers the TKA SMP Full Tryout. It removes the Full-only 60-question
-- assumption, makes state totals dynamic, freezes two 15-question Mini sets from
-- the already-reviewed Full Tryout pool, and activates the Mini exam records.
--
-- Safety:
-- - Abort if either Mini exam already has attempts. We do not silently replace a
--   frozen question set after learners have started using it.
-- - Every section must declare a positive question_count.
-- - Static item counts must match the declared section counts exactly.
-- - Every item must belong to a section of the same exam and have an exact
--   question_versions snapshot.
-- - The user-facing RPC remains authenticated, SECURITY DEFINER, and guarded by
--   active profile + active user_track + attempt limit checks.

create or replace function app_private.start_exam_attempt_for_user(p_exam_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid := gen_random_uuid();
  v_attempt_number integer;
  v_attempt_limit integer;
  v_exam_status text;
  v_track_id uuid;
  v_item_count integer;
  v_expected_count integer;
  v_section_count integer;
  v_first_section uuid;
  v_seed text;
  v_existing_attempt_id uuid;
  v_existing_attempt_number integer;
begin
  if not exists(select 1 from public.profiles where id=p_user_id and status='active') then
    raise exception 'Active user profile not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text,0));

  select status,attempt_limit,track_id into v_exam_status,v_attempt_limit,v_track_id
  from public.exams where id=p_exam_id;
  if not found then raise exception 'Exam not found'; end if;
  if v_exam_status <> 'active' then raise exception 'Exam is not active'; end if;

  if not exists(
    select 1 from public.user_tracks
    where user_id=p_user_id and track_id=v_track_id and status='active'
  ) then
    raise exception 'Active user track required';
  end if;

  -- Idempotency guard: concurrent/double-click starts return the same active attempt.
  select ea.id,ea.attempt_number
    into v_existing_attempt_id,v_existing_attempt_number
  from public.exam_attempts ea
  where ea.exam_id=p_exam_id and ea.user_id=p_user_id and ea.status='in_progress'
  order by ea.attempt_number desc
  limit 1;

  if v_existing_attempt_id is not null then
    select ass.section_id into v_first_section
    from public.attempt_section_states ass
    join public.exam_sections es on es.id=ass.section_id
    where ass.attempt_id=v_existing_attempt_id and ass.status='active'
    order by es.sort_order limit 1;

    return jsonb_build_object(
      'attempt_id',v_existing_attempt_id,
      'attempt_number',v_existing_attempt_number,
      'status','in_progress',
      'active_section_id',v_first_section,
      'resumed',true
    );
  end if;

  select count(*),coalesce(sum(es.question_count),0)
    into v_section_count,v_expected_count
  from public.exam_sections es
  where es.exam_id=p_exam_id;

  if v_section_count = 0 or v_expected_count <= 0 then
    raise exception 'Exam must declare at least one section with a positive question count';
  end if;

  if exists(
    select 1 from public.exam_sections es
    where es.exam_id=p_exam_id and coalesce(es.question_count,0) <= 0
  ) then
    raise exception 'Every exam section must declare a positive question count';
  end if;

  select count(*) into v_item_count
  from public.exam_question_items where exam_id=p_exam_id;

  if v_item_count <> v_expected_count then
    raise exception 'Exam item count mismatch: expected %, got %',v_expected_count,v_item_count;
  end if;

  if exists(
    select 1
    from public.exam_sections es
    left join public.exam_question_items eqi
      on eqi.section_id=es.id and eqi.exam_id=p_exam_id
    where es.exam_id=p_exam_id
    group by es.id,es.question_count
    having count(eqi.id) <> es.question_count
  ) then
    raise exception 'Exam section item count does not match section question_count';
  end if;

  if exists(
    select 1
    from public.exam_question_items eqi
    left join public.exam_sections es on es.id=eqi.section_id
    where eqi.exam_id=p_exam_id
      and (eqi.section_id is null or es.exam_id is distinct from p_exam_id)
  ) then
    raise exception 'Every exam item must belong to a section of the same exam';
  end if;

  if exists(
    select 1
    from public.exam_question_items eqi
    left join public.question_versions qv
      on qv.question_id=eqi.question_id and qv.version=eqi.question_version
    where eqi.exam_id=p_exam_id and qv.question_id is null
  ) then
    raise exception 'Every exam item must reference an existing frozen question version';
  end if;

  select coalesce(max(attempt_number),0)+1 into v_attempt_number
  from public.exam_attempts where exam_id=p_exam_id and user_id=p_user_id;

  if v_attempt_limit is not null and v_attempt_number > v_attempt_limit then
    raise exception 'Attempt limit reached';
  end if;

  v_seed := v_attempt_id::text;

  insert into public.exam_attempts(
    id,exam_id,user_id,attempt_number,status,started_at,metadata,created_at,updated_at
  ) values (
    v_attempt_id,p_exam_id,p_user_id,v_attempt_number,'in_progress',now(),
    jsonb_build_object(
      'orderSeed',v_seed,
      'engineVersion','tka-section-rpc-v2',
      'questionCount',v_expected_count
    ),now(),now()
  );

  with s as (
    select es.*, row_number() over(order by es.sort_order,es.id) rn
    from public.exam_sections es where es.exam_id=p_exam_id
  )
  insert into public.attempt_section_states(
    attempt_id,section_id,status,started_at,deadline_at,created_at,updated_at
  )
  select v_attempt_id,id,
         case when rn=1 then 'active' else 'locked' end,
         case when rn=1 then now() else null end,
         case when rn=1 then now() + make_interval(secs=>coalesce(duration_seconds,0)) else null end,
         now(),now()
  from s;

  select ass.section_id into v_first_section
  from public.attempt_section_states ass
  join public.exam_sections es on es.id=ass.section_id
  where ass.attempt_id=v_attempt_id and ass.status='active'
  order by es.sort_order limit 1;

  with base as (
    select eqi.question_id,eqi.question_version,eqi.section_id,es.sort_order,
           qv.snapshot,
           row_number() over(order by es.sort_order,md5(v_seed || ':' || eqi.question_id::text)) as pos
    from public.exam_question_items eqi
    join public.exam_sections es on es.id=eqi.section_id and es.exam_id=eqi.exam_id
    join public.question_versions qv
      on qv.question_id=eqi.question_id and qv.version=eqi.question_version
    where eqi.exam_id=p_exam_id
  ), enhanced as (
    select b.*,
      jsonb_set(
        b.snapshot,
        '{options}',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id',qo.id,'option_key',qo.option_key,'content',qo.content,
              'is_correct',qo.is_correct,'score',qo.score,'sort_order',qo.sort_order,
              'image_url',qo.image_url,'response_group',qo.response_group,
              'response_group_order',qo.response_group_order,'metadata',qo.metadata
            ) order by qo.sort_order
          )
          from public.question_options qo where qo.question_id=b.question_id
        ),'[]'::jsonb),
        true
      ) as frozen_snapshot
    from base b
  )
  insert into public.attempt_questions(
    attempt_id,question_id,question_version,position,section_id,question_snapshot,max_score
  )
  select v_attempt_id,question_id,question_version,pos,section_id,frozen_snapshot,1
  from enhanced;

  insert into public.attempt_events(attempt_id,event_type,metadata)
  values(v_attempt_id,'attempt_started',jsonb_build_object(
    'attemptNumber',v_attempt_number,
    'activeSectionId',v_first_section,
    'questionCount',v_expected_count
  ));

  return jsonb_build_object(
    'attempt_id',v_attempt_id,
    'attempt_number',v_attempt_number,
    'status','in_progress',
    'active_section_id',v_first_section,
    'resumed',false
  );
end;
$$;

create or replace function app_private.get_exam_attempt_state_for_user(p_user_id uuid,p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.exam_attempts%rowtype;
  v_active_section uuid;
  v_sections jsonb;
  v_questions jsonb;
  v_answered integer;
  v_total_questions integer;
begin
  select * into v_attempt from public.exam_attempts where id=p_attempt_id and user_id=p_user_id;
  if not found then raise exception 'Attempt not found'; end if;

  select section_id into v_active_section from public.attempt_section_states
  where attempt_id=p_attempt_id and status='active' limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sectionId',ass.section_id,'title',es.title,'subjectCode',s.code,'sortOrder',es.sort_order,
    'status',ass.status,'questionCount',es.question_count,'durationSeconds',es.duration_seconds,
    'startedAt',ass.started_at,'deadlineAt',ass.deadline_at,
    'remainingSeconds',case when ass.status='active' and ass.deadline_at is not null then greatest(0,floor(extract(epoch from (ass.deadline_at-now())))::integer) when ass.status='completed' then 0 else null end,
    'durationUsedSeconds',ass.duration_used_seconds
  ) order by es.sort_order),'[]'::jsonb) into v_sections
  from public.attempt_section_states ass
  join public.exam_sections es on es.id=ass.section_id
  left join public.subjects s on s.id=es.subject_id
  where ass.attempt_id=p_attempt_id;

  if v_active_section is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'attemptQuestionId',aq.id,'position',aq.position,
      'question',aq.question_snapshot->'question',
      'stimulus',aq.question_snapshot->'stimulus',
      'knowledgeNodes',aq.question_snapshot->'knowledge_nodes',
      'options',coalesce((select jsonb_agg(o - 'is_correct' - 'score' order by (o->>'sort_order')::integer) from jsonb_array_elements(aq.question_snapshot->'options') o),'[]'::jsonb),
      'answer',jsonb_build_object(
        'selectedOptionId',aa.selected_option_id,
        'selectedOptionIds',coalesce((select jsonb_agg(aao.option_id) from public.attempt_answer_options aao where aao.attempt_answer_id=aa.id),'[]'::jsonb),
        'answerValue',aa.answer_value,'isFlagged',coalesce(aa.is_flagged,false),'timeSpentSeconds',coalesce(aa.time_spent_seconds,0)
      )
    ) order by aq.position),'[]'::jsonb) into v_questions
    from public.attempt_questions aq
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    where aq.attempt_id=p_attempt_id and aq.section_id=v_active_section;
  else
    v_questions := '[]'::jsonb;
  end if;

  select count(*) into v_answered
  from public.attempt_answers aa
  join public.attempt_questions aq on aq.id=aa.attempt_question_id
  where aq.attempt_id=p_attempt_id;

  select count(*) into v_total_questions
  from public.attempt_questions aq
  where aq.attempt_id=p_attempt_id;

  return jsonb_build_object(
    'attemptId',v_attempt.id,'examId',v_attempt.exam_id,'status',v_attempt.status,
    'attemptNumber',v_attempt.attempt_number,'startedAt',v_attempt.started_at,
    'activeSectionId',v_active_section,'answeredCount',v_answered,'totalQuestions',v_total_questions,
    'sections',v_sections,'questions',v_questions
  );
end;
$$;

-- Do not replace frozen Mini items after learners have started an attempt.
do $$
begin
  if exists(
    select 1
    from public.exam_attempts ea
    join public.exams e on e.id=ea.exam_id
    where e.slug in ('tka-smp-mini-bahasa-indonesia','tka-smp-mini-matematika')
  ) then
    raise exception 'TKA SMP Mini exams already have attempts; frozen item replacement is blocked';
  end if;
end;
$$;

-- Final Milestone 2 Mini product spec:
-- 15 questions / 35 minutes / one free attempt. Monetization remains Milestone 4.
update public.exams e
set duration_seconds=2100,
    attempt_limit=1,
    question_order='randomized',
    result_visibility='instant',
    status='active',
    blueprint_id=(select full.blueprint_id from public.exams full where full.slug='tka-smp-full'),
    description=case e.slug
      when 'tka-smp-mini-bahasa-indonesia' then 'Mini Tryout TKA SMP Bahasa Indonesia: 15 soal / 35 menit, blueprint internal 5 Tekstual + 5 Inferensial + 5 Evaluasi/Apresiasi. Satu percobaan gratis pada Core Product; Tempur Pass diaktifkan pada Milestone 4.'
      when 'tka-smp-mini-matematika' then 'Mini Tryout TKA SMP Matematika: 15 soal / 35 menit, blueprint internal 5 Pengetahuan/Pemahaman + 5 Aplikasi + 5 Penalaran. Satu percobaan gratis pada Core Product; Tempur Pass diaktifkan pada Milestone 4.'
      else e.description
    end,
    updated_at=now()
where e.slug in ('tka-smp-mini-bahasa-indonesia','tka-smp-mini-matematika');

update public.exam_sections es
set question_count=15,
    duration_seconds=2100,
    config=coalesce(es.config,'{}'::jsonb) || case s.code
      when 'BIN' then jsonb_build_object(
        'milestone2Spec','TKA-SMP-MINI-BIN-V1',
        'questionCount',15,
        'durationSeconds',2100,
        'cognitiveQuota',jsonb_build_object(
          'Pemahaman Tekstual',5,
          'Pemahaman Inferensial',5,
          'Evaluasi dan Apresiasi',5
        ),
        'questionSource','frozen_full_tryout_reviewed_pool',
        'commerceEnforced',false
      )
      when 'MAT' then jsonb_build_object(
        'milestone2Spec','TKA-SMP-MINI-MAT-V1',
        'questionCount',15,
        'durationSeconds',2100,
        'cognitiveQuota',jsonb_build_object(
          'Pengetahuan dan Pemahaman',5,
          'Aplikasi',5,
          'Penalaran',5
        ),
        'questionSource','frozen_full_tryout_reviewed_pool',
        'commerceEnforced',false
      )
      else '{}'::jsonb
    end
from public.exams e, public.subjects s
where es.exam_id=e.id
  and s.id=es.subject_id
  and e.slug in ('tka-smp-mini-bahasa-indonesia','tka-smp-mini-matematika');

delete from public.exam_question_items eqi
using public.exams e
where eqi.exam_id=e.id
  and e.slug in ('tka-smp-mini-bahasa-indonesia','tka-smp-mini-matematika');

with chosen(question_code,mini_slug,mini_position) as (
  values
    ('SMP26-S300-BIN-076','tka-smp-mini-bahasa-indonesia',1),
    ('SMP26-S300-BIN-052','tka-smp-mini-bahasa-indonesia',2),
    ('SMP26-S300-BIN-073','tka-smp-mini-bahasa-indonesia',3),
    ('SMP26-S300-BIN-011','tka-smp-mini-bahasa-indonesia',4),
    ('SMP26-S300-BIN-013','tka-smp-mini-bahasa-indonesia',5),
    ('SMP26-S120-BIN-011','tka-smp-mini-bahasa-indonesia',6),
    ('SMP26-S300-BIN-023','tka-smp-mini-bahasa-indonesia',7),
    ('SMP26-S300-BIN-027','tka-smp-mini-bahasa-indonesia',8),
    ('SMP26-S300-BIN-072','tka-smp-mini-bahasa-indonesia',9),
    ('SMP26-S300-BIN-083','tka-smp-mini-bahasa-indonesia',10),
    ('SMP26-S120-BIN-035','tka-smp-mini-bahasa-indonesia',11),
    ('SMP26-S120-BIN-034','tka-smp-mini-bahasa-indonesia',12),
    ('SMP26-S300-BIN-024','tka-smp-mini-bahasa-indonesia',13),
    ('SMP26-S300-BIN-075','tka-smp-mini-bahasa-indonesia',14),
    ('SMP26-S120-BIN-033','tka-smp-mini-bahasa-indonesia',15),
    ('SMP26-S300-MAT-049','tka-smp-mini-matematika',1),
    ('SMP26-S300-MAT-010','tka-smp-mini-matematika',2),
    ('SMP26-S120-MAT-020','tka-smp-mini-matematika',3),
    ('SMP26-S120-MAT-038','tka-smp-mini-matematika',4),
    ('SMP26-S300-MAT-013','tka-smp-mini-matematika',5),
    ('SMP26-S300-MAT-047','tka-smp-mini-matematika',6),
    ('SMP26-S120-MAT-032','tka-smp-mini-matematika',7),
    ('SMP26-S300-MAT-023','tka-smp-mini-matematika',8),
    ('SMP26-S300-MAT-083','tka-smp-mini-matematika',9),
    ('SMP26-P01-MAT-012','tka-smp-mini-matematika',10),
    ('SMP26-S300-MAT-033','tka-smp-mini-matematika',11),
    ('SMP26-S120-MAT-018','tka-smp-mini-matematika',12),
    ('SMP26-S120-MAT-042','tka-smp-mini-matematika',13),
    ('SMP26-S300-MAT-057','tka-smp-mini-matematika',14),
    ('SMP26-S120-MAT-023','tka-smp-mini-matematika',15)
)
insert into public.exam_question_items(
  exam_id,section_id,question_id,question_version,position,score_weight
)
select e.id,es.id,q.id,q.version,c.mini_position,1
from chosen c
join public.exams e on e.slug=c.mini_slug
join public.questions q
  on q.question_code=c.question_code
 and q.program_id=e.program_id
 and q.track_id=e.track_id
join public.exam_sections es
  on es.exam_id=e.id and es.subject_id=q.subject_id
join public.question_versions qv
  on qv.question_id=q.id and qv.version=q.version;

-- Fail the migration if a selected code/version was missing or a section count drifted.
do $$
declare
  v_slug text;
  v_count integer;
  v_expected integer;
begin
  foreach v_slug in array array['tka-smp-mini-bahasa-indonesia','tka-smp-mini-matematika'] loop
    select count(*) into v_count
    from public.exam_question_items eqi
    join public.exams e on e.id=eqi.exam_id
    where e.slug=v_slug;

    select coalesce(sum(es.question_count),0) into v_expected
    from public.exam_sections es
    join public.exams e on e.id=es.exam_id
    where e.slug=v_slug;

    if v_count <> 15 or v_expected <> 15 or v_count <> v_expected then
      raise exception 'Invalid frozen Mini set for %: items %, expected %',v_slug,v_count,v_expected;
    end if;
  end loop;
end;
$$;
