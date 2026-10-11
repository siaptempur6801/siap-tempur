-- Realtime-ish national leaderboard backed by Postgres.
-- Postgres remains the source of truth; Redis/cache layers can be added later.
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  best_session_id uuid NOT NULL REFERENCES public.test_sessions (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Calon ASN',
  avatar_url text,
  top_score int NOT NULL DEFAULT 0,
  score_twk int NOT NULL DEFAULT 0,
  score_tiu int NOT NULL DEFAULT 0,
  score_tkp int NOT NULL DEFAULT 0,
  completed_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_entries_score_idx ON public.leaderboard_entries (top_score DESC, completed_at ASC, user_id);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view leaderboard entries" ON public.leaderboard_entries;

CREATE POLICY "Authenticated users can view leaderboard entries" ON public.leaderboard_entries
  FOR SELECT TO authenticated
  USING (TRUE);

REVOKE ALL ON public.leaderboard_entries FROM anon, authenticated;

GRANT SELECT ON public.leaderboard_entries TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_leaderboard_from_session (p_session_id uuid)
  RETURNS TABLE (
    success boolean,
    updated boolean,
    rank_pos bigint)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_session record;
  v_current_entry record;
  v_updated boolean := FALSE;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session id';
  END IF;

  SELECT
    ts.id,
    ts.user_id,
    ts.mode,
    ts.status,
    ts.score_twk,
    ts.score_tiu,
    ts.score_tkp,
    ts.total_score,
    coalesce(ts.end_time, ts.start_time, now()) AS completed_at,
    coalesce(nullif (trim(p.full_name), ''), 'Calon ASN') AS full_name,
    p.avatar_url
  INTO
    v_session
  FROM
    public.test_sessions ts
    LEFT JOIN public.profiles p ON p.id = ts.user_id
  WHERE
    ts.id = p_session_id;

  IF NOT found THEN
    RETURN QUERY
    SELECT
      FALSE,
      FALSE,
      NULL::bigint;
    RETURN;
  END IF;

  IF coalesce(auth.role (), '') <> 'service_role' AND v_session.user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_session.mode <> 'tryout' OR v_session.status <> 'completed' THEN
    RETURN QUERY
    SELECT
      FALSE,
      FALSE,
      NULL::bigint;
    RETURN;
  END IF;

  INSERT INTO public.leaderboard_entries (user_id, best_session_id, full_name, avatar_url, top_score, score_twk, score_tiu, score_tkp, completed_at, updated_at)
    VALUES (v_session.user_id, v_session.id, v_session.full_name, v_session.avatar_url, coalesce(v_session.total_score, 0), coalesce(v_session.score_twk, 0), coalesce(v_session.score_tiu, 0), coalesce(v_session.score_tkp, 0), v_session.completed_at, now())
  ON CONFLICT (user_id)
    DO UPDATE SET
      best_session_id = excluded.best_session_id,
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      top_score = excluded.top_score,
      score_twk = excluded.score_twk,
      score_tiu = excluded.score_tiu,
      score_tkp = excluded.score_tkp,
      completed_at = excluded.completed_at,
      updated_at = now()
    WHERE
      excluded.top_score > public.leaderboard_entries.top_score
      OR (excluded.top_score = public.leaderboard_entries.top_score
        AND excluded.completed_at < public.leaderboard_entries.completed_at)
    RETURNING
      TRUE
    INTO
      v_updated;

  IF v_updated IS NOT TRUE THEN
    UPDATE
      public.leaderboard_entries
    SET
      full_name = v_session.full_name,
      avatar_url = v_session.avatar_url,
      updated_at = now()
    WHERE
      user_id = v_session.user_id;
  END IF;

  SELECT
    *
  INTO
    v_current_entry
  FROM
    public.leaderboard_entries
  WHERE
    user_id = v_session.user_id;

  SELECT
    count(*) + 1
  INTO
    rank_pos
  FROM
    public.leaderboard_entries le
  WHERE
    le.top_score > v_current_entry.top_score
    OR (le.top_score = v_current_entry.top_score
      AND (le.completed_at < v_current_entry.completed_at
        OR (le.completed_at = v_current_entry.completed_at
          AND le.user_id < v_current_entry.user_id)));

  RETURN QUERY
  SELECT
    TRUE,
    coalesce(v_updated, FALSE),
    rank_pos;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_national_leaderboard (p_limit int DEFAULT 100, p_user_id uuid DEFAULT auth.uid ())
  RETURNS TABLE (
    rank_pos bigint,
    user_id uuid,
    full_name text,
    avatar_url text,
    top_score int,
    score_twk int,
    score_tiu int,
    score_tkp int,
    is_current_user boolean)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_limit int := least (greatest (coalesce(p_limit, 100), 1), 100);
  v_current_user_id uuid := coalesce(p_user_id, auth.uid ());
BEGIN
  IF auth.uid () IS NULL AND coalesce(auth.role (), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY WITH ranked AS (
    SELECT
      row_number() OVER (ORDER BY le.top_score DESC,
        le.completed_at ASC,
        le.user_id ASC) AS rank_pos,
      le.user_id,
      coalesce(nullif (trim(p.full_name), ''), le.full_name, 'Calon ASN') AS full_name,
      coalesce(p.avatar_url, le.avatar_url) AS avatar_url,
      le.top_score,
      le.score_twk,
      le.score_tiu,
      le.score_tkp
    FROM
      public.leaderboard_entries le
    LEFT JOIN public.profiles p ON p.id = le.user_id
)
SELECT
  r.rank_pos,
  r.user_id,
  r.full_name,
  r.avatar_url,
  r.top_score,
  r.score_twk,
  r.score_tiu,
  r.score_tkp,
  r.user_id = v_current_user_id AS is_current_user
FROM
  ranked r
WHERE
  r.rank_pos <= v_limit
    OR r.user_id = v_current_user_id
  ORDER BY
    r.rank_pos ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.get_live_event_leaderboard (uuid);

CREATE FUNCTION public.get_live_event_leaderboard (p_event_id uuid)
  RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    progress_count bigint,
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
          CASE WHEN q.type IN ('TWK', 'TIU')
            AND o.is_correct THEN
            5
          WHEN q.type = 'TKP' THEN
            coalesce(o.score_value, 0)
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
  ss.total_score,
  rank() OVER (ORDER BY ss.total_score DESC, ss.started_at ASC) AS live_rank
FROM
  session_scores ss
  JOIN public.profiles p ON p.id = ss.user_id
ORDER BY
  live_rank ASC
LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_leaderboard_from_session (uuid) FROM public, anon;

REVOKE EXECUTE ON FUNCTION public.get_national_leaderboard (int, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.upsert_leaderboard_from_session (uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_national_leaderboard (int, uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_live_event_leaderboard (uuid) TO authenticated, service_role;

INSERT INTO public.leaderboard_entries (user_id, best_session_id, full_name, avatar_url, top_score, score_twk, score_tiu, score_tkp, completed_at, updated_at)
SELECT DISTINCT ON (ts.user_id)
  ts.user_id,
  ts.id,
  coalesce(nullif (trim(p.full_name), ''), 'Calon ASN') AS full_name,
  p.avatar_url,
  coalesce(ts.total_score, 0),
  coalesce(ts.score_twk, 0),
  coalesce(ts.score_tiu, 0),
  coalesce(ts.score_tkp, 0),
  coalesce(ts.end_time, ts.start_time, now()) AS completed_at,
  now()
FROM
  public.test_sessions ts
  LEFT JOIN public.profiles p ON p.id = ts.user_id
WHERE
  ts.mode = 'tryout'
  AND ts.status = 'completed'
ORDER BY
  ts.user_id,
  ts.total_score DESC,
  coalesce(ts.end_time, ts.start_time, now()) ASC,
  ts.id ASC
ON CONFLICT (user_id)
  DO UPDATE SET
    best_session_id = excluded.best_session_id,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    top_score = excluded.top_score,
    score_twk = excluded.score_twk,
    score_tiu = excluded.score_tiu,
    score_tkp = excluded.score_tkp,
    completed_at = excluded.completed_at,
    updated_at = now()
  WHERE
    excluded.top_score > public.leaderboard_entries.top_score
    OR (excluded.top_score = public.leaderboard_entries.top_score
      AND excluded.completed_at < public.leaderboard_entries.completed_at);
