-- =============================================================================
-- Batch update skor jawaban attempt (menghilangkan N+1 pada submit ujian CPNS)
--
-- MASALAH
--   `ScoringService.finishAttempt` (src/services/scoring.service.ts) memanggil
--   `attemptRepository.updateAnswerScore` di dalam loop soal. Full Tryout CPNS
--   berisi 110 soal, sehingga satu kali submit menjalankan 110 UPDATE berurutan
--   (round trip serial) di dalam request submit — tepat pada saat banyak peserta
--   menekan "kumpulkan" bersamaan. Latensi submit menjadi ~110x RTT dan berisiko
--   menembus batas waktu function.
--
-- PERBAIKAN
--   Satu fungsi yang menulis seluruh skor jawaban dalam SATU round trip.
--   Semantiknya identik dengan 110 UPDATE terpisah, tetapi atomik: tidak ada lagi
--   kondisi di mana sebagian jawaban sudah terskor dan sebagian belum.
--
-- KEAMANAN
--   - SECURITY DEFINER dengan `search_path = ''` (seluruh nama di-schema-qualify).
--   - EXECUTE hanya untuk `service_role`. `anon`/`authenticated` TIDAK boleh
--     memanggilnya: fungsi ini menulis skor, jadi permukaan serangannya harus nol.
--   - Kepemilikan attempt TIDAK diperiksa di sini karena pemanggilnya adalah
--     service role setelah `scoring_service` memverifikasi attempt milik user
--     (lihat `getAttemptBundle(userId, attemptId)`). Fungsi ini tidak menerima
--     `user_id` apa pun dari pemanggil, jadi tidak ada permukaan IDOR baru.
--
-- IDEMPOTEN
--   Murni UPDATE berdasarkan primary key; dijalankan dua kali menghasilkan state
--   yang sama. Baris yang tidak ada cukup diabaikan (tidak di-INSERT).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_attempt_answer_scores (p_scores jsonb)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_updated integer;
BEGIN
  IF p_scores IS NULL OR jsonb_typeof(p_scores) <> 'array' THEN
    RAISE EXCEPTION 'update_attempt_answer_scores expects a JSON array'
      USING errcode = '22023';
  END IF;

  WITH incoming AS (
    SELECT
      *
    FROM
      jsonb_to_recordset(p_scores) AS x (id uuid,
        is_correct boolean,
        score_awarded numeric))
  UPDATE
    public.attempt_answers aa
  SET
    is_correct = incoming.is_correct,
    score_awarded = incoming.score_awarded,
    updated_at = now()
  FROM
    incoming
  WHERE
    aa.id = incoming.id;

  get diagnostics v_updated = row_count;
  RETURN v_updated;
END;
$function$;

COMMENT ON FUNCTION public.update_attempt_answer_scores (jsonb) IS 'Menulis skor seluruh jawaban satu attempt dalam satu round trip. Hanya service_role.'; REVOKE ALL ON FUNCTION public.update_attempt_answer_scores (jsonb) FROM public;

REVOKE ALL ON FUNCTION public.update_attempt_answer_scores (jsonb) FROM anon;

REVOKE ALL ON FUNCTION public.update_attempt_answer_scores (jsonb) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.update_attempt_answer_scores (jsonb) TO service_role;
