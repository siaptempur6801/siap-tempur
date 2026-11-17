-- Milestone 3 / Slice 3.2: persistent wrong/unanswered question state + repeat-wrong mode.

create table if not exists public.user_wrong_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_track_id uuid not null references public.user_tracks(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  knowledge_node_id uuid references public.knowledge_nodes(id) on delete set null,
  source_attempt_question_id uuid references public.attempt_questions(id) on delete set null,
  last_source_attempt_id uuid references public.exam_attempts(id) on delete set null,
  question_snapshot jsonb not null,
  first_failed_at timestamptz not null,
  last_failed_at timestamptz not null,
  failure_count integer not null default 1 check (failure_count >= 1),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  unanswered_count integer not null default 0 check (unanswered_count >= 0),
  latest_outcome text not null check (latest_outcome in ('wrong','unanswered','correct')),
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track_id, question_id)
);

create index if not exists idx_user_wrong_questions_user_status_updated
  on public.user_wrong_questions(user_id, status, updated_at desc);
create index if not exists idx_user_wrong_questions_track_status
  on public.user_wrong_questions(track_id, status, updated_at desc);
create index if not exists idx_user_wrong_questions_question
  on public.user_wrong_questions(question_id);

create table if not exists public.wrong_question_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_wrong_question_id uuid not null references public.user_wrong_questions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_ids uuid[] not null default array[]::uuid[],
  is_correct boolean not null,
  score_awarded numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_wrong_question_reviews_user_created
  on public.wrong_question_reviews(user_id, created_at desc);
create index if not exists idx_wrong_question_reviews_wrong_question_created
  on public.wrong_question_reviews(user_wrong_question_id, created_at desc);

alter table public.user_wrong_questions enable row level security;
alter table public.wrong_question_reviews enable row level security;

revoke all on table public.user_wrong_questions from public, anon;
revoke all on table public.wrong_question_reviews from public, anon;
revoke all on table public.user_wrong_questions from authenticated;
revoke all on table public.wrong_question_reviews from authenticated;
grant select on table public.user_wrong_questions to authenticated;
grant select on table public.wrong_question_reviews to authenticated;

drop policy if exists user_wrong_questions_select_own on public.user_wrong_questions;
create policy user_wrong_questions_select_own
on public.user_wrong_questions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.has_permission('admin.access'::text))
);

drop policy if exists wrong_question_reviews_select_own on public.wrong_question_reviews;
create policy wrong_question_reviews_select_own
on public.wrong_question_reviews
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.has_permission('admin.access'::text))
);

create or replace function app_private.evaluate_wrong_question_selection(
  p_snapshot jsonb,
  p_option_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_type text;
  v_selected uuid[] := coalesce(p_option_ids, array[]::uuid[]);
  v_total_correct integer := 0;
  v_selected_correct integer := 0;
  v_total_groups integer := 0;
  v_correct_groups integer := 0;
  v_correct boolean := false;
  v_score numeric := 0;
begin
  if p_snapshot is null then
    raise exception 'WRONG_QUESTION_SNAPSHOT_NOT_FOUND';
  end if;

  v_type := coalesce(p_snapshot->'question'->>'question_type', 'single_choice');

  if cardinality(v_selected) = 0 then
    raise exception 'ANSWER_REQUIRED';
  end if;

  if exists (
    select 1
    from unnest(v_selected) selected_id
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) option_row
      where (option_row->>'id')::uuid = selected_id
    )
  ) then
    raise exception 'INVALID_OPTION_SELECTION';
  end if;

  if v_type = 'single_choice' then
    if cardinality(v_selected) <> 1 then
      raise exception 'SINGLE_CHOICE_REQUIRES_ONE_OPTION';
    end if;

    select coalesce(bool_or((o->>'is_correct')::boolean) filter (where (o->>'id')::uuid = any(v_selected)), false)
      into v_correct
    from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) o;
    v_score := case when v_correct then 1 else 0 end;

  elsif v_type = 'multiple_choice' then
    select
      count(*) filter (where (o->>'is_correct')::boolean),
      count(*) filter (where (o->>'is_correct')::boolean and (o->>'id')::uuid = any(v_selected))
      into v_total_correct, v_selected_correct
    from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) o;

    v_correct := cardinality(v_selected) = v_total_correct and v_selected_correct = v_total_correct;
    v_score := case when v_correct then 1 else 0 end;

  elsif v_type = 'category' then
    select
      count(distinct o->>'response_group'),
      count(distinct o->>'response_group') filter (
        where (o->>'is_correct')::boolean and (o->>'id')::uuid = any(v_selected)
      )
      into v_total_groups, v_correct_groups
    from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) o;

    v_score := case when v_total_groups > 0 then v_correct_groups::numeric / v_total_groups::numeric else 0 end;
    v_correct := v_total_groups > 0
      and v_correct_groups = v_total_groups
      and cardinality(v_selected) = v_total_groups;
  else
    raise exception 'UNSUPPORTED_QUESTION_TYPE';
  end if;

  return jsonb_build_object(
    'is_correct', v_correct,
    'score_awarded', round(v_score, 6),
    'question_type', v_type
  );
