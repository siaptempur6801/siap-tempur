-- Harden the user-facing TKA SMP full-exam RPC workers.
-- 1) An authenticated profile must have an active user_track for the exam track.
-- 2) Submission is allowed only after every section has been completed through
--    complete_exam_section, so a direct RPC call cannot skip a locked section.

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
  v_first_section uuid;
  v_seed text;
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

  select count(*) into v_item_count from public.exam_question_items where exam_id=p_exam_id;
  if v_item_count <> 60 then raise exception 'Exam must contain exactly 60 generated questions'; end if;

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
    jsonb_build_object('orderSeed',v_seed,'engineVersion','tka-smp-e2e-v1'),now(),now()
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
    join public.exam_sections es on es.id=eqi.section_id
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
  values(v_attempt_id,'attempt_started',jsonb_build_object('attemptNumber',v_attempt_number,'activeSectionId',v_first_section));

  return jsonb_build_object('attempt_id',v_attempt_id,'attempt_number',v_attempt_number,'status','in_progress','active_section_id',v_first_section);
end;
$$;

create or replace function app_private.submit_exam_attempt_for_user(p_user_id uuid,p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
begin
  select started_at into v_started
  from public.exam_attempts
  where id=p_attempt_id and user_id=p_user_id and status='in_progress'
  for update;
  if v_started is null then raise exception 'In-progress attempt not found'; end if;

  if exists(
    select 1 from public.attempt_section_states
    where attempt_id=p_attempt_id and status <> 'completed'
  ) then
    raise exception 'ALL_SECTIONS_MUST_BE_COMPLETED';
  end if;

  v_score := app_private.score_exam_attempt(p_attempt_id);
  select coalesce(sum(duration_used_seconds),0) into v_duration
  from public.attempt_section_states where attempt_id=p_attempt_id and status='completed';

  update public.exam_attempts
     set status='completed',submitted_at=now(),duration_used_seconds=v_duration,
         total_score=(v_score->>'raw_score')::numeric,
         percentage=(v_score->>'percentage')::numeric,
         passed=null,last_saved_at=now(),updated_at=now()
   where id=p_attempt_id;

  insert into public.attempt_events(attempt_id,event_type,metadata)
  values(p_attempt_id,'attempt_submitted',v_score);

  return jsonb_build_object('attempt_id',p_attempt_id,'status','completed','raw_score',(v_score->>'raw_score')::numeric,'percentage',(v_score->>'percentage')::numeric,'duration_used_seconds',v_duration);
end;
$$;
