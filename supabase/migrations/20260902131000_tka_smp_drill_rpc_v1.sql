-- TKA SMP focused Drill V1.1
-- Materialize one immutable 10-question Drill exam per diagnostic competency and
-- expose an authenticated start RPC so learner flows never require service-role
-- credentials in the application runtime.

do $migration$
declare
  v_created_by uuid;
  v_feature_id uuid;
  v_payload jsonb;
  v_exam_id uuid;
  v_exam_slug text;
  r record;
begin
  select e.created_by into v_created_by
  from public.exams e
  where e.slug = 'tka-smp-diagnostic-awal'
  limit 1;

  if v_created_by is null then
    raise exception 'TKA SMP diagnostic creator not found';
  end if;

  select f.id into v_feature_id
  from public.features f
  where f.code = 'tka.smp.drill.unlimited'
  limit 1;

  if v_feature_id is null then
    raise exception 'TKA SMP drill feature not found';
  end if;

  for r in
    select
      s.code as subject_code,
      kn.id as knowledge_node_id,
      kn.name,
      kn.slug
    from public.knowledge_nodes kn
    join public.subjects s on s.id = kn.subject_id
    join public.tracks t on t.id = s.track_id
    join public.programs p on p.id = t.program_id
    where upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
      and lower(kn.status) = 'active'
      and kn.name in (
        'Pemahaman Tekstual',
        'Pemahaman Inferensial',
        'Evaluasi dan Apresiasi',
        'Bilangan',
        'Aljabar',
        'Geometri dan Pengukuran',
        'Data dan Peluang'
      )
    order by s.code, kn.sort_order, kn.name
  loop
    v_exam_slug := 'tka-smp-drill-' || lower(r.subject_code) || '-' || r.slug;

    select e.id into v_exam_id
    from public.exams e
    where e.slug = v_exam_slug
    limit 1;

    v_payload := public.admin_upsert_drill_exam_v1(
      v_exam_id,
      'TKA',
      'SMP',
      r.subject_code,
      r.knowledge_node_id,
      'Latihan Fokus ' || r.name || ' TKA SMP',
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

    v_exam_id := (v_payload ->> 'exam_id')::uuid;

    update public.exams
       set required_feature_id = v_feature_id,
           attempt_limit = null,
           description = 'Latihan fokus 10 soal untuk kompetensi ' || r.name || '. Satu percobaan awal gratis; Tempur Pass membuka latihan lanjutan.',
           updated_at = now()
     where id = v_exam_id;
  end loop;

  -- Retire the earlier subject-level dynamic Drill configuration before the
  -- canonical 7x10 frozen-item gate is evaluated.
  update public.exams
     set status = 'draft',
         updated_at = now()
   where slug in (
     'tka-smp-drill-bahasa-indonesia',
     'tka-smp-drill-matematika'
   );

  if (
    select count(*)
    from public.exams e
    join public.exam_types et on et.id = e.exam_type_id
    where upper(et.code) = 'DRILL'
      and e.slug like 'tka-smp-drill-bin-%'
      and lower(e.status) = 'active'
  ) <> 3 then
    raise exception 'TKA SMP BIN Drill materialization gate failed';
  end if;

  if (
    select count(*)
    from public.exams e
    join public.exam_types et on et.id = e.exam_type_id
    where upper(et.code) = 'DRILL'
      and e.slug like 'tka-smp-drill-mat-%'
      and lower(e.status) = 'active'
  ) <> 4 then
    raise exception 'TKA SMP MAT Drill materialization gate failed';
  end if;

  if exists (
    select 1
    from public.exams e
    join public.exam_types et on et.id = e.exam_type_id
    join public.exam_sections es on es.exam_id = e.id
    left join public.exam_question_items eqi
      on eqi.exam_id = e.id
     and eqi.section_id = es.id
    where upper(et.code) = 'DRILL'
      and lower(e.status) = 'active'
      and (
        e.slug like 'tka-smp-drill-bin-%'
        or e.slug like 'tka-smp-drill-mat-%'
      )
    group by e.id, es.id, es.question_count
    having es.question_count <> 10 or count(eqi.id) <> 10
  ) then
    raise exception 'TKA SMP Drill frozen item gate failed';
  end if;
end;
$migration$;

create or replace function public.start_tka_smp_drill(
  p_subject_code text,
  p_knowledge_node_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
  if v_user is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select p.id, t.id
    into v_program_id, v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    raise exception 'TKA_SMP_TRACK_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.user_tracks ut
    where ut.user_id = v_user
      and ut.track_id = v_track_id
      and lower(ut.status) = 'active'
  ) then
    raise exception 'ACTIVE_USER_TRACK_REQUIRED';
  end if;

  select s.id, s.code
    into v_subject_id, v_subject_code
  from public.subjects s
  where s.track_id = v_track_id
    and upper(s.code) = upper(btrim(p_subject_code))
  limit 1;

  if v_subject_id is null then
    raise exception 'DRILL_SUBJECT_INVALID';
  end if;

  select kn.id, kn.name, kn.slug
    into v_node_id, v_node_name, v_node_slug
  from public.knowledge_nodes kn
  where kn.subject_id = v_subject_id
    and lower(kn.status) = 'active'
    and lower(btrim(kn.name)) = lower(btrim(p_knowledge_node_name))
  limit 1;

  if v_node_id is null then
    raise exception 'DRILL_KNOWLEDGE_NODE_INVALID';
  end if;

  v_exam_slug := 'tka-smp-drill-' || lower(v_subject_code) || '-' || v_node_slug;

  select e.id, e.required_feature_id, e.duration_seconds
    into v_exam_id, v_feature_id, v_duration_seconds
  from public.exams e
  join public.exam_types et on et.id = e.exam_type_id
  where e.program_id = v_program_id
    and e.track_id = v_track_id
    and upper(et.code) = 'DRILL'
    and e.slug = v_exam_slug
    and lower(e.status) = 'active'
  limit 1;

  if v_exam_id is null then
    raise exception 'DRILL_EXAM_NOT_CONFIGURED';
  end if;

  if v_feature_id is null then
    raise exception 'DRILL_ENTITLEMENT_FEATURE_MISSING';
  end if;

  select ea.id
    into v_existing_attempt_id
  from public.exam_attempts ea
  where ea.user_id = v_user
    and ea.exam_id = v_exam_id
    and lower(ea.status) = 'in_progress'
  order by ea.attempt_number desc
  limit 1;

  if v_existing_attempt_id is null then
    select count(*)::integer
      into v_used_attempts
    from public.exam_attempts ea
    where ea.user_id = v_user
      and ea.exam_id = v_exam_id;

    if v_used_attempts >= 1 then
      select exists (
        select 1
        from public.entitlements en
        where en.user_id = v_user
          and en.feature_id = v_feature_id
          and lower(en.status) = 'active'
          and en.starts_at <= now()
          and (en.expires_at is null or en.expires_at > now())
          and (en.usage_limit is null or en.usage_count < en.usage_limit)
      ) into v_has_entitlement;

      if not v_has_entitlement then
        raise exception 'ENTITLEMENT_REQUIRED';
      end if;
    end if;
  end if;

  v_payload := app_private.start_exam_attempt_for_user(v_exam_id, v_user);
  v_attempt_id := nullif(v_payload ->> 'attempt_id', '')::uuid;

  if v_attempt_id is null then
    raise exception 'DRILL_ATTEMPT_START_FAILED';
  end if;

  update public.exam_attempts ea
     set metadata = coalesce(ea.metadata, '{}'::jsonb) || jsonb_build_object(
       'schemaVersion', 2,
       'practiceKind', 'drill',
       'programCode', 'TKA',
       'trackCode', 'SMP',
       'subjectCode', v_subject_code,
       'knowledgeNode', v_node_name,
       'durationSeconds', coalesce(v_duration_seconds, 900),
       'examSlug', v_exam_slug
     ),
     updated_at = now()
   where ea.id = v_attempt_id
     and ea.user_id = v_user;

  return v_payload || jsonb_build_object(
    'subject_code', v_subject_code,
    'knowledge_node_id', v_node_id,
    'knowledge_node_name', v_node_name,
    'exam_slug', v_exam_slug
  );
end;
$function$;

revoke all on function public.start_tka_smp_drill(text, text) from public;
revoke all on function public.start_tka_smp_drill(text, text) from anon;
grant execute on function public.start_tka_smp_drill(text, text) to authenticated;

-- The projection trigger is internal-only. Keep this explicit here as defense in
-- depth even when the preceding hardening migration has already run.
revoke all on function app_private.refresh_tka_smp_drill_projection_after_attempt() from public;
revoke all on function app_private.refresh_tka_smp_drill_projection_after_attempt() from anon;
revoke all on function app_private.refresh_tka_smp_drill_projection_after_attempt() from authenticated;