end;
$function$;

revoke all on function app_private.evaluate_wrong_question_selection(jsonb, uuid[]) from public, anon, authenticated;

create or replace function app_private.refresh_tka_smp_wrong_question_state_for_user(
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
  v_total integer := 0;
  v_open integer := 0;
  v_resolved integer := 0;
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

  with exam_evidence as (
    select
      aq.question_id,
      q.subject_id,
      primary_node.knowledge_node_id,
      aq.id as source_attempt_question_id,
      ea.id as source_attempt_id,
      aq.question_snapshot,
      coalesce(ea.submitted_at, ea.updated_at, ea.created_at) as occurred_at,
      case
        when aa.id is null then 'unanswered'
        when aa.is_correct is true then 'correct'
        else 'wrong'
      end as outcome,
      coalesce(aa.score_awarded, 0)::numeric as score_awarded,
      1 as evidence_priority
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.attempt_questions aq on aq.attempt_id = ea.id
    join public.questions q on q.id = aq.question_id
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
    left join lateral (
      select qkn.knowledge_node_id
      from public.question_knowledge_nodes qkn
      where qkn.question_id = aq.question_id
        and qkn.relation_type = 'primary'
      order by qkn.knowledge_node_id
      limit 1
    ) primary_node on true
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
  ), review_evidence as (
    select
      uwq.question_id,
      uwq.subject_id,
      uwq.knowledge_node_id,
      uwq.source_attempt_question_id,
      uwq.last_source_attempt_id as source_attempt_id,
      uwq.question_snapshot,
      wqr.created_at as occurred_at,
      case when wqr.is_correct then 'correct' else 'wrong' end as outcome,
      wqr.score_awarded,
      2 as evidence_priority
    from public.wrong_question_reviews wqr
    join public.user_wrong_questions uwq on uwq.id = wqr.user_wrong_question_id
    where wqr.user_id = p_user_id
      and uwq.track_id = v_track_id
  ), all_evidence as (
    select * from exam_evidence
    union all
    select * from review_evidence
  ), failure_stats as (
    select
      question_id,
      min(occurred_at) filter (where outcome in ('wrong','unanswered')) as first_failed_at,
      max(occurred_at) filter (where outcome in ('wrong','unanswered')) as last_failed_at,
      count(*) filter (where outcome in ('wrong','unanswered'))::integer as failure_count,
      count(*) filter (where outcome = 'wrong')::integer as wrong_count,
      count(*) filter (where outcome = 'unanswered')::integer as unanswered_count
    from all_evidence
    group by question_id
    having count(*) filter (where outcome in ('wrong','unanswered')) > 0
  ), latest_evidence as (
    select distinct on (question_id)
      question_id,
      outcome,
      occurred_at
    from all_evidence
    order by question_id, occurred_at desc, evidence_priority desc
  ), latest_exam_failure as (
    select distinct on (question_id)
      question_id,
      subject_id,
      knowledge_node_id,
      source_attempt_question_id,
      source_attempt_id,
      question_snapshot
    from exam_evidence
    where outcome in ('wrong','unanswered')
    order by question_id, occurred_at desc
  ), last_review as (
    select uwq.question_id, max(wqr.created_at) as last_reviewed_at
    from public.wrong_question_reviews wqr
    join public.user_wrong_questions uwq on uwq.id = wqr.user_wrong_question_id
    where wqr.user_id = p_user_id
      and uwq.track_id = v_track_id
    group by uwq.question_id
  )
  insert into public.user_wrong_questions (
    user_id,
    user_track_id,
    track_id,
    subject_id,
    question_id,
    knowledge_node_id,
    source_attempt_question_id,
    last_source_attempt_id,
    question_snapshot,
    first_failed_at,
    last_failed_at,
    failure_count,
    wrong_count,
    unanswered_count,
    latest_outcome,
    status,
    resolved_at,
    last_reviewed_at,
    updated_at
  )
  select
    p_user_id,
    v_user_track_id,
    v_track_id,
    lef.subject_id,
    fs.question_id,
    lef.knowledge_node_id,
    lef.source_attempt_question_id,
    lef.source_attempt_id,
    lef.question_snapshot,
    fs.first_failed_at,
    fs.last_failed_at,
    fs.failure_count,
    fs.wrong_count,
    fs.unanswered_count,
    le.outcome,
    case when le.outcome = 'correct' then 'resolved' else 'open' end,
    case when le.outcome = 'correct' then le.occurred_at else null end,
    lr.last_reviewed_at,
    now()
  from failure_stats fs
  join latest_evidence le on le.question_id = fs.question_id
  join latest_exam_failure lef on lef.question_id = fs.question_id
  left join last_review lr on lr.question_id = fs.question_id
  on conflict (user_id, track_id, question_id) do update
  set
    user_track_id = excluded.user_track_id,
    subject_id = excluded.subject_id,
    knowledge_node_id = excluded.knowledge_node_id,
    source_attempt_question_id = excluded.source_attempt_question_id,
    last_source_attempt_id = excluded.last_source_attempt_id,
    question_snapshot = excluded.question_snapshot,
    first_failed_at = excluded.first_failed_at,
    last_failed_at = excluded.last_failed_at,
    failure_count = excluded.failure_count,
    wrong_count = excluded.wrong_count,
    unanswered_count = excluded.unanswered_count,
    latest_outcome = excluded.latest_outcome,
    status = excluded.status,
    resolved_at = excluded.resolved_at,
    last_reviewed_at = excluded.last_reviewed_at,
    updated_at = now();

  select
    count(*)::integer,
    count(*) filter (where status = 'open')::integer,
    count(*) filter (where status = 'resolved')::integer
    into v_total, v_open, v_resolved
  from public.user_wrong_questions
  where user_id = p_user_id
    and track_id = v_track_id;

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'total', v_total,
    'open', v_open,
    'resolved', v_resolved,
    'source_attempt_id', p_source_attempt_id
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_wrong_question_state_for_user(uuid, uuid) from public, anon, authenticated;

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
  v_remaining integer;
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

  insert into public.wrong_question_reviews (
    user_id,
    user_wrong_question_id,
    question_id,
    selected_option_ids,
    is_correct,
    score_awarded
  ) values (
    p_user_id,
    v_row.id,
    v_row.question_id,
    coalesce(p_option_ids, array[]::uuid[]),
    (v_evaluation->>'is_correct')::boolean,
    (v_evaluation->>'score_awarded')::numeric
  );

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, null);

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
    'state', v_state
  );
