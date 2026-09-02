-- TKA SMP Learning Hierarchy V1
-- Materialize safe 10-question drills for sufficiently populated lower-level
-- knowledge nodes and expose one authenticated, read-only hierarchy projection.

do $migration$
declare
  v_created_by uuid;
  v_feature_id uuid;
  v_exam_id uuid;
  v_exam_slug text;
  v_payload jsonb;
  r record;
begin
  select e.created_by
    into v_created_by
  from public.exams e
  where e.slug = 'tka-smp-diagnostic-awal'
  limit 1;

  if v_created_by is null then
    raise exception 'TKA SMP diagnostic creator not found';
  end if;

  select f.id
    into v_feature_id
  from public.features f
  where f.code = 'tka.smp.drill.unlimited'
  limit 1;

  if v_feature_id is null then
    raise exception 'TKA SMP drill feature not found';
  end if;

  for r in
    with candidates as (
      select
        kn.id as knowledge_node_id,
        kn.name as knowledge_node_name,
        kn.slug as knowledge_node_slug,
        kn.depth,
        kn.sort_order,
        s.code as subject_code,
        count(distinct q.id)::integer as published_question_count
      from public.knowledge_nodes kn
      join public.subjects s on s.id = kn.subject_id
      join public.tracks t on t.id = s.track_id
      join public.programs p on p.id = t.program_id
      left join public.knowledge_node_paths knp on knp.ancestor_id = kn.id
      left join public.question_knowledge_nodes qkn
        on qkn.knowledge_node_id = knp.descendant_id
       and lower(qkn.relation_type) = 'primary'
      left join public.questions q
        on q.id = qkn.question_id
       and q.track_id = t.id
       and lower(q.status) = 'published'
      where upper(p.code) = 'TKA'
        and upper(t.code) = 'SMP'
        and lower(kn.status) = 'active'
        and (
          (upper(s.code) = 'BIN' and lower(kn.node_type) = 'subcompetency')
          or
          (upper(s.code) = 'MAT' and lower(kn.node_type) in ('subelement', 'topic'))
        )
      group by kn.id, kn.name, kn.slug, kn.depth, kn.sort_order, s.code
    )
    select *
    from candidates
    where published_question_count >= 10
    order by subject_code, depth, sort_order, knowledge_node_name
  loop
    v_exam_slug := 'tka-smp-drill-' || lower(r.subject_code) || '-' || r.knowledge_node_slug;

    select e.id
      into v_exam_id
    from public.exams e
    where e.slug = v_exam_slug
    limit 1;

    v_payload := public.admin_upsert_drill_exam_v1(
      v_exam_id,
      'TKA',
      'SMP',
      r.subject_code,
      r.knowledge_node_id,
      'Latihan Fokus ' || r.knowledge_node_name || ' TKA SMP',
      v_exam_slug,
      900,
      1,
      10,
      'random',
      'instant',
      'FREEMIUM',
      'active',
      0,
      v_created_by
    );

    v_exam_id := nullif(v_payload ->> 'exam_id', '')::uuid;
    if v_exam_id is null then
      raise exception 'TKA SMP hierarchy drill materialization failed for %', r.knowledge_node_name;
    end if;

    update public.exams
       set required_feature_id = v_feature_id,
           attempt_limit = null,
           description = 'Drill 10 soal untuk ' || r.knowledge_node_name || '. Satu percobaan awal gratis; Tempur Pass membuka latihan lanjutan.',
           updated_at = now()
     where id = v_exam_id;
  end loop;

  if exists (
    with candidates as (
      select kn.id, kn.slug, s.code as subject_code
      from public.knowledge_nodes kn
      join public.subjects s on s.id = kn.subject_id
      join public.tracks t on t.id = s.track_id
      join public.programs p on p.id = t.program_id
      join public.knowledge_node_paths knp on knp.ancestor_id = kn.id
      join public.question_knowledge_nodes qkn
        on qkn.knowledge_node_id = knp.descendant_id
       and lower(qkn.relation_type) = 'primary'
      join public.questions q
        on q.id = qkn.question_id
       and q.track_id = t.id
       and lower(q.status) = 'published'
      where upper(p.code) = 'TKA'
        and upper(t.code) = 'SMP'
        and lower(kn.status) = 'active'
        and (
          (upper(s.code) = 'BIN' and lower(kn.node_type) = 'subcompetency')
          or
          (upper(s.code) = 'MAT' and lower(kn.node_type) in ('subelement', 'topic'))
        )
      group by kn.id, kn.slug, s.code
      having count(distinct q.id) >= 10
    )
    select 1
    from candidates c
    left join public.exams e
      on e.slug = 'tka-smp-drill-' || lower(c.subject_code) || '-' || c.slug
     and lower(e.status) = 'active'
    left join public.exam_sections es on es.exam_id = e.id
    left join public.exam_question_items eqi
      on eqi.exam_id = e.id
     and eqi.section_id = es.id
    group by c.id, e.id, es.id, es.question_count
    having e.id is null or es.question_count <> 10 or count(eqi.id) <> 10
  ) then
    raise exception 'TKA SMP learning hierarchy frozen Drill gate failed';
  end if;
end;
$migration$;

