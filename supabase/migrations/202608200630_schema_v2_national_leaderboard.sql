CREATE OR REPLACE FUNCTION public.recalculate_leaderboard (p_leaderboard_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
DECLARE
  v_board public.leaderboards%rowtype;
BEGIN
  SELECT
    *
  INTO
    v_board
  FROM
    public.leaderboards
  WHERE
    id = p_leaderboard_id;

  IF NOT found THEN
    RAISE EXCEPTION 'LEADERBOARD_NOT_FOUND';
  END IF;

  DELETE FROM public.leaderboard_entries
  WHERE leaderboard_id = p_leaderboard_id;

  WITH candidate_attempts AS (
    SELECT
      ea.id AS attempt_id,
      ea.user_id,
      coalesce(ea.total_score, 0)::numeric AS total_score,
      coalesce(ea.duration_used_seconds, 2147483647) AS duration_seconds,
      ea.submitted_at,
      row_number() OVER (PARTITION BY ea.user_id ORDER BY coalesce(ea.total_score, 0) DESC,
        coalesce(ea.duration_used_seconds, 2147483647) ASC,
        ea.submitted_at ASC nulls LAST,
        ea.id ASC) AS user_best_rank
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      lower(ea.status) = 'completed'
      AND et.code = 'FULL_TRYOUT'
      AND (v_board.program_id IS NULL
        OR e.program_id = v_board.program_id)
      AND (v_board.track_id IS NULL
        OR e.track_id = v_board.track_id)
      AND ea.submitted_at IS NOT NULL
      AND ea.submitted_at >= v_board.starts_at
      AND ea.submitted_at <= v_board.ends_at
),
best_attempts AS (
  SELECT
    *
  FROM
    candidate_attempts
  WHERE
    user_best_rank = 1
),
subject_scores AS (
  SELECT
    ats.attempt_id,
    max(ats.raw_score) FILTER (WHERE s.code = 'TWK') AS score_twk,
  max(ats.raw_score) FILTER (WHERE s.code = 'TIU') AS score_tiu,
  max(ats.raw_score) FILTER (WHERE s.code = 'TKP') AS score_tkp
FROM
  public.attempt_scores ats
  LEFT JOIN public.subjects s ON s.id = ats.subject_id
  JOIN best_attempts ba ON ba.attempt_id = ats.attempt_id
GROUP BY
  ats.attempt_id
),
ranked AS (
  SELECT
    ba.*,
    coalesce(ss.score_twk, 0)::numeric AS score_twk,
    coalesce(ss.score_tiu, 0)::numeric AS score_tiu,
    coalesce(ss.score_tkp, 0)::numeric AS score_tkp,
    row_number() OVER (ORDER BY ba.total_score DESC,
      ba.duration_seconds ASC,
      ba.submitted_at ASC nulls LAST,
      ba.user_id ASC)::integer AS rank_pos
  FROM
    best_attempts ba
    LEFT JOIN subject_scores ss ON ss.attempt_id = ba.attempt_id)
INSERT INTO public.leaderboard_entries (leaderboard_id, user_id, score, rank, metadata, updated_at)
SELECT
  p_leaderboard_id,
  ranked.user_id,
  ranked.total_score,
  ranked.rank_pos,
  jsonb_build_object('attemptId', ranked.attempt_id, 'durationSeconds', ranked.duration_seconds, 'submittedAt', ranked.submitted_at, 'scoreTWK', ranked.score_twk, 'scoreTIU', ranked.score_tiu, 'scoreTKP', ranked.score_tkp),
  now()
FROM
  ranked;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_leaderboard (uuid) FROM public;

REVOKE ALL ON FUNCTION public.recalculate_leaderboard (uuid) FROM anon;

REVOKE ALL ON FUNCTION public.recalculate_leaderboard (uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.recalculate_leaderboard (uuid) TO service_role;
