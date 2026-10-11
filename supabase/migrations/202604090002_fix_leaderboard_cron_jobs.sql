-- Normalize leaderboard refresh jobs so old pg_cron entries do not stack.
-- Historical migrations created multiple jobs with different names/frequencies:
-- - refresh_leaderboard   every 2 minutes
-- - refresh-leaderboard   every 5 minutes
-- - refresh_leaderboard   every 15 minutes
-- This migration removes any leaderboard-related cron jobs and recreates one
-- canonical weekly job. The UI reads a cached Top 100 snapshot, while the
-- rank period is weekly, so refreshing every 15 minutes is unnecessary load.
DO $$
DECLARE
  leaderboard_job RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_extension
    WHERE
      extname = 'pg_cron') THEN
  RETURN;
END IF;

  FOR leaderboard_job IN
  SELECT
    jobid
  FROM
    cron.job
  WHERE
    jobname IN ('refresh_leaderboard', 'refresh-leaderboard', 'refresh_leaderboard_snapshot')
    OR command ILIKE '%leaderboard_snapshot%'
    OR command ILIKE '%refresh_leaderboard_snapshot%' LOOP
      PERFORM
        cron.unschedule (leaderboard_job.jobid);
    END LOOP;

  PERFORM
    cron.schedule ('refresh_leaderboard', '59 16 * * 0', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot');
END
$$;