create or replace function public.get_tka_smp_learning_hierarchy()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_track_id uuid;
  v_user_track_id uuid;
  v_items jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select t.id
    into v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    raise exception 'TKA_SMP_TRACK_NOT_FOUND';
  end if;

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = v_user
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  limit 1;

  if v_user_track_id is null then
    raise exception 'ACTIVE_USER_TRACK_REQUIRED';
  end if;

  with nodes as (
    select
      kn.id,
      kn.subject_id,
      kn.parent_id,
      kn.code,
      kn.name,
      kn.slug,
      kn.node_type,
      kn.depth,
      kn.sort_order,
      s.code as subject_code,
      s.name as subject_name,
      s.sort_order as subject_sort_order
    from public.knowledge_nodes kn
    join public.subjects s on s.id = kn.subject_id
    where s.track_id = v_track_id
      and lower(kn.status) = 'active'
  ), question_counts as (
    select
      n.id,
      count(distinct q.id)::integer as question_count
    from nodes n
    left join public.knowledge_node_paths knp on knp.ancestor_id = n.id
    left join public.question_knowledge_nodes qkn
      on qkn.knowledge_node_id = knp.descendant_id
     and lower(qkn.relation_type) = 'primary'
    left join public.questions q
      on q.id = qkn.question_id
     and q.track_id = v_track_id
     and lower(q.status) = 'published'
    group by n.id
  ), hierarchy_rows as (
    select
      n.*,
      qc.question_count,
      coalesce(ukp.attempted_questions, 0)::integer as attempted_questions,
      coalesce(ukp.correct_questions, 0)::integer as correct_questions,
      coalesce(ukp.accuracy, 0)::numeric as accuracy,
      coalesce(ukp.mastery_score, 0)::numeric as mastery_score,
      coalesce(ukp.mastery_level, 'not_started') as mastery_level,
      exact_drill.exam_slug as exact_drill_slug,
      nearest_drill.knowledge_node_id as drill_knowledge_node_id,
      nearest_drill.knowledge_node_code as drill_knowledge_node_code,
      nearest_drill.knowledge_node_name as drill_knowledge_node_name,
      nearest_drill.exam_slug as drill_exam_slug,
      nearest_drill.distance as drill_distance,
      path_nodes.path as path
    from nodes n
    join question_counts qc on qc.id = n.id
    left join public.user_knowledge_progress ukp
      on ukp.user_id = v_user
     and ukp.user_track_id = v_user_track_id
     and ukp.knowledge_node_id = n.id
    left join lateral (
      select e.slug as exam_slug
      from public.exams e
      join public.exam_types et on et.id = e.exam_type_id
      where upper(et.code) = 'DRILL'
        and lower(e.status) = 'active'
        and e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || n.slug
      limit 1
    ) exact_drill on true
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
        on e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || anc.slug
       and lower(e.status) = 'active'
      join public.exam_types et on et.id = e.exam_type_id and upper(et.code) = 'DRILL'
      where knp.descendant_id = n.id
        and anc.subject_id = n.subject_id
        and lower(anc.status) = 'active'
      order by knp.depth asc, anc.depth desc, anc.sort_order, anc.id
      limit 1
    ) nearest_drill on true
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
      where knp.descendant_id = n.id
        and anc.subject_id = n.subject_id
        and lower(anc.status) = 'active'
    ) path_nodes on true
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'knowledge_node_id', hr.id,
        'knowledge_node_code', hr.code,
        'name', hr.name,
        'node_type', hr.node_type,
        'depth', hr.depth,
        'parent_id', hr.parent_id,
        'sort_order', hr.sort_order,
        'subject_id', hr.subject_id,
        'subject_code', hr.subject_code,
        'subject_name', hr.subject_name,
        'subject_sort_order', hr.subject_sort_order,
        'published_question_count', hr.question_count,
        'attempted_questions', hr.attempted_questions,
        'correct_questions', hr.correct_questions,
        'accuracy', hr.accuracy,
        'mastery_score', hr.mastery_score,
        'mastery_level', hr.mastery_level,
        'path', hr.path,
        'drill', case
          when hr.drill_exam_slug is null then null
          else jsonb_build_object(
            'available', true,
            'exact', hr.drill_distance = 0,
            'distance', hr.drill_distance,
            'knowledge_node_id', hr.drill_knowledge_node_id,
            'knowledge_node_code', hr.drill_knowledge_node_code,
            'knowledge_node_name', hr.drill_knowledge_node_name,
            'exam_slug', hr.drill_exam_slug,
            'question_count', 10,
            'duration_seconds', 900
          )
        end
      ) order by hr.subject_sort_order, hr.subject_code, hr.depth, hr.sort_order, hr.code
    ),
    '[]'::jsonb
  )
  into v_items
  from hierarchy_rows hr;

  return jsonb_build_object(
    'version', 'tka_smp_learning_hierarchy_v1',
    'items', v_items,
    'count', jsonb_array_length(v_items)
  );
end;
$function$;

revoke all on function public.get_tka_smp_learning_hierarchy() from public;
revoke all on function public.get_tka_smp_learning_hierarchy() from anon;
grant execute on function public.get_tka_smp_learning_hierarchy() to authenticated;
