-- Activate TKA SMP Diagnostic V1 only when the frozen exam contract is complete.
-- Expected contract: 28 items mapped to 7 diagnostic competencies (4 items each).

do $migration$
declare
  v_exam_id uuid;
  v_item_count integer;
  v_competency_count integer;
  v_invalid_competency_count integer;
begin
  select e.id
    into v_exam_id
  from public.exams e
  join public.tracks t on t.id = e.track_id
  join public.programs p on p.id = t.program_id
  join public.exam_types et on et.id = e.exam_type_id
  where e.slug = 'tka-smp-diagnostic-awal'
    and upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
    and upper(et.code) = 'DIAGNOSTIC'
  limit 1;

  if v_exam_id is null then
    raise exception 'TKA SMP diagnostic exam not found';
  end if;

  select count(*)::integer
    into v_item_count
  from public.exam_question_items eqi
  where eqi.exam_id = v_exam_id;

  if v_item_count <> 28 then
    raise exception 'TKA SMP diagnostic activation blocked: expected 28 items, got %', v_item_count;
  end if;

  with evidence as (
    select
      q.id as question_id,
      s.code as subject_code,
      qkn.knowledge_node_id as primary_node_id
    from public.exam_question_items eqi
    join public.questions q on q.id = eqi.question_id
    join public.subjects s on s.id = q.subject_id
    join public.question_knowledge_nodes qkn
      on qkn.question_id = q.id
     and lower(qkn.relation_type) = 'primary'
    where eqi.exam_id = v_exam_id
  ), mapped as (
    select
      e.question_id,
      competency.id as competency_id
    from evidence e
    join lateral (
      select anc.id
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
  ), counts as (
    select competency_id, count(*)::integer as question_count
    from mapped
    group by competency_id
  )
  select
    count(*)::integer,
    count(*) filter (where question_count <> 4)::integer
  into v_competency_count, v_invalid_competency_count
  from counts;

  if v_competency_count <> 7 then
    raise exception 'TKA SMP diagnostic activation blocked: expected 7 competencies, got %', v_competency_count;
  end if;

  if v_invalid_competency_count <> 0 then
    raise exception 'TKA SMP diagnostic activation blocked: every competency must contain exactly 4 items';
  end if;

  if exists (
    select 1
    from public.exam_question_items eqi
    join public.questions q on q.id = eqi.question_id
    where eqi.exam_id = v_exam_id
      and lower(q.status) <> 'approved'
  ) then
    raise exception 'TKA SMP diagnostic activation blocked: all questions must be approved';
  end if;

  update public.exams
  set status = 'active', updated_at = now()
  where id = v_exam_id;
end;
$migration$;
