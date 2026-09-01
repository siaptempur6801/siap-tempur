insert into public.feature_flags(key,name,enabled,rollout_percentage,config)
values (
  'tka.smp.monetization_enforcement',
  'TKA SMP Monetization Enforcement',
  false,
  0,
  jsonb_build_object('program','TKA','track','SMP','milestone',4,'mode','dark_launch')
)
on conflict (key) do update set
  name=excluded.name,
  config=coalesce(public.feature_flags.config,'{}'::jsonb) || excluded.config;

create or replace function app_private.start_exam_attempt_for_user(p_exam_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_attempt_id uuid := gen_random_uuid();
  v_attempt_number integer;
  v_attempt_limit integer;
  v_exam_status text;
  v_track_id uuid;
  v_access_type text;
  v_required_feature_id uuid;
  v_program_code text;
  v_track_code text;
  v_monetization_enforced boolean := false;
  v_has_entitlement boolean := false;
  v_bypass_attempt_limit boolean := false;
  v_used_attempts integer := 0;
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

  select e.status,e.attempt_limit,e.track_id,e.access_type,e.required_feature_id,pr.code,tr.code
    into v_exam_status,v_attempt_limit,v_track_id,v_access_type,v_required_feature_id,v_program_code,v_track_code
  from public.exams e
  join public.tracks tr on tr.id=e.track_id
  join public.programs pr on pr.id=tr.program_id
  where e.id=p_exam_id;
  if not found then raise exception 'Exam not found'; end if;
  if v_exam_status <> 'active' then raise exception 'Exam is not active'; end if;

  if not exists(
    select 1 from public.user_tracks
    where user_id=p_user_id and track_id=v_track_id and status='active'
  ) then
    raise exception 'Active user track required';
  end if;

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

  if v_program_code='TKA' and v_track_code='SMP' then
    select coalesce(ff.enabled,false)
      into v_monetization_enforced
    from public.feature_flags ff
    where ff.key='tka.smp.monetization_enforcement';
    v_monetization_enforced := coalesce(v_monetization_enforced,false);
  end if;

  if v_monetization_enforced then
    v_access_type := upper(coalesce(v_access_type,'FREE'));

    if v_access_type in ('PREMIUM','FREEMIUM') then
      if v_required_feature_id is null then
        raise exception 'Exam monetization configuration requires required_feature_id';
      end if;

      select exists(
        select 1
        from public.entitlements en
        where en.user_id=p_user_id
          and en.feature_id=v_required_feature_id
          and lower(en.status)='active'
          and en.starts_at <= now()
          and (en.expires_at is null or en.expires_at > now())
          and (en.usage_limit is null or en.usage_count < en.usage_limit)
      ) into v_has_entitlement;
    end if;

    if v_access_type='PREMIUM' then
      if not v_has_entitlement then
        raise exception 'ENTITLEMENT_REQUIRED';
      end if;
      v_bypass_attempt_limit := true;
    elsif v_access_type='FREEMIUM' then
      if v_has_entitlement then
        v_bypass_attempt_limit := true;
      else
        select count(*)::integer into v_used_attempts
        from public.exam_attempts ea
        where ea.exam_id=p_exam_id and ea.user_id=p_user_id;

        if v_used_attempts >= coalesce(v_attempt_limit,1) then
          raise exception 'ENTITLEMENT_REQUIRED';
        end if;
      end if;
    end if;
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

  if v_attempt_limit is not null
     and v_attempt_number > v_attempt_limit
     and not v_bypass_attempt_limit then
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
      'questionCount',v_expected_count,
      'monetizationEnforced',v_monetization_enforced,
      'entitlementBypass',v_bypass_attempt_limit
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
    'questionCount',v_expected_count,
    'monetizationEnforced',v_monetization_enforced,
    'entitlementBypass',v_bypass_attempt_limit
  ));

  return jsonb_build_object(
    'attempt_id',v_attempt_id,
    'attempt_number',v_attempt_number,
    'status','in_progress',
    'active_section_id',v_first_section,
    'resumed',false
  );
end;
$function$;

revoke all on function app_private.start_exam_attempt_for_user(uuid,uuid) from public,anon,authenticated;
