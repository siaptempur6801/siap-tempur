-- Verifikasi self-onboarding peserta (Fase 3 MVP CPNS Instansi Managed Service,
-- PRD §6.3, §7.2.1, §10.3).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-join-flow.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK.
--
-- Membuktikan: batch & token undangan terbentuk; pratinjau token menampilkan
-- instansi dan status "bisa bergabung"; bergabung menghasilkan kode peserta
-- otomatis; bergabung ULANG idempoten (kode sama, tidak ada baris kedua); token
-- palsu ditolak; batch tertutup tidak menerima peserta baru; dan baris peserta
-- hasil IMPORT DIKLAIM berdasarkan email — kode import dipakai ulang, nama import
-- dipertahankan, status naik menjadi aktif, tetap hanya SATU baris.
CREATE OR REPLACE FUNCTION public.__test_join_flow ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_org uuid;
  v_batch uuid;
  v_token text;
  v_out jsonb := '{}'::jsonb;
  v_msg text;
  v_admin uuid := '93b4d35b-a1fb-4a16-9304-fef1116002cf';
  v_other uuid := '1d6ec5f4-db90-4575-a679-5869adf43817';
  v_r1 jsonb;
  v_r2 jsonb;
  v_inv jsonb;
BEGIN
  -- admin menyiapkan instansi + batch aktif
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
  v_org := ((public.admin_upsert_organization (NULL, 'SMAN 2 Tanjungbalai', 'SMAN2-TB', 'sekolah', 'Tanjungbalai', 'Sumatera Utara', NULL, 'Kepala Sekolah', 'pic@sman2.example', '08123', 'active', NULL)) ->> 'id')::uuid;
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
  v_batch := ((public.admin_upsert_batch (NULL, v_org, 'CPNS-2026-A', 'CPNS 2026 Batch A', '2026-10-01 08:00+07', '2026-10-01 12:00+07', 'active', NULL)) ->> 'id')::uuid;
  v_token := (public.admin_get_organization (v_org)) -> 'batches' -> 0 ->> 'invite_token';
  v_out := v_out || jsonb_build_object('1_batch_dibuat', v_batch IS NOT NULL, '1_token_ada', length(v_token) = 32);
  -- pratinjau sebelum join (sebagai peserta lain)
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_other::text, 'role', 'authenticated')::text, TRUE);
  v_inv := public.get_batch_invite (v_token);
  v_out := v_out || jsonb_build_object('2_pratinjau_found', (v_inv ->> 'found')::bool, '2_bisa_gabung', (v_inv ->> 'joinable')::bool, '2_nama_instansi', v_inv -> 'organization' ->> 'name');
  -- bergabung
  v_r1 := public.join_batch_with_invite (v_token, 'Peserta Uji', '08999', 'Unit A', 'Staf');
  v_out := v_out || jsonb_build_object('3_join', (v_r1 ->> 'joined')::bool, '3_kode', v_r1 ->> 'participant_code', '3_klaim', (v_r1 ->> 'claimed')::bool);
  -- idempoten: join lagi
  v_r2 := public.join_batch_with_invite (v_token, 'Nama Lain');
  v_out := v_out || jsonb_build_object('4_join_ulang_idempoten', (v_r2 ->> 'already_joined')::bool, '4_kode_sama', (v_r2 ->> 'participant_code') = (v_r1 ->> 'participant_code'));
  -- token palsu
  BEGIN
    PERFORM
      public.join_batch_with_invite ('token-palsu');
    v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('5_token_palsu', v_msg);
  -- batch ditutup -> tidak bisa join
  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
    PERFORM
      public.admin_upsert_batch (v_batch, v_org, 'CPNS-2026-A', 'CPNS 2026 Batch A', '2026-10-01 08:00+07', '2026-10-01 12:00+07', 'closed', NULL);
      PERFORM
        set_config('request.jwt.claims', json_build_object('sub', v_other::text, 'role', 'authenticated')::text, TRUE);
        BEGIN
          PERFORM
            public.join_batch_with_invite (v_token);
            v_msg := 'TIDAK DITOLAK';
        EXCEPTION
          WHEN OTHERS THEN
            v_msg := sqlerrm;
        END;
        v_out := v_out || jsonb_build_object('6_batch_ditutup', v_msg);
        -- keanggotaan milik peserta
        v_out := v_out || jsonb_build_object('7_keanggotaan', jsonb_array_length((public.get_my_organization_memberships ()) -> 'memberships'));

        RETURN v_out;
END
$$;

CREATE OR REPLACE FUNCTION public.__test_claim_flow ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_org uuid;
  v_batch uuid;
  v_token text;
  v_out jsonb := '{}'::jsonb;
  v_admin uuid := '93b4d35b-a1fb-4a16-9304-fef1116002cf';
  v_peserta uuid := '4cf7114c-7613-4676-9aa9-64793f855f04';
  v_email text;
  v_r jsonb;
  v_row record;
  v_before int;
  v_after int;
BEGIN
  SELECT
    au.email::text
  INTO
    v_email
  FROM
    auth.users au
  WHERE
    au.id = v_peserta;
  v_out := v_out || jsonb_build_object('0_email_peserta', v_email);

  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, TRUE);
  v_org := ((public.admin_upsert_organization (NULL, 'Instansi Klaim', 'KLAIM-1', 'instansi', NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  v_batch := ((public.admin_upsert_batch (NULL, v_org, 'B-KLAIM', 'Batch Klaim', NULL, NULL, 'active', NULL)) ->> 'id')::uuid;
  v_token := (public.admin_get_organization (v_org)) -> 'batches' -> 0 ->> 'invite_token';
  -- admin "mengimpor" peserta: baris tanpa akun, email cocok dengan pengguna nanti
  INSERT INTO public.organization_participants (organization_id, batch_id, user_id, participant_code, full_name_snapshot, email_snapshot, status)
    VALUES (v_org, v_batch, NULL, 'IMP-001', 'Nama Dari Import', v_email, 'registered');

  SELECT
    count(*)
  INTO
    v_before
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;

  PERFORM
    set_config('request.jwt.claims', json_build_object('sub', v_peserta::text, 'role', 'authenticated')::text, TRUE);
  v_r := public.join_batch_with_invite (v_token, 'Nama Dari Peserta');

  SELECT
    count(*)
  INTO
    v_after
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;
  SELECT
    *
  INTO
    v_row
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;

  v_out := v_out || jsonb_build_object('1_diklaim', (v_r ->> 'claimed')::bool, '2_kode_dipakai_ulang', (v_r ->> 'participant_code') = 'IMP-001', '3_tidak_ada_duplikat', v_before = 1
    AND v_after = 1, '4_nama_import_dipertahankan', v_row.full_name_snapshot = 'Nama Dari Import', '5_status_naik_jadi_aktif', v_row.status = 'active', '6_user_tertaut', v_row.user_id = v_peserta);
  -- kedua kali: idempoten, tetap satu baris
  v_r := public.join_batch_with_invite (v_token);
  SELECT
    count(*)
  INTO
    v_after
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch;
  v_out := v_out || jsonb_build_object('7_ulang_idempoten', (v_r ->> 'already_joined')::bool, '8_tetap_satu_baris', v_after = 1);

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
  jsonb_pretty(jsonb_build_object('alur_join', public.__test_join_flow (), 'alur_klaim_import', public.__test_claim_flow ()));
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_join_flow ();
DROP FUNCTION IF EXISTS public.__test_claim_flow ();
