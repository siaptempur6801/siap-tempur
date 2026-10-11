-- Migration: Live Leaderboard RPC for Tryout Akbar (Big Screen)
-- Calculates live scores dynamically for event sessions.
CREATE OR REPLACE FUNCTION public.get_live_event_leaderboard (p_event_id uuid)
  RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    progress_count bigint,
    live_rank bigint)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  -- Hanya admin yang boleh akses live leaderboard ini
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = auth.uid ()
      AND ROLE IN ('admin', 'superadmin')) THEN
  RAISE EXCEPTION 'Access denied. Only admins can view the live leaderboard.';
END IF;

  RETURN QUERY WITH session_scores AS (
    SELECT
      tes.user_id,
      tes.started_at,
      COUNT(a.option_id) AS answered_count,
      COALESCE(SUM(
          CASE WHEN q.type IN ('TWK', 'TIU')
            AND o.is_correct THEN
            5
          WHEN q.type = 'TKP' THEN
            COALESCE(o.score_value, 0)
          ELSE
            0
          END), 0) AS total_score
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
  RANK() OVER (ORDER BY ss.total_score DESC, ss.started_at ASC) AS live_rank
FROM
  session_scores ss
  JOIN public.profiles p ON p.id = ss.user_id
ORDER BY
  live_rank ASC
LIMIT 50;
  -- Limit top 50 to display on big screen to avoid massive payloads
END;
$$;
