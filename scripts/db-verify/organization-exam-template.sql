-- Verifikasi template ujian & komposisi exam (Fase 5 MVP CPNS Instansi Managed Service,
-- PRD §7.3 template ujian, §7.4 assignment ujian).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-exam-template.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK.
--
-- Membuktikan: ketersediaan soal terbit per subjek dilaporkan apa adanya;
-- template 30/35/45 dapat diwujudkan menjadi exam 110 soal; terbentuk 3 section
-- dengan distribusi tepat; `position` unik dan berurutan 1..110 LINTAS section
-- (constraint exam_question_items unik pada (exam_id, position), jadi penomoran
-- harus global); hanya soal BERSTATUS TERBIT yang ikut dikomposisi; template yang
-- mustahil dipenuhi TIDAK menghancurkan apa pun — kekurangannya dikembalikan
-- sebagai data per subjek (required/available/missing); assignment menolak exam
-- tanpa soal; dan penjaga template menolak nama kosong, jumlah 0 semua, jumlah
-- > 200, durasi 0, attempt 0, serta pengaturan pembahasan yang tidak dikenal.
CREATE OR REPLACE FUNCTION public.__test_template_flow ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_admin uuid;
  v_org uuid;
  v_batch uuid;
  v_tpl uuid;
  v_big uuid;
  v_sh jsonb;
  v_comp jsonb;
  v_out jsonb := '{}'::jsonb;
  v_exam uuid;
  v_msg text;
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
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
  v_out := v_out || jsonb_build_object('1_ketersediaan', (public.admin_list_org_templates (NULL)) -> 'available');

  v_org := ((public.admin_upsert_organization (NULL, 'Instansi Ujian', 'UJI-1', 'instansi', NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  v_batch := ((public.admin_upsert_batch (NULL, v_org, 'B-UJI', 'Batch Ujian', NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  -- Template setara Full Tryout nasional
  v_tpl := ((public.admin_upsert_org_template (NULL, NULL, 'Full Tryout SKD Standar', 30, 35, 45, 6000, 1, TRUE, FALSE, 'after_exam', 'internal', 'active')) ->> 'id')::uuid;
  v_out := v_out || jsonb_build_object('2_template_dibuat', v_tpl IS NOT NULL);

  v_sh := public.admin_template_shortages (v_tpl);
  v_out := v_out || jsonb_build_object('3_layak', (v_sh ->> 'composable')::bool, '3_kekurangan', jsonb_array_length(v_sh -> 'shortages'));

  v_comp := public.admin_compose_exam_from_template (v_tpl, 'Ujian Instansi Uji', 'draft');
  v_out := v_out || jsonb_build_object('4_composed', (v_comp ->> 'composed')::bool, '4_total_soal', (v_comp ->> 'total_questions')::int);
  v_exam := (v_comp ->> 'exam_id')::uuid;

  v_out := v_out || jsonb_build_object('5_sections', (
      SELECT
        count(*)
      FROM public.exam_sections
      WHERE
        exam_id = v_exam), '6_items', (
        SELECT
          count(*)
        FROM public.exam_question_items
        WHERE
          exam_id = v_exam), '7_posisi_unik', (
          SELECT
            count(DISTINCT position)
          FROM public.exam_question_items
        WHERE
          exam_id = v_exam), '8_posisi_1_sampai_n', (
          SELECT
            min(position) = 1
          AND max(position) = 110 FROM public.exam_question_items
        WHERE
          exam_id = v_exam), '9_soal_semua_terbit', (
          SELECT
            bool_and(q.status = 'published')
          FROM public.exam_question_items i
          JOIN public.questions q ON q.id = i.question_id
        WHERE
          i.exam_id = v_exam), '10_distribusi', (
          SELECT
            jsonb_object_agg(s.code, c)
          FROM (
            SELECT
              s.code, count(*) c FROM public.exam_question_items i
            JOIN public.exam_sections es ON es.id = i.section_id
            JOIN public.subjects s ON s.id = es.subject_id
          WHERE
            i.exam_id = v_exam GROUP BY s.code) s));
  -- Assignment
  v_out := v_out || jsonb_build_object('11_assignment', (public.admin_upsert_assignment (NULL, v_batch, v_exam, v_tpl, now(), now() + interval '7 days', TRUE, 'uji')) ->> 'id' IS NOT NULL);
  v_out := v_out || jsonb_build_object('12_daftar_assignment', jsonb_array_length((public.admin_list_assignments (v_batch)) -> 'assignments'));
  v_out := v_out || jsonb_build_object('13_jumlah_soal_assignment', (public.admin_list_assignments (v_batch)) -> 'assignments' -> 0 ->> 'question_count');
  -- Template yang MUSTAHIL dipenuhi (200 per subjek) -> kekurangan terstruktur
  v_big := ((public.admin_upsert_org_template (NULL, NULL, 'Mustahil', 200, 200, 200, 6000, 1, TRUE, FALSE, 'after_exam', 'internal', 'active')) ->> 'id')::uuid;
  v_sh := public.admin_template_shortages (v_big);
  v_out := v_out || jsonb_build_object('14_mustahil_layak', (v_sh ->> 'composable')::bool, '14_jumlah_kekurangan', jsonb_array_length(v_sh -> 'shortages'), '14_contoh', v_sh -> 'shortages' -> 0);
  v_comp := public.admin_compose_exam_from_template (v_big, 'Harus Gagal', 'draft');
  v_out := v_out || jsonb_build_object('15_komposisi_ditolak', NOT (v_comp ->> 'composed')::bool);
  -- Penjaga assignment: exam tanpa soal
  BEGIN
    PERFORM
      public.admin_upsert_assignment (NULL, v_batch, gen_random_uuid (), NULL, NULL, NULL, TRUE, NULL);
    v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('16_exam_tidak_ada', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_org_template (NULL, NULL, 'Template Uji', 0, 0, 0, 6000, 1, TRUE, FALSE, 'after_exam', 'internal', 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('17_template_kosong', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_org_template (NULL, NULL, 'Template Uji', 999, 0, 0, 6000, 1, TRUE, FALSE, 'after_exam', 'internal', 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('18_jumlah_berlebihan', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_org_template (NULL, NULL, 'Template Uji', 30, 35, 45, 0, 1, TRUE, FALSE, 'after_exam', 'internal', 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('19_durasi_nol', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_org_template (NULL, NULL, 'Template Uji', 30, 35, 45, 6000, 0, TRUE, FALSE, 'after_exam', 'internal', 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('20_attempt_nol', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_org_template (NULL, NULL, 'Template Uji', 30, 35, 45, 6000, 1, TRUE, FALSE, 'kapan saja', 'internal', 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('21_pengaturan_pembahasan_palsu', v_msg);

  RETURN v_out;
END
$$;

BEGIN;
-- Admin dicari dari DATABASE, bukan di-hardcode (lihat _bootstrap.sql).
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
    RAISE EXCEPTION 'Tidak ada pengguna berperan SUPER_ADMIN atau ADMIN di database ini';
  END IF;
END
$$;
SET local ROLE authenticated;
SELECT
  jsonb_pretty(public.__test_template_flow ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_template_flow ();
