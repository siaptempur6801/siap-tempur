-- Verifikasi monitoring & data export (Fase 6–7 MVP CPNS Instansi Managed Service,
-- PRD §6.5, §6.6, §7.6, §7.7, §11, §12).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-monitoring-export.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK.
--
-- Membuktikan: monitoring membedakan "belum mulai", "sedang mengerjakan", dan
-- "selesai"; export menghasilkan EMPAT kumpulan data dengan jumlah kolom sesuai
-- §7.7 (rekap 10, detail 17); ranking internal hanya memuat yang sudah selesai
-- (§7.6); no-show memuat yang belum mulai DAN yang belum selesai dengan keterangan
-- yang benar; serta yang paling penting — attempt B2C bernilai 999 TIDAK bocor ke
-- export instansi yang nilainya 275, memenuhi KPI §11 "0 data B2C tercampur".
CREATE OR REPLACE FUNCTION public.__test_monitoring_export ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_admin uuid;
  v_org uuid;
  v_batch uuid;
  v_exam uuid;
  v_tpl uuid;
  v_user_b uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_p3 uuid;
  v_mon jsonb;
  v_exp jsonb;
  v_out jsonb := '{}'::jsonb;
  v_msg text;
  v_subject uuid;
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

  v_org := ((public.admin_upsert_organization (NULL, 'Instansi Monitor', 'MON-1', 'instansi', NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  v_batch := ((public.admin_upsert_batch (NULL, v_org, 'B-MON', 'Batch Monitor', NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  v_tpl := ((public.admin_upsert_org_template (NULL, v_org, 'Tpl Monitor', 30, 35, 45, 6000, 1, TRUE, FALSE, 'after_exam', 'internal', 'active')) ->> 'id')::uuid;
  v_exam := (public.admin_compose_exam_from_template (v_tpl, 'Ujian Monitor', 'active')) ->> 'exam_id';
  v_exam := v_exam::uuid;
  -- Tiga peserta: belum mulai, sedang mengerjakan, selesai
  -- Tiga peserta dengan tiga keadaan berbeda, supaya monitoring benar-benar
  -- membedakan "belum mulai", "sedang mengerjakan", dan "selesai".
  INSERT INTO public.organization_participants (organization_id, batch_id, user_id, participant_code, full_name_snapshot, email_snapshot, status)
  VALUES
    (v_org, v_batch, NULL, 'M-001', 'Belum Mulai', 'm1@x.id', 'registered'),
    (v_org, v_batch, NULL, 'M-002', 'Sedang Mengerjakan', 'm2@x.id', 'active'),
    (v_org, v_batch, NULL, 'M-003', 'Sudah Selesai', 'm3@x.id', 'active');

  SELECT
    id
  INTO
    v_p1
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch
    AND participant_code = 'M-001';
  SELECT
    id
  INTO
    v_p2
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch
    AND participant_code = 'M-002';
  SELECT
    id
  INTO
    v_p3
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch
    AND participant_code = 'M-003';
  -- Constraint (exam_id, user_id, attempt_number) unik, jadi dua attempt pada exam
  -- yang sama memerlukan pengguna berbeda atau nomor attempt berbeda.
  SELECT
    pr.id
  INTO
    v_user_b
  FROM
    public.profiles pr
  WHERE
    pr.id <> v_admin
  ORDER BY
    pr.created_at
  LIMIT 1;
  -- attempt: satu in_progress, satu completed dengan skor per subjek
  INSERT INTO public.exam_attempts (exam_id, user_id, attempt_number, status, source, organization_id, batch_id, participant_id, started_at)
    VALUES (v_exam, v_admin, 1, 'in_progress', 'organization', v_org, v_batch, v_p2, now());

  INSERT INTO public.exam_attempts (exam_id, user_id, attempt_number, status, source, organization_id, batch_id, participant_id, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed)
    VALUES (v_exam, v_user_b, 1, 'completed', 'organization', v_org, v_batch, v_p3, now() - interval '1 hour', now(), 3200, 275, 78.5, TRUE)
  RETURNING
    id
  INTO
    v_exam;
  -- v_exam sekarang attempt id (dipakai untuk attempt_scores)
  FOR v_subject IN
  SELECT
    id
  FROM
    public.subjects s
  WHERE
    s.code IN ('TWK', 'TIU', 'TKP')
    AND s.track_id = (
      SELECT
        t.id
      FROM
        public.tracks t
        JOIN public.programs p ON p.id = t.program_id
      WHERE
        p.code = 'CPNS'
        AND t.code = 'SKD')
      LOOP
        INSERT INTO public.attempt_scores (attempt_id, subject_id, raw_score, percentage, passed, correct_count)
        SELECT
          v_exam,
          v_subject,
          CASE (
            SELECT
              code
            FROM
              public.subjects
            WHERE
              id = v_subject)
          WHEN 'TWK' THEN
            85
          WHEN 'TIU' THEN
            95
          ELSE
            95
          END,
          80,
          TRUE,
          10;
      END LOOP;
  -- Attempt B2C untuk peserta yang sama: TIDAK BOLEH muncul di export instansi
  INSERT INTO public.exam_attempts (exam_id, user_id, attempt_number, status, source, started_at, submitted_at, total_score, passed)
  SELECT
    e.id,
    v_user_b,
    9,
    'completed',
    'b2c',
    now(),
    now(),
    999,
    TRUE
  FROM
    public.exams e
  WHERE
    e.title = 'Ujian Monitor'
  LIMIT 1;

  v_mon := public.admin_batch_monitoring (v_batch);
  v_out := v_out || jsonb_build_object('1_total', (v_mon -> 'summary' ->> 'total')::int, '2_belum_mulai', (v_mon -> 'summary' ->> 'not_started')::int, '3_sedang', (v_mon -> 'summary' ->> 'in_progress')::int, '4_selesai', (v_mon -> 'summary' ->> 'completed')::int, '5_lulus', (v_mon -> 'summary' ->> 'passed')::int);

  v_exp := public.admin_export_organization (v_org, v_batch);
  v_out := v_out || jsonb_build_object('6_rekap_baris', jsonb_array_length(v_exp -> 'rekap' -> 'rows'), '7_detail_baris', jsonb_array_length(v_exp -> 'detail' -> 'rows'), '8_ranking_baris', jsonb_array_length(v_exp -> 'ranking' -> 'rows'), '9_noshow_baris', jsonb_array_length(v_exp -> 'no_show' -> 'rows'), '10_rekap_kolom', jsonb_array_length(v_exp -> 'rekap' -> 'columns'), '11_detail_kolom', jsonb_array_length(v_exp -> 'detail' -> 'columns'));
  -- Skor B2C TIDAK boleh bocor: total_skor peserta selesai harus 275, bukan 999
  v_out := v_out || jsonb_build_object('12_skor_bukan_b2c', (
      SELECT
        r ->> 15
      FROM jsonb_array_elements(v_exp -> 'detail' -> 'rows') r
    WHERE
      r ->> 0 = 'M-003'));
  -- No-show memuat yang belum mulai & belum selesai, bukan yang selesai
  v_out := v_out || jsonb_build_object('13_noshow_keterangan', (
      SELECT
        jsonb_agg(r ->> 6 ORDER BY r ->> 0)
      FROM jsonb_array_elements(v_exp -> 'no_show' -> 'rows') r));
  -- Peringkat internal hanya untuk yang selesai
  v_out := v_out || jsonb_build_object('14_ranking_kode', (
      SELECT
        r ->> 1
      FROM jsonb_array_elements(v_exp -> 'ranking' -> 'rows') r));
  -- Pengguna tanpa izin ditolak
  BEGIN
    PERFORM
      set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid ()::text, 'role', 'authenticated')::text, TRUE);
    PERFORM
      public.admin_batch_monitoring (v_batch);
    v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
    v_out := v_out || jsonb_build_object('15_tanpa_izin', v_msg);

    BEGIN
      PERFORM
        public.admin_batch_monitoring (gen_random_uuid ());
        v_msg := 'TIDAK DITOLAK';
    EXCEPTION
      WHEN OTHERS THEN
        v_msg := sqlerrm;
    END;
    v_out := v_out || jsonb_build_object('16_batch_tidak_ada', v_msg);

    RETURN v_out;
END
$$;

BEGIN;
SET local ROLE authenticated;
SET local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
SELECT
  jsonb_pretty(public.__test_monitoring_export ());
ROLLBACK;

DROP FUNCTION IF EXISTS public.__test_monitoring_export ();
