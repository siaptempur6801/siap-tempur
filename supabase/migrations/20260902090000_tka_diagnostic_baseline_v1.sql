-- TKA Diagnostic Baseline V1
-- Uses the existing exam engine while keeping diagnostic evidence separate
-- from long-term mastery, wrong-question, and remedial projections.

create table if not exists public.diagnostic_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_track_id uuid not null references public.user_tracks(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  exam_attempt_id uuid not null unique references public.exam_attempts(id) on delete cascade,
  version text not null default 'tka-smp-diagnostic-v1',
  overall_score numeric(6,2) not null default 0 check (overall_score between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  recommended_subject_id uuid references public.subjects(id) on delete set null,
  recommended_knowledge_node_id uuid references public.knowledge_nodes(id) on delete set null,
  recommendation_reason text,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_diagnostic_profiles_user_track_completed
  on public.diagnostic_profiles(user_id, track_id, completed_at desc);

create index if not exists idx_diagnostic_profiles_recommendation
  on public.diagnostic_profiles(user_id, recommended_knowledge_node_id)
  where recommended_knowledge_node_id is not null;

create table if not exists public.diagnostic_competency_results (
  id uuid primary key default gen_random_uuid(),
  diagnostic_profile_id uuid not null references public.diagnostic_profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  knowledge_node_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  attempted_questions integer not null default 0 check (attempted_questions >= 0),
  correct_questions integer not null default 0 check (correct_questions >= 0 and correct_questions <= attempted_questions),
  accuracy numeric(7,6) not null default 0 check (accuracy between 0 and 1),
  baseline_score numeric(6,2) not null default 0 check (baseline_score between 0 and 100),
  confidence numeric(7,6) not null default 0 check (confidence between 0 and 1),
  strength_label text not null check (strength_label in ('KUAT','CUKUP','PERLU_DIKUATKAN')),
  priority_rank integer not null check (priority_rank > 0),
  created_at timestamptz not null default now(),
  unique (diagnostic_profile_id, knowledge_node_id)
);

create index if not exists idx_diagnostic_competency_profile_priority
  on public.diagnostic_competency_results(diagnostic_profile_id, priority_rank);

alter table public.diagnostic_profiles enable row level security;
alter table public.diagnostic_competency_results enable row level security;

drop policy if exists diagnostic_profiles_select_own on public.diagnostic_profiles;
create policy diagnostic_profiles_select_own
on public.diagnostic_profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists diagnostic_competency_results_select_own on public.diagnostic_competency_results;
create policy diagnostic_competency_results_select_own
on public.diagnostic_competency_results
for select
to authenticated
using (
  exists (
    select 1
    from public.diagnostic_profiles dp
    where dp.id = diagnostic_profile_id
      and dp.user_id = auth.uid()
  )
);

grant select on public.diagnostic_profiles to authenticated;
grant select on public.diagnostic_competency_results to authenticated;

create or replace function app_private.refresh_tka_smp_diagnostic_profile_for_user(
  p_user_id uuid,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_exam_id uuid;
  v_track_id uuid;
  v_user_track_id uuid;
  v_percentage numeric;
  v_submitted_at timestamptz;
  v_profile_id uuid;
  v_evidence_count integer := 0;
  v_competency_count integer := 0;
  v_recommended_subject_id uuid;
  v_recommended_node_id uuid;
  v_recommended_name text;
begin
  select
    ea.exam_id,
    e.track_id,
    coalesce(ea.percentage, 0),
    coalesce(ea.submitted_at, ea.updated_at, ea.created_at)
  into
    v_exam_id,
    v_track_id,
    v_percentage,
    v_submitted_at
  from public.exam_attempts ea
  join public.exams e on e.id = ea.exam_id
  join public.exam_types et on et.id = e.exam_type_id
  join public.tracks t on t.id = e.track_id
  join public.programs p on p.id = t.program_id
  where ea.id = p_attempt_id
    and ea.user_id = p_user_id
    and lower(ea.status) = 'completed'
    and upper(et.code) = 'DIAGNOSTIC'
    and upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP';

  if v_exam_id is null then
    return jsonb_build_object(
      'applied', false,
      'reason', 'COMPLETED_TKA_SMP_DIAGNOSTIC_ATTEMPT_NOT_FOUND'
    );
  end if;

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = p_user_id
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  order by ut.updated_at desc nulls last, ut.started_at desc nulls last
  limit 1;

  if v_user_track_id is null then
    return jsonb_build_object(
      'applied', false,
      'reason', 'ACTIVE_USER_TRACK_NOT_FOUND'
    );
  end if;

  select count(*)::integer
    into v_evidence_count
  from public.attempt_questions aq
  where aq.attempt_id = p_attempt_id;

  insert into public.diagnostic_profiles (
    user_id,
    user_track_id,
    track_id,
    exam_id,
    exam_attempt_id,
    version,
    overall_score,
    evidence_count,
    completed_at,
    updated_at
  )
  values (
    p_user_id,
    v_user_track_id,
    v_track_id,
    v_exam_id,
    p_attempt_id,
    'tka-smp-diagnostic-v1',
    greatest(0, least(100, coalesce(v_percentage, 0))),
    v_evidence_count,
    v_submitted_at,
    now()
  )
  on conflict (exam_attempt_id) do update
  set
    user_track_id = excluded.user_track_id,
    track_id = excluded.track_id,
    exam_id = excluded.exam_id,
    version = excluded.version,
    overall_score = excluded.overall_score,
    evidence_count = excluded.evidence_count,
    completed_at = excluded.completed_at,
    updated_at = now()
  returning id into v_profile_id;

  delete from public.diagnostic_competency_results
  where diagnostic_profile_id = v_profile_id;

  with evidence as (
    select
      aq.question_id,
      q.subject_id,
      s.code as subject_code,
      qkn.knowledge_node_id as primary_node_id,
      coalesce(aa.is_correct, false) as is_correct
    from public.attempt_questions aq
    join public.questions q on q.id = aq.question_id
    join public.subjects s on s.id = q.subject_id
    join public.question_knowledge_nodes qkn
      on qkn.question_id = q.id
     and lower(qkn.relation_type) = 'primary'
    left join public.attempt_answers aa
      on aa.attempt_question_id = aq.id
    where aq.attempt_id = p_attempt_id
  ), mapped as (
    select
      e.question_id,
      e.subject_id,
      e.subject_code,
      e.is_correct,
      competency.id as knowledge_node_id,
      competency.name as knowledge_name,
      competency.sort_order
    from evidence e
    join lateral (
      select anc.id, anc.name, anc.sort_order
      from public.knowledge_node_paths knp
      join public.knowledge_nodes anc on anc.id = knp.ancestor_id
      where knp.descendant_id = e.primary_node_id
        and (
          (upper(e.subject_code) = 'BIN' and lower(anc.node_type) = 'competency')
          or
          (upper(e.subject_code) = 'MAT' and lower(anc.node_type) = 'element')
        )
      order by knp.depth asc, anc.sort_order asc, anc.id
      limit 1
    ) competency on true
  ), aggregated as (
    select
      subject_id,
      subject_code,
      knowledge_node_id,
      max(knowledge_name) as knowledge_name,
      max(sort_order) as sort_order,
      count(*)::integer as attempted_questions,
      count(*) filter (where is_correct is true)::integer as correct_questions
    from mapped
    group by subject_id, subject_code, knowledge_node_id
  ), scored as (
    select
      a.*,
      round(a.correct_questions::numeric / nullif(a.attempted_questions, 0), 6) as accuracy,
      round(a.correct_questions::numeric / nullif(a.attempted_questions, 0) * 100, 2) as baseline_score,
      round(least(1::numeric, a.attempted_questions::numeric / 4::numeric), 6) as confidence
    from aggregated a
  ), ranked as (
    select
      s.*,
      row_number() over (
        order by s.baseline_score asc, s.confidence desc, s.subject_code, s.sort_order, s.knowledge_node_id
      )::integer as priority_rank
    from scored s
  )
  insert into public.diagnostic_competency_results (
    diagnostic_profile_id,
    subject_id,
    knowledge_node_id,
    attempted_questions,
    correct_questions,
    accuracy,
    baseline_score,
    confidence,
    strength_label,
    priority_rank
  )
  select
    v_profile_id,
    r.subject_id,
    r.knowledge_node_id,
    r.attempted_questions,
    r.correct_questions,
    coalesce(r.accuracy, 0),
    coalesce(r.baseline_score, 0),
    coalesce(r.confidence, 0),
    case
      when coalesce(r.baseline_score, 0) >= 75 then 'KUAT'
      when coalesce(r.baseline_score, 0) >= 50 then 'CUKUP'
      else 'PERLU_DIKUATKAN'
    end,
    r.priority_rank
  from ranked r;

  get diagnostics v_competency_count = row_count;

  select dcr.subject_id, dcr.knowledge_node_id, kn.name
    into v_recommended_subject_id, v_recommended_node_id, v_recommended_name
  from public.diagnostic_competency_results dcr
  join public.knowledge_nodes kn on kn.id = dcr.knowledge_node_id
  where dcr.diagnostic_profile_id = v_profile_id
  order by dcr.priority_rank
  limit 1;

  update public.diagnostic_profiles
  set
    recommended_subject_id = v_recommended_subject_id,
    recommended_knowledge_node_id = v_recommended_node_id,
    recommendation_reason = case
      when v_recommended_node_id is null then 'Belum ada kompetensi yang dapat dipetakan.'
      else 'Mulai dari kompetensi dengan baseline diagnostik terendah: ' || v_recommended_name || '.'
    end,
    updated_at = now()
  where id = v_profile_id;

  return jsonb_build_object(
    'applied', true,
    'profile_id', v_profile_id,
    'attempt_id', p_attempt_id,
    'track', 'TKA/SMP',
    'version', 'tka-smp-diagnostic-v1',
    'overall_score', greatest(0, least(100, coalesce(v_percentage, 0))),
    'evidence_count', v_evidence_count,
    'competency_count', v_competency_count,
    'recommended_knowledge_node_id', v_recommended_node_id
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_diagnostic_profile_for_user(uuid, uuid)
  from public, anon, authenticated;

-- Keep DIAGNOSTIC evidence separate from long-term mastery.
create or replace function app_private.refresh_tka_smp_learning_projection_for_user(
  p_user_id uuid,
  p_source_attempt_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_track_id uuid;
  v_source_track_id uuid;
  v_source_exam_type text;
  v_user_track_id uuid;
  v_knowledge_rows integer := 0;
  v_subject_rows integer := 0;
begin
  select t.id
    into v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    return jsonb_build_object('applied', false, 'reason', 'TKA_SMP_TRACK_NOT_FOUND');
  end if;

  if p_source_attempt_id is not null then
    select e.track_id, upper(et.code)
      into v_source_track_id, v_source_exam_type
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.exam_types et on et.id = e.exam_type_id
    where ea.id = p_source_attempt_id
      and ea.user_id = p_user_id
      and lower(ea.status) = 'completed';

    if v_source_track_id is null then
      return jsonb_build_object('applied', false, 'reason', 'COMPLETED_SOURCE_ATTEMPT_NOT_FOUND');
    end if;

    if v_source_track_id <> v_track_id then
      return jsonb_build_object('applied', false, 'reason', 'TRACK_NOT_SUPPORTED');
    end if;

    if v_source_exam_type = 'DIAGNOSTIC' then
      return jsonb_build_object('applied', false, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');
    end if;
  end if;

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = p_user_id
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  order by ut.updated_at desc nulls last, ut.started_at desc nulls last
  limit 1;

  if v_user_track_id is null then
    return jsonb_build_object('applied', false, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  end if;

  delete from public.user_knowledge_progress ukp
  where ukp.user_id = p_user_id
    and ukp.user_track_id = v_user_track_id;

  with exam_evidence as (
    select
      qkn.knowledge_node_id,
      aa.is_correct,
      coalesce(aa.score_awarded, 0)::numeric as score_awarded,
      coalesce(aa.time_spent_seconds, 0)::numeric as time_spent_seconds,
      coalesce(ea.submitted_at, ea.updated_at, ea.created_at) as occurred_at
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.exam_types et on et.id = e.exam_type_id
    join public.attempt_questions aq on aq.attempt_id = ea.id
    join public.question_knowledge_nodes qkn
      on qkn.question_id = aq.question_id
     and qkn.relation_type = 'primary'
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
      and upper(et.code) <> 'DIAGNOSTIC'
  ), correction_evidence as (
    select
      uwq.knowledge_node_id,
      true as is_correct,
      wqr.score_awarded::numeric as score_awarded,
      null::numeric as time_spent_seconds,
      wqr.created_at as occurred_at
    from public.wrong_question_reviews wqr
    join public.user_wrong_questions uwq on uwq.id = wqr.user_wrong_question_id
    where wqr.user_id = p_user_id
      and uwq.track_id = v_track_id
      and uwq.knowledge_node_id is not null
      and wqr.is_correct is true
  ), all_evidence as (
    select * from exam_evidence
    union all
    select * from correction_evidence
  ), knowledge_agg as (
    select
      knowledge_node_id,
      count(*)::integer as attempted_questions,
      count(*) filter (where is_correct is true)::integer as correct_questions,
      count(*) filter (where is_correct is true)::numeric / nullif(count(*), 0) as accuracy,
      avg(score_awarded)::numeric as average_score,
      (avg(time_spent_seconds) filter (where time_spent_seconds is not null))::numeric as average_time_seconds,
      max(occurred_at) as last_practiced_at
    from all_evidence
    group by knowledge_node_id
  ), scored as (
    select
      knowledge_node_id,
      attempted_questions,
      correct_questions,
      round(coalesce(accuracy, 0), 6) as accuracy,
      round(coalesce(average_score, 0), 6) as average_score,
      round(coalesce(average_time_seconds, 0), 2) as average_time_seconds,
      round(
        (
          (0.70 * coalesce(average_score, 0)) +
          (0.30 * coalesce(accuracy, 0))
        ) * least(1::numeric, attempted_questions::numeric / 5::numeric),
        6
      ) as mastery_score,
      last_practiced_at
    from knowledge_agg
  )
  insert into public.user_knowledge_progress (
    user_id,
    user_track_id,
    knowledge_node_id,
    attempted_questions,
    correct_questions,
    accuracy,
    average_score,
    average_time_seconds,
    mastery_score,
    mastery_level,
    last_practiced_at,
    updated_at
  )
  select
    p_user_id,
    v_user_track_id,
    s.knowledge_node_id,
    s.attempted_questions,
    s.correct_questions,
    s.accuracy,
    s.average_score,
    s.average_time_seconds,
    s.mastery_score,
    case
      when s.mastery_score >= 0.85 then 'mastered'
      when s.mastery_score >= 0.70 then 'proficient'
      when s.mastery_score >= 0.40 then 'developing'
      else 'needs_work'
    end,
    s.last_practiced_at,
    now()
  from scored s;

  get diagnostics v_knowledge_rows = row_count;

  delete from public.user_subject_progress usp
  where usp.user_id = p_user_id
    and usp.subject_id in (
      select s.id from public.subjects s where s.track_id = v_track_id
    );

  with subject_agg as (
    select
      ats.subject_id,
      count(distinct ats.attempt_id)::integer as attempts,
      sum(ats.correct_count + ats.wrong_count)::integer as questions_answered,
      sum(ats.correct_count)::numeric as correct_answers,
      sum(ats.correct_count + ats.wrong_count + ats.unanswered_count)::numeric as total_questions,
      sum(coalesce(ats.raw_score, 0))::numeric as raw_score
    from public.attempt_scores ats
    join public.exam_attempts ea on ea.id = ats.attempt_id
    join public.exams e on e.id = ea.exam_id
    join public.exam_types et on et.id = e.exam_type_id
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
      and ats.subject_id is not null
      and upper(et.code) <> 'DIAGNOSTIC'
    group by ats.subject_id
  )
  insert into public.user_subject_progress (
    user_id,
    subject_id,
    attempts,
    questions_answered,
    accuracy,
    mastery_score,
    updated_at
  )
  select
    p_user_id,
    sa.subject_id,
    sa.attempts,
    sa.questions_answered,
    case
      when sa.questions_answered > 0 then round(sa.correct_answers / sa.questions_answered * 100, 2)
      else 0
    end,
    case
      when sa.total_questions > 0 then round(sa.raw_score / sa.total_questions * 100, 2)
      else 0
    end,
    now()
  from subject_agg sa;

  get diagnostics v_subject_rows = row_count;

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'knowledge_rows', v_knowledge_rows,
    'subject_rows', v_subject_rows,
    'source_attempt_id', p_source_attempt_id
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_learning_projection_for_user(uuid, uuid)
  from public, anon, authenticated;

-- Branch submit behavior by exam type. Diagnostic submissions materialize
-- a baseline only and deliberately skip normal learning/wrong/remedial projections.
create or replace function app_private.submit_exam_attempt_for_user(
  p_user_id uuid,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
  v_exam_type_code text;
  v_projection jsonb;
  v_wrong_state jsonb;
  v_remedial jsonb;
  v_diagnostic jsonb;
begin
  select ea.started_at, upper(et.code)
    into v_started, v_exam_type_code
  from public.exam_attempts ea
  join public.exams e on e.id = ea.exam_id
  join public.exam_types et on et.id = e.exam_type_id
  where ea.id = p_attempt_id
    and ea.user_id = p_user_id
    and ea.status = 'in_progress'
  for update of ea;

  if v_started is null then
    raise exception 'In-progress attempt not found';
  end if;

  if exists (
    select 1
    from public.attempt_section_states
    where attempt_id = p_attempt_id
      and status <> 'completed'
  ) then
    raise exception 'ALL_SECTIONS_MUST_BE_COMPLETED';
  end if;

  v_score := app_private.score_exam_attempt(p_attempt_id);

  select coalesce(sum(duration_used_seconds), 0)
    into v_duration
  from public.attempt_section_states
  where attempt_id = p_attempt_id
    and status = 'completed';

  update public.exam_attempts
     set status = 'completed',
         submitted_at = now(),
         duration_used_seconds = v_duration,
         total_score = (v_score->>'raw_score')::numeric,
         percentage = (v_score->>'percentage')::numeric,
         passed = null,
         last_saved_at = now(),
         updated_at = now()
   where id = p_attempt_id;

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'attempt_submitted', v_score);

  if v_exam_type_code = 'DIAGNOSTIC' then
    v_diagnostic := app_private.refresh_tka_smp_diagnostic_profile_for_user(p_user_id, p_attempt_id);
    v_projection := jsonb_build_object('applied', false, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');
    v_wrong_state := jsonb_build_object('applied', false, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');
    v_remedial := jsonb_build_object('applied', false, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');

    insert into public.attempt_events(attempt_id, event_type, metadata)
    values (p_attempt_id, 'diagnostic_profile_refreshed', v_diagnostic);
  else
    v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, p_attempt_id);
    v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, p_attempt_id);
    v_remedial := app_private.refresh_tka_smp_remedial_session_for_attempt(p_user_id, p_attempt_id, 10);
  end if;

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'learning_projection_refreshed', v_projection);

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'automatic_remedial_refreshed', v_remedial);

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'completed',
    'raw_score', (v_score->>'raw_score')::numeric,
    'percentage', (v_score->>'percentage')::numeric,
    'duration_used_seconds', v_duration,
    'exam_type', v_exam_type_code,
    'learning_projection', v_projection,
    'wrong_question_state', v_wrong_state,
    'automatic_remedial', v_remedial,
    'diagnostic_profile', v_diagnostic
  );
end;
$function$;

revoke all on function app_private.submit_exam_attempt_for_user(uuid, uuid)
  from public, anon, authenticated;

-- Seed the frozen TKA SMP diagnostic package as DRAFT.
-- Production activation is intentionally a separate release step after the
-- selected question versions are published.
do $seed$
declare
  v_program_id uuid;
  v_track_id uuid;
  v_exam_type_id uuid;
  v_blueprint_id uuid;
  v_exam_id uuid;
  v_bin_subject_id uuid;
  v_mat_subject_id uuid;
  v_bin_section_id uuid;
  v_mat_section_id uuid;
  v_item_count integer;
begin
  select p.id, t.id
    into v_program_id, v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  select id
    into v_exam_type_id
  from public.exam_types
  where upper(code) = 'DIAGNOSTIC'
  limit 1;

  select eb.id
    into v_blueprint_id
  from public.exam_blueprints eb
  where eb.track_id = v_track_id
    and lower(eb.status) = 'active'
  order by eb.effective_from desc nulls last, eb.created_at desc
  limit 1;

  select id into v_bin_subject_id
  from public.subjects
  where track_id = v_track_id and upper(code) = 'BIN'
  limit 1;

  select id into v_mat_subject_id
  from public.subjects
  where track_id = v_track_id and upper(code) = 'MAT'
  limit 1;

  if v_program_id is null or v_track_id is null or v_exam_type_id is null
     or v_bin_subject_id is null or v_mat_subject_id is null then
    raise exception 'TKA SMP diagnostic prerequisites are incomplete';
  end if;

  insert into public.exams (
    program_id,
    track_id,
    exam_type_id,
    blueprint_id,
    title,
    slug,
    description,
    duration_seconds,
    attempt_limit,
    question_order,
    result_visibility,
    access_type,
    status,
    required_feature_id,
    token_cost,
    created_at,
    updated_at
  )
  values (
    v_program_id,
    v_track_id,
    v_exam_type_id,
    v_blueprint_id,
    'Tes Diagnostik Awal TKA SMP',
    'tka-smp-diagnostic-awal',
    'Pemetaan awal 7 kompetensi utama TKA SMP untuk menentukan fokus belajar personal.',
    2100,
    1,
    'randomized',
    'instant',
    'FREE',
    'draft',
    null,
    0,
    now(),
    now()
  )
  on conflict (slug) do update
  set
    program_id = excluded.program_id,
    track_id = excluded.track_id,
    exam_type_id = excluded.exam_type_id,
    blueprint_id = excluded.blueprint_id,
    title = excluded.title,
    description = excluded.description,
    duration_seconds = excluded.duration_seconds,
    attempt_limit = excluded.attempt_limit,
    question_order = excluded.question_order,
    result_visibility = excluded.result_visibility,
    access_type = excluded.access_type,
    status = case
      when lower(public.exams.status) = 'active' then public.exams.status
      else excluded.status
    end,
    required_feature_id = null,
    token_cost = 0,
    updated_at = now()
  returning id into v_exam_id;

  delete from public.exam_question_items where exam_id = v_exam_id;
  delete from public.exam_sections where exam_id = v_exam_id;

  insert into public.exam_sections (
    exam_id,
    subject_id,
    title,
    sort_order,
    question_count,
    duration_seconds,
    config
  )
  values (
    v_exam_id,
    v_bin_subject_id,
    'Bahasa Indonesia',
    1,
    12,
    900,
    jsonb_build_object('mode','diagnostic','version','v1','competencies',3)
  )
  returning id into v_bin_section_id;

  insert into public.exam_sections (
    exam_id,
    subject_id,
    title,
    sort_order,
    question_count,
    duration_seconds,
    config
  )
  values (
    v_exam_id,
    v_mat_subject_id,
    'Matematika',
    2,
    16,
    1200,
    jsonb_build_object('mode','diagnostic','version','v1','competencies',4)
  )
  returning id into v_mat_section_id;

  with question_primary as (
    select
      q.id as question_id,
      q.question_code,
      q.version as question_version,
      lower(q.difficulty) as difficulty,
      s.code as subject_code,
      qkn.knowledge_node_id as primary_node_id
    from public.questions q
    join public.subjects s on s.id = q.subject_id
    join public.question_knowledge_nodes qkn
      on qkn.question_id = q.id
     and lower(qkn.relation_type) = 'primary'
    join public.question_versions qv
      on qv.question_id = q.id
     and qv.version = q.version
    where q.program_id = v_program_id
      and q.track_id = v_track_id
      and lower(q.status) in ('approved','published')
      and lower(q.difficulty) in ('easy','medium','hard')
  ), mapped as (
    select
      qp.*,
      competency.code as competency_code
    from question_primary qp
    join lateral (
      select anc.code
      from public.knowledge_node_paths knp
      join public.knowledge_nodes anc on anc.id = knp.ancestor_id
      where knp.descendant_id = qp.primary_node_id
        and (
          (upper(qp.subject_code) = 'BIN' and lower(anc.node_type) = 'competency')
          or
          (upper(qp.subject_code) = 'MAT' and lower(anc.node_type) = 'element')
        )
      order by knp.depth asc, anc.sort_order asc, anc.id
      limit 1
    ) competency on true
  ), difficulty_ranked as (
    select
      m.*,
      row_number() over (
        partition by m.competency_code, m.difficulty
        order by md5('tka-smp-diagnostic-v1:' || m.question_code), m.question_code
      ) as difficulty_rank
    from mapped m
  ), chosen as (
    select *
    from difficulty_ranked
    where
      (difficulty = 'easy' and difficulty_rank <= 1)
      or (difficulty = 'medium' and difficulty_rank <= 1)
      or (difficulty = 'hard' and difficulty_rank <= 2)
  ), positioned as (
    select
      c.*,
      row_number() over (
        order by
          case when upper(c.subject_code) = 'BIN' then 1 else 2 end,
          c.competency_code,
          case c.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,
          c.question_code
      )::integer as position
    from chosen c
  )
  insert into public.exam_question_items (
    exam_id,
    section_id,
    question_id,
    question_version,
    position,
    score_weight
  )
  select
    v_exam_id,
    case when upper(p.subject_code) = 'BIN' then v_bin_section_id else v_mat_section_id end,
    p.question_id,
    p.question_version,
    p.position,
    1
  from positioned p;

  select count(*)::integer
    into v_item_count
  from public.exam_question_items
  where exam_id = v_exam_id;

  if v_item_count <> 28 then
    raise exception 'TKA SMP diagnostic requires exactly 28 frozen items, got %', v_item_count;
  end if;

  if (
    select count(*) from public.exam_question_items
    where exam_id = v_exam_id and section_id = v_bin_section_id
  ) <> 12 then
    raise exception 'TKA SMP diagnostic Bahasa Indonesia section must contain 12 items';
  end if;

  if (
    select count(*) from public.exam_question_items
    where exam_id = v_exam_id and section_id = v_mat_section_id
  ) <> 16 then
    raise exception 'TKA SMP diagnostic Matematika section must contain 16 items';
  end if;
end;
$seed$;
