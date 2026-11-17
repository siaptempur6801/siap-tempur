-- Milestone 3 / Slice 3.2: prevent answer-key leakage from raw snapshots.
REVOKE SELECT ON TABLE public.user_wrong_questions FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_tka_smp_wrong_questions (p_limit integer DEFAULT 100)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_limit integer := greatest (1, least (coalesce(p_limit, 100), 200));
  v_items jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    coalesce(jsonb_agg(item ORDER BY last_failed_at DESC), '[]'::jsonb)
  INTO
    v_items
  FROM (
    SELECT
      uwq.last_failed_at,
      jsonb_build_object('id', uwq.id, 'question_id', uwq.question_id, 'subject_id', uwq.subject_id, 'failure_count', uwq.failure_count, 'wrong_count', uwq.wrong_count, 'unanswered_count', uwq.unanswered_count, 'latest_outcome', uwq.latest_outcome, 'status', uwq.status, 'last_failed_at', uwq.last_failed_at, 'question_snapshot', jsonb_build_object('question', uwq.question_snapshot -> 'question', 'stimulus', uwq.question_snapshot -> 'stimulus', 'options', coalesce((
            SELECT
              jsonb_agg((option_row - 'is_correct' - 'score')
            ORDER BY coalesce((option_row ->> 'sort_order')::integer, 0), option_row ->> 'id')
        FROM jsonb_array_elements(coalesce(uwq.question_snapshot -> 'options', '[]'::jsonb)) option_row), '[]'::jsonb), 'explanations', '[]'::jsonb)) AS item
    FROM
      public.user_wrong_questions uwq
      JOIN public.tracks t ON t.id = uwq.track_id
      JOIN public.programs p ON p.id = t.program_id
    WHERE
      uwq.user_id = v_user
      AND uwq.status = 'open'
      AND upper(p.code) = 'TKA'
      AND upper(t.code) = 'SMP'
    ORDER BY
      uwq.last_failed_at DESC
    LIMIT v_limit) rows_to_return;

  RETURN jsonb_build_object('items', v_items, 'count', jsonb_array_length(v_items));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_tka_smp_wrong_questions (integer) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_wrong_questions (integer) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.review_wrong_question_for_user (p_user_id uuid, p_wrong_question_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_row public.user_wrong_questions%rowtype;
  v_evaluation jsonb;
  v_state jsonb;
  v_remaining integer;
  v_explanation text := '';
BEGIN
  SELECT
    *
  INTO
    v_row
  FROM
    public.user_wrong_questions
  WHERE
    id = p_wrong_question_id
    AND user_id = p_user_id
    AND status = 'open'
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'OPEN_WRONG_QUESTION_NOT_FOUND';
  END IF;

  v_evaluation := app_private.evaluate_wrong_question_selection (v_row.question_snapshot, p_option_ids);

  SELECT
    coalesce(explanation_row ->> 'content', '')
  INTO
    v_explanation
  FROM
    jsonb_array_elements(coalesce(v_row.question_snapshot -> 'explanations', '[]'::jsonb)) explanation_row
WHERE
  coalesce(explanation_row ->> 'content', '') <> '' LIMIT 1;

  INSERT INTO public.wrong_question_reviews (user_id, user_wrong_question_id, question_id, selected_option_ids, is_correct, score_awarded)
  VALUES
    (p_user_id, v_row.id, v_row.question_id, coalesce(p_option_ids, ARRAY[]::uuid[]),
      (v_evaluation ->> 'is_correct')::boolean, (v_evaluation ->> 'score_awarded')::numeric);

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, NULL);

  SELECT
    count(*)::integer
  INTO
    v_remaining
  FROM
    public.user_wrong_questions
  WHERE
    user_id = p_user_id
    AND track_id = v_row.track_id
    AND status = 'open';

  RETURN jsonb_build_object('wrong_question_id', v_row.id, 'is_correct', (v_evaluation ->> 'is_correct')::boolean, 'score_awarded', (v_evaluation ->> 'score_awarded')::numeric, 'remaining_open', v_remaining, 'explanation', v_explanation, 'state', v_state);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.review_wrong_question_for_user (uuid, uuid, uuid[]) FROM public, anon, authenticated;
