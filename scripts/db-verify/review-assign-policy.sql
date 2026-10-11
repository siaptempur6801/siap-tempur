-- Verifikasi kebijakan penugasan reviewer (aturan C).
--
-- Cara pakai (staging/produksi, aman: seluruhnya ROLLBACK):
--   supabase db query --linked --file scripts/db-verify/review-assign-policy.sql
--
-- Membuktikan:
--   1. Manager (question.manage) dapat menugaskan soal ke reviewer lain.
--   2. Reviewer TIDAK dapat menugaskan ke orang lain.
--   3. Reviewer dapat mengklaim untuk dirinya sendiri.
--   4. Reviewer tidak dapat merebut review yang dipegang reviewer lain.
--   5. Manager dapat memindahkan review yang sudah dipegang.
--   6. Permission `content.assign` tidak diberikan ke role non-manager.
--
-- Bila environment tidak punya reviewer non-manager (mis. produksi), skrip
-- melaporkan `skipped` alih-alih gagal.
CREATE OR REPLACE FUNCTION public.__test_review_assign_policy ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_manager uuid;
  v_reviewer uuid;
  v_other uuid;
  v_subject text;
  v_options jsonb;
  v_q1 uuid;
  v_q2 uuid;
  v_q3 uuid;
  v_out jsonb := '{}'::jsonb;
BEGIN
  SELECT
    ur.user_id
  INTO
    v_manager
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

  SELECT
    ur.user_id
  INTO
    v_reviewer
  FROM
    public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions pe ON pe.id = rp.permission_id
  WHERE
    pe.code = 'content.review'
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur2
        JOIN public.role_permissions rp2 ON rp2.role_id = ur2.role_id
        JOIN public.permissions pe2 ON pe2.id = rp2.permission_id
      WHERE
        ur2.user_id = ur.user_id
        AND pe2.code = 'question.manage')
  LIMIT 1;
  -- Target "orang lain" yang bukan author: user content.review mana pun selain
  -- reviewer dan manager (di staging: admin kedua).
  SELECT
    ur.user_id
  INTO
    v_other
  FROM
    public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions pe ON pe.id = rp.permission_id
  WHERE
    pe.code = 'content.review'
    AND ur.user_id NOT IN (v_reviewer, v_manager)
  LIMIT 1;

  IF v_manager IS NULL THEN
    RAISE EXCEPTION 'Tidak ada pengguna berperan SUPER_ADMIN atau ADMIN';
  END IF;
  IF v_reviewer IS NULL THEN
    RETURN jsonb_build_object('skipped', 'Tidak ada pengguna content.review tanpa question.manage di environment ini');
  END IF;

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

  v_options := jsonb_build_array(jsonb_build_object('key', 'A', 'content', 'Benar', 'is_correct', TRUE, 'score', 1), jsonb_build_object('key', 'B', 'content', 'Salah', 'is_correct', FALSE, 'score', 0));
  -- 1. Manager membuat + mengirim soal, lalu menugaskan ke reviewer.
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_manager::text, 'role', 'authenticated')::text, TRUE);
  v_q1 := (public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, 'single_choice', 'Policy q1', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'policy', NULL, NULL) ->> 'question_id')::uuid;
  PERFORM
    public.submit_question_for_review (v_q1);
  BEGIN
    PERFORM
      public.assign_question_reviewer (v_q1, v_reviewer);
    v_out := v_out || jsonb_build_object('1_manager_assign_ke_reviewer', 'ok');
  EXCEPTION
    WHEN OTHERS THEN
      v_out := v_out || jsonb_build_object('1_manager_assign_ke_reviewer', sqlerrm);
  END;
  -- 2 & 3. Reviewer tidak boleh menugaskan ke orang lain, tetapi boleh klaim diri.
  v_q2 := (public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, 'single_choice', 'Policy q2', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'policy', NULL, NULL) ->> 'question_id')::uuid;
  PERFORM
    public.submit_question_for_review (v_q2);

    PERFORM
      set_config('request.jwt.claims', json_build_object('sub', v_reviewer::text, 'role', 'authenticated')::text, TRUE);
      IF v_other IS NULL THEN
        v_out := v_out || jsonb_build_object('2_reviewer_assign_ke_orang_lain', 'skipped: tidak ada target lain');
      ELSE
        BEGIN
          PERFORM
            public.assign_question_reviewer (v_q2, v_other);
            v_out := v_out || jsonb_build_object('2_reviewer_assign_ke_orang_lain', 'TIDAK DITOLAK');
        EXCEPTION
          WHEN OTHERS THEN
            v_out := v_out || jsonb_build_object('2_reviewer_assign_ke_orang_lain', sqlerrm);
        END;
END IF;

BEGIN
  PERFORM
    public.assign_question_reviewer (v_q2, v_reviewer);
    v_out := v_out || jsonb_build_object('3_reviewer_klaim_diri', 'ok');
EXCEPTION
  WHEN OTHERS THEN
    v_out := v_out || jsonb_build_object('3_reviewer_klaim_diri', sqlerrm);
END;
-- 4. Review yang sudah dipegang reviewer lain tidak bisa direbut lewat klaim.
PERFORM
  set_config('request.jwt.claims', json_build_object('sub', v_manager::text, 'role', 'authenticated')::text, TRUE);
  v_q3 := (public.save_question_draft (NULL, 'CPNS', 'SKD', v_subject, 'single_choice', 'Policy q3', 'medium', NULL, NULL, NULL, NULL, NULL, NULL, v_options, 'policy', NULL, NULL) ->> 'question_id')::uuid;
  PERFORM
    public.submit_question_for_review (v_q3);
    UPDATE
      public.content_reviews
    SET
      reviewer_id = v_manager
    WHERE
      entity_type = 'question'
      AND entity_id = v_q3
      AND status = 'pending';
      UPDATE
        public.questions
      SET
        reviewer_id = v_manager
      WHERE
        id = v_q3;

        PERFORM
          set_config('request.jwt.claims', json_build_object('sub', v_reviewer::text, 'role', 'authenticated')::text, TRUE);
          BEGIN
            PERFORM
              public.assign_question_reviewer (v_q3, v_reviewer);
              v_out := v_out || jsonb_build_object('4_reviewer_rebut_review', 'TIDAK DITOLAK');
          EXCEPTION
            WHEN OTHERS THEN
              v_out := v_out || jsonb_build_object('4_reviewer_rebut_review', sqlerrm);
          END;
          -- 5. Manager tetap dapat memindahkan review yang sudah dipegang.
          PERFORM
            set_config('request.jwt.claims', json_build_object('sub', v_manager::text, 'role', 'authenticated')::text, TRUE);
            BEGIN
              PERFORM
                public.assign_question_reviewer (v_q3, v_reviewer);
                v_out := v_out || jsonb_build_object('5_manager_pindahkan', 'ok');
            EXCEPTION
              WHEN OTHERS THEN
                v_out := v_out || jsonb_build_object('5_manager_pindahkan', sqlerrm);
            END;
            -- 6. Permission hanya untuk manager.
            v_out := v_out || jsonb_build_object('6_grant_non_manager', (
                SELECT
                  count(*)
                FROM public.role_permissions rp
                JOIN public.permissions pe ON pe.id = rp.permission_id
                JOIN public.roles r ON r.id = rp.role_id
                WHERE
                  pe.code = 'content.assign'
                  AND r.code NOT IN ('ADMIN', 'SUPER_ADMIN')));

            RETURN v_out;
END
$$;

BEGIN;
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
  jsonb_pretty(public.__test_review_assign_policy ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_review_assign_policy ();
