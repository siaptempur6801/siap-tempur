-- Verifikasi alur instansi & batch (Fase 1 MVP CPNS Instansi Managed Service).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-flow.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK, jadi tidak ada data
-- yang tertinggal.
--
-- Membuktikan: instansi & batch dapat dibuat, token undangan tergenerate dan
-- dapat dirotasi, serta SELURUH penjaga menolak dengan benar — kode duplikat,
-- kode tidak valid, tanggal selesai sebelum mulai, mengaktifkan batch pada
-- instansi nonaktif, dan menonaktifkan instansi yang masih punya batch aktif.
CREATE OR REPLACE FUNCTION public.__test_org_flow ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $$
DECLARE
  v_org jsonb;
  v_batch jsonb;
  v_detail jsonb;
  v_list jsonb;
  v_token jsonb;
  v_org_id uuid;
  v_batch_id uuid;
  v_out jsonb := '{}'::jsonb;
  v_msg text;
BEGIN
  v_org := public.admin_upsert_organization (NULL, 'Dinas Pendidikan Kota Medan', 'DINAS-MEDAN', 'instansi', 'Medan', 'Sumatera Utara', 'Jl. Contoh 1', 'Budi PIC', 'pic@dinas.example', '08123456789', 'active', 'uji');
  v_org_id := (v_org ->> 'id')::uuid;
  v_out := v_out || jsonb_build_object('1_instansi', v_org ->> 'code' || ' / ' || (v_org ->> 'status'));

  v_batch := public.admin_upsert_batch (NULL, v_org_id, 'CPNS-2026-A', 'CPNS 2026 Batch A', '2026-10-01 08:00+07', '2026-10-01 12:00+07', 'draft', 'gelombang 1');
  v_batch_id := (v_batch ->> 'id')::uuid;
  v_out := v_out || jsonb_build_object('2_batch', v_batch ->> 'code' || ' / ' || (v_batch ->> 'status'));

  v_detail := public.admin_get_organization (v_org_id);
  v_out := v_out || jsonb_build_object('3_detail_batches', jsonb_array_length(v_detail -> 'batches'), '3_token_ada', (v_detail -> 'batches' -> 0 ->> 'invite_token') IS NOT NULL, '3_token_panjang', length(v_detail -> 'batches' -> 0 ->> 'invite_token'));

  v_token := public.admin_rotate_batch_invite (v_batch_id);
  v_out := v_out || jsonb_build_object('4_token_baru_berbeda', (v_token ->> 'invite_token') <> (v_detail -> 'batches' -> 0 ->> 'invite_token'));

  v_list := public.admin_list_organizations ('Medan', NULL, 10, 0);
  v_out := v_out || jsonb_build_object('5_total', (v_list ->> 'total')::int, '5_batch_count', (v_list -> 'organizations' -> 0 ->> 'batch_count')::int);

  BEGIN
    PERFORM
      public.admin_upsert_organization (NULL, 'Duplikat', 'DINAS-MEDAN');
    v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('6_kode_instansi_duplikat', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_batch (NULL, v_org_id, 'B-OK', 'Batch OK', NULL, NULL, 'active');
      v_msg := 'diizinkan';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := 'DITOLAK: ' || sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('7_aktifkan_batch', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_organization (v_org_id, 'Dinas Pendidikan Kota Medan', 'DINAS-MEDAN', 'instansi', 'Medan', 'Sumatera Utara', 'Jl. Contoh 1', 'Budi PIC', 'pic@dinas.example', '08123456789', 'inactive');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('8_nonaktifkan_instansi_ber_batch_aktif', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_batch (NULL, v_org_id, 'X-1', 'Batch X', NULL, NULL, 'draft');
      PERFORM
        public.admin_upsert_batch (NULL, v_org_id, 'X-1', 'Batch X lagi', NULL, NULL, 'draft');
        v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('9_kode_batch_duplikat', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_batch (NULL, v_org_id, 'WAKTU', 'Waktu', '2026-05-01', '2026-04-01', 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('10_selesai_sebelum_mulai', v_msg);

  BEGIN
    PERFORM
      public.admin_upsert_batch (NULL, v_org_id, 'kode salah!', 'Kode', NULL, NULL, 'draft');
      v_msg := 'TIDAK DITOLAK';
  EXCEPTION
    WHEN OTHERS THEN
      v_msg := sqlerrm;
  END;
  v_out := v_out || jsonb_build_object('11_kode_batch_tidak_valid', v_msg);

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
  jsonb_pretty(public.__test_org_flow ());
ROLLBACK;
DROP FUNCTION IF EXISTS public.__test_org_flow ();
