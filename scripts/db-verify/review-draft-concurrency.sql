-- Verifikasi Review Queue P1: optimistic concurrency + pelestarian ID opsi.
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/review-draft-concurrency.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK, jadi tidak ada data
-- yang tertinggal.
--
-- Membuktikan: simpan kedua dengan token benar menaikkan versi TANPA mengubah ID
-- opsi; simpan dengan token basi ditolak QUESTION_VERSION_CONFLICT; token yang
-- dikirim untuk soal baru ditolak QUESTION_VERSION_INVALID.
CREATE OR REPLACE FUNCTION public.__test_review_draft_concurrency ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_subject text;
  v_options jsonb;
  v_new jsonb;
  v_second jsonb;
  v_question_id uuid;
  v_version integer;
  v_updated_at timestamptz;
  v_first_ids uuid[];
  v_second_ids uuid[];
  v_msg text;
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

  v_new := public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, 'single_choice', 'Stem uji concurrency', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'verifikasi concurrency', NULL, NULL);
  v_question_id := (v_new ->> 'question_id')::uuid;
  v_out := v_out || jsonb_build_object('1_dibuat', (v_new ->> 'status') || ' v' || (v_new ->> 'version'));

  SELECT
    version,
    updated_at
  INTO
    v_version,
    v_updated_at
  FROM
    public.questions
  WHERE
    id = v_question_id;
  SELECT
    array_agg(id ORDER BY option_key)
  INTO
    v_first_ids
  FROM
    public.question_options
  WHERE
    question_id = v_question_id;

  v_second := public.save_question_draft (v_question_id, 'CPNS', 'SKD', v_subject, 'single_choice', 'Stem uji concurrency v2', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Opsi A diperbarui', 'is_correct', TRUE, 'score', 2), jsonb_build_object('key', 'B', 'content', 'Opsi B', 'is_correct', FALSE, 'score', 0)), 'verifikasi concurrency 2', v_version, v_updated_at);
  v_out := v_out || jsonb_build_object('2_simpan_kedua', 'v' || (v_second ->> 'version'));

  SELECT
    array_agg(id ORDER BY option_key)
  INTO
    v_second_ids
  FROM
    public.question_options
  WHERE
    question_id = v_question_id;
  v_out := v_out || jsonb_build_object('3_id_opsi_dipertahankan', v_first_ids = v_second_ids);

  BEGIN
    PERFORM
      public.save_question_draft (v_question_id, 'CPNS', 'SKD', v_subject, 'single_choice', 'Stem basi', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'token basi', v_version, v_updated_at);
    v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('4_token_basi', v_msg);

  BEGIN
    PERFORM
      public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, 'single_choice', 'Stem baru', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'token untuk soal baru', 1, now());
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('5_token_untuk_soal_baru', v_msg);

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
  jsonb_pretty(public.__test_review_draft_concurrency ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_review_draft_concurrency ();
