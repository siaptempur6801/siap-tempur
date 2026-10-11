-- Review Queue P2 — aksi massal tanpa N+1.
--
-- MASALAH
--   `prepareReviewBatchAction` memanggil `submit_question_for_review` SATU PER
--   SOAL dan `publishReviewBatchAction` memanggil `publish_question` satu per
--   soal. Untuk batch 500 soal itu 500 round-trip HTTP berurutan dari server
--   action — cukup untuk melewati batas durasi fungsi sebelum pekerjaan selesai.
--
-- SOLUSI
--   Dua fungsi batch tipis yang memanggil fungsi workflow yang SAMA di dalam
--   satu transaksi database, sehingga aturan (auth.uid, permission, author !=
--   reviewer, penjaga status) tidak digandakan. Semantik lama dipertahankan:
--   kegagalan pertama membatalkan seluruh panggilan (bukan skip diam-diam).
BEGIN;
CREATE FUNCTION app_private.submit_questions_for_review (p_question_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_question_ids IS NULL OR array_length(p_question_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('submitted', 0);
  END IF;
  IF array_length(p_question_ids, 1) > 1000 THEN
    RAISE EXCEPTION 'BATCH_TOO_LARGE';
  END IF;

  foreach v_id IN ARRAY p_question_ids LOOP
    PERFORM
      app_private.submit_question_for_review (v_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('submitted', v_count);
END
$$;
CREATE FUNCTION app_private.publish_questions (p_question_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_question_ids IS NULL OR array_length(p_question_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('published', 0);
  END IF;
  IF array_length(p_question_ids, 1) > 1000 THEN
    RAISE EXCEPTION 'BATCH_TOO_LARGE';
  END IF;

  foreach v_id IN ARRAY p_question_ids LOOP
    PERFORM
      app_private.publish_question (v_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('published', v_count);
END
$$;
CREATE FUNCTION public.submit_questions_for_review (p_question_ids uuid[])
  RETURNS jsonb
  LANGUAGE sql
  SET search_path = ''
  AS $$
  SELECT
    app_private.submit_questions_for_review (p_question_ids);
$$;
CREATE FUNCTION public.publish_questions (p_question_ids uuid[])
  RETURNS jsonb
  LANGUAGE sql
  SET search_path = ''
  AS $$
  SELECT
    app_private.publish_questions (p_question_ids);
$$;
REVOKE ALL ON FUNCTION public.submit_questions_for_review (uuid[]), public.publish_questions (uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_questions_for_review (uuid[]), public.publish_questions (uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.submit_questions_for_review (uuid[]), app_private.publish_questions (uuid[]) TO authenticated;
NOTIFY pgrst,
'reload schema';
COMMIT;
