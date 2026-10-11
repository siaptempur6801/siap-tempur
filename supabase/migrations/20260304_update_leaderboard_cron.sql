-- Perbarui jadwal refresh leaderboard menjadi 1 minggu sekali (Setiap Minggu jam 23:59 WIB / 16:59 UTC)
SELECT
  cron.schedule ('refresh_leaderboard', '59 16 * * 0', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot');

-- Hapus job lama (refresh-leaderboard) secara aman jika masih ada di pg_cron
DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      cron.job
    WHERE
      jobname = 'refresh-leaderboard') THEN
  PERFORM
    cron.unschedule ('refresh-leaderboard');
END IF;
END
$$;

-- Modifikasi Materialized View
-- KITA TIDAK JADI MENGGUNAKAN LIMIT DI SINI agar ranking semua user tetap dikalkulasi
DROP MATERIALIZED VIEW IF EXISTS leaderboard_snapshot CASCADE;

CREATE MATERIALIZED VIEW leaderboard_snapshot AS
WITH UserBestScores AS (
  SELECT
    user_id,
    MAX(total_score) AS total_score,
    MAX(score_twk) AS score_twk,
    MAX(score_tiu) AS score_tiu,
    MAX(score_tkp) AS score_tkp,
    MIN(end_time) AS end_time
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
  LEFT JOIN public.profiles p ON ubs.user_id = p.id
ORDER BY
  ubs.total_score DESC,
  ubs.end_time ASC;

-- Buat ulang Index agar CONCURRENTLY refresh bisa berjalan
CREATE UNIQUE INDEX idx_leaderboard_user_id ON leaderboard_snapshot (user_id);

CREATE INDEX idx_leaderboard_rank ON leaderboard_snapshot (rank_pos);

-- Buat ulang wrapper function agar hak akses tidak hilang akibat CASCADE
-- Fungsi ini otomatis melimit 100 besar untuk UI
CREATE OR REPLACE FUNCTION public.get_leaderboard_snapshot ()
  RETURNS TABLE (
    rank_pos bigint,
    user_id uuid,
    full_name text,
    avatar_url text,
    top_score int,
    score_twk int,
    score_tiu int,
    score_tkp int,
    updated_at timestamp with time zone)
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN QUERY
  SELECT
    *
  FROM
    public.leaderboard_snapshot
  ORDER BY
    leaderboard_snapshot.rank_pos ASC
  LIMIT 100;
END;
$$
LANGUAGE plpgsql;

-- Fungsi baru untuk mengambil urutan rank pengguna secara spesifik (meskipun di luar 100 besar)
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_rank (p_user_id uuid)
  RETURNS TABLE (
    rank_pos bigint,
    user_id uuid,
    full_name text,
    avatar_url text,
    top_score int,
    score_twk int,
    score_tiu int,
    score_tkp int,
    updated_at timestamp with time zone)
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN QUERY
  SELECT
    *
  FROM
    public.leaderboard_snapshot ls
  WHERE
    ls.user_id = p_user_id;
END;
$$
LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_snapshot () TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_rank (uuid) TO anon, authenticated;