end;
$function$;

revoke all on function app_private.review_wrong_question_for_user(uuid, uuid, uuid[]) from public, anon, authenticated;

create or replace function public.review_wrong_question(
  p_wrong_question_id uuid,
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

  return app_private.review_wrong_question_for_user(v_user, p_wrong_question_id, p_option_ids);
end;
$function$;

revoke all on function public.review_wrong_question(uuid, uuid[]) from public, anon;
grant execute on function public.review_wrong_question(uuid, uuid[]) to authenticated;

create or replace function app_private.submit_exam_attempt_for_user(p_user_id uuid, p_attempt_id uuid)
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
begin
  select started_at into v_started
  from public.exam_attempts
  where id = p_attempt_id and user_id = p_user_id and status = 'in_progress'
  for update;
  if v_started is null then raise exception 'In-progress attempt not found'; end if;

  if exists(
    select 1 from public.attempt_section_states
    where attempt_id = p_attempt_id and status <> 'completed'
  ) then
    raise exception 'ALL_SECTIONS_MUST_BE_COMPLETED';
  end if;

  v_score := app_private.score_exam_attempt(p_attempt_id);
  select coalesce(sum(duration_used_seconds), 0) into v_duration
  from public.attempt_section_states where attempt_id = p_attempt_id and status = 'completed';

  update public.exam_attempts
     set status = 'completed', submitted_at = now(), duration_used_seconds = v_duration,
         total_score = (v_score->>'raw_score')::numeric,
         percentage = (v_score->>'percentage')::numeric,
         passed = null, last_saved_at = now(), updated_at = now()
   where id = p_attempt_id;

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values(p_attempt_id, 'attempt_submitted', v_score);

  v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, p_attempt_id);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values(p_attempt_id, 'learning_projection_refreshed', v_projection);

  v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, p_attempt_id);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values(p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'completed',
    'raw_score', (v_score->>'raw_score')::numeric,
    'percentage', (v_score->>'percentage')::numeric,
    'duration_used_seconds', v_duration,
    'learning_projection', v_projection,
    'wrong_question_state', v_wrong_state
  );
end;
$function$;

-- Backfill existing completed TKA SMP attempts into persistent wrong/unanswered state.
do $backfill$
declare
  r record;
begin
  for r in
    select distinct ea.user_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.tracks t on t.id = e.track_id
    join public.programs p on p.id = t.program_id
    where upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
      and lower(ea.status) = 'completed'
  loop
    perform app_private.refresh_tka_smp_wrong_question_state_for_user(r.user_id, null);
  end loop;
end;
$backfill$;
