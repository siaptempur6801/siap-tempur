-- Migration: Leaderboard Snapshot System
-- This implements a pseudo real-time ranking by caching the best results per user.
-- 1. Create the snapshot table
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshot (
  rank_pos int,
  user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  top_score int,
  score_twk int,
  score_tiu int,
  score_tkp int,
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast sorting by total score
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON public.leaderboard_snapshot (top_score DESC);

-- 2. Function to refresh the snapshot
-- This function finds the highest total_score session for each user
-- and populates the snapshot table with ranks.
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot ()
  RETURNS void
  AS $$
BEGIN
  -- Clear existing snapshot
  -- (TRUNCATE is faster but DELETE CASCADE might be safer depending on usage)
  TRUNCATE public.leaderboard_snapshot;
  -- Insert updated rankings
  -- We take the MAX score per user to ensure each user only appears once
  INSERT INTO public.leaderboard_snapshot (rank_pos, user_id, full_name, avatar_url, top_score, score_twk, score_tiu, score_tkp, updated_at)
  WITH UserBestScores AS (
    SELECT DISTINCT ON (user_id)
      user_id,
      total_score,
      score_twk,
      score_tiu,
      score_tkp,
      end_time
    FROM
      public.test_sessions
    WHERE
      status = 'completed'
    ORDER BY
      user_id,
      total_score DESC,
      end_time ASC
)
  SELECT
    ROW_NUMBER() OVER (ORDER BY total_score DESC, end_time ASC) AS rank_pos,
    ubs.user_id,
    COALESCE(p.full_name, 'Pejuang SKD'),
    p.avatar_url,
    ubs.total_score,
    ubs.score_twk,
    ubs.score_tiu,
    ubs.score_tkp,
    now()
  FROM
    UserBestScores ubs
    LEFT JOIN public.profiles p ON ubs.user_id = p.id
  ORDER BY
    ubs.total_score DESC,
    ubs.end_time ASC;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- 3. Initial refresh
SELECT
  public.refresh_leaderboard_snapshot ();

-- 4. Enable RLS on snapshot
ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

-- 5. Public read policy (anyone authenticated can see the rankings)
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard_snapshot
  FOR SELECT TO authenticated
  USING (TRUE);

-- 6. Setup pg_cron to refresh every 5 minutes
-- NOTE: pg_cron must be enabled in the Supabase Dashboard Extensions first.
-- This SQL attempts to schedule it if the extension is available.
DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_extension
    WHERE
      extname = 'pg_cron') THEN
  PERFORM
    cron.schedule ('refresh-leaderboard', '*/5 * * * *', 'SELECT public.refresh_leaderboard_snapshot()');
END IF;
END
$$;
