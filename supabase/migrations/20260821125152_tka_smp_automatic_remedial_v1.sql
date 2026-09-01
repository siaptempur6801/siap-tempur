-- Milestone 3 / Slice 3.3: automatic remedial sessions + mastery updates from successful correction practice.

alter table public.remedial_sessions
  add column if not exists updated_at timestamptz not null default now();

alter table public.remedial_session_items
  add column if not exists user_wrong_question_id uuid references public.user_wrong_questions(id) on delete set null,
  add column if not exists position integer,
  add column if not exists status text not null default 'pending',
  add column if not exists review_count integer not null default 0,
  add column if not exists best_score numeric not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.wrong_question_reviews
  add column if not exists review_source text not null default 'repeat_wrong',
  add column if not exists remedial_session_item_id uuid references public.remedial_session_items(id) on delete set null;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.remedial_sessions'::regclass
      and conname = 'remedial_sessions_status_check'
  ) then
    alter table public.remedial_sessions
      add constraint remedial_sessions_status_check
      check (status in ('active','completed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.remedial_session_items'::regclass
      and conname = 'remedial_session_items_position_check'
  ) then
    alter table public.remedial_session_items
      add constraint remedial_session_items_position_check
      check (position is null or position >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.remedial_session_items'::regclass
      and conname = 'remedial_session_items_status_check'
  ) then
    alter table public.remedial_session_items
      add constraint remedial_session_items_status_check
      check (status in ('pending','completed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.remedial_session_items'::regclass
      and conname = 'remedial_session_items_review_count_check'
  ) then
    alter table public.remedial_session_items
      add constraint remedial_session_items_review_count_check
      check (review_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.remedial_session_items'::regclass
      and conname = 'remedial_session_items_best_score_check'
  ) then
    alter table public.remedial_session_items
      add constraint remedial_session_items_best_score_check
      check (best_score >= 0 and best_score <= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wrong_question_reviews'::regclass
      and conname = 'wrong_question_reviews_source_check'
  ) then
    alter table public.wrong_question_reviews
      add constraint wrong_question_reviews_source_check
      check (review_source in ('repeat_wrong','remedial'));
  end if;
end
$constraints$;

create unique index if not exists uq_remedial_sessions_source_attempt
  on public.remedial_sessions(source_attempt_id)
  where source_attempt_id is not null;

create unique index if not exists uq_remedial_session_items_session_question
  on public.remedial_session_items(session_id, question_id);

create unique index if not exists uq_remedial_session_items_session_position
  on public.remedial_session_items(session_id, position)
  where position is not null;

create index if not exists idx_remedial_sessions_user_status_created
  on public.remedial_sessions(user_id, status, created_at desc);

create index if not exists idx_remedial_sessions_track_id
  on public.remedial_sessions(track_id);

create index if not exists idx_remedial_session_items_wrong_question
  on public.remedial_session_items(user_wrong_question_id)
  where user_wrong_question_id is not null;

create index if not exists idx_wrong_question_reviews_remedial_item
  on public.wrong_question_reviews(remedial_session_item_id)
  where remedial_session_item_id is not null;

create or replace function app_private.sync_tka_smp_remedial_sessions_for_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_items_synced integer := 0;
  v_sessions_completed integer := 0;
begin
  update public.remedial_session_items rsi
     set status = 'completed',
         best_score = greatest(rsi.best_score, 1),
         completed_at = coalesce(rsi.completed_at, uwq.resolved_at, now()),
         updated_at = now()
    from public.remedial_sessions rs,
         public.user_wrong_questions uwq
   where rsi.session_id = rs.id
     and rsi.user_wrong_question_id = uwq.id
     and rs.user_id = p_user_id
     and rsi.status = 'pending'
     and uwq.status = 'resolved';

  get diagnostics v_items_synced = row_count;

  update public.remedial_sessions rs
     set status = 'completed',
         completed_at = coalesce(rs.completed_at, now()),
         updated_at = now()
   where rs.user_id = p_user_id
     and rs.status = 'active'
     and exists (
       select 1
       from public.remedial_session_items rsi
       where rsi.session_id = rs.id
     )
     and not exists (
       select 1
       from public.remedial_session_items rsi
       where rsi.session_id = rs.id
         and rsi.status = 'pending'
     );

  get diagnostics v_sessions_completed = row_count;

  return jsonb_build_object(
    'items_synced', v_items_synced,
    'sessions_completed', v_sessions_completed
  );
end;
$function$;

revoke all on function app_private.sync_tka_smp_remedial_sessions_for_user(uuid)
  from public, anon, authenticated;

create or replace function app_private.refresh_tka_smp_remedial_session_for_attempt(
  p_user_id uuid,
  p_source_attempt_id uuid,
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_track_id uuid;
  v_session_id uuid;
  v_existing_status text;
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 20));
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
begin
  select e.track_id
    into v_track_id
  from public.exam_attempts ea
  join public.exams e on e.id = ea.exam_id
  join public.tracks t on t.id = e.track_id
  join public.programs p on p.id = t.program_id
  where ea.id = p_source_attempt_id
    and ea.user_id = p_user_id
    and lower(ea.status) = 'completed'
    and upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    return jsonb_build_object(
      'applied', false,
      'reason', 'COMPLETED_TKA_SMP_SOURCE_ATTEMPT_NOT_FOUND',
      'source_attempt_id', p_source_attempt_id
    );
  end if;

  perform app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, p_source_attempt_id);
  perform app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);

  select rs.id, rs.status
    into v_session_id, v_existing_status
  from public.remedial_sessions rs
  where rs.source_attempt_id = p_source_attempt_id
    and rs.user_id = p_user_id
  limit 1;

  if v_session_id is not null then
    select
      count(*)::integer,
      count(*) filter (where rsi.status = 'completed')::integer,
      count(*) filter (where rsi.status = 'pending')::integer
      into v_total, v_completed, v_pending
    from public.remedial_session_items rsi
    where rsi.session_id = v_session_id;

    return jsonb_build_object(
      'applied', true,
      'created', false,
      'session_id', v_session_id,
      'status', v_existing_status,
      'total_items', v_total,
      'completed_items', v_completed,
      'pending_items', v_pending,
      'source_attempt_id', p_source_attempt_id
    );
  end if;

  if not exists (
    select 1
    from public.attempt_questions aq
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
    join public.user_wrong_questions uwq
      on uwq.user_id = p_user_id
     and uwq.track_id = v_track_id
     and uwq.question_id = aq.question_id
     and uwq.status = 'open'
    where aq.attempt_id = p_source_attempt_id
      and (aa.id is null or aa.is_correct is not true)
  ) then
    return jsonb_build_object(
      'applied', false,
      'reason', 'NO_OPEN_GAPS',
      'source_attempt_id', p_source_attempt_id
    );
  end if;

  insert into public.remedial_sessions (
    user_id,
    track_id,
    source_attempt_id,
    status,
    created_at,
    updated_at
  ) values (
    p_user_id,
    v_track_id,
    p_source_attempt_id,
    'active',
    now(),
    now()
  )
  on conflict (source_attempt_id) where source_attempt_id is not null do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select rs.id
      into v_session_id
    from public.remedial_sessions rs
    where rs.source_attempt_id = p_source_attempt_id
      and rs.user_id = p_user_id
    limit 1;
  end if;

  if v_session_id is null then
    raise exception 'REMEDIAL_SESSION_CREATE_FAILED';
  end if;

  if not exists (
    select 1 from public.remedial_session_items rsi where rsi.session_id = v_session_id
  ) then
    with source_gaps as (
      select
        aq.question_id,
        uwq.id as user_wrong_question_id,
        uwq.knowledge_node_id,
        q.subject_id,
        coalesce(s.code, s.id::text) as subject_order,
        aq.position as attempt_position,
        case when aa.id is null then 'source_attempt_unanswered' else 'source_attempt_wrong' end as reason
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      left join public.subjects s on s.id = q.subject_id
      left join public.attempt_answers aa on aa.attempt_question_id = aq.id
      join public.user_wrong_questions uwq
        on uwq.user_id = p_user_id
       and uwq.track_id = v_track_id
       and uwq.question_id = aq.question_id
       and uwq.status = 'open'
      where aq.attempt_id = p_source_attempt_id
        and (aa.id is null or aa.is_correct is not true)
    ), ranked as (
      select
        sg.*,
        row_number() over (
          partition by sg.subject_id
          order by sg.attempt_position, sg.question_id
        ) as subject_rank
      from source_gaps sg
    ), chosen as (
      select *
      from ranked
      order by subject_rank, subject_order, attempt_position, question_id
      limit v_limit
    ), positioned as (
      select
        c.*,
        row_number() over (
          order by c.subject_rank, c.subject_order, c.attempt_position, c.question_id
        )::integer as remedial_position
      from chosen c
    )
    insert into public.remedial_session_items (
      session_id,
      question_id,
      knowledge_node_id,
      reason,
      user_wrong_question_id,
      position,
      status,
      review_count,
      best_score,
      updated_at
    )
    select
      v_session_id,
      p.question_id,
      p.knowledge_node_id,
      p.reason,
      p.user_wrong_question_id,
      p.remedial_position,
      'pending',
      0,
      0,
      now()
    from positioned p
    order by p.remedial_position
    on conflict (session_id, question_id) do nothing;
  end if;

  select
    count(*)::integer,
    count(*) filter (where rsi.status = 'completed')::integer,
    count(*) filter (where rsi.status = 'pending')::integer
    into v_total, v_completed, v_pending
  from public.remedial_session_items rsi
  where rsi.session_id = v_session_id;

  return jsonb_build_object(
    'applied', true,
    'created', true,
    'session_id', v_session_id,
    'status', case when v_pending = 0 then 'completed' else 'active' end,
    'total_items', v_total,
    'completed_items', v_completed,
    'pending_items', v_pending,
    'source_attempt_id', p_source_attempt_id
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_remedial_session_for_attempt(uuid, uuid, integer)
  from public, anon, authenticated;

create or replace function app_private.get_tka_smp_remedial_payload_for_user(
  p_user_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session public.remedial_sessions%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
begin
  perform app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);

  select rs.*
    into v_session
  from public.remedial_sessions rs
  join public.tracks t on t.id = rs.track_id
  join public.programs p on p.id = t.program_id
  where rs.id = p_session_id
    and rs.user_id = p_user_id
    and upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP';

  if v_session.id is null then
    return jsonb_build_object('session', null, 'items', '[]'::jsonb);
  end if;

  select
    count(*)::integer,
    count(*) filter (where rsi.status = 'completed')::integer,
    count(*) filter (where rsi.status = 'pending')::integer
    into v_total, v_completed, v_pending
  from public.remedial_session_items rsi
  where rsi.session_id = v_session.id;

  select coalesce(jsonb_agg(item order by position), '[]'::jsonb)
    into v_items
  from (
    select
      rsi.position,
      jsonb_build_object(
        'id', rsi.id,
        'position', rsi.position,
        'status', rsi.status,
        'review_count', rsi.review_count,
        'best_score', rsi.best_score,
        'reason', rsi.reason,
        'wrong_question_id', uwq.id,
        'question_id', rsi.question_id,
        'subject_id', uwq.subject_id,
        'failure_count', uwq.failure_count,
        'wrong_count', uwq.wrong_count,
        'unanswered_count', uwq.unanswered_count,
        'latest_outcome', uwq.latest_outcome,
        'question_snapshot', jsonb_build_object(
          'question', uwq.question_snapshot->'question',
          'stimulus', uwq.question_snapshot->'stimulus',
          'options', coalesce((
            select jsonb_agg(
              (option_row - 'is_correct' - 'score')
              order by coalesce((option_row->>'sort_order')::integer, 0), option_row->>'id'
            )
            from jsonb_array_elements(coalesce(uwq.question_snapshot->'options', '[]'::jsonb)) option_row
          ), '[]'::jsonb),
          'explanations', '[]'::jsonb
        )
      ) as item
    from public.remedial_session_items rsi
    join public.user_wrong_questions uwq on uwq.id = rsi.user_wrong_question_id
    where rsi.session_id = v_session.id
    order by rsi.position
  ) payload_rows;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'source_attempt_id', v_session.source_attempt_id,
      'status', v_session.status,
      'total_items', v_total,
      'completed_items', v_completed,
      'pending_items', v_pending,
      'created_at', v_session.created_at,
      'completed_at', v_session.completed_at
    ),
    'items', v_items
  );
