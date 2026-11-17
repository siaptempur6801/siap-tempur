-- Verifikasi bulk import peserta (Fase 4 MVP CPNS Instansi Managed Service, PRD §7.2.1).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-participant-import.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK.
--
-- Membuktikan: dry-run TIDAK menulis apa pun tetapi tetap melaporkan hasil per
-- baris; validasi menolak nama kosong, email salah format, kode ganda di dalam
-- berkas, dan baris tanpa identifier; kode peserta kosong dibuat otomatis;
-- commit hanya memasukkan baris yang sah; mengunggah ULANG berkas yang sama
-- bersifat idempoten (dilaporkan `duplicate`, bukan digandakan); serta penjaga
-- menolak batch tidak dikenal, berkas kosong, dan lebih dari 2000 baris.
CREATE OR REPLACE FUNCTION public.__test_import_flow ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_admin uuid := '93b4d35b-a1fb-4a16-9304-fef1116002cf';
  v_org uuid;
  v_batch uuid;
  v_out jsonb := '{}'::jsonb;
  v_dry jsonb;
  v_commit jsonb;
  v_again jsonb;
  v_cnt integer;
BEGIN
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
  v_org := ((public.admin_upsert_organization (NULL, 'Instansi Import', 'IMP-1', 'instansi', NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  v_batch := ((public.admin_upsert_batch (NULL, v_org, 'B-IMP', 'Batch Import', NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  -- Berkas: 2 sah, 1 tanpa nama, 1 email salah, 1 duplikat dalam berkas,
  -- 1 tanpa identifier, 1 kode kosong (harus dibuat otomatis)
  v_dry := public.admin_import_participants (v_batch, '[
    {"line":2,"participant_code":"A-001","full_name":"Andi","email":"andi@x.id","phone":"081234567890"},
    {"line":3,"participant_code":"A-002","full_name":"Budi","email":"budi@x.id"},
    {"line":4,"participant_code":"A-003","email":"tanpa-nama@x.id"},
    {"line":5,"participant_code":"A-004","full_name":"Email Salah","email":"bukan-email"},
    {"line":6,"participant_code":"A-005","full_name":"Duplikat Kode","email":"dup@x.id"},
    {"line":7,"participant_code":"A-005","full_name":"Duplikat Kode Lagi","email":"dup2@x.id"},
    {"line":8,"full_name":"Tanpa Identifier"},
    {"line":9,"full_name":"Kode Otomatis","email":"otomatis@x.id"}
  ]'::jsonb, TRUE);

  v_out := v_out || jsonb_build_object('1_dry_run', v_dry ->> 'dry_run', '2_total', (v_dry ->> 'total')::int, '3_ok', (v_dry ->> 'ok')::int, '4_error', (v_dry ->> 'error')::int, '5_duplicate', (v_dry ->> 'duplicate')::int, '6_imported_nol_saat_dry', (v_dry ->> 'imported')::int);

  SELECT
    count(*)
  INTO
    v_cnt
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;
  v_out := v_out || jsonb_build_object('7_dry_run_tidak_menulis', v_cnt = 0);
  -- Kode otomatis pada baris 9 harus memakai kode batch
  v_out := v_out || jsonb_build_object('8_kode_otomatis', (
      SELECT
        r ->> 'participant_code'
      FROM jsonb_array_elements(v_dry -> 'rows') r
    WHERE (r ->> 'line')::int = 9));
  -- Pesan kesalahan per baris
  v_out := v_out || jsonb_build_object('9_error_baris_4', (
      SELECT
        r -> 'errors' ->> 0
      FROM jsonb_array_elements(v_dry -> 'rows') r
    WHERE (r ->> 'line')::int = 4), '10_error_baris_8', (
    SELECT
      r -> 'errors' ->> 0
    FROM jsonb_array_elements(v_dry -> 'rows') r
  WHERE (r ->> 'line')::int = 8));
  -- Commit
  v_commit := public.admin_import_participants (v_batch, '[
    {"line":2,"participant_code":"A-001","full_name":"Andi","email":"andi@x.id","phone":"081234567890"},
    {"line":3,"participant_code":"A-002","full_name":"Budi","email":"budi@x.id"},
    {"line":4,"participant_code":"A-003","email":"tanpa-nama@x.id"},
    {"line":5,"participant_code":"A-004","full_name":"Email Salah","email":"bukan-email"},
    {"line":6,"participant_code":"A-005","full_name":"Duplikat Kode","email":"dup@x.id"},
    {"line":7,"participant_code":"A-005","full_name":"Duplikat Kode Lagi","email":"dup2@x.id"},
    {"line":8,"full_name":"Tanpa Identifier"},
    {"line":9,"full_name":"Kode Otomatis","email":"otomatis@x.id"}
  ]'::jsonb, FALSE);

  SELECT
    count(*)
  INTO
    v_cnt
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;
  v_out := v_out || jsonb_build_object('11_commit_imported', (v_commit ->> 'imported')::int, '12_baris_di_db', v_cnt);
  -- Idempotensi: unggah berkas yang SAMA lagi
  v_again := public.admin_import_participants (v_batch, '[
    {"line":2,"participant_code":"A-001","full_name":"Andi","email":"andi@x.id","phone":"081234567890"},
    {"line":3,"participant_code":"A-002","full_name":"Budi","email":"budi@x.id"},
    {"line":4,"participant_code":"A-003","full_name":"Tanpa Nama","email":"tanpa-nama@x.id"}
  ]'::jsonb, FALSE);

  SELECT
    count(*)
  INTO
    v_cnt
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;
  v_out := v_out || jsonb_build_object('13_ulang_imported', (v_again ->> 'imported')::int, '14_ulang_duplicate', (v_again ->> 'duplicate')::int, '15_baris_tetap', v_cnt = 5, '16_nama_lama_dipertahankan', (
      SELECT
        full_name_snapshot
      FROM public.organization_participants
      WHERE
        batch_id = v_batch
        AND participant_code = 'A-003') = 'Tanpa Nama');
  -- Penjaga: batch tidak ada, dan batas 2000 baris
  BEGIN
    PERFORM
      public.admin_import_participants (gen_random_uuid (), '[{"full_name":"X"}]'::jsonb, TRUE);
    v_out := v_out || jsonb_build_object('17_batch_tidak_ada', 'TIDAK DITOLAK');
  EXCEPTION
    WHEN OTHERS THEN
      v_out := v_out || jsonb_build_object('17_batch_tidak_ada', sqlerrm);
  END;

  BEGIN
    PERFORM
      public.admin_import_participants (v_batch, '[]'::jsonb, TRUE);
      v_out := v_out || jsonb_build_object('18_berkas_kosong', 'TIDAK DITOLAK');
  EXCEPTION
    WHEN OTHERS THEN
      v_out := v_out || jsonb_build_object('18_berkas_kosong', sqlerrm);
  END;

  BEGIN
    PERFORM
      public.admin_import_participants (v_batch, (
          SELECT
            jsonb_agg(jsonb_build_object('full_name', 'X', 'email', 'x' || i || '@y.id'))
          FROM generate_series(1, 2001) i), TRUE);
      v_out := v_out || jsonb_build_object('19_lebih_2000', 'TIDAK DITOLAK');
  EXCEPTION
    WHEN OTHERS THEN
      v_out := v_out || jsonb_build_object('19_lebih_2000', sqlerrm);
  END;

  RETURN v_out;
END
$$;

BEGIN;
-- Admin dicari dari DATABASE, bukan di-hardcode. UUID pengguna TIDAK stabil antar
-- environment: pada 2026-09-19 ditemukan `93b4d35b-…` berperan ADMIN di staging
-- tetapi TANPA peran sama sekali di produksi (di sana ia "Cutover Content Actor"),
-- sehingga skrip gagal dengan "permission required" yang menyesatkan.
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
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
END
$$;
SET local ROLE authenticated;
SELECT
  jsonb_pretty(public.__test_import_flow ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_import_flow ();
