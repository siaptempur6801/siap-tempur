-- Milestone 3 / Slice 3.2: prevent answer-key leakage from raw snapshots.

revoke select on table public.user_wrong_questions from authenticated;

create or replace function public.get_tka_smp_wrong_questions(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_items jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(jsonb_agg(item order by last_failed_at desc), '[]'::jsonb)
    into v_items
  from (
    select
      uwq.last_failed_at,
      jsonb_build_object(
        'id', uwq.id,
        'question_id', uwq.question_id,
        'subject_id', uwq.subject_id,
        'failure_count', uwq.failure_count,
        'wrong_count', uwq.wrong_count,
        'unanswered_count', uwq.unanswered_count,
        'latest_outcome', uwq.latest_outcome,
        'status', uwq.status,
        'last_failed_at', uwq.last_failed_at,
        'question_snapshot', jsonb_build_object(
          'question', uwq.question_snapshot->'question',
          'stimulus', uwq.question_snapshot->'stimulus',
          'options', coalesce((
            select jsonb_agg((option_row - 'is_correct' - 'score') order by coalesce((option_row->>'sort_order')::integer, 0), option_row->>'id')
            from jsonb_array_elements(coalesce(uwq.question_snapshot->'options', '[]'::jsonb)) option_row
          ), '[]'::jsonb),
          'explanations', '[]'::jsonb
        )
      ) as item
    from public.user_wrong_questions uwq
    join public.tracks t on t.id = uwq.track_id
    join public.programs p on p.id = t.program_id
    where uwq.user_id = v_user
      and uwq.status = 'open'
      and upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
    order by uwq.last_failed_at desc
    limit v_limit
  ) rows_to_return;

  return jsonb_build_object('items', v_items, 'count', jsonb_array_length(v_items));
end;
$function$;

revoke all on function public.get_tka_smp_wrong_questions(integer) from public, anon;
grant execute on function public.get_tka_smp_wrong_questions(integer) to authenticated;

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
    'explanation', v_explanation,
    'state', v_state
  );
end;
$function$;

revoke all on function app_private.review_wrong_question_for_user(uuid, uuid, uuid[]) from public, anon, authenticated;
