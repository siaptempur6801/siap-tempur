-- TKA Diagnostic Recommendations V1
-- Materialize the first personalized actions into the existing generic
-- learning_recommendations table, then retire them once real mastery evidence exists.

create or replace function app_private.refresh_tka_smp_diagnostic_recommendations_for_user(
  p_user_id uuid,
  p_diagnostic_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_track_id uuid;
  v_inserted integer := 0;
begin
  select dp.track_id
    into v_track_id
  from public.diagnostic_profiles dp
  where dp.id = p_diagnostic_profile_id
    and dp.user_id = p_user_id;

  if v_track_id is null then
    return jsonb_build_object('applied', false, 'reason', 'DIAGNOSTIC_PROFILE_NOT_FOUND');
  end if;

  update public.learning_recommendations lr
     set status = 'inactive',
         expires_at = coalesce(lr.expires_at, now())
   where lr.user_id = p_user_id
     and lr.track_id = v_track_id
     and lr.recommendation_type = 'diagnostic_baseline_v1'
     and lr.status = 'active';

  with ranked as (
    select
      dcr.knowledge_node_id,
      dcr.subject_id,
      dcr.priority_rank,
      dcr.baseline_score,
      case
        when upper(s.code) = 'BIN' then 'tka-smp-mini-bahasa-indonesia'
        when upper(s.code) = 'MAT' then 'tka-smp-mini-matematika'
        else null
      end as resource_slug
    from public.diagnostic_competency_results dcr
    join public.subjects s on s.id = dcr.subject_id
    where dcr.diagnostic_profile_id = p_diagnostic_profile_id
    order by dcr.priority_rank
    limit 3
  ), resources as (
    select
      r.*,
      e.id as resource_id
    from ranked r
    left join public.exams e on e.slug = r.resource_slug
  )
  insert into public.learning_recommendations (
    user_id,
    track_id,
    recommendation_type,
    knowledge_node_id,
    resource_id,
    reason_code,
    priority,
    score,
    status,
    expires_at
  )
  select
    p_user_id,
    v_track_id,
    'diagnostic_baseline_v1',
    r.knowledge_node_id,
    r.resource_id,
    'diagnostic_weakness_v1',
    r.priority_rank,
    round(greatest(0::numeric, 1::numeric - (r.baseline_score / 100::numeric)), 6),
    'active',
    null
  from resources r
  on conflict (user_id, track_id, recommendation_type, knowledge_node_id)
  do update set
    resource_id = excluded.resource_id,
    reason_code = excluded.reason_code,
    priority = excluded.priority,
    score = excluded.score,
    status = 'active',
    expires_at = null;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'profile_id', p_diagnostic_profile_id,
    'active_recommendations', v_inserted,
    'max_recommendations', 3,
    'rule', 'diagnostic_baseline_asc_v1'
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_diagnostic_recommendations_for_user(uuid, uuid)
  from public, anon, authenticated;

create or replace function app_private.refresh_tka_smp_learning_recommendations_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_track_id uuid;
  v_user_track_id uuid;
  v_active_count integer := 0;
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

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = p_user_id
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  order by ut.updated_at desc nulls last, ut.started_at desc nulls last
  limit 1;

  if v_user_track_id is null then
    update public.learning_recommendations lr
       set status = 'inactive',
           expires_at = coalesce(lr.expires_at, now())
     where lr.user_id = p_user_id
       and lr.track_id = v_track_id
       and lr.recommendation_type in ('weakest_topic_v1', 'diagnostic_baseline_v1')
       and lr.status = 'active';

    return jsonb_build_object('applied', false, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  end if;

  update public.learning_recommendations lr
     set status = 'inactive',
         expires_at = coalesce(lr.expires_at, now())
   where lr.user_id = p_user_id
     and lr.track_id = v_track_id
     and lr.recommendation_type = 'weakest_topic_v1'
     and lr.status = 'active';

  with ranked as (
    select
      ukp.knowledge_node_id,
      row_number() over (
        order by
          ukp.mastery_score asc,
          ukp.attempted_questions desc,
          ukp.accuracy asc,
          ukp.knowledge_node_id
      )::integer as priority,
      round(greatest(0::numeric, 1::numeric - ukp.mastery_score), 6) as weakness_score
    from public.user_knowledge_progress ukp
    join public.knowledge_nodes kn on kn.id = ukp.knowledge_node_id
    join public.subjects s on s.id = kn.subject_id
    where ukp.user_id = p_user_id
      and ukp.user_track_id = v_user_track_id
      and s.track_id = v_track_id
      and ukp.attempted_questions > 0
      and ukp.mastery_score < 0.85
      and lower(kn.status) = 'active'
      and lower(s.status) = 'active'
    order by
      ukp.mastery_score asc,
      ukp.attempted_questions desc,
      ukp.accuracy asc,
      ukp.knowledge_node_id
    limit 3
  )
  insert into public.learning_recommendations (
    user_id,
    track_id,
    recommendation_type,
    knowledge_node_id,
    resource_id,
    reason_code,
    priority,
    score,
    status,
    expires_at
  )
  select
    p_user_id,
    v_track_id,
    'weakest_topic_v1',
    r.knowledge_node_id,
    null,
    'weakest_mastery_v1',
    r.priority,
    r.weakness_score,
    'active',
    null
  from ranked r
  on conflict (user_id, track_id, recommendation_type, knowledge_node_id)
  do update set
    reason_code = excluded.reason_code,
    priority = excluded.priority,
    score = excluded.score,
    status = 'active',
    expires_at = null;

  select count(*)::integer
    into v_active_count
  from public.learning_recommendations lr
  where lr.user_id = p_user_id
    and lr.track_id = v_track_id
    and lr.recommendation_type = 'weakest_topic_v1'
    and lr.status = 'active';

  if v_active_count > 0 then
    update public.learning_recommendations lr
       set status = 'inactive',
           expires_at = coalesce(lr.expires_at, now())
     where lr.user_id = p_user_id
       and lr.track_id = v_track_id
       and lr.recommendation_type = 'diagnostic_baseline_v1'
       and lr.status = 'active';
  end if;

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'active_recommendations', v_active_count,
    'max_recommendations', 3,
    'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1',
    'diagnostic_recommendations_retired', v_active_count > 0
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_learning_recommendations_for_user(uuid)
  from public, anon, authenticated;

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
  v_recommendations jsonb;
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
    return jsonb_build_object('applied', false, 'reason', 'COMPLETED_TKA_SMP_DIAGNOSTIC_ATTEMPT_NOT_FOUND');
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

  select count(*)::integer
    into v_evidence_count
  from public.attempt_questions aq
  where aq.attempt_id = p_attempt_id;

  insert into public.diagnostic_profiles (
    user_id, user_track_id, track_id, exam_id, exam_attempt_id, version,
    overall_score, evidence_count, completed_at, updated_at
  )
  values (
    p_user_id, v_user_track_id, v_track_id, v_exam_id, p_attempt_id,
    'tka-smp-diagnostic-v1', greatest(0, least(100, coalesce(v_percentage, 0))),
    v_evidence_count, v_submitted_at, now()
  )
  on conflict (exam_attempt_id) do update
  set user_track_id = excluded.user_track_id,
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
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
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
    diagnostic_profile_id, subject_id, knowledge_node_id, attempted_questions,
    correct_questions, accuracy, baseline_score, confidence, strength_label, priority_rank
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
  set recommended_subject_id = v_recommended_subject_id,
      recommended_knowledge_node_id = v_recommended_node_id,
      recommendation_reason = case
        when v_recommended_node_id is null then 'Belum ada kompetensi yang dapat dipetakan.'
        else 'Mulai dari kompetensi dengan baseline diagnostik terendah: ' || v_recommended_name || '.'
      end,
      updated_at = now()
  where id = v_profile_id;

  v_recommendations := app_private.refresh_tka_smp_diagnostic_recommendations_for_user(p_user_id, v_profile_id);

  return jsonb_build_object(
    'applied', true,
    'profile_id', v_profile_id,
    'attempt_id', p_attempt_id,
    'track', 'TKA/SMP',
    'version', 'tka-smp-diagnostic-v1',
    'overall_score', greatest(0, least(100, coalesce(v_percentage, 0))),
    'evidence_count', v_evidence_count,
    'competency_count', v_competency_count,
    'recommended_knowledge_node_id', v_recommended_node_id,
    'learning_recommendations', v_recommendations
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_diagnostic_profile_for_user(uuid, uuid)
  from public, anon, authenticated;
