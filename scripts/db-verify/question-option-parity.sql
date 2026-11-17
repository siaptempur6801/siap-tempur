-- Paritas validasi opsi antara dua jalur tulis.
--
-- Cara pakai (staging/produksi, aman: seluruhnya ROLLBACK):
--   supabase db query --linked --file scripts/db-verify/question-option-parity.sql
--
-- KENAPA
--   Soal dapat ditulis lewat dua RPC: `mutate_question_bank` (Question Bank) dan
--   `save_question_draft` (Review Queue). Keduanya memuat aturan validasi opsi
--   sendiri-sendiri, sehingga aturan bisa berbeda diam-diam — persis kelas bug
--   yang dulu membuat editor menerima nilai yang ditolak server.
--
--   Skrip ini menjalankan matriks payload melalui KEDUA jalur dan melaporkan
--   apakah keduanya sepakat (sama-sama menerima atau sama-sama menolak).
CREATE OR REPLACE FUNCTION public.__test_question_option_parity ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_subject text;
  v_cases jsonb;
  v_case jsonb;
  v_options jsonb;
  v_qb_options jsonb;
  v_type text;
  v_qb_ok boolean;
  v_rv_ok boolean;
  v_out jsonb := '{}'::jsonb;
  v_mismatch integer := 0;
  v_total integer := 0;
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

  v_cases := jsonb_build_array(jsonb_build_object('name', 'valid_single', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Benar', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'duplicate_keys', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Satu', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'A', 'content', 'Dua', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'empty_content', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', ' ', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'negative_score', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Benar', 'is_correct', TRUE, 'score', -1), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'three_decimal_score', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Benar', 'is_correct', TRUE, 'score', 0.123), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'http_image', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Benar', 'is_correct', TRUE, 'score', 1, 'image_url', 'http://example.org/a.png'), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'two_correct_single', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Benar', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Juga benar', 'is_correct', TRUE, 'score', 1))), jsonb_build_object('name', 'multiple_valid', 'type', 'multiple_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Satu', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Dua', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'C', 'content', 'Tiga', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'multiple_all_correct', 'type', 'multiple_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Satu', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Dua', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'C', 'content', 'Tiga', 'is_correct', TRUE, 'score', 1))), jsonb_build_object('name', 'category_valid', 'type', 'category', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'A1', 'is_correct', TRUE, 'score', 1, 'response_group', 'G1'), jsonb_build_object('key', 'B', 'content', 'A2', 'is_correct', FALSE, 'score', 0, 'response_group', 'G1'), jsonb_build_object('key', 'C', 'content', 'B1', 'is_correct', FALSE, 'score', 0, 'response_group', 'G2'), jsonb_build_object('key', 'D', 'content', 'B2', 'is_correct', TRUE, 'score', 1, 'response_group', 'G2'))), jsonb_build_object('name', 'category_without_group', 'type', 'category', 'options', jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'A1', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'A2', 'is_correct', FALSE, 'score', 0))), jsonb_build_object('name', 'bad_key_format', 'type', 'single_choice', 'options', jsonb_build_array(jsonb_build_object('key', 'A B', 'content', 'Benar', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0))));

  FOR v_case IN
  SELECT
    value
  FROM
    jsonb_array_elements(v_cases)
    LOOP
      v_options := v_case -> 'options';
      v_type := v_case ->> 'type';
      v_total := v_total + 1;
      -- Dua jalur memakai bentuk payload berbeda: Question Bank memakai camelCase
      -- (`isCorrect`, `responseGroup`, `imageUrl`), Review Queue memakai snake_case
      -- (`is_correct`, `response_group`, `image_url`). Paritas diuji pada aturan,
      -- bukan pada penamaan field.
      SELECT
        coalesce(jsonb_agg(jsonb_build_object('key', o ->> 'key', 'content', o ->> 'content', 'isCorrect', o -> 'is_correct', 'score', o -> 'score', 'responseGroup', o -> 'response_group', 'responseGroupOrder', o -> 'response_group_order', 'imageUrl', o -> 'image_url')), '[]'::jsonb)
      INTO
        v_qb_options
      FROM
        jsonb_array_elements(v_options) o;

      BEGIN
        PERFORM
          public.mutate_question_bank (jsonb_build_object('operation', 'save', 'id', NULL, 'program', 'CPNS', 'track', 'SKD', 'subject', v_subject, 'questionType', v_type, 'stem', 'Parity check', 'difficulty', 'medium', 'explanation', '', 'sourceReference', '', 'cognitiveLevel', '', 'estimatedSeconds', NULL, 'stimulusId', NULL, 'knowledgeNodeId', NULL, 'changeReason', 'parity', 'expectedVersion', 0, 'expectedUpdatedAt', '', 'options', v_qb_options));
        v_qb_ok := TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          v_qb_ok := FALSE;
      END;

      BEGIN
        PERFORM
          public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, v_type, 'Parity check', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'parity', NULL, NULL);
          v_rv_ok := TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          v_rv_ok := FALSE;
      END;

      IF v_qb_ok <> v_rv_ok THEN
        v_mismatch := v_mismatch + 1;
        END IF;
        v_out := v_out || jsonb_build_object(v_case ->> 'name', jsonb_build_object('question_bank', v_qb_ok, 'review_queue', v_rv_ok, 'agree', v_qb_ok = v_rv_ok));
END LOOP;

RETURN jsonb_build_object('total', v_total, 'mismatch', v_mismatch, 'cases', v_out);
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
  jsonb_pretty(public.__test_question_option_parity ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_question_option_parity ();