end;
$function$;

revoke all on function app_private.get_tka_smp_remedial_payload_for_user(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.get_tka_smp_remedial_for_attempt(
  p_source_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select rs.id
    into v_session_id
  from public.remedial_sessions rs
  where rs.user_id = v_user
    and rs.source_attempt_id = p_source_attempt_id
  limit 1;

  if v_session_id is null then
    return jsonb_build_object('session', null, 'items', '[]'::jsonb);
  end if;

  return app_private.get_tka_smp_remedial_payload_for_user(v_user, v_session_id);
end;
$function$;

revoke all on function public.get_tka_smp_remedial_for_attempt(uuid) from public, anon;
grant execute on function public.get_tka_smp_remedial_for_attempt(uuid) to authenticated;

create or replace function public.get_tka_smp_remedial_session(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  return app_private.get_tka_smp_remedial_payload_for_user(v_user, p_session_id);
end;
$function$;

revoke all on function public.get_tka_smp_remedial_session(uuid) from public, anon;
grant execute on function public.get_tka_smp_remedial_session(uuid) to authenticated;

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
    select e.track_id
      into v_source_track_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    where ea.id = p_source_attempt_id
      and ea.user_id = p_user_id
      and lower(ea.status) = 'completed';

    if v_source_track_id is null then
      return jsonb_build_object('applied', false, 'reason', 'COMPLETED_SOURCE_ATTEMPT_NOT_FOUND');
    end if;

    if v_source_track_id <> v_track_id then
      return jsonb_build_object('applied', false, 'reason', 'TRACK_NOT_SUPPORTED');
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
    join public.attempt_questions aq on aq.attempt_id = ea.id
    join public.question_knowledge_nodes qkn
      on qkn.question_id = aq.question_id
     and qkn.relation_type = 'primary'
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
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
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
      and ats.subject_id is not null
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

create or replace function app_private.review_tka_smp_remedial_item_for_user(
  p_user_id uuid,
  p_session_id uuid,
  p_item_id uuid,
  p_option_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session public.remedial_sessions%rowtype;
  v_item public.remedial_session_items%rowtype;
  v_wrong public.user_wrong_questions%rowtype;
  v_evaluation jsonb;
  v_state jsonb;
  v_projection jsonb := null;
  v_sync jsonb;
  v_explanation text := '';
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
begin
  select *
    into v_session
  from public.remedial_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;

  if v_session.id is null then
    raise exception 'REMEDIAL_SESSION_NOT_FOUND';
  end if;

  select *
    into v_item
  from public.remedial_session_items
  where id = p_item_id
    and session_id = p_session_id
  for update;

  if v_item.id is null then
    raise exception 'REMEDIAL_ITEM_NOT_FOUND';
  end if;

  if v_item.status = 'completed' then
    raise exception 'REMEDIAL_ITEM_ALREADY_COMPLETED';
  end if;

  select *
    into v_wrong
  from public.user_wrong_questions
  where id = v_item.user_wrong_question_id
    and user_id = p_user_id
  for update;

  if v_wrong.id is null then
    raise exception 'REMEDIAL_WRONG_QUESTION_STATE_NOT_FOUND';
  end if;

  if v_wrong.status <> 'open' then
    perform app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);
    raise exception 'REMEDIAL_ITEM_ALREADY_RESOLVED';
  end if;

  v_evaluation := app_private.evaluate_wrong_question_selection(v_wrong.question_snapshot, p_option_ids);

  select coalesce(explanation_row->>'content', '')
    into v_explanation
  from jsonb_array_elements(coalesce(v_wrong.question_snapshot->'explanations', '[]'::jsonb)) explanation_row
  where coalesce(explanation_row->>'content', '') <> ''
  limit 1;

  insert into public.wrong_question_reviews (
    user_id,
    user_wrong_question_id,
    question_id,
    selected_option_ids,
    is_correct,
    score_awarded,
    review_source,
    remedial_session_item_id
  ) values (
    p_user_id,
    v_wrong.id,
    v_wrong.question_id,
    coalesce(p_option_ids, array[]::uuid[]),
    (v_evaluation->>'is_correct')::boolean,
    (v_evaluation->>'score_awarded')::numeric,
    'remedial',
    v_item.id
  );

  update public.remedial_session_items
     set review_count = review_count + 1,
         best_score = greatest(best_score, (v_evaluation->>'score_awarded')::numeric),
         status = case when (v_evaluation->>'is_correct')::boolean then 'completed' else status end,
         completed_at = case
           when (v_evaluation->>'is_correct')::boolean then coalesce(completed_at, now())
           else completed_at
         end,
         updated_at = now()
   where id = v_item.id;

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, null);

  if (v_evaluation->>'is_correct')::boolean then
    v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, null);
  end if;

  v_sync := app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);

  select
    count(*)::integer,
    count(*) filter (where status = 'completed')::integer,
    count(*) filter (where status = 'pending')::integer
    into v_total, v_completed, v_pending
  from public.remedial_session_items
  where session_id = p_session_id;

  return jsonb_build_object(
    'session_id', p_session_id,
    'item_id', p_item_id,
    'is_correct', (v_evaluation->>'is_correct')::boolean,
    'score_awarded', (v_evaluation->>'score_awarded')::numeric,
    'explanation', v_explanation,
    'total_items', v_total,
    'completed_items', v_completed,
    'pending_items', v_pending,
    'session_status', case when v_pending = 0 then 'completed' else 'active' end,
    'wrong_question_state', v_state,
    'learning_projection', v_projection,
    'remedial_sync', v_sync
  );
