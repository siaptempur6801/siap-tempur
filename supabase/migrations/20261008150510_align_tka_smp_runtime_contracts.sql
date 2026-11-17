-- Align the already validated staging TKA SMP contract. Auth, entitlement, quota and scoring gates are preserved.
CREATE OR REPLACE FUNCTION public.get_tka_smp_learning_focus()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_track_id uuid;
  v_refresh jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select t.id
    into v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    return jsonb_build_object('items', '[]'::jsonb, 'count', 0, 'refresh', jsonb_build_object('applied', false, 'reason', 'TKA_SMP_TRACK_NOT_FOUND'));
  end if;

  v_refresh := app_private.refresh_tka_smp_learning_recommendations_for_user(v_user);

  select coalesce(jsonb_agg(item order by priority), '[]'::jsonb)
    into v_items
  from (
    select
      lr.priority,
      jsonb_build_object(
        'id', lr.id,
        'priority', lr.priority,
        'score', lr.score,
        'reason_code', lr.reason_code,
        'knowledge_node_id', lr.knowledge_node_id,
        'topic_code', kn.code,
        'topic_name', kn.name,
        'parent_topic_name', parent_kn.name,
        'subject_code', s.code,
        'subject_name', s.name,
        'mastery_score', ukp.mastery_score,
        'mastery_level', ukp.mastery_level,
        'attempted_questions', ukp.attempted_questions,
        'correct_questions', ukp.correct_questions,
        'accuracy', ukp.accuracy,
        'open_gap_count', coalesce(gaps.open_gap_count, 0),
        'path', path_nodes.path,
        'drill_target', case
          when drill_target.knowledge_node_id is null then null
          else jsonb_build_object(
            'knowledge_node_id', drill_target.knowledge_node_id,
            'knowledge_node_code', drill_target.knowledge_node_code,
            'knowledge_node_name', drill_target.knowledge_node_name,
            'exam_slug', drill_target.exam_slug,
            'exact', drill_target.distance = 0,
            'distance', drill_target.distance,
            'question_count', 10,
            'duration_seconds', 900
          )
        end,
        'next_action', case
          when remedial.session_id is not null then jsonb_build_object(
            'type', 'continue_remedial',
            'label', 'Lanjutkan remedial',
            'href', '/tka/smp/remedial/' || remedial.session_id::text
          )
          when coalesce(gaps.open_gap_count, 0) > 0 then jsonb_build_object(
            'type', 'repeat_wrong',
            'label', 'Ulang soal salah',
            'href', '/tka/smp/wrong-questions'
          )
          when drill_target.knowledge_node_id is not null then jsonb_build_object(
            'type', 'start_drill',
            'label', 'Mulai Drill 10 soal',
            'href', '/tka/smp/progress',
            'subject_code', s.code,
            'knowledge_node_name', drill_target.knowledge_node_name,
            'knowledge_node_code', drill_target.knowledge_node_code,
            'exact', drill_target.distance = 0
          )
          else jsonb_build_object(
            'type', 'practice_tka',
            'label', 'Lihat peta belajar',
            'href', '/tka/smp/progress'
          )
        end
      ) as item
    from public.learning_recommendations lr
    join public.knowledge_nodes kn on kn.id = lr.knowledge_node_id
    left join public.knowledge_nodes parent_kn on parent_kn.id = kn.parent_id
    join public.subjects s on s.id = kn.subject_id
    join public.user_tracks ut
      on ut.user_id = lr.user_id
     and ut.track_id = lr.track_id
     and lower(ut.status) = 'active'
    join public.user_knowledge_progress ukp
      on ukp.user_id = lr.user_id
     and ukp.user_track_id = ut.id
     and ukp.knowledge_node_id = lr.knowledge_node_id
    left join lateral (
      select count(*)::integer as open_gap_count
      from public.user_wrong_questions uwq
      where uwq.user_id = lr.user_id
        and uwq.track_id = lr.track_id
        and uwq.knowledge_node_id = lr.knowledge_node_id
        and uwq.status = 'open'
    ) gaps on true
    left join lateral (
      select rs.id as session_id
      from public.remedial_session_items rsi
      join public.remedial_sessions rs on rs.id = rsi.session_id
      where rs.user_id = lr.user_id
        and rs.track_id = lr.track_id
        and rs.status = 'active'
        and rsi.status = 'pending'
        and rsi.knowledge_node_id = lr.knowledge_node_id
      order by rs.created_at desc, rsi.position, rsi.id
      limit 1
    ) remedial on true
    left join lateral (
      select
        anc.id as knowledge_node_id,
        anc.code as knowledge_node_code,
        anc.name as knowledge_node_name,
        e.slug as exam_slug,
        knp.depth::integer as distance
      from public.knowledge_node_paths knp
      join public.knowledge_nodes anc on anc.id = knp.ancestor_id
      join public.exams e
        on e.slug = 'tka-smp-drill-' || lower(s.code) || '-' || anc.slug
       and lower(e.status) = 'active'
      join public.exam_types et on et.id = e.exam_type_id and upper(et.code) = 'DRILL'
      where knp.descendant_id = kn.id
        and anc.subject_id = kn.subject_id
        and lower(anc.status) = 'active'
      order by knp.depth asc, anc.depth desc, anc.sort_order, anc.id
      limit 1
    ) drill_target on true
    left join lateral (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', anc.id,
            'code', anc.code,
            'name', anc.name,
            'node_type', anc.node_type,
            'depth', anc.depth
          ) order by knp.depth desc
        ),
        '[]'::jsonb
      ) as path
      from public.knowledge_node_paths knp
      join public.knowledge_nodes anc on anc.id = knp.ancestor_id
      where knp.descendant_id = kn.id
        and anc.subject_id = kn.subject_id
        and lower(anc.status) = 'active'
    ) path_nodes on true
    where lr.user_id = v_user
      and lr.track_id = v_track_id
      and lr.recommendation_type = 'weakest_topic_v1'
      and lr.status = 'active'
    order by lr.priority, lr.knowledge_node_id
    limit 3
  ) focus_rows;

  return jsonb_build_object(
    'items', v_items,
    'count', jsonb_array_length(v_items),
    'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1',
    'refresh', v_refresh
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_tka_smp_drill(p_subject_code text, p_knowledge_node_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_code text;
  v_node_id uuid;
  v_node_name text;
  v_node_slug text;
  v_exam_id uuid;
  v_exam_slug text;
  v_feature_id uuid;
  v_duration_seconds integer;
  v_existing_attempt_id uuid;
  v_used_attempts integer := 0;
  v_has_entitlement boolean := false;
  v_payload jsonb;
  v_attempt_id uuid;
begin
  if v_user is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select p.id,t.id into v_program_id,v_track_id
  from public.programs p
  join public.tracks t on t.program_id=p.id
  where upper(p.code)='TKA' and upper(t.code)='SMP'
  limit 1;
  if v_track_id is null then raise exception 'TKA_SMP_TRACK_NOT_FOUND'; end if;

  if not exists(
    select 1 from public.user_tracks ut
    where ut.user_id=v_user and ut.track_id=v_track_id and lower(ut.status)='active'
  ) then
    raise exception 'ACTIVE_USER_TRACK_REQUIRED';
  end if;

  select s.id,s.code into v_subject_id,v_subject_code
  from public.subjects s
  where s.track_id=v_track_id and upper(s.code)=upper(btrim(p_subject_code))
  limit 1;
  if v_subject_id is null then raise exception 'DRILL_SUBJECT_INVALID'; end if;

  select kn.id,kn.name,kn.slug into v_node_id,v_node_name,v_node_slug
  from public.knowledge_nodes kn
  where kn.subject_id=v_subject_id
    and lower(kn.status)='active'
    and lower(btrim(kn.name))=lower(btrim(p_knowledge_node_name))
  limit 1;
  if v_node_id is null then raise exception 'DRILL_KNOWLEDGE_NODE_INVALID'; end if;

  v_exam_slug := 'tka-smp-drill-' || lower(v_subject_code) || '-' || v_node_slug;

  select e.id,e.required_feature_id,e.duration_seconds
    into v_exam_id,v_feature_id,v_duration_seconds
  from public.exams e
  join public.exam_types et on et.id=e.exam_type_id
  where e.program_id=v_program_id
    and e.track_id=v_track_id
    and upper(et.code)='DRILL'
    and e.slug=v_exam_slug
    and lower(e.status)='active'
  limit 1;
  if v_exam_id is null then raise exception 'DRILL_EXAM_NOT_CONFIGURED'; end if;
  if v_feature_id is null then raise exception 'DRILL_ENTITLEMENT_FEATURE_MISSING'; end if;

  select ea.id into v_existing_attempt_id
  from public.exam_attempts ea
  where ea.user_id=v_user and ea.exam_id=v_exam_id and lower(ea.status)='in_progress'
  order by ea.attempt_number desc
  limit 1;

  if v_existing_attempt_id is null then
    select count(*)::integer into v_used_attempts
    from public.exam_attempts ea
    where ea.user_id=v_user and ea.exam_id=v_exam_id;

    if v_used_attempts >= 1 then
      select exists(
        select 1 from public.entitlements en
        where en.user_id=v_user
          and en.feature_id=v_feature_id
          and lower(en.status)='active'
          and en.starts_at <= now()
          and (en.expires_at is null or en.expires_at > now())
          and (en.usage_limit is null or en.usage_count < en.usage_limit)
      ) into v_has_entitlement;
      if not v_has_entitlement then raise exception 'ENTITLEMENT_REQUIRED'; end if;
    end if;
  end if;

  v_payload := app_private.start_exam_attempt_for_user(v_exam_id,v_user);
  v_attempt_id := nullif(v_payload ->> 'attempt_id','')::uuid;
  if v_attempt_id is null then raise exception 'DRILL_ATTEMPT_START_FAILED'; end if;

  update public.exam_attempts ea
     set metadata=coalesce(ea.metadata,'{}'::jsonb) || jsonb_build_object(
       'schemaVersion',2,
       'practiceKind','drill',
       'programCode','TKA',
       'trackCode','SMP',
       'subjectCode',v_subject_code,
       'knowledgeNode',v_node_name,
       'durationSeconds',coalesce(v_duration_seconds,900),
       'examSlug',v_exam_slug
     ),
     updated_at=now()
   where ea.id=v_attempt_id and ea.user_id=v_user;

  return v_payload || jsonb_build_object(
    'subject_code',v_subject_code,
    'knowledge_node_id',v_node_id,
    'knowledge_node_name',v_node_name,
    'exam_slug',v_exam_slug
  );
end;
$function$;
