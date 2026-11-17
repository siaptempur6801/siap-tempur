-- =============================================================================
-- Ranking event: hitung ulang berserialisasi + upsert (audit fase 1, A-04)
--
-- MASALAH
--   Versi 20260820131000 menjalankan DELETE seluruh ranking event lalu INSERT
--   ulang tanpa kunci. Dua submit serentak pada event yang sama: transaksi kedua
--   tidak melihat baris yang baru di-INSERT transaksi pertama (snapshot DELETE
--   diambil sebelum commit), lalu INSERT-nya bentrok dengan `event_rankings_pkey`
--   (23505). Direproduksi di Postgres lokal dengan 300 attempt. Peserta menerima
--   error padahal skornya sudah tersimpan.
--
-- PERBAIKAN
--   1. `pg_advisory_xact_lock` per event: penghitungan ulang untuk event yang
--      sama berjalan bergiliran, bukan saling menimpa.
--   2. INSERT ... ON CONFLICT DO UPDATE yang hanya menulis baris yang berubah,
--      lalu DELETE baris yang tidak lagi memenuhi syarat. Tabel tidak pernah
--      dikosongkan, sehingga pembaca tidak melihat ranking kosong di tengah jalan.
--   3. `exam_attempts.rank` hanya ditulis bila nilainya berubah.
--
--   Hasil akhir identik dengan versi lama (urutan dan pemecah seri sama).
--   Signature, tipe kembalian, dan ACL (hanya service_role) tidak berubah.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_event_rankings (p_event_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM
    pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('event-ranking:' || p_event_id::text, 0));
  WITH best_attempts AS (
    SELECT DISTINCT ON (a.user_id)
      a.user_id,
      a.id AS attempt_id,
      coalesce(a.total_score, 0)::numeric AS score,
      coalesce(a.duration_used_seconds, 2147483647) AS duration_seconds,
      a.submitted_at,
      a.passed
    FROM
      public.exam_attempts a
    WHERE
      lower(a.status) = 'completed'
      AND a.metadata ->> 'eventId' = p_event_id::text
    ORDER BY
      a.user_id,
      coalesce(a.total_score, 0) DESC,
      coalesce(a.duration_used_seconds, 2147483647) ASC,
      a.submitted_at ASC nulls LAST,
      a.id ASC
),
ranked AS (
  SELECT
    p_event_id AS event_id,
    b.user_id,
    b.attempt_id,
    b.score,
    b.duration_seconds,
    row_number() OVER (ORDER BY b.score DESC,
      b.duration_seconds ASC,
      b.submitted_at ASC nulls LAST,
      b.attempt_id ASC)::integer AS rank,
    CASE WHEN b.passed IS TRUE THEN
      'passed'
    ELSE
      'not_passed'
    END AS rank_group
  FROM
    best_attempts b)
INSERT INTO public.event_rankings AS er (event_id, user_id, attempt_id, score, duration_seconds, rank, rank_group, calculated_at)
SELECT
  r.event_id,
  r.user_id,
  r.attempt_id,
  r.score,
  r.duration_seconds,
  r.rank,
  r.rank_group,
  now()
FROM
  ranked r
ON CONFLICT (event_id,
  user_id)
  DO UPDATE SET
    attempt_id = excluded.attempt_id,
    score = excluded.score,
    duration_seconds = excluded.duration_seconds,
    rank = excluded.rank,
    rank_group = excluded.rank_group,
    calculated_at = now()
  WHERE (er.attempt_id, er.score, er.duration_seconds, er.rank, er.rank_group) IS DISTINCT FROM (excluded.attempt_id, excluded.score, excluded.duration_seconds, excluded.rank, excluded.rank_group);
  -- Baris peserta yang tidak lagi punya attempt selesai untuk event ini.
  DELETE FROM public.event_rankings er
  WHERE er.event_id = p_event_id
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.exam_attempts a
      WHERE
        a.id = er.attempt_id
        AND a.user_id = er.user_id
        AND lower(a.status) = 'completed'
        AND a.metadata ->> 'eventId' = p_event_id::text);
  UPDATE
    public.exam_attempts a
  SET
    rank = er.rank,
    updated_at = now()
  FROM
    public.event_rankings er
  WHERE
    er.event_id = p_event_id
    AND er.attempt_id = a.id
    AND a.rank IS DISTINCT FROM er.rank;
  SELECT
    count(*)::integer
  INTO
    v_count
  FROM
    public.event_rankings
  WHERE
    event_id = p_event_id;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_event_rankings (uuid) FROM public;

REVOKE ALL ON FUNCTION public.recalculate_event_rankings (uuid) FROM anon;

REVOKE ALL ON FUNCTION public.recalculate_event_rankings (uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.recalculate_event_rankings (uuid) TO service_role;