end;
$function$;

revoke all on function app_private.review_tka_smp_remedial_item_for_user(uuid, uuid, uuid, uuid[])
  from public, anon, authenticated;

create or replace function public.review_tka_smp_remedial_item(
  p_session_id uuid,
  p_item_id uuid,
  p_option_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  return app_private.review_tka_smp_remedial_item_for_user(
    v_user,
    p_session_id,
    p_item_id,
    p_option_ids
  );
end;
$function$;

revoke all on function public.review_tka_smp_remedial_item(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.review_tka_smp_remedial_item(uuid, uuid, uuid[]) to authenticated;

create or replace function app_private.review_wrong_question_for_user(
  p_user_id uuid,
  p_wrong_question_id uuid,
  p_option_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.user_wrong_questions%rowtype;
  v_evaluation jsonb;
  v_state jsonb;
  v_projection jsonb := null;
  v_sync jsonb;
  v_remaining integer;
  v_explanation text := '';
begin
  select *
    into v_row
  from public.user_wrong_questions
  where id = p_wrong_question_id
    and user_id = p_user_id
    and status = 'open'
  for update;

  if v_row.id is null then
    raise exception 'OPEN_WRONG_QUESTION_NOT_FOUND';
  end if;

  v_evaluation := app_private.evaluate_wrong_question_selection(v_row.question_snapshot, p_option_ids);

  select coalesce(explanation_row->>'content', '')
    into v_explanation
  from jsonb_array_elements(coalesce(v_row.question_snapshot->'explanations', '[]'::jsonb)) explanation_row
  where coalesce(explanation_row->>'content', '') <> ''
  limit 1;

  insert into public.wrong_question_reviews (
    user_id,
    user_wrong_question_id,
    question_id,
    selected_option_ids,
    is_correct,
    score_awarded,
    review_source
  ) values (
    p_user_id,
    v_row.id,
    v_row.question_id,
    coalesce(p_option_ids, array[]::uuid[]),
    (v_evaluation->>'is_correct')::boolean,
    (v_evaluation->>'score_awarded')::numeric,
    'repeat_wrong'
  );

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, null);

  if (v_evaluation->>'is_correct')::boolean then
    v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, null);
  end if;

  v_sync := app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);

  select count(*)::integer
    into v_remaining
  from public.user_wrong_questions
  where user_id = p_user_id
    and track_id = v_row.track_id
    and status = 'open';

  return jsonb_build_object(
    'wrong_question_id', v_row.id,
    'is_correct', (v_evaluation->>'is_correct')::boolean,
    'score_awarded', (v_evaluation->>'score_awarded')::numeric,
    'remaining_open', v_remaining,
    'explanation', v_explanation,
    'state', v_state,
    'learning_projection', v_projection,
    'remedial_sync', v_sync
  );
