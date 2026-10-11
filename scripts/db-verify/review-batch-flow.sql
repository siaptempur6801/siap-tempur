-- Verifikasi aksi massal Review Queue (P2): submit/publish batch tanpa N+1.
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/review-batch-flow.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK, jadi tidak ada data
-- yang tertinggal.
--
-- Membuktikan: tiga draft dikirim ke review dalam SATU panggilan (bukan tiga),
-- publish massal menolak soal non-approved dan tidak mengubah status, array
-- kosong mengembalikan nol, dan array di atas 1.000 ditolak.
CREATE OR REPLACE FUNCTION public.__test_review_batch_flow ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_subject text;
  v_options jsonb;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_i integer;
  v_result jsonb;
  v_msg text;
  v_statuses text[];
  v_pending integer;
BEGIN
  SELECT
    s.code
  INTO
    v_subject
  FROM
    public.subjects s
    JOIN public.tracks t ON t.id = s.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD'
    AND upper(s.status) = 'ACTIVE'
  ORDER BY
    s.sort_order
  LIMIT 1;
  IF v_subject IS NULL THEN
    RAISE EXCEPTION 'Tidak ada subject CPNS/SKD aktif';
  END IF;

  v_options := jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Opsi A', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Opsi B', 'is_correct', FALSE, 'score', 0));

  FOR v_i IN 1..3 LOOP
    v_result := public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, 'single_choice', 'Stem batch ' || v_i, 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'verifikasi batch', NULL, NULL);
    v_ids := v_ids || (v_result ->> 'question_id')::uuid;
  END LOOP;
  v_out := v_out || jsonb_build_object('1_draft_dibuat', array_length(v_ids, 1));

  v_result := public.submit_questions_for_review (v_ids);
  v_out := v_out || jsonb_build_object('2_submit_batch', v_result ->> 'submitted');

  SELECT
    array_agg(status ORDER BY status)
  INTO
    v_statuses
  FROM
    public.questions
  WHERE
    id = ANY (v_ids);
  SELECT
    count(*)
  INTO
    v_pending
  FROM
    public.content_reviews
  WHERE
    entity_type = 'question'
    AND entity_id = ANY (v_ids)
    AND status = 'pending'
    AND review_stage = 'editorial';
  v_out := v_out || jsonb_build_object('3_status', v_statuses, '3_pending_editorial', v_pending);

  BEGIN
    PERFORM
      public.publish_questions (v_ids);
    v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('4_publish_non_approved', v_msg);

  SELECT
    array_agg(status ORDER BY status)
  INTO
    v_statuses
  FROM
    public.questions
  WHERE
    id = ANY (v_ids);
    v_out := v_out || jsonb_build_object('5_status_tidak_berubah', v_statuses);

    v_out := v_out || jsonb_build_object('6_array_kosong_submit', public.submit_questions_for_review ('{}'::uuid[]) ->> 'submitted', '6_array_kosong_publish', public.publish_questions ('{}'::uuid[]) ->> 'published');

    BEGIN
      PERFORM
        public.submit_questions_for_review (ARRAY (
            SELECT
              gen_random_uuid ()
          FROM generate_series(1, 1001)));
        v_msg := 'TIDAK DITOLAK';
    EXCEPTION
      WHEN OTHERS THEN
        v_msg := sqlerrm;
    END;
    v_out := v_out || jsonb_build_object('7_lebih_dari_1000', v_msg);

    RETURN v_out;
END
$$;

BEGIN;
-- Aktor dicari dari DATABASE, bukan di-hardcode (lihat `_bootstrap.sql`).
DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT
    ur.user_id
  INTO
    v_admin
  FROM
    public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
  WHERE
    r.code IN ('SUPER_ADMIN', 'ADMIN')
  ORDER BY
    CASE WHEN r.code = 'SUPER_ADMIN' THEN
      0
    ELSE
      1
    END
  LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Tidak ada pengguna berperan SUPER_ADMIN atau ADMIN';
  END IF;
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
END
$$;
SET local ROLE authenticated;
SELECT
  jsonb_pretty(public.__test_review_batch_flow ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_review_batch_flow ();
