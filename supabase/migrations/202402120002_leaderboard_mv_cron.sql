-- Enable pg_cron if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- remove the old table and function
DROP TABLE IF EXISTS leaderboard_snapshot;

DROP FUNCTION IF EXISTS refresh_leaderboard_snapshot;

-- Create the Materialized View
CREATE MATERIALIZED VIEW leaderboard_snapshot AS
WITH UserBestScores AS (
  SELECT
    user_id,
    MAX(total_score) AS total_score,
    MAX(score_twk) AS score_twk,
    MAX(score_tiu) AS score_tiu,
    MAX(score_tkp) AS score_tkp,
    MIN(end_time) AS end_time -- Use earliest time for tie-breaker on same score? Or latest? Usually first to reach score is higher rank. Let's stick to previous logic: ORDER BY total_score DESC, end_time ASC.
  FROM
    test_sessions
  WHERE
    status = 'completed'
  GROUP BY
    user_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY ubs.total_score DESC, ubs.end_time ASC) AS rank_pos,
  ubs.user_id,
  COALESCE(p.full_name, 'Pejuang SKD') AS full_name,
  p.avatar_url,
  ubs.total_score AS top_score,
  ubs.score_twk,
  ubs.score_tiu,
  ubs.score_tkp,
  ubs.end_time AS achieved_at
FROM
  UserBestScores ubs
  LEFT JOIN public.profiles p ON ubs.user_id = p.id;

-- Create Unique Index for Concurrent Refresh severity
CREATE UNIQUE INDEX idx_leaderboard_user_id ON leaderboard_snapshot (user_id);

CREATE INDEX idx_leaderboard_rank ON leaderboard_snapshot (rank_pos);

-- Schedule refresh every 2 minutes
SELECT
  cron.schedule ('refresh_leaderboard', '*/2 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot');
