-- Keep distribution-context attempt limits aligned with the contextual start contract.
-- Non-direct access is granted by its distribution and must not consume personal pass quotas.
create or replace function app_private.start_exam_attempt_for_context(p_exam_id uuid, p_user_id uuid, p_context jsonb)
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
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_token_cost integer;
  v_program_code text;
  v_track_code text;
  v_exam_type_code text;
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
  v_context_type text := upper(coalesce(p_context->>'type','DIRECT'));
  v_event_id uuid := nullif(p_context->>'event_id','')::uuid;
  v_assignment_id uuid := nullif(p_context->>'assignment_id','')::uuid;
  v_event_registration_id uuid;
  v_event_session_id uuid;
  v_context_starts_at timestamptz;
  v_context_ends_at timestamptz;
  v_organization_id uuid;
  v_batch_id uuid;
  v_participant_id uuid;
begin
  if not exists(select 1 from public.profiles where id=p_user_id and lower(coalesce(status,''))='active') then
    raise exception 'Active user profile not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text || ':' || v_context_type || ':' || coalesce(v_event_id::text,v_assignment_id::text,''),0));

  select e.status,e.attempt_limit,e.track_id,e.access_type,e.required_feature_id,
         e.starts_at,e.ends_at,e.token_cost,pr.code,tr.code,et.code
    into v_exam_status,v_attempt_limit,v_track_id,v_access_type,v_required_feature_id,
         v_starts_at,v_ends_at,v_token_cost,v_program_code,v_track_code,v_exam_type_code
  from public.exams e
  join public.tracks tr on tr.id=e.track_id
  join public.programs pr on pr.id=tr.program_id
  join public.exam_types et on et.id=e.exam_type_id
  where e.id=p_exam_id;
  if not found then raise exception 'Exam not found'; end if;

  if upper(coalesce(v_program_code,'')) <> 'TKA'
     or upper(coalesce(v_track_code,'')) <> 'SMP' then
    raise exception 'TKA SMP exam required';
  end if;

  if lower(coalesce(v_exam_status,'')) not in ('active','scheduled') then
    raise exception 'Exam is not active';
  end if;
  if v_starts_at is not null and v_starts_at > now() then
    raise exception 'Exam has not started';
  end if;
  if v_ends_at is not null and v_ends_at < now() then
    raise exception 'Exam has ended';
  end if;

  if coalesce(v_token_cost,0) <> 0 then
    raise exception 'TKA SMP exams must use Tempur Pass access';
  end if;

  if v_context_type not in ('DIRECT','EVENT','ORGANIZATION') then
    raise exception 'Invalid access context';
  end if;

  if v_context_type = 'EVENT' then
    if v_event_id is null then raise exception 'Event context requires event_id'; end if;
    select er.id, er.session_id, es.starts_at, es.ends_at
      into v_event_registration_id, v_event_session_id, v_context_starts_at, v_context_ends_at
      from public.event_registrations er
      join public.event_sessions es on es.id=er.session_id
      join public.events ev on ev.id=er.event_id
     where er.user_id=p_user_id and er.event_id=v_event_id
       and lower(er.status) in ('registered','started','completed','paid')
       and lower(ev.status) in ('scheduled','live','active')
       and ev.ends_at>now()
       and es.exam_id=p_exam_id
     order by er.created_at desc limit 1;
    if v_event_registration_id is null then raise exception 'Event registration required'; end if;
    if v_context_starts_at > now() or v_context_ends_at <= now() then
      raise exception 'Event session is outside its access window';
    end if;
  elsif v_context_type = 'ORGANIZATION' then
    if v_assignment_id is null then raise exception 'Organization context requires assignment_id'; end if;
    select a.organization_id,a.batch_id,p.id
      into v_organization_id,v_batch_id,v_participant_id
      from public.organization_exam_assignments a
      join public.organization_batches b on b.id=a.batch_id and b.organization_id=a.organization_id
      join public.organizations o on o.id=a.organization_id
      join public.organization_participants p on p.batch_id=b.id and p.organization_id=o.id
     where a.id=v_assignment_id and a.exam_id=p_exam_id and a.is_active
       and lower(b.status)='active' and lower(o.status)='active'
       and ((b.starts_at is null or b.starts_at<=now())
         or exists(select 1 from public.exam_attempts ea where ea.user_id=p_user_id
            and ea.assignment_id=a.id and ea.source='organization'
            and lower(ea.status) in ('created','in_progress')))
       and ((b.ends_at is null or b.ends_at>=now())
         or exists(select 1 from public.exam_attempts ea where ea.user_id=p_user_id
            and ea.assignment_id=a.id and ea.source='organization'
            and lower(ea.status) in ('created','in_progress')))
       and ((a.starts_at is null or a.starts_at<=now())
         or exists(select 1 from public.exam_attempts ea where ea.user_id=p_user_id
            and ea.assignment_id=a.id and ea.source='organization'
            and lower(ea.status) in ('created','in_progress')))
       and ((a.due_at is null or a.due_at>=now())
         or exists(select 1 from public.exam_attempts ea where ea.user_id=p_user_id
            and ea.assignment_id=a.id and ea.source='organization'
            and lower(ea.status) in ('created','in_progress')))
       and p.user_id=p_user_id and lower(p.status) in ('active','registered')
     limit 1;
    if v_participant_id is null then raise exception 'Active organization assignment required'; end if;
  elsif not exists(
    select 1 from public.user_tracks
    where user_id=p_user_id and track_id=v_track_id and lower(status)='active'
  ) then
    raise exception 'Active user track required';
  end if;

  -- Distribution contexts grant access themselves; pass/attempt limits belong to Direct.
  if v_context_type='DIRECT' then
    null;
  else
    v_monetization_enforced := false;
    v_bypass_attempt_limit := true;
  end if;

  -- Idempotency is scoped to the exact distribution context.
  select ea.id,ea.attempt_number
    into v_existing_attempt_id,v_existing_attempt_number
  from public.exam_attempts ea
  where ea.exam_id=p_exam_id and ea.user_id=p_user_id and lower(ea.status)='in_progress'
    and case v_context_type
      when 'DIRECT' then ea.source='b2c' and ea.assignment_id is null
        and coalesce(ea.metadata->>'eventId','')=''
        and upper(coalesce(ea.metadata->>'accessContext','DIRECT'))='DIRECT'
      when 'EVENT' then ea.source='b2c' and ea.assignment_id is null
        and ea.metadata->>'eventId'=v_event_id::text
      when 'ORGANIZATION' then ea.source='organization' and ea.assignment_id=v_assignment_id
        and ea.participant_id=v_participant_id
      else false
    end
  order by ea.attempt_number desc
  limit 1;

  if v_existing_attempt_id is not null then
    select ass.section_id into v_first_section
    from public.attempt_section_states ass
    join public.exam_sections es on es.id=ass.section_id
    where ass.attempt_id=v_existing_attempt_id and lower(ass.status)='active'
    order by es.sort_order limit 1;

    return jsonb_build_object(
      'attempt_id',v_existing_attempt_id,
      'attempt_number',v_existing_attempt_number,
      'status','in_progress',
      'active_section_id',v_first_section,
      'resumed',true
    );
  end if;

  if v_context_type='DIRECT' then
    select coalesce(ff.enabled,false)
      into v_monetization_enforced
    from public.feature_flags ff
    where ff.key='tka.smp.monetization_enforcement';
    v_monetization_enforced := coalesce(v_monetization_enforced,false);
  end if;

  if v_monetization_enforced and v_context_type='DIRECT' then
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

  if v_context_type='DIRECT' and v_attempt_limit is not null
     and v_attempt_number > v_attempt_limit
     and not v_bypass_attempt_limit then
    raise exception 'Attempt limit reached';
  end if;

  v_seed := v_attempt_id::text;

  insert into public.exam_attempts(
    id,exam_id,user_id,attempt_number,status,started_at,source,organization_id,batch_id,assignment_id,participant_id,metadata,created_at,updated_at
  ) values (
    v_attempt_id,p_exam_id,p_user_id,v_attempt_number,'in_progress',now(),
    case when v_context_type='ORGANIZATION' then 'organization' else 'b2c' end,
    v_organization_id,v_batch_id,v_assignment_id,v_participant_id,
    jsonb_build_object(
      'orderSeed',v_seed,
      'engineVersion','tka-section-rpc-v2',
      'questionCount',v_expected_count,
      'programCode',v_program_code,
      'trackCode',v_track_code,
      'examTypeCode',v_exam_type_code,
      'practiceKind',case
        when v_context_type='EVENT' then 'event'
        when upper(v_exam_type_code)='MINI_TRYOUT' then 'mini_tryout'
        when upper(v_exam_type_code)='DRILL' then 'drill'
        else 'full_tryout'
      end,
      'monetizationEnforced',v_monetization_enforced,
      'entitlementBypass',v_bypass_attempt_limit,
      'tokenCost',0
    ) || jsonb_strip_nulls(jsonb_build_object(
      'accessContext',lower(v_context_type),
      'eventId',v_event_id,
      'eventSessionId',v_event_session_id,
      'eventRegistrationId',v_event_registration_id,
      'assignmentId',v_assignment_id,
      'organizationId',v_organization_id,
      'batchId',v_batch_id,
      'participantId',v_participant_id
    )),now(),now()
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
  where ass.attempt_id=v_attempt_id and lower(ass.status)='active'
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
    'entitlementBypass',v_bypass_attempt_limit,
    'tokenCost',0
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
