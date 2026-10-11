-- Add per-section live score breakdown for admin event leaderboard.
-- This keeps scoring server-side and avoids exposing answer keys to clients.
DROP FUNCTION IF EXISTS public.get_live_event_leaderboard (uuid);

CREATE FUNCTION public.get_live_event_leaderboard (p_event_id uuid)
  RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    progress_count bigint,
    score_twk bigint,
    score_tiu bigint,
    score_tkp bigint,
    total_score bigint,
    live_rank bigint)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public.is_admin () THEN
    RAISE EXCEPTION 'Access denied. Only admins can view the live leaderboard.';
  END IF;

  RETURN QUERY WITH session_scores AS (
    SELECT
      tes.user_id,
      tes.started_at,
      count(a.option_id) AS answered_count,
      coalesce(sum(
          CASE WHEN q.type = 'TWK'
            AND o.is_correct THEN
            5
          ELSE
            0
          END), 0) AS score_twk,
      coalesce(sum(
          CASE WHEN q.type = 'TIU'
            AND o.is_correct THEN
            5
          ELSE
            0
          END), 0) AS score_tiu,
      coalesce(sum(
          CASE WHEN q.type = 'TKP' THEN
            coalesce(o.score_value, 0)
          ELSE
            0
          END), 0) AS score_tkp
    FROM
      public.tryout_event_sessions tes
    LEFT JOIN public.test_answers a ON a.session_id = tes.session_id
    LEFT JOIN public.questions q ON q.id = a.question_id
    LEFT JOIN public.options o ON o.id = a.option_id
  WHERE
    tes.event_id = p_event_id
  GROUP BY
    tes.user_id,
    tes.started_at
)
SELECT
  ss.user_id,
  p.full_name,
  p.avatar_url,
  ss.answered_count,
  ss.score_twk,
  ss.score_tiu,
  ss.score_tkp,
  ss.score_twk + ss.score_tiu + ss.score_tkp AS total_score,
  rank() OVER (ORDER BY (ss.score_twk + ss.score_tiu + ss.score_tkp) DESC,
  ss.started_at ASC) AS live_rank
FROM
  session_scores ss
  JOIN public.profiles p ON p.id = ss.user_id
ORDER BY
  live_rank ASC
LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_live_event_leaderboard (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_live_event_leaderboard (uuid) TO authenticated, service_role;