end;
$function$;

revoke all on function app_private.review_wrong_question_for_user(uuid, uuid, uuid[])
  from public, anon, authenticated;

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
  v_projection jsonb;
  v_wrong_state jsonb;
  v_remedial jsonb;
begin
  select started_at
    into v_started
  from public.exam_attempts
  where id = p_attempt_id
    and user_id = p_user_id
    and status = 'in_progress'
  for update;

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

  v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, p_attempt_id);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'learning_projection_refreshed', v_projection);

  v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, p_attempt_id);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

  v_remedial := app_private.refresh_tka_smp_remedial_session_for_attempt(p_user_id, p_attempt_id, 10);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'automatic_remedial_refreshed', v_remedial);

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'completed',
    'raw_score', (v_score->>'raw_score')::numeric,
    'percentage', (v_score->>'percentage')::numeric,
    'duration_used_seconds', v_duration,
    'learning_projection', v_projection,
    'wrong_question_state', v_wrong_state,
    'automatic_remedial', v_remedial
  );
end;
$function$;

revoke all on function app_private.submit_exam_attempt_for_user(uuid, uuid)
  from public, anon, authenticated;

-- Refresh mastery to include prior successful correction practice.
do $refresh_mastery$
declare
  r record;
begin
  for r in
    select distinct ea.user_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.tracks t on t.id = e.track_id
    join public.programs p on p.id = t.program_id
    where lower(ea.status) = 'completed'
      and upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
  loop
    perform app_private.refresh_tka_smp_learning_projection_for_user(r.user_id, null);
  end loop;
end
$refresh_mastery$;

-- Backfill one useful automatic remedial: the latest completed TKA SMP attempt per learner.
do $backfill_remedial$
declare
  r record;
begin
  for r in
    select distinct on (ea.user_id)
      ea.user_id,
      ea.id as attempt_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.tracks t on t.id = e.track_id
    join public.programs p on p.id = t.program_id
    where lower(ea.status) = 'completed'
      and upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
    order by ea.user_id, coalesce(ea.submitted_at, ea.updated_at, ea.created_at) desc, ea.id desc
  loop
    perform app_private.refresh_tka_smp_remedial_session_for_attempt(r.user_id, r.attempt_id, 10);
  end loop;
end
$backfill_remedial$